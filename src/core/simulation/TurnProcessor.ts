import { Turn } from '../entities/Turn';
import { ActionQueue } from './ActionQueue';
import { ActionValidator, GameStateProvider } from './ActionValidator';
import { ActionExecutor, GameStateMutator } from './ActionExecutor';
import { TurnPhase } from '@shared/types';

export interface TurnProcessorConfig {
  maxRetries: number;
  timeoutMs: number;
  enableRollback: boolean;
  batchSize: number;
}

export interface TurnProcessingResult {
  success: boolean;
  turn: Turn;
  actionsProcessed: number;
  actionsSucceeded: number;
  actionsFailed: number;
  processingTime: number;
  errorMessages: string[];
  warnings: string[];
}

export interface TurnEventEmitter {
  emit(event: 'turn_started', data: { turnId: string; turnNumber: number }): void;
  emit(event: 'turn_phase_changed', data: { turnId: string; phase: TurnPhase; previousPhase: TurnPhase }): void;
  emit(event: 'turn_completed', data: { turnId: string; result: TurnProcessingResult }): void;
  emit(event: 'turn_failed', data: { turnId: string; error: string }): void;
  emit(event: 'action_processed', data: { actionId: string; result: string; message: string }): void;
}

/**
 * Orchestrates the complete turn processing lifecycle.
 * Manages phase transitions, action validation and execution, error handling, and result distribution.
 * Provides event-driven updates for real-time monitoring and player notifications.
 * Supports rollback and recovery for failed turn processing.
 */
export class TurnProcessor {
  private readonly config: TurnProcessorConfig;
  private readonly validator: ActionValidator;
  private readonly executor: ActionExecutor;
  private readonly eventEmitter: TurnEventEmitter;
  private readonly processingLog: string[];

  constructor(
    gameStateProvider: GameStateProvider,
    gameStateMutator: GameStateMutator,
    eventEmitter: TurnEventEmitter,
    config: TurnProcessorConfig = {
      maxRetries: 3,
      timeoutMs: 5 * 60 * 1000, // 5 minutes
      enableRollback: true,
      batchSize: 50
    }
  ) {
    this.config = config;
    this.validator = new ActionValidator(gameStateProvider);
    this.executor = new ActionExecutor(gameStateMutator);
    this.eventEmitter = eventEmitter;
    this.processingLog = [];
  }

  /**
   * Processes a complete turn from start to finish.
   * @param {Turn} turn - The turn to process
   * @param {ActionQueue} actionQueue - Queue containing all submitted actions
   * @returns {Promise<TurnProcessingResult>} Complete processing result
   */
  public async processTurn(turn: Turn, actionQueue: ActionQueue): Promise<TurnProcessingResult> {
    const startTime = Date.now();
    let actionsProcessed = 0;
    let actionsSucceeded = 0;
    let actionsFailed = 0;
    const errorMessages: string[] = [];
    const warnings: string[] = [];

    try {
      this.log(`Starting turn ${turn.turnNumber} processing for universe ${turn.universeId}`);
      
      // Emit turn started event
      this.eventEmitter.emit('turn_started', {
        turnId: turn.id,
        turnNumber: turn.turnNumber
      });

      // Phase 1: Validation
      await this.processValidationPhase(turn, actionQueue);

      // Phase 2: Processing (Action Execution)
      const executionResults = await this.processExecutionPhase(turn, actionQueue);

      // Count results
      for (const [actionId, result] of executionResults) {
        actionsProcessed++;
        if (result.result === 'success') {
          actionsSucceeded++;
        } else {
          actionsFailed++;
          errorMessages.push(`Action ${actionId}: ${result.message}`);
        }

        // Emit action processed event
        this.eventEmitter.emit('action_processed', {
          actionId,
          result: result.result,
          message: result.message
        });
      }

      // Phase 3: Resolution
      await this.processResolutionPhase(turn);

      // Phase 4: Distribution
      await this.processDistributionPhase(turn);

      // Complete the turn
      turn.complete();

      const processingTime = Date.now() - startTime;
      this.log(`Turn ${turn.turnNumber} completed successfully in ${processingTime}ms`);

      const result: TurnProcessingResult = {
        success: true,
        turn,
        actionsProcessed,
        actionsSucceeded,
        actionsFailed,
        processingTime,
        errorMessages,
        warnings
      };

      // Emit turn completed event
      this.eventEmitter.emit('turn_completed', {
        turnId: turn.id,
        result
      });

      return result;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this.log(`Turn ${turn.turnNumber} processing failed: ${errorMessage}`);
      turn.fail(errorMessage);

      // Emit turn failed event
      this.eventEmitter.emit('turn_failed', {
        turnId: turn.id,
        error: errorMessage
      });

      return {
        success: false,
        turn,
        actionsProcessed,
        actionsSucceeded,
        actionsFailed,
        processingTime,
        errorMessages: [...errorMessages, errorMessage],
        warnings
      };
    }
  }

  /**
   * Processes the validation phase of the turn.
   */
  private async processValidationPhase(turn: Turn, actionQueue: ActionQueue): Promise<void> {
    this.log('Starting validation phase');
    turn.advancePhase('validating');
    
    this.eventEmitter.emit('turn_phase_changed', {
      turnId: turn.id,
      phase: 'validating',
      previousPhase: 'collecting'
    });

    const unvalidatedActions = actionQueue.getUnvalidatedActions();
    
    if (unvalidatedActions.length === 0) {
      this.log('No actions to validate');
      return;
    }

    // Validate actions in batches
    const batches = this.createBatches(unvalidatedActions, this.config.batchSize);
    
    for (const batch of batches) {
      const validationResults = await this.validator.validateActionBatch(batch);
      
      // Apply validation results to actions
      for (const action of batch) {
        const result = validationResults.get(action.id);
        if (result) {
          action.setValidationResult(result);
          
          if (!result.isValid) {
            this.log(`Action ${action.id} validation failed: ${result.errorMessage}`);
          }
        }
      }
    }

    const validActions = actionQueue.getValidUnexecutedActions();
    const failedActions = actionQueue.getFailedValidationActions();
    
    this.log(`Validation complete: ${validActions.length} valid, ${failedActions.length} failed`);
  }

  /**
   * Processes the execution phase of the turn.
   */
  private async processExecutionPhase(turn: Turn, actionQueue: ActionQueue): Promise<Map<string, any>> {
    this.log('Starting execution phase');
    turn.advancePhase('processing');
    
    this.eventEmitter.emit('turn_phase_changed', {
      turnId: turn.id,
      phase: 'processing',
      previousPhase: 'validating'
    });

    const validActions = actionQueue.getValidUnexecutedActions();
    
    if (validActions.length === 0) {
      this.log('No valid actions to execute');
      return new Map();
    }

    // Execute actions in priority order with batching
    const executionResults = await this.executor.executeActionBatch(validActions);
    
    // Apply execution results to actions
    for (const [actionId, result] of executionResults) {
      const action = actionQueue.getAction(actionId);
      if (action) {
        action.setExecutionResult(result);
      }
    }

    this.log(`Execution complete: ${executionResults.size} actions processed`);
    return executionResults;
  }

  /**
   * Processes the resolution phase (calculating secondary effects).
   */
  private async processResolutionPhase(turn: Turn): Promise<void> {
    this.log('Starting resolution phase');
    turn.advancePhase('resolving');
    
    this.eventEmitter.emit('turn_phase_changed', {
      turnId: turn.id,
      phase: 'resolving',
      previousPhase: 'processing'
    });

    // TODO: Implement secondary effect resolution
    // - Market price updates based on trade volume
    // - Fleet movement completion
    // - Resource production cycles
    // - Technology research progression
    // - Random event generation
    
    this.log('Resolution phase completed (placeholder)');
  }

  /**
   * Processes the distribution phase (sending results to players).
   */
  private async processDistributionPhase(turn: Turn): Promise<void> {
    this.log('Starting distribution phase');
    turn.advancePhase('distributing');
    
    this.eventEmitter.emit('turn_phase_changed', {
      turnId: turn.id,
      phase: 'distributing',
      previousPhase: 'resolving'
    });

    // TODO: Implement result distribution
    // - Send action results to players
    // - Update player dashboards
    // - Generate turn reports
    // - Send notifications for important events
    
    this.log('Distribution phase completed (placeholder)');
  }

  /**
   * Handles turn processing timeout.
   */
  private async handleTimeout(turn: Turn): Promise<void> {
    this.log(`Turn ${turn.turnNumber} processing timed out`);
    
    if (this.config.enableRollback) {
      await this.rollbackTurn(turn);
    } else {
      turn.fail('Processing timeout exceeded');
    }
  }

  /**
   * Rolls back a failed turn to previous state.
   */
  private async rollbackTurn(turn: Turn): Promise<void> {
    this.log(`Rolling back turn ${turn.turnNumber}`);
    
    // TODO: Implement rollback logic
    // - Restore game state from snapshot
    // - Revert any partial changes
    // - Mark turn as failed
    
    turn.fail('Turn rolled back due to processing failure');
  }

  /**
   * Creates batches of actions for processing.
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    
    return batches;
  }

  /**
   * Checks if turn processing should be terminated early.
   */
  private shouldTerminateEarly(turn: Turn): boolean {
    return turn.hasProcessingTimedOut() || turn.status === 'cancelled';
  }

  /**
   * Gets processing statistics for monitoring.
   */
  public getProcessingStatistics(): {
    totalTurnsProcessed: number;
    averageProcessingTime: number;
    successRate: number;
    lastProcessingTime: number;
  } {
    // TODO: Implement processing statistics tracking
    return {
      totalTurnsProcessed: 0,
      averageProcessingTime: 0,
      successRate: 0,
      lastProcessingTime: 0
    };
  }

  /**
   * Gets the complete processing log.
   * @returns {string[]} Array of log messages
   */
  public getProcessingLog(): string[] {
    return [...this.processingLog];
  }

  /**
   * Clears the processing log.
   * @sideEffect Empties the processing log array
   */
  public clearLog(): void {
    this.processingLog.length = 0;
  }

  /**
   * Adds a message to the processing log.
   * @param {string} message - Message to log
   * @sideEffect Appends timestamped message to processing log
   */
  private log(message: string): void {
    const timestamp = new Date().toISOString();
    this.processingLog.push(`[${timestamp}] ${message}`);
  }
}
import { Turn, TurnConfig } from '../entities/Turn';
import { ActionQueue } from '../simulation/ActionQueue';
import { TurnProcessor, TurnProcessingResult } from '../simulation/TurnProcessor';
import { TurnStatus } from '@shared/types';

export interface SchedulerConfig {
  defaultTurnDurationMs: number;
  maxConcurrentTurns: number;
  retryFailedTurns: boolean;
  maxRetries: number;
  enableAutoScheduling: boolean;
}

export interface UniverseSchedule {
  universeId: string;
  currentTurnNumber: number;
  activeTurn?: Turn;
  nextTurnScheduledAt?: Date;
  turnDurationMs: number;
  isActive: boolean;
  lastProcessingResult?: TurnProcessingResult;
}

export interface TurnScheduleData {
  turnId: string;
  universeId: string;
  turnNumber: number;
  scheduledAt: Date;
  status: TurnStatus;
}

/**
 * Manages the scheduling and automation of turn processing across multiple universes.
 * Handles turn creation, timing, automatic processing, and failure recovery.
 * Supports per-universe configuration and concurrent turn processing.
 * Provides monitoring and control interfaces for game administration.
 */
export class TurnScheduler {
  private readonly config: SchedulerConfig;
  private readonly universeSchedules: Map<string, UniverseSchedule>;
  private readonly pendingTurns: Map<string, Turn>;
  private readonly activeTurns: Map<string, Turn>;
  private readonly schedulerIntervals: Map<string, NodeJS.Timeout>;
  private readonly turnProcessor: TurnProcessor;
  private readonly actionQueues: Map<string, ActionQueue>;
  private isRunning: boolean = false;

  constructor(
    turnProcessor: TurnProcessor,
    config: SchedulerConfig = {
      defaultTurnDurationMs: 2 * 60 * 60 * 1000, // 2 hours
      maxConcurrentTurns: 5,
      retryFailedTurns: true,
      maxRetries: 3,
      enableAutoScheduling: true
    }
  ) {
    this.config = config;
    this.turnProcessor = turnProcessor;
    this.universeSchedules = new Map();
    this.pendingTurns = new Map();
    this.activeTurns = new Map();
    this.schedulerIntervals = new Map();
    this.actionQueues = new Map();
  }

  /**
   * Starts the turn scheduler for all active universes.
   * @sideEffect Begins automatic turn scheduling and processing
   */
  public start(): void {
    if (this.isRunning) {
      console.log('Turn scheduler is already running');
      return;
    }

    this.isRunning = true;
    console.log('Turn scheduler started');

    // Start scheduling for all registered universes
    for (const [universeId, schedule] of this.universeSchedules) {
      if (schedule.isActive && this.config.enableAutoScheduling) {
        this.startUniverseScheduling(universeId);
      }
    }
  }

  /**
   * Stops the turn scheduler and clears all intervals.
   * @sideEffect Stops automatic turn scheduling
   */
  public stop(): void {
    if (!this.isRunning) {
      console.log('Turn scheduler is not running');
      return;
    }

    this.isRunning = false;

    // Clear all scheduling intervals
    for (const [universeId, interval] of this.schedulerIntervals) {
      clearInterval(interval);
      this.schedulerIntervals.delete(universeId);
    }

    console.log('Turn scheduler stopped');
  }

  /**
   * Registers a universe for turn scheduling.
   * @param {string} universeId - Universe to register
   * @param {number} turnDurationMs - Duration of turns in milliseconds
   * @param {number} startingTurnNumber - Turn number to start from
   */
  public registerUniverse(
    universeId: string, 
    turnDurationMs: number = this.config.defaultTurnDurationMs,
    startingTurnNumber: number = 1
  ): void {
    const schedule: UniverseSchedule = {
      universeId,
      currentTurnNumber: startingTurnNumber,
      turnDurationMs,
      isActive: true
    };

    this.universeSchedules.set(universeId, schedule);
    console.log(`Registered universe ${universeId} with ${turnDurationMs}ms turns`);

    // Start scheduling if scheduler is running
    if (this.isRunning && this.config.enableAutoScheduling) {
      this.startUniverseScheduling(universeId);
    }
  }

  /**
   * Unregisters a universe from turn scheduling.
   * @param {string} universeId - Universe to unregister
   */
  public unregisterUniverse(universeId: string): void {
    const schedule = this.universeSchedules.get(universeId);
    if (!schedule) {
      console.log(`Universe ${universeId} is not registered`);
      return;
    }

    // Stop scheduling for this universe
    this.stopUniverseScheduling(universeId);

    // Clean up data
    this.universeSchedules.delete(universeId);
    this.actionQueues.delete(universeId);

    console.log(`Unregistered universe ${universeId}`);
  }

  /**
   * Manually creates and starts a new turn for a universe.
   * @param {string} universeId - Universe to create turn for
   * @returns {Promise<Turn>} The created turn
   */
  public async createTurn(universeId: string): Promise<Turn> {
    const schedule = this.universeSchedules.get(universeId);
    if (!schedule) {
      throw new Error(`Universe ${universeId} is not registered`);
    }

    // Check if there's already an active turn
    if (schedule.activeTurn && schedule.activeTurn.isAcceptingActions()) {
      throw new Error(`Universe ${universeId} already has an active turn ${schedule.activeTurn.id}`);
    }

    const turnId = `turn_${universeId}_${schedule.currentTurnNumber}_${Date.now()}`;
    const turnConfig: TurnConfig = {
      durationMs: schedule.turnDurationMs,
      maxActions: 10,
      processingTimeoutMs: 5 * 60 * 1000
    };

    const turn = new Turn(turnId, universeId, schedule.currentTurnNumber, turnConfig);
    
    // Create action queue for this turn
    const actionQueue = new ActionQueue(turnId);
    this.actionQueues.set(turnId, actionQueue);

    // Start the turn
    turn.start();
    
    // Update schedule
    schedule.activeTurn = turn;
    schedule.currentTurnNumber++;
    
    // Store turn references
    this.activeTurns.set(turnId, turn);

    console.log(`Created and started turn ${turnId} for universe ${universeId}`);

    // Schedule turn processing when collection ends
    this.scheduleTurnProcessing(turn);

    return turn;
  }

  /**
   * Manually processes a turn (for testing or emergency processing).
   * @param {string} turnId - Turn to process
   * @returns {Promise<TurnProcessingResult>} Processing result
   */
  public async processTurn(turnId: string): Promise<TurnProcessingResult> {
    const turn = this.activeTurns.get(turnId);
    if (!turn) {
      throw new Error(`Turn ${turnId} not found in active turns`);
    }

    const actionQueue = this.actionQueues.get(turnId);
    if (!actionQueue) {
      throw new Error(`Action queue for turn ${turnId} not found`);
    }

    console.log(`Processing turn ${turnId} manually`);
    
    const result = await this.turnProcessor.processTurn(turn, actionQueue);
    
    // Update universe schedule with result
    const schedule = this.universeSchedules.get(turn.universeId);
    if (schedule) {
      schedule.lastProcessingResult = result;
      schedule.activeTurn = undefined; // Clear active turn
    }

    // Clean up turn data
    this.activeTurns.delete(turnId);
    this.actionQueues.delete(turnId);

    return result;
  }

  /**
   * Gets the action queue for a turn.
   * @param {string} turnId - Turn ID
   * @returns {ActionQueue|undefined} Action queue or undefined
   */
  public getActionQueue(turnId: string): ActionQueue | undefined {
    return this.actionQueues.get(turnId);
  }

  /**
   * Gets the current active turn for a universe.
   * @param {string} universeId - Universe ID
   * @returns {Turn|undefined} Active turn or undefined
   */
  public getActiveTurn(universeId: string): Turn | undefined {
    const schedule = this.universeSchedules.get(universeId);
    return schedule?.activeTurn;
  }

  /**
   * Gets the schedule for a universe.
   * @param {string} universeId - Universe ID
   * @returns {UniverseSchedule|undefined} Universe schedule or undefined
   */
  public getUniverseSchedule(universeId: string): UniverseSchedule | undefined {
    return this.universeSchedules.get(universeId);
  }

  /**
   * Pauses turn scheduling for a universe.
   * @param {string} universeId - Universe to pause
   */
  public pauseUniverse(universeId: string): void {
    const schedule = this.universeSchedules.get(universeId);
    if (schedule) {
      schedule.isActive = false;
      this.stopUniverseScheduling(universeId);
      console.log(`Paused universe ${universeId}`);
    }
  }

  /**
   * Resumes turn scheduling for a universe.
   * @param {string} universeId - Universe to resume
   */
  public resumeUniverse(universeId: string): void {
    const schedule = this.universeSchedules.get(universeId);
    if (schedule) {
      schedule.isActive = true;
      if (this.isRunning && this.config.enableAutoScheduling) {
        this.startUniverseScheduling(universeId);
      }
      console.log(`Resumed universe ${universeId}`);
    }
  }

  /**
   * Gets statistics about the scheduler state.
   * @returns {object} Scheduler statistics
   */
  public getStatistics(): {
    isRunning: boolean;
    registeredUniverses: number;
    activeUniverses: number;
    activeTurns: number;
    pendingTurns: number;
    totalActionsQueued: number;
  } {
    const activeUniverses = Array.from(this.universeSchedules.values())
      .filter(schedule => schedule.isActive).length;

    const totalActionsQueued = Array.from(this.actionQueues.values())
      .reduce((total, queue) => total + queue.size(), 0);

    return {
      isRunning: this.isRunning,
      registeredUniverses: this.universeSchedules.size,
      activeUniverses,
      activeTurns: this.activeTurns.size,
      pendingTurns: this.pendingTurns.size,
      totalActionsQueued
    };
  }

  /**
   * Starts scheduling for a specific universe.
   */
  private startUniverseScheduling(universeId: string): void {
    const schedule = this.universeSchedules.get(universeId);
    if (!schedule || !schedule.isActive) {
      return;
    }

    // Clear any existing interval
    this.stopUniverseScheduling(universeId);

    // Create new turn immediately if no active turn
    if (!schedule.activeTurn) {
      this.createTurn(universeId).catch(error => {
        console.error(`Failed to create initial turn for universe ${universeId}:`, error);
      });
    }

    // Set up interval for future turns
    const interval = setInterval(async () => {
      try {
        const currentSchedule = this.universeSchedules.get(universeId);
        if (!currentSchedule || !currentSchedule.isActive) {
          this.stopUniverseScheduling(universeId);
          return;
        }

        // Check if current turn has ended and needs processing
        if (currentSchedule.activeTurn && currentSchedule.activeTurn.isExpired()) {
          await this.processTurn(currentSchedule.activeTurn.id);
        }

        // Create next turn if no active turn
        if (!currentSchedule.activeTurn) {
          await this.createTurn(universeId);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Error in universe ${universeId} scheduling:`, errorMessage);
      }
    }, 60000); // Check every minute

    this.schedulerIntervals.set(universeId, interval);
    console.log(`Started scheduling for universe ${universeId}`);
  }

  /**
   * Stops scheduling for a specific universe.
   */
  private stopUniverseScheduling(universeId: string): void {
    const interval = this.schedulerIntervals.get(universeId);
    if (interval) {
      clearInterval(interval);
      this.schedulerIntervals.delete(universeId);
      console.log(`Stopped scheduling for universe ${universeId}`);
    }
  }

  /**
   * Schedules turn processing when collection ends.
   */
  private scheduleTurnProcessing(turn: Turn): void {
    const processingDelay = turn.getRemainingTime() + 1000; // Add 1 second buffer
    
    setTimeout(async () => {
      try {
        if (turn.isExpired() && turn.status === 'active') {
          await this.processTurn(turn.id);
        }
      } catch (error) {
        console.error(`Failed to process turn ${turn.id}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        turn.fail(`Scheduled processing failed: ${errorMessage}`);
      }
    }, processingDelay);

    console.log(`Scheduled processing for turn ${turn.id} in ${processingDelay}ms`);
  }
}
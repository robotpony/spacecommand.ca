import { TurnPhase, TurnStatus } from '@shared/types';

export interface TurnConfig {
  durationMs: number;      // Turn window duration (default: 2-4 hours)
  maxActions: number;      // Maximum actions per player per turn
  processingTimeoutMs: number; // Maximum time for turn processing
}

/**
 * Represents a single game turn cycle in the multiplayer environment.
 * Manages turn timing, phases, player action collection, and processing state.
 * Each turn has a fixed duration window for collecting player actions,
 * followed by automated processing and result distribution.
 */
export class Turn {
  public readonly id: string;
  public readonly universeId: string;
  public readonly turnNumber: number;
  public phase: TurnPhase;
  public status: TurnStatus;
  public startTime: Date;
  public endTime: Date;
  public processingStarted?: Date;
  public processingCompleted?: Date;
  public config: TurnConfig;
  public actionsCollected: number;
  public playersParticipated: string[];
  public processingLog: string[];
  public errorMessages: string[];

  constructor(
    id: string,
    universeId: string,
    turnNumber: number,
    config: TurnConfig = {
      durationMs: 2 * 60 * 60 * 1000, // 2 hours default
      maxActions: 10,
      processingTimeoutMs: 5 * 60 * 1000 // 5 minutes processing timeout
    }
  ) {
    this.id = id;
    this.universeId = universeId;
    this.turnNumber = turnNumber;
    this.phase = 'collecting';
    this.status = 'scheduled';
    this.startTime = new Date();
    this.endTime = new Date(this.startTime.getTime() + config.durationMs);
    this.config = config;
    this.actionsCollected = 0;
    this.playersParticipated = [];
    this.processingLog = [];
    this.errorMessages = [];
  }

  /**
   * Starts the turn action collection phase.
   * @sideEffect Sets status to active and phase to collecting
   */
  public start(): void {
    this.status = 'active';
    this.phase = 'collecting';
    this.logMessage(`Turn ${this.turnNumber} started - collecting player actions`);
  }

  /**
   * Checks if the turn is currently accepting player actions.
   * @returns {boolean} True if in collection phase and before end time
   */
  public isAcceptingActions(): boolean {
    return this.phase === 'collecting' && 
           this.status === 'active' && 
           new Date() < this.endTime;
  }

  /**
   * Checks if the turn collection window has expired.
   * @returns {boolean} True if current time is past the end time
   */
  public isExpired(): boolean {
    return new Date() >= this.endTime;
  }

  /**
   * Advances turn to the next processing phase.
   * @param {TurnPhase} nextPhase - The phase to transition to
   * @sideEffect Updates phase and logs transition
   */
  public advancePhase(nextPhase: TurnPhase): void {
    const previousPhase = this.phase;
    this.phase = nextPhase;
    
    if (nextPhase === 'processing' && !this.processingStarted) {
      this.processingStarted = new Date();
      this.status = 'processing';
    }
    
    this.logMessage(`Phase transition: ${previousPhase} → ${nextPhase}`);
  }

  /**
   * Records that a player submitted an action during this turn.
   * @param {string} playerId - UUID of the player who submitted action
   * @sideEffect Increments action count and tracks participating players
   */
  public recordPlayerAction(playerId: string): void {
    this.actionsCollected++;
    
    if (!this.playersParticipated.includes(playerId)) {
      this.playersParticipated.push(playerId);
    }
  }

  /**
   * Marks the turn as completed successfully.
   * @sideEffect Sets status to completed, phase to completed, records completion time
   */
  public complete(): void {
    this.status = 'completed';
    this.phase = 'completed';
    this.processingCompleted = new Date();
    this.logMessage(`Turn ${this.turnNumber} completed successfully`);
  }

  /**
   * Marks the turn as failed due to processing errors.
   * @param {string} errorMessage - Description of the failure
   * @sideEffect Sets status to failed and records error
   */
  public fail(errorMessage: string): void {
    this.status = 'failed';
    this.errorMessages.push(errorMessage);
    this.logMessage(`Turn ${this.turnNumber} failed: ${errorMessage}`);
  }

  /**
   * Cancels the turn (emergency stop).
   * @param {string} reason - Reason for cancellation
   * @sideEffect Sets status to cancelled and records reason
   */
  public cancel(reason: string): void {
    this.status = 'cancelled';
    this.logMessage(`Turn ${this.turnNumber} cancelled: ${reason}`);
  }

  /**
   * Calculates the remaining time in the collection window.
   * @returns {number} Milliseconds remaining, or 0 if expired
   */
  public getRemainingTime(): number {
    const now = new Date().getTime();
    const remaining = this.endTime.getTime() - now;
    return Math.max(0, remaining);
  }

  /**
   * Gets the total processing time if turn has been processed.
   * @returns {number|null} Processing time in milliseconds, or null if not processed
   */
  public getProcessingDuration(): number | null {
    if (!this.processingStarted || !this.processingCompleted) {
      return null;
    }
    return this.processingCompleted.getTime() - this.processingStarted.getTime();
  }

  /**
   * Checks if processing has exceeded the configured timeout.
   * @returns {boolean} True if processing has timed out
   */
  public hasProcessingTimedOut(): boolean {
    if (!this.processingStarted) {
      return false;
    }
    
    const processingTime = new Date().getTime() - this.processingStarted.getTime();
    return processingTime > this.config.processingTimeoutMs;
  }

  /**
   * Returns a summary of turn statistics for reporting.
   * @returns {object} Turn statistics including participation and timing
   */
  public getStatistics(): {
    turnNumber: number;
    universeId: string;
    status: TurnStatus;
    phase: TurnPhase;
    actionsCollected: number;
    playersParticipated: number;
    processingDuration: number | null;
    errorCount: number;
  } {
    return {
      turnNumber: this.turnNumber,
      universeId: this.universeId,
      status: this.status,
      phase: this.phase,
      actionsCollected: this.actionsCollected,
      playersParticipated: this.playersParticipated.length,
      processingDuration: this.getProcessingDuration(),
      errorCount: this.errorMessages.length
    };
  }

  /**
   * Adds a message to the turn processing log.
   * @param {string} message - Log message to record
   * @sideEffect Appends timestamped message to processing log
   */
  private logMessage(message: string): void {
    const timestamp = new Date().toISOString();
    this.processingLog.push(`[${timestamp}] ${message}`);
  }
}
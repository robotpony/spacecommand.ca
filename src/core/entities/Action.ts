import { ActionType, ActionResult, Coordinates } from '@shared/types';

export interface ActionValidationResult {
  isValid: boolean;
  errorMessage?: string;
  errorCode?: string;
}

export interface ActionExecutionResult {
  result: ActionResult;
  message: string;
  data?: Record<string, any>;
  sideEffects?: string[];
}

/**
 * Represents a single player action submitted during a turn.
 * Encapsulates action data, validation state, execution results, and timing.
 * Actions are processed in priority order during turn execution phase.
 * Supports rollback through immutable state tracking.
 */
export class Action {
  public readonly id: string;
  public readonly playerId: string;
  public readonly turnId: string;
  public readonly type: ActionType;
  public readonly priority: number;
  public submittedAt: Date;
  public readonly parameters: Record<string, any>;
  
  public validationResult?: ActionValidationResult;
  public executionResult?: ActionExecutionResult;
  public processedAt?: Date;
  public retryCount: number;
  public canceled: boolean;

  // Action type specific priority order for processing
  private static readonly ACTION_PRIORITIES: Record<ActionType, number> = {
    'diplomacy': 1,      // Process diplomatic actions first
    'research': 2,       // Technology advancement
    'build_ships': 3,    // Ship construction
    'repair': 4,         // Ship repairs
    'transfer': 5,       // Resource transfers
    'move_fleet': 6,     // Fleet movement
    'mine': 7,           // Resource extraction
    'trade': 8,          // Market transactions
    'colonize': 9,       // Planet colonization
    'attack': 10         // Combat actions last
  };

  constructor(
    id: string,
    playerId: string,
    turnId: string,
    type: ActionType,
    parameters: Record<string, any> = {}
  ) {
    this.id = id;
    this.playerId = playerId;
    this.turnId = turnId;
    this.type = type;
    this.priority = Action.ACTION_PRIORITIES[type];
    this.submittedAt = new Date();
    this.parameters = this.deepClone(parameters); // Deep defensive copy
    this.retryCount = 0;
    this.canceled = false;
  }

  /**
   * Validates the action against current game state.
   * @param {ActionValidationResult} result - Validation result from validator
   * @sideEffect Updates validation state of action
   */
  public setValidationResult(result: ActionValidationResult): void {
    this.validationResult = result;
  }

  /**
   * Records the execution result of this action.
   * @param {ActionExecutionResult} result - Execution result from processor
   * @sideEffect Updates execution state and processing timestamp
   */
  public setExecutionResult(result: ActionExecutionResult): void {
    // Prevent execution after cancellation
    if (this.canceled && result.result !== 'cancelled') {
      return;
    }
    
    this.executionResult = result;
    this.processedAt = new Date();
  }

  /**
   * Checks if action has passed validation.
   * @returns {boolean} True if validation passed, false if failed or not validated
   */
  public isValid(): boolean {
    return this.validationResult?.isValid === true;
  }

  /**
   * Checks if action has been executed (successfully or not).
   * @returns {boolean} True if action has been processed
   */
  public isExecuted(): boolean {
    return this.executionResult !== undefined;
  }

  /**
   * Checks if action executed successfully.
   * @returns {boolean} True if execution result is success
   */
  public wasSuccessful(): boolean {
    return this.executionResult?.result === 'success';
  }

  /**
   * Cancels the action, preventing execution.
   * @param {string} reason - Reason for cancellation
   * @sideEffect Sets canceled flag and records cancellation result
   */
  public cancel(reason: string): void {
    this.canceled = true;
    this.setExecutionResult({
      result: 'cancelled',
      message: reason
    });
  }

  /**
   * Increments retry count for failed actions.
   * @returns {number} New retry count
   * @sideEffect Increases retry counter
   */
  public incrementRetry(): number {
    return ++this.retryCount;
  }

  /**
   * Gets action parameter value with type safety.
   * @param {string} key - Parameter key
   * @param {T} defaultValue - Default value if parameter not found
   * @returns {T} Parameter value or default
   */
  public getParameter<T>(key: string, defaultValue: T): T {
    return this.parameters[key] !== undefined ? this.parameters[key] : defaultValue;
  }

  /**
   * Creates a fleet movement action.
   * @param {string} actionId - Unique action identifier
   * @param {string} playerId - Player submitting the action
   * @param {string} turnId - Turn this action belongs to
   * @param {string} fleetId - Fleet to move
   * @param {Coordinates} destination - Target coordinates
   * @returns {Action} Configured movement action
   */
  public static createMoveFleet(
    actionId: string,
    playerId: string,
    turnId: string,
    fleetId: string,
    destination: Coordinates
  ): Action {
    return new Action(actionId, playerId, turnId, 'move_fleet', {
      fleetId,
      destination
    });
  }

  /**
   * Creates a trade action.
   * @param {string} actionId - Unique action identifier
   * @param {string} playerId - Player submitting the action
   * @param {string} turnId - Turn this action belongs to
   * @param {string} stationId - Trading station identifier
   * @param {string} resourceType - Type of resource to trade
   * @param {number} quantity - Amount to buy/sell (negative for sell)
   * @param {number} maxPrice - Maximum price willing to pay per unit
   * @returns {Action} Configured trade action
   */
  public static createTrade(
    actionId: string,
    playerId: string,
    turnId: string,
    stationId: string,
    resourceType: string,
    quantity: number,
    maxPrice: number
  ): Action {
    return new Action(actionId, playerId, turnId, 'trade', {
      stationId,
      resourceType,
      quantity,
      maxPrice
    });
  }

  /**
   * Creates an attack action.
   * @param {string} actionId - Unique action identifier
   * @param {string} playerId - Player submitting the action
   * @param {string} turnId - Turn this action belongs to
   * @param {string} attackerFleetId - Attacking fleet identifier
   * @param {string} targetFleetId - Target fleet identifier
   * @param {string} tacticsType - Combat tactics to employ
   * @returns {Action} Configured attack action
   */
  public static createAttack(
    actionId: string,
    playerId: string,
    turnId: string,
    attackerFleetId: string,
    targetFleetId: string,
    tacticsType: string = 'balanced'
  ): Action {
    return new Action(actionId, playerId, turnId, 'attack', {
      attackerFleetId,
      targetFleetId,
      tacticsType
    });
  }

  /**
   * Creates a research action.
   * @param {string} actionId - Unique action identifier
   * @param {string} playerId - Player submitting the action
   * @param {string} turnId - Turn this action belongs to
   * @param {string} technologyId - Technology to research
   * @param {number} researchPoints - Points to allocate
   * @returns {Action} Configured research action
   */
  public static createResearch(
    actionId: string,
    playerId: string,
    turnId: string,
    technologyId: string,
    researchPoints: number
  ): Action {
    return new Action(actionId, playerId, turnId, 'research', {
      technologyId,
      researchPoints
    });
  }

  /**
   * Converts action to a data object for persistence.
   * @returns {object} Serializable action data
   */
  public toData(): {
    id: string;
    playerId: string;
    turnId: string;
    type: ActionType;
    priority: number;
    submittedAt: string;
    parameters: Record<string, any>;
    validationResult?: ActionValidationResult;
    executionResult?: ActionExecutionResult;
    processedAt?: string;
    retryCount: number;
    canceled: boolean;
  } {
    return {
      id: this.id,
      playerId: this.playerId,
      turnId: this.turnId,
      type: this.type,
      priority: this.priority,
      submittedAt: this.submittedAt.toISOString(),
      parameters: this.parameters,
      validationResult: this.validationResult,
      executionResult: this.executionResult,
      processedAt: this.processedAt?.toISOString(),
      retryCount: this.retryCount,
      canceled: this.canceled
    };
  }

  /**
   * Creates an Action instance from persisted data.
   * @param {object} data - Serialized action data
   * @returns {Action} Reconstructed action instance
   */
  public static fromData(data: any): Action {
    const action = new Action(
      data.id,
      data.playerId,
      data.turnId,
      data.type,
      data.parameters
    );
    
    // Restore timestamps
    action.submittedAt = new Date(data.submittedAt);
    if (data.processedAt) {
      action.processedAt = new Date(data.processedAt);
    }
    
    // Restore state
    action.validationResult = data.validationResult;
    action.executionResult = data.executionResult;
    action.retryCount = data.retryCount;
    action.canceled = data.canceled;
    
    return action;
  }

  /**
   * Creates a deep clone of an object.
   * @param {any} obj - Object to clone
   * @returns {any} Deep cloned object
   */
  private deepClone(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    
    if (obj instanceof Date) {
      return new Date(obj.getTime());
    }
    
    if (obj instanceof Array) {
      return obj.map(item => this.deepClone(item));
    }
    
    if (typeof obj === 'object') {
      const cloned: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          cloned[key] = this.deepClone(obj[key]);
        }
      }
      return cloned;
    }
    
    return obj;
  }
}
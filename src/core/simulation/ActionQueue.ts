import { Action } from '../entities/Action';
import { ActionType } from '@shared/types';

export interface QueueStatistics {
  totalActions: number;
  actionsByType: Record<ActionType, number>;
  actionsByPlayer: Record<string, number>;
  priorityDistribution: Record<number, number>;
}

/**
 * Manages the collection and prioritization of player actions during turn processing.
 * Maintains action ordering by priority and submission time for deterministic execution.
 * Provides filtering and statistics for turn processing analysis.
 * Thread-safe for concurrent action submission during collection phase.
 */
export class ActionQueue {
  private readonly turnId: string;
  private readonly actions: Map<string, Action>;
  private readonly actionsByPlayer: Map<string, string[]>;
  private readonly maxActionsPerPlayer: number;
  private readonly allowedActionTypes: Set<ActionType>;

  constructor(
    turnId: string,
    maxActionsPerPlayer: number = 10,
    allowedActionTypes?: ActionType[]
  ) {
    this.turnId = turnId;
    this.actions = new Map();
    this.actionsByPlayer = new Map();
    this.maxActionsPerPlayer = maxActionsPerPlayer;
    this.allowedActionTypes = allowedActionTypes 
      ? new Set(allowedActionTypes)
      : new Set([
          'move_fleet', 'trade', 'attack', 'colonize', 'research',
          'build_ships', 'diplomacy', 'mine', 'transfer', 'repair'
        ]);
  }

  /**
   * Adds a player action to the queue if validation passes.
   * @param {Action} action - Action to add to the queue
   * @returns {boolean} True if action was added successfully
   * @throws {Error} If action validation fails
   * @sideEffect Adds action to queue and player tracking
   */
  public addAction(action: Action): boolean {
    // Validate action belongs to this turn
    if (action.turnId !== this.turnId) {
      throw new Error(`Action ${action.id} belongs to turn ${action.turnId}, not ${this.turnId}`);
    }

    // Check if action type is allowed
    if (!this.allowedActionTypes.has(action.type)) {
      throw new Error(`Action type ${action.type} is not allowed in this turn`);
    }

    // Check player action limit
    const playerActions = this.getPlayerActionCount(action.playerId);
    if (playerActions >= this.maxActionsPerPlayer) {
      throw new Error(`Player ${action.playerId} has reached maximum actions limit (${this.maxActionsPerPlayer})`);
    }

    // Check for duplicate action ID
    if (this.actions.has(action.id)) {
      throw new Error(`Action with ID ${action.id} already exists in queue`);
    }

    // Add action to main queue
    this.actions.set(action.id, action);

    // Track action by player
    if (!this.actionsByPlayer.has(action.playerId)) {
      this.actionsByPlayer.set(action.playerId, []);
    }
    this.actionsByPlayer.get(action.playerId)!.push(action.id);

    return true;
  }

  /**
   * Removes an action from the queue if it exists and hasn't been processed.
   * @param {string} actionId - ID of action to remove
   * @param {string} playerId - Player requesting removal (must own the action)
   * @returns {boolean} True if action was removed
   * @sideEffect Removes action from queue and player tracking
   */
  public removeAction(actionId: string, playerId: string): boolean {
    const action = this.actions.get(actionId);
    
    if (!action) {
      return false;
    }

    // Verify player owns this action
    if (action.playerId !== playerId) {
      throw new Error(`Player ${playerId} cannot remove action ${actionId} owned by ${action.playerId}`);
    }

    // Prevent removal of processed actions
    if (action.isExecuted()) {
      throw new Error(`Cannot remove action ${actionId} that has already been processed`);
    }

    // Remove from main queue
    this.actions.delete(actionId);

    // Remove from player tracking
    const playerActions = this.actionsByPlayer.get(playerId);
    if (playerActions) {
      const index = playerActions.indexOf(actionId);
      if (index > -1) {
        playerActions.splice(index, 1);
      }
      
      // Clean up empty player entry
      if (playerActions.length === 0) {
        this.actionsByPlayer.delete(playerId);
      }
    }

    return true;
  }

  /**
   * Retrieves an action by ID.
   * @param {string} actionId - ID of action to retrieve
   * @returns {Action|undefined} Action instance or undefined if not found
   */
  public getAction(actionId: string): Action | undefined {
    return this.actions.get(actionId);
  }

  /**
   * Gets all actions for a specific player.
   * @param {string} playerId - Player ID to filter by
   * @returns {Action[]} Array of actions owned by the player
   */
  public getPlayerActions(playerId: string): Action[] {
    const actionIds = this.actionsByPlayer.get(playerId) || [];
    return actionIds
      .map(id => this.actions.get(id))
      .filter((action): action is Action => action !== undefined);
  }

  /**
   * Gets count of actions submitted by a player.
   * @param {string} playerId - Player ID to count actions for
   * @returns {number} Number of actions submitted by player
   */
  public getPlayerActionCount(playerId: string): number {
    return this.actionsByPlayer.get(playerId)?.length || 0;
  }

  /**
   * Gets all actions in the queue sorted by priority and submission time.
   * @returns {Action[]} Array of actions in processing order
   */
  public getAllActions(): Action[] {
    return Array.from(this.actions.values()).sort((a, b) => {
      // Primary sort: priority (lower number = higher priority)
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      
      // Secondary sort: submission time (earlier = higher priority)
      return a.submittedAt.getTime() - b.submittedAt.getTime();
    });
  }

  /**
   * Gets actions filtered by type.
   * @param {ActionType} actionType - Type of actions to retrieve
   * @returns {Action[]} Array of actions of the specified type
   */
  public getActionsByType(actionType: ActionType): Action[] {
    return Array.from(this.actions.values())
      .filter(action => action.type === actionType)
      .sort((a, b) => a.submittedAt.getTime() - b.submittedAt.getTime());
  }

  /**
   * Gets actions that have not been validated yet.
   * @returns {Action[]} Array of unvalidated actions
   */
  public getUnvalidatedActions(): Action[] {
    return Array.from(this.actions.values())
      .filter(action => !action.validationResult);
  }

  /**
   * Gets actions that passed validation but haven't been executed.
   * @returns {Action[]} Array of valid, unexecuted actions
   */
  public getValidUnexecutedActions(): Action[] {
    return Array.from(this.actions.values())
      .filter(action => action.isValid() && !action.isExecuted())
      .sort((a, b) => {
        if (a.priority !== b.priority) {
          return a.priority - b.priority;
        }
        return a.submittedAt.getTime() - b.submittedAt.getTime();
      });
  }

  /**
   * Gets actions that failed validation.
   * @returns {Action[]} Array of actions that failed validation
   */
  public getFailedValidationActions(): Action[] {
    return Array.from(this.actions.values())
      .filter(action => action.validationResult && !action.isValid());
  }

  /**
   * Checks if the queue is empty.
   * @returns {boolean} True if no actions are in the queue
   */
  public isEmpty(): boolean {
    return this.actions.size === 0;
  }

  /**
   * Gets total number of actions in the queue.
   * @returns {number} Total action count
   */
  public size(): number {
    return this.actions.size;
  }

  /**
   * Checks if a player has reached their action limit.
   * @param {string} playerId - Player ID to check
   * @returns {boolean} True if player is at maximum actions
   */
  public isPlayerAtLimit(playerId: string): boolean {
    return this.getPlayerActionCount(playerId) >= this.maxActionsPerPlayer;
  }

  /**
   * Gets list of all participating player IDs.
   * @returns {string[]} Array of player IDs who submitted actions
   */
  public getParticipatingPlayers(): string[] {
    return Array.from(this.actionsByPlayer.keys());
  }

  /**
   * Clears all actions from the queue.
   * @sideEffect Removes all actions and resets player tracking
   */
  public clear(): void {
    this.actions.clear();
    this.actionsByPlayer.clear();
  }

  /**
   * Generates statistics about the current queue state.
   * @returns {QueueStatistics} Statistical summary of queue contents
   */
  public getStatistics(): QueueStatistics {
    const actionsByType: Record<ActionType, number> = {
      'move_fleet': 0, 'trade': 0, 'attack': 0, 'colonize': 0, 'research': 0,
      'build_ships': 0, 'diplomacy': 0, 'mine': 0, 'transfer': 0, 'repair': 0
    };
    
    const actionsByPlayer: Record<string, number> = {};
    const priorityDistribution: Record<number, number> = {};

    for (const action of this.actions.values()) {
      // Count by type
      actionsByType[action.type]++;
      
      // Count by player
      actionsByPlayer[action.playerId] = (actionsByPlayer[action.playerId] || 0) + 1;
      
      // Count by priority
      priorityDistribution[action.priority] = (priorityDistribution[action.priority] || 0) + 1;
    }

    return {
      totalActions: this.actions.size,
      actionsByType,
      actionsByPlayer,
      priorityDistribution
    };
  }

  /**
   * Exports queue state for debugging or persistence.
   * @returns {object} Complete queue state including all actions
   */
  public exportState(): {
    turnId: string;
    maxActionsPerPlayer: number;
    allowedActionTypes: ActionType[];
    actions: any[];
    statistics: QueueStatistics;
  } {
    return {
      turnId: this.turnId,
      maxActionsPerPlayer: this.maxActionsPerPlayer,
      allowedActionTypes: Array.from(this.allowedActionTypes),
      actions: Array.from(this.actions.values()).map(action => action.toData()),
      statistics: this.getStatistics()
    };
  }
}
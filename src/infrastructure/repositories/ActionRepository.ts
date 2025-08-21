import { PoolClient } from 'pg';
import { BaseRepository, Entity, QueryOptions } from './BaseRepository';
import { Action, ActionValidationResult, ActionExecutionResult } from '../../core/entities/Action';
import { ActionType, ActionResult } from '@shared/types';

/**
 * Database entity interface for actions.
 */
export interface ActionEntity extends Entity {
  playerId: string;
  turnId: string;
  type: ActionType;
  priority: number;
  submittedAt: Date;
  parameters: Record<string, any>;
  validationResult?: ActionValidationResult;
  executionResult?: ActionExecutionResult;
  processedAt?: Date;
  retryCount: number;
  canceled: boolean;
}

/**
 * Repository for managing Action entities in the database.
 * Handles action persistence, querying by turn/player, and result tracking.
 * Supports transaction-based operations for turn processing.
 */
export class ActionRepository extends BaseRepository<ActionEntity> {
  protected readonly tableName = 'actions';

  /**
   * Converts database row to Action entity.
   */
  protected hydrate(row: any): ActionEntity {
    return {
      id: row.id,
      playerId: row.player_id,
      turnId: row.turn_id,
      type: row.type,
      priority: row.priority,
      submittedAt: new Date(row.submitted_at),
      parameters: JSON.parse(row.parameters || '{}'),
      validationResult: row.validation_result ? JSON.parse(row.validation_result) : undefined,
      executionResult: row.execution_result ? JSON.parse(row.execution_result) : undefined,
      processedAt: row.processed_at ? new Date(row.processed_at) : undefined,
      retryCount: row.retry_count || 0,
      canceled: row.canceled || false
    };
  }

  /**
   * Converts Action entity to database columns.
   */
  protected dehydrate(entity: Partial<ActionEntity>): any {
    const data: any = {};

    if (entity.id !== undefined) data.id = entity.id;
    if (entity.playerId !== undefined) data.player_id = entity.playerId;
    if (entity.turnId !== undefined) data.turn_id = entity.turnId;
    if (entity.type !== undefined) data.type = entity.type;
    if (entity.priority !== undefined) data.priority = entity.priority;
    if (entity.submittedAt !== undefined) data.submitted_at = entity.submittedAt;
    if (entity.parameters !== undefined) data.parameters = JSON.stringify(entity.parameters);
    if (entity.validationResult !== undefined) data.validation_result = JSON.stringify(entity.validationResult);
    if (entity.executionResult !== undefined) data.execution_result = JSON.stringify(entity.executionResult);
    if (entity.processedAt !== undefined) data.processed_at = entity.processedAt;
    if (entity.retryCount !== undefined) data.retry_count = entity.retryCount;
    if (entity.canceled !== undefined) data.canceled = entity.canceled;

    return data;
  }

  /**
   * Converts Action domain entity to database entity.
   */
  public actionToEntity(action: Action): ActionEntity {
    return {
      id: action.id,
      playerId: action.playerId,
      turnId: action.turnId,
      type: action.type,
      priority: action.priority,
      submittedAt: action.submittedAt,
      parameters: action.parameters,
      validationResult: action.validationResult,
      executionResult: action.executionResult,
      processedAt: action.processedAt,
      retryCount: action.retryCount,
      canceled: action.canceled
    };
  }

  /**
   * Converts database entity to Action domain entity.
   */
  public entityToAction(entity: ActionEntity): Action {
    const action = new Action(
      entity.id,
      entity.playerId,
      entity.turnId,
      entity.type,
      entity.parameters
    );
    
    // Restore state
    action.submittedAt = entity.submittedAt;
    action.retryCount = entity.retryCount;
    action.canceled = entity.canceled;
    
    if (entity.validationResult) {
      action.setValidationResult(entity.validationResult);
    }
    
    if (entity.executionResult) {
      action.setExecutionResult(entity.executionResult);
    }
    
    if (entity.processedAt) {
      action.processedAt = entity.processedAt;
    }

    return action;
  }

  /**
   * Saves an Action domain entity to the database.
   * @param {Action} action - Action to save
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<ActionEntity>} Saved action entity
   */
  public async saveAction(action: Action, client?: PoolClient): Promise<ActionEntity> {
    const entity = this.actionToEntity(action);
    
    // Check if action exists
    const existing = await this.findById(action.id, client);
    
    if (existing) {
      // Update existing action
      const updated = await this.update(action.id, entity, client);
      if (!updated) {
        throw new Error(`Failed to update action ${action.id}`);
      }
      return updated;
    } else {
      // Create new action
      return await this.create(entity, client);
    }
  }

  /**
   * Loads an Action domain entity from the database.
   * @param {string} actionId - Action ID to load
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<Action | null>} Action domain entity or null
   */
  public async loadAction(actionId: string, client?: PoolClient): Promise<Action | null> {
    const entity = await this.findById(actionId, client);
    return entity ? this.entityToAction(entity) : null;
  }

  /**
   * Finds all actions for a specific turn.
   * @param {string} turnId - Turn ID
   * @param {QueryOptions} options - Query options
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<ActionEntity[]>} Array of actions for the turn
   */
  public async findByTurn(
    turnId: string,
    options: QueryOptions = {},
    client?: PoolClient
  ): Promise<ActionEntity[]> {
    return await this.findAll(
      { turnId } as Partial<ActionEntity>,
      {
        orderBy: 'priority, submitted_at',
        orderDirection: 'ASC',
        ...options
      },
      client
    );
  }

  /**
   * Finds all actions for a specific player.
   * @param {string} playerId - Player ID
   * @param {QueryOptions} options - Query options
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<ActionEntity[]>} Array of actions for the player
   */
  public async findByPlayer(
    playerId: string,
    options: QueryOptions = {},
    client?: PoolClient
  ): Promise<ActionEntity[]> {
    return await this.findAll(
      { playerId } as Partial<ActionEntity>,
      {
        orderBy: 'submitted_at',
        orderDirection: 'DESC',
        ...options
      },
      client
    );
  }

  /**
   * Finds actions by type across turns.
   * @param {ActionType} type - Action type
   * @param {QueryOptions} options - Query options
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<ActionEntity[]>} Array of actions of the specified type
   */
  public async findByType(
    type: ActionType,
    options: QueryOptions = {},
    client?: PoolClient
  ): Promise<ActionEntity[]> {
    return await this.findAll({ type } as Partial<ActionEntity>, options, client);
  }

  /**
   * Finds actions that haven't been validated yet.
   * @param {string} turnId - Optional turn ID to filter by
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<ActionEntity[]>} Array of unvalidated actions
   */
  public async findUnvalidated(
    turnId?: string,
    client?: PoolClient
  ): Promise<ActionEntity[]> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE validation_result IS NULL
        ${turnId ? 'AND turn_id = $1' : ''}
      ORDER BY priority ASC, submitted_at ASC
    `;
    
    const params = turnId ? [turnId] : [];
    return await this.raw(query, params, client);
  }

  /**
   * Finds actions that passed validation but haven't been executed.
   * @param {string} turnId - Optional turn ID to filter by
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<ActionEntity[]>} Array of valid unexecuted actions
   */
  public async findValidUnexecuted(
    turnId?: string,
    client?: PoolClient
  ): Promise<ActionEntity[]> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE validation_result IS NOT NULL
        AND JSON_EXTRACT_PATH_TEXT(validation_result, 'isValid')::boolean = true
        AND execution_result IS NULL
        AND canceled = false
        ${turnId ? 'AND turn_id = $1' : ''}
      ORDER BY priority ASC, submitted_at ASC
    `;
    
    const params = turnId ? [turnId] : [];
    return await this.raw(query, params, client);
  }

  /**
   * Finds actions that failed validation.
   * @param {string} turnId - Optional turn ID to filter by
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<ActionEntity[]>} Array of failed validation actions
   */
  public async findFailedValidation(
    turnId?: string,
    client?: PoolClient
  ): Promise<ActionEntity[]> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE validation_result IS NOT NULL
        AND JSON_EXTRACT_PATH_TEXT(validation_result, 'isValid')::boolean = false
        ${turnId ? 'AND turn_id = $1' : ''}
      ORDER BY submitted_at ASC
    `;
    
    const params = turnId ? [turnId] : [];
    return await this.raw(query, params, client);
  }

  /**
   * Finds actions that failed execution and can be retried.
   * @param {number} maxRetries - Maximum retry count
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<ActionEntity[]>} Array of retryable failed actions
   */
  public async findRetryableFailures(
    maxRetries: number = 3,
    client?: PoolClient
  ): Promise<ActionEntity[]> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE execution_result IS NOT NULL
        AND JSON_EXTRACT_PATH_TEXT(execution_result, 'result') = 'failed'
        AND retry_count < $1
        AND canceled = false
      ORDER BY submitted_at ASC
    `;
    
    return await this.raw(query, [maxRetries], client);
  }

  /**
   * Gets action statistics for a turn.
   * @param {string} turnId - Turn ID
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<object>} Action statistics
   */
  public async getTurnActionStatistics(
    turnId: string,
    client?: PoolClient
  ): Promise<{
    totalActions: number;
    validatedActions: number;
    validActions: number;
    executedActions: number;
    successfulActions: number;
    failedActions: number;
    canceledActions: number;
    actionsByType: Record<ActionType, number>;
    playerParticipation: Record<string, number>;
  }> {
    // Get basic counts
    const countQuery = `
      SELECT 
        COUNT(*) as total_actions,
        COUNT(validation_result) as validated_actions,
        COUNT(CASE WHEN JSON_EXTRACT_PATH_TEXT(validation_result, 'isValid')::boolean = true THEN 1 END) as valid_actions,
        COUNT(execution_result) as executed_actions,
        COUNT(CASE WHEN JSON_EXTRACT_PATH_TEXT(execution_result, 'result') = 'success' THEN 1 END) as successful_actions,
        COUNT(CASE WHEN JSON_EXTRACT_PATH_TEXT(execution_result, 'result') = 'failed' THEN 1 END) as failed_actions,
        COUNT(CASE WHEN canceled = true THEN 1 END) as canceled_actions
      FROM ${this.tableName}
      WHERE turn_id = $1
    `;
    
    const countResult = client 
      ? await client.query(countQuery, [turnId])
      : await this.raw(countQuery, [turnId]);
    
    // Get actions by type
    const typeQuery = `
      SELECT type, COUNT(*) as count
      FROM ${this.tableName}
      WHERE turn_id = $1
      GROUP BY type
    `;
    
    const typeResult = client
      ? await client.query(typeQuery, [turnId])
      : await this.raw(typeQuery, [turnId]);
    
    // Get player participation
    const playerQuery = `
      SELECT player_id, COUNT(*) as count
      FROM ${this.tableName}
      WHERE turn_id = $1
      GROUP BY player_id
    `;
    
    const playerResult = client
      ? await client.query(playerQuery, [turnId])
      : await this.raw(playerQuery, [turnId]);
    
    const counts = countResult[0];
    const actionsByType: Record<ActionType, number> = {
      'move_fleet': 0, 'trade': 0, 'attack': 0, 'colonize': 0, 'research': 0,
      'build_ships': 0, 'diplomacy': 0, 'mine': 0, 'transfer': 0, 'repair': 0
    };
    const playerParticipation: Record<string, number> = {};
    
    // Populate action counts by type
    for (const row of typeResult) {
      actionsByType[row.type as ActionType] = parseInt(row.count);
    }
    
    // Populate player participation
    for (const row of playerResult) {
      playerParticipation[row.player_id] = parseInt(row.count);
    }
    
    return {
      totalActions: parseInt(counts?.total_actions || '0'),
      validatedActions: parseInt(counts?.validated_actions || '0'),
      validActions: parseInt(counts?.valid_actions || '0'),
      executedActions: parseInt(counts?.executed_actions || '0'),
      successfulActions: parseInt(counts?.successful_actions || '0'),
      failedActions: parseInt(counts?.failed_actions || '0'),
      canceledActions: parseInt(counts?.canceled_actions || '0'),
      actionsByType,
      playerParticipation
    };
  }

  /**
   * Gets player action history.
   * @param {string} playerId - Player ID
   * @param {number} limit - Maximum number of actions to return
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<ActionEntity[]>} Array of player's recent actions
   */
  public async getPlayerActionHistory(
    playerId: string,
    limit: number = 100,
    client?: PoolClient
  ): Promise<ActionEntity[]> {
    return await this.findByPlayer(
      playerId,
      { limit, orderBy: 'submitted_at', orderDirection: 'DESC' },
      client
    );
  }

  /**
   * Cleans up old actions beyond retention period.
   * @param {number} retentionDays - Days to retain actions
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<number>} Number of actions deleted
   */
  public async cleanupOldActions(
    retentionDays: number = 30,
    client?: PoolClient
  ): Promise<number> {
    const query = `
      DELETE FROM ${this.tableName}
      WHERE processed_at IS NOT NULL
        AND processed_at < NOW() - INTERVAL '${retentionDays} days'
    `;
    
    const result = client 
      ? await client.query(query)
      : await this.raw(query);
    
    return result.length;
  }

  /**
   * Bulk loads actions for a turn into Action domain entities.
   * @param {string} turnId - Turn ID
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<Action[]>} Array of Action domain entities
   */
  public async loadTurnActions(turnId: string, client?: PoolClient): Promise<Action[]> {
    const entities = await this.findByTurn(turnId, {}, client);
    return entities.map(entity => this.entityToAction(entity));
  }

  /**
   * Bulk saves multiple actions.
   * @param {Action[]} actions - Actions to save
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<ActionEntity[]>} Array of saved action entities
   */
  public async bulkSaveActions(actions: Action[], client?: PoolClient): Promise<ActionEntity[]> {
    const savedEntities: ActionEntity[] = [];
    
    for (const action of actions) {
      const saved = await this.saveAction(action, client);
      savedEntities.push(saved);
    }
    
    return savedEntities;
  }
}
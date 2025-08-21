import { PoolClient } from 'pg';
import { BaseRepository, Entity, QueryOptions } from './BaseRepository';
import { Turn, TurnConfig } from '../../core/entities/Turn';
import { TurnPhase, TurnStatus } from '@shared/types';

/**
 * Database entity interface for turns.
 */
export interface TurnEntity extends Entity {
  universeId: string;
  turnNumber: number;
  phase: TurnPhase;
  status: TurnStatus;
  startTime: Date;
  endTime: Date;
  processingStarted?: Date;
  processingCompleted?: Date;
  config: TurnConfig;
  actionsCollected: number;
  playersParticipated: string[];
  processingLog: string[];
  errorMessages: string[];
}

/**
 * Repository for managing Turn entities in the database.
 * Handles turn persistence, querying, and status updates.
 * Supports transaction-based operations for turn processing.
 */
export class TurnRepository extends BaseRepository<TurnEntity> {
  protected readonly tableName = 'turns';

  /**
   * Converts database row to Turn entity.
   */
  protected hydrate(row: any): TurnEntity {
    return {
      id: row.id,
      universeId: row.universe_id,
      turnNumber: row.turn_number,
      phase: row.phase,
      status: row.status,
      startTime: new Date(row.start_time),
      endTime: new Date(row.end_time),
      processingStarted: row.processing_started ? new Date(row.processing_started) : undefined,
      processingCompleted: row.processing_completed ? new Date(row.processing_completed) : undefined,
      config: JSON.parse(row.config || '{}'),
      actionsCollected: row.actions_collected || 0,
      playersParticipated: JSON.parse(row.players_participated || '[]'),
      processingLog: JSON.parse(row.processing_log || '[]'),
      errorMessages: JSON.parse(row.error_messages || '[]')
    };
  }

  /**
   * Converts Turn entity to database columns.
   */
  protected dehydrate(entity: Partial<TurnEntity>): any {
    const data: any = {};

    if (entity.id !== undefined) data.id = entity.id;
    if (entity.universeId !== undefined) data.universe_id = entity.universeId;
    if (entity.turnNumber !== undefined) data.turn_number = entity.turnNumber;
    if (entity.phase !== undefined) data.phase = entity.phase;
    if (entity.status !== undefined) data.status = entity.status;
    if (entity.startTime !== undefined) data.start_time = entity.startTime;
    if (entity.endTime !== undefined) data.end_time = entity.endTime;
    if (entity.processingStarted !== undefined) data.processing_started = entity.processingStarted;
    if (entity.processingCompleted !== undefined) data.processing_completed = entity.processingCompleted;
    if (entity.config !== undefined) data.config = JSON.stringify(entity.config);
    if (entity.actionsCollected !== undefined) data.actions_collected = entity.actionsCollected;
    if (entity.playersParticipated !== undefined) data.players_participated = JSON.stringify(entity.playersParticipated);
    if (entity.processingLog !== undefined) data.processing_log = JSON.stringify(entity.processingLog);
    if (entity.errorMessages !== undefined) data.error_messages = JSON.stringify(entity.errorMessages);

    return data;
  }

  /**
   * Converts Turn domain entity to database entity.
   */
  public turnToEntity(turn: Turn): TurnEntity {
    return {
      id: turn.id,
      universeId: turn.universeId,
      turnNumber: turn.turnNumber,
      phase: turn.phase,
      status: turn.status,
      startTime: turn.startTime,
      endTime: turn.endTime,
      processingStarted: turn.processingStarted,
      processingCompleted: turn.processingCompleted,
      config: turn.config,
      actionsCollected: turn.actionsCollected,
      playersParticipated: turn.playersParticipated,
      processingLog: turn.processingLog,
      errorMessages: turn.errorMessages
    };
  }

  /**
   * Converts database entity to Turn domain entity.
   */
  public entityToTurn(entity: TurnEntity): Turn {
    const turn = new Turn(entity.id, entity.universeId, entity.turnNumber, entity.config);
    
    // Restore state
    turn.phase = entity.phase;
    turn.status = entity.status;
    turn.startTime = entity.startTime;
    turn.endTime = entity.endTime;
    turn.processingStarted = entity.processingStarted;
    turn.processingCompleted = entity.processingCompleted;
    turn.actionsCollected = entity.actionsCollected;
    turn.playersParticipated = [...entity.playersParticipated];
    turn.processingLog = [...entity.processingLog];
    turn.errorMessages = [...entity.errorMessages];

    return turn;
  }

  /**
   * Saves a Turn domain entity to the database.
   * @param {Turn} turn - Turn to save
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<TurnEntity>} Saved turn entity
   */
  public async saveTurn(turn: Turn, client?: PoolClient): Promise<TurnEntity> {
    const entity = this.turnToEntity(turn);
    
    // Check if turn exists
    const existing = await this.findById(turn.id, client);
    
    if (existing) {
      // Update existing turn
      const updated = await this.update(turn.id, entity, client);
      if (!updated) {
        throw new Error(`Failed to update turn ${turn.id}`);
      }
      return updated;
    } else {
      // Create new turn
      return await this.create(entity, client);
    }
  }

  /**
   * Loads a Turn domain entity from the database.
   * @param {string} turnId - Turn ID to load
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<Turn | null>} Turn domain entity or null
   */
  public async loadTurn(turnId: string, client?: PoolClient): Promise<Turn | null> {
    const entity = await this.findById(turnId, client);
    return entity ? this.entityToTurn(entity) : null;
  }

  /**
   * Finds the current active turn for a universe.
   * @param {string} universeId - Universe ID
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<TurnEntity | null>} Active turn or null
   */
  public async findActiveTurnForUniverse(
    universeId: string,
    client?: PoolClient
  ): Promise<TurnEntity | null> {
    return await this.findOne({
      universeId,
      status: 'active'
    } as Partial<TurnEntity>, client);
  }

  /**
   * Finds turns by status across all universes.
   * @param {TurnStatus} status - Turn status to filter by
   * @param {QueryOptions} options - Query options
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<TurnEntity[]>} Array of turns with the given status
   */
  public async findByStatus(
    status: TurnStatus,
    options: QueryOptions = {},
    client?: PoolClient
  ): Promise<TurnEntity[]> {
    return await this.findAll({ status } as Partial<TurnEntity>, options, client);
  }

  /**
   * Finds expired turns that need processing.
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<TurnEntity[]>} Array of expired turns
   */
  public async findExpiredTurns(client?: PoolClient): Promise<TurnEntity[]> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE status = 'active' 
        AND end_time <= NOW()
      ORDER BY end_time ASC
    `;
    
    return await this.raw(query, [], client);
  }

  /**
   * Finds turns that have been processing too long.
   * @param {number} timeoutMs - Processing timeout in milliseconds
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<TurnEntity[]>} Array of timed out turns
   */
  public async findTimedOutTurns(
    timeoutMs: number = 5 * 60 * 1000,
    client?: PoolClient
  ): Promise<TurnEntity[]> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE status = 'processing' 
        AND processing_started IS NOT NULL
        AND processing_started < NOW() - INTERVAL '${timeoutMs} milliseconds'
      ORDER BY processing_started ASC
    `;
    
    return await this.raw(query, [], client);
  }

  /**
   * Gets turn history for a universe.
   * @param {string} universeId - Universe ID
   * @param {number} limit - Maximum number of turns to return
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<TurnEntity[]>} Array of historical turns
   */
  public async getTurnHistory(
    universeId: string,
    limit: number = 50,
    client?: PoolClient
  ): Promise<TurnEntity[]> {
    return await this.findAll(
      { universeId } as Partial<TurnEntity>,
      {
        orderBy: 'turn_number',
        orderDirection: 'DESC',
        limit
      },
      client
    );
  }

  /**
   * Gets the latest turn number for a universe.
   * @param {string} universeId - Universe ID
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<number>} Latest turn number (0 if no turns exist)
   */
  public async getLatestTurnNumber(
    universeId: string,
    client?: PoolClient
  ): Promise<number> {
    const query = `
      SELECT COALESCE(MAX(turn_number), 0) as max_turn
      FROM ${this.tableName}
      WHERE universe_id = $1
    `;
    
    const result = client 
      ? await client.query(query, [universeId])
      : await this.raw(query, [universeId]);
    
    return result[0]?.max_turn || 0;
  }

  /**
   * Gets statistics about turns for monitoring.
   * @param {string} universeId - Optional universe ID to filter by
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<object>} Turn statistics
   */
  public async getTurnStatistics(
    universeId?: string,
    client?: PoolClient
  ): Promise<{
    totalTurns: number;
    activeTurns: number;
    processingTurns: number;
    completedTurns: number;
    failedTurns: number;
    averageProcessingTime: number;
  }> {
    const universeFilter = universeId ? 'WHERE universe_id = $1' : '';
    const params = universeId ? [universeId] : [];
    
    const query = `
      SELECT 
        COUNT(*) as total_turns,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_turns,
        COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_turns,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_turns,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_turns,
        AVG(
          CASE 
            WHEN processing_started IS NOT NULL AND processing_completed IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (processing_completed - processing_started)) * 1000
          END
        ) as avg_processing_time
      FROM ${this.tableName}
      ${universeFilter}
    `;
    
    const result = client 
      ? await client.query(query, params)
      : await this.raw(query, params);
    
    const row = result[0];
    return {
      totalTurns: parseInt(row?.total_turns || '0'),
      activeTurns: parseInt(row?.active_turns || '0'),
      processingTurns: parseInt(row?.processing_turns || '0'),
      completedTurns: parseInt(row?.completed_turns || '0'),
      failedTurns: parseInt(row?.failed_turns || '0'),
      averageProcessingTime: parseFloat(row?.avg_processing_time || '0')
    };
  }

  /**
   * Cleans up old completed turns beyond retention period.
   * @param {number} retentionDays - Days to retain completed turns
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<number>} Number of turns deleted
   */
  public async cleanupOldTurns(
    retentionDays: number = 30,
    client?: PoolClient
  ): Promise<number> {
    const query = `
      DELETE FROM ${this.tableName}
      WHERE status = 'completed'
        AND processing_completed < NOW() - INTERVAL '${retentionDays} days'
    `;
    
    const result = client 
      ? await client.query(query)
      : await this.raw(query);
    
    return result.length;
  }
}
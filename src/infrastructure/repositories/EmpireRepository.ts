import { BaseRepository } from './BaseRepository';
import { Empire, Technology, TradeRoute, DiplomaticRelation } from '../../core/entities/Empire';
import { PoolClient } from 'pg';
import { db } from '../database/connection';

/**
 * Database row structure for empires table.
 */
interface EmpireRow {
  id: string;
  name: string;
  player_id: string;
  faction: string;
  home_system_id: string;
  credits: number;
  technology_tier: string;
  action_points: number;
  max_action_points: number;
  turn_number: number;
  score: number;
  is_alive: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * Repository for managing empire persistence and complex empire operations.
 * Handles empire state, technologies, diplomatic relations, and turn processing.
 */
export class EmpireRepository extends BaseRepository<Empire> {
  protected readonly tableName = 'empires';
  
  /**
   * Converts database row to Empire entity.
   * @param {EmpireRow} row - Database row
   * @returns {Empire} Hydrated Empire instance
   */
  protected hydrate(row: EmpireRow): Empire {
    const empire = new Empire(
      row.id,
      row.name,
      row.player_id,
      row.faction as any,
      row.home_system_id
    );
    
    empire.credits = row.credits;
    empire.technologyTier = row.technology_tier as any;
    empire.actionPoints = row.action_points;
    empire.maxActionPoints = row.max_action_points;
    empire.turnNumber = row.turn_number;
    empire.score = row.score;
    empire.isAlive = row.is_alive;
    
    return empire;
  }
  
  /**
   * Converts Empire entity to database columns.
   * @param {Partial<Empire>} entity - Empire entity
   * @returns {any} Database column values
   */
  protected dehydrate(entity: Partial<Empire>): any {
    const data: any = {};
    
    if (entity.id !== undefined) data.id = entity.id;
    if (entity.name !== undefined) data.name = entity.name;
    if (entity.playerId !== undefined) data.player_id = entity.playerId;
    if (entity.faction !== undefined) data.faction = entity.faction;
    if (entity.homeSystemId !== undefined) data.home_system_id = entity.homeSystemId;
    if (entity.credits !== undefined) data.credits = entity.credits;
    if (entity.technologyTier !== undefined) data.technology_tier = entity.technologyTier;
    if (entity.actionPoints !== undefined) data.action_points = entity.actionPoints;
    if (entity.maxActionPoints !== undefined) data.max_action_points = entity.maxActionPoints;
    if (entity.turnNumber !== undefined) data.turn_number = entity.turnNumber;
    if (entity.score !== undefined) data.score = entity.score;
    if (entity.isAlive !== undefined) data.is_alive = entity.isAlive;
    
    return data;
  }
  
  /**
   * Finds an empire by player ID.
   * @param {string} playerId - Player ID
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<Empire | null>} Empire if found
   */
  public async findByPlayerId(
    playerId: string,
    client?: PoolClient
  ): Promise<Empire | null> {
    const query = `SELECT * FROM empires WHERE player_id = $1`;
    const result = client
      ? await client.query<EmpireRow>(query, [playerId])
      : await db.query<EmpireRow>(query, [playerId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.hydrate(result.rows[0]);
  }
  
  /**
   * Finds an empire by name.
   * @param {string} name - Empire name
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<Empire | null>} Empire if found
   */
  public async findByName(
    name: string,
    client?: PoolClient
  ): Promise<Empire | null> {
    const query = `SELECT * FROM empires WHERE name = $1`;
    const result = client
      ? await client.query<EmpireRow>(query, [name])
      : await db.query<EmpireRow>(query, [name]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.hydrate(result.rows[0]);
  }
  
  /**
   * Gets active empires (alive empires).
   * @param {number} limit - Maximum empires to return
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<Empire[]>} Active empires sorted by score
   */
  public async getActiveEmpires(
    limit: number = 50,
    client?: PoolClient
  ): Promise<Empire[]> {
    const query = `
      SELECT * FROM empires 
      WHERE is_alive = true
      ORDER BY score DESC, name
      LIMIT $1
    `;
    
    const result = client
      ? await client.query<EmpireRow>(query, [limit])
      : await db.query<EmpireRow>(query, [limit]);
    
    return result.rows.map(row => this.hydrate(row));
  }
  
  /**
   * Gets empires by faction.
   * @param {string} faction - Faction name
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<Empire[]>} Empires in the faction
   */
  public async findByFaction(
    faction: string,
    client?: PoolClient
  ): Promise<Empire[]> {
    const query = `
      SELECT * FROM empires 
      WHERE faction = $1 AND is_alive = true
      ORDER BY score DESC
    `;
    
    const result = client
      ? await client.query<EmpireRow>(query, [faction])
      : await db.query<EmpireRow>(query, [faction]);
    
    return result.rows.map(row => this.hydrate(row));
  }
  
  /**
   * Gets top empires by score.
   * @param {number} limit - Number of empires to return
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<Empire[]>} Top empires sorted by score
   */
  public async getLeaderboard(
    limit: number = 10,
    client?: PoolClient
  ): Promise<Empire[]> {
    const query = `
      SELECT * FROM empires 
      WHERE is_alive = true
      ORDER BY score DESC, name
      LIMIT $1
    `;
    
    const result = client
      ? await client.query<EmpireRow>(query, [limit])
      : await db.query<EmpireRow>(query, [limit]);
    
    return result.rows.map(row => this.hydrate(row));
  }
  
  /**
   * Gets empires in a specific home system (neighboring empires).
   * @param {string} systemId - System ID
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<Empire[]>} Empires in the system
   */
  public async findByHomeSystem(
    systemId: string,
    client?: PoolClient
  ): Promise<Empire[]> {
    const query = `
      SELECT * FROM empires 
      WHERE home_system_id = $1 AND is_alive = true
      ORDER BY score DESC
    `;
    
    const result = client
      ? await client.query<EmpireRow>(query, [systemId])
      : await db.query<EmpireRow>(query, [systemId]);
    
    return result.rows.map(row => this.hydrate(row));
  }
  
  /**
   * Gets empires that need action (have action points remaining).
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<Empire[]>} Empires with remaining action points
   */
  public async getEmpiresPendingActions(
    client?: PoolClient
  ): Promise<Empire[]> {
    const query = `
      SELECT * FROM empires 
      WHERE action_points > 0 AND is_alive = true
      ORDER BY action_points DESC, score DESC
    `;
    
    const result = client
      ? await client.query<EmpireRow>(query)
      : await db.query<EmpireRow>(query);
    
    return result.rows.map(row => this.hydrate(row));
  }
  
  /**
   * Updates empire action points.
   * @param {string} empireId - Empire ID
   * @param {number} actionPoints - New action points value
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<boolean>} True if updated
   */
  public async updateActionPoints(
    empireId: string,
    actionPoints: number,
    client?: PoolClient
  ): Promise<boolean> {
    const query = `
      UPDATE empires 
      SET action_points = $2, updated_at = NOW()
      WHERE id = $1
    `;
    
    const result = client
      ? await client.query(query, [empireId, actionPoints])
      : await db.query(query, [empireId, actionPoints]);
    
    return result.rowCount > 0;
  }
  
  /**
   * Updates empire credits and score.
   * @param {string} empireId - Empire ID
   * @param {number} credits - New credits amount
   * @param {number} score - New score
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<boolean>} True if updated
   */
  public async updateCreditsAndScore(
    empireId: string,
    credits: number,
    score: number,
    client?: PoolClient
  ): Promise<boolean> {
    const query = `
      UPDATE empires 
      SET credits = $2, score = $3, updated_at = NOW()
      WHERE id = $1
    `;
    
    const result = client
      ? await client.query(query, [empireId, credits, score])
      : await db.query(query, [empireId, credits, score]);
    
    return result.rowCount > 0;
  }
  
  /**
   * Marks an empire as dead (bankrupt or defeated).
   * @param {string} empireId - Empire ID
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<boolean>} True if marked as dead
   */
  public async markEmpireDead(
    empireId: string,
    client?: PoolClient
  ): Promise<boolean> {
    const query = `
      UPDATE empires 
      SET is_alive = false, updated_at = NOW()
      WHERE id = $1
    `;
    
    const result = client
      ? await client.query(query, [empireId])
      : await db.query(query, [empireId]);
    
    return result.rowCount > 0;
  }
  
  /**
   * Resets action points for all alive empires (turn processing).
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<number>} Number of empires updated
   */
  public async resetAllActionPoints(
    client?: PoolClient
  ): Promise<number> {
    const query = `
      UPDATE empires 
      SET action_points = max_action_points, 
          turn_number = turn_number + 1,
          updated_at = NOW()
      WHERE is_alive = true
    `;
    
    const result = client
      ? await client.query(query)
      : await db.query(query);
    
    return result.rowCount || 0;
  }
  
  /**
   * Gets empire technologies.
   * @param {string} empireId - Empire ID
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<Technology[]>} Empire's technologies
   */
  public async getTechnologies(
    empireId: string,
    client?: PoolClient
  ): Promise<Technology[]> {
    const query = `
      SELECT t.*, et.research_progress, et.is_researched
      FROM technologies t
      JOIN empire_technologies et ON t.id = et.technology_id
      WHERE et.empire_id = $1
      ORDER BY t.tier, t.name
    `;
    
    const result = client
      ? await client.query(query, [empireId])
      : await db.query(query, [empireId]);
    
    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      tier: row.tier,
      isResearched: row.is_researched,
      researchCost: row.research_cost,
      researchProgress: row.research_progress,
      prerequisites: row.prerequisites || [],
      effects: row.effects || {}
    }));
  }
  
  /**
   * Gets empire trade routes.
   * @param {string} empireId - Empire ID
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<TradeRoute[]>} Empire's trade routes
   */
  public async getTradeRoutes(
    empireId: string,
    client?: PoolClient
  ): Promise<TradeRoute[]> {
    const query = `
      SELECT * FROM trade_routes 
      WHERE empire_id = $1
      ORDER BY is_active DESC, profit_per_turn DESC
    `;
    
    const result = client
      ? await client.query(query, [empireId])
      : await db.query(query, [empireId]);
    
    return result.rows.map(row => ({
      id: row.id,
      fromPlanetId: row.from_planet_id,
      toPlanetId: row.to_planet_id,
      goodsType: row.goods_type,
      quantity: row.quantity,
      profitPerTurn: row.profit_per_turn,
      isActive: row.is_active
    }));
  }
  
  /**
   * Gets empire diplomatic relations.
   * @param {string} empireId - Empire ID
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<DiplomaticRelation[]>} Empire's diplomatic relations
   */
  public async getDiplomaticRelations(
    empireId: string,
    client?: PoolClient
  ): Promise<DiplomaticRelation[]> {
    const query = `
      SELECT dr.*, e.name as empire_name
      FROM diplomatic_relations dr
      JOIN empires e ON (
        CASE WHEN dr.empire1_id = $1 THEN dr.empire2_id 
             ELSE dr.empire1_id END
      ) = e.id
      WHERE dr.empire1_id = $1 OR dr.empire2_id = $1
      ORDER BY dr.last_interaction DESC
    `;
    
    const result = client
      ? await client.query(query, [empireId])
      : await db.query(query, [empireId]);
    
    return result.rows.map(row => ({
      empireId: row.empire1_id === empireId ? row.empire2_id : row.empire1_id,
      status: row.status,
      trustLevel: row.trust_level,
      tradeAgreements: row.trade_agreements || [],
      lastInteraction: new Date(row.last_interaction)
    }));
  }
  
  /**
   * Creates or updates a diplomatic relation.
   * @param {string} empireId1 - First empire ID
   * @param {string} empireId2 - Second empire ID
   * @param {string} status - Diplomatic status
   * @param {number} trustLevel - Trust level
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<boolean>} True if created/updated
   */
  public async setDiplomaticRelation(
    empireId1: string,
    empireId2: string,
    status: string,
    trustLevel: number = 0,
    client?: PoolClient
  ): Promise<boolean> {
    // Ensure consistent ordering of empire IDs
    const [firstId, secondId] = [empireId1, empireId2].sort();
    
    const query = `
      INSERT INTO diplomatic_relations (empire1_id, empire2_id, status, trust_level)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (empire1_id, empire2_id)
      DO UPDATE SET 
        status = $3,
        trust_level = $4,
        last_interaction = NOW()
      RETURNING *
    `;
    
    const result = client
      ? await client.query(query, [firstId, secondId, status, trustLevel])
      : await db.query(query, [firstId, secondId, status, trustLevel]);
    
    return result.rowCount > 0;
  }
  
  /**
   * Gets empires that are at war with the given empire.
   * @param {string} empireId - Empire ID
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<Empire[]>} Empires at war
   */
  public async getWarTargets(
    empireId: string,
    client?: PoolClient
  ): Promise<Empire[]> {
    const query = `
      SELECT e.* FROM empires e
      JOIN diplomatic_relations dr ON (
        (dr.empire1_id = $1 AND dr.empire2_id = e.id) OR
        (dr.empire2_id = $1 AND dr.empire1_id = e.id)
      )
      WHERE dr.status = 'war' AND e.is_alive = true
      ORDER BY e.score DESC
    `;
    
    const result = client
      ? await client.query<EmpireRow>(query, [empireId])
      : await db.query<EmpireRow>(query, [empireId]);
    
    return result.rows.map(row => this.hydrate(row));
  }
  
  /**
   * Gets empires allied with the given empire.
   * @param {string} empireId - Empire ID
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<Empire[]>} Allied empires
   */
  public async getAllies(
    empireId: string,
    client?: PoolClient
  ): Promise<Empire[]> {
    const query = `
      SELECT e.* FROM empires e
      JOIN diplomatic_relations dr ON (
        (dr.empire1_id = $1 AND dr.empire2_id = e.id) OR
        (dr.empire2_id = $1 AND dr.empire1_id = e.id)
      )
      WHERE dr.status = 'allied' AND e.is_alive = true
      ORDER BY e.score DESC
    `;
    
    const result = client
      ? await client.query<EmpireRow>(query, [empireId])
      : await db.query<EmpireRow>(query, [empireId]);
    
    return result.rows.map(row => this.hydrate(row));
  }
}
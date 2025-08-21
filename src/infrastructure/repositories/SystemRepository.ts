import { BaseRepository } from './BaseRepository';
import { System } from '../../core/entities/System';
import { PoolClient } from 'pg';
import { db } from '../database/connection';

/**
 * Represents 3D coordinates in space.
 */
export interface Coordinates {
  x: number;
  y: number;
  z: number;
}

/**
 * Represents a connection between two systems.
 */
export interface SystemConnection {
  id: string;
  fromSystemId: string;
  toSystemId: string;
  distance: number;
  travelTime: number;
  isDangerous: boolean;
}

/**
 * Database row structure for systems table.
 */
interface SystemRow {
  id: string;
  name: string;
  coordinates: Coordinates;
  description: string;
  danger_level: number;
  is_pvp_enabled: boolean;
  controlled_by: string | null;
  facilities: string[];
  market_prices: any;
  discovered_by: string[];
  created_at: Date;
  updated_at: Date;
}

/**
 * Repository for managing star system persistence and spatial queries.
 * Handles system connections, market data, and territory control.
 */
export class SystemRepository extends BaseRepository<System> {
  protected readonly tableName = 'systems';
  
  /**
   * Converts database row to System entity.
   * @param {SystemRow} row - Database row
   * @returns {System} Hydrated System instance
   */
  protected hydrate(row: SystemRow): System {
    const system = new System(
      row.id,
      row.name,
      row.coordinates
    );
    
    system.description = row.description;
    system.dangerLevel = row.danger_level;
    system.isPvpEnabled = row.is_pvp_enabled;
    system.controlledBy = row.controlled_by || undefined;
    system.facilities = row.facilities || [];
    system.marketPrices = row.market_prices || {};
    
    return system;
  }
  
  /**
   * Converts System entity to database columns.
   * @param {Partial<System>} entity - System entity
   * @returns {any} Database column values
   */
  protected dehydrate(entity: Partial<System>): any {
    const data: any = {};
    
    if (entity.id !== undefined) data.id = entity.id;
    if (entity.name !== undefined) data.name = entity.name;
    if (entity.coordinates !== undefined) data.coordinates = JSON.stringify(entity.coordinates);
    if (entity.description !== undefined) data.description = entity.description;
    if (entity.dangerLevel !== undefined) data.danger_level = entity.dangerLevel;
    if (entity.isPvpEnabled !== undefined) data.is_pvp_enabled = entity.isPvpEnabled;
    if (entity.controlledBy !== undefined) data.controlled_by = entity.controlledBy;
    if (entity.facilities !== undefined) data.facilities = entity.facilities;
    if (entity.marketPrices !== undefined) data.market_prices = JSON.stringify(entity.marketPrices);
    
    return data;
  }
  
  /**
   * Finds a system by name.
   * @param {string} name - System name
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<System | null>} System if found
   */
  public async findByName(
    name: string,
    client?: PoolClient
  ): Promise<System | null> {
    const query = `SELECT * FROM systems WHERE name = $1`;
    const result = client
      ? await client.query<SystemRow>(query, [name])
      : await db.query<SystemRow>(query, [name]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.hydrate(result.rows[0]);
  }
  
  /**
   * Gets all systems within a spherical radius of coordinates.
   * @param {Coordinates} center - Center point
   * @param {number} radius - Maximum distance
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<System[]>} Systems within radius
   */
  public async findWithinRadius(
    center: Coordinates,
    radius: number,
    client?: PoolClient
  ): Promise<System[]> {
    const query = `
      SELECT * FROM systems 
      WHERE sqrt(
        power((coordinates->>'x')::float - $1, 2) +
        power((coordinates->>'y')::float - $2, 2) +
        power((coordinates->>'z')::float - $3, 2)
      ) <= $4
      ORDER BY sqrt(
        power((coordinates->>'x')::float - $1, 2) +
        power((coordinates->>'y')::float - $2, 2) +
        power((coordinates->>'z')::float - $3, 2)
      )
    `;
    
    const result = client
      ? await client.query<SystemRow>(query, [center.x, center.y, center.z, radius])
      : await db.query<SystemRow>(query, [center.x, center.y, center.z, radius]);
    
    return result.rows.map(row => this.hydrate(row));
  }
  
  /**
   * Gets nearest systems to a point.
   * @param {Coordinates} point - Reference point
   * @param {number} limit - Number of systems to return
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<System[]>} Nearest systems sorted by distance
   */
  public async findNearest(
    point: Coordinates,
    limit: number = 10,
    client?: PoolClient
  ): Promise<System[]> {
    const query = `
      SELECT *,
        sqrt(
          power((coordinates->>'x')::float - $1, 2) +
          power((coordinates->>'y')::float - $2, 2) +
          power((coordinates->>'z')::float - $3, 2)
        ) as distance
      FROM systems 
      ORDER BY distance
      LIMIT $4
    `;
    
    const result = client
      ? await client.query<SystemRow>(query, [point.x, point.y, point.z, limit])
      : await db.query<SystemRow>(query, [point.x, point.y, point.z, limit]);
    
    return result.rows.map(row => this.hydrate(row));
  }
  
  /**
   * Gets all systems controlled by an empire.
   * @param {string} empireId - Empire ID
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<System[]>} Systems controlled by the empire
   */
  public async findByEmpire(
    empireId: string,
    client?: PoolClient
  ): Promise<System[]> {
    const query = `SELECT * FROM systems WHERE controlled_by = $1 ORDER BY name`;
    const result = client
      ? await client.query<SystemRow>(query, [empireId])
      : await db.query<SystemRow>(query, [empireId]);
    
    return result.rows.map(row => this.hydrate(row));
  }
  
  /**
   * Gets all connections for a system.
   * @param {string} systemId - System ID
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<SystemConnection[]>} Connected systems
   */
  public async getConnections(
    systemId: string,
    client?: PoolClient
  ): Promise<SystemConnection[]> {
    const query = `
      SELECT * FROM system_connections 
      WHERE from_system_id = $1 OR to_system_id = $1
      ORDER BY distance
    `;
    
    const result = client
      ? await client.query(query, [systemId])
      : await db.query(query, [systemId]);
    
    return result.rows.map(row => ({
      id: row.id,
      fromSystemId: row.from_system_id,
      toSystemId: row.to_system_id,
      distance: parseFloat(row.distance),
      travelTime: row.travel_time,
      isDangerous: row.is_dangerous
    }));
  }
  
  /**
   * Creates a bidirectional connection between two systems.
   * @param {string} systemId1 - First system ID
   * @param {string} systemId2 - Second system ID
   * @param {number} distance - Distance between systems
   * @param {number} travelTime - Travel time in seconds
   * @param {boolean} isDangerous - Whether route is dangerous
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<SystemConnection>} Created connection
   */
  public async createConnection(
    systemId1: string,
    systemId2: string,
    distance: number,
    travelTime: number,
    isDangerous: boolean = false,
    client?: PoolClient
  ): Promise<SystemConnection> {
    const query = `
      INSERT INTO system_connections (from_system_id, to_system_id, distance, travel_time, is_dangerous)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (from_system_id, to_system_id) 
      DO UPDATE SET distance = $3, travel_time = $4, is_dangerous = $5
      RETURNING *
    `;
    
    const result = client
      ? await client.query(query, [systemId1, systemId2, distance, travelTime, isDangerous])
      : await db.query(query, [systemId1, systemId2, distance, travelTime, isDangerous]);
    
    const row = result.rows[0];
    return {
      id: row.id,
      fromSystemId: row.from_system_id,
      toSystemId: row.to_system_id,
      distance: parseFloat(row.distance),
      travelTime: row.travel_time,
      isDangerous: row.is_dangerous
    };
  }
  
  /**
   * Updates market prices for a system.
   * @param {string} systemId - System ID
   * @param {Record<string, number>} prices - Item prices
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<boolean>} True if updated
   */
  public async updateMarketPrices(
    systemId: string,
    prices: Record<string, number>,
    client?: PoolClient
  ): Promise<boolean> {
    const query = `
      UPDATE systems 
      SET market_prices = $2::jsonb, updated_at = NOW()
      WHERE id = $1
    `;
    
    const result = client
      ? await client.query(query, [systemId, JSON.stringify(prices)])
      : await db.query(query, [systemId, JSON.stringify(prices)]);
    
    return result.rowCount > 0;
  }
  
  /**
   * Transfers control of a system to an empire.
   * @param {string} systemId - System ID
   * @param {string | null} empireId - New controlling empire (null for neutral)
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<boolean>} True if control transferred
   */
  public async transferControl(
    systemId: string,
    empireId: string | null,
    client?: PoolClient
  ): Promise<boolean> {
    const query = `
      UPDATE systems 
      SET controlled_by = $2, updated_at = NOW()
      WHERE id = $1
    `;
    
    const result = client
      ? await client.query(query, [systemId, empireId])
      : await db.query(query, [systemId, empireId]);
    
    return result.rowCount > 0;
  }
  
  /**
   * Records that a player discovered a system.
   * @param {string} systemId - System ID
   * @param {string} playerId - Player ID
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<boolean>} True if recorded
   */
  public async recordDiscovery(
    systemId: string,
    playerId: string,
    client?: PoolClient
  ): Promise<boolean> {
    const query = `
      UPDATE systems 
      SET discovered_by = array_append(discovered_by, $2)
      WHERE id = $1 AND NOT ($2 = ANY(discovered_by))
    `;
    
    const result = client
      ? await client.query(query, [systemId, playerId])
      : await db.query(query, [systemId, playerId]);
    
    return result.rowCount > 0;
  }
  
  /**
   * Gets systems with specific facilities.
   * @param {string[]} facilities - Required facilities
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<System[]>} Systems with all specified facilities
   */
  public async findByFacilities(
    facilities: string[],
    client?: PoolClient
  ): Promise<System[]> {
    const query = `
      SELECT * FROM systems 
      WHERE facilities @> $1::text[]
      ORDER BY name
    `;
    
    const result = client
      ? await client.query<SystemRow>(query, [facilities])
      : await db.query<SystemRow>(query, [facilities]);
    
    return result.rows.map(row => this.hydrate(row));
  }
  
  /**
   * Gets safe systems (low danger, no PvP).
   * @param {number} maxDanger - Maximum danger level
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<System[]>} Safe systems
   */
  public async findSafeSystems(
    maxDanger: number = 3,
    client?: PoolClient
  ): Promise<System[]> {
    const query = `
      SELECT * FROM systems 
      WHERE danger_level <= $1 AND is_pvp_enabled = false
      ORDER BY danger_level, name
    `;
    
    const result = client
      ? await client.query<SystemRow>(query, [maxDanger])
      : await db.query<SystemRow>(query, [maxDanger]);
    
    return result.rows.map(row => this.hydrate(row));
  }
}
import { BaseRepository, QueryOptions } from './BaseRepository';
import { ResourceType } from '../../shared/types';
import { PoolClient } from 'pg';
import { db } from '../database/connection';

/**
 * Represents a trade route between two planets.
 */
export interface TradeRoute {
  id: string;
  empireId: string;
  fromPlanetId: string;
  toPlanetId: string;
  goodsType: ResourceType;
  quantity: number;
  profitPerTurn: number;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Database row structure for trade_routes table.
 */
interface TradeRouteRow {
  id: string;
  empire_id: string;
  from_planet_id: string;
  to_planet_id: string;
  goods_type: string;
  quantity: number;
  profit_per_turn: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * Repository for managing trade route persistence.
 * Handles trade route creation, profit calculations, and route management.
 */
export class TradeRouteRepository extends BaseRepository<TradeRoute> {
  protected readonly tableName = 'trade_routes';

  /**
   * Converts database row to TradeRoute entity.
   * @param {TradeRouteRow} row - Database row
   * @returns {TradeRoute} Hydrated TradeRoute instance
   */
  protected hydrate(row: TradeRouteRow): TradeRoute {
    return {
      id: row.id,
      empireId: row.empire_id,
      fromPlanetId: row.from_planet_id,
      toPlanetId: row.to_planet_id,
      goodsType: row.goods_type as ResourceType,
      quantity: row.quantity,
      profitPerTurn: row.profit_per_turn,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  /**
   * Converts TradeRoute entity to database columns.
   * @param {Partial<TradeRoute>} entity - TradeRoute entity
   * @returns {any} Database column values
   */
  protected dehydrate(entity: Partial<TradeRoute>): any {
    const data: any = {};

    if (entity.id !== undefined) data.id = entity.id;
    if (entity.empireId !== undefined) data.empire_id = entity.empireId;
    if (entity.fromPlanetId !== undefined) data.from_planet_id = entity.fromPlanetId;
    if (entity.toPlanetId !== undefined) data.to_planet_id = entity.toPlanetId;
    if (entity.goodsType !== undefined) data.goods_type = entity.goodsType;
    if (entity.quantity !== undefined) data.quantity = entity.quantity;
    if (entity.profitPerTurn !== undefined) data.profit_per_turn = entity.profitPerTurn;
    if (entity.isActive !== undefined) data.is_active = entity.isActive;

    return data;
  }

  /**
   * Finds all trade routes for an empire.
   * @param {string} empireId - Empire ID
   * @param {QueryOptions} options - Query options
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<TradeRoute[]>} Array of trade routes
   */
  public async findByEmpireId(
    empireId: string,
    options: QueryOptions = {},
    client?: PoolClient
  ): Promise<TradeRoute[]> {
    return this.findAll({ empireId } as any, options, client);
  }

  /**
   * Finds all active trade routes for an empire.
   * @param {string} empireId - Empire ID
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<TradeRoute[]>} Array of active trade routes
   */
  public async findActiveByEmpireId(
    empireId: string,
    client?: PoolClient
  ): Promise<TradeRoute[]> {
    const query = `
      SELECT * FROM trade_routes
      WHERE empire_id = $1 AND is_active = true
      ORDER BY profit_per_turn DESC
    `;

    const result = client
      ? await client.query<TradeRouteRow>(query, [empireId])
      : await db.query<TradeRouteRow>(query, [empireId]);

    return result.rows.map(row => this.hydrate(row));
  }

  /**
   * Finds trade routes from a specific planet.
   * @param {string} planetId - Planet ID
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<TradeRoute[]>} Array of trade routes from the planet
   */
  public async findByFromPlanet(
    planetId: string,
    client?: PoolClient
  ): Promise<TradeRoute[]> {
    return this.findAll({ fromPlanetId: planetId } as any, {}, client);
  }

  /**
   * Finds trade routes to a specific planet.
   * @param {string} planetId - Planet ID
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<TradeRoute[]>} Array of trade routes to the planet
   */
  public async findByToPlanet(
    planetId: string,
    client?: PoolClient
  ): Promise<TradeRoute[]> {
    return this.findAll({ toPlanetId: planetId } as any, {}, client);
  }

  /**
   * Finds trade routes between two planets.
   * @param {string} fromPlanetId - Source planet ID
   * @param {string} toPlanetId - Destination planet ID
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<TradeRoute[]>} Array of trade routes between planets
   */
  public async findBetweenPlanets(
    fromPlanetId: string,
    toPlanetId: string,
    client?: PoolClient
  ): Promise<TradeRoute[]> {
    const query = `
      SELECT * FROM trade_routes
      WHERE from_planet_id = $1 AND to_planet_id = $2
      ORDER BY goods_type
    `;

    const result = client
      ? await client.query<TradeRouteRow>(query, [fromPlanetId, toPlanetId])
      : await db.query<TradeRouteRow>(query, [fromPlanetId, toPlanetId]);

    return result.rows.map(row => this.hydrate(row));
  }

  /**
   * Creates or updates a trade route.
   * @param {TradeRoute} route - Trade route to create/update
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<TradeRoute>} Created or updated trade route
   */
  public async upsertRoute(
    route: Omit<TradeRoute, 'id' | 'createdAt' | 'updatedAt'>,
    client?: PoolClient
  ): Promise<TradeRoute> {
    const query = `
      INSERT INTO trade_routes (
        empire_id, from_planet_id, to_planet_id,
        goods_type, quantity, profit_per_turn, is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (empire_id, from_planet_id, to_planet_id, goods_type)
      DO UPDATE SET
        quantity = $5,
        profit_per_turn = $6,
        is_active = $7,
        updated_at = NOW()
      RETURNING *
    `;

    const params = [
      route.empireId,
      route.fromPlanetId,
      route.toPlanetId,
      route.goodsType,
      route.quantity,
      route.profitPerTurn,
      route.isActive
    ];

    const result = client
      ? await client.query<TradeRouteRow>(query, params)
      : await db.query<TradeRouteRow>(query, params);

    return this.hydrate(result.rows[0]);
  }

  /**
   * Activates a trade route.
   * @param {string} routeId - Trade route ID
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<boolean>} True if activated successfully
   */
  public async activateRoute(
    routeId: string,
    client?: PoolClient
  ): Promise<boolean> {
    const query = `
      UPDATE trade_routes
      SET is_active = true,
          updated_at = NOW()
      WHERE id = $1
    `;

    const result = client
      ? await client.query(query, [routeId])
      : await db.query(query, [routeId]);

    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Deactivates a trade route.
   * @param {string} routeId - Trade route ID
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<boolean>} True if deactivated successfully
   */
  public async deactivateRoute(
    routeId: string,
    client?: PoolClient
  ): Promise<boolean> {
    const query = `
      UPDATE trade_routes
      SET is_active = false,
          updated_at = NOW()
      WHERE id = $1
    `;

    const result = client
      ? await client.query(query, [routeId])
      : await db.query(query, [routeId]);

    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Updates trade route profit.
   * @param {string} routeId - Trade route ID
   * @param {number} profitPerTurn - New profit value
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<boolean>} True if updated successfully
   */
  public async updateProfit(
    routeId: string,
    profitPerTurn: number,
    client?: PoolClient
  ): Promise<boolean> {
    const query = `
      UPDATE trade_routes
      SET profit_per_turn = $2,
          updated_at = NOW()
      WHERE id = $1
    `;

    const result = client
      ? await client.query(query, [routeId, profitPerTurn])
      : await db.query(query, [routeId, profitPerTurn]);

    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Gets total trade income for an empire.
   * @param {string} empireId - Empire ID
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<number>} Total profit per turn from all active routes
   */
  public async getTotalIncome(
    empireId: string,
    client?: PoolClient
  ): Promise<number> {
    const query = `
      SELECT SUM(profit_per_turn) as total
      FROM trade_routes
      WHERE empire_id = $1 AND is_active = true
    `;

    const result = client
      ? await client.query(query, [empireId])
      : await db.query(query, [empireId]);

    return parseInt(result.rows[0]?.total || '0');
  }

  /**
   * Gets trade routes by goods type.
   * @param {ResourceType} goodsType - Type of goods
   * @param {QueryOptions} options - Query options
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<TradeRoute[]>} Array of trade routes for the goods type
   */
  public async findByGoodsType(
    goodsType: ResourceType,
    options: QueryOptions = {},
    client?: PoolClient
  ): Promise<TradeRoute[]> {
    return this.findAll({ goodsType } as any, options, client);
  }

  /**
   * Gets the most profitable trade routes.
   * @param {number} limit - Number of routes to return
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<TradeRoute[]>} Array of most profitable routes
   */
  public async getTopProfitableRoutes(
    limit: number = 10,
    client?: PoolClient
  ): Promise<TradeRoute[]> {
    const query = `
      SELECT * FROM trade_routes
      WHERE is_active = true
      ORDER BY profit_per_turn DESC
      LIMIT $1
    `;

    const result = client
      ? await client.query<TradeRouteRow>(query, [limit])
      : await db.query<TradeRouteRow>(query, [limit]);

    return result.rows.map(row => this.hydrate(row));
  }

  /**
   * Deactivates all routes involving a specific planet.
   * @param {string} planetId - Planet ID
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<number>} Number of routes deactivated
   */
  public async deactivateRoutesForPlanet(
    planetId: string,
    client?: PoolClient
  ): Promise<number> {
    const query = `
      UPDATE trade_routes
      SET is_active = false,
          updated_at = NOW()
      WHERE (from_planet_id = $1 OR to_planet_id = $1)
        AND is_active = true
    `;

    const result = client
      ? await client.query(query, [planetId])
      : await db.query(query, [planetId]);

    return result.rowCount ?? 0;
  }
}
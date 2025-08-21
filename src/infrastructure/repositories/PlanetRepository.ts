import { BaseRepository, QueryOptions } from './BaseRepository';
import { Planet, Building, PlanetResources } from '../../core/entities/Planet';
import { PoolClient } from 'pg';
import { db } from '../database/connection';

/**
 * Database row structure for planets table.
 */
interface PlanetRow {
  id: string;
  name: string;
  system_id: string;
  owner_id: string | null;
  coordinates: { x: number; y: number; z: number };
  specialization: string;
  population: string; // BIGINT comes as string
  max_population: string; // BIGINT comes as string
  resources: PlanetResources;
  production_rates: PlanetResources;
  defense_rating: number;
  development_level: number;
  is_colonized: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * Database row structure for buildings table.
 */
interface BuildingRow {
  id: string;
  planet_id: string;
  type: string;
  level: number;
  is_operational: boolean;
  maintenance_cost: number;
  production_bonus: string; // DECIMAL comes as string
  created_at: Date;
}

/**
 * Repository for managing planet and building persistence.
 * Handles colonization, resource production, and infrastructure development.
 */
export class PlanetRepository extends BaseRepository<Planet> {
  protected readonly tableName = 'planets';

  /**
   * Converts database row to Planet entity.
   * @param {PlanetRow} row - Database row
   * @returns {Planet} Hydrated Planet instance
   */
  protected hydrate(row: PlanetRow): Planet {
    const planet = new Planet(
      row.id,
      row.name,
      row.system_id,
      row.coordinates,
      row.specialization as any
    );

    planet.ownerId = row.owner_id || undefined;
    planet.population = parseInt(row.population);
    planet.maxPopulation = parseInt(row.max_population);
    planet.resources = row.resources;
    planet.productionRates = row.production_rates;
    planet.defenseRating = row.defense_rating;
    planet.developmentLevel = row.development_level;
    planet.isColonized = row.is_colonized;

    return planet;
  }

  /**
   * Converts Planet entity to database columns.
   * @param {Partial<Planet>} entity - Planet entity
   * @returns {any} Database column values
   */
  protected dehydrate(entity: Partial<Planet>): any {
    const data: any = {};

    if (entity.id !== undefined) data.id = entity.id;
    if (entity.name !== undefined) data.name = entity.name;
    if (entity.systemId !== undefined) data.system_id = entity.systemId;
    if (entity.ownerId !== undefined) data.owner_id = entity.ownerId;
    if (entity.coordinates !== undefined) data.coordinates = JSON.stringify(entity.coordinates);
    if (entity.specialization !== undefined) data.specialization = entity.specialization;
    if (entity.population !== undefined) data.population = entity.population;
    if (entity.maxPopulation !== undefined) data.max_population = entity.maxPopulation;
    if (entity.resources !== undefined) data.resources = JSON.stringify(entity.resources);
    if (entity.productionRates !== undefined) data.production_rates = JSON.stringify(entity.productionRates);
    if (entity.defenseRating !== undefined) data.defense_rating = entity.defenseRating;
    if (entity.developmentLevel !== undefined) data.development_level = entity.developmentLevel;
    if (entity.isColonized !== undefined) data.is_colonized = entity.isColonized;

    return data;
  }

  /**
   * Finds a planet by ID with its buildings loaded.
   * @param {string} id - Planet ID
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<Planet | null>} Planet with buildings or null
   */
  public async findByIdWithBuildings(id: string, client?: PoolClient): Promise<Planet | null> {
    const planet = await this.findById(id, client);
    if (!planet) return null;

    const buildings = await this.getBuildingsByPlanetId(id, client);
    planet.buildings = buildings;

    return planet;
  }

  /**
   * Gets all buildings on a planet.
   * @param {string} planetId - Planet ID
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<Building[]>} Array of buildings on the planet
   */
  public async getBuildingsByPlanetId(planetId: string, client?: PoolClient): Promise<Building[]> {
    const query = `
      SELECT * FROM buildings 
      WHERE planet_id = $1 
      ORDER BY type, level DESC
    `;

    const result = client
      ? await client.query<BuildingRow>(query, [planetId])
      : await db.query<BuildingRow>(query, [planetId]);

    return result.rows.map(row => this.hydrateBuilding(row));
  }

  /**
   * Converts database row to Building entity.
   * @param {BuildingRow} row - Database row
   * @returns {Building} Hydrated Building instance
   */
  private hydrateBuilding(row: BuildingRow): Building {
    return {
      id: row.id,
      type: row.type as any,
      level: row.level,
      isOperational: row.is_operational,
      maintenanceCost: row.maintenance_cost,
      productionBonus: parseFloat(row.production_bonus)
    };
  }

  /**
   * Creates a new building on a planet.
   * @param {string} planetId - Planet to add building to
   * @param {Building} building - Building to create
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<Building>} Created building
   */
  public async createBuilding(
    planetId: string,
    building: Partial<Building>,
    client?: PoolClient
  ): Promise<Building> {
    const query = `
      INSERT INTO buildings (
        planet_id, type, level, is_operational,
        maintenance_cost, production_bonus
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const params = [
      planetId,
      building.type,
      building.level || 1,
      building.isOperational !== false,
      building.maintenanceCost || 100,
      building.productionBonus || 1.0
    ];

    const result = client
      ? await client.query<BuildingRow>(query, params)
      : await db.query<BuildingRow>(query, params);

    return this.hydrateBuilding(result.rows[0]);
  }

  /**
   * Upgrades a building to the next level.
   * @param {string} buildingId - Building ID to upgrade
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<boolean>} True if upgraded successfully
   */
  public async upgradeBuilding(buildingId: string, client?: PoolClient): Promise<boolean> {
    const query = `
      UPDATE buildings 
      SET level = level + 1,
          production_bonus = production_bonus * 1.2,
          maintenance_cost = maintenance_cost * 1.1
      WHERE id = $1
    `;

    const result = client
      ? await client.query(query, [buildingId])
      : await db.query(query, [buildingId]);

    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Finds all planets in a specific system.
   * @param {string} systemId - System ID
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<Planet[]>} Array of planets in the system
   */
  public async findBySystemId(
    systemId: string,
    client?: PoolClient
  ): Promise<Planet[]> {
    return this.findAll({ systemId } as any, { orderBy: 'name' }, client);
  }

  /**
   * Finds all planets owned by an empire.
   * @param {string} empireId - Empire ID
   * @param {QueryOptions} options - Query options
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<Planet[]>} Array of planets owned by the empire
   */
  public async findByEmpireId(
    empireId: string,
    options: QueryOptions = {},
    client?: PoolClient
  ): Promise<Planet[]> {
    return this.findAll({ ownerId: empireId } as any, options, client);
  }

  /**
   * Finds uncolonized planets.
   * @param {QueryOptions} options - Query options
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<Planet[]>} Array of uncolonized planets
   */
  public async findUncolonized(
    options: QueryOptions = {},
    client?: PoolClient
  ): Promise<Planet[]> {
    return this.findAll({ isColonized: false } as any, options, client);
  }

  /**
   * Finds planets by specialization.
   * @param {string} specialization - Planet specialization type
   * @param {QueryOptions} options - Query options
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<Planet[]>} Array of planets with given specialization
   */
  public async findBySpecialization(
    specialization: string,
    options: QueryOptions = {},
    client?: PoolClient
  ): Promise<Planet[]> {
    return this.findAll({ specialization } as any, options, client);
  }

  /**
   * Colonizes an unowned planet.
   * @param {string} planetId - Planet ID
   * @param {string} empireId - Empire ID claiming the planet
   * @param {number} initialPopulation - Starting population
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<boolean>} True if colonized successfully
   */
  public async colonize(
    planetId: string,
    empireId: string,
    initialPopulation: number,
    client?: PoolClient
  ): Promise<boolean> {
    const query = `
      UPDATE planets 
      SET owner_id = $2,
          population = $3,
          is_colonized = true,
          development_level = 1,
          defense_rating = 10,
          updated_at = NOW()
      WHERE id = $1 AND is_colonized = false
    `;

    const result = client
      ? await client.query(query, [planetId, empireId, initialPopulation])
      : await db.query(query, [planetId, empireId, initialPopulation]);

    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Updates planet resources after production or consumption.
   * @param {string} planetId - Planet ID
   * @param {PlanetResources} resources - New resource values
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<boolean>} True if updated successfully
   */
  public async updateResources(
    planetId: string,
    resources: PlanetResources,
    client?: PoolClient
  ): Promise<boolean> {
    const query = `
      UPDATE planets 
      SET resources = $2,
          updated_at = NOW()
      WHERE id = $1
    `;

    const result = client
      ? await client.query(query, [planetId, JSON.stringify(resources)])
      : await db.query(query, [planetId, JSON.stringify(resources)]);

    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Updates planet production rates.
   * @param {string} planetId - Planet ID
   * @param {PlanetResources} productionRates - New production rates
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<boolean>} True if updated successfully
   */
  public async updateProductionRates(
    planetId: string,
    productionRates: PlanetResources,
    client?: PoolClient
  ): Promise<boolean> {
    const query = `
      UPDATE planets 
      SET production_rates = $2,
          updated_at = NOW()
      WHERE id = $1
    `;

    const result = client
      ? await client.query(query, [planetId, JSON.stringify(productionRates)])
      : await db.query(query, [planetId, JSON.stringify(productionRates)]);

    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Updates planet population.
   * @param {string} planetId - Planet ID
   * @param {number} population - New population value
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<boolean>} True if updated successfully
   */
  public async updatePopulation(
    planetId: string,
    population: number,
    client?: PoolClient
  ): Promise<boolean> {
    const query = `
      UPDATE planets 
      SET population = LEAST(max_population, GREATEST(0, $2)),
          updated_at = NOW()
      WHERE id = $1
    `;

    const result = client
      ? await client.query(query, [planetId, population])
      : await db.query(query, [planetId, population]);

    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Gets total maintenance cost for all buildings on empire's planets.
   * @param {string} empireId - Empire ID
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<number>} Total maintenance cost per turn
   */
  public async getTotalMaintenanceCost(
    empireId: string,
    client?: PoolClient
  ): Promise<number> {
    const query = `
      SELECT SUM(b.maintenance_cost) as total
      FROM buildings b
      JOIN planets p ON b.planet_id = p.id
      WHERE p.owner_id = $1 AND b.is_operational = true
    `;

    const result = client
      ? await client.query(query, [empireId])
      : await db.query(query, [empireId]);

    return parseInt(result.rows[0]?.total || '0');
  }

  /**
   * Gets total resource production for an empire.
   * @param {string} empireId - Empire ID
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<PlanetResources>} Combined production rates
   */
  public async getTotalProduction(
    empireId: string,
    client?: PoolClient
  ): Promise<PlanetResources> {
    const query = `
      SELECT 
        SUM((production_rates->>'ore')::int) as ore,
        SUM((production_rates->>'crystals')::int) as crystals,
        SUM((production_rates->>'energy')::int) as energy,
        SUM((production_rates->>'food')::int) as food
      FROM planets
      WHERE owner_id = $1 AND is_colonized = true
    `;

    const result = client
      ? await client.query(query, [empireId])
      : await db.query(query, [empireId]);

    const row = result.rows[0];
    return {
      ore: parseInt(row?.ore || '0'),
      crystals: parseInt(row?.crystals || '0'),
      energy: parseInt(row?.energy || '0'),
      food: parseInt(row?.food || '0')
    };
  }
}
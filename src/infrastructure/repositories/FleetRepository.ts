import { BaseRepository, QueryOptions } from './BaseRepository';
import { Fleet, Ship } from '../../core/entities/Fleet';
import { PoolClient } from 'pg';
import { db } from '../database/connection';

/**
 * Database row structure for fleets table.
 */
interface FleetRow {
  id: string;
  name: string;
  owner_id: string;
  current_system_id: string;
  coordinates: { x: number; y: number; z: number };
  is_in_combat: boolean;
  is_moving: boolean;
  destination_system_id: string | null;
  arrival_time: Date | null;
  morale: number;
  experience: number;
  created_at: Date;
  updated_at: Date;
}

/**
 * Database row structure for ships table.
 */
interface ShipRow {
  id: string;
  fleet_id: string;
  class: string;
  name: string;
  health: number;
  max_health: number;
  attack_power: number;
  defense: number;
  speed: number;
  cargo_capacity: number;
  current_cargo: number;
  fuel_capacity: number;
  current_fuel: number;
  crew_required: number;
  maintenance_cost: number;
  created_at: Date;
}

/**
 * Repository for managing fleet and ship persistence.
 * Handles fleet operations, ship assignments, and combat state management.
 */
export class FleetRepository extends BaseRepository<Fleet> {
  protected readonly tableName = 'fleets';

  /**
   * Converts database row to Fleet entity.
   * @param {FleetRow} row - Database row
   * @returns {Fleet} Hydrated Fleet instance
   */
  protected hydrate(row: FleetRow): Fleet {
    const fleet = new Fleet(
      row.id,
      row.name,
      row.owner_id,
      row.current_system_id,
      row.coordinates
    );

    fleet.isInCombat = row.is_in_combat;
    fleet.isMoving = row.is_moving;
    fleet.destinationSystemId = row.destination_system_id || undefined;
    fleet.arrivalTime = row.arrival_time || undefined;
    fleet.morale = row.morale;
    fleet.experience = row.experience;

    return fleet;
  }

  /**
   * Converts Fleet entity to database columns.
   * @param {Partial<Fleet>} entity - Fleet entity
   * @returns {any} Database column values
   */
  protected dehydrate(entity: Partial<Fleet>): any {
    const data: any = {};

    if (entity.id !== undefined) data.id = entity.id;
    if (entity.name !== undefined) data.name = entity.name;
    if (entity.ownerId !== undefined) data.owner_id = entity.ownerId;
    if (entity.currentSystemId !== undefined) data.current_system_id = entity.currentSystemId;
    if (entity.coordinates !== undefined) data.coordinates = JSON.stringify(entity.coordinates);
    if (entity.isInCombat !== undefined) data.is_in_combat = entity.isInCombat;
    if (entity.isMoving !== undefined) data.is_moving = entity.isMoving;
    if (entity.destinationSystemId !== undefined) data.destination_system_id = entity.destinationSystemId;
    if (entity.arrivalTime !== undefined) data.arrival_time = entity.arrivalTime;
    if (entity.morale !== undefined) data.morale = entity.morale;
    if (entity.experience !== undefined) data.experience = entity.experience;

    return data;
  }

  /**
   * Finds a fleet by ID with its ships loaded.
   * @param {string} id - Fleet ID
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<Fleet | null>} Fleet with ships or null
   */
  public async findByIdWithShips(id: string, client?: PoolClient): Promise<Fleet | null> {
    const fleet = await this.findById(id, client);
    if (!fleet) return null;

    const ships = await this.getShipsByFleetId(id, client);
    fleet.ships = ships;

    return fleet;
  }

  /**
   * Gets all ships in a fleet.
   * @param {string} fleetId - Fleet ID
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<Ship[]>} Array of ships in the fleet
   */
  public async getShipsByFleetId(fleetId: string, client?: PoolClient): Promise<Ship[]> {
    const query = `
      SELECT * FROM ships 
      WHERE fleet_id = $1 
      ORDER BY class DESC, name
    `;

    const result = client
      ? await client.query<ShipRow>(query, [fleetId])
      : await db.query<ShipRow>(query, [fleetId]);

    return result.rows.map(row => this.hydrateShip(row));
  }

  /**
   * Converts database row to Ship entity.
   * @param {ShipRow} row - Database row
   * @returns {Ship} Hydrated Ship instance
   */
  private hydrateShip(row: ShipRow): Ship {
    return {
      id: row.id,
      class: row.class as any,
      name: row.name,
      health: row.health,
      maxHealth: row.max_health,
      attackPower: row.attack_power,
      defense: row.defense,
      speed: row.speed,
      cargoCapacity: row.cargo_capacity,
      currentCargo: row.current_cargo,
      fuelCapacity: row.fuel_capacity,
      currentFuel: row.current_fuel,
      crewRequired: row.crew_required,
      maintenanceCost: row.maintenance_cost
    };
  }

  /**
   * Creates a new ship and assigns it to a fleet.
   * @param {string} fleetId - Fleet to add ship to
   * @param {Ship} ship - Ship to create
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<Ship>} Created ship
   */
  public async createShip(
    fleetId: string,
    ship: Partial<Ship>,
    client?: PoolClient
  ): Promise<Ship> {
    const query = `
      INSERT INTO ships (
        fleet_id, class, name, health, max_health, attack_power,
        defense, speed, cargo_capacity, current_cargo,
        fuel_capacity, current_fuel, crew_required, maintenance_cost
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;

    const params = [
      fleetId,
      ship.class,
      ship.name,
      ship.health || ship.maxHealth,
      ship.maxHealth,
      ship.attackPower,
      ship.defense,
      ship.speed,
      ship.cargoCapacity,
      ship.currentCargo || 0,
      ship.fuelCapacity,
      ship.currentFuel || ship.fuelCapacity,
      ship.crewRequired,
      ship.maintenanceCost
    ];

    const result = client
      ? await client.query<ShipRow>(query, params)
      : await db.query<ShipRow>(query, params);

    return this.hydrateShip(result.rows[0]);
  }

  /**
   * Removes a ship from a fleet.
   * @param {string} shipId - Ship ID to remove
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<boolean>} True if ship was deleted
   */
  public async deleteShip(shipId: string, client?: PoolClient): Promise<boolean> {
    const query = 'DELETE FROM ships WHERE id = $1';

    const result = client
      ? await client.query(query, [shipId])
      : await db.query(query, [shipId]);

    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Finds all fleets owned by an empire.
   * @param {string} empireId - Empire ID
   * @param {QueryOptions} options - Query options
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<Fleet[]>} Array of fleets
   */
  public async findByEmpireId(
    empireId: string,
    options: QueryOptions = {},
    client?: PoolClient
  ): Promise<Fleet[]> {
    return this.findAll({ ownerId: empireId } as any, options, client);
  }

  /**
   * Finds all fleets in a specific system.
   * @param {string} systemId - System ID
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<Fleet[]>} Array of fleets in the system
   */
  public async findBySystemId(
    systemId: string,
    client?: PoolClient
  ): Promise<Fleet[]> {
    return this.findAll({ currentSystemId: systemId } as any, {}, client);
  }

  /**
   * Finds all fleets currently in combat.
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<Fleet[]>} Array of fleets in combat
   */
  public async findInCombat(client?: PoolClient): Promise<Fleet[]> {
    return this.findAll({ isInCombat: true } as any, {}, client);
  }

  /**
   * Finds all fleets currently moving.
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<Fleet[]>} Array of moving fleets
   */
  public async findMoving(client?: PoolClient): Promise<Fleet[]> {
    const query = `
      SELECT * FROM fleets 
      WHERE is_moving = true 
      ORDER BY arrival_time ASC
    `;

    const result = client
      ? await client.query<FleetRow>(query)
      : await db.query<FleetRow>(query);

    return result.rows.map(row => this.hydrate(row));
  }

  /**
   * Gets fleets that have arrived at their destination.
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<Fleet[]>} Array of arrived fleets
   */
  public async findArrivedFleets(client?: PoolClient): Promise<Fleet[]> {
    const query = `
      SELECT * FROM fleets 
      WHERE is_moving = true 
        AND arrival_time <= NOW()
      ORDER BY arrival_time ASC
    `;

    const result = client
      ? await client.query<FleetRow>(query)
      : await db.query<FleetRow>(query);

    return result.rows.map(row => this.hydrate(row));
  }

  /**
   * Updates fleet movement status.
   * @param {string} fleetId - Fleet ID
   * @param {string} destinationSystemId - Destination system ID
   * @param {Date} arrivalTime - Arrival time
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<boolean>} True if updated successfully
   */
  public async startMovement(
    fleetId: string,
    destinationSystemId: string,
    arrivalTime: Date,
    client?: PoolClient
  ): Promise<boolean> {
    const query = `
      UPDATE fleets 
      SET is_moving = true,
          destination_system_id = $2,
          arrival_time = $3,
          updated_at = NOW()
      WHERE id = $1 AND is_in_combat = false
    `;

    const result = client
      ? await client.query(query, [fleetId, destinationSystemId, arrivalTime])
      : await db.query(query, [fleetId, destinationSystemId, arrivalTime]);

    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Completes fleet movement to destination.
   * @param {string} fleetId - Fleet ID
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<boolean>} True if movement completed
   */
  public async completeMovement(
    fleetId: string,
    client?: PoolClient
  ): Promise<boolean> {
    const query = `
      UPDATE fleets 
      SET is_moving = false,
          current_system_id = destination_system_id,
          destination_system_id = NULL,
          arrival_time = NULL,
          updated_at = NOW()
      WHERE id = $1 AND is_moving = true
    `;

    const result = client
      ? await client.query(query, [fleetId])
      : await db.query(query, [fleetId]);

    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Updates fleet combat status.
   * @param {string} fleetId - Fleet ID
   * @param {boolean} inCombat - Combat status
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<boolean>} True if updated successfully
   */
  public async setCombatStatus(
    fleetId: string,
    inCombat: boolean,
    client?: PoolClient
  ): Promise<boolean> {
    const query = `
      UPDATE fleets 
      SET is_in_combat = $2,
          updated_at = NOW()
      WHERE id = $1
    `;

    const result = client
      ? await client.query(query, [fleetId, inCombat])
      : await db.query(query, [fleetId, inCombat]);

    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Updates fleet morale and experience after combat.
   * @param {string} fleetId - Fleet ID
   * @param {number} morale - New morale value
   * @param {number} experienceGain - Experience points to add
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<boolean>} True if updated successfully
   */
  public async updateCombatStats(
    fleetId: string,
    morale: number,
    experienceGain: number,
    client?: PoolClient
  ): Promise<boolean> {
    const query = `
      UPDATE fleets 
      SET morale = LEAST(100, GREATEST(0, $2)),
          experience = experience + $3,
          updated_at = NOW()
      WHERE id = $1
    `;

    const result = client
      ? await client.query(query, [fleetId, morale, experienceGain])
      : await db.query(query, [fleetId, morale, experienceGain]);

    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Updates ship health after damage or repair.
   * @param {string} shipId - Ship ID
   * @param {number} health - New health value
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<boolean>} True if updated successfully
   */
  public async updateShipHealth(
    shipId: string,
    health: number,
    client?: PoolClient
  ): Promise<boolean> {
    const query = `
      UPDATE ships 
      SET health = LEAST(max_health, GREATEST(0, $2))
      WHERE id = $1
    `;

    const result = client
      ? await client.query(query, [shipId, health])
      : await db.query(query, [shipId, health]);

    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Gets total fleet maintenance cost for an empire.
   * @param {string} empireId - Empire ID
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<number>} Total maintenance cost per turn
   */
  public async getTotalMaintenanceCost(
    empireId: string,
    client?: PoolClient
  ): Promise<number> {
    const query = `
      SELECT SUM(s.maintenance_cost) as total
      FROM ships s
      JOIN fleets f ON s.fleet_id = f.id
      WHERE f.owner_id = $1
    `;

    const result = client
      ? await client.query(query, [empireId])
      : await db.query(query, [empireId]);

    return parseInt(result.rows[0]?.total || '0');
  }
}
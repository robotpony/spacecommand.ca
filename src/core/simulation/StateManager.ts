import { Player } from '../entities/Player';
import { Fleet } from '../entities/Fleet';
import { System } from '../entities/System';
import { Empire } from '../entities/Empire';
import { Planet } from '../entities/Planet';

export interface GameStateSnapshot {
  id: string;
  turnId: string;
  timestamp: Date;
  universeId: string;
  players: Map<string, any>;
  fleets: Map<string, any>;
  systems: Map<string, any>;
  empires: Map<string, any>;
  planets: Map<string, any>;
  metadata: {
    snapshotReason: string;
    gameVersion: string;
    playerCount: number;
    fleetCount: number;
  };
}

export interface StateRestoreResult {
  success: boolean;
  entitiesRestored: number;
  entitiesSkipped: number;
  errors: string[];
  restoredEntities: {
    players: number;
    fleets: number;
    systems: number;
    empires: number;
    planets: number;
  };
}

export interface StateChangeLog {
  id: string;
  timestamp: Date;
  entityType: string;
  entityId: string;
  changeType: 'create' | 'update' | 'delete';
  previousState?: any;
  newState?: any;
  initiatedBy: string; // Turn ID or system process
}

/**
 * Manages game state snapshots for rollback support and auditing.
 * Creates immutable snapshots before major operations like turn processing.
 * Provides rollback capabilities for failed operations and data integrity.
 * Tracks state changes for audit trails and debugging.
 */
export class StateManager {
  private readonly snapshots: Map<string, GameStateSnapshot>;
  private readonly changeLog: StateChangeLog[];
  private readonly maxSnapshots: number;
  private readonly maxChangeLogSize: number;

  constructor(maxSnapshots: number = 10, maxChangeLogSize: number = 1000) {
    this.snapshots = new Map();
    this.changeLog = [];
    this.maxSnapshots = maxSnapshots;
    this.maxChangeLogSize = maxChangeLogSize;
  }

  /**
   * Creates a complete snapshot of the current game state.
   * @param {string} turnId - Turn ID this snapshot belongs to
   * @param {string} universeId - Universe being snapshotted
   * @param {string} reason - Reason for creating the snapshot
   * @param {object} gameData - Current game state data
   * @returns {Promise<string>} Snapshot ID
   */
  public async createSnapshot(
    turnId: string,
    universeId: string,
    reason: string,
    gameData: {
      players: Player[];
      fleets: Fleet[];
      systems: System[];
      empires: Empire[];
      planets: Planet[];
    }
  ): Promise<string> {
    const snapshotId = `snapshot_${turnId}_${Date.now()}`;
    
    const snapshot: GameStateSnapshot = {
      id: snapshotId,
      turnId,
      timestamp: new Date(),
      universeId,
      players: new Map(),
      fleets: new Map(),
      systems: new Map(),
      empires: new Map(),
      planets: new Map(),
      metadata: {
        snapshotReason: reason,
        gameVersion: '0.1.0', // TODO: Get from package.json
        playerCount: gameData.players.length,
        fleetCount: gameData.fleets.length
      }
    };

    // Create deep copies of all entities
    for (const player of gameData.players) {
      snapshot.players.set(player.id, this.deepClone(player));
    }

    for (const fleet of gameData.fleets) {
      snapshot.fleets.set(fleet.id, this.deepClone(fleet));
    }

    for (const system of gameData.systems) {
      snapshot.systems.set(system.id, this.deepClone(system));
    }

    for (const empire of gameData.empires) {
      snapshot.empires.set(empire.id, this.deepClone(empire));
    }

    for (const planet of gameData.planets) {
      snapshot.planets.set(planet.id, this.deepClone(planet));
    }

    // Store snapshot
    this.snapshots.set(snapshotId, snapshot);

    // Clean up old snapshots if we exceed the limit
    await this.cleanupOldSnapshots();

    this.log(`Created snapshot ${snapshotId} for turn ${turnId}: ${reason}`);
    return snapshotId;
  }

  /**
   * Retrieves a snapshot by ID.
   * @param {string} snapshotId - ID of snapshot to retrieve
   * @returns {GameStateSnapshot|null} Snapshot data or null if not found
   */
  public getSnapshot(snapshotId: string): GameStateSnapshot | null {
    return this.snapshots.get(snapshotId) || null;
  }

  /**
   * Gets the most recent snapshot for a turn.
   * @param {string} turnId - Turn ID to find snapshot for
   * @returns {GameStateSnapshot|null} Most recent snapshot or null
   */
  public getLatestSnapshotForTurn(turnId: string): GameStateSnapshot | null {
    const turnSnapshots = Array.from(this.snapshots.values())
      .filter(snapshot => snapshot.turnId === turnId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return turnSnapshots[0] || null;
  }

  /**
   * Restores game state from a snapshot.
   * @param {string} snapshotId - ID of snapshot to restore from
   * @param {object} gameDataMutator - Interface to update game state
   * @returns {Promise<StateRestoreResult>} Result of restore operation
   */
  public async restoreFromSnapshot(
    snapshotId: string,
    gameDataMutator: {
      updatePlayer(player: Player): Promise<void>;
      updateFleet(fleet: Fleet): Promise<void>;
      updateSystem(system: System): Promise<void>;
      updateEmpire(empire: Empire): Promise<void>;
      updatePlanet(planet: Planet): Promise<void>;
    }
  ): Promise<StateRestoreResult> {
    const snapshot = this.snapshots.get(snapshotId);
    
    if (!snapshot) {
      return {
        success: false,
        entitiesRestored: 0,
        entitiesSkipped: 0,
        errors: [`Snapshot ${snapshotId} not found`],
        restoredEntities: { players: 0, fleets: 0, systems: 0, empires: 0, planets: 0 }
      };
    }

    const result: StateRestoreResult = {
      success: true,
      entitiesRestored: 0,
      entitiesSkipped: 0,
      errors: [],
      restoredEntities: { players: 0, fleets: 0, systems: 0, empires: 0, planets: 0 }
    };

    try {
      // Restore players
      for (const [playerId, playerData] of snapshot.players) {
        try {
          const player = this.reconstructPlayer(playerData);
          await gameDataMutator.updatePlayer(player);
          result.entitiesRestored++;
          result.restoredEntities.players++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          result.errors.push(`Failed to restore player ${playerId}: ${errorMessage}`);
          result.entitiesSkipped++;
        }
      }

      // Restore empires
      for (const [empireId, empireData] of snapshot.empires) {
        try {
          const empire = this.reconstructEmpire(empireData);
          await gameDataMutator.updateEmpire(empire);
          result.entitiesRestored++;
          result.restoredEntities.empires++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          result.errors.push(`Failed to restore empire ${empireId}: ${errorMessage}`);
          result.entitiesSkipped++;
        }
      }

      // Restore systems
      for (const [systemId, systemData] of snapshot.systems) {
        try {
          const system = this.reconstructSystem(systemData);
          await gameDataMutator.updateSystem(system);
          result.entitiesRestored++;
          result.restoredEntities.systems++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          result.errors.push(`Failed to restore system ${systemId}: ${errorMessage}`);
          result.entitiesSkipped++;
        }
      }

      // Restore planets
      for (const [planetId, planetData] of snapshot.planets) {
        try {
          const planet = this.reconstructPlanet(planetData);
          await gameDataMutator.updatePlanet(planet);
          result.entitiesRestored++;
          result.restoredEntities.planets++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          result.errors.push(`Failed to restore planet ${planetId}: ${errorMessage}`);
          result.entitiesSkipped++;
        }
      }

      // Restore fleets
      for (const [fleetId, fleetData] of snapshot.fleets) {
        try {
          const fleet = this.reconstructFleet(fleetData);
          await gameDataMutator.updateFleet(fleet);
          result.entitiesRestored++;
          result.restoredEntities.fleets++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          result.errors.push(`Failed to restore fleet ${fleetId}: ${errorMessage}`);
          result.entitiesSkipped++;
        }
      }

      if (result.errors.length > 0) {
        result.success = false;
      }

      this.log(`Restored ${result.entitiesRestored} entities from snapshot ${snapshotId}`);
      return result;

    } catch (error) {
      result.success = false;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(`Restore operation failed: ${errorMessage}`);
      return result;
    }
  }

  /**
   * Records a state change for audit trail.
   * @param {string} entityType - Type of entity changed
   * @param {string} entityId - ID of entity changed
   * @param {string} changeType - Type of change made
   * @param {any} previousState - Previous state (for updates)
   * @param {any} newState - New state
   * @param {string} initiatedBy - What initiated the change
   */
  public recordStateChange(
    entityType: string,
    entityId: string,
    changeType: 'create' | 'update' | 'delete',
    previousState: any,
    newState: any,
    initiatedBy: string
  ): void {
    const changeRecord: StateChangeLog = {
      id: `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      entityType,
      entityId,
      changeType,
      previousState: this.deepClone(previousState),
      newState: this.deepClone(newState),
      initiatedBy
    };

    this.changeLog.push(changeRecord);

    // Clean up old change log entries
    if (this.changeLog.length > this.maxChangeLogSize) {
      this.changeLog.splice(0, this.changeLog.length - this.maxChangeLogSize);
    }
  }

  /**
   * Gets change log entries for a specific entity.
   * @param {string} entityId - Entity ID to get changes for
   * @returns {StateChangeLog[]} Array of change log entries
   */
  public getEntityChangeHistory(entityId: string): StateChangeLog[] {
    return this.changeLog
      .filter(entry => entry.entityId === entityId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Gets all snapshots for a universe.
   * @param {string} universeId - Universe ID to filter by
   * @returns {GameStateSnapshot[]} Array of snapshots
   */
  public getUniverseSnapshots(universeId: string): GameStateSnapshot[] {
    return Array.from(this.snapshots.values())
      .filter(snapshot => snapshot.universeId === universeId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Deletes a snapshot by ID.
   * @param {string} snapshotId - ID of snapshot to delete
   * @returns {boolean} True if snapshot was deleted
   */
  public deleteSnapshot(snapshotId: string): boolean {
    return this.snapshots.delete(snapshotId);
  }

  /**
   * Gets statistics about stored snapshots.
   * @returns {object} Snapshot statistics
   */
  public getSnapshotStatistics(): {
    totalSnapshots: number;
    oldestSnapshot: Date | null;
    newestSnapshot: Date | null;
    universeCount: number;
    totalSizeEstimate: number;
  } {
    const snapshots = Array.from(this.snapshots.values());
    
    if (snapshots.length === 0) {
      return {
        totalSnapshots: 0,
        oldestSnapshot: null,
        newestSnapshot: null,
        universeCount: 0,
        totalSizeEstimate: 0
      };
    }

    const timestamps = snapshots.map(s => s.timestamp.getTime());
    const universes = new Set(snapshots.map(s => s.universeId));
    
    return {
      totalSnapshots: snapshots.length,
      oldestSnapshot: new Date(Math.min(...timestamps)),
      newestSnapshot: new Date(Math.max(...timestamps)),
      universeCount: universes.size,
      totalSizeEstimate: JSON.stringify(snapshots).length // Rough estimate
    };
  }

  /**
   * Cleans up old snapshots to stay within limits.
   */
  private async cleanupOldSnapshots(): Promise<void> {
    if (this.snapshots.size <= this.maxSnapshots) {
      return;
    }

    const sortedSnapshots = Array.from(this.snapshots.values())
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    const toDelete = sortedSnapshots.slice(0, this.snapshots.size - this.maxSnapshots);
    
    for (const snapshot of toDelete) {
      this.snapshots.delete(snapshot.id);
      this.log(`Cleaned up old snapshot ${snapshot.id}`);
    }
  }

  /**
   * Creates a deep clone of an object.
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

  /**
   * Reconstructs a Player instance from snapshot data.
   */
  private reconstructPlayer(data: any): Player {
    const player = new Player(data.id, data.username, data.email, data.faction);
    Object.assign(player, data);
    // Restore Date objects
    player.lastLogin = new Date(data.lastLogin);
    player.createdAt = new Date(data.createdAt);
    return player;
  }

  /**
   * Reconstructs an Empire instance from snapshot data.
   */
  private reconstructEmpire(data: any): Empire {
    const empire = new Empire(data.id, data.name, data.playerId, data.faction, data.homeSystemId);
    Object.assign(empire, data);
    if (data.foundedAt) {
      (empire as any).foundedAt = new Date(data.foundedAt);
    }
    return empire;
  }

  /**
   * Reconstructs a System instance from snapshot data.
   */
  private reconstructSystem(data: any): System {
    const system = new System(data.id, data.name, data.coordinates, data.dangerLevel || 0);
    Object.assign(system, data);
    return system;
  }

  /**
   * Reconstructs a Planet instance from snapshot data.
   */
  private reconstructPlanet(data: any): Planet {
    const planet = new Planet(data.id, data.name, data.systemId, data.coordinates, data.specialization || 'balanced');
    Object.assign(planet, data);
    return planet;
  }

  /**
   * Reconstructs a Fleet instance from snapshot data.
   */
  private reconstructFleet(data: any): Fleet {
    const fleet = new Fleet(data.id, data.name, data.ownerId, data.currentSystemId, data.coordinates);
    Object.assign(fleet, data);
    return fleet;
  }

  /**
   * Logs a message (placeholder for actual logging).
   */
  private log(message: string): void {
    console.log(`[StateManager] ${message}`);
  }
}
import { StateManager } from '../StateManager';
import { Player } from '../../entities/Player';
import { Empire } from '../../entities/Empire';
import { Fleet } from '../../entities/Fleet';
import { System } from '../../entities/System';
import { Planet } from '../../entities/Planet';

// Mock game data mutator for testing restore operations
class MockGameDataMutator {
  public operations: Array<{ type: string; entity: any }> = [];
  public shouldFailOn: string[] = [];

  async updatePlayer(player: Player): Promise<void> {
    if (this.shouldFailOn.includes('player')) {
      throw new Error('Failed to update player');
    }
    this.operations.push({ type: 'updatePlayer', entity: player });
  }

  async updateFleet(fleet: Fleet): Promise<void> {
    if (this.shouldFailOn.includes('fleet')) {
      throw new Error('Failed to update fleet');
    }
    this.operations.push({ type: 'updateFleet', entity: fleet });
  }

  async updateSystem(system: System): Promise<void> {
    if (this.shouldFailOn.includes('system')) {
      throw new Error('Failed to update system');
    }
    this.operations.push({ type: 'updateSystem', entity: system });
  }

  async updateEmpire(empire: Empire): Promise<void> {
    if (this.shouldFailOn.includes('empire')) {
      throw new Error('Failed to update empire');
    }
    this.operations.push({ type: 'updateEmpire', entity: empire });
  }

  async updatePlanet(planet: Planet): Promise<void> {
    if (this.shouldFailOn.includes('planet')) {
      throw new Error('Failed to update planet');
    }
    this.operations.push({ type: 'updatePlanet', entity: planet });
  }

  clear() {
    this.operations = [];
    this.shouldFailOn = [];
  }

  setFailures(entityTypes: string[]) {
    this.shouldFailOn = entityTypes;
  }
}

describe('StateManager', () => {
  let stateManager: StateManager;
  let mockMutator: MockGameDataMutator;
  let testPlayer: Player;
  let testEmpire: Empire;
  let testFleet: Fleet;
  let testSystem: System;
  let testPlanet: Planet;

  beforeEach(() => {
    stateManager = new StateManager(5, 100); // Small limits for testing
    mockMutator = new MockGameDataMutator();

    // Create test entities
    testPlayer = new Player('player-1', 'TestPlayer', 'test@example.com', 'terran_federation');
    testEmpire = new Empire('empire-1', 'Test Empire', 'player-1', 'terran_federation', 'system-1');
    testFleet = new Fleet('fleet-1', 'Test Fleet', 'empire-1', 'system-1', { x: 10, y: 20, z: 0 });
    testSystem = new System('system-1', 'Alpha Centauri', { x: 100, y: 200, z: 0 }, 5);
    testPlanet = new Planet('planet-1', 'Earth Prime', 'system-1', { x: 100, y: 200, z: 0 }, 'balanced');
  });

  describe('Constructor', () => {
    it('should initialize with default limits', () => {
      const defaultManager = new StateManager();
      expect(defaultManager).toBeDefined();
    });

    it('should initialize with custom limits', () => {
      const customManager = new StateManager(20, 500);
      expect(customManager).toBeDefined();
    });
  });

  describe('Snapshot Creation', () => {
    it('should create a snapshot successfully', async () => {
      const gameData = {
        players: [testPlayer],
        empires: [testEmpire],
        fleets: [testFleet],
        systems: [testSystem],
        planets: [testPlanet]
      };

      const snapshotId = await stateManager.createSnapshot(
        'turn-123',
        'universe-456',
        'pre-turn-processing',
        gameData
      );

      expect(snapshotId).toMatch(/^snapshot_turn-123_\d+$/);

      const snapshot = stateManager.getSnapshot(snapshotId);
      expect(snapshot).toBeDefined();
      expect(snapshot?.turnId).toBe('turn-123');
      expect(snapshot?.universeId).toBe('universe-456');
      expect(snapshot?.metadata.snapshotReason).toBe('pre-turn-processing');
      expect(snapshot?.metadata.playerCount).toBe(1);
      expect(snapshot?.metadata.fleetCount).toBe(1);
    });

    it('should create snapshots with unique IDs', async () => {
      const gameData = {
        players: [testPlayer],
        empires: [],
        fleets: [],
        systems: [],
        planets: []
      };

      const snapshot1 = await stateManager.createSnapshot('turn-1', 'universe-1', 'test', gameData);
      
      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 2));
      
      const snapshot2 = await stateManager.createSnapshot('turn-1', 'universe-1', 'test', gameData);

      expect(snapshot1).not.toBe(snapshot2);
      expect(stateManager.getSnapshot(snapshot1)).toBeDefined();
      expect(stateManager.getSnapshot(snapshot2)).toBeDefined();
    });

    it('should store deep clones of entities', async () => {
      const gameData = {
        players: [testPlayer],
        empires: [],
        fleets: [],
        systems: [],
        planets: []
      };

      const snapshotId = await stateManager.createSnapshot('turn-1', 'universe-1', 'test', gameData);
      const snapshot = stateManager.getSnapshot(snapshotId);

      // Store original credits value before modification
      const originalCredits = testPlayer.credits;
      
      // Modify original player
      testPlayer.credits = 99999;

      // Snapshot should still have original values
      const snapshotPlayer = snapshot?.players.get('player-1');
      expect(snapshotPlayer?.credits).not.toBe(99999);
      expect(snapshotPlayer?.credits).toBe(originalCredits);
    });

    it('should handle empty game data', async () => {
      const gameData = {
        players: [],
        empires: [],
        fleets: [],
        systems: [],
        planets: []
      };

      const snapshotId = await stateManager.createSnapshot('turn-1', 'universe-1', 'empty', gameData);
      const snapshot = stateManager.getSnapshot(snapshotId);

      expect(snapshot?.players.size).toBe(0);
      expect(snapshot?.empires.size).toBe(0);
      expect(snapshot?.fleets.size).toBe(0);
      expect(snapshot?.systems.size).toBe(0);
      expect(snapshot?.planets.size).toBe(0);
      expect(snapshot?.metadata.playerCount).toBe(0);
      expect(snapshot?.metadata.fleetCount).toBe(0);
    });
  });

  describe('Snapshot Retrieval', () => {
    let snapshotId: string;

    beforeEach(async () => {
      const gameData = {
        players: [testPlayer],
        empires: [testEmpire],
        fleets: [testFleet],
        systems: [testSystem],
        planets: [testPlanet]
      };

      snapshotId = await stateManager.createSnapshot('turn-123', 'universe-456', 'test', gameData);
    });

    it('should retrieve snapshot by ID', () => {
      const snapshot = stateManager.getSnapshot(snapshotId);
      expect(snapshot).toBeDefined();
      expect(snapshot?.id).toBe(snapshotId);
      expect(snapshot?.turnId).toBe('turn-123');
    });

    it('should return null for non-existent snapshot', () => {
      const snapshot = stateManager.getSnapshot('nonexistent');
      expect(snapshot).toBeNull();
    });

    it('should get latest snapshot for turn', async () => {
      const gameData = { players: [], empires: [], fleets: [], systems: [], planets: [] };
      
      // Create multiple snapshots for same turn
      await stateManager.createSnapshot('turn-123', 'universe-456', 'first', gameData);
      
      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const snapshot2 = await stateManager.createSnapshot('turn-123', 'universe-456', 'second', gameData);

      const latest = stateManager.getLatestSnapshotForTurn('turn-123');
      expect(latest?.id).toBe(snapshot2);
    });

    it('should return null for turn with no snapshots', () => {
      const latest = stateManager.getLatestSnapshotForTurn('nonexistent-turn');
      expect(latest).toBeNull();
    });

    it('should get snapshots by universe', async () => {
      const gameData = { players: [], empires: [], fleets: [], systems: [], planets: [] };
      
      await stateManager.createSnapshot('turn-1', 'universe-1', 'test', gameData);
      await stateManager.createSnapshot('turn-2', 'universe-1', 'test', gameData);
      await stateManager.createSnapshot('turn-3', 'universe-2', 'test', gameData);

      const universe1Snapshots = stateManager.getUniverseSnapshots('universe-1');
      const universe2Snapshots = stateManager.getUniverseSnapshots('universe-2');

      expect(universe1Snapshots).toHaveLength(2);
      expect(universe2Snapshots).toHaveLength(1);
      expect(universe1Snapshots.every(s => s.universeId === 'universe-1')).toBe(true);
    });
  });

  describe('State Restoration', () => {
    let snapshotId: string;

    beforeEach(async () => {
      const gameData = {
        players: [testPlayer],
        empires: [testEmpire],
        fleets: [testFleet],
        systems: [testSystem],
        planets: [testPlanet]
      };

      snapshotId = await stateManager.createSnapshot('turn-123', 'universe-456', 'test', gameData);
    });

    it('should restore all entities successfully', async () => {
      const result = await stateManager.restoreFromSnapshot(snapshotId, mockMutator);

      expect(result.success).toBe(true);
      expect(result.entitiesRestored).toBe(5);
      expect(result.entitiesSkipped).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(result.restoredEntities.players).toBe(1);
      expect(result.restoredEntities.empires).toBe(1);
      expect(result.restoredEntities.fleets).toBe(1);
      expect(result.restoredEntities.systems).toBe(1);
      expect(result.restoredEntities.planets).toBe(1);

      expect(mockMutator.operations).toHaveLength(5);
      expect(mockMutator.operations.some(op => op.type === 'updatePlayer')).toBe(true);
      expect(mockMutator.operations.some(op => op.type === 'updateEmpire')).toBe(true);
      expect(mockMutator.operations.some(op => op.type === 'updateFleet')).toBe(true);
      expect(mockMutator.operations.some(op => op.type === 'updateSystem')).toBe(true);
      expect(mockMutator.operations.some(op => op.type === 'updatePlanet')).toBe(true);
    });

    it('should handle restore failures gracefully', async () => {
      mockMutator.setFailures(['player', 'fleet']);

      const result = await stateManager.restoreFromSnapshot(snapshotId, mockMutator);

      expect(result.success).toBe(false);
      expect(result.entitiesRestored).toBe(3); // empire, system, planet
      expect(result.entitiesSkipped).toBe(2); // player, fleet
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0]).toContain('Failed to restore player');
      expect(result.errors[1]).toContain('Failed to restore fleet');
    });

    it('should fail when snapshot does not exist', async () => {
      const result = await stateManager.restoreFromSnapshot('nonexistent', mockMutator);

      expect(result.success).toBe(false);
      expect(result.entitiesRestored).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Snapshot nonexistent not found');
    });

    it('should reconstruct entity objects correctly', async () => {
      const result = await stateManager.restoreFromSnapshot(snapshotId, mockMutator);

      expect(result.success).toBe(true);

      const playerOp = mockMutator.operations.find(op => op.type === 'updatePlayer');
      const restoredPlayer = playerOp?.entity;
      expect(restoredPlayer).toBeInstanceOf(Player);
      expect(restoredPlayer.id).toBe('player-1');
      expect(restoredPlayer.username).toBe('TestPlayer');

      const empireOp = mockMutator.operations.find(op => op.type === 'updateEmpire');
      const restoredEmpire = empireOp?.entity;
      expect(restoredEmpire).toBeInstanceOf(Empire);
      expect(restoredEmpire.id).toBe('empire-1');

      const fleetOp = mockMutator.operations.find(op => op.type === 'updateFleet');
      const restoredFleet = fleetOp?.entity;
      expect(restoredFleet).toBeInstanceOf(Fleet);
      expect(restoredFleet.id).toBe('fleet-1');
    });
  });

  describe('Change Logging', () => {
    it('should record state changes', () => {
      const previousState = { id: 'player-1', credits: 1000 };
      const newState = { id: 'player-1', credits: 1500 };

      stateManager.recordStateChange(
        'player',
        'player-1',
        'update',
        previousState,
        newState,
        'turn-123'
      );

      const changes = stateManager.getEntityChangeHistory('player-1');
      expect(changes).toHaveLength(1);
      expect(changes[0].entityType).toBe('player');
      expect(changes[0].entityId).toBe('player-1');
      expect(changes[0].changeType).toBe('update');
      expect(changes[0].previousState.credits).toBe(1000);
      expect(changes[0].newState.credits).toBe(1500);
      expect(changes[0].initiatedBy).toBe('turn-123');
    });

    it('should record create and delete changes', () => {
      stateManager.recordStateChange('fleet', 'fleet-1', 'create', null, { id: 'fleet-1' }, 'turn-123');
      stateManager.recordStateChange('fleet', 'fleet-2', 'delete', { id: 'fleet-2' }, null, 'turn-124');

      const fleet1Changes = stateManager.getEntityChangeHistory('fleet-1');
      const fleet2Changes = stateManager.getEntityChangeHistory('fleet-2');

      expect(fleet1Changes[0].changeType).toBe('create');
      expect(fleet1Changes[0].previousState).toBeNull();

      expect(fleet2Changes[0].changeType).toBe('delete');
      expect(fleet2Changes[0].newState).toBeNull();
    });

    it('should return changes in reverse chronological order', () => {
      stateManager.recordStateChange('player', 'player-1', 'create', null, { credits: 0 }, 'turn-1');
      
      // Small delay to ensure different timestamps
      setTimeout(() => {
        stateManager.recordStateChange('player', 'player-1', 'update', { credits: 0 }, { credits: 100 }, 'turn-2');
      }, 10);

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const changes = stateManager.getEntityChangeHistory('player-1');
          expect(changes).toHaveLength(2);
          expect(changes[0].changeType).toBe('update'); // Most recent first
          expect(changes[1].changeType).toBe('create');
          resolve();
        }, 20);
      });
    });

    it('should handle large change logs with cleanup', () => {
      const smallLogManager = new StateManager(10, 5); // Small change log limit

      // Add more changes than the limit
      for (let i = 0; i < 10; i++) {
        smallLogManager.recordStateChange('player', `player-${i}`, 'create', null, { id: `player-${i}` }, 'turn-1');
      }

      // Only the most recent changes should be kept
      const allChanges = [];
      for (let i = 0; i < 10; i++) {
        const changes = smallLogManager.getEntityChangeHistory(`player-${i}`);
        allChanges.push(...changes);
      }

      expect(allChanges.length).toBeLessThanOrEqual(5);
    });

    it('should return empty array for non-existent entity', () => {
      const changes = stateManager.getEntityChangeHistory('nonexistent');
      expect(changes).toHaveLength(0);
    });

    it('should deep clone state data to prevent mutations', () => {
      const originalState = { id: 'player-1', inventory: { ore: 100 } };
      
      stateManager.recordStateChange('player', 'player-1', 'update', originalState, originalState, 'turn-1');
      
      // Modify original object
      originalState.inventory.ore = 999;
      
      const changes = stateManager.getEntityChangeHistory('player-1');
      expect(changes[0].previousState.inventory.ore).toBe(100); // Should not be affected
    });
  });

  describe('Snapshot Management', () => {
    it('should delete snapshots', async () => {
      const gameData = { players: [], empires: [], fleets: [], systems: [], planets: [] };
      const snapshotId = await stateManager.createSnapshot('turn-1', 'universe-1', 'test', gameData);

      expect(stateManager.getSnapshot(snapshotId)).toBeDefined();
      
      const deleted = stateManager.deleteSnapshot(snapshotId);
      expect(deleted).toBe(true);
      expect(stateManager.getSnapshot(snapshotId)).toBeNull();
    });

    it('should return false when deleting non-existent snapshot', () => {
      const deleted = stateManager.deleteSnapshot('nonexistent');
      expect(deleted).toBe(false);
    });

    it('should clean up old snapshots when limit exceeded', async () => {
      const limitedManager = new StateManager(3); // Limit to 3 snapshots
      const gameData = { players: [], empires: [], fleets: [], systems: [], planets: [] };

      // Create more snapshots than the limit
      const snapshots = [];
      for (let i = 0; i < 5; i++) {
        snapshots.push(await limitedManager.createSnapshot(`turn-${i}`, 'universe-1', 'test', gameData));
        // Small delay to ensure different timestamps
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Only the 3 most recent should remain
      const stats = limitedManager.getSnapshotStatistics();
      expect(stats.totalSnapshots).toBe(3);

      // Oldest snapshots should be gone
      expect(limitedManager.getSnapshot(snapshots[0])).toBeNull();
      expect(limitedManager.getSnapshot(snapshots[1])).toBeNull();
      
      // Newest snapshots should remain
      expect(limitedManager.getSnapshot(snapshots[2])).toBeDefined();
      expect(limitedManager.getSnapshot(snapshots[3])).toBeDefined();
      expect(limitedManager.getSnapshot(snapshots[4])).toBeDefined();
    });
  });

  describe('Statistics', () => {
    it('should return empty statistics when no snapshots exist', () => {
      const stats = stateManager.getSnapshotStatistics();
      expect(stats.totalSnapshots).toBe(0);
      expect(stats.oldestSnapshot).toBeNull();
      expect(stats.newestSnapshot).toBeNull();
      expect(stats.universeCount).toBe(0);
      expect(stats.totalSizeEstimate).toBe(0);
    });

    it('should calculate statistics correctly', async () => {
      const gameData = { players: [testPlayer], empires: [], fleets: [], systems: [], planets: [] };
      
      await stateManager.createSnapshot('turn-1', 'universe-1', 'test', gameData);
      await new Promise(resolve => setTimeout(resolve, 10));
      await stateManager.createSnapshot('turn-2', 'universe-1', 'test', gameData);
      await stateManager.createSnapshot('turn-3', 'universe-2', 'test', gameData);

      const stats = stateManager.getSnapshotStatistics();
      expect(stats.totalSnapshots).toBe(3);
      expect(stats.universeCount).toBe(2);
      expect(stats.oldestSnapshot).toBeInstanceOf(Date);
      expect(stats.newestSnapshot).toBeInstanceOf(Date);
      expect(stats.totalSizeEstimate).toBeGreaterThan(0);
      expect(stats.newestSnapshot!.getTime()).toBeGreaterThan(stats.oldestSnapshot!.getTime());
    });
  });

  describe('Deep Cloning', () => {
    it('should handle various data types in deep clone', async () => {
      // Create a complex player object with extra properties
      const complexPlayer = new Player('player-1', 'TestPlayer', 'test@example.com', 'terran_federation');
      (complexPlayer as any).lastLogin = new Date('2023-01-01');
      (complexPlayer as any).inventory = {
        items: ['ore', 'crystals'],
        quantities: { ore: 100, crystals: 50 }
      };
      (complexPlayer as any).settings = {
        notifications: true,
        theme: 'dark'
      };

      const complexData = {
        players: [complexPlayer],
        empires: [],
        fleets: [],
        systems: [],
        planets: []
      };

      const snapshotId = await stateManager.createSnapshot('turn-1', 'universe-1', 'complex', complexData);
      const snapshot = stateManager.getSnapshot(snapshotId);

      const snapshotPlayer = snapshot?.players.get('player-1');
      expect(snapshotPlayer?.lastLogin).toBeInstanceOf(Date);
      expect(snapshotPlayer?.inventory.items).toEqual(['ore', 'crystals']);
      expect(snapshotPlayer?.inventory.quantities.ore).toBe(100);
      expect(snapshotPlayer?.settings.notifications).toBe(true);

      // Verify it's a deep copy by modifying original
      (complexPlayer as any).inventory.quantities.ore = 999;
      expect(snapshotPlayer?.inventory.quantities.ore).toBe(100);
    });

    it('should handle null and undefined values', async () => {
      // Create a player with null/undefined properties
      const playerWithNulls = new Player('player-1', 'TestPlayer', 'test@example.com', 'terran_federation');
      (playerWithNulls as any).optionalField = null;
      (playerWithNulls as any).undefinedField = undefined;
      (playerWithNulls as any).zeroValue = 0;
      (playerWithNulls as any).emptyString = '';
      (playerWithNulls as any).falseValue = false;

      const dataWithNulls = {
        players: [playerWithNulls],
        empires: [],
        fleets: [],
        systems: [],
        planets: []
      };

      const snapshotId = await stateManager.createSnapshot('turn-1', 'universe-1', 'nulls', dataWithNulls);
      const snapshot = stateManager.getSnapshot(snapshotId);

      const snapshotPlayer = snapshot?.players.get('player-1');
      expect(snapshotPlayer?.optionalField).toBeNull();
      expect(snapshotPlayer?.undefinedField).toBeUndefined();
      expect(snapshotPlayer?.zeroValue).toBe(0);
      expect(snapshotPlayer?.emptyString).toBe('');
      expect(snapshotPlayer?.falseValue).toBe(false);
    });
  });

  describe('Entity Reconstruction', () => {
    it('should preserve entity types and Date objects', async () => {
      const now = new Date();
      testPlayer.lastLogin = now;
      testPlayer.createdAt = now;
      (testEmpire as any).foundedAt = now;

      const gameData = {
        players: [testPlayer],
        empires: [testEmpire],
        fleets: [testFleet],
        systems: [testSystem],
        planets: [testPlanet]
      };

      const snapshotId = await stateManager.createSnapshot('turn-1', 'universe-1', 'dates', gameData);
      const result = await stateManager.restoreFromSnapshot(snapshotId, mockMutator);

      expect(result.success).toBe(true);

      const playerOp = mockMutator.operations.find(op => op.type === 'updatePlayer');
      const restoredPlayer = playerOp?.entity;
      expect(restoredPlayer.lastLogin).toBeInstanceOf(Date);
      expect(restoredPlayer.createdAt).toBeInstanceOf(Date);

      const empireOp = mockMutator.operations.find(op => op.type === 'updateEmpire');
      const restoredEmpire = empireOp?.entity;
      expect((restoredEmpire as any).foundedAt).toBeInstanceOf(Date);
    });

    it('should handle entity reconstruction with all properties', async () => {
      // Set various properties on entities
      testPlayer.credits = 5000;
      testPlayer.isActive = true;
      testFleet.ships = [{
        id: 'ship-1',
        class: 'destroyer',
        name: 'Test Destroyer',
        health: 100,
        maxHealth: 100,
        attackPower: 10,
        defense: 5,
        speed: 3,
        cargoCapacity: 50,
        currentCargo: 0,
        fuelCapacity: 100,
        currentFuel: 100,
        crewRequired: 10,
        maintenanceCost: 100
      }];
      testSystem.planetIds = ['planet-1'];

      const gameData = {
        players: [testPlayer],
        empires: [testEmpire],
        fleets: [testFleet],
        systems: [testSystem],
        planets: [testPlanet]
      };

      const snapshotId = await stateManager.createSnapshot('turn-1', 'universe-1', 'properties', gameData);
      const result = await stateManager.restoreFromSnapshot(snapshotId, mockMutator);

      expect(result.success).toBe(true);

      const playerOp = mockMutator.operations.find(op => op.type === 'updatePlayer');
      const restoredPlayer = playerOp?.entity;
      expect(restoredPlayer.credits).toBe(5000);
      expect(restoredPlayer.isActive).toBe(true);

      const fleetOp = mockMutator.operations.find(op => op.type === 'updateFleet');
      const restoredFleet = fleetOp?.entity;
      expect(restoredFleet.ships).toHaveLength(1);
      expect(restoredFleet.ships[0].id).toBe('ship-1');
      expect(restoredFleet.ships[0].class).toBe('destroyer');

      const systemOp = mockMutator.operations.find(op => op.type === 'updateSystem');
      const restoredSystem = systemOp?.entity;
      expect(restoredSystem.planetIds).toEqual(['planet-1']);
    });
  });
});
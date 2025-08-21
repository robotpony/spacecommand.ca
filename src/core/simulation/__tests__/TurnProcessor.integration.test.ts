import { TurnProcessor, TurnEventEmitter } from '../TurnProcessor';
import { GameStateProvider } from '../ActionValidator';
import { GameStateMutator } from '../ActionExecutor';
import { Turn } from '../../entities/Turn';
import { Action } from '../../entities/Action';
import { ActionQueue } from '../ActionQueue';

// Mock implementations for integration testing
class MockGameStateProvider implements GameStateProvider {
  private data: any = {};

  async getPlayer(playerId: string) {
    return this.data.players?.[playerId] || null;
  }

  async getFleet(fleetId: string) {
    return this.data.fleets?.[fleetId] || null;
  }

  async getSystem(systemId: string) {
    return this.data.systems?.[systemId] || null;
  }

  async getEmpire(empireId: string) {
    return this.data.empires?.[empireId] || null;
  }

  async getPlayerFleets(playerId: string): Promise<any[]> {
    return Object.values(this.data.fleets || {}).filter((fleet: any) => fleet.playerId === playerId);
  }

  calculateDistance(from: any, to: any): number {
    const dx = from.x - to.x;
    const dy = from.y - to.y;
    const dz = (from.z || 0) - (to.z || 0);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  async isSystemAccessible(): Promise<boolean> {
    return true;
  }

  setData(key: string, value: any) {
    this.data[key] = value;
  }

  clear() {
    this.data = {};
  }
}

class MockGameStateMutator implements GameStateMutator {
  public operations: Array<{ type: string; data: any }> = [];

  async updatePlayer(player: any): Promise<void> {
    this.operations.push({ type: 'updatePlayer', data: player });
  }

  async updateFleet(fleet: any): Promise<void> {
    this.operations.push({ type: 'updateFleet', data: fleet });
  }

  async moveFleet(fleetId: string, destination: any): Promise<void> {
    this.operations.push({ type: 'moveFleet', data: { fleetId, destination } });
  }

  async updateEmpire(empire: any): Promise<void> {
    this.operations.push({ type: 'updateEmpire', data: empire });
  }

  async addCreditsToEmpire(empireId: string, amount: number): Promise<void> {
    this.operations.push({ type: 'addCredits', data: { empireId, amount } });
  }

  async deductCreditsFromEmpire(empireId: string, amount: number): Promise<boolean> {
    this.operations.push({ type: 'deductCredits', data: { empireId, amount } });
    return amount <= 20000; // Allow reasonable deductions
  }

  async updateSystem(system: any): Promise<void> {
    this.operations.push({ type: 'updateSystem', data: system });
  }

  async transferResources(fromId: string, toId: string, resourceType: string, quantity: number): Promise<boolean> {
    this.operations.push({ type: 'transferResources', data: { fromId, toId, resourceType, quantity } });
    return true;
  }

  async processCombat(attackerFleetId: string, defenderFleetId: string, tactics: string): Promise<any> {
    this.operations.push({ type: 'processCombat', data: { attackerFleetId, defenderFleetId, tactics } });
    return {
      victor: 'attacker',
      attackerLosses: [],
      defenderLosses: [{ shipId: 'ship-1', destroyed: true, damagePercent: 100 }],
      lootCaptured: 500
    };
  }

  async createGameEvent(type: string, description: string, affectedSystems: string[], effects: Record<string, any>): Promise<void> {
    this.operations.push({ type: 'createGameEvent', data: { type, description, affectedSystems, effects } });
  }

  clear() {
    this.operations = [];
  }
}

class MockEventEmitter implements TurnEventEmitter {
  public events: Array<{ event: string; data: any }> = [];

  emit(event: string, data: any): void {
    this.events.push({ event, data });
  }

  clear() {
    this.events = [];
  }
}

describe('TurnProcessor Integration Tests', () => {
  let processor: TurnProcessor;
  let gameStateProvider: MockGameStateProvider;
  let gameStateMutator: MockGameStateMutator;
  let eventEmitter: MockEventEmitter;
  let turn: Turn;
  let actionQueue: ActionQueue;

  beforeEach(() => {
    gameStateProvider = new MockGameStateProvider();
    gameStateMutator = new MockGameStateMutator();
    eventEmitter = new MockEventEmitter();

    processor = new TurnProcessor(
      gameStateProvider,
      gameStateMutator,
      eventEmitter
    );

    // Set up test turn
    turn = new Turn('turn-123', 'universe-456', 1, {
      durationMs: 1000, // Short for testing
      maxActions: 10,
      processingTimeoutMs: 5000
    });

    actionQueue = new ActionQueue('turn-123');

    // Set up test game state
    gameStateProvider.setData('players', {
      'player-1': {
        id: 'player-1',
        username: 'TestPlayer1',
        empireId: 'empire-1',
        credits: 10000,
        isActive: true,
        isBanned: false
      },
      'player-2': {
        id: 'player-2',
        username: 'TestPlayer2',
        empireId: 'empire-2',
        credits: 15000,
        isActive: true,
        isBanned: false
      }
    });

    gameStateProvider.setData('fleets', {
      'fleet-1': {
        id: 'fleet-1',
        empireId: 'empire-1',
        position: { x: 0, y: 0, z: 0 },
        maxRange: 10,
        status: 'idle',
        ships: [{ id: 'ship-1', class: 'destroyer' }]
      },
      'fleet-2': {
        id: 'fleet-2',
        empireId: 'empire-2',
        position: { x: 5, y: 5, z: 0 },
        maxRange: 10,
        status: 'idle',
        ships: [{ id: 'ship-2', class: 'destroyer' }]
      }
    });

    gameStateProvider.setData('empires', {
      'empire-1': { id: 'empire-1', playerId: 'player-1' },
      'empire-2': { id: 'empire-2', playerId: 'player-2' }
    });
  });

  describe('Complete Turn Processing', () => {
    it('should process a complete turn with mixed actions successfully', async () => {
      // Add various actions to the queue
      const actions = [
        Action.createMoveFleet('move-1', 'player-1', 'turn-123', 'fleet-1', { x: 3, y: 2, z: 0 }),
        Action.createTrade('trade-1', 'player-1', 'turn-123', 'station-1', 'ore', 100, 50),
        Action.createResearch('research-1', 'player-2', 'turn-123', 'tech-engines', 500),
        new Action('diplomacy-1', 'player-2', 'turn-123', 'diplomacy', { targetEmpire: 'empire-1', message: 'Peace treaty' })
      ];

      for (const action of actions) {
        actionQueue.addAction(action);
      }

      // Start the turn
      turn.start();

      // Process the turn
      const result = await processor.processTurn(turn, actionQueue);

      // Verify overall success
      expect(result.success).toBe(true);
      expect(result.actionsProcessed).toBe(4);
      expect(result.actionsSucceeded).toBe(4);
      expect(result.actionsFailed).toBe(0);
      expect(result.processingTime).toBeGreaterThan(0);
      expect(result.errorMessages).toHaveLength(0);

      // Verify turn state
      expect(turn.status).toBe('completed');
      expect(turn.phase).toBe('completed');
      expect(turn.actionsCollected).toBe(4);
      expect(turn.playersParticipated).toEqual(['player-1', 'player-2']);

      // Verify events were emitted
      expect(eventEmitter.events).toContainEqual({
        event: 'turn_started',
        data: { turnId: 'turn-123', turnNumber: 1 }
      });
      expect(eventEmitter.events).toContainEqual({
        event: 'turn_completed',
        data: { turnId: 'turn-123', result }
      });

      // Verify phase transitions were emitted
      const phaseEvents = eventEmitter.events.filter(e => e.event === 'turn_phase_changed');
      expect(phaseEvents.length).toBeGreaterThan(4); // Multiple phase transitions

      // Verify game state operations were executed
      expect(gameStateMutator.operations.length).toBeGreaterThan(0);
      
      // Check specific operations
      const moveOperations = gameStateMutator.operations.filter(op => op.type === 'moveFleet');
      expect(moveOperations).toHaveLength(1);
      expect(moveOperations[0].data.fleetId).toBe('fleet-1');

      const creditOperations = gameStateMutator.operations.filter(op => op.type === 'deductCredits');
      expect(creditOperations).toHaveLength(1);
      expect(creditOperations[0].data.amount).toBe(5000); // 100 * 50
    });

    it('should handle validation failures gracefully', async () => {
      // Add an invalid action (fleet doesn't exist)
      const invalidAction = Action.createMoveFleet('invalid-1', 'player-1', 'turn-123', 'nonexistent-fleet', { x: 1, y: 1, z: 0 });
      const validAction = Action.createResearch('valid-1', 'player-1', 'turn-123', 'tech-1', 100);

      actionQueue.addAction(invalidAction);
      actionQueue.addAction(validAction);

      turn.start();
      const result = await processor.processTurn(turn, actionQueue);

      expect(result.success).toBe(true); // Overall success despite one failure
      expect(result.actionsProcessed).toBe(2);
      expect(result.actionsSucceeded).toBe(1);
      expect(result.actionsFailed).toBe(1);
      expect(result.errorMessages).toHaveLength(1);
      expect(result.errorMessages[0]).toContain('Fleet not found');
    });

    it('should handle execution failures gracefully', async () => {
      // Mock a credit deduction failure
      gameStateMutator.deductCreditsFromEmpire = jest.fn().mockResolvedValue(false);

      const expensiveAction = Action.createTrade('expensive-1', 'player-1', 'turn-123', 'station-1', 'ore', 1000, 100);
      actionQueue.addAction(expensiveAction);

      turn.start();
      const result = await processor.processTurn(turn, actionQueue);

      expect(result.success).toBe(true);
      expect(result.actionsProcessed).toBe(1);
      expect(result.actionsSucceeded).toBe(0);
      expect(result.actionsFailed).toBe(1);
    });

    it('should process actions in correct priority order', async () => {
      // Add actions in reverse priority order
      const actions = [
        Action.createAttack('attack-1', 'player-1', 'turn-123', 'fleet-1', 'fleet-2'), // Priority 10
        Action.createTrade('trade-1', 'player-1', 'turn-123', 'station-1', 'ore', 100, 50), // Priority 8
        Action.createMoveFleet('move-1', 'player-2', 'turn-123', 'fleet-2', { x: 1, y: 1, z: 0 }), // Priority 6
        new Action('diplomacy-1', 'player-2', 'turn-123', 'diplomacy', {}) // Priority 1
      ];

      for (const action of actions) {
        actionQueue.addAction(action);
      }

      // Update fleet positions so they can attack
      gameStateProvider.setData('fleets', {
        'fleet-1': {
          id: 'fleet-1',
          empireId: 'empire-1',
          position: { x: 5, y: 5, z: 0 }, // Same as fleet-2
          maxRange: 10,
          status: 'idle',
          ships: [{ id: 'ship-1', class: 'destroyer' }]
        },
        'fleet-2': {
          id: 'fleet-2',
          empireId: 'empire-2',
          position: { x: 5, y: 5, z: 0 },
          maxRange: 10,
          status: 'idle',
          ships: [{ id: 'ship-2', class: 'destroyer' }]
        }
      });

      turn.start();
      await processor.processTurn(turn, actionQueue);

      // Check action processed events to verify order
      const actionEvents = eventEmitter.events.filter(e => e.event === 'action_processed');
      expect(actionEvents).toHaveLength(4);
      
      // Should be processed in priority order: diplomacy(1), move(6), trade(8), attack(10)
      expect(actionEvents[0].data.actionId).toBe('diplomacy-1');
      expect(actionEvents[1].data.actionId).toBe('move-1');
      expect(actionEvents[2].data.actionId).toBe('trade-1');
      expect(actionEvents[3].data.actionId).toBe('attack-1');
    });

    it('should handle empty action queue', async () => {
      turn.start();
      const result = await processor.processTurn(turn, actionQueue);

      expect(result.success).toBe(true);
      expect(result.actionsProcessed).toBe(0);
      expect(result.actionsSucceeded).toBe(0);
      expect(result.actionsFailed).toBe(0);
      expect(turn.status).toBe('completed');
    });

    it('should handle turn processing errors', async () => {
      // Mock a critical error during validation
      gameStateProvider.getPlayer = jest.fn().mockRejectedValue(new Error('Database connection lost'));

      const action = Action.createTrade('trade-1', 'player-1', 'turn-123', 'station-1', 'ore', 100, 50);
      actionQueue.addAction(action);

      turn.start();
      const result = await processor.processTurn(turn, actionQueue);

      expect(result.success).toBe(false);
      expect(result.errorMessages.length).toBeGreaterThan(0);
      expect(turn.status).toBe('failed');

      // Verify failure event was emitted
      expect(eventEmitter.events).toContainEqual({
        event: 'turn_failed',
        data: { turnId: 'turn-123', error: expect.any(String) }
      });
    });
  });

  describe('Turn Phase Management', () => {
    it('should transition through all phases correctly', async () => {
      const action = Action.createTrade('trade-1', 'player-1', 'turn-123', 'station-1', 'ore', 100, 50);
      actionQueue.addAction(action);

      turn.start();
      await processor.processTurn(turn, actionQueue);

      // Check phase transition events
      const phaseEvents = eventEmitter.events.filter(e => e.event === 'turn_phase_changed');
      
      // Should have transitions: collecting -> validating -> processing -> resolving -> distributing
      expect(phaseEvents.length).toBeGreaterThanOrEqual(4);
      
      const phases = phaseEvents.map(e => e.data.phase);
      expect(phases).toContain('validating');
      expect(phases).toContain('processing');
      expect(phases).toContain('resolving');
      expect(phases).toContain('distributing');
    });

    it('should record turn statistics correctly', async () => {
      const actions = [
        Action.createTrade('trade-1', 'player-1', 'turn-123', 'station-1', 'ore', 100, 50),
        Action.createMoveFleet('move-1', 'player-2', 'turn-123', 'fleet-2', { x: 1, y: 1, z: 0 }),
        Action.createResearch('research-1', 'player-1', 'turn-123', 'tech-1', 200)
      ];

      for (const action of actions) {
        actionQueue.addAction(action);
      }

      turn.start();
      await processor.processTurn(turn, actionQueue);

      // Verify turn recorded player participation
      expect(turn.playersParticipated).toContain('player-1');
      expect(turn.playersParticipated).toContain('player-2');
      expect(turn.actionsCollected).toBe(3);

      // Verify processing log contains entries
      expect(turn.processingLog.length).toBeGreaterThan(0);
    });
  });

  describe('Event Emission', () => {
    it('should emit all required turn events', async () => {
      const action = Action.createTrade('trade-1', 'player-1', 'turn-123', 'station-1', 'ore', 100, 50);
      actionQueue.addAction(action);

      turn.start();
      await processor.processTurn(turn, actionQueue);

      // Check for required events
      const eventTypes = eventEmitter.events.map(e => e.event);
      expect(eventTypes).toContain('turn_started');
      expect(eventTypes).toContain('turn_phase_changed');
      expect(eventTypes).toContain('action_processed');
      expect(eventTypes).toContain('turn_completed');
    });

    it('should emit action processed events for each action', async () => {
      const actions = [
        Action.createTrade('trade-1', 'player-1', 'turn-123', 'station-1', 'ore', 100, 50),
        Action.createResearch('research-1', 'player-2', 'turn-123', 'tech-1', 200)
      ];

      for (const action of actions) {
        actionQueue.addAction(action);
      }

      turn.start();
      await processor.processTurn(turn, actionQueue);

      const actionEvents = eventEmitter.events.filter(e => e.event === 'action_processed');
      expect(actionEvents).toHaveLength(2);
      
      expect(actionEvents[0].data.actionId).toBe('trade-1');
      expect(actionEvents[0].data.result).toBe('success');
      
      expect(actionEvents[1].data.actionId).toBe('research-1');
      expect(actionEvents[1].data.result).toBe('success');
    });
  });

  describe('Performance and Timing', () => {
    it('should complete processing within reasonable time', async () => {
      // Add multiple actions to test performance
      const actions = [];
      for (let i = 0; i < 20; i++) {
        actions.push(Action.createResearch(`research-${i}`, 'player-1', 'turn-123', `tech-${i}`, 100));
      }

      for (const action of actions) {
        actionQueue.addAction(action);
      }

      turn.start();
      const startTime = Date.now();
      
      const result = await processor.processTurn(turn, actionQueue);
      
      const processingTime = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(result.actionsProcessed).toBe(20);
      expect(processingTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle large action queues efficiently', async () => {
      // Create a large number of diverse actions
      const actions = [];
      
      for (let i = 0; i < 100; i++) {
        const playerId = i % 2 === 0 ? 'player-1' : 'player-2';
        const actionType = ['trade', 'research', 'diplomacy'][i % 3];
        
        if (actionType === 'trade') {
          actions.push(Action.createTrade(`trade-${i}`, playerId, 'turn-123', 'station-1', 'ore', 10, 50));
        } else if (actionType === 'research') {
          actions.push(Action.createResearch(`research-${i}`, playerId, 'turn-123', `tech-${i}`, 100));
        } else {
          actions.push(new Action(`diplomacy-${i}`, playerId, 'turn-123', 'diplomacy', {}));
        }
      }

      for (const action of actions) {
        actionQueue.addAction(action);
      }

      turn.start();
      const result = await processor.processTurn(turn, actionQueue);

      expect(result.success).toBe(true);
      expect(result.actionsProcessed).toBe(100);
      expect(result.processingTime).toBeLessThan(10000); // Should complete within 10 seconds
    });
  });
});
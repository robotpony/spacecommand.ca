import { ActionExecutor, GameStateMutator } from '../ActionExecutor';
import { Action } from '../../entities/Action';

// Mock game state mutator
class MockGameStateMutator implements GameStateMutator {
  public updatePlayerCalls: any[] = [];
  public updateFleetCalls: any[] = [];
  public moveFleetCalls: any[] = [];
  public addCreditsCalls: any[] = [];
  public deductCreditsCalls: any[] = [];
  public transferResourcesCalls: any[] = [];
  public processCombatCalls: any[] = [];
  public createGameEventCalls: any[] = [];

  async updatePlayer(player: any): Promise<void> {
    this.updatePlayerCalls.push(player);
  }

  async updateFleet(fleet: any): Promise<void> {
    this.updateFleetCalls.push(fleet);
  }

  async moveFleet(fleetId: string, destination: any): Promise<void> {
    this.moveFleetCalls.push({ fleetId, destination });
  }

  async updateEmpire(_empire: any): Promise<void> {
    // Mock implementation
  }

  async addCreditsToEmpire(empireId: string, amount: number): Promise<void> {
    this.addCreditsCalls.push({ empireId, amount });
  }

  async deductCreditsFromEmpire(empireId: string, amount: number): Promise<boolean> {
    this.deductCreditsCalls.push({ empireId, amount });
    return amount <= 10000; // Allow deductions up to 10k
  }

  async updateSystem(_system: any): Promise<void> {
    // Mock implementation
  }

  async transferResources(fromId: string, toId: string, resourceType: string, quantity: number): Promise<boolean> {
    this.transferResourcesCalls.push({ fromId, toId, resourceType, quantity });
    return true;
  }

  async processCombat(attackerFleetId: string, defenderFleetId: string, tactics: string): Promise<any> {
    this.processCombatCalls.push({ attackerFleetId, defenderFleetId, tactics });
    return {
      victor: 'attacker',
      attackerLosses: [],
      defenderLosses: [{ shipId: 'ship-1', shipClass: 'destroyer', destroyed: true, damagePercent: 100 }],
      lootCaptured: 1000,
      experienceGained: { [attackerFleetId]: 50 }
    };
  }

  async createGameEvent(type: string, description: string, affectedSystems: string[], effects: Record<string, any>): Promise<void> {
    this.createGameEventCalls.push({ type, description, affectedSystems, effects });
  }

  clear() {
    this.updatePlayerCalls = [];
    this.updateFleetCalls = [];
    this.moveFleetCalls = [];
    this.addCreditsCalls = [];
    this.deductCreditsCalls = [];
    this.transferResourcesCalls = [];
    this.processCombatCalls = [];
    this.createGameEventCalls = [];
  }
}

describe('ActionExecutor', () => {
  let executor: ActionExecutor;
  let gameState: MockGameStateMutator;

  beforeEach(() => {
    gameState = new MockGameStateMutator();
    executor = new ActionExecutor(gameState);
  });

  describe('Fleet Movement Execution', () => {
    it('should execute fleet movement successfully', async () => {
      const action = Action.createMoveFleet(
        'action-1',
        'player-1',
        'turn-1',
        'fleet-1',
        { x: 5, y: 3, z: 0 }
      );

      const result = await executor.executeAction(action);

      expect(result.result).toBe('success');
      expect(result.message).toContain('Fleet fleet-1 moved to coordinates (5, 3, 0)');
      expect(result.data).toEqual({
        fleetId: 'fleet-1',
        destination: { x: 5, y: 3, z: 0 }
      });
      expect(result.sideEffects).toContain('Fleet fleet-1 position updated');
      expect(gameState.moveFleetCalls).toHaveLength(1);
    });

    it('should handle fleet movement failure', async () => {
      // Mock failure
      gameState.moveFleet = jest.fn().mockRejectedValue(new Error('Fleet not found'));

      const action = Action.createMoveFleet(
        'action-1',
        'player-1',
        'turn-1',
        'fleet-1',
        { x: 5, y: 3, z: 0 }
      );

      const result = await executor.executeAction(action);

      expect(result.result).toBe('failed');
      expect(result.message).toBe('Failed to move fleet: Fleet not found');
    });
  });

  describe('Trade Execution', () => {
    it('should execute buy trade successfully', async () => {
      const action = Action.createTrade(
        'action-1',
        'player-1',
        'turn-1',
        'station-1',
        'ore',
        100, // buying 100 units
        50   // at 50 credits each
      );

      const result = await executor.executeAction(action);

      expect(result.result).toBe('success');
      expect(result.message).toBe('Purchased 100 units of ore for 5000 credits');
      expect(result.data).toEqual({
        resourceType: 'ore',
        quantity: 100,
        totalCost: 5000,
        isBuying: true
      });
      expect(gameState.deductCreditsCalls).toHaveLength(1);
      expect(gameState.deductCreditsCalls[0]).toEqual({ empireId: 'player-1', amount: 5000 });
    });

    it('should execute sell trade successfully', async () => {
      const action = Action.createTrade(
        'action-1',
        'player-1',
        'turn-1',
        'station-1',
        'crystals',
        -50, // selling 50 units
        100  // at 100 credits each
      );

      const result = await executor.executeAction(action);

      expect(result.result).toBe('success');
      expect(result.message).toBe('Sold 50 units of crystals for 5000 credits');
      expect(result.data).toEqual({
        resourceType: 'crystals',
        quantity: 50,
        revenue: 5000,
        isBuying: false
      });
      expect(gameState.addCreditsCalls).toHaveLength(1);
      expect(gameState.addCreditsCalls[0]).toEqual({ empireId: 'player-1', amount: 5000 });
    });

    it('should fail trade with insufficient credits', async () => {
      // Mock insufficient credits
      gameState.deductCreditsFromEmpire = jest.fn().mockResolvedValue(false);

      const action = Action.createTrade(
        'action-1',
        'player-1',
        'turn-1',
        'station-1',
        'ore',
        1000, // expensive purchase
        100
      );

      const result = await executor.executeAction(action);

      expect(result.result).toBe('failed');
      expect(result.message).toBe('Insufficient credits for purchase');
    });
  });

  describe('Combat Execution', () => {
    it('should execute attack successfully', async () => {
      const action = Action.createAttack(
        'action-1',
        'player-1',
        'turn-1',
        'attacker-fleet',
        'defender-fleet',
        'aggressive'
      );

      const result = await executor.executeAction(action);

      expect(result.result).toBe('success');
      expect(result.message).toContain('Combat between fleets attacker-fleet and defender-fleet');
      expect(result.message).toContain('Victor: attacker');
      expect(result.data).toHaveProperty('combatResult');
      expect(result.sideEffects).toContain('Combat resolved: attacker victorious');
      expect(result.sideEffects).toContain('Loot captured: 1000 credits');
      expect(gameState.processCombatCalls).toHaveLength(1);
    });

    it('should handle combat execution failure', async () => {
      // Mock combat failure
      gameState.processCombat = jest.fn().mockRejectedValue(new Error('Combat system error'));

      const action = Action.createAttack(
        'action-1',
        'player-1',
        'turn-1',
        'attacker-fleet',
        'defender-fleet'
      );

      const result = await executor.executeAction(action);

      expect(result.result).toBe('failed');
      expect(result.message).toBe('Combat execution failed: Combat system error');
    });
  });

  describe('Research Execution', () => {
    it('should execute research successfully', async () => {
      const action = Action.createResearch(
        'action-1',
        'player-1',
        'turn-1',
        'tech-warp-drive',
        500
      );

      const result = await executor.executeAction(action);

      expect(result.result).toBe('success');
      expect(result.message).toBe('Allocated 500 research points to tech-warp-drive');
      expect(result.data).toEqual({
        technologyId: 'tech-warp-drive',
        researchPoints: 500
      });
      expect(result.sideEffects).toContain('Research progress updated for tech-warp-drive');
    });
  });

  describe('Transfer Execution', () => {
    it('should execute resource transfer successfully', async () => {
      const action = new Action('action-1', 'player-1', 'turn-1', 'transfer', {
        fromId: 'fleet-1',
        toId: 'fleet-2',
        resourceType: 'fuel',
        quantity: 100
      });

      const result = await executor.executeAction(action);

      expect(result.result).toBe('success');
      expect(result.message).toBe('Transferred 100 fuel from fleet-1 to fleet-2');
      expect(result.data).toEqual({
        fromId: 'fleet-1',
        toId: 'fleet-2',
        resourceType: 'fuel',
        quantity: 100
      });
      expect(gameState.transferResourcesCalls).toHaveLength(1);
    });

    it('should fail transfer when resources unavailable', async () => {
      // Mock transfer failure
      gameState.transferResources = jest.fn().mockResolvedValue(false);

      const action = new Action('action-1', 'player-1', 'turn-1', 'transfer', {
        fromId: 'fleet-1',
        toId: 'fleet-2',
        resourceType: 'fuel',
        quantity: 100
      });

      const result = await executor.executeAction(action);

      expect(result.result).toBe('failed');
      expect(result.message).toBe('Transfer failed - insufficient resources or invalid target');
    });
  });

  describe('Batch Execution', () => {
    it('should execute multiple actions in priority order', async () => {
      const actions = [
        Action.createAttack('action-1', 'player-1', 'turn-1', 'fleet-1', 'fleet-2'), // Priority 10
        Action.createTrade('action-2', 'player-1', 'turn-1', 'station-1', 'ore', 100, 50), // Priority 8
        new Action('action-3', 'player-1', 'turn-1', 'diplomacy', {}), // Priority 1
        Action.createMoveFleet('action-4', 'player-1', 'turn-1', 'fleet-3', { x: 1, y: 1, z: 0 }) // Priority 6
      ];

      const results = await executor.executeActionBatch(actions);

      expect(results.size).toBe(4);
      
      // Check all results are successful
      for (const result of results.values()) {
        expect(result.result).toBe('success');
      }

      // Verify execution order by checking the execution log
      const log = executor.getExecutionLog();
      expect(log[0]).toContain('action-3'); // Diplomacy first (priority 1)
      expect(log[1]).toContain('action-4'); // Move fleet second (priority 6)
      expect(log[2]).toContain('action-2'); // Trade third (priority 8)
      expect(log[3]).toContain('action-1'); // Attack last (priority 10)
    });

    it('should continue execution even if some actions fail', async () => {
      // Make one action fail
      gameState.moveFleet = jest.fn().mockRejectedValue(new Error('Fleet movement failed'));

      const actions = [
        Action.createMoveFleet('action-1', 'player-1', 'turn-1', 'fleet-1', { x: 1, y: 1, z: 0 }),
        Action.createTrade('action-2', 'player-1', 'turn-1', 'station-1', 'ore', 100, 50)
      ];

      const results = await executor.executeActionBatch(actions);

      expect(results.size).toBe(2);
      expect(results.get('action-1')?.result).toBe('failed');
      expect(results.get('action-2')?.result).toBe('success');
    });
  });

  describe('Error Handling', () => {
    it('should handle unknown action types', async () => {
      const action = new Action('action-1', 'player-1', 'turn-1', 'unknown_type' as any);

      const result = await executor.executeAction(action);

      expect(result.result).toBe('failed');
      expect(result.message).toBe('Unknown action type: unknown_type');
    });

    it('should handle execution exceptions gracefully', async () => {
      // Mock a generic error
      gameState.moveFleet = jest.fn().mockRejectedValue(new Error('Database connection lost'));

      const action = Action.createMoveFleet('action-1', 'player-1', 'turn-1', 'fleet-1', { x: 1, y: 1, z: 0 });

      const result = await executor.executeAction(action);

      expect(result.result).toBe('failed');
      expect(result.message).toBe('Execution error: Database connection lost');
    });
  });

  describe('Logging', () => {
    it('should maintain execution log', async () => {
      const action = Action.createTrade('action-1', 'player-1', 'turn-1', 'station-1', 'ore', 100, 50);

      await executor.executeAction(action);

      const log = executor.getExecutionLog();
      expect(log.length).toBeGreaterThan(0);
      expect(log[0]).toContain('Executing action action-1 (trade) for player player-1');
    });

    it('should clear execution log', async () => {
      const action = Action.createTrade('action-1', 'player-1', 'turn-1', 'station-1', 'ore', 100, 50);
      
      await executor.executeAction(action);
      expect(executor.getExecutionLog().length).toBeGreaterThan(0);
      
      executor.clearLog();
      expect(executor.getExecutionLog().length).toBe(0);
    });
  });

  describe('Placeholder Actions', () => {
    // Test the placeholder implementations
    it('should execute placeholder actions successfully', async () => {
      const placeholderActions = [
        new Action('colonize-1', 'player-1', 'turn-1', 'colonize'),
        new Action('build-1', 'player-1', 'turn-1', 'build_ships'),
        new Action('diplomacy-1', 'player-1', 'turn-1', 'diplomacy'),
        new Action('mine-1', 'player-1', 'turn-1', 'mine'),
        new Action('repair-1', 'player-1', 'turn-1', 'repair')
      ];

      for (const action of placeholderActions) {
        const result = await executor.executeAction(action);
        expect(result.result).toBe('success');
        expect(result.message).toContain('placeholder');
      }
    });
  });
});
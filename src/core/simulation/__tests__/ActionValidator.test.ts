import { ActionValidator, GameStateProvider } from '../ActionValidator';
import { Action } from '../../entities/Action';
import { Player } from '../../entities/Player';

// Mock game state provider
class MockGameStateProvider implements GameStateProvider {
  private players = new Map<string, any>();
  private fleets = new Map<string, any>();
  private systems = new Map<string, any>();
  private empires = new Map<string, any>();

  async getPlayer(playerId: string) {
    return this.players.get(playerId) || null;
  }

  async getFleet(fleetId: string) {
    return this.fleets.get(fleetId) || null;
  }

  async getSystem(systemId: string) {
    return this.systems.get(systemId) || null;
  }

  async getEmpire(empireId: string) {
    return this.empires.get(empireId) || null;
  }

  async getPlayerFleets(playerId: string) {
    return Array.from(this.fleets.values()).filter(fleet => fleet.playerId === playerId);
  }

  calculateDistance(from: any, to: any): number {
    const dx = from.x - to.x;
    const dy = from.y - to.y;
    const dz = (from.z || 0) - (to.z || 0);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  async isSystemAccessible(_systemId: string, _playerId: string): Promise<boolean> {
    return true; // Default to accessible
  }

  // Helper methods for testing
  setPlayer(id: string, player: any) {
    this.players.set(id, player);
  }

  setFleet(id: string, fleet: any) {
    this.fleets.set(id, fleet);
  }

  setSystem(id: string, system: any) {
    this.systems.set(id, system);
  }

  setEmpire(id: string, empire: any) {
    this.empires.set(id, empire);
  }

  clear() {
    this.players.clear();
    this.fleets.clear();
    this.systems.clear();
    this.empires.clear();
  }
}

describe('ActionValidator', () => {
  let validator: ActionValidator;
  let gameState: MockGameStateProvider;
  let player: Player;

  beforeEach(() => {
    gameState = new MockGameStateProvider();
    validator = new ActionValidator(gameState);
    
    // Set up test player
    player = new Player('player-1', 'TestPlayer', 'test@example.com', 'terran_federation');
    player.empireId = 'empire-1';
    player.credits = 10000;
    gameState.setPlayer('player-1', player);
    
    // Set up test empire
    gameState.setEmpire('empire-1', {
      id: 'empire-1',
      playerId: 'player-1',
      name: 'Test Empire'
    });
  });

  describe('Player Validation', () => {
    it('should reject actions for non-existent players', async () => {
      const action = new Action('action-1', 'nonexistent', 'turn-1', 'trade');
      
      const result = await validator.validateAction(action);
      
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Player not found');
      expect(result.errorCode).toBe('PLAYER_NOT_FOUND');
    });

    it('should reject actions for inactive players', async () => {
      player.isActive = false;
      gameState.setPlayer('player-1', player);
      
      const action = new Action('action-1', 'player-1', 'turn-1', 'trade');
      
      const result = await validator.validateAction(action);
      
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Player account is not active');
      expect(result.errorCode).toBe('PLAYER_INACTIVE');
    });

    it('should reject actions for banned players', async () => {
      player.isBanned = true;
      gameState.setPlayer('player-1', player);
      
      const action = new Action('action-1', 'player-1', 'turn-1', 'trade');
      
      const result = await validator.validateAction(action);
      
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Player account is not active');
      expect(result.errorCode).toBe('PLAYER_INACTIVE');
    });
  });

  describe('Move Fleet Validation', () => {
    beforeEach(() => {
      // Set up test fleet
      gameState.setFleet('fleet-1', {
        id: 'fleet-1',
        empireId: 'empire-1',
        position: { x: 0, y: 0, z: 0 },
        maxRange: 10,
        status: 'idle'
      });
    });

    it('should validate successful fleet movement', async () => {
      const action = Action.createMoveFleet(
        'action-1',
        'player-1',
        'turn-1',
        'fleet-1',
        { x: 5, y: 3, z: 0 }
      );
      
      const result = await validator.validateAction(action);
      
      expect(result.isValid).toBe(true);
    });

    it('should reject movement with missing fleet ID', async () => {
      const action = new Action('action-1', 'player-1', 'turn-1', 'move_fleet', {
        destination: { x: 5, y: 3, z: 0 }
      });
      
      const result = await validator.validateAction(action);
      
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Fleet ID is required');
      expect(result.errorCode).toBe('MISSING_FLEET_ID');
    });

    it('should reject movement of non-existent fleet', async () => {
      const action = Action.createMoveFleet(
        'action-1',
        'player-1',
        'turn-1',
        'nonexistent-fleet',
        { x: 5, y: 3, z: 0 }
      );
      
      const result = await validator.validateAction(action);
      
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Fleet not found');
      expect(result.errorCode).toBe('FLEET_NOT_FOUND');
    });

    it('should reject movement of fleet not owned by player', async () => {
      gameState.setFleet('enemy-fleet', {
        id: 'enemy-fleet',
        empireId: 'enemy-empire',
        position: { x: 0, y: 0, z: 0 },
        maxRange: 10,
        status: 'idle'
      });
      
      const action = Action.createMoveFleet(
        'action-1',
        'player-1',
        'turn-1',
        'enemy-fleet',
        { x: 5, y: 3, z: 0 }
      );
      
      const result = await validator.validateAction(action);
      
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Fleet not owned by player');
      expect(result.errorCode).toBe('FLEET_NOT_OWNED');
    });

    it('should reject movement of busy fleet', async () => {
      gameState.setFleet('fleet-1', {
        id: 'fleet-1',
        empireId: 'empire-1',
        position: { x: 0, y: 0, z: 0 },
        maxRange: 10,
        status: 'in_transit'
      });
      
      const action = Action.createMoveFleet(
        'action-1',
        'player-1',
        'turn-1',
        'fleet-1',
        { x: 5, y: 3, z: 0 }
      );
      
      const result = await validator.validateAction(action);
      
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Fleet is in_transit');
      expect(result.errorCode).toBe('FLEET_BUSY');
    });

    it('should reject movement out of range', async () => {
      const action = Action.createMoveFleet(
        'action-1',
        'player-1',
        'turn-1',
        'fleet-1',
        { x: 20, y: 20, z: 0 } // Distance > 10
      );
      
      const result = await validator.validateAction(action);
      
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Destination out of range');
      expect(result.errorCode).toBe('OUT_OF_RANGE');
    });

    it('should reject invalid coordinates', async () => {
      const action = new Action('action-1', 'player-1', 'turn-1', 'move_fleet', {
        fleetId: 'fleet-1',
        destination: { x: NaN, y: 5, z: 0 }
      });
      
      const result = await validator.validateAction(action);
      
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Invalid destination coordinates');
      expect(result.errorCode).toBe('INVALID_COORDINATES');
    });
  });

  describe('Trade Validation', () => {
    it('should validate successful trade action', async () => {
      const action = Action.createTrade(
        'action-1',
        'player-1',
        'turn-1',
        'station-1',
        'ore',
        100, // quantity
        50   // max price
      );
      
      const result = await validator.validateAction(action);
      
      expect(result.isValid).toBe(true);
    });

    it('should reject trade with missing parameters', async () => {
      const action = new Action('action-1', 'player-1', 'turn-1', 'trade', {
        stationId: 'station-1'
        // Missing resourceType, quantity
      });
      
      const result = await validator.validateAction(action);
      
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Missing required trade parameters');
      expect(result.errorCode).toBe('MISSING_TRADE_PARAMS');
    });

    it('should reject trade with insufficient credits', async () => {
      player.credits = 100; // Not enough for trade
      gameState.setPlayer('player-1', player);
      
      const action = Action.createTrade(
        'action-1',
        'player-1',
        'turn-1',
        'station-1',
        'ore',
        1000, // quantity
        50    // max price (total cost: 50,000)
      );
      
      const result = await validator.validateAction(action);
      
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('Insufficient credits');
      expect(result.errorCode).toBe('INSUFFICIENT_CREDITS');
    });
  });

  describe('Attack Validation', () => {
    beforeEach(() => {
      // Set up attacker fleet
      gameState.setFleet('attacker-fleet', {
        id: 'attacker-fleet',
        empireId: 'empire-1',
        position: { x: 5, y: 5, z: 0 },
        ships: [{ id: 'ship-1', class: 'destroyer' }]
      });
      
      // Set up target fleet
      gameState.setFleet('target-fleet', {
        id: 'target-fleet',
        empireId: 'enemy-empire',
        position: { x: 5, y: 5, z: 0 }, // Same location
        ships: [{ id: 'ship-2', class: 'destroyer' }]
      });
    });

    it('should validate successful attack action', async () => {
      const action = Action.createAttack(
        'action-1',
        'player-1',
        'turn-1',
        'attacker-fleet',
        'target-fleet'
      );
      
      const result = await validator.validateAction(action);
      
      expect(result.isValid).toBe(true);
    });

    it('should reject attack with missing fleet IDs', async () => {
      const action = new Action('action-1', 'player-1', 'turn-1', 'attack', {
        attackerFleetId: 'attacker-fleet'
        // Missing targetFleetId
      });
      
      const result = await validator.validateAction(action);
      
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Missing fleet IDs for attack');
      expect(result.errorCode).toBe('MISSING_FLEET_IDS');
    });

    it('should reject attack when fleets not found', async () => {
      const action = Action.createAttack(
        'action-1',
        'player-1',
        'turn-1',
        'nonexistent-attacker',
        'target-fleet'
      );
      
      const result = await validator.validateAction(action);
      
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('One or both fleets not found');
      expect(result.errorCode).toBe('FLEET_NOT_FOUND');
    });

    it('should reject attack when attacker not owned by player', async () => {
      gameState.setFleet('enemy-attacker', {
        id: 'enemy-attacker',
        empireId: 'enemy-empire',
        position: { x: 5, y: 5, z: 0 },
        ships: [{ id: 'ship-3', class: 'destroyer' }]
      });
      
      const action = Action.createAttack(
        'action-1',
        'player-1',
        'turn-1',
        'enemy-attacker',
        'target-fleet'
      );
      
      const result = await validator.validateAction(action);
      
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Attacker fleet not owned by player');
      expect(result.errorCode).toBe('FLEET_NOT_OWNED');
    });

    it('should reject attack when fleets not co-located', async () => {
      gameState.setFleet('target-fleet', {
        id: 'target-fleet',
        empireId: 'enemy-empire',
        position: { x: 10, y: 10, z: 0 }, // Different location
        ships: [{ id: 'ship-2', class: 'destroyer' }]
      });
      
      const action = Action.createAttack(
        'action-1',
        'player-1',
        'turn-1',
        'attacker-fleet',
        'target-fleet'
      );
      
      const result = await validator.validateAction(action);
      
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Fleets must be in the same location to attack');
      expect(result.errorCode).toBe('FLEETS_NOT_COLLOCATED');
    });

    it('should reject attack with no ships', async () => {
      gameState.setFleet('attacker-fleet', {
        id: 'attacker-fleet',
        empireId: 'empire-1',
        position: { x: 5, y: 5, z: 0 },
        ships: [] // No ships
      });
      
      const action = Action.createAttack(
        'action-1',
        'player-1',
        'turn-1',
        'attacker-fleet',
        'target-fleet'
      );
      
      const result = await validator.validateAction(action);
      
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Attacker fleet has no ships');
      expect(result.errorCode).toBe('NO_SHIPS');
    });

    it('should reject self-attack', async () => {
      gameState.setFleet('friendly-fleet', {
        id: 'friendly-fleet',
        empireId: 'empire-1', // Same empire
        position: { x: 5, y: 5, z: 0 },
        ships: [{ id: 'ship-2', class: 'destroyer' }]
      });
      
      const action = Action.createAttack(
        'action-1',
        'player-1',
        'turn-1',
        'attacker-fleet',
        'friendly-fleet'
      );
      
      const result = await validator.validateAction(action);
      
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Cannot attack own fleet');
      expect(result.errorCode).toBe('SELF_ATTACK');
    });
  });

  describe('Research Validation', () => {
    it('should validate successful research action', async () => {
      const action = Action.createResearch(
        'action-1',
        'player-1',
        'turn-1',
        'tech-warp-drive',
        500
      );
      
      const result = await validator.validateAction(action);
      
      expect(result.isValid).toBe(true);
    });

    it('should reject research with invalid parameters', async () => {
      const action = new Action('action-1', 'player-1', 'turn-1', 'research', {
        technologyId: '',
        researchPoints: 0
      });
      
      const result = await validator.validateAction(action);
      
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Invalid research parameters');
      expect(result.errorCode).toBe('INVALID_RESEARCH_PARAMS');
    });
  });

  describe('Batch Validation', () => {
    it('should validate multiple actions successfully', async () => {
      const actions = [
        Action.createTrade('action-1', 'player-1', 'turn-1', 'station-1', 'ore', 100, 50),
        Action.createResearch('action-2', 'player-1', 'turn-1', 'tech-1', 500)
      ];
      
      const results = await validator.validateActionBatch(actions);
      
      expect(results.size).toBe(2);
      expect(results.get('action-1')?.isValid).toBe(true);
      expect(results.get('action-2')?.isValid).toBe(true);
    });

    it('should detect fleet conflicts in batch validation', async () => {
      gameState.setFleet('fleet-1', {
        id: 'fleet-1',
        empireId: 'empire-1',
        position: { x: 0, y: 0, z: 0 },
        maxRange: 10,
        status: 'idle'
      });
      
      const actions = [
        Action.createMoveFleet('action-1', 'player-1', 'turn-1', 'fleet-1', { x: 5, y: 3, z: 0 }),
        Action.createMoveFleet('action-2', 'player-1', 'turn-1', 'fleet-1', { x: 8, y: 2, z: 0 })
      ];
      
      // Add slight delay to ensure different submission times
      actions[1].submittedAt = new Date(actions[0].submittedAt.getTime() + 1000);
      
      const results = await validator.validateActionBatch(actions);
      
      expect(results.get('action-1')?.isValid).toBe(true);
      expect(results.get('action-2')?.isValid).toBe(false);
      expect(results.get('action-2')?.errorCode).toBe('FLEET_CONFLICT');
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors gracefully', async () => {
      // Mock game state to throw error
      gameState.getPlayer = jest.fn().mockRejectedValue(new Error('Database error'));
      
      const action = new Action('action-1', 'player-1', 'turn-1', 'trade');
      
      const result = await validator.validateAction(action);
      
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Validation error: Database error');
      expect(result.errorCode).toBe('VALIDATION_ERROR');
    });

    it('should handle unknown action types', async () => {
      const action = new Action('action-1', 'player-1', 'turn-1', 'unknown_type' as any);
      
      const result = await validator.validateAction(action);
      
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Unknown action type: unknown_type');
      expect(result.errorCode).toBe('UNKNOWN_ACTION_TYPE');
    });
  });

  describe('Placeholder Validations', () => {
    // These test the placeholder validations that always return true
    it('should validate colonize actions (placeholder)', async () => {
      const action = new Action('action-1', 'player-1', 'turn-1', 'colonize');
      const result = await validator.validateAction(action);
      expect(result.isValid).toBe(true);
    });

    it('should validate build ships actions (placeholder)', async () => {
      const action = new Action('action-1', 'player-1', 'turn-1', 'build_ships');
      const result = await validator.validateAction(action);
      expect(result.isValid).toBe(true);
    });

    it('should validate diplomacy actions (placeholder)', async () => {
      const action = new Action('action-1', 'player-1', 'turn-1', 'diplomacy');
      const result = await validator.validateAction(action);
      expect(result.isValid).toBe(true);
    });

    it('should validate mine actions (placeholder)', async () => {
      const action = new Action('action-1', 'player-1', 'turn-1', 'mine');
      const result = await validator.validateAction(action);
      expect(result.isValid).toBe(true);
    });

    it('should validate transfer actions (placeholder)', async () => {
      const action = new Action('action-1', 'player-1', 'turn-1', 'transfer');
      const result = await validator.validateAction(action);
      expect(result.isValid).toBe(true);
    });

    it('should validate repair actions (placeholder)', async () => {
      const action = new Action('action-1', 'player-1', 'turn-1', 'repair');
      const result = await validator.validateAction(action);
      expect(result.isValid).toBe(true);
    });
  });
});
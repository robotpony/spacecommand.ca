/**
 * Tests for CombatResolver service
 */

const CombatResolver = require('../../src/server/services/CombatResolver');
const BaseModel = require('../../src/server/models/BaseModel');

// Mock the BaseModel
jest.mock('../../src/server/models/BaseModel');

describe('CombatResolver', () => {
  let combatResolver;
  let mockCombatModel;
  let mockFleetModel;
  let mockEmpireModel;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock instances
    mockCombatModel = {
      create: jest.fn(),
      update: jest.fn(),
      transaction: jest.fn()
    };
    
    mockFleetModel = {
      findById: jest.fn(),
      update: jest.fn()
    };
    
    mockEmpireModel = {
      findById: jest.fn()
    };

    // Mock BaseModel constructor
    BaseModel.mockImplementation((tableName) => {
      if (tableName === 'combat_records') return mockCombatModel;
      if (tableName === 'fleets') return mockFleetModel;
      if (tableName === 'empires') return mockEmpireModel;
      return {};
    });

    combatResolver = new CombatResolver();
  });

  describe('calculateDamage', () => {
    it('should calculate basic damage correctly', () => {
      const damage = combatResolver.calculateDamage('destroyer', 'cruiser');
      
      expect(damage).toBeGreaterThan(0);
      expect(typeof damage).toBe('number');
    });

    it('should apply weapon effectiveness modifiers', () => {
      // Heavy weapons vs light armor should be more effective
      const heavyVsLight = combatResolver.calculateDamage('battleship', 'scout');
      // Light weapons vs heavy armor should be less effective  
      const lightVsHeavy = combatResolver.calculateDamage('scout', 'battleship');
      
      expect(heavyVsLight).toBeGreaterThan(lightVsHeavy);
    });

    it('should apply experience bonus modifier', () => {
      const baseDamage = combatResolver.calculateDamage('destroyer', 'cruiser');
      const experienceDamage = combatResolver.calculateDamage('destroyer', 'cruiser', {
        experience_bonus: true,
        experience_level: 2
      });
      
      expect(experienceDamage).toBeGreaterThan(baseDamage);
    });

    it('should apply morale modifier', () => {
      const lowMoraleDamage = combatResolver.calculateDamage('destroyer', 'cruiser', {
        morale_modifier: true,
        morale: 25 // Low morale
      });
      
      const highMoraleDamage = combatResolver.calculateDamage('destroyer', 'cruiser', {
        morale_modifier: true,
        morale: 75 // High morale
      });
      
      expect(highMoraleDamage).toBeGreaterThan(lowMoraleDamage);
    });

    it('should apply surprise attack bonus', () => {
      const normalDamage = combatResolver.calculateDamage('destroyer', 'cruiser');
      const surpriseDamage = combatResolver.calculateDamage('destroyer', 'cruiser', {
        surprise_attack: true
      });
      
      expect(surpriseDamage).toBeGreaterThan(normalDamage);
    });

    it('should throw error for invalid ship types', () => {
      expect(() => {
        combatResolver.calculateDamage('invalid_ship', 'cruiser');
      }).toThrow('Invalid ship types for damage calculation');
    });
  });

  describe('calculateFleetPower', () => {
    it('should calculate fleet power correctly', () => {
      const mockFleet = {
        id: 1,
        composition: JSON.stringify({
          destroyer: 5,
          cruiser: 2,
          scout: 10
        }),
        experience: 3,
        morale: 70
      };

      const result = combatResolver.calculateFleetPower(mockFleet);

      expect(result.fleet_id).toBe(1);
      expect(result.base_power).toBeGreaterThan(0);
      expect(result.effective_power).toBeGreaterThan(result.base_power); // Due to experience and morale
      expect(result.experience_multiplier).toBeGreaterThan(1);
      expect(result.morale_multiplier).toBeGreaterThan(1);
      expect(result.ship_breakdown).toHaveProperty('destroyer');
      expect(result.ship_breakdown).toHaveProperty('cruiser');
      expect(result.ship_breakdown).toHaveProperty('scout');
    });

    it('should handle empty fleet composition', () => {
      const mockFleet = {
        id: 1,
        composition: JSON.stringify({}),
        experience: 0,
        morale: 50
      };

      const result = combatResolver.calculateFleetPower(mockFleet);

      expect(result.base_power).toBe(0);
      expect(result.total_health).toBe(0);
      expect(result.effective_power).toBe(0);
    });

    it('should apply experience and morale modifiers correctly', () => {
      const mockFleet = {
        id: 1,
        composition: JSON.stringify({ destroyer: 1 }),
        experience: 5,
        morale: 80
      };

      const result = combatResolver.calculateFleetPower(mockFleet);

      // Experience: 1 + (5 * 0.1) = 1.5
      expect(result.experience_multiplier).toBeCloseTo(1.5);
      
      // Morale: 1 + ((80-50)/50 * 0.2) = 1.12
      expect(result.morale_multiplier).toBeCloseTo(1.12);
    });
  });

  describe('resolveCombat', () => {
    it('should resolve combat between two fleets', async () => {
      const attackerFleet = {
        id: 1,
        empire_id: 1,
        location: 'sector_1_1',
        composition: JSON.stringify({ destroyer: 3, cruiser: 1 }),
        experience: 2,
        morale: 60,
        status: 'active'
      };

      const defenderFleet = {
        id: 2,
        empire_id: 2,
        location: 'sector_1_1',
        composition: JSON.stringify({ destroyer: 2, cruiser: 2 }),
        experience: 1,
        morale: 55,
        status: 'active'
      };

      mockFleetModel.findById
        .mockResolvedValueOnce(attackerFleet)
        .mockResolvedValueOnce(defenderFleet);

      mockCombatModel.transaction.mockImplementation(async (callback) => {
        return await callback({});
      });

      mockCombatModel.create.mockResolvedValue({
        id: 'combat-1',
        attacker_fleet_id: 1,
        defender_fleet_id: 2
      });

      mockCombatModel.update.mockResolvedValue({});
      mockFleetModel.update.mockResolvedValue({});

      // Mock the private methods
      combatResolver._validateCombatReadiness = jest.fn();
      combatResolver._initializeCombatState = jest.fn().mockReturnValue({
        attacker: { 
          fleet: attackerFleet, 
          composition: { destroyer: 3, cruiser: 1 },
          current_health: 500
        },
        defender: { 
          fleet: defenderFleet, 
          composition: { destroyer: 2, cruiser: 2 },
          current_health: 600
        },
        combat_ended: false,
        retreat_triggered: false,
        initial: {}
      });
      combatResolver._executeCombatRound = jest.fn().mockReturnValue({
        round: 1,
        actions: [],
        casualties: { attacker: {}, defender: {} }
      });
      combatResolver._checkCombatEndConditions = jest.fn().mockImplementation((state) => {
        state.combat_ended = true; // End after one round for test
      });
      combatResolver._finalizeCombatResult = jest.fn().mockReturnValue({
        winner: 'attacker',
        result_type: 'decisive_victory',
        rounds_fought: 1,
        final_compositions: {
          attacker: { destroyer: 2, cruiser: 1 },
          defender: { destroyer: 0, cruiser: 1 }
        }
      });
      combatResolver._updateFleetsAfterCombat = jest.fn();

      const result = await combatResolver.resolveCombat(1, 2);

      expect(result.combat_id).toBe('combat-1');
      expect(result.result.winner).toBe('attacker');
      expect(result.rounds).toHaveLength(1);
      expect(mockCombatModel.create).toHaveBeenCalled();
      expect(mockCombatModel.update).toHaveBeenCalled();
    });

    it('should throw error for fleets not found', async () => {
      mockFleetModel.findById
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      await expect(combatResolver.resolveCombat(999, 998))
        .rejects.toThrow('One or both fleets not found');
    });
  });

  describe('updateFleetExperience', () => {
    it('should update experience and morale after victory', async () => {
      const mockFleet = {
        id: 1,
        experience: 2,
        morale: 60
      };

      const combatResult = {
        participated: true,
        victory: true,
        retreat: false,
        enemy_power: 1000,
        own_power: 1200
      };

      mockFleetModel.update.mockResolvedValue({});

      const result = await combatResolver.updateFleetExperience(mockFleet, combatResult, {});

      expect(result.experience_change).toBeGreaterThan(0);
      expect(result.morale_change).toBe(10); // Victory bonus
      expect(result.new_experience).toBeGreaterThan(2);
      expect(result.new_morale).toBe(70);
    });

    it('should penalize experience and morale after defeat', async () => {
      const mockFleet = {
        id: 1,
        experience: 3,
        morale: 60
      };

      const combatResult = {
        participated: true,
        victory: false,
        retreat: false,
        enemy_power: 1500,
        own_power: 800
      };

      mockFleetModel.update.mockResolvedValue({});

      const result = await combatResolver.updateFleetExperience(mockFleet, combatResult, {});

      expect(result.morale_change).toBe(-15); // Defeat penalty
      expect(result.new_morale).toBe(45);
    });

    it('should give bonus experience for fighting stronger enemy', async () => {
      const mockFleet = {
        id: 1,
        experience: 1,
        morale: 50
      };

      const combatResult = {
        participated: true,
        victory: true,
        retreat: false,
        enemy_power: 2000, // Much stronger enemy
        own_power: 1000
      };

      mockFleetModel.update.mockResolvedValue({});

      const result = await combatResolver.updateFleetExperience(mockFleet, combatResult, {});

      expect(result.experience_change).toBeGreaterThan(2); // Base victory (2) + underdog bonus (1)
    });

    it('should apply diminishing returns on experience', async () => {
      const highExpFleet = {
        id: 1,
        experience: 10, // Very experienced
        morale: 50
      };

      const combatResult = {
        participated: true,
        victory: true,
        retreat: false,
        enemy_power: 1000,
        own_power: 1000
      };

      mockFleetModel.update.mockResolvedValue({});

      const result = await combatResolver.updateFleetExperience(highExpFleet, combatResult, {});

      // Experience gain should be reduced due to diminishing returns
      expect(result.experience_change).toBeLessThan(2);
    });

    it('should clamp morale between 0 and 100', async () => {
      const lowMoraleFleet = {
        id: 1,
        experience: 1,
        morale: 5 // Very low morale
      };

      const combatResult = {
        participated: true,
        victory: false,
        retreat: false,
        enemy_power: 1000,
        own_power: 800
      };

      mockFleetModel.update.mockResolvedValue({});

      const result = await combatResolver.updateFleetExperience(lowMoraleFleet, combatResult, {});

      expect(result.new_morale).toBe(0); // Cannot go below 0
    });
  });

  describe('_validateCombatReadiness', () => {
    it('should allow combat between different empires in same location', () => {
      const attackerFleet = {
        empire_id: 1,
        location: 'sector_1_1',
        status: 'active',
        composition: JSON.stringify({ destroyer: 2 })
      };

      const defenderFleet = {
        empire_id: 2,
        location: 'sector_1_1',
        status: 'active',
        composition: JSON.stringify({ cruiser: 1 })
      };

      expect(() => {
        combatResolver._validateCombatReadiness(attackerFleet, defenderFleet);
      }).not.toThrow();
    });

    it('should prevent combat between same empire fleets', () => {
      const attackerFleet = { empire_id: 1 };
      const defenderFleet = { empire_id: 1 };

      expect(() => {
        combatResolver._validateCombatReadiness(attackerFleet, defenderFleet);
      }).toThrow('Cannot attack your own fleet');
    });

    it('should prevent combat between fleets in different locations', () => {
      const attackerFleet = {
        empire_id: 1,
        location: 'sector_1_1'
      };
      const defenderFleet = {
        empire_id: 2,
        location: 'sector_2_2'
      };

      expect(() => {
        combatResolver._validateCombatReadiness(attackerFleet, defenderFleet);
      }).toThrow('Fleets must be in the same location');
    });

    it('should prevent combat with destroyed fleets', () => {
      const attackerFleet = {
        empire_id: 1,
        location: 'sector_1_1',
        status: 'destroyed'
      };
      const defenderFleet = {
        empire_id: 2,
        location: 'sector_1_1',
        status: 'active'
      };

      expect(() => {
        combatResolver._validateCombatReadiness(attackerFleet, defenderFleet);
      }).toThrow('Cannot engage destroyed fleets');
    });

    it('should prevent combat with empty fleets', () => {
      const attackerFleet = {
        empire_id: 1,
        location: 'sector_1_1',
        status: 'active',
        composition: JSON.stringify({})
      };
      const defenderFleet = {
        empire_id: 2,
        location: 'sector_1_1',
        status: 'active',
        composition: JSON.stringify({ destroyer: 1 })
      };

      expect(() => {
        combatResolver._validateCombatReadiness(attackerFleet, defenderFleet);
      }).toThrow('Both fleets must have ships');
    });
  });

  describe('_calculateAverageSpeed', () => {
    it('should calculate average speed correctly', () => {
      const composition = {
        scout: 2,     // Speed 8
        destroyer: 1, // Speed 5
        cruiser: 1    // Speed 4
      };

      const avgSpeed = combatResolver._calculateAverageSpeed(composition);
      
      // (8*2 + 5*1 + 4*1) / 4 = 25/4 = 6.25
      expect(avgSpeed).toBeCloseTo(6.25);
    });

    it('should return 0 for empty composition', () => {
      const avgSpeed = combatResolver._calculateAverageSpeed({});
      expect(avgSpeed).toBe(0);
    });
  });
});

module.exports = {};
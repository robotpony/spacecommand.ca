/**
 * Tests for ResourceCalculator service
 */

const ResourceCalculator = require('../../src/server/services/ResourceCalculator');
const BaseModel = require('../../src/server/models/BaseModel');

// Mock the BaseModel
jest.mock('../../src/server/models/BaseModel');

describe('ResourceCalculator', () => {
  let resourceCalculator;
  let mockEmpireModel;
  let mockPlanetModel;
  let mockFleetModel;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock instances
    mockEmpireModel = {
      findById: jest.fn(),
      update: jest.fn(),
      transaction: jest.fn()
    };
    
    mockPlanetModel = {
      find: jest.fn()
    };
    
    mockFleetModel = {
      find: jest.fn()
    };

    // Mock BaseModel constructor
    BaseModel.mockImplementation((tableName) => {
      if (tableName === 'empires') return mockEmpireModel;
      if (tableName === 'planets') return mockPlanetModel;
      if (tableName === 'fleets') return mockFleetModel;
      return {};
    });

    resourceCalculator = new ResourceCalculator();
  });

  describe('calculateProduction', () => {
    it('should calculate production for empire with planets', async () => {
      const mockEmpire = { id: 1, name: 'Test Empire' };
      const mockPlanets = [
        {
          id: 1,
          name: 'Mining World',
          planet_type: 'mining',
          buildings: JSON.stringify({ mining_facility: 2 })
        },
        {
          id: 2,
          name: 'Energy World',
          planet_type: 'energy',
          buildings: JSON.stringify({})
        }
      ];

      mockEmpireModel.findById.mockResolvedValue(mockEmpire);
      mockPlanetModel.find.mockResolvedValue(mockPlanets);

      const result = await resourceCalculator.calculateProduction(1);

      expect(result.empire_id).toBe(1);
      expect(result.total_production).toHaveProperty('metal');
      expect(result.total_production).toHaveProperty('energy');
      expect(result.total_production).toHaveProperty('food');
      expect(result.total_production).toHaveProperty('research');
      expect(result.breakdown).toHaveLength(2);
      expect(result.breakdown[0].planet_type).toBe('mining');
    });

    it('should throw error for non-existent empire', async () => {
      mockEmpireModel.findById.mockResolvedValue(null);

      await expect(resourceCalculator.calculateProduction(999))
        .rejects.toThrow('Empire not found');
    });
  });

  describe('calculateConsumption', () => {
    it('should calculate consumption from buildings and fleets', async () => {
      const mockEmpire = { id: 1, name: 'Test Empire' };
      const mockPlanets = [
        {
          id: 1,
          name: 'Planet 1',
          buildings: JSON.stringify({ research_lab: 1, factory: 2 })
        }
      ];
      const mockFleets = [
        {
          id: 1,
          name: 'Fleet Alpha',
          composition: JSON.stringify({ destroyer: 5, cruiser: 2 })
        }
      ];

      mockEmpireModel.findById.mockResolvedValue(mockEmpire);
      mockPlanetModel.find.mockResolvedValue(mockPlanets);
      mockFleetModel.find.mockResolvedValue(mockFleets);

      const result = await resourceCalculator.calculateConsumption(1);

      expect(result.empire_id).toBe(1);
      expect(result.total_consumption).toHaveProperty('metal');
      expect(result.breakdown).toHaveProperty('buildings');
      expect(result.breakdown).toHaveProperty('fleets');
      expect(result.breakdown.buildings).toHaveLength(1);
      expect(result.breakdown.fleets).toHaveLength(1);
    });
  });

  describe('calculateNetResources', () => {
    it('should calculate net resource changes', async () => {
      // Mock the production and consumption methods
      resourceCalculator.calculateProduction = jest.fn().mockResolvedValue({
        total_production: { metal: 500, energy: 400, food: 300, research: 200 }
      });
      
      resourceCalculator.calculateConsumption = jest.fn().mockResolvedValue({
        total_consumption: { metal: 200, energy: 250, food: 150, research: 50 }
      });

      const result = await resourceCalculator.calculateNetResources(1);

      expect(result.net_change.metal).toBe(300);
      expect(result.net_change.energy).toBe(150);
      expect(result.net_change.food).toBe(150);
      expect(result.net_change.research).toBe(150);
      expect(result.is_sustainable).toBe(true);
      expect(result.efficiency.metal).toBeCloseTo(0.6); // (500-200)/500
    });

    it('should identify unsustainable resource usage', async () => {
      resourceCalculator.calculateProduction = jest.fn().mockResolvedValue({
        total_production: { metal: 100, energy: 50, food: 200, research: 100 }
      });
      
      resourceCalculator.calculateConsumption = jest.fn().mockResolvedValue({
        total_consumption: { metal: 150, energy: 100, food: 100, research: 50 }
      });

      const result = await resourceCalculator.calculateNetResources(1);

      expect(result.net_change.metal).toBe(-50);
      expect(result.net_change.energy).toBe(-50);
      expect(result.is_sustainable).toBe(false);
    });
  });

  describe('processResourceProduction', () => {
    it('should process resource production and update empire', async () => {
      const mockEmpire = {
        id: 1,
        metal: 1000,
        energy: 800,
        food: 600,
        research: 400
      };

      const mockNetResources = {
        production: { metal: 500, energy: 400, food: 300, research: 200 },
        net_change: { metal: 300, energy: 150, food: 200, research: 150 }
      };

      mockEmpireModel.findById.mockResolvedValue(mockEmpire);
      mockEmpireModel.update.mockResolvedValue({
        ...mockEmpire,
        metal: 1300,
        energy: 950,
        food: 800,
        research: 550,
        updated_at: '2024-01-01T12:00:00.000Z'
      });

      resourceCalculator.calculateNetResources = jest.fn().mockResolvedValue(mockNetResources);

      const result = await resourceCalculator.processResourceProduction(1);

      expect(result.updated_resources.metal).toBe(1300);
      expect(result.updated_resources.energy).toBe(950);
      expect(result.resource_changes).toEqual(mockNetResources.net_change);
      expect(mockEmpireModel.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          metal: 1300,
          energy: 950,
          food: 800,
          research: 550
        }),
        null
      );
    });

    it('should handle resource overflow', async () => {
      const mockEmpire = {
        id: 1,
        metal: 900000, // Near limit
        energy: 800,
        food: 600,
        research: 400
      };

      mockEmpireModel.findById.mockResolvedValue(mockEmpire);
      
      // Mock _calculateStorageLimits to return limits
      resourceCalculator._calculateStorageLimits = jest.fn().mockReturnValue({
        metal: 1000000,
        energy: 1000000,
        food: 1000000,
        research: 1000000
      });

      resourceCalculator.calculateNetResources = jest.fn().mockResolvedValue({
        production: { metal: 5000, energy: 400, food: 300, research: 200 },
        net_change: { metal: 200000, energy: 150, food: 200, research: 150 } // Metal would overflow
      });

      mockEmpireModel.update.mockResolvedValue({
        updated_at: '2024-01-01T12:00:00.000Z'
      });

      const result = await resourceCalculator.processResourceProduction(1);

      // Should have overflow handling
      expect(result.storage_limits.metal).toBe(1000000);
    });
  });

  describe('canAfford', () => {
    it('should return true when empire can afford costs', async () => {
      const mockEmpire = {
        id: 1,
        metal: 1000,
        energy: 800,
        food: 600,
        research: 400
      };

      const costs = {
        metal: 500,
        energy: 300,
        food: 200
      };

      mockEmpireModel.findById.mockResolvedValue(mockEmpire);

      const result = await resourceCalculator.canAfford(1, costs);

      expect(result.can_afford_all).toBe(true);
      expect(result.affordability.metal.can_afford).toBe(true);
      expect(result.affordability.energy.can_afford).toBe(true);
      expect(result.affordability.food.can_afford).toBe(true);
    });

    it('should return false when empire cannot afford costs', async () => {
      const mockEmpire = {
        id: 1,
        metal: 100,
        energy: 50,
        food: 25,
        research: 10
      };

      const costs = {
        metal: 500,
        energy: 300
      };

      mockEmpireModel.findById.mockResolvedValue(mockEmpire);

      const result = await resourceCalculator.canAfford(1, costs);

      expect(result.can_afford_all).toBe(false);
      expect(result.affordability.metal.can_afford).toBe(false);
      expect(result.affordability.metal.shortage).toBe(400);
      expect(result.affordability.energy.can_afford).toBe(false);
      expect(result.affordability.energy.shortage).toBe(250);
    });
  });

  describe('_calculatePlanetProduction', () => {
    it('should calculate base production for mining planet', () => {
      const planet = {
        planet_type: 'mining',
        buildings: JSON.stringify({})
      };

      const result = resourceCalculator._calculatePlanetProduction(planet);

      expect(result.base.metal).toBe(100);
      expect(result.base.energy).toBe(20);
      expect(result.net.metal).toBe(100);
    });

    it('should apply building bonuses correctly', () => {
      const planet = {
        planet_type: 'mining',
        buildings: JSON.stringify({ mining_facility: 2 })
      };

      const result = resourceCalculator._calculatePlanetProduction(planet);

      // Base metal: 100, with 2 mining facilities: 100 * (1.25^2) = 156.25, floored to 156
      expect(result.net.metal).toBe(156);
      expect(result.bonuses.metal).toBeCloseTo(1.5625);
    });
  });

  describe('_applyResourceChanges', () => {
    it('should apply changes without overflow', () => {
      const current = { metal: 500, energy: 400, food: 300, research: 200 };
      const changes = { metal: 200, energy: 100, food: 150, research: 50 };
      const limits = { metal: 10000, energy: 10000, food: 10000, research: 10000 };

      const result = resourceCalculator._applyResourceChanges(current, changes, limits);

      expect(result.metal).toBe(700);
      expect(result.energy).toBe(500);
      expect(result.food).toBe(450);
      expect(result.research).toBe(250);
    });

    it('should handle overflow by converting to research', () => {
      const current = { metal: 9800, energy: 400, food: 300, research: 200 };
      const changes = { metal: 500, energy: 100, food: 150, research: 50 };
      const limits = { metal: 10000, energy: 10000, food: 10000, research: 10000 };

      const result = resourceCalculator._applyResourceChanges(current, changes, limits);

      expect(result.metal).toBe(10000); // Capped at limit
      expect(result.research).toBe(280); // 250 + (300 overflow * 0.1)
      expect(result.overflow_converted).toBe(30);
    });

    it('should prevent negative resources', () => {
      const current = { metal: 100, energy: 50, food: 25, research: 10 };
      const changes = { metal: -200, energy: -100, food: 10, research: 5 };
      const limits = { metal: 10000, energy: 10000, food: 10000, research: 10000 };

      const result = resourceCalculator._applyResourceChanges(current, changes, limits);

      expect(result.metal).toBe(0); // Cannot go below 0
      expect(result.energy).toBe(0); // Cannot go below 0
      expect(result.food).toBe(35);
      expect(result.research).toBe(15);
    });
  });
});

module.exports = {};
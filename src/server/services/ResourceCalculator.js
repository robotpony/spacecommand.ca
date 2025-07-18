/**
 * Resource Calculator Service for SpaceCommand
 * Handles resource production, consumption, and economic calculations
 */

const BaseModel = require('../models/BaseModel');
const { GameError, ValidationError } = require('../middleware/errorHandler');

class ResourceCalculator {
  constructor() {
    this.empireModel = new BaseModel('empires');
    this.planetModel = new BaseModel('planets');
    this.fleetModel = new BaseModel('fleets');
    
    // Base production rates per planet type
    this.BASE_PRODUCTION = {
      mining: { metal: 100, energy: 20, food: 10, research: 5 },
      energy: { metal: 10, energy: 120, food: 15, research: 10 },
      agricultural: { metal: 5, energy: 25, food: 150, research: 5 },
      research: { metal: 15, energy: 40, food: 20, research: 100 },
      industrial: { metal: 80, energy: 60, food: 30, research: 20 },
      fortress: { metal: 40, energy: 50, food: 40, research: 30 },
      balanced: { metal: 50, energy: 50, food: 50, research: 50 }
    };

    // Fleet maintenance costs per unit type
    this.FLEET_MAINTENANCE = {
      scout: { metal: 1, energy: 2, food: 1 },
      fighter: { metal: 2, energy: 3, food: 2 },
      corvette: { metal: 4, energy: 5, food: 3 },
      destroyer: { metal: 8, energy: 10, food: 6 },
      cruiser: { metal: 15, energy: 18, food: 12 },
      battleship: { metal: 30, energy: 35, food: 25 },
      dreadnought: { metal: 60, energy: 70, food: 50 }
    };

    // Building maintenance and production bonuses
    this.BUILDING_EFFECTS = {
      mining_facility: { 
        maintenance: { metal: 0, energy: 5, food: 2 },
        bonus: { metal: 1.25 }
      },
      power_plant: { 
        maintenance: { metal: 3, energy: 0, food: 1 },
        bonus: { energy: 1.25 }
      },
      agricultural_dome: { 
        maintenance: { metal: 2, energy: 3, food: 0 },
        bonus: { food: 1.25 }
      },
      research_lab: { 
        maintenance: { metal: 4, energy: 8, food: 3 },
        bonus: { research: 1.25 }
      },
      factory: { 
        maintenance: { metal: 0, energy: 10, food: 5 },
        bonus: { metal: 1.15, energy: 1.10 }
      },
      shield_generator: { 
        maintenance: { metal: 5, energy: 15, food: 2 },
        bonus: { defense: 1.20 }
      }
    };

    // Resource storage limits and overflow rules
    this.MAX_STORAGE_MULTIPLIER = 10; // 10x base production = storage limit
    this.OVERFLOW_CONVERSION_RATE = 0.1; // 10% of overflow converts to research
  }

  /**
   * Calculates total resource production for an empire
   * @param {number} empireId - Empire ID
   * @returns {Promise<Object>} Production breakdown by source
   */
  async calculateProduction(empireId) {
    const empire = await this.empireModel.findById(empireId);
    if (!empire) {
      throw new ValidationError('Empire not found');
    }

    const planets = await this.planetModel.find({ empire_id: empireId });
    let totalProduction = { metal: 0, energy: 0, food: 0, research: 0 };
    let productionBreakdown = [];

    for (const planet of planets) {
      const planetProduction = this._calculatePlanetProduction(planet);
      
      // Add to total
      for (const resource in planetProduction.net) {
        totalProduction[resource] += planetProduction.net[resource];
      }
      
      productionBreakdown.push({
        planet_id: planet.id,
        planet_name: planet.name,
        planet_type: planet.planet_type,
        production: planetProduction
      });
    }

    return {
      empire_id: empireId,
      total_production: totalProduction,
      breakdown: productionBreakdown,
      calculated_at: new Date().toISOString()
    };
  }

  /**
   * Calculates total resource consumption for an empire
   * @param {number} empireId - Empire ID
   * @returns {Promise<Object>} Consumption breakdown by source
   */
  async calculateConsumption(empireId) {
    const empire = await this.empireModel.findById(empireId);
    if (!empire) {
      throw new ValidationError('Empire not found');
    }

    const planets = await this.planetModel.find({ empire_id: empireId });
    const fleets = await this.fleetModel.find({ empire_id: empireId });
    
    let totalConsumption = { metal: 0, energy: 0, food: 0, research: 0 };
    let consumptionBreakdown = {
      buildings: [],
      fleets: [],
      planets: []
    };

    // Calculate building maintenance costs
    for (const planet of planets) {
      const planetMaintenance = this._calculatePlanetMaintenance(planet);
      
      for (const resource in planetMaintenance.total) {
        totalConsumption[resource] += planetMaintenance.total[resource];
      }
      
      consumptionBreakdown.buildings.push({
        planet_id: planet.id,
        planet_name: planet.name,
        maintenance: planetMaintenance
      });
    }

    // Calculate fleet maintenance costs
    for (const fleet of fleets) {
      const fleetMaintenance = this._calculateFleetMaintenance(fleet);
      
      for (const resource in fleetMaintenance.total) {
        totalConsumption[resource] += fleetMaintenance.total[resource];
      }
      
      consumptionBreakdown.fleets.push({
        fleet_id: fleet.id,
        fleet_name: fleet.name,
        maintenance: fleetMaintenance
      });
    }

    return {
      empire_id: empireId,
      total_consumption: totalConsumption,
      breakdown: consumptionBreakdown,
      calculated_at: new Date().toISOString()
    };
  }

  /**
   * Calculates net resource change for an empire
   * @param {number} empireId - Empire ID
   * @returns {Promise<Object>} Net resource calculations
   */
  async calculateNetResources(empireId) {
    const [production, consumption] = await Promise.all([
      this.calculateProduction(empireId),
      this.calculateConsumption(empireId)
    ]);

    const netChange = {};
    const efficiency = {};
    
    for (const resource of ['metal', 'energy', 'food', 'research']) {
      const prod = production.total_production[resource];
      const cons = consumption.total_consumption[resource];
      netChange[resource] = prod - cons;
      efficiency[resource] = prod > 0 ? (prod - cons) / prod : 0;
    }

    return {
      empire_id: empireId,
      production: production.total_production,
      consumption: consumption.total_consumption,
      net_change: netChange,
      efficiency: efficiency,
      is_sustainable: Object.values(netChange).every(val => val >= 0),
      calculated_at: new Date().toISOString()
    };
  }

  /**
   * Processes resource production for an empire for one turn
   * @param {number} empireId - Empire ID
   * @param {Object} client - Database transaction client
   * @returns {Promise<Object>} Updated empire resources
   */
  async processResourceProduction(empireId, client = null) {
    const dbClient = client || this.empireModel.db;
    
    const empire = await this.empireModel.findById(empireId);
    if (!empire) {
      throw new ValidationError('Empire not found');
    }

    const netResources = await this.calculateNetResources(empireId);
    const currentResources = {
      metal: empire.metal || 0,
      energy: empire.energy || 0,
      food: empire.food || 0,
      research: empire.research || 0
    };

    // Calculate storage limits
    const storageLimits = this._calculateStorageLimits(netResources.production);
    
    // Apply resource changes with overflow handling
    const updatedResources = this._applyResourceChanges(
      currentResources,
      netResources.net_change,
      storageLimits
    );

    // Update empire resources
    const updatedEmpire = await this.empireModel.update(empireId, {
      metal: updatedResources.metal,
      energy: updatedResources.energy,
      food: updatedResources.food,
      research: updatedResources.research,
      last_resource_update: new Date().toISOString()
    }, dbClient);

    return {
      empire_id: empireId,
      previous_resources: currentResources,
      resource_changes: netResources.net_change,
      updated_resources: updatedResources,
      storage_limits: storageLimits,
      overflow_converted: updatedResources.overflow_converted || 0,
      updated_at: updatedEmpire.updated_at
    };
  }

  /**
   * Validates if an empire can afford a resource cost
   * @param {number} empireId - Empire ID
   * @param {Object} cost - Resource cost requirements
   * @returns {Promise<Object>} Affordability check result
   */
  async canAfford(empireId, cost) {
    const empire = await this.empireModel.findById(empireId);
    if (!empire) {
      throw new ValidationError('Empire not found');
    }

    const currentResources = {
      metal: empire.metal || 0,
      energy: empire.energy || 0,
      food: empire.food || 0,
      research: empire.research || 0
    };

    const affordability = {};
    let canAffordAll = true;

    for (const [resource, required] of Object.entries(cost)) {
      const available = currentResources[resource] || 0;
      const canAfford = available >= required;
      
      affordability[resource] = {
        required,
        available,
        can_afford: canAfford,
        shortage: canAfford ? 0 : required - available
      };
      
      if (!canAfford) {
        canAffordAll = false;
      }
    }

    return {
      empire_id: empireId,
      can_afford_all: canAffordAll,
      affordability,
      checked_at: new Date().toISOString()
    };
  }

  /**
   * Calculates production for a single planet
   * @param {Object} planet - Planet data
   * @returns {Object} Planet production breakdown
   * @private
   */
  _calculatePlanetProduction(planet) {
    const baseProduction = { ...this.BASE_PRODUCTION[planet.planet_type] };
    const buildings = planet.buildings ? JSON.parse(planet.buildings) : {};
    
    // Apply building bonuses
    let bonusMultipliers = { metal: 1, energy: 1, food: 1, research: 1 };
    
    for (const [buildingType, count] of Object.entries(buildings)) {
      if (this.BUILDING_EFFECTS[buildingType]?.bonus) {
        const bonus = this.BUILDING_EFFECTS[buildingType].bonus;
        for (const [resource, multiplier] of Object.entries(bonus)) {
          if (bonusMultipliers[resource]) {
            bonusMultipliers[resource] *= Math.pow(multiplier, count);
          }
        }
      }
    }

    // Calculate final production
    const finalProduction = {};
    for (const [resource, amount] of Object.entries(baseProduction)) {
      finalProduction[resource] = Math.floor(amount * bonusMultipliers[resource]);
    }

    return {
      base: baseProduction,
      bonuses: bonusMultipliers,
      net: finalProduction
    };
  }

  /**
   * Calculates maintenance costs for a planet's buildings
   * @param {Object} planet - Planet data
   * @returns {Object} Planet maintenance breakdown
   * @private
   */
  _calculatePlanetMaintenance(planet) {
    const buildings = planet.buildings ? JSON.parse(planet.buildings) : {};
    let totalMaintenance = { metal: 0, energy: 0, food: 0, research: 0 };
    let buildingBreakdown = {};

    for (const [buildingType, count] of Object.entries(buildings)) {
      if (this.BUILDING_EFFECTS[buildingType]?.maintenance) {
        const maintenance = this.BUILDING_EFFECTS[buildingType].maintenance;
        buildingBreakdown[buildingType] = {
          count,
          unit_cost: maintenance,
          total_cost: {}
        };
        
        for (const [resource, cost] of Object.entries(maintenance)) {
          const totalCost = cost * count;
          buildingBreakdown[buildingType].total_cost[resource] = totalCost;
          totalMaintenance[resource] += totalCost;
        }
      }
    }

    return {
      total: totalMaintenance,
      breakdown: buildingBreakdown
    };
  }

  /**
   * Calculates maintenance costs for a fleet
   * @param {Object} fleet - Fleet data
   * @returns {Object} Fleet maintenance breakdown
   * @private
   */
  _calculateFleetMaintenance(fleet) {
    const composition = fleet.composition ? JSON.parse(fleet.composition) : {};
    let totalMaintenance = { metal: 0, energy: 0, food: 0, research: 0 };
    let shipBreakdown = {};

    for (const [shipType, count] of Object.entries(composition)) {
      if (this.FLEET_MAINTENANCE[shipType]) {
        const maintenance = this.FLEET_MAINTENANCE[shipType];
        shipBreakdown[shipType] = {
          count,
          unit_cost: maintenance,
          total_cost: {}
        };
        
        for (const [resource, cost] of Object.entries(maintenance)) {
          const totalCost = cost * count;
          shipBreakdown[shipType].total_cost[resource] = totalCost;
          totalMaintenance[resource] += totalCost;
        }
      }
    }

    return {
      total: totalMaintenance,
      breakdown: shipBreakdown
    };
  }

  /**
   * Calculates storage limits based on production
   * @param {Object} production - Production amounts
   * @returns {Object} Storage limits
   * @private
   */
  _calculateStorageLimits(production) {
    const limits = {};
    for (const [resource, amount] of Object.entries(production)) {
      limits[resource] = Math.max(1000, amount * this.MAX_STORAGE_MULTIPLIER);
    }
    return limits;
  }

  /**
   * Applies resource changes with overflow handling
   * @param {Object} current - Current resources
   * @param {Object} changes - Resource changes
   * @param {Object} limits - Storage limits
   * @returns {Object} Updated resources with overflow handling
   * @private
   */
  _applyResourceChanges(current, changes, limits) {
    const updated = { ...current };
    let totalOverflow = 0;

    for (const [resource, change] of Object.entries(changes)) {
      const newAmount = Math.max(0, current[resource] + change);
      const limit = limits[resource];
      
      if (newAmount > limit) {
        const overflow = newAmount - limit;
        totalOverflow += overflow * this.OVERFLOW_CONVERSION_RATE;
        updated[resource] = limit;
      } else {
        updated[resource] = newAmount;
      }
    }

    // Convert overflow to research
    if (totalOverflow > 0) {
      updated.research += Math.floor(totalOverflow);
      updated.overflow_converted = Math.floor(totalOverflow);
    }

    return updated;
  }
}

module.exports = ResourceCalculator;
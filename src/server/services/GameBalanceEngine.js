/**
 * Game Balance Engine for SpaceCommand
 * Validates game actions, prevents exploits, and enforces balance rules
 */

const BaseModel = require('../models/BaseModel');
const { GameError, ValidationError } = require('../middleware/errorHandler');

class GameBalanceEngine {
  constructor() {
    this.empireModel = new BaseModel('empires');
    this.planetModel = new BaseModel('planets');
    this.fleetModel = new BaseModel('fleets');
    this.actionPointModel = new BaseModel('action_point_reservations');
    
    // Resource limits and balance rules
    this.RESOURCE_LIMITS = {
      metal: { min: 0, max: 1000000, overflow_threshold: 500000 },
      energy: { min: 0, max: 1000000, overflow_threshold: 500000 },
      food: { min: 0, max: 1000000, overflow_threshold: 500000 },
      research: { min: 0, max: 1000000, overflow_threshold: 500000 }
    };

    // Action cost scaling based on empire size
    this.ACTION_COST_SCALING = {
      base_colonies: 5, // No scaling penalty for first 5 colonies
      scaling_factor: 0.1, // 10% increase per colony beyond base
      max_scaling: 2.0 // Maximum 200% cost increase
    };

    // Fleet composition limits
    this.FLEET_LIMITS = {
      max_fleets_per_empire: 50,
      max_ships_per_fleet: 1000,
      max_total_ships_per_empire: 10000
    };

    // Building limits per planet
    this.BUILDING_LIMITS = {
      mining_facility: 10,
      power_plant: 10,
      agricultural_dome: 10,
      research_lab: 5,
      factory: 8,
      shield_generator: 3
    };

    // Time-based restrictions
    this.TIME_RESTRICTIONS = {
      min_time_between_attacks_ms: 5 * 60 * 1000, // 5 minutes
      min_time_between_colonizations_ms: 30 * 60 * 1000, // 30 minutes
      min_time_between_diplomacy_ms: 2 * 60 * 1000, // 2 minutes
      action_point_regeneration_ms: 24 * 60 * 60 * 1000 // 24 hours
    };

    // Anti-exploit thresholds
    this.EXPLOIT_THRESHOLDS = {
      max_actions_per_minute: 10,
      max_resource_transfer_per_turn: 100000,
      suspicious_resource_ratio: 10.0, // Flag if one resource is 10x others
      max_fleet_movements_per_turn: 20
    };

    // Economic balance parameters
    this.ECONOMIC_BALANCE = {
      resource_production_cap_multiplier: 50, // Max production = 50x base
      fleet_maintenance_scaling: 0.05, // 5% increase per 100 ships
      population_growth_cap: 100000, // Max population per planet
      trade_route_efficiency_decay: 0.02 // 2% efficiency loss per route
    };
  }

  /**
   * Validates a player action against all balance rules
   * @param {number} playerId - Player ID
   * @param {Object} action - Proposed action
   * @param {Object} gameState - Current game state
   * @returns {Promise<Object>} Validation result
   */
  async validateAction(playerId, action, gameState) {
    const validationResult = {
      valid: true,
      violations: [],
      warnings: [],
      adjusted_costs: null,
      recommended_action: null
    };

    try {
      // Get player's empire and current state
      const empire = await this.empireModel.findOne({ player_id: playerId });
      if (!empire) {
        throw new ValidationError('Player empire not found');
      }

      // Validate action type and parameters
      await this._validateActionType(action, validationResult);
      
      // Validate resource requirements and limits
      await this._validateResourceRequirements(empire, action, validationResult);
      
      // Validate time restrictions
      await this._validateTimeRestrictions(playerId, action, validationResult);
      
      // Validate fleet and building limits
      await this._validateQuantityLimits(empire, action, validationResult);
      
      // Check for potential exploits
      await this._checkExploitPatterns(playerId, action, validationResult);
      
      // Validate economic balance
      await this._validateEconomicBalance(empire, action, validationResult);
      
      // Apply scaling costs if needed
      if (validationResult.valid) {
        validationResult.adjusted_costs = await this._calculateScaledCosts(empire, action);
      }

    } catch (error) {
      validationResult.valid = false;
      validationResult.violations.push({
        type: 'validation_error',
        message: error.message,
        severity: 'high'
      });
    }

    return validationResult;
  }

  /**
   * Validates resource costs and prevents overflow/underflow
   * @param {Object} costs - Resource costs
   * @param {Object} context - Action context
   * @returns {boolean} Whether costs are balanced
   */
  validateResourceCosts(costs, context = {}) {
    for (const [resource, amount] of Object.entries(costs)) {
      const limits = this.RESOURCE_LIMITS[resource];
      if (!limits) {
        return false; // Unknown resource type
      }

      if (amount < 0 || amount > limits.max) {
        return false; // Invalid amount
      }

      // Check for suspiciously high costs relative to context
      if (context.empire_size && amount > context.empire_size * 10000) {
        return false; // Cost too high for empire size
      }
    }

    return true;
  }

  /**
   * Enforces resource limits and handles overflow
   * @param {number} empireId - Empire ID
   * @param {Object} resourceChanges - Proposed resource changes
   * @returns {Promise<Object>} Adjusted resource changes within limits
   */
  async enforceResourceLimits(empireId, resourceChanges) {
    const empire = await this.empireModel.findById(empireId);
    if (!empire) {
      throw new ValidationError('Empire not found');
    }

    const adjustedChanges = { ...resourceChanges };
    const overflowData = {
      overflow_occurred: false,
      converted_to_research: 0,
      resources_capped: []
    };

    for (const [resource, change] of Object.entries(resourceChanges)) {
      const currentAmount = empire[resource] || 0;
      const newAmount = currentAmount + change;
      const limits = this.RESOURCE_LIMITS[resource];

      if (newAmount > limits.max) {
        // Cap at maximum
        adjustedChanges[resource] = limits.max - currentAmount;
        const overflow = newAmount - limits.max;
        
        // Convert overflow to research (except research itself)
        if (resource !== 'research') {
          adjustedChanges.research = (adjustedChanges.research || 0) + Math.floor(overflow * 0.1);
          overflowData.converted_to_research += Math.floor(overflow * 0.1);
        }
        
        overflowData.overflow_occurred = true;
        overflowData.resources_capped.push(resource);
      } else if (newAmount < limits.min) {
        // Prevent going below minimum
        adjustedChanges[resource] = limits.min - currentAmount;
      }
    }

    return {
      adjusted_changes: adjustedChanges,
      overflow_data: overflowData
    };
  }

  /**
   * Calculates empire power rating for matchmaking and balance
   * @param {number} empireId - Empire ID
   * @returns {Promise<Object>} Empire power rating
   */
  async calculateEmpirePowerRating(empireId) {
    const [empire, planets, fleets] = await Promise.all([
      this.empireModel.findById(empireId),
      this.planetModel.find({ empire_id: empireId }),
      this.fleetModel.find({ empire_id: empireId })
    ]);

    if (!empire) {
      throw new ValidationError('Empire not found');
    }

    // Resource power (total resources / 1000)
    const resourcePower = (
      (empire.metal || 0) + 
      (empire.energy || 0) + 
      (empire.food || 0) + 
      (empire.research || 0)
    ) / 1000;

    // Territory power (colonies * average production)
    const territoryPower = planets.length * 500;

    // Fleet power (sum of all ship combat values)
    let fleetPower = 0;
    for (const fleet of fleets) {
      const composition = JSON.parse(fleet.composition || '{}');
      for (const [shipType, count] of Object.entries(composition)) {
        fleetPower += this._getShipCombatValue(shipType) * count;
      }
    }

    // Technology power (research points / 100)
    const technologyPower = (empire.research || 0) / 100;

    const totalPower = resourcePower + territoryPower + fleetPower + technologyPower;

    return {
      empire_id: empireId,
      total_power: Math.round(totalPower),
      resource_power: Math.round(resourcePower),
      territory_power: Math.round(territoryPower),
      fleet_power: Math.round(fleetPower),
      technology_power: Math.round(technologyPower),
      power_rank: await this._calculatePowerRank(empireId, totalPower),
      calculated_at: new Date().toISOString()
    };
  }

  /**
   * Detects and prevents common exploitative behaviors
   * @param {number} playerId - Player ID
   * @param {string} actionType - Type of action being performed
   * @returns {Promise<Object>} Anti-cheat analysis
   */
  async detectExploits(playerId, actionType) {
    const analysis = {
      suspicious_activity: false,
      exploit_indicators: [],
      recommended_actions: [],
      risk_level: 'low'
    };

    // Check action frequency
    const recentActions = await this._getRecentActions(playerId, 60000); // Last minute
    if (recentActions.length > this.EXPLOIT_THRESHOLDS.max_actions_per_minute) {
      analysis.suspicious_activity = true;
      analysis.exploit_indicators.push('excessive_action_frequency');
      analysis.risk_level = 'high';
    }

    // Check resource patterns
    const empire = await this.empireModel.findOne({ player_id: playerId });
    if (empire) {
      const resourceAnalysis = this._analyzeResourcePatterns(empire);
      if (resourceAnalysis.suspicious) {
        analysis.suspicious_activity = true;
        analysis.exploit_indicators.push('suspicious_resource_pattern');
        if (analysis.risk_level === 'low') analysis.risk_level = 'medium';
      }
    }

    // Check for automation patterns
    const automationCheck = await this._checkAutomationPatterns(playerId);
    if (automationCheck.likely_automated) {
      analysis.suspicious_activity = true;
      analysis.exploit_indicators.push('possible_automation');
      analysis.risk_level = 'high';
    }

    // Generate recommended actions
    if (analysis.suspicious_activity) {
      analysis.recommended_actions = this._generateAntiCheatRecommendations(analysis);
    }

    return analysis;
  }

  /**
   * Validates action type and parameters
   * @param {Object} action - Action to validate
   * @param {Object} validationResult - Validation result object
   * @private
   */
  async _validateActionType(action, validationResult) {
    const validActionTypes = [
      'build_fleet', 'move_fleet', 'attack_fleet', 'colonize_planet',
      'build_structure', 'research_technology', 'trade_resources',
      'create_diplomacy_proposal', 'explore_sector'
    ];

    if (!validActionTypes.includes(action.type)) {
      validationResult.valid = false;
      validationResult.violations.push({
        type: 'invalid_action_type',
        message: `Unknown action type: ${action.type}`,
        severity: 'high'
      });
    }

    // Validate action parameters
    if (!action.parameters || typeof action.parameters !== 'object') {
      validationResult.valid = false;
      validationResult.violations.push({
        type: 'invalid_parameters',
        message: 'Action parameters missing or invalid',
        severity: 'high'
      });
    }
  }

  /**
   * Validates resource requirements for an action
   * @param {Object} empire - Empire data
   * @param {Object} action - Action data
   * @param {Object} validationResult - Validation result object
   * @private
   */
  async _validateResourceRequirements(empire, action, validationResult) {
    if (!action.costs) return;

    for (const [resource, cost] of Object.entries(action.costs)) {
      const available = empire[resource] || 0;
      
      if (available < cost) {
        validationResult.valid = false;
        validationResult.violations.push({
          type: 'insufficient_resources',
          message: `Insufficient ${resource}: need ${cost}, have ${available}`,
          severity: 'high'
        });
      }

      // Check for resource limits
      if (cost > this.RESOURCE_LIMITS[resource]?.max) {
        validationResult.valid = false;
        validationResult.violations.push({
          type: 'excessive_cost',
          message: `Cost too high for ${resource}: ${cost}`,
          severity: 'high'
        });
      }
    }
  }

  /**
   * Validates time-based restrictions
   * @param {number} playerId - Player ID
   * @param {Object} action - Action data
   * @param {Object} validationResult - Validation result object
   * @private
   */
  async _validateTimeRestrictions(playerId, action, validationResult) {
    const now = Date.now();
    const restrictionKey = `${action.type}_last_time`;
    
    // This would typically check a cache or database for last action times
    // For now, we'll implement basic validation logic
    
    if (action.type === 'attack_fleet') {
      const restriction = this.TIME_RESTRICTIONS.min_time_between_attacks_ms;
      // Implementation would check last attack time
      validationResult.warnings.push({
        type: 'time_restriction_info',
        message: `Minimum ${restriction / 60000} minutes between attacks`,
        severity: 'low'
      });
    }
  }

  /**
   * Validates quantity limits for fleets and buildings
   * @param {Object} empire - Empire data
   * @param {Object} action - Action data
   * @param {Object} validationResult - Validation result object
   * @private
   */
  async _validateQuantityLimits(empire, action, validationResult) {
    if (action.type === 'build_fleet') {
      const currentFleets = await this.fleetModel.count({ empire_id: empire.id });
      if (currentFleets >= this.FLEET_LIMITS.max_fleets_per_empire) {
        validationResult.valid = false;
        validationResult.violations.push({
          type: 'fleet_limit_exceeded',
          message: `Maximum fleets reached: ${this.FLEET_LIMITS.max_fleets_per_empire}`,
          severity: 'high'
        });
      }
    }

    if (action.type === 'build_structure') {
      const buildingType = action.parameters.building_type;
      const planet = await this.planetModel.findById(action.parameters.planet_id);
      
      if (planet && planet.empire_id === empire.id) {
        const buildings = JSON.parse(planet.buildings || '{}');
        const currentCount = buildings[buildingType] || 0;
        const limit = this.BUILDING_LIMITS[buildingType];
        
        if (limit && currentCount >= limit) {
          validationResult.valid = false;
          validationResult.violations.push({
            type: 'building_limit_exceeded',
            message: `Maximum ${buildingType} reached: ${limit}`,
            severity: 'high'
          });
        }
      }
    }
  }

  /**
   * Checks for exploit patterns in player behavior
   * @param {number} playerId - Player ID
   * @param {Object} action - Action data
   * @param {Object} validationResult - Validation result object
   * @private
   */
  async _checkExploitPatterns(playerId, action, validationResult) {
    // Check for resource transfer exploits
    if (action.type === 'trade_resources' && action.parameters.amount) {
      const amount = action.parameters.amount;
      if (amount > this.EXPLOIT_THRESHOLDS.max_resource_transfer_per_turn) {
        validationResult.warnings.push({
          type: 'large_resource_transfer',
          message: `Large resource transfer detected: ${amount}`,
          severity: 'medium'
        });
      }
    }

    // Check for rapid repeated actions
    const actionPattern = await this._analyzeActionPattern(playerId, action.type);
    if (actionPattern.suspicious) {
      validationResult.warnings.push({
        type: 'suspicious_action_pattern',
        message: 'Rapid repeated actions detected',
        severity: 'medium'
      });
    }
  }

  /**
   * Validates economic balance constraints
   * @param {Object} empire - Empire data
   * @param {Object} action - Action data
   * @param {Object} validationResult - Validation result object
   * @private
   */
  async _validateEconomicBalance(empire, action, validationResult) {
    // Check resource ratios for suspicious patterns
    const resources = [empire.metal || 0, empire.energy || 0, empire.food || 0, empire.research || 0];
    const maxResource = Math.max(...resources);
    const minResource = Math.min(...resources.filter(r => r > 0));
    
    if (minResource > 0 && maxResource / minResource > this.EXPLOIT_THRESHOLDS.suspicious_resource_ratio) {
      validationResult.warnings.push({
        type: 'unusual_resource_distribution',
        message: 'Unusual resource distribution detected',
        severity: 'low'
      });
    }
  }

  /**
   * Calculates scaled costs based on empire size
   * @param {Object} empire - Empire data
   * @param {Object} action - Action data
   * @returns {Promise<Object>} Scaled costs
   * @private
   */
  async _calculateScaledCosts(empire, action) {
    if (!action.costs) return action.costs;

    const colonyCount = await this.planetModel.count({ empire_id: empire.id });
    const scalingFactor = this._calculateCostScaling(colonyCount);
    
    const scaledCosts = {};
    for (const [resource, cost] of Object.entries(action.costs)) {
      scaledCosts[resource] = Math.ceil(cost * scalingFactor);
    }

    return scaledCosts;
  }

  /**
   * Calculates cost scaling factor based on empire size
   * @param {number} colonyCount - Number of colonies
   * @returns {number} Scaling factor
   * @private
   */
  _calculateCostScaling(colonyCount) {
    if (colonyCount <= this.ACTION_COST_SCALING.base_colonies) {
      return 1.0;
    }

    const excessColonies = colonyCount - this.ACTION_COST_SCALING.base_colonies;
    const scaling = 1 + (excessColonies * this.ACTION_COST_SCALING.scaling_factor);
    
    return Math.min(scaling, this.ACTION_COST_SCALING.max_scaling);
  }

  /**
   * Gets combat value for a ship type
   * @param {string} shipType - Ship type
   * @returns {number} Combat value
   * @private
   */
  _getShipCombatValue(shipType) {
    const shipValues = {
      scout: 10, fighter: 25, corvette: 50, destroyer: 100,
      cruiser: 200, battleship: 400, dreadnought: 800
    };
    return shipValues[shipType] || 0;
  }

  /**
   * Calculates power rank among all empires
   * @param {number} empireId - Empire ID
   * @param {number} totalPower - Total power value
   * @returns {Promise<number>} Power rank (1-based)
   * @private
   */
  async _calculatePowerRank(empireId, totalPower) {
    // This would query all empires and calculate rank
    // For now, return a placeholder
    return 1;
  }

  /**
   * Gets recent actions for a player
   * @param {number} playerId - Player ID
   * @param {number} timeWindowMs - Time window in milliseconds
   * @returns {Promise<Array>} Recent actions
   * @private
   */
  async _getRecentActions(playerId, timeWindowMs) {
    // This would query action log table
    // For now, return empty array
    return [];
  }

  /**
   * Analyzes resource patterns for suspicious activity
   * @param {Object} empire - Empire data
   * @returns {Object} Analysis result
   * @private
   */
  _analyzeResourcePatterns(empire) {
    const resources = [empire.metal || 0, empire.energy || 0, empire.food || 0, empire.research || 0];
    const total = resources.reduce((sum, val) => sum + val, 0);
    
    if (total === 0) return { suspicious: false };
    
    // Check for perfect ratios (possible cheating)
    const ratios = resources.map(r => r / total);
    const perfectRatio = 0.25; // 25% each
    const tolerance = 0.01; // 1% tolerance
    
    const allPerfect = ratios.every(ratio => Math.abs(ratio - perfectRatio) < tolerance);
    
    return {
      suspicious: allPerfect && total > 10000, // Only suspicious for larger amounts
      patterns: { perfect_ratios: allPerfect }
    };
  }

  /**
   * Checks for automation patterns in player behavior
   * @param {number} playerId - Player ID
   * @returns {Promise<Object>} Automation analysis
   * @private
   */
  async _checkAutomationPatterns(playerId) {
    // This would analyze action timing patterns
    // For now, return no automation detected
    return {
      likely_automated: false,
      confidence: 0.0,
      indicators: []
    };
  }

  /**
   * Analyzes action patterns for suspicious behavior
   * @param {number} playerId - Player ID
   * @param {string} actionType - Action type
   * @returns {Promise<Object>} Pattern analysis
   * @private
   */
  async _analyzeActionPattern(playerId, actionType) {
    // This would analyze recent action history
    // For now, return no suspicious patterns
    return {
      suspicious: false,
      frequency: 0,
      pattern_type: 'normal'
    };
  }

  /**
   * Generates anti-cheat recommendations
   * @param {Object} analysis - Anti-cheat analysis
   * @returns {Array} Recommended actions
   * @private
   */
  _generateAntiCheatRecommendations(analysis) {
    const recommendations = [];
    
    if (analysis.exploit_indicators.includes('excessive_action_frequency')) {
      recommendations.push('Rate limit player actions');
      recommendations.push('Monitor for bot-like behavior');
    }
    
    if (analysis.exploit_indicators.includes('suspicious_resource_pattern')) {
      recommendations.push('Audit recent resource transactions');
      recommendations.push('Check for external resource manipulation');
    }
    
    if (analysis.exploit_indicators.includes('possible_automation')) {
      recommendations.push('Require CAPTCHA verification');
      recommendations.push('Implement action timing analysis');
    }
    
    return recommendations;
  }
}

module.exports = GameBalanceEngine;
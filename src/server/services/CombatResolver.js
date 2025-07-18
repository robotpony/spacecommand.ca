/**
 * Combat Resolver Service for SpaceCommand
 * Handles battle resolution, damage calculation, and combat mechanics
 */

const BaseModel = require('../models/BaseModel');
const { GameError, ValidationError } = require('../middleware/errorHandler');

class CombatResolver {
  constructor() {
    this.combatModel = new BaseModel('combat_records');
    this.fleetModel = new BaseModel('fleets');
    this.empireModel = new BaseModel('empires');
    
    // Ship combat statistics
    this.SHIP_STATS = {
      scout: { 
        attack: 1, defense: 1, health: 10, speed: 8, cost: 50,
        weapon_type: 'light', armor_type: 'light'
      },
      fighter: { 
        attack: 3, defense: 2, health: 25, speed: 7, cost: 100,
        weapon_type: 'light', armor_type: 'light'
      },
      corvette: { 
        attack: 6, defense: 4, health: 50, speed: 6, cost: 200,
        weapon_type: 'medium', armor_type: 'medium'
      },
      destroyer: { 
        attack: 12, defense: 8, health: 100, speed: 5, cost: 400,
        weapon_type: 'medium', armor_type: 'medium'
      },
      cruiser: { 
        attack: 25, defense: 15, health: 200, speed: 4, cost: 800,
        weapon_type: 'heavy', armor_type: 'heavy'
      },
      battleship: { 
        attack: 50, defense: 30, health: 400, speed: 3, cost: 1600,
        weapon_type: 'heavy', armor_type: 'heavy'
      },
      dreadnought: { 
        attack: 100, defense: 60, health: 800, speed: 2, cost: 3200,
        weapon_type: 'super_heavy', armor_type: 'super_heavy'
      }
    };

    // Weapon effectiveness against armor types
    this.WEAPON_EFFECTIVENESS = {
      light: { light: 1.0, medium: 0.8, heavy: 0.6, super_heavy: 0.4 },
      medium: { light: 1.2, medium: 1.0, heavy: 0.8, super_heavy: 0.6 },
      heavy: { light: 1.4, medium: 1.2, heavy: 1.0, super_heavy: 0.8 },
      super_heavy: { light: 1.6, medium: 1.4, heavy: 1.2, super_heavy: 1.0 }
    };

    // Combat modifiers
    this.EXPERIENCE_BONUS = 0.1; // 10% bonus per experience level
    this.MORALE_MODIFIER = 0.2; // 20% modifier range based on morale
    this.SURPRISE_ATTACK_BONUS = 1.5; // 50% bonus for surprise attacks
    this.DEFENSIVE_BONUS = 1.2; // 20% bonus for defending
    
    // Combat phases
    this.MAX_COMBAT_ROUNDS = 10;
    this.RETREAT_THRESHOLD = 0.3; // Retreat when at 30% strength
  }

  /**
   * Resolves combat between two fleets
   * @param {number} attackerFleetId - Attacking fleet ID
   * @param {number} defenderFleetId - Defending fleet ID
   * @param {Object} options - Combat options (surprise_attack, etc.)
   * @returns {Promise<Object>} Combat resolution result
   */
  async resolveCombat(attackerFleetId, defenderFleetId, options = {}) {
    return await this.combatModel.transaction(async (client) => {
      // Get fleet data
      const [attackerFleet, defenderFleet] = await Promise.all([
        this.fleetModel.findById(attackerFleetId),
        this.fleetModel.findById(defenderFleetId)
      ]);

      if (!attackerFleet || !defenderFleet) {
        throw new ValidationError('One or both fleets not found');
      }

      // Validate fleets can engage in combat
      this._validateCombatReadiness(attackerFleet, defenderFleet);

      // Initialize combat state
      const combatState = this._initializeCombatState(attackerFleet, defenderFleet, options);
      
      // Create combat record
      const combatRecord = await this.combatModel.create({
        attacker_fleet_id: attackerFleetId,
        defender_fleet_id: defenderFleetId,
        attacker_empire_id: attackerFleet.empire_id,
        defender_empire_id: defenderFleet.empire_id,
        combat_type: options.combat_type || 'fleet_engagement',
        location: attackerFleet.location,
        started_at: new Date().toISOString(),
        initial_state: JSON.stringify(combatState.initial)
      }, client);

      // Execute combat rounds
      const rounds = [];
      let currentRound = 1;
      
      while (currentRound <= this.MAX_COMBAT_ROUNDS && 
             !combatState.combat_ended && 
             !combatState.retreat_triggered) {
        
        const roundResult = this._executeCombatRound(combatState, currentRound);
        rounds.push(roundResult);
        
        // Check for combat end conditions
        this._checkCombatEndConditions(combatState);
        
        currentRound++;
      }

      // Finalize combat results
      const finalResult = this._finalizeCombatResult(combatState, rounds);
      
      // Update combat record
      await this.combatModel.update(combatRecord.id, {
        status: 'completed',
        winner: finalResult.winner,
        rounds_fought: rounds.length,
        ended_at: new Date().toISOString(),
        final_state: JSON.stringify(finalResult),
        combat_log: JSON.stringify(rounds)
      }, client);

      // Update fleet states
      await this._updateFleetsAfterCombat(
        attackerFleet, 
        defenderFleet, 
        finalResult, 
        client
      );

      return {
        combat_id: combatRecord.id,
        result: finalResult,
        rounds: rounds,
        duration_rounds: rounds.length,
        completed_at: new Date().toISOString()
      };
    });
  }

  /**
   * Calculates damage between two ship types
   * @param {string} attackerType - Attacking ship type
   * @param {string} defenderType - Defending ship type
   * @param {Object} modifiers - Combat modifiers
   * @returns {number} Damage dealt
   */
  calculateDamage(attackerType, defenderType, modifiers = {}) {
    const attackerStats = this.SHIP_STATS[attackerType];
    const defenderStats = this.SHIP_STATS[defenderType];
    
    if (!attackerStats || !defenderStats) {
      throw new ValidationError('Invalid ship types for damage calculation');
    }

    // Base damage calculation
    let baseDamage = attackerStats.attack;
    
    // Apply weapon effectiveness
    const effectiveness = this.WEAPON_EFFECTIVENESS[attackerStats.weapon_type][defenderStats.armor_type];
    baseDamage *= effectiveness;
    
    // Apply defense reduction
    const defenseReduction = Math.max(0, defenderStats.defense / (defenderStats.defense + 10));
    baseDamage *= (1 - defenseReduction);
    
    // Apply modifiers
    if (modifiers.experience_bonus) {
      baseDamage *= (1 + (modifiers.experience_level || 0) * this.EXPERIENCE_BONUS);
    }
    
    if (modifiers.morale_modifier) {
      const moraleEffect = (modifiers.morale - 50) / 50 * this.MORALE_MODIFIER;
      baseDamage *= (1 + moraleEffect);
    }
    
    if (modifiers.surprise_attack) {
      baseDamage *= this.SURPRISE_ATTACK_BONUS;
    }
    
    if (modifiers.defensive_bonus) {
      baseDamage /= this.DEFENSIVE_BONUS;
    }
    
    // Add random variance (±20%)
    const variance = 0.8 + (Math.random() * 0.4);
    baseDamage *= variance;
    
    return Math.max(1, Math.round(baseDamage));
  }

  /**
   * Calculates fleet combat power
   * @param {Object} fleet - Fleet data
   * @returns {Object} Fleet combat power breakdown
   */
  calculateFleetPower(fleet) {
    const composition = fleet.composition ? JSON.parse(fleet.composition) : {};
    let totalPower = 0;
    let totalHealth = 0;
    let powerBreakdown = {};

    for (const [shipType, count] of Object.entries(composition)) {
      const stats = this.SHIP_STATS[shipType];
      if (stats) {
        const shipPower = (stats.attack + stats.defense) * count;
        const shipHealth = stats.health * count;
        
        totalPower += shipPower;
        totalHealth += shipHealth;
        
        powerBreakdown[shipType] = {
          count,
          unit_power: stats.attack + stats.defense,
          total_power: shipPower,
          total_health: shipHealth
        };
      }
    }

    // Apply fleet modifiers
    const experience = fleet.experience || 0;
    const morale = fleet.morale || 50;
    
    const experienceMultiplier = 1 + (experience * this.EXPERIENCE_BONUS);
    const moraleMultiplier = 1 + ((morale - 50) / 50 * this.MORALE_MODIFIER);
    
    const effectivePower = totalPower * experienceMultiplier * moraleMultiplier;

    return {
      fleet_id: fleet.id,
      base_power: totalPower,
      total_health: totalHealth,
      experience_multiplier: experienceMultiplier,
      morale_multiplier: moraleMultiplier,
      effective_power: Math.round(effectivePower),
      ship_breakdown: powerBreakdown
    };
  }

  /**
   * Processes post-combat experience and morale changes
   * @param {Object} fleet - Fleet data
   * @param {Object} combatResult - Combat result data
   * @param {Object} client - Database client
   * @returns {Promise<Object>} Updated fleet stats
   */
  async updateFleetExperience(fleet, combatResult, client) {
    let experienceGain = 0;
    let moraleChange = 0;

    // Calculate experience gain
    if (combatResult.participated) {
      experienceGain = combatResult.victory ? 2 : 1;
      if (combatResult.enemy_power > combatResult.own_power) {
        experienceGain += 1; // Bonus for fighting stronger enemy
      }
    }

    // Calculate morale change
    if (combatResult.victory) {
      moraleChange = 10;
    } else if (combatResult.retreat) {
      moraleChange = -5;
    } else {
      moraleChange = -15; // Defeat
    }

    // Apply diminishing returns on experience
    const currentExp = fleet.experience || 0;
    const expMultiplier = Math.max(0.1, 1 - (currentExp * 0.1));
    experienceGain = Math.round(experienceGain * expMultiplier);

    // Clamp values
    const newExperience = Math.max(0, currentExp + experienceGain);
    const newMorale = Math.max(0, Math.min(100, (fleet.morale || 50) + moraleChange));

    // Update fleet
    const updatedFleet = await this.fleetModel.update(fleet.id, {
      experience: newExperience,
      morale: newMorale,
      last_combat: new Date().toISOString()
    }, client);

    return {
      fleet_id: fleet.id,
      experience_change: experienceGain,
      morale_change: moraleChange,
      new_experience: newExperience,
      new_morale: newMorale
    };
  }

  /**
   * Validates that fleets can engage in combat
   * @param {Object} attackerFleet - Attacking fleet
   * @param {Object} defenderFleet - Defending fleet
   * @private
   */
  _validateCombatReadiness(attackerFleet, defenderFleet) {
    if (attackerFleet.empire_id === defenderFleet.empire_id) {
      throw new ValidationError('Cannot attack your own fleet');
    }

    if (attackerFleet.location !== defenderFleet.location) {
      throw new ValidationError('Fleets must be in the same location to engage in combat');
    }

    if (attackerFleet.status === 'destroyed' || defenderFleet.status === 'destroyed') {
      throw new ValidationError('Cannot engage destroyed fleets in combat');
    }

    const attackerComposition = JSON.parse(attackerFleet.composition || '{}');
    const defenderComposition = JSON.parse(defenderFleet.composition || '{}');
    
    const attackerShips = Object.values(attackerComposition).reduce((sum, count) => sum + count, 0);
    const defenderShips = Object.values(defenderComposition).reduce((sum, count) => sum + count, 0);

    if (attackerShips === 0 || defenderShips === 0) {
      throw new ValidationError('Both fleets must have ships to engage in combat');
    }
  }

  /**
   * Initializes combat state for both fleets
   * @param {Object} attackerFleet - Attacking fleet
   * @param {Object} defenderFleet - Defending fleet
   * @param {Object} options - Combat options
   * @returns {Object} Initial combat state
   * @private
   */
  _initializeCombatState(attackerFleet, defenderFleet, options) {
    const attackerPower = this.calculateFleetPower(attackerFleet);
    const defenderPower = this.calculateFleetPower(defenderFleet);

    return {
      attacker: {
        fleet: attackerFleet,
        power: attackerPower,
        current_health: attackerPower.total_health,
        composition: { ...JSON.parse(attackerFleet.composition || '{}') }
      },
      defender: {
        fleet: defenderFleet,
        power: defenderPower,
        current_health: defenderPower.total_health,
        composition: { ...JSON.parse(defenderFleet.composition || '{}') }
      },
      modifiers: {
        surprise_attack: options.surprise_attack || false,
        defensive_bonus: true, // Defender always gets bonus
        terrain_modifier: options.terrain_modifier || 1.0
      },
      combat_ended: false,
      retreat_triggered: false,
      initial: {
        attacker_power: attackerPower.effective_power,
        defender_power: defenderPower.effective_power,
        started_at: new Date().toISOString()
      }
    };
  }

  /**
   * Executes a single round of combat
   * @param {Object} combatState - Current combat state
   * @param {number} roundNumber - Current round number
   * @returns {Object} Round result
   * @private
   */
  _executeCombatRound(combatState, roundNumber) {
    const roundResult = {
      round: roundNumber,
      actions: [],
      casualties: { attacker: {}, defender: {} },
      round_summary: ''
    };

    // Determine initiative (faster ships attack first)
    const attackerSpeed = this._calculateAverageSpeed(combatState.attacker.composition);
    const defenderSpeed = this._calculateAverageSpeed(combatState.defender.composition);
    
    const attackerFirst = attackerSpeed >= defenderSpeed;
    
    if (attackerFirst) {
      this._executeAttack(combatState.attacker, combatState.defender, roundResult, 'attacker');
      if (!combatState.combat_ended) {
        this._executeAttack(combatState.defender, combatState.attacker, roundResult, 'defender');
      }
    } else {
      this._executeAttack(combatState.defender, combatState.attacker, roundResult, 'defender');
      if (!combatState.combat_ended) {
        this._executeAttack(combatState.attacker, combatState.defender, roundResult, 'attacker');
      }
    }

    return roundResult;
  }

  /**
   * Executes an attack from one side to another
   * @param {Object} attacker - Attacking side
   * @param {Object} defender - Defending side
   * @param {Object} roundResult - Round result object
   * @param {string} side - Which side is attacking
   * @private
   */
  _executeAttack(attacker, defender, roundResult, side) {
    const attackerComposition = attacker.composition;
    const defenderComposition = defender.composition;
    
    let totalDamage = 0;
    
    // Each ship type attacks
    for (const [shipType, count] of Object.entries(attackerComposition)) {
      if (count > 0) {
        // Select random target type
        const targetTypes = Object.keys(defenderComposition).filter(type => defenderComposition[type] > 0);
        if (targetTypes.length === 0) break;
        
        const targetType = targetTypes[Math.floor(Math.random() * targetTypes.length)];
        
        // Calculate damage per ship
        const modifiers = {
          experience_level: attacker.fleet.experience || 0,
          morale: attacker.fleet.morale || 50,
          surprise_attack: side === 'attacker' && roundResult.round === 1,
          defensive_bonus: side === 'defender'
        };
        
        const damagePerShip = this.calculateDamage(shipType, targetType, modifiers);
        const totalShipDamage = damagePerShip * count;
        totalDamage += totalShipDamage;
        
        // Apply damage and calculate casualties
        const targetHealth = this.SHIP_STATS[targetType].health;
        const casualties = Math.min(
          Math.floor(totalShipDamage / targetHealth),
          defenderComposition[targetType]
        );
        
        if (casualties > 0) {
          defenderComposition[targetType] -= casualties;
          defender.current_health -= casualties * targetHealth;
          
          if (!roundResult.casualties[side === 'attacker' ? 'defender' : 'attacker'][targetType]) {
            roundResult.casualties[side === 'attacker' ? 'defender' : 'attacker'][targetType] = 0;
          }
          roundResult.casualties[side === 'attacker' ? 'defender' : 'attacker'][targetType] += casualties;
        }
        
        roundResult.actions.push({
          attacker_type: shipType,
          attacker_count: count,
          target_type: targetType,
          damage_dealt: totalShipDamage,
          casualties_inflicted: casualties
        });
      }
    }
  }

  /**
   * Calculates average speed of fleet composition
   * @param {Object} composition - Fleet composition
   * @returns {number} Average speed
   * @private
   */
  _calculateAverageSpeed(composition) {
    let totalSpeed = 0;
    let totalShips = 0;
    
    for (const [shipType, count] of Object.entries(composition)) {
      const stats = this.SHIP_STATS[shipType];
      if (stats && count > 0) {
        totalSpeed += stats.speed * count;
        totalShips += count;
      }
    }
    
    return totalShips > 0 ? totalSpeed / totalShips : 0;
  }

  /**
   * Checks for combat end conditions
   * @param {Object} combatState - Current combat state
   * @private
   */
  _checkCombatEndConditions(combatState) {
    // Check if either side is eliminated
    const attackerShips = Object.values(combatState.attacker.composition).reduce((sum, count) => sum + count, 0);
    const defenderShips = Object.values(combatState.defender.composition).reduce((sum, count) => sum + count, 0);
    
    if (attackerShips === 0 || defenderShips === 0) {
      combatState.combat_ended = true;
      return;
    }
    
    // Check retreat conditions
    const attackerStrength = combatState.attacker.current_health / combatState.attacker.power.total_health;
    const defenderStrength = combatState.defender.current_health / combatState.defender.power.total_health;
    
    if (attackerStrength <= this.RETREAT_THRESHOLD || defenderStrength <= this.RETREAT_THRESHOLD) {
      combatState.retreat_triggered = true;
    }
  }

  /**
   * Finalizes combat results
   * @param {Object} combatState - Final combat state
   * @param {Array} rounds - Combat rounds
   * @returns {Object} Final combat result
   * @private
   */
  _finalizeCombatResult(combatState, rounds) {
    const attackerShips = Object.values(combatState.attacker.composition).reduce((sum, count) => sum + count, 0);
    const defenderShips = Object.values(combatState.defender.composition).reduce((sum, count) => sum + count, 0);
    
    let winner = 'draw';
    let result_type = 'mutual_destruction';
    
    if (attackerShips > 0 && defenderShips === 0) {
      winner = 'attacker';
      result_type = 'decisive_victory';
    } else if (defenderShips > 0 && attackerShips === 0) {
      winner = 'defender';
      result_type = 'defensive_victory';
    } else if (combatState.retreat_triggered) {
      // Determine who retreated
      const attackerStrength = combatState.attacker.current_health / combatState.attacker.power.total_health;
      const defenderStrength = combatState.defender.current_health / combatState.defender.power.total_health;
      
      if (attackerStrength <= this.RETREAT_THRESHOLD) {
        winner = 'defender';
        result_type = 'attacker_retreat';
      } else {
        winner = 'attacker';
        result_type = 'defender_retreat';
      }
    }
    
    return {
      winner,
      result_type,
      rounds_fought: rounds.length,
      final_compositions: {
        attacker: combatState.attacker.composition,
        defender: combatState.defender.composition
      },
      casualty_summary: this._calculateCasualtySummary(rounds),
      combat_ended: combatState.combat_ended,
      retreat_triggered: combatState.retreat_triggered
    };
  }

  /**
   * Calculates total casualties from all rounds
   * @param {Array} rounds - Combat rounds
   * @returns {Object} Casualty summary
   * @private
   */
  _calculateCasualtySummary(rounds) {
    const casualties = { attacker: {}, defender: {} };
    
    for (const round of rounds) {
      for (const [side, roundCasualties] of Object.entries(round.casualties)) {
        for (const [shipType, count] of Object.entries(roundCasualties)) {
          if (!casualties[side][shipType]) {
            casualties[side][shipType] = 0;
          }
          casualties[side][shipType] += count;
        }
      }
    }
    
    return casualties;
  }

  /**
   * Updates fleet states after combat
   * @param {Object} attackerFleet - Attacking fleet
   * @param {Object} defenderFleet - Defending fleet
   * @param {Object} finalResult - Combat final result
   * @param {Object} client - Database client
   * @private
   */
  async _updateFleetsAfterCombat(attackerFleet, defenderFleet, finalResult, client) {
    // Update attacker fleet
    await this.fleetModel.update(attackerFleet.id, {
      composition: JSON.stringify(finalResult.final_compositions.attacker),
      status: Object.values(finalResult.final_compositions.attacker).reduce((sum, count) => sum + count, 0) === 0 ? 'destroyed' : 'active',
      last_combat: new Date().toISOString()
    }, client);

    // Update defender fleet
    await this.fleetModel.update(defenderFleet.id, {
      composition: JSON.stringify(finalResult.final_compositions.defender),
      status: Object.values(finalResult.final_compositions.defender).reduce((sum, count) => sum + count, 0) === 0 ? 'destroyed' : 'active',
      last_combat: new Date().toISOString()
    }, client);

    // Update experience and morale
    await this.updateFleetExperience(attackerFleet, {
      participated: true,
      victory: finalResult.winner === 'attacker',
      retreat: finalResult.result_type === 'attacker_retreat',
      enemy_power: finalResult.initial ? finalResult.initial.defender_power : 0,
      own_power: finalResult.initial ? finalResult.initial.attacker_power : 0
    }, client);

    await this.updateFleetExperience(defenderFleet, {
      participated: true,
      victory: finalResult.winner === 'defender',
      retreat: finalResult.result_type === 'defender_retreat',
      enemy_power: finalResult.initial ? finalResult.initial.attacker_power : 0,
      own_power: finalResult.initial ? finalResult.initial.defender_power : 0
    }, client);
  }
}

module.exports = CombatResolver;
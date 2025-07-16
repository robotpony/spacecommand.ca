/**
 * Combat model representing a battle between fleets
 * Manages combat resolution, damage calculation, and battle outcomes
 */
class Combat {
  /**
   * Creates a new Combat instance
   * @param {Object} data - Combat initialization data
   * @param {string} data.id - Unique combat identifier
   * @param {string} data.attackerId - Attacking player ID
   * @param {string} data.defenderId - Defending player ID
   * @param {Object} data.attackerFleet - Attacking fleet object
   * @param {Object} data.defenderFleet - Defending fleet object
   * @param {Object} data.location - Battle location coordinates
   * @param {string} data.type - Combat type (fleet, planetary, etc.)
   * @param {string} data.status - Combat status (pending, active, completed)
   */
  constructor(data = {}) {
    this.id = data.id || null;
    this.attackerId = data.attackerId || null;
    this.defenderId = data.defenderId || null;
    this.attackerFleet = data.attackerFleet || null;
    this.defenderFleet = data.defenderFleet || null;
    this.location = data.location || null;
    this.type = data.type || 'fleet';
    this.status = data.status || 'pending';
    this.rounds = data.rounds || [];
    this.result = data.result || null;
    this.startTime = data.startTime || new Date();
    this.endTime = data.endTime || null;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  static COMBAT_TYPES = {
    fleet: 'Fleet Battle',
    planetary: 'Planetary Assault',
    orbital: 'Orbital Defense',
    boarding: 'Boarding Action'
  };

  static COMBAT_STATUSES = {
    pending: 'Pending',
    active: 'Active',
    completed: 'Completed',
    aborted: 'Aborted'
  };

  /**
   * Calculates hit chance based on fleet stats
   * @param {Object} attacker - Attacking fleet
   * @param {Object} defender - Defending fleet
   * @returns {number} Hit chance (0.1-0.9)
   */
  static calculateHitChance(attacker, defender) {
    const attackerSkill = attacker.experience || 0;
    const defenderSkill = defender.experience || 0;
    const moraleBonus = (attacker.morale - 50) / 100;
    const baseChance = 0.6;
    
    let hitChance = baseChance + (attackerSkill / 1000) - (defenderSkill / 1000) + moraleBonus;
    
    return Math.max(0.1, Math.min(0.9, hitChance));
  }

  static calculateDamage(attackPower, defensePower) {
    const damageRatio = attackPower / (attackPower + defensePower);
    const baseDamage = attackPower * damageRatio;
    const randomFactor = 0.8 + (Math.random() * 0.4);
    
    return Math.floor(baseDamage * randomFactor);
  }

  initiateCombat() {
    this.status = 'active';
    this.startTime = new Date();
    this.updatedAt = new Date();
  }

  /**
   * Resolves the entire combat encounter
   * @returns {Object} Combat result with winner and survivors
   */
  resolveCombat() {
    if (this.status !== 'active') {
      this.initiateCombat();
    }

    const maxRounds = 20;
    let roundCount = 0;
    
    while (roundCount < maxRounds && this.status === 'active') {
      const round = this.executeRound(roundCount + 1);
      this.rounds.push(round);
      roundCount++;
      
      if (this.checkCombatEnd()) {
        break;
      }
    }
    
    this.finalizeCombat();
    return this.result;
  }

  /**
   * Executes a single round of combat
   * @param {number} roundNumber - Current round number
   * @returns {Object} Round results with actions and damage
   */
  executeRound(roundNumber) {
    const round = {
      number: roundNumber,
      attackerAction: null,
      defenderAction: null,
      casualties: {
        attacker: 0,
        defender: 0
      },
      damage: {
        attacker: 0,
        defender: 0
      }
    };

    const attackerPower = this.calculateFleetPower(this.attackerFleet);
    const defenderPower = this.calculateFleetPower(this.defenderFleet);
    
    const attackerHitChance = Combat.calculateHitChance(this.attackerFleet, this.defenderFleet);
    const defenderHitChance = Combat.calculateHitChance(this.defenderFleet, this.attackerFleet);
    
    if (Math.random() < attackerHitChance) {
      const damage = Combat.calculateDamage(attackerPower, defenderPower);
      round.damage.defender = damage;
      round.casualties.defender = this.applyDamageToFleet(this.defenderFleet, damage);
      round.attackerAction = 'hit';
    } else {
      round.attackerAction = 'miss';
    }
    
    if (Math.random() < defenderHitChance) {
      const damage = Combat.calculateDamage(defenderPower, attackerPower);
      round.damage.attacker = damage;
      round.casualties.attacker = this.applyDamageToFleet(this.attackerFleet, damage);
      round.defenderAction = 'hit';
    } else {
      round.defenderAction = 'miss';
    }
    
    this.updateFleetMorale();
    
    return round;
  }

  /**
   * Calculates total fleet combat power
   * @param {Object} fleet - Fleet to calculate power for
   * @returns {number} Total fleet power
   */
  calculateFleetPower(fleet) {
    if (!fleet || !fleet.ships) return 0;
    
    let totalPower = 0;
    
    fleet.ships.forEach(ship => {
      const Fleet = require('./Fleet');
      const shipType = Fleet.SHIP_TYPES[ship.type];
      
      if (shipType) {
        const effectiveQuantity = ship.quantity * (1 - ship.damage / 100);
        const shipPower = shipType.stats.attack + shipType.stats.defense;
        totalPower += shipPower * effectiveQuantity;
      }
    });
    
    const moraleMultiplier = fleet.morale / 100;
    const experienceMultiplier = 1 + (fleet.experience / 1000);
    
    return Math.floor(totalPower * moraleMultiplier * experienceMultiplier);
  }

  applyDamageToFleet(fleet, damage) {
    if (!fleet || !fleet.ships || fleet.ships.length === 0) return 0;
    
    let remainingDamage = damage;
    let casualties = 0;
    
    fleet.ships.forEach(ship => {
      if (remainingDamage <= 0) return;
      
      const Fleet = require('./Fleet');
      const shipType = Fleet.SHIP_TYPES[ship.type];
      
      if (shipType) {
        const shipHealth = shipType.stats.defense * ship.quantity;
        const damageToShip = Math.min(remainingDamage, shipHealth);
        
        const shipsDestroyed = Math.floor(damageToShip / shipType.stats.defense);
        ship.quantity -= shipsDestroyed;
        casualties += shipsDestroyed;
        
        const residualDamage = damageToShip % shipType.stats.defense;
        if (residualDamage > 0 && ship.quantity > 0) {
          ship.damage += (residualDamage / shipType.stats.defense) * 100;
        }
        
        remainingDamage -= damageToShip;
      }
    });
    
    fleet.ships = fleet.ships.filter(ship => ship.quantity > 0);
    return casualties;
  }

  updateFleetMorale() {
    const attackerPower = this.calculateFleetPower(this.attackerFleet);
    const defenderPower = this.calculateFleetPower(this.defenderFleet);
    
    if (attackerPower > defenderPower * 1.5) {
      this.attackerFleet.morale = Math.min(this.attackerFleet.morale + 2, 100);
      this.defenderFleet.morale = Math.max(this.defenderFleet.morale - 3, 0);
    } else if (defenderPower > attackerPower * 1.5) {
      this.defenderFleet.morale = Math.min(this.defenderFleet.morale + 2, 100);
      this.attackerFleet.morale = Math.max(this.attackerFleet.morale - 3, 0);
    } else {
      this.attackerFleet.morale = Math.max(this.attackerFleet.morale - 1, 0);
      this.defenderFleet.morale = Math.max(this.defenderFleet.morale - 1, 0);
    }
  }

  checkCombatEnd() {
    const attackerAlive = this.attackerFleet.ships.length > 0;
    const defenderAlive = this.defenderFleet.ships.length > 0;
    const attackerRetreat = this.attackerFleet.morale < 20;
    const defenderRetreat = this.defenderFleet.morale < 20;
    
    if (!attackerAlive || attackerRetreat) {
      this.result = {
        winner: this.defenderId,
        loser: this.attackerId,
        type: !attackerAlive ? 'destruction' : 'retreat',
        survivors: {
          attacker: this.getFleetSummary(this.attackerFleet),
          defender: this.getFleetSummary(this.defenderFleet)
        }
      };
      return true;
    }
    
    if (!defenderAlive || defenderRetreat) {
      this.result = {
        winner: this.attackerId,
        loser: this.defenderId,
        type: !defenderAlive ? 'destruction' : 'retreat',
        survivors: {
          attacker: this.getFleetSummary(this.attackerFleet),
          defender: this.getFleetSummary(this.defenderFleet)
        }
      };
      return true;
    }
    
    return false;
  }

  getFleetSummary(fleet) {
    return {
      totalShips: fleet.ships.reduce((sum, ship) => sum + ship.quantity, 0),
      ships: fleet.ships.map(ship => ({
        type: ship.type,
        quantity: ship.quantity,
        damage: ship.damage
      })),
      morale: fleet.morale,
      experience: fleet.experience
    };
  }

  finalizeCombat() {
    this.status = 'completed';
    this.endTime = new Date();
    this.updatedAt = new Date();
    
    const experienceGain = Math.floor(this.rounds.length * 10);
    this.attackerFleet.experience += experienceGain;
    this.defenderFleet.experience += experienceGain;
    
    if (this.result && this.result.winner) {
      const winnerFleet = this.result.winner === this.attackerId ? this.attackerFleet : this.defenderFleet;
      winnerFleet.experience += experienceGain;
    }
  }

  abort() {
    this.status = 'aborted';
    this.endTime = new Date();
    this.updatedAt = new Date();
  }

  getTotalCasualties() {
    return this.rounds.reduce((total, round) => {
      return total + round.casualties.attacker + round.casualties.defender;
    }, 0);
  }

  getDuration() {
    if (!this.endTime) return 0;
    return this.endTime.getTime() - this.startTime.getTime();
  }

  toJSON() {
    return {
      id: this.id,
      attackerId: this.attackerId,
      defenderId: this.defenderId,
      attackerFleet: this.attackerFleet,
      defenderFleet: this.defenderFleet,
      location: this.location,
      type: this.type,
      status: this.status,
      rounds: this.rounds,
      result: this.result,
      startTime: this.startTime,
      endTime: this.endTime,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = Combat;
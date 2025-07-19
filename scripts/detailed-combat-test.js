#!/usr/bin/env node

/**
 * Detailed Combat Testing Script for SpaceCommand
 * Tests individual damage calculations and combat mechanics
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const CombatResolver = require('../src/server/services/CombatResolver');

class DetailedCombatTester {
  constructor() {
    this.combatResolver = new CombatResolver();
  }

  /**
   * Test individual damage calculations
   */
  testDamageCalculations() {
    console.log('🔍 Testing Individual Damage Calculations\n');

    const shipTypes = ['scout', 'fighter', 'corvette', 'destroyer', 'cruiser', 'battleship', 'dreadnought'];
    
    console.log('Damage Matrix (Average damage per attack):');
    console.log('Attacker \\ Target    |', shipTypes.map(s => s.substr(0,6).padEnd(6)).join(' | '));
    console.log('-'.repeat(22 + shipTypes.length * 9));

    for (const attacker of shipTypes) {
      const row = attacker.padEnd(20) + ' | ';
      const damages = shipTypes.map(target => {
        // Calculate average damage over 100 samples
        let totalDamage = 0;
        for (let i = 0; i < 100; i++) {
          totalDamage += this.combatResolver.calculateDamage(attacker, target, {
            experience_level: 0,
            morale: 50,
            experience_bonus: true,
            morale_modifier: true
          });
        }
        const avgDamage = (totalDamage / 100).toFixed(1);
        return avgDamage.padEnd(6);
      }).join(' | ');
      
      console.log(row + damages);
    }

    console.log('\n');
  }

  /**
   * Test evasion mechanics
   */
  testEvasionMechanics() {
    console.log('🏃 Testing Evasion Mechanics\n');

    const lightShips = ['scout', 'fighter'];
    const heavyWeapons = ['cruiser', 'battleship', 'dreadnought'];

    console.log('Evasion Test - Light ships vs Heavy weapons:');
    
    for (const lightShip of lightShips) {
      console.log(`\n${lightShip.toUpperCase()} evasion rates:`);
      
      for (const heavyShip of heavyWeapons) {
        let totalDamage = 0;
        let totalBaseDamage = 0;
        
        for (let i = 0; i < 100; i++) {
          const damage = this.combatResolver.calculateDamage(heavyShip, lightShip);
          const attackerStats = this.combatResolver.SHIP_STATS[heavyShip];
          totalDamage += damage;
          totalBaseDamage += attackerStats.attack;
        }
        
        const avgDamage = totalDamage / 100;
        const avgBaseDamage = totalBaseDamage / 100;
        const evasionEffect = ((avgBaseDamage - avgDamage) / avgBaseDamage * 100).toFixed(1);
        
        console.log(`  vs ${heavyShip}: ${avgDamage.toFixed(1)} damage (${evasionEffect}% reduction)`);
      }
    }

    console.log('\n');
  }

  /**
   * Test minimum damage system
   */
  testMinimumDamage() {
    console.log('🛡️ Testing Minimum Damage System\n');

    const weakAttacker = 'scout';
    const strongDefender = 'dreadnought';

    console.log(`Testing ${weakAttacker} vs ${strongDefender} (worst case scenario):`);

    let damages = [];
    for (let i = 0; i < 100; i++) {
      damages.push(this.combatResolver.calculateDamage(weakAttacker, strongDefender, {
        experience_level: 0,
        morale: 50,
        experience_bonus: true,
        morale_modifier: true
      }));
    }

    const minDamage = Math.min(...damages);
    const maxDamage = Math.max(...damages);
    const avgDamage = damages.reduce((sum, d) => sum + d, 0) / damages.length;
    const attackerStats = this.combatResolver.SHIP_STATS[weakAttacker];

    console.log(`Attacker base attack: ${attackerStats.attack}`);
    console.log(`Min damage dealt: ${minDamage}`);
    console.log(`Max damage dealt: ${maxDamage}`);
    console.log(`Average damage: ${avgDamage.toFixed(1)}`);
    console.log(`Minimum damage threshold: ${Math.max(1, attackerStats.attack * 0.1)}`);

    const zeroDamageCount = damages.filter(d => d === 0).length;
    console.log(`Zero damage instances: ${zeroDamageCount}/100 (should be 0)`);

    console.log('\n');
  }

  /**
   * Test experience impact
   */
  testExperienceImpact() {
    console.log('⭐ Testing Experience Impact\n');

    const testShip = 'fighter';
    const targetShip = 'corvette';

    console.log(`Testing ${testShip} vs ${targetShip} with different experience levels:`);

    for (let exp = 0; exp <= 100; exp += 25) {
      let totalDamage = 0;
      
      for (let i = 0; i < 100; i++) {
        totalDamage += this.combatResolver.calculateDamage(testShip, targetShip, {
          experience_level: exp,
          morale: 50,
          experience_bonus: true,
          morale_modifier: true
        });
      }
      
      const avgDamage = totalDamage / 100;
      const expBonus = ((exp * 0.002) * 100).toFixed(1);
      
      console.log(`Experience ${exp}: ${avgDamage.toFixed(1)} damage (+${expBonus}% bonus)`);
    }

    console.log('\n');
  }

  /**
   * Test cost effectiveness with new stats
   */
  testCostEffectiveness() {
    console.log('💰 Testing Cost Effectiveness\n');

    const shipTypes = ['scout', 'fighter', 'corvette', 'destroyer', 'cruiser', 'battleship', 'dreadnought'];
    const budget = 1000;

    console.log('Cost-Effectiveness Analysis (1000 resource budget):');
    console.log('Ship Type    | Qty | Total ATK | Total HP | ATK*HP Score | Efficiency');
    console.log('-------------|-----|-----------|----------|--------------|----------');

    for (const shipType of shipTypes) {
      const stats = this.combatResolver.SHIP_STATS[shipType];
      const quantity = Math.floor(budget / stats.cost);
      const totalAttack = quantity * stats.attack;
      const totalHealth = quantity * stats.health;
      const score = totalAttack * totalHealth;
      const efficiency = quantity > 0 ? (score / budget).toFixed(1) : '0.0';

      console.log(
        `${shipType.padEnd(12)} | ${quantity.toString().padStart(3)} | ${totalAttack.toString().padStart(9)} | ${totalHealth.toString().padStart(8)} | ${score.toString().padStart(12)} | ${efficiency.padStart(9)}`
      );
    }

    console.log('\n');
  }

  /**
   * Run all detailed tests
   */
  async runAllTests() {
    console.log('🔬 Starting Detailed Combat Analysis\n');
    console.log('='.repeat(60));

    this.testDamageCalculations();
    this.testEvasionMechanics();
    this.testMinimumDamage();
    this.testExperienceImpact();
    this.testCostEffectiveness();

    console.log('='.repeat(60));
    console.log('🔬 Detailed Combat Analysis Complete');
    console.log('='.repeat(60));
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new DetailedCombatTester();
  tester.runAllTests().catch(console.error);
}

module.exports = DetailedCombatTester;
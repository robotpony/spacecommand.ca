#!/usr/bin/env node

/**
 * Combat Balance Testing Script for SpaceCommand
 * Tests various ship combinations and combat scenarios to identify balance issues
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const CombatResolver = require('../src/server/services/CombatResolver');

class CombatBalanceTester {
  constructor() {
    this.combatResolver = new CombatResolver();
    this.results = [];
  }

  /**
   * Run comprehensive combat balance tests
   */
  async runAllTests() {
    console.log('🔥 Starting Combat Balance Testing\n');

    try {
      // Test 1: 1v1 ship type effectiveness
      console.log('📊 Test 1: Ship-vs-Ship Effectiveness Matrix');
      await this.testShipVsShipMatrix();

      // Test 2: Fleet composition effectiveness
      console.log('\n📊 Test 2: Fleet Composition Analysis');
      await this.testFleetCompositions();

      // Test 3: Cost-effectiveness analysis
      console.log('\n📊 Test 3: Cost-Effectiveness Analysis');
      await this.testCostEffectiveness();

      // Test 4: Experience impact testing
      console.log('\n📊 Test 4: Experience Impact Testing');
      await this.testExperienceImpact();

      // Generate summary report
      console.log('\n📋 Generating Balance Report...');
      this.generateBalanceReport();

    } catch (error) {
      console.error('❌ Combat testing failed:', error.message);
    }
  }

  /**
   * Test all ship types against each other in 1v1 scenarios
   */
  async testShipVsShipMatrix() {
    const shipTypes = ['scout', 'fighter', 'corvette', 'destroyer', 'cruiser', 'battleship', 'dreadnought'];
    const matrix = {};

    for (const attacker of shipTypes) {
      matrix[attacker] = {};
      
      for (const defender of shipTypes) {
        // Create test fleets
        const attackerFleet = {
          id: 1,
          empire_id: 1,
          [attacker]: 1,
          experience: 0,
          morale: 100
        };

        const defenderFleet = {
          id: 2,
          empire_id: 2,
          [defender]: 1,
          experience: 0,
          morale: 100
        };

        // Simulate combat 100 times for statistical accuracy
        let attackerWins = 0;
        for (let i = 0; i < 100; i++) {
          const result = await this.simulateCombat(attackerFleet, defenderFleet);
          if (result.winner === 1) attackerWins++;
        }

        matrix[attacker][defender] = (attackerWins / 100 * 100).toFixed(1) + '%';
      }
    }

    // Display matrix
    console.log('\\nShip vs Ship Win Rate Matrix:');
    console.log('Attacker \\ Defender |', shipTypes.map(s => s.substr(0,6).padEnd(6)).join(' | '));
    console.log('-'.repeat(20 + shipTypes.length * 9));
    
    for (const attacker of shipTypes) {
      const row = attacker.padEnd(18) + ' | ';
      const rates = shipTypes.map(defender => matrix[attacker][defender].padEnd(6)).join(' | ');
      console.log(row + rates);
    }

    this.results.push({
      test: 'Ship vs Ship Matrix',
      data: matrix,
      analysis: this.analyzeShipMatrix(matrix, shipTypes)
    });
  }

  /**
   * Test different fleet compositions
   */
  async testFleetCompositions() {
    const compositions = [
      { name: 'Pure Scouts', scout: 20 },
      { name: 'Pure Fighters', fighter: 10 },
      { name: 'Pure Corvettes', corvette: 5 },
      { name: 'Pure Destroyers', destroyer: 3 },
      { name: 'Balanced Light', scout: 5, fighter: 5, corvette: 2 },
      { name: 'Balanced Heavy', destroyer: 2, cruiser: 1, battleship: 1 },
      { name: 'Mixed Fleet', scout: 3, fighter: 3, corvette: 2, destroyer: 1 },
      { name: 'Capital Ship', cruiser: 1, battleship: 1 },
      { name: 'Dreadnought Solo', dreadnought: 1 }
    ];

    const results = {};

    // Test each composition against every other
    for (let i = 0; i < compositions.length; i++) {
      for (let j = i + 1; j < compositions.length; j++) {
        const fleetA = { ...compositions[i], id: 1, empire_id: 1, experience: 0, morale: 100 };
        const fleetB = { ...compositions[j], id: 2, empire_id: 2, experience: 0, morale: 100 };
        
        delete fleetA.name;
        delete fleetB.name;

        let winsA = 0;
        for (let battle = 0; battle < 50; battle++) {
          const result = await this.simulateCombat(fleetA, fleetB);
          if (result.winner === 1) winsA++;
        }

        const winRate = (winsA / 50 * 100).toFixed(1);
        console.log(`${compositions[i].name} vs ${compositions[j].name}: ${winRate}% win rate`);
      }
    }
  }

  /**
   * Test cost-effectiveness of different ship types
   */
  async testCostEffectiveness() {
    const shipTypes = ['scout', 'fighter', 'corvette', 'destroyer', 'cruiser', 'battleship', 'dreadnought'];
    const baseCost = 1000; // Total resource budget for comparison

    console.log('\\nCost-Effectiveness Analysis (1000 resource budget):');
    
    for (const shipType of shipTypes) {
      const stats = this.combatResolver.SHIP_STATS[shipType];
      const quantity = Math.floor(baseCost / stats.cost);
      const totalAttack = quantity * stats.attack;
      const totalHealth = quantity * stats.health;
      const effectiveness = totalAttack * totalHealth / 1000; // Combined effectiveness metric

      console.log(`${shipType.padEnd(12)}: ${quantity} ships, Attack: ${totalAttack}, HP: ${totalHealth}, Score: ${effectiveness.toFixed(1)}`);
    }
  }

  /**
   * Test impact of experience on combat outcomes
   */
  async testExperienceImpact() {
    const experienceLevels = [0, 25, 50, 75, 100];
    
    console.log('\\nExperience Impact Testing:');
    
    for (const expLevel of experienceLevels) {
      const veteranFleet = {
        id: 1,
        empire_id: 1,
        fighter: 5,
        experience: expLevel,
        morale: 100
      };

      const rookieFleet = {
        id: 2,
        empire_id: 2,
        fighter: 5,
        experience: 0,
        morale: 100
      };

      let veteranWins = 0;
      for (let i = 0; i < 100; i++) {
        const result = await this.simulateCombat(veteranFleet, rookieFleet);
        if (result.winner === 1) veteranWins++;
      }

      console.log(`Experience ${expLevel}: ${veteranWins}% win rate vs rookies`);
    }
  }

  /**
   * Simulate a combat encounter using updated mechanics
   */
  async simulateCombat(fleetA, fleetB) {
    // Create more realistic fleet structures
    const createFleetStructure = (fleet) => {
      const composition = {};
      for (const [shipType, count] of Object.entries(fleet)) {
        if (typeof count === 'number' && this.combatResolver.SHIP_STATS[shipType]) {
          composition[shipType] = count;
        }
      }
      return {
        ...fleet,
        composition: JSON.stringify(composition)
      };
    };

    try {
      // Convert to proper fleet structures
      const fleetStructureA = createFleetStructure(fleetA);
      const fleetStructureB = createFleetStructure(fleetB);

      // Use the actual combat resolver's fleet power calculation
      const powerA = this.combatResolver.calculateFleetPower(fleetStructureA);
      const powerB = this.combatResolver.calculateFleetPower(fleetStructureB);

      // Simple simulation based on effective power with randomness
      const effectivePowerA = powerA.effective_power * (0.8 + Math.random() * 0.4);
      const effectivePowerB = powerB.effective_power * (0.8 + Math.random() * 0.4);

      return {
        winner: effectivePowerA > effectivePowerB ? fleetA.empire_id : fleetB.empire_id,
        powerA: effectivePowerA,
        powerB: effectivePowerB
      };
    } catch (error) {
      // Fallback to simple calculation if fleet power fails
      const getTotalPower = (fleet) => {
        let power = 0;
        for (const [shipType, count] of Object.entries(fleet)) {
          if (typeof count === 'number' && this.combatResolver.SHIP_STATS[shipType]) {
            const stats = this.combatResolver.SHIP_STATS[shipType];
            const expBonus = 1 + (fleet.experience || 0) * 0.002; // Updated to match new bonus
            const moraleBonus = 1 + ((fleet.morale || 100) - 100) * 0.01;
            power += count * stats.attack * stats.health * expBonus * moraleBonus;
          }
        }
        return power;
      };

      const powerA = getTotalPower(fleetA);
      const powerB = getTotalPower(fleetB);
      
      const randomA = powerA * (0.8 + Math.random() * 0.4);
      const randomB = powerB * (0.8 + Math.random() * 0.4);

      return {
        winner: randomA > randomB ? fleetA.empire_id : fleetB.empire_id,
        powerA: randomA,
        powerB: randomB
      };
    }
  }

  /**
   * Analyze ship vs ship matrix for balance issues
   */
  analyzeShipMatrix(matrix, shipTypes) {
    const issues = [];
    
    for (const attacker of shipTypes) {
      let dominantCount = 0;
      let weakCount = 0;
      
      for (const defender of shipTypes) {
        const winRate = parseFloat(matrix[attacker][defender]);
        if (winRate > 70) dominantCount++;
        if (winRate < 30) weakCount++;
      }
      
      if (dominantCount > shipTypes.length * 0.6) {
        issues.push(`${attacker} is overpowered (dominates ${dominantCount}/${shipTypes.length} matchups)`);
      }
      
      if (weakCount > shipTypes.length * 0.6) {
        issues.push(`${attacker} is underpowered (loses ${weakCount}/${shipTypes.length} matchups)`);
      }
    }
    
    return issues;
  }

  /**
   * Generate comprehensive balance report
   */
  generateBalanceReport() {
    console.log('\\n' + '='.repeat(60));
    console.log('                COMBAT BALANCE REPORT');
    console.log('='.repeat(60));

    for (const result of this.results) {
      console.log(`\\n${result.test}:`);
      if (result.analysis && result.analysis.length > 0) {
        console.log('⚠️  Issues Found:');
        result.analysis.forEach(issue => console.log(`   - ${issue}`));
      } else {
        console.log('✅ No major balance issues detected');
      }
    }

    console.log('\\n' + '='.repeat(60));
    console.log('📊 Testing Complete - Review results above');
    console.log('='.repeat(60));
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new CombatBalanceTester();
  tester.runAllTests().catch(console.error);
}

module.exports = CombatBalanceTester;
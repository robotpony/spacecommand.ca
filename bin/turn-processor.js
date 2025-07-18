#!/usr/bin/env node

/**
 * Turn Processing Script
 * Processes end-of-turn calculations and advances the game state
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const TurnManager = require('../src/server/services/TurnManager');
const ResourceCalculator = require('../src/server/services/ResourceCalculator');
const CombatResolver = require('../src/server/services/CombatResolver');
const DiplomacyProcessor = require('../src/server/services/DiplomacyProcessor');
const TerritoryExpansion = require('../src/server/services/TerritoryExpansion');
const BaseModel = require('../src/server/models/BaseModel');
const database = require('../src/server/config/database');

// Initialize services
const turnManager = new TurnManager();
const resourceCalculator = new ResourceCalculator();
const combatResolver = new CombatResolver();
const diplomacyProcessor = new DiplomacyProcessor();
const territoryExpansion = new TerritoryExpansion();

// Initialize models
const empireModel = new BaseModel('empires');
const fleetModel = new BaseModel('fleets');

async function processTurn() {
  console.log('⏰ Starting turn processing...\n');

  try {
    // Get current turn status
    const currentTurn = await turnManager.getCurrentTurn();
    console.log(`📅 Processing Turn ${currentTurn.turn_number}`);
    console.log(`   Phase: ${currentTurn.phase}`);
    console.log(`   Time Remaining: ${Math.round(currentTurn.time_remaining_ms / 1000 / 60)} minutes\n`);

    // Check if turn should advance
    if (currentTurn.time_remaining_ms > 0 && !process.argv.includes('--force')) {
      console.log('⏳ Turn not ready to advance. Use --force to override.');
      return;
    }

    if (currentTurn.is_processing) {
      console.log('🔄 Turn is already being processed. Exiting.');
      return;
    }

    console.log('🔄 Processing end-of-turn calculations...\n');

    // Get all active empires
    const activeEmpires = await empireModel.find({ status: 'active' });
    console.log(`👥 Processing ${activeEmpires.length} active empires`);

    const processingResults = {
      empires_processed: 0,
      resource_updates: [],
      combat_resolutions: [],
      diplomacy_updates: [],
      colonization_completions: [],
      errors: []
    };

    // Process each empire
    for (const empire of activeEmpires) {
      try {
        console.log(`   Processing Empire ${empire.id} (${empire.name})...`);

        // 1. Process resource production
        const resourceResult = await resourceCalculator.processResourceProduction(empire.id);
        processingResults.resource_updates.push({
          empire_id: empire.id,
          empire_name: empire.name,
          resource_changes: resourceResult.resource_changes,
          overflow_converted: resourceResult.overflow_converted
        });

        processingResults.empires_processed++;

      } catch (error) {
        console.error(`   ❌ Error processing empire ${empire.id}:`, error.message);
        processingResults.errors.push({
          empire_id: empire.id,
          error: error.message
        });
      }
    }

    // 2. Process combat resolutions
    console.log('\n⚔️  Processing combat resolutions...');
    const activeCombats = await fleetModel.find({ status: 'in_combat' });
    console.log(`   Found ${activeCombats.length} active combat situations`);

    // This would be expanded to handle actual combat resolution
    // For now, just log that we checked

    // 3. Process diplomacy
    console.log('\n🤝 Processing diplomacy...');
    const tradeResults = await diplomacyProcessor.processTradeRoutes();
    processingResults.diplomacy_updates = tradeResults;
    console.log(`   Processed ${tradeResults.length} trade routes`);

    // 4. Process territory expansion
    console.log('\n🏗️  Processing colonization completions...');
    const colonizationResults = await territoryExpansion.processColonizationCompletion();
    processingResults.colonization_completions = colonizationResults;
    console.log(`   Completed ${colonizationResults.length} colonizations`);

    // 5. Advance to next turn
    console.log('\n⏭️  Advancing to next turn...');
    const newTurn = await turnManager.advanceTurn();
    
    console.log('✅ Turn processing completed successfully!');
    console.log(`\n📈 Processing Summary:`);
    console.log(`   Empires Processed: ${processingResults.empires_processed}`);
    console.log(`   Resource Updates: ${processingResults.resource_updates.length}`);
    console.log(`   Trade Routes Processed: ${processingResults.diplomacy_updates.length}`);
    console.log(`   Colonizations Completed: ${processingResults.colonization_completions.length}`);
    console.log(`   Errors: ${processingResults.errors.length}`);
    
    if (processingResults.errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      processingResults.errors.forEach(error => {
        console.log(`   Empire ${error.empire_id}: ${error.error}`);
      });
    }

    console.log(`\n🎮 New Turn Information:`);
    console.log(`   Turn Number: ${newTurn.turn_number}`);
    console.log(`   Start Time: ${newTurn.start_time}`);
    console.log(`   End Time: ${newTurn.end_time}`);
    console.log(`   Phase: ${newTurn.phase}`);

  } catch (error) {
    console.error('❌ Turn processing failed:', error.message);
    if (process.env.NODE_ENV === 'development') {
      console.error(error.stack);
    }
    throw error;
  } finally {
    await database.close();
  }
}

async function getTurnStatus() {
  try {
    const currentTurn = await turnManager.getCurrentTurn();
    const timeRemaining = Math.round(currentTurn.time_remaining_ms / 1000 / 60);
    
    console.log('🎮 Current Game Status:');
    console.log(`   Turn Number: ${currentTurn.turn_number}`);
    console.log(`   Phase: ${currentTurn.phase}`);
    console.log(`   Time Remaining: ${timeRemaining} minutes`);
    console.log(`   Is Processing: ${currentTurn.is_processing}`);
    console.log(`   Start Time: ${currentTurn.start_time}`);
    console.log(`   End Time: ${currentTurn.end_time}`);
    
    if (timeRemaining <= 0) {
      console.log('\n⏰ Turn is ready to advance!');
    } else {
      console.log(`\n⏳ Turn will advance in ${timeRemaining} minutes`);
    }

  } catch (error) {
    console.error('❌ Failed to get turn status:', error.message);
    throw error;
  } finally {
    await database.close();
  }
}

// CLI interface
async function main() {
  const command = process.argv[2];
  
  switch (command) {
    case 'process':
      await processTurn();
      break;
    case 'status':
      await getTurnStatus();
      break;
    case 'help':
    default:
      console.log('SpaceCommand Turn Processor\n');
      console.log('Usage:');
      console.log('  node bin/turn-processor.js process [--force]  - Process current turn');
      console.log('  node bin/turn-processor.js status            - Show turn status');
      console.log('  node bin/turn-processor.js help              - Show this help\n');
      console.log('Options:');
      console.log('  --force  - Force turn processing even if time remaining');
      break;
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { processTurn, getTurnStatus };
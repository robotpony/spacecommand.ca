#!/usr/bin/env node

/**
 * Game Initialization Script
 * Sets up the database, creates initial game state, and prepares for first turn
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const database = require('../src/server/config/database');
const MigrationRunner = require('../src/server/config/migration-runner');
const SeedRunner = require('../src/server/config/seed-runner');
const TurnManager = require('../src/server/services/TurnManager');
const { createClient } = require('redis');

async function initializeGame() {
  console.log('🚀 Starting SpaceCommand Game Initialization...\n');

  try {
    // 1. Test database connection
    console.log('📊 Testing database connection...');
    await database.initialize();
    console.log('✅ Database connection successful\n');

    // 2. Run migrations
    console.log('⬆️  Running database migrations...');
    const migrationRunner = new MigrationRunner();
    const migrationResults = await migrationRunner.runMigrations();
    console.log(`✅ ${migrationResults.length} migrations executed\n`);

    // 3. Run seeds
    console.log('🌱 Running database seeds...');
    const seedRunner = new SeedRunner();
    const seedResults = await seedRunner.runSeeds();
    console.log(`✅ ${seedResults.length} seeds executed\n`);

    // 4. Test Redis connection
    console.log('🔴 Testing Redis connection...');
    const redis = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    await redis.connect();
    await redis.ping();
    await redis.disconnect();
    console.log('✅ Redis connection successful\n');

    // 5. Initialize game state
    console.log('🎮 Initializing game state...');
    const turnManager = new TurnManager();
    
    try {
      const initialTurn = await turnManager.initializeGame();
      console.log('✅ Game state initialized successfully');
      console.log(`   Turn Number: ${initialTurn.turn_number}`);
      console.log(`   Start Time: ${initialTurn.start_time}`);
      console.log(`   End Time: ${initialTurn.end_time}`);
      console.log(`   Phase: ${initialTurn.phase}\n`);
    } catch (error) {
      if (error.message.includes('already initialized')) {
        console.log('ℹ️  Game already initialized, skipping...\n');
      } else {
        throw error;
      }
    }

    // 6. Verify game components
    console.log('🔍 Verifying game components...');
    
    // Test current turn retrieval
    const currentTurn = await turnManager.getCurrentTurn();
    console.log('✅ TurnManager working correctly');
    
    // Test action point allocation
    const actionPoints = await turnManager.allocateActionPoints(1); // Test with user ID 1
    console.log('✅ Action point system working correctly');
    
    console.log('\n🎉 Game initialization completed successfully!');
    console.log('\nGame is ready to accept players. Use the following endpoints:');
    console.log('  - POST /api/auth/register - Register new players');
    console.log('  - GET /api/game/status - Check game status');
    console.log('  - GET /api/empire - View empire information');
    console.log('\nTo advance turns manually (for testing):');
    console.log('  - POST /api/game/advance-turn (admin only)');
    
  } catch (error) {
    console.error('❌ Game initialization failed:', error.message);
    if (process.env.NODE_ENV === 'development') {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    // Close database connection
    await database.close();
  }
}

// Run initialization if called directly
if (require.main === module) {
  initializeGame().catch(error => {
    console.error('Fatal error during initialization:', error);
    process.exit(1);
  });
}

module.exports = { initializeGame };
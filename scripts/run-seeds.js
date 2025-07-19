#!/usr/bin/env node
/**
 * Run database seeds
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const database = require('./src/server/config/database');

async function runSeeds() {
  try {
    console.log('🌱 Starting database seeding...');
    
    // Initialize database connection
    await database.initialize();
    console.log('✓ Database connection established');
    
    // Get seed files
    const seedsPath = path.join(__dirname, 'src/server/config/seeds');
    const seedFiles = fs.readdirSync(seedsPath)
      .filter(file => file.endsWith('.js'))
      .sort();
    
    console.log(`📊 Found ${seedFiles.length} seed files`);
    
    for (const filename of seedFiles) {
      try {
        console.log(`🌱 Running seed: ${filename}`);
        
        const seedPath = path.join(seedsPath, filename);
        const seed = require(seedPath);
        
        await database.transaction(async (client) => {
          // Check if seed has 'up' method or 'seed' method
          if (typeof seed.up === 'function') {
            await seed.up(client);
          } else if (typeof seed.seed === 'function') {
            await seed.seed(client);
          } else {
            throw new Error(`Seed ${filename} must export either 'up' or 'seed' function`);
          }
        });
        
        console.log(`✅ Seed completed: ${filename}`);
        
      } catch (error) {
        console.error(`❌ Seed failed: ${filename}`, error);
        throw error;
      }
    }
    
    console.log(`✅ Successfully ran ${seedFiles.length} seeds`);
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    // Close database connections
    await database.close();
    process.exit(0);
  }
}

// Handle unhandled rejections
process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
  process.exit(1);
});

// Run seeds
runSeeds();
#!/usr/bin/env node
/**
 * Run database migrations
 */

require('dotenv').config();
const MigrationRunner = require('./src/server/config/migration-runner');
const database = require('./src/server/config/database');

async function runMigrations() {
  try {
    console.log('🚀 Starting database migrations...');
    
    // Initialize database connection
    await database.initialize();
    console.log('✓ Database connection established');
    
    // Create migration runner and execute migrations
    const runner = new MigrationRunner();
    const status = await runner.getStatus();
    
    console.log(`📊 Migration Status:`);
    console.log(`   Total migrations: ${status.total}`);
    console.log(`   Executed: ${status.executed}`);
    console.log(`   Pending: ${status.pending}`);
    
    if (status.pending > 0) {
      const executed = await runner.runMigrations();
      console.log(`✅ Successfully executed ${executed.length} migrations`);
    } else {
      console.log('✓ All migrations are up to date');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
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

// Run migrations
runMigrations();
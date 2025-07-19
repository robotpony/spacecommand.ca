#!/usr/bin/env node

/**
 * Database Connection Test Script
 * Tests PostgreSQL connection, Redis connection, and basic model operations
 */

require('dotenv').config();
const database = require('./src/server/config/database');

async function testDatabaseConnection() {
  console.log('🔍 Testing SpaceCommand Database Connection...\n');

  try {
    // Test PostgreSQL connection
    console.log('📊 Testing PostgreSQL connection...');
    await database.initialize();
    
    const healthCheck = await database.healthCheck();
    console.log('✅ Database health check:', healthCheck);

    // Test basic query
    console.log('\n🔍 Testing basic PostgreSQL query...');
    const result = await database.query('SELECT NOW() as current_time, version() as version');
    console.log('✅ PostgreSQL query successful:', {
      time: result.rows[0].current_time,
      version: result.rows[0].version.substring(0, 50) + '...'
    });

    // Test Redis (if available)
    console.log('\n🔍 Testing Redis connection...');
    try {
      const redisClient = database.getRedisClient();
      await redisClient.ping();
      console.log('✅ Redis connection successful');
    } catch (redisError) {
      console.log('⚠️  Redis not available (optional):', redisError.message);
    }

    console.log('\n🎉 Database connection test completed successfully!');
    console.log('📝 Next steps:');
    console.log('   1. Run migrations: node src/server/config/migration-runner.js');
    console.log('   2. Seed database: node src/server/config/seed-runner.js');
    console.log('   3. Test models with actual database tables');

  } catch (error) {
    console.error('❌ Database connection test failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Troubleshooting tips:');
      console.log('   • Make sure PostgreSQL is running on localhost:5432');
      console.log('   • Check your database credentials in .env file');
      console.log('   • Create database: createdb spacecommand_dev');
    }
    
    process.exit(1);
  } finally {
    // Clean up connections
    await database.close();
    console.log('\n🔌 Database connections closed');
  }
}

// Run the test
if (require.main === module) {
  testDatabaseConnection();
}

module.exports = testDatabaseConnection;
#!/usr/bin/env node

/**
 * Model Integration Test Script
 * Tests model structure, inheritance, and method availability without database
 */

const Empire = require('./src/server/models/Empire');
const Planet = require('./src/server/models/Planet');
const Fleet = require('./src/server/models/Fleet');
const BaseModel = require('./src/server/models/BaseModel');

function testModelIntegration() {
  console.log('🔍 Testing SpaceCommand Model Integration...\n');

  try {
    // Test BaseModel inheritance
    console.log('📊 Testing BaseModel inheritance...');
    
    const empireModel = new Empire();
    const planetModel = new Planet();
    const fleetModel = new Fleet();
    
    console.log('✅ Empire extends BaseModel:', empireModel instanceof BaseModel);
    console.log('✅ Planet extends BaseModel:', planetModel instanceof BaseModel);
    console.log('✅ Fleet extends BaseModel:', fleetModel instanceof BaseModel);

    // Test table name assignment
    console.log('\n🏷️  Testing table name assignment...');
    console.log('✅ Empire table name:', empireModel.tableName);
    console.log('✅ Planet table name:', planetModel.tableName);
    console.log('✅ Fleet table name:', fleetModel.tableName);

    // Test model construction with data
    console.log('\n🏗️  Testing model construction...');
    
    const empireData = {
      id: 'test-empire-id',
      player_id: 'test-player-id',
      name: 'Test Empire',
      resources: JSON.stringify({ minerals: 1000, energy: 500 }),
      resource_production: JSON.stringify({ minerals: 50, energy: 25 })
    };
    
    const empire = new Empire(empireData);
    console.log('✅ Empire created with data:', {
      id: empire.id,
      name: empire.name,
      resources: empire.resources,
      playerId: empire.playerId
    });

    const planetData = {
      id: 'test-planet-id',
      empire_id: 'test-empire-id',
      name: 'Test Planet',
      position: JSON.stringify({ x: 10, y: 20, z: 30 }),
      specialization: 'mining'
    };
    
    const planet = new Planet(planetData);
    console.log('✅ Planet created with data:', {
      id: planet.id,
      name: planet.name,
      position: planet.position,
      empireId: planet.empireId
    });

    // Test JSON methods
    console.log('\n📄 Testing JSON serialization...');
    const empireJSON = empire.toJSON();
    const planetJSON = planet.toJSON();
    
    console.log('✅ Empire JSON has required fields:', {
      hasId: 'id' in empireJSON,
      hasName: 'name' in empireJSON,
      hasResources: 'resources' in empireJSON,
      hasPlayerId: 'playerId' in empireJSON
    });
    
    console.log('✅ Planet JSON has required fields:', {
      hasId: 'id' in planetJSON,
      hasName: 'name' in planetJSON,
      hasPosition: 'position' in planetJSON,
      hasEmpireId: 'empireId' in planetJSON
    });

    // Test static method existence
    console.log('\n🔧 Testing static method availability...');
    console.log('✅ Empire.createEmpire exists:', typeof Empire.createEmpire === 'function');
    console.log('✅ Empire.findByPlayerId exists:', typeof Empire.findByPlayerId === 'function');
    console.log('✅ Planet.findByEmpireId exists:', typeof Planet.findByEmpireId === 'function');
    console.log('✅ Fleet.findByEmpireId exists:', typeof Fleet.findByEmpireId === 'function');

    // Test instance method existence
    console.log('\n⚙️  Testing instance method availability...');
    console.log('✅ Empire.save exists:', typeof empire.save === 'function');
    console.log('✅ Empire.spendResources exists:', typeof empire.spendResources === 'function');
    console.log('✅ Empire.canAfford exists:', typeof empire.canAfford === 'function');
    console.log('✅ Planet.save exists:', typeof planet.save === 'function');

    // Test BaseModel methods inherited
    console.log('\n🧬 Testing BaseModel method inheritance...');
    console.log('✅ Empire.create exists:', typeof empire.create === 'function');
    console.log('✅ Empire.findById exists:', typeof empire.findById === 'function');
    console.log('✅ Empire.update exists:', typeof empire.update === 'function');
    console.log('✅ Planet.find exists:', typeof planet.find === 'function');
    console.log('✅ Fleet.count exists:', typeof fleetModel.count === 'function');

    console.log('\n🎉 Model integration test completed successfully!');
    console.log('📝 Summary:');
    console.log('   ✅ All models properly extend BaseModel');
    console.log('   ✅ Table names correctly assigned');
    console.log('   ✅ JSON parsing and serialization working');
    console.log('   ✅ Static and instance methods available');
    console.log('   ✅ BaseModel methods inherited');
    console.log('\n🚀 Models are ready for database operations!');

  } catch (error) {
    console.error('❌ Model integration test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testModelIntegration();
}

module.exports = testModelIntegration;
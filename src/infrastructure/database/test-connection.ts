#!/usr/bin/env tsx

/**
 * Database connection and repository test script.
 * Tests database connectivity, migrations, seeding, and basic repository operations.
 */

import { db } from './connection';
import { Migrator } from './migrate';
import { Seeder } from './seed';
import { PlayerRepository } from '../repositories/PlayerRepository';
import { SystemRepository } from '../repositories/SystemRepository';
import { EmpireRepository } from '../repositories/EmpireRepository';
import { FleetRepository } from '../repositories/FleetRepository';
import { PlanetRepository } from '../repositories/PlanetRepository';
import { TechnologyRepository } from '../repositories/TechnologyRepository';
import { TradeRouteRepository } from '../repositories/TradeRouteRepository';
import { DiplomacyRepository } from '../repositories/DiplomacyRepository';

async function testDatabase() {
  console.log('🔍 Testing SpaceCommand Database Layer\n');
  
  try {
    // Test 1: Database Connection
    console.log('1. Testing database connection...');
    await db.connect(3, 1000); // 3 retries, 1 second delay
    console.log('✅ Database connection successful\n');
    
    // Test 2: Run Migrations
    console.log('2. Running database migrations...');
    const migrator = new Migrator();
    await migrator.up();
    console.log('✅ Migrations completed\n');
    
    // Test 3: Seed Test Data
    console.log('3. Seeding test data...');
    const seeder = new Seeder();
    await seeder.seed();
    console.log('✅ Test data seeded\n');
    
    // Test 4: Repository Operations
    console.log('4. Testing repository operations...');
    
    // Test PlayerRepository
    const playerRepo = new PlayerRepository();
    const player = await playerRepo.findByUsername('commander_shepard');
    if (!player) {
      throw new Error('Player not found after seeding');
    }
    console.log(`✅ PlayerRepository: Found player "${player.username}" with ${player.credits} credits`);
    
    // Test authentication
    const authPlayer = await playerRepo.authenticate('commander_shepard', 'password123');
    if (!authPlayer) {
      throw new Error('Authentication failed');
    }
    console.log(`✅ PlayerRepository: Authentication successful for ${authPlayer.username}`);
    
    // Test SystemRepository
    const systemRepo = new SystemRepository();
    const systems = await systemRepo.findAll({}, { limit: 5 });
    console.log(`✅ SystemRepository: Found ${systems.length} star systems`);
    
    const sol = await systemRepo.findByName('Sol');
    if (!sol) {
      throw new Error('Sol system not found');
    }
    console.log(`✅ SystemRepository: Sol system found at coordinates (${sol.coordinates.x}, ${sol.coordinates.y}, ${sol.coordinates.z})`);
    
    // Test spatial queries
    const nearSol = await systemRepo.findWithinRadius({ x: 0, y: 0, z: 0 }, 5);
    console.log(`✅ SystemRepository: Found ${nearSol.length} systems within 5 units of Sol`);
    
    // Test connections
    const connections = await systemRepo.getConnections(sol.id);
    console.log(`✅ SystemRepository: Sol has ${connections.length} jump routes`);
    
    // Test EmpireRepository
    const empireRepo = new EmpireRepository();
    const empires = await empireRepo.getActiveEmpires(10);
    console.log(`✅ EmpireRepository: Found ${empires.length} active empires`);
    
    const playerEmpire = await empireRepo.findByPlayerId(player.id);
    if (playerEmpire) {
      console.log(`✅ EmpireRepository: Found empire "${playerEmpire.name}" for player ${player.username}`);
      
      // Test empire technologies
      const techs = await empireRepo.getTechnologies(playerEmpire.id);
      console.log(`✅ EmpireRepository: Empire has ${techs.length} technologies researched`);
    }
    
    // Test FleetRepository
    const fleetRepo = new FleetRepository();
    if (playerEmpire) {
      const fleets = await fleetRepo.findByEmpireId(playerEmpire.id);
      console.log(`✅ FleetRepository: Empire has ${fleets.length} fleets`);
    }
    
    // Test PlanetRepository
    const planetRepo = new PlanetRepository();
    const planets = await planetRepo.findBySystemId(sol.id);
    console.log(`✅ PlanetRepository: Sol system has ${planets.length} planets`);
    
    if (playerEmpire) {
      const empirePlanets = await planetRepo.findByEmpireId(playerEmpire.id);
      console.log(`✅ PlanetRepository: Empire controls ${empirePlanets.length} planets`);
    }
    
    // Test TechnologyRepository
    const techRepo = new TechnologyRepository();
    const chemicalTechs = await techRepo.findByTier('chemical');
    console.log(`✅ TechnologyRepository: Found ${chemicalTechs.length} chemical tier technologies`);
    
    // Test TradeRouteRepository  
    const tradeRepo = new TradeRouteRepository();
    if (playerEmpire) {
      const tradeRoutes = await tradeRepo.findByEmpireId(playerEmpire.id);
      console.log(`✅ TradeRouteRepository: Empire has ${tradeRoutes.length} trade routes`);
    }
    
    // Test DiplomacyRepository
    const diplomacyRepo = new DiplomacyRepository();
    if (playerEmpire) {
      const relations = await diplomacyRepo.getEmpireRelations(playerEmpire.id);
      console.log(`✅ DiplomacyRepository: Empire has ${relations.length} diplomatic relations`);
    }
    
    // Test 5: Query Performance
    console.log('\n5. Testing query performance...');
    const startTime = Date.now();
    const allPlayers = await playerRepo.findAll();
    const playerQueryTime = Date.now() - startTime;
    console.log(`✅ Player query: ${allPlayers.length} players in ${playerQueryTime}ms`);
    
    const systemStartTime = Date.now();
    const allSystems = await systemRepo.findAll();
    const systemQueryTime = Date.now() - systemStartTime;
    console.log(`✅ System query: ${allSystems.length} systems in ${systemQueryTime}ms`);
    
    // Test 6: Complex Queries
    console.log('\n6. Testing complex queries...');
    
    // Find systems with trading posts
    const tradingSystems = await systemRepo.findByFacilities(['trading_post']);
    console.log(`✅ Found ${tradingSystems.length} systems with trading posts`);
    
    // Find safe systems
    const safeSystems = await systemRepo.findSafeSystems(2);
    console.log(`✅ Found ${safeSystems.length} safe systems (danger ≤ 2)`);
    
    // Find top players by credits
    const richPlayers = await playerRepo.getTopByCredits(3);
    console.log(`✅ Top 3 richest players:`);
    richPlayers.forEach((p, i) => {
      console.log(`   ${i + 1}. ${p.username}: ${p.credits.toLocaleString()} credits`);
    });
    
    console.log('\n🎉 All database tests passed successfully!');
    console.log('\n📊 Database Summary:');
    console.log(`   - Players: ${allPlayers.length}`);
    console.log(`   - Star Systems: ${allSystems.length}`);
    console.log(`   - Active Empires: ${empires.length}`);
    console.log(`   - Planets: ${await planetRepo.count()}`);
    console.log(`   - Technologies: ${chemicalTechs.length} (chemical tier)`);
    console.log(`   - System Connections: ${connections.length * allSystems.length} (estimated)`);
    
  } catch (error) {
    console.error('\n❌ Database test failed:', error);
    throw error;
  } finally {
    await db.close();
    console.log('\n🔒 Database connection closed.');
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testDatabase()
    .then(() => {
      console.log('\n✨ Database testing complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Database testing failed:', error.message);
      process.exit(1);
    });
}

export { testDatabase };
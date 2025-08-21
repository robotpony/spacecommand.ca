import { db } from './connection';
import bcrypt from 'bcryptjs';

/**
 * Database seeder for development and testing environments.
 * Creates players, star systems, planets, technologies, and empires.
 * Provides rich test data for development and comprehensive demo scenarios.
 */

export class Seeder {
  public async seed(): Promise<void> {
    console.log('Seeding database...');
    
    try {
      await db.transaction(async (client) => {
        // Create multiple test players
        const players = [
          { username: 'commander_shepard', email: 'shepard@spacecommand.com', faction: 'terran_federation', credits: 75000 },
          { username: 'trade_baron', email: 'baron@orion.net', faction: 'orion_syndicate', credits: 100000 },
          { username: 'rebel_pilot', email: 'pilot@frontier.space', faction: 'frontier_alliance', credits: 25000 },
          { username: 'demo_player', email: 'demo@example.com', faction: 'independent', credits: 50000 },
          { username: 'admin', email: 'admin@spacecommand.com', faction: 'terran_federation', credits: 1000000 }
        ];
        
        const playerIds: Record<string, string> = {};
        const passwordHash = await bcrypt.hash('password123', 10);
        
        for (const player of players) {
          const result = await client.query(
            `INSERT INTO players (username, email, password_hash, faction, credits) 
             VALUES ($1, $2, $3, $4, $5) 
             RETURNING id`,
            [player.username, player.email, passwordHash, player.faction, player.credits]
          );
          playerIds[player.username] = result.rows[0].id;
        }
        
        // Create diverse star systems with facilities and market data
        const systems = [
          { 
            name: 'Sol', x: 0, y: 0, z: 0, danger: 0, 
            description: 'Humanity\'s birthplace and capital of the Terran Federation',
            facilities: ['spaceport', 'shipyard', 'research_lab', 'bank', 'trading_post'],
            marketPrices: { ore: 100, crystals: 200, energy: 50, food: 25, weapons: 500 }
          },
          { 
            name: 'Alpha Centauri', x: 4, y: 0, z: 0, danger: 1, 
            description: 'A prosperous trade hub with excellent commercial facilities',
            facilities: ['spaceport', 'trading_post', 'bank', 'market'],
            marketPrices: { ore: 80, crystals: 180, energy: 40, food: 20, weapons: 450 }
          },
          { 
            name: 'Vega', x: -3, y: 2, z: 0, danger: 2, 
            description: 'Mining outpost with rich mineral deposits',
            facilities: ['spaceport', 'mining_station', 'refinery'],
            marketPrices: { ore: 60, crystals: 120, energy: 80, food: 40, weapons: 600 }
          },
          { 
            name: 'Orion', x: 0, y: 5, z: 0, danger: 3, 
            description: 'Headquarters of the Orion Syndicate - anything can be bought here',
            facilities: ['spaceport', 'black_market', 'shipyard', 'cantina'],
            marketPrices: { ore: 120, crystals: 250, energy: 60, food: 30, weapons: 300 }
          },
          { 
            name: 'Kepler Station', x: 7, y: -2, z: 1, danger: 4, 
            description: 'Independent research colony studying exotic matter',
            facilities: ['spaceport', 'research_lab', 'observatory'],
            marketPrices: { ore: 150, crystals: 300, energy: 100, food: 60, weapons: 800 }
          },
          { 
            name: 'Frontier Station', x: 10, y: 10, z: 0, danger: 7, 
            description: 'Lawless frontier on the edge of known space - danger and opportunity await',
            facilities: ['spaceport', 'cantina', 'black_market'],
            marketPrices: { ore: 200, crystals: 400, energy: 150, food: 100, weapons: 200 }
          },
          {
            name: 'New Terra', x: -5, y: -3, z: 2, danger: 1,
            description: 'Agricultural colony world supplying food to the core systems',
            facilities: ['spaceport', 'agricultural_center', 'food_processing'],
            marketPrices: { ore: 140, crystals: 220, energy: 70, food: 10, weapons: 700 }
          },
          {
            name: 'Titan Base', x: 2, y: 8, z: -1, danger: 5,
            description: 'Military fortress protecting the inner colonies',
            facilities: ['spaceport', 'military_base', 'shipyard', 'weapons_depot'],
            marketPrices: { ore: 110, crystals: 190, energy: 45, food: 35, weapons: 350 }
          }
        ];
        
        const systemIds: Record<string, string> = {};
        
        for (const system of systems) {
          const result = await client.query(
            `INSERT INTO systems (name, coordinates, danger_level, is_pvp_enabled, description, facilities, market_prices) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) 
             RETURNING id`,
            [
              system.name,
              JSON.stringify({ x: system.x, y: system.y, z: system.z }),
              system.danger,
              system.danger > 5,
              system.description,
              system.facilities,
              JSON.stringify(system.marketPrices)
            ]
          );
          systemIds[system.name] = result.rows[0].id;
        }
        
        // Create system connections forming a realistic trade network
        const connections = [
          { from: 'Sol', to: 'Alpha Centauri', distance: 4.3, dangerous: false },
          { from: 'Sol', to: 'Vega', distance: 3.6, dangerous: false },
          { from: 'Sol', to: 'New Terra', distance: 6.2, dangerous: false },
          { from: 'Alpha Centauri', to: 'Vega', distance: 5.4, dangerous: false },
          { from: 'Alpha Centauri', to: 'Orion', distance: 5.8, dangerous: false },
          { from: 'Alpha Centauri', to: 'Kepler Station', distance: 4.1, dangerous: false },
          { from: 'Vega', to: 'Orion', distance: 5.8, dangerous: false },
          { from: 'Vega', to: 'New Terra', distance: 7.3, dangerous: false },
          { from: 'Orion', to: 'Titan Base', distance: 3.2, dangerous: false },
          { from: 'Orion', to: 'Frontier Station', distance: 14.1, dangerous: true },
          { from: 'Kepler Station', to: 'Titan Base', distance: 6.8, dangerous: false },
          { from: 'Titan Base', to: 'Frontier Station', distance: 8.9, dangerous: true },
          { from: 'New Terra', to: 'Titan Base', distance: 9.1, dangerous: false }
        ];
        
        for (const conn of connections) {
          const travelTime = Math.ceil(conn.distance * 3600); // 1 hour per unit distance
          
          // Add bidirectional connections
          await client.query(
            `INSERT INTO system_connections (from_system_id, to_system_id, distance, travel_time, is_dangerous) 
             VALUES ($1, $2, $3, $4, $5)`,
            [systemIds[conn.from], systemIds[conn.to], conn.distance, travelTime, conn.dangerous]
          );
          
          await client.query(
            `INSERT INTO system_connections (from_system_id, to_system_id, distance, travel_time, is_dangerous) 
             VALUES ($1, $2, $3, $4, $5)`,
            [systemIds[conn.to], systemIds[conn.from], conn.distance, travelTime, conn.dangerous]
          );
        }
        
        // Create planets with realistic populations and resources
        const planets = [
          { name: 'Earth', system: 'Sol', spec: 'balanced', population: 8000000000 },
          { name: 'Mars', system: 'Sol', spec: 'mining', population: 500000000 },
          { name: 'Luna', system: 'Sol', spec: 'industrial', population: 100000000 },
          { name: 'Europa Station', system: 'Sol', spec: 'research', population: 50000000 },
          { name: 'Proxima b', system: 'Alpha Centauri', spec: 'agricultural', population: 200000000 },
          { name: 'Centauri Station', system: 'Alpha Centauri', spec: 'commercial', population: 300000000 },
          { name: 'Vega Prime', system: 'Vega', spec: 'mining', population: 150000000 },
          { name: 'Vega II', system: 'Vega', spec: 'research', population: 75000000 },
          { name: 'Orion Prime', system: 'Orion', spec: 'military', population: 400000000 },
          { name: 'Orion Beta', system: 'Orion', spec: 'commercial', population: 250000000 },
          { name: 'Kepler Prime', system: 'Kepler Station', spec: 'research', population: 80000000 },
          { name: 'New Terra Prime', system: 'New Terra', spec: 'agricultural', population: 600000000 },
          { name: 'Terra Station', system: 'New Terra', spec: 'agricultural', population: 100000000 },
          { name: 'Titan Fortress', system: 'Titan Base', spec: 'military', population: 200000000 },
          { name: 'Frontier Outpost', system: 'Frontier Station', spec: 'balanced', population: 25000000 },
          { name: 'Frontier Mining', system: 'Frontier Station', spec: 'mining', population: 10000000 }
        ];
        
        const planetIds: Record<string, string> = {};
        
        for (const planet of planets) {
          // Generate realistic orbital coordinates
          const angle = Math.random() * 2 * Math.PI;
          const distance = 0.5 + Math.random() * 3; // Orbital distance from star
          const coordinates = {
            x: Math.cos(angle) * distance,
            y: Math.sin(angle) * distance,
            z: (Math.random() - 0.5) * 0.2 // Small Z variation for orbital plane
          };
          
          const result = await client.query(
            `INSERT INTO planets (name, system_id, coordinates, specialization, population) 
             VALUES ($1, $2, $3, $4, $5) 
             RETURNING id`,
            [
              planet.name,
              systemIds[planet.system],
              JSON.stringify(coordinates),
              planet.spec,
              planet.population
            ]
          );
          planetIds[planet.name] = result.rows[0].id;
        }
        
        // Create comprehensive technology tree
        const technologies = [
          // Chemical Era
          { name: 'Basic Mining', tier: 'chemical', cost: 1000, prereqs: [], effects: { miningBonus: 1.2 }, desc: 'Improved drilling and extraction techniques' },
          { name: 'Improved Engines', tier: 'chemical', cost: 1500, prereqs: [], effects: { speedBonus: 1.2 }, desc: 'More efficient chemical propulsion systems' },
          { name: 'Advanced Materials', tier: 'chemical', cost: 2000, prereqs: [], effects: { constructionBonus: 1.15 }, desc: 'Stronger and lighter alloys and composites' },
          { name: 'Hydroponics', tier: 'chemical', cost: 1200, prereqs: [], effects: { foodBonus: 1.3 }, desc: 'Efficient soil-less agriculture' },
          
          // Nuclear Era
          { name: 'Nuclear Fission', tier: 'nuclear', cost: 3000, prereqs: ['Advanced Materials'], effects: { energyBonus: 1.4 }, desc: 'Clean and abundant nuclear power' },
          { name: 'Shield Technology', tier: 'nuclear', cost: 3500, prereqs: ['Nuclear Fission'], effects: { defenseBonus: 1.3 }, desc: 'Energy-based defensive systems' },
          { name: 'Fusion Power', tier: 'nuclear', cost: 5000, prereqs: ['Nuclear Fission'], effects: { energyBonus: 1.8 }, desc: 'The power of stars harnessed for civilization' },
          { name: 'Ion Drives', tier: 'nuclear', cost: 4000, prereqs: ['Improved Engines', 'Nuclear Fission'], effects: { speedBonus: 1.5 }, desc: 'Efficient long-range propulsion' },
          
          // Antimatter Era
          { name: 'Antimatter Containment', tier: 'antimatter', cost: 8000, prereqs: ['Fusion Power', 'Shield Technology'], effects: { safetyBonus: 1.2 }, desc: 'Safe storage and handling of antimatter' },
          { name: 'Antimatter Engines', tier: 'antimatter', cost: 12000, prereqs: ['Antimatter Containment', 'Ion Drives'], effects: { speedBonus: 2.5 }, desc: 'Incredible speed through matter-antimatter annihilation' },
          { name: 'Quantum Computing', tier: 'antimatter', cost: 10000, prereqs: ['Antimatter Containment'], effects: { researchBonus: 1.8 }, desc: 'Computing power beyond classical limitations' },
          { name: 'Gravity Manipulation', tier: 'antimatter', cost: 15000, prereqs: ['Quantum Computing'], effects: { constructionBonus: 1.5 }, desc: 'Control over gravitational forces' },
          
          // Exotic Era
          { name: 'Dimensional Physics', tier: 'exotic', cost: 25000, prereqs: ['Gravity Manipulation'], effects: { scienceBonus: 2.0 }, desc: 'Understanding reality beyond three dimensions' },
          { name: 'Zero Point Energy', tier: 'exotic', cost: 30000, prereqs: ['Dimensional Physics'], effects: { energyBonus: 3.0 }, desc: 'Tapping the quantum vacuum for unlimited power' },
          { name: 'Consciousness Transfer', tier: 'exotic', cost: 35000, prereqs: ['Dimensional Physics'], effects: { populationBonus: 1.5 }, desc: 'Digital immortality and enhanced cognition' },
          { name: 'Reality Engineering', tier: 'exotic', cost: 50000, prereqs: ['Zero Point Energy', 'Consciousness Transfer'], effects: { godMode: true }, desc: 'The power to reshape reality itself' }
        ];
        
        const techIds: Record<string, string> = {};
        
        for (const tech of technologies) {
          const result = await client.query(
            `INSERT INTO technologies (name, tier, research_cost, effects, description, prerequisites) 
             VALUES ($1, $2, $3, $4, $5, $6) 
             RETURNING id`,
            [
              tech.name,
              tech.tier,
              tech.cost,
              JSON.stringify(tech.effects),
              tech.desc,
              tech.prereqs
            ]
          );
          techIds[tech.name] = result.rows[0].id;
        }
        
        // Create sample empires for the main test players
        const empires = [
          { player: 'commander_shepard', name: 'Terran Federation', homeSystem: 'Sol' },
          { player: 'trade_baron', name: 'Orion Trade Consortium', homeSystem: 'Orion' },
          { player: 'rebel_pilot', name: 'Frontier Alliance', homeSystem: 'Frontier Station' }
        ];
        
        for (const empire of empires) {
          const result = await client.query(
            `INSERT INTO empires (name, player_id, faction, home_system_id, credits, score) 
             VALUES ($1, $2, $3, $4, $5, $6) 
             RETURNING id`,
            [
              empire.name,
              playerIds[empire.player],
              'independent', // Will be updated based on faction logic later
              systemIds[empire.homeSystem],
              75000, // Starting empire credits
              1000   // Starting score
            ]
          );
          
          // Give each empire some basic technologies
          const basicTechs = ['Basic Mining', 'Improved Engines', 'Hydroponics'];
          for (const techName of basicTechs) {
            if (techIds[techName]) {
              await client.query(
                `INSERT INTO empire_technologies (empire_id, technology_id, is_researched, research_progress) 
                 VALUES ($1, $2, true, $3)`,
                [result.rows[0].id, techIds[techName], 1000]
              );
            }
          }
        }
        
        console.log('✓ Created', players.length, 'test players');
        console.log('✓ Created', systems.length, 'star systems with facilities and markets');
        console.log('✓ Created', connections.length * 2, 'bidirectional system connections');
        console.log('✓ Created', planets.length, 'planets with populations and specializations');
        console.log('✓ Created', technologies.length, 'technologies across all eras');
        console.log('✓ Created', empires.length, 'sample empires with basic technologies');
        console.log('');
        console.log('Test login credentials:');
        console.log('  Username: commander_shepard | Password: password123');
        console.log('  Username: trade_baron      | Password: password123');
        console.log('  Username: rebel_pilot      | Password: password123');
        console.log('  Username: demo_player      | Password: password123');
        console.log('  Username: admin            | Password: password123');
      });
      
      console.log('Database seeding complete!');
    } catch (error) {
      console.error('Seeding failed:', error);
      throw error;
    }
  }
  
  public async clear(): Promise<void> {
    console.log('Clearing seed data...');
    
    await db.query('DELETE FROM technologies');
    await db.query('DELETE FROM planets');
    await db.query('DELETE FROM system_connections');
    await db.query('DELETE FROM systems');
    await db.query('DELETE FROM players');
    
    console.log('Seed data cleared.');
  }
}

// CLI execution
if (require.main === module) {
  const seeder = new Seeder();
  const command = process.argv[2] || 'seed';
  
  (async () => {
    try {
      switch (command) {
        case 'seed':
          await seeder.seed();
          break;
        case 'clear':
          await seeder.clear();
          break;
        default:
          console.log('Usage: npm run db:seed [seed|clear]');
      }
      process.exit(0);
    } catch (error) {
      console.error('Seed error:', error);
      process.exit(1);
    }
  })();
}
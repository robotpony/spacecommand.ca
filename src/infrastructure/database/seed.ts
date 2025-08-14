import { db } from './connection';
import bcrypt from 'bcryptjs';

export class Seeder {
  public async seed(): Promise<void> {
    console.log('Seeding database...');
    
    try {
      await db.transaction(async (client) => {
        // Create test player
        const passwordHash = await bcrypt.hash('testpassword', 10);
        const playerResult = await client.query(
          `INSERT INTO players (username, email, password_hash, faction) 
           VALUES ($1, $2, $3, $4) 
           RETURNING id`,
          ['testplayer', 'test@example.com', passwordHash, 'terran_federation']
        );
        const playerId = playerResult.rows[0].id;
        
        // Create core systems
        const systems = [
          { name: 'Sol', x: 0, y: 0, z: 0, danger: 0, description: 'Humanity\'s birthplace and capital of the Terran Federation' },
          { name: 'Alpha Centauri', x: 4, y: 0, z: 0, danger: 1, description: 'A prosperous trade hub' },
          { name: 'Vega', x: -3, y: 2, z: 0, danger: 2, description: 'Mining outpost with rich mineral deposits' },
          { name: 'Orion', x: 0, y: 5, z: 0, danger: 3, description: 'Headquarters of the Orion Syndicate' },
          { name: 'Frontier Station', x: 10, y: 10, z: 0, danger: 7, description: 'Lawless frontier on the edge of known space' }
        ];
        
        const systemIds: Record<string, string> = {};
        
        for (const system of systems) {
          const result = await client.query(
            `INSERT INTO systems (name, coordinates, danger_level, is_pvp_enabled, description) 
             VALUES ($1, $2, $3, $4, $5) 
             RETURNING id`,
            [
              system.name,
              JSON.stringify({ x: system.x, y: system.y, z: system.z }),
              system.danger,
              system.danger > 5,
              system.description
            ]
          );
          systemIds[system.name] = result.rows[0].id;
        }
        
        // Create system connections
        const connections = [
          { from: 'Sol', to: 'Alpha Centauri', distance: 4 },
          { from: 'Sol', to: 'Vega', distance: 3.6 },
          { from: 'Alpha Centauri', to: 'Vega', distance: 5.4 },
          { from: 'Alpha Centauri', to: 'Orion', distance: 5.8 },
          { from: 'Vega', to: 'Orion', distance: 5.8 },
          { from: 'Orion', to: 'Frontier Station', distance: 14.1 }
        ];
        
        for (const conn of connections) {
          const travelTime = Math.ceil(conn.distance * 3600); // 1 hour per unit distance
          
          // Add bidirectional connections
          await client.query(
            `INSERT INTO system_connections (from_system_id, to_system_id, distance, travel_time, is_dangerous) 
             VALUES ($1, $2, $3, $4, $5)`,
            [systemIds[conn.from], systemIds[conn.to], conn.distance, travelTime, false]
          );
          
          await client.query(
            `INSERT INTO system_connections (from_system_id, to_system_id, distance, travel_time, is_dangerous) 
             VALUES ($1, $2, $3, $4, $5)`,
            [systemIds[conn.to], systemIds[conn.from], conn.distance, travelTime, false]
          );
        }
        
        // Create planets in each system
        const planets = [
          { name: 'Earth', system: 'Sol', spec: 'balanced' },
          { name: 'Mars', system: 'Sol', spec: 'mining' },
          { name: 'Luna', system: 'Sol', spec: 'industrial' },
          { name: 'Proxima b', system: 'Alpha Centauri', spec: 'agricultural' },
          { name: 'Centauri Station', system: 'Alpha Centauri', spec: 'commercial' },
          { name: 'Vega Prime', system: 'Vega', spec: 'mining' },
          { name: 'Vega II', system: 'Vega', spec: 'research' },
          { name: 'Orion Prime', system: 'Orion', spec: 'military' },
          { name: 'Frontier Outpost', system: 'Frontier Station', spec: 'balanced' }
        ];
        
        const planetIds: Record<string, string> = {};
        
        for (const planet of planets) {
          const result = await client.query(
            `INSERT INTO planets (name, system_id, coordinates, specialization) 
             VALUES ($1, $2, $3, $4) 
             RETURNING id`,
            [
              planet.name,
              systemIds[planet.system],
              JSON.stringify({ x: Math.random() * 10, y: Math.random() * 10, z: 0 }),
              planet.spec
            ]
          );
          planetIds[planet.name] = result.rows[0].id;
        }
        
        // Create basic technologies
        const technologies = [
          { name: 'Basic Mining', tier: 'chemical', cost: 1000, effects: { miningBonus: 1.2 } },
          { name: 'Improved Engines', tier: 'chemical', cost: 1500, effects: { speedBonus: 1.2 } },
          { name: 'Shield Technology', tier: 'nuclear', cost: 3000, effects: { defenseBonus: 1.3 } },
          { name: 'Fusion Power', tier: 'nuclear', cost: 5000, effects: { energyBonus: 1.5 } },
          { name: 'Antimatter Engines', tier: 'antimatter', cost: 10000, effects: { speedBonus: 2.0 } },
          { name: 'Quantum Computing', tier: 'exotic', cost: 20000, effects: { researchBonus: 2.0 } }
        ];
        
        for (const tech of technologies) {
          await client.query(
            `INSERT INTO technologies (name, tier, research_cost, effects, description) 
             VALUES ($1, $2, $3, $4, $5)`,
            [
              tech.name,
              tech.tier,
              tech.cost,
              JSON.stringify(tech.effects),
              `Advanced ${tech.tier} technology`
            ]
          );
        }
        
        console.log('✓ Created test player');
        console.log('✓ Created', systems.length, 'star systems');
        console.log('✓ Created', connections.length * 2, 'system connections');
        console.log('✓ Created', planets.length, 'planets');
        console.log('✓ Created', technologies.length, 'technologies');
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
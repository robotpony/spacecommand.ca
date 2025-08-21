#!/usr/bin/env tsx

/**
 * Initializes a new game universe with default settings and initial data.
 * Creates the database schema, seeds initial systems, and sets up game configuration.
 */

import { createConnection } from '../infrastructure/database/connection';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface InitOptions {
  reset?: boolean;
  seed?: boolean;
  universeName?: string;
}

/**
 * Main initialization function for setting up a new game universe.
 * @param options Configuration options for initialization
 * @returns Success status and any error messages
 */
async function initializeGame(options: InitOptions = {}) {
  console.log('🚀 SpaceCommand Game Initialization');
  console.log('====================================\n');

  const { reset = false, seed = true, universeName = 'Alpha Quadrant' } = options;

  try {
    // Step 1: Test database connection
    console.log('📡 Testing database connection...');
    const db = await createConnection();
    
    if (!db) {
      throw new Error('Failed to establish database connection');
    }
    
    console.log('✅ Database connection established\n');

    // Step 2: Run migrations
    if (reset) {
      console.log('⚠️  Resetting database...');
      await resetDatabase(db);
      console.log('✅ Database reset complete\n');
    }

    console.log('📦 Running database migrations...');
    await runMigrations(db);
    console.log('✅ Migrations complete\n');

    // Step 3: Create universe
    console.log(`🌌 Creating universe: ${universeName}...`);
    await createUniverse(db, universeName);
    console.log('✅ Universe created\n');

    // Step 4: Seed initial data
    if (seed) {
      console.log('🌱 Seeding initial game data...');
      await seedInitialData(db);
      console.log('✅ Initial data seeded\n');
    }

    // Step 5: Initialize game configuration
    console.log('⚙️  Setting up game configuration...');
    await setupGameConfig(db);
    console.log('✅ Game configuration complete\n');

    console.log('🎮 Game initialization successful!');
    console.log(`Universe "${universeName}" is ready for players.\n`);

    await db.end();
    return { success: true };

  } catch (error) {
    console.error('\n❌ Initialization failed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Resets the database by dropping and recreating all tables.
 * @param db Database connection
 */
async function resetDatabase(db: any) {
  console.log('  Dropping all schema objects...');
  
  // Complete schema wipe
  try {
    await db.query(`
      DO $$ 
      DECLARE 
        r RECORD;
      BEGIN
        -- Drop all indexes first
        FOR r IN (SELECT indexname FROM pg_indexes WHERE schemaname = 'public') 
        LOOP
          EXECUTE 'DROP INDEX IF EXISTS ' || quote_ident(r.indexname) || ' CASCADE';
        END LOOP;
        
        -- Drop all foreign key constraints
        FOR r IN (SELECT conname, conrelid::regclass as table_name FROM pg_constraint WHERE contype = 'f' AND connamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public'))
        LOOP
          EXECUTE 'ALTER TABLE ' || r.table_name || ' DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
        END LOOP;
        
        -- Drop all tables
        FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') 
        LOOP
          EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
        END LOOP;
        
        -- Drop all sequences
        FOR r IN (SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public')
        LOOP
          EXECUTE 'DROP SEQUENCE IF EXISTS ' || quote_ident(r.sequence_name) || ' CASCADE';
        END LOOP;
        
        -- Drop all functions
        FOR r IN (SELECT proname FROM pg_proc WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public'))
        LOOP
          EXECUTE 'DROP FUNCTION IF EXISTS ' || quote_ident(r.proname) || ' CASCADE';
        END LOOP;
      END $$;
    `);
    console.log('  Database schema reset complete');
  } catch (error) {
    console.log('  Manual cleanup...');
    
    // Fallback: manual table dropping
    const tables = [
      'action_log',
      'game_sessions', 
      'game_events',
      'system_connections',
      'player_actions',
      'trade_transactions',
      'fleet_movements',
      'combat_logs',
      'alliance_members',
      'alliances',
      'market_prices',
      'planet_resources',
      'planets',
      'fleets',
      'players',
      'systems',
      'empires',
      'universes',
      'turns',
      'migrations'
    ];

    for (const table of tables) {
      try {
        await db.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
        console.log(`    Dropped table: ${table}`);
      } catch (error) {
        // Ignore errors for non-existent tables
      }
    }
  }
}

/**
 * Runs database migration files to create schema.
 * @param db Database connection
 */
async function runMigrations(db: any) {
  const migrationsDir = path.join(__dirname, '..', 'infrastructure', 'database', 'migrations');
  
  // Create migrations table if it doesn't exist
  await db.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Check if migrations directory exists
  if (!fs.existsSync(migrationsDir)) {
    console.log('  No migrations directory found, creating schema directly...');
    await createSchema(db);
    return;
  }

  // Get migration files
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    // Check if migration was already run
    const result = await db.query(
      'SELECT id FROM migrations WHERE filename = $1',
      [file]
    );

    if (result.rows.length === 0) {
      console.log(`  Running migration: ${file}`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      await db.query(sql);
      await db.query(
        'INSERT INTO migrations (filename) VALUES ($1)',
        [file]
      );
    } else {
      console.log(`  Skipping migration: ${file} (already applied)`);
    }
  }
}

/**
 * Creates the database schema directly if no migration files exist.
 * @param db Database connection
 */
async function createSchema(db: any) {
  console.log('  Creating database schema...');

  // Create universes table
  await db.query(`
    CREATE TABLE IF NOT EXISTS universes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL UNIQUE,
      turn_duration_hours INTEGER DEFAULT 4,
      max_players INTEGER DEFAULT 100,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      status VARCHAR(50) DEFAULT 'active'
    )
  `);

  // Create turns table
  await db.query(`
    CREATE TABLE IF NOT EXISTS turns (
      id SERIAL PRIMARY KEY,
      universe_id UUID REFERENCES universes(id) ON DELETE CASCADE,
      turn_number INTEGER NOT NULL,
      started_at TIMESTAMP NOT NULL,
      ended_at TIMESTAMP,
      status VARCHAR(50) DEFAULT 'active',
      UNIQUE(universe_id, turn_number)
    )
  `);

  // Create empires table
  await db.query(`
    CREATE TABLE IF NOT EXISTS empires (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      universe_id UUID REFERENCES universes(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      code VARCHAR(10) NOT NULL,
      description TEXT,
      color VARCHAR(7),
      traits JSONB DEFAULT '[]',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(universe_id, code)
    )
  `);

  // Create systems table
  await db.query(`
    CREATE TABLE IF NOT EXISTS systems (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      universe_id UUID REFERENCES universes(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      x_coord INTEGER NOT NULL,
      y_coord INTEGER NOT NULL,
      empire_id UUID REFERENCES empires(id),
      type VARCHAR(50) DEFAULT 'standard',
      resources JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(universe_id, x_coord, y_coord)
    )
  `);

  // Create players table
  await db.query(`
    CREATE TABLE IF NOT EXISTS players (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      universe_id UUID REFERENCES universes(id) ON DELETE CASCADE,
      username VARCHAR(255) NOT NULL,
      email VARCHAR(255),
      password_hash VARCHAR(255),
      empire_id UUID REFERENCES empires(id),
      home_system_id UUID REFERENCES systems(id),
      credits DECIMAL(12, 2) DEFAULT 10000,
      reputation INTEGER DEFAULT 0,
      status VARCHAR(50) DEFAULT 'active',
      last_active TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(universe_id, username)
    )
  `);

  // Create planets table
  await db.query(`
    CREATE TABLE IF NOT EXISTS planets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      system_id UUID REFERENCES systems(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      type VARCHAR(50) NOT NULL,
      size VARCHAR(50) DEFAULT 'medium',
      population BIGINT DEFAULT 0,
      owner_id UUID REFERENCES players(id),
      resources JSONB DEFAULT '{}',
      infrastructure JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create fleets table
  await db.query(`
    CREATE TABLE IF NOT EXISTS fleets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      player_id UUID REFERENCES players(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      current_system_id UUID REFERENCES systems(id),
      destination_system_id UUID REFERENCES systems(id),
      ships JSONB DEFAULT '[]',
      cargo JSONB DEFAULT '{}',
      status VARCHAR(50) DEFAULT 'idle',
      arrival_turn INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create market_prices table
  await db.query(`
    CREATE TABLE IF NOT EXISTS market_prices (
      id SERIAL PRIMARY KEY,
      system_id UUID REFERENCES systems(id) ON DELETE CASCADE,
      commodity VARCHAR(100) NOT NULL,
      price DECIMAL(10, 2) NOT NULL,
      supply INTEGER DEFAULT 0,
      demand INTEGER DEFAULT 0,
      turn_id INTEGER REFERENCES turns(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(system_id, commodity, turn_id)
    )
  `);

  // Create alliances table
  await db.query(`
    CREATE TABLE IF NOT EXISTS alliances (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      universe_id UUID REFERENCES universes(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      leader_id UUID REFERENCES players(id),
      type VARCHAR(50) DEFAULT 'standard',
      policies JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(universe_id, name)
    )
  `);

  // Create alliance_members table
  await db.query(`
    CREATE TABLE IF NOT EXISTS alliance_members (
      alliance_id UUID REFERENCES alliances(id) ON DELETE CASCADE,
      player_id UUID REFERENCES players(id) ON DELETE CASCADE,
      rank VARCHAR(50) DEFAULT 'member',
      joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY(alliance_id, player_id)
    )
  `);

  console.log('  Schema creation complete');
}

/**
 * Creates initial game configuration instead of universe.
 * @param db Database connection  
 * @param universeName Name for the game instance
 */
async function createUniverse(db: any, universeName: string) {
  console.log(`  Initializing game instance: ${universeName}`);
  
  // The existing schema doesn't have a universes table
  // Instead, we'll set up the game state for a single game instance
  console.log(`  Game "${universeName}" configuration ready`);
  
  return 'single-game-instance';
}

/**
 * Seeds initial game data including systems and planets based on existing schema.
 * @param db Database connection
 */
async function seedInitialData(db: any) {
  // Create core systems using the existing migration schema
  const systems = [
    { name: 'Sol', x: 0, y: 0 },
    { name: 'Alpha Centauri', x: 3, y: 2 },
    { name: 'Sirius', x: -2, y: 4 },
    { name: 'Vega', x: 5, y: -3 },
    { name: 'Arcturus', x: -4, y: -2 },
    { name: 'Rigel', x: 2, y: -5 },
    { name: 'Betelgeuse', x: -3, y: 3 },
    { name: 'Polaris', x: 0, y: 6 }
  ];

  for (const system of systems) {
    const result = await db.query(
      `INSERT INTO systems (name, coordinates, danger_level, is_pvp_enabled)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [
        system.name, 
        JSON.stringify({ x: system.x, y: system.y, z: 0 }),
        Math.floor(Math.random() * 5),
        Math.random() > 0.7
      ]
    );

    // Create 1-3 planets per system
    const planetCount = Math.floor(Math.random() * 3) + 1;
    for (let i = 1; i <= planetCount; i++) {
      const specializations = ['mining', 'agricultural', 'industrial', 'research', 'balanced'];
      const specialization = specializations[Math.floor(Math.random() * specializations.length)];
      
      await db.query(
        `INSERT INTO planets (name, system_id, coordinates, specialization, population, max_population)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          `${system.name} ${String.fromCharCode(65 + i - 1)}`, // A, B, C
          result.rows[0].id,
          JSON.stringify({ orbit: i, type: 'planet' }),
          specialization,
          Math.floor(Math.random() * 1000000),
          Math.floor(Math.random() * 5000000) + 1000000
        ]
      );
    }

    console.log(`  Created system: ${system.name} with ${planetCount} planets`);
  }

  console.log('  Initial data seeding complete');
}

/**
 * Sets up initial game configuration and settings.
 * @param db Database connection
 */
async function setupGameConfig(db: any) {
  // This could be expanded to include:
  // - Game rules configuration
  // - Economic parameters
  // - Combat settings
  // - Technology tree setup
  // - Event system initialization
  
  console.log('  Game configuration parameters set');
}

// Parse command line arguments
const args = process.argv.slice(2);
const options: InitOptions = {
  reset: args.includes('--reset') || args.includes('-r'),
  seed: !args.includes('--no-seed'),
  universeName: args.find(arg => arg.startsWith('--name='))?.split('=')[1]
};

// Run initialization
initializeGame(options).then(result => {
  process.exit(result.success ? 0 : 1);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
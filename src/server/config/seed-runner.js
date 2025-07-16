/**
 * Database seed runner
 * Handles running seed files to populate database with test data
 */

const fs = require('fs');
const path = require('path');
const database = require('./database');

class SeedRunner {
  constructor() {
    this.seedsPath = path.join(__dirname, 'seeds');
    this.db = database;
  }

  /**
   * Get list of seed files
   * @returns {Array} Sorted seed filenames
   */
  getSeedFiles() {
    const files = fs.readdirSync(this.seedsPath)
      .filter(file => file.endsWith('.js'))
      .sort();
    
    return files;
  }

  /**
   * Run all seed files
   * @param {boolean} force - Force run even if already seeded
   * @returns {Promise<Array>} List of executed seed filenames
   */
  async runSeeds(force = false) {
    if (!force && await this.isSeeded()) {
      console.log('Database already seeded. Use --force to re-seed.');
      return [];
    }

    const seedFiles = this.getSeedFiles();
    
    if (seedFiles.length === 0) {
      console.log('No seed files found');
      return [];
    }

    console.log(`Running ${seedFiles.length} seed files...`);
    
    const executed = [];
    
    for (const filename of seedFiles) {
      try {
        console.log(`Running seed: ${filename}`);
        
        const seedPath = path.join(this.seedsPath, filename);
        const seed = require(seedPath);
        
        await this.db.transaction(async (client) => {
          await seed.seed(client);
        });
        
        executed.push(filename);
        console.log(`✓ Seed completed: ${filename}`);
        
      } catch (error) {
        console.error(`✗ Seed failed: ${filename}`, error);
        throw error;
      }
    }
    
    // Mark database as seeded
    await this.markSeeded();
    
    console.log(`Successfully ran ${executed.length} seed files`);
    return executed;
  }

  /**
   * Run a specific seed file
   * @param {string} filename - Seed filename
   * @returns {Promise<boolean>} True if executed successfully
   */
  async runSeed(filename) {
    const seedPath = path.join(this.seedsPath, filename);
    
    if (!fs.existsSync(seedPath)) {
      throw new Error(`Seed file not found: ${filename}`);
    }

    try {
      console.log(`Running seed: ${filename}`);
      
      const seed = require(seedPath);
      
      await this.db.transaction(async (client) => {
        await seed.seed(client);
      });
      
      console.log(`✓ Seed completed: ${filename}`);
      return true;
      
    } catch (error) {
      console.error(`✗ Seed failed: ${filename}`, error);
      throw error;
    }
  }

  /**
   * Clear all seeded data
   * @returns {Promise<void>}
   */
  async clearSeeds() {
    console.log('Clearing seeded data...');
    
    const tables = [
      'combat_records',
      'diplomacy_relations',
      'fleets',
      'planets',
      'empires',
      'game_sessions',
      'players',
      'game_state'
    ];

    await this.db.transaction(async (client) => {
      // Disable foreign key checks
      await client.query('SET session_replication_role = replica');
      
      for (const table of tables) {
        await client.query(`DELETE FROM ${table}`);
        console.log(`✓ Cleared table: ${table}`);
      }
      
      // Re-enable foreign key checks
      await client.query('SET session_replication_role = DEFAULT');
      
      // Reset game state
      await client.query(`
        INSERT INTO game_state (turn_number, turn_phase, next_turn_at, active_players, game_settings)
        VALUES (1, 'production', CURRENT_TIMESTAMP + INTERVAL '24 hours', 0, '{}')
      `);
    });

    // Clear seed marker
    await this.clearSeedMarker();
    
    console.log('✓ All seeded data cleared');
  }

  /**
   * Check if database has been seeded
   * @returns {Promise<boolean>} True if seeded
   */
  async isSeeded() {
    try {
      const result = await this.db.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_name = 'seed_status'
        )
      `);
      
      if (!result.rows[0].exists) {
        return false;
      }
      
      const seedResult = await this.db.query(
        'SELECT seeded FROM seed_status WHERE id = 1'
      );
      
      return seedResult.rows.length > 0 && seedResult.rows[0].seeded;
    } catch (error) {
      return false;
    }
  }

  /**
   * Mark database as seeded
   * @returns {Promise<void>}
   */
  async markSeeded() {
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS seed_status (
        id INTEGER PRIMARY KEY DEFAULT 1,
        seeded BOOLEAN DEFAULT false,
        seeded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await this.db.query(`
      INSERT INTO seed_status (id, seeded, seeded_at)
      VALUES (1, true, CURRENT_TIMESTAMP)
      ON CONFLICT (id) DO UPDATE SET
        seeded = true,
        seeded_at = CURRENT_TIMESTAMP
    `);
  }

  /**
   * Clear seed marker
   * @returns {Promise<void>}
   */
  async clearSeedMarker() {
    await this.db.query('DROP TABLE IF EXISTS seed_status');
  }

  /**
   * Get seed status information
   * @returns {Promise<Object>} Seed status
   */
  async getStatus() {
    const isSeeded = await this.isSeeded();
    const seedFiles = this.getSeedFiles();
    
    let seededAt = null;
    if (isSeeded) {
      const result = await this.db.query(
        'SELECT seeded_at FROM seed_status WHERE id = 1'
      );
      if (result.rows.length > 0) {
        seededAt = result.rows[0].seeded_at;
      }
    }

    return {
      isSeeded,
      seededAt,
      availableSeeds: seedFiles.length,
      seedFiles
    };
  }
}

module.exports = SeedRunner;
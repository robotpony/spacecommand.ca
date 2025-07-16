/**
 * Database migration runner
 * Handles running and rolling back database migrations
 */

const fs = require('fs');
const path = require('path');
const database = require('./database');

class MigrationRunner {
  constructor() {
    this.migrationsPath = path.join(__dirname, 'migrations');
    this.db = database;
  }

  /**
   * Initialize migration tracking table
   */
  async initializeMigrationTable() {
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  /**
   * Get list of migration files
   * @returns {Array} Sorted migration filenames
   */
  getMigrationFiles() {
    const files = fs.readdirSync(this.migrationsPath)
      .filter(file => file.endsWith('.js'))
      .sort();
    
    return files;
  }

  /**
   * Get executed migrations from database
   * @returns {Promise<Array>} List of executed migration filenames
   */
  async getExecutedMigrations() {
    const result = await this.db.query('SELECT filename FROM migrations ORDER BY id');
    return result.rows.map(row => row.filename);
  }

  /**
   * Run all pending migrations
   * @returns {Promise<Array>} List of executed migration filenames
   */
  async runMigrations() {
    await this.initializeMigrationTable();
    
    const allMigrations = this.getMigrationFiles();
    const executedMigrations = await this.getExecutedMigrations();
    const pendingMigrations = allMigrations.filter(
      filename => !executedMigrations.includes(filename)
    );

    if (pendingMigrations.length === 0) {
      console.log('No pending migrations');
      return [];
    }

    console.log(`Running ${pendingMigrations.length} pending migrations...`);
    
    const executed = [];
    
    for (const filename of pendingMigrations) {
      try {
        console.log(`Running migration: ${filename}`);
        
        const migrationPath = path.join(this.migrationsPath, filename);
        const migration = require(migrationPath);
        
        await this.db.transaction(async (client) => {
          await migration.up(client);
          await client.query(
            'INSERT INTO migrations (filename) VALUES ($1)',
            [filename]
          );
        });
        
        executed.push(filename);
        console.log(`✓ Migration completed: ${filename}`);
        
      } catch (error) {
        console.error(`✗ Migration failed: ${filename}`, error);
        throw error;
      }
    }
    
    console.log(`Successfully ran ${executed.length} migrations`);
    return executed;
  }

  /**
   * Rollback the last migration
   * @returns {Promise<string|null>} Rolled back migration filename
   */
  async rollbackLastMigration() {
    await this.initializeMigrationTable();
    
    const executedMigrations = await this.getExecutedMigrations();
    
    if (executedMigrations.length === 0) {
      console.log('No migrations to rollback');
      return null;
    }
    
    const lastMigration = executedMigrations[executedMigrations.length - 1];
    
    try {
      console.log(`Rolling back migration: ${lastMigration}`);
      
      const migrationPath = path.join(this.migrationsPath, lastMigration);
      const migration = require(migrationPath);
      
      await this.db.transaction(async (client) => {
        await migration.down(client);
        await client.query(
          'DELETE FROM migrations WHERE filename = $1',
          [lastMigration]
        );
      });
      
      console.log(`✓ Migration rolled back: ${lastMigration}`);
      return lastMigration;
      
    } catch (error) {
      console.error(`✗ Migration rollback failed: ${lastMigration}`, error);
      throw error;
    }
  }

  /**
   * Get migration status
   * @returns {Promise<Object>} Migration status information
   */
  async getStatus() {
    await this.initializeMigrationTable();
    
    const allMigrations = this.getMigrationFiles();
    const executedMigrations = await this.getExecutedMigrations();
    const pendingMigrations = allMigrations.filter(
      filename => !executedMigrations.includes(filename)
    );

    return {
      total: allMigrations.length,
      executed: executedMigrations.length,
      pending: pendingMigrations.length,
      executedMigrations,
      pendingMigrations
    };
  }
}

module.exports = MigrationRunner;
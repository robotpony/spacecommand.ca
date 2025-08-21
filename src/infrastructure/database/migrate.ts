import fs from 'fs';
import path from 'path';
import { db } from './connection';

interface Migration {
  id: number;
  filename: string;
  sql: string;
}

export class Migrator {
  private migrationsPath: string;

  constructor() {
    this.migrationsPath = path.join(__dirname, 'migrations');
  }

  private async createMigrationsTable(): Promise<void> {
    const sql = `
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    await db.query(sql);
  }

  private async getExecutedMigrations(): Promise<string[]> {
    const result = await db.query('SELECT filename FROM migrations ORDER BY id');
    return result.rows.map((row: any) => row.filename);
  }

  private async loadMigrations(): Promise<Migration[]> {
    const files = fs.readdirSync(this.migrationsPath)
      .filter(f => f.endsWith('.sql'))
      .sort();

    return files.map(filename => {
      const filepath = path.join(this.migrationsPath, filename);
      const sql = fs.readFileSync(filepath, 'utf-8');
      const id = parseInt(filename.split('_')[0]);
      
      return { id, filename, sql };
    });
  }

  public async up(): Promise<void> {
    try {
      console.log('Starting database migration...');
      
      // Ensure migrations table exists
      await this.createMigrationsTable();
      
      // Get already executed migrations
      const executed = await this.getExecutedMigrations();
      
      // Load all migration files
      const migrations = await this.loadMigrations();
      
      // Filter out already executed migrations
      const pending = migrations.filter(m => !executed.includes(m.filename));
      
      if (pending.length === 0) {
        console.log('No pending migrations.');
        return;
      }
      
      // Execute pending migrations in transaction
      for (const migration of pending) {
        console.log(`Executing migration: ${migration.filename}`);
        
        await db.transaction(async (client) => {
          // Execute the migration SQL
          await client.query(migration.sql);
          
          // Record the migration
          await client.query(
            'INSERT INTO migrations (filename) VALUES ($1)',
            [migration.filename]
          );
        });
        
        console.log(`✓ Migration ${migration.filename} completed`);
      }
      
      console.log(`Successfully executed ${pending.length} migrations.`);
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  }

  public async down(_steps: number = 1): Promise<void> {
    // This would implement rollback logic
    // For now, we'll keep it simple
    throw new Error('Rollback not implemented yet');
  }

  public async reset(): Promise<void> {
    console.log('Resetting database...');
    
    // Drop all tables in reverse order of dependencies
    const dropSQL = `
      DROP TABLE IF EXISTS action_log CASCADE;
      DROP TABLE IF EXISTS game_sessions CASCADE;
      DROP TABLE IF EXISTS game_events CASCADE;
      DROP TABLE IF EXISTS trade_agreements CASCADE;
      DROP TABLE IF EXISTS diplomatic_relations CASCADE;
      DROP TABLE IF EXISTS empire_technologies CASCADE;
      DROP TABLE IF EXISTS technologies CASCADE;
      DROP TABLE IF EXISTS trade_routes CASCADE;
      DROP TABLE IF EXISTS ships CASCADE;
      DROP TABLE IF EXISTS fleets CASCADE;
      DROP TABLE IF EXISTS buildings CASCADE;
      DROP TABLE IF EXISTS planets CASCADE;
      DROP TABLE IF EXISTS empires CASCADE;
      DROP TABLE IF EXISTS system_connections CASCADE;
      DROP TABLE IF EXISTS systems CASCADE;
      DROP TABLE IF EXISTS players CASCADE;
      DROP TABLE IF EXISTS migrations CASCADE;
    `;
    
    await db.query(dropSQL);
    console.log('Database reset complete.');
    
    // Run migrations again
    await this.up();
  }
}

// CLI execution
if (require.main === module) {
  const migrator = new Migrator();
  const command = process.argv[2] || 'up';
  
  (async () => {
    try {
      switch (command) {
        case 'up':
          await migrator.up();
          break;
        case 'reset':
          await migrator.reset();
          break;
        default:
          console.log('Usage: npm run db:migrate [up|reset]');
      }
      process.exit(0);
    } catch (error) {
      console.error('Migration error:', error);
      process.exit(1);
    }
  })();
}
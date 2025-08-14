import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const poolConfig: PoolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'spacecommand',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: parseInt(process.env.DB_POOL_SIZE || '20'),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

export class Database {
  private static instance: Database;
  private pool: Pool;

  private constructor() {
    this.pool = new Pool(poolConfig);
    
    this.pool.on('error', (err) => {
      console.error('Unexpected database error:', err);
    });
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public async query(text: string, params?: any[]): Promise<any> {
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      
      if (process.env.LOG_QUERIES === 'true') {
        console.log('Executed query', { text, duration, rows: result.rowCount });
      }
      
      return result;
    } catch (error) {
      console.error('Query error:', error);
      throw error;
    }
  }

  public async transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  public async healthCheck(): Promise<boolean> {
    try {
      const result = await this.query('SELECT NOW()');
      return result.rows.length > 0;
    } catch {
      return false;
    }
  }

  public async close(): Promise<void> {
    await this.pool.end();
  }
}

export const db = Database.getInstance();
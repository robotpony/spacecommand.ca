import { Pool, PoolConfig, QueryResult, PoolClient, QueryResultRow } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Parses database configuration from environment variables.
 * Supports both DATABASE_URL and individual DB_* variables.
 */
function getPoolConfig(): PoolConfig {
  // Prefer DATABASE_URL if available
  const databaseUrl = process.env.NODE_ENV === 'test' 
    ? process.env.TEST_DATABASE_URL 
    : process.env.DATABASE_URL;
  
  if (databaseUrl) {
    return {
      connectionString: databaseUrl,
      max: parseInt(process.env.DB_POOL_SIZE || '20'),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      // Important for production environments
      ssl: process.env.NODE_ENV === 'production' 
        ? { rejectUnauthorized: false }
        : undefined
    };
  }
  
  // Fallback to individual variables
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'spacecommand_dev',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    max: parseInt(process.env.DB_POOL_SIZE || '20'),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  };
}

/**
 * Custom error class for database-related errors.
 */
export class DatabaseError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly detail?: string
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

/**
 * Singleton database connection manager.
 * Handles connection pooling, query execution, and transactions.
 */
export class Database {
  private static instance: Database;
  private pool: Pool;
  private isConnected: boolean = false;

  private constructor() {
    const config = getPoolConfig();
    this.pool = new Pool(config);
    
    this.pool.on('error', (err) => {
      console.error('Unexpected database error:', err);
      this.isConnected = false;
    });
    
    this.pool.on('connect', () => {
      this.isConnected = true;
    });
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  /**
   * Executes a parameterized query against the database.
   * @param {string} text - SQL query text with $1, $2 placeholders
   * @param {any[]} params - Query parameters to prevent SQL injection
   * @returns {Promise<QueryResult<T>>} Query result with typed rows
   * @throws {DatabaseError} On connection or query errors
   */
  public async query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    const start = Date.now();
    try {
      const result = await this.pool.query<T>(text, params);
      const duration = Date.now() - start;
      
      if (process.env.LOG_QUERIES === 'true') {
        console.log('Executed query', { 
          text: text.substring(0, 100), // Truncate for readability
          duration, 
          rows: result.rowCount 
        });
      }
      
      return result;
    } catch (error: any) {
      const dbError = new DatabaseError(
        error.message || 'Database query failed',
        error.code,
        error.detail
      );
      
      if (process.env.NODE_ENV === 'development') {
        console.error('Query error:', {
          query: text,
          params,
          error: error.message,
          code: error.code
        });
      }
      
      throw dbError;
    }
  }

  /**
   * Executes a callback within a database transaction.
   * Automatically handles BEGIN, COMMIT, and ROLLBACK.
   * @param {Function} callback - Function receiving a client for queries
   * @returns {Promise<T>} Result from the callback function
   * @throws {DatabaseError} Rolls back on any error
   */
  public async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error: any) {
      await client.query('ROLLBACK');
      throw new DatabaseError(
        `Transaction failed: ${error.message}`,
        error.code,
        error.detail
      );
    } finally {
      client.release();
    }
  }

  /**
   * Tests database connectivity and returns connection status.
   * @returns {Promise<boolean>} True if database is accessible
   */
  public async healthCheck(): Promise<boolean> {
    try {
      const result = await this.query('SELECT NOW() as time, current_database() as db');
      if (result.rows.length > 0) {
        console.log('Database connected:', result.rows[0]);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  /**
   * Attempts to establish initial database connection with retries.
   * @param {number} maxRetries - Maximum connection attempts
   * @param {number} delay - Delay between retries in milliseconds
   * @returns {Promise<void>}
   * @throws {DatabaseError} If connection cannot be established
   */
  public async connect(maxRetries: number = 5, delay: number = 2000): Promise<void> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const healthy = await this.healthCheck();
        if (healthy) {
          console.log('Database connection established');
          return;
        }
      } catch (error) {
        console.log(`Connection attempt ${i + 1}/${maxRetries} failed`);
      }
      
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw new DatabaseError('Failed to establish database connection after multiple attempts');
  }

  /**
   * Gracefully closes all database connections.
   * @returns {Promise<void>}
   */
  public async close(): Promise<void> {
    await this.pool.end();
    this.isConnected = false;
    console.log('Database connections closed');
  }
  
  /**
   * Returns current connection status.
   * @returns {boolean} True if connected to database
   */
  public getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

export const db = Database.getInstance();

/**
 * Creates and returns a database connection for direct query execution.
 * Used primarily by migration and initialization scripts.
 * @returns {Promise<Pool>} PostgreSQL connection pool
 */
export async function createConnection(): Promise<Pool> {
  const config = getPoolConfig();
  const pool = new Pool(config);
  
  try {
    // Test the connection
    await pool.query('SELECT NOW()');
    return pool;
  } catch (error) {
    console.error('Failed to create database connection:', error);
    throw error;
  }
}
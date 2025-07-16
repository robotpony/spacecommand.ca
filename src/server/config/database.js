/**
 * Database configuration and connection management
 * Handles PostgreSQL and Redis connections with pooling and error handling
 */

const { Pool } = require('pg');
const Redis = require('redis');

class DatabaseConfig {
  constructor() {
    this.pgPool = null;
    this.redisClient = null;
    this.isConnected = false;
  }

  /**
   * Initialize database connections
   * @returns {Promise<void>}
   */
  async initialize() {
    await this.connectPostgreSQL();
    await this.connectRedis();
    this.isConnected = true;
  }

  /**
   * Connect to PostgreSQL database
   * @returns {Promise<void>}
   */
  async connectPostgreSQL() {
    const config = {
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'spacecommand',
      password: process.env.DB_PASSWORD || 'password',
      port: process.env.DB_PORT || 5432,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };

    this.pgPool = new Pool(config);

    this.pgPool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
      process.exit(-1);
    });

    // Test connection
    try {
      const client = await this.pgPool.connect();
      console.log('PostgreSQL connected successfully');
      client.release();
    } catch (err) {
      console.error('PostgreSQL connection failed:', err);
      throw err;
    }
  }

  /**
   * Connect to Redis cache
   * @returns {Promise<void>}
   */
  async connectRedis() {
    const config = {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || null,
      retry_strategy: (options) => {
        if (options.error && options.error.code === 'ECONNREFUSED') {
          console.error('Redis connection refused');
          return new Error('Redis connection refused');
        }
        if (options.total_retry_time > 1000 * 60 * 60) {
          console.error('Redis retry time exhausted');
          return new Error('Retry time exhausted');
        }
        if (options.attempt > 10) {
          console.error('Redis max retry attempts reached');
          return undefined;
        }
        return Math.min(options.attempt * 100, 3000);
      }
    };

    this.redisClient = Redis.createClient(config);

    this.redisClient.on('error', (err) => {
      console.error('Redis error:', err);
    });

    this.redisClient.on('connect', () => {
      console.log('Redis connected successfully');
    });

    this.redisClient.on('reconnecting', () => {
      console.log('Redis reconnecting...');
    });

    await this.redisClient.connect();
  }

  /**
   * Get PostgreSQL connection from pool
   * @returns {Promise<Object>} Database client
   */
  async getConnection() {
    if (!this.pgPool) {
      throw new Error('Database not initialized');
    }
    return await this.pgPool.connect();
  }

  /**
   * Execute query with connection pooling
   * @param {string} text - SQL query
   * @param {Array} params - Query parameters
   * @returns {Promise<Object>} Query result
   */
  async query(text, params = []) {
    if (!this.pgPool) {
      throw new Error('Database not initialized');
    }

    const start = Date.now();
    try {
      const result = await this.pgPool.query(text, params);
      const duration = Date.now() - start;
      
      if (process.env.NODE_ENV === 'development') {
        console.log('Query executed:', { text, duration: `${duration}ms`, rows: result.rowCount });
      }
      
      return result;
    } catch (err) {
      console.error('Query error:', { text, error: err.message });
      throw err;
    }
  }

  /**
   * Execute query within a transaction
   * @param {Function} callback - Transaction callback
   * @returns {Promise<any>} Transaction result
   */
  async transaction(callback) {
    const client = await this.getConnection();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Get Redis client instance
   * @returns {Object} Redis client
   */
  getRedisClient() {
    if (!this.redisClient) {
      throw new Error('Redis not initialized');
    }
    return this.redisClient;
  }

  /**
   * Close all database connections
   * @returns {Promise<void>}
   */
  async close() {
    if (this.pgPool) {
      await this.pgPool.end();
      console.log('PostgreSQL connection closed');
    }
    
    if (this.redisClient) {
      await this.redisClient.quit();
      console.log('Redis connection closed');
    }
    
    this.isConnected = false;
  }

  /**
   * Health check for database connections
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    const status = {
      postgres: false,
      redis: false,
      timestamp: new Date().toISOString()
    };

    try {
      await this.query('SELECT 1');
      status.postgres = true;
    } catch (err) {
      console.error('PostgreSQL health check failed:', err.message);
    }

    try {
      await this.redisClient.ping();
      status.redis = true;
    } catch (err) {
      console.error('Redis health check failed:', err.message);
    }

    return status;
  }
}

// Create singleton instance
const databaseConfig = new DatabaseConfig();

module.exports = databaseConfig;
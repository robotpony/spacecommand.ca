/**
 * Environment configuration management
 * Handles different environment settings for development, testing, and production
 */

const environments = {
  development: {
    database: {
      host: 'localhost',
      port: 5432,
      database: 'spacecommand_dev',
      user: 'postgres',
      password: 'password',
      ssl: false
    },
    redis: {
      host: 'localhost',
      port: 6379,
      password: null
    },
    session: {
      secret: 'dev-session-secret-key',
      duration: 24 * 60 * 60 * 1000, // 24 hours
      cleanup: 60 * 60 * 1000 // 1 hour
    },
    logging: {
      level: 'debug',
      queries: true,
      requests: true
    }
  },

  test: {
    database: {
      host: 'localhost',
      port: 5432,
      database: 'spacecommand_test',
      user: 'postgres',
      password: 'password',
      ssl: false
    },
    redis: {
      host: 'localhost',
      port: 6379,
      password: null,
      db: 1 // Use different Redis DB for testing
    },
    session: {
      secret: 'test-session-secret-key',
      duration: 60 * 60 * 1000, // 1 hour for tests
      cleanup: 5 * 60 * 1000 // 5 minutes
    },
    logging: {
      level: 'error',
      queries: false,
      requests: false
    }
  },

  production: {
    database: {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: { rejectUnauthorized: false }
    },
    redis: {
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD
    },
    session: {
      secret: process.env.SESSION_SECRET,
      duration: 24 * 60 * 60 * 1000, // 24 hours
      cleanup: 60 * 60 * 1000 // 1 hour
    },
    logging: {
      level: 'info',
      queries: false,
      requests: true
    }
  }
};

/**
 * Get configuration for current environment
 * @returns {Object} Environment configuration
 */
function getConfig() {
  const env = process.env.NODE_ENV || 'development';
  
  if (!environments[env]) {
    throw new Error(`Unknown environment: ${env}`);
  }
  
  return {
    ...environments[env],
    environment: env,
    port: process.env.PORT || 3000,
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      credentials: true
    }
  };
}

/**
 * Validate required environment variables for production
 * @throws {Error} If required variables are missing
 */
function validateProductionConfig() {
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  const required = [
    'DB_HOST',
    'DB_NAME',
    'DB_USER',
    'DB_PASSWORD',
    'REDIS_HOST',
    'SESSION_SECRET'
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

module.exports = {
  getConfig,
  validateProductionConfig
};
/**
 * Environment configuration management
 * Handles different environment settings for development, testing, and production
 */

const environments = {
  development: {
    database: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || 'spacecommand_dev',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      ssl: false
    },
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || null
    },
    session: {
      secret: process.env.SESSION_SECRET || 'dev-session-secret-key',
      duration: 24 * 60 * 60 * 1000, // 24 hours
      cleanup: 60 * 60 * 1000 // 1 hour
    },
    jwt: {
      secret: process.env.JWT_SECRET || 'dev-jwt-secret-key',
      expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    },
    game: {
      turnDuration: process.env.TURN_DURATION || '24h',
      maxPlayers: parseInt(process.env.MAX_PLAYERS) || 1000,
      maxEmpiresPerPlayer: parseInt(process.env.MAX_EMPIRES_PER_PLAYER) || 3,
      actionPointsPerTurn: parseInt(process.env.ACTION_POINTS_PER_TURN) || 100,
      startingResources: parseInt(process.env.STARTING_RESOURCES) || 1000
    },
    logging: {
      level: process.env.LOG_LEVEL || 'debug',
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
      port: parseInt(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: { rejectUnauthorized: false }
    },
    redis: {
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD
    },
    session: {
      secret: process.env.SESSION_SECRET,
      duration: 24 * 60 * 60 * 1000, // 24 hours
      cleanup: 60 * 60 * 1000 // 1 hour
    },
    jwt: {
      secret: process.env.JWT_SECRET,
      expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    },
    game: {
      turnDuration: process.env.TURN_DURATION || '24h',
      maxPlayers: parseInt(process.env.MAX_PLAYERS) || 1000,
      maxEmpiresPerPlayer: parseInt(process.env.MAX_EMPIRES_PER_PLAYER) || 3,
      actionPointsPerTurn: parseInt(process.env.ACTION_POINTS_PER_TURN) || 100,
      startingResources: parseInt(process.env.STARTING_RESOURCES) || 1000
    },
    logging: {
      level: process.env.LOG_LEVEL || 'info',
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
    'SESSION_SECRET',
    'JWT_SECRET'
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

/**
 * Validate environment variables for any environment
 * @throws {Error} If critical variables are missing or invalid
 */
function validateEnvironmentConfig() {
  const warnings = [];
  
  // Check JWT secret strength
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    warnings.push('JWT_SECRET should be at least 32 characters for security');
  }
  
  // Check SESSION_SECRET strength
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length < 32) {
    warnings.push('SESSION_SECRET should be at least 32 characters for security');
  }
  
  // Check numeric values
  const numericVars = ['DB_PORT', 'REDIS_PORT', 'PORT', 'MAX_PLAYERS', 'ACTION_POINTS_PER_TURN'];
  numericVars.forEach(varName => {
    if (process.env[varName] && isNaN(parseInt(process.env[varName]))) {
      throw new Error(`${varName} must be a valid number`);
    }
  });
  
  // Log warnings
  if (warnings.length > 0) {
    console.warn('Environment configuration warnings:');
    warnings.forEach(warning => console.warn(`  - ${warning}`));
  }
}

module.exports = {
  getConfig,
  validateProductionConfig,
  validateEnvironmentConfig
};
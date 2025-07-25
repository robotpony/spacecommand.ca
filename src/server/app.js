/**
 * Express application setup for SpaceCommand API server
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const { body, validationResult } = require('express-validator');

// Import configuration and utilities
const { validateEnvironmentConfig } = require('./config/environment');
const sessionManager = require('./utils/SessionManager');

// Import services
const ResourceCalculator = require('./services/ResourceCalculator');
const TurnManager = require('./services/TurnManager');
const CombatResolver = require('./services/CombatResolver');
const DiplomacyProcessor = require('./services/DiplomacyProcessor');
const TerritoryExpansion = require('./services/TerritoryExpansion');
const GameBalanceEngine = require('./services/GameBalanceEngine');

// Import route modules
const authRoutes = require('./routes/auth');
const empireRoutes = require('./routes/empire');
const fleetRoutes = require('./routes/fleets');
const combatRoutes = require('./routes/combat');
const diplomacyRoutes = require('./routes/diplomacy');
const territoryRoutes = require('./routes/territory');
const gameRoutes = require('./routes/game');

// Import middleware
const { authenticateToken } = require('./middleware/auth');
const { errorHandler } = require('./middleware/errorHandler');
const { gameStateMiddleware } = require('./middleware/gameState');
const { responseFormatterMiddleware } = require('./utils/responseFormatter');

const app = express();

// Security middleware with custom CSP for React and ES6 modules
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",  // Allow inline scripts for modules and error handling
        "https://unpkg.com"  // Allow React from unpkg CDN
      ],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
      imgSrc: ["'self'", "data:"],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'self'"],
      upgradeInsecureRequests: []
    }
  }
}));
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://spacecommand.ca', 'https://www.spacecommand.ca']
    : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later' },
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health';
  }
});

const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 auth requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many authentication attempts, please try again later' },
  skipSuccessfulRequests: true // Don't count successful requests
});

const passwordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // 3 password change attempts per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many password change attempts, please try again later' }
});

const combatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 combat actions per minute per user
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many combat actions, please try again later' }
});

const diplomacyLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 diplomatic actions per minute per user
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many diplomatic actions, please try again later' }
});

const heavyOperationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 heavy operations per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many intensive operations, please try again later' }
});

// Body parsing and compression
app.use(compression());
app.use(express.json({ limit: '1mb' })); // Reduced from 10mb to prevent DoS
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Global middleware
app.use('/api', generalLimiter);
app.use('/api', responseFormatterMiddleware);
app.use(gameStateMiddleware);

// Serve static files for web client
app.use(express.static('src/client', {
  etag: true,
  lastModified: true,
  setHeaders: (res, path) => {
    // Set proper MIME types for ES6 modules
    if (path.endsWith('.js')) {
      res.set('Content-Type', 'application/javascript');
    }
  }
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    api: true
  });
});

// API routes with enhanced rate limiting
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/auth/change-password', passwordLimiter); // Additional protection for password changes
app.use('/api/empire', authenticateToken, empireRoutes);
app.use('/api/planets', authenticateToken, empireRoutes);
app.use('/api/resources', authenticateToken, empireRoutes);
app.use('/api/fleets', authenticateToken, fleetRoutes);
app.use('/api/combat', authenticateToken, combatLimiter, combatRoutes);
app.use('/api/diplomacy', authenticateToken, diplomacyLimiter, diplomacyRoutes);
app.use('/api/sectors', authenticateToken, heavyOperationLimiter, territoryRoutes);
app.use('/api/colonize', authenticateToken, heavyOperationLimiter, territoryRoutes);
app.use('/api/trade-routes', authenticateToken, territoryRoutes);
// Protected game routes (authentication required) - except leaderboard
app.use('/api/game', (req, res, next) => {
  // Skip authentication for leaderboard endpoint
  if (req.path === '/leaderboard') {
    return next();
  }
  return authenticateToken(req, res, next);
}, gameRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    message: 'Endpoint not found',
    path: req.originalUrl 
  });
});

// Global error handler
app.use(errorHandler);

// Global service instances
let services = {};

/**
 * Initialize application services
 * @returns {Promise<void>}
 */
async function initializeServices() {
  try {
    // Validate environment configuration
    validateEnvironmentConfig();
    
    // Initialize session manager
    await sessionManager.initialize();
    console.log('✓ SessionManager initialized');
    
    // Initialize game services
    services.resourceCalculator = new ResourceCalculator();
    console.log('✓ ResourceCalculator initialized');
    
    services.turnManager = new TurnManager();
    console.log('✓ TurnManager initialized');
    
    services.combatResolver = new CombatResolver();
    console.log('✓ CombatResolver initialized');
    
    services.diplomacyProcessor = new DiplomacyProcessor();
    console.log('✓ DiplomacyProcessor initialized');
    
    services.territoryExpansion = new TerritoryExpansion();
    console.log('✓ TerritoryExpansion initialized');
    
    services.gameBalanceEngine = new GameBalanceEngine();
    console.log('✓ GameBalanceEngine initialized');
    
    console.log('✓ All services initialized successfully');
  } catch (error) {
    console.error('✗ Failed to initialize services:', error.message);
    throw error;
  }
}

/**
 * Get initialized service instances
 * @returns {Object} Service instances
 */
function getServices() {
  return services;
}

// Export app and initialization function
module.exports = { app, initializeServices, getServices };
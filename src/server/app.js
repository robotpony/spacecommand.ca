/**
 * Express application setup for SpaceCommand API server
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const { body, validationResult } = require('express-validator');

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

const app = express();

// Security middleware
app.use(helmet());
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
  message: { message: 'Too many requests, please try again later' }
});

const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 auth requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many authentication attempts, please try again later' }
});

const combatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 combat actions per minute per user
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many combat actions, please try again later' }
});

// Body parsing and compression
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Global middleware
app.use('/api', generalLimiter);
app.use(gameStateMiddleware);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/empire', authenticateToken, empireRoutes);
app.use('/api/planets', authenticateToken, empireRoutes);
app.use('/api/resources', authenticateToken, empireRoutes);
app.use('/api/fleets', authenticateToken, fleetRoutes);
app.use('/api/combat', authenticateToken, combatLimiter, combatRoutes);
app.use('/api/diplomacy', authenticateToken, diplomacyRoutes);
app.use('/api/sectors', authenticateToken, territoryRoutes);
app.use('/api/colonize', authenticateToken, territoryRoutes);
app.use('/api/trade-routes', authenticateToken, territoryRoutes);
app.use('/api/game', authenticateToken, gameRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    message: 'Endpoint not found',
    path: req.originalUrl 
  });
});

// Global error handler
app.use(errorHandler);

module.exports = app;
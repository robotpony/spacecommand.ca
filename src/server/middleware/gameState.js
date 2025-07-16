/**
 * Game state middleware for tracking turn information and action points
 */

/**
 * Middleware to add game state information to response headers
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
async function gameStateMiddleware(req, res, next) {
  try {
    // Skip for health check and auth endpoints
    if (req.path === '/health' || req.path.startsWith('/api/auth')) {
      return next();
    }

    // Get current game state (this would typically come from a game state service)
    const gameState = await getCurrentGameState();
    
    // Add game state headers to all API responses
    res.set({
      'X-Game-Turn': gameState.currentTurn.toString(),
      'X-Turn-Phase': gameState.currentPhase,
      'X-Phase-Time-Remaining': gameState.phaseTimeRemaining.toString(),
      'Content-Type': 'application/json'
    });

    // If user is authenticated, add action points header
    if (req.user) {
      const actionPoints = await getUserActionPoints(req.user.id, gameState.currentTurn);
      res.set('X-Action-Points', actionPoints.toString());
    }

    next();
  } catch (error) {
    console.error('Game state middleware error:', error);
    // Don't fail the request if game state lookup fails
    next();
  }
}

/**
 * Get current game state information
 * @returns {Object} Game state object
 */
async function getCurrentGameState() {
  // This is a placeholder implementation
  // In a real game, this would query the database or game state service
  const now = new Date();
  const turnStartTime = new Date(now);
  turnStartTime.setHours(0, 0, 0, 0); // Start of day
  
  const turnNumber = Math.floor((now - new Date('2025-01-01')) / (24 * 60 * 60 * 1000)) + 1;
  const hourOfDay = now.getHours();
  
  // Determine current phase based on time of day
  let currentPhase;
  let phaseTimeRemaining;
  
  if (hourOfDay >= 0 && hourOfDay < 6) {
    currentPhase = 'production';
    phaseTimeRemaining = (6 - hourOfDay) * 60 * 60 * 1000 - (now.getMinutes() * 60 * 1000) - (now.getSeconds() * 1000);
  } else if (hourOfDay >= 6 && hourOfDay < 12) {
    currentPhase = 'movement';
    phaseTimeRemaining = (12 - hourOfDay) * 60 * 60 * 1000 - (now.getMinutes() * 60 * 1000) - (now.getSeconds() * 1000);
  } else if (hourOfDay >= 12 && hourOfDay < 18) {
    currentPhase = 'combat';
    phaseTimeRemaining = (18 - hourOfDay) * 60 * 60 * 1000 - (now.getMinutes() * 60 * 1000) - (now.getSeconds() * 1000);
  } else {
    currentPhase = 'diplomacy';
    phaseTimeRemaining = (24 - hourOfDay) * 60 * 60 * 1000 - (now.getMinutes() * 60 * 1000) - (now.getSeconds() * 1000);
  }

  return {
    currentTurn: turnNumber,
    currentPhase,
    phaseTimeRemaining: Math.max(0, phaseTimeRemaining),
    turnStartTime
  };
}

/**
 * Get user's remaining action points for current turn
 * @param {string} userId - User ID
 * @param {number} currentTurn - Current turn number
 * @returns {number} Remaining action points
 */
async function getUserActionPoints(userId, currentTurn) {
  try {
    const db = require('../config/database');
    
    // Get user's actions for current turn
    const result = await db.query(
      'SELECT COUNT(*) as actions_used FROM player_actions WHERE player_id = $1 AND turn_number = $2',
      [userId, currentTurn]
    );
    
    const actionsUsed = parseInt(result.rows[0].actions_used) || 0;
    const maxActions = 10; // Maximum actions per turn
    
    return Math.max(0, maxActions - actionsUsed);
  } catch (error) {
    console.error('Error getting action points:', error);
    return 10; // Default to full action points on error
  }
}

/**
 * Middleware to check if user has sufficient action points for an action
 * @param {number} requiredPoints - Number of action points required
 * @returns {Function} Express middleware function
 */
function requireActionPoints(requiredPoints = 1) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const gameState = await getCurrentGameState();
      const actionPoints = await getUserActionPoints(req.user.id, gameState.currentTurn);
      
      if (actionPoints < requiredPoints) {
        return res.status(429).json({ 
          message: 'Insufficient action points',
          details: {
            required: requiredPoints,
            available: actionPoints,
            resetTime: gameState.phaseTimeRemaining
          }
        });
      }

      // Store required points in request for later consumption
      req.actionPointsRequired = requiredPoints;
      req.gameState = gameState;
      
      next();
    } catch (error) {
      console.error('Action points check error:', error);
      return res.status(500).json({ message: 'Action validation failed' });
    }
  };
}

/**
 * Consume action points after successful action
 * @param {Object} req - Express request object
 * @param {string} actionType - Type of action performed
 */
async function consumeActionPoints(req, actionType) {
  try {
    if (!req.user || !req.actionPointsRequired || !req.gameState) {
      return;
    }

    const db = require('../config/database');
    
    // Record the action
    await db.query(
      'INSERT INTO player_actions (player_id, turn_number, action_type, action_points, timestamp) VALUES ($1, $2, $3, $4, $5)',
      [req.user.id, req.gameState.currentTurn, actionType, req.actionPointsRequired, new Date()]
    );
  } catch (error) {
    console.error('Error consuming action points:', error);
    // Don't fail the request if action point consumption fails
  }
}

module.exports = {
  gameStateMiddleware,
  getCurrentGameState,
  getUserActionPoints,
  requireActionPoints,
  consumeActionPoints
};
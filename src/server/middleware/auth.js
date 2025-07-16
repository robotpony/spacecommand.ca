/**
 * Authentication middleware for API endpoints
 */
const jwt = require('jsonwebtoken');
const SessionManager = require('../utils/SessionManager');

/**
 * Middleware to authenticate JWT tokens and validate sessions
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      message: 'Access token required' 
    });
  }

  try {
    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if session is still valid in Redis
    const sessionData = await SessionManager.getSession(decoded.sessionId);
    if (!sessionData) {
      return res.status(401).json({ 
        message: 'Session expired or invalid' 
      });
    }

    // Attach user data to request
    req.user = {
      id: decoded.userId,
      username: decoded.username,
      sessionId: decoded.sessionId
    };

    // Update session last activity
    await SessionManager.updateActivity(decoded.sessionId);

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        message: 'Token expired' 
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        message: 'Invalid token' 
      });
    }

    console.error('Authentication error:', error);
    return res.status(500).json({ 
      message: 'Authentication service error' 
    });
  }
}

/**
 * Middleware to check if user has admin permissions
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
async function requireAdmin(req, res, next) {
  try {
    const Player = require('../models/Player');
    const player = await Player.findById(req.user.id);
    
    if (!player || !player.permissions.admin) {
      return res.status(403).json({ 
        message: 'Admin permissions required' 
      });
    }

    next();
  } catch (error) {
    console.error('Admin check error:', error);
    return res.status(500).json({ 
      message: 'Permission check failed' 
    });
  }
}

/**
 * Middleware to check if user has moderator permissions
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
async function requireModerator(req, res, next) {
  try {
    const Player = require('../models/Player');
    const player = await Player.findById(req.user.id);
    
    if (!player || (!player.permissions.admin && !player.permissions.moderator)) {
      return res.status(403).json({ 
        message: 'Moderator permissions required' 
      });
    }

    next();
  } catch (error) {
    console.error('Moderator check error:', error);
    return res.status(500).json({ 
      message: 'Permission check failed' 
    });
  }
}

module.exports = {
  authenticateToken,
  requireAdmin,
  requireModerator
};
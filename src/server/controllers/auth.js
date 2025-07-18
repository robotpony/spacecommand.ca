/**
 * Authentication controller for player registration, login, and profile management
 */
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { validationResult } = require('express-validator');

const Player = require('../models/Player');
const SessionManager = require('../utils/SessionManager');
const { ValidationError, ConflictError, UnauthorizedError } = require('../middleware/errorHandler');

/**
 * Register a new player account
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function register(req, res, next) {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Invalid input data', { 
        fields: errors.array().map(err => ({ 
          field: err.path, 
          message: err.msg 
        }))
      });
    }

    const { username, password, email } = req.body;

    // Check if username already exists
    const existingPlayer = await Player.findByUsername(username);
    if (existingPlayer) {
      throw new ConflictError('Username already exists');
    }

    // Check if email already exists
    const existingEmail = await Player.findByEmail(email);
    if (existingEmail) {
      throw new ConflictError('Email address already registered');
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create new player
    const playerData = {
      id: uuidv4(),
      username,
      email,
      passwordHash,
      profile: {
        displayName: username,
        avatar: '',
        bio: '',
        joinDate: new Date()
      },
      settings: {
        notifications: true,
        emailUpdates: false,
        language: 'en',
        timezone: 'UTC'
      },
      permissions: {
        admin: false,
        moderator: false,
        beta: false
      },
      stats: {
        gamesPlayed: 0,
        gamesWon: 0,
        totalPlayTime: 0,
        lastActive: new Date()
      }
    };

    const player = new Player(playerData);
    await player.save();

    // Create session
    const sessionId = uuidv4();
    await SessionManager.createSession(sessionId, {
      userId: player.id,
      username: player.username,
      loginTime: new Date(),
      lastActivity: new Date()
    });

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: player.id, 
        username: player.username,
        sessionId 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return player data and set auth header
    res.set('Authorization', `Bearer ${token}`);
    res.status(201).json({
      id: player.id,
      username: player.username,
      email: player.email,
      profile: player.profile,
      settings: player.settings
    });

  } catch (error) {
    next(error);
  }
}

/**
 * Authenticate existing player
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function login(req, res, next) {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Invalid input data', { 
        fields: errors.array().map(err => ({ 
          field: err.path, 
          message: err.msg 
        }))
      });
    }

    const { username, password } = req.body;

    // Find player by username
    const player = await Player.findByUsername(username);
    if (!player) {
      throw new UnauthorizedError('Invalid username or password');
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, player.passwordHash);
    if (!validPassword) {
      throw new UnauthorizedError('Invalid username or password');
    }

    // Update last active timestamp
    player.stats.lastActive = new Date();
    await player.save();

    // Create session
    const sessionId = uuidv4();
    await SessionManager.createSession(sessionId, {
      userId: player.id,
      username: player.username,
      loginTime: new Date(),
      lastActivity: new Date()
    });

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: player.id, 
        username: player.username,
        sessionId 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return player data and set auth header
    res.set('Authorization', `Bearer ${token}`);
    res.status(200).json({
      id: player.id,
      username: player.username,
      email: player.email,
      profile: player.profile,
      settings: player.settings,
      stats: {
        gamesPlayed: player.stats.gamesPlayed,
        gamesWon: player.stats.gamesWon,
        totalPlayTime: player.stats.totalPlayTime,
        lastActive: player.stats.lastActive
      }
    });

  } catch (error) {
    next(error);
  }
}

/**
 * Invalidate current session
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function logout(req, res, next) {
  try {
    // Invalidate session in Redis
    await SessionManager.deleteSession(req.user.sessionId);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

/**
 * Get current player profile
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function getProfile(req, res, next) {
  try {
    const player = await Player.findById(req.user.id);
    if (!player) {
      throw new UnauthorizedError('Player not found');
    }

    res.status(200).json({
      id: player.id,
      username: player.username,
      email: player.email,
      profile: player.profile,
      settings: player.settings,
      permissions: player.permissions,
      stats: {
        gamesPlayed: player.stats.gamesPlayed,
        gamesWon: player.stats.gamesWon,
        totalPlayTime: player.stats.totalPlayTime,
        lastActive: player.stats.lastActive
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update player profile information
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function updateProfile(req, res, next) {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Invalid input data', { 
        fields: errors.array().map(err => ({ 
          field: err.path, 
          message: err.msg 
        }))
      });
    }

    const player = await Player.findById(req.user.id);
    if (!player) {
      throw new UnauthorizedError('Player not found');
    }

    // Update profile fields if provided
    if (req.body.profile) {
      Object.assign(player.profile, req.body.profile);
    }

    // Update settings fields if provided
    if (req.body.settings) {
      Object.assign(player.settings, req.body.settings);
    }

    player.updatedAt = new Date();
    await player.save();

    res.status(200).json({
      id: player.id,
      username: player.username,
      email: player.email,
      profile: player.profile,
      settings: player.settings
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Change player password
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function changePassword(req, res, next) {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Invalid input data', { 
        fields: errors.array().map(err => ({ 
          field: err.path, 
          message: err.msg 
        }))
      });
    }

    const { currentPassword, newPassword } = req.body;

    const player = await Player.findById(req.user.id);
    if (!player) {
      throw new UnauthorizedError('Player not found');
    }

    // Verify current password
    const validPassword = await bcrypt.compare(currentPassword, player.passwordHash);
    if (!validPassword) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    // Hash new password
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    player.passwordHash = newPasswordHash;
    player.updatedAt = new Date();
    await player.save();

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  register,
  login,
  logout,
  getProfile,
  updateProfile,
  changePassword
};
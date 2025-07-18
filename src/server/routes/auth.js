/**
 * Authentication routes for player registration, login, and profile management
 */
const express = require('express');
const { body } = require('express-validator');

const authController = require('../controllers/auth');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/auth/register
 * Register a new player account
 */
router.post('/register', [
  body('username')
    .isLength({ min: 3, max: 30 })
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username must be 3-30 characters, alphanumeric, underscore, or dash only'),
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must be at least 8 characters with uppercase, lowercase, and number'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email address required')
], authController.register);

/**
 * POST /api/auth/login
 * Authenticate existing player
 */
router.post('/login', [
  body('username').notEmpty().withMessage('Username required'),
  body('password').notEmpty().withMessage('Password required')
], authController.login);

/**
 * POST /api/auth/logout
 * Invalidate current session
 */
router.post('/logout', authenticateToken, authController.logout);

/**
 * GET /api/auth/profile
 * Get current player profile
 */
router.get('/profile', authenticateToken, authController.getProfile);

/**
 * PUT /api/auth/profile
 * Update player profile information
 */
router.put('/profile', authenticateToken, [
  body('profile.displayName')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Display name must be 1-50 characters'),
  body('profile.bio')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Bio must be 500 characters or less'),
  body('settings.notifications')
    .optional()
    .isBoolean()
    .withMessage('Notifications setting must be boolean'),
  body('settings.emailUpdates')
    .optional()
    .isBoolean()
    .withMessage('Email updates setting must be boolean'),
  body('settings.language')
    .optional()
    .isIn(['en', 'es', 'fr', 'de', 'zh'])
    .withMessage('Invalid language code'),
  body('settings.timezone')
    .optional()
    .matches(/^[A-Za-z]+\/[A-Za-z_]+$/)
    .withMessage('Invalid timezone format')
], authController.updateProfile);

/**
 * POST /api/auth/change-password
 * Change player password
 */
router.post('/change-password', authenticateToken, [
  body('currentPassword').notEmpty().withMessage('Current password required'),
  body('newPassword')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must be at least 8 characters with uppercase, lowercase, and number')
], authController.changePassword);

module.exports = router;
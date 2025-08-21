import { Router } from 'express';
import { AuthController } from './controllers/AuthController';
import { createRateLimitMiddleware } from '@api/middleware/rateLimiter';
import { createAuthMiddleware } from '@api/middleware/authenticate';
import { RateLimiter } from '@core/auth/RateLimiter';
import { SessionRepository } from '@infrastructure/repositories/SessionRepository';
import { UserRepository } from '@infrastructure/repositories/UserRepository';

/**
 * Authentication routes for user registration, login, and account management.
 * Implements rate limiting, validation, and proper error handling.
 */
export const createAuthRoutes = (
  authController: AuthController,
  rateLimiter: RateLimiter,
  sessionRepository: SessionRepository,
  userRepository: UserRepository
): Router => {
  const router = Router();
  
  // Create middleware instances
  const rateLimitMiddleware = createRateLimitMiddleware(rateLimiter);
  const authMiddleware = createAuthMiddleware(sessionRepository, userRepository);

  // Public routes
  
  /**
   * POST /auth/register
   * Register a new user account
   * Rate limited per IP address
   */
  router.post('/register',
    rateLimitMiddleware.registrationRateLimit(),
    authController.register
  );

  /**
   * POST /auth/login
   * Authenticate user and create session
   * Rate limited per email + IP
   */
  router.post('/login',
    rateLimitMiddleware.loginRateLimit(),
    authController.login,
    rateLimitMiddleware.recordFailedLogin(),
    rateLimitMiddleware.clearRateLimit()
  );

  /**
   * POST /auth/verify-email
   * Verify email address with token
   * No rate limiting - tokens are already time-limited
   */
  router.post('/verify-email',
    authController.verifyEmail
  );

  /**
   * POST /auth/forgot-password
   * Request password reset email
   * Rate limited per email + IP
   */
  router.post('/forgot-password',
    rateLimitMiddleware.passwordResetRateLimit(),
    authController.forgotPassword
  );

  /**
   * POST /auth/reset-password
   * Reset password with token
   * No rate limiting - tokens are already time-limited and one-time use
   */
  router.post('/reset-password',
    authController.resetPassword
  );

  // Protected routes (require authentication)

  /**
   * GET /auth/me
   * Get current user information
   * Requires valid authentication
   */
  router.get('/me',
    authMiddleware.requireAuth(),
    authMiddleware.autoRefresh(),
    authController.getCurrentUser
  );

  /**
   * POST /auth/logout
   * Log out and invalidate session
   * Requires valid authentication
   */
  router.post('/logout',
    authMiddleware.requireAuth(),
    authController.logout
  );

  /**
   * GET /auth/universes
   * Get user's active universes
   * Requires valid authentication
   */
  router.get('/universes',
    authMiddleware.requireAuth(),
    authMiddleware.autoRefresh(),
    authController.getUserUniverses
  );

  /**
   * PUT /auth/profile
   * Update user profile information
   * Requires valid authentication
   */
  router.put('/profile',
    authMiddleware.requireAuth(),
    authMiddleware.autoRefresh(),
    authController.updateProfile
  );

  // Health check endpoint
  router.get('/health', (req, res) => {
    res.json({
      success: true,
      service: 'authentication',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
  });

  return router;
};

/**
 * Creates validation middleware for request bodies
 */
export const validateRegistration = () => {
  return (req: any, res: any, next: any) => {
    const { email, username, password } = req.body;
    const errors: string[] = [];

    // Email validation
    if (!email || typeof email !== 'string') {
      errors.push('Email is required and must be a string');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.push('Email must be a valid email address');
    }

    // Username validation
    if (!username || typeof username !== 'string') {
      errors.push('Username is required and must be a string');
    } else {
      const trimmedUsername = username.trim();
      if (trimmedUsername.length < 3 || trimmedUsername.length > 50) {
        errors.push('Username must be between 3 and 50 characters');
      }
      if (!/^[a-zA-Z0-9_-]+$/.test(trimmedUsername)) {
        errors.push('Username can only contain letters, numbers, underscores, and hyphens');
      }
    }

    // Password validation (basic - detailed validation in AuthService)
    if (!password || typeof password !== 'string') {
      errors.push('Password is required and must be a string');
    } else if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: errors.join('. '),
        code: 'VALIDATION_ERROR'
      });
    }

    next();
  };
};

/**
 * Creates validation middleware for login requests
 */
export const validateLogin = () => {
  return (req: any, res: any, next: any) => {
    const { email, password } = req.body;
    const errors: string[] = [];

    // Email validation
    if (!email || typeof email !== 'string') {
      errors.push('Email is required and must be a string');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.push('Email must be a valid email address');
    }

    // Password validation
    if (!password || typeof password !== 'string') {
      errors.push('Password is required and must be a string');
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: errors.join('. '),
        code: 'VALIDATION_ERROR'
      });
    }

    next();
  };
};

/**
 * Enhanced auth routes with validation
 */
export const createValidatedAuthRoutes = (
  authController: AuthController,
  rateLimiter: RateLimiter,
  sessionRepository: SessionRepository,
  userRepository: UserRepository
): Router => {
  const router = createAuthRoutes(
    authController,
    rateLimiter,
    sessionRepository,
    userRepository
  );

  // Add validation middleware to existing routes
  const registrationRoute = router.stack.find(layer => 
    layer.route?.path === '/register' && layer.route.methods.post
  );
  if (registrationRoute) {
    registrationRoute.route.stack.unshift({
      handle: validateRegistration(),
      name: 'validateRegistration',
      params: undefined,
      path: undefined,
      keys: [],
      regexp: undefined,
      method: undefined
    } as any);
  }

  const loginRoute = router.stack.find(layer => 
    layer.route?.path === '/login' && layer.route.methods.post
  );
  if (loginRoute) {
    loginRoute.route.stack.unshift({
      handle: validateLogin(),
      name: 'validateLogin',
      params: undefined,
      path: undefined,
      keys: [],
      regexp: undefined,
      method: undefined
    } as any);
  }

  return router;
};
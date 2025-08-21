import { Request, Response, NextFunction } from 'express';
import { TokenService } from '@core/auth/TokenService';
import { SessionRepository } from '@infrastructure/repositories/SessionRepository';
import { UserRepository } from '@infrastructure/repositories/UserRepository';
import { authConfig } from '@config/auth.config';

/**
 * Authentication middleware for protecting API routes.
 * Verifies JWT tokens and loads user context into request.
 * Supports optional authentication for flexible route protection.
 */

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    username: string;
    sessionId: string;
  };
  session?: any;
}

export class AuthMiddleware {
  private tokenService: TokenService;
  private sessionRepository: SessionRepository;
  private userRepository: UserRepository;

  constructor(
    tokenService: TokenService,
    sessionRepository: SessionRepository,
    userRepository: UserRepository
  ) {
    this.tokenService = tokenService;
    this.sessionRepository = sessionRepository;
    this.userRepository = userRepository;
  }

  /**
   * Middleware that requires valid authentication.
   * Returns 401 if token is missing or invalid.
   */
  public requireAuth() {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        const authHeader = req.headers.authorization;
        const token = this.tokenService.extractTokenFromHeader(authHeader);

        if (!token) {
          return res.status(401).json({
            success: false,
            error: 'Authentication required',
            code: 'MISSING_TOKEN'
          });
        }

        const payload = this.tokenService.verifyToken(token);
        if (!payload) {
          return res.status(401).json({
            success: false,
            error: 'Invalid or expired token',
            code: 'INVALID_TOKEN'
          });
        }

        // Verify session exists and is valid
        const session = await this.sessionRepository.findById(payload.sessionId);
        if (!session || !this.tokenService.isSessionValid(session)) {
          return res.status(401).json({
            success: false,
            error: 'Session expired',
            code: 'SESSION_EXPIRED'
          });
        }

        // Verify user exists
        const user = await this.userRepository.findById(payload.userId);
        if (!user) {
          return res.status(401).json({
            success: false,
            error: 'User not found',
            code: 'USER_NOT_FOUND'
          });
        }

        // Update session activity
        await this.sessionRepository.updateLastActivity(session.id);

        // Add user to request
        req.user = {
          id: user.id,
          email: user.email,
          username: user.username,
          sessionId: session.id
        };
        req.session = session;

        next();
      } catch (error) {
        console.error('Authentication error:', error);
        res.status(500).json({
          success: false,
          error: 'Authentication failed',
          code: 'AUTH_ERROR'
        });
      }
    };
  }

  /**
   * Middleware that optionally loads user if token is provided.
   * Does not return error if token is missing.
   */
  public optionalAuth() {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        const authHeader = req.headers.authorization;
        const token = this.tokenService.extractTokenFromHeader(authHeader);

        if (!token) {
          return next(); // No token, continue without user
        }

        const payload = this.tokenService.verifyToken(token);
        if (!payload) {
          return next(); // Invalid token, continue without user
        }

        // Verify session exists and is valid
        const session = await this.sessionRepository.findById(payload.sessionId);
        if (!session || !this.tokenService.isSessionValid(session)) {
          return next(); // Invalid session, continue without user
        }

        // Verify user exists
        const user = await this.userRepository.findById(payload.userId);
        if (!user) {
          return next(); // User not found, continue without user
        }

        // Update session activity
        await this.sessionRepository.updateLastActivity(session.id);

        // Add user to request
        req.user = {
          id: user.id,
          email: user.email,
          username: user.username,
          sessionId: session.id
        };
        req.session = session;

        next();
      } catch (error) {
        console.error('Optional auth error:', error);
        next(); // Continue on error for optional auth
      }
    };
  }

  /**
   * Middleware that checks if user email is verified.
   */
  public requireEmailVerified() {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'MISSING_AUTH'
        });
      }

      try {
        const user = await this.userRepository.findById(req.user.id);
        if (!user || !user.emailVerified) {
          return res.status(403).json({
            success: false,
            error: 'Email verification required',
            code: 'EMAIL_NOT_VERIFIED'
          });
        }

        next();
      } catch (error) {
        console.error('Email verification check error:', error);
        res.status(500).json({
          success: false,
          error: 'Verification check failed',
          code: 'VERIFICATION_ERROR'
        });
      }
    };
  }

  /**
   * Middleware that refreshes token if needed.
   * Should be used with requireAuth.
   */
  public autoRefresh() {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        const authHeader = req.headers.authorization;
        const token = this.tokenService.extractTokenFromHeader(authHeader);

        if (!token || !req.user || !req.session) {
          return next(); // No token or user, skip refresh
        }

        // Check if token should be refreshed
        if (this.tokenService.shouldRefreshToken(token) && req.session.isPersistent) {
          const newPayload = this.tokenService.createTokenPayload(
            req.user.id,
            req.user.email,
            req.user.username,
            req.user.sessionId
          );

          const newToken = this.tokenService.generateToken(newPayload, true);
          const newExpiry = this.tokenService.getTokenExpiration(true);

          // Update session expiry
          await this.sessionRepository.extendSession(req.session.id, newExpiry);

          // Add new token to response header
          res.setHeader('X-New-Token', newToken);
        }

        next();
      } catch (error) {
        console.error('Auto refresh error:', error);
        next(); // Continue on refresh error
      }
    };
  }
}

// Create middleware instance
export const createAuthMiddleware = (
  sessionRepository: SessionRepository,
  userRepository: UserRepository
) => {
  const tokenService = new TokenService(authConfig.session);
  return new AuthMiddleware(tokenService, sessionRepository, userRepository);
};
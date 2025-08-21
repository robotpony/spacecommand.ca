import { Request, Response } from 'express';
import { AuthService } from '@core/auth/AuthService';
import { UserCredentials, RegistrationData } from '@core/auth/types';
import { AuthenticatedRequest } from '@api/middleware/authenticate';

/**
 * Authentication controller handling login, registration, and user management.
 * Provides REST endpoints for all authentication operations.
 * Integrates with AuthService for business logic.
 */
export class AuthController {
  private authService: AuthService;

  constructor(authService: AuthService) {
    this.authService = authService;
  }

  /**
   * Registers a new user account.
   * POST /auth/register
   */
  public register = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, username, password, inviteCode, applicationText } = req.body;

      // Validate required fields
      if (!email || !username || !password) {
        res.status(400).json({
          success: false,
          error: 'Email, username, and password are required',
          code: 'MISSING_FIELDS'
        });
        return;
      }

      const registrationData: RegistrationData = {
        email: email.trim().toLowerCase(),
        username: username.trim(),
        password,
        inviteCode: inviteCode?.trim(),
        applicationText: applicationText?.trim()
      };

      const ipAddress = this.getClientIp(req);
      const result = await this.authService.register(registrationData, ipAddress);

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      // Don't return sensitive data
      const response = {
        success: true,
        user: result.user?.toJSON(),
        token: result.token,
        refreshToken: result.refreshToken,
        message: result.code === 'APPROVAL_PENDING' 
          ? 'Registration submitted for approval'
          : 'Registration successful'
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        error: 'Registration failed',
        code: 'INTERNAL_ERROR'
      });
    }
  };

  /**
   * Authenticates user and creates session.
   * POST /auth/login
   */
  public login = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password, secureShipComputer = false } = req.body;

      if (!email || !password) {
        res.status(400).json({
          success: false,
          error: 'Email and password are required',
          code: 'MISSING_CREDENTIALS'
        });
        return;
      }

      const credentials: UserCredentials = {
        email: email.trim().toLowerCase(),
        password
      };

      const ipAddress = this.getClientIp(req);
      const userAgent = req.headers['user-agent'];
      
      const result = await this.authService.login(
        credentials, 
        secureShipComputer, 
        ipAddress
      );

      if (!result.success) {
        res.status(401).json(result);
        return;
      }

      const response = {
        success: true,
        user: result.user?.toJSON(),
        token: result.token,
        refreshToken: result.refreshToken,
        sessionType: secureShipComputer ? 'persistent' : 'standard'
      };

      res.json(response);
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        error: 'Login failed',
        code: 'INTERNAL_ERROR'
      });
    }
  };

  /**
   * Logs out user and invalidates session.
   * POST /auth/logout
   */
  public logout = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.replace('Bearer ', '');

      if (!token) {
        res.status(400).json({
          success: false,
          error: 'Token is required',
          code: 'MISSING_TOKEN'
        });
        return;
      }

      const success = await this.authService.logout(token);

      res.json({
        success,
        message: success ? 'Logged out successfully' : 'Logout failed'
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        error: 'Logout failed',
        code: 'INTERNAL_ERROR'
      });
    }
  };

  /**
   * Verifies email address with token.
   * POST /auth/verify-email
   */
  public verifyEmail = async (req: Request, res: Response): Promise<void> => {
    try {
      const { token } = req.body;

      if (!token) {
        res.status(400).json({
          success: false,
          error: 'Verification token is required',
          code: 'MISSING_TOKEN'
        });
        return;
      }

      const result = await this.authService.verifyEmail(token);

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.json({
        success: true,
        message: 'Email verified successfully',
        user: result.user?.toJSON()
      });
    } catch (error) {
      console.error('Email verification error:', error);
      res.status(500).json({
        success: false,
        error: 'Email verification failed',
        code: 'INTERNAL_ERROR'
      });
    }
  };

  /**
   * Requests password reset email.
   * POST /auth/forgot-password
   */
  public forgotPassword = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email } = req.body;

      if (!email) {
        res.status(400).json({
          success: false,
          error: 'Email is required',
          code: 'MISSING_EMAIL'
        });
        return;
      }

      const ipAddress = this.getClientIp(req);
      const success = await this.authService.requestPasswordReset(
        email.trim().toLowerCase(), 
        ipAddress
      );

      // Always return success to prevent user enumeration
      res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent'
      });
    } catch (error) {
      console.error('Password reset request error:', error);
      res.status(500).json({
        success: false,
        error: 'Password reset request failed',
        code: 'INTERNAL_ERROR'
      });
    }
  };

  /**
   * Resets password with token.
   * POST /auth/reset-password
   */
  public resetPassword = async (req: Request, res: Response): Promise<void> => {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        res.status(400).json({
          success: false,
          error: 'Reset token and new password are required',
          code: 'MISSING_FIELDS'
        });
        return;
      }

      const result = await this.authService.resetPassword(token, newPassword);

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.json({
        success: true,
        message: 'Password reset successfully',
        user: result.user?.toJSON()
      });
    } catch (error) {
      console.error('Password reset error:', error);
      res.status(500).json({
        success: false,
        error: 'Password reset failed',
        code: 'INTERNAL_ERROR'
      });
    }
  };

  /**
   * Gets current user information.
   * GET /auth/me
   */
  public getCurrentUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated',
          code: 'NOT_AUTHENTICATED'
        });
        return;
      }

      // Get full user data
      const userRepository = req.app.locals.userRepository;
      const user = await userRepository.findById(req.user.id);

      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        });
        return;
      }

      res.json({
        success: true,
        user: user.toJSON()
      });
    } catch (error) {
      console.error('Get current user error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get user information',
        code: 'INTERNAL_ERROR'
      });
    }
  };

  /**
   * Gets user's universes.
   * GET /auth/universes
   */
  public getUserUniverses = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated',
          code: 'NOT_AUTHENTICATED'
        });
        return;
      }

      const userRepository = req.app.locals.userRepository;
      const user = await userRepository.findById(req.user.id);

      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        });
        return;
      }

      res.json({
        success: true,
        universes: user.universes || [],
        maxUniverses: req.app.locals.authConfig.registration.maxUniversesPerUser
      });
    } catch (error) {
      console.error('Get user universes error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get user universes',
        code: 'INTERNAL_ERROR'
      });
    }
  };

  /**
   * Updates user profile.
   * PUT /auth/profile
   */
  public updateProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated',
          code: 'NOT_AUTHENTICATED'
        });
        return;
      }

      const { displayName, bio, favoriteFaction } = req.body;
      const userRepository = req.app.locals.userRepository;
      
      const user = await userRepository.findById(req.user.id);
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        });
        return;
      }

      // Update profile
      const profileUpdates = {
        displayName: displayName?.trim(),
        bio: bio?.trim(),
        favoriteFaction
      };

      user.updateProfile(profileUpdates);
      await userRepository.update(user);

      res.json({
        success: true,
        message: 'Profile updated successfully',
        user: user.toJSON()
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update profile',
        code: 'INTERNAL_ERROR'
      });
    }
  };

  /**
   * Gets client IP address.
   * @private
   */
  private getClientIp(req: Request): string {
    return (
      req.ip ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      'unknown'
    );
  }
}
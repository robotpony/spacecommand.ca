import { Request, Response, NextFunction } from 'express';
import { RateLimiter } from '@core/auth/RateLimiter';
import { authConfig } from '@config/auth.config';

/**
 * Rate limiting middleware to prevent abuse and brute force attacks.
 * Integrates with the authentication rate limiter service.
 */

interface RateLimitRequest extends Request {
  rateLimitInfo?: {
    identifier: string;
    ipAddress: string;
  };
}

export class RateLimitMiddleware {
  private rateLimiter: RateLimiter;

  constructor(rateLimiter: RateLimiter) {
    this.rateLimiter = rateLimiter;
  }

  /**
   * Rate limits login attempts.
   * Blocks requests if too many failed attempts.
   */
  public loginRateLimit() {
    return async (req: RateLimitRequest, res: Response, next: NextFunction) => {
      try {
        const email = req.body.email;
        const ipAddress = this.getClientIp(req);

        if (!email) {
          return res.status(400).json({
            success: false,
            error: 'Email is required',
            code: 'MISSING_EMAIL'
          });
        }

        const allowed = await this.rateLimiter.checkLoginLimit(email, ipAddress);
        
        if (!allowed) {
          // Get lockout info for better error message
          const status = await this.rateLimiter.getRateLimitStatus(email);
          
          let retryAfter = 0;
          if (status.isLocked && status.lockedUntil) {
            retryAfter = Math.ceil((status.lockedUntil.getTime() - Date.now()) / 1000);
          }

          res.setHeader('Retry-After', retryAfter || 3600); // Default 1 hour
          
          return res.status(429).json({
            success: false,
            error: status.isLocked 
              ? `Account temporarily locked. Try again in ${Math.ceil(retryAfter / 60)} minutes.`
              : 'Too many login attempts. Please try again later.',
            code: 'RATE_LIMITED',
            retryAfter
          });
        }

        // Store info for potential failure recording
        req.rateLimitInfo = { identifier: email, ipAddress };
        
        next();
      } catch (error) {
        console.error('Login rate limit error:', error);
        next(); // Continue on rate limit error to avoid blocking legitimate users
      }
    };
  }

  /**
   * Rate limits password reset requests.
   */
  public passwordResetRateLimit() {
    return async (req: RateLimitRequest, res: Response, next: NextFunction) => {
      try {
        const email = req.body.email;
        const ipAddress = this.getClientIp(req);

        if (!email) {
          return res.status(400).json({
            success: false,
            error: 'Email is required',
            code: 'MISSING_EMAIL'
          });
        }

        const allowed = await this.rateLimiter.checkPasswordResetLimit(email, ipAddress);
        
        if (!allowed) {
          res.setHeader('Retry-After', 3600); // 1 hour
          
          return res.status(429).json({
            success: false,
            error: 'Too many password reset requests. Please try again in an hour.',
            code: 'RATE_LIMITED',
            retryAfter: 3600
          });
        }

        next();
      } catch (error) {
        console.error('Password reset rate limit error:', error);
        next(); // Continue on error
      }
    };
  }

  /**
   * Rate limits registration attempts.
   */
  public registrationRateLimit() {
    return async (req: RateLimitRequest, res: Response, next: NextFunction) => {
      try {
        const ipAddress = this.getClientIp(req);

        const allowed = await this.rateLimiter.checkRegistrationLimit(ipAddress);
        
        if (!allowed) {
          res.setHeader('Retry-After', 86400); // 24 hours
          
          return res.status(429).json({
            success: false,
            error: 'Too many registration attempts from this IP address. Please try again tomorrow.',
            code: 'RATE_LIMITED',
            retryAfter: 86400
          });
        }

        next();
      } catch (error) {
        console.error('Registration rate limit error:', error);
        next(); // Continue on error
      }
    };
  }

  /**
   * General API rate limiting.
   * Prevents spam requests to any endpoint.
   */
  public generalRateLimit(requestsPerMinute: number = 60) {
    const windowMs = 60 * 1000; // 1 minute
    const requestCounts = new Map<string, { count: number; resetTime: number }>();

    return (req: Request, res: Response, next: NextFunction) => {
      const identifier = this.getClientIp(req);
      const now = Date.now();
      
      const existing = requestCounts.get(identifier);
      
      if (!existing || existing.resetTime <= now) {
        // New window
        requestCounts.set(identifier, {
          count: 1,
          resetTime: now + windowMs
        });
        return next();
      }
      
      if (existing.count >= requestsPerMinute) {
        const retryAfter = Math.ceil((existing.resetTime - now) / 1000);
        res.setHeader('Retry-After', retryAfter);
        
        return res.status(429).json({
          success: false,
          error: 'Too many requests. Please slow down.',
          code: 'RATE_LIMITED',
          retryAfter
        });
      }
      
      existing.count++;
      next();
    };
  }

  /**
   * Records a failed login attempt for rate limiting.
   */
  public recordFailedLogin() {
    return async (req: RateLimitRequest, res: Response, next: NextFunction) => {
      // Only record if this was a failed login
      if (res.statusCode === 401 && req.rateLimitInfo) {
        try {
          await this.rateLimiter.recordFailedLogin(
            req.rateLimitInfo.identifier,
            req.rateLimitInfo.ipAddress
          );
        } catch (error) {
          console.error('Failed to record login attempt:', error);
        }
      }
      next();
    };
  }

  /**
   * Clears rate limit on successful login.
   */
  public clearRateLimit() {
    return async (req: RateLimitRequest, res: Response, next: NextFunction) => {
      // Only clear if this was a successful login
      if (res.statusCode < 400 && req.rateLimitInfo) {
        try {
          await this.rateLimiter.clearLoginAttempts(req.rateLimitInfo.identifier);
        } catch (error) {
          console.error('Failed to clear rate limit:', error);
        }
      }
      next();
    };
  }

  /**
   * Gets client IP address from request.
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

// Middleware for handling rate limit responses
export const handleRateLimitResponse = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Add rate limit headers to successful responses
    if (res.statusCode < 400) {
      res.setHeader('X-RateLimit-Limit', authConfig.rateLimit.loginAttemptsPerHour);
      res.setHeader('X-RateLimit-Remaining', '5'); // TODO: Calculate actual remaining
      res.setHeader('X-RateLimit-Reset', new Date(Date.now() + 3600000).toISOString());
    }
    
    next();
  };
};

// Export factory function
export const createRateLimitMiddleware = (rateLimiter: RateLimiter) => {
  return new RateLimitMiddleware(rateLimiter);
};
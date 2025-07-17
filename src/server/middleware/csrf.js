/**
 * CSRF (Cross-Site Request Forgery) protection middleware
 * Implements token-based CSRF protection for state-changing operations
 */

const crypto = require('crypto');

class CSRFProtection {
  constructor() {
    this.tokenSecret = process.env.CSRF_SECRET || crypto.randomBytes(32).toString('hex');
    this.tokenExpiry = 60 * 60 * 1000; // 1 hour
    this.exemptPaths = [
      '/api/auth/login',
      '/api/auth/register',
      '/health'
    ];
  }

  /**
   * Generate CSRF token for a session
   * @param {string} sessionId - Session identifier
   * @returns {string} CSRF token
   */
  generateToken(sessionId) {
    const timestamp = Date.now();
    const random = crypto.randomBytes(16).toString('hex');
    const payload = `${sessionId}:${timestamp}:${random}`;
    
    const hmac = crypto.createHmac('sha256', this.tokenSecret);
    hmac.update(payload);
    const signature = hmac.digest('hex');
    
    return `${payload}:${signature}`;
  }

  /**
   * Validate CSRF token
   * @param {string} token - CSRF token to validate
   * @param {string} sessionId - Session identifier
   * @returns {boolean} True if valid, false otherwise
   */
  validateToken(token, sessionId) {
    if (!token || !sessionId) {
      return false;
    }

    try {
      const parts = token.split(':');
      if (parts.length !== 4) {
        return false;
      }

      const [tokenSessionId, timestamp, random, signature] = parts;
      
      // Check if session matches
      if (tokenSessionId !== sessionId) {
        return false;
      }

      // Check if token hasn't expired
      const tokenTime = parseInt(timestamp);
      if (Date.now() - tokenTime > this.tokenExpiry) {
        return false;
      }

      // Verify signature
      const payload = `${tokenSessionId}:${timestamp}:${random}`;
      const hmac = crypto.createHmac('sha256', this.tokenSecret);
      hmac.update(payload);
      const expectedSignature = hmac.digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    } catch (error) {
      console.error('CSRF token validation error:', error);
      return false;
    }
  }

  /**
   * Express middleware for CSRF protection
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  middleware() {
    return (req, res, next) => {
      try {
        // Skip CSRF protection for exempt paths
        if (this.exemptPaths.some(path => req.path.startsWith(path))) {
          return next();
        }

        // Skip for GET, HEAD, OPTIONS requests (safe methods)
        if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
          return next();
        }

        // Skip for API-only endpoints without session (if using API keys)
        if (req.headers['x-api-key'] && !req.user) {
          return next();
        }

        // Require CSRF token for state-changing operations
        if (!req.user || !req.user.sessionId) {
          return res.status(401).json({ 
            message: 'Session required for CSRF protection' 
          });
        }

        // Get CSRF token from header or body
        const csrfToken = req.headers['x-csrf-token'] || 
                         req.body._csrf || 
                         req.query._csrf;

        if (!csrfToken) {
          return res.status(403).json({ 
            message: 'CSRF token required',
            details: 'Include X-CSRF-Token header or _csrf field'
          });
        }

        // Validate CSRF token
        if (!this.validateToken(csrfToken, req.user.sessionId)) {
          return res.status(403).json({ 
            message: 'Invalid or expired CSRF token' 
          });
        }

        next();
      } catch (error) {
        console.error('CSRF middleware error:', error);
        return res.status(500).json({ 
          message: 'CSRF validation failed' 
        });
      }
    };
  }

  /**
   * Generate CSRF token for client
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  generateTokenForClient(req, res) {
    if (!req.user || !req.user.sessionId) {
      return res.status(401).json({ 
        message: 'Session required to generate CSRF token' 
      });
    }

    const token = this.generateToken(req.user.sessionId);
    res.json({ csrfToken: token });
  }
}

// Create singleton instance
const csrfProtection = new CSRFProtection();

module.exports = {
  csrfProtection,
  csrfMiddleware: csrfProtection.middleware(),
  generateCSRFToken: (req, res) => csrfProtection.generateTokenForClient(req, res)
};
import * as jwt from 'jsonwebtoken';
import { JWTPayload, AuthConfig, Session } from './types';

/**
 * Manages JWT token generation, validation, and session handling.
 * Provides secure token creation with configurable expiration times.
 * Supports both standard and persistent ("secure ship computer") sessions.
 */
export class TokenService {
  private readonly config: AuthConfig['session'];
  
  constructor(config: AuthConfig['session']) {
    this.config = config;
  }

  /**
   * Generates a JWT token for user authentication.
   * @param {JWTPayload} payload - Token payload data
   * @param {boolean} persistent - Whether to create persistent token
   * @returns {string} Signed JWT token
   */
  public generateToken(payload: JWTPayload, persistent: boolean = false): string {
    const expiresIn = persistent 
      ? `${this.config.persistentExpiryDays}d`
      : `${this.config.defaultExpiryHours}h`;

    return jwt.sign(payload, this.config.jwtSecret, {
      expiresIn,
      issuer: 'spacecommand',
      audience: 'spacecommand-client'
    });
  }

  /**
   * Generates a refresh token for token renewal.
   * @param {string} userId - User ID for refresh token
   * @param {string} sessionId - Session ID to associate
   * @returns {string} Refresh token
   */
  public generateRefreshToken(userId: string, sessionId: string): string {
    const payload = {
      userId,
      sessionId,
      type: 'refresh'
    };

    return jwt.sign(payload, this.config.jwtSecret, {
      expiresIn: `${this.config.persistentExpiryDays + 7}d`, // Refresh tokens last longer
      issuer: 'spacecommand',
      audience: 'spacecommand-refresh'
    });
  }

  /**
   * Verifies and decodes a JWT token.
   * @param {string} token - JWT token to verify
   * @returns {JWTPayload | null} Decoded payload or null if invalid
   */
  public verifyToken(token: string): JWTPayload | null {
    try {
      const decoded = jwt.verify(token, this.config.jwtSecret, {
        issuer: 'spacecommand',
        audience: 'spacecommand-client'
      }) as JWTPayload;
      
      return decoded;
    } catch (error) {
      // Token is invalid or expired
      return null;
    }
  }

  /**
   * Verifies a refresh token.
   * @param {string} token - Refresh token to verify
   * @returns {object | null} Decoded refresh token data or null
   */
  public verifyRefreshToken(token: string): { userId: string; sessionId: string } | null {
    try {
      const decoded = jwt.verify(token, this.config.jwtSecret, {
        issuer: 'spacecommand',
        audience: 'spacecommand-refresh'
      }) as any;
      
      if (decoded.type !== 'refresh') {
        return null;
      }
      
      return {
        userId: decoded.userId,
        sessionId: decoded.sessionId
      };
    } catch {
      return null;
    }
  }

  /**
   * Checks if a token needs refresh based on expiry window.
   * @param {string} token - JWT token to check
   * @returns {boolean} True if token should be refreshed
   */
  public shouldRefreshToken(token: string): boolean {
    try {
      const decoded = jwt.decode(token) as JWTPayload;
      if (!decoded || !decoded.exp) return false;
      
      const now = Math.floor(Date.now() / 1000);
      const refreshWindow = this.config.refreshWindowMinutes * 60;
      
      // Refresh if token expires within the refresh window
      return (decoded.exp - now) <= refreshWindow;
    } catch {
      return false;
    }
  }

  /**
   * Extracts token from Authorization header.
   * @param {string} authHeader - Authorization header value
   * @returns {string | null} Extracted token or null
   */
  public extractTokenFromHeader(authHeader?: string): string | null {
    if (!authHeader) return null;
    
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }
    
    return parts[1];
  }

  /**
   * Creates session data for storage.
   * @param {string} userId - User ID
   * @param {string} token - JWT token
   * @param {boolean} persistent - Whether session is persistent
   * @param {string} ipAddress - Client IP address
   * @param {string} userAgent - Client user agent
   * @returns {Partial<Session>} Session data for database
   */
  public createSessionData(
    userId: string,
    token: string,
    persistent: boolean,
    ipAddress?: string,
    userAgent?: string
  ): Partial<Session> {
    const decoded = jwt.decode(token) as JWTPayload;
    const expiresAt = decoded?.exp 
      ? new Date(decoded.exp * 1000)
      : new Date(Date.now() + (persistent 
          ? this.config.persistentExpiryDays * 24 * 60 * 60 * 1000
          : this.config.defaultExpiryHours * 60 * 60 * 1000));

    return {
      id: crypto.randomUUID(),
      userId,
      tokenHash: this.hashToken(token),
      expiresAt,
      isPersistent: persistent,
      ipAddress,
      userAgent,
      lastActivity: new Date(),
      createdAt: new Date()
    };
  }

  /**
   * Hashes a token for secure storage.
   * @param {string} token - Token to hash
   * @returns {string} Hashed token
   */
  private hashToken(token: string): string {
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const hashBuffer = crypto.subtle.digestSync('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Generates token expiration date.
   * @param {boolean} persistent - Whether to use persistent expiry
   * @returns {Date} Expiration date
   */
  public getTokenExpiration(persistent: boolean): Date {
    const ms = persistent
      ? this.config.persistentExpiryDays * 24 * 60 * 60 * 1000
      : this.config.defaultExpiryHours * 60 * 60 * 1000;
    
    return new Date(Date.now() + ms);
  }

  /**
   * Validates session is still active.
   * @param {Session} session - Session to validate
   * @returns {boolean} True if session is valid
   */
  public isSessionValid(session: Session): boolean {
    const now = new Date();
    return session.expiresAt > now;
  }

  /**
   * Creates a token payload from user data.
   * @param {string} userId - User ID
   * @param {string} email - User email
   * @param {string} username - Username
   * @param {string} sessionId - Session ID
   * @returns {JWTPayload} Token payload
   */
  public createTokenPayload(
    userId: string,
    email: string,
    username: string,
    sessionId: string
  ): JWTPayload {
    return {
      userId,
      email,
      username,
      sessionId
    };
  }
}
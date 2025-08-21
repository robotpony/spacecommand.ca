import { BaseRepository } from './BaseRepository';
import { RateLimitInfo } from '@core/auth/types';

/**
 * Repository for managing rate limiting data.
 * Tracks login attempts, password resets, and registration attempts.
 * Supports IP-based and user-based rate limiting.
 */
export class RateLimitRepository extends BaseRepository<RateLimitInfo> {
  constructor(db: any) {
    super(db, 'user_rate_limits');
  }

  /**
   * Gets rate limit info for identifier (email or user ID).
   * @param {string} identifier - Email or user ID
   * @param {string} ipAddress - Optional IP address
   * @returns {Promise<RateLimitInfo | null>}
   */
  public async getRateLimits(
    identifier: string,
    ipAddress?: string
  ): Promise<RateLimitInfo | null> {
    // Try to find by user ID first
    let query = 'SELECT * FROM user_rate_limits WHERE user_id = $1';
    let result = await this.db.query(query, [identifier]);
    
    if (result.rows.length === 0) {
      // Try to find by email through users table
      query = `
        SELECT r.* 
        FROM user_rate_limits r
        JOIN users u ON r.user_id = u.id
        WHERE LOWER(u.email) = LOWER($1)
      `;
      result = await this.db.query(query, [identifier]);
    }
    
    if (result.rows.length === 0) return null;
    
    return this.mapRateLimitInfo(result.rows[0]);
  }

  /**
   * Updates login attempt counter.
   * @param {string} identifier - Email or user ID
   * @param {number} attempts - New attempt count
   * @param {Date} lastAttempt - Timestamp of last attempt
   * @param {Date} lockedUntil - Optional lockout expiration
   * @returns {Promise<void>}
   */
  public async updateLoginAttempts(
    identifier: string,
    attempts: number,
    lastAttempt: Date,
    lockedUntil?: Date
  ): Promise<void> {
    // Get user ID if email provided
    const userId = await this.resolveUserId(identifier);
    if (!userId) return;

    const query = `
      INSERT INTO user_rate_limits (user_id, login_attempts, last_login_attempt, locked_until)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id) DO UPDATE
      SET login_attempts = $2,
          last_login_attempt = $3,
          locked_until = $4
    `;
    
    await this.db.query(query, [userId, attempts, lastAttempt, lockedUntil]);
  }

  /**
   * Resets login attempts.
   * @param {string} identifier - Email or user ID
   * @returns {Promise<void>}
   */
  public async resetLoginAttempts(identifier: string): Promise<void> {
    const userId = await this.resolveUserId(identifier);
    if (!userId) return;

    const query = `
      UPDATE user_rate_limits 
      SET login_attempts = 0, 
          last_login_attempt = NULL,
          locked_until = NULL
      WHERE user_id = $1
    `;
    
    await this.db.query(query, [userId]);
  }

  /**
   * Updates password reset counter.
   * @param {string} email - User email
   * @param {number} resets - New reset count
   * @param {Date} lastReset - Timestamp of last reset
   * @returns {Promise<void>}
   */
  public async updatePasswordResets(
    email: string,
    resets: number,
    lastReset: Date
  ): Promise<void> {
    const userId = await this.resolveUserId(email);
    if (!userId) return;

    const query = `
      INSERT INTO user_rate_limits (user_id, password_resets, last_password_reset)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id) DO UPDATE
      SET password_resets = $2,
          last_password_reset = $3
    `;
    
    await this.db.query(query, [userId, resets, lastReset]);
  }

  /**
   * Resets password reset counter.
   * @param {string} email - User email
   * @returns {Promise<void>}
   */
  public async resetPasswordResets(email: string): Promise<void> {
    const userId = await this.resolveUserId(email);
    if (!userId) return;

    const query = `
      UPDATE user_rate_limits 
      SET password_resets = 0, 
          last_password_reset = NULL
      WHERE user_id = $1
    `;
    
    await this.db.query(query, [userId]);
  }

  /**
   * Tracks an attempt by IP address.
   * @param {string} ipAddress - IP address
   * @param {string} attemptType - Type of attempt
   * @returns {Promise<void>}
   */
  public async trackIpAttempt(
    ipAddress: string,
    attemptType: 'login' | 'password_reset' | 'registration'
  ): Promise<void> {
    // Store IP-based attempts in a separate tracking table or log
    // For now, we'll use session table to track IP activity
    const query = `
      INSERT INTO user_sessions (id, user_id, token_hash, expires_at, ip_address, user_agent, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
    `;
    
    // Create a tracking record with special user_id for IP tracking
    const trackingId = crypto.randomUUID();
    const trackingUserId = `ip_tracking_${attemptType}`;
    const tokenHash = `${attemptType}_${ipAddress}_${Date.now()}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    try {
      await this.db.query(query, [
        trackingId,
        trackingUserId,
        tokenHash,
        expiresAt,
        ipAddress,
        attemptType
      ]);
    } catch (error) {
      // Ignore errors for IP tracking (non-critical)
      console.error('IP tracking error:', error);
    }
  }

  /**
   * Counts recent registrations from an IP.
   * @param {string} ipAddress - IP address
   * @param {number} hours - Hours to look back
   * @returns {Promise<number>} Registration count
   */
  public async countRecentRegistrations(
    ipAddress: string,
    hours: number
  ): Promise<number> {
    const query = `
      SELECT COUNT(*) as count
      FROM user_sessions
      WHERE ip_address = $1
        AND user_agent = 'registration'
        AND created_at > NOW() - INTERVAL '${hours} hours'
    `;
    
    const result = await this.db.query(query, [ipAddress]);
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Clears lockout for a user.
   * @param {string} userId - User ID
   * @returns {Promise<void>}
   */
  public async clearLockout(userId: string): Promise<void> {
    const query = `
      UPDATE user_rate_limits 
      SET locked_until = NULL,
          login_attempts = 0
      WHERE user_id = $1
    `;
    
    await this.db.query(query, [userId]);
  }

  /**
   * Cleans up old rate limit records.
   * @param {number} hours - Hours threshold
   * @returns {Promise<number>} Number of records deleted
   */
  public async cleanupOldRecords(hours: number): Promise<number> {
    // Clean up rate limit records with no recent activity
    const query = `
      DELETE FROM user_rate_limits
      WHERE (last_login_attempt IS NULL OR last_login_attempt < NOW() - INTERVAL '${hours} hours')
        AND (last_password_reset IS NULL OR last_password_reset < NOW() - INTERVAL '${hours} hours')
        AND (last_registration_attempt IS NULL OR last_registration_attempt < NOW() - INTERVAL '${hours} hours')
        AND (locked_until IS NULL OR locked_until < NOW())
    `;
    
    const result = await this.db.query(query);
    
    // Also clean up IP tracking records
    const ipCleanupQuery = `
      DELETE FROM user_sessions
      WHERE user_id LIKE 'ip_tracking_%'
        AND created_at < NOW() - INTERVAL '${hours} hours'
    `;
    
    await this.db.query(ipCleanupQuery);
    
    return result.rowCount;
  }

  /**
   * Gets all rate limit info for a user.
   * @param {string} userId - User ID
   * @returns {Promise<RateLimitInfo | null>}
   */
  public async getByUserId(userId: string): Promise<RateLimitInfo | null> {
    const query = 'SELECT * FROM user_rate_limits WHERE user_id = $1';
    const result = await this.db.query(query, [userId]);
    
    if (result.rows.length === 0) return null;
    
    return this.mapRateLimitInfo(result.rows[0]);
  }

  /**
   * Creates or updates rate limit record.
   * @param {string} userId - User ID
   * @param {Partial<RateLimitInfo>} data - Rate limit data
   * @returns {Promise<void>}
   */
  public async upsert(userId: string, data: Partial<RateLimitInfo>): Promise<void> {
    const query = `
      INSERT INTO user_rate_limits (
        user_id, 
        login_attempts, 
        last_login_attempt,
        password_resets,
        last_password_reset,
        registration_attempts,
        last_registration_attempt,
        locked_until
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (user_id) DO UPDATE
      SET login_attempts = COALESCE($2, user_rate_limits.login_attempts),
          last_login_attempt = COALESCE($3, user_rate_limits.last_login_attempt),
          password_resets = COALESCE($4, user_rate_limits.password_resets),
          last_password_reset = COALESCE($5, user_rate_limits.last_password_reset),
          registration_attempts = COALESCE($6, user_rate_limits.registration_attempts),
          last_registration_attempt = COALESCE($7, user_rate_limits.last_registration_attempt),
          locked_until = COALESCE($8, user_rate_limits.locked_until)
    `;
    
    await this.db.query(query, [
      userId,
      data.loginAttempts || 0,
      data.lastLoginAttempt,
      data.passwordResets || 0,
      data.lastPasswordReset,
      data.registrationAttempts || 0,
      data.lastRegistrationAttempt,
      data.lockedUntil
    ]);
  }

  /**
   * Resolves email to user ID.
   * @private
   */
  private async resolveUserId(identifier: string): Promise<string | null> {
    // Check if already a UUID (user ID)
    if (identifier.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return identifier;
    }
    
    // Resolve email to user ID
    const query = 'SELECT id FROM users WHERE LOWER(email) = LOWER($1)';
    const result = await this.db.query(query, [identifier]);
    
    if (result.rows.length === 0) return null;
    
    return result.rows[0].id;
  }

  /**
   * Maps database row to RateLimitInfo.
   * @private
   */
  private mapRateLimitInfo(row: any): RateLimitInfo {
    return {
      userId: row.user_id,
      loginAttempts: row.login_attempts || 0,
      lastLoginAttempt: row.last_login_attempt,
      passwordResets: row.password_resets || 0,
      lastPasswordReset: row.last_password_reset,
      registrationAttempts: row.registration_attempts || 0,
      lastRegistrationAttempt: row.last_registration_attempt,
      lockedUntil: row.locked_until
    };
  }
}
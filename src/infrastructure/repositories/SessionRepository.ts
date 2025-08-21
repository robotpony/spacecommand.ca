import { BaseRepository } from './BaseRepository';
import { Session } from '@core/auth/types';

/**
 * Repository for managing user sessions and JWT tokens.
 * Handles session creation, validation, refresh, and cleanup.
 * Supports both standard and persistent ("secure ship computer") sessions.
 */
export class SessionRepository extends BaseRepository<Session> {
  constructor(db: any) {
    super(db, 'user_sessions');
  }

  /**
   * Creates a new session.
   * @param {Session} session - Session data
   * @returns {Promise<Session>} Created session
   */
  public async create(session: Session): Promise<Session> {
    const query = `
      INSERT INTO user_sessions 
      (id, user_id, token_hash, expires_at, is_persistent, ip_address, user_agent, last_activity, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    
    const values = [
      session.id,
      session.userId,
      session.tokenHash,
      session.expiresAt,
      session.isPersistent,
      session.ipAddress,
      session.userAgent,
      session.lastActivity,
      session.createdAt
    ];
    
    const result = await this.db.query(query, values);
    return this.mapSession(result.rows[0]);
  }

  /**
   * Finds session by ID.
   * @param {string} id - Session ID
   * @returns {Promise<Session | null>} Session or null
   */
  public async findById(id: string): Promise<Session | null> {
    const query = 'SELECT * FROM user_sessions WHERE id = $1';
    const result = await this.db.query(query, [id]);
    
    if (result.rows.length === 0) return null;
    return this.mapSession(result.rows[0]);
  }

  /**
   * Finds session by token hash.
   * @param {string} tokenHash - Hashed token
   * @returns {Promise<Session | null>} Session or null
   */
  public async findByTokenHash(tokenHash: string): Promise<Session | null> {
    const query = 'SELECT * FROM user_sessions WHERE token_hash = $1';
    const result = await this.db.query(query, [tokenHash]);
    
    if (result.rows.length === 0) return null;
    return this.mapSession(result.rows[0]);
  }

  /**
   * Finds all active sessions for a user.
   * @param {string} userId - User ID
   * @returns {Promise<Session[]>} Array of active sessions
   */
  public async findActiveByUserId(userId: string): Promise<Session[]> {
    const query = `
      SELECT * FROM user_sessions 
      WHERE user_id = $1 AND expires_at > NOW()
      ORDER BY created_at DESC
    `;
    
    const result = await this.db.query(query, [userId]);
    return result.rows.map(row => this.mapSession(row));
  }

  /**
   * Updates session last activity timestamp.
   * @param {string} id - Session ID
   * @returns {Promise<void>}
   */
  public async updateLastActivity(id: string): Promise<void> {
    const query = `
      UPDATE user_sessions 
      SET last_activity = NOW() 
      WHERE id = $1
    `;
    
    await this.db.query(query, [id]);
  }

  /**
   * Extends session expiration time.
   * @param {string} id - Session ID
   * @param {Date} newExpiry - New expiration date
   * @returns {Promise<void>}
   */
  public async extendSession(id: string, newExpiry: Date): Promise<void> {
    const query = `
      UPDATE user_sessions 
      SET expires_at = $2, last_activity = NOW() 
      WHERE id = $1
    `;
    
    await this.db.query(query, [id, newExpiry]);
  }

  /**
   * Deletes a specific session.
   * @param {string} id - Session ID
   * @returns {Promise<boolean>} True if deleted
   */
  public async deleteBySessionId(id: string): Promise<boolean> {
    const query = 'DELETE FROM user_sessions WHERE id = $1';
    const result = await this.db.query(query, [id]);
    return result.rowCount > 0;
  }

  /**
   * Deletes all sessions for a user.
   * @param {string} userId - User ID
   * @returns {Promise<number>} Number of sessions deleted
   */
  public async deleteAllUserSessions(userId: string): Promise<number> {
    const query = 'DELETE FROM user_sessions WHERE user_id = $1';
    const result = await this.db.query(query, [userId]);
    return result.rowCount;
  }

  /**
   * Deletes expired sessions.
   * @returns {Promise<number>} Number of sessions deleted
   */
  public async deleteExpiredSessions(): Promise<number> {
    const query = 'DELETE FROM user_sessions WHERE expires_at < NOW()';
    const result = await this.db.query(query);
    return result.rowCount;
  }

  /**
   * Finds sessions by IP address.
   * @param {string} ipAddress - IP address
   * @param {number} hours - Hours to look back
   * @returns {Promise<Session[]>} Sessions from IP
   */
  public async findByIpAddress(
    ipAddress: string,
    hours: number = 24
  ): Promise<Session[]> {
    const query = `
      SELECT * FROM user_sessions 
      WHERE ip_address = $1 
        AND created_at > NOW() - INTERVAL '${hours} hours'
      ORDER BY created_at DESC
    `;
    
    const result = await this.db.query(query, [ipAddress]);
    return result.rows.map(row => this.mapSession(row));
  }

  /**
   * Counts active sessions for a user.
   * @param {string} userId - User ID
   * @returns {Promise<number>} Active session count
   */
  public async countActiveSessions(userId: string): Promise<number> {
    const query = `
      SELECT COUNT(*) as count 
      FROM user_sessions 
      WHERE user_id = $1 AND expires_at > NOW()
    `;
    
    const result = await this.db.query(query, [userId]);
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Finds sessions that need refresh.
   * @param {number} refreshWindowMinutes - Refresh window in minutes
   * @returns {Promise<Session[]>} Sessions needing refresh
   */
  public async findSessionsNeedingRefresh(
    refreshWindowMinutes: number
  ): Promise<Session[]> {
    const query = `
      SELECT * FROM user_sessions 
      WHERE expires_at > NOW() 
        AND expires_at < NOW() + INTERVAL '${refreshWindowMinutes} minutes'
        AND is_persistent = true
      ORDER BY expires_at ASC
    `;
    
    const result = await this.db.query(query);
    return result.rows.map(row => this.mapSession(row));
  }

  /**
   * Gets session statistics for a user.
   * @param {string} userId - User ID
   * @returns {Promise<object>} Session statistics
   */
  public async getUserSessionStats(userId: string): Promise<{
    totalSessions: number;
    activeSessions: number;
    persistentSessions: number;
    lastLogin: Date | null;
  }> {
    const query = `
      SELECT 
        COUNT(*) as total_sessions,
        COUNT(CASE WHEN expires_at > NOW() THEN 1 END) as active_sessions,
        COUNT(CASE WHEN is_persistent = true AND expires_at > NOW() THEN 1 END) as persistent_sessions,
        MAX(created_at) as last_login
      FROM user_sessions
      WHERE user_id = $1
    `;
    
    const result = await this.db.query(query, [userId]);
    const row = result.rows[0];
    
    return {
      totalSessions: parseInt(row.total_sessions, 10),
      activeSessions: parseInt(row.active_sessions, 10),
      persistentSessions: parseInt(row.persistent_sessions, 10),
      lastLogin: row.last_login
    };
  }

  /**
   * Invalidates sessions by user agent pattern.
   * @param {string} userId - User ID
   * @param {string} userAgentPattern - Pattern to match
   * @returns {Promise<number>} Number of sessions invalidated
   */
  public async invalidateByUserAgent(
    userId: string,
    userAgentPattern: string
  ): Promise<number> {
    const query = `
      DELETE FROM user_sessions 
      WHERE user_id = $1 AND user_agent LIKE $2
    `;
    
    const result = await this.db.query(query, [userId, `%${userAgentPattern}%`]);
    return result.rowCount;
  }

  /**
   * Maps database row to Session object.
   * @private
   */
  private mapSession(row: any): Session {
    return {
      id: row.id,
      userId: row.user_id,
      tokenHash: row.token_hash,
      expiresAt: row.expires_at,
      isPersistent: row.is_persistent,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      lastActivity: row.last_activity,
      createdAt: row.created_at
    };
  }
}
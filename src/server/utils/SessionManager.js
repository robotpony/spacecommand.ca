/**
 * Session manager using Redis for authentication and session handling
 * Manages player sessions with automatic cleanup and validation
 */

const crypto = require('crypto');
const database = require('../config/database');

class SessionManager {
  constructor() {
    this.redis = null;
    this.sessionDuration = 24 * 60 * 60 * 1000; // 24 hours
    this.cleanupInterval = 60 * 60 * 1000; // 1 hour
  }

  /**
   * Initialize session manager with Redis connection
   */
  async initialize() {
    this.redis = database.getRedisClient();
    
    // Start cleanup interval
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, this.cleanupInterval);
  }

  /**
   * Generate a secure session token
   * @returns {string} Random session token
   */
  generateToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Create a new session for a player
   * @param {string} playerId - Player ID
   * @param {Object} sessionData - Additional session data
   * @returns {Promise<string>} Session token
   */
  async createSession(playerId, sessionData = {}) {
    const token = this.generateToken();
    const expiresAt = new Date(Date.now() + this.sessionDuration);
    
    const session = {
      playerId,
      token,
      expiresAt: expiresAt.toISOString(),
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      ...sessionData
    };

    // Store in Redis with expiration
    const sessionKey = `session:${token}`;
    await this.redis.setex(
      sessionKey,
      Math.floor(this.sessionDuration / 1000),
      JSON.stringify(session)
    );

    // Store in database for persistence
    await database.query(
      'INSERT INTO game_sessions (player_id, session_token, expires_at) VALUES ($1, $2, $3)',
      [playerId, token, expiresAt]
    );

    // Track player as online
    await this.setPlayerOnline(playerId, true);

    return token;
  }

  /**
   * Validate and retrieve session data
   * @param {string} token - Session token
   * @returns {Promise<Object|null>} Session data or null if invalid
   */
  async validateSession(token) {
    if (!token) return null;

    const sessionKey = `session:${token}`;
    const sessionData = await this.redis.get(sessionKey);

    if (!sessionData) {
      // Try to restore from database
      const dbSession = await this.restoreSessionFromDatabase(token);
      if (!dbSession) return null;
      
      // Re-cache in Redis
      await this.redis.setex(
        sessionKey,
        Math.floor(this.sessionDuration / 1000),
        JSON.stringify(dbSession)
      );
      
      return dbSession;
    }

    const session = JSON.parse(sessionData);
    const now = new Date();
    const expiresAt = new Date(session.expiresAt);

    if (now > expiresAt) {
      await this.destroySession(token);
      return null;
    }

    // Update last activity
    session.lastActivity = now.toISOString();
    await this.redis.setex(
      sessionKey,
      Math.floor(this.sessionDuration / 1000),
      JSON.stringify(session)
    );

    return session;
  }

  /**
   * Extend session expiration
   * @param {string} token - Session token
   * @returns {Promise<boolean>} True if extended successfully
   */
  async extendSession(token) {
    const session = await this.validateSession(token);
    if (!session) return false;

    const newExpiresAt = new Date(Date.now() + this.sessionDuration);
    session.expiresAt = newExpiresAt.toISOString();

    const sessionKey = `session:${token}`;
    await this.redis.setex(
      sessionKey,
      Math.floor(this.sessionDuration / 1000),
      JSON.stringify(session)
    );

    // Update database
    await database.query(
      'UPDATE game_sessions SET expires_at = $1 WHERE session_token = $2',
      [newExpiresAt, token]
    );

    return true;
  }

  /**
   * Destroy a session
   * @param {string} token - Session token
   * @returns {Promise<boolean>} True if destroyed successfully
   */
  async destroySession(token) {
    const sessionKey = `session:${token}`;
    
    // Get session data before destroying
    const sessionData = await this.redis.get(sessionKey);
    if (sessionData) {
      const session = JSON.parse(sessionData);
      await this.setPlayerOnline(session.playerId, false);
    }

    // Remove from Redis
    await this.redis.del(sessionKey);

    // Remove from database
    await database.query(
      'DELETE FROM game_sessions WHERE session_token = $1',
      [token]
    );

    return true;
  }

  /**
   * Destroy all sessions for a player
   * @param {string} playerId - Player ID
   * @returns {Promise<number>} Number of sessions destroyed
   */
  async destroyPlayerSessions(playerId) {
    // Get all sessions for player from database
    const result = await database.query(
      'SELECT session_token FROM game_sessions WHERE player_id = $1',
      [playerId]
    );

    let destroyed = 0;
    for (const row of result.rows) {
      await this.destroySession(row.session_token);
      destroyed++;
    }

    return destroyed;
  }

  /**
   * Set player online status
   * @param {string} playerId - Player ID
   * @param {boolean} isOnline - Online status
   * @returns {Promise<void>}
   */
  async setPlayerOnline(playerId, isOnline) {
    const onlineKey = `online:${playerId}`;
    
    if (isOnline) {
      const onlineData = {
        playerId,
        timestamp: new Date().toISOString(),
        lastSeen: new Date().toISOString()
      };
      
      await this.redis.setex(onlineKey, 300, JSON.stringify(onlineData)); // 5 minutes
    } else {
      await this.redis.del(onlineKey);
    }

    // Update database
    await database.query(
      'UPDATE players SET is_online = $1, last_login = CURRENT_TIMESTAMP WHERE id = $2',
      [isOnline, playerId]
    );
  }

  /**
   * Get online players
   * @returns {Promise<Array>} List of online player IDs
   */
  async getOnlinePlayers() {
    const keys = await this.redis.keys('online:*');
    const onlinePlayers = [];

    for (const key of keys) {
      const data = await this.redis.get(key);
      if (data) {
        const playerData = JSON.parse(data);
        onlinePlayers.push(playerData.playerId);
      }
    }

    return onlinePlayers;
  }

  /**
   * Check if player is online
   * @param {string} playerId - Player ID
   * @returns {Promise<boolean>} True if online
   */
  async isPlayerOnline(playerId) {
    const onlineKey = `online:${playerId}`;
    const data = await this.redis.get(onlineKey);
    return data !== null;
  }

  /**
   * Get session statistics
   * @returns {Promise<Object>} Session statistics
   */
  async getSessionStats() {
    const sessionKeys = await this.redis.keys('session:*');
    const onlineKeys = await this.redis.keys('online:*');
    
    const dbStats = await database.query(
      'SELECT COUNT(*) as total_sessions FROM game_sessions WHERE expires_at > CURRENT_TIMESTAMP'
    );

    return {
      activeSessions: sessionKeys.length,
      onlinePlayers: onlineKeys.length,
      totalSessions: parseInt(dbStats.rows[0].total_sessions),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Clean up expired sessions
   * @returns {Promise<number>} Number of cleaned sessions
   */
  async cleanupExpiredSessions() {
    // Clean up database
    const result = await database.query(
      'DELETE FROM game_sessions WHERE expires_at < CURRENT_TIMESTAMP'
    );

    // Clean up Redis (Redis handles expiration automatically, but we'll double-check)
    const sessionKeys = await this.redis.keys('session:*');
    let cleaned = 0;

    for (const key of sessionKeys) {
      const data = await this.redis.get(key);
      if (data) {
        const session = JSON.parse(data);
        if (new Date() > new Date(session.expiresAt)) {
          await this.redis.del(key);
          cleaned++;
        }
      }
    }

    if (result.rowCount > 0 || cleaned > 0) {
      console.log(`Cleaned up ${result.rowCount} database sessions and ${cleaned} Redis sessions`);
    }

    return result.rowCount + cleaned;
  }

  /**
   * Restore session from database to Redis
   * @param {string} token - Session token
   * @returns {Promise<Object|null>} Session data or null
   * @private
   */
  async restoreSessionFromDatabase(token) {
    const result = await database.query(
      'SELECT * FROM game_sessions WHERE session_token = $1 AND expires_at > CURRENT_TIMESTAMP',
      [token]
    );

    if (result.rows.length === 0) return null;

    const dbSession = result.rows[0];
    return {
      playerId: dbSession.player_id,
      token: dbSession.session_token,
      expiresAt: dbSession.expires_at.toISOString(),
      createdAt: dbSession.created_at.toISOString(),
      lastActivity: new Date().toISOString()
    };
  }
}

// Create singleton instance
const sessionManager = new SessionManager();

module.exports = sessionManager;
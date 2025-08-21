import { BaseRepository } from './BaseRepository';
import { User } from '@core/auth/User';
import { 
  EmailVerification, 
  PasswordReset, 
  InviteCode, 
  RegistrationApproval,
  UniversePlayer 
} from '@core/auth/types';

/**
 * Repository for user account management and authentication data.
 * Handles user CRUD operations, email verification, password resets,
 * and multi-universe player associations.
 */
export class UserRepository extends BaseRepository<User> {
  constructor(db: any) {
    super(db, 'users');
  }

  /**
   * Finds user by email address.
   * @param {string} email - Email to search for
   * @returns {Promise<User | null>} User or null if not found
   */
  public async findByEmail(email: string): Promise<User | null> {
    const query = `
      SELECT u.*, 
        json_build_object(
          'display_name', p.display_name,
          'bio', p.bio,
          'avatar_url', p.avatar_url,
          'total_play_time', p.total_play_time,
          'favorite_faction', p.favorite_faction,
          'achievements', p.achievements
        ) as profile
      FROM users u
      LEFT JOIN user_profiles p ON u.id = p.user_id
      WHERE LOWER(u.email) = LOWER($1)
    `;
    
    const result = await this.db.query(query, [email]);
    if (result.rows.length === 0) return null;
    
    return User.fromDatabase(result.rows[0]);
  }

  /**
   * Finds user by username.
   * @param {string} username - Username to search for
   * @returns {Promise<User | null>} User or null if not found
   */
  public async findByUsername(username: string): Promise<User | null> {
    const query = `
      SELECT u.*, 
        json_build_object(
          'display_name', p.display_name,
          'bio', p.bio,
          'avatar_url', p.avatar_url,
          'total_play_time', p.total_play_time,
          'favorite_faction', p.favorite_faction,
          'achievements', p.achievements
        ) as profile
      FROM users u
      LEFT JOIN user_profiles p ON u.id = p.user_id
      WHERE LOWER(u.username) = LOWER($1)
    `;
    
    const result = await this.db.query(query, [username]);
    if (result.rows.length === 0) return null;
    
    return User.fromDatabase(result.rows[0]);
  }

  /**
   * Finds user by ID with profile and universes.
   * @param {string} id - User ID
   * @returns {Promise<User | null>} User with full data or null
   */
  public async findById(id: string): Promise<User | null> {
    const query = `
      SELECT u.*, 
        json_build_object(
          'display_name', p.display_name,
          'bio', p.bio,
          'avatar_url', p.avatar_url,
          'total_play_time', p.total_play_time,
          'favorite_faction', p.favorite_faction,
          'achievements', p.achievements
        ) as profile
      FROM users u
      LEFT JOIN user_profiles p ON u.id = p.user_id
      WHERE u.id = $1
    `;
    
    const result = await this.db.query(query, [id]);
    if (result.rows.length === 0) return null;
    
    const user = User.fromDatabase(result.rows[0]);
    
    // Load universe associations
    const universesQuery = `
      SELECT universe_id, user_id, player_id, joined_at, last_played, is_active
      FROM universe_players
      WHERE user_id = $1
      ORDER BY last_played DESC
    `;
    
    const universesResult = await this.db.query(universesQuery, [id]);
    if (universesResult.rows.length > 0) {
      user.universes = universesResult.rows.map(row => ({
        universeId: row.universe_id,
        userId: row.user_id,
        playerId: row.player_id,
        joinedAt: row.joined_at,
        lastPlayed: row.last_played,
        isActive: row.is_active
      }));
    }
    
    return user;
  }

  /**
   * Creates a new user account.
   * @param {User} user - User to create
   * @returns {Promise<User>} Created user
   */
  public async create(user: User): Promise<User> {
    const query = `
      INSERT INTO users (id, email, username, password_hash, email_verified, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const values = [
      user.id,
      user.email.toLowerCase(),
      user.username,
      user.passwordHash,
      user.emailVerified,
      user.createdAt,
      user.updatedAt
    ];
    
    const result = await this.db.query(query, values);
    
    // Create empty profile
    await this.db.query(
      'INSERT INTO user_profiles (user_id) VALUES ($1)',
      [user.id]
    );
    
    return User.fromDatabase(result.rows[0]);
  }

  /**
   * Updates user account data.
   * @param {User} user - User with updated data
   * @returns {Promise<User>} Updated user
   */
  public async update(user: User): Promise<User> {
    const query = `
      UPDATE users 
      SET email = $2, 
          username = $3, 
          password_hash = $4,
          email_verified = $5,
          email_verified_at = $6,
          updated_at = $7
      WHERE id = $1
      RETURNING *
    `;
    
    const values = [
      user.id,
      user.email.toLowerCase(),
      user.username,
      user.passwordHash,
      user.emailVerified,
      user.emailVerifiedAt,
      user.updatedAt
    ];
    
    const result = await this.db.query(query, values);
    
    // Update profile if exists
    if (user.profile) {
      await this.updateProfile(user.id, user.profile);
    }
    
    return User.fromDatabase(result.rows[0]);
  }

  /**
   * Updates user profile data.
   * @param {string} userId - User ID
   * @param {any} profile - Profile data
   * @returns {Promise<void>}
   */
  private async updateProfile(userId: string, profile: any): Promise<void> {
    const query = `
      UPDATE user_profiles 
      SET display_name = $2,
          bio = $3,
          avatar_url = $4,
          total_play_time = $5,
          favorite_faction = $6,
          achievements = $7,
          updated_at = NOW()
      WHERE user_id = $1
    `;
    
    await this.db.query(query, [
      userId,
      profile.displayName,
      profile.bio,
      profile.avatarUrl,
      profile.totalPlayTime,
      profile.favoriteFaction,
      JSON.stringify(profile.achievements || [])
    ]);
  }

  /**
   * Creates email verification record.
   * @param {Partial<EmailVerification>} data - Verification data
   * @returns {Promise<void>}
   */
  public async createEmailVerification(data: Partial<EmailVerification>): Promise<void> {
    const query = `
      INSERT INTO email_verifications (id, user_id, token, expires_at, created_at)
      VALUES ($1, $2, $3, $4, $5)
    `;
    
    await this.db.query(query, [
      data.id,
      data.userId,
      data.token,
      data.expiresAt,
      data.createdAt
    ]);
  }

  /**
   * Finds email verification by token.
   * @param {string} token - Verification token (unhashed)
   * @returns {Promise<EmailVerification | null>}
   */
  public async findEmailVerification(token: string): Promise<EmailVerification | null> {
    // Hash the token for lookup
    const hashedToken = this.hashToken(token);
    
    const query = `
      SELECT * FROM email_verifications
      WHERE token = $1 AND verified_at IS NULL
    `;
    
    const result = await this.db.query(query, [hashedToken]);
    if (result.rows.length === 0) return null;
    
    return this.mapEmailVerification(result.rows[0]);
  }

  /**
   * Marks email verification as used.
   * @param {string} id - Verification ID
   * @returns {Promise<void>}
   */
  public async markEmailVerified(id: string): Promise<void> {
    await this.db.query(
      'UPDATE email_verifications SET verified_at = NOW() WHERE id = $1',
      [id]
    );
  }

  /**
   * Creates password reset record.
   * @param {Partial<PasswordReset>} data - Reset data
   * @returns {Promise<void>}
   */
  public async createPasswordReset(data: Partial<PasswordReset>): Promise<void> {
    const query = `
      INSERT INTO password_resets (id, user_id, token, expires_at, ip_address, created_at)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;
    
    await this.db.query(query, [
      data.id,
      data.userId,
      data.token,
      data.expiresAt,
      data.ipAddress,
      data.createdAt
    ]);
  }

  /**
   * Finds password reset by token.
   * @param {string} hashedToken - Hashed reset token
   * @returns {Promise<PasswordReset | null>}
   */
  public async findPasswordReset(hashedToken: string): Promise<PasswordReset | null> {
    const query = `
      SELECT * FROM password_resets
      WHERE token = $1 AND used_at IS NULL
    `;
    
    const result = await this.db.query(query, [hashedToken]);
    if (result.rows.length === 0) return null;
    
    return this.mapPasswordReset(result.rows[0]);
  }

  /**
   * Marks password reset as used.
   * @param {string} id - Reset ID
   * @returns {Promise<void>}
   */
  public async markPasswordResetUsed(id: string): Promise<void> {
    await this.db.query(
      'UPDATE password_resets SET used_at = NOW() WHERE id = $1',
      [id]
    );
  }

  /**
   * Finds invite code by code string.
   * @param {string} code - Invite code
   * @returns {Promise<InviteCode | null>}
   */
  public async findInviteCode(code: string): Promise<InviteCode | null> {
    const query = 'SELECT * FROM invite_codes WHERE code = $1';
    const result = await this.db.query(query, [code.toUpperCase()]);
    
    if (result.rows.length === 0) return null;
    
    return this.mapInviteCode(result.rows[0]);
  }

  /**
   * Creates registration approval request.
   * @param {any} data - Approval request data
   * @returns {Promise<void>}
   */
  public async createRegistrationApproval(data: any): Promise<void> {
    const query = `
      INSERT INTO registration_approvals 
      (id, email, username, application_text, ip_address, requested_at)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;
    
    await this.db.query(query, [
      crypto.randomUUID(),
      data.email,
      data.username,
      data.applicationText,
      data.ipAddress,
      data.requestedAt
    ]);
  }

  /**
   * Adds user to universe.
   * @param {string} userId - User ID
   * @param {string} universeId - Universe ID
   * @param {string} playerId - Player ID
   * @returns {Promise<void>}
   */
  public async addToUniverse(
    userId: string,
    universeId: string,
    playerId: string
  ): Promise<void> {
    const query = `
      INSERT INTO universe_players (universe_id, user_id, player_id)
      VALUES ($1, $2, $3)
      ON CONFLICT (universe_id, user_id) 
      DO UPDATE SET player_id = $3, is_active = true, last_played = NOW()
    `;
    
    await this.db.query(query, [universeId, userId, playerId]);
  }

  // Helper methods for mapping database rows
  private mapEmailVerification(row: any): EmailVerification {
    return {
      id: row.id,
      userId: row.user_id,
      token: row.token,
      expiresAt: row.expires_at,
      verifiedAt: row.verified_at,
      createdAt: row.created_at
    };
  }

  private mapPasswordReset(row: any): PasswordReset {
    return {
      id: row.id,
      userId: row.user_id,
      token: row.token,
      expiresAt: row.expires_at,
      usedAt: row.used_at,
      ipAddress: row.ip_address,
      createdAt: row.created_at
    };
  }

  private mapInviteCode(row: any): InviteCode {
    return {
      id: row.id,
      code: row.code,
      createdBy: row.created_by,
      usedBy: row.used_by,
      maxUses: row.max_uses,
      usesCount: row.uses_count,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
      usedAt: row.used_at
    };
  }

  private hashToken(token: string): string {
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const hashBuffer = crypto.subtle.digestSync('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}
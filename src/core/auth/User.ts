import { User as IUser, UserProfile, UniversePlayer } from './types';

/**
 * Represents a user account in the authentication system.
 * Manages user credentials, profile information, and multi-universe access.
 * Separate from Player entity to support multiple game characters.
 */
export class User implements IUser {
  public readonly id: string;
  public email: string;
  public username: string;
  public passwordHash: string;
  public emailVerified: boolean;
  public emailVerifiedAt?: Date;
  public readonly createdAt: Date;
  public updatedAt: Date;
  public profile?: UserProfile;
  public universes?: UniversePlayer[];

  constructor(
    id: string,
    email: string,
    username: string,
    passwordHash: string,
    emailVerified: boolean = false
  ) {
    this.id = id;
    this.email = email.toLowerCase(); // Normalize email
    this.username = username;
    this.passwordHash = passwordHash;
    this.emailVerified = emailVerified;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  /**
   * Creates a new user with default values.
   * @param {string} email - User's email address
   * @param {string} username - Unique username
   * @param {string} passwordHash - Hashed password
   * @returns {User} New user instance
   */
  public static create(
    email: string,
    username: string,
    passwordHash: string
  ): User {
    const id = crypto.randomUUID();
    return new User(id, email, username, passwordHash, false);
  }

  /**
   * Marks the user's email as verified.
   * @sideEffect Sets emailVerified to true and emailVerifiedAt timestamp
   */
  public verifyEmail(): void {
    this.emailVerified = true;
    this.emailVerifiedAt = new Date();
    this.updatedAt = new Date();
  }

  /**
   * Updates the user's password hash.
   * @param {string} newPasswordHash - New hashed password
   * @sideEffect Updates passwordHash and updatedAt timestamp
   */
  public updatePassword(newPasswordHash: string): void {
    this.passwordHash = newPasswordHash;
    this.updatedAt = new Date();
  }

  /**
   * Updates the user's profile information.
   * @param {Partial<UserProfile>} updates - Profile fields to update
   * @sideEffect Merges updates into profile and updates timestamp
   */
  public updateProfile(updates: Partial<UserProfile>): void {
    this.profile = {
      ...this.profile,
      ...updates
    } as UserProfile;
    this.updatedAt = new Date();
  }

  /**
   * Checks if user can join another universe.
   * @param {number} maxUniverses - Maximum allowed universes per user
   * @returns {boolean} True if user can join another universe
   */
  public canJoinUniverse(maxUniverses: number): boolean {
    if (!this.universes) return true;
    const activeUniverses = this.universes.filter(u => u.isActive);
    return activeUniverses.length < maxUniverses;
  }

  /**
   * Gets count of active universes the user is playing in.
   * @returns {number} Number of active universes
   */
  public getActiveUniverseCount(): number {
    if (!this.universes) return 0;
    return this.universes.filter(u => u.isActive).length;
  }

  /**
   * Adds a universe player association.
   * @param {UniversePlayer} universePlayer - Universe player data
   * @sideEffect Adds universe to user's universe list
   */
  public addUniverse(universePlayer: UniversePlayer): void {
    if (!this.universes) {
      this.universes = [];
    }
    this.universes.push(universePlayer);
    this.updatedAt = new Date();
  }

  /**
   * Removes a universe player association.
   * @param {string} universeId - Universe ID to remove
   * @sideEffect Marks universe as inactive in user's universe list
   */
  public leaveUniverse(universeId: string): void {
    if (!this.universes) return;
    
    const universe = this.universes.find(u => u.universeId === universeId);
    if (universe) {
      universe.isActive = false;
      this.updatedAt = new Date();
    }
  }

  /**
   * Converts user to a safe object for API responses.
   * @returns {object} User data without sensitive fields
   */
  public toJSON(): object {
    return {
      id: this.id,
      email: this.email,
      username: this.username,
      emailVerified: this.emailVerified,
      emailVerifiedAt: this.emailVerifiedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      profile: this.profile,
      universes: this.universes?.map(u => ({
        universeId: u.universeId,
        playerId: u.playerId,
        joinedAt: u.joinedAt,
        lastPlayed: u.lastPlayed,
        isActive: u.isActive
      }))
    };
  }

  /**
   * Creates a User instance from database row.
   * @param {any} row - Database row data
   * @returns {User} User instance
   */
  public static fromDatabase(row: any): User {
    const user = new User(
      row.id,
      row.email,
      row.username,
      row.password_hash,
      row.email_verified
    );
    
    user.emailVerifiedAt = row.email_verified_at;
    user.createdAt = row.created_at;
    user.updatedAt = row.updated_at;
    
    if (row.profile) {
      user.profile = {
        displayName: row.profile.display_name,
        bio: row.profile.bio,
        avatarUrl: row.profile.avatar_url,
        totalPlayTime: row.profile.total_play_time || 0,
        favoriteFaction: row.profile.favorite_faction,
        achievements: row.profile.achievements || []
      };
    }
    
    return user;
  }
}
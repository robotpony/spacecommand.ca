import { BaseRepository } from './BaseRepository';
import { Player, PlayerStats } from '../../core/entities/Player';
import { PoolClient } from 'pg';
import { db } from '../database/connection';
import bcrypt from 'bcryptjs';

/**
 * Database row structure for players table.
 */
interface PlayerRow {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  faction: string;
  credits: number;
  reputation: number;
  last_login: Date;
  created_at: Date;
  is_active: boolean;
  is_banned: boolean;
  stats: PlayerStats;
}

/**
 * Repository for managing player persistence and queries.
 * Handles authentication, player lookups, and statistics updates.
 */
export class PlayerRepository extends BaseRepository<Player> {
  protected readonly tableName = 'players';
  
  /**
   * Converts database row to Player entity.
   * @param {PlayerRow} row - Database row
   * @returns {Player} Hydrated Player instance
   */
  protected hydrate(row: PlayerRow): Player {
    const player = new Player(
      row.id,
      row.username,
      row.email,
      row.faction as any
    );
    
    player.credits = row.credits;
    player.reputation = row.reputation;
    player.lastLogin = new Date(row.last_login);
    player.createdAt = new Date(row.created_at);
    player.isActive = row.is_active;
    player.isBanned = row.is_banned;
    player.stats = row.stats || {
      gamesPlayed: 0,
      victories: 0,
      totalCredits: row.credits,
      shipsDestroyed: 0,
      tradeMissions: 0
    };
    
    return player;
  }
  
  /**
   * Converts Player entity to database columns.
   * @param {Partial<Player>} entity - Player entity
   * @returns {any} Database column values
   */
  protected dehydrate(entity: Partial<Player>): any {
    const data: any = {};
    
    if (entity.id !== undefined) data.id = entity.id;
    if (entity.username !== undefined) data.username = entity.username;
    if (entity.email !== undefined) data.email = entity.email;
    if (entity.faction !== undefined) data.faction = entity.faction;
    if (entity.credits !== undefined) data.credits = entity.credits;
    if (entity.reputation !== undefined) data.reputation = entity.reputation;
    if (entity.lastLogin !== undefined) data.last_login = entity.lastLogin;
    if (entity.createdAt !== undefined) data.created_at = entity.createdAt;
    if (entity.isActive !== undefined) data.is_active = entity.isActive;
    if (entity.isBanned !== undefined) data.is_banned = entity.isBanned;
    if (entity.stats !== undefined) data.stats = JSON.stringify(entity.stats);
    
    return data;
  }
  
  /**
   * Creates a new player with hashed password.
   * @param {string} username - Player username
   * @param {string} email - Player email
   * @param {string} password - Plain text password
   * @param {string} faction - Starting faction
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<Player>} Created player
   * @throws {DatabaseError} If username or email already exists
   */
  public async createPlayer(
    username: string,
    email: string,
    password: string,
    faction: string = 'independent',
    client?: PoolClient
  ): Promise<Player> {
    const passwordHash = await bcrypt.hash(password, 10);
    
    const query = `
      INSERT INTO players (username, email, password_hash, faction)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    
    const result = client
      ? await client.query(query, [username, email, passwordHash, faction])
      : await db.query(query, [username, email, passwordHash, faction]);
    
    return this.hydrate(result.rows[0]);
  }
  
  /**
   * Authenticates a player by username/email and password.
   * @param {string} usernameOrEmail - Username or email
   * @param {string} password - Plain text password
   * @returns {Promise<Player | null>} Authenticated player or null
   * @sideEffect Updates last_login timestamp on success
   */
  public async authenticate(
    usernameOrEmail: string,
    password: string
  ): Promise<Player | null> {
    const query = `
      SELECT * FROM players 
      WHERE (username = $1 OR email = $1) 
        AND is_active = true 
        AND is_banned = false
    `;
    
    const result = await db.query<PlayerRow>(query, [usernameOrEmail]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    const validPassword = await bcrypt.compare(password, row.password_hash);
    
    if (!validPassword) {
      return null;
    }
    
    // Update last login
    await db.query(
      'UPDATE players SET last_login = NOW() WHERE id = $1',
      [row.id]
    );
    
    row.last_login = new Date();
    return this.hydrate(row);
  }
  
  /**
   * Finds a player by username.
   * @param {string} username - Player username
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<Player | null>} Player if found
   */
  public async findByUsername(
    username: string,
    client?: PoolClient
  ): Promise<Player | null> {
    return this.findOne({ username } as any, client);
  }
  
  /**
   * Finds a player by email.
   * @param {string} email - Player email
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<Player | null>} Player if found
   */
  public async findByEmail(
    email: string,
    client?: PoolClient
  ): Promise<Player | null> {
    return this.findOne({ email } as any, client);
  }
  
  /**
   * Gets top players by credits.
   * @param {number} limit - Number of players to return
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<Player[]>} Top players sorted by credits
   */
  public async getTopByCredits(
    limit: number = 10,
    client?: PoolClient
  ): Promise<Player[]> {
    const query = `
      SELECT * FROM players 
      WHERE is_active = true AND is_banned = false
      ORDER BY credits DESC
      LIMIT $1
    `;
    
    const result = client
      ? await client.query<PlayerRow>(query, [limit])
      : await db.query<PlayerRow>(query, [limit]);
    
    return result.rows.map(row => this.hydrate(row));
  }
  
  /**
   * Gets top players by reputation.
   * @param {number} limit - Number of players to return
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<Player[]>} Top players sorted by reputation
   */
  public async getTopByReputation(
    limit: number = 10,
    client?: PoolClient
  ): Promise<Player[]> {
    const query = `
      SELECT * FROM players 
      WHERE is_active = true AND is_banned = false
      ORDER BY reputation DESC
      LIMIT $1
    `;
    
    const result = client
      ? await client.query<PlayerRow>(query, [limit])
      : await db.query<PlayerRow>(query, [limit]);
    
    return result.rows.map(row => this.hydrate(row));
  }
  
  /**
   * Updates player statistics.
   * @param {string} playerId - Player ID
   * @param {Partial<PlayerStats>} stats - Statistics to update
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<boolean>} True if updated successfully
   */
  public async updateStats(
    playerId: string,
    stats: Partial<PlayerStats>,
    client?: PoolClient
  ): Promise<boolean> {
    const query = `
      UPDATE players 
      SET stats = stats || $2::jsonb
      WHERE id = $1
    `;
    
    const result = client
      ? await client.query(query, [playerId, JSON.stringify(stats)])
      : await db.query(query, [playerId, JSON.stringify(stats)]);
    
    return result.rowCount > 0;
  }
  
  /**
   * Changes a player's password.
   * @param {string} playerId - Player ID
   * @param {string} newPassword - New plain text password
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<boolean>} True if password changed
   */
  public async changePassword(
    playerId: string,
    newPassword: string,
    client?: PoolClient
  ): Promise<boolean> {
    const passwordHash = await bcrypt.hash(newPassword, 10);
    
    const query = `
      UPDATE players 
      SET password_hash = $2
      WHERE id = $1
    `;
    
    const result = client
      ? await client.query(query, [playerId, passwordHash])
      : await db.query(query, [playerId, passwordHash]);
    
    return result.rowCount > 0;
  }
  
  /**
   * Gets players by faction.
   * @param {string} faction - Faction name
   * @param {QueryOptions} options - Query options
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<Player[]>} Players in the faction
   */
  public async findByFaction(
    faction: string,
    options: any = {},
    client?: PoolClient
  ): Promise<Player[]> {
    return this.findAll({ faction } as any, options, client);
  }
  
  /**
   * Gets recently active players.
   * @param {number} days - Days to look back
   * @param {number} limit - Maximum players to return
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<Player[]>} Recently active players
   */
  public async getRecentlyActive(
    days: number = 7,
    limit: number = 20,
    client?: PoolClient
  ): Promise<Player[]> {
    const query = `
      SELECT * FROM players 
      WHERE last_login > NOW() - INTERVAL '${days} days'
        AND is_active = true 
        AND is_banned = false
      ORDER BY last_login DESC
      LIMIT $1
    `;
    
    const result = client
      ? await client.query<PlayerRow>(query, [limit])
      : await db.query<PlayerRow>(query, [limit]);
    
    return result.rows.map(row => this.hydrate(row));
  }
}
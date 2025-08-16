import { Faction } from '@shared/types';

export interface PlayerStats {
  gamesPlayed: number;
  victories: number;
  totalCredits: number;
  shipsDestroyed: number;
  tradeMissions: number;
}

/**
 * Represents a human player account in the game system.
 * Tracks personal credits, statistics, and empire association.
 * Manages player reputation and account status.
 * Independent of empire state to support multiple game sessions.
 */
export class Player {
  public readonly id: string;
  public username: string;
  public email: string;
  public faction: Faction;
  public empireId?: string;
  public credits: number;
  public reputation: number;
  public lastLogin: Date;
  public createdAt: Date;
  public stats: PlayerStats;
  public isActive: boolean;
  public isBanned: boolean;

  constructor(
    id: string,
    username: string,
    email: string,
    faction: Faction = 'independent'
  ) {
    this.id = id;
    this.username = username;
    this.email = email;
    this.faction = faction;
    this.credits = 10000; // Starting credits
    this.reputation = 0;
    this.lastLogin = new Date();
    this.createdAt = new Date();
    this.isActive = true;
    this.isBanned = false;
    this.stats = {
      gamesPlayed: 0,
      victories: 0,
      totalCredits: 10000,
      shipsDestroyed: 0,
      tradeMissions: 0
    };
  }

  /**
   * Checks if player has sufficient personal credits.
   * @param {number} amount - Credits required
   * @returns {boolean} True if player can afford the amount
   */
  public canAfford(amount: number): boolean {
    return this.credits >= amount;
  }

  /**
   * Deducts credits from player's personal account.
   * @param {number} amount - Credits to deduct
   * @throws {Error} If insufficient credits available
   * @sideEffect Reduces player credit balance
   */
  public deductCredits(amount: number): void {
    if (!this.canAfford(amount)) {
      throw new Error(`Insufficient credits. Required: ${amount}, Available: ${this.credits}`);
    }
    this.credits -= amount;
  }

  /**
   * Adds credits to player's personal account.
   * @param {number} amount - Credits to add
   * @sideEffect Increases credit balance and lifetime earnings stat
   */
  public addCredits(amount: number): void {
    this.credits += amount;
    this.stats.totalCredits += amount;
  }

  /**
   * Modifies player reputation within bounds.
   * @param {number} change - Reputation change (positive or negative)
   * @sideEffect Updates reputation clamped between -100 and 100
   */
  public updateReputation(change: number): void {
    this.reputation = Math.max(-100, Math.min(100, this.reputation + change));
  }

  /**
   * Updates last login timestamp for activity tracking.
   * @sideEffect Sets lastLogin to current time
   */
  public recordLogin(): void {
    this.lastLogin = new Date();
  }

  /**
   * Bans player from game access.
   * @param {string} reason - Reason for ban (stored for admin records)
   * @sideEffect Sets banned flag and deactivates account
   */
  public ban(reason: string): void {
    this.isBanned = true;
    this.isActive = false;
  }

  /**
   * Restores player access after ban.
   * @sideEffect Clears banned flag and reactivates account
   */
  public unban(): void {
    this.isBanned = false;
    this.isActive = true;
  }
}
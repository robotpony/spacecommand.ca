import { Faction } from '@shared/types';

export interface PlayerStats {
  gamesPlayed: number;
  victories: number;
  totalCredits: number;
  shipsDestroyed: number;
  tradeMissions: number;
}

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

  public canAfford(amount: number): boolean {
    return this.credits >= amount;
  }

  public deductCredits(amount: number): void {
    if (!this.canAfford(amount)) {
      throw new Error(`Insufficient credits. Required: ${amount}, Available: ${this.credits}`);
    }
    this.credits -= amount;
  }

  public addCredits(amount: number): void {
    this.credits += amount;
    this.stats.totalCredits += amount;
  }

  public updateReputation(change: number): void {
    this.reputation = Math.max(-100, Math.min(100, this.reputation + change));
  }

  public recordLogin(): void {
    this.lastLogin = new Date();
  }

  public ban(reason: string): void {
    this.isBanned = true;
    this.isActive = false;
  }

  public unban(): void {
    this.isBanned = false;
    this.isActive = true;
  }
}
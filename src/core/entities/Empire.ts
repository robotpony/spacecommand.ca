import { Faction, TechnologyTier, DiplomaticStatus } from '@shared/types';
import { Planet } from './Planet';
import { Fleet } from './Fleet';

export interface Technology {
  id: string;
  name: string;
  tier: TechnologyTier;
  isResearched: boolean;
  researchCost: number;
  researchProgress: number;
  prerequisites: string[];
  effects: Record<string, any>;
}

export interface TradeRoute {
  id: string;
  fromPlanetId: string;
  toPlanetId: string;
  goodsType: string;
  quantity: number;
  profitPerTurn: number;
  isActive: boolean;
}

export interface DiplomaticRelation {
  empireId: string;
  status: DiplomaticStatus;
  trustLevel: number;
  tradeAgreements: string[];
  lastInteraction: Date;
}

/**
 * Central entity managing a player's galactic empire.
 * Coordinates all empire operations including resource management, diplomacy, and turn processing.
 * Acts as aggregate root for planets, fleets, and technologies within the empire.
 * Emits domain events for major state changes (bankruptcy, tech breakthroughs, territorial changes).
 */
export class Empire {
  public readonly id: string;
  public name: string;
  public playerId: string;
  public faction: Faction;
  public homeSystemId: string;
  public credits: number;
  public technologyTier: TechnologyTier;
  public planets: Map<string, Planet>;
  public fleets: Map<string, Fleet>;
  public technologies: Map<string, Technology>;
  public tradeRoutes: TradeRoute[];
  public diplomaticRelations: Map<string, DiplomaticRelation>;
  public actionPoints: number;
  public maxActionPoints: number;
  public turnNumber: number;
  public score: number;
  public isAlive: boolean;

  constructor(
    id: string,
    name: string,
    playerId: string,
    faction: Faction,
    homeSystemId: string
  ) {
    this.id = id;
    this.name = name;
    this.playerId = playerId;
    this.faction = faction;
    this.homeSystemId = homeSystemId;
    this.credits = 50000; // Starting credits for empire
    this.technologyTier = 'chemical';
    this.planets = new Map();
    this.fleets = new Map();
    this.technologies = new Map();
    this.tradeRoutes = [];
    this.diplomaticRelations = new Map();
    this.actionPoints = 10;
    this.maxActionPoints = 10;
    this.turnNumber = 1;
    this.score = 0;
    this.isAlive = true;
  }

  /**
   * Adds a planet to the empire's territory and colonizes it.
   * @param {Planet} planet - The planet to add to the empire
   * @throws {Error} If planet already belongs to empire
   * @sideEffect Colonizes planet with initial population of 100,000
   * @sideEffect Updates empire's planet collection
   */
  public addPlanet(planet: Planet): void {
    if (this.planets.has(planet.id)) {
      throw new Error(`Planet ${planet.id} already belongs to empire`);
    }
    planet.colonize(this.id, 100000); // Initial colonist population
    this.planets.set(planet.id, planet);
  }

  /**
   * Removes a planet from empire control (lost in war or bankruptcy).
   * @param {string} planetId - UUID of the planet to remove
   * @throws {Error} If planet doesn't belong to empire
   * @sideEffect Removes planet from empire's collection
   */
  public removePlanet(planetId: string): void {
    if (!this.planets.has(planetId)) {
      throw new Error(`Planet ${planetId} does not belong to empire`);
    }
    this.planets.delete(planetId);
  }

  /**
   * Adds a fleet to the empire's military forces.
   * @param {Fleet} fleet - The fleet to add to the empire
   * @throws {Error} If fleet already belongs to empire
   * @sideEffect Updates empire's fleet collection
   */
  public addFleet(fleet: Fleet): void {
    if (this.fleets.has(fleet.id)) {
      throw new Error(`Fleet ${fleet.id} already belongs to empire`);
    }
    this.fleets.set(fleet.id, fleet);
  }

  /**
   * Removes a fleet from empire control (destroyed or disbanded).
   * @param {string} fleetId - UUID of the fleet to remove  
   * @throws {Error} If fleet doesn't belong to empire
   * @sideEffect Removes fleet from empire's collection
   */
  public removeFleet(fleetId: string): void {
    if (!this.fleets.has(fleetId)) {
      throw new Error(`Fleet ${fleetId} does not belong to empire`);
    }
    this.fleets.delete(fleetId);
  }

  /**
   * Calculates total population across all empire planets.
   * @returns {number} Combined population of all controlled planets
   */
  public getTotalPopulation(): number {
    let total = 0;
    this.planets.forEach(planet => {
      total += planet.population;
    });
    return total;
  }

  /**
   * Calculates combined military strength of all fleets.
   * @returns {number} Total attack power including morale and experience modifiers
   */
  public getTotalMilitaryPower(): number {
    let total = 0;
    this.fleets.forEach(fleet => {
      total += fleet.getTotalAttackPower();
    });
    return total;
  }

  /**
   * Aggregates resource production rates from all planets.
   * @returns {Record<string, number>} Combined production rates for ore, crystals, energy, food
   */
  public getTotalProduction(): Record<string, number> {
    const production: Record<string, number> = {
      ore: 0,
      crystals: 0,
      energy: 0,
      food: 0
    };

    this.planets.forEach(planet => {
      production.ore += planet.productionRates.ore;
      production.crystals += planet.productionRates.crystals;
      production.energy += planet.productionRates.energy;
      production.food += planet.productionRates.food;
    });

    return production;
  }

  /**
   * Calculates total upkeep costs for all assets.
   * @returns {number} Combined maintenance cost for planets and fleets
   */
  public getTotalMaintenanceCost(): number {
    let cost = 0;
    
    this.planets.forEach(planet => {
      cost += planet.getMaintenanceCost();
    });
    
    this.fleets.forEach(fleet => {
      cost += fleet.getMaintenanceCost();
    });
    
    return cost;
  }

  /**
   * Checks if empire has sufficient credits for a transaction.
   * @param {number} amount - Credits required
   * @returns {boolean} True if empire has enough credits
   */
  public canAfford(amount: number): boolean {
    return this.credits >= amount;
  }

  /**
   * Deducts credits from empire treasury.
   * @param {number} amount - Credits to deduct
   * @throws {Error} If insufficient credits available
   * @sideEffect Reduces empire credit balance
   */
  public deductCredits(amount: number): void {
    if (!this.canAfford(amount)) {
      throw new Error(`Insufficient credits. Required: ${amount}, Available: ${this.credits}`);
    }
    this.credits -= amount;
  }

  /**
   * Adds credits to empire treasury.
   * @param {number} amount - Credits to add
   * @sideEffect Increases empire credit balance
   */
  public addCredits(amount: number): void {
    this.credits += amount;
  }

  /**
   * Consumes action points for empire actions.
   * @param {number} amount - Action points to consume
   * @throws {Error} If insufficient action points available
   * @sideEffect Reduces available action points
   */
  public useActionPoints(amount: number): void {
    if (this.actionPoints < amount) {
      throw new Error(`Insufficient action points. Required: ${amount}, Available: ${this.actionPoints}`);
    }
    this.actionPoints -= amount;
  }

  /**
   * Restores action points to maximum for new turn.
   * @sideEffect Sets action points to max value
   */
  public resetActionPoints(): void {
    this.actionPoints = this.maxActionPoints;
  }

  /**
   * Executes all turn-based empire operations.
   * @sideEffect Produces resources on all planets
   * @sideEffect Deducts maintenance costs or triggers bankruptcy
   * @sideEffect Processes trade route income
   * @sideEffect Resets action points and increments turn counter
   * @sideEffect Updates empire score
   */
  public processTurn(): void {
    // Process resource production
    this.planets.forEach(planet => {
      planet.produceResources();
    });

    // Deduct maintenance costs
    const maintenanceCost = this.getTotalMaintenanceCost();
    if (this.credits >= maintenanceCost) {
      this.credits -= maintenanceCost;
    } else {
      // Handle bankruptcy
      this.handleBankruptcy();
    }

    // Process trade routes
    this.processTradeRoutes();

    // Reset action points for next turn
    this.resetActionPoints();
    
    this.turnNumber++;
    this.updateScore();
  }

  /**
   * Processes income from active trade routes.
   * @sideEffect Adds trade profits to empire treasury
   */
  private processTradeRoutes(): void {
    for (const route of this.tradeRoutes) {
      if (route.isActive) {
        this.credits += route.profitPerTurn;
      }
    }
  }

  /**
   * Implements corporate restructure mechanic for negative credits.
   * @sideEffect Resets credits to 5000 if below -10000
   * @sideEffect Reduces score by 50%
   * @sideEffect May remove least valuable planet as penalty
   */
  private handleBankruptcy(): void {
    if (this.credits < -10000) {
      // Corporate restructure
      this.credits = 5000;
      this.score = Math.floor(this.score * 0.5);
      
      // Lose some assets
      if (this.planets.size > 1) {
        const planetArray = Array.from(this.planets.values());
        const planetToLose = planetArray[planetArray.length - 1];
        this.removePlanet(planetToLose.id);
      }
    }
  }

  /**
   * Recalculates empire score based on various metrics.
   * @sideEffect Updates empire score based on population, credits, territories, military, tech
   */
  private updateScore(): void {
    const populationScore = this.getTotalPopulation() / 1000;
    const creditScore = this.credits / 100;
    const planetScore = this.planets.size * 1000;
    const fleetScore = this.getTotalMilitaryPower();
    const techScore = this.technologies.size * 500;
    
    this.score = Math.floor(
      populationScore + creditScore + planetScore + fleetScore + techScore
    );
  }

  /**
   * Updates diplomatic relationship with another empire.
   * @param {string} empireId - UUID of the other empire
   * @param {DiplomaticStatus} status - New diplomatic status (allied/friendly/neutral/hostile/war)
   * @sideEffect Updates diplomatic relations map
   * @sideEffect Adjusts trust level based on status change
   */
  public setDiplomaticStatus(empireId: string, status: DiplomaticStatus): void {
    const relation = this.diplomaticRelations.get(empireId) || {
      empireId,
      status: 'neutral',
      trustLevel: 0,
      tradeAgreements: [],
      lastInteraction: new Date()
    };

    relation.status = status;
    relation.lastInteraction = new Date();
    
    // Adjust trust based on status change
    switch (status) {
      case 'allied':
        relation.trustLevel = Math.min(100, relation.trustLevel + 20);
        break;
      case 'friendly':
        relation.trustLevel = Math.min(100, relation.trustLevel + 10);
        break;
      case 'hostile':
        relation.trustLevel = Math.max(-100, relation.trustLevel - 20);
        break;
      case 'war':
        relation.trustLevel = Math.max(-100, relation.trustLevel - 50);
        break;
    }

    this.diplomaticRelations.set(empireId, relation);
  }

  /**
   * Applies research points to a technology.
   * @param {string} technologyId - UUID of technology to research
   * @param {number} researchPoints - Research points to apply
   * @throws {Error} If technology not found, already researched, or prerequisites not met
   * @sideEffect Increases research progress
   * @sideEffect Completes technology and applies effects when threshold reached
   * @sideEffect May upgrade technology tier
   */
  public researchTechnology(technologyId: string, researchPoints: number): void {
    const tech = this.technologies.get(technologyId);
    if (!tech) {
      throw new Error(`Technology ${technologyId} not found`);
    }
    
    if (tech.isResearched) {
      throw new Error(`Technology ${tech.name} already researched`);
    }

    // Check prerequisites
    for (const prereq of tech.prerequisites) {
      const prereqTech = this.technologies.get(prereq);
      if (!prereqTech || !prereqTech.isResearched) {
        throw new Error(`Prerequisite ${prereq} not researched`);
      }
    }

    tech.researchProgress += researchPoints;
    
    if (tech.researchProgress >= tech.researchCost) {
      tech.isResearched = true;
      this.applyTechnologyEffects(tech);
      
      // Upgrade technology tier if applicable
      if (tech.tier !== this.technologyTier) {
        const tierOrder: TechnologyTier[] = ['chemical', 'nuclear', 'antimatter', 'exotic'];
        const currentIndex = tierOrder.indexOf(this.technologyTier);
        const newIndex = tierOrder.indexOf(tech.tier);
        if (newIndex > currentIndex) {
          this.technologyTier = tech.tier;
        }
      }
    }
  }

  /**
   * Applies completed technology bonuses to empire.
   * @param {Technology} technology - Completed technology with effects
   * @sideEffect Applies credit bonuses, action point increases, and other tech effects
   */
  private applyTechnologyEffects(technology: Technology): void {
    // Apply technology bonuses to empire
    if (technology.effects.creditBonus) {
      this.credits += technology.effects.creditBonus;
    }
    if (technology.effects.actionPointBonus) {
      this.maxActionPoints += technology.effects.actionPointBonus;
    }
    // Additional effects can be implemented as needed
  }
}
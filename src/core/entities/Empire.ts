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

  public addPlanet(planet: Planet): void {
    if (this.planets.has(planet.id)) {
      throw new Error(`Planet ${planet.id} already belongs to empire`);
    }
    planet.colonize(this.id, 100000); // Initial colonist population
    this.planets.set(planet.id, planet);
  }

  public removePlanet(planetId: string): void {
    if (!this.planets.has(planetId)) {
      throw new Error(`Planet ${planetId} does not belong to empire`);
    }
    this.planets.delete(planetId);
  }

  public addFleet(fleet: Fleet): void {
    if (this.fleets.has(fleet.id)) {
      throw new Error(`Fleet ${fleet.id} already belongs to empire`);
    }
    this.fleets.set(fleet.id, fleet);
  }

  public removeFleet(fleetId: string): void {
    if (!this.fleets.has(fleetId)) {
      throw new Error(`Fleet ${fleetId} does not belong to empire`);
    }
    this.fleets.delete(fleetId);
  }

  public getTotalPopulation(): number {
    let total = 0;
    this.planets.forEach(planet => {
      total += planet.population;
    });
    return total;
  }

  public getTotalMilitaryPower(): number {
    let total = 0;
    this.fleets.forEach(fleet => {
      total += fleet.getTotalAttackPower();
    });
    return total;
  }

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
  }

  public useActionPoints(amount: number): void {
    if (this.actionPoints < amount) {
      throw new Error(`Insufficient action points. Required: ${amount}, Available: ${this.actionPoints}`);
    }
    this.actionPoints -= amount;
  }

  public resetActionPoints(): void {
    this.actionPoints = this.maxActionPoints;
  }

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

  private processTradeRoutes(): void {
    for (const route of this.tradeRoutes) {
      if (route.isActive) {
        this.credits += route.profitPerTurn;
      }
    }
  }

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
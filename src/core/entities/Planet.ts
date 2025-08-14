import { PlanetSpecialization, ResourceType, Coordinates } from '@shared/types';

export interface Building {
  id: string;
  type: 'mine' | 'factory' | 'farm' | 'lab' | 'defense' | 'spaceport';
  level: number;
  isOperational: boolean;
  maintenanceCost: number;
  productionBonus: number;
}

export interface PlanetResources {
  ore: number;
  crystals: number;
  energy: number;
  food: number;
}

export class Planet {
  public readonly id: string;
  public name: string;
  public systemId: string;
  public ownerId?: string;
  public coordinates: Coordinates;
  public specialization: PlanetSpecialization;
  public population: number;
  public maxPopulation: number;
  public buildings: Building[];
  public resources: PlanetResources;
  public productionRates: PlanetResources;
  public defenseRating: number;
  public developmentLevel: number;
  public isColonized: boolean;

  constructor(
    id: string,
    name: string,
    systemId: string,
    coordinates: Coordinates,
    specialization: PlanetSpecialization = 'balanced'
  ) {
    this.id = id;
    this.name = name;
    this.systemId = systemId;
    this.coordinates = coordinates;
    this.specialization = specialization;
    this.population = 0;
    this.maxPopulation = this.calculateMaxPopulation();
    this.buildings = [];
    this.resources = {
      ore: 0,
      crystals: 0,
      energy: 0,
      food: 0
    };
    this.productionRates = this.calculateBaseProduction();
    this.defenseRating = 0;
    this.developmentLevel = 0;
    this.isColonized = false;
  }

  private calculateMaxPopulation(): number {
    const basePopulation = 1000000;
    const modifiers: Record<PlanetSpecialization, number> = {
      agricultural: 1.5,
      industrial: 0.8,
      mining: 0.6,
      research: 0.9,
      military: 0.7,
      commercial: 1.2,
      balanced: 1.0
    };
    return Math.floor(basePopulation * modifiers[this.specialization]);
  }

  private calculateBaseProduction(): PlanetResources {
    const base = { ore: 10, crystals: 5, energy: 15, food: 20 };
    
    switch (this.specialization) {
      case 'mining':
        return { ore: base.ore * 3, crystals: base.crystals * 2, energy: base.energy, food: base.food * 0.5 };
      case 'agricultural':
        return { ore: base.ore * 0.5, crystals: base.crystals * 0.5, energy: base.energy, food: base.food * 3 };
      case 'industrial':
        return { ore: base.ore, crystals: base.crystals, energy: base.energy * 2, food: base.food * 0.7 };
      case 'research':
        return { ore: base.ore * 0.7, crystals: base.crystals * 2, energy: base.energy * 1.5, food: base.food * 0.8 };
      case 'military':
        return { ore: base.ore * 1.5, crystals: base.crystals, energy: base.energy * 1.5, food: base.food * 0.6 };
      case 'commercial':
        return { ore: base.ore * 0.8, crystals: base.crystals * 1.5, energy: base.energy * 1.2, food: base.food };
      default:
        return base;
    }
  }

  public colonize(ownerId: string, initialPopulation: number): void {
    if (this.isColonized) {
      throw new Error(`Planet ${this.name} is already colonized`);
    }
    this.ownerId = ownerId;
    this.population = Math.min(initialPopulation, this.maxPopulation);
    this.isColonized = true;
    this.developmentLevel = 1;
    this.defenseRating = 10;
  }

  public addBuilding(building: Building): void {
    const maxBuildings = 10 + this.developmentLevel * 2;
    if (this.buildings.length >= maxBuildings) {
      throw new Error(`Maximum building capacity (${maxBuildings}) reached`);
    }
    this.buildings.push(building);
    this.updateProductionRates();
  }

  public upgradeBuilding(buildingId: string): void {
    const building = this.buildings.find(b => b.id === buildingId);
    if (!building) {
      throw new Error(`Building ${buildingId} not found`);
    }
    building.level++;
    building.productionBonus *= 1.2;
    building.maintenanceCost *= 1.1;
    this.updateProductionRates();
  }

  private updateProductionRates(): void {
    const baseRates = this.calculateBaseProduction();
    const populationModifier = Math.min(1, this.population / (this.maxPopulation * 0.5));
    
    let totalBonus = 1;
    for (const building of this.buildings) {
      if (building.isOperational) {
        totalBonus += building.productionBonus;
      }
    }

    this.productionRates = {
      ore: Math.floor(baseRates.ore * populationModifier * totalBonus),
      crystals: Math.floor(baseRates.crystals * populationModifier * totalBonus),
      energy: Math.floor(baseRates.energy * populationModifier * totalBonus),
      food: Math.floor(baseRates.food * populationModifier * totalBonus)
    };
  }

  public produceResources(): PlanetResources {
    const produced = { ...this.productionRates };
    
    this.resources.ore += produced.ore;
    this.resources.crystals += produced.crystals;
    this.resources.energy += produced.energy;
    this.resources.food += produced.food;
    
    return produced;
  }

  public consumeResources(amount: Partial<PlanetResources>): void {
    if (amount.ore && this.resources.ore < amount.ore) {
      throw new Error(`Insufficient ore on ${this.name}`);
    }
    if (amount.crystals && this.resources.crystals < amount.crystals) {
      throw new Error(`Insufficient crystals on ${this.name}`);
    }
    if (amount.energy && this.resources.energy < amount.energy) {
      throw new Error(`Insufficient energy on ${this.name}`);
    }
    if (amount.food && this.resources.food < amount.food) {
      throw new Error(`Insufficient food on ${this.name}`);
    }

    if (amount.ore) this.resources.ore -= amount.ore;
    if (amount.crystals) this.resources.crystals -= amount.crystals;
    if (amount.energy) this.resources.energy -= amount.energy;
    if (amount.food) this.resources.food -= amount.food;
  }

  public getMaintenanceCost(): number {
    return this.buildings.reduce((total, building) => {
      return total + (building.isOperational ? building.maintenanceCost : 0);
    }, 0);
  }
}
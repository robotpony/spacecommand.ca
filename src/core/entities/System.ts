import { Coordinates, ResourceType } from '@shared/types';

export interface MarketPrice {
  resource: ResourceType;
  buyPrice: number;
  sellPrice: number;
  supply: number;
  demand: number;
  trend: 'rising' | 'falling' | 'stable';
}

export interface SystemConnection {
  toSystemId: string;
  distance: number;
  travelTime: number;
  isDangerous: boolean;
}

export class System {
  public readonly id: string;
  public name: string;
  public coordinates: Coordinates;
  public description: string;
  public planetIds: string[];
  public connections: SystemConnection[];
  public marketPrices: Map<ResourceType, MarketPrice>;
  public isPvpEnabled: boolean;
  public dangerLevel: number; // 0-10, 0 = safe core, 10 = dangerous rim
  public discoveredBy: Set<string>; // Empire IDs that have discovered this system
  public controlledBy?: string; // Empire ID that controls this system
  public facilities: string[]; // Space stations, trading posts, etc.

  constructor(
    id: string,
    name: string,
    coordinates: Coordinates,
    dangerLevel: number = 0
  ) {
    this.id = id;
    this.name = name;
    this.coordinates = coordinates;
    this.description = this.generateDescription();
    this.planetIds = [];
    this.connections = [];
    this.marketPrices = new Map();
    this.isPvpEnabled = dangerLevel > 5;
    this.dangerLevel = dangerLevel;
    this.discoveredBy = new Set();
    this.facilities = [];
    
    this.initializeMarket();
  }

  private generateDescription(): string {
    const descriptions = [
      'A bustling trade hub at the crossroads of major shipping lanes',
      'A quiet system with abundant mineral resources',
      'A frontier system on the edge of known space',
      'A heavily fortified military outpost',
      'A mysterious system with ancient alien artifacts',
      'A agricultural paradise with fertile planets',
      'A industrial powerhouse with massive shipyards',
      'A research nexus with cutting-edge laboratories'
    ];
    return descriptions[Math.floor(Math.random() * descriptions.length)];
  }

  private initializeMarket(): void {
    const resources: ResourceType[] = [
      'ore', 'crystals', 'energy', 'electronics', 
      'weapons', 'food', 'luxury_goods', 'fuel'
    ];

    for (const resource of resources) {
      const basePrice = this.getBasePrice(resource);
      const variation = 0.2 + Math.random() * 0.3; // 20-50% variation
      
      const supply = Math.floor(100 + Math.random() * 900);
      const demand = Math.floor(100 + Math.random() * 900);
      const supplyDemandRatio = supply / demand;
      
      const buyPrice = basePrice * (1 + variation) / supplyDemandRatio;
      const sellPrice = buyPrice * 0.8; // 20% spread
      
      this.marketPrices.set(resource, {
        resource,
        buyPrice: Math.round(buyPrice),
        sellPrice: Math.round(sellPrice),
        supply,
        demand,
        trend: this.calculateTrend(supplyDemandRatio)
      });
    }
  }

  private getBasePrice(resource: ResourceType): number {
    const basePrices: Record<ResourceType, number> = {
      'ore': 10,
      'crystals': 50,
      'energy': 15,
      'electronics': 100,
      'weapons': 200,
      'food': 5,
      'luxury_goods': 500,
      'fuel': 20
    };
    return basePrices[resource];
  }

  private calculateTrend(ratio: number): 'rising' | 'falling' | 'stable' {
    if (ratio < 0.8) return 'rising';
    if (ratio > 1.2) return 'falling';
    return 'stable';
  }

  public addConnection(connection: SystemConnection): void {
    // Avoid duplicate connections
    const exists = this.connections.some(c => c.toSystemId === connection.toSystemId);
    if (!exists) {
      this.connections.push(connection);
    }
  }

  public addPlanet(planetId: string): void {
    if (!this.planetIds.includes(planetId)) {
      this.planetIds.push(planetId);
    }
  }

  public discover(empireId: string): void {
    this.discoveredBy.add(empireId);
  }

  public isDiscoveredBy(empireId: string): boolean {
    return this.discoveredBy.has(empireId);
  }

  public setController(empireId: string | undefined): void {
    this.controlledBy = empireId;
  }

  public updateMarketPrices(): void {
    this.marketPrices.forEach((price, resource) => {
      // Random market fluctuation
      const fluctuation = 0.9 + Math.random() * 0.2; // -10% to +10%
      
      // Update supply and demand
      price.supply = Math.max(10, Math.floor(price.supply * fluctuation));
      price.demand = Math.max(10, Math.floor(price.demand * (2 - fluctuation)));
      
      const supplyDemandRatio = price.supply / price.demand;
      const basePrice = this.getBasePrice(resource);
      
      // Calculate new prices based on supply/demand
      const oldBuyPrice = price.buyPrice;
      price.buyPrice = Math.round(basePrice / supplyDemandRatio * (0.8 + Math.random() * 0.4));
      price.sellPrice = Math.round(price.buyPrice * 0.8);
      
      // Update trend
      if (price.buyPrice > oldBuyPrice * 1.05) {
        price.trend = 'rising';
      } else if (price.buyPrice < oldBuyPrice * 0.95) {
        price.trend = 'falling';
      } else {
        price.trend = 'stable';
      }
      
      this.marketPrices.set(resource, price);
    });
  }

  public getDistanceTo(targetCoordinates: Coordinates): number {
    const dx = this.coordinates.x - targetCoordinates.x;
    const dy = this.coordinates.y - targetCoordinates.y;
    const dz = this.coordinates.z - targetCoordinates.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  public calculateTravelTime(distance: number, fleetSpeed: number): number {
    // Base travel time in hours
    const baseTime = distance / fleetSpeed;
    
    // Add danger level modifier (more dangerous = slower travel)
    const dangerModifier = 1 + (this.dangerLevel * 0.1);
    
    return Math.ceil(baseTime * dangerModifier * 3600); // Convert to seconds
  }

  public canTrade(resource: ResourceType, quantity: number, isBuying: boolean): boolean {
    const price = this.marketPrices.get(resource);
    if (!price) return false;
    
    if (isBuying) {
      return price.supply >= quantity;
    } else {
      return price.demand >= quantity;
    }
  }

  public executeTrade(resource: ResourceType, quantity: number, isBuying: boolean): number {
    const price = this.marketPrices.get(resource);
    if (!price) {
      throw new Error(`Resource ${resource} not available in this system`);
    }
    
    if (!this.canTrade(resource, quantity, isBuying)) {
      throw new Error(`Cannot trade ${quantity} units of ${resource}`);
    }
    
    let totalCost: number;
    
    if (isBuying) {
      price.supply -= quantity;
      price.demand += Math.floor(quantity * 0.1); // Slight demand increase
      totalCost = price.buyPrice * quantity;
    } else {
      price.supply += quantity;
      price.demand -= Math.floor(quantity * 0.1); // Slight demand decrease
      totalCost = price.sellPrice * quantity;
    }
    
    this.marketPrices.set(resource, price);
    return totalCost;
  }
}
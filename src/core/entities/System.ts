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

/**
 * Represents a star system containing planets and market dynamics.
 * Manages trade prices, travel connections, and territorial control.
 * Implements dynamic market simulation based on supply and demand.
 * Serves as navigation node and economic center for game universe.
 */
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

  /**
   * Creates flavor text description for system.
   * @returns {string} Random descriptive text for immersion
   */
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

  /**
   * Sets up initial market prices and supply/demand.
   * @sideEffect Populates marketPrices map with all resource types
   */
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

  /**
   * Returns base price for resource type.
   * @param {ResourceType} resource - Resource to price
   * @returns {number} Base price in credits
   */
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

  /**
   * Determines market trend from supply/demand ratio.
   * @param {number} ratio - Supply divided by demand
   * @returns {'rising' | 'falling' | 'stable'} Market trend indicator
   */
  private calculateTrend(ratio: number): 'rising' | 'falling' | 'stable' {
    if (ratio < 0.8) return 'rising';
    if (ratio > 1.2) return 'falling';
    return 'stable';
  }

  /**
   * Adds travel route to another system.
   * @param {SystemConnection} connection - Connection details
   * @sideEffect Adds connection if not duplicate
   */
  public addConnection(connection: SystemConnection): void {
    // Avoid duplicate connections
    const exists = this.connections.some(c => c.toSystemId === connection.toSystemId);
    if (!exists) {
      this.connections.push(connection);
    }
  }

  /**
   * Associates planet with this system.
   * @param {string} planetId - UUID of planet to add
   * @sideEffect Adds planet to system's planet list
   */
  public addPlanet(planetId: string): void {
    if (!this.planetIds.includes(planetId)) {
      this.planetIds.push(planetId);
    }
  }

  /**
   * Records empire discovery of this system.
   * @param {string} empireId - UUID of discovering empire
   * @sideEffect Adds empire to discoveredBy set
   */
  public discover(empireId: string): void {
    this.discoveredBy.add(empireId);
  }

  /**
   * Checks if empire has discovered this system.
   * @param {string} empireId - UUID of empire to check
   * @returns {boolean} True if empire has discovered system
   */
  public isDiscoveredBy(empireId: string): boolean {
    return this.discoveredBy.has(empireId);
  }

  /**
   * Sets territorial control of system.
   * @param {string | undefined} empireId - Controlling empire or undefined for neutral
   * @sideEffect Updates controlledBy field
   */
  public setController(empireId: string | undefined): void {
    this.controlledBy = empireId;
  }

  /**
   * Simulates market fluctuations for turn processing.
   * @sideEffect Updates all resource prices based on supply/demand
   * @sideEffect Adjusts supply and demand with random factors
   */
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

  /**
   * Calculates 3D distance to target coordinates.
   * @param {Coordinates} targetCoordinates - Target position
   * @returns {number} Euclidean distance in game units
   */
  public getDistanceTo(targetCoordinates: Coordinates): number {
    const dx = this.coordinates.x - targetCoordinates.x;
    const dy = this.coordinates.y - targetCoordinates.y;
    const dz = this.coordinates.z - targetCoordinates.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Computes travel duration based on distance and danger.
   * @param {number} distance - Distance to travel
   * @param {number} fleetSpeed - Fleet movement speed
   * @returns {number} Travel time in seconds (danger increases time)
   */
  public calculateTravelTime(distance: number, fleetSpeed: number): number {
    // Base travel time in hours
    const baseTime = distance / fleetSpeed;
    
    // Add danger level modifier (more dangerous = slower travel)
    const dangerModifier = 1 + (this.dangerLevel * 0.1);
    
    return Math.ceil(baseTime * dangerModifier * 3600); // Convert to seconds
  }

  /**
   * Validates if trade quantity is available.
   * @param {ResourceType} resource - Resource to trade
   * @param {number} quantity - Amount to trade
   * @param {boolean} isBuying - True for buy, false for sell
   * @returns {boolean} True if sufficient supply/demand exists
   */
  public canTrade(resource: ResourceType, quantity: number, isBuying: boolean): boolean {
    const price = this.marketPrices.get(resource);
    if (!price) return false;
    
    if (isBuying) {
      return price.supply >= quantity;
    } else {
      return price.demand >= quantity;
    }
  }

  /**
   * Executes market trade and returns total cost.
   * @param {ResourceType} resource - Resource to trade
   * @param {number} quantity - Amount to trade
   * @param {boolean} isBuying - True for buy, false for sell
   * @returns {number} Total transaction cost in credits
   * @throws {Error} If resource unavailable or insufficient supply/demand
   * @sideEffect Updates market supply and demand
   */
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
/**
 * Empire model representing a player's galactic empire
 * Manages resources, production, planets, fleets, and technology
 */
class Empire {
  /**
   * Creates a new Empire instance
   * @param {Object} data - Empire initialization data
   * @param {string} data.id - Unique empire identifier
   * @param {string} data.playerId - Associated player ID
   * @param {string} data.name - Empire name
   * @param {Object} data.resources - Resource quantities
   * @param {Object} data.resourceProduction - Resource production rates
   * @param {Array} data.planets - Array of planet objects
   * @param {Array} data.fleets - Array of fleet objects
   * @param {Object} data.technology - Technology levels
   * @param {Object} data.diplomacy - Diplomatic relations
   */
  constructor(data = {}) {
    this.id = data.id || null;
    this.playerId = data.playerId || null;
    this.name = data.name || '';
    this.resources = {
      minerals: data.resources?.minerals || 1000,
      energy: data.resources?.energy || 1000,
      food: data.resources?.food || 1000,
      research: data.resources?.research || 0,
      population: data.resources?.population || 100
    };
    this.resourceProduction = {
      minerals: data.resourceProduction?.minerals || 50,
      energy: data.resourceProduction?.energy || 50,
      food: data.resourceProduction?.food || 50,
      research: data.resourceProduction?.research || 10,
      population: data.resourceProduction?.population || 5
    };
    this.planets = data.planets || [];
    this.fleets = data.fleets || [];
    this.technology = data.technology || {};
    this.diplomacy = data.diplomacy || {};
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  /**
   * Processes resource production for one turn
   * Adds production values to current resources
   */
  processResourceProduction() {
    for (const resource in this.resourceProduction) {
      this.resources[resource] += this.resourceProduction[resource];
    }
    this.updatedAt = new Date();
  }

  /**
   * Attempts to spend resources on a purchase
   * @param {Object} cost - Resource costs {minerals: number, energy: number, etc.}
   * @returns {boolean} True if resources were successfully spent
   */
  spendResources(cost) {
    for (const resource in cost) {
      if (this.resources[resource] < cost[resource]) {
        return false;
      }
    }
    
    for (const resource in cost) {
      this.resources[resource] -= cost[resource];
    }
    this.updatedAt = new Date();
    return true;
  }

  /**
   * Checks if empire can afford a given cost
   * @param {Object} cost - Resource costs to check
   * @returns {boolean} True if empire can afford the cost
   */
  canAfford(cost) {
    for (const resource in cost) {
      if (this.resources[resource] < cost[resource]) {
        return false;
      }
    }
    return true;
  }

  /**
   * Calculates total resource production including planet bonuses
   * @returns {Object} Total production rates for all resources
   */
  getTotalProduction() {
    const totalProduction = { ...this.resourceProduction };
    
    this.planets.forEach(planet => {
      for (const resource in planet.production) {
        totalProduction[resource] += planet.production[resource];
      }
    });
    
    return totalProduction;
  }

  addPlanet(planet) {
    this.planets.push(planet);
    this.updatedAt = new Date();
  }

  removePlanet(planetId) {
    this.planets = this.planets.filter(p => p.id !== planetId);
    this.updatedAt = new Date();
  }

  addFleet(fleet) {
    this.fleets.push(fleet);
    this.updatedAt = new Date();
  }

  removeFleet(fleetId) {
    this.fleets = this.fleets.filter(f => f.id !== fleetId);
    this.updatedAt = new Date();
  }

  /**
   * Converts empire to JSON representation
   * @returns {Object} JSON representation of empire
   */
  toJSON() {
    return {
      id: this.id,
      playerId: this.playerId,
      name: this.name,
      resources: this.resources,
      resourceProduction: this.resourceProduction,
      planets: this.planets,
      fleets: this.fleets,
      technology: this.technology,
      diplomacy: this.diplomacy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = Empire;
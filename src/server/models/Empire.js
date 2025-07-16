class Empire {
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

  processResourceProduction() {
    for (const resource in this.resourceProduction) {
      this.resources[resource] += this.resourceProduction[resource];
    }
    this.updatedAt = new Date();
  }

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

  canAfford(cost) {
    for (const resource in cost) {
      if (this.resources[resource] < cost[resource]) {
        return false;
      }
    }
    return true;
  }

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
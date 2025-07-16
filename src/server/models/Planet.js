/**
 * Planet model representing a colonized world
 * Manages population, buildings, production, and specialization
 */
class Planet {
  /**
   * Creates a new Planet instance
   * @param {Object} data - Planet initialization data
   * @param {string} data.id - Unique planet identifier
   * @param {string} data.empireId - Owning empire ID
   * @param {string} data.name - Planet name
   * @param {Object} data.position - 3D coordinates {x, y, z}
   * @param {string} data.size - Planet size (small, medium, large)
   * @param {string} data.type - Planet type (terrestrial, desert, ocean, etc.)
   * @param {string} data.specialization - Economic specialization
   * @param {number} data.population - Current population
   * @param {Array} data.buildings - Array of building objects
   */
  constructor(data = {}) {
    this.id = data.id || null;
    this.empireId = data.empireId || null;
    this.name = data.name || '';
    this.position = data.position || { x: 0, y: 0, z: 0 };
    this.size = data.size || 'medium';
    this.type = data.type || 'terrestrial';
    this.specialization = data.specialization || 'balanced';
    this.population = data.population || 0;
    this.maxPopulation = data.maxPopulation || 1000;
    this.buildings = data.buildings || [];
    this.production = data.production || {
      minerals: 0,
      energy: 0,
      food: 0,
      research: 0,
      population: 0
    };
    this.defenses = data.defenses || {
      shields: 0,
      armor: 0,
      weapons: 0
    };
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  static SPECIALIZATIONS = {
    mining: {
      name: 'Mining World',
      bonuses: { minerals: 2.0, energy: 1.2, food: 0.8, research: 0.9, population: 0.7 }
    },
    energy: {
      name: 'Energy Hub',
      bonuses: { minerals: 0.9, energy: 2.0, food: 0.8, research: 1.1, population: 0.8 }
    },
    agricultural: {
      name: 'Agricultural World',
      bonuses: { minerals: 0.8, energy: 0.9, food: 2.0, research: 0.8, population: 1.3 }
    },
    research: {
      name: 'Research Colony',
      bonuses: { minerals: 0.8, energy: 1.1, food: 0.9, research: 2.0, population: 1.0 }
    },
    industrial: {
      name: 'Industrial Center',
      bonuses: { minerals: 1.3, energy: 1.3, food: 0.9, research: 1.1, population: 1.1 }
    },
    fortress: {
      name: 'Fortress World',
      bonuses: { minerals: 1.0, energy: 1.0, food: 1.0, research: 0.8, population: 0.9 },
      defenseBonus: 2.0
    },
    balanced: {
      name: 'Balanced Colony',
      bonuses: { minerals: 1.0, energy: 1.0, food: 1.0, research: 1.0, population: 1.0 }
    }
  };

  static PLANET_TYPES = {
    terrestrial: { name: 'Terrestrial', habitabilityBonus: 1.0 },
    desert: { name: 'Desert', habitabilityBonus: 0.8, mineralBonus: 1.2 },
    ocean: { name: 'Ocean', habitabilityBonus: 1.1, foodBonus: 1.3 },
    arctic: { name: 'Arctic', habitabilityBonus: 0.7, energyBonus: 1.1 },
    volcanic: { name: 'Volcanic', habitabilityBonus: 0.6, mineralBonus: 1.5, energyBonus: 1.2 },
    gas_giant: { name: 'Gas Giant', habitabilityBonus: 0.0, energyBonus: 2.0 }
  };

  /**
   * Sets the planet's economic specialization
   * @param {string} specialization - New specialization type
   * @throws {Error} If specialization is invalid
   */
  setSpecialization(specialization) {
    if (!Planet.SPECIALIZATIONS[specialization]) {
      throw new Error(`Invalid specialization: ${specialization}`);
    }
    
    this.specialization = specialization;
    this.updateProduction();
    this.updatedAt = new Date();
  }

  /**
   * Recalculates production based on population, specialization, and buildings
   */
  updateProduction() {
    const baseProduction = {
      minerals: this.population * 0.5,
      energy: this.population * 0.5,
      food: this.population * 0.3,
      research: this.population * 0.2,
      population: this.population * 0.01
    };

    const spec = Planet.SPECIALIZATIONS[this.specialization];
    const planetType = Planet.PLANET_TYPES[this.type];
    
    for (const resource in baseProduction) {
      let production = baseProduction[resource];
      
      if (spec.bonuses[resource]) {
        production *= spec.bonuses[resource];
      }
      
      if (resource === 'food' && planetType.foodBonus) {
        production *= planetType.foodBonus;
      }
      if (resource === 'minerals' && planetType.mineralBonus) {
        production *= planetType.mineralBonus;
      }
      if (resource === 'energy' && planetType.energyBonus) {
        production *= planetType.energyBonus;
      }
      if (resource === 'population' && planetType.habitabilityBonus) {
        production *= planetType.habitabilityBonus;
      }
      
      this.production[resource] = Math.floor(production);
    }
    
    this.buildings.forEach(building => {
      for (const resource in building.production) {
        this.production[resource] += building.production[resource];
      }
    });
  }

  /**
   * Adds a building to the planet
   * @param {Object} building - Building object to add
   */
  addBuilding(building) {
    this.buildings.push(building);
    this.updateProduction();
    this.updatedAt = new Date();
  }

  removeBuilding(buildingId) {
    this.buildings = this.buildings.filter(b => b.id !== buildingId);
    this.updateProduction();
    this.updatedAt = new Date();
  }

  growPopulation(amount) {
    this.population = Math.min(this.population + amount, this.maxPopulation);
    this.updateProduction();
    this.updatedAt = new Date();
  }

  updateDefenses() {
    this.defenses = {
      shields: 0,
      armor: 0,
      weapons: 0
    };
    
    this.buildings.forEach(building => {
      if (building.defenses) {
        for (const defense in building.defenses) {
          this.defenses[defense] += building.defenses[defense];
        }
      }
    });
    
    if (this.specialization === 'fortress') {
      const spec = Planet.SPECIALIZATIONS.fortress;
      for (const defense in this.defenses) {
        this.defenses[defense] *= spec.defenseBonus;
      }
    }
  }

  /**
   * Calculates total defensive strength
   * @returns {number} Combined defense value
   */
  getDefenseStrength() {
    return this.defenses.shields + this.defenses.armor + this.defenses.weapons;
  }

  toJSON() {
    return {
      id: this.id,
      empireId: this.empireId,
      name: this.name,
      position: this.position,
      size: this.size,
      type: this.type,
      specialization: this.specialization,
      population: this.population,
      maxPopulation: this.maxPopulation,
      buildings: this.buildings,
      production: this.production,
      defenses: this.defenses,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = Planet;
/**
 * Territory Expansion Service for SpaceCommand
 * Handles exploration, colonization, and territory management mechanics
 */

const BaseModel = require('../models/BaseModel');
const { GameError, ValidationError } = require('../middleware/errorHandler');

class TerritoryExpansion {
  constructor() {
    this.planetModel = new BaseModel('planets');
    this.empireModel = new BaseModel('empires');
    this.fleetModel = new BaseModel('fleets');
    
    // Planet generation parameters
    this.PLANET_TYPES = {
      mining: { 
        probability: 0.20, 
        base_resources: { metal: 200, energy: 50, food: 30 },
        colonization_cost: { metal: 500, energy: 200, food: 100 }
      },
      energy: { 
        probability: 0.15, 
        base_resources: { metal: 50, energy: 300, food: 40 },
        colonization_cost: { metal: 400, energy: 300, food: 150 }
      },
      agricultural: { 
        probability: 0.18, 
        base_resources: { metal: 30, energy: 60, food: 250 },
        colonization_cost: { metal: 300, energy: 150, food: 200 }
      },
      research: { 
        probability: 0.12, 
        base_resources: { metal: 80, energy: 100, food: 50 },
        colonization_cost: { metal: 600, energy: 400, food: 200 }
      },
      industrial: { 
        probability: 0.15, 
        base_resources: { metal: 150, energy: 120, food: 80 },
        colonization_cost: { metal: 700, energy: 300, food: 250 }
      },
      fortress: { 
        probability: 0.08, 
        base_resources: { metal: 100, energy: 100, food: 100 },
        colonization_cost: { metal: 800, energy: 500, food: 300 }
      },
      balanced: { 
        probability: 0.12, 
        base_resources: { metal: 100, energy: 100, food: 100 },
        colonization_cost: { metal: 500, energy: 300, food: 200 }
      }
    };

    // Sector properties
    this.SECTOR_SIZE = 10; // 10x10 grid of potential planets
    this.PLANETS_PER_SECTOR = 3; // Average planets per sector
    this.EXPLORATION_COSTS = {
      scout: { metal: 20, energy: 30, food: 10 },
      survey: { metal: 50, energy: 80, food: 25 },
      deep_scan: { metal: 100, energy: 150, food: 50 }
    };

    // Colonization requirements
    this.MIN_FLEET_FOR_COLONIZATION = {
      scout: 2,
      corvette: 1
    };

    this.COLONIZATION_TIME_HOURS = 24; // 24 hours to establish colony
    this.MAX_COLONIES_PER_EMPIRE = 20; // Limit to prevent overwhelming
  }

  /**
   * Explores a sector to discover planets
   * @param {number} empireId - Empire conducting exploration
   * @param {string} sectorCoordinates - Sector coordinates (e.g., "5,3")
   * @param {string} explorationType - Type of exploration (scout, survey, deep_scan)
   * @returns {Promise<Object>} Exploration results
   */
  async exploreSector(empireId, sectorCoordinates, explorationType = 'scout') {
    if (!this.EXPLORATION_COSTS[explorationType]) {
      throw new ValidationError(`Invalid exploration type: ${explorationType}`);
    }

    const empire = await this.empireModel.findById(empireId);
    if (!empire) {
      throw new ValidationError('Empire not found');
    }

    // Check if sector already explored
    const existingPlanets = await this.planetModel.find({
      sector_coordinates: sectorCoordinates
    });

    if (existingPlanets.length > 0) {
      return {
        sector_coordinates: sectorCoordinates,
        already_explored: true,
        planets_found: existingPlanets.map(p => ({
          id: p.id,
          name: p.name,
          planet_type: p.planet_type,
          empire_id: p.empire_id,
          status: p.empire_id ? 'colonized' : 'available'
        }))
      };
    }

    // Check exploration costs
    const costs = this.EXPLORATION_COSTS[explorationType];
    if (empire.metal < costs.metal || empire.energy < costs.energy || empire.food < costs.food) {
      throw new ValidationError('Insufficient resources for exploration');
    }

    return await this.empireModel.transaction(async (client) => {
      // Deduct exploration costs
      await this.empireModel.update(empireId, {
        metal: empire.metal - costs.metal,
        energy: empire.energy - costs.energy,
        food: empire.food - costs.food
      }, client);

      // Generate planets in sector
      const planetsFound = await this._generateSectorPlanets(sectorCoordinates, explorationType, client);

      return {
        empire_id: empireId,
        sector_coordinates: sectorCoordinates,
        exploration_type: explorationType,
        cost_paid: costs,
        planets_found: planetsFound.length,
        planets: planetsFound,
        explored_at: new Date().toISOString()
      };
    });
  }

  /**
   * Attempts to colonize a planet
   * @param {number} empireId - Empire attempting colonization
   * @param {number} planetId - Planet to colonize
   * @param {number} fleetId - Fleet conducting colonization
   * @returns {Promise<Object>} Colonization result
   */
  async colonizePlanet(empireId, planetId, fleetId) {
    const [empire, planet, fleet] = await Promise.all([
      this.empireModel.findById(empireId),
      this.planetModel.findById(planetId),
      this.fleetModel.findById(fleetId)
    ]);

    if (!empire || !planet || !fleet) {
      throw new ValidationError('Empire, planet, or fleet not found');
    }

    // Validate colonization requirements
    this._validateColonizationRequirements(empire, planet, fleet);

    const planetType = planet.planet_type;
    const costs = this.PLANET_TYPES[planetType].colonization_cost;

    return await this.empireModel.transaction(async (client) => {
      // Check current colony count
      const currentColonies = await this.planetModel.count({ empire_id: empireId });
      if (currentColonies >= this.MAX_COLONIES_PER_EMPIRE) {
        throw new ValidationError(`Maximum colonies reached (${this.MAX_COLONIES_PER_EMPIRE})`);
      }

      // Deduct colonization costs
      await this.empireModel.update(empireId, {
        metal: empire.metal - costs.metal,
        energy: empire.energy - costs.energy,
        food: empire.food - costs.food
      }, client);

      // Update planet ownership
      const colonizedPlanet = await this.planetModel.update(planetId, {
        empire_id: empireId,
        status: 'colonizing',
        colonization_started: new Date().toISOString(),
        colonization_completed: new Date(Date.now() + (this.COLONIZATION_TIME_HOURS * 60 * 60 * 1000)).toISOString(),
        buildings: JSON.stringify({}),
        population: 1000 // Starting population
      }, client);

      // Update fleet status
      await this.fleetModel.update(fleetId, {
        status: 'colonizing',
        action_until: new Date(Date.now() + (this.COLONIZATION_TIME_HOURS * 60 * 60 * 1000)).toISOString()
      }, client);

      return {
        empire_id: empireId,
        planet: colonizedPlanet,
        fleet_id: fleetId,
        colonization_cost: costs,
        completion_time: colonizedPlanet.colonization_completed,
        status: 'colonization_started'
      };
    });
  }

  /**
   * Completes colonization process for planets that are ready
   * @returns {Promise<Array>} Completed colonizations
   */
  async processColonizationCompletion() {
    const colonizingPlanets = await this.planetModel.find({
      status: 'colonizing'
    });

    const completedColonizations = [];
    const now = new Date();

    for (const planet of colonizingPlanets) {
      const completionTime = new Date(planet.colonization_completed);
      
      if (now >= completionTime) {
        try {
          const result = await this._completeColonization(planet);
          completedColonizations.push(result);
        } catch (error) {
          console.error(`Error completing colonization for planet ${planet.id}:`, error);
        }
      }
    }

    return completedColonizations;
  }

  /**
   * Abandons a colony and returns partial resources
   * @param {number} empireId - Empire abandoning colony
   * @param {number} planetId - Planet to abandon
   * @returns {Promise<Object>} Abandonment result
   */
  async abandonColony(empireId, planetId) {
    const [empire, planet] = await Promise.all([
      this.empireModel.findById(empireId),
      this.planetModel.findById(planetId)
    ]);

    if (!empire || !planet) {
      throw new ValidationError('Empire or planet not found');
    }

    if (planet.empire_id !== empireId) {
      throw new ValidationError('You can only abandon your own colonies');
    }

    return await this.empireModel.transaction(async (client) => {
      // Calculate resource recovery (50% of buildings)
      const buildings = JSON.parse(planet.buildings || '{}');
      let resourceRecovery = { metal: 0, energy: 0, food: 0 };

      // Calculate building value and return 50%
      for (const [buildingType, count] of Object.entries(buildings)) {
        // Assume each building costs 100 metal base
        resourceRecovery.metal += count * 50;
      }

      // Update empire resources
      await this.empireModel.update(empireId, {
        metal: empire.metal + resourceRecovery.metal,
        energy: empire.energy + resourceRecovery.energy,
        food: empire.food + resourceRecovery.food
      }, client);

      // Reset planet to uncolonized state
      await this.planetModel.update(planetId, {
        empire_id: null,
        status: 'available',
        buildings: JSON.stringify({}),
        population: 0,
        colonization_started: null,
        colonization_completed: null
      }, client);

      return {
        empire_id: empireId,
        planet_id: planetId,
        resources_recovered: resourceRecovery,
        abandoned_at: new Date().toISOString()
      };
    });
  }

  /**
   * Gets territory information for an empire
   * @param {number} empireId - Empire ID
   * @returns {Promise<Object>} Territory information
   */
  async getTerritoryInfo(empireId) {
    const colonies = await this.planetModel.find({ empire_id: empireId });
    const empire = await this.empireModel.findById(empireId);

    if (!empire) {
      throw new ValidationError('Empire not found');
    }

    let totalProduction = { metal: 0, energy: 0, food: 0, research: 0 };
    let totalPopulation = 0;
    let territoryValue = 0;

    const colonyDetails = colonies.map(planet => {
      const planetType = this.PLANET_TYPES[planet.planet_type];
      const baseResources = planetType.base_resources;
      const population = planet.population || 0;
      
      totalPopulation += population;
      territoryValue += planetType.colonization_cost.metal;
      
      for (const [resource, amount] of Object.entries(baseResources)) {
        if (totalProduction[resource] !== undefined) {
          totalProduction[resource] += amount;
        }
      }

      return {
        planet_id: planet.id,
        name: planet.name,
        planet_type: planet.planet_type,
        sector_coordinates: planet.sector_coordinates,
        population: population,
        status: planet.status,
        buildings: JSON.parse(planet.buildings || '{}'),
        base_production: baseResources
      };
    });

    return {
      empire_id: empireId,
      total_colonies: colonies.length,
      max_colonies: this.MAX_COLONIES_PER_EMPIRE,
      total_population: totalPopulation,
      territory_value: territoryValue,
      total_base_production: totalProduction,
      colonies: colonyDetails,
      expansion_efficiency: this._calculateExpansionEfficiency(colonies.length)
    };
  }

  /**
   * Scans nearby sectors for exploration opportunities
   * @param {string} centerSector - Center sector coordinates
   * @param {number} range - Scan range in sectors
   * @returns {Promise<Object>} Scan results
   */
  async scanNearbyTerritory(centerSector, range = 2) {
    const [centerX, centerY] = centerSector.split(',').map(Number);
    const scannedSectors = [];

    for (let x = centerX - range; x <= centerX + range; x++) {
      for (let y = centerY - range; y <= centerY + range; y++) {
        const sectorCoords = `${x},${y}`;
        const planets = await this.planetModel.find({ sector_coordinates: sectorCoords });
        
        scannedSectors.push({
          coordinates: sectorCoords,
          distance: Math.abs(x - centerX) + Math.abs(y - centerY),
          explored: planets.length > 0,
          planet_count: planets.length,
          colonized_planets: planets.filter(p => p.empire_id).length,
          available_planets: planets.filter(p => !p.empire_id).length
        });
      }
    }

    return {
      center_sector: centerSector,
      scan_range: range,
      sectors_scanned: scannedSectors.length,
      sectors: scannedSectors.sort((a, b) => a.distance - b.distance)
    };
  }

  /**
   * Generates planets in a sector during exploration
   * @param {string} sectorCoordinates - Sector coordinates
   * @param {string} explorationType - Type of exploration
   * @param {Object} client - Database client
   * @returns {Promise<Array>} Generated planets
   * @private
   */
  async _generateSectorPlanets(sectorCoordinates, explorationType, client) {
    // Determine number of planets based on exploration type
    let planetCount;
    if (explorationType === 'scout') {
      planetCount = Math.floor(Math.random() * 3) + 1; // 1-3 planets
    } else if (explorationType === 'survey') {
      planetCount = Math.floor(Math.random() * 4) + 2; // 2-5 planets
    } else { // deep_scan
      planetCount = Math.floor(Math.random() * 5) + 3; // 3-7 planets
    }

    const planets = [];
    
    for (let i = 0; i < planetCount; i++) {
      const planetType = this._selectRandomPlanetType();
      const planetName = this._generatePlanetName(sectorCoordinates, i);
      
      const planet = await this.planetModel.create({
        name: planetName,
        planet_type: planetType,
        sector_coordinates: sectorCoordinates,
        coordinates: `${sectorCoordinates}:${i}`,
        status: 'available',
        empire_id: null,
        population: 0,
        buildings: JSON.stringify({})
      }, client);

      planets.push({
        id: planet.id,
        name: planet.name,
        planet_type: planet.planet_type,
        coordinates: planet.coordinates,
        colonization_cost: this.PLANET_TYPES[planetType].colonization_cost,
        base_resources: this.PLANET_TYPES[planetType].base_resources
      });
    }

    return planets;
  }

  /**
   * Completes a colonization process
   * @param {Object} planet - Planet being colonized
   * @returns {Promise<Object>} Completion result
   * @private
   */
  async _completeColonization(planet) {
    return await this.planetModel.transaction(async (client) => {
      // Update planet status to active
      const updatedPlanet = await this.planetModel.update(planet.id, {
        status: 'active',
        population: 2000 // Population grows during colonization
      }, client);

      // Find and update colonizing fleet
      const fleet = await this.fleetModel.findOne({
        status: 'colonizing',
        location: planet.sector_coordinates
      });

      if (fleet) {
        await this.fleetModel.update(fleet.id, {
          status: 'active',
          action_until: null
        }, client);
      }

      return {
        planet: updatedPlanet,
        fleet_id: fleet ? fleet.id : null,
        completed_at: new Date().toISOString()
      };
    });
  }

  /**
   * Validates colonization requirements
   * @param {Object} empire - Empire data
   * @param {Object} planet - Planet data
   * @param {Object} fleet - Fleet data
   * @private
   */
  _validateColonizationRequirements(empire, planet, fleet) {
    if (planet.empire_id) {
      throw new ValidationError('Planet is already colonized');
    }

    if (fleet.empire_id !== empire.id) {
      throw new ValidationError('Fleet does not belong to your empire');
    }

    if (fleet.status !== 'active') {
      throw new ValidationError('Fleet is not available for colonization');
    }

    if (fleet.location !== planet.sector_coordinates) {
      throw new ValidationError('Fleet must be in the same sector as the planet');
    }

    // Check fleet composition requirements
    const composition = JSON.parse(fleet.composition || '{}');
    let hasRequiredShips = false;

    for (const [shipType, requiredCount] of Object.entries(this.MIN_FLEET_FOR_COLONIZATION)) {
      if ((composition[shipType] || 0) >= requiredCount) {
        hasRequiredShips = true;
        break;
      }
    }

    if (!hasRequiredShips) {
      throw new ValidationError('Fleet does not meet minimum requirements for colonization');
    }

    // Check colonization costs
    const planetType = planet.planet_type;
    const costs = this.PLANET_TYPES[planetType].colonization_cost;

    if (empire.metal < costs.metal || empire.energy < costs.energy || empire.food < costs.food) {
      throw new ValidationError('Insufficient resources for colonization');
    }
  }

  /**
   * Selects a random planet type based on probabilities
   * @returns {string} Selected planet type
   * @private
   */
  _selectRandomPlanetType() {
    const random = Math.random();
    let cumulativeProbability = 0;

    for (const [planetType, config] of Object.entries(this.PLANET_TYPES)) {
      cumulativeProbability += config.probability;
      if (random <= cumulativeProbability) {
        return planetType;
      }
    }

    return 'balanced'; // Fallback
  }

  /**
   * Generates a planet name
   * @param {string} sectorCoordinates - Sector coordinates
   * @param {number} planetIndex - Planet index in sector
   * @returns {string} Generated planet name
   * @private
   */
  _generatePlanetName(sectorCoordinates, planetIndex) {
    const prefixes = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta'];
    const suffixes = ['Prime', 'Minor', 'Major', 'Nova', 'Proxima', 'Ultima', 'Central', 'Outer'];
    
    const prefix = prefixes[planetIndex % prefixes.length];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    
    return `${prefix} ${sectorCoordinates.replace(',', '-')} ${suffix}`;
  }

  /**
   * Calculates expansion efficiency based on colony count
   * @param {number} colonyCount - Number of colonies
   * @returns {number} Expansion efficiency (0-1)
   * @private
   */
  _calculateExpansionEfficiency(colonyCount) {
    if (colonyCount === 0) return 1.0;
    
    // Efficiency decreases with more colonies (administration overhead)
    const baseEfficiency = 1.0;
    const overheadPenalty = colonyCount * 0.02; // 2% penalty per colony
    
    return Math.max(0.5, baseEfficiency - overheadPenalty);
  }
}

module.exports = TerritoryExpansion;
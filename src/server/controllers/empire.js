/**
 * Empire management controller for resources, planets, and empire overview
 */
const { validationResult } = require('express-validator');
const Empire = require('../models/Empire');
const Planet = require('../models/Planet');
const { ValidationError, NotFoundError, ConflictError, InsufficientResourcesError } = require('../middleware/errorHandler');
const { consumeActionPoints } = require('../middleware/gameState');

// Import resource calculator
const ResourceCalculator = require('../services/ResourceCalculator');
const resourceCalculator = new ResourceCalculator();

/**
 * Get current empire status and overview
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function getEmpireStatus(req, res, next) {
  try {
    // Empire is already validated and attached by requireOwnEmpire middleware
    const empire = req.userEmpire;

    // Get detailed resource calculations from ResourceCalculator
    const [production, consumption, netResources] = await Promise.all([
      resourceCalculator.calculateProduction(empire.id),
      resourceCalculator.calculateConsumption(empire.id),
      resourceCalculator.calculateNetResources(empire.id)
    ]);
    
    res.set({
      'ETag': `"${empire.id}-${empire.updated_at}"`,
      'Last-Modified': new Date(empire.updated_at).toUTCString()
    });

    res.status(200).json({
      id: empire.id,
      name: empire.name,
      resources: {
        metal: empire.metal || 0,
        energy: empire.energy || 0,
        food: empire.food || 0,
        research: empire.research || 0
      },
      production: {
        total: production.total_production,
        breakdown: production.breakdown,
        calculated_at: production.calculated_at
      },
      consumption: {
        total: consumption.total_consumption,
        breakdown: consumption.breakdown,
        calculated_at: consumption.calculated_at
      },
      net_resources: {
        net_change: netResources.net_change,
        efficiency: netResources.efficiency,
        is_sustainable: netResources.is_sustainable
      },
      last_resource_update: empire.last_resource_update,
      created_at: empire.created_at,
      updated_at: empire.updated_at
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update empire name
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function updateEmpireName(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Invalid input data', { 
        fields: errors.array().map(err => ({ 
          field: err.path, 
          message: err.msg 
        }))
      });
    }

    const { name } = req.body;
    const empire = await Empire.findByPlayerId(req.user.id);
    if (!empire) {
      throw new NotFoundError('Empire not found');
    }

    empire.name = name;
    empire.updatedAt = new Date();
    await empire.save();

    await consumeActionPoints(req, 'rename_empire');

    res.status(200).json({
      id: empire.id,
      name: empire.name,
      updatedAt: empire.updatedAt
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get empire planets
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function getPlanets(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Invalid query parameters', { 
        fields: errors.array().map(err => ({ 
          field: err.path, 
          message: err.msg 
        }))
      });
    }

    const empire = await Empire.findByPlayerId(req.user.id);
    if (!empire) {
      throw new NotFoundError('Empire not found');
    }

    const { specialization, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // Get planets with optional filtering
    let planets = empire.planets;
    
    if (specialization) {
      planets = planets.filter(planet => planet.specialization === specialization);
    }

    // Apply pagination
    const totalPlanets = planets.length;
    const paginatedPlanets = planets.slice(offset, offset + parseInt(limit));

    // Transform planets for response
    const planetData = paginatedPlanets.map(planet => ({
      id: planet.id,
      name: planet.name,
      location: planet.location,
      specialization: planet.specialization,
      population: planet.population,
      buildings: planet.buildings,
      production: planet.calculateProduction(),
      buildQueue: planet.buildQueue,
      createdAt: planet.createdAt,
      updatedAt: planet.updatedAt
    }));

    res.status(200).json({
      planets: planetData,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalPlanets,
        pages: Math.ceil(totalPlanets / limit)
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get detailed information about a specific planet
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function getPlanetDetails(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Invalid parameters', { 
        fields: errors.array().map(err => ({ 
          field: err.path, 
          message: err.msg 
        }))
      });
    }

    // Planet and empire are already validated and attached by requireOwnPlanet middleware
    const planet = req.userPlanet;

    res.set({
      'ETag': `"${planet.id}-${planet.updatedAt.getTime()}"`,
      'Last-Modified': planet.updatedAt.toUTCString()
    });

    res.status(200).json({
      id: planet.id,
      name: planet.name,
      location: planet.location,
      specialization: planet.specialization,
      population: planet.population,
      maxPopulation: planet.maxPopulation,
      buildings: planet.buildings,
      maxBuildings: planet.maxBuildings,
      production: planet.calculateProduction(),
      buildQueue: planet.buildQueue,
      defenses: planet.defenses,
      environment: planet.environment,
      createdAt: planet.createdAt,
      updatedAt: planet.updatedAt
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Set or change planet specialization
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function updatePlanetSpecialization(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Invalid input data', { 
        fields: errors.array().map(err => ({ 
          field: err.path, 
          message: err.msg 
        }))
      });
    }

    const { specialization } = req.body;
    // Empire and planet are already validated and attached by middleware
    const empire = req.userEmpire;
    const planet = req.userPlanet;

    if (planet.specialization === specialization) {
      throw new ConflictError('Planet already has that specialization');
    }

    // Change specialization
    planet.changeSpecialization(specialization);
    empire.updatedAt = new Date();
    await empire.save();

    await consumeActionPoints(req, 'change_planet_specialization');

    res.status(200).json({
      id: planet.id,
      name: planet.name,
      specialization: planet.specialization,
      production: planet.calculateProduction(),
      updatedAt: planet.updatedAt
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Construct buildings on a planet
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function constructBuildings(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Invalid input data', { 
        fields: errors.array().map(err => ({ 
          field: err.path, 
          message: err.msg 
        }))
      });
    }

    const { buildingType, quantity } = req.body;
    const empire = await Empire.findByPlayerId(req.user.id);
    if (!empire) {
      throw new NotFoundError('Empire not found');
    }

    const planet = empire.planets.find(p => p.id === req.params.id);
    if (!planet) {
      throw new NotFoundError('Planet not found or not owned');
    }

    // Calculate building costs
    const buildingCosts = planet.getBuildingCosts(buildingType, quantity);
    
    // Check if empire has sufficient resources
    if (!empire.hasResources(buildingCosts)) {
      throw new InsufficientResourcesError('Insufficient resources for construction', {
        required: buildingCosts,
        available: empire.resources
      });
    }

    // Check if planet has building space
    if (!planet.canBuild(buildingType, quantity)) {
      throw new ConflictError('Insufficient building space or invalid building for planet type');
    }

    // Deduct resources
    empire.consumeResources(buildingCosts);
    
    // Add to build queue
    const buildOrder = planet.addToBuildQueue(buildingType, quantity);
    
    empire.updatedAt = new Date();
    await empire.save();

    await consumeActionPoints(req, 'construct_buildings');

    res.set('Location', `/api/planets/${planet.id}/buildings/${buildOrder.id}`);
    res.status(201).json({
      orderId: buildOrder.id,
      buildingType: buildOrder.buildingType,
      quantity: buildOrder.quantity,
      cost: buildingCosts,
      completionTime: buildOrder.completionTime,
      planet: {
        id: planet.id,
        name: planet.name,
        buildQueue: planet.buildQueue
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get empire resources
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function getResources(req, res, next) {
  try {
    const empire = await Empire.findByPlayerId(req.user.id);
    if (!empire) {
      throw new NotFoundError('Empire not found');
    }

    const resourceSummary = empire.calculateCurrentResources();
    
    // Get resource breakdown by planet
    const planetBreakdown = empire.planets.map(planet => ({
      planetId: planet.id,
      planetName: planet.name,
      specialization: planet.specialization,
      production: planet.calculateProduction(),
      consumption: planet.calculateConsumption()
    }));

    // Get fleet maintenance costs
    const fleetMaintenance = empire.calculateFleetMaintenance();

    res.status(200).json({
      current: resourceSummary.current,
      production: resourceSummary.production,
      consumption: resourceSummary.consumption,
      netProduction: resourceSummary.net,
      breakdown: {
        planets: planetBreakdown,
        fleetMaintenance,
        totalPlanets: empire.planets.length,
        totalFleets: empire.fleets.length
      },
      projections: {
        oneHour: empire.projectResources(1),
        sixHours: empire.projectResources(6),
        twentyFourHours: empire.projectResources(24)
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Transfer resources between planets (future feature)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function transferResources(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Invalid input data', { 
        fields: errors.array().map(err => ({ 
          field: err.path, 
          message: err.msg 
        }))
      });
    }

    // This is a placeholder for future implementation
    // Would involve trade routes, transport fleets, etc.
    throw new Error('Resource transfer not yet implemented');
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getEmpireStatus,
  updateEmpireName,
  getPlanets,
  getPlanetDetails,
  updatePlanetSpecialization,
  constructBuildings,
  getResources,
  transferResources
};
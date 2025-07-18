/**
 * Empire management routes for resources, planets, and empire overview
 */
const express = require('express');
const { body, query, param, validationResult } = require('express-validator');

const Empire = require('../models/Empire');
const Planet = require('../models/Planet');
const { ValidationError, NotFoundError, ConflictError, InsufficientResourcesError } = require('../middleware/errorHandler');
const { requireActionPoints, consumeActionPoints } = require('../middleware/gameState');
const { requireOwnEmpire, requireOwnPlanet } = require('../middleware/resourceAuth');

// Import resource calculator
const ResourceCalculator = require('../services/ResourceCalculator');
const resourceCalculator = new ResourceCalculator();

const router = express.Router();

/**
 * GET /api/empire
 * Get current empire status and overview
 */
router.get('/empire', requireOwnEmpire, async (req, res, next) => {
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
});

/**
 * PUT /api/empire/name
 * Update empire name
 */
router.put('/empire/name', requireActionPoints(1), [
  body('name')
    .isLength({ min: 3, max: 50 })
    .matches(/^[a-zA-Z0-9\s\-_'\.]+$/)
    .withMessage('Empire name must be 3-50 characters, alphanumeric and basic punctuation only')
], async (req, res, next) => {
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
});

/**
 * GET /api/planets
 * List all controlled planets with details
 */
router.get('/planets', [
  query('specialization')
    .optional()
    .isIn(['mining', 'energy', 'agricultural', 'research', 'industrial', 'fortress', 'balanced'])
    .withMessage('Invalid specialization filter'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100')
], async (req, res, next) => {
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
});

/**
 * GET /api/planets/:id
 * Get detailed information about a specific planet
 */
router.get('/planets/:id', [
  param('id').isUUID().withMessage('Invalid planet ID format')
], requireOwnPlanet(), async (req, res, next) => {
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
});

/**
 * PUT /api/planets/:id/specialization
 * Set or change planet specialization
 */
router.put('/planets/:id/specialization', requireActionPoints(2), [
  param('id').isUUID().withMessage('Invalid planet ID format'),
  body('specialization')
    .isIn(['mining', 'energy', 'agricultural', 'research', 'industrial', 'fortress', 'balanced'])
    .withMessage('Invalid specialization type')
], requireOwnPlanet(), async (req, res, next) => {
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
});

/**
 * POST /api/planets/:id/buildings
 * Construct buildings on a planet
 */
router.post('/planets/:id/buildings', requireActionPoints(1), [
  param('id').isUUID().withMessage('Invalid planet ID format'),
  body('buildingType')
    .isIn(['mine', 'power_plant', 'farm', 'research_lab', 'factory', 'defense_grid', 'spaceport', 'habitat'])
    .withMessage('Invalid building type'),
  body('quantity').isInt({ min: 1, max: 10 }).withMessage('Quantity must be 1-10')
], async (req, res, next) => {
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
});

/**
 * GET /api/resources
 * Get detailed resource inventory and production rates
 */
router.get('/resources', async (req, res, next) => {
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
});

/**
 * POST /api/resources/transfer
 * Transfer resources between planets (future feature)
 */
router.post('/resources/transfer', requireActionPoints(1), [
  body('fromPlanetId').isUUID().withMessage('Invalid source planet ID'),
  body('toPlanetId').isUUID().withMessage('Invalid destination planet ID'),
  body('resources').isObject().withMessage('Resources must be an object'),
  body('resources.minerals').optional().isInt({ min: 0 }).withMessage('Invalid minerals amount'),
  body('resources.energy').optional().isInt({ min: 0 }).withMessage('Invalid energy amount'),
  body('resources.food').optional().isInt({ min: 0 }).withMessage('Invalid food amount')
], async (req, res, next) => {
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
});

module.exports = router;
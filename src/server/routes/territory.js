/**
 * Territory and expansion routes for sectors, colonization, and trade routes
 */
const express = require('express');
const { body, query, param, validationResult } = require('express-validator');

const Empire = require('../models/Empire');
const { ValidationError, NotFoundError, ConflictError, InsufficientResourcesError } = require('../middleware/errorHandler');
const { requireActionPoints, consumeActionPoints } = require('../middleware/gameState');

const router = express.Router();

/**
 * GET /api/sectors
 * Get galaxy map data and sector information
 */
router.get('/sectors', [
  query('region')
    .optional()
    .isIn(['core', 'inner', 'outer', 'frontier', 'unknown'])
    .withMessage('Invalid region filter'),
  query('controlled')
    .optional()
    .isBoolean()
    .withMessage('Controlled filter must be boolean'),
  query('x1').optional().isInt().withMessage('X1 coordinate must be integer'),
  query('y1').optional().isInt().withMessage('Y1 coordinate must be integer'),
  query('x2').optional().isInt().withMessage('X2 coordinate must be integer'),
  query('y2').optional().isInt().withMessage('Y2 coordinate must be integer'),
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

    const userEmpire = await Empire.findByPlayerId(req.user.id);
    if (!userEmpire) {
      throw new NotFoundError('Empire not found');
    }

    const { region, controlled, x1, y1, x2, y2, page = 1, limit = 50 } = req.query;
    
    // Build query parameters for sector lookup
    const sectorQuery = {
      empireId: userEmpire.id,
      region,
      controlled: controlled !== undefined ? controlled === 'true' : undefined,
      bounds: (x1 !== undefined && y1 !== undefined && x2 !== undefined && y2 !== undefined) 
        ? { x1: parseInt(x1), y1: parseInt(y1), x2: parseInt(x2), y2: parseInt(y2) }
        : undefined,
      page: parseInt(page),
      limit: parseInt(limit)
    };

    // Get sectors based on query (this would interface with a galaxy/sector service)
    const sectors = await getSectors(sectorQuery);

    // Transform sectors for response
    const sectorData = sectors.map(sector => ({
      coordinates: sector.coordinates,
      name: sector.name,
      region: sector.region,
      controlledBy: sector.controlledBy,
      isControlled: sector.controlledBy === userEmpire.id,
      planets: sector.planets.map(planet => ({
        id: planet.id,
        name: planet.name,
        type: planet.type,
        size: planet.size,
        resources: planet.resources,
        habitability: planet.habitability,
        isColonized: !!planet.ownerId,
        ownerId: planet.ownerId
      })),
      fleets: sector.getVisibleFleets(userEmpire.id),
      strategicValue: sector.strategicValue,
      tradeRoutes: sector.tradeRoutes.filter(route => 
        route.empireId === userEmpire.id || route.isPublic
      ),
      exploration: {
        isExplored: sector.isExploredBy(userEmpire.id),
        explorationLevel: sector.getExplorationLevel(userEmpire.id),
        lastScanned: sector.getLastScanTime(userEmpire.id)
      }
    }));

    res.status(200).json({
      sectors: sectorData,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: sectors.length
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/sectors/:coordinates
 * Get detailed information about a specific sector
 */
router.get('/sectors/:coordinates', [
  param('coordinates')
    .matches(/^\d+,\d+$/)
    .withMessage('Coordinates must be in format "x,y"')
], async (req, res, next) => {
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

    const userEmpire = await Empire.findByPlayerId(req.user.id);
    if (!userEmpire) {
      throw new NotFoundError('Empire not found');
    }

    const coordinates = req.params.coordinates;
    const sector = await getSectorByCoordinates(coordinates);
    
    if (!sector) {
      throw new NotFoundError('Sector not found');
    }

    // Check if empire has explored this sector
    const isExplored = sector.isExploredBy(userEmpire.id);
    const explorationLevel = sector.getExplorationLevel(userEmpire.id);

    // Return different levels of detail based on exploration
    let sectorData = {
      coordinates: sector.coordinates,
      name: sector.name,
      region: sector.region,
      isExplored,
      explorationLevel
    };

    if (isExplored) {
      sectorData = {
        ...sectorData,
        controlledBy: sector.controlledBy,
        isControlled: sector.controlledBy === userEmpire.id,
        planets: sector.planets.map(planet => ({
          id: planet.id,
          name: planet.name,
          type: planet.type,
          size: planet.size,
          resources: explorationLevel >= 2 ? planet.resources : null,
          habitability: planet.habitability,
          isColonized: !!planet.ownerId,
          ownerId: planet.ownerId,
          population: planet.ownerId === userEmpire.id ? planet.population : null,
          buildings: planet.ownerId === userEmpire.id ? planet.buildings : null,
          defenses: explorationLevel >= 3 ? planet.defenses : null
        })),
        fleets: sector.getVisibleFleets(userEmpire.id),
        strategicValue: explorationLevel >= 2 ? sector.strategicValue : null,
        resources: explorationLevel >= 2 ? sector.resources : null,
        tradeRoutes: sector.tradeRoutes.filter(route => 
          route.empireId === userEmpire.id || route.isPublic
        ),
        jumpGates: explorationLevel >= 3 ? sector.jumpGates : [],
        anomalies: explorationLevel >= 2 ? sector.anomalies : []
      };
    }

    res.set({
      'ETag': `"${sector.coordinates}-${sector.updatedAt.getTime()}"`,
      'Last-Modified': sector.updatedAt.toUTCString()
    });

    res.status(200).json(sectorData);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/sectors/:coordinates/explore
 * Send exploration mission to a sector
 */
router.post('/sectors/:coordinates/explore', requireActionPoints(2), [
  param('coordinates')
    .matches(/^\d+,\d+$/)
    .withMessage('Coordinates must be in format "x,y"'),
  body('fleetId').isUUID().withMessage('Invalid fleet ID'),
  body('explorationType')
    .optional()
    .isIn(['basic', 'detailed', 'deep_scan'])
    .withMessage('Invalid exploration type')
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

    const { fleetId, explorationType = 'basic' } = req.body;
    const coordinates = req.params.coordinates;
    
    const userEmpire = await Empire.findByPlayerId(req.user.id);
    if (!userEmpire) {
      throw new NotFoundError('Empire not found');
    }

    const fleet = userEmpire.fleets.find(f => f.id === fleetId);
    if (!fleet) {
      throw new NotFoundError('Fleet not found or not owned');
    }

    // Check if fleet can explore
    if (fleet.status === 'in_combat') {
      throw new ConflictError('Fleet cannot explore while in combat');
    }

    if (!fleet.hasExplorationCapability()) {
      throw new ConflictError('Fleet lacks exploration capability', {
        requiredShips: ['scouts', 'survey_ships'],
        currentComposition: fleet.ships
      });
    }

    const sector = await getSectorByCoordinates(coordinates);
    if (!sector) {
      throw new NotFoundError('Sector not found');
    }

    // Check if fleet is in range
    const distance = calculateDistance(fleet.location, coordinates);
    const maxRange = fleet.getExplorationRange();
    
    if (distance > maxRange) {
      throw new ConflictError('Sector is out of exploration range', {
        distance,
        maxRange,
        fleetLocation: fleet.location
      });
    }

    // Start exploration mission
    const explorationMission = await sector.startExploration({
      empireId: userEmpire.id,
      fleetId: fleet.id,
      explorationType,
      estimatedDuration: calculateExplorationTime(distance, explorationType, fleet)
    });

    fleet.status = 'exploring';
    fleet.currentMission = {
      type: 'exploration',
      targetCoordinates: coordinates,
      missionId: explorationMission.id,
      startTime: new Date(),
      estimatedCompletion: explorationMission.estimatedCompletion
    };

    await userEmpire.save();
    await consumeActionPoints(req, 'start_exploration');

    res.set('Location', `/api/sectors/${coordinates}/exploration/${explorationMission.id}`);
    res.status(202).json({
      missionId: explorationMission.id,
      fleetId: fleet.id,
      targetCoordinates: coordinates,
      explorationType,
      estimatedCompletion: explorationMission.estimatedCompletion,
      status: 'in_progress'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/colonize
 * Initiate colonization of an uncontrolled planet
 */
router.post('/colonize', requireActionPoints(5), [
  body('planetId').isUUID().withMessage('Invalid planet ID'),
  body('colonistFleetId').isUUID().withMessage('Invalid colonist fleet ID'),
  body('specialization')
    .optional()
    .isIn(['mining', 'energy', 'agricultural', 'research', 'industrial', 'fortress', 'balanced'])
    .withMessage('Invalid planet specialization')
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

    const { planetId, colonistFleetId, specialization = 'balanced' } = req.body;
    
    const userEmpire = await Empire.findByPlayerId(req.user.id);
    if (!userEmpire) {
      throw new NotFoundError('Empire not found');
    }

    const colonistFleet = userEmpire.fleets.find(f => f.id === colonistFleetId);
    if (!colonistFleet) {
      throw new NotFoundError('Colonist fleet not found or not owned');
    }

    // Check if fleet has colonization capability
    if (!colonistFleet.hasColonizationCapability()) {
      throw new ConflictError('Fleet lacks colonization capability', {
        requiredShips: ['colony_ships', 'transport_ships'],
        requiredPopulation: 1000,
        currentComposition: colonistFleet.ships
      });
    }

    const planet = await getPlanetById(planetId);
    if (!planet) {
      throw new NotFoundError('Planet not found');
    }

    // Check if planet can be colonized
    if (planet.isColonized) {
      throw new ConflictError('Planet is already colonized');
    }

    if (planet.habitability < 20) {
      throw new ConflictError('Planet habitability too low for colonization', {
        habitability: planet.habitability,
        minimumRequired: 20
      });
    }

    // Check if fleet is in the same sector as planet
    if (!colonistFleet.location.startsWith(planet.sector)) {
      throw new ConflictError('Fleet must be in the same sector as the planet');
    }

    // Check colonization costs
    const colonizationCosts = {
      minerals: 5000,
      energy: 3000,
      food: 2000,
      population: 1000
    };

    if (!userEmpire.hasResources(colonizationCosts)) {
      throw new InsufficientResourcesError('Insufficient resources for colonization', {
        required: colonizationCosts,
        available: userEmpire.resources
      });
    }

    // Start colonization process
    userEmpire.consumeResources(colonizationCosts);
    
    const colonizationMission = await planet.startColonization({
      empireId: userEmpire.id,
      fleetId: colonistFleet.id,
      specialization,
      colonists: colonizationCosts.population,
      estimatedCompletion: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    });

    colonistFleet.status = 'colonizing';
    colonistFleet.currentMission = {
      type: 'colonization',
      targetPlanetId: planetId,
      missionId: colonizationMission.id,
      startTime: new Date(),
      estimatedCompletion: colonizationMission.estimatedCompletion
    };

    await userEmpire.save();
    await consumeActionPoints(req, 'start_colonization');

    res.set('Location', `/api/planets/${planetId}/colonization/${colonizationMission.id}`);
    res.status(202).json({
      missionId: colonizationMission.id,
      planetId: planet.id,
      planetName: planet.name,
      fleetId: colonistFleet.id,
      specialization,
      cost: colonizationCosts,
      estimatedCompletion: colonizationMission.estimatedCompletion,
      status: 'in_progress'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/trade-routes
 * Get active trade connections and routes
 */
router.get('/trade-routes', [
  query('status')
    .optional()
    .isIn(['active', 'inactive', 'disrupted', 'pending'])
    .withMessage('Invalid status filter'),
  query('partnerId').optional().isUUID().withMessage('Invalid partner ID'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be 1-50')
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

    const userEmpire = await Empire.findByPlayerId(req.user.id);
    if (!userEmpire) {
      throw new NotFoundError('Empire not found');
    }

    const { status, partnerId, page = 1, limit = 20 } = req.query;
    
    // Get trade routes for this empire
    const tradeRoutes = await getTradeRoutesByEmpire(userEmpire.id, {
      status,
      partnerId,
      page: parseInt(page),
      limit: parseInt(limit)
    });

    // Transform trade routes for response
    const routeData = tradeRoutes.map(route => ({
      id: route.id,
      partner: route.getPartnerEmpire(userEmpire.id),
      status: route.status,
      route: {
        origin: route.originPlanet,
        destination: route.destinationPlanet,
        distance: route.distance,
        travelTime: route.travelTime
      },
      trade: {
        offering: route.getOfferingResources(userEmpire.id),
        receiving: route.getReceivingResources(userEmpire.id),
        volume: route.volume,
        frequency: route.frequency
      },
      economics: {
        profitMargin: route.getProfitMargin(userEmpire.id),
        totalValue: route.getTotalValue(),
        riskLevel: route.riskLevel
      },
      security: {
        protectionLevel: route.protectionLevel,
        threatLevel: route.currentThreatLevel,
        lastIncident: route.lastIncident
      },
      createdAt: route.createdAt,
      lastExchange: route.lastExchange
    }));

    res.status(200).json({
      tradeRoutes: routeData,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: tradeRoutes.length
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/trade-routes
 * Establish new trade route with another player
 */
router.post('/trade-routes', requireActionPoints(3), [
  body('partnerId').isUUID().withMessage('Invalid partner empire ID'),
  body('originPlanetId').isUUID().withMessage('Invalid origin planet ID'),
  body('destinationPlanetId').isUUID().withMessage('Invalid destination planet ID'),
  body('offerResources').isObject().withMessage('Offer resources must be an object'),
  body('requestResources').isObject().withMessage('Request resources must be an object'),
  body('duration').isInt({ min: 1, max: 365 }).withMessage('Duration must be 1-365 days'),
  body('frequency')
    .optional()
    .isIn(['daily', 'weekly', 'monthly'])
    .withMessage('Invalid frequency')
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

    const { 
      partnerId, 
      originPlanetId, 
      destinationPlanetId, 
      offerResources, 
      requestResources, 
      duration, 
      frequency = 'weekly' 
    } = req.body;
    
    const userEmpire = await Empire.findByPlayerId(req.user.id);
    if (!userEmpire) {
      throw new NotFoundError('Empire not found');
    }

    const partnerEmpire = await Empire.findById(partnerId);
    if (!partnerEmpire) {
      throw new NotFoundError('Partner empire not found');
    }

    if (userEmpire.id === partnerEmpire.id) {
      throw new ConflictError('Cannot establish trade routes with yourself');
    }

    // Validate planets
    const originPlanet = userEmpire.planets.find(p => p.id === originPlanetId);
    if (!originPlanet) {
      throw new NotFoundError('Origin planet not found or not owned');
    }

    const destinationPlanet = partnerEmpire.planets.find(p => p.id === destinationPlanetId);
    if (!destinationPlanet) {
      throw new NotFoundError('Destination planet not found or not accessible');
    }

    // Check diplomatic relations
    const relation = await Diplomacy.findBetweenEmpires(userEmpire.id, partnerEmpire.id);
    if (!relation || !relation.allowsTradeRoutes()) {
      throw new ConflictError('Trade agreement required to establish routes');
    }

    // Validate resource availability
    if (!userEmpire.canSupplyResources(offerResources, frequency)) {
      throw new InsufficientResourcesError('Insufficient resources to support trade route', {
        required: offerResources,
        frequency,
        available: userEmpire.getAvailableTradeResources()
      });
    }

    // Calculate route parameters
    const distance = calculateDistance(originPlanet.location, destinationPlanet.location);
    const travelTime = calculateTradeRouteTime(distance);
    const riskLevel = calculateTradeRiskLevel(distance, relation.trustLevel);
    
    // Create trade route proposal
    const tradeRouteProposal = await createTradeRouteProposal({
      initiatorEmpireId: userEmpire.id,
      partnerEmpireId: partnerEmpire.id,
      originPlanetId,
      destinationPlanetId,
      offerResources,
      requestResources,
      duration,
      frequency,
      distance,
      travelTime,
      riskLevel
    });

    await userEmpire.save();
    await consumeActionPoints(req, 'propose_trade_route');

    // Send notification to partner
    await sendTradeRouteNotification(partnerEmpire.playerId, {
      type: 'trade_route_proposal',
      from: userEmpire.name,
      proposalId: tradeRouteProposal.id
    });

    res.set('Location', `/api/trade-routes/proposals/${tradeRouteProposal.id}`);
    res.status(201).json({
      proposalId: tradeRouteProposal.id,
      partner: {
        id: partnerEmpire.id,
        name: partnerEmpire.name
      },
      route: {
        origin: originPlanet.name,
        destination: destinationPlanet.name,
        distance,
        travelTime
      },
      trade: {
        offering: offerResources,
        requesting: requestResources,
        frequency
      },
      duration,
      riskLevel,
      status: 'pending',
      createdAt: tradeRouteProposal.createdAt
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Helper functions (these would be implemented in separate service modules)
 */
async function getSectors(query) {
  // Placeholder implementation
  return [];
}

async function getSectorByCoordinates(coordinates) {
  // Placeholder implementation
  return null;
}

async function getPlanetById(planetId) {
  // Placeholder implementation
  return null;
}

async function getTradeRoutesByEmpire(empireId, filters) {
  // Placeholder implementation
  return [];
}

async function createTradeRouteProposal(data) {
  // Placeholder implementation
  return { id: 'proposal-id', ...data, createdAt: new Date() };
}

function calculateDistance(location1, location2) {
  // Placeholder implementation
  return 10;
}

function calculateExplorationTime(distance, type, fleet) {
  // Placeholder implementation
  return new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
}

function calculateTradeRouteTime(distance) {
  // Placeholder implementation
  return Math.ceil(distance / 10); // days
}

function calculateTradeRiskLevel(distance, trustLevel) {
  // Placeholder implementation
  return 'low';
}

async function sendTradeRouteNotification(playerId, notification) {
  // Placeholder implementation
  console.log(`Trade route notification for player ${playerId}:`, notification);
}

module.exports = router;
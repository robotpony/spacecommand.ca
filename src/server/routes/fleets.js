/**
 * Fleet management routes for ship formations, movement, and fleet operations
 */
const express = require('express');
const { body, query, param, validationResult } = require('express-validator');

const Empire = require('../models/Empire');
const Fleet = require('../models/Fleet');
const { ValidationError, NotFoundError, ConflictError, InsufficientResourcesError } = require('../middleware/errorHandler');
const { requireActionPoints, consumeActionPoints } = require('../middleware/gameState');

const router = express.Router();

/**
 * GET /api/fleets
 * List all fleets with current status and locations
 */
router.get('/', [
  query('location').optional().isString().withMessage('Invalid location filter'),
  query('status')
    .optional()
    .isIn(['idle', 'moving', 'in_combat', 'patrolling', 'defending'])
    .withMessage('Invalid status filter'),
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

    const empire = await Empire.findByPlayerId(req.user.id);
    if (!empire) {
      throw new NotFoundError('Empire not found');
    }

    const { location, status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // Get fleets with optional filtering
    let fleets = empire.fleets;
    
    if (location) {
      fleets = fleets.filter(fleet => fleet.location === location);
    }
    
    if (status) {
      fleets = fleets.filter(fleet => fleet.status === status);
    }

    // Apply pagination
    const totalFleets = fleets.length;
    const paginatedFleets = fleets.slice(offset, offset + parseInt(limit));

    // Transform fleets for response
    const fleetData = paginatedFleets.map(fleet => ({
      id: fleet.id,
      name: fleet.name,
      location: fleet.location,
      destination: fleet.destination,
      status: fleet.status,
      ships: fleet.ships,
      totalShips: fleet.getTotalShips(),
      combatPower: fleet.calculateCombatPower(),
      maintenance: fleet.calculateMaintenance(),
      experience: fleet.experience,
      morale: fleet.morale,
      eta: fleet.movementOrder?.eta || null,
      createdAt: fleet.createdAt,
      updatedAt: fleet.updatedAt
    }));

    res.status(200).json({
      fleets: fleetData,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalFleets,
        pages: Math.ceil(totalFleets / limit)
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/fleets/:id
 * Get detailed information about a specific fleet
 */
router.get('/:id', [
  param('id').isUUID().withMessage('Invalid fleet ID format')
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

    const empire = await Empire.findByPlayerId(req.user.id);
    if (!empire) {
      throw new NotFoundError('Empire not found');
    }

    const fleet = empire.fleets.find(f => f.id === req.params.id);
    if (!fleet) {
      throw new NotFoundError('Fleet not found or not owned');
    }

    res.set({
      'ETag': `"${fleet.id}-${fleet.updatedAt.getTime()}"`,
      'Last-Modified': fleet.updatedAt.toUTCString()
    });

    res.status(200).json({
      id: fleet.id,
      name: fleet.name,
      location: fleet.location,
      destination: fleet.destination,
      status: fleet.status,
      ships: fleet.ships,
      totalShips: fleet.getTotalShips(),
      combatStats: fleet.calculateCombatStats(),
      maintenance: fleet.calculateMaintenance(),
      experience: fleet.experience,
      morale: fleet.morale,
      movementOrder: fleet.movementOrder,
      commandStructure: fleet.commandStructure,
      createdAt: fleet.createdAt,
      updatedAt: fleet.updatedAt
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/fleets
 * Create a new fleet from available ships
 */
router.post('/', requireActionPoints(2), [
  body('name')
    .isLength({ min: 3, max: 30 })
    .matches(/^[a-zA-Z0-9\s\-_'\.]+$/)
    .withMessage('Fleet name must be 3-30 characters, alphanumeric and basic punctuation only'),
  body('ships').isObject().withMessage('Ships composition required'),
  body('ships.fighters').optional().isInt({ min: 0, max: 1000 }).withMessage('Invalid fighters count'),
  body('ships.destroyers').optional().isInt({ min: 0, max: 500 }).withMessage('Invalid destroyers count'),
  body('ships.cruisers').optional().isInt({ min: 0, max: 200 }).withMessage('Invalid cruisers count'),
  body('ships.battleships').optional().isInt({ min: 0, max: 50 }).withMessage('Invalid battleships count'),
  body('ships.carriers').optional().isInt({ min: 0, max: 20 }).withMessage('Invalid carriers count'),
  body('ships.dreadnoughts').optional().isInt({ min: 0, max: 5 }).withMessage('Invalid dreadnoughts count'),
  body('ships.support').optional().isInt({ min: 0, max: 100 }).withMessage('Invalid support ships count'),
  body('location').isString().withMessage('Fleet location required')
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

    const { name, ships, location } = req.body;
    const empire = await Empire.findByPlayerId(req.user.id);
    if (!empire) {
      throw new NotFoundError('Empire not found');
    }

    // Check if empire has sufficient ships available
    const availableShips = empire.getAvailableShips(location);
    for (const [shipType, count] of Object.entries(ships)) {
      if (count > 0 && (!availableShips[shipType] || availableShips[shipType] < count)) {
        throw new InsufficientResourcesError('Insufficient ships available', {
          requested: ships,
          available: availableShips
        });
      }
    }

    // Check if location is valid (planet or sector controlled by empire)
    const validLocation = empire.isValidFleetLocation(location);
    if (!validLocation) {
      throw new ValidationError('Invalid fleet location', {
        location,
        validLocations: empire.getValidFleetLocations()
      });
    }

    // Create new fleet
    const fleet = empire.createFleet({
      name,
      ships,
      location
    });

    await empire.save();
    await consumeActionPoints(req, 'create_fleet');

    res.set('Location', `/api/fleets/${fleet.id}`);
    res.status(201).json({
      id: fleet.id,
      name: fleet.name,
      location: fleet.location,
      ships: fleet.ships,
      totalShips: fleet.getTotalShips(),
      combatPower: fleet.calculateCombatPower(),
      maintenance: fleet.calculateMaintenance(),
      createdAt: fleet.createdAt
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/fleets/:id/location
 * Issue movement orders to a fleet
 */
router.patch('/:id/location', requireActionPoints(1), [
  param('id').isUUID().withMessage('Invalid fleet ID format'),
  body('destination').isString().withMessage('Destination required'),
  body('speed')
    .optional()
    .isIn(['slow', 'normal', 'fast', 'stealth'])
    .withMessage('Invalid speed setting')
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

    const { destination, speed = 'normal' } = req.body;
    const empire = await Empire.findByPlayerId(req.user.id);
    if (!empire) {
      throw new NotFoundError('Empire not found');
    }

    const fleet = empire.fleets.find(f => f.id === req.params.id);
    if (!fleet) {
      throw new NotFoundError('Fleet not found or not owned');
    }

    // Check if fleet can move
    if (fleet.status === 'in_combat') {
      throw new ConflictError('Fleet is in combat and cannot move');
    }

    if (fleet.status === 'moving') {
      throw new ConflictError('Fleet is already in transit');
    }

    // Validate destination
    const validDestination = empire.isValidDestination(destination, fleet.location);
    if (!validDestination) {
      throw new ValidationError('Invalid destination', {
        destination,
        currentLocation: fleet.location
      });
    }

    // Calculate movement
    const movementResult = fleet.issueMovementOrder(destination, speed);
    empire.updatedAt = new Date();
    await empire.save();

    await consumeActionPoints(req, 'fleet_movement');

    res.status(202).json({
      fleetId: fleet.id,
      currentLocation: fleet.location,
      destination: movementResult.destination,
      speed: movementResult.speed,
      eta: movementResult.eta,
      distance: movementResult.distance,
      status: fleet.status
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/fleets/:id/composition
 * Modify fleet ship composition
 */
router.put('/:id/composition', requireActionPoints(1), [
  param('id').isUUID().withMessage('Invalid fleet ID format'),
  body('ships').isObject().withMessage('Ships composition required'),
  body('ships.fighters').optional().isInt({ min: 0 }).withMessage('Invalid fighters count'),
  body('ships.destroyers').optional().isInt({ min: 0 }).withMessage('Invalid destroyers count'),
  body('ships.cruisers').optional().isInt({ min: 0 }).withMessage('Invalid cruisers count'),
  body('ships.battleships').optional().isInt({ min: 0 }).withMessage('Invalid battleships count'),
  body('ships.carriers').optional().isInt({ min: 0 }).withMessage('Invalid carriers count'),
  body('ships.dreadnoughts').optional().isInt({ min: 0 }).withMessage('Invalid dreadnoughts count'),
  body('ships.support').optional().isInt({ min: 0 }).withMessage('Invalid support ships count')
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

    const { ships } = req.body;
    const empire = await Empire.findByPlayerId(req.user.id);
    if (!empire) {
      throw new NotFoundError('Empire not found');
    }

    const fleet = empire.fleets.find(f => f.id === req.params.id);
    if (!fleet) {
      throw new NotFoundError('Fleet not found or not owned');
    }

    // Check if fleet can be modified
    if (fleet.status === 'in_combat') {
      throw new ConflictError('Fleet composition cannot be changed during combat');
    }

    if (fleet.status === 'moving') {
      throw new ConflictError('Fleet composition cannot be changed while in transit');
    }

    // Calculate ship changes needed
    const shipChanges = fleet.calculateShipChanges(ships);
    
    // Check if empire has sufficient ships for additions
    if (shipChanges.additions) {
      const availableShips = empire.getAvailableShips(fleet.location);
      for (const [shipType, count] of Object.entries(shipChanges.additions)) {
        if (count > 0 && (!availableShips[shipType] || availableShips[shipType] < count)) {
          throw new InsufficientResourcesError('Insufficient ships available for fleet modification', {
            additions: shipChanges.additions,
            available: availableShips
          });
        }
      }
    }

    // Apply ship composition changes
    fleet.modifyComposition(ships);
    empire.updatedAt = new Date();
    await empire.save();

    await consumeActionPoints(req, 'modify_fleet_composition');

    res.status(200).json({
      id: fleet.id,
      name: fleet.name,
      ships: fleet.ships,
      totalShips: fleet.getTotalShips(),
      combatPower: fleet.calculateCombatPower(),
      changes: shipChanges,
      updatedAt: fleet.updatedAt
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/fleets/:id
 * Disband a fleet and return ships to empire pool
 */
router.delete('/:id', requireActionPoints(1), [
  param('id').isUUID().withMessage('Invalid fleet ID format')
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

    const empire = await Empire.findByPlayerId(req.user.id);
    if (!empire) {
      throw new NotFoundError('Empire not found');
    }

    const fleet = empire.fleets.find(f => f.id === req.params.id);
    if (!fleet) {
      throw new NotFoundError('Fleet not found or not owned');
    }

    // Check if fleet can be disbanded
    if (fleet.status === 'in_combat') {
      throw new ConflictError('Fleet cannot be disbanded while in combat');
    }

    // Disband fleet and return ships to empire
    const returnedShips = empire.disbandFleet(fleet.id);
    await empire.save();

    await consumeActionPoints(req, 'disband_fleet');

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/fleets/:id/merge
 * Merge another fleet into this fleet
 */
router.post('/:id/merge', requireActionPoints(2), [
  param('id').isUUID().withMessage('Invalid fleet ID format'),
  body('targetFleetId').isUUID().withMessage('Invalid target fleet ID format')
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

    const { targetFleetId } = req.body;
    const empire = await Empire.findByPlayerId(req.user.id);
    if (!empire) {
      throw new NotFoundError('Empire not found');
    }

    const mainFleet = empire.fleets.find(f => f.id === req.params.id);
    const targetFleet = empire.fleets.find(f => f.id === targetFleetId);

    if (!mainFleet || !targetFleet) {
      throw new NotFoundError('One or both fleets not found');
    }

    // Check if fleets can be merged
    if (mainFleet.location !== targetFleet.location) {
      throw new ConflictError('Fleets must be in the same location to merge');
    }

    if (mainFleet.status === 'in_combat' || targetFleet.status === 'in_combat') {
      throw new ConflictError('Fleets cannot be merged during combat');
    }

    // Merge fleets
    const mergeResult = empire.mergeFleets(mainFleet.id, targetFleet.id);
    await empire.save();

    await consumeActionPoints(req, 'merge_fleets');

    res.status(200).json({
      mergedFleet: {
        id: mergeResult.fleet.id,
        name: mergeResult.fleet.name,
        ships: mergeResult.fleet.ships,
        totalShips: mergeResult.fleet.getTotalShips(),
        combatPower: mergeResult.fleet.calculateCombatPower()
      },
      mergedShips: mergeResult.mergedShips,
      disbandedFleetId: targetFleetId
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
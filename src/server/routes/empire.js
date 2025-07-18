/**
 * Empire management routes for resources, planets, and empire overview
 */
const express = require('express');
const { body, query, param } = require('express-validator');

const { requireActionPoints } = require('../middleware/gameState');
const { requireOwnEmpire, requireOwnPlanet } = require('../middleware/resourceAuth');

// Import controllers
const empireController = require('../controllers/empire');

const router = express.Router();

/**
 * GET /api/empire
 * Get current empire status and overview
 */
router.get('/empire', requireOwnEmpire, empireController.getEmpireStatus);

/**
 * PUT /api/empire/name
 * Update empire name
 */
router.put('/empire/name', requireActionPoints(1), [
  body('name')
    .isLength({ min: 3, max: 50 })
    .matches(/^[a-zA-Z0-9\s\-_'\.]+$/)
    .withMessage('Empire name must be 3-50 characters, alphanumeric and basic punctuation only')
], empireController.updateEmpireName);

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
], empireController.getPlanets);

/**
 * GET /api/planets/:id
 * Get detailed information about a specific planet
 */
router.get('/planets/:id', [
  param('id').isUUID().withMessage('Invalid planet ID format')
], requireOwnPlanet(), empireController.getPlanetDetails);

/**
 * PUT /api/planets/:id/specialization
 * Set or change planet specialization
 */
router.put('/planets/:id/specialization', requireActionPoints(2), [
  param('id').isUUID().withMessage('Invalid planet ID format'),
  body('specialization')
    .isIn(['mining', 'energy', 'agricultural', 'research', 'industrial', 'fortress', 'balanced'])
    .withMessage('Invalid specialization type')
], requireOwnPlanet(), empireController.updatePlanetSpecialization);

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
], empireController.constructBuildings);

/**
 * GET /api/resources
 * Get detailed resource inventory and production rates
 */
router.get('/resources', empireController.getResources);

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
], empireController.transferResources);

module.exports = router;
/**
 * Resource-level authorization middleware
 * Ensures users can only access their own empire resources
 */

const Empire = require('../models/Empire');
const Fleet = require('../models/Fleet');
const Planet = require('../models/Planet');
const Combat = require('../models/Combat');
const Diplomacy = require('../models/Diplomacy');
const { NotFoundError, ForbiddenError } = require('./errorHandler');

/**
 * Middleware to ensure user owns the empire
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
async function requireOwnEmpire(req, res, next) {
  try {
    if (!req.user) {
      throw new ForbiddenError('Authentication required');
    }

    const empire = await Empire.findByPlayerId(req.user.id);
    if (!empire) {
      throw new NotFoundError('Empire not found');
    }

    // Attach empire to request for use in route handlers
    req.userEmpire = empire;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware to ensure user owns the specified planet
 * @param {string} paramName - Name of the planet ID parameter (default: 'id')
 * @returns {Function} Express middleware function
 */
function requireOwnPlanet(paramName = 'id') {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        throw new ForbiddenError('Authentication required');
      }

      const planetId = req.params[paramName];
      if (!planetId) {
        throw new NotFoundError('Planet ID required');
      }

      // Get user's empire first
      const empire = await Empire.findByPlayerId(req.user.id);
      if (!empire) {
        throw new NotFoundError('Empire not found');
      }

      // Check if planet belongs to user's empire
      const planet = empire.planets.find(p => p.id === planetId);
      if (!planet) {
        throw new NotFoundError('Planet not found or not owned');
      }

      // Attach empire and planet to request
      req.userEmpire = empire;
      req.userPlanet = planet;
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Middleware to ensure user owns the specified fleet
 * @param {string} paramName - Name of the fleet ID parameter (default: 'id')
 * @returns {Function} Express middleware function
 */
function requireOwnFleet(paramName = 'id') {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        throw new ForbiddenError('Authentication required');
      }

      const fleetId = req.params[paramName];
      if (!fleetId) {
        throw new NotFoundError('Fleet ID required');
      }

      // Get user's empire first
      const empire = await Empire.findByPlayerId(req.user.id);
      if (!empire) {
        throw new NotFoundError('Empire not found');
      }

      // Check if fleet belongs to user's empire
      const fleet = empire.fleets.find(f => f.id === fleetId);
      if (!fleet) {
        throw new NotFoundError('Fleet not found or not owned');
      }

      // Attach empire and fleet to request
      req.userEmpire = empire;
      req.userFleet = fleet;
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Middleware to ensure user has access to the specified combat
 * @param {string} paramName - Name of the combat ID parameter (default: 'id')
 * @returns {Function} Express middleware function
 */
function requireCombatAccess(paramName = 'id') {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        throw new ForbiddenError('Authentication required');
      }

      const combatId = req.params[paramName];
      if (!combatId) {
        throw new NotFoundError('Combat ID required');
      }

      // Get user's empire
      const empire = await Empire.findByPlayerId(req.user.id);
      if (!empire) {
        throw new NotFoundError('Empire not found');
      }

      // Get combat record
      const combat = await Combat.findById(combatId);
      if (!combat) {
        throw new NotFoundError('Combat not found');
      }

      // Check if user is involved in this combat
      const hasAccess = combat.attackerEmpireId === empire.id || 
                       combat.defenderEmpireId === empire.id;
      
      if (!hasAccess) {
        throw new NotFoundError('Combat not found or not accessible');
      }

      // Attach empire and combat to request
      req.userEmpire = empire;
      req.combat = combat;
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Middleware to ensure user has access to diplomatic relations with specified empire
 * @param {string} paramName - Name of the empire ID parameter (default: 'empireId')
 * @returns {Function} Express middleware function
 */
function requireDiplomaticAccess(paramName = 'empireId') {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        throw new ForbiddenError('Authentication required');
      }

      const targetEmpireId = req.params[paramName];
      if (!targetEmpireId) {
        throw new NotFoundError('Empire ID required');
      }

      // Get user's empire
      const empire = await Empire.findByPlayerId(req.user.id);
      if (!empire) {
        throw new NotFoundError('Empire not found');
      }

      // Prevent self-access through this middleware
      if (empire.id === targetEmpireId) {
        throw new ForbiddenError('Cannot access diplomatic relations with yourself');
      }

      // Check if target empire exists
      const targetEmpire = await Empire.findById(targetEmpireId);
      if (!targetEmpire) {
        throw new NotFoundError('Target empire not found');
      }

      // Get diplomatic relation
      const relation = await Diplomacy.findBetweenEmpires(empire.id, targetEmpire.id);
      if (!relation) {
        throw new NotFoundError('Diplomatic relation not found');
      }

      // Attach data to request
      req.userEmpire = empire;
      req.targetEmpire = targetEmpire;
      req.diplomaticRelation = relation;
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Middleware to ensure user owns the specified proposal
 * @param {string} paramName - Name of the proposal ID parameter (default: 'id')
 * @returns {Function} Express middleware function
 */
function requireProposalAccess(paramName = 'id') {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        throw new ForbiddenError('Authentication required');
      }

      const proposalId = req.params[paramName];
      if (!proposalId) {
        throw new NotFoundError('Proposal ID required');
      }

      // Get user's empire
      const empire = await Empire.findByPlayerId(req.user.id);
      if (!empire) {
        throw new NotFoundError('Empire not found');
      }

      // Get proposal
      const proposal = await Diplomacy.findProposalById(proposalId);
      if (!proposal) {
        throw new NotFoundError('Proposal not found');
      }

      // Check if user is involved in this proposal
      const hasAccess = proposal.initiatorEmpireId === empire.id || 
                       proposal.targetEmpireId === empire.id;
      
      if (!hasAccess) {
        throw new NotFoundError('Proposal not found or not accessible');
      }

      // Attach data to request
      req.userEmpire = empire;
      req.proposal = proposal;
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Middleware to validate sector access (for exploration and colonization)
 * @param {string} paramName - Name of the coordinates parameter (default: 'coordinates')
 * @returns {Function} Express middleware function
 */
function requireSectorAccess(paramName = 'coordinates') {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        throw new ForbiddenError('Authentication required');
      }

      const coordinates = req.params[paramName];
      if (!coordinates) {
        throw new NotFoundError('Sector coordinates required');
      }

      // Get user's empire
      const empire = await Empire.findByPlayerId(req.user.id);
      if (!empire) {
        throw new NotFoundError('Empire not found');
      }

      // Basic validation for coordinate format
      if (!/^\d+,\d+$/.test(coordinates)) {
        throw new NotFoundError('Invalid coordinate format');
      }

      // Additional access validation would go here
      // (e.g., checking if sector is within exploration range)

      // Attach data to request
      req.userEmpire = empire;
      req.sectorCoordinates = coordinates;
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Middleware to ensure user can only access their own profile data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
async function requireOwnProfile(req, res, next) {
  try {
    if (!req.user) {
      throw new ForbiddenError('Authentication required');
    }

    // If there's a userId parameter, ensure it matches the authenticated user
    if (req.params.userId && req.params.userId !== req.user.id) {
      throw new ForbiddenError('Cannot access other user profiles');
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware to check admin permissions for sensitive operations
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
async function requireAdminAccess(req, res, next) {
  try {
    if (!req.user) {
      throw new ForbiddenError('Authentication required');
    }

    const Player = require('../models/Player');
    const player = await Player.findById(req.user.id);
    
    if (!player || !player.permissions.admin) {
      throw new ForbiddenError('Admin permissions required');
    }

    req.adminUser = player;
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  requireOwnEmpire,
  requireOwnPlanet,
  requireOwnFleet,
  requireCombatAccess,
  requireDiplomaticAccess,
  requireProposalAccess,
  requireSectorAccess,
  requireOwnProfile,
  requireAdminAccess
};
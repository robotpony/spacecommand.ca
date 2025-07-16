/**
 * Combat routes for battle initiation, resolution, and combat records
 */
const express = require('express');
const { body, query, param, validationResult } = require('express-validator');

const Empire = require('../models/Empire');
const Combat = require('../models/Combat');
const { ValidationError, NotFoundError, ConflictError } = require('../middleware/errorHandler');
const { requireActionPoints, consumeActionPoints } = require('../middleware/gameState');

const router = express.Router();

/**
 * POST /api/combat/battles
 * Initiate combat against a target
 */
router.post('/battles', requireActionPoints(3), [
  body('attackerFleetId').isUUID().withMessage('Invalid attacker fleet ID'),
  body('targetType')
    .isIn(['fleet', 'planet'])
    .withMessage('Target type must be fleet or planet'),
  body('targetId').isUUID().withMessage('Invalid target ID'),
  body('attackType')
    .isIn(['conventional', 'orbital_bombardment', 'raid', 'siege'])
    .withMessage('Invalid attack type')
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

    const { attackerFleetId, targetType, targetId, attackType } = req.body;
    const attackerEmpire = await Empire.findByPlayerId(req.user.id);
    if (!attackerEmpire) {
      throw new NotFoundError('Empire not found');
    }

    // Find attacker fleet
    const attackerFleet = attackerEmpire.fleets.find(f => f.id === attackerFleetId);
    if (!attackerFleet) {
      throw new NotFoundError('Attacker fleet not found or not owned');
    }

    // Check if attacker fleet can engage in combat
    if (attackerFleet.status === 'in_combat') {
      throw new ConflictError('Fleet is already in combat');
    }

    if (attackerFleet.status === 'moving') {
      throw new ConflictError('Fleet cannot attack while in transit');
    }

    if (attackerFleet.getTotalShips() === 0) {
      throw new ConflictError('Fleet has no ships to attack with');
    }

    // Find and validate target
    let target, targetEmpire;
    
    if (targetType === 'fleet') {
      // Find target fleet across all empires (simplified for demo)
      targetEmpire = await Empire.findByFleetId(targetId);
      if (!targetEmpire) {
        throw new NotFoundError('Target fleet not found');
      }
      
      target = targetEmpire.fleets.find(f => f.id === targetId);
      if (!target) {
        throw new NotFoundError('Target fleet not found');
      }

      // Check if target is in same location
      if (attackerFleet.location !== target.location) {
        throw new ConflictError('Target fleet is not in the same location');
      }

      // Prevent self-attack
      if (targetEmpire.playerId === req.user.id) {
        throw new ConflictError('Cannot attack your own fleet');
      }

    } else if (targetType === 'planet') {
      // Find target planet across all empires
      targetEmpire = await Empire.findByPlanetId(targetId);
      if (!targetEmpire) {
        throw new NotFoundError('Target planet not found');
      }
      
      target = targetEmpire.planets.find(p => p.id === targetId);
      if (!target) {
        throw new NotFoundError('Target planet not found');
      }

      // Check if attacker fleet is in planet's system
      if (!attackerFleet.location.startsWith(target.location.split(':')[0])) {
        throw new ConflictError('Fleet must be in the same system as target planet');
      }

      // Prevent self-attack
      if (targetEmpire.playerId === req.user.id) {
        throw new ConflictError('Cannot attack your own planet');
      }
    }

    // Check diplomatic relations
    const diplomaticStatus = await checkDiplomaticStatus(req.user.id, targetEmpire.playerId);
    if (diplomaticStatus.nonAggressionPact) {
      throw new ConflictError('Cannot attack due to non-aggression pact');
    }

    // Create combat instance
    const combatData = {
      attackerEmpireId: attackerEmpire.id,
      attackerFleetId: attackerFleet.id,
      defenderEmpireId: targetEmpire.id,
      targetType,
      targetId,
      attackType,
      location: attackerFleet.location,
      status: 'initiated'
    };

    const combat = new Combat(combatData);
    
    // Set fleet status to in_combat
    attackerFleet.status = 'in_combat';
    if (targetType === 'fleet') {
      target.status = 'in_combat';
    }

    // Start combat resolution (async process)
    const battleResult = await combat.initiateBattle(attackerFleet, target, attackType);
    
    await attackerEmpire.save();
    if (targetEmpire.id !== attackerEmpire.id) {
      await targetEmpire.save();
    }
    await combat.save();

    await consumeActionPoints(req, 'initiate_combat');

    res.set('Location', `/api/combat/battles/${combat.id}`);
    res.status(201).json({
      battleId: combat.id,
      status: combat.status,
      attackType: combat.attackType,
      attacker: {
        empireId: combat.attackerEmpireId,
        fleetId: combat.attackerFleetId,
        initialPower: battleResult.attackerInitialPower
      },
      defender: {
        empireId: combat.defenderEmpireId,
        targetType: combat.targetType,
        targetId: combat.targetId,
        initialPower: battleResult.defenderInitialPower
      },
      estimatedDuration: battleResult.estimatedDuration,
      createdAt: combat.createdAt
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/combat/battles/:id
 * Get combat resolution status and results
 */
router.get('/battles/:id', [
  param('id').isUUID().withMessage('Invalid battle ID format')
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

    const combat = await Combat.findById(req.params.id);
    if (!combat) {
      throw new NotFoundError('Battle not found');
    }

    // Check if user has access to this battle
    const userEmpire = await Empire.findByPlayerId(req.user.id);
    const hasAccess = combat.attackerEmpireId === userEmpire.id || 
                     combat.defenderEmpireId === userEmpire.id;
    
    if (!hasAccess) {
      throw new NotFoundError('Battle not found or not accessible');
    }

    // If battle is still in progress, return 202 Accepted
    if (combat.status === 'in_progress') {
      res.status(202).json({
        id: combat.id,
        status: combat.status,
        attackType: combat.attackType,
        currentRound: combat.currentRound,
        estimatedCompletion: combat.estimatedCompletion,
        partialResults: combat.getPartialResults(),
        createdAt: combat.createdAt
      });
      return;
    }

    // Return complete battle results
    res.status(200).json({
      id: combat.id,
      status: combat.status,
      attackType: combat.attackType,
      outcome: combat.outcome,
      rounds: combat.rounds,
      casualties: combat.casualties,
      experience: combat.experience,
      loot: combat.loot,
      location: combat.location,
      duration: combat.duration,
      createdAt: combat.createdAt,
      completedAt: combat.completedAt
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/combat/battles
 * Get list of combat records for the player
 */
router.get('/battles', [
  query('status')
    .optional()
    .isIn(['initiated', 'in_progress', 'completed', 'cancelled'])
    .withMessage('Invalid status filter'),
  query('timeframe')
    .optional()
    .isIn(['24h', '7d', '30d', 'all'])
    .withMessage('Invalid timeframe filter'),
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

    const { status, timeframe = '7d', page = 1, limit = 20 } = req.query;
    
    // Get battles involving this empire
    const battles = await Combat.findByEmpireId(userEmpire.id, {
      status,
      timeframe,
      page: parseInt(page),
      limit: parseInt(limit)
    });

    // Transform battles for response
    const battleData = battles.map(battle => ({
      id: battle.id,
      status: battle.status,
      attackType: battle.attackType,
      outcome: battle.outcome,
      isAttacker: battle.attackerEmpireId === userEmpire.id,
      location: battle.location,
      casualties: battle.casualties,
      experience: battle.experience,
      loot: battle.loot,
      duration: battle.duration,
      createdAt: battle.createdAt,
      completedAt: battle.completedAt
    }));

    res.status(200).json({
      battles: battleData,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: battles.length // This would come from a count query in real implementation
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/combat/battles/:id/retreat
 * Attempt to retreat from ongoing combat
 */
router.post('/battles/:id/retreat', requireActionPoints(1), [
  param('id').isUUID().withMessage('Invalid battle ID format')
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

    const combat = await Combat.findById(req.params.id);
    if (!combat) {
      throw new NotFoundError('Battle not found');
    }

    const userEmpire = await Empire.findByPlayerId(req.user.id);
    
    // Check if user can retreat from this battle
    if (combat.attackerEmpireId !== userEmpire.id && combat.defenderEmpireId !== userEmpire.id) {
      throw new NotFoundError('Battle not found or not accessible');
    }

    if (combat.status !== 'in_progress') {
      throw new ConflictError('Can only retreat from ongoing battles');
    }

    // Attempt retreat
    const retreatResult = await combat.attemptRetreat(userEmpire.id);
    
    if (!retreatResult.success) {
      throw new ConflictError('Retreat failed', {
        reason: retreatResult.reason,
        retreatChance: retreatResult.retreatChance
      });
    }

    await combat.save();
    await userEmpire.save();

    await consumeActionPoints(req, 'retreat_from_combat');

    res.status(200).json({
      battleId: combat.id,
      retreatSuccessful: true,
      casualties: retreatResult.casualties,
      moraleImpact: retreatResult.moraleImpact,
      newStatus: combat.status
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Helper function to check diplomatic status between empires
 */
async function checkDiplomaticStatus(empireId1, empireId2) {
  // This would check the Diplomacy model for relations between empires
  // Simplified implementation for now
  return {
    nonAggressionPact: false,
    alliance: false,
    atWar: false
  };
}

module.exports = router;
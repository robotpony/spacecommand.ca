/**
 * Game state routes for turn management and game status
 */
const express = require('express');
const { body, query, validationResult } = require('express-validator');

const Empire = require('../models/Empire');
const { ValidationError, NotFoundError, ConflictError } = require('../middleware/errorHandler');
const { requireActionPoints, consumeActionPoints, getCurrentGameState } = require('../middleware/gameState');

const router = express.Router();

/**
 * GET /api/game/status
 * Get current game turn and phase information
 */
router.get('/status', async (req, res, next) => {
  try {
    const userEmpire = await Empire.findByPlayerId(req.user.id);
    if (!userEmpire) {
      throw new NotFoundError('Empire not found');
    }

    const gameState = await getCurrentGameState();
    const playerActions = await getPlayerActions(req.user.id, gameState.currentTurn);
    const upcomingEvents = await getUpcomingEvents(req.user.id);
    const globalStats = await getGlobalGameStats();

    res.status(200).json({
      turn: {
        number: gameState.currentTurn,
        phase: gameState.currentPhase,
        phaseTimeRemaining: gameState.phaseTimeRemaining,
        nextPhase: getNextPhase(gameState.currentPhase),
        turnStartTime: gameState.turnStartTime
      },
      player: {
        actionPoints: {
          remaining: await getUserActionPoints(req.user.id, gameState.currentTurn),
          maximum: 10,
          used: playerActions.length
        },
        actionsThisTurn: playerActions.map(action => ({
          type: action.action_type,
          timestamp: action.timestamp,
          actionPoints: action.action_points
        }))
      },
      events: {
        pending: upcomingEvents.pending,
        scheduled: upcomingEvents.scheduled,
        notifications: upcomingEvents.notifications
      },
      gameWorld: {
        totalPlayers: globalStats.activePlayers,
        totalEmpires: globalStats.activeEmpires,
        totalSectors: globalStats.explorableSectors,
        activeConflicts: globalStats.activeBattles,
        tradeVolume: globalStats.dailyTradeVolume
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/game/turn
 * Get turn-specific information and available actions
 */
router.get('/turn', async (req, res, next) => {
  try {
    const userEmpire = await Empire.findByPlayerId(req.user.id);
    if (!userEmpire) {
      throw new NotFoundError('Empire not found');
    }

    const gameState = await getCurrentGameState();
    const turnSummary = await generateTurnSummary(userEmpire.id, gameState.currentTurn);
    const availableActions = await getAvailableActions(userEmpire, gameState);
    const recommendations = await getAIRecommendations(userEmpire, gameState);

    res.status(200).json({
      turnNumber: gameState.currentTurn,
      summary: {
        resourceProduction: turnSummary.resourceProduction,
        completedActions: turnSummary.completedActions,
        completedProjects: turnSummary.completedProjects,
        newEvents: turnSummary.newEvents,
        diplomaticUpdates: turnSummary.diplomaticUpdates,
        combatResults: turnSummary.combatResults
      },
      availableActions: {
        empire: availableActions.empire,
        military: availableActions.military,
        diplomacy: availableActions.diplomacy,
        exploration: availableActions.exploration,
        trade: availableActions.trade
      },
      recommendations: {
        priority: recommendations.priority,
        economic: recommendations.economic,
        military: recommendations.military,
        diplomatic: recommendations.diplomatic
      },
      constraints: {
        actionPointsRemaining: await getUserActionPoints(req.user.id, gameState.currentTurn),
        phaseRestrictions: getPhaseRestrictions(gameState.currentPhase),
        cooldowns: await getActionCooldowns(userEmpire.id)
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/game/end-turn
 * End current turn and process pending actions
 */
router.post('/end-turn', requireActionPoints(0), async (req, res, next) => {
  try {
    const userEmpire = await Empire.findByPlayerId(req.user.id);
    if (!userEmpire) {
      throw new NotFoundError('Empire not found');
    }

    const gameState = await getCurrentGameState();
    
    // Check if player has already ended their turn
    const hasEndedTurn = await checkIfTurnEnded(req.user.id, gameState.currentTurn);
    if (hasEndedTurn) {
      throw new ConflictError('Turn has already been ended');
    }

    // Process end-of-turn actions
    const turnResults = await processTurnEnd(userEmpire, gameState);
    
    // Mark turn as ended for this player
    await markTurnEnded(req.user.id, gameState.currentTurn);
    
    // Check if all players have ended their turns
    const allPlayersEnded = await checkAllPlayersEndedTurn(gameState.currentTurn);
    
    let nextTurnPreview = null;
    if (allPlayersEnded) {
      // Advance to next turn/phase
      nextTurnPreview = await advanceGameState();
    }

    res.status(200).json({
      turnNumber: gameState.currentTurn,
      processed: {
        resourceProduction: turnResults.resourceProduction,
        buildingsCompleted: turnResults.buildingsCompleted,
        fleetsArrived: turnResults.fleetsArrived,
        researchCompleted: turnResults.researchCompleted,
        diplomaticActions: turnResults.diplomaticActions
      },
      nextTurn: nextTurnPreview ? {
        number: nextTurnPreview.turnNumber,
        phase: nextTurnPreview.phase,
        estimatedStart: nextTurnPreview.startTime,
        preview: nextTurnPreview.preview
      } : null,
      allPlayersReady: allPlayersEnded,
      endedAt: new Date()
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/game/events
 * Get game events and notifications for the player
 */
router.get('/events', [
  query('type')
    .optional()
    .isIn(['combat', 'diplomacy', 'trade', 'exploration', 'construction', 'research', 'system'])
    .withMessage('Invalid event type filter'),
  query('timeframe')
    .optional()
    .isIn(['current_turn', '24h', '7d', '30d'])
    .withMessage('Invalid timeframe filter'),
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

    const { type, timeframe = 'current_turn', page = 1, limit = 50 } = req.query;
    
    const events = await getGameEvents(userEmpire.id, {
      type,
      timeframe,
      page: parseInt(page),
      limit: parseInt(limit)
    });

    // Transform events for response
    const eventData = events.map(event => ({
      id: event.id,
      type: event.type,
      category: event.category,
      title: event.title,
      description: event.description,
      data: event.data,
      priority: event.priority,
      read: event.read,
      actionRequired: event.actionRequired,
      expiresAt: event.expiresAt,
      createdAt: event.createdAt
    }));

    res.status(200).json({
      events: eventData,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: events.length
      },
      summary: {
        unread: events.filter(e => !e.read).length,
        actionRequired: events.filter(e => e.actionRequired).length,
        urgent: events.filter(e => e.priority === 'urgent').length
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/game/events/:id/read
 * Mark an event as read
 */
router.patch('/events/:id/read', [
  param('id').isUUID().withMessage('Invalid event ID format')
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

    const event = await getGameEvent(req.params.id);
    if (!event || event.empireId !== userEmpire.id) {
      throw new NotFoundError('Event not found or not accessible');
    }

    await markEventAsRead(event.id);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/game/leaderboard
 * Get current game leaderboard and rankings
 */
router.get('/leaderboard', [
  query('category')
    .optional()
    .isIn(['overall', 'military', 'economic', 'diplomatic', 'exploration'])
    .withMessage('Invalid leaderboard category'),
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

    const { category = 'overall', limit = 50 } = req.query;
    
    const leaderboard = await getLeaderboard(category, parseInt(limit));
    const userRanking = await getUserRanking(req.user.id, category);

    res.status(200).json({
      category,
      rankings: leaderboard.map((entry, index) => ({
        rank: index + 1,
        empire: {
          id: entry.empireId,
          name: entry.empireName,
          player: entry.playerName
        },
        score: entry.score,
        breakdown: entry.breakdown,
        change: entry.rankChange,
        isCurrentUser: entry.empireId === userRanking.empireId
      })),
      userRanking: {
        rank: userRanking.rank,
        score: userRanking.score,
        percentile: userRanking.percentile,
        breakdown: userRanking.breakdown
      },
      lastUpdated: leaderboard.lastUpdated
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Helper functions (these would be implemented in separate service modules)
 */
function getNextPhase(currentPhase) {
  const phases = ['production', 'movement', 'combat', 'diplomacy'];
  const currentIndex = phases.indexOf(currentPhase);
  return phases[(currentIndex + 1) % phases.length];
}

async function getPlayerActions(playerId, turnNumber) {
  const db = require('../config/database');
  const result = await db.query(
    'SELECT * FROM player_actions WHERE player_id = $1 AND turn_number = $2 ORDER BY timestamp DESC',
    [playerId, turnNumber]
  );
  return result.rows;
}

async function getUserActionPoints(playerId, turnNumber) {
  const actions = await getPlayerActions(playerId, turnNumber);
  const usedPoints = actions.reduce((sum, action) => sum + (action.action_points || 1), 0);
  return Math.max(0, 10 - usedPoints);
}

async function getUpcomingEvents(playerId) {
  // Placeholder implementation
  return {
    pending: [],
    scheduled: [],
    notifications: []
  };
}

async function getGlobalGameStats() {
  // Placeholder implementation
  return {
    activePlayers: 100,
    activeEmpires: 100,
    explorableSectors: 10000,
    activeBattles: 5,
    dailyTradeVolume: 1000000
  };
}

async function generateTurnSummary(empireId, turnNumber) {
  // Placeholder implementation
  return {
    resourceProduction: {},
    completedActions: [],
    completedProjects: [],
    newEvents: [],
    diplomaticUpdates: [],
    combatResults: []
  };
}

async function getAvailableActions(empire, gameState) {
  // Placeholder implementation
  return {
    empire: [],
    military: [],
    diplomacy: [],
    exploration: [],
    trade: []
  };
}

async function getAIRecommendations(empire, gameState) {
  // Placeholder implementation
  return {
    priority: [],
    economic: [],
    military: [],
    diplomatic: []
  };
}

function getPhaseRestrictions(phase) {
  const restrictions = {
    production: ['combat', 'movement'],
    movement: ['combat'],
    combat: ['diplomacy'],
    diplomacy: []
  };
  return restrictions[phase] || [];
}

async function getActionCooldowns(empireId) {
  // Placeholder implementation
  return {};
}

async function checkIfTurnEnded(playerId, turnNumber) {
  // Placeholder implementation
  return false;
}

async function processTurnEnd(empire, gameState) {
  // Placeholder implementation
  return {
    resourceProduction: {},
    buildingsCompleted: [],
    fleetsArrived: [],
    researchCompleted: [],
    diplomaticActions: []
  };
}

async function markTurnEnded(playerId, turnNumber) {
  // Placeholder implementation
}

async function checkAllPlayersEndedTurn(turnNumber) {
  // Placeholder implementation
  return false;
}

async function advanceGameState() {
  // Placeholder implementation
  return null;
}

async function getGameEvents(empireId, filters) {
  // Placeholder implementation
  return [];
}

async function getGameEvent(eventId) {
  // Placeholder implementation
  return null;
}

async function markEventAsRead(eventId) {
  // Placeholder implementation
}

async function getLeaderboard(category, limit) {
  // Placeholder implementation
  return [];
}

async function getUserRanking(playerId, category) {
  // Placeholder implementation
  return {
    empireId: 'user-empire-id',
    rank: 1,
    score: 100,
    percentile: 95,
    breakdown: {}
  };
}

module.exports = router;
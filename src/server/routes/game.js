/**
 * Game state routes for turn management and game status
 */
const express = require('express');
const { body, query, param, validationResult } = require('express-validator');

const Empire = require('../models/Empire');
const { ValidationError, NotFoundError, ConflictError } = require('../middleware/errorHandler');
const { requireActionPoints, consumeActionPoints, getCurrentGameState } = require('../middleware/gameState');

// Import game logic services
const TurnManager = require('../services/TurnManager');
const ResourceCalculator = require('../services/ResourceCalculator');
const GameBalanceEngine = require('../services/GameBalanceEngine');

// Initialize services
const turnManager = new TurnManager();
const resourceCalculator = new ResourceCalculator();
const gameBalanceEngine = new GameBalanceEngine();

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

    // Get current turn information from TurnManager
    const currentTurn = await turnManager.getCurrentTurn();
    const actionPointStatus = await turnManager.getActionPointStatus(req.user.id);
    
    // Get empire power rating
    const powerRating = await gameBalanceEngine.calculateEmpirePowerRating(userEmpire.id);
    
    res.status(200).json({
      turn: {
        number: currentTurn.turn_number,
        phase: currentTurn.phase,
        time_remaining_ms: currentTurn.time_remaining_ms,
        start_time: currentTurn.start_time,
        end_time: currentTurn.end_time,
        is_processing: currentTurn.is_processing
      },
      player: {
        actionPoints: {
          remaining: actionPointStatus.points_remaining,
          maximum: actionPointStatus.points_available,
          used: actionPointStatus.points_used,
          last_action: actionPointStatus.last_action,
          last_action_time: actionPointStatus.last_action_time
        },
        empire: {
          id: userEmpire.id,
          name: userEmpire.name,
          power_rating: powerRating.total_power,
          power_rank: powerRating.power_rank
        }
      },
      gameWorld: {
        current_turn: currentTurn.turn_number,
        phase: currentTurn.phase,
        time_remaining: currentTurn.time_remaining_ms
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/game/initialize
 * Initialize the game (admin only)
 */
router.post('/initialize', async (req, res, next) => {
  try {
    // Check if user is admin (you'd implement proper admin check)
    if (req.user.role !== 'admin') {
      throw new ValidationError('Only administrators can initialize the game');
    }

    const gameState = await turnManager.initializeGame();
    
    res.status(201).json({
      message: 'Game initialized successfully',
      initial_turn: gameState
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/game/advance-turn
 * Manually advance to next turn (admin only)
 */
router.post('/advance-turn', async (req, res, next) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      throw new ValidationError('Only administrators can advance turns');
    }

    const newTurn = await turnManager.advanceTurn();
    
    res.status(200).json({
      message: 'Turn advanced successfully',
      new_turn: newTurn
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
    
    // Get user ranking only if user is authenticated
    let userRanking = null;
    if (req.user && req.user.id) {
      userRanking = await getUserRanking(req.user.id, category);
    }

    const response = {
      category,
      rankings: leaderboard.map((entry, index) => ({
        rank: index + 1,
        empire: {
          id: entry.empireId,
          name: entry.empireName
        },
        player: {
          alias: entry.playerAlias
        },
        score: entry.score,
        breakdown: entry.breakdown,
        totalPlanets: entry.totalPlanets,
        totalUnits: entry.totalUnits,
        totalPopulation: entry.totalPopulation,
        totalResources: entry.totalResources,
        fleetCombatPower: entry.fleetCombatPower,
        technologyLevel: entry.technologyLevel,
        change: entry.rankChange,
        isCurrentUser: userRanking ? entry.empireId === userRanking.empireId : false
      })),
      lastUpdated: leaderboard.lastUpdated || new Date().toISOString()
    };

    // Include user ranking only if user is authenticated
    if (userRanking) {
      response.userRanking = {
        rank: userRanking.rank,
        score: userRanking.score,
        percentile: userRanking.percentile,
        breakdown: userRanking.breakdown
      };
    }

    res.status(200).json(response);
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

async function getLeaderboard(category = 'overall', limit = 50) {
  try {
    // Get all empires for leaderboard calculation
    const empires = await Empire.find({}, { 
      orderBy: { created_at: 'ASC' },
      limit: limit 
    });

    // Get player data for all empires to fetch display names
    const leaderboardEntries = await Promise.all(empires.map(async empire => {
      let score = 0;
      const breakdown = {};

      // Get planets and fleets for additional metrics
      let totalPlanets = 0;
      let totalUnits = 0;
      let totalPopulation = 0;
      let totalResources = 0;
      let fleetCombatPower = 0;
      let technologyLevel = 0;
      
      try {
        const planets = await empire.getPlanets();
        totalPlanets = planets ? planets.length : 0;
        
        // Calculate total population from all planets
        if (planets && planets.length > 0) {
          totalPopulation = planets.reduce((sum, planet) => {
            return sum + (planet.population || 0);
          }, 0);
        }
        
        const fleets = await empire.getFleets();
        if (fleets && fleets.length > 0) {
          totalUnits = fleets.reduce((sum, fleet) => {
            return sum + fleet.getFleetSize();
          }, 0);
          
          // Calculate total fleet combat power
          fleetCombatPower = fleets.reduce((sum, fleet) => {
            return sum + fleet.getTotalAttack() + fleet.getTotalDefense();
          }, 0);
        }
      } catch (relatedDataError) {
        console.warn(`Could not fetch planets/fleets for empire ${empire.id}:`, relatedDataError.message);
      }
      
      // Calculate total resources
      totalResources = (empire.resources?.minerals || 0) + 
                      (empire.resources?.energy || 0) + 
                      (empire.resources?.food || 0) + 
                      (empire.resources?.research || 0);
      
      // Calculate technology level
      technologyLevel = Object.keys(empire.technology || {}).length;

      switch (category) {
        case 'military':
          // Calculate military score (placeholder calculation)
          score = (empire.resources?.minerals || 0) * 0.5 + (empire.resources?.energy || 0) * 0.3;
          breakdown.militaryPower = score;
          break;
        case 'economic':
          // Calculate economic score
          score = (empire.resources?.minerals || 0) + (empire.resources?.energy || 0) + (empire.resources?.food || 0);
          breakdown.totalResources = score;
          break;
        case 'diplomatic':
          // Calculate diplomatic score (placeholder)
          score = Object.keys(empire.diplomacy || {}).length * 100;
          breakdown.diplomaticRelations = Object.keys(empire.diplomacy || {}).length;
          break;
        case 'exploration':
          // Calculate exploration score (placeholder)
          score = (empire.resources?.research || 0) * 2;
          breakdown.researchPoints = empire.resources?.research || 0;
          break;
        default: // overall
          // Calculate overall score
          const resources = (empire.resources?.minerals || 0) + (empire.resources?.energy || 0) + (empire.resources?.food || 0);
          const research = (empire.resources?.research || 0) * 2;
          const tech = Object.keys(empire.technology || {}).length * 50;
          score = resources + research + tech;
          breakdown.resources = resources;
          breakdown.research = research;
          breakdown.technology = tech;
          break;
      }

      // Fetch player data to get display name/alias
      let playerAlias = 'Unknown Commander';
      try {
        const Player = require('../models/Player');
        const player = await Player.findById(empire.playerId);
        if (player && player.profile?.displayName) {
          playerAlias = player.profile.displayName;
        } else if (player && player.username) {
          // Generate a space-themed alias if no displayName is set
          playerAlias = generateSpaceAlias(player.username);
        }
      } catch (playerError) {
        console.warn(`Could not fetch player data for empire ${empire.id}:`, playerError.message);
      }

      return {
        empireId: empire.id,
        empireName: empire.name,
        playerAlias: playerAlias,
        score: Math.floor(score),
        breakdown,
        totalPlanets,
        totalUnits,
        totalPopulation,
        totalResources,
        fleetCombatPower,
        technologyLevel,
        rankChange: 0 // TODO: Implement rank change tracking
      };
    }));

    // Sort by score descending
    leaderboardEntries.sort((a, b) => b.score - a.score);

    // Add lastUpdated timestamp
    leaderboardEntries.lastUpdated = new Date().toISOString();

    return leaderboardEntries;
  } catch (error) {
    console.error('Error generating leaderboard:', error);
    // Return empty leaderboard on error
    return [];
  }
}

/**
 * Generate a space-themed alias from username
 * @param {string} username - Original username
 * @returns {string} Space-themed alias
 */
function generateSpaceAlias(username) {
  const prefixes = ['Commander', 'Captain', 'Admiral', 'Colonel', 'Major', 'Pilot', 'Navigator', 'Chief'];
  const suffixes = ['of the Void', 'Starborn', 'Nebula', 'Prime', 'Cosmic', 'Solar', 'Nova', 'Galactic'];
  
  // Use first few characters of username and add space theme
  const baseTime = username.slice(0, 8);
  const prefix = prefixes[username.length % prefixes.length];
  const suffix = suffixes[username.charCodeAt(0) % suffixes.length];
  
  return `${prefix} ${baseTime} ${suffix}`;
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
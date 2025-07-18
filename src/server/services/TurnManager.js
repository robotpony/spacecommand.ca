/**
 * Turn Management System for SpaceCommand
 * Manages 24-hour turn cycles, action point allocation, and turn processing
 */

const BaseModel = require('../models/BaseModel');
const { GameError, ValidationError } = require('../middleware/errorHandler');

class TurnManager {
  constructor() {
    this.gameStateModel = new BaseModel('game_state');
    this.actionPointModel = new BaseModel('action_point_reservations');
    this.playerModel = new BaseModel('players');
    this.empireModel = new BaseModel('empires');
    
    // Turn duration: 24 hours (86400000 ms)
    this.TURN_DURATION_MS = 24 * 60 * 60 * 1000;
    this.ACTION_POINTS_PER_TURN = 10;
    this.EMERGENCY_ACTION_COST = 2; // Emergency actions cost 2x normal
  }

  /**
   * Gets the current turn number and phase information
   * @returns {Promise<Object>} Current turn state
   */
  async getCurrentTurn() {
    const gameState = await this.gameStateModel.findOne({ key: 'current_turn' });
    
    if (!gameState) {
      throw new GameError('Game not initialized. No current turn found.');
    }

    const turnData = JSON.parse(gameState.value);
    const now = Date.now();
    const turnStartTime = new Date(turnData.start_time).getTime();
    const turnEndTime = turnStartTime + this.TURN_DURATION_MS;
    const timeRemaining = Math.max(0, turnEndTime - now);
    
    return {
      turn_number: turnData.turn_number,
      start_time: turnData.start_time,
      end_time: new Date(turnEndTime).toISOString(),
      time_remaining_ms: timeRemaining,
      phase: this._getCurrentPhase(timeRemaining),
      is_processing: turnData.is_processing || false
    };
  }

  /**
   * Advances to the next turn and processes all end-of-turn events
   * @returns {Promise<Object>} New turn information
   */
  async advanceTurn() {
    return await this.gameStateModel.transaction(async (client) => {
      const currentTurn = await this.getCurrentTurn();
      
      if (currentTurn.is_processing) {
        throw new GameError('Turn is already being processed. Please wait.');
      }

      // Mark turn as processing
      await this._setTurnProcessing(true, client);
      
      try {
        // Process end-of-turn calculations
        await this._processEndOfTurn(currentTurn.turn_number, client);
        
        // Start new turn
        const newTurnNumber = currentTurn.turn_number + 1;
        const newTurnStart = new Date().toISOString();
        
        const newTurnData = {
          turn_number: newTurnNumber,
          start_time: newTurnStart,
          is_processing: false
        };

        await this.gameStateModel.updateWhere(
          { key: 'current_turn' },
          { value: JSON.stringify(newTurnData) },
          client
        );

        // Reset action points for all active players
        await this._resetActionPoints(client);
        
        // Log turn advancement
        console.log(`Turn advanced to ${newTurnNumber} at ${newTurnStart}`);
        
        return {
          turn_number: newTurnNumber,
          start_time: newTurnStart,
          end_time: new Date(Date.now() + this.TURN_DURATION_MS).toISOString(),
          time_remaining_ms: this.TURN_DURATION_MS,
          phase: 'active',
          is_processing: false
        };
        
      } catch (error) {
        await this._setTurnProcessing(false, client);
        throw error;
      }
    });
  }

  /**
   * Allocates action points to a player for the current turn
   * @param {number} playerId - Player ID
   * @param {number} points - Action points to allocate (default: full allocation)
   * @returns {Promise<Object>} Action point allocation result
   */
  async allocateActionPoints(playerId, points = this.ACTION_POINTS_PER_TURN) {
    const currentTurn = await this.getCurrentTurn();
    
    // Check if player already has action points for this turn
    const existing = await this.actionPointModel.findOne({
      player_id: playerId,
      turn_number: currentTurn.turn_number
    });

    if (existing) {
      return {
        player_id: playerId,
        turn_number: currentTurn.turn_number,
        points_available: existing.points_available,
        points_used: existing.points_used,
        last_updated: existing.updated_at
      };
    }

    // Create new action point allocation
    const allocation = await this.actionPointModel.create({
      player_id: playerId,
      turn_number: currentTurn.turn_number,
      points_available: points,
      points_used: 0
    });

    return {
      player_id: playerId,
      turn_number: currentTurn.turn_number,
      points_available: allocation.points_available,
      points_used: allocation.points_used,
      last_updated: allocation.created_at
    };
  }

  /**
   * Consumes action points for a player action
   * @param {number} playerId - Player ID
   * @param {number} cost - Action point cost
   * @param {string} action - Action description
   * @param {boolean} isEmergency - Whether this is an emergency action
   * @returns {Promise<Object>} Updated action point status
   */
  async consumeActionPoints(playerId, cost, action, isEmergency = false) {
    return await this.actionPointModel.transaction(async (client) => {
      const currentTurn = await this.getCurrentTurn();
      const actualCost = isEmergency ? cost * this.EMERGENCY_ACTION_COST : cost;
      
      // Get current action points with row lock
      const actionPoints = await client.query(
        'SELECT * FROM action_point_reservations WHERE player_id = $1 AND turn_number = $2 FOR UPDATE',
        [playerId, currentTurn.turn_number]
      );

      if (actionPoints.rows.length === 0) {
        throw new ValidationError('No action points allocated for current turn');
      }

      const current = actionPoints.rows[0];
      const availablePoints = current.points_available - current.points_used;

      if (availablePoints < actualCost) {
        throw new ValidationError(
          `Insufficient action points. Required: ${actualCost}, Available: ${availablePoints}`
        );
      }

      // Update action points
      const updated = await this.actionPointModel.update(
        current.id,
        { 
          points_used: current.points_used + actualCost,
          last_action: action,
          last_action_time: new Date().toISOString()
        },
        client
      );

      return {
        player_id: playerId,
        turn_number: currentTurn.turn_number,
        points_available: updated.points_available,
        points_used: updated.points_used,
        points_remaining: updated.points_available - updated.points_used,
        action_cost: actualCost,
        last_action: action,
        is_emergency: isEmergency
      };
    });
  }

  /**
   * Gets action point status for a player
   * @param {number} playerId - Player ID
   * @returns {Promise<Object>} Action point status
   */
  async getActionPointStatus(playerId) {
    const currentTurn = await this.getCurrentTurn();
    
    const actionPoints = await this.actionPointModel.findOne({
      player_id: playerId,
      turn_number: currentTurn.turn_number
    });

    if (!actionPoints) {
      // Auto-allocate if not exists
      return await this.allocateActionPoints(playerId);
    }

    return {
      player_id: playerId,
      turn_number: currentTurn.turn_number,
      points_available: actionPoints.points_available,
      points_used: actionPoints.points_used,
      points_remaining: actionPoints.points_available - actionPoints.points_used,
      last_action: actionPoints.last_action,
      last_action_time: actionPoints.last_action_time,
      last_updated: actionPoints.updated_at
    };
  }

  /**
   * Initializes the game with the first turn
   * @returns {Promise<Object>} Initial turn state
   */
  async initializeGame() {
    return await this.gameStateModel.transaction(async (client) => {
      // Check if game is already initialized
      const existing = await this.gameStateModel.findOne({ key: 'current_turn' });
      if (existing) {
        throw new GameError('Game is already initialized');
      }

      const turnData = {
        turn_number: 1,
        start_time: new Date().toISOString(),
        is_processing: false
      };

      await this.gameStateModel.create({
        key: 'current_turn',
        value: JSON.stringify(turnData)
      }, client);

      // Initialize other game state
      await this._initializeGameState(client);

      console.log('Game initialized with turn 1');
      
      return {
        turn_number: 1,
        start_time: turnData.start_time,
        end_time: new Date(Date.now() + this.TURN_DURATION_MS).toISOString(),
        time_remaining_ms: this.TURN_DURATION_MS,
        phase: 'active',
        is_processing: false
      };
    });
  }

  /**
   * Determines current turn phase based on time remaining
   * @param {number} timeRemaining - Time remaining in milliseconds
   * @returns {string} Current phase
   * @private
   */
  _getCurrentPhase(timeRemaining) {
    const totalTime = this.TURN_DURATION_MS;
    const timeElapsed = totalTime - timeRemaining;
    const percentElapsed = (timeElapsed / totalTime) * 100;

    if (percentElapsed < 80) return 'active';
    if (percentElapsed < 95) return 'warning';
    return 'final';
  }

  /**
   * Sets turn processing status
   * @param {boolean} isProcessing - Processing status
   * @param {Object} client - Database client
   * @private
   */
  async _setTurnProcessing(isProcessing, client) {
    const gameState = await this.gameStateModel.findOne({ key: 'current_turn' });
    const turnData = JSON.parse(gameState.value);
    turnData.is_processing = isProcessing;
    
    await this.gameStateModel.updateWhere(
      { key: 'current_turn' },
      { value: JSON.stringify(turnData) },
      client
    );
  }

  /**
   * Processes end-of-turn calculations
   * @param {number} turnNumber - Turn number being processed
   * @param {Object} client - Database client
   * @private
   */
  async _processEndOfTurn(turnNumber, client) {
    console.log(`Processing end of turn ${turnNumber}...`);
    
    // This will be enhanced when other services are implemented
    // For now, just log the processing
    
    // TODO: Process resource production (ResourceCalculator)
    // TODO: Process fleet movements
    // TODO: Process combat resolution (CombatResolver)
    // TODO: Process diplomacy proposals (DiplomacyProcessor)
    // TODO: Process territory expansion (TerritoryExpansion)
    
    console.log(`End of turn ${turnNumber} processing complete`);
  }

  /**
   * Resets action points for all active players
   * @param {Object} client - Database client
   * @private
   */
  async _resetActionPoints(client) {
    // Clear old action point reservations (keep last 5 turns for history)
    const currentTurn = await this.getCurrentTurn();
    await client.query(
      'DELETE FROM action_point_reservations WHERE turn_number < $1',
      [currentTurn.turn_number - 5]
    );

    console.log('Action points reset for new turn');
  }

  /**
   * Initializes other game state values
   * @param {Object} client - Database client
   * @private
   */
  async _initializeGameState(client) {
    const gameStateEntries = [
      { key: 'game_started', value: JSON.stringify({ started_at: new Date().toISOString() }) },
      { key: 'total_players', value: JSON.stringify({ count: 0 }) },
      { key: 'last_turn_process', value: JSON.stringify({ processed_at: new Date().toISOString() }) }
    ];

    for (const entry of gameStateEntries) {
      await this.gameStateModel.create(entry, client);
    }
  }
}

module.exports = TurnManager;
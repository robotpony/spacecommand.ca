/**
 * Tests for TurnManager service
 */

const TurnManager = require('../../src/server/services/TurnManager');
const BaseModel = require('../../src/server/models/BaseModel');

// Mock the BaseModel
jest.mock('../../src/server/models/BaseModel');

describe('TurnManager', () => {
  let turnManager;
  let mockGameStateModel;
  let mockActionPointModel;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock instances
    mockGameStateModel = {
      findOne: jest.fn(),
      create: jest.fn(),
      updateWhere: jest.fn(),
      transaction: jest.fn()
    };
    
    mockActionPointModel = {
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      transaction: jest.fn()
    };

    // Mock BaseModel constructor to return our mocks
    BaseModel.mockImplementation((tableName) => {
      if (tableName === 'game_state') return mockGameStateModel;
      if (tableName === 'action_point_reservations') return mockActionPointModel;
      return {};
    });

    turnManager = new TurnManager();
  });

  describe('initializeGame', () => {
    it('should initialize game successfully', async () => {
      // Mock no existing game state
      mockGameStateModel.findOne.mockResolvedValue(null);
      mockGameStateModel.transaction.mockImplementation(async (callback) => {
        return await callback({});
      });
      mockGameStateModel.create.mockResolvedValue({
        key: 'current_turn',
        value: JSON.stringify({
          turn_number: 1,
          start_time: '2024-01-01T00:00:00.000Z',
          is_processing: false
        })
      });

      const result = await turnManager.initializeGame();

      expect(result.turn_number).toBe(1);
      expect(result.phase).toBe('active');
      expect(mockGameStateModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'current_turn',
          value: expect.any(String)
        }),
        {}
      );
    });

    it('should throw error if game already initialized', async () => {
      // Mock existing game state
      mockGameStateModel.findOne.mockResolvedValue({
        key: 'current_turn',
        value: JSON.stringify({ turn_number: 1 })
      });

      await expect(turnManager.initializeGame()).rejects.toThrow('Game is already initialized');
    });
  });

  describe('getCurrentTurn', () => {
    it('should return current turn information', async () => {
      const mockTurnData = {
        turn_number: 5,
        start_time: '2024-01-01T00:00:00.000Z',
        is_processing: false
      };

      mockGameStateModel.findOne.mockResolvedValue({
        value: JSON.stringify(mockTurnData)
      });

      const result = await turnManager.getCurrentTurn();

      expect(result.turn_number).toBe(5);
      expect(result.phase).toBe('active');
      expect(result.time_remaining_ms).toBeGreaterThan(0);
    });

    it('should throw error if no current turn found', async () => {
      mockGameStateModel.findOne.mockResolvedValue(null);

      await expect(turnManager.getCurrentTurn()).rejects.toThrow('Game not initialized');
    });
  });

  describe('allocateActionPoints', () => {
    it('should allocate action points for new turn', async () => {
      const mockTurn = {
        turn_number: 1,
        start_time: '2024-01-01T00:00:00.000Z',
        time_remaining_ms: 86400000,
        phase: 'active'
      };

      turnManager.getCurrentTurn = jest.fn().mockResolvedValue(mockTurn);
      mockActionPointModel.findOne.mockResolvedValue(null);
      mockActionPointModel.create.mockResolvedValue({
        player_id: 1,
        turn_number: 1,
        points_available: 10,
        points_used: 0,
        created_at: '2024-01-01T00:00:00.000Z'
      });

      const result = await turnManager.allocateActionPoints(1);

      expect(result.points_available).toBe(10);
      expect(result.points_used).toBe(0);
      expect(mockActionPointModel.create).toHaveBeenCalled();
    });

    it('should return existing action points if already allocated', async () => {
      const mockTurn = {
        turn_number: 1,
        start_time: '2024-01-01T00:00:00.000Z'
      };

      turnManager.getCurrentTurn = jest.fn().mockResolvedValue(mockTurn);
      mockActionPointModel.findOne.mockResolvedValue({
        player_id: 1,
        turn_number: 1,
        points_available: 10,
        points_used: 3,
        updated_at: '2024-01-01T01:00:00.000Z'
      });

      const result = await turnManager.allocateActionPoints(1);

      expect(result.points_available).toBe(10);
      expect(result.points_used).toBe(3);
      expect(mockActionPointModel.create).not.toHaveBeenCalled();
    });
  });

  describe('consumeActionPoints', () => {
    it('should consume action points successfully', async () => {
      const mockTurn = { turn_number: 1 };
      turnManager.getCurrentTurn = jest.fn().mockResolvedValue(mockTurn);

      mockActionPointModel.transaction.mockImplementation(async (callback) => {
        const mockClient = {
          query: jest.fn().mockResolvedValue({
            rows: [{
              id: 'ap-1',
              points_available: 10,
              points_used: 2
            }]
          })
        };
        return await callback(mockClient);
      });

      mockActionPointModel.update.mockResolvedValue({
        points_available: 10,
        points_used: 5,
        last_action: 'test_action'
      });

      const result = await turnManager.consumeActionPoints(1, 3, 'test_action');

      expect(result.points_used).toBe(5);
      expect(result.points_remaining).toBe(5);
      expect(result.action_cost).toBe(3);
    });

    it('should throw error for insufficient action points', async () => {
      const mockTurn = { turn_number: 1 };
      turnManager.getCurrentTurn = jest.fn().mockResolvedValue(mockTurn);

      mockActionPointModel.transaction.mockImplementation(async (callback) => {
        const mockClient = {
          query: jest.fn().mockResolvedValue({
            rows: [{
              id: 'ap-1',
              points_available: 10,
              points_used: 8
            }]
          })
        };
        return await callback(mockClient);
      });

      await expect(turnManager.consumeActionPoints(1, 5, 'test_action'))
        .rejects.toThrow('Insufficient action points');
    });

    it('should apply emergency action cost multiplier', async () => {
      const mockTurn = { turn_number: 1 };
      turnManager.getCurrentTurn = jest.fn().mockResolvedValue(mockTurn);

      mockActionPointModel.transaction.mockImplementation(async (callback) => {
        const mockClient = {
          query: jest.fn().mockResolvedValue({
            rows: [{
              id: 'ap-1',
              points_available: 10,
              points_used: 0
            }]
          })
        };
        return await callback(mockClient);
      });

      mockActionPointModel.update.mockResolvedValue({
        points_available: 10,
        points_used: 6, // 3 * 2 (emergency multiplier)
        last_action: 'emergency_action'
      });

      const result = await turnManager.consumeActionPoints(1, 3, 'emergency_action', true);

      expect(result.action_cost).toBe(6);
      expect(result.is_emergency).toBe(true);
    });
  });

  describe('advanceTurn', () => {
    it('should advance turn successfully', async () => {
      const mockCurrentTurn = {
        turn_number: 1,
        is_processing: false
      };

      turnManager.getCurrentTurn = jest.fn().mockResolvedValue(mockCurrentTurn);
      
      mockGameStateModel.transaction.mockImplementation(async (callback) => {
        return await callback({});
      });

      // Mock the private methods
      turnManager._setTurnProcessing = jest.fn();
      turnManager._processEndOfTurn = jest.fn();
      turnManager._resetActionPoints = jest.fn();

      mockGameStateModel.updateWhere.mockResolvedValue({});

      const result = await turnManager.advanceTurn();

      expect(result.turn_number).toBe(2);
      expect(result.phase).toBe('active');
      expect(turnManager._processEndOfTurn).toHaveBeenCalledWith(1, {});
    });

    it('should throw error if turn is already processing', async () => {
      const mockCurrentTurn = {
        turn_number: 1,
        is_processing: true
      };

      turnManager.getCurrentTurn = jest.fn().mockResolvedValue(mockCurrentTurn);

      await expect(turnManager.advanceTurn()).rejects.toThrow('Turn is already being processed');
    });
  });

  describe('_getCurrentPhase', () => {
    it('should return correct phase based on time remaining', () => {
      const totalTime = 86400000; // 24 hours

      // Active phase (< 80% elapsed)
      expect(turnManager._getCurrentPhase(totalTime * 0.5)).toBe('active');
      
      // Warning phase (80-95% elapsed)
      expect(turnManager._getCurrentPhase(totalTime * 0.1)).toBe('warning');
      
      // Final phase (> 95% elapsed)
      expect(turnManager._getCurrentPhase(totalTime * 0.01)).toBe('final');
    });
  });
});

module.exports = {};
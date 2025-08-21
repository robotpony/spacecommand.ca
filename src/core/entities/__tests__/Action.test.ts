import { Action, ActionValidationResult, ActionExecutionResult } from '../Action';

describe('Action Entity', () => {
  let action: Action;
  const baseParams = {
    actionId: 'action-123',
    playerId: 'player-456', 
    turnId: 'turn-789',
    type: 'move_fleet' as const,
    parameters: { fleetId: 'fleet-001', destination: { x: 5, y: 3, z: 0 } }
  };

  beforeEach(() => {
    action = new Action(
      baseParams.actionId,
      baseParams.playerId,
      baseParams.turnId,
      baseParams.type,
      baseParams.parameters
    );
  });

  describe('Constructor', () => {
    it('should initialize with correct properties', () => {
      expect(action.id).toBe(baseParams.actionId);
      expect(action.playerId).toBe(baseParams.playerId);
      expect(action.turnId).toBe(baseParams.turnId);
      expect(action.type).toBe(baseParams.type);
      expect(action.priority).toBe(6); // move_fleet priority
      expect(action.parameters).toEqual(baseParams.parameters);
      expect(action.retryCount).toBe(0);
      expect(action.canceled).toBe(false);
      expect(action.submittedAt).toBeInstanceOf(Date);
    });

    it('should create defensive copy of parameters', () => {
      const originalParams = { fleetId: 'test' };
      const testAction = new Action('test', 'player', 'turn', 'trade', originalParams);
      
      originalParams.fleetId = 'modified';
      expect(testAction.parameters.fleetId).toBe('test');
    });

    it('should set correct priorities for different action types', () => {
      const priorities = [
        { type: 'diplomacy', expectedPriority: 1 },
        { type: 'research', expectedPriority: 2 },
        { type: 'build_ships', expectedPriority: 3 },
        { type: 'repair', expectedPriority: 4 },
        { type: 'transfer', expectedPriority: 5 },
        { type: 'move_fleet', expectedPriority: 6 },
        { type: 'mine', expectedPriority: 7 },
        { type: 'trade', expectedPriority: 8 },
        { type: 'colonize', expectedPriority: 9 },
        { type: 'attack', expectedPriority: 10 }
      ] as const;

      priorities.forEach(({ type, expectedPriority }) => {
        const testAction = new Action('test', 'player', 'turn', type);
        expect(testAction.priority).toBe(expectedPriority);
      });
    });
  });

  describe('Validation State', () => {
    it('should handle validation results correctly', () => {
      expect(action.isValid()).toBe(false); // No validation result yet
      
      const validResult: ActionValidationResult = {
        isValid: true
      };
      
      action.setValidationResult(validResult);
      expect(action.isValid()).toBe(true);
      expect(action.validationResult).toEqual(validResult);
    });

    it('should handle failed validation', () => {
      const invalidResult: ActionValidationResult = {
        isValid: false,
        errorMessage: 'Fleet not found',
        errorCode: 'FLEET_NOT_FOUND'
      };
      
      action.setValidationResult(invalidResult);
      expect(action.isValid()).toBe(false);
      expect(action.validationResult).toEqual(invalidResult);
    });
  });

  describe('Execution State', () => {
    it('should handle execution results correctly', () => {
      expect(action.isExecuted()).toBe(false);
      expect(action.wasSuccessful()).toBe(false);
      
      const successResult: ActionExecutionResult = {
        result: 'success',
        message: 'Fleet moved successfully',
        data: { newPosition: { x: 5, y: 3, z: 0 } },
        sideEffects: ['Fleet position updated']
      };
      
      action.setExecutionResult(successResult);
      expect(action.isExecuted()).toBe(true);
      expect(action.wasSuccessful()).toBe(true);
      expect(action.executionResult).toEqual(successResult);
      expect(action.processedAt).toBeInstanceOf(Date);
    });

    it('should handle failed execution', () => {
      const failedResult: ActionExecutionResult = {
        result: 'failed',
        message: 'Insufficient fuel for movement'
      };
      
      action.setExecutionResult(failedResult);
      expect(action.isExecuted()).toBe(true);
      expect(action.wasSuccessful()).toBe(false);
    });
  });

  describe('Action Management', () => {
    it('should cancel action correctly', () => {
      const reason = 'Player requested cancellation';
      action.cancel(reason);
      
      expect(action.canceled).toBe(true);
      expect(action.executionResult?.result).toBe('cancelled');
      expect(action.executionResult?.message).toBe(reason);
    });

    it('should increment retry count', () => {
      expect(action.retryCount).toBe(0);
      
      const newCount = action.incrementRetry();
      expect(newCount).toBe(1);
      expect(action.retryCount).toBe(1);
      
      action.incrementRetry();
      expect(action.retryCount).toBe(2);
    });

    it('should get parameters with default values', () => {
      expect(action.getParameter('fleetId', 'default')).toBe('fleet-001');
      expect(action.getParameter('nonexistent', 'default')).toBe('default');
      expect(action.getParameter('destination', {})).toEqual({ x: 5, y: 3, z: 0 });
    });
  });

  describe('Factory Methods', () => {
    it('should create move fleet action correctly', () => {
      const moveAction = Action.createMoveFleet(
        'move-1',
        'player-1',
        'turn-1',
        'fleet-1',
        { x: 10, y: 5, z: 2 }
      );
      
      expect(moveAction.type).toBe('move_fleet');
      expect(moveAction.getParameter('fleetId', '')).toBe('fleet-1');
      expect(moveAction.getParameter('destination', {})).toEqual({ x: 10, y: 5, z: 2 });
    });

    it('should create trade action correctly', () => {
      const tradeAction = Action.createTrade(
        'trade-1',
        'player-1',
        'turn-1',
        'station-1',
        'ore',
        100,
        50.5
      );
      
      expect(tradeAction.type).toBe('trade');
      expect(tradeAction.getParameter('stationId', '')).toBe('station-1');
      expect(tradeAction.getParameter('resourceType', '')).toBe('ore');
      expect(tradeAction.getParameter('quantity', 0)).toBe(100);
      expect(tradeAction.getParameter('maxPrice', 0)).toBe(50.5);
    });

    it('should create attack action correctly', () => {
      const attackAction = Action.createAttack(
        'attack-1',
        'player-1',
        'turn-1',
        'attacker-fleet',
        'target-fleet',
        'aggressive'
      );
      
      expect(attackAction.type).toBe('attack');
      expect(attackAction.getParameter('attackerFleetId', '')).toBe('attacker-fleet');
      expect(attackAction.getParameter('targetFleetId', '')).toBe('target-fleet');
      expect(attackAction.getParameter('tacticsType', '')).toBe('aggressive');
    });

    it('should create research action correctly', () => {
      const researchAction = Action.createResearch(
        'research-1',
        'player-1',
        'turn-1',
        'tech-warp-drive',
        500
      );
      
      expect(researchAction.type).toBe('research');
      expect(researchAction.getParameter('technologyId', '')).toBe('tech-warp-drive');
      expect(researchAction.getParameter('researchPoints', 0)).toBe(500);
    });

    it('should use default tactics for attack action', () => {
      const attackAction = Action.createAttack(
        'attack-1',
        'player-1',
        'turn-1',
        'attacker-fleet',
        'target-fleet'
      );
      
      expect(attackAction.getParameter('tacticsType', '')).toBe('balanced');
    });
  });

  describe('Serialization', () => {
    it('should serialize to data correctly', () => {
      action.setValidationResult({ isValid: true });
      action.setExecutionResult({ result: 'success', message: 'Done' });
      action.incrementRetry();
      
      const data = action.toData();
      
      expect(data.id).toBe(action.id);
      expect(data.playerId).toBe(action.playerId);
      expect(data.turnId).toBe(action.turnId);
      expect(data.type).toBe(action.type);
      expect(data.priority).toBe(action.priority);
      expect(data.submittedAt).toBe(action.submittedAt.toISOString());
      expect(data.parameters).toEqual(action.parameters);
      expect(data.validationResult).toEqual(action.validationResult);
      expect(data.executionResult).toEqual(action.executionResult);
      expect(data.processedAt).toBe(action.processedAt?.toISOString());
      expect(data.retryCount).toBe(1);
      expect(data.canceled).toBe(false);
    });

    it('should deserialize from data correctly', () => {
      const originalAction = action;
      originalAction.setValidationResult({ isValid: true });
      originalAction.setExecutionResult({ result: 'success', message: 'Done' });
      originalAction.incrementRetry();
      originalAction.cancel('test');
      
      const data = originalAction.toData();
      const restoredAction = Action.fromData(data);
      
      expect(restoredAction.id).toBe(originalAction.id);
      expect(restoredAction.playerId).toBe(originalAction.playerId);
      expect(restoredAction.turnId).toBe(originalAction.turnId);
      expect(restoredAction.type).toBe(originalAction.type);
      expect(restoredAction.priority).toBe(originalAction.priority);
      expect(restoredAction.submittedAt.getTime()).toBe(originalAction.submittedAt.getTime());
      expect(restoredAction.parameters).toEqual(originalAction.parameters);
      expect(restoredAction.validationResult).toEqual(originalAction.validationResult);
      expect(restoredAction.executionResult).toEqual(originalAction.executionResult);
      expect(restoredAction.processedAt?.getTime()).toBe(originalAction.processedAt?.getTime());
      expect(restoredAction.retryCount).toBe(originalAction.retryCount);
      expect(restoredAction.canceled).toBe(originalAction.canceled);
    });

    it('should handle serialization without optional fields', () => {
      const simpleAction = new Action('simple', 'player', 'turn', 'trade');
      const data = simpleAction.toData();
      
      expect(data.validationResult).toBeUndefined();
      expect(data.executionResult).toBeUndefined();
      expect(data.processedAt).toBeUndefined();
      expect(data.retryCount).toBe(0);
      expect(data.canceled).toBe(false);
      
      const restored = Action.fromData(data);
      expect(restored.validationResult).toBeUndefined();
      expect(restored.executionResult).toBeUndefined();
      expect(restored.processedAt).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty parameters', () => {
      const emptyAction = new Action('empty', 'player', 'turn', 'trade', {});
      expect(emptyAction.parameters).toEqual({});
      expect(emptyAction.getParameter('anything', 'default')).toBe('default');
    });

    it('should handle null/undefined parameter values', () => {
      const nullAction = new Action('null', 'player', 'turn', 'trade', { 
        nullValue: null, 
        undefinedValue: undefined,
        zeroValue: 0,
        falseValue: false
      });
      
      expect(nullAction.getParameter('nullValue', 'default')).toBe(null);
      expect(nullAction.getParameter('undefinedValue', 'default')).toBe('default');
      expect(nullAction.getParameter('zeroValue', 'default')).toBe(0);
      expect(nullAction.getParameter('falseValue', 'default')).toBe(false);
    });

    it('should maintain immutability of parameters', () => {
      const params = { fleet: { id: 'test', ships: [1, 2, 3] } };
      const testAction = new Action('test', 'player', 'turn', 'trade', params);
      
      // Modify original
      params.fleet.id = 'modified';
      params.fleet.ships.push(4);
      
      // Action should have original values
      expect(testAction.parameters.fleet.id).toBe('test');
      expect(testAction.parameters.fleet.ships).toEqual([1, 2, 3]);
    });

    it('should handle multiple cancellations gracefully', () => {
      action.cancel('First reason');
      action.cancel('Second reason');
      
      expect(action.canceled).toBe(true);
      expect(action.executionResult?.message).toBe('Second reason'); // Last cancellation wins
    });
  });

  describe('State Transitions', () => {
    it('should prevent execution after cancellation', () => {
      action.cancel('Cancelled');
      action.setExecutionResult({ result: 'success', message: 'Should not happen' });
      
      expect(action.executionResult?.result).toBe('cancelled');
    });

    it('should allow validation after cancellation', () => {
      action.cancel('Cancelled');
      action.setValidationResult({ isValid: true });
      
      expect(action.isValid()).toBe(true);
      expect(action.canceled).toBe(true);
    });

    it('should maintain execution timestamp consistency', () => {
      const beforeExecution = new Date();
      action.setExecutionResult({ result: 'success', message: 'Done' });
      const afterExecution = new Date();
      
      expect(action.processedAt!.getTime()).toBeGreaterThanOrEqual(beforeExecution.getTime());
      expect(action.processedAt!.getTime()).toBeLessThanOrEqual(afterExecution.getTime());
    });
  });
});
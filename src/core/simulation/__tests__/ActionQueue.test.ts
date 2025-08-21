import { ActionQueue } from '../ActionQueue';
import { Action } from '../../entities/Action';

describe('ActionQueue', () => {
  let queue: ActionQueue;
  const turnId = 'turn-123';

  beforeEach(() => {
    queue = new ActionQueue(turnId, 10); // Max 10 actions per player
  });

  describe('Constructor', () => {
    it('should initialize with correct properties', () => {
      expect(queue.isEmpty()).toBe(true);
      expect(queue.size()).toBe(0);
    });

    it('should accept custom action limits and types', () => {
      const customQueue = new ActionQueue(
        'turn-456', 
        5, 
        ['move_fleet', 'trade', 'attack']
      );
      
      expect(customQueue.isEmpty()).toBe(true);
    });
  });

  describe('Action Management', () => {
    let action1: Action;
    let action2: Action;
    let action3: Action;

    beforeEach(() => {
      action1 = new Action('action-1', 'player-1', turnId, 'move_fleet');
      action2 = new Action('action-2', 'player-1', turnId, 'trade');
      action3 = new Action('action-3', 'player-2', turnId, 'attack');
    });

    it('should add actions successfully', () => {
      expect(queue.addAction(action1)).toBe(true);
      expect(queue.size()).toBe(1);
      expect(queue.isEmpty()).toBe(false);
      
      expect(queue.addAction(action2)).toBe(true);
      expect(queue.size()).toBe(2);
    });

    it('should retrieve actions by ID', () => {
      queue.addAction(action1);
      
      const retrieved = queue.getAction('action-1');
      expect(retrieved).toBe(action1);
      
      const notFound = queue.getAction('nonexistent');
      expect(notFound).toBeUndefined();
    });

    it('should track player action counts', () => {
      queue.addAction(action1);
      queue.addAction(action2);
      queue.addAction(action3);
      
      expect(queue.getPlayerActionCount('player-1')).toBe(2);
      expect(queue.getPlayerActionCount('player-2')).toBe(1);
      expect(queue.getPlayerActionCount('nonexistent')).toBe(0);
    });

    it('should get actions by player', () => {
      queue.addAction(action1);
      queue.addAction(action2);
      queue.addAction(action3);
      
      const player1Actions = queue.getPlayerActions('player-1');
      expect(player1Actions).toHaveLength(2);
      expect(player1Actions).toContain(action1);
      expect(player1Actions).toContain(action2);
      
      const player2Actions = queue.getPlayerActions('player-2');
      expect(player2Actions).toHaveLength(1);
      expect(player2Actions).toContain(action3);
    });

    it('should remove actions by player', () => {
      queue.addAction(action1);
      queue.addAction(action2);
      
      expect(queue.removeAction('action-1', 'player-1')).toBe(true);
      expect(queue.size()).toBe(1);
      expect(queue.getAction('action-1')).toBeUndefined();
      
      // Should not remove if wrong player
      expect(() => queue.removeAction('action-2', 'wrong-player')).toThrow('cannot remove action');
      expect(queue.size()).toBe(1);
    });
  });

  describe('Validation Rules', () => {
    it('should reject actions for wrong turn', () => {
      const wrongTurnAction = new Action('action-1', 'player-1', 'wrong-turn', 'trade');
      
      expect(() => queue.addAction(wrongTurnAction)).toThrow('belongs to turn wrong-turn');
    });

    it('should reject duplicate action IDs', () => {
      const action1 = new Action('duplicate', 'player-1', turnId, 'trade');
      const action2 = new Action('duplicate', 'player-2', turnId, 'move_fleet');
      
      queue.addAction(action1);
      expect(() => queue.addAction(action2)).toThrow('already exists in queue');
    });

    it('should enforce player action limits', () => {
      const limitQueue = new ActionQueue(turnId, 2); // Limit to 2 actions
      
      const action1 = new Action('action-1', 'player-1', turnId, 'trade');
      const action2 = new Action('action-2', 'player-1', turnId, 'move_fleet');
      const action3 = new Action('action-3', 'player-1', turnId, 'attack');
      
      expect(limitQueue.addAction(action1)).toBe(true);
      expect(limitQueue.addAction(action2)).toBe(true);
      expect(() => limitQueue.addAction(action3)).toThrow('reached maximum actions limit');
    });

    it('should enforce allowed action types', () => {
      const restrictedQueue = new ActionQueue(turnId, 10, ['trade', 'move_fleet']);
      
      const allowedAction = new Action('action-1', 'player-1', turnId, 'trade');
      const disallowedAction = new Action('action-2', 'player-1', turnId, 'attack');
      
      expect(restrictedQueue.addAction(allowedAction)).toBe(true);
      expect(() => restrictedQueue.addAction(disallowedAction)).toThrow('not allowed in this turn');
    });

    it('should prevent removal of processed actions', () => {
      const action = new Action('action-1', 'player-1', turnId, 'trade');
      action.setExecutionResult({ result: 'success', message: 'Done' });
      
      queue.addAction(action);
      
      expect(() => queue.removeAction('action-1', 'player-1')).toThrow('already been processed');
    });
  });

  describe('Priority Ordering', () => {
    it('should sort actions by priority and submission time', () => {
      // Create actions with different priorities (submitted in reverse priority order)
      const attackAction = new Action('attack', 'player-1', turnId, 'attack'); // Priority 10
      const tradeAction = new Action('trade', 'player-1', turnId, 'trade'); // Priority 8
      const diplomacyAction = new Action('diplomacy', 'player-1', turnId, 'diplomacy'); // Priority 1
      
      // Add in non-priority order
      queue.addAction(attackAction);
      queue.addAction(tradeAction);
      queue.addAction(diplomacyAction);
      
      const sortedActions = queue.getAllActions();
      
      expect(sortedActions[0]).toBe(diplomacyAction); // Priority 1 first
      expect(sortedActions[1]).toBe(tradeAction);     // Priority 8 second
      expect(sortedActions[2]).toBe(attackAction);    // Priority 10 last
    });

    it('should sort by submission time when priorities are equal', () => {
      const action1 = new Action('action-1', 'player-1', turnId, 'trade');
      
      queue.addAction(action1);
      
      // Small delay to ensure different submission times
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const action2 = new Action('action-2', 'player-2', turnId, 'trade'); // Same priority
          queue.addAction(action2);
          
          const sortedActions = queue.getAllActions();
          expect(sortedActions[0]).toBe(action1); // Submitted first
          expect(sortedActions[1]).toBe(action2); // Submitted second
          resolve();
        }, 10);
      });
    });
  });

  describe('Filtering and Querying', () => {
    let validAction: Action;
    let invalidAction: Action;
    let executedAction: Action;

    beforeEach(() => {
      validAction = new Action('valid', 'player-1', turnId, 'trade');
      validAction.setValidationResult({ isValid: true });
      
      invalidAction = new Action('invalid', 'player-1', turnId, 'move_fleet');
      invalidAction.setValidationResult({ isValid: false, errorMessage: 'Invalid move' });
      
      executedAction = new Action('executed', 'player-1', turnId, 'attack');
      executedAction.setValidationResult({ isValid: true });
      executedAction.setExecutionResult({ result: 'success', message: 'Done' });
      
      queue.addAction(validAction);
      queue.addAction(invalidAction);
      queue.addAction(executedAction);
    });

    it('should find unvalidated actions', () => {
      const unvalidatedAction = new Action('unvalidated', 'player-2', turnId, 'repair');
      queue.addAction(unvalidatedAction);
      
      const unvalidated = queue.getUnvalidatedActions();
      expect(unvalidated).toHaveLength(1);
      expect(unvalidated[0]).toBe(unvalidatedAction);
    });

    it('should find valid unexecuted actions', () => {
      const validUnexecuted = queue.getValidUnexecutedActions();
      expect(validUnexecuted).toHaveLength(1);
      expect(validUnexecuted[0]).toBe(validAction);
    });

    it('should find failed validation actions', () => {
      const failedValidation = queue.getFailedValidationActions();
      expect(failedValidation).toHaveLength(1);
      expect(failedValidation[0]).toBe(invalidAction);
    });

    it('should filter actions by type', () => {
      const tradeActions = queue.getActionsByType('trade');
      expect(tradeActions).toHaveLength(1);
      expect(tradeActions[0]).toBe(validAction);
      
      const repairActions = queue.getActionsByType('repair');
      expect(repairActions).toHaveLength(0);
    });
  });

  describe('Player Management', () => {
    it('should track participating players', () => {
      const action1 = new Action('action-1', 'player-1', turnId, 'trade');
      const action2 = new Action('action-2', 'player-2', turnId, 'move_fleet');
      const action3 = new Action('action-3', 'player-1', turnId, 'attack'); // Same player
      
      queue.addAction(action1);
      queue.addAction(action2);
      queue.addAction(action3);
      
      const participants = queue.getParticipatingPlayers();
      expect(participants).toHaveLength(2);
      expect(participants).toContain('player-1');
      expect(participants).toContain('player-2');
    });

    it('should check if player is at action limit', () => {
      const limitQueue = new ActionQueue(turnId, 2);
      
      expect(limitQueue.isPlayerAtLimit('player-1')).toBe(false);
      
      limitQueue.addAction(new Action('action-1', 'player-1', turnId, 'trade'));
      expect(limitQueue.isPlayerAtLimit('player-1')).toBe(false);
      
      limitQueue.addAction(new Action('action-2', 'player-1', turnId, 'move_fleet'));
      expect(limitQueue.isPlayerAtLimit('player-1')).toBe(true);
    });
  });

  describe('Statistics', () => {
    beforeEach(() => {
      queue.addAction(new Action('action-1', 'player-1', turnId, 'trade'));
      queue.addAction(new Action('action-2', 'player-1', turnId, 'move_fleet'));
      queue.addAction(new Action('action-3', 'player-2', turnId, 'trade'));
      queue.addAction(new Action('action-4', 'player-2', turnId, 'attack'));
    });

    it('should generate correct statistics', () => {
      const stats = queue.getStatistics();
      
      expect(stats.totalActions).toBe(4);
      expect(stats.actionsByType.trade).toBe(2);
      expect(stats.actionsByType.move_fleet).toBe(1);
      expect(stats.actionsByType.attack).toBe(1);
      expect(stats.actionsByPlayer['player-1']).toBe(2);
      expect(stats.actionsByPlayer['player-2']).toBe(2);
    });

    it('should track priority distribution', () => {
      const stats = queue.getStatistics();
      
      expect(stats.priorityDistribution[6]).toBe(1); // move_fleet
      expect(stats.priorityDistribution[8]).toBe(2); // trade  
      expect(stats.priorityDistribution[10]).toBe(1); // attack
    });
  });

  describe('State Management', () => {
    it('should clear all actions', () => {
      queue.addAction(new Action('action-1', 'player-1', turnId, 'trade'));
      queue.addAction(new Action('action-2', 'player-2', turnId, 'move_fleet'));
      
      expect(queue.size()).toBe(2);
      
      queue.clear();
      
      expect(queue.size()).toBe(0);
      expect(queue.isEmpty()).toBe(true);
      expect(queue.getParticipatingPlayers()).toHaveLength(0);
    });

    it('should export complete state', () => {
      const action1 = new Action('action-1', 'player-1', turnId, 'trade');
      const action2 = new Action('action-2', 'player-2', turnId, 'move_fleet');
      
      queue.addAction(action1);
      queue.addAction(action2);
      
      const exportedState = queue.exportState();
      
      expect(exportedState.turnId).toBe(turnId);
      expect(exportedState.maxActionsPerPlayer).toBe(10);
      expect(exportedState.allowedActionTypes).toHaveLength(10);
      expect(exportedState.actions).toHaveLength(2);
      expect(exportedState.statistics.totalActions).toBe(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle actions with same submission time', () => {
      const originalNow = Date.now;
      const fixedTime = Date.now();
      Date.now = jest.fn(() => fixedTime);
      
      try {
        const action1 = new Action('action-1', 'player-1', turnId, 'trade');
        const action2 = new Action('action-2', 'player-2', turnId, 'trade');
        
        queue.addAction(action1);
        queue.addAction(action2);
        
        const sorted = queue.getAllActions();
        // Should maintain insertion order when times are identical
        expect(sorted[0]).toBe(action1);
        expect(sorted[1]).toBe(action2);
      } finally {
        Date.now = originalNow;
      }
    });

    it('should handle empty player action removal', () => {
      const action = new Action('action-1', 'player-1', turnId, 'trade');
      queue.addAction(action);
      
      // Remove the only action for this player
      queue.removeAction('action-1', 'player-1');
      
      // Should clean up empty player entry
      expect(queue.getParticipatingPlayers()).not.toContain('player-1');
      expect(queue.getPlayerActionCount('player-1')).toBe(0);
    });

    it('should handle removal of non-existent actions gracefully', () => {
      expect(queue.removeAction('nonexistent', 'player-1')).toBe(false);
    });

    it('should handle very large action counts', () => {
      const largeQueue = new ActionQueue(turnId, 1000);
      
      // Add many actions
      for (let i = 0; i < 500; i++) {
        const action = new Action(`action-${i}`, `player-${i % 10}`, turnId, 'trade');
        largeQueue.addAction(action);
      }
      
      expect(largeQueue.size()).toBe(500);
      expect(largeQueue.getParticipatingPlayers()).toHaveLength(10);
      
      // Should still sort correctly
      const sorted = largeQueue.getAllActions();
      expect(sorted).toHaveLength(500);
    });
  });
});
import { Turn, TurnConfig } from '../Turn';

describe('Turn Entity', () => {
  let defaultConfig: TurnConfig;
  let turn: Turn;

  beforeEach(() => {
    defaultConfig = {
      durationMs: 2 * 60 * 60 * 1000, // 2 hours
      maxActions: 10,
      processingTimeoutMs: 5 * 60 * 1000 // 5 minutes
    };
    
    turn = new Turn('turn-123', 'universe-456', 1, defaultConfig);
  });

  describe('Constructor', () => {
    it('should initialize with correct properties', () => {
      expect(turn.id).toBe('turn-123');
      expect(turn.universeId).toBe('universe-456');
      expect(turn.turnNumber).toBe(1);
      expect(turn.phase).toBe('collecting');
      expect(turn.status).toBe('scheduled');
      expect(turn.config).toEqual(defaultConfig);
      expect(turn.actionsCollected).toBe(0);
      expect(turn.playersParticipated).toEqual([]);
      expect(turn.processingLog).toEqual([]);
      expect(turn.errorMessages).toEqual([]);
    });

    it('should set start and end times correctly', () => {
      const beforeCreation = new Date();
      const testTurn = new Turn('test', 'universe', 1, defaultConfig);
      const afterCreation = new Date();

      expect(testTurn.startTime.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
      expect(testTurn.startTime.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
      
      const expectedEndTime = testTurn.startTime.getTime() + defaultConfig.durationMs;
      expect(testTurn.endTime.getTime()).toBe(expectedEndTime);
    });

    it('should use default config when none provided', () => {
      const defaultTurn = new Turn('test', 'universe', 1);
      expect(defaultTurn.config.durationMs).toBe(2 * 60 * 60 * 1000);
      expect(defaultTurn.config.maxActions).toBe(10);
      expect(defaultTurn.config.processingTimeoutMs).toBe(5 * 60 * 1000);
    });
  });

  describe('Turn Lifecycle', () => {
    it('should start turn correctly', () => {
      turn.start();
      
      expect(turn.status).toBe('active');
      expect(turn.phase).toBe('collecting');
      expect(turn.processingLog.length).toBeGreaterThan(0);
      expect(turn.processingLog[0]).toContain('Turn 1 started');
    });

    it('should advance phases correctly', () => {
      turn.start();
      
      turn.advancePhase('validating');
      expect(turn.phase).toBe('validating');
      expect(turn.processingLog.some(log => log.includes('collecting → validating'))).toBe(true);
      
      turn.advancePhase('processing');
      expect(turn.phase).toBe('processing');
      expect(turn.status).toBe('processing');
      expect(turn.processingStarted).toBeInstanceOf(Date);
      
      turn.advancePhase('completed');
      expect(turn.phase).toBe('completed');
    });

    it('should complete turn successfully', () => {
      turn.start();
      turn.advancePhase('processing');
      turn.complete();
      
      expect(turn.status).toBe('completed');
      expect(turn.phase).toBe('completed');
      expect(turn.processingCompleted).toBeInstanceOf(Date);
      expect(turn.processingLog.some(log => log.includes('completed successfully'))).toBe(true);
    });

    it('should fail turn with error message', () => {
      const errorMessage = 'Database connection failed';
      turn.fail(errorMessage);
      
      expect(turn.status).toBe('failed');
      expect(turn.errorMessages).toContain(errorMessage);
      expect(turn.processingLog.some(log => log.includes('failed'))).toBe(true);
    });

    it('should cancel turn with reason', () => {
      const reason = 'Emergency maintenance';
      turn.cancel(reason);
      
      expect(turn.status).toBe('cancelled');
      expect(turn.processingLog.some(log => log.includes('cancelled'))).toBe(true);
      expect(turn.processingLog.some(log => log.includes(reason))).toBe(true);
    });
  });

  describe('Action Tracking', () => {
    it('should record player actions correctly', () => {
      const playerId1 = 'player-1';
      const playerId2 = 'player-2';
      
      turn.recordPlayerAction(playerId1);
      expect(turn.actionsCollected).toBe(1);
      expect(turn.playersParticipated).toContain(playerId1);
      
      turn.recordPlayerAction(playerId1); // Same player, multiple actions
      expect(turn.actionsCollected).toBe(2);
      expect(turn.playersParticipated).toEqual([playerId1]); // No duplicates
      
      turn.recordPlayerAction(playerId2);
      expect(turn.actionsCollected).toBe(3);
      expect(turn.playersParticipated).toContain(playerId2);
      expect(turn.playersParticipated.length).toBe(2);
    });
  });

  describe('Time Management', () => {
    it('should correctly identify if accepting actions', () => {
      // Turn not started
      expect(turn.isAcceptingActions()).toBe(false);
      
      // Turn started and within time window
      turn.start();
      expect(turn.isAcceptingActions()).toBe(true);
      
      // Turn in different phase
      turn.advancePhase('processing');
      expect(turn.isAcceptingActions()).toBe(false);
      
      // Turn cancelled
      turn.cancel('test');
      expect(turn.isAcceptingActions()).toBe(false);
    });

    it('should correctly check expiration status', () => {
      // Create turn that expires in 100ms
      const shortConfig: TurnConfig = {
        durationMs: 100,
        maxActions: 10,
        processingTimeoutMs: 5000
      };
      const shortTurn = new Turn('short', 'universe', 1, shortConfig);
      
      expect(shortTurn.isExpired()).toBe(false);
      
      // Wait for expiration
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(shortTurn.isExpired()).toBe(true);
          resolve();
        }, 150);
      });
    });

    it('should calculate remaining time correctly', () => {
      const remaining = turn.getRemainingTime();
      expect(remaining).toBeGreaterThan(0);
      expect(remaining).toBeLessThanOrEqual(defaultConfig.durationMs);
    });

    it('should detect processing timeout', () => {
      turn.start();
      turn.advancePhase('processing');
      
      // Mock processing started time to be in the past
      const pastTime = new Date(Date.now() - (defaultConfig.processingTimeoutMs + 1000));
      turn.processingStarted = pastTime;
      
      expect(turn.hasProcessingTimedOut()).toBe(true);
    });

    it('should calculate processing duration correctly', () => {
      expect(turn.getProcessingDuration()).toBeNull();
      
      turn.start();
      turn.advancePhase('processing');
      
      // Still processing
      expect(turn.getProcessingDuration()).toBeNull();
      
      // Complete processing after a short delay
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          turn.complete();
          const duration = turn.getProcessingDuration();
          expect(duration).toBeGreaterThan(0);
          expect(duration).toBeLessThan(1000); // Should be very fast in tests
          resolve();
        }, 10);
      });
    });
  });

  describe('Statistics', () => {
    it('should return correct statistics', () => {
      turn.start();
      turn.recordPlayerAction('player-1');
      turn.recordPlayerAction('player-2');
      turn.advancePhase('processing');
      
      const stats = turn.getStatistics();
      
      expect(stats.turnNumber).toBe(1);
      expect(stats.universeId).toBe('universe-456');
      expect(stats.status).toBe('processing');
      expect(stats.phase).toBe('processing');
      expect(stats.actionsCollected).toBe(2);
      expect(stats.playersParticipated).toBe(2);
      expect(stats.errorCount).toBe(0);
      expect(stats.processingDuration).toBeNull();
    });

    it('should include errors in statistics', () => {
      turn.fail('Error 1');
      turn.fail('Error 2');
      
      const stats = turn.getStatistics();
      expect(stats.errorCount).toBe(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero duration config', () => {
      const zeroConfig: TurnConfig = {
        durationMs: 0,
        maxActions: 5,
        processingTimeoutMs: 1000
      };
      
      const zeroTurn = new Turn('zero', 'universe', 1, zeroConfig);
      expect(zeroTurn.isExpired()).toBe(true);
      expect(zeroTurn.getRemainingTime()).toBe(0);
    });

    it('should handle multiple phase advances', () => {
      turn.start();
      turn.advancePhase('validating');
      turn.advancePhase('processing');
      turn.advancePhase('resolving');
      turn.advancePhase('distributing');
      turn.advancePhase('completed');
      
      expect(turn.phase).toBe('completed');
      expect(turn.processingLog.length).toBeGreaterThan(5);
    });

    it('should handle multiple failures gracefully', () => {
      turn.fail('First error');
      turn.fail('Second error');
      
      expect(turn.status).toBe('failed');
      expect(turn.errorMessages).toEqual(['First error', 'Second error']);
    });

    it('should prevent actions after cancellation', () => {
      turn.start();
      turn.cancel('Emergency stop');
      
      expect(turn.isAcceptingActions()).toBe(false);
      expect(turn.status).toBe('cancelled');
    });
  });

  describe('Logging', () => {
    it('should maintain chronological processing log', () => {
      turn.start();
      turn.recordPlayerAction('player-1');
      turn.advancePhase('validating');
      turn.advancePhase('processing');
      turn.complete();
      
      expect(turn.processingLog.length).toBeGreaterThan(3);
      
      // Check timestamps are in order
      const timestamps = turn.processingLog.map(log => {
        const match = log.match(/\[(.*?)\]/);
        return match ? new Date(match[1]).getTime() : 0;
      });
      
      for (let i = 1; i < timestamps.length; i++) {
        expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i - 1]);
      }
    });

    it('should include ISO timestamps in log entries', () => {
      turn.start();
      
      expect(turn.processingLog[0]).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/);
    });
  });
});
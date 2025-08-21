import { TokenService } from '../TokenService';
import { AuthConfig, JWTPayload } from '../types';

describe('TokenService', () => {
  let tokenService: TokenService;
  let mockConfig: AuthConfig['session'];

  beforeEach(() => {
    mockConfig = {
      defaultExpiryHours: 24,
      persistentExpiryDays: 30,
      refreshWindowMinutes: 15,
      jwtSecret: 'test-secret-key-at-least-32-characters-long-for-testing'
    };
    tokenService = new TokenService(mockConfig);
  });

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const payload: JWTPayload = {
        userId: 'user123',
        email: 'test@example.com',
        username: 'testuser',
        sessionId: 'session123'
      };

      const token = tokenService.generateToken(payload);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT format
    });

    it('should generate different tokens for different payloads', () => {
      const payload1: JWTPayload = {
        userId: 'user1',
        email: 'test1@example.com',
        username: 'user1',
        sessionId: 'session1'
      };

      const payload2: JWTPayload = {
        userId: 'user2',
        email: 'test2@example.com',
        username: 'user2',
        sessionId: 'session2'
      };

      const token1 = tokenService.generateToken(payload1);
      const token2 = tokenService.generateToken(payload2);
      
      expect(token1).not.toBe(token2);
    });

    it('should generate persistent tokens with longer expiry', () => {
      const payload: JWTPayload = {
        userId: 'user123',
        email: 'test@example.com',
        username: 'testuser',
        sessionId: 'session123'
      };

      const standardToken = tokenService.generateToken(payload, false);
      const persistentToken = tokenService.generateToken(payload, true);
      
      expect(standardToken).not.toBe(persistentToken);
      
      const standardDecoded = tokenService.verifyToken(standardToken);
      const persistentDecoded = tokenService.verifyToken(persistentToken);
      
      expect(persistentDecoded!.exp!).toBeGreaterThan(standardDecoded!.exp!);
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', () => {
      const payload: JWTPayload = {
        userId: 'user123',
        email: 'test@example.com',
        username: 'testuser',
        sessionId: 'session123'
      };

      const token = tokenService.generateToken(payload);
      const decoded = tokenService.verifyToken(token);
      
      expect(decoded).toBeDefined();
      expect(decoded!.userId).toBe(payload.userId);
      expect(decoded!.email).toBe(payload.email);
      expect(decoded!.username).toBe(payload.username);
      expect(decoded!.sessionId).toBe(payload.sessionId);
    });

    it('should return null for invalid tokens', () => {
      const invalidToken = 'invalid.token.here';
      const decoded = tokenService.verifyToken(invalidToken);
      
      expect(decoded).toBeNull();
    });

    it('should return null for tampered tokens', () => {
      const payload: JWTPayload = {
        userId: 'user123',
        email: 'test@example.com',
        username: 'testuser',
        sessionId: 'session123'
      };

      const token = tokenService.generateToken(payload);
      const tamperedToken = token.substring(0, token.length - 5) + 'xxxxx';
      const decoded = tokenService.verifyToken(tamperedToken);
      
      expect(decoded).toBeNull();
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a refresh token', () => {
      const refreshToken = tokenService.generateRefreshToken('user123', 'session123');
      
      expect(refreshToken).toBeDefined();
      expect(typeof refreshToken).toBe('string');
      expect(refreshToken.split('.')).toHaveLength(3);
    });

    it('should generate different refresh tokens for different sessions', () => {
      const token1 = tokenService.generateRefreshToken('user1', 'session1');
      const token2 = tokenService.generateRefreshToken('user1', 'session2');
      
      expect(token1).not.toBe(token2);
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify a valid refresh token', () => {
      const userId = 'user123';
      const sessionId = 'session123';
      
      const refreshToken = tokenService.generateRefreshToken(userId, sessionId);
      const decoded = tokenService.verifyRefreshToken(refreshToken);
      
      expect(decoded).toBeDefined();
      expect(decoded!.userId).toBe(userId);
      expect(decoded!.sessionId).toBe(sessionId);
    });

    it('should return null for invalid refresh tokens', () => {
      const invalidToken = 'invalid.refresh.token';
      const decoded = tokenService.verifyRefreshToken(invalidToken);
      
      expect(decoded).toBeNull();
    });

    it('should return null for regular JWT tokens', () => {
      const payload: JWTPayload = {
        userId: 'user123',
        email: 'test@example.com',
        username: 'testuser',
        sessionId: 'session123'
      };

      const regularToken = tokenService.generateToken(payload);
      const decoded = tokenService.verifyRefreshToken(regularToken);
      
      expect(decoded).toBeNull();
    });
  });

  describe('shouldRefreshToken', () => {
    it('should return false for tokens that do not need refresh', () => {
      const payload: JWTPayload = {
        userId: 'user123',
        email: 'test@example.com',
        username: 'testuser',
        sessionId: 'session123'
      };

      const token = tokenService.generateToken(payload);
      const shouldRefresh = tokenService.shouldRefreshToken(token);
      
      expect(shouldRefresh).toBe(false);
    });

    it('should return false for invalid tokens', () => {
      const invalidToken = 'invalid.token.here';
      const shouldRefresh = tokenService.shouldRefreshToken(invalidToken);
      
      expect(shouldRefresh).toBe(false);
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract token from valid Bearer header', () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
      const authHeader = `Bearer ${token}`;
      
      const extracted = tokenService.extractTokenFromHeader(authHeader);
      
      expect(extracted).toBe(token);
    });

    it('should return null for invalid header format', () => {
      const invalidHeader = 'Invalid header format';
      
      const extracted = tokenService.extractTokenFromHeader(invalidHeader);
      
      expect(extracted).toBeNull();
    });

    it('should return null for missing header', () => {
      const extracted = tokenService.extractTokenFromHeader(undefined);
      
      expect(extracted).toBeNull();
    });

    it('should return null for non-Bearer tokens', () => {
      const basicHeader = 'Basic dXNlcjpwYXNz';
      
      const extracted = tokenService.extractTokenFromHeader(basicHeader);
      
      expect(extracted).toBeNull();
    });
  });

  describe('createSessionData', () => {
    it('should create session data with correct structure', () => {
      const payload: JWTPayload = {
        userId: 'user123',
        email: 'test@example.com',
        username: 'testuser',
        sessionId: 'session123'
      };

      const token = tokenService.generateToken(payload);
      const sessionData = tokenService.createSessionData(
        'user123',
        token,
        false,
        '127.0.0.1',
        'test-agent'
      );
      
      expect(sessionData.id).toBeDefined();
      expect(sessionData.userId).toBe('user123');
      expect(sessionData.tokenHash).toBeDefined();
      expect(sessionData.expiresAt).toBeDefined();
      expect(sessionData.isPersistent).toBe(false);
      expect(sessionData.ipAddress).toBe('127.0.0.1');
      expect(sessionData.userAgent).toBe('test-agent');
      expect(sessionData.lastActivity).toBeDefined();
      expect(sessionData.createdAt).toBeDefined();
    });

    it('should mark persistent sessions correctly', () => {
      const payload: JWTPayload = {
        userId: 'user123',
        email: 'test@example.com',
        username: 'testuser',
        sessionId: 'session123'
      };

      const token = tokenService.generateToken(payload, true);
      const sessionData = tokenService.createSessionData(
        'user123',
        token,
        true
      );
      
      expect(sessionData.isPersistent).toBe(true);
      expect(sessionData.expiresAt!.getTime()).toBeGreaterThan(
        new Date(Date.now() + 24 * 60 * 60 * 1000).getTime()
      );
    });
  });

  describe('createTokenPayload', () => {
    it('should create a valid token payload', () => {
      const payload = tokenService.createTokenPayload(
        'user123',
        'test@example.com',
        'testuser',
        'session123'
      );
      
      expect(payload.userId).toBe('user123');
      expect(payload.email).toBe('test@example.com');
      expect(payload.username).toBe('testuser');
      expect(payload.sessionId).toBe('session123');
    });
  });
});
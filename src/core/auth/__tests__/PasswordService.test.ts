import { PasswordService } from '../PasswordService';
import { AuthConfig } from '../types';

describe('PasswordService', () => {
  let passwordService: PasswordService;
  let mockConfig: AuthConfig['password'];

  beforeEach(() => {
    mockConfig = {
      minLength: 12,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      bcryptRounds: 10
    };
    passwordService = new PasswordService(mockConfig);
  });

  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'TestPassword123!';
      const hash = await passwordService.hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50);
    });

    it('should generate different hashes for the same password', async () => {
      const password = 'TestPassword123!';
      const hash1 = await passwordService.hashPassword(password);
      const hash2 = await passwordService.hashPassword(password);
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyPassword', () => {
    it('should verify a correct password', async () => {
      const password = 'TestPassword123!';
      const hash = await passwordService.hashPassword(password);
      
      const isValid = await passwordService.verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should reject an incorrect password', async () => {
      const password = 'TestPassword123!';
      const wrongPassword = 'WrongPassword123!';
      const hash = await passwordService.hashPassword(password);
      
      const isValid = await passwordService.verifyPassword(wrongPassword, hash);
      expect(isValid).toBe(false);
    });
  });

  describe('validatePassword', () => {
    it('should accept a strong password', () => {
      const password = 'StrongPassword123!';
      const result = passwordService.validatePassword(password);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject a password that is too short', () => {
      const password = 'Short1!';
      const result = passwordService.validatePassword(password);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must be at least 12 characters long');
    });

    it('should reject a password without uppercase letters', () => {
      const password = 'lowercase123!';
      const result = passwordService.validatePassword(password);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should reject a password without lowercase letters', () => {
      const password = 'UPPERCASE123!';
      const result = passwordService.validatePassword(password);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should reject a password without numbers', () => {
      const password = 'NoNumbersHere!';
      const result = passwordService.validatePassword(password);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should reject a password without special characters', () => {
      const password = 'NoSpecialChars123';
      const result = passwordService.validatePassword(password);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character');
    });

    it('should reject common passwords', () => {
      const password = 'password123!';
      const result = passwordService.validatePassword(password);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password is too common. Please choose a more unique password');
    });
  });

  describe('generateSecureToken', () => {
    it('should generate a token of specified length', () => {
      const token = passwordService.generateSecureToken(32);
      
      expect(token).toBeDefined();
      expect(token.length).toBe(32);
    });

    it('should generate different tokens each time', () => {
      const token1 = passwordService.generateSecureToken();
      const token2 = passwordService.generateSecureToken();
      
      expect(token1).not.toBe(token2);
    });

    it('should generate alphanumeric tokens', () => {
      const token = passwordService.generateSecureToken();
      
      expect(token).toMatch(/^[A-Za-z0-9]+$/);
    });
  });

  describe('generateInviteCode', () => {
    it('should generate an invite code of specified length', () => {
      const code = passwordService.generateInviteCode(8);
      
      expect(code).toBeDefined();
      expect(code.length).toBe(8);
    });

    it('should generate uppercase alphanumeric codes', () => {
      const code = passwordService.generateInviteCode();
      
      expect(code).toMatch(/^[A-Z0-9]+$/);
    });

    it('should avoid similar looking characters', () => {
      const code = passwordService.generateInviteCode();
      
      expect(code).not.toMatch(/[01IL]/); // Should not contain confusing chars
    });
  });

  describe('getPasswordStrength', () => {
    it('should rate a weak password correctly', () => {
      const password = 'weak';
      const result = passwordService.getPasswordStrength(password);
      
      expect(result.strength).toBe('weak');
      expect(result.score).toBeLessThan(30);
      expect(result.feedback.length).toBeGreaterThan(0);
    });

    it('should rate a strong password correctly', () => {
      const password = 'VeryStrongPassword123!@#$';
      const result = passwordService.getPasswordStrength(password);
      
      expect(result.strength).toBe('strong');
      expect(result.score).toBeGreaterThan(70);
    });

    it('should provide feedback for password improvement', () => {
      const password = 'aaaaaaaaaaaa'; // Repeating characters
      const result = passwordService.getPasswordStrength(password);
      
      expect(result.feedback).toContain('Avoid repeating characters');
    });

    it('should penalize number-only passwords', () => {
      const password = '123456789012';
      const result = passwordService.getPasswordStrength(password);
      
      expect(result.feedback).toContain('Don\'t use only numbers');
    });
  });
});
import * as bcrypt from 'bcryptjs';
import { AuthConfig } from './types';

/**
 * Handles password hashing, validation, and security requirements.
 * Uses bcrypt for secure password hashing with configurable rounds.
 * Enforces password complexity requirements based on configuration.
 */
export class PasswordService {
  private readonly config: AuthConfig['password'];
  
  constructor(config: AuthConfig['password']) {
    this.config = config;
  }

  /**
   * Hashes a plain text password using bcrypt.
   * @param {string} password - Plain text password
   * @returns {Promise<string>} Hashed password
   */
  public async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(this.config.bcryptRounds);
    return bcrypt.hash(password, salt);
  }

  /**
   * Verifies a password against a hash.
   * @param {string} password - Plain text password
   * @param {string} hash - Password hash to compare against
   * @returns {Promise<boolean>} True if password matches hash
   */
  public async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Validates password meets security requirements.
   * @param {string} password - Password to validate
   * @returns {object} Validation result with success flag and errors
   */
  public validatePassword(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check minimum length
    if (password.length < this.config.minLength) {
      errors.push(`Password must be at least ${this.config.minLength} characters long`);
    }

    // Check for uppercase letters
    if (this.config.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    // Check for lowercase letters
    if (this.config.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    // Check for numbers
    if (this.config.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    // Check for special characters
    if (this.config.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    // Check against common passwords (basic list)
    if (this.isCommonPassword(password)) {
      errors.push('Password is too common. Please choose a more unique password');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Generates a secure random token for password reset or email verification.
   * @param {number} length - Token length (default: 32)
   * @returns {string} Random token
   */
  public generateSecureToken(length: number = 32): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const randomValues = new Uint8Array(length);
    crypto.getRandomValues(randomValues);
    
    let token = '';
    for (let i = 0; i < length; i++) {
      token += charset[randomValues[i] % charset.length];
    }
    
    return token;
  }

  /**
   * Generates a short invite code.
   * @param {number} length - Code length
   * @returns {string} Invite code
   */
  public generateInviteCode(length: number = 8): string {
    // Use uppercase alphanumeric for readability
    const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude similar looking chars
    const randomValues = new Uint8Array(length);
    crypto.getRandomValues(randomValues);
    
    let code = '';
    for (let i = 0; i < length; i++) {
      code += charset[randomValues[i] % charset.length];
    }
    
    return code;
  }

  /**
   * Hashes a token for secure storage.
   * @param {string} token - Token to hash
   * @returns {string} Hashed token
   */
  public hashToken(token: string): string {
    // Use SHA-256 for token hashing (faster than bcrypt for this use case)
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const hashBuffer = crypto.subtle.digestSync('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Checks if password is in common password list.
   * @param {string} password - Password to check
   * @returns {boolean} True if password is common
   */
  private isCommonPassword(password: string): boolean {
    // Basic list of common passwords - in production, use a comprehensive list
    const commonPasswords = [
      'password', 'Password', 'password123', 'Password123',
      '12345678', '123456789', '1234567890', '123456789012',
      'qwerty', 'abc123', 'letmein', 'welcome', 'monkey',
      'dragon', 'master', 'admin', 'iloveyou', 'sunshine'
    ];
    
    const lowerPassword = password.toLowerCase();
    return commonPasswords.some(common => 
      lowerPassword === common.toLowerCase() ||
      lowerPassword.includes(common.toLowerCase())
    );
  }

  /**
   * Calculates password strength score.
   * @param {string} password - Password to analyze
   * @returns {object} Strength score and feedback
   */
  public getPasswordStrength(password: string): {
    score: number;
    strength: 'weak' | 'fair' | 'good' | 'strong';
    feedback: string[];
  } {
    let score = 0;
    const feedback: string[] = [];

    // Length scoring
    if (password.length >= this.config.minLength) score += 20;
    if (password.length >= 16) score += 10;
    if (password.length >= 20) score += 10;

    // Character variety scoring
    if (/[a-z]/.test(password)) score += 10;
    if (/[A-Z]/.test(password)) score += 10;
    if (/\d/.test(password)) score += 10;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 15;
    if (/[^a-zA-Z0-9!@#$%^&*(),.?":{}|<>]/.test(password)) score += 10; // Other special chars

    // Pattern checks (reduce score for bad patterns)
    if (/(.)\1{2,}/.test(password)) {
      score -= 10;
      feedback.push('Avoid repeating characters');
    }
    if (/^[0-9]+$/.test(password)) {
      score -= 15;
      feedback.push('Don\'t use only numbers');
    }
    if (/^[a-zA-Z]+$/.test(password)) {
      score -= 10;
      feedback.push('Include numbers or symbols');
    }

    // Determine strength level
    let strength: 'weak' | 'fair' | 'good' | 'strong';
    if (score < 30) {
      strength = 'weak';
      feedback.push('Consider adding more character variety');
    } else if (score < 50) {
      strength = 'fair';
      feedback.push('Add more complexity for better security');
    } else if (score < 70) {
      strength = 'good';
    } else {
      strength = 'strong';
    }

    return { score: Math.max(0, Math.min(100, score)), strength, feedback };
  }
}
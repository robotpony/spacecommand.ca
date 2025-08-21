import { RateLimitInfo, AuthConfig } from './types';

/**
 * Rate limiting service to prevent brute force attacks and abuse.
 * Tracks login attempts, password resets, and registration attempts.
 * Implements exponential backoff and account lockout mechanisms.
 */
export class RateLimiter {
  private readonly config: AuthConfig['rateLimit'];
  private rateLimitRepository: any; // Will be typed as RateLimitRepository

  constructor(config: AuthConfig['rateLimit'], rateLimitRepository: any) {
    this.config = config;
    this.rateLimitRepository = rateLimitRepository;
  }

  /**
   * Checks if login attempt is allowed.
   * @param {string} identifier - Email or user ID
   * @param {string} ipAddress - Client IP address
   * @returns {Promise<boolean>} True if login allowed
   */
  public async checkLoginLimit(
    identifier: string,
    ipAddress?: string
  ): Promise<boolean> {
    const limits = await this.rateLimitRepository.getRateLimits(identifier, ipAddress);
    
    if (!limits) {
      return true; // No rate limit record, allow attempt
    }

    // Check if account is locked
    if (limits.lockedUntil && limits.lockedUntil > new Date()) {
      return false;
    }

    // Reset counter if last attempt was more than an hour ago
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    if (limits.lastLoginAttempt && limits.lastLoginAttempt < oneHourAgo) {
      await this.rateLimitRepository.resetLoginAttempts(identifier);
      return true;
    }

    // Check if under limit
    return limits.loginAttempts < this.config.loginAttemptsPerHour;
  }

  /**
   * Records a failed login attempt.
   * @param {string} identifier - Email or user ID
   * @param {string} ipAddress - Client IP address
   * @returns {Promise<void>}
   */
  public async recordFailedLogin(
    identifier: string,
    ipAddress?: string
  ): Promise<void> {
    const limits = await this.rateLimitRepository.getRateLimits(identifier, ipAddress);
    
    const newAttempts = (limits?.loginAttempts || 0) + 1;
    
    // Lock account if exceeded attempts
    let lockedUntil: Date | undefined;
    if (newAttempts >= this.config.loginAttemptsPerHour) {
      // Exponential backoff: 2^(attempts - limit) * lockout duration
      const multiplier = Math.pow(2, newAttempts - this.config.loginAttemptsPerHour);
      const lockoutMs = this.config.lockoutDurationMinutes * 60 * 1000 * multiplier;
      lockedUntil = new Date(Date.now() + lockoutMs);
    }

    await this.rateLimitRepository.updateLoginAttempts(
      identifier,
      newAttempts,
      new Date(),
      lockedUntil
    );

    // Also track by IP if provided
    if (ipAddress) {
      await this.rateLimitRepository.trackIpAttempt(ipAddress, 'login');
    }
  }

  /**
   * Clears login attempts after successful login.
   * @param {string} identifier - Email or user ID
   * @returns {Promise<void>}
   */
  public async clearLoginAttempts(identifier: string): Promise<void> {
    await this.rateLimitRepository.resetLoginAttempts(identifier);
  }

  /**
   * Checks if password reset is allowed.
   * @param {string} email - User email
   * @param {string} ipAddress - Client IP address
   * @returns {Promise<boolean>} True if reset allowed
   */
  public async checkPasswordResetLimit(
    email: string,
    ipAddress?: string
  ): Promise<boolean> {
    const limits = await this.rateLimitRepository.getRateLimits(email, ipAddress);
    
    if (!limits) {
      return true;
    }

    // Reset counter if last reset was more than an hour ago
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    if (limits.lastPasswordReset && limits.lastPasswordReset < oneHourAgo) {
      await this.rateLimitRepository.resetPasswordResets(email);
      return true;
    }

    // Check if under limit
    const allowed = limits.passwordResets < this.config.passwordResetsPerHour;
    
    if (allowed) {
      // Record the reset attempt
      await this.rateLimitRepository.updatePasswordResets(
        email,
        limits.passwordResets + 1,
        new Date()
      );
      
      if (ipAddress) {
        await this.rateLimitRepository.trackIpAttempt(ipAddress, 'password_reset');
      }
    }

    return allowed;
  }

  /**
   * Checks if registration is allowed from IP.
   * @param {string} ipAddress - Client IP address
   * @returns {Promise<boolean>} True if registration allowed
   */
  public async checkRegistrationLimit(ipAddress?: string): Promise<boolean> {
    if (!ipAddress) return true;

    const count = await this.rateLimitRepository.countRecentRegistrations(
      ipAddress,
      24 // Last 24 hours
    );

    const allowed = count < this.config.registrationsPerIpPerDay;
    
    if (allowed) {
      await this.rateLimitRepository.trackIpAttempt(ipAddress, 'registration');
    }

    return allowed;
  }

  /**
   * Checks if account is locked.
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} True if account is locked
   */
  public async isAccountLocked(userId: string): Promise<boolean> {
    const limits = await this.rateLimitRepository.getRateLimits(userId);
    
    if (!limits || !limits.lockedUntil) {
      return false;
    }

    return limits.lockedUntil > new Date();
  }

  /**
   * Gets lockout expiration time.
   * @param {string} userId - User ID
   * @returns {Promise<Date | null>} Lockout expiration or null
   */
  public async getLockoutExpiration(userId: string): Promise<Date | null> {
    const limits = await this.rateLimitRepository.getRateLimits(userId);
    
    if (!limits || !limits.lockedUntil || limits.lockedUntil < new Date()) {
      return null;
    }

    return limits.lockedUntil;
  }

  /**
   * Unlocks an account manually.
   * @param {string} userId - User ID to unlock
   * @returns {Promise<void>}
   */
  public async unlockAccount(userId: string): Promise<void> {
    await this.rateLimitRepository.clearLockout(userId);
  }

  /**
   * Gets rate limit status for user.
   * @param {string} identifier - Email or user ID
   * @returns {Promise<object>} Rate limit status
   */
  public async getRateLimitStatus(identifier: string): Promise<{
    loginAttempts: number;
    loginAttemptsRemaining: number;
    passwordResets: number;
    passwordResetsRemaining: number;
    isLocked: boolean;
    lockedUntil?: Date;
  }> {
    const limits = await this.rateLimitRepository.getRateLimits(identifier);
    
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    // Reset counters if expired
    let loginAttempts = limits?.loginAttempts || 0;
    let passwordResets = limits?.passwordResets || 0;
    
    if (limits?.lastLoginAttempt && limits.lastLoginAttempt < oneHourAgo) {
      loginAttempts = 0;
    }
    
    if (limits?.lastPasswordReset && limits.lastPasswordReset < oneHourAgo) {
      passwordResets = 0;
    }
    
    const isLocked = limits?.lockedUntil ? limits.lockedUntil > now : false;
    
    return {
      loginAttempts,
      loginAttemptsRemaining: Math.max(0, this.config.loginAttemptsPerHour - loginAttempts),
      passwordResets,
      passwordResetsRemaining: Math.max(0, this.config.passwordResetsPerHour - passwordResets),
      isLocked,
      lockedUntil: isLocked ? limits?.lockedUntil : undefined
    };
  }

  /**
   * Cleans up expired rate limit records.
   * @returns {Promise<number>} Number of records cleaned
   */
  public async cleanupExpiredRecords(): Promise<number> {
    // Clean up records older than 24 hours with no activity
    return this.rateLimitRepository.cleanupOldRecords(24);
  }
}
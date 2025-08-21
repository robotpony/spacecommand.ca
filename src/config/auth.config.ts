import { AuthConfig, RegistrationMode } from '@core/auth/types';

/**
 * Authentication configuration for SpaceCommand.
 * Controls registration modes, security requirements, and session settings.
 * Override values via environment variables or configuration files.
 */
export const createAuthConfig = (): AuthConfig => {
  const config: AuthConfig = {
    registration: {
      mode: (process.env.REGISTRATION_MODE as RegistrationMode) || 'open',
      requireEmailVerification: process.env.REQUIRE_EMAIL_VERIFICATION !== 'false',
      maxUniversesPerUser: parseInt(process.env.MAX_UNIVERSES_PER_USER || '3', 10),
      inviteCodeLength: parseInt(process.env.INVITE_CODE_LENGTH || '8', 10)
    },
    
    password: {
      minLength: parseInt(process.env.PASSWORD_MIN_LENGTH || '12', 10),
      requireUppercase: process.env.PASSWORD_REQUIRE_UPPERCASE !== 'false',
      requireLowercase: process.env.PASSWORD_REQUIRE_LOWERCASE !== 'false',
      requireNumbers: process.env.PASSWORD_REQUIRE_NUMBERS !== 'false',
      requireSpecialChars: process.env.PASSWORD_REQUIRE_SPECIAL_CHARS !== 'false',
      bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10)
    },
    
    session: {
      defaultExpiryHours: parseInt(process.env.SESSION_EXPIRY_HOURS || '24', 10),
      persistentExpiryDays: parseInt(process.env.PERSISTENT_SESSION_DAYS || '30', 10),
      refreshWindowMinutes: parseInt(process.env.SESSION_REFRESH_WINDOW_MINUTES || '15', 10),
      jwtSecret: process.env.JWT_SECRET || (() => {
        if (process.env.NODE_ENV === 'production') {
          throw new Error('JWT_SECRET must be set in production');
        }
        return 'dev-secret-change-in-production';
      })()
    },
    
    rateLimit: {
      loginAttemptsPerHour: parseInt(process.env.RATE_LIMIT_LOGIN_ATTEMPTS || '5', 10),
      passwordResetsPerHour: parseInt(process.env.RATE_LIMIT_PASSWORD_RESETS || '1', 10),
      registrationsPerIpPerDay: parseInt(process.env.RATE_LIMIT_REGISTRATIONS_PER_IP || '3', 10),
      lockoutDurationMinutes: parseInt(process.env.LOCKOUT_DURATION_MINUTES || '15', 10)
    },
    
    email: {
      from: process.env.EMAIL_FROM || 'SpaceCommand Central <noreply@spacecommand.ca>',
      replyTo: process.env.EMAIL_REPLY_TO,
      verificationExpiryHours: parseInt(process.env.EMAIL_VERIFICATION_EXPIRY_HOURS || '24', 10),
      resetExpiryHours: parseInt(process.env.PASSWORD_RESET_EXPIRY_HOURS || '2', 10)
    }
  };

  // Validate configuration
  validateConfig(config);
  
  return config;
};

/**
 * Validates authentication configuration.
 * @param {AuthConfig} config - Configuration to validate
 * @throws {Error} If configuration is invalid
 */
function validateConfig(config: AuthConfig): void {
  // Password validation
  if (config.password.minLength < 8) {
    throw new Error('Password minimum length must be at least 8 characters');
  }
  
  if (config.password.bcryptRounds < 10 || config.password.bcryptRounds > 15) {
    throw new Error('Bcrypt rounds must be between 10 and 15');
  }
  
  // Session validation
  if (config.session.defaultExpiryHours < 1 || config.session.defaultExpiryHours > 168) {
    throw new Error('Session expiry must be between 1 and 168 hours (1 week)');
  }
  
  if (config.session.persistentExpiryDays < 1 || config.session.persistentExpiryDays > 365) {
    throw new Error('Persistent session expiry must be between 1 and 365 days');
  }
  
  if (!config.session.jwtSecret || config.session.jwtSecret.length < 32) {
    throw new Error('JWT secret must be at least 32 characters long');
  }
  
  // Rate limit validation
  if (config.rateLimit.loginAttemptsPerHour < 1 || config.rateLimit.loginAttemptsPerHour > 20) {
    throw new Error('Login attempts per hour must be between 1 and 20');
  }
  
  if (config.rateLimit.passwordResetsPerHour < 1 || config.rateLimit.passwordResetsPerHour > 5) {
    throw new Error('Password resets per hour must be between 1 and 5');
  }
  
  // Registration validation
  if (!['open', 'invite', 'admin_approval'].includes(config.registration.mode)) {
    throw new Error('Registration mode must be open, invite, or admin_approval');
  }
  
  if (config.registration.maxUniversesPerUser < 1 || config.registration.maxUniversesPerUser > 10) {
    throw new Error('Max universes per user must be between 1 and 10');
  }
  
  // Email validation
  if (!config.email.from || !config.email.from.includes('@')) {
    throw new Error('Email from address must be a valid email');
  }
}

/**
 * Gets SMTP configuration from environment.
 * @returns {object} SMTP configuration
 */
export const getSmtpConfig = () => ({
  host: process.env.SMTP_HOST || 'localhost',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  user: process.env.SMTP_USER || '',
  pass: process.env.SMTP_PASS || ''
});

/**
 * Gets application URL for email links.
 * @returns {string} Application URL
 */
export const getAppUrl = (): string => {
  return process.env.APP_URL || 'http://localhost:3000';
};

/**
 * Development-specific configuration overrides.
 * @returns {Partial<AuthConfig>} Development overrides
 */
export const getDevOverrides = (): Partial<AuthConfig> => {
  if (process.env.NODE_ENV !== 'development') {
    return {};
  }
  
  return {
    registration: {
      mode: 'open',
      requireEmailVerification: false, // Skip email verification in dev
      maxUniversesPerUser: 5,
      inviteCodeLength: 6
    },
    password: {
      minLength: 8, // Shorter for dev
      requireUppercase: false,
      requireLowercase: false,
      requireNumbers: false,
      requireSpecialChars: false,
      bcryptRounds: 10 // Faster hashing in dev
    },
    rateLimit: {
      loginAttemptsPerHour: 20, // More lenient in dev
      passwordResetsPerHour: 5,
      registrationsPerIpPerDay: 20,
      lockoutDurationMinutes: 1 // Short lockout in dev
    }
  };
};

/**
 * Test-specific configuration overrides.
 * @returns {Partial<AuthConfig>} Test overrides
 */
export const getTestOverrides = (): Partial<AuthConfig> => {
  if (process.env.NODE_ENV !== 'test') {
    return {};
  }
  
  return {
    registration: {
      mode: 'open',
      requireEmailVerification: false,
      maxUniversesPerUser: 10,
      inviteCodeLength: 4
    },
    password: {
      minLength: 6,
      requireUppercase: false,
      requireLowercase: false,
      requireNumbers: false,
      requireSpecialChars: false,
      bcryptRounds: 4 // Very fast hashing for tests
    },
    session: {
      defaultExpiryHours: 1,
      persistentExpiryDays: 1,
      refreshWindowMinutes: 5,
      jwtSecret: 'test-secret-at-least-32-chars-long-for-testing'
    },
    rateLimit: {
      loginAttemptsPerHour: 100,
      passwordResetsPerHour: 100,
      registrationsPerIpPerDay: 100,
      lockoutDurationMinutes: 0 // No lockout in tests
    },
    email: {
      from: 'test@example.com',
      verificationExpiryHours: 1,
      resetExpiryHours: 1
    }
  };
};

// Export default configuration instance
export const authConfig = createAuthConfig();
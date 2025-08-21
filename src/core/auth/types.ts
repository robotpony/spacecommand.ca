/**
 * Authentication and user management type definitions
 */

export interface UserCredentials {
  email: string;
  password: string;
}

export interface RegistrationData {
  email: string;
  username: string;
  password: string;
  inviteCode?: string;
  applicationText?: string; // For admin-approval mode
}

export interface UserProfile {
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  totalPlayTime: number; // in minutes
  favoriteFaction?: string;
  achievements: Achievement[];
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  unlockedAt: Date;
  icon?: string;
}

export interface Session {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  isPersistent: boolean; // "secure ship computer" flag
  ipAddress?: string;
  userAgent?: string;
  lastActivity: Date;
  createdAt: Date;
}

export interface EmailVerification {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  verifiedAt?: Date;
  createdAt: Date;
}

export interface PasswordReset {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  usedAt?: Date;
  ipAddress?: string;
  createdAt: Date;
}

export interface RateLimitInfo {
  userId?: string;
  loginAttempts: number;
  lastLoginAttempt?: Date;
  passwordResets: number;
  lastPasswordReset?: Date;
  registrationAttempts: number;
  lastRegistrationAttempt?: Date;
  lockedUntil?: Date;
}

export interface InviteCode {
  id: string;
  code: string;
  createdBy?: string;
  usedBy?: string;
  maxUses: number;
  usesCount: number;
  expiresAt?: Date;
  createdAt: Date;
  usedAt?: Date;
}

export interface RegistrationApproval {
  id: string;
  email: string;
  username: string;
  requestedAt: Date;
  approvedAt?: Date;
  rejectedAt?: Date;
  approvedBy?: string;
  rejectionReason?: string;
  applicationText?: string;
  ipAddress?: string;
}

export interface UniversePlayer {
  universeId: string;
  userId: string;
  playerId: string;
  joinedAt: Date;
  lastPlayed: Date;
  isActive: boolean;
}

export type RegistrationMode = 'open' | 'invite' | 'admin_approval';

export interface AuthConfig {
  registration: {
    mode: RegistrationMode;
    requireEmailVerification: boolean;
    maxUniversesPerUser: number;
    inviteCodeLength: number;
  };
  password: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
    bcryptRounds: number;
  };
  session: {
    defaultExpiryHours: number;
    persistentExpiryDays: number;
    refreshWindowMinutes: number;
    jwtSecret: string;
  };
  rateLimit: {
    loginAttemptsPerHour: number;
    passwordResetsPerHour: number;
    registrationsPerIpPerDay: number;
    lockoutDurationMinutes: number;
  };
  email: {
    from: string;
    replyTo?: string;
    verificationExpiryHours: number;
    resetExpiryHours: number;
  };
}

export interface JWTPayload {
  userId: string;
  email: string;
  username: string;
  sessionId: string;
  iat?: number;
  exp?: number;
}

export interface AuthResult {
  success: boolean;
  user?: User;
  token?: string;
  refreshToken?: string;
  error?: string;
  code?: AuthErrorCode;
}

export enum AuthErrorCode {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  RATE_LIMITED = 'RATE_LIMITED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',
  USERNAME_ALREADY_EXISTS = 'USERNAME_ALREADY_EXISTS',
  INVALID_PASSWORD = 'INVALID_PASSWORD',
  INVALID_INVITE_CODE = 'INVALID_INVITE_CODE',
  REGISTRATION_CLOSED = 'REGISTRATION_CLOSED',
  APPROVAL_PENDING = 'APPROVAL_PENDING',
  UNIVERSE_LIMIT_REACHED = 'UNIVERSE_LIMIT_REACHED',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  NETWORK_ERROR = 'NETWORK_ERROR'
}

// Re-export User interface for convenience
export interface User {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
  emailVerified: boolean;
  emailVerifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  profile?: UserProfile;
  sessions?: Session[];
  universes?: UniversePlayer[];
}
import { User } from './User';
import { PasswordService } from './PasswordService';
import { TokenService } from './TokenService';
import { 
  UserCredentials, 
  RegistrationData, 
  AuthResult, 
  AuthErrorCode,
  AuthConfig,
  Session,
  EmailVerification,
  PasswordReset
} from './types';

/**
 * Core authentication service coordinating login, registration, and session management.
 * Orchestrates password validation, token generation, and user verification.
 * Integrates with repositories for data persistence.
 */
export class AuthService {
  private readonly passwordService: PasswordService;
  private readonly tokenService: TokenService;
  private readonly config: AuthConfig;
  
  // Repository dependencies will be injected
  private userRepository: any; // Will be typed as UserRepository
  private sessionRepository: any; // Will be typed as SessionRepository
  private rateLimiter: any; // Will be typed as RateLimiter
  private emailService: any; // Will be typed as EmailService

  constructor(
    config: AuthConfig,
    userRepository: any,
    sessionRepository: any,
    rateLimiter: any,
    emailService: any
  ) {
    this.config = config;
    this.passwordService = new PasswordService(config.password);
    this.tokenService = new TokenService(config.session);
    this.userRepository = userRepository;
    this.sessionRepository = sessionRepository;
    this.rateLimiter = rateLimiter;
    this.emailService = emailService;
  }

  /**
   * Registers a new user account.
   * @param {RegistrationData} data - Registration information
   * @param {string} ipAddress - Client IP for rate limiting
   * @returns {Promise<AuthResult>} Registration result with user and token
   */
  public async register(
    data: RegistrationData,
    ipAddress?: string
  ): Promise<AuthResult> {
    try {
      // Check registration mode
      if (this.config.registration.mode === 'invite' && !data.inviteCode) {
        return {
          success: false,
          error: 'Invite code required',
          code: AuthErrorCode.INVALID_INVITE_CODE
        };
      }

      // Check rate limiting
      const rateLimitOk = await this.rateLimiter.checkRegistrationLimit(ipAddress);
      if (!rateLimitOk) {
        return {
          success: false,
          error: 'Too many registration attempts',
          code: AuthErrorCode.RATE_LIMITED
        };
      }

      // Validate password
      const passwordValidation = this.passwordService.validatePassword(data.password);
      if (!passwordValidation.valid) {
        return {
          success: false,
          error: passwordValidation.errors.join('. '),
          code: AuthErrorCode.INVALID_PASSWORD
        };
      }

      // Check if email already exists
      const existingEmail = await this.userRepository.findByEmail(data.email);
      if (existingEmail) {
        return {
          success: false,
          error: 'Email already registered',
          code: AuthErrorCode.EMAIL_ALREADY_EXISTS
        };
      }

      // Check if username already exists
      const existingUsername = await this.userRepository.findByUsername(data.username);
      if (existingUsername) {
        return {
          success: false,
          error: 'Username already taken',
          code: AuthErrorCode.USERNAME_ALREADY_EXISTS
        };
      }

      // Validate invite code if provided
      if (this.config.registration.mode === 'invite' && data.inviteCode) {
        const inviteValid = await this.validateInviteCode(data.inviteCode);
        if (!inviteValid) {
          return {
            success: false,
            error: 'Invalid or expired invite code',
            code: AuthErrorCode.INVALID_INVITE_CODE
          };
        }
      }

      // Handle admin approval mode
      if (this.config.registration.mode === 'admin_approval') {
        await this.createRegistrationApproval(data, ipAddress);
        return {
          success: true,
          error: 'Registration pending admin approval',
          code: AuthErrorCode.APPROVAL_PENDING
        };
      }

      // Hash password
      const passwordHash = await this.passwordService.hashPassword(data.password);

      // Create user
      const user = User.create(data.email, data.username, passwordHash);
      await this.userRepository.create(user);

      // Send verification email if required
      if (this.config.registration.requireEmailVerification) {
        await this.sendVerificationEmail(user);
      }

      // Create session
      const session = await this.createSession(user, false, ipAddress);
      
      return {
        success: true,
        user,
        token: session.token,
        refreshToken: session.refreshToken
      };
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        error: 'Registration failed',
        code: AuthErrorCode.NETWORK_ERROR
      };
    }
  }

  /**
   * Authenticates user and creates session.
   * @param {UserCredentials} credentials - Login credentials
   * @param {boolean} persistent - "Secure ship computer" option
   * @param {string} ipAddress - Client IP for rate limiting
   * @returns {Promise<AuthResult>} Login result with user and token
   */
  public async login(
    credentials: UserCredentials,
    persistent: boolean = false,
    ipAddress?: string
  ): Promise<AuthResult> {
    try {
      // Check rate limiting
      const rateLimitOk = await this.rateLimiter.checkLoginLimit(
        credentials.email,
        ipAddress
      );
      if (!rateLimitOk) {
        return {
          success: false,
          error: 'Too many login attempts. Please try again later',
          code: AuthErrorCode.RATE_LIMITED
        };
      }

      // Find user by email
      const user = await this.userRepository.findByEmail(credentials.email);
      if (!user) {
        await this.rateLimiter.recordFailedLogin(credentials.email, ipAddress);
        return {
          success: false,
          error: 'Invalid email or password',
          code: AuthErrorCode.INVALID_CREDENTIALS
        };
      }

      // Verify password
      const passwordValid = await this.passwordService.verifyPassword(
        credentials.password,
        user.passwordHash
      );
      if (!passwordValid) {
        await this.rateLimiter.recordFailedLogin(credentials.email, ipAddress);
        return {
          success: false,
          error: 'Invalid email or password',
          code: AuthErrorCode.INVALID_CREDENTIALS
        };
      }

      // Check if email is verified
      if (this.config.registration.requireEmailVerification && !user.emailVerified) {
        return {
          success: false,
          error: 'Please verify your email before logging in',
          code: AuthErrorCode.EMAIL_NOT_VERIFIED
        };
      }

      // Check if account is locked
      const isLocked = await this.rateLimiter.isAccountLocked(user.id);
      if (isLocked) {
        return {
          success: false,
          error: 'Account is temporarily locked',
          code: AuthErrorCode.ACCOUNT_LOCKED
        };
      }

      // Clear rate limiting on successful login
      await this.rateLimiter.clearLoginAttempts(credentials.email);

      // Create session
      const session = await this.createSession(user, persistent, ipAddress);

      return {
        success: true,
        user,
        token: session.token,
        refreshToken: session.refreshToken
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: 'Login failed',
        code: AuthErrorCode.NETWORK_ERROR
      };
    }
  }

  /**
   * Logs out user by invalidating session.
   * @param {string} token - Session token to invalidate
   * @returns {Promise<boolean>} True if logout successful
   */
  public async logout(token: string): Promise<boolean> {
    try {
      const payload = this.tokenService.verifyToken(token);
      if (!payload) return false;

      await this.sessionRepository.deleteBySessionId(payload.sessionId);
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      return false;
    }
  }

  /**
   * Verifies email address with token.
   * @param {string} token - Email verification token
   * @returns {Promise<AuthResult>} Verification result
   */
  public async verifyEmail(token: string): Promise<AuthResult> {
    try {
      const verification = await this.userRepository.findEmailVerification(token);
      
      if (!verification) {
        return {
          success: false,
          error: 'Invalid verification token',
          code: AuthErrorCode.INVALID_TOKEN
        };
      }

      if (verification.expiresAt < new Date()) {
        return {
          success: false,
          error: 'Verification token has expired',
          code: AuthErrorCode.TOKEN_EXPIRED
        };
      }

      const user = await this.userRepository.findById(verification.userId);
      if (!user) {
        return {
          success: false,
          error: 'User not found',
          code: AuthErrorCode.USER_NOT_FOUND
        };
      }

      user.verifyEmail();
      await this.userRepository.update(user);
      await this.userRepository.markEmailVerified(verification.id);

      return {
        success: true,
        user
      };
    } catch (error) {
      console.error('Email verification error:', error);
      return {
        success: false,
        error: 'Verification failed',
        code: AuthErrorCode.NETWORK_ERROR
      };
    }
  }

  /**
   * Initiates password reset process.
   * @param {string} email - User email address
   * @param {string} ipAddress - Client IP for rate limiting
   * @returns {Promise<boolean>} True if reset email sent
   */
  public async requestPasswordReset(
    email: string,
    ipAddress?: string
  ): Promise<boolean> {
    try {
      // Check rate limiting
      const rateLimitOk = await this.rateLimiter.checkPasswordResetLimit(
        email,
        ipAddress
      );
      if (!rateLimitOk) {
        return false; // Silently fail to prevent user enumeration
      }

      const user = await this.userRepository.findByEmail(email);
      if (!user) {
        return true; // Silently succeed to prevent user enumeration
      }

      const token = this.passwordService.generateSecureToken();
      const hashedToken = this.passwordService.hashToken(token);
      const expiresAt = new Date(
        Date.now() + this.config.email.resetExpiryHours * 60 * 60 * 1000
      );

      const resetData: Partial<PasswordReset> = {
        id: crypto.randomUUID(),
        userId: user.id,
        token: hashedToken,
        expiresAt,
        ipAddress,
        createdAt: new Date()
      };

      await this.userRepository.createPasswordReset(resetData);
      await this.emailService.sendPasswordResetEmail(user.email, token);

      return true;
    } catch (error) {
      console.error('Password reset request error:', error);
      return false;
    }
  }

  /**
   * Resets password with valid token.
   * @param {string} token - Password reset token
   * @param {string} newPassword - New password
   * @returns {Promise<AuthResult>} Reset result
   */
  public async resetPassword(
    token: string,
    newPassword: string
  ): Promise<AuthResult> {
    try {
      const hashedToken = this.passwordService.hashToken(token);
      const reset = await this.userRepository.findPasswordReset(hashedToken);

      if (!reset) {
        return {
          success: false,
          error: 'Invalid reset token',
          code: AuthErrorCode.INVALID_TOKEN
        };
      }

      if (reset.expiresAt < new Date()) {
        return {
          success: false,
          error: 'Reset token has expired',
          code: AuthErrorCode.TOKEN_EXPIRED
        };
      }

      if (reset.usedAt) {
        return {
          success: false,
          error: 'Reset token already used',
          code: AuthErrorCode.INVALID_TOKEN
        };
      }

      // Validate new password
      const passwordValidation = this.passwordService.validatePassword(newPassword);
      if (!passwordValidation.valid) {
        return {
          success: false,
          error: passwordValidation.errors.join('. '),
          code: AuthErrorCode.INVALID_PASSWORD
        };
      }

      const user = await this.userRepository.findById(reset.userId);
      if (!user) {
        return {
          success: false,
          error: 'User not found',
          code: AuthErrorCode.USER_NOT_FOUND
        };
      }

      // Update password
      const passwordHash = await this.passwordService.hashPassword(newPassword);
      user.updatePassword(passwordHash);
      await this.userRepository.update(user);

      // Mark reset token as used
      await this.userRepository.markPasswordResetUsed(reset.id);

      // Invalidate all existing sessions
      await this.sessionRepository.deleteAllUserSessions(user.id);

      return {
        success: true,
        user
      };
    } catch (error) {
      console.error('Password reset error:', error);
      return {
        success: false,
        error: 'Password reset failed',
        code: AuthErrorCode.NETWORK_ERROR
      };
    }
  }

  /**
   * Creates a new session for user.
   * @private
   */
  private async createSession(
    user: User,
    persistent: boolean,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ token: string; refreshToken: string }> {
    const sessionId = crypto.randomUUID();
    
    const payload = this.tokenService.createTokenPayload(
      user.id,
      user.email,
      user.username,
      sessionId
    );

    const token = this.tokenService.generateToken(payload, persistent);
    const refreshToken = this.tokenService.generateRefreshToken(user.id, sessionId);

    const sessionData = this.tokenService.createSessionData(
      user.id,
      token,
      persistent,
      ipAddress,
      userAgent
    );

    await this.sessionRepository.create({ ...sessionData, id: sessionId });

    return { token, refreshToken };
  }

  /**
   * Sends email verification to user.
   * @private
   */
  private async sendVerificationEmail(user: User): Promise<void> {
    const token = this.passwordService.generateSecureToken();
    const hashedToken = this.passwordService.hashToken(token);
    const expiresAt = new Date(
      Date.now() + this.config.email.verificationExpiryHours * 60 * 60 * 1000
    );

    const verificationData: Partial<EmailVerification> = {
      id: crypto.randomUUID(),
      userId: user.id,
      token: hashedToken,
      expiresAt,
      createdAt: new Date()
    };

    await this.userRepository.createEmailVerification(verificationData);
    await this.emailService.sendVerificationEmail(user.email, token);
  }

  /**
   * Validates invite code.
   * @private
   */
  private async validateInviteCode(code: string): Promise<boolean> {
    const invite = await this.userRepository.findInviteCode(code);
    
    if (!invite) return false;
    if (invite.expiresAt && invite.expiresAt < new Date()) return false;
    if (invite.usesCount >= invite.maxUses) return false;
    
    return true;
  }

  /**
   * Creates registration approval request.
   * @private
   */
  private async createRegistrationApproval(
    data: RegistrationData,
    ipAddress?: string
  ): Promise<void> {
    await this.userRepository.createRegistrationApproval({
      email: data.email,
      username: data.username,
      applicationText: data.applicationText,
      ipAddress,
      requestedAt: new Date()
    });
  }
}
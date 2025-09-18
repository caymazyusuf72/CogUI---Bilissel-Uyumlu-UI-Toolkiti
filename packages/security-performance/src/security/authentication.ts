import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import argon2 from 'argon2';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as JWTStrategy, ExtractJwt } from 'passport-jwt';
import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { 
  User, 
  AuthToken, 
  SecurityEvent, 
  AuthenticationConfig, 
  SecureRequest,
  TwoFactorConfig 
} from '../types/index.js';

/**
 * CogUI Advanced Authentication Service
 * Comprehensive authentication system with 2FA, rate limiting, and cognitive adaptation
 */

export class AuthenticationService {
  private config: AuthenticationConfig;
  private users: Map<string, User> = new Map();
  private refreshTokens: Set<string> = new Set();
  private loginAttempts: Map<string, { count: number; lastAttempt: Date; lockUntil?: Date }> = new Map();

  constructor(config: AuthenticationConfig) {
    this.config = config;
    this.setupPassport();
  }

  /**
   * Setup Passport.js strategies
   */
  private setupPassport(): void {
    // Local Strategy for username/password authentication
    passport.use(new LocalStrategy(
      {
        usernameField: 'email',
        passwordField: 'password'
      },
      async (email: string, password: string, done) => {
        try {
          const user = await this.getUserByEmail(email);
          if (!user) {
            return done(null, false, { message: 'Invalid credentials' });
          }

          const isValidPassword = await this.verifyPassword(password, user.password!);
          if (!isValidPassword) {
            await this.recordFailedLogin(user.id, email);
            return done(null, false, { message: 'Invalid credentials' });
          }

          if (user.lockUntil && user.lockUntil > new Date()) {
            return done(null, false, { message: 'Account temporarily locked' });
          }

          await this.recordSuccessfulLogin(user.id);
          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    ));

    // JWT Strategy for token-based authentication
    passport.use(new JWTStrategy(
      {
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        secretOrKey: this.config.jwtSecret,
        algorithms: ['HS256']
      },
      async (payload, done) => {
        try {
          const user = await this.getUserById(payload.sub);
          if (!user) {
            return done(null, false);
          }

          if (!user.isActive) {
            return done(null, false, { message: 'Account deactivated' });
          }

          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    ));

    passport.serializeUser((user: any, done) => {
      done(null, user.id);
    });

    passport.deserializeUser(async (id: string, done) => {
      try {
        const user = await this.getUserById(id);
        done(null, user);
      } catch (error) {
        done(error);
      }
    });
  }

  /**
   * Register new user with cognitive profile initialization
   */
  async register(userData: {
    username: string;
    email: string;
    password: string;
    cognitiveProfile?: any;
    accessibilitySettings?: any;
  }): Promise<{ user: User; token: AuthToken }> {
    // Validate input
    await this.validateUserData(userData);

    // Check if user already exists
    const existingUser = await this.getUserByEmail(userData.email);
    if (existingUser) {
      throw new Error('User already exists');
    }

    // Hash password with Argon2 (more secure than bcrypt)
    const hashedPassword = await argon2.hash(userData.password, {
      type: argon2.argon2id,
      memoryCost: 2 ** 16,
      timeCost: 3,
      parallelism: 1,
    });

    // Create user
    const user: User = {
      id: this.generateUserId(),
      username: userData.username,
      email: userData.email,
      password: hashedPassword,
      role: 'user',
      permissions: ['read:own', 'update:own'],
      isActive: true,
      isVerified: false,
      twoFactorEnabled: false,
      loginAttempts: 0,
      refreshTokens: [],
      cognitiveProfile: userData.cognitiveProfile || {
        attentionSpan: 60, // seconds
        processingSpeed: 1.0,
        memoryCapacity: 0.8,
        cognitiveLoad: 0.5,
        adaptationPreferences: []
      },
      accessibilitySettings: userData.accessibilitySettings || {
        highContrast: false,
        largeText: false,
        reducedMotion: false,
        screenReader: false,
        colorBlindness: 'none',
        dyslexiaSupport: false
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Store user
    this.users.set(user.id, user);
    
    // Generate tokens
    const token = await this.generateAuthToken(user);

    // Log security event
    await this.logSecurityEvent({
      type: 'successful_login',
      severity: 'low',
      source: userData.email,
      description: 'New user registration completed',
      userId: user.id
    });

    return { user, token };
  }

  /**
   * Login with email and password
   */
  async login(email: string, password: string, ipAddress: string): Promise<{
    user: User;
    token: AuthToken;
    requireTwoFactor?: boolean;
    twoFactorToken?: string;
  }> {
    // Check rate limiting
    await this.checkRateLimit(email, ipAddress);

    // Find user
    const user = await this.getUserByEmail(email);
    if (!user) {
      await this.recordFailedLogin('unknown', email);
      throw new Error('Invalid credentials');
    }

    // Check if account is locked
    if (user.lockUntil && user.lockUntil > new Date()) {
      throw new Error('Account temporarily locked');
    }

    // Verify password
    const isValidPassword = await this.verifyPassword(password, user.password!);
    if (!isValidPassword) {
      await this.recordFailedLogin(user.id, email);
      throw new Error('Invalid credentials');
    }

    // Check if two-factor authentication is required
    if (user.twoFactorEnabled) {
      const twoFactorToken = this.generateTwoFactorToken(user.id);
      return {
        user,
        token: {} as AuthToken,
        requireTwoFactor: true,
        twoFactorToken
      };
    }

    // Generate tokens
    const token = await this.generateAuthToken(user);

    // Record successful login
    await this.recordSuccessfulLogin(user.id);

    // Log security event
    await this.logSecurityEvent({
      type: 'successful_login',
      severity: 'low',
      source: email,
      description: 'User login successful',
      userId: user.id
    });

    return { user, token };
  }

  /**
   * Verify two-factor authentication code
   */
  async verifyTwoFactor(
    userId: string, 
    token: string, 
    twoFactorCode: string
  ): Promise<{ user: User; authToken: AuthToken }> {
    const user = await this.getUserById(userId);
    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new Error('Two-factor authentication not enabled');
    }

    // Verify the temporary token
    if (!this.verifyTwoFactorToken(token, userId)) {
      throw new Error('Invalid two-factor token');
    }

    // Verify the TOTP code
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: twoFactorCode,
      window: this.config.twoFactorAuth ? 2 : 0
    });

    if (!verified) {
      await this.recordFailedLogin(userId, user.email);
      throw new Error('Invalid two-factor code');
    }

    // Generate auth tokens
    const authToken = await this.generateAuthToken(user);

    // Record successful login
    await this.recordSuccessfulLogin(user.id);

    return { user, authToken };
  }

  /**
   * Setup two-factor authentication
   */
  async setupTwoFactor(userId: string): Promise<{
    secret: string;
    qrCodeUrl: string;
    backupCodes: string[];
  }> {
    const user = await this.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `CogUI (${user.email})`,
      issuer: 'CogUI',
      length: 32
    });

    // Generate QR code
    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url!);

    // Generate backup codes
    const backupCodes = Array.from({ length: 8 }, () => 
      Math.random().toString(36).substring(2, 10).toUpperCase()
    );

    // Store secret (temporarily, until verified)
    user.twoFactorSecret = secret.base32;
    user.updatedAt = new Date();

    return {
      secret: secret.base32!,
      qrCodeUrl,
      backupCodes
    };
  }

  /**
   * Enable two-factor authentication
   */
  async enableTwoFactor(userId: string, token: string): Promise<boolean> {
    const user = await this.getUserById(userId);
    if (!user || !user.twoFactorSecret) {
      throw new Error('Two-factor setup not found');
    }

    // Verify the token
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: token,
      window: 2
    });

    if (!verified) {
      throw new Error('Invalid verification token');
    }

    // Enable two-factor authentication
    user.twoFactorEnabled = true;
    user.updatedAt = new Date();
    this.users.set(user.id, user);

    // Log security event
    await this.logSecurityEvent({
      type: 'password_changed',
      severity: 'medium',
      source: user.email,
      description: 'Two-factor authentication enabled',
      userId: user.id
    });

    return true;
  }

  /**
   * Refresh authentication token
   */
  async refreshToken(refreshToken: string): Promise<AuthToken> {
    if (!this.refreshTokens.has(refreshToken)) {
      throw new Error('Invalid refresh token');
    }

    try {
      const payload = jwt.verify(refreshToken, this.config.jwtSecret) as any;
      const user = await this.getUserById(payload.sub);
      
      if (!user || !user.refreshTokens.includes(refreshToken)) {
        throw new Error('Invalid refresh token');
      }

      // Remove old refresh token
      this.refreshTokens.delete(refreshToken);
      user.refreshTokens = user.refreshTokens.filter(t => t !== refreshToken);

      // Generate new tokens
      const newToken = await this.generateAuthToken(user);
      
      return newToken;
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  /**
   * Logout user and invalidate tokens
   */
  async logout(userId: string, refreshToken?: string): Promise<void> {
    const user = await this.getUserById(userId);
    if (!user) {
      return;
    }

    if (refreshToken) {
      // Remove specific refresh token
      this.refreshTokens.delete(refreshToken);
      user.refreshTokens = user.refreshTokens.filter(t => t !== refreshToken);
    } else {
      // Remove all refresh tokens
      user.refreshTokens.forEach(token => this.refreshTokens.delete(token));
      user.refreshTokens = [];
    }

    user.updatedAt = new Date();
    this.users.set(user.id, user);
  }

  /**
   * Middleware for JWT authentication
   */
  authenticateJWT() {
    return passport.authenticate('jwt', { session: false });
  }

  /**
   * Middleware for rate limiting login attempts
   */
  createLoginRateLimit() {
    return rateLimit({
      windowMs: this.config.lockoutTime * 60 * 1000, // Convert minutes to ms
      max: this.config.maxLoginAttempts,
      message: {
        error: 'Too many login attempts, please try again later',
        retryAfter: this.config.lockoutTime
      },
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req: Request) => req.ip + ':' + req.body.email,
      onLimitReached: (req: Request) => {
        this.logSecurityEvent({
          type: 'rate_limit_exceeded',
          severity: 'medium',
          source: req.ip,
          description: 'Login rate limit exceeded',
          metadata: { email: req.body.email }
        });
      }
    });
  }

  /**
   * Middleware for slow down repeated requests
   */
  createSlowDown() {
    return slowDown({
      windowMs: 15 * 60 * 1000, // 15 minutes
      delayAfter: 2,
      delayMs: 500,
      maxDelayMs: 20000,
      keyGenerator: (req: Request) => req.ip
    });
  }

  // Private methods

  private async validateUserData(userData: any): Promise<void> {
    const validations = [
      body('username')
        .isLength({ min: 3, max: 30 })
        .matches(/^[a-zA-Z0-9_-]+$/)
        .withMessage('Username must be 3-30 characters and contain only letters, numbers, underscores, and hyphens'),
      
      body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email'),
      
      body('password')
        .isLength({ min: this.config.passwordMinLength })
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage(`Password must be at least ${this.config.passwordMinLength} characters and contain uppercase, lowercase, number, and special character`)
    ];

    // Run validations (simplified for this example)
    const username = userData.username;
    const email = userData.email;
    const password = userData.password;

    if (!username || username.length < 3 || username.length > 30) {
      throw new Error('Invalid username');
    }

    if (!email || !email.includes('@')) {
      throw new Error('Invalid email');
    }

    if (!password || password.length < this.config.passwordMinLength) {
      throw new Error('Password too short');
    }
  }

  private async verifyPassword(plaintext: string, hash: string): Promise<boolean> {
    try {
      // Try Argon2 first (newer format)
      return await argon2.verify(hash, plaintext);
    } catch (error) {
      // Fallback to bcrypt (legacy support)
      try {
        return await bcrypt.compare(plaintext, hash);
      } catch (bcryptError) {
        return false;
      }
    }
  }

  private async generateAuthToken(user: User): Promise<AuthToken> {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions
    };

    const accessToken = jwt.sign(payload, this.config.jwtSecret, {
      expiresIn: this.config.jwtExpiresIn,
      issuer: 'cogui-auth',
      audience: 'cogui-app'
    });

    const refreshToken = jwt.sign(
      { sub: user.id, type: 'refresh' },
      this.config.jwtSecret,
      {
        expiresIn: this.config.refreshTokenExpiresIn || '7d',
        issuer: 'cogui-auth',
        audience: 'cogui-app'
      }
    );

    // Store refresh token
    this.refreshTokens.add(refreshToken);
    user.refreshTokens.push(refreshToken);
    user.updatedAt = new Date();
    this.users.set(user.id, user);

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: typeof this.config.jwtExpiresIn === 'string' ? 
        this.parseTimeToSeconds(this.config.jwtExpiresIn) : 
        this.config.jwtExpiresIn,
      scope: user.permissions,
      userId: user.id
    };
  }

  private generateTwoFactorToken(userId: string): string {
    return jwt.sign(
      { sub: userId, type: 'two-factor' },
      this.config.jwtSecret,
      { expiresIn: '5m' }
    );
  }

  private verifyTwoFactorToken(token: string, userId: string): boolean {
    try {
      const payload = jwt.verify(token, this.config.jwtSecret) as any;
      return payload.sub === userId && payload.type === 'two-factor';
    } catch {
      return false;
    }
  }

  private generateUserId(): string {
    return 'user_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  private parseTimeToSeconds(time: string): number {
    const unit = time.slice(-1);
    const value = parseInt(time.slice(0, -1));
    
    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 60 * 60;
      case 'd': return value * 60 * 60 * 24;
      default: return 3600; // 1 hour default
    }
  }

  private async getUserById(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  private async getUserByEmail(email: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.email === email) {
        return user;
      }
    }
    return null;
  }

  private async recordSuccessfulLogin(userId: string): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.loginAttempts = 0;
      user.lockUntil = undefined;
      user.lastLogin = new Date();
      user.updatedAt = new Date();
      this.users.set(userId, user);
    }

    // Clear login attempts tracking
    this.loginAttempts.delete(userId);
  }

  private async recordFailedLogin(userId: string, email: string): Promise<void> {
    const attempts = this.loginAttempts.get(userId) || { count: 0, lastAttempt: new Date() };
    attempts.count++;
    attempts.lastAttempt = new Date();

    if (attempts.count >= this.config.maxLoginAttempts) {
      attempts.lockUntil = new Date(Date.now() + this.config.lockoutTime * 60 * 1000);
      
      // Update user record if exists
      const user = this.users.get(userId);
      if (user) {
        user.loginAttempts = attempts.count;
        user.lockUntil = attempts.lockUntil;
        user.updatedAt = new Date();
        this.users.set(userId, user);
      }

      // Log security event
      await this.logSecurityEvent({
        type: 'account_locked',
        severity: 'high',
        source: email,
        description: 'Account locked due to too many failed login attempts',
        userId: userId
      });
    }

    this.loginAttempts.set(userId, attempts);

    // Log failed login attempt
    await this.logSecurityEvent({
      type: 'failed_login',
      severity: 'medium',
      source: email,
      description: 'Failed login attempt',
      userId: userId,
      metadata: { attempts: attempts.count }
    });
  }

  private async checkRateLimit(email: string, ipAddress: string): Promise<void> {
    // Implementation would check against rate limiting store
    // This is a simplified version
  }

  private async logSecurityEvent(event: Partial<SecurityEvent>): Promise<void> {
    const securityEvent: SecurityEvent = {
      id: 'event_' + Date.now(),
      type: event.type!,
      severity: event.severity || 'low',
      source: event.source || 'system',
      target: event.target,
      description: event.description || '',
      metadata: event.metadata || {},
      timestamp: new Date(),
      resolved: false
    };

    // In a real implementation, this would be stored in a database
    console.log('Security Event:', securityEvent);
  }
}

/**
 * Authentication validation middleware
 */
export const validateRegistration = [
  body('username')
    .isLength({ min: 3, max: 30 })
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username must be 3-30 characters and contain only letters, numbers, underscores, and hyphens'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must be at least 8 characters and contain uppercase, lowercase, number, and special character'),

  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }
    next();
  }
];

export const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),

  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }
    next();
  }
];

export default AuthenticationService;
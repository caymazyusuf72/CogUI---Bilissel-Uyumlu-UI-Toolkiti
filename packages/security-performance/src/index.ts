/**
 * CogUI Security & Performance Suite
 * Comprehensive security and performance optimization for cognitive-adaptive UI applications
 * 
 * @version 1.0.0
 * @author CogUI Team
 * @license MIT
 */

// Type Exports
export type {
  SecurityConfig,
  AuthenticationConfig,
  AuthorizationConfig,
  RateLimitConfig,
  SecurityHeadersConfig,
  CSPConfig,
  HSTSConfig,
  FrameguardConfig,
  ReferrerPolicyConfig,
  FeaturePolicyConfig,
  CSRFConfig,
  BruteForceConfig,
  SessionConfig,
  TwoFactorConfig,
  EncryptionConfig,
  PerformanceConfig,
  CachingConfig,
  CompressionConfig,
  OptimizationConfig,
  MonitoringConfig,
  PerformanceTrackingConfig,
  SecurityAuditConfig,
  ErrorTrackingConfig,
  LoggingConfig,
  CDNConfig,
  User,
  AuthToken,
  SecurityEvent,
  SecurityEventType,
  PerformanceMetrics,
  SecurityMiddleware,
  PerformanceMiddleware,
  SecureRequest,
  SecureResponse,
  Permission,
  CognitiveProfile,
  AccessibilitySettings
} from './types/index.js';

// Security Exports
export { 
  AuthenticationService,
  validateRegistration,
  validateLogin
} from './security/authentication.js';

export {
  SecurityMiddleware,
  createSecurityMiddleware,
  defaultSecurityConfig
} from './security/middleware.js';

// Performance Exports
export {
  PerformanceOptimizer,
  createPerformanceOptimizer,
  defaultPerformanceConfig
} from './performance/optimization.js';

// Utility Exports
export {
  generateSecureToken,
  generateSecureString,
  createHashWithSalt,
  verifyHashWithSalt,
  deriveKeyPBKDF2,
  deriveKeyScrypt,
  constantTimeCompare,
  sanitizeInput,
  validateEmail,
  validatePasswordStrength,
  Timer,
  MemoryTracker,
  calculatePerformanceMetrics,
  calculateCognitiveLoad,
  generateAccessibilityAdaptations,
  cognitiveDebounce,
  cognitiveThrottle,
  deepClone,
  flattenObject,
  groupBy,
  retryWithBackoff,
  RateLimiter
} from './utils/index.js';

/**
 * Complete security and performance optimization suite for CogUI applications
 */
export class CogUISecurityPerformance {
  private authService?: AuthenticationService;
  private securityMiddleware?: SecurityMiddleware;
  private performanceOptimizer?: PerformanceOptimizer;
  
  constructor(private config: {
    security?: SecurityConfig;
    performance?: PerformanceConfig;
    authentication?: AuthenticationConfig;
  }) {}

  /**
   * Initialize authentication service
   */
  initAuthentication(config?: AuthenticationConfig): AuthenticationService {
    const authConfig = config || this.config.authentication;
    if (!authConfig) {
      throw new Error('Authentication configuration is required');
    }
    
    this.authService = new AuthenticationService(authConfig);
    return this.authService;
  }

  /**
   * Initialize security middleware
   */
  initSecurity(config?: SecurityConfig): SecurityMiddleware {
    const securityConfig = config || this.config.security;
    if (!securityConfig) {
      throw new Error('Security configuration is required');
    }
    
    this.securityMiddleware = new SecurityMiddleware(securityConfig);
    return this.securityMiddleware;
  }

  /**
   * Initialize performance optimizer
   */
  initPerformance(config?: PerformanceConfig): PerformanceOptimizer {
    const performanceConfig = config || this.config.performance;
    if (!performanceConfig) {
      throw new Error('Performance configuration is required');
    }
    
    this.performanceOptimizer = new PerformanceOptimizer(performanceConfig);
    return this.performanceOptimizer;
  }

  /**
   * Get all initialized middleware
   */
  getAllMiddleware(): any[] {
    const middleware: any[] = [];
    
    if (this.securityMiddleware) {
      middleware.push(...this.securityMiddleware.initializeAll());
    }
    
    if (this.performanceOptimizer) {
      middleware.push(...this.performanceOptimizer.initializeAll());
    }
    
    return middleware;
  }

  /**
   * Get security middleware only
   */
  getSecurityMiddleware(): any[] {
    if (!this.securityMiddleware) {
      throw new Error('Security middleware not initialized');
    }
    
    return this.securityMiddleware.initializeAll();
  }

  /**
   * Get performance middleware only
   */
  getPerformanceMiddleware(): any[] {
    if (!this.performanceOptimizer) {
      throw new Error('Performance optimizer not initialized');
    }
    
    return this.performanceOptimizer.initializeAll();
  }

  /**
   * Get authentication service
   */
  getAuthService(): AuthenticationService {
    if (!this.authService) {
      throw new Error('Authentication service not initialized');
    }
    
    return this.authService;
  }

  /**
   * Get comprehensive security and performance report
   */
  getSystemReport(): {
    security: {
      eventsCount: number;
      lastSecurityEvent?: SecurityEvent;
      middlewareStatus: string;
    };
    performance: {
      stats?: any;
      optimizerStatus: string;
    };
    authentication: {
      serviceStatus: string;
    };
    timestamp: Date;
  } {
    return {
      security: {
        eventsCount: 0, // Would be retrieved from security middleware
        middlewareStatus: this.securityMiddleware ? 'active' : 'inactive'
      },
      performance: {
        stats: this.performanceOptimizer?.getPerformanceStats(),
        optimizerStatus: this.performanceOptimizer ? 'active' : 'inactive'
      },
      authentication: {
        serviceStatus: this.authService ? 'active' : 'inactive'
      },
      timestamp: new Date()
    };
  }
}

/**
 * Default configuration for CogUI Security & Performance
 */
export const defaultConfig = {
  security: {
    authentication: {
      jwtSecret: 'change-this-in-production-environment',
      jwtExpiresIn: '24h',
      refreshTokenExpiresIn: '7d',
      bcryptRounds: 12,
      maxLoginAttempts: 5,
      lockoutTime: 15,
      sessionTimeout: 30,
      passwordMinLength: 8,
      passwordRequireSpecialChars: true,
      twoFactorAuth: false,
      oauth: {
        google: {
          clientID: '',
          clientSecret: '',
          callbackURL: '/auth/google/callback',
          scope: ['profile', 'email']
        },
        github: {
          clientID: '',
          clientSecret: '',
          callbackURL: '/auth/github/callback',
          scope: ['user:email']
        },
        microsoft: {
          clientID: '',
          clientSecret: '',
          callbackURL: '/auth/microsoft/callback',
          scope: ['user.read']
        }
      }
    },
    authorization: {
      rbac: {
        enabled: true,
        defaultRole: 'user',
        hierarchical: true,
        cacheExpiry: 3600
      },
      permissions: {
        create: ['create:own'],
        read: ['read:own', 'read:any'],
        update: ['update:own'],
        delete: ['delete:own'],
        admin: ['admin:users', 'admin:system']
      },
      roles: {
        user: ['read:own', 'create:own', 'update:own', 'delete:own'],
        moderator: ['read:any', 'create:any', 'update:any'],
        admin: ['read:any', 'create:any', 'update:any', 'delete:any', 'admin:users'],
        superAdmin: ['read:any', 'create:any', 'update:any', 'delete:any', 'admin:users', 'admin:system', 'admin:security']
      }
    },
    rateLimit: {
      windowMs: 15,
      max: 100,
      message: 'Too many requests from this IP, please try again later',
      statusCode: 429,
      skipSuccessfulRequests: true,
      skipFailedRequests: false,
      keyGenerator: (req: any) => req.ip,
      onLimitReached: () => {}
    },
    headers: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
          upgradeInsecureRequests: true
        },
        reportOnly: false,
        reportUri: '/api/security/csp-report'
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    },
    csrf: {
      cookie: {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 3600
      },
      ignoreMethods: ['GET', 'HEAD', 'OPTIONS'],
      value: (req: any) => req.csrfToken()
    },
    bruteForce: {
      freeRetries: 2,
      minWait: 5,
      maxWait: 60,
      lifetime: 3600
    },
    session: {
      secret: 'change-this-session-secret-in-production',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: true,
        httpOnly: true,
        maxAge: 86400000, // 24 hours
        sameSite: 'strict'
      },
      store: 'memory',
      name: 'cogui.session.id'
    },
    twoFactor: {
      enabled: false,
      issuer: 'CogUI',
      window: 2,
      encoding: 'base32',
      algorithm: 'sha1',
      digits: 6,
      step: 30
    },
    encryption: {
      algorithm: 'aes-256-gcm',
      keyLength: 32,
      ivLength: 12,
      tagLength: 16,
      iterations: 100000
    }
  },
  performance: {
    caching: {
      redis: {
        host: 'localhost',
        port: 6379,
        db: 0,
        ttl: 3600,
        maxMemory: '100mb',
        evictionPolicy: 'allkeys-lru',
        keyPrefix: 'cogui:'
      },
      memory: {
        max: 500,
        maxAge: 1800,
        updateAgeOnGet: true,
        updateAgeOnHas: false
      },
      http: {
        maxAge: 86400,
        sMaxAge: 31536000,
        mustRevalidate: false,
        noCache: false,
        noStore: false,
        private: false,
        public: true,
        etag: true,
        lastModified: true
      },
      database: {
        queryCache: true,
        resultCache: true,
        connectionPooling: true,
        indexOptimization: true
      }
    },
    compression: {
      algorithm: 'gzip',
      level: 6,
      threshold: 1024,
      filter: () => true,
      chunkSize: 16384,
      windowBits: 15,
      memLevel: 8
    },
    optimization: {
      imageOptimization: {
        enabled: true,
        formats: ['webp', 'avif', 'jpeg', 'png'],
        quality: 85,
        progressive: true,
        lossless: false,
        stripMetadata: true,
        autoResize: true,
        maxWidth: 2000,
        maxHeight: 2000
      },
      cssMinification: {
        enabled: true,
        level: 2,
        removeComments: true,
        removeWhitespace: true,
        mergeLonghand: true,
        mergeRules: true,
        removeDuplicates: true
      },
      jsMinification: {
        enabled: true,
        mangle: true,
        compress: true,
        removeComments: true,
        removeDeadCode: true,
        sourceMap: false,
        ecma: 2020
      },
      htmlMinification: {
        enabled: true,
        collapseWhitespace: true,
        removeComments: true,
        removeEmptyAttributes: true,
        removeRedundantAttributes: true,
        removeScriptTypeAttributes: true,
        removeStyleLinkTypeAttributes: true,
        minifyCSS: true,
        minifyJS: true
      },
      bundleOptimization: {
        codesplitting: true,
        treeshaking: true,
        lazyLoading: true,
        preloading: true,
        prefetching: true,
        compression: true
      }
    },
    monitoring: {
      metricsCollection: true,
      performanceTracking: {
        responseTime: true,
        memoryUsage: true,
        cpuUsage: true,
        diskIO: true,
        networkIO: true,
        databaseQueries: true,
        cacheHitRatio: true,
        errorRate: true,
        throughput: true
      },
      securityAudit: {
        vulnerabilityScanning: true,
        dependencyChecking: true,
        codeAnalysis: true,
        accessLogging: true,
        failedLoginTracking: true,
        suspiciousActivityDetection: true,
        ipWhitelisting: false,
        ipBlacklisting: true
      },
      errorTracking: {
        enabled: true,
        captureUncaughtExceptions: true,
        captureUnhandledRejections: true,
        stackTrace: true,
        breadcrumbs: true,
        userContext: true,
        fingerprinting: true,
        sampling: 1.0
      },
      logging: {
        level: 'info',
        transports: [
          {
            type: 'console',
            level: 'info'
          },
          {
            type: 'file',
            level: 'error',
            filename: 'error.log',
            maxSize: '10m',
            maxFiles: 5
          }
        ],
        format: 'json',
        rotation: {
          enabled: true,
          maxSize: '50m',
          maxFiles: 10,
          datePattern: 'YYYY-MM-DD',
          compress: true
        },
        encryption: false
      }
    },
    cdn: {
      enabled: false,
      provider: 'cloudflare',
      endpoint: '',
      apiKey: '',
      zones: [],
      caching: {
        browserTTL: 86400,
        edgeTTL: 2592000,
        alwaysOnline: true,
        developmentMode: false
      }
    }
  }
};

/**
 * Factory function to create a complete CogUI Security & Performance instance
 */
export function createCogUISecurityPerformance(config?: {
  security?: Partial<SecurityConfig>;
  performance?: Partial<PerformanceConfig>;
  authentication?: Partial<AuthenticationConfig>;
}): CogUISecurityPerformance {
  const mergedConfig = {
    security: { ...defaultConfig.security, ...config?.security },
    performance: { ...defaultConfig.performance, ...config?.performance },
    authentication: { ...defaultConfig.security.authentication, ...config?.authentication }
  };
  
  return new CogUISecurityPerformance(mergedConfig as any);
}

/**
 * Quick setup function for Express applications
 */
export function quickSetup(app: any, config?: {
  security?: Partial<SecurityConfig>;
  performance?: Partial<PerformanceConfig>;
  authentication?: Partial<AuthenticationConfig>;
}): {
  securityPerformance: CogUISecurityPerformance;
  authService: AuthenticationService;
} {
  const securityPerformance = createCogUISecurityPerformance(config);
  
  // Initialize all services
  const authService = securityPerformance.initAuthentication();
  securityPerformance.initSecurity();
  securityPerformance.initPerformance();
  
  // Apply all middleware to Express app
  const middleware = securityPerformance.getAllMiddleware();
  middleware.forEach(mw => app.use(mw));
  
  console.log('🛡️ CogUI Security & Performance initialized');
  console.log('✅ Security middleware active');
  console.log('🚀 Performance optimization active');
  console.log('🔐 Authentication service ready');
  
  return { securityPerformance, authService };
}

// Default export
export default CogUISecurityPerformance;
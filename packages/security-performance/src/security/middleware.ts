import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import ExpressBrute from 'express-brute';
import cors from 'cors';
import { Request, Response, NextFunction } from 'express';
import validator from 'validator';
import xss from 'xss';
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import csrf from 'csrf';
import { createHash, randomBytes } from 'crypto';
import { 
  SecurityConfig, 
  SecureRequest, 
  SecureResponse, 
  SecurityEvent,
  PerformanceMetrics 
} from '../types/index.js';

/**
 * CogUI Security Middleware Suite
 * Comprehensive security middleware for cognitive-adaptive UI applications
 */

// Initialize DOM for server-side DOMPurify
const window = new JSDOM('').window;
const purify = DOMPurify(window);

export class SecurityMiddleware {
  private config: SecurityConfig;
  private bruteForceStore: Map<string, any> = new Map();
  private csrfTokens: Map<string, { token: string; expires: Date }> = new Map();
  private securityEvents: SecurityEvent[] = [];

  constructor(config: SecurityConfig) {
    this.config = config;
  }

  /**
   * Initialize all security middleware
   */
  public initializeAll() {
    return [
      this.helmetSecurity(),
      this.corsHandler(),
      this.rateLimiting(),
      this.slowDown(),
      this.bruteForceProtection(),
      this.csrfProtection(),
      this.inputSanitization(),
      this.xssProtection(),
      this.dataValidation(),
      this.securityHeaders(),
      this.securityMonitoring()
    ];
  }

  /**
   * Helmet security headers configuration
   */
  public helmetSecurity() {
    return helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: this.config.headers.contentSecurityPolicy.directives.defaultSrc,
          styleSrc: this.config.headers.contentSecurityPolicy.directives.styleSrc,
          scriptSrc: this.config.headers.contentSecurityPolicy.directives.scriptSrc,
          imgSrc: this.config.headers.contentSecurityPolicy.directives.imgSrc,
          connectSrc: this.config.headers.contentSecurityPolicy.directives.connectSrc,
          fontSrc: this.config.headers.contentSecurityPolicy.directives.fontSrc,
          objectSrc: this.config.headers.contentSecurityPolicy.directives.objectSrc,
          mediaSrc: this.config.headers.contentSecurityPolicy.directives.mediaSrc,
          frameSrc: this.config.headers.contentSecurityPolicy.directives.frameSrc,
          upgradeInsecureRequests: this.config.headers.contentSecurityPolicy.directives.upgradeInsecureRequests
        },
        reportOnly: this.config.headers.contentSecurityPolicy.reportOnly,
        reportUri: this.config.headers.contentSecurityPolicy.reportUri
      },
      hsts: {
        maxAge: this.config.headers.hsts.maxAge,
        includeSubDomains: this.config.headers.hsts.includeSubDomains,
        preload: this.config.headers.hsts.preload
      },
      frameguard: { action: 'deny' },
      xssFilter: true,
      noSniff: true,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      permittedCrossDomainPolicies: false,
      crossOriginEmbedderPolicy: true,
      crossOriginOpenerPolicy: { policy: 'same-origin' },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      dnsPrefetchControl: { allow: false },
      hidePoweredBy: true
    });
  }

  /**
   * CORS configuration for cognitive UI applications
   */
  public corsHandler() {
    return cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        const allowedOrigins = [
          'https://cogui.dev',
          'https://app.cogui.dev',
          'https://demo.cogui.dev',
          'http://localhost:3000',
          'http://localhost:3001',
          'http://localhost:8080'
        ];

        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }

        // Log unauthorized origin attempt
        this.logSecurityEvent({
          type: 'suspicious_activity',
          severity: 'medium',
          source: origin,
          description: 'Unauthorized CORS origin',
          metadata: { origin }
        });

        return callback(new Error('CORS policy violation'), false);
      },
      credentials: true,
      optionsSuccessStatus: 200,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'X-CSRF-Token',
        'X-Cognitive-Profile',
        'X-Accessibility-Settings'
      ],
      exposedHeaders: [
        'X-RateLimit-Limit',
        'X-RateLimit-Remaining',
        'X-RateLimit-Reset',
        'X-Response-Time'
      ]
    });
  }

  /**
   * Advanced rate limiting with cognitive load consideration
   */
  public rateLimiting() {
    return rateLimit({
      windowMs: this.config.rateLimit.windowMs * 60 * 1000,
      max: (req: SecureRequest) => {
        // Adaptive rate limiting based on cognitive profile
        const cognitiveProfile = req.headers['x-cognitive-profile'];
        if (cognitiveProfile) {
          try {
            const profile = JSON.parse(cognitiveProfile as string);
            // Users with higher cognitive load get more requests
            const multiplier = profile.cognitiveLoad > 0.7 ? 1.5 : 1.0;
            return Math.floor(this.config.rateLimit.max * multiplier);
          } catch (error) {
            // Fallback to default
          }
        }
        return this.config.rateLimit.max;
      },
      message: (req: Request, res: Response) => ({
        error: 'Too many requests',
        message: this.config.rateLimit.message,
        retryAfter: Math.ceil(this.config.rateLimit.windowMs / 60),
        cognitiveSupport: {
          suggestion: 'Take a break to reduce cognitive load',
          adaptations: ['reduce_animations', 'increase_text_size', 'simplify_layout']
        }
      }),
      statusCode: this.config.rateLimit.statusCode,
      skipSuccessfulRequests: this.config.rateLimit.skipSuccessfulRequests,
      skipFailedRequests: this.config.rateLimit.skipFailedRequests,
      keyGenerator: (req: Request) => {
        return `${req.ip}:${req.headers['user-agent'] || 'unknown'}`;
      },
      onLimitReached: (req: Request, res: Response) => {
        this.logSecurityEvent({
          type: 'rate_limit_exceeded',
          severity: 'medium',
          source: req.ip,
          description: 'Rate limit exceeded',
          metadata: {
            userAgent: req.headers['user-agent'],
            path: req.path,
            method: req.method
          }
        });
      },
      standardHeaders: true,
      legacyHeaders: false
    });
  }

  /**
   * Slow down repeated requests
   */
  public slowDown() {
    return slowDown({
      windowMs: 15 * 60 * 1000, // 15 minutes
      delayAfter: 5,
      delayMs: (hits) => hits * 200, // 200ms delay per hit after the 5th
      maxDelayMs: 10000, // Maximum 10 second delay
      keyGenerator: (req: Request) => req.ip,
      onLimitReached: (req: Request, res: Response) => {
        this.logSecurityEvent({
          type: 'suspicious_activity',
          severity: 'low',
          source: req.ip,
          description: 'Slow down triggered'
        });
      }
    });
  }

  /**
   * Brute force protection
   */
  public bruteForceProtection() {
    return (req: Request, res: Response, next: NextFunction) => {
      const key = this.getBruteForceKey(req);
      const attempts = this.bruteForceStore.get(key) || {
        count: 0,
        firstAttempt: new Date(),
        lastAttempt: new Date()
      };

      const now = new Date();
      const timeDiff = now.getTime() - attempts.lastAttempt.getTime();

      // Reset if outside the lifetime window
      if (timeDiff > this.config.bruteForce.lifetime * 1000) {
        this.bruteForceStore.delete(key);
        return next();
      }

      // Check if still within free retries
      if (attempts.count < this.config.bruteForce.freeRetries) {
        return next();
      }

      // Calculate wait time (exponential backoff)
      const waitTime = Math.min(
        this.config.bruteForce.minWait * Math.pow(2, attempts.count - this.config.bruteForce.freeRetries),
        this.config.bruteForce.maxWait
      );

      if (timeDiff < waitTime * 1000) {
        const retryAfter = Math.ceil((waitTime * 1000 - timeDiff) / 1000);
        
        this.logSecurityEvent({
          type: 'brute_force_attempt',
          severity: 'high',
          source: req.ip,
          description: 'Brute force protection triggered',
          metadata: {
            attempts: attempts.count,
            waitTime,
            retryAfter
          }
        });

        return res.status(429).json({
          error: 'Too many attempts',
          retryAfter,
          cognitiveSupport: {
            message: 'Multiple failed attempts detected. Please wait before trying again.',
            supportOptions: ['contact_support', 'password_reset', 'accessibility_help']
          }
        });
      }

      next();
    };
  }

  /**
   * CSRF protection
   */
  public csrfProtection() {
    const tokens = new csrf();

    return (req: SecureRequest, res: SecureResponse, next: NextFunction) => {
      // Skip CSRF for safe methods and API endpoints with proper authentication
      if (['GET', 'HEAD', 'OPTIONS'].includes(req.method) || 
          req.path.startsWith('/api/') && req.headers.authorization) {
        return next();
      }

      const sessionId = req.sessionID || req.ip;
      
      if (req.method === 'GET') {
        // Generate and store CSRF token
        const secret = tokens.secretSync();
        const token = tokens.create(secret);
        
        this.csrfTokens.set(sessionId, {
          token: secret,
          expires: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
        });

        // Add token to response headers and locals for templates
        res.setHeader('X-CSRF-Token', token);
        res.locals = res.locals || {};
        res.locals.csrfToken = token;
        
        return next();
      }

      // Verify CSRF token for state-changing methods
      const submittedToken = req.headers['x-csrf-token'] || 
                            req.body._csrf || 
                            req.query._csrf;

      if (!submittedToken) {
        this.logSecurityEvent({
          type: 'csrf_attack',
          severity: 'high',
          source: req.ip,
          description: 'Missing CSRF token',
          metadata: { path: req.path, method: req.method }
        });

        return res.status(403).json({ 
          error: 'CSRF token missing',
          cognitiveSupport: {
            message: 'Security token required. Please refresh the page.',
            action: 'refresh_page'
          }
        });
      }

      const storedToken = this.csrfTokens.get(sessionId);
      
      if (!storedToken || storedToken.expires < new Date()) {
        return res.status(403).json({ 
          error: 'CSRF token expired',
          cognitiveSupport: {
            message: 'Session expired. Please refresh the page.',
            action: 'refresh_page'
          }
        });
      }

      if (!tokens.verify(storedToken.token, submittedToken as string)) {
        this.logSecurityEvent({
          type: 'csrf_attack',
          severity: 'high',
          source: req.ip,
          description: 'Invalid CSRF token',
          metadata: { path: req.path, method: req.method }
        });

        return res.status(403).json({ 
          error: 'Invalid CSRF token',
          cognitiveSupport: {
            message: 'Security validation failed. Please try again.',
            action: 'retry_action'
          }
        });
      }

      next();
    };
  }

  /**
   * Input sanitization middleware
   */
  public inputSanitization() {
    return (req: Request, res: Response, next: NextFunction) => {
      // MongoDB injection protection
      mongoSanitize.sanitize(req.body);
      mongoSanitize.sanitize(req.query);
      mongoSanitize.sanitize(req.params);

      // Parameter pollution protection
      hpp({
        whitelist: ['tags', 'categories', 'fields'] // Allow arrays for specific parameters
      })(req, res, () => {});

      // Deep sanitize nested objects
      this.deepSanitize(req.body);
      this.deepSanitize(req.query);

      next();
    };
  }

  /**
   * XSS protection middleware
   */
  public xssProtection() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Sanitize request body
      if (req.body && typeof req.body === 'object') {
        this.sanitizeObject(req.body);
      }

      // Sanitize query parameters
      if (req.query && typeof req.query === 'object') {
        this.sanitizeObject(req.query);
      }

      next();
    };
  }

  /**
   * Data validation middleware
   */
  public dataValidation() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Validate common input patterns
      if (req.body) {
        for (const [key, value] of Object.entries(req.body)) {
          if (typeof value === 'string') {
            // Check for common attack patterns
            if (this.containsAttackPattern(value)) {
              this.logSecurityEvent({
                type: 'suspicious_activity',
                severity: 'high',
                source: req.ip,
                description: 'Potential attack pattern detected',
                metadata: { field: key, pattern: 'suspicious_string' }
              });

              return res.status(400).json({
                error: 'Invalid input detected',
                field: key,
                cognitiveSupport: {
                  message: 'Your input contains invalid characters. Please check and try again.',
                  suggestions: ['remove_special_characters', 'use_simple_text']
                }
              });
            }

            // Validate email format
            if (key.toLowerCase().includes('email') && !validator.isEmail(value)) {
              return res.status(400).json({
                error: 'Invalid email format',
                field: key,
                cognitiveSupport: {
                  message: 'Please enter a valid email address (example: user@domain.com)',
                  example: 'user@example.com'
                }
              });
            }

            // Validate URL format
            if (key.toLowerCase().includes('url') && !validator.isURL(value)) {
              return res.status(400).json({
                error: 'Invalid URL format',
                field: key,
                cognitiveSupport: {
                  message: 'Please enter a valid URL (example: https://example.com)',
                  example: 'https://example.com'
                }
              });
            }
          }
        }
      }

      next();
    };
  }

  /**
   * Additional security headers
   */
  public securityHeaders() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Remove sensitive headers
      res.removeHeader('X-Powered-By');
      res.removeHeader('Server');

      // Add custom security headers
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      res.setHeader('Feature-Policy', 'camera \'none\'; microphone \'none\'; geolocation \'self\'');
      res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');
      res.setHeader('X-Cognitive-UI-Version', '1.0.0');
      res.setHeader('X-Accessibility-Compliant', 'WCAG-2.1-AA');

      // Add security performance hints
      res.setHeader('X-DNS-Prefetch-Control', 'off');
      res.setHeader('X-Download-Options', 'noopen');
      res.setHeader('X-Content-Security-Policy', 'default-src \'self\'');

      next();
    };
  }

  /**
   * Security monitoring and logging
   */
  public securityMonitoring() {
    return (req: SecureRequest, res: SecureResponse, next: NextFunction) => {
      const startTime = Date.now();
      
      // Initialize security context
      req.security = {
        events: [],
        startTime,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || 'unknown'
      };

      res.security = {
        headers: {},
        events: []
      };

      // Monitor response
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        
        // Log slow requests
        if (duration > 5000) {
          this.logSecurityEvent({
            type: 'suspicious_activity',
            severity: 'low',
            source: req.ip,
            description: 'Slow request detected',
            metadata: {
              path: req.path,
              method: req.method,
              duration,
              statusCode: res.statusCode
            }
          });
        }

        // Log failed requests
        if (res.statusCode >= 400) {
          const severity = res.statusCode >= 500 ? 'high' : 
                          res.statusCode === 429 ? 'medium' : 'low';
          
          this.logSecurityEvent({
            type: 'suspicious_activity',
            severity,
            source: req.ip,
            description: `HTTP ${res.statusCode} response`,
            metadata: {
              path: req.path,
              method: req.method,
              statusCode: res.statusCode,
              userAgent: req.headers['user-agent']
            }
          });
        }
      });

      next();
    };
  }

  // Private helper methods

  private getBruteForceKey(req: Request): string {
    const identifier = req.body?.email || req.body?.username || req.ip;
    return createHash('sha256').update(`${identifier}:${req.path}`).digest('hex');
  }

  private deepSanitize(obj: any): void {
    if (typeof obj !== 'object' || obj === null) return;

    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        obj[key] = validator.escape(obj[key]);
      } else if (typeof obj[key] === 'object') {
        this.deepSanitize(obj[key]);
      }
    }
  }

  private sanitizeObject(obj: any): void {
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        // XSS protection
        obj[key] = xss(obj[key], {
          whiteList: {}, // No HTML tags allowed
          stripIgnoreTag: true,
          stripIgnoreTagBody: ['script']
        });
        
        // Additional DOMPurify sanitization
        obj[key] = purify.sanitize(obj[key], { 
          ALLOWED_TAGS: [],
          ALLOWED_ATTR: []
        });
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        this.sanitizeObject(obj[key]);
      }
    }
  }

  private containsAttackPattern(input: string): boolean {
    const attackPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /\bselect\b.*\bfrom\b.*\bwhere\b/gi,
      /\bunion\b.*\bselect\b/gi,
      /\bdrop\b.*\btable\b/gi,
      /'.*--/gi,
      /\bor\b.*1=1/gi,
      /../gi // Path traversal
    ];

    return attackPatterns.some(pattern => pattern.test(input));
  }

  private logSecurityEvent(event: Partial<SecurityEvent>): void {
    const securityEvent: SecurityEvent = {
      id: 'event_' + randomBytes(8).toString('hex'),
      type: event.type!,
      severity: event.severity || 'low',
      source: event.source || 'system',
      target: event.target,
      description: event.description || '',
      metadata: event.metadata || {},
      timestamp: new Date(),
      resolved: false
    };

    this.securityEvents.push(securityEvent);
    
    // In production, this would be sent to a logging service
    console.log('[SECURITY EVENT]', {
      id: securityEvent.id,
      type: securityEvent.type,
      severity: securityEvent.severity,
      source: securityEvent.source,
      description: securityEvent.description,
      timestamp: securityEvent.timestamp
    });

    // Emit alert for high severity events
    if (securityEvent.severity === 'high' || securityEvent.severity === 'critical') {
      this.emitSecurityAlert(securityEvent);
    }
  }

  private emitSecurityAlert(event: SecurityEvent): void {
    // In production, this would integrate with alerting systems
    console.warn(`🚨 SECURITY ALERT: ${event.type} - ${event.description}`);
  }
}

/**
 * Factory function to create security middleware
 */
export function createSecurityMiddleware(config: SecurityConfig): SecurityMiddleware {
  return new SecurityMiddleware(config);
}

/**
 * Default security configuration
 */
export const defaultSecurityConfig: Partial<SecurityConfig> = {
  rateLimit: {
    windowMs: 15,
    max: 100,
    message: 'Too many requests, please try again later',
    statusCode: 429,
    skipSuccessfulRequests: true,
    skipFailedRequests: false,
    keyGenerator: (req: any) => req.ip,
    onLimitReached: () => {}
  },
  bruteForce: {
    freeRetries: 2,
    minWait: 5,
    maxWait: 60,
    lifetime: 3600
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
      reportUri: '/api/csp-report'
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  }
};

export default SecurityMiddleware;
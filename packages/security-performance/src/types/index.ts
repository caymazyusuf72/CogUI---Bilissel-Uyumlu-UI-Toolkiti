/**
 * CogUI Security & Performance Types
 * Comprehensive type definitions for security middleware, performance optimization and monitoring
 */

// Security Types
export interface SecurityConfig {
  authentication: AuthenticationConfig;
  authorization: AuthorizationConfig;
  rateLimit: RateLimitConfig;
  headers: SecurityHeadersConfig;
  csrf: CSRFConfig;
  bruteForce: BruteForceConfig;
  session: SessionConfig;
  twoFactor: TwoFactorConfig;
  encryption: EncryptionConfig;
}

export interface AuthenticationConfig {
  jwtSecret: string;
  jwtExpiresIn: string | number;
  refreshTokenExpiresIn: string | number;
  bcryptRounds: number;
  maxLoginAttempts: number;
  lockoutTime: number; // minutes
  sessionTimeout: number; // minutes
  passwordMinLength: number;
  passwordRequireSpecialChars: boolean;
  twoFactorAuth: boolean;
  oauth: OAuthConfig;
}

export interface OAuthConfig {
  google: OAuthProvider;
  github: OAuthProvider;
  microsoft: OAuthProvider;
}

export interface OAuthProvider {
  clientID: string;
  clientSecret: string;
  callbackURL: string;
  scope: string[];
}

export interface AuthorizationConfig {
  rbac: RBACConfig;
  permissions: PermissionConfig;
  roles: RoleConfig;
}

export interface RBACConfig {
  enabled: boolean;
  defaultRole: string;
  hierarchical: boolean;
  cacheExpiry: number;
}

export interface PermissionConfig {
  create: string[];
  read: string[];
  update: string[];
  delete: string[];
  admin: string[];
}

export interface RoleConfig {
  user: Permission[];
  moderator: Permission[];
  admin: Permission[];
  superAdmin: Permission[];
}

export type Permission = 
  | 'read:own'
  | 'read:any' 
  | 'create:own'
  | 'create:any'
  | 'update:own'
  | 'update:any'
  | 'delete:own'
  | 'delete:any'
  | 'admin:users'
  | 'admin:system'
  | 'admin:security';

export interface RateLimitConfig {
  windowMs: number; // minutes
  max: number; // requests per window
  message: string;
  statusCode: number;
  skipSuccessfulRequests: boolean;
  skipFailedRequests: boolean;
  keyGenerator: (req: any) => string;
  onLimitReached: (req: any, res: any, options: any) => void;
  store: 'memory' | 'redis';
}

export interface SecurityHeadersConfig {
  contentSecurityPolicy: CSPConfig;
  hsts: HSTSConfig;
  xssFilter: boolean;
  noSniff: boolean;
  frameguard: FrameguardConfig;
  referrerPolicy: ReferrerPolicyConfig;
  featurePolicy: FeaturePolicyConfig;
}

export interface CSPConfig {
  directives: {
    defaultSrc: string[];
    scriptSrc: string[];
    styleSrc: string[];
    imgSrc: string[];
    connectSrc: string[];
    fontSrc: string[];
    objectSrc: string[];
    mediaSrc: string[];
    frameSrc: string[];
    childSrc: string[];
    workerSrc: string[];
    manifestSrc: string[];
    upgradeInsecureRequests: boolean;
  };
  reportOnly: boolean;
  reportUri: string;
}

export interface HSTSConfig {
  maxAge: number; // seconds
  includeSubDomains: boolean;
  preload: boolean;
}

export interface FrameguardConfig {
  action: 'deny' | 'sameorigin' | 'allow-from';
  domain?: string;
}

export interface ReferrerPolicyConfig {
  policy: 
    | 'no-referrer'
    | 'no-referrer-when-downgrade'
    | 'origin'
    | 'origin-when-cross-origin'
    | 'same-origin'
    | 'strict-origin'
    | 'strict-origin-when-cross-origin'
    | 'unsafe-url';
}

export interface FeaturePolicyConfig {
  features: {
    accelerometer: string[];
    camera: string[];
    geolocation: string[];
    gyroscope: string[];
    magnetometer: string[];
    microphone: string[];
    payment: string[];
    usb: string[];
  };
}

export interface CSRFConfig {
  cookie: {
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'strict' | 'lax' | 'none';
    maxAge: number;
  };
  ignoreMethods: string[];
  value: (req: any) => string;
}

export interface BruteForceConfig {
  freeRetries: number;
  minWait: number; // seconds
  maxWait: number; // seconds
  lifetime: number; // seconds
  failCallback?: (req: any, res: any, next: any, nextValidRequestDate: Date) => void;
}

export interface SessionConfig {
  secret: string;
  resave: boolean;
  saveUninitialized: boolean;
  cookie: {
    secure: boolean;
    httpOnly: boolean;
    maxAge: number;
    sameSite: 'strict' | 'lax' | 'none';
  };
  store: 'memory' | 'redis';
  name: string;
}

export interface TwoFactorConfig {
  enabled: boolean;
  issuer: string;
  window: number;
  encoding: 'base32' | 'base64';
  algorithm: 'sha1' | 'sha256' | 'sha512';
  digits: number;
  step: number;
}

export interface EncryptionConfig {
  algorithm: string;
  keyLength: number;
  ivLength: number;
  tagLength: number;
  iterations: number;
}

// Performance Types
export interface PerformanceConfig {
  caching: CachingConfig;
  compression: CompressionConfig;
  optimization: OptimizationConfig;
  monitoring: MonitoringConfig;
  cdn: CDNConfig;
}

export interface CachingConfig {
  redis: RedisCacheConfig;
  memory: MemoryCacheConfig;
  http: HttpCacheConfig;
  database: DatabaseCacheConfig;
}

export interface RedisCacheConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  ttl: number; // seconds
  maxMemory: string;
  evictionPolicy: 'allkeys-lru' | 'allkeys-lfu' | 'volatile-lru' | 'volatile-lfu';
  keyPrefix: string;
}

export interface MemoryCacheConfig {
  max: number; // number of items
  maxAge: number; // seconds
  updateAgeOnGet: boolean;
  updateAgeOnHas: boolean;
}

export interface HttpCacheConfig {
  maxAge: number; // seconds
  sMaxAge: number; // seconds
  mustRevalidate: boolean;
  noCache: boolean;
  noStore: boolean;
  private: boolean;
  public: boolean;
  etag: boolean;
  lastModified: boolean;
}

export interface DatabaseCacheConfig {
  queryCache: boolean;
  resultCache: boolean;
  connectionPooling: boolean;
  indexOptimization: boolean;
}

export interface CompressionConfig {
  algorithm: 'gzip' | 'deflate' | 'br' | 'identity';
  level: number; // 1-9 for gzip, 0-11 for brotli
  threshold: number; // bytes
  filter: (req: any, res: any) => boolean;
  chunkSize: number;
  windowBits: number;
  memLevel: number;
}

export interface OptimizationConfig {
  imageOptimization: ImageOptimizationConfig;
  cssMinification: CSSMinificationConfig;
  jsMinification: JSMinificationConfig;
  htmlMinification: HTMLMinificationConfig;
  bundleOptimization: BundleOptimizationConfig;
}

export interface ImageOptimizationConfig {
  enabled: boolean;
  formats: ('webp' | 'avif' | 'jpeg' | 'png')[];
  quality: number; // 0-100
  progressive: boolean;
  lossless: boolean;
  stripMetadata: boolean;
  autoResize: boolean;
  maxWidth: number;
  maxHeight: number;
}

export interface CSSMinificationConfig {
  enabled: boolean;
  level: 0 | 1 | 2;
  removeComments: boolean;
  removeWhitespace: boolean;
  mergeLonghand: boolean;
  mergeRules: boolean;
  removeDuplicates: boolean;
}

export interface JSMinificationConfig {
  enabled: boolean;
  mangle: boolean;
  compress: boolean;
  removeComments: boolean;
  removeDeadCode: boolean;
  sourceMap: boolean;
  ecma: 5 | 2015 | 2016 | 2017 | 2018 | 2019 | 2020;
}

export interface HTMLMinificationConfig {
  enabled: boolean;
  collapseWhitespace: boolean;
  removeComments: boolean;
  removeEmptyAttributes: boolean;
  removeRedundantAttributes: boolean;
  removeScriptTypeAttributes: boolean;
  removeStyleLinkTypeAttributes: boolean;
  minifyCSS: boolean;
  minifyJS: boolean;
}

export interface BundleOptimizationConfig {
  codesplitting: boolean;
  treeshaking: boolean;
  lazyLoading: boolean;
  preloading: boolean;
  prefetching: boolean;
  compression: boolean;
}

export interface MonitoringConfig {
  metricsCollection: boolean;
  performanceTracking: PerformanceTrackingConfig;
  securityAudit: SecurityAuditConfig;
  errorTracking: ErrorTrackingConfig;
  logging: LoggingConfig;
}

export interface PerformanceTrackingConfig {
  responseTime: boolean;
  memoryUsage: boolean;
  cpuUsage: boolean;
  diskIO: boolean;
  networkIO: boolean;
  databaseQueries: boolean;
  cacheHitRatio: boolean;
  errorRate: boolean;
  throughput: boolean;
}

export interface SecurityAuditConfig {
  vulnerabilityScanning: boolean;
  dependencyChecking: boolean;
  codeAnalysis: boolean;
  accessLogging: boolean;
  failedLoginTracking: boolean;
  suspiciousActivityDetection: boolean;
  ipWhitelisting: boolean;
  ipBlacklisting: boolean;
}

export interface ErrorTrackingConfig {
  enabled: boolean;
  captureUncaughtExceptions: boolean;
  captureUnhandledRejections: boolean;
  stackTrace: boolean;
  breadcrumbs: boolean;
  userContext: boolean;
  fingerprinting: boolean;
  sampling: number; // 0-1
}

export interface LoggingConfig {
  level: 'error' | 'warn' | 'info' | 'verbose' | 'debug' | 'silly';
  transports: LogTransport[];
  format: 'json' | 'simple' | 'combined';
  rotation: LogRotationConfig;
  encryption: boolean;
}

export interface LogTransport {
  type: 'console' | 'file' | 'elasticsearch' | 'mongodb' | 'redis';
  level: string;
  filename?: string;
  maxSize?: string;
  maxFiles?: number;
  host?: string;
  port?: number;
  index?: string;
}

export interface LogRotationConfig {
  enabled: boolean;
  maxSize: string;
  maxFiles: number;
  datePattern: string;
  compress: boolean;
}

export interface CDNConfig {
  enabled: boolean;
  provider: 'cloudflare' | 'aws' | 'azure' | 'gcp' | 'custom';
  endpoint: string;
  apiKey: string;
  zones: CDNZone[];
  caching: CDNCachingConfig;
}

export interface CDNZone {
  name: string;
  id: string;
  domain: string;
  ssl: boolean;
  compression: boolean;
  minification: boolean;
}

export interface CDNCachingConfig {
  browserTTL: number;
  edgeTTL: number;
  alwaysOnline: boolean;
  developmentMode: boolean;
}

// User and Authentication Types
export interface User {
  id: string;
  username: string;
  email: string;
  password?: string;
  role: string;
  permissions: Permission[];
  isActive: boolean;
  isVerified: boolean;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  lastLogin?: Date;
  loginAttempts: number;
  lockUntil?: Date;
  refreshTokens: string[];
  cognitiveProfile?: CognitiveProfile;
  accessibilitySettings?: AccessibilitySettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface CognitiveProfile {
  attentionSpan: number;
  processingSpeed: number;
  memoryCapacity: number;
  cognitiveLoad: number;
  adaptationPreferences: AdaptationPreference[];
}

export interface AdaptationPreference {
  trigger: string;
  adaptation: string;
  threshold: number;
  enabled: boolean;
}

export interface AccessibilitySettings {
  highContrast: boolean;
  largeText: boolean;
  reducedMotion: boolean;
  screenReader: boolean;
  colorBlindness: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';
  dyslexiaSupport: boolean;
}

export interface AuthToken {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  scope: string[];
  userId: string;
}

export interface SecurityEvent {
  id: string;
  type: SecurityEventType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: string;
  target?: string;
  description: string;
  metadata: Record<string, any>;
  timestamp: Date;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: Date;
}

export type SecurityEventType =
  | 'failed_login'
  | 'successful_login'
  | 'account_locked'
  | 'password_changed'
  | 'permission_denied'
  | 'suspicious_activity'
  | 'brute_force_attempt'
  | 'rate_limit_exceeded'
  | 'csrf_attack'
  | 'xss_attempt'
  | 'sql_injection_attempt'
  | 'privilege_escalation'
  | 'data_breach'
  | 'vulnerability_detected'
  | 'security_scan_completed';

export interface PerformanceMetrics {
  timestamp: Date;
  responseTime: number;
  memoryUsage: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
    arrayBuffers: number;
  };
  cpuUsage: {
    user: number;
    system: number;
  };
  requests: {
    total: number;
    successful: number;
    failed: number;
    rate: number;
  };
  database: {
    connections: number;
    queries: number;
    queryTime: number;
  };
  cache: {
    hits: number;
    misses: number;
    hitRatio: number;
  };
  errors: {
    count: number;
    rate: number;
    types: Record<string, number>;
  };
}

// Middleware Types
export interface SecurityMiddleware {
  helmet: any;
  rateLimit: any;
  csrf: any;
  bruteForce: any;
  authentication: any;
  authorization: any;
  validation: any;
  sanitization: any;
}

export interface PerformanceMiddleware {
  compression: any;
  caching: any;
  optimization: any;
  monitoring: any;
}

// Request/Response Extensions
export interface SecureRequest extends Request {
  user?: User;
  session?: any;
  csrfToken?: () => string;
  rateLimit?: {
    limit: number;
    current: number;
    remaining: number;
    resetTime: Date;
  };
  bruteForce?: {
    retries: number;
    nextValidRequestDate?: Date;
  };
}

export interface SecureResponse extends Response {
  security?: {
    headers: Record<string, string>;
    events: SecurityEvent[];
  };
  performance?: {
    startTime: number;
    metrics: Partial<PerformanceMetrics>;
  };
}
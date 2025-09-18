import { config as dotenvConfig } from 'dotenv';
import path from 'path';

// Load environment variables
dotenvConfig({ path: path.resolve(__dirname, '../../.env') });

/**
 * Application Configuration
 * Centralized configuration management for CogUI Backend
 */
export const config = {
  // Server Configuration
  env: process.env.NODE_ENV || 'development',
  host: process.env.HOST || 'localhost',
  port: parseInt(process.env.PORT || '3001', 10),
  
  // API Configuration
  apiVersion: process.env.API_VERSION || 'v1',
  apiPrefix: process.env.API_PREFIX || '/api',
  
  // CORS Configuration
  cors: {
    origin: process.env.CORS_ORIGIN ? 
      process.env.CORS_ORIGIN.split(',').map(origin => origin.trim()) : 
      ['http://localhost:3000', 'http://localhost:3001'],
    credentials: process.env.CORS_CREDENTIALS === 'true',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'X-API-Key',
      'X-Client-Version'
    ]
  },

  // Database Configuration
  database: {
    mongodb: {
      uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/cogui',
      options: {
        maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE || '10', 10),
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        family: 4
      }
    },
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0', 10),
      keyPrefix: process.env.REDIS_KEY_PREFIX || 'cogui:',
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    }
  },

  // Authentication & Security
  auth: {
    jwt: {
      secret: process.env.JWT_SECRET || 'cogui-jwt-secret-change-in-production',
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      issuer: process.env.JWT_ISSUER || 'cogui-backend',
      audience: process.env.JWT_AUDIENCE || 'cogui-frontend'
    },
    bcrypt: {
      saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10)
    },
    session: {
      secret: process.env.SESSION_SECRET || 'cogui-session-secret-change-in-production',
      maxAge: parseInt(process.env.SESSION_MAX_AGE || '86400000', 10), // 24 hours
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'strict' as const
    },
    apiKey: {
      headerName: 'X-API-Key',
      adminKey: process.env.ADMIN_API_KEY || 'admin-key-change-in-production'
    }
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10), // limit each IP to 100 requests per windowMs
    message: {
      error: 'Too many requests from this IP, please try again later',
      retryAfter: 'Retry-After header indicates when you can make another request'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  },

  // File Upload
  upload: {
    maxFileSize: process.env.MAX_FILE_SIZE || '10MB',
    maxFiles: parseInt(process.env.MAX_FILES || '5', 10),
    allowedMimeTypes: [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/csv',
      'application/json',
      'text/plain'
    ],
    uploadPath: process.env.UPLOAD_PATH || path.join(__dirname, '../../uploads'),
    tempPath: process.env.TEMP_PATH || path.join(__dirname, '../../temp')
  },

  // WebSocket Configuration
  websocket: {
    path: '/socket.io',
    pingTimeout: parseInt(process.env.WS_PING_TIMEOUT || '60000', 10),
    pingInterval: parseInt(process.env.WS_PING_INTERVAL || '25000', 10),
    maxHttpBufferSize: parseInt(process.env.WS_MAX_BUFFER_SIZE || '1000000', 10), // 1MB
    transports: ['websocket', 'polling'],
    allowEIO3: true,
    cors: {
      origin: process.env.CORS_ORIGIN ? 
        process.env.CORS_ORIGIN.split(',').map(origin => origin.trim()) : 
        ['http://localhost:3000'],
      methods: ['GET', 'POST'],
      credentials: true
    }
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    format: process.env.LOG_FORMAT || 'combined',
    file: {
      enabled: process.env.LOG_FILE_ENABLED === 'true',
      filename: process.env.LOG_FILENAME || 'cogui-backend.log',
      maxSize: process.env.LOG_MAX_SIZE || '20MB',
      maxFiles: parseInt(process.env.LOG_MAX_FILES || '14', 10)
    },
    console: {
      enabled: process.env.LOG_CONSOLE_ENABLED !== 'false',
      colorize: process.env.NODE_ENV !== 'production'
    }
  },

  // Email Configuration
  email: {
    smtp: {
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    },
    from: {
      name: process.env.FROM_NAME || 'CogUI System',
      address: process.env.FROM_EMAIL || 'noreply@cogui.com'
    },
    templates: {
      path: process.env.EMAIL_TEMPLATES_PATH || path.join(__dirname, '../templates/email')
    }
  },

  // Analytics & Monitoring
  analytics: {
    enabled: process.env.ANALYTICS_ENABLED === 'true',
    retentionDays: parseInt(process.env.ANALYTICS_RETENTION_DAYS || '90', 10),
    aggregationInterval: parseInt(process.env.ANALYTICS_AGGREGATION_INTERVAL || '300000', 10), // 5 minutes
    maxEventsPerUser: parseInt(process.env.ANALYTICS_MAX_EVENTS_PER_USER || '10000', 10)
  },

  // Cache Configuration
  cache: {
    ttl: parseInt(process.env.CACHE_TTL || '3600', 10), // 1 hour in seconds
    maxKeys: parseInt(process.env.CACHE_MAX_KEYS || '1000', 10),
    checkPeriod: parseInt(process.env.CACHE_CHECK_PERIOD || '600', 10) // 10 minutes
  },

  // Health Check
  health: {
    timeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT || '5000', 10),
    interval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000', 10), // 30 seconds
    retries: parseInt(process.env.HEALTH_CHECK_RETRIES || '3', 10)
  },

  // Feature Flags
  features: {
    userRegistration: process.env.FEATURE_USER_REGISTRATION !== 'false',
    emailVerification: process.env.FEATURE_EMAIL_VERIFICATION === 'true',
    socialLogin: process.env.FEATURE_SOCIAL_LOGIN === 'true',
    fileUpload: process.env.FEATURE_FILE_UPLOAD !== 'false',
    realTimeAnalytics: process.env.FEATURE_REALTIME_ANALYTICS !== 'false',
    aiRecommendations: process.env.FEATURE_AI_RECOMMENDATIONS === 'true',
    exportData: process.env.FEATURE_EXPORT_DATA !== 'false',
    apiDocumentation: process.env.FEATURE_API_DOCS !== 'false'
  },

  // External Services
  external: {
    cognitiveService: {
      enabled: process.env.COGNITIVE_SERVICE_ENABLED === 'true',
      endpoint: process.env.COGNITIVE_SERVICE_ENDPOINT,
      apiKey: process.env.COGNITIVE_SERVICE_API_KEY,
      timeout: parseInt(process.env.COGNITIVE_SERVICE_TIMEOUT || '30000', 10)
    },
    openai: {
      enabled: process.env.OPENAI_ENABLED === 'true',
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '1000', 10)
    }
  }
};

/**
 * Validate required configuration
 */
export function validateConfig(): void {
  const required = [
    'JWT_SECRET',
    'SESSION_SECRET'
  ];

  if (config.env === 'production') {
    required.push(
      'MONGODB_URI',
      'REDIS_HOST',
      'ADMIN_API_KEY'
    );
  }

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

/**
 * Get configuration for specific environment
 */
export function getConfig(environment?: string): typeof config {
  return config;
}

/**
 * Check if feature is enabled
 */
export function isFeatureEnabled(feature: keyof typeof config.features): boolean {
  return config.features[feature];
}

export default config;
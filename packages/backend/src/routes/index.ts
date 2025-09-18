import { Application, Router } from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { Logger } from '@/utils/logger';
import { config } from '@/config';

// Route Modules
import authRoutes from './auth';
import userRoutes from './user';
import preferencesRoutes from './preferences';
import analyticsRoutes from './analytics';
import systemRoutes from './system';
import uploadRoutes from './upload';

/**
 * API Routes Setup
 * Centralized route management for CogUI Backend API
 */
export function setupRoutes(app: Application, io: SocketIOServer, logger: Logger): void {
  const apiRouter = Router();

  // API versioning
  const API_PREFIX = `${config.apiPrefix}/${config.apiVersion}`;

  // Health check (outside versioned API)
  app.get(`${config.apiPrefix}/health`, (req, res) => {
    res.status(200).json({
      status: 'OK',
      service: 'CogUI Backend API',
      version: config.apiVersion,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: config.env
    });
  });

  // API Documentation endpoint
  if (config.features.apiDocumentation) {
    app.get(`${config.apiPrefix}/docs`, (req, res) => {
      res.status(200).json({
        title: 'CogUI Backend API Documentation',
        version: config.apiVersion,
        description: 'RESTful API for Cognitive-Adaptive User Interface Platform',
        baseUrl: `${req.protocol}://${req.get('host')}${API_PREFIX}`,
        websocketUrl: `ws://${req.get('host')}/socket.io`,
        endpoints: {
          authentication: {
            'POST /auth/login': 'Authenticate user and get JWT token',
            'POST /auth/logout': 'Logout user and invalidate token',
            'POST /auth/refresh': 'Refresh JWT token',
            'POST /auth/register': 'Register new user account',
            'POST /auth/forgot-password': 'Request password reset',
            'POST /auth/reset-password': 'Reset password with token'
          },
          users: {
            'GET /user/profile': 'Get current user profile',
            'PUT /user/profile': 'Update user profile',
            'DELETE /user/profile': 'Delete user account',
            'GET /user/sessions': 'Get active user sessions',
            'DELETE /user/sessions/:sessionId': 'Revoke specific session'
          },
          preferences: {
            'GET /preferences': 'Get user preferences',
            'PUT /preferences': 'Update user preferences',
            'DELETE /preferences': 'Reset preferences to default',
            'GET /preferences/themes': 'Get available themes',
            'PUT /preferences/theme': 'Update user theme',
            'GET /preferences/accessibility': 'Get accessibility settings',
            'PUT /preferences/accessibility': 'Update accessibility settings'
          },
          analytics: {
            'POST /analytics/events': 'Submit analytics events',
            'GET /analytics/dashboard': 'Get dashboard analytics',
            'GET /analytics/user-behavior': 'Get user behavior insights',
            'GET /analytics/performance': 'Get performance metrics',
            'POST /analytics/export': 'Export analytics data'
          },
          system: {
            'GET /system/status': 'Get system status and metrics',
            'GET /system/config': 'Get public configuration',
            'POST /system/feedback': 'Submit user feedback',
            'GET /system/changelog': 'Get system changelog'
          },
          uploads: {
            'POST /upload/image': 'Upload image file',
            'POST /upload/document': 'Upload document file',
            'GET /upload/:fileId': 'Get uploaded file',
            'DELETE /upload/:fileId': 'Delete uploaded file'
          }
        },
        websocketEvents: {
          connection: [
            'connect - Client connects to server',
            'disconnect - Client disconnects from server',
            'authenticate - Authenticate WebSocket connection'
          ],
          preferences: [
            'preferences:update - Update user preferences in real-time',
            'preferences:changed - Notify preference changes',
            'theme:update - Update theme settings',
            'accessibility:update - Update accessibility settings'
          ],
          analytics: [
            'analytics:event - Send analytics event',
            'analytics:batch - Send batch of analytics events',
            'user:behavior - Send user behavior data'
          ],
          adaptiveUI: [
            'ui:adaptation - Request UI adaptation',
            'sensor:data - Send sensor data',
            'cognitive:load - Send cognitive load data',
            'attention:state - Send attention state data'
          ]
        },
        authentication: {
          type: 'JWT (JSON Web Token)',
          header: 'Authorization: Bearer <token>',
          expiration: config.auth.jwt.expiresIn
        },
        rateLimit: {
          windowMs: config.rateLimit.windowMs,
          max: config.rateLimit.max,
          message: config.rateLimit.message.error
        },
        cors: {
          origins: config.cors.origin,
          methods: config.cors.methods,
          credentials: config.cors.credentials
        }
      });
    });
  }

  // Route-specific middleware for API routes
  apiRouter.use((req, res, next) => {
    // Add request ID for tracing
    req.id = require('uuid').v4();
    
    // Add timing
    req.startTime = Date.now();
    
    // Log API requests
    logger.info(`${req.method} ${req.originalUrl}`, {
      requestId: req.id,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      timestamp: new Date().toISOString()
    });
    
    next();
  });

  // Response time middleware
  apiRouter.use((req, res, next) => {
    res.on('finish', () => {
      const responseTime = Date.now() - req.startTime;
      logger.info(`Request completed`, {
        requestId: req.id,
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        responseTime: `${responseTime}ms`
      });
    });
    next();
  });

  // Mount route modules
  apiRouter.use('/auth', authRoutes(io, logger));
  apiRouter.use('/user', userRoutes(io, logger));
  apiRouter.use('/preferences', preferencesRoutes(io, logger));
  apiRouter.use('/analytics', analyticsRoutes(io, logger));
  apiRouter.use('/system', systemRoutes(io, logger));
  
  if (config.features.fileUpload) {
    apiRouter.use('/upload', uploadRoutes(io, logger));
  }

  // Mount API router
  app.use(API_PREFIX, apiRouter);

  // API root endpoint
  app.get(config.apiPrefix, (req, res) => {
    res.status(200).json({
      name: 'CogUI Backend API',
      version: config.apiVersion,
      description: 'Cognitive-Adaptive User Interface Platform API',
      documentation: `${config.apiPrefix}/docs`,
      health: `${config.apiPrefix}/health`,
      baseUrl: `${req.protocol}://${req.get('host')}${API_PREFIX}`,
      websocket: `ws://${req.get('host')}/socket.io`,
      features: Object.keys(config.features).filter(key => 
        config.features[key as keyof typeof config.features]
      ),
      endpoints: {
        auth: `${API_PREFIX}/auth`,
        user: `${API_PREFIX}/user`,
        preferences: `${API_PREFIX}/preferences`,
        analytics: `${API_PREFIX}/analytics`,
        system: `${API_PREFIX}/system`,
        ...(config.features.fileUpload && { upload: `${API_PREFIX}/upload` })
      }
    });
  });

  logger.info(`API routes setup completed: ${API_PREFIX}`);
}

/**
 * Route Handler Factory
 * Creates standardized route handlers with common functionality
 */
export class RouteHandlerFactory {
  constructor(
    private io: SocketIOServer,
    private logger: Logger
  ) {}

  /**
   * Create async route handler with error handling
   */
  public asyncHandler(handler: (req: any, res: any, next: any) => Promise<any>) {
    return (req: any, res: any, next: any) => {
      Promise.resolve(handler(req, res, next)).catch(next);
    };
  }

  /**
   * Create WebSocket notification helper
   */
  public notifyWebSocket(event: string, data: any, target?: string) {
    if (target) {
      this.io.to(target).emit(event, data);
    } else {
      this.io.emit(event, data);
    }
  }

  /**
   * Create standardized success response
   */
  public successResponse(res: any, data: any, message?: string, statusCode: number = 200) {
    return res.status(statusCode).json({
      success: true,
      message: message || 'Operation completed successfully',
      data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Create standardized error response
   */
  public errorResponse(res: any, error: any, statusCode: number = 500) {
    const message = error.message || 'Internal server error';
    
    this.logger.error('API Error:', {
      error: error.stack || error,
      statusCode,
      timestamp: new Date().toISOString()
    });

    return res.status(statusCode).json({
      success: false,
      error: message,
      ...(config.env === 'development' && { stack: error.stack }),
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Create validation middleware
   */
  public validateRequest(schema: any) {
    return (req: any, res: any, next: any) => {
      const { error } = schema.validate(req.body);
      if (error) {
        return this.errorResponse(res, { message: error.details[0].message }, 400);
      }
      next();
    };
  }

  /**
   * Create pagination helper
   */
  public getPagination(req: any) {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    return { page, limit, skip };
  }

  /**
   * Create sorting helper
   */
  public getSorting(req: any, defaultSort: string = 'createdAt') {
    const sortBy = req.query.sortBy || defaultSort;
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    
    return { [sortBy]: sortOrder };
  }
}

export default setupRoutes;
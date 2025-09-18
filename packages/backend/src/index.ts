import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { Server as SocketIOServer } from 'socket.io';
import { config } from '@/config';
import { setupRoutes } from '@/routes';
import { setupWebSocket } from '@/websocket';
import { errorHandler } from '@/middleware/errorHandler';
import { rateLimiter } from '@/middleware/rateLimiter';
import { authMiddleware } from '@/middleware/auth';
import { DatabaseService } from '@/services/DatabaseService';
import { RedisService } from '@/services/RedisService';
import { Logger } from '@/utils/logger';

/**
 * CogUI Backend Server
 * Enterprise-grade Node.js API with WebSocket support
 */
class CogUIServer {
  private app: express.Application;
  private server: http.Server;
  private io: SocketIOServer;
  private logger: Logger;

  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.logger = new Logger('CogUIServer');
    this.setupSocketIO();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  /**
   * Socket.IO server kurulumu
   */
  private setupSocketIO(): void {
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: config.cors.origin,
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000,
      maxHttpBufferSize: 1e6, // 1MB
      allowEIO3: true
    });

    setupWebSocket(this.io, this.logger);
  }

  /**
   * Express middleware kurulumu
   */
  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "ws:", "wss:"]
        }
      }
    }));

    // CORS
    this.app.use(cors({
      origin: config.cors.origin,
      credentials: config.cors.credentials,
      optionsSuccessStatus: 200
    }));

    // Compression
    this.app.use(compression({
      filter: (req, res) => {
        if (req.headers['x-no-compression']) {
          return false;
        }
        return compression.filter(req, res);
      },
      level: 6,
      threshold: 1024
    }));

    // Logging
    if (config.env !== 'test') {
      this.app.use(morgan(config.env === 'production' ? 'combined' : 'dev'));
    }

    // Body parsing
    this.app.use(express.json({ 
      limit: config.upload.maxFileSize,
      verify: (req, res, buf) => {
        // Raw body için
        (req as any).rawBody = buf;
      }
    }));
    this.app.use(express.urlencoded({ 
      extended: true, 
      limit: config.upload.maxFileSize 
    }));

    // Rate limiting
    this.app.use(rateLimiter);

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        environment: config.env,
        uptime: process.uptime(),
        memory: process.memoryUsage()
      });
    });

    // API info endpoint
    this.app.get('/api', (req, res) => {
      res.status(200).json({
        name: 'CogUI Backend API',
        version: '1.0.0',
        description: 'Cognitive-adaptive UI backend services',
        documentation: '/api/docs',
        websocket: '/socket.io',
        endpoints: [
          'GET /health - Health check',
          'GET /api - API information',
          'POST /api/auth/login - User authentication',
          'GET /api/user/profile - User profile',
          'POST /api/preferences - Save user preferences',
          'GET /api/analytics - Analytics data',
          'WebSocket /socket.io - Real-time communication'
        ]
      });
    });
  }

  /**
   * API routes kurulumu
   */
  private setupRoutes(): void {
    setupRoutes(this.app, this.io, this.logger);
  }

  /**
   * Error handling kurulumu
   */
  private setupErrorHandling(): void {
    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Route not found',
        message: `${req.method} ${req.originalUrl} not found`,
        timestamp: new Date().toISOString()
      });
    });

    // Global error handler
    this.app.use(errorHandler);

    // Unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      this.logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });

    // Uncaught exceptions
    process.on('uncaughtException', (error) => {
      this.logger.error('Uncaught Exception:', error);
      process.exit(1);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => this.gracefulShutdown());
    process.on('SIGINT', () => this.gracefulShutdown());
  }

  /**
   * Database bağlantıları kurulumu
   */
  private async setupDatabases(): Promise<void> {
    try {
      // MongoDB bağlantısı
      await DatabaseService.connect();
      this.logger.info('MongoDB connected successfully');

      // Redis bağlantısı
      await RedisService.connect();
      this.logger.info('Redis connected successfully');

    } catch (error) {
      this.logger.error('Database connection failed:', error);
      throw error;
    }
  }

  /**
   * Server başlatma
   */
  public async start(): Promise<void> {
    try {
      // Database bağlantıları
      await this.setupDatabases();

      // Server dinleme
      this.server.listen(config.port, config.host, () => {
        this.logger.info(`🚀 CogUI Backend Server started`);
        this.logger.info(`📍 Host: ${config.host}:${config.port}`);
        this.logger.info(`🌐 Environment: ${config.env}`);
        this.logger.info(`📊 WebSocket: ws://${config.host}:${config.port}/socket.io`);
        this.logger.info(`🔗 API Docs: http://${config.host}:${config.port}/api`);
        
        if (config.env === 'development') {
          this.logger.info(`🔍 Health Check: http://${config.host}:${config.port}/health`);
        }
      });

      // Server error handling
      this.server.on('error', (error: NodeJS.ErrnoException) => {
        if (error.syscall !== 'listen') {
          throw error;
        }

        switch (error.code) {
          case 'EACCES':
            this.logger.error(`Port ${config.port} requires elevated privileges`);
            process.exit(1);
            break;
          case 'EADDRINUSE':
            this.logger.error(`Port ${config.port} is already in use`);
            process.exit(1);
            break;
          default:
            throw error;
        }
      });

    } catch (error) {
      this.logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  /**
   * Graceful shutdown
   */
  private async gracefulShutdown(): Promise<void> {
    this.logger.info('🔄 Graceful shutdown initiated...');

    // Server'ı kapat
    this.server.close(async () => {
      this.logger.info('📴 HTTP server closed');

      try {
        // WebSocket bağlantılarını kapat
        this.io.close();
        this.logger.info('🔌 WebSocket server closed');

        // Database bağlantılarını kapat
        await DatabaseService.disconnect();
        await RedisService.disconnect();
        this.logger.info('💾 Database connections closed');

        this.logger.info('✅ Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        this.logger.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
      this.logger.error('⏰ Force shutdown after 30s timeout');
      process.exit(1);
    }, 30000);
  }

  /**
   * Socket.IO instance'ını al
   */
  public getSocketIO(): SocketIOServer {
    return this.io;
  }

  /**
   * Express app instance'ını al
   */
  public getApp(): express.Application {
    return this.app;
  }
}

// Server instance oluştur ve başlat
const server = new CogUIServer();

// Eğer bu dosya direkt çalıştırılıyorsa server'ı başlat
if (require.main === module) {
  server.start().catch((error) => {
    console.error('Failed to start CogUI Backend Server:', error);
    process.exit(1);
  });
}

export { server as CogUIServer };
export default server;
import { Server as SocketIOServer, Socket } from 'socket.io';
import { Logger } from '@/utils/logger';
import { config } from '@/config';
import { authWebSocketMiddleware } from '@/middleware/auth';
import { UserPreferencesHandler } from './handlers/UserPreferencesHandler';
import { AnalyticsHandler } from './handlers/AnalyticsHandler';
import { AdaptiveUIHandler } from './handlers/AdaptiveUIHandler';
import { SystemMonitoringHandler } from './handlers/SystemMonitoringHandler';

/**
 * WebSocket Event Types
 */
export enum WebSocketEvents {
  // Connection Events
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  ERROR = 'error',
  
  // Authentication Events
  AUTHENTICATE = 'authenticate',
  AUTHENTICATED = 'authenticated',
  UNAUTHENTICATED = 'unauthenticated',
  
  // User Preferences Events
  PREFERENCES_UPDATE = 'preferences:update',
  PREFERENCES_GET = 'preferences:get',
  PREFERENCES_CHANGED = 'preferences:changed',
  THEME_UPDATE = 'theme:update',
  ACCESSIBILITY_UPDATE = 'accessibility:update',
  
  // Analytics Events
  ANALYTICS_EVENT = 'analytics:event',
  ANALYTICS_BATCH = 'analytics:batch',
  USER_BEHAVIOR = 'user:behavior',
  INTERACTION_DATA = 'interaction:data',
  
  // Adaptive UI Events
  UI_ADAPTATION = 'ui:adaptation',
  SENSOR_DATA = 'sensor:data',
  COGNITIVE_LOAD = 'cognitive:load',
  ATTENTION_STATE = 'attention:state',
  
  // Real-time Updates
  REALTIME_UPDATE = 'realtime:update',
  BROADCAST = 'broadcast',
  NOTIFICATION = 'notification',
  
  // System Events
  SYSTEM_STATUS = 'system:status',
  PERFORMANCE_METRICS = 'performance:metrics',
  HEALTH_CHECK = 'health:check'
}

/**
 * WebSocket Connection Manager
 */
class WebSocketManager {
  private io: SocketIOServer;
  private logger: Logger;
  private connectedClients: Map<string, Socket> = new Map();
  private userSessions: Map<string, Set<string>> = new Map(); // userId -> Set of socketIds
  
  constructor(io: SocketIOServer, logger: Logger) {
    this.io = io;
    this.logger = logger;
  }

  /**
   * Setup WebSocket server
   */
  public setup(): void {
    this.setupMiddleware();
    this.setupConnectionHandling();
    this.setupRooms();
    this.startHealthCheck();
  }

  /**
   * Setup middleware
   */
  private setupMiddleware(): void {
    // Authentication middleware
    this.io.use(authWebSocketMiddleware);
    
    // Rate limiting middleware
    this.io.use((socket, next) => {
      const clientIP = socket.handshake.address;
      // Implement rate limiting logic here
      next();
    });

    // Logging middleware
    this.io.use((socket, next) => {
      this.logger.debug(`WebSocket connection attempt from ${socket.handshake.address}`);
      next();
    });
  }

  /**
   * Setup connection handling
   */
  private setupConnectionHandling(): void {
    this.io.on(WebSocketEvents.CONNECT, (socket: Socket) => {
      this.handleConnection(socket);
    });
  }

  /**
   * Handle new connection
   */
  private handleConnection(socket: Socket): void {
    const { userId, sessionId } = socket.data;
    
    this.logger.info(`WebSocket client connected: ${socket.id}, User: ${userId || 'anonymous'}`);
    
    // Store connection
    this.connectedClients.set(socket.id, socket);
    
    // Associate with user session
    if (userId) {
      if (!this.userSessions.has(userId)) {
        this.userSessions.set(userId, new Set());
      }
      this.userSessions.get(userId)!.add(socket.id);
    }

    // Join rooms
    this.joinUserRooms(socket, userId);

    // Setup event handlers
    this.setupEventHandlers(socket);

    // Send initial data
    this.sendInitialData(socket, userId);

    // Handle disconnection
    socket.on(WebSocketEvents.DISCONNECT, (reason) => {
      this.handleDisconnection(socket, reason);
    });

    // Handle errors
    socket.on(WebSocketEvents.ERROR, (error) => {
      this.logger.error(`WebSocket error for client ${socket.id}:`, error);
    });
  }

  /**
   * Setup event handlers for socket
   */
  private setupEventHandlers(socket: Socket): void {
    // User Preferences Handler
    const preferencesHandler = new UserPreferencesHandler(socket, this.logger);
    preferencesHandler.setup();

    // Analytics Handler
    const analyticsHandler = new AnalyticsHandler(socket, this.logger);
    analyticsHandler.setup();

    // Adaptive UI Handler
    const adaptiveUIHandler = new AdaptiveUIHandler(socket, this.logger, this.io);
    adaptiveUIHandler.setup();

    // System Monitoring Handler
    const systemHandler = new SystemMonitoringHandler(socket, this.logger);
    systemHandler.setup();

    // Custom event handlers
    this.setupCustomHandlers(socket);
  }

  /**
   * Setup custom event handlers
   */
  private setupCustomHandlers(socket: Socket): void {
    // Real-time collaboration
    socket.on('collaboration:join', (data) => {
      socket.join(`collaboration:${data.sessionId}`);
      socket.to(`collaboration:${data.sessionId}`).emit('user:joined', {
        userId: socket.data.userId,
        timestamp: Date.now()
      });
    });

    // Broadcast to specific users
    socket.on(WebSocketEvents.BROADCAST, (data) => {
      if (data.target === 'all') {
        this.io.emit(data.event, data.payload);
      } else if (data.target === 'room') {
        socket.to(data.room).emit(data.event, data.payload);
      } else if (data.target === 'user') {
        this.sendToUser(data.userId, data.event, data.payload);
      }
    });

    // Health check response
    socket.on(WebSocketEvents.HEALTH_CHECK, () => {
      socket.emit(WebSocketEvents.HEALTH_CHECK, {
        status: 'ok',
        timestamp: Date.now(),
        latency: Date.now() - socket.handshake.time
      });
    });
  }

  /**
   * Join user to appropriate rooms
   */
  private joinUserRooms(socket: Socket, userId?: string): void {
    if (userId) {
      // User-specific room
      socket.join(`user:${userId}`);
      
      // Role-based rooms (if user has roles)
      // socket.join(`role:${userRole}`);
    }

    // Global rooms
    socket.join('global');
    socket.join(`session:${socket.data.sessionId}`);
  }

  /**
   * Send initial data to client
   */
  private sendInitialData(socket: Socket, userId?: string): void {
    // Send connection confirmation
    socket.emit(WebSocketEvents.AUTHENTICATED, {
      socketId: socket.id,
      userId,
      connectedAt: Date.now(),
      serverTime: Date.now()
    });

    // Send system status
    socket.emit(WebSocketEvents.SYSTEM_STATUS, {
      status: 'operational',
      version: '1.0.0',
      features: config.features
    });
  }

  /**
   * Handle client disconnection
   */
  private handleDisconnection(socket: Socket, reason: string): void {
    const { userId } = socket.data;
    
    this.logger.info(`WebSocket client disconnected: ${socket.id}, Reason: ${reason}, User: ${userId || 'anonymous'}`);

    // Remove from tracking
    this.connectedClients.delete(socket.id);

    // Remove from user sessions
    if (userId && this.userSessions.has(userId)) {
      this.userSessions.get(userId)!.delete(socket.id);
      if (this.userSessions.get(userId)!.size === 0) {
        this.userSessions.delete(userId);
      }
    }

    // Notify other clients if needed
    if (userId) {
      socket.to(`user:${userId}`).emit('user:disconnected', {
        userId,
        timestamp: Date.now(),
        reason
      });
    }
  }

  /**
   * Setup room management
   */
  private setupRooms(): void {
    // Dynamic room creation based on features
    if (config.features.realTimeAnalytics) {
      this.io.of('/analytics').on(WebSocketEvents.CONNECT, (socket) => {
        // Handle analytics-specific connections
      });
    }
  }

  /**
   * Send message to specific user
   */
  public sendToUser(userId: string, event: string, data: any): void {
    const socketIds = this.userSessions.get(userId);
    if (socketIds) {
      socketIds.forEach(socketId => {
        const socket = this.connectedClients.get(socketId);
        if (socket) {
          socket.emit(event, data);
        }
      });
    }
  }

  /**
   * Broadcast to all connected clients
   */
  public broadcastToAll(event: string, data: any): void {
    this.io.emit(event, data);
  }

  /**
   * Broadcast to specific room
   */
  public broadcastToRoom(room: string, event: string, data: any): void {
    this.io.to(room).emit(event, data);
  }

  /**
   * Get connection statistics
   */
  public getConnectionStats(): {
    totalConnections: number;
    authenticatedUsers: number;
    anonymousConnections: number;
    activeRooms: string[];
  } {
    const totalConnections = this.connectedClients.size;
    const authenticatedUsers = this.userSessions.size;
    const anonymousConnections = totalConnections - Array.from(this.userSessions.values())
      .reduce((sum, sockets) => sum + sockets.size, 0);
    
    return {
      totalConnections,
      authenticatedUsers,
      anonymousConnections,
      activeRooms: Array.from(this.io.sockets.adapter.rooms.keys())
    };
  }

  /**
   * Start health check routine
   */
  private startHealthCheck(): void {
    setInterval(() => {
      const stats = this.getConnectionStats();
      this.logger.debug('WebSocket Health Check:', stats);
      
      // Emit health metrics to monitoring tools
      this.broadcastToRoom('monitoring', WebSocketEvents.PERFORMANCE_METRICS, {
        timestamp: Date.now(),
        connections: stats,
        memory: process.memoryUsage(),
        uptime: process.uptime()
      });
    }, config.health.interval);
  }
}

/**
 * Setup WebSocket server
 */
export function setupWebSocket(io: SocketIOServer, logger: Logger): WebSocketManager {
  const wsManager = new WebSocketManager(io, logger);
  wsManager.setup();

  logger.info('WebSocket server initialized');
  
  return wsManager;
}

export { WebSocketManager, WebSocketEvents };
export default setupWebSocket;
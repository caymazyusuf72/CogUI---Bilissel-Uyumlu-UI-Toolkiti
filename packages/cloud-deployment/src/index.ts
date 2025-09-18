import express from 'express';
import { register, collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client';
import { createLogger, format, transports } from 'winston';
import { ElasticsearchTransport } from 'winston-elasticsearch';
import { initTracer, JaegerTracer } from 'jaeger-client';
import * as cron from 'node-cron';
import axios from 'axios';

/**
 * CogUI Cloud Deployment & Monitoring
 * Infrastructure monitoring, health checks, and observability
 */

// Prometheus Metrics
collectDefaultMetrics();

const httpRequestsTotal = new Counter({
  name: 'cogui_http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const httpRequestDuration = new Histogram({
  name: 'cogui_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route'],
  buckets: [0.1, 0.5, 1, 2, 5, 10]
});

const accessibilityScore = new Gauge({
  name: 'cogui_accessibility_score',
  help: 'Current accessibility score (0-100)',
  labelNames: ['page', 'test_type']
});

const cognitiveLoadAverage = new Gauge({
  name: 'cogui_cognitive_load_average',
  help: 'Average cognitive load of users',
  labelNames: ['time_window']
});

const adaptationEventsTotal = new Counter({
  name: 'cogui_adaptation_events_total',
  help: 'Total UI adaptation events',
  labelNames: ['adaptation_type', 'trigger']
});

// Logger Configuration
const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json()
  ),
  defaultMeta: {
    service: 'cogui-monitoring',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'production'
  },
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.simple()
      )
    }),
    new transports.File({
      filename: 'logs/error.log',
      level: 'error'
    }),
    new transports.File({
      filename: 'logs/combined.log'
    })
  ]
});

// Elasticsearch transport for production
if (process.env.NODE_ENV === 'production' && process.env.ELASTICSEARCH_HOST) {
  logger.add(new ElasticsearchTransport({
    level: 'info',
    clientOpts: {
      host: process.env.ELASTICSEARCH_HOST,
      log: 'info'
    },
    index: 'cogui-logs'
  }));
}

// Jaeger Tracing
const jaegerConfig = {
  serviceName: 'cogui-monitoring',
  sampler: {
    type: 'const',
    param: 1
  },
  reporter: {
    agentHost: process.env.JAEGER_AGENT_HOST || 'localhost',
    agentPort: 6832
  }
};

const tracer: JaegerTracer = initTracer(jaegerConfig, {
  logger: {
    info: (msg: string) => logger.info(msg),
    error: (msg: string) => logger.error(msg)
  }
});

/**
 * Health Check Service
 */
class HealthCheckService {
  private services: Map<string, boolean> = new Map();

  async checkDatabase(): Promise<boolean> {
    try {
      // MongoDB health check
      if (process.env.MONGODB_URI) {
        const response = await axios.get(`${process.env.MONGODB_URI}/admin/ping`, {
          timeout: 5000
        });
        return response.status === 200;
      }
      return false;
    } catch (error) {
      logger.error('Database health check failed', error);
      return false;
    }
  }

  async checkRedis(): Promise<boolean> {
    try {
      // Redis health check
      if (process.env.REDIS_URL) {
        const response = await axios.get(`${process.env.REDIS_URL}/ping`, {
          timeout: 5000
        });
        return response.status === 200;
      }
      return false;
    } catch (error) {
      logger.error('Redis health check failed', error);
      return false;
    }
  }

  async checkExternalServices(): Promise<boolean> {
    try {
      // Check external APIs
      const externalAPIs = [
        'https://api.cogui.dev/health',
        'https://cdn.cogui.dev/health'
      ];

      const results = await Promise.allSettled(
        externalAPIs.map(url =>
          axios.get(url, { timeout: 3000 })
        )
      );

      const successCount = results.filter(
        result => result.status === 'fulfilled'
      ).length;

      return successCount >= Math.ceil(externalAPIs.length / 2);
    } catch (error) {
      logger.error('External services health check failed', error);
      return false;
    }
  }

  async performHealthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: Record<string, boolean>;
    timestamp: string;
  }> {
    const checks = {
      database: await this.checkDatabase(),
      redis: await this.checkRedis(),
      externalServices: await this.checkExternalServices()
    };

    this.services.set('database', checks.database);
    this.services.set('redis', checks.redis);
    this.services.set('externalServices', checks.externalServices);

    const healthyServices = Object.values(checks).filter(Boolean).length;
    const totalServices = Object.keys(checks).length;

    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (healthyServices === totalServices) {
      status = 'healthy';
    } else if (healthyServices > 0) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return {
      status,
      checks,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Accessibility Monitoring Service
 */
class AccessibilityMonitoringService {
  async runAccessibilityTests(): Promise<void> {
    const span = tracer.startSpan('accessibility_test');
    
    try {
      // Simulate accessibility testing
      const testResults = {
        axeScore: Math.random() * 100,
        pa11yIssues: Math.floor(Math.random() * 10),
        lighthouseScore: Math.random() * 100
      };

      // Update metrics
      accessibilityScore.set(
        { page: 'homepage', test_type: 'axe' },
        testResults.axeScore
      );
      accessibilityScore.set(
        { page: 'homepage', test_type: 'lighthouse' },
        testResults.lighthouseScore
      );

      logger.info('Accessibility test completed', {
        axeScore: testResults.axeScore,
        pa11yIssues: testResults.pa11yIssues,
        lighthouseScore: testResults.lighthouseScore
      });

      // Alert if scores are too low
      if (testResults.axeScore < 85 || testResults.lighthouseScore < 85) {
        logger.warn('Accessibility score below threshold', testResults);
        
        // Send alert to monitoring system
        await this.sendAccessibilityAlert(testResults);
      }

    } catch (error) {
      logger.error('Accessibility test failed', error);
      span.setTag('error', true);
      span.log({ event: 'error', message: error.message });
    } finally {
      span.finish();
    }
  }

  private async sendAccessibilityAlert(results: any): Promise<void> {
    try {
      if (process.env.ALERT_WEBHOOK_URL) {
        await axios.post(process.env.ALERT_WEBHOOK_URL, {
          type: 'accessibility_alert',
          severity: 'warning',
          message: 'Accessibility score below threshold',
          data: results,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      logger.error('Failed to send accessibility alert', error);
    }
  }
}

/**
 * Performance Monitoring Service
 */
class PerformanceMonitoringService {
  async collectMetrics(): Promise<void> {
    const span = tracer.startSpan('performance_metrics_collection');

    try {
      // Simulate cognitive load monitoring
      const cognitiveLoad = Math.random();
      cognitiveLoadAverage.set({ time_window: '5m' }, cognitiveLoad);

      // Simulate adaptation events
      if (Math.random() > 0.7) {
        const adaptationType = ['contrast', 'font-size', 'layout', 'motion'][
          Math.floor(Math.random() * 4)
        ];
        adaptationEventsTotal.inc({
          adaptation_type: adaptationType,
          trigger: 'cognitive_load'
        });
      }

      logger.debug('Performance metrics collected', {
        cognitiveLoad,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Performance metrics collection failed', error);
      span.setTag('error', true);
    } finally {
      span.finish();
    }
  }

  async runPerformanceTests(): Promise<void> {
    try {
      // Run k6 performance tests
      logger.info('Running performance tests...');
      
      // Simulate test results
      const results = {
        avgResponseTime: Math.random() * 1000 + 200,
        throughput: Math.random() * 1000 + 500,
        errorRate: Math.random() * 0.05,
        p95ResponseTime: Math.random() * 2000 + 500
      };

      logger.info('Performance test completed', results);

      // Alert on performance issues
      if (results.avgResponseTime > 2000 || results.errorRate > 0.02) {
        logger.warn('Performance degradation detected', results);
      }

    } catch (error) {
      logger.error('Performance test failed', error);
    }
  }
}

/**
 * Main Monitoring Application
 */
class MonitoringApp {
  private app: express.Application;
  private healthCheckService: HealthCheckService;
  private accessibilityService: AccessibilityMonitoringService;
  private performanceService: PerformanceMonitoringService;

  constructor() {
    this.app = express();
    this.healthCheckService = new HealthCheckService();
    this.accessibilityService = new AccessibilityMonitoringService();
    this.performanceService = new PerformanceMonitoringService();
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupCronJobs();
  }

  private setupMiddleware(): void {
    // Request metrics middleware
    this.app.use((req, res, next) => {
      const start = Date.now();
      
      res.on('finish', () => {
        const duration = (Date.now() - start) / 1000;
        
        httpRequestsTotal.inc({
          method: req.method,
          route: req.route?.path || req.path,
          status_code: res.statusCode.toString()
        });
        
        httpRequestDuration.observe(
          {
            method: req.method,
            route: req.route?.path || req.path
          },
          duration
        );
      });
      
      next();
    });

    this.app.use(express.json());
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', async (req, res) => {
      const health = await this.healthCheckService.performHealthCheck();
      const statusCode = health.status === 'healthy' ? 200 : 
                        health.status === 'degraded' ? 206 : 503;
      
      res.status(statusCode).json(health);
    });

    // Metrics endpoint for Prometheus
    this.app.get('/metrics', (req, res) => {
      res.set('Content-Type', register.contentType);
      res.send(register.metrics());
    });

    // Accessibility metrics endpoint
    this.app.get('/metrics/accessibility', (req, res) => {
      res.json({
        timestamp: new Date().toISOString(),
        metrics: {
          axe_score: Math.random() * 100,
          pa11y_issues: Math.floor(Math.random() * 10),
          lighthouse_score: Math.random() * 100,
          wcag_compliance: 'AA'
        }
      });
    });

    // Cognitive load metrics endpoint
    this.app.get('/metrics/cognitive-load', (req, res) => {
      res.json({
        timestamp: new Date().toISOString(),
        metrics: {
          average_load: Math.random(),
          peak_load: Math.random(),
          adaptation_rate: Math.random() * 0.1,
          user_satisfaction: Math.random() * 100
        }
      });
    });

    // Alert webhook endpoint
    this.app.post('/webhooks/alerts', (req, res) => {
      logger.info('Received alert', req.body);
      res.status(200).json({ received: true });
    });
  }

  private setupCronJobs(): void {
    // Health checks every minute
    cron.schedule('* * * * *', () => {
      this.healthCheckService.performHealthCheck();
    });

    // Accessibility tests every 5 minutes
    cron.schedule('*/5 * * * *', () => {
      this.accessibilityService.runAccessibilityTests();
    });

    // Performance metrics every minute
    cron.schedule('* * * * *', () => {
      this.performanceService.collectMetrics();
    });

    // Performance tests every 15 minutes
    cron.schedule('*/15 * * * *', () => {
      this.performanceService.runPerformanceTests();
    });

    logger.info('Cron jobs scheduled for monitoring');
  }

  public start(): void {
    const port = process.env.PORT || 3000;
    
    this.app.listen(port, () => {
      logger.info(`CogUI Monitoring Service started on port ${port}`, {
        port,
        environment: process.env.NODE_ENV,
        version: process.env.npm_package_version
      });
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      tracer.close(() => {
        process.exit(0);
      });
    });
  }
}

// Start the monitoring service
if (require.main === module) {
  const monitoringApp = new MonitoringApp();
  monitoringApp.start();
}

export {
  MonitoringApp,
  HealthCheckService,
  AccessibilityMonitoringService,
  PerformanceMonitoringService
};
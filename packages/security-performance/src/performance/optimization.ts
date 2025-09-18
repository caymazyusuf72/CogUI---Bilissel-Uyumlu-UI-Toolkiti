import compression from 'compression';
import sharp from 'sharp';
import imagemin from 'imagemin';
import { minify as terserMinify } from 'terser';
import CleanCSS from 'clean-css';
import { minify as htmlMinify } from 'html-minifier-terser';
import { Request, Response, NextFunction } from 'express';
import { createHash } from 'crypto';
import LRU from 'lru-cache';
import Redis from 'ioredis';
import { 
  PerformanceConfig,
  CachingConfig,
  CompressionConfig,
  OptimizationConfig,
  PerformanceMetrics 
} from '../types/index.js';

/**
 * CogUI Performance Optimization Suite
 * Advanced performance optimization for cognitive-adaptive UI applications
 */

export class PerformanceOptimizer {
  private config: PerformanceConfig;
  private memoryCache: LRU<string, any>;
  private redisClient?: Redis;
  private cssMinifier: CleanCSS;
  private performanceMetrics: PerformanceMetrics[] = [];

  constructor(config: PerformanceConfig) {
    this.config = config;
    
    // Initialize memory cache
    this.memoryCache = new LRU({
      max: config.caching.memory.max,
      ttl: config.caching.memory.maxAge * 1000
    });

    // Initialize Redis if configured
    if (config.caching.redis.host) {
      this.redisClient = new Redis({
        host: config.caching.redis.host,
        port: config.caching.redis.port,
        password: config.caching.redis.password,
        db: config.caching.redis.db,
        retryDelayOnFailover: 100,
        enableReadyCheck: false,
        maxRetriesPerRequest: 3
      });
    }

    // Initialize CSS minifier
    this.cssMinifier = new CleanCSS({
      level: config.optimization.cssMinification.level,
      returnPromise: true,
      format: 'beautify'
    });
  }

  /**
   * Initialize all performance middleware
   */
  public initializeAll() {
    return [
      this.compressionMiddleware(),
      this.staticAssetOptimization(),
      this.responseTimeTracking(),
      this.memoryOptimization(),
      this.cognitiveLoadOptimization(),
      this.adaptiveResourceLoading(),
      this.performanceMonitoring()
    ];
  }

  /**
   * Advanced compression middleware with cognitive adaptation
   */
  public compressionMiddleware() {
    return compression({
      level: this.config.compression.level,
      threshold: this.config.compression.threshold,
      filter: (req: Request, res: Response) => {
        // Don't compress responses with 'Cache-Control: no-transform' directive
        if (res.getHeader('Cache-Control') && 
            res.getHeader('Cache-Control').toString().includes('no-transform')) {
          return false;
        }

        // Adaptive compression based on cognitive profile
        const cognitiveProfile = req.headers['x-cognitive-profile'];
        if (cognitiveProfile) {
          try {
            const profile = JSON.parse(cognitiveProfile as string);
            // Lower compression for users with processing speed issues
            if (profile.processingSpeed < 0.5) {
              return false;
            }
          } catch (error) {
            // Continue with default behavior
          }
        }

        return this.config.compression.filter(req, res);
      },
      chunkSize: this.config.compression.chunkSize,
      windowBits: this.config.compression.windowBits,
      memLevel: this.config.compression.memLevel
    });
  }

  /**
   * Static asset optimization middleware
   */
  public staticAssetOptimization() {
    return async (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();

      // Only process static assets
      if (!this.isStaticAsset(req.path)) {
        return next();
      }

      try {
        // Check cache first
        const cacheKey = this.generateCacheKey(req);
        const cached = await this.getFromCache(cacheKey);
        
        if (cached) {
          this.setCacheHeaders(res, cached.headers);
          res.set('X-Cache', 'HIT');
          return res.send(cached.content);
        }

        // Process the request
        const originalSend = res.send;
        res.send = (body: any) => {
          const processingTime = Date.now() - startTime;
          
          // Optimize content based on type
          this.optimizeContent(body, req.path)
            .then(optimizedContent => {
              // Cache the optimized content
              this.setCache(cacheKey, {
                content: optimizedContent,
                headers: res.getHeaders(),
                timestamp: new Date()
              });

              // Set performance headers
              res.set('X-Cache', 'MISS');
              res.set('X-Processing-Time', processingTime.toString());
              res.set('X-Optimized', 'true');

              return originalSend.call(res, optimizedContent);
            })
            .catch(error => {
              console.error('Optimization error:', error);
              return originalSend.call(res, body);
            });

          return res;
        };

        next();
      } catch (error) {
        console.error('Static asset optimization error:', error);
        next();
      }
    };
  }

  /**
   * Response time tracking middleware
   */
  public responseTimeTracking() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      const startMemory = process.memoryUsage();

      res.on('finish', () => {
        const endTime = Date.now();
        const endMemory = process.memoryUsage();
        const responseTime = endTime - startTime;

        // Calculate memory diff
        const memoryDiff = {
          rss: endMemory.rss - startMemory.rss,
          heapTotal: endMemory.heapTotal - startMemory.heapTotal,
          heapUsed: endMemory.heapUsed - startMemory.heapUsed,
          external: endMemory.external - startMemory.external,
          arrayBuffers: endMemory.arrayBuffers - startMemory.arrayBuffers
        };

        // Record metrics
        this.recordPerformanceMetric({
          timestamp: new Date(),
          responseTime,
          memoryUsage: endMemory,
          memoryDiff,
          path: req.path,
          method: req.method,
          statusCode: res.statusCode,
          contentLength: parseInt(res.get('content-length') || '0')
        });

        // Set response time header
        res.set('X-Response-Time', `${responseTime}ms`);

        // Adaptive performance warnings
        if (responseTime > 2000) {
          res.set('X-Performance-Warning', 'slow-response');
          res.set('X-Cognitive-Suggestion', 'reduce-complexity');
        }
      });

      next();
    };
  }

  /**
   * Memory optimization middleware
   */
  public memoryOptimization() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Monitor memory usage
      const memUsage = process.memoryUsage();
      const memoryThreshold = 500 * 1024 * 1024; // 500MB

      if (memUsage.heapUsed > memoryThreshold) {
        // Trigger garbage collection if available
        if (global.gc) {
          global.gc();
        }

        // Clear some caches
        this.clearOldCacheEntries();

        // Set memory pressure headers
        res.set('X-Memory-Pressure', 'high');
        res.set('X-Cognitive-Adaptation', 'reduce-animations,simplify-layout');
      }

      // Memory-based adaptive content delivery
      if (memUsage.heapUsed > memoryThreshold * 0.8) {
        res.set('X-Content-Optimization', 'aggressive');
      }

      next();
    };
  }

  /**
   * Cognitive load optimization middleware
   */
  public cognitiveLoadOptimization() {
    return (req: Request, res: Response, next: NextFunction) => {
      const cognitiveProfile = req.headers['x-cognitive-profile'];
      
      if (cognitiveProfile) {
        try {
          const profile = JSON.parse(cognitiveProfile as string);
          
          // Adaptive optimizations based on cognitive load
          const adaptations: string[] = [];
          
          if (profile.cognitiveLoad > 0.8) {
            adaptations.push('reduce-animations');
            adaptations.push('simplify-layout');
            adaptations.push('increase-contrast');
          }
          
          if (profile.attentionSpan < 30) {
            adaptations.push('reduce-content-density');
            adaptations.push('highlight-important');
          }
          
          if (profile.processingSpeed < 0.5) {
            adaptations.push('slower-transitions');
            adaptations.push('reduce-distractions');
          }
          
          if (adaptations.length > 0) {
            res.set('X-Cognitive-Adaptations', adaptations.join(','));
          }
          
          // Preload optimization
          if (profile.memoryCapacity > 0.8) {
            res.set('X-Preload-Strategy', 'aggressive');
          } else {
            res.set('X-Preload-Strategy', 'conservative');
          }
          
        } catch (error) {
          console.error('Cognitive profile parsing error:', error);
        }
      }

      next();
    };
  }

  /**
   * Adaptive resource loading middleware
   */
  public adaptiveResourceLoading() {
    return (req: Request, res: Response, next: NextFunction) => {
      const userAgent = req.headers['user-agent'] || '';
      const acceptHeader = req.headers.accept || '';
      
      // Device capability detection
      const isMobile = /mobile|android|iphone|ipad/i.test(userAgent);
      const isLowEnd = /chrome\/[0-4][0-9]|firefox\/[0-4][0-9]/i.test(userAgent);
      const supportsWebP = acceptHeader.includes('image/webp');
      const supportsAvif = acceptHeader.includes('image/avif');

      // Set adaptive resource hints
      const resourceHints: string[] = [];
      
      if (isMobile) {
        resourceHints.push('mobile-optimized');
        res.set('X-Image-Quality', '75'); // Reduced quality for mobile
      }
      
      if (isLowEnd) {
        resourceHints.push('low-end-device');
        res.set('X-Resource-Priority', 'critical-only');
      }
      
      if (supportsWebP) {
        resourceHints.push('webp-supported');
      }
      
      if (supportsAvif) {
        resourceHints.push('avif-supported');
      }

      if (resourceHints.length > 0) {
        res.set('X-Resource-Hints', resourceHints.join(','));
      }

      // Adaptive preload headers
      if (!isLowEnd) {
        res.set('Link', '</css/critical.css>; rel=preload; as=style');
      }

      next();
    };
  }

  /**
   * Performance monitoring middleware
   */
  public performanceMonitoring() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = process.hrtime.bigint();
      const startCpu = process.cpuUsage();

      res.on('finish', () => {
        const endTime = process.hrtime.bigint();
        const endCpu = process.cpuUsage(startCpu);
        const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds

        // Calculate CPU usage
        const cpuUsage = {
          user: endCpu.user / 1000, // Convert to milliseconds
          system: endCpu.system / 1000
        };

        // Record comprehensive metrics
        const metrics = {
          timestamp: new Date(),
          responseTime: duration,
          cpuUsage,
          memoryUsage: process.memoryUsage(),
          path: req.path,
          method: req.method,
          statusCode: res.statusCode,
          userAgent: req.headers['user-agent'],
          cognitiveProfile: req.headers['x-cognitive-profile']
        };

        this.recordPerformanceMetric(metrics);

        // Performance budgets
        if (duration > 1000) { // Slow response
          console.warn(`Slow response detected: ${req.method} ${req.path} took ${duration}ms`);
        }

        if (cpuUsage.user + cpuUsage.system > 100) { // High CPU
          console.warn(`High CPU usage detected: ${cpuUsage.user + cpuUsage.system}ms for ${req.method} ${req.path}`);
        }
      });

      next();
    };
  }

  // Asset optimization methods

  /**
   * Image optimization
   */
  public async optimizeImage(buffer: Buffer, options: {
    format?: 'webp' | 'avif' | 'jpeg' | 'png';
    quality?: number;
    width?: number;
    height?: number;
  } = {}): Promise<Buffer> {
    const {
      format = 'webp',
      quality = this.config.optimization.imageOptimization.quality,
      width,
      height
    } = options;

    let processor = sharp(buffer);

    // Resize if dimensions provided
    if (width || height) {
      processor = processor.resize(width, height, {
        fit: 'inside',
        withoutEnlargement: true
      });
    }

    // Convert format and optimize
    switch (format) {
      case 'webp':
        return processor.webp({ quality, effort: 6 }).toBuffer();
      case 'avif':
        return processor.avif({ quality, effort: 9 }).toBuffer();
      case 'jpeg':
        return processor.jpeg({ quality, progressive: this.config.optimization.imageOptimization.progressive }).toBuffer();
      case 'png':
        return processor.png({ compressionLevel: 9 }).toBuffer();
      default:
        return processor.toBuffer();
    }
  }

  /**
   * CSS optimization
   */
  public async optimizeCSS(css: string): Promise<string> {
    if (!this.config.optimization.cssMinification.enabled) {
      return css;
    }

    try {
      const result = await this.cssMinifier.minify(css);
      return result.styles;
    } catch (error) {
      console.error('CSS optimization error:', error);
      return css;
    }
  }

  /**
   * JavaScript optimization
   */
  public async optimizeJS(js: string): Promise<string> {
    if (!this.config.optimization.jsMinification.enabled) {
      return js;
    }

    try {
      const result = await terserMinify(js, {
        compress: this.config.optimization.jsMinification.compress,
        mangle: this.config.optimization.jsMinification.mangle,
        format: {
          comments: !this.config.optimization.jsMinification.removeComments
        },
        ecma: this.config.optimization.jsMinification.ecma,
        sourceMap: this.config.optimization.jsMinification.sourceMap
      });

      return result.code || js;
    } catch (error) {
      console.error('JavaScript optimization error:', error);
      return js;
    }
  }

  /**
   * HTML optimization
   */
  public async optimizeHTML(html: string): Promise<string> {
    if (!this.config.optimization.htmlMinification.enabled) {
      return html;
    }

    try {
      return await htmlMinify(html, {
        collapseWhitespace: this.config.optimization.htmlMinification.collapseWhitespace,
        removeComments: this.config.optimization.htmlMinification.removeComments,
        removeEmptyAttributes: this.config.optimization.htmlMinification.removeEmptyAttributes,
        removeRedundantAttributes: this.config.optimization.htmlMinification.removeRedundantAttributes,
        removeScriptTypeAttributes: this.config.optimization.htmlMinification.removeScriptTypeAttributes,
        removeStyleLinkTypeAttributes: this.config.optimization.htmlMinification.removeStyleLinkTypeAttributes,
        minifyCSS: this.config.optimization.htmlMinification.minifyCSS,
        minifyJS: this.config.optimization.htmlMinification.minifyJS,
        useShortDoctype: true,
        removeAttributeQuotes: true,
        removeOptionalTags: true
      });
    } catch (error) {
      console.error('HTML optimization error:', error);
      return html;
    }
  }

  // Caching methods

  /**
   * Get item from cache (memory first, then Redis)
   */
  private async getFromCache(key: string): Promise<any> {
    // Check memory cache first
    const memoryResult = this.memoryCache.get(key);
    if (memoryResult) {
      return memoryResult;
    }

    // Check Redis cache
    if (this.redisClient) {
      try {
        const redisResult = await this.redisClient.get(key);
        if (redisResult) {
          const parsed = JSON.parse(redisResult);
          // Store in memory cache for faster access
          this.memoryCache.set(key, parsed);
          return parsed;
        }
      } catch (error) {
        console.error('Redis get error:', error);
      }
    }

    return null;
  }

  /**
   * Set item in cache (both memory and Redis)
   */
  private async setCache(key: string, value: any): Promise<void> {
    // Store in memory cache
    this.memoryCache.set(key, value);

    // Store in Redis cache
    if (this.redisClient) {
      try {
        await this.redisClient.setex(
          key, 
          this.config.caching.redis.ttl, 
          JSON.stringify(value)
        );
      } catch (error) {
        console.error('Redis set error:', error);
      }
    }
  }

  // Helper methods

  private isStaticAsset(path: string): boolean {
    return /\.(css|js|png|jpg|jpeg|gif|webp|avif|svg|woff|woff2|ttf|eot|ico)$/i.test(path);
  }

  private generateCacheKey(req: Request): string {
    const keyData = `${req.path}:${req.headers['accept-encoding'] || ''}:${req.headers['user-agent'] || ''}`;
    return createHash('sha256').update(keyData).digest('hex');
  }

  private setCacheHeaders(res: Response, headers: any): void {
    const cacheableHeaders = [
      'content-type',
      'content-encoding',
      'content-length',
      'etag',
      'last-modified'
    ];

    cacheableHeaders.forEach(header => {
      if (headers[header]) {
        res.set(header, headers[header]);
      }
    });
  }

  private async optimizeContent(content: any, path: string): Promise<any> {
    const ext = path.split('.').pop()?.toLowerCase();

    switch (ext) {
      case 'css':
        return typeof content === 'string' ? 
          await this.optimizeCSS(content) : content;
      
      case 'js':
        return typeof content === 'string' ? 
          await this.optimizeJS(content) : content;
      
      case 'html':
        return typeof content === 'string' ? 
          await this.optimizeHTML(content) : content;
      
      case 'png':
      case 'jpg':
      case 'jpeg':
        return Buffer.isBuffer(content) ? 
          await this.optimizeImage(content) : content;
      
      default:
        return content;
    }
  }

  private clearOldCacheEntries(): void {
    // Clear memory cache entries
    this.memoryCache.clear();

    // Clear old Redis entries (in production, use Redis SCAN with pattern)
    if (this.redisClient) {
      // This is a simplified approach - in production, use more sophisticated cleanup
      this.redisClient.flushdb().catch(error => {
        console.error('Redis flush error:', error);
      });
    }
  }

  private recordPerformanceMetric(metric: any): void {
    this.performanceMetrics.push(metric);

    // Keep only recent metrics (last 1000 entries)
    if (this.performanceMetrics.length > 1000) {
      this.performanceMetrics.shift();
    }

    // In production, send to monitoring service
    console.log('[PERFORMANCE METRIC]', {
      path: metric.path,
      method: metric.method,
      responseTime: metric.responseTime,
      statusCode: metric.statusCode,
      timestamp: metric.timestamp
    });
  }

  /**
   * Get performance statistics
   */
  public getPerformanceStats(): {
    averageResponseTime: number;
    totalRequests: number;
    slowRequests: number;
    errorRate: number;
    memoryUsage: NodeJS.MemoryUsage;
  } {
    const metrics = this.performanceMetrics.slice(-100); // Last 100 requests
    
    const averageResponseTime = metrics.reduce((sum, m) => sum + m.responseTime, 0) / metrics.length || 0;
    const totalRequests = metrics.length;
    const slowRequests = metrics.filter(m => m.responseTime > 1000).length;
    const errorRequests = metrics.filter(m => m.statusCode >= 400).length;
    const errorRate = errorRequests / totalRequests || 0;

    return {
      averageResponseTime,
      totalRequests,
      slowRequests,
      errorRate,
      memoryUsage: process.memoryUsage()
    };
  }
}

/**
 * Factory function to create performance optimizer
 */
export function createPerformanceOptimizer(config: PerformanceConfig): PerformanceOptimizer {
  return new PerformanceOptimizer(config);
}

/**
 * Default performance configuration
 */
export const defaultPerformanceConfig: Partial<PerformanceConfig> = {
  caching: {
    memory: {
      max: 500,
      maxAge: 1800, // 30 minutes
      updateAgeOnGet: true,
      updateAgeOnHas: false
    },
    redis: {
      host: 'localhost',
      port: 6379,
      db: 0,
      ttl: 3600, // 1 hour
      maxMemory: '100mb',
      evictionPolicy: 'allkeys-lru',
      keyPrefix: 'cogui:'
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
    }
  }
};

export default PerformanceOptimizer;
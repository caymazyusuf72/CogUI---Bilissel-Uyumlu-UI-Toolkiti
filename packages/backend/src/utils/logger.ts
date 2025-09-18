import fs from 'fs';
import path from 'path';
import { config } from '@/config';

/**
 * Log Levels
 */
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

/**
 * Log Entry Interface
 */
export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: string;
  metadata?: any;
  stack?: string;
}

/**
 * Logger Configuration
 */
export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
  filename?: string;
  maxFileSize?: string;
  maxFiles?: number;
  colorize?: boolean;
}

/**
 * Advanced Logger Class
 * Enterprise-grade logging with multiple outputs and structured logging
 */
export class Logger {
  private context: string;
  private config: LoggerConfig;
  private logBuffer: LogEntry[] = [];
  private logFilePath?: string;

  constructor(context: string = 'App', loggerConfig?: Partial<LoggerConfig>) {
    this.context = context;
    this.config = {
      level: this.getLogLevelFromString(config.logging.level),
      enableConsole: config.logging.console.enabled,
      enableFile: config.logging.file.enabled,
      filename: config.logging.file.filename,
      maxFileSize: config.logging.file.maxSize,
      maxFiles: config.logging.file.maxFiles,
      colorize: config.logging.console.colorize,
      ...loggerConfig
    };

    this.initializeFileLogging();
    this.startBufferFlush();
  }

  /**
   * Convert string log level to enum
   */
  private getLogLevelFromString(level: string): LogLevel {
    switch (level.toLowerCase()) {
      case 'error': return LogLevel.ERROR;
      case 'warn': return LogLevel.WARN;
      case 'info': return LogLevel.INFO;
      case 'debug': return LogLevel.DEBUG;
      default: return LogLevel.INFO;
    }
  }

  /**
   * Initialize file logging
   */
  private initializeFileLogging(): void {
    if (this.config.enableFile && this.config.filename) {
      const logDir = path.dirname(this.config.filename);
      
      // Create log directory if it doesn't exist
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      this.logFilePath = this.config.filename;
    }
  }

  /**
   * Start buffer flush interval
   */
  private startBufferFlush(): void {
    // Flush buffer every 5 seconds
    setInterval(() => {
      this.flushBuffer();
    }, 5000);

    // Flush on process exit
    process.on('exit', () => this.flushBuffer());
    process.on('SIGINT', () => this.flushBuffer());
    process.on('SIGTERM', () => this.flushBuffer());
  }

  /**
   * Flush log buffer to file
   */
  private flushBuffer(): void {
    if (!this.config.enableFile || !this.logFilePath || this.logBuffer.length === 0) {
      return;
    }

    try {
      const logLines = this.logBuffer.map(entry => this.formatLogEntry(entry, false));
      fs.appendFileSync(this.logFilePath, logLines.join('\n') + '\n');
      
      // Check file size and rotate if needed
      this.rotateLogFile();
      
      // Clear buffer
      this.logBuffer = [];
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  /**
   * Rotate log file if it exceeds max size
   */
  private rotateLogFile(): void {
    if (!this.logFilePath) return;

    try {
      const stats = fs.statSync(this.logFilePath);
      const maxSize = this.parseFileSize(this.config.maxFileSize || '20MB');

      if (stats.size > maxSize) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const rotatedFilename = this.logFilePath.replace(/\.log$/, `-${timestamp}.log`);
        
        fs.renameSync(this.logFilePath, rotatedFilename);
        
        // Clean up old log files
        this.cleanupOldLogFiles();
      }
    } catch (error) {
      console.error('Failed to rotate log file:', error);
    }
  }

  /**
   * Parse file size string to bytes
   */
  private parseFileSize(sizeStr: string): number {
    const match = sizeStr.match(/^(\d+)\s*(KB|MB|GB)?$/i);
    if (!match) return 20 * 1024 * 1024; // Default 20MB

    const size = parseInt(match[1]);
    const unit = (match[2] || 'B').toUpperCase();

    switch (unit) {
      case 'KB': return size * 1024;
      case 'MB': return size * 1024 * 1024;
      case 'GB': return size * 1024 * 1024 * 1024;
      default: return size;
    }
  }

  /**
   * Clean up old log files
   */
  private cleanupOldLogFiles(): void {
    if (!this.logFilePath || !this.config.maxFiles) return;

    try {
      const logDir = path.dirname(this.logFilePath);
      const baseName = path.basename(this.logFilePath, '.log');
      
      const files = fs.readdirSync(logDir)
        .filter(file => file.startsWith(baseName) && file.endsWith('.log'))
        .map(file => ({
          name: file,
          path: path.join(logDir, file),
          mtime: fs.statSync(path.join(logDir, file)).mtime
        }))
        .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

      // Keep only the specified number of files
      const filesToDelete = files.slice(this.config.maxFiles);
      filesToDelete.forEach(file => {
        fs.unlinkSync(file.path);
      });
    } catch (error) {
      console.error('Failed to cleanup old log files:', error);
    }
  }

  /**
   * Format log entry for output
   */
  private formatLogEntry(entry: LogEntry, colorize: boolean = false): string {
    const timestamp = entry.timestamp.toISOString();
    const level = LogLevel[entry.level].padEnd(5);
    const context = entry.context || this.context;
    
    let formattedMessage = `[${timestamp}] ${level} [${context}] ${entry.message}`;
    
    if (entry.metadata) {
      formattedMessage += ` ${JSON.stringify(entry.metadata)}`;
    }

    if (entry.stack) {
      formattedMessage += `\n${entry.stack}`;
    }

    // Add colors for console output
    if (colorize && this.config.colorize) {
      switch (entry.level) {
        case LogLevel.ERROR:
          formattedMessage = `\x1b[31m${formattedMessage}\x1b[0m`; // Red
          break;
        case LogLevel.WARN:
          formattedMessage = `\x1b[33m${formattedMessage}\x1b[0m`; // Yellow
          break;
        case LogLevel.INFO:
          formattedMessage = `\x1b[36m${formattedMessage}\x1b[0m`; // Cyan
          break;
        case LogLevel.DEBUG:
          formattedMessage = `\x1b[37m${formattedMessage}\x1b[0m`; // White
          break;
      }
    }

    return formattedMessage;
  }

  /**
   * Log a message
   */
  private log(level: LogLevel, message: string, metadata?: any): void {
    // Check if log level is enabled
    if (level > this.config.level) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      context: this.context,
      metadata,
      ...(level === LogLevel.ERROR && metadata instanceof Error && {
        stack: metadata.stack
      })
    };

    // Console output
    if (this.config.enableConsole) {
      const formattedMessage = this.formatLogEntry(entry, true);
      
      switch (level) {
        case LogLevel.ERROR:
          console.error(formattedMessage);
          break;
        case LogLevel.WARN:
          console.warn(formattedMessage);
          break;
        case LogLevel.INFO:
          console.info(formattedMessage);
          break;
        case LogLevel.DEBUG:
          console.debug(formattedMessage);
          break;
      }
    }

    // Add to buffer for file output
    if (this.config.enableFile) {
      this.logBuffer.push(entry);
    }
  }

  /**
   * Log error message
   */
  public error(message: string, metadata?: any): void {
    this.log(LogLevel.ERROR, message, metadata);
  }

  /**
   * Log warning message
   */
  public warn(message: string, metadata?: any): void {
    this.log(LogLevel.WARN, message, metadata);
  }

  /**
   * Log info message
   */
  public info(message: string, metadata?: any): void {
    this.log(LogLevel.INFO, message, metadata);
  }

  /**
   * Log debug message
   */
  public debug(message: string, metadata?: any): void {
    this.log(LogLevel.DEBUG, message, metadata);
  }

  /**
   * Create a child logger with additional context
   */
  public child(childContext: string): Logger {
    const fullContext = `${this.context}:${childContext}`;
    return new Logger(fullContext, this.config);
  }

  /**
   * Set log level dynamically
   */
  public setLevel(level: LogLevel | string): void {
    this.config.level = typeof level === 'string' 
      ? this.getLogLevelFromString(level) 
      : level;
  }

  /**
   * Enable/disable console logging
   */
  public setConsoleLogging(enabled: boolean): void {
    this.config.enableConsole = enabled;
  }

  /**
   * Enable/disable file logging
   */
  public setFileLogging(enabled: boolean): void {
    this.config.enableFile = enabled;
  }

  /**
   * Get current configuration
   */
  public getConfig(): LoggerConfig {
    return { ...this.config };
  }

  /**
   * Force flush buffer
   */
  public flush(): void {
    this.flushBuffer();
  }
}

/**
 * Default logger instance
 */
export const logger = new Logger('CogUI');

/**
 * Create logger with context
 */
export function createLogger(context: string, config?: Partial<LoggerConfig>): Logger {
  return new Logger(context, config);
}

/**
 * Log request middleware for Express
 */
export function loggerMiddleware(logger: Logger) {
  return (req: any, res: any, next: any) => {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      const logLevel = res.statusCode >= 400 ? LogLevel.WARN : LogLevel.INFO;
      
      logger.log(logLevel, `${req.method} ${req.originalUrl}`, {
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        contentLength: res.get('Content-Length')
      });
    });
    
    next();
  };
}

export default Logger;
import { createHash, randomBytes, timingSafeEqual, pbkdf2Sync, scryptSync } from 'crypto';
import validator from 'validator';
import { performance } from 'perf_hooks';
import { 
  SecurityEvent, 
  PerformanceMetrics, 
  User, 
  CognitiveProfile, 
  AccessibilitySettings 
} from '../types/index.js';

/**
 * CogUI Security & Performance Utilities
 * Comprehensive utility functions for security, performance, and cognitive adaptation
 */

// Security Utilities

/**
 * Generate secure random token
 */
export function generateSecureToken(length: number = 32): string {
  return randomBytes(length).toString('hex');
}

/**
 * Generate secure random string with custom alphabet
 */
export function generateSecureString(length: number = 16, alphabet: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'): string {
  let result = '';
  const alphabetLength = alphabet.length;
  const randomValues = randomBytes(length);
  
  for (let i = 0; i < length; i++) {
    result += alphabet[randomValues[i] % alphabetLength];
  }
  
  return result;
}

/**
 * Create cryptographic hash with salt
 */
export function createHashWithSalt(data: string, salt?: string): { hash: string; salt: string } {
  const actualSalt = salt || randomBytes(32).toString('hex');
  const hash = createHash('sha256').update(data + actualSalt).digest('hex');
  
  return { hash, salt: actualSalt };
}

/**
 * Verify hash with salt
 */
export function verifyHashWithSalt(data: string, hash: string, salt: string): boolean {
  const { hash: computedHash } = createHashWithSalt(data, salt);
  return timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(computedHash, 'hex'));
}

/**
 * Key derivation using PBKDF2
 */
export function deriveKeyPBKDF2(password: string, salt?: Buffer, iterations: number = 100000, keyLength: number = 64): { key: Buffer; salt: Buffer } {
  const actualSalt = salt || randomBytes(32);
  const key = pbkdf2Sync(password, actualSalt, iterations, keyLength, 'sha512');
  
  return { key, salt: actualSalt };
}

/**
 * Key derivation using scrypt (more memory-hard)
 */
export function deriveKeyScrypt(password: string, salt?: Buffer, keyLength: number = 64): { key: Buffer; salt: Buffer } {
  const actualSalt = salt || randomBytes(32);
  const key = scryptSync(password, actualSalt, keyLength, {
    cost: 16384,
    blockSize: 8,
    parallelization: 1,
    maxmem: 32 * 1024 * 1024 // 32MB
  });
  
  return { key, salt: actualSalt };
}

/**
 * Constant-time string comparison
 */
export function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * Sanitize user input
 */
export function sanitizeInput(input: string, options: {
  allowHtml?: boolean;
  maxLength?: number;
  removeScripts?: boolean;
  normalizeWhitespace?: boolean;
} = {}): string {
  const {
    allowHtml = false,
    maxLength = 1000,
    removeScripts = true,
    normalizeWhitespace = true
  } = options;

  let sanitized = input.trim();

  // Normalize whitespace
  if (normalizeWhitespace) {
    sanitized = sanitized.replace(/\s+/g, ' ');
  }

  // Remove scripts
  if (removeScripts) {
    sanitized = sanitized.replace(/<script[^>]*>.*?<\/script>/gis, '');
    sanitized = sanitized.replace(/javascript:/gi, '');
    sanitized = sanitized.replace(/on\w+\s*=/gi, '');
  }

  // Escape HTML if not allowed
  if (!allowHtml) {
    sanitized = validator.escape(sanitized);
  }

  // Truncate if too long
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}

/**
 * Validate email with additional checks
 */
export function validateEmail(email: string): {
  isValid: boolean;
  errors: string[];
  normalized: string;
} {
  const errors: string[] = [];
  let normalized = email.toLowerCase().trim();

  // Basic format check
  if (!validator.isEmail(normalized)) {
    errors.push('Invalid email format');
  }

  // Check for dangerous characters
  if (/[<>'"(){}[\]\\]/.test(normalized)) {
    errors.push('Email contains invalid characters');
  }

  // Check domain length
  const domainPart = normalized.split('@')[1];
  if (domainPart && domainPart.length > 253) {
    errors.push('Domain name too long');
  }

  // Check for consecutive dots
  if (normalized.includes('..')) {
    errors.push('Email cannot contain consecutive dots');
  }

  // Normalize email
  if (errors.length === 0) {
    normalized = validator.normalizeEmail(normalized) || normalized;
  }

  return {
    isValid: errors.length === 0,
    errors,
    normalized
  };
}

/**
 * Validate password strength
 */
export function validatePasswordStrength(password: string): {
  score: number; // 0-100
  isStrong: boolean;
  suggestions: string[];
  details: {
    length: number;
    hasLowercase: boolean;
    hasUppercase: boolean;
    hasNumbers: boolean;
    hasSymbols: boolean;
    hasCommonPatterns: boolean;
    entropy: number;
  };
} {
  const suggestions: string[] = [];
  let score = 0;

  // Check length
  const length = password.length;
  if (length >= 12) score += 25;
  else if (length >= 8) score += 15;
  else suggestions.push('Use at least 8 characters (12+ recommended)');

  // Check character types
  const hasLowercase = /[a-z]/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSymbols = /[^a-zA-Z0-9]/.test(password);

  const characterTypes = [hasLowercase, hasUppercase, hasNumbers, hasSymbols].filter(Boolean).length;
  score += characterTypes * 10;

  if (!hasLowercase) suggestions.push('Include lowercase letters');
  if (!hasUppercase) suggestions.push('Include uppercase letters');
  if (!hasNumbers) suggestions.push('Include numbers');
  if (!hasSymbols) suggestions.push('Include special characters');

  // Check for common patterns
  const hasCommonPatterns = /(.)\1{2,}|123|abc|qwe|password|admin/.test(password.toLowerCase());
  if (hasCommonPatterns) {
    score -= 20;
    suggestions.push('Avoid common patterns and repeated characters');
  }

  // Calculate entropy
  const charset = length > 0 ? (
    (hasLowercase ? 26 : 0) +
    (hasUppercase ? 26 : 0) +
    (hasNumbers ? 10 : 0) +
    (hasSymbols ? 32 : 0)
  ) : 0;
  
  const entropy = Math.log2(Math.pow(charset, length));
  if (entropy >= 60) score += 25;
  else if (entropy >= 40) score += 15;

  // Ensure score is within bounds
  score = Math.max(0, Math.min(100, score));

  return {
    score,
    isStrong: score >= 70,
    suggestions,
    details: {
      length,
      hasLowercase,
      hasUppercase,
      hasNumbers,
      hasSymbols,
      hasCommonPatterns,
      entropy
    }
  };
}

// Performance Utilities

/**
 * High-precision timing utility
 */
export class Timer {
  private startTime: number;
  private marks: Map<string, number> = new Map();

  constructor() {
    this.startTime = performance.now();
  }

  /**
   * Mark a specific point in time
   */
  mark(name: string): void {
    this.marks.set(name, performance.now());
  }

  /**
   * Get elapsed time since start
   */
  elapsed(): number {
    return performance.now() - this.startTime;
  }

  /**
   * Get time between marks
   */
  between(startMark: string, endMark: string): number {
    const start = this.marks.get(startMark);
    const end = this.marks.get(endMark);
    
    if (start === undefined || end === undefined) {
      throw new Error(`Mark not found: ${startMark} or ${endMark}`);
    }
    
    return end - start;
  }

  /**
   * Get all timing data
   */
  getTimings(): Record<string, number> {
    const timings: Record<string, number> = {
      total: this.elapsed()
    };
    
    for (const [name, time] of this.marks) {
      timings[name] = time - this.startTime;
    }
    
    return timings;
  }
}

/**
 * Memory usage tracker
 */
export class MemoryTracker {
  private baseline: NodeJS.MemoryUsage;

  constructor() {
    this.baseline = process.memoryUsage();
  }

  /**
   * Get current memory usage
   */
  current(): NodeJS.MemoryUsage {
    return process.memoryUsage();
  }

  /**
   * Get memory difference from baseline
   */
  diff(): NodeJS.MemoryUsage {
    const current = this.current();
    return {
      rss: current.rss - this.baseline.rss,
      heapTotal: current.heapTotal - this.baseline.heapTotal,
      heapUsed: current.heapUsed - this.baseline.heapUsed,
      external: current.external - this.baseline.external,
      arrayBuffers: current.arrayBuffers - this.baseline.arrayBuffers
    };
  }

  /**
   * Format memory usage for display
   */
  static formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = Math.abs(bytes);
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    const sign = bytes < 0 ? '-' : '';
    return `${sign}${size.toFixed(2)} ${units[unitIndex]}`;
  }
}

/**
 * Performance metrics calculator
 */
export function calculatePerformanceMetrics(measurements: number[]): {
  min: number;
  max: number;
  mean: number;
  median: number;
  p95: number;
  p99: number;
  stdDev: number;
} {
  if (measurements.length === 0) {
    return {
      min: 0, max: 0, mean: 0, median: 0, p95: 0, p99: 0, stdDev: 0
    };
  }

  const sorted = [...measurements].sort((a, b) => a - b);
  const len = sorted.length;
  
  const min = sorted[0];
  const max = sorted[len - 1];
  const mean = measurements.reduce((sum, val) => sum + val, 0) / len;
  
  const median = len % 2 === 0 ?
    (sorted[len / 2 - 1] + sorted[len / 2]) / 2 :
    sorted[Math.floor(len / 2)];
  
  const p95 = sorted[Math.floor(len * 0.95)];
  const p99 = sorted[Math.floor(len * 0.99)];
  
  const variance = measurements.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / len;
  const stdDev = Math.sqrt(variance);

  return { min, max, mean, median, p95, p99, stdDev };
}

// Cognitive Adaptation Utilities

/**
 * Calculate cognitive load score
 */
export function calculateCognitiveLoad(factors: {
  attention: number; // 0-1, where 1 is high attention
  processingSpeed: number; // 0-1, where 1 is fast processing
  memoryLoad: number; // 0-1, where 1 is high memory load
  taskComplexity: number; // 0-1, where 1 is high complexity
  timeOfDay: number; // 0-23 hours
  environmentalNoise?: number; // 0-1, where 1 is high noise
}): {
  score: number; // 0-1, where 1 is maximum cognitive load
  level: 'low' | 'moderate' | 'high' | 'critical';
  recommendations: string[];
} {
  const {
    attention,
    processingSpeed,
    memoryLoad,
    taskComplexity,
    timeOfDay,
    environmentalNoise = 0
  } = factors;

  // Time of day adjustment (assuming optimal performance 9-15h)
  let timeAdjustment = 1.0;
  if (timeOfDay < 6 || timeOfDay > 22) timeAdjustment = 1.3; // Night penalty
  else if (timeOfDay >= 9 && timeOfDay <= 15) timeAdjustment = 0.9; // Peak performance
  else timeAdjustment = 1.1; // Moderate adjustment

  // Calculate base cognitive load
  let score = (
    (1 - attention) * 0.3 +
    (1 - processingSpeed) * 0.25 +
    memoryLoad * 0.25 +
    taskComplexity * 0.15 +
    environmentalNoise * 0.05
  ) * timeAdjustment;

  score = Math.max(0, Math.min(1, score));

  // Determine level
  let level: 'low' | 'moderate' | 'high' | 'critical';
  if (score < 0.3) level = 'low';
  else if (score < 0.6) level = 'moderate';
  else if (score < 0.8) level = 'high';
  else level = 'critical';

  // Generate recommendations
  const recommendations: string[] = [];
  
  if (attention < 0.5) {
    recommendations.push('Reduce distractions');
    recommendations.push('Highlight important elements');
  }
  
  if (processingSpeed < 0.5) {
    recommendations.push('Slow down animations');
    recommendations.push('Provide more time for responses');
  }
  
  if (memoryLoad > 0.7) {
    recommendations.push('Simplify interface');
    recommendations.push('Reduce information density');
  }
  
  if (taskComplexity > 0.7) {
    recommendations.push('Break tasks into smaller steps');
    recommendations.push('Provide contextual help');
  }
  
  if (environmentalNoise > 0.5) {
    recommendations.push('Reduce visual noise');
    recommendations.push('Use high contrast colors');
  }

  return { score, level, recommendations };
}

/**
 * Generate accessibility adaptations based on user profile
 */
export function generateAccessibilityAdaptations(settings: AccessibilitySettings): {
  cssVariables: Record<string, string>;
  jsConfig: Record<string, any>;
  recommendations: string[];
} {
  const cssVariables: Record<string, string> = {};
  const jsConfig: Record<string, any> = {};
  const recommendations: string[] = [];

  // High contrast adaptations
  if (settings.highContrast) {
    cssVariables['--contrast-multiplier'] = '1.5';
    cssVariables['--background-color'] = '#000000';
    cssVariables['--text-color'] = '#ffffff';
    cssVariables['--border-width'] = '2px';
    recommendations.push('High contrast mode enabled');
  }

  // Large text adaptations
  if (settings.largeText) {
    cssVariables['--font-size-multiplier'] = '1.25';
    cssVariables['--line-height-multiplier'] = '1.6';
    cssVariables['--button-padding'] = '12px 16px';
    recommendations.push('Large text mode enabled');
  }

  // Reduced motion adaptations
  if (settings.reducedMotion) {
    cssVariables['--animation-duration'] = '0.01s';
    cssVariables['--transition-duration'] = '0.01s';
    jsConfig.animations = false;
    jsConfig.autoplay = false;
    recommendations.push('Reduced motion enabled');
  }

  // Screen reader optimizations
  if (settings.screenReader) {
    jsConfig.screenReaderOptimized = true;
    jsConfig.skipLinks = true;
    jsConfig.ariaLive = 'polite';
    recommendations.push('Screen reader optimizations enabled');
  }

  // Color blindness adaptations
  if (settings.colorBlindness !== 'none') {
    cssVariables['--color-filter'] = getColorBlindnessFilter(settings.colorBlindness);
    jsConfig.colorBlindnessType = settings.colorBlindness;
    recommendations.push(`${settings.colorBlindness} color blindness support enabled`);
  }

  // Dyslexia support
  if (settings.dyslexiaSupport) {
    cssVariables['--font-family'] = 'OpenDyslexic, Arial, sans-serif';
    cssVariables['--letter-spacing'] = '0.12em';
    cssVariables['--word-spacing'] = '0.16em';
    cssVariables['--paragraph-spacing'] = '1.8em';
    recommendations.push('Dyslexia support enabled');
  }

  return { cssVariables, jsConfig, recommendations };
}

/**
 * Get CSS filter for color blindness support
 */
function getColorBlindnessFilter(type: string): string {
  const filters = {
    protanopia: 'url(#protanopia-filter)',
    deuteranopia: 'url(#deuteranopia-filter)',
    tritanopia: 'url(#tritanopia-filter)'
  };
  
  return filters[type as keyof typeof filters] || 'none';
}

/**
 * Debounce function with cognitive load consideration
 */
export function cognitiveDebounce<T extends (...args: any[]) => void>(
  func: T,
  delay: number,
  cognitiveLoad?: number
): T {
  let timeoutId: NodeJS.Timeout;
  
  // Adjust delay based on cognitive load
  const adjustedDelay = cognitiveLoad ? delay * (1 + cognitiveLoad) : delay;
  
  return ((...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), adjustedDelay);
  }) as T;
}

/**
 * Throttle function with cognitive load consideration
 */
export function cognitiveThrottle<T extends (...args: any[]) => void>(
  func: T,
  delay: number,
  cognitiveLoad?: number
): T {
  let lastCall = 0;
  
  // Adjust delay based on cognitive load
  const adjustedDelay = cognitiveLoad ? delay * (1 + cognitiveLoad) : delay;
  
  return ((...args: any[]) => {
    const now = Date.now();
    if (now - lastCall >= adjustedDelay) {
      lastCall = now;
      func(...args);
    }
  }) as T;
}

// Data Processing Utilities

/**
 * Deep clone object (performance optimized)
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as unknown as T;
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as unknown as T;
  if (typeof obj === 'object') {
    const cloned: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = deepClone(obj[key]);
      }
    }
    return cloned;
  }
  return obj;
}

/**
 * Flatten nested object
 */
export function flattenObject(obj: Record<string, any>, prefix: string = '', separator: string = '.'): Record<string, any> {
  const flattened: Record<string, any> = {};
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const newKey = prefix ? `${prefix}${separator}${key}` : key;
      
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        Object.assign(flattened, flattenObject(obj[key], newKey, separator));
      } else {
        flattened[newKey] = obj[key];
      }
    }
  }
  
  return flattened;
}

/**
 * Group array by key function
 */
export function groupBy<T, K extends string | number>(
  array: T[],
  keyFn: (item: T) => K
): Record<K, T[]> {
  return array.reduce((groups, item) => {
    const key = keyFn(item);
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
    return groups;
  }, {} as Record<K, T[]>);
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  maxDelay: number = 30000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

/**
 * Rate limiter utility
 */
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private limit: number;
  private windowMs: number;

  constructor(limit: number, windowMs: number) {
    this.limit = limit;
    this.windowMs = windowMs;
  }

  /**
   * Check if request is allowed
   */
  isAllowed(key: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(key) || [];
    
    // Remove old requests outside window
    const validRequests = requests.filter(timestamp => now - timestamp < this.windowMs);
    
    if (validRequests.length >= this.limit) {
      return false;
    }
    
    // Add current request
    validRequests.push(now);
    this.requests.set(key, validRequests);
    
    return true;
  }

  /**
   * Get remaining requests for key
   */
  getRemaining(key: string): number {
    const now = Date.now();
    const requests = this.requests.get(key) || [];
    const validRequests = requests.filter(timestamp => now - timestamp < this.windowMs);
    
    return Math.max(0, this.limit - validRequests.length);
  }

  /**
   * Clear all requests for key
   */
  clear(key: string): void {
    this.requests.delete(key);
  }

  /**
   * Clear expired requests
   */
  cleanup(): void {
    const now = Date.now();
    
    for (const [key, requests] of this.requests.entries()) {
      const validRequests = requests.filter(timestamp => now - timestamp < this.windowMs);
      
      if (validRequests.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, validRequests);
      }
    }
  }
}

export default {
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
};
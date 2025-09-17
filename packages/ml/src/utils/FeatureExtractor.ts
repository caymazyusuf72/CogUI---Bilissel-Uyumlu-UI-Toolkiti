import { FeatureVector } from '../types';

export interface MouseTrackingData {
  positions: Array<{ x: number; y: number; timestamp: number }>;
  clicks: Array<{ x: number; y: number; timestamp: number; element?: string }>;
  scrollEvents: Array<{ deltaX: number; deltaY: number; timestamp: number }>;
  hoverEvents: Array<{ element: string; duration: number; timestamp: number }>;
}

export interface KeyboardTrackingData {
  keystrokes: Array<{ key: string; timestamp: number; duration?: number }>;
  errors: Array<{ timestamp: number; corrected: boolean }>;
  pauses: Array<{ duration: number; timestamp: number }>;
}

export interface NavigationTrackingData {
  pageViews: Array<{ url: string; timestamp: number; duration?: number }>;
  actions: Array<{ type: string; element: string; timestamp: number }>;
  backButtonClicks: number;
  searchQueries: Array<{ query: string; timestamp: number; results?: number }>;
}

export interface SessionData {
  startTime: number;
  endTime?: number;
  userId?: string;
  sessionId: string;
  deviceInfo: {
    userAgent: string;
    screenWidth: number;
    screenHeight: number;
    devicePixelRatio: number;
  };
  accessibility?: {
    reducedMotion: boolean;
    highContrast: boolean;
    screenReader: boolean;
  };
}

export interface BehaviorData {
  mouse: MouseTrackingData;
  keyboard: KeyboardTrackingData;
  navigation: NavigationTrackingData;
  session: SessionData;
  context?: {
    timeOfDay: number;
    dayOfWeek: number;
    userProfile?: any;
  };
}

export class FeatureExtractor {
  private windowSize: number;
  private samplingRate: number;

  constructor(options: { windowSize?: number; samplingRate?: number } = {}) {
    this.windowSize = options.windowSize || 5000; // 5 seconds
    this.samplingRate = options.samplingRate || 100; // 100ms
  }

  /**
   * Extract comprehensive behavioral features from tracking data
   */
  extractBehaviorFeatures(behaviorData: BehaviorData): FeatureVector {
    const mouseFeatures = this.extractMouseFeatures(behaviorData.mouse);
    const keyboardFeatures = this.extractKeyboardFeatures(behaviorData.keyboard);
    const navigationFeatures = this.extractNavigationFeatures(behaviorData.navigation);
    const temporalFeatures = this.extractTemporalFeatures(behaviorData);
    const contextFeatures = this.extractContextFeatures(behaviorData);

    return {
      // Mouse behavior features
      ...mouseFeatures,
      
      // Keyboard behavior features
      ...keyboardFeatures,
      
      // Navigation features
      ...navigationFeatures,
      
      // Temporal features
      ...temporalFeatures,
      
      // Context features
      ...contextFeatures
    };
  }

  /**
   * Extract mouse behavior features
   */
  private extractMouseFeatures(mouseData: MouseTrackingData): Partial<FeatureVector> {
    const positions = mouseData.positions;
    const clicks = mouseData.clicks;
    const scrollEvents = mouseData.scrollEvents;
    const hoverEvents = mouseData.hoverEvents;

    // Calculate mouse speed and acceleration
    const speeds: number[] = [];
    const accelerations: number[] = [];
    
    for (let i = 1; i < positions.length; i++) {
      const prev = positions[i - 1];
      const curr = positions[i];
      
      const distance = Math.sqrt(
        Math.pow(curr.x - prev.x, 2) + Math.pow(curr.y - prev.y, 2)
      );
      const timeDelta = curr.timestamp - prev.timestamp;
      const speed = timeDelta > 0 ? distance / timeDelta : 0;
      
      speeds.push(speed);
      
      if (i > 1 && speeds.length >= 2) {
        const prevSpeed = speeds[speeds.length - 2];
        const acceleration = Math.abs(speed - prevSpeed) / timeDelta;
        accelerations.push(acceleration);
      }
    }

    // Mouse movement patterns
    const mouseSpeed = this.calculateMean(speeds);
    const mouseAcceleration = this.calculateMean(accelerations);
    
    // Click patterns
    const clickFrequency = clicks.length / this.windowSize * 1000; // clicks per second
    
    // Scroll patterns
    const scrollPattern = this.extractScrollPattern(scrollEvents);
    
    // Hover behavior
    const hoverDuration = this.calculateMean(hoverEvents.map(h => h.duration));
    
    // Movement efficiency (straight line vs actual path)
    const efficiency = this.calculateMovementEfficiency(positions);
    
    // Tremor detection (high frequency, low amplitude movements)
    const tremorScore = this.detectTremor(positions);
    
    return {
      mouseSpeed,
      mouseAcceleration,
      clickFrequency,
      scrollPattern,
      hoverDuration,
      movementEfficiency: efficiency,
      tremorScore
    };
  }

  /**
   * Extract keyboard behavior features
   */
  private extractKeyboardFeatures(keyboardData: KeyboardTrackingData): Partial<FeatureVector> {
    const keystrokes = keyboardData.keystrokes;
    const errors = keyboardData.errors;
    const pauses = keyboardData.pauses;

    // Typing speed (characters per minute)
    const totalTime = keystrokes.length > 0 
      ? keystrokes[keystrokes.length - 1].timestamp - keystrokes[0].timestamp
      : 0;
    const typingSpeed = totalTime > 0 ? (keystrokes.length / totalTime) * 60000 : 0;

    // Error rate
    const errorRate = keystrokes.length > 0 ? errors.length / keystrokes.length : 0;

    // Keystroke rhythm analysis
    const keyboardRhythm = this.extractKeystrokeRhythm(keystrokes);
    
    // Pause pattern analysis
    const pausePattern = this.extractPausePattern(pauses);
    
    // Pause frequency
    const pauseFrequency = pauses.length / this.windowSize * 1000;

    return {
      typingSpeed,
      errorRate,
      keyboardRhythm,
      pausePattern,
      pauseFrequency
    };
  }

  /**
   * Extract navigation behavior features
   */
  private extractNavigationFeatures(navigationData: NavigationTrackingData): Partial<FeatureVector> {
    const pageViews = navigationData.pageViews;
    const actions = navigationData.actions;
    const backButtonClicks = navigationData.backButtonClicks;
    const searchQueries = navigationData.searchQueries;

    // Page view duration
    const pageViewDuration = pageViews.length > 0 
      ? this.calculateMean(pageViews.map(pv => pv.duration || 0).filter(d => d > 0))
      : 0;

    // Navigation pattern (convert to numeric representation)
    const navigationPattern = pageViews.map(pv => this.categorizeUrl(pv.url));

    // Back button usage rate
    const backButtonUsage = pageViews.length > 0 ? backButtonClicks / pageViews.length : 0;

    // Search behavior
    const searchBehavior = searchQueries.length / this.windowSize * 1000;

    return {
      pageViewDuration,
      navigationPattern,
      backButtonUsage,
      searchBehavior
    };
  }

  /**
   * Extract temporal features
   */
  private extractTemporalFeatures(behaviorData: BehaviorData): Partial<FeatureVector> {
    const session = behaviorData.session;
    const context = behaviorData.context;

    const timeOfDay = context?.timeOfDay || new Date().getHours();
    const sessionDuration = session.endTime 
      ? session.endTime - session.startTime 
      : Date.now() - session.startTime;

    // Calculate interaction frequency
    const totalInteractions = 
      behaviorData.mouse.clicks.length + 
      behaviorData.keyboard.keystrokes.length +
      behaviorData.navigation.actions.length;
    
    const interactionFrequency = sessionDuration > 0 
      ? totalInteractions / sessionDuration * 1000 
      : 0;

    return {
      timeOfDay,
      sessionDuration,
      interactionFrequency
    };
  }

  /**
   * Extract context features
   */
  private extractContextFeatures(behaviorData: BehaviorData): Partial<FeatureVector> {
    const session = behaviorData.session;
    const deviceInfo = session.deviceInfo;

    // Device type classification
    const deviceType = this.classifyDeviceType(deviceInfo);
    
    // Screen size
    const screenSize = {
      width: deviceInfo.screenWidth,
      height: deviceInfo.screenHeight
    };

    // Browser capabilities (simplified)
    const browserCapabilities = this.extractBrowserCapabilities(deviceInfo.userAgent);

    // User profile features (if available)
    const context = behaviorData.context;
    const userProfile = context?.userProfile;

    return {
      deviceType,
      screenSize,
      browserCapabilities,
      age: userProfile?.age,
      experienceLevel: userProfile?.experienceLevel || 'intermediate',
      accessibilityNeeds: session.accessibility 
        ? this.extractAccessibilityNeeds(session.accessibility)
        : []
    };
  }

  /**
   * Extract scroll behavior pattern
   */
  private extractScrollPattern(scrollEvents: Array<{ deltaX: number; deltaY: number; timestamp: number }>): number[] {
    if (scrollEvents.length === 0) return [0, 0, 0, 0, 0];

    const verticalScrolls = scrollEvents.map(e => e.deltaY);
    const horizontalScrolls = scrollEvents.map(e => e.deltaX);

    // Calculate scroll statistics
    const avgVertical = this.calculateMean(verticalScrolls);
    const avgHorizontal = this.calculateMean(horizontalScrolls);
    const scrollSpeed = this.calculateScrollSpeed(scrollEvents);
    const scrollDirection = this.calculateScrollDirection(scrollEvents);
    const scrollSmoothness = this.calculateScrollSmoothness(scrollEvents);

    return [avgVertical, avgHorizontal, scrollSpeed, scrollDirection, scrollSmoothness];
  }

  /**
   * Extract keystroke rhythm pattern
   */
  private extractKeystrokeRhythm(keystrokes: Array<{ key: string; timestamp: number }>): number[] {
    if (keystrokes.length < 2) return [0, 0, 0, 0, 0];

    const intervals: number[] = [];
    for (let i = 1; i < keystrokes.length; i++) {
      intervals.push(keystrokes[i].timestamp - keystrokes[i - 1].timestamp);
    }

    // Rhythm analysis
    const avgInterval = this.calculateMean(intervals);
    const rhythmVariability = this.calculateStandardDeviation(intervals);
    const rhythmConsistency = rhythmVariability > 0 ? avgInterval / rhythmVariability : 1;

    return [avgInterval, rhythmVariability, rhythmConsistency, 0, 0];
  }

  /**
   * Extract pause pattern
   */
  private extractPausePattern(pauses: Array<{ duration: number; timestamp: number }>): number[] {
    if (pauses.length === 0) return [0, 0, 0];

    const durations = pauses.map(p => p.duration);
    const avgPause = this.calculateMean(durations);
    const longPauses = durations.filter(d => d > 1000).length; // Pauses > 1 second
    const pauseVariability = this.calculateStandardDeviation(durations);

    return [avgPause, longPauses, pauseVariability];
  }

  /**
   * Calculate movement efficiency
   */
  private calculateMovementEfficiency(positions: Array<{ x: number; y: number; timestamp: number }>): number {
    if (positions.length < 2) return 1;

    const start = positions[0];
    const end = positions[positions.length - 1];
    
    // Direct distance
    const directDistance = Math.sqrt(
      Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
    );

    // Actual path distance
    let actualDistance = 0;
    for (let i = 1; i < positions.length; i++) {
      const prev = positions[i - 1];
      const curr = positions[i];
      actualDistance += Math.sqrt(
        Math.pow(curr.x - prev.x, 2) + Math.pow(curr.y - prev.y, 2)
      );
    }

    return actualDistance > 0 ? directDistance / actualDistance : 1;
  }

  /**
   * Detect tremor in mouse movements
   */
  private detectTremor(positions: Array<{ x: number; y: number; timestamp: number }>): number {
    if (positions.length < 10) return 0;

    // Look for high-frequency, low-amplitude oscillations
    const movements: number[] = [];
    for (let i = 1; i < positions.length; i++) {
      const prev = positions[i - 1];
      const curr = positions[i];
      const distance = Math.sqrt(
        Math.pow(curr.x - prev.x, 2) + Math.pow(curr.y - prev.y, 2)
      );
      movements.push(distance);
    }

    // Simple tremor detection: high frequency of small movements
    const smallMovements = movements.filter(m => m < 5 && m > 0).length;
    const tremorScore = movements.length > 0 ? smallMovements / movements.length : 0;

    return tremorScore;
  }

  /**
   * Classify device type based on device info
   */
  private classifyDeviceType(deviceInfo: { userAgent: string; screenWidth: number; screenHeight: number }): 'mobile' | 'tablet' | 'desktop' {
    const userAgent = deviceInfo.userAgent.toLowerCase();
    const screenWidth = deviceInfo.screenWidth;

    if (userAgent.includes('mobile') || screenWidth < 768) {
      return 'mobile';
    } else if (screenWidth < 1024) {
      return 'tablet';
    } else {
      return 'desktop';
    }
  }

  /**
   * Extract browser capabilities
   */
  private extractBrowserCapabilities(userAgent: string): string[] {
    const capabilities: string[] = [];
    
    if (userAgent.includes('Chrome')) capabilities.push('chrome');
    if (userAgent.includes('Firefox')) capabilities.push('firefox');
    if (userAgent.includes('Safari')) capabilities.push('safari');
    if (userAgent.includes('Edge')) capabilities.push('edge');
    
    // Add more capability detection as needed
    return capabilities;
  }

  /**
   * Extract accessibility needs
   */
  private extractAccessibilityNeeds(accessibility: { reducedMotion: boolean; highContrast: boolean; screenReader: boolean }): string[] {
    const needs: string[] = [];
    
    if (accessibility.reducedMotion) needs.push('reduced-motion');
    if (accessibility.highContrast) needs.push('high-contrast');
    if (accessibility.screenReader) needs.push('screen-reader');
    
    return needs;
  }

  /**
   * Categorize URL for navigation pattern analysis
   */
  private categorizeUrl(url: string): string {
    if (url.includes('/home')) return 'home';
    if (url.includes('/profile')) return 'profile';
    if (url.includes('/search')) return 'search';
    if (url.includes('/settings')) return 'settings';
    if (url.includes('/help')) return 'help';
    return 'other';
  }

  /**
   * Calculate scroll speed
   */
  private calculateScrollSpeed(scrollEvents: Array<{ deltaX: number; deltaY: number; timestamp: number }>): number {
    if (scrollEvents.length < 2) return 0;

    const speeds: number[] = [];
    for (let i = 1; i < scrollEvents.length; i++) {
      const prev = scrollEvents[i - 1];
      const curr = scrollEvents[i];
      const distance = Math.abs(curr.deltaY);
      const timeDelta = curr.timestamp - prev.timestamp;
      if (timeDelta > 0) {
        speeds.push(distance / timeDelta);
      }
    }

    return this.calculateMean(speeds);
  }

  /**
   * Calculate scroll direction consistency
   */
  private calculateScrollDirection(scrollEvents: Array<{ deltaX: number; deltaY: number; timestamp: number }>): number {
    if (scrollEvents.length === 0) return 0;

    let upCount = 0;
    let downCount = 0;

    scrollEvents.forEach(event => {
      if (event.deltaY > 0) downCount++;
      else if (event.deltaY < 0) upCount++;
    });

    const total = upCount + downCount;
    return total > 0 ? Math.abs(upCount - downCount) / total : 0;
  }

  /**
   * Calculate scroll smoothness
   */
  private calculateScrollSmoothness(scrollEvents: Array<{ deltaX: number; deltaY: number; timestamp: number }>): number {
    if (scrollEvents.length < 2) return 1;

    const deltas = scrollEvents.map(e => Math.abs(e.deltaY));
    const variance = this.calculateVariance(deltas);
    const mean = this.calculateMean(deltas);

    return mean > 0 ? 1 / (1 + variance / mean) : 1;
  }

  // Statistical utility methods
  private calculateMean(values: number[]): number {
    return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
  }

  private calculateStandardDeviation(values: number[]): number {
    const mean = this.calculateMean(values);
    const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
    const variance = this.calculateMean(squaredDiffs);
    return Math.sqrt(variance);
  }

  private calculateVariance(values: number[]): number {
    const mean = this.calculateMean(values);
    const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
    return this.calculateMean(squaredDiffs);
  }
}
import { BehaviorSubject, Observable, fromEvent, merge, interval } from 'rxjs';
import { AttentionData, AttentionMetrics, InteractionEvent, SensorConfig } from '../types';

export class AttentionTracker {
  private isTracking = false;
  private attentionData: AttentionData[] = [];
  private interactions: InteractionEvent[] = [];
  private currentFocusedElement: Element | null = null;
  private focusStartTime = 0;
  private taskSwitches = 0;
  private metricsSubject = new BehaviorSubject<AttentionMetrics | null>(null);
  private currentFocusSubject = new BehaviorSubject<Element | null>(null);

  private config: Required<Pick<SensorConfig, 'attentionSampleRate'>> = {
    attentionSampleRate: 1000, // 1000ms
  };

  constructor(config?: Partial<SensorConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  start(): void {
    if (this.isTracking || typeof window === 'undefined') return;

    this.isTracking = true;
    this.attentionData = [];
    this.interactions = [];
    this.taskSwitches = 0;
    this.focusStartTime = Date.now();

    this.setupEventListeners();
    this.startPeriodicAnalysis();
  }

  stop(): void {
    this.isTracking = false;
    this.calculateMetrics();
  }

  getMetrics(): Observable<AttentionMetrics | null> {
    return this.metricsSubject.asObservable();
  }

  getCurrentFocus(): Observable<Element | null> {
    return this.currentFocusSubject.asObservable();
  }

  getCurrentMetrics(): AttentionMetrics | null {
    return this.metricsSubject.getValue();
  }

  reset(): void {
    this.attentionData = [];
    this.interactions = [];
    this.taskSwitches = 0;
    this.currentFocusedElement = null;
    this.focusStartTime = Date.now();
    this.metricsSubject.next(null);
    this.currentFocusSubject.next(null);
  }

  private setupEventListeners(): void {
    if (!this.isTracking) return;

    // Focus events
    fromEvent(document, 'focusin').subscribe((event: Event) => {
      if (!this.isTracking) return;
      this.handleFocusChange(event.target as Element, 'focus');
    });

    fromEvent(document, 'focusout').subscribe((event: Event) => {
      if (!this.isTracking) return;
      this.handleFocusChange(null, 'focus');
    });

    // Click events for attention tracking
    fromEvent(document, 'click').subscribe((event: Event) => {
      if (!this.isTracking) return;
      this.trackInteraction('click', event.target as Element, {
        x: (event as MouseEvent).clientX,
        y: (event as MouseEvent).clientY
      });
    });

    // Hover events
    fromEvent(document, 'mouseenter', { capture: true }).subscribe((event: Event) => {
      if (!this.isTracking) return;
      this.trackInteraction('hover', event.target as Element);
    });

    // Scroll events
    fromEvent(document, 'scroll', { passive: true }).subscribe((event: Event) => {
      if (!this.isTracking) return;
      this.trackInteraction('scroll', event.target as Element);
    });

    // Keyboard events
    fromEvent(document, 'keydown').subscribe((event: Event) => {
      if (!this.isTracking) return;
      this.trackInteraction('keypress', document.activeElement);
    });

    // Visibility change (tab switching, window focus)
    fromEvent(document, 'visibilitychange').subscribe(() => {
      if (!this.isTracking) return;
      
      if (document.hidden) {
        this.taskSwitches++;
        this.recordAttentionData(null, 0);
      } else {
        this.focusStartTime = Date.now();
      }
    });

    // Window focus/blur
    fromEvent(window, 'blur').subscribe(() => {
      if (!this.isTracking) return;
      this.taskSwitches++;
    });

    fromEvent(window, 'focus').subscribe(() => {
      if (!this.isTracking) return;
      this.focusStartTime = Date.now();
    });
  }

  private startPeriodicAnalysis(): void {
    if (!this.isTracking) return;

    // Periodic attention data collection
    interval(this.config.attentionSampleRate).subscribe(() => {
      if (!this.isTracking) return;

      const activeElement = document.activeElement;
      const focusTime = activeElement === this.currentFocusedElement 
        ? Date.now() - this.focusStartTime 
        : 0;

      this.recordAttentionData(activeElement, focusTime);
      this.updateMetricsRealtime();
    });
  }

  private handleFocusChange(element: Element | null, eventType: string): void {
    if (element !== this.currentFocusedElement) {
      // Focus changed - count as task switch if meaningful
      if (this.currentFocusedElement && element) {
        const currentType = this.getElementType(this.currentFocusedElement);
        const newType = this.getElementType(element);
        
        // Count as task switch if switching between different types of elements
        if (currentType !== newType) {
          this.taskSwitches++;
        }
      }

      this.currentFocusedElement = element;
      this.focusStartTime = Date.now();
      this.currentFocusSubject.next(element);
    }

    this.trackInteraction(eventType as any, element);
  }

  private trackInteraction(
    type: InteractionEvent['type'], 
    element: Element | null,
    position?: { x: number; y: number }
  ): void {
    const interaction: InteractionEvent = {
      type,
      element,
      elementType: element ? this.getElementType(element) : 'unknown',
      position,
      timestamp: Date.now()
    };

    this.interactions.push(interaction);

    // Keep only last 1000 interactions
    if (this.interactions.length > 1000) {
      this.interactions = this.interactions.slice(-1000);
    }
  }

  private recordAttentionData(element: Element | null, focusTime: number): void {
    const data: AttentionData = {
      focusedElement: element,
      focusTime,
      gazeDuration: focusTime, // Simplified - in real implementation this would use eye tracking
      blinkRate: 15, // Default blink rate - would need eye tracking for real data
      taskSwitches: this.taskSwitches,
      timestamp: Date.now()
    };

    this.attentionData.push(data);

    // Keep only last 100 data points
    if (this.attentionData.length > 100) {
      this.attentionData = this.attentionData.slice(-100);
    }
  }

  private getElementType(element: Element): string {
    if (!element) return 'unknown';

    const tagName = element.tagName.toLowerCase();
    const role = element.getAttribute('role');
    
    if (role) return role;
    
    // Common element type classifications
    if (['input', 'textarea', 'select'].includes(tagName)) return 'form-control';
    if (['button', 'a'].includes(tagName)) return 'interactive';
    if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) return 'heading';
    if (['p', 'span', 'div'].includes(tagName)) return 'content';
    if (['img', 'svg', 'canvas'].includes(tagName)) return 'media';
    if (['nav', 'header', 'footer', 'aside'].includes(tagName)) return 'navigation';
    
    return tagName;
  }

  private calculateAverageFocusTime(): number {
    if (this.attentionData.length === 0) return 0;

    const validFocusTimes = this.attentionData
      .map(data => data.focusTime)
      .filter(time => time > 0);

    if (validFocusTimes.length === 0) return 0;

    return validFocusTimes.reduce((sum, time) => sum + time, 0) / validFocusTimes.length;
  }

  private calculateMaxFocusTime(): number {
    if (this.attentionData.length === 0) return 0;

    return Math.max(...this.attentionData.map(data => data.focusTime));
  }

  private calculateTaskSwitchFrequency(): number {
    if (this.attentionData.length === 0) return 0;

    const sessionDuration = Date.now() - (this.attentionData[0]?.timestamp || Date.now());
    const minutes = sessionDuration / (1000 * 60);
    
    return minutes > 0 ? this.taskSwitches / minutes : 0;
  }

  private calculateAttentionStability(): number {
    if (this.attentionData.length < 2) return 1;

    // Calculate how consistently user focuses on elements
    const focusDurations = this.attentionData
      .map(data => data.focusTime)
      .filter(time => time > 0);

    if (focusDurations.length === 0) return 0;

    const mean = focusDurations.reduce((a, b) => a + b, 0) / focusDurations.length;
    const variance = focusDurations.reduce((sum, duration) => {
      return sum + Math.pow(duration - mean, 2);
    }, 0) / focusDurations.length;

    const standardDeviation = Math.sqrt(variance);
    const coefficientOfVariation = mean > 0 ? standardDeviation / mean : 1;

    // Convert to stability score (lower CV = higher stability)
    return Math.max(0, Math.min(1, 1 - coefficientOfVariation));
  }

  private calculateDistractionLevel(): number {
    const taskSwitchFreq = this.calculateTaskSwitchFrequency();
    
    // Normalize task switch frequency to distraction level
    // More than 10 switches per minute = high distraction
    return Math.min(1, taskSwitchFreq / 10);
  }

  private calculateEngagementScore(): number {
    const avgFocusTime = this.calculateAverageFocusTime();
    const stability = this.calculateAttentionStability();
    const distraction = this.calculateDistractionLevel();
    
    // Simple engagement formula
    // High focus time + high stability + low distraction = high engagement
    const focusScore = Math.min(1, avgFocusTime / 5000); // 5 seconds as good focus time
    const engagementScore = (focusScore + stability + (1 - distraction)) / 3;
    
    return Math.max(0, Math.min(1, engagementScore));
  }

  private updateMetricsRealtime(): void {
    const metrics = this.calculateCurrentMetrics();
    this.metricsSubject.next(metrics);
  }

  private calculateCurrentMetrics(): AttentionMetrics {
    return {
      averageFocusTime: this.calculateAverageFocusTime(),
      maxFocusTime: this.calculateMaxFocusTime(),
      taskSwitchFrequency: this.calculateTaskSwitchFrequency(),
      attentionStability: this.calculateAttentionStability(),
      distractionLevel: this.calculateDistractionLevel(),
      engagementScore: this.calculateEngagementScore()
    };
  }

  private calculateMetrics(): void {
    const metrics = this.calculateCurrentMetrics();
    this.metricsSubject.next(metrics);
  }
}
import { BehaviorSubject, Observable, fromEvent, merge, map, throttleTime, scan, filter } from 'rxjs';
import { MouseTrackingData, MouseMetrics, ClickEvent, ScrollEvent, SensorConfig } from '../types';

export class MouseTracker {
  private isTracking = false;
  private trackingData: MouseTrackingData[] = [];
  private clicks: ClickEvent[] = [];
  private scrolls: ScrollEvent[] = [];
  private lastPosition: { x: number; y: number } = { x: 0, y: 0 };
  private lastTimestamp = 0;
  private hesitationCount = 0;
  private metricsSubject = new BehaviorSubject<MouseMetrics | null>(null);

  private config: Required<Pick<SensorConfig, 'mouseTrackingSampleRate' | 'hesitationThreshold'>> = {
    mouseTrackingSampleRate: 50, // 50ms
    hesitationThreshold: 200, // 200ms
  };

  constructor(config?: Partial<SensorConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  start(): void {
    if (this.isTracking || typeof window === 'undefined') return;

    this.isTracking = true;
    this.trackingData = [];
    this.clicks = [];
    this.scrolls = [];
    this.hesitationCount = 0;
    this.lastTimestamp = Date.now();

    this.setupEventListeners();
  }

  stop(): void {
    this.isTracking = false;
    this.calculateMetrics();
  }

  getMetrics(): Observable<MouseMetrics | null> {
    return this.metricsSubject.asObservable();
  }

  getCurrentMetrics(): MouseMetrics | null {
    return this.metricsSubject.getValue();
  }

  reset(): void {
    this.trackingData = [];
    this.clicks = [];
    this.scrolls = [];
    this.hesitationCount = 0;
    this.metricsSubject.next(null);
  }

  private setupEventListeners(): void {
    if (!this.isTracking) return;

    // Mouse movement tracking
    const mouseMove$ = fromEvent<MouseEvent>(document, 'mousemove').pipe(
      throttleTime(this.config.mouseTrackingSampleRate),
      map((event: MouseEvent) => ({
        x: event.clientX,
        y: event.clientY,
        timestamp: Date.now(),
        pressure: (event as any).pressure || 0.5 // Fallback for devices without pressure
      })),
      scan((acc: MouseTrackingData[], curr) => {
        const last = acc[acc.length - 1];
        const deltaTime = last ? curr.timestamp - last.timestamp : 0;
        const deltaX = last ? curr.x - last.position.x : 0;
        const deltaY = last ? curr.y - last.position.y : 0;
        
        const velocity = deltaTime > 0 ? {
          vx: deltaX / deltaTime,
          vy: deltaY / deltaTime
        } : { vx: 0, vy: 0 };

        const acceleration = last ? {
          ax: (velocity.vx - last.velocity.vx) / deltaTime,
          ay: (velocity.vy - last.velocity.vy) / deltaTime
        } : { ax: 0, ay: 0 };

        const data: MouseTrackingData = {
          position: { x: curr.x, y: curr.y },
          velocity,
          acceleration,
          timestamp: curr.timestamp,
          pressure: curr.pressure
        };

        // Hesitation detection
        if (deltaTime > this.config.hesitationThreshold && last) {
          this.hesitationCount++;
        }

        return [...acc.slice(-100), data]; // Keep last 100 points
      }, [])
    );

    // Click tracking
    const click$ = fromEvent<MouseEvent>(document, 'click').pipe(
      map((event: MouseEvent) => {
        const target = event.target as Element;
        const rect = target?.getBoundingClientRect();
        
        return {
          position: { x: event.clientX, y: event.clientY },
          target,
          targetSize: rect ? { width: rect.width, height: rect.height } : { width: 0, height: 0 },
          accuracy: this.calculateClickAccuracy(event, target),
          timestamp: Date.now(),
          reactionTime: this.calculateReactionTime()
        };
      })
    );

    // Scroll tracking
    const scroll$ = fromEvent<WheelEvent>(document, 'wheel').pipe(
      throttleTime(100), // Throttle scroll events
      map((event: WheelEvent) => ({
        direction: this.getScrollDirection(event),
        distance: Math.abs(event.deltaY) + Math.abs(event.deltaX),
        speed: Math.abs(event.deltaY) + Math.abs(event.deltaX),
        timestamp: Date.now(),
        element: event.target as Element
      }))
    );

    // Subscribe to events
    mouseMove$.subscribe((data) => {
      if (this.isTracking) {
        this.trackingData = data;
        this.updateMetricsRealtime();
      }
    });

    click$.subscribe((clickData) => {
      if (this.isTracking) {
        this.clicks.push(clickData);
        this.updateMetricsRealtime();
      }
    });

    scroll$.subscribe((scrollData) => {
      if (this.isTracking) {
        this.scrolls.push(scrollData);
      }
    });
  }

  private calculateClickAccuracy(event: MouseEvent, target: Element): number {
    if (!target) return 0;

    const rect = target.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const distance = Math.sqrt(
      Math.pow(event.clientX - centerX, 2) + Math.pow(event.clientY - centerY, 2)
    );
    
    const maxDistance = Math.sqrt(Math.pow(rect.width / 2, 2) + Math.pow(rect.height / 2, 2));
    
    return maxDistance > 0 ? Math.max(0, 1 - distance / maxDistance) : 1;
  }

  private calculateReactionTime(): number {
    // Simplified reaction time calculation
    const now = Date.now();
    const timeSinceLastMove = this.trackingData.length > 0 ? 
      now - this.trackingData[this.trackingData.length - 1].timestamp : 0;
    
    return timeSinceLastMove;
  }

  private getScrollDirection(event: WheelEvent): 'up' | 'down' | 'left' | 'right' {
    if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
      return event.deltaY > 0 ? 'down' : 'up';
    } else {
      return event.deltaX > 0 ? 'right' : 'left';
    }
  }

  private calculateSmoothness(): number {
    if (this.trackingData.length < 3) return 1;

    let totalJerkiness = 0;
    let count = 0;

    for (let i = 2; i < this.trackingData.length; i++) {
      const prev2 = this.trackingData[i - 2];
      const prev1 = this.trackingData[i - 1];
      const curr = this.trackingData[i];

      // Calculate jerk (rate of change of acceleration)
      const jerkX = curr.acceleration.ax - prev1.acceleration.ax;
      const jerkY = curr.acceleration.ay - prev1.acceleration.ay;
      const jerk = Math.sqrt(jerkX * jerkX + jerkY * jerkY);

      totalJerkiness += jerk;
      count++;
    }

    const averageJerk = count > 0 ? totalJerkiness / count : 0;
    
    // Convert to smoothness score (inverse of jerkiness, normalized)
    return Math.max(0, Math.min(1, 1 - averageJerk / 100));
  }

  private calculateAverageSpeed(): number {
    if (this.trackingData.length < 2) return 0;

    const totalSpeed = this.trackingData.reduce((sum, data) => {
      const speed = Math.sqrt(data.velocity.vx * data.velocity.vx + data.velocity.vy * data.velocity.vy);
      return sum + speed;
    }, 0);

    return totalSpeed / this.trackingData.length;
  }

  private calculateTremor(): number {
    if (this.trackingData.length < 5) return 0;

    // Calculate variance in velocity to detect tremor
    const speeds = this.trackingData.map(data => 
      Math.sqrt(data.velocity.vx * data.velocity.vx + data.velocity.vy * data.velocity.vy)
    );

    const meanSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;
    const variance = speeds.reduce((sum, speed) => sum + Math.pow(speed - meanSpeed, 2), 0) / speeds.length;
    
    // Normalize tremor score
    return Math.min(1, variance / 1000);
  }

  private calculateDwellTime(): number {
    if (this.trackingData.length < 2) return 0;

    let totalDwellTime = 0;
    let dwellCount = 0;
    const dwellThreshold = 10; // pixels

    for (let i = 1; i < this.trackingData.length; i++) {
      const prev = this.trackingData[i - 1];
      const curr = this.trackingData[i];
      
      const distance = Math.sqrt(
        Math.pow(curr.position.x - prev.position.x, 2) + 
        Math.pow(curr.position.y - prev.position.y, 2)
      );

      if (distance < dwellThreshold) {
        totalDwellTime += curr.timestamp - prev.timestamp;
        dwellCount++;
      }
    }

    return dwellCount > 0 ? totalDwellTime / dwellCount : 0;
  }

  private updateMetricsRealtime(): void {
    if (this.trackingData.length < 2) return;

    const metrics = this.calculateCurrentMetrics();
    this.metricsSubject.next(metrics);
  }

  private calculateCurrentMetrics(): MouseMetrics {
    const averageClickAccuracy = this.clicks.length > 0 
      ? this.clicks.reduce((sum, click) => sum + click.accuracy, 0) / this.clicks.length 
      : 1;

    return {
      averageSpeed: this.calculateAverageSpeed(),
      smoothness: this.calculateSmoothness(),
      accuracy: averageClickAccuracy,
      hesitationCount: this.hesitationCount,
      tremor: this.calculateTremor(),
      dwellTime: this.calculateDwellTime()
    };
  }

  private calculateMetrics(): void {
    const metrics = this.calculateCurrentMetrics();
    this.metricsSubject.next(metrics);
  }
}
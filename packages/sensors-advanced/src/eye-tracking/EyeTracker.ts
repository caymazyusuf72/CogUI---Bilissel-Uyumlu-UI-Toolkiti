// @ts-ignore - WebGazer doesn't have official types
import webgazer from 'webgazer';
import { Observable, Subject, BehaviorSubject, fromEvent, merge } from 'rxjs';
import { 
  map, 
  filter, 
  debounceTime, 
  throttleTime, 
  scan, 
  distinctUntilChanged,
  shareReplay 
} from 'rxjs/operators';
import { 
  EyeTrackingData, 
  GazePoint, 
  FixationEvent, 
  SaccadeEvent, 
  BlinkEvent,
  EyeTrackingCalibration,
  Point2D,
  SensorStatus
} from '../types';

export interface EyeTrackerConfig {
  enabled: boolean;
  samplingRate: number;
  smoothingFactor: number;
  calibrationPoints: number;
  recalibrationInterval: number;
  fixationThreshold: {
    dispersion: number; // pixels
    duration: number; // milliseconds
  };
  saccadeThreshold: {
    velocity: number; // pixels/second
    amplitude: number; // pixels
  };
  blinkDetection: {
    enabled: boolean;
    confidenceThreshold: number;
    durationThreshold: number;
  };
  privacy: {
    storeData: boolean;
    encryptData: boolean;
    maxRetention: number; // days
  };
}

export class EyeTracker {
  private config: EyeTrackerConfig;
  private isInitialized: boolean = false;
  private isCalibrated: boolean = false;
  private isTracking: boolean = false;

  // Subjects for reactive streams
  private gazeSubject = new Subject<GazePoint>();
  private fixationSubject = new Subject<FixationEvent>();
  private saccadeSubject = new Subject<SaccadeEvent>();
  private blinkSubject = new Subject<BlinkEvent>();
  private statusSubject = new BehaviorSubject<SensorStatus>({
    sensor: 'eye-tracking',
    active: false,
    calibrated: false,
    accuracy: 0,
    lastUpdate: new Date(),
    errorCount: 0,
    performanceMetrics: {
      fps: 0,
      latency: 0,
      cpuUsage: 0,
      memoryUsage: 0
    }
  });

  // Data buffers for analysis
  private gazeBuffer: GazePoint[] = [];
  private fixationBuffer: FixationEvent[] = [];
  private currentFixation: FixationEvent | null = null;
  private lastGazePoint: GazePoint | null = null;

  // Calibration data
  private calibrationData: EyeTrackingCalibration | null = null;
  
  // Performance tracking
  private frameCount = 0;
  private lastFPSUpdate = Date.now();
  private latencySum = 0;
  private latencyCount = 0;

  constructor(config?: Partial<EyeTrackerConfig>) {
    this.config = {
      enabled: true,
      samplingRate: 60, // Hz
      smoothingFactor: 0.1,
      calibrationPoints: 9,
      recalibrationInterval: 300000, // 5 minutes
      fixationThreshold: {
        dispersion: 25, // pixels
        duration: 100 // milliseconds
      },
      saccadeThreshold: {
        velocity: 30, // pixels/second
        amplitude: 10 // pixels
      },
      blinkDetection: {
        enabled: true,
        confidenceThreshold: 0.7,
        durationThreshold: 150 // milliseconds
      },
      privacy: {
        storeData: true,
        encryptData: true,
        maxRetention: 7 // days
      },
      ...config
    };
  }

  /**
   * Initialize the eye tracker
   */
  async initialize(): Promise<boolean> {
    if (!this.config.enabled) {
      return false;
    }

    try {
      // Check for camera permission
      await this.requestCameraPermission();

      // Initialize WebGazer
      await this.initializeWebGazer();

      // Set up event listeners
      this.setupEventListeners();

      this.isInitialized = true;
      this.updateStatus({ active: true });

      console.log('EyeTracker initialized successfully');
      return true;

    } catch (error) {
      console.error('Failed to initialize EyeTracker:', error);
      this.updateStatus({ active: false });
      return false;
    }
  }

  /**
   * Request camera permission
   */
  private async requestCameraPermission(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      // Stop the stream immediately as we just needed permission
      stream.getTracks().forEach(track => track.stop());
    } catch (error) {
      throw new Error('Camera permission required for eye tracking');
    }
  }

  /**
   * Initialize WebGazer library
   */
  private async initializeWebGazer(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        webgazer
          .setGazeListener((data: any) => {
            if (data) {
              this.processGazeData(data);
            }
          })
          .setRegression('ridge') // Use ridge regression
          .setTracker('clmtrackr') // Use CLM face tracker
          .begin();

        // Wait for WebGazer to be ready
        const checkReady = () => {
          if (webgazer.isReady()) {
            resolve();
          } else {
            setTimeout(checkReady, 100);
          }
        };
        checkReady();

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Set up event listeners
   */
  private setupEventListeners(): void {
    // Window visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pauseTracking();
      } else {
        this.resumeTracking();
      }
    });

    // Auto-recalibration timer
    if (this.config.recalibrationInterval > 0) {
      setInterval(() => {
        if (this.isTracking && this.isCalibrated) {
          this.checkCalibrationAccuracy();
        }
      }, this.config.recalibrationInterval);
    }
  }

  /**
   * Process raw gaze data from WebGazer
   */
  private processGazeData(data: { x: number; y: number }): void {
    const now = Date.now();
    const processingStart = performance.now();

    const gazePoint: GazePoint = {
      x: data.x,
      y: data.y,
      timestamp: now,
      date: new Date(now),
      confidence: this.calculateConfidence(data),
      pupilDiameter: this.estimatePupilDiameter()
    };

    // Apply smoothing
    if (this.lastGazePoint && this.config.smoothingFactor > 0) {
      gazePoint.x = this.smooth(gazePoint.x, this.lastGazePoint.x);
      gazePoint.y = this.smooth(gazePoint.y, this.lastGazePoint.y);
    }

    // Add to buffer
    this.gazeBuffer.push(gazePoint);
    if (this.gazeBuffer.length > 100) {
      this.gazeBuffer.shift();
    }

    // Emit gaze point
    this.gazeSubject.next(gazePoint);

    // Process fixations and saccades
    this.processFixationsAndSaccades(gazePoint);

    // Process blinks if enabled
    if (this.config.blinkDetection.enabled) {
      this.processBlinkDetection(gazePoint);
    }

    // Update performance metrics
    this.updatePerformanceMetrics(performance.now() - processingStart);

    this.lastGazePoint = gazePoint;
  }

  /**
   * Apply smoothing to gaze coordinates
   */
  private smooth(current: number, previous: number): number {
    return previous + this.config.smoothingFactor * (current - previous);
  }

  /**
   * Calculate confidence score for gaze point
   */
  private calculateConfidence(data: any): number {
    // Simple confidence calculation based on face detection
    // In reality, this would be more sophisticated
    let confidence = 0.8;

    // Reduce confidence if coordinates are at screen edges
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    
    if (data.x < 50 || data.x > screenWidth - 50) confidence *= 0.8;
    if (data.y < 50 || data.y > screenHeight - 50) confidence *= 0.8;

    return Math.max(0.1, Math.min(1.0, confidence));
  }

  /**
   * Estimate pupil diameter (placeholder implementation)
   */
  private estimatePupilDiameter(): number {
    // This would require more sophisticated image processing
    // For now, return a reasonable estimate
    return 3.5 + Math.random() * 1.0; // 3.5-4.5mm typical range
  }

  /**
   * Process fixations and saccades
   */
  private processFixationsAndSaccades(gazePoint: GazePoint): void {
    if (!this.lastGazePoint) return;

    const distance = this.calculateDistance(gazePoint, this.lastGazePoint);
    const timeDelta = gazePoint.timestamp - this.lastGazePoint.timestamp;
    const velocity = timeDelta > 0 ? distance / timeDelta : 0;

    // Check for saccade
    if (velocity > this.config.saccadeThreshold.velocity && 
        distance > this.config.saccadeThreshold.amplitude) {
      
      // End current fixation if exists
      if (this.currentFixation) {
        this.endFixation(gazePoint.timestamp);
      }

      // Create saccade event
      const saccade: SaccadeEvent = {
        id: `saccade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: gazePoint.timestamp,
        date: gazePoint.date,
        startPosition: { x: this.lastGazePoint.x, y: this.lastGazePoint.y },
        endPosition: { x: gazePoint.x, y: gazePoint.y },
        duration: timeDelta,
        velocity,
        amplitude: distance,
        direction: Math.atan2(gazePoint.y - this.lastGazePoint.y, gazePoint.x - this.lastGazePoint.x)
      };

      this.saccadeSubject.next(saccade);

    } else {
      // Potential fixation
      if (!this.currentFixation) {
        this.startFixation(gazePoint);
      } else {
        this.updateFixation(gazePoint);
      }
    }
  }

  /**
   * Start a new fixation
   */
  private startFixation(gazePoint: GazePoint): void {
    this.currentFixation = {
      id: `fixation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: gazePoint.timestamp,
      date: gazePoint.date,
      position: { x: gazePoint.x, y: gazePoint.y },
      duration: 0,
      dispersion: 0,
      confidence: gazePoint.confidence,
      element: this.getElementAtPoint(gazePoint.x, gazePoint.y)
    };
  }

  /**
   * Update current fixation
   */
  private updateFixation(gazePoint: GazePoint): void {
    if (!this.currentFixation) return;

    const distance = this.calculateDistance(gazePoint, this.currentFixation.position);
    
    if (distance <= this.config.fixationThreshold.dispersion) {
      // Update fixation
      this.currentFixation.duration = gazePoint.timestamp - this.currentFixation.timestamp;
      this.currentFixation.dispersion = Math.max(this.currentFixation.dispersion, distance);
    } else {
      // End current fixation and start new one
      this.endFixation(gazePoint.timestamp);
      this.startFixation(gazePoint);
    }
  }

  /**
   * End current fixation
   */
  private endFixation(timestamp: number): void {
    if (!this.currentFixation) return;

    this.currentFixation.duration = timestamp - this.currentFixation.timestamp;

    // Only emit if fixation lasted long enough
    if (this.currentFixation.duration >= this.config.fixationThreshold.duration) {
      this.fixationBuffer.push(this.currentFixation);
      this.fixationSubject.next(this.currentFixation);
    }

    this.currentFixation = null;
  }

  /**
   * Process blink detection
   */
  private processBlinkDetection(gazePoint: GazePoint): void {
    // Simple blink detection based on confidence drop
    // In reality, this would use more sophisticated computer vision
    
    if (gazePoint.confidence < this.config.blinkDetection.confidenceThreshold) {
      // Potential blink detected
      // This is a simplified implementation
      const blinkEvent: BlinkEvent = {
        timestamp: gazePoint.timestamp,
        date: gazePoint.date,
        duration: 150, // Estimated
        completeness: 1.0 - gazePoint.confidence,
        type: 'involuntary'
      };

      this.blinkSubject.next(blinkEvent);
    }
  }

  /**
   * Calculate distance between two points
   */
  private calculateDistance(p1: Point2D, p2: Point2D): number {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  }

  /**
   * Get DOM element at given coordinates
   */
  private getElementAtPoint(x: number, y: number): string | undefined {
    const element = document.elementFromPoint(x, y);
    if (element) {
      return element.tagName.toLowerCase() + 
             (element.id ? `#${element.id}` : '') +
             (element.className ? `.${element.className.split(' ').join('.')}` : '');
    }
    return undefined;
  }

  /**
   * Start calibration process
   */
  async calibrate(pointCount?: number): Promise<EyeTrackingCalibration> {
    const points = pointCount || this.config.calibrationPoints;
    
    try {
      // Clear any existing calibration
      webgazer.clearData();

      // Generate calibration points
      const calibrationPoints = this.generateCalibrationPoints(points);
      
      // Start calibration process
      const calibrationResult = await this.performCalibration(calibrationPoints);
      
      this.calibrationData = calibrationResult;
      this.isCalibrated = calibrationResult.completed;
      this.updateStatus({ calibrated: this.isCalibrated, accuracy: calibrationResult.accuracy });

      return calibrationResult;

    } catch (error) {
      console.error('Calibration failed:', error);
      throw error;
    }
  }

  /**
   * Generate calibration points
   */
  private generateCalibrationPoints(count: number): Point2D[] {
    const points: Point2D[] = [];
    const margin = 100;
    const width = window.innerWidth - 2 * margin;
    const height = window.innerHeight - 2 * margin;

    // Create grid of calibration points
    const rows = Math.ceil(Math.sqrt(count));
    const cols = Math.ceil(count / rows);

    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      
      const x = margin + (col * width) / (cols - 1);
      const y = margin + (row * height) / (rows - 1);
      
      points.push({ x, y });
    }

    return points;
  }

  /**
   * Perform calibration with given points
   */
  private async performCalibration(points: Point2D[]): Promise<EyeTrackingCalibration> {
    // This would show calibration UI and collect data
    // For now, simulate calibration process
    
    for (const point of points) {
      await this.calibratePoint(point);
    }

    const accuracy = await this.validateCalibration(points);
    
    return {
      points,
      accuracy,
      precision: accuracy * 0.9, // Simplified
      completed: accuracy > 0.7,
      timestamp: new Date(),
      deviceInfo: {
        cameraId: 'default',
        resolution: { width: 640, height: 480 },
        frameRate: 30
      }
    };
  }

  /**
   * Calibrate a single point
   */
  private async calibratePoint(point: Point2D): Promise<void> {
    return new Promise((resolve) => {
      // Simulate point calibration
      setTimeout(() => {
        webgazer.recordScreenPosition(point.x, point.y, 'click');
        resolve();
      }, 1000);
    });
  }

  /**
   * Validate calibration accuracy
   */
  private async validateCalibration(points: Point2D[]): Promise<number> {
    // Simulate validation by checking predicted vs actual positions
    let totalError = 0;
    
    for (const point of points) {
      // This would measure actual gaze vs expected position
      const error = Math.random() * 50; // Simulated error in pixels
      totalError += error;
    }

    const averageError = totalError / points.length;
    const maxAcceptableError = 100; // pixels
    
    return Math.max(0, 1 - averageError / maxAcceptableError);
  }

  /**
   * Check calibration accuracy over time
   */
  private async checkCalibrationAccuracy(): Promise<void> {
    if (!this.calibrationData) return;

    const currentAccuracy = await this.validateCalibration(this.calibrationData.points);
    
    if (currentAccuracy < 0.6) {
      console.log('Calibration accuracy degraded, recalibration recommended');
      // Could trigger automatic recalibration or notify user
    }
  }

  /**
   * Start tracking
   */
  startTracking(): boolean {
    if (!this.isInitialized) {
      console.error('EyeTracker not initialized');
      return false;
    }

    webgazer.resume();
    this.isTracking = true;
    this.updateStatus({ active: true });
    
    return true;
  }

  /**
   * Stop tracking
   */
  stopTracking(): void {
    webgazer.pause();
    this.isTracking = false;
    this.updateStatus({ active: false });
  }

  /**
   * Pause tracking
   */
  pauseTracking(): void {
    if (this.isTracking) {
      webgazer.pause();
    }
  }

  /**
   * Resume tracking
   */
  resumeTracking(): void {
    if (this.isTracking) {
      webgazer.resume();
    }
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(processingTime: number): void {
    this.frameCount++;
    this.latencySum += processingTime;
    this.latencyCount++;

    const now = Date.now();
    if (now - this.lastFPSUpdate >= 1000) {
      const fps = this.frameCount;
      const avgLatency = this.latencySum / this.latencyCount;

      this.updateStatus({
        performanceMetrics: {
          fps,
          latency: avgLatency,
          cpuUsage: 0, // Would need performance API
          memoryUsage: 0 // Would need memory API
        },
        lastUpdate: new Date()
      });

      this.frameCount = 0;
      this.latencySum = 0;
      this.latencyCount = 0;
      this.lastFPSUpdate = now;
    }
  }

  /**
   * Update sensor status
   */
  private updateStatus(updates: Partial<SensorStatus>): void {
    const currentStatus = this.statusSubject.value;
    this.statusSubject.next({ ...currentStatus, ...updates });
  }

  // Observable streams
  get gazeStream(): Observable<GazePoint> {
    return this.gazeSubject.asObservable().pipe(shareReplay(1));
  }

  get fixationStream(): Observable<FixationEvent> {
    return this.fixationSubject.asObservable().pipe(shareReplay(1));
  }

  get saccadeStream(): Observable<SaccadeEvent> {
    return this.saccadeSubject.asObservable().pipe(shareReplay(1));
  }

  get blinkStream(): Observable<BlinkEvent> {
    return this.blinkSubject.asObservable().pipe(shareReplay(1));
  }

  get statusStream(): Observable<SensorStatus> {
    return this.statusSubject.asObservable().pipe(shareReplay(1));
  }

  get dataStream(): Observable<EyeTrackingData> {
    return this.gazeSubject.asObservable().pipe(
      throttleTime(1000 / this.config.samplingRate),
      map(gazePoint => ({
        ...gazePoint,
        gazePoint,
        fixations: this.fixationBuffer.slice(-10),
        saccades: [], // Would maintain saccade buffer
        blinks: [], // Would maintain blink buffer
        attentionScore: this.calculateAttentionScore(),
        cognitiveLoad: this.calculateCognitiveLoad(),
        fatigue: this.calculateFatigue(),
        calibrationAccuracy: this.calibrationData?.accuracy || 0
      })),
      shareReplay(1)
    );
  }

  /**
   * Calculate attention score
   */
  private calculateAttentionScore(): number {
    if (this.gazeBuffer.length < 10) return 0.5;

    // Simple attention calculation based on fixation stability
    const recentGazes = this.gazeBuffer.slice(-10);
    const variance = this.calculateVariance(recentGazes);
    
    // Lower variance = higher attention
    return Math.max(0, Math.min(1, 1 - variance / 10000));
  }

  /**
   * Calculate cognitive load
   */
  private calculateCognitiveLoad(): number {
    if (this.fixationBuffer.length < 5) return 0.5;

    // Cognitive load based on fixation patterns
    const recentFixations = this.fixationBuffer.slice(-5);
    const avgDuration = recentFixations.reduce((sum, fix) => sum + fix.duration, 0) / recentFixations.length;
    
    // Shorter fixations may indicate higher cognitive load
    return Math.max(0, Math.min(1, 1 - avgDuration / 500));
  }

  /**
   * Calculate fatigue level
   */
  private calculateFatigue(): number {
    // Simple fatigue calculation based on blink frequency and gaze stability
    // This would be more sophisticated in a real implementation
    return Math.random() * 0.3; // Placeholder
  }

  /**
   * Calculate variance in gaze points
   */
  private calculateVariance(points: GazePoint[]): number {
    if (points.length < 2) return 0;

    const meanX = points.reduce((sum, p) => sum + p.x, 0) / points.length;
    const meanY = points.reduce((sum, p) => sum + p.y, 0) / points.length;

    const variance = points.reduce((sum, p) => {
      return sum + Math.pow(p.x - meanX, 2) + Math.pow(p.y - meanY, 2);
    }, 0) / points.length;

    return variance;
  }

  /**
   * Get current status
   */
  getStatus(): SensorStatus {
    return this.statusSubject.value;
  }

  /**
   * Get calibration data
   */
  getCalibrationData(): EyeTrackingCalibration | null {
    return this.calibrationData;
  }

  /**
   * Cleanup and dispose
   */
  dispose(): void {
    if (this.isTracking) {
      this.stopTracking();
    }

    webgazer.end();
    
    this.gazeSubject.complete();
    this.fixationSubject.complete();
    this.saccadeSubject.complete();
    this.blinkSubject.complete();
    this.statusSubject.complete();

    this.isInitialized = false;
    this.isCalibrated = false;
  }
}
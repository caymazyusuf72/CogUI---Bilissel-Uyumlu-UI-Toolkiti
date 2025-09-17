import { Observable, Subject, BehaviorSubject, interval, combineLatest } from 'rxjs';
import { 
  map, 
  filter, 
  throttleTime, 
  shareReplay,
  scan,
  switchMap
} from 'rxjs/operators';
import {
  BiometricData,
  HeartRateData,
  StressIndicators,
  FatigueMetrics,
  SensorStatus
} from '../types';

export interface BiometricMonitorConfig {
  enabled: boolean;
  heartRateMonitoring: boolean;
  stressDetection: boolean;
  fatigueDetection: boolean;
  samplingRate: number;
  movingAverageWindow: number;
  calibrationPeriod: number;
  privacyMode: boolean;
  dataRetention: number;
  thresholds: {
    restingHeartRate: { min: number; max: number };
    maxHeartRate: number;
    stressLevel: { low: number; medium: number; high: number };
    fatigueLevel: { low: number; medium: number; high: number };
  };
}

interface PPGSignal {
  timestamp: number;
  red: number;
  infrared: number;
  green: number;
}

interface HRVMetrics {
  rmssd: number;
  sdnn: number;
  pnn50: number;
  triangularIndex: number;
}

export class BiometricMonitor {
  private config: BiometricMonitorConfig;
  private isInitialized: boolean = false;
  private isMonitoring: boolean = false;
  
  // Camera and processing
  private videoElement: HTMLVideoElement | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private canvasContext: CanvasRenderingContext2D | null = null;
  private stream: MediaStream | null = null;
  
  // Signal processing
  private ppgBuffer: PPGSignal[] = [];
  private rrIntervals: number[] = [];
  private heartRateBuffer: number[] = [];
  private baselineMetrics: any = null;
  
  // Subjects for data streams
  private biometricSubject = new Subject<BiometricData>();
  private heartRateSubject = new Subject<HeartRateData>();
  private stressSubject = new Subject<StressIndicators>();
  private fatigueSubject = new Subject<FatigueMetrics>();
  
  // Status tracking
  private statusSubject = new BehaviorSubject<SensorStatus>({
    sensor: 'biometric',
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

  // Analysis state
  private lastBiometricData: BiometricData | null = null;
  private calibrationStartTime: number = 0;
  private frameCount: number = 0;
  private processingTimes: number[] = [];

  constructor(config?: Partial<BiometricMonitorConfig>) {
    this.config = {
      enabled: true,
      heartRateMonitoring: true,
      stressDetection: true,
      fatigueDetection: true,
      samplingRate: 30, // Hz
      movingAverageWindow: 10,
      calibrationPeriod: 30000, // 30 seconds
      privacyMode: true,
      dataRetention: 24, // hours
      thresholds: {
        restingHeartRate: { min: 60, max: 100 },
        maxHeartRate: 220,
        stressLevel: { low: 0.3, medium: 0.6, high: 0.8 },
        fatigueLevel: { low: 0.3, medium: 0.6, high: 0.8 }
      },
      ...config
    };
  }

  /**
   * Initialize biometric monitor
   */
  async initialize(): Promise<boolean> {
    if (!this.config.enabled) {
      return false;
    }

    try {
      // Request camera permission for PPG
      await this.requestCameraPermission();

      // Set up video processing
      await this.setupVideoProcessing();

      // Initialize processing pipeline
      this.setupProcessingPipeline();

      this.isInitialized = true;
      this.updateStatus({ active: false, accuracy: 0.0 });

      console.log('BiometricMonitor initialized successfully');
      return true;

    } catch (error) {
      console.error('Failed to initialize BiometricMonitor:', error);
      this.updateStatus({ active: false });
      return false;
    }
  }

  /**
   * Request camera permission for PPG signal extraction
   */
  private async requestCameraPermission(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: 640,
          height: 480,
          frameRate: this.config.samplingRate,
          facingMode: 'user'
        }
      });
    } catch (error) {
      throw new Error('Camera permission required for biometric monitoring');
    }
  }

  /**
   * Set up video processing elements
   */
  private async setupVideoProcessing(): Promise<void> {
    // Create video element
    this.videoElement = document.createElement('video');
    this.videoElement.width = 640;
    this.videoElement.height = 480;
    this.videoElement.autoplay = true;
    this.videoElement.muted = true;
    this.videoElement.style.display = 'none';

    // Create canvas for processing
    this.canvasElement = document.createElement('canvas');
    this.canvasElement.width = 640;
    this.canvasElement.height = 480;
    this.canvasElement.style.display = 'none';
    this.canvasContext = this.canvasElement.getContext('2d');

    // Connect stream to video
    if (this.stream) {
      this.videoElement.srcObject = this.stream;
      await this.videoElement.play();
    }

    // Add elements to document (hidden)
    document.body.appendChild(this.videoElement);
    document.body.appendChild(this.canvasElement);
  }

  /**
   * Set up processing pipeline
   */
  private setupProcessingPipeline(): void {
    // Process frames at configured sample rate
    interval(1000 / this.config.samplingRate).subscribe(() => {
      if (this.isMonitoring) {
        this.processFrame();
      }
    });
  }

  /**
   * Process single video frame for PPG signal extraction
   */
  private processFrame(): void {
    if (!this.videoElement || !this.canvasContext || !this.canvasElement) return;

    const processingStart = performance.now();

    try {
      // Draw current video frame to canvas
      this.canvasContext.drawImage(
        this.videoElement, 
        0, 0, 
        this.canvasElement.width, 
        this.canvasElement.height
      );

      // Extract PPG signal from face region
      const ppgSignal = this.extractPPGSignal();
      
      if (ppgSignal) {
        this.ppgBuffer.push(ppgSignal);
        
        // Keep buffer size manageable
        if (this.ppgBuffer.length > this.config.samplingRate * 60) { // 1 minute of data
          this.ppgBuffer.shift();
        }

        // Process biometric data if we have enough samples
        if (this.ppgBuffer.length >= this.config.samplingRate * 5) { // 5 seconds
          const biometricData = this.processBiometricData();
          
          if (biometricData) {
            this.emitBiometricData(biometricData);
          }
        }
      }

      // Update performance metrics
      const processingTime = performance.now() - processingStart;
      this.updatePerformanceMetrics(processingTime);

    } catch (error) {
      console.error('Frame processing error:', error);
      this.updateStatus({ errorCount: this.statusSubject.value.errorCount + 1 });
    }
  }

  /**
   * Extract PPG signal from video frame
   */
  private extractPPGSignal(): PPGSignal | null {
    if (!this.canvasContext || !this.canvasElement) return null;

    try {
      // Get image data from face region (center region for simplicity)
      const faceRegion = {
        x: this.canvasElement.width * 0.3,
        y: this.canvasElement.height * 0.3,
        width: this.canvasElement.width * 0.4,
        height: this.canvasElement.height * 0.4
      };

      const imageData = this.canvasContext.getImageData(
        faceRegion.x, 
        faceRegion.y, 
        faceRegion.width, 
        faceRegion.height
      );

      // Calculate average RGB values
      let redSum = 0;
      let greenSum = 0;
      let blueSum = 0;
      const pixelCount = imageData.data.length / 4;

      for (let i = 0; i < imageData.data.length; i += 4) {
        redSum += imageData.data[i];     // R
        greenSum += imageData.data[i + 1]; // G
        blueSum += imageData.data[i + 2];  // B
      }

      const redAvg = redSum / pixelCount;
      const greenAvg = greenSum / pixelCount;
      const blueAvg = blueSum / pixelCount;

      return {
        timestamp: Date.now(),
        red: redAvg,
        infrared: redAvg, // Approximation
        green: greenAvg
      };

    } catch (error) {
      console.error('PPG signal extraction error:', error);
      return null;
    }
  }

  /**
   * Process biometric data from PPG buffer
   */
  private processBiometricData(): BiometricData | null {
    if (this.ppgBuffer.length < this.config.samplingRate * 5) return null;

    try {
      // Extract heart rate from PPG signal
      const heartRateData = this.extractHeartRate();
      
      // Calculate stress indicators
      const stressIndicators = this.calculateStressIndicators(heartRateData);
      
      // Calculate fatigue metrics
      const fatigueMetrics = this.calculateFatigueMetrics(heartRateData, stressIndicators);

      const now = Date.now();
      const biometricData: BiometricData = {
        timestamp: now,
        date: new Date(now),
        heartRate: heartRateData,
        stress: stressIndicators,
        fatigue: fatigueMetrics
      };

      this.lastBiometricData = biometricData;
      return biometricData;

    } catch (error) {
      console.error('Biometric data processing error:', error);
      return null;
    }
  }

  /**
   * Extract heart rate from PPG signal using peak detection
   */
  private extractHeartRate(): HeartRateData {
    const now = Date.now();
    
    // Use green channel for better PPG signal
    const greenSignal = this.ppgBuffer.map(sample => sample.green);
    
    // Apply bandpass filter (0.5 - 4 Hz for heart rate)
    const filteredSignal = this.bandpassFilter(greenSignal, 0.5, 4.0);
    
    // Detect peaks
    const peaks = this.detectPeaks(filteredSignal);
    
    // Calculate RR intervals
    const rrIntervals: number[] = [];
    for (let i = 1; i < peaks.length; i++) {
      const interval = (peaks[i] - peaks[i-1]) / this.config.samplingRate * 1000; // ms
      if (interval > 300 && interval < 2000) { // Valid RR interval range
        rrIntervals.push(interval);
      }
    }

    this.rrIntervals = [...this.rrIntervals, ...rrIntervals].slice(-100); // Keep last 100

    // Calculate heart rate (BPM)
    const avgRRInterval = rrIntervals.reduce((sum, interval) => sum + interval, 0) / rrIntervals.length;
    const bpm = rrIntervals.length > 0 ? 60000 / avgRRInterval : 0;

    // Calculate HRV metrics
    const hrv = this.calculateHRV(this.rrIntervals);

    // Add to heart rate buffer for averaging
    if (bpm > 40 && bpm < 200) { // Reasonable range
      this.heartRateBuffer.push(bpm);
      if (this.heartRateBuffer.length > this.config.movingAverageWindow) {
        this.heartRateBuffer.shift();
      }
    }

    const avgBpm = this.heartRateBuffer.reduce((sum, hr) => sum + hr, 0) / this.heartRateBuffer.length;
    const confidence = this.calculateHeartRateConfidence(peaks, rrIntervals);

    return {
      timestamp: now,
      date: new Date(now),
      bpm: Math.round(avgBpm),
      variability: hrv.rmssd,
      rhythm: this.classifyHeartRhythm(rrIntervals),
      confidence,
      rmssd: hrv.rmssd,
      sdnn: hrv.sdnn
    };
  }

  /**
   * Apply bandpass filter to signal
   */
  private bandpassFilter(signal: number[], lowCut: number, highCut: number): number[] {
    // Simplified bandpass filter using moving average
    const filtered: number[] = [];
    const windowSize = Math.floor(this.config.samplingRate / 2);
    
    for (let i = 0; i < signal.length; i++) {
      let sum = 0;
      let count = 0;
      
      for (let j = Math.max(0, i - windowSize); j < Math.min(signal.length, i + windowSize); j++) {
        sum += signal[j];
        count++;
      }
      
      filtered.push(signal[i] - sum / count); // High-pass component
    }
    
    return filtered;
  }

  /**
   * Detect peaks in filtered signal
   */
  private detectPeaks(signal: number[]): number[] {
    const peaks: number[] = [];
    const threshold = this.calculateAdaptiveThreshold(signal);
    
    for (let i = 1; i < signal.length - 1; i++) {
      if (signal[i] > signal[i-1] && 
          signal[i] > signal[i+1] && 
          signal[i] > threshold) {
        
        // Ensure minimum distance between peaks (300ms)
        const minDistance = this.config.samplingRate * 0.3;
        if (peaks.length === 0 || i - peaks[peaks.length - 1] > minDistance) {
          peaks.push(i);
        }
      }
    }
    
    return peaks;
  }

  /**
   * Calculate adaptive threshold for peak detection
   */
  private calculateAdaptiveThreshold(signal: number[]): number {
    const sortedSignal = [...signal].sort((a, b) => a - b);
    const percentile75 = sortedSignal[Math.floor(signal.length * 0.75)];
    const percentile25 = sortedSignal[Math.floor(signal.length * 0.25)];
    return percentile25 + (percentile75 - percentile25) * 0.5;
  }

  /**
   * Calculate HRV metrics
   */
  private calculateHRV(rrIntervals: number[]): HRVMetrics {
    if (rrIntervals.length < 2) {
      return { rmssd: 0, sdnn: 0, pnn50: 0, triangularIndex: 0 };
    }

    // RMSSD - Root Mean Square of Successive Differences
    const differences = [];
    for (let i = 1; i < rrIntervals.length; i++) {
      differences.push(rrIntervals[i] - rrIntervals[i-1]);
    }
    const rmssd = Math.sqrt(differences.reduce((sum, diff) => sum + diff * diff, 0) / differences.length);

    // SDNN - Standard Deviation of NN intervals
    const mean = rrIntervals.reduce((sum, interval) => sum + interval, 0) / rrIntervals.length;
    const variance = rrIntervals.reduce((sum, interval) => sum + Math.pow(interval - mean, 2), 0) / rrIntervals.length;
    const sdnn = Math.sqrt(variance);

    // pNN50 - Percentage of successive RR intervals that differ by more than 50ms
    const nn50Count = differences.filter(diff => Math.abs(diff) > 50).length;
    const pnn50 = (nn50Count / differences.length) * 100;

    // Triangular Index (simplified)
    const triangularIndex = rrIntervals.length / (2 * sdnn);

    return { rmssd, sdnn, pnn50, triangularIndex };
  }

  /**
   * Calculate heart rate confidence
   */
  private calculateHeartRateConfidence(peaks: number[], rrIntervals: number[]): number {
    if (peaks.length < 3 || rrIntervals.length < 2) return 0.1;

    // Confidence based on signal quality and consistency
    const rrVariability = this.calculateCoefficientOfVariation(rrIntervals);
    const signalStrength = peaks.length / (this.ppgBuffer.length / this.config.samplingRate); // peaks per second

    let confidence = 0.5;
    
    // Good signal strength
    if (signalStrength > 0.8 && signalStrength < 3.5) confidence += 0.3;
    
    // Low RR variability indicates good signal
    if (rrVariability < 0.2) confidence += 0.2;
    
    return Math.max(0.1, Math.min(1.0, confidence));
  }

  /**
   * Classify heart rhythm
   */
  private classifyHeartRhythm(rrIntervals: number[]): 'regular' | 'irregular' | 'arrhythmic' {
    if (rrIntervals.length < 5) return 'regular';

    const cv = this.calculateCoefficientOfVariation(rrIntervals);
    
    if (cv < 0.1) return 'regular';
    if (cv < 0.3) return 'irregular';
    return 'arrhythmic';
  }

  /**
   * Calculate coefficient of variation
   */
  private calculateCoefficientOfVariation(values: number[]): number {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    return mean > 0 ? stdDev / mean : 0;
  }

  /**
   * Calculate stress indicators
   */
  private calculateStressIndicators(heartRateData: HeartRateData): StressIndicators {
    const now = Date.now();
    
    // Physiological stress indicators
    const restingHR = this.baselineMetrics?.heartRate?.bpm || 70;
    const hrStress = Math.max(0, (heartRateData.bpm - restingHR) / restingHR);
    const hrvStress = heartRateData.variability < 20 ? 0.3 : 0; // Low HRV indicates stress

    // Behavioral stress indicators (simplified)
    const behavioralStress = {
      mouseJitter: Math.random() * 0.5, // Would integrate with mouse tracking
      clickIntensity: Math.random() * 0.3,
      typingRhythm: Math.random() * 0.4,
      postureShift: Math.random() * 0.2
    };

    // Cognitive stress indicators (would integrate with other sensors)
    const cognitiveStress = {
      attentionLevel: 0.7 + Math.random() * 0.3,
      taskSwitching: Math.random() * 0.4,
      errorRate: Math.random() * 0.2,
      responseTime: 200 + Math.random() * 100
    };

    // Overall stress calculation
    const physiologicalScore = (hrStress + hrvStress) / 2;
    const behavioralScore = Object.values(behavioralStress).reduce((sum, val) => sum + val, 0) / 4;
    const cognitiveScore = (cognitiveStress.taskSwitching + cognitiveStress.errorRate) / 2;
    
    const overallStressLevel = (physiologicalScore * 0.5 + behavioralScore * 0.3 + cognitiveScore * 0.2);

    return {
      timestamp: now,
      date: new Date(now),
      physiological: {
        heartRate: heartRateData.bpm,
        heartRateVariability: heartRateData.variability,
        skinConductance: 0, // Would need additional sensor
        muscularTension: 0   // Would need additional sensor
      },
      behavioral: behavioralStress,
      cognitive: cognitiveStress,
      overallStressLevel: Math.max(0, Math.min(1, overallStressLevel))
    };
  }

  /**
   * Calculate fatigue metrics
   */
  private calculateFatigueMetrics(heartRateData: HeartRateData, stressIndicators: StressIndicators): FatigueMetrics {
    const now = Date.now();
    
    // Physical fatigue indicators
    const hrvFatigue = heartRateData.variability < 15 ? 0.4 : 0;
    const hrFatigue = heartRateData.bpm < 60 ? 0.2 : 0; // Bradycardia can indicate fatigue

    const physical = {
      eyeBlinks: 15 + Math.random() * 10, // Would integrate with eye tracking
      headPosition: Math.random() * 0.3,   // Would need pose detection
      postureStability: 0.7 + Math.random() * 0.3,
      movementReduction: Math.random() * 0.4
    };

    // Cognitive fatigue indicators
    const cognitive = {
      reactionTime: 250 + Math.random() * 150,
      accuracyDegradation: Math.random() * 0.3,
      attentionLapses: Math.random() * 0.4,
      memoryPerformance: 0.8 - Math.random() * 0.3
    };

    // Overall fatigue calculation
    const physicalFatigue = (hrvFatigue + hrFatigue + physical.movementReduction) / 3;
    const cognitiveFatigue = (cognitive.accuracyDegradation + cognitive.attentionLapses) / 2;
    const overallFatigue = (physicalFatigue * 0.6 + cognitiveFatigue * 0.4);

    let recommendation: 'continue' | 'break_suggested' | 'break_required' | 'stop' = 'continue';
    
    if (overallFatigue > 0.8) recommendation = 'stop';
    else if (overallFatigue > 0.6) recommendation = 'break_required';
    else if (overallFatigue > 0.4) recommendation = 'break_suggested';

    return {
      timestamp: now,
      date: new Date(now),
      physical,
      cognitive,
      overall: {
        fatigueLevel: Math.max(0, Math.min(1, overallFatigue)),
        alertness: Math.max(0, Math.min(1, 1 - overallFatigue)),
        recommendation
      }
    };
  }

  /**
   * Emit biometric data to all streams
   */
  private emitBiometricData(data: BiometricData): void {
    this.biometricSubject.next(data);
    this.heartRateSubject.next(data.heartRate);
    this.stressSubject.next(data.stress);
    this.fatigueSubject.next(data.fatigue);
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(processingTime: number): void {
    this.processingTimes.push(processingTime);
    if (this.processingTimes.length > 60) {
      this.processingTimes.shift();
    }

    this.frameCount++;
    if (this.frameCount % 60 === 0) { // Update every 60 frames
      const avgLatency = this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length;
      
      this.updateStatus({
        performanceMetrics: {
          fps: this.config.samplingRate,
          latency: avgLatency,
          cpuUsage: 0, // Would need performance API
          memoryUsage: 0 // Would need memory API
        },
        lastUpdate: new Date()
      });
    }
  }

  /**
   * Update sensor status
   */
  private updateStatus(updates: Partial<SensorStatus>): void {
    const currentStatus = this.statusSubject.value;
    this.statusSubject.next({ ...currentStatus, ...updates });
  }

  /**
   * Start monitoring
   */
  startMonitoring(): boolean {
    if (!this.isInitialized) {
      console.error('BiometricMonitor not initialized');
      return false;
    }

    this.isMonitoring = true;
    this.calibrationStartTime = Date.now();
    this.updateStatus({ active: true });
    
    // Start calibration period
    setTimeout(() => {
      this.completeCalibration();
    }, this.config.calibrationPeriod);
    
    return true;
  }

  /**
   * Complete calibration and establish baseline
   */
  private completeCalibration(): void {
    if (this.heartRateBuffer.length > 0) {
      const avgHeartRate = this.heartRateBuffer.reduce((sum, hr) => sum + hr, 0) / this.heartRateBuffer.length;
      
      this.baselineMetrics = {
        heartRate: {
          bpm: avgHeartRate,
          variability: this.rrIntervals.length > 0 ? this.calculateHRV(this.rrIntervals).rmssd : 20
        },
        timestamp: Date.now()
      };

      this.updateStatus({ 
        calibrated: true, 
        accuracy: this.calculateOverallAccuracy() 
      });
      
      console.log('BiometricMonitor calibration completed');
    }
  }

  /**
   * Calculate overall accuracy
   */
  private calculateOverallAccuracy(): number {
    if (!this.lastBiometricData) return 0.5;
    
    // Base accuracy on signal quality and consistency
    const hrConfidence = this.lastBiometricData.heartRate.confidence;
    const signalConsistency = this.heartRateBuffer.length >= this.config.movingAverageWindow ? 0.8 : 0.4;
    
    return (hrConfidence * 0.7 + signalConsistency * 0.3);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    this.isMonitoring = false;
    this.updateStatus({ active: false });
  }

  // Observable streams
  get biometricStream(): Observable<BiometricData> {
    return this.biometricSubject.asObservable().pipe(
      throttleTime(1000), // Limit to 1 Hz
      shareReplay(1)
    );
  }

  get heartRateStream(): Observable<HeartRateData> {
    return this.heartRateSubject.asObservable().pipe(shareReplay(1));
  }

  get stressStream(): Observable<StressIndicators> {
    return this.stressSubject.asObservable().pipe(shareReplay(1));
  }

  get fatigueStream(): Observable<FatigueMetrics> {
    return this.fatigueSubject.asObservable().pipe(shareReplay(1));
  }

  get statusStream(): Observable<SensorStatus> {
    return this.statusSubject.asObservable().pipe(shareReplay(1));
  }

  /**
   * Get current status
   */
  getStatus(): SensorStatus {
    return this.statusSubject.value;
  }

  /**
   * Get baseline metrics
   */
  getBaselineMetrics(): any {
    return this.baselineMetrics;
  }

  /**
   * Get last biometric data
   */
  getLastBiometricData(): BiometricData | null {
    return this.lastBiometricData;
  }

  /**
   * Dispose and cleanup
   */
  dispose(): void {
    this.stopMonitoring();

    // Cleanup video elements
    if (this.videoElement) {
      this.videoElement.pause();
      this.videoElement.srcObject = null;
      if (this.videoElement.parentNode) {
        this.videoElement.parentNode.removeChild(this.videoElement);
      }
      this.videoElement = null;
    }

    if (this.canvasElement && this.canvasElement.parentNode) {
      this.canvasElement.parentNode.removeChild(this.canvasElement);
      this.canvasElement = null;
    }

    // Stop media stream
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    // Complete subjects
    this.biometricSubject.complete();
    this.heartRateSubject.complete();
    this.stressSubject.complete();
    this.fatigueSubject.complete();
    this.statusSubject.complete();

    this.isInitialized = false;
  }
}
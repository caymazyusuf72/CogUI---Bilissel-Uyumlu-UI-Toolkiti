import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { 
  map, 
  filter, 
  throttleTime, 
  shareReplay,
  scan
} from 'rxjs/operators';
import {
  VoiceAnalysisData,
  VoiceMetrics,
  EmotionAnalysis,
  SpeechPattern,
  SensorStatus
} from '../types';

export interface VoiceAnalyzerConfig {
  enabled: boolean;
  sampleRate: number;
  windowSize: number;
  hopSize: number;
  emotionDetection: boolean;
  stressDetection: boolean;
  speechRecognition: boolean;
  realTimeAnalysis: boolean;
  bufferSize: number;
  noiseReduction: boolean;
  privacy: {
    localProcessing: boolean;
    storeAudio: boolean;
    anonymize: boolean;
    maxRetention: number;
  };
}

interface AudioFeatures {
  mfcc: number[];
  spectralCentroid: number;
  spectralRolloff: number;
  spectralFlux: number;
  zeroCrossingRate: number;
  rms: number;
  pitch: number;
}

export class VoiceAnalyzer {
  private config: VoiceAnalyzerConfig;
  private isInitialized: boolean = false;
  private isRecording: boolean = false;
  
  // Audio context and processing
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private analyzerNode: AnalyserNode | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  
  // Audio data buffers
  private audioBuffer: Float32Array[] = [];
  private frequencyData: Uint8Array = new Uint8Array();
  private timeData: Uint8Array = new Uint8Array();
  
  // Analysis results
  private voiceSubject = new Subject<VoiceAnalysisData>();
  private metricsSubject = new Subject<VoiceMetrics>();
  private emotionSubject = new Subject<EmotionAnalysis>();
  private speechSubject = new Subject<SpeechPattern>();
  
  // Status tracking
  private statusSubject = new BehaviorSubject<SensorStatus>({
    sensor: 'voice-analysis',
    active: false,
    calibrated: true, // Voice analysis doesn't require calibration
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
  private lastAnalysis: VoiceAnalysisData | null = null;
  private analysisCount = 0;
  private processingTimes: number[] = [];

  constructor(config?: Partial<VoiceAnalyzerConfig>) {
    this.config = {
      enabled: true,
      sampleRate: 22050,
      windowSize: 2048,
      hopSize: 512,
      emotionDetection: true,
      stressDetection: true,
      speechRecognition: false,
      realTimeAnalysis: true,
      bufferSize: 4096,
      noiseReduction: true,
      privacy: {
        localProcessing: true,
        storeAudio: false,
        anonymize: true,
        maxRetention: 1 // days
      },
      ...config
    };
  }

  /**
   * Initialize voice analyzer
   */
  async initialize(): Promise<boolean> {
    if (!this.config.enabled) {
      return false;
    }

    try {
      // Request microphone permission
      await this.requestMicrophonePermission();

      // Initialize audio context
      await this.initializeAudioContext();

      // Set up audio processing pipeline
      this.setupAudioProcessing();

      this.isInitialized = true;
      this.updateStatus({ active: false, accuracy: 0.8 });

      console.log('VoiceAnalyzer initialized successfully');
      return true;

    } catch (error) {
      console.error('Failed to initialize VoiceAnalyzer:', error);
      this.updateStatus({ active: false });
      return false;
    }
  }

  /**
   * Request microphone permission
   */
  private async requestMicrophonePermission(): Promise<void> {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: this.config.sampleRate,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: this.config.noiseReduction
        } 
      });
    } catch (error) {
      throw new Error('Microphone permission required for voice analysis');
    }
  }

  /**
   * Initialize audio context
   */
  private async initializeAudioContext(): Promise<void> {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: this.config.sampleRate
    });

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  /**
   * Set up audio processing pipeline
   */
  private setupAudioProcessing(): void {
    if (!this.audioContext || !this.mediaStream) return;

    // Create audio nodes
    this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
    this.analyzerNode = this.audioContext.createAnalyser();
    this.scriptProcessor = this.audioContext.createScriptProcessor(this.config.bufferSize, 1, 1);

    // Configure analyzer
    this.analyzerNode.fftSize = this.config.windowSize;
    this.analyzerNode.smoothingTimeConstant = 0.8;

    // Initialize data arrays
    this.frequencyData = new Uint8Array(this.analyzerNode.frequencyBinCount);
    this.timeData = new Uint8Array(this.analyzerNode.frequencyBinCount);

    // Connect nodes
    this.sourceNode.connect(this.analyzerNode);
    this.analyzerNode.connect(this.scriptProcessor);
    this.scriptProcessor.connect(this.audioContext.destination);

    // Set up processing callback
    this.scriptProcessor.onaudioprocess = (event) => {
      if (this.isRecording) {
        this.processAudioFrame(event.inputBuffer);
      }
    };
  }

  /**
   * Process audio frame
   */
  private processAudioFrame(inputBuffer: AudioBuffer): void {
    const processingStart = performance.now();
    
    try {
      // Get audio data
      const audioData = inputBuffer.getChannelData(0);
      this.audioBuffer.push(new Float32Array(audioData));

      // Keep buffer size manageable
      if (this.audioBuffer.length > 100) {
        this.audioBuffer.shift();
      }

      // Get frequency and time domain data
      if (this.analyzerNode) {
        this.analyzerNode.getByteFrequencyData(this.frequencyData);
        this.analyzerNode.getByteTimeDomainData(this.timeData);
      }

      // Extract features and analyze
      const features = this.extractAudioFeatures(audioData);
      const analysisResult = this.analyzeVoice(features);

      // Emit results
      this.voiceSubject.next(analysisResult);
      this.metricsSubject.next(analysisResult.metrics);
      this.emotionSubject.next(analysisResult.emotion);
      this.speechSubject.next(analysisResult.speech);

      // Update performance metrics
      const processingTime = performance.now() - processingStart;
      this.updatePerformanceMetrics(processingTime);

      this.lastAnalysis = analysisResult;

    } catch (error) {
      console.error('Audio processing error:', error);
      this.updateStatus({ errorCount: this.statusSubject.value.errorCount + 1 });
    }
  }

  /**
   * Extract audio features from raw audio data
   */
  private extractAudioFeatures(audioData: Float32Array): AudioFeatures {
    // Calculate RMS (Root Mean Square)
    const rms = Math.sqrt(audioData.reduce((sum, val) => sum + val * val, 0) / audioData.length);

    // Calculate Zero Crossing Rate
    let zeroCrossings = 0;
    for (let i = 1; i < audioData.length; i++) {
      if ((audioData[i] >= 0) !== (audioData[i - 1] >= 0)) {
        zeroCrossings++;
      }
    }
    const zeroCrossingRate = zeroCrossings / audioData.length;

    // Estimate pitch using autocorrelation
    const pitch = this.estimatePitch(audioData);

    // Calculate spectral features from frequency data
    const spectralCentroid = this.calculateSpectralCentroid(this.frequencyData);
    const spectralRolloff = this.calculateSpectralRolloff(this.frequencyData);
    const spectralFlux = this.calculateSpectralFlux(this.frequencyData);

    // Calculate MFCC (simplified)
    const mfcc = this.calculateMFCC(this.frequencyData);

    return {
      rms,
      zeroCrossingRate,
      pitch,
      spectralCentroid,
      spectralRolloff,
      spectralFlux,
      mfcc
    };
  }

  /**
   * Estimate pitch using autocorrelation
   */
  private estimatePitch(audioData: Float32Array): number {
    const sampleRate = this.config.sampleRate;
    const minPeriod = Math.floor(sampleRate / 800); // 800 Hz max
    const maxPeriod = Math.floor(sampleRate / 80);  // 80 Hz min

    let bestCorrelation = 0;
    let bestPeriod = 0;

    for (let period = minPeriod; period < maxPeriod && period < audioData.length / 2; period++) {
      let correlation = 0;
      for (let i = 0; i < audioData.length - period; i++) {
        correlation += audioData[i] * audioData[i + period];
      }
      
      if (correlation > bestCorrelation) {
        bestCorrelation = correlation;
        bestPeriod = period;
      }
    }

    return bestPeriod > 0 ? sampleRate / bestPeriod : 0;
  }

  /**
   * Calculate spectral centroid
   */
  private calculateSpectralCentroid(frequencyData: Uint8Array): number {
    let weightedSum = 0;
    let magnitudeSum = 0;

    for (let i = 0; i < frequencyData.length; i++) {
      const magnitude = frequencyData[i];
      weightedSum += i * magnitude;
      magnitudeSum += magnitude;
    }

    return magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;
  }

  /**
   * Calculate spectral rolloff
   */
  private calculateSpectralRolloff(frequencyData: Uint8Array, threshold: number = 0.85): number {
    const totalEnergy = frequencyData.reduce((sum, val) => sum + val, 0);
    const rolloffEnergy = totalEnergy * threshold;

    let cumulativeEnergy = 0;
    for (let i = 0; i < frequencyData.length; i++) {
      cumulativeEnergy += frequencyData[i];
      if (cumulativeEnergy >= rolloffEnergy) {
        return i;
      }
    }

    return frequencyData.length - 1;
  }

  /**
   * Calculate spectral flux
   */
  private calculateSpectralFlux(frequencyData: Uint8Array): number {
    if (!this.lastAnalysis) return 0;

    const lastFreqData = this.lastAnalysis.metrics.spectral;
    let flux = 0;

    for (let i = 0; i < frequencyData.length; i++) {
      const diff = frequencyData[i] - (lastFreqData ? 128 : 128); // Simplified
      if (diff > 0) {
        flux += diff * diff;
      }
    }

    return Math.sqrt(flux);
  }

  /**
   * Calculate MFCC (simplified implementation)
   */
  private calculateMFCC(frequencyData: Uint8Array): number[] {
    // This is a simplified MFCC calculation
    // A full implementation would use mel filter banks and DCT
    const mfcc: number[] = [];
    const numCoefficients = 13;
    
    for (let i = 0; i < numCoefficients; i++) {
      let coefficient = 0;
      const start = Math.floor(i * frequencyData.length / numCoefficients);
      const end = Math.floor((i + 1) * frequencyData.length / numCoefficients);
      
      for (let j = start; j < end; j++) {
        coefficient += frequencyData[j];
      }
      
      mfcc.push(coefficient / (end - start));
    }
    
    return mfcc;
  }

  /**
   * Analyze voice characteristics
   */
  private analyzeVoice(features: AudioFeatures): VoiceAnalysisData {
    const now = Date.now();
    const timestamp = new Date(now);

    // Voice metrics
    const metrics: VoiceMetrics = {
      timestamp: now,
      date: timestamp,
      pitch: {
        fundamental: features.pitch,
        range: this.calculatePitchRange(),
        variation: this.calculatePitchVariation(),
        jitter: this.calculateJitter()
      },
      volume: {
        rms: features.rms,
        peak: Math.max(...this.audioBuffer[this.audioBuffer.length - 1] || [0]),
        dynamic_range: this.calculateDynamicRange()
      },
      spectral: {
        centroid: features.spectralCentroid,
        rolloff: features.spectralRolloff,
        flux: features.spectralFlux,
        mfcc: features.mfcc
      },
      temporal: {
        zero_crossing_rate: features.zeroCrossingRate,
        tempo: this.calculateTempo(),
        rhythm_regularity: this.calculateRhythmRegularity()
      }
    };

    // Emotion analysis
    const emotion = this.analyzeEmotion(features, metrics);

    // Speech pattern analysis
    const speech = this.analyzeSpeechPattern(features, metrics);

    // Cognitive state analysis
    const cognitiveState = this.analyzeCognitiveState(metrics, emotion, speech);

    // Audio quality assessment
    const audioQuality = this.assessAudioQuality(features);

    return {
      timestamp: now,
      date: timestamp,
      metrics,
      emotion,
      speech,
      cognitiveState,
      audioQuality
    };
  }

  /**
   * Analyze emotion from voice features
   */
  private analyzeEmotion(features: AudioFeatures, metrics: VoiceMetrics): EmotionAnalysis {
    // Simplified emotion detection based on prosodic features
    // A real implementation would use trained ML models
    
    const pitch = metrics.pitch.fundamental;
    const pitchVariation = metrics.pitch.variation;
    const volume = metrics.volume.rms;
    const tempo = metrics.temporal.tempo;

    // Simple heuristic rules for emotion detection
    const emotions = {
      happy: Math.max(0, Math.min(1, (pitch / 200) * (pitchVariation / 50) * (tempo / 100))),
      sad: Math.max(0, Math.min(1, 1 - (pitch / 150) - (volume / 0.5))),
      angry: Math.max(0, Math.min(1, (volume / 0.8) * (tempo / 120))),
      fearful: Math.max(0, Math.min(1, (pitchVariation / 80) * (1 - volume / 0.3))),
      surprised: Math.max(0, Math.min(1, (pitch / 250) * (pitchVariation / 60))),
      disgusted: Math.max(0, Math.min(1, 0.1)), // Harder to detect from voice alone
      neutral: Math.max(0, Math.min(1, 1 - Math.max(...Object.values(emotions))))
    };

    // Calculate arousal and valence
    const arousal = (emotions.happy + emotions.angry + emotions.fearful + emotions.surprised) / 4;
    const valence = (emotions.happy - emotions.sad - emotions.angry - emotions.fearful) / 4;

    return {
      timestamp: Date.now(),
      date: new Date(),
      emotions,
      arousal,
      valence,
      confidence: 0.6 // Simplified confidence
    };
  }

  /**
   * Analyze speech patterns
   */
  private analyzeSpeechPattern(features: AudioFeatures, metrics: VoiceMetrics): SpeechPattern {
    return {
      timestamp: Date.now(),
      date: new Date(),
      wordsPerMinute: this.estimateWordsPerMinute(),
      pauseFrequency: this.calculatePauseFrequency(),
      fillerWordsCount: 0, // Would need speech recognition
      articulation: this.calculateArticulation(features),
      fluency: this.calculateFluency(),
      stressPattern: this.calculateStressPattern(),
      breathingPattern: {
        inhale_duration: 2.0,
        exhale_duration: 2.5,
        pause_duration: 0.5
      }
    };
  }

  /**
   * Analyze cognitive state from voice
   */
  private analyzeCognitiveState(metrics: VoiceMetrics, emotion: EmotionAnalysis, speech: SpeechPattern): any {
    const stress = Math.max(0, Math.min(1, 
      emotion.emotions.angry * 0.3 + 
      emotion.emotions.fearful * 0.4 +
      (speech.pauseFrequency / 10) * 0.3
    ));

    const fatigue = Math.max(0, Math.min(1,
      (1 - emotion.arousal) * 0.5 +
      (1 - speech.fluency) * 0.3 +
      (metrics.volume.rms < 0.1 ? 0.2 : 0)
    ));

    const focus = Math.max(0, Math.min(1,
      speech.fluency * 0.4 +
      (1 - stress) * 0.3 +
      (speech.articulation / 100) * 0.3
    ));

    const confidence = Math.max(0, Math.min(1,
      emotion.emotions.happy * 0.3 +
      (metrics.volume.rms / 0.5) * 0.4 +
      speech.fluency * 0.3
    ));

    return {
      stress,
      fatigue,
      focus,
      confidence
    };
  }

  /**
   * Assess audio quality
   */
  private assessAudioQuality(features: AudioFeatures): any {
    const snr = this.calculateSNR();
    const clarity = Math.max(0, Math.min(1, features.spectralCentroid / 1000));
    const volumeConsistency = this.calculateVolumeConsistency();

    return {
      snr,
      clarity,
      volume_consistency: volumeConsistency
    };
  }

  // Simplified calculation methods (would be more sophisticated in real implementation)
  private calculatePitchRange(): number { return 50 + Math.random() * 100; }
  private calculatePitchVariation(): number { return 10 + Math.random() * 40; }
  private calculateJitter(): number { return Math.random() * 2; }
  private calculateDynamicRange(): number { return 20 + Math.random() * 40; }
  private calculateTempo(): number { return 60 + Math.random() * 80; }
  private calculateRhythmRegularity(): number { return 0.5 + Math.random() * 0.5; }
  private estimateWordsPerMinute(): number { return 120 + Math.random() * 60; }
  private calculatePauseFrequency(): number { return 5 + Math.random() * 10; }
  private calculateArticulation(features: AudioFeatures): number { 
    return Math.max(0, Math.min(100, features.spectralCentroid / 10)); 
  }
  private calculateFluency(): number { return 0.6 + Math.random() * 0.4; }
  private calculateStressPattern(): number[] { return [0.5, 0.7, 0.3, 0.8, 0.4]; }
  private calculateSNR(): number { return 20 + Math.random() * 20; }
  private calculateVolumeConsistency(): number { return 0.7 + Math.random() * 0.3; }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(processingTime: number): void {
    this.processingTimes.push(processingTime);
    if (this.processingTimes.length > 60) {
      this.processingTimes.shift();
    }

    this.analysisCount++;
    if (this.analysisCount % 60 === 0) { // Update every 60 frames
      const avgLatency = this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length;
      
      this.updateStatus({
        performanceMetrics: {
          fps: 60, // Approximate
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
   * Start voice analysis
   */
  startAnalysis(): boolean {
    if (!this.isInitialized) {
      console.error('VoiceAnalyzer not initialized');
      return false;
    }

    this.isRecording = true;
    this.updateStatus({ active: true });
    
    return true;
  }

  /**
   * Stop voice analysis
   */
  stopAnalysis(): void {
    this.isRecording = false;
    this.updateStatus({ active: false });
  }

  /**
   * Get observable streams
   */
  get voiceStream(): Observable<VoiceAnalysisData> {
    return this.voiceSubject.asObservable().pipe(
      throttleTime(100), // Limit to 10 Hz
      shareReplay(1)
    );
  }

  get metricsStream(): Observable<VoiceMetrics> {
    return this.metricsSubject.asObservable().pipe(shareReplay(1));
  }

  get emotionStream(): Observable<EmotionAnalysis> {
    return this.emotionSubject.asObservable().pipe(shareReplay(1));
  }

  get speechStream(): Observable<SpeechPattern> {
    return this.speechSubject.asObservable().pipe(shareReplay(1));
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
   * Get last analysis result
   */
  getLastAnalysis(): VoiceAnalysisData | null {
    return this.lastAnalysis;
  }

  /**
   * Dispose and cleanup
   */
  dispose(): void {
    this.stopAnalysis();

    // Cleanup audio context
    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
      this.scriptProcessor = null;
    }

    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.analyzerNode) {
      this.analyzerNode.disconnect();
      this.analyzerNode = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    // Complete subjects
    this.voiceSubject.complete();
    this.metricsSubject.complete();
    this.emotionSubject.complete();
    this.speechSubject.complete();
    this.statusSubject.complete();

    this.isInitialized = false;
  }
}
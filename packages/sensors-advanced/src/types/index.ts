// CogUI Advanced Sensor Types
export interface Point2D {
  x: number;
  y: number;
}

export interface Point3D extends Point2D {
  z: number;
}

export interface Timestamp {
  timestamp: number;
  date: Date;
}

// Eye Tracking Types
export interface GazePoint extends Point2D, Timestamp {
  confidence: number;
  pupilDiameter?: number;
  leftEye?: EyeData;
  rightEye?: EyeData;
}

export interface EyeData {
  position: Point3D;
  pupilSize: number;
  blinkState: 'open' | 'closed' | 'partially-closed';
  gazeDirection: Point3D;
}

export interface FixationEvent extends Timestamp {
  id: string;
  position: Point2D;
  duration: number;
  dispersion: number;
  confidence: number;
  element?: string;
}

export interface SaccadeEvent extends Timestamp {
  id: string;
  startPosition: Point2D;
  endPosition: Point2D;
  duration: number;
  velocity: number;
  amplitude: number;
  direction: number; // radians
}

export interface BlinkEvent extends Timestamp {
  duration: number;
  completeness: number; // 0-1, how complete the blink was
  type: 'voluntary' | 'involuntary' | 'partial';
}

export interface EyeTrackingData extends Timestamp {
  gazePoint: GazePoint;
  fixations: FixationEvent[];
  saccades: SaccadeEvent[];
  blinks: BlinkEvent[];
  attentionScore: number;
  cognitiveLoad: number;
  fatigue: number;
  calibrationAccuracy: number;
}

export interface EyeTrackingCalibration {
  points: Point2D[];
  accuracy: number;
  precision: number;
  completed: boolean;
  timestamp: Date;
  deviceInfo: {
    cameraId: string;
    resolution: { width: number; height: number };
    frameRate: number;
  };
}

// Voice Analysis Types
export interface VoiceMetrics extends Timestamp {
  pitch: {
    fundamental: number; // Hz
    range: number;
    variation: number;
    jitter: number;
  };
  volume: {
    rms: number;
    peak: number;
    dynamic_range: number;
  };
  spectral: {
    centroid: number;
    rolloff: number;
    flux: number;
    mfcc: number[]; // Mel-frequency cepstral coefficients
  };
  temporal: {
    zero_crossing_rate: number;
    tempo: number;
    rhythm_regularity: number;
  };
}

export interface EmotionAnalysis extends Timestamp {
  emotions: {
    happy: number;
    sad: number;
    angry: number;
    fearful: number;
    surprised: number;
    disgusted: number;
    neutral: number;
  };
  arousal: number; // 0-1
  valence: number; // -1 to 1 (negative to positive)
  confidence: number;
}

export interface SpeechPattern extends Timestamp {
  wordsPerMinute: number;
  pauseFrequency: number;
  fillerWordsCount: number;
  articulation: number; // clarity score
  fluency: number;
  stressPattern: number[];
  breathingPattern: {
    inhale_duration: number;
    exhale_duration: number;
    pause_duration: number;
  };
}

export interface VoiceAnalysisData extends Timestamp {
  metrics: VoiceMetrics;
  emotion: EmotionAnalysis;
  speech: SpeechPattern;
  cognitiveState: {
    stress: number;
    fatigue: number;
    focus: number;
    confidence: number;
  };
  audioQuality: {
    snr: number; // Signal-to-noise ratio
    clarity: number;
    volume_consistency: number;
  };
}

// Biometric Types
export interface HeartRateData extends Timestamp {
  bpm: number;
  variability: number; // HRV
  rhythm: 'regular' | 'irregular' | 'arrhythmic';
  confidence: number;
  rmssd: number; // Root mean square of successive differences
  sdnn: number; // Standard deviation of NN intervals
}

export interface StressIndicators extends Timestamp {
  physiological: {
    heartRate: number;
    heartRateVariability: number;
    skinConductance: number;
    muscularTension: number;
  };
  behavioral: {
    mouseJitter: number;
    clickIntensity: number;
    typingRhythm: number;
    postureShift: number;
  };
  cognitive: {
    attentionLevel: number;
    taskSwitching: number;
    errorRate: number;
    responseTime: number;
  };
  overallStressLevel: number; // 0-1
}

export interface FatigueMetrics extends Timestamp {
  physical: {
    eyeBlinks: number;
    headPosition: number;
    postureStability: number;
    movementReduction: number;
  };
  cognitive: {
    reactionTime: number;
    accuracyDegradation: number;
    attentionLapses: number;
    memoryPerformance: number;
  };
  overall: {
    fatigueLevel: number; // 0-1
    alertness: number; // 0-1
    recommendation: 'continue' | 'break_suggested' | 'break_required' | 'stop';
  };
}

export interface BiometricData extends Timestamp {
  heartRate: HeartRateData;
  stress: StressIndicators;
  fatigue: FatigueMetrics;
  skinConductance?: number;
  bodyTemperature?: number;
  respirationRate?: number;
  bloodOxygenLevel?: number;
}

// Gesture Recognition Types
export interface HandLandmarks extends Timestamp {
  landmarks: Point3D[]; // 21 landmarks for MediaPipe
  handedness: 'left' | 'right' | 'both';
  confidence: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface GestureEvent extends Timestamp {
  type: 'swipe' | 'tap' | 'pinch' | 'rotate' | 'point' | 'grab' | 'wave' | 'thumbs_up' | 'peace' | 'ok' | 'custom';
  confidence: number;
  duration: number;
  startPosition: Point2D;
  endPosition?: Point2D;
  velocity?: Point2D;
  scale?: number; // for pinch gestures
  rotation?: number; // for rotation gestures
  handedness: 'left' | 'right' | 'both';
  parameters?: Record<string, any>;
}

export interface GestureData extends Timestamp {
  hands: HandLandmarks[];
  gestures: GestureEvent[];
  tracking: {
    fps: number;
    latency: number;
    accuracy: number;
  };
}

// Environmental Sensor Types
export interface EnvironmentalData extends Timestamp {
  lighting: {
    illuminance: number; // lux
    colorTemperature: number; // Kelvin
    uniformity: number;
    glare: number;
  };
  audio: {
    ambientNoise: number; // dB
    frequency_spectrum: number[];
    clarity: number;
    reverberation: number;
  };
  device: {
    batteryLevel?: number;
    thermalState?: 'nominal' | 'fair' | 'serious' | 'critical';
    memoryPressure?: number;
    cpuUsage?: number;
    networkLatency?: number;
  };
  location?: {
    latitude: number;
    longitude: number;
    accuracy: number;
    altitude?: number;
  };
  motion?: {
    acceleration: Point3D;
    gyroscope: Point3D;
    magnetometer: Point3D;
  };
}

// Sensor Fusion Types
export interface SensorFusionResult extends Timestamp {
  cognitiveState: {
    attention: number;
    stress: number;
    fatigue: number;
    engagement: number;
    overload: number;
  };
  physicalState: {
    posture: string;
    comfort: number;
    alertness: number;
    strain: number;
  };
  environmentalFactors: {
    lighting_quality: number;
    noise_level: number;
    ergonomics: number;
    distractions: number;
  };
  recommendations: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
    priority: 'low' | 'medium' | 'high' | 'critical';
  };
  confidence: {
    overall: number;
    eyeTracking: number;
    voiceAnalysis: number;
    biometric: number;
    gesture: number;
    environmental: number;
  };
}

// Calibration Types
export interface CalibrationResult {
  sensor: 'eye-tracking' | 'voice' | 'gesture' | 'biometric';
  success: boolean;
  accuracy: number;
  precision: number;
  timestamp: Date;
  parameters: Record<string, any>;
  validation: {
    testPoints?: number;
    errorRate: number;
    consistency: number;
  };
  recommendations?: string[];
}

export interface CalibrationConfig {
  sensor: string;
  pointCount?: number;
  duration?: number;
  iterations?: number;
  tolerances: {
    accuracy: number;
    precision: number;
    consistency: number;
  };
  autoRecalibrate: boolean;
  validationRatio: number;
}

// Privacy and Security Types
export interface PrivacyConfig {
  dataRetention: number; // days
  localProcessing: boolean;
  encryption: boolean;
  anonymization: boolean;
  consentRequired: boolean;
  allowedSensors: string[];
  dataSharing: {
    analytics: boolean;
    research: boolean;
    thirdParty: boolean;
  };
}

export interface SensorPermissions {
  camera: boolean;
  microphone: boolean;
  location: boolean;
  motion: boolean;
  biometric: boolean;
  granted: Date;
  expires?: Date;
}

// Error and Status Types
export interface SensorError {
  sensor: string;
  code: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  recoverable: boolean;
  suggestions?: string[];
}

export interface SensorStatus {
  sensor: string;
  active: boolean;
  calibrated: boolean;
  accuracy: number;
  lastUpdate: Date;
  errorCount: number;
  performanceMetrics: {
    fps: number;
    latency: number;
    cpuUsage: number;
    memoryUsage: number;
  };
}

// Configuration Types
export interface SensorConfiguration {
  eyeTracking: {
    enabled: boolean;
    samplingRate: number;
    smoothingFactor: number;
    calibrationPoints: number;
    recalibrationInterval: number;
  };
  voiceAnalysis: {
    enabled: boolean;
    sampleRate: number;
    windowSize: number;
    emotionDetection: boolean;
    stressDetection: boolean;
  };
  biometric: {
    enabled: boolean;
    heartRateMonitoring: boolean;
    stressDetection: boolean;
    fatigueDetection: boolean;
  };
  gesture: {
    enabled: boolean;
    handTracking: boolean;
    customGestures: boolean;
    confidence_threshold: number;
  };
  environmental: {
    enabled: boolean;
    lightingSensor: boolean;
    audioSensor: boolean;
    motionSensor: boolean;
    locationSensor: boolean;
  };
  privacy: PrivacyConfig;
  performance: {
    maxFPS: number;
    adaptiveQuality: boolean;
    powerOptimization: boolean;
  };
}
// CogUI Advanced Sensor Systems
export * from './types';
export * from './eye-tracking';
export * from './voice-analysis';
export * from './biometric';
export * from './gesture';
export * from './environmental';

// Core Classes
export { EyeTracker } from './eye-tracking/EyeTracker';
export { VoiceAnalyzer } from './voice-analysis/VoiceAnalyzer';
export { BiometricMonitor } from './biometric/BiometricMonitor';
export { GestureRecognizer } from './gesture/GestureRecognizer';
export { EnvironmentalSensor } from './environmental/EnvironmentalSensor';

// Utility Classes
export { SensorFusion } from './utils/SensorFusion';
export { CalibrationManager } from './utils/CalibrationManager';
export { PrivacyManager } from './utils/PrivacyManager';

// React Hooks
export { useEyeTracking } from './hooks/useEyeTracking';
export { useVoiceAnalysis } from './hooks/useVoiceAnalysis';
export { useBiometricMonitoring } from './hooks/useBiometricMonitoring';
export { useGestureRecognition } from './hooks/useGestureRecognition';
export { useEnvironmentalSensing } from './hooks/useEnvironmentalSensing';
export { useSensorFusion } from './hooks/useSensorFusion';

// Types
export type {
  EyeTrackingData,
  GazePoint,
  FixationEvent,
  SaccadeEvent,
  BlinkEvent,
  EyeTrackingCalibration,
  VoiceAnalysisData,
  EmotionAnalysis,
  SpeechPattern,
  VoiceMetrics,
  BiometricData,
  HeartRateData,
  StressIndicators,
  FatigueMetrics,
  GestureData,
  HandLandmarks,
  GestureEvent,
  EnvironmentalData,
  SensorFusionResult,
  CalibrationResult
} from './types';
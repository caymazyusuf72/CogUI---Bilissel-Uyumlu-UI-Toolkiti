// CogUI ML Types - AI/ML Integration Type Definitions
import * as tf from '@tensorflow/tfjs';

// Core ML Configuration
export interface MLModelConfig {
  name: string;
  version: string;
  type: 'behavior-prediction' | 'cognitive-analysis' | 'adaptation-engine';
  architecture: 'sequential' | 'functional' | 'custom';
  inputShape: number[];
  outputShape: number[];
  
  // Training configuration
  epochs?: number;
  batchSize?: number;
  learningRate?: number;
  optimizer?: 'adam' | 'sgd' | 'rmsprop';
  loss?: string;
  metrics?: string[];
  
  // Model paths
  modelUrl?: string;
  weightsUrl?: string;
  
  // Performance settings
  useGPU?: boolean;
  memoryLimit?: number;
  
  // Validation
  validationSplit?: number;
  earlyStoppingPatience?: number;
}

// Behavior Prediction Types
export interface BehaviorPrediction {
  id: string;
  timestamp: Date;
  userId: string;
  sessionId: string;
  
  // Predictions
  nextAction: {
    type: 'click' | 'scroll' | 'hover' | 'focus' | 'navigate';
    element?: string;
    confidence: number;
    coordinates?: { x: number; y: number };
  };
  
  cognitiveState: CognitiveState;
  adaptationNeeds: AdaptationNeeds;
  
  // Meta information
  confidence: number;
  modelVersion: string;
  processingTime: number;
}

// Cognitive Analysis Types
export interface CognitiveState {
  attentionLevel: number; // 0-1
  cognitiveLoad: number; // 0-1
  fatigueLevel: number; // 0-1
  engagementScore: number; // 0-1
  stressIndicators: StressIndicator[];
  
  // Temporal aspects
  focusStability: number; // 0-1
  taskSwitchingFrequency: number;
  mentalEffortLevel: 'low' | 'medium' | 'high' | 'critical';
  
  // Confidence metrics
  analysisConfidence: number;
  dataQuality: 'high' | 'medium' | 'low';
  
  // Context
  timestamp: Date;
  duration: number; // milliseconds
}

export interface StressIndicator {
  type: 'mouse-jitter' | 'rapid-clicking' | 'erratic-scrolling' | 'prolonged-inactivity';
  severity: number; // 0-1
  frequency: number;
  context: string;
}

// Adaptation Needs
export interface AdaptationNeeds {
  uiSimplification: number; // 0-1, higher means more simplification needed
  contrastAdjustment: number; // -1 to 1, negative means reduce, positive means increase
  fontSizeAdjustment: number; // -1 to 1, relative adjustment
  animationReduction: number; // 0-1, higher means reduce animations
  
  // Specific adaptations
  suggestedTheme: string;
  recommendedComponents: string[];
  
  // Priority and timing
  urgency: 'low' | 'medium' | 'high' | 'immediate';
  estimatedImpact: number; // 0-1
}

// Training Data Types
export interface TrainingData {
  inputs: tf.Tensor | number[][];
  labels: tf.Tensor | number[][];
  
  // Metadata
  samples: number;
  features: number;
  classes?: number;
  
  // Data quality
  quality: DataQuality;
  preprocessing?: PreprocessingInfo;
}

export interface DataQuality {
  completeness: number; // 0-1
  accuracy: number; // 0-1
  consistency: number; // 0-1
  outlierRate: number; // 0-1
  missingValueRate: number; // 0-1
}

export interface PreprocessingInfo {
  normalization: 'min-max' | 'z-score' | 'robust' | 'none';
  featureSelection: string[];
  dimensionalityReduction?: 'pca' | 'tsne' | 'none';
  augmentation?: string[];
}

// Model Performance and Metrics
export interface ModelMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  
  // Loss metrics
  trainingLoss: number[];
  validationLoss: number[];
  
  // Time metrics
  trainingTime: number; // milliseconds
  inferenceTime: number; // milliseconds per sample
  
  // Resource usage
  memoryUsage: number; // MB
  computeIntensity: 'low' | 'medium' | 'high';
  
  // Stability metrics
  convergence: boolean;
  overfitting: boolean;
  generalization: number; // 0-1
}

// Prediction Result
export interface PredictionResult<T = any> {
  prediction: T;
  confidence: number;
  alternatives?: Array<{ prediction: T; confidence: number }>;
  
  // Meta information
  modelId: string;
  timestamp: Date;
  processingTime: number;
  
  // Feature importance
  featureImportance?: Record<string, number>;
  
  // Explanations
  explanation?: string;
  visualizations?: any[];
}

// Feature Engineering
export interface FeatureVector {
  // Mouse behavior features
  mouseSpeed: number;
  mouseAcceleration: number;
  clickFrequency: number;
  scrollPattern: number[];
  hoverDuration: number;
  
  // Keyboard behavior features
  typingSpeed: number;
  keyboardRhythm: number[];
  errorRate: number;
  pausePattern: number[];
  
  // Navigation features
  pageViewDuration: number;
  navigationPattern: string[];
  backButtonUsage: number;
  searchBehavior: number;
  
  // Temporal features
  timeOfDay: number;
  sessionDuration: number;
  interactionFrequency: number;
  
  // Context features
  deviceType: 'mobile' | 'tablet' | 'desktop';
  screenSize: { width: number; height: number };
  browserCapabilities: string[];
  
  // User profile features
  age?: number;
  cognitiveProfile?: string;
  accessibilityNeeds?: string[];
  experienceLevel?: 'novice' | 'intermediate' | 'expert';
}

// Model Training Events
export interface TrainingEvent {
  type: 'epoch-start' | 'epoch-end' | 'batch-end' | 'training-complete' | 'error';
  epoch?: number;
  batch?: number;
  loss?: number;
  metrics?: Record<string, number>;
  message?: string;
  timestamp: Date;
}

// Real-time Model Updates
export interface ModelUpdate {
  modelId: string;
  updateType: 'weights' | 'architecture' | 'hyperparameters';
  version: string;
  changes: any;
  performance: ModelMetrics;
  rollbackAvailable: boolean;
  timestamp: Date;
}

// A/B Testing for ML Models
export interface ModelExperiment {
  id: string;
  name: string;
  description: string;
  
  // Models being compared
  controlModel: string;
  treatmentModels: string[];
  
  // Experiment configuration
  trafficSplit: Record<string, number>; // model -> percentage
  startDate: Date;
  endDate?: Date;
  
  // Success metrics
  primaryMetric: string;
  secondaryMetrics: string[];
  minimumSampleSize: number;
  
  // Results
  status: 'draft' | 'running' | 'completed' | 'stopped';
  results?: ExperimentResults;
}

export interface ExperimentResults {
  winner?: string;
  significance: number;
  confidenceInterval: [number, number];
  metrics: Record<string, Record<string, number>>; // model -> metric -> value
  recommendation: string;
  timestamp: Date;
}

// Edge Computing and Model Deployment
export interface EdgeModelConfig {
  modelId: string;
  targetDevice: 'browser' | 'mobile' | 'embedded';
  optimizations: ('quantization' | 'pruning' | 'distillation')[];
  maxMemoryUsage: number; // MB
  maxInferenceTime: number; // milliseconds
  fallbackBehavior: 'graceful-degradation' | 'cloud-fallback' | 'disable';
}

// Privacy and Security
export interface PrivacyConfig {
  dataRetention: number; // days
  anonymization: boolean;
  differentialPrivacy: {
    enabled: boolean;
    epsilon?: number;
    delta?: number;
  };
  federatedLearning: {
    enabled: boolean;
    aggregationRounds?: number;
    clientParticipants?: number;
  };
  encryptionAtRest: boolean;
  encryptionInTransit: boolean;
}

// Error Handling
export interface MLError {
  code: string;
  message: string;
  type: 'model-load' | 'prediction' | 'training' | 'data-processing';
  severity: 'low' | 'medium' | 'high' | 'critical';
  context?: any;
  timestamp: Date;
  recoverable: boolean;
  suggestions?: string[];
}
// CogUI ML Package - AI/ML Integration for Cognitive UI
export * from './types';
export * from './models';
export * from './hooks';
export * from './utils';
export * from './providers/MLProvider';

// Core ML functionality
export { BehaviorPredictor } from './models/BehaviorPredictor';
export { CognitiveAnalyzer } from './models/CognitiveAnalyzer';
export { AdaptationEngine } from './models/AdaptationEngine';

// React Hooks
export { useBehaviorPrediction } from './hooks/useBehaviorPrediction';
export { useCognitiveAnalysis } from './hooks/useCognitiveAnalysis';
export { useMLModel } from './hooks/useMLModel';

// Utilities
export { ModelUtils } from './utils/ModelUtils';
export { DataPreprocessor } from './utils/DataPreprocessor';
export { FeatureExtractor } from './utils/FeatureExtractor';

// Types
export type {
  MLModelConfig,
  BehaviorPrediction,
  CognitiveState,
  TrainingData,
  ModelMetrics,
  PredictionResult
} from './types';
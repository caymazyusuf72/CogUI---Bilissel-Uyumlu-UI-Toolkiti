import * as tf from '@tensorflow/tfjs';
import { BehaviorPrediction, FeatureVector, MLModelConfig, PredictionResult, TrainingData } from '../types';
import { DataPreprocessor } from '../utils/DataPreprocessor';
import { FeatureExtractor } from '../utils/FeatureExtractor';

export class BehaviorPredictor {
  private model: tf.LayersModel | null = null;
  private config: MLModelConfig;
  private preprocessor: DataPreprocessor;
  private featureExtractor: FeatureExtractor;
  private isReady: boolean = false;
  private trainingHistory: any[] = [];

  constructor(config: MLModelConfig) {
    this.config = {
      name: 'behavior-predictor',
      version: '1.0.0',
      type: 'behavior-prediction',
      architecture: 'sequential',
      inputShape: [50], // 50 behavioral features
      outputShape: [5], // 5 possible next actions
      epochs: 100,
      batchSize: 32,
      learningRate: 0.001,
      optimizer: 'adam',
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy'],
      useGPU: true,
      validationSplit: 0.2,
      earlyStoppingPatience: 10,
      ...config
    };
    
    this.preprocessor = new DataPreprocessor();
    this.featureExtractor = new FeatureExtractor();
    
    this.initializeModel();
  }

  private async initializeModel(): Promise<void> {
    try {
      if (this.config.modelUrl) {
        // Load pre-trained model
        await this.loadModel(this.config.modelUrl);
      } else {
        // Create new model
        this.createModel();
      }
      this.isReady = true;
    } catch (error) {
      console.error('Failed to initialize BehaviorPredictor:', error);
      throw error;
    }
  }

  private createModel(): void {
    const model = tf.sequential({
      layers: [
        // Input layer
        tf.layers.dense({
          inputShape: this.config.inputShape,
          units: 128,
          activation: 'relu',
          kernelInitializer: 'heNormal',
          name: 'input_dense'
        }),
        
        // Dropout for regularization
        tf.layers.dropout({ rate: 0.3, name: 'input_dropout' }),
        
        // First hidden layer
        tf.layers.dense({
          units: 64,
          activation: 'relu',
          kernelInitializer: 'heNormal',
          name: 'hidden_1'
        }),
        
        tf.layers.dropout({ rate: 0.2, name: 'hidden_dropout_1' }),
        
        // Second hidden layer
        tf.layers.dense({
          units: 32,
          activation: 'relu',
          kernelInitializer: 'heNormal',
          name: 'hidden_2'
        }),
        
        tf.layers.dropout({ rate: 0.2, name: 'hidden_dropout_2' }),
        
        // Output layer for next action prediction
        tf.layers.dense({
          units: this.config.outputShape[0],
          activation: 'softmax',
          name: 'output'
        })
      ]
    });

    // Compile the model
    model.compile({
      optimizer: tf.train.adam(this.config.learningRate),
      loss: this.config.loss!,
      metrics: this.config.metrics!
    });

    this.model = model;
  }

  async loadModel(modelUrl: string): Promise<void> {
    try {
      this.model = await tf.loadLayersModel(modelUrl);
      console.log(`Loaded BehaviorPredictor model from ${modelUrl}`);
    } catch (error) {
      console.error('Failed to load model:', error);
      throw error;
    }
  }

  async saveModel(saveUrl: string): Promise<void> {
    if (!this.model) {
      throw new Error('No model to save');
    }

    try {
      await this.model.save(saveUrl);
      console.log(`Saved BehaviorPredictor model to ${saveUrl}`);
    } catch (error) {
      console.error('Failed to save model:', error);
      throw error;
    }
  }

  async predict(behaviorData: any): Promise<PredictionResult<BehaviorPrediction>> {
    if (!this.isReady || !this.model) {
      throw new Error('Model is not ready for prediction');
    }

    const startTime = Date.now();
    
    try {
      // Extract features from behavior data
      const features = this.featureExtractor.extractBehaviorFeatures(behaviorData);
      
      // Preprocess features
      const processedFeatures = this.preprocessor.normalizeFeatures(features);
      
      // Convert to tensor
      const inputTensor = tf.tensor2d([processedFeatures], [1, this.config.inputShape[0]]);
      
      // Make prediction
      const predictionTensor = this.model.predict(inputTensor) as tf.Tensor;
      const predictionArray = await predictionTensor.data();
      
      // Find the most likely next action
      const maxIndex = predictionArray.indexOf(Math.max(...Array.from(predictionArray)));
      const confidence = predictionArray[maxIndex];
      
      // Map prediction index to action type
      const actionTypes = ['click', 'scroll', 'hover', 'focus', 'navigate'];
      const nextActionType = actionTypes[maxIndex] as 'click' | 'scroll' | 'hover' | 'focus' | 'navigate';
      
      // Generate cognitive state analysis
      const cognitiveState = this.analyzeCognitiveState(behaviorData, features);
      
      // Generate adaptation needs
      const adaptationNeeds = this.analyzeAdaptationNeeds(cognitiveState, behaviorData);

      const prediction: BehaviorPrediction = {
        id: `pred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        userId: behaviorData.userId || 'anonymous',
        sessionId: behaviorData.sessionId || `session_${Date.now()}`,
        
        nextAction: {
          type: nextActionType,
          element: this.predictTargetElement(behaviorData, nextActionType),
          confidence: confidence,
          coordinates: this.predictCoordinates(behaviorData, nextActionType)
        },
        
        cognitiveState,
        adaptationNeeds,
        
        confidence: confidence,
        modelVersion: this.config.version,
        processingTime: Date.now() - startTime
      };

      // Generate alternatives
      const alternatives = Array.from(predictionArray)
        .map((conf, idx) => ({
          prediction: {
            ...prediction,
            nextAction: {
              ...prediction.nextAction,
              type: actionTypes[idx] as any,
              confidence: conf
            }
          },
          confidence: conf
        }))
        .filter((_, idx) => idx !== maxIndex)
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 3);

      // Cleanup tensors
      inputTensor.dispose();
      predictionTensor.dispose();

      return {
        prediction,
        confidence,
        alternatives,
        modelId: this.config.name,
        timestamp: new Date(),
        processingTime: Date.now() - startTime,
        explanation: this.generateExplanation(prediction, features)
      };

    } catch (error) {
      console.error('Prediction failed:', error);
      throw error;
    }
  }

  private analyzeCognitiveState(behaviorData: any, features: FeatureVector): any {
    // Simple heuristic-based cognitive state analysis
    // In a real implementation, this would use a separate ML model
    
    const mouseSpeed = features.mouseSpeed;
    const clickFrequency = features.clickFrequency;
    const typingSpeed = features.typingSpeed;
    const errorRate = features.errorRate;
    
    // Attention level based on mouse stability and click patterns
    const attentionLevel = Math.max(0, Math.min(1, 
      1 - (mouseSpeed > 100 ? 0.3 : 0) - 
      (clickFrequency > 5 ? 0.2 : 0) -
      (errorRate > 0.1 ? 0.3 : 0)
    ));
    
    // Cognitive load based on typing patterns and error rates
    const cognitiveLoad = Math.max(0, Math.min(1,
      (errorRate * 2) + 
      (typingSpeed < 20 ? 0.3 : 0) +
      (clickFrequency > 8 ? 0.4 : 0)
    ));
    
    // Fatigue based on session duration and interaction patterns
    const sessionDuration = features.sessionDuration;
    const fatigueLevel = Math.max(0, Math.min(1,
      (sessionDuration > 3600000 ? 0.5 : 0) + // 1 hour
      (mouseSpeed < 20 ? 0.3 : 0) +
      (attentionLevel < 0.5 ? 0.3 : 0)
    ));
    
    const engagementScore = Math.max(0, Math.min(1,
      attentionLevel * 0.4 +
      (1 - cognitiveLoad) * 0.3 +
      (1 - fatigueLevel) * 0.3
    ));
    
    return {
      attentionLevel,
      cognitiveLoad,
      fatigueLevel,
      engagementScore,
      stressIndicators: this.detectStressIndicators(behaviorData, features),
      focusStability: attentionLevel > 0.7 ? 0.8 : 0.4,
      taskSwitchingFrequency: behaviorData.navigationPattern?.length || 1,
      mentalEffortLevel: cognitiveLoad > 0.7 ? 'high' : cognitiveLoad > 0.4 ? 'medium' : 'low',
      analysisConfidence: 0.75,
      dataQuality: 'medium',
      timestamp: new Date(),
      duration: 5000
    };
  }

  private detectStressIndicators(behaviorData: any, features: FeatureVector): any[] {
    const indicators: any[] = [];
    
    if (features.mouseSpeed > 150) {
      indicators.push({
        type: 'mouse-jitter',
        severity: Math.min(1, features.mouseSpeed / 300),
        frequency: features.clickFrequency,
        context: 'High mouse movement speed detected'
      });
    }
    
    if (features.clickFrequency > 10) {
      indicators.push({
        type: 'rapid-clicking',
        severity: Math.min(1, features.clickFrequency / 20),
        frequency: features.clickFrequency,
        context: 'Unusually high clicking frequency'
      });
    }
    
    return indicators;
  }

  private analyzeAdaptationNeeds(cognitiveState: any, behaviorData: any): any {
    const { cognitiveLoad, fatigueLevel, attentionLevel } = cognitiveState;
    
    return {
      uiSimplification: Math.max(cognitiveLoad, fatigueLevel),
      contrastAdjustment: fatigueLevel > 0.6 ? 0.3 : 0,
      fontSizeAdjustment: fatigueLevel > 0.7 ? 0.2 : 0,
      animationReduction: cognitiveLoad > 0.6 ? 0.8 : 0,
      suggestedTheme: cognitiveLoad > 0.7 ? 'high-contrast' : 'default',
      recommendedComponents: cognitiveLoad > 0.6 ? ['simplified-nav', 'larger-buttons'] : [],
      urgency: cognitiveLoad > 0.8 ? 'high' : fatigueLevel > 0.7 ? 'medium' : 'low',
      estimatedImpact: Math.max(cognitiveLoad, fatigueLevel) * 0.6
    };
  }

  private predictTargetElement(behaviorData: any, actionType: string): string | undefined {
    // Simple heuristic for predicting target element
    const currentElement = behaviorData.currentElement;
    const elementHistory = behaviorData.elementHistory || [];
    
    if (actionType === 'click' && elementHistory.length > 0) {
      // Predict based on recent interaction patterns
      return elementHistory[elementHistory.length - 1];
    }
    
    return undefined;
  }

  private predictCoordinates(behaviorData: any, actionType: string): { x: number; y: number } | undefined {
    const mousePosition = behaviorData.mousePosition;
    const mouseHistory = behaviorData.mouseHistory || [];
    
    if (actionType === 'click' && mousePosition) {
      // Add some prediction based on mouse movement trajectory
      const avgX = mouseHistory.reduce((sum: number, pos: any) => sum + pos.x, mousePosition.x) / (mouseHistory.length + 1);
      const avgY = mouseHistory.reduce((sum: number, pos: any) => sum + pos.y, mousePosition.y) / (mouseHistory.length + 1);
      
      return { x: Math.round(avgX), y: Math.round(avgY) };
    }
    
    return undefined;
  }

  private generateExplanation(prediction: BehaviorPrediction, features: FeatureVector): string {
    const { nextAction, cognitiveState } = prediction;
    const actionType = nextAction.type;
    const confidence = nextAction.confidence;
    
    let explanation = `Based on behavioral patterns, the user is likely to ${actionType} next `;
    explanation += `(${(confidence * 100).toFixed(1)}% confidence). `;
    
    if (cognitiveState.cognitiveLoad > 0.6) {
      explanation += 'High cognitive load detected - user may benefit from UI simplification. ';
    }
    
    if (cognitiveState.fatigueLevel > 0.6) {
      explanation += 'User fatigue detected - consider increasing contrast and font sizes. ';
    }
    
    return explanation;
  }

  async train(trainingData: TrainingData, onProgress?: (event: any) => void): Promise<void> {
    if (!this.model) {
      throw new Error('Model not initialized');
    }

    try {
      const { inputs, labels } = trainingData;
      
      const history = await this.model.fit(inputs, labels, {
        epochs: this.config.epochs!,
        batchSize: this.config.batchSize!,
        validationSplit: this.config.validationSplit!,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            if (onProgress) {
              onProgress({
                type: 'epoch-end',
                epoch,
                loss: logs?.loss,
                accuracy: logs?.acc || logs?.accuracy,
                valLoss: logs?.val_loss,
                valAccuracy: logs?.val_acc || logs?.val_accuracy
              });
            }
          }
        }
      });

      this.trainingHistory.push(history);
      console.log('Training completed successfully');
      
    } catch (error) {
      console.error('Training failed:', error);
      throw error;
    }
  }

  getModelSummary(): string {
    if (!this.model) {
      return 'Model not initialized';
    }
    
    const summary: string[] = [];
    this.model.layers.forEach((layer, index) => {
      summary.push(`Layer ${index}: ${layer.name} (${layer.constructor.name})`);
    });
    
    return summary.join('\n');
  }

  dispose(): void {
    if (this.model) {
      this.model.dispose();
      this.model = null;
    }
    this.isReady = false;
  }

  isModelReady(): boolean {
    return this.isReady && this.model !== null;
  }

  getTrainingHistory(): any[] {
    return this.trainingHistory;
  }

  getConfig(): MLModelConfig {
    return { ...this.config };
  }
}
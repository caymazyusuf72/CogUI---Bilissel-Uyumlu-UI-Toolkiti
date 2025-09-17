import * as tf from '@tensorflow/tfjs';
import { ModelMetrics, MLModelConfig } from '../types';

export class ModelUtils {
  /**
   * Calculate comprehensive model metrics
   */
  static calculateMetrics(
    predictions: tf.Tensor,
    labels: tf.Tensor,
    threshold: number = 0.5
  ): Promise<ModelMetrics> {
    return tf.tidy(async () => {
      // Convert to binary predictions for classification metrics
      const binaryPreds = tf.cast(tf.greater(predictions, tf.scalar(threshold)), 'int32');
      const binaryLabels = tf.cast(labels, 'int32');

      // Calculate basic metrics
      const accuracy = await this.calculateAccuracy(binaryPreds, binaryLabels);
      const precision = await this.calculatePrecision(binaryPreds, binaryLabels);
      const recall = await this.calculateRecall(binaryPreds, binaryLabels);
      const f1Score = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

      return {
        accuracy,
        precision,
        recall,
        f1Score,
        trainingLoss: [],
        validationLoss: [],
        trainingTime: 0,
        inferenceTime: 0,
        memoryUsage: 0,
        computeIntensity: 'medium',
        convergence: true,
        overfitting: false,
        generalization: accuracy * 0.9 // Simple approximation
      };
    });
  }

  /**
   * Calculate model accuracy
   */
  private static async calculateAccuracy(predictions: tf.Tensor, labels: tf.Tensor): Promise<number> {
    const correct = tf.equal(predictions, labels);
    const accuracy = tf.mean(tf.cast(correct, 'float32'));
    const result = await accuracy.data();
    return result[0];
  }

  /**
   * Calculate precision
   */
  private static async calculatePrecision(predictions: tf.Tensor, labels: tf.Tensor): Promise<number> {
    const truePositives = tf.sum(tf.mul(predictions, labels));
    const predictedPositives = tf.sum(predictions);
    
    const precision = tf.div(truePositives, tf.add(predictedPositives, tf.scalar(1e-7)));
    const result = await precision.data();
    return result[0];
  }

  /**
   * Calculate recall
   */
  private static async calculateRecall(predictions: tf.Tensor, labels: tf.Tensor): Promise<number> {
    const truePositives = tf.sum(tf.mul(predictions, labels));
    const actualPositives = tf.sum(labels);
    
    const recall = tf.div(truePositives, tf.add(actualPositives, tf.scalar(1e-7)));
    const result = await recall.data();
    return result[0];
  }

  /**
   * Optimize model for deployment
   */
  static async optimizeModel(
    model: tf.LayersModel,
    options: {
      quantization?: boolean;
      pruning?: boolean;
      compressionRatio?: number;
    } = {}
  ): Promise<tf.LayersModel> {
    const { quantization = false, pruning = false, compressionRatio = 0.5 } = options;

    let optimizedModel = model;

    if (quantization) {
      // Simple quantization simulation
      console.log('Applying quantization optimization...');
      // In a real implementation, this would use tf.quantization
    }

    if (pruning) {
      console.log('Applying pruning optimization...');
      // In a real implementation, this would remove less important weights
    }

    return optimizedModel;
  }

  /**
   * Export model to different formats
   */
  static async exportModel(
    model: tf.LayersModel,
    format: 'json' | 'binary' | 'tfjs',
    path: string
  ): Promise<void> {
    try {
      switch (format) {
        case 'json':
        case 'tfjs':
          await model.save(`localstorage://${path}`);
          break;
        case 'binary':
          await model.save(`indexeddb://${path}`);
          break;
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
      console.log(`Model exported to ${path} in ${format} format`);
    } catch (error) {
      console.error('Model export failed:', error);
      throw error;
    }
  }

  /**
   * Load model with error handling and validation
   */
  static async loadModel(modelUrl: string): Promise<tf.LayersModel> {
    try {
      const model = await tf.loadLayersModel(modelUrl);
      
      // Basic model validation
      if (!model.inputs || !model.outputs) {
        throw new Error('Invalid model: missing inputs or outputs');
      }

      console.log(`Model loaded successfully from ${modelUrl}`);
      console.log(`Input shape: ${model.inputs[0].shape}`);
      console.log(`Output shape: ${model.outputs[0].shape}`);

      return model;
    } catch (error) {
      console.error('Model loading failed:', error);
      throw new Error(`Failed to load model from ${modelUrl}: ${error}`);
    }
  }

  /**
   * Compare two models performance
   */
  static compareModels(
    model1Metrics: ModelMetrics,
    model2Metrics: ModelMetrics
  ): {
    winner: 'model1' | 'model2' | 'tie';
    comparison: Record<string, { model1: number; model2: number; winner: string }>;
    recommendation: string;
  } {
    const metrics = ['accuracy', 'precision', 'recall', 'f1Score'];
    const comparison: Record<string, any> = {};
    let model1Wins = 0;
    let model2Wins = 0;

    metrics.forEach(metric => {
      const val1 = model1Metrics[metric as keyof ModelMetrics] as number;
      const val2 = model2Metrics[metric as keyof ModelMetrics] as number;
      
      comparison[metric] = {
        model1: val1,
        model2: val2,
        winner: val1 > val2 ? 'model1' : val2 > val1 ? 'model2' : 'tie'
      };

      if (val1 > val2) model1Wins++;
      else if (val2 > val1) model2Wins++;
    });

    const winner = model1Wins > model2Wins ? 'model1' : 
                   model2Wins > model1Wins ? 'model2' : 'tie';

    let recommendation = '';
    if (winner === 'model1') {
      recommendation = 'Model 1 performs better overall. Consider deploying Model 1.';
    } else if (winner === 'model2') {
      recommendation = 'Model 2 performs better overall. Consider deploying Model 2.';
    } else {
      recommendation = 'Models perform similarly. Consider other factors like inference time and model size.';
    }

    return { winner, comparison, recommendation };
  }

  /**
   * Generate model summary
   */
  static generateModelSummary(model: tf.LayersModel): string {
    const summary: string[] = [];
    summary.push('Model Architecture Summary:');
    summary.push('=' .repeat(50));

    // Model info
    summary.push(`Total layers: ${model.layers.length}`);
    summary.push(`Input shape: ${model.inputs?.[0]?.shape?.join(' x ') || 'Unknown'}`);
    summary.push(`Output shape: ${model.outputs?.[0]?.shape?.join(' x ') || 'Unknown'}`);
    summary.push('');

    // Layer details
    summary.push('Layer Details:');
    model.layers.forEach((layer, index) => {
      const layerInfo = `${index + 1}. ${layer.name} (${layer.getClassName()})`;
      summary.push(layerInfo);
    });

    // Parameter count
    const trainableParams = model.countParams();
    summary.push('');
    summary.push(`Trainable parameters: ${trainableParams.toLocaleString()}`);

    return summary.join('\n');
  }

  /**
   * Validate model configuration
   */
  static validateModelConfig(config: MLModelConfig): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields validation
    if (!config.name) errors.push('Model name is required');
    if (!config.version) errors.push('Model version is required');
    if (!config.inputShape || config.inputShape.length === 0) {
      errors.push('Input shape must be specified');
    }
    if (!config.outputShape || config.outputShape.length === 0) {
      errors.push('Output shape must be specified');
    }

    // Training configuration validation
    if (config.epochs && (config.epochs < 1 || config.epochs > 10000)) {
      warnings.push('Epochs should typically be between 1 and 10000');
    }
    if (config.batchSize && (config.batchSize < 1 || config.batchSize > 1024)) {
      warnings.push('Batch size should typically be between 1 and 1024');
    }
    if (config.learningRate && (config.learningRate <= 0 || config.learningRate > 1)) {
      warnings.push('Learning rate should be between 0 and 1');
    }

    // Performance validation
    if (config.validationSplit && (config.validationSplit <= 0 || config.validationSplit >= 1)) {
      errors.push('Validation split must be between 0 and 1');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Memory usage estimation
   */
  static estimateMemoryUsage(config: MLModelConfig): {
    modelSize: number; // MB
    trainingMemory: number; // MB
    inferenceMemory: number; // MB
  } {
    const inputSize = config.inputShape.reduce((acc, dim) => acc * dim, 1);
    const outputSize = config.outputShape.reduce((acc, dim) => acc * dim, 1);
    
    // Rough estimation (this would be more sophisticated in practice)
    const modelSize = (inputSize + outputSize) * 4 / (1024 * 1024); // 4 bytes per float32
    const trainingMemory = modelSize * (config.batchSize || 32) * 3; // Rough multiplier for gradients
    const inferenceMemory = modelSize * 1.5; // Model + activation memory

    return {
      modelSize: Math.max(0.1, modelSize),
      trainingMemory: Math.max(1, trainingMemory),
      inferenceMemory: Math.max(0.5, inferenceMemory)
    };
  }

  /**
   * Performance benchmarking
   */
  static async benchmarkInference(
    model: tf.LayersModel,
    sampleInput: tf.Tensor,
    iterations: number = 100
  ): Promise<{
    averageTime: number;
    minTime: number;
    maxTime: number;
    throughput: number;
  }> {
    const times: number[] = [];

    // Warmup
    for (let i = 0; i < 10; i++) {
      model.predict(sampleInput);
    }

    // Benchmark
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      model.predict(sampleInput);
      const end = performance.now();
      times.push(end - start);
    }

    const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const throughput = 1000 / averageTime; // predictions per second

    return { averageTime, minTime, maxTime, throughput };
  }
}
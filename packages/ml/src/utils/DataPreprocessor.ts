import { FeatureVector, DataQuality, PreprocessingInfo } from '../types';

export interface NormalizationStats {
  mean: number[];
  std: number[];
  min: number[];
  max: number[];
}

export interface PreprocessorConfig {
  normalization: 'min-max' | 'z-score' | 'robust' | 'none';
  handleMissingValues: 'drop' | 'mean' | 'median' | 'interpolate';
  outlierDetection: boolean;
  outlierThreshold: number;
  featureSelection: string[];
  maxFeatures?: number;
}

export class DataPreprocessor {
  private config: PreprocessorConfig;
  private normalizationStats: NormalizationStats | null = null;
  private selectedFeatures: string[] = [];

  constructor(config?: Partial<PreprocessorConfig>) {
    this.config = {
      normalization: 'min-max',
      handleMissingValues: 'mean',
      outlierDetection: true,
      outlierThreshold: 3.0,
      featureSelection: [],
      maxFeatures: 50,
      ...config
    };
  }

  /**
   * Normalize feature vector using the configured normalization method
   */
  normalizeFeatures(features: FeatureVector | number[]): number[] {
    if (Array.isArray(features)) {
      return this.normalizeNumericArray(features);
    }

    // Convert FeatureVector to numeric array
    const numericFeatures = this.featureVectorToArray(features);
    return this.normalizeNumericArray(numericFeatures);
  }

  /**
   * Convert FeatureVector object to numeric array
   */
  private featureVectorToArray(features: FeatureVector): number[] {
    const numericArray: number[] = [];

    // Mouse behavior features
    numericArray.push(
      features.mouseSpeed || 0,
      features.mouseAcceleration || 0,
      features.clickFrequency || 0,
      features.hoverDuration || 0
    );

    // Scroll pattern (take first 5 values, pad with zeros if needed)
    const scrollPattern = features.scrollPattern || [];
    for (let i = 0; i < 5; i++) {
      numericArray.push(scrollPattern[i] || 0);
    }

    // Keyboard behavior features
    numericArray.push(
      features.typingSpeed || 0,
      features.errorRate || 0
    );

    // Keyboard rhythm (take first 5 values)
    const keyboardRhythm = features.keyboardRhythm || [];
    for (let i = 0; i < 5; i++) {
      numericArray.push(keyboardRhythm[i] || 0);
    }

    // Pause pattern (take first 3 values)
    const pausePattern = features.pausePattern || [];
    for (let i = 0; i < 3; i++) {
      numericArray.push(pausePattern[i] || 0);
    }

    // Navigation features
    numericArray.push(
      features.pageViewDuration || 0,
      features.backButtonUsage || 0,
      features.searchBehavior || 0
    );

    // Navigation pattern (encode as numeric features)
    const navigationPattern = features.navigationPattern || [];
    numericArray.push(
      navigationPattern.length,
      navigationPattern.includes('home') ? 1 : 0,
      navigationPattern.includes('search') ? 1 : 0,
      navigationPattern.includes('profile') ? 1 : 0
    );

    // Temporal features
    numericArray.push(
      features.timeOfDay || 0,
      features.sessionDuration || 0,
      features.interactionFrequency || 0
    );

    // Device and context features
    numericArray.push(
      features.deviceType === 'mobile' ? 1 : features.deviceType === 'tablet' ? 2 : 3,
      features.screenSize?.width || 1920,
      features.screenSize?.height || 1080
    );

    // Browser capabilities (count)
    numericArray.push((features.browserCapabilities || []).length);

    // User profile features
    numericArray.push(
      features.age || 25,
      features.experienceLevel === 'novice' ? 1 : features.experienceLevel === 'intermediate' ? 2 : 3
    );

    // Accessibility needs (count)
    numericArray.push((features.accessibilityNeeds || []).length);

    // Pad or trim to exactly 50 features
    while (numericArray.length < 50) {
      numericArray.push(0);
    }

    return numericArray.slice(0, 50);
  }

  /**
   * Normalize numeric array based on configuration
   */
  private normalizeNumericArray(features: number[]): number[] {
    if (this.config.normalization === 'none') {
      return [...features];
    }

    // Handle missing values first
    const cleanedFeatures = this.handleMissingValues(features);

    switch (this.config.normalization) {
      case 'min-max':
        return this.minMaxNormalize(cleanedFeatures);
      case 'z-score':
        return this.zScoreNormalize(cleanedFeatures);
      case 'robust':
        return this.robustNormalize(cleanedFeatures);
      default:
        return cleanedFeatures;
    }
  }

  /**
   * Handle missing values (NaN, null, undefined) in features
   */
  private handleMissingValues(features: number[]): number[] {
    const result = [...features];
    
    for (let i = 0; i < result.length; i++) {
      if (result[i] == null || isNaN(result[i])) {
        switch (this.config.handleMissingValues) {
          case 'mean':
            result[i] = this.calculateMean(features.filter(x => x != null && !isNaN(x)));
            break;
          case 'median':
            result[i] = this.calculateMedian(features.filter(x => x != null && !isNaN(x)));
            break;
          case 'interpolate':
            result[i] = this.interpolateValue(features, i);
            break;
          default:
            result[i] = 0; // Default fallback
        }
      }
    }

    return result;
  }

  /**
   * Min-Max normalization (0-1 scaling)
   */
  private minMaxNormalize(features: number[]): number[] {
    if (!this.normalizationStats) {
      this.computeNormalizationStats([features]);
    }

    const stats = this.normalizationStats!;
    return features.map((value, index) => {
      const min = stats.min[index];
      const max = stats.max[index];
      return max > min ? (value - min) / (max - min) : 0;
    });
  }

  /**
   * Z-score normalization (zero mean, unit variance)
   */
  private zScoreNormalize(features: number[]): number[] {
    if (!this.normalizationStats) {
      this.computeNormalizationStats([features]);
    }

    const stats = this.normalizationStats!;
    return features.map((value, index) => {
      const mean = stats.mean[index];
      const std = stats.std[index];
      return std > 0 ? (value - mean) / std : 0;
    });
  }

  /**
   * Robust normalization (using median and IQR)
   */
  private robustNormalize(features: number[]): number[] {
    // Simplified robust normalization
    const median = this.calculateMedian(features);
    const mad = this.calculateMAD(features, median);
    
    return features.map(value => mad > 0 ? (value - median) / mad : 0);
  }

  /**
   * Compute normalization statistics from training data
   */
  computeNormalizationStats(trainingData: number[][]): void {
    const numFeatures = trainingData[0].length;
    const mean: number[] = new Array(numFeatures).fill(0);
    const std: number[] = new Array(numFeatures).fill(0);
    const min: number[] = new Array(numFeatures).fill(Infinity);
    const max: number[] = new Array(numFeatures).fill(-Infinity);

    // Calculate mean, min, max
    trainingData.forEach(sample => {
      sample.forEach((value, index) => {
        mean[index] += value;
        min[index] = Math.min(min[index], value);
        max[index] = Math.max(max[index], value);
      });
    });

    // Finalize mean
    mean.forEach((sum, index) => {
      mean[index] = sum / trainingData.length;
    });

    // Calculate standard deviation
    trainingData.forEach(sample => {
      sample.forEach((value, index) => {
        std[index] += Math.pow(value - mean[index], 2);
      });
    });

    std.forEach((sum, index) => {
      std[index] = Math.sqrt(sum / trainingData.length);
    });

    this.normalizationStats = { mean, std, min, max };
  }

  /**
   * Detect outliers using statistical methods
   */
  detectOutliers(features: number[]): boolean[] {
    if (!this.config.outlierDetection) {
      return new Array(features.length).fill(false);
    }

    const outliers: boolean[] = [];
    const threshold = this.config.outlierThreshold;

    // Z-score based outlier detection
    if (this.normalizationStats) {
      features.forEach((value, index) => {
        const mean = this.normalizationStats!.mean[index] || 0;
        const std = this.normalizationStats!.std[index] || 1;
        const zScore = Math.abs((value - mean) / std);
        outliers.push(zScore > threshold);
      });
    } else {
      // Use simple statistical outlier detection
      const mean = this.calculateMean(features);
      const std = this.calculateStandardDeviation(features, mean);
      
      features.forEach(value => {
        const zScore = Math.abs((value - mean) / std);
        outliers.push(zScore > threshold);
      });
    }

    return outliers;
  }

  /**
   * Remove or handle outliers in feature data
   */
  handleOutliers(features: number[]): number[] {
    const outliers = this.detectOutliers(features);
    const result = [...features];

    outliers.forEach((isOutlier, index) => {
      if (isOutlier) {
        // Cap outliers at threshold boundaries
        const mean = this.normalizationStats?.mean[index] || this.calculateMean(features);
        const std = this.normalizationStats?.std[index] || this.calculateStandardDeviation(features, mean);
        const threshold = this.config.outlierThreshold;
        
        if (result[index] > mean) {
          result[index] = mean + threshold * std;
        } else {
          result[index] = mean - threshold * std;
        }
      }
    });

    return result;
  }

  /**
   * Assess data quality
   */
  assessDataQuality(data: number[][]): DataQuality {
    let totalMissing = 0;
    let totalOutliers = 0;
    const totalElements = data.length * data[0].length;

    // Check for missing values and outliers
    data.forEach(sample => {
      sample.forEach(value => {
        if (value == null || isNaN(value)) {
          totalMissing++;
        }
      });
      
      if (this.config.outlierDetection) {
        const outliers = this.detectOutliers(sample);
        totalOutliers += outliers.filter(Boolean).length;
      }
    });

    const completeness = 1 - (totalMissing / totalElements);
    const outlierRate = totalOutliers / totalElements;

    // Simple heuristic quality assessment
    const consistency = Math.max(0, 1 - outlierRate * 2);
    const accuracy = Math.min(completeness, consistency);

    return {
      completeness,
      accuracy,
      consistency,
      outlierRate,
      missingValueRate: totalMissing / totalElements
    };
  }

  // Statistical utility methods
  private calculateMean(values: number[]): number {
    return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
  }

  private calculateMedian(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 
      ? (sorted[mid - 1] + sorted[mid]) / 2 
      : sorted[mid];
  }

  private calculateStandardDeviation(values: number[], mean?: number): number {
    const avg = mean ?? this.calculateMean(values);
    const squaredDiffs = values.map(value => Math.pow(value - avg, 2));
    const variance = this.calculateMean(squaredDiffs);
    return Math.sqrt(variance);
  }

  private calculateMAD(values: number[], median?: number): number {
    const med = median ?? this.calculateMedian(values);
    const deviations = values.map(value => Math.abs(value - med));
    return this.calculateMedian(deviations);
  }

  private interpolateValue(features: number[], index: number): number {
    // Simple linear interpolation
    let before = 0, after = 0;
    
    // Find nearest valid values
    for (let i = index - 1; i >= 0; i--) {
      if (!isNaN(features[i]) && features[i] != null) {
        before = features[i];
        break;
      }
    }
    
    for (let i = index + 1; i < features.length; i++) {
      if (!isNaN(features[i]) && features[i] != null) {
        after = features[i];
        break;
      }
    }
    
    return (before + after) / 2;
  }

  /**
   * Get preprocessing information
   */
  getPreprocessingInfo(): PreprocessingInfo {
    return {
      normalization: this.config.normalization,
      featureSelection: this.selectedFeatures,
      dimensionalityReduction: 'none'
    };
  }

  /**
   * Get current configuration
   */
  getConfig(): PreprocessorConfig {
    return { ...this.config };
  }

  /**
   * Reset preprocessing state
   */
  reset(): void {
    this.normalizationStats = null;
    this.selectedFeatures = [];
  }
}
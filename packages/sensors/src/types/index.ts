// CogUI Sensors Types - Sensör sistemi tip tanımları

export interface MouseTrackingData {
  position: { x: number; y: number };
  velocity: { vx: number; vy: number };
  acceleration: { ax: number; ay: number };
  timestamp: number;
  pressure?: number; // Tablet/stylus desteği
}

export interface MouseMetrics {
  averageSpeed: number;
  smoothness: number; // 0-1 arası, 1 = çok düzgün
  accuracy: number; // Click accuracy
  hesitationCount: number;
  tremor: number; // Titreme seviyesi
  dwellTime: number; // Bir noktada kalma süresi
}

export interface ClickEvent {
  position: { x: number; y: number };
  target: Element | null;
  targetSize: { width: number; height: number };
  accuracy: number; // Target merkezine uzaklık
  timestamp: number;
  reactionTime: number;
}

export interface ScrollEvent {
  direction: 'up' | 'down' | 'left' | 'right';
  distance: number;
  speed: number;
  timestamp: number;
  element: Element | null;
}

export interface AttentionData {
  focusedElement: Element | null;
  focusTime: number;
  gazeDuration: number;
  blinkRate: number; // Göz kırpma oranı (gelecek için)
  taskSwitches: number;
  timestamp: number;
}

export interface AttentionMetrics {
  averageFocusTime: number;
  maxFocusTime: number;
  taskSwitchFrequency: number; // Dakikada kaç kez görev değişimi
  attentionStability: number; // 0-1 arası
  distractionLevel: number; // 0-1 arası
  engagementScore: number; // 0-1 arası
}

export interface InteractionEvent {
  type: 'click' | 'hover' | 'focus' | 'scroll' | 'keypress';
  element: Element | null;
  elementType: string;
  position?: { x: number; y: number };
  timestamp: number;
  duration?: number;
}

export interface CognitiveMetrics {
  processingSpeed: number; // ms cinsinden ortalama tepki süresi
  decisionAccuracy: number; // 0-1 arası
  workingMemoryLoad: number; // 0-1 arası
  cognitiveLoad: 'low' | 'medium' | 'high';
  fatigueLevel: number; // 0-1 arası
  stressIndicators: number; // 0-1 arası
  timestamp: number;
}

export interface ErrorEvent {
  type: 'misclick' | 'backtrack' | 'correction' | 'timeout';
  element: Element | null;
  position?: { x: number; y: number };
  severity: 'low' | 'medium' | 'high';
  timestamp: number;
}

export interface SessionMetrics {
  sessionId: string;
  startTime: number;
  duration: number;
  totalInteractions: number;
  errorRate: number;
  averageReactionTime: number;
  cognitiveState: {
    attentionLevel: 'low' | 'medium' | 'high';
    cognitiveLoad: 'low' | 'medium' | 'high';
    fatigueLevel: 'low' | 'medium' | 'high';
    stressLevel: 'low' | 'medium' | 'high';
  };
}

export interface SensorConfig {
  enableMouseTracking: boolean;
  enableAttentionTracking: boolean;
  enableCognitiveAnalysis: boolean;
  enableErrorDetection: boolean;
  
  // Sampling rates (ms)
  mouseTrackingSampleRate: number;
  attentionSampleRate: number;
  analysisSampleRate: number;
  
  // Thresholds
  hesitationThreshold: number; // ms
  errorThreshold: number;
  fatigueThreshold: number;
  
  // Privacy settings
  anonymizeData: boolean;
  storeLocally: boolean;
  maxStorageDays: number;
}

export interface SensorEvent<T = any> {
  type: string;
  data: T;
  timestamp: number;
  sessionId: string;
}

// Analytics types
export interface AnalyticsData {
  userId?: string;
  sessionId: string;
  metrics: {
    mouse: MouseMetrics;
    attention: AttentionMetrics;
    cognitive: CognitiveMetrics;
    session: SessionMetrics;
  };
  patterns: {
    timeOfDay: 'morning' | 'afternoon' | 'evening';
    dayOfWeek: string;
    deviceType: 'desktop' | 'tablet' | 'mobile';
    browserType: string;
  };
  recommendations: {
    suggestedAdaptations: Record<string, any>;
    confidenceScore: number;
    reasoning: string[];
  };
}

// Hook return types
export interface MouseTrackingHookResult {
  metrics: MouseMetrics | null;
  isTracking: boolean;
  startTracking: () => void;
  stopTracking: () => void;
  resetMetrics: () => void;
}

export interface AttentionTrackingHookResult {
  metrics: AttentionMetrics | null;
  currentFocus: Element | null;
  isTracking: boolean;
  startTracking: () => void;
  stopTracking: () => void;
  resetMetrics: () => void;
}

export interface CognitiveAnalysisHookResult {
  metrics: CognitiveMetrics | null;
  cognitiveState: SessionMetrics['cognitiveState'] | null;
  isAnalyzing: boolean;
  startAnalysis: () => void;
  stopAnalysis: () => void;
  resetAnalysis: () => void;
}

export interface SensorManagerHookResult {
  isActive: boolean;
  currentSession: SessionMetrics | null;
  analyticsData: AnalyticsData | null;
  config: SensorConfig;
  updateConfig: (config: Partial<SensorConfig>) => void;
  startSession: () => void;
  endSession: () => void;
  getRecommendations: () => AnalyticsData['recommendations'] | null;
}

// Event callbacks
export type MouseTrackingCallback = (data: MouseTrackingData) => void;
export type AttentionTrackingCallback = (data: AttentionData) => void;
export type CognitiveAnalysisCallback = (metrics: CognitiveMetrics) => void;
export type ErrorDetectionCallback = (error: ErrorEvent) => void;
export type SessionUpdateCallback = (session: SessionMetrics) => void;
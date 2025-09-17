// CogUI Dashboard Types
import { ReactNode } from 'react';

export interface DashboardMetrics {
  totalUsers: number;
  activeUsers: number;
  cognitiveLoadAverage: number;
  accessibilityComplianceScore: number;
  taskCompletionRate: number;
  errorRate: number;
  adaptationSuccessRate: number;
  userSatisfactionScore: number;
  cognitive?: CognitiveAnalytics;
  behavior?: UserBehaviorData;
  lastUpdated?: Date;
}

export interface UserBehaviorData {
  mouseMovements: {
    averageSpeed: number;
    totalDistance: number;
    clickAccuracy: number;
    hoverTime: number;
  };
  keyboardInteraction: {
    typingSpeed: number;
    errorRate: number;
    pauseFrequency: number;
  };
  navigationPatterns: {
    pageViews: number;
    sessionDuration: number;
    bounceRate: number;
    scrollDepth: number;
  };
  cognitiveLoad: {
    attentionScore: number;
    focusTime: number;
    distractionEvents: number;
    mentalEffortLevel: 'low' | 'medium' | 'high';
  };
}

export interface CognitiveAnalytics {
  attentionMetrics: AttentionAnalytics;
  cognitiveLoadMetrics: CognitiveLoadAnalytics;
  adaptationMetrics: AdaptationAnalytics;
  userBehaviorPatterns: BehaviorPattern[];
}

export interface AttentionAnalytics {
  averageFocusTime: number;
  distractionEvents: number;
  taskSwitchFrequency: number;
  engagementScore: number;
  attentionHeatmap: HeatmapData[];
}

export interface CognitiveLoadAnalytics {
  averageLoad: number;
  peakLoadPeriods: TimeRange[];
  loadDistribution: LoadDistributionData[];
  fatigueIndicators: FatigueData[];
}

export interface AdaptationAnalytics {
  adaptationTriggered: number;
  adaptationSuccess: number;
  adaptationTypes: AdaptationTypeMetrics[];
  userPreferenceChanges: PreferenceChangeData[];
}

export interface BehaviorPattern {
  patternId: string;
  description: string;
  frequency: number;
  associatedCognitiveLoad: number;
  recommendations: string[];
}

export interface HeatmapData {
  x: number;
  y: number;
  intensity: number;
  duration: number;
}

export interface TimeRange {
  start: Date;
  end: Date;
  value: number;
}

export interface LoadDistributionData {
  range: string;
  count: number;
  percentage: number;
}

export interface FatigueData {
  timestamp: Date;
  fatigueLevel: number;
  indicators: string[];
}

export interface AdaptationTypeMetrics {
  type: 'theme' | 'layout' | 'font-size' | 'contrast' | 'animations';
  count: number;
  successRate: number;
}

export interface PreferenceChangeData {
  preference: string;
  oldValue: any;
  newValue: any;
  timestamp: Date;
  reason: 'manual' | 'automatic' | 'ai-suggested';
}

export interface RealTimeEvent {
  id: string;
  type: 'user-interaction' | 'cognitive-state-change' | 'adaptation-trigger' | 'error';
  timestamp: Date;
  data: any;
  severity?: 'low' | 'medium' | 'high';
}

export interface DashboardConfig {
  refreshInterval: number;
  maxDataPoints: number;
  enableRealTime: boolean;
  charts: ChartConfig[];
  filters: FilterConfig[];
}

export interface ChartConfig {
  id: string;
  type: 'line' | 'bar' | 'pie' | 'heatmap' | 'scatter';
  title: string;
  dataSource: string;
  refreshInterval?: number;
  height?: number;
  width?: number;
}

export interface FilterConfig {
  id: string;
  type: 'date-range' | 'user-group' | 'cognitive-profile' | 'device-type';
  label: string;
  defaultValue?: any;
}

export interface UserSegment {
  id: string;
  name: string;
  criteria: SegmentCriteria;
  userCount: number;
  metrics: DashboardMetrics;
}

export interface SegmentCriteria {
  cognitiveProfile?: string[];
  accessibilityNeeds?: string[];
  deviceType?: string[];
  usageFrequency?: 'low' | 'medium' | 'high';
  ageGroup?: string[];
}

export interface AlertConfig {
  id: string;
  name: string;
  condition: AlertCondition;
  severity: 'info' | 'warning' | 'critical';
  enabled: boolean;
  recipients: string[];
}

export interface AlertCondition {
  metric: string;
  operator: '>' | '<' | '=' | '!=' | '>=' | '<=';
  threshold: number;
  duration?: number; // minutes
}

export interface DashboardWidgetProps {
  title: string;
  children: ReactNode;
  loading?: boolean;
  error?: string;
  refreshable?: boolean;
  onRefresh?: () => void;
  className?: string;
}

export interface ChartWidgetProps extends DashboardWidgetProps {
  data: any[];
  chartType: ChartConfig['type'];
  height?: number;
  responsive?: boolean;
  accessibility?: {
    description: string;
    dataTable?: boolean;
  };
}
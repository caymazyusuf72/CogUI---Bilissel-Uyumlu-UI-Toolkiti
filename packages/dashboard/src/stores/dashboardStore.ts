import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { 
  DashboardMetrics, 
  CognitiveAnalytics, 
  RealTimeEvent, 
  DashboardConfig,
  UserSegment,
  AlertConfig 
} from '../types';

interface DashboardState {
  // Data State
  metrics: DashboardMetrics | null;
  cognitiveAnalytics: CognitiveAnalytics | null;
  realTimeEvents: RealTimeEvent[];
  userSegments: UserSegment[];
  
  // UI State
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  
  // Configuration
  config: DashboardConfig;
  selectedTimeRange: { start: Date; end: Date };
  selectedSegments: string[];
  
  // Real-time Connection
  isConnected: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  
  // Alerts
  alerts: AlertConfig[];
  activeAlerts: RealTimeEvent[];
  
  // Actions
  setMetrics: (metrics: DashboardMetrics) => void;
  setCognitiveAnalytics: (analytics: CognitiveAnalytics) => void;
  addRealTimeEvent: (event: RealTimeEvent) => void;
  clearRealTimeEvents: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  updateConfig: (config: Partial<DashboardConfig>) => void;
  setTimeRange: (start: Date, end: Date) => void;
  setSelectedSegments: (segments: string[]) => void;
  setConnectionStatus: (status: DashboardState['connectionStatus']) => void;
  refreshData: () => Promise<void>;
}

export const useDashboardStore = create<DashboardState>()(
  subscribeWithSelector((set, get) => ({
    // Initial State
    metrics: null,
    cognitiveAnalytics: null,
    realTimeEvents: [],
    userSegments: [],
    loading: false,
    error: null,
    lastUpdated: null,
    
    config: {
      refreshInterval: 30000, // 30 seconds
      maxDataPoints: 1000,
      enableRealTime: true,
      charts: [],
      filters: []
    },
    
    selectedTimeRange: {
      start: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
      end: new Date()
    },
    selectedSegments: [],
    
    isConnected: false,
    connectionStatus: 'disconnected',
    
    alerts: [],
    activeAlerts: [],
    
    // Actions
    setMetrics: (metrics) => {
      set({ 
        metrics, 
        lastUpdated: new Date(),
        loading: false,
        error: null 
      });
    },
    
    setCognitiveAnalytics: (cognitiveAnalytics) => {
      set({ 
        cognitiveAnalytics,
        lastUpdated: new Date()
      });
    },
    
    addRealTimeEvent: (event) => {
      set((state) => {
        const events = [event, ...state.realTimeEvents].slice(0, state.config.maxDataPoints);
        
        // Check if event triggers any alerts
        const triggeredAlerts = state.alerts
          .filter(alert => alert.enabled)
          .filter(alert => {
            // Simple alert condition checking
            if (event.type === alert.condition.metric) {
              // This would be more sophisticated in a real implementation
              return true;
            }
            return false;
          })
          .map(alert => ({
            ...event,
            id: `alert-${Date.now()}`,
            type: 'error' as const,
            severity: alert.severity as 'high'
          }));
        
        return {
          realTimeEvents: events,
          activeAlerts: [...triggeredAlerts, ...state.activeAlerts].slice(0, 50)
        };
      });
    },
    
    clearRealTimeEvents: () => {
      set({ realTimeEvents: [], activeAlerts: [] });
    },
    
    setLoading: (loading) => {
      set({ loading });
    },
    
    setError: (error) => {
      set({ error, loading: false });
    },
    
    updateConfig: (newConfig) => {
      set((state) => ({
        config: { ...state.config, ...newConfig }
      }));
    },
    
    setTimeRange: (start, end) => {
      set({ selectedTimeRange: { start, end } });
    },
    
    setSelectedSegments: (segments) => {
      set({ selectedSegments: segments });
    },
    
    setConnectionStatus: (connectionStatus) => {
      set({ 
        connectionStatus,
        isConnected: connectionStatus === 'connected'
      });
    },
    
    refreshData: async () => {
      const state = get();
      set({ loading: true, error: null });
      
      try {
        // This would make actual API calls in a real implementation
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Simulate data refresh
        const mockMetrics: DashboardMetrics = {
          totalUsers: Math.floor(Math.random() * 10000) + 1000,
          activeUsers: Math.floor(Math.random() * 500) + 100,
          cognitiveLoadAverage: Math.random() * 0.8 + 0.2,
          accessibilityComplianceScore: Math.random() * 0.2 + 0.8,
          taskCompletionRate: Math.random() * 0.15 + 0.85,
          errorRate: Math.random() * 0.05,
          adaptationSuccessRate: Math.random() * 0.1 + 0.9,
          userSatisfactionScore: Math.random() * 0.2 + 0.8
        };
        
        set({ 
          metrics: mockMetrics,
          lastUpdated: new Date(),
          loading: false 
        });
        
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'An error occurred',
          loading: false 
        });
      }
    }
  }))
);

// Selectors for computed values
export const selectMetricsWithTrends = (state: DashboardState) => {
  if (!state.metrics) return null;
  
  // In a real implementation, this would calculate trends from historical data
  return {
    ...state.metrics,
    trends: {
      totalUsers: Math.random() > 0.5 ? 'up' : 'down',
      activeUsers: Math.random() > 0.5 ? 'up' : 'down',
      cognitiveLoadAverage: Math.random() > 0.5 ? 'up' : 'down',
      taskCompletionRate: Math.random() > 0.5 ? 'up' : 'down'
    }
  };
};

export const selectFilteredEvents = (state: DashboardState) => {
  const { realTimeEvents, selectedTimeRange } = state;
  
  return realTimeEvents.filter(event => 
    event.timestamp >= selectedTimeRange.start && 
    event.timestamp <= selectedTimeRange.end
  );
};

export const selectCriticalAlerts = (state: DashboardState) => {
  return state.activeAlerts.filter(alert => alert.severity === 'high');
};
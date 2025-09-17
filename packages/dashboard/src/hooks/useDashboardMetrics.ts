import { useEffect, useCallback, useRef } from 'react';
import { useDashboardStore } from '../stores/dashboardStore';
import { useRealTimeStore } from '../stores/realTimeStore';
import { DashboardMetrics, CognitiveAnalytics, UserBehaviorData } from '../types';

export interface UseDashboardMetricsOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  enableRealTime?: boolean;
  filters?: {
    timeRange?: 'hour' | 'day' | 'week' | 'month' | 'custom';
    startDate?: Date;
    endDate?: Date;
    userId?: string;
    sessionId?: string;
  };
  onError?: (error: Error) => void;
  onDataUpdate?: (metrics: DashboardMetrics) => void;
}

export interface UseDashboardMetricsReturn {
  // Data
  metrics: DashboardMetrics | null;
  cognitiveAnalytics: CognitiveAnalytics | null;
  behaviorData: UserBehaviorData | null;
  
  // State
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  isRealTimeEnabled: boolean;
  
  // Actions
  fetchMetrics: () => Promise<void>;
  refreshMetrics: () => Promise<void>;
  enableRealTime: () => void;
  disableRealTime: () => void;
  setFilters: (filters: UseDashboardMetricsOptions['filters']) => void;
  clearError: () => void;
  
  // Real-time status
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'reconnecting';
  realtimeHealth: 'healthy' | 'warning' | 'unhealthy' | 'unknown';
}

export const useDashboardMetrics = (
  options: UseDashboardMetricsOptions = {}
): UseDashboardMetricsReturn => {
  const {
    autoRefresh = true,
    refreshInterval = 30000, // 30 seconds
    enableRealTime = true,
    filters = {},
    onError,
    onDataUpdate,
  } = options;

  // Store hooks
  const {
    metrics,
    loading,
    error,
    lastUpdated,
    selectedTimeRange,
    setMetrics,
    setLoading,
    setError,
    setTimeRange,
    refreshData,
  } = useDashboardStore();

  const {
    connectionState,
    messageQueue,
    connect,
    disconnect,
    subscribe,
    unsubscribe,
  } = useRealTimeStore();

  // Refs for cleanup
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isSubscribedRef = useRef(false);

  // Derived state
  const cognitiveAnalytics = metrics?.cognitive || null;
  const behaviorData = metrics?.behavior || null;
  const isRealTimeEnabled = connectionState === 'connected' && isSubscribedRef.current;

  // Real-time health check
  const realtimeHealth = useCallback(() => {
    if (!isRealTimeEnabled) return 'unknown';
    
    const now = new Date();
    const recentMessages = messageQueue.filter(
      msg => now.getTime() - msg.timestamp.getTime() < 60000 // Last minute
    );
    
    if (recentMessages.length === 0) return 'unhealthy';
    if (recentMessages.length < 5) return 'warning';
    return 'healthy';
  }, [isRealTimeEnabled, messageQueue]);

  // Fetch metrics from API
  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Simulate API call - replace with actual API endpoint
      const queryParams = new URLSearchParams();
      
      if (filters.timeRange) queryParams.set('timeRange', filters.timeRange);
      if (filters.startDate) queryParams.set('startDate', filters.startDate.toISOString());
      if (filters.endDate) queryParams.set('endDate', filters.endDate.toISOString());
      if (filters.userId) queryParams.set('userId', filters.userId);
      if (filters.sessionId) queryParams.set('sessionId', filters.sessionId);

      const response = await fetch(`/api/dashboard/metrics?${queryParams}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch metrics: ${response.statusText}`);
      }
      
      const metricsData: DashboardMetrics = await response.json();
      
      // Validate data structure
      if (!metricsData || typeof metricsData !== 'object') {
        throw new Error('Invalid metrics data format');
      }
      
      setMetrics(metricsData);
      
      if (onDataUpdate) {
        onDataUpdate(metricsData);
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      
      if (onError) {
        onError(err instanceof Error ? err : new Error(errorMessage));
      }
      
      console.error('Failed to fetch dashboard metrics:', err);
    } finally {
      setLoading(false);
    }
  }, [filters, setMetrics, setLoading, setError, onError, onDataUpdate]);

  // Refresh metrics (force fetch)
  const refreshMetrics = useCallback(async () => {
    await refreshData();
  }, [refreshData]);

  // Set filters and refetch
  const setFilters = useCallback((newFilters: UseDashboardMetricsOptions['filters']) => {
    if (newFilters?.timeRange === 'custom' && newFilters.startDate && newFilters.endDate) {
      setTimeRange(newFilters.startDate, newFilters.endDate);
    } else if (newFilters?.timeRange) {
      const now = new Date();
      let start: Date;
      
      switch (newFilters.timeRange) {
        case 'hour':
          start = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case 'day':
          start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case 'week':
          start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      }
      
      setTimeRange(start, now);
    }
  }, [setTimeRange]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, [setError]);

  // Real-time connection management
  const enableRealTimeConnection = useCallback(() => {
    if (connectionState !== 'connected') {
      // Replace with actual WebSocket URL
      const wsUrl = process.env.NODE_ENV === 'production' 
        ? 'wss://api.cogui.dev/ws/dashboard'
        : 'ws://localhost:8080/ws/dashboard';
      
      connect(wsUrl);
    }
    
    if (!isSubscribedRef.current) {
      subscribe('dashboard-metrics');
      subscribe('cognitive-analytics');
      subscribe('user-behavior');
      isSubscribedRef.current = true;
    }
  }, [connectionState, connect, subscribe]);

  const disableRealTimeConnection = useCallback(() => {
    if (isSubscribedRef.current) {
      unsubscribe('dashboard-metrics');
      unsubscribe('cognitive-analytics');
      unsubscribe('user-behavior');
      isSubscribedRef.current = false;
    }
    
    disconnect();
  }, [disconnect, unsubscribe]);

  // Process real-time messages
  useEffect(() => {
    if (!isRealTimeEnabled) return;
    
    const recentMetricsMessages = messageQueue
      .filter(msg => msg.type === 'metrics' && 
                     new Date().getTime() - msg.timestamp.getTime() < 5000)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    if (recentMetricsMessages.length > 0) {
      const latestMessage = recentMetricsMessages[0];
      
      try {
        const updatedMetrics: Partial<DashboardMetrics> = latestMessage.data;
        
        // Merge with existing metrics
        if (metrics) {
          const mergedMetrics = {
            ...metrics,
            ...updatedMetrics,
            lastUpdated: new Date(),
          };
          
          setMetrics(mergedMetrics as DashboardMetrics);
          
          if (onDataUpdate) {
            onDataUpdate(mergedMetrics as DashboardMetrics);
          }
        }
      } catch (err) {
        console.error('Failed to process real-time metrics update:', err);
      }
    }
  }, [messageQueue, metrics, isRealTimeEnabled, setMetrics, onDataUpdate]);

  // Auto-refresh setup
  useEffect(() => {
    if (!autoRefresh || loading) return;
    
    refreshTimerRef.current = setInterval(() => {
      if (!isRealTimeEnabled) {
        fetchMetrics();
      }
    }, refreshInterval);
    
    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [autoRefresh, loading, isRealTimeEnabled, refreshInterval, fetchMetrics]);

  // Initial fetch and real-time setup
  useEffect(() => {
    fetchMetrics();
    
    if (enableRealTime) {
      enableRealTimeConnection();
    }
    
    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
      
      if (isSubscribedRef.current) {
        disableRealTimeConnection();
      }
    };
  }, []); // Only run once on mount

  // Update filters effect
  useEffect(() => {
    if (Object.keys(filters).length > 0) {
      setFilters(filters);
      fetchMetrics();
    }
  }, [JSON.stringify(filters)]); // Re-run when filters change

  return {
    // Data
    metrics,
    cognitiveAnalytics,
    behaviorData,
    
    // State
    loading,
    error,
    lastUpdated: lastUpdated,
    isRealTimeEnabled,
    
    // Actions
    fetchMetrics,
    refreshMetrics,
    enableRealTime: enableRealTimeConnection,
    disableRealTime: disableRealTimeConnection,
    setFilters,
    clearError,
    
    // Real-time status
    connectionStatus: connectionState,
    realtimeHealth: realtimeHealth(),
  };
};

export default useDashboardMetrics;
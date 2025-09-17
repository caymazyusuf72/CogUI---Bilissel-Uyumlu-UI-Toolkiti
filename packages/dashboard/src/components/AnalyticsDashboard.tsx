import React, { useEffect, useState, useMemo } from 'react';
import { css } from '@emotion/react';
import { useTheme } from '@cogui/core';
import { MetricsCard } from './MetricsCard';
import { ChartWidget, ChartDataPoint } from './ChartWidget';
import { useDashboardMetrics } from '../hooks/useDashboardMetrics';
import { DashboardMetrics, CognitiveAnalytics, UserBehaviorData } from '../types';

export interface AnalyticsDashboardProps {
  autoRefresh?: boolean;
  refreshInterval?: number;
  enableRealTime?: boolean;
  className?: string;
  onError?: (error: Error) => void;
  onDataUpdate?: (metrics: DashboardMetrics) => void;
  'data-testid'?: string;
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  autoRefresh = true,
  refreshInterval = 30000,
  enableRealTime = true,
  className,
  onError,
  onDataUpdate,
  'data-testid': testId = 'analytics-dashboard',
  ...props
}) => {
  const { theme } = useTheme();
  const [selectedTimeRange, setSelectedTimeRange] = useState<'hour' | 'day' | 'week' | 'month'>('day');

  const {
    metrics,
    cognitiveAnalytics,
    behaviorData,
    loading,
    error,
    lastUpdated,
    isRealTimeEnabled,
    refreshMetrics,
    connectionStatus,
    realtimeHealth,
    clearError,
  } = useDashboardMetrics({
    autoRefresh,
    refreshInterval,
    enableRealTime,
    filters: { timeRange: selectedTimeRange },
    onError,
    onDataUpdate,
  });

  const dashboardStyles = css`
    padding: ${theme.spacing.lg};
    background: ${theme.colors.background.secondary};
    min-height: 100vh;
    
    @media (max-width: ${theme.breakpoints.md}) {
      padding: ${theme.spacing.md};
    }
  `;

  const headerStyles = css`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: ${theme.spacing.xl};
    
    @media (max-width: ${theme.breakpoints.md}) {
      flex-direction: column;
      gap: ${theme.spacing.md};
      align-items: stretch;
    }
  `;

  const titleStyles = css`
    font-family: ${theme.typography.fontFamilies.heading};
    font-size: ${theme.typography.fontSize['3xl']};
    font-weight: ${theme.typography.fontWeight.bold};
    color: ${theme.colors.text.primary};
    margin: 0;
    
    @media (max-width: ${theme.breakpoints.md}) {
      font-size: ${theme.typography.fontSize['2xl']};
    }
  `;

  const controlsStyles = css`
    display: flex;
    gap: ${theme.spacing.md};
    align-items: center;
    
    @media (max-width: ${theme.breakpoints.md}) {
      justify-content: space-between;
    }
  `;

  const timeRangeSelectorStyles = css`
    select {
      padding: ${theme.spacing.sm} ${theme.spacing.md};
      border: 1px solid ${theme.colors.border.primary};
      border-radius: ${theme.borderRadius.sm};
      background: ${theme.colors.background.primary};
      color: ${theme.colors.text.primary};
      font-family: ${theme.typography.fontFamilies.body};
      font-size: ${theme.typography.fontSize.sm};
      
      &:focus {
        outline: 2px solid ${theme.colors.primary[500]};
        outline-offset: 2px;
      }
    }
  `;

  const statusBadgeStyles = css`
    display: flex;
    align-items: center;
    gap: ${theme.spacing.xs};
    padding: ${theme.spacing.xs} ${theme.spacing.sm};
    border-radius: ${theme.borderRadius.full};
    font-size: ${theme.typography.fontSize.xs};
    font-weight: ${theme.typography.fontWeight.medium};
    
    ${isRealTimeEnabled ? `
      background: ${theme.colors.success[100]};
      color: ${theme.colors.success[700]};
    ` : `
      background: ${theme.colors.warning[100]};
      color: ${theme.colors.warning[700]};
    `}
  `;

  const refreshButtonStyles = css`
    padding: ${theme.spacing.sm} ${theme.spacing.md};
    border: 1px solid ${theme.colors.border.primary};
    border-radius: ${theme.borderRadius.sm};
    background: ${theme.colors.background.primary};
    color: ${theme.colors.text.primary};
    font-family: ${theme.typography.fontFamilies.body};
    font-size: ${theme.typography.fontSize.sm};
    cursor: pointer;
    transition: all 0.2s ease;
    
    &:hover {
      background: ${theme.colors.background.hover};
      border-color: ${theme.colors.border.hover};
    }
    
    &:focus {
      outline: 2px solid ${theme.colors.primary[500]};
      outline-offset: 2px;
    }
    
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `;

  const gridStyles = css`
    display: grid;
    gap: ${theme.spacing.lg};
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    margin-bottom: ${theme.spacing.xl};
  `;

  const chartsGridStyles = css`
    display: grid;
    gap: ${theme.spacing.lg};
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    
    @media (max-width: ${theme.breakpoints.lg}) {
      grid-template-columns: 1fr;
    }
  `;

  const errorStyles = css`
    padding: ${theme.spacing.lg};
    background: ${theme.colors.error[50]};
    border: 1px solid ${theme.colors.error[200]};
    border-radius: ${theme.borderRadius.md};
    color: ${theme.colors.error[700]};
    text-align: center;
    margin-bottom: ${theme.spacing.lg};
  `;

  const loadingOverlayStyles = css`
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: ${theme.colors.background.primary}aa;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  `;

  // Generate mock chart data from metrics
  const chartData = useMemo(() => {
    if (!metrics) return [];
    
    return [
      { name: 'Total Users', value: metrics.totalUsers, color: theme.colors.primary[500] },
      { name: 'Active Users', value: metrics.activeUsers, color: theme.colors.success[500] },
      { name: 'Completion Rate', value: Math.round(metrics.taskCompletionRate * 100), color: theme.colors.info[500] },
      { name: 'Satisfaction', value: Math.round(metrics.userSatisfactionScore * 100), color: theme.colors.warning[500] },
    ];
  }, [metrics, theme]);

  // Generate time series data
  const timeSeriesData = useMemo(() => {
    const data: ChartDataPoint[] = [];
    const now = new Date();
    const points = selectedTimeRange === 'hour' ? 12 : selectedTimeRange === 'day' ? 24 : 30;
    
    for (let i = points; i >= 0; i--) {
      const date = new Date(now);
      if (selectedTimeRange === 'hour') {
        date.setMinutes(date.getMinutes() - i * 5);
      } else if (selectedTimeRange === 'day') {
        date.setHours(date.getHours() - i);
      } else {
        date.setDate(date.getDate() - i);
      }
      
      data.push({
        name: selectedTimeRange === 'hour' 
          ? date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
          : selectedTimeRange === 'day'
          ? date.toLocaleTimeString('en-US', { hour: '2-digit' })
          : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        'Cognitive Load': Math.random() * 80 + 20,
        'Attention': Math.random() * 90 + 10,
        'Task Completion': Math.random() * 95 + 5,
      });
    }
    
    return data;
  }, [selectedTimeRange]);

  const getStatusDot = () => (
    <div
      css={css`
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: ${isRealTimeEnabled ? theme.colors.success[500] : theme.colors.warning[500]};
      `}
    />
  );

  return (
    <div css={dashboardStyles} className={className} data-testid={testId} {...props}>
      {loading && (
        <div css={loadingOverlayStyles}>
          <div>Loading analytics...</div>
        </div>
      )}
      
      <header css={headerStyles}>
        <h1 css={titleStyles}>CogUI Analytics Dashboard</h1>
        
        <div css={controlsStyles}>
          <div css={timeRangeSelectorStyles}>
            <select
              value={selectedTimeRange}
              onChange={(e) => setSelectedTimeRange(e.target.value as typeof selectedTimeRange)}
              aria-label="Select time range"
            >
              <option value="hour">Last Hour</option>
              <option value="day">Last 24 Hours</option>
              <option value="week">Last Week</option>
              <option value="month">Last Month</option>
            </select>
          </div>
          
          <div css={statusBadgeStyles}>
            {getStatusDot()}
            <span>
              {isRealTimeEnabled ? 'Real-time' : 'Static'} • {connectionStatus}
            </span>
          </div>
          
          <button
            css={refreshButtonStyles}
            onClick={refreshMetrics}
            disabled={loading}
            aria-label="Refresh dashboard data"
          >
            Refresh
          </button>
        </div>
      </header>

      {error && (
        <div css={errorStyles} role="alert">
          <p>Error loading dashboard: {error}</p>
          <button onClick={clearError}>Dismiss</button>
        </div>
      )}

      {metrics && (
        <>
          {/* Metrics Cards Grid */}
          <div css={gridStyles}>
            <MetricsCard
              title="Total Users"
              value={metrics.totalUsers.toLocaleString()}
              subtitle="Registered users"
              trend={{ value: 12.5, type: 'increase' }}
              variant="default"
            />
            
            <MetricsCard
              title="Active Users"
              value={metrics.activeUsers.toLocaleString()}
              subtitle="Currently online"
              trend={{ value: 8.3, type: 'increase' }}
              variant="success"
            />
            
            <MetricsCard
              title="Cognitive Load"
              value={`${Math.round(metrics.cognitiveLoadAverage * 100)}%`}
              subtitle="Average cognitive load"
              trend={{ value: 3.2, type: 'decrease' }}
              variant="warning"
            />
            
            <MetricsCard
              title="Accessibility Score"
              value={`${Math.round(metrics.accessibilityComplianceScore * 100)}%`}
              subtitle="WCAG compliance"
              trend={{ value: 1.8, type: 'increase' }}
              variant="success"
            />
            
            <MetricsCard
              title="Task Completion"
              value={`${Math.round(metrics.taskCompletionRate * 100)}%`}
              subtitle="Success rate"
              trend={{ value: 5.1, type: 'increase' }}
              variant="success"
            />
            
            <MetricsCard
              title="Error Rate"
              value={`${(metrics.errorRate * 100).toFixed(1)}%`}
              subtitle="System errors"
              trend={{ value: 15.2, type: 'decrease' }}
              variant="error"
            />
          </div>

          {/* Charts Grid */}
          <div css={chartsGridStyles}>
            <ChartWidget
              title="User Metrics Overview"
              data={chartData}
              type="bar"
              height={300}
              loading={loading}
              error={error}
            />
            
            <ChartWidget
              title="Cognitive & Attention Trends"
              data={timeSeriesData}
              type="line"
              height={300}
              dataKeys={['Cognitive Load', 'Attention', 'Task Completion']}
              loading={loading}
              error={error}
            />
            
            <ChartWidget
              title="User Distribution"
              data={chartData.slice(0, 4)}
              type="pie"
              height={300}
              loading={loading}
              error={error}
              showLegend={true}
            />
            
            <ChartWidget
              title="Performance Metrics"
              data={timeSeriesData}
              type="area"
              height={300}
              dataKeys={['Task Completion']}
              loading={loading}
              error={error}
            />
          </div>

          {lastUpdated && (
            <div
              css={css`
                text-align: center;
                color: ${theme.colors.text.tertiary};
                font-size: ${theme.typography.fontSize.sm};
                margin-top: ${theme.spacing.lg};
              `}
            >
              Last updated: {lastUpdated.toLocaleString()}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export { AnalyticsDashboard };
export type { AnalyticsDashboardProps };
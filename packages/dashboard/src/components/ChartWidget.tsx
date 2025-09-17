import React, { useMemo, useRef, useEffect } from 'react';
import { css } from '@emotion/react';
import { useTheme } from '@cogui/core';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export interface ChartDataPoint {
  name: string;
  value: number;
  [key: string]: any;
}

export interface ChartWidgetProps {
  title: string;
  data: ChartDataPoint[];
  type: 'line' | 'area' | 'bar' | 'pie';
  height?: number;
  loading?: boolean;
  error?: string | null;
  showLegend?: boolean;
  showGrid?: boolean;
  showTooltip?: boolean;
  colors?: string[];
  xAxisKey?: string;
  yAxisKey?: string;
  dataKeys?: string[];
  onDataPointClick?: (data: ChartDataPoint, index: number) => void;
  className?: string;
  'data-testid'?: string;
}

const ChartWidget: React.FC<ChartWidgetProps> = ({
  title,
  data,
  type,
  height = 300,
  loading = false,
  error = null,
  showLegend = true,
  showGrid = true,
  showTooltip = true,
  colors,
  xAxisKey = 'name',
  yAxisKey = 'value',
  dataKeys = ['value'],
  onDataPointClick,
  className,
  'data-testid': testId = 'chart-widget',
  ...props
}) => {
  const { theme } = useTheme();
  const chartRef = useRef<HTMLDivElement>(null);
  
  const defaultColors = useMemo(() => [
    theme.colors.primary[500],
    theme.colors.secondary[500],
    theme.colors.success[500],
    theme.colors.warning[500],
    theme.colors.error[500],
    theme.colors.info[500],
  ], [theme]);
  
  const chartColors = colors || defaultColors;
  
  const containerStyles = css`
    background: ${theme.colors.background.primary};
    border: 1px solid ${theme.colors.border.primary};
    border-radius: ${theme.borderRadius.md};
    padding: ${theme.spacing.lg};
    box-shadow: ${theme.shadows.sm};
    position: relative;
    
    &:focus-within {
      outline: 2px solid ${theme.colors.primary[500]};
      outline-offset: 2px;
    }
  `;
  
  const headerStyles = css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: ${theme.spacing.lg};
  `;
  
  const titleStyles = css`
    font-family: ${theme.typography.fontFamilies.heading};
    font-size: ${theme.typography.fontSize.lg};
    font-weight: ${theme.typography.fontWeight.semibold};
    color: ${theme.colors.text.primary};
    margin: 0;
  `;
  
  const chartContainerStyles = css`
    position: relative;
    width: 100%;
    height: ${height}px;
    
    .recharts-wrapper {
      font-family: ${theme.typography.fontFamilies.body};
    }
    
    .recharts-cartesian-axis-tick-value {
      font-size: ${theme.typography.fontSize.sm};
      fill: ${theme.colors.text.secondary};
    }
    
    .recharts-legend-item-text {
      color: ${theme.colors.text.primary} !important;
      font-size: ${theme.typography.fontSize.sm};
    }
    
    .recharts-tooltip-wrapper {
      .recharts-default-tooltip {
        background-color: ${theme.colors.background.secondary} !important;
        border: 1px solid ${theme.colors.border.primary} !important;
        border-radius: ${theme.borderRadius.sm} !important;
        box-shadow: ${theme.shadows.md} !important;
        
        .recharts-tooltip-label {
          color: ${theme.colors.text.primary} !important;
          font-weight: ${theme.typography.fontWeight.medium};
        }
        
        .recharts-tooltip-item {
          color: ${theme.colors.text.secondary} !important;
        }
      }
    }
  `;
  
  const loadingStyles = css`
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: ${theme.spacing.md};
    z-index: 1;
  `;
  
  const loadingSpinnerStyles = css`
    width: 40px;
    height: 40px;
    border: 3px solid ${theme.colors.border.primary};
    border-top: 3px solid ${theme.colors.primary[500]};
    border-radius: 50%;
    animation: spin 1s linear infinite;
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  
  const errorStyles = css`
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
    color: ${theme.colors.error[600]};
    font-size: ${theme.typography.fontSize.md};
    z-index: 1;
  `;
  
  const emptyStateStyles = css`
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
    color: ${theme.colors.text.tertiary};
    font-size: ${theme.typography.fontSize.md};
    z-index: 1;
  `;
  
  const chartStyle = {
    color: theme.colors.text.primary,
  };
  
  const gridStyle = {
    stroke: theme.colors.border.secondary,
    strokeDasharray: '3 3',
  };
  
  const axisStyle = {
    fontSize: theme.typography.fontSize.sm,
    fill: theme.colors.text.secondary,
  };
  
  const handleDataClick = (data: any, index: number) => {
    if (onDataPointClick) {
      onDataPointClick(data, index);
    }
  };
  
  const renderChart = () => {
    const commonProps = {
      data,
      style: chartStyle,
    };
    
    switch (type) {
      case 'line':
        return (
          <LineChart {...commonProps}>
            {showGrid && <CartesianGrid {...gridStyle} />}
            <XAxis 
              dataKey={xAxisKey} 
              style={axisStyle}
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              style={axisStyle}
              tick={{ fontSize: 12 }}
            />
            {showTooltip && <Tooltip />}
            {showLegend && <Legend />}
            {dataKeys.map((key, index) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={chartColors[index % chartColors.length]}
                strokeWidth={2}
                dot={{ fill: chartColors[index % chartColors.length], strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: chartColors[index % chartColors.length], strokeWidth: 2 }}
                onClick={handleDataClick}
              />
            ))}
          </LineChart>
        );
        
      case 'area':
        return (
          <AreaChart {...commonProps}>
            {showGrid && <CartesianGrid {...gridStyle} />}
            <XAxis 
              dataKey={xAxisKey} 
              style={axisStyle}
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              style={axisStyle}
              tick={{ fontSize: 12 }}
            />
            {showTooltip && <Tooltip />}
            {showLegend && <Legend />}
            {dataKeys.map((key, index) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                stackId="1"
                stroke={chartColors[index % chartColors.length]}
                fill={chartColors[index % chartColors.length]}
                fillOpacity={0.6}
                onClick={handleDataClick}
              />
            ))}
          </AreaChart>
        );
        
      case 'bar':
        return (
          <BarChart {...commonProps}>
            {showGrid && <CartesianGrid {...gridStyle} />}
            <XAxis 
              dataKey={xAxisKey} 
              style={axisStyle}
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              style={axisStyle}
              tick={{ fontSize: 12 }}
            />
            {showTooltip && <Tooltip />}
            {showLegend && <Legend />}
            {dataKeys.map((key, index) => (
              <Bar
                key={key}
                dataKey={key}
                fill={chartColors[index % chartColors.length]}
                onClick={handleDataClick}
                radius={[2, 2, 0, 0]}
              />
            ))}
          </BarChart>
        );
        
      case 'pie':
        return (
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              outerRadius={Math.min(height * 0.35, 120)}
              dataKey={yAxisKey}
              nameKey={xAxisKey}
              onClick={handleDataClick}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={chartColors[index % chartColors.length]} 
                />
              ))}
            </Pie>
            {showTooltip && <Tooltip />}
            {showLegend && <Legend />}
          </PieChart>
        );
        
      default:
        return null;
    }
  };
  
  // Accessibility focus management
  useEffect(() => {
    if (chartRef.current && !loading && !error) {
      const chartElement = chartRef.current.querySelector('.recharts-wrapper');
      if (chartElement) {
        chartElement.setAttribute('role', 'img');
        chartElement.setAttribute('aria-label', `${title} ${type} chart with ${data.length} data points`);
      }
    }
  }, [title, type, data.length, loading, error]);
  
  const hasData = data && data.length > 0;
  
  return (
    <div
      css={containerStyles}
      className={className}
      data-testid={testId}
      {...props}
    >
      <div css={headerStyles}>
        <h3 css={titleStyles}>{title}</h3>
      </div>
      
      <div css={chartContainerStyles} ref={chartRef}>
        {loading && (
          <div css={loadingStyles}>
            <div css={loadingSpinnerStyles} aria-label="Loading chart data" />
            <span>Loading chart...</span>
          </div>
        )}
        
        {error && (
          <div css={errorStyles} data-testid={`${testId}-error`}>
            <p>Error loading chart: {error}</p>
          </div>
        )}
        
        {!loading && !error && !hasData && (
          <div css={emptyStateStyles} data-testid={`${testId}-empty`}>
            <p>No data available</p>
          </div>
        )}
        
        {!loading && !error && hasData && (
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export { ChartWidget };
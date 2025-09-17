import React from 'react';
import { css } from '@emotion/react';
import { useTheme } from '@cogui/core';

interface MetricsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    type: 'increase' | 'decrease' | 'neutral';
  };
  icon?: React.ReactNode;
  loading?: boolean;
  variant?: 'default' | 'success' | 'warning' | 'error';
  size?: 'small' | 'medium' | 'large';
  onClick?: () => void;
  className?: string;
  'data-testid'?: string;
}

const MetricsCard: React.FC<MetricsCardProps> = ({
  title,
  value,
  subtitle,
  trend,
  icon,
  loading = false,
  variant = 'default',
  size = 'medium',
  onClick,
  className,
  'data-testid': testId = 'metrics-card',
  ...props
}) => {
  const { theme } = useTheme();
  
  const cardStyles = css`
    background: ${theme.colors.background.primary};
    border: 1px solid ${theme.colors.border.primary};
    border-radius: ${theme.borderRadius.md};
    padding: ${size === 'small' ? theme.spacing.sm : 
               size === 'large' ? theme.spacing.xl : theme.spacing.lg};
    box-shadow: ${theme.shadows.sm};
    transition: all 0.2s ease;
    cursor: ${onClick ? 'pointer' : 'default'};
    position: relative;
    overflow: hidden;
    
    &:hover {
      ${onClick ? `
        box-shadow: ${theme.shadows.md};
        transform: translateY(-1px);
        border-color: ${theme.colors.border.hover};
      ` : ''}
    }
    
    &:focus {
      outline: 2px solid ${theme.colors.primary[500]};
      outline-offset: 2px;
    }
    
    ${variant === 'success' && `
      border-left: 4px solid ${theme.colors.success[500]};
    `}
    
    ${variant === 'warning' && `
      border-left: 4px solid ${theme.colors.warning[500]};
    `}
    
    ${variant === 'error' && `
      border-left: 4px solid ${theme.colors.error[500]};
    `}
  `;
  
  const headerStyles = css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: ${theme.spacing.sm};
  `;
  
  const titleStyles = css`
    font-family: ${theme.typography.fontFamilies.body};
    font-size: ${size === 'small' ? theme.typography.fontSize.sm : 
                 size === 'large' ? theme.typography.fontSize.lg : theme.typography.fontSize.md};
    font-weight: ${theme.typography.fontWeight.medium};
    color: ${theme.colors.text.secondary};
    margin: 0;
    flex: 1;
  `;
  
  const iconStyles = css`
    width: ${size === 'small' ? '20px' : size === 'large' ? '32px' : '24px'};
    height: ${size === 'small' ? '20px' : size === 'large' ? '32px' : '24px'};
    color: ${variant === 'success' ? theme.colors.success[500] :
             variant === 'warning' ? theme.colors.warning[500] :
             variant === 'error' ? theme.colors.error[500] :
             theme.colors.primary[500]};
    flex-shrink: 0;
  `;
  
  const valueStyles = css`
    font-family: ${theme.typography.fontFamilies.heading};
    font-size: ${size === 'small' ? theme.typography.fontSize.xl : 
                 size === 'large' ? theme.typography.fontSize['3xl'] : theme.typography.fontSize['2xl']};
    font-weight: ${theme.typography.fontWeight.bold};
    color: ${theme.colors.text.primary};
    margin: ${theme.spacing.xs} 0;
    line-height: 1.2;
    word-break: break-all;
  `;
  
  const subtitleStyles = css`
    font-family: ${theme.typography.fontFamilies.body};
    font-size: ${theme.typography.fontSize.sm};
    color: ${theme.colors.text.tertiary};
    margin: 0;
  `;
  
  const trendStyles = css`
    display: flex;
    align-items: center;
    gap: ${theme.spacing.xs};
    margin-top: ${theme.spacing.sm};
    font-size: ${theme.typography.fontSize.sm};
    font-weight: ${theme.typography.fontWeight.medium};
    
    ${trend?.type === 'increase' && `
      color: ${theme.colors.success[600]};
    `}
    
    ${trend?.type === 'decrease' && `
      color: ${theme.colors.error[600]};
    `}
    
    ${trend?.type === 'neutral' && `
      color: ${theme.colors.text.secondary};
    `}
  `;
  
  const loadingOverlayStyles = css`
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: ${theme.colors.background.primary}dd;
    display: flex;
    align-items: center;
    justify-content: center;
  `;
  
  const loadingSpinnerStyles = css`
    width: 24px;
    height: 24px;
    border: 2px solid ${theme.colors.border.primary};
    border-top: 2px solid ${theme.colors.primary[500]};
    border-radius: 50%;
    animation: spin 1s linear infinite;
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  
  const getTrendIcon = () => {
    if (!trend) return null;
    
    const iconSize = size === 'small' ? '14px' : '16px';
    
    switch (trend.type) {
      case 'increase':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
            <path d="M7 14L12 9L17 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case 'decrease':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
            <path d="M7 10L12 15L17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case 'neutral':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
            <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      default:
        return null;
    }
  };
  
  const formatTrendValue = (value: number) => {
    const absValue = Math.abs(value);
    return `${absValue}%`;
  };
  
  return (
    <div
      css={cardStyles}
      className={className}
      onClick={onClick}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? 'button' : undefined}
      data-testid={testId}
      aria-label={`${title}: ${value}${subtitle ? `, ${subtitle}` : ''}`}
      {...props}
    >
      {loading && (
        <div css={loadingOverlayStyles}>
          <div css={loadingSpinnerStyles} aria-label="Loading metrics" />
        </div>
      )}
      
      <div css={headerStyles}>
        <h3 css={titleStyles}>{title}</h3>
        {icon && <div css={iconStyles}>{icon}</div>}
      </div>
      
      <div css={valueStyles} data-testid={`${testId}-value`}>
        {loading ? '---' : value}
      </div>
      
      {subtitle && !loading && (
        <p css={subtitleStyles} data-testid={`${testId}-subtitle`}>
          {subtitle}
        </p>
      )}
      
      {trend && !loading && (
        <div css={trendStyles} data-testid={`${testId}-trend`}>
          {getTrendIcon()}
          <span>
            {trend.type === 'increase' ? '+' : trend.type === 'decrease' ? '-' : ''}
            {formatTrendValue(trend.value)}
          </span>
        </div>
      )}
    </div>
  );
};

export { MetricsCard };
export type { MetricsCardProps };
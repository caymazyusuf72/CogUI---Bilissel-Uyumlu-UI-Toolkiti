import React, { forwardRef } from 'react';
import styled from '@emotion/styled';
import { useTheme } from '../../hooks/useTheme';
import { useAccessibility } from '../../hooks/useAccessibility';
import { ButtonProps } from '../../types';

const StyledButton = styled.button<{
  variant: ButtonProps['variant'];
  size: ButtonProps['size'];
  disabled?: boolean;
  loading?: boolean;
  needsLargerTargets?: boolean;
  needsHighContrast?: boolean;
  reducedMotion?: boolean;
}>`
  /* Base styles */
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: var(--cog-font-family-primary);
  font-weight: var(--cog-font-weight-medium);
  border-radius: var(--cog-border-radius-md);
  border: 2px solid transparent;
  cursor: pointer;
  transition: ${props => props.reducedMotion ? 'none' : 'all 0.2s ease-in-out'};
  text-decoration: none;
  white-space: nowrap;
  user-select: none;
  
  /* Size variants */
  ${props => {
    switch (props.size) {
      case 'sm':
        return `
          padding: var(--cog-spacing-xs) var(--cog-spacing-sm);
          font-size: var(--cog-font-size-sm);
          min-height: ${props.needsLargerTargets ? '48px' : '32px'};
          min-width: ${props.needsLargerTargets ? '48px' : 'auto'};
        `;
      case 'lg':
        return `
          padding: var(--cog-spacing-md) var(--cog-spacing-lg);
          font-size: var(--cog-font-size-lg);
          min-height: ${props.needsLargerTargets ? '56px' : '48px'};
          min-width: ${props.needsLargerTargets ? '56px' : 'auto'};
        `;
      default: // md
        return `
          padding: var(--cog-spacing-sm) var(--cog-spacing-md);
          font-size: var(--cog-font-size-md);
          min-height: ${props.needsLargerTargets ? '52px' : '40px'};
          min-width: ${props.needsLargerTargets ? '52px' : 'auto'};
        `;
    }
  }}

  /* Color variants */
  ${props => {
    const baseStyles = props.needsHighContrast ? `
      border-width: 3px;
      font-weight: var(--cog-font-weight-bold);
    ` : '';

    switch (props.variant) {
      case 'primary':
        return `
          ${baseStyles}
          background-color: var(--cog-color-primary);
          color: white;
          border-color: var(--cog-color-primary);
          
          &:hover:not(:disabled) {
            background-color: ${props.needsHighContrast ? 'var(--cog-color-primary)' : 'color-mix(in srgb, var(--cog-color-primary) 90%, black)'};
            transform: ${props.reducedMotion ? 'none' : 'translateY(-1px)'};
          }
          
          &:active:not(:disabled) {
            transform: ${props.reducedMotion ? 'none' : 'translateY(0)'};
          }
        `;
      
      case 'secondary':
        return `
          ${baseStyles}
          background-color: var(--cog-color-surface);
          color: var(--cog-color-text-primary);
          border-color: var(--cog-color-border);
          
          &:hover:not(:disabled) {
            background-color: color-mix(in srgb, var(--cog-color-surface) 95%, var(--cog-color-primary));
            border-color: var(--cog-color-primary);
          }
        `;
      
      case 'ghost':
        return `
          ${baseStyles}
          background-color: transparent;
          color: var(--cog-color-primary);
          border-color: transparent;
          
          &:hover:not(:disabled) {
            background-color: color-mix(in srgb, var(--cog-color-primary) 10%, transparent);
          }
        `;
      
      case 'danger':
        return `
          ${baseStyles}
          background-color: var(--cog-color-error);
          color: white;
          border-color: var(--cog-color-error);
          
          &:hover:not(:disabled) {
            background-color: color-mix(in srgb, var(--cog-color-error) 90%, black);
          }
        `;
      
      default:
        return `
          ${baseStyles}
          background-color: var(--cog-color-surface);
          color: var(--cog-color-text-primary);
          border-color: var(--cog-color-border);
        `;
    }
  }}

  /* Focus styles */
  &:focus {
    outline: none;
  }
  
  &:focus-visible {
    box-shadow: 0 0 0 3px var(--cog-color-focus);
    ${props => props.needsHighContrast ? `
      box-shadow: 0 0 0 4px var(--cog-color-focus);
      border-color: var(--cog-color-focus);
    ` : ''}
  }

  /* Disabled state */
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    color: var(--cog-color-text-disabled);
    background-color: var(--cog-color-surface);
    border-color: var(--cog-color-border);
  }

  /* Loading state */
  ${props => props.loading && `
    color: transparent;
    
    &::after {
      content: '';
      position: absolute;
      width: 16px;
      height: 16px;
      border: 2px solid currentColor;
      border-right-color: transparent;
      border-radius: 50%;
      animation: ${props.reducedMotion ? 'none' : 'cog-spin 1s linear infinite'};
    }
  `}

  /* High contrast mode adjustments */
  ${props => props.needsHighContrast && `
    filter: contrast(1.2);
  `}

  @keyframes cog-spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      disabled = false,
      loading = false,
      onClick,
      type = 'button',
      ariaLabel,
      className,
      'data-testid': testId,
      ...rest
    },
    ref
  ) => {
    const { scaledTheme } = useTheme();
    const { needsLargerText, needsHighContrast, needsReducedMotion } = useAccessibility();

    // Auto-adjust size based on accessibility needs
    const adjustedSize = needsLargerText && size === 'sm' ? 'md' : size;

    const handleClick = () => {
      if (!disabled && !loading && onClick) {
        onClick();
      }
    };

    return (
      <StyledButton
        ref={ref}
        type={type}
        variant={variant}
        size={adjustedSize}
        disabled={disabled || loading}
        loading={loading}
        onClick={handleClick}
        className={className}
        data-testid={testId}
        aria-label={ariaLabel}
        aria-disabled={disabled || loading}
        aria-busy={loading}
        needsLargerTargets={needsLargerText}
        needsHighContrast={needsHighContrast}
        reducedMotion={needsReducedMotion}
        {...rest}
      >
        {children}
      </StyledButton>
    );
  }
);

Button.displayName = 'CogUI.Button';
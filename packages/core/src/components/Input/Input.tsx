import React, { forwardRef, useState } from 'react';
import styled from '@emotion/styled';
import { useTheme } from '../../hooks/useTheme';
import { useAccessibility } from '../../hooks/useAccessibility';
import { InputProps } from '../../types';

const InputWrapper = styled.div<{
  hasError?: boolean;
  needsLargerTargets?: boolean;
  needsHighContrast?: boolean;
}>`
  display: flex;
  flex-direction: column;
  gap: var(--cog-spacing-xs);
  width: 100%;
`;

const Label = styled.label<{
  required?: boolean;
  needsHighContrast?: boolean;
}>`
  font-family: var(--cog-font-family-primary);
  font-size: var(--cog-font-size-sm);
  font-weight: var(--cog-font-weight-medium);
  color: var(--cog-color-text-primary);
  
  ${props => props.needsHighContrast && `
    font-weight: var(--cog-font-weight-bold);
    font-size: var(--cog-font-size-md);
  `}
  
  ${props => props.required && `
    &::after {
      content: ' *';
      color: var(--cog-color-error);
    }
  `}
`;

const StyledInput = styled.input<{
  hasError?: boolean;
  needsLargerTargets?: boolean;
  needsHighContrast?: boolean;
  reducedMotion?: boolean;
}>`
  width: 100%;
  padding: var(--cog-spacing-sm) var(--cog-spacing-md);
  font-family: var(--cog-font-family-primary);
  font-size: var(--cog-font-size-md);
  line-height: var(--cog-line-height-normal);
  color: var(--cog-color-text-primary);
  background-color: var(--cog-color-background);
  border: 2px solid var(--cog-color-border);
  border-radius: var(--cog-border-radius-md);
  transition: ${props => props.reducedMotion ? 'none' : 'all 0.2s ease-in-out'};
  
  /* Size adjustments */
  ${props => props.needsLargerTargets && `
    min-height: 48px;
    padding: var(--cog-spacing-md) var(--cog-spacing-lg);
    font-size: var(--cog-font-size-lg);
  `}

  /* High contrast adjustments */
  ${props => props.needsHighContrast && `
    border-width: 3px;
    font-weight: var(--cog-font-weight-medium);
  `}

  /* Error state */
  ${props => props.hasError && `
    border-color: var(--cog-color-error);
    background-color: color-mix(in srgb, var(--cog-color-error) 5%, var(--cog-color-background));
  `}

  /* Hover state */
  &:hover:not(:disabled) {
    border-color: var(--cog-color-primary);
    ${props => !props.reducedMotion && `
      transform: translateY(-1px);
      box-shadow: var(--cog-shadow-sm);
    `}
  }

  /* Focus state */
  &:focus {
    outline: none;
    border-color: var(--cog-color-focus);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--cog-color-focus) 25%, transparent);
    
    ${props => props.needsHighContrast && `
      box-shadow: 0 0 0 4px var(--cog-color-focus);
    `}
  }

  /* Disabled state */
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    background-color: var(--cog-color-surface);
    color: var(--cog-color-text-disabled);
    border-color: var(--cog-color-border);
  }

  /* Placeholder styling */
  &::placeholder {
    color: var(--cog-color-text-secondary);
    opacity: 0.7;
  }

  /* Autocomplete styling */
  &:-webkit-autofill {
    -webkit-box-shadow: 0 0 0 1000px var(--cog-color-surface) inset;
    -webkit-text-fill-color: var(--cog-color-text-primary);
  }
`;

const ErrorMessage = styled.div<{
  needsHighContrast?: boolean;
}>`
  font-family: var(--cog-font-family-primary);
  font-size: var(--cog-font-size-sm);
  color: var(--cog-color-error);
  display: flex;
  align-items: center;
  gap: var(--cog-spacing-xs);
  
  ${props => props.needsHighContrast && `
    font-weight: var(--cog-font-weight-bold);
    font-size: var(--cog-font-size-md);
  `}

  &::before {
    content: '⚠';
    font-size: 1.1em;
  }
`;

const HelperText = styled.div`
  font-family: var(--cog-font-family-primary);
  font-size: var(--cog-font-size-sm);
  color: var(--cog-color-text-secondary);
`;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      placeholder,
      value,
      defaultValue,
      onChange,
      error,
      disabled = false,
      required = false,
      type = 'text',
      ariaDescribedBy,
      className,
      'data-testid': testId,
      ...rest
    },
    ref
  ) => {
    const { scaledTheme } = useTheme();
    const { 
      needsLargerText, 
      needsHighContrast, 
      needsReducedMotion,
      preferences 
    } = useAccessibility();

    const [internalValue, setInternalValue] = useState(defaultValue || '');
    const inputValue = value !== undefined ? value : internalValue;

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = event.target.value;
      
      if (value === undefined) {
        setInternalValue(newValue);
      }
      
      if (onChange) {
        onChange(newValue);
      }
    };

    // Generate IDs for accessibility
    const inputId = `cog-input-${Math.random().toString(36).substr(2, 9)}`;
    const errorId = error ? `${inputId}-error` : undefined;
    const describedBy = [ariaDescribedBy, errorId].filter(Boolean).join(' ') || undefined;

    return (
      <InputWrapper
        className={className}
        hasError={!!error}
        needsLargerTargets={needsLargerText}
        needsHighContrast={needsHighContrast}
      >
        <Label
          htmlFor={inputId}
          required={required}
          needsHighContrast={needsHighContrast}
        >
          {label}
        </Label>
        
        <StyledInput
          ref={ref}
          id={inputId}
          type={type}
          placeholder={placeholder}
          value={inputValue}
          onChange={handleChange}
          disabled={disabled}
          required={required}
          aria-describedby={describedBy}
          aria-invalid={!!error}
          data-testid={testId}
          hasError={!!error}
          needsLargerTargets={needsLargerText}
          needsHighContrast={needsHighContrast}
          reducedMotion={needsReducedMotion}
          {...rest}
        />
        
        {error && (
          <ErrorMessage
            id={errorId}
            role="alert"
            needsHighContrast={needsHighContrast}
          >
            {error}
          </ErrorMessage>
        )}
      </InputWrapper>
    );
  }
);

Input.displayName = 'CogUI.Input';
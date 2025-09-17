// CogUI Core Types - Ana tip tanımlamaları
import { ReactNode } from 'react';

export interface CogUITheme {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: {
      primary: string;
      secondary: string;
      disabled: string;
    };
    border: string;
    focus: string;
    success: string;
    warning: string;
    error: string;
  };
  typography: {
    fontFamily: {
      primary: string;
      dyslexic?: string;
    };
    fontSize: {
      xs: string;
      sm: string;
      md: string;
      lg: string;
      xl: string;
      xxl: string;
    };
    fontWeight: {
      light: number;
      normal: number;
      medium: number;
      bold: number;
    };
    lineHeight: {
      tight: number;
      normal: number;
      relaxed: number;
    };
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    xxl: string;
  };
  borderRadius: {
    none: string;
    sm: string;
    md: string;
    lg: string;
    full: string;
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
  };
}

export interface AccessibilityPreferences {
  // Görsel tercihler
  highContrast: boolean;
  reducedMotion: boolean;
  darkMode?: boolean;
  
  // Typography tercihler
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  fontFamily: 'default' | 'dyslexic';
  lineSpacing: 'tight' | 'normal' | 'relaxed';
  
  // Etkileşim tercihler
  largeClickTargets: boolean;
  focusIndicators: 'minimal' | 'enhanced';
  
  // Bilişsel destek
  simplifiedLayout: boolean;
  contentSummaries: boolean;
  navigationAssist: boolean;
}

export interface CognitiveState {
  attentionLevel: 'low' | 'medium' | 'high';
  cognitiveLoad: 'low' | 'medium' | 'high';
  fatigueLevel: 'low' | 'medium' | 'high';
  stressLevel: 'low' | 'medium' | 'high';
}

export interface SensorData {
  mouseTracking: {
    speed: number;
    smoothness: number;
    accuracy: number;
    hesitation: number;
  };
  interaction: {
    clickPrecision: number;
    taskSwitchFrequency: number;
    dwellTime: number;
    errorRate: number;
  };
  attention: {
    focusTime: number;
    distractionCount: number;
    engagementLevel: number;
  };
}

export interface AdaptiveUIConfig {
  autoAdjust: boolean;
  sensitivityLevel: 'low' | 'medium' | 'high';
  adaptationSpeed: 'slow' | 'medium' | 'fast';
  
  // Hangi özellikler otomatik ayarlanacak
  adjustContrast: boolean;
  adjustFontSize: boolean;
  adjustLayout: boolean;
  adjustAnimations: boolean;
  adjustNavigation: boolean;
}

export interface ComponentProps {
  className?: string;
  children?: ReactNode;
  'data-testid'?: string;
}

export interface ButtonProps extends ComponentProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  ariaLabel?: string;
}

export interface InputProps extends ComponentProps {
  label: string;
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  type?: 'text' | 'email' | 'password' | 'number';
  ariaDescribedBy?: string;
}

export interface CardProps extends ComponentProps {
  variant?: 'elevated' | 'outlined' | 'flat';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  clickable?: boolean;
  onClick?: () => void;
}

export interface ModalProps extends ComponentProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
}

// Event types
export interface ThemeChangeEvent {
  theme: CogUITheme;
  preferences: AccessibilityPreferences;
}

export interface CognitiveStateChangeEvent {
  previous: CognitiveState;
  current: CognitiveState;
  adaptations: AdaptiveUIConfig;
}
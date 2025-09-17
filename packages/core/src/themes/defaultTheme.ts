import { CogUITheme } from '../types';

export const defaultTheme: CogUITheme = {
  colors: {
    primary: '#007bff',
    secondary: '#6c757d',
    background: '#ffffff',
    surface: '#f8f9fa',
    text: {
      primary: '#212529',
      secondary: '#6c757d',
      disabled: '#adb5bd',
    },
    border: '#dee2e6',
    focus: '#0066cc',
    success: '#28a745',
    warning: '#ffc107',
    error: '#dc3545',
  },
  typography: {
    fontFamily: {
      primary: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      dyslexic: 'OpenDyslexic, Arial, sans-serif',
    },
    fontSize: {
      xs: '0.75rem',    // 12px
      sm: '0.875rem',   // 14px
      md: '1rem',       // 16px
      lg: '1.125rem',   // 18px
      xl: '1.25rem',    // 20px
      xxl: '1.5rem',    // 24px
    },
    fontWeight: {
      light: 300,
      normal: 400,
      medium: 500,
      bold: 600,
    },
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
    },
  },
  spacing: {
    xs: '0.25rem',   // 4px
    sm: '0.5rem',    // 8px
    md: '1rem',      // 16px
    lg: '1.5rem',    // 24px
    xl: '2rem',      // 32px
    xxl: '3rem',     // 48px
  },
  borderRadius: {
    none: '0',
    sm: '0.125rem',  // 2px
    md: '0.25rem',   // 4px
    lg: '0.5rem',    // 8px
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  },
};
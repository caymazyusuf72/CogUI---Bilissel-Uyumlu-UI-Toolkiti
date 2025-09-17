import { CogUITheme } from '../types';
import { defaultTheme } from './defaultTheme';

export const highContrastTheme: CogUITheme = {
  ...defaultTheme,
  colors: {
    ...defaultTheme.colors,
    primary: '#0000ff',
    secondary: '#000000',
    background: '#ffffff',
    surface: '#f5f5f5',
    text: {
      primary: '#000000',
      secondary: '#000000',
      disabled: '#666666',
    },
    border: '#000000',
    focus: '#ff0000',
    success: '#008000',
    warning: '#ff8c00',
    error: '#ff0000',
  },
  typography: {
    ...defaultTheme.typography,
    fontWeight: {
      ...defaultTheme.typography.fontWeight,
      normal: 600, // Daha kalın yazı tipi
      medium: 700,
      bold: 800,
    },
    lineHeight: {
      ...defaultTheme.typography.lineHeight,
      tight: 1.4,
      normal: 1.6,
      relaxed: 1.8,
    },
  },
  shadows: {
    sm: '0 2px 4px 0 rgba(0, 0, 0, 0.3)',
    md: '0 4px 8px 0 rgba(0, 0, 0, 0.3)',
    lg: '0 8px 16px 0 rgba(0, 0, 0, 0.3)',
  },
};
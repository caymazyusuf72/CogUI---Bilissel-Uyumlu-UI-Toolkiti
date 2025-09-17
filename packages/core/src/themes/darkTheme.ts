import { CogUITheme } from '../types';
import { defaultTheme } from './defaultTheme';

export const darkTheme: CogUITheme = {
  ...defaultTheme,
  colors: {
    ...defaultTheme.colors,
    primary: '#4dabf7',
    secondary: '#868e96',
    background: '#1a1a1a',
    surface: '#2d2d2d',
    text: {
      primary: '#f1f3f4',
      secondary: '#adb5bd',
      disabled: '#6c757d',
    },
    border: '#404040',
    focus: '#66b3ff',
    success: '#51cf66',
    warning: '#ffd43b',
    error: '#ff6b6b',
  },
};
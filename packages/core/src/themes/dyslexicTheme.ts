import { CogUITheme } from '../types';
import { defaultTheme } from './defaultTheme';

export const dyslexicTheme: CogUITheme = {
  ...defaultTheme,
  typography: {
    ...defaultTheme.typography,
    fontFamily: {
      primary: 'OpenDyslexic, Verdana, Arial, sans-serif',
      dyslexic: 'OpenDyslexic, Arial, sans-serif',
    },
    fontSize: {
      // Daha büyük font boyutları
      xs: '0.875rem',   // 14px
      sm: '1rem',       // 16px
      md: '1.125rem',   // 18px
      lg: '1.25rem',    // 20px
      xl: '1.375rem',   // 22px
      xxl: '1.625rem',  // 26px
    },
    fontWeight: {
      light: 400,   // Daha kalın minimum ağırlık
      normal: 500,
      medium: 600,
      bold: 700,
    },
    lineHeight: {
      tight: 1.4,   // Daha geniş satır aralığı
      normal: 1.6,
      relaxed: 1.8,
    },
  },
  spacing: {
    ...defaultTheme.spacing,
    // Daha geniş spacing'ler
    xs: '0.375rem',   // 6px
    sm: '0.75rem',    // 12px
    md: '1.25rem',    // 20px
    lg: '1.875rem',   // 30px
    xl: '2.5rem',     // 40px
    xxl: '3.5rem',    // 56px
  },
  colors: {
    ...defaultTheme.colors,
    // Disleksi dostu renkler - krem/bej background
    background: '#fefcf0',
    surface: '#f8f6e8',
    text: {
      primary: '#2d2a23',
      secondary: '#5a5548',
      disabled: '#9c9582',
    },
    border: '#e6e2d3',
  },
};
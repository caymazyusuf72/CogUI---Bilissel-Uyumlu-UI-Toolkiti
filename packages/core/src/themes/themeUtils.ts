import { CogUITheme, AccessibilityPreferences } from '../types';
import { defaultTheme } from './defaultTheme';
import { darkTheme } from './darkTheme';
import { highContrastTheme } from './highContrastTheme';
import { dyslexicTheme } from './dyslexicTheme';

// Tema seçici fonksiyonu
export const getThemeByPreferences = (preferences: AccessibilityPreferences): CogUITheme => {
  if (preferences.highContrast) {
    return highContrastTheme;
  }
  
  if (preferences.fontFamily === 'dyslexic') {
    return dyslexicTheme;
  }
  
  if (preferences.darkMode === true) {
    return darkTheme;
  }
  
  return defaultTheme;
};

// Kontrast hesaplama fonksiyonu (WCAG AA/AAA uyumluluğu için)
export const getContrastRatio = (foreground: string, background: string): number => {
  const getLuminance = (color: string): number => {
    // Hex rengi RGB'ye çevir
    const rgb = hexToRgb(color);
    if (!rgb) return 0;

    // Relative luminance hesaplama (WCAG formülü)
    const normalize = (value: number) => {
      value = value / 255;
      return value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
    };

    const r = normalize(rgb.r);
    const g = normalize(rgb.g);
    const b = normalize(rgb.b);

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  const l1 = getLuminance(foreground);
  const l2 = getLuminance(background);
  
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  
  return (lighter + 0.05) / (darker + 0.05);
};

// Hex renk formatını RGB'ye çevirme
export const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};

// WCAG uyumluluk kontrol fonksiyonları
export const isWCAGAA = (foreground: string, background: string): boolean => {
  return getContrastRatio(foreground, background) >= 4.5;
};

export const isWCAGAAA = (foreground: string, background: string): boolean => {
  return getContrastRatio(foreground, background) >= 7;
};

// Tema değişkenlerini CSS custom properties olarak export etme
export const themeToCSSVariables = (theme: CogUITheme): Record<string, string> => {
  return {
    '--cog-color-primary': theme.colors.primary,
    '--cog-color-secondary': theme.colors.secondary,
    '--cog-color-background': theme.colors.background,
    '--cog-color-surface': theme.colors.surface,
    '--cog-color-text-primary': theme.colors.text.primary,
    '--cog-color-text-secondary': theme.colors.text.secondary,
    '--cog-color-text-disabled': theme.colors.text.disabled,
    '--cog-color-border': theme.colors.border,
    '--cog-color-focus': theme.colors.focus,
    '--cog-color-success': theme.colors.success,
    '--cog-color-warning': theme.colors.warning,
    '--cog-color-error': theme.colors.error,
    
    '--cog-font-family-primary': theme.typography.fontFamily.primary,
    '--cog-font-family-dyslexic': theme.typography.fontFamily.dyslexic || theme.typography.fontFamily.primary,
    
    '--cog-font-size-xs': theme.typography.fontSize.xs,
    '--cog-font-size-sm': theme.typography.fontSize.sm,
    '--cog-font-size-md': theme.typography.fontSize.md,
    '--cog-font-size-lg': theme.typography.fontSize.lg,
    '--cog-font-size-xl': theme.typography.fontSize.xl,
    '--cog-font-size-xxl': theme.typography.fontSize.xxl,
    
    '--cog-font-weight-light': theme.typography.fontWeight.light.toString(),
    '--cog-font-weight-normal': theme.typography.fontWeight.normal.toString(),
    '--cog-font-weight-medium': theme.typography.fontWeight.medium.toString(),
    '--cog-font-weight-bold': theme.typography.fontWeight.bold.toString(),
    
    '--cog-line-height-tight': theme.typography.lineHeight.tight.toString(),
    '--cog-line-height-normal': theme.typography.lineHeight.normal.toString(),
    '--cog-line-height-relaxed': theme.typography.lineHeight.relaxed.toString(),
    
    '--cog-spacing-xs': theme.spacing.xs,
    '--cog-spacing-sm': theme.spacing.sm,
    '--cog-spacing-md': theme.spacing.md,
    '--cog-spacing-lg': theme.spacing.lg,
    '--cog-spacing-xl': theme.spacing.xl,
    '--cog-spacing-xxl': theme.spacing.xxl,
    
    '--cog-border-radius-none': theme.borderRadius.none,
    '--cog-border-radius-sm': theme.borderRadius.sm,
    '--cog-border-radius-md': theme.borderRadius.md,
    '--cog-border-radius-lg': theme.borderRadius.lg,
    '--cog-border-radius-full': theme.borderRadius.full,
    
    '--cog-shadow-sm': theme.shadows.sm,
    '--cog-shadow-md': theme.shadows.md,
    '--cog-shadow-lg': theme.shadows.lg,
  };
};

// Font boyutu ölçeklendirme fonksiyonu
export const scaleFontSize = (
  theme: CogUITheme, 
  scale: 'small' | 'medium' | 'large' | 'extra-large'
): CogUITheme => {
  const scaleFactors = {
    small: 0.875,
    medium: 1,
    large: 1.125,
    'extra-large': 1.25,
  };
  
  const factor = scaleFactors[scale];
  
  return {
    ...theme,
    typography: {
      ...theme.typography,
      fontSize: {
        xs: `${parseFloat(theme.typography.fontSize.xs) * factor}rem`,
        sm: `${parseFloat(theme.typography.fontSize.sm) * factor}rem`,
        md: `${parseFloat(theme.typography.fontSize.md) * factor}rem`,
        lg: `${parseFloat(theme.typography.fontSize.lg) * factor}rem`,
        xl: `${parseFloat(theme.typography.fontSize.xl) * factor}rem`,
        xxl: `${parseFloat(theme.typography.fontSize.xxl) * factor}rem`,
      },
    },
  };
};
import { useCogUI } from '../providers/CogUIProvider';
import { AccessibilityPreferences } from '../types';

export const useAccessibility = () => {
  const { preferences, updatePreferences } = useCogUI();

  // Toggle functions for common accessibility features
  const toggleHighContrast = () => {
    updatePreferences({ highContrast: !preferences.highContrast });
  };

  const toggleReducedMotion = () => {
    updatePreferences({ reducedMotion: !preferences.reducedMotion });
  };

  const toggleDarkMode = () => {
    updatePreferences({ darkMode: !preferences.darkMode });
  };

  const toggleLargeClickTargets = () => {
    updatePreferences({ largeClickTargets: !preferences.largeClickTargets });
  };

  const toggleSimplifiedLayout = () => {
    updatePreferences({ simplifiedLayout: !preferences.simplifiedLayout });
  };

  // Set font size
  const setFontSize = (size: AccessibilityPreferences['fontSize']) => {
    updatePreferences({ fontSize: size });
  };

  // Set font family
  const setFontFamily = (family: AccessibilityPreferences['fontFamily']) => {
    updatePreferences({ fontFamily: family });
  };

  // Set line spacing
  const setLineSpacing = (spacing: AccessibilityPreferences['lineSpacing']) => {
    updatePreferences({ lineSpacing: spacing });
  };

  // Set focus indicators
  const setFocusIndicators = (level: AccessibilityPreferences['focusIndicators']) => {
    updatePreferences({ focusIndicators: level });
  };

  // Bulk update preferences
  const updateAllPreferences = (newPreferences: Partial<AccessibilityPreferences>) => {
    updatePreferences(newPreferences);
  };

  // Get accessibility-friendly class names
  const getAccessibilityClasses = () => {
    const classes: string[] = [];
    
    if (preferences.highContrast) classes.push('cog-high-contrast');
    if (preferences.reducedMotion) classes.push('cog-reduced-motion');
    if (preferences.darkMode) classes.push('cog-dark-mode');
    if (preferences.largeClickTargets) classes.push('cog-large-targets');
    if (preferences.simplifiedLayout) classes.push('cog-simplified-layout');
    
    classes.push(`cog-font-size-${preferences.fontSize}`);
    classes.push(`cog-font-family-${preferences.fontFamily}`);
    classes.push(`cog-line-spacing-${preferences.lineSpacing}`);
    classes.push(`cog-focus-${preferences.focusIndicators}`);
    
    return classes.join(' ');
  };

  // Check if user needs specific accessibility features
  const needsHighContrast = preferences.highContrast;
  const needsReducedMotion = preferences.reducedMotion;
  const needsLargerText = preferences.fontSize === 'large' || preferences.fontSize === 'extra-large';
  const needsSimplification = preferences.simplifiedLayout;

  return {
    preferences,
    toggleHighContrast,
    toggleReducedMotion,
    toggleDarkMode,
    toggleLargeClickTargets,
    toggleSimplifiedLayout,
    setFontSize,
    setFontFamily,
    setLineSpacing,
    setFocusIndicators,
    updateAllPreferences,
    getAccessibilityClasses,
    // Helper flags
    needsHighContrast,
    needsReducedMotion,
    needsLargerText,
    needsSimplification,
  };
};
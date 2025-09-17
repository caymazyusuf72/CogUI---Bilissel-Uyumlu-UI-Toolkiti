import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CogUITheme, AccessibilityPreferences, CognitiveState, AdaptiveUIConfig } from '../types';
import { defaultTheme, getThemeByPreferences, themeToCSSVariables } from '../themes';

interface CogUIContextType {
  theme: CogUITheme;
  preferences: AccessibilityPreferences;
  cognitiveState: CognitiveState | null;
  adaptiveConfig: AdaptiveUIConfig;
  
  // Actions
  updateTheme: (theme: CogUITheme) => void;
  updatePreferences: (preferences: Partial<AccessibilityPreferences>) => void;
  updateCognitiveState: (state: CognitiveState) => void;
  updateAdaptiveConfig: (config: Partial<AdaptiveUIConfig>) => void;
  resetPreferences: () => void;
}

const CogUIContext = createContext<CogUIContextType | undefined>(undefined);

const defaultPreferences: AccessibilityPreferences = {
  highContrast: false,
  reducedMotion: false,
  darkMode: false,
  fontSize: 'medium',
  fontFamily: 'default',
  lineSpacing: 'normal',
  largeClickTargets: false,
  focusIndicators: 'minimal',
  simplifiedLayout: false,
  contentSummaries: false,
  navigationAssist: false,
};

const defaultCognitiveState: CognitiveState = {
  attentionLevel: 'medium',
  cognitiveLoad: 'medium',
  fatigueLevel: 'low',
  stressLevel: 'low',
};

const defaultAdaptiveConfig: AdaptiveUIConfig = {
  autoAdjust: false,
  sensitivityLevel: 'medium',
  adaptationSpeed: 'medium',
  adjustContrast: true,
  adjustFontSize: true,
  adjustLayout: true,
  adjustAnimations: true,
  adjustNavigation: true,
};

interface CogUIProviderProps {
  children: ReactNode;
  initialTheme?: CogUITheme;
  initialPreferences?: Partial<AccessibilityPreferences>;
  storageKey?: string;
  enableSystemPreferences?: boolean;
}

export const CogUIProvider: React.FC<CogUIProviderProps> = ({
  children,
  initialTheme,
  initialPreferences = {},
  storageKey = 'cogui-preferences',
  enableSystemPreferences = true,
}) => {
  const [preferences, setPreferences] = useState<AccessibilityPreferences>(() => {
    // Load from localStorage if available
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          return { ...defaultPreferences, ...parsed, ...initialPreferences };
        }
      } catch (error) {
        console.warn('CogUI: Could not load preferences from localStorage', error);
      }
    }
    
    return { ...defaultPreferences, ...initialPreferences };
  });

  const [cognitiveState, setCognitiveState] = useState<CognitiveState | null>(null);
  const [adaptiveConfig, setAdaptiveConfig] = useState<AdaptiveUIConfig>(defaultAdaptiveConfig);
  
  // Derive theme from preferences
  const [theme, setTheme] = useState<CogUITheme>(() => {
    return initialTheme || getThemeByPreferences(preferences);
  });

  // System preferences detection
  useEffect(() => {
    if (!enableSystemPreferences || typeof window === 'undefined') return;

    const mediaQueries = {
      darkMode: window.matchMedia('(prefers-color-scheme: dark)'),
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)'),
      highContrast: window.matchMedia('(prefers-contrast: high)'),
    };

    const updateSystemPreferences = () => {
      const systemPrefs: Partial<AccessibilityPreferences> = {};
      
      if (mediaQueries.darkMode.matches && preferences.darkMode === undefined) {
        systemPrefs.darkMode = true;
      }
      if (mediaQueries.reducedMotion.matches) {
        systemPrefs.reducedMotion = true;
      }
      if (mediaQueries.highContrast.matches) {
        systemPrefs.highContrast = true;
      }

      if (Object.keys(systemPrefs).length > 0) {
        updatePreferences(systemPrefs);
      }
    };

    // Initial check
    updateSystemPreferences();

    // Listen for changes
    Object.values(mediaQueries).forEach(mq => {
      mq.addEventListener('change', updateSystemPreferences);
    });

    return () => {
      Object.values(mediaQueries).forEach(mq => {
        mq.removeEventListener('change', updateSystemPreferences);
      });
    };
  }, [enableSystemPreferences, preferences.darkMode]);

  // Update theme when preferences change
  useEffect(() => {
    const newTheme = getThemeByPreferences(preferences);
    setTheme(newTheme);
  }, [preferences]);

  // Apply CSS variables to document
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const cssVariables = themeToCSSVariables(theme);
    const root = document.documentElement;
    
    Object.entries(cssVariables).forEach(([property, value]) => {
      root.style.setProperty(property, value);
    });

    // Apply data attributes for CSS targeting
    root.setAttribute('data-cog-theme', preferences.darkMode ? 'dark' : 'light');
    root.setAttribute('data-cog-contrast', preferences.highContrast ? 'high' : 'normal');
    root.setAttribute('data-cog-motion', preferences.reducedMotion ? 'reduced' : 'normal');
    root.setAttribute('data-cog-font-size', preferences.fontSize);
    root.setAttribute('data-cog-font-family', preferences.fontFamily);
    
    return () => {
      // Cleanup on unmount (optional)
      Object.keys(cssVariables).forEach(property => {
        root.style.removeProperty(property);
      });
    };
  }, [theme, preferences]);

  // Save preferences to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(storageKey, JSON.stringify(preferences));
    } catch (error) {
      console.warn('CogUI: Could not save preferences to localStorage', error);
    }
  }, [preferences, storageKey]);

  // Actions
  const updateTheme = (newTheme: CogUITheme) => {
    setTheme(newTheme);
  };

  const updatePreferences = (newPreferences: Partial<AccessibilityPreferences>) => {
    setPreferences(prev => ({ ...prev, ...newPreferences }));
  };

  const updateCognitiveState = (state: CognitiveState) => {
    setCognitiveState(state);
    
    // Auto-adapt UI based on cognitive state if enabled
    if (adaptiveConfig.autoAdjust) {
      applyAdaptiveAdjustments(state);
    }
  };

  const updateAdaptiveConfig = (config: Partial<AdaptiveUIConfig>) => {
    setAdaptiveConfig(prev => ({ ...prev, ...config }));
  };

  const resetPreferences = () => {
    setPreferences(defaultPreferences);
    setCognitiveState(null);
    setAdaptiveConfig(defaultAdaptiveConfig);
  };

  const applyAdaptiveAdjustments = (state: CognitiveState) => {
    const adjustments: Partial<AccessibilityPreferences> = {};

    // High cognitive load adaptations
    if (state.cognitiveLoad === 'high' && adaptiveConfig.adjustLayout) {
      adjustments.simplifiedLayout = true;
      adjustments.contentSummaries = true;
    }

    // High fatigue adaptations
    if (state.fatigueLevel === 'high') {
      if (adaptiveConfig.adjustContrast) {
        adjustments.highContrast = true;
      }
      if (adaptiveConfig.adjustFontSize && preferences.fontSize === 'medium') {
        adjustments.fontSize = 'large';
      }
      if (adaptiveConfig.adjustAnimations) {
        adjustments.reducedMotion = true;
      }
    }

    // Low attention adaptations
    if (state.attentionLevel === 'low') {
      if (adaptiveConfig.adjustLayout) {
        adjustments.simplifiedLayout = true;
        adjustments.focusIndicators = 'enhanced';
      }
      if (adaptiveConfig.adjustNavigation) {
        adjustments.navigationAssist = true;
      }
    }

    // High stress adaptations
    if (state.stressLevel === 'high') {
      if (adaptiveConfig.adjustAnimations) {

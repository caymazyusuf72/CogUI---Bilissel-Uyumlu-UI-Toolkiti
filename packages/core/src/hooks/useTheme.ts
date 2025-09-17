import { useCogUI } from '../providers/CogUIProvider';
import { CogUITheme } from '../types';
import { scaleFontSize } from '../themes/themeUtils';

export const useTheme = () => {
  const { theme, preferences, updateTheme } = useCogUI();

  // Get scaled theme based on user preferences
  const getScaledTheme = (): CogUITheme => {
    return scaleFontSize(theme, preferences.fontSize);
  };

  return {
    theme,
    scaledTheme: getScaledTheme(),
    preferences,
    updateTheme,
  };
};
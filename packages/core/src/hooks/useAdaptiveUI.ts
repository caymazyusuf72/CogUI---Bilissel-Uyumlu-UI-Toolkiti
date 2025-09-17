import { useCogUI } from '../providers/CogUIProvider';
import { CognitiveState, AdaptiveUIConfig } from '../types';

export const useAdaptiveUI = () => {
  const { cognitiveState, adaptiveConfig, updateCognitiveState, updateAdaptiveConfig } = useCogUI();

  // Enable/disable auto adaptation
  const toggleAutoAdjust = () => {
    updateAdaptiveConfig({ autoAdjust: !adaptiveConfig.autoAdjust });
  };

  // Set sensitivity level
  const setSensitivityLevel = (level: AdaptiveUIConfig['sensitivityLevel']) => {
    updateAdaptiveConfig({ sensitivityLevel: level });
  };

  // Set adaptation speed
  const setAdaptationSpeed = (speed: AdaptiveUIConfig['adaptationSpeed']) => {
    updateAdaptiveConfig({ adaptationSpeed: speed });
  };

  // Toggle specific adaptation features
  const toggleContrastAdjustment = () => {
    updateAdaptiveConfig({ adjustContrast: !adaptiveConfig.adjustContrast });
  };

  const toggleFontSizeAdjustment = () => {
    updateAdaptiveConfig({ adjustFontSize: !adaptiveConfig.adjustFontSize });
  };

  const toggleLayoutAdjustment = () => {
    updateAdaptiveConfig({ adjustLayout: !adaptiveConfig.adjustLayout });
  };

  const toggleAnimationAdjustment = () => {
    updateAdaptiveConfig({ adjustAnimations: !adaptiveConfig.adjustAnimations });
  };

  const toggleNavigationAdjustment = () => {
    updateAdaptiveConfig({ adjustNavigation: !adaptiveConfig.adjustNavigation });
  };

  // Manually trigger cognitive state update
  const setCognitiveState = (state: CognitiveState) => {
    updateCognitiveState(state);
  };

  // Helper functions to assess cognitive needs
  const needsSimplification = cognitiveState?.cognitiveLoad === 'high' || cognitiveState?.attentionLevel === 'low';
  const needsLargerTargets = cognitiveState?.fatigueLevel === 'high' || cognitiveState?.stressLevel === 'high';
  const needsReducedStimuli = cognitiveState?.stressLevel === 'high' || cognitiveState?.cognitiveLoad === 'high';
  const needsEnhancedFocus = cognitiveState?.attentionLevel === 'low';

  // Get recommended adaptations based on current state
  const getRecommendedAdaptations = () => {
    if (!cognitiveState) return {};

    const recommendations: Record<string, any> = {};

    if (needsSimplification) {
      recommendations.simplifiedLayout = true;
      recommendations.contentSummaries = true;
    }

    if (needsLargerTargets) {
      recommendations.largeClickTargets = true;
    }

    if (needsReducedStimuli) {
      recommendations.reducedMotion = true;
      recommendations.simplifiedLayout = true;
    }

    if (needsEnhancedFocus) {
      recommendations.navigationAssist = true;
    }

    return recommendations;
  };

  // Get adaptation intensity based on cognitive state
  const getAdaptationIntensity = (): 'low' | 'medium' | 'high' => {
    if (!cognitiveState) return 'low';

    const highStressFactors = [
      cognitiveState.cognitiveLoad === 'high',
      cognitiveState.fatigueLevel === 'high',
      cognitiveState.stressLevel === 'high',
      cognitiveState.attentionLevel === 'low',
    ].filter(Boolean).length;

    if (highStressFactors >= 3) return 'high';
    if (highStressFactors >= 2) return 'medium';
    return 'low';
  };

  return {
    cognitiveState,
    adaptiveConfig,
    toggleAutoAdjust,
    setSensitivityLevel,
    setAdaptationSpeed,
    toggleContrastAdjustment,
    toggleFontSizeAdjustment,
    toggleLayoutAdjustment,
    toggleAnimationAdjustment,
    toggleNavigationAdjustment,
    setCognitiveState,
    getRecommendedAdaptations,
    getAdaptationIntensity,
    // Helper flags
    needsSimplification,
    needsLargerTargets,
    needsReducedStimuli,
    needsEnhancedFocus,
    isAutoAdaptEnabled: adaptiveConfig.autoAdjust,
  };
};
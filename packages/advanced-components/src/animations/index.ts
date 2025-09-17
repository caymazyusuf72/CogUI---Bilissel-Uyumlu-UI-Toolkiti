// Animation Components Export
export * from './components';
export * from './hooks';
export * from './utils';

// Core Animation Components
export { Motion } from './components/Motion';
export { Transition } from './components/Transition';
export { AnimatedNumber } from './components/AnimatedNumber';
export { AnimatedText } from './components/AnimatedText';
export { ScrollAnimation } from './components/ScrollAnimation';
export { ParallaxContainer } from './components/ParallaxContainer';
export { MorphingShape } from './components/MorphingShape';
export { ParticleSystem } from './components/ParticleSystem';

// Layout Animations
export { LayoutTransition } from './components/LayoutTransition';
export { Reorder } from './components/Reorder';
export { SharedLayout } from './components/SharedLayout';
export { PageTransition } from './components/PageTransition';

// Loading Animations
export { LoadingSpinner } from './components/LoadingSpinner';
export { ProgressBar } from './components/ProgressBar';
export { PulseLoader } from './components/PulseLoader';
export { SkeletonLoader } from './components/SkeletonLoader';

// Interactive Animations
export { HoverAnimation } from './components/HoverAnimation';
export { ClickAnimation } from './components/ClickAnimation';
export { DragAnimation } from './components/DragAnimation';
export { GestureAnimation } from './components/GestureAnimation';

// Lottie Integration
export { LottieAnimation } from './components/LottieAnimation';
export { LottiePlayer } from './components/LottiePlayer';

// Hooks
export { useAnimation } from './hooks/useAnimation';
export { useSpring } from './hooks/useSpring';
export { useTransition } from './hooks/useTransition';
export { useKeyframes } from './hooks/useKeyframes';
export { useScrollAnimation } from './hooks/useScrollAnimation';
export { useIntersectionAnimation } from './hooks/useIntersectionAnimation';
export { useGestures } from './hooks/useGestures';
export { useParallax } from './hooks/useParallax';

// Utils
export * from './utils/easing';
export * from './utils/timing';
export * from './utils/physics';
export * from './utils/interpolation';

// Version
export const ANIMATIONS_VERSION = '0.1.0';
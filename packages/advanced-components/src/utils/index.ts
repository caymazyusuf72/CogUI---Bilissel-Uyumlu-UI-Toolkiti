// Advanced Components Utilities Export
export * from './performance';
export * from './accessibility';
export * from './responsive';
export * from './color';
export * from './math';
export * from './animation';
export * from './webgl';

// Performance utilities
export { 
  measurePerformance,
  debounce,
  throttle,
  memoize,
  lazyLoad,
  preload
} from './performance';

// Accessibility utilities
export {
  generateAriaLabel,
  getColorContrast,
  checkAccessibility,
  announceToScreenReader,
  focusManagement
} from './accessibility';

// Responsive utilities
export {
  getBreakpoint,
  useMediaQuery,
  calculateResponsiveSize,
  adaptToViewport
} from './responsive';

// Color utilities
export {
  hexToRgb,
  rgbToHex,
  hslToRgb,
  rgbToHsl,
  generateColorPalette,
  getContrastRatio
} from './color';

// Math utilities
export {
  lerp,
  clamp,
  normalize,
  map,
  easeInOut,
  bezier,
  distance,
  angle
} from './math';

// Animation utilities
export {
  createKeyframes,
  calculateTiming,
  parseEasing,
  springPhysics
} from './animation';

// WebGL utilities
export {
  createShader,
  createProgram,
  loadTexture,
  resizeCanvas,
  checkWebGLSupport
} from './webgl';

// Version
export const UTILS_VERSION = '0.1.0';
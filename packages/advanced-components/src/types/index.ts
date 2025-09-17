// CogUI Advanced Components Types
import { ComponentType, ReactNode, CSSProperties } from 'react';

// Base Component Types
export interface BaseComponentProps {
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
  testId?: string;
  ariaLabel?: string;
  ariaDescription?: string;
}

export interface ResponsiveProps {
  breakpoints?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
    wide?: number;
  };
}

export interface ThemeAwareProps {
  variant?: 'light' | 'dark' | 'auto';
  colorScheme?: string;
}

// Data Visualization Types
export interface DataPoint {
  x: number | string | Date;
  y: number;
  label?: string;
  category?: string;
  metadata?: Record<string, any>;
}

export interface ChartData {
  datasets: Dataset[];
  labels?: string[];
  categories?: string[];
}

export interface Dataset {
  id: string;
  name: string;
  data: DataPoint[];
  color?: string;
  type?: ChartType;
  visible?: boolean;
  metadata?: Record<string, any>;
}

export type ChartType = 
  | 'line' 
  | 'area' 
  | 'bar' 
  | 'column'
  | 'pie' 
  | 'donut'
  | 'scatter'
  | 'bubble'
  | 'heatmap'
  | 'treemap'
  | 'sunburst'
  | 'radar'
  | 'gauge'
  | 'funnel'
  | 'waterfall'
  | 'candlestick'
  | 'ohlc'
  | 'boxplot'
  | 'violin'
  | 'histogram'
  | 'density'
  | 'timeline'
  | 'gantt'
  | 'network'
  | 'sankey'
  | 'chord';

export interface ChartOptions {
  responsive?: boolean;
  maintainAspectRatio?: boolean;
  width?: number;
  height?: number;
  padding?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
  background?: string;
  theme?: 'light' | 'dark';
  accessibility?: ChartAccessibilityOptions;
}

export interface ChartAccessibilityOptions {
  enabled?: boolean;
  description?: string;
  keyboardNavigation?: boolean;
  screenReaderSupport?: boolean;
  highContrast?: boolean;
  colorBlindFriendly?: boolean;
  textAlternatives?: Record<string, string>;
}

export interface Axis {
  type?: 'linear' | 'logarithmic' | 'time' | 'category';
  min?: number | Date;
  max?: number | Date;
  title?: string;
  unit?: string;
  format?: string | ((value: any) => string);
  grid?: {
    visible?: boolean;
    color?: string;
    style?: 'solid' | 'dashed' | 'dotted';
  };
  ticks?: {
    count?: number;
    values?: (number | Date)[];
    format?: string | ((value: any) => string);
  };
}

export interface Legend {
  visible?: boolean;
  position?: 'top' | 'right' | 'bottom' | 'left';
  alignment?: 'start' | 'center' | 'end';
  maxColumns?: number;
  itemSpacing?: number;
}

export interface Tooltip {
  enabled?: boolean;
  shared?: boolean;
  crosshairs?: boolean;
  format?: string | ((dataPoint: DataPoint) => string);
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
}

// Animation Types
export interface AnimationConfig {
  duration?: number;
  delay?: number;
  easing?: EasingFunction | string;
  repeat?: boolean | number;
  direction?: 'normal' | 'reverse' | 'alternate' | 'alternate-reverse';
  fillMode?: 'none' | 'forwards' | 'backwards' | 'both';
}

export type EasingFunction = 
  | 'linear'
  | 'ease'
  | 'ease-in'
  | 'ease-out' 
  | 'ease-in-out'
  | 'cubic-bezier'
  | 'spring'
  | 'bounce'
  | 'elastic';

export interface SpringConfig {
  tension?: number;
  friction?: number;
  mass?: number;
  velocity?: number;
  precision?: number;
}

export interface KeyframeAnimation {
  keyframes: Keyframe[];
  config: AnimationConfig;
}

export interface Keyframe {
  offset: number; // 0-1
  properties: Record<string, any>;
  easing?: EasingFunction;
}

export interface MotionProps {
  initial?: Record<string, any>;
  animate?: Record<string, any>;
  exit?: Record<string, any>;
  transition?: AnimationConfig;
  variants?: Record<string, any>;
  whileHover?: Record<string, any>;
  whileTap?: Record<string, any>;
  whileFocus?: Record<string, any>;
  layout?: boolean;
  layoutId?: string;
}

// WebXR (AR/VR) Types
export interface WebXRConfig {
  mode?: 'vr' | 'ar' | 'inline';
  requiredFeatures?: WebXRFeature[];
  optionalFeatures?: WebXRFeature[];
  domOverlay?: boolean;
  handTracking?: boolean;
  eyeTracking?: boolean;
  foveation?: number;
}

export type WebXRFeature = 
  | 'viewer'
  | 'local'
  | 'local-floor'
  | 'bounded-floor'
  | 'unbounded'
  | 'hit-test'
  | 'plane-detection'
  | 'mesh-detection'
  | 'depth-sensing'
  | 'light-estimation'
  | 'camera-access'
  | 'dom-overlay'
  | 'hand-tracking'
  | 'eye-tracking';

export interface XRSession {
  mode: 'vr' | 'ar' | 'inline';
  isActive: boolean;
  supportedFeatures: WebXRFeature[];
  frameRate: number;
  referenceSpace?: 'viewer' | 'local' | 'local-floor' | 'bounded-floor' | 'unbounded';
}

export interface XRController {
  id: number;
  hand?: 'left' | 'right';
  connected: boolean;
  position: [number, number, number];
  rotation: [number, number, number, number];
  buttons: XRButton[];
  axes: number[];
  hapticActuators?: XRHapticActuator[];
}

export interface XRButton {
  pressed: boolean;
  touched: boolean;
  value: number;
}

export interface XRHapticActuator {
  type: string;
  pulse: (intensity: number, duration: number) => Promise<boolean>;
}

export interface ARMarker {
  id: string;
  type: 'image' | 'qr' | 'aruco' | 'nft';
  url?: string;
  width: number;
  height?: number;
  confidence?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  visible?: boolean;
}

// Canvas & WebGL Types
export interface CanvasConfig {
  width: number;
  height: number;
  dpi?: number;
  antialias?: boolean;
  alpha?: boolean;
  premultipliedAlpha?: boolean;
  preserveDrawingBuffer?: boolean;
  powerPreference?: 'default' | 'high-performance' | 'low-power';
}

export interface WebGLConfig extends CanvasConfig {
  version?: 1 | 2;
  extensions?: string[];
  precision?: 'lowp' | 'mediump' | 'highp';
  depthBuffer?: boolean;
  stencilBuffer?: boolean;
}

export interface Shader {
  id: string;
  vertex: string;
  fragment: string;
  uniforms?: Record<string, any>;
  attributes?: string[];
}

export interface Texture {
  id: string;
  source: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement | ImageData;
  format?: 'rgb' | 'rgba' | 'alpha' | 'luminance';
  type?: 'unsigned-byte' | 'float' | 'half-float';
  wrapS?: 'repeat' | 'clamp' | 'mirror';
  wrapT?: 'repeat' | 'clamp' | 'mirror';
  minFilter?: 'nearest' | 'linear' | 'nearest-mipmap-nearest' | 'linear-mipmap-nearest' | 'nearest-mipmap-linear' | 'linear-mipmap-linear';
  magFilter?: 'nearest' | 'linear';
  generateMipmaps?: boolean;
}

export interface Geometry {
  vertices: Float32Array;
  indices?: Uint16Array | Uint32Array;
  normals?: Float32Array;
  uvs?: Float32Array;
  colors?: Float32Array;
}

export interface Material {
  id: string;
  type: 'basic' | 'phong' | 'pbr' | 'custom';
  color?: [number, number, number] | [number, number, number, number];
  texture?: Texture;
  normalMap?: Texture;
  roughnessMap?: Texture;
  metalnessMap?: Texture;
  emissiveMap?: Texture;
  opacity?: number;
  transparent?: boolean;
  cullFace?: 'front' | 'back' | 'none';
  depthTest?: boolean;
  depthWrite?: boolean;
}

export interface Mesh {
  id: string;
  geometry: Geometry;
  material: Material;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  visible: boolean;
}

export interface Camera {
  type: 'perspective' | 'orthographic';
  position: [number, number, number];
  target: [number, number, number];
  up: [number, number, number];
  fov?: number; // for perspective
  aspect?: number; // for perspective
  near: number;
  far: number;
  left?: number; // for orthographic
  right?: number; // for orthographic
  top?: number; // for orthographic
  bottom?: number; // for orthographic
}

export interface Light {
  id: string;
  type: 'directional' | 'point' | 'spot' | 'ambient';
  color: [number, number, number];
  intensity: number;
  position?: [number, number, number];
  direction?: [number, number, number];
  castShadows?: boolean;
  shadowMapSize?: number;
  shadowBias?: number;
  // Spot light specific
  angle?: number;
  penumbra?: number;
  // Point light specific
  distance?: number;
  decay?: number;
}

export interface Scene {
  id: string;
  meshes: Mesh[];
  lights: Light[];
  camera: Camera;
  background?: [number, number, number] | Texture;
  fog?: {
    color: [number, number, number];
    near: number;
    far: number;
  };
}

// Complex UI Types
export interface VirtualizedListProps {
  items: any[];
  itemHeight: number | ((index: number) => number);
  containerHeight: number;
  renderItem: (item: any, index: number) => ReactNode;
  overscan?: number;
  scrollOffset?: number;
  onScroll?: (scrollTop: number) => void;
}

export interface DataGridColumn {
  id: string;
  header: string;
  accessor: string | ((row: any) => any);
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  resizable?: boolean;
  sortable?: boolean;
  filterable?: boolean;
  align?: 'left' | 'center' | 'right';
  renderCell?: (value: any, row: any) => ReactNode;
  renderHeader?: () => ReactNode;
}

export interface DataGridProps {
  data: any[];
  columns: DataGridColumn[];
  height?: number;
  rowHeight?: number;
  headerHeight?: number;
  virtualized?: boolean;
  sortable?: boolean;
  filterable?: boolean;
  selectable?: boolean;
  multiSelect?: boolean;
  selectedRows?: Set<string | number>;
  onSelectionChange?: (selectedRows: Set<string | number>) => void;
  onSort?: (column: string, direction: 'asc' | 'desc') => void;
  onFilter?: (filters: Record<string, any>) => void;
}

// Performance & Monitoring Types
export interface PerformanceMetrics {
  renderTime: number;
  updateTime: number;
  memoryUsage: number;
  fps: number;
  drawCalls?: number;
  triangles?: number;
  geometries?: number;
  textures?: number;
  shaders?: number;
}

export interface ComponentStats {
  componentId: string;
  componentType: string;
  renderCount: number;
  averageRenderTime: number;
  lastRenderTime: number;
  memoryUsage: number;
  propsChanges: number;
  stateChanges: number;
}

// Error Handling Types
export interface ComponentError {
  id: string;
  componentId: string;
  type: 'render' | 'runtime' | 'resource' | 'webgl' | 'webxr';
  message: string;
  stack?: string;
  timestamp: Date;
  recoverable: boolean;
  metadata?: Record<string, any>;
}

export interface ErrorBoundaryProps {
  fallback?: ComponentType<{ error: Error; reset: () => void }>;
  onError?: (error: ComponentError) => void;
  isolateErrors?: boolean;
  retryLimit?: number;
  children: ReactNode;
}

// Event Types
export interface ComponentEvent {
  type: string;
  componentId: string;
  timestamp: Date;
  data?: any;
}

export interface InteractionEvent extends ComponentEvent {
  type: 'click' | 'hover' | 'focus' | 'blur' | 'keydown' | 'keyup';
  target: HTMLElement;
  position?: { x: number; y: number };
  key?: string;
  modifiers?: {
    ctrl: boolean;
    shift: boolean;
    alt: boolean;
    meta: boolean;
  };
}

export interface RenderEvent extends ComponentEvent {
  type: 'mount' | 'update' | 'unmount';
  renderTime: number;
  propsChanged?: string[];
  stateChanged?: boolean;
}

// Utility Types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = 
  Pick<T, Exclude<keyof T, Keys>> & 
  { [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>> }[Keys];

export type Mutable<T> = { -readonly [P in keyof T]: T[P] };

export type NonEmptyArray<T> = [T, ...T[]];

export type ValueOf<T> = T[keyof T];

// Async Types
export interface AsyncComponentState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  retry: () => void;
}

export type AsyncComponentStatus = 'idle' | 'loading' | 'success' | 'error';
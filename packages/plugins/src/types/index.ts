// CogUI Plugin System Types
import { ComponentType, ReactNode } from 'react';

// Core Plugin Types
export interface Plugin {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  manifest: PluginManifest;
  config: PluginConfig;
  metadata: PluginMetadata;
  runtime: PluginRuntime;
  api: PluginAPI;
  lifecycle: PluginLifecycleHooks;
}

export interface PluginManifest {
  cogui: string; // Required CogUI version
  name: string;
  version: string;
  author: string;
  description: string;
  homepage?: string;
  repository?: string;
  license: string;
  keywords: string[];
  category: PluginCategory;
  size?: number; // Plugin boyutu bytes cinsinden
  
  // Technical specifications
  main: string; // Entry point
  files: string[]; // Included files
  dependencies: PluginDependency[];
  permissions: PluginPermission[];
  compatibility: CompatibilityInfo;
  
  // UI Integration
  components?: ComponentManifest[];
  themes?: ThemeManifest[];
  hooks?: HookManifest[];
  
  // Configuration
  settings?: SettingsSchema[];
  defaults?: Record<string, any>;
  
  // Marketplace
  pricing?: PricingInfo;
  screenshots?: string[];
  documentation?: string;
  changelog?: string;
}

export interface PluginConfig {
  enabled: boolean;
  autoStart: boolean;
  priority: number;
  settings: Record<string, any>;
  permissions: string[];
  sandbox: SandboxConfig;
  performance: PerformanceConfig;
}

export interface PluginMetadata {
  installDate: Date;
  lastUpdate: Date;
  version: string;
  size: number; // bytes
  downloads?: number;
  rating?: number;
  reviews?: number;
  verified: boolean;
  trusted: boolean;
  official: boolean;
}

export interface PluginRuntime {
  status: PluginStatus;
  instances: PluginInstance[];
  performance: PerformanceMetrics;
  errors: PluginError[];
  logs: PluginLog[];
}

export interface PluginAPI {
  cogui: CogUIAPI;
  react: ReactAPI;
  utils: UtilityAPI;
  storage: StorageAPI;
  network: NetworkAPI;
  ui: UIAPI;
  sensors: SensorAPI;
  ml: MLAPI;
}

// Plugin Categories
export type PluginCategory = 
  | 'component'        // UI Components
  | 'theme'           // Themes and styling
  | 'sensor'          // Sensor integrations
  | 'analytics'       // Analytics and tracking
  | 'accessibility'   // Accessibility tools
  | 'ml'             // Machine learning
  | 'integration'     // Third-party integrations
  | 'utility'         // Utility functions
  | 'dev-tool'       // Development tools
  | 'experimental';   // Experimental features

// Plugin Status
export enum PluginStatus {
  Installing = 'installing',
  Installed = 'installed',
  Registered = 'registered',
  Loading = 'loading',
  Loaded = 'loaded',
  Running = 'running',
  Paused = 'paused',
  Error = 'error',
  Disabled = 'disabled',
  Uninstalling = 'uninstalling'
}

// Dependencies
export interface PluginDependency {
  id: string;
  name: string;
  version: string;
  required: boolean;
  type: 'plugin' | 'npm' | 'cogui' | 'system';
  source?: string;
}

// Permissions
export interface PluginPermission {
  id: string;
  name: string;
  description: string;
  required: boolean;
  sensitive: boolean;
  scope: PermissionScope[];
}

export type PermissionScope = 
  | 'storage'      // Local/session storage
  | 'network'      // Network requests
  | 'camera'       // Camera access
  | 'microphone'   // Microphone access
  | 'location'     // Geolocation
  | 'sensors'      // Device sensors
  | 'ui'           // UI manipulation
  | 'data'         // User data access
  | 'analytics'    // Analytics data
  | 'system'       // System information
  | 'files';       // File system access

// Compatibility
export interface CompatibilityInfo {
  cogui: string; // Semver range
  react: string;
  browsers: BrowserSupport[];
  devices: DeviceSupport[];
  os: OSSupport[];
}

export interface BrowserSupport {
  name: 'chrome' | 'firefox' | 'safari' | 'edge';
  version: string;
}

export interface DeviceSupport {
  type: 'desktop' | 'mobile' | 'tablet';
  minScreenSize?: { width: number; height: number };
}

export interface OSSupport {
  name: 'windows' | 'macos' | 'linux' | 'ios' | 'android';
  version?: string;
}

// Component Integration
export interface ComponentManifest {
  name: string;
  displayName: string;
  description: string;
  category: string;
  props?: PropDefinition[];
  examples?: ComponentExample[];
  accessibility?: AccessibilityInfo;
}

export interface PropDefinition {
  name: string;
  type: string;
  required: boolean;
  description: string;
  default?: any;
  examples?: any[];
}

export interface ComponentExample {
  name: string;
  description: string;
  code: string;
  props: Record<string, any>;
}

export interface AccessibilityInfo {
  role?: string;
  ariaLabel?: string;
  keyboardNavigation: boolean;
  screenReaderSupport: boolean;
  focusManagement: boolean;
}

// Theme Integration
export interface ThemeManifest {
  name: string;
  displayName: string;
  description: string;
  preview: string;
  variables: ThemeVariable[];
  compatibility: string[];
}

export interface ThemeVariable {
  name: string;
  type: 'color' | 'size' | 'font' | 'shadow' | 'border';
  default: string;
  description: string;
}

// Hook Integration
export interface HookManifest {
  name: string;
  description: string;
  parameters: HookParameter[];
  returns: HookReturn;
  examples: HookExample[];
}

export interface HookParameter {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

export interface HookReturn {
  type: string;
  description: string;
  properties?: Record<string, string>;
}

export interface HookExample {
  name: string;
  code: string;
  description: string;
}

// Settings and Configuration
export interface SettingsSchema {
  key: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  label: string;
  description: string;
  default: any;
  required: boolean;
  validation?: ValidationRule[];
  ui?: UIHint;
}

export interface ValidationRule {
  type: 'min' | 'max' | 'pattern' | 'enum' | 'custom';
  value: any;
  message: string;
}

export interface UIHint {
  type: 'input' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'slider' | 'color' | 'file';
  options?: { label: string; value: any }[];
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
}

// Pricing and Marketplace
export interface PricingInfo {
  type: 'free' | 'paid' | 'freemium' | 'subscription';
  price?: number;
  currency?: string;
  billing?: 'monthly' | 'yearly' | 'lifetime';
  trial?: {
    duration: number;
    features?: string[];
  };
}

// Plugin Lifecycle
export interface PluginLifecycleHooks {
  onInstall?: (context: PluginContext) => Promise<void>;
  onLoad?: (context: PluginContext) => Promise<void>;
  onStart?: (context: PluginContext) => Promise<void>;
  onStop?: (context: PluginContext) => Promise<void>;
  onUnload?: (context: PluginContext) => Promise<void>;
  onUninstall?: (context: PluginContext) => Promise<void>;
  onUpdate?: (context: PluginContext, oldVersion: string) => Promise<void>;
  onError?: (context: PluginContext, error: Error) => Promise<void>;
}

// Plugin Context
export interface PluginContext {
  plugin: Plugin;
  cogui: CogUIAPI;
  storage: PluginStorage;
  logger: PluginLogger;
  events: PluginEventEmitter;
  config: PluginConfig;
  permissions: string[];
  sandbox: PluginSandboxAPI;
}

// Plugin Instance
export interface PluginInstance {
  id: string;
  pluginId: string;
  status: PluginStatus;
  context: PluginContext;
  component?: ComponentType<any>;
  error?: Error;
  createdAt: Date;
  lastUpdate: Date;
}

// Performance Metrics
export interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  memoryUsage: number;
  cpuUsage: number;
  networkRequests: number;
  errorCount: number;
  warningCount: number;
}

export interface PerformanceConfig {
  maxMemoryUsage: number; // MB
  maxRenderTime: number; // ms
  maxNetworkRequests: number;
  timeout: number; // ms
  retries: number;
}

// Sandbox Configuration
export interface SandboxConfig {
  enabled: boolean;
  restrictions: SandboxRestriction[];
  allowedDomains: string[];
  maxExecutionTime: number;
  memoryLimit: number;
}

export type SandboxRestriction = 
  | 'no-eval'
  | 'no-function-constructor'
  | 'no-dom-access'
  | 'no-global-access'
  | 'no-network'
  | 'no-storage'
  | 'no-sensors';

// Error Handling
export interface PluginError {
  id: string;
  pluginId: string;
  type: 'load' | 'runtime' | 'permission' | 'validation' | 'network' | 'unknown';
  message: string;
  stack?: string;
  context?: any;
  timestamp: Date;
  resolved: boolean;
}

export interface PluginLog {
  id: string;
  pluginId: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  data?: any;
  timestamp: Date;
}

// Event System
export interface PluginEvent {
  type: string;
  data: any;
  source: string;
  timestamp: Date;
}

export interface PluginEventEmitter {
  on(event: string, handler: (data: any) => void): void;
  off(event: string, handler: (data: any) => void): void;
  emit(event: string, data: any): void;
}

// Storage API
export interface PluginStorage {
  get(key: string): Promise<any>;
  set(key: string, value: any): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
  keys(): Promise<string[]>;
}

// Logger API
export interface PluginLogger {
  debug(message: string, data?: any): void;
  info(message: string, data?: any): void;
  warn(message: string, data?: any): void;
  error(message: string, error?: Error): void;
}

// Sandbox API
export interface PluginSandboxAPI {
  execute(code: string, context?: any): Promise<any>;
  evaluate(expression: string): any;
  createContext(globals?: Record<string, any>): any;
  destroyContext(context: any): void;
}

// API Definitions
export interface CogUIAPI {
  version: string;
  components: ComponentRegistry;
  themes: ThemeRegistry;
  hooks: HookRegistry;
  utils: UtilityRegistry;
}

export interface ReactAPI {
  createElement: typeof React.createElement;
  useState: typeof React.useState;
  useEffect: typeof React.useEffect;
  useMemo: typeof React.useMemo;
  useCallback: typeof React.useCallback;
  useContext: typeof React.useContext;
  // Add other commonly used React APIs
}

export interface UtilityAPI {
  uuid(): string;
  debounce<T extends (...args: any[]) => any>(fn: T, delay: number): T;
  throttle<T extends (...args: any[]) => any>(fn: T, delay: number): T;
  deepClone<T>(obj: T): T;
  merge<T>(target: T, ...sources: Partial<T>[]): T;
  pick<T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K>;
  omit<T, K extends keyof T>(obj: T, keys: K[]): Omit<T, K>;
}

export interface StorageAPI {
  localStorage: Storage;
  sessionStorage: Storage;
  indexedDB: IDBFactory;
  plugin: PluginStorage;
}

export interface NetworkAPI {
  fetch(url: string, options?: RequestInit): Promise<Response>;
  websocket(url: string): WebSocket;
  sse(url: string): EventSource;
}

export interface UIAPI {
  notify(message: string, type?: 'info' | 'success' | 'warning' | 'error'): void;
  confirm(message: string): Promise<boolean>;
  prompt(message: string, defaultValue?: string): Promise<string | null>;
  modal(component: ComponentType<any>, props?: any): Promise<any>;
  tooltip(element: HTMLElement, content: string): void;
}

export interface SensorAPI {
  mouse: any; // Would import from @cogui/sensors
  keyboard: any;
  eyeTracking: any;
  voice: any;
  biometric: any;
}

export interface MLAPI {
  predict(model: string, data: any): Promise<any>;
  train(model: string, data: any): Promise<any>;
  evaluate(model: string, data: any): Promise<any>;
}

// Registry Types
export interface ComponentRegistry {
  register(name: string, component: ComponentType<any>): void;
  get(name: string): ComponentType<any> | undefined;
  list(): string[];
}

export interface ThemeRegistry {
  register(name: string, theme: any): void;
  get(name: string): any;
  list(): string[];
}

export interface HookRegistry {
  register(name: string, hook: (...args: any[]) => any): void;
  get(name: string): ((...args: any[]) => any) | undefined;
  list(): string[];
}

export interface UtilityRegistry {
  register(name: string, utility: any): void;
  get(name: string): any;
  list(): string[];
}

// Marketplace Types
export interface MarketplacePlugin extends PluginManifest {
  id: string;
  slug: string;
  downloads: number;
  rating: number;
  reviews: MarketplaceReview[];
  lastUpdate: Date;
  verified: boolean;
  featured: boolean;
  downloadUrl: string;
  size: number;
}

export interface MarketplaceReview {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  date: Date;
  helpful: number;
}

export interface MarketplaceCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  pluginCount: number;
  featured: MarketplacePlugin[];
}

// Security Types
export interface SecurityPolicy {
  id: string;
  name: string;
  description: string;
  rules: SecurityRule[];
  enforcement: 'warn' | 'block' | 'audit';
  exceptions: string[];
}

export interface SecurityRule {
  id: string;
  type: 'permission' | 'api' | 'resource' | 'behavior';
  pattern: string;
  action: 'allow' | 'deny' | 'prompt';
  condition?: string;
}

// Validation Types
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  score: number; // 0-100
}

export interface ValidationError {
  code: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  path?: string;
  suggestion?: string;
}

export interface ValidationWarning {
  code: string;
  message: string;
  path?: string;
  suggestion?: string;
}

// Installation Types
export interface PluginInstallOptions {
  source: 'marketplace' | 'url' | 'file' | 'git';
  version?: string;
  autoStart?: boolean;
  permissions?: string[];
  overwrite?: boolean;
  validate?: boolean;
}

// Development Types
export interface PluginDevConfig {
  watch: boolean;
  hotReload: boolean;
  sourceMaps: boolean;
  debugging: boolean;
  testMode: boolean;
  mockAPIs: boolean;
}

export interface PluginTemplate {
  id: string;
  name: string;
  description: string;
  category: PluginCategory;
  files: TemplateFile[];
  dependencies: string[];
  prompts: TemplatePrompt[];
}

export interface TemplateFile {
  path: string;
  content: string;
  binary?: boolean;
  template?: boolean;
}

export interface TemplatePrompt {
  name: string;
  message: string;
  type: 'input' | 'select' | 'confirm' | 'multiselect';
  choices?: string[];
  default?: any;
  validate?: (value: any) => boolean | string;
}

// Registry ve arama tipleri
export interface PluginRegistryEvent {
  type: 'plugin-registered' | 'plugin-unregistered' | 'plugin-updated';
  pluginId: string;
  timestamp: Date;
  data: any;
}

export interface PluginFilterCriteria {
  categories?: string[];
  statuses?: PluginStatus[];
  authors?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  minInstallCount?: number;
}

export type PluginSortCriteria = 'name' | 'version' | 'registeredAt' | 'lastUsed' | 'installCount' | 'size';

export interface PluginSearchCriteria {
  query?: string;
  category?: string;
  author?: string;
  status?: PluginStatus;
  sortBy?: PluginSortCriteria;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
}

// Uyumluluk tipi genişletilmiş
export interface PluginCompatibility {
  cogui: string;
  node?: string;
  browsers?: string[];
  os?: string[];
}
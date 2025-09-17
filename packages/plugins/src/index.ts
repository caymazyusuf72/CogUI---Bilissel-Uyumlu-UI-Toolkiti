// CogUI Plugin Architecture & Marketplace
export * from './types';
export * from './manager';
export * from './marketplace';
export * from './sdk';
export * from './security';
export * from './validation';

// Core Classes
export { PluginManager } from './manager/PluginManager';
export { MarketplaceClient } from './marketplace/MarketplaceClient';
export { PluginSDK } from './sdk/PluginSDK';
export { SecurityManager } from './security/SecurityManager';
export { PluginValidator } from './validation/PluginValidator';

// Utility Classes
export { PluginRegistry } from './manager/PluginRegistry';
export { PluginLoader } from './manager/PluginLoader';
export { DependencyResolver } from './manager/DependencyResolver';
export { PluginSandbox } from './security/PluginSandbox';
export { PermissionManager } from './security/PermissionManager';

// React Components
export { PluginProvider } from './components/PluginProvider';
export { PluginBoundary } from './components/PluginBoundary';
export { MarketplaceUI } from './components/MarketplaceUI';

// React Hooks
export { usePlugin } from './hooks/usePlugin';
export { usePluginManager } from './hooks/usePluginManager';
export { useMarketplace } from './hooks/useMarketplace';
export { usePluginPermissions } from './hooks/usePluginPermissions';

// Types
export type {
  Plugin,
  PluginManifest,
  PluginConfig,
  PluginMetadata,
  PluginDependency,
  PluginPermission,
  PluginAPI,
  PluginLifecycleHooks,
  MarketplacePlugin,
  MarketplaceCategory,
  SecurityPolicy,
  ValidationResult,
  PluginInstallOptions,
  PluginRuntime,
  PluginEvent,
  PluginContext
} from './types';
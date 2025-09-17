import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { 
  Plugin, 
  PluginManifest, 
  PluginConfig, 
  PluginStatus, 
  PluginContext,
  PluginInstance,
  PluginInstallOptions,
  PluginError,
  ValidationResult,
  PerformanceMetrics
} from '../types';
import { PluginRegistry } from './PluginRegistry';
import { PluginLoader } from './PluginLoader';
import { DependencyResolver } from './DependencyResolver';
import { PluginValidator } from '../validation/PluginValidator';
import { SecurityManager } from '../security/SecurityManager';
import { PermissionManager } from '../security/PermissionManager';

export interface PluginManagerConfig {
  maxPlugins: number;
  autoLoad: boolean;
  developmentMode: boolean;
  securityMode: 'strict' | 'moderate' | 'permissive';
  performanceMonitoring: boolean;
  cacheEnabled: boolean;
  updateChecking: boolean;
  telemetry: boolean;
}

export class PluginManager {
  private config: PluginManagerConfig;
  private registry: PluginRegistry;
  private loader: PluginLoader;
  private dependencyResolver: DependencyResolver;
  private validator: PluginValidator;
  private securityManager: SecurityManager;
  private permissionManager: PermissionManager;
  
  // State management
  private plugins = new Map<string, Plugin>();
  private instances = new Map<string, PluginInstance[]>();
  private isInitialized = false;
  private loadingQueue: string[] = [];
  
  // Observables
  private pluginStateSubject = new BehaviorSubject<Map<string, Plugin>>(new Map());
  private errorSubject = new Subject<PluginError>();
  private performanceSubject = new Subject<{ pluginId: string; metrics: PerformanceMetrics }>();
  
  // Performance tracking
  private performanceMetrics = new Map<string, PerformanceMetrics>();
  private performanceTimers = new Map<string, number>();

  constructor(config?: Partial<PluginManagerConfig>) {
    this.config = {
      maxPlugins: 50,
      autoLoad: true,
      developmentMode: false,
      securityMode: 'moderate',
      performanceMonitoring: true,
      cacheEnabled: true,
      updateChecking: true,
      telemetry: false,
      ...config
    };

    // Initialize subsystems
    this.registry = new PluginRegistry();
    this.loader = new PluginLoader();
    this.dependencyResolver = new DependencyResolver();
    this.validator = new PluginValidator();
    this.securityManager = new SecurityManager();
    this.permissionManager = new PermissionManager();
    
    // Set up event handlers
    this.setupEventHandlers();
  }

  /**
   * Initialize the plugin manager
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      throw new Error('PluginManager already initialized');
    }

    try {
      // Initialize subsystems
      await this.registry.initialize();
      await this.loader.initialize();
      await this.securityManager.initialize();
      await this.permissionManager.initialize();

      // Load installed plugins
      if (this.config.autoLoad) {
        await this.loadInstalledPlugins();
      }

      this.isInitialized = true;
      console.log('PluginManager initialized successfully');

    } catch (error) {
      console.error('Failed to initialize PluginManager:', error);
      throw error;
    }
  }

  /**
   * Set up event handlers for plugin lifecycle events
   */
  private setupEventHandlers(): void {
    // Plugin loading events
    this.loader.onLoadStart.subscribe(pluginId => {
      this.updatePluginStatus(pluginId, PluginStatus.Loading);
    });

    this.loader.onLoadComplete.subscribe(({ pluginId, plugin }) => {
      this.plugins.set(pluginId, plugin);
      this.updatePluginStatus(pluginId, PluginStatus.Loaded);
      this.pluginStateSubject.next(new Map(this.plugins));
    });

    this.loader.onLoadError.subscribe(({ pluginId, error }) => {
      this.handlePluginError(pluginId, 'load', error);
    });

    // Security events
    this.securityManager.onSecurityViolation.subscribe(({ pluginId, violation }) => {
      console.warn(`Security violation in plugin ${pluginId}:`, violation);
      this.pausePlugin(pluginId);
    });

    // Performance monitoring
    if (this.config.performanceMonitoring) {
      this.setupPerformanceMonitoring();
    }
  }

  /**
   * Load all installed plugins
   */
  private async loadInstalledPlugins(): Promise<void> {
    const installedPlugins = await this.registry.getInstalledPlugins();
    
    for (const pluginId of installedPlugins) {
      try {
        await this.loadPlugin(pluginId);
      } catch (error) {
        console.error(`Failed to load plugin ${pluginId}:`, error);
      }
    }
  }

  /**
   * Install a plugin
   */
  async installPlugin(
    source: string, 
    options: PluginInstallOptions = { source: 'marketplace' }
  ): Promise<Plugin> {
    this.ensureInitialized();
    
    try {
      // Check plugin limit
      if (this.plugins.size >= this.config.maxPlugins) {
        throw new Error('Maximum plugin limit reached');
      }

      // Download and extract plugin
      const pluginData = await this.loader.downloadPlugin(source, options);
      
      // Validate plugin
      const validationResult = await this.validatePlugin(pluginData);
      if (!validationResult.valid) {
        throw new Error(`Plugin validation failed: ${validationResult.errors[0]?.message}`);
      }

      // Check dependencies
      const dependencyResult = await this.dependencyResolver.resolve(pluginData.manifest);
      if (!dependencyResult.resolved) {
        throw new Error(`Dependency resolution failed: ${dependencyResult.missing.join(', ')}`);
      }

      // Security check
      const securityResult = await this.securityManager.validatePlugin(pluginData);
      if (!securityResult.valid) {
        throw new Error(`Security validation failed: ${securityResult.errors.join(', ')}`);
      }

      // Request permissions
      if (pluginData.manifest.permissions.length > 0) {
        const permissionsGranted = await this.permissionManager.requestPermissions(
          pluginData.id, 
          pluginData.manifest.permissions
        );
        
        if (!permissionsGranted) {
          throw new Error('Required permissions not granted');
        }
      }

      // Install plugin
      const plugin = await this.registry.installPlugin(pluginData, options);
      
      // Load plugin if auto-start is enabled
      if (options.autoStart !== false) {
        await this.loadPlugin(plugin.id);
      }

      console.log(`Plugin ${plugin.name} installed successfully`);
      return plugin;

    } catch (error) {
      console.error(`Failed to install plugin from ${source}:`, error);
      throw error;
    }
  }

  /**
   * Uninstall a plugin
   */
  async uninstallPlugin(pluginId: string): Promise<void> {
    this.ensureInitialized();
    
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    try {
      // Stop all instances
      await this.stopPlugin(pluginId);
      
      // Unload plugin
      await this.unloadPlugin(pluginId);
      
      // Call uninstall hook
      if (plugin.lifecycle.onUninstall) {
        const context = await this.createPluginContext(plugin);
        await plugin.lifecycle.onUninstall(context);
      }

      // Remove from registry
      await this.registry.uninstallPlugin(pluginId);
      
      // Revoke permissions
      await this.permissionManager.revokeAllPermissions(pluginId);
      
      // Clean up resources
      this.plugins.delete(pluginId);
      this.instances.delete(pluginId);
      this.performanceMetrics.delete(pluginId);
      
      this.pluginStateSubject.next(new Map(this.plugins));
      
      console.log(`Plugin ${plugin.name} uninstalled successfully`);

    } catch (error) {
      console.error(`Failed to uninstall plugin ${pluginId}:`, error);
      throw error;
    }
  }

  /**
   * Load a plugin
   */
  async loadPlugin(pluginId: string): Promise<void> {
    this.ensureInitialized();
    
    if (this.loadingQueue.includes(pluginId)) {
      throw new Error(`Plugin ${pluginId} is already loading`);
    }

    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      // Try to load from registry
      const pluginData = await this.registry.getPlugin(pluginId);
      if (!pluginData) {
        throw new Error(`Plugin ${pluginId} not found`);
      }
    }

    try {
      this.loadingQueue.push(pluginId);
      this.startPerformanceTimer(pluginId, 'load');

      // Load plugin code
      const loadedPlugin = await this.loader.loadPlugin(pluginId);
      this.plugins.set(pluginId, loadedPlugin);

      // Create plugin context
      const context = await this.createPluginContext(loadedPlugin);

      // Call load lifecycle hook
      if (loadedPlugin.lifecycle.onLoad) {
        await loadedPlugin.lifecycle.onLoad(context);
      }

      // Update status
      this.updatePluginStatus(pluginId, PluginStatus.Loaded);
      
      this.endPerformanceTimer(pluginId, 'load');
      console.log(`Plugin ${loadedPlugin.name} loaded successfully`);

    } catch (error) {
      this.handlePluginError(pluginId, 'load', error as Error);
      throw error;
    } finally {
      const index = this.loadingQueue.indexOf(pluginId);
      if (index > -1) {
        this.loadingQueue.splice(index, 1);
      }
    }
  }

  /**
   * Unload a plugin
   */
  async unloadPlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return;

    try {
      // Stop all instances first
      await this.stopPlugin(pluginId);

      // Call unload lifecycle hook
      if (plugin.lifecycle.onUnload) {
        const context = await this.createPluginContext(plugin);
        await plugin.lifecycle.onUnload(context);
      }

      // Clean up plugin resources
      await this.loader.unloadPlugin(pluginId);
      
      // Update status
      this.updatePluginStatus(pluginId, PluginStatus.Installed);
      
      console.log(`Plugin ${plugin.name} unloaded successfully`);

    } catch (error) {
      this.handlePluginError(pluginId, 'runtime', error as Error);
      throw error;
    }
  }

  /**
   * Start a plugin
   */
  async startPlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    if (plugin.runtime.status === 'running') {
      console.warn(`Plugin ${pluginId} is already running`);
      return;
    }

    try {
      this.startPerformanceTimer(pluginId, 'start');

      // Create plugin context
      const context = await this.createPluginContext(plugin);

      // Call start lifecycle hook
      if (plugin.lifecycle.onStart) {
        await plugin.lifecycle.onStart(context);
      }

      // Create plugin instance
      const instance: PluginInstance = {
        id: `${pluginId}_${Date.now()}`,
        pluginId: pluginId,
        status: PluginStatus.Running,
        context: context,
        createdAt: new Date(),
        lastUpdate: new Date()
      };

      // Add to instances
      const existingInstances = this.instances.get(pluginId) || [];
      existingInstances.push(instance);
      this.instances.set(pluginId, existingInstances);

      // Update status
      this.updatePluginStatus(pluginId, PluginStatus.Running);
      
      this.endPerformanceTimer(pluginId, 'start');
      console.log(`Plugin ${plugin.name} started successfully`);

    } catch (error) {
      this.handlePluginError(pluginId, 'runtime', error as Error);
      throw error;
    }
  }

  /**
   * Stop a plugin
   */
  async stopPlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return;

    try {
      // Call stop lifecycle hook
      if (plugin.lifecycle.onStop) {
        const context = await this.createPluginContext(plugin);
        await plugin.lifecycle.onStop(context);
      }

      // Stop all instances
      const instances = this.instances.get(pluginId) || [];
      for (const instance of instances) {
        instance.status = PluginStatus.Paused;
      }

      // Update status
      this.updatePluginStatus(pluginId, PluginStatus.Paused);
      
      console.log(`Plugin ${plugin.name} stopped successfully`);

    } catch (error) {
      this.handlePluginError(pluginId, 'runtime', error as Error);
      throw error;
    }
  }

  /**
   * Pause a plugin
   */
  async pausePlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return;

    try {
      // Update all instances
      const instances = this.instances.get(pluginId) || [];
      instances.forEach(instance => {
        instance.status = PluginStatus.Paused;
      });

      // Update status
      this.updatePluginStatus(pluginId, PluginStatus.Paused);
      
      console.log(`Plugin ${plugin.name} paused`);

    } catch (error) {
      console.error(`Failed to pause plugin ${pluginId}:`, error);
    }
  }

  /**
   * Resume a plugin
   */
  async resumePlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return;

    try {
      // Update all instances
      const instances = this.instances.get(pluginId) || [];
      instances.forEach(instance => {
        instance.status = PluginStatus.Running;
      });

      // Update status
      this.updatePluginStatus(pluginId, PluginStatus.Running);
      
      console.log(`Plugin ${plugin.name} resumed`);

    } catch (error) {
      console.error(`Failed to resume plugin ${pluginId}:`, error);
    }
  }

  /**
   * Update a plugin
   */
  async updatePlugin(pluginId: string, newVersion?: string): Promise<Plugin> {
    const currentPlugin = this.plugins.get(pluginId);
    if (!currentPlugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    try {
      // Get update information
      const updateInfo = await this.registry.getUpdateInfo(pluginId, newVersion);
      if (!updateInfo.available) {
        throw new Error('No update available');
      }

      // Download new version
      const newPluginData = await this.loader.downloadPlugin(updateInfo.downloadUrl, { 
        source: 'marketplace' 
      });

      // Validate new version
      const validationResult = await this.validatePlugin(newPluginData);
      if (!validationResult.valid) {
        throw new Error(`Update validation failed: ${validationResult.errors[0]?.message}`);
      }

      // Stop current plugin
      await this.stopPlugin(pluginId);

      // Backup current version
      await this.registry.backupPlugin(pluginId);

      try {
        // Install new version
        const updatedPlugin = await this.registry.updatePlugin(pluginId, newPluginData);
        
        // Call update lifecycle hook
        if (updatedPlugin.lifecycle.onUpdate) {
          const context = await this.createPluginContext(updatedPlugin);
          await updatedPlugin.lifecycle.onUpdate(context, currentPlugin.version);
        }

        // Update in memory
        this.plugins.set(pluginId, updatedPlugin);
        
        // Start updated plugin
        await this.startPlugin(pluginId);
        
        console.log(`Plugin ${updatedPlugin.name} updated to version ${updatedPlugin.version}`);
        return updatedPlugin;

      } catch (updateError) {
        // Rollback on failure
        console.error('Update failed, rolling back:', updateError);
        await this.registry.rollbackPlugin(pluginId);
        await this.loadPlugin(pluginId);
        await this.startPlugin(pluginId);
        throw updateError;
      }

    } catch (error) {
      console.error(`Failed to update plugin ${pluginId}:`, error);
      throw error;
    }
  }

  /**
   * Validate a plugin
   */
  private async validatePlugin(pluginData: any): Promise<ValidationResult> {
    return await this.validator.validate(pluginData);
  }

  /**
   * Create plugin context
   */
  private async createPluginContext(plugin: Plugin): Promise<PluginContext> {
    // This would create a comprehensive context with all APIs
    const context: PluginContext = {
      plugin,
      cogui: {} as any, // Would provide CogUI API
      storage: {} as any, // Would provide storage API
      logger: {} as any, // Would provide logger API
      events: {} as any, // Would provide event emitter
      config: plugin.config,
      permissions: await this.permissionManager.getGrantedPermissions(plugin.id),
      sandbox: {} as any // Would provide sandbox API
    };

    return context;
  }

  /**
   * Update plugin status
   */
  private updatePluginStatus(pluginId: string, status: PluginStatus): void {
    const plugin = this.plugins.get(pluginId);
    if (plugin) {
      plugin.runtime.status = status;
      this.pluginStateSubject.next(new Map(this.plugins));
    }
  }

  /**
   * Handle plugin error
   */
  private handlePluginError(pluginId: string, type: string, error: Error): void {
    const pluginError: PluginError = {
      id: `${pluginId}_${Date.now()}`,
      pluginId,
      type: type as any,
      message: error.message,
      stack: error.stack,
      timestamp: new Date(),
      resolved: false
    };

    const plugin = this.plugins.get(pluginId);
    if (plugin) {
      plugin.runtime.errors.push(pluginError);
      this.updatePluginStatus(pluginId, PluginStatus.Error);
    }

    this.errorSubject.next(pluginError);
  }

  /**
   * Performance monitoring setup
   */
  private setupPerformanceMonitoring(): void {
    // Monitor plugin performance metrics
    setInterval(() => {
      this.plugins.forEach((plugin, pluginId) => {
        const metrics = this.collectPerformanceMetrics(pluginId);
        this.performanceMetrics.set(pluginId, metrics);
        this.performanceSubject.next({ pluginId, metrics });
      });
    }, 5000); // Every 5 seconds
  }

  /**
   * Collect performance metrics for a plugin
   */
  private collectPerformanceMetrics(pluginId: string): PerformanceMetrics {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      return {
        loadTime: 0,
        renderTime: 0,
        memoryUsage: 0,
        cpuUsage: 0,
        networkRequests: 0,
        errorCount: plugin?.runtime.errors.length || 0,
        warningCount: 0
      };
    }

    return {
      loadTime: 0, // Would measure actual load time
      renderTime: 0, // Would measure render time
      memoryUsage: 0, // Would measure memory usage
      cpuUsage: 0, // Would measure CPU usage
      networkRequests: 0, // Would count network requests
      errorCount: plugin.runtime.errors.length,
      warningCount: 0 // Would count warnings
    };
  }

  /**
   * Start performance timer
   */
  private startPerformanceTimer(pluginId: string, operation: string): void {
    const key = `${pluginId}_${operation}`;
    this.performanceTimers.set(key, performance.now());
  }

  /**
   * End performance timer
   */
  private endPerformanceTimer(pluginId: string, operation: string): number {
    const key = `${pluginId}_${operation}`;
    const startTime = this.performanceTimers.get(key);
    if (startTime) {
      const duration = performance.now() - startTime;
      this.performanceTimers.delete(key);
      return duration;
    }
    return 0;
  }

  /**
   * Ensure manager is initialized
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('PluginManager not initialized. Call initialize() first.');
    }
  }

  // Public getters
  get pluginState$(): Observable<Map<string, Plugin>> {
    return this.pluginStateSubject.asObservable();
  }

  get errors$(): Observable<PluginError> {
    return this.errorSubject.asObservable();
  }

  get performance$(): Observable<{ pluginId: string; metrics: PerformanceMetrics }> {
    return this.performanceSubject.asObservable();
  }

  /**
   * Get all plugins
   */
  getPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get plugin by ID
   */
  getPlugin(pluginId: string): Plugin | undefined {
    return this.plugins.get(pluginId);
  }

  /**
   * Get plugin instances
   */
  getPluginInstances(pluginId: string): PluginInstance[] {
    return this.instances.get(pluginId) || [];
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(pluginId: string): PerformanceMetrics | undefined {
    return this.performanceMetrics.get(pluginId);
  }

  /**
   * Check if plugin is running
   */
  isPluginRunning(pluginId: string): boolean {
    const plugin = this.plugins.get(pluginId);
    return plugin?.runtime.status === 'running' || false;
  }

  /**
   * Dispose and cleanup
   */
  async dispose(): Promise<void> {
    // Stop all plugins
    for (const pluginId of this.plugins.keys()) {
      try {
        await this.stopPlugin(pluginId);
      } catch (error) {
        console.error(`Error stopping plugin ${pluginId}:`, error);
      }
    }

    // Cleanup subsystems
    await this.registry.dispose();
    await this.loader.dispose();
    await this.securityManager.dispose();
    await this.permissionManager.dispose();

    // Complete subjects
    this.pluginStateSubject.complete();
    this.errorSubject.complete();
    this.performanceSubject.complete();

    this.isInitialized = false;
  }
}
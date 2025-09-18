import { PWAManager } from './PWAManager';
import { NotificationManager } from './notifications';
import { OfflineManager } from './offline';
import { WebWorkerManager } from './webWorkers';

/**
 * CogUI PWA Module
 * Progressive Web App capabilities and advanced web features
 */

export interface PWAConfig {
  serviceWorker?: {
    enabled: boolean;
    scope?: string;
    updateViaCache?: 'imports' | 'all' | 'none';
    skipWaiting?: boolean;
  };
  notifications?: {
    enabled: boolean;
    vapidKey?: string;
    showBadge?: boolean;
    requireInteraction?: boolean;
  };
  offline?: {
    enabled: boolean;
    fallbackPage?: string;
    cacheStrategy?: 'cacheFirst' | 'networkFirst' | 'staleWhileRevalidate';
  };
  webWorkers?: {
    enabled: boolean;
    maxWorkers?: number;
  };
  accessibility?: {
    highContrast?: boolean;
    reducedMotion?: boolean;
    screenReader?: boolean;
  };
}

export class CogUIPWA {
  private pwaManager: PWAManager;
  private notificationManager: NotificationManager;
  private offlineManager: OfflineManager;
  private webWorkerManager: WebWorkerManager;
  private config: Required<PWAConfig>;

  constructor(config: PWAConfig = {}) {
    this.config = {
      serviceWorker: {
        enabled: true,
        scope: '/',
        updateViaCache: 'none',
        skipWaiting: false,
        ...config.serviceWorker
      },
      notifications: {
        enabled: true,
        showBadge: true,
        requireInteraction: false,
        ...config.notifications
      },
      offline: {
        enabled: true,
        fallbackPage: '/offline.html',
        cacheStrategy: 'staleWhileRevalidate',
        ...config.offline
      },
      webWorkers: {
        enabled: true,
        maxWorkers: navigator.hardwareConcurrency || 4,
        ...config.webWorkers
      },
      accessibility: {
        highContrast: false,
        reducedMotion: false,
        screenReader: false,
        ...config.accessibility
      }
    };

    this.pwaManager = new PWAManager(this.config);
    this.notificationManager = new NotificationManager(this.config);
    this.offlineManager = new OfflineManager(this.config);
    this.webWorkerManager = new WebWorkerManager(this.config);
  }

  /**
   * Initialize PWA features
   */
  async init(): Promise<void> {
    try {
      // Check PWA support
      if (!this.isPWASupported()) {
        console.warn('PWA features not fully supported in this browser');
        return;
      }

      // Initialize managers
      await Promise.all([
        this.pwaManager.init(),
        this.config.notifications.enabled && this.notificationManager.init(),
        this.config.offline.enabled && this.offlineManager.init(),
        this.config.webWorkers.enabled && this.webWorkerManager.init()
      ].filter(Boolean));

      // Setup event listeners
      this.setupEventListeners();

      // Handle installation prompt
      this.handleInstallPrompt();

      console.log('CogUI PWA initialized successfully');
    } catch (error) {
      console.error('Failed to initialize CogUI PWA:', error);
      throw error;
    }
  }

  /**
   * Check if PWA is supported
   */
  private isPWASupported(): boolean {
    return !!(
      'serviceWorker' in navigator &&
      'caches' in window &&
      'PushManager' in window
    );
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Online/offline events
    window.addEventListener('online', () => {
      this.handleOnlineStatusChange(true);
    });

    window.addEventListener('offline', () => {
      this.handleOnlineStatusChange(false);
    });

    // Visibility change for background sync
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.handleAppVisible();
      } else {
        this.handleAppHidden();
      }
    });

    // Before install prompt
    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      this.pwaManager.setInstallPrompt(event);
    });

    // App installed
    window.addEventListener('appinstalled', () => {
      this.handleAppInstalled();
    });
  }

  /**
   * Handle online status change
   */
  private handleOnlineStatusChange(isOnline: boolean): void {
    if (isOnline) {
      this.offlineManager.handleOnline();
      this.notificationManager.showNotification({
        title: 'Back Online',
        body: 'Your connection has been restored',
        icon: '/icons/online.png'
      });
    } else {
      this.offlineManager.handleOffline();
      this.notificationManager.showNotification({
        title: 'You are Offline',
        body: 'Some features may be limited',
        icon: '/icons/offline.png'
      });
    }
  }

  /**
   * Handle app becoming visible
   */
  private handleAppVisible(): void {
    // Sync data when app becomes visible
    this.offlineManager.syncData();
    this.webWorkerManager.resumeWorkers();
  }

  /**
   * Handle app becoming hidden
   */
  private handleAppHidden(): void {
    // Pause intensive operations
    this.webWorkerManager.pauseWorkers();
  }

  /**
   * Handle install prompt
   */
  private handleInstallPrompt(): void {
    // Create custom install button
    const installButton = document.getElementById('install-pwa-btn');
    if (installButton) {
      installButton.addEventListener('click', () => {
        this.pwaManager.showInstallPrompt();
      });
    }
  }

  /**
   * Handle app installed
   */
  private handleAppInstalled(): void {
    console.log('CogUI PWA installed successfully');
    
    // Hide install button
    const installButton = document.getElementById('install-pwa-btn');
    if (installButton) {
      installButton.style.display = 'none';
    }

    // Show welcome notification
    this.notificationManager.showNotification({
      title: 'Welcome to CogUI',
      body: 'App installed successfully! You can now use it offline.',
      icon: '/icons/welcome.png'
    });
  }

  /**
   * Get PWA status
   */
  getStatus(): {
    isSupported: boolean;
    isInstalled: boolean;
    isOnline: boolean;
    serviceWorkerRegistered: boolean;
    notificationsEnabled: boolean;
  } {
    return {
      isSupported: this.isPWASupported(),
      isInstalled: this.pwaManager.isInstalled(),
      isOnline: navigator.onLine,
      serviceWorkerRegistered: this.pwaManager.isServiceWorkerRegistered(),
      notificationsEnabled: this.notificationManager.isEnabled()
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<PWAConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Update managers
    this.pwaManager.updateConfig(this.config);
    this.notificationManager.updateConfig(this.config);
    this.offlineManager.updateConfig(this.config);
    this.webWorkerManager.updateConfig(this.config);
  }

  /**
   * Show install prompt
   */
  async showInstallPrompt(): Promise<boolean> {
    return this.pwaManager.showInstallPrompt();
  }

  /**
   * Request notification permission
   */
  async requestNotificationPermission(): Promise<NotificationPermission> {
    return this.notificationManager.requestPermission();
  }

  /**
   * Show notification
   */
  async showNotification(options: {
    title: string;
    body?: string;
    icon?: string;
    badge?: string;
    actions?: NotificationAction[];
    data?: any;
  }): Promise<void> {
    return this.notificationManager.showNotification(options);
  }

  /**
   * Clear cache
   */
  async clearCache(): Promise<void> {
    return this.pwaManager.clearCache();
  }

  /**
   * Force update
   */
  async forceUpdate(): Promise<void> {
    return this.pwaManager.forceUpdate();
  }

  /**
   * Get cache size
   */
  async getCacheSize(): Promise<number> {
    return this.pwaManager.getCacheSize();
  }

  /**
   * Sync data
   */
  async syncData(): Promise<void> {
    return this.offlineManager.syncData();
  }

  /**
   * Create web worker
   */
  createWorker(scriptPath: string, options?: WorkerOptions): Worker | null {
    return this.webWorkerManager.createWorker(scriptPath, options);
  }

  /**
   * Terminate all workers
   */
  terminateAllWorkers(): void {
    this.webWorkerManager.terminateAll();
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.webWorkerManager.terminateAll();
    this.pwaManager.destroy();
    this.notificationManager.destroy();
    this.offlineManager.destroy();
  }
}

// Export managers for advanced usage
export { PWAManager, NotificationManager, OfflineManager, WebWorkerManager };

// Default instance
let defaultPWA: CogUIPWA | null = null;

/**
 * Initialize default PWA instance
 */
export function initPWA(config?: PWAConfig): CogUIPWA {
  if (!defaultPWA) {
    defaultPWA = new CogUIPWA(config);
  }
  return defaultPWA;
}

/**
 * Get default PWA instance
 */
export function getPWA(): CogUIPWA | null {
  return defaultPWA;
}

// Auto-initialize if in browser
if (typeof window !== 'undefined' && !defaultPWA) {
  // Check for PWA config in meta tags
  const configMeta = document.querySelector('meta[name="cogui-pwa-config"]');
  let config: PWAConfig = {};
  
  if (configMeta) {
    try {
      config = JSON.parse(configMeta.getAttribute('content') || '{}');
    } catch (error) {
      console.warn('Invalid PWA config in meta tag');
    }
  }
  
  defaultPWA = new CogUIPWA(config);
  
  // Auto-initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      defaultPWA?.init();
    });
  } else {
    defaultPWA.init();
  }
}

export default CogUIPWA;
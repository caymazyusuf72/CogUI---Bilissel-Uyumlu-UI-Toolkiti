import EventEmitter from 'eventemitter3';

/**
 * Notification Manager
 * Advanced push notification and browser notification handling
 */

export interface NotificationOptions {
  title: string;
  body?: string;
  icon?: string;
  badge?: string;
  image?: string;
  tag?: string;
  data?: any;
  requireInteraction?: boolean;
  silent?: boolean;
  vibrate?: number[];
  timestamp?: number;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  accessibility?: {
    highContrast?: boolean;
    reducedMotion?: boolean;
    screenReader?: boolean;
  };
}

export interface PushSubscriptionConfig {
  vapidKey: string;
  userVisibleOnly: boolean;
}

export class NotificationManager extends EventEmitter {
  private config: any;
  private subscription: PushSubscription | null = null;
  private permission: NotificationPermission = 'default';
  private isEnabled: boolean = false;

  constructor(config: any) {
    super();
    this.config = config;
    this.permission = this.getPermissionStatus();
  }

  /**
   * Initialize notification manager
   */
  async init(): Promise<void> {
    try {
      if (!this.isSupported()) {
        console.warn('Notifications not supported in this browser');
        return;
      }

      this.permission = await this.requestPermission();
      
      if (this.permission === 'granted') {
        await this.setupPushSubscription();
        this.isEnabled = true;
        this.emit('initialized', { permission: this.permission });
      }

      this.setupEventListeners();
      console.log('Notification manager initialized');
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
      this.emit('error', error);
    }
  }

  /**
   * Check if notifications are supported
   */
  isSupported(): boolean {
    return !!(
      'Notification' in window &&
      'serviceWorker' in navigator &&
      'PushManager' in window
    );
  }

  /**
   * Get current permission status
   */
  getPermissionStatus(): NotificationPermission {
    return Notification.permission;
  }

  /**
   * Request notification permission
   */
  async requestPermission(): Promise<NotificationPermission> {
    try {
      if (!this.isSupported()) {
        return 'denied';
      }

      // Check if already granted
      if (this.permission === 'granted') {
        return 'granted';
      }

      // Request permission
      const permission = await Notification.requestPermission();
      this.permission = permission;
      
      this.emit('permissionChange', permission);
      return permission;
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return 'denied';
    }
  }

  /**
   * Setup push subscription
   */
  private async setupPushSubscription(): Promise<void> {
    try {
      if (!this.config.notifications?.vapidKey) {
        console.warn('VAPID key not configured - push notifications disabled');
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      
      // Check if subscription exists
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        // Create new subscription
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(this.config.notifications.vapidKey)
        });
      }

      this.subscription = subscription;
      this.emit('subscriptionChange', subscription);
      
      // Send subscription to server
      await this.sendSubscriptionToServer(subscription);
    } catch (error) {
      console.error('Failed to setup push subscription:', error);
      this.emit('error', error);
    }
  }

  /**
   * Convert VAPID key to Uint8Array
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    
    return outputArray;
  }

  /**
   * Send subscription to server
   */
  private async sendSubscriptionToServer(subscription: PushSubscription): Promise<void> {
    try {
      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          userAgent: navigator.userAgent,
          timestamp: Date.now()
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to send subscription: ${response.status}`);
      }

      console.log('Push subscription sent to server');
    } catch (error) {
      console.error('Failed to send subscription to server:', error);
    }
  }

  /**
   * Show local notification
   */
  async showNotification(options: NotificationOptions): Promise<void> {
    try {
      if (!this.isEnabled || this.permission !== 'granted') {
        console.warn('Notifications not enabled or permission denied');
        return;
      }

      // Apply accessibility preferences
      const accessibleOptions = this.applyAccessibilityPreferences(options);

      // Show via service worker for consistency
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(accessibleOptions.title, {
          body: accessibleOptions.body,
          icon: accessibleOptions.icon || '/icons/icon-192x192.png',
          badge: accessibleOptions.badge || '/icons/badge-72x72.png',
          image: accessibleOptions.image,
          tag: accessibleOptions.tag || `cogui-${Date.now()}`,
          data: accessibleOptions.data,
          requireInteraction: accessibleOptions.requireInteraction,
          silent: accessibleOptions.silent,
          vibrate: accessibleOptions.vibrate,
          timestamp: accessibleOptions.timestamp || Date.now(),
          actions: accessibleOptions.actions
        });
      } else {
        // Fallback to browser notification
        new Notification(accessibleOptions.title, accessibleOptions);
      }

      this.emit('notificationShown', options);
    } catch (error) {
      console.error('Failed to show notification:', error);
      this.emit('error', error);
    }
  }

  /**
   * Apply accessibility preferences to notification
   */
  private applyAccessibilityPreferences(options: NotificationOptions): NotificationOptions {
    const accessibleOptions = { ...options };

    if (options.accessibility) {
      // High contrast mode
      if (options.accessibility.highContrast) {
        accessibleOptions.icon = '/icons/icon-high-contrast-192x192.png';
        accessibleOptions.badge = '/icons/badge-high-contrast-72x72.png';
      }

      // Reduced motion
      if (options.accessibility.reducedMotion) {
        accessibleOptions.vibrate = undefined;
      }

      // Screen reader optimization
      if (options.accessibility.screenReader) {
        accessibleOptions.requireInteraction = true;
        accessibleOptions.silent = false;
        
        // Enhanced body text for screen readers
        if (accessibleOptions.body) {
          accessibleOptions.body = `Notification: ${accessibleOptions.body}. Tap to interact.`;
        }
      }
    }

    return accessibleOptions;
  }

  /**
   * Show notification with cognitive load consideration
   */
  async showAdaptiveNotification(options: NotificationOptions, cognitiveLoad: number = 0): Promise<void> {
    const adaptedOptions = { ...options };

    // Adapt notification based on cognitive load
    if (cognitiveLoad > 0.7) {
      // High cognitive load - minimal notification
      adaptedOptions.requireInteraction = false;
      adaptedOptions.silent = true;
      adaptedOptions.vibrate = undefined;
      adaptedOptions.actions = undefined;
    } else if (cognitiveLoad > 0.4) {
      // Medium cognitive load - reduced interaction
      adaptedOptions.requireInteraction = false;
      adaptedOptions.vibrate = [100]; // Single short vibration
    }

    await this.showNotification(adaptedOptions);
  }

  /**
   * Schedule notification
   */
  scheduleNotification(options: NotificationOptions, delay: number): void {
    setTimeout(() => {
      this.showNotification(options);
    }, delay);
  }

  /**
   * Clear all notifications
   */
  async clearAllNotifications(): Promise<void> {
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        const notifications = await registration.getNotifications();
        
        notifications.forEach(notification => {
          notification.close();
        });
      }

      this.emit('notificationsCleared');
    } catch (error) {
      console.error('Failed to clear notifications:', error);
    }
  }

  /**
   * Get active notifications
   */
  async getNotifications(tag?: string): Promise<Notification[]> {
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        return await registration.getNotifications({ tag });
      }
      return [];
    } catch (error) {
      console.error('Failed to get notifications:', error);
      return [];
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribe(): Promise<boolean> {
    try {
      if (this.subscription) {
        const success = await this.subscription.unsubscribe();
        
        if (success) {
          this.subscription = null;
          this.isEnabled = false;
          
          // Notify server
          await this.notifyServerUnsubscribe();
          
          this.emit('unsubscribed');
        }
        
        return success;
      }
      return true;
    } catch (error) {
      console.error('Failed to unsubscribe:', error);
      return false;
    }
  }

  /**
   * Notify server about unsubscribe
   */
  private async notifyServerUnsubscribe(): Promise<void> {
    try {
      await fetch('/api/notifications/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timestamp: Date.now()
        })
      });
    } catch (error) {
      console.error('Failed to notify server about unsubscribe:', error);
    }
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Listen for permission changes
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'notifications' }).then((result) => {
        result.onchange = () => {
          this.permission = result.state as NotificationPermission;
          this.emit('permissionChange', this.permission);
        };
      });
    }

    // Listen for service worker messages
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'NOTIFICATION_CLICKED') {
          this.emit('notificationClick', event.data.notification);
        } else if (event.data.type === 'NOTIFICATION_CLOSED') {
          this.emit('notificationClose', event.data.notification);
        }
      });
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: any): void {
    this.config = { ...this.config, ...newConfig };
    
    // Re-setup push subscription if VAPID key changed
    if (newConfig.notifications?.vapidKey !== this.config.notifications?.vapidKey) {
      this.setupPushSubscription();
    }
  }

  /**
   * Check if notifications are enabled
   */
  isNotificationEnabled(): boolean {
    return this.isEnabled && this.permission === 'granted';
  }

  /**
   * Get subscription info
   */
  getSubscription(): PushSubscription | null {
    return this.subscription;
  }

  /**
   * Destroy notification manager
   */
  destroy(): void {
    this.removeAllListeners();
    this.isEnabled = false;
    this.subscription = null;
  }
}

export default NotificationManager;
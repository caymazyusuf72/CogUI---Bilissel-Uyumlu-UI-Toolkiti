import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate, CacheFirst, NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { BackgroundSync } from 'workbox-background-sync';
import { BroadcastUpdatePlugin } from 'workbox-broadcast-update';

declare const self: ServiceWorkerGlobalScope;

/**
 * CogUI Service Worker
 * Advanced PWA Service Worker with offline-first capabilities
 */

// Precache and route static assets
precacheAndRoute(self.__WB_MANIFEST || []);
cleanupOutdatedCaches();

// Skip waiting and claim clients immediately
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Cache strategies for different resource types
const CACHE_NAMES = {
  static: 'cogui-static-v1',
  dynamic: 'cogui-dynamic-v1',
  api: 'cogui-api-v1',
  images: 'cogui-images-v1',
  fonts: 'cogui-fonts-v1',
  analytics: 'cogui-analytics-v1'
};

// Static resources (CSS, JS, HTML)
registerRoute(
  ({ request }) => request.destination === 'script' ||
                   request.destination === 'style' ||
                   request.destination === 'document',
  new StaleWhileRevalidate({
    cacheName: CACHE_NAMES.static,
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200]
      }),
      new BroadcastUpdatePlugin()
    ]
  })
);

// API requests with network-first strategy
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: CACHE_NAMES.api,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 60 // 1 hour
      }),
      new CacheableResponsePlugin({
        statuses: [0, 200]
      })
    ]
  })
);

// Images with cache-first strategy
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: CACHE_NAMES.images,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
      }),
      new CacheableResponsePlugin({
        statuses: [0, 200]
      })
    ]
  })
);

// Fonts with cache-first strategy
registerRoute(
  ({ request }) => request.destination === 'font',
  new CacheFirst({
    cacheName: CACHE_NAMES.fonts,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 30,
        maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
      }),
      new CacheableResponsePlugin({
        statuses: [0, 200]
      })
    ]
  })
);

// Google Analytics requests
registerRoute(
  ({ url }) => url.origin === 'https://www.google-analytics.com' ||
               url.origin === 'https://analytics.google.com',
  new NetworkFirst({
    cacheName: CACHE_NAMES.analytics,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 60 * 60 * 24 // 1 day
      })
    ]
  })
);

// Background sync for failed requests
const bgSync = new BackgroundSync('cogui-bg-sync', {
  maxRetentionTime: 24 * 60 // 24 hours
});

// Handle sync events
self.addEventListener('sync', (event) => {
  if (event.tag === 'cogui-bg-sync') {
    event.waitUntil(bgSync.replayRequests());
  }
});

// Push notification handling
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const options: NotificationOptions = {
    body: 'CogUI notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Open App',
        icon: '/icons/checkmark.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icons/xmark.png'
      }
    ],
    requireInteraction: true,
    renotify: true,
    tag: 'cogui-notification'
  };

  try {
    const payload = event.data.json();
    options.title = payload.title || 'CogUI Notification';
    options.body = payload.body || payload.message || 'You have a new notification';
    options.icon = payload.icon || options.icon;
    options.data = { ...options.data, ...payload.data };

    // Accessibility considerations
    if (payload.accessibility) {
      // High contrast mode
      if (payload.accessibility.highContrast) {
        options.icon = '/icons/icon-high-contrast-192x192.png';
      }
      
      // Reduced motion
      if (payload.accessibility.reducedMotion) {
        options.vibrate = undefined;
      }
      
      // Screen reader optimization
      if (payload.accessibility.screenReader) {
        options.requireInteraction = true;
        options.silent = false;
      }
    }

  } catch (error) {
    console.error('Error parsing push notification payload:', error);
  }

  event.waitUntil(
    self.registration.showNotification(options.title || 'CogUI', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then((clientList) => {
        // Focus existing window or open new one
        for (const client of clientList) {
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }
        
        if (self.clients.openWindow) {
          return self.clients.openWindow('/');
        }
      })
    );
  } else if (event.action === 'close') {
    // Just close the notification (already handled above)
    return;
  } else {
    // Default action - open the app
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then((clientList) => {
        if (clientList.length > 0) {
          return clientList[0].focus();
        }
        return self.clients.openWindow('/');
      })
    );
  }
});

// Offline fallback handling
const OFFLINE_PAGE = '/offline.html';
const FALLBACK_IMAGE = '/icons/offline-image.svg';

// Cache offline page during install
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAMES.static).then((cache) => {
      return cache.addAll([
        OFFLINE_PAGE,
        FALLBACK_IMAGE,
        '/', // Cache the root page
        '/manifest.json'
      ]);
    })
  );
});

// Serve offline page when network fails
registerRoute(
  ({ request }) => request.mode === 'navigate',
  async ({ event }) => {
    try {
      return await new NetworkFirst({
        cacheName: CACHE_NAMES.dynamic
      }).handle({ event, request: event.request });
    } catch (error) {
      const cache = await caches.open(CACHE_NAMES.static);
      return await cache.match(OFFLINE_PAGE) || new Response('Offline');
    }
  }
);

// Handle failed image requests
registerRoute(
  ({ request }) => request.destination === 'image',
  async ({ event }) => {
    try {
      return await new CacheFirst({
        cacheName: CACHE_NAMES.images
      }).handle({ event, request: event.request });
    } catch (error) {
      const cache = await caches.open(CACHE_NAMES.static);
      return await cache.match(FALLBACK_IMAGE) || new Response();
    }
  }
);

// Periodic background sync for data updates
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'cogui-data-sync') {
    event.waitUntil(updateCogUIData());
  }
});

async function updateCogUIData(): Promise<void> {
  try {
    // Update user preferences
    const preferencesResponse = await fetch('/api/user/preferences');
    if (preferencesResponse.ok) {
      const cache = await caches.open(CACHE_NAMES.api);
      cache.put('/api/user/preferences', preferencesResponse.clone());
    }

    // Update accessibility settings
    const accessibilityResponse = await fetch('/api/user/accessibility');
    if (accessibilityResponse.ok) {
      const cache = await caches.open(CACHE_NAMES.api);
      cache.put('/api/user/accessibility', accessibilityResponse.clone());
    }

    // Broadcast update to clients
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'DATA_UPDATED',
        timestamp: Date.now()
      });
    });

  } catch (error) {
    console.error('Background data sync failed:', error);
  }
}

// Handle client messages
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;

  switch (type) {
    case 'GET_VERSION':
      event.ports[0].postMessage({ version: '1.0.0' });
      break;
    
    case 'CLEAR_CACHE':
      event.waitUntil(clearAllCaches());
      break;
    
    case 'UPDATE_PREFERENCES':
      event.waitUntil(updateUserPreferences(payload));
      break;
    
    case 'FORCE_SYNC':
      event.waitUntil(updateCogUIData());
      break;
      
    default:
      console.log('Unknown message type:', type);
  }
});

async function clearAllCaches(): Promise<void> {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames.map(cacheName => caches.delete(cacheName))
  );
}

async function updateUserPreferences(preferences: any): Promise<void> {
  try {
    const cache = await caches.open(CACHE_NAMES.api);
    const response = new Response(JSON.stringify(preferences), {
      headers: { 'Content-Type': 'application/json' }
    });
    await cache.put('/api/user/preferences', response);
  } catch (error) {
    console.error('Failed to update preferences cache:', error);
  }
}

// Log service worker lifecycle events
self.addEventListener('install', (event) => {
  console.log('CogUI Service Worker installing...');
});

self.addEventListener('activate', (event) => {
  console.log('CogUI Service Worker activated');
});

// Error handling
self.addEventListener('error', (event) => {
  console.error('Service Worker error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('Service Worker unhandled promise rejection:', event.reason);
});
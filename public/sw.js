// Service Worker for AI/ML Glossary PWA
const CACHE_NAME = 'aiml-glossary-v1.0.0';
const STATIC_CACHE = 'aiml-glossary-static-v1.0.0';
const DYNAMIC_CACHE = 'aiml-glossary-dynamic-v1.0.0';

// Static assets to cache
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/favicon-32x32.png',
  '/favicon-16x16.png',
  '/manifest.json'
];

// API endpoints to cache
const API_ENDPOINTS = [
  '/data/terms/terms-a-z.json',
  '/data/contributors/active-contributors.json',
  '/data/organizations/verified-organizations.json',
  '/data/members/core-members.json'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker');
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then(cache => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      }),
      caches.open(DYNAMIC_CACHE).then(cache => {
        console.log('[SW] Caching API data');
        return cache.addAll(API_ENDPOINTS);
      })
    ]).then(() => {
      console.log('[SW] Installation complete');
      return self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(cacheName => cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE)
          .map(cacheName => {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    }).then(() => {
      console.log('[SW] Activation complete');
      return self.clients.claim();
    })
  );
});

// Fetch event - handle requests with caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle API requests
  if (url.pathname.startsWith('/data/') || url.hostname.includes('api.github.com')) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }

  // Handle static assets
  if (STATIC_ASSETS.includes(url.pathname) || request.destination === 'style' || request.destination === 'script') {
    event.respondWith(cacheFirstStrategy(request));
    return;
  }

  // Handle navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstStrategy(request));
    return;
  }

  // Default: network first for other requests
  event.respondWith(networkFirstStrategy(request));
});

// Cache-first strategy for static assets
async function cacheFirstStrategy(request) {
  try {
    // Skip caching for chrome-extension requests
    if (request.url.startsWith('chrome-extension://')) {
      return fetch(request);
    }

    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('[SW] Cache-first strategy failed:', error);
    // Return offline fallback for critical assets
    if (request.url.includes('favicon')) {
      return caches.match('/favicon.svg');
    }
    throw error;
  }
}

// Network-first strategy for dynamic content
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);

    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log('[SW] Network request failed, trying cache:', error);

    // Try to get from cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline fallback for navigation
    if (request.mode === 'navigate') {
      const cache = await caches.open(STATIC_CACHE);
      return cache.match('/index.html');
    }

    throw error;
  }
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);

  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  console.log('[SW] Performing background sync');

  try {
    // Refresh cached data
    const cache = await caches.open(DYNAMIC_CACHE);
    await cache.addAll(API_ENDPOINTS);

    // Notify clients about sync completion
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETED',
        timestamp: Date.now()
      });
    });

    console.log('[SW] Background sync completed');
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

// Push notifications (future enhancement)
self.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event);

  if (event.data) {
    const data = event.data.json();

    const options = {
      body: data.body,
      icon: '/favicon-32x32.png',
      badge: '/favicon-32x32.png',
      data: data.url,
      requireInteraction: true,
      actions: [
        {
          action: 'view',
          title: '보기'
        },
        {
          action: 'dismiss',
          title: '닫기'
        }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);

  event.notification.close();

  if (event.action === 'view') {
    const urlToOpen = event.notification.data || '/';
    event.waitUntil(
      clients.openWindow(urlToOpen)
    );
  }
});

// Message handler for communication with main thread
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: '1.0.0' });
  }
});

// Periodic cache cleanup
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'cleanup') {
    event.waitUntil(cleanupCache());
  }
});

async function cleanupCache() {
  console.log('[SW] Running periodic cache cleanup');

  const cache = await caches.open(DYNAMIC_CACHE);
  const keys = await cache.keys();

  // Remove old entries (older than 24 hours)
  const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);

  for (const request of keys) {
    const response = await cache.match(request);
    if (response) {
      const date = response.headers.get('date');
      if (date && new Date(date).getTime() < oneDayAgo) {
        await cache.delete(request);
        console.log('[SW] Removed old cache entry:', request.url);
      }
    }
  }
}

/**
 * Heady Systems Service Worker
 * Enables offline functionality and PWA installation
 */

const CACHE_NAME = 'heady-v3.0.0';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/api/health',
  '/api/pulse',
];

// Install event - cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Opened cache');
      return cache.addAll(urlsToCache).catch((err) => {
        console.warn('[SW] Failed to cache some URLs:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip chrome-extension and other non-http(s) requests
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone the response
        const responseToCache = response.clone();

        // Cache successful responses
        if (response.status === 200) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }

        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(event.request).then((response) => {
          if (response) {
            console.log('[SW] Serving from cache:', event.request.url);
            return response;
          }

          // Return offline page for navigation requests
          if (event.request.mode === 'navigate') {
            return caches.match('/').then((indexResponse) => {
              return indexResponse || new Response('Offline - Heady Systems', {
                headers: { 'Content-Type': 'text/html' },
              });
            });
          }

          return new Response('Network error', {
            status: 408,
            headers: { 'Content-Type': 'text/plain' },
          });
        });
      })
  );
});

// Handle messages from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Background sync for offline requests
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-heady-data') {
    event.waitUntil(syncData());
  }
});

async function syncData() {
  console.log('[SW] Background sync triggered');
  // Implement your sync logic here
}

// Push notifications
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Heady Systems';
  const options = {
    body: data.body || 'New notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    data: data.url,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.notification.data) {
    event.waitUntil(
      clients.openWindow(event.notification.data)
    );
  }
});

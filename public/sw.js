const SHELL_CACHE = 'perplexta-shell-v9';
const API_CACHE = 'perplexta-api-v1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/manifest.webmanifest',
  '/app-assets/pwa-192x192.png',
  '/app-assets/pwa-512x512.png',
  'https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700&display=swap',
  'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Failed to precache some static assets:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== SHELL_CACHE && cacheName !== API_CACHE) {
            console.log('[SW] Deleting legacy cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Bypass non-GET requests (POST, PUT, DELETE, etc.) and file uploads/streaming/ws
  if (
    event.request.method !== 'GET' ||
    url.pathname.startsWith('/uploads/') || 
    url.pathname.includes('/uploads/') ||
    url.pathname.startsWith('/socket.io/')
  ) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Handle GET API requests with Stale-While-Revalidate strategy
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      caches.open(API_CACHE).then(async (cache) => {
        const cachedResponse = await cache.match(event.request);
        
        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch((err) => {
            console.warn('[SW] Background API revalidation failed:', url.pathname, err);
            return cachedResponse;
          });

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // Navigation requests (HTML SPA shell) -> Stale-while-revalidate with offline /index.html fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.open(SHELL_CACHE).then(async (cache) => {
        const cachedHtml = await cache.match('/index.html') || await cache.match('/');
        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put('/index.html', networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => cachedHtml);

        return fetchPromise.catch(() => cachedHtml);
      })
    );
    return;
  }

  // Application Shell Assets (CSS, JS, Fonts, App Assets) -> Stale-While-Revalidate
  event.respondWith(
    caches.open(SHELL_CACHE).then(async (cache) => {
      const cachedAsset = await cache.match(event.request);

      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        })
        .catch(() => cachedAsset);

      return cachedAsset || fetchPromise;
    })
  );
});

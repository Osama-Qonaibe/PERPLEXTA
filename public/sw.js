const CACHE_NAME = 'perplexta-cache-v2';
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico'
];

// 1. Install Event: Pre-cache Essential App Shell Files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[PWA SW] Pre-caching core application shell assets...');
      return cache.addAll(CORE_ASSETS).catch(err => {
        console.warn('[PWA SW] Portions of pre-cache failed (non-fatal):', err);
      });
    })
  );
  self.skipWaiting();
});

// 2. Activate Event: Prune stale legacy caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('[PWA SW] Archiving and purging legacy cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch Event: Advanced Caching Strategies (Stale-While-Revalidate & Network-First)
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Exclude security boundaries, dynamic APIs, and real-time WebSockets
  if (
    url.pathname.startsWith('/api/') || 
    url.pathname.includes('socket.io') ||
    event.request.method !== 'GET'
  ) {
    return; // Pass through to browser network layer natively
  }

  // A. Navigation Requests (HTML / Shell) -> Network First, fall back to cached App Shell
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Dynamically cache fresh navigations to keep the offline fallback updated
          if (response.status === 200) {
            const cacheCopy = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, cacheCopy);
            });
          }
          return response;
        })
        .catch(() => {
          console.log('[PWA SW] Network offline. Serving cached Shell fallback.');
          return caches.match('/').then(fallback => {
            return fallback || caches.match('/index.html');
          });
        })
    );
    return;
  }

  // B. Static & Asset Requests (CSS, JS, Fonts, Images) -> Stale-While-Revalidate
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      const fetchPromise = fetch(event.request)
        .then(networkResponse => {
          // Cache successful asset responses
          if (networkResponse.status === 200 || networkResponse.status === 304) {
            const cacheCopy = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, cacheCopy);
            });
          }
          return networkResponse;
        })
        .catch(err => {
          console.debug('[PWA SW] Network fetch failed for asset:', url.pathname, err);
          // Return cached response if available, else let request fail
          return cachedResponse;
        });

      // Serve immediately from cache if available, updating in the background; else wait for network
      return cachedResponse || fetchPromise;
    })
  );
});
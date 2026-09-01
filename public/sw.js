// Version 1.0.2 - Resilient Media & Range Stream Support
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // 1. Bypass navigation requests (like F5 reloads on /chat) to let the server serve 
  // fresh, secure HTML containing dynamic CSP nonces and real-time SEO tags
  if (event.request.mode === 'navigate') {
    return;
  }

  // 2. Let the browser handle video/audio streaming and Range requests natively
  if (
    event.request.headers.has('range') ||
    event.request.destination === 'video' ||
    event.request.destination === 'audio' ||
    event.request.url.includes('/uploads/')
  ) {
    return;
  }

  // 3. Workaround for Chromium 'only-if-cached' bug causing ERR_FAILED on asset reloads
  if (event.request.cache === 'only-if-cached' && event.request.mode !== 'same-origin') {
    return;
  }

  // 4. Safe pass-through for other assets with global error handling
  event.respondWith(
    fetch(event.request).catch((err) => {
      console.warn('[SW] Passive fetch fallback:', err);
      // Let it fail gracefully or let the browser handle it natively
      return new Response('Network Error', { status: 408, statusText: 'Network Error' });
    })
  );
});


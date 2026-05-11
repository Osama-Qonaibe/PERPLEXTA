const CACHE_NAME = 'perplexta-v1';

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Bypass Service Worker for API requests and socket.io
  if (url.pathname.startsWith('/api/') || url.pathname.includes('socket.io')) {
    return; // Returning here allows the browser to handle the fetch normally
  }

  // Simple network-first for HTML, others can be cached or network-led
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/');
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
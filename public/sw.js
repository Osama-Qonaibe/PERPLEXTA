// Version 1.0.2 - Resilient Media & Range Stream Support
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Let the browser handle video/audio streaming and Range requests natively
  if (
    event.request.headers.has('range') ||
    event.request.destination === 'video' ||
    event.request.destination === 'audio' ||
    event.request.url.includes('/uploads/')
  ) {
    return;
  }

  event.respondWith(fetch(event.request));
});


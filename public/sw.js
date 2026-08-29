// Version 1.0.3 - Bypass API and OAuth routes from Service Worker interception
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Do not intercept API requests or OAuth callbacks
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.includes('/auth/') ||
    event.request.headers.has('range') ||
    event.request.destination === 'video' ||
    event.request.destination === 'audio' ||
    event.request.url.includes('/uploads/')
  ) {
    return;
  }

  event.respondWith(fetch(event.request));
});


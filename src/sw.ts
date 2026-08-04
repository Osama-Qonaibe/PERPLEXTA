/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, NetworkOnly } from 'workbox-strategies';
import { BackgroundSyncPlugin } from 'workbox-background-sync';
import { ExpirationPlugin } from 'workbox-expiration';

declare let self: ServiceWorkerGlobalScope;

// Precache build assets
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Background Sync for API posts
const bgSyncPlugin = new BackgroundSyncPlugin('perplexta-sync-queue', {
  maxRetentionTime: 24 * 60,
});

registerRoute(
  ({ url }) => url.pathname.includes('/api/chats') || 
               url.pathname.includes('/api/messages') ||
               url.pathname.includes('/api/reports'),
  new NetworkOnly({
    plugins: [bgSyncPlugin],
  }),
  'POST'
);

// CRITICAL: ABSOLUTE BYPASS for all images, media uploads, and API routes
// This ensures images never get blocked, cached as stale, or vanish after navigation/refresh.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/uploads/') ||
    url.pathname.includes('/uploads/') ||
    event.request.destination === 'image' ||
    /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i.test(url.pathname) ||
    url.hostname.includes('unsplash.com') ||
    url.hostname.includes('googleusercontent.com') ||
    url.hostname.includes('githubusercontent.com')
  ) {
    // Return direct fetch so images and uploads are never cached or interfered with by SW
    return;
  }
});

// HTML document fallback for offline navigation
registerRoute(
  ({ request }) => request.mode === 'navigate',
  new NetworkFirst({
    cacheName: 'pages-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 10,
        maxAgeSeconds: 86400,
      }),
    ],
  })
);

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

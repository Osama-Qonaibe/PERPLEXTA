const CACHE_NAME = 'perplexta-cache-v3';
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
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
    url.pathname.includes('/uploads/') ||
    url.pathname.includes('/avatar') ||
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

  // B. Static & Asset Requests (CSS, JS, Fonts, Images) -> Cache-First
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then(networkResponse => {
        if (networkResponse.status === 200 || networkResponse.status === 304) {
          const cacheCopy = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, cacheCopy);
          });
        }
        return networkResponse;
      }).catch(err => {
        console.debug('[PWA SW] Network fetch failed for asset:', url.pathname, err);
        return cachedResponse;
      });
    })
  );
});

// === Background Sync Service API Integration ===

function openPwaDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('perplexta-pwa-db', 2);
    request.onupgradeneeded = event => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('failed-messages')) {
        db.createObjectStore('failed-messages', { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function getFailedMessages() {
  return openPwaDB().then(db => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('failed-messages', 'readonly');
      const store = transaction.objectStore('failed-messages');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  });
}

function deleteFailedMessage(id) {
  return openPwaDB().then(db => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('failed-messages', 'readwrite');
      const store = transaction.objectStore('failed-messages');
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  });
}

async function syncFailedMessages() {
  const messages = await getFailedMessages();
  console.log('[PWA SW] Found failed messages to sync:', messages.length);
  for (const msg of messages) {
    try {
      const response = await fetch('/api/chats/sync-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${msg.token}`
        },
        body: JSON.stringify({
          chatId: msg.chatId,
          content: msg.content,
          toolId: msg.toolId,
          modelId: msg.modelId
        })
      });

      if (response.ok) {
        console.log('[PWA SW] Message synced successfully:', msg.id);
        await deleteFailedMessage(msg.id);
        
        // Broadcast to clients
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
          client.postMessage({
            type: 'sync-complete',
            chatId: msg.chatId,
            messageId: msg.id
          });
        });
      } else if (response.status >= 400 && response.status < 500) {
        // Discard validation/auth errors
        console.warn('[PWA SW] Discarding invalid status sync:', msg.id, response.status);
        await deleteFailedMessage(msg.id);
      } else {
        throw new Error(`Temporary status: ${response.status}`);
      }
    } catch (err) {
      console.error('[PWA SW] Message sync failed, retaining inside DB state:', msg.id, err);
      throw err; // Allows background sync retry
    }
  }
}

self.addEventListener('sync', event => {
  if (event.tag === 'sync-failed-messages') {
    event.waitUntil(syncFailedMessages());
  }
});
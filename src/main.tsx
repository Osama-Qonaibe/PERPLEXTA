import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.tsx';
import './index.css';
import { VersionManager } from './utils/versionManager';

// Auto-reload on chunk load errors (PWA stale cache issue)
const forceHardReload = async () => {
  if (!sessionStorage.getItem('chunk_reloaded')) {
    sessionStorage.setItem('chunk_reloaded', 'true');
    console.error('[PWA] Stale chunk detected, updating Service Worker and forcing reload...');
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.update();
        }
      }
    } catch (e) {
      console.error('SW update failed', e);
    }
    window.location.reload();
  }
};

window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && (
      event.reason.message?.includes('Failed to fetch dynamically imported module') ||
      event.reason.message?.includes('error loading dynamically imported module') ||
      event.reason.name === 'ChunkLoadError'
  )) {
    event.preventDefault();
    forceHardReload();
  }
});

window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    forceHardReload();
});

// Clear reload flag on successful load
window.addEventListener('load', () => {
  setTimeout(() => {
    sessionStorage.removeItem('chunk_reloaded');
  }, 1000);
});

// Initialize version auto-checker to prevent stale asset cache issues
VersionManager.initAutoCheck();

// Register Service Worker for app shell precaching and offline support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Listen for controller changes when a new Service Worker takes control
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.dispatchEvent(new CustomEvent('service-worker-updated'));
    });

    navigator.serviceWorker.register('/sw.js').then((registration) => {
      registration.addEventListener('updatefound', () => {
        const installingWorker = registration.installing;
        if (installingWorker) {
          installingWorker.addEventListener('statechange', () => {
            if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
              window.dispatchEvent(new CustomEvent('service-worker-updated'));
            }
          });
        }
      });
    }).catch((err) => {
      console.warn('[PWA] Service Worker registration failed:', err);
    });
  });
}

// Silence non-critical console calls in production to prevent telemetry / token leakage.
// console.error is intentionally kept alive so ErrorBoundary crash reports
// reach the server logger and are never silently swallowed.
if (!import.meta.env.DEV) {
  console.log   = () => {};
  console.warn  = () => {};
  console.info  = () => {};
  console.debug = () => {};
  // console.error — intentionally NOT silenced (required for ErrorBoundary reporting)
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      retry: 2,
      refetchOnWindowFocus: false,
      refetchOnReconnect: 'always',
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
);


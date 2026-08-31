import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.tsx';
import './index.css';
import { VersionManager } from './utils/versionManager';

// Auto-reload on chunk load errors (PWA stale cache issue)
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && (
      event.reason.message?.includes('Failed to fetch dynamically imported module') ||
      event.reason.message?.includes('error loading dynamically imported module') ||
      event.reason.name === 'ChunkLoadError'
  )) {
    console.error('[PWA] Stale chunk detected, forcing reload...');
    if (!sessionStorage.getItem('chunk_reloaded')) {
      sessionStorage.setItem('chunk_reloaded', 'true');
      const targetUrl = new URL(window.location.href);
      targetUrl.searchParams.set('t', Date.now().toString());
      window.location.href = targetUrl.toString();
    }
  }
});

window.addEventListener('vite:preloadError', () => {
    if (!sessionStorage.getItem('chunk_reloaded')) {
      sessionStorage.setItem('chunk_reloaded', 'true');
      const targetUrl = new URL(window.location.href);
      targetUrl.searchParams.set('t', Date.now().toString());
      window.location.href = targetUrl.toString();
    }
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


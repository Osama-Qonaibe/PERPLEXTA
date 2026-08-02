import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.tsx';
import './index.css';
import { VersionManager } from './utils/versionManager';

// Initialize version auto-checker to prevent stale asset cache issues
VersionManager.initAutoCheck();

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

const queryClient = new QueryClient({
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

/*
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
*/

createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>,
);

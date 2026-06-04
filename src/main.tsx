import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.tsx';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * 60 * 1000, // 10 minutes cache freshness to significantly lower backend query load
      gcTime: 30 * 60 * 1000,    // Keep garbage collection in inactive state for 30 minutes
      retry: 2,                  // Retry 2 times on transient failures
      refetchOnWindowFocus: false, // Stop aggressive polling/refetching on window refocus
      refetchOnReconnect: 'always', // Automatically revalidate when network connection is restored
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);

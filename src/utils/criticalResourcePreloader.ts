/**
 * Critical Resource Preloader & Idle State Chunk Deferral Manager
 * Prioritizes core critical initial paint assets (CSS, Fonts, Critical UI)
 * and safely defers non-essential heavy feature modules (Admin, Studio, PDF renderers)
 * until the browser enters a verified idle state.
 */

import { useEffect, useRef } from 'react';
import { detectDeviceCapabilities } from './deviceCapabilities';

export interface PreloaderConfig {
  enableIdlePrefetch?: boolean;
  idleDelayMs?: number;
  maxIdleTimeout?: number;
}

// Registry of non-essential chunk loaders that should be deferred to idle state
const DEFERRED_CHUNKS = [
  { name: 'AdminDashboard', loader: () => import('../pages/AdminDashboard') },
  { name: 'StudioPage', loader: () => import('../pages/StudioPage') },
  { name: 'RewardsPage', loader: () => import('../pages/RewardsPage') },
  { name: 'SubscriptionPage', loader: () => import('../pages/SubscriptionPage') },
  { name: 'SettingsPage', loader: () => import('../pages/SettingsPage') },
  { name: 'GoogleHubPage', loader: () => import('../pages/GoogleHubPage') }
];

/**
 * Pre-warms critical initial paint assets (DNS, Fonts, Stylesheets)
 */
export function preloadCriticalInitialAssets(): void {
  if (typeof document === 'undefined') return;

  // 1. Ensure core font pre-connections are prioritized
  const fontPreconnects = [
    'https://fonts.googleapis.com',
    'https://fonts.gstatic.com'
  ];

  fontPreconnects.forEach((url) => {
    if (!document.querySelector(`link[rel="preconnect"][href="${url}"]`)) {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = url;
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    }
  });
}

/**
 * Schedules deferred pre-fetching of secondary feature chunks during browser idle time
 */
export function scheduleIdleChunkPrefetch(config: PreloaderConfig = {}): () => void {
  if (typeof window === 'undefined') return () => {};

  const { isLowEndDevice, isSaveDataEnabled, effectiveConnectionType } = detectDeviceCapabilities();

  // Conservative safeguard: Do not prefetch heavy chunks on low-RAM devices or data-saver connections
  if (isLowEndDevice || isSaveDataEnabled || effectiveConnectionType === '2g' || effectiveConnectionType === 'slow-2g') {
    return () => {};
  }

  let idleHandle: number | null = null;
  let timerHandle: NodeJS.Timeout | null = null;
  let isCancelled = false;

  const prefetchDeferredChunks = async (deadline?: IdleDeadline) => {
    for (const chunk of DEFERRED_CHUNKS) {
      if (isCancelled) break;

      // If deadline API is available, yield if frame time is tight (< 5ms remaining)
      if (deadline && deadline.timeRemaining && deadline.timeRemaining() < 5 && !deadline.didTimeout) {
        break;
      }

      try {
        await chunk.loader();
      } catch (err) {
        // Silent catch for background prefetch
      }

      // Small breather between module imports to preserve main-thread responsiveness
      await new Promise((r) => setTimeout(r, 120));
    }
  };

  const executePrefetch = () => {
    if (typeof window.requestIdleCallback === 'function') {
      idleHandle = window.requestIdleCallback(
        (deadline) => {
          prefetchDeferredChunks(deadline);
        },
        { timeout: config.maxIdleTimeout || 6000 }
      );
    } else {
      timerHandle = setTimeout(() => {
        prefetchDeferredChunks();
      }, 500);
    }
  };

  // Initial delay (default 3.5s) to ensure Initial Paint, FCP, and LCP are completely finished
  const initialDelay = config.idleDelayMs ?? 3500;
  timerHandle = setTimeout(executePrefetch, initialDelay);

  return () => {
    isCancelled = true;
    if (timerHandle) clearTimeout(timerHandle);
    if (idleHandle !== null && typeof window.cancelIdleCallback === 'function') {
      window.cancelIdleCallback(idleHandle);
    }
  };
}

/**
 * React Component to activate critical asset preloading and idle deferral
 */
export const CriticalResourcePreloader: React.FC<PreloaderConfig> = (props) => {
  const isInitialized = useRef(false);

  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    // 1. Preload critical assets immediately
    preloadCriticalInitialAssets();

    // 2. Schedule non-essential chunk deferral when browser is idle
    const cancelPrefetch = scheduleIdleChunkPrefetch(props);

    return () => {
      cancelPrefetch();
    };
  }, [props]);

  return null;
};

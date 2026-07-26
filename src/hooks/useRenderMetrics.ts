import { useEffect, useRef } from 'react';

interface RenderMetricsOptions {
  componentName: string;
  enabled?: boolean;
}

/**
 * Hook that records real-time component render metrics (render count, render duration, time since mount)
 * and transmits them to the secure logging endpoint during development.
 */
export function useRenderMetrics({ componentName, enabled = import.meta.env.DEV }: RenderMetricsOptions) {
  const renderCount = useRef(0);
  const mountTime = useRef<number>(typeof window !== 'undefined' && window.performance ? performance.now() : 0);
  const lastRenderTime = useRef<number>(typeof window !== 'undefined' && window.performance ? performance.now() : 0);

  renderCount.current += 1;

  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || !window.performance) return;

    const now = performance.now();
    const duration = now - lastRenderTime.current;

    const payload = {
      componentName,
      renderCount: renderCount.current,
      timeSinceMount: Math.round(now - mountTime.current),
      renderDuration: Math.round(duration),
      timestamp: new Date().toISOString(),
    };

    // Transmit to secure logging endpoint
    fetch('/api/metrics/render', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {
      // Silently catch network failures in dev logging
    });

    lastRenderTime.current = performance.now();
  });
}

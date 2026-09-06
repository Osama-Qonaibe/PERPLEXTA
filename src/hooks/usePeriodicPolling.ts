import { useEffect, useRef, useState, useCallback } from 'react';

export interface UsePeriodicPollingOptions<T> {
  /**
   * Interval in milliseconds between polling cycles.
   * @default 30000 (30 seconds)
   */
  intervalMs?: number;

  /**
   * Whether polling is enabled.
   * @default true
   */
  enabled?: boolean;

  /**
   * Whether to execute an initial fetch immediately on mount/activation or key change.
   * @default true
   */
  immediate?: boolean;

  /**
   * Unique key or ID representing the entity being polled (e.g., reelId).
   * When this key changes, any previous in-flight request is immediately aborted.
   */
  key?: string | number | null;

  /**
   * Whether to automatically trigger a sync when tab visibility changes back to visible.
   * @default true
   */
  runOnVisibilityChange?: boolean;

  /**
   * Optional callback triggered on every successful sync.
   */
  onSuccess?: (data: T) => void;

  /**
   * Optional callback triggered on network or parsing error.
   */
  onError?: (error: Error) => void;

  /**
   * Optional callback triggered when initial loading state changes.
   */
  onLoadingChange?: (isLoading: boolean) => void;
}

export interface UsePeriodicPollingReturn<T> {
  /** The most recent payload returned by the fetcher */
  data: T | null;
  /** True during the initial fetch cycle for the current key */
  isLoading: boolean;
  /** True during subsequent background sync cycles */
  isSyncing: boolean;
  /** Any error encountered during the last fetch attempt */
  error: Error | null;
  /** Timestamp of the last successful synchronization */
  lastSyncedAt: Date | null;
  /** Force an immediate deduplicated refresh */
  refetch: () => Promise<T | null>;
  /** Cancel any active in-flight request */
  cancel: () => void;
}

/**
 * Shared custom hook for resilient periodic background polling with:
 * - Single AbortController instance per polling cycle/key with instant cancellation on key change/unmount
 * - In-flight deduplication to eliminate duplicate concurrent network requests
 * - Page Visibility API integration (pauses when hidden, auto-refreshes when visible)
 * - Granular loading, syncing, and error state tracking
 */
export function usePeriodicPolling<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  options: UsePeriodicPollingOptions<T> = {}
): UsePeriodicPollingReturn<T> {
  const {
    intervalMs = 30000,
    enabled = true,
    immediate = true,
    key,
    runOnVisibilityChange = true,
    onSuccess,
    onError,
    onLoadingChange
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(Boolean(immediate && enabled));
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  // Single active AbortController instance per key/cycle
  const abortControllerRef = useRef<AbortController | null>(null);
  const isInFlightRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(true);
  const hasInitializedRef = useRef<boolean>(false);
  const currentKeyRef = useRef<string | number | null | undefined>(key);

  // Keep latest callbacks in refs to prevent stale closures without re-triggering timers
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const onLoadingChangeRef = useRef(onLoadingChange);
  onLoadingChangeRef.current = onLoadingChange;

  // Gracefully terminate in-flight network requests
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    isInFlightRef.current = false;
    if (isMountedRef.current) {
      setIsLoading(false);
      setIsSyncing(false);
      onLoadingChangeRef.current?.(false);
    }
  }, []);

  const executePoll = useCallback(
    async (isManualTrigger = false): Promise<T | null> => {
      if (!enabled || !isMountedRef.current) {
        return null;
      }

      // Prevent duplicate concurrent requests for the same entity
      if (isInFlightRef.current) {
        return null;
      }

      // Check document visibility unless manually invoked
      if (!isManualTrigger && typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return null;
      }

      // Gracefully terminate any previous in-flight request before launching new one
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;
      isInFlightRef.current = true;

      const isInitial = !hasInitializedRef.current;
      if (isMountedRef.current) {
        if (isInitial) {
          setIsLoading(true);
          onLoadingChangeRef.current?.(true);
        } else {
          setIsSyncing(true);
        }
      }

      try {
        const result = await fetcherRef.current(controller.signal);

        if (!controller.signal.aborted && isMountedRef.current) {
          hasInitializedRef.current = true;
          setData(result);
          setError(null);
          setLastSyncedAt(new Date());
          onSuccessRef.current?.(result);
          return result;
        }
        return null;
      } catch (err: any) {
        // Silently discard aborted navigation requests
        if (err?.name === 'AbortError' || controller.signal.aborted) {
          return null;
        }

        const normalizedError = err instanceof Error ? err : new Error(String(err || 'Polling request failed'));
        if (isMountedRef.current) {
          setError(normalizedError);
          onErrorRef.current?.(normalizedError);
        }
        return null;
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
          isInFlightRef.current = false;
        }
        if (isMountedRef.current) {
          setIsLoading(false);
          setIsSyncing(false);
          onLoadingChangeRef.current?.(false);
        }
      }
    },
    [enabled]
  );

  const refetch = useCallback(() => {
    return executePoll(true);
  }, [executePoll]);

  // Main lifecycle effect handling key changes, timers, and automatic cleanup
  useEffect(() => {
    isMountedRef.current = true;
    currentKeyRef.current = key;
    hasInitializedRef.current = false;

    // Immediately cancel any previous in-flight request when key or enabled changes
    cancel();

    if (!enabled) {
      return;
    }

    if (immediate) {
      executePoll();
    }

    // Setup periodic polling timer
    const timerId = setInterval(() => {
      executePoll();
    }, Math.max(intervalMs, 1000));

    // Page Visibility listener
    const handleVisibilityChange = () => {
      if (runOnVisibilityChange && document.visibilityState === 'visible') {
        executePoll();
      }
    };

    if (runOnVisibilityChange && typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      clearInterval(timerId);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
      cancel();
    };
  }, [key, enabled, intervalMs, immediate, runOnVisibilityChange, executePoll, cancel]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      cancel();
    };
  }, [cancel]);

  return {
    data,
    isLoading,
    isSyncing,
    error,
    lastSyncedAt,
    refetch,
    cancel
  };
}

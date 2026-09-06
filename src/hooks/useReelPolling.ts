import { useCallback, useRef } from 'react';
import { usePeriodicPolling } from './usePeriodicPolling';

export interface ReelReactionCountsResponse {
  ad_id: number;
  likes_count: number;
  comments_count?: number;
  shares_count?: number;
  impressions_count?: number;
  user_has_liked?: boolean;
  user_reaction?: string | null;
  user_has_saved?: boolean;
  reactions_breakdown?: Record<string, number>;
}

export interface ReelSyncPayload {
  counts: ReelReactionCountsResponse | null;
  comments: any[] | null;
}

export interface UseReelPollingOptions {
  /** The target reel ID to poll for */
  reelId: number | null | undefined;
  /** Optional auth token for user-specific like/save statuses */
  token?: string | null;
  /** Polling interval in ms (default: 30000 = 30s) */
  intervalMs?: number;
  /** Whether polling is active (default: true when reelId is valid) */
  enabled?: boolean;
  /** Callback fired when reaction counts/state are updated */
  onCountsUpdate?: (counts: ReelReactionCountsResponse) => void;
  /** Callback fired when comments are refreshed */
  onCommentsUpdate?: (comments: any[]) => void;
  /** Callback fired with the combined synchronization payload */
  onSync?: (payload: ReelSyncPayload) => void;
  /** Callback fired when loading state changes */
  onLoadingChange?: (isLoading: boolean) => void;
}

/**
 * Shared custom hook for Reel reaction counts and comments synchronization.
 * Features:
 * - Single AbortController instance per reel ID to gracefully terminate previous network requests during rapid user navigation
 * - Unified 30-second periodic background sync
 * - Complete duplicate network request prevention
 * - Automatic cleanup and error resilience
 */
export function useReelPolling({
  reelId,
  token,
  intervalMs = 30000,
  enabled = true,
  onCountsUpdate,
  onCommentsUpdate,
  onSync,
  onLoadingChange
}: UseReelPollingOptions) {
  const onCountsUpdateRef = useRef(onCountsUpdate);
  onCountsUpdateRef.current = onCountsUpdate;

  const onCommentsUpdateRef = useRef(onCommentsUpdate);
  onCommentsUpdateRef.current = onCommentsUpdate;

  const onSyncRef = useRef(onSync);
  onSyncRef.current = onSync;

  const onLoadingChangeRef = useRef(onLoadingChange);
  onLoadingChangeRef.current = onLoadingChange;

  const isEnabled = enabled && typeof reelId === 'number' && reelId > 0;

  const fetcher = useCallback(
    async (signal: AbortSignal): Promise<ReelSyncPayload> => {
      if (!reelId) {
        return { counts: null, comments: null };
      }

      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

      // Execute both counts and comments requests with the single AbortSignal tied to this reelId
      const [countsRes, commRes] = await Promise.all([
        fetch(`/api/bulletin/ads/${reelId}/reaction-counts`, {
          headers,
          signal
        }),
        fetch(`/api/bulletin/ads/${reelId}/comments`, {
          headers,
          signal
        })
      ]);

      let counts: ReelReactionCountsResponse | null = null;
      let comments: any[] | null = null;

      if (countsRes.ok) {
        const data = await countsRes.json();
        if (data?.success) {
          counts = data;
        }
      }

      if (commRes.ok) {
        const commData = await commRes.json();
        if (commData?.success && Array.isArray(commData.comments)) {
          comments = commData.comments;
        }
      }

      return { counts, comments };
    },
    [reelId, token]
  );

  return usePeriodicPolling<ReelSyncPayload>(fetcher, {
    key: isEnabled ? reelId : null,
    intervalMs,
    enabled: isEnabled,
    immediate: true,
    runOnVisibilityChange: true,
    onSuccess: (payload) => {
      if (payload.counts) {
        onCountsUpdateRef.current?.(payload.counts);
      }
      if (payload.comments) {
        onCommentsUpdateRef.current?.(payload.comments);
      }
      onSyncRef.current?.(payload);
    },
    onLoadingChange: (loading) => {
      onLoadingChangeRef.current?.(loading);
    }
  });
}

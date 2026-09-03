import { useState, useEffect, useCallback } from 'react';
import {
  videoPlayerStateService,
  VideoPlayerSessionState
} from '../services/videoPlayerStateService';

export interface UseVideoPlayerSessionOptions {
  url?: string;
  autoPlay?: boolean;
  muted?: boolean;
}

export function useVideoPlayerSession(
  mediaId: string,
  options: UseVideoPlayerSessionOptions = {}
) {
  const { url = '', autoPlay = false, muted } = options;

  const [session, setSession] = useState<VideoPlayerSessionState>(() =>
    videoPlayerStateService.getSession(mediaId, url, autoPlay, muted)
  );

  useEffect(() => {
    // Sync initial session config
    const current = videoPlayerStateService.getSession(mediaId, url, autoPlay, muted);
    setSession(current);

    // Subscribe to state updates
    const unsubscribe = videoPlayerStateService.subscribe(mediaId, (updatedState) => {
      setSession(updatedState);
    });

    return () => {
      unsubscribe();
    };
  }, [mediaId, url, autoPlay, muted]);

  const update = useCallback(
    (partial: Partial<VideoPlayerSessionState>) => {
      return videoPlayerStateService.updateSession(mediaId, partial);
    },
    [mediaId]
  );

  const attachVideoElement = useCallback(
    (videoEl: HTMLVideoElement | null) => {
      if (videoEl) {
        videoPlayerStateService.attachVideoElement(mediaId, videoEl);
      }
    },
    [mediaId]
  );

  const detachVideoElement = useCallback(
    (videoEl: HTMLVideoElement | null) => {
      if (videoEl) {
        videoPlayerStateService.detachVideoElement(mediaId, videoEl);
      }
    },
    [mediaId]
  );

  const play = useCallback(
    (videoEl?: HTMLVideoElement | null) => {
      videoPlayerStateService.play(mediaId, videoEl);
    },
    [mediaId]
  );

  const pause = useCallback(
    (videoEl?: HTMLVideoElement | null) => {
      videoPlayerStateService.pause(mediaId, videoEl);
    },
    [mediaId]
  );

  const togglePlay = useCallback(
    (videoEl?: HTMLVideoElement | null) => {
      videoPlayerStateService.togglePlay(mediaId, videoEl);
    },
    [mediaId]
  );

  const setVolume = useCallback(
    (vol: number) => {
      videoPlayerStateService.setVolume(mediaId, vol);
    },
    [mediaId]
  );

  const setMuted = useCallback(
    (isMuted: boolean) => {
      videoPlayerStateService.setMuted(mediaId, isMuted);
    },
    [mediaId]
  );

  const seek = useCallback(
    (time: number, videoEl?: HTMLVideoElement | null) => {
      videoPlayerStateService.seek(mediaId, time, videoEl);
    },
    [mediaId]
  );

  const setFullscreenTransition = useCallback(
    (isTransitioning: boolean, durationMs: number = 800) => {
      videoPlayerStateService.setFullscreenTransition(mediaId, isTransitioning, durationMs);
    },
    [mediaId]
  );

  return {
    session,
    update,
    attachVideoElement,
    detachVideoElement,
    play,
    pause,
    togglePlay,
    setVolume,
    setMuted,
    seek,
    setFullscreenTransition
  };
}

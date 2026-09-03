/**
 * Perplexta Video Player State Service
 * Unified, single-source-of-truth state management service for video player components.
 * Encapsulates playback status (playing/paused), volume, current time, duration, muted, and fullscreen states.
 * Guarantees state re-attachment upon DOM reparenting / entering fullscreen, preventing pause conflicts or state resets.
 */

import {
  getGlobalMuteState,
  getGlobalVolumeState,
  setGlobalMuteState,
  setGlobalVolumeState,
  notifyMediaPlaying,
  stopAllMedia
} from '../utils/mediaCoordinator';

export interface VideoPlayerSessionState {
  mediaId: string;
  url: string;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isFullscreen: boolean;
  isTransitioningFullscreen: boolean;
  lastUpdated: number;
}

type Listener = (state: VideoPlayerSessionState) => void;

class VideoPlayerStateService {
  private sessions = new Map<string, VideoPlayerSessionState>();
  private listeners = new Map<string, Set<Listener>>();
  private attachedElements = new Map<string, HTMLVideoElement>();

  /**
   * Get existing session state or initialize a default session state for mediaId
   */
  public getSession(
    mediaId: string,
    initialUrl: string = '',
    autoPlay: boolean = false,
    initialMuted?: boolean
  ): VideoPlayerSessionState {
    let session = this.sessions.get(mediaId);
    if (!session) {
      const defaultMuted = initialMuted !== undefined ? initialMuted : getGlobalMuteState();
      const defaultVol = getGlobalVolumeState();
      session = {
        mediaId,
        url: initialUrl,
        isPlaying: autoPlay,
        currentTime: 0,
        duration: 0,
        volume: defaultVol,
        isMuted: defaultMuted,
        isFullscreen: false,
        isTransitioningFullscreen: false,
        lastUpdated: Date.now()
      };
      this.sessions.set(mediaId, session);
    } else if (initialUrl && session.url !== initialUrl) {
      // If URL changed for the same player id, reset playback progress
      session = {
        ...session,
        url: initialUrl,
        currentTime: 0,
        duration: 0,
        isPlaying: autoPlay,
        lastUpdated: Date.now()
      };
      this.sessions.set(mediaId, session);
    }
    return session;
  }

  /**
   * Update state fields for a session and notify listeners
   */
  public updateSession(mediaId: string, partial: Partial<VideoPlayerSessionState>): VideoPlayerSessionState {
    const current = this.getSession(mediaId);
    const updated: VideoPlayerSessionState = {
      ...current,
      ...partial,
      lastUpdated: Date.now()
    };
    this.sessions.set(mediaId, updated);
    this.notify(mediaId, updated);
    return updated;
  }

  /**
   * Subscribe to state updates for a media session
   */
  public subscribe(mediaId: string, listener: Listener): () => void {
    if (!this.listeners.has(mediaId)) {
      this.listeners.set(mediaId, new Set());
    }
    this.listeners.get(mediaId)!.add(listener);

    return () => {
      const set = this.listeners.get(mediaId);
      if (set) {
        set.delete(listener);
        if (set.size === 0) {
          this.listeners.delete(mediaId);
        }
      }
    };
  }

  private notify(mediaId: string, state: VideoPlayerSessionState): void {
    const set = this.listeners.get(mediaId);
    if (set) {
      set.forEach((fn) => {
        try {
          fn(state);
        } catch (err) {
          console.error('[VideoPlayerStateService] Listener error:', err);
        }
      });
    }
  }

  /**
   * Re-attach video element to existing session state when component mounts or re-renders,
   * restoring currentTime, volume, muted, and resuming playback if session was playing.
   */
  public attachVideoElement(mediaId: string, videoEl: HTMLVideoElement): void {
    if (!videoEl) return;

    this.attachedElements.set(mediaId, videoEl);
    const session = this.getSession(mediaId);

    try {
      videoEl.volume = session.volume;
      videoEl.muted = session.isMuted;

      // Restore currentTime if video duration is available or when metadata loads
      if (session.currentTime > 0 && Math.abs(videoEl.currentTime - session.currentTime) > 0.5) {
        if (!isNaN(videoEl.duration) && videoEl.duration > 0) {
          videoEl.currentTime = session.currentTime;
        } else {
          const onMeta = () => {
            try {
              if (session.currentTime > 0) {
                videoEl.currentTime = session.currentTime;
              }
            } catch (_) {}
            videoEl.removeEventListener('loadedmetadata', onMeta);
          };
          videoEl.addEventListener('loadedmetadata', onMeta);
        }
      }

      // If session state indicates video was playing, restore playback cleanly
      if (session.isPlaying && videoEl.paused) {
        notifyMediaPlaying(mediaId);
        videoEl
          .play()
          .then(() => {
            this.updateSession(mediaId, { isPlaying: true });
          })
          .catch(() => {
            // Autoplay fallback: retry muted if unmuted play was restricted
            if (!videoEl.muted) {
              videoEl.muted = true;
              this.updateSession(mediaId, { isMuted: true });
              videoEl
                .play()
                .then(() => {
                  this.updateSession(mediaId, { isPlaying: true });
                })
                .catch(() => {
                  this.updateSession(mediaId, { isPlaying: false });
                });
            } else {
              this.updateSession(mediaId, { isPlaying: false });
            }
          });
      }
    } catch (err) {
      console.warn('[VideoPlayerStateService] attachVideoElement warning:', err);
    }
  }

  /**
   * Unattach video element and save current playback state prior to DOM unmounting or fullscreen transitions
   */
  public detachVideoElement(mediaId: string, videoEl: HTMLVideoElement): void {
    if (!videoEl) return;
    if (this.attachedElements.get(mediaId) === videoEl) {
      this.attachedElements.delete(mediaId);
    }

    try {
      const isPlaying = !videoEl.paused && !videoEl.ended;
      const currentTime = !isNaN(videoEl.currentTime) ? videoEl.currentTime : 0;
      const duration = !isNaN(videoEl.duration) ? videoEl.duration : 0;

      this.updateSession(mediaId, {
        isPlaying,
        currentTime,
        duration,
        volume: videoEl.volume,
        isMuted: videoEl.muted
      });
    } catch (_) {}
  }

  /**
   * Set flag indicating fullscreen enter/exit transition is in progress.
   * During this window, transient pause events from browser DOM re-parenting are ignored.
   */
  public setFullscreenTransition(mediaId: string, isTransitioning: boolean, durationMs: number = 800): void {
    this.updateSession(mediaId, { isTransitioningFullscreen: isTransitioning });
    if (isTransitioning && durationMs > 0) {
      setTimeout(() => {
        const current = this.sessions.get(mediaId);
        if (current && current.isTransitioningFullscreen) {
          this.updateSession(mediaId, { isTransitioningFullscreen: false });
        }
      }, durationMs);
    }
  }

  /**
   * Set volume globally and for session
   */
  public setVolume(mediaId: string, volume: number): void {
    const clamped = Math.max(0, Math.min(1, volume));
    setGlobalVolumeState(clamped);
    const isMuted = clamped === 0;
    this.updateSession(mediaId, {
      volume: clamped,
      isMuted
    });
    if (clamped === 0) {
      setGlobalMuteState(true);
    } else {
      setGlobalMuteState(false);
    }

    const videoEl = this.attachedElements.get(mediaId);
    if (videoEl) {
      try {
        videoEl.volume = clamped;
        videoEl.muted = isMuted;
      } catch (_) {}
    }
  }

  /**
   * Set mute globally and for session
   */
  public setMuted(mediaId: string, isMuted: boolean): void {
    setGlobalMuteState(isMuted);
    const session = this.getSession(mediaId);
    let newVol = session.volume;
    if (!isMuted && session.volume === 0) {
      newVol = 1.0;
      setGlobalVolumeState(1.0);
    }
    this.updateSession(mediaId, {
      isMuted,
      volume: newVol
    });

    const videoEl = this.attachedElements.get(mediaId);
    if (videoEl) {
      try {
        videoEl.muted = isMuted;
        videoEl.volume = newVol;
      } catch (_) {}
    }
  }

  /**
   * Play media session
   */
  public play(mediaId: string, videoEl?: HTMLVideoElement | null): void {
    const el = videoEl || this.attachedElements.get(mediaId);
    notifyMediaPlaying(mediaId);
    this.updateSession(mediaId, { isPlaying: true });

    if (el) {
      const session = this.getSession(mediaId);
      try {
        el.muted = session.isMuted;
        el.volume = session.volume;
      } catch (_) {}

      el.play()
        .then(() => {
          this.updateSession(mediaId, { isPlaying: true });
        })
        .catch((err) => {
          console.warn('[VideoPlayerStateService] play error:', err);
          if (!el.muted) {
            el.muted = true;
            el.play()
              .then(() => {
                this.updateSession(mediaId, { isPlaying: true });
              })
              .catch(() => {
                this.updateSession(mediaId, { isPlaying: false });
              });
          } else {
            this.updateSession(mediaId, { isPlaying: false });
          }
        });
    }
  }

  /**
   * Pause media session
   */
  public pause(mediaId: string, videoEl?: HTMLVideoElement | null): void {
    this.updateSession(mediaId, { isPlaying: false });
    if (videoEl && !videoEl.paused) {
      try {
        videoEl.pause();
      } catch (_) {}
    }
  }

  /**
   * Toggle Play/Pause for session
   */
  public togglePlay(mediaId: string, videoEl?: HTMLVideoElement | null): void {
    const session = this.getSession(mediaId);
    if (session.isPlaying) {
      this.pause(mediaId, videoEl);
    } else {
      this.play(mediaId, videoEl);
    }
  }

  /**
   * Seek video session to time
   */
  public seek(mediaId: string, time: number, videoEl?: HTMLVideoElement | null): void {
    this.updateSession(mediaId, { currentTime: time });
    if (videoEl) {
      try {
        videoEl.currentTime = time;
      } catch (_) {}
    }
  }
}

export const videoPlayerStateService = new VideoPlayerStateService();

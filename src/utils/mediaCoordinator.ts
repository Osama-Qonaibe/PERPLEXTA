import { secureStorage } from "@/lib/storage";
/**
 * Perplexta Media Coordinator
 * Central authority to manage single-stream audio/video playback across the entire platform.
 * Prevents overlapping audio, ghost background videos, and double-playing streams.
 */

export interface StopMediaEventDetail {
  exceptMediaId?: string;
}

export interface MediaPlayingEventDetail {
  mediaId: string;
}

export interface MediaMuteEventDetail {
  muted: boolean;
}

export interface MediaVolumeEventDetail {
  volume: number;
}

const MEDIA_MUTED_STORAGE_KEY = 'perplexta_media_muted';
const MEDIA_VOLUME_STORAGE_KEY = 'perplexta_media_volume';

let currentMuteState: boolean = false; // Unmuted by default for rich audio experience
let currentVolumeState: number = 1.0; // Max volume by default

// Initialize cached mute and volume states from localStorage if available
if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
  try {
    const savedMuted = secureStorage.getSync(MEDIA_MUTED_STORAGE_KEY);
    if (savedMuted !== null) {
      currentMuteState = savedMuted === 'true';
    } else {
      currentMuteState = false; // Default to unmuted/sound-active
    }
    const savedVol = secureStorage.getSync(MEDIA_VOLUME_STORAGE_KEY);
    if (savedVol !== null) {
      const parsedVol = parseFloat(savedVol);
      if (!isNaN(parsedVol) && parsedVol >= 0 && parsedVol <= 1) {
        currentVolumeState = parsedVol;
      }
    }
  } catch (_) {}
}

/**
 * Get the currently persisted global volume state (0.0 to 1.0, default is 1.0).
 */
export function getGlobalVolumeState(): number {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      const saved = secureStorage.getSync(MEDIA_VOLUME_STORAGE_KEY);
      if (saved !== null) {
        const parsed = parseFloat(saved);
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
          currentVolumeState = parsed;
          return currentVolumeState;
        }
      }
    } catch (_) {}
  }
  return currentVolumeState !== undefined ? currentVolumeState : 1.0;
}

/**
 * Set and persist global volume state across all media players and views on the page.
 */
export function setGlobalVolumeState(volume: number, syncToBackend: boolean = true): void {
  const clamped = Math.max(0, Math.min(1, volume));
  currentVolumeState = clamped;

  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      secureStorage.set(MEDIA_VOLUME_STORAGE_KEY, String(currentVolumeState));
    } catch (_) {}
  }

  if (typeof document !== 'undefined') {
    try {
      const allMedia = document.querySelectorAll<HTMLMediaElement>('video, audio');
      allMedia.forEach((element) => {
        try {
          element.volume = currentVolumeState;
        } catch (_) {}
      });
    } catch (_) {}
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent<MediaVolumeEventDetail>('perplexta:volume_change', {
        detail: { volume: currentVolumeState }
      })
    );
  }
}

/**
 * Get the currently persisted global mute state (default is false / unmuted).
 */
export function getGlobalMuteState(): boolean {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      const saved = secureStorage.getSync(MEDIA_MUTED_STORAGE_KEY);
      if (saved !== null) {
        currentMuteState = saved === 'true';
        return currentMuteState;
      }
    } catch (_) {}
  }
  return currentMuteState !== undefined ? currentMuteState : false;
}

/**
 * Set and persist global mute state across all media players and views on the page.
 * Synchronizes immediately across all HTML5 video/audio elements and propagates to DB.
 */
export function setGlobalMuteState(muted: boolean, syncToBackend: boolean = true): void {
  currentMuteState = !!muted;

  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      secureStorage.set(MEDIA_MUTED_STORAGE_KEY, String(currentMuteState));
      secureStorage.set('reels_muted', String(currentMuteState));
    } catch (_) {}
  }

  // Immediately apply new mute state to all active HTML5 media elements in the DOM across all clips.
  // To comply with strict browser autoplay/unmuted policies, only the active video/audio stream
  // is unmuted, while all non-active background or ambient videos must remain muted.
  if (typeof document !== 'undefined') {
    try {
      const allMedia = document.querySelectorAll<HTMLMediaElement>('video, audio');
      allMedia.forEach((element) => {
        try {
          const elId = element.dataset.mediaId || element.id;
          const isThisActive = currentActiveMediaId && elId === currentActiveMediaId;
          const isPlaying = !element.paused;

          if (currentMuteState) {
            element.muted = true;
          } else {
            const isAmbient = element.classList.contains('ambient-video');
            if (isAmbient) {
              element.muted = true;
            } else if (isThisActive || isPlaying) {
              element.muted = false;
            } else {
              element.muted = true;
            }
          }
        } catch (_) {}
      });
    } catch (_) {}
  }

  // Dispatch synchronized event across window
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent<MediaMuteEventDetail>('perplexta:mute_change', {
        detail: { muted: currentMuteState }
      })
    );
  }

  // Persist preference to user profile in database if user is authenticated
  if (syncToBackend && typeof window !== 'undefined') {
    try {
      const token = secureStorage.getSync('auth_token') || secureStorage.getSync('token');
      if (token && token !== 'null' && token !== 'undefined') {
        fetch('/api/users/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ media_muted: currentMuteState })
        }).catch(() => {});
      }
    } catch (_) {}
  }
}

// Global registry to track currently active playing media
let currentActiveMediaId: string | null = null;

export function getActiveMediaId(): string | null {
  return currentActiveMediaId;
}

/**
 * Forcefully pause all HTML5 <video> and <audio> elements across the DOM
 * except optionally the specified mediaId.
 */
export function stopAllMedia(exceptMediaId?: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  try {
    currentActiveMediaId = exceptMediaId || null;

    const allMedia = document.querySelectorAll<HTMLMediaElement>('video:not(.ambient-video), audio');
    allMedia.forEach((element) => {
      const elId = element.dataset.mediaId || element.id;
      if (exceptMediaId && elId === exceptMediaId) {
        return;
      }
      try {
        if (!element.paused) {
          element.pause();
        }
      } catch (_) {}
    });

    window.dispatchEvent(
      new CustomEvent<StopMediaEventDetail>('perplexta:stop_all_media', {
        detail: { exceptMediaId }
      })
    );
  } catch (err) {
    console.debug('[Media Coordinator] error in stopAllMedia:', err);
  }
}

/**
 * Notify the application that a specific media element has started playback.
 * Automatically halts any other currently playing video/audio streams.
 */
export function notifyMediaPlaying(mediaId: string): void {
  if (typeof window === 'undefined') return;

  try {
    currentActiveMediaId = mediaId;
    stopAllMedia(mediaId);

    window.dispatchEvent(
      new CustomEvent<MediaPlayingEventDetail>('perplexta:media_playing', {
        detail: { mediaId }
      })
    );
  } catch (err) {
    console.debug('[Media Coordinator] error in notifyMediaPlaying:', err);
  }
}

// Background Playback Prevention: Pause all media when browser tab is inactive or minimized
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopAllMedia();
    }
  });
}

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

/**
 * Forcefully pause all HTML5 <video> and <audio> elements across the DOM
 * except optionally the specified mediaId.
 */
export function stopAllMedia(exceptMediaId?: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  try {
    const allMedia = document.querySelectorAll<HTMLMediaElement>('video, audio');
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
    console.debug('Media coordinator error in stopAllMedia:', err);
  }
}

/**
 * Notify the application that a specific media element has started playback.
 * Automatically halts any other currently playing video/audio streams.
 */
export function notifyMediaPlaying(mediaId: string): void {
  if (typeof window === 'undefined') return;

  try {
    stopAllMedia(mediaId);

    window.dispatchEvent(
      new CustomEvent<MediaPlayingEventDetail>('perplexta:media_playing', {
        detail: { mediaId }
      })
    );
  } catch (err) {
    console.debug('Media coordinator error in notifyMediaPlaying:', err);
  }
}

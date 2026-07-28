/**
 * Media Utilities & Video Processor for Perplexta Ads Platform
 * Handles video URL parsing, embed conversion, aspect ratio calculation, and video thumbnail extraction.
 */

export interface VideoInfo {
  type: 'youtube' | 'vimeo' | 'tiktok' | 'direct' | 'unknown';
  embedUrl?: string;
  directUrl?: string;
}

/**
 * Parses any video URL (YouTube, Vimeo, TikTok, direct mp4/webm/mov/mkv/avi dataURL)
 */
export function parseVideoUrl(url: string): VideoInfo {
  if (!url || typeof url !== 'string') {
    return { type: 'unknown' };
  }

  let cleanUrl = url.trim();
  if (!cleanUrl.startsWith('http') && !cleanUrl.startsWith('blob:') && !cleanUrl.startsWith('data:') && !cleanUrl.startsWith('/')) {
    cleanUrl = `/uploads/${cleanUrl}`;
  }

  // YouTube check
  const ytMatch = cleanUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  if (ytMatch && ytMatch[1]) {
    return {
      type: 'youtube',
      embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&mute=1&enablejsapi=1&rel=0`,
      directUrl: cleanUrl,
    };
  }

  // Vimeo check
  const vimeoMatch = cleanUrl.match(/(?:vimeo\.com\/)(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|)(\d+)/);
  if (vimeoMatch && vimeoMatch[3]) {
    return {
      type: 'vimeo',
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[3]}?autoplay=1&muted=1`,
      directUrl: cleanUrl,
    };
  }

  // TikTok check
  if (cleanUrl.includes('tiktok.com')) {
    const ttMatch = cleanUrl.match(/video\/(\d+)/);
    if (ttMatch && ttMatch[1]) {
      return {
        type: 'tiktok',
        embedUrl: `https://www.tiktok.com/embed/v2/${ttMatch[1]}`,
        directUrl: cleanUrl,
      };
    }
  }

  // Direct video or Data URL
  return {
    type: 'direct',
    directUrl: cleanUrl,
  };
}

/**
 * Gets Tailwind aspect ratio class based on ad format or aspect ratio string
 */
export function getAspectRatioClass(aspectRatio?: string, adFormat?: string): string {
  if (aspectRatio === '9:16' || adFormat === 'reel' || adFormat === 'story') {
    return 'aspect-[9/16]';
  }
  if (aspectRatio === '16:9' || adFormat === 'video' || adFormat === 'instream') {
    return 'aspect-video';
  }
  if (aspectRatio === '1:1' || adFormat === 'sidebar') {
    return 'aspect-square';
  }
  if (aspectRatio === '4:5') {
    return 'aspect-[4/5]';
  }
  if (aspectRatio === '21:9' || adFormat === 'banner' || adFormat === 'header_banner') {
    return 'aspect-[21/9]';
  }
  return 'aspect-video'; // default fallback
}

/**
 * Gets recommended dimensions description for given ad format / aspect ratio
 */
export function getRecommendedDimensions(adFormat?: string, isRtl: boolean = true): string {
  switch (adFormat) {
    case 'reel':
    case 'story':
      return isRtl
        ? 'القياس المعائي المعتمد: 1080x1920 بكسل (نسبة 9:16) - شاشة كاملة عمودية للموبايل والقصص'
        : 'Approved Platform Ratio: 1080x1920 px (9:16 ratio) - Fullscreen vertical for Reels & Stories';
    case 'feed':
      return isRtl
        ? 'القياس المعائي المعتمد: 1080x1080 بكسل (1:1) أو 1080x1350 (4:5) - منشورات التغذية الرئيسية'
        : 'Approved Platform Ratio: 1080x1080 px (1:1) or 1080x1350 (4:5) - Newsfeed posts';
    case 'video':
    case 'instream':
      return isRtl
        ? 'القياس المعائي المعتمد: 1920x1080 بكسل (16:9) - شاشة عريضة للفيديوهات الاحترافية'
        : 'Approved Platform Ratio: 1920x1080 px (16:9 widescreen) - In-stream video ads';
    case 'sidebar':
      return isRtl
        ? 'القياس المعائي المعتمد: 600x600 بكسل (1:1) - الشريط الجانبي والقوائم الفرعية'
        : 'Approved Platform Ratio: 600x600 px (1:1 square) - Sidebar & widgets';
    case 'banner':
    case 'header_banner':
      return isRtl
        ? 'القياس المعائي المعتمد: 1920x480 بكسل (21:9 أو 4:1) - بانر عالي التحديد للمقدمة'
        : 'Approved Platform Ratio: 1920x480 px (21:9 ultra-wide) - Header banner unit';
    default:
      return isRtl
        ? 'القياس المعتمد: متكيف تلقائياً مع كافة الأبعاد مع دعم القص والتركيز البصري'
        : 'Platform Ratio: Fully dynamic adaptive sizing with auto-cropping and focus control';
  }
}

/**
 * Extract a JPEG frame thumbnail from a video file or DataURL
 */
export async function extractVideoThumbnail(videoSource: File | string, seekTimeSeconds = 1.0): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;

    let objectUrl = '';
    if (typeof videoSource === 'string') {
      video.src = videoSource;
    } else {
      objectUrl = URL.createObjectURL(videoSource);
      video.src = objectUrl;
    }

    video.addEventListener('loadedmetadata', () => {
      // Seek to either specified time or 20% of duration
      video.currentTime = Math.min(seekTimeSeconds, video.duration / 2 || 0.5);
    });

    video.addEventListener('seeked', () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 360;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          if (objectUrl) URL.revokeObjectURL(objectUrl);
          resolve(dataUrl);
          return;
        }
      } catch (err) {
        console.warn('Canvas thumbnail capture failed:', err);
      }
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      resolve('');
    });

    video.addEventListener('error', (e) => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      resolve('');
    });

    video.load();
  });
}

/**
 * Normalizes any image or video URL (handling relative filenames, uploads, http, blob, data, comma-separated lists)
 */
export function getMediaUrl(url?: string | null): string {
  if (!url || typeof url !== 'string') return '';
  let clean = url.trim();
  if (!clean) return '';

  // If comma-separated list of URLs (e.g. gallery images), extract the first URL
  if (clean.includes(',')) {
    clean = clean.split(',')[0].trim();
  }

  if (
    clean.startsWith('http://') ||
    clean.startsWith('https://') ||
    clean.startsWith('blob:') ||
    clean.startsWith('data:')
  ) {
    return clean;
  }
  if (clean.startsWith('/')) {
    return clean;
  }
  if (clean.startsWith('uploads/')) {
    return `/${clean}`;
  }
  return `/uploads/${clean}`;
}


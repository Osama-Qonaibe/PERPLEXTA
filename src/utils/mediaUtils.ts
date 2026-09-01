import { getAssetUrl, BUILD_VERSION } from './assetManager';

export interface VideoInfo {
  type: 'youtube' | 'vimeo' | 'tiktok' | 'direct' | 'unknown';
  embedUrl?: string;
  directUrl?: string;
}

export function parseVideoUrl(url: string): VideoInfo {
  if (!url || typeof url !== 'string') {
    return { type: 'unknown' };
  }

  let cleanUrl = url.trim();
  if (!cleanUrl.startsWith('http') && !cleanUrl.startsWith('blob:') && !cleanUrl.startsWith('data:') && !cleanUrl.startsWith('/')) {
    cleanUrl = `/uploads/${cleanUrl}`;
  }

  const ytMatch = cleanUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  if (ytMatch && ytMatch[1]) {
    return {
      type: 'youtube',
      embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&mute=1&enablejsapi=1&rel=0`,
      directUrl: cleanUrl,
    };
  }

  const vimeoMatch = cleanUrl.match(/(?:vimeo\.com\/)(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|)(\d+)/);
  if (vimeoMatch && vimeoMatch[3]) {
    return {
      type: 'vimeo',
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[3]}?autoplay=1&muted=1`,
      directUrl: cleanUrl,
    };
  }

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

  return {
    type: 'direct',
    directUrl: cleanUrl,
  };
}

export function getAspectRatioClass(aspectRatio?: string, adFormat?: string): string {
  if (aspectRatio === '9:16' || adFormat === 'reel' || adFormat === 'story') {
    return 'aspect-[9/16]';
  }
  if (aspectRatio === '1:1' || adFormat === 'sidebar' || adFormat === 'post' || adFormat === 'square') {
    return 'aspect-square';
  }
  if (aspectRatio === '4:5' || adFormat === 'portrait') {
    return 'aspect-[4/5]';
  }
  if (aspectRatio === '21:9' || adFormat === 'banner' || adFormat === 'header_banner') {
    return 'aspect-[21/9]';
  }
  if (aspectRatio === '16:9' || adFormat === 'video' || adFormat === 'instream') {
    return 'aspect-video';
  }
  return 'aspect-video';
}

export function getRecommendedDimensions(adFormat?: string, isRtl = true): string {
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

export async function extractVideoThumbnail(videoSource: File | string, seekTimeSeconds = 1.0): Promise<string> {
  return new Promise((resolve) => {
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
      video.currentTime = Math.min(seekTimeSeconds, (video.duration ? video.duration / 2 : 0.5));
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
      } catch {
        // Fallthrough
      }
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      resolve('');
    });

    video.addEventListener('error', () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      resolve('');
    });

    video.load();
  });
}

export function getMediaUrl(url?: string | null): string {
  if (!url || typeof url !== 'string') return '';
  let clean = url.trim();
  if (!clean) return '';

  clean = clean.replace(/^https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0)(?::\d+)?/i, '');

  if (
    clean.startsWith('http://') ||
    clean.startsWith('https://') ||
    clean.startsWith('blob:') ||
    clean.startsWith('data:')
  ) {
    if (clean.startsWith('data:')) return clean;
    if (clean.includes(',')) {
      clean = clean.split(',')[0].trim();
    }
    return clean;
  }

  if (clean.includes(',')) {
    clean = clean.split(',')[0].trim();
  }

  // Strip query parameters to avoid duplicate stacking (?v=...&t=...&t=...)
  const [cleanPathOnly] = clean.split('?');

  let resolved = '';
  const uploadsMatch = cleanPathOnly.match(/(?:https?:\/\/[^\/]+)?\/?(?:uploads\/)+(.+)$/i);
  if (uploadsMatch && uploadsMatch[1]) {
    resolved = `/uploads/${uploadsMatch[1].replace(/^\/+/, '')}`;
  } else if (cleanPathOnly.startsWith('uploads/')) {
    resolved = `/${cleanPathOnly}`;
  } else if (cleanPathOnly.startsWith('/')) {
    resolved = cleanPathOnly;
  } else {
    resolved = `/uploads/${cleanPathOnly}`;
  }

  let finalUrl = getAssetUrl(resolved);
  if (finalUrl.includes('/uploads/')) {
    if (!finalUrl.includes('t=')) {
      const sep = finalUrl.includes('?') ? '&' : '?';
      finalUrl = `${finalUrl}${sep}t=${BUILD_VERSION}`;
    }
  }
  return finalUrl;
}

export function getMediaFallback(type: 'image' | 'video' | 'avatar' = 'image'): string {
  switch (type) {
    case 'avatar':
      return 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80';
    case 'video':
      return 'https://assets.mixkit.co/videos/preview/mixkit-woman-running-on-the-beach-at-sunset-40008-large.mp4';
    case 'image':
    default:
      return 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1080&q=80';
  }
}

export interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  mimeType?: string;
  format?: 'sidebar' | 'feed' | 'story' | 'reel' | 'video' | string;
}

export interface CompressResult {
  file: File;
  width: number;
  height: number;
  originalSize: number;
  compressedSize: number;
}

export async function compressAndResizeImage(
  file: File,
  options: CompressOptions = {}
): Promise<CompressResult> {
  if (!file.type.startsWith('image/') || file.type.includes('svg') || file.type.includes('gif')) {
    return {
      file,
      width: 0,
      height: 0,
      originalSize: file.size,
      compressedSize: file.size
    };
  }

  let targetMaxWidth = options.maxWidth || 800;
  let targetMaxHeight = options.maxHeight || 800;

  if (options.format === 'sidebar') {
    targetMaxWidth = 600;
    targetMaxHeight = 600;
  } else if (options.format === 'feed') {
    targetMaxWidth = 1080;
    targetMaxHeight = 1080;
  } else if (options.format === 'story' || options.format === 'reel') {
    targetMaxWidth = 1080;
    targetMaxHeight = 1920;
  }

  const quality = options.quality ?? 0.88;
  const targetMimeType = options.mimeType || 'image/webp';

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;

        if (width > targetMaxWidth || height > targetMaxHeight) {
          const ratio = Math.min(targetMaxWidth / width, targetMaxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ file, width: img.width, height: img.height, originalSize: file.size, compressedSize: file.size });
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve({ file, width: img.width, height: img.height, originalSize: file.size, compressedSize: file.size });
              return;
            }

            const ext = targetMimeType === 'image/webp' ? '.webp' : '.jpg';
            const cleanBaseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
            const newFilename = `${cleanBaseName}_optimized${ext}`;

            const optimizedFile = new File([blob], newFilename, {
              type: targetMimeType,
              lastModified: Date.now()
            });

            resolve({
              file: optimizedFile,
              width,
              height,
              originalSize: file.size,
              compressedSize: optimizedFile.size
            });
          },
          targetMimeType,
          quality
        );
      };
      img.onerror = () => {
        resolve({ file, width: 0, height: 0, originalSize: file.size, compressedSize: file.size });
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      resolve({ file, width: 0, height: 0, originalSize: file.size, compressedSize: file.size });
    };
    reader.readAsDataURL(file);
  });
}

import React, { useState, useEffect, useRef } from 'react';
import { resolveImageUrl } from './imageResolver';

export const STANDARD_NOTIFICATION_SIZE = 48;
export const STANDARD_NOTIFICATION_QUALITY = 0.88;
export const STANDARD_NOTIFICATION_MIME = 'image/webp';
export const STANDARD_AD_THUMBNAIL_SIZE = 80;

const imageCache = new Map<string, string>();
const MAX_CACHE_SIZE = 120;

function isWebPSupported(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const uri = canvas.toDataURL('image/webp');
    return uri.startsWith('data:image/webp');
  } catch {
    return false;
  }
}

let cachedWebPSupport: boolean | null = null;
function checkWebPSupport(): boolean {
  if (cachedWebPSupport === null) {
    cachedWebPSupport = isWebPSupported();
  }
  return cachedWebPSupport;
}

export interface ImageResizeOptions {
  width?: number;
  height?: number;
  quality?: number;
  mimeType?: string;
  fit?: 'cover' | 'contain' | 'center';
  background?: string;
}

function loadImage(source: string | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    let objectUrl = '';
    if (source instanceof Blob) {
      objectUrl = URL.createObjectURL(source);
      img.src = objectUrl;
    } else {
      img.src = source;
    }

    img.onload = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      resolve(img);
    };

    img.onerror = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image source'));
    };
  });
}

export async function resizeImageToStandard(
  source: string | Blob | null | undefined,
  options: ImageResizeOptions = {}
): Promise<string> {
  if (!source) return '';

  const targetWidth = options.width || STANDARD_NOTIFICATION_SIZE;
  const targetHeight = options.height || STANDARD_NOTIFICATION_SIZE;
  const quality = options.quality ?? STANDARD_NOTIFICATION_QUALITY;
  const fit = options.fit || 'cover';
  const background = options.background || 'transparent';

  const supportsWebP = checkWebPSupport();
  const targetMime = supportsWebP ? (options.mimeType || STANDARD_NOTIFICATION_MIME) : 'image/png';

  const cacheKey = typeof source === 'string' 
    ? `${source}_${targetWidth}x${targetHeight}_${quality}_${fit}_${targetMime}`
    : `blob_${targetWidth}x${targetHeight}_${quality}_${fit}_${targetMime}`;

  if (typeof source === 'string' && imageCache.has(cacheKey)) {
    return imageCache.get(cacheKey)!;
  }

  try {
    const resolvedSource = typeof source === 'string' ? resolveImageUrl(source) : source;
    const img = await loadImage(resolvedSource);

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) {
      return typeof source === 'string' ? source : '';
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    if (background !== 'transparent') {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, targetWidth, targetHeight);
    } else {
      ctx.clearRect(0, 0, targetWidth, targetHeight);
    }

    const { naturalWidth: nw, naturalHeight: nh } = img;
    let drawX = 0;
    let drawY = 0;
    let drawW = targetWidth;
    let drawH = targetHeight;

    if (fit === 'cover') {
      const scale = Math.max(targetWidth / (nw || 1), targetHeight / (nh || 1));
      drawW = nw * scale;
      drawH = nh * scale;
      drawX = (targetWidth - drawW) / 2;
      drawY = (targetHeight - drawH) / 2;
    } else if (fit === 'contain') {
      const scale = Math.min(targetWidth / (nw || 1), targetHeight / (nh || 1));
      drawW = nw * scale;
      drawH = nh * scale;
      drawX = (targetWidth - drawW) / 2;
      drawY = (targetHeight - drawH) / 2;
    }

    ctx.drawImage(img, drawX, drawY, drawW, drawH);
    const outputDataUrl = canvas.toDataURL(targetMime, quality);

    if (typeof source === 'string') {
      if (imageCache.size >= MAX_CACHE_SIZE) {
        const firstKey = imageCache.keys().next().value;
        if (firstKey) imageCache.delete(firstKey);
      }
      imageCache.set(cacheKey, outputDataUrl);
    }

    return outputDataUrl;
  } catch {
    return typeof source === 'string' ? source : '';
  }
}

export async function standardizeNotificationIcon(
  source: string | Blob | null | undefined,
  quality = STANDARD_NOTIFICATION_QUALITY
): Promise<string> {
  return resizeImageToStandard(source, {
    width: STANDARD_NOTIFICATION_SIZE,
    height: STANDARD_NOTIFICATION_SIZE,
    quality,
    fit: 'contain',
    mimeType: STANDARD_NOTIFICATION_MIME
  });
}

export function getCachedNotificationIcon(source: string): string | null {
  if (!source) return null;
  const cacheKeyPrefix = `${source}_${STANDARD_NOTIFICATION_SIZE}x${STANDARD_NOTIFICATION_SIZE}`;
  for (const [key, value] of imageCache.entries()) {
    if (key.startsWith(cacheKeyPrefix)) {
      return value;
    }
  }
  return null;
}

export function useStandardizedNotificationIcon(
  source?: string | null,
  options?: ImageResizeOptions
): { iconSrc: string | null; isProcessing: boolean; error: boolean } {
  const [iconSrc, setIconSrc] = useState<string | null>(() => {
    if (!source) return null;
    return getCachedNotificationIcon(source) || source;
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    if (!source) {
      setIconSrc(null);
      setIsProcessing(false);
      setError(false);
      return;
    }

    const cached = getCachedNotificationIcon(source);
    if (cached) {
      setIconSrc(cached);
      setIsProcessing(false);
      setError(false);
      return;
    }

    setIsProcessing(true);
    setError(false);

    standardizeNotificationIcon(source, options?.quality)
      .then((processed) => {
        if (isMounted.current) {
          setIconSrc(processed || source);
          setIsProcessing(false);
        }
      })
      .catch(() => {
        if (isMounted.current) {
          setIconSrc(source);
          setIsProcessing(false);
          setError(true);
        }
      });

    return () => {
      isMounted.current = false;
    };
  }, [source, options?.quality, options?.fit]);

  return { iconSrc, isProcessing, error };
}

export interface NotificationIconProps {
  src?: string | null;
  alt?: string;
  className?: string;
  size?: number;
  fallbackIcon?: React.ReactNode;
}

export const NotificationIconRenderer: React.FC<NotificationIconProps> = ({
  src,
  alt = 'Notification Icon',
  className = '',
  size = STANDARD_NOTIFICATION_SIZE,
  fallbackIcon = null
}) => {
  const { iconSrc, isProcessing } = useStandardizedNotificationIcon(src);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  if (!src || hasError) {
    return fallbackIcon ? <>{fallbackIcon}</> : null;
  }

  return (
    <div 
      className={`relative inline-flex items-center justify-center overflow-hidden shrink-0 ${className}`}
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      {iconSrc ? (
        <img
          src={iconSrc}
          alt={alt}
          width={size}
          height={size}
          loading="eager"
          decoding="async"
          onError={() => setHasError(true)}
          className={`w-full h-full object-contain transition-opacity duration-150 ${isProcessing ? 'opacity-70' : 'opacity-100'}`}
        />
      ) : (
        fallbackIcon
      )}
    </div>
  );
};

export const AdThumbnailRenderer: React.FC<{
  src?: string | null;
  alt?: string;
  className?: string;
  width?: number;
  height?: number;
  fit?: 'cover' | 'contain';
  fallback?: React.ReactNode;
}> = ({
  src,
  alt = 'Ad Media',
  className = '',
  width = 80,
  height = 80,
  fit = 'cover',
  fallback = null
}) => {
  const [renderedSrc, setRenderedSrc] = useState<string | null>(src || null);
  const [isReady, setIsReady] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);

  useEffect(() => {
    let active = true;
    if (!src) {
      setRenderedSrc(null);
      setHasFailed(false);
      return;
    }

    const resolved = resolveImageUrl(src);
    resizeImageToStandard(resolved, {
      width,
      height,
      fit,
      quality: 0.86,
      mimeType: 'image/webp'
    })
      .then((processed) => {
        if (active) {
          setRenderedSrc(processed || resolved);
          setIsReady(true);
        }
      })
      .catch(() => {
        if (active) {
          setRenderedSrc(resolved);
          setIsReady(true);
        }
      });

    return () => {
      active = false;
    };
  }, [src, width, height, fit]);

  if (!src || hasFailed) {
    return fallback ? <>{fallback}</> : null;
  }

  return (
    <div
      className={`relative overflow-hidden shrink-0 ${className}`}
      style={{ width: `${width}px`, height: `${height}px` }}
    >
      {renderedSrc ? (
        <img
          src={renderedSrc}
          alt={alt}
          width={width}
          height={height}
          loading="lazy"
          decoding="async"
          onError={() => setHasFailed(true)}
          className={`w-full h-full ${fit === 'contain' ? 'object-contain' : 'object-cover'} transition-opacity duration-150 ${isReady ? 'opacity-100' : 'opacity-80'}`}
        />
      ) : (
        fallback
      )}
    </div>
  );
};

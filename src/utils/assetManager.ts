/**
 * Client-Side Asset Management Utility
 * Handles dynamic favicon injection, Apple Touch icon sync, and client-side canvas preview generation.
 */

export const BUILD_VERSION = '1.0.0';

export function getAssetUrl(path: string): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:') || path.startsWith('blob:')) {
    return path;
  }
  return path.startsWith('/') ? path : `/${path}`;
}

export interface ClientAssetPreview {
  id: string;
  name: string;
  category: 'favicon' | 'apple' | 'pwa' | 'tile';
  width: number;
  height: number;
  purpose?: 'any' | 'maskable';
  description: string;
  previewUrl: string;
  isMaskable?: boolean;
}

/**
 * Standard asset definitions for client inspection and previews
 */
export const CLIENT_ASSET_SPECS = [
  {
    id: 'favicon-16',
    name: 'Favicon (16×16)',
    filename: 'favicon-16x16.png',
    width: 16,
    height: 16,
    category: 'favicon' as const,
    description: 'Browser tab icon for low-resolution displays'
  },
  {
    id: 'favicon-32',
    name: 'Favicon (32×32)',
    filename: 'favicon-32x32.png',
    width: 32,
    height: 32,
    category: 'favicon' as const,
    description: 'Standard desktop browser tab & bookmarks icon'
  },
  {
    id: 'favicon-48',
    name: 'Favicon (48×48)',
    filename: 'favicon-48x48.png',
    width: 48,
    height: 48,
    category: 'favicon' as const,
    description: 'High-DPI Retina browser tab icon'
  },
  {
    id: 'favicon-ico',
    name: 'Favicon (.ICO Container)',
    filename: 'favicon.ico',
    width: 48,
    height: 48,
    category: 'favicon' as const,
    description: 'Multi-resolution ICO for Windows taskbar & legacy browsers'
  },
  {
    id: 'apple-touch-icon',
    name: 'Apple Touch Icon (180×180)',
    filename: 'apple-touch-icon.png',
    width: 180,
    height: 180,
    category: 'apple' as const,
    description: 'iOS Safari home screen icon for iPhone and iPad'
  },
  {
    id: 'pwa-192',
    name: 'PWA Icon (192×192 Any)',
    filename: 'pwa-192x192.png',
    width: 192,
    height: 192,
    purpose: 'any' as const,
    category: 'pwa' as const,
    description: 'Standard Android home screen & PWA launcher icon'
  },
  {
    id: 'pwa-512',
    name: 'PWA Splash Icon (512×512 Any)',
    filename: 'pwa-512x512.png',
    width: 512,
    height: 512,
    purpose: 'any' as const,
    category: 'pwa' as const,
    description: 'High-resolution PWA installer & splash screen icon'
  },
  {
    id: 'pwa-maskable-192',
    name: 'PWA Maskable (192×192 Safe-Zone)',
    filename: 'pwa-maskable-192x192.png',
    width: 192,
    height: 192,
    purpose: 'maskable' as const,
    category: 'pwa' as const,
    isMaskable: true,
    description: 'Android adaptive icon with 15% safe-zone margin (circle/squircle crop safe)'
  },
  {
    id: 'pwa-maskable-512',
    name: 'PWA Maskable (512×512 Safe-Zone)',
    filename: 'pwa-maskable-512x512.png',
    width: 512,
    height: 512,
    purpose: 'maskable' as const,
    category: 'pwa' as const,
    isMaskable: true,
    description: 'High-resolution Android adaptive icon with 15% safe-zone margin'
  }
];

/**
 * Dynamically updates all head icon link tags in real-time.
 */
export function updateDocumentHeadIcons(iconSource?: string | null): void {
  if (typeof document === 'undefined') return;

  const resolvedHref = iconSource || '/favicon.ico';
  const timestamp = Date.now();

  // 1. Favicon links
  const faviconTypes = [
    { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico', sizes: 'any' },
    { rel: 'icon', type: 'image/png', href: '/favicon-32x32.png', sizes: '32x32' },
    { rel: 'icon', type: 'image/png', href: '/favicon-16x16.png', sizes: '16x16' },
    { rel: 'apple-touch-icon', type: 'image/png', href: '/apple-touch-icon.png', sizes: '180x180' }
  ];

  faviconTypes.forEach(def => {
    let el = document.querySelector(`link[rel="${def.rel}"][sizes="${def.sizes || ''}"]`) as HTMLLinkElement;
    if (!el && def.sizes === 'any') {
      el = document.querySelector(`link[rel="${def.rel}"]:not([sizes])`) as HTMLLinkElement;
    }

    if (!el) {
      el = document.createElement('link');
      el.rel = def.rel;
      if (def.type) el.type = def.type;
      if (def.sizes && def.sizes !== 'any') el.sizes = def.sizes;
      document.head.appendChild(el);
    }

    // If a custom base64 or resolved data URI is given, apply directly; otherwise use the standard route with cache busting
    if (resolvedHref.startsWith('data:')) {
      el.href = resolvedHref;
    } else {
      el.href = `${def.href}?v=${timestamp}`;
    }
  });

  // 2. Ensure manifest link exists
  let manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
  if (!manifestLink) {
    manifestLink = document.createElement('link');
    manifestLink.rel = 'manifest';
    manifestLink.href = '/manifest.json';
    document.head.appendChild(manifestLink);
  }
}

/**
 * Generates client-side previews for all icon sizes from an image source (URL, Base64, or File).
 */
export async function generateClientIconPreviews(source: string | File): Promise<ClientAssetPreview[]> {
  if (typeof window === 'undefined') return [];

  let imgSrc = '';
  if (source instanceof File) {
    imgSrc = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(source);
    });
  } else {
    imgSrc = source;
  }

  const img = new Image();
  img.crossOrigin = 'anonymous';
  
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Failed to load image on client canvas'));
    img.src = imgSrc;
  });

  const previews: ClientAssetPreview[] = [];

  for (const spec of CLIENT_ASSET_SPECS) {
    const canvas = document.createElement('canvas');
    canvas.width = spec.width;
    canvas.height = spec.height;
    const ctx = canvas.getContext('2d');

    if (!ctx) continue;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    if (spec.isMaskable) {
      // Draw background
      ctx.fillStyle = '#181715';
      ctx.fillRect(0, 0, spec.width, spec.height);

      // Safe zone calculation: 15% margin on each side (70% inner size)
      const padding = spec.width * 0.15;
      const innerSize = spec.width * 0.70;
      
      // Calculate aspect-preserving fit inside safe zone
      const imgAspect = img.width / img.height;
      let drawW = innerSize;
      let drawH = innerSize;

      if (imgAspect > 1) {
        drawH = innerSize / imgAspect;
      } else {
        drawW = innerSize * imgAspect;
      }

      const drawX = padding + (innerSize - drawW) / 2;
      const drawY = padding + (innerSize - drawH) / 2;

      ctx.drawImage(img, drawX, drawY, drawW, drawH);
    } else {
      // Clear transparent
      ctx.clearRect(0, 0, spec.width, spec.height);

      const imgAspect = img.width / img.height;
      let drawW = spec.width;
      let drawH = spec.height;

      if (imgAspect > 1) {
        drawH = spec.width / imgAspect;
      } else {
        drawW = spec.height * imgAspect;
      }

      const drawX = (spec.width - drawW) / 2;
      const drawY = (spec.height - drawH) / 2;

      ctx.drawImage(img, drawX, drawY, drawW, drawH);
    }

    const previewUrl = canvas.toDataURL('image/png');
    previews.push({
      id: spec.id,
      name: spec.name,
      category: spec.category,
      width: spec.width,
      height: spec.height,
      purpose: spec.purpose,
      description: spec.description,
      previewUrl,
      isMaskable: spec.isMaskable
    });
  }

  return previews;
}

import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { resolveImageUrl } from '../utils/imageResolver';

interface RouteSeo {
  route: string;
  og_image_url?: string;
  is_active?: boolean;
}

// Map of high-priority static asset paths for core routes to optimize perceived load speed
const STATIC_PRIORITY_IMAGES: Record<string, string[]> = {
  '/chat': [
    '/app-assets/icon.png',
    '/app-assets/pwa-192x192.png'
  ],
  '/subscription': [
    '/app-assets/og-image.png'
  ],
  '/rewards': [
    '/app-assets/og-image.png'
  ],
  '/about': [
    '/app-assets/og-image.png'
  ],
  '/discover': [
    '/app-assets/og-image.png'
  ],
  '/marketplace': [
    '/app-assets/pwa-192x192.png'
  ]
};

export const PriorityImagePreloader: React.FC = () => {
  const location = useLocation();
  const { siteSettings, user } = useAppContext();
  const [dbRouteSeo, setDbRouteSeo] = useState<RouteSeo[]>([]);

  // Fetch SEO configuration from DB to support dynamic preloading of user-defined route media
  useEffect(() => {
    let active = true;
    fetch('/api/seo-routes')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch routes');
        return res.json();
      })
      .then((data) => {
        if (active && Array.isArray(data)) {
          setDbRouteSeo(data);
        }
      })
      .catch((err) => {
        console.log('[PriorityImagePreloader] Dynamic SEO routes info bypassed:', err.message);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const currentPath = location.pathname;
    const preloadedUrls: string[] = [];

    // 1. Resolve site identity/branding images (Always critical for consistent layout on every page)
    if (siteSettings?.logoBase64) {
      preloadedUrls.push(resolveImageUrl(siteSettings.logoBase64, 'general'));
    }
    if (siteSettings?.logoLightBase64) {
      preloadedUrls.push(resolveImageUrl(siteSettings.logoLightBase64, 'general'));
    }

    // 2. Resolve User identity (Avatar) if authenticated
    if (user?.avatar) {
      preloadedUrls.push(user.avatar);
    }

    // 3. Resolve general site-wide default OG / Hero image
    if (siteSettings?.seoImageUrl) {
      preloadedUrls.push(resolveImageUrl(siteSettings.seoImageUrl, 'general'));
    } else {
      preloadedUrls.push('/app-assets/og-image.png');
    }

    // 4. Resolve static route-specific high-priority images
    const staticImages = STATIC_PRIORITY_IMAGES[currentPath];
    if (staticImages) {
      staticImages.forEach((img) => {
        preloadedUrls.push(resolveImageUrl(img, 'general'));
      });
    }

    // 5. Resolve active dynamic route match SEO/Hero images from the database
    const routeMatch = dbRouteSeo.find((r) => r.route === currentPath && r.is_active !== false);
    if (routeMatch?.og_image_url) {
      preloadedUrls.push(resolveImageUrl(routeMatch.og_image_url, 'general'));
    }

    // Filter, sanitize, and unique-key the URLs
    const uniqueUrls = Array.from(
      new Set(
        preloadedUrls
          .filter(Boolean)
          .map((url) => {
            const cleanUrl = url.trim();
            // Ensure proper absolute format if it is a relative root path
            return cleanUrl.startsWith('/') && !cleanUrl.startsWith('//')
              ? `${window.location.origin}${cleanUrl}`
              : cleanUrl;
          })
      )
    );

    // Dynamic insertion of link rel="preload" headers inside <head> to warm up connection/cache
    const linkElements: HTMLLinkElement[] = [];

    uniqueUrls.forEach((url) => {
      try {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = url;
        // Set cross-origin options based on the target URL domain
        if (url.startsWith('http') && !url.includes(window.location.hostname)) {
          link.crossOrigin = 'anonymous';
        }
        document.head.appendChild(link);
        linkElements.push(link);

        // Warm up memory cache programmatically in parallel for instantaneous rendering
        const img = new Image();
        img.src = url;
      } catch (err) {
        console.error('[PriorityImagePreloader] Failed to prefetch url:', url, err);
      }
    });

    console.log(`[PriorityImagePreloader] Successfully preloaded ${linkElements.length} critical assets for path: ${currentPath}`);

    // Cleanup: Remove old preload headers when route changes to avoid inflating DOM size
    return () => {
      linkElements.forEach((link) => {
        try {
          if (link.parentNode) {
            link.parentNode.removeChild(link);
          }
        } catch (e) {
          // Ignored
        }
      });
    };
  }, [location.pathname, siteSettings, user, dbRouteSeo]);

  return null;
};

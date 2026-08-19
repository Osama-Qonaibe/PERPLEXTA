import type { VitePWAOptions } from 'vite-plugin-pwa';

/**
 * PWA & Workbox Service Worker Configuration
 * Defines versioned caching strategies for static assets, images, API routes, and user uploads.
 */
export const pwaConfig: Partial<VitePWAOptions> = {
  strategies: 'generateSW',
  registerType: 'autoUpdate',
  injectRegister: 'script-defer',
  includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'app-assets/*.png'],
  manifest: {
    name: 'Perplexta Platform - Elite AI Orchestration',
    short_name: 'Perplexta',
    description: 'Professional Elite Technical Analysis & AI Orchestration Platform with Dual-Database Architecture.',
    id: '/',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    display_override: ['window-controls-overlay', 'standalone', 'minimal-ui'],
    background_color: '#000000',
    theme_color: '#000000',
    orientation: 'any',
    categories: ['productivity', 'utilities', 'artificial intelligence', 'finance', 'business'],
    icons: [
      {
        src: '/app-assets/pwa-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/app-assets/pwa-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/app-assets/pwa-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/app-assets/pwa-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'New Chat',
        short_name: 'Chat',
        description: 'Start a fresh AI session',
        url: '/',
        icons: [{ src: '/app-assets/pwa-192x192.png', sizes: '192x192' }],
      },
      {
        name: 'Rewards Center',
        short_name: 'Rewards',
        description: 'Manage points & rewards',
        url: '/rewards',
        icons: [{ src: '/app-assets/pwa-192x192.png', sizes: '192x192' }],
      },
    ],
  },
  workbox: {
    cleanupOutdatedCaches: true,
    clientsClaim: true,
    skipWaiting: true,
    navigateFallback: '/index.html',
    navigateFallbackDenylist: [
      /\/api\//i,
      /\/v1\//i,
      /\/uploads\//i,
      /\/socket\.io\//i,
      /\/health$/i,
      /\/\.well-known\//i,
      /\/sw\.js$/i,
      /\/workbox-.*\.js$/i,
      /manifest.*/i,
      /robots\.txt$/i,
      /sitemap\.xml$/i,
    ],
    globPatterns: ['**/*.{js,css,html,ico,png,jpg,jpeg,svg,woff,woff2,json}'],
    globIgnores: [
      '**/uploads/**',
      '**/api/**',
      '**/sw.js',
      '**/workbox-*.js',
      '**/manifest*.json',
    ],
    runtimeCaching: [
      {
        // NetworkFirst strategy for API routes to always ensure dynamic data freshness
        urlPattern: /\/(?:api|v1)\//i,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'perplexta-api-cache-v1',
          networkTimeoutSeconds: 5,
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 24 * 60 * 60, // 24 hours
          },
          cacheableResponse: {
            statuses: [0, 200],
          },
        },
      },
      {
        // NetworkFirst strategy for user uploaded images & attachments to avoid missing files or staleness
        urlPattern: /\/uploads\//i,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'perplexta-uploads-cache-v1',
          expiration: {
            maxEntries: 200,
            maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
          },
          cacheableResponse: {
            statuses: [0, 200],
          },
        },
      },
      {
        // StaleWhileRevalidate strategy for static images
        urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|avif)$/i,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'perplexta-images-cache-v1',
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
          },
          cacheableResponse: {
            statuses: [0, 200],
          },
        },
      },
      {
        // CacheFirst strategy for web fonts
        urlPattern: /\.(?:woff|woff2|eot|ttf|otf)$/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'perplexta-fonts-cache-v1',
          expiration: {
            maxEntries: 20,
            maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
          },
          cacheableResponse: {
            statuses: [0, 200],
          },
        },
      },
    ],
  },
};

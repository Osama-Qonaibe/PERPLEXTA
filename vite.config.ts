import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', 'VITE_');
  return {
    root: process.cwd(),
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: false,
        workbox: {
          skipWaiting: true,
          clientsClaim: true,
          cleanupOutdatedCaches: true,
          globPatterns: ['**/*.{js,css,ico,png,svg,webmanifest,json,woff,woff2}'],
          globIgnores: ['**/index.html', '**/sw.js', '**/registerSW.js'],
          navigateFallback: null,
          navigateFallbackDenylist: [/^\/api/],
          maximumFileSizeToCacheInBytes: 12 * 1024 * 1024,
          runtimeCaching: [
            {
              urlPattern: ({ request }) => request.destination === 'document',
              handler: 'NetworkOnly',
            },
            {
              urlPattern: ({ request, url }) =>
                ['script', 'style', 'font', 'image'].includes(request.destination) ||
                /\.(?:js|css|png|jpg|jpeg|svg|gif|webp|woff|woff2|ttf|eot|ico)$/i.test(url.pathname),
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'core-static-assets',
                expiration: {
                  maxEntries: 120,
                  maxAgeSeconds: 30 * 24 * 60 * 60,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        manifest: {
          name: 'Perplexta Platform',
          short_name: 'Perplexta',
          description: 'A professional elite platform for advanced AI capabilities and technical analysis.',
          theme_color: '#080809',
          background_color: '#080809',
          display: 'standalone',
          display_override: ['standalone', 'minimal-ui'],
          start_url: '/',
          categories: ['productivity', 'finance', 'business', 'utilities'],
          icons: [
            {
              src: 'app-assets/icon.png',
              sizes: '72x72',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'app-assets/icon.png',
              sizes: '96x96',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'app-assets/icon.png',
              sizes: '128x128',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'app-assets/icon.png',
              sizes: '144x144',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'app-assets/icon.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'app-assets/icon.png',
              sizes: '256x256',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'app-assets/icon.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'app-assets/icon.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            }
          ],
          shortcuts: [
            {
              name: 'New Chat',
              short_name: 'New Chat',
              description: 'Start a fresh AI orchestration session',
              url: '/',
              icons: [{ src: 'app-assets/icon.png', sizes: '192x192' }]
            },
            {
              name: 'Rewards Center',
              short_name: 'Rewards',
              description: 'Manage points, loyalty bonuses and verification statuses',
              url: '/rewards',
              icons: [{ src: 'app-assets/icon.png', sizes: '192x192' }]
            },
            {
              name: 'Workspace Settings',
              short_name: 'Settings',
              description: 'Customize your AI models and theme settings',
              url: '/settings',
              icons: [{ src: 'app-assets/icon.png', sizes: '192x192' }]
            }
          ]
        }
      })
    ],
    define: {},
    build: {
    },
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), '.'),
      },
    },
    server: {
      host: '0.0.0.0',
      allowedHosts: ['perplexta.com', 'www.perplexta.com'],
      headers: {
        'Content-Security-Policy': "default-src * 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; script-src * 'self' 'unsafe-inline' 'unsafe-eval' blob:; style-src * 'self' 'unsafe-inline'; img-src * 'self' data: blob:; connect-src * 'self' 'unsafe-inline' 'unsafe-eval' blob:; frame-ancestors * 'self';"
      },
      hmr: false,
    },
    preview: {
      host: '0.0.0.0',
      allowedHosts: ['perplexta.com', 'www.perplexta.com'],
    },
  };
});
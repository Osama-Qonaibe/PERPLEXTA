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
    root: __dirname,
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: false,
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest,json,woff,woff2}'],
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api/],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        },
        manifest: {
          name: 'Perplexta Platform',
          short_name: 'Perplexta',
          description: 'A professional elite platform for advanced AI capabilities and technical analysis.',
          theme_color: '#10b981',
          background_color: '#0f0f11',
          display: 'standalone',
          display_override: ['standalone', 'minimal-ui'],
          start_url: '/',
          categories: ['productivity', 'finance', 'business', 'utilities'],
          icons: [
            {
              src: 'app-assets/icon.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'app-assets/icon.png',
              sizes: '512x512',
              type: 'image/png'
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
      chunkSizeWarningLimit: 2500,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
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

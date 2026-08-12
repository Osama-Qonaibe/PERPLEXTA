import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { pwaConfig } from './vite-pwa-config';

const rootDir = path.resolve(process.cwd());

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, rootDir, 'VITE_');
  return {
    root: rootDir,
    plugins: [
      react(),
      tailwindcss(),
      VitePWA(pwaConfig),
    ],
    define: {},
    build: {
      chunkSizeWarningLimit: 2000,
    },
    resolve: {
      alias: {
        '@': path.resolve(rootDir, 'src'),
        'react': path.resolve(rootDir, 'node_modules/react'),
        'react-dom': path.resolve(rootDir, 'node_modules/react-dom'),
      },
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        'lucide-react',
        'motion',
        '@tanstack/react-query',
        'recharts',
        'd3',
      ],
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
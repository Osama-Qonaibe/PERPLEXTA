import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { pwaConfig } from './vite-pwa-config';

// Safely resolve directory path avoiding ERR_INVALID_ARG_TYPE if import.meta.url is undefined in CJS / bundled contexts
function getRootDir(): string {
  try {
    if (typeof import.meta !== 'undefined' && import.meta && typeof import.meta.url === 'string') {
      return path.dirname(fileURLToPath(import.meta.url));
    }
  } catch {
    // Fallback if import.meta.url cannot be parsed
  }
  return process.cwd();
}

const rootDir = getRootDir();

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
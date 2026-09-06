import 'dotenv/config';
import { createServer } from 'http';

process.on('uncaughtException', (err: any) => {
  if (err?.code === 'EPIPE' || err?.code === 'ECONNRESET' || err?.message?.includes('EPIPE') || err?.message?.includes('ECONNRESET')) {
    console.info('[Process] Handled asynchronous network stream disconnection error gracefully:', err?.message || err);
    return;
  }
  console.error('[Process] Uncaught Exception:', err?.message || err);
  if (err?.stack) console.error(err.stack);
});

process.on('unhandledRejection', (reason: any) => {
  if (reason?.code === 'EPIPE' || reason?.code === 'ECONNRESET' || reason?.message?.includes('EPIPE') || reason?.message?.includes('ECONNRESET')) {
    console.info('[Process] Handled unhandled rejection network disconnection error gracefully:', reason?.message || reason);
    return;
  }
  console.error('[Process] Unhandled Promise Rejection:', reason?.message || reason);
});

import app, { ensureApiPerfLogsTable } from './app.js';
import { initSocket } from './config/socket.js';
import { initializePerplextaPools, synchronizePerplextaPoolsFromRegistry, startConnectionHealthCheck, startPoolSaturationGuardian } from './db/index.js';
import { createServer as createViteServer } from 'vite';
import { runDatabaseMigrations, setIo, verifySchemaIntegrity } from './db/migrations.js';
import { syncSystemTemplates } from './services/email.js';
import { refreshCachedAppName } from './services/system.js';
import { ensureAdsSeedData } from './routes/ads.js';
import { ensureBulletinSeedData } from './routes/bulletin.js';
import { initCronJobs } from './jobs/cron.js';
import { validateRequiredSecrets } from './utils/validateSecrets.js';
import { initUploadsMonitor } from './services/uploadsMonitorService.js';

const PORT = 3000;
const MAX_DB_ATTEMPTS = 3;
const DB_RETRY_DELAY_MS = 4_000;

/**
 * Attempts to initialise all DB pools, run migrations, and warm caches.
 * Returns true on success; on exhaustion logs a warning and returns false
 * so the server can continue in Degraded Mode instead of crashing.
 */
async function initDatabase(): Promise<boolean> {
  for (let attempt = 1; attempt <= MAX_DB_ATTEMPTS; attempt++) {
    try {
      await initializePerplextaPools(
        process.env.DATABASE_URL        || '',
        process.env.LEDGER_DATABASE_URL  || '',
        process.env.EXTERNAL_DATABASE_URL || '',
        process.env.SECURITY_DATABASE_URL || ''
      );
      await runDatabaseMigrations();
      await synchronizePerplextaPoolsFromRegistry();
      await Promise.allSettled([
        syncSystemTemplates(),
        refreshCachedAppName(),
        ensureAdsSeedData(),
        ensureBulletinSeedData(),
        ensureApiPerfLogsTable()
      ]);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[Server] DB init attempt ${attempt}/${MAX_DB_ATTEMPTS} failed: ${msg}`);
      if (attempt < MAX_DB_ATTEMPTS) {
        console.log(`[Server] Retrying in ${DB_RETRY_DELAY_MS / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, DB_RETRY_DELAY_MS));
      }
    }
  }
  console.error('[Server] All DB init attempts exhausted. Entering Degraded Mode.');
  return false;
}

async function startServer() {
  try {
    console.log('[Server] Initializing Perplexta Ecosystem...');

    validateRequiredSecrets();

    if (process.env.NODE_ENV !== 'production') {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'custom',
      });
      app.locals.vite = vite;
      app.use(vite.middlewares);
      console.log('[Server] Vite Middleware integrated (Dev Mode)');
    }

    const httpServer = createServer(app);
    const ioInstance = initSocket(httpServer);

    const shutdown = (signal: string) => {
      console.log(`[Server] ${signal} received — shutting down gracefully...`);
      httpServer.close(() => {
        console.log('[Server] HTTP server closed.');
        process.exit(0);
      });
      setTimeout(() => process.exit(1), 10_000).unref();
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT',  () => shutdown('SIGINT'));

    httpServer.listen(PORT, '0.0.0.0', () => {
      console.log(`[Server] 🚀 Perplexta Engine active on port ${PORT} [READY]`);
    });

    // Run database initialization and secondary services asynchronously
    // so port 3000 is available immediately for health checks and Vite traffic
    initDatabase()
      .then(async (dbReady) => {
        if (dbReady) {
          setIo(ioInstance);
          initCronJobs();
          startConnectionHealthCheck();
          startPoolSaturationGuardian();
          try {
            const { startAutomatedGpuDiscovery } = await import('./services/gpu/gpuDiscoveryService.js');
            startAutomatedGpuDiscovery();
          } catch (gpuDiscErr: any) {
            console.warn('[Server] GPU Discovery initialization warning:', gpuDiscErr.message);
          }
          console.log('[Server] Database initialization completed. Secondary databases synchronized & operational.');
        } else {
          console.log('[Server] Loaded Engine in Degraded Mode (no persistent DB connectivity).');
        }
      })
      .catch((err) => {
        console.error('[Server] Non-fatal error during background database init:', err);
      })
      .finally(() => {
        initUploadsMonitor();
      });
  } catch (err) {
    console.error('[Server] FATAL: Unexpected Application Failure:', err);
    process.exit(1);
  }
}

startServer();

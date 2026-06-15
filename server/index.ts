import 'dotenv/config';
import { createServer } from 'http';
import { app } from './app.js';
import { initSocket } from './config/socket.js';
import { initializePerplextaPools, synchronizePerplextaPoolsFromRegistry } from './db/index.js';
import { createServer as createViteServer } from 'vite';
import { runDatabaseMigrations, setIo } from './db/migrations.js';
import { syncSystemTemplates } from './services/email.js';
import { refreshCachedAppName } from './services/system.js';
import { initCronJobs } from './jobs/cron.js';

const PORT = Number(process.env.PORT) || 3000;
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
      await synchronizePerplextaPoolsFromRegistry();
      await runDatabaseMigrations();
      await syncSystemTemplates();
      await refreshCachedAppName();
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

    // 1. Vite dev middleware (development only)
    if (process.env.NODE_ENV !== 'production') {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
      console.log('[Server] Vite Middleware integrated (Dev Mode)');
    }

    // 2. Open HTTP port immediately so health probes succeed
    const httpServer = createServer(app);
    const ioInstance = initSocket(httpServer);

    httpServer.listen(PORT, '0.0.0.0', () => {
      console.log(`[Server] 🚀 Perplexta Engine active on port ${PORT} [INITIALIZING...]`);
    });

    // 3. Graceful shutdown
    const shutdown = (signal: string) => {
      console.log(`[Server] ${signal} received — shutting down gracefully...`);
      httpServer.close(() => {
        console.log('[Server] HTTP server closed.');
        process.exit(0);
      });
      // Force-exit if connections linger beyond 10 s
      setTimeout(() => process.exit(1), 10_000).unref();
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT',  () => shutdown('SIGINT'));

    // 4. DB init + background jobs
    const dbReady = await initDatabase();
    if (dbReady) {
      setIo(ioInstance);
      initCronJobs();
      console.log('[Server] Database initialization completed. Secondary databases synchronized & operational.');
    } else {
      console.log('[Server] Loaded Engine in Degraded Mode (no persistent DB connectivity).');
    }
  } catch (err) {
    console.error('[Server] FATAL: Unexpected Application Failure:', err);
    process.exit(1);
  }
}

startServer();

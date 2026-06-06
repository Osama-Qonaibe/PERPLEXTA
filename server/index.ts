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

async function startServer() {
  try {
    console.log('[Server] Initializing Perplexta Ecosystem...');
    
    // 1. If in development, setup Vite middlewares first so static asset routes are fully registered before listening
    if (process.env.NODE_ENV !== 'production') {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa'
      });
      app.use(vite.middlewares);
      console.log('[Server] Vite Middleware integrated (Dev Mode)');
    }
    
    // 2. Open httpServer port 3000 and initialize Socket immediately so health probes succeed
    const httpServer = createServer(app);
    const ioInstance = initSocket(httpServer);

    httpServer.listen(PORT, '0.0.0.0', () => {
      console.log(`[Server] 🚀 Perplexta Engine active on port ${PORT} [INITIALIZING...]`);
    });

    // 3. Connect to database pools and execute versioned migrations asynchronously
    let dbReady = false;
    let attempts = 0;
    const maxAttempts = 3;
    while (attempts < maxAttempts && !dbReady) {
      attempts++;
      try {
        await initializePerplextaPools(
          process.env.DATABASE_URL || '',
          process.env.LEDGER_DATABASE_URL || '',
          process.env.EXTERNAL_DATABASE_URL || '',
          process.env.SECURITY_DATABASE_URL || ''
        );
        await synchronizePerplextaPoolsFromRegistry();
        await runDatabaseMigrations();
        await syncSystemTemplates();
        await refreshCachedAppName();
        dbReady = true;
      } catch (dbErr) {
        console.error(`[Server] Database sync attempt ${attempts}/${maxAttempts} failed:`, dbErr instanceof Error ? dbErr.message : dbErr);
        if (attempts < maxAttempts) {
          console.log(`[Server] Retrying database connection in 4 seconds...`);
          await new Promise(resolve => setTimeout(resolve, 4000));
        } else {
          console.error('[Server] All database sync attempts exhausted. Entering Degraded Mode.');
        }
      }
    }

    // 4. Once pool synchronization passes, active background jobs and socket pipelines
    if (dbReady) {
      setIo(ioInstance);
      initCronJobs();
      console.log('[Server] Database initialization completed successfully. Secondary databases synchronized & operational.');
    } else {
      console.log('[Server] Loaded Engine in Degraded Mode (No persistent database connectivity).');
    }
  } catch (err) {
    console.error('[Server] FATAL: Unexpected Application Failure:', err);
    process.exit(1);
  }
}

startServer();

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
    
    let dbReady = false;
    try {
      await initializePerplextaPools(
        process.env.DATABASE_URL || '',
        process.env.LEDGER_DATABASE_URL || '',
        process.env.EXTERNAL_DATABASE_URL || '',
        process.env.SECURITY_DATABASE_URL || ''
      );
      await runDatabaseMigrations();
      await synchronizePerplextaPoolsFromRegistry();
      await syncSystemTemplates();
      await refreshCachedAppName();
      dbReady = true;
    } catch (dbErr) {
      console.error('[Server] WARNING: Database sync failed. Starting in DEGRADED MODE:', dbErr);
    }
    
    if (process.env.NODE_ENV !== 'production') {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa'
      });
      app.use(vite.middlewares);
      console.log('[Server] Vite Middleware integrated (Dev Mode)');
    }
    
    const httpServer = createServer(app);
    const ioInstance = initSocket(httpServer);
    if (dbReady) {
      setIo(ioInstance);
      initCronJobs();
    }

    httpServer.listen(PORT, '0.0.0.0', () => {
      console.log(`[Server] 🚀 Perplexta Engine active on port ${PORT}${!dbReady ? ' [DEGRADED MODE]' : ''}`);
    });
  } catch (err) {
    console.error('[Server] FATAL: Unexpected Application Failure:', err);
    process.exit(1);
  }
}

startServer();

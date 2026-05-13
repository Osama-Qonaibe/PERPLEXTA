import 'dotenv/config';
import { createServer } from 'http';
import { app } from './app.js';
import { initSocket } from './config/socket.js';
import { initializeSovereignPools, synchronizeSovereignPoolsFromRegistry } from './db/index.js';
import { createServer as createViteServer } from 'vite';
import { runDatabaseMigrations, setIo } from './db/migrations.js';
import { syncSystemTemplates } from './services/email.js';
import { refreshCachedAppName } from './services/system.js';
import { initCronJobs } from './jobs/cron.js';

const PORT = 3000;

async function startServer() {
  try {
    console.log('[Server] Initializing Sovereign Ecosystem...');
    
    await initializeSovereignPools(process.env.DATABASE_URL || '', process.env.LEDGER_DATABASE_URL || '');
    await runDatabaseMigrations();
    await synchronizeSovereignPoolsFromRegistry();
    await syncSystemTemplates();
    await refreshCachedAppName();
    
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
    setIo(ioInstance);
    
    initCronJobs();

    httpServer.listen(PORT, '0.0.0.0', () => {
      console.log(`[Server] 🚀 Sovereign Engine active on port ${PORT}`);
    });
  } catch (err) {
    console.error('[Server] Critical Startup Warning (Continuing in Degraded Mode):', err);
    // process.exit(1); // REMOVED to allow recovery via Admin UI
    
    // Ensure server still starts if possible
    try {
      const httpServer = createServer(app);
      const ioInstance = initSocket(httpServer);
      setIo(ioInstance);
      initCronJobs();
      httpServer.listen(PORT, '0.0.0.0', () => {
        console.log(`[Server] 🚀 Sovereign Engine active (DEGRADED MODE) on port ${PORT}`);
      });
    } catch (innerErr) {
      console.error('[Server] FATAL: Could not even start in Degraded Mode:', innerErr);
      process.exit(1);
    }
  }
}

startServer();

import 'dotenv/config';
import { createServer } from 'http';
import { app } from './app.js';
import { initSocket } from './config/socket.js';
import { initializeSovereignPools } from './db/index.js';
import { createServer as createViteServer } from 'vite';
import { runDatabaseMigrations } from './db/migrations.js';
import { syncSystemTemplates } from './services/email.js';
import { refreshCachedAppName } from './services/system.js';
import { initCronJobs } from './jobs/cron.js';

const PORT = 3000;

async function startServer() {
  try {
    console.log('[Server] Initializing Sovereign Ecosystem...');
    
    await initializeSovereignPools(process.env.DATABASE_URL || '', process.env.LEDGER_DATABASE_URL || '');
    await runDatabaseMigrations();
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
    initSocket(httpServer);
    
    initCronJobs();

    httpServer.listen(PORT, '0.0.0.0', () => {
      console.log(`[Server] 🚀 Sovereign Engine active on port ${PORT}`);
    });
  } catch (err) {
    console.error('[Server] FATAL Startup Error:', err);
    process.exit(1);
  }
}

startServer();

import 'dotenv/config';
import dns from 'dns';
try {
  if (dns && typeof dns.setDefaultResultOrder === 'function') {
    dns.setDefaultResultOrder('ipv4first');
  }
} catch (dnsErr) {
  console.warn('[Server] Failed to set DNS result order:', dnsErr);
}
import fs from 'fs';
import path from 'path';
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
    
    const isProductionRun = process.env.NODE_ENV === 'production' || 
                            !fs.existsSync(path.join(process.cwd(), 'src')) ||
                            (process.argv[1] && (process.argv[1].includes('dist/server.cjs') || process.argv[1].includes('dist/server.mjs')));
    
    if (!isProductionRun) {
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

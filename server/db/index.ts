import pkg from 'pg';
const { Pool } = pkg;

// Globally patch Pool.prototype.connect to handle errors on checked-out clients
// and prevent Uncaught Exceptions on unexpected connection drops.
const originalConnect = Pool.prototype.connect as any;
(Pool.prototype as any).connect = function(cb?: any) {
  if (typeof cb === 'function') {
    return originalConnect.call(this, (err: any, client: any, release: any) => {
      if (client && typeof client.on === 'function' && !client._errorListenerAttached) {
        client._errorListenerAttached = true;
        // Prevent unhandled exception if client connection drops while checked out
        client.on('error', (clientErr: any) => {
          const msg = clientErr?.message || String(clientErr);
          if (!/Connection terminated unexpectedly|ECONNRESET|ETIMEDOUT|terminating connection/i.test(msg)) {
            console.warn('[DB Client] Checked-out client connection error:', msg);
          }
        });
      }
      cb(err, client, release);
    });
  }
  
  return originalConnect.call(this).then((client: any) => {
    if (client && typeof client.on === 'function' && !client._errorListenerAttached) {
      client._errorListenerAttached = true;
      // Prevent unhandled exception if client connection drops while checked out
      client.on('error', (clientErr: any) => {
        const msg = clientErr?.message || String(clientErr);
        if (!/Connection terminated unexpectedly|ECONNRESET|ETIMEDOUT|terminating connection/i.test(msg)) {
          console.warn('[DB Client] Checked-out client connection error:', msg);
        }
      });
    }
    return client;
  });
};

import { decrypt } from "../utils/crypto.js";

export let pool: any;
export let ledgerPool: any;
export let externalPool: any;
export let securityPool: any;

export function getDatabasePool(poolName: 'core' | 'ledger' | 'external' | 'security' = 'core') {
  if (poolName === 'ledger') return ledgerPool || pool;
  if (poolName === 'external') return externalPool || pool;
  if (poolName === 'security') return securityPool || pool;
  return pool;
}

let currentCoreUrl     = '';
let currentLedgerUrl   = '';
let currentExternalUrl = '';
let currentSecurityUrl = '';
let currentCoreMax     = 0;
let currentLedgerMax   = 0;
let currentExternalMax = 0;
let currentSecurityMax = 0;
let poolInitPromise: Promise<void> | null = null;
let lastInitUrls = { core: '', ledger: '', external: '', security: '', coreMax: 0, ledgerMax: 0, externalMax: 0, securityMax: 0 };


export function getSslConfig(urlStr?: string) {
  const finalUrl = urlStr || process.env.DATABASE_URL || '';
  if (!finalUrl) {
    if (process.env.NODE_ENV === 'production') {
      console.warn('[DB SSL] No database URL provided in production environment.');
    }
    return undefined;
  }
  try {
    const u = new URL(finalUrl);
    if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') {
      if (process.env.DB_SSL_REQUIRED === 'true' || u.searchParams.get('sslmode') === 'require') {
        return { rejectUnauthorized: false };
      }
      return undefined; // SSL is disabled for localhost
    }
  } catch {
    // Fallback if URL parsing fails
  }
  if (process.env.DB_SSL_REQUIRED === 'false') {
    return undefined;
  }
  return { rejectUnauthorized: false };
}

/** Resolve pool-size defaults from environment variables — single source of truth. */
function getPoolSizesFromEnv(): { coreMax: number; ledgerMax: number; externalMax: number; securityMax: number } {
  const defaultBase = process.env.NODE_ENV === 'production' ? 10 : 20;
  const base = Number(process.env.DB_MAX_CONNECTIONS) || defaultBase;
  return {
    coreMax:     Number(process.env.DB_CORE_MAX_POOL_SIZE     || process.env.DB_CORE_MAX_CONNECTIONS)     || base,
    ledgerMax:   Number(process.env.DB_LEDGER_MAX_POOL_SIZE   || process.env.DB_LEDGER_MAX_CONNECTIONS)   || base,
    externalMax: Number(process.env.DB_EXTERNAL_MAX_POOL_SIZE || process.env.DB_EXTERNAL_MAX_CONNECTIONS) || base,
    securityMax: Number(process.env.DB_SECURITY_MAX_POOL_SIZE || process.env.DB_SECURITY_MAX_CONNECTIONS) || base,
  };
}

function redactUrl(url: string): string {
  try {
    const u = new URL(url);
    u.password = '****';
    return u.toString();
  } catch {
    return 'invalid-url';
  }
}

function validateDatabaseUrl(url: any, name: string) {
  if (!url || typeof url !== 'string') throw new Error(`[DB] ${name} environment variable is missing or not a string.`);
  if (!/^postgres(ql)?:\/\//.test(url)) throw new Error(`[DB] Invalid ${name} format. Expected a valid postgresql:// connection string.`);
  try {
    const u = new URL(url);
    if (!u.hostname) throw new Error(`Missing hostname in ${name}`);
  } catch (err: any) {
    throw new Error(`[DB] ${name} is not a valid URL: ${err.message}`);
  }
}

/** Normalize database URL to ensure sslmode=verify-full and strip unsupported params */
export function normalizeDatabaseUrl(url: string): string {
  if (!url) return url;
  try {
    const u = new URL(url);
    
    // Many cloud providers (Supabase, Neon) require SSL but fail on verify-full without proper certs.
    // So we use sslmode=require for remote hosts unless explicitly disabled.
    if (u.hostname !== 'localhost' && u.hostname !== '127.0.0.1') {
      if (process.env.DB_SSL_REQUIRED !== 'false') {
        u.searchParams.set('sslmode', 'require');
      }
    } else {
       // For localhost, allow user to force require if their local setup demands it
       if (process.env.DB_SSL_REQUIRED === 'true') {
         u.searchParams.set('sslmode', 'require');
       } else {
         u.searchParams.delete('sslmode');
       }
    }
    
    u.searchParams.delete('channel_binding');
    return u.toString();
  } catch {
    return url;
  }
}

export function getBasePoolConfig(max: number, connectionTimeoutMillis = 15000, urlStr?: string) {
  return {
    ssl: getSslConfig(urlStr),
    idleTimeoutMillis: 60000,
    connectionTimeoutMillis,
    max,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
  };
}

function patchPoolQuery(p: any) {
  if (!p || p._queryPatched) return p;
  const originalQuery = p.query.bind(p);
  p.query = async function(text: any, params: any) {
    const maxRetries = 3;
    let delay = 1000;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await originalQuery(text, params);
      } catch (err: any) {
        const msg = err?.message || String(err);
        const isTransient = /Connection terminated unexpectedly|ECONNRESET|ETIMEDOUT|terminating connection|closed|SSL|too many connections|connection slots reserved|remaining connection slots reserved|timeout/i.test(msg);
        if (isTransient && attempt < maxRetries) {
          const jitter = Math.floor(Math.random() * 300);
          console.warn(`[DB] Transient connection error ("${msg}"). Retrying query (attempt ${attempt}/${maxRetries}) in ${delay + jitter}ms...`);
          await new Promise(r => setTimeout(r, delay + jitter));
          delay *= 2;
          continue;
        }
        throw err;
      }
    }
  };
  p._queryPatched = true;
  return p;
}

export function createInternalPool(connectionString: string, max = 1, connectionTimeoutMillis = 15000) {
  const safeConnStr = typeof connectionString === 'string' ? connectionString : String(connectionString || '');
  const p = new Pool({
    connectionString: safeConnStr,
    ...getBasePoolConfig(max, connectionTimeoutMillis, safeConnStr),
  });
  p.on('error', (e: any) => {
    console.error('[DB] Idle internal client error:', e?.message || e);
  });
  return patchPoolQuery(p);
}

export function getLedgerPool() { return ledgerPool || pool; }
export function getExternalPool() { return externalPool || pool; }
export function getSecurityPool() { return securityPool || pool; }


export async function initializePerplextaPools(
  coreUrl: string,
  ledgerUrl: string,
  externalUrl?: string,
  securityUrl?: string,
  coreMaxOverride?: number,
  ledgerMaxOverride?: number,
  externalMaxOverride?: number,
  securityMaxOverride?: number,
): Promise<void> {
  const finalLedgerUrl   = ledgerUrl   || coreUrl;
  const finalExternalUrl = externalUrl || coreUrl;
  const finalSecurityUrl = securityUrl || coreUrl;

  const envSizes = getPoolSizesFromEnv();
  const finalCoreMax     = coreMaxOverride     || envSizes.coreMax;
  const finalLedgerMax   = ledgerMaxOverride   || envSizes.ledgerMax;
  const finalExternalMax = externalMaxOverride || envSizes.externalMax;
  const finalSecurityMax = securityMaxOverride || envSizes.securityMax;

  if (
    pool &&
    currentCoreUrl     === coreUrl           &&
    currentLedgerUrl   === finalLedgerUrl    &&
    currentExternalUrl === finalExternalUrl  &&
    currentSecurityUrl === finalSecurityUrl  &&
    currentCoreMax     === finalCoreMax      &&
    currentLedgerMax   === finalLedgerMax    &&
    currentExternalMax === finalExternalMax  &&
    currentSecurityMax === finalSecurityMax
  ) {
    console.log('[DB] Pools already initialized with matching configuration. Skipping.');
    return;
  }

  if (
    poolInitPromise &&
    lastInitUrls.core        === coreUrl           &&
    lastInitUrls.ledger      === finalLedgerUrl    &&
    lastInitUrls.external    === finalExternalUrl  &&
    lastInitUrls.security    === finalSecurityUrl  &&
    lastInitUrls.coreMax     === finalCoreMax      &&
    lastInitUrls.ledgerMax   === finalLedgerMax    &&
    lastInitUrls.externalMax === finalExternalMax  &&
    lastInitUrls.securityMax === finalSecurityMax
  ) {
    console.log('[DB] Identical pool initialization already in progress. Re-using active promise.');
    return poolInitPromise;
  }

  lastInitUrls = {
    core: coreUrl, ledger: finalLedgerUrl, external: finalExternalUrl, security: finalSecurityUrl,
    coreMax: finalCoreMax, ledgerMax: finalLedgerMax, externalMax: finalExternalMax, securityMax: finalSecurityMax,
  };

  poolInitPromise = (async () => {
    console.log('[DB] Initializing Perplexta Pools...');
    if (coreUrl) console.log(`[DB] Core Target: ${redactUrl(coreUrl)}`);
    console.log(`[DB] Pool Sizes — Core: ${finalCoreMax}, Ledger: ${finalLedgerMax}, External: ${finalExternalMax}, Security: ${finalSecurityMax}`);

    if (!coreUrl) {
      console.warn('[DB] ⚠️ DATABASE_URL missing. Operating in Degraded Mode.');
      pool = ledgerPool = externalPool = securityPool = null;
      return;
    }

    try {
      validateDatabaseUrl(coreUrl,           'DATABASE_URL');
      validateDatabaseUrl(finalLedgerUrl,   'LEDGER_DATABASE_URL');
      validateDatabaseUrl(finalExternalUrl, 'EXTERNAL_DATABASE_URL');
      validateDatabaseUrl(finalSecurityUrl, 'SECURITY_DATABASE_URL');
    } catch (err: any) {
      console.error(`[DB] Validation failed: ${err.message}`);
      if (process.env.NODE_ENV === 'production' && coreUrl) throw err;
      pool = ledgerPool = externalPool = securityPool = null;
      return;
    }

    const prevPool = pool;
    const prevLedger = ledgerPool;
    const prevExternal = externalPool;
    const prevSecurity = securityPool;

    try {
      const normCoreUrl     = normalizeDatabaseUrl(coreUrl);
      const normLedgerUrl   = normalizeDatabaseUrl(finalLedgerUrl);
      const normExternalUrl = normalizeDatabaseUrl(finalExternalUrl);
      const normSecurityUrl = normalizeDatabaseUrl(finalSecurityUrl);

      const newPool = patchPoolQuery(new Pool({
        connectionString: normCoreUrl,
        ...getBasePoolConfig(finalCoreMax, 15000, normCoreUrl),
      }));
      const newLedgerPool = normLedgerUrl === normCoreUrl ? newPool : patchPoolQuery(new Pool({
        connectionString: normLedgerUrl,
        ...getBasePoolConfig(finalLedgerMax, 15000, normLedgerUrl),
      }));
      const newExternalPool = normExternalUrl === normCoreUrl ? newPool : patchPoolQuery(new Pool({
        connectionString: normExternalUrl,
        ...getBasePoolConfig(finalExternalMax, 15000, normExternalUrl),
      }));
      const newSecurityPool = normSecurityUrl === normCoreUrl ? newPool : patchPoolQuery(new Pool({
        connectionString: normSecurityUrl,
        ...getBasePoolConfig(finalSecurityMax, 15000, normSecurityUrl),
      }));

      newPool.on('error', (e: any) => console.error('[DB] Idle core client error:', e?.message || e));
      if (newLedgerPool   !== newPool) newLedgerPool.on('error',   (e: any) => console.error('[DB] Idle ledger client error:', e?.message || e));
      if (newExternalPool !== newPool) newExternalPool.on('error', (e: any) => console.error('[DB] Idle external client error:', e?.message || e));
      if (newSecurityPool !== newPool) newSecurityPool.on('error', (e: any) => console.error('[DB] Idle security client error:', e?.message || e));

      // Swap globals immediately so any new query runs on valid, open pools
      pool = newPool;
      ledgerPool = newLedgerPool;
      externalPool = newExternalPool;
      securityPool = newSecurityPool;

      currentCoreUrl = coreUrl; currentLedgerUrl = finalLedgerUrl;
      currentExternalUrl = finalExternalUrl; currentSecurityUrl = finalSecurityUrl;
      currentCoreMax = finalCoreMax; currentLedgerMax = finalLedgerMax;
      currentExternalMax = finalExternalMax; currentSecurityMax = finalSecurityMax;

      // Close previous distinct pools safely in background
      if (prevPool && prevPool !== newPool) prevPool.end().catch((e: any) => console.error('[DB] Error closing previous core pool:', e.message));
      if (prevLedger && prevLedger !== prevPool && prevLedger !== newLedgerPool && prevLedger !== newPool) prevLedger.end().catch((e: any) => console.error('[DB] Error closing previous ledger pool:', e.message));
      if (prevExternal && prevExternal !== prevPool && prevExternal !== newExternalPool && prevExternal !== newPool) prevExternal.end().catch((e: any) => console.error('[DB] Error closing previous external pool:', e.message));
      if (prevSecurity && prevSecurity !== prevPool && prevSecurity !== newSecurityPool && prevSecurity !== newPool) prevSecurity.end().catch((e: any) => console.error('[DB] Error closing previous security pool:', e.message));

      console.log('[DB] Pools created. Verifying connectivity...');

      const verify = async (p: any, name: string, retries: number = 3): Promise<boolean> => {
        let delay = 1000;
        for (let attempt = 1; attempt <= retries; attempt++) {
          let fatalErr: string | null = null;
          const success = await new Promise<boolean>((resolve) => {
            let settled = false;
            const timer = setTimeout(() => {
              if (!settled) {
                settled = true;
                resolve(false);
              }
            }, 15000);
            p.query('SELECT 1')
              .then(() => {
                if (!settled) {
                  settled = true;
                  clearTimeout(timer);
                  resolve(true);
                }
              })
              .catch((e: any) => {
                if (!settled) {
                  settled = true;
                  clearTimeout(timer);
                  const msg = e?.message || String(e);
                  if (msg.includes('password authentication failed') || msg.includes('does not exist')) {
                    fatalErr = msg;
                  }
                  resolve(false);
                }
              });
          });

          if (success) return true;

          if (fatalErr) {
            console.warn(`[DB] ${name} authentication failed: ${fatalErr}. Falling back immediately.`);
            return false;
          }

          if (attempt < retries) {
            console.warn(`[DB] ${name} connectivity check failed on attempt ${attempt}/${retries}. Retrying in ${delay}ms...`);
            await new Promise(r => setTimeout(r, delay));
            delay *= 2;
          }
        }
        console.warn(`[DB] ${name} connectivity check failed after ${retries} attempts.`);
        return false;
      };

      const coreOk = await verify(pool, 'Core DB', 3);
      coreOk
        ? console.log('[DB] Core DB connection verified.')
        : console.error('[DB] ❌ Core DB unreachable.');

      if (ledgerPool !== pool) {
        if (!await verify(ledgerPool, 'Ledger DB', 2)) {
          console.warn('[DB] Ledger DB unreachable — falling back to Core pool.');
          const oldLedger = ledgerPool;
          ledgerPool = pool;
          currentLedgerUrl = currentCoreUrl;
          if (oldLedger && oldLedger !== pool) {
            try { await oldLedger.end(); } catch {}
          }
          if (pool) {
            try {
              await pool.query("UPDATE db_connections_registry SET status = 'down' WHERE id = 'ledger'");
            } catch {}
          }
        } else {
          console.log('[DB] Ledger DB connection verified.');
          if (pool) {
            try {
              await pool.query("UPDATE db_connections_registry SET status = 'healthy' WHERE id = 'ledger'");
            } catch {}
          }
        }
      } else { console.log('[DB] Ledger DB sharing Core pool.'); }

      if (externalPool !== pool) {
        if (!await verify(externalPool, 'External DB', 2)) {
          console.warn('[DB] External DB unreachable — falling back to Core pool.');
          const oldExternal = externalPool;
          externalPool = pool;
          currentExternalUrl = currentCoreUrl;
          if (oldExternal && oldExternal !== pool) {
            try { await oldExternal.end(); } catch {}
          }
          if (pool) {
            try {
              await pool.query("UPDATE db_connections_registry SET status = 'down' WHERE id = 'external'");
            } catch {}
          }
        } else {
          console.log('[DB] External DB connection verified.');
          if (pool) {
            try {
              await pool.query("UPDATE db_connections_registry SET status = 'healthy' WHERE id = 'external'");
            } catch {}
          }
        }
      } else { console.log('[DB] External DB sharing Core pool.'); }

      if (securityPool !== pool) {
        if (!await verify(securityPool, 'Security DB', 2)) {
          console.warn('[DB] Security DB unreachable — falling back to Core pool.');
          const oldSecurity = securityPool;
          securityPool = pool;
          currentSecurityUrl = currentCoreUrl;
          if (oldSecurity && oldSecurity !== pool) {
            try { await oldSecurity.end(); } catch {}
          }
          if (pool) {
            try {
              await pool.query("UPDATE db_connections_registry SET status = 'down' WHERE id = 'security'");
            } catch {}
          }
        } else {
          console.log('[DB] Security DB connection verified.');
          if (pool) {
            try {
              await pool.query("UPDATE db_connections_registry SET status = 'healthy' WHERE id = 'security'");
            } catch {}
          }
        }
      } else { console.log('[DB] Security DB sharing Core pool.'); }

      console.log('[DB] Pool initialization complete.');
    } catch (err: any) {
      console.error('[DB] Critical error during pool creation:', err.message);
      if (process.env.NODE_ENV === 'production') throw err;
      pool = ledgerPool = externalPool = securityPool = null;
    }
  })();

  try {
    await poolInitPromise;
  } finally {
    poolInitPromise = null;
  }
}


export async function synchronizePerplextaPoolsFromRegistry() {
  if (!pool) return;
  console.log('[DB] Checking for active remote database overrides...');

  try {
    await pool.query("UPDATE db_connections_registry SET is_active = false, host = NULL WHERE host = 'base'");

    const result = await pool.query(
      "SELECT * FROM db_connections_registry WHERE is_active = true AND id IN ('core','ledger','external','security')"
    );

    if (result.rows.length === 0) {
      console.log('[DB] No active registry overrides found.');
      const env = getPoolSizesFromEnv();
      const defaultCore     = process.env.DATABASE_URL || '';
      const defaultLedger   = process.env.LEDGER_DATABASE_URL   || defaultCore;
      const defaultExternal = process.env.EXTERNAL_DATABASE_URL || defaultCore;
      const defaultSecurity = process.env.SECURITY_DATABASE_URL || defaultCore;

      if (
        currentCoreUrl     !== defaultCore     ||
        currentLedgerUrl   !== defaultLedger   ||
        currentExternalUrl !== defaultExternal ||
        currentSecurityUrl !== defaultSecurity ||
        currentCoreMax     !== env.coreMax     ||
        currentLedgerMax   !== env.ledgerMax   ||
        currentExternalMax !== env.externalMax ||
        currentSecurityMax !== env.securityMax
      ) {
        console.log('[DB] Reverting pools to environment defaults.');
        await initializePerplextaPools(defaultCore, defaultLedger, defaultExternal, defaultSecurity,
          env.coreMax, env.ledgerMax, env.externalMax, env.securityMax);
      } else {
        console.log('[DB] Already using environment defaults. No action needed.');
      }
      return;
    }

    const coreReg     = result.rows.find((r: any) => r.id === 'core');
    const ledgerReg   = result.rows.find((r: any) => r.id === 'ledger');
    const externalReg = result.rows.find((r: any) => r.id === 'external');
    const securityReg = result.rows.find((r: any) => r.id === 'security');

    const safeDecrypt = (val: any): string => {
      if (!val) return '';
      try {
        const res = decrypt(typeof val === 'string' ? val : String(val));
        return typeof res === 'string' ? res : String(res || '');
      } catch {
        return typeof val === 'string' ? val : String(val || '');
      }
    };

    const getUrlFromReg = (reg: any, fallback: string): string => {
      if (!reg) return fallback;
      if (reg.connection_string) {
        const decrypted = safeDecrypt(reg.connection_string);
        if (decrypted && decrypted.trim() !== '') return decrypted;
      }
      if (reg.host && reg.host !== 'base') {
        const u = encodeURIComponent(reg.username || '');
        const rawPass = safeDecrypt(reg.password);
        const p = rawPass ? encodeURIComponent(rawPass) : '';
        const port = reg.port || '5432';
        const connBase = `postgres://${u}${p ? `:${p}` : ''}@${reg.host}:${port}/${reg.db_name}`;
        return reg.ssl_mode && reg.ssl_mode !== 'disable' ? `${connBase}?sslmode=${reg.ssl_mode}` : connBase;
      }
      return fallback;
    };

    const defaultCore     = process.env.DATABASE_URL || '';
    const defaultLedger   = process.env.LEDGER_DATABASE_URL   || defaultCore;
    const defaultExternal = process.env.EXTERNAL_DATABASE_URL || defaultCore;
    const defaultSecurity = process.env.SECURITY_DATABASE_URL || defaultCore;
    const envSizes        = getPoolSizesFromEnv();

    const coreUrl     = getUrlFromReg(coreReg,     defaultCore);
    const ledgerRaw   = getUrlFromReg(ledgerReg,   defaultLedger);
    const externalRaw = getUrlFromReg(externalReg, defaultExternal);
    const securityRaw = getUrlFromReg(securityReg, defaultSecurity);
    
    if (!coreUrl) {
      return;
    }

    if (coreUrl !== defaultCore) {
      try {
        validateDatabaseUrl(coreUrl, 'REGISTRY_CORE_URL');
      } catch (err: any) {
        return;
      }
    }

    const coreMax     = Number(coreReg?.pool_size)     || envSizes.coreMax;
    const ledgerMax   = Number(ledgerReg?.pool_size)   || envSizes.ledgerMax;
    const externalMax = Number(externalReg?.pool_size) || envSizes.externalMax;
    const securityMax = Number(securityReg?.pool_size) || envSizes.securityMax;

    if (
      coreUrl     === currentCoreUrl     && ledgerRaw   === currentLedgerUrl   &&
      externalRaw === currentExternalUrl && securityRaw === currentSecurityUrl &&
      coreMax     === currentCoreMax     && ledgerMax   === currentLedgerMax   &&
      externalMax === currentExternalMax && securityMax === currentSecurityMax
    ) {
      console.log('[DB] In-memory pools already match active registry configuration.');
      return;
    }

    const testAndResolveUrl = async (id: string, url: string, defaultUrl: string): Promise<string> => {
      if (!url) return coreUrl;
      const normUrl = normalizeDatabaseUrl(url);
      const normCore = normalizeDatabaseUrl(coreUrl);
      if (normUrl === normCore) return coreUrl;

      let p: any = null;
      try {
        p = createInternalPool(url, 1, 15000);
        await p.query('SELECT 1');
        await p.end().catch(() => {});
        if (pool) {
          try {
            await pool.query("UPDATE db_connections_registry SET status = 'healthy' WHERE id = $1", [id]);
          } catch {}
        }
        return url;
      } catch (e: any) {
        if (p) {
          await p.end().catch(() => {});
        }
        console.warn(`[DB] Registry ${id} DB check failed: ${e.message}. Falling back to Core.`);
        if (pool) {
          try {
            await pool.query("UPDATE db_connections_registry SET status = 'down' WHERE id = $1", [id]);
          } catch {}
        }
        return coreUrl;
      }
    };

    const ledgerUrl   = await testAndResolveUrl('ledger', ledgerRaw, defaultLedger);
    const externalUrl = await testAndResolveUrl('external', externalRaw, defaultExternal);
    const securityUrl = await testAndResolveUrl('security', securityRaw, defaultSecurity);

    if (
      coreUrl     === currentCoreUrl     && ledgerUrl   === currentLedgerUrl   &&
      externalUrl === currentExternalUrl && securityUrl === currentSecurityUrl &&
      coreMax     === currentCoreMax     && ledgerMax   === currentLedgerMax   &&
      externalMax === currentExternalMax && securityMax === currentSecurityMax
    ) {
      console.log('[DB] In-memory pools already match active registry configuration.');
      return;
    }

    console.log('[DB] Registry connections verified. Swapping pools...');
    await initializePerplextaPools(coreUrl, ledgerUrl, externalUrl, securityUrl,
      coreMax, ledgerMax, externalMax, securityMax);
    console.log('[DB] Pools synchronized with active registry configuration.');

  } catch (syncErr: any) {
    console.warn('[DB] Registry synchronization skipped:', syncErr.message);
  }
}

const poolLeakHistory: Record<string, number[]> = {
  core: [],
  ledger: [],
  external: [],
  security: []
};
const lastSampleTime: Record<string, number> = {
  core: 0,
  ledger: 0,
  external: 0,
  security: 0
};

export function getPoolMetrics(p: any, name?: string) {
  if (!p) {
    return {
      total: 0,
      idle: 0,
      active: 0,
      waiting: 0,
      max: 0,
      saturated: false,
      available: false,
      connection_leak_risk: false
    };
  }
  const total = p.totalCount ?? 0;
  const idle = p.idleCount ?? 0;
  const waiting = p.waitingCount ?? 0;
  const max = p.options?.max ?? 20;
  const active = Math.max(0, total - idle);
  const saturated = total >= max && waiting > 15;

  let connection_leak_risk = false;
  if (name) {
    const now = Date.now();
    if (now - lastSampleTime[name] > 3000) {
      lastSampleTime[name] = now;
      const history = poolLeakHistory[name];
      if (waiting <= 1) {
        history.push(active);
        if (history.length > 5) {
          history.shift();
        }
      }
    }
    const history = poolLeakHistory[name];
    const threshold = Math.max(3, Math.floor(max * 0.7));
    if (history.length >= 3 && history.every(v => v >= threshold)) {
      connection_leak_risk = true;
    }
  }

  return {
    total,
    idle,
    active,
    waiting,
    max,
    saturated,
    connection_leak_risk,
    available: true
  };
}

export async function forceReconnectPool(poolName: 'core' | 'ledger' | 'external' | 'security'): Promise<void> {
  console.log(`[DB] Force reconnect requested for pool: ${poolName}`);
  const envSizes = getPoolSizesFromEnv();

  if (poolLeakHistory[poolName]) {
    poolLeakHistory[poolName] = [];
  }

  if (poolName === 'core') {
    const url = currentCoreUrl || process.env.DATABASE_URL;
    if (!url) throw new Error('Core DB URL not found');
    if (pool) {
      await pool.end().catch((e: any) => console.error('[DB] Error ending core pool:', e.message));
    }
    pool = patchPoolQuery(new Pool({
      connectionString: url,
      ...getBasePoolConfig(currentCoreMax || envSizes.coreMax, 10000, url),
    }));
    pool.on('error', (e: any) => console.error('[DB] Idle core client error:', e?.message || e));
    await pool.query('SELECT 1');
    console.log('[DB] Core pool reconnected successfully.');
  } else if (poolName === 'ledger') {
    const url = currentLedgerUrl || process.env.LEDGER_DATABASE_URL || currentCoreUrl || process.env.DATABASE_URL;
    if (!url) throw new Error('Ledger DB URL not found');
    if (ledgerPool && ledgerPool !== pool) {
      await ledgerPool.end().catch((e: any) => console.error('[DB] Error ending ledger pool:', e.message));
    }
    ledgerPool = url === (currentCoreUrl || process.env.DATABASE_URL) ? pool : patchPoolQuery(new Pool({
      connectionString: url,
      ...getBasePoolConfig(currentLedgerMax || envSizes.ledgerMax, 5000, url),
    }));
    if (ledgerPool !== pool) {
      ledgerPool.on('error', (e: any) => console.error('[DB] Idle ledger client error:', e?.message || e));
    }
    await ledgerPool.query('SELECT 1');
    console.log('[DB] Ledger pool reconnected successfully.');
  } else if (poolName === 'external') {
    const url = currentExternalUrl || process.env.EXTERNAL_DATABASE_URL || currentCoreUrl || process.env.DATABASE_URL;
    if (!url) throw new Error('External DB URL not found');
    if (externalPool && externalPool !== pool) {
      await externalPool.end().catch((e: any) => console.error('[DB] Error ending external pool:', e.message));
    }
    externalPool = url === (currentCoreUrl || process.env.DATABASE_URL) ? pool : patchPoolQuery(new Pool({
      connectionString: url,
      ...getBasePoolConfig(currentExternalMax || envSizes.externalMax, 5000, url),
    }));
    if (externalPool !== pool) {
      externalPool.on('error', (e: any) => console.error('[DB] Idle external client error:', e?.message || e));
    }
    await externalPool.query('SELECT 1');
    console.log('[DB] External pool reconnected successfully.');
  } else if (poolName === 'security') {
    const url = currentSecurityUrl || process.env.SECURITY_DATABASE_URL || currentCoreUrl || process.env.DATABASE_URL;
    if (!url) throw new Error('Security DB URL not found');
    if (securityPool && securityPool !== pool) {
      await securityPool.end().catch((e: any) => console.error('[DB] Error ending security pool:', e.message));
    }
    securityPool = url === (currentCoreUrl || process.env.DATABASE_URL) ? pool : patchPoolQuery(new Pool({
      connectionString: url,
      ...getBasePoolConfig(currentSecurityMax || envSizes.securityMax, 5000, url),
    }));
    if (securityPool !== pool) {
      securityPool.on('error', (e: any) => console.error('[DB] Idle security client error:', e?.message || e));
    }
    await securityPool.query('SELECT 1');
    console.log('[DB] Security pool reconnected successfully.');
  }
}

let healthCheckInterval: NodeJS.Timeout | null = null;
let poolSaturationGuardianInterval: NodeJS.Timeout | null = null;

export async function cleanupAbandonedConnections(poolInstance: any, poolName: string): Promise<number> {
  if (!poolInstance) return 0;
  try {
    // Aggressive stale-connection-reaper for orphaned or idle-in-transaction connections > 60 seconds
    const res = await poolInstance.query(`
      SELECT pg_terminate_backend(pid) 
      FROM pg_stat_activity 
      WHERE datname = current_database() 
        AND pid <> pg_backend_pid()
        AND (
          state = 'idle in transaction' 
          OR state = 'idle in transaction (aborted)'
        )
        AND state_change < current_timestamp - interval '60 seconds'
    `).catch(() => null);

    if (res && res.rowCount > 0) {
      console.warn(`[Stale-Connection-Reaper] ⚡ Terminated ${res.rowCount} orphaned/lingering >60s connections on pool '${poolName}' during high-concurrency spike.`);
      if (typeof poolInstance.emit === 'function') {
        poolInstance.emit('pool_saturation_event', {
          poolName,
          terminatedCount: res.rowCount,
          triggeredAt: new Date().toISOString(),
          metrics: getPoolMetrics(poolInstance, poolName)
        });
      }
      return res.rowCount;
    }
    return 0;
  } catch (err: any) {
    // Non-fatal if lacking superuser permissions on certain hosted database managed plans
    return 0;
  }
}

export function startPoolSaturationGuardian(intervalMs = 60000) {
  if (poolSaturationGuardianInterval) return;
  poolSaturationGuardianInterval = setInterval(async () => {
    const poolsToCheck: Array<{ name: 'core' | 'ledger' | 'external' | 'security'; poolInstance: any }> = [
      { name: 'core', poolInstance: pool },
      { name: 'ledger', poolInstance: ledgerPool },
      { name: 'external', poolInstance: externalPool },
      { name: 'security', poolInstance: securityPool },
    ];

    for (const { name, poolInstance } of poolsToCheck) {
      if (!poolInstance) continue;

      // 1. Terminate abandoned or hanging connections
      await cleanupAbandonedConnections(poolInstance, name);

      // 2. Analyze pool metrics for saturation or leaks
      const metrics = getPoolMetrics(poolInstance, name);
      if (metrics.waiting > 10 || (metrics.connection_leak_risk && metrics.waiting > 2)) {
        console.warn(`[Pool Guardian] ⚠️ Pool '${name}' saturation detected (waiting: ${metrics.waiting}, active: ${metrics.active}/${metrics.max}). Initiating emergency pool recycling...`);
        try {
          await forceReconnectPool(name);
        } catch (reconnectErr: any) {
          console.error(`[Pool Guardian] Failed to recycle pool '${name}':`, reconnectErr?.message || reconnectErr);
        }
      }
    }
  }, intervalMs);

  if (typeof poolSaturationGuardianInterval.unref === 'function') {
    poolSaturationGuardianInterval.unref();
  }
}

export function startConnectionHealthCheck(intervalMs = 60000) {
  if (healthCheckInterval) return;
  healthCheckInterval = setInterval(async () => {
    const poolsToCheck: Array<{ name: 'core' | 'ledger' | 'external' | 'security'; poolInstance: any }> = [
      { name: 'core', poolInstance: pool },
      { name: 'ledger', poolInstance: ledgerPool },
      { name: 'external', poolInstance: externalPool },
      { name: 'security', poolInstance: securityPool },
    ];

    for (const { name, poolInstance } of poolsToCheck) {
      if (!poolInstance) continue;
      try {
        await poolInstance.query('SELECT 1');
      } catch (err: any) {
        console.warn(`[DB Health Check] Pool '${name}' failed health check ("${err?.message || err}"). Attempting automatic reconnection...`);
        try {
          await forceReconnectPool(name);
        } catch (reconnectErr: any) {
          console.error(`[DB Health Check] Failed to reconnect pool '${name}':`, reconnectErr?.message || reconnectErr);
        }
      }
    }
  }, intervalMs);

  if (typeof healthCheckInterval.unref === 'function') {
    healthCheckInterval.unref();
  }
}

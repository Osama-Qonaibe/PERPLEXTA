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

import { encrypt, decrypt } from "../utils/crypto.js";

let corePoolInstance: any = null;
let ledgerPoolInstance: any = null;
let externalPoolInstance: any = null;
let securityPoolInstance: any = null;

function createPoolProxy(getPool: () => any): any {
  return new Proxy({} as any, {
    get(target, prop) {
      let p = getPool();
      if (!p || p.ended) {
        if (prop === 'query') {
          return async (text: any, params: any) => {
            if (poolInitPromise) {
              try { await poolInitPromise; } catch {}
            }
            p = getPool();
            if (!p || p.ended) {
              if (corePoolInstance && !corePoolInstance.ended) {
                return corePoolInstance.query(text, params);
              }
              const defaultCore = process.env.DATABASE_URL || '';
              if (defaultCore) {
                const tempPool = new Pool({ connectionString: defaultCore, ...getBasePoolConfig(5, 5000) });
                patchPoolQuery(tempPool);
                try {
                  return await tempPool.query(text, params);
                } finally {
                  await tempPool.end().catch(() => {});
                }
              }
              throw new Error('Database pool is not initialized or in degraded mode.');
            }
            return p.query(text, params);
          };
        }
        return undefined;
      }
      const val = p[prop];
      if (typeof val === 'function') {
        return val.bind(p);
      }
      return val;
    }
  });
}

export const pool: any = createPoolProxy(() => corePoolInstance);
export const ledgerPool: any = createPoolProxy(() => ledgerPoolInstance);
export const externalPool: any = createPoolProxy(() => externalPoolInstance);
export const securityPool: any = createPoolProxy(() => securityPoolInstance);

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


export function getSslConfig() {
  return process.env.NODE_ENV === 'production' && process.env.DB_SSL_REQUIRED !== 'false'
    ? { rejectUnauthorized: false }
    : undefined;
}

/** Resolve pool-size defaults from environment variables — single source of truth. */
function getPoolSizesFromEnv(): { coreMax: number; ledgerMax: number; externalMax: number; securityMax: number } {
  const base = Number(process.env.DB_MAX_CONNECTIONS) || 20;
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

export function getBasePoolConfig(max: number, connectionTimeoutMillis = 10000) {
  return {
    ssl: getSslConfig(),
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
    let delay = 500;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (p.ended) {
          throw new Error('Cannot use a pool after calling end on the pool');
        }
        return await originalQuery(text, params);
      } catch (err: any) {
        const msg = err?.message || String(err);
        const isTransient = /Connection terminated unexpectedly|ECONNRESET|ETIMEDOUT|terminating connection|closed|SSL|Cannot use a pool after calling end|timeout exceeded|not queryable/i.test(msg);
        if (isTransient && attempt < maxRetries) {
          console.warn(`[DB] Transient/Ended pool error ("${msg}"). Retrying query (attempt ${attempt}/${maxRetries})...`);
          if (/Cannot use a pool after calling end|not queryable/i.test(msg)) {
            if (poolInitPromise) {
              try { await poolInitPromise; } catch {}
            } else {
              try {
                if (!corePoolInstance || corePoolInstance.ended) {
                  const defaultCore = process.env.DATABASE_URL || '';
                  if (defaultCore) {
                    corePoolInstance = new Pool({ connectionString: defaultCore, ...getBasePoolConfig(20, 15000) });
                    patchPoolQuery(corePoolInstance);
                  }
                }
              } catch (reInitErr) {
                console.error('[DB] Auto-reinit error:', reInitErr);
              }
            }
          }
          await new Promise(r => setTimeout(r, delay));
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

export function createInternalPool(connectionString: string, max = 1, connectionTimeoutMillis = 5000) {
  const safeConnStr = typeof connectionString === 'string' ? connectionString : String(connectionString || '');
  const p = new Pool({
    connectionString: safeConnStr,
    ...getBasePoolConfig(max, connectionTimeoutMillis),
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
      corePoolInstance = ledgerPoolInstance = externalPoolInstance = securityPoolInstance = null;
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
      corePoolInstance = ledgerPoolInstance = externalPoolInstance = securityPoolInstance = null;
      return;
    }

    if (corePoolInstance) corePoolInstance.end().catch((e: any) => console.error('[DB] Error closing core pool:', e.message));
    if (ledgerPoolInstance   && ledgerPoolInstance   !== corePoolInstance) ledgerPoolInstance.end().catch((e: any)   => console.error('[DB] Error closing ledger pool:', e.message));
    if (externalPoolInstance && externalPoolInstance !== corePoolInstance) externalPoolInstance.end().catch((e: any) => console.error('[DB] Error closing external pool:', e.message));
    if (securityPoolInstance && securityPoolInstance !== corePoolInstance) securityPoolInstance.end().catch((e: any) => console.error('[DB] Error closing security pool:', e.message));

    const ssl = getSslConfig(); // single call, used for all pools below

    try {
      corePoolInstance = patchPoolQuery(new Pool({
        connectionString: coreUrl,
        ...getBasePoolConfig(finalCoreMax, 15000),
      }));
      ledgerPoolInstance = finalLedgerUrl === coreUrl ? corePoolInstance : patchPoolQuery(new Pool({
        connectionString: finalLedgerUrl,
        ...getBasePoolConfig(finalLedgerMax, 15000),
      }));
      externalPoolInstance = finalExternalUrl === coreUrl ? corePoolInstance : patchPoolQuery(new Pool({
        connectionString: finalExternalUrl,
        ...getBasePoolConfig(finalExternalMax, 15000),
      }));
      securityPoolInstance = finalSecurityUrl === coreUrl ? corePoolInstance : patchPoolQuery(new Pool({
        connectionString: finalSecurityUrl,
        ...getBasePoolConfig(finalSecurityMax, 15000),
      }));

      corePoolInstance.on('error', (e: any) => console.error('[DB] Idle core client error:', e?.message || e));
      if (ledgerPoolInstance   !== corePoolInstance) ledgerPoolInstance.on('error',   (e: any) => console.error('[DB] Idle ledger client error:', e?.message || e));
      if (externalPoolInstance !== corePoolInstance) externalPoolInstance.on('error', (e: any) => console.error('[DB] Idle external client error:', e?.message || e));
      if (securityPoolInstance !== corePoolInstance) securityPoolInstance.on('error', (e: any) => console.error('[DB] Idle security client error:', e?.message || e));

      currentCoreUrl = coreUrl; currentLedgerUrl = finalLedgerUrl;
      currentExternalUrl = finalExternalUrl; currentSecurityUrl = finalSecurityUrl;
      currentCoreMax = finalCoreMax; currentLedgerMax = finalLedgerMax;
      currentExternalMax = finalExternalMax; currentSecurityMax = finalSecurityMax;

      console.log('[DB] Pools created. Verifying connectivity...');

      const verify = async (p: any, name: string, retries: number = 1): Promise<boolean> => {
        let delay = 500;
        for (let attempt = 1; attempt <= retries; attempt++) {
          const success = await new Promise<boolean>((resolve) => {
            let settled = false;
            const timer = setTimeout(() => {
              if (!settled) {
                settled = true;
                resolve(false);
              }
            }, 3000); // 3 seconds timeout
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
                  resolve(false);
                }
              });
          });

          if (success) return true;

          if (attempt < retries) {
            console.log(`[DB Info] ${name} connectivity check failed on attempt ${attempt}/${retries}. Retrying in ${delay}ms...`);
            await new Promise(r => setTimeout(r, delay));
            delay *= 2;
          }
        }
        console.log(`[DB Info] ${name} connectivity check completed (unreachable after ${retries} attempts).`);
        return false;
      };

      const coreOk = await verify(corePoolInstance, 'Core DB', 1);
      coreOk
        ? console.log('[DB] Core DB connection verified.')
        : console.error('[DB] ❌ Core DB unreachable.');

      if (ledgerPoolInstance !== corePoolInstance) {
        if (!await verify(ledgerPoolInstance, 'Ledger DB', 1)) {
          console.log('[DB Info] Ledger DB unreachable — falling back to Core pool.');
          try { await ledgerPoolInstance.end(); } catch {}
          ledgerPoolInstance = corePoolInstance;
        } else { console.log('[DB] Ledger DB connection verified.'); }
      } else { console.log('[DB] Ledger DB sharing Core pool.'); }

      if (externalPoolInstance !== corePoolInstance) {
        if (!await verify(externalPoolInstance, 'External DB', 1)) {
          console.log('[DB Info] External DB unreachable — falling back to Core pool.');
          try { await externalPoolInstance.end(); } catch {}
          externalPoolInstance = corePoolInstance;
        } else { console.log('[DB] External DB connection verified.'); }
      } else { console.log('[DB] External DB sharing Core pool.'); }

      if (securityPoolInstance !== corePoolInstance) {
        if (!await verify(securityPoolInstance, 'Security DB', 1)) {
          console.log('[DB Info] Security DB unreachable — falling back to Core pool.');
          try { await securityPoolInstance.end(); } catch {}
          securityPoolInstance = corePoolInstance;
        } else { console.log('[DB] Security DB connection verified.'); }
      } else { console.log('[DB] Security DB sharing Core pool.'); }

      console.log('[DB] Pool initialization complete.');
    } catch (err: any) {
      console.error('[DB] Critical error during pool creation:', err.message);
      if (process.env.NODE_ENV === 'production') throw err;
      corePoolInstance = ledgerPoolInstance = externalPoolInstance = securityPoolInstance = null;
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

    const testAndResolveUrl = async (id: string, url: string, defaultUrl: string): Promise<string> => {
      if (!url || url === coreUrl) return coreUrl;
      let delay = 1000;
      const retries = 3;
      for (let attempt = 1; attempt <= retries; attempt++) {
        let p: any = null;
        try {
          p = createInternalPool(url);
          await p.query('SELECT 1');
          await p.end().catch(() => {});
          return url;
        } catch (e: any) {
          if (p) {
            await p.end().catch(() => {});
          }
          const isAuthFailure = e.code === '28P01' || 
                                e.message.toLowerCase().includes('password authentication') || 
                                e.message.toLowerCase().includes('authentication failed') ||
                                e.message.toLowerCase().includes('invalid password');
          if (isAuthFailure) {
            console.log(`[DB Info] Registry ${id} DB check failed immediately due to invalid credentials: ${e.message}. Deactivating in registry and falling back to Core.`);
            try {
              await pool.query("UPDATE db_connections_registry SET is_active = false WHERE id = $1", [id]);
            } catch {}
            return defaultUrl;
          }
          if (attempt === retries) {
            console.log(`[DB Info] Registry ${id} DB check failed after ${retries} attempts: ${e.message}. Falling back to Core.`);
            try {
              await pool.query("UPDATE db_connections_registry SET is_active = false WHERE id = $1", [id]);
            } catch {}
            return defaultUrl;
          }
          console.log(`[DB Info] Registry ${id} DB check failed on attempt ${attempt}/${retries}: ${e.message}. Retrying in ${delay}ms (exponential backoff)...`);
          await new Promise(r => setTimeout(r, delay));
          delay *= 2;
        }
      }
      return defaultUrl;
    };

    const ledgerUrl   = await testAndResolveUrl('ledger', ledgerRaw, defaultLedger);
    const externalUrl = await testAndResolveUrl('external', externalRaw, defaultExternal);
    const securityUrl = await testAndResolveUrl('security', securityRaw, defaultSecurity);

    const coreMax     = Number(coreReg?.pool_size)     || envSizes.coreMax;
    const ledgerMax   = Number(ledgerReg?.pool_size)   || envSizes.ledgerMax;
    const externalMax = Number(externalReg?.pool_size) || envSizes.externalMax;
    const securityMax = Number(securityReg?.pool_size) || envSizes.securityMax;

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
    if (corePoolInstance) {
      await corePoolInstance.end().catch((e: any) => console.error('[DB] Error ending core pool:', e.message));
    }
    corePoolInstance = patchPoolQuery(new Pool({
      connectionString: url,
      ...getBasePoolConfig(currentCoreMax || envSizes.coreMax, 15000),
    }));
    corePoolInstance.on('error', (e: any) => console.error('[DB] Idle core client error:', e?.message || e));
    await corePoolInstance.query('SELECT 1');
    console.log('[DB] Core pool reconnected successfully.');
  } else if (poolName === 'ledger') {
    const url = currentLedgerUrl || process.env.LEDGER_DATABASE_URL || currentCoreUrl || process.env.DATABASE_URL;
    if (!url) throw new Error('Ledger DB URL not found');
    if (ledgerPoolInstance && ledgerPoolInstance !== corePoolInstance) {
      await ledgerPoolInstance.end().catch((e: any) => console.error('[DB] Error ending ledger pool:', e.message));
    }
    ledgerPoolInstance = url === (currentCoreUrl || process.env.DATABASE_URL) ? corePoolInstance : patchPoolQuery(new Pool({
      connectionString: url,
      ...getBasePoolConfig(currentLedgerMax || envSizes.ledgerMax, 15000),
    }));
    if (ledgerPoolInstance !== corePoolInstance) {
      ledgerPoolInstance.on('error', (e: any) => console.error('[DB] Idle ledger client error:', e?.message || e));
    }
    await ledgerPoolInstance.query('SELECT 1');
    console.log('[DB] Ledger pool reconnected successfully.');
  } else if (poolName === 'external') {
    const url = currentExternalUrl || process.env.EXTERNAL_DATABASE_URL || currentCoreUrl || process.env.DATABASE_URL;
    if (!url) throw new Error('External DB URL not found');
    if (externalPoolInstance && externalPoolInstance !== corePoolInstance) {
      await externalPoolInstance.end().catch((e: any) => console.error('[DB] Error ending external pool:', e.message));
    }
    externalPoolInstance = url === (currentCoreUrl || process.env.DATABASE_URL) ? corePoolInstance : patchPoolQuery(new Pool({
      connectionString: url,
      ...getBasePoolConfig(currentExternalMax || envSizes.externalMax, 15000),
    }));
    if (externalPoolInstance !== corePoolInstance) {
      externalPoolInstance.on('error', (e: any) => console.error('[DB] Idle external client error:', e?.message || e));
    }
    await externalPoolInstance.query('SELECT 1');
    console.log('[DB] External pool reconnected successfully.');
  } else if (poolName === 'security') {
    const url = currentSecurityUrl || process.env.SECURITY_DATABASE_URL || currentCoreUrl || process.env.DATABASE_URL;
    if (!url) throw new Error('Security DB URL not found');
    if (securityPoolInstance && securityPoolInstance !== corePoolInstance) {
      await securityPoolInstance.end().catch((e: any) => console.error('[DB] Error ending security pool:', e.message));
    }
    securityPoolInstance = url === (currentCoreUrl || process.env.DATABASE_URL) ? corePoolInstance : patchPoolQuery(new Pool({
      connectionString: url,
      ...getBasePoolConfig(currentSecurityMax || envSizes.securityMax, 15000),
    }));
    if (securityPoolInstance !== corePoolInstance) {
      securityPoolInstance.on('error', (e: any) => console.error('[DB] Idle security client error:', e?.message || e));
    }
    await securityPoolInstance.query('SELECT 1');
    console.log('[DB] Security pool reconnected successfully.');
  }
}

export async function forceReconnectAllPools(): Promise<void> {
  console.log('[DB] Global Pool Reset requested for all 4 pools...');
  await forceReconnectPool('core');
  await forceReconnectPool('ledger');
  await forceReconnectPool('external');
  await forceReconnectPool('security');
  console.log('[DB] All 4 database pools successfully reconnected and reset.');
}


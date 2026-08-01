import pkg from 'pg';
const { Pool } = pkg;
import { encrypt, decrypt } from "../utils/crypto.js";

export let pool: any;
export let ledgerPool: any;
export let externalPool: any;
export let securityPool: any;

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

export function createInternalPool(connectionString: string, max = 1) {
  const safeConnStr = typeof connectionString === 'string' ? connectionString : String(connectionString || '');
  return new Pool({
    connectionString: safeConnStr,
    ssl: getSslConfig(),
    connectionTimeoutMillis: 5000,
    max,
  });
}

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

    if (pool) pool.end().catch((e: any) => console.error('[DB] Error closing core pool:', e.message));
    if (ledgerPool   && ledgerPool   !== pool) ledgerPool.end().catch((e: any)   => console.error('[DB] Error closing ledger pool:', e.message));
    if (externalPool && externalPool !== pool) externalPool.end().catch((e: any) => console.error('[DB] Error closing external pool:', e.message));
    if (securityPool && securityPool !== pool) securityPool.end().catch((e: any) => console.error('[DB] Error closing security pool:', e.message));

    const ssl = getSslConfig(); // single call, used for all pools below

    try {
      pool = new Pool({
        connectionString: coreUrl,
        ssl, max: finalCoreMax,
        idleTimeoutMillis: 30000, connectionTimeoutMillis: 10000,
      });
      ledgerPool = finalLedgerUrl === coreUrl ? pool : new Pool({
        connectionString: finalLedgerUrl,
        ssl, max: finalLedgerMax,
        idleTimeoutMillis: 30000, connectionTimeoutMillis: 5000,
      });
      externalPool = finalExternalUrl === coreUrl ? pool : new Pool({
        connectionString: finalExternalUrl,
        ssl, max: finalExternalMax,
        idleTimeoutMillis: 30000, connectionTimeoutMillis: 5000,
      });
      securityPool = finalSecurityUrl === coreUrl ? pool : new Pool({
        connectionString: finalSecurityUrl,
        ssl, max: finalSecurityMax,
        idleTimeoutMillis: 30000, connectionTimeoutMillis: 5000,
      });

      pool.on('error', (e: any) => console.error('[DB] Idle core client error:', e.message));
      if (ledgerPool   !== pool) ledgerPool.on('error',   (e: any) => console.error('[DB] Idle ledger client error:', e.message));
      if (externalPool !== pool) externalPool.on('error', (e: any) => console.error('[DB] Idle external client error:', e.message));
      if (securityPool !== pool) securityPool.on('error', (e: any) => console.error('[DB] Idle security client error:', e.message));

      currentCoreUrl = coreUrl; currentLedgerUrl = finalLedgerUrl;
      currentExternalUrl = finalExternalUrl; currentSecurityUrl = finalSecurityUrl;
      currentCoreMax = finalCoreMax; currentLedgerMax = finalLedgerMax;
      currentExternalMax = finalExternalMax; currentSecurityMax = finalSecurityMax;

      console.log('[DB] Pools created. Verifying connectivity...');

      const verify = async (p: any, name: string): Promise<boolean> => {
        return new Promise((resolve) => {
          let settled = false;
          const timer = setTimeout(() => {
            if (!settled) {
              settled = true;
              console.warn(`[DB] ${name} connectivity check timed out (5s). Dynamic fallback will apply.`);
              resolve(false);
            }
          }, 5000);
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
                console.warn(`[DB] ${name} check failed: ${e.message}`);
                resolve(false);
              }
            });
        });
      };

      const coreOk = await verify(pool, 'Core DB');
      coreOk
        ? console.log('[DB] Core DB connection verified.')
        : console.error('[DB] ❌ Core DB unreachable.');

      if (ledgerPool !== pool) {
        if (!await verify(ledgerPool, 'Ledger DB')) {
          console.warn('[DB] Ledger DB unreachable — falling back to Core pool.');
          try { await ledgerPool.end(); } catch {}
          ledgerPool = pool;
        } else { console.log('[DB] Ledger DB connection verified.'); }
      } else { console.log('[DB] Ledger DB sharing Core pool.'); }

      if (externalPool !== pool) {
        if (!await verify(externalPool, 'External DB')) {
          console.warn('[DB] External DB unreachable — falling back to Core pool.');
          try { await externalPool.end(); } catch {}
          externalPool = pool;
        } else { console.log('[DB] External DB connection verified.'); }
      } else { console.log('[DB] External DB sharing Core pool.'); }

      if (securityPool !== pool) {
        if (!await verify(securityPool, 'Security DB')) {
          console.warn('[DB] Security DB unreachable — falling back to Core pool.');
          try { await securityPool.end(); } catch {}
          securityPool = pool;
        } else { console.log('[DB] Security DB connection verified.'); }
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
      console.warn('[DB] Registry synchronization skipped: Core URL is missing.');
      return;
    }

    try {
      validateDatabaseUrl(coreUrl, 'REGISTRY_CORE_URL');
    } catch (err: any) {
      console.error(`[DB] Registry synchronization skipped: ${err.message}`);
      return;
    }

    const testAndResolveUrl = async (id: string, url: string, defaultUrl: string): Promise<string> => {
      if (!url || url === coreUrl) return coreUrl;
      try {
        const p = createInternalPool(url);
        await p.query('SELECT 1');
        await p.end().catch(() => {});
        return url;
      } catch (e: any) {
        console.warn(`[DB] Registry ${id} DB check failed: ${e.message}. Falling back to Core.`);
        try {
          await pool.query("UPDATE db_connections_registry SET is_active = false WHERE id = $1", [id]);
        } catch {}
        return defaultUrl;
      }
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

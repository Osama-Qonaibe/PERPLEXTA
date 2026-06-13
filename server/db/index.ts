import pkg from 'pg';
const { Pool } = pkg;
import { encrypt, decrypt } from "../utils/crypto.js";

export let pool: any;
export let ledgerPool: any;
export let externalPool: any;
export let securityPool: any;
let currentCoreUrl: string = '';
let currentLedgerUrl: string = '';
let currentExternalUrl: string = '';
let currentSecurityUrl: string = '';
let currentCoreMaxPoolSize: number = 0;
let currentLedgerMaxPoolSize: number = 0;
let currentExternalMaxPoolSize: number = 0;
let currentSecurityMaxPoolSize: number = 0;
let poolInitPromise: Promise<void> | null = null;
let lastInitUrls = { core: '', ledger: '', external: '', security: '', coreMax: 0, ledgerMax: 0, externalMax: 0, securityMax: 0 };

export function getExternalPool() {
  return externalPool || pool;
}

export function getSecurityPool() {
  return securityPool || pool;
}

function validateDatabaseUrl(url: string, name: string) {
  if (!url) {
    throw new Error(`[DB] ${name} environment variable is missing.`);
  }
  const regex = /^postgres(ql)?:\/\//;
  if (!regex.test(url)) {
    throw new Error(`[DB] Invalid ${name} format. Expected a valid postgresql:// connection string.`);
  }
  try {
    const urlObj = new URL(url);
    if (!urlObj.hostname) {
      throw new Error(`Missing hostname in ${name}`);
    }
  } catch (err: any) {
    throw new Error(`[DB] ${name} is not a valid URL: ${err.message}`);
  }
}

export function getSslConfig() {
  return process.env.NODE_ENV === 'production' && process.env.DB_SSL_REQUIRED !== 'false'
    ? { rejectUnauthorized: false }
    : undefined;
}

export function createInternalPool(connectionString: string, max = 1) {
  return new Pool({
    connectionString,
    ssl: getSslConfig(),
    connectionTimeoutMillis: 5000,
    max
  });
}

export async function initializePerplextaPools(
  coreUrl: string, 
  ledgerUrl: string, 
  externalUrl?: string, 
  securityUrl?: string,
  coreMax?: number,
  ledgerMax?: number,
  externalMax?: number,
  securityMax?: number
): Promise<void> {
  const finalLedgerUrl = ledgerUrl || coreUrl;
  const finalExternalUrl = externalUrl || coreUrl;
  const finalSecurityUrl = securityUrl || coreUrl;

  const finalCoreMax = coreMax || Number(process.env.DB_CORE_MAX_POOL_SIZE || process.env.DB_CORE_MAX_CONNECTIONS || process.env.DB_MAX_CONNECTIONS) || 20;
  const finalLedgerMax = ledgerMax || Number(process.env.DB_LEDGER_MAX_POOL_SIZE || process.env.DB_LEDGER_MAX_CONNECTIONS || process.env.DB_MAX_CONNECTIONS || coreMax) || 20;
  const finalExternalMax = externalMax || Number(process.env.DB_EXTERNAL_MAX_POOL_SIZE || process.env.DB_EXTERNAL_MAX_CONNECTIONS || process.env.DB_MAX_CONNECTIONS || coreMax) || 20;
  const finalSecurityMax = securityMax || Number(process.env.DB_SECURITY_MAX_POOL_SIZE || process.env.DB_SECURITY_MAX_CONNECTIONS || process.env.DB_MAX_CONNECTIONS || coreMax) || 20;

  // Singleton guard to avoid redundant pool creation if settings and pool sizes match
  if (pool && 
      currentCoreUrl === coreUrl && 
      currentLedgerUrl === finalLedgerUrl && 
      currentExternalUrl === finalExternalUrl && 
      currentSecurityUrl === finalSecurityUrl &&
      currentCoreMaxPoolSize === finalCoreMax &&
      currentLedgerMaxPoolSize === finalLedgerMax &&
      currentExternalMaxPoolSize === finalExternalMax &&
      currentSecurityMaxPoolSize === finalSecurityMax) {
    console.log('[DB] Pools already initialized with matching configurations and pool sizes. Skipping redundant initialization.');
    return;
  }

  // Safe concurrent-initialization singleton guard to avoid racing connection setups
  if (poolInitPromise &&
      lastInitUrls.core === coreUrl &&
      lastInitUrls.ledger === finalLedgerUrl &&
      lastInitUrls.external === finalExternalUrl &&
      lastInitUrls.security === finalSecurityUrl &&
      lastInitUrls.coreMax === finalCoreMax &&
      lastInitUrls.ledgerMax === finalLedgerMax &&
      lastInitUrls.externalMax === finalExternalMax &&
      lastInitUrls.securityMax === finalSecurityMax) {
    console.log('[DB] Active pool initialization identical to request in progress. Re-using active promise.');
    return poolInitPromise;
  }

  lastInitUrls = {
    core: coreUrl,
    ledger: finalLedgerUrl,
    external: finalExternalUrl,
    security: finalSecurityUrl,
    coreMax: finalCoreMax,
    ledgerMax: finalLedgerMax,
    externalMax: finalExternalMax,
    securityMax: finalSecurityMax
  };

  poolInitPromise = (async () => {
    const redactedUrl = (url: string) => {
      try {
        const u = new URL(url);
        u.password = '****';
        return u.toString();
      } catch {
        return 'invalid-url';
      }
    };

    console.log(`[DB] Initializing Perplexta Pools (Factory Mode)...`);
    if (coreUrl) console.log(`[DB] Core Target: ${redactedUrl(coreUrl)}`);
    console.log(`[DB] Pool Sizes - Core: ${finalCoreMax}, Ledger: ${finalLedgerMax}, External: ${finalExternalMax}, Security: ${finalSecurityMax}`);
    
    if (!coreUrl) {
      console.warn('[DB] ⚠️ DATABASE_URL is missing. Operating in Degraded Mode (No DB).');
      pool = null;
      ledgerPool = null;
      externalPool = null;
      securityPool = null;
      return;
    }
    
    try {
      validateDatabaseUrl(coreUrl, 'DATABASE_URL');
      validateDatabaseUrl(finalLedgerUrl, 'LEDGER_DATABASE_URL');
      validateDatabaseUrl(finalExternalUrl, 'EXTERNAL_DATABASE_URL');
      validateDatabaseUrl(finalSecurityUrl, 'SECURITY_DATABASE_URL');
    } catch (validationError: any) {
      console.error(`[DB] Validation Failed: ${validationError.message}`);
      if (process.env.NODE_ENV === 'production' && coreUrl) {
        throw validationError;
      }
      pool = null;
      ledgerPool = null;
      externalPool = null;
      securityPool = null;
      return;
    }

    if (pool) {
      pool.end().catch((err: any) => console.error('[DB] Error closing old core pool:', err));
    }
    if (ledgerPool && ledgerPool !== pool) {
      ledgerPool.end().catch((err: any) => console.error('[DB] Error closing old ledger pool:', err));
    }
    if (externalPool && externalPool !== pool) {
      externalPool.end().catch((err: any) => console.error('[DB] Error closing old external pool:', err));
    }
    if (securityPool && securityPool !== pool) {
      securityPool.end().catch((err: any) => console.error('[DB] Error closing old security pool:', err));
    }

    const sslConfig = process.env.NODE_ENV === 'production' && process.env.DB_SSL_REQUIRED !== 'false'
      ? { rejectUnauthorized: false }
      : undefined;

    currentCoreUrl = coreUrl;
    currentLedgerUrl = finalLedgerUrl;
    currentExternalUrl = finalExternalUrl;
    currentSecurityUrl = finalSecurityUrl;
    currentCoreMaxPoolSize = finalCoreMax;
    currentLedgerMaxPoolSize = finalLedgerMax;
    currentExternalMaxPoolSize = finalExternalMax;
    currentSecurityMaxPoolSize = finalSecurityMax;

    try {
      pool = new Pool({
        connectionString: coreUrl,
        ssl: sslConfig,
        max: finalCoreMax,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 20000,
      });

      ledgerPool = finalLedgerUrl === coreUrl ? pool : new Pool({
        connectionString: finalLedgerUrl,
        ssl: sslConfig,
        max: finalLedgerMax,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 20000,
      });

      externalPool = finalExternalUrl === coreUrl ? pool : new Pool({
        connectionString: finalExternalUrl,
        ssl: sslConfig,
        max: finalExternalMax,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 20000,
      });

      securityPool = finalSecurityUrl === coreUrl ? pool : new Pool({
        connectionString: finalSecurityUrl,
        ssl: sslConfig,
        max: finalSecurityMax,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 20000,
      });

      // Maintain error event handlers for unexpected client connection crashes
      pool.on('error', (err: any) => {
        console.error('[DB] Unexpected error on idle core client:', err.message);
      });

      if (ledgerPool !== pool) {
        ledgerPool.on('error', (err: any) => {
          console.error('[DB] Unexpected error on idle ledger client:', err.message);
        });
      }

      if (externalPool !== pool) {
        externalPool.on('error', (err: any) => {
          console.error('[DB] Unexpected error on idle external client:', err.message);
        });
      }

      if (securityPool !== pool) {
        securityPool.on('error', (err: any) => {
          console.error('[DB] Unexpected error on idle security client:', err.message);
        });
      }

      console.log('[DB] Pools initiated successfully. Verifying connectivity...');
      try {
        const verifyPoolWithTimeout = async (p: any, name: string) => {
          let timeoutId: any;
          const timeoutPromise = new Promise((_, reject) => {
            timeoutId = setTimeout(() => reject(new Error(`${name} connection timeout (12s)`)), 12000);
          });
          
          try {
            await Promise.race([p.query('SELECT 1'), timeoutPromise]);
            clearTimeout(timeoutId);
            return true;
          } catch (err: any) {
            clearTimeout(timeoutId);
            console.log(`[DB] Warmup/Connectivity check for ${name} yielded: ${err.message}. Dynamic fallback will be applied.`);
            return false;
          }
        };

        const coreOk = await verifyPoolWithTimeout(pool, 'Core DB');
        if (coreOk) {
          console.log('[DB] Core PostgreSQL database connection verified successfully.');
        } else {
          console.error('[DB] ❌ Warning: Core Database is currently unreachable or slow to respond.');
        }

        if (ledgerPool && ledgerPool !== pool) {
          const ledgerOk = await verifyPoolWithTimeout(ledgerPool, 'Ledger DB');
          if (ledgerOk) {
            console.log('[DB] Ledger PostgreSQL database connection verified successfully.');
          } else {
            console.warn('[DB] Swapping Ledger Pool to point to Core Database Pool due to failure.');
            try { await ledgerPool.end(); } catch {}
            ledgerPool = pool;
          }
        } else {
          console.log('[DB] Ledger PostgreSQL is sharing the Core Database Pool connection.');
        }

        if (externalPool && externalPool !== pool) {
          const externalOk = await verifyPoolWithTimeout(externalPool, 'External DB');
          if (externalOk) {
            console.log('[DB] External PostgreSQL database connection verified successfully.');
          } else {
            console.warn('[DB] Swapping External Pool to point to Core Database Pool due to failure.');
            try { await externalPool.end(); } catch {}
            externalPool = pool;
          }
        } else {
          console.log('[DB] External PostgreSQL is sharing the Core Database Pool connection.');
        }

        if (securityPool && securityPool !== pool) {
          const securityOk = await verifyPoolWithTimeout(securityPool, 'Security DB');
          if (securityOk) {
            console.log('[DB] Security PostgreSQL database connection verified successfully.');
          } else {
            console.warn('[DB] Swapping Security Pool to point to Core Database Pool due to failure.');
            try { await securityPool.end(); } catch {}
            securityPool = pool;
          }
        } else {
          console.log('[DB] Security PostgreSQL is sharing the Core Database Pool connection.');
        }

        console.log('[DB] Perplexta Pools verification and seamless fallback assignment complete.');

      } catch (verifyError: any) {
        console.warn('[DB] ⚠️ Connectivity post-flight assessment returned error:', verifyError.message);
      }

    } catch (poolCreationError: any) {
      console.error('[DB] Critical error during Pool creation:', poolCreationError.message);
      if (process.env.NODE_ENV === 'production') {
        throw poolCreationError;
      }
      pool = null;
      ledgerPool = null;
      externalPool = null;
      securityPool = null;
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
    const result = await pool.query("SELECT * FROM db_connections_registry WHERE is_active = true AND id IN ('core', 'ledger', 'external', 'security')");
    
    if (result.rows.length === 0) {
      console.log('[DB] No active overrides found in registry. Checking if revert to ENV is needed...');
      const defaultCore = process.env.DATABASE_URL || '';
      const defaultLedger = process.env.LEDGER_DATABASE_URL || defaultCore;
      const defaultExternal = process.env.EXTERNAL_DATABASE_URL || defaultCore;
      const defaultSecurity = process.env.SECURITY_DATABASE_URL || defaultCore;
      
      const defaultCoreMax = Number(process.env.DB_CORE_MAX_POOL_SIZE || process.env.DB_CORE_MAX_CONNECTIONS || process.env.DB_MAX_CONNECTIONS) || 20;
      const defaultLedgerMax = Number(process.env.DB_LEDGER_MAX_POOL_SIZE || process.env.DB_LEDGER_MAX_CONNECTIONS || process.env.DB_MAX_CONNECTIONS || defaultCoreMax) || 20;
      const defaultExternalMax = Number(process.env.DB_EXTERNAL_MAX_POOL_SIZE || process.env.DB_EXTERNAL_MAX_CONNECTIONS || process.env.DB_MAX_CONNECTIONS || defaultCoreMax) || 20;
      const defaultSecurityMax = Number(process.env.DB_SECURITY_MAX_POOL_SIZE || process.env.DB_SECURITY_MAX_CONNECTIONS || process.env.DB_MAX_CONNECTIONS || defaultCoreMax) || 20;

      if (currentCoreUrl !== defaultCore || 
          currentLedgerUrl !== defaultLedger || 
          currentExternalUrl !== defaultExternal || 
          currentSecurityUrl !== defaultSecurity ||
          currentCoreMaxPoolSize !== defaultCoreMax ||
          currentLedgerMaxPoolSize !== defaultLedgerMax ||
          currentExternalMaxPoolSize !== defaultExternalMax ||
          currentSecurityMaxPoolSize !== defaultSecurityMax) {
        console.log('[DB] No active registry overrides. Reverting Perplexta Pools to environment defaults.');
        await initializePerplextaPools(
          defaultCore, 
          defaultLedger, 
          defaultExternal, 
          defaultSecurity,
          defaultCoreMax,
          defaultLedgerMax,
          defaultExternalMax,
          defaultSecurityMax
        );
      } else {
        console.log('[DB] No overrides found. Already using environment defaults.');
      }
      return;
    }

    const coreReg = result.rows.find((r: any) => r.id === 'core');
    const ledgerReg = result.rows.find((r: any) => r.id === 'ledger');
    const externalReg = result.rows.find((r: any) => r.id === 'external');
    const securityReg = result.rows.find((r: any) => r.id === 'security');

    const getUrlFromReg = (reg: any) => {
      if (!reg) return null;
      if (reg.connection_string) {
        try {
          return decrypt(reg.connection_string);
        } catch (e) {
          console.error('[DB] Failed to decrypt connection string for', reg.id);
          return null;
        }
      }
      if (reg.host) {
        const u = encodeURIComponent(reg.username || '');
        const p = reg.password ? encodeURIComponent(decrypt(reg.password)) : '';
        const port = reg.port || '5432';
        let url = `postgres://${u}:${p}@${reg.host}:${port}/${reg.db_name}`;
        if (reg.ssl_mode && reg.ssl_mode !== 'disable') {
          url += `?sslmode=${reg.ssl_mode}`;
        }
        return url;
      }
      return null;
    };

    let coreUrl = getUrlFromReg(coreReg) || process.env.DATABASE_URL || '';
    let ledgerUrl = getUrlFromReg(ledgerReg) || (process.env.LEDGER_DATABASE_URL || coreUrl);
    let externalUrl = getUrlFromReg(externalReg) || (process.env.EXTERNAL_DATABASE_URL || coreUrl);
    let securityUrl = getUrlFromReg(securityReg) || (process.env.SECURITY_DATABASE_URL || coreUrl);
    
    if (!coreUrl) return;

    const coreMax = Number(coreReg?.pool_size) || Number(process.env.DB_CORE_MAX_POOL_SIZE || process.env.DB_CORE_MAX_CONNECTIONS || process.env.DB_MAX_CONNECTIONS) || 20;
    const ledgerMax = Number(ledgerReg?.pool_size) || Number(process.env.DB_LEDGER_MAX_POOL_SIZE || process.env.DB_LEDGER_MAX_CONNECTIONS || process.env.DB_MAX_CONNECTIONS || coreMax) || 20;
    const externalMax = Number(externalReg?.pool_size) || Number(process.env.DB_EXTERNAL_MAX_POOL_SIZE || process.env.DB_EXTERNAL_MAX_CONNECTIONS || process.env.DB_MAX_CONNECTIONS || coreMax) || 20;
    const securityMax = Number(securityReg?.pool_size) || Number(process.env.DB_SECURITY_MAX_POOL_SIZE || process.env.DB_SECURITY_MAX_CONNECTIONS || process.env.DB_MAX_CONNECTIONS || coreMax) || 20;

    if (coreUrl === currentCoreUrl && 
        ledgerUrl === currentLedgerUrl && 
        externalUrl === currentExternalUrl && 
        securityUrl === currentSecurityUrl &&
        coreMax === currentCoreMaxPoolSize &&
        ledgerMax === currentLedgerMaxPoolSize &&
        externalMax === currentExternalMaxPoolSize &&
        securityMax === currentSecurityMaxPoolSize) {
      console.log('[DB] Synchronized: In-memory pools and sizes already match active configuration.');
      return;
    }

    console.log('[DB] Verifying registry connection strings for all 4 databases...');
    const testCorePool = createInternalPool(coreUrl);
    const testLedgerPool = createInternalPool(ledgerUrl);
    const testExternalPool = createInternalPool(externalUrl);
    const testSecurityPool = createInternalPool(securityUrl);

    try {
      await Promise.all([
        testCorePool.query('SELECT 1').catch((err) => { throw new Error(`Registry Core DB connection failed: ${err.message}`); }),
        testLedgerPool.query('SELECT 1').catch((err) => { throw new Error(`Registry Ledger DB connection failed: ${err.message}`); }),
        testExternalPool.query('SELECT 1').catch((err) => { throw new Error(`Registry External DB connection failed: ${err.message}`); }),
        testSecurityPool.query('SELECT 1').catch((err) => { throw new Error(`Registry Security DB connection failed: ${err.message}`); }),
      ]);
    } catch (testErr: any) {
      console.warn(`[DB] Registry verification failed: ${testErr.message}. Aborting synchronization.`);
      await Promise.all([
        testCorePool.end().catch(() => {}),
        testLedgerPool.end().catch(() => {}),
        testExternalPool.end().catch(() => {}),
        testSecurityPool.end().catch(() => {}),
      ]);
      return;
    }

    await Promise.all([
      testCorePool.end().catch(() => {}),
      testLedgerPool.end().catch(() => {}),
      testExternalPool.end().catch(() => {}),
      testSecurityPool.end().catch(() => {}),
    ]);

    console.log('[DB] Registry connections verified. Swapping pools...');
    await initializePerplextaPools(
      coreUrl, 
      ledgerUrl || coreUrl, 
      externalUrl || coreUrl, 
      securityUrl || coreUrl,
      coreMax,
      ledgerMax,
      externalMax,
      securityMax
    );
    console.log('[DB] Perplexta Pools synchronized with active registry configuration.');
  } catch (syncErr: any) {
    console.warn('[DB] Registry synchronization skipped:', syncErr.message);
  }
}

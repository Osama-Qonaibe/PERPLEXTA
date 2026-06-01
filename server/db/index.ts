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

export async function initializePerplextaPools(coreUrl: string, ledgerUrl: string, externalUrl?: string, securityUrl?: string) {
  const redactedUrl = (url: string) => {
    try {
      const u = new URL(url);
      u.password = '****';
      return u.toString();
    } catch {
      return 'invalid-url';
    }
  };

  console.log(`[DB] Initializing Perplexta Pools...`);
  if (coreUrl) console.log(`[DB] Core Target: ${redactedUrl(coreUrl)}`);
  
  if (!coreUrl) {
    console.warn('[DB] ⚠️ DATABASE_URL is missing. Operating in Degraded Mode (No DB).');
    pool = null;
    ledgerPool = null;
    externalPool = null;
    securityPool = null;
    return;
  }

  const finalLedgerUrl = ledgerUrl || coreUrl;
  const finalExternalUrl = externalUrl || coreUrl;
  const finalSecurityUrl = securityUrl || coreUrl;
  
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

  try {
    pool = new Pool({
      connectionString: coreUrl,
      ssl: sslConfig,
      max: Number(process.env.DB_MAX_CONNECTIONS) || 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 4000,
    });

    ledgerPool = finalLedgerUrl === coreUrl ? pool : new Pool({
      connectionString: finalLedgerUrl,
      ssl: sslConfig,
      max: Number(process.env.DB_MAX_CONNECTIONS) || 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 4000,
    });

    externalPool = finalExternalUrl === coreUrl ? pool : new Pool({
      connectionString: finalExternalUrl,
      ssl: sslConfig,
      max: Number(process.env.DB_MAX_CONNECTIONS) || 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 4000,
    });

    securityPool = finalSecurityUrl === coreUrl ? pool : new Pool({
      connectionString: finalSecurityUrl,
      ssl: sslConfig,
      max: Number(process.env.DB_MAX_CONNECTIONS) || 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 4000,
    });

    pool.on('connect', () => console.log('[DB] Core PostgreSQL connected successfully.'));
    
    if (ledgerPool !== pool) {
      ledgerPool.on('connect', () => console.log('[DB] Ledger PostgreSQL connected successfully.'));
      ledgerPool.on('error', (err: any) => {
        console.error('[DB] Unexpected error on idle ledger client:', err.message);
      });
    }

    if (externalPool !== pool) {
      externalPool.on('connect', () => console.log('[DB] External Categories PostgreSQL connected successfully.'));
      externalPool.on('error', (err: any) => {
        console.error('[DB] Unexpected error on idle external client:', err.message);
      });
    }

    if (securityPool !== pool) {
      securityPool.on('connect', () => console.log('[DB] Security PostgreSQL connected successfully.'));
      securityPool.on('error', (err: any) => {
        console.error('[DB] Unexpected error on idle security client:', err.message);
      });
    }
    
    pool.on('error', (err: any) => {
      console.error('[DB] Unexpected error on idle core client:', err.message);
    });

    console.log('[DB] Verifying connectivity individually...');
    try {
      await pool.query('SELECT 1');
      console.log('[DB] Core PostgreSQL is healthy.');
    } catch (coreErr: any) {
      console.error('[DB] 🚨 Core PostgreSQL failed connection check:', coreErr.message);
    }

    if (ledgerPool && ledgerPool !== pool) {
      try {
        await ledgerPool.query('SELECT 1');
        console.log('[DB] Ledger PostgreSQL is healthy.');
      } catch (ledgerErr: any) {
        console.warn('[DB] ⚠️ Ledger database failed connection check. Falling back to Core pool immediately (0ms delay):', ledgerErr.message);
        ledgerPool = pool;
      }
    }

    if (externalPool && externalPool !== pool) {
      try {
        await externalPool.query('SELECT 1');
        console.log('[DB] External PostgreSQL is healthy.');
      } catch (externalErr: any) {
        console.warn('[DB] ⚠️ External database failed connection check. Falling back to Core pool immediately (0ms delay):', externalErr.message);
        externalPool = pool;
      }
    }

    if (securityPool && securityPool !== pool) {
      try {
        await securityPool.query('SELECT 1');
        console.log('[DB] Security PostgreSQL is healthy.');
      } catch (securityErr: any) {
        console.warn('[DB] ⚠️ Security database failed connection check. Falling back to Core pool immediately (0ms delay):', securityErr.message);
        securityPool = pool;
      }
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
      
      if (currentCoreUrl !== defaultCore || currentLedgerUrl !== defaultLedger || currentExternalUrl !== defaultExternal || currentSecurityUrl !== defaultSecurity) {
        console.log('[DB] No active registry overrides. Reverting Perplexta Pools to environment defaults.');
        await initializePerplextaPools(defaultCore, defaultLedger, defaultExternal, defaultSecurity);
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

    if (coreUrl === currentCoreUrl && ledgerUrl === currentLedgerUrl && externalUrl === currentExternalUrl && securityUrl === currentSecurityUrl) {
      console.log('[DB] Synchronized: In-memory pools already match active configuration.');
      return;
    }

    console.log('[DB] Verifying registry connection strings for all 4 databases...');
    const testCorePool = createInternalPool(coreUrl);
    const testLedgerPool = createInternalPool(ledgerUrl);
    const testExternalPool = createInternalPool(externalUrl);
    const testSecurityPool = createInternalPool(securityUrl);

    try {
      await testCorePool.query('SELECT 1');
    } catch (testErr: any) {
      console.warn(`[DB] Registry Core DB connection failed: ${testErr.message}. Aborting synchronization.`);
      await Promise.all([
        testCorePool.end().catch(() => {}),
        testLedgerPool.end().catch(() => {}),
        testExternalPool.end().catch(() => {}),
        testSecurityPool.end().catch(() => {}),
      ]);
      return;
    }

    try {
      await testLedgerPool.query('SELECT 1');
    } catch (testErr: any) {
      console.warn(`[DB] Registry Ledger DB connection failed: ${testErr.message}. Aborting synchronization.`);
      await Promise.all([
        testCorePool.end().catch(() => {}),
        testLedgerPool.end().catch(() => {}),
        testExternalPool.end().catch(() => {}),
        testSecurityPool.end().catch(() => {}),
      ]);
      return;
    }

    try {
      await testExternalPool.query('SELECT 1');
    } catch (testErr: any) {
      console.warn(`[DB] Registry External DB connection failed: ${testErr.message}. Aborting synchronization.`);
      await Promise.all([
        testCorePool.end().catch(() => {}),
        testLedgerPool.end().catch(() => {}),
        testExternalPool.end().catch(() => {}),
        testSecurityPool.end().catch(() => {}),
      ]);
      return;
    }

    try {
      await testSecurityPool.query('SELECT 1');
    } catch (testErr: any) {
      console.warn(`[DB] Registry Security DB connection failed: ${testErr.message}. Aborting synchronization.`);
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
    await initializePerplextaPools(coreUrl, ledgerUrl || coreUrl, externalUrl || coreUrl, securityUrl || coreUrl);
    console.log('[DB] Perplexta Pools synchronized with active registry configuration.');
  } catch (syncErr: any) {
    console.warn('[DB] Registry synchronization skipped:', syncErr.message);
  }
}

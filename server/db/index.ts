import pkg from 'pg';
const { Pool } = pkg;
import { encrypt, decrypt } from "../utils/crypto.js";

export let pool: any;
export let ledgerPool: any;
let currentCoreUrl: string = '';
let currentLedgerUrl: string = '';

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

export async function initializeSovereignPools(coreUrl: string, ledgerUrl: string) {
  const redactedUrl = (url: string) => {
    try {
      const u = new URL(url);
      u.password = '****';
      return u.toString();
    } catch {
      return 'invalid-url';
    }
  };

  console.log(`[DB] initializing Sovereign Pools...`);
  if (coreUrl) console.log(`[DB] Core Target: ${redactedUrl(coreUrl)}`);
  
  if (!coreUrl) {
    console.warn('[DB] ⚠️ DATABASE_URL is missing. Operating in Degraded Mode (No DB).');
    pool = null;
    ledgerPool = null;
    return;
  }

  const finalLedgerUrl = ledgerUrl || coreUrl;
  
  try {
    validateDatabaseUrl(coreUrl, 'DATABASE_URL');
    validateDatabaseUrl(finalLedgerUrl, 'LEDGER_DATABASE_URL');
  } catch (validationError: any) {
    console.error(`[DB] Validation Failed: ${validationError.message}`);
    if (process.env.NODE_ENV === 'production' && coreUrl) {
      throw validationError;
    }
    pool = null;
    ledgerPool = null;
    return;
  }

  if (pool) {
    pool.end().catch((err: any) => console.error('[DB] Error closing old core pool:', err));
  }
  if (ledgerPool) {
    ledgerPool.end().catch((err: any) => console.error('[DB] Error closing old ledger pool:', err));
  }

  const sslConfig = process.env.NODE_ENV === 'production' && process.env.DB_SSL_REQUIRED !== 'false'
    ? { rejectUnauthorized: false }
    : undefined;

  currentCoreUrl = coreUrl;
  currentLedgerUrl = finalLedgerUrl;

  try {
    pool = new Pool({
      connectionString: coreUrl,
      ssl: sslConfig,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 15000,
    });

    ledgerPool = new Pool({
      connectionString: finalLedgerUrl,
      ssl: sslConfig,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 15000,
    });

    pool.on('connect', () => console.log('[DB] Core PostgreSQL connected successfully.'));
    ledgerPool.on('connect', () => console.log('[DB] Ledger PostgreSQL connected successfully.'));
    
    pool.on('error', (err: any) => {
      console.error('[DB] Unexpected error on idle core client:', err.message);
    });

    ledgerPool.on('error', (err: any) => {
      console.error('[DB] Unexpected error on idle ledger client:', err.message);
    });

    console.log('[DB] Verifying connectivity...');
    await Promise.all([
      pool.query('SELECT 1'),
      ledgerPool.query('SELECT 1')
    ]);
    console.log('[DB] Sovereign Pools verified and active.');

  } catch (poolCreationError: any) {
    console.error('[DB] Critical error during Pool creation:', poolCreationError.message);
    if (process.env.NODE_ENV === 'production') {
      throw poolCreationError;
    }
    pool = null;
    ledgerPool = null;
  }
}

export async function synchronizeSovereignPoolsFromRegistry() {
  if (!pool) return;
  console.log('[DB] Checking for active remote database overrides...');
  
  try {
    const result = await pool.query("SELECT * FROM db_connections_registry WHERE is_active = true AND id IN ('core', 'ledger')");
    
    if (result.rows.length === 0) {
      console.log('[DB] No active overrides found in registry. Checking if revert to ENV is needed...');
      const defaultCore = process.env.DATABASE_URL || '';
      const defaultLedger = process.env.LEDGER_DATABASE_URL || defaultCore;
      
      if (currentCoreUrl !== defaultCore || currentLedgerUrl !== defaultLedger) {
        console.log('[DB] No active registry overrides. Reverting Sovereign Pools to environment defaults.');
        await initializeSovereignPools(defaultCore, defaultLedger);
      } else {
        console.log('[DB] No overrides found. Already using environment defaults.');
      }
      return;
    }

    const coreReg = result.rows.find((r: any) => r.id === 'core');
    const ledgerReg = result.rows.find((r: any) => r.id === 'ledger');

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

    let coreUrl = getUrlFromReg(coreReg) || process.env.DATABASE_URL;
    let ledgerUrl = getUrlFromReg(ledgerReg) || (process.env.LEDGER_DATABASE_URL || coreUrl);
    
    if (!coreUrl) return;

    if (coreUrl === currentCoreUrl && ledgerUrl === currentLedgerUrl) {
      console.log('[DB] Synchronized: In-memory pools already match active configuration.');
      return;
    }

    console.log('[DB] Verifying registry connection strings...');
    const testCorePool = createInternalPool(coreUrl);
    try {
      await testCorePool.query('SELECT 1');
      await testCorePool.end();
    } catch (testErr: any) {
      console.warn(`[DB] Registry Core DB connection failed: ${testErr.message}. Falling back to environment.`);
      await testCorePool.end().catch(() => {});
      return;
    }

    console.log('[DB] Registry connections verified. Swapping pools...');
    await initializeSovereignPools(coreUrl, ledgerUrl || coreUrl);
    console.log('[DB] Sovereign Pools synchronized with active registry configuration.');
  } catch (syncErr: any) {
    console.warn('[DB] Registry synchronization skipped:', syncErr.message);
  }
}

import pkg from 'pg';
const { Pool } = pkg;

export let pool: any;
export let ledgerPool: any;

function validateDatabaseUrl(url: string, name: string) {
  if (!url) {
    throw new Error(`[DB] ${name} environment variable is missing.`);
  }
  const regex = /^postgres(ql)?:\/\//;
  if (!regex.test(url)) {
    throw new Error(
      `[DB] Invalid ${name} format. Expected connection string to start with "postgresql://" or "postgres://", but received: "${url.substring(0, 25)}..."`
    );
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

export function initializeSovereignPools(coreUrl: string, ledgerUrl: string) {
  console.log(`[DB] Re-initializing Sovereign Pools...`);
  
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
  } catch (poolCreationError: any) {
    console.error('[DB] Critical error during Pool creation:', poolCreationError.message);
    if (process.env.NODE_ENV === 'production') {
      throw poolCreationError;
    }
    pool = null;
    ledgerPool = null;
  }
}

initializeSovereignPools(
  process.env.DATABASE_URL || '', 
  process.env.LEDGER_DATABASE_URL || ''
);

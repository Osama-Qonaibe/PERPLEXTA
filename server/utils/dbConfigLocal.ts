import fs from 'fs';
import path from 'path';
import { decrypt, encrypt } from './crypto.js';

const CONFIG_PATH = path.join(process.cwd(), 'server', 'config', 'db_connections.json');

export interface DbConfigRecord {
  id: string;
  type: string;
  host: string | null;
  port: string | null;
  db_name: string | null;
  username: string | null;
  password?: string | null; // Encrypted
  connection_string?: string | null; // Encrypted
  ssl_mode: string | null;
  pool_size: number;
  is_active: boolean;
}

/**
 * Reads local database connection configurations from disk.
 */
export function readLocalDbConfigs(): DbConfigRecord[] {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const data = fs.readFileSync(CONFIG_PATH, 'utf8');
      return JSON.parse(data);
    }
  } catch (err: any) {
    console.warn('[dbConfigLocal] Failed to read local db_connections.json:', err.message);
  }
  return [];
}

/**
 * Writes local database connection configurations to disk.
 */
export function writeLocalDbConfigs(configs: DbConfigRecord[]): void {
  try {
    const dir = path.dirname(CONFIG_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(configs, null, 2), 'utf8');
    console.log('[dbConfigLocal] Successfully updated db_connections.json on disk.');
  } catch (err: any) {
    console.error('[dbConfigLocal] Failed to write db_connections.json:', err.message);
  }
}

/**
 * Saves or updates a single database configuration in the local file.
 */
export function saveLocalDbConfig(id: string, config: any, is_active: boolean): void {
  const configs = readLocalDbConfigs();
  const existingIndex = configs.findIndex(c => c.id === id);

  const body = config.config || config;
  const db_name = body.db_name || body.dbName || null;
  const connection_string = body.connection_string || body.connectionString || null;
  const ssl_mode = body.ssl_mode || body.sslMode || 'disable';
  const pool_size = Number(body.pool_size || body.poolSize || 10);

  const encryptedPassword = body.password ? encrypt(body.password) : null;
  const encryptedConnString = connection_string ? encrypt(connection_string) : null;

  const newRecord: DbConfigRecord = {
    id,
    type: body.type || 'local',
    host: body.host || null,
    port: String(body.port || '5432'),
    db_name,
    username: body.username || null,
    password: encryptedPassword,
    connection_string: encryptedConnString,
    ssl_mode,
    pool_size,
    is_active
  };

  if (existingIndex >= 0) {
    // Preserve existing password or connection string if not provided
    if (!body.password && configs[existingIndex].password) {
      newRecord.password = configs[existingIndex].password;
    }
    if (!connection_string && configs[existingIndex].connection_string) {
      newRecord.connection_string = configs[existingIndex].connection_string;
    }
    configs[existingIndex] = newRecord;
  } else {
    configs.push(newRecord);
  }

  writeLocalDbConfigs(configs);
}

/**
 * Returns connection parameters or string resolved from local file if active override exists.
 */
export function getOverriddenUrlsFromLocal() {
  const configs = readLocalDbConfigs();
  const activeConfigs = configs.filter(c => c.is_active);

  const coreReg = activeConfigs.find(c => c.id === 'core');
  const ledgerReg = activeConfigs.find(c => c.id === 'ledger');
  const externalReg = activeConfigs.find(c => c.id === 'external');
  const securityReg = activeConfigs.find(c => c.id === 'security');

  const safeDecrypt = (val: any): string => {
    if (!val) return '';
    try {
      const res = decrypt(typeof val === 'string' ? val : String(val));
      return typeof res === 'string' ? res : String(res || '');
    } catch {
      return typeof val === 'string' ? val : String(val || '');
    }
  };

  const getUrlFromReg = (reg: DbConfigRecord | undefined, fallback: string): string => {
    if (!reg) return fallback;
    const type = reg.type || 'local';
    if (type === 'cloud' && reg.connection_string) {
      const decrypted = safeDecrypt(reg.connection_string);
      if (decrypted && decrypted.trim() !== '') return decrypted;
    }
    if (reg.host) {
      const u = encodeURIComponent(reg.username || '');
      const rawPass = safeDecrypt(reg.password);
      const p = rawPass ? encodeURIComponent(rawPass) : '';
      const port = reg.port || '5432';
      const connBase = `postgres://${u}${p ? `:${p}` : ''}@${reg.host}:${port}/${reg.db_name}`;
      return reg.ssl_mode && reg.ssl_mode !== 'disable' ? `${connBase}?sslmode=${reg.ssl_mode}` : connBase;
    }
    return fallback;
  };

  const defaultCore = process.env.DATABASE_URL || '';
  const defaultLedger = process.env.LEDGER_DATABASE_URL || defaultCore;
  const defaultExternal = process.env.EXTERNAL_DATABASE_URL || defaultCore;
  const defaultSecurity = process.env.SECURITY_DATABASE_URL || defaultCore;

  return {
    coreUrl: getUrlFromReg(coreReg, defaultCore),
    ledgerUrl: getUrlFromReg(ledgerReg, defaultLedger),
    externalUrl: getUrlFromReg(externalReg, defaultExternal),
    securityUrl: getUrlFromReg(securityReg, defaultSecurity),
    coreMax: coreReg?.pool_size || null,
    ledgerMax: ledgerReg?.pool_size || null,
    externalMax: externalReg?.pool_size || null,
    securityMax: securityReg?.pool_size || null
  };
}

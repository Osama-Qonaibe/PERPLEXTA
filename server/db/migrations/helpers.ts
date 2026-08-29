import type { Pool as PgPool, PoolClient as PgPoolClient } from 'pg';
import { pool } from '../index.js';
import { decrypt } from '../../utils/crypto.js';
import type { QueryClient } from './types.js';

export function isValidIdentifier(name: string): boolean {
  return /^[a-zA-Z_][a-zA-Z0-9_$]*$/.test(name) && name.length <= 63;
}

export function isValidDataType(type: string): boolean {
  const baseType = type.split('(')[0].trim().toUpperCase();
  const validTypes = [
    'INT', 'INTEGER', 'BIGINT', 'SMALLINT', 'DECIMAL', 'NUMERIC',
    'VARCHAR', 'CHAR', 'TEXT', 'JSONB', 'JSON', 'BOOLEAN', 'BOOL',
    'TIMESTAMP', 'TIMESTAMPTZ', 'DATE', 'TIME', 'TIMETZ', 'UUID',
    'SERIAL', 'BIGSERIAL', 'SMALLSERIAL',
    'INT[]', 'INTEGER[]', 'BIGINT[]', 'TEXT[]', 'VARCHAR[]', 'JSONB[]',
    'REAL', 'FLOAT', 'DOUBLE PRECISION', 'MONEY', 'BYTEA', 'INET'
  ];
  return validTypes.some(vt => baseType === vt || baseType.startsWith(vt + '('));
}

export function sanitizeForLogging(data: any): any {
  const sensitiveKeys = ['password', 'secret', 'token', 'key', 'hash', 'credit', 'iban', 'swift', 'connection_string'];
  if (data === null || data === undefined) return data;
  if (Array.isArray(data)) return data.map(sanitizeForLogging);
  if (typeof data === 'object') {
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (sensitiveKeys.some(k => key.toLowerCase().includes(k))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object') {
        sanitized[key] = sanitizeForLogging(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }
  if (typeof data === 'string' && sensitiveKeys.some(k => data.toLowerCase().includes(k))) {
    return '[REDACTED]';
  }
  return data;
}

export function safelyDecryptConnectionString(encrypted: string): string {
  try {
    const decrypted = decrypt(encrypted);
    if (!decrypted || decrypted.trim() === '') {
      throw new Error('Empty decryption result');
    }
    return decrypted;
  } catch (error) {
    console.error('[Security] Failed to decrypt connection string:', {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw new Error('Failed to decrypt connection string');
  }
}

export async function connectToPool(poolObj: PgPool | null, name: string): Promise<PgPoolClient | null> {
  if (!poolObj) return null;
  try {
    const client = await poolObj.connect();
    console.log(`[Migrations] Connected to ${name} DB`);
    return client;
  } catch (error) {
    console.warn(`[Migrations] Failed to connect to ${name} DB:`, error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}

export async function safeQueryClient(clientObj: PgPoolClient | null, fallbackClient: PgPoolClient, queryText: string, params?: any[]): Promise<any> {
  const target = clientObj || fallbackClient;
  try {
    return await target.query(queryText, params);
  } catch (err: any) {
    const msg = err?.message || String(err);
    if (/not queryable|connection error|terminated unexpectedly|ECONNRESET|ETIMEDOUT|closed/i.test(msg) && target !== fallbackClient) {
      return await fallbackClient.query(queryText, params);
    }
    throw err;
  }
}

export async function tableExists(poolObj: QueryClient, tableName: string): Promise<boolean> {
  try {
    const result = await poolObj.query(
      `SELECT 1 FROM information_schema.tables WHERE table_name = $1 AND table_schema = 'public'`,
      [tableName]
    );
    return result.rows.length > 0;
  } catch {
    return false;
  }
}

export async function columnExists(poolObj: QueryClient, tableName: string, columnName: string): Promise<boolean> {
  try {
    const result = await poolObj.query(
      `SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2 AND table_schema = 'public'`,
      [tableName, columnName]
    );
    return result.rows.length > 0;
  } catch {
    return false;
  }
}

export async function constraintExists(poolObj: QueryClient, tableName: string, constraintName: string): Promise<boolean> {
  try {
    const result = await poolObj.query(
      `SELECT 1 FROM information_schema.table_constraints WHERE table_name = $1 AND constraint_name = $2 AND constraint_schema = 'public'`,
      [tableName, constraintName]
    );
    return result.rows.length > 0;
  } catch {
    return false;
  }
}

export function formatDefaultValue(val: string | number | boolean | null | undefined): string | null {
  if (val === undefined || val === null) return null;
  if (typeof val === 'number' || typeof val === 'boolean') {
    return String(val);
  }
  const str = String(val).trim();
  if (str.length === 0) return "''";
  
  if (str.startsWith("'") && str.endsWith("'") && str.length >= 2) {
    return str;
  }
  
  const upper = str.toUpperCase();
  if (
    upper === 'CURRENT_TIMESTAMP' ||
    upper === 'NOW()' ||
    upper === 'CURRENT_DATE' ||
    upper === 'CURRENT_TIME' ||
    upper === 'NULL' ||
    upper === 'TRUE' ||
    upper === 'FALSE' ||
    upper.startsWith('ARRAY[') ||
    upper.startsWith('ARRAY []') ||
    upper.startsWith('NOW() AT TIME ZONE') ||
    /^-?\d+(\.\d+)?$/.test(str)
  ) {
    return str;
  }
  
  return `'${str.replace(/'/g, "''")}'`;
}

export async function ensureColumnsBulk(
  poolObj: QueryClient,
  tableName: string,
  columns: Record<string, { type: string; default?: string | number | boolean | null }>
) {
  if (!isValidIdentifier(tableName)) {
    throw new Error(`Invalid table name: ${tableName}`);
  }
  const isClient = 'release' in poolObj && typeof poolObj.release === 'function';
  const client = isClient ? (poolObj as PgPoolClient) : await (poolObj as PgPool).connect();
  try {
    if (!isClient) await client.query('BEGIN');
    const tableCheck = await client.query(
      `SELECT 1 FROM information_schema.tables WHERE table_name = $1 AND table_schema = 'public'`,
      [tableName]
    );
    if (tableCheck.rows.length === 0) {
      console.warn(`[Database] Table "${tableName}" does not exist on target database for ensureColumnsBulk. Skipping.`);
      if (!isClient) await client.query('COMMIT');
      return;
    }
    const existing = await client.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND table_schema = 'public'`,
      [tableName]
    );
    const existingSet = new Set(existing.rows.map(r => r.column_name));
    const missing = Object.entries(columns)
      .filter(([col]) => !existingSet.has(col))
      .filter(([col]) => isValidIdentifier(col));
    if (missing.length === 0) {
      if (!isClient) await client.query('COMMIT');
      return;
    }
    const alterParts: string[] = [];
    for (const [col, config] of missing) {
      if (!isValidDataType(config.type)) {
        throw new Error(`Invalid data type for column ${col}: ${config.type}`);
      }
      let part = `ADD COLUMN "${col}" ${config.type}`;
      if (config.default !== undefined && config.default !== null) {
        const formattedDefault = formatDefaultValue(config.default);
        if (formattedDefault !== null) {
          part += ` DEFAULT ${formattedDefault}`;
        }
      }
      alterParts.push(part);
    }
    await client.query(`ALTER TABLE "${tableName}" ${alterParts.join(', ')}`);
    console.log(`[Database] Added columns ${missing.map(([col]) => col).join(', ')} to ${tableName}`);
    if (!isClient) await client.query('COMMIT');
  } catch (error) {
    if (!isClient) await client.query('ROLLBACK');
    const err = error as Error & { code?: string };
    console.error(`[Database] ERROR in ensureColumnsBulk (${tableName}):`, err.message);
    try {
      if (pool) {
        await pool.query(`
          INSERT INTO migration_security_audit (migration_name, status, error_message, sql_state, details)
          VALUES ($1, 'conflict', $2, $3, $4)
        `, [
          `ensureColumnsBulk_${tableName}`,
          err.message || 'Unknown error',
          err.code || null,
          JSON.stringify(sanitizeForLogging({ tableName, columns: Object.keys(columns) }))
        ]);
      }
    } catch {
      // Ignore secondary audit failure
    }
    throw error;
  } finally {
    if (!isClient) (client as PgPoolClient).release();
  }
}

export async function ensureForeignKey(
  poolObj: QueryClient,
  tableName: string,
  constraintName: string,
  columnName: string,
  referencedTable: string,
  referencedColumn: string = 'id',
  onDelete: string = 'CASCADE'
) {
  if (!isValidIdentifier(tableName) || !isValidIdentifier(constraintName) || !isValidIdentifier(columnName) || !isValidIdentifier(referencedTable) || !isValidIdentifier(referencedColumn)) {
    console.error(`[Schema] Invalid identifiers for foreign key ${constraintName}`);
    return;
  }
  const validOnDelete = ['CASCADE', 'SET NULL', 'RESTRICT', 'NO ACTION', 'SET DEFAULT'];
  const safeOnDelete = validOnDelete.includes(onDelete.toUpperCase()) ? onDelete.toUpperCase() : 'CASCADE';
  try {
    const exists = await constraintExists(poolObj, tableName, constraintName);
    if (exists) return;
    const tableExistsResult = await tableExists(poolObj, referencedTable);
    if (!tableExistsResult) {
      console.warn(`[Schema] Skipping foreign key ${constraintName}: referenced table ${referencedTable} doesn't exist`);
      return;
    }
    const columnExistsResult = await columnExists(poolObj, tableName, columnName);
    if (!columnExistsResult) {
      console.warn(`[Schema] Skipping foreign key ${constraintName}: column ${tableName}.${columnName} doesn't exist`);
      return;
    }
    const violations = await poolObj.query(
      `SELECT COUNT(*) FROM "${tableName}" t 
        LEFT JOIN "${referencedTable}" r ON r."${referencedColumn}" = t."${columnName}"
       WHERE t."${columnName}" IS NOT NULL AND r."${referencedColumn}" IS NULL`
    );
    if (parseInt(violations.rows[0].count, 10) > 0) {
      console.warn(`[Schema] ${violations.rows[0].count} violations found for foreign key ${constraintName}`);
      await poolObj.query(
        `UPDATE "${tableName}" SET "${columnName}" = NULL 
          WHERE "${columnName}" IS NOT NULL 
          AND "${columnName}" NOT IN (SELECT "${referencedColumn}" FROM "${referencedTable}")`
      );
    }
    await poolObj.query(
      `ALTER TABLE "${tableName}" 
        ADD CONSTRAINT "${constraintName}" 
        FOREIGN KEY ("${columnName}") 
        REFERENCES "${referencedTable}"("${referencedColumn}") 
        ON DELETE ${safeOnDelete}`
    );
    console.log(`[Schema] Added foreign key ${constraintName}`);
  } catch (error) {
    console.error(`[Schema] Failed to add foreign key ${constraintName}:`, error instanceof Error ? error.message : 'Unknown error');
  }
}

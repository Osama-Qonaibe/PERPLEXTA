import pkg from 'pg';
const { Pool } = pkg;
import type { Pool as PgPool, PoolClient as PgPoolClient } from 'pg';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { pool, ledgerPool, externalPool, securityPool, getExternalPool, getSecurityPool, initializePerplextaPools, createInternalPool } from './index.js';
import { encrypt, decrypt } from '../utils/crypto.js';
import { syncAllContentSeoMetadata } from '../services/seoSync.js';

/**
 * TABLE_POOL_REGISTRY: Single Source of Truth for Database Table Allocation
 * 
 * Architectural Allocation Decisions:
 * 1. Core Pool ('core'): Holds operational entities (users, chats, advertisements, bulletin board, marketplace).
 *    - Note: bulletin_* and marketplace_* belong to 'core' because they hold direct FK relations and transactional constraints with 'users'.
 * 2. Ledger Pool ('ledger'): Holds financial audit ledger entities (wallets, transactions, referrals, KYC, coupons).
 * 3. External Pool ('external'): Holds secondary content entities (blog articles, ratings).
 * 4. Security Pool ('security'): Holds threat monitoring and security logging entities.
 * 
 * MULTI-POOL QUERY RULE:
 * Queries MUST NOT perform direct SQL JOINs across different physical database pools.
 * Cross-pool data aggregation (e.g., combining ledger_transactions with user profiles) MUST be performed
 * at the application service level by making separate pool queries and merging results in TypeScript.
 */
export const TABLE_POOL_REGISTRY: Record<string, 'core' | 'ledger' | 'external' | 'security'> = {
  // Core Database
  users: 'core',
  user_sessions: 'core',
  chats: 'core',
  messages: 'core',
  api_keys_vault: 'core',
  tool_orchestrator: 'core',
  subscriptions: 'core',
  plans: 'core',
  user_usage: 'core',
  notifications: 'core',
  chat_memories: 'core',
  email_templates: 'core',
  email_settings: 'core',
  message_reports: 'core',
  user_shortcuts: 'core',
  system_settings: 'core',
  system_broadcasts: 'core',
  user_files: 'core',
  system_logs: 'core',
  password_resets: 'core',
  support_tickets: 'core',
  support_ticket_replies: 'core',
  oauth_states: 'core',
  marketplace_items: 'core',
  marketplace_purchases: 'core',
  marketplace_reviews: 'core',
  video_resources: 'core',
  referral_invitations: 'core',
  shared_snapshots: 'core',
  advertisements: 'core',
  bulletin_ads: 'core',
  bulletin_saved_ads: 'core',
  bulletin_reports: 'core',
  bulletin_pages: 'core',
  bulletin_page_followers: 'core',
  bulletin_page_inquiries: 'core',
  bulletin_ad_likes: 'core',
  bulletin_ad_comments: 'core',
  bulletin_ad_messages: 'core',
  route_seo_settings: 'core',
  asset_metadata: 'core',
  user_recommendation_interactions: 'core',
  user_recommendation_preferences: 'core',
  recommendation_feedback: 'core',
  gift_catalog: 'core',
  google_tool_connections: 'core',
  db_connections_registry: 'core',
  migration_history: 'core',

  // Ledger Database
  wallets: 'ledger',
  ledger_transactions: 'ledger',
  referrals: 'ledger',
  referral_tree: 'ledger',
  kyc_requests: 'ledger',
  withdrawal_requests: 'ledger',
  payout_accounts: 'ledger',
  economy_settings: 'ledger',
  coupon_usages: 'ledger',
  deposit_requests: 'ledger',
  coupons: 'ledger',
  stripe_events: 'ledger',

  // External Database
  blog_articles: 'external',
  blog_comments: 'external',
  blog_ratings: 'external',

  // Security Database
  token_blacklist: 'security',
  security_alerts: 'security',
  admin_audit_logs: 'security',
  registered_agents: 'security',
};

/**
 * Hash a string deterministically to a signed 32-bit integer for PostgreSQL pg_advisory_lock
 */
export function hashStringToAdvisoryLockKey(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash | 0; // Convert to signed 32-bit integer
}

export type QueryClient = any;

export interface WrappedClient {
  release: () => void;
  query: (text: string | { text: string }, params?: any[]) => Promise<any>;
};

function isValidIdentifier(name: string): boolean {
  return /^[a-zA-Z_][a-zA-Z0-9_$]*$/.test(name) && name.length <= 63;
}

function isValidDataType(type: string): boolean {
  const baseType = type.split('(')[0].toUpperCase();
  const validTypes = [
    'INTEGER', 'BIGINT', 'SMALLINT', 'DECIMAL', 'NUMERIC',
    'VARCHAR', 'CHAR', 'TEXT', 'JSONB', 'JSON', 'BOOLEAN',
    'TIMESTAMP', 'DATE', 'TIME', 'UUID', 'SERIAL', 'BIGSERIAL',
    'INT[]', 'TEXT[]', 'VARCHAR[]', 'JSONB[]',
    'NUMERIC', 'REAL', 'DOUBLE PRECISION', 'MONEY'
  ];
  return validTypes.some(vt => baseType === vt || baseType.startsWith(vt + '('));
}

function sanitizeForLogging(data: any): any {
  const sensitiveKeys = ['password', 'secret', 'token', 'key', 'hash', 'credit', 'iban', 'swift', 'connection_string'];
  if (typeof data === 'object' && data !== null) {
    const sanitized = { ...data };
    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some(k => key.toLowerCase().includes(k))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof sanitized[key] === 'object') {
        sanitized[key] = sanitizeForLogging(sanitized[key]);
      }
    }
    return sanitized;
  }
  if (typeof data === 'string' && sensitiveKeys.some(k => data.toLowerCase().includes(k))) {
    return '[REDACTED]';
  }
  return data;
}

function safelyDecryptConnectionString(encrypted: string): string {
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

async function connectToPool(poolObj: PgPool | null, name: string): Promise<PgPoolClient | null> {
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

async function safeQueryClient(clientObj: PgPoolClient | null, fallbackClient: PgPoolClient, queryText: string, params?: any[]): Promise<any> {
  const target = clientObj || fallbackClient;
  try {
    return await target.query(queryText, params);
  } catch (err: any) {
    const msg = err?.message || String(err);
    if (/not queryable|connection error|terminated unexpectedly|ECONNRESET|ETIMEDOUT|closed/i.test(msg) && target !== fallbackClient) {
      console.warn(`[Migrations] Client encountered connection error ("${msg}"). Falling back to fallbackClient.`);
      return await fallbackClient.query(queryText, params);
    }
    throw err;
  }
}

async function tableExists(poolObj: QueryClient, tableName: string): Promise<boolean> {
  try {
    const result = await poolObj.query(
      `SELECT 1 FROM information_schema.tables WHERE table_name = $1`,
      [tableName]
    );
    return result.rows.length > 0;
  } catch {
    return false;
  }
}

async function columnExists(poolObj: QueryClient, tableName: string, columnName: string): Promise<boolean> {
  try {
    const result = await poolObj.query(
      `SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
      [tableName, columnName]
    );
    return result.rows.length > 0;
  } catch {
    return false;
  }
}

async function constraintExists(poolObj: QueryClient, tableName: string, constraintName: string): Promise<boolean> {
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

async function ensureColumnsBulk(
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
      `SELECT column_name FROM information_schema.columns WHERE table_name = $1`,
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
        const defaultStr = String(config.default).trim();
        if (!/^[a-zA-Z0-9_()\-:.',"\s\[\]{}]+$/i.test(defaultStr)) {
          throw new Error(`Invalid default value expression: ${defaultStr}`);
        }
        part += ` DEFAULT ${defaultStr}`;
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
    } catch (auditErr) {
    }
    throw error;
  } finally {
    if (!isClient) (client as PgPoolClient).release();
  }
}

async function ensureForeignKey(
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

interface MigrationMetrics {
  total: number;
  successful: number;
  failed: number;
  totalDuration: number;
  perMigration: Map<string, { duration: number; status: string }>;
}

const migrationMetrics: MigrationMetrics = {
  total: 0,
  successful: 0,
  failed: 0,
  totalDuration: 0,
  perMigration: new Map()
};

let io: { emit: (event: string, data: Record<string, unknown>) => void } | null = null;

export function setIo(socketIo: { emit: (event: string, data: Record<string, unknown>) => void }) {
  io = socketIo;
}

export async function runSystemMaintenance() {
  try {
    if (!pool) return;

    const maintenanceTasks = [
      {
        name: 'token_blacklist',
        query: "DELETE FROM token_blacklist WHERE expires_at < NOW() AT TIME ZONE 'UTC'",
        pool: getSecurityPool() || pool
      },
      {
        name: 'password_resets',
        query: "DELETE FROM password_resets WHERE expires_at < NOW() AT TIME ZONE 'UTC'"
      },
      {
        name: 'subscriptions',
        query: `
          UPDATE subscriptions 
          SET status = 'expired', updated_at = NOW() AT TIME ZONE 'UTC' 
          WHERE current_period_end < NOW() AT TIME ZONE 'UTC' 
          AND status = 'active'
        `
      },
      {
        name: 'oauth_states',
        query: "DELETE FROM oauth_states WHERE expires_at < NOW() AT TIME ZONE 'UTC'"
      },
      {
        name: 'notifications_read_old',
        query: "DELETE FROM notifications WHERE is_read = true AND created_at < NOW() AT TIME ZONE 'UTC' - INTERVAL '30 days'"
      },
      {
        name: 'notifications_unread_old',
        query: "DELETE FROM notifications WHERE created_at < NOW() AT TIME ZONE 'UTC' - INTERVAL '90 days'"
      },
      {
        name: 'system_logs',
        query: "DELETE FROM system_logs WHERE created_at < NOW() AT TIME ZONE 'UTC' - INTERVAL '30 days'"
      },
      {
        name: 'stripe_events',
        query: "DELETE FROM stripe_events WHERE created_at < NOW() AT TIME ZONE 'UTC' - INTERVAL '90 days'"
      },
      {
        name: 'security_alerts',
        query: "DELETE FROM security_alerts WHERE created_at < NOW() AT TIME ZONE 'UTC' - INTERVAL '90 days'"
      },
      {
        name: 'user_usage',
        query: "DELETE FROM user_usage WHERE usage_date < CURRENT_DATE - INTERVAL '90 days'"
      }
    ];

    const secPool = getSecurityPool();
    if (secPool) {
      const exists = await tableExists(secPool, 'admin_audit_logs');
      if (exists) {
        maintenanceTasks.push({
          name: 'admin_audit_logs',
          query: "DELETE FROM admin_audit_logs WHERE created_at < NOW() AT TIME ZONE 'UTC' - INTERVAL '180 days'",
          pool: secPool
        });
      }
    }

    const results = await Promise.allSettled(
      maintenanceTasks.map(async (task) => {
        const targetPool = task.pool || pool;
        if (!targetPool) return { task: task.name, status: 'skipped', reason: 'No pool' };
        try {
          await targetPool.query(task.query);
          return { task: task.name, status: 'success' };
        } catch (error) {
          return {
            task: task.name,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      })
    );

    const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && r.value.status === 'failed'));
    if (failed.length > 0) {
      console.warn(`[Maintenance] ${failed.length} tasks failed`);
    } else {
      console.log('[Maintenance] All maintenance tasks completed successfully.');
    }
  } catch (error) {
    console.error('[Maintenance] System maintenance failed:', error instanceof Error ? error.message : 'Unknown error');
  }
}

export async function runDatabaseMigrations(type: 'scratch' | 'additive' = 'additive', targetId?: string) {
  if (!pool) return;

  const client = await pool.connect();
  let ledgerClient: PgPoolClient | null = null;
  let externalClient: PgPoolClient | null = null;
  let securityClient: PgPoolClient | null = null;

  const isSameDb = (poolA: any, poolB: any) => {
    if (!poolA || !poolB) return true;
    if (poolA === poolB) return true;
    const connA = poolA.options?.connectionString;
    const connB = poolB.options?.connectionString;
    if (!connA || !connB) return false;
    try {
      const urlA = new URL(connA);
      const urlB = new URL(connB);
      return urlA.host === urlB.host && urlA.pathname === urlB.pathname;
    } catch {
      return connA === connB;
    }
  };

  const isLedgerDistinct = ledgerPool && ledgerPool !== pool && !isSameDb(pool, ledgerPool);
  const isExternalDistinct = externalPool && externalPool !== pool && !isSameDb(pool, externalPool);
  const isSecurityDistinct = securityPool && securityPool !== pool && !isSameDb(pool, securityPool);

  ledgerClient = await connectToPool(ledgerPool, 'Ledger');
  externalClient = await connectToPool(externalPool, 'External');
  securityClient = await connectToPool(securityPool, 'Security');

  try {
    // Acquire PostgreSQL advisory lock to prevent concurrent migration execution race conditions
    await client.query('SELECT pg_advisory_lock(74635291)').catch((err: any) => {
      console.warn('[Migrations] Advisory lock acquisition warning:', err.message);
    });

    await client.query(`
      CREATE TABLE IF NOT EXISTS migration_history (
        id SERIAL PRIMARY KEY,
        migration_name VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS migration_security_audit (
        id SERIAL PRIMARY KEY,
        migration_name VARCHAR(255),
        status VARCHAR(50) NOT NULL,
        error_message TEXT,
        sql_state VARCHAR(20),
        details JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_migration_security_audit_created_at ON migration_security_audit(created_at)`);

    try {
      await safeQueryClient(securityClient, client, `
        CREATE TABLE IF NOT EXISTS token_blacklist (
          id SERIAL PRIMARY KEY,
          token TEXT UNIQUE NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await safeQueryClient(securityClient, client, `
        CREATE TABLE IF NOT EXISTS security_alerts (
          id SERIAL PRIMARY KEY,
          user_id INTEGER,
          type VARCHAR(100) NOT NULL,
          severity VARCHAR(50) DEFAULT 'medium',
          description TEXT,
          metadata JSONB DEFAULT '{}',
          is_resolved BOOLEAN DEFAULT false,
          ip_address VARCHAR(100),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await safeQueryClient(securityClient, client, `
        CREATE TABLE IF NOT EXISTS admin_audit_logs (
          id SERIAL PRIMARY KEY,
          admin_id INTEGER,
          admin_email VARCHAR(255),
          action VARCHAR(100) NOT NULL,
          target_resource VARCHAR(100),
          details JSONB DEFAULT '{}',
          ip_address VARCHAR(100),
          user_agent TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await safeQueryClient(securityClient, client, `
        CREATE TABLE IF NOT EXISTS registered_agents (
          id SERIAL PRIMARY KEY,
          client_id VARCHAR(255) UNIQUE NOT NULL,
          client_secret VARCHAR(255),
          api_key_hash VARCHAR(255),
          client_name VARCHAR(255) NOT NULL,
          identity_type VARCHAR(50) DEFAULT 'agent',
          credential_type VARCHAR(50) DEFAULT 'client_credentials',
          redirect_uris TEXT[],
          jwks_uri VARCHAR(500),
          user_agent VARCHAR(500),
          signature_keys JSONB,
          permissions JSONB DEFAULT '[]',
          is_active BOOLEAN DEFAULT true,
          user_id INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      if (securityClient && securityClient !== client) {
        await client.query(`
          CREATE TABLE IF NOT EXISTS token_blacklist (
            id SERIAL PRIMARY KEY,
            token TEXT UNIQUE NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        await client.query(`
          CREATE TABLE IF NOT EXISTS security_alerts (
            id SERIAL PRIMARY KEY,
            user_id INTEGER,
            type VARCHAR(100) NOT NULL,
            severity VARCHAR(50) DEFAULT 'medium',
            description TEXT,
            metadata JSONB DEFAULT '{}',
            is_resolved BOOLEAN DEFAULT false,
            ip_address VARCHAR(100),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        await client.query(`
          CREATE TABLE IF NOT EXISTS admin_audit_logs (
            id SERIAL PRIMARY KEY,
            admin_id INTEGER,
            admin_email VARCHAR(255),
            action VARCHAR(100) NOT NULL,
            target_resource VARCHAR(100),
            details JSONB DEFAULT '{}',
            ip_address VARCHAR(100),
            user_agent TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        await client.query(`
          CREATE TABLE IF NOT EXISTS registered_agents (
            id SERIAL PRIMARY KEY,
            client_id VARCHAR(255) UNIQUE NOT NULL,
            client_secret VARCHAR(255),
            api_key_hash VARCHAR(255),
            client_name VARCHAR(255) NOT NULL,
            identity_type VARCHAR(50) DEFAULT 'agent',
            credential_type VARCHAR(50) DEFAULT 'client_credentials',
            redirect_uris TEXT[],
            jwks_uri VARCHAR(500),
            user_agent VARCHAR(500),
            signature_keys JSONB,
            permissions JSONB DEFAULT '[]',
            is_active BOOLEAN DEFAULT true,
            user_id INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
      }
    } catch (error) {
      console.warn('[Migrations] Failed to inspect/initialize security database tables:', error instanceof Error ? error.message : 'Unknown error');
    }

    if (type === 'scratch') {
      console.warn(`[Migrations] RUNNING IN SCRATCH MODE FOR TARGET: ${targetId || 'ALL'}`);
      
      const coreTables = [
        'users', 'user_sessions', 'chats', 'messages', 'api_keys_vault', 'tool_orchestrator', 
        'subscriptions', 'plans', 'user_usage', 'notifications', 'chat_memories', 'email_templates', 
        'email_settings', 'message_reports', 'user_shortcuts', 'system_settings', 'system_broadcasts', 
        'user_files', 'password_resets', 'support_tickets', 'support_ticket_replies', 'oauth_states', 
        'marketplace_items', 'marketplace_purchases', 'marketplace_reviews', 'video_resources', 
        'referral_invitations', 'shared_snapshots', 'advertisements', 'bulletin_ads', 'bulletin_saved_ads', 
        'bulletin_reports', 'bulletin_pages', 'bulletin_page_followers', 'bulletin_page_inquiries', 
        'bulletin_ad_likes', 'bulletin_ad_comments', 'bulletin_ad_messages', 'route_seo_settings', 
        'asset_metadata', 'user_recommendation_interactions', 'user_recommendation_preferences', 
        'recommendation_feedback', 'gift_catalog', 'google_tool_connections'
      ];
      
      const ledgerTables = [
        'stripe_events', 'deposit_requests', 'coupon_usages', 'payout_accounts', 
        'withdrawal_requests', 'kyc_requests', 'referral_tree', 'referrals', 
        'ledger_transactions', 'wallets', 'coupons', 'economy_settings'
      ];

      const externalTables = ['blog_ratings', 'blog_comments', 'blog_articles'];
      const securityTables = ['registered_agents', 'admin_audit_logs', 'security_alerts', 'token_blacklist'];

      if (!targetId || targetId === 'all' || targetId === 'core') {
        for (const t of coreTables) {
          await client.query(`DROP TABLE IF EXISTS "${t}" CASCADE`).catch(() => {});
        }
      }

      if (!targetId || targetId === 'all' || targetId === 'ledger') {
        const lClient = ledgerClient || client;
        for (const t of ledgerTables) {
          await lClient.query(`DROP TABLE IF EXISTS "${t}" CASCADE`).catch(() => {});
        }
      }

      if (!targetId || targetId === 'all' || targetId === 'external') {
        const extClient = externalClient || client;
        for (const t of externalTables) {
          await extClient.query(`DROP TABLE IF EXISTS "${t}" CASCADE`).catch(() => {});
        }
      }

      if (!targetId || targetId === 'all' || targetId === 'security') {
        const secClient = securityClient || client;
        for (const t of securityTables) {
          await secClient.query(`DROP TABLE IF EXISTS "${t}" CASCADE`).catch(() => {});
        }
      }

      if (!targetId || targetId === 'all' || targetId === 'core') {
        await client.query('DELETE FROM migration_history').catch(() => {});
      } else if (targetId === 'ledger') {
        await client.query("DELETE FROM migration_history WHERE migration_name ~* 'ledger|wallet|kyc|economy|payout|coupon|stripe'").catch(() => {});
      } else if (targetId === 'external') {
        await client.query("DELETE FROM migration_history WHERE migration_name ~* 'blog|article'").catch(() => {});
      } else if (targetId === 'security') {
        await client.query("DELETE FROM migration_history WHERE migration_name ~* 'security|token_blacklist|audit|agent'").catch(() => {});
      }

      // Re-initialize tables cleanly from scratch
      await initDb('scratch', client, ledgerClient);
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS db_connections_registry (
        id VARCHAR(50) PRIMARY KEY,
        provider VARCHAR(50),
        type VARCHAR(20) DEFAULT 'postgres',
        host VARCHAR(255),
        port VARCHAR(10),
        db_name VARCHAR(100),
        username VARCHAR(100),
        password TEXT,
        connection_string TEXT,
        ssl_mode VARCHAR(20) DEFAULT 'disable',
        pool_size INTEGER DEFAULT 10,
        is_active BOOLEAN DEFAULT false,
        status VARCHAR(20) DEFAULT 'unknown',
        last_checked_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const runVersioned = async (name: string, description: string, fn: (tx: WrappedClient, ledgerTx: WrappedClient) => Promise<void>) => {
      const check = await client.query('SELECT 1 FROM migration_history WHERE migration_name = $1', [name]);
      if (check.rows.length === 0) {
        const lockKey = hashStringToAdvisoryLockKey(name);
        const startTime = Date.now();
        console.log(`[Migrations] Applying ${name}: ${description}...`);
        
        await client.query('BEGIN');
        if (ledgerClient) await ledgerClient.query('BEGIN');
        if (externalClient) await externalClient.query('BEGIN');
        if (securityClient) await securityClient.query('BEGIN');

        try {
          // Transaction-level advisory lock prevents race conditions and auto-releases on COMMIT/ROLLBACK
          await client.query(`SELECT pg_advisory_xact_lock($1)`, [lockKey]);

          const doubleCheck = await client.query('SELECT 1 FROM migration_history WHERE migration_name = $1', [name]);
          if (doubleCheck.rows.length > 0) {
            await client.query('COMMIT');
            if (ledgerClient) await ledgerClient.query('COMMIT');
            if (externalClient) await externalClient.query('COMMIT');
            if (securityClient) await securityClient.query('COMMIT');
            return;
          }

          const findClientForQuery = (sql: string, params?: unknown[]) => {
            const queryLower = sql.toLowerCase();

            // First check non-core pools (ledger, external, security) using exact word boundaries
            for (const [tableName, targetPoolType] of Object.entries(TABLE_POOL_REGISTRY)) {
              if (targetPoolType === 'core') continue;
              const regex = new RegExp(`\\b${tableName}\\b`, 'i');
              if (regex.test(queryLower) || (params && params.some(p => typeof p === 'string' && p.toLowerCase() === tableName))) {
                switch (targetPoolType) {
                  case 'ledger':
                    return ledgerClient || client;
                  case 'external':
                    return externalClient || client;
                  case 'security':
                    return securityClient || client;
                }
              }
            }

            return client;
          };

            const wrappedClient: WrappedClient = {
              release: () => {},
              query: async (text: string | { text: string }, params?: unknown[]) => {
                let sqlString = '';
                if (typeof text === 'string') {
                  sqlString = text;
                } else if (text && typeof text === 'object' && text.text) {
                  sqlString = text.text;
                }
                const targetClient = findClientForQuery(sqlString, params);
                return targetClient.query(text, params);
              }
            };

            const wrappedLedgerClient: WrappedClient = {
              release: () => {},
              query: async (text: string | { text: string }, params?: unknown[]) => {
                let sqlString = '';
                if (typeof text === 'string') {
                  sqlString = text;
                } else if (text && typeof text === 'object' && text.text) {
                  sqlString = text.text;
                }
                const targetClient = findClientForQuery(sqlString, params);
                const finalClient = targetClient === client ? (ledgerClient || client) : targetClient;
                return finalClient.query(text, params);
              }
            };

            await fn(wrappedClient, wrappedLedgerClient);

            await client.query('INSERT INTO migration_history (migration_name) VALUES ($1)', [name]);
            await client.query('COMMIT');
            if (ledgerClient) await ledgerClient.query('COMMIT');
            if (externalClient) await externalClient.query('COMMIT');
            if (securityClient) await securityClient.query('COMMIT');

            const duration = Date.now() - startTime;
            migrationMetrics.total++;
            migrationMetrics.successful++;
            migrationMetrics.totalDuration += duration;
            migrationMetrics.perMigration.set(name, { duration, status: 'success' });
            console.log(`[Migrations] Successfully applied ${name} (${duration}ms).`);
          } catch (error) {
            await client.query('ROLLBACK');
            if (ledgerClient) await ledgerClient.query('ROLLBACK');
            if (externalClient) await externalClient.query('ROLLBACK');
            if (securityClient) await securityClient.query('ROLLBACK');

            const err = error as Error & { code?: string };
            console.error(`[Migrations] Failed to apply ${name}:`, err.message);

            migrationMetrics.total++;
            migrationMetrics.failed++;
            const duration = Date.now() - startTime;
            migrationMetrics.perMigration.set(name, { duration, status: 'failed' });

            try {
              await client.query(`
                INSERT INTO migration_security_audit (migration_name, status, error_message, sql_state, details)
                VALUES ($1, 'failed', $2, $3, $4)
              `, [
                name,
                err.message || 'Unknown error',
                err.code || null,
                JSON.stringify(sanitizeForLogging({ stack: err.stack, phase: 'runVersioned' }))
              ]);
            } catch (auditErr) {
              console.error('[Migrations] Failed to write failure audit log');
            }

            throw error;
          }
        }
      };

    console.log('[Migrations] Running dynamic schema auto-repair...');
    await initDb('additive');

    await runVersioned('v1_core_schema', 'Initial core database schema', async () => {});

    await runVersioned('v2_additive_columns', 'Ensuring idempotent columns and constraints', async (tx) => {
      await ensureColumnsBulk(tx, 'users', {
        last_active_at: { type: 'TIMESTAMP' },
        theme: { type: 'VARCHAR(10)', default: `'dark'` },
        updated_at: { type: 'TIMESTAMP', default: 'CURRENT_TIMESTAMP' },
        referred_by: { type: 'INTEGER' },
        kyc_submitted_at: { type: 'TIMESTAMP' },
        kyc_rejection_reason: { type: 'TEXT' },
        memory: { type: 'TEXT' },
        support_notes: { type: 'TEXT' },
        password_hash: { type: 'TEXT' },
        status: { type: 'VARCHAR(20)', default: `'active'` },
        avatar: { type: 'TEXT' },
        referral_code: { type: 'VARCHAR(6)' },
        email_notifications: { type: 'BOOLEAN', default: 'true' }
      });

      await ensureColumnsBulk(tx, 'chats', {
        updated_at: { type: 'TIMESTAMP', default: 'CURRENT_TIMESTAMP' },
        context_summary: { type: 'TEXT' }
      });

      await ensureColumnsBulk(tx, 'messages', {
        thinking_steps: { type: 'JSONB', default: `'[]'` },
        citations: { type: 'JSONB', default: `'[]'` },
        follow_ups: { type: 'JSONB', default: `'[]'` },
        feedback: { type: 'SMALLINT', default: '0' },
        generation_time: { type: 'NUMERIC' },
        is_pinned: { type: 'BOOLEAN', default: 'false' },
        updated_at: { type: 'TIMESTAMP', default: 'CURRENT_TIMESTAMP' }
      });

      await ensureColumnsBulk(tx, 'api_keys_vault', {
        updated_at: { type: 'TIMESTAMP', default: 'CURRENT_TIMESTAMP' },
        model_list: { type: 'JSONB', default: `'[]'` },
        last_reset_date: { type: 'DATE', default: 'CURRENT_DATE' },
        protocol_config: { type: 'JSONB', default: `'{}'` }
      });

      await ensureColumnsBulk(tx, 'subscriptions', {
        stripe_customer_id: { type: 'VARCHAR(255)' },
        stripe_subscription_id: { type: 'VARCHAR(255)' },
        billing_period: { type: 'VARCHAR(20)', default: `'monthly'` },
        last_period_start: { type: 'TIMESTAMP', default: 'CURRENT_TIMESTAMP' }
      });

      await ensureColumnsBulk(tx, 'user_files', {
        file_type: { type: 'VARCHAR(100)' },
        file_size: { type: 'INTEGER' },
        file_url: { type: 'TEXT' },
        file_content: { type: 'TEXT' },
        mime_type: { type: 'VARCHAR(100)' },
        file_version: { type: 'INTEGER', default: '1' }
      });

      await ensureColumnsBulk(tx, 'system_settings', {
        stripe_status: { type: 'VARCHAR(20)', default: `'pending'` },
        stripe_last_verified_at: { type: 'TIMESTAMP' },
        stripe_secret_key: { type: 'TEXT' },
        stripe_publishable_key: { type: 'TEXT' },
        stripe_webhook_secret: { type: 'TEXT' },
        stripe_live_mode: { type: 'BOOLEAN', default: 'false' },
        paypal_client_id: { type: 'TEXT' },
        paypal_client_secret: { type: 'TEXT' },
        paypal_mode: { type: 'VARCHAR(20)', default: `'sandbox'` },
        paypal_status: { type: 'VARCHAR(50)', default: `'pending'` },
        paypal_last_verified_at: { type: 'TIMESTAMP' },
        image_prompt_pref_threshold: { type: 'INTEGER', default: '150' },
        blocked_paths: { type: 'TEXT', default: `''` },
        seo_site_name_en: { type: 'TEXT' },
        seo_site_name_ar: { type: 'TEXT' },
        logo_light_url: { type: 'TEXT' },
        font_loading_config: { type: 'TEXT' },
        font_config_ar: { type: 'TEXT' },
        font_config_en: { type: 'TEXT' },
        bulletin_ad_daily_price: { type: 'NUMERIC(10,2)', default: '5.00' },
        live_gift_commission_percent: { type: 'INTEGER', default: '30' },
        sidebar_ad_impression_price: { type: 'NUMERIC(10,4)', default: '0.0100' },
        sidebar_ad_click_price: { type: 'NUMERIC(10,2)', default: '0.10' },
        sidebar_ads_enabled: { type: 'BOOLEAN', default: 'true' },
        require_2fa_for_economy: { type: 'BOOLEAN', default: 'false' }
      });

      await ensureColumnsBulk(tx, 'tool_orchestrator', {
        fallback_1_provider: { type: 'VARCHAR(50)' },
        fallback_1_model: { type: 'VARCHAR(255)' },
        fallback_2_provider: { type: 'VARCHAR(50)' },
        fallback_2_model: { type: 'VARCHAR(255)' },
        fallback_3_provider: { type: 'VARCHAR(50)' },
        fallback_3_model: { type: 'VARCHAR(255)' },
        max_history_depth: { type: 'INTEGER', default: '16' },
        protocol_config: { type: 'JSONB', default: `'{}'` },
        cost_per_1k_input_tokens: { type: 'INTEGER', default: '5' },
        cost_per_1k_output_tokens: { type: 'INTEGER', default: '15' }
      });

      await ensureColumnsBulk(tx, 'system_broadcasts', {
        admin_id: { type: 'INTEGER' },
        broadcast_type: { type: 'VARCHAR(50)', default: `'system'` },
        type: { type: 'VARCHAR(50)', default: `'system'` },
        target_group: { type: 'VARCHAR(50)', default: `'all'` },
        target_role: { type: 'VARCHAR(20)', default: `'all'` },
        status: { type: 'VARCHAR(20)', default: `'completed'` },
        sent_count: { type: 'INTEGER', default: '0' }
      });

      await ensureColumnsBulk(tx, 'system_logs', {
        type: { type: 'VARCHAR(50)', default: `'system'` },
        details: { type: 'JSONB', default: `'{}'` }
      });

      await ensureColumnsBulk(tx, 'security_alerts', {
        type: { type: 'VARCHAR(50)', default: `'security'` }
      });

      await ensureColumnsBulk(tx, 'plans', {
        plan_type: { type: 'VARCHAR(100)', default: `'user'` }
      });

      await ensureColumnsBulk(tx, 'marketplace_items', {
        download_url: { type: 'TEXT' },
        preview_url: { type: 'TEXT' },
        video_url: { type: 'TEXT' },
        features: { type: 'TEXT' },
        technologies: { type: 'TEXT' },
        referral_percent: { type: 'NUMERIC(5,2)' },
        highlight_tag: { type: 'VARCHAR(50)' },
        license_type: { type: 'VARCHAR(50)' }
      });

      await ensureColumnsBulk(tx, 'registered_agents', {
        user_id: { type: 'INTEGER' },
        api_key_hash: { type: 'VARCHAR(255)' },
        permissions: { type: 'JSONB', default: `'[]'` },
        is_active: { type: 'BOOLEAN', default: 'true' }
      });

      await ensureColumnsBulk(tx, 'referral_invitations', {
        referred_email: { type: 'VARCHAR(255)' },
        invite_code: { type: 'VARCHAR(100)' }
      });

      await ensureColumnsBulk(tx, 'route_seo_settings', {
        alt_text_ar: { type: 'TEXT' },
        alt_text_en: { type: 'TEXT' }
      });

      await ensureColumnsBulk(tx, 'asset_metadata', {
        visual_summary: { type: 'TEXT' },
        ai_analysis_raw: { type: 'JSONB', default: `'{}'` }
      });

      await ensureColumnsBulk(tx, 'bulletin_ads', {
        ad_format: { type: 'VARCHAR(50)', default: `'post'` },
        quick_questions: { type: 'JSONB', default: `'[]'` },
        feeling: { type: 'VARCHAR(255)' },
        tagged_users: { type: 'JSONB', default: `'[]'` },
        is_ai_generated: { type: 'BOOLEAN', default: 'false' },
        has_whatsapp_button: { type: 'BOOLEAN', default: 'false' }
      });

      await ensureColumnsBulk(tx, 'bulletin_ad_comments', {
        parent_id: { type: 'INTEGER' }
      });
    });

    await runVersioned('v3_ledger_schema_v1', 'Initial Ledger DB schema and hardened transactions', async (tx, ledgerTx) => {
      const ledgerTarget = ledgerTx || tx;

      await ensureColumnsBulk(ledgerTarget, 'wallets', {
        balance: { type: 'DECIMAL(15,4)', default: '0.0000' },
        updated_at: { type: 'TIMESTAMP', default: 'CURRENT_TIMESTAMP' },
        referral_activated: { type: 'BOOLEAN', default: 'false' }
      });

      await ensureColumnsBulk(ledgerTarget, 'ledger_transactions', {
        user_id: { type: 'INTEGER' },
        status: { type: 'VARCHAR(20)', default: `'success'` },
        metadata: { type: 'JSONB', default: `'{}'` },
        ip_address: { type: 'VARCHAR(45)' },
        is_hidden: { type: 'BOOLEAN', default: 'false' }
      });

      await ensureColumnsBulk(ledgerTarget, 'economy_settings', {
        referral_activation_min_deposit: { type: 'NUMERIC(10,2)', default: `'10.00'` },
        crypto_address: { type: 'TEXT' },
        bank_name: { type: 'VARCHAR(255)' },
        bank_recipient: { type: 'VARCHAR(255)' },
        bank_iban: { type: 'VARCHAR(255)' },
        bank_swift: { type: 'VARCHAR(100)' },
        paypal_email: { type: 'VARCHAR(255)' }
      });
    });

    await runVersioned('v4_registry_seed', 'Seeding database connections', async (tx) => {
      const coreUrl = process.env.DATABASE_URL;
      const ledgerUrl = process.env.LEDGER_DATABASE_URL;

      if (coreUrl) {
        const coreEncrypted = encrypt(coreUrl);
        await tx.query(
          `INSERT INTO db_connections_registry (id, provider, connection_string, is_active) VALUES ('core', 'core', $1, true) ON CONFLICT (id) DO NOTHING`,
          [coreEncrypted]
        );
      }
      if (ledgerUrl) {
        const ledgerEncrypted = encrypt(ledgerUrl);
        await tx.query(
          `INSERT INTO db_connections_registry (id, provider, connection_string, is_active) VALUES ('ledger', 'ledger', $1, true) ON CONFLICT (id) DO NOTHING`,
          [ledgerEncrypted]
        );
      }

      const externalUrl = process.env.EXTERNAL_DATABASE_URL || coreUrl;
      const securityUrl = process.env.SECURITY_DATABASE_URL || coreUrl;

      if (externalUrl) {
        const externalEncrypted = encrypt(externalUrl);
        await tx.query(
          `INSERT INTO db_connections_registry (id, provider, connection_string, is_active) VALUES ('external', 'external', $1, true) ON CONFLICT (id) DO NOTHING`,
          [externalEncrypted]
        );
      }
      if (securityUrl) {
        const securityEncrypted = encrypt(securityUrl);
        await tx.query(
          `INSERT INTO db_connections_registry (id, provider, connection_string, is_active) VALUES ('security', 'security', $1, true) ON CONFLICT (id) DO NOTHING`,
          [securityEncrypted]
        );
      }
    });

    await runVersioned('v5_orchestrator_cleanup', 'Cleaning up legacy orchestrator columns', async (tx) => {
      const dropColumns = [
        'fallback1_provider', 'fallback1_model',
        'fallback2_provider', 'fallback2_model',
        'fallback3_provider', 'fallback3_model'
      ];
      for (const col of dropColumns) {
        await tx.query(`ALTER TABLE tool_orchestrator DROP COLUMN IF EXISTS "${col}"`);
      }

      const dropUsageConstraints = ['user_usage_tool_id_key', 'user_usage_usage_date_key'];
      for (const constr of dropUsageConstraints) {
        await tx.query(`ALTER TABLE user_usage DROP CONSTRAINT IF EXISTS "${constr}"`);
      }
    });

    await runVersioned('v6_coupon_system_expansion', 'Adding detailed coupon tracking', async (tx, ledgerTx) => {
      const ledgerTarget = ledgerTx || tx;
      await ensureColumnsBulk(ledgerTarget, 'coupons', {
        usage_limit: { type: 'INTEGER', default: '0' },
        usage_count: { type: 'INTEGER', default: '0' },
        is_active: { type: 'BOOLEAN', default: 'true' }
      });
    });

    await runVersioned('v7_finance_expansion', 'Adding deposit requests', async (tx, ledgerTx) => {
      const ledgerTarget = ledgerTx || tx;
      await ledgerTarget.query(`
        CREATE TABLE IF NOT EXISTS deposit_requests (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          amount NUMERIC(15,2) NOT NULL,
          currency VARCHAR(10) DEFAULT 'USD',
          method VARCHAR(50) NOT NULL,
          proof_url TEXT,
          status VARCHAR(20) DEFAULT 'pending',
          rejection_reason TEXT,
          admin_id INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    });

    await runVersioned('v8_security_hardening', 'Enforcing encryption on all sensitive system settings', async (tx) => {
      const settingsRes = await tx.query('SELECT id, stripe_secret_key, stripe_publishable_key, stripe_webhook_secret FROM system_settings');
      const encryptionPattern = /^[0-9a-fA-F]{32}:[0-9a-fA-F]+$/;

      for (const row of settingsRes.rows) {
        let needsUpdate = false;
        const updates: Record<string, string> = {};

        const keysToCheck = ['stripe_publishable_key', 'stripe_secret_key', 'stripe_webhook_secret'];
        for (const key of keysToCheck) {
          const val = row[key];
          if (val && val.trim() !== '' && !encryptionPattern.test(val)) {
            updates[key] = encrypt(val);
            needsUpdate = true;
          }
        }

        if (needsUpdate) {
          const fieldsArray = Object.keys(updates);
          const fieldsSql = fieldsArray.map((k, i) => `${k} = $${i + 1}`).join(', ');
          const values = Object.values(updates);
          values.push(row.id);
          const idParamIdx = values.length;

          await tx.query(`UPDATE system_settings SET ${fieldsSql}, updated_at = CURRENT_TIMESTAMP WHERE id = $${idParamIdx}`, values);
        }
      }
    });

    await runVersioned('v9_filler_reconciliation', 'Reconciling migration index sequence', async (tx) => {
      await tx.query(`SELECT 1`);
    });

    await runVersioned('v10_economy_refactor', 'Removing redundant economy columns from system_settings', async (tx, ledgerTx) => {
      const dropCols = [
        'points_per_dollar', 'min_payout_usd', 'min_deposit_usd',
        'referral_bonus_percent', 'welcome_bonus_points', 'referral_bonus_points',
        'conversion_rate', 'min_withdrawal_cents', 'referral_activation_min_deposit'
      ];
      for (const col of dropCols) {
        await tx.query(`ALTER TABLE system_settings DROP COLUMN IF EXISTS "${col}"`);
      }
    });

    await runVersioned('v11_ensure_baseline_tables', 'Ensuring critical tables exist', async (tx) => {
      await tx.query(`
        CREATE TABLE IF NOT EXISTS password_resets (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) NOT NULL,
          token VARCHAR(255) NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await tx.query(`CREATE UNIQUE INDEX IF NOT EXISTS password_resets_pkey ON password_resets(id)`);

      await safeQueryClient(securityClient, client, `
        CREATE TABLE IF NOT EXISTS token_blacklist (
          id SERIAL PRIMARY KEY,
          token TEXT UNIQUE NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    });

    await runVersioned('v12_token_blacklist_security_hardening', 'Hardening token_blacklist indexes', async (tx) => {
      await safeQueryClient(securityClient, client, `
        CREATE TABLE IF NOT EXISTS token_blacklist (
          id SERIAL PRIMARY KEY,
          token TEXT UNIQUE NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await safeQueryClient(securityClient, client, `CREATE UNIQUE INDEX IF NOT EXISTS token_blacklist_pkey ON token_blacklist(id)`);
      await safeQueryClient(securityClient, client, `CREATE UNIQUE INDEX IF NOT EXISTS token_blacklist_token_key ON token_blacklist(token)`);
      await safeQueryClient(securityClient, client, `CREATE INDEX IF NOT EXISTS idx_token_blacklist_active_expires ON token_blacklist(expires_at)`);
    });

    await runVersioned('v13_payment_gateways_expansion', 'Adding payment gateway fields', async (tx, ledgerTx) => {
      const ledgerTarget = ledgerTx || tx;

      await ensureColumnsBulk(ledgerTarget, 'economy_settings', {
        crypto_address: { type: 'TEXT' },
        bank_name: { type: 'VARCHAR(255)' },
        bank_recipient: { type: 'VARCHAR(255)' },
        bank_iban: { type: 'VARCHAR(255)' },
        bank_swift: { type: 'VARCHAR(100)' },
        paypal_email: { type: 'VARCHAR(255)' }
      });

      const encAddress = encrypt(process.env.DEFAULT_CRYPTO_ADDRESS || 'YOUR_DEFAULT_CRYPTO_ADDRESS');
      const encBankName = encrypt(process.env.DEFAULT_BANK_NAME || 'Your Default Bank');
      const encBankRecipient = encrypt(process.env.DEFAULT_BANK_RECIPIENT || 'Your Default Business Platforms LTD.');
      const encBankIBAN = encrypt(process.env.DEFAULT_BANK_IBAN || 'IL00000000000000000000');
      const encBankSwift = encrypt(process.env.DEFAULT_BANK_SWIFT || 'TESTIL33XXX');
      const encPaypalEmail = encrypt(process.env.DEFAULT_PAYPAL_EMAIL || 'paypal-sandbox@yourdomain.com');

      await ledgerTarget.query(`
        UPDATE economy_settings 
        SET 
          crypto_address = COALESCE(crypto_address, $1),
          bank_name = COALESCE(bank_name, $2),
          bank_recipient = COALESCE(bank_recipient, $3),
          bank_iban = COALESCE(bank_iban, $4),
          bank_swift = COALESCE(bank_swift, $5),
          paypal_email = COALESCE(paypal_email, $6)
      `, [encAddress, encBankName, encBankRecipient, encBankIBAN, encBankSwift, encPaypalEmail]);
    });

    await runVersioned('v14_paypal_settings', 'Adding PayPal credential columns', async (tx) => {
      await ensureColumnsBulk(tx, 'system_settings', {
        paypal_client_id: { type: 'TEXT' },
        paypal_client_secret: { type: 'TEXT' },
        paypal_mode: { type: 'VARCHAR(20)', default: `'sandbox'` },
        paypal_status: { type: 'VARCHAR(50)', default: `'pending'` },
        paypal_last_verified_at: { type: 'TIMESTAMP' }
      });
    });

    await runVersioned('v15_transaction_hide_column', 'Adding is_hidden column to ledger_transactions', async (tx, ledgerTx) => {
      const ledgerTarget = ledgerTx || tx;
      await ensureColumnsBulk(ledgerTarget, 'ledger_transactions', {
        is_hidden: { type: 'BOOLEAN', default: 'false' }
      });
    });

    await runVersioned('v16_user_referral_code', 'Adding unique referral_code to users', async (tx) => {
      await ensureColumnsBulk(tx, 'users', {
        referral_code: { type: 'VARCHAR(6)' }
      });

      await tx.query(`
        WITH RECURSIVE generate_codes AS (
          SELECT 
            id,
            UPPER(SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT), 1, 6)) as code,
            1 as attempt
          FROM users 
          WHERE referral_code IS NULL OR referral_code = ''
          
          UNION ALL
          
          SELECT 
            u.id,
            UPPER(SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT || u.id::TEXT), 1, 6)),
            gc.attempt + 1
          FROM users u
          JOIN generate_codes gc ON u.id = gc.id
          WHERE gc.attempt < 10 
            AND EXISTS (
              SELECT 1 FROM users u2 
              WHERE u2.referral_code = gc.code 
                AND u2.id != gc.id
            )
        ),
        unique_codes AS (
          SELECT DISTINCT ON (id) id, code
          FROM generate_codes
          ORDER BY id, attempt
        )
        UPDATE users u
        SET referral_code = uc.code
        FROM unique_codes uc
        WHERE u.id = uc.id 
          AND (u.referral_code IS NULL OR u.referral_code = '')
      `);

      await tx.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code)');
    });

    await runVersioned('v17_messages_schema_update', 'Ensuring tracking and generation metadata columns', async (tx) => {
      await ensureColumnsBulk(tx, 'messages', {
        thinking_steps: { type: 'JSONB', default: `'[]'` },
        citations: { type: 'JSONB', default: `'[]'` },
        follow_ups: { type: 'JSONB', default: `'[]'` },
        feedback: { type: 'SMALLINT', default: '0' },
        generation_time: { type: 'NUMERIC' },
        is_pinned: { type: 'BOOLEAN', default: 'false' }
      });
    });

    await runVersioned('v18_user_sessions_schema', 'Creating user_sessions table', async (tx) => {
      await tx.query(`
        CREATE TABLE IF NOT EXISTS user_sessions (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          session_token TEXT UNIQUE NOT NULL,
          ip_address VARCHAR(100),
          user_agent TEXT,
          status VARCHAR(20) DEFAULT 'active',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          expires_at TIMESTAMP NOT NULL,
          last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await tx.query(`CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token)`);
      await tx.query(`CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id)`);
    });

    await runVersioned('v19_seo_upgrade', 'Ensuring SEO columns', async (tx) => {
      await ensureColumnsBulk(tx, 'system_settings', {
        seo_description_en: { type: 'TEXT' },
        seo_description_ar: { type: 'TEXT' },
        keywords_en: { type: 'TEXT' },
        keywords_ar: { type: 'TEXT' },
        site_description_en: { type: 'TEXT' },
        site_description_ar: { type: 'TEXT' }
      });
    });

    await runVersioned('v20_seo_image', 'Adding seo_image_url column', async (tx) => {
      await ensureColumnsBulk(tx, 'system_settings', {
        seo_image_url: { type: 'TEXT' }
      });
    });

    await runVersioned('v21_google_site_verification', 'Adding google_site_verification column', async (tx) => {
      await ensureColumnsBulk(tx, 'system_settings', {
        google_site_verification: { type: 'VARCHAR(255)' }
      });
    });

    await runVersioned('v22_forum_and_blog_schema', 'Created Forum and Blog core tables', async (tx) => {
      const extTarget = externalClient || tx;

      await extTarget.query(`
        CREATE TABLE IF NOT EXISTS blog_articles (
          id SERIAL PRIMARY KEY,
          author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          slug VARCHAR(255) UNIQUE NOT NULL,
          title_en VARCHAR(255) NOT NULL,
          title_ar VARCHAR(255) NOT NULL,
          content_en TEXT NOT NULL,
          content_ar TEXT NOT NULL,
          image_url TEXT,
          category_en VARCHAR(100) NOT NULL,
          category_ar VARCHAR(100) NOT NULL,
          views INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await extTarget.query(`
        CREATE TABLE IF NOT EXISTS blog_comments (
          id SERIAL PRIMARY KEY,
          article_id INTEGER NOT NULL REFERENCES blog_articles(id) ON DELETE CASCADE,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          content TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    });

    await runVersioned('v23_blog_ratings_and_sharing', 'Creating blog ratings', async (tx) => {
      const extTarget = externalClient || tx;
      await extTarget.query(`
        CREATE TABLE IF NOT EXISTS blog_ratings (
          id SERIAL PRIMARY KEY,
          article_id INTEGER NOT NULL REFERENCES blog_articles(id) ON DELETE CASCADE,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE (article_id, user_id)
        )
      `);
    });

    await runVersioned('v24_seed_blog_platform_data', 'Seeding blog articles', async (tx) => {
      const articlesCount = await tx.query('SELECT COUNT(*) FROM blog_articles');
      if (parseInt(articlesCount.rows[0].count, 10) === 0) {
        const adminRes = await tx.query("SELECT id FROM users WHERE role = 'admin' ORDER BY id ASC LIMIT 1");
        let authorId = adminRes.rows.length > 0 ? adminRes.rows[0].id : null;
        if (!authorId) {
          const userRes = await tx.query("SELECT id FROM users ORDER BY id ASC LIMIT 1");
          if (userRes.rows.length > 0) {
            authorId = userRes.rows[0].id;
          }
        }

        if (authorId) {
          await tx.query(`
            INSERT INTO blog_articles (author_id, slug, title_en, title_ar, content_en, content_ar, image_url, category_en, category_ar, views)
            VALUES
            (
              $1,
              'algorithmic-scaling-quantum-modeling-2026',
              'Algorithmic Scaling and Quantum Market Modeling in 2026',
              'تطوير النمذجة الرياضية الكمية وتوسيع خوارزميات التداول لعام ٢٠٢٦',
              'In the rapidly fragmenting global liquidity landscape of 2026, quantitative trading houses are shifting from classical statistical arbitrage toward post-classical quantum stochastic simulations.',
              'في ظل التفتت المتسارع لساحات السيولة العالمية لعام ٢٠٢٦، تشهد بيوت التداول الكمي تحولاً جذرياً من أساليب التحكيم الإحصائي التقليدية إلى محاكاة العمليات التصادفيه الكمية.',
              '/static/blog1.jpg',
              'Quantitative Development',
              'التطوير الكمي',
              134
            ),
            (
              $1,
              'decentralized-ledger-cryptography-threat-vectors',
              'Decentralized Ledger Cryptography: Evaluating Post-Quantum Threat Vectors',
              'تشفير الدفاتر اللامركزية: تقييم نواقل التهديد الكمي لشبكات الأصول الرقمية',
              'Modern blockchain networks rely heavily on elliptic curve signatures to safeguard ledger state. However, the rise of powerful quantum computing arrays threatens this cryptographic paradigm.',
              'تعتمد شبكات الدفاتر الموزعة المعاصرة على توقيعات المنحنى الإهليلجي لحماية سلامة الأرصدة والحسابات. ومع ذلك، فإن النضوج المتسارع للحوسبة الكمية يمثل تهديداً مباشراً لهذا النموذج الأمني العالمي.',
              '/static/blog2.jpg',
              'Cryptographic Intelligence',
              'الذكاء التشفيري',
              98
            ),
            (
              $1,
              'geopolitical-liquidity-fractures-multi-asset-hedging',
              'Geopolitical Liquidity Fractures: Hedging Mechanisms for Multi-Asset Portfolios',
              'تصدعات السيولة الجيوسياسية: آليات التحوط الوقائي للمحافظ الاستثمارية المتعددة',
              'Sanction compliance registries, multi-currency pricing hubs, and shifting regional coalitions are introducing unprecedented friction inside global cross-border payments.',
              'إن اتساع سلاسل العقوبات العالمية، وتباين تسعير العملات الإقليمية، وتغير التحالفات التجارية الكبرى قد فرض ضغوطاً غير مسبوقة على خطوط حركة المدفوعات والتمويل العابر للحدود.',
              '/static/blog3.jpg',
              'Macro Strategies',
              'الاستراتيجيات الكلية',
              245
            )
          `, [authorId]);
        }
      }
    });

    await runVersioned('v25_marketplace_schema', 'Created Marketplace core tables', async (tx) => {
      await tx.query(`
        CREATE TABLE IF NOT EXISTS marketplace_items (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          title_en VARCHAR(255) NOT NULL,
          title_ar VARCHAR(255) NOT NULL,
          description_en TEXT NOT NULL,
          description_ar TEXT NOT NULL,
          price NUMERIC(15, 2) NOT NULL,
          category_en VARCHAR(100) NOT NULL,
          category_ar VARCHAR(100) NOT NULL,
          image_url TEXT,
          status VARCHAR(20) DEFAULT 'approved',
          views INTEGER DEFAULT 0,
          contact_link TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      const itemsCount = await tx.query('SELECT COUNT(*) FROM marketplace_items');
      if (parseInt(itemsCount.rows[0].count, 10) === 0) {
        const adminRes = await tx.query("SELECT id FROM users WHERE role = 'admin' ORDER BY id ASC LIMIT 1");
        let authorId = adminRes.rows.length > 0 ? adminRes.rows[0].id : null;
        if (!authorId) {
          const userRes = await tx.query("SELECT id FROM users ORDER BY id ASC LIMIT 1");
          if (userRes.rows.length > 0) {
            authorId = userRes.rows[0].id;
          }
        }

        if (authorId) {
          await tx.query(`
            INSERT INTO marketplace_items (user_id, title_en, title_ar, description_en, description_ar, price, category_en, category_ar, image_url, contact_link, status)
            VALUES
            (
              $1,
              'Elite Quant Trading Workstation API Key Proxy v4',
              'بوابة الربط الخوارزمي الممتازة للمنصات الكمية v4',
              'A high-performance low-latency API proxy server configured for raw high-frequency websocket connection structures with dual failover fail-safes.',
              'خادم وسيط عالي الأداء ومنخفض زمن الوصول لربط خوارزميات التداول وبث البيانات الفورية بالاعتماد على بروتوكول websocket فائق السرعة مع صمامات أمان مزدوجة ضد الهبوط والمقاطعة.',
              499.00,
              'Code & APIs',
              'الأكواد والربط البرمجي',
              'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1080&h=1080&fit=crop',
              'https://t.me/perplexta_support',
              'approved'
            ),
            (
              $1,
              'Sovereign Real-time Web Intelligence Feed Core',
              'نواة بروتوكول استخلاص المعارف والاستخبارات الفورية',
              'Direct pipeline system configured to ingest strategic knowledge assets, compress geopolitical data, and pipe distilled representations directly to local logical models.',
              'أنبوب تغذية ونظام متكامل لتلقيم واستخلاص الأبحاث الإستراتيجية والبيانات الجيوسياسية مع ضغطها وتوصيل النواقل المعرفية المكثفة لنماذج الاستجابة المحلية.',
              299.00,
              'Strategic Intelligence',
              'الاستخبارات والمعرفة',
              'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1080&h=1080&fit=crop',
              'https://t.me/perplexta_support',
              'approved'
            )
          `, [authorId]);
        }
      }
    });

    await runVersioned('v26_marketplace_seed_extension_v2', 'Added third marketplace item', async (tx) => {
      const itemsCount = await tx.query('SELECT COUNT(*) FROM marketplace_items');
      if (parseInt(itemsCount.rows[0].count, 10) === 2) {
        const adminRes = await tx.query("SELECT id FROM users WHERE role = 'admin' ORDER BY id ASC LIMIT 1");
        let authorId = adminRes.rows.length > 0 ? adminRes.rows[0].id : null;
        if (!authorId) {
          const userRes = await tx.query("SELECT id FROM users ORDER BY id ASC LIMIT 1");
          if (userRes.rows.length > 0) {
            authorId = userRes.rows[0].id;
          }
        }

        if (authorId) {
          await tx.query(`
            INSERT INTO marketplace_items (user_id, title_en, title_ar, description_en, description_ar, price, category_en, category_ar, image_url, contact_link, status)
            VALUES
            (
              $1,
              'Deep-Seek Quantum Sentiment Neural Model v2',
              'النموذج العصبي الذكي لتحليل معنويات السوق الكمية v2',
              'An enterprise-grade pre-trained Transformer model engineered for continuous sentiment analytics across digital networks.',
              'نموذج محول مدرب مسبقاً من الفئة المؤسسية مصمم للتحليل الحي والمستمر لمعنويات ونبض الأسواق عبر الشبكات الرقمية.',
              199.00,
              'AI Models',
              'نماذج الذكاء',
              'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1080&h=1080&fit=crop',
              'https://t.me/perplexta_support',
              'approved'
            )
          `, [authorId]);
        }
      }
    });

    await runVersioned('v27_update_forum_categories_for_pioneers_and_developers', 'Upgrading forum categories', async (tx) => {
    });

    await runVersioned('v28_refine_forum_categories_names', 'Shortening forum categories names', async (tx) => {
    });

    await runVersioned('v30_forum_category_colors_differentiation', 'Applying distinctive colors to forum categories', async (tx) => {
    });

    await runVersioned('v31_marketplace_purchases_and_referrals', 'Enabling real transactional purchases', async (tx) => {
      await tx.query(`
        CREATE TABLE IF NOT EXISTS marketplace_purchases (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          item_id INTEGER NOT NULL REFERENCES marketplace_items(id) ON DELETE CASCADE,
          price_paid NUMERIC(10, 2) NOT NULL,
          license_type VARCHAR(50) DEFAULT 'standard',
          referrer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
          commission_paid NUMERIC(10, 2) DEFAULT 0.00,
          download_token VARCHAR(100) UNIQUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await tx.query(`CREATE INDEX IF NOT EXISTS idx_marketplace_purchases_user ON marketplace_purchases(user_id)`);
      await tx.query(`CREATE INDEX IF NOT EXISTS idx_marketplace_purchases_item ON marketplace_purchases(item_id)`);
      await tx.query(`CREATE INDEX IF NOT EXISTS idx_marketplace_purchases_referrer ON marketplace_purchases(referrer_id)`);
    });

    await runVersioned('v32_marketplace_referral_percent', 'Adding referral_percent to marketplace_items', async (tx) => {
      await ensureColumnsBulk(tx, 'marketplace_items', {
        referral_percent: { type: 'NUMERIC(5,2)' }
      });
    });

    await runVersioned('v33_marketplace_highlights_and_licenses', 'Adding highlight_tag and license_type', async (tx) => {
      await ensureColumnsBulk(tx, 'marketplace_items', {
        highlight_tag: { type: 'VARCHAR(50)' },
        license_type: { type: 'VARCHAR(50)' }
      });
    });

    await runVersioned('v34_default_language_en', 'Changing default user language to English', async (tx) => {
      await tx.query("ALTER TABLE users ALTER COLUMN language SET DEFAULT 'en'");
    });

    await runVersioned('v35_logo_light_theme', 'Adding logo_light_url column', async (tx) => {
      await ensureColumnsBulk(tx, 'system_settings', {
        logo_light_url: { type: 'TEXT' }
      });
    });

    await runVersioned('v36_agent_auth', 'Creating registered_agents table', async (tx) => {
      await tx.query(`
        CREATE TABLE IF NOT EXISTS registered_agents (
          id SERIAL PRIMARY KEY,
          client_id VARCHAR(255) UNIQUE NOT NULL,
          client_secret VARCHAR(255) NOT NULL,
          client_name VARCHAR(255),
          identity_type VARCHAR(50) DEFAULT 'agent',
          credential_type VARCHAR(50) DEFAULT 'client_credentials',
          redirect_uris TEXT[],
          jwks_uri VARCHAR(500),
          user_agent VARCHAR(500),
          signature_keys JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    });

    await runVersioned('v37_agent_auth_user_id', 'Adding user_id to registered_agents', async (tx) => {
      await ensureColumnsBulk(tx, 'registered_agents', {
        user_id: { type: 'INTEGER' }
      });
    });

    await runVersioned('v38_admin_audit_logs', 'Creating admin_audit_logs table', async (tx) => {
      await safeQueryClient(securityClient, client, `
        CREATE TABLE IF NOT EXISTS admin_audit_logs (
          id SERIAL PRIMARY KEY,
          admin_id INTEGER,
          admin_email VARCHAR(255),
          action VARCHAR(100) NOT NULL,
          target_resource VARCHAR(100),
          details JSONB DEFAULT '{}',
          ip_address VARCHAR(100),
          user_agent TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    });

    await runVersioned('v39_ensure_plan_type_column', 'Ensure plan_type column exists', async (tx) => {
      await ensureColumnsBulk(tx, 'plans', {
        plan_type: { type: 'VARCHAR(100)', default: `'user'` }
      });
    });

    await runVersioned('v40_video_resources_table', 'Creating video_resources table', async (tx) => {
      await tx.query(`
        CREATE TABLE IF NOT EXISTS video_resources (
          id SERIAL PRIMARY KEY,
          user_id INTEGER,
          chat_id INTEGER,
          message_id INTEGER,
          file_url TEXT NOT NULL,
          prompt TEXT,
          provider VARCHAR(100),
          model VARCHAR(100),
          duration INTEGER,
          aspect_ratio VARCHAR(50),
          resolution VARCHAR(50),
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await tx.query(`CREATE INDEX IF NOT EXISTS idx_video_resources_chat_id ON video_resources(chat_id)`);
      await tx.query(`CREATE INDEX IF NOT EXISTS idx_video_resources_user_id ON video_resources(user_id)`);
    });

    await runVersioned('v41_hash_existing_tokens', 'Clearing token_blacklist for SHA-256 migration', async (tx) => {
      await tx.query(`DELETE FROM token_blacklist WHERE expires_at < CURRENT_TIMESTAMP`);
      await tx.query(`DELETE FROM token_blacklist`);
      console.log('[Migrations] token_blacklist cleared for SHA-256 migration.');
    });

    await runVersioned('v42_missing_indexes', 'Adding critical performance indexes', async (tx) => {
      await tx.query(`CREATE INDEX IF NOT EXISTS idx_password_resets_email ON password_resets(email)`);
      await tx.query(`CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token)`);

      await tx.query(`CREATE INDEX IF NOT EXISTS idx_marketplace_items_status ON marketplace_items(status)`);
      await tx.query(`CREATE INDEX IF NOT EXISTS idx_marketplace_items_user_id ON marketplace_items(user_id)`);

      const extTarget = externalClient || client;
      await extTarget.query(`CREATE INDEX IF NOT EXISTS idx_blog_comments_article_id ON blog_comments(article_id)`);

      const lTarget = ledgerClient || client;
      await lTarget.query(`CREATE INDEX IF NOT EXISTS idx_ledger_tx_user_id ON ledger_transactions(user_id)`);
      await lTarget.query(`CREATE INDEX IF NOT EXISTS idx_ledger_tx_status ON ledger_transactions(status)`);

      const sTarget = securityClient || client;
      await sTarget.query(`CREATE INDEX IF NOT EXISTS idx_security_alerts_user_id ON security_alerts(user_id)`);
      await sTarget.query(`CREATE INDEX IF NOT EXISTS idx_security_alerts_resolved ON security_alerts(is_resolved)`);
      await sTarget.query(`CREATE INDEX IF NOT EXISTS idx_token_blacklist_expires ON token_blacklist(expires_at)`);
    });

    await runVersioned('v43_forum_fk_integrity', 'Adding foreign keys to forum tables', async (tx) => {
    });

    await runVersioned('v44_encrypt_registry_passwords', 'Encrypting plaintext passwords in db_connections_registry', async (tx) => {
      const encryptionPattern = /^[0-9a-fA-F]{32}:[0-9a-fA-F]+$/;
      const rows = await tx.query('SELECT id, password FROM db_connections_registry WHERE password IS NOT NULL');
      
      const updates = rows.rows.filter((row: any) => row.password && !encryptionPattern.test(row.password));
      
      if (updates.length > 0) {
        // Use a single query with CASE to update multiple rows
        const values: any[] = [];
        let sql = 'UPDATE db_connections_registry SET password = CASE id ';
        
        updates.forEach((row: any, index: number) => {
          sql += `WHEN $${index * 2 + 1} THEN $${index * 2 + 2} `;
          values.push(row.id, encrypt(row.password));
        });
        
        sql += 'END WHERE id IN (' + updates.map((_: any, i: number) => `$${i * 2 + 1}`).join(',') + ')';
        await tx.query(sql, values);
      }
    });

    await runVersioned('v45_orchestrator_max_history_depth', 'Adding max_history_depth and memory_limit_per_user', async (tx) => {
      await ensureColumnsBulk(tx, 'tool_orchestrator', {
        max_history_depth: { type: 'INTEGER', default: '16' }
      });
      await ensureColumnsBulk(tx, 'system_settings', {
        memory_limit_per_user: { type: 'INTEGER', default: '50' }
      });
    });

    await runVersioned('v46_protocol_config', 'Adding protocol_config columns', async (tx) => {
      await ensureColumnsBulk(tx, 'tool_orchestrator', {
        protocol_config: { type: 'JSONB', default: `'{}'` }
      });
      await ensureColumnsBulk(tx, 'api_keys_vault', {
        protocol_config: { type: 'JSONB', default: `'{}'` }
      });
      await tx.query(`UPDATE tool_orchestrator SET protocol_config = '{}' WHERE protocol_config IS NULL`);
      await tx.query(`UPDATE api_keys_vault SET protocol_config = '{}' WHERE protocol_config IS NULL`);
    });

    await runVersioned('v47_image_prompt_pref_threshold', 'Adding image_prompt_pref_threshold', async (tx) => {
      await ensureColumnsBulk(tx, 'system_settings', {
        image_prompt_pref_threshold: { type: 'INTEGER', default: '150' }
      });
    });

    await runVersioned('v48_marketplace_reviews_and_ratings', 'Creating marketplace_reviews table', async (tx) => {
      await tx.query(`
        CREATE TABLE IF NOT EXISTS marketplace_reviews (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          item_id INTEGER NOT NULL REFERENCES marketplace_items(id) ON DELETE CASCADE,
          rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
          comment TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await tx.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_marketplace_reviews_user_item ON marketplace_reviews(user_id, item_id)`);
    });

    await runVersioned('v49_forum_categories_control', 'Adding post limit constraints to forum categories', async (tx) => {
    });

    await runVersioned('v50_forum_images_and_ratings', 'Adding cover image support to forum posts', async (tx) => {
    });

    await runVersioned('v51_dynamic_seo_blocking', 'Adding blocked_paths column', async (tx) => {
      await ensureColumnsBulk(tx, 'system_settings', {
        blocked_paths: { type: 'TEXT', default: `''` }
      });
    });

    await runVersioned('v52_token_based_billing', 'Adding cost_per_1k_input_tokens and cost_per_1k_output_tokens', async (tx) => {
      await ensureColumnsBulk(tx, 'tool_orchestrator', {
        cost_per_1k_input_tokens: { type: 'INTEGER', default: '5' },
        cost_per_1k_output_tokens: { type: 'INTEGER', default: '15' }
      });
    });

    await runVersioned('v53_referral_invitations', 'Ensuring referral_invitations table exists', async (tx) => {
      await tx.query(`
        CREATE TABLE IF NOT EXISTS referral_invitations (
          id SERIAL PRIMARY KEY,
          referrer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          email VARCHAR(255) NOT NULL,
          status VARCHAR(50) DEFAULT 'sent',
          subject VARCHAR(255),
          body TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await tx.query(`CREATE INDEX IF NOT EXISTS idx_referral_invitations_referrer ON referral_invitations(referrer_id)`);
      await tx.query(`CREATE INDEX IF NOT EXISTS idx_referral_invitations_email ON referral_invitations(email)`);
    });

    await runVersioned('v54_referral_invitations_fields_v2', 'Adding referred_email and invite_code columns', async (tx) => {
      await ensureColumnsBulk(tx, 'referral_invitations', {
        referred_email: { type: 'VARCHAR(255)' },
        invite_code: { type: 'VARCHAR(100)' }
      });
      await tx.query(`CREATE INDEX IF NOT EXISTS idx_referral_invitations_referred_email ON referral_invitations(referred_email)`);
    });

    await runVersioned('v55_seo_site_name_fields', 'Adding seo_site_name columns', async (tx) => {
      await ensureColumnsBulk(tx, 'system_settings', {
        seo_site_name_en: { type: 'TEXT' },
        seo_site_name_ar: { type: 'TEXT' }
      });
    });

    await runVersioned('v56_shared_snapshots', 'Creating shared_snapshots table', async (tx) => {
      await tx.query(`
        CREATE TABLE IF NOT EXISTS shared_snapshots (
          id VARCHAR(100) PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
          title TEXT,
          content TEXT NOT NULL,
          model_name VARCHAR(100),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          views_count INTEGER DEFAULT 0
        )
      `);
      await tx.query(`CREATE INDEX IF NOT EXISTS idx_shared_snapshots_user_id ON shared_snapshots(user_id)`);
    });

    await runVersioned('v57_permanently_drop_forum_tables', 'Dropping forum tables', async (tx) => {
      const extTarget = externalClient || tx;
      await extTarget.query(`DROP TABLE IF EXISTS forum_post_ratings CASCADE`);
      await extTarget.query(`DROP TABLE IF EXISTS forum_comments CASCADE`);
      await extTarget.query(`DROP TABLE IF EXISTS forum_posts CASCADE`);
      await extTarget.query(`DROP TABLE IF EXISTS forum_categories CASCADE`);
    });

    await runVersioned('v58_gifts_and_ads_pricing', 'Adding gift_catalog table and ad pricing', async (tx) => {
      await tx.query(`
        CREATE TABLE IF NOT EXISTS gift_catalog (
          id SERIAL PRIMARY KEY,
          name_ar VARCHAR(255) NOT NULL,
          name_en VARCHAR(255) NOT NULL,
          icon TEXT NOT NULL,
          points INTEGER NOT NULL,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await ensureColumnsBulk(tx, 'system_settings', {
        bulletin_ad_daily_price: { type: 'NUMERIC(10,2)', default: '5.00' },
        live_gift_commission_percent: { type: 'INTEGER', default: '30' },
        sidebar_ad_impression_price: { type: 'NUMERIC(10,4)', default: '0.0100' },
        sidebar_ad_click_price: { type: 'NUMERIC(10,2)', default: '0.10' }
      });

      const giftsCount = await tx.query('SELECT COUNT(*) FROM gift_catalog');
      if (parseInt(giftsCount.rows[0].count, 10) === 0) {
        await tx.query(`
          INSERT INTO gift_catalog (name_ar, name_en, icon, points) VALUES
          ('وردة', 'Rose', '🌹', 10),
          ('قهوة', 'Coffee', '☕', 50),
          ('ألماسة', 'Diamond', '💎', 200),
          ('تاج', 'Crown', '👑', 1000),
          ('صاروخ', 'Rocket', '🚀', 5000),
          ('احتفال', 'Party', '🎉', 100),
          ('سيارة', 'Car', '🚗', 2000),
          ('أسد', 'Lion', '🦁', 10000)
        `);
      }
    });

    await runVersioned('v59_admin_approval_queue', 'Adding admin_approval_queue table', async (tx) => {
      await tx.query(`
        CREATE TABLE IF NOT EXISTS admin_approval_queue (
          id SERIAL PRIMARY KEY,
          requester_id INTEGER NOT NULL,
          action_type VARCHAR(100) NOT NULL,
          payload JSONB NOT NULL,
          status VARCHAR(20) DEFAULT 'pending',
          verification_code VARCHAR(10),
          approver_id INTEGER,
          rejection_reason TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await ensureColumnsBulk(tx, 'system_settings', {
        require_2fa_for_economy: { type: 'BOOLEAN', default: 'false' }
      });
    });

    await runVersioned('v60_ad_pricing_audit', 'Creating ad_pricing_audit table', async (tx) => {
      await tx.query(`
        CREATE TABLE IF NOT EXISTS ad_pricing_audit (
          id SERIAL PRIMARY KEY,
          admin_id INTEGER NOT NULL,
          field_name VARCHAR(100) NOT NULL,
          old_value NUMERIC(10,4),
          new_value NUMERIC(10,4),
          change_type VARCHAR(50) DEFAULT 'manual',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    });

    await runVersioned('v61_ad_performance_stats', 'Creating ad_stats table', async (tx) => {
      await tx.query(`
        CREATE TABLE IF NOT EXISTS ad_stats (
          id SERIAL PRIMARY KEY,
          ad_id INTEGER NOT NULL,
          type VARCHAR(20) NOT NULL,
          user_id INTEGER,
          ip_address VARCHAR(45),
          user_agent TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await tx.query(`CREATE INDEX IF NOT EXISTS idx_ad_stats_ad_id ON ad_stats(ad_id)`);
      await tx.query(`CREATE INDEX IF NOT EXISTS idx_ad_stats_type ON ad_stats(type)`);
      await tx.query(`CREATE INDEX IF NOT EXISTS idx_ad_stats_created_at ON ad_stats(created_at)`);
    });

    await runVersioned('v62_bulletin_social_features', 'Adding social fields to bulletin_ads', async (tx) => {
      await tx.query(`
        ALTER TABLE bulletin_ads 
        ADD COLUMN IF NOT EXISTS feeling VARCHAR(255),
        ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS tagged_users JSONB DEFAULT '[]',
        ADD COLUMN IF NOT EXISTS has_whatsapp_button BOOLEAN DEFAULT FALSE
      `);
    });

    await runVersioned('v63_bulletin_ad_features', 'Adding ad_format and parent_id', async (tx) => {
      await ensureColumnsBulk(tx, 'bulletin_ads', {
        ad_format: { type: 'VARCHAR(50)', default: `'post'` }
      });
      await ensureColumnsBulk(tx, 'bulletin_ad_comments', {
        parent_id: { type: 'INTEGER' }
      });
    });

    await runVersioned('v64_bulletin_quick_questions', 'Adding quick_questions to bulletin_ads', async (tx) => {
      await ensureColumnsBulk(tx, 'bulletin_ads', {
        quick_questions: { type: 'JSONB', default: `'[]'` }
      });
    });

    await runVersioned('v65_route_seo_settings', 'Creating route_seo_settings table', async (tx) => {
      await tx.query(`
        CREATE TABLE IF NOT EXISTS route_seo_settings (
          id SERIAL PRIMARY KEY,
          route VARCHAR(255) NOT NULL UNIQUE,
          title_ar TEXT,
          title_en TEXT,
          description_ar TEXT,
          description_en TEXT,
          keywords_ar TEXT,
          keywords_en TEXT,
          og_image_url TEXT,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      const existing = await tx.query('SELECT COUNT(*) as count FROM route_seo_settings');
      if (parseInt(existing.rows[0].count, 10) === 0) {
        await tx.query(`
          INSERT INTO route_seo_settings (route, title_ar, title_en, description_ar, description_en, keywords_ar, keywords_en, is_active)
          VALUES
          ('/', 'منصة بيربليكستا - التحليل والاستشراف الفني المتقدم', 'Perplexta Platform - Proactive Technical Analysis', 'المنصة الرائدة في التحليل والاستشراف الفني واستثمار الذكاء الاصطناعي.', 'Leading platform for technical intelligence and proactive AI capabilities.', 'ذكاء اصطناعي, تحليل, استشراف, تحليلات', 'ai, analytics, intelligence, perplexta', true),
          ('/subscription', 'خطط الاشتراكات - منصة بيربليكستا', 'Subscription Plans - Perplexta Platform', 'استكشف الباقات والاشتراكات والوصول الكامل لأدوات التحليل الذكي.', 'Explore subscription plans and full access to intelligence models.', 'اشتراكات, خطط, باقات', 'subscriptions, pricing, plans', true),
          ('/marketplace', 'متجر الإضافات والنماذج - منصة بيربليكستا', 'AI Marketplace - Perplexta Platform', 'تصفح المتجر الرقمي للإضافات والأدوات الذكية المعتمدة.', 'Browse our digital marketplace for artificial intelligence add-ons.', 'متجر, نماذج, أدوات', 'marketplace, tools, plugins', true),
          ('/blog', 'المدونة التقنية والأبحاث - بيربليكستا', 'Technical Blog & Research - Perplexta', 'قراءة أحدث المقالات التقنية والدراسات التحليلية.', 'Read the latest technical publications and deep research insights.', 'مقالات, مدونة, أبحاث', 'blog, articles, research', true),
          ('/bulletin', 'لوحة الإعلانات والمنشورات - بيربليكستا', 'Bulletin Board & Ads - Perplexta', 'تصفح الإعلانات والمنشورات التفاعلية والعروض التجارية.', 'Browse commercial bulletin ads and interactive public posts.', 'إعلانات, منشورات, لوحة', 'bulletin, ads, posts', true),
          ('/rewards', 'نظام المكافآت والأرباح - بيربليكستا', 'Rewards & Referral Program - Perplexta', 'احصل على مكافآت ونقاط عند مشاركة ودعوة الأصدقاء.', 'Earn rewards and commission by referring friends and partners.', 'مكافآت, إحالة, أرباح', 'rewards, referral, affiliate', true),
          ('/about', 'عن منصة بيربليكستا والرؤية المستقبلية', 'About Perplexta - Vision & Mission', 'تعرف على رؤية فريق بيربليكستا وتاريخ تطوير المنصة.', 'Discover the history, tech vision, and team behind Perplexta.', 'عن المنصة, رؤية, فريق', 'about, vision, company', true),
          ('/terms', 'شروط الخدمة والاستخدام - بيربليكستا', 'Terms of Service - Perplexta', 'اطّلع على شروط وأحكام استخدام منصة بيربليكستا.', 'Read our official terms and conditions governing platform usage.', 'شروط, أحكام, اتفاقية', 'terms, conditions, legal', true),
          ('/privacy', 'سياسة الخصوصية وأمان البيانات - بيربليكستا', 'Privacy Policy - Perplexta', 'تعرّف على كيفية حماية وتشفير وتخزين بياناتك.', 'Learn how we protect, encrypt, and store user data safely.', 'خصوصية, أمان, بيانات', 'privacy, policy, security', true)
        `);
      }
    });

    await runVersioned('v66_asset_metadata_and_seo_integrity', 'Creating asset_metadata table', async (tx) => {
      await ensureColumnsBulk(tx, 'route_seo_settings', {
        alt_text_ar: { type: 'TEXT' },
        alt_text_en: { type: 'TEXT' }
      });

      await tx.query(`
        CREATE TABLE IF NOT EXISTS asset_metadata (
          id SERIAL PRIMARY KEY,
          file_url TEXT UNIQUE NOT NULL,
          asset_name VARCHAR(255),
          mime_type VARCHAR(100),
          file_size BIGINT,
          alt_text_ar TEXT,
          alt_text_en TEXT,
          og_title_ar TEXT,
          og_title_en TEXT,
          og_description_ar TEXT,
          og_description_en TEXT,
          keywords_ar TEXT,
          keywords_en TEXT,
          visual_summary TEXT,
          ai_analysis_raw JSONB DEFAULT '{}',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    });

    await runVersioned('v67_recommendation_engine', 'Creating recommendation engine tables', async (tx) => {
      await tx.query(`
        CREATE TABLE IF NOT EXISTS user_recommendation_interactions (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          item_type VARCHAR(50) NOT NULL,
          item_id INTEGER,
          item_key VARCHAR(255),
          action_type VARCHAR(50) NOT NULL,
          category VARCHAR(100),
          weight NUMERIC(5,2) DEFAULT 1.0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await tx.query(`CREATE INDEX IF NOT EXISTS idx_rec_interactions_user ON user_recommendation_interactions(user_id)`);
      await tx.query(`CREATE INDEX IF NOT EXISTS idx_rec_interactions_type_item ON user_recommendation_interactions(item_type, item_id)`);

      await tx.query(`
        CREATE TABLE IF NOT EXISTS user_recommendation_preferences (
          user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          preferred_categories JSONB DEFAULT '[]',
          preferred_price_range JSONB DEFAULT '{"min": 0, "max": 10000}',
          excluded_item_types JSONB DEFAULT '[]',
          explicit_interests JSONB DEFAULT '[]',
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await tx.query(`
        CREATE TABLE IF NOT EXISTS recommendation_feedback (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          item_type VARCHAR(50) NOT NULL,
          item_id INTEGER,
          item_key VARCHAR(255),
          feedback_type VARCHAR(50) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await tx.query(`CREATE INDEX IF NOT EXISTS idx_rec_feedback_user ON recommendation_feedback(user_id)`);
    });

    await runVersioned('v68_ensure_chat_memories_and_shortcuts', 'Ensuring chat_memories and user_shortcuts exist', async (tx) => {
      await tx.query(`
        CREATE TABLE IF NOT EXISTS chat_memories (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          chat_id INTEGER REFERENCES chats(id) ON DELETE CASCADE,
          fact TEXT NOT NULL,
          source VARCHAR(20) DEFAULT 'ai',
          category VARCHAR(50) DEFAULT 'general',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await tx.query(`
        CREATE TABLE IF NOT EXISTS user_shortcuts (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          title VARCHAR(255) NOT NULL,
          query TEXT NOT NULL,
          category VARCHAR(50) DEFAULT 'general',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    });

    await runVersioned('v69_add_user_shortcuts_fk', 'Add foreign key to user_shortcuts', async (tx) => {
      await tx.query(`
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_shortcuts_user_id_fkey') THEN
                ALTER TABLE user_shortcuts ADD CONSTRAINT user_shortcuts_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
            END IF;
        END;
        $$
      `);
    });

    await runVersioned('v70_encrypt_smtp_password', 'Encrypting smtp_password in email_settings', async (tx) => {
      const settingsRes = await tx.query('SELECT id, smtp_password FROM email_settings');
      const encryptionPattern = /^[0-9a-fA-F]{32}:[0-9a-fA-F]+$/;

      for (const row of settingsRes.rows) {
        if (row.smtp_password && row.smtp_password.trim() !== '' && !encryptionPattern.test(row.smtp_password)) {
          await tx.query('UPDATE email_settings SET smtp_password = $1 WHERE id = $2', [encrypt(row.smtp_password), row.id]);
        }
      }
    });

    await runVersioned('v71_add_fks', 'Add foreign key constraints', async (tx) => {
      const extTarget = externalClient || tx;
      try {
        await extTarget.query(`
          DO $$
          BEGIN
              IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'blog_articles') THEN
                  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
                      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_blog_articles_author_id') THEN
                          ALTER TABLE blog_articles ADD CONSTRAINT fk_blog_articles_author_id FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE;
                      END IF;
                  END IF;
              END IF;
          END;
          $$
        `);
      } catch (error) {
        console.warn(`[Migrations] Skipping blog_articles foreign key constraint (cross-db or users missing):`, error instanceof Error ? error.message : 'Unknown error');
      }
    });

    await runVersioned('v72_registered_agents_schema_fix', 'Ensuring registered_agents table has all required columns', async (tx) => {
      await tx.query(`
        CREATE TABLE IF NOT EXISTS registered_agents (
          id SERIAL PRIMARY KEY,
          client_id VARCHAR(255) UNIQUE NOT NULL,
          client_secret VARCHAR(255),
          api_key_hash VARCHAR(255),
          client_name VARCHAR(255) NOT NULL,
          identity_type VARCHAR(50) DEFAULT 'agent',
          credential_type VARCHAR(50) DEFAULT 'client_credentials',
          redirect_uris TEXT[],
          jwks_uri VARCHAR(500),
          user_agent VARCHAR(500),
          signature_keys JSONB,
          permissions JSONB DEFAULT '[]',
          is_active BOOLEAN DEFAULT true,
          user_id INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await ensureColumnsBulk(tx, 'registered_agents', {
        api_key_hash: { type: 'VARCHAR(255)' },
        permissions: { type: 'JSONB', default: `'[]'` },
        is_active: { type: 'BOOLEAN', default: 'true' }
      });
    });

    await runVersioned('v73_add_file_url_indexes', 'Adding indexes on file_url columns', async (tx) => {
      const safeIndex = async (clientObj: any, table: string, column: string, indexName: string) => {
        try {
          await clientObj.query(`CREATE INDEX IF NOT EXISTS ${indexName} ON ${table}(${column}) WHERE length(${column}) <= 1000`);
        } catch (idxErr) {
          console.warn(`[Migrations v73] Could not create index ${indexName}:`, idxErr instanceof Error ? idxErr.message : 'Unknown error');
        }
      };

      await safeIndex(tx, 'user_files', 'file_url', 'idx_user_files_file_url');
      await safeIndex(tx, 'asset_metadata', 'file_url', 'idx_asset_metadata_file_url');

      const extTarget = externalClient || tx;
      await safeIndex(extTarget, 'blog_articles', 'image_url', 'idx_blog_articles_image_url');

      await safeIndex(tx, 'bulletin_ads', 'image_url', 'idx_bulletin_ads_image_url');
      await safeIndex(tx, 'bulletin_ads', 'video_url', 'idx_bulletin_ads_video_url');
      await safeIndex(tx, 'bulletin_ads', 'author_avatar', 'idx_bulletin_ads_author_avatar');

      await safeIndex(tx, 'marketplace_items', 'image_url', 'idx_marketplace_items_image_url');
      await safeIndex(tx, 'marketplace_items', 'preview_url', 'idx_marketplace_items_preview_url');
      await safeIndex(tx, 'marketplace_items', 'video_url', 'idx_marketplace_items_video_url');
      await safeIndex(tx, 'marketplace_items', 'download_url', 'idx_marketplace_items_download_url');

      await safeIndex(tx, 'advertisements', 'image_url', 'idx_advertisements_image_url');
      await safeIndex(tx, 'users', 'avatar', 'idx_users_avatar');

      await safeIndex(tx, 'bulletin_pages', 'avatar_url', 'idx_bulletin_pages_avatar_url');
      await safeIndex(tx, 'bulletin_pages', 'cover_url', 'idx_bulletin_pages_cover_url');
    });

    await runVersioned('v74_google_tool_connections', 'Creating google_tool_connections table', async (tx) => {
      await tx.query(`
        CREATE TABLE IF NOT EXISTS google_tool_connections (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          tool_id VARCHAR(100) NOT NULL,
          is_connected BOOLEAN DEFAULT false,
          config JSONB DEFAULT '{}',
          access_token TEXT,
          refresh_token TEXT,
          expires_at TIMESTAMP,
          scopes TEXT[],
          last_connected_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, tool_id)
        )
      `);
      await tx.query(`CREATE INDEX IF NOT EXISTS idx_google_tool_connections_user_id ON google_tool_connections(user_id)`);
      await tx.query(`CREATE INDEX IF NOT EXISTS idx_google_tool_connections_tool_id ON google_tool_connections(tool_id)`);
    });

    await runVersioned('v75_language_font_config', 'Adding font config columns', async (tx) => {
      await ensureColumnsBulk(tx, 'system_settings', {
        font_loading_config: { type: 'TEXT' },
        font_config_ar: { type: 'TEXT' },
        font_config_en: { type: 'TEXT' }
      });
    });
    await runVersioned('v76_ensure_email_notifications', 'Ensuring email_notifications column exists on users', async (tx) => {
      await ensureColumnsBulk(tx, 'users', {
        email_notifications: { type: 'BOOLEAN', default: 'true' }
      });
    });
    await runVersioned('v77_custom_thresholds', 'Adding custom quota notification warning thresholds to system_settings', async (tx) => {
      await ensureColumnsBulk(tx, 'system_settings', {
        quota_warning_threshold_low: { type: 'INTEGER', default: '50' },
        quota_warning_threshold_high: { type: 'INTEGER', default: '80' }
      });
    });
    await runVersioned('v78_drop_system_settings_logo_indexes', 'Dropping system_settings image indexes to support base64 logos', async (tx) => {
      await tx.query(`DROP INDEX IF EXISTS idx_system_settings_logo_url`);
      await tx.query(`DROP INDEX IF EXISTS idx_system_settings_logo_light_url`);
      await tx.query(`DROP INDEX IF EXISTS idx_system_settings_seo_image_url`);
      await tx.query(`DROP INDEX IF EXISTS idx_system_settings_favicon_url`);
    });
    await runVersioned('v79_sync_content_seo_metadata', 'Syncing missing SEO metadata for blog_articles and marketplace_items', async () => {
      await syncAllContentSeoMetadata().catch((err) => {
        console.warn('[Migrations] Non-fatal SEO metadata sync warning:', err.message || err);
      });
    });

        await runVersioned('v81_advertisements_format_column', 'Adding format column to advertisements', async (tx) => {
      await ensureColumnsBulk(tx, 'advertisements', {
        format: { type: 'VARCHAR(50)', default: "'sidebar'" },
        video_url: { type: 'TEXT' },
        poster_url: { type: 'TEXT' }
      });
    });

    await runVersioned('v80_sidebar_ads_columns', 'Ensure sidebar ads columns exist on system_settings', async (tx) => {
      await ensureColumnsBulk(tx, 'system_settings', {
        sidebar_ads_enabled: { type: 'BOOLEAN', default: 'true' },
        sidebar_ad_impression_price: { type: 'NUMERIC(10,4)', default: '0.0100' },
        sidebar_ad_click_price: { type: 'NUMERIC(10,2)', default: '0.10' }
      });
    });

    console.log('[Migrations] All versioned migrations completed successfully.');

    if (migrationMetrics.total > 0) {
      const slowest = [...migrationMetrics.perMigration.entries()]
        .sort((a, b) => b[1].duration - a[1].duration)
        .slice(0, 5);

      console.log('[Migrations] 📊 Migration Metrics:', {
        total: migrationMetrics.total,
        successful: migrationMetrics.successful,
        failed: migrationMetrics.failed,
        totalDuration: `${(migrationMetrics.totalDuration / 1000).toFixed(2)}s`,
        averageDuration: `${(migrationMetrics.totalDuration / migrationMetrics.total / 1000).toFixed(2)}s`,
        slowest: slowest.map(([name, data]) => ({ name, duration: `${(data.duration / 1000).toFixed(2)}s` }))
      });
    }

    return {
      success: true,
      target: targetId || 'all',
      type,
      totalMigrations: migrationMetrics.total
    };
  } catch (error) {
    const err = error as Error;
    console.error('[CRITICAL] Database Migration failed:', err.message);
    if (process.env.NODE_ENV === 'production') throw err;
  } finally {
    await client.query('SELECT pg_advisory_unlock(74635291)').catch(() => {});
    client.release();
    if (ledgerClient) ledgerClient.release();
    if (externalClient) externalClient.release();
    if (securityClient) securityClient.release();
  }
}

export async function initDb(mode: 'scratch' | 'additive' = 'additive', customPool?: QueryClient, customLedgerPool?: QueryClient) {
  if (!pool) return;
  const targetPool = customPool || pool;
  const targetLedgerPool = customLedgerPool || (ledgerPool === pool ? targetPool : (ledgerPool || targetPool));
  const targetSecurityPool = securityPool === pool ? targetPool : (securityPool || targetPool);
  const targetExternalPool = externalPool === pool ? targetPool : (externalPool || targetPool);

  interface SchemaTable {
    name: string;
    query: string;
    pool?: QueryClient;
  }

  const schema: SchemaTable[] = [
    {
      name: 'users',
      query: `CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash TEXT,
        role VARCHAR(50) DEFAULT 'user',
        status VARCHAR(50) DEFAULT 'active',
        kyc_status VARCHAR(50) DEFAULT 'none',
        kyc_required BOOLEAN DEFAULT false,
        kyc_rejection_reason TEXT,
        kyc_submitted_at TIMESTAMP,
        referred_by INTEGER,
        language VARCHAR(5) DEFAULT 'en',
        theme VARCHAR(10) DEFAULT 'dark',
        memory TEXT,
        support_notes TEXT,
        custom_instructions TEXT,
        last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        provider VARCHAR(50) DEFAULT 'local',
        avatar TEXT,
        referral_code VARCHAR(6),
        email_notifications BOOLEAN DEFAULT true
      )`
    },
    {
      name: 'blog_articles',
      pool: targetExternalPool,
      query: `CREATE TABLE IF NOT EXISTS blog_articles (
        id SERIAL PRIMARY KEY,
        author_id INTEGER NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        title_en VARCHAR(255) NOT NULL,
        title_ar VARCHAR(255) NOT NULL,
        content_en TEXT NOT NULL,
        content_ar TEXT NOT NULL,
        image_url TEXT,
        category_en VARCHAR(100) NOT NULL,
        category_ar VARCHAR(100) NOT NULL,
        views INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: 'blog_comments',
      pool: targetExternalPool,
      query: `CREATE TABLE IF NOT EXISTS blog_comments (
        id SERIAL PRIMARY KEY,
        article_id INTEGER NOT NULL REFERENCES blog_articles(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: 'blog_ratings',
      pool: targetExternalPool,
      query: `CREATE TABLE IF NOT EXISTS blog_ratings (
        id SERIAL PRIMARY KEY,
        article_id INTEGER NOT NULL REFERENCES blog_articles(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (article_id, user_id)
      )`
    },
    {
      name: 'password_resets',
      query: `CREATE TABLE IF NOT EXISTS password_resets (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        token VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: 'token_blacklist',
      pool: targetSecurityPool,
      query: `CREATE TABLE IF NOT EXISTS token_blacklist (
        id SERIAL PRIMARY KEY,
        token TEXT UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: 'chats',
      query: `CREATE TABLE IF NOT EXISTS chats (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        title VARCHAR(255) DEFAULT 'New Analysis',
        tool_id VARCHAR(100) DEFAULT 'chat',
        context_summary TEXT,
        is_pinned BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        tool VARCHAR(100) DEFAULT 'chat'
      )`
    },
    {
      name: 'messages',
      query: `CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        chat_id INTEGER,
        role VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        tool_id VARCHAR(100),
        model VARCHAR(255),
        tokens_used INTEGER DEFAULT 0,
        feedback SMALLINT DEFAULT 0,
        thinking_steps JSONB DEFAULT '[]',
        citations JSONB DEFAULT '[]',
        follow_ups JSONB DEFAULT '[]',
        generation_time NUMERIC,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        tool VARCHAR(100),
        is_pinned BOOLEAN DEFAULT false,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: 'api_keys_vault',
      query: `CREATE TABLE IF NOT EXISTS api_keys_vault (
        id SERIAL PRIMARY KEY,
        provider VARCHAR(100) NOT NULL CONSTRAINT api_keys_vault_provider_key UNIQUE,
        encrypted_key TEXT NOT NULL,
        daily_budget NUMERIC(15, 4) DEFAULT '0',
        used_today NUMERIC(15, 4) DEFAULT '0',
        last_reset_date DATE DEFAULT CURRENT_DATE,
        models JSONB DEFAULT '[]',
        model_list JSONB DEFAULT '[]',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        url_key TEXT,
        protocol_config JSONB DEFAULT '{}'
      )`
    },
    {
      name: 'tool_orchestrator',
      query: `CREATE TABLE IF NOT EXISTS tool_orchestrator (
        id SERIAL PRIMARY KEY,
        tool_id VARCHAR(100) UNIQUE NOT NULL,
        primary_provider VARCHAR(100),
        primary_model VARCHAR(255),
        fallback_1_provider VARCHAR(100),
        fallback_1_model VARCHAR(255),
        fallback_2_provider VARCHAR(100),
        fallback_2_model VARCHAR(255),
        fallback_3_provider VARCHAR(100),
        fallback_3_model VARCHAR(255),
        task_description TEXT,
        task_description_ar TEXT,
        is_active BOOLEAN DEFAULT true,
        cost_per_usage INTEGER DEFAULT 10,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        protocol_config JSONB DEFAULT '{}',
        max_history_depth INTEGER DEFAULT 16,
        cost_per_1k_input_tokens INTEGER DEFAULT 5,
        cost_per_1k_output_tokens INTEGER DEFAULT 15
      )`
    },
    {
      name: 'google_tool_connections',
      query: `CREATE TABLE IF NOT EXISTS google_tool_connections (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        tool_id VARCHAR(100) NOT NULL,
        is_connected BOOLEAN DEFAULT false,
        config JSONB DEFAULT '{}',
        access_token TEXT,
        refresh_token TEXT,
        expires_at TIMESTAMP,
        scopes TEXT[],
        last_connected_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, tool_id)
      )`
    },
    {
      name: 'wallets',
      pool: targetLedgerPool,
      query: `CREATE TABLE IF NOT EXISTS wallets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL CONSTRAINT wallets_user_id_key UNIQUE,
        balance NUMERIC(15, 4) DEFAULT '0.0000',
        usd_balance NUMERIC(15, 4) DEFAULT '0.0000',
        points INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        referral_activated BOOLEAN DEFAULT false
      )`
    },
    {
      name: 'ledger_transactions',
      pool: targetLedgerPool,
      query: `CREATE TABLE IF NOT EXISTS ledger_transactions (
        id SERIAL PRIMARY KEY,
        wallet_id INTEGER REFERENCES wallets(id),
        user_id INTEGER,
        amount NUMERIC(20, 2) NOT NULL,
        points INTEGER DEFAULT 0,
        transaction_type VARCHAR(100) NOT NULL,
        status VARCHAR(50) DEFAULT 'success',
        reference_id VARCHAR(255),
        metadata JSONB DEFAULT '{}',
        ip_address VARCHAR(100),
        description TEXT,
        is_hidden BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: 'referrals',
      pool: targetLedgerPool,
      query: `CREATE TABLE IF NOT EXISTS referrals (
        id SERIAL PRIMARY KEY,
        referrer_id INTEGER NOT NULL,
        referred_id INTEGER NOT NULL UNIQUE,
        bonus_points INTEGER DEFAULT 0,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: 'referral_tree',
      pool: targetLedgerPool,
      query: `CREATE TABLE IF NOT EXISTS referral_tree (
        id SERIAL PRIMARY KEY,
        referrer_id INTEGER NOT NULL,
        referred_id INTEGER NOT NULL UNIQUE,
        level INTEGER DEFAULT 1,
        commission_earned NUMERIC(15, 4) DEFAULT '0',
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: 'kyc_requests',
      pool: targetLedgerPool,
      query: `CREATE TABLE IF NOT EXISTS kyc_requests (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL UNIQUE,
        full_name VARCHAR(255),
        selfie_url TEXT,
        status VARCHAR(20) DEFAULT 'pending',
        rejection_reason TEXT,
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: 'withdrawal_requests',
      pool: targetLedgerPool,
      query: `CREATE TABLE IF NOT EXISTS withdrawal_requests (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        amount_cents INTEGER NOT NULL,
        method VARCHAR(50) NOT NULL,
        details TEXT,
        status VARCHAR(20) DEFAULT 'pending',
        rejection_reason TEXT,
        processed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: 'payout_accounts',
      pool: targetLedgerPool,
      query: `CREATE TABLE IF NOT EXISTS payout_accounts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL UNIQUE,
        type VARCHAR(20),
        details TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: 'economy_settings',
      pool: targetLedgerPool,
      query: `CREATE TABLE IF NOT EXISTS economy_settings (
        id SERIAL PRIMARY KEY,
        welcome_bonus_points INTEGER DEFAULT 600,
        referral_bonus_points INTEGER DEFAULT 1000,
        min_withdrawal_cents INTEGER DEFAULT 2000,
        points_per_dollar INTEGER DEFAULT 1000,
        conversion_rate NUMERIC(10, 4) DEFAULT '0.0010',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        referral_bonus_percent INTEGER DEFAULT 10,
        min_payout_usd NUMERIC(10, 2) DEFAULT '10.00',
        min_deposit_usd NUMERIC(10, 2) DEFAULT '5.00',
        referral_activation_min_deposit NUMERIC(10, 2) DEFAULT '10.00',
        crypto_address TEXT,
        bank_name VARCHAR(255),
        bank_recipient VARCHAR(255),
        bank_iban VARCHAR(255),
        bank_swift VARCHAR(100),
        paypal_email VARCHAR(255)
      )`
    },
    {
      name: 'support_tickets',
      query: `CREATE TABLE IF NOT EXISTS support_tickets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        subject VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        status VARCHAR(20) DEFAULT 'open',
        priority VARCHAR(20) DEFAULT 'medium',
        category VARCHAR(50) DEFAULT 'general',
        assigned_to INTEGER,
        last_reply_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: 'support_ticket_replies',
      query: `CREATE TABLE IF NOT EXISTS support_ticket_replies (
        id SERIAL PRIMARY KEY,
        ticket_id INTEGER REFERENCES support_tickets(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id),
        message TEXT NOT NULL,
        is_admin_reply BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: 'coupons',
      pool: targetLedgerPool,
      query: `CREATE TABLE IF NOT EXISTS coupons (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        type VARCHAR(20) DEFAULT 'percentage',
        value NUMERIC(10, 2) NOT NULL,
        min_purchase NUMERIC(10, 2) DEFAULT '0',
        max_discount NUMERIC(10, 2),
        expires_at TIMESTAMP,
        usage_limit INTEGER DEFAULT 0,
        usage_count INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: 'plans',
      query: `CREATE TABLE IF NOT EXISTS plans (
        id SERIAL PRIMARY KEY,
        name_en VARCHAR(255) NOT NULL CONSTRAINT plans_name_en_key UNIQUE,
        name_ar VARCHAR(255) NOT NULL,
        desc_en TEXT,
        desc_ar TEXT,
        badge VARCHAR(50) DEFAULT 'none',
        discount INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        is_visible BOOLEAN DEFAULT true,
        is_popular BOOLEAN DEFAULT false,
        monthly_price NUMERIC(10, 2) NOT NULL,
        annual_price NUMERIC(10, 2) NOT NULL,
        color VARCHAR(50) DEFAULT 'accent',
        features JSONB DEFAULT '[]',
        limits JSONB DEFAULT '{}',
        plan_type VARCHAR(100) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: 'subscriptions',
      query: `CREATE TABLE IF NOT EXISTS subscriptions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        plan_id INTEGER REFERENCES plans(id),
        stripe_customer_id VARCHAR(255),
        stripe_subscription_id VARCHAR(255),
        status VARCHAR(50) DEFAULT 'active',
        billing_period VARCHAR(20) DEFAULT 'monthly',
        current_period_end TIMESTAMP,
        last_period_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: 'user_usage',
      query: `CREATE TABLE IF NOT EXISTS user_usage (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        tool_id VARCHAR(50) NOT NULL,
        usage_count INTEGER DEFAULT 0,
        usage_date DATE DEFAULT CURRENT_DATE,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT user_usage_user_id_tool_id_usage_date_key UNIQUE(user_id, tool_id, usage_date)
      )`
    },
    {
      name: 'notifications',
      query: `CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        title_en VARCHAR(255) NOT NULL,
        title_ar VARCHAR(255) NOT NULL,
        message_en TEXT NOT NULL,
        message_ar TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'info',
        is_read BOOLEAN DEFAULT false,
        action_url TEXT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: 'chat_memories',
      query: `CREATE TABLE IF NOT EXISTS chat_memories (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        chat_id INTEGER REFERENCES chats(id) ON DELETE CASCADE,
        fact TEXT NOT NULL,
        source VARCHAR(20) DEFAULT 'ai',
        category VARCHAR(50) DEFAULT 'general',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: 'email_templates',
      query: `CREATE TABLE IF NOT EXISTS email_templates (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        subject_en VARCHAR(255),
        subject_ar VARCHAR(255),
        body_en TEXT,
        body_ar TEXT,
        type VARCHAR(50) DEFAULT 'custom',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: 'email_settings',
      query: `CREATE TABLE IF NOT EXISTS email_settings (
        id SERIAL PRIMARY KEY,
        mailer_type VARCHAR(50) DEFAULT 'smtp',
        smtp_host VARCHAR(255),
        smtp_port VARCHAR(10),
        smtp_encryption VARCHAR(50) DEFAULT 'tls',
        smtp_username VARCHAR(255),
        smtp_password TEXT,
        sender_name VARCHAR(255),
        sender_email VARCHAR(255),
        status VARCHAR(20) DEFAULT 'active',
        last_verified_at TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: 'message_reports',
      query: `CREATE TABLE IF NOT EXISTS message_reports (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        message_id INTEGER,
        reason TEXT,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: 'user_shortcuts',
      query: `CREATE TABLE IF NOT EXISTS user_shortcuts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        query TEXT NOT NULL,
        category VARCHAR(50) DEFAULT 'general',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: 'stripe_events',
      pool: targetLedgerPool,
      query: `CREATE TABLE IF NOT EXISTS stripe_events (
        id SERIAL PRIMARY KEY,
        stripe_event_id VARCHAR(255) CONSTRAINT stripe_events_stripe_event_id_key UNIQUE,
        type VARCHAR(100),
        status VARCHAR(20) DEFAULT 'processed',
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: 'system_settings',
      query: `CREATE TABLE IF NOT EXISTS system_settings (
        id SERIAL PRIMARY KEY,
        site_name_en VARCHAR(255) DEFAULT 'Premium AI',
        site_name_ar VARCHAR(255) DEFAULT 'منصة النخبة',
        logo_url TEXT,
        logo_light_url TEXT,
        favicon_url TEXT,
        site_description_en TEXT,
        site_description_ar TEXT,
        seo_description_en TEXT,
        seo_description_ar TEXT,
        keywords_en TEXT,
        keywords_ar TEXT,
        google_analytics_id VARCHAR(100),
        google_site_verification VARCHAR(255),
        seo_image_url TEXT,
        stripe_publishable_key TEXT,
        stripe_secret_key TEXT,
        stripe_webhook_secret TEXT,
        stripe_live_mode BOOLEAN DEFAULT false,
        stripe_status VARCHAR(50) DEFAULT 'pending',
        stripe_last_verified_at TIMESTAMP,
        paypal_client_id TEXT,
        paypal_client_secret TEXT,
        paypal_mode VARCHAR(20) DEFAULT 'sandbox',
        paypal_status VARCHAR(50) DEFAULT 'pending',
        paypal_last_verified_at TIMESTAMP,
        image_prompt_pref_threshold INTEGER DEFAULT 150,
        blocked_paths TEXT DEFAULT '',
        seo_site_name_en TEXT,
        seo_site_name_ar TEXT,
        font_loading_config TEXT,
        font_config_ar TEXT,
        font_config_en TEXT,
        bulletin_ad_daily_price NUMERIC(10,2) DEFAULT 5.00,
        live_gift_commission_percent INTEGER DEFAULT 30,
        sidebar_ad_impression_price NUMERIC(10,4) DEFAULT 0.0100,
        sidebar_ad_click_price NUMERIC(10,2) DEFAULT 0.10,
        sidebar_ads_enabled BOOLEAN DEFAULT TRUE,
        memory_limit_per_user INTEGER DEFAULT 50,
        quota_warning_threshold_low INTEGER DEFAULT 50,
        quota_warning_threshold_high INTEGER DEFAULT 80,
        require_2fa_for_economy BOOLEAN DEFAULT false,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: 'gift_catalog',
      query: `CREATE TABLE IF NOT EXISTS gift_catalog (
        id SERIAL PRIMARY KEY,
        name_ar VARCHAR(255) NOT NULL,
        name_en VARCHAR(255) NOT NULL,
        icon TEXT NOT NULL,
        points INTEGER NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: 'system_broadcasts',
      query: `CREATE TABLE IF NOT EXISTS system_broadcasts (
        id SERIAL PRIMARY KEY,
        admin_id INTEGER REFERENCES users(id),
        broadcast_type VARCHAR(50) DEFAULT 'system',
        type VARCHAR(50) DEFAULT 'system',
        target_group VARCHAR(50) DEFAULT 'all',
        target_role VARCHAR(20) DEFAULT 'all',
        title_en VARCHAR(255),
        title_ar VARCHAR(255),
        content_en TEXT,
        content_ar TEXT,
        status VARCHAR(20) DEFAULT 'completed',
        sent_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: 'user_files',
      query: `CREATE TABLE IF NOT EXISTS user_files (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        chat_id INTEGER REFERENCES chats(id) ON DELETE SET NULL,
        file_name VARCHAR(255) NOT NULL,
        file_type VARCHAR(100),
        mime_type VARCHAR(100),
        file_size INTEGER,
        file_url TEXT,
        file_content TEXT,
        metadata JSONB DEFAULT '{}',
        file_version INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: 'security_alerts',
      pool: targetSecurityPool,
      query: `CREATE TABLE IF NOT EXISTS security_alerts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        type VARCHAR(100) NOT NULL,
        severity VARCHAR(50) DEFAULT 'medium',
        description TEXT,
        metadata JSONB DEFAULT '{}',
        is_resolved BOOLEAN DEFAULT false,
        ip_address VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: 'system_logs',
      query: `CREATE TABLE IF NOT EXISTS system_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        action VARCHAR(255),
        type VARCHAR(100) DEFAULT 'info',
        description TEXT,
        details JSONB DEFAULT '{}',
        metadata JSONB DEFAULT '{}',
        ip_address VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: 'oauth_states',
      query: `CREATE TABLE IF NOT EXISTS oauth_states (
        id SERIAL PRIMARY KEY,
        state VARCHAR(255) UNIQUE NOT NULL,
        provider VARCHAR(50) NOT NULL,
        redirect_url TEXT,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: 'coupon_usages',
      pool: targetLedgerPool,
      query: `CREATE TABLE IF NOT EXISTS coupon_usages (
        id SERIAL PRIMARY KEY,
        coupon_id INTEGER,
        user_id INTEGER NOT NULL,
        transaction_id INTEGER,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: 'deposit_requests',
      pool: targetLedgerPool,
      query: `CREATE TABLE IF NOT EXISTS deposit_requests (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        amount NUMERIC(15, 2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'USD',
        method VARCHAR(50) NOT NULL,
        proof_url TEXT,
        status VARCHAR(20) DEFAULT 'pending',
        rejection_reason TEXT,
        admin_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: 'marketplace_items',
      query: `CREATE TABLE IF NOT EXISTS marketplace_items (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title_en VARCHAR(255) NOT NULL,
        title_ar VARCHAR(255) NOT NULL,
        description_en TEXT NOT NULL,
        description_ar TEXT NOT NULL,
        price NUMERIC(15, 2) NOT NULL,
        category_en VARCHAR(100) NOT NULL,
        category_ar VARCHAR(100) NOT NULL,
        image_url TEXT,
        status VARCHAR(20) DEFAULT 'approved',
        views INTEGER DEFAULT 0,
        contact_link TEXT,
        download_url TEXT,
        preview_url TEXT,
        video_url TEXT,
        features TEXT,
        technologies TEXT,
        referral_percent NUMERIC(5,2),
        highlight_tag VARCHAR(50),
        license_type VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: 'marketplace_purchases',
      query: `CREATE TABLE IF NOT EXISTS marketplace_purchases (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        item_id INTEGER NOT NULL REFERENCES marketplace_items(id) ON DELETE CASCADE,
        price_paid NUMERIC(10, 2) NOT NULL,
        license_type VARCHAR(50) DEFAULT 'standard',
        referrer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        commission_paid NUMERIC(10, 2) DEFAULT 0.00,
        download_token VARCHAR(100) UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: 'marketplace_reviews',
      query: `CREATE TABLE IF NOT EXISTS marketplace_reviews (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        item_id INTEGER NOT NULL REFERENCES marketplace_items(id) ON DELETE CASCADE,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: 'admin_audit_logs',
      pool: targetSecurityPool,
      query: `CREATE TABLE IF NOT EXISTS admin_audit_logs (
        id SERIAL PRIMARY KEY,
        admin_id INTEGER,
        admin_email VARCHAR(255),
        action VARCHAR(100) NOT NULL,
        target_resource VARCHAR(100),
        details JSONB DEFAULT '{}',
        ip_address VARCHAR(100),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: 'video_resources',
      query: `CREATE TABLE IF NOT EXISTS video_resources (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        chat_id INTEGER,
        message_id INTEGER,
        file_url TEXT NOT NULL,
        prompt TEXT,
        provider VARCHAR(100),
        model VARCHAR(100),
        duration INTEGER,
        aspect_ratio VARCHAR(50),
        resolution VARCHAR(50),
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: 'referral_invitations',
      query: `CREATE TABLE IF NOT EXISTS referral_invitations (
        id SERIAL PRIMARY KEY,
        referrer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        email VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'sent',
        subject VARCHAR(255),
        body TEXT,
        referred_email VARCHAR(255),
        invite_code VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: 'shared_snapshots',
      query: `CREATE TABLE IF NOT EXISTS shared_snapshots (
        id VARCHAR(100) PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        title TEXT,
        content TEXT NOT NULL,
        model_name VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        views_count INTEGER DEFAULT 0
      )`
    },
    {
      name: 'advertisements',
      query: `CREATE TABLE IF NOT EXISTS advertisements (
        id SERIAL PRIMARY KEY,
        title_ar VARCHAR(255) NOT NULL,
        title_en VARCHAR(255) NOT NULL,
        description_ar TEXT,
        description_en TEXT,
        image_url TEXT NOT NULL,
        video_url TEXT,
        poster_url TEXT,
        target_url TEXT NOT NULL,
        sponsor_name VARCHAR(100),
        badge_text_ar VARCHAR(50) DEFAULT 'مُموَّل',
        badge_text_en VARCHAR(50) DEFAULT 'Sponsored',
        position VARCHAR(50) DEFAULT 'sidebar',
        format VARCHAR(50) DEFAULT 'sidebar',
        display_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        meta_title_ar VARCHAR(255),
        meta_title_en VARCHAR(255),
        meta_description_ar TEXT,
        meta_description_en TEXT,
        keywords_ar TEXT,
        keywords_en TEXT,
        click_count INTEGER DEFAULT 0,
        impression_count INTEGER DEFAULT 0,
        start_date TIMESTAMP,
        end_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: 'bulletin_ads',
      query: `CREATE TABLE IF NOT EXISTS bulletin_ads (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        author_name VARCHAR(255),
        author_avatar TEXT,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        image_url TEXT NOT NULL,
        whatsapp_number VARCHAR(50),
        target_url TEXT,
        hashtags TEXT DEFAULT '',
        category VARCHAR(100) DEFAULT 'عام / General',
        price_paid NUMERIC(10,2) DEFAULT 0,
        duration_days INTEGER DEFAULT 7,
        status VARCHAR(50) DEFAULT 'pending',
        rejection_reason TEXT,
        likes_count INTEGER DEFAULT 0,
        comments_count INTEGER DEFAULT 0,
        shares_count INTEGER DEFAULT 0,
        clicks_count INTEGER DEFAULT 0,
        impressions_count INTEGER DEFAULT 0,
        starts_at TIMESTAMP,
        expires_at TIMESTAMP,
        page_id INTEGER,
        location_city VARCHAR(100) DEFAULT 'فلسطين',
        phone_number VARCHAR(50),
        video_url TEXT,
        is_boosted BOOLEAN DEFAULT FALSE,
        boosted_until TIMESTAMP,
        boost_tier VARCHAR(50),
        boost_price NUMERIC(10,2) DEFAULT 0,
        audience VARCHAR(50) DEFAULT 'public',
        ad_format VARCHAR(50) DEFAULT 'post',
        quick_questions JSONB DEFAULT '[]',
        feeling VARCHAR(100),
        tagged_users JSONB DEFAULT '[]',
        is_ai_generated BOOLEAN DEFAULT FALSE,
        has_whatsapp_button BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: 'bulletin_saved_ads',
      query: `CREATE TABLE IF NOT EXISTS bulletin_saved_ads (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        ad_id INTEGER NOT NULL REFERENCES bulletin_ads(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, ad_id)
      )`
    },
    {
      name: 'bulletin_reports',
      query: `CREATE TABLE IF NOT EXISTS bulletin_reports (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        ad_id INTEGER NOT NULL REFERENCES bulletin_ads(id) ON DELETE CASCADE,
        reason TEXT NOT NULL,
        details TEXT,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: 'bulletin_pages',
      query: `CREATE TABLE IF NOT EXISTS bulletin_pages (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255),
        category VARCHAR(100) DEFAULT 'تجارة إلكترونية / E-Commerce',
        city VARCHAR(100) DEFAULT 'غزة',
        address TEXT,
        description TEXT NOT NULL,
        avatar_url TEXT NOT NULL,
        cover_url TEXT NOT NULL,
        whatsapp_number VARCHAR(50),
        phone_number VARCHAR(50),
        website_url TEXT,
        is_verified BOOLEAN DEFAULT TRUE,
        followers_count INTEGER DEFAULT 0,
        ads_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: 'bulletin_page_followers',
      query: `CREATE TABLE IF NOT EXISTS bulletin_page_followers (
        id SERIAL PRIMARY KEY,
        page_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(page_id, user_id)
      )`
    },
    {
      name: 'bulletin_page_inquiries',
      query: `CREATE TABLE IF NOT EXISTS bulletin_page_inquiries (
        id SERIAL PRIMARY KEY,
        page_id INTEGER,
        ad_id INTEGER,
        sender_id INTEGER NOT NULL,
        sender_name VARCHAR(255),
        sender_phone VARCHAR(50),
        message TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'unread',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: 'bulletin_ad_likes',
      query: `CREATE TABLE IF NOT EXISTS bulletin_ad_likes (
        id SERIAL PRIMARY KEY,
        ad_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(ad_id, user_id)
      )`
    },
    {
      name: 'bulletin_ad_comments',
      query: `CREATE TABLE IF NOT EXISTS bulletin_ad_comments (
        id SERIAL PRIMARY KEY,
        ad_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        author_name VARCHAR(255),
        author_avatar TEXT,
        content TEXT NOT NULL,
        parent_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: 'bulletin_ad_messages',
      query: `CREATE TABLE IF NOT EXISTS bulletin_ad_messages (
        id SERIAL PRIMARY KEY,
        ad_id INTEGER NOT NULL,
        sender_id INTEGER NOT NULL,
        recipient_id INTEGER NOT NULL,
        sender_name VARCHAR(255),
        sender_avatar TEXT,
        message TEXT NOT NULL,
        media_url TEXT,
        is_encrypted BOOLEAN DEFAULT TRUE,
        encryption_hash VARCHAR(255),
        status VARCHAR(50) DEFAULT 'sent',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: 'route_seo_settings',
      query: `CREATE TABLE IF NOT EXISTS route_seo_settings (
        id SERIAL PRIMARY KEY,
        route VARCHAR(255) UNIQUE NOT NULL,
        title_ar TEXT,
        title_en TEXT,
        description_ar TEXT,
        description_en TEXT,
        keywords_ar TEXT,
        keywords_en TEXT,
        og_image_url TEXT,
        alt_text_ar TEXT,
        alt_text_en TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: 'asset_metadata',
      query: `CREATE TABLE IF NOT EXISTS asset_metadata (
        id SERIAL PRIMARY KEY,
        file_url TEXT UNIQUE NOT NULL,
        asset_name VARCHAR(255),
        mime_type VARCHAR(100),
        file_size BIGINT,
        alt_text_ar TEXT,
        alt_text_en TEXT,
        og_title_ar TEXT,
        og_title_en TEXT,
        og_description_ar TEXT,
        og_description_en TEXT,
        keywords_ar TEXT,
        keywords_en TEXT,
        visual_summary TEXT,
        ai_analysis_raw JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: 'user_recommendation_interactions',
      query: `CREATE TABLE IF NOT EXISTS user_recommendation_interactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        item_type VARCHAR(50) NOT NULL,
        item_id INTEGER,
        item_key VARCHAR(255),
        action_type VARCHAR(50) NOT NULL,
        category VARCHAR(100),
        weight NUMERIC(5,2) DEFAULT 1.0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: 'user_recommendation_preferences',
      query: `CREATE TABLE IF NOT EXISTS user_recommendation_preferences (
        user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        preferred_categories JSONB DEFAULT '[]',
        preferred_price_range JSONB DEFAULT '{"min": 0, "max": 10000}',
        excluded_item_types JSONB DEFAULT '[]',
        explicit_interests JSONB DEFAULT '[]',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: 'recommendation_feedback',
      query: `CREATE TABLE IF NOT EXISTS recommendation_feedback (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        item_type VARCHAR(50) NOT NULL,
        item_id INTEGER,
        item_key VARCHAR(255),
        feedback_type VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: 'registered_agents',
      pool: targetSecurityPool,
      query: `CREATE TABLE IF NOT EXISTS registered_agents (
        id SERIAL PRIMARY KEY,
        client_id VARCHAR(255) UNIQUE NOT NULL,
        client_secret VARCHAR(255),
        api_key_hash VARCHAR(255),
        client_name VARCHAR(255) NOT NULL,
        identity_type VARCHAR(50) DEFAULT 'agent',
        credential_type VARCHAR(50) DEFAULT 'client_credentials',
        redirect_uris TEXT[],
        jwks_uri VARCHAR(500),
        user_agent VARCHAR(500),
        signature_keys JSONB,
        permissions JSONB DEFAULT '[]',
        is_active BOOLEAN DEFAULT true,
        user_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    }
  ];

  for (const table of schema) {
    const p = table.pool || targetPool;
    await p.query(table.query);
  }

  const settingsCheck = await targetPool.query('SELECT count(*) FROM system_settings');
  if (parseInt(settingsCheck.rows[0].count, 10) === 0) {
    await targetPool.query(
      `INSERT INTO system_settings (site_name_en, site_name_ar) VALUES ($1, $2)`,
      ['Premium AI', 'منصة النخبة']
    );
  }

  try {
    const ecoCheck = await targetLedgerPool.query('SELECT count(*) FROM economy_settings');
    if (parseInt(ecoCheck.rows[0].count, 10) === 0) {
      await targetLedgerPool.query(`
        INSERT INTO economy_settings (
          welcome_bonus_points, referral_bonus_points, min_withdrawal_cents,
          points_per_dollar, conversion_rate, referral_bonus_percent,
          min_payout_usd, min_deposit_usd
        ) VALUES (600, 1000, 1000, 1000, 0.001, 10, 10, 5)
      `);
    }
  } catch (ecoErr) {
    console.warn('[Migrations] Skipping economy_settings seed:', ecoErr);
  }

  await targetPool.query(`UPDATE plans SET is_active = true WHERE is_active IS NULL`);
  await targetPool.query(`UPDATE plans SET is_visible = true WHERE is_visible IS NULL`);

  const masterAdmin = process.env.ADMIN_EMAIL || '';
  const adminEmails = [...new Set([masterAdmin].filter(Boolean))];

  for (const email of adminEmails) {
    const adminCheck = await targetPool.query('SELECT id, password_hash, updated_at FROM users WHERE email = $1', [email]);
    if (adminCheck.rows.length === 0) {
      const adminPassword = process.env.ADMIN_PASSWORD;
      if (!adminPassword) {
        console.error('[CRITICAL] ADMIN_PASSWORD not set. Skipping admin seed for:', email);
        continue;
      }
      const adminHash = await bcrypt.hash(adminPassword, 10);
      const newAdmin = await targetPool.query(
        `INSERT INTO users (email, name, password_hash, role, status) VALUES ($1, $2, $3, 'admin', 'active') RETURNING id`,
        [email, 'Master Admin', adminHash]
      );
      const adminId = newAdmin.rows[0].id;
      await targetLedgerPool.query(
        `INSERT INTO wallets (user_id, balance) VALUES ($1, 10000) ON CONFLICT (user_id) DO NOTHING`,
        [adminId]
      );
    } else {
      const user = adminCheck.rows[0];
      await targetPool.query(`UPDATE users SET role = 'admin' WHERE email = $1`, [email]);

      const adminPassword = process.env.ADMIN_PASSWORD;
      if (adminPassword) {
        const isMatch = await bcrypt.compare(adminPassword, user.password_hash);
        const passwordAge = new Date().getTime() - new Date(user.updated_at).getTime();
        const thirtyDays = 30 * 24 * 60 * 60 * 1000;

        if (!isMatch && passwordAge > thirtyDays) {
          console.log(`[Migrations] Updating admin password for: ${email} (password expired)`);
          const newHash = await bcrypt.hash(adminPassword, 10);
          await targetPool.query(
            'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [newHash, user.id]
          );
        }
      }
    }
  }

  const planCheck = await targetPool.query('SELECT count(*) FROM plans');
  if (parseInt(planCheck.rows[0].count, 10) === 0) {
    await targetPool.query(`
      INSERT INTO plans (name_en, name_ar, desc_en, desc_ar, monthly_price, annual_price, discount, features, color, is_popular, badge, limits, plan_type)
      VALUES
        ('Starter', 'البداية', 'Free starter plan', 'خطة البداية المجانية', 0, 0, 0, '["Basic Search", "Limited AI Chats"]', '#334155', false, 'Standard', '{"chat": 20, "chat_fast": 30, "perplexta_analysis": 5, "image": 2, "code": 5, "notebook": 10, "stt": 5, "tts": 5, "storage_mb": 100}', 'user'),
        ('Pro', 'المحترف', 'Professional plan for advanced users', 'خطة المحترفين للمستخدمين المتقدمين', 19.99, 199.90, 17, '["Advanced Analysis", "Unlimited Chats", "Priority Support"]', '#3b82f6', true, 'Best Value', '{"chat": "unlimited", "chat_fast": "unlimited", "chat_pro": 100, "perplexta_analysis": 50, "image": 50, "code": 100, "notebook": 100, "stt": 100, "tts": 100, "storage_mb": 1024}', 'user'),
        ('Elite', 'النخبة', 'Full power for strategic expert users', 'القوة الكاملة للمستخدمين الخبراء الاستراتيجيين', 49.99, 499.90, 17, '["Full Perplexta Access", "Multi-model Orchestration", "Concierge Support"]', '#8b5cf6', false, 'Elite', '{"chat": "unlimited", "chat_fast": "unlimited", "chat_pro": "unlimited", "chat_reasoning": "unlimited", "perplexta_analysis": "unlimited", "image": "unlimited", "video": 50, "code": "unlimited", "legal_analysis": "unlimited", "storage_mb": 10240}', 'user')
      ON CONFLICT (name_en) DO NOTHING
    `);
  }

  const devPlanCheck = await targetPool.query("SELECT count(*) FROM plans WHERE plan_type = 'developer'");
  if (parseInt(devPlanCheck.rows[0].count, 10) === 0) {
    await targetPool.query(`
      INSERT INTO plans (name_en, name_ar, desc_en, desc_ar, monthly_price, annual_price, discount, features, color, is_popular, badge, limits, plan_type)
      VALUES
        ('Developer Lite', 'مطور لايت', 'Direct high-fidelity x402 gateway and programmatic client connectivity.', 'بوابة x402 عالية الدقة المباشرة وربط العملاء البرمجيين.', 29.99, 299.90, 17, '["Direct x402 API Access", "1,000 Key Requests/day", "Unified Failover Route", "Rate limit 30 req/min"]', '#8b5cf6', false, 'Dev Entry', '{"x402_api": 1000, "storage_mb": 2000}', 'developer'),
        ('Developer Scale', 'مطور سكيل', 'Unthrottled enterprise gateway and strategic multi-modal programmatic access.', 'بوابة المؤسسات غير المحدودة والوصول البرمجي المتعدد الاستراتيجي.', 99.99, 999.90, 17, '["Unthrottled x402 API Node", "10,000 Key Requests/day", "Dedicated Webhooks", "Automated Failover Orchestrator Mode", "Priority Support"]', '#ec4899', true, 'Best Dev Value', '{"x402_api": 10000, "storage_mb": 10240}', 'developer')
      ON CONFLICT (name_en) DO NOTHING
    `);
  }

  await targetPool.query(`
    INSERT INTO tool_orchestrator (tool_id, primary_provider, primary_model, task_description, task_description_ar, cost_per_usage)
    VALUES
      ('chat', '', '', 'Elite strategic assistant for professional discourse and general logic.', 'مساعد استراتيجي نخبوي للنقاش المهني والمنطق العام.', 10),
      ('chat_fast', '', '', 'High-speed technical intelligence agent for quick insights.', 'عميل ذكاء تقني سريع للاستفسارات الفورية.', 5),
      ('chat_pro', '', '', 'Advanced perplexta reasoning engine for deep technical problem solving.', 'محرك استنتاج استراتيجي متقدم لحل المشكلات التقنية العميقة.', 25),
      ('chat_reasoning', '', '', 'Complex multi-step reasoning protocol for high-stakes intelligence.', 'بروتوكول تفكير معقد متعدد الخطوات للمهام فائقة الأهمية.', 50),
      ('perplexta_analysis', '', '', 'Professional technical synthesis and deep digital strategic search.', 'البحث الاستراتيجي الرقمي العميق والتحليل التقني المهني.', 15),
      ('image', '', '', 'High-precision visual synthesis engine for professional assets.', 'محرك توليد بصري عالي الدقة للأصول المهنية.', 30),
      ('video', '', '', 'Global standard video generation and cinematic synthesis.', 'توليد فيديو بمعايير عالمية وتوليد سينمائي متقدم.', 100),
      ('tts', '', '', 'Elite natural acoustic synthesis and voice engineering.', 'توليد صوتي طبيعي متطور وهندسة صوتية نخبوية.', 10),
      ('stt', '', '', 'High-fidelity acoustic transcription and linguistic extraction.', 'تحويل صوتي عالي الدقة واستخراج لغوي متقن.', 5),
      ('legal_analysis', '', '', 'Perplexta professional document auditing and legal synthesis.', 'تدقيق الوثائق المهنية الاحترافية والتركيب القانوني.', 40),
      ('learning', '', '', 'Advanced education assistant and tailored training system.', 'انظمة مساعد التعليم والدورات المخصصة.', 20),
      ('code', '', '', 'Master-level software engineering workstation and logic constructor.', 'محطة عمل هندسة البرمجيات وبناء المنطق البرمجي المتقدم.', 20),
      ('canvas', '', '', 'Perplexta creative studio and multi-modal design canvas.', 'استوديو الإبداع المتقدم ولوحة التصميم متعددة الوسائط.', 25),
      ('notebook', '', '', 'Strategic research workstation and technical knowledge synthesis.', 'محطة عمل الأبحاث الاستراتيجية وتركيب المعرفة التقنية.', 30),
      ('sovereign_memory', '', '', 'Unified sovereign system intelligence and long-term memory synthesis.', 'ذاكرة النظام السيادية الموحدة وتركيب المعارف طويلة الأمد.', 5),
      ('sovereign_search', '', '', 'Global real-time web intelligence and strategic knowledge extraction.', 'البحث الذكي العالمي في الوقت الفعلي واستخراج المعرفة الاستراتيجية.', 10),
      ('perplexta_music', 'google', 'lyria-3-pro-preview', 'Advanced acoustic composition and structural music synthesis.', 'التأليف الصوتي المتقدم والتركيب الموسيقي الهيكلي.', 50),
      ('x402_api', 'google', 'gemini-1.5-pro', 'Dynamic high-fidelity artificial intelligence analytics gateway for programmatic developer clients connected via x402 payment protocol.', 'بوابة تحليلات الذكاء الاصطناعي عالية الدقة الديناميكية لعملاء الوكلاء البرمجيين المتصلين ببروتوكول دفع x402.', 15)
    ON CONFLICT (tool_id) DO NOTHING
  `);

  const indexes = [
    { pool: targetPool, query: `CREATE UNIQUE INDEX IF NOT EXISTS referral_invitations_pkey ON referral_invitations(id)` },
    { pool: targetPool, query: `CREATE INDEX IF NOT EXISTS idx_referral_invitations_referrer ON referral_invitations(referrer_id)` },
    { pool: targetPool, query: `CREATE INDEX IF NOT EXISTS idx_referral_invitations_email ON referral_invitations(email)` },
    { pool: targetPool, query: `CREATE UNIQUE INDEX IF NOT EXISTS api_keys_vault_pkey ON api_keys_vault(id)` },
    { pool: targetPool, query: `CREATE UNIQUE INDEX IF NOT EXISTS api_keys_vault_provider_key ON api_keys_vault(provider)` },
    { pool: targetPool, query: `CREATE UNIQUE INDEX IF NOT EXISTS chat_memories_pkey ON chat_memories(id)` },
    { pool: targetPool, query: `CREATE INDEX IF NOT EXISTS idx_chat_memories_user_id ON chat_memories(user_id)` },
    { pool: targetPool, query: `CREATE INDEX IF NOT EXISTS idx_chat_memories_chat_id ON chat_memories(chat_id)` },
    { pool: targetPool, query: `CREATE INDEX IF NOT EXISTS idx_chat_memories_user_id_created_at ON chat_memories(user_id, created_at DESC)` },
    { pool: targetPool, query: `CREATE UNIQUE INDEX IF NOT EXISTS chats_pkey ON chats(id)` },
    { pool: targetPool, query: `CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats(user_id)` },
    { pool: targetPool, query: `CREATE INDEX IF NOT EXISTS idx_chats_user_id_updated_at ON chats(user_id, updated_at DESC)` },
    { pool: targetLedgerPool, query: `CREATE UNIQUE INDEX IF NOT EXISTS coupons_code_key ON coupons(code)` },
    { pool: targetLedgerPool, query: `CREATE UNIQUE INDEX IF NOT EXISTS coupons_pkey ON coupons(id)` },
    { pool: targetPool, query: `CREATE UNIQUE INDEX IF NOT EXISTS db_connections_registry_pkey ON db_connections_registry(id)` },
    { pool: targetPool, query: `CREATE INDEX IF NOT EXISTS idx_db_connections_id ON db_connections_registry(id)` },
    { pool: targetPool, query: `CREATE UNIQUE INDEX IF NOT EXISTS email_settings_pkey ON email_settings(id)` },
    { pool: targetPool, query: `CREATE UNIQUE INDEX IF NOT EXISTS email_templates_name_key ON email_templates(name)` },
    { pool: targetPool, query: `CREATE UNIQUE INDEX IF NOT EXISTS email_templates_pkey ON email_templates(id)` },
    { pool: targetPool, query: `CREATE UNIQUE INDEX IF NOT EXISTS message_reports_pkey ON message_reports(id)` },
    { pool: targetPool, query: `CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id)` },
    { pool: targetPool, query: `CREATE UNIQUE INDEX IF NOT EXISTS messages_pkey ON messages(id)` },
    { pool: targetPool, query: `CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)` },
    { pool: targetPool, query: `CREATE UNIQUE INDEX IF NOT EXISTS notifications_pkey ON notifications(id)` },
    { pool: targetPool, query: `CREATE UNIQUE INDEX IF NOT EXISTS password_resets_pkey ON password_resets(id)` },
    { pool: targetPool, query: `CREATE UNIQUE INDEX IF NOT EXISTS plans_name_en_key ON plans(name_en)` },
    { pool: targetPool, query: `CREATE UNIQUE INDEX IF NOT EXISTS plans_pkey ON plans(id)` },
    { pool: targetSecurityPool, query: `CREATE INDEX IF NOT EXISTS idx_security_alerts_user_id ON security_alerts(user_id)` },
    { pool: externalPool || targetPool, query: `CREATE INDEX IF NOT EXISTS idx_articles_title_fts ON blog_articles USING GIN(to_tsvector('english', title_en))` },
    { pool: externalPool || targetPool, query: `CREATE INDEX IF NOT EXISTS idx_articles_content_fts ON blog_articles USING GIN(to_tsvector('english', content_en))` },
    { pool: externalPool || targetPool, query: `CREATE INDEX IF NOT EXISTS idx_blog_comments_article_id ON blog_comments(article_id)` },
    { pool: externalPool || targetPool, query: `CREATE INDEX IF NOT EXISTS idx_blog_ratings_article_id ON blog_ratings(article_id)` },
    { pool: targetSecurityPool, query: `CREATE UNIQUE INDEX IF NOT EXISTS security_alerts_pkey ON security_alerts(id)` },
    { pool: targetLedgerPool, query: `CREATE UNIQUE INDEX IF NOT EXISTS stripe_events_pkey ON stripe_events(id)` },
    { pool: targetLedgerPool, query: `CREATE UNIQUE INDEX IF NOT EXISTS stripe_events_stripe_event_id_key ON stripe_events(stripe_event_id)` },
    { pool: targetLedgerPool, query: `CREATE UNIQUE INDEX IF NOT EXISTS kyc_requests_pkey ON kyc_requests(id)` },
    { pool: targetLedgerPool, query: `CREATE UNIQUE INDEX IF NOT EXISTS withdrawal_requests_pkey ON withdrawal_requests(id)` },
    { pool: targetLedgerPool, query: `CREATE UNIQUE INDEX IF NOT EXISTS payout_accounts_pkey ON payout_accounts(id)` },
    { pool: targetLedgerPool, query: `CREATE UNIQUE INDEX IF NOT EXISTS economy_settings_pkey ON economy_settings(id)` },
    { pool: targetLedgerPool, query: `CREATE INDEX IF NOT EXISTS idx_kyc_user_id ON kyc_requests(user_id)` },
    { pool: targetLedgerPool, query: `CREATE INDEX IF NOT EXISTS idx_withdrawal_user_id ON withdrawal_requests(user_id)` },
    { pool: targetLedgerPool, query: `CREATE UNIQUE INDEX IF NOT EXISTS coupon_usages_pkey ON coupon_usages(id)` },
    { pool: targetLedgerPool, query: `CREATE UNIQUE INDEX IF NOT EXISTS deposit_requests_pkey ON deposit_requests(id)` },
    { pool: targetPool, query: `CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_pkey ON subscriptions(id)` },
    { pool: targetPool, query: `CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_user_id_key ON subscriptions(user_id)` },
    { pool: targetPool, query: `CREATE UNIQUE INDEX IF NOT EXISTS support_ticket_replies_pkey ON support_ticket_replies(id)` },
    { pool: targetPool, query: `CREATE INDEX IF NOT EXISTS idx_ticket_replies_ticket_id ON support_ticket_replies(ticket_id)` },
    { pool: targetPool, query: `CREATE UNIQUE INDEX IF NOT EXISTS support_tickets_pkey ON support_tickets(id)` },
    { pool: targetPool, query: `CREATE UNIQUE INDEX IF NOT EXISTS system_broadcasts_pkey ON system_broadcasts(id)` },
    { pool: targetPool, query: `CREATE INDEX IF NOT EXISTS idx_system_logs_user_id ON system_logs(user_id)` },
    { pool: targetPool, query: `CREATE UNIQUE INDEX IF NOT EXISTS system_logs_pkey ON system_logs(id)` },
    { pool: targetPool, query: `CREATE UNIQUE INDEX IF NOT EXISTS system_settings_pkey ON system_settings(id)` },
    { pool: targetSecurityPool, query: `CREATE UNIQUE INDEX IF NOT EXISTS token_blacklist_pkey ON token_blacklist(id)` },
    { pool: targetSecurityPool, query: `CREATE UNIQUE INDEX IF NOT EXISTS token_blacklist_token_key ON token_blacklist(token)` },
    { pool: targetSecurityPool, query: `CREATE INDEX IF NOT EXISTS idx_token_blacklist_active_expires ON token_blacklist(expires_at)` },
    { pool: targetSecurityPool, query: `CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_id ON admin_audit_logs(admin_id)` },
    { pool: targetSecurityPool, query: `CREATE UNIQUE INDEX IF NOT EXISTS admin_audit_logs_pkey ON admin_audit_logs(id)` },
    { pool: targetPool, query: `CREATE UNIQUE INDEX IF NOT EXISTS oauth_states_pkey ON oauth_states(id)` },
    { pool: targetPool, query: `CREATE UNIQUE INDEX IF NOT EXISTS oauth_states_state_key ON oauth_states(state)` },
    { pool: targetPool, query: `CREATE UNIQUE INDEX IF NOT EXISTS tool_orchestrator_pkey ON tool_orchestrator(id)` },
    { pool: targetPool, query: `CREATE UNIQUE INDEX IF NOT EXISTS tool_orchestrator_tool_id_key ON tool_orchestrator(tool_id)` },
    { pool: targetPool, query: `CREATE UNIQUE INDEX IF NOT EXISTS user_files_pkey ON user_files(id)` },
    { pool: targetPool, query: `CREATE UNIQUE INDEX IF NOT EXISTS user_shortcuts_pkey ON user_shortcuts(id)` },
    { pool: targetPool, query: `CREATE UNIQUE INDEX IF NOT EXISTS user_usage_pkey ON user_usage(id)` },
    { pool: targetPool, query: `CREATE UNIQUE INDEX IF NOT EXISTS users_email_key ON users(email)` },
    { pool: targetPool, query: `CREATE UNIQUE INDEX IF NOT EXISTS users_pkey ON users(id)` },
    { pool: targetLedgerPool, query: `CREATE UNIQUE INDEX IF NOT EXISTS wallets_pkey ON wallets(id)` },
    { pool: targetLedgerPool, query: `CREATE UNIQUE INDEX IF NOT EXISTS wallets_user_id_key ON wallets(user_id)` },
    { pool: targetLedgerPool, query: `CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id)` },
    { pool: targetLedgerPool, query: `CREATE INDEX IF NOT EXISTS idx_ledger_user_id ON ledger_transactions(user_id)` },
    { pool: targetLedgerPool, query: `CREATE INDEX IF NOT EXISTS idx_ledger_wallet_id ON ledger_transactions(wallet_id)` },
    { pool: targetLedgerPool, query: `CREATE INDEX IF NOT EXISTS idx_ledger_type ON ledger_transactions(transaction_type)` },
    { pool: targetLedgerPool, query: `CREATE INDEX IF NOT EXISTS idx_ledger_status ON ledger_transactions(status)` },
    { pool: targetLedgerPool, query: `CREATE INDEX IF NOT EXISTS idx_ledger_reference ON ledger_transactions(reference_id)` },
    { pool: targetPool, query: `CREATE UNIQUE INDEX IF NOT EXISTS video_resources_pkey ON video_resources(id)` },
    { pool: targetPool, query: `CREATE INDEX IF NOT EXISTS idx_video_resources_chat_id ON video_resources(chat_id)` },
    { pool: targetPool, query: `CREATE INDEX IF NOT EXISTS idx_video_resources_user_id ON video_resources(user_id)` },
    { pool: targetSecurityPool, query: `CREATE UNIQUE INDEX IF NOT EXISTS registered_agents_pkey ON registered_agents(id)` },
    { pool: targetSecurityPool, query: `CREATE UNIQUE INDEX IF NOT EXISTS registered_agents_client_id_key ON registered_agents(client_id)` }
  ];

  for (const idx of indexes) {
    await idx.pool.query(idx.query);
  }

  const relations = [
    { table: 'chats', constraint: 'chats_user_id_fkey', column: 'user_id', ref: 'users' },
    { table: 'messages', constraint: 'messages_chat_id_fkey', column: 'chat_id', ref: 'chats' },
    { table: 'notifications', constraint: 'notifications_user_id_fkey', column: 'user_id', ref: 'users' },
    { table: 'subscriptions', constraint: 'subscriptions_plan_id_fkey', column: 'plan_id', ref: 'plans', onDelete: 'SET NULL' },
    { table: 'subscriptions', constraint: 'subscriptions_user_id_fkey', column: 'user_id', ref: 'users' },
    { table: 'system_broadcasts', constraint: 'system_broadcasts_admin_id_fkey', column: 'admin_id', ref: 'users', onDelete: 'SET NULL' },
    { table: 'user_files', constraint: 'user_files_chat_id_fkey', column: 'chat_id', ref: 'chats', onDelete: 'SET NULL' },
    { table: 'user_files', constraint: 'user_files_user_id_fkey', column: 'user_id', ref: 'users' },
    { table: 'users', constraint: 'users_referred_by_fkey', column: 'referred_by', ref: 'users', onDelete: 'SET NULL' },
    { table: 'blog_articles', constraint: 'fk_blog_articles_author_id', column: 'author_id', ref: 'users' },
    { table: 'blog_comments', constraint: 'fk_blog_comments_user_id', column: 'user_id', ref: 'users' },
    { table: 'blog_comments', constraint: 'fk_blog_comments_article_id', column: 'article_id', ref: 'blog_articles' }
  ];

  for (const rel of relations) {
    await ensureForeignKey(targetPool, rel.table, rel.constraint, rel.column, rel.ref, 'id', rel.onDelete || 'CASCADE');
  }

  const ledgerRelations = [
    { table: 'ledger_transactions', constraint: 'ledger_transactions_wallet_id_fkey', column: 'wallet_id', ref: 'wallets' },
    { table: 'coupon_usages', constraint: 'coupon_usages_coupon_id_fkey', column: 'coupon_id', ref: 'coupons', onDelete: 'SET NULL' }
  ];

  for (const rel of ledgerRelations) {
    await ensureForeignKey(targetLedgerPool, rel.table, rel.constraint, rel.column, rel.ref, 'id', rel.onDelete || 'CASCADE');
  }
}

let isMonitoring = false;

export async function monitorDatabases() {
  if (isMonitoring) {
    console.warn('[Monitor] Database monitoring already in progress, skipping...');
    return;
  }
  isMonitoring = true;
  try {
    const registries = await pool.query('SELECT * FROM db_connections_registry');
    for (const reg of registries.rows) {
      let isAlive = false;
      let connectionString = '';
      if (reg.connection_string) {
        try {
          connectionString = safelyDecryptConnectionString(reg.connection_string);
        } catch {
          console.warn(`[Monitor] Skipping database ${reg.id} - decryption failed`);
          continue;
        }
      }
      if (!connectionString.startsWith('postgres')) continue;

      const TestPool = createInternalPool(connectionString);
      try {
        await TestPool.query('SELECT 1');
        isAlive = true;
      } catch (e) {
        isAlive = false;
      } finally {
        await TestPool.end();
      }

      await pool.query(
        `UPDATE db_connections_registry SET status = $1, last_checked_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [isAlive ? 'healthy' : 'down', reg.id]
      );
      if (!isAlive && io) io.emit('db_alert', { provider: reg.provider, status: 'down' });
    }
  } catch (error) {
    console.error('[Monitor] Database monitoring failed:', error instanceof Error ? error.message : 'Unknown error');
  } finally {
    isMonitoring = false;
  }
}

export async function verifySchemaIntegrity() {
  if (!pool) {
    console.warn('[Schema Integrity] Skipping validation: No core pool initialized.');
    return;
  }
  console.log('[Schema Integrity] Starting comprehensive database schema audit...');

  const report: {
    passed: boolean;
    missingTables: { db: string; table: string }[];
    missingColumns: { db: string; table: string; column: string; expectedType: string }[];
    repairedTables: string[];
    repairedColumns: string[];
    errors: string[];
  } = {
    passed: true,
    missingTables: [],
    missingColumns: [],
    repairedTables: [],
    repairedColumns: [],
    errors: []
  };

  const queryColumns = async (p: any, schemaName = 'public'): Promise<Record<string, Set<string>>> => {
    try {
      const res = await p.query(`
        SELECT table_name, column_name 
        FROM information_schema.columns 
        WHERE table_schema = $1
      `, [schemaName]);

      const tables: Record<string, Set<string>> = {};
      for (const row of res.rows) {
        if (!tables[row.table_name]) {
          tables[row.table_name] = new Set();
        }
        tables[row.table_name].add(row.column_name);
      }
      return tables;
    } catch (error) {
      throw new Error(`Failed to query information_schema: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const expectedSchema: Record<string, Record<string, { columns: string[]; repairCols?: Record<string, string | { type: string; default?: any }> }>> = {
    core: {
      users: {
        columns: ['id', 'name', 'email', 'password_hash', 'role', 'status', 'kyc_status', 'kyc_required', 'kyc_rejection_reason', 'kyc_submitted_at', 'referred_by', 'language', 'theme', 'memory', 'support_notes', 'custom_instructions', 'last_active_at', 'created_at', 'updated_at', 'provider', 'avatar', 'referral_code', 'email_notifications'],
        repairCols: {
          email_notifications: { type: 'BOOLEAN', default: 'true' },
          avatar: { type: 'TEXT' },
          referral_code: { type: 'VARCHAR(6)' }
        }
      },
      chats: {
        columns: ['id', 'user_id', 'title', 'tool_id', 'context_summary', 'is_pinned', 'created_at', 'updated_at', 'tool']
      },
      messages: {
        columns: ['id', 'chat_id', 'role', 'content', 'tool_id', 'model', 'tokens_used', 'feedback', 'thinking_steps', 'citations', 'follow_ups', 'generation_time', 'created_at', 'tool', 'is_pinned', 'updated_at']
      },
      api_keys_vault: {
        columns: ['id', 'provider', 'encrypted_key', 'daily_budget', 'used_today', 'last_reset_date', 'models', 'model_list', 'is_active', 'created_at', 'updated_at', 'url_key', 'protocol_config']
      },
      tool_orchestrator: {
        columns: ['id', 'tool_id', 'primary_provider', 'primary_model', 'fallback_1_provider', 'fallback_1_model', 'fallback_2_provider', 'fallback_2_model', 'fallback_3_provider', 'fallback_3_model', 'task_description', 'task_description_ar', 'is_active', 'cost_per_usage', 'updated_at', 'protocol_config', 'max_history_depth', 'cost_per_1k_input_tokens', 'cost_per_1k_output_tokens']
      },
      subscriptions: {
        columns: ['id', 'user_id', 'plan_id', 'stripe_customer_id', 'stripe_subscription_id', 'status', 'billing_period', 'current_period_end', 'last_period_start', 'updated_at', 'created_at']
      },
      user_files: {
        columns: ['id', 'user_id', 'chat_id', 'file_name', 'file_type', 'mime_type', 'file_size', 'file_url', 'file_content', 'metadata', 'created_at', 'updated_at']
      },
      system_settings: {
        columns: ['id', 'site_name_en', 'site_name_ar', 'logo_url', 'logo_light_url', 'favicon_url', 'site_description_en', 'site_description_ar', 'seo_description_en', 'seo_description_ar', 'keywords_en', 'keywords_ar', 'google_analytics_id', 'google_site_verification', 'seo_image_url', 'stripe_publishable_key', 'stripe_secret_key', 'stripe_webhook_secret', 'stripe_live_mode', 'stripe_status', 'stripe_last_verified_at', 'paypal_client_id', 'paypal_client_secret', 'paypal_mode', 'paypal_status', 'paypal_last_verified_at', 'image_prompt_pref_threshold', 'blocked_paths', 'seo_site_name_en', 'seo_site_name_ar', 'updated_at', 'memory_limit_per_user', 'require_2fa_for_economy', 'bulletin_ad_daily_price', 'live_gift_commission_percent', 'sidebar_ad_impression_price', 'sidebar_ad_click_price', 'font_loading_config', 'font_config_ar', 'font_config_en', 'quota_warning_threshold_low', 'quota_warning_threshold_high']
      },
      bulletin_ads: {
        columns: ['id', 'user_id', 'author_name', 'author_avatar', 'title', 'description', 'image_url', 'whatsapp_number', 'target_url', 'hashtags', 'category', 'price_paid', 'duration_days', 'status', 'rejection_reason', 'likes_count', 'comments_count', 'shares_count', 'clicks_count', 'impressions_count', 'starts_at', 'expires_at', 'page_id', 'location_city', 'phone_number', 'video_url', 'is_boosted', 'boosted_until', 'boost_tier', 'boost_price', 'created_at', 'updated_at', 'ad_format', 'quick_questions', 'feeling', 'tagged_users', 'is_ai_generated', 'has_whatsapp_button']
      },
      bulletin_pages: {
        columns: ['id', 'user_id', 'name', 'slug', 'category', 'city', 'address', 'description', 'avatar_url', 'cover_url', 'whatsapp_number', 'phone_number', 'website_url', 'is_verified', 'followers_count', 'ads_count', 'created_at', 'updated_at']
      },
      route_seo_settings: {
        columns: ['id', 'route', 'title_ar', 'title_en', 'description_ar', 'description_en', 'keywords_ar', 'keywords_en', 'og_image_url', 'alt_text_ar', 'alt_text_en', 'is_active', 'created_at', 'updated_at']
      },
      asset_metadata: {
        columns: ['id', 'file_url', 'asset_name', 'mime_type', 'file_size', 'alt_text_ar', 'alt_text_en', 'og_title_ar', 'og_title_en', 'og_description_ar', 'og_description_en', 'keywords_ar', 'keywords_en', 'visual_summary', 'ai_analysis_raw', 'created_at', 'updated_at']
      },
      registered_agents: {
        columns: ['id', 'client_id', 'client_secret', 'api_key_hash', 'client_name', 'identity_type', 'credential_type', 'redirect_uris', 'jwks_uri', 'user_agent', 'signature_keys', 'permissions', 'is_active', 'user_id', 'created_at']
      },
      marketplace_items: {
        columns: ['id', 'user_id', 'title_en', 'title_ar', 'description_en', 'description_ar', 'price', 'category_en', 'category_ar', 'image_url', 'status', 'views', 'contact_link', 'download_url', 'preview_url', 'video_url', 'features', 'technologies', 'referral_percent', 'highlight_tag', 'license_type', 'created_at', 'updated_at']
      },
      marketplace_purchases: {
        columns: ['id', 'user_id', 'item_id', 'price_paid', 'license_type', 'referrer_id', 'commission_paid', 'download_token', 'created_at']
      },
      marketplace_reviews: {
        columns: ['id', 'user_id', 'item_id', 'rating', 'comment', 'created_at', 'updated_at']
      },
      video_resources: {
        columns: ['id', 'user_id', 'chat_id', 'message_id', 'file_url', 'prompt', 'provider', 'model', 'duration', 'aspect_ratio', 'resolution', 'metadata', 'created_at']
      },
      referral_invitations: {
        columns: ['id', 'referrer_id', 'email', 'status', 'subject', 'body', 'referred_email', 'invite_code', 'created_at', 'updated_at']
      },
      shared_snapshots: {
        columns: ['id', 'user_id', 'title', 'content', 'model_name', 'created_at', 'views_count']
      },
      gift_catalog: {
        columns: ['id', 'name_ar', 'name_en', 'icon', 'points', 'is_active', 'created_at', 'updated_at']
      },
      google_tool_connections: {
        columns: ['id', 'user_id', 'tool_id', 'is_connected', 'config', 'access_token', 'refresh_token', 'expires_at', 'scopes', 'last_connected_at', 'created_at', 'updated_at']
      },
      advertisements: {
        columns: ['id', 'title_ar', 'title_en', 'description_ar', 'description_en', 'image_url', 'video_url', 'poster_url', 'target_url', 'sponsor_name', 'badge_text_ar', 'badge_text_en', 'position', 'format', 'display_order', 'is_active', 'meta_title_ar', 'meta_title_en', 'meta_description_ar', 'meta_description_en', 'keywords_ar', 'keywords_en', 'click_count', 'impression_count', 'start_date', 'end_date', 'created_at', 'updated_at'],
        repairCols: {
          video_url: { type: 'TEXT' },
          poster_url: { type: 'TEXT' },
          format: { type: 'VARCHAR(50)', default: "'sidebar'" },
          meta_title_ar: { type: 'VARCHAR(255)' },
          meta_title_en: { type: 'VARCHAR(255)' },
          meta_description_ar: { type: 'TEXT' },
          meta_description_en: { type: 'TEXT' },
          keywords_ar: { type: 'TEXT' },
          keywords_en: { type: 'TEXT' },
          click_count: { type: 'INTEGER', default: 0 },
          impression_count: { type: 'INTEGER', default: 0 },
          start_date: { type: 'TIMESTAMP' },
          end_date: { type: 'TIMESTAMP' },
          created_at: { type: 'TIMESTAMP', default: 'CURRENT_TIMESTAMP' },
          updated_at: { type: 'TIMESTAMP', default: 'CURRENT_TIMESTAMP' }
        }
      }
    },
    ledger: {
      wallets: {
        columns: ['id', 'user_id', 'balance', 'usd_balance', 'points', 'created_at', 'updated_at', 'referral_activated']
      },
      ledger_transactions: {
        columns: ['id', 'wallet_id', 'user_id', 'amount', 'points', 'transaction_type', 'status', 'reference_id', 'metadata', 'ip_address', 'description', 'is_hidden', 'created_at', 'updated_at']
      },
      deposit_requests: {
        columns: ['id', 'user_id', 'amount', 'currency', 'method', 'proof_url', 'status', 'rejection_reason', 'admin_id', 'created_at', 'updated_at']
      },
      economy_settings: {
        columns: ['id', 'welcome_bonus_points', 'referral_bonus_points', 'min_withdrawal_cents', 'points_per_dollar', 'conversion_rate', 'referral_bonus_percent', 'min_payout_usd', 'min_deposit_usd', 'referral_activation_min_deposit', 'crypto_address', 'bank_name', 'bank_recipient', 'bank_iban', 'bank_swift', 'paypal_email', 'updated_at']
      }
    },
    external: {
      blog_articles: {
        columns: ['id', 'author_id', 'slug', 'title_en', 'title_ar', 'content_en', 'content_ar', 'image_url', 'category_en', 'category_ar', 'views', 'created_at', 'updated_at']
      },
      blog_comments: {
        columns: ['id', 'article_id', 'user_id', 'content', 'created_at', 'updated_at']
      },
      blog_ratings: {
        columns: ['id', 'article_id', 'user_id', 'rating', 'created_at']
      }
    },
    security: {
      token_blacklist: {
        columns: ['id', 'token', 'expires_at', 'created_at']
      },
      security_alerts: {
        columns: ['id', 'user_id', 'type', 'severity', 'description', 'metadata', 'is_resolved', 'ip_address', 'created_at', 'updated_at']
      },
      admin_audit_logs: {
        columns: ['id', 'admin_id', 'admin_email', 'action', 'target_resource', 'details', 'ip_address', 'user_agent', 'created_at']
      }
    }
  };

  const verifyDbGroup = async (groupName: 'core' | 'ledger' | 'external' | 'security', targetPoolObj: any) => {
    if (!targetPoolObj) return;
    try {
      const activeTables = await queryColumns(targetPoolObj);
      const expectedTables = expectedSchema[groupName];

      for (const [tableName, spec] of Object.entries(expectedTables)) {
        if (!activeTables[tableName]) {
          report.passed = false;
          report.missingTables.push({ db: groupName, table: tableName });
          console.warn(`[Schema Integrity] Missing table: ${tableName} in database group ${groupName}`);

          try {
            console.log(`[Schema Integrity] Attempting table reconstruction for ${tableName}...`);
            await initDb('additive', pool, ledgerPool);
            report.repairedTables.push(tableName);
            console.log(`[Schema Integrity] Table ${tableName} reconstructed successfully.`);
          } catch (repairErr) {
            console.error(`[Schema Integrity] Reconstruction failed for table ${tableName}:`, repairErr instanceof Error ? repairErr.message : 'Unknown error');
          }
          continue;
        }

        const activeCols = activeTables[tableName];
        for (const colName of spec.columns) {
          if (!activeCols.has(colName)) {
            report.passed = false;
            const rCol = spec.repairCols?.[colName];
            const expectedTypeStr = typeof rCol === 'string' ? rCol : (rCol ? `${rCol.type}${rCol.default !== undefined ? ' DEFAULT ' + rCol.default : ''}` : 'VARCHAR');
            report.missingColumns.push({
              db: groupName,
              table: tableName,
              column: colName,
              expectedType: expectedTypeStr
            });
            console.warn(`[Schema Integrity] Missing column: ${tableName}.${colName} in database group ${groupName}`);

            if (rCol) {
              try {
                const colConfig = typeof rCol === 'string' ? { type: rCol } : rCol;
                await ensureColumnsBulk(targetPoolObj, tableName, {
                  [colName]: colConfig
                });
                report.repairedColumns.push(`${tableName}.${colName}`);
                console.log(`[Schema Integrity] Column ${tableName}.${colName} added successfully.`);
              } catch (repairErr) {
                console.error(`[Schema Integrity] Column repair failed for ${tableName}.${colName}:`, repairErr instanceof Error ? repairErr.message : 'Unknown error');
              }
            }
          }
        }
      }
    } catch (error) {
      report.passed = false;
      report.errors.push(`${groupName} DB: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error(`[Schema Integrity] Error auditing database group ${groupName}:`, error instanceof Error ? error.message : 'Unknown error');
    }
  };

  await verifyDbGroup('core', pool);
  await verifyDbGroup('ledger', ledgerPool || pool);
  await verifyDbGroup('external', externalPool || pool);
  await verifyDbGroup('security', securityPool || pool);

  if (report.passed) {
    console.log('[Schema Integrity] All expected tables and columns verified successfully across all active pools!');
  } else {
    console.warn(`[Schema Integrity] Schema verification detected deviations:`, {
      missingTables: report.missingTables.length,
      missingColumns: report.missingColumns.length,
      repairedTables: report.repairedTables.length,
      repairedColumns: report.repairedColumns.length
    });
  }

  try {
    await pool.query(`
      INSERT INTO migration_security_audit (migration_name, status, error_message, details)
      VALUES ($1, $2, $3, $4)
    `, [
      'schema_integrity_audit_verification',
      report.passed ? 'info' : 'conflict',
      report.passed ? 'No anomalies detected.' : `Detected missing tables/columns. Repaired: ${report.repairedColumns.length + report.repairedTables.length}`,
      JSON.stringify({
        timestamp: new Date().toISOString(),
        passed: report.passed,
        missingTables: report.missingTables,
        missingColumns: report.missingColumns,
        repairedTables: report.repairedTables,
        repairedColumns: report.repairedColumns,
        errors: report.errors
      })
    ]);
  } catch (dbErr) {
    console.error('[Schema Integrity] Failed to write audit record to migration_security_audit:', dbErr instanceof Error ? dbErr.message : 'Unknown error');
  }
}
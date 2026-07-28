import { ensureAdsTable } from '../routes/ads.js';
import { ensureBulletinTables } from '../routes/bulletin.js';
import pkg from 'pg';
const { Pool } = pkg;
import type { Pool as PgPool, PoolClient as PgPoolClient } from 'pg';
import { User, Wallet, Subscription, ApiKeyVault, UserFile, ToolOrchestrator, Notification } from './types.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { pool, ledgerPool, externalPool, securityPool, getExternalPool, getSecurityPool, initializePerplextaPools, createInternalPool } from './index.js';
import { encrypt, decrypt } from '../utils/crypto.js';

export type QueryClient = PgPool | PgPoolClient | {
  query: (text: string | { text: string }, params?: any[]) => Promise<any>;
  release?: () => void;
  connect?: () => Promise<any>;
};

export interface WrappedClient {
  release: () => void;
  query: (text: string | { text: string }, params?: any[]) => Promise<any>;
}

export async function runSystemMaintenance() {
  try {
    if (pool) {
      const tableCheck = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name IN (
          'token_blacklist', 'password_resets', 
          'subscriptions', 'oauth_states', 'notifications', 
          'system_logs', 'stripe_events', 'security_alerts',
          'user_usage'
        )
      `);
      const existingTables = new Set(tableCheck.rows.map((r: { table_name: string }) => r.table_name));

      if (existingTables.has('token_blacklist')) {
        const securityPool = getSecurityPool() || pool;
        await securityPool.query("DELETE FROM token_blacklist WHERE expires_at < CURRENT_TIMESTAMP");
      }
      
      if (existingTables.has('password_resets')) {
        await pool.query("DELETE FROM password_resets WHERE expires_at < CURRENT_TIMESTAMP");
      }
      
      if (existingTables.has('subscriptions')) {
        await pool.query(`
          UPDATE subscriptions 
          SET status = 'expired', updated_at = CURRENT_TIMESTAMP 
          WHERE current_period_end < CURRENT_TIMESTAMP 
          AND status = 'active'
        `);
      }

      if (existingTables.has('oauth_states')) {
        await pool.query("DELETE FROM oauth_states WHERE expires_at < CURRENT_TIMESTAMP");
      }

      if (existingTables.has('notifications')) {
        await pool.query(`
          DELETE FROM notifications 
          WHERE (is_read = true AND created_at < CURRENT_TIMESTAMP - INTERVAL '30 days')
             OR created_at < CURRENT_TIMESTAMP - INTERVAL '90 days'
        `);
      }

      if (existingTables.has('system_logs')) {
        await pool.query("DELETE FROM system_logs WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '30 days'");
      }

      if (existingTables.has('stripe_events')) {
        await pool.query("DELETE FROM stripe_events WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '90 days'");
      }

      if (existingTables.has('security_alerts')) {
        await pool.query("DELETE FROM security_alerts WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '90 days'");
      }

      if (existingTables.has('user_usage')) {
        await pool.query("DELETE FROM user_usage WHERE usage_date < CURRENT_DATE - INTERVAL '90 days'");
      }

      try {
        const secPool = getSecurityPool();
        if (secPool) {
          const secTableCheck = await secPool.query(`
            SELECT EXISTS (
              SELECT FROM information_schema.tables 
              WHERE table_name = 'admin_audit_logs'
            )
          `);
          if (secTableCheck.rows[0].exists) {
            await secPool.query("DELETE FROM admin_audit_logs WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '180 days'");
            console.log('[Maintenance] Compliant admin audit logs older than 180 days pruned successfully.');
          }
        }
      } catch (secErr: unknown) {
        console.warn('[Maintenance] Skipping admin audit logs cleanup:', (secErr as Error).message);
      }

      console.log('[Maintenance] Daily system and database event logging cleanups completed successfully.');
    }
  } catch (e: unknown) {
    console.error('[Maintenance] System maintenance failed:', (e as Error).message);
  }
}

let io: { emit: (event: string, data: Record<string, unknown>) => void } | null = null;
export function setIo(socketIo: { emit: (event: string, data: Record<string, unknown>) => void }) {
  io = socketIo;
}

export async function ensureColumn(
  poolObj: QueryClient,
  tableName: string,
  columnName: string,
  type: string,
  defaultVal?: string | number | boolean | null
) {
  const isClient = 'release' in poolObj && typeof poolObj.release === 'function';
  const client = isClient ? (poolObj as PgPoolClient) : await (poolObj as PgPool).connect();
  
  try {
    if (!isClient) await client.query('BEGIN');
    
    const check = await client.query(
      `SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
      [tableName, columnName]
    );
    
    if (check.rows.length === 0) {
      if (!/^[a-zA-Z0-9_]+$/.test(tableName) || !/^[a-zA-Z0-9_]+$/.test(columnName)) {
        throw new Error(`Invalid identifier: ${tableName}.${columnName}`);
      }
      
      if (!/^[a-zA-Z0-9_(),\s]+$/i.test(type)) {
        throw new Error(`Invalid SQL type identifier: ${type}`);
      }
      if (defaultVal !== undefined && defaultVal !== null) {
        const defaultStr = String(defaultVal).trim();
        if (!/^[a-zA-Z0-9_()\-:.',"\s\[\]{}]+$/i.test(defaultStr)) {
          throw new Error(`Invalid default value expression: ${defaultStr}`);
        }
      }
      
      await client.query(`ALTER TABLE "${tableName}" ADD COLUMN "${columnName}" ${type}`);
      if (defaultVal !== undefined && defaultVal !== null) {
        await client.query(
          `ALTER TABLE "${tableName}" ALTER COLUMN "${columnName}" SET DEFAULT ${defaultVal}`
        );
      }
      console.log(`[Database] Added column ${columnName} to ${tableName}`);
    }
    
    if (!isClient) await client.query('COMMIT');
  } catch (e: unknown) {
    if (!isClient) await client.query('ROLLBACK');
    const err = e as Error & { code?: string };
    console.error(`[Database] ERROR in ensureColumn (${tableName}.${columnName}):`, err.message);
    try {
      if (pool) {
        await pool.query(`
          INSERT INTO migration_security_audit (migration_name, status, error_message, sql_state, details)
          VALUES ($1, 'conflict', $2, $3, $4)
        `, [
          `ensureColumn_${tableName}_${columnName}`,
          err.message || 'Unknown error',
          err.code || null,
          JSON.stringify({ tableName, columnName, type, defaultVal })
        ]);
      }
    } catch (auditErr) {
      // ignore
    }
    throw e;
  } finally {
    if (!isClient) (client as PgPoolClient).release();
  }
}

export async function runDatabaseMigrations(type: 'scratch' | 'additive' = 'additive') {
  try {
    await ensureAdsTable();
    await ensureBulletinTables();
  } catch (e: any) {
    console.error('[Migrations] Error running ads/bulletin migrations:', e.message);
  }

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

  if (isLedgerDistinct) {
    try {
      ledgerClient = await ledgerPool.connect();
      console.log('[Migrations] Connecting to secondary Ledger DB for dual-path synchronization...');
    } catch (e) {
      console.warn('[Migrations] Failed to connect to secondary Ledger DB. Falling back to Core for ledger tables.');
      ledgerClient = null;
    }
  }

  if (isExternalDistinct) {
    try {
      externalClient = await externalPool.connect();
      console.log('[Migrations] Connecting to secondary External DB for dual-path forum/blog synchronization...');
    } catch (e) {
      console.warn('[Migrations] Failed to connect to secondary External DB:', e);
      externalClient = null;
    }
  }

  if (isSecurityDistinct) {
    try {
      securityClient = await securityPool.connect();
      console.log('[Migrations] Connecting to secondary Security DB for dual-path blacklist/alert synchronization...');
    } catch (e) {
      console.warn('[Migrations] Failed to connect to secondary Security DB:', e);
      securityClient = null;
    }
  }
  
  try {
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

    const activeSecurityClient = securityClient || client;
    try {
      const checkSecTable = await activeSecurityClient.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'token_blacklist'
        )
      `);
      if (!checkSecTable.rows[0].exists) {
        console.log('[Migrations] token_blacklist table does not exist on active security database. Forcing re-run of baseline security migrations and Direct Seed...');
        await client.query(`
          DELETE FROM migration_history 
          WHERE migration_name IN (
            'v11_ensure_baseline_tables',
            'v12_token_blacklist_security_hardening'
          )
        `);
        
        await activeSecurityClient.query(`
          CREATE TABLE IF NOT EXISTS token_blacklist (
            id SERIAL PRIMARY KEY,
            token TEXT UNIQUE NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        
        await activeSecurityClient.query(`
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

        await activeSecurityClient.query(`
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
      }
    } catch (e: unknown) {
      console.warn('[Migrations] Failed to inspect/initialize security database tables:', (e as Error).message);
    }

    if (type === 'scratch') {
      console.warn('[Migrations] RUNNING IN SCRATCH MODE - ALL DATA WILL BE WIPED');
      const tables = ['db_connections_registry', 'users', 'user_sessions', 'chats', 'messages', 'api_keys_vault', 'tool_orchestrator', 'subscriptions', 'plans', 'user_usage', 'notifications', 'chat_memories', 'email_templates', 'email_settings', 'message_reports', 'user_shortcuts', 'system_settings', 'system_broadcasts', 'user_files', 'security_alerts', 'system_logs', 'token_blacklist', 'password_resets', 'support_tickets', 'support_ticket_replies', 'oauth_states', 'admin_audit_logs'];
      for (const t of tables) {
        await client.query(`DROP TABLE IF EXISTS "${t}" CASCADE`);
      }
      if (ledgerClient) {
        const ledgerTables = ['wallets', 'ledger_transactions', 'referrals', 'referral_tree', 'kyc_requests', 'withdrawal_requests', 'payout_accounts', 'economy_settings', 'coupon_usages', 'deposit_requests', 'coupons', 'stripe_events'];
        for (const t of ledgerTables) {
          await ledgerClient.query(`DROP TABLE IF EXISTS "${t}" CASCADE`);
        }
      }
      if (externalClient) {
        const externalTables = ['blog_articles', 'blog_comments', 'blog_ratings'];
        for (const t of externalTables) {
          await externalClient.query(`DROP TABLE IF EXISTS "${t}" CASCADE`);
        }
      }
      if (securityClient) {
        const securityTables = ['token_blacklist', 'security_alerts', 'admin_audit_logs'];
        for (const t of securityTables) {
          await securityClient.query(`DROP TABLE IF EXISTS "${t}" CASCADE`);
        }
      }
      await client.query('DELETE FROM migration_history');
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
        const lockKey = Buffer.from(name).reduce((acc, c) => acc + c, 0);
        await client.query(`SELECT pg_advisory_lock($1)`, [lockKey]);
        try {
          const doubleCheck = await client.query('SELECT 1 FROM migration_history WHERE migration_name = $1', [name]);
          if (doubleCheck.rows.length > 0) return;

          console.log(`[Migrations] Applying ${name}: ${description}...`);
          await client.query('BEGIN');
          if (ledgerClient) await ledgerClient.query('BEGIN');
          if (externalClient) await externalClient.query('BEGIN');
          if (securityClient) await securityClient.query('BEGIN');
          try {
            const findClientForQuery = (sql: string, params?: unknown[]) => {
              const queryLower = sql.toLowerCase();
              
              const isTableMatched = (tableName: string) => {
                if (queryLower.includes(tableName)) return true;
                if (params && params.some(p => typeof p === 'string' && p.toLowerCase() === tableName)) return true;
                return false;
              };

              if (
                isTableMatched('blog_articles') ||
                isTableMatched('blog_comments') ||
                isTableMatched('blog_ratings')
              ) {
                return externalClient || client;
              }
              
              if (
                isTableMatched('token_blacklist') ||
                isTableMatched('security_alerts') ||
                isTableMatched('admin_audit_logs')
              ) {
                return securityClient || client;
              }
              
              const ledgerTables = [
                'wallets', 'ledger_transactions', 'referrals', 'referral_tree', 
                'kyc_requests', 'withdrawal_requests', 'payout_accounts', 
                'economy_settings', 'coupon_usages', 'deposit_requests', 
                'coupons', 'stripe_events'
              ];
              if (ledgerTables.some(t => isTableMatched(t))) {
                return ledgerClient || client;
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
            console.log(`[Migrations] Successfully applied ${name}.`);
          } catch (e: unknown) {
            await client.query('ROLLBACK');
            if (ledgerClient) await ledgerClient.query('ROLLBACK');
            if (externalClient) await externalClient.query('ROLLBACK');
            if (securityClient) await securityClient.query('ROLLBACK');
            const err = e as Error & { code?: string };
            console.error(`[Migrations] Failed to apply ${name}:`, err);
            
            try {
              await client.query(`
                INSERT INTO migration_security_audit (migration_name, status, error_message, sql_state, details)
                VALUES ($1, 'failed', $2, $3, $4)
              `, [
                name,
                err.message || 'Unknown error',
                err.code || null,
                JSON.stringify({ stack: err.stack, phase: 'runVersioned' })
              ]);
            } catch (auditErr) {
              console.error('[Migrations] Failed to write failure audit log:', auditErr);
            }
            
            throw e;
          }
        } finally {
          await client.query(`SELECT pg_advisory_unlock($1)`, [lockKey]);
        }
      }
    };

    console.log('[Migrations] 🚀 Running dynamic schema auto-repair (syncing tables and columns)...');
    await initDb('additive');

    await runVersioned('v1_core_schema', 'Initial core database schema', async (tx, ledgerTx) => {
      // handled by auto-repair step above
    });

    await runVersioned('v2_additive_columns', 'Ensuring idempotent columns and constraints', async (tx) => {
      await ensureColumn(tx, 'users', 'last_active_at', 'TIMESTAMP');
      await ensureColumn(tx, 'users', 'theme', 'VARCHAR(10)', `'dark'`);
      await ensureColumn(tx, 'users', 'updated_at', 'TIMESTAMP', 'CURRENT_TIMESTAMP');
      await ensureColumn(tx, 'users', 'referred_by', 'INTEGER');
      await ensureColumn(tx, 'users', 'kyc_submitted_at', 'TIMESTAMP');
      await ensureColumn(tx, 'users', 'kyc_rejection_reason', 'TEXT');
      await ensureColumn(tx, 'users', 'memory', 'TEXT');
      await ensureColumn(tx, 'users', 'support_notes', 'TEXT');
      await ensureColumn(tx, 'users', 'password_hash', 'TEXT');
      await ensureColumn(tx, 'users', 'status', 'VARCHAR(20)', `'active'`);
      await ensureColumn(tx, 'users', 'avatar', 'TEXT');

      await ensureColumn(tx, 'chats', 'updated_at', 'TIMESTAMP', 'CURRENT_TIMESTAMP');
      await ensureColumn(tx, 'chats', 'context_summary', 'TEXT');

      await ensureColumn(tx, 'messages', 'thinking_steps', 'JSONB', `'[]'`);
      await ensureColumn(tx, 'messages', 'citations', 'JSONB', `'[]'`);
      await ensureColumn(tx, 'messages', 'follow_ups', 'JSONB', `'[]'`);
      await ensureColumn(tx, 'messages', 'feedback', 'SMALLINT', '0');
      await ensureColumn(tx, 'messages', 'generation_time', 'NUMERIC');

      await ensureColumn(tx, 'api_keys_vault', 'updated_at', 'TIMESTAMP', 'CURRENT_TIMESTAMP');
      await ensureColumn(tx, 'api_keys_vault', 'model_list', 'JSONB', `'[]'`);
      await ensureColumn(tx, 'api_keys_vault', 'last_reset_date', 'DATE', 'CURRENT_DATE');

      await ensureColumn(tx, 'subscriptions', 'stripe_customer_id', 'VARCHAR(255)');
      await ensureColumn(tx, 'subscriptions', 'stripe_subscription_id', 'VARCHAR(255)');
      await ensureColumn(tx, 'subscriptions', 'billing_period', 'VARCHAR(20)', `'monthly'`);
      await ensureColumn(tx, 'subscriptions', 'last_period_start', 'TIMESTAMP', 'CURRENT_TIMESTAMP');

      await ensureColumn(tx, 'user_files', 'file_type', 'VARCHAR(100)');
      await ensureColumn(tx, 'user_files', 'file_size', 'INTEGER');
      await ensureColumn(tx, 'user_files', 'file_url', 'TEXT');
      await ensureColumn(tx, 'user_files', 'file_content', 'TEXT');
      await ensureColumn(tx, 'user_files', 'mime_type', 'VARCHAR(100)');

      await ensureColumn(tx, 'system_settings', 'stripe_status', 'VARCHAR(20)', `'pending'`);
      await ensureColumn(tx, 'system_settings', 'stripe_last_verified_at', 'TIMESTAMP');
      await ensureColumn(tx, 'system_settings', 'stripe_secret_key', 'TEXT');
      await ensureColumn(tx, 'system_settings', 'stripe_publishable_key', 'TEXT');
      await ensureColumn(tx, 'system_settings', 'stripe_webhook_secret', 'TEXT');
      await ensureColumn(tx, 'system_settings', 'stripe_live_mode', 'BOOLEAN', 'false');

      await ensureColumn(tx, 'tool_orchestrator', 'fallback_1_provider', 'VARCHAR(50)');
      await ensureColumn(tx, 'tool_orchestrator', 'fallback_1_model', 'VARCHAR(255)');
      await ensureColumn(tx, 'tool_orchestrator', 'fallback_2_provider', 'VARCHAR(50)');
      await ensureColumn(tx, 'tool_orchestrator', 'fallback_2_model', 'VARCHAR(255)');
      await ensureColumn(tx, 'tool_orchestrator', 'fallback_3_provider', 'VARCHAR(50)');
      await ensureColumn(tx, 'tool_orchestrator', 'fallback_3_model', 'VARCHAR(255)');

      await ensureColumn(tx, 'system_broadcasts', 'admin_id', 'INTEGER');
      await ensureColumn(tx, 'system_broadcasts', 'broadcast_type', 'VARCHAR(50)', `'system'`);
      await ensureColumn(tx, 'system_broadcasts', 'type', 'VARCHAR(50)', `'system'`);
      await ensureColumn(tx, 'system_broadcasts', 'target_group', 'VARCHAR(50)', `'all'`);
      await ensureColumn(tx, 'system_broadcasts', 'target_role', 'VARCHAR(20)', `'all'`);
      await ensureColumn(tx, 'system_broadcasts', 'status', 'VARCHAR(20)', `'completed'`);
      await ensureColumn(tx, 'system_broadcasts', 'sent_count', 'INTEGER', '0');

      await ensureColumn(tx, 'system_logs', 'type', 'VARCHAR(50)', `'system'`);
      await ensureColumn(tx, 'system_logs', 'details', 'JSONB', `'{}'`);
      await ensureColumn(tx, 'security_alerts', 'type', 'VARCHAR(50)', `'security'`);
      await ensureColumn(tx, 'plans', 'plan_type', 'VARCHAR(100)', `'user'`);

      await tx.query(`SELECT 1`);
    });

    await runVersioned('v3_ledger_schema_v1', 'Initial Ledger DB schema and hardened transactions', async (tx, ledgerTx) => {
      const ledgerTarget = ledgerTx || tx;
      
      await ensureColumn(ledgerTarget, 'wallets', 'balance', 'DECIMAL(15,4)', '0.0000');
      await ensureColumn(ledgerTarget, 'wallets', 'updated_at', 'TIMESTAMP', 'CURRENT_TIMESTAMP');
      await ensureColumn(ledgerTarget, 'wallets', 'referral_activated', 'BOOLEAN', 'false');
      
      await ensureColumn(ledgerTarget, 'ledger_transactions', 'user_id', 'INTEGER');
      await ensureColumn(ledgerTarget, 'ledger_transactions', 'status', 'VARCHAR(20)', `'success'`);
      await ensureColumn(ledgerTarget, 'ledger_transactions', 'metadata', 'JSONB', `'{}'`);
      await ensureColumn(ledgerTarget, 'ledger_transactions', 'ip_address', 'VARCHAR(45)');
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
      await ensureColumn(ledgerTarget, 'coupons', 'usage_limit', 'INTEGER', '0');
      await ensureColumn(ledgerTarget, 'coupons', 'usage_count', 'INTEGER', '0');
      await ensureColumn(ledgerTarget, 'coupons', 'is_active', 'BOOLEAN', 'true');
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
      const { encrypt } = await import('../utils/crypto.js');
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

    await runVersioned('v9_filler_reconciliation', 'Reconciling migration index sequence to ensure consistent numbering', async (tx) => {
      await tx.query(`SELECT 1`);
    });

    await runVersioned('v10_economy_refactor', 'Removing redundant economy columns from system_settings and ensuring Ledger DB as source of truth', async (tx, ledgerTx) => {
      const dropCols = [
        'points_per_dollar', 'min_payout_usd', 'min_deposit_usd', 
        'referral_bonus_percent', 'welcome_bonus_points', 'referral_bonus_points', 
        'conversion_rate', 'min_withdrawal_cents', 'referral_activation_min_deposit'
      ];
      for (const col of dropCols) {
        await tx.query(`ALTER TABLE system_settings DROP COLUMN IF EXISTS "${col}"`);
      }
      
      const ledgerTarget = ledgerTx || tx;
      await ensureColumn(ledgerTarget, 'economy_settings', 'referral_activation_min_deposit', 'NUMERIC(10, 2)', "'10.00'");
      
      console.log('[Migrations] Economy refactor: Removed redundant columns from Core DB and ensured Ledger DB schema.');
    });

    await runVersioned('v11_ensure_baseline_tables', 'Ensuring critical tables like password_resets exist', async (tx) => {
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
      
      const sTarget = typeof securityClient !== 'undefined' ? (securityClient || client) : client;
      await sTarget.query(`
        CREATE TABLE IF NOT EXISTS token_blacklist (
          id SERIAL PRIMARY KEY,
          token TEXT UNIQUE NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    });

    await runVersioned('v12_token_blacklist_security_hardening', 'Hardening token_blacklist security indexes and expiration TTL performance', async (tx) => {
      const sTarget = typeof securityClient !== 'undefined' && securityClient ? securityClient : client;
      
      await sTarget.query(`
        CREATE TABLE IF NOT EXISTS token_blacklist (
          id SERIAL PRIMARY KEY,
          token TEXT UNIQUE NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await sTarget.query(`CREATE UNIQUE INDEX IF NOT EXISTS token_blacklist_pkey ON token_blacklist(id)`);
      await sTarget.query(`CREATE UNIQUE INDEX IF NOT EXISTS token_blacklist_token_key ON token_blacklist(token)`);
      await sTarget.query(`CREATE INDEX IF NOT EXISTS idx_token_blacklist_active_expires ON token_blacklist(expires_at)`);
    });

    await runVersioned('v13_payment_gateways_expansion', 'Adding crypto deposit address, bank details, and PayPal address to economy_settings', async (tx, ledgerTx) => {
      const ledgerTarget = ledgerTx || tx;

      await ensureColumn(ledgerTarget, 'economy_settings', 'crypto_address', 'TEXT', null);
      await ensureColumn(ledgerTarget, 'economy_settings', 'bank_name', 'VARCHAR(255)', null);
      await ensureColumn(ledgerTarget, 'economy_settings', 'bank_recipient', 'VARCHAR(255)', null);
      await ensureColumn(ledgerTarget, 'economy_settings', 'bank_iban', 'VARCHAR(255)', null);
      await ensureColumn(ledgerTarget, 'economy_settings', 'bank_swift', 'VARCHAR(100)', null);
      await ensureColumn(ledgerTarget, 'economy_settings', 'paypal_email', 'VARCHAR(255)', null);

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

    await runVersioned('v14_paypal_settings', 'Adding PayPal credential columns to system_settings table', async (tx) => {
      await ensureColumn(tx, 'system_settings', 'paypal_client_id', 'TEXT');
      await ensureColumn(tx, 'system_settings', 'paypal_client_secret', 'TEXT');
      await ensureColumn(tx, 'system_settings', 'paypal_mode', "VARCHAR(20)", `'sandbox'`);
      await ensureColumn(tx, 'system_settings', 'paypal_status', "VARCHAR(50)", `'pending'`);
      await ensureColumn(tx, 'system_settings', 'paypal_last_verified_at', 'TIMESTAMP');
    });

    await runVersioned('v15_transaction_hide_column', 'Adding is_hidden column to ledger_transactions for user level clear/archive mechanics', async (tx, ledgerTx) => {
      const ledgerTarget = ledgerTx || tx;
      await ensureColumn(ledgerTarget, 'ledger_transactions', 'is_hidden', 'BOOLEAN', 'false');
    });

    await runVersioned('v16_user_referral_code', 'Adding unique 6-character alphanumeric referral_code to users table and populating existing users', async (tx) => {
      await ensureColumn(tx, 'users', 'referral_code', 'VARCHAR(6)');
      
      const usersRes = await tx.query('SELECT id FROM users WHERE referral_code IS NULL OR referral_code = \'\'');
      for (const row of usersRes.rows) {
        let code = '';
        let isUnique = false;
        let attempts = 0;
        while (!isUnique && attempts < 100) {
          attempts++;
          const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
          code = '';
          const randomBytes = crypto.randomBytes(6);
          for (let i = 0; i < 6; i++) {
            code += chars.charAt(randomBytes[i] % chars.length);
          }
          const dupRes = await tx.query('SELECT id FROM users WHERE referral_code = $1', [code]);
          if (dupRes.rows.length === 0) {
            isUnique = true;
          }
        }
        await tx.query('UPDATE users SET referral_code = $1 WHERE id = $2', [code, row.id]);
      }
      
      await tx.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code)');
    });

    await runVersioned('v17_messages_schema_update', 'Ensuring tracking and generation metadata columns exist in messages table', async (tx) => {
      await ensureColumn(tx, 'messages', 'thinking_steps', 'JSONB', `'[]'`);
      await ensureColumn(tx, 'messages', 'citations', 'JSONB', `'[]'`);
      await ensureColumn(tx, 'messages', 'follow_ups', 'JSONB', `'[]'`);
      await ensureColumn(tx, 'messages', 'feedback', 'SMALLINT', '0');
      await ensureColumn(tx, 'messages', 'generation_time', 'NUMERIC');
      await ensureColumn(tx, 'messages', 'is_pinned', 'BOOLEAN', 'false');
    });

    await runVersioned('v18_user_sessions_schema', 'Greatly hardening session persistence, tracking active logins, IP, and platform preferences', async (tx) => {
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

    await runVersioned('v19_seo_upgrade', 'Ensuring system_settings has robust SEO descriptions and keywords column extensions', async (tx) => {
      await ensureColumn(tx, 'system_settings', 'seo_description_en', 'TEXT');
      await ensureColumn(tx, 'system_settings', 'seo_description_ar', 'TEXT');
      await ensureColumn(tx, 'system_settings', 'keywords_en', 'TEXT');
      await ensureColumn(tx, 'system_settings', 'keywords_ar', 'TEXT');
      await ensureColumn(tx, 'system_settings', 'site_description_en', 'TEXT');
      await ensureColumn(tx, 'system_settings', 'site_description_ar', 'TEXT');
    });

    await runVersioned('v20_seo_image', 'Adding seo_image_url column extension to support high-efficiency open graph representations', async (tx) => {
      await ensureColumn(tx, 'system_settings', 'seo_image_url', 'TEXT');
    });

    await runVersioned('v21_google_site_verification', 'Adding google_site_verification column extension to support dynamic search console verification', async (tx) => {
      await ensureColumn(tx, 'system_settings', 'google_site_verification', 'VARCHAR(255)');
    });

    await runVersioned('v22_forum_and_blog_schema', 'Created Forum and Blog core tables with initial categories', async (tx) => {
      await tx.query(`
        CREATE TABLE IF NOT EXISTS forum_categories (
          id SERIAL PRIMARY KEY,
          slug VARCHAR(100) UNIQUE NOT NULL,
          name_en VARCHAR(255) NOT NULL,
          name_ar VARCHAR(255) NOT NULL,
          description_en TEXT,
          description_ar TEXT,
          icon VARCHAR(100) DEFAULT 'MessageSquare',
          color VARCHAR(50) DEFAULT 'emerald',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await tx.query(`
        CREATE TABLE IF NOT EXISTS forum_posts (
          id SERIAL PRIMARY KEY,
          category_id INTEGER NOT NULL REFERENCES forum_categories(id) ON DELETE CASCADE,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          title VARCHAR(255) NOT NULL,
          content TEXT NOT NULL,
          is_pinned BOOLEAN DEFAULT false,
          is_locked BOOLEAN DEFAULT false,
          views INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await tx.query(`
        CREATE TABLE IF NOT EXISTS forum_comments (
          id SERIAL PRIMARY KEY,
          post_id INTEGER NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          content TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      const extTarget = externalClient || tx;
      await extTarget.query(`
        CREATE TABLE IF NOT EXISTS blog_articles (
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
        )
      `);

      await extTarget.query(`
        CREATE TABLE IF NOT EXISTS blog_comments (
          id SERIAL PRIMARY KEY,
          article_id INTEGER NOT NULL REFERENCES blog_articles(id) ON DELETE CASCADE,
          user_id INTEGER NOT NULL,
          content TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      const checkCata = await tx.query('SELECT COUNT(*) FROM forum_categories');
      if (parseInt(checkCata.rows[0].count, 10) === 0) {
        await tx.query(`
          INSERT INTO forum_categories (slug, name_en, name_ar, description_en, description_ar, icon, color) VALUES
          ('pioneers-devs-designers', 'Developers & Graphic Designers', 'مطورين ومصممين غرافيك', 'A dedicated realm for developers, graphic designers, and platform pioneers to deliberate architecture and visual arts.', 'مساحة تجمع المطورين، المصممين ورواد الأعمال لمناقشة المشاريع وتطوير الواجهات والحلول الرقمية.', 'Laptop', 'emerald'),
          ('prompt-engineering', 'Prompt Engineering (Prompts)', 'هندسة الاوامر (Prompts)', 'Exchange elite prompt engineering, model shortcuts, and executive automation scripts.', 'شارك أفضل هندسة للأوامر الذكية، الأوامر البرمجية البديعة، وحيل تشغيل النماذج والذكاء الاصطناعي.', 'Terminal', 'emerald'),
          ('troubleshooting', 'Troubleshooting', 'مشاركة الاخطاء وحلولها', 'A space to post logs, production crashes, structural bugs, and their swift solutions.', 'نقاشات تقنية حول المشاكل الفنية، الأخطاء الشائعة وحلولها البرمجية السريعة والفعالة.', 'HelpCircle', 'emerald'),
          ('expertise-sharing', 'Expertise & Knowledge Sharing', 'مشاركة الخبرات والمعرفة', 'Broadcast technical papers, lessons learned, and high-level industrial tips.', 'شارك الاستراتيجيات التقنية، الدروس المستفادة، والنصائح المهنية لتسريع نمو مهارات الأعضاء.', 'BookOpen', 'emerald'),
          ('our-works', 'Our Works & Showcases', 'معرض أعمالنا ومشاريعنا', 'Expose your repositories, design mockups, and client-facing creations to elite peer review.', 'اعرض تصاميمك، أكوادك البرمجية، والمشروعات التي نفذتها لتلقي آراء وتقييمات مجتمع نخبة بيربليكستا.', 'Briefcase', 'emerald'),
          ('web-hosting', 'Web Hosting & Deployment', 'استضافة المواقع والرفع', 'Discuss server nodes, cloud resources, domain management, DNS routing, and static deployments.', 'كل ما يخص خوادم الاستضافة، الحوسبة السحابية، ورفع النطاقات وإعدادات الشبكات والـ DNS.', 'Server', 'emerald')
        `);
      }
    });

    await runVersioned('v23_blog_ratings_and_sharing', 'Creating blog ratings database structure', async (tx) => {
      const extTarget = externalClient || tx;
      await extTarget.query(`
        CREATE TABLE IF NOT EXISTS blog_ratings (
          id SERIAL PRIMARY KEY,
          article_id INTEGER NOT NULL REFERENCES blog_articles(id) ON DELETE CASCADE,
          user_id INTEGER NOT NULL,
          rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE (article_id, user_id)
        )
      `);
    });

    await runVersioned('v24_seed_blog_platform_data', 'Seeding elite magazine articles to database', async (tx) => {
      const extTarget = externalClient || tx;
      const articlesCount = await extTarget.query('SELECT COUNT(*) FROM blog_articles');
      if (parseInt(articlesCount.rows[0].count, 10) === 0) {
        const adminRes = await tx.query("SELECT id FROM users WHERE role = 'admin' ORDER BY id ASC LIMIT 1");
        const authorId = adminRes.rows[0]?.id || 1;

        await extTarget.query(`
          INSERT INTO blog_articles (author_id, slug, title_en, title_ar, content_en, content_ar, image_url, category_en, category_ar, views) VALUES
          ($1, 'welcome-to-perplexta', 'Welcome to Perplexta', 'مرحباً بكم في بيربليكستا',
           'Perplexta is an advanced AI conversation platform that brings together the most powerful language models in a single unified experience.',
           'بيربليكستا منصة محادثة ذكاء اصطناعي متقدمة تجمع أقوى نماذج اللغة في تجربة موحدة.',
           'https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=800',
           'Platform', 'المنصة', 1200),
          ($1, 'ai-models-guide', 'Guide to AI Models on Perplexta', 'دليل نماذج الذكاء الاصطناعي في بيربليكستا',
           'Explore the range of AI models available on Perplexta, from GPT-4 to Claude and beyond.',
           'استكشف نماذج الذكاء الاصطناعي المتاحة في بيربليكستا، من GPT-4 إلى Claude وما هو أبعد.',
           'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800',
           'AI', 'ذكاء اصطناعي', 850)
        `, [authorId]);
      }
    });

    await runVersioned('v25_marketplace_schema', 'Creating marketplace items table for digital products', async (tx) => {
      await tx.query(`
        CREATE TABLE IF NOT EXISTS marketplace_items (
          id SERIAL PRIMARY KEY,
          seller_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
          title_en VARCHAR(255) NOT NULL,
          title_ar VARCHAR(255) NOT NULL,
          description_en TEXT,
          description_ar TEXT,
          price NUMERIC(10,2) DEFAULT 0,
          category VARCHAR(100),
          image_url TEXT,
          file_url TEXT,
          is_active BOOLEAN DEFAULT true,
          purchases INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await tx.query(`CREATE INDEX IF NOT EXISTS idx_marketplace_items_seller ON marketplace_items(seller_id)`);
      await tx.query(`CREATE INDEX IF NOT EXISTS idx_marketplace_items_category ON marketplace_items(category)`);
    });

    await runVersioned('v26_chat_memories_and_shortcuts', 'Adding chat_memories and user_shortcuts tables', async (tx) => {
      await tx.query(`
        CREATE TABLE IF NOT EXISTS chat_memories (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          chat_id INTEGER REFERENCES chats(id) ON DELETE CASCADE,
          content TEXT NOT NULL,
          memory_type VARCHAR(50) DEFAULT 'general',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await tx.query(`CREATE INDEX IF NOT EXISTS idx_chat_memories_user_id ON chat_memories(user_id)`);
      await tx.query(`CREATE INDEX IF NOT EXISTS idx_chat_memories_chat_id ON chat_memories(chat_id)`);

      await tx.query(`
        CREATE TABLE IF NOT EXISTS user_shortcuts (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          title VARCHAR(255) NOT NULL,
          prompt TEXT NOT NULL,
          shortcut_key VARCHAR(50),
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await tx.query(`CREATE INDEX IF NOT EXISTS idx_user_shortcuts_user_id ON user_shortcuts(user_id)`);
    });

  } finally {
    client.release();
    if (ledgerClient) ledgerClient.release();
    if (externalClient) externalClient.release();
    if (securityClient) securityClient.release();
  }
}

export async function verifySchemaIntegrity() {
  if (!pool) {
    console.warn('[Schema Integrity] Skipping validation: No core pool initialized.');
    return;
  }

  const coreTables = [
    'users', 'chats', 'messages', 'api_keys_vault', 'tool_orchestrator',
    'plans', 'subscriptions', 'user_usage', 'notifications', 'email_templates',
    'email_settings', 'message_reports', 'system_settings', 'system_broadcasts',
    'user_files', 'security_alerts', 'system_logs', 'oauth_states',
    'support_tickets', 'support_ticket_replies', 'password_resets',
    'user_sessions', 'forum_categories', 'forum_posts', 'forum_comments',
    'marketplace_items', 'chat_memories', 'user_shortcuts',
    'migration_history', 'migration_security_audit', 'db_connections_registry'
  ];

  const ledgerTables = [
    'wallets', 'ledger_transactions', 'referrals', 'referral_tree',
    'kyc_requests', 'withdrawal_requests', 'payout_accounts',
    'economy_settings', 'coupon_usages', 'deposit_requests', 'coupons', 'stripe_events'
  ];

  const externalTables = ['blog_articles', 'blog_comments', 'blog_ratings'];

  const securityTables = ['token_blacklist', 'security_alerts', 'admin_audit_logs'];

  const checkTables = async (targetPool: PgPool, tables: string[], label: string) => {
    const client = await targetPool.connect();
    try {
      const res = await client.query(`
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = ANY($1)
      `, [tables]);
      const found = new Set(res.rows.map((r: { table_name: string }) => r.table_name));
      const missing = tables.filter(t => !found.has(t));
      if (missing.length > 0) {
        console.warn(`[Schema Integrity] [${label}] Missing tables: ${missing.join(', ')}`);
      } else {
        console.log(`[Schema Integrity] [${label}] All ${tables.length} tables verified.`);
      }
    } finally {
      client.release();
    }
  };

  try {
    await checkTables(pool, coreTables, 'core');

    const ledgerPoolTarget = ledgerPool || pool;
    await checkTables(ledgerPoolTarget, ledgerTables, 'ledger');

    const extPoolTarget = externalPool || pool;
    await checkTables(extPoolTarget, externalTables, 'external');

    const secPoolTarget = securityPool || pool;
    await checkTables(secPoolTarget, securityTables, 'security');
  } catch (e: unknown) {
    console.error('[Schema Integrity] Verification failed:', (e as Error).message);
  }
}

export async function initDb(type: 'scratch' | 'additive' = 'additive') {
  if (!pool) return;
  const client = await pool.connect();
  
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        email VARCHAR(255) UNIQUE NOT NULL,
        role VARCHAR(20) DEFAULT 'user',
        google_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS chats (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(500) DEFAULT 'New Chat',
        model VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        chat_id INTEGER REFERENCES chats(id) ON DELETE CASCADE,
        role VARCHAR(20) NOT NULL,
        content TEXT NOT NULL,
        model VARCHAR(100),
        tokens_used INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS api_keys_vault (
        id SERIAL PRIMARY KEY,
        provider VARCHAR(50) UNIQUE NOT NULL,
        api_key TEXT NOT NULL,
        is_active BOOLEAN DEFAULT true,
        daily_limit INTEGER DEFAULT 1000,
        requests_today INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS tool_orchestrator (
        id SERIAL PRIMARY KEY,
        primary_provider VARCHAR(50),
        primary_model VARCHAR(255),
        secondary_provider VARCHAR(50),
        secondary_model VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS plans (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        price NUMERIC(10,2) DEFAULT 0,
        features JSONB DEFAULT '[]',
        limits JSONB DEFAULT '{}',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        plan_id INTEGER REFERENCES plans(id),
        status VARCHAR(20) DEFAULT 'active',
        current_period_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        current_period_end TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS user_usage (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        tool_id VARCHAR(100),
        usage_date DATE DEFAULT CURRENT_DATE,
        count INTEGER DEFAULT 0,
        tokens_used INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, tool_id, usage_date)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255),
        message TEXT,
        type VARCHAR(50) DEFAULT 'info',
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS email_templates (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        subject_en VARCHAR(255),
        subject_ar VARCHAR(255),
        body_en TEXT,
        body_ar TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS email_settings (
        id SERIAL PRIMARY KEY,
        provider VARCHAR(50) DEFAULT 'smtp',
        host VARCHAR(255),
        port INTEGER DEFAULT 587,
        username VARCHAR(255),
        password TEXT,
        from_email VARCHAR(255),
        from_name VARCHAR(255),
        is_active BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS message_reports (
        id SERIAL PRIMARY KEY,
        message_id INTEGER REFERENCES messages(id) ON DELETE CASCADE,
        reporter_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        reason TEXT,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        id SERIAL PRIMARY KEY,
        site_name VARCHAR(255) DEFAULT 'Perplexta',
        site_logo TEXT,
        site_favicon TEXT,
        maintenance_mode BOOLEAN DEFAULT false,
        allow_registration BOOLEAN DEFAULT true,
        default_plan_id INTEGER,
        smtp_host VARCHAR(255),
        smtp_port INTEGER,
        smtp_user VARCHAR(255),
        smtp_pass TEXT,
        smtp_from VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS system_broadcasts (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255),
        message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS user_files (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        filename VARCHAR(500),
        original_name VARCHAR(500),
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
      CREATE TABLE IF NOT EXISTS system_logs (
        id SERIAL PRIMARY KEY,
        level VARCHAR(20) DEFAULT 'info',
        message TEXT,
        source VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS oauth_states (
        id SERIAL PRIMARY KEY,
        state VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS support_tickets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        subject VARCHAR(500),
        status VARCHAR(20) DEFAULT 'open',
        priority VARCHAR(20) DEFAULT 'normal',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS support_ticket_replies (
        id SERIAL PRIMARY KEY,
        ticket_id INTEGER REFERENCES support_tickets(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        is_admin BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const ledgerPoolTarget = ledgerPool || pool;
    const ledgerClient2 = await ledgerPoolTarget.connect();
    try {
      await ledgerClient2.query(`
        CREATE TABLE IF NOT EXISTS wallets (
          id SERIAL PRIMARY KEY,
          user_id INTEGER UNIQUE NOT NULL,
          balance DECIMAL(15,4) DEFAULT 0.0000,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await ledgerClient2.query(`
        CREATE TABLE IF NOT EXISTS ledger_transactions (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          type VARCHAR(50) NOT NULL,
          amount DECIMAL(15,4) NOT NULL,
          description TEXT,
          reference_id VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await ledgerClient2.query(`
        CREATE TABLE IF NOT EXISTS referrals (
          id SERIAL PRIMARY KEY,
          referrer_id INTEGER NOT NULL,
          referred_id INTEGER NOT NULL,
          status VARCHAR(20) DEFAULT 'pending',
          bonus_amount DECIMAL(10,4) DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(referred_id)
        )
      `);

      await ledgerClient2.query(`
        CREATE TABLE IF NOT EXISTS referral_tree (
          id SERIAL PRIMARY KEY,
          ancestor_id INTEGER NOT NULL,
          descendant_id INTEGER NOT NULL,
          depth INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(ancestor_id, descendant_id)
        )
      `);

      await ledgerClient2.query(`
        CREATE TABLE IF NOT EXISTS kyc_requests (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          status VARCHAR(20) DEFAULT 'pending',
          document_type VARCHAR(100),
          document_url TEXT,
          notes TEXT,
          reviewed_by INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await ledgerClient2.query(`
        CREATE TABLE IF NOT EXISTS withdrawal_requests (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          amount DECIMAL(10,4) NOT NULL,
          method VARCHAR(50),
          status VARCHAR(20) DEFAULT 'pending',
          notes TEXT,
          admin_id INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await ledgerClient2.query(`
        CREATE TABLE IF NOT EXISTS payout_accounts (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          method VARCHAR(50) NOT NULL,
          account_details JSONB DEFAULT '{}',
          is_verified BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await ledgerClient2.query(`
        CREATE TABLE IF NOT EXISTS economy_settings (
          id SERIAL PRIMARY KEY,
          points_per_message INTEGER DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await ledgerClient2.query(`
        CREATE TABLE IF NOT EXISTS coupon_usages (
          id SERIAL PRIMARY KEY,
          coupon_id INTEGER,
          user_id INTEGER NOT NULL,
          used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await ledgerClient2.query(`
        CREATE TABLE IF NOT EXISTS coupons (
          id SERIAL PRIMARY KEY,
          code VARCHAR(50) UNIQUE NOT NULL,
          discount_type VARCHAR(20) DEFAULT 'percent',
          discount_value NUMERIC(10,2) NOT NULL,
          max_uses INTEGER DEFAULT 0,
          used_count INTEGER DEFAULT 0,
          expires_at TIMESTAMP,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await ledgerClient2.query(`
        CREATE TABLE IF NOT EXISTS stripe_events (
          id SERIAL PRIMARY KEY,
          event_id VARCHAR(255) UNIQUE NOT NULL,
          type VARCHAR(100),
          data JSONB DEFAULT '{}',
          processed BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    } finally {
      ledgerClient2.release();
    }

    const extPoolTarget = externalPool || pool;
    const extClient2 = await extPoolTarget.connect();
    try {
      await extClient2.query(`
        CREATE TABLE IF NOT EXISTS blog_articles (
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
        )
      `);

      await extClient2.query(`
        CREATE TABLE IF NOT EXISTS blog_comments (
          id SERIAL PRIMARY KEY,
          article_id INTEGER NOT NULL REFERENCES blog_articles(id) ON DELETE CASCADE,
          user_id INTEGER NOT NULL,
          content TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await extClient2.query(`
        CREATE TABLE IF NOT EXISTS blog_ratings (
          id SERIAL PRIMARY KEY,
          article_id INTEGER NOT NULL REFERENCES blog_articles(id) ON DELETE CASCADE,
          user_id INTEGER NOT NULL,
          rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE (article_id, user_id)
        )
      `);
    } finally {
      extClient2.release();
    }

    const secPoolTarget = securityPool || pool;
    const secClient2 = await secPoolTarget.connect();
    try {
      await secClient2.query(`
        CREATE TABLE IF NOT EXISTS token_blacklist (
          id SERIAL PRIMARY KEY,
          token TEXT UNIQUE NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await secClient2.query(`
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
    } finally {
      secClient2.release();
    }

  } finally {
    client.release();
  }
}

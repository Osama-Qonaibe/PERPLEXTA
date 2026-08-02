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
      
      if (!/^[a-zA-Z0-9_(),\s'\[\].{}]+$/i.test(type)) {
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
    }
    throw e;
  } finally {
    if (!isClient) (client as PgPoolClient).release();
  }
}

export async function runDatabaseMigrations(type: 'scratch' | 'additive' = 'additive') {
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
        status VARCHAR(50) NOT NULL, -- 'failed' | 'conflict' | 'info'
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
        const lockKey = Buffer.from(name).reduce((acc, c) => acc + c, 0); // Unique lock key for each migration
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

      await tx.query(`SELECT 1`); // Placeholder
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
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE (article_id, user_id)
        )
      `);
    });

    await runVersioned('v24_seed_blog_platform_data', 'Seeding elite magazine articles to database', async (tx) => {
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
              'In the rapidly fragmenting global liquidity landscape of 2026, quantitative trading houses are shifting from classical statistical arbitrage toward post-classical quantum stochastic simulations. By leveraging cloud-routed qubits, automated execution layers can process multi-asset orders at sub-millisecond ranges, maximizing return thresholds while avoiding volatility spikes.\n\nThe integration of decentralized ledger structures ensures that transaction receipts are mathematically hardened against downstream latency, establishing a high-performance framework for professional asset managers globally.',
              'في ظل التفتت المتسارع لساحات السيولة العالمية لعام ٢٠٢٦، تشهد بيوت التداول الكمي تحولاً جذرياً من أساليب التحكيم الإحصائي التقليدية إلى محاكاة العمليات التصادفيه الكمية.\n\nإن الاعتماد على البنية السحابية الموزعة يتيح لخوارزميات التداول معالجة الأوامر المالية المتعددة في أجزاء من المليثانية، مما يسهم في تعظيم هوامش العائد الوقائي وتفادي جيوب التذبذب الحاد.\n\nتكامل هذه التقنية مع هياكل الدفاتر اللامركزية يضمن حماية البيانات المالية ضد تسريبات زمن الوصول، مما يمهد الطريق لتدشين جيل جديد من الخدمات الإدارية للعملاء المحترفين وصناديق التحوط النخبوية.',
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
              'Modern blockchain networks rely heavily on elliptic curve signatures to safeguard ledger state. However, the rise of powerful quantum computing arrays threatens this cryptographic paradigm. This research paper evaluates post-quantum cryptography (PQC) integration, comparing lattice-based digital signatures with existing asymmetric schemas inside the dual ledger architecture.\n\nEnsuring absolute zero-knowledge verification while maintaining sub-second consensus remains the cornerstone of elite web3 financial platforms.',
              'تعتمد شبكات الدفاتر الموزعة المعاصرة على توقيعات المنحنى الإهليلجي لحماية سلامة الأرصدة والحسابات. ومع ذلك، فإن النضوج المتسارع للحوسبة الكمية يمثل تهديداً مباشراً لهذا النموذج الأمني العالمي.\n\nيستعرض هذا التقرير البحثي التحول نحو بروتوكول التشفير بعد الكمي (PQC)، مع مقارنة موثوقة للتوقيعات المستندة إلى الشبكات ضد أنظمة التشفير غير المتماثل الحالية.\n\nإن تشييد نظام خالي من المعرفة (Zero-Knowledge) مع الحفاظ على سرعة تسوية قياسية يمثل صمام الأمان لبوابات الخدمات الرقمية الفاخرة التي تسعى لحظر أي اختراقات مستقبلية.',
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
              'Sanction compliance registries, multi-currency pricing hubs, and shifting regional coalitions are introducing unprecedented friction inside global cross-border payments. To inoculate professional portfolios against capital controls, asset managers must design proactive multi-asset hedges.\n\nThis article outlines specific mathematical allocations between commodity futures, gold-linked digital reserves, and sovereign debt instruments to neutralize macroeconomic volatility.',
              'إن اتساع سلاسل العقوبات العالمية، وتباين تسعير العملات الإقليمية، وتغير التحالفات التجارية الكبرى قد فرض ضغوطاً غير مسبوقة على خطوط حركة المدفوعات والتمويل العابر للحدود.\n\nلحظر ركود السيولة ومقاومة الرقابة المفاجئة على رأس المال المالي، يتعين على مديري الثروات صياغة استراتيجيات تحوط متعددة الأصول ذات كفاءة رياضية عالية.\n\nتسلط هذه الصحيفة الضوء على حصص التخصيص المثلى بين عقود السلع الأساسية، والأصول المدعومة بالسبائك المادية كالملاذات التكنولوجية المتطورة، والسندات السيادية لتأمين الحد الضروري من استدامة النمو المالي.',
              '/static/blog3.jpg',
              'Macro Strategies',
              'الاستراتيجيات الكلية',
              245
            )
          `, [authorId]);
        }
      }
    });

    await runVersioned('v25_marketplace_schema', 'Created Marketplace core tables and basic seed structure', async (tx) => {
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
          status VARCHAR(20) DEFAULT 'approved', -- approved, pending, sold, rejected
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
              'A high-performance low-latency API proxy server configured for raw high-frequency websocket connection structures with dual failover fail-safes. Fully customizable and production ready.',
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

    await runVersioned('v26_marketplace_seed_extension_v2', 'Added third default premium marketplace item for layout completeness', async (tx) => {
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
              'An enterprise-grade pre-trained Transformer model engineered for continuous sentiment analytics across digital networks, providing high-precision predictive signals with native multilingual parsing.',
              'نموذج محول مدرب مسبقاً من الفئة المؤسسية مصمم للتحليل الحي والمستمر لمعنويات ونبض الأسواق عبر الشبكات الرقمية، ليمنحك إشارات تنبؤية فائقة الدقة والسرعة مع فهم عميق للنصوص متعددة اللغات.',
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

    await runVersioned('v27_update_forum_categories_for_pioneers_and_developers', 'Upgrading forum categories and re-mapping legacy post associations safely', async (tx) => {
      await tx.query(`
        INSERT INTO forum_categories (slug, name_en, name_ar, description_en, description_ar, icon, color) VALUES
        ('pioneers-devs-designers', 'Pioneers, Developers & Designers', 'رواد المنصة، المطورين ومصممي الجرافيك', 'A dedicated realm for developers, graphic designers, and platform pioneers to deliberate architecture and visual arts.', 'مساحة تجمع المطورين، المصممين ورواد الأعمال لمناقشة المشاريع وتطوير الواجهات والحلول الرقمية.', 'Laptop', 'emerald'),
        ('prompt-engineering', 'Prompt Engineering & Commands', 'الهندسة الفورية وأوامر التنفيذ (Prompts)', 'Exchange elite prompt engineering, model shortcuts, and executive automation scripts.', 'شارك أفضل هندسة للأوامر الذكية، الأوامر البرمجية البديعة، وحيل تشغيل النماذج والذكاء الاصطناعي.', 'Terminal', 'emerald'),
        ('troubleshooting', 'Experiences & Troubleshooting', 'مشاركة التجارب والأخطاء وحلولها', 'A space to post logs, production crashes, structural bugs, and their swift solutions.', 'نقاشات تقنية حول المشاكل الفنية، الأخطاء الشائعة وحلولها البرمجية السريعة والفعالة.', 'HelpCircle', 'emerald'),
        ('expertise-sharing', 'Expertise & Knowledge Sharing', 'مشاركة الخبرات والمعرفة', 'Broadcast technical papers, lessons learned, and high-level industrial tips.', 'شارك الاستراتيجيات التقنية، الدروس المستفادة، والنصائح المهنية لتسريع نمو مهارات الأعضاء.', 'BookOpen', 'emerald'),
        ('our-works', 'Our Works & Showcases', 'معرض أعمالنا ومشاريعنا', 'Expose your repositories, design mockups, and client-facing creations to elite peer review.', 'اعرض تصاميمك، أكوادك البرمجية، والمشروعات التي نفذتها لتلقي آراء وتقييمات مجتمع نخبة بيربليكستا.', 'Briefcase', 'emerald'),
        ('web-hosting', 'Web Hosting & Deployment', 'استضافة المواقع والرفع', 'Discuss server nodes, cloud resources, domain management, DNS routing, and static deployments.', 'كل ما يخص خوادم الاستضافة، الحوسبة السحابية، ورفع النطاقات وإعدادات الشبكات والـ DNS.', 'Server', 'emerald')
        ON CONFLICT (slug) DO UPDATE SET
          name_en = EXCLUDED.name_en,
          name_ar = EXCLUDED.name_ar,
          description_en = EXCLUDED.description_en,
          description_ar = EXCLUDED.description_ar,
          icon = EXCLUDED.icon,
          color = EXCLUDED.color
      `);

      const categoriesRes = await tx.query('SELECT id, slug FROM forum_categories');
      const catMap: { [key: string]: number } = {};
      categoriesRes.rows.forEach((row: { id: number; slug: string }) => {
        catMap[row.slug] = row.id;
      });

      const targetId = catMap['pioneers-devs-designers'];
      const troubleshootingId = catMap['troubleshooting'];
      const expertiseId = catMap['expertise-sharing'];

      if (targetId) {
        const generalId = catMap['general'];
        const announcementsId = catMap['announcements'];
        if (generalId) {
          await tx.query('UPDATE forum_posts SET category_id = $1 WHERE category_id = $2', [targetId, generalId]);
        }
        if (announcementsId) {
          await tx.query('UPDATE forum_posts SET category_id = $1 WHERE category_id = $2', [targetId, announcementsId]);
        }
      }

      if (troubleshootingId) {
        const supportId = catMap['technical-support'];
        if (supportId) {
          await tx.query('UPDATE forum_posts SET category_id = $1 WHERE category_id = $2', [troubleshootingId, supportId]);
        }
      }

      if (expertiseId) {
        const analysisId = catMap['analysis'];
        if (analysisId) {
          await tx.query('UPDATE forum_posts SET category_id = $1 WHERE category_id = $2', [expertiseId, analysisId]);
        }
      }

      await tx.query("DELETE FROM forum_categories WHERE slug IN ('general', 'analysis', 'technical-support', 'announcements')");
    });

    await runVersioned('v28_refine_forum_categories_names', 'Shortening and refining forum categories translation and names', async (tx) => {
      await tx.query(`
        UPDATE forum_categories 
        SET name_ar = 'مطورين ومصممين غرافيك', 
            name_en = 'Developers & Graphic Designers' 
        WHERE slug = 'pioneers-devs-designers'
      `);
      await tx.query(`
        UPDATE forum_categories 
        SET name_ar = 'هندسة الاوامر (Prompts)', 
            name_en = 'Prompt Engineering (Prompts)' 
        WHERE slug = 'prompt-engineering'
      `);
      await tx.query(`
        UPDATE forum_categories 
        SET name_ar = 'مشاركة الاخطاء وحلولها', 
            name_en = 'Troubleshooting' 
        WHERE slug = 'troubleshooting'
      `);
    });

    await runVersioned('v29_external_and_security_db_seeds', 'Seeding External and Security databases in db_connections_registry', async (tx) => {
      const coreUrl = process.env.DATABASE_URL;
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

    await runVersioned('v30_forum_category_colors_differentiation', 'Applying distinctive colors to forum categories to align with market and professional visuals', async (tx) => {
      await tx.query(`
        UPDATE forum_categories SET color = 'indigo' WHERE slug = 'pioneers-devs-designers';
        UPDATE forum_categories SET color = 'emerald' WHERE slug = 'prompt-engineering';
        UPDATE forum_categories SET color = 'rose' WHERE slug = 'troubleshooting';
        UPDATE forum_categories SET color = 'amber' WHERE slug = 'expertise-sharing';
        UPDATE forum_categories SET color = 'violet' WHERE slug = 'our-works';
        UPDATE forum_categories SET color = 'cyan' WHERE slug = 'web-hosting';
      `);
    });

    await runVersioned('v31_marketplace_purchases_and_referrals', 'Enabling real transactional purchases, secure file downloads, and affiliate product referral chains', async (tx) => {
      await ensureColumn(tx, 'marketplace_items', 'download_url', 'TEXT');
      await ensureColumn(tx, 'marketplace_items', 'preview_url', 'TEXT');
      await ensureColumn(tx, 'marketplace_items', 'video_url', 'TEXT');
      await ensureColumn(tx, 'marketplace_items', 'features', 'TEXT');
      await ensureColumn(tx, 'marketplace_items', 'technologies', 'TEXT');

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
        );
      `);

      await tx.query(`CREATE INDEX IF NOT EXISTS idx_marketplace_purchases_user ON marketplace_purchases(user_id);`);
      await tx.query(`CREATE INDEX IF NOT EXISTS idx_marketplace_purchases_item ON marketplace_purchases(item_id);`);
      await tx.query(`CREATE INDEX IF NOT EXISTS idx_marketplace_purchases_referrer ON marketplace_purchases(referrer_id);`);
    });

    await runVersioned('v32_marketplace_referral_percent', 'Enabling product creators to define custom product affiliate/referral commission percentages', async (tx) => {
      await ensureColumn(tx, 'marketplace_items', 'referral_percent', 'NUMERIC(5, 2)');
    });

    await runVersioned('v33_marketplace_highlights_and_licenses', 'Adding highlight_tag and license_type columns to marketplace_items for advanced item attributes', async (tx) => {
      await ensureColumn(tx, 'marketplace_items', 'highlight_tag', 'VARCHAR(50)');
      await ensureColumn(tx, 'marketplace_items', 'license_type', 'VARCHAR(50)');
    });

    await runVersioned('v34_default_language_en', 'Changing default user language to English', async (tx) => {
      await tx.query("ALTER TABLE users ALTER COLUMN language SET DEFAULT 'en'");
    });

    await runVersioned('v35_logo_light_theme', 'Adding logo_light_url column to support light theme tailored logos', async (tx) => {
      await ensureColumn(tx, 'system_settings', 'logo_light_url', 'TEXT');
    });

    await runVersioned('v36_agent_auth', 'Creating web bot agent auth registration and credentials table', async (tx) => {
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
        );
      `);
    });

    await runVersioned('v37_agent_auth_user_id', 'Adding user_id owner link column to registered_agents', async (tx) => {
      await ensureColumn(tx, 'registered_agents', 'user_id', 'INTEGER');
    });

    await runVersioned('v38_admin_audit_logs', 'Creating admin audit logging table in the security database', async (tx) => {
      const activeSecurityClient = securityClient || client;
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
    });

    await runVersioned('v39_ensure_plan_type_column', 'Ensure plan_type column exists on plans table', async (tx) => {
      await ensureColumn(tx, 'plans', 'plan_type', 'VARCHAR(100)', `'user'`);
    });

    await runVersioned('v40_video_resources_table', 'Creating video_resources table and primary indexes', async (tx) => {
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

    await runVersioned('v41_hash_existing_tokens', 'Rehashing existing plaintext tokens in blacklist to SHA-256', async (tx) => {
      await tx.query(`DELETE FROM token_blacklist WHERE expires_at < CURRENT_TIMESTAMP`);
      await tx.query(`DELETE FROM token_blacklist`);
      console.log('[Migrations] token_blacklist cleared for SHA-256 migration. Users will re-authenticate once.');
    });

    await runVersioned('v42_missing_indexes', 'Adding critical performance and integrity indexes', async (tx) => {
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

    await runVersioned('v43_forum_fk_integrity', 'Adding missing foreign keys to forum tables', async (tx) => {
      const extTarget = externalClient || client;
      await extTarget.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'forum_posts_user_id_check'
          ) THEN
            ALTER TABLE forum_posts ADD CONSTRAINT forum_posts_user_id_check CHECK (user_id > 0);
          END IF;
        END $$
      `);
      
      await extTarget.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'forum_comments_user_id_check'
          ) THEN
            ALTER TABLE forum_comments ADD CONSTRAINT forum_comments_user_id_check CHECK (user_id > 0);
          END IF;
        END $$
      `);
    });

    await runVersioned('v44_encrypt_registry_passwords', 'Encrypting plaintext passwords in db_connections_registry', async (tx) => {
      const encryptionPattern = /^[0-9a-fA-F]{32}:[0-9a-fA-F]+$/;
      const rows = await tx.query('SELECT id, password FROM db_connections_registry WHERE password IS NOT NULL');
      for (const row of rows.rows) {
        if (row.password && !encryptionPattern.test(row.password)) {
          await tx.query(
            'UPDATE db_connections_registry SET password = $1 WHERE id = $2',
            [encrypt(row.password), row.id]
          );
        }
      }
    });

    await runVersioned('v45_orchestrator_max_history_depth', 'Adding max_history_depth and memory_limit_per_user columns', async (tx) => {
      await ensureColumn(tx, 'tool_orchestrator', 'max_history_depth', 'INTEGER', 16);
      await ensureColumn(tx, 'system_settings', 'memory_limit_per_user', 'INTEGER', 50);
    });

    await runVersioned('v46_protocol_config', 'Adding protocol_config to tool_orchestrator and api_keys_vault', async (tx) => {
      await ensureColumn(tx, 'tool_orchestrator', 'protocol_config', 'JSONB', `'{}'`);
      await ensureColumn(tx, 'api_keys_vault', 'protocol_config', 'JSONB', `'{}'`);
      await tx.query(`UPDATE tool_orchestrator SET protocol_config = '{}' WHERE protocol_config IS NULL`);
      await tx.query(`UPDATE api_keys_vault SET protocol_config = '{}' WHERE protocol_config IS NULL`);
    });

    await runVersioned('v47_image_prompt_pref_threshold', 'Adding image_prompt_pref_threshold to system_settings', async (tx) => {
      await ensureColumn(tx, 'system_settings', 'image_prompt_pref_threshold', 'INTEGER', 150);
      await tx.query(`UPDATE system_settings SET image_prompt_pref_threshold = 150 WHERE image_prompt_pref_threshold IS NULL`);
    });

    await runVersioned('v48_marketplace_reviews_and_ratings', 'Creating marketplace reviews and ratings table', async (tx) => {
      await tx.query(`
        CREATE TABLE IF NOT EXISTS marketplace_reviews (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          item_id INTEGER NOT NULL REFERENCES marketplace_items(id) ON DELETE CASCADE,
          rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
          comment TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await tx.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_marketplace_reviews_user_item ON marketplace_reviews(user_id, item_id);`);
    });

    await runVersioned('v49_forum_categories_control', 'Adding post limit constraints and strict moderation features to forum categories', async (tx) => {
      await tx.query(`ALTER TABLE forum_categories ADD COLUMN IF NOT EXISTS max_posts_per_day INTEGER DEFAULT 0;`);
      await tx.query(`ALTER TABLE forum_categories ADD COLUMN IF NOT EXISTS require_approval BOOLEAN DEFAULT FALSE;`);
      await tx.query(`ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'approved';`);
      await tx.query(`UPDATE forum_posts SET status = 'approved' WHERE status IS NULL;`);
    });

    await runVersioned('v50_forum_images_and_ratings', 'Adding cover image support and high-precision rating systems to forum posts', async (tx) => {
      await tx.query(`ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS image_url VARCHAR(500);`);
      await tx.query(`
        CREATE TABLE IF NOT EXISTS forum_post_ratings (
          id SERIAL PRIMARY KEY,
          post_id INTEGER NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
          user_id INTEGER NOT NULL,
          rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await tx.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_forum_post_ratings_user_post ON forum_post_ratings(user_id, post_id);`);
    });

    await runVersioned('v51_dynamic_seo_blocking', 'Adding blocked_paths column to system_settings for dynamic SEO exclusions', async (tx) => {
      await ensureColumn(tx, 'system_settings', 'blocked_paths', 'TEXT', `''`);
    });

    await runVersioned('v52_token_based_billing', 'Adding cost_per_1k_input_tokens and cost_per_1k_output_tokens to tool_orchestrator', async (tx) => {
      await ensureColumn(tx, 'tool_orchestrator', 'cost_per_1k_input_tokens', 'INTEGER', 5);
      await ensureColumn(tx, 'tool_orchestrator', 'cost_per_1k_output_tokens', 'INTEGER', 15);
      await tx.query('UPDATE tool_orchestrator SET cost_per_1k_input_tokens = 5 WHERE cost_per_1k_input_tokens IS NULL');
      await tx.query('UPDATE tool_orchestrator SET cost_per_1k_output_tokens = 15 WHERE cost_per_1k_output_tokens IS NULL');
    });

    await runVersioned('v53_referral_invitations', 'Ensuring referral_invitations table and relations exist', async (tx) => {
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

    await runVersioned('v54_referral_invitations_fields_v2', 'Adding requested referred_email and invite_code columns to referral_invitations', async (tx) => {
      await ensureColumn(tx, 'referral_invitations', 'referred_email', 'VARCHAR(255)', 'NULL');
      await ensureColumn(tx, 'referral_invitations', 'invite_code', 'VARCHAR(100)', 'NULL');
      await tx.query(`CREATE INDEX IF NOT EXISTS idx_referral_invitations_referred_email ON referral_invitations(referred_email)`);
      await tx.query(`UPDATE referral_invitations SET referred_email = email WHERE referred_email IS NULL`);
      await tx.query(`
        UPDATE referral_invitations r 
        SET invite_code = u.referral_code 
        FROM users u 
        WHERE r.referrer_id = u.id AND r.invite_code IS NULL
      `);
    });

    await runVersioned('v55_seo_site_name_fields', 'Adding dedicated seo_site_name_en and seo_site_name_ar columns to system_settings', async (tx) => {
      await ensureColumn(tx, 'system_settings', 'seo_site_name_en', 'TEXT', "NULL");
      await ensureColumn(tx, 'system_settings', 'seo_site_name_ar', 'TEXT', "NULL");
    });

    await runVersioned('v56_shared_snapshots', 'Creating shared_snapshots table for public-facing insights snapshots', async (tx) => {
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

    await runVersioned('v57_permanently_drop_forum_tables', 'Permanently dropping forum_posts, forum_comments, forum_categories, and forum_post_ratings tables from external database', async (tx) => {
      const extTarget = externalClient || tx;
      await extTarget.query(`DROP TABLE IF EXISTS forum_post_ratings CASCADE;`);
      await extTarget.query(`DROP TABLE IF EXISTS forum_comments CASCADE;`);
      await extTarget.query(`DROP TABLE IF EXISTS forum_posts CASCADE;`);
      await extTarget.query(`DROP TABLE IF EXISTS forum_categories CASCADE;`);
    });

    await runVersioned('v58_gifts_and_ads_pricing', 'Adding gift_catalog table and ad pricing columns to system_settings', async (tx) => {
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

      await ensureColumn(tx, 'system_settings', 'bulletin_ad_daily_price', 'NUMERIC(10,2)', '5.00');
      await ensureColumn(tx, 'system_settings', 'live_gift_commission_percent', 'INTEGER', '30');
      await ensureColumn(tx, 'system_settings', 'sidebar_ad_impression_price', 'NUMERIC(10,4)', '0.0100');
      await ensureColumn(tx, 'system_settings', 'sidebar_ad_click_price', 'NUMERIC(10,2)', '0.10');
      
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

    await runVersioned('v59_admin_approval_queue', 'Adding admin_approval_queue table for sensitive actions', async (tx) => {
      await tx.query(`
        CREATE TABLE IF NOT EXISTS admin_approval_queue (
          id SERIAL PRIMARY KEY,
          requester_id INTEGER NOT NULL,
          action_type VARCHAR(100) NOT NULL,
          payload JSONB NOT NULL,
          status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
          verification_code VARCHAR(10),
          approver_id INTEGER,
          rejection_reason TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      await ensureColumn(tx, 'system_settings', 'require_2fa_for_economy', 'BOOLEAN', 'false');
    });

    await runVersioned('v60_ad_pricing_audit', 'Adding ad_pricing_audit table for compliance reporting', async (tx) => {
      await tx.query(`
        CREATE TABLE IF NOT EXISTS ad_pricing_audit (
          id SERIAL PRIMARY KEY,
          admin_id INTEGER NOT NULL,
          field_name VARCHAR(100) NOT NULL,
          old_value NUMERIC(10,4),
          new_value NUMERIC(10,4),
          change_type VARCHAR(50) DEFAULT 'manual', -- 'manual', 'batch', 'bulk_approval'
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    });

    await runVersioned('v61_ad_performance_stats', 'Adding ad_stats table for high-fidelity performance heatmap', async (tx) => {
      await tx.query(`
        CREATE TABLE IF NOT EXISTS ad_stats (
          id SERIAL PRIMARY KEY,
          ad_id INTEGER NOT NULL,
          type VARCHAR(20) NOT NULL, -- 'impression', 'click'
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

    await runVersioned('v62_bulletin_social_features', 'Adding social interaction fields to bulletin_ads table', async (tx) => {
      await tx.query(`
        ALTER TABLE bulletin_ads 
        ADD COLUMN IF NOT EXISTS feeling VARCHAR(255),
        ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS tagged_users JSONB DEFAULT '[]',
        ADD COLUMN IF NOT EXISTS has_whatsapp_button BOOLEAN DEFAULT FALSE
      `);
    });

    await runVersioned('v63_bulletin_ad_features', 'Adding ad_format to bulletin_ads and parent_id to bulletin_ad_comments', async (tx) => {
      await ensureColumn(tx, 'bulletin_ads', 'ad_format', 'VARCHAR(50)', "'post'");
      await ensureColumn(tx, 'bulletin_ad_comments', 'parent_id', 'INTEGER');
    });

    await runVersioned('v64_bulletin_quick_questions', 'Adding quick_questions to bulletin_ads table', async (tx) => {
      await ensureColumn(tx, 'bulletin_ads', 'quick_questions', 'JSONB', "'[]'");
    });

    await runVersioned('v65_route_seo_settings', 'Creating route_seo_settings table for dynamic route-based SEO meta tags', async (tx) => {
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
        );
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

    await runVersioned('v66_asset_metadata_and_seo_integrity', 'Creating asset_metadata table and ensuring alt_text columns on route_seo_settings', async (tx) => {
      await ensureColumn(tx, 'route_seo_settings', 'alt_text_ar', 'TEXT');
      await ensureColumn(tx, 'route_seo_settings', 'alt_text_en', 'TEXT');

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
        );
      `);
    });

    await runVersioned('v67_recommendation_engine', 'Creating recommendation engine tables for user interactions, preferences, and feedback', async (tx) => {
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
        );
        CREATE INDEX IF NOT EXISTS idx_rec_interactions_user ON user_recommendation_interactions(user_id);
        CREATE INDEX IF NOT EXISTS idx_rec_interactions_type_item ON user_recommendation_interactions(item_type, item_id);

        CREATE TABLE IF NOT EXISTS user_recommendation_preferences (
          user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          preferred_categories JSONB DEFAULT '[]',
          preferred_price_range JSONB DEFAULT '{"min": 0, "max": 10000}',
          excluded_item_types JSONB DEFAULT '[]',
          explicit_interests JSONB DEFAULT '[]',
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS recommendation_feedback (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          item_type VARCHAR(50) NOT NULL,
          item_id INTEGER,
          item_key VARCHAR(255),
          feedback_type VARCHAR(50) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_rec_feedback_user ON recommendation_feedback(user_id);
      `);
    });

    await runVersioned('v68_ensure_chat_memories_and_shortcuts', 'Explicitly ensuring chat_memories and user_shortcuts tables exist', async (tx) => {
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
        );
      `);
      await tx.query(`
        CREATE TABLE IF NOT EXISTS user_shortcuts (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          title VARCHAR(255) NOT NULL,
          query TEXT NOT NULL,
          category VARCHAR(50) DEFAULT 'general',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
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
        $$;
      `);
    });

    await runVersioned('v71_add_fks', 'Add foreign key constraints to forum_posts, forum_comments and blog_articles', async (tx) => {
      await tx.query(`
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'forum_posts') THEN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_forum_posts_user_id') THEN
                    ALTER TABLE forum_posts ADD CONSTRAINT fk_forum_posts_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
                END IF;
            END IF;
            
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'forum_comments') THEN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_forum_comments_user_id') THEN
                    ALTER TABLE forum_comments ADD CONSTRAINT fk_forum_comments_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
                END IF;
            END IF;
        END;
        $$;
      `);

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
          $$;
        `);
      } catch (e: any) {
        console.warn(`[Migrations] Skipping blog_articles foreign key constraint (cross-db or users missing): ${e.message}`);
      }
    });

    await runVersioned('v75_create_registered_agents', 'Creating registered_agents table for agent authentication', async (tx) => {
    });

    await runVersioned('v76_fix_registered_agents', 'Fixing registered_agents table for agent authentication', async (tx) => {
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
      await ensureColumn(tx, 'registered_agents', 'client_id', 'VARCHAR(255)');
      await ensureColumn(tx, 'registered_agents', 'client_secret', 'VARCHAR(255)');
      await ensureColumn(tx, 'registered_agents', 'api_key_hash', 'VARCHAR(255)');
      await ensureColumn(tx, 'registered_agents', 'client_name', 'VARCHAR(255)');
      await ensureColumn(tx, 'registered_agents', 'identity_type', 'VARCHAR(50)', `'agent'`);
      await ensureColumn(tx, 'registered_agents', 'credential_type', 'VARCHAR(50)', `'client_credentials'`);
      await ensureColumn(tx, 'registered_agents', 'redirect_uris', 'TEXT[]');
      await ensureColumn(tx, 'registered_agents', 'jwks_uri', 'VARCHAR(500)');
      await ensureColumn(tx, 'registered_agents', 'user_agent', 'VARCHAR(500)');
      await ensureColumn(tx, 'registered_agents', 'signature_keys', 'JSONB');
      await ensureColumn(tx, 'registered_agents', 'permissions', 'JSONB', `'[]'`);
      await ensureColumn(tx, 'registered_agents', 'is_active', 'BOOLEAN', 'true');
      await ensureColumn(tx, 'registered_agents', 'user_id', 'INTEGER');
    });

    await runVersioned('v74_encrypt_smtp_password', 'Encrypting smtp_password in email_settings', async (tx) => {
      const { encrypt } = await import('../utils/crypto.js');
      const settingsRes = await tx.query('SELECT id, smtp_password FROM email_settings');
      
      const encryptionPattern = /^[0-9a-fA-F]{32}:[0-9a-fA-F]+$/;
      
      for (const row of settingsRes.rows) {
        if (row.smtp_password && row.smtp_password.trim() !== '' && !encryptionPattern.test(row.smtp_password)) {
          await tx.query('UPDATE email_settings SET smtp_password = $1 WHERE id = $2', [encrypt(row.smtp_password), row.id]);
        }
      }
    });

    await runVersioned('v77_add_file_url_indexes', 'Adding indexes on file_url and image/media URL columns across user_files and related tables for fast public file lookups', async (tx) => {
      const safeIndex = async (clientObj: any, table: string, column: string, indexName: string) => {
        try {
          await clientObj.query(`CREATE INDEX IF NOT EXISTS ${indexName} ON ${table}(${column}) WHERE length(${column}) <= 1000`);
        } catch (idxErr: any) {
          console.warn(`[Migrations v77] Could not create index ${indexName} on ${table}(${column}):`, idxErr.message);
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

      await safeIndex(tx, 'system_settings', 'logo_url', 'idx_system_settings_logo_url');
      await safeIndex(tx, 'system_settings', 'logo_light_url', 'idx_system_settings_logo_light_url');
      await safeIndex(tx, 'system_settings', 'seo_image_url', 'idx_system_settings_seo_image_url');
      await safeIndex(tx, 'system_settings', 'favicon_url', 'idx_system_settings_favicon_url');
    });

    await runVersioned('v78_google_tool_connections', 'Creating google_tool_connections table for granular Google Workspace integration management', async (tx) => {
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

    await runVersioned('v79_language_font_config', 'Adding font_loading_config, font_config_ar, and font_config_en columns to system_settings', async (tx) => {
      await ensureColumn(tx, 'system_settings', 'font_loading_config', 'TEXT', null);
      await ensureColumn(tx, 'system_settings', 'font_config_ar', 'TEXT', null);
      await ensureColumn(tx, 'system_settings', 'font_config_en', 'TEXT', null);
    });

    console.log('[Migrations] All versioned migrations completed successfully.');
  } catch (error: unknown) {
    const err = error as Error;
    console.error('[CRITICAL] Database Migration failed:', err.message);
    if (process.env.NODE_ENV === 'production') throw err;
  } finally {
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
        avatar TEXT
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
        provider VARCHAR(100) NOT NULL CONSTRAINT "api_keys_vault_provider_key" UNIQUE,
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
        protocol_config JSONB DEFAULT '{}'
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
        user_id INTEGER NOT NULL CONSTRAINT "wallets_user_id_key" UNIQUE,
        balance NUMERIC(15, 4) DEFAULT '0.0000',
        usd_balance NUMERIC(15, 4) DEFAULT '0.0000',
        points INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
        crypto_address TEXT DEFAULT '${encrypt(process.env.DEFAULT_CRYPTO_ADDRESS || 'YOUR_DEFAULT_CRYPTO_ADDRESS')}',
        bank_name VARCHAR(255) DEFAULT '${encrypt(process.env.DEFAULT_BANK_NAME || 'Your Default Bank')}',
        bank_recipient VARCHAR(255) DEFAULT '${encrypt(process.env.DEFAULT_BANK_RECIPIENT || 'Your Default Business Platforms LTD.')}',
        bank_iban VARCHAR(255) DEFAULT '${encrypt(process.env.DEFAULT_BANK_IBAN || 'IL00000000000000000000')}',
        bank_swift VARCHAR(100) DEFAULT '${encrypt(process.env.DEFAULT_BANK_SWIFT || 'TESTIL33XXX')}',
        paypal_email VARCHAR(255) DEFAULT '${encrypt(process.env.DEFAULT_PAYPAL_EMAIL || 'paypal-sandbox@yourdomain.com')}'
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
        usage_limit INTEGER,
        usage_count INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: 'plans',
      query: `CREATE TABLE IF NOT EXISTS plans (
        id SERIAL PRIMARY KEY,
        name_en VARCHAR(255) NOT NULL CONSTRAINT "plans_name_en_key" UNIQUE,
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
        color VARCHAR(50) DEFAULT 'emerald',
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
        CONSTRAINT "user_usage_user_id_tool_id_usage_date_key" UNIQUE("user_id","tool_id","usage_date")
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
        stripe_event_id VARCHAR(255) CONSTRAINT "stripe_events_stripe_event_id_key" UNIQUE,
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: 'security_alerts',
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
        referral_percent NUMERIC(5, 2),
        highlight_tag VARCHAR(50),
        license_type VARCHAR(50),
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
        target_url TEXT NOT NULL,
        sponsor_name VARCHAR(100),
        badge_text_ar VARCHAR(50) DEFAULT 'مُموَّل',
        badge_text_en VARCHAR(50) DEFAULT 'Sponsored',
        position VARCHAR(50) DEFAULT 'sidebar',
        display_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
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
    }
  ];

  for (const table of schema) {
    const p = table.pool || targetPool;
    await p.query(table.query);
  }

  try {
    const adCheck = await targetPool.query('SELECT COUNT(*)::int as count FROM advertisements');
    if (adCheck.rows[0].count === 0) {
      await targetPool.query(`
        INSERT INTO advertisements (title_ar, title_en, description_ar, description_en, image_url, target_url, sponsor_name, badge_text_ar, badge_text_en, position, display_order, is_active)
        VALUES 
        (
          'حزمة الذكاء الاصطناعي السيادي الاحترافية',
          'Sovereign AI Elite Infrastructure Suite',
          'استمتع بقوة نماذج Anthropic وDeepSeek بدون حدود وبأعلى سرعة مع حماية تشفير كاملة.',
          'Experience unlimited power with Anthropic and DeepSeek models with zero latency and full encryption.',
          'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80',
          '/subscription',
          'Perplexta Enterprise',
          'مُموَّل',
          'Sponsored',
          'sidebar',
          1,
          true
        ),
        (
          'متجر الأدوات والمحركات المتقدمة',
          'Elite Software & AI Marketplace',
          'اكتشف خطط التحليل الفني، مطالبات الذكاء الاصطناعي، والحلول البرمجية الجاهزة للتداول والأنظمة.',
          'Discover technical analysis workflows, AI prompts, and enterprise code bases ready for deployment.',
          'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=600&q=80',
          '/marketplace',
          'Supercool Devs',
          'مُموَّل',
          'Sponsored',
          'sidebar',
          2,
          true
        )
      `);
      console.log('[Schema Integrity] 📢 Default sample advertisements seeded successfully.');
    }
  } catch (adErr: any) {
    console.warn('[Schema Integrity] Ads seed check note:', adErr.message);
  }

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
    { pool: targetPool, query: `CREATE INDEX IF NOT EXISTS idx_security_alerts_user_id ON security_alerts(user_id)` },
    { pool: externalPool || targetPool, query: `CREATE INDEX IF NOT EXISTS idx_articles_title_fts ON blog_articles USING GIN(to_tsvector('english', title_en))` },
    { pool: externalPool || targetPool, query: `CREATE INDEX IF NOT EXISTS idx_articles_content_fts ON blog_articles USING GIN(to_tsvector('english', content_en))` },
    { pool: externalPool || targetPool, query: `CREATE INDEX IF NOT EXISTS idx_blog_comments_article_id ON blog_comments(article_id)` },
    { pool: externalPool || targetPool, query: `CREATE INDEX IF NOT EXISTS idx_blog_ratings_article_id ON blog_ratings(article_id)` },
    { pool: targetPool, query: `CREATE UNIQUE INDEX IF NOT EXISTS security_alerts_pkey ON security_alerts(id)` },
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
    { pool: targetPool, query: `CREATE INDEX IF NOT EXISTS idx_video_resources_user_id ON video_resources(user_id)` }
  ];

  for (const idx of indexes) {
    await idx.pool.query(idx.query);
  }

  const relations = [
    { pool: targetPool, query: `ALTER TABLE chats DROP CONSTRAINT IF EXISTS chats_user_id_fkey` },
    { pool: targetPool, query: `ALTER TABLE chats ADD CONSTRAINT chats_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE` },
    { pool: targetPool, query: `ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_chat_id_fkey` },
    { pool: targetPool, query: `ALTER TABLE messages ADD CONSTRAINT messages_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE` },
    { pool: targetPool, query: `ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey` },
    { pool: targetPool, query: `ALTER TABLE notifications ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE` },
    { pool: targetPool, query: `ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_id_fkey` },
    { pool: targetPool, query: `ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES plans(id)` },
    { pool: targetPool, query: `ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_user_id_fkey` },
    { pool: targetPool, query: `ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE` },
    { pool: targetPool, query: `ALTER TABLE system_broadcasts DROP CONSTRAINT IF EXISTS system_broadcasts_admin_id_fkey` },
    { pool: targetPool, query: `ALTER TABLE system_broadcasts ADD CONSTRAINT system_broadcasts_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES users(id)` },
    { pool: targetPool, query: `ALTER TABLE user_files DROP CONSTRAINT IF EXISTS user_files_chat_id_fkey` },
    { pool: targetPool, query: `ALTER TABLE user_files ADD CONSTRAINT user_files_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE SET NULL` },
    { pool: targetPool, query: `ALTER TABLE user_files DROP CONSTRAINT IF EXISTS user_files_user_id_fkey` },
    { pool: targetPool, query: `ALTER TABLE user_files ADD CONSTRAINT user_files_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE` },
    { pool: targetPool, query: `ALTER TABLE users DROP CONSTRAINT IF EXISTS users_referred_by_fkey` },
    { pool: targetPool, query: `ALTER TABLE users ADD CONSTRAINT users_referred_by_fkey FOREIGN KEY (referred_by) REFERENCES users(id)` },
    { pool: targetLedgerPool, query: `ALTER TABLE ledger_transactions DROP CONSTRAINT IF EXISTS ledger_transactions_wallet_id_fkey` },
    { pool: targetLedgerPool, query: `ALTER TABLE ledger_transactions ADD CONSTRAINT ledger_transactions_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES wallets(id)` },
    { pool: targetLedgerPool, query: `ALTER TABLE coupon_usages DROP CONSTRAINT IF EXISTS coupon_usages_coupon_id_fkey` },
    { pool: targetLedgerPool, query: `ALTER TABLE coupon_usages ADD CONSTRAINT coupon_usages_coupon_id_fkey FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE` }
  ];

  for (const rel of relations) {
    await rel.pool.query(rel.query);
  }

  const settingsCheck = await targetPool.query('SELECT count(*) FROM system_settings');
  if (parseInt(settingsCheck.rows[0].count) === 0) {
    await targetPool.query(
      `INSERT INTO system_settings (site_name_en, site_name_ar) VALUES ($1, $2)`,
      ['Premium AI', 'منصة النخبة']
    );
  }

  try {
    const ecoCheck = await targetLedgerPool.query('SELECT count(*) FROM economy_settings');
    if (parseInt(ecoCheck.rows[0].count) === 0) {
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
    const adminCheck = await targetPool.query('SELECT id, password_hash FROM users WHERE email = $1', [email]);
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
      if (adminPassword && user.password_hash) {
          const isMatch = await bcrypt.compare(adminPassword, user.password_hash);
          if (!isMatch) {
              console.log(`[Migrations] Updating admin password hash for: ${email}`);
              const newHash = await bcrypt.hash(adminPassword, 10);
              await targetPool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, user.id]);
          }
      }
    }
  }

  const planCheck = await targetPool.query('SELECT count(*) FROM plans');
  if (parseInt(planCheck.rows[0].count) === 0) {
      await targetPool.query(`
        INSERT INTO plans (name_en, name_ar, desc_en, desc_ar, monthly_price, annual_price, discount, features, color, is_popular, badge, limits, plan_type)
        VALUES
          ('Starter', 'البداية', 'Free starter plan', 'خطة البداية المجانية', 0, 0, 0, '["Basic Search", "Limited AI Chats"]', '#10b981', false, 'Standard', '{"chat": 20, "chat_fast": 30, "perplexta_analysis": 5, "image": 2, "code": 5, "notebook": 10, "stt": 5, "tts": 5, "storage_mb": 100}', 'user'),
          ('Pro', 'المحترف', 'Professional plan for advanced users', 'خطة المحترفين للمستخدمين المتقدمين', 19.99, 199.90, 17, '["Advanced Analysis", "Unlimited Chats", "Priority Support"]', '#3b82f6', true, 'Best Value', '{"chat": "unlimited", "chat_fast": "unlimited", "chat_pro": 100, "perplexta_analysis": 50, "image": 50, "code": 100, "notebook": 100, "stt": 100, "tts": 100, "storage_mb": 1024}', 'user'),
          ('Elite', 'النخبة', 'Full power for strategic expert users', 'القوة الكاملة للمستخدمين الخبراء الاستراتيجيين', 49.99, 499.90, 17, '["Full Perplexta Access", "Multi-model Orchestration", "Concierge Support"]', '#8b5cf6', false, 'Elite', '{"chat": "unlimited", "chat_fast": "unlimited", "chat_pro": "unlimited", "chat_reasoning": "unlimited", "perplexta_analysis": "unlimited", "image": "unlimited", "video": 50, "code": "unlimited", "legal_analysis": "unlimited", "storage_mb": 10240}', 'user')
        ON CONFLICT (name_en) DO NOTHING
      `);
    }

  const devPlanCheck = await targetPool.query("SELECT count(*) FROM plans WHERE plan_type = 'developer'");
  if (parseInt(devPlanCheck.rows[0].count) === 0) {
      console.log('[Migrations] Seeding Developer Plans...');
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
          connectionString = decrypt(reg.connection_string);
        } catch {
          connectionString = reg.connection_string;
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
  } catch (err: unknown) {
    console.error('[Monitor] Database monitoring failed:', (err as Error).message);
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
    errors: [],
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
    } catch (e: any) {
      throw new Error(`Failed to query information_schema: ${e.message}`);
    }
  };

  const expectedSchema: Record<string, Record<string, { columns: string[]; ddl?: string; repairCols?: Record<string, string> }>> = {
    core: {
      users: {
        columns: [
          'id', 'name', 'email', 'password_hash', 'role', 'status', 'kyc_status',
          'kyc_required', 'kyc_rejection_reason', 'kyc_submitted_at', 'referred_by',
          'language', 'theme', 'memory', 'support_notes', 'custom_instructions',
          'last_active_at', 'created_at', 'updated_at', 'provider', 'avatar'
        ],
        repairCols: {
          last_active_at: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
          theme: "VARCHAR(10) DEFAULT 'dark'",
          referred_by: 'INTEGER',
          kyc_submitted_at: 'TIMESTAMP',
          kyc_rejection_reason: 'TEXT',
          memory: 'TEXT',
          support_notes: 'TEXT',
          custom_instructions: 'TEXT',
          avatar: 'TEXT',
          status: "VARCHAR(50) DEFAULT 'active'",
          provider: "VARCHAR(50) DEFAULT 'local'",
          language: "VARCHAR(5) DEFAULT 'en'"
        }
      },
      chats: {
        columns: ['id', 'user_id', 'title', 'tool_id', 'context_summary', 'is_pinned', 'created_at', 'updated_at', 'tool'],
        repairCols: {
          tool: "VARCHAR(100) DEFAULT 'chat'",
          context_summary: 'TEXT',
          is_pinned: 'BOOLEAN DEFAULT false'
        }
      },
      messages: {
        columns: [
          'id', 'chat_id', 'role', 'content', 'tool_id', 'model', 'tokens_used',
          'feedback', 'thinking_steps', 'citations', 'follow_ups', 'generation_time',
          'created_at', 'tool', 'is_pinned', 'updated_at'
        ],
        repairCols: {
          thinking_steps: "JSONB DEFAULT '[]'",
          citations: "JSONB DEFAULT '[]'",
          follow_ups: "JSONB DEFAULT '[]'",
          feedback: 'SMALLINT DEFAULT 0',
          generation_time: 'NUMERIC',
          tool: 'VARCHAR(100)',
          is_pinned: 'BOOLEAN DEFAULT false',
          updated_at: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP'
        }
      },
      api_keys_vault: {
        columns: ['id', 'provider', 'encrypted_key', 'daily_budget', 'used_today', 'last_reset_date', 'models', 'model_list', 'is_active', 'created_at', 'updated_at', 'url_key', 'protocol_config'],
        repairCols: {
          model_list: "JSONB DEFAULT '[]'",
          protocol_config: "JSONB DEFAULT '{}'",
          url_key: 'TEXT'
        }
      },
      tool_orchestrator: {
        columns: [
          'id', 'tool_id', 'primary_provider', 'primary_model', 'fallback_1_provider', 'fallback_1_model',
          'fallback_2_provider', 'fallback_2_model', 'fallback_3_provider', 'fallback_3_model',
          'task_description', 'task_description_ar', 'is_active', 'cost_per_usage', 'updated_at', 'protocol_config',
          'max_history_depth', 'cost_per_1k_input_tokens', 'cost_per_1k_output_tokens'
        ],
        repairCols: {
          fallback_1_provider: 'VARCHAR(100)',
          fallback_1_model: 'VARCHAR(255)',
          fallback_2_provider: 'VARCHAR(100)',
          fallback_2_model: 'VARCHAR(255)',
          fallback_3_provider: 'VARCHAR(100)',
          fallback_3_model: 'VARCHAR(255)',
          max_history_depth: 'INTEGER DEFAULT 16',
          protocol_config: "JSONB DEFAULT '{}'",
          cost_per_1k_input_tokens: 'INTEGER DEFAULT 5',
          cost_per_1k_output_tokens: 'INTEGER DEFAULT 15'
        }
      },
      subscriptions: {
        columns: ['id', 'user_id', 'plan_id', 'stripe_customer_id', 'stripe_subscription_id', 'status', 'billing_period', 'current_period_end', 'last_period_start', 'updated_at', 'created_at'],
        repairCols: {
          stripe_customer_id: 'VARCHAR(255)',
          stripe_subscription_id: 'VARCHAR(255)',
          billing_period: "VARCHAR(20) DEFAULT 'monthly'",
          last_period_start: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP'
        }
      },
      user_files: {
        columns: ['id', 'user_id', 'chat_id', 'file_name', 'file_type', 'mime_type', 'file_size', 'file_url', 'file_content', 'metadata', 'created_at', 'updated_at'],
        repairCols: {
          file_type: 'VARCHAR(100)',
          mime_type: 'VARCHAR(100)',
          file_size: 'INTEGER',
          file_url: 'TEXT',
          file_content: 'TEXT',
          metadata: "JSONB DEFAULT '{}'"
        }
      },
      system_settings: {
        columns: [
          'id', 'site_name_en', 'site_name_ar', 'logo_url', 'logo_light_url', 'favicon_url',
          'site_description_en', 'site_description_ar', 'seo_description_en', 'seo_description_ar',
          'keywords_en', 'keywords_ar', 'google_analytics_id', 'google_site_verification',
          'seo_image_url', 'stripe_publishable_key', 'stripe_secret_key', 'stripe_webhook_secret',
          'stripe_live_mode', 'stripe_status', 'stripe_last_verified_at', 'paypal_client_id',
          'paypal_client_secret', 'paypal_mode', 'paypal_status', 'paypal_last_verified_at',
          'image_prompt_pref_threshold', 'blocked_paths', 'seo_site_name_en', 'seo_site_name_ar', 'updated_at'
        ],
        repairCols: {
          logo_light_url: 'TEXT',
          stripe_status: "VARCHAR(50) DEFAULT 'pending'",
          stripe_last_verified_at: 'TIMESTAMP',
          stripe_secret_key: 'TEXT',
          stripe_publishable_key: 'TEXT',
          stripe_webhook_secret: 'TEXT',
          stripe_live_mode: 'BOOLEAN DEFAULT false',
          paypal_client_id: 'TEXT',
          paypal_client_secret: 'TEXT',
          paypal_mode: "VARCHAR(20) DEFAULT 'sandbox'",
          paypal_status: "VARCHAR(50) DEFAULT 'pending'",
          paypal_last_verified_at: 'TIMESTAMP',
          image_prompt_pref_threshold: 'INTEGER DEFAULT 150',
          blocked_paths: "TEXT DEFAULT ''",
          seo_site_name_en: 'TEXT',
          seo_site_name_ar: 'TEXT'
        }
      },
      bulletin_ads: {
        columns: [
          'id', 'user_id', 'author_name', 'author_avatar', 'title', 'description',
          'image_url', 'whatsapp_number', 'target_url', 'hashtags', 'category',
          'price_paid', 'duration_days', 'status', 'rejection_reason', 'likes_count',
          'comments_count', 'shares_count', 'clicks_count', 'impressions_count',
          'starts_at', 'expires_at', 'page_id', 'location_city', 'phone_number',
          'video_url', 'is_boosted', 'boosted_until', 'boost_tier', 'boost_price',
          'created_at', 'updated_at'
        ],
        repairCols: {
          page_id: 'INTEGER',
          location_city: "VARCHAR(100) DEFAULT 'فلسطين'",
          phone_number: 'VARCHAR(50)',
          video_url: 'TEXT',
          is_boosted: 'BOOLEAN DEFAULT FALSE',
          boosted_until: 'TIMESTAMP',
          boost_tier: 'VARCHAR(50)',
          boost_price: 'NUMERIC(10,2) DEFAULT 0'
        }
      },
      bulletin_pages: {
        columns: [
          'id', 'user_id', 'name', 'slug', 'category', 'city', 'address',
          'description', 'avatar_url', 'cover_url', 'whatsapp_number', 'phone_number',
          'website_url', 'is_verified', 'followers_count', 'ads_count', 'created_at', 'updated_at'
        ],
        repairCols: {
          is_verified: 'BOOLEAN DEFAULT TRUE',
          followers_count: 'INTEGER DEFAULT 0',
          ads_count: 'INTEGER DEFAULT 0'
        }
      },
      route_seo_settings: {
        columns: [
          'id', 'route', 'title_ar', 'title_en', 'description_ar', 'description_en',
          'keywords_ar', 'keywords_en', 'og_image_url', 'alt_text_ar', 'alt_text_en', 'is_active', 'created_at', 'updated_at'
        ],
        repairCols: {
          alt_text_ar: 'TEXT',
          alt_text_en: 'TEXT',
          is_active: 'BOOLEAN DEFAULT true'
        }
      },
      asset_metadata: {
        columns: [
          'id', 'file_url', 'asset_name', 'mime_type', 'file_size', 'alt_text_ar', 'alt_text_en',
          'og_title_ar', 'og_title_en', 'og_description_ar', 'og_description_en', 'keywords_ar', 'keywords_en',
          'visual_summary', 'ai_analysis_raw', 'created_at', 'updated_at'
        ],
        repairCols: {
          visual_summary: 'TEXT',
          ai_analysis_raw: "JSONB DEFAULT '{}'"
        }
      },
      registered_agents: {
        columns: [
          'id', 'client_id', 'client_secret', 'api_key_hash', 'client_name',
          'identity_type', 'credential_type', 'redirect_uris', 'jwks_uri',
          'user_agent', 'signature_keys', 'permissions', 'is_active', 'user_id', 'created_at'
        ],
        repairCols: {
          client_secret: 'VARCHAR(255)',
          api_key_hash: 'VARCHAR(255)',
          identity_type: "VARCHAR(50) DEFAULT 'agent'",
          credential_type: "VARCHAR(50) DEFAULT 'client_credentials'",
          redirect_uris: 'TEXT[]',
          jwks_uri: 'VARCHAR(500)',
          user_agent: 'VARCHAR(500)',
          signature_keys: 'JSONB',
          permissions: "JSONB DEFAULT '[]'",
          is_active: 'BOOLEAN DEFAULT true',
          user_id: 'INTEGER'
        }
      }
    },
    ledger: {
      wallets: {
        columns: ['id', 'user_id', 'balance', 'usd_balance', 'points', 'created_at', 'updated_at', 'referral_activated'],
        repairCols: {
          usd_balance: "NUMERIC(15, 4) DEFAULT '0.0000'",
          points: 'INTEGER DEFAULT 0',
          referral_activated: 'BOOLEAN DEFAULT false'
        }
      },
      ledger_transactions: {
        columns: ['id', 'wallet_id', 'user_id', 'amount', 'points', 'transaction_type', 'status', 'reference_id', 'metadata', 'ip_address', 'description', 'created_at', 'updated_at'],
        repairCols: {
          user_id: 'INTEGER',
          status: "VARCHAR(50) DEFAULT 'success'",
          metadata: "JSONB DEFAULT '{}'",
          ip_address: 'VARCHAR(100)'
        }
      },
      deposit_requests: {
        columns: ['id', 'user_id', 'amount', 'currency', 'method', 'proof_url', 'status', 'rejection_reason', 'admin_id', 'created_at', 'updated_at'],
        repairCols: {
          currency: "VARCHAR(10) DEFAULT 'USD'",
          proof_url: 'TEXT',
          status: "VARCHAR(20) DEFAULT 'pending'",
          rejection_reason: 'TEXT',
          admin_id: 'INTEGER'
        }
      },
      economy_settings: {
        columns: [
          'id', 'welcome_bonus_points', 'referral_bonus_points', 'min_withdrawal_cents',
          'points_per_dollar', 'conversion_rate', 'referral_bonus_percent', 'min_payout_usd',
          'min_deposit_usd', 'referral_activation_min_deposit', 'crypto_address', 'bank_name',
          'bank_recipient', 'bank_iban', 'bank_swift', 'paypal_email', 'updated_at'
        ],
        repairCols: {
          referral_bonus_percent: 'INTEGER DEFAULT 10',
          min_payout_usd: "NUMERIC(10, 2) DEFAULT '10.00'",
          min_deposit_usd: "NUMERIC(10, 2) DEFAULT '5.00'",
          referral_activation_min_deposit: "NUMERIC(10, 2) DEFAULT '10.00'"
        }
      }
    },
    external: {
      blog_articles: {
        columns: ['id', 'author_id', 'slug', 'title_en', 'title_ar', 'content_en', 'content_ar', 'image_url', 'category_en', 'category_ar', 'views', 'created_at', 'updated_at'],
        repairCols: {}
      },
      blog_comments: {
        columns: ['id', 'article_id', 'user_id', 'content', 'created_at', 'updated_at'],
        repairCols: {}
      },
      blog_ratings: {
        columns: ['id', 'article_id', 'user_id', 'rating', 'created_at'],
        repairCols: {}
      }
    },
    security: {
      token_blacklist: {
        columns: ['id', 'token', 'expires_at', 'created_at'],
        repairCols: {}
      },
      security_alerts: {
        columns: ['id', 'user_id', 'type', 'severity', 'description', 'metadata', 'is_resolved', 'ip_address', 'created_at', 'updated_at'],
        repairCols: {}
      },
      admin_audit_logs: {
        columns: ['id', 'admin_id', 'admin_email', 'action', 'target_resource', 'details', 'ip_address', 'user_agent', 'created_at'],
        repairCols: {}
      }
    }
  };

  const verifyDbGroup = async (groupName: 'core' | 'ledger' | 'external' | 'security', targetPool: any) => {
    if (!targetPool) return;
    try {
      const activeTables = await queryColumns(targetPool);
      const expectedTables = expectedSchema[groupName];

      for (const [tableName, spec] of Object.entries(expectedTables)) {
        if (!activeTables[tableName]) {
          report.passed = false;
          report.missingTables.push({ db: groupName, table: tableName });
          console.warn(`[Schema Integrity] ❌ Missing table: ${tableName} in database group ${groupName}`);
          
          try {
            console.log(`[Schema Integrity] 🔧 Attempting table reconstruction for ${tableName}...`);
            await initDb('additive', pool, ledgerPool);
            report.repairedTables.push(tableName);
            console.log(`[Schema Integrity] ✅ Table ${tableName} reconstructed successfully.`);
          } catch (repairErr: any) {
            console.error(`[Schema Integrity] ❌ Reconstruction failed for table ${tableName}:`, repairErr.message);
          }
          continue;
        }

        const activeCols = activeTables[tableName];
        for (const colName of spec.columns) {
          if (!activeCols.has(colName)) {
            report.passed = false;
            report.missingColumns.push({
              db: groupName,
              table: tableName,
              column: colName,
              expectedType: spec.repairCols?.[colName] || 'VARCHAR'
            });
            console.warn(`[Schema Integrity] ❌ Missing column: ${tableName}.${colName} in database group ${groupName}`);

            if (spec.repairCols?.[colName]) {
              try {
                console.log(`[Schema Integrity] 🔧 Attempting dynamic column addition: ${tableName}.${colName}...`);
                await ensureColumn(targetPool, tableName, colName, spec.repairCols[colName]);
                report.repairedColumns.push(`${tableName}.${colName}`);
                console.log(`[Schema Integrity] ✅ Column ${tableName}.${colName} added successfully.`);
              } catch (repairErr: any) {
                console.error(`[Schema Integrity] ❌ Column repair failed for ${tableName}.${colName}:`, repairErr.message);
              }
            }
          }
        }
      }
    } catch (e: any) {
      report.passed = false;
      report.errors.push(`${groupName} DB: ${e.message}`);
      console.error(`[Schema Integrity] Error auditing database group ${groupName}:`, e.message);
    }
  };

  await verifyDbGroup('core', pool);
  await verifyDbGroup('ledger', ledgerPool || pool);
  await verifyDbGroup('external', externalPool || pool);
  await verifyDbGroup('security', securityPool || pool);

  if (report.passed) {
    console.log('[Schema Integrity] 🛡️ All expected tables and columns verified successfully across all active pools!');
  } else {
    console.warn(`[Schema Integrity] ⚠️ Schema verification detected deviations:`, {
      missingTables: report.missingTables.length,
      missingColumns: report.missingColumns.length,
      repairedTables: report.repairedTables.length,
      repairedColumns: report.repairedColumns.length,
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
  } catch (dbErr: any) {
    console.error('[Schema Integrity] Failed to write audit record to migration_security_audit:', dbErr.message);
  }
}

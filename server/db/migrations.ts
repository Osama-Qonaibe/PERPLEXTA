import pkg from 'pg';
const { Pool } = pkg;
import bcrypt from 'bcryptjs';
import { pool, ledgerPool, externalPool, securityPool, getExternalPool, getSecurityPool, initializePerplextaPools, createInternalPool } from './index.js';
import { encrypt, decrypt } from '../utils/crypto.js';

export async function runSystemMaintenance() {
  try {
    if (pool) {
      // Safety check: only run if tables exist to prevent startup migration race conditions
      const tableCheck = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name IN (
          'token_blacklist', 'password_resets', 'user_activity_logs', 
          'subscriptions', 'oauth_states', 'ai_logs', 'notifications', 
          'system_logs', 'task_logs', 'stripe_events', 'security_alerts',
          'user_usage'
        )
      `);
      const existingTables = new Set(tableCheck.rows.map((r: any) => r.table_name));

      // 1. Cleanup expired tokens
      if (existingTables.has('token_blacklist')) {
        await pool.query("DELETE FROM token_blacklist WHERE expires_at < CURRENT_TIMESTAMP");
      }
      
      // 2. Cleanup expired password resets
      if (existingTables.has('password_resets')) {
        await pool.query("DELETE FROM password_resets WHERE expires_at < CURRENT_TIMESTAMP");
      }
      
      // 3. Cleanup old activity logs (keep 30 days)
      if (existingTables.has('user_activity_logs')) {
        await pool.query("DELETE FROM user_activity_logs WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '30 days'");
      }
      
      // 4. Update expired subscriptions
      if (existingTables.has('subscriptions')) {
        await pool.query(`
          UPDATE subscriptions 
          SET status = 'expired', updated_at = CURRENT_TIMESTAMP 
          WHERE current_period_end < CURRENT_TIMESTAMP 
          AND status = 'active'
        `);
      }

      // 5. Cleanup expired OAuth states
      if (existingTables.has('oauth_states')) {
        await pool.query("DELETE FROM oauth_states WHERE expires_at < CURRENT_TIMESTAMP");
      }

      // 6. Cleanup old AI logs (keep 30 days)
      if (existingTables.has('ai_logs')) {
        await pool.query("DELETE FROM ai_logs WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '30 days'");
      }

      // 7. Cleanup read notifications older than 30 days or any notifications older than 90 days
      if (existingTables.has('notifications')) {
        await pool.query(`
          DELETE FROM notifications 
          WHERE (is_read = true AND created_at < CURRENT_TIMESTAMP - INTERVAL '30 days')
             OR created_at < CURRENT_TIMESTAMP - INTERVAL '90 days'
        `);
      }

      // 8. Cleanup old system logs (keep 30 days)
      if (existingTables.has('system_logs')) {
        await pool.query("DELETE FROM system_logs WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '30 days'");
      }

      // 9. Cleanup old task logs (keep 30 days)
      if (existingTables.has('task_logs')) {
        await pool.query("DELETE FROM task_logs WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '30 days'");
      }

      // 10. Cleanup processed Stripe webhooks events (keep 90 days for audit trail)
      if (existingTables.has('stripe_events')) {
        await pool.query("DELETE FROM stripe_events WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '90 days'");
      }

      // 11. Cleanup harmless security alerts (keep 90 days for tracking)
      if (existingTables.has('security_alerts')) {
        await pool.query("DELETE FROM security_alerts WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '90 days'");
      }

      // 12. Cleanup legacy user usage limits metrics older than 90 days (retains database indexing speed)
      if (existingTables.has('user_usage')) {
        await pool.query("DELETE FROM user_usage WHERE usage_date < CURRENT_DATE - INTERVAL '90 days'");
      }

      console.log('[Maintenance] Daily system and database event logging cleanups completed successfully.');
    }
  } catch (e: any) {
    console.error('[Maintenance] System maintenance failed:', e.message);
  }
}

let io: any;
export function setIo(socketIo: any) {
  io = socketIo;
}

export async function ensureColumn(poolObj: any, tableName: string, columnName: string, type: string, defaultVal?: any) {
  const isClient = !!poolObj.release;
  const client = isClient ? poolObj : await poolObj.connect();
  
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
      
      let query = `ALTER TABLE "${tableName}" ADD COLUMN "${columnName}" ${type}`;
      if (defaultVal !== undefined) {
        query += ` DEFAULT ${defaultVal}`;
      }
      await client.query(query);
      console.log(`[Database] Added column ${columnName} to ${tableName}`);
    }
    
    if (!isClient) await client.query('COMMIT');
  } catch (e: any) {
    if (!isClient) await client.query('ROLLBACK');
    console.error(`[Database] ERROR in ensureColumn (${tableName}.${columnName}):`, e.message);
    throw e;
  } finally {
    if (!isClient) client.release();
  }
}

export async function runDatabaseMigrations(type: 'scratch' | 'additive' = 'additive') {
  if (!pool) return;
  const client = await pool.connect();
  let ledgerClient: any = null;
  let externalClient: any = null;
  let securityClient: any = null;
  
  if (ledgerPool && ledgerPool !== pool) {
    try {
      ledgerClient = await ledgerPool.connect();
      console.log('[Migrations] Connecting to secondary Ledger DB for dual-path synchronization...');
    } catch (e) {
      console.warn('[Migrations] Failed to connect to secondary Ledger DB. Falling back to Core for ledger tables.');
      ledgerClient = null;
    }
  }

  if (externalPool && externalPool !== pool) {
    try {
      externalClient = await externalPool.connect();
      console.log('[Migrations] Connecting to secondary External DB for dual-path forum/blog synchronization...');
    } catch (e) {
      console.warn('[Migrations] Failed to connect to secondary External DB:', e);
      externalClient = null;
    }
  }

  if (securityPool && securityPool !== pool) {
    try {
      securityClient = await securityPool.connect();
      console.log('[Migrations] Connecting to secondary Security DB for dual-path blacklist/alert synchronization...');
    } catch (e) {
      console.warn('[Migrations] Failed to connect to secondary Security DB:', e);
      securityClient = null;
    }
  }
  
  try {
    // 1. Migration History Table (Initialize if not exists)
    await client.query(`
      CREATE TABLE IF NOT EXISTS migration_history (
        id SERIAL PRIMARY KEY,
        migration_name VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Dynamic schema checks for newly added target databases
    if (externalClient) {
      try {
        const checkTable = await externalClient.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'forum_categories'
          )
        `);
        if (!checkTable.rows[0].exists) {
          console.log('[Migrations] forum_categories table does not exist on active external database. Forcing re-run of forum/blog migrations...');
          await client.query(`
            DELETE FROM migration_history 
            WHERE migration_name IN (
              'v22_forum_and_blog_schema',
              'v23_blog_ratings_and_sharing',
              'v24_seed_blog_platform_data',
              'v27_update_forum_categories_for_pioneers_and_developers',
              'v28_refine_forum_categories_names'
            )
          `);
        }
      } catch (e: any) {
        console.warn('[Migrations] Failed to inspect external database structure:', e.message);
      }
    }

    if (securityClient) {
      try {
        const checkSecTable = await securityClient.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'security_alerts'
          )
        `);
        if (!checkSecTable.rows[0].exists) {
          console.log('[Migrations] Creating core security tables on the active security database...');
          await securityClient.query(`
            CREATE TABLE IF NOT EXISTS token_blacklist (
              id SERIAL PRIMARY KEY,
              token TEXT UNIQUE NOT NULL,
              expires_at TIMESTAMP NOT NULL,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
          `);
          await securityClient.query(`
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
        }
      } catch (e: any) {
        console.warn('[Migrations] Failed to initialize security database tables:', e.message);
      }
    }

    if (type === 'scratch') {
      console.warn('[Migrations] RUNNING IN SCRATCH MODE - ALL DATA WILL BE WIPED');
      const tables = ['db_connections_registry', 'users', 'user_sessions', 'chats', 'messages', 'api_keys_vault', 'tool_orchestrator', 'subscriptions', 'plans', 'user_usage', 'notifications', 'chat_memories', 'email_templates', 'email_settings', 'campaigns', 'ai_logs', 'message_reports', 'user_shortcuts', 'task_logs', 'user_activity_logs', 'system_settings', 'system_broadcasts', 'user_files', 'security_alerts', 'system_logs', 'token_blacklist', 'password_resets', 'support_tickets', 'support_ticket_replies', 'oauth_states'];
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
        const externalTables = ['forum_categories', 'forum_posts', 'forum_comments', 'blog_articles', 'blog_comments', 'blog_ratings'];
        for (const t of externalTables) {
          await externalClient.query(`DROP TABLE IF EXISTS "${t}" CASCADE`);
        }
      }
      if (securityClient) {
        const securityTables = ['token_blacklist', 'security_alerts'];
        for (const t of securityTables) {
          await securityClient.query(`DROP TABLE IF EXISTS "${t}" CASCADE`);
        }
      }
      await client.query('DELETE FROM migration_history');
    }

    // 2. Base Registry Table
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

    // Helper to run a versioned migration
    const runVersioned = async (name: string, description: string, fn: (tx?: any, ledgerTx?: any) => Promise<void>) => {
      const check = await client.query('SELECT 1 FROM migration_history WHERE migration_name = $1', [name]);
      if (check.rows.length === 0) {
        console.log(`[Migrations] Applying ${name}: ${description}...`);
        await client.query('BEGIN');
        if (ledgerClient) await ledgerClient.query('BEGIN');
        if (externalClient) await externalClient.query('BEGIN');
        if (securityClient) await securityClient.query('BEGIN');
        try {
          const findClientForQuery = (sql: string, params?: any[]) => {
            const queryLower = sql.toLowerCase();
            
            const isTableMatched = (tableName: string) => {
              if (queryLower.includes(tableName)) return true;
              if (params && params.some(p => typeof p === 'string' && p.toLowerCase() === tableName)) return true;
              return false;
            };

            // External tables query check
            if (
              isTableMatched('forum_categories') ||
              isTableMatched('forum_posts') ||
              isTableMatched('forum_comments') ||
              isTableMatched('blog_articles') ||
              isTableMatched('blog_comments') ||
              isTableMatched('blog_ratings')
            ) {
              return externalClient || client;
            }
            
            // Security tables query check
            if (
              isTableMatched('token_blacklist') ||
              isTableMatched('security_alerts')
            ) {
              return securityClient || client;
            }
            
            // Ledger tables check
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

          const wrappedClient = {
            release: () => {},
            query: async (text: any, params?: any[]) => {
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

          const wrappedLedgerClient = {
            release: () => {},
            query: async (text: any, params?: any[]) => {
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
        } catch (e) {
          await client.query('ROLLBACK');
          if (ledgerClient) await ledgerClient.query('ROLLBACK');
          if (externalClient) await externalClient.query('ROLLBACK');
          if (securityClient) await securityClient.query('ROLLBACK');
          console.error(`[Migrations] Failed to apply ${name}:`, e);
          throw e;
        }
      }
    };

    // MIGRATION: Core Schema v1
    await runVersioned('v1_core_schema', 'Initial core database schema', async (tx, ledgerTx) => {
      await initDb(type, tx, ledgerTx);
    });

    // MIGRATION: Additive Columns v2
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

      await tx.query(`SELECT 1`); // Placeholder
    });

    // MIGRATION: Ledger Schema v3 (Isolated Transaction)
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

    // MIGRATION: Database Registry Seed
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

    // MIGRATION: Cleanup Duplicate Columns
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

    // MIGRATION: Coupon System Expansion v6
    await runVersioned('v6_coupon_system_expansion', 'Adding detailed coupon tracking', async (tx, ledgerTx) => {
      const ledgerTarget = ledgerTx || tx;
      await ensureColumn(ledgerTarget, 'coupons', 'usage_limit', 'INTEGER', '0');
      await ensureColumn(ledgerTarget, 'coupons', 'usage_count', 'INTEGER', '0');
      await ensureColumn(ledgerTarget, 'coupons', 'is_active', 'BOOLEAN', 'true');
    });

    // MIGRATION: Finance & History Expansion v7
    await runVersioned('v7_finance_expansion', 'Adding deposit requests and plan history', async (tx, ledgerTx) => {
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
      await tx.query(`
        CREATE TABLE IF NOT EXISTS plan_features_history (
          id SERIAL PRIMARY KEY,
          plan_id INTEGER,
          admin_id INTEGER,
          change_log JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    });

    // MIGRATION: Security Hardening (Stripe Key Encryption) v8
    await runVersioned('v8_security_hardening', 'Enforcing encryption on all sensitive system settings', async (tx) => {
      const { encrypt } = await import('../utils/crypto.js');
      const settingsRes = await tx.query('SELECT id, stripe_secret_key, stripe_publishable_key, stripe_webhook_secret FROM system_settings');
      
      const encryptionPattern = /^[0-9a-fA-F]{32}:[0-9a-fA-F]+$/;
      
      for (const row of settingsRes.rows) {
        let needsUpdate = false;
        const updates: any = {};

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

    // MIGRATION: Sequential Reconciliation v9
    await runVersioned('v9_filler_reconciliation', 'Reconciling migration index sequence to ensure consistent numbering', async (tx) => {
      await tx.query(`SELECT 1`);
    });

    // MIGRATION: Economy settings refactor v10
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

    // MIGRATION: Ensure Baseline Tables v11
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
      
      await tx.query(`
        CREATE TABLE IF NOT EXISTS token_blacklist (
          id SERIAL PRIMARY KEY,
          token TEXT UNIQUE NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    });

    // MIGRATION: Granular Limit Overrides v12
    await runVersioned('v12_custom_limits', 'Adding custom_limits jsonb column to users table for granular overrides', async (tx) => {
      await tx.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS custom_limits JSONB DEFAULT NULL`);
    });

    // MIGRATION: Payment Gateways Settings Expansion v13
    await runVersioned('v13_payment_gateways_expansion', 'Adding crypto deposit address, bank details, and PayPal address to economy_settings', async (tx, ledgerTx) => {
      const ledgerTarget = ledgerTx || tx;
      await ensureColumn(ledgerTarget, 'economy_settings', 'crypto_address', 'TEXT', `'TPh7eWpY29kZVN6QXV0VGhlbnRpY2F0aW9uTGVkZ2Vy'`);
      await ensureColumn(ledgerTarget, 'economy_settings', 'bank_name', 'VARCHAR(255)', `'Merchant Discount Bank IL (011)'`);
      await ensureColumn(ledgerTarget, 'economy_settings', 'bank_recipient', 'VARCHAR(255)', `'Perplexta Tech Platforms LTD.'`);
      await ensureColumn(ledgerTarget, 'economy_settings', 'bank_iban', 'VARCHAR(255)', `'IL42 0110 0000 0000 3484 2192'`);
      await ensureColumn(ledgerTarget, 'economy_settings', 'bank_swift', 'VARCHAR(100)', `'PPLXIL33XXX'`);
      await ensureColumn(ledgerTarget, 'economy_settings', 'paypal_email', 'VARCHAR(255)', `'paypal@perplexta.com'`);
    });

    // MIGRATION: PayPal Credentials to system_settings v14
    await runVersioned('v14_paypal_settings', 'Adding PayPal credential columns to system_settings table', async (tx) => {
      await ensureColumn(tx, 'system_settings', 'paypal_client_id', 'TEXT');
      await ensureColumn(tx, 'system_settings', 'paypal_client_secret', 'TEXT');
      await ensureColumn(tx, 'system_settings', 'paypal_mode', "VARCHAR(20)", `'sandbox'`);
      await ensureColumn(tx, 'system_settings', 'paypal_status', "VARCHAR(50)", `'pending'`);
      await ensureColumn(tx, 'system_settings', 'paypal_last_verified_at', 'TIMESTAMP');
    });

    // MIGRATION: Hide column for transaction records v15
    await runVersioned('v15_transaction_hide_column', 'Adding is_hidden column to ledger_transactions for user level clear/archive mechanics', async (tx, ledgerTx) => {
      const ledgerTarget = ledgerTx || tx;
      await ensureColumn(ledgerTarget, 'ledger_transactions', 'is_hidden', 'BOOLEAN', 'false');
    });

    // MIGRATION: Referral Code v16
    await runVersioned('v16_user_referral_code', 'Adding unique 6-character alphanumeric referral_code to users table and populating existing users', async (tx) => {
      await ensureColumn(tx, 'users', 'referral_code', 'VARCHAR(6)');
      
      // Fetch all users currently lacking a referral_code
      const usersRes = await tx.query('SELECT id FROM users WHERE referral_code IS NULL OR referral_code = \'\'');
      for (const row of usersRes.rows) {
        let code = '';
        let isUnique = false;
        let attempts = 0;
        while (!isUnique && attempts < 100) {
          attempts++;
          const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
          code = '';
          for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
          }
          // Verify code doesn't exist already in DB (pre-migration set + user table)
          const dupRes = await tx.query('SELECT id FROM users WHERE referral_code = $1', [code]);
          if (dupRes.rows.length === 0) {
            isUnique = true;
          }
        }
        await tx.query('UPDATE users SET referral_code = $1 WHERE id = $2', [code, row.id]);
      }
      
      // Create a unique index to strictly prevent duplication at database level
      await tx.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code)');
    });

    // MIGRATION: Messages Schema Update v17
    await runVersioned('v17_messages_schema_update', 'Ensuring tracking and generation metadata columns exist in messages table', async (tx) => {
      await ensureColumn(tx, 'messages', 'thinking_steps', 'JSONB', `'[]'`);
      await ensureColumn(tx, 'messages', 'citations', 'JSONB', `'[]'`);
      await ensureColumn(tx, 'messages', 'follow_ups', 'JSONB', `'[]'`);
      await ensureColumn(tx, 'messages', 'feedback', 'SMALLINT', '0');
      await ensureColumn(tx, 'messages', 'generation_time', 'NUMERIC');
      await ensureColumn(tx, 'messages', 'is_pinned', 'BOOLEAN', 'false');
    });

    // MIGRATION: User Sessions Schema v18
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

    // MIGRATION: SEO Upgrade and Robustness v19
    await runVersioned('v19_seo_upgrade', 'Ensuring system_settings has robust SEO descriptions and keywords column extensions', async (tx) => {
      await ensureColumn(tx, 'system_settings', 'seo_description_en', 'TEXT');
      await ensureColumn(tx, 'system_settings', 'seo_description_ar', 'TEXT');
      await ensureColumn(tx, 'system_settings', 'keywords_en', 'TEXT');
      await ensureColumn(tx, 'system_settings', 'keywords_ar', 'TEXT');
      await ensureColumn(tx, 'system_settings', 'site_description_en', 'TEXT');
      await ensureColumn(tx, 'system_settings', 'site_description_ar', 'TEXT');
    });

    // MIGRATION: SEO Preview Image Support v20
    await runVersioned('v20_seo_image', 'Adding seo_image_url column extension to support high-efficiency open graph representations', async (tx) => {
      await ensureColumn(tx, 'system_settings', 'seo_image_url', 'TEXT');
    });

    // MIGRATION: Google Site Verification Support v21
    await runVersioned('v21_google_site_verification', 'Adding google_site_verification column extension to support dynamic search console verification', async (tx) => {
      await ensureColumn(tx, 'system_settings', 'google_site_verification', 'VARCHAR(255)');
    });

    // MIGRATION: Forum and Blog Engine v22
    await runVersioned('v22_forum_and_blog_schema', 'Created Forum and Blog core tables with initial categories', async (tx) => {
      // 1. Create forum categories
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

      // 2. Create forum posts
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

      // 3. Create forum comments
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

      // 4. Create blog articles
      await tx.query(`
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

      // 5. Create blog comments
      await tx.query(`
        CREATE TABLE IF NOT EXISTS blog_comments (
          id SERIAL PRIMARY KEY,
          article_id INTEGER NOT NULL REFERENCES blog_articles(id) ON DELETE CASCADE,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          content TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Seed categories if database is clean
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

    // MIGRATION: Blog Ratings Engine v23
    await runVersioned('v23_blog_ratings_and_sharing', 'Creating blog ratings database structure', async (tx) => {
      await tx.query(`
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

    // MIGRATION: Seeding professional placeholder blog articles v24
    await runVersioned('v24_seed_blog_platform_data', 'Seeding elite magazine articles to database', async (tx) => {
      const articlesCount = await tx.query('SELECT COUNT(*) FROM blog_articles');
      if (parseInt(articlesCount.rows[0].count, 10) === 0) {
        // Find best author
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
              'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1080&h=1080&fit=crop',
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
              'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?w=1080&h=1080&fit=crop',
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
              'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1080&h=1080&fit=crop',
              'Macro Strategies',
              'الاستراتيجيات الكلية',
              245
            )
          `, [authorId]);
        }
      }
    });

    // MIGRATION: Marketplace Core Schema v25
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

    // MIGRATION: Marketplace Seed Extension v26
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

    // MIGRATION: Update Forum Categories v27
    await runVersioned('v27_update_forum_categories_for_pioneers_and_developers', 'Upgrading forum categories and re-mapping legacy post associations safely', async (tx) => {
      // 1. Ensure new categories exist
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

      // 2. Fetch ID mappings
      const categoriesRes = await tx.query('SELECT id, slug FROM forum_categories');
      const catMap: { [key: string]: number } = {};
      categoriesRes.rows.forEach((row: { id: number; slug: string }) => {
        catMap[row.slug] = row.id;
      });

      const targetId = catMap['pioneers-devs-designers'];
      const troubleshootingId = catMap['troubleshooting'];
      const expertiseId = catMap['expertise-sharing'];

      if (targetId) {
        // Remap general and announcements
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

      // 3. Purge legacy categories
      await tx.query("DELETE FROM forum_categories WHERE slug IN ('general', 'analysis', 'technical-support', 'announcements')");
    });

    // MIGRATION: Refine Forum Categories Names v28
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

    // MIGRATION: External and Security Databases Seeding v29
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

    console.log('[Migrations] All versioned migrations completed successfully.');
  } catch (error: any) {
    console.error('[CRITICAL] Database Migration failed:', error.message);
    if (process.env.NODE_ENV === 'production') throw error;
  } finally {
    client.release();
    if (ledgerClient) ledgerClient.release();
    if (externalClient) externalClient.release();
    if (securityClient) securityClient.release();
  }
}

export async function initDb(mode: 'scratch' | 'additive' = 'additive', customPool?: any, customLedgerPool?: any) {
  if (!pool) return;
  const targetPool = customPool || pool;
  const targetLedgerPool = customLedgerPool || (ledgerPool === pool ? targetPool : (ledgerPool || targetPool));

  const schema = [
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
        language VARCHAR(5) DEFAULT 'ar',
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
        url_key TEXT
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
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
        crypto_address TEXT DEFAULT 'TPh7eWpY29kZVN6QXV0VGhlbnRpY2F0aW9uTGVkZ2Vy',
        bank_name VARCHAR(255) DEFAULT 'Merchant Discount Bank IL (011)',
        bank_recipient VARCHAR(255) DEFAULT 'Perplexta Tech Platforms LTD.',
        bank_iban VARCHAR(255) DEFAULT 'IL42 0110 0000 0000 3484 2192',
        bank_swift VARCHAR(100) DEFAULT 'PPLXIL33XXX',
        paypal_email VARCHAR(255) DEFAULT 'paypal@perplexta.com'
      )`
    },
    {
      name: 'user_usage_logs',
      pool: targetLedgerPool,
      query: `CREATE TABLE IF NOT EXISTS user_usage_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        tool_id VARCHAR(100) NOT NULL,
        model VARCHAR(255),
        amount NUMERIC(15, 4) DEFAULT '0',
        usage_type VARCHAR(50) DEFAULT 'free',
        tokens_used INTEGER DEFAULT 0,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
      name: 'campaigns',
      query: `CREATE TABLE IF NOT EXISTS campaigns (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        template_id INTEGER,
        target_criteria JSONB,
        total_recipients INTEGER DEFAULT 0,
        success_count INTEGER DEFAULT 0,
        fail_count INTEGER DEFAULT 0,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: 'ai_logs',
      query: `CREATE TABLE IF NOT EXISTS ai_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        tool_id VARCHAR(50),
        provider VARCHAR(50),
        model VARCHAR(255),
        prompt_tokens INTEGER DEFAULT 0,
        completion_tokens INTEGER DEFAULT 0,
        cost NUMERIC(15, 6) DEFAULT '0',
        status VARCHAR(20) DEFAULT 'success',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
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
        user_id INTEGER,
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
      name: 'task_logs',
      query: `CREATE TABLE IF NOT EXISTS task_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        tool_id VARCHAR(50),
        task_type VARCHAR(100),
        status VARCHAR(20) DEFAULT 'pending',
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        task_id VARCHAR(50) NOT NULL UNIQUE,
        message TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: 'user_activity_logs',
      query: `CREATE TABLE IF NOT EXISTS user_activity_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        tool_id VARCHAR(50),
        amount DECIMAL(15,4) DEFAULT 1,
        usage_type VARCHAR(20) DEFAULT 'quota',
        action_type VARCHAR(100) DEFAULT 'system_event',
        description TEXT,
        ip_address VARCHAR(100),
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: 'system_settings',
      query: `CREATE TABLE IF NOT EXISTS system_settings (
        id SERIAL PRIMARY KEY,
        site_name_en VARCHAR(255) DEFAULT 'Premium AI',
        site_name_ar VARCHAR(255) DEFAULT 'منصة النخبة',
        logo_url TEXT,
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
      name: 'plan_features_history',
      query: `CREATE TABLE IF NOT EXISTS plan_features_history (
        id SERIAL PRIMARY KEY,
        plan_id INTEGER,
        admin_id INTEGER,
        change_log JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    }
  ];

  for (const table of schema) {
    const p = (table as any).pool || targetPool;
    await p.query(table.query);
  }

  const indexes = [
    { pool: targetPool, query: `CREATE UNIQUE INDEX IF NOT EXISTS ai_logs_pkey ON ai_logs(id)` },
    { pool: targetPool, query: `CREATE INDEX IF NOT EXISTS idx_ai_logs_user_id ON ai_logs(user_id)` },
    { pool: targetPool, query: `CREATE UNIQUE INDEX IF NOT EXISTS api_keys_vault_pkey ON api_keys_vault(id)` },
    { pool: targetPool, query: `CREATE UNIQUE INDEX IF NOT EXISTS api_keys_vault_provider_key ON api_keys_vault(provider)` },
    { pool: targetPool, query: `CREATE UNIQUE INDEX IF NOT EXISTS campaigns_pkey ON campaigns(id)` },
    { pool: targetPool, query: `CREATE UNIQUE INDEX IF NOT EXISTS chat_memories_pkey ON chat_memories(id)` },
    { pool: targetPool, query: `CREATE INDEX IF NOT EXISTS idx_chat_memories_user_id ON chat_memories(user_id)` },
    { pool: targetPool, query: `CREATE INDEX IF NOT EXISTS idx_chat_memories_chat_id ON chat_memories(chat_id)` },
    { pool: targetPool, query: `CREATE UNIQUE INDEX IF NOT EXISTS chats_pkey ON chats(id)` },
    { pool: targetPool, query: `CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats(user_id)` },
    { pool: targetLedgerPool, query: `CREATE UNIQUE INDEX IF NOT EXISTS coupons_code_key ON coupons(code)` },
    { pool: targetLedgerPool, query: `CREATE UNIQUE INDEX IF NOT EXISTS coupons_pkey ON coupons(id)` },
    { pool: targetPool, query: `CREATE UNIQUE INDEX IF NOT EXISTS db_connections_registry_pkey ON db_connections_registry(id)` },
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
    { pool: targetPool, query: `CREATE UNIQUE INDEX IF NOT EXISTS task_logs_pkey ON task_logs(id)` },
    { pool: targetPool, query: `CREATE UNIQUE INDEX IF NOT EXISTS task_logs_task_id_key ON task_logs(task_id)` },
    { pool: targetPool, query: `CREATE UNIQUE INDEX IF NOT EXISTS token_blacklist_pkey ON token_blacklist(id)` },
    { pool: targetPool, query: `CREATE UNIQUE INDEX IF NOT EXISTS token_blacklist_token_key ON token_blacklist(token)` },
    { pool: targetPool, query: `CREATE UNIQUE INDEX IF NOT EXISTS oauth_states_pkey ON oauth_states(id)` },
    { pool: targetPool, query: `CREATE UNIQUE INDEX IF NOT EXISTS oauth_states_state_key ON oauth_states(state)` },
    { pool: targetPool, query: `CREATE UNIQUE INDEX IF NOT EXISTS tool_orchestrator_pkey ON tool_orchestrator(id)` },
    { pool: targetPool, query: `CREATE UNIQUE INDEX IF NOT EXISTS tool_orchestrator_tool_id_key ON tool_orchestrator(tool_id)` },
    { pool: targetPool, query: `CREATE INDEX IF NOT EXISTS idx_activity_created_at ON user_activity_logs(created_at)` },
    { pool: targetPool, query: `CREATE INDEX IF NOT EXISTS idx_activity_user_id ON user_activity_logs(user_id)` },
    { pool: targetPool, query: `CREATE UNIQUE INDEX IF NOT EXISTS user_activity_logs_pkey ON user_activity_logs(id)` },
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
    { pool: targetLedgerPool, query: `CREATE INDEX IF NOT EXISTS idx_ledger_reference ON ledger_transactions(reference_id)` }
  ];

  for (const idx of indexes) {
    await idx.pool.query(idx.query);
  }

  // Relations & FKs
  const relations = [
    { pool: targetPool, query: `ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_template_id_fkey` },
    { pool: targetPool, query: `ALTER TABLE campaigns ADD CONSTRAINT campaigns_template_id_fkey FOREIGN KEY (template_id) REFERENCES email_templates(id)` },
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
    { pool: targetLedgerPool, query: `ALTER TABLE coupon_usages ADD CONSTRAINT coupon_usages_coupon_id_fkey FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE` },
    { pool: targetPool, query: `ALTER TABLE plan_features_history DROP CONSTRAINT IF EXISTS plan_features_history_plan_id_fkey` },
    { pool: targetPool, query: `ALTER TABLE plan_features_history ADD CONSTRAINT plan_features_history_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE` }
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

  // Seed economy_settings in Ledger DB if empty
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
        INSERT INTO plans (name_en, name_ar, desc_en, desc_ar, monthly_price, annual_price, discount, features, color, is_popular, badge, limits)
        VALUES
          ('Starter', 'البداية', 'Free starter plan', 'خطة البداية المجانية', 0, 0, 0, '["Basic Search", "Limited AI Chats"]', '#10b981', false, 'Standard', '{"chat": 20, "chat_fast": 30, "perplexta_analysis": 5, "image": 2, "code": 5, "notebook": 10, "stt": 5, "tts": 5, "storage_mb": 100}'),
          ('Pro', 'المحترف', 'Professional plan for advanced users', 'خطة المحترفين للمستخدمين المتقدمين', 19.99, 199.90, 17, '["Advanced Analysis", "Unlimited Chats", "Priority Support"]', '#3b82f6', true, 'Best Value', '{"chat": "unlimited", "chat_fast": "unlimited", "chat_pro": 100, "perplexta_analysis": 50, "image": 50, "code": 100, "notebook": 100, "stt": 100, "tts": 100, "storage_mb": 1024}'),
          ('Elite', 'النخبة', 'Full power for strategic expert users', 'القوة الكاملة للمستخدمين الخبراء الاستراتيجيين', 49.99, 499.90, 17, '["Full Perplexta Access", "Multi-model Orchestration", "Concierge Support"]', '#8b5cf6', false, 'Elite', '{"chat": "unlimited", "chat_fast": "unlimited", "chat_pro": "unlimited", "chat_reasoning": "unlimited", "perplexta_analysis": "unlimited", "image": "unlimited", "video": 50, "code": "unlimited", "legal_analysis": "unlimited", "storage_mb": 10240}')
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
      ('sovereign_search', '', '', 'Global real-time web intelligence and strategic knowledge extraction.', 'البحث الذكي العالمي في الوقت الفعلي واستخراج المعرفة الاستراتيجية.', 10)
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
      const connectionString = reg.connection_string ? decrypt(reg.connection_string) : '';
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
  } catch (err: any) {
    console.error('[Monitor] Database monitoring failed:', err.message);
  } finally {
    isMonitoring = false;
  }
}
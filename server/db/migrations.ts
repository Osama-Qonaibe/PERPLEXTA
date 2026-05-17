import pkg from 'pg';
const { Pool } = pkg;
import bcrypt from 'bcryptjs';
import { pool, ledgerPool, initializeSovereignPools, createInternalPool } from './index.js';
import { encrypt, decrypt } from '../utils/crypto.js';

export async function runSystemMaintenance() {
  try {
    if (pool) {
      // 1. Cleanup expired tokens
      await pool.query("DELETE FROM token_blacklist WHERE expires_at < CURRENT_TIMESTAMP");
      
      // 2. Cleanup expired password resets
      await pool.query("DELETE FROM password_resets WHERE expires_at < CURRENT_TIMESTAMP");
      
      // 3. Cleanup old activity logs (keep 30 days)
      await pool.query("DELETE FROM user_activity_logs WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '30 days'");
      
      // 4. Update expired subscriptions
      await pool.query(`
        UPDATE subscriptions 
        SET status = 'expired', updated_at = CURRENT_TIMESTAMP 
        WHERE current_period_end < CURRENT_TIMESTAMP 
        AND status = 'active'
      `);

      console.log('[Maintenance] Daily system cleanup completed successfully.');
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
  const isClient = poolObj.query && typeof poolObj.connect !== 'function';
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
  
  try {
    await client.query('BEGIN');

    // 1. Migration History Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS migration_history (
        id SERIAL PRIMARY KEY,
        migration_name VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    if (type === 'scratch') {
      console.warn('[Migrations] RUNNING IN SCRATCH MODE - ALL DATA WILL BE WIPED');
      const tables = ['db_connections_registry', 'users', 'chats', 'messages', 'api_keys_vault', 'tool_orchestrator', 'subscriptions', 'plans', 'user_usage', 'notifications', 'chat_memories', 'email_templates', 'email_settings', 'campaigns', 'ai_logs', 'message_reports', 'user_shortcuts', 'task_logs', 'user_activity_logs', 'system_settings', 'system_broadcasts', 'user_files', 'security_alerts', 'system_logs', 'token_blacklist', 'password_resets', 'support_tickets', 'support_ticket_replies'];
      for (const t of tables) {
        await client.query(`DROP TABLE IF EXISTS "${t}" CASCADE`);
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

    // 3. Run versioned migrations here if needed
    // For now we use the monolithic initDb but wrapped in this transaction
    await initDb(type, client);

    // 4. Record Base Migration
    await client.query(`INSERT INTO migration_history (migration_name) VALUES ($1) ON CONFLICT (migration_name) DO NOTHING`, ['v1_core_schema']);

    // 5. Additive Columns (Idempotent)
    await ensureColumn(client, 'users', 'last_active_at', 'TIMESTAMP');
    await ensureColumn(client, 'users', 'theme', 'VARCHAR(10)', `'dark'`);
    await ensureColumn(client, 'users', 'updated_at', 'TIMESTAMP', 'CURRENT_TIMESTAMP');
    await ensureColumn(client, 'users', 'referred_by', 'INTEGER');
    await ensureColumn(client, 'users', 'kyc_submitted_at', 'TIMESTAMP');
    await ensureColumn(client, 'users', 'kyc_rejection_reason', 'TEXT');
    await ensureColumn(client, 'users', 'memory', 'TEXT');
    await ensureColumn(client, 'users', 'support_notes', 'TEXT');
    await ensureColumn(client, 'users', 'password_hash', 'TEXT');
    await ensureColumn(client, 'users', 'status', 'VARCHAR(20)', `'active'`);

    await ensureColumn(client, 'chats', 'updated_at', 'TIMESTAMP', 'CURRENT_TIMESTAMP');
    await ensureColumn(client, 'chats', 'context_summary', 'TEXT');

    await ensureColumn(client, 'messages', 'thinking_steps', 'JSONB', `'[]'`);
    await ensureColumn(client, 'messages', 'citations', 'JSONB', `'[]'`);
    await ensureColumn(client, 'messages', 'follow_ups', 'JSONB', `'[]'`);
    await ensureColumn(client, 'messages', 'feedback', 'SMALLINT', '0');

    await ensureColumn(client, 'api_keys_vault', 'updated_at', 'TIMESTAMP', 'CURRENT_TIMESTAMP');
    await ensureColumn(client, 'api_keys_vault', 'model_list', 'JSONB', `'[]'`);
    await ensureColumn(client, 'api_keys_vault', 'last_reset_date', 'DATE', 'CURRENT_DATE');

    const ledgerTarget = ledgerPool || pool;
    // Note: ensureColumn handles multi-pool context if passed a pool, 
    // but here we are inside a client transaction for the core pool.
    // ledgerPool might be a different DB entirely, so we can't use 'client' for it.
    await ensureColumn(ledgerTarget, 'wallets', 'balance', 'DECIMAL(15,4)', '0.0000');
    await ensureColumn(ledgerTarget, 'wallets', 'updated_at', 'TIMESTAMP', 'CURRENT_TIMESTAMP');

    await ensureColumn(client, 'subscriptions', 'stripe_customer_id', 'VARCHAR(255)');
    await ensureColumn(client, 'subscriptions', 'stripe_subscription_id', 'VARCHAR(255)');
    await ensureColumn(client, 'subscriptions', 'billing_period', 'VARCHAR(20)', `'monthly'`);
    await ensureColumn(client, 'subscriptions', 'last_period_start', 'TIMESTAMP', 'CURRENT_TIMESTAMP');

    await ensureColumn(client, 'user_files', 'file_type', 'VARCHAR(100)');
    await ensureColumn(client, 'user_files', 'file_size', 'INTEGER');
    await ensureColumn(client, 'user_files', 'file_url', 'TEXT');
    await ensureColumn(client, 'user_files', 'file_content', 'TEXT');
    await ensureColumn(client, 'user_files', 'mime_type', 'VARCHAR(100)');

    await ensureColumn(client, 'system_settings', 'stripe_status', 'VARCHAR(20)', `'pending'`);
    await ensureColumn(client, 'system_settings', 'stripe_last_verified_at', 'TIMESTAMP');
    await ensureColumn(client, 'system_settings', 'stripe_secret_key', 'TEXT');
    await ensureColumn(client, 'system_settings', 'stripe_publishable_key', 'TEXT');
    await ensureColumn(client, 'system_settings', 'stripe_webhook_secret', 'TEXT');
    await ensureColumn(client, 'system_settings', 'stripe_live_mode', 'BOOLEAN', 'false');

    await ensureColumn(ledgerTarget, 'ledger_transactions', 'user_id', 'INTEGER');
    await ensureColumn(ledgerTarget, 'ledger_transactions', 'status', 'VARCHAR(20)', `'success'`);
    await ensureColumn(ledgerTarget, 'ledger_transactions', 'metadata', 'JSONB', `'{}'`);
    await ensureColumn(ledgerTarget, 'ledger_transactions', 'ip_address', 'VARCHAR(45)');

    await ensureColumn(ledgerTarget, 'wallets', 'referral_activated', 'BOOLEAN', 'false');

    await ensureColumn(client, 'tool_orchestrator', 'fallback_1_provider', 'VARCHAR(50)');
    await ensureColumn(client, 'tool_orchestrator', 'fallback_1_model', 'VARCHAR(255)');
    await ensureColumn(client, 'tool_orchestrator', 'fallback_2_provider', 'VARCHAR(50)');
    await ensureColumn(client, 'tool_orchestrator', 'fallback_2_model', 'VARCHAR(255)');
    await ensureColumn(client, 'tool_orchestrator', 'fallback_3_provider', 'VARCHAR(50)');
    await ensureColumn(client, 'tool_orchestrator', 'fallback_3_model', 'VARCHAR(255)');

    await ensureColumn(client, 'system_broadcasts', 'admin_id', 'INTEGER');
    await ensureColumn(client, 'system_broadcasts', 'broadcast_type', 'VARCHAR(50)', `'system'`);
    await ensureColumn(client, 'system_broadcasts', 'type', 'VARCHAR(50)', `'system'`);
    await ensureColumn(client, 'system_broadcasts', 'target_group', 'VARCHAR(50)', `'all'`);
    await ensureColumn(client, 'system_broadcasts', 'target_role', 'VARCHAR(20)', `'all'`);
    await ensureColumn(client, 'system_broadcasts', 'status', 'VARCHAR(20)', `'completed'`);
    await ensureColumn(client, 'system_broadcasts', 'sent_count', 'INTEGER', '0');

    await ensureColumn(client, 'system_logs', 'type', 'VARCHAR(50)', `'system'`);
    await ensureColumn(client, 'system_logs', 'details', 'JSONB', `'{}'`);
    await ensureColumn(client, 'security_alerts', 'type', 'VARCHAR(50)', `'security'`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS password_resets (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        token VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 6. Config seeding moved inside transaction
    const coreUrl = process.env.DATABASE_URL;
    const ledgerUrl = process.env.LEDGER_DATABASE_URL;

    if (coreUrl) {
        const coreEncrypted = encrypt(coreUrl);
        await client.query(
          `INSERT INTO db_connections_registry (id, provider, connection_string, is_active) VALUES ('core', 'core', $1, true) ON CONFLICT (id) DO NOTHING`,
          [coreEncrypted]
        );
    }
    if (ledgerUrl) {
        const ledgerEncrypted = encrypt(ledgerUrl);
        await client.query(
          `INSERT INTO db_connections_registry (id, provider, connection_string, is_active) VALUES ('ledger', 'ledger', $1, true) ON CONFLICT (id) DO NOTHING`,
          [ledgerEncrypted]
        );
    }

    await client.query('COMMIT');
    console.log('[Migrations] All core migrations completed successfully.');
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('[CRITICAL] Database Migration failed:', error.message);
    if (process.env.NODE_ENV === 'production') throw error;
  } finally {
    client.release();
  }
}

export async function initDb(mode: 'scratch' | 'additive' = 'additive', customPool?: any, customLedgerPool?: any) {
  if (!pool) return;
  const targetPool = customPool || pool;
  const targetLedgerPool = customLedgerPool || (ledgerPool || pool);

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
        fallback1_provider VARCHAR(100),
        fallback1_model VARCHAR(255),
        fallback2_provider VARCHAR(100),
        fallback2_model VARCHAR(255),
        fallback3_provider VARCHAR(100),
        fallback3_model VARCHAR(255),
        task_description TEXT,
        task_description_ar TEXT,
        is_active BOOLEAN DEFAULT true,
        cost_per_usage INTEGER DEFAULT 10,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fallback_1_provider VARCHAR(50),
        fallback_1_model VARCHAR(255),
        fallback_2_provider VARCHAR(50),
        fallback_2_model VARCHAR(255),
        fallback_3_provider VARCHAR(50),
        fallback_3_model VARCHAR(255)
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
        min_deposit_usd NUMERIC(10, 2) DEFAULT '5.00'
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
        user_id INTEGER UNIQUE,
        tool_id VARCHAR(50) NOT NULL UNIQUE,
        usage_count INTEGER DEFAULT 0,
        usage_date DATE DEFAULT CURRENT_DATE UNIQUE,
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
        keywords_en TEXT,
        keywords_ar TEXT,
        google_analytics_id VARCHAR(100),
        stripe_publishable_key TEXT,
        stripe_secret_key TEXT,
        stripe_webhook_secret TEXT,
        stripe_live_mode BOOLEAN DEFAULT false,
        stripe_status VARCHAR(50) DEFAULT 'pending',
        stripe_last_verified_at TIMESTAMP,
        points_per_dollar INTEGER DEFAULT 1000,
        min_payout_usd NUMERIC(10, 2) DEFAULT '10',
        min_deposit_usd NUMERIC(10, 2) DEFAULT '5',
        referral_bonus_percent INTEGER DEFAULT 10,
        welcome_bonus_points INTEGER DEFAULT 600,
        referral_bonus_points INTEGER DEFAULT 1000,
        conversion_rate NUMERIC(15, 6) DEFAULT '0.001',
        min_withdrawal_cents INTEGER DEFAULT 1000,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        referral_activation_min_deposit NUMERIC(10, 2) DEFAULT '10.00'
      )`
    },
    {
      name: 'system_broadcasts',
      query: `CREATE TABLE IF NOT EXISTS system_broadcasts (
        id SERIAL PRIMARY KEY,
        admin_id INTEGER REFERENCES users(id),
        broadcast_type VARCHAR(50) DEFAULT 'system',
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
      name: 'token_blacklist',
      query: `CREATE TABLE IF NOT EXISTS token_blacklist (
        id SERIAL PRIMARY KEY,
        token TEXT UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
    { pool: targetPool, query: `CREATE UNIQUE INDEX IF NOT EXISTS chats_pkey ON chats(id)` },
    { pool: targetPool, query: `CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats(user_id)` },
    { pool: targetPool, query: `CREATE UNIQUE INDEX IF NOT EXISTS coupons_code_key ON coupons(code)` },
    { pool: targetPool, query: `CREATE UNIQUE INDEX IF NOT EXISTS coupons_pkey ON coupons(id)` },
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
    { pool: targetPool, query: `CREATE UNIQUE INDEX IF NOT EXISTS stripe_events_pkey ON stripe_events(id)` },
    { pool: targetPool, query: `CREATE UNIQUE INDEX IF NOT EXISTS stripe_events_stripe_event_id_key ON stripe_events(stripe_event_id)` },
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
    { pool: targetLedgerPool, query: `ALTER TABLE ledger_transactions ADD CONSTRAINT ledger_transactions_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES wallets(id)` }
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

  await targetPool.query(`UPDATE plans SET is_active = true WHERE is_active IS NULL`);
  await targetPool.query(`UPDATE plans SET is_visible = true WHERE is_visible IS NULL`);

  const masterAdmin = process.env.ADMIN_EMAIL || process.env.VITE_ADMIN_EMAIL || '';
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
          ('Elite', 'النخبة', 'Full power for strategic expert users', 'القوة الكاملة للمستخدمين الخبراء الاستراتيجيين', 49.99, 499.90, 17, '["Full Sovereign Access", "Multi-model Orchestration", "Concierge Support"]', '#8b5cf6', false, 'Elite', '{"chat": "unlimited", "chat_fast": "unlimited", "chat_pro": "unlimited", "chat_reasoning": "unlimited", "perplexta_analysis": "unlimited", "image": "unlimited", "video": 50, "code": "unlimited", "legal_analysis": "unlimited", "storage_mb": 10240}')
        ON CONFLICT (name_en) DO NOTHING
      `);
    }

  const toolCheck = await targetPool.query('SELECT count(*) FROM tool_orchestrator');
  if (parseInt(toolCheck.rows[0].count) === 0) {
    await targetPool.query(`
      INSERT INTO tool_orchestrator (tool_id, primary_provider, primary_model, task_description, task_description_ar, cost_per_usage)
      VALUES
        ('chat', '', '', 'General purpose AI assistant', 'المساعد الذكي العام والقوي في المحادثة.', 10),
        ('chat_fast', '', '', 'High-speed technical chat', 'دردشة تقنية سريعة', 5),
        ('chat_pro', '', '', 'Advanced technical reasoning assistant', 'مساعد استنتاجي تقني متقدم', 25),
        ('chat_reasoning', '', '', 'Complex reasoning engine', 'محرك تفكير معقد', 50),
        ('perplexta_analysis', '', '', 'Deep digital analysis and technical search', 'البحث التقني والتحليل الرقمي العميق', 15),
        ('image', '', '', 'High-quality image generation', 'توليد صور بجودة عالية', 30),
        ('video', '', '', 'High-fidelity video generation', 'توليد فيديو عالي الدقة', 100),
        ('tts', '', '', 'Natural voice synthesis', 'توليد صوتي طبيعي', 10),
        ('stt', '', '', 'High-accuracy speech recognition', 'تحويل الكلام إلى نص عالي الدقة', 5),
        ('legal_analysis', '', '', 'Legal document analysis', 'تحليل الوثائق القانونية', 40),
        ('learning', '', '', 'Adaptive learning system', 'نظام تعلم متكيف', 20),
        ('code', '', '', 'Elite engineering workstation', 'بيئة هندسة برمجيات', 20),
        ('canvas', '', '', 'Multi-modal Studio and canvas', 'استوديو الإنتاج المتعدد واللوحة الذكية', 25),
        ('notebook', '', '', 'Research notebook assistant', 'دفتر أبحاث ذكي', 30),
        ('sovereign_memory', '', '', 'System intelligence memory', 'ذاكرة ذكاء النظام', 5),
        ('sovereign_search', '', '', 'Live web intelligence search', 'بحث ذكي حي على الويب', 10)
      ON CONFLICT (tool_id) DO NOTHING
    `);
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
import pkg from 'pg';
const { Pool } = pkg;
import bcrypt from 'bcryptjs';
import { pool, ledgerPool, initializeSovereignPools, createInternalPool } from './index.js';
import { encrypt, decrypt } from '../utils/crypto.js';

export async function runSystemMaintenance() {}

let io: any;
export function setIo(socketIo: any) {
  io = socketIo;
}

export async function ensureColumn(poolObj: any, tableName: string, columnName: string, type: string, defaultVal?: any) {
  try {
    const check = await poolObj.query(
      `SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
      [tableName, columnName]
    );
    if (check.rows.length === 0) {
      let query = `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${type}`;
      if (defaultVal !== undefined) query += ` DEFAULT ${defaultVal}`;
      await poolObj.query(query);
    }
  } catch (e: any) {
    console.error(`[Repair] Failed to ensure column ${columnName} in ${tableName}:`, e.message);
  }
}

export async function runDatabaseMigrations(type: 'scratch' | 'additive' = 'additive') {
  try {
    if (!pool) return;

    if (type === 'scratch') {
      await pool.query(`DROP TABLE IF EXISTS db_connections_registry CASCADE`);
    }

    try {
      const idCheck = await pool.query(
        `SELECT data_type FROM information_schema.columns WHERE table_name = 'db_connections_registry' AND column_name = 'id'`
      );
      if (idCheck.rows.length > 0 && idCheck.rows[0].data_type === 'integer') {
        await pool.query(`DROP TABLE IF EXISTS db_connections_registry CASCADE`);
      }
    } catch (e) {}

    await pool.query(`
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

    await initDb(type);

    await ensureColumn(pool, 'users', 'last_active_at', 'TIMESTAMP');
    await ensureColumn(pool, 'users', 'theme', 'VARCHAR(10)', `'dark'`);
    await ensureColumn(pool, 'users', 'updated_at', 'TIMESTAMP', 'CURRENT_TIMESTAMP');
    await ensureColumn(pool, 'users', 'referred_by', 'INTEGER');
    await ensureColumn(pool, 'users', 'kyc_submitted_at', 'TIMESTAMP');
    await ensureColumn(pool, 'users', 'kyc_rejection_reason', 'TEXT');
    await ensureColumn(pool, 'users', 'memory', 'TEXT');
    await ensureColumn(pool, 'users', 'support_notes', 'TEXT');
    await ensureColumn(pool, 'users', 'kyc_selfie', 'TEXT');
    await ensureColumn(pool, 'users', 'kyc_full_name', 'VARCHAR(255)');
    await ensureColumn(pool, 'users', 'password_hash', 'TEXT');
    await ensureColumn(pool, 'users', 'status', 'VARCHAR(20)', `'active'`);

    await ensureColumn(pool, 'chats', 'updated_at', 'TIMESTAMP', 'CURRENT_TIMESTAMP');
    await ensureColumn(pool, 'chats', 'context_summary', 'TEXT');

    await ensureColumn(pool, 'messages', 'thinking_steps', 'JSONB', `'[]'`);
    await ensureColumn(pool, 'messages', 'citations', 'JSONB', `'[]'`);
    await ensureColumn(pool, 'messages', 'follow_ups', 'JSONB', `'[]'`);
    await ensureColumn(pool, 'messages', 'feedback', 'SMALLINT', '0');

    await ensureColumn(pool, 'api_keys_vault', 'updated_at', 'TIMESTAMP', 'CURRENT_TIMESTAMP');
    await ensureColumn(pool, 'api_keys_vault', 'model_list', 'JSONB', `'[]'`);
    await ensureColumn(pool, 'api_keys_vault', 'last_reset_date', 'DATE', 'CURRENT_DATE');

    await ensureColumn(ledgerPool || pool, 'wallets', 'updated_at', 'TIMESTAMP', 'CURRENT_TIMESTAMP');
    await ensureColumn(ledgerPool || pool, 'wallets', 'usd_balance', 'DECIMAL(15,4)', '0.0000');

    await ensureColumn(pool, 'subscriptions', 'stripe_customer_id', 'VARCHAR(255)');
    await ensureColumn(pool, 'subscriptions', 'stripe_subscription_id', 'VARCHAR(255)');
    await ensureColumn(pool, 'subscriptions', 'billing_period', 'VARCHAR(20)', `'monthly'`);
    await ensureColumn(pool, 'subscriptions', 'last_period_start', 'TIMESTAMP', 'CURRENT_TIMESTAMP');

    await ensureColumn(pool, 'user_files', 'file_type', 'VARCHAR(100)');
    await ensureColumn(pool, 'user_files', 'file_size', 'INTEGER');
    await ensureColumn(pool, 'user_files', 'file_url', 'TEXT');
    await ensureColumn(pool, 'user_files', 'file_content', 'TEXT');

    await ensureColumn(pool, 'system_settings', 'seo_description', 'TEXT');
    await ensureColumn(pool, 'system_settings', 'keywords', 'TEXT');
    await ensureColumn(pool, 'system_settings', 'google_analytics_id', 'VARCHAR(255)');
    await ensureColumn(pool, 'system_settings', 'stripe_status', 'VARCHAR(20)', `'pending'`);
    await ensureColumn(pool, 'system_settings', 'stripe_last_verified_at', 'TIMESTAMP');
    await ensureColumn(pool, 'system_settings', 'stripe_secret_key', 'TEXT');
    await ensureColumn(pool, 'system_settings', 'stripe_publishable_key', 'TEXT');
    await ensureColumn(pool, 'system_settings', 'stripe_webhook_secret', 'TEXT');
    await ensureColumn(pool, 'system_settings', 'stripe_live_mode', 'BOOLEAN', 'false');
    await ensureColumn(pool, 'system_settings', 'seo_description_en', 'TEXT');
    await ensureColumn(pool, 'system_settings', 'seo_description_ar', 'TEXT');
    await ensureColumn(pool, 'system_settings', 'keywords_en', 'TEXT');
    await ensureColumn(pool, 'system_settings', 'keywords_ar', 'TEXT');
    await ensureColumn(pool, 'system_settings', 'logo_url', 'TEXT');
    await ensureColumn(pool, 'system_settings', 'favicon_url', 'TEXT');
    await ensureColumn(pool, 'system_settings', 'points_per_dollar', 'INTEGER', '100');
    await ensureColumn(pool, 'system_settings', 'min_payout_usd', 'DECIMAL(10,2)', '10.00');
    await ensureColumn(pool, 'system_settings', 'min_deposit_usd', 'DECIMAL(10,2)', '5.00');
    await ensureColumn(pool, 'system_settings', 'referral_bonus_percent', 'INTEGER', '10');
    await ensureColumn(pool, 'system_settings', 'welcome_bonus_points', 'INTEGER', '600');
    await ensureColumn(pool, 'system_settings', 'referral_bonus_points', 'INTEGER', '1000');
    await ensureColumn(pool, 'system_settings', 'min_withdrawal_cents', 'INTEGER', '2000');
    await ensureColumn(pool, 'system_settings', 'conversion_rate', 'DECIMAL(15,6)', '0.001');

    await ensureColumn(ledgerPool || pool, 'ledger_transactions', 'user_id', 'INTEGER');
    await ensureColumn(ledgerPool || pool, 'ledger_transactions', 'status', 'VARCHAR(20)', `'success'`);
    await ensureColumn(ledgerPool || pool, 'ledger_transactions', 'metadata', 'JSONB', `'{}'`);
    await ensureColumn(ledgerPool || pool, 'ledger_transactions', 'ip_address', 'VARCHAR(45)');

    await ensureColumn(pool, 'tool_orchestrator', 'fallback_1_provider', 'VARCHAR(50)');
    await ensureColumn(pool, 'tool_orchestrator', 'fallback_1_model', 'VARCHAR(255)');
    await ensureColumn(pool, 'tool_orchestrator', 'fallback_2_provider', 'VARCHAR(50)');
    await ensureColumn(pool, 'tool_orchestrator', 'fallback_2_model', 'VARCHAR(255)');
    await ensureColumn(pool, 'tool_orchestrator', 'fallback_3_provider', 'VARCHAR(50)');
    await ensureColumn(pool, 'tool_orchestrator', 'fallback_3_model', 'VARCHAR(255)');

    await ensureColumn(pool, 'system_broadcasts', 'admin_id', 'INTEGER');
    await ensureColumn(pool, 'system_broadcasts', 'broadcast_type', 'VARCHAR(50)', `'system'`);
    await ensureColumn(pool, 'system_broadcasts', 'type', 'VARCHAR(50)', `'system'`);
    await ensureColumn(pool, 'system_broadcasts', 'target_group', 'VARCHAR(50)', `'all'`);
    await ensureColumn(pool, 'system_broadcasts', 'target_role', 'VARCHAR(20)', `'all'`);
    await ensureColumn(pool, 'system_broadcasts', 'status', 'VARCHAR(20)', `'completed'`);
    await ensureColumn(pool, 'system_broadcasts', 'sent_count', 'INTEGER', '0');

    await ensureColumn(pool, 'system_logs', 'type', 'VARCHAR(50)', `'system'`);
    await ensureColumn(pool, 'system_logs', 'details', 'JSONB', `'{}'`);
    await ensureColumn(pool, 'security_alerts', 'type', 'VARCHAR(50)', `'security'`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS password_resets (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        token VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const coreUrl = process.env.DATABASE_URL;
    const ledgerUrl = process.env.LEDGER_DATABASE_URL;

    if (coreUrl) {
      try {
        const coreEncrypted = encrypt(coreUrl);
        await pool.query(
          `INSERT INTO db_connections_registry (id, provider, connection_string, is_active) VALUES ('core', 'core', $1, true) ON CONFLICT (id) DO NOTHING`,
          [coreEncrypted]
        );
      } catch (e) {}
    }

    if (ledgerUrl) {
      try {
        const ledgerEncrypted = encrypt(ledgerUrl);
        await pool.query(
          `INSERT INTO db_connections_registry (id, provider, connection_string, is_active) VALUES ('ledger', 'ledger', $1, true) ON CONFLICT (id) DO NOTHING`,
          [ledgerEncrypted]
        );
      } catch (e) {}
    }
  } catch (error: any) {
    console.error('[CRITICAL] Database Migration failed:', error.message);
    if (process.env.NODE_ENV === 'production') throw error;
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
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255),
        avatar TEXT,
        provider TEXT DEFAULT 'local',
        role VARCHAR(20) DEFAULT 'user',
        theme VARCHAR(10) DEFAULT 'dark',
        kyc_status VARCHAR(20) DEFAULT 'none',
        kyc_required BOOLEAN DEFAULT false,
        kyc_selfie TEXT,
        kyc_full_name VARCHAR(255),
        kyc_rejection_reason TEXT,
        kyc_submitted_at TIMESTAMP,
        custom_instructions TEXT,
        memory TEXT,
        support_notes TEXT,
        password_hash TEXT,
        language VARCHAR(5) DEFAULT 'ar',
        status VARCHAR(20) DEFAULT 'active',
        last_active_at TIMESTAMP,
        referred_by INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: 'chats',
      query: `CREATE TABLE IF NOT EXISTS chats (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        context_summary TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: 'messages',
      query: `CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        chat_id INTEGER REFERENCES chats(id) ON DELETE CASCADE,
        role VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        tool VARCHAR(50),
        feedback SMALLINT DEFAULT 0,
        is_pinned BOOLEAN DEFAULT FALSE,
        thinking_steps JSONB DEFAULT '[]',
        citations JSONB DEFAULT '[]',
        follow_ups JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: 'api_keys_vault',
      query: `CREATE TABLE IF NOT EXISTS api_keys_vault (
        id SERIAL PRIMARY KEY,
        provider VARCHAR(50) UNIQUE NOT NULL,
        encrypted_key TEXT NOT NULL,
        daily_budget DECIMAL(10,4) DEFAULT 0,
        used_today DECIMAL(10,4) DEFAULT 0,
        last_reset_date DATE DEFAULT CURRENT_DATE,
        models JSONB DEFAULT '[]',
        model_list JSONB DEFAULT '[]',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: 'tool_orchestrator',
      query: `CREATE TABLE IF NOT EXISTS tool_orchestrator (
        id SERIAL PRIMARY KEY,
        tool_id VARCHAR(50) UNIQUE NOT NULL,
        primary_provider VARCHAR(50),
        primary_model VARCHAR(255),
        fallback_1_provider VARCHAR(50),
        fallback_1_model VARCHAR(255),
        fallback_2_provider VARCHAR(50),
        fallback_2_model VARCHAR(255),
        fallback_3_provider VARCHAR(50),
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
        user_id INTEGER UNIQUE NOT NULL,
        balance DECIMAL(15,4) DEFAULT 0.0000,
        usd_balance DECIMAL(15,4) DEFAULT 0.0000,
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
        user_id INTEGER,
        wallet_id INTEGER REFERENCES wallets(id),
        amount DECIMAL(15,4) NOT NULL,
        transaction_type VARCHAR(50) NOT NULL,
        status VARCHAR(20) DEFAULT 'success',
        description TEXT,
        reference_id VARCHAR(255),
        metadata JSONB DEFAULT '{}',
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: 'kyc_requests',
      pool: targetLedgerPool,
      query: `CREATE TABLE IF NOT EXISTS kyc_requests (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE,
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
        user_id INTEGER,
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
      name: 'coupons',
      query: `CREATE TABLE IF NOT EXISTS coupons (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        type VARCHAR(20) DEFAULT 'percentage',
        value DECIMAL(10,2) NOT NULL,
        min_purchase DECIMAL(10,2) DEFAULT 0,
        max_discount DECIMAL(10,2),
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
        name_en VARCHAR(100) UNIQUE NOT NULL,
        name_ar VARCHAR(100) NOT NULL,
        desc_en TEXT,
        desc_ar TEXT,
        badge VARCHAR(50) DEFAULT 'none',
        monthly_price DECIMAL(10,2) DEFAULT 0.00,
        annual_price DECIMAL(10,2) DEFAULT 0.00,
        discount INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        is_visible BOOLEAN DEFAULT true,
        is_popular BOOLEAN DEFAULT false,
        color VARCHAR(20) DEFAULT '#10b981',
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
        UNIQUE(user_id, tool_id, usage_date)
      )`
    },
    {
      name: 'notifications',
      query: `CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        title_en VARCHAR(255),
        title_ar VARCHAR(255),
        message_en TEXT,
        message_ar TEXT,
        type VARCHAR(50) DEFAULT 'system',
        is_read BOOLEAN DEFAULT FALSE,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
        template_id INTEGER REFERENCES email_templates(id),
        target_criteria JSONB,
        total_recipients INTEGER DEFAULT 0,
        success_count INTEGER DEFAULT 0,
        fail_count INTEGER DEFAULT 0,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP
      )`
    },
    {
      name: 'ai_logs',
      query: `CREATE TABLE IF NOT EXISTS ai_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        tool_id VARCHAR(50),
        provider VARCHAR(50),
        model VARCHAR(255),
        prompt_tokens INTEGER DEFAULT 0,
        completion_tokens INTEGER DEFAULT 0,
        cost DECIMAL(15,6) DEFAULT 0,
        status VARCHAR(20) DEFAULT 'success',
        prompt TEXT,
        response TEXT,
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: 'stripe_events',
      query: `CREATE TABLE IF NOT EXISTS stripe_events (
        id SERIAL PRIMARY KEY,
        stripe_event_id VARCHAR(255) UNIQUE,
        type VARCHAR(100),
        status VARCHAR(20) DEFAULT 'processed',
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: 'task_logs',
      query: `CREATE TABLE IF NOT EXISTS task_logs (
        id SERIAL PRIMARY KEY,
        task_id VARCHAR(50) NOT NULL,
        status VARCHAR(20) NOT NULL,
        message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
        site_name_en VARCHAR(255) DEFAULT 'PERPLEXTA',
        site_name_ar VARCHAR(255) DEFAULT 'بيربليكستا',
        site_description_en TEXT DEFAULT 'The Professional Elite Real-time Platform for Logic Extraction & X-Platform Technical Analysis.',
        site_description_ar TEXT DEFAULT 'المنصة الاحترافية النخبوية لاستخراج المنطق والتحليل التقني عبر المنصات في الوقت الفعلي.',
        logo_url TEXT,
        favicon_url TEXT,
        seo_description TEXT,
        seo_description_en TEXT,
        seo_description_ar TEXT,
        keywords TEXT,
        keywords_en TEXT,
        keywords_ar TEXT,
        google_analytics_id VARCHAR(255),
        stripe_status VARCHAR(20) DEFAULT 'pending',
        stripe_last_verified_at TIMESTAMP,
        stripe_secret_key TEXT,
        stripe_publishable_key TEXT,
        stripe_webhook_secret TEXT,
        stripe_live_mode BOOLEAN DEFAULT false,
        points_per_dollar INTEGER DEFAULT 100,
        min_payout_usd DECIMAL(10,2) DEFAULT 10.00,
        min_deposit_usd DECIMAL(10,2) DEFAULT 5.00,
        referral_bonus_percent INTEGER DEFAULT 10,
        welcome_bonus_points INTEGER DEFAULT 600,
        referral_bonus_points INTEGER DEFAULT 1000,
        min_withdrawal_cents INTEGER DEFAULT 2000,
        conversion_rate DECIMAL(15,6) DEFAULT 0.001,
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
        alert_type VARCHAR(50),
        type VARCHAR(50) DEFAULT 'security',
        severity VARCHAR(20),
        description TEXT,
        metadata JSONB DEFAULT '{}',
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: 'system_logs',
      query: `CREATE TABLE IF NOT EXISTS system_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        action VARCHAR(100),
        type VARCHAR(50) DEFAULT 'system',
        description TEXT,
        details JSONB DEFAULT '{}',
        metadata JSONB DEFAULT '{}',
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    }
  ];

  for (const table of schema) {
    const p = (table as any).pool || targetPool;
    await p.query(table.query).catch((e: any) => console.error(`[InitDB] Error in table ${table.name}:`, e.message));
  }

  const indexes = [
    { pool: targetPool, query: `CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats(user_id)` },
    { pool: targetPool, query: `CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id)` },
    { pool: targetPool, query: `CREATE INDEX IF NOT EXISTS idx_ai_logs_user_id ON ai_logs(user_id)` },
    { pool: targetPool, query: `CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)` },
    { pool: targetPool, query: `CREATE INDEX IF NOT EXISTS idx_security_alerts_user_id ON security_alerts(user_id)` },
    { pool: targetPool, query: `CREATE INDEX IF NOT EXISTS idx_system_logs_user_id ON system_logs(user_id)` },
    { pool: targetPool, query: `CREATE INDEX IF NOT EXISTS idx_activity_user_id ON user_activity_logs(user_id)` },
    { pool: targetPool, query: `CREATE INDEX IF NOT EXISTS idx_activity_created_at ON user_activity_logs(created_at)` },
    { pool: targetLedgerPool, query: `CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id)` },
    { pool: targetLedgerPool, query: `CREATE INDEX IF NOT EXISTS idx_ledger_user_id ON ledger_transactions(user_id)` },
    { pool: targetLedgerPool, query: `CREATE INDEX IF NOT EXISTS idx_ledger_wallet_id ON ledger_transactions(wallet_id)` },
    { pool: targetLedgerPool, query: `CREATE INDEX IF NOT EXISTS idx_ledger_type ON ledger_transactions(transaction_type)` },
    { pool: targetLedgerPool, query: `CREATE INDEX IF NOT EXISTS idx_ledger_status ON ledger_transactions(status)` },
    { pool: targetLedgerPool, query: `CREATE INDEX IF NOT EXISTS idx_ledger_reference ON ledger_transactions(reference_id)` }
  ];

  for (const idx of indexes) {
    await idx.pool.query(idx.query).catch((e: any) => console.error(`[InitDB] Index error:`, e.message));
  }

  const settingsCheck = await targetPool.query('SELECT count(*) FROM system_settings');
  if (parseInt(settingsCheck.rows[0].count) === 0) {
    await targetPool.query(
      `INSERT INTO system_settings (site_name_en, site_name_ar) VALUES ($1, $2)`,
      ['PERPLEXTA', 'بيربليكستا']
    );
  }

  await targetPool.query(`UPDATE plans SET is_active = true WHERE is_active IS NULL`);
  await targetPool.query(`UPDATE plans SET is_visible = true WHERE is_visible IS NULL`);

  const masterAdmin = process.env.ADMIN_EMAIL || process.env.VITE_ADMIN_EMAIL || '';
  const adminEmails = [...new Set([masterAdmin, 'qoomre@gmail.com'].filter(Boolean))];

  for (const email of adminEmails) {
    const adminCheck = await targetPool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (adminCheck.rows.length === 0) {
      const adminPassword = process.env.ADMIN_PASSWORD;
      if (!adminPassword) {
        console.error('[CRITICAL] ADMIN_PASSWORD not set. Skipping admin seed for:', email);
        continue;
      }
      const adminHash = await bcrypt.hash(adminPassword, 10);
      const newAdmin = await targetPool.query(
        `INSERT INTO users (email, name, password_hash, role, status) VALUES ($1, $2, $3, 'admin', 'active') RETURNING id`,
        [email, email === 'qoomre@gmail.com' ? 'Sovereign Owner' : 'Master Admin', adminHash]
      );
      const adminId = newAdmin.rows[0].id;
      await targetLedgerPool.query(
        `INSERT INTO wallets (user_id, balance) VALUES ($1, 10000) ON CONFLICT (user_id) DO NOTHING`,
        [adminId]
      );
    } else {
      await targetPool.query(`UPDATE users SET role = 'admin' WHERE email = $1`, [email]);
    }
  }

  const planCheck = await targetPool.query('SELECT count(*) FROM plans');
  if (parseInt(planCheck.rows[0].count) === 0) {
    await targetPool.query(`
      INSERT INTO plans (name_en, name_ar, desc_en, desc_ar, monthly_price, annual_price, discount, features, color, is_popular, badge, limits)
      VALUES
        ('Starter', 'البداية', 'Free starter plan', 'خطة البداية المجانية', 0, 0, 0, '["Basic Search", "Limited AI Chats"]', '#10b981', false, 'Standard', '{"chat": 10, "chat_fast": 20, "image": 2}'),
        ('Pro', 'المحترف', 'Professional plan for advanced users', 'خطة المحترفين للمستخدمين المتقدمين', 19.99, 199.90, 17, '["Advanced Analysis", "Unlimited Chats", "Priority Support"]', '#3b82f6', true, 'Best Value', '{"chat": "unlimited", "chat_pro": 50, "image": 20, "code": 50}'),
        ('Elite', 'النخبة', 'Full power for strategic expert users', 'القوة الكاملة للمستخدمين الخبراء الاستراتيجيين', 49.99, 499.90, 17, '["Full Sovereign Access", "Multi-model Orchestration", "Concierge Support"]', '#8b5cf6', false, 'Elite', '{"chat": "unlimited", "chat_pro": "unlimited", "image": "unlimited", "legal_analysis": "unlimited", "code": "unlimited"}')
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

export async function monitorDatabases() {
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
  } catch (err) {}
}

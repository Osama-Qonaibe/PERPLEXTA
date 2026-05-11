import pkg from 'pg';
const { Pool } = pkg;
import bcrypt from "bcryptjs";
import { pool, ledgerPool, initializeSovereignPools, createInternalPool } from "./index.js";
import { encrypt, decrypt } from "../utils/crypto.js";

export async function runSystemMaintenance() {
  console.log('[SystemMaintenance] Starting Sovereign cleanup...');
  // Add logic if needed
}

// We'll need a way to access 'io' for notifications in monitorDatabases
// For now we might need to pass it or have a getter
let io: any;
export function setIo(socketIo: any) {
  io = socketIo;
}

export async function ensureColumn(poolObj: any, tableName: string, columnName: string, type: string, defaultVal?: any) {
  try {
    const check = await poolObj.query(`
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = $1 AND column_name = $2
    `, [tableName, columnName]);
    
    if (check.rows.length === 0) {
      console.log(`[Repair] Adding missing column ${columnName} to ${tableName}...`);
      let query = `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${type}`;
      if (defaultVal !== undefined) {
        query += ` DEFAULT ${defaultVal}`;
      }
      await poolObj.query(query);
    }
  } catch (e: any) {
    console.error(`[Repair] Failed to ensure column ${columnName} in ${tableName}:`, e.message);
  }
}

export async function runDatabaseMigrations() {
  try {
    if (!pool) {
      return;
    }

    try {
      const idCheck = await pool.query(`
        SELECT data_type FROM information_schema.columns 
        WHERE table_name = 'db_connections_registry' AND column_name = 'id'
      `);
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
      );
    `);

    await initDb('additive');

    // Sovereign: Defensive column enforcement for existing tables
    await ensureColumn(pool, 'users', 'last_active_at', 'TIMESTAMP');
    await ensureColumn(pool, 'users', 'theme', 'VARCHAR(10)', "'dark'");
    await ensureColumn(pool, 'system_broadcasts', 'status', 'VARCHAR(20)', "'completed'");
    await ensureColumn(pool, 'system_broadcasts', 'type', 'VARCHAR(50)', "'system'");
    await ensureColumn(pool, 'system_broadcasts', 'target_role', 'VARCHAR(20)', "'all'");
    await ensureColumn(pool, 'system_broadcasts', 'target_group', 'VARCHAR(20)', "'all'");
    await ensureColumn(pool, 'system_broadcasts', 'sent_count', 'INTEGER', '0');
    
    // Financial settings extension
    await ensureColumn(pool, 'system_settings', 'points_per_dollar', 'INTEGER', '100');
    await ensureColumn(pool, 'system_settings', 'min_payout_usd', 'DECIMAL(10, 2)', '10.00');
    await ensureColumn(pool, 'system_settings', 'min_deposit_usd', 'DECIMAL(10, 2)', '5.00');
    await ensureColumn(pool, 'system_settings', 'referral_bonus_percent', 'INTEGER', '10');
    await ensureColumn(pool, 'system_settings', 'welcome_bonus_points', 'INTEGER', '600');
    await ensureColumn(pool, 'system_settings', 'referral_bonus_points', 'INTEGER', '1000');
    await ensureColumn(pool, 'system_settings', 'min_withdrawal_cents', 'INTEGER', '2000');
    await ensureColumn(pool, 'system_settings', 'conversion_rate', 'DECIMAL(15, 6)', '0.001');
    
    // SEO & Branding extension
    await ensureColumn(pool, 'system_settings', 'seo_description_en', 'TEXT');
    await ensureColumn(pool, 'system_settings', 'seo_description_ar', 'TEXT');
    await ensureColumn(pool, 'system_settings', 'keywords_en', 'TEXT');
    await ensureColumn(pool, 'system_settings', 'keywords_ar', 'TEXT');
    await ensureColumn(pool, 'system_settings', 'google_analytics_id', 'VARCHAR(255)');
    await ensureColumn(pool, 'system_settings', 'logo_url', 'TEXT');
    await ensureColumn(pool, 'system_settings', 'favicon_url', 'TEXT');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS password_resets (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        token VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const coreUrl = process.env.DATABASE_URL;
    const ledgerUrl = process.env.LEDGER_DATABASE_URL;

    if (coreUrl) {
      try {
        const coreEncrypted = encrypt(coreUrl);
        await pool.query(`
          INSERT INTO db_connections_registry (id, provider, connection_string, is_active)
          VALUES ('core', 'core', $1, true)
          ON CONFLICT (id) DO NOTHING
        `, [coreEncrypted]);
      } catch (e) {}
    }

    if (ledgerUrl) {
      try {
        const ledgerEncrypted = encrypt(ledgerUrl);
        await pool.query(`
          INSERT INTO db_connections_registry (id, provider, connection_string, is_active)
          VALUES ('ledger', 'ledger', $1, true)
          ON CONFLICT (id) DO NOTHING
        `, [ledgerEncrypted]);
      } catch (e) {}
    }
  } catch (error: any) {
    console.error(' [CRITICAL ERROR] 🚨 Sovereign Database Migration failed!');
    if (process.env.NODE_ENV === 'production') throw error;
  }
}

export async function initDb(mode: 'scratch' | 'additive' = 'additive', customPool?: any, customLedgerPool?: any) {
  if (!pool) return;
  const targetPool = customPool || pool;
  const targetLedgerPool = customLedgerPool || (ledgerPool || pool);

  const schema = [
    { name: 'users', query: `CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, email VARCHAR(255) UNIQUE NOT NULL, name VARCHAR(255), avatar TEXT, provider TEXT DEFAULT 'local', role VARCHAR(20) DEFAULT 'user', theme VARCHAR(10) DEFAULT 'dark', kyc_status VARCHAR(20) DEFAULT 'none', kyc_required BOOLEAN DEFAULT false, kyc_selfie TEXT, kyc_full_name VARCHAR(255), kyc_rejection_reason TEXT, custom_instructions TEXT, memory TEXT, password_hash TEXT, language VARCHAR(5) DEFAULT 'ar', status VARCHAR(20) DEFAULT 'active', last_active_at TIMESTAMP, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)` },
    { name: 'chats', query: `CREATE TABLE IF NOT EXISTS chats (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, title VARCHAR(255) NOT NULL, context_summary TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)` },
    { name: 'messages', query: `CREATE TABLE IF NOT EXISTS messages (id SERIAL PRIMARY KEY, chat_id INTEGER REFERENCES chats(id) ON DELETE CASCADE, role VARCHAR(50) NOT NULL, content TEXT NOT NULL, tool VARCHAR(50), feedback SMALLINT DEFAULT 0, is_pinned BOOLEAN DEFAULT FALSE, thinking_steps JSONB DEFAULT '[]', citations JSONB DEFAULT '[]', follow_ups JSONB DEFAULT '[]', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)` },
    { name: 'api_keys_vault', query: `CREATE TABLE IF NOT EXISTS api_keys_vault (id SERIAL PRIMARY KEY, provider VARCHAR(50) UNIQUE NOT NULL, encrypted_key TEXT NOT NULL, daily_budget DECIMAL(10, 4) DEFAULT 0, used_today DECIMAL(10, 4) DEFAULT 0, last_reset_date DATE DEFAULT CURRENT_DATE, models JSONB DEFAULT '[]', model_list JSONB DEFAULT '[]', is_active BOOLEAN DEFAULT true, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)` },
    { name: 'tool_orchestrator', query: `CREATE TABLE IF NOT EXISTS tool_orchestrator (id SERIAL PRIMARY KEY, tool_id VARCHAR(50) UNIQUE NOT NULL, primary_provider VARCHAR(50), primary_model VARCHAR(255), fallback1_provider VARCHAR(50), fallback1_model VARCHAR(255), fallback2_provider VARCHAR(50), fallback2_model VARCHAR(255), fallback3_provider VARCHAR(50), fallback3_model VARCHAR(255), task_description TEXT, task_description_ar TEXT, is_active BOOLEAN DEFAULT true, cost_per_usage INTEGER DEFAULT 10, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)` },
    { name: 'wallets', pool: targetLedgerPool, query: `CREATE TABLE IF NOT EXISTS wallets (id SERIAL PRIMARY KEY, user_id INTEGER UNIQUE NOT NULL, balance DECIMAL(15, 4) DEFAULT 0.0000, usd_balance DECIMAL(15, 4) DEFAULT 0.0000, points INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)` },
    { name: 'ledger_transactions', pool: targetLedgerPool, query: `CREATE TABLE IF NOT EXISTS ledger_transactions (id SERIAL PRIMARY KEY, wallet_id INTEGER REFERENCES wallets(id), amount DECIMAL(15, 4) NOT NULL, transaction_type VARCHAR(50) NOT NULL, status VARCHAR(20) DEFAULT 'success', description TEXT, reference_id VARCHAR(255), metadata JSONB DEFAULT '{}', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)` },
    { name: 'plans', query: `CREATE TABLE IF NOT EXISTS plans (id SERIAL PRIMARY KEY, name_en VARCHAR(100) UNIQUE NOT NULL, name_ar VARCHAR(100) NOT NULL, desc_en TEXT, desc_ar TEXT, badge VARCHAR(50) DEFAULT 'none', monthly_price DECIMAL(10, 2) DEFAULT 0.00, annual_price DECIMAL(10, 2) DEFAULT 0.00, discount INTEGER DEFAULT 0, is_active BOOLEAN DEFAULT true, is_visible BOOLEAN DEFAULT true, is_popular BOOLEAN DEFAULT false, color VARCHAR(20) DEFAULT '#10b981', features JSONB DEFAULT '[]', limits JSONB DEFAULT '{}', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)` },
    { name: 'subscriptions', query: `CREATE TABLE IF NOT EXISTS subscriptions (id SERIAL PRIMARY KEY, user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE, plan_id INTEGER REFERENCES plans(id), status VARCHAR(50) DEFAULT 'active', billing_period VARCHAR(20) DEFAULT 'monthly', current_period_end TIMESTAMP, last_period_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)` },
    { name: 'user_usage', query: `CREATE TABLE IF NOT EXISTS user_usage (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL, tool_id VARCHAR(50) NOT NULL, usage_count INTEGER DEFAULT 0, usage_date DATE DEFAULT CURRENT_DATE, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE(user_id, tool_id, usage_date))` },
    { name: 'notifications', query: `CREATE TABLE IF NOT EXISTS notifications (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL, title_en VARCHAR(255), title_ar VARCHAR(255), message_en TEXT, message_ar TEXT, type VARCHAR(50) DEFAULT 'system', is_read BOOLEAN DEFAULT FALSE, metadata JSONB DEFAULT '{}', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)` },
    { name: 'system_settings', query: `CREATE TABLE IF NOT EXISTS system_settings (
        id SERIAL PRIMARY KEY, 
        site_name_en VARCHAR(255) DEFAULT 'Sovereign', 
        site_name_ar VARCHAR(255) DEFAULT 'سوفيرن', 
        site_description_en TEXT, 
        site_description_ar TEXT, 
        seo_description_en TEXT,
        seo_description_ar TEXT,
        keywords_en TEXT,
        keywords_ar TEXT,
        google_analytics_id VARCHAR(255),
        logo_url TEXT,
        favicon_url TEXT,
        stripe_secret_key TEXT, 
        stripe_webhook_secret TEXT, 
        points_per_dollar INTEGER DEFAULT 100,
        min_payout_usd DECIMAL(10, 2) DEFAULT 10.00,
        min_deposit_usd DECIMAL(10, 2) DEFAULT 5.00,
        referral_bonus_percent INTEGER DEFAULT 10,
        welcome_bonus_points INTEGER DEFAULT 600,
        referral_bonus_points INTEGER DEFAULT 1000,
        min_withdrawal_cents INTEGER DEFAULT 2000,
        conversion_rate DECIMAL(15, 6) DEFAULT 0.001,
        contact_email VARCHAR(255), 
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )` },
    { name: 'system_broadcasts', query: `CREATE TABLE IF NOT EXISTS system_broadcasts (id SERIAL PRIMARY KEY, title_en VARCHAR(255), title_ar VARCHAR(255), content_en TEXT, content_ar TEXT, type VARCHAR(50) DEFAULT 'system', status VARCHAR(20) DEFAULT 'pending', target_role VARCHAR(20) DEFAULT 'all', target_group VARCHAR(20) DEFAULT 'all', sent_count INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)` },
    { name: 'user_files', query: `CREATE TABLE IF NOT EXISTS user_files (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, file_name VARCHAR(255) NOT NULL, file_url TEXT NOT NULL, file_size BIGINT, mime_type VARCHAR(100), file_type VARCHAR(50), metadata JSONB DEFAULT '{}', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)` },
    { name: 'security_alerts', query: `CREATE TABLE IF NOT EXISTS security_alerts (id SERIAL PRIMARY KEY, user_id INTEGER, alert_type VARCHAR(50), severity VARCHAR(20), description TEXT, metadata JSONB DEFAULT '{}', ip_address VARCHAR(45), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)` },
    { name: 'system_logs', query: `CREATE TABLE IF NOT EXISTS system_logs (id SERIAL PRIMARY KEY, user_id INTEGER, action VARCHAR(100), description TEXT, metadata JSONB DEFAULT '{}', ip_address VARCHAR(45), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)` }
  ];

  for (const table of schema) {
    const p = (table as any).pool || targetPool;
    await p.query(table.query).catch((e: any) => console.error(`[InitDB] Error in table ${table.name}:`, e.message));
  }

  // Ensure system_settings has one row
  const settingsCheck = await targetPool.query('SELECT count(*) FROM system_settings');
  if (parseInt(settingsCheck.rows[0].count) === 0) {
    await targetPool.query('INSERT INTO system_settings (site_name_en, site_name_ar) VALUES ($1, $2)', ['Sovereign', 'سوفيرن']);
  }

  // Seeding
  const masterAdmin = process.env.ADMIN_EMAIL || process.env.VITE_ADMIN_EMAIL || 'admin@example.com';
  const adminEmails = [masterAdmin, 'qoomre@gmail.com'];
  for (const email of adminEmails) {
    const adminCheck = await targetPool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (adminCheck.rows.length === 0) {
      const adminHash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Admin@Secure2026', 10);
      const newAdmin = await targetPool.query("INSERT INTO users (email, name, password_hash, role, status) VALUES ($1, $2, $3, 'admin', 'active') RETURNING id", [email, email === 'qoomre@gmail.com' ? 'Sovereign Owner' : 'Master Admin', adminHash]);
      const adminId = newAdmin.rows[0].id;
      await targetLedgerPool.query("INSERT INTO wallets (user_id, balance) VALUES ($1, 10000) ON CONFLICT (user_id) DO NOTHING", [adminId]);
    } else {
      // Ensure existing specified email is also admin
      await targetPool.query("UPDATE users SET role = 'admin' WHERE email = $1", [email]);
    }
  }

  // Seed plans if none exist
  const planCheck = await targetPool.query('SELECT count(*) FROM plans');
  if (parseInt(planCheck.rows[0].count) === 0) {
    console.log('[InitDB] Seeding original subscription plans...');
    await targetPool.query(`
      INSERT INTO plans (name_en, name_ar, monthly_price, annual_price, discount, features, color, is_popular)
      VALUES 
      ('Starter', 'البداية', 0, 0, 0, '["Basic Search", "Limited AI Chats"]', '#10b981', false),
      ('Pro', 'المحترف', 19.99, 199.90, 17, '["Advanced Analysis", "Unlimited Chats", "Priority Support"]', '#3b82f6', true),
      ('Elite', 'النخبة', 49.99, 499.90, 17, '["Full Sovereign Access", "Multi-model Orchestration", "Concierge Support"]', '#8b5cf6', false)
      ON CONFLICT (name_en) DO NOTHING
    `);
  }

  // Seed orchestrator tools if none exist
  const toolCheck = await targetPool.query('SELECT count(*) FROM tool_orchestrator');
  if (parseInt(toolCheck.rows[0].count) === 0) {
    console.log('[InitDB] Seeding Sovereign Orchestrator tools...');
    await targetPool.query(`
      INSERT INTO tool_orchestrator (tool_id, primary_provider, primary_model, task_description, task_description_ar, cost_per_usage)
      VALUES 
      ('chat_fast', 'google', 'gemini-1.5-flash', 'Fast assistant for quick queries', 'مساعد سريع للاستفسارات العاجلة', 1),
      ('chat_pro', 'google', 'gemini-1.5-pro', 'Advanced technical reasoning assistant', 'مساعد استنتاجي تقني متقدم', 5),
      ('perplexta_analysis', 'google', 'gemini-1.5-pro', 'Deep digital analysis and technical search', 'البحث التقني والتحليل الرقمي العميق', 10),
      ('image', 'google', 'imagen-3', 'High-quality 8K image generation', 'توليد صور بجودة 8K السيادية', 20)
      ON CONFLICT (tool_id) DO NOTHING
    `);
  }
}

export async function monitorDatabases() {
  try {
    const registries = await pool.query('SELECT * FROM db_connections_registry');
    for (const reg of registries.rows) {
      let isAlive = false;
      let connectionString = reg.connection_string ? decrypt(reg.connection_string) : '';
      
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
      
      await pool.query('UPDATE db_connections_registry SET status = $1, last_checked_at = CURRENT_TIMESTAMP WHERE id = $2', [isAlive ? 'healthy' : 'down', reg.id]);
      if (!isAlive && io) io.emit('db_alert', { provider: reg.provider, status: 'down' });
    }
  } catch (err) {}
}

import { pool, ledgerPool, externalPool, securityPool, createInternalPool, synchronizePerplextaPoolsFromRegistry, getPoolMetrics } from '../db/index.js';
import { decrypt, encrypt } from '../utils/crypto.js';
import { runDatabaseMigrations } from '../db/migrations.js';
import { tools } from '../config/constants.js';
import os from 'os';

export const CORE_TABLES = [
  'system_settings',
  'plans',
  'api_keys_vault',
  'tool_orchestrator',
  'google_tool_connections',
  'email_templates',
  'email_settings',
  'gift_catalog',
  'route_seo_settings',
  'asset_metadata',
  'system_broadcasts',
  'system_logs',
  'user_activity_logs',
  'advertisements',
  'users',
  'user_sessions',
  'password_resets',
  'oauth_states',
  'subscriptions',
  'user_usage',
  'user_shortcuts',
  'user_files',
  'notifications',
  'chats',
  'messages',
  'chat_memories',
  'message_reports',
  'support_tickets',
  'support_ticket_replies',
  'marketplace_items',
  'marketplace_purchases',
  'marketplace_reviews',
  'video_resources',
  'referral_invitations',
  'shared_snapshots',
  'bulletin_pages',
  'bulletin_page_followers',
  'bulletin_page_inquiries',
  'bulletin_ads',
  'bulletin_saved_ads',
  'bulletin_reports',
  'bulletin_ad_likes',
  'bulletin_ad_comments',
  'bulletin_ad_messages',
  'user_recommendation_interactions',
  'user_recommendation_preferences',
  'recommendation_feedback',
  'media_assets',
  'model_cost_audit_logs',
  'admin_approval_queue',
  'ad_pricing_audit',
  'ad_stats',
  'route_seo_metadata',
  'db_connections_registry'
];

export const LEDGER_TABLES = [
  'economy_settings',
  'coupons',
  'wallets',
  'ledger_transactions',
  'referrals',
  'referral_tree',
  'kyc_requests',
  'withdrawal_requests',
  'payout_accounts',
  'coupon_usages',
  'deposit_requests',
  'stripe_events'
];

export const EXTERNAL_TABLES = [
  'blog_articles',
  'blog_comments',
  'blog_ratings'
];

export const SECURITY_TABLES = [
  'token_blacklist',
  'security_alerts',
  'admin_audit_logs',
  'registered_agents'
];

export async function getDatabaseRegistry() {
  try {
    await pool.query("DELETE FROM db_connections_registry WHERE id NOT IN ('core', 'ledger', 'external', 'security')");
    await pool.query("UPDATE db_connections_registry SET host = NULL WHERE host = 'base'");
  } catch (err) {
    console.warn(err);
  }
  const result = await pool.query("SELECT id, provider, type, host, port, db_name, username, ssl_mode, pool_size, is_active, status, updated_at FROM db_connections_registry WHERE id IN ('core', 'ledger', 'external', 'security') ORDER BY id ASC");
  return result.rows;
}

export function formatDbErrorMessage(err: any): string {
  const msg = err?.message || String(err || 'Unknown error');
  if (/ECONNREFUSED/i.test(msg)) {
    return `فشل الاتصال: خادم PostgreSQL غير متاح على العنوان والمنفذ المحددين (Connection refused). إذا كان الخادم على جهازك المحلي خارج بيئة الحاوية، استخدم عنوان IP الخارجي أو نفق محلي (Tunnel) أو رابط سحابي. (${msg})`;
  }
  if (/ENOTFOUND/i.test(msg)) {
    return `لم يتم العثور على اسم المضيف (Host not found). يرجى التأكد من كتابة اسم الخادم أو عنوان IP بشكل صحيح. (${msg})`;
  }
  if (/password authentication failed/i.test(msg)) {
    return `فشل التحقق من الهوية: كلمة المرور أو اسم المستخدم غير صحيح (Authentication failed).`;
  }
  if (/database .* does not exist/i.test(msg)) {
    return `قاعدة البيانات المحددة غير موجودة على الخادم. يرجى إنشاؤها أولاً أو التأكد من اسمها. (${msg})`;
  }
  if (/ETIMEDOUT|timeout/i.test(msg)) {
    return `انتهت مهلة الاتصال بالخادم (Connection timed out). تحقق من إعدادات الجدار الناري (Firewall) وإمكانية الوصول إلى المنفذ.`;
  }
  return msg;
}

export async function saveDatabaseConfig(config: any) {
  const body = config.config || config;
  const { id, type, is_active, activate } = config;
  const targetId = id || body.id;

  if (!['core', 'ledger', 'external', 'security'].includes(targetId)) {
    throw new Error('Unauthorized database target ID');
  }

  const dbType = type || body.type || 'local';
  let db_name = (body.db_name || body.dbName || '').trim();
  let connection_string = (body.connection_string || body.connectionString || '').trim();
  const ssl_mode = body.ssl_mode || body.sslMode || 'disable';
  const pool_size = Number(body.pool_size || body.poolSize) || 10;
  const active_state = is_active !== undefined ? is_active : activate;
  let host = (body.host || '').trim();
  let port = body.port ? String(body.port).trim() : '';
  let username = (body.username || '').trim();
  let password = body.password;

  // If connection_string is provided, parse decomposed fields if missing
  if (connection_string) {
    if (!/^postgres(ql)?:\/\//i.test(connection_string)) {
      connection_string = `postgresql://${connection_string}`;
    }
    try {
      const u = new URL(connection_string);
      if (!host && u.hostname) host = u.hostname;
      if (!port && u.port) port = u.port;
      if (!username && u.username) username = decodeURIComponent(u.username);
      if (password === undefined && u.password) password = decodeURIComponent(u.password);
      if (!db_name && u.pathname) db_name = u.pathname.replace(/^\//, '');
    } catch (err) {
      console.warn('[saveDatabaseConfig] Could not parse connection_string URL:', err);
    }
  } else if (dbType === 'local' || host) {
    // If saving in local mode without explicit connection string, construct it
    const finalHost = host || 'localhost';
    const finalPort = port || '5432';
    const defaultDbName = targetId === 'ledger' ? 'platform_ledger' : (targetId === 'external' ? 'platform_external' : (targetId === 'security' ? 'platform_security' : 'platform_core'));
    const finalDb = db_name || defaultDbName;
    const finalUser = username || 'postgres';
    const userPart = encodeURIComponent(finalUser);
    const passPart = password ? `:${encodeURIComponent(password)}` : '';
    connection_string = `postgresql://${userPart}${passPart}@${finalHost}:${finalPort}/${finalDb}`;
    if (ssl_mode && ssl_mode !== 'disable') {
      connection_string += `?sslmode=${ssl_mode}`;
    }
  }

  const encryptedPassword = password !== undefined && password !== null && password !== '' ? encrypt(password) : null;
  const encryptedConnString = connection_string ? encrypt(connection_string) : null;

  await pool.query(`
    INSERT INTO db_connections_registry (id, type, host, port, db_name, username, password, connection_string, ssl_mode, pool_size, is_active)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    ON CONFLICT (id) DO UPDATE SET
      type = EXCLUDED.type, 
      host = EXCLUDED.host, 
      port = EXCLUDED.port, 
      db_name = EXCLUDED.db_name,
      username = EXCLUDED.username,
      password = COALESCE(EXCLUDED.password, db_connections_registry.password),
      connection_string = COALESCE(EXCLUDED.connection_string, db_connections_registry.connection_string),
      ssl_mode = EXCLUDED.ssl_mode, 
      pool_size = EXCLUDED.pool_size,
      is_active = EXCLUDED.is_active, 
      updated_at = CURRENT_TIMESTAMP
  `, [targetId, dbType, host || null, port ? Number(port) : null, db_name || null, username || null, encryptedPassword, encryptedConnString, ssl_mode, pool_size, active_state]);

  if (active_state) {
    if (targetId === 'core' || targetId === 'ledger' || targetId === 'external' || targetId === 'security') {
      await synchronizePerplextaPoolsFromRegistry();
      await runDatabaseMigrations('additive', targetId);
    }
  }
  return { success: true };
}

export async function testDatabaseConnection(config: any) {
  const body = config.config || config;
  const dbId = config.id || body.id;
  const dbType = config.type || body.type || 'local';
  const explicitConnStr = (body.connection_string || body.connectionString || '').trim();
  const host = (body.host || '').trim();
  const port = body.port ? String(body.port).trim() : '';
  const db_name = (body.db_name || body.dbName || '').trim();
  const username = (body.username || '').trim();
  const password = body.password;

  let decryptedPassword = '';
  let decryptedConnString = '';

  if (dbId) {
    try {
      const existing = await pool.query('SELECT password, connection_string, host, port, db_name, username FROM db_connections_registry WHERE id = $1', [dbId]);
      if (existing.rows.length > 0) {
        const row = existing.rows[0];
        if (row.password) {
          try { decryptedPassword = decrypt(row.password); } catch {}
        }
        if (row.connection_string) {
          try { decryptedConnString = decrypt(row.connection_string); } catch {}
        }
      }
    } catch (e) {
      console.warn('[AdminService] Failed to fetch existing credentials for test connection:', e);
    }
  }

  let connStr = '';
  if (explicitConnStr) {
    connStr = explicitConnStr;
  } else if (dbType === 'local' || host) {
    const finalHost = host || 'localhost';
    const finalPort = port || '5432';
    const defaultDbName = dbId === 'ledger' ? 'platform_ledger' : (dbId === 'external' ? 'platform_external' : (dbId === 'security' ? 'platform_security' : 'platform_core'));
    const finalDbName = db_name || defaultDbName;
    const finalUser = username || 'postgres';
    const finalPass = password !== undefined && password !== null && password !== '' ? password : decryptedPassword;
    
    const encodedUser = encodeURIComponent(finalUser);
    const encodedPass = finalPass ? `:${encodeURIComponent(finalPass)}` : '';
    connStr = `postgresql://${encodedUser}${encodedPass}@${finalHost}:${finalPort}/${finalDbName}`;
    if (body.ssl_mode && body.ssl_mode !== 'disable') {
      connStr += `?sslmode=${body.ssl_mode}`;
    }
  } else if (decryptedConnString) {
    connStr = decryptedConnString;
  }

  if (connStr && !/^postgres(ql)?:\/\//i.test(connStr)) {
    connStr = `postgresql://${connStr}`;
  }

  if (!connStr) throw new Error('Missing connection settings');

  const testPool = createInternalPool(connStr, 1, 6000);
  try {
    await testPool.query('SELECT 1');
    let parsedHost = 'localhost';
    try {
      parsedHost = new URL(connStr).hostname;
    } catch {}
    return { success: true, message: 'Connection successful', parsedHost };
  } catch (e: any) {
    return { success: false, error: formatDbErrorMessage(e), rawError: e.message };
  } finally {
    try { 
      await testPool.end(); 
    } catch (err) {
      console.warn('[AdminService] Soft-failed to close test pool:', err);
    }
  }
}

export async function exportDatabase(type: 'core' | 'ledger' | 'external' | 'security') {
  const targetPool = type === 'ledger' 
    ? (ledgerPool || pool) 
    : (type === 'external' 
      ? (externalPool || pool) 
      : (type === 'security' ? (securityPool || pool) : pool));
      
  const tables = type === 'ledger' 
    ? LEDGER_TABLES 
    : (type === 'external' 
      ? EXTERNAL_TABLES 
      : (type === 'security' ? SECURITY_TABLES : CORE_TABLES));
      
  let actualDbName = type;
  try {
    const dbNameResult = await targetPool.query('SELECT current_database() as db_name');
    if (dbNameResult && dbNameResult.rows && dbNameResult.rows.length > 0) {
      actualDbName = dbNameResult.rows[0].db_name;
    }
  } catch (err) {
    console.warn('[Export] Failed to query current_database():', err);
  }

  const tableSummary: Record<string, number> = {};
  const backupData: Record<string, any[]> = {};
  let totalRows = 0;

  for (const table of tables) {
    try {
      const tableCheck = await targetPool.query(
        `SELECT 1 FROM information_schema.tables WHERE table_name = $1 AND table_schema = 'public'`,
        [table]
      );
      if (tableCheck.rows.length === 0) {
        continue;
      }
      const result = await targetPool.query(`SELECT * FROM "${table}" ORDER BY 1 ASC`);
      backupData[table] = result.rows;
      tableSummary[table] = result.rows.length;
      totalRows += result.rows.length;
    } catch (e) {
      console.warn(`[Export] Skipping table ${table}:`, e);
    }
  }

  return {
    perplexta_backup_version: '2.0',
    type,
    database_name: actualDbName,
    timestamp: new Date().toISOString(),
    summary: {
      table_count: Object.keys(backupData).length,
      total_rows: totalRows,
      tables: tableSummary
    },
    data: backupData
  };
}

export async function importDatabase(backup: any, targetType: 'core' | 'ledger' | 'external' | 'security') {
  if (!backup || typeof backup !== 'object') {
    throw new Error('Invalid backup file payload');
  }

  const backupData = backup.data || backup;
  if (!backupData || typeof backupData !== 'object') {
    throw new Error('No valid table data found in backup');
  }

  const targetPool = targetType === 'ledger' 
    ? (ledgerPool || pool) 
    : (targetType === 'external' 
      ? (externalPool || pool) 
      : (targetType === 'security' ? (securityPool || pool) : pool));

  const allowedTables = targetType === 'ledger' 
    ? LEDGER_TABLES 
    : (targetType === 'external' 
      ? EXTERNAL_TABLES 
      : (targetType === 'security' ? SECURITY_TABLES : CORE_TABLES));

  const client = await targetPool.connect();
  let totalImported = 0;
  const restoredDetails: Record<string, number> = {};

  try {
    await client.query('BEGIN');

    // Attempt to set session_replication_role = 'replica' to bypass constraint validation during restore
    let replicationRoleSet = false;
    try {
      await client.query("SET session_replication_role = 'replica'");
      replicationRoleSet = true;
    } catch (err) {
      console.warn('[Import] session_replication_role not permitted, continuing with standard transaction:', err);
    }

    // Tables to restore
    const tablesToRestore = Object.keys(backupData).filter(t => allowedTables.includes(t));

    // First truncate target tables present in backup (in reverse dependency order)
    const reversedTables = [...tablesToRestore].reverse();
    for (const table of reversedTables) {
      try {
        const tableCheck = await client.query(
          `SELECT 1 FROM information_schema.tables WHERE table_name = $1 AND table_schema = 'public'`,
          [table]
        );
        if (tableCheck.rows.length > 0) {
          await client.query(`TRUNCATE TABLE "${table}" CASCADE`);
        }
      } catch (truncErr) {
        console.warn(`[Import] Truncate warning for table ${table}:`, truncErr);
      }
    }

    // Insert rows table by table
    for (const table of allowedTables) {
      const rows = backupData[table];
      if (!Array.isArray(rows) || rows.length === 0) continue;

      // Inspect table columns in the database
      const colRes = await client.query(
        `SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_name = $1 AND table_schema = 'public'`,
        [table]
      );
      if (colRes.rows.length === 0) {
        console.warn(`[Import] Table "${table}" does not exist in schema, skipping.`);
        continue;
      }
      const dbColumns = colRes.rows.map((r: any) => r.column_name);
      const jsonbCols = new Set(
        colRes.rows
          .filter((r: any) => r.data_type === 'json' || r.data_type === 'jsonb' || r.udt_name === 'json' || r.udt_name === 'jsonb')
          .map((r: any) => r.column_name)
      );
      const arrayCols = new Set(
        colRes.rows
          .filter((r: any) => r.data_type === 'ARRAY' || r.udt_name.startsWith('_'))
          .map((r: any) => r.column_name)
      );

      let tableInserted = 0;
      for (const row of rows) {
        if (!row || typeof row !== 'object') continue;
        const validKeys: string[] = [];
        const validValues: any[] = [];

        for (const [key, val] of Object.entries(row)) {
          if (!dbColumns.includes(key)) continue;

          validKeys.push(`"${key}"`);
          if (val === null || val === undefined) {
            validValues.push(null);
          } else if (jsonbCols.has(key)) {
            validValues.push(typeof val === 'object' ? JSON.stringify(val) : val);
          } else if (arrayCols.has(key) && Array.isArray(val)) {
            validValues.push(val);
          } else if (typeof val === 'object' && !(val instanceof Date)) {
            validValues.push(JSON.stringify(val));
          } else {
            validValues.push(val);
          }
        }

        if (validKeys.length > 0) {
          const placeholders = validValues.map((_, idx) => `$${idx + 1}`).join(', ');
          await client.query(`INSERT INTO "${table}" (${validKeys.join(', ')}) VALUES (${placeholders})`, validValues);
          tableInserted++;
        }
      }

      // Reset sequence for auto-increment ID if exists
      if (dbColumns.includes('id')) {
        try {
          await client.query(`
            SELECT setval(
              pg_get_serial_sequence('"${table}"', 'id'),
              COALESCE((SELECT MAX(id) FROM "${table}"), 1),
              (SELECT MAX(id) IS NOT NULL FROM "${table}")
            )
          `);
        } catch (seqErr) {
          // ignore if no serial sequence
        }
      }

      restoredDetails[table] = tableInserted;
      totalImported += tableInserted;
    }

    if (replicationRoleSet) {
      await client.query("SET session_replication_role = 'origin'");
    }

    await client.query('COMMIT');
    return {
      success: true,
      message: 'Database restored successfully with precision',
      total_rows_imported: totalImported,
      restored_tables: Object.keys(restoredDetails).length,
      details: restoredDetails
    };
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('[Import] Database import error:', err);
    throw new Error(`Import failed: ${err.message}`);
  } finally {
    client.release();
  }
}

export async function initAllTools() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const t of tools) {
      await client.query(`
        INSERT INTO tool_orchestrator (tool_id, primary_provider, primary_model, is_active, cost_per_usage, task_description, task_description_ar)
        VALUES ($1, '', '', true, $2, $3, $4)
        ON CONFLICT (tool_id) DO UPDATE SET
          is_active = true,
          task_description = EXCLUDED.task_description,
          task_description_ar = EXCLUDED.task_description_ar,
          primary_provider = CASE WHEN tool_orchestrator.primary_provider IS NULL OR tool_orchestrator.primary_provider = '' THEN '' ELSE tool_orchestrator.primary_provider END,
          primary_model = CASE WHEN tool_orchestrator.primary_model IS NULL OR tool_orchestrator.primary_model = '' THEN '' ELSE tool_orchestrator.primary_model END
      `, [t.id, t.cost, t.desc, t.descAr]);
    }
    await client.query('COMMIT');
    return { success: true, message: 'Tools initialized' };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function getAdminStats() {
  const safeQuery = async (pool: any, sql: string, fallback: any = 0) => {
    try {
      const r = await pool.query(sql);
      return r.rows[0];
    } catch {
      return { count: fallback, total: fallback };
    }
  };

  const [userCount, chatCount, msgCount, activeSubCount, totalRev, dailyVolume, activeToday] = await Promise.all([
    safeQuery(pool, 'SELECT count(*) FROM users'),
    safeQuery(pool, 'SELECT count(*) FROM chats'),
    safeQuery(pool, 'SELECT count(*) FROM messages'),
    safeQuery(pool, "SELECT count(*) FROM subscriptions WHERE status = 'active'"),
    safeQuery(ledgerPool, "SELECT sum(amount) as total FROM ledger_transactions WHERE transaction_type IN ('deposit', 'subscription_payment') AND status = 'success'"),
    safeQuery(ledgerPool, "SELECT sum(amount) as total FROM ledger_transactions WHERE created_at > now() - interval '24 hours'"),
    safeQuery(pool, "SELECT count(*) FROM users WHERE last_active_at > now() - interval '24 hours'")
  ]);

  return {
    users: parseInt(userCount.count || 0),
    activeUsersToday: parseInt(activeToday.count || 0),
    chats: parseInt(chatCount.count || 0),
    aiGenerations: parseInt(msgCount.count || 0),
    activeSubscriptions: parseInt(activeSubCount.count || 0),
    monthlyRevenue: parseFloat(totalRev.total || 0),
    dailyVolume: parseFloat(dailyVolume.total || 0),
    systemHealth: 'optimal',
    uptime: process.uptime()
  };
}

export async function getServerHealth() {
  const cpus = os.cpus();
  const memory = process.memoryUsage();
  const load = os.loadavg();
  const cpuCount = cpus.length;
  const cpuLoad = Math.min(100, Math.round((load[0] / cpuCount) * 100));

  const dbStatus: any = {};

  try {
    const start = Date.now();
    await pool.query('SELECT 1');
    const metrics = getPoolMetrics(pool, 'core');
    dbStatus.core = { status: 'connected', latencyMs: Date.now() - start, ...metrics };
  } catch (err: any) {
    dbStatus.core = { status: 'disconnected', error: err.message, ...getPoolMetrics(pool, 'core') };
  }

  try {
    const start = Date.now();
    await (ledgerPool || pool).query('SELECT 1');
    const metrics = getPoolMetrics(ledgerPool || pool, 'ledger');
    dbStatus.ledger = { status: 'connected', latencyMs: Date.now() - start, ...metrics };
  } catch (err: any) {
    dbStatus.ledger = { status: 'disconnected', error: err.message, ...getPoolMetrics(ledgerPool || pool, 'ledger') };
  }

  try {
    const start = Date.now();
    await (externalPool || pool).query('SELECT 1');
    const metrics = getPoolMetrics(externalPool || pool, 'external');
    dbStatus.external = { status: 'connected', latencyMs: Date.now() - start, ...metrics };
  } catch (err: any) {
    dbStatus.external = { status: 'disconnected', error: err.message, ...getPoolMetrics(externalPool || pool, 'external') };
  }

  try {
    const start = Date.now();
    await (securityPool || pool).query('SELECT 1');
    const metrics = getPoolMetrics(securityPool || pool, 'security');
    dbStatus.security = { status: 'connected', latencyMs: Date.now() - start, ...metrics };
  } catch (err: any) {
    dbStatus.security = { status: 'disconnected', error: err.message, ...getPoolMetrics(securityPool || pool, 'security') };
  }

  return {
    cpu: cpuLoad,
    memory: {
      used: Math.round(memory.heapUsed / 1024 / 1024),
      total: Math.round(memory.heapTotal / 1024 / 1024),
      percent: Math.round((memory.heapUsed / memory.heapTotal) * 100)
    },
    uptime: process.uptime(),
    platform: os.platform(),
    load,
    databases: dbStatus
  };
}

export async function broadcastAdminStats() {
  try {
    const { io } = await import('../config/socket.js');
    if (!io) return;
    const stats = await getAdminStats();
    io.to('admin_room').emit('admin_stats_update', stats);
  } catch (error) {
    console.error('[Socket] Failed to broadcast admin stats:', error);
  }
}
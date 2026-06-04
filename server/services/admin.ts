import { pool, ledgerPool, externalPool, securityPool, createInternalPool, synchronizePerplextaPoolsFromRegistry } from '../db/index.js';
import { decrypt, encrypt } from '../utils/crypto.js';
import { runDatabaseMigrations } from '../db/migrations.js';
import { tools } from '../config/constants.js';
import os from 'os';

const CORE_TABLES = [
  'users', 'chats', 'messages', 'api_keys_vault', 'tool_orchestrator',
  'plans', 'subscriptions', 'user_usage', 'notifications', 'system_settings',
  'system_broadcasts', 'user_files', 'security_alerts', 'system_logs',
  'db_connections_registry'
];

const LEDGER_TABLES = ['wallets', 'ledger_transactions'];
const EXTERNAL_TABLES = ['forum_categories', 'forum_posts', 'forum_comments', 'blog_articles', 'blog_comments', 'blog_ratings'];
const SECURITY_TABLES = ['token_blacklist', 'security_alerts'];

export async function getDatabaseRegistry() {
  try {
    await pool.query("DELETE FROM db_connections_registry WHERE id NOT IN ('core', 'ledger', 'external', 'security')");
  } catch (err) {
    console.warn(err);
  }
  const result = await pool.query("SELECT id, provider, type, host, port, db_name, username, ssl_mode, pool_size, is_active, status, updated_at FROM db_connections_registry WHERE id IN ('core', 'ledger', 'external', 'security') ORDER BY id ASC");
  return result.rows;
}

export async function saveDatabaseConfig(config: any) {
  const body = config.config || config;
  const { id, type, is_active, activate } = config;
  const targetId = id || body.id;

  if (!['core', 'ledger', 'external', 'security'].includes(targetId)) {
    throw new Error('Unauthorized database target ID');
  }

  const db_name = body.db_name || body.dbName;
  const connection_string = body.connection_string || body.connectionString;
  const ssl_mode = body.ssl_mode || body.sslMode;
  const pool_size = body.pool_size || body.poolSize;
  const active_state = is_active !== undefined ? is_active : activate;

  const encryptedPassword = body.password ? encrypt(body.password) : null;
  const encryptedConnString = connection_string ? encrypt(connection_string) : null;

  await pool.query(`
    INSERT INTO db_connections_registry (id, type, host, port, db_name, username, password, connection_string, ssl_mode, pool_size, is_active)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    ON CONFLICT (id) DO UPDATE SET
      type = EXCLUDED.type, host = EXCLUDED.host, port = EXCLUDED.port, db_name = EXCLUDED.db_name,
      username = EXCLUDED.username,
      password = COALESCE(EXCLUDED.password, db_connections_registry.password),
      connection_string = COALESCE(EXCLUDED.connection_string, db_connections_registry.connection_string),
      ssl_mode = EXCLUDED.ssl_mode, pool_size = EXCLUDED.pool_size,
      is_active = EXCLUDED.is_active, updated_at = CURRENT_TIMESTAMP
  `, [targetId, type || body.type, body.host, body.port, db_name, body.username, encryptedPassword, encryptedConnString, ssl_mode, pool_size, active_state]);

  if (active_state) {
    if (targetId === 'core' || targetId === 'ledger' || targetId === 'external' || targetId === 'security') {
      await synchronizePerplextaPoolsFromRegistry();
      await runDatabaseMigrations();
    }
  }
  return { success: true };
}

export async function testDatabaseConnection(config: any) {
  const body = config.config || config;
  const dbId = config.id || body.id;
  const connection_string = body.connection_string || body.connectionString;
  const host = body.host;
  const port = body.port;
  const db_name = body.db_name || body.dbName;
  const username = body.username;
  const password = body.password;

  let decryptedPassword = '';
  let decryptedConnString = '';

  if (dbId) {
    try {
      const existing = await pool.query('SELECT password, connection_string FROM db_connections_registry WHERE id = $1', [dbId]);
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

  let connStr = connection_string || decryptedConnString;
  if (!connStr && host) {
    const finalPass = password || decryptedPassword;
    const encodedUser = encodeURIComponent(username || '');
    const encodedPass = encodeURIComponent(finalPass || '');
    connStr = `postgres://${encodedUser}:${encodedPass}@${host}:${port}/${db_name}`;
  }

  if (!connStr) throw new Error('Missing connection settings');

  const testPool = createInternalPool(connStr);
  try {
    await testPool.query('SELECT 1');
    return { success: true, message: 'Connection successful' };
  } catch (e: any) {
    return { success: false, error: e.message };
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
      
  let actualDbName = 'unknown';
  try {
    const dbNameResult = await targetPool.query('SELECT current_database() as db_name');
    if (dbNameResult && dbNameResult.rows && dbNameResult.rows.length > 0) {
      actualDbName = dbNameResult.rows[0].db_name;
    }
  } catch (err) {
    console.warn('[Export] Failed to query current_database():', err);
  }

  const backup: any = { 
    type, 
    database_name: actualDbName, 
    timestamp: new Date().toISOString(), 
    data: {} 
  };

  for (const table of tables) {
    try {
      const result = await targetPool.query(`SELECT * FROM ${table}`);
      backup.data[table] = result.rows;
    } catch (e) {
      console.warn(`[Export] Skipping table ${table}:`, e);
    }
  }
  return backup;
}

export async function importDatabase(backup: any, targetType: 'core' | 'ledger' | 'external' | 'security') {
  const targetPool = targetType === 'ledger' 
    ? (ledgerPool || pool) 
    : (targetType === 'external' 
      ? (externalPool || pool) 
      : (targetType === 'security' ? (securityPool || pool) : pool));
      
  if (!backup || !backup.data) throw new Error('Invalid backup format');

  const allowedTables = targetType === 'ledger' 
    ? LEDGER_TABLES 
    : (targetType === 'external' 
      ? EXTERNAL_TABLES 
      : (targetType === 'security' ? SECURITY_TABLES : CORE_TABLES));

  const client = await targetPool.connect();
  try {
    await client.query('BEGIN');
    for (const [table, rows] of Object.entries(backup.data)) {
      if (!allowedTables.includes(table)) {
        console.warn(`[Import] Skipping unknown table: ${table}`);
        continue;
      }
      if (!Array.isArray(rows) || rows.length === 0) continue;

      await client.query(`TRUNCATE TABLE ${table} CASCADE`);
      const keys = Object.keys(rows[0] as object);
      for (const row of rows as any[]) {
        const values = Object.values(row);
        const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
        const columns = keys.join(', ');
        await client.query(`INSERT INTO ${table} (${columns}) VALUES (${placeholders})`, values);
      }
      if (keys.includes('id')) {
        await client.query(`SELECT setval(pg_get_serial_sequence($1, 'id'), coalesce(max(id), 1), max(id) IS NOT null) FROM ${table}`, [table]);
      }
    }
    await client.query('COMMIT');
    return { success: true, message: 'Database restored successfully' };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
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
    dbStatus.core = { status: 'connected', latencyMs: Date.now() - start };
  } catch (err: any) {
    dbStatus.core = { status: 'disconnected', error: err.message };
  }

  try {
    const start = Date.now();
    await (ledgerPool || pool).query('SELECT 1');
    dbStatus.ledger = { status: 'connected', latencyMs: Date.now() - start };
  } catch (err: any) {
    dbStatus.ledger = { status: 'disconnected', error: err.message };
  }

  try {
    const start = Date.now();
    await (externalPool || pool).query('SELECT 1');
    dbStatus.external = { status: 'connected', latencyMs: Date.now() - start };
  } catch (err: any) {
    dbStatus.external = { status: 'disconnected', error: err.message };
  }

  try {
    const start = Date.now();
    await (securityPool || pool).query('SELECT 1');
    dbStatus.security = { status: 'connected', latencyMs: Date.now() - start };
  } catch (err: any) {
    dbStatus.security = { status: 'disconnected', error: err.message };
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
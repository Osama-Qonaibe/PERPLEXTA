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
  'recommendation_feedback'
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
  } catch (err) {
    console.warn(err);
  }
  const result = await pool.query("SELECT id, provider, type, host, port, db_name, username, connection_string, ssl_mode, pool_size, is_active, status, updated_at FROM db_connections_registry WHERE id IN ('core', 'ledger', 'external', 'security') ORDER BY id ASC");
  return result.rows.map((row: any) => ({
    ...row,
    connection_string: row.connection_string ? decrypt(row.connection_string) : ''
  }));
}

export async function saveDatabaseConfig(config: any) {
  const body = config.config || config;
  const { id, type, is_active, activate } = config;
  const targetId = id || body.id || (config.config && config.id);

  console.log("[AdminService] Initializing saveDatabaseConfig for targetId:", targetId, {
    db_type: type || body.type,
    is_active,
    activate
  });

  if (!['core', 'ledger', 'external', 'security'].includes(targetId)) {
    console.error("[AdminService] Unauthorized target ID passed to saveDatabaseConfig:", targetId);
    throw new Error('Unauthorized database target ID');
  }

  const db_name = body.db_name || body.dbName;
  const connection_string = body.connection_string !== undefined ? body.connection_string : body.connectionString;
  const ssl_mode = body.ssl_mode || body.sslMode;
  const pool_size = body.pool_size || body.poolSize || 10;
  const active_state = is_active !== undefined ? is_active : (activate !== undefined ? activate : true);
  const db_type = type || body.type || 'cloud';

  console.log("[AdminService] Parameter resolution:", {
    db_name,
    ssl_mode,
    pool_size,
    active_state,
    db_type,
    hasPassword: !!body.password,
    hasConnString: !!connection_string
  });

  const encryptedPassword = body.password ? encrypt(body.password) : null;
  const encryptedConnString = connection_string ? encrypt(connection_string) : null;

  console.log("[AdminService] Running UPSERT on db_connections_registry table...");
  await pool.query(`
    INSERT INTO db_connections_registry (id, type, host, port, db_name, username, password, connection_string, ssl_mode, pool_size, is_active)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    ON CONFLICT (id) DO UPDATE SET
      type = EXCLUDED.type, host = EXCLUDED.host, port = EXCLUDED.port, db_name = EXCLUDED.db_name,
      username = EXCLUDED.username,
      password = COALESCE(EXCLUDED.password, db_connections_registry.password),
      connection_string = EXCLUDED.connection_string,
      ssl_mode = EXCLUDED.ssl_mode, pool_size = EXCLUDED.pool_size,
      is_active = EXCLUDED.is_active, updated_at = CURRENT_TIMESTAMP
  `, [targetId, db_type, body.host, body.port, db_name, body.username, encryptedPassword, encryptedConnString, ssl_mode, pool_size, active_state]);
  console.log("[AdminService] UPSERT completed successfully.");

  if (active_state) {
    if (['core', 'ledger', 'external', 'security'].includes(targetId)) {
      console.log("[AdminService] Database target is active. Commencing in-memory pool synchronization...");
      await synchronizePerplextaPoolsFromRegistry();
      console.log("[AdminService] Connection pool synchronization completed. Running incremental database schema migrations...");
      const migrationRes = await runDatabaseMigrations('additive', targetId);
      console.log("[AdminService] Database schema migration completed. Migration status details:", migrationRes);
    }
  } else {
    console.log("[AdminService] Database target is not active. Skipping in-memory pool synchronization and migrations.");
  }

  return { success: true };
}

export async function testDatabaseConnection(config: any) {
  const body = config.config || config;
  const dbId = config.id || body.id;
  const connection_string = body.connection_string !== undefined ? body.connection_string : (body.connectionString !== undefined ? body.connectionString : config.connectionString);
  const host = body.host || config.host;
  const port = body.port || config.port;
  const db_name = body.db_name || body.dbName || config.dbName;
  const username = body.username || config.username;
  const password = body.password || config.password;

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

  let connStr = connection_string !== undefined && connection_string !== '' ? connection_string : decryptedConnString;
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

export async function getDatabasesHealthSummary() {
  const poolsConfig = [
    { id: 'core', name: 'Core Database', role: 'Operational Engine', target: pool },
    { id: 'ledger', name: 'Ledger Vault', role: 'Financial & Economy', target: ledgerPool || pool },
    { id: 'external', name: 'Sections Dashboard', role: 'Content & Integrations', target: externalPool || pool },
    { id: 'security', name: 'Security & Defense', role: 'Defense & Audit Logs', target: securityPool || pool }
  ];

  const poolsData: any[] = [];
  let totalActive = 0;
  let totalIdle = 0;
  let totalWaiting = 0;
  let totalAllocated = 0;
  let totalMaxLimit = 0;
  let totalLatency = 0;
  let connectedCount = 0;
  let warningCount = 0;
  let criticalCount = 0;

  for (const p of poolsConfig) {
    let status: 'connected' | 'disconnected' = 'connected';
    let latencyMs = 0;
    let error: string | null = null;
    try {
      const start = Date.now();
      await p.target.query('SELECT 1');
      latencyMs = Date.now() - start;
      connectedCount++;
      totalLatency += latencyMs;
    } catch (err: any) {
      status = 'disconnected';
      error = err.message || 'Connection unreachable';
    }

    const metrics = getPoolMetrics(p.target, p.id);
    const max = metrics.max || 20;
    const active = metrics.active || 0;
    const idle = metrics.idle || 0;
    const waiting = metrics.waiting || 0;
    const total = metrics.total || 0;
    const utilization = Math.min(100, Math.round((active / (max || 1)) * 100));
    const allocation = Math.min(100, Math.round((total / (max || 1)) * 100));

    totalActive += active;
    totalIdle += idle;
    totalWaiting += waiting;
    totalAllocated += total;
    totalMaxLimit += max;

    let alertLevel: 'optimal' | 'warning' | 'critical' = 'optimal';
    let alertMessage = 'Normal connection load';
    let alertMessageAr = 'مستوى اتصال طبيعي ومستقر';

    if (status === 'disconnected') {
      alertLevel = 'critical';
      alertMessage = `Connection offline: ${error || 'Pool unreachable'}`;
      alertMessageAr = `قاعدة البيانات غير متصلة: ${error || 'تعذر الوصول إلى المجمع'}`;
      criticalCount++;
    } else if (metrics.saturated || utilization >= 90 || active >= max) {
      alertLevel = 'critical';
      alertMessage = `CRITICAL: Pool saturated! Using ${active}/${max} connections (${waiting} queued)`;
      alertMessageAr = `حرج: استنفاد كامل لسعة الاتصالات (${active}/${max} مستخدمة، ${waiting} قيد الانتظار)`;
      criticalCount++;
    } else if (utilization >= 70 || (max - active <= 3 && max > 5) || waiting > 0 || metrics.connection_leak_risk) {
      alertLevel = 'warning';
      alertMessage = `WARNING: Approaching max connection limit (${active}/${max} in use, ${utilization}%)`;
      alertMessageAr = `تحذير: الاقتراب من الحد الأقصى للمجمع (${active}/${max} مستخدمة، ${utilization}%)`;
      warningCount++;
    }

    let schemaVersion = 'v1.0 (Base)';
    let migrationCount = 0;
    if (status === 'connected' && p.target) {
      try {
        const migRes = await p.target.query('SELECT migration_name FROM migration_history ORDER BY id DESC LIMIT 1');
        if (migRes.rows.length > 0) {
          schemaVersion = migRes.rows[0].migration_name;
        }
        const countRes = await p.target.query('SELECT count(*) FROM migration_history');
        migrationCount = parseInt(countRes.rows[0].count, 10) || 0;
      } catch {
        try {
          const tCheck = await p.target.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
          migrationCount = tCheck.rows.length;
          schemaVersion = `${migrationCount} tables`;
        } catch {
          schemaVersion = 'v1.0';
        }
      }
    }

    poolsData.push({
      id: p.id,
      name: p.name,
      role: p.role,
      status,
      latencyMs,
      error,
      active,
      idle,
      waiting,
      total,
      max,
      utilization,
      allocation,
      saturated: metrics.saturated,
      connection_leak_risk: metrics.connection_leak_risk,
      available: metrics.available,
      alertLevel,
      alertMessage,
      alertMessageAr,
      schemaVersion,
      migrationCount
    });
  }

  const avgLatencyMs = connectedCount > 0 ? Math.round(totalLatency / connectedCount) : 0;
  const clusterUtilization = totalMaxLimit > 0 ? Math.min(100, Math.round((totalActive / totalMaxLimit) * 100)) : 0;
  const overallClusterStatus: 'optimal' | 'warning' | 'critical' = 
    criticalCount > 0 ? 'critical' : warningCount > 0 ? 'warning' : 'optimal';

  return {
    pools: poolsData,
    summary: {
      totalActive,
      totalIdle,
      totalWaiting,
      totalAllocated,
      totalMaxLimit,
      clusterUtilization,
      avgLatencyMs,
      connectedCount,
      totalPools: poolsConfig.length,
      warningCount,
      criticalCount,
      overallClusterStatus,
      timestamp: new Date().toISOString()
    }
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
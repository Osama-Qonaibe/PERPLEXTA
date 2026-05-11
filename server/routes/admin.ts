import express from 'express';
import pkg from 'pg';
import { pool, ledgerPool } from '../db/index.js';
import { authenticateAdmin } from '../middleware/auth.js';
import { encrypt, decrypt } from '../utils/crypto.js';
import { syncProviderModelsInternal } from '../services/ai.js';
import { logSystemActivity, logSecurityAlert } from '../services/notifications.js';
import { tools } from '../config/constants.js';
import { runDatabaseMigrations, initDb } from '../db/migrations.js';

const router = express.Router();

router.get("/databases/registry", authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM db_connections_registry ORDER BY id ASC');
    const decryptedRows = result.rows.map(row => ({
      ...row,
      password: row.password ? decrypt(row.password) : null,
      connection_string: row.connection_string ? decrypt(row.connection_string) : null
    }));
    res.json(decryptedRows);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post("/databases/registry", authenticateAdmin, async (req, res) => {
  try {
    const { id, type, host, port, db_name, username, password, connection_string, ssl_mode, pool_size, is_active } = req.body;
    const encryptedPassword = password ? encrypt(password) : null;
    const encryptedConnString = connection_string ? encrypt(connection_string) : null;

    await pool.query(`
      INSERT INTO db_connections_registry (id, type, host, port, db_name, username, password, connection_string, ssl_mode, pool_size, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (id) DO UPDATE SET
        type = EXCLUDED.type, host = EXCLUDED.host, port = EXCLUDED.port, db_name = EXCLUDED.db_name,
        username = EXCLUDED.username, password = COALESCE(EXCLUDED.password, db_connections_registry.password),
        connection_string = COALESCE(EXCLUDED.connection_string, db_connections_registry.connection_string),
        ssl_mode = EXCLUDED.ssl_mode, pool_size = EXCLUDED.pool_size, is_active = EXCLUDED.is_active, updated_at = CURRENT_TIMESTAMP
    `, [id, type, host, port, db_name, username, encryptedPassword, encryptedConnString, ssl_mode, pool_size, is_active]);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post("/databases/save", authenticateAdmin, async (req, res) => {
  try {
    const { id, type, host, port, db_name, username, password, connection_string, ssl_mode, pool_size, is_active } = req.body;
    const encryptedPassword = password ? encrypt(password) : null;
    const encryptedConnString = connection_string ? encrypt(connection_string) : null;

    await pool.query(`
      INSERT INTO db_connections_registry (id, type, host, port, db_name, username, password, connection_string, ssl_mode, pool_size, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (id) DO UPDATE SET
        type = EXCLUDED.type, host = EXCLUDED.host, port = EXCLUDED.port, db_name = EXCLUDED.db_name,
        username = EXCLUDED.username, password = COALESCE(EXCLUDED.password, db_connections_registry.password),
        connection_string = COALESCE(EXCLUDED.connection_string, db_connections_registry.connection_string),
        ssl_mode = EXCLUDED.ssl_mode, pool_size = EXCLUDED.pool_size, is_active = EXCLUDED.is_active, updated_at = CURRENT_TIMESTAMP
    `, [id, type, host, port, db_name, username, encryptedPassword, encryptedConnString, ssl_mode, pool_size, is_active]);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post("/databases/test", authenticateAdmin, async (req, res) => {
  try {
    const { connection_string, host, port, db_name, username, password } = req.body;
    let connStr = connection_string;
    
    if (!connStr && host) {
      connStr = `postgres://${username}:${password}@${host}:${port}/${db_name}`;
    }

    if (!connStr) return res.status(400).json({ error: 'Missing connection settings' });

    const testPool = new pkg.Pool({
      connectionString: connStr,
      connectionTimeoutMillis: 5000,
      max: 1
    });

    try {
      await testPool.query('SELECT 1');
      res.json({ success: true, message: 'Connection successful' });
    } catch (e: any) {
      res.json({ success: false, error: e.message });
    } finally {
      await testPool.end();
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/databases/migrate", authenticateAdmin, async (req, res) => {
  try {
    const { id, type } = req.body;
    console.log(`[Admin] Running migrations for ${id} (${type})`);
    
    // For now, we run the global migrations which ensure columns and tables
    // In a dual-db setup, we might need to target a specific pool, but runDatabaseMigrations uses global pools
    await runDatabaseMigrations();
    
    res.json({ success: true, message: 'Migrations completed' });
  } catch (error: any) {
    console.error('[Admin] Migration failed:', error);
    res.status(500).json({ error: error.message || 'Migration failed' });
  }
});

router.get("/databases/export", authenticateAdmin, async (req, res) => {
  try {
    const { type } = req.query;
    const targetPool = type === 'ledger' ? (ledgerPool || pool) : pool;
    
    // List of tables to export based on migration schema
    const coreTables = ['users', 'chats', 'messages', 'api_keys_vault', 'tool_orchestrator', 'plans', 'subscriptions', 'user_usage', 'notifications', 'system_settings', 'system_broadcasts', 'user_files', 'security_alerts', 'system_logs', 'db_connections_registry'];
    const ledgerTables = ['wallets', 'ledger_transactions'];
    
    const tables = type === 'ledger' ? ledgerTables : coreTables;
    const backup: any = {
      type,
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

    res.json(backup);
  } catch (error: any) {
    console.error('[Admin] Export failed:', error);
    res.status(500).json({ error: error.message || 'Export failed' });
  }
});

router.post("/databases/import", authenticateAdmin, async (req, res) => {
  try {
    const { backup, targetType } = req.body;
    const targetPool = targetType === 'ledger' ? (ledgerPool || pool) : pool;

    if (!backup || !backup.data) {
      return res.status(400).json({ error: 'Invalid backup format' });
    }

    console.log(`[Admin] Starting restoration of ${targetType} database...`);

    // We use a transaction for safety
    const client = await targetPool.connect();
    try {
      await client.query('BEGIN');
      
      // We might need to disable triggers/constraints depending on DB config
      // But standard user won't have superuser for SET session_replication_role = 'replica'
      
      for (const [table, rows] of Object.entries(backup.data)) {
        if (!Array.isArray(rows) || rows.length === 0) continue;
        
        console.log(`[Import] Restoring table ${table} (${(rows as any[]).length} rows)`);
        
        // Truncate table first
        await client.query(`TRUNCATE TABLE ${table} CASCADE`);
        
        const keys = Object.keys(rows[0]);
        for (const row of rows as any[]) {
          const values = Object.values(row);
          const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
          const columns = keys.join(', ');
          
          await client.query(`INSERT INTO ${table} (${columns}) VALUES (${placeholders})`, values);
        }
        
        // Reset serial sequences if id exists
        if (keys.includes('id')) {
          await client.query(`SELECT setval(pg_get_serial_sequence($1, 'id'), coalesce(max(id), 1), max(id) IS NOT null) FROM ${table}`, [table]);
        }
      }
      
      await client.query('COMMIT');
      res.json({ success: true, message: 'Database restored successfully' });
    } catch (e: any) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('[Admin] Import failed:', error);
    res.status(500).json({ error: error.message || 'Import failed' });
  }
});

router.get("/api-keys", authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT provider, updated_at, daily_budget, used_today FROM api_keys_vault');
    res.json({ keys: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post("/orchestrator/init-all", authenticateAdmin, async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const t of tools) {
        await client.query(`
          INSERT INTO tool_orchestrator (tool_id, primary_provider, primary_model, is_active, cost_per_usage)
          VALUES ($1, '', '', true, $2)
          ON CONFLICT (tool_id) DO UPDATE SET is_active = true
        `, [t.id, t.cost]);
      }
      await client.query('COMMIT');
      res.json({ success: true, message: 'Tools initialized' });
    } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
  } catch (error) {
    res.status(500).json({ error: 'Failed to initialize' });
  }
});

router.get("/plans", authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM plans ORDER BY monthly_price ASC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post("/plans", authenticateAdmin, async (req, res) => {
  try {
    const { name_en, name_ar, desc_en, desc_ar, badge, discount, is_active, monthly_price, annual_price, color, features, limits } = req.body;
    await pool.query(`
      INSERT INTO plans (name_en, name_ar, desc_en, desc_ar, badge, discount, is_active, monthly_price, annual_price, color, features, limits)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `, [name_en, name_ar, desc_en, desc_ar, badge, discount, is_active, monthly_price, annual_price, color, JSON.stringify(features), JSON.stringify(limits)]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.put("/plans/:id", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name_en, name_ar, desc_en, desc_ar, badge, discount, is_active, monthly_price, annual_price, color, features, limits } = req.body;
    await pool.query(`
      UPDATE plans SET 
        name_en = $1, name_ar = $2, desc_en = $3, desc_ar = $4, badge = $5, 
        discount = $6, is_active = $7, monthly_price = $8, annual_price = $9, 
        color = $10, features = $11, limits = $12, updated_at = CURRENT_TIMESTAMP
      WHERE id = $13
    `, [name_en, name_ar, desc_en, desc_ar, badge, discount, is_active, monthly_price, annual_price, color, JSON.stringify(features), JSON.stringify(limits), id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.delete("/plans/:id", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM plans WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Admin User Management
router.get("/users", authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        u.id, u.name, u.email, u.role, u.status, u.created_at, u.last_active_at,
        w.balance, w.points
      FROM users u
      LEFT JOIN wallets w ON u.id = w.user_id
      ORDER BY u.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post("/users/:id/status", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    await pool.query('UPDATE users SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [status, id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post("/users/:id/role", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    await pool.query('UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [role, id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// System Monitoring & Stats
router.get("/orchestrator/tools-list", authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tool_orchestrator ORDER BY tool_id ASC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Internal Error' });
  }
});

router.get("/orchestrator/routes", authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tool_orchestrator ORDER BY tool_id ASC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Internal Error' });
  }
});

router.post("/orchestrator/routes", authenticateAdmin, async (req, res) => {
  try {
    const { tool_id, primary_provider, primary_model, fallback1_provider, fallback1_model, fallback2_provider, fallback2_model, is_active, cost_per_usage } = req.body;
    await pool.query(`
      INSERT INTO tool_orchestrator (tool_id, primary_provider, primary_model, fallback1_provider, fallback1_model, fallback2_provider, fallback2_model, is_active, cost_per_usage)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (tool_id) DO UPDATE SET
        primary_provider = EXCLUDED.primary_provider,
        primary_model = EXCLUDED.primary_model,
        fallback1_provider = EXCLUDED.fallback1_provider,
        fallback1_model = EXCLUDED.fallback1_model,
        fallback2_provider = EXCLUDED.fallback2_provider,
        fallback2_model = EXCLUDED.fallback2_model,
        is_active = EXCLUDED.is_active,
        cost_per_usage = EXCLUDED.cost_per_usage,
        updated_at = CURRENT_TIMESTAMP
    `, [tool_id, primary_provider, primary_model, fallback1_provider, fallback1_model, fallback2_provider, fallback2_model, is_active, cost_per_usage]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal Error' });
  }
});

router.get("/orchestrator/models", authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT provider, models FROM api_keys_vault');
    const models: any = {};
    result.rows.forEach(row => {
      models[row.provider] = typeof row.models === 'string' ? JSON.parse(row.models) : row.models;
    });
    res.json(models);
  } catch (error) {
    res.status(500).json({ error: 'Internal Error' });
  }
});

router.get("/broadcasts", authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM system_broadcasts ORDER BY created_at DESC LIMIT 100');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Internal Error' });
  }
});

router.post("/broadcasts/send", authenticateAdmin, async (req, res) => {
  try {
    const { title_en, title_ar, content_en, content_ar, type, target_group } = req.body;
    
    // Log broadcast
    const result = await pool.query(`
      INSERT INTO system_broadcasts (title_en, title_ar, content_en, content_ar, type, target_group, status, sent_count)
      VALUES ($1, $2, $3, $4, $5, $6, 'pending', 0)
      RETURNING id
    `, [title_en, title_ar, content_en, content_ar, type, target_group]);
    
    // In a real app, this would trigger a background job
    // For now we just mark it as sent for demo purposes
    await pool.query('UPDATE system_broadcasts SET status = $1, sent_count = $2 WHERE id = $3', ['sent', 1, result.rows[0].id]);
    
    res.json({ success: true, broadcastId: result.rows[0].id });
  } catch (error) {
    res.status(500).json({ error: 'Internal Error' });
  }
});

router.get("/stats", authenticateAdmin, async (req, res) => {
  try {
    const userCount = await pool.query('SELECT count(*) FROM users');
    const chatCount = await pool.query('SELECT count(*) FROM chats');
    const msgCount = await pool.query('SELECT count(*) FROM messages');
    const activeSubCount = await pool.query("SELECT count(*) FROM subscriptions WHERE status = 'active'");
    const totalRev = await ledgerPool.query("SELECT sum(amount) as total FROM ledger_transactions WHERE transaction_type = 'deposit' AND status = 'success'");
    const dailyVolume = await ledgerPool.query("SELECT sum(amount) as total FROM ledger_transactions WHERE created_at > now() - interval '24 hours'");

    res.json({
      users: parseInt(userCount.rows[0].count),
      chats: parseInt(chatCount.rows[0].count),
      messages: parseInt(msgCount.rows[0].count),
      activeSubscriptions: parseInt(activeSubCount.rows[0].count),
      totalRevenue: parseFloat(totalRev.rows[0].total || 0),
      dailyVolume: parseFloat(dailyVolume.rows[0].total || 0),
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal Error' });
  }
});

router.get("/security-alerts", authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM security_alerts ORDER BY created_at DESC LIMIT 50');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Internal Error' });
  }
});

router.get("/activity-stream", authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM system_logs ORDER BY created_at DESC LIMIT 50');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Internal Error' });
  }
});

export default router;

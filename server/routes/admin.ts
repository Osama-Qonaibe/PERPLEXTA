import express from 'express';
import { pool, ledgerPool } from '../db/index.js';
import { authenticateAdmin } from '../middleware/auth.js';
import { encrypt, decrypt } from '../utils/crypto.js';
import { syncProviderModelsInternal } from '../services/ai.js';
import { logSystemActivity, logSecurityAlert } from '../services/notifications.js';
import { tools } from '../config/constants.js';

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

export default router;

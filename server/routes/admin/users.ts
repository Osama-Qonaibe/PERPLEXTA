import express from 'express';
import { pool } from '../../db/index.js';
import { authenticateAdmin } from '../../middleware/auth.js';
import { auditLog } from '../../utils/logger.js';

const router = express.Router();

router.get("/users", authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, email, role, status, created_at, last_login_at 
      FROM users 
      ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'Internal Error' });
  }
});

router.post("/users/:id/status", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    await pool.query('UPDATE users SET status = $1 WHERE id = $2', [status, id]);
    await auditLog((req as any).user?.id, 'Update User Status', 'users', { targetUser: id, status });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Internal Error' });
  }
});

router.post("/users/:id/role", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    await pool.query('UPDATE users SET role = $1 WHERE id = $2', [role, id]);
    await auditLog((req as any).user?.id, 'Update User Role', 'users', { targetUser: id, role });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Internal Error' });
  }
});

router.get("/users/:id/permissions", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT permissions FROM users WHERE id = $1', [id]);
    res.json(result.rows[0]?.permissions || {});
  } catch {
    res.status(500).json({ error: 'Internal Error' });
  }
});

router.patch("/users/:id/permissions", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { permissions } = req.body;
    await pool.query('UPDATE users SET permissions = $1 WHERE id = $2', [JSON.stringify(permissions), id]);
    await auditLog((req as any).user?.id, 'Update User Permissions', 'users', { targetUser: id, permissions });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Internal Error' });
  }
});

router.get("/users/:id/usage", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT quota_used, quota_limit FROM users WHERE id = $1', [id]);
    res.json(result.rows[0] || { quota_used: 0, quota_limit: 100 });
  } catch {
    res.status(500).json({ error: 'Internal Error' });
  }
});

router.get("/users/:id/activity-logs", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM system_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50', [id]);
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'Internal Error' });
  }
});

router.get("/users/count", authenticateAdmin, async (req, res) => {
  try {
    const { group } = req.query;
    let query = 'SELECT COUNT(*) FROM users';
    if (group === 'pro_only') query += " WHERE role = 'admin' OR role = 'support'"; // Simplified for demo
    else if (group === 'free_only') query += " WHERE role = 'user'";
    
    const result = await pool.query(query);
    res.json({ count: parseInt(result.rows[0].count) });
  } catch {
    res.status(500).json({ error: 'Internal Error' });
  }
});

export default router;

import { Router } from "express";
import { pool, ledgerPool } from "../../db/index.js";
import { authenticate, adminOnly } from "../../middleware/auth.js";

const router = Router();
router.use(authenticate, adminOnly);

async function auditLog(userId: any, action: string, type: string, details: object) {
  try {
    await pool.query(
      'INSERT INTO system_logs (user_id, action, type, details) VALUES ($1, $2, $3, $4)',
      [userId, action, type, JSON.stringify(details)]
    );
  } catch {}
}

// DELETE /api/admin/maintenance/clear-chats
router.delete("/maintenance/clear-chats", async (req, res) => {
  try {
    const countRes = await pool.query('SELECT COUNT(*) FROM chats');
    await pool.query('TRUNCATE TABLE messages CASCADE');
    await pool.query('DELETE FROM chats');
    await auditLog((req as any).user?.id, 'Clear All Chat History', 'system', { deletedChats: parseInt(countRes.rows[0].count) });
    res.json({ success: true, message: 'All AI history and chats cleared' });
  } catch {
    res.status(500).json({ error: 'Failed to clear chat history' });
  }
});

// DELETE /api/admin/notifications/prune
router.delete("/notifications/prune", async (req, res) => {
  try {
    const days = req.query.days as string;
    const mode = req.query.mode as string;

    if (mode === 'all') {
      const result = await pool.query('DELETE FROM notifications');
      await auditLog((req as any).user?.id, 'Prune All Notifications', 'system', {});
      return res.json({ success: true, count: result.rowCount });
    }

    const daysNum = parseInt(days) || 30;
    const result = await pool.query("DELETE FROM notifications WHERE is_read = true AND created_at < now() - interval '1 day' * $1", [daysNum]);
    res.json({ success: true, count: result.rowCount });
  } catch {
    res.status(500).json({ error: 'Prune failed' });
  }
});

// DELETE /api/admin/activity/all/:type
router.delete("/activity/all/:type", async (req, res) => {
  try {
    const { type } = req.params;
    const adminId = (req as any).user?.id;

    if (type === 'ai_generation' || type === 'ai') {
      await pool.query("DELETE FROM system_logs WHERE type = 'ai_generation'");
      await auditLog(adminId, 'Clear AI Generation Logs', 'system', { type });
    } else if (type === 'system_event' || type === 'system') {
      await pool.query("DELETE FROM system_logs WHERE type != 'ai_generation'");
      await auditLog(adminId, 'Clear System Event Logs', 'system', { type });
    } else if (type === 'alert') {
      await pool.query('DELETE FROM security_alerts');
      await auditLog(adminId, 'Clear Security Alerts', 'system', { type });
    } else if (type === 'log') {
      await pool.query('DELETE FROM system_logs');
      await auditLog(adminId, 'Clear All System Logs', 'system', { type });
    } else {
      return res.status(400).json({ error: 'Invalid type. Use: ai, system, alert, or log' });
    }

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Cleanup failed' });
  }
});

// POST /api/admin/activity/batch-delete
router.post("/activity/batch-delete", async (req, res) => {
  try {
    const { ids, type } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'IDs array required' });
    
    if (type === 'financial') {
      await ledgerPool.query('DELETE FROM ledger_transactions WHERE id = ANY($1)', [ids]);
    } else {
      const validTables: Record<string, string> = { alert: 'security_alerts', log: 'system_logs' };
      const table = validTables[type];
      if (!table) return res.status(400).json({ error: 'Invalid type' });
      await pool.query(`DELETE FROM ${table} WHERE id = ANY($1)`, [ids]);
    }
    await auditLog((req as any).user?.id, 'Batch Delete Activity', 'system', { type, count: ids.length });
    res.json({ success: true, count: ids.length });
  } catch {
    res.status(500).json({ error: 'Batch delete failed' });
  }
});

// DELETE /api/admin/activity/:id/:type
router.delete("/activity/:id/:type", async (req, res) => {
  try {
    const { id, type } = req.params;
    const validTables: Record<string, string> = { alert: 'security_alerts', log: 'system_logs' };
    const table = validTables[type];
    if (!table) return res.status(400).json({ error: 'Invalid type' });
    await pool.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Delete failed' });
  }
});

// DELETE /api/admin/security-alerts/:id
router.delete("/security-alerts/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (id === 'all') {
      await pool.query('DELETE FROM security_alerts');
      await auditLog((req as any).user?.id, 'Clear All Security Alerts', 'system', {});
    } else {
      await pool.query('DELETE FROM security_alerts WHERE id = $1', [id]);
    }
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Delete failed' });
  }
});

export default router;

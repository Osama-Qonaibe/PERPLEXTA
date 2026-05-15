import express from 'express';
import { pool } from '../../db/index.js';
import { authenticateAdmin } from '../../middleware/auth.js';
import { getAdminStats, getServerHealth } from '../../services/admin.js';
import { auditLog } from '../../utils/logger.js';

const router = express.Router();

router.get("/health", authenticateAdmin, async (req, res) => {
  try {
    const health = await getServerHealth();
    res.json(health);
  } catch {
    res.status(500).json({ error: 'Internal Error' });
  }
});

router.get("/stats", authenticateAdmin, async (req, res) => {
  try {
    const stats = await getAdminStats();
    res.json(stats);
  } catch {
    res.status(500).json({ error: 'Internal Error' });
  }
});

router.get("/security-alerts", authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM security_alerts ORDER BY created_at DESC LIMIT 50');
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'Internal Error' });
  }
});

router.get("/activity-stream", authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM system_logs ORDER BY created_at DESC LIMIT 50');
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'Internal Error' });
  }
});

router.post("/activity/batch-delete", authenticateAdmin, async (req, res) => {
  try {
    const { ids, type } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'IDs array required' });
    
    // Note: financial batch delete is also here temporarily as it affects system logs
    // but typically batch delete for activity refers to logs/alerts
    const validTables: Record<string, string> = { alert: 'security_alerts', log: 'system_logs' };
    const table = validTables[type];
    
    if (table) {
      await pool.query(`DELETE FROM ${table} WHERE id = ANY($1)`, [ids]);
    }
    
    await auditLog((req as any).user?.id, 'Batch Delete Activity', 'system', { type, count: ids.length });
    res.json({ success: true, count: ids.length });
  } catch {
    res.status(500).json({ error: 'Batch delete failed' });
  }
});

router.delete("/activity/:id/:type", authenticateAdmin, async (req, res) => {
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

router.delete("/activity/all/:type", authenticateAdmin, async (req, res) => {
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

router.delete("/security-alerts/all", authenticateAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM security_alerts');
    await auditLog((req as any).user?.id, 'Clear All Security Alerts', 'system', {});
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Cleanup failed' });
  }
});

router.delete("/security-alerts/:id", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM security_alerts WHERE id = $1', [id]);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Delete failed' });
  }
});

router.delete("/notifications/prune", authenticateAdmin, async (req, res) => {
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

router.delete("/maintenance/clear-chats", authenticateAdmin, async (req, res) => {
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

export default router;

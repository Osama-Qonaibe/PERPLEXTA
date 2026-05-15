import { Router } from "express";
import { pool } from "../../db/index.js";
import { authenticate, adminOnly } from "../../middleware/auth.js";
import { getAdminStats, getServerHealth } from "../../services/admin.js";

const router = Router();
router.use(authenticate, adminOnly);

// GET /api/admin/stats
router.get("/stats", async (req, res) => {
  try {
    const stats = await getAdminStats();
    res.json(stats);
  } catch {
    res.status(500).json({ error: 'Internal Error' });
  }
});

// GET /api/admin/health
router.get("/health", async (req, res) => {
  try {
    const health = await getServerHealth();
    res.json(health);
  } catch {
    res.status(500).json({ error: 'Internal Error' });
  }
});

// GET /api/admin/activity-stream
router.get("/activity-stream", async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM system_logs ORDER BY created_at DESC LIMIT 50');
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'Internal Error' });
  }
});

// GET /api/admin/security-alerts
router.get("/security-alerts", async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM security_alerts ORDER BY created_at DESC LIMIT 50');
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'Internal Error' });
  }
});

export default router;

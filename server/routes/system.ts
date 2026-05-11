import express from 'express';
import { pool } from '../db/index.js';
import { authenticateAdmin } from '../middleware/auth.js';
import { getAppName } from '../services/system.js';

const router = express.Router();

router.get("/settings", async (req, res) => {
  try {
    const result = await pool.query('SELECT site_name_en, site_name_ar, site_description_en, site_description_ar FROM system_settings LIMIT 1');
    res.json(result.rows[0] || {});
  } catch (error) {
    res.status(500).json({ error: 'Internal Error' });
  }
});

router.post("/admin/settings", authenticateAdmin, async (req, res) => {
  try {
    const { site_name_en, site_name_ar } = req.body;
    await pool.query('UPDATE system_settings SET site_name_en = $1, site_name_ar = $2', [site_name_en, site_name_ar]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal Error' });
  }
});

export default router;

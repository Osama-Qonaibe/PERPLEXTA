import express from 'express';
import { authenticateAdmin, authenticateToken } from '../middleware/auth.js';
import { getSystemSettings, updateSystemSettings, getEconomySettings, updateEconomySettings } from '../services/system.js';
import { pool } from '../db/index.js';

const router = express.Router();

router.get("/settings", async (req, res) => {
  try {
    const settings = await getSystemSettings();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Internal Error' });
  }
});

router.get("/economy", async (req, res) => {
  try {
    const economy = await getEconomySettings();
    res.json(economy);
  } catch (error) {
    res.status(500).json({ error: 'Internal Error' });
  }
});

// User Shortcuts Endpoints
router.post("/shortcuts", authenticateToken, async (req: any, res) => {
  try {
    const { title, query } = req.body;
    const userId = req.user.id;

    if (!title || !query) {
      return res.status(400).json({ error: 'Title and query are required' });
    }

    if (!pool) throw new Error('Database initializing');

    const result = await pool.query(
      'INSERT INTO user_shortcuts (user_id, title, query) VALUES ($1, $2, $3) RETURNING *',
      [userId, title, query]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to save shortcut' });
  }
});

router.get("/shortcuts", authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.id;
    if (!pool) throw new Error('Database initializing');

    const result = await pool.query(
      'SELECT * FROM user_shortcuts WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch shortcuts' });
  }
});

// Message Report Endpoint
router.post("/reports", authenticateToken, async (req: any, res) => {
  try {
    const { messageId, reason } = req.body;
    const userId = req.user.id;

    if (!messageId || !reason) {
      return res.status(400).json({ error: 'MessageId and reason are required' });
    }

    if (!pool) throw new Error('Database initializing');

    const result = await pool.query(
      'INSERT INTO message_reports (user_id, message_id, reason) VALUES ($1, $2, $3) RETURNING *',
      [userId, messageId, reason]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to report message' });
  }
});

router.get("/admin/settings", authenticateAdmin, async (req, res) => {
  try {
    const settings = await getSystemSettings();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Internal Error' });
  }
});

router.post("/admin/settings", authenticateAdmin, async (req, res) => {
  try {
    const result = await updateSystemSettings(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Internal Error' });
  }
});

export default router;

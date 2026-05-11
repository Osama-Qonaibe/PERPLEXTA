import express from 'express';
import { pool } from '../db/index.js';

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM plans WHERE is_active = true ORDER BY monthly_price ASC');
    res.json(result.rows);
  } catch (error) {
    console.error('[Plans] Fetch Error:', error);
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
});

export default router;

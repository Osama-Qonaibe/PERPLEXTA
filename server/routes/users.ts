import express from 'express';
import { pool } from '../db/index.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.get("/", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, email, role, status, created_at FROM users ORDER BY created_at DESC LIMIT 50');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

router.get("/profile", authenticateToken, async (req: any, res) => {
   try {
     const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
     if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
     const user = result.rows[0];
     delete user.password; // Security
     res.json(user);
   } catch (error) {
     res.status(500).json({ error: 'Internal Error' });
   }
});

router.get("/me", authenticateToken, async (req: any, res) => {
   try {
     const result = await pool.query('SELECT id, name, email, role, status, language, theme, custom_instructions FROM users WHERE id = $1', [req.user.id]);
     if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
     res.json(result.rows[0]);
   } catch (error) {
     res.status(500).json({ error: 'Internal Error' });
   }
});

export default router;

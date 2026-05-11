import express from 'express';
import { pool, ledgerPool } from '../db/index.js';
import { authenticateToken, authenticateAdmin } from '../middleware/auth.js';

const router = express.Router();

router.get("/profile", authenticateToken, async (req: any, res) => {
   try {
     const result = await pool.query('SELECT id, name, email, role, avatar, status, language, theme, custom_instructions, kyc_status, created_at FROM users WHERE id = $1', [req.user.id]);
     if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
     const user = result.rows[0];
     
     const walletRes = await (ledgerPool || pool).query('SELECT balance, points FROM wallets WHERE user_id = $1', [req.user.id]);
     const wallet = walletRes.rows[0] || { balance: 0.0, points: 0 };
     
     res.json({
       ...user,
       balance: wallet.balance,
       points: parseInt(wallet.points)
     });
   } catch (error) {
     console.error('Profile Fetch Error:', error);
     res.status(500).json({ error: 'Internal Error' });
   }
});

router.get("/me", authenticateToken, async (req: any, res) => {
   try {
     const result = await pool.query('SELECT id, name, email, role, avatar, status, language, theme, custom_instructions, kyc_status, created_at FROM users WHERE id = $1', [req.user.id]);
     if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
     const user = result.rows[0];

     const walletRes = await (ledgerPool || pool).query('SELECT balance, points FROM wallets WHERE user_id = $1', [req.user.id]);
     const wallet = walletRes.rows[0] || { balance: 0.0, points: 0 };
     
     res.json({
       ...user,
       balance: wallet.balance,
       points: parseInt(wallet.points)
     });
   } catch (error) {
     console.error('Me Fetch Error:', error);
     res.status(500).json({ error: 'Internal Error' });
    }
});

router.put("/profile", authenticateToken, async (req: any, res) => {
  try {
    const { name, avatar, language, theme, custom_instructions } = req.body;
    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (name !== undefined) { updates.push(`name = $${idx++}`); values.push(name); }
    if (avatar !== undefined) { updates.push(`avatar = $${idx++}`); values.push(avatar); }
    if (language !== undefined) { updates.push(`language = $${idx++}`); values.push(language); }
    if (theme !== undefined) { updates.push(`theme = $${idx++}`); values.push(theme); }
    if (custom_instructions !== undefined) { updates.push(`custom_instructions = $${idx++}`); values.push(custom_instructions); }

    if (updates.length === 0) return res.json({ success: true });

    values.push(req.user.id);
    const query = `UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${idx} RETURNING *`;
    
    const result = await pool.query(query, values);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Profile Update Error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

export default router;

import express from 'express';
import { pool, ledgerPool } from '../db/index.js';
import { authenticateToken, authenticateAdmin } from '../middleware/auth.js';

const router = express.Router();

router.get("/profile", authenticateToken, async (req: any, res) => {
   try {
     const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
     if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
     const user = result.rows[0];
     delete user.password_hash; // Security
     
     // Fetch wallet info
     const walletRes = await (ledgerPool || pool).query('SELECT balance, points FROM wallets WHERE user_id = $1', [req.user.id]);
     user.wallet = walletRes.rows[0] || { balance: 0, points: 0 };
     user.balance = user.wallet.balance;
     user.points = user.wallet.points;
     
     res.json(user);
   } catch (error) {
     res.status(500).json({ error: 'Internal Error' });
   }
});

router.get("/me", authenticateToken, async (req: any, res) => {
   try {
     const result = await pool.query('SELECT id, name, email, role, status, language, theme, custom_instructions FROM users WHERE id = $1', [req.user.id]);
     if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
     const user = result.rows[0];

     // Fetch balance & points for AppContext initialization
     const walletRes = await (ledgerPool || pool).query('SELECT balance, points FROM wallets WHERE user_id = $1', [req.user.id]);
     const wallet = walletRes.rows[0] || { balance: 0, points: 0 };
     
     res.json({
       ...user,
       balance: wallet.balance,
       points: wallet.points
     });
   } catch (error) {
     res.status(500).json({ error: 'Internal Error' });
    }
});

export default router;

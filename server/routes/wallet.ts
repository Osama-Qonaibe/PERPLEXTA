import express from 'express';
import { ledgerPool } from '../db/index.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.get("/", authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const result = await ledgerPool.query('SELECT balance, points FROM wallets WHERE user_id = $1', [userId]);
    if (result.rows.length === 0) {
      // Create wallet if it doesn't exist (safety)
      const newWallet = await ledgerPool.query('INSERT INTO wallets (user_id, balance, points) VALUES ($1, 0, 0) RETURNING balance, points', [userId]);
      return res.json(newWallet.rows[0]);
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('[Wallet] Fetch Error:', error);
    res.status(500).json({ error: 'Failed to fetch wallet' });
  }
});

export default router;

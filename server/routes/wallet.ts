import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { getUserWallet } from '../services/wallet.js';

const router = express.Router();

router.get("/", authenticateToken, async (req: any, res) => {
  try {
    const wallet = await getUserWallet(req.user.id);
    res.json(wallet);
  } catch (error: any) {
    console.error('[Wallet] Fetch Error:', error);
    res.status(500).json({ error: 'Failed to fetch wallet' });
  }
});

export default router;

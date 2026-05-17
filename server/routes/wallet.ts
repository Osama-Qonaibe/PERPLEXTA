import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { 
  getUserWallet, 
  getTransactionHistory, 
  checkReferralActivation
} from '../services/wallet.js';

const router = express.Router();

router.get("/", authenticateToken, async (req: any, res) => {
  try {
    await checkReferralActivation(req.user.id);
    const wallet = await getUserWallet(req.user.id);
    res.json(wallet);
  } catch (error: any) {
    console.error('[Wallet] Fetch Error:', error);
    res.status(500).json({ error: 'Failed to fetch wallet' });
  }
});

router.post("/convert-points", authenticateToken, async (req: any, res) => {
  try {
    const { amountPoints } = req.body;
    if (!amountPoints || isNaN(amountPoints)) return res.status(400).json({ error: 'Invalid amount' });
    const result = await import('../services/wallet.js').then(s => s.convertPointsToBalance(req.user.id, Number(amountPoints)));
    res.json(result);
  } catch (error: any) {
    console.error('[Wallet] Conversion Error:', error);
    res.status(400).json({ error: error.message || 'Failed to convert points' });
  }
});

router.post("/withdraw", authenticateToken, async (req: any, res) => {
  try {
    const { amountUSD, method, details } = req.body;
    if (!amountUSD || !method || !details) return res.status(400).json({ error: 'Missing information' });
    const result = await import('../services/wallet.js').then(s => s.requestWithdrawal(req.user.id, Number(amountUSD), method, details));
    res.json(result);
  } catch (error: any) {
    console.error('[Wallet] Withdrawal Error:', error);
    res.status(400).json({ error: error.message || 'Failed to request withdrawal' });
  }
});

router.get("/referral-count", authenticateToken, async (req: any, res) => {
  try {
    const count = await import('../services/wallet.js').then(s => s.getReferralCount(req.user.id));
    res.json({ count });
  } catch (error: any) {
    console.error('[Wallet] Referral Count Error:', error);
    res.status(500).json({ error: 'Failed to fetch referral count' });
  }
});

router.get("/history", authenticateToken, async (req: any, res) => {
  try {
    const type = req.query.type as string || 'all';
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;
    const history = await getTransactionHistory(req.user.id, type, limit, offset);
    res.json(history);
  } catch (error: any) {
    console.error('[Wallet] History Error:', error);
    res.status(500).json({ error: 'Failed to fetch transaction history' });
  }
});

export default router;

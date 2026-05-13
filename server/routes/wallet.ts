import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { 
  getUserWallet, 
  getTransactionHistory, 
  getPayoutAccount, 
  updatePayoutAccount,
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
    const history = await getTransactionHistory(req.user.id, type);
    res.json(history);
  } catch (error: any) {
    console.error('[Wallet] History Error:', error);
    res.status(500).json({ error: 'Failed to fetch transaction history' });
  }
});

router.get("/payout-account", authenticateToken, async (req: any, res) => {
  try {
    const account = await getPayoutAccount(req.user.id);
    res.json(account);
  } catch (error: any) {
    console.error('[Wallet] Payout Account Fetch Error:', error);
    res.status(500).json({ error: 'Failed to fetch payout account' });
  }
});

router.post("/payout-account", authenticateToken, async (req: any, res) => {
  try {
    const { type, details } = req.body;
    if (!type || !details) return res.status(400).json({ error: 'Missing type or details' });
    const result = await updatePayoutAccount(req.user.id, type, details);
    res.json(result);
  } catch (error: any) {
    console.error('[Wallet] Payout Account Update Error:', error);
    res.status(500).json({ error: 'Failed to update payout account' });
  }
});

export default router;

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
    // Proactively check activation whenever wallet is fetched
    await checkReferralActivation(req.user.id);
    const wallet = await getUserWallet(req.user.id);
    res.json(wallet);
  } catch (error: any) {
    console.error('[Wallet] Fetch Error:', error);
    res.status(500).json({ error: 'Failed to fetch wallet' });
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

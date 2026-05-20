import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { 
  getUserWallet, 
  getTransactionHistory, 
  checkReferralActivation,
  depositToWallet
} from '../services/wallet.js';

const router = express.Router();

router.get("/", authenticateToken, async (req: any, res) => {
  try {
    await checkReferralActivation(req.user.id);
    const wallet = await getUserWallet(req.user.id);
    const { getEconomySettings } = await import('../services/wallet.js');
    const ecoSettings = await getEconomySettings();
    res.json({
      ...wallet,
      crypto_address: ecoSettings.crypto_address,
      bank_name: ecoSettings.bank_name,
      bank_recipient: ecoSettings.bank_recipient,
      bank_iban: ecoSettings.bank_iban,
      bank_swift: ecoSettings.bank_swift,
      paypal_email: ecoSettings.paypal_email
    });
  } catch (error: any) {
    console.error('[Wallet] Fetch Error:', error);
    res.status(500).json({ error: 'Failed to fetch wallet' });
  }
});

// Insecure instant deposit route removed to prevent resource leaks/bypassing admin verification.
// All manual deposits must go through the secure /deposit-manual request pipeline for administrator approval.

router.post("/deposit-manual", authenticateToken, async (req: any, res) => {
  try {
    const { amount, method, reference_id, proof_url } = req.body;
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Invalid deposit amount', error_ar: 'قيمة الإيداع غير صالحة' });
    }
    if (!method) {
      return res.status(400).json({ error: 'Method is required', error_ar: 'طريقة الدفع مطلوبة' });
    }
    if (!reference_id) {
      return res.status(400).json({ error: 'Transaction reference is required', error_ar: 'الرقم المرجعي أو الإثبات مطلوب' });
    }

    const { ledgerPool } = await import('../db/index.js');
    if (!ledgerPool) {
      return res.status(500).json({ error: 'Ledger database not available' });
    }

    const proofPayload = JSON.stringify({
      reference_id,
      image_url: proof_url || ''
    });

    const query = `
      INSERT INTO deposit_requests (user_id, amount, method, proof_url, status)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const result = await ledgerPool.query(query, [
      req.user.id,
      Number(amount),
      method,
      proofPayload,
      'pending'
    ]);
    res.json({ success: true, request: result.rows[0] });
  } catch (error: any) {
    console.error('[Wallet] Deposit Manual Error:', error);
    res.status(500).json({ error: error.message || 'Failed to submit manual deposit request' });
  }
});

router.get("/manual-deposits", authenticateToken, async (req: any, res) => {
  try {
    const { ledgerPool } = await import('../db/index.js');
    if (!ledgerPool) {
      return res.status(500).json({ error: 'Ledger database not available' });
    }
    const result = await ledgerPool.query(
      'SELECT id, amount, currency, method, status, rejection_reason, created_at, proof_url FROM deposit_requests WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error: any) {
    console.error('[Wallet] Fetch Manual Deposits Error:', error);
    res.status(500).json({ error: 'Failed to retrieve manual deposit requests' });
  }
});

router.post("/clear", authenticateToken, async (req: any, res) => {
  try {
    const { ledgerPool } = await import('../db/index.js');
    if (!ledgerPool) {
      return res.status(500).json({ error: 'Ledger database not available' });
    }
    await ledgerPool.query(
      'UPDATE ledger_transactions SET is_hidden = true WHERE user_id = $1',
      [req.user.id]
    );
    res.json({ success: true, message: 'All transactions successfully archived' });
  } catch (error: any) {
    console.error('[Wallet] Clear History Error:', error);
    res.status(500).json({ error: 'Failed to clear/archive transaction history' });
  }
});

router.post("/hide", authenticateToken, async (req: any, res) => {
  try {
    const { transactionId } = req.body;
    if (!transactionId) {
      return res.status(400).json({ error: 'Transaction ID is required' });
    }
    const { ledgerPool } = await import('../db/index.js');
    if (!ledgerPool) {
      return res.status(500).json({ error: 'Ledger database not available' });
    }
    await ledgerPool.query(
      'UPDATE ledger_transactions SET is_hidden = true WHERE id = $1 AND user_id = $2',
      [transactionId, req.user.id]
    );
    res.json({ success: true, message: 'Transaction successfully archived' });
  } catch (error: any) {
    console.error('[Wallet] Hide Transaction Error:', error);
    res.status(500).json({ error: 'Failed to archive transaction' });
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

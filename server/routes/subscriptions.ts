import express from 'express';
import { pool, ledgerPool } from '../db/index.js';
import { authenticateToken } from '../middleware/auth.js';
import { createNotification } from '../services/notifications.js';

const router = express.Router();

router.post("/pay-with-balance", authenticateToken, async (req: any, res) => {
  try {
    const { planId, billingCycle } = req.body;
    const userId = req.user.id;

    // 1. Get plan details
    const planRes = await pool.query('SELECT * FROM plans WHERE id = $1 AND is_active = true', [planId]);
    if (planRes.rows.length === 0) return res.status(404).json({ error: 'Plan not found or inactive' });
    const plan = planRes.rows[0];

    // 2. Determine price
    const price = billingCycle === 'annual' ? Number(plan.annual_price) : Number(plan.monthly_price);
    
    // 3. Get user wallet (Ledger DB)
    const walletRes = await ledgerPool.query('SELECT id, balance FROM wallets WHERE user_id = $1', [userId]);
    if (walletRes.rows.length === 0) return res.status(400).json({ error: 'Wallet not found' });
    const wallet = walletRes.rows[0];

    if (Number(wallet.balance) < price) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // 4. Atomic transaction (in Ledger DB)
    const ledgerClient = await ledgerPool.connect();
    try {
      await ledgerClient.query('BEGIN');
      
      // Deduct balance
      await ledgerClient.query(
        'UPDATE wallets SET balance = balance - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [price, wallet.id]
      );

      // Record transaction
      await ledgerClient.query(
        'INSERT INTO ledger_transactions (wallet_id, amount, transaction_type, description) VALUES ($1, $2, $3, $4)',
        [wallet.id, -price, 'subscription_payment', `Payment for ${plan.name_en} (${billingCycle})`]
      );

      await ledgerClient.query('COMMIT');
    } catch (e) {
      await ledgerClient.query('ROLLBACK');
      throw e;
    } finally {
      ledgerClient.release();
    }

    // 5. Update subscription (Core DB)
    const cycleDays = billingCycle === 'annual' ? 365 : 30;
    const periodEnd = new Date();
    periodEnd.setDate(periodEnd.getDate() + cycleDays);

    await pool.query(`
      INSERT INTO subscriptions (user_id, plan_id, status, billing_period, current_period_end)
      VALUES ($1, $2, 'active', $3, $4)
      ON CONFLICT (user_id) DO UPDATE SET
        plan_id = EXCLUDED.plan_id,
        status = 'active',
        billing_period = EXCLUDED.billing_period,
        current_period_end = EXCLUDED.current_period_end,
        updated_at = CURRENT_TIMESTAMP
    `, [userId, planId, billingCycle, periodEnd]);

    // 6. Notify user
    await createNotification(
      userId, 
      'success',
      'Subscription Activated',
      'تم تفعيل الاشتراك',
      `Your ${plan.name_en} subscription is now active.`,
      `اشتراكك في باقة ${plan.name_ar} فعال الآن.`
    );

    res.json({ success: true, message: 'Subscription activated' });
  } catch (error) {
    console.error('[Subscriptions] Payment Error:', error);
    res.status(500).json({ error: 'Failed to process payment' });
  }
});

router.get("/status", authenticateToken, async (req: any, res) => {
  try {
    const result = await pool.query(`
      SELECT s.*, p.name_en as plan_name_en, p.name_ar as plan_name_ar, p.limits, p.color as plan_color
      FROM subscriptions s
      JOIN plans p ON s.plan_id = p.id
      WHERE s.user_id = $1
    `, [req.user.id]);
    res.json(result.rows[0] || null);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch status' });
  }
});

export default router;

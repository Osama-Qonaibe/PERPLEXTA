import express from 'express';
import Stripe from 'stripe';
import { pool, ledgerPool } from '../../db/index.js';
import { authenticateAdmin } from '../../middleware/auth.js';
import { decrypt } from '../../utils/crypto.js';
import { auditLog } from '../../utils/logger.js';

const router = express.Router();

router.get("/financial-radar", authenticateAdmin, async (req, res) => {
  try {
    const totalBalance = await ledgerPool.query('SELECT sum(balance) as total FROM wallets');
    const totalTransactions = await ledgerPool.query('SELECT count(*) FROM ledger_transactions');
    const recentVolume = await ledgerPool.query("SELECT sum(amount) as total FROM ledger_transactions WHERE created_at > now() - interval '24 hours'");
    const recentTx = await ledgerPool.query('SELECT * FROM ledger_transactions ORDER BY created_at DESC LIMIT 50');
    
    let transactions = recentTx.rows;
    try {
      const userIds = [...new Set(transactions.map((t: any) => t.user_id))];
      if (userIds.length > 0) {
        const usersRes = await pool.query('SELECT id, name FROM users WHERE id = ANY($1)', [userIds]);
        const userMap = new Map(usersRes.rows.map((u: any) => [u.id, u.name]));
        transactions = transactions.map((t: any) => ({
          ...t,
          user_name: userMap.get(t.user_id) || 'Unknown User'
        }));
      }
    } catch (uErr) {
      console.error('[Economy] User enrichment failed:', uErr);
    }

    res.json({
      stats: {
        total_liquidity: parseFloat(totalBalance.rows[0].total || 0),
        transaction_count: parseInt(totalTransactions.rows[0].count),
        volume_24h: parseFloat(recentVolume.rows[0].total || 0),
        health_score: 100
      },
      transactions
    });
  } catch {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get("/wallet-diagnostics", authenticateAdmin, async (req, res) => {
  try {
    const walletData = await ledgerPool.query('SELECT * FROM wallets WHERE balance < 0');
    let anomalies = walletData.rows;
    try {
      const userIds = anomalies.map((w: any) => w.user_id);
      if (userIds.length > 0) {
        const usersRes = await pool.query('SELECT id, name, email FROM users WHERE id = ANY($1)', [userIds]);
        const userMap = new Map(usersRes.rows.map((u: any) => [u.id, u]));
        anomalies = anomalies.map((w: any) => {
          const user = userMap.get(w.user_id) as any;
          return { ...w, user: user ? { id: user.id, name: user.name, email: user.email } : null };
        });
      }
    } catch {}
    res.json(anomalies);
  } catch {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get("/wallet-alerts", authenticateAdmin, async (req, res) => {
  try {
    const alerts = await ledgerPool.query(`
      SELECT * FROM ledger_transactions WHERE amount > 1000 OR transaction_type = 'system_adjustment'
      ORDER BY created_at DESC LIMIT 20
    `);
    res.json(alerts.rows);
  } catch {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post("/reconcile-wallet/:id", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const walletRes = await ledgerPool.query('SELECT id FROM wallets WHERE user_id = $1', [id]);
    if (walletRes.rows.length === 0) return res.status(404).json({ error: 'Wallet not found' });
    const walletId = walletRes.rows[0].id;
    const history = await ledgerPool.query("SELECT sum(amount) as total FROM ledger_transactions WHERE wallet_id = $1 AND status = 'success'", [walletId]);
    const correctBalance = parseFloat(history.rows[0].total || 0);
    await ledgerPool.query('UPDATE wallets SET balance = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [correctBalance, walletId]);
    await auditLog((req as any).user?.id, 'Reconcile Wallet', 'finance', { targetUser: id, newBalance: correctBalance });
    res.json({ success: true, new_balance: correctBalance });
  } catch {
    res.status(500).json({ error: 'Reconciliation failed' });
  }
});

router.delete("/financial/all", authenticateAdmin, async (req, res) => {
  try {
    const countRes = await ledgerPool.query('SELECT COUNT(*) FROM ledger_transactions');
    await ledgerPool.query('DELETE FROM ledger_transactions');
    await auditLog((req as any).user?.id, 'Purge All Financial Transactions', 'finance', { deletedCount: parseInt(countRes.rows[0].count) });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Purge failed' });
  }
});

router.delete("/ledger-transactions/:id", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await ledgerPool.query('DELETE FROM ledger_transactions WHERE id = $1', [id]);
    await auditLog((req as any).user?.id, 'Delete Ledger Transaction', 'finance', { transactionId: id });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Delete failed' });
  }
});

router.get("/economy", authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT points_per_dollar, min_payout_usd, min_deposit_usd, referral_bonus_percent, welcome_bonus_points, referral_bonus_points, conversion_rate FROM system_settings LIMIT 1');
    res.json(result.rows[0] || {});
  } catch {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post("/economy", authenticateAdmin, async (req, res) => {
  try {
    const { points_per_dollar, min_payout_usd, min_deposit_usd, referral_bonus_percent, welcome_bonus_points, referral_bonus_points, conversion_rate } = req.body;
    const min_withdrawal_cents = Math.round((min_payout_usd || 10) * 100);
    const existing = await pool.query('SELECT id FROM system_settings LIMIT 1');
    if (existing.rows.length > 0) {
      await pool.query(`
        UPDATE system_settings SET
          points_per_dollar = $1, min_payout_usd = $2, min_deposit_usd = $3, referral_bonus_percent = $4,
          welcome_bonus_points = $5, referral_bonus_points = $6, conversion_rate = $7, min_withdrawal_cents = $8, updated_at = CURRENT_TIMESTAMP
        WHERE id = $9
      `, [points_per_dollar, min_payout_usd, min_deposit_usd, referral_bonus_percent, welcome_bonus_points, referral_bonus_points, conversion_rate, min_withdrawal_cents, existing.rows[0].id]);
    } else {
      await pool.query(`
        INSERT INTO system_settings (points_per_dollar, min_payout_usd, min_deposit_usd, referral_bonus_percent, welcome_bonus_points, referral_bonus_points, conversion_rate, min_withdrawal_cents, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
      `, [points_per_dollar, min_payout_usd, min_deposit_usd, referral_bonus_percent, welcome_bonus_points, referral_bonus_points, conversion_rate, min_withdrawal_cents]);
    }
    await auditLog((req as any).user?.id, 'Update Economy Settings', 'finance', req.body);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get("/plans", authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM plans ORDER BY monthly_price ASC');
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post("/plans", authenticateAdmin, async (req, res) => {
  try {
    const { name_en, name_ar, desc_en, desc_ar, badge, discount, is_active, is_visible, monthly_price, annual_price, color, features, limits } = req.body;
    await pool.query(`
      INSERT INTO plans (name_en, name_ar, desc_en, desc_ar, badge, discount, is_active, is_visible, monthly_price, annual_price, color, features, limits)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    `, [name_en, name_ar, desc_en, desc_ar, badge, discount, is_active, is_visible, monthly_price, annual_price, color, JSON.stringify(features), JSON.stringify(limits)]);
    await auditLog((req as any).user?.id, 'Create Plan', 'finance', { name_en });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.put("/plans/:id", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name_en, name_ar, desc_en, desc_ar, badge, discount, is_active, is_visible, monthly_price, annual_price, color, features, limits } = req.body;
    await pool.query(`
      UPDATE plans SET name_en = $1, name_ar = $2, desc_en = $3, desc_ar = $4, badge = $5, discount = $6, is_active = $7, is_visible = $8, monthly_price = $9, annual_price = $10, color = $11, features = $12, limits = $13, updated_at = CURRENT_TIMESTAMP
      WHERE id = $14
    `, [name_en, name_ar, desc_en, desc_ar, badge, discount, is_active, is_visible, monthly_price, annual_price, color, JSON.stringify(features), JSON.stringify(limits), id]);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.delete("/plans/:id", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM plans WHERE id = $1', [id]);
    await auditLog((req as any).user?.id, 'Delete Plan', 'finance', { id });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post("/settings/stripe/verify", authenticateAdmin, async (req, res) => {
  try {
    const settings = await pool.query('SELECT stripe_secret_key FROM system_settings LIMIT 1');
    if (!settings.rows[0]?.stripe_secret_key) return res.status(400).json({ error: 'Not configured' });
    const secretKey = decrypt(settings.rows[0].stripe_secret_key);
    const stripe = new Stripe(secretKey, { apiVersion: '2025-01-27.acacia' as any });
    await stripe.balance.retrieve();
    await pool.query('UPDATE system_settings SET stripe_status = $1, stripe_last_verified_at = CURRENT_TIMESTAMP', ['verified']);
    res.json({ success: true });
  } catch {
    res.status(400).json({ error: 'Verification failed' });
  }
});

export default router;

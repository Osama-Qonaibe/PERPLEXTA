import { Router } from "express";
import { pool, ledgerPool } from "../../db/index.js";
import { authenticate, adminOnly } from "../../middleware/auth.js";
import Stripe from 'stripe';
import { encrypt, decrypt } from "../../utils/crypto.js";
import { invalidateStripeClient } from "../../services/payments.js";

const router = Router();
router.use(authenticate, adminOnly);

async function auditLog(userId: any, action: string, type: string, details: object) {
  try {
    await pool.query(
      'INSERT INTO system_logs (user_id, action, type, details) VALUES ($1, $2, $3, $4)',
      [userId, action, type, JSON.stringify(details)]
    );
  } catch {}
}

// ... existing routes ...

// GET /api/admin/financial-radar
router.get("/financial-radar", async (req, res) => {
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
      console.error('[Admin] Failed to enrich transactions with user names:', uErr);
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
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/admin/wallet-diagnostics
router.get("/wallet-diagnostics", async (req, res) => {
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
          return {
            ...w,
            user: user ? { id: user.id, name: user.name, email: user.email } : null
          };
        });
      }
    } catch (uErr) {
      console.error('[Admin] Failed to enrich wallet anomalies:', uErr);
    }
    
    res.json(anomalies);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/admin/wallet-alerts
router.get("/wallet-alerts", async (req, res) => {
  try {
    const alerts = await ledgerPool.query(`
      SELECT * FROM ledger_transactions 
      WHERE amount > 1000 OR transaction_type = 'system_adjustment'
      ORDER BY created_at DESC LIMIT 20
    `);
    res.json(alerts.rows);
  } catch {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// DELETE /api/admin/ledger-transactions/:id
router.delete("/ledger-transactions/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await ledgerPool.query('DELETE FROM ledger_transactions WHERE id = $1', [id]);
    await auditLog((req as any).user?.id, 'Delete Ledger Transaction', 'finance', { transactionId: id });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Delete failed' });
  }
});

// DELETE /api/admin/financial/all
router.delete("/financial/all", async (req, res) => {
  try {
    const countRes = await ledgerPool.query('SELECT COUNT(*) FROM ledger_transactions');
    await ledgerPool.query('DELETE FROM ledger_transactions');
    await auditLog((req as any).user?.id, 'Purge All Financial Transactions', 'finance', { deletedCount: parseInt(countRes.rows[0].count) });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Purge failed' });
  }
});

// Economy & Stripe Settings
router.get("/economy", async (req, res) => {
  try {
    const result = await pool.query('SELECT points_per_dollar, min_payout_usd, min_deposit_usd, referral_bonus_percent, welcome_bonus_points, referral_bonus_points, conversion_rate FROM system_settings LIMIT 1');
    const settings = result.rows[0] || {};
    res.json(settings);
  } catch {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post("/economy", async (req, res) => {
  try {
    const { 
      points_per_dollar = 1000, 
      min_payout_usd = 10, 
      min_deposit_usd = 5, 
      referral_bonus_percent = 10, 
      welcome_bonus_points = 600, 
      referral_bonus_points = 1000, 
      conversion_rate = 0.001 
    } = req.body;

    const min_withdrawal_cents = Math.round(min_payout_usd * 100);

    const existing = await pool.query('SELECT id FROM system_settings LIMIT 1');

    if (existing.rows.length > 0) {
      await pool.query(`
        UPDATE system_settings SET
          points_per_dollar = $1,
          min_payout_usd = $2,
          min_deposit_usd = $3,
          referral_bonus_percent = $4,
          welcome_bonus_points = $5,
          referral_bonus_points = $6,
          conversion_rate = $7,
          min_withdrawal_cents = $8,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $9
      `, [
        points_per_dollar, min_payout_usd, min_deposit_usd, referral_bonus_percent,
        welcome_bonus_points, referral_bonus_points, conversion_rate, min_withdrawal_cents,
        existing.rows[0].id
      ]);
    } else {
      await pool.query(`
        INSERT INTO system_settings (
          points_per_dollar, min_payout_usd, min_deposit_usd, referral_bonus_percent,
          welcome_bonus_points, referral_bonus_points, conversion_rate, min_withdrawal_cents, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
      `, [
        points_per_dollar, min_payout_usd, min_deposit_usd, referral_bonus_percent,
        welcome_bonus_points, referral_bonus_points, conversion_rate, min_withdrawal_cents
      ]);
    }
    
    await auditLog((req as any).user?.id, 'Update Economy Settings', 'finance', req.body);
    res.json({ success: true, message: 'Finance settings updated successfully' });
  } catch {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post("/settings/stripe", async (req, res) => {
  try {
    const { secretKey, publishableKey, webhookSecret, isLiveMode } = req.body;
    
    const encryptedSecret = secretKey ? encrypt(secretKey) : null;
    const encryptedWebhook = webhookSecret ? encrypt(webhookSecret) : null;
    
    await pool.query(`
      UPDATE system_settings SET 
        stripe_secret_key = $1, 
        stripe_publishable_key = $2, 
        stripe_webhook_secret = $3, 
        stripe_live_mode = $4,
        stripe_status = 'verified',
        stripe_last_verified_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    `, [encryptedSecret, publishableKey, encryptedWebhook, isLiveMode]);
    
    await auditLog((req as any).user?.id, 'Update Stripe Settings', 'finance', { isLiveMode, publishableKey });
    invalidateStripeClient();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Update failed' });
  }
});

router.post("/settings/stripe/verify", async (req, res) => {
  try {
    const settings = await pool.query('SELECT stripe_secret_key FROM system_settings LIMIT 1');
    if (!settings.rows[0]?.stripe_secret_key) {
      return res.status(400).json({ error: 'Stripe secret key not configured' });
    }

    const secretKey = decrypt(settings.rows[0].stripe_secret_key);
    const stripe = new Stripe(secretKey, { apiVersion: '2025-01-27.acacia' as any });
    
    await stripe.balance.retrieve();
    
    await pool.query('UPDATE system_settings SET stripe_status = $1, stripe_last_verified_at = CURRENT_TIMESTAMP', ['verified']);
    res.json({ success: true, message: 'Verified successfully' });
  } catch {
    res.status(400).json({ error: 'Verification failed' });
  }
});

export default router;


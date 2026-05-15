import { Router } from 'express';
import { adminOnly } from '../../middleware/adminOnly';
import { auth } from '../../middleware/auth';
import pool from '../../config/database';
import ledgerPool from '../../config/ledger';

const router = Router();

router.use(auth, adminOnly);

router.get('/transactions', async (req, res) => {
  const { page = '1', limit = '50', search } = req.query as Record<string, string>;
  const offset = (Number(page) - 1) * Number(limit);
  try {
    const result = await ledgerPool.query(
      `SELECT lt.*, u.name, u.email
       FROM ledger_transactions lt
       LEFT JOIN users u ON u.id = lt.user_id
       ${search ? 'WHERE u.name ILIKE $3 OR u.email ILIKE $3' : ''}
       ORDER BY lt.created_at DESC
       LIMIT $1 OFFSET $2`,
      search ? [Number(limit), offset, `%${search}%`] : [Number(limit), offset]
    );
    res.json({ success: true, transactions: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch transactions' });
  }
});

router.get('/withdrawals', async (req, res) => {
  try {
    const result = await ledgerPool.query(
      `SELECT w.*, u.name, u.email
       FROM withdrawal_requests w
       JOIN users u ON u.id = w.user_id
       ORDER BY w.created_at DESC`
    );
    res.json({ success: true, withdrawals: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch withdrawals' });
  }
});

router.patch('/withdrawals/:id', async (req, res) => {
  const { id } = req.params;
  const { action } = req.body as { action: 'approve' | 'reject' };
  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({ success: false, message: 'Invalid action' });
  }
  try {
    const status = action === 'approve' ? 'approved' : 'rejected';
    await ledgerPool.query(
      'UPDATE withdrawal_requests SET status = $1, updated_at = NOW() WHERE id = $2',
      [status, id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update withdrawal' });
  }
});

router.get('/economy', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM economy_settings LIMIT 1');
    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Economy settings not configured' });
    }
    res.json({ success: true, settings: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch economy settings' });
  }
});

router.put('/economy', async (req, res) => {
  const settings = req.body as Record<string, unknown>;
  try {
    await pool.query(
      `INSERT INTO economy_settings (id, data, updated_at) VALUES (1, $1, NOW())
       ON CONFLICT (id) DO UPDATE SET data = $1, updated_at = NOW()`,
      [JSON.stringify(settings)]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to save economy settings' });
  }
});

router.get('/alerts', async (req, res) => {
  try {
    const result = await ledgerPool.query(
      'SELECT * FROM wallet_alerts ORDER BY created_at DESC LIMIT 100'
    );
    res.json({ success: true, alerts: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch alerts' });
  }
});

router.delete('/alerts', async (req, res) => {
  try {
    await ledgerPool.query('DELETE FROM wallet_alerts');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to clear alerts' });
  }
});

export default router;

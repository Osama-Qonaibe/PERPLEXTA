import { Router } from 'express';
import { adminOnly } from '../../middleware/adminOnly';
import { auth } from '../../middleware/auth';
import pool from '../../config/database';

const router = Router();

router.use(auth, adminOnly);

router.get('/', async (req, res) => {
  const { search, page = '1', limit = '20' } = req.query as Record<string, string>;
  const offset = (Number(page) - 1) * Number(limit);
  try {
    const where = search
      ? `WHERE u.name ILIKE $3 OR u.email ILIKE $3`
      : '';
    const params = search
      ? [Number(limit), offset, `%${search}%`]
      : [Number(limit), offset];
    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.status, u.created_at, u.last_login,
              s.plan_id, s.status as sub_status
       FROM users u
       LEFT JOIN subscriptions s ON s.user_id = u.id AND s.status = 'active'
       ${where}
       ORDER BY u.created_at DESC
       LIMIT $1 OFFSET $2`,
      params
    );
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM users u ${where}`,
      search ? [`%${search}%`] : []
    );
    res.json({
      success: true,
      users: result.rows,
      total: Number(countResult.rows[0].count),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
});

router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT u.*, s.plan_id, s.status as sub_status, s.current_period_end
       FROM users u
       LEFT JOIN subscriptions s ON s.user_id = u.id AND s.status = 'active'
       WHERE u.id = $1`,
      [id]
    );
    if (!result.rows[0]) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch user' });
  }
});

router.patch('/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body as { status: 'active' | 'suspended' };
  if (!['active', 'suspended'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status' });
  }
  try {
    await pool.query('UPDATE users SET status = $1 WHERE id = $2', [status, id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update status' });
  }
});

router.patch('/:id/kyc', async (req, res) => {
  const { id } = req.params;
  const { action, reason } = req.body as { action: 'approve' | 'reject'; reason?: string };
  try {
    const status = action === 'approve' ? 'verified' : 'rejected';
    await pool.query(
      'UPDATE users SET kyc_status = $1, kyc_rejection_reason = $2 WHERE id = $3',
      [status, reason ?? null, id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update KYC' });
  }
});

router.patch('/:id/plan', async (req, res) => {
  const { id } = req.params;
  const { planId } = req.body as { planId: string };
  try {
    await pool.query(
      `INSERT INTO subscriptions (user_id, plan_id, status, created_at, current_period_end)
       VALUES ($1, $2, 'active', NOW(), NOW() + INTERVAL '30 days')
       ON CONFLICT (user_id) DO UPDATE SET plan_id = $2, status = 'active', updated_at = NOW()`,
      [id, planId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to change plan' });
  }
});

export default router;

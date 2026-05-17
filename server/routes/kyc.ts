import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { pool, ledgerPool } from '../db/index.js';

const router = express.Router();

router.post("/submit", authenticateToken, async (req: any, res) => {
  const client = await pool.connect();
  const ledgerTarget = ledgerPool || pool;
  try {
    const { fullName, selfie } = req.body;
    if (!fullName || !selfie) return res.status(400).json({ error: 'Missing full name or selfie' });

    await client.query('BEGIN');

    // 1. Create a request entry in Ledger DB (Absolute Financial Separation)
    await ledgerTarget.query(
      'INSERT INTO kyc_requests (user_id, full_name, selfie_url, status) VALUES ($1, $2, $3, $4) ON CONFLICT (user_id) DO UPDATE SET full_name = EXCLUDED.full_name, selfie_url = EXCLUDED.selfie_url, status = EXCLUDED.status, updated_at = CURRENT_TIMESTAMP',
      [req.user.id, fullName, selfie, 'pending']
    );

    // 2. Update user status in Core DB for frontend reactivity
    await client.query(
      'UPDATE users SET kyc_status = $1, kyc_required = false, kyc_submitted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['pending', req.user.id]
    );

    await client.query('COMMIT');
    res.json({ success: true, status: 'pending' });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('[KYC] Submission Error:', error);
    res.status(500).json({ error: 'Failed to submit KYC' });
  } finally {
    client.release();
  }
});

export default router;

import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { pool } from '../db/index.js';

const router = express.Router();

router.post("/submit", authenticateToken, async (req: any, res) => {
  const client = await pool.connect();
  try {
    const { fullName, selfie } = req.body;
    if (!fullName || !selfie) return res.status(400).json({ error: 'Missing full name or selfie' });

    await client.query('BEGIN');

    // Create a request entry
    await client.query(
      'INSERT INTO kyc_requests (user_id, full_name, selfie_url, status) VALUES ($1, $2, $3, $4)',
      [req.user.id, fullName, selfie, 'pending']
    );

    // Update user status
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

import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { pool } from '../db/index.js';

const router = express.Router();

router.post("/submit", authenticateToken, async (req: any, res) => {
  try {
    const { fullName, selfie } = req.body;
    if (!fullName || !selfie) return res.status(400).json({ error: 'Missing full name or selfie' });

    await pool.query(
      'UPDATE users SET kyc_status = $1, kyc_required = false, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['pending', req.user.id]
    );

    res.json({ success: true, status: 'pending' });
  } catch (error: any) {
    console.error('[KYC] Submission Error:', error);
    res.status(500).json({ error: 'Failed to submit KYC' });
  }
});

export default router;

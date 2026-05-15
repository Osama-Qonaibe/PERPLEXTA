import { Router } from 'express';
import { adminOnly } from '../../middleware/adminOnly';
import { auth } from '../../middleware/auth';
import pool from '../../config/database';
import { CryptoService } from '../../services/crypto.service';

const router = Router();

router.use(auth, adminOnly);

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT provider, status, has_key, daily_budget, daily_used, updated_at
       FROM api_keys ORDER BY provider`
    );
    res.json({ success: true, keys: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch keys' });
  }
});

router.post('/', async (req, res) => {
  const { provider, apiKey, budget } = req.body as {
    provider: string;
    apiKey: string;
    budget?: number;
  };
  if (!provider || !apiKey) {
    return res.status(400).json({ success: false, message: 'provider and apiKey required' });
  }
  try {
    const encrypted = CryptoService.encrypt(apiKey);
    await pool.query(
      `INSERT INTO api_keys (provider, encrypted_key, has_key, status, daily_budget)
       VALUES ($1, $2, true, 'active', $3)
       ON CONFLICT (provider) DO UPDATE
       SET encrypted_key = $2, has_key = true, status = 'active', daily_budget = $3, updated_at = NOW()`,
      [provider, encrypted, budget ?? null]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to save key' });
  }
});

router.delete('/:provider', async (req, res) => {
  const { provider } = req.params;
  try {
    await pool.query(
      `UPDATE api_keys SET encrypted_key = NULL, has_key = false, status = 'missing' WHERE provider = $1`,
      [provider]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete key' });
  }
});

router.post('/:provider/test', async (req, res) => {
  const { provider } = req.params;
  try {
    const result = await pool.query(
      'SELECT encrypted_key FROM api_keys WHERE provider = $1',
      [provider]
    );
    if (!result.rows[0]?.encrypted_key) {
      return res.json({ success: false, message: 'Key not found' });
    }
    res.json({ success: true, message: 'Key exists' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Test failed' });
  }
});

router.patch('/:provider/budget', async (req, res) => {
  const { provider } = req.params;
  const { budget } = req.body as { budget: number };
  try {
    await pool.query(
      'UPDATE api_keys SET daily_budget = $1, updated_at = NOW() WHERE provider = $2',
      [budget, provider]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update budget' });
  }
});

export default router;

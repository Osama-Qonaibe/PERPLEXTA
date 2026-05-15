import { Router } from 'express';
import { adminOnly } from '../../middleware/adminOnly';
import { auth } from '../../middleware/auth';
import pool from '../../config/database';

const router = Router();

router.use(auth, adminOnly);

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT tool_key, primary_provider, primary_model, fallback1, fallback2, fallback3, cost_points, updated_at FROM orchestrator_config ORDER BY tool_key'
    );
    res.json({ success: true, config: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch orchestrator config' });
  }
});

router.put('/:toolKey', async (req, res) => {
  const { toolKey } = req.params;
  const { primaryProvider, primaryModel, fallback1, fallback2, fallback3, costPoints } = req.body as {
    primaryProvider: string;
    primaryModel: string;
    fallback1?: string;
    fallback2?: string;
    fallback3?: string;
    costPoints?: number;
  };
  try {
    await pool.query(
      `INSERT INTO orchestrator_config (tool_key, primary_provider, primary_model, fallback1, fallback2, fallback3, cost_points, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       ON CONFLICT (tool_key) DO UPDATE
       SET primary_provider = $2, primary_model = $3, fallback1 = $4, fallback2 = $5, fallback3 = $6,
           cost_points = $7, updated_at = NOW()`,
      [toolKey, primaryProvider, primaryModel, fallback1 ?? null, fallback2 ?? null, fallback3 ?? null, costPoints ?? 0]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to save orchestrator config' });
  }
});

export default router;

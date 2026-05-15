import { Router } from 'express';
import { adminOnly } from '../../middleware/adminOnly';
import { auth } from '../../middleware/auth';
import pool from '../../config/database';
import ledgerPool from '../../config/ledger';

const router = Router();

router.use(auth, adminOnly);

router.get('/status', async (req, res) => {
  try {
    const [core, ledger] = await Promise.all([
      pool.query('SELECT 1').then(() => 'connected').catch(() => 'disconnected'),
      ledgerPool.query('SELECT 1').then(() => 'connected').catch(() => 'disconnected'),
    ]);
    res.json({ success: true, core, ledger });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Status check failed' });
  }
});

router.post('/test', async (req, res) => {
  const { db } = req.body as { db: 'core' | 'ledger' };
  try {
    const target = db === 'ledger' ? ledgerPool : pool;
    await target.query('SELECT 1');
    res.json({ success: true, message: 'Connection successful' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Connection failed' });
  }
});

export default router;

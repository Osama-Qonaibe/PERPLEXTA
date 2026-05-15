import { Router } from 'express';
import { adminOnly } from '../../middleware/adminOnly';
import { auth } from '../../middleware/auth';
import pool from '../../config/database';

const router = Router();

router.use(auth, adminOnly);

router.get('/', async (req, res) => {
  try {
    const [users, revenue, generations, activity] = await Promise.all([
      pool.query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL \'24 hours\') as today FROM users'),
      pool.query('SELECT COALESCE(SUM(amount), 0) as monthly FROM ledger_transactions WHERE created_at > date_trunc(\'month\', NOW()) AND type = \'subscription\''),
      pool.query('SELECT COUNT(*) as total FROM ai_generations WHERE created_at > date_trunc(\'month\', NOW())'),
      pool.query('SELECT user_id, action, created_at FROM activity_log ORDER BY created_at DESC LIMIT 50'),
    ]);
    res.json({
      success: true,
      stats: {
        totalUsers: Number(users.rows[0].total),
        activeUsersToday: Number(users.rows[0].today),
        monthlyRevenue: Number(revenue.rows[0].monthly),
        aiGenerations: Number(generations.rows[0].total),
      },
      activity: activity.rows,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch stats' });
  }
});

router.delete('/activity', async (req, res) => {
  const { type } = req.query as { type?: string };
  try {
    if (type) {
      await pool.query('DELETE FROM activity_log WHERE action = $1', [type]);
    } else {
      await pool.query('DELETE FROM activity_log');
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to clear activity' });
  }
});

export default router;

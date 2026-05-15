import { Router } from 'express';
import { adminOnly } from '../../middleware/adminOnly';
import { auth } from '../../middleware/auth';
import pool from '../../config/database';

const router = Router();

router.use(auth, adminOnly);

router.delete('/chats', async (req, res) => {
  try {
    await pool.query('DELETE FROM messages');
    await pool.query('DELETE FROM conversations');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to clear chats' });
  }
});

router.delete('/notifications/prune', async (req, res) => {
  try {
    await pool.query(
      "DELETE FROM notifications WHERE created_at < NOW() - INTERVAL '30 days'"
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to prune notifications' });
  }
});

router.delete('/notifications/all', async (req, res) => {
  try {
    await pool.query('DELETE FROM notifications');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to clear notifications' });
  }
});

export default router;

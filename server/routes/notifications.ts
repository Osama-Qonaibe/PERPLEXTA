import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { getUserNotifications, markNotificationsAsRead } from '../services/notifications.js';
import { pool } from '../db/index.js';

const router = express.Router();

router.get("/", authenticateToken, async (req: any, res) => {
  try {
    const notifications = await getUserNotifications(req.user.id);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

const handleReadAll = async (req: any, res: any) => {
  try {
    const result = await markNotificationsAsRead(req.user.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Update failed' });
  }
};
router.post("/read-all", authenticateToken, handleReadAll);
router.patch("/read-all", authenticateToken, handleReadAll);

router.patch("/:id/read", authenticateToken, async (req: any, res) => {
  try {
    const { id } = req.params;
    await pool.query(
      'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    console.error('[Notification] Mark read error:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

router.delete("/all", authenticateToken, async (req: any, res) => {
  try {
    await pool.query(
      'DELETE FROM notifications WHERE user_id = $1',
      [req.user.id]
    );
    res.json({ success: true, message: 'All notifications cleared successfully' });
  } catch (error) {
    console.error('[Notification] Clear all error:', error);
    res.status(500).json({ error: 'Failed to clear all notifications' });
  }
});

router.delete("/:id", authenticateToken, async (req: any, res) => {
  try {
    const { id } = req.params;
    await pool.query(
      'DELETE FROM notifications WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    console.error('[Notification] Delete error:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

export default router;

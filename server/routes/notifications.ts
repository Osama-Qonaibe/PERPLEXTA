import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { getUserNotifications, markNotificationsAsRead } from '../services/notifications.js';

const router = express.Router();

router.get("/", authenticateToken, async (req: any, res) => {
  try {
    const notifications = await getUserNotifications(req.user.id);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

router.post("/read-all", authenticateToken, async (req: any, res) => {
  try {
    const result = await markNotificationsAsRead(req.user.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Update failed' });
  }
});

export default router;

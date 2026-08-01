import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { pool } from '../db/index.js';

const router = express.Router();

async function checkMessageOwnership(messageId: string | number, userId: string | number): Promise<{ success: boolean; status?: number; error?: string }> {
  if (!pool) throw new Error('Database initializing');
  
  const checkRes = await pool.query(`
    SELECT m.id, c.user_id 
    FROM messages m
    JOIN chats c ON m.chat_id = c.id
    WHERE m.id = $1
  `, [messageId]);

  if (checkRes.rows.length === 0) {
    return { success: false, status: 404, error: 'Message not found' };
  }

  const chatOwnerId = checkRes.rows[0].user_id;
  if (chatOwnerId !== parseInt(userId as string) && chatOwnerId !== userId) {
    return { success: false, status: 403, error: 'Unauthorized to modify this message' };
  }

  return { success: true };
}

router.patch("/:messageId/pin", authenticateToken, async (req: any, res) => {
  try {
    const { messageId } = req.params;
    const { is_pinned } = req.body;
    const userId = req.user.id;

    const authCheck = await checkMessageOwnership(messageId, userId);
    if (!authCheck.success) {
      return res.status(authCheck.status!).json({ error: authCheck.error });
    }

    await pool.query('UPDATE messages SET is_pinned = $1 WHERE id = $2', [is_pinned, messageId]);
    res.json({ success: true, is_pinned });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to pin message' });
  }
});

router.post("/:messageId/feedback", authenticateToken, async (req: any, res) => {
  try {
    const { messageId } = req.params;
    const { feedback } = req.body; // e.g. 1 for up, -1 for down, 0 for clear
    const userId = req.user.id;

    const authCheck = await checkMessageOwnership(messageId, userId);
    if (!authCheck.success) {
      return res.status(authCheck.status!).json({ error: authCheck.error });
    }

    await pool.query('UPDATE messages SET feedback = $1 WHERE id = $2', [feedback, messageId]);
    res.json({ success: true, feedback });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to submit feedback' });
  }
});

router.delete("/:messageId", authenticateToken, async (req: any, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    const authCheck = await checkMessageOwnership(messageId, userId);
    if (!authCheck.success) {
      return res.status(authCheck.status!).json({ error: authCheck.error });
    }

    await pool.query('DELETE FROM messages WHERE id = $1', [messageId]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete message' });
  }
});

router.delete("/branch/:chatId/:messageId", authenticateToken, async (req: any, res) => {
  try {
    const { chatId, messageId } = req.params;
    const userId = req.user.id;

    if (!pool) throw new Error('Database initializing');

    const chatCheck = await pool.query('SELECT user_id FROM chats WHERE id = $1', [chatId]);
    if (chatCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    const chatOwnerId = chatCheck.rows[0].user_id;
    if (chatOwnerId !== parseInt(userId) && chatOwnerId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await pool.query(`
      DELETE FROM messages 
      WHERE chat_id = $1 
        AND created_at >= (SELECT created_at FROM messages WHERE id = $2)
    `, [chatId, messageId]);

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to truncate branch' });
  }
});

export default router;

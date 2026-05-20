import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { pool } from '../db/index.js';

const router = express.Router();

// Toggle Pin Message
router.patch("/:messageId/pin", authenticateToken, async (req: any, res) => {
  try {
    const { messageId } = req.params;
    const { is_pinned } = req.body;
    const userId = req.user.id;

    if (!pool) throw new Error('Database initializing');

    // Check ownership of the chat containing the message
    const checkRes = await pool.query(`
      SELECT m.id, c.user_id 
      FROM messages m
      JOIN chats c ON m.chat_id = c.id
      WHERE m.id = $1
    `, [messageId]);

    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const chatOwnerId = checkRes.rows[0].user_id;
    if (chatOwnerId !== parseInt(userId) && chatOwnerId !== userId) {
      return res.status(403).json({ error: 'Unauthorized to modify this message' });
    }

    await pool.query('UPDATE messages SET is_pinned = $1 WHERE id = $2', [is_pinned, messageId]);
    res.json({ success: true, is_pinned });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to pin message' });
  }
});

// Update Feedback
router.post("/:messageId/feedback", authenticateToken, async (req: any, res) => {
  try {
    const { messageId } = req.params;
    const { feedback } = req.body; // e.g. 1 for up, -1 for down, 0 for clear
    const userId = req.user.id;

    if (!pool) throw new Error('Database initializing');

    // Check ownership
    const checkRes = await pool.query(`
      SELECT m.id, c.user_id 
      FROM messages m
      JOIN chats c ON m.chat_id = c.id
      WHERE m.id = $1
    `, [messageId]);

    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const chatOwnerId = checkRes.rows[0].user_id;
    if (chatOwnerId !== parseInt(userId) && chatOwnerId !== userId) {
      return res.status(403).json({ error: 'Unauthorized to modify this message' });
    }

    await pool.query('UPDATE messages SET feedback = $1 WHERE id = $2', [feedback, messageId]);
    res.json({ success: true, feedback });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to submit feedback' });
  }
});

// Delete Message
router.delete("/:messageId", authenticateToken, async (req: any, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    if (!pool) throw new Error('Database initializing');

    // Check ownership
    const checkRes = await pool.query(`
      SELECT m.id, c.user_id 
      FROM messages m
      JOIN chats c ON m.chat_id = c.id
      WHERE m.id = $1
    `, [messageId]);

    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const chatOwnerId = checkRes.rows[0].user_id;
    if (chatOwnerId !== parseInt(userId) && chatOwnerId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await pool.query('DELETE FROM messages WHERE id = $1', [messageId]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete message' });
  }
});

// Delete Branch (delete all messages after a message index in a thread)
router.delete("/branch/:chatId/:messageId", authenticateToken, async (req: any, res) => {
  try {
    const { chatId, messageId } = req.params;
    const userId = req.user.id;

    if (!pool) throw new Error('Database initializing');

    // Check ownership of chat
    const chatCheck = await pool.query('SELECT user_id FROM chats WHERE id = $1', [chatId]);
    if (chatCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    const chatOwnerId = chatCheck.rows[0].user_id;
    if (chatOwnerId !== parseInt(userId) && chatOwnerId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Delete messages in this chat created after or at the specified message
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

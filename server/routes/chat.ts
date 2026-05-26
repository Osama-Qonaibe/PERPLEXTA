import express from 'express';
import { pool } from '../db/index.js';
import { authenticateToken } from '../middleware/auth.js';
import { chatLimiter } from '../middleware/rateLimit.js';
import { 
  generateChatTitle, 
  createChat, 
  getUserChats, 
  getChatMessages, 
  addChatMessage, 
  getMessageCount,
  deleteUserChat,
  togglePinMessage,
  updateUserChatTitle,
  updateUserChatContextSummary
} from '../services/chat.js';

const router = express.Router();

router.post("/", authenticateToken, chatLimiter, async (req: any, res) => {
  try {
    const subRes = await pool.query(`
      SELECT s.status, u.role 
      FROM users u 
      LEFT JOIN subscriptions s ON u.id = s.user_id 
      WHERE u.id = $1
    `, [req.user.id]);
    
    const role = subRes.rows[0]?.role;
    const hasActiveSub = (role === 'admin' || (subRes.rows.length > 0 && subRes.rows[0].status === 'active'));
    if (!hasActiveSub) {
      return res.status(403).json({ error: 'subscription_required', message: 'An active subscription is required to create a chat.' });
    }

    const chat = await createChat(req.user.id, req.body.title);
    res.json(chat);
  } catch (error: any) {
    const status = error.message === 'Database initializing' ? 503 : 500;
    res.status(status).json({ error: error.message || 'Failed to create chat' });
  }
});

router.get("/", authenticateToken, async (req: any, res) => {
  try {
    const chats = await getUserChats(req.user.id);
    res.json(chats);
  } catch (error: any) {
    const status = error.message === 'Database initializing' ? 503 : 500;
    res.status(status).json({ error: error.message || 'Failed to fetch chats' });
  }
});

router.post("/:id/messages", authenticateToken, chatLimiter, async (req: any, res) => {
  try {
    const subRes = await pool.query(`
      SELECT s.status, u.role 
      FROM users u 
      LEFT JOIN subscriptions s ON u.id = s.user_id 
      WHERE u.id = $1
    `, [req.user.id]);
    
    const role = subRes.rows[0]?.role;
    const hasActiveSub = (role === 'admin' || (subRes.rows.length > 0 && subRes.rows[0].status === 'active'));
    if (!hasActiveSub) {
      return res.status(403).json({ error: 'subscription_required', message: 'An active subscription is required to send messages.' });
    }

    const { role: msgRole, content, tool } = req.body;
    const chatId = req.params.id;
    await addChatMessage(chatId, msgRole, content, tool);
    res.json({ success: true });

    const count = await getMessageCount(chatId);
    if (count === 1 && msgRole === 'user') {
      generateChatTitle(chatId, content);
    }
  } catch (error: any) {
    const status = error.message === 'Database initializing' ? 503 : 500;
    res.status(status).json({ error: error.message || 'Failed to add message' });
  }
});

router.get("/:id/messages", authenticateToken, async (req: any, res) => {
  try {
    const messages = await getChatMessages(req.params.id, req.user.id);
    if (!messages) return res.status(404).json({ error: 'Chat not found' });
    res.json(messages);
  } catch (error: any) {
    const status = error.message === 'Database initializing' ? 503 : 500;
    res.status(status).json({ error: error.message || 'Failed to fetch messages' });
  }
});

router.post("/:id/messages/:messageId/pin", authenticateToken, async (req: any, res) => {
  try {
    const { id, messageId } = req.params;
    const result = await togglePinMessage(id, messageId, req.user.id);
    if (!result.success) {
      return res.status(403).json({ error: result.error });
    }
    res.json(result);
  } catch (error: any) {
    const status = error.message === 'Database initializing' ? 503 : 500;
    res.status(status).json({ error: error.message || 'Failed to toggle pin state' });
  }
});

router.delete("/:id", authenticateToken, async (req: any, res) => {
  try {
    const success = await deleteUserChat(req.params.id, req.user.id);
    if (!success) return res.status(404).json({ error: 'Chat not found' });
    res.json({ success: true });
  } catch (error: any) {
    const status = error.message === 'Database initializing' ? 503 : 500;
    res.status(status).json({ error: error.message || 'Failed to delete chat' });
  }
});

router.patch("/:id", authenticateToken, async (req: any, res) => {
  try {
    const { title, context_summary } = req.body;
    let success = false;
    let updatedTitle = undefined;
    let updatedContextSummary = undefined;

    if (title !== undefined) {
      if (!title || !title.trim()) {
        return res.status(400).json({ error: 'Title is required' });
      }
      success = await updateUserChatTitle(req.params.id, req.user.id, title.trim());
      updatedTitle = title.trim();
    }

    if (context_summary !== undefined) {
      success = await updateUserChatContextSummary(req.params.id, req.user.id, context_summary);
      updatedContextSummary = context_summary;
    }

    if (title === undefined && context_summary === undefined) {
      return res.status(400).json({ error: 'Title or context_summary is required' });
    }

    if (!success) return res.status(404).json({ error: 'Chat not found' });
    res.json({ success: true, title: updatedTitle, context_summary: updatedContextSummary });
  } catch (error: any) {
    const status = error.message === 'Database initializing' ? 503 : 500;
    res.status(status).json({ error: error.message || 'Failed to update chat' });
  }
});

router.post("/:id/fork", authenticateToken, chatLimiter, async (req: any, res) => {
  try {
    const subRes = await pool.query(`
      SELECT s.status, u.role 
      FROM users u 
      LEFT JOIN subscriptions s ON u.id = s.user_id 
      WHERE u.id = $1
    `, [req.user.id]);
    
    const role = subRes.rows[0]?.role;
    const hasActiveSub = (role === 'admin' || (subRes.rows.length > 0 && subRes.rows[0].status === 'active'));
    if (!hasActiveSub) {
      return res.status(403).json({ error: 'subscription_required', message: 'An active subscription is required to fork a chat.' });
    }

    const chatId = req.params.id;
    const { messageId } = req.body;

    if (!messageId) {
      return res.status(400).json({ error: 'Message ID is required for forking' });
    }

    const chatCheck = await pool.query('SELECT * FROM chats WHERE id = $1', [chatId]);
    if (chatCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Original chat not found' });
    }

    const originalChat = chatCheck.rows[0];
    if (originalChat.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized to fork this chat' });
    }

    const msgRes = await pool.query('SELECT * FROM messages WHERE chat_id = $1 ORDER BY created_at ASC, id ASC', [chatId]);
    const originalMessages = msgRes.rows;

    const msgIndex = originalMessages.findIndex((m: any) => m.id === parseInt(messageId) || m.id === messageId);
    if (msgIndex === -1) {
      return res.status(404).json({ error: 'Target message not found in this chat' });
    }

    const messagesToCopy = originalMessages.slice(0, msgIndex + 1);

    const userLang = req.user.language || 'en';
    const forkedTitlePrefix = userLang === 'ar' ? 'فرع: ' : 'Forked: ';
    const newTitle = `${forkedTitlePrefix}${originalChat.title || 'Chat'}`.substring(0, 255);

    const newChatRes = await pool.query(
      'INSERT INTO chats (user_id, title, tool_id, tool, context_summary) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [req.user.id, newTitle, originalChat.tool_id || 'chat', originalChat.tool || 'chat', originalChat.context_summary || '']
    );
    const newChat = newChatRes.rows[0];

    for (const msg of messagesToCopy) {
      await pool.query(
        `INSERT INTO messages (
          chat_id, role, content, tool_id, model, tokens_used, feedback, 
          thinking_steps, citations, follow_ups, generation_time, tool, is_pinned
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          newChat.id,
          msg.role,
          msg.content,
          msg.tool_id,
          msg.model,
          msg.tokens_used,
          msg.feedback,
          JSON.stringify(msg.thinking_steps || []),
          JSON.stringify(msg.citations || []),
          JSON.stringify(msg.follow_ups || []),
          msg.generation_time,
          msg.tool,
          msg.is_pinned
        ]
      );
    }

    res.json(newChat);
  } catch (error: any) {
    const status = error.message === 'Database initializing' ? 503 : 500;
    res.status(status).json({ error: error.message || 'Failed to fork chat' });
  }
});

router.post("/sync-message", authenticateToken, chatLimiter, async (req: any, res) => {
  try {
    const subRes = await pool.query(`
      SELECT s.status, u.role 
      FROM users u 
      LEFT JOIN subscriptions s ON u.id = s.user_id 
      WHERE u.id = $1
    `, [req.user.id]);
    
    const role = subRes.rows[0]?.role;
    const hasActiveSub = (role === 'admin' || (subRes.rows.length > 0 && subRes.rows[0].status === 'active'));
    if (!hasActiveSub) {
      return res.status(403).json({ error: 'subscription_required', message: 'An active subscription is required to sync messages.' });
    }

    const { chatId, content, toolId, modelId } = req.body;
    if (!chatId || !content) {
      return res.status(400).json({ error: 'chatId and content are required' });
    }

    // 1. Add the user's message to the database
    await addChatMessage(chatId, 'user', content, toolId || 'chat');

    // 2. Insert blank assistant message
    const assistantMsgResult = await pool.query(
      'INSERT INTO messages (chat_id, role, content, tool, model) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [chatId, 'assistant', '', toolId || 'chat', modelId]
    );
    const assistantMessageId = assistantMsgResult.rows[0].id;

    // 3. Import dependencies and execute AI logic
    const { executeTaskLogic } = await import('../services/orchestrator.js');
    const { io } = await import('../config/socket.js');

    // Notify that assistant is typing/thinking
    if (io) {
      io.to(`user_${req.user.id}`).emit('typing', { isTyping: true, role: 'assistant', name: 'Perplexta' });
    }

    const generationStart = Date.now();

    const result = await executeTaskLogic(
      { 
        tool_id: toolId || 'chat', 
        prompt: content, 
        chat_id: chatId,
        system_prompt: req.user.custom_instructions || '',
        model_id: modelId
      }, 
      req.user.id, 
      undefined, 
      (chunk) => {
        if (io) {
          io.to(`user_${req.user.id}`).emit('chat_chunk', { chunk, chatId, isFinal: false });
        }
      }
    );

    const generationTimeSeconds = parseFloat(((Date.now() - generationStart) / 1000).toFixed(2));

    await pool.query(
      'UPDATE messages SET content = $1, generation_time = $2 WHERE id = $3',
      [result.result, generationTimeSeconds, assistantMessageId]
    );

    await pool.query('UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = $1', [chatId]);

    if (io) {
      io.to(`user_${req.user.id}`).emit('typing', { isTyping: false, role: 'assistant', name: 'Perplexta' });
      io.to(`user_${req.user.id}`).emit('chat_chunk', { chunk: '', chatId, isFinal: true });
      io.to(`user_${req.user.id}`).emit('chat_response', { 
        result: result.result, 
        chatId, 
        message_id: assistantMessageId,
        tool: toolId || 'chat',
        generation_time: generationTimeSeconds
      });
      io.to(`user_${req.user.id}`).emit('chat_updated');
    }

    // Broadcast updated stats to active admins in real-time
    const { broadcastAdminStats } = await import('../services/admin.js');
    broadcastAdminStats().catch(err => console.error('[Socket] Failed to broadcast admin stats on sync message:', err));

    res.json({ success: true, messageId: assistantMessageId });
  } catch (error: any) {
    console.error('[SyncMessage Error]:', error);
    res.status(500).json({ error: error.message || 'Failed to sync message in background' });
  }
});

export default router;

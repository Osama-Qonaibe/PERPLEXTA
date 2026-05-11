import express from 'express';
import { pool } from '../db/index.js';
import { authenticateToken } from '../middleware/auth.js';
import { chatLimiter } from '../middleware/rateLimit.js';
import { callAIProvider } from '../services/ai.js';
import { decrypt } from '../utils/crypto.js';
import { getAppName } from '../services/system.js';
import { CORE_PROTOCOL } from '../../src/lib/protocol.js';

const router = express.Router();

router.post("/", authenticateToken, async (req: any, res) => {
  try {
    const { title } = req.body;
    const userId = req.user.id;
    const result = await pool.query('INSERT INTO chats (user_id, title) VALUES ($1, $2) RETURNING *', [userId, title || 'New Chat']);
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create chat' });
  }
});

router.get("/", authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query('SELECT * FROM chats WHERE user_id = $1 ORDER BY updated_at DESC', [userId]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch chats' });
  }
});

router.post("/:id/messages", authenticateToken, chatLimiter, async (req: any, res) => {
  try {
    const { role, content, tool } = req.body;
    const chatId = req.params.id;
    await pool.query('INSERT INTO messages (chat_id, role, content, tool) VALUES ($1, $2, $3, $4)', [chatId, role, content, tool]);
    await pool.query('UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = $1', [chatId]);
    res.json({ success: true });

    // Background title generation
    const countResult = await pool.query('SELECT count(*) FROM messages WHERE chat_id = $1', [chatId]);
    if (parseInt(countResult.rows[0].count) === 1 && role === 'user') {
      (async () => {
        try {
          const routeResult = await pool.query('SELECT * FROM tool_orchestrator WHERE tool_id = $1 AND is_active = true', ['perplexta_analysis']);
          if (routeResult.rows.length > 0) {
            const route = routeResult.rows[0];
            const appName = getAppName('en');
            const systemPrompt = CORE_PROTOCOL.replace(/\[SITE_NAME\]/g, appName) + "\n\nGenerate a professional title for this chat.";
            const keyRes = await pool.query('SELECT encrypted_key FROM api_keys_vault WHERE provider = $1', [route.primary_provider]);
            if (keyRes.rows.length > 0) {
               const key = decrypt(keyRes.rows[0].encrypted_key);
               const title = await callAIProvider(route.primary_provider, route.primary_model, key, content, systemPrompt);
               if (title) await pool.query('UPDATE chats SET title = $1 WHERE id = $2', [title.trim().substring(0, 50), chatId]);
            }
          }
        } catch (e) { console.error('Title gen failed:', e); }
      })();
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to add message' });
  }
});

export default router;

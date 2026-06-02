import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { chatLimiter } from '../middleware/rateLimit.js';
import { executeTaskLogic } from '../services/orchestrator.js';
import { pool } from '../db/index.js';
import { io } from '../config/socket.js';

const router = express.Router();

router.post("/execute-task", authenticateToken, chatLimiter, async (req: any, res) => {
  const userId = req.user?.id;
  try {
    const subRes = await pool.query(`
      SELECT s.status, u.role 
      FROM users u 
      LEFT JOIN subscriptions s ON u.id = s.user_id 
      WHERE u.id = $1
    `, [userId]);
    
    const role = subRes.rows[0]?.role;
    const hasActiveSub = (role === 'admin' || (subRes.rows.length > 0 && subRes.rows[0].status === 'active'));
    if (!hasActiveSub) {
      return res.status(403).json({ error: 'subscription_required', message: 'An active subscription is required to execute tools.' });
    }

    const { socketId } = req.body;
    let targetSocket = socketId ? io?.sockets.sockets.get(socketId) : null;

    const onChunk = (chunk: string) => {
      if (targetSocket) targetSocket.emit("chat_chunk", { chunk });
      else res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
    };

    if (!targetSocket) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
    }

    const result = await executeTaskLogic(req.body, userId, req, onChunk, targetSocket);
    
    if (targetSocket) {
      targetSocket.emit("chat_response", result);
      res.json({ success: true });
    } else {
      res.write(`data: ${JSON.stringify({ result })}\n\n`);
      res.end();
    }
  } catch (error: any) {
    let isSystemInactive = false;
    try {
      const parsedErr = JSON.parse(error.message);
      if (parsedErr && parsedErr.type === 'SYSTEM_INACTIVE') {
        isSystemInactive = true;
      }
    } catch (_) {}

    if (isSystemInactive) {
      console.info(`[ToolsRoute] Service temporarily suspended or inactive tool processed gracefully for user: ${userId}`);
    } else {
      console.error('[ToolsRoute] Error:', error);
    }
    let userMessage = 'System error occurred. Please try again later.';
    try {
      const parsed = JSON.parse(error.message);
      
      let userLang = 'en';
      try {
        const uRes = await pool.query('SELECT language FROM users WHERE id = $1', [userId]);
        if (uRes.rows.length > 0) userLang = uRes.rows[0].language || 'en';
      } catch (_) {}
      
      if (userLang === 'ar' && parsed.error_ar) {
        userMessage = parsed.error_ar;
      } else if (parsed.error) {
        userMessage = parsed.error;
      }
    } catch (_) {
      if (error.message && (error.message.includes('provider') || error.message.includes('quota') || error.message.includes('Unauthorized'))) {
        userMessage = error.message;
      }
    }
    const isQuotaError = userMessage.includes('quota') || userMessage.includes('recharge') || userMessage.includes('رصيد') || userMessage.includes('باقة');
    res.status(isQuotaError ? 400 : 500).json({ error: userMessage });
  }
});

export default router;

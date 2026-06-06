import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { chatLimiter } from '../middleware/rateLimit.js';
import { executeTaskLogic } from '../services/orchestrator.js';
import { pool } from '../db/index.js';
import { io } from '../config/socket.js';
import { User, Subscription } from '../db/types.js';

const router = express.Router();

/**
 * Interface representing the structured file attachment metadata for tool execution.
 */
export interface ToolFileAttachment {
  name: string;
  type: string;
  data: string; // Base64 encoded string containing file contents
}

/**
 * Interface detailing the exact parameters accepted by the `/api/tools/execute-task` endpoint.
 */
export interface ExecuteToolRequestBody {
  tool_id: string; // The canonical ID of the tool (e.g. perplexta_analysis, sovereign_search, etc.)
  prompt: string;  // The query or prompt input to analyze
  chat_id?: string | number; // Optional active chat session ID
  socketId?: string; // Optional real-time socket ID for streaming chunks back
  file_data?: ToolFileAttachment; // Optional file payload (e.g. PDF bridge attachment)
  system_prompt?: string; // Optional custom system instructions override
  image_settings?: any; // Context-specific generation parameters for image synthesis
  video_settings?: any; // Context-specific generation parameters for video synthesis
  audio_settings?: any; // Context-specific parameters for TTS or vocal synthesis
}

/**
 * Structure of the successful tool completion response payload.
 */
export interface ToolExecutionResponse {
  result: string; // The distilled natural language response text
  citations?: any[]; // Search citations or information sources retrieved
  walletCharged?: boolean; // Indicates if ledger balance deduction occurred
}

/**
 * POST /api/tools/execute-task
 * Orchestration executor endpoint for executing specialized AI and digital intelligence tools.
 * Serves as the single, fully-typed source of truth for programmatic tool invocation.
 */
router.post("/execute-task", authenticateToken, chatLimiter, async (req: express.Request & { user?: any }, res: express.Response) => {
  const userId = req.user?.id;
  try {
    const subRes = (await pool.query(`
      SELECT s.status, u.role 
      FROM users u 
      LEFT JOIN subscriptions s ON u.id = s.user_id 
      WHERE u.id = $1
    `, [userId])) as { rows: { status: Subscription['status'] | null; role: User['role'] }[] };
    
    const role = subRes.rows[0]?.role;
    const hasActiveSub = (role === 'admin' || (subRes.rows.length > 0 && subRes.rows[0].status === 'active'));
    if (!hasActiveSub) {
      return res.status(403).json({ error: 'subscription_required', message: 'An active subscription is required to execute tools.' });
    }

    const { socketId } = req.body as ExecuteToolRequestBody;

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
        const uRes = (await pool.query('SELECT language FROM users WHERE id = $1', [userId])) as { rows: { language: User['language'] }[] };
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

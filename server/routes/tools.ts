import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { executeTaskLogic } from '../services/orchestrator.js';
import { pool } from '../db/index.js';
import { io } from '../config/socket.js';

const router = express.Router();

router.post("/execute-task", authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { socketId } = req.body;
    let targetSocket = socketId ? io?.sockets.sockets.get(socketId) : null;

    const onChunk = (chunk: string) => {
      if (targetSocket) targetSocket.emit("chat_chunk", { chunk });
      else res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
    };

    if (!targetSocket) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
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
    console.error('[ToolsRoute] Error:', error);
    let userMessage = 'System error occurred. Please try again later.';
    if (error.message && (error.message.includes('provider') || error.message.includes('quota') || error.message.includes('Unauthorized'))) {
      userMessage = error.message;
    }
    res.status(500).json({ error: userMessage });
  }
});

export default router;

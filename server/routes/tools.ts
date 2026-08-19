import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { chatLimiter } from '../middleware/rateLimit.js';
import { verifyBillingFunds } from '../middleware/billing.js';
import { executeTaskLogic } from '../services/orchestrator.js';
import { pool } from '../db/index.js';
import { io } from '../config/socket.js';
import { User, Subscription } from '../db/types.js';
import { getUserWallet } from '../services/wallet.js';
import { getProviderKey } from '../services/ai.js';
import { getCachedOrchestratorConfig } from '../db/queries.js';
import { saveGeneratedAudioToDisk } from '../services/files.js';

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
router.post("/execute-task", authenticateToken, chatLimiter, verifyBillingFunds, async (req: express.Request & { user?: any }, res: express.Response) => {
  const userId = req.user?.id;
  try {
    const subRes = (await pool.query(`
      SELECT s.status, u.role
      FROM users u 
      LEFT JOIN subscriptions s ON u.id = s.user_id 
      WHERE u.id = $1
      ORDER BY CASE WHEN s.status = 'active' THEN 0 ELSE 1 END, s.current_period_end DESC NULLS LAST
      LIMIT 1
    `, [userId])) as { rows: { status: Subscription['status'] | null; role: User['role'] }[] };
    
    const row = subRes.rows[0];
    const role = row?.role;
    
    let points = 0;
    let balance = 0;
    try {
      const wallet = await getUserWallet(userId);
      points = Number(wallet.points || 0);
      balance = Number(wallet.balance || 0);
    } catch (err) {
      console.warn('[ToolsRoute] Failed to fetch user wallet:', err);
    }

    const hasActiveSub = (role === 'admin' || (row && row.status === 'active') || points > 0 || balance > 0);
    if (!hasActiveSub) {
      return res.status(403).json({ error: 'subscription_required', message: 'An active subscription or positive wallet balance is required to execute tools.' });
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

/**
 * POST /api/tools/generate-music
 * High-performance, secure endpoint to invoke Google GenAI Lyria music generation models.
 */
router.post("/generate-music", authenticateToken, chatLimiter, verifyBillingFunds, async (req: express.Request & { user?: any }, res: express.Response) => {
  const userId = req.user?.id;
  try {
    const { prompt, model, lyrics: userLyrics } = req.body;
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'A valid text prompt is required for music generation.' });
    }

    const subRes = (await pool.query(`
      SELECT s.status, u.role
      FROM users u 
      LEFT JOIN subscriptions s ON u.id = s.user_id 
      WHERE u.id = $1
      ORDER BY CASE WHEN s.status = 'active' THEN 0 ELSE 1 END, s.current_period_end DESC NULLS LAST
      LIMIT 1
    `, [userId])) as { rows: { status: Subscription['status'] | null; role: User['role'] }[] };
    
    const row = subRes.rows[0];
    const role = row?.role;
    
    let points = 0;
    let balance = 0;
    try {
      const wallet = await getUserWallet(userId);
      points = Number(wallet.points || 0);
      balance = Number(wallet.balance || 0);
    } catch (err) {
      console.warn('[GenerateMusicRoute] Failed to fetch user wallet:', err);
    }

    const hasActiveSub = (role === 'admin' || (row && row.status === 'active') || points > 0 || balance > 0);
    if (!hasActiveSub) {
      return res.status(403).json({ error: 'subscription_required', message: 'An active subscription or positive wallet balance is required to execute tools.' });
    }

    const config = await getCachedOrchestratorConfig('perplexta_music');
    if (!config) {
      return res.status(400).json({
        error: 'Tool perplexta_music is not configured in the Orchestrator.',
        error_ar: 'الآداة perplexta_music غير مهيأة في نظام الأوركسترا.'
      });
    }
    
    let provider = config.primary_provider;
    let modelName = config.primary_model;
    let apiKey = await getProviderKey(provider);
    
    if (!apiKey && config.fallback_1_provider) {
       provider = config.fallback_1_provider;
       modelName = config.fallback_1_model;
       apiKey = await getProviderKey(provider);
    }

    if (!apiKey) {
      return res.status(400).json({ 
        error: 'API key for music generation provider not configured or not found in system vault.',
        error_ar: 'مفتاح مزود الخدمة لتوليد الموسيقى غير مهيأ أو غير متوفر في خزينة النظام.'
      });
    }

    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey });

    let fullPrompt = prompt;
    if (modelName === 'lyria-3-pro-preview' && userLyrics && typeof userLyrics === 'string' && userLyrics.trim()) {
      fullPrompt = `${prompt}\n\nLyrics:\n${userLyrics}`;
    }

    const response = await ai.models.generateContentStream({
      model: modelName,
      contents: fullPrompt,
      config: {
        responseModalities: ["AUDIO"]
      }
    });

    let audioBase64 = "";
    let lyrics = "";
    let mimeType = "audio/wav";

    for await (const chunk of response) {
      const parts = chunk.candidates?.[0]?.content?.parts;
      if (!parts) continue;

      for (const part of parts) {
        if (part.inlineData?.data) {
          if (!audioBase64 && part.inlineData.mimeType) {
            mimeType = part.inlineData.mimeType;
          }
          audioBase64 += part.inlineData.data;
        }
        if (part.text && !lyrics) {
          lyrics = part.text;
        }
      }
    }

    if (!audioBase64) {
      throw new Error("No audio track was produced by the Google Lyria API. Please check your prompt instructions.");
    }

    res.json({
      success: true,
      audioBase64,
      lyrics: lyrics || userLyrics || '',
      mimeType,
      model: modelName
    });

  } catch (error: any) {
    console.error('[GenerateMusicRoute] Critical failure in music generation:', error);
    res.status(500).json({ 
      error: error.message || 'Music generation service encountered an unexpected error.',
      error_ar: 'واجهت خدمة توليد الموسيقى خطأ غير متوقع أثناء المعالجة.'
    });
  }
});

/**
 * POST /api/tools/save-music
 * Saves generated AI music base64 track to disk and registers file metadata.
 */
router.post("/save-music", authenticateToken, async (req: express.Request & { user?: any }, res: express.Response) => {
  const userId = req.user?.id;
  const { audioBase64, mimeType, prompt, lyrics } = req.body;

  if (!audioBase64) {
    return res.status(400).json({ error: 'Missing audio base64 payload' });
  }

  try {
    const fileUrl = await saveGeneratedAudioToDisk(
      userId,
      audioBase64,
      mimeType || 'audio/wav',
      prompt || 'AI_Music_Track',
      lyrics || ''
    );

    res.json({ success: true, fileUrl });
  } catch (error: any) {
    console.error('[SaveMusicRoute] Failed to save track:', error);
    res.status(500).json({ error: error.message || 'Failed to save generated audio track to library.' });
  }
});

export default router;

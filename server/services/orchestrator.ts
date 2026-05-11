import express from 'express';
import { pool } from '../db/index.js';
import { io } from '../config/socket.js';
import { decrypt } from '../utils/crypto.js';
import { callAIProvider } from './ai.js';
import { checkUserQuota, incrementUserUsage } from './quota.js';
import { logSecurityAlert, logSystemActivity } from './notifications.js';
import { extractTextFromFile } from './extractor.js';
import { sovereignTTS } from './tts.js';
import { performSovereignSearch } from './search.js';
import { getAppName } from './system.js';
import { extractFollowUps } from '../utils/helpers.js';
import { CORE_PROTOCOL } from '../../src/lib/protocol.js';

export const executeTaskLogic = async (reqBody: any, userId: number, req?: express.Request, onChunk?: (chunk: string) => void, socket?: any) => {
  let { tool_id, prompt, system_prompt, model_id, chat_id, file_data } = reqBody;
  const toolIdStr = tool_id as string;
  const chatIdNum = chat_id ? parseInt(chat_id) : 0;
  
  const [routeResult, quota, chatRes] = await Promise.all([
    pool.query('SELECT * FROM tool_orchestrator WHERE tool_id = $1 AND is_active = true', [toolIdStr]),
    checkUserQuota(userId, toolIdStr),
    chatIdNum > 0 ? pool.query('SELECT context_summary FROM chats WHERE id = $1', [chatIdNum]) : Promise.resolve({ rows: [] })
  ]);
  
  if (!quota.allowed) throw new Error('Quota exceeded');
  if (routeResult.rows.length === 0) throw new Error('Tool disabled or unconfigured');
  
  const route = routeResult.rows[0];
  const appName = await getAppName('en');
  const protocol = CORE_PROTOCOL.replace(/\[SITE_NAME\]/g, appName);
  
  const finalSystemPrompt = protocol + (system_prompt || '');
  
  const modelsToTry = [
    { provider: route.primary_provider, model: route.primary_model },
    { provider: route.fallback1_provider, model: route.fallback1_model }
  ].filter(m => m.provider && m.model);

  let generatedText = '';
  let successfulModel = null;
  
  for (const target of modelsToTry) {
    try {
      const keyRes = await pool.query('SELECT encrypted_key FROM api_keys_vault WHERE provider = $1', [target.provider.toLowerCase()]);
      if (keyRes.rows.length === 0) continue;
      
      const apiKey = decrypt(keyRes.rows[0].encrypted_key);
      generatedText = await callAIProvider(target.provider, target.model, apiKey, prompt, finalSystemPrompt, onChunk, [], { fileData: file_data });
      successfulModel = target;
      break;
    } catch (e) {
      console.warn(`[Orchestrator] Fallback triggered due to error: ${e}`);
    }
  }

  if (!generatedText) throw new Error('Generation failed across all models');

  await incrementUserUsage(userId, toolIdStr);
  
  return { 
    result: generatedText, 
    provider: successfulModel?.provider, 
    model: successfulModel?.model 
  };
};

export const generateIntelligentContext = async (userId: number, chatId: number, lastTurn: any) => {
   // Logic for memory synth
   console.log(`[MemoryEngine] Synthesizing context for chat ${chatId}`);
};

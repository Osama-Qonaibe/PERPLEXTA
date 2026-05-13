import express from 'express';
import { pool } from '../db/index.js';
import { io } from '../config/socket.js';
import { decrypt } from '../utils/crypto.js';
import { callAIProvider, getProviderKey, invalidateVaultCache } from './ai.js';
import { checkUserQuota, incrementUserUsage } from './quota.js';
import { logSecurityAlert, logSystemActivity } from './notifications.js';
import { extractTextFromFile } from './extractor.js';
import { sovereignTTS } from './tts.js';
import { performSovereignSearch } from './search.js';
import { getAppName } from './system.js';
import { extractFollowUps } from '../utils/helpers.js';
import { CORE_PROTOCOL } from '../config/protocol.js';

export const executeTaskLogic = async (reqBody: any, userId: number, req?: express.Request, onChunk?: (chunk: string) => void, socket?: any) => {
  let { tool_id, prompt, system_prompt, chat_id, file_data } = reqBody;
  let toolIdStr = (tool_id as string) || 'chat';
  const chatIdNum = chat_id ? parseInt(chat_id) : 0;
  
  if (!pool) throw new Error('System still initializing. Please wait.');
  
  const [routeResult, quota, chatRes, userRes, vaultCheck] = await Promise.all([
    pool.query('SELECT * FROM tool_orchestrator WHERE tool_id = $1 AND is_active = true', [toolIdStr]),
    checkUserQuota(userId, toolIdStr),
    chatIdNum > 0 ? pool.query('SELECT context_summary FROM chats WHERE id = $1', [chatIdNum]) : Promise.resolve({ rows: [] }),
    pool.query('SELECT language FROM users WHERE id = $1', [userId]),
    pool.query('SELECT count(*) FROM api_keys_vault WHERE is_active = true')
  ]);

  if (parseInt(vaultCheck.rows[0].count) === 0) {
    throw new Error(JSON.stringify({
      error: "The intelligence core is currently undergoing a scheduled synchronization. Operations will resume momentarily.",
      error_ar: "نظام الذكاء الاصطناعي يخضع حالياً لمزامنة مبرمجة. ستستأنف العمليات خلال لحظات.",
      type: "SYSTEM_INACTIVE"
    }));
  }
  
  if (routeResult.rows.length === 0 || !routeResult.rows[0].primary_provider || !routeResult.rows[0].primary_model) {
     await logSecurityAlert(userId, 'UNCONFIGURED_TOOL_ACCESS', 'medium', `User attempted to access tool "${toolIdStr}" but it is not yet configured or activated by the Admin.`, { toolId: toolIdStr });
     throw new Error(JSON.stringify({
        error: "This specialized service is temporarily unavailable for optimization. Our engineers have been notified.",
        error_ar: "هذه الخدمة المتخصصة غير متاحة مؤقتاً لأغراض التحسين. تم إخطار مهندسينا بالفعل.",
        type: "SYSTEM_INACTIVE"
     }));
  }

  const route = routeResult.rows[0];
  
  if (!quota.allowed) {
    const periodStrEn = quota.period === 'daily' ? 'Daily' : 'Monthly';
    const periodStrAr = quota.period === 'daily' ? 'يومي' : 'شهري';
    
    const msgEn = `Premium Membership Required: You have reached your ${periodStrEn} limit for this tool. Unlock limitless intelligence by upgrading your plan or referring a friend to earn points.`;
    const msgAr = `تتطلب هذه العملية عضوية ممتازة: لقد وصلت إلى الحد ال${periodStrAr} المسموح به لهذه الأداة. استمتع بذكاء غير محدود عبر ترقية خطتك أو دعوة صديق للحصول على نقاط مكافأة.`;
    
    await logSecurityAlert(userId, 'QUOTA_LIMIT_HIT', 'low', `User attempted to access tool "${toolIdStr}" but hit ${quota.period} quota (${quota.currentUsage}/${quota.limit})`, { toolIdStr, quota });

    throw new Error(JSON.stringify({ 
      error: msgEn, 
      error_ar: msgAr, 
      type: 'QUOTA_EXCEEDED',
      limit: quota.limit, 
      current: quota.currentUsage, 
      period: quota.period,
      cta: {
        upgrade: true,
        referral: true
      }
    }));
  }
  
  const userLang = userRes.rows[0]?.language || 'ar';
  const appName = getAppName(userLang);
  const protocol = CORE_PROTOCOL.replace(/\[SITE_NAME\]/g, appName);
  
  if (toolIdStr === 'sovereign_search') {
    try {
      const searchResults = await performSovereignSearch(prompt);
      if (searchResults && searchResults.length > 0) {
        const searchContext = searchResults.map((r: any) => `Source: ${r.link}\nTitle: ${r.title}\nSnippet: ${r.snippet}`).join('\n\n');
        prompt = `LIVE WEB CONTEXT:\n${searchContext}\n\nUSER PROMPT:\n${prompt}`;
      }
    } catch (searchErr) {
    }
  }

  if (toolIdStr === 'sovereign_memory') {
    try {
      const uMemoryRes = await pool.query('SELECT memory FROM users WHERE id = $1', [userId]);
      const memory = uMemoryRes.rows[0]?.memory;
      if (memory) {
        prompt = `SYSTEM MEMORY INGESTION:\n${memory}\n\nUSER PROMPT:\n${prompt}`;
      }
    } catch (memErr) {
    }
  }

  let userMemoriesStr = '';
  try {
    const memoryRes = await pool.query(
      'SELECT fact FROM chat_memories WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
      [userId]
    );
    if (memoryRes.rows.length > 0) {
      userMemoriesStr = "\nASSISTANT_MEMORY_RECORDS:\n" + memoryRes.rows.map((m: any) => `- ${m.fact}`).join('\n') + "\n";
    }
  } catch (memErr) {
    console.error('[Orchestrator] Memory retrieval failed:', memErr);
  }

  const taskDesc = userLang === 'ar' ? route.task_description_ar : route.task_description;
  const contextSummary = chatRes.rows[0]?.context_summary ? `\nCONVERSATION CONTEXT SUMMARY:\n${chatRes.rows[0].context_summary}\n` : '';
  
  const finalSystemPrompt = protocol + userMemoriesStr + contextSummary + "\nTECHNICAL_DIRECTIVE:\n" + (taskDesc || '') + "\n" + (system_prompt || '');
  
  const modelsToTry = [
    { provider: route.primary_provider, model: route.primary_model },
    { provider: route.fallback_1_provider, model: route.fallback_1_model },
    { provider: route.fallback_2_provider, model: route.fallback_2_model },
    { provider: route.fallback_3_provider, model: route.fallback_3_model }
  ].filter(m => m.provider && m.model);

  let generatedText = '';
  let successfulModel = null;
  
  for (const target of modelsToTry) {
    try {
      const providerId = target.provider.toLowerCase();
      const apiKey = await getProviderKey(providerId);
      if (!apiKey) {
        continue;
      }

      const budgetRes = await pool.query('SELECT daily_budget, used_today, is_active FROM api_keys_vault WHERE provider = $1', [providerId]);
      if (budgetRes.rows.length === 0 || !budgetRes.rows[0].is_active) continue;
      
      const vault = budgetRes.rows[0];
      const dailyBudget = parseFloat(vault.daily_budget || '0');
      const usedToday = parseFloat(vault.used_today || '0');

      if (dailyBudget > 0 && usedToday >= dailyBudget) {
        await logSecurityAlert(userId, 'BUDGET_EXCEEDED', 'medium', `Vault Budget Hit: Provider "${target.provider}" reached its daily budget limit (${usedToday}/${dailyBudget}). Attempting fallback.`, { provider: target.provider, dailyBudget, usedToday });
        continue;
      }
      
      generatedText = await callAIProvider(target.provider, target.model, apiKey, prompt, finalSystemPrompt, onChunk, [], { fileData: file_data });
      successfulModel = target;

      const estimatedCost = (route.cost_per_usage || 0) / 1000;
      await pool.query('UPDATE api_keys_vault SET used_today = used_today + $1, updated_at = CURRENT_TIMESTAMP WHERE provider = $2', [estimatedCost, target.provider.toLowerCase()]);
      
      break;
    } catch (e) {
    }
  }

  if (!generatedText) {
    await logSecurityAlert(userId, 'ORCHESTRATION_FAILURE', 'high', `System failed to generate response across all configured models for tool "${toolIdStr}".`, { toolIdStr, modelsTried: modelsToTry });
    throw new Error('Intelligence Generation failed across all configured models. Please check your AI API keys and credits in the Admin Dashboard.');
  }

  await incrementUserUsage(userId, toolIdStr);
  
  if (toolIdStr !== 'chat' && toolIdStr !== 'chat_fast') {
     await logSystemActivity(userId, 'SOVEREIGN_EXECUTION', `Executed specialized tool "${toolIdStr}" using ${successfulModel?.provider}/${successfulModel?.model}`, { toolIdStr, model: successfulModel });
  }

  return { result: generatedText };
};

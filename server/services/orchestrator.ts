import express from 'express';
import { pool } from '../db/index.js';
import { io } from '../config/socket.js';
import { callAIProvider, getProviderKey, getProviderUrlKey, invalidateVaultCache } from './ai.js';
import { checkAndIncrementQuota, incrementUserUsage } from './quota.js';
import { logSecurityAlert, logSystemActivity } from './notifications.js';
import { forensicScanPDF } from './extractor.js';
import { perplextaTTS } from './tts.js';
import { performPerplextaSearch } from './search.js';
import { getAppName } from './system.js';
import { extractFollowUps, normalizeArabicNumerals } from '../utils/helpers.js';
import { SEARCH_KEYWORDS } from '../config/searchKeywords.js';
import { getProtocolString } from '../config/protocol.js';
import { executeWithBillingMiddleware } from './billing.js';
import { getEconomySettings } from './wallet.js';
import { OrchestratorRegistry } from './orchestratorRegistry.js';
import { withTimeout, safeDecrementOnFailure, safeParseResponse, AI_CALL_TIMEOUT_MS, TTS_TIMEOUT_MS, STT_TIMEOUT_MS } from './tasks/utils.js';
import { sanitizeHTMLAndXSS, validatePromptLength, MAX_CUMULATIVE_HISTORY_CHARS, MAX_DOC_EXTRACT_SIZE } from '../utils/security.js';
import { userLoader, getCachedOrchestratorConfig, getCachedSystemSettings, getCachedApiKeysVault, invalidateApiKeysVaultCache } from '../db/queries.js';
import { extractDirectUserMemories, updateChatContextSummary, consolidateAllUserMemories } from './memory.js';

export { extractDirectUserMemories, updateChatContextSummary };

const MEMORY_TAG_REGEX = /<extracted_memory(?:\s+category\s*=\s*["']?([^"'>]+)["']?)?\s*>([\s\S]*?)<\/extracted_memory>/gi;
const SEARCH_TAG_REGEX = /<search_query>([\s\S]*?)<\/search_query>/gi;
const WIKI_TAG_REGEX = /<wiki_search>([\s\S]*?)<\/wiki_search>/gi;
const MAPS_TAG_REGEX = /<maps_search>([\s\S]*?)<\/maps_search>/gi;
const CONSOLIDATE_TAG_REGEX = /<consolidate_memory>([\s\S]*?)<\/consolidate_memory>/gi;
const TASK_TAG_REGEX = /<task_dispatch>([\s\S]*?)<\/task_dispatch>/gi;
const AUTH_TAG_REGEX = /<auth_token>([\s\S]*?)<\/auth_token>/gi;

const UPDATE_SUMMARY_LIMIT = 20;
const UPDATE_SUMMARY_TIMEOUT_MS = 30000;

async function recordProviderUsage(provider: string, route: any) {
  try {
    const settings = await getEconomySettings();
    const pointsPerDollar = parseFloat(settings.points_per_dollar || '1000');
    const estimatedCost = (route.cost_per_usage || 0) / pointsPerDollar;
    if (estimatedCost > 0) {
      await pool.query(
        'UPDATE api_keys_vault SET used_today = used_today + $1, updated_at = CURRENT_TIMESTAMP WHERE provider = $2',
        [estimatedCost, provider.toLowerCase()]
      );
    }
  } catch (err) {
    console.error('[Orchestrator] Failed to record provider usage:', err);
  }
}

export const isSocialGreeting = (text: string): boolean => {
  const socialKeywords = [
    'مرحبا', 'سلام', 'كيفك', 'كيف حالك', 'شكراً', 'شكرا', 'اهلين', 'هلا', 'مساء الخير', 'صباح الخير', 'منور',
    'hi', 'hello', 'hey', 'how are you', 'thanks', 'thank you', 'good morning', 'good evening', 'test', 'مستعد'
  ];
  const cleaned = text.trim().toLowerCase();
  if (cleaned.length < 5) return true;
  return socialKeywords.some(keyword => cleaned === keyword || cleaned.includes(keyword) && cleaned.length < 25);
};

function scheduleChatSummaryUpdate(chatIdNum: number, userId: number) {
  setImmediate(() => {
    updateChatContextSummary(chatIdNum, userId).catch(err => {
      console.error('[Orchestrator Task Scheduler] Progressive summarization error:', err);
      logSystemActivity(userId, 'SUMMARIZATION_FAILED', `Context summary update failed for chat ${chatIdNum}: ${err.message}`, { chatIdNum }).catch(() => {});
    });
  });
}

function scheduleMemoryConsolidation(userId: number) {
  setImmediate(() => {
    consolidateAllUserMemories({ targetUserId: userId, threshold: 10 }).catch(err => {
      console.error('[Orchestrator Task Scheduler] Memory consolidation error:', err);
      logSystemActivity(userId, 'MEMORY_CONSOLIDATION_FAILED', `Memory consolidation failed for user ${userId}: ${err.message}`, { userId }).catch(() => {});
    });
  });
}

function getDynamicHistoryLimit(totalMessages: number, maxDepth: number = 16): number {
  if (totalMessages <= 4) return Math.min(4, maxDepth);
  if (totalMessages <= 8) return Math.min(6, maxDepth);
  if (totalMessages <= 14) return Math.min(8, maxDepth);
  if (totalMessages <= 30) return Math.min(12, maxDepth);
  return maxDepth;
}

export function cleanAIOutput(text: string): string {
  if (!text) return '';
  
  // Advanced regex to strip all variations of thinking/reasoning tags
  const THINK_PATTERNS = [
    /<think>[\s\S]*?<\/think>/gi,
    /:think>[\s\S]*?(?=\n\n|\n[A-Z]|$)/gi,
    /【[\s\S]*?】/g, 
    /\[Reasoning\][\s\S]*?\[\/Reasoning\]/gi
  ];

  let cleaned = text;
  THINK_PATTERNS.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '');
  });

  return cleaned
    .replace(MEMORY_TAG_REGEX, '')
    .replace(SEARCH_TAG_REGEX, '')
    .replace(WIKI_TAG_REGEX, '')
    .replace(MAPS_TAG_REGEX, '')
    .replace(CONSOLIDATE_TAG_REGEX, '')
    .replace(TASK_TAG_REGEX, '')
    .replace(AUTH_TAG_REGEX, '')
    .trim();
}

export const executeTaskLogic = async (reqBody: any, userId: number, req?: express.Request, onChunk?: (chunk: string) => void, socket?: any) => {
  let { tool_id, prompt, chat_id, file_data, audio_settings } = reqBody;
  let toolIdStr = (tool_id as string) || 'chat';

  if (toolIdStr === 'sovereign_search') {
    throw new Error(JSON.stringify({
      error: "System Error: Direct execution of 'sovereign_search' is disabled. It operates purely as an integrated background-only capability.",
      error_ar: "خطأ في النظام: لا يمكن تشغيل 'البحث السيادي' بشكل مباشر كأداة منعزلة. تعمل هذه الإمكانية في الخلفية تلقائياً لدعم الاستعلامات.",
      type: "DIRECT_ACCESS_BLOCKED"
    }));
  }

  const chatIdNum = chat_id ? parseInt(chat_id) : 0;
  const isChatOnly = ['chat', 'chat_fast', 'chat_pro', 'chat_reasoning'].includes(toolIdStr);
  let searchCitations: any[] = [];

  // Protect against excessive lengths to ensure fair use and stability
  validatePromptLength(prompt);

  // Eliminate malicious scripts, XSS triggers, and tag injections early
  const securedUserPrompt = sanitizeHTMLAndXSS(prompt);

  const sanitizePrompt = (p: string) => {
    if (!p) return p;
    return p.replace(/(SYSTEM[ _]MEMORY[ _]INGESTION|LIVE[ _]WEB[ _]CONTEXT|USER[ _]PROMPT|TECHNICAL[ _]DIRECTIVE|ASSISTANT[ _]MEMORY[ _]RECORDS|CONVERSATION[ _]CONTEXT[ _]SUMMARY):/gi, '[CLEANED_MARKER]');
  };

  const cleanUserPrompt = sanitizePrompt(securedUserPrompt);
  let finalPrompt = cleanUserPrompt;

  if (file_data && file_data.data) {
    try {
      const fileBuffer = Buffer.from(file_data.data, 'base64');
      const isImageVideoAudio = file_data.type?.startsWith('image/') || file_data.type?.startsWith('video/') || file_data.type?.startsWith('audio/');

      if (file_data.type === 'application/pdf') {
        try {
          const forensicReport = forensicScanPDF(fileBuffer);
          const forensicPromptSegment = `
[PDF BRIDGE - DEEP FORENSIC AUDIT DISCLOSURE]
The user attached a sensitive document evaluated under the PDF Bridge's Forensic Mode. Review and analyze the structural layout, extracted metadata, and anomalies documented below:

- PDF Version: ${forensicReport.pdfVersion}
- Password Encrypted: ${forensicReport.isEncrypted ? 'YES' : 'NO'}
- Total Parsed Objects: ${forensicReport.totalObjectsCount}
- Compressed Streams (Flate): ${forensicReport.flateStreamsCount}
- Optional Content Groups (Hidden Layers): ${forensicReport.optionalContentGroupsCount} [${forensicReport.hiddenLayers.join(', ')}]
- Interactive JavaScript Definitions Count: ${forensicReport.interactiveJavascriptCount}
- Embedded Internal Files: ${forensicReport.embeddedFilesCount}
- Hyperlinks/URI targets: ${forensicReport.actionsUriCount}
- Modification State (Trailer Markers count): ${forensicReport.incrementalEofCount} (Multiple modifications: ${forensicReport.incrementalEofCount > 1 ? 'YES' : 'NO'})
- Duplicate Page Root Registries Count: ${forensicReport.rootDefCount}

Detailed Scanner Diagnostics:
${forensicReport.detailedLog.map((log: string) => `  • ${log}`).join('\n')}

System-Level Anomalies:
${forensicReport.anomalies.length > 0 ? forensicReport.anomalies.map((a: string) => `  ⚠️ [ANOMALY] ${a}`).join('\n') : "  No critical binary anomalies detected."}

Instruction: You MUST explicitly disclose this forensic audit to the user. Describe the detected metadata, verify the existence of hidden layers or OCG names, and raise any security warnings (for active scripts, incremental amendments, etc.) before or alongside your standard content evaluation.
`;
          finalPrompt = `${finalPrompt}\n\n${forensicPromptSegment}`;
        } catch (err: any) {
          console.error('[Orchestrator Forensic Engine] Base64 PDF forensic scan failed:', err.message);
        }
      }

      const shouldExtractText = !isImageVideoAudio;
      if (shouldExtractText) {
        const { extractTextFromBuffer } = await import('./extractor.js');
        let extractedText = await extractTextFromBuffer(fileBuffer, file_data.type || '', file_data.name);
        if (extractedText && extractedText.trim() !== '') {
          // Truncate document outputs to fit standard safe model processing constraints under Google/Gemini bounds
          if (extractedText.length > MAX_DOC_EXTRACT_SIZE) {
            extractedText = extractedText.substring(0, MAX_DOC_EXTRACT_SIZE) + 
              "\n\n[TRUNCATED: Text content truncated to 60,000 characters to ensure system stability under Google/Gemini Fair Use limits]\n[تم تقليص النص إلى 60,000 حرفاً لضمان استقرار الخدمة وسياسة الاستخدام العادل لجوجل]";
          }
          const contentHeader = file_data.type === 'application/pdf'
            ? `[PDF CONTENT EXTRACTED - ${file_data.name}]`
            : `[FILE CONTENT - ${file_data.name}]`;
          finalPrompt = `${finalPrompt}\n\n${contentHeader}:\n${extractedText}`;
        }
      }
    } catch (err: any) {
      console.error('[Orchestrator File Extraction] Error parsing attached file buffer:', err);
    }
  }

  if (!pool) throw new Error('System still initializing. Please wait.');

  const [route, chatRes, user, activeKeys, memoryRes, systemSettings] = await Promise.all([
    getCachedOrchestratorConfig(toolIdStr),
    chatIdNum > 0 ? pool.query('SELECT context_summary FROM chats WHERE id = $1 AND user_id = $2', [chatIdNum, userId]) : Promise.resolve({ rows: [] }),
    userLoader.load(userId),
    getCachedApiKeysVault(),
    pool.query(
      `SELECT fact FROM chat_memories
       WHERE user_id = $1
       ORDER BY
         CASE WHEN chat_id = $2 THEN 0 ELSE 1 END ASC,
         created_at DESC
       LIMIT 50`,
      [userId, chatIdNum]
    ).catch(() => ({ rows: [] })),
    getCachedSystemSettings().catch(() => ({ memory_limit_per_user: 48 }))
  ]);

  const memoryLimit = systemSettings?.memory_limit_per_user || 48;

  if (activeKeys.length === 0) {
    throw new Error(JSON.stringify({
      error: "The intelligence core is currently undergoing a scheduled synchronization. Operations will resume momentarily.",
      error_ar: "نظام الذكاء الاصطناعي يخضع حالياً لمزامنة مبرمجة. ستستأنف العمليات خلال لحظات.",
      type: "SYSTEM_INACTIVE"
    }));
  }

  if (!route || !route.primary_provider || !route.primary_model) {
    await logSystemActivity(userId, 'INACTIVE_TOOL_ACCESS', `User attempted to access tool "${toolIdStr}" but it is currently inactive or undergoing maintenance.`, { toolId: toolIdStr });
    throw new Error(JSON.stringify({
      error: "This specialized service is temporarily unavailable for optimization. Our engineers have been notified.",
      error_ar: "هذه الخدمة المتخصصة غير متاحة مؤقتاً لأغراض التحسين. تم إخطار مهندسينا بالفعل.",
      type: "SYSTEM_INACTIVE"
    }));
  }

  const quotaCheck = await checkAndIncrementQuota(userId, toolIdStr);

  return await executeWithBillingMiddleware(
    userId,
    toolIdStr,
    finalPrompt,
    quotaCheck,
    async (updateCostProgress, onSuccess, walletCharged) => {
      let history: { role: string; content: string }[] = [];
  if (chatIdNum > 0) {
    try {
      const countRes = await pool.query(
        "SELECT count(*) FROM messages WHERE chat_id = $1 AND content IS NOT NULL AND content != ''",
        [chatIdNum]
      );
      const totalMessages = parseInt(countRes.rows[0].count);
      const historyLimit = getDynamicHistoryLimit(totalMessages, route?.max_history_depth);

      const historyRes = await pool.query(
        "SELECT role, content FROM messages WHERE chat_id = $1 AND content IS NOT NULL AND content != '' ORDER BY created_at DESC LIMIT $2",
        [chatIdNum, historyLimit]
      );
      const rawHistory = [...historyRes.rows].reverse();
      if (rawHistory.length > 0 && rawHistory[rawHistory.length - 1].role === 'user') {
        rawHistory.pop();
      }
      let cumulativeHistoryChars = 0;
      const boundedHistory: { role: string; content: string }[] = [];
      // Traverse history backward to keep only the newest messages that safely fit context size limits
      for (let i = rawHistory.length - 1; i >= 0; i--) {
        const m = rawHistory[i];
        const msgContent = m.content || '';
        if (cumulativeHistoryChars + msgContent.length > MAX_CUMULATIVE_HISTORY_CHARS) {
          console.warn(`[History Security Shield] Chat thread history length reached fair use ceiling (${cumulativeHistoryChars} chars). Truncating past conversation segments.`);
          break;
        }
        cumulativeHistoryChars += msgContent.length;
        boundedHistory.unshift({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: msgContent
        });
      }
      history = boundedHistory;
    } catch (err) {
      console.error('[Orchestrator] Failed to fetch chat history:', err);
    }
  }

  const userLang = user?.language || 'en';
  const appName = getAppName(userLang);
  const protocol = getProtocolString(appName);

  const chatWantsSearch = isChatOnly && !isSocialGreeting(cleanUserPrompt);

  if (chatWantsSearch) {
    try {
      if (io) {
        io.to(`user_${userId}`).emit('search_steps', { 
          step: userLang === 'ar' ? 'جاري الاتصال بمحرك البحث وتجميع البيانات الفورية...' : 'Connecting to live web index and harvesting context...', 
          status: 'processing' 
        });
      }
      
      const searchResults = await performPerplextaSearch(cleanUserPrompt);
      if (searchResults && searchResults.length > 0) {
        searchCitations = searchResults.map((r: any, idx: number) => ({
          title: r.title,
          link: r.link,
          url: r.link,
          index: idx + 1,
          snippet: r.snippet
        }));
        const searchContext = searchResults.map((r: any, idx: number) => `[Source Index: ${idx + 1}]\nURL: ${r.link}\nTitle: ${r.title}\nSnippet: ${r.snippet}`).join('\n\n---\n\n');
        finalPrompt = `LIVE WEB CONTEXT:\n${searchContext}\n\nUSER PROMPT:\n${cleanUserPrompt}`;
        
        if (io) {
          io.to(`user_${userId}`).emit('search_steps', { 
            step: userLang === 'ar' ? 'تم استخراج نتائج البحث الفورية وتوليف المصادر' : 'Dynamic context harvested successfully. Generating synthesis...', 
            status: 'completed' 
          });
          io.to(`user_${userId}`).emit('citations', { citations: searchCitations });
        }
      } else {
        if (io) {
          io.to(`user_${userId}`).emit('search_steps', { 
            step: userLang === 'ar' ? 'لم يتم العثور على نتائج بحث مباشرة، جاري تفعيل المرجعية المعرفية المباشرة' : 'No direct web matches cataloged. Utilizing deep internal knowledge bases...', 
            status: 'completed' 
          });
        }
      }
    } catch (searchErr) {
      console.error(`[Orchestrator Search Grounding] Failed:`, searchErr);
    }
  }

  if (toolIdStr === 'image') {
    const handler = await OrchestratorRegistry.getHandler('image');
    const res = await handler({
      reqBody, userId, route, quotaCheck, walletCharged, finalPrompt
    });
    await onSuccess('');
    return res;
  }

  if (toolIdStr === 'tts') {
    try {
      const voiceId = reqBody.voice_id || '21m00Tcm4TlvDq8ikWAM';
      const modelId = route.primary_model;
      const providerId = route.primary_provider.toLowerCase().replace(/\s+/g, '');
      const audioBuffer = await withTimeout(
        perplextaTTS(cleanUserPrompt, voiceId, modelId, providerId),
        TTS_TIMEOUT_MS,
        'tts'
      );

       await recordProviderUsage(providerId, route);

      await logSystemActivity(userId, 'PERPLEXTA_EXECUTION', `TTS generated via ElevenLabs voice=${voiceId}`, { toolIdStr });
      await onSuccess('');

      return { result: audioBuffer.toString('base64'), result_type: 'audio_base64' };
    } catch (ttsErr: any) {
      await safeDecrementOnFailure(quotaCheck, userId, toolIdStr, walletCharged);
      console.error('[Orchestrator TTS] Generation failed:', ttsErr.message);
      throw new Error(JSON.stringify({
        error: `TTS generation failed: ${ttsErr.message}`,
        error_ar: `فشل توليد الصوت: ${ttsErr.message}`,
        type: "GENERATION_ERROR"
      }));
    }
  }

  if (toolIdStr === 'stt') {
    try {
      if (!file_data || !file_data.data) {
        throw new Error('No audio file provided for speech-to-text.');
      }

      const providerId = route.primary_provider.toLowerCase().replace(/\s+/g, '');
      const apiKey = await getProviderKey(providerId);

      if (!apiKey) {
        await safeDecrementOnFailure(quotaCheck, userId, toolIdStr, walletCharged);
        throw new Error(JSON.stringify({
          error: `Speech-to-text service is temporarily unavailable. API key for provider '${providerId}' not found in vault.`,
          error_ar: `خدمة تحويل الصوت إلى نص غير متاحة حالياً. لم يتم العثور على مفتاح API للمزود '${providerId}' في الخزينة.`,
          type: "SYSTEM_INACTIVE"
        }));
      }

      const audioBuffer = Buffer.from(file_data.data, 'base64');
      const formData = new FormData();
      const audioBlob = new Blob([audioBuffer], { type: file_data.type || 'audio/webm' });
      formData.append('file', audioBlob, file_data.name || 'audio.webm');
      formData.append('model', route.primary_model);
      if (cleanUserPrompt) formData.append('prompt', cleanUserPrompt);

      const vaultRow = activeKeys.find(k => k.provider.toLowerCase().replace(/\s+/g, '') === providerId);
      const customUrl = vaultRow ? vaultRow.url_key : (await getProviderUrlKey(providerId));
      const sttEndpoint = customUrl;

      if (!sttEndpoint) {
        throw new Error(`STT Orchestrator: Provider '${providerId}' is missing a registered endpoint URL (url_key) in the vault.`);
      }

      const res = await withTimeout(
        fetch(sttEndpoint, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiKey}` },
          body: formData
        }),
        STT_TIMEOUT_MS,
        'stt'
      );

      const data = await safeParseResponse(res, 'STT API error');
      const transcription = data.text || '';

      await recordProviderUsage(providerId, route);

      await logSystemActivity(userId, 'PERPLEXTA_EXECUTION', `STT transcription via ${route.primary_provider}/${route.primary_model}`, { toolIdStr });
      await onSuccess('');

      return { result: transcription };
    } catch (sttErr: any) {
      await safeDecrementOnFailure(quotaCheck, userId, toolIdStr, walletCharged);
      console.error('[Orchestrator STT] Transcription failed:', sttErr.message);
      throw new Error(JSON.stringify({
        error: `STT transcription failed: ${sttErr.message}`,
        error_ar: `فشل تحويل الصوت إلى نص: ${sttErr.message}`,
        type: "GENERATION_ERROR"
      }));
    }
  }

  if (toolIdStr === 'video') {
    const handler = await OrchestratorRegistry.getHandler('video');
    const res = await handler({
      reqBody, userId, route, quotaCheck, walletCharged, finalPrompt
    });
    await onSuccess('');
    return res;
  }

  let userMemoriesStr = '';
  if (memoryRes?.rows?.length > 0) {
    userMemoriesStr = `\n[MEMORY]: ${memoryRes.rows.map((m: any) => m.fact).join('; ')}\n`;
  }

  const taskDesc = userLang === 'ar' ? route.task_description_ar : route.task_description;
  const contextSummary = chatRes.rows[0]?.context_summary 
    ? `\n[CONTEXT]: ${chatRes.rows[0].context_summary}\n`
    : '';

  let refinedSystemPromptSegment = '';

  if (toolIdStr === 'sovereign_memory') {
    refinedSystemPromptSegment = '[MEMORY_MODE]: Inspect and manage user memories.';
  } else if (toolIdStr === 'canvas') {
    const audioSet = audio_settings || {};
    let moodLabel = audioSet.mood || 'Epic';
    let durationCount = Number(audioSet.duration || 30);
    let vocalTypeLabel = audioSet.vocalType || 'Instrumental';

    const promptLower = (prompt || '').toLowerCase();
    
    if (promptLower.includes('ملحمية') || promptLower.includes('epic')) moodLabel = 'Epic';
    else if (promptLower.includes('طرب') || promptLower.includes('tarab')) moodLabel = 'Tarab';
    else if (promptLower.includes('تكنو') || promptLower.includes('techno')) moodLabel = 'EDM';

    refinedSystemPromptSegment = `[AUDIO_MODE]: Mood: ${moodLabel}, Vocals: ${vocalTypeLabel}, Duration: ${durationCount}s.
Structure: [I. Cover & Mood Art], [II. Audio Suite Environment], [III. Sonic Orchestration].`.trim();
  } else if (toolIdStr === 'perplexta_analysis') {
    refinedSystemPromptSegment = '[ANALYSIS_MODE]: Perform elite file audit and deep analysis.';
  }

  if (chatWantsSearch) {
    const searchInstructions = `
[SEARCH_MODE - CRITICAL DIRECTIVE]: 
You are equipped with a LIVE WEB CONTEXT block below.
1. You MUST ONLY use facts, statistics, and information present in the provided LIVE WEB CONTEXT.
2. If the context does not contain the answer, explicitly state: "لا تتوفر معلومات دقيقة في المصادر الحية الحالية" (No precise information available in current live sources).
3. Do NOT hallucinate, infer, or fabricate sources, dates, or facts.
4. You MUST cite your sources using inline brackets, e.g., [1], [2], corresponding exactly to the Source indices provided in the context.`.trim();
    refinedSystemPromptSegment = refinedSystemPromptSegment ? `${refinedSystemPromptSegment}\n${searchInstructions}` : searchInstructions;
  }

  const toolBoundary = isChatOnly
    ? `[TOOL: chat]: No direct code blocks. For code, output specific En/Ar workstation disclosure.`
    : `[TOOL: ${toolIdStr}]`;

  const finalSystemPrompt = `${protocol}
[OBJECTIVE]: ${taskDesc || 'Professional precision execution.'}
${toolBoundary}${contextSummary}${userMemoriesStr}
${refinedSystemPromptSegment}`.trim();

  const modelsToTry = [
    { provider: route.primary_provider, model: route.primary_model },
    { provider: route.fallback_1_provider, model: route.fallback_1_model },
    { provider: route.fallback_2_provider, model: route.fallback_2_model },
    { provider: route.fallback_3_provider, model: route.fallback_3_model }
  ].filter(m => m.provider && m.model);

  const vaultMap = new Map<string, any>();
  if (activeKeys && activeKeys.length > 0) {
    for (const key of activeKeys) {
      if (key && key.provider) {
        vaultMap.set(key.provider.toLowerCase().replace(/\s+/g, ''), key);
      }
    }
  }

  let generatedText = '';
  let successfulModel = null;
  let successfulApiKey = '';
  let outerAccumulatedOutput = '';

  for (const target of modelsToTry) {
    const providerId = target.provider.toLowerCase().replace(/\s+/g, '');

    // Sanitize model name to remove redundant provider prefixes if stored in DB incorrectly
    let displayModel = target.model;
    if (displayModel.toLowerCase().startsWith(`${providerId}/`)) {
      displayModel = displayModel.substring(providerId.length + 1);
    }

    try {
        const cachedRow = vaultMap.get(providerId);
        let isProviderActive = true;
        let dailyBudget = 0;
        let usedToday = 0;
        let urlKey: string | null = null;

        if (cachedRow) {
          dailyBudget = parseFloat(cachedRow.daily_budget || '0');
          usedToday = parseFloat(cachedRow.used_today || '0');
          urlKey = cachedRow.url_key;
        }

        const apiKey = await getProviderKey(providerId);
        if (!apiKey) continue;

        if (dailyBudget > 0 && usedToday >= dailyBudget) {
          await logSecurityAlert(userId, 'BUDGET_EXCEEDED', 'medium', `Vault Budget Hit: Provider "${target.provider}" reached its daily budget limit (${usedToday}/${dailyBudget}). Attempting fallback.`, { provider: target.provider, dailyBudget, usedToday });
          continue;
        }

        let isInsideThinkingBlock = false;

        const wrappedOnChunk = (chunk: string) => {
          let sanitizedChunk = '';
          let i = 0;
          
          while (i < chunk.length) {
            if (!isInsideThinkingBlock) {
              const startThink = chunk.indexOf('<think>', i);
              if (startThink !== -1) {
                sanitizedChunk += chunk.substring(i, startThink);
                isInsideThinkingBlock = true;
                i = startThink + 7;
              } else {
                sanitizedChunk += chunk.substring(i);
                break;
              }
            } else {
              const endThink = chunk.indexOf('</think>', i);
              if (endThink !== -1) {
                isInsideThinkingBlock = false;
                i = endThink + 8;
              } else {
                break;
              }
            }
          }
          
          // Secondary cleanup for other patterns
          sanitizedChunk = sanitizedChunk
            .replace(/<think>[\s\S]*?<\/think>/gi, '')
            .replace(/:think>[\s\S]*?(?=\n\n|\n[A-Z]|$)/gi, '')
            .replace(/【[\s\S]*?】/g, '')
            .replace(/\[Reasoning\][\s\S]*?\[\/Reasoning\]/gi, '');

          updateCostProgress(sanitizedChunk);
          if (onChunk) onChunk(sanitizedChunk);
        };

        generatedText = await withTimeout(
          callAIProvider(target.provider, target.model, apiKey, finalPrompt, finalSystemPrompt, wrappedOnChunk, history, { fileData: file_data }, urlKey ?? undefined),
          AI_CALL_TIMEOUT_MS,
          `${target.provider}/${displayModel}`
        );
        successfulModel = target;
        successfulApiKey = apiKey;

        await recordProviderUsage(target.provider, route);

        if (chatIdNum > 0) {
          scheduleChatSummaryUpdate(chatIdNum, userId);
        }

        try {
          // Extract direct user facts from user prompt deterministically (Zero AI / Full Sovereign Local Engine)
          const directUserFacts = extractDirectUserMemories(cleanUserPrompt);

          if (directUserFacts.length > 0) {
            const countRes = await pool.query('SELECT count(*) FROM chat_memories WHERE user_id = $1', [userId]);
            const currentCount = parseInt(countRes.rows[0].count);

            let newInsertedCount = 0;
            for (const item of directUserFacts) {
              // Deduplication check: only insert if not already recorded
              const existing = await pool.query(
                'SELECT id FROM chat_memories WHERE user_id = $1 AND LOWER(fact) = LOWER($2) LIMIT 1',
                [userId, item.fact]
              );
              if (existing.rows.length === 0) {
                const insertRes = await pool.query(
                  "INSERT INTO chat_memories (user_id, chat_id, fact, category, source) VALUES ($1, $2, $3, $4, 'user') RETURNING *",
                  [userId, chatIdNum || null, item.fact, item.category]
                );
                newInsertedCount++;
                if (io) {
                  io.to(`user_${userId}`).emit('memory_extracted', {
                    fact: item.fact,
                    category: item.category,
                    id: insertRes.rows[0].id
                  });
                }
              }
            }

            const totalNow = currentCount + newInsertedCount;
            if (totalNow >= memoryLimit) {
              scheduleMemoryConsolidation(userId);
              if (io) {
                io.to(`user_${userId}`).emit('memory_warning', { currentCount: totalNow });
              }
            }
          }

          const memRegex = new RegExp(MEMORY_TAG_REGEX.source, 'gi');
          generatedText = generatedText.replace(memRegex, '').trim();
        } catch (memProcErr) {
          console.error('[Orchestrator] Error during deterministic memory extraction:', memProcErr);
        }

        break; // exit trials on model execution success
      } catch (innerErr: any) {
        if (innerErr.message === 'OUT_OF_POINTS_BUDGET_HALT') {
          throw innerErr; // rethrow directly to trigger external abort
        }
        console.error(`[Orchestrator] Failure on ${target.provider}/${displayModel}:`, innerErr);

        const errMessage = innerErr.message || '';
        const isTemporaryRateLimit = errMessage.includes('429') || errMessage.toLowerCase().includes('rate limit') || errMessage.toLowerCase().includes('too many requests') || errMessage.toLowerCase().includes('resource_exhausted') || errMessage.toLowerCase().includes('quota') || errMessage.toLowerCase().includes('generativelanguage');

        if (isTemporaryRateLimit) {
          console.warn(`[Orchestrator] Temporary 429 rate limit hit on provider "${target.provider}" / model "${target.model}". Proceeding to fallback if available.`);
        }

        const isQuotaOrAuthExhausted =
          !isTemporaryRateLimit && (
            errMessage.includes('401') ||
            errMessage.includes('403') ||
            errMessage.includes('1113') ||
            errMessage.includes('Insufficient balance') ||
            errMessage.includes('resource package') ||
            // errMessage.includes('quota') || // REMOVED: Too aggressive, often temporary
            errMessage.includes('recharge') ||
            errMessage.includes('balance') ||
            errMessage.includes('subscription') ||
            errMessage.includes('upgrade')
          );

        // Key status remains preserved; runtime errors do not deactivate provider keys.
      }
    }

    if (!successfulModel && modelsToTry.length > 0) {
      throw new Error('All models requested under active orchestrator strategies failed to return a validated solution.');
    }



    if (!generatedText) {
      await logSystemActivity(userId, 'ORCHESTRATION_SUSPENDED', `Tool "${toolIdStr}" is temporarily suspended or capacity is hit. No active model connection succeeded.`, { toolIdStr, modelsTried: modelsToTry });

      throw new Error(JSON.stringify({
        error: "The service for this tool is temporarily suspended due to scheduled technical maintenance or capacity limits. Please try again in a few moments.",
        error_ar: "تم إيقاف الخدمة المرتبطة بهذه الأداة مؤقتاً لأغراض الصيانة والتحديث الفني الجاري لتحسين الأداء. يُرجى المحاولة مرة أخرى بعد قليل.",
        type: "SYSTEM_INACTIVE"
      }));
    }

    if (toolIdStr !== 'chat' && toolIdStr !== 'chat_fast') {
      await logSystemActivity(userId, 'PERPLEXTA_EXECUTION', `Executed specialized tool "${toolIdStr}" using ${successfulModel?.provider}/${successfulModel?.model}`, { toolIdStr, model: successfulModel });
    }

    await onSuccess(generatedText);
    await incrementUserUsage(userId, toolIdStr).catch(() => {});

    const sanitizedOutput = cleanAIOutput(generatedText);
    const { cleanText, followUps } = extractFollowUps(sanitizedOutput, cleanUserPrompt, userLang, toolIdStr);

    return { 
      result: cleanText, 
      citations: searchCitations, 
      follow_ups: followUps,
      provider: successfulModel?.provider,
      model: successfulModel?.model,
      apiKey: successfulApiKey
    };
  });
};

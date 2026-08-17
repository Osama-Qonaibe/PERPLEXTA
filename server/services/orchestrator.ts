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

function scheduleChatSummaryUpdate(chatIdNum: number, userId: number, provider: string, model: string, apiKey: string) {
  setImmediate(() => {
    updateChatContextSummary(chatIdNum, userId, provider, model, apiKey).catch(err => {
      console.error('[Orchestrator Task Scheduler] Progressive summarization error:', err);
      logSystemActivity(userId, 'SUMMARIZATION_FAILED', `Context summary update failed for chat ${chatIdNum}: ${err.message}`, { chatIdNum }).catch(() => {});
    });
  });
}

function scheduleMemoryConsolidation(userId: number, chatIdNum: number, provider: string, model: string, apiKey: string) {
  setImmediate(() => {
    runMemoryConsolidation(userId, chatIdNum, provider, model, apiKey).catch(err => {
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

export function extractDirectUserMemories(prompt: string): { fact: string; category: string }[] {
  if (!prompt || prompt.trim().length < 4) return [];
  const results: { fact: string; category: string }[] = [];
  const trimmed = prompt.trim();

  // Arabic explicit and implicit memory intents
  const arPatterns = [
    { regex: /(?:تذكر\s+(?:أن|ان|دائماً|دائما)?|احفظ\s+(?:أن|ان|عندي|لديك)?|لا\s+تنسى\s+(?:أن|ان)?|خزن\s+(?:أن|ان)?|سجل\s+(?:أن|ان)?)\s*[:،,-]?\s*(.+)/i, category: 'preference' },
    { regex: /(?:اسمي\s+هو|اسمي|أنا\s+ادعى|انا\s+ادعى)\s+([^\.\n،]+)/i, category: 'identity', template: (m: string) => `اسم المستخدم هو ${m.trim()}` },
    { regex: /(?:أنا\s+أعمل\s+(?:كـ|ك|في)?|انا\s+اعمل\s+(?:كـ|ك|في)?|مهنتي\s+هي|وظيفتي\s+هي|تخصصي\s+هو)\s+([^\.\n،]+)/i, category: 'professional', template: (m: string) => `تخصص/مهنة المستخدم: ${m.trim()}` },
    { regex: /(?:أعيش\s+في|اعيش\s+في|أنا\s+من|انا\s+من|بلدي\s+هو|دولتي\s+هي|مدينتي\s+هي)\s+([^\.\n،]+)/i, category: 'identity', template: (m: string) => `مكان إقامة أو بلد المستخدم: ${m.trim()}` },
    { regex: /(?:مشروعي\s+(?:الحالي|الجديد|القادم)?\s*(?:هو|عبارة عن)?)\s+([^\.\n،]+)/i, category: 'project', template: (m: string) => `مشروع المستخدم: ${m.trim()}` }
  ];

  // English explicit and implicit memory intents
  const enPatterns = [
    { regex: /(?:remember\s+(?:that|always)?|save\s+(?:that|this)?|keep\s+in\s+mind\s+(?:that)?|don't\s+forget\s+(?:that)?|note\s+(?:that)?)\s*[:,-]?\s*(.+)/i, category: 'preference' },
    { regex: /(?:my\s+name\s+is|i\s+am|i'm\s+called)\s+([^\.\n,]+)/i, category: 'identity', template: (m: string) => `User's name is ${m.trim()}` },
    { regex: /(?:i\s+work\s+as\s+(?:a|an)?|my\s+profession\s+is|my\s+job\s+is|my\s+specialty\s+is)\s+([^\.\n,]+)/i, category: 'professional', template: (m: string) => `User's profession: ${m.trim()}` },
    { regex: /(?:i\s+live\s+in|i'm\s+from|i\s+am\s+from|my\s+country\s+is)\s+([^\.\n,]+)/i, category: 'identity', template: (m: string) => `User's location: ${m.trim()}` },
    { regex: /(?:my\s+project\s+is|i\s+am\s+building|currently\s+working\s+on)\s+([^\.\n,]+)/i, category: 'project', template: (m: string) => `User's project: ${m.trim()}` }
  ];

  for (const p of [...arPatterns, ...enPatterns]) {
    const match = trimmed.match(p.regex);
    if (match && match[1]) {
      const raw = match[1].trim();
      if (raw.length >= 3 && raw.length <= 250) {
        const fact = p.template ? p.template(raw) : raw;
        results.push({ fact, category: p.category });
      }
    }
  }

  return results;
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

  const chatWantsSearch = isChatOnly && !isSocialGreeting(cleanUserPrompt) &&
    SEARCH_KEYWORDS.some(kw => cleanUserPrompt.toLowerCase().includes(kw));

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
        const searchContext = searchResults.map((r: any) => `Source: ${r.link}\nTitle: ${r.title}\nSnippet: ${r.snippet}`).join('\n\n');
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
      const audioBuffer = await withTimeout(
        perplextaTTS(cleanUserPrompt, voiceId, modelId),
        TTS_TIMEOUT_MS,
        'tts'
      );

       await recordProviderUsage(route.primary_provider, route);

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
      const cachedRow = activeKeys.find(k => k.provider.toLowerCase().replace(/\s+/g, '') === providerId);
      const apiKey = await getProviderKey(providerId);

      if (!apiKey) {
        await safeDecrementOnFailure(quotaCheck, userId, toolIdStr, walletCharged);
        throw new Error(JSON.stringify({
          error: "Speech-to-text service is temporarily unavailable. No active API key found.",
          error_ar: "خدمة تحويل الصوت إلى نص غير متاحة حالياً. لا يوجد مفتاح API نشط.",
          type: "SYSTEM_INACTIVE"
        }));
      }

      const audioBuffer = Buffer.from(file_data.data, 'base64');
      const formData = new FormData();
      const audioBlob = new Blob([audioBuffer], { type: file_data.type || 'audio/webm' });
      formData.append('file', audioBlob, file_data.name || 'audio.webm');
      formData.append('model', route.primary_model);
      if (cleanUserPrompt) formData.append('prompt', cleanUserPrompt);

      const customUrl = cachedRow ? cachedRow.url_key : (await getProviderUrlKey(providerId));
      const sttEndpoint = customUrl || 'https://api.openai.com/v1/audio/transcriptions';

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
  if (memoryRes && memoryRes.rows && memoryRes.rows.length > 0) {
    const facts = memoryRes.rows.map((m: any) => `• ${m.fact}`).join('\n');
    userMemoriesStr = `\n\n[USER PERSISTENT MEMORY & VERIFIED FACTS]
The sovereign system holds the following persistent verified facts regarding this user:
${facts}
CRITICAL INSTRUCTION: You MUST actively leverage, respect, and apply these remembered facts seamlessly throughout your reasoning and answers without reciting the raw list unless directly asked.\n`;
  }

  const taskDesc = userLang === 'ar' ? route.task_description_ar : route.task_description;
  const contextSummary = chatRes.rows[0]?.context_summary 
    ? `\n[CONVERSATION CONTEXT SUMMARY]
The following is a dense, stored summary of the ongoing conversation:
${chatRes.rows[0].context_summary}
CRITICAL INSTRUCTION: You MUST actively leverage this conversation summary and the recent message history to tailor your response. Specifically, you are STRICTLY PROHIBITED from generating generic greetings, default introductory templates, or generic follow-up suggestions. Every interaction proposal and suggested prompt under your [FOLLOW_UPS] tag MUST be highly specific, contextual, and directly derived from the topics, entities, and state of this particular ongoing dialogue.\n`
    : '';

  let refinedSystemPromptSegment = '';

  if (toolIdStr === 'sovereign_memory') {
    const memoryInstructions = `[MEMORY ENGINE]
Extract long-term user facts from this conversation. For each worthy fact, output:
<extracted_memory category="general|professional|preference|identity">fact here</extracted_memory>
Discuss memory state and provide a dense synthesis. Do not show raw XML in your reply text.
يجب إخراج وسم <extracted_memory> لكل حقيقة مستخلصة لضمان حفظها في قاعدة البيانات.`.trim();
    refinedSystemPromptSegment = memoryInstructions;
  } else if (isChatOnly) {
    const conversationalMemoryInstructions = `[MEMORY ACQUISITION]
If you detect any durable user fact, preference, or rule, silently output: <extracted_memory category="general|professional|preference|identity">fact</extracted_memory>
Do not mention this in your reply.`.trim();
    refinedSystemPromptSegment = conversationalMemoryInstructions;
  } else if (toolIdStr === 'canvas') {
    const audioSet = audio_settings || {};
    let moodLabel = audioSet.mood || 'Epic';
    let durationCount = Number(audioSet.duration || 30);
    let vocalTypeLabel = audioSet.vocalType || 'Instrumental';

    const promptLower = (prompt || '').toLowerCase();
    
    if (promptLower.includes('ملحمية') || promptLower.includes('أوركسترا') || promptLower.includes('epic') || promptLower.includes('orchestra') || promptLower.includes('orchestral')) {
      moodLabel = 'Epic';
    } else if (promptLower.includes('طرب') || promptLower.includes('شرقي') || promptLower.includes('مقام') || promptLower.includes('tarab') || promptLower.includes('maqam')) {
      moodLabel = 'Tarab';
    } else if (promptLower.includes('إلكترونك') || promptLower.includes('دي جي') || promptLower.includes('تقنو') || promptLower.includes('تكنو') || promptLower.includes('edm') || promptLower.includes('techno') || promptLower.includes('electronic')) {
      moodLabel = 'EDM';
    } else if (promptLower.includes('غيتار') || promptLower.includes('تخت') || promptLower.includes('هادئ') || promptLower.includes('acoustic') || promptLower.includes('guitar') || promptLower.includes('soft') || promptLower.includes('كلاسيك')) {
      moodLabel = 'Acoustic';
    } else if (promptLower.includes('لوفاي') || promptLower.includes('لو-فاي') || promptLower.includes('lofi') || promptLower.includes('lo-fi') || promptLower.includes('chill')) {
      moodLabel = 'LoFi';
    } else if (promptLower.includes('جاز') || promptLower.includes('بلوز') || promptLower.includes('jazz') || promptLower.includes('blues')) {
      moodLabel = 'Jazz';
    } else if (promptLower.includes('بوب') || promptLower.includes('حماسي') || promptLower.includes('pop') || promptLower.includes('upbeat')) {
      moodLabel = 'Pop';
    }

    if (promptLower.includes('كورال') || promptLower.includes('choir') || promptLower.includes('choral')) {
      vocalTypeLabel = 'Choir';
    } else if (promptLower.includes('أنثوي') || promptLower.includes('سوبرانو') || promptLower.includes('female') || promptLower.includes('soprano')) {
      vocalTypeLabel = 'Female';
    } else if (promptLower.includes('ذكوري') || promptLower.includes('تينور') || promptLower.includes('male') || promptLower.includes('baritone')) {
      vocalTypeLabel = 'Male';
    } else if (promptLower.includes('روبوت') || promptLower.includes('سنتسيزر') || promptLower.includes('vocaloid') || promptLower.includes('ai synth')) {
      vocalTypeLabel = 'Vocaloid';
    } else if (promptLower.includes('بدون غناء') || promptLower.includes('موسيقى فقط') || promptLower.includes('عزف') || promptLower.includes('instrumental') || promptLower.includes('no vocals') || promptLower.includes('none')) {
      vocalTypeLabel = 'Instrumental';
    }

    const normalizedPrompt = normalizeArabicNumerals(promptLower);
    const durationMatch = normalizedPrompt.match(/(?:المدة|duration|المدة الزمنية|طول)\s*:\s*\*?(\d+)/) || 
                          normalizedPrompt.match(/(\d+)\s*(?:ثانية|ثوانٍ|seconds|secs|s)/);
    if (durationMatch) {
      const durVal = parseInt(durationMatch[1], 10);
      if (!isNaN(durVal) && durVal >= 10 && durVal <= 120) {
        durationCount = durVal;
      }
    }

    const canvasInstructions = `[AUDIO ORCHESTRATION MODE]
The user is working in the high-performance Audio & Soundtrack Production Studio (استوديو تأليف الموسيقى والمؤثرات).
Your primary task is to generate and synthesize an immersive musical/creative composition concept using the PERPLEXTA CREATIVE PRODUCTION PROTOCOL.

CRITICAL INSTRUCTION: You MUST strictly configure and respect the exact parameters extracted from the user's prompt (Mood/Genre: ${moodLabel}, Vocals: ${vocalTypeLabel}, Duration: ${durationCount}s).
Any dynamic choice or recommendation must match these values exactly. DO NOT offer arbitrary variations, unrequested suggestions, or conversational hallucinations.

You MUST structure your response into EXACTLY 3 phases using the bracket tags to trigger the visual production suite on the frontend:

[I. Cover & Mood Art]
Provide an elegant, detailed visual description of the album/soundtrack cover art.
Include exactly one Markdown image tag pointing to a professional royalty-free cover art image related to the music mood and scenery. Ensure Referrer-Policy "no-referrer" is supported.

[II. Audio Suite Environment / البيئة الصوتية]
Describe the soundscape, instrumentation, tempo, scales, key, and production techniques in professional terms.
Present the chosen parameters clearly using bullet points:
- **النمط والموسيقى (Style/Genre)**: ${moodLabel}
- **نوع صوت الأداء (Vocal Selection)**: ${vocalTypeLabel}
- **المدة الزمنية (Duration)**: ${durationCount} ثانية (seconds)

[III. Sonic Orchestration / المقطع الموسيقي]
This is where the direct player and visualizer reside.
Write a rich narrative describing the masterpiece's audio progression, section by section (Intro, Verse, Chorus, Outro/Epic Solo) following the user specifications.
If vocal style is not Instrumental, write beautiful poetic original lyrics (in Arabic or English, matching user intent). If Instrumental, describe the instrumental solo layers, chord progressions, and synths.
End with a professional, authoritative, and inspiring summary of the sonic results in Tajawal-style elegant vocabulary.

Your response MUST be highly creative, authoritative, elite, and inspiring. Use elegant, high-profile vocabulary. Keep the structure bracket tags like "[I. Cover & Mood Art]" exactly as they are so the frontend parsing handles them correctly.`.trim();

    refinedSystemPromptSegment = canvasInstructions;
  }

  if (chatWantsSearch) {
    const searchInstructions = `[SEARCH ENGINE]
Synthesize the live web context against the user query. Eliminate bias, structure findings with headers and bullets, cite sources precisely.
CRITICAL CITATION RULES:
1. You MUST provide inline link sources of any factual claims by using bracket numbered notation like [1], [2], [3], etc. 
2. These numbers MUST correspond exactly with the index of the search result source URLs.
3. Every sentence making an informative or data assertion that is supported by the search results must end with its corresponding index marker (e.g. "...as reported recently [1].").
4. Under no circumstances should you generate fake placeholder brackets. Only cite matching indices from the actual live web context.
Always leverage the provided LIVE WEB CONTEXT to respond truthfully.`.trim();
    refinedSystemPromptSegment = refinedSystemPromptSegment ? `${refinedSystemPromptSegment}\n\n${searchInstructions}` : searchInstructions;
  }

  if (toolIdStr === 'perplexta_analysis') {
    const analysisInstructions = `[PERPLEXTA FILE AUDIT & DEEP ANALYSIS ENGINE]
You are operating as the Chief Digital Forensics and Compliance Auditor. 
Your primary task is to perform an elite, multi-layered audit of the user's provided files, structures, and inquiries.
- If files/PDFs are uploaded, perform thorough context inspection, compliance auditing, structure checks, and hidden content analyses.
- Present clean, structured expert conclusions with clear headers, security disclosures, and precise textual proof.
- Direct your output structure into scientific, executive levels. Avoid general or superficial summaries. Ensure peak professional vocabulary in Tajawal style.`.trim();
    refinedSystemPromptSegment = refinedSystemPromptSegment ? `${refinedSystemPromptSegment}\n\n${analysisInstructions}` : analysisInstructions;
  }

  const toolBoundary = isChatOnly
    ? `Active tool: chat. Do NOT simulate image/video/search/audio generation — direct user to the appropriate tool instead.
[CRITICAL SECURITY PROTOCOL]: Since you are inside the active chat-only tool ("${toolIdStr}"), you are STRICTLY PROHIBITED and FORBIDDEN from writing, generating, or formatting functional, complete, or executable programming code blocks or scripts (such as Javascript, Python, HTML/CSS, C++, SQLite, etc.) inside the response. If the user asks for code, programming, or script creation, you MUST explain the concepts conceptually or in pseudocode paragraphs, and output the exact disclosure:
- English: "To generate complete, production-ready code blocks and scripts, please switch to the dedicated 'Elite Engineering Workstation (Code)' tool."
- Arabic: "للحصول على الأكواد الكاملة الجاهزة للتشغيل، يرجى التبديل إلى 'بيئة هندسة برمجيات (Code)' المخصصة لهذا الغرض."
This is a critical resource conservation rule.`
    : `Active tool: "${toolIdStr}". Stay strictly within this tool's domain.`;

  const finalSystemPrompt = `${protocol}

OBJECTIVE: ${taskDesc || 'Execute the user request with highest professional precision.'}

${toolBoundary}
${contextSummary}${userMemoriesStr}
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
          isProviderActive = cachedRow.is_active;
          dailyBudget = parseFloat(cachedRow.daily_budget || '0');
          usedToday = parseFloat(cachedRow.used_today || '0');
          urlKey = cachedRow.url_key;
        } else {
          isProviderActive = false;
        }

        if (!isProviderActive) continue;

        const apiKey = await getProviderKey(providerId);
        if (!apiKey) continue;

        if (dailyBudget > 0 && usedToday >= dailyBudget) {
          await logSecurityAlert(userId, 'BUDGET_EXCEEDED', 'medium', `Vault Budget Hit: Provider "${target.provider}" reached its daily budget limit (${usedToday}/${dailyBudget}). Attempting fallback.`, { provider: target.provider, dailyBudget, usedToday });
          continue;
        }

        const wrappedOnChunk = (chunk: string) => {
          // Robust streaming cleaner to strip thinking blocks before streaming to frontend
          const sanitizedChunk = chunk.replace(/<think>[\s\S]*?<\/think>/gi, '')
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
          scheduleChatSummaryUpdate(chatIdNum, userId, target.provider, target.model, apiKey);
        }

        try {
          const extractedFacts: { fact: string; category: string }[] = [];
          const memRegex = new RegExp(MEMORY_TAG_REGEX.source, 'gi');
          let match;

          while ((match = memRegex.exec(generatedText)) !== null) {
            const category = match[1] || 'general';
            const fact = match[2]?.trim();
            if (fact && fact.length >= 3) {
              extractedFacts.push({ fact, category });
            }
          }

          // Extract direct user facts from user prompt as well
          const directUserFacts = extractDirectUserMemories(cleanUserPrompt);
          for (const duf of directUserFacts) {
            if (!extractedFacts.some(ef => ef.fact.toLowerCase() === duf.fact.toLowerCase())) {
              extractedFacts.push(duf);
            }
          }

          if (extractedFacts.length > 0) {
            const countRes = await pool.query('SELECT count(*) FROM chat_memories WHERE user_id = $1', [userId]);
            const currentCount = parseInt(countRes.rows[0].count);

            let newInsertedCount = 0;
            for (const item of extractedFacts) {
              // Deduplication check: only insert if not already recorded
              const existing = await pool.query(
                'SELECT id FROM chat_memories WHERE user_id = $1 AND LOWER(fact) = LOWER($2) LIMIT 1',
                [userId, item.fact]
              );
              if (existing.rows.length === 0) {
                const insertRes = await pool.query(
                  "INSERT INTO chat_memories (user_id, chat_id, fact, category, source) VALUES ($1, $2, $3, $4, 'ai') RETURNING *",
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
              scheduleMemoryConsolidation(userId, chatIdNum, target.provider, target.model, apiKey);
              if (io) {
                io.to(`user_${userId}`).emit('memory_warning', { currentCount: totalNow });
              }
            }
          }

          generatedText = generatedText.replace(memRegex, '').trim();
        } catch (memProcErr) {
          console.error('[Orchestrator] Error during Perplexta memory parsing & extraction:', memProcErr);
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

        if (isQuotaOrAuthExhausted && !errMessage.includes('AI_TIMEOUT')) {
          try {
            const provLower = target.provider.toLowerCase();
            await pool.query('UPDATE api_keys_vault SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE provider = $1', [provLower]);
            invalidateVaultCache(provLower);
            invalidateApiKeysVaultCache();
            console.warn(`[Orchestrator] Auto-deactivated provider "${target.provider}" due to quota exhaustion, subscription restriction or auth failure.`);
            await logSecurityAlert(
              userId,
              'PROVIDER_AUTO_DEACTIVATED',
              'high',
              `Provider "${target.provider}" was automatically deactivated due to API exhaustion/quota failure. Error details: ${errMessage}`,
              { provider: target.provider, error: errMessage }
            );
          } catch (dbErr) {
            console.error('[Orchestrator] Error deactivating failed provider in DB:', dbErr);
          }
        }
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

async function runMemoryConsolidation(userId: number, chatIdNum: number, provider: string, model: string, apiKey: string) {
  const oldestRes = await pool.query(
    'SELECT id, fact, category, chat_id FROM chat_memories WHERE user_id = $1 ORDER BY created_at ASC LIMIT 15',
    [userId]
  );

  if (oldestRes.rows.length === 0) return;

  const oldestIds = oldestRes.rows.map((r: any) => r.id);
  const factsToCondense = oldestRes.rows.map((r: any) => `- [${r.category}] ${r.fact}`).join('\n');

  const chatIdCounts: Record<number, number> = {};
  for (const m of oldestRes.rows) {
    if (m.chat_id) {
      chatIdCounts[m.chat_id] = (chatIdCounts[m.chat_id] || 0) + 1;
    }
  }
  let associatedChatId = chatIdNum || null;
  let maxCount = 0;
  for (const [cidStr, count] of Object.entries(chatIdCounts)) {
    if (count > maxCount) {
      maxCount = count;
      associatedChatId = parseInt(cidStr, 10);
    }
  }

  const consolidationPrompt = `You are a memory consolidation engine. Below are ${oldestRes.rows.length} raw memory facts extracted from a user's conversation history. Your task is to merge, deduplicate, and synthesize them into a smaller set of dense, precise facts. Output each consolidated fact as:
<extracted_memory category="general|professional|preference|identity">consolidated fact</extracted_memory>

Raw facts to consolidate:
${factsToCondense}

Produce the minimum number of consolidated facts needed to preserve all key information.`;

  try {
    const consolidatedText = await withTimeout(
      callAIProvider(provider, model, apiKey, consolidationPrompt, 'You are a memory consolidation engine. Be concise and precise.', undefined, [], {}, undefined),
      AI_CALL_TIMEOUT_MS,
      'memory-consolidation'
    );

    const consolidatedFacts: { fact: string; category: string }[] = [];
    const memRegex = new RegExp(MEMORY_TAG_REGEX.source, 'gi');
    let match;
    while ((match = memRegex.exec(consolidatedText)) !== null) {
      const category = match[1] || 'general';
      const fact = match[2]?.trim();
      if (fact) consolidatedFacts.push({ fact, category });
    }

    if (consolidatedFacts.length > 0) {
      await pool.query('DELETE FROM chat_memories WHERE id = ANY($1)', [oldestIds]);
      const insertPromises = consolidatedFacts.map(item =>
        pool.query(
          "INSERT INTO chat_memories (user_id, chat_id, fact, category, source) VALUES ($1, $2, $3, $4, 'consolidated')",
          [userId, associatedChatId, item.fact, item.category]
        )
      );
      await Promise.all(insertPromises);
      console.log(`[Memory Consolidation] User ${userId}: Replaced ${oldestIds.length} facts with ${consolidatedFacts.length} consolidated facts.`);
    }
  } catch (consolidationErr: any) {
    console.error('[Memory Consolidation] AI call failed:', consolidationErr.message);
  }
}

export async function updateChatContextSummary(chatIdNum: number, userId: number, provider: string, model: string, apiKey: string) {
  try {
    const msgCountRes = await pool.query('SELECT count(*) FROM messages WHERE chat_id = $1 AND content IS NOT NULL AND content != \'\'', [chatIdNum]);
    const msgCount = parseInt(msgCountRes.rows[0].count, 10);
    
    // Generate context summary if there are at least 2 messages (1 user prompt + 1 assistant reply)
    // to ensure early context is captured, and update it on every turn to keep it fresh and detailed.
    if (msgCount < 2) return;

    const recentMessages = await pool.query(
      `SELECT role, content FROM messages WHERE chat_id = $1 AND content IS NOT NULL AND content != '' ORDER BY created_at DESC LIMIT ${UPDATE_SUMMARY_LIMIT}`,
      [chatIdNum]
    );

    if (recentMessages.rows.length < 2) return;

    const conversationText = [...recentMessages.rows].reverse()
      .map((m: any) => `${m.role === 'assistant' ? 'Assistant' : 'User'}: ${m.content}`)
      .join('\n');

    const summaryPrompt = `Summarize this conversation in 2-3 dense sentences in the language of the conversation (Arabic or English) capturing the main topics, decisions, and user context. Be factual and brief.\n\n${conversationText}`;

    const summary = await withTimeout(
      callAIProvider(provider, model, apiKey, summaryPrompt, 'You are a concise conversation summarizer. Output only the summary, no preamble.', undefined, [], {}, undefined),
      UPDATE_SUMMARY_TIMEOUT_MS,
      'context-summary'
    );

    if (summary && summary.trim()) {
      await pool.query(
        'UPDATE chats SET context_summary = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [summary.trim().substring(0, 1000), chatIdNum]
      );
    }
  } catch (err: any) {
    console.error('[updateChatContextSummary] Failed:', err.message);
    throw err;
  }
}

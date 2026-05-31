import express from 'express';
import { pool } from '../db/index.js';
import { io } from '../config/socket.js';
import { decrypt } from '../utils/crypto.js';
import { callAIProvider, getProviderKey, getProviderUrlKey, invalidateVaultCache } from './ai.js';
import { checkUserQuota, checkAndIncrementQuota, decrementUserUsage, incrementUserUsage } from './quota.js';
import { logSecurityAlert, logSystemActivity } from './notifications.js';
import { extractTextFromFile, forensicScanPDF } from './extractor.js';
import { perplextaTTS } from './tts.js';
import { performPerplextaSearch } from './search.js';
import { getAppName } from './system.js';
import { extractFollowUps } from '../utils/helpers.js';
import { CORE_PROTOCOL } from '../config/protocol.js';
import { deductUsageFromWallet } from './wallet.js';

const THINK_TAG_REGEX = /<think>[\s\S]*?<\/think>/gi;
const MEMORY_TAG_REGEX = /<extracted_memory(?:\s+category\s*=\s*["']?([^"'>]+)["']?)?\s*>([\s\S]*?)<\/extracted_memory>/gi;

const AI_CALL_TIMEOUT_MS = 60000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`AI_TIMEOUT: ${label} exceeded ${ms}ms`)), ms)
    )
  ]);
}

function getDynamicHistoryLimit(totalMessages: number): number {
  if (totalMessages <= 4) return 4;
  if (totalMessages <= 8) return 6;
  if (totalMessages <= 14) return 8;
  if (totalMessages <= 30) return 12;
  return 16;
}

function cleanAIOutput(text: string): string {
  return text
    .replace(THINK_TAG_REGEX, '')
    .replace(MEMORY_TAG_REGEX, '')
    .replace(/```(?:json)?/gi, '')
    .replace(/[{}]/g, '')
    .trim();
}

async function safeDecrementOnFailure(quotaCheck: { allowed: boolean }, userId: number, toolIdStr: string, walletCharged: boolean) {
  try {
    if (quotaCheck.allowed) {
      await decrementUserUsage(userId, toolIdStr);
    } else if (walletCharged) {
      await incrementUserUsage(userId, toolIdStr);
    }
  } catch (e) {
    console.error('[Orchestrator] safeDecrementOnFailure failed:', e);
  }
}

export const executeTaskLogic = async (reqBody: any, userId: number, req?: express.Request, onChunk?: (chunk: string) => void, socket?: any) => {
  let { tool_id, prompt, system_prompt, chat_id, file_data, forensic_mode } = reqBody;
  let toolIdStr = (tool_id as string) || 'chat';
  const chatIdNum = chat_id ? parseInt(chat_id) : 0;
  const isChatOnly = ['chat', 'chat_fast', 'chat_pro', 'chat_reasoning'].includes(toolIdStr);

  const sanitizePrompt = (p: string) => {
    if (!p) return p;
    return p.replace(/(SYSTEM[ _]MEMORY[ _]INGESTION|LIVE[ _]WEB[ _]CONTEXT|USER[ _]PROMPT|TECHNICAL[ _]DIRECTIVE|ASSISTANT[ _]MEMORY[ _]RECORDS|CONVERSATION[ _]CONTEXT[ _]SUMMARY):/gi, '[CLEANED_MARKER]');
  };

  const cleanUserPrompt = sanitizePrompt(prompt);
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

      if (!isImageVideoAudio && file_data.type !== 'application/pdf') {
        const { extractTextFromBuffer } = await import('./extractor.js');
        const extractedText = await extractTextFromBuffer(fileBuffer, file_data.type, file_data.name);
        if (extractedText && extractedText.trim() !== '') {
          finalPrompt = `${finalPrompt}\n\n[FILE CONTENT - ${file_data.name}]:\n${extractedText}`;
        }
      } else if (file_data.type === 'application/pdf') {
        const { extractTextFromBuffer } = await import('./extractor.js');
        const extractedText = await extractTextFromBuffer(fileBuffer, file_data.type, file_data.name);
        if (extractedText && extractedText.trim() !== '') {
          finalPrompt = `${finalPrompt}\n\n[PDF CONTENT EXTRACTED - ${file_data.name}]:\n${extractedText}`;
        }
      }
    } catch (err: any) {
      console.error('[Orchestrator File Extraction] Error parsing attached file buffer:', err);
    }
  }

  if (!pool) throw new Error('System still initializing. Please wait.');

  const [routeResult, quotaCheck, chatRes, userRes, vaultCheck, memoryRes] = await Promise.all([
    pool.query('SELECT * FROM tool_orchestrator WHERE tool_id = $1 AND is_active = true', [toolIdStr]),
    checkAndIncrementQuota(userId, toolIdStr),
    chatIdNum > 0 ? pool.query('SELECT context_summary FROM chats WHERE id = $1', [chatIdNum]) : Promise.resolve({ rows: [] }),
    pool.query('SELECT language FROM users WHERE id = $1', [userId]),
    pool.query('SELECT count(*) FROM api_keys_vault WHERE is_active = true'),
    pool.query(
      `SELECT fact FROM chat_memories
       WHERE user_id = $1
       ORDER BY
         CASE WHEN chat_id = $2 THEN 0 ELSE 1 END ASC,
         created_at DESC
       LIMIT 50`,
      [userId, chatIdNum]
    ).catch(() => ({ rows: [] }))
  ]);

  let history: { role: string; content: string }[] = [];
  if (chatIdNum > 0) {
    try {
      const countRes = await pool.query(
        "SELECT count(*) FROM messages WHERE chat_id = $1 AND content IS NOT NULL AND content != ''",
        [chatIdNum]
      );
      const totalMessages = parseInt(countRes.rows[0].count);
      const historyLimit = getDynamicHistoryLimit(totalMessages);

      const historyRes = await pool.query(
        "SELECT role, content FROM messages WHERE chat_id = $1 AND content IS NOT NULL AND content != '' ORDER BY created_at DESC LIMIT $2",
        [chatIdNum, historyLimit]
      );
      const rawHistory = [...historyRes.rows].reverse();
      if (rawHistory.length > 0 && rawHistory[rawHistory.length - 1].role === 'user') {
        rawHistory.pop();
      }
      history = rawHistory.map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content
      }));
    } catch (err) {
      console.error('[Orchestrator] Failed to fetch chat history:', err);
    }
  }

  if (parseInt(vaultCheck.rows[0].count) === 0) {
    throw new Error(JSON.stringify({
      error: "The intelligence core is currently undergoing a scheduled synchronization. Operations will resume momentarily.",
      error_ar: "نظام الذكاء الاصطناعي يخضع حالياً لمزامنة مبرمجة. ستستأنف العمليات خلال لحظات.",
      type: "SYSTEM_INACTIVE"
    }));
  }

  if (routeResult.rows.length === 0 || !routeResult.rows[0].primary_provider || !routeResult.rows[0].primary_model) {
    await logSystemActivity(userId, 'INACTIVE_TOOL_ACCESS', `User attempted to access tool "${toolIdStr}" but it is currently inactive or undergoing maintenance.`, { toolId: toolIdStr });
    throw new Error(JSON.stringify({
      error: "This specialized service is temporarily unavailable for optimization. Our engineers have been notified.",
      error_ar: "هذه الخدمة المتخصصة غير متاحة مؤقتاً لأغراض التحسين. تم إخطار مهندسينا بالفعل.",
      type: "SYSTEM_INACTIVE"
    }));
  }

  const route = routeResult.rows[0];

  let walletCharged = false;

  if (!quotaCheck.allowed) {
    try {
      const chargeRes = await deductUsageFromWallet(userId, toolIdStr);
      walletCharged = true;
      if (io) {
        io.to(`user_${userId}`).emit('user_profile_updated');
        io.to(`user_${userId}`).emit('wallet_charge_notice', {
          toolId: toolIdStr,
          charged: chargeRes.charged,
          amount: chargeRes.amount
        });
      }
      await incrementUserUsage(userId, toolIdStr);
    } catch (chargeErr: any) {
      const periodStrEn = quotaCheck.period === 'daily' ? 'Daily' : 'Monthly';
      const periodStrAr = quotaCheck.period === 'daily' ? 'يومي' : 'شهري';

      const msgEn = `Premium Membership Required: You have reached your ${periodStrEn} limit for this tool. Please upgrade your plan or recharge your digital wallet (Pay-per-Request: 10 Tool Points or equivalents) to execute excess actions.`;
      const msgAr = `تتطلب هذه العملية رصيداً أو عضوية ممتازة: لقد تجاوزت الحد ال${periodStrAr} المسموح به. يرجى شحن محفظتك الرقمية أو ترقية باقتك للاستمرار بالاستفادة بالدفع لكل معاملة (10 نقاط أو ما يعادلها).`;

      await logSecurityAlert(userId, 'QUOTA_LIMIT_HIT', 'low', `User attempted to access tool "${toolIdStr}" but hit ${quotaCheck.period} quota (${quotaCheck.currentUsage}/${quotaCheck.limit}) and wallet fallback failed: ${chargeErr.message}`, { toolIdStr, quota: quotaCheck });

      throw new Error(JSON.stringify({
        error: msgEn,
        error_ar: msgAr,
        type: 'QUOTA_EXCEEDED',
        limit: quotaCheck.limit,
        current: quotaCheck.currentUsage,
        period: quotaCheck.period,
        cta: {
          upgrade: true,
          referral: true
        }
      }));
    }
  }

  const userLang = userRes.rows[0]?.language || 'ar';
  const appName = getAppName(userLang);
  const protocol = CORE_PROTOCOL.replace(/\[SITE_NAME\]/g, appName);

  if (toolIdStr === 'sovereign_search') {
    try {
      const searchResults = await performPerplextaSearch(cleanUserPrompt);
      if (searchResults && searchResults.length > 0) {
        const searchContext = searchResults.map((r: any) => `Source: ${r.link}\nTitle: ${r.title}\nSnippet: ${r.snippet}`).join('\n\n');
        finalPrompt = `LIVE WEB CONTEXT:\n${searchContext}\n\nUSER PROMPT:\n${cleanUserPrompt}`;
      }
    } catch (searchErr) {
      console.error(`[Orchestrator] ${toolIdStr} failed:`, searchErr);
    }
  }

  if (toolIdStr === 'image') {
    const imageSettings = reqBody.image_settings || {};
    const providerId = route.primary_provider.toLowerCase();
    const apiKey = await getProviderKey(providerId);

    if (!apiKey) {
      await safeDecrementOnFailure(quotaCheck, userId, toolIdStr, walletCharged);
      throw new Error(JSON.stringify({
        error: "Image generation service is temporarily unavailable. No active API key found.",
        error_ar: "خدمة توليد الصور غير متاحة حالياً. لا يوجد مفتاح API نشط.",
        type: "SYSTEM_INACTIVE"
      }));
    }

    let imageUrl = '';

    try {
      if (providerId === 'openai') {
        const aspectRatio = imageSettings.aspectRatio || '1:1';
        const size =
          aspectRatio === '16:9' ? '1792x1024' :
          aspectRatio === '9:16' ? '1024x1792' :
          '1024x1024';
        const quality = imageSettings.quality === 'Ultra' ? 'hd' : 'standard';
        const style = imageSettings.style === 'واقعي' || imageSettings.style === 'Realistic' ? 'natural' : 'vivid';

        const res = await withTimeout(
          fetch('https://api.openai.com/v1/images/generations', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: route.primary_model, prompt: finalPrompt, n: 1, size, quality, style })
          }),
          AI_CALL_TIMEOUT_MS,
          'openai-image'
        );
        const data = await res.json() as any;
        if (!res.ok) throw new Error(data?.error?.message || `OpenAI image API error: ${res.status}`);
        imageUrl = data.data?.[0]?.url || '';

      } else if (providerId === 'together') {
        const aspectRatio = imageSettings.aspectRatio || '1:1';
        const width = aspectRatio === '16:9' ? 1344 : aspectRatio === '9:16' ? 768 : 1024;
        const height = aspectRatio === '9:16' ? 1344 : aspectRatio === '16:9' ? 768 : 1024;

        const res = await withTimeout(
          fetch('https://api.together.xyz/v1/images/generations', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: route.primary_model, prompt: finalPrompt, n: 1, width, height })
          }),
          AI_CALL_TIMEOUT_MS,
          'together-image'
        );
        const data = await res.json() as any;
        if (!res.ok) throw new Error(data?.error?.message || `Together image API error: ${res.status}`);
        imageUrl = data.data?.[0]?.url || data.data?.[0]?.b64_json || '';

      } else if (providerId === 'stabilityai' || providerId === 'stability') {
        const aspectRatio = imageSettings.aspectRatio || '1:1';
        const width = aspectRatio === '16:9' ? 1344 : aspectRatio === '9:16' ? 768 : 1024;
        const height = aspectRatio === '9:16' ? 1344 : aspectRatio === '16:9' ? 768 : 1024;

        const res = await withTimeout(
          fetch(`https://api.stability.ai/v1/generation/${route.primary_model}/text-to-image`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({
              text_prompts: [{ text: finalPrompt, weight: 1 }],
              width, height,
              steps: imageSettings.quality === 'Ultra' ? 50 : 30,
              samples: 1
            })
          }),
          AI_CALL_TIMEOUT_MS,
          'stability-image'
        );
        const data = await res.json() as any;
        if (!res.ok) throw new Error(data?.message || `Stability AI error: ${res.status}`);
        const b64 = data.artifacts?.[0]?.base64;
        imageUrl = b64 ? `data:image/png;base64,${b64}` : '';

      } else if (providerId === 'replicate') {
        const res = await withTimeout(
          fetch('https://api.replicate.com/v1/predictions', {
            method: 'POST',
            headers: { 'Authorization': `Token ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ version: route.primary_model, input: { prompt: finalPrompt } })
          }),
          AI_CALL_TIMEOUT_MS,
          'replicate-image-init'
        );
        const prediction = await res.json() as any;
        if (!res.ok) throw new Error(prediction?.detail || `Replicate error: ${res.status}`);

        let pollUrl = prediction.urls?.get;
        for (let i = 0; i < 30; i++) {
          await new Promise(r => setTimeout(r, 2000));
          const poll = await fetch(pollUrl, { headers: { 'Authorization': `Token ${apiKey}` } });
          const pollData = await poll.json() as any;
          if (pollData.status === 'succeeded') {
            imageUrl = Array.isArray(pollData.output) ? pollData.output[0] : pollData.output;
            break;
          }
          if (pollData.status === 'failed') throw new Error('Replicate generation failed');
        }
      }

      if (!imageUrl) throw new Error('Image generation returned empty result');

      const estimatedCost = (route.cost_per_usage || 0) / 1000;
      if (estimatedCost > 0) {
        await pool.query(
          'UPDATE api_keys_vault SET used_today = used_today + $1, updated_at = CURRENT_TIMESTAMP WHERE provider = $2',
          [estimatedCost, providerId]
        );
      }

      await logSystemActivity(userId, 'PERPLEXTA_EXECUTION', `Image generated via ${route.primary_provider}/${route.primary_model}`, { toolIdStr, provider: providerId });

      return { result: imageUrl };

    } catch (imgErr: any) {
      await safeDecrementOnFailure(quotaCheck, userId, toolIdStr, walletCharged);
      console.error('[Orchestrator Image] Generation failed:', imgErr.message);
      throw new Error(JSON.stringify({
        error: `Image generation failed: ${imgErr.message}`,
        error_ar: `فشل توليد الصورة: ${imgErr.message}`,
        type: "GENERATION_ERROR"
      }));
    }
  }

  if (toolIdStr === 'tts') {
    try {
      const voiceId = reqBody.voice_id || route.primary_model || 'standard';
      const audioBuffer = await withTimeout(
        perplextaTTS(cleanUserPrompt, voiceId),
        AI_CALL_TIMEOUT_MS,
        'tts'
      );

      const estimatedCost = (route.cost_per_usage || 0) / 1000;
      if (estimatedCost > 0) {
        await pool.query(
          'UPDATE api_keys_vault SET used_today = used_today + $1, updated_at = CURRENT_TIMESTAMP WHERE provider = $2',
          [estimatedCost, route.primary_provider.toLowerCase()]
        );
      }

      await logSystemActivity(userId, 'PERPLEXTA_EXECUTION', `TTS generated via ElevenLabs voice=${voiceId}`, { toolIdStr });

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

      const providerId = route.primary_provider.toLowerCase();
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
      formData.append('model', route.primary_model || 'whisper-1');
      if (cleanUserPrompt) formData.append('prompt', cleanUserPrompt);

      const res = await withTimeout(
        fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiKey}` },
          body: formData
        }),
        AI_CALL_TIMEOUT_MS,
        'stt'
      );

      const data = await res.json() as any;
      if (!res.ok) throw new Error(data?.error?.message || `STT API error: ${res.status}`);

      const transcription = data.text || '';

      const estimatedCost = (route.cost_per_usage || 0) / 1000;
      if (estimatedCost > 0) {
        await pool.query(
          'UPDATE api_keys_vault SET used_today = used_today + $1, updated_at = CURRENT_TIMESTAMP WHERE provider = $2',
          [estimatedCost, providerId]
        );
      }

      await logSystemActivity(userId, 'PERPLEXTA_EXECUTION', `STT transcription via ${route.primary_provider}/${route.primary_model}`, { toolIdStr });

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
    try {
      const providerId = route.primary_provider.toLowerCase();
      const apiKey = await getProviderKey(providerId);

      if (!apiKey) {
        await safeDecrementOnFailure(quotaCheck, userId, toolIdStr, walletCharged);
        throw new Error(JSON.stringify({
          error: "Video generation service is temporarily unavailable. No active API key found.",
          error_ar: "خدمة توليد الفيديو غير متاحة حالياً. لا يوجد مفتاح API نشط.",
          type: "SYSTEM_INACTIVE"
        }));
      }

      let videoUrl = '';

      if (providerId === 'replicate') {
        const res = await withTimeout(
          fetch('https://api.replicate.com/v1/predictions', {
            method: 'POST',
            headers: { 'Authorization': `Token ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ version: route.primary_model, input: { prompt: finalPrompt } })
          }),
          AI_CALL_TIMEOUT_MS,
          'replicate-video-init'
        );
        const prediction = await res.json() as any;
        if (!res.ok) throw new Error(prediction?.detail || `Replicate video error: ${res.status}`);

        const pollUrl = prediction.urls?.get;
        for (let i = 0; i < 60; i++) {
          await new Promise(r => setTimeout(r, 5000));
          const poll = await fetch(pollUrl, { headers: { 'Authorization': `Token ${apiKey}` } });
          const pollData = await poll.json() as any;
          if (pollData.status === 'succeeded') {
            videoUrl = Array.isArray(pollData.output) ? pollData.output[0] : pollData.output;
            break;
          }
          if (pollData.status === 'failed') throw new Error(`Replicate video generation failed: ${pollData.error || 'unknown'}`);
        }
      } else if (providerId === 'runway') {
        const res = await withTimeout(
          fetch('https://api.runwayml.com/v1/image_to_video', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
              'X-Runway-Version': '2024-11-06'
            },
            body: JSON.stringify({
              model: route.primary_model || 'gen3a_turbo',
              promptText: finalPrompt,
              duration: 5,
              ratio: '1280:768'
            })
          }),
          AI_CALL_TIMEOUT_MS,
          'runway-video-init'
        );
        const task = await res.json() as any;
        if (!res.ok) throw new Error(task?.error || `Runway error: ${res.status}`);

        const taskId = task.id;
        for (let i = 0; i < 60; i++) {
          await new Promise(r => setTimeout(r, 5000));
          const poll = await fetch(`https://api.runwayml.com/v1/tasks/${taskId}`, {
            headers: { 'Authorization': `Bearer ${apiKey}`, 'X-Runway-Version': '2024-11-06' }
          });
          const pollData = await poll.json() as any;
          if (pollData.status === 'SUCCEEDED') {
            videoUrl = pollData.output?.[0] || '';
            break;
          }
          if (pollData.status === 'FAILED') throw new Error(`Runway video generation failed: ${pollData.failure || 'unknown'}`);
        }
      }

      if (!videoUrl) throw new Error('Video generation returned empty result');

      const estimatedCost = (route.cost_per_usage || 0) / 1000;
      if (estimatedCost > 0) {
        await pool.query(
          'UPDATE api_keys_vault SET used_today = used_today + $1, updated_at = CURRENT_TIMESTAMP WHERE provider = $2',
          [estimatedCost, providerId]
        );
      }

      await logSystemActivity(userId, 'PERPLEXTA_EXECUTION', `Video generated via ${route.primary_provider}/${route.primary_model}`, { toolIdStr, provider: providerId });

      return { result: videoUrl };
    } catch (videoErr: any) {
      await safeDecrementOnFailure(quotaCheck, userId, toolIdStr, walletCharged);
      console.error('[Orchestrator Video] Generation failed:', videoErr.message);
      throw new Error(JSON.stringify({
        error: `Video generation failed: ${videoErr.message}`,
        error_ar: `فشل توليد الفيديو: ${videoErr.message}`,
        type: "GENERATION_ERROR"
      }));
    }
  }

  let userMemoriesStr = '';
  if (memoryRes && memoryRes.rows && memoryRes.rows.length > 0) {
    userMemoriesStr = "\nMEMORY:\n" + memoryRes.rows.map((m: any) => `- ${m.fact}`).join('\n') + "\n";
  }

  const taskDesc = userLang === 'ar' ? route.task_description_ar : route.task_description;
  const contextSummary = chatRes.rows[0]?.context_summary ? `\nCONTEXT:\n${chatRes.rows[0].context_summary}\n` : '';

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
  }

  if (toolIdStr === 'sovereign_search') {
    const searchInstructions = `[SEARCH ENGINE]
Synthesize the live web context against the user query. Eliminate bias, structure findings with headers and bullets, cite sources precisely.`.trim();

    refinedSystemPromptSegment = refinedSystemPromptSegment ? `${refinedSystemPromptSegment}\n\n${searchInstructions}` : searchInstructions;
  }

  const toolBoundary = isChatOnly
    ? `Active tool: chat. Do NOT simulate image/video/search/audio generation — direct user to the appropriate tool instead.`
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

  let generatedText = '';
  let successfulModel = null;

  for (const target of modelsToTry) {
    try {
      const providerId = target.provider.toLowerCase();

      const [apiKey, urlKey, budgetRes] = await Promise.all([
        getProviderKey(providerId),
        getProviderUrlKey(providerId),
        pool.query('SELECT daily_budget, used_today, is_active FROM api_keys_vault WHERE provider = $1', [providerId])
      ]);

      if (!apiKey) continue;

      let isProviderActive = budgetRes.rows.length === 0 || budgetRes.rows[0].is_active;
      let dailyBudget = 0;
      let usedToday = 0;

      if (budgetRes.rows.length > 0) {
        dailyBudget = parseFloat(budgetRes.rows[0].daily_budget || '0');
        usedToday = parseFloat(budgetRes.rows[0].used_today || '0');
      }

      if (!isProviderActive) continue;

      if (dailyBudget > 0 && usedToday >= dailyBudget) {
        await logSecurityAlert(userId, 'BUDGET_EXCEEDED', 'medium', `Vault Budget Hit: Provider "${target.provider}" reached its daily budget limit (${usedToday}/${dailyBudget}). Attempting fallback.`, { provider: target.provider, dailyBudget, usedToday });
        continue;
      }

      generatedText = await withTimeout(
        callAIProvider(target.provider, target.model, apiKey, finalPrompt, finalSystemPrompt, onChunk, history, { fileData: file_data }, urlKey ?? undefined),
        AI_CALL_TIMEOUT_MS,
        `${target.provider}/${target.model}`
      );
      successfulModel = target;

      const estimatedCost = (route.cost_per_usage || 0) / 1000;
      if (estimatedCost > 0) {
        await pool.query('UPDATE api_keys_vault SET used_today = used_today + $1, updated_at = CURRENT_TIMESTAMP WHERE provider = $2', [estimatedCost, target.provider.toLowerCase()]);
      }

      if (chatIdNum > 0) {
        setImmediate(() => {
          updateChatContextSummary(chatIdNum, userId, target.provider, target.model, apiKey).catch(err => {
            console.error('[Orchestrator] Progressive summarization error:', err);
            logSystemActivity(userId, 'SUMMARIZATION_FAILED', `Context summary update failed for chat ${chatIdNum}: ${err.message}`, { chatIdNum }).catch(() => {});
          });
        });
      }

      try {
        const extractedFacts: { fact: string; category: string }[] = [];
        const memRegex = new RegExp(MEMORY_TAG_REGEX.source, 'gi');
        let match;

        while ((match = memRegex.exec(generatedText)) !== null) {
          const category = match[1] || 'general';
          const fact = match[2]?.trim();
          if (fact) extractedFacts.push({ fact, category });
        }

        if (extractedFacts.length > 0) {
          const countRes = await pool.query('SELECT count(*) FROM chat_memories WHERE user_id = $1', [userId]);
          const currentCount = parseInt(countRes.rows[0].count);

          if (currentCount >= 48) {
            setImmediate(() => {
              runMemoryConsolidation(userId, chatIdNum, target.provider, target.model, apiKey).catch(err => {
                console.error('[Orchestrator] Memory consolidation error:', err);
                logSystemActivity(userId, 'MEMORY_CONSOLIDATION_FAILED', `Memory consolidation failed for user ${userId}: ${err.message}`, { userId }).catch(() => {});
              });
            });
          }

          const insertPromises = extractedFacts.map(item =>
            pool.query(
              "INSERT INTO chat_memories (user_id, chat_id, fact, category, source) VALUES ($1, $2, $3, $4, 'ai') RETURNING *",
              [userId, chatIdNum || null, item.fact, item.category]
            ).then((insertRes: any) => {
              if (io) {
                io.to(`user_${userId}`).emit('memory_extracted', {
                  fact: item.fact,
                  category: item.category,
                  id: insertRes.rows[0].id
                });
              }
            })
          );

          await Promise.all(insertPromises);

          if (io) {
            const checkNewCount = await pool.query('SELECT count(*) FROM chat_memories WHERE user_id = $1', [userId]);
            const newCount = parseInt(checkNewCount.rows[0].count);
            if (newCount >= 48) {
              io.to(`user_${userId}`).emit('memory_warning', { currentCount: newCount });
            }
          }
        }

        const cleanRegex = new RegExp(MEMORY_TAG_REGEX.source, 'gi');
        generatedText = generatedText.replace(cleanRegex, '').trim();
      } catch (memProcErr) {
        console.error('[Orchestrator] Error during Perplexta memory parsing & extraction:', memProcErr);
      }

      break;
    } catch (e: any) {
      console.error(`[Orchestrator] Failure on ${target.provider}/${target.model}:`, e);

      const errMessage = e.message || '';
      const isQuotaOrAuthExhausted =
        errMessage.includes('429') ||
        errMessage.includes('401') ||
        errMessage.includes('403') ||
        errMessage.includes('1113') ||
        errMessage.includes('Insufficient balance') ||
        errMessage.includes('resource package') ||
        errMessage.includes('quota') ||
        errMessage.includes('recharge') ||
        errMessage.includes('balance') ||
        errMessage.includes('subscription') ||
        errMessage.includes('upgrade');

      if (isQuotaOrAuthExhausted && !errMessage.includes('AI_TIMEOUT')) {
        try {
          const provLower = target.provider.toLowerCase();
          await pool.query('UPDATE api_keys_vault SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE provider = $1', [provLower]);
          invalidateVaultCache(provLower);

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

  if (!generatedText) {
    await safeDecrementOnFailure(quotaCheck, userId, toolIdStr, walletCharged);
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

  return { result: generatedText };
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

async function updateChatContextSummary(chatIdNum: number, userId: number, provider: string, model: string, apiKey: string) {
  try {
    const recentMessages = await pool.query(
      "SELECT role, content FROM messages WHERE chat_id = $1 AND content IS NOT NULL AND content != '' ORDER BY created_at DESC LIMIT 20",
      [chatIdNum]
    );

    if (recentMessages.rows.length < 4) return;

    const conversationText = [...recentMessages.rows].reverse()
      .map((m: any) => `${m.role === 'assistant' ? 'Assistant' : 'User'}: ${m.content}`)
      .join('\n');

    const summaryPrompt = `Summarize this conversation in 2-3 dense sentences capturing the main topics, decisions, and user context. Be factual and brief.\n\n${conversationText}`;

    const summary = await withTimeout(
      callAIProvider(provider, model, apiKey, summaryPrompt, 'You are a concise conversation summarizer. Output only the summary, no preamble.', undefined, [], {}, undefined),
      60000,
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

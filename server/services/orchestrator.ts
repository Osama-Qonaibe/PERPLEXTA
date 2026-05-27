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
      const historyRes = await pool.query(
        "SELECT role, content FROM messages WHERE chat_id = $1 AND content IS NOT NULL AND content != '' ORDER BY created_at DESC LIMIT 16",
        [chatIdNum]
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
  
  if (!quotaCheck.allowed) {
    try {
      const chargeRes = await deductUsageFromWallet(userId, toolIdStr);
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
      if (quotaCheck.allowed) await decrementUserUsage(userId, toolIdStr);
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
          aspectRatio === '4:3' ? '1024x1024' :
          '1024x1024';
        const quality = imageSettings.quality === 'Ultra' ? 'hd' : 'standard';
        const style = imageSettings.style === 'واقعي' || imageSettings.style === 'Realistic' ? 'natural' : 'vivid';

        const res = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: route.primary_model,
            prompt: finalPrompt,
            n: 1,
            size,
            quality,
            style
          })
        });
        const data = await res.json() as any;
        if (!res.ok) throw new Error(data?.error?.message || `OpenAI image API error: ${res.status}`);
        imageUrl = data.data?.[0]?.url || '';

      } else if (providerId === 'together') {
        const aspectRatio = imageSettings.aspectRatio || '1:1';
        const width = aspectRatio === '16:9' ? 1344 : aspectRatio === '9:16' ? 768 : 1024;
        const height = aspectRatio === '9:16' ? 1344 : aspectRatio === '16:9' ? 768 : 1024;

        const res = await fetch('https://api.together.xyz/v1/images/generations', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: route.primary_model,
            prompt: finalPrompt,
            n: 1,
            width,
            height
          })
        });
        const data = await res.json() as any;
        if (!res.ok) throw new Error(data?.error?.message || `Together image API error: ${res.status}`);
        imageUrl = data.data?.[0]?.url || data.data?.[0]?.b64_json || '';

      } else if (providerId === 'stabilityai' || providerId === 'stability') {
        const aspectRatio = imageSettings.aspectRatio || '1:1';
        const width = aspectRatio === '16:9' ? 1344 : aspectRatio === '9:16' ? 768 : 1024;
        const height = aspectRatio === '9:16' ? 1344 : aspectRatio === '16:9' ? 768 : 1024;

        const res = await fetch(`https://api.stability.ai/v1/generation/${route.primary_model}/text-to-image`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            text_prompts: [{ text: finalPrompt, weight: 1 }],
            width,
            height,
            steps: imageSettings.quality === 'Ultra' ? 50 : 30,
            samples: 1
          })
        });
        const data = await res.json() as any;
        if (!res.ok) throw new Error(data?.message || `Stability AI error: ${res.status}`);
        const b64 = data.artifacts?.[0]?.base64;
        imageUrl = b64 ? `data:image/png;base64,${b64}` : '';

      } else if (providerId === 'replicate') {
        const res = await fetch('https://api.replicate.com/v1/predictions', {
          method: 'POST',
          headers: {
            'Authorization': `Token ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            version: route.primary_model,
            input: { prompt: finalPrompt }
          })
        });
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
      await pool.query(
        'UPDATE api_keys_vault SET used_today = used_today + $1, updated_at = CURRENT_TIMESTAMP WHERE provider = $2',
        [estimatedCost, providerId]
      );

      await logSystemActivity(userId, 'PERPLEXTA_EXECUTION', `Image generated via ${route.primary_provider}/${route.primary_model}`, { toolIdStr, provider: providerId });

      return { result: imageUrl };

    } catch (imgErr: any) {
      if (quotaCheck.allowed) await decrementUserUsage(userId, toolIdStr);
      console.error('[Orchestrator Image] Generation failed:', imgErr.message);
      throw new Error(JSON.stringify({
        error: `Image generation failed: ${imgErr.message}`,
        error_ar: `فشل توليد الصورة: ${imgErr.message}`,
        type: "GENERATION_ERROR"
      }));
    }
  }

  let userMemoriesStr = '';
  if (memoryRes && memoryRes.rows && memoryRes.rows.length > 0) {
    userMemoriesStr = "\nASSISTANT_MEMORY_RECORDS:\n" + memoryRes.rows.map((m: any) => `- ${m.fact}`).join('\n') + "\n";
  }

  const taskDesc = userLang === 'ar' ? route.task_description_ar : route.task_description;
  const contextSummary = chatRes.rows[0]?.context_summary ? `\nCONVERSATION CONTEXT SUMMARY:\n${chatRes.rows[0].context_summary}\n` : '';
  
  let refinedSystemPromptSegment = system_prompt ? `[REFined_INSTRUCTIONS]\n${system_prompt}` : '';
  
  if (toolIdStr === 'sovereign_memory') {
    const memoryInstructions = `
[SOVEREIGN CORE MEMORY PROTOCOL]
You are acting as the Sovereign Memory Synthesis Engine (الذاكرة السيادية الجوهرية) of Perplexta.
Your direct mandate is to synthesize the user's current message, context, and conversation history against their long-term knowledge records listed under ASSISTANT_MEMORY_RECORDS.

1. CRITICAL EXTRACTIVE CORE: Analyze the input and extract precisely any strategic, high-value, or long-term operational user profile details (such as developer preferences, tech stack, workspace paths, personal goals, behavioral insights, identity context, system settings, or custom rules).
2. MEMORY ACCRETION PATTERN: For each newly discovered fact or preference that is worthy of long-term preservation, append it in your response inside special tags EXACTLY like this:
   <extracted_memory category="general|professional|preference|identity">The exact fact or preference</extracted_memory>
   
   Examples / أمثلة:
   - <extracted_memory category="professional">User is working on a high-capacity Node.js and PostgreSQL backend</extracted_memory>
   - <extracted_memory category="preference">User prefers clear explanation of root causes without long retrospectives</extracted_memory>
   - <extracted_memory category="identity">User is a security engineer who strictly prevents unauthorized API leakage</extracted_memory>
   - <extracted_memory category="general">المستخدم يفضل تبسيط الشروح وحل المشاكل التقنية فوراً</extracted_memory>

3. DENSE CONVERSATIONAL REPORTS: Discuss the user's sovereign memory state, tell them what you have ingested, synthesised, or pruned, and provide a premium, elite Arabic/English synthesis of their unified context in response to their prompt. Adhere to Tajawal typography standards and professional elite posture. Do not list raw XML files, tags or internal JSON attributes in the conversational message segment.

CRITICAL MANDATE: You MUST output the <extracted_memory> tags inside your final response when detecting any facts/preferences worthy of memory. If you do not include <extracted_memory> tags, the memory engine will not persist the fact.
تنبيه هام ومصيري: يجب تفكيك المدخلات وصياغتها داخل وسم <extracted_memory category="...">الحقيقة أو التفضيل المستخلص</extracted_memory> في نهاية الإجابة لضمان قيام الخادم بالتقاطها وحفظها في قاعدة البيانات بأعلى دقة ممكنة.
`.trim();

    refinedSystemPromptSegment = refinedSystemPromptSegment ? `${refinedSystemPromptSegment}\n\n${memoryInstructions}` : memoryInstructions;
  } else if (isChatOnly) {
    const conversationalMemoryInstructions = `
[SOVEREIGN COGNITIVE MEMORY ACQUISITION]
* Always dynamically monitor the dialogue for user-specific preferences, tech stack, personal workspace parameters, goals, system settings, rules, or identity facts.
* If you discover any durable fact, style preference, specialized rule, or user characteristic that is highly beneficial for long-term personalized recall, encapsulate it inside XML tags like this: <extracted_memory category="general|professional|preference|identity">Fact or preference details</extracted_memory>
* These tags are parsed securely in the background and stored in the user's permanent memory database to guide future chats. Do NOT mention this mechanism in your conversational message. Keep the tags neat.
`.trim();

    refinedSystemPromptSegment = refinedSystemPromptSegment ? `${refinedSystemPromptSegment}\n\n${conversationalMemoryInstructions}` : conversationalMemoryInstructions;
  }

  if (toolIdStr === 'sovereign_search') {
    const searchInstructions = `
[SOVEREIGN CORE INTELLIGENCE SEARCH PROTOCOL]
You are acting as the Sovereign Intelligence Search Engine (البحث الاستخباراتي السيادي) of Perplexta.
Your mandate is to perform a deep-dive, real-time extraction and analysis of the search context against the user's prompt.

1. CRITICAL ANALYSIS: Synthesise the live web search context, eliminate tracking biases, and organize findings with perfect analytical rigor.
2. ELITE REPORTING: Structure your response using clear headers, bulleted high-density insights, and precise source attributions. Match the elite, premium Arabic/English posture of Perplexta.
`.trim();

    refinedSystemPromptSegment = refinedSystemPromptSegment ? `${refinedSystemPromptSegment}\n\n${searchInstructions}` : searchInstructions;
  }

  const toolSeparationProtocol = `
[STRICT_TASK_AND_TOOL_ISOLATION_MANDATE]
- CURRENT_ACTIVE_TOOL: "${toolIdStr}"
- COGNITIVE_BOUNDARY_RULE: 
  ${isChatOnly ? `
  * You are operating in a standard CHAT/CONVERSATIONAL mode.
  * Your sole purpose is to engage in professional dialogue, explain concepts, answer questions, and assist conversationally.
  * You MUST NOT execute or simulate specialized tools (such as Image Generation, Video Engine Rendering, Live Search Scraping, High-Dimensional Audio Synthesizing, or Legal Auditing).
  * If the user asks for these specific media, search, or code generation tasks, politely advise them in a premium tone (in their preferred language) to activate the corresponding tool from the "Advanced Tools" menu in the input bar.` : `
  * You are operating as a SPECIALIZED engineering tool ("${toolIdStr}").
  * You MUST strictly keep your focus within the domain of this active tool.
  * Do not answer general lifestyle chat queries or unrelated general conversational paths. Focus 100% on producing high-fidelity outputs for the active tool's specific domain.`}
- FUSION_CONTROL: Do not let any tool duplicate the role of another. No overlapping capabilities are permitted. Keep the boundaries absolute.
`.trim();

  const finalSystemPrompt = `
${protocol}

[MISSION_OBJECTIVE]
${taskDesc || 'Execute the user request with highest professional precision.'}

[TOOL_CONTROL_POLICY]
${toolSeparationProtocol}

[CONVERSATION_CONTEXT]
${contextSummary || 'No previous summary available.'}
${userMemoriesStr}

[CORE_DIRECTIVE]
- Prioritize user intent.
- Maintain the professional tone defined in the Protocol.
- Do not mention being an AI or your technical limitations.
- If system_prompt is provided below, treat it as a priority refinement.

${refinedSystemPromptSegment}
`.trim();
  
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
      
      generatedText = await callAIProvider(target.provider, target.model, apiKey, finalPrompt, finalSystemPrompt, onChunk, history, { fileData: file_data }, urlKey ?? undefined);
      successfulModel = target;

      const estimatedCost = (route.cost_per_usage || 0) / 1000;
      await pool.query('UPDATE api_keys_vault SET used_today = used_today + $1, updated_at = CURRENT_TIMESTAMP WHERE provider = $2', [estimatedCost, target.provider.toLowerCase()]);

      if (chatIdNum > 0) {
        updateChatContextSummary(chatIdNum, userId, target.provider, target.model, apiKey).catch(err => {
          console.error('[Orchestrator] Progressive summarization error:', err);
        });
      }
      
      try {
        const memoryRegex = /<extracted_memory(?:\s+category\s*=\s*["']?([^"' >]+)["']?)?\s*>([\s\S]*?)<\/extracted_memory>/gi;
        let match;
        const extractedFacts: { fact: string; category: string }[] = [];
        
        while ((match = memoryRegex.exec(generatedText)) !== null) {
          const category = match[1] || 'general';
          const fact = match[2]?.trim();
          if (fact) {
            extractedFacts.push({ fact, category });
          }
        }

        if (extractedFacts.length > 0) {
          const countRes = await pool.query('SELECT count(*) FROM chat_memories WHERE user_id = $1', [userId]);
          let currentCount = parseInt(countRes.rows[0].count);

          if (currentCount >= 50) {
            setImmediate(() => {
              runMemoryConsolidation(userId, chatIdNum, target.provider, target.model, apiKey).catch(err => {
                console.error('[Orchestrator] Memory consolidation error:', err);
              });
            });
          }

          const insertPromises = extractedFacts.map(item =>
            pool.query(
              "INSERT INTO chat_memories (user_id, chat_id, fact, category, source) VALUES ($1, $2, $3, $4, 'ai') RETURNING *",
              [userId, chatIdNum || null, item.fact, item.category]
            ).then(insertRes => {
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
            if (newCount >= 45) {
              io.to(`user_${userId}`).emit('memory_warning', { currentCount: newCount });
            }
          }
        }
        
        generatedText = generatedText.replace(/<extracted_memory(?:\s+category\s*=\s*["']?([^"' >]+)["']?)?\s*>([\s\S]*?)<\/extracted_memory>/gi, '').trim();
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
        
      if (isQuotaOrAuthExhausted) {
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
    if (quotaCheck.allowed) {
      await decrementUserUsage(userId, toolIdStr);
    }
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
    'SELECT id, fact, category, chat_id FROM chat_memories WHERE user_id = $1 ORDER BY created_at ASC LIMIT 10',
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

  if (!associatedChatId) {
    const latestMessageChatRes = await pool.query(
      `SELECT c.id FROM chats c 
       JOIN messages m ON m.chat_id = c.id 
       WHERE c.user_id = $1 
       ORDER BY m.created_at DESC 
       LIMIT 1`,
      [userId]
    );
    if (latestMessageChatRes.rows.length > 0) {
      associatedChatId = latestMessageChatRes.rows[0].id;
    } else {
      const latestChatRes = await pool.query(
        "SELECT id FROM chats WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 1",
        [userId]
      );
      if (latestChatRes.rows.length > 0) {
        associatedChatId = latestChatRes.rows[0].id;
      }
    }
  }

  const condenseSystemPrompt = `You are the Perplexta Memory Distillation Engine.\nYour objective is to execute AUTO-CONSOLIDATION on 10 legacy user profile memories, condensing them into a SINGLE high-density, unified, and highly descriptive factual statement in the original language of the records (Arabic or English).\nProvide ONLY the single condensed statement with no intro/outro or formatting. Limit of 150 characters.`;

  const condensePrompt = `Please distill the following list of old user profile memories into exactly one single dense fact summary:\n${factsToCondense}`;

  let condensedFact = '';
  try {
    condensedFact = await callAIProvider(provider, model, apiKey, condensePrompt, condenseSystemPrompt);
    condensedFact = condensedFact.trim();
  } catch (condenseErr) {
    console.error('[Orchestrator] AI consolidation failed, using fallback aggregation.', condenseErr);
    condensedFact = oldestRes.rows.map((r: any) => r.fact).join('; ');
    if (condensedFact.length > 255) {
      condensedFact = condensedFact.substring(0, 252) + '...';
    }
  }

  if (condensedFact) {
    condensedFact = condensedFact.replace(/<think>[\s\S]*?<\/think>/gi, '');
    condensedFact = condensedFact.replace(/<extracted_memory(?:\s+category\s*=\s*["']?([^"' >]+)["']?)?\s*>([\s\S]*?)<\/extracted_memory>/gi, '');
    condensedFact = condensedFact.replace(/```(?:json)?/gi, '');
    condensedFact = condensedFact.replace(/[{}]/g, '');
    condensedFact = condensedFact.trim();
  }

  if (condensedFact) {
    await pool.query('DELETE FROM chat_memories WHERE id = ANY($1::int[])', [oldestIds]);
    await pool.query(
      "INSERT INTO chat_memories (user_id, chat_id, fact, category, source) VALUES ($1, $2, $3, 'general', 'ai')",
      [userId, associatedChatId || null, condensedFact]
    );

    if (io) {
      io.to(`user_${userId}`).emit('memory_consolidation', { consolidatedCount: oldestRes.rows.length });
    }
  }
}

function estimateAICallCost(provider: string, model: string, inputChars: number, outputChars: number): number {
  const normProvider = provider.toLowerCase();
  const normModel = model.toLowerCase();
  
  const inputTokens = Math.ceil(inputChars / 4);
  const outputTokens = Math.ceil(outputChars / 4);

  let inputRatePerMillion = 0.5; 
  let outputRatePerMillion = 1.5;

  if (normProvider === 'google' || normProvider === 'gemini') {
    if (normModel.includes('pro')) {
      inputRatePerMillion = 1.25;
      outputRatePerMillion = 5.00;
    } else {
      inputRatePerMillion = 0.075;
      outputRatePerMillion = 0.30;
    }
  } else if (normProvider === 'openai') {
    if (normModel.includes('gpt-4o-mini')) {
      inputRatePerMillion = 0.15;
      outputRatePerMillion = 0.60;
    } else if (normModel.includes('gpt-4') || normModel.includes('o1')) {
      inputRatePerMillion = 5.00;
      outputRatePerMillion = 15.00;
    } else {
      inputRatePerMillion = 0.50;
      outputRatePerMillion = 1.50;
    }
  } else if (normProvider === 'anthropic') {
    if (normModel.includes('sonnet')) {
      inputRatePerMillion = 3.00;
      outputRatePerMillion = 15.00;
    } else if (normModel.includes('haiku')) {
      inputRatePerMillion = 0.25;
      outputRatePerMillion = 1.25;
    } else {
      inputRatePerMillion = 3.00;
      outputRatePerMillion = 15.00;
    }
  } else if (normProvider === 'deepseek') {
    inputRatePerMillion = 0.14;
    outputRatePerMillion = 0.28;
  }

  const inputCost = (inputTokens / 1000000) * inputRatePerMillion;
  const outputCost = (outputTokens / 1000000) * outputRatePerMillion;
  
  return Math.max(0.00005, inputCost + outputCost);
}

async function updateChatContextSummary(chatId: number, userId: number, provider: string, model: string, apiKey: string) {
  try {
    if (!pool) return;

    const providerId = provider.toLowerCase();
    const budgetRes = await pool.query('SELECT daily_budget, used_today, is_active FROM api_keys_vault WHERE provider = $1', [providerId]);
    if (budgetRes.rows.length > 0) {
      const { daily_budget, used_today, is_active } = budgetRes.rows[0];
      if (!is_active) {
        console.warn(`[Summary Service] Provider "${provider}" is inactive. Summarization skipped.`);
        return;
      }
      const dailyBudget = parseFloat(daily_budget || '0');
      const usedToday = parseFloat(used_today || '0');
      if (dailyBudget > 0 && usedToday >= dailyBudget) {
        console.warn(`[Summary Service] Provider "${provider}" reached daily budget limit (${usedToday}/${dailyBudget}). Summarization skipped.`);
        return;
      }
    }

    const msgRes = await pool.query(
      "SELECT role, content FROM messages WHERE chat_id = $1 AND content IS NOT NULL AND content != '' ORDER BY created_at ASC",
      [chatId]
    );
    const msgs = msgRes.rows;
    if (msgs.length < 2) return;

    const conversationText = msgs.map((m: any) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n');
    
    const summarySystemPrompt = `You are the Perplexta Conversation Summarizer.\nYour goal is to write a highly dense, progressive, bulleted text summary in the main language used (Arabic or English) capturing the central topics, user preferences, instructions, and outcomes.\nDo NOT use markdown headers, just clear text bullets. Limit of 250 characters. Maintain the professional tone of Perplexta.`;
    
    const summaryPrompt = `Please summarize the current state of this conversation so far, focusing on key decisions and preferences:\n${conversationText}`;

    const contextSummary = await callAIProvider(provider, model, apiKey, summaryPrompt, summarySystemPrompt);
    if (contextSummary) {
      const inputChars = summaryPrompt.length + summarySystemPrompt.length;
      const outputChars = contextSummary.length;
      const updateCost = estimateAICallCost(provider, model, inputChars, outputChars);
      
      await Promise.all([
        pool.query('UPDATE chats SET context_summary = $1 WHERE id = $2', [contextSummary.trim(), chatId]),
        pool.query('UPDATE api_keys_vault SET used_today = used_today + $1, updated_at = CURRENT_TIMESTAMP WHERE provider = $2', [updateCost, providerId])
      ]);
    }
  } catch (err) {
    console.error('[Memory Service] Progressive summarization failed:', err);
  }
}

import express from 'express';
import { pool } from '../db/index.js';
import { io } from '../config/socket.js';
import { decrypt } from '../utils/crypto.js';
import { callAIProvider, getProviderKey, invalidateVaultCache } from './ai.js';
import { checkUserQuota, incrementUserUsage } from './quota.js';
import { logSecurityAlert, logSystemActivity } from './notifications.js';
import { extractTextFromFile } from './extractor.js';
import { perplextaTTS } from './tts.js';
import { performPerplextaSearch } from './search.js';
import { getAppName } from './system.js';
import { extractFollowUps } from '../utils/helpers.js';
import { CORE_PROTOCOL } from '../config/protocol.js';

export const executeTaskLogic = async (reqBody: any, userId: number, req?: express.Request, onChunk?: (chunk: string) => void, socket?: any) => {
  let { tool_id, prompt, system_prompt, chat_id, file_data } = reqBody;
  let toolIdStr = (tool_id as string) || 'chat';
  const chatIdNum = chat_id ? parseInt(chat_id) : 0;
  
  // Simple sanitization to prevent prompt injection by neutralizing internal markers
  const sanitizePrompt = (p: string) => {
    if (!p) return p;
    // Replace markers that could be used for hijacking context
    return p.replace(/(SYSTEM[ _]MEMORY[ _]INGESTION|LIVE[ _]WEB[ _]CONTEXT|USER[ _]PROMPT|TECHNICAL[ _]DIRECTIVE|ASSISTANT[ _]MEMORY[ _]RECORDS|CONVERSATION[ _]CONTEXT[ _]SUMMARY):/gi, '[CLEANED_MARKER]');
  };

  const cleanUserPrompt = sanitizePrompt(prompt);
  let finalPrompt = cleanUserPrompt;
  
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
  
  if (toolIdStr === 'perplexta_search') {
    try {
      const searchResults = await performPerplextaSearch(cleanUserPrompt);
      if (searchResults && searchResults.length > 0) {
        const searchContext = searchResults.map((r: any) => `Source: ${r.link}\nTitle: ${r.title}\nSnippet: ${r.snippet}`).join('\n\n');
        finalPrompt = `LIVE WEB CONTEXT:\n${searchContext}\n\nUSER PROMPT:\n${cleanUserPrompt}`;
      }
    } catch (searchErr) {
      console.error('[Orchestrator] Perplexta Search failed:', searchErr);
    }
  }

  if (toolIdStr === 'perplexta_memory') {
    try {
      const uMemoryRes = await pool.query('SELECT memory FROM users WHERE id = $1', [userId]);
      const memory = uMemoryRes.rows[0]?.memory;
      if (memory) {
        finalPrompt = `SYSTEM MEMORY INGESTION:\n${memory}\n\nUSER PROMPT:\n${cleanUserPrompt}`;
      }
    } catch (memErr) {
      console.error('[Orchestrator] Perplexta Memory ingestion failed:', memErr);
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
  
  let refinedSystemPromptSegment = system_prompt ? `[REFined_INSTRUCTIONS]\n${system_prompt}` : '';
  
  if (toolIdStr === 'sovereign_memory') {
    const memoryInstructions = `
[SOVEREIGN CORE MEMORY PROTOCOL]
You are acting as the Sovereign Memory Synthesis Engine (الذاكرة السيادية الجوهرية) of Perplexta.
Your direct mandate is to synthesize the user's current message, context, and conversation history against their long-term knowledge records listed under ASSISTANT_MEMORY_RECORDS.

1. CRITICAL EXTRACTIVE CORE: Analyze the input and extract precisely any strategic, high-value, or long-term operational user profile details (such as developer preferences, tech stack, workspace paths, personal goals, behavioral insights, identity context, system settings, or custom rules).
2. MEMORY ACCRETION PATTERN: For each newly discovered fact or preference that is worthy of long-term preservation, append it in your response inside special tags EXACTLY like this:
   <extracted_memory category="general|professional|preference|identity">The exact fact or preference</extracted_memory>
   
   Examples:
   - <extracted_memory category="professional">User is working on a high-capacity Node.js and PostgreSQL backend</extracted_memory>
   - <extracted_memory category="preference">User prefers clear explanation of root causes without long retrospectives</extracted_memory>
   - <extracted_memory category="identity">User is a security engineer who strictly prevents unauthorized API leakage</extracted_memory>

3. DENSE CONVERSATIONAL REPORTS: Discuss the user's sovereign memory state, tell them what you have ingested, synthesised, or pruned, and provide a premium, elite Arabic/English synthesis of their unified context in response to their prompt. Adhere to Tajawal typography standards and professional elite posture. Do not list raw XML files, tags or internal JSON attributes in the conversational message segment.
`.trim();

    refinedSystemPromptSegment = refinedSystemPromptSegment ? `${refinedSystemPromptSegment}\n\n${memoryInstructions}` : memoryInstructions;
  }

  const finalSystemPrompt = `
${protocol}

[MISSION_OBJECTIVE]
${taskDesc || 'Execute the user request with highest professional precision.'}

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
      
      generatedText = await callAIProvider(target.provider, target.model, apiKey, finalPrompt, finalSystemPrompt, onChunk, [], { fileData: file_data });
      successfulModel = target;

      const estimatedCost = (route.cost_per_usage || 0) / 1000;
      await pool.query('UPDATE api_keys_vault SET used_today = used_today + $1, updated_at = CURRENT_TIMESTAMP WHERE provider = $2', [estimatedCost, target.provider.toLowerCase()]);
      
      // PERPLEXTA MEMORY PROTOCOL: EXTRACTION & CONSOLIDATION
      try {
        const memoryRegex = /<extracted_memory(?:\s+category=["']([^"']+)["'])?>([\s\S]*?)<\/extracted_memory>/gi;
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
          for (const item of extractedFacts) {
            // Retrieve current count of user memories
            const countRes = await pool.query('SELECT count(*) FROM chat_memories WHERE user_id = $1', [userId]);
            const currentCount = parseInt(countRes.rows[0].count);
            
            if (currentCount >= 50) {
              // Execute AUTO-CONSOLIDATION at 50 records limit
              const oldestRes = await pool.query(
                'SELECT id, fact, category FROM chat_memories WHERE user_id = $1 ORDER BY created_at ASC LIMIT 10',
                [userId]
              );
              
              if (oldestRes.rows.length > 0) {
                const oldestIds = oldestRes.rows.map((r: any) => r.id);
                const factsToCondense = oldestRes.rows.map((r: any) => `- [${r.category}] ${r.fact}`).join('\n');
                
                const condenseSystemPrompt = `You are the Perplexta Memory Distillation Engine.
Your objective is to execute AUTO-CONSOLIDATION on 10 legacy user profile memories, condensing them into a SINGLE high-density, unified, and highly descriptive factual statement in the original language of the records (Arabic or English).
Provide ONLY the single condensed statement with no intro/outro or formatting. Limit of 150 characters.`;
                
                const condensePrompt = `Please distill the following list of old user profile memories into exactly one single dense fact summary:
${factsToCondense}`;
                
                let condensedFact = '';
                try {
                  condensedFact = await callAIProvider(
                    target.provider,
                    target.model,
                    apiKey,
                    condensePrompt,
                    condenseSystemPrompt
                  );
                  condensedFact = condensedFact.trim();
                } catch (condenseErr) {
                  console.error('[Orchestrator] AI consolidation failed, using fallback aggregation.', condenseErr);
                  condensedFact = oldestRes.rows.map((r: any) => r.fact).join('; ');
                  if (condensedFact.length > 255) {
                    condensedFact = condensedFact.substring(0, 252) + '...';
                  }
                }
                
                if (condensedFact) {
                  // Delete the 10 oldest records
                  await pool.query('DELETE FROM chat_memories WHERE id = ANY($1::int[])', [oldestIds]);
                  
                  // Insert single consolidated high-density memory
                  await pool.query(
                    "INSERT INTO chat_memories (user_id, chat_id, fact, category, source) VALUES ($1, $2, $3, 'general', 'ai')",
                    [userId, chatIdNum || null, condensedFact]
                  );
                  
                  if (io) {
                    io.to(`user_${userId}`).emit('memory_consolidation', { consolidatedCount: oldestRes.rows.length });
                  }
                }
              }
            }
            
            // Insert the newly extracted memory fact
            const insertRes = await pool.query(
              "INSERT INTO chat_memories (user_id, chat_id, fact, category, source) VALUES ($1, $2, $3, $4, 'ai') RETURNING *",
              [userId, chatIdNum || null, item.fact, item.category]
            );
            
            if (io) {
              io.to(`user_${userId}`).emit('memory_extracted', { 
                fact: item.fact, 
                category: item.category, 
                id: insertRes.rows[0].id 
              });
              
              // Recalculate count for proactive warning
              const checkNewCount = await pool.query('SELECT count(*) FROM chat_memories WHERE user_id = $1', [userId]);
              const newCount = parseInt(checkNewCount.rows[0].count);
              if (newCount >= 45) {
                io.to(`user_${userId}`).emit('memory_warning', { currentCount: newCount });
              }
            }
          }
          
          // Clean extraction tags from final generated text to prevent rendering in client chat bubble
          generatedText = generatedText.replace(/<extracted_memory(?:\s+category=["']([^"']+)["'])?>([\s\S]*?)<\/extracted_memory>/gi, '').trim();
        }
      } catch (memProcErr) {
        console.error('[Orchestrator] Error during Perplexta memory parsing & extraction:', memProcErr);
      }
      
      break;
    } catch (e) {
      console.error(`[Orchestrator] Failure on ${target.provider}/${target.model}:`, e);
    }
  }

  if (!generatedText) {
    await logSecurityAlert(userId, 'ORCHESTRATION_FAILURE', 'high', `System failed to generate response across all configured models for tool "${toolIdStr}".`, { toolIdStr, modelsTried: modelsToTry });
    throw new Error('Intelligence Generation failed across all configured models. Please check your AI API keys and credits in the Admin Dashboard.');
  }

  await incrementUserUsage(userId, toolIdStr);
  
  if (toolIdStr !== 'chat' && toolIdStr !== 'chat_fast') {
     await logSystemActivity(userId, 'PERPLEXTA_EXECUTION', `Executed specialized tool "${toolIdStr}" using ${successfulModel?.provider}/${successfulModel?.model}`, { toolIdStr, model: successfulModel });
  }

  return { result: generatedText };
};

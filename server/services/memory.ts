import { pool } from '../db/index.js';
import { callAIProvider, getProviderKey } from './ai.js';

export interface ConsolidationReportItem {
  userId: number;
  userName: string;
  userEmail: string;
  oldCount: number;
  newCount: number;
  archivedFacts: string[];
  distilledFact: string;
  success: boolean;
  error?: string;
}

export async function getUserMemories(userId: string | number) {
  if (!pool) throw new Error('Database initializing');
  const cleanId = typeof userId === 'string' ? parseInt(userId, 10) : userId;
  const result = await pool.query(
    `SELECT m.*, c.title as chat_title 
     FROM chat_memories m 
     LEFT JOIN chats c ON m.chat_id = c.id 
     WHERE m.user_id = $1 
     ORDER BY m.created_at DESC`,
    [cleanId]
  );
  return result.rows;
}

export async function addMemory(
  userId: string | number,
  fact: string,
  category: string = 'general',
  source: string = 'user',
  chatId?: number
) {
  if (!pool) throw new Error('Database initializing');
  
  const cleanId = typeof userId === 'string' ? parseInt(userId, 10) : userId;
  const countRes = await pool.query('SELECT count(*) FROM chat_memories WHERE user_id = $1', [cleanId]);
  if (parseInt(countRes.rows[0].count, 10) >= 50) {
    throw new Error('Memory limit reached (50)');
  }

  const result = await pool.query(
    'INSERT INTO chat_memories (user_id, chat_id, fact, category, source) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [cleanId, chatId || null, fact, category, source]
  );
  return result.rows[0];
}

export async function updateMemory(id: number, userId: string | number, fact: string, category?: string) {
  if (!pool) throw new Error('Database initializing');
  
  const cleanId = typeof userId === 'string' ? parseInt(userId, 10) : userId;
  let query = 'UPDATE chat_memories SET fact = $1, updated_at = CURRENT_TIMESTAMP';
  const params: any[] = [fact];
  
  if (category) {
    query += ', category = $2 WHERE id = $3 AND user_id = $4 RETURNING *';
    params.push(category, id, cleanId);
  } else {
    query += ' WHERE id = $2 AND user_id = $3 RETURNING *';
    params.push(id, cleanId);
  }

  const result = await pool.query(query, params);
  return result.rows[0];
}

export async function deleteMemory(id: number, userId: string | number) {
  if (!pool) throw new Error('Database initializing');
  const cleanId = typeof userId === 'string' ? parseInt(userId, 10) : userId;
  const result = await pool.query(
    'DELETE FROM chat_memories WHERE id = $1 AND user_id = $2 RETURNING *',
    [id, cleanId]
  );
  return result.rows.length > 0;
}

export async function pruneMemories(userId: string | number) {
  if (!pool) throw new Error('Database initializing');
  const cleanId = typeof userId === 'string' ? parseInt(userId, 10) : userId;
  const result = await pool.query(`
    DELETE FROM chat_memories 
    WHERE id IN (
      SELECT id FROM chat_memories 
      WHERE user_id = $1 
      ORDER BY created_at ASC 
      LIMIT 10
    )
    RETURNING *
  `, [cleanId]);
  return result.rows.length;
}

export async function consolidateAllUserMemories(options?: {
  targetUserId?: number | string;
  threshold?: number;
}) {
  if (!pool) throw new Error('Database initializing');
  
  const threshold = options?.threshold ?? 10;
  const targetUserId = options?.targetUserId ? (typeof options.targetUserId === 'string' ? parseInt(options.targetUserId, 10) : options.targetUserId) : undefined;
  
  // 1. Determine active provider & model from tool_orchestrator
  // Prioritize sovereign_memory first, then chat, then fallback to anything active. No hardcoded default parameters are allowed under Orchestrator Absolutism.
  let provider = '';
  let model = '';
  try {
    const orchestratorRes = await pool.query(
      "SELECT primary_provider, primary_model FROM tool_orchestrator WHERE tool_id = 'sovereign_memory' AND is_active = true"
    );
    if (orchestratorRes.rows.length > 0 && orchestratorRes.rows[0].primary_provider) {
      provider = orchestratorRes.rows[0].primary_provider;
      model = orchestratorRes.rows[0].primary_model;
    } else {
      const chatOrchestratorRes = await pool.query(
        "SELECT primary_provider, primary_model FROM tool_orchestrator WHERE tool_id = 'chat' AND is_active = true"
      );
      if (chatOrchestratorRes.rows.length > 0 && chatOrchestratorRes.rows[0].primary_provider) {
        provider = chatOrchestratorRes.rows[0].primary_provider;
        model = chatOrchestratorRes.rows[0].primary_model;
      } else {
        const generalRes = await pool.query(
          "SELECT primary_provider, primary_model FROM tool_orchestrator WHERE is_active = true AND primary_provider IS NOT NULL LIMIT 1"
        );
        if (generalRes.rows.length > 0) {
          provider = generalRes.rows[0].primary_provider;
          model = generalRes.rows[0].primary_model;
        }
      }
    }
  } catch (err) {
    console.error('[Memory Service] Failed to fetch active orchestrator route.', err);
  }

  if (!provider || !model) {
    throw new Error('Memory Service: Could not resolve a valid active AI provider/model from configuration database. Action aborted to ensure Orchestrator Absolutism.');
  }

  // Get active API Key
  const apiKey = await getProviderKey(provider);
  if (!apiKey) {
    throw new Error(`No active API key configured for provider: ${provider}. Action aborted.`);
  }

  // 2. Query target users
  let targetUsersQuery = '';
  const queryParams: any[] = [];
  
  if (targetUserId) {
    targetUsersQuery = `
      SELECT m.user_id, u.name, u.email, count(*) as count 
      FROM chat_memories m
      JOIN users u ON m.user_id = u.id
      WHERE m.user_id = $1 
      GROUP BY m.user_id, u.name, u.email
    `;
    queryParams.push(targetUserId);
  } else {
    targetUsersQuery = `
      SELECT m.user_id, u.name, u.email, count(*) as count 
      FROM chat_memories m
      JOIN users u ON m.user_id = u.id
      GROUP BY m.user_id, u.name, u.email
      HAVING count(*) >= $1
    `;
    queryParams.push(threshold);
  }

  const usersRes = await pool.query(targetUsersQuery, queryParams);
  const reports: ConsolidationReportItem[] = [];

  for (const row of usersRes.rows) {
    const userId = row.user_id;
    const userName = row.name || 'Elite User';
    const userEmail = row.email || '';
    const oldCount = parseInt(row.count, 10);

    const reportItem: ConsolidationReportItem = {
      userId,
      userName,
      userEmail,
      oldCount,
      newCount: oldCount,
      archivedFacts: [],
      distilledFact: '',
      success: false
    };

    try {
      // Get the 10 oldest memories for user including chat_id for lineage mapping
      const oldestRes = await pool.query(
        'SELECT id, fact, category, chat_id FROM chat_memories WHERE user_id = $1 ORDER BY created_at ASC LIMIT 10',
        [userId]
      );

      if (oldestRes.rows.length >= 2) {
        const oldestIds = oldestRes.rows.map((r: any) => r.id);
        const archivedFacts = oldestRes.rows.map((r: any) => `[${r.category}] ${r.fact}`);
        reportItem.archivedFacts = archivedFacts;

        // Count frequencies of chat_ids among the memories to find the most relevant one
        const chatIdCounts: Record<number, number> = {};
        for (const m of oldestRes.rows) {
          if (m.chat_id) {
            chatIdCounts[m.chat_id] = (chatIdCounts[m.chat_id] || 0) + 1;
          }
        }
        let associatedChatId: number | null = null;
        let maxCount = 0;
        for (const [cidStr, count] of Object.entries(chatIdCounts)) {
          if (count > maxCount) {
            maxCount = count;
            associatedChatId = parseInt(cidStr, 10);
          }
        }
        // Fallback to the chat_id from the most recent message to persist context
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
            // Ultimate fallback to user's most recently active chat
            const latestChatRes = await pool.query(
              "SELECT id FROM chats WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 1",
              [userId]
            );
            if (latestChatRes.rows.length > 0) {
              associatedChatId = latestChatRes.rows[0].id;
            }
          }
        }

        const factsToCondense = oldestRes.rows.map((r: any) => `- [${r.category}] ${r.fact}`).join('\n');
        
        const condenseSystemPrompt = `You are the Perplexta Memory Distillation Engine.
Your objective is to execute AUTO-CONSOLIDATION on 10 legacy user profile memories, condensing them into a SINGLE high-density, unified, and highly descriptive factual statement in the original language of the records (Arabic or English).
Provide ONLY the single condensed statement with no intro/outro or formatting. Limit of 150 characters.`;

        const condensePrompt = `Please distill the following list of old user profile memories into exactly one single dense fact summary:
${factsToCondense}`;

        let distilledFact = '';
        try {
          distilledFact = await callAIProvider(
            provider,
            model,
            apiKey,
            condensePrompt,
            condenseSystemPrompt
          );
          distilledFact = distilledFact.trim();
        } catch (aiErr: any) {
          console.error(`[Memory Service] Distillation AI failed for user ID ${userId}, using fallback aggregation:`, aiErr);
          distilledFact = oldestRes.rows.map((r: any) => r.fact).join('; ');
          if (distilledFact.length > 255) {
            distilledFact = distilledFact.substring(0, 252) + '...';
          }
        }

        // Clean distilledFact from any accidental tags leak, reasoning structures (<think>), and markdown code fences
        if (distilledFact) {
          // Remove deep reasoning think tags block
          distilledFact = distilledFact.replace(/<think>[\s\S]*?<\/think>/gi, '');
          // Remove memory extraction tags
          distilledFact = distilledFact.replace(/<extracted_memory(?:\s+category\s*=\s*["']?([^"' >]+)["']?)?\s*>([\s\S]*?)<\/extracted_memory>/gi, '');
          // Strip any JSON markdown formatting or accidental json tags
          distilledFact = distilledFact.replace(/```(?:json)?/gi, '');
          distilledFact = distilledFact.replace(/[{}]/g, '');
          distilledFact = distilledFact.trim();
        }

        if (distilledFact) {
          // Delete selected oldest records
          await pool.query('DELETE FROM chat_memories WHERE id = ANY($1::int[])', [oldestIds]);

          // Insert high-density consolidated fact with complete lineage context
          await pool.query(
            "INSERT INTO chat_memories (user_id, chat_id, fact, category, source) VALUES ($1, $2, $3, 'general', 'ai')",
            [userId, associatedChatId, distilledFact]
          );

          // Get final count
          const finalCountRes = await pool.query('SELECT count(*) FROM chat_memories WHERE user_id = $1', [userId]);
          
          reportItem.distilledFact = distilledFact;
          reportItem.newCount = parseInt(finalCountRes.rows[0].count, 10);
          reportItem.success = true;
        }
      } else {
        reportItem.success = false;
        reportItem.error = 'Not enough memories to execute consolidation (minimum 2 required)';
      }
    } catch (err: any) {
      console.error(`[Memory Service] Failed memory consolidation for user ${userId} (${userName}):`, err);
      reportItem.success = false;
      reportItem.error = err.message || 'Unknown internal error';
    }

    reports.push(reportItem);
  }

  return reports;
}

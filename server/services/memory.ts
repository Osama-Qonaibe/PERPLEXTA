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

export async function getUserMemories(userId: string) {
  if (!pool) throw new Error('Database initializing');
  const result = await pool.query(
    'SELECT * FROM chat_memories WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  );
  return result.rows;
}

export async function addMemory(userId: string, fact: string, category: string = 'general', source: string = 'user', chatId?: number) {
  if (!pool) throw new Error('Database initializing');
  
  const countRes = await pool.query('SELECT count(*) FROM chat_memories WHERE user_id = $1', [userId]);
  if (parseInt(countRes.rows[0].count) >= 50) {
    throw new Error('Memory limit reached (50)');
  }

  const result = await pool.query(
    'INSERT INTO chat_memories (user_id, chat_id, fact, category, source) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [userId, chatId || null, fact, category, source]
  );
  return result.rows[0];
}

export async function updateMemory(id: number, userId: string, fact: string, category?: string) {
  if (!pool) throw new Error('Database initializing');
  
  let query = 'UPDATE chat_memories SET fact = $1, updated_at = CURRENT_TIMESTAMP';
  const params: any[] = [fact];
  
  if (category) {
    query += ', category = $2 WHERE id = $3 AND user_id = $4 RETURNING *';
    params.push(category, id, userId);
  } else {
    query += ' WHERE id = $2 AND user_id = $3 RETURNING *';
    params.push(id, userId);
  }

  const result = await pool.query(query, params);
  return result.rows[0];
}

export async function deleteMemory(id: number, userId: string) {
  if (!pool) throw new Error('Database initializing');
  const result = await pool.query(
    'DELETE FROM chat_memories WHERE id = $1 AND user_id = $2 RETURNING *',
    [id, userId]
  );
  return result.rows.length > 0;
}

export async function pruneMemories(userId: string) {
  if (!pool) throw new Error('Database initializing');
  const result = await pool.query(`
    DELETE FROM chat_memories 
    WHERE id IN (
      SELECT id FROM chat_memories 
      WHERE user_id = $1 
      ORDER BY created_at ASC 
      LIMIT 10
    )
    RETURNING *
  `, [userId]);
  return result.rows.length;
}

export async function consolidateAllUserMemories(options?: {
  targetUserId?: number;
  threshold?: number;
}) {
  if (!pool) throw new Error('Database initializing');
  
  const threshold = options?.threshold ?? 10;
  
  // 1. Determine active provider & model from tool_orchestrator
  let provider = 'google';
  let model = 'gemini-1.5-flash';
  try {
    const orchestratorRes = await pool.query(
      "SELECT primary_provider, primary_model FROM tool_orchestrator WHERE is_active = true AND primary_provider IS NOT NULL LIMIT 1"
    );
    if (orchestratorRes.rows.length > 0) {
      provider = orchestratorRes.rows[0].primary_provider;
      model = orchestratorRes.rows[0].primary_model;
    }
  } catch (err) {
    console.error('[Memory Service] Failed to fetch active orchestrator route, falling back default', err);
  }

  // Get active API Key
  const apiKey = await getProviderKey(provider);
  if (!apiKey) {
    throw new Error(`No active API key configured for provider: ${provider}. Action aborted.`);
  }

  // 2. Query target users
  let targetUsersQuery = '';
  const queryParams: any[] = [];
  
  if (options?.targetUserId) {
    targetUsersQuery = `
      SELECT m.user_id, u.name, u.email, count(*) as count 
      FROM chat_memories m
      JOIN users u ON m.user_id = u.id
      WHERE m.user_id = $1 
      GROUP BY m.user_id, u.name, u.email
    `;
    queryParams.push(options.targetUserId);
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
    const oldCount = parseInt(row.count);

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
      // Get the 10 oldest memories for user
      const oldestRes = await pool.query(
        'SELECT id, fact, category FROM chat_memories WHERE user_id = $1 ORDER BY created_at ASC LIMIT 10',
        [userId]
      );

      if (oldestRes.rows.length >= 2) {
        const oldestIds = oldestRes.rows.map((r: any) => r.id);
        const archivedFacts = oldestRes.rows.map((r: any) => `[${r.category}] ${r.fact}`);
        reportItem.archivedFacts = archivedFacts;

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

        if (distilledFact) {
          // Delete selected oldest records
          await pool.query('DELETE FROM chat_memories WHERE id = ANY($1::int[])', [oldestIds]);

          // Insert high-density consolidated fact
          await pool.query(
            "INSERT INTO chat_memories (user_id, fact, category, source) VALUES ($1, $2, 'general', 'ai')",
            [userId, distilledFact]
          );

          // Get final count
          const finalCountRes = await pool.query('SELECT count(*) FROM chat_memories WHERE user_id = $1', [userId]);
          
          reportItem.distilledFact = distilledFact;
          reportItem.newCount = parseInt(finalCountRes.rows[0].count);
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

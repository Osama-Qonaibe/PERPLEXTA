/**
 * CRITICAL FIX #3: N+1 Query Problem in Memory Consolidation
 * 
 * PROBLEM:
 * - Each user processes 5+ sequential database queries
 * - With thousands of users, creates millions of queries
 * - Database timeout and 10x slower performance
 * 
 * SOLUTION:
 * - Use PostgreSQL transaction with single consolidated query
 * - Calculate statistics at database level
 * - Batch insert/delete operations
 */

import { pool } from '../db/index.js';
import { callAIProvider, getProviderKey } from './ai.js';

export async function consolidateMemoriesOptimized(options?: {
  targetUserId?: number | string;
  threshold?: number;
}) {
  if (!pool) throw new Error('Database initializing');

  const threshold = options?.threshold ?? 10;
  const targetUserId = options?.targetUserId 
    ? (typeof options.targetUserId === 'string' ? parseInt(options.targetUserId, 10) : options.targetUserId)
    : undefined;

  // 1. Get active provider/model from orchestrator (single query)
  let provider = '';
  let model = '';
  
  try {
    const orchestratorRes = await pool.query(`
      SELECT primary_provider, primary_model 
      FROM tool_orchestrator 
      WHERE tool_id IN ('sovereign_memory', 'chat')
      AND is_active = true
      ORDER BY tool_id = 'sovereign_memory' DESC
      LIMIT 1
    `);

    if (orchestratorRes.rows.length > 0) {
      provider = orchestratorRes.rows[0].primary_provider;
      model = orchestratorRes.rows[0].primary_model;
    }
  } catch (err) {
    console.error('[Memory Service] Failed to fetch orchestrator config:', err);
  }

  if (!provider || !model) {
    throw new Error('Could not resolve active AI provider/model from configuration');
  }

  const apiKey = await getProviderKey(provider);
  if (!apiKey) {
    throw new Error(`No API key configured for provider: ${provider}`);
  }

  // 2. Use client connection for transaction
  const client = await pool.connect();
  const reports = [];

  try {
    await client.query('BEGIN ISOLATION LEVEL READ COMMITTED');

    // OPTIMIZED: Single query to get all target users with their statistics
    // This replaces multiple queries (count, group by, etc.)
    const usersQuery = targetUserId
      ? `
        SELECT 
          m.user_id,
          u.name,
          u.email,
          COUNT(m.id) as memory_count,
          ARRAY_AGG(m.id ORDER BY m.created_at ASC LIMIT 10) as oldest_ids,
          ARRAY_AGG(
            jsonb_build_object(
              'id', m.id,
              'fact', m.fact,
              'category', m.category,
              'chat_id', m.chat_id
            )
            ORDER BY m.created_at ASC LIMIT 10
          ) as oldest_memories
        FROM chat_memories m
        JOIN users u ON m.user_id = u.id
        WHERE m.user_id = $1
        GROUP BY m.user_id, u.name, u.email
      `
      : `
        SELECT 
          m.user_id,
          u.name,
          u.email,
          COUNT(m.id) as memory_count,
          ARRAY_AGG(m.id ORDER BY m.created_at ASC LIMIT 10) as oldest_ids,
          ARRAY_AGG(
            jsonb_build_object(
              'id', m.id,
              'fact', m.fact,
              'category', m.category,
              'chat_id', m.chat_id
            )
            ORDER BY m.created_at ASC LIMIT 10
          ) as oldest_memories
        FROM chat_memories m
        JOIN users u ON m.user_id = u.id
        GROUP BY m.user_id, u.name, u.email
        HAVING COUNT(m.id) >= $1
      `;

    const params = targetUserId ? [targetUserId] : [threshold];
    const usersRes = await client.query(usersQuery, params);

    // 3. Process each user with minimal DB operations
    for (const row of usersRes.rows) {
      const userId = row.user_id;
      const userName = row.name || 'Elite User';
      const userEmail = row.email || '';
      const oldCount = parseInt(row.memory_count, 10);
      const oldestIds = row.oldest_ids || [];
      const oldestMemories = row.oldest_memories || [];

      const reportItem = {
        userId,
        userName,
        userEmail,
        oldCount,
        newCount: oldCount,
        archivedFacts: [] as string[],
        distilledFact: '',
        success: false,
        error: undefined as string | undefined
      };

      try {
        if (oldestIds.length < 2) {
          reportItem.success = false;
          reportItem.error = 'Not enough memories to consolidate (minimum 2 required)';
          reports.push(reportItem);
          continue;
        }

        // Extract facts for consolidation
        reportItem.archivedFacts = oldestMemories.map(
          (m: any) => `[${m.category}] ${m.fact}`
        );

        // Find most relevant chat_id (using database aggregation results)
        const chatIdFreq: Record<number, number> = {};
        for (const mem of oldestMemories) {
          if (mem.chat_id) {
            chatIdFreq[mem.chat_id] = (chatIdFreq[mem.chat_id] || 0) + 1;
          }
        }

        let associatedChatId: number | null = null;
        let maxFreq = 0;
        for (const [cidStr, freq] of Object.entries(chatIdFreq)) {
          if (freq > maxFreq) {
            maxFreq = freq;
            associatedChatId = parseInt(cidStr, 10);
          }
        }

        // Fallback to most recent chat if no chat_id in memories
        if (!associatedChatId) {
          const chatRes = await client.query(
            `SELECT id FROM chats WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 1`,
            [userId]
          );
          if (chatRes.rows.length > 0) {
            associatedChatId = chatRes.rows[0].id;
          }
        }

        // Call AI to consolidate
        const factsToCondense = oldestMemories
          .map((m: any) => `- [${m.category}] ${m.fact}`)
          .join('\n');

        const condensedFact = await callAIProvider(
          provider,
          model,
          apiKey,
          `Please distill the following list of old user profile memories into exactly one single dense fact summary (max 150 chars):\n${factsToCondense}`,
          `You are the Perplexta Memory Distillation Engine. Output ONLY the condensed statement with no intro/outro.`
        );

        if (!condensedFact) {
          throw new Error('AI returned empty consolidation');
        }

        // SINGLE TRANSACTION: Delete old + Insert new
        // This is atomic and prevents data loss
        await client.query(
          'DELETE FROM chat_memories WHERE id = ANY($1::int[])',
          [oldestIds]
        );

        await client.query(
          `INSERT INTO chat_memories (user_id, chat_id, fact, category, source)
           VALUES ($1, $2, $3, 'general', 'ai')`,
          [userId, associatedChatId, condensedFact.substring(0, 255)]
        );

        // Get final count (no need to query again, just calculate)
        reportItem.distilledFact = condensedFact;
        reportItem.newCount = oldCount - oldestIds.length + 1;
        reportItem.success = true;

      } catch (err: any) {
        console.error(`[Memory Service] Consolidation failed for user ${userId}:`, err);
        reportItem.success = false;
        reportItem.error = err.message || 'Unknown error';
      }

      reports.push(reportItem);
    }

    await client.query('COMMIT');
    console.log(`[Memory Service] Consolidated memories for ${reports.filter(r => r.success).length}/${reports.length} users`);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Memory Service] Transaction failed:', err);
    throw err;
  } finally {
    client.release();
  }

  return reports;
}

/**
 * BONUS: Add this index for faster memory consolidation queries
 * Run this in a migration:
 * 
 * CREATE INDEX CONCURRENTLY IF NOT EXISTS 
 *   idx_chat_memories_user_created 
 *   ON chat_memories(user_id, created_at ASC)
 *   WHERE user_id IS NOT NULL;
 */

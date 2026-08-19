import { pool } from '../db/index.js';
import { getCachedSystemSettings } from '../db/queries.js';

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

export interface ExtractedFact {
  fact: string;
  category: 'identity' | 'preference' | 'professional' | 'project' | 'general' | 'technical';
}

/**
 * 🧠 High-Precision Deterministic Intent & Fact Extractor (Zero AI / Zero Quota)
 * Recognizes Arabic and English patterns for durable facts, preferences, identity, and project context.
 */
export function extractDirectUserMemories(prompt: string): ExtractedFact[] {
  if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 4) return [];
  const results: ExtractedFact[] = [];
  const trimmed = prompt.trim();

  // Arabic explicit and implicit memory patterns
  const arPatterns = [
    { regex: /(?:تذكر\s+(?:أن|ان|دائماً|دائما)?|احفظ\s+(?:أن|ان|عندي|لديك)?|لا\s+تنسى\s+(?:أن|ان)?|خزن\s+(?:أن|ان)?|سجل\s+(?:أن|ان)?)\s*[:،,-]?\s*(.+)/i, category: 'preference' as const },
    { regex: /(?:اسمي\s+هو|اسمي|أنا\s+ادعى|انا\s+ادعى)\s+([^\.\n،]+)/i, category: 'identity' as const, template: (m: string) => `اسم المستخدم: ${m.trim()}` },
    { regex: /(?:أنا\s+أعمل\s+(?:كـ|ك|في)?|انا\s+اعمل\s+(?:كـ|ك|في)?|مهنتي\s+هي|وظيفتي\s+هي|تخصصي\s+هو)\s+([^\.\n،]+)/i, category: 'professional' as const, template: (m: string) => `تخصص/مهنة المستخدم: ${m.trim()}` },
    { regex: /(?:أعيش\s+في|اعيش\s+في|أنا\s+من|انا\s+من|بلدي\s+هو|دولتي\s+هي|مدينتي\s+هي)\s+([^\.\n،]+)/i, category: 'identity' as const, template: (m: string) => `مكان الإقامة: ${m.trim()}` },
    { regex: /(?:مشروعي\s+(?:الحالي|الجديد|القادم)?\s*(?:هو|عبارة عن)?)\s+([^\.\n،]+)/i, category: 'project' as const, template: (m: string) => `مشروع المستخدم: ${m.trim()}` },
    { regex: /(?:أفضل\s+(?:دائماً|دائما)?|افضل\s+(?:دائماً|دائما)?|أحب\s+استخدام|احب\s+استخدام|استخدم\s+دائماً|استخدم\s+دائما)\s+([^\.\n،]+)/i, category: 'preference' as const, template: (m: string) => `تفضيل: ${m.trim()}` },
    { regex: /(?:لغة\s+البرمجة\s+(?:المفضلة|الأساسية)?|أبرمج\s+بـ|ابرمج\s+بـ|أعمل\s+بتقنية|اعمل\s+بتقنية)\s+([^\.\n،]+)/i, category: 'technical' as const, template: (m: string) => `التقنية/لغة البرمجة: ${m.trim()}` }
  ];

  // English explicit and implicit memory patterns
  const enPatterns = [
    { regex: /(?:remember\s+(?:that|always)?|save\s+(?:that|this)?|keep\s+in\s+mind\s+(?:that)?|don't\s+forget\s+(?:that)?|note\s+(?:that)?)\s*[:,-]?\s*(.+)/i, category: 'preference' as const },
    { regex: /(?:my\s+name\s+is|i\s+am|i'm\s+called)\s+([^\.\n,]+)/i, category: 'identity' as const, template: (m: string) => `User's name: ${m.trim()}` },
    { regex: /(?:i\s+work\s+as\s+(?:a|an)?|my\s+profession\s+is|my\s+job\s+is|my\s+specialty\s+is)\s+([^\.\n,]+)/i, category: 'professional' as const, template: (m: string) => `User's profession: ${m.trim()}` },
    { regex: /(?:i\s+live\s+in|i'm\s+from|i\s+am\s+from|my\s+country\s+is|my\s+city\s+is)\s+([^\.\n,]+)/i, category: 'identity' as const, template: (m: string) => `User's location: ${m.trim()}` },
    { regex: /(?:my\s+project\s+is|i\s+am\s+building|currently\s+working\s+on)\s+([^\.\n,]+)/i, category: 'project' as const, template: (m: string) => `User's project: ${m.trim()}` },
    { regex: /(?:i\s+prefer\s+always|i\s+like\s+to\s+use|always\s+use|my\s+preference\s+is)\s+([^\.\n,]+)/i, category: 'preference' as const, template: (m: string) => `Preference: ${m.trim()}` },
    { regex: /(?:my\s+stack\s+is|i\s+code\s+in|my\s+primary\s+language\s+is|technology\s+stack\s+is)\s+([^\.\n,]+)/i, category: 'technical' as const, template: (m: string) => `Tech stack: ${m.trim()}` }
  ];

  for (const p of [...arPatterns, ...enPatterns]) {
    const match = trimmed.match(p.regex);
    if (match && match[1]) {
      const raw = match[1].trim();
      if (raw.length >= 3 && raw.length <= 250) {
        const fact = p.template ? p.template(raw) : raw;
        if (!results.some(r => r.fact.toLowerCase() === fact.toLowerCase())) {
          results.push({ fact, category: p.category });
        }
      }
    }
  }

  return results;
}

/**
 * ⚡ Deterministic Context Summarizer (Zero AI, Zero Tokens, Instant Execution)
 * Synthesizes ongoing conversation messages into a dense, structured context summary without calling external LLMs.
 */
export function generateDeterministicContextSummary(messages: { role: string; content: string }[]): string {
  if (!messages || messages.length === 0) return '';

  const userMessages = messages.filter(m => m.role === 'user' && m.content && m.content.trim().length > 0);
  const assistantMessages = messages.filter(m => m.role === 'assistant' && m.content && m.content.trim().length > 0);

  if (userMessages.length === 0) return '';

  // Extract key topics from latest user turns (cleaned of common conversational filler)
  const extractKeyPhrases = (text: string): string => {
    let clean = text
      .replace(/```[\s\S]*?```/g, '[كود/Code]')
      .replace(/https?:\/\/[^\s]+/g, '[رابط/URL]')
      .replace(/\s+/g, ' ')
      .trim();

    if (clean.length > 180) {
      clean = clean.substring(0, 175) + '...';
    }
    return clean;
  };

  const recentUserTurns = userMessages.slice(-3).map(m => extractKeyPhrases(m.content));
  const latestAssistantReply = assistantMessages.length > 0 
    ? extractKeyPhrases(assistantMessages[assistantMessages.length - 1].content) 
    : '';

  const isArabic = /[\u0600-\u06FF]/.test(userMessages[userMessages.length - 1].content);

  let summary = '';
  if (isArabic) {
    summary = `• محاور الحوار الأخيرة: ${recentUserTurns.join(' ← ')}`;
    if (latestAssistantReply) {
      summary += `\n• حالة الرد الأخير: ${latestAssistantReply}`;
    }
  } else {
    summary = `• Recent discussion topics: ${recentUserTurns.join(' -> ')}`;
    if (latestAssistantReply) {
      summary += `\n• Latest response context: ${latestAssistantReply}`;
    }
  }

  return summary.substring(0, 800);
}

/**
 * 🔄 Update Chat Context Summary in DB deterministically
 */
export async function updateChatContextSummary(chatIdNum: number, userId: number): Promise<void> {
  if (!pool) return;
  try {
    const recentMessages = await pool.query(
      `SELECT role, content FROM messages 
       WHERE chat_id = $1 AND content IS NOT NULL AND trim(content) != '' 
       ORDER BY created_at ASC LIMIT 15`,
      [chatIdNum]
    );

    if (recentMessages.rows.length < 2) return;

    const summary = generateDeterministicContextSummary(recentMessages.rows);
    if (summary && summary.trim()) {
      await pool.query(
        'UPDATE chats SET context_summary = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [summary.trim(), chatIdNum]
      );
    }
  } catch (err: any) {
    console.error(`[Deterministic Context Summary] Error for chat ${chatIdNum}:`, err.message);
  }
}

/**
 * 📥 Get User Memories with Chat Titles
 */
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

/**
 * ➕ Add Memory with Saturation Check (Max 50)
 */
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

/**
 * ✏️ Update Existing Memory
 */
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

/**
 * ❌ Delete Memory
 */
export async function deleteMemory(id: number, userId: string | number) {
  if (!pool) throw new Error('Database initializing');
  const cleanId = typeof userId === 'string' ? parseInt(userId, 10) : userId;
  const result = await pool.query(
    'DELETE FROM chat_memories WHERE id = $1 AND user_id = $2 RETURNING *',
    [id, cleanId]
  );
  return result.rows.length > 0;
}

/**
 * ✂️ Prune Oldest 10 Memories
 */
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

/**
 * 🧩 Pure Deterministic Fact Consolidation Algorithm (Zero AI, Zero Tokens)
 * Synthesizes a list of facts by grouping categories, removing exact and sub-string redundancies,
 * and creating a dense, structured composite statement.
 */
export function distillFactsDeterministically(facts: { fact: string; category: string }[]): string {
  if (!facts || facts.length === 0) return '';

  const categoryMap: Record<string, string[]> = {};
  for (const f of facts) {
    const cat = f.category || 'general';
    if (!categoryMap[cat]) categoryMap[cat] = [];
    const cleanFact = f.fact.trim().replace(/^[-•*]\s*/, '');
    // Avoid redundant duplicates within category
    if (!categoryMap[cat].some(existing => existing.toLowerCase() === cleanFact.toLowerCase() || cleanFact.toLowerCase().includes(existing.toLowerCase()))) {
      categoryMap[cat].push(cleanFact);
    }
  }

  const parts: string[] = [];
  for (const [cat, items] of Object.entries(categoryMap)) {
    const label = cat === 'identity' ? 'الهوية/Identity' :
                  cat === 'preference' ? 'التفضيلات/Preferences' :
                  cat === 'professional' ? 'المهنة/Role' :
                  cat === 'project' ? 'المشاريع/Projects' :
                  cat === 'technical' ? 'التقنية/Tech' : 'عام/General';
    parts.push(`[${label}: ${items.join(' | ')}]`);
  }

  let result = parts.join(' ');
  if (result.length > 250) {
    result = result.substring(0, 247) + '...';
  }
  return result;
}

/**
 * 🏛️ Consolidate All User Memories (Zero AI / Deterministic Compaction Engine)
 * Runs across targeted user or all saturated users, synthesizes oldest 10 facts, deletes old ones and inserts distilled fact.
 */
export async function consolidateAllUserMemories(options?: {
  targetUserId?: number | string;
  threshold?: number;
}): Promise<ConsolidationReportItem[]> {
  if (!pool) throw new Error('Database initializing');
  
  const threshold = options?.threshold ?? 10;
  const targetUserId = options?.targetUserId ? (typeof options.targetUserId === 'string' ? parseInt(options.targetUserId, 10) : options.targetUserId) : undefined;
  
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

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const oldestRes = await client.query(
        'SELECT id, fact, category, chat_id FROM chat_memories WHERE user_id = $1 ORDER BY created_at ASC LIMIT 10',
        [userId]
      );

      if (oldestRes.rows.length >= 2) {
        const oldestIds = oldestRes.rows.map((r: any) => r.id);
        const archivedFacts = oldestRes.rows.map((r: any) => `[${r.category}] ${r.fact}`);
        reportItem.archivedFacts = archivedFacts;

        // Associated chat ID
        let associatedChatId: number | null = oldestRes.rows.find((r: any) => r.chat_id)?.chat_id || null;
        if (!associatedChatId) {
          const latestChatRes = await client.query(
            "SELECT id FROM chats WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 1",
            [userId]
          );
          if (latestChatRes.rows.length > 0) {
            associatedChatId = latestChatRes.rows[0].id;
          }
        }

        // Run fast deterministic distillation
        const distilledFact = distillFactsDeterministically(oldestRes.rows);

        if (distilledFact) {
          await client.query('DELETE FROM chat_memories WHERE id = ANY($1::int[])', [oldestIds]);

          await client.query(
            "INSERT INTO chat_memories (user_id, chat_id, fact, category, source) VALUES ($1, $2, $3, 'general', 'consolidated')",
            [userId, associatedChatId, distilledFact]
          );

          const finalCountRes = await client.query('SELECT count(*) FROM chat_memories WHERE user_id = $1', [userId]);
          
          reportItem.distilledFact = distilledFact;
          reportItem.newCount = parseInt(finalCountRes.rows[0].count, 10);
          reportItem.success = true;
          await client.query('COMMIT');
        } else {
          await client.query('ROLLBACK');
          reportItem.success = false;
          reportItem.error = 'Consolidation calculation resulted in empty string';
        }
      } else {
        await client.query('ROLLBACK');
        reportItem.success = false;
        reportItem.error = 'Not enough memories to execute consolidation (minimum 2 required)';
      }
    } catch (err: any) {
      try {
        await client.query('ROLLBACK');
      } catch (_) {}
      console.error(`[Deterministic Memory Service] Consolidation error for user ${userId}:`, err);
      reportItem.success = false;
      reportItem.error = err.message || 'Unknown internal error';
    } finally {
      client.release();
    }

    reports.push(reportItem);
  }

  return reports;
}

/**
 * 🔍 Memory Diagnostics for Admin & User
 */
export async function getMemoryDiagnostics(userId?: string | number, isAdmin?: boolean) {
  if (!pool) throw new Error('Database initializing');

  if (isAdmin) {
    const totalMemoriesRes = await pool.query('SELECT count(*) FROM chat_memories');
    const activeSessionsRes = await pool.query("SELECT id, user_id, title, updated_at FROM chats WHERE context_summary IS NOT NULL AND trim(context_summary) != '' ORDER BY updated_at DESC LIMIT 50");
    const userMemoryCountsRes = await pool.query('SELECT user_id, count(*) as count FROM chat_memories GROUP BY user_id');
    
    return {
      engine: 'Perplexta Deterministic Sovereign Memory Engine v3.0 (Zero-AI / Zero-Latency)',
      mode: 'system-wide-admin',
      totalMemories: parseInt(totalMemoriesRes.rows[0].count, 10),
      activeContextSessions: activeSessionsRes.rows,
      userMemoryCounts: userMemoryCountsRes.rows,
      bufferLimit: 50,
      timestamp: new Date().toISOString()
    };
  } else {
    const cleanId = typeof userId === 'string' ? parseInt(userId, 10) : userId;
    const userMemoriesRes = await pool.query('SELECT count(*) FROM chat_memories WHERE user_id = $1', [cleanId]);
    const userSessionsRes = await pool.query("SELECT id, title, updated_at FROM chats WHERE user_id = $1 AND context_summary IS NOT NULL AND trim(context_summary) != '' ORDER BY updated_at DESC", [cleanId]);
    
    const count = parseInt(userMemoriesRes.rows[0].count, 10);
    return {
      engine: 'Perplexta Deterministic Sovereign Memory Engine v3.0 (Zero-AI / Zero-Latency)',
      mode: 'user-isolated',
      userId: cleanId,
      memoryCount: count,
      memorySaturationPercent: Math.round((count / 50) * 100),
      bufferLimit: 50,
      activeContextSessions: userSessionsRes.rows,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * 🗜️ Smart Compress Memory Context Summaries
 */
export async function smartCompressMemoryContext() {
  if (!pool) throw new Error('Database initializing');
  
  const chatsRes = await pool.query(
    `SELECT id, user_id, title, context_summary FROM chats WHERE context_summary IS NOT NULL AND length(context_summary) > 400 LIMIT 100`
  );

  let compressedCount = 0;
  const compressedSessions = [];

  for (const chat of chatsRes.rows) {
    const originalSummary = chat.context_summary;
    if (originalSummary.length > 400) {
      const trimmed = originalSummary.substring(0, 200) + "\n[... Heuristic Truncation ...] \n" + originalSummary.substring(originalSummary.length - 200);
      
      await pool.query(
        'UPDATE chats SET context_summary = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [trimmed, chat.id]
      );

      compressedCount++;
      compressedSessions.push({
        id: chat.id,
        title: chat.title,
        originalLength: originalSummary.length,
        compressedLength: trimmed.length
      });
    }
  }

  return {
    success: true,
    compressedCount,
    compressedSessions,
    timestamp: new Date().toISOString()
  };
}

/**
 * 🧹 Run Context Cleanup (TTL-based)
 */
export async function runContextCleanup(ttlDays: number = 30) {
  if (!pool) throw new Error('Database initializing');
  const res = await pool.query(
    `UPDATE chats 
     SET context_summary = NULL, updated_at = CURRENT_TIMESTAMP 
     WHERE updated_at < NOW() - INTERVAL '1 day' * $1 
     AND context_summary IS NOT NULL 
     RETURNING id, user_id, title, updated_at`,
    [ttlDays]
  );
  return {
    cleanedCount: res.rows.length,
    cleanedSessions: res.rows,
    ttlDays,
    timestamp: new Date().toISOString()
  };
}

import { pool } from '../db/index.js';

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
  
  // Check limit (50 memories per user)
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
  // Delete 10 oldest ones
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

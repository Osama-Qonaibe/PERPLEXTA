import jwt from 'jsonwebtoken';
import { pool } from '../db/index.js';
import { executeTaskLogic } from './orchestrator.js';
import { io } from '../config/socket.js';
import { callAIProvider } from './ai.js';
import { decrypt } from '../utils/crypto.js';
import { getAppName } from './system.js';
import { CORE_PROTOCOL } from '../config/protocol.js';

export async function createChat(userId: string, title?: string) {
  if (!pool) throw new Error('Database initializing');
  const result = await pool.query('INSERT INTO chats (user_id, title) VALUES ($1, $2) RETURNING *', [userId, title || 'New Chat']);
  return result.rows[0];
}

export async function getUserChats(userId: string) {
  if (!pool) throw new Error('Database initializing');
  const result = await pool.query('SELECT * FROM chats WHERE user_id = $1 ORDER BY updated_at DESC', [userId]);
  return result.rows;
}

export async function getChatMessages(chatId: string, userId: string) {
  if (!pool) throw new Error('Database initializing');
  
  const chatCheck = await pool.query('SELECT user_id FROM chats WHERE id = $1', [chatId]);
  if (chatCheck.rows.length === 0 || chatCheck.rows[0].user_id !== userId) {
    return null;
  }

  const result = await pool.query('SELECT * FROM messages WHERE chat_id = $1 ORDER BY created_at ASC', [chatId]);
  return result.rows;
}

export async function addChatMessage(chatId: string, role: string, content: string, tool?: string) {
  if (!pool) throw new Error('Database initializing');
  await pool.query('INSERT INTO messages (chat_id, role, content, tool, tool_id) VALUES ($1, $2, $3, $4, $5)', [chatId, role, content, tool || 'chat', tool || 'chat']);
  await pool.query('UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = $1', [chatId]);
  return { success: true };
}

export async function getMessageCount(chatId: string) {
  if (!pool) throw new Error('Database initializing');
  const result = await pool.query('SELECT count(*) FROM messages WHERE chat_id = $1', [chatId]);
  return parseInt(result.rows[0].count);
}

export async function deleteUserChat(chatId: string, userId: string) {
  if (!pool) throw new Error('Database initializing');
  const result = await pool.query('DELETE FROM chats WHERE id = $1 AND user_id = $2 RETURNING *', [chatId, userId]);
  return result.rows.length > 0;
}

export async function updateUserChatTitle(chatId: string, userId: string, title: string) {
  if (!pool) throw new Error('Database initializing');
  const result = await pool.query(
    'UPDATE chats SET title = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id = $3 RETURNING *',
    [title, chatId, userId]
  );
  return result.rows.length > 0;
}

export async function updateUserChatContextSummary(chatId: string, userId: string, contextSummary: string) {
  if (!pool) throw new Error('Database initializing');
  const result = await pool.query(
    'UPDATE chats SET context_summary = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id = $3 RETURNING *',
    [contextSummary, chatId, userId]
  );
  return result.rows.length > 0;
}

export async function handleChatMessage(socket: any, data: any) {
  const { chatId, toolId, userId, token, data_p, data_s, tool_id, chat_id, file_data, forensic_mode } = data;
  
  let authenticatedUserId = userId;
  if (!authenticatedUserId && token) {
    try {
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        console.error('[ChatService] JWT_SECRET is not set');
        return socket.emit('chat_error', { message: 'Unauthorized' });
      }
      const decoded = jwt.verify(token, jwtSecret) as any;
      authenticatedUserId = decoded.id;
    } catch (e) {
      const err = e as any;
      if (err.name === 'TokenExpiredError') {
        console.warn('[ChatService] Token Expired');
        return socket.emit('chat_error', { message: JSON.stringify({ error: 'TokenExpiredError', type: 'TOKEN_EXPIRED' }) });
      }
      console.error('[ChatService] Token verification failed:', e);
      return socket.emit('chat_error', { message: 'Unauthorized' });
    }
  }

  if (!authenticatedUserId) return socket.emit('chat_error', { message: 'Unauthorized' });

  const finalChatId = chatId || chat_id;
  const finalToolId = toolId || tool_id || 'chat';
  
  let finalPrompt = data.content;
  if (!finalPrompt && data_p) {
    finalPrompt = decrypt(data_p);
  }

  let customInstructions = '';

  let assistantMessageId: number | undefined;
  try {
    if (!pool) throw new Error('Database not ready');

    // Notify that the assistant is actively typing/thinking
    socket.emit('typing', { isTyping: true, role: 'assistant', name: 'Perplexta' });

    const assistantMsgResult = await pool.query(
      'INSERT INTO messages (chat_id, role, content, tool, tool_id) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [finalChatId, 'assistant', '', finalToolId, finalToolId]
    );
    assistantMessageId = assistantMsgResult.rows[0].id;

    const generationStart = Date.now();

    const result = await executeTaskLogic(
      { 
        tool_id: finalToolId, 
        prompt: finalPrompt, 
        chat_id: finalChatId,
        system_prompt: customInstructions,
        file_data,
        forensic_mode
      }, 
      authenticatedUserId, 
      undefined, 
      (chunk) => {
        socket.emit('chat_chunk', { chunk, chatId: finalChatId, isFinal: false });
      },
      socket
    );

    const generationTimeSeconds = parseFloat(((Date.now() - generationStart) / 1000).toFixed(2));

    await pool.query(
      'UPDATE messages SET content = $1, generation_time = $2 WHERE id = $3',
      [result.result, generationTimeSeconds, assistantMessageId]
    );

    await pool.query('UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = $1', [finalChatId]);

    // Reset typing state
    socket.emit('typing', { isTyping: false, role: 'assistant', name: 'Perplexta' });

    socket.emit('chat_chunk', { chunk: '', chatId: finalChatId, isFinal: true });
    socket.emit('chat_response', { 
      result: result.result, 
      chatId: finalChatId, 
      message_id: assistantMessageId,
      tool: finalToolId,
      generation_time: generationTimeSeconds
    });

    // Broadcast updated stats (including new ai generations count) to active admins in real-time
    import('./admin.js').then(({ broadcastAdminStats }) => {
      broadcastAdminStats().catch(err => console.error('[Socket] Failed to broadcast admin stats on new message:', err));
    }).catch(err => console.error('[Socket] Failed to load admin service on new message:', err));

  } catch (error: any) {
    // Reset typing state on error
    socket.emit('typing', { isTyping: false, role: 'assistant', name: 'Perplexta' });

    let isSystemInactive = false;
    try {
      const parsedErr = JSON.parse(error.message);
      if (parsedErr && parsedErr.type === 'SYSTEM_INACTIVE') {
        isSystemInactive = true;
      }
    } catch (_) {}

    if (isSystemInactive) {
      console.info(`[ChatService] Service temporarily suspended or inactive tool processed gracefully for user: ${authenticatedUserId}`);
    } else {
      console.error('[ChatService] Error:', error);
    }

    if (typeof assistantMessageId !== 'undefined' && assistantMessageId > 0) {
      pool.query('DELETE FROM messages WHERE id = $1', [assistantMessageId]).catch((e: any) => console.error('[ChatService] Placeholder deletion failed:', e));
    }
    
    let userMessage = 'An unexpected system error occurred. Please try again later.';
    try {
      const parsed = JSON.parse(error.message);
      
      let userLang = 'ar';
      try {
        const uRes = await pool.query('SELECT language FROM users WHERE id = $1', [authenticatedUserId]);
        if (uRes.rows.length > 0) userLang = uRes.rows[0].language || 'ar';
      } catch (_) {}
      
      if (userLang === 'ar' && parsed.error_ar) {
        userMessage = parsed.error_ar;
      } else if (parsed.error) {
        userMessage = parsed.error;
      }
    } catch (e) {
      if (error.message && (error.message.includes('provider') || error.message.includes('quota') || error.message.includes('Unauthorized'))) {
        userMessage = error.message;
      }
    }
    
    socket.emit('chat_error', { message: userMessage });
  }
}

export async function generateChatTitle(chatId: string, firstMessageContent: string) {
  try {
    if (!pool) return;
    const routeResult = await pool.query('SELECT * FROM tool_orchestrator WHERE tool_id = $1 AND is_active = true', ['perplexta_analysis']);
    if (routeResult.rows.length === 0) return;

    const route = routeResult.rows[0];
    const appName = getAppName('en');
    const systemPrompt = CORE_PROTOCOL.replace(/\[SITE_NAME\]/g, appName) + "\n\nGenerate a professional title for this chat based on the user's first message. Keep it short (max 50 chars).";

    const keyRes = await pool.query('SELECT encrypted_key FROM api_keys_vault WHERE provider = $1', [route.primary_provider]);
    if (keyRes.rows.length === 0) return;

    const key = decrypt(keyRes.rows[0].encrypted_key);
    const title = await callAIProvider(route.primary_provider, route.primary_model, key, firstMessageContent, systemPrompt);
    
    if (title) {
      await pool.query('UPDATE chats SET title = $1 WHERE id = $2', [title.trim().substring(0, 50), chatId]);
    }
  } catch (error) {
    console.error('[ChatService] Title Generation Error:', error);
  }
}

export async function togglePinMessage(chatId: string, messageId: string, userId: string) {
  if (!pool) throw new Error('Database initializing');
  
  // Verify user owns the chat and message belongs to that chat
  const checkRes = await pool.query(`
    SELECT m.id, m.is_pinned, c.user_id 
    FROM messages m
    JOIN chats c ON m.chat_id = c.id
    WHERE m.id = $1 AND m.chat_id = $2
  `, [messageId, chatId]);

  if (checkRes.rows.length === 0) {
    return { success: false, error: 'Message not found in this chat' };
  }

  if (checkRes.rows[0].user_id !== parseInt(userId) && checkRes.rows[0].user_id !== userId) {
    return { success: false, error: 'Unauthorized to modify this chat message' };
  }

  const currentPinned = checkRes.rows[0].is_pinned || false;
  const newPinned = !currentPinned;

  await pool.query('UPDATE messages SET is_pinned = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [newPinned, messageId]);

  return { success: true, is_pinned: newPinned };
}

import jwt from 'jsonwebtoken';
import { pool } from '../db/index.js';
import { executeTaskLogic, cleanAIOutput, updateChatContextSummary } from './orchestrator.js';
import { extractFollowUps } from '../utils/helpers.js';
import { io } from '../config/socket.js';
import { callAIProvider } from './ai.js';
import { decrypt } from '../utils/crypto.js';
import { getAppName } from './system.js';
import { buildSystemPrompt } from '../config/protocol.js';
import { VideoResourceProvider } from './videoResourceProvider.js';

export async function createChat(userId: string | number, title?: string) {
  if (!pool) throw new Error('Database initializing');
  const userCheck = await pool.query('SELECT id FROM users WHERE id = $1', [userId]);
  if (userCheck.rows.length === 0) {
    throw new Error('User not found');
  }
  const result = await pool.query('INSERT INTO chats (user_id, title) VALUES ($1, $2) RETURNING *', [userId, title || 'New Chat']);
  return result.rows[0];
}

export async function getUserChats(userId: string | number) {
  if (!pool) throw new Error('Database initializing');
  const result = await pool.query('SELECT * FROM chats WHERE user_id = $1 ORDER BY updated_at DESC', [userId]);
  return result.rows;
}

export async function getUserChatById(chatId: string | number, userId: string | number) {
  if (!pool) throw new Error('Database initializing');
  const result = await pool.query('SELECT * FROM chats WHERE id = $1 AND user_id = $2', [chatId, userId]);
  return result.rows[0] || null;
}

export async function getChatMessages(chatId: string | number, userId: string | number) {
  if (!pool) throw new Error('Database initializing');
  
  const chatCheck = await pool.query('SELECT user_id FROM chats WHERE id = $1', [chatId]);
  if (chatCheck.rows.length === 0 || String(chatCheck.rows[0].user_id) !== String(userId)) {
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
  const { userId, token, file_data, forensic_mode, image_settings, video_settings, audio_settings } = data;
  
  const chatId = data.chatId || data.chat_id;
  const toolId = data.toolId || data.tool_id || 'chat';
  const prompt = data.content || (data.data_p ? decrypt(data.data_p) : '');

  let authenticatedUserId = userId || data.user?.id;
  if (!authenticatedUserId && token) {
    try {
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) throw new Error('JWT_SECRET missing');
      const decoded = jwt.verify(token, jwtSecret) as any;
      authenticatedUserId = decoded.id;
    } catch (e) {
      if ((e as any).name === 'TokenExpiredError') {
        return socket.emit('chat_error', { message: JSON.stringify({ error: 'TokenExpiredError', type: 'TOKEN_EXPIRED' }) });
      }
      return socket.emit('chat_error', { message: 'Unauthorized' });
    }
  }

  if (!authenticatedUserId) return socket.emit('chat_error', { message: 'Unauthorized' });

  // Ensure socket joins user room
  socket.join(`user_${authenticatedUserId}`);

  let resolvedChatId = chatId;
  if (!resolvedChatId) {
    try {
      const newChat = await pool.query(
        'INSERT INTO chats (user_id, title, tool_id, tool) VALUES ($1, $2, $3, $4) RETURNING id',
        [authenticatedUserId, prompt.substring(0, 50) || 'New Conversation', toolId, toolId]
      );
      resolvedChatId = newChat.rows[0].id;
      socket.emit('chat_created', { id: resolvedChatId, title: prompt.substring(0, 50) || 'New Conversation' });
    } catch (chatCreateErr) {
      console.error('[Chat] Failed to auto-create chat:', chatCreateErr);
    }
  }

  // Early client request length audit
  try {
    const { validatePromptLength } = await import('../utils/security.js');
    validatePromptLength(prompt);
  } catch (lengthErr: any) {
    try {
      const parsedErr = JSON.parse(lengthErr.message);
      const uRes = await pool.query('SELECT language FROM users WHERE id = $1', [authenticatedUserId]);
      const userLang = uRes.rows[0]?.language || 'en';
      return socket.emit('chat_error', { message: userLang === 'ar' ? parsedErr.error_ar : parsedErr.error });
    } catch (_) {
      return socket.emit('chat_error', { message: 'Security Alert: Prompt exceeds maximum available limit.' });
    }
  }

  let assistantMessageId: number | undefined;
  let messageSaved = false;
  try {
    if (!pool) throw new Error('Database not ready');

    socket.emit('typing', { isTyping: true, role: 'assistant', name: 'Perplexta', chatId: resolvedChatId });

    const assistantMsgResult = await pool.query(
      'INSERT INTO messages (chat_id, role, content, tool, tool_id) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [resolvedChatId, 'assistant', '...', toolId, toolId]
    );
    assistantMessageId = assistantMsgResult.rows[0].id;

    const generationStart = Date.now();

    const result = await executeTaskLogic(
      { tool_id: toolId, prompt, chat_id: resolvedChatId, file_data, forensic_mode, image_settings, video_settings, audio_settings }, 
      authenticatedUserId, 
      undefined, 
      (chunk) => {
        socket.emit('chat_chunk', { chunk, chatId: resolvedChatId, isFinal: false });
      },
      socket
    );

    const generationTimeSeconds = parseFloat(((Date.now() - generationStart) / 1000).toFixed(2));
    const sanitizedResult = cleanAIOutput(result.result);
    const { cleanText, followUps } = extractFollowUps(sanitizedResult);
    const finalFollowUps = (result.follow_ups && result.follow_ups.length > 0) ? result.follow_ups : followUps;

    await pool.query(
      'UPDATE messages SET content = $1, generation_time = $2, citations = $3, follow_ups = $4 WHERE id = $5',
      [cleanText, generationTimeSeconds, JSON.stringify(result.citations || []), JSON.stringify(finalFollowUps || []), assistantMessageId]
    );
    messageSaved = true;

    if (toolId === 'video' && result.result && assistantMessageId) {
      await VideoResourceProvider.associateMessageWithVideo(assistantMessageId, result.result).catch(() => {});
    }

    if (resolvedChatId) {
      await pool.query('UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = $1', [resolvedChatId]);
      const chatIdNum = parseInt(String(resolvedChatId), 10);
      if (chatIdNum > 0) updateChatContextSummary(chatIdNum, authenticatedUserId).catch(() => {});
    }

    socket.emit('typing', { isTyping: false, role: 'assistant', name: 'Perplexta' });
    socket.emit('chat_chunk', { chunk: '', chatId, isFinal: true });
    socket.emit('chat_response', { 
      result: cleanText, 
      chatId, 
      message_id: assistantMessageId,
      tool: toolId,
      generation_time: generationTimeSeconds,
      citations: result.citations || [],
      follow_ups: finalFollowUps || []
    });

    import('./admin.js').then(({ broadcastAdminStats }) => {
      broadcastAdminStats().catch(() => {});
    }).catch(() => {});

  } catch (error: any) {
    socket.emit('typing', { isTyping: false, role: 'assistant', name: 'Perplexta' });
    if (assistantMessageId && !messageSaved) {
      pool.query('DELETE FROM messages WHERE id = $1', [assistantMessageId]).catch(() => {});
    }
    
    try {
      const parsed = JSON.parse(error.message);
      if (parsed && (parsed.error || parsed.error_ar)) {
        return socket.emit('chat_error', { message: error.message });
      }
    } catch (e) {}
    
    socket.emit('chat_error', { message: JSON.stringify({ error: error.message || 'System error', type: 'GENERAL_ERROR' }) });
  }
}

export async function generateChatTitle(chatId: string, firstMessageContent: string) {
  try {
    if (!pool) return;
    const routeResult = await pool.query('SELECT * FROM tool_orchestrator WHERE tool_id = $1 AND is_active = true', ['perplexta_analysis']);
    if (routeResult.rows.length === 0) return;

    const route = routeResult.rows[0];
    const appName = getAppName('en');
    const systemPrompt = buildSystemPrompt(appName) + "\n\nGenerate a professional title for this chat based on the user's first message. Keep it short (max 50 chars).";

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

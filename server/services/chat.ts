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
  await pool.query('INSERT INTO messages (chat_id, role, content, tool) VALUES ($1, $2, $3, $4)', [chatId, role, content, tool]);
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

export async function handleChatMessage(socket: any, data: any) {
  const { chatId, toolId, userId, token, data_p, data_s, tool_id, chat_id, file_data } = data;
  
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
  if (data_s) {
    customInstructions = decrypt(data_s);
  }

  let assistantMessageId: number | undefined;
  try {
    if (!pool) throw new Error('Database not ready');

    const assistantMsgResult = await pool.query(
      'INSERT INTO messages (chat_id, role, content, tool) VALUES ($1, $2, $3, $4) RETURNING id',
      [finalChatId, 'assistant', '', finalToolId]
    );
    assistantMessageId = assistantMsgResult.rows[0].id;

    const result = await executeTaskLogic(
      { 
        tool_id: finalToolId, 
        prompt: finalPrompt, 
        chat_id: finalChatId,
        system_prompt: customInstructions,
        file_data
      }, 
      authenticatedUserId, 
      undefined, 
      (chunk) => {
        socket.emit('chat_chunk', { chunk, chatId: finalChatId, isFinal: false });
      },
      socket
    );

    await pool.query(
      'UPDATE messages SET content = $1 WHERE id = $2',
      [result.result, assistantMessageId]
    );

    await pool.query('UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = $1', [finalChatId]);

    socket.emit('chat_chunk', { chunk: result.result, chatId: finalChatId, isFinal: true });
    socket.emit('chat_response', { 
      result: result.result, 
      chatId: finalChatId, 
      message_id: assistantMessageId,
      tool: finalToolId 
    });

  } catch (error: any) {
    console.error('[ChatService] Error:', error);
    if (typeof assistantMessageId !== 'undefined' && assistantMessageId > 0) {
      pool.query('DELETE FROM messages WHERE id = $1', [assistantMessageId]).catch((e: any) => console.error('[ChatService] Placeholder deletion failed:', e));
    }
    
    let userMessage = 'An unexpected system error occurred. Please try again later.';
    try {
      const parsed = JSON.parse(error.message);
      if (parsed.error) userMessage = parsed.error;
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

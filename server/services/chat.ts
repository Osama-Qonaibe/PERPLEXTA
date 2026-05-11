import { pool } from '../db/index.js';
import { executeTaskLogic } from './orchestrator.js';
import { io } from '../config/socket.js';

export async function handleChatMessage(socket: any, data: any) {
  const { chatId, content, toolId, userId } = data;
  if (!userId) return socket.emit('chat_error', { message: 'Unauthorized' });

  try {
    // 1. Prepare assistant message placeholder (User message was already saved by REST API)
    if (!pool) throw new Error('Database not ready');

    const assistantMsgResult = await pool.query(
      'INSERT INTO messages (chat_id, role, content, tool) VALUES ($1, $2, $3, $4) RETURNING id',
      [chatId, 'assistant', '', toolId]
    );
    const assistantMessageId = assistantMsgResult.rows[0].id;

    // 2. Execute logic (this will handle streaming)
    // We send data to orchestrator. Socket chunks are emitted via the onChunk callback.
    const result = await executeTaskLogic(
      { 
        tool_id: toolId, 
        prompt: content, 
        chat_id: chatId 
      }, 
      userId, 
      undefined, 
      (chunk) => {
        socket.emit('chat_chunk', { chunk, chatId, isFinal: false });
      },
      socket
    );

    // 3. Update assistant message with final result
    await pool.query(
      'UPDATE messages SET content = $1 WHERE id = $2',
      [result.result, assistantMessageId]
    );

    // 4. Update chat timestamp
    await pool.query('UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = $1', [chatId]);

    // 5. Signal completion
    socket.emit('chat_chunk', { chunk: result.result, chatId, isFinal: true });
    socket.emit('chat_response', { 
      result: result.result, 
      chatId, 
      message_id: assistantMessageId,
      tool: toolId 
    });

  } catch (error: any) {
    console.error('[ChatService] Error:', error);
    socket.emit('chat_error', { message: error.message || 'Internal server error' });
  }
}

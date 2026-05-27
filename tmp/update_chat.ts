import * as fs from 'fs';
const content = fs.readFileSync('server/services/chat.ts', 'utf8');
const newContent = content.replace(
  "console.error('[ChatService] Token verification failed:', e);\\n      return socket.emit('chat_error', { message: 'Unauthorized' });",
  "if (e.name === 'TokenExpiredError') {\\n        console.warn('[ChatService] Token Expired');\\n        return socket.emit('chat_error', { error: 'TokenExpiredError', message: 'TokenExpiredError' });\\n      }\\n      console.error('[ChatService] Token verification failed:', e);\\n      return socket.emit('chat_error', { message: 'Unauthorized' });"
);
fs.writeFileSync('server/services/chat.ts', newContent);
console.log('Update done');

import * as fs from 'fs';

const chatPath = 'server/services/chat.ts';
let content = fs.readFileSync(chatPath, 'utf8');

content = content.replace(
  "console.error('[ChatService] Token verification failed:', e);\n      return socket.emit('chat_error', { message: 'Unauthorized' });",
  "if (e.name === 'TokenExpiredError') {\n        console.warn('[ChatService] Token Expired');\n        return socket.emit('chat_error', { message: JSON.stringify({ error: 'TokenExpiredError', type: 'TOKEN_EXPIRED' }) });\n      }\n      console.error('[ChatService] Token verification failed:', e);\n      return socket.emit('chat_error', { message: 'Unauthorized' });"
);

fs.writeFileSync(chatPath, content);
console.log('Update done to chat.ts');

const chatPagePath = 'src/pages/ChatPage.tsx';
let chatPageContent = fs.readFileSync(chatPagePath, 'utf8');

chatPageContent = chatPageContent.replace(
  "} else if (parsed.type === 'SYSTEM_INACTIVE') {",
  "} else if (parsed.type === 'TOKEN_EXPIRED') {\n          errorMessage = dir === 'rtl' ? 'انتهت صلاحية الجلسة. يرجى تحديث الصفحة أو تسجيل الدخول مرة أخرى.' : 'Session expired. Please refresh the page or login again.';\n          setTimeout(() => window.location.reload(), 3000);\n        } else if (parsed.type === 'SYSTEM_INACTIVE') {"
);

fs.writeFileSync(chatPagePath, chatPageContent);
console.log('Update done to ChatPage.tsx');

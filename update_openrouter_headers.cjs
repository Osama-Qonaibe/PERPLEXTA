const fs = require('fs');
let content = fs.readFileSync('server/services/ai.ts', 'utf8');

const targetStr = `    headers['Authorization'] = \`Bearer \${cleanApiKey}\`;
    const mappedMessages = transformMessagesForOpenAI(messages);`;

const newStr = `    headers['Authorization'] = \`Bearer \${cleanApiKey}\`;
    if (normProvider === 'openrouter') {
      headers['HTTP-Referer'] = 'https://perplexta.ai';
      headers['X-Title'] = 'Perplexta Platform';
      // OpenRouter sometimes hangs on standard streaming parsing if provider doesn't support it well, but stream is true here
    }
    const mappedMessages = transformMessagesForOpenAI(messages);`;

content = content.replace(targetStr, newStr);

// Let's also check if they are streaming and if provider is openrouter. We might want to pass provider-specific routing options.
fs.writeFileSync('server/services/ai.ts', content);

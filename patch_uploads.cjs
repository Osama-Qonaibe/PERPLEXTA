const fs = require('fs');
const file = 'server/app.ts';
let code = fs.readFileSync(file, 'utf8');

const target = `    const publicExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.mp4', '.mov', '.webm', '.mkv', '.avi', '.m4v', '.3gp', '.ogg', '.mp3', '.wav', '.m4a'];
    if (publicExtensions.includes(ext)) return res.sendFile(resolvedPath);

    const authHeader = req.headers['authorization'];
    let token = authHeader && authHeader.split(' ')[1];`;

const replacement = `    const publicExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.mp4', '.mov', '.webm', '.mkv', '.avi', '.m4v', '.3gp', '.ogg', '.mp3', '.wav', '.m4a'];

    const authHeader = req.headers['authorization'];
    let token = authHeader && authHeader.split(' ')[1];
    if (!token && req.query.token) token = req.query.token as string;
    if (token) {
      token = token.trim();
      if (token.startsWith('"') && token.endsWith('"')) token = token.slice(1, -1);
    }

    if (!token || token === 'null' || token === 'undefined') {
      const referer = req.headers.referer || '';
      const isFromApp = referer.includes('.run.app') || referer.includes('localhost') || referer.includes('127.0.0.1');
      if (publicExtensions.includes(ext) && isFromApp) {
        return res.sendFile(resolvedPath);
      }
      return res.status(401).json({ error: 'Unauthorized: Authentication is required to access this file.' });
    }

    // Skip the token check block below since we already handled it
    if (false) {`;

code = code.replace(target, replacement);

const target2 = `    if (token) {
      token = token.trim();
      if (token.startsWith('"') && token.endsWith('"')) token = token.slice(1, -1);
    }
    if (!token || token === 'null' || token === 'undefined') {
      return res.status(401).json({ error: 'Unauthorized: Authentication is required to download this document.' });
    }`;
const replacement2 = `    // Token validation done above`;
code = code.replace(target2, replacement2);

fs.writeFileSync(file, code);

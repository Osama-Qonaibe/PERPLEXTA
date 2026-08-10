import fs from 'fs';
import path from 'path';

let content = fs.readFileSync('server/routes/users.ts', 'utf8');

const avatarOld = `
    const optResult = await optimizeUploadedImage(req.file.path, req.file.originalname);
    const avatarUrl = normalizeMediaUrl(optResult.fileUrl);
`;

const avatarNew = `
    const optResult = await optimizeUploadedImage(req.file.path, req.file.originalname);
    
    const optimizedPath = require('path').join(process.cwd(), optResult.fileUrl.replace(/^\\//, ''));
    const fileBuffer = await require('fs/promises').readFile(optimizedPath);
    const avatarUrl = \`data:image/\${optResult.format || 'webp'};base64,\${fileBuffer.toString('base64')}\`;
    
    // Cleanup local files
    await require('fs/promises').unlink(req.file.path).catch(() => {});
    await require('fs/promises').unlink(optimizedPath).catch(() => {});
`;

content = content.replace(avatarOld, avatarNew);
fs.writeFileSync('server/routes/users.ts', content);

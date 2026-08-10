import fs from 'fs';

let content = fs.readFileSync('server/routes/users.ts', 'utf8');

// Replace require with proper variable usage
content = content.replace(/require\('path'\)/g, 'path');
content = content.replace(/require\('fs\/promises'\)/g, 'fs');

// Add imports at the top
content = "import fs from 'fs/promises';\nimport path from 'path';\n" + content;

fs.writeFileSync('server/routes/users.ts', content);

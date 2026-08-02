const fs = require('fs');
const path = require('path');
function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) walk(full);
    else if (full.endsWith('.ts') || full.endsWith('.tsx')) {
      const code = fs.readFileSync(full, 'utf8');
      if (code.includes('localStorage') && !code.includes('safeStorage')) {
        console.log('Needs fix:', full);
      }
    }
  }
}
walk('src');

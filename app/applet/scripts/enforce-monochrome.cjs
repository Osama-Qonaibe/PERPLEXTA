const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist' && file !== 'workspace' && file !== 'scripts') {
        walkDir(filePath, callback);
      }
    } else if (stat.isFile() && (filePath.endsWith('.ts') || filePath.endsWith('.tsx') || filePath.endsWith('.css'))) {
      callback(filePath);
    }
  }
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  content = content.replace(/shadow-emerald-\d+[\/\w-]*/g, 'shadow-none');
  content = content.replace(/drop-shadow-\[0_0_[^\]]*16,\s*185,\s*129[^\]]*\]/g, '');
  content = content.replace(/from-emerald-\d+[\/\w-]*/g, 'from-gray-500/10');
  content = content.replace(/via-emerald-\d+[\/\w-]*/g, 'via-gray-500/10');
  content = content.replace(/to-emerald-\d+[\/\w-]*/g, 'to-gray-500/5');

  content = content.replace(/\btext-emerald-(300|400|500|600|700|800)\b/g, 'text-accent');
  content = content.replace(/\bbg-emerald-(50|100|200|300|400|500|600|700|800|900)(\/\d+)?\b/g, (match, p1, p2) => {
    return p2 ? `bg-accent${p2}` : 'bg-accent';
  });
  content = content.replace(/\bborder-emerald-(200|300|400|500|600|700)(\/\d+)?\b/g, (match, p1, p2) => {
    return p2 ? `border-accent${p2}` : 'border-accent';
  });
  content = content.replace(/\bhover:bg-emerald-(500|600)\b/g, 'hover:bg-accent-hover');
  content = content.replace(/\bhover:text-emerald-\d+\b/g, 'hover:text-accent');
  content = content.replace(/\bhover:border-emerald-\d+\b/g, 'hover:border-accent');
  content = content.replace(/\baccent-emerald-500\b/g, 'accent-accent');
  content = content.replace(/\bfocus:border-emerald-500\b/g, 'focus:border-accent');
  content = content.replace(/\bfill-emerald-500(\/\d+)?\b/g, 'fill-accent');
  content = content.replace(/emerald/g, 'accent');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated monochromatic colors in: ${filePath}`);
  }
}

console.log('Starting monochrome enforcement (CJS)...');
walkDir(path.join(process.cwd(), 'src'), processFile);
if (fs.existsSync(path.join(process.cwd(), 'server'))) {
  walkDir(path.join(process.cwd(), 'server'), processFile);
}
console.log('Monochrome enforcement (CJS) completed successfully.');

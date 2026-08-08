import fs from 'fs';
import path from 'path';

function walkDir(dir: string, callback: (filePath: string) => void) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist') {
        walkDir(filePath, callback);
      }
    } else if (stat.isFile() && (filePath.endsWith('.ts') || filePath.endsWith('.tsx') || filePath.endsWith('.css'))) {
      callback(filePath);
    }
  }
}

function processFile(filePath: string) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Replace emerald classes with accent or neutral equivalents
  // e.g. text-emerald-500 -> text-accent
  // bg-emerald-500 -> bg-accent
  // border-emerald-500 -> border-accent
  // shadow-emerald-500/20 -> shadow-none
  // drop-shadow-[0_0_12px_rgba(16,185,129,...)] -> ''
  
  const original = content;

  // Replace shadow-emerald-..., drop-shadow-[...16,185,129...]
  content = content.replace(/shadow-emerald-\d+[\/\w-]*/g, 'shadow-none');
  content = content.replace(/drop-shadow-\[0_0_[^\]]*16,\s*185,\s*129[^\]]*\]/g, '');
  content = content.replace(/from-emerald-\d+[\/\w-]*/g, 'from-gray-500/10');
  content = content.replace(/via-emerald-\d+[\/\w-]*/g, 'via-gray-500/10');
  content = content.replace(/to-emerald-\d+[\/\w-]*/g, 'to-gray-500/5');

  // Replace emerald color classes with accent
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

  // Catch any remaining standalone "emerald" in class names or strings
  content = content.replace(/emerald/g, 'accent');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated monochromatic colors in: ${filePath}`);
  }
}

console.log('Starting monochrome enforcement across src and server...');
walkDir(path.join(process.cwd(), 'src'), processFile);
walkDir(path.join(process.cwd(), 'server'), processFile);
console.log('Monochrome enforcement completed successfully.');

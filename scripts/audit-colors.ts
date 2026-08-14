import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HARDCODED_REGEX = /(?:bg|text|border|fill|stroke|shadow|caret|outline|ring|from|to|via|placeholder|divide|accent|underline|decoration)-(emerald|blue|red|amber|gray|slate|pink|purple|orange|yellow|green|indigo|cyan|teal|violet|lime|rose|sky|zinc|stone|neutral|white|black)-\d+|\#[0-9a-f]{3}(?:[0-9a-f]{3})?\b/gi;

const SKIP_FILES = [
  'constants',
  'socialColors',
  'index.css',
  'tailwind.config',
  'brand.ts',
  'semantic.ts',
];

function shouldSkip(filePath: string): boolean {
  return SKIP_FILES.some(f => filePath.includes(f));
}

function scanDir(dir: string, results = new Map<string, string[]>()) {
  if (!fs.existsSync(dir)) return results;

  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (!['node_modules', '.next', 'dist'].includes(file)) {
        scanDir(fullPath, results);
      }
    } else if (/\.(tsx?|jsx?)$/.test(file) && !shouldSkip(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const matches = [...new Set(content.match(HARDCODED_REGEX) || [])];

      if (matches.length > 0) {
        results.set(fullPath, matches);
      }
    }
  }

  return results;
}

const srcDir = path.join(__dirname, '../src');
const violations = scanDir(srcDir);

console.log('\n🎨 COLOR AUDIT REPORT\n');
console.log(`📊 Files with potential hardcoded colors: ${violations.size}`);

let totalViolations = 0;
const violationsArray = Array.from(violations.entries())
  .sort((a, b) => b[1].length - a[1].length)
  .slice(0, 20);

violationsArray.forEach(([file, colors]) => {
  const relativePath = path.relative(process.cwd(), file);
  console.log(`\n📄 ${relativePath}`);
  console.log(`   Violations: ${colors.length}`);
  console.log(`   Colors: ${colors.join(', ')}`);
  totalViolations += colors.length;
});

console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
console.log(`⚠️  TOTAL DETECTED: ${totalViolations} color instances`);
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

process.exit(0);

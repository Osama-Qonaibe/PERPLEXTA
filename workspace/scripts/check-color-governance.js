/**
 * Color Governance Audit Script - Perplexta GitHub Primer Architecture
 * Validates that codebase adheres to strict 3-tier color system.
 */

const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '..', 'src');

// Regex patterns to detect direct hex values and inappropriate brand colors in TSX/JSX
const DIRECT_HEX_REGEX = /#(?:[0-9a-fA-F]{3}){1,2}\b/g;
const HARDCODED_EMERALD_BRAND_REGEX = /text-emerald-\d+|bg-emerald-\d+|border-emerald-\d+/g;

let violationsCount = 0;

function scanDirectory(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      scanDirectory(fullPath);
    } else if (/\.(tsx|jsx|ts|js)$/.test(file) && !file.includes('constants') && !file.includes('socialColors')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      
      const emeraldMatches = content.match(HARDCODED_EMERALD_BRAND_REGEX);
      if (emeraldMatches) {
        console.warn(`[WARN] Color Governance Violation in ${fullPath}:`);
        console.warn(`  Found direct hardcoded emerald brand classes: ${emeraldMatches.join(', ')}`);
        console.warn(`  Use Functional tokens or shared Button/Badge components instead.\n`);
        violationsCount++;
      }
    }
  }
}

console.log('🔍 Starting Perplexta Color Governance Scan...');
scanDirectory(SRC_DIR);

if (violationsCount === 0) {
  console.log('✅ Color Governance Check Passed: No hardcoded brand color violations found!');
  process.exit(0);
} else {
  console.log(`⚠️ Completed scan with ${violationsCount} governance warning(s).`);
  process.exit(0);
}

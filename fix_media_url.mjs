import fs from 'fs';

let content = fs.readFileSync('src/utils/mediaUtils.ts', 'utf8');

const oldLogic = `  if (clean.includes(',')) {
    clean = clean.split(',')[0].trim();
  }

  if (
    clean.startsWith('http://') ||
    clean.startsWith('https://') ||
    clean.startsWith('blob:') ||
    clean.startsWith('data:')
  ) {
    return clean;
  }`;

const newLogic = `  if (
    clean.startsWith('http://') ||
    clean.startsWith('https://') ||
    clean.startsWith('blob:') ||
    clean.startsWith('data:')
  ) {
    // If it's a data URL, do NOT split by comma, as base64 strings contain commas.
    if (clean.startsWith('data:')) return clean;
    
    if (clean.includes(',')) {
      clean = clean.split(',')[0].trim();
    }
    return clean;
  }

  if (clean.includes(',')) {
    clean = clean.split(',')[0].trim();
  }`;

content = content.replace(oldLogic, newLogic);
fs.writeFileSync('src/utils/mediaUtils.ts', content);

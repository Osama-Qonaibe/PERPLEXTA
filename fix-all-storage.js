const fs = require('fs');
const path = require('path');

function fixFile(file) {
  let code = fs.readFileSync(file, 'utf8');
  if (code.includes('safeStorage.')) return; // Already fixed
  
  const safeStorageCode = `
const safeStorage = {
  getItem: (key: string) => {
    try { return typeof window !== 'undefined' ? localStorage.getItem(key) : null; } catch (e) { return null; }
  },
  setItem: (key: string, value: string) => {
    try { if (typeof window !== 'undefined') localStorage.setItem(key, value); } catch (e) {}
  },
  removeItem: (key: string) => {
    try { if (typeof window !== 'undefined') localStorage.removeItem(key); } catch (e) {}
  }
};
`;

  const lastImportIndex = code.lastIndexOf('import ');
  if (lastImportIndex !== -1) {
    const endOfLastImport = code.indexOf('\n', lastImportIndex);
    code = code.slice(0, endOfLastImport + 1) + safeStorageCode + code.slice(endOfLastImport + 1);
  } else {
    code = safeStorageCode + code;
  }

  code = code.replace(/localStorage\.getItem/g, 'safeStorage.getItem');
  code = code.replace(/localStorage\.setItem/g, 'safeStorage.setItem');
  code = code.replace(/localStorage\.removeItem/g, 'safeStorage.removeItem');

  fs.writeFileSync(file, code);
  console.log('Fixed', file);
}

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) walk(full);
    else if (full.endsWith('.ts') || full.endsWith('.tsx')) {
      const code = fs.readFileSync(full, 'utf8');
      if (code.includes('localStorage') && !code.includes('safeStorage')) {
        fixFile(full);
      }
    }
  }
}

walk('src');

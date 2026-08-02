const fs = require('fs');

function fixFile(file) {
  if (!fs.existsSync(file)) return;
  let code = fs.readFileSync(file, 'utf8');
  if (code.includes('safeStorage.')) return; // Already fixed
  
  const safeStorageCode = `
const safeStorage = {
  getItem: (key${file.endsWith('.ts') || file.endsWith('.tsx') ? ': string' : ''}) => {
    try {
      return typeof window !== 'undefined' ? localStorage.getItem(key) : null;
    } catch (e) {
      return null;
    }
  },
  setItem: (key${file.endsWith('.ts') || file.endsWith('.tsx') ? ': string' : ''}, value${file.endsWith('.ts') || file.endsWith('.tsx') ? ': string' : ''}) => {
    try {
      if (typeof window !== 'undefined') localStorage.setItem(key, value);
    } catch (e) {}
  },
  removeItem: (key${file.endsWith('.ts') || file.endsWith('.tsx') ? ': string' : ''}) => {
    try {
      if (typeof window !== 'undefined') localStorage.removeItem(key);
    } catch (e) {}
  }
};
`;

  // Insert safeStorage after the last import
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

fixFile('src/context/AppContext.tsx');
fixFile('src/utils/versionManager.ts');

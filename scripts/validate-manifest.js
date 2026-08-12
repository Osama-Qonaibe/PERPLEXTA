import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const MANIFEST_PATH = path.join(rootDir, 'public', 'manifest.json');

console.log('====================================================');
console.log('🔍 W3C Web App Manifest & PWA Installability Validator');
console.log('====================================================\n');

let errors = [];
let warnings = [];
let passed = [];

function check(condition, passMsg, failMsg, isWarning = false) {
  if (condition) {
    passed.push(passMsg);
  } else {
    if (isWarning) {
      warnings.push(failMsg);
    } else {
      errors.push(failMsg);
    }
  }
}

// 1. File existence & JSON validity
if (!fs.existsSync(MANIFEST_PATH)) {
  console.error(`❌ CRITICAL: manifest.json not found at ${MANIFEST_PATH}`);
  process.exit(1);
}

let manifest;
try {
  const content = fs.readFileSync(MANIFEST_PATH, 'utf-8');
  manifest = JSON.parse(content);
  passed.push('manifest.json is valid JSON.');
} catch (e) {
  console.error(`❌ CRITICAL: manifest.json is invalid JSON: ${e.message}`);
  process.exit(1);
}

// 2. Check Core Fields
check(
  typeof manifest.name === 'string' && manifest.name.trim().length > 0,
  `[Core] 'name' is present: "${manifest.name}"`,
  `[Core] 'name' field is missing or empty.`
);

if (manifest.name && manifest.name.length > 45) {
  warnings.push(`[Core] 'name' length (${manifest.name.length} chars) exceeds recommended 45 characters.`);
}

check(
  typeof manifest.short_name === 'string' && manifest.short_name.trim().length > 0,
  `[Core] 'short_name' is present: "${manifest.short_name}"`,
  `[Core] 'short_name' field is missing or empty.`
);

if (manifest.short_name && manifest.short_name.length > 12) {
  warnings.push(`[Core] 'short_name' length (${manifest.short_name.length} chars) exceeds recommended 12 characters for mobile home screen labels.`);
}

// 3. start_url & scope
check(
  typeof manifest.start_url === 'string' && manifest.start_url.trim().length > 0,
  `[Navigation] 'start_url' is present: "${manifest.start_url}"`,
  `[Navigation] 'start_url' is missing. Mobile OS requires start_url for Add to Home Screen.`
);

check(
  typeof manifest.scope === 'string' && manifest.scope.trim().length > 0,
  `[Navigation] 'scope' is present: "${manifest.scope}"`,
  `[Navigation] 'scope' is missing. Setting scope is highly recommended.`,
  true
);

if (manifest.start_url && manifest.scope) {
  const isWithinScope = manifest.start_url.startsWith(manifest.scope) || manifest.start_url === manifest.scope;
  check(
    isWithinScope,
    `[Navigation] 'start_url' ("${manifest.start_url}") is inside 'scope' ("${manifest.scope}").`,
    `[Navigation] 'start_url' ("${manifest.start_url}") is OUTSIDE specified 'scope' ("${manifest.scope}").`
  );
}

// 4. Display Mode
const VALID_DISPLAY_MODES = ['standalone', 'fullscreen', 'minimal-ui', 'browser'];
const INSTALLABLE_DISPLAY_MODES = ['standalone', 'fullscreen', 'minimal-ui'];

check(
  typeof manifest.display === 'string' && VALID_DISPLAY_MODES.includes(manifest.display),
  `[Display] 'display' mode is valid: "${manifest.display}"`,
  `[Display] 'display' mode "${manifest.display}" is invalid. Must be one of: ${VALID_DISPLAY_MODES.join(', ')}.`
);

check(
  INSTALLABLE_DISPLAY_MODES.includes(manifest.display),
  `[Display] 'display' mode "${manifest.display}" supports mobile PWA installation prompt.`,
  `[Display] 'display' mode "${manifest.display}" does NOT meet W3C PWA installation criteria (must be standalone, fullscreen, or minimal-ui).`
);

// 5. Colors
const hexColorRegex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
check(
  typeof manifest.theme_color === 'string' && hexColorRegex.test(manifest.theme_color),
  `[Theme] 'theme_color' is valid: "${manifest.theme_color}"`,
  `[Theme] 'theme_color' is missing or not a valid hex color string.`
);

check(
  typeof manifest.background_color === 'string' && hexColorRegex.test(manifest.background_color),
  `[Theme] 'background_color' is valid: "${manifest.background_color}"`,
  `[Theme] 'background_color' is missing or not a valid hex color string.`
);

// 6. Icons validation
check(
  Array.isArray(manifest.icons) && manifest.icons.length > 0,
  `[Icons] 'icons' array is present with ${manifest.icons ? manifest.icons.length : 0} items.`,
  `[Icons] 'icons' array is missing or empty. Mobile installation requires at least 192x192 and 512x512 icons.`
);

if (Array.isArray(manifest.icons)) {
  let has192 = false;
  let has512 = false;
  let hasMaskable = false;
  let hasAny = false;

  manifest.icons.forEach((icon, index) => {
    const iconLabel = `Icon #${index + 1} (${icon.src || 'no src'})`;

    check(
      typeof icon.src === 'string' && icon.src.length > 0,
      `  ✓ ${iconLabel} has valid src.`,
      `  ❌ ${iconLabel} missing 'src'.`
    );

    check(
      typeof icon.sizes === 'string' && icon.sizes.length > 0,
      `  ✓ ${iconLabel} has sizes: "${icon.sizes}".`,
      `  ❌ ${iconLabel} missing 'sizes'.`
    );

    check(
      typeof icon.type === 'string' && icon.type.startsWith('image/'),
      `  ✓ ${iconLabel} has valid type: "${icon.type}".`,
      `  ❌ ${iconLabel} type "${icon.type}" is invalid or missing.`
    );

    if (icon.sizes && icon.sizes.includes('192x192')) has192 = true;
    if (icon.sizes && icon.sizes.includes('512x512')) has512 = true;

    const purpose = icon.purpose || 'any';
    if (purpose.includes('maskable')) hasMaskable = true;
    if (purpose.includes('any')) hasAny = true;

    // Check physical file existence in public directory
    if (icon.src) {
      const cleanSrc = icon.src.startsWith('/') ? icon.src.slice(1) : icon.src;
      const filePublicPath = path.join(rootDir, 'public', cleanSrc);
      check(
        fs.existsSync(filePublicPath),
        `  ✓ ${iconLabel} file exists on disk: public/${cleanSrc}`,
        `  ⚠️ ${iconLabel} file missing on disk at: public/${cleanSrc}`,
        true
      );
    }
  });

  check(
    has192,
    `[Icons] Found required 192x192 icon size for Android/iOS homescreen.`,
    `[Icons] Missing required 192x192 icon in manifest.`
  );

  check(
    has512,
    `[Icons] Found required 512x512 icon size for PWA splash screen & high-DPI displays.`,
    `[Icons] Missing required 512x512 icon in manifest.`
  );

  check(
    hasMaskable,
    `[Icons] Found maskable icon purpose for Android adaptive icons.`,
    `[Icons] Missing maskable icon. Adding purpose: "maskable" ensures perfect icon rendering on Android adaptive shapes.`,
    true
  );

  check(
    hasAny,
    `[Icons] Found 'any' icon purpose for standard display.`,
    `[Icons] Missing 'any' icon purpose.`,
    true
  );
}

// Report Results
console.log(`✅ PASSED CHECKS (${passed.length}):`);
passed.forEach((p) => console.log(`   ${p}`));

if (warnings.length > 0) {
  console.log(`\n⚠️  WARNINGS (${warnings.length}):`);
  warnings.forEach((w) => console.log(`   ${w}`));
}

if (errors.length > 0) {
  console.log(`\n❌ ERRORS (${errors.length}):`);
  errors.forEach((e) => console.log(`   ${e}`));
  console.log('\n❌ RESULT: Manifest validation FAILED. Fix errors above to ensure reliable PWA installation.\n');
  process.exit(1);
} else {
  console.log('\n🎉 RESULT: Manifest validation PASSED! The manifest meets W3C standards and mobile PWA trigger criteria.\n');
  process.exit(0);
}

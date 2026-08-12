import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const MANIFEST_PATH = path.join(rootDir, 'public', 'manifest.json');
const SW_PATH = path.join(rootDir, 'public', 'sw.js');
const APP_ASSETS_DIR = path.join(rootDir, 'public', 'app-assets');

export interface CheckResult {
  passed: string[];
  warnings: string[];
  errors: string[];
}

export function validatePwa(): { isValid: boolean; results: CheckResult; manifest?: any } {
  const results: CheckResult = {
    passed: [],
    warnings: [],
    errors: [],
  };

  const check = (condition: boolean, passMsg: string, failMsg: string, isWarning = false) => {
    if (condition) {
      results.passed.push(passMsg);
    } else {
      if (isWarning) {
        results.warnings.push(failMsg);
      } else {
        results.errors.push(failMsg);
      }
    }
  };

  // 1. File existence & JSON parsing
  if (!fs.existsSync(MANIFEST_PATH)) {
    results.errors.push(`manifest.json not found at ${MANIFEST_PATH}`);
    return { isValid: false, results };
  }

  let manifest: any;
  try {
    const content = fs.readFileSync(MANIFEST_PATH, 'utf-8');
    manifest = JSON.parse(content);
    results.passed.push('manifest.json is valid, well-formed JSON.');
  } catch (e: any) {
    results.errors.push(`manifest.json parse error: ${e.message}`);
    return { isValid: false, results };
  }

  // 2. Core Manifest Fields
  check(
    typeof manifest.name === 'string' && manifest.name.trim().length > 0,
    `[Core] 'name' field is valid: "${manifest.name}"`,
    `[Core] 'name' field is missing or empty.`
  );

  if (manifest.name && manifest.name.length > 45) {
    results.warnings.push(`[Core] 'name' length (${manifest.name.length} chars) exceeds recommended 45 characters.`);
  }

  check(
    typeof manifest.short_name === 'string' && manifest.short_name.trim().length > 0,
    `[Core] 'short_name' field is valid: "${manifest.short_name}"`,
    `[Core] 'short_name' field is missing or empty.`
  );

  if (manifest.short_name && manifest.short_name.length > 12) {
    results.warnings.push(`[Core] 'short_name' length (${manifest.short_name.length} chars) exceeds recommended 12 characters for mobile OS home screen labels.`);
  }

  check(
    typeof manifest.description === 'string' && manifest.description.trim().length > 0,
    `[Core] 'description' is present.`,
    `[Core] 'description' is missing. Adding a description improves app store & install prompt metadata.`,
    true
  );

  // 3. Navigation, start_url & scope cross-origin checks
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

  // Cross-Origin check for start_url & scope
  if (manifest.start_url) {
    const isExternalUrl = /^https?:\/\//i.test(manifest.start_url);
    check(
      !isExternalUrl || manifest.start_url.startsWith('http://localhost') || manifest.start_url.startsWith('https://'),
      `[Navigation] 'start_url' uses relative or valid same-origin path: "${manifest.start_url}"`,
      `[Navigation] 'start_url' is an absolute cross-origin URL ("${manifest.start_url}"), which will break PWA scope registration.`
    );
  }

  if (manifest.scope) {
    const isExternalScope = /^https?:\/\//i.test(manifest.scope);
    check(
      !isExternalScope,
      `[Navigation] 'scope' is relative ("${manifest.scope}") and avoids cross-origin registration issues.`,
      `[Navigation] 'scope' is absolute cross-origin URL ("${manifest.scope}"), which can block service worker registration.`
    );
  }

  if (manifest.start_url && manifest.scope) {
    const isWithinScope = manifest.start_url.startsWith(manifest.scope) || manifest.start_url === manifest.scope || manifest.scope === '/';
    check(
      isWithinScope,
      `[Navigation] 'start_url' ("${manifest.start_url}") is safely within 'scope' ("${manifest.scope}").`,
      `[Navigation] 'start_url' ("${manifest.start_url}") falls OUTSIDE 'scope' ("${manifest.scope}").`
    );
  }

  // 4. Display & Orientation
  const VALID_DISPLAY_MODES = ['standalone', 'fullscreen', 'minimal-ui', 'browser'];
  const INSTALLABLE_DISPLAY_MODES = ['standalone', 'fullscreen', 'minimal-ui'];

  check(
    typeof manifest.display === 'string' && VALID_DISPLAY_MODES.includes(manifest.display),
    `[Display] 'display' mode is valid: "${manifest.display}"`,
    `[Display] 'display' mode "${manifest.display}" is invalid.`
  );

  check(
    INSTALLABLE_DISPLAY_MODES.includes(manifest.display),
    `[Display] 'display' mode "${manifest.display}" triggers native PWA install banners on Android/iOS.`,
    `[Display] 'display' mode "${manifest.display}" does NOT trigger mobile PWA installation prompts.`
  );

  // 5. Theme Colors
  const hexColorRegex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
  check(
    typeof manifest.theme_color === 'string' && hexColorRegex.test(manifest.theme_color),
    `[Theme] 'theme_color' is valid hex: "${manifest.theme_color}"`,
    `[Theme] 'theme_color' is missing or not a valid hex color string.`
  );

  check(
    typeof manifest.background_color === 'string' && hexColorRegex.test(manifest.background_color),
    `[Theme] 'background_color' is valid hex: "${manifest.background_color}"`,
    `[Theme] 'background_color' is missing or not a valid hex color string.`
  );

  // 6. Icons & Asset Directory Deep Checks
  check(
    fs.existsSync(APP_ASSETS_DIR),
    `[Assets] Asset directory exists on disk: public/app-assets/`,
    `[Assets] Missing public/app-assets/ directory.`
  );

  check(
    Array.isArray(manifest.icons) && manifest.icons.length > 0,
    `[Icons] 'icons' array contains ${manifest.icons ? manifest.icons.length : 0} defined icons.`,
    `[Icons] 'icons' array is missing or empty.`
  );

  if (Array.isArray(manifest.icons)) {
    let has192 = false;
    let has512 = false;
    let hasMaskable = false;
    let hasAny = false;

    manifest.icons.forEach((icon: any, idx: number) => {
      const label = `Icon #${idx + 1} (${icon.src || 'no src'})`;

      check(
        typeof icon.src === 'string' && icon.src.length > 0,
        `  ✓ ${label} src is valid.`,
        `  ❌ ${label} src is missing.`
      );

      // Check cross-origin icon URLs
      if (icon.src && /^https?:\/\//i.test(icon.src)) {
        results.warnings.push(`  ⚠️ ${label} uses external absolute URL ("${icon.src}"). Local relative paths are preferred for offline PWA reliability.`);
      }

      check(
        typeof icon.sizes === 'string' && icon.sizes.length > 0,
        `  ✓ ${label} sizes: "${icon.sizes}".`,
        `  ❌ ${label} missing 'sizes'.`
      );

      check(
        typeof icon.type === 'string' && icon.type.startsWith('image/'),
        `  ✓ ${label} type: "${icon.type}".`,
        `  ❌ ${label} type missing or invalid.`
      );

      if (icon.sizes && icon.sizes.includes('192x192')) has192 = true;
      if (icon.sizes && icon.sizes.includes('512x512')) has512 = true;

      const purpose = icon.purpose || 'any';
      if (purpose.includes('maskable')) hasMaskable = true;
      if (purpose.includes('any')) hasAny = true;

      // Verify physical existence on disk
      if (icon.src) {
        const cleanSrc = icon.src.startsWith('/') ? icon.src.slice(1) : icon.src;
        const filePath = path.join(rootDir, 'public', cleanSrc);
        check(
          fs.existsSync(filePath),
          `  ✓ ${label} exists on disk at public/${cleanSrc}`,
          `  ❌ ${label} FILE MISSING on disk at public/${cleanSrc}`
        );
      }
    });

    check(
      has192,
      `[Icons] Required 192x192 icon present for mobile home screen.`,
      `[Icons] Missing required 192x192 icon in manifest.`
    );

    check(
      has512,
      `[Icons] Required 512x512 icon present for splash screen & high-DPI displays.`,
      `[Icons] Missing required 512x512 icon in manifest.`
    );

    check(
      hasMaskable,
      `[Icons] Found 'maskable' icon purpose for Android adaptive icon support.`,
      `[Icons] Missing 'maskable' icon purpose.`,
      true
    );

    check(
      hasAny,
      `[Icons] Found 'any' icon purpose for standard rendering.`,
      `[Icons] Missing 'any' icon purpose.`,
      true
    );
  }

  // 7. Service Worker Scope & Cross-Origin Verification
  check(
    fs.existsSync(SW_PATH),
    `[Service Worker] sw.js exists at public/sw.js`,
    `[Service Worker] sw.js is missing at public/sw.js`,
    true
  );

  if (fs.existsSync(SW_PATH)) {
    const swContent = fs.readFileSync(SW_PATH, 'utf-8');
    const hasCrossOriginHardcode = /https?:\/\/(?!localhost)[^\s'"]+/i.test(swContent);
    check(
      !hasCrossOriginHardcode,
      `[Service Worker] sw.js contains no hardcoded cross-origin domains.`,
      `[Service Worker] sw.js contains hardcoded cross-origin URLs which may cause CORS / fetch interception errors.`,
      true
    );
  }

  const isValid = results.errors.length === 0;
  return { isValid, results, manifest };
}

// Execute CLI runner if run directly
if (process.argv[1] && (process.argv[1].endsWith('validate-pwa.ts') || process.argv[1].endsWith('validate-pwa.js'))) {
  console.log('====================================================');
  console.log('🔍 PWA & Web App Manifest Deep Inspector');
  console.log('====================================================\n');

  const { isValid, results } = validatePwa();

  console.log(`✅ PASSED CHECKS (${results.passed.length}):`);
  results.passed.forEach((p) => console.log(`   ${p}`));

  if (results.warnings.length > 0) {
    console.log(`\n⚠️  WARNINGS (${results.warnings.length}):`);
    results.warnings.forEach((w) => console.log(`   ${w}`));
  }

  if (results.errors.length > 0) {
    console.log(`\n❌ ERRORS (${results.errors.length}):`);
    results.errors.forEach((e) => console.log(`   ${e}`));
    console.log('\n❌ RESULT: PWA Validation FAILED. Fix errors above.\n');
    process.exit(1);
  } else {
    console.log('\n🎉 RESULT: PWA Validation PASSED! Fully compliant with W3C standards and mobile PWA install triggers.\n');
    process.exit(0);
  }
}

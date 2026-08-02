const fs = require('fs');
const content = fs.readFileSync('server/db/migrations.ts', 'utf-8');

const startIndex = content.indexOf(`await runVersioned('v79_language_font_config'`);
if (startIndex === -1) { console.error('Not found'); process.exit(1); }
const endIndex = content.indexOf(`console.log('[Migrations] All versioned migrations`);
if (endIndex === -1) { console.error('Not found end'); process.exit(1); }

const toReplace = content.substring(startIndex, endIndex);

const replacement = `await runVersioned('v79_language_font_config', 'Adding font_loading_config, font_config_ar, and font_config_en columns to system_settings', async (tx) => {
      await ensureColumn(tx, 'system_settings', 'font_loading_config', 'TEXT', null);
      await ensureColumn(tx, 'system_settings', 'font_config_ar', 'TEXT', null);
      await ensureColumn(tx, 'system_settings', 'font_config_en', 'TEXT', null);
    });

    `;

const newContent = content.substring(0, startIndex) + replacement + content.substring(endIndex);
fs.writeFileSync('server/db/migrations.ts', newContent);
console.log('Patched');

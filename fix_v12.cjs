const fs = require('fs');
let code = fs.readFileSync('server/db/migrations.ts', 'utf8');

const target = `    // MIGRATION: Payment Gateways Settings Expansion v13`;
const replacement = `    // MIGRATION: Fill Gap v12
    await runVersioned('v12_dummy_migration', 'Placeholder to fix migration sequence gap', async (tx) => {
      // Intentionally left blank to resolve sequence gap
    });

    // MIGRATION: Payment Gateways Settings Expansion v13`;

code = code.replace(target, replacement);
fs.writeFileSync('server/db/migrations.ts', code);

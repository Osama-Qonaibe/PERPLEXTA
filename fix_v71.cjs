const fs = require('fs');
let content = fs.readFileSync('server/db/migrations.ts', 'utf8');

const regex = /await runVersioned\('v71_add_fks'[\s\S]*?\/\/ Removed cross-db foreign key\n\s*await runVersioned\('v72_registered_agents_schema_fix'/;
content = content.replace(regex, `await runVersioned('v71_add_fks', 'Add foreign key constraints', async (tx) => {
      // Intentionally left blank to avoid cross-db foreign keys
    });
    
    await runVersioned('v72_registered_agents_schema_fix'`);

fs.writeFileSync('server/db/migrations.ts', content, 'utf8');
console.log("Fixed with regex");

const fs = require('fs');
const content = fs.readFileSync('server/db/migrations.ts', 'utf-8');

const schemaRegex = /const schema: SchemaTable\[\] = \[([\s\S]*?)\n  \];/;
const match = content.match(schemaRegex);
if (!match) {
  console.log('Schema array not found');
  process.exit(1);
}

const schemaText = match[1];
console.log('Schema text length:', schemaText.length);

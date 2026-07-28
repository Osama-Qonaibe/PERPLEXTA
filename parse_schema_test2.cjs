const schema = [
  { name: 'users', query: `CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        avatar TEXT,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
      )` }
];

for (const table of schema) {
  const match = table.query.match(/\(([\s\S]+)\)/);
  if (match) {
    const columns = match[1].split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith('--') && !line.match(/^(UNIQUE|PRIMARY KEY|FOREIGN KEY)\s*\(/i));

    for (const colDef of columns) {
      const colMatch = colDef.match(/^([a-zA-Z0-9_]+)\s+([\s\S]+)/);
      if (colMatch) {
        const colName = colMatch[1];
        let colType = colMatch[2].trim();
        if (colType.endsWith(',')) colType = colType.slice(0, -1).trim();
        
        console.log(`ALTER TABLE "${table.name}" ADD COLUMN IF NOT EXISTS "${colName}" ${colType};`);
      }
    }
  }
}

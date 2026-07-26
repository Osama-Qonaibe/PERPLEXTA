const fs = require('fs');
let code = fs.readFileSync('server/db/migrations.ts', 'utf8');

// Fix v11
const v11Target = `      await tx.query(\`
        CREATE TABLE IF NOT EXISTS token_blacklist (
          id SERIAL PRIMARY KEY,
          token TEXT UNIQUE NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      \`);`;
const v11Replacement = `      const sTarget = typeof securityClient !== 'undefined' ? (securityClient || client) : client;
      await sTarget.query(\`
        CREATE TABLE IF NOT EXISTS token_blacklist (
          id SERIAL PRIMARY KEY,
          token TEXT UNIQUE NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      \`);`;
code = code.replace(v11Target, v11Replacement);

// Fix lockKey comment
const lockKeyTarget = `const lockKey = Buffer.from(name).reduce((acc, c) => acc + c, 0); // رقم فريد لكل migration`;
const lockKeyReplacement = `const lockKey = Buffer.from(name).reduce((acc, c) => acc + c, 0); // Unique lock key for each migration`;
code = code.replace(lockKeyTarget, lockKeyReplacement);

// Fix defaultVal comment
const defaultValTarget = `        // تطبيق الـ default بـ UPDATE بدلاً من دمجه في DDL`;
const defaultValReplacement = `        // Apply default via UPDATE instead of combining in DDL`;
code = code.replace(defaultValTarget, defaultValReplacement);

fs.writeFileSync('server/db/migrations.ts', code);

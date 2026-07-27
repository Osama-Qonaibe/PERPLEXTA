const fs = require('fs');
let code = fs.readFileSync('server/db/migrations.ts', 'utf8');

const target = `    // MIGRATION: Fill Gap v12
    await runVersioned('v12_dummy_migration', 'Placeholder to fix migration sequence gap', async (tx) => {
      // Intentionally left blank to resolve sequence gap
    });`;

const replacement = `    // MIGRATION: Token Blacklist Security Hardening and Indexes v12
    await runVersioned('v12_token_blacklist_security_hardening', 'Hardening token_blacklist security indexes and expiration TTL performance', async (tx) => {
      const sTarget = typeof securityClient !== 'undefined' && securityClient ? securityClient : client;
      
      await sTarget.query(\`
        CREATE TABLE IF NOT EXISTS token_blacklist (
          id SERIAL PRIMARY KEY,
          token TEXT UNIQUE NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      \`);

      await sTarget.query(\`CREATE UNIQUE INDEX IF NOT EXISTS token_blacklist_pkey ON token_blacklist(id)\`);
      await sTarget.query(\`CREATE UNIQUE INDEX IF NOT EXISTS token_blacklist_token_key ON token_blacklist(token)\`);
      await sTarget.query(\`CREATE INDEX IF NOT EXISTS idx_token_blacklist_active_expires ON token_blacklist(expires_at) WHERE expires_at > CURRENT_TIMESTAMP\`);
    });`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('server/db/migrations.ts', code);
  console.log('Successfully replaced v12 migration.');
} else {
  console.error('Target v12 dummy migration not found in server/db/migrations.ts');
}

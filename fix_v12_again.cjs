const fs = require('fs');
let code = fs.readFileSync('server/db/migrations.ts', 'utf8');

const target = `    // MIGRATION: Move token_blacklist to Security DB v12
    await runVersioned('v12_migrate_token_blacklist_to_security', 'Migrating token_blacklist to Security DB', async (tx) => {
      const sTarget = typeof securityClient !== 'undefined' ? (securityClient || tx) : tx;
      
      // If we are on a separate security db, create the table there and move records
      if (sTarget !== tx) {
        await sTarget.query(\`
          CREATE TABLE IF NOT EXISTS token_blacklist (
            id SERIAL PRIMARY KEY,
            token TEXT UNIQUE NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        \`);
        
        try {
          const oldData = await tx.query('SELECT token, expires_at, created_at FROM token_blacklist');
          if (oldData.rows.length > 0) {
            for (const row of oldData.rows) {
              await sTarget.query(
                'INSERT INTO token_blacklist (token, expires_at, created_at) VALUES ($1, $2, $3) ON CONFLICT (token) DO NOTHING',
                [row.token, row.expires_at, row.created_at]
              );
            }
          }
          await tx.query('DROP TABLE IF EXISTS token_blacklist');
        } catch (err) {
          // Table might not exist on tx if already moved
        }
      } else {
         // Same DB, just ensure it exists
         await sTarget.query(\`
          CREATE TABLE IF NOT EXISTS token_blacklist (
            id SERIAL PRIMARY KEY,
            token TEXT UNIQUE NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        \`);
      }
    });`;

const replacement = `    // MIGRATION: Move token_blacklist to Security DB v12 (Audit Fix & Gap Resolver)
    await runVersioned('v12_migrate_token_blacklist_to_security', 'Ensuring token_blacklist is in Security DB as per audit', async (tx) => {
      const sTarget = typeof securityClient !== 'undefined' && securityClient ? securityClient : client;
      
      // Create table explicitly in Security DB
      await sTarget.query(\`
        CREATE TABLE IF NOT EXISTS token_blacklist (
          id SERIAL PRIMARY KEY,
          token TEXT UNIQUE NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      \`);
      
      // If Security DB is physically distinct, move records from Core DB
      if (sTarget !== client) {
        try {
          const oldData = await client.query('SELECT token, expires_at, created_at FROM token_blacklist');
          if (oldData.rows.length > 0) {
            for (const row of oldData.rows) {
              await sTarget.query(
                'INSERT INTO token_blacklist (token, expires_at, created_at) VALUES ($1, $2, $3) ON CONFLICT (token) DO NOTHING',
                [row.token, row.expires_at, row.created_at]
              );
            }
          }
          await client.query('DROP TABLE IF EXISTS token_blacklist');
        } catch (err) {
          // Table might not exist on Core DB if already moved or never created there
        }
      }
    });`;

code = code.replace(target, replacement);
fs.writeFileSync('server/db/migrations.ts', code);

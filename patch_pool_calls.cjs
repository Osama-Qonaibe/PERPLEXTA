const fs = require('fs');
let content = fs.readFileSync('server/db/index.ts', 'utf8');

content = content.replace(/getBasePoolConfig\((\w+),\s*(\d+),\s*[^)]+\)/g, 'getBasePoolConfig($1, $2)'); // clean any messes
content = content.replace(/getBasePoolConfig\((finalCoreMax), (10000)\)/g, 'getBasePoolConfig($1, $2, normCoreUrl)');
content = content.replace(/getBasePoolConfig\((finalLedgerMax), (5000)\)/g, 'getBasePoolConfig($1, $2, normLedgerUrl)');
content = content.replace(/getBasePoolConfig\((finalExternalMax), (5000)\)/g, 'getBasePoolConfig($1, $2, normExternalUrl)');
content = content.replace(/getBasePoolConfig\((finalSecurityMax), (5000)\)/g, 'getBasePoolConfig($1, $2, normSecurityUrl)');

content = content.replace(/getBasePoolConfig\(currentCoreMax \|\| envSizes\.coreMax, (10000)\)/g, 'getBasePoolConfig(currentCoreMax || envSizes.coreMax, $1, url)');
content = content.replace(/getBasePoolConfig\(currentLedgerMax \|\| envSizes\.ledgerMax, (5000)\)/g, 'getBasePoolConfig(currentLedgerMax || envSizes.ledgerMax, $1, url)');
content = content.replace(/getBasePoolConfig\(currentExternalMax \|\| envSizes\.externalMax, (5000)\)/g, 'getBasePoolConfig(currentExternalMax || envSizes.externalMax, $1, url)');
content = content.replace(/getBasePoolConfig\(currentSecurityMax \|\| envSizes\.securityMax, (5000)\)/g, 'getBasePoolConfig(currentSecurityMax || envSizes.securityMax, $1, url)');

content = content.replace(/getBasePoolConfig\(max, connectionTimeoutMillis\)/g, 'getBasePoolConfig(max, connectionTimeoutMillis, safeConnStr)');

fs.writeFileSync('server/db/index.ts', content);

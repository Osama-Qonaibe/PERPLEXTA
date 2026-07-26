const fs = require('fs');
let code = fs.readFileSync('server/app.ts', 'utf8');

const target = `    // Skip the token check block below since we already handled it
    if (false) {
    // Token validation done above`;

const replacement = ``;

code = code.replace(target, replacement);

fs.writeFileSync('server/app.ts', code);

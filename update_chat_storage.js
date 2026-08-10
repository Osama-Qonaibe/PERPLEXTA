const fs = require('fs');

let content = fs.readFileSync('src/pages/ChatPage.tsx', 'utf8');

// Change sessionStorage to localStorage for draft_query
content = content.replace(/sessionStorage\.getItem\('draft_query'\)/g, "localStorage.getItem('draft_query')");
content = content.replace(/sessionStorage\.setItem\('draft_query'/g, "localStorage.setItem('draft_query'");
content = content.replace(/sessionStorage\.removeItem\('draft_query'\)/g, "localStorage.removeItem('draft_query')");

fs.writeFileSync('src/pages/ChatPage.tsx', content);

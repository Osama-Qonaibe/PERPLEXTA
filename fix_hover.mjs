import fs from 'fs';
let content = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

content = content.replace(/hover:bg-\[var\(--surface-subtle\)\]/g, 'hover:bg-[var(--surface-inset)]');
content = content.replace(/group-hover:bg-\[var\(--surface-subtle\)\]/g, 'group-hover:bg-[var(--surface-inset)]');

// check for any rogue 'dark:bg-[var(--surface-subtle)]'
content = content.replace(/dark:bg-\[var\(--surface-subtle\)\]/g, 'bg-[var(--surface-subtle)]');

// deduplicate
content = content.replace(/(bg-\[var\(--surface-subtle\)\]\s*){2,}/g, 'bg-[var(--surface-subtle)] ');
content = content.replace(/(hover:bg-\[var\(--surface-inset\)\]\s*){2,}/g, 'hover:bg-[var(--surface-inset)] ');
content = content.replace(/(group-hover:bg-\[var\(--surface-inset\)\]\s*){2,}/g, 'group-hover:bg-[var(--surface-inset)] ');

fs.writeFileSync('src/components/Sidebar.tsx', content);

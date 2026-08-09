import fs from 'fs';
let content = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

const regexMap = [
  // bg-gray-* dark:bg-gray-*
  [/(?:bg-gray-\d+(?:\/\d+)?)\s+(?:dark:bg-gray-\d+(?:\/\d+)?)/g, 'bg-[var(--surface-subtle)]'],
  [/dark:bg-gray-\d+(?:\/\d+)?\s+bg-gray-\d+(?:\/\d+)?/g, 'bg-[var(--surface-subtle)]'],
  
  // hover:bg-gray-* dark:hover:bg-gray-*
  [/(?:hover:bg-gray-\d+(?:\/\d+)?)\s+(?:dark:hover:bg-gray-\d+(?:\/\d+)?)/g, 'hover:bg-[var(--surface-inset)]'],
  [/dark:hover:bg-gray-\d+(?:\/\d+)?\s+hover:bg-gray-\d+(?:\/\d+)?/g, 'hover:bg-[var(--surface-inset)]'],
  
  // group-hover:bg-gray-* dark:group-hover:bg-gray-*
  [/(?:group-hover:bg-gray-\d+(?:\/\d+)?)\s+(?:dark:group-hover:bg-gray-\d+(?:\/\d+)?)/g, 'group-hover:bg-[var(--surface-inset)]'],
  [/dark:group-hover:bg-gray-\d+(?:\/\d+)?\s+group-hover:bg-gray-\d+(?:\/\d+)?/g, 'group-hover:bg-[var(--surface-inset)]'],

  // Individual replacements
  [/dark:bg-gray-\d+(?:\/\d+)?/g, 'bg-[var(--surface-subtle)]'],
  [/bg-gray-\d+(?:\/\d+)?/g, 'bg-[var(--surface-subtle)]'],
  
  [/dark:hover:bg-gray-\d+(?:\/\d+)?/g, 'hover:bg-[var(--surface-inset)]'],
  [/hover:bg-gray-\d+(?:\/\d+)?/g, 'hover:bg-[var(--surface-inset)]'],
  
  [/dark:group-hover:bg-gray-\d+(?:\/\d+)?/g, 'group-hover:bg-[var(--surface-inset)]'],
  [/group-hover:bg-gray-\d+(?:\/\d+)?/g, 'group-hover:bg-[var(--surface-inset)]'],
];

for (const [regex, replacement] of regexMap) {
  content = content.replace(regex, replacement);
}

// Deduplicate
content = content.replace(/(bg-\[var\(--surface-subtle\)\]\s*){2,}/g, 'bg-[var(--surface-subtle)] ');
content = content.replace(/(hover:bg-\[var\(--surface-inset\)\]\s*){2,}/g, 'hover:bg-[var(--surface-inset)] ');
content = content.replace(/(group-hover:bg-\[var\(--surface-inset\)\]\s*){2,}/g, 'group-hover:bg-[var(--surface-inset)] ');

fs.writeFileSync('src/components/Sidebar.tsx', content);

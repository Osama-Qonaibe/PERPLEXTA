const fs = require('fs');
let content = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

// Replace static background colors with bg-[var(--surface-subtle)]
// This regex matches `bg-gray-XYZ` and optionally its dark mode counterpart `dark:bg-gray-XYZ`
content = content.replace(/(?:dark:)?bg-gray-\d+(?:\/\d+)?(?:\s+dark:bg-gray-\d+(?:\/\d+)?)?/g, 'bg-[var(--surface-subtle)]');

// Also handle the case where light and dark classes are separated
content = content.replace(/dark:bg-gray-\d+(?:\/\d+)?/g, 'bg-[var(--surface-subtle)]');
content = content.replace(/bg-gray-\d+(?:\/\d+)?/g, 'bg-[var(--surface-subtle)]');

// Replace hover and group-hover background colors with hover:bg-[var(--surface-inset)]
content = content.replace(/(?:dark:)?hover:bg-gray-\d+(?:\/\d+)?(?:\s+dark:hover:bg-gray-\d+(?:\/\d+)?)?/g, 'hover:bg-[var(--surface-inset)]');
content = content.replace(/dark:hover:bg-gray-\d+(?:\/\d+)?/g, 'hover:bg-[var(--surface-inset)]');
content = content.replace(/hover:bg-gray-\d+(?:\/\d+)?/g, 'hover:bg-[var(--surface-inset)]');

// Handle group-hover
content = content.replace(/(?:dark:)?group-hover:bg-gray-\d+(?:\/\d+)?(?:\s+dark:group-hover:bg-gray-\d+(?:\/\d+)?)?/g, 'group-hover:bg-[var(--surface-inset)]');
content = content.replace(/dark:group-hover:bg-gray-\d+(?:\/\d+)?/g, 'group-hover:bg-[var(--surface-inset)]');
content = content.replace(/group-hover:bg-gray-\d+(?:\/\d+)?/g, 'group-hover:bg-[var(--surface-inset)]');

// Deduplicate multiple bg-[var(--surface-subtle)] or hover:bg-[var(--surface-inset)] that might have resulted from replacing 'bg-gray-50 dark:bg-gray-800'
content = content.replace(/(bg-\[var\(--surface-subtle\)\]\s*)+/g, 'bg-[var(--surface-subtle)] ');
content = content.replace(/(hover:bg-\[var\(--surface-inset\)\]\s*)+/g, 'hover:bg-[var(--surface-inset)] ');
content = content.replace(/(group-hover:bg-\[var\(--surface-inset\)\]\s*)+/g, 'group-hover:bg-[var(--surface-inset)] ');

// Clean up any extra spaces
content = content.replace(/\s+/g, ' '); // Wait, this will destroy formatting. Don't do this globally.

fs.writeFileSync('replace_bg.js.tmp', content);

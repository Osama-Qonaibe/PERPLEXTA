const fs = require('fs');
let code = fs.readFileSync('src/components/ReelsFeed.tsx', 'utf8');

// Find the useEffect block we just added
const effectRegex = /  useEffect\(\(\) => \{\n    if \(startId\) \{\n      const idx = reelsList\.findIndex\(\(r\) => r\.id === startId\);\n      if \(idx >= 0 && idx !== activeIndex\) \{\n        setActiveIndex\(idx\);\n        setTimeout\(\(\) => \{ const container = containerRef\.current; if \(container\) \{ const targetItem = container\.querySelector\(`\[data-reel-index="\$\{idx\}"\]`\); if \(targetItem\) \{ targetItem\.scrollIntoView\(\{ behavior: "auto" \}\); \} \} \}, 100\);\n      \}\n    \}\n  \}, \[startId, reelsList\]\);\n/g;

const match = code.match(effectRegex);
if (match) {
  code = code.replace(effectRegex, ''); // Remove it from line 180
  
  // Insert it after const containerRef = useRef<HTMLDivElement>(null);
  code = code.replace(
    "const containerRef = useRef<HTMLDivElement>(null);",
    "const containerRef = useRef<HTMLDivElement>(null);\n\n" + match[0]
  );
  
  fs.writeFileSync('src/components/ReelsFeed.tsx', code);
  console.log('Moved effect down!');
} else {
  console.log('Could not find effect block to move.');
}

import fs from 'fs';

let content = fs.readFileSync('src/pages/ChatPage.tsx', 'utf8');

content = content.replace(
  /const \[editingMessageIndex, setEditingMessageIndex\] = useState<number \| null>\(null\);/,
  "const [editingMessageIndex, setEditingMessageIndex] = useState<number | null>(() => { const cached = localStorage.getItem(`draft_edit_index_${routeChatId || 'new'}`); return cached ? parseInt(cached, 10) : null; });"
);

content = content.replace(
  /const \[editValue, setEditValue\] = useState\(''\);/,
  "const [editValue, setEditValue] = useState(() => localStorage.getItem(`draft_edit_value_${routeChatId || 'new'}`) || '');"
);

const effectCode = `
  useEffect(() => {
    if (editingMessageIndex !== null) {
      localStorage.setItem(\`draft_edit_index_\${routeChatId || 'new'}\`, editingMessageIndex.toString());
      localStorage.setItem(\`draft_edit_value_\${routeChatId || 'new'}\`, editValue);
    } else {
      localStorage.removeItem(\`draft_edit_index_\${routeChatId || 'new'}\`);
      localStorage.removeItem(\`draft_edit_value_\${routeChatId || 'new'}\`);
    }
  }, [editingMessageIndex, editValue, routeChatId]);
`;

content = content.replace(/const \[showPinnedModal, setShowPinnedModal\] = useState\(false\);/, "const [showPinnedModal, setShowPinnedModal] = useState(false);\n" + effectCode);

fs.writeFileSync('src/pages/ChatPage.tsx', content);

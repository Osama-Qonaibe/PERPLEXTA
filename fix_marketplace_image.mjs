import fs from 'fs';

let content = fs.readFileSync('src/components/MarketplaceManagementView.tsx', 'utf8');

const target = "<img src={editImage ? editImage.split(',')[0].trim() : ''} className=\"w-full h-full object-cover rounded-lg\" alt=\"\" referrerPolicy=\"no-referrer\" />";
const replacement = "<img src={editImage ? (editImage.startsWith('data:') ? editImage : editImage.split(',')[0].trim()) : ''} className=\"w-full h-full object-cover rounded-lg\" alt=\"\" referrerPolicy=\"no-referrer\" />";

content = content.replace(target, replacement);

fs.writeFileSync('src/components/MarketplaceManagementView.tsx', content);

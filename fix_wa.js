const fs = require('fs');

let content = fs.readFileSync('src/pages/BulletinBoardPage.tsx', 'utf8');

content = content.replace(
  /className="p\.2\.5 rounded-xl bg-\[#25D366\] hover:bg-\[#20ba59\] text-white font-bold text-xs flex items-center gap-1\.5 transition-theme shadow"/g,
  'className="p-2.5 rounded-xl bg-white dark:bg-[#1a1a1c] hover:bg-gray-50 dark:hover:bg-gray-900 border border-gray-100 dark:border-gray-800 font-bold text-xs flex items-center gap-1.5 transition-theme shadow-sm"\n                              style={{ color: SOCIAL_COLORS.whatsapp.base }}'
);

content = content.replace(
  /className="px-4 py-2 rounded-xl bg-\[#25D366\] hover:bg-\[#20ba59\] text-white font-bold text-xs flex items-center gap-1\.5 transition-theme shadow"/g,
  'className="px-4 py-2 rounded-xl bg-white dark:bg-[#1a1a1c] hover:bg-gray-50 dark:hover:bg-gray-900 border border-gray-100 dark:border-gray-800 font-bold text-xs flex items-center gap-1.5 transition-theme shadow-sm"\n                          style={{ color: SOCIAL_COLORS.whatsapp.base }}'
);

content = content.replace(
  /className="px-3 py-1\.5 rounded-xl bg-\[#25D366\] hover:bg-\[#20ba59\] text-white font-bold text-\[10px\] flex items-center justify-center gap-1 transition-theme shadow-sm"/g,
  'className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#1a1a1c] hover:bg-gray-50 dark:hover:bg-gray-900 border border-gray-100 dark:border-gray-800 font-bold text-[10px] flex items-center justify-center gap-1 transition-theme shadow-sm"\n                                    style={{ color: SOCIAL_COLORS.whatsapp.base }}'
);

fs.writeFileSync('src/pages/BulletinBoardPage.tsx', content);

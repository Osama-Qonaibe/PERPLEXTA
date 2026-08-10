import fs from 'fs';

let content = fs.readFileSync('src/pages/AdminCommunityPage.tsx', 'utf8');

// replace useState('') with useState(() => localStorage.getItem('draft_blog_...') || '')
content = content.replace(/const \[blogTitleEn, setBlogTitleEn\] = useState\(''\);/, "const [blogTitleEn, setBlogTitleEn] = useState(() => localStorage.getItem('draft_blogTitleEn') || '');");
content = content.replace(/const \[blogTitleAr, setBlogTitleAr\] = useState\(''\);/, "const [blogTitleAr, setBlogTitleAr] = useState(() => localStorage.getItem('draft_blogTitleAr') || '');");
content = content.replace(/const \[blogContentEn, setBlogContentEn\] = useState\(''\);/, "const [blogContentEn, setBlogContentEn] = useState(() => localStorage.getItem('draft_blogContentEn') || '');");
content = content.replace(/const \[blogContentAr, setBlogContentAr\] = useState\(''\);/, "const [blogContentAr, setBlogContentAr] = useState(() => localStorage.getItem('draft_blogContentAr') || '');");

// we also need to add an effect to save these to localStorage
const effectCode = `
  useEffect(() => {
    localStorage.setItem('draft_blogTitleEn', blogTitleEn);
    localStorage.setItem('draft_blogTitleAr', blogTitleAr);
    localStorage.setItem('draft_blogContentEn', blogContentEn);
    localStorage.setItem('draft_blogContentAr', blogContentAr);
  }, [blogTitleEn, blogTitleAr, blogContentEn, blogContentAr]);
`;

// Insert the effect after the state declarations (e.g. after uploadError)
content = content.replace(/const \[uploadError, setUploadError\] = useState\(''\);/, "const [uploadError, setUploadError] = useState('');\n" + effectCode);

// Also need to clear localStorage when publishing is successful.
// Find handlePublishBlog and inside after success, clear the storage.
// We can just find the part where it resets the state:
const resetStateCode = `
      setBlogTitleEn('');
      setBlogTitleAr('');
      setBlogContentEn('');
      setBlogContentAr('');
      setBlogCategoryEn('');
      setBlogCategoryAr('');
      setBlogImageUrl('');
      setEditingArticleId(null);
`;
const resetStateWithClearCode = resetStateCode + `
      localStorage.removeItem('draft_blogTitleEn');
      localStorage.removeItem('draft_blogTitleAr');
      localStorage.removeItem('draft_blogContentEn');
      localStorage.removeItem('draft_blogContentAr');
`;

content = content.replace(resetStateCode, resetStateWithClearCode);

fs.writeFileSync('src/pages/AdminCommunityPage.tsx', content);

import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { ShieldCheck, Plus, BookOpen, MessageSquare, Trash2, Send, ArrowLeft, Image, Edit, FileText, ChevronRight, Upload, ShoppingBag, Monitor } from 'lucide-react';
import { motion } from 'motion/react';
import { MarketplaceManagementView } from '../components/MarketplaceManagementView';

interface Category {
  id: number;
  slug: string;
  name_en: string;
  name_ar: string;
  description_en: string;
  description_ar: string;
  post_count: number;
}

interface Article {
  id: number;
  slug: string;
  title_en: string;
  title_ar: string;
  category_en: string;
  category_ar: string;
  views: number;
}

export const AdminCommunityPage: React.FC = () => {
  const { language, token, user, theme, t, isMobile } = useAppContext();
  const [activeTab, setActiveTab] = useState<'blog' | 'forum' | 'marketplace'>('blog');
  
  // Lists
  const [categories, setCategories] = useState<Category[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  // New Article Form state
  const [blogTitleEn, setBlogTitleEn] = useState('');
  const [blogTitleAr, setBlogTitleAr] = useState('');
  const [blogContentEn, setBlogContentEn] = useState('');
  const [blogContentAr, setBlogContentAr] = useState('');
  const [blogCategoryEn, setBlogCategoryEn] = useState('');
  const [blogCategoryAr, setBlogCategoryAr] = useState('');
  const [blogImageUrl, setBlogImageUrl] = useState('');
  const [publishingArticle, setPublishingArticle] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setUploadError('');

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        // Create canvas for 1080x1080 cropping to guarantee beautiful layout presentation
        const canvas = document.createElement('canvas');
        canvas.width = 1080;
        canvas.height = 1080;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          const srcWidth = img.width;
          const srcHeight = img.height;
          const minSide = Math.min(srcWidth, srcHeight);
          
          const sx = (srcWidth - minSide) / 2;
          const sy = (srcHeight - minSide) / 2;

          ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, 1080, 1080);

          canvas.toBlob(async (blob) => {
            if (!blob) {
              setUploadError(language === 'ar' ? 'فشل معالجة الصورة.' : 'Failed to process image.');
              setUploadingImage(false);
              return;
            }

            const resizedFile = new File([blob], file.name, { type: 'image/jpeg' });
            const formData = new FormData();
            formData.append('file', resizedFile);

            try {
              const res = await fetch('/api/files/upload', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`
                },
                body: formData
              });

              if (res.ok) {
                const data = await res.json();
                if (data.success && data.file) {
                  setBlogImageUrl(`/uploads/${data.file.file_url}`);
                } else {
                  setUploadError(language === 'ar' ? 'حدث خطأ في تحميل الملف.' : 'File upload failed.');
                }
              } else {
                const errData = await res.json();
                setUploadError(errData.error || (language === 'ar' ? 'فشل تحميل الصورة.' : 'Failed to upload.'));
              }
            } catch (err) {
              console.error(err);
              setUploadError(language === 'ar' ? 'حدث خطأ أثناء الاتصال بالخادم.' : 'Server connection failed.');
            } finally {
              setUploadingImage(false);
            }
          }, 'image/jpeg', 0.9);
        }
      };
      img.onerror = () => {
        setUploadError(language === 'ar' ? 'ملف الصورة غير صالح.' : 'Invalid image file.');
        setUploadingImage(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // New Forum Category Form state
  const [catNameEn, setCatNameEn] = useState('');
  const [catNameAr, setCatNameAr] = useState('');
  const [catDescEn, setCatDescEn] = useState('');
  const [catDescAr, setCatDescAr] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);

  // Fetch lists
  const refreshData = async () => {
    setLoading(true);
    try {
      const [resCat, resArt] = await Promise.all([
        fetch('/api/forum/categories'),
        fetch('/api/blog/articles')
      ]);
      if (resCat.ok) setCategories(await resCat.json());
      if (resArt.ok) setArticles(await resArt.json());
    } catch (err) {
      console.error('Failed to sync admin lists:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      refreshData();
    }
  }, [user]);

  // Submit Article (Sends global socket notification to all users)
  const handlePublishArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setPublishingArticle(true);
    try {
      const res = await fetch('/api/blog/articles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title_en: blogTitleEn.trim(),
          title_ar: blogTitleAr.trim(),
          content_en: blogContentEn.trim(),
          content_ar: blogContentAr.trim(),
          category_en: blogCategoryEn.trim() || 'Editorials',
          category_ar: blogCategoryAr.trim() || 'افتتاحيات وتحاليل',
          image_url: blogImageUrl.trim()
        })
      });
      if (res.ok) {
        alert(language === 'ar' ? 'تم نشر المقال وإرسال إشعارات جماعية بنجاح!' : 'Article published and global notifications dispatched successfully!');
        setBlogTitleEn('');
        setBlogTitleAr('');
        setBlogContentEn('');
        setBlogContentAr('');
        setBlogCategoryEn('');
        setBlogCategoryAr('');
        setBlogImageUrl('');
        refreshData();
      } else {
        const err = await res.json();
        alert(err.message || 'Publishing failure');
      }
    } catch (err) {
      console.error('Failed to publish article:', err);
    } finally {
      setPublishingArticle(false);
    }
  };

  // Submit Category
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setCreatingCategory(true);
    try {
      const res = await fetch('/api/forum/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name_en: catNameEn.trim(),
          name_ar: catNameAr.trim(),
          description_en: catDescEn.trim(),
          description_ar: catDescAr.trim()
        })
      });
      if (res.ok) {
        alert(language === 'ar' ? 'تم إنشاء قسم المناقشة بنجاح!' : 'Discussion zone created successfully!');
        setCatNameEn('');
        setCatNameAr('');
        setCatDescEn('');
        setCatDescAr('');
        refreshData();
      } else {
        const err = await res.json();
        alert(err.message || 'Creation failure');
      }
    } catch (err) {
      console.error('Failed to create category:', err);
    } finally {
      setCreatingCategory(false);
    }
  };

  // Delete Article
  const handleDeleteArticle = async (id: number) => {
    if (!token) return;
    if (!window.confirm(language === 'ar' ? 'هل أنت متأكد من رغبتك في حذف هذا المقال نهائياً؟' : 'Are you sure you want to permanently delete this article?')) return;
    try {
      const res = await fetch(`/api/blog/articles/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        refreshData();
      }
    } catch (err) {
      console.error('Failed to delete article:', err);
    }
  };

  // Delete Category
  const handleDeleteCategory = async (id: number) => {
    if (!token) return;
    if (!window.confirm(language === 'ar' ? 'هل تود الحذف بالتأكيد؟ سيؤدي ذلك أيضاً إلى إتلاف كافة مواضيع هذا القسم.' : 'Are you sure? This will delete all posts contained in this category.')) return;
    try {
      const res = await fetch(`/api/forum/categories/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        refreshData();
      }
    } catch (err) {
      console.error('Failed to delete category:', err);
    }
  };

  const isRtl = language === 'ar';

  if (isMobile) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center select-none" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mb-4">
          <Monitor size={36} className="text-amber-500 animate-pulse" />
        </div>
        <h2 className="text-lg font-black text-[var(--text-primary)] mb-1">
          {isRtl ? 'التحكم متاح فقط عبر سطح المكتب' : 'Desktop Access Required'}
        </h2>
        <p className="text-xs text-gray-400 max-w-sm">
          {isRtl 
            ? 'تم تعطيل لوحة إدارة الأقسام الخارجية على أجهزة الهاتف لتخفيف حجم التطبيق وتحسين الأداء. يرجى المتابعة من شاشة حاسوبك الشخصي.' 
            : 'To maintain lightweight performance and high operational stability, external category admin panels are restricted to desktop sessions. Please open this view on a PC.'}
        </p>
        <a href="/" className="mt-6 px-4 py-2 border border-emerald-500/30 rounded-sm hover:border-emerald-500 text-emerald-500 text-xs font-bold transition-all duration-300">
          {isRtl ? 'العودة للرئيسية' : 'Back to Home'}
        </a>
      </div>
    );
  }

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center select-none" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-505 flex items-center justify-center mb-4">
          <ShieldCheck size={36} className="text-rose-500 animate-pulse" />
        </div>
        <h2 className="text-lg font-black text-[var(--text-primary)] mb-1">{isRtl ? 'صلاحيات غير كافية' : 'Access Restricted'}</h2>
        <p className="text-xs text-gray-400 max-w-sm">{isRtl ? 'هذه اللوحة مخصصة لإدارة العمليات ومحميّة بالكامل ببروتوكولات التشفير الرقابية.' : 'This secure community administrative console requires verified staff credentials.'}</p>
        <a href="/" className="mt-6 px-4 py-2 border border-emerald-500/30 rounded-sm hover:border-emerald-500 text-emerald-500 text-xs font-bold transition-all duration-300">{isRtl ? 'الرئيسية' : 'Go Home'}</a>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-8" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Sticky-like Admin Header - Elegant Control Layer */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-gray-200/5 dark:border-gray-800/10 select-none">
        <div className="flex items-center gap-4">
          <a
            href="/admin"
            className="p-2.5 rounded-md transition-theme duration-300 flex items-center justify-center bg-[var(--bg-secondary)] hover:bg-[var(--bg-base)] text-gray-400 hover:text-[var(--text-primary)] border border-[var(--border-main)] shadow-sm hover:shadow-md"
            title={isRtl ? 'العودة للمركز الرئيسي' : 'Back to Control Center'}
          >
            {isRtl ? (
              <ArrowLeft size={20} className="rotate-180" />
            ) : (
              <ArrowLeft size={20} />
            )}
          </a>
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight uppercase leading-none text-[var(--text-primary)] transition-theme font-sans">
              {isRtl ? 'إدارة الأقسام الخارجية' : 'External Admin Console'}
            </h1>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1.5 opacity-80">
              {isRtl 
                ? 'المركز الأمني للمقالات، المنتدى التفاعلي، وبضائع الماركت بليس' 
                : 'MODERATION CONSOLE FOR FORUM, BLOG, & MARKETPLACE'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto text-[10px] uppercase font-mono tracking-wider text-emerald-500 font-bold select-none bg-emerald-500/10 border border-emerald-500/10 px-3 py-1.5 rounded-[4px]">
          <ShieldCheck size={12} className="text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
          <span>{isRtl ? 'مشرف معتمد' : 'Staff Moderation Mode'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left hand panel links */}
        <div className="lg:col-span-3 space-y-3 select-none">
          <button
            onClick={() => setActiveTab('blog')}
            className={`w-full text-right sm:text-left flex items-center justify-between px-4 h-11 rounded-[4px] border transition-all duration-300 font-sans text-xs sm:text-sm font-bold ${activeTab === 'blog' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' : 'bg-transparent border-transparent hover:bg-[var(--bg-secondary)] text-gray-400'}`}
          >
            <span className="flex items-center gap-2">
              <BookOpen size={16} className={`transition-all duration-300 ${activeTab === 'blog' ? 'text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]' : ''}`} />
              {isRtl ? 'المقالات والأخبار' : 'Publish Articles'}
            </span>
            <ChevronRight size={14} className={`transition-all duration-300 ${isRtl ? 'rotate-180' : ''} ${activeTab === 'blog' ? 'text-emerald-500' : 'text-gray-400'}`} />
          </button>

          <button
            onClick={() => setActiveTab('forum')}
            className={`w-full text-right sm:text-left flex items-center justify-between px-4 h-11 rounded-[4px] border transition-all duration-300 font-sans text-xs sm:text-sm font-bold ${activeTab === 'forum' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' : 'bg-transparent border-transparent hover:bg-[var(--bg-secondary)] text-gray-400'}`}
          >
            <span className="flex items-center gap-2">
              <MessageSquare size={16} className={`transition-all duration-300 ${activeTab === 'forum' ? 'text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]' : ''}`} />
              {isRtl ? 'أقسام المنتدى' : 'Forum Categories'}
            </span>
            <ChevronRight size={14} className={`transition-all duration-300 ${isRtl ? 'rotate-180' : ''} ${activeTab === 'forum' ? 'text-emerald-500' : 'text-gray-400'}`} />
          </button>

          <button
            onClick={() => setActiveTab('marketplace')}
            className={`w-full text-right sm:text-left flex items-center justify-between px-4 h-11 rounded-[4px] border transition-all duration-300 font-sans text-xs sm:text-sm font-bold ${activeTab === 'marketplace' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' : 'bg-transparent border-transparent hover:bg-[var(--bg-secondary)] text-gray-400'}`}
          >
            <span className="flex items-center gap-2">
              <ShoppingBag size={16} className={`transition-all duration-300 ${activeTab === 'marketplace' ? 'text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]' : ''}`} />
              {isRtl ? 'إدارة الماركت بليس' : 'Marketplace Admin'}
            </span>
            <ChevronRight size={14} className={`transition-all duration-300 ${isRtl ? 'rotate-180' : ''} ${activeTab === 'marketplace' ? 'text-emerald-500' : 'text-gray-400'}`} />
          </button>
        </div>

        {/* Tab contents */}
        <div className="lg:col-span-9">
          {activeTab === 'blog' ? (
            <div className="space-y-8">
              {/* Cover input card */}
              <div className="bg-[var(--bg-secondary)] border border-[var(--border-main)] rounded-lg p-6 sm:p-8">
                <h2 className="text-sm font-black text-[var(--text-primary)] mb-6 flex items-center gap-2 border-b border-gray-100/5 pb-3">
                  <FileText className="text-emerald-500" size={18} />
                  {isRtl ? 'نشر تقرير استخباراتي أو مقال جديد' : 'Publish New Editorial Article'}
                </h2>

                <form onSubmit={handlePublishArticle} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-[10px] font-mono uppercase text-gray-450 mb-2">{isRtl ? 'العنوان بالإنجليزية' : 'Title (English)'}</label>
                      <input
                        type="text"
                        required
                        value={blogTitleEn}
                        onChange={(e) => setBlogTitleEn(e.target.value)}
                        placeholder="e.g. US Fed Rates Hiked Again..."
                        className="w-full h-11 bg-[var(--bg-base)] border border-[var(--border-main)] text-[var(--text-primary)] focus:border-emerald-500 rounded-sm px-4 text-xs font-sans font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono uppercase text-gray-450 mb-2">{isRtl ? 'العنوان بالعربية' : 'Title (Arabic)'}</label>
                      <input
                        type="text"
                        required
                        value={blogTitleAr}
                        onChange={(e) => setBlogTitleAr(e.target.value)}
                        placeholder="مثال: الفيدرالي الأمريكي يثبت أسعار الفائدة..."
                        className="w-full h-11 bg-[var(--bg-base)] border border-[var(--border-main)] text-[var(--text-primary)] focus:border-emerald-500 rounded-sm px-4 text-xs font-sans font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-[10px] font-mono uppercase text-gray-450 mb-2">{isRtl ? 'التصنيف بالإنجليزية' : 'Category (English)'}</label>
                      <input
                        type="text"
                        required
                        value={blogCategoryEn}
                        onChange={(e) => setBlogCategoryEn(e.target.value)}
                        placeholder="e.g. Market Research, Forex, Trends"
                        className="w-full h-11 bg-[var(--bg-base)] border border-[var(--border-main)] text-[var(--text-primary)] focus:border-emerald-500 rounded-sm px-4 text-xs font-sans font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono uppercase text-gray-450 mb-2">{isRtl ? 'التصنيف بالعربية' : 'Category (Arabic)'}</label>
                      <input
                        type="text"
                        required
                        value={blogCategoryAr}
                        onChange={(e) => setBlogCategoryAr(e.target.value)}
                        placeholder="مثال: تحليل مالي، أسواق، فوركس"
                        className="w-full h-11 bg-[var(--bg-base)] border border-[var(--border-main)] text-[var(--text-primary)] focus:border-emerald-500 rounded-sm px-4 text-xs font-sans font-medium"
                      />
                    </div>
                  </div>

                  <div className="bg-[var(--bg-base)] border border-[var(--border-main)] rounded-lg p-4">
                    <div className="flex justify-between items-center mb-3">
                      <label className="block text-[10px] font-mono uppercase text-gray-450 tracking-wider font-bold">
                        {isRtl ? 'صورة غلاف المقال (مربعة 1080x1080)' : 'Article Cover Image (Square 1080x1080)'}
                      </label>
                      {blogImageUrl && (
                        <span className="text-[9px] font-mono text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-[3px] border border-emerald-500/15">
                          1080x1080 HD Crop Loaded
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                      {/* Image Upload Area */}
                      <div className="md:col-span-5">
                        <label className="relative flex flex-col items-center justify-center h-28 border border-dashed border-gray-200/10 dark:border-gray-800/20 rounded-[4px] bg-[var(--bg-secondary)] hover:bg-[var(--bg-base)] cursor-pointer hover:border-emerald-500/40 hover:drop-shadow-[0_0_10px_rgba(16,185,129,0.05)] transition-all duration-300 group overflow-hidden">
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleImageUpload} 
                            className="hidden" 
                            disabled={uploadingImage}
                          />
                          {uploadingImage ? (
                            <div className="flex flex-col items-center gap-1.5 text-center">
                              <div className="w-6 h-6 border-2 border-emerald-500/45 border-t-emerald-500 rounded-full animate-spin" />
                              <span className="text-[10px] text-emerald-550 font-mono">{isRtl ? 'جاري معالجة الصورة...' : 'Processing, cropping...'}</span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-1.5 text-center p-3 select-none">
                              <Upload size={20} className="text-gray-400 group-hover:text-emerald-500 group-hover:scale-105 transition-all duration-300" />
                              <span className="text-[10px] font-black font-sans text-gray-500 group-hover:text-gray-250 transition-colors">{isRtl ? 'رفع من الجهاز (كروب مربع)' : 'Upload from device (Auto crop)'}</span>
                              <span className="text-[8px] font-mono text-gray-550">{isRtl ? 'الحد الأقصى: 15 ميجابايت' : 'Max selection: 15MB'}</span>
                            </div>
                          )}
                        </label>
                      </div>

                      {/* Divider for wide screens */}
                      <div className="hidden md:flex md:col-span-1 justify-center text-xs font-mono text-gray-450">
                        {isRtl ? 'أو' : 'OR'}
                      </div>

                      {/* Image URL Input */}
                      <div className="md:col-span-6 space-y-2">
                        <span className="block text-[9px] font-mono uppercase text-gray-500">{isRtl ? 'أو أدخل رابطاً مباشراً للصورة:' : 'Or supply raw direct image link:'}</span>
                        <input
                          type="url"
                          value={blogImageUrl}
                          onChange={(e) => setBlogImageUrl(e.target.value)}
                          placeholder="https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f"
                          className="w-full h-10 bg-[var(--bg-secondary)] border border-[var(--border-main)] text-[var(--text-primary)] focus:border-emerald-500 rounded-sm px-3 text-xs font-sans font-medium"
                        />
                      </div>
                    </div>

                    {uploadError && (
                      <p className="mt-2 text-[10px] font-mono text-rose-500">{uploadError}</p>
                    )}

                    {blogImageUrl && (
                      <div className="mt-4 flex items-center gap-3 p-2 bg-[var(--bg-secondary)] rounded-sm border border-[var(--border-main)] select-none">
                        <div className="w-12 h-12 rounded-[4px] overflow-hidden border border-emerald-500/30">
                          <img referrerPolicy="no-referrer" src={blogImageUrl} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="block text-[9px] font-mono text-emerald-500">{isRtl ? 'تم تحميل الصورة بنجاح' : 'Cover fully optimized'}</span>
                          <span className="block text-[9px] text-gray-400 truncate max-w-sm">{blogImageUrl}</span>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => setBlogImageUrl('')}
                          className="text-xs font-mono text-rose-500 hover:underline px-2"
                        >
                          {isRtl ? 'إزالة' : 'Remove'}
                        </button>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono uppercase text-gray-450 mb-2">{isRtl ? 'المحتوى بالإنجليزية' : 'Content (English)'}</label>
                    <textarea
                      required
                      rows={6}
                      value={blogContentEn}
                      onChange={(e) => setBlogContentEn(e.target.value)}
                      placeholder="Full Markdown/HTML layout support for premium reports..."
                      className="w-full bg-[var(--bg-base)] border border-[var(--border-main)] text-[var(--text-primary)] focus:border-emerald-500 rounded-sm p-4 text-xs placeholder-gray-500 outline-none resize-none font-sans font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono uppercase text-gray-450 mb-2">{isRtl ? 'المحتوى بالعربية' : 'Content (Arabic)'}</label>
                    <textarea
                      required
                      rows={6}
                      value={blogContentAr}
                      onChange={(e) => setBlogContentAr(e.target.value)}
                      placeholder="دعم نصي متناسق مع اتجاه كتابة RTL للأبحاث والتحاليل..."
                      className="w-full bg-[var(--bg-base)] border border-[var(--border-main)] text-[var(--text-primary)] focus:border-emerald-500 rounded-sm p-4 text-xs placeholder-gray-500 outline-none resize-none font-sans font-medium"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={publishingArticle || !blogTitleEn.trim() || !blogTitleAr.trim()}
                    className="w-full flex items-center justify-center gap-2 h-11 rounded-sm bg-gradient-to-r from-emerald-500 to-teal-600 hover:scale-[1.01] active:scale-[0.99] font-bold text-white text-xs transition-theme cursor-pointer"
                  >
                    {publishingArticle ? (
                      <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Send size={14} className={isRtl ? 'rotate-180' : ''} />
                        <span>{isRtl ? 'نشر المقال وإرسال التنبيهات' : 'Publish Article & Notify Users'}</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* List of current articles */}
              <div className="bg-[var(--bg-secondary)] border border-[var(--border-main)] rounded-lg p-6 sm:p-8">
                <h3 className="text-xs font-black uppercase tracking-tight text-[var(--text-primary)] mb-5 font-mono">{isRtl ? 'إدارة المقالات المنشورة' : 'Manage Existing Articles'} ({articles.length})</h3>
                
                {loading ? (
                  <div className="h-24 bg-[var(--bg-base)] rounded-lg animate-pulse" />
                ) : articles.length > 0 ? (
                  <div className="space-y-3">
                    {articles.map(art => (
                      <div key={art.id} className="flex items-center justify-between gap-4 p-3 bg-[var(--bg-primary)] border border-[var(--border-main)] hover:border-emerald-500/20 rounded-sm transition-theme select-none">
                        <div className="min-w-0">
                          <h4 className="text-[12px] font-black text-[var(--text-primary)] truncate max-w-sm sm:max-w-md">{isRtl ? art.title_ar : art.title_en}</h4>
                          <span className="text-[9px] font-mono text-gray-550 mt-1 block">{isRtl ? art.category_ar : art.category_en} • id: {art.id}</span>
                        </div>
                        <button
                          onClick={() => handleDeleteArticle(art.id)}
                          className="p-1.5 text-gray-400 hover:text-rose-500 hover:drop-shadow-[0_0_8px_rgba(239,68,68,0.5)] transition-colors cursor-pointer shrink-0"
                          title={isRtl ? 'حذف المقال' : 'Delete Article'}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 text-center select-none py-4 font-sans font-medium">{isRtl ? 'لا توجد مقالات منشورة بعد.' : 'No articles published yet.'}</p>
                )}
              </div>
            </div>
          ) : activeTab === 'forum' ? (
            <div className="space-y-8">
              {/* Category form card */}
              <div className="bg-[var(--bg-secondary)] border border-[var(--border-main)] rounded-lg p-6 sm:p-8">
                <h2 className="text-sm font-black text-[var(--text-primary)] mb-6 flex items-center gap-2 border-b border-gray-100/5 pb-3">
                  <Plus className="text-emerald-500" size={18} />
                  {isRtl ? 'إنشاء قسم مناقشة جديد بالمنتدى' : 'Create New Discussion Zone'}
                </h2>

                <form onSubmit={handleCreateCategory} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-[10px] font-mono uppercase text-gray-450 mb-2">{isRtl ? 'اسم القسم بالإنجليزية' : 'Zone Name (English)'}</label>
                      <input
                        type="text"
                        required
                        value={catNameEn}
                        onChange={(e) => setCatNameEn(e.target.value)}
                        placeholder="e.g. Technical Indicators, Trading Bots"
                        className="w-full h-11 bg-[var(--bg-base)] border border-[var(--border-main)] text-[var(--text-primary)] focus:border-emerald-500 rounded-sm px-4 text-xs font-sans font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono uppercase text-gray-450 mb-2">{isRtl ? 'اسم القسم بالعربية' : 'Zone Name (Arabic)'}</label>
                      <input
                        type="text"
                        required
                        value={catNameAr}
                        onChange={(e) => setCatNameAr(e.target.value)}
                        placeholder="مثال: مؤشرات فنية، روبوتات تداول"
                        className="w-full h-11 bg-[var(--bg-base)] border border-[var(--border-main)] text-[var(--text-primary)] focus:border-emerald-500 rounded-sm px-4 text-xs font-sans font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono uppercase text-gray-450 mb-2">{isRtl ? 'الوصف بالإنجليزية' : 'Description (English)'}</label>
                    <textarea
                      required
                      rows={3}
                      value={catDescEn}
                      onChange={(e) => setCatDescEn(e.target.value)}
                      placeholder="Brief guidelines describing what should be posted here..."
                      className="w-full bg-[var(--bg-base)] border border-[var(--border-main)] text-[var(--text-primary)] focus:border-emerald-500 rounded-sm p-4 text-xs placeholder-gray-500 outline-none resize-none font-sans font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono uppercase text-gray-450 mb-2">{isRtl ? 'الوصف بالعربية' : 'Description (Arabic)'}</label>
                    <textarea
                      required
                      rows={3}
                      value={catDescAr}
                      onChange={(e) => setCatDescAr(e.target.value)}
                      placeholder="إرشادات قصيرة تصف طبيعة المواضيع المقبولة في هذا القسم..."
                      className="w-full bg-[var(--bg-base)] border border-[var(--border-main)] text-[var(--text-primary)] focus:border-emerald-500 rounded-sm p-4 text-xs placeholder-gray-500 outline-none resize-none font-sans font-medium"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={creatingCategory || !catNameEn.trim() || !catNameAr.trim()}
                    className="w-full flex items-center justify-center gap-2 h-11 rounded-sm bg-gradient-to-r from-emerald-500 to-teal-600 hover:scale-[1.01] active:scale-[0.99] font-bold text-white text-xs transition-theme cursor-pointer"
                  >
                    {creatingCategory ? (
                      <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Plus size={14} />
                        <span>{isRtl ? 'إنشاء قسم المناقشة' : 'Create Discussion Zone'}</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* List of categories */}
              <div className="bg-[var(--bg-secondary)] border border-[var(--border-main)] rounded-lg p-6 sm:p-8">
                <h3 className="text-xs font-black uppercase tracking-tight text-[var(--text-primary)] mb-5 font-mono">{isRtl ? 'إدارة أقسام المناقشة الحالية' : 'Manage Current Categories'} ({categories.length})</h3>
                
                {loading ? (
                  <div className="h-24 bg-[var(--bg-base)] rounded-lg animate-pulse" />
                ) : categories.length > 0 ? (
                  <div className="space-y-3">
                    {categories.map(cat => (
                      <div key={cat.id} className="flex items-center justify-between gap-4 p-3 bg-[var(--bg-primary)] border border-[var(--border-main)] hover:border-emerald-500/20 rounded-sm transition-theme select-none">
                        <div className="min-w-0">
                          <h4 className="text-[12px] font-black text-[var(--text-primary)] truncate max-w-sm sm:max-w-md">{isRtl ? cat.name_ar : cat.name_en}</h4>
                          <span className="text-[9px] font-mono text-gray-555 mt-1 block">slug: {cat.slug} • posts: {cat.post_count}</span>
                        </div>
                        <button
                          onClick={() => handleDeleteCategory(cat.id)}
                          className="p-1.5 text-gray-400 hover:text-rose-500 hover:drop-shadow-[0_0_8px_rgba(239,68,68,0.5)] transition-colors cursor-pointer shrink-0"
                          title={isRtl ? 'حذف القسم' : 'Delete Zone'}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 text-center py-4 font-sans font-medium">{isRtl ? 'لا توجد أقسام متوفرة.' : 'No categories created.'}</p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="p-6 sm:p-8 rounded-lg border border-[var(--border-main)] bg-[var(--bg-secondary)] shadow-xl">
                <MarketplaceManagementView theme={theme || 'dark'} t={t} dir={isRtl ? 'rtl' : 'ltr'} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

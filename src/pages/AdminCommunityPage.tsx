import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { ShieldCheck, Plus, BookOpen, Trash2, Edit, ChevronRight, ShoppingBag, Monitor, ArrowLeft, FileText, Upload, Send, MonitorSmartphone } from 'lucide-react';
import { motion } from 'motion/react';
import { MarketplaceManagementView } from '../components/MarketplaceManagementView';
import { ActionConfirmationModal } from '../components/ActionConfirmationModal';
import { toast } from 'sonner';
import { getMediaUrl } from '../utils/mediaUtils';
import { SmartMetaSuggestion } from '../components/SmartMetaSuggestion';

interface Article {
  id: number;
  slug: string;
  title_en: string;
  title_ar: string;
  category_en: string;
  category_ar: string;
  views: number;
  content_en?: string;
  content_ar?: string;
  image_url?: string;
}

export const AdminCommunityPage: React.FC = () => {
  const { language, token, user, theme, t, isMobile } = useAppContext();
  const [activeTab, setActiveTab] = useState<'blog' | 'marketplace'>('blog');
  
  // Lists
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  // New Article Form state
  const [blogTitleEn, setBlogTitleEn] = useState(() => localStorage.getItem('draft_blogTitleEn') || '');
  const [blogTitleAr, setBlogTitleAr] = useState(() => localStorage.getItem('draft_blogTitleAr') || '');
  const [blogContentEn, setBlogContentEn] = useState(() => localStorage.getItem('draft_blogContentEn') || '');
  const [blogContentAr, setBlogContentAr] = useState(() => localStorage.getItem('draft_blogContentAr') || '');
  const [blogCategoryEn, setBlogCategoryEn] = useState('');
  const [blogCategoryAr, setBlogCategoryAr] = useState('');
  const [blogImageUrl, setBlogImageUrl] = useState('');
  
  // SEO fields
  const [metaTitleEn, setMetaTitleEn] = useState('');
  const [metaDescriptionEn, setMetaDescriptionEn] = useState('');
  const [metaTitleAr, setMetaTitleAr] = useState('');
  const [metaDescriptionAr, setMetaDescriptionAr] = useState('');

  const [publishingArticle, setPublishingArticle] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState('');

  useEffect(() => {
    localStorage.setItem('draft_blogTitleEn', blogTitleEn);
    localStorage.setItem('draft_blogTitleAr', blogTitleAr);
    localStorage.setItem('draft_blogContentEn', blogContentEn);
    localStorage.setItem('draft_blogContentAr', blogContentAr);
  }, [blogTitleEn, blogTitleAr, blogContentEn, blogContentAr]);


  // Edit Mode state
  const [editingArticleId, setEditingArticleId] = useState<number | null>(null);

  // Reusable confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: { ar: string; en: string };
    description: { ar: string; en: string };
    onConfirm: () => Promise<void> | void;
    variant: 'danger' | 'success' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: { ar: '', en: '' },
    description: { ar: '', en: '' },
    onConfirm: () => {},
    variant: 'danger'
  });

  const openConfirm = (
    titleAr: string, titleEn: string,
    descAr: string, descEn: string,
    onConfirmAction: () => Promise<void> | void,
    variant: 'danger' | 'success' | 'warning' | 'info' = 'danger'
  ) => {
    setConfirmModal({
      isOpen: true,
      title: { ar: titleAr, en: titleEn },
      description: { ar: descAr, en: descEn },
      onConfirm: onConfirmAction,
      variant
    });
  };

  const startEditArticle = (art: Article) => {
    setEditingArticleId(art.id);
    setBlogTitleEn(art.title_en);
    setBlogTitleAr(art.title_ar);
    setBlogContentEn(art.content_en || '');
    setBlogContentAr(art.content_ar || '');
    setBlogCategoryEn(art.category_en);
    setBlogCategoryAr(art.category_ar);
    setBlogImageUrl(art.image_url || '');

    // Smooth scroll back to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEditArticle = () => {
    setEditingArticleId(null);
    setBlogTitleEn('');
    setBlogTitleAr('');
    setBlogContentEn('');
    setBlogContentAr('');
    setBlogCategoryEn('');
    setBlogCategoryAr('');
    setBlogImageUrl('');
  };

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
                  const rawUrl = data.file.file_url || data.fileUrl || data.file.url;
                  setBlogImageUrl(getMediaUrl(rawUrl));
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

  // Fetch lists
  const refreshData = async () => {
    setLoading(true);
    try {
      const resArt = await fetch('/api/blog/articles');
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
  }, [user, activeTab]);

  // Submit or Update Article (Sends global socket notification on creation)
  const handlePublishArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setPublishingArticle(true);
    try {
      const isEditing = editingArticleId !== null;
      const url = isEditing ? `/api/blog/articles/${editingArticleId}` : '/api/blog/articles';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
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
          image_url: blogImageUrl.trim(),
          meta_title_en: metaTitleEn,
          meta_description_en: metaDescriptionEn,
          meta_title_ar: metaTitleAr,
          meta_description_ar: metaDescriptionAr
        })
      });

      if (res.ok) {
        toast.success(
          language === 'ar' 
            ? (isEditing ? 'تم تعديل وحفظ المقال بنجاح!' : 'تم نشر المقال وإرسال إشعارات جماعية بنجاح!') 
            : (isEditing ? 'Article updated and saved successfully!' : 'Article published and global notifications dispatched successfully!')
        );
        cancelEditArticle();
        refreshData();
      } else {
        const err = await res.json();
        toast.error(err.message || err.error || (language === 'ar' ? 'فشلت العملية' : 'Publishing failure'));
      }
    } catch (err) {
      console.error('Failed to publish article:', err);
      toast.error(language === 'ar' ? 'حدث خطأ غير متوقع.' : 'An unexpected error occurred.');
    } finally {
      setPublishingArticle(false);
    }
  };

  // Delete Article (using Custom Confirmation Modal)
  const handleDeleteArticle = (id: number) => {
    openConfirm(
      'تأكيد حذف المقال', 'Confirm Article Deletion',
      'هل أنت متأكد من رغبتك في حذف هذا المقال نهائياً؟ لا يمكن التراجع عن هذا الإجراء.', 'Are you sure you want to permanently delete this article? This action cannot be undone.',
      async () => {
        if (!token) return;
        try {
          const res = await fetch(`/api/blog/articles/${id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (res.ok) {
            toast.success(language === 'ar' ? 'تم حذف المقال بنجاح!' : 'Article deleted successfully!');
            if (editingArticleId === id) {
              cancelEditArticle();
            }
            refreshData();
          } else {
            const err = await res.json();
            toast.error(err.message || err.error || (language === 'ar' ? 'فشل الحذف' : 'Failed to delete'));
          }
        } catch (err) {
          console.error('Failed to delete article:', err);
          toast.error(language === 'ar' ? 'حدث خطأ أثناء الاتصال بالخادم.' : 'Server connection failed.');
        }
      },
      'danger'
    );
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
        <a href="/" className="mt-6 px-4 py-2 border border-accent/30 rounded-sm hover:border-accent text-accent text-xs font-bold transition-theme">
          {isRtl ? 'العودة للرئيسية' : 'Back to Home'}
        </a>
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-[calc(100vh-72px)] bg-[var(--bg-base)] text-center p-6 transition-theme">
        <MonitorSmartphone size={64} className="text-gray-400 mb-6 drop-shadow-sm" />
        <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-3 tracking-tight">
          {language === 'ar' ? 'غير متاح على الجوال' : 'Not Available on Mobile'}
        </h2>
        <p className="text-base text-gray-500 max-w-sm leading-relaxed">
          {language === 'ar'
            ? 'لوحة الإدارة مصممة للشاشات الكبيرة لضمان تجربة تحكم احترافية. يرجى فتح هذه الصفحة من جهاز كمبيوتر مكتبي.'
            : 'The Admin Dashboard is optimized for larger screens to ensure a professional control experience. Please access this page from a desktop computer.'}
        </p>
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
        <a href="/" className="mt-6 px-4 py-2 border border-accent/30 rounded-sm hover:border-accent text-accent text-xs font-bold transition-theme">{isRtl ? 'الرئيسية' : 'Go Home'}</a>
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
            className="p-2.5 rounded-md transition-theme flex items-center justify-center bg-[var(--bg-secondary)] hover:bg-[var(--bg-base)] text-gray-400 hover:text-[var(--text-primary)] border border-[var(--border-main)] shadow-sm hover:shadow-md"
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
              {isRtl ? 'لوحة تحكم الأقسام' : 'Sections Dashboard'}
            </h1>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1.5 opacity-80">
              {isRtl 
                ? 'المركز الأمني للمقالات وبضائع الماركت بليس' 
                : 'MODERATION CONSOLE FOR BLOG & MARKETPLACE'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto text-[10px] uppercase font-mono tracking-wider text-accent font-bold select-none bg-accent/10 border border-accent/10 px-3 py-1.5 rounded-[4px]">
          <ShieldCheck size={12} className="text-accent " />
          <span>{isRtl ? 'مشرف معتمد' : 'Staff Moderation Mode'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left hand panel links */}
        <div className="lg:col-span-3 space-y-3 select-none">
          <button
            onClick={() => setActiveTab('blog')}
            className={`w-full text-right sm:text-left flex items-center justify-between px-4 h-11 rounded-[4px] border transition-theme font-sans text-xs sm:text-sm font-bold ${activeTab === 'blog' ? 'bg-accent/10 border-accent/30 text-accent' : 'bg-transparent border-transparent hover:bg-[var(--bg-secondary)] text-gray-400'}`}
          >
            <span className="flex items-center gap-2">
              <BookOpen size={16} className={`transition-theme ${activeTab === 'blog' ? 'text-accent ' : ''}`} />
              {isRtl ? 'المقالات والأخبار' : 'Publish Articles'}
            </span>
            <ChevronRight size={14} className={`transition-theme ${isRtl ? 'rotate-180' : ''} ${activeTab === 'blog' ? 'text-accent' : 'text-gray-400'}`} />
          </button>

          <button
            onClick={() => setActiveTab('marketplace')}
            className={`w-full text-right sm:text-left flex items-center justify-between px-4 h-11 rounded-[4px] border transition-theme font-sans text-xs sm:text-sm font-bold ${activeTab === 'marketplace' ? 'bg-accent/10 border-accent/30 text-accent' : 'bg-transparent border-transparent hover:bg-[var(--bg-secondary)] text-gray-400'}`}
          >
            <span className="flex items-center gap-2">
              <ShoppingBag size={16} className={`transition-theme ${activeTab === 'marketplace' ? 'text-accent ' : ''}`} />
              {isRtl ? 'إدارة الماركت بليس' : 'Marketplace Admin'}
            </span>
            <ChevronRight size={14} className={`transition-theme ${isRtl ? 'rotate-180' : ''} ${activeTab === 'marketplace' ? 'text-accent' : 'text-gray-400'}`} />
          </button>
        </div>

        {/* Tab contents */}
        <div className="lg:col-span-9">
          {activeTab === 'blog' ? (
            <div className="space-y-8">
              {/* Cover input card */}
              <div className="bg-[var(--bg-secondary)] border border-[var(--border-main)] rounded-lg p-6 sm:p-8">
                <h2 className="text-sm font-black text-[var(--text-primary)] mb-6 flex items-center gap-4 border-b border-gray-100/5 pb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="text-accent" size={18} />
                    {editingArticleId !== null 
                      ? (isRtl ? 'تعديل التقرير أو المقال الاستخباراتي الحالي' : 'Edit Intelligence Report / Editorial Article')
                      : (isRtl ? 'نشر تقرير استخباراتي أو مقال جديد' : 'Publish New Editorial Article')
                    }
                  </div>
                  {editingArticleId !== null && (
                    <span className="text-[10px] font-mono font-bold text-amber-500 bg-amber-500/10 border border-amber-500/15 px-2 py-0.5 rounded-[4px] uppercase animate-pulse select-none">
                      {isRtl ? 'وضع التعديل' : 'Edit Mode'}
                    </span>
                  )}
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
                        className="w-full h-11 bg-[var(--bg-base)] border border-[var(--border-main)] text-[var(--text-primary)] focus:border-accent rounded-sm px-4 text-xs font-sans font-medium"
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
                        className="w-full h-11 bg-[var(--bg-base)] border border-[var(--border-main)] text-[var(--text-primary)] focus:border-accent rounded-sm px-4 text-xs font-sans font-medium"
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
                        className="w-full h-11 bg-[var(--bg-base)] border border-[var(--border-main)] text-[var(--text-primary)] focus:border-accent rounded-sm px-4 text-xs font-sans font-medium"
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
                        className="w-full h-11 bg-[var(--bg-base)] border border-[var(--border-main)] text-[var(--text-primary)] focus:border-accent rounded-sm px-4 text-xs font-sans font-medium"
                      />
                    </div>
                  </div>

                  <div className="bg-[var(--bg-base)] border border-[var(--border-main)] rounded-lg p-4">
                    <div className="flex justify-between items-center mb-3">
                      <label className="block text-[10px] font-mono uppercase text-gray-450 tracking-wider font-bold">
                        {isRtl ? 'صورة غلاف المقال (مربعة 1080x1080)' : 'Article Cover Image (Square 1080x1080)'}
                      </label>
                      {blogImageUrl && (
                        <span className="text-[9px] font-mono text-accent bg-accent/10 px-2 py-0.5 rounded-[3px] border border-accent/15">
                          1080x1080 HD Crop Loaded
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                      {/* Image Upload Area */}
                      <div className="md:col-span-5">
                        <label className="relative flex flex-col items-center justify-center h-28 border border-dashed border-gray-200/10 dark:border-gray-800/20 rounded-[4px] bg-[var(--bg-secondary)] hover:bg-[var(--bg-base)] cursor-pointer hover:border-accent/40 hover: transition-theme group overflow-hidden">
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleImageUpload} 
                            className="hidden" 
                            disabled={uploadingImage}
                          />
                          {uploadingImage ? (
                            <div className="flex flex-col items-center gap-1.5 text-center">
                              <div className="w-6 h-6 border-2 border-accent/45 border-t-accent-500 rounded-full animate-spin" />
                              <span className="text-[10px] text-accent font-mono">{isRtl ? 'جاري معالجة الصورة...' : 'Processing, cropping...'}</span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-1.5 text-center p-3 select-none">
                              <Upload size={20} className="text-gray-400 group-hover:text-accent group-hover:scale-105 transition-theme" />
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
                          className="w-full h-10 bg-[var(--bg-secondary)] border border-[var(--border-main)] text-[var(--text-primary)] focus:border-accent rounded-sm px-3 text-xs font-sans font-medium"
                        />
                      </div>
                    </div>

                    {uploadError && (
                      <p className="mt-2 text-[10px] font-mono text-rose-500">{uploadError}</p>
                    )}

                    {blogImageUrl && (
                      <div className="mt-4 flex items-center gap-3 p-2 bg-[var(--bg-secondary)] rounded-sm border border-[var(--border-main)] select-none">
                        <div className="w-12 h-12 rounded-[4px] overflow-hidden border border-accent/30">
                          <img referrerPolicy="no-referrer" src={blogImageUrl} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="block text-[9px] font-mono text-accent">{isRtl ? 'تم تحميل الصورة بنجاح' : 'Cover fully optimized'}</span>
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
                    <SmartMetaSuggestion 
                      content={blogContentEn} 
                      onApply={(t, d) => { setMetaTitleEn(t); setMetaDescriptionEn(d); }}
                    />
                    <textarea
                      required
                      rows={6}
                      value={blogContentEn}
                      onChange={(e) => setBlogContentEn(e.target.value)}
                      placeholder="Full Markdown/HTML layout support for premium reports..."
                      className="w-full bg-[var(--bg-base)] border border-[var(--border-main)] text-[var(--text-primary)] focus:border-accent rounded-sm p-4 text-xs placeholder-gray-500 outline-none resize-none font-sans font-medium mb-4"
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <input value={metaTitleEn} onChange={(e) => setMetaTitleEn(e.target.value)} placeholder="Meta Title (En)" className="w-full h-10 bg-[var(--bg-base)] border border-[var(--border-main)] text-[var(--text-primary)] rounded-sm px-3 text-xs" />
                        <input value={metaDescriptionEn} onChange={(e) => setMetaDescriptionEn(e.target.value)} placeholder="Meta Description (En)" className="w-full h-10 bg-[var(--bg-base)] border border-[var(--border-main)] text-[var(--text-primary)] rounded-sm px-3 text-xs" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono uppercase text-gray-450 mb-2">{isRtl ? 'المحتوى بالعربية' : 'Content (Arabic)'}</label>
                    <textarea
                      required
                      rows={6}
                      value={blogContentAr}
                      onChange={(e) => setBlogContentAr(e.target.value)}
                      placeholder="دعم نصي متناسق مع اتجاه كتابة RTL للأبحاث والتحاليل..."
                      className="w-full bg-[var(--bg-base)] border border-[var(--border-main)] text-[var(--text-primary)] focus:border-accent rounded-sm p-4 text-xs placeholder-gray-500 outline-none resize-none font-sans font-medium mb-4"
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <input value={metaTitleAr} onChange={(e) => setMetaTitleAr(e.target.value)} placeholder="Meta Title (Ar)" className="w-full h-10 bg-[var(--bg-base)] border border-[var(--border-main)] text-[var(--text-primary)] rounded-sm px-3 text-xs" />
                        <input value={metaDescriptionAr} onChange={(e) => setMetaDescriptionAr(e.target.value)} placeholder="Meta Description (Ar)" className="w-full h-10 bg-[var(--bg-base)] border border-[var(--border-main)] text-[var(--text-primary)] rounded-sm px-3 text-xs" />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    {editingArticleId !== null && (
                      <button
                        type="button"
                        onClick={cancelEditArticle}
                        className="flex-1 sm:flex-initial flex items-center justify-center gap-2 h-11 px-6 rounded-sm border border-[var(--border-main)] text-gray-400 hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] text-xs font-bold transition-theme cursor-pointer"
                      >
                        <span>{isRtl ? 'إلغاء التعديل' : 'Cancel Edit'}</span>
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={publishingArticle || !blogTitleEn.trim() || !blogTitleAr.trim()}
                      className={`flex-1 flex items-center justify-center gap-2 h-11 rounded-sm font-bold text-white text-xs transition-theme cursor-pointer ${
                        editingArticleId !== null 
                          ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:scale-[1.01] active:scale-[0.99]' 
                          : 'bg-gradient-to-r from-gray-500/10 to-teal-600 hover:scale-[1.01] active:scale-[0.99]'
                      }`}
                    >
                      {publishingArticle ? (
                        <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          {editingArticleId !== null ? <Edit size={14} /> : <Send size={14} className={isRtl ? 'rotate-180' : ''} />}
                          <span>
                            {editingArticleId !== null 
                              ? (isRtl ? 'حفظ وتحديث التغييرات' : 'Save & Compile Updates')
                              : (isRtl ? 'نشر المقال وإرسال التنبيهات' : 'Publish Article & Notify Users')
                            }
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* List of current articles */}
              <div className="bg-[var(--bg-secondary)] border border-[var(--border-main)] rounded-lg p-6 sm:p-8">
                <h3 className="text-xs font-black uppercase tracking-tight text-[var(--text-primary)] mb-5 font-mono">{isRtl ? 'إدارة المقالات المنشورة' : 'Manage Existing Articles'} ({articles.length})</h3>
                
                {loading ? (
                  <div className="h-24 bg-[var(--bg-base)] rounded-lg animate-pulse" />
                ) : articles.length > 0 ? (
                  <div className="space-y-3">
                    {articles.map(art => {
                      const isCurrentlyEditing = editingArticleId === art.id;
                      return (
                        <div 
                          key={art.id} 
                          className={`flex items-center justify-between gap-4 p-3 border rounded-sm transition-theme select-none font-sans ${
                            isCurrentlyEditing 
                              ? 'bg-amber-500/5 border-amber-500/30' 
                              : 'bg-[var(--bg-primary)] border-[var(--border-main)] hover:border-accent/20'
                          }`}
                        >
                          <div className="min-w-0">
                            <h4 className="text-[12px] font-black text-[var(--text-primary)] truncate max-w-xs sm:max-w-md font-sans">
                              {isRtl ? art.title_ar : art.title_en}
                            </h4>
                            <span className="text-[9px] font-mono text-gray-550 mt-1 block">
                              {isRtl ? art.category_ar : art.category_en} • id: {art.id}
                              {isCurrentlyEditing && (
                                <span className="ml-2 rtl:mr-2 text-amber-500 font-bold uppercase">
                                  ({isRtl ? 'قيد التعديل' : 'Editing'})
                                </span>
                              )}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* Edit Button with Emerald Glow pattern on hover */}
                            <button
                              onClick={() => startEditArticle(art)}
                              className={`p-1.5 transition-theme rounded-[4px] cursor-pointer ${
                                isCurrentlyEditing 
                                  ? 'text-amber-550 drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]' 
                                  : 'text-gray-400 hover:text-accent hover:'
                              }`}
                              title={isRtl ? 'تعديل المقال' : 'Edit Article'}
                            >
                              <Edit size={13} />
                            </button>
                            
                            {/* Delete Button */}
                            <button
                              onClick={() => handleDeleteArticle(art.id)}
                              className="p-1.5 text-gray-400 hover:text-rose-500 hover:drop-shadow-[0_0_8px_rgba(239,68,68,0.5)] transition-theme rounded-[4px] cursor-pointer"
                              title={isRtl ? 'حذف المقال' : 'Delete Article'}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 text-center select-none py-4 font-sans font-medium">{isRtl ? 'لا توجد مقالات منشورة بعد.' : 'No articles published yet.'}</p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="p-6 sm:p-8 rounded-lg border border-[var(--border-main)] bg-[var(--bg-secondary)] shadow-xl">
                <MarketplaceManagementView theme={theme || 'dark'} dir={isRtl ? 'rtl' : 'ltr'} />
              </div>
            </div>
          )}
        </div>
      </div>

      <ActionConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        description={confirmModal.description}
        variant={confirmModal.variant as 'danger' | 'success' | 'warning' | 'info'}
      />
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { ShieldCheck, Plus, BookOpen, MessageSquare, Trash2, Send, ArrowLeft, Image, Edit, FileText, ChevronRight, Upload, ShoppingBag, Monitor, Check, X, Clock, Settings, AlertTriangle } from 'lucide-react';
import { motion } from 'motion/react';
import { MarketplaceManagementView } from '../components/MarketplaceManagementView';
import { ActionConfirmationModal } from '../components/ActionConfirmationModal';
import { toast } from 'sonner';

interface Category {
  id: number;
  slug: string;
  name_en: string;
  name_ar: string;
  description_en: string;
  description_ar: string;
  icon?: string;
  color?: string;
  max_posts_per_day?: number;
  require_approval?: boolean;
  post_count: number;
}

interface PendingPost {
  id: number;
  category_id: number;
  user_id: number;
  title: string;
  content: string;
  category_name_en: string;
  category_name_ar: string;
  author_name?: string;
  author_avatar?: string | null;
  created_at: string;
  status: string;
}

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

  const [catSlug, setCatSlug] = useState('');
  const [catIcon, setCatIcon] = useState('MessageSquare');
  const [catColor, setCatColor] = useState('emerald');
  const [catMaxPosts, setCatMaxPosts] = useState<number>(0);
  const [catRequireApproval, setCatRequireApproval] = useState<boolean>(false);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);

  // Pending Posts state
  const [pendingPosts, setPendingPosts] = useState<PendingPost[]>([]);
  const [loadingPendingPosts, setLoadingPendingPosts] = useState(false);
  const [submittingPendingId, setSubmittingPendingId] = useState<number | null>(null);

  const fetchPendingPosts = async () => {
    if (!token) return;
    setLoadingPendingPosts(true);
    try {
      const res = await fetch('/api/forum/admin/pending-posts', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        setPendingPosts(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch pending posts:', err);
    } finally {
      setLoadingPendingPosts(false);
    }
  };

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
      if (token && activeTab === 'forum') {
        fetchPendingPosts();
      }
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
          image_url: blogImageUrl.trim()
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

  // Create or Update Category
  const handleCreateOrUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setCreatingCategory(true);

    const isEditing = editingCategoryId !== null;
    const url = isEditing ? `/api/forum/categories/${editingCategoryId}` : '/api/forum/categories';
    const method = isEditing ? 'PUT' : 'POST';

    // Auto slug derivation if empty
    const derivedSlug = catSlug.trim() || catNameEn.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          slug: derivedSlug,
          name_en: catNameEn.trim(),
          name_ar: catNameAr.trim(),
          description_en: catDescEn.trim(),
          description_ar: catDescAr.trim(),
          icon: catIcon,
          color: catColor,
          max_posts_per_day: Number(catMaxPosts),
          require_approval: catRequireApproval
        })
      });
      if (res.ok) {
        toast.success(
          language === 'ar' 
            ? (isEditing ? 'تم تحديث قسم المناقشة بنجاح!' : 'تم إنشاء قسم المناقشة بنجاح!') 
            : (isEditing ? 'Discussion zone updated successfully!' : 'Discussion zone created successfully!')
        );
        cancelEditCategory();
        refreshData();
      } else {
        const err = await res.json();
        toast.error(err.message || err.error || (language === 'ar' ? 'فشلت العملية' : 'Transaction failed'));
      }
    } catch (err) {
      console.error('Failed to submit category:', err);
      toast.error(language === 'ar' ? 'حدث خطأ غير متوقع بالاتصال بالخادم.' : 'Server connection error.');
    } finally {
      setCreatingCategory(false);
    }
  };

  const startEditCategory = (cat: Category) => {
    setEditingCategoryId(cat.id);
    setCatSlug(cat.slug);
    setCatNameEn(cat.name_en);
    setCatNameAr(cat.name_ar);
    setCatDescEn(cat.description_en || '');
    setCatDescAr(cat.description_ar || '');
    setCatIcon(cat.icon || 'MessageSquare');
    setCatColor(cat.color || 'emerald');
    setCatMaxPosts(cat.max_posts_per_day || 0);
    setCatRequireApproval(!!cat.require_approval);

    // Smooth scroll back to form
    const formSec = document.getElementById('forum-category-form-section');
    if (formSec) {
      formSec.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const cancelEditCategory = () => {
    setEditingCategoryId(null);
    setCatSlug('');
    setCatNameEn('');
    setCatNameAr('');
    setCatDescEn('');
    setCatDescAr('');
    setCatIcon('MessageSquare');
    setCatColor('emerald');
    setCatMaxPosts(0);
    setCatRequireApproval(false);
  };

  // Moderate Post (Approve/Reject pending forum posts)
  const handleModeratePost = async (id: number, status: 'approved' | 'rejected') => {
    if (!token) return;
    setSubmittingPendingId(id);
    try {
      const res = await fetch(`/api/forum/posts/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        toast.success(
          language === 'ar' 
            ? (status === 'approved' ? 'تم الموافقة على المنشور ونشره بنجاح في المنتدى!' : 'تم رفض نشر المنشور وتنبيه الكاتب.')
            : (status === 'approved' ? 'Post approved and fully published online!' : 'Post rejected and author notified.')
        );
        setPendingPosts(prev => prev.filter(p => p.id !== id));
        refreshData();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to moderate');
      }
    } catch (err) {
      console.error('Moderation error:', err);
      toast.error(language === 'ar' ? 'فشلت معالجة طلب الرقابة.' : 'Moderation control failed.');
    } finally {
      setSubmittingPendingId(null);
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

  // Delete Category (using Custom Confirmation Modal)
  const handleDeleteCategory = (id: number) => {
    openConfirm(
      'تأكيد حذف القسم', 'Confirm Category Deletion',
      'هل تود الحذف بالتأكيد؟ سيؤدي ذلك أيضاً إلى إتلاف كافة مواضيع هذا القسم.', 'Are you sure? This will delete all posts contained in this category.',
      async () => {
        if (!token) return;
        try {
          const res = await fetch(`/api/forum/categories/${id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (res.ok) {
            toast.success(language === 'ar' ? 'تم حذف القسم بنجاح!' : 'Category deleted successfully!');
            refreshData();
          } else {
            const err = await res.json();
            toast.error(err.message || err.error || (language === 'ar' ? 'فشل الحذف' : 'Failed to delete'));
          }
        } catch (err) {
          console.error('Failed to delete category:', err);
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
              {isRtl ? 'لوحة تحكم الأقسام' : 'Sections Dashboard'}
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
                <h2 className="text-sm font-black text-[var(--text-primary)] mb-6 flex items-center gap-4 border-b border-gray-100/5 pb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="text-emerald-500" size={18} />
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

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    {editingArticleId !== null && (
                      <button
                        type="button"
                        onClick={cancelEditArticle}
                        className="flex-1 sm:flex-initial flex items-center justify-center gap-2 h-11 px-6 rounded-sm border border-[var(--border-main)] text-gray-400 hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] text-xs font-bold transition-all duration-300 cursor-pointer"
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
                          : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:scale-[1.01] active:scale-[0.99]'
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
                              : 'bg-[var(--bg-primary)] border-[var(--border-main)] hover:border-emerald-500/20'
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
                              className={`p-1.5 transition-all duration-300 rounded-[4px] cursor-pointer ${
                                isCurrentlyEditing 
                                  ? 'text-amber-550 drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]' 
                                  : 'text-gray-400 hover:text-emerald-500 hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]'
                              }`}
                              title={isRtl ? 'تعديل المقال' : 'Edit Article'}
                            >
                              <Edit size={13} />
                            </button>
                            
                            {/* Delete Button */}
                            <button
                              onClick={() => handleDeleteArticle(art.id)}
                              className="p-1.5 text-gray-400 hover:text-rose-500 hover:drop-shadow-[0_0_8px_rgba(239,68,68,0.5)] transition-all duration-300 rounded-[4px] cursor-pointer"
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
          ) : activeTab === 'forum' ? (
            <div className="space-y-10 font-sans" dir={isRtl ? 'rtl' : 'ltr'}>
              
              {/* SECTION 1: POST APPROVAL MODERATION QUEUE */}
              <div className="bg-[var(--bg-secondary)] border border-[var(--border-main)] rounded-lg p-6 sm:p-8 select-none">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100/5 pb-4 mb-6">
                  <div>
                    <h2 className="text-sm font-black text-[var(--test-primary)] flex items-center gap-2">
                      <ShieldCheck className="text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]" size={18} />
                      {isRtl ? 'صندوق الرقابة والموافقة على المنشورات' : 'Security Moderation & Post Approvals'}
                    </h2>
                    <p className="text-[10px] text-gray-400 mt-1 font-bold">
                      {isRtl 
                        ? 'المنشورات المعلقة التي تتطلب مراجعة إدارية وتدقيقاً أمنياً قبل العرض العام' 
                        : 'Review pending articles and community threads before they are published globally'}
                    </p>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-1 rounded-[4px] bg-amber-500/10 text-amber-500 border border-amber-500/15">
                    {pendingPosts.length} {isRtl ? 'معلق' : 'PENDING'}
                  </span>
                </div>

                {loadingPendingPosts ? (
                  <div className="space-y-4">
                    <div className="h-20 bg-[var(--bg-base)] rounded-lg animate-pulse" />
                    <div className="h-20 bg-[var(--bg-base)] rounded-lg animate-pulse" />
                  </div>
                ) : pendingPosts.length > 0 ? (
                  <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
                    {pendingPosts.map(post => (
                      <div key={post.id} className="p-4 bg-[var(--bg-base)] border border-[var(--border-main)] rounded-lg hover:border-amber-500/20 transition-all duration-300">
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                          <div className="space-y-1 flex-1">
                            <span className="inline-block text-[8px] font-mono font-bold uppercase px-2 py-0.5 rounded-[3px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/15">
                              {isRtl ? post.category_name_ar : post.category_name_en}
                            </span>
                            <h4 className="text-[13px] font-black text-[var(--text-primary)] mt-1.5 leading-tight">{post.title}</h4>
                            <p className="text-[11px] text-gray-400 font-sans mt-2 line-clamp-2 leading-relaxed bg-[var(--bg-secondary)] p-2.5 rounded border border-gray-100/5 whitespace-pre-line" style={{ maxHeight: '100px', overflowY: 'auto' }}>
                              {post.content}
                            </p>
                            <div className="flex items-center gap-1.5 text-[9px] text-gray-500 font-mono pt-1">
                              <span className="text-gray-400 font-bold">{post.author_name || (isRtl ? 'مستخدم المنصة' : 'Platform User')}</span>
                              <span>•</span>
                              <span>ID: {post.id}</span>
                              <span>•</span>
                              <Clock size={10} className="text-gray-500 inline" />
                              <span>{new Date(post.created_at).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}</span>
                            </div>
                          </div>

                          <div className="flex sm:flex-col gap-2 shrink-0 self-end sm:self-center w-full sm:w-auto">
                            <button
                              disabled={submittingPendingId === post.id}
                              onClick={() => handleModeratePost(post.id, 'approved')}
                              className="flex-1 sm:flex-none h-9 px-4 rounded-[4px] bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white border border-emerald-500/20 text-[10px] font-black flex items-center justify-center gap-1.5 cursor-pointer hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.4)] transition-all duration-300"
                              title={isRtl ? 'موافقة ونشر الآن' : 'Approve & Publish'}
                            >
                              <Check size={12} />
                              <span>{isRtl ? 'موافقة ونشر' : 'Approve'}</span>
                            </button>
                            <button
                              disabled={submittingPendingId === post.id}
                              onClick={() => handleModeratePost(post.id, 'rejected')}
                              className="flex-1 sm:flex-none h-9 px-4 rounded-[4px] bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-500/20 text-[10px] font-black flex items-center justify-center gap-1.5 cursor-pointer hover:drop-shadow-[0_0_8px_rgba(239,68,68,0.4)] transition-all duration-300"
                              title={isRtl ? 'رفض الطلب وحذفه' : 'Reject & Delete'}
                            >
                              <X size={12} />
                              <span>{isRtl ? 'رفض وحظر' : 'Reject'}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-32 bg-[var(--bg-base)] border border-[var(--border-main)] border-dashed rounded-lg flex flex-col items-center justify-center text-center p-4">
                    <ShieldCheck size={28} className="text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.3)] mb-2" />
                    <p className="text-[11px] font-black text-emerald-500 uppercase tracking-widest">{isRtl ? 'صندوق الرقابة خالٍ بالكامل!' : 'Moderation Clear!'}</p>
                    <p className="text-[10px] text-gray-400 mt-1">{isRtl ? 'جميع المنشورات مراجعة وموافقة عليها بنجاح بموجب السياسات.' : 'All pending student and advisor community posts are approved.'}</p>
                  </div>
                )}
              </div>

              {/* GRID CONFIGURATION: FORM ON LEFT/RIGHT, CURRENT ON OTHER */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                
                {/* SECTION 2: CATEGORY FORM SECTION (SLUG, DAILY POST LIMIT, APPROVAL TOGGLE) */}
                <div id="forum-category-form-section" className="xl:col-span-5 bg-[var(--bg-secondary)] border border-[var(--border-main)] rounded-lg p-6 sm:p-8 scroll-mt-6">
                  <h2 className="text-sm font-black text-[var(--text-primary)] mb-6 flex items-center justify-between border-b border-gray-100/5 pb-3">
                    <div className="flex items-center gap-2">
                      <Settings className="text-emerald-500" size={18} />
                      {editingCategoryId !== null 
                        ? (isRtl ? 'تعديل هيكلية قسم المنتدى' : 'Modify Discussion Category')
                        : (isRtl ? 'إدراج قسم منتدى جديد' : 'Provision Discussion Category')
                      }
                    </div>
                    {editingCategoryId !== null && (
                      <span className="text-[8px] font-mono font-bold text-amber-500 bg-amber-500/10 border border-amber-500/15 px-2 py-0.5 rounded uppercase animate-pulse">
                        {isRtl ? 'تعديل نشط' : 'EDIT ACTIVE'}
                      </span>
                    )}
                  </h2>

                  <form onSubmit={handleCreateOrUpdateCategory} className="space-y-4">
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-mono uppercase text-gray-450 mb-1.5">{isRtl ? 'الرابط الفرعي (Slug - فريد ومقفل)' : 'Category Slug (Unique URL Segment)'}</label>
                        <input
                          type="text"
                          required
                          value={catSlug}
                          onChange={(e) => setCatSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                          placeholder="e.g. indicators-trading"
                          className="w-full h-10 bg-[var(--bg-base)] border border-[var(--border-main)] text-[var(--text-primary)] focus:border-emerald-500 rounded-sm px-3 text-xs font-mono"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-mono uppercase text-gray-450 mb-1.5">{isRtl ? 'الاسم بالإنجليزية' : 'Name (English)'}</label>
                          <input
                            type="text"
                            required
                            value={catNameEn}
                            onChange={(e) => setCatNameEn(e.target.value)}
                            placeholder="Indicators Desk"
                            className="w-full h-10 bg-[var(--bg-base)] border border-[var(--border-main)] text-[var(--text-primary)] focus:border-emerald-500 rounded-sm px-3 text-xs font-sans font-medium"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-mono uppercase text-gray-450 mb-1.5">{isRtl ? 'الاسم بالعربية' : 'Name (Arabic)'}</label>
                          <input
                            type="text"
                            required
                            value={catNameAr}
                            onChange={(e) => setCatNameAr(e.target.value)}
                            placeholder="قسم المؤشرات الفنية"
                            className="w-full h-10 bg-[var(--bg-base)] border border-[var(--border-main)] text-[var(--text-primary)] focus:border-emerald-500 rounded-sm px-3 text-xs font-sans font-medium"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-mono uppercase text-gray-450 mb-1.5">{isRtl ? 'أيقونة Lucide' : 'Lucide Icon Name'}</label>
                          <input
                            type="text"
                            value={catIcon}
                            onChange={(e) => setCatIcon(e.target.value)}
                            placeholder="e.g. Activity, MessageSquare"
                            className="w-full h-10 bg-[var(--bg-base)] border border-[var(--border-main)] text-[var(--text-primary)] focus:border-emerald-500 rounded-sm px-3 text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-mono uppercase text-gray-450 mb-1.5">{isRtl ? 'لون التصنيف السداسي' : 'Theme Color Class'}</label>
                          <select
                            value={catColor}
                            onChange={(e) => setCatColor(e.target.value)}
                            className="w-full h-10 bg-[var(--bg-base)] border border-[var(--border-main)] text-[var(--text-primary)] focus:border-emerald-500 rounded-sm px-3 text-xs font-sans"
                          >
                            <option value="emerald">Emerald Green</option>
                            <option value="indigo">Indigo Blue</option>
                            <option value="amber">Amber Gold</option>
                            <option value="rose">Rose Red</option>
                            <option value="purple">Royal Purple</option>
                            <option value="cyan">Cyan Aqua</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono uppercase text-gray-450 mb-1.5">{isRtl ? 'الوصف بالإنجليزية' : 'Description (English)'}</label>
                        <textarea
                          required
                          rows={2}
                          value={catDescEn}
                          onChange={(e) => setCatDescEn(e.target.value)}
                          placeholder="e.g. Focus area on high-value algorithmic scripts..."
                          className="w-full bg-[var(--bg-base)] border border-[var(--border-main)] text-[var(--text-primary)] focus:border-emerald-500 rounded-sm p-3 text-xs placeholder-gray-500 outline-none resize-none font-sans font-medium"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono uppercase text-gray-450 mb-1.5">{isRtl ? 'الوصف بالعربية' : 'Description (Arabic)'}</label>
                        <textarea
                          required
                          rows={2}
                          value={catDescAr}
                          onChange={(e) => setCatDescAr(e.target.value)}
                          placeholder="مثال: نقاشات مخصصة لبرامج وكميات التداول الكمي..."
                          className="w-full bg-[var(--bg-base)] border border-[var(--border-main)] text-[var(--text-primary)] focus:border-emerald-500 rounded-sm p-3 text-xs placeholder-gray-500 outline-none resize-none font-sans font-medium"
                        />
                      </div>

                      {/* ADVANCED ADMIN LIMIT CONSTRAINTS */}
                      <div className="bg-[var(--bg-base)] border border-[var(--border-main)] rounded-lg p-4 space-y-4">
                        <span className="block text-[10px] font-mono font-bold uppercase text-gray-400 border-b border-gray-100/5 pb-1.5">
                          {isRtl ? 'القيود الرقابية وسياسة النشر العادل' : 'Moderation & Quota Controls'}
                        </span>
                        
                        <div>
                          <label className="block text-[10px] font-mono uppercase text-gray-450 mb-1.5">
                            {isRtl ? 'أقصى حد نشر يومي بالقسم اليوم (0: مفتوح)' : 'Maximum Daily Posts Limit (0 for Unlimited)'}
                          </label>
                          <div className="flex items-center gap-3">
                            <input
                              type="number"
                              min={0}
                              value={catMaxPosts}
                              onChange={(e) => setCatMaxPosts(Math.max(0, parseInt(e.target.value) || 0))}
                              className="w-24 h-9 bg-[var(--bg-secondary)] border border-[var(--border-main)] text-[var(--text-primary)] focus:border-emerald-500 rounded-sm px-3 text-xs font-mono font-bold"
                            />
                            <span className="text-[10px] text-gray-450 font-sans">
                              {isRtl 
                                ? 'يحظر إيداع أي مواضيع جديدة بالقسم بعد بلوغ هذا العدد يومياً.' 
                                : 'Blocks any additional post once this category-wide threshold is met for the day.'}
                            </span>
                          </div>
                        </div>

                        <label className="flex items-center gap-3 select-none cursor-pointer">
                          <input
                            type="checkbox"
                            checked={catRequireApproval}
                            onChange={(e) => setCatRequireApproval(e.target.checked)}
                            className="w-4 h-4 rounded-[4px] bg-[var(--bg-secondary)] border-[var(--border-main)] text-emerald-500 focus:ring-emerald-500"
                          />
                          <div className="text-xs font-sans font-medium">
                            <span className="block font-bold text-[var(--text-primary)]">{isRtl ? 'موافقة الإدارة إجبارية قبل النشر' : 'Requires explicit admin approval'}</span>
                            <span className="block text-[9px] text-gray-450">{isRtl ? 'المنشورات الجديدة ستذهب فوراً لخانة الرقابة ولن تظهر للعامة إلا بموافقتك.' : 'Incoming stories flow to approval queue and stay hidden until validated by staff.'}</span>
                          </div>
                        </label>
                      </div>

                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      {editingCategoryId !== null && (
                        <button
                          type="button"
                          onClick={cancelEditCategory}
                          className="flex-1 h-10 px-4 border border-[var(--border-main)] rounded-sm text-gray-400 hover:text-[var(--text-primary)] font-bold text-xs cursor-pointer transition-colors duration-200"
                        >
                          {isRtl ? 'إلغاء' : 'Cancel'}
                        </button>
                      )}
                      <button
                        type="submit"
                        disabled={creatingCategory || !catNameEn.trim() || !catNameAr.trim()}
                        className={`flex-1 flex items-center justify-center gap-2 h-10 rounded-sm font-bold text-white text-xs cursor-pointer transition-all duration-300 ${
                          editingCategoryId !== null 
                            ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:scale-[1.01] active:scale-[0.99] hover:drop-shadow-[0_0_8px_rgba(245,158,11,0.3)]' 
                            : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:scale-[1.01] active:scale-[0.99] hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                        }`}
                      >
                        {creatingCategory ? (
                          <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>
                            {editingCategoryId !== null ? <Edit size={13} /> : <Plus size={13} />}
                            <span>
                              {editingCategoryId !== null 
                                ? (isRtl ? 'تحديث وتأكيد وحفظ التعديلات' : 'Commit Changes')
                                : (isRtl ? 'إنشاء وتجهيز قسم المناقشة' : 'Create Category')
                              }
                            </span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>

                {/* SECTION 3: CURRENT CATEGORIES LIST WITH ACTIONS (EDIT/DELETE) */}
                <div className="xl:col-span-7 bg-[var(--bg-secondary)] border border-[var(--border-main)] rounded-lg p-6 sm:p-8 select-none">
                  <h3 className="text-xs font-black uppercase tracking-tight text-[var(--text-primary)] mb-5 font-mono">
                    {isRtl ? 'إدارة أقسام المناقشة الحالية وقيودها' : 'Categories Directory & Controls'} ({categories.length})
                  </h3>

                  {loading ? (
                    <div className="h-32 bg-[var(--bg-base)] rounded-lg animate-pulse" />
                  ) : categories.length > 0 ? (
                    <div className="space-y-3">
                      {categories.map(cat => {
                        const isCatEditing = editingCategoryId === cat.id;
                        return (
                          <div 
                            key={cat.id} 
                            className={`p-4 border rounded-sm transition-all duration-300 ${
                              isCatEditing 
                                ? 'bg-amber-500/5 border-amber-500/30' 
                                : 'bg-[var(--bg-primary)] border-[var(--border-main)] hover:border-emerald-500/20'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0 space-y-1">
                                <h4 className="text-[13px] font-black text-[var(--text-primary)]">
                                  {isRtl ? cat.name_ar : cat.name_en}
                                </h4>
                                <p className="text-[10px] text-gray-450 line-clamp-2 leading-relaxed">
                                  {isRtl ? cat.description_ar : cat.description_en}
                                </p>
                                
                                {/* Meta Pill elements detailing controls in bilingual presentation */}
                                <div className="flex flex-wrap items-center gap-1.5 pt-2">
                                  <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded-[3px] bg-[var(--bg-secondary)] border border-gray-100/5 text-gray-400">
                                    slug: {cat.slug}
                                  </span>
                                  <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded-[3px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/15">
                                    {cat.post_count} {isRtl ? 'منشورات' : 'posts'}
                                  </span>
                                  {cat.max_posts_per_day && cat.max_posts_per_day > 0 ? (
                                    <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded-[3px] bg-amber-500/10 text-amber-500 border border-amber-500/15" title={isRtl ? 'الحد اليومي المتاح' : 'Daily post quota constraint'}>
                                      {isRtl ? 'الحد:' : 'Limit:'} {cat.max_posts_per_day}/{isRtl ? 'يوم' : 'day'}
                                    </span>
                                  ) : (
                                    <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded-[3px] bg-gray-500/10 text-gray-400 border border-gray-100/5">
                                      {isRtl ? 'الحد: مفتوح' : 'Limit: Unlimited'}
                                    </span>
                                  )}
                                  {cat.require_approval ? (
                                    <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded-[3px] bg-rose-500/10 text-rose-500 border border-rose-500/15 animate-pulse" title={isRtl ? 'مراجعة معلقة إلزامية' : 'Approval required'}>
                                      {isRtl ? 'تصفية إجبارية' : 'Moderated'}
                                    </span>
                                  ) : (
                                    <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded-[3px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/15">
                                      {isRtl ? 'نشر فوري' : 'Automated'}
                                    </span>
                                  )}
                                  {isCatEditing && (
                                    <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded-[3px] bg-amber-500/20 text-amber-500 uppercase">
                                      {isRtl ? 'يتم تعديله حالياً' : 'Editing State'}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                {/* Edit Category Structure triggers setting data to form state and scrolling */}
                                <button
                                  onClick={() => startEditCategory(cat)}
                                  className={`p-1.5 transition-all duration-300 rounded-[4px] cursor-pointer ${
                                    isCatEditing 
                                      ? 'text-amber-550 drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]' 
                                      : 'text-gray-400 hover:text-emerald-500 hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]'
                                  }`}
                                  title={isRtl ? 'تعديل سياسة وهيكلية القسم' : 'Modify Zone Rules & Structure'}
                                >
                                  <Edit size={13} />
                                </button>
                                
                                <button
                                  onClick={() => handleDeleteCategory(cat.id)}
                                  className="p-1.5 text-gray-400 hover:text-rose-500 hover:drop-shadow-[0_0_8px_rgba(239,68,68,0.5)] transition-all duration-300 rounded-[4px] cursor-pointer"
                                  title={isRtl ? 'حذف القسم ومواضيعه كاملاً' : 'Purge Category'}
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 text-center py-6 font-sans font-medium">{isRtl ? 'لا توجد أقسام متوفرة بموقع النقاش.' : 'No categories created yet.'}</p>
                  )}
                </div>

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

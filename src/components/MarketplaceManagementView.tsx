import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { 
  ShoppingBag, Check, X, Shield, Trash2, ExternalLink, Calendar, Search, Filter, Eye, AlertCircle,
  Edit, Award, Share2, Upload, AlertTriangle, Flame, Star, Sparkles, Gift, Scale, TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { ActionConfirmationModal } from './ActionConfirmationModal';

interface MarketplaceItem {
  id: number;
  user_id: number;
  title_en: string;
  title_ar: string;
  description_en: string;
  description_ar: string;
  price: number;
  category_en: string;
  category_ar: string;
  image_url?: string;
  status: string;
  views: number;
  contact_link?: string;
  seller_name: string;
  seller_avatar?: string;
  seller_role?: string;
  created_at: string;
  download_url?: string;
  preview_url?: string;
  video_url?: string;
  features?: string;
  technologies?: string;
  referral_percent?: number;
  highlight_tag?: string;
  license_type?: string;
}

const getHighlightDetails = (tag: string, className?: string) => {
  const norm = (tag || '').toLowerCase().trim();
  switch (norm) {
    case 'trending':
      return {
        labelAr: 'رائج',
        labelEn: 'Trending',
        colorClass: 'bg-orange-500/10 border-orange-500/20 text-orange-550 dark:text-orange-400',
        icon: <Flame className={className || "w-2.5 h-2.5"} strokeWidth={3} />
      };
    case 'exclusive':
      return {
        labelAr: 'عرض حصري',
        labelEn: 'Exclusive',
        colorClass: 'bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400',
        icon: <Star className={className || "w-2.5 h-2.5"} strokeWidth={3} />
      };
    case 'free':
      return {
        labelAr: 'مجاني',
        labelEn: 'Free / OSS',
        colorClass: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400',
        icon: <Gift className={className || "w-2.5 h-2.5"} strokeWidth={3} />
      };
    case 'best_seller':
    case 'bestseller':
      return {
        labelAr: 'الأكثر مبيعاً',
        labelEn: 'Best Seller',
        colorClass: 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400',
        icon: <TrendingUp className={className || "w-2.5 h-2.5"} strokeWidth={3} />
      };
    case 'new':
      return {
        labelAr: 'جديد',
        labelEn: 'New',
        colorClass: 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400',
        icon: <Sparkles className={className || "w-2.5 h-2.5"} strokeWidth={3} />
      };
    case 'featured':
      return {
        labelAr: 'مميز',
        labelEn: 'Featured',
        colorClass: 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-500',
        icon: <Award className={className || "w-2.5 h-2.5"} strokeWidth={3} />
      };
    default:
      return null;
  }
};

const getLicenseName = (type: string, isAr: boolean) => {
  const norm = (type || '').toLowerCase().trim();
  switch (norm) {
    case 'mit':
      return isAr ? 'رخصة MIT برمجية' : 'MIT License';
    case 'apache_2':
    case 'apache_2.0':
    case 'apache2':
    case 'apache':
      return 'Apache 2.0';
    case 'gpl_3':
    case 'gpl3':
    case 'gpl':
      return 'GNU GPL v3';
    case 'bsd_3':
    case 'bsd3':
    case 'bsd':
      return 'BSD 3-Clause';
    case 'cc_by_sa':
    case 'cc_by':
    case 'cc':
      return 'CC BY-SA 4.0';
    case 'commercial_extended':
      return isAr ? 'تجاري ممتد (Extended)' : 'Commercial Extended';
    case 'commercial_standard':
    default:
      return isAr ? 'تجاري قياسي (Standard)' : 'Commercial Standard';
  }
};

interface ParentCategory {
  id: string;
  nAr: string;
  nEn: string;
  ic: string;
  co: string;
}

interface ChildCategory {
  id: string;
  parent: string;
  nAr: string;
  nEn: string;
  ic: string;
  co: string;
}

const parents: ParentCategory[] = [
  { id: 'code', nAr: 'الأكواد والبرمجيات', nEn: 'SaaS & Development', ic: 'code', co: '#10b981' },
  { id: 'fintech', nAr: 'إستراتيجيات التداول', nEn: 'Algo Trading', ic: 'trading-bots', co: '#f59e0b' },
  { id: 'ui', nAr: 'الواجهات والتطوير', nEn: 'UI & Design', ic: 'templates', co: '#ec4899' },
  { id: 'bundles', nAr: 'الحزم الكاملة', nEn: 'Tech Bundles', ic: 'startup-box', co: '#8b5cf6' },
  { id: 'digital', nAr: 'المنتجات الرقمية', nEn: 'Digital Goods', ic: 'ebooks', co: '#14b8a6' },
  { id: 'free', nAr: 'المنتجات المجانية والمفتوحة', nEn: 'Free & Open Source', ic: 'free', co: '#10b981' }
];

const children: ChildCategory[] = [
  { id: 'saas', parent: 'code', nAr: 'أنظمة SaaS', nEn: 'SaaS Systems', ic: 'saas', co: '#10b981' },
  { id: 'mobile', parent: 'code', nAr: 'تطبيقات الجوال', nEn: 'Mobile Apps', ic: 'mobile', co: '#06b6d4' },
  { id: 'plugins', parent: 'code', nAr: 'إضافات الأنظمة', nEn: 'System Plugins', ic: 'plugins', co: '#6366f1' },
  { id: 'ai-agents', parent: 'code', nAr: 'AI & أتمتة', nEn: 'AI & Automation', ic: 'ai-agents', co: '#f43f5e' },
  { id: 'trading-bots', parent: 'fintech', nAr: 'بوتات التداول', nEn: 'Trading Bots', ic: 'trading-bots', co: '#f59e0b' },
  { id: 'indicators', parent: 'fintech', nAr: 'مؤشرات فنية', nEn: 'Technical Indicators', ic: 'indicators', co: '#eab308' },
  { id: 'templates', parent: 'ui', nAr: 'قوالب ومواقع', nEn: 'Templates & Sites', ic: 'templates', co: '#ec4899' },
  { id: 'figma', parent: 'ui', nAr: 'ملفات Figma', nEn: 'Figma Files', ic: 'figma', co: '#a855f7' },
  { id: 'startup-box', parent: 'bundles', nAr: 'Startup-in-a-Box', nEn: 'Startup-in-a-Box', ic: 'startup-box', co: '#8b5cf6' },
  { id: 'marketing-kits', parent: 'bundles', nAr: 'أكياس تسويقية', nEn: 'Marketing Kits', ic: 'marketing-kits', co: '#f97316' },
  { id: 'game-bundles', parent: 'bundles', nAr: 'حزم ألعاب', nEn: 'Game Bundles', ic: 'game-bundles', co: '#ef4444' }
];

export const MarketplaceManagementView: React.FC<{ theme: string; t: any; dir: string }> = ({ theme, t, dir }) => {
  const { token, language } = useAppContext();
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [actioningId, setActioningId] = useState<number | null>(null);

  // Reusable confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: { ar: string; en: string };
    description: { ar: string; en: string };
    onConfirm: () => Promise<void> | void;
    variant: 'danger' | 'success' | 'warning' | 'info' | 'purple';
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
    variant: 'danger' | 'success' | 'warning' | 'info' | 'purple' = 'danger'
  ) => {
    setConfirmModal({
      isOpen: true,
      title: { ar: titleAr, en: titleEn },
      description: { ar: descAr, en: descEn },
      onConfirm: onConfirmAction,
      variant
    });
  };

  // Editing logic states
  const [editingItem, setEditingItem] = useState<MarketplaceItem | null>(null);
  const [editTitleAr, setEditTitleAr] = useState('');
  const [editTitleEn, setEditTitleEn] = useState('');
  const [editDescAr, setEditDescAr] = useState('');
  const [editDescEn, setEditDescEn] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editDiscount, setEditDiscount] = useState('0');
  const [editCategorySelect, setEditCategorySelect] = useState('saas');
  const [editImage, setEditImage] = useState('');
  const [editContact, setEditContact] = useState('');
  const [editLinkDownload, setEditLinkDownload] = useState('');
  const [editLinkPreview, setEditLinkPreview] = useState('');
  const [editLinkVideo, setEditLinkVideo] = useState('');
  const [editFeatures, setEditFeatures] = useState('');
  const [editTools, setEditTools] = useState('');
  const [editReferralPercent, setEditReferralPercent] = useState('20');
  const [editHighlightTag, setEditHighlightTag] = useState('');
  const [editLicenseType, setEditLicenseType] = useState('mit');
  const [updating, setUpdating] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setUploadError('');

    const uploadRawFile = async (rawFile: File) => {
      const formData = new FormData();
      formData.append('file', rawFile);
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
            setEditImage(`/uploads/${data.file.file_url}`);
            setUploadError('');
          } else {
            setUploadError(language === 'ar' ? 'فشل إدراج الصورة.' : 'Upload failed.');
          }
        } else {
          try {
            const errData = await res.json();
            const serverMsg = language === 'ar' 
              ? (errData.message_ar || errData.error || 'فشل في رفع الصورة') 
              : (errData.message_en || errData.details || errData.error || 'Failed uploading image');
            setUploadError(serverMsg);
          } catch {
            setUploadError(language === 'ar' ? 'فشل في رفع الصورة' : 'Failed uploading image');
          }
        }
      } catch (err) {
        console.error(err);
        setUploadError(language === 'ar' ? 'خطأ في الاتصال بالخادم.' : 'Server network error.');
      } finally {
        setUploadingImage(false);
      }
    };

    const reader = new FileReader();
    reader.onerror = () => {
      uploadRawFile(file);
    };
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => {
        uploadRawFile(file);
      };
      img.onload = () => {
        try {
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
                uploadRawFile(file);
                return;
              }

              const baseName = file.name.replace(/\.[^/.]+$/, "");
              const croppedFile = new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' });
              uploadRawFile(croppedFile);
            }, 'image/jpeg', 0.9);
          } else {
            uploadRawFile(file);
          }
        } catch (err) {
          console.error('[Crop Fail]', err);
          uploadRawFile(file);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleStartEdit = (item: MarketplaceItem) => {
    setEditingItem(item);
    setEditTitleAr(item.title_ar || '');
    setEditTitleEn(item.title_en || '');
    setEditDescAr(item.description_ar || '');
    setEditDescEn(item.description_en || '');
    setEditPrice(item.price ? item.price.toString() : '');
    setEditDiscount('0');
    
    // Find child category
    const matchingChild = children.find(c => c.nEn === item.category_en || c.nAr === item.category_ar);
    setEditCategorySelect(matchingChild ? matchingChild.id : 'saas');
    
    setEditImage(item.image_url || '');
    setEditContact(item.contact_link || '');
    setEditLinkDownload(item.download_url || '');
    setEditLinkPreview(item.preview_url || '');
    setEditLinkVideo(item.video_url || '');
    setEditFeatures(item.features || '');
    setEditTools(item.technologies || '');
    setEditReferralPercent(item.referral_percent !== undefined && item.referral_percent !== null ? item.referral_percent.toString() : '20');
    setEditHighlightTag(item.highlight_tag || '');
    setEditLicenseType(item.license_type || 'mit');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    setUpdating(true);

    const catObj = children.find(c => c.id === editCategorySelect) || children[0];
    
    try {
      const parsedPrice = parseFloat(editPrice) || 0;
      const discountPct = parseFloat(editDiscount) || 0;
      const finalPrice = parsedPrice - (parsedPrice * (discountPct / 100));

      const url = `/api/marketplace/items/${editingItem.id}`;
      const method = 'PATCH';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title_ar: editTitleAr,
          title_en: editTitleEn,
          description_ar: editDescAr,
          description_en: editDescEn,
          price: finalPrice,
          category_en: catObj.nEn,
          category_ar: catObj.nAr,
          image_url: editImage,
          contact_link: null,
          download_url: editLinkDownload || null,
          preview_url: editLinkPreview || null,
          video_url: editLinkVideo || null,
          features: editFeatures || null,
          technologies: editTools || null,
          referral_percent: editReferralPercent ? parseFloat(editReferralPercent) : 20,
          highlight_tag: editHighlightTag || null,
          license_type: editLicenseType || 'mit'
        })
      });

      if (res.ok) {
        toast.success(language === 'ar' ? 'تم حفظ وتزامن المنتج بنجاح مع قاعدة البيانات' : 'Product successfully saved and synchronized with database');
        setEditingItem(null);
        fetchAllItems();
      } else {
        const errData = await res.json();
        toast.error(errData.error || (language === 'ar' ? 'فشل حفظ وتزامن المنتج' : 'Failed to save product'));
      }
    } catch (err) {
      console.error('Update item failed:', err);
      toast.error(language === 'ar' ? 'حدث خطأ غير متوقع' : 'An unexpected error occurred');
    } finally {
      setUpdating(false);
    }
  };

  const fetchAllItems = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/marketplace/admin/items', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      }
    } catch (err) {
      console.error('Failed to fetch admin marketplace items:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllItems();
  }, [token]);

  const handleUpdateStatus = async (id: number, newStatus: string) => {
    setActioningId(id);
    try {
      const res = await fetch(`/api/marketplace/admin/items/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (res.ok) {
        setItems(prev => prev.map(item => item.id === id ? { ...item, status: newStatus } : item));
        
        let msg = language === 'ar' ? 'تم تحديث الحالة بنجاح' : 'Status updated successfully';
        if (newStatus === 'approved') {
          msg = language === 'ar' ? 'تم الموافقة على المعروض ونشره رسمياً في الماركت بليس بجودة عالية!' : 'Asset approved and officially published on the marketplace!';
        } else if (newStatus === 'rejected') {
          msg = language === 'ar' ? 'تم رفض إدراج هذا المعروض بنجاح.' : 'Offer listing rejected successfully.';
        } else if (newStatus === 'sold') {
          msg = language === 'ar' ? 'تم تحديد هذا المعروض كمباع بنجاح!' : 'Asset successfully marked as sold!';
        }
        toast.success(msg);
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setActioningId(null);
    }
  };

  const handleDeleteItem = (id: number) => {
    openConfirm(
      'تأكيد حذف المعروض', 'Confirm Listing Deletion',
      'هل أنت متأكد من حذف هذا المعروض نهائياً؟ لا يمكن التراجع عن هذا الإجراء وسيتم إزالته من الماركت بليس للجميع.', 'Are you sure you want to permanently delete this listing? This action cannot be undone and will remove it from the marketplace for everyone.',
      async () => {
        setActioningId(id);
        try {
          const res = await fetch(`/api/marketplace/items/${id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (res.ok) {
            setItems(prev => prev.filter(item => item.id !== id));
            toast.success(language === 'ar' ? 'تم حذف المعروض بنجاح!' : 'Listing deleted successfully!');
          } else {
            const errData = await res.json();
            toast.error(errData.error || (language === 'ar' ? 'فشل الحذف' : 'Deletion failure'));
          }
        } catch (err) {
          console.error('Failed to delete item:', err);
          toast.error(language === 'ar' ? 'حدث خطأ غير متوقع بالاتصال بالخادم.' : 'An unexpected server error occurred.');
        } finally {
          setActioningId(null);
        }
      },
      'danger'
    );
  };

  const filteredItems = items.filter(item => {
    const title = language === 'ar' ? item.title_ar : item.title_en;
    const desc = language === 'ar' ? item.description_ar : item.description_en;
    const seller = item.seller_name;

    const matchesSearch = title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          desc.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          seller.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'All' || item.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      
      {/* Overview stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-sm border border-[var(--border)] bg-[var(--bg-surface)]">
          <div className="text-xs font-medium text-gray-500 mb-1">
            {language === 'ar' ? 'إجمالي المعروضات' : 'Total Listings'}
          </div>
          <div className="text-2xl font-black text-[var(--text-primary)] font-mono">{items.length}</div>
        </div>
        <div className="p-4 rounded-sm border border-[var(--border)] bg-[var(--bg-surface)]">
          <div className="text-xs font-medium text-gray-500 mb-1">
            {language === 'ar' ? 'بانتظار الموافقة' : 'Pending Approvals'}
          </div>
          <div className="text-2xl font-black text-amber-500 font-mono">
            {items.filter(i => i.status === 'pending').length}
          </div>
        </div>
        <div className="p-4 rounded-sm border border-[var(--border)] bg-[var(--bg-surface)]">
          <div className="text-xs font-medium text-gray-500 mb-1">
            {language === 'ar' ? 'المعروضات النشطة' : 'Active Offerings'}
          </div>
          <div className="text-2xl font-black text-emerald-500 font-mono">
            {items.filter(i => i.status === 'approved').length}
          </div>
        </div>
        <div className="p-4 rounded-sm border border-[var(--border)] bg-[var(--bg-surface)] font-mono">
          <div className="text-xs font-medium text-gray-500 mb-1">
            {language === 'ar' ? 'المنتجات المباعة' : 'Assets Sold'}
          </div>
          <div className="text-2xl font-black text-blue-500">
            {items.filter(i => i.status === 'sold').length}
          </div>
        </div>
      </div>

      {/* Control Toolbar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder={language === 'ar' ? 'البحث عن معروضات بالاسم أو البائع...' : 'Search listings by name or seller...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-10 pl-9 pr-4 bg-[var(--bg-surface)] border border-[var(--border)] rounded-sm outline-none text-xs text-[var(--text-primary)]"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {['All', 'pending', 'approved', 'rejected', 'sold'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`h-8 px-3 rounded-sm text-[11px] font-bold whitespace-nowrap transition-all duration-300 ${
                statusFilter === status
                  ? 'text-emerald-500 bg-emerald-500/5 border border-emerald-500/20'
                  : 'text-gray-400 hover:text-[var(--text-primary)] bg-[var(--bg-surface)] border border-[var(--border)]'
              }`}
            >
              {status === 'All' ? (language === 'ar' ? 'جميع الحالات' : 'All States') : status.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Listings Table */}
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center space-y-2">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-gray-400">{language === 'ar' ? 'جاري تحميل المعروضات...' : 'Loading listings...'}</span>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="py-12 border border-dashed border-[var(--border)] rounded-lg flex flex-col items-center justify-center text-gray-400">
          <ShoppingBag size={24} className="mb-2 opacity-30" />
          <span className="text-xs">{language === 'ar' ? 'لا توجد منتجات معروضة حالياً' : 'No listings currently listed'}</span>
        </div>
      ) : (
        <div className="overflow-x-auto border border-[var(--border)] rounded-lg bg-[var(--bg-surface)]">
          <table className="w-full border-collapse text-left" dir={dir}>
            <thead>
              <tr className="border-b border-[var(--border)] bg-gray-500/5 text-[10px] uppercase font-black tracking-wider text-gray-400">
                <th className="px-5 py-3.5">{language === 'ar' ? 'العرض' : 'Asset Detail'}</th>
                <th className="px-5 py-3.5">{language === 'ar' ? 'البائع' : 'Seller'}</th>
                <th className="px-5 py-3.5">{language === 'ar' ? 'السعر / الفئة' : 'Price & Category'}</th>
                <th className="px-5 py-3.5">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                <th className="px-5 py-3.5">{language === 'ar' ? 'المشاهدات' : 'Views'}</th>
                <th className="px-5 py-3.5 text-right">{language === 'ar' ? 'الإجراءات الإدارية' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] text-xs">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-500/5 transition-colors">
                  {/* Title and Image preview */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-md overflow-hidden bg-black border border-[var(--border)] shrink-0">
                        <img src={item.image_url ? item.image_url.split(',')[0].trim() : 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1080&h=1080&fit=crop'} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                      <div className="space-y-0.5">
                        <div className="font-bold text-[var(--text-primary)]">
                          {language === 'ar' ? item.title_ar : item.title_en}
                        </div>
                        <div className="text-[10px] text-gray-500 line-clamp-1 max-w-xs leading-normal">
                          {language === 'ar' ? item.description_ar : item.description_en}
                        </div>
                        <div className="text-[9px] text-gray-500/70 font-mono">
                          Listed at: {new Date(item.created_at).toLocaleDateString()}
                        </div>
                        
                        {/* Live highlights and license information */}
                        <div className="flex flex-wrap items-center gap-1 mt-1 select-none">
                          {item.highlight_tag && (() => {
                            const details = getHighlightDetails(item.highlight_tag);
                            if (!details) return null;
                            return (
                              <span className={`px-1.5 py-0.5 rounded-[3px] border text-[8px] font-black flex items-center gap-0.5 shrink-0 ${details.colorClass}`}>
                                {details.icon}
                                <span>{language === 'ar' ? details.labelAr : details.labelEn}</span>
                              </span>
                            );
                          })()}
                          <span className="px-1.5 py-0.5 rounded-[3px] border text-[8px] font-black flex items-center gap-0.5 shrink-0 bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                            <Scale size={8} strokeWidth={3} />
                            <span>{getLicenseName(item.license_type || 'commercial_standard', language === 'ar')}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Seller info */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      {item.seller_avatar ? (
                        <img src={item.seller_avatar} className="w-6 h-6 rounded-full object-cover" alt="" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-[10px]">
                          {item.seller_name.charAt(0)}
                        </div>
                      )}
                      <div className="space-y-0.5">
                        <span className="font-bold text-[var(--text-primary)] ">{item.seller_name}</span>
                        {item.seller_role && (
                          <span className="block text-[8px] uppercase tracking-wider font-extrabold text-emerald-500">{item.seller_role}</span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Price and Category */}
                  <td className="px-5 py-4 font-mono">
                    <div className="font-extrabold text-emerald-500">${parseFloat(item.price.toString()).toLocaleString()}</div>
                    <div className="text-[10px] text-gray-500 font-sans mt-0.5">
                      {language === 'ar' ? item.category_ar : item.category_en}
                    </div>
                  </td>

                  {/* Rich Status badge */}
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-[4px] text-[10px] font-bold ${
                      item.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                      item.status === 'pending' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                      item.status === 'rejected' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                      'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                    }`}>
                      {item.status.toUpperCase()}
                    </span>
                  </td>

                  {/* Views counter */}
                  <td className="px-5 py-4 font-mono text-gray-500">
                    <div className="flex items-center gap-1">
                      <Eye size={12} />
                      <span>{item.views || 0}</span>
                    </div>
                  </td>

                  {/* Control / Management Actions */}
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {item.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleUpdateStatus(item.id, 'approved')}
                            disabled={actioningId === item.id}
                            className="p-1.5 h-8 w-8 rounded-[4px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500 hover:text-black transition-all duration-300"
                            title={language === 'ar' ? 'موافقة ونشر' : 'Approve & List'}
                          >
                            <Check size={14} className="mx-auto" />
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(item.id, 'rejected')}
                            disabled={actioningId === item.id}
                            className="p-1.5 h-8 w-8 rounded-[4px] bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all duration-300"
                            title={language === 'ar' ? 'رفض' : 'Reject'}
                          >
                            <X size={14} className="mx-auto" />
                          </button>
                        </>
                      )}

                      {item.status === 'approved' && (
                        <button
                          onClick={() => handleUpdateStatus(item.id, 'sold')}
                          disabled={actioningId === item.id}
                          className="h-8 px-2.5 rounded-[4px] bg-blue-500/10 text-blue-500 border border-blue-500/20 hover:bg-blue-500 hover:text-white text-[10px] font-bold transition-all duration-300 animate-pulse"
                        >
                          {language === 'ar' ? 'تعليم كمباع' : 'Mark Sold'}
                        </button>
                      )}

                      {item.status === 'sold' && (
                        <button
                          onClick={() => handleUpdateStatus(item.id, 'approved')}
                          disabled={actioningId === item.id}
                          className="h-8 px-2.5 rounded-[4px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500 hover:text-black text-[10px] font-bold transition-all duration-300"
                        >
                          {language === 'ar' ? 'إعادة عرض' : 'Re-List'}
                        </button>
                      )}

                      <button
                        onClick={() => handleStartEdit(item)}
                        disabled={actioningId === item.id}
                        className="p-1.5 h-8 w-8 rounded-[4px] bg-transparent hover:bg-emerald-500/10 text-gray-400 hover:text-emerald-500 transition-all duration-300 border border-transparent"
                        title={language === 'ar' ? 'تعديل المعروض' : 'Edit listing'}
                      >
                        <Edit size={14} className="mx-auto" />
                      </button>

                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        disabled={actioningId === item.id}
                        className="p-1.5 h-8 w-8 rounded-[4px] bg-transparent hover:bg-red-500/10 text-gray-400 hover:text-red-500 transition-all duration-300 border border-transparent"
                        title={language === 'ar' ? 'حذف المعروض' : 'Delete listing'}
                      >
                        <Trash2 size={14} className="mx-auto" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Listing Modal Overlay */}
      <AnimatePresence>
        {editingItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              transition={{ duration: 0.3 }}
              className={`relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-[4px] border p-6 ${
                theme === 'dark' ? 'bg-[#0f0f11] border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-900'
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b pb-4 mb-5 border-gray-800">
                <div className="flex items-center gap-2">
                  <Edit size={16} className="text-emerald-500 font-black glow-icon" />
                  <h3 className="text-sm font-black tracking-wider uppercase">
                    {language === 'ar' ? 'تعديل بيانات المعروض' : 'Edit Marketplace Asset'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-[4px] bg-transparent hover:bg-red-500/10 text-gray-400 hover:text-red-500 transition-all duration-300"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Form body */}
              <form onSubmit={handleSaveEdit} className="space-y-4 text-right" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                {/* Titles */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">
                      {language === 'ar' ? 'اسم المعروض (بالعربية) *' : 'Asset Title (Arabic) *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={editTitleAr}
                      onChange={(e) => setEditTitleAr(e.target.value)}
                      placeholder="الأكواد والربط البرمجي ERPv4"
                      className={`w-full h-10 px-3 border rounded-[4px] outline-none text-xs text-right ${
                        theme === 'dark' ? 'bg-black/40 border-white/5 focus:border-emerald-500/35 text-white' : 'bg-white border-gray-250 focus:border-emerald-500/35 text-gray-900'
                      }`}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">
                      {language === 'ar' ? 'اسم المعروض (بالإنجليزية) *' : 'English Title *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={editTitleEn}
                      onChange={(e) => setEditTitleEn(e.target.value)}
                      placeholder="ERP Integration Suite v4"
                      className={`w-full h-10 px-3 border rounded-[4px] outline-none text-xs text-left ${
                        theme === 'dark' ? 'bg-black/40 border-white/5 focus:border-emerald-500/35 text-white' : 'bg-white border-gray-250 focus:border-emerald-500/35 text-gray-900'
                      }`}
                    />
                  </div>
                </div>

                {/* Category & Pricing */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">
                      {language === 'ar' ? 'التصنيف الرئيسي *' : 'Main Category *'}
                    </label>
                    <select
                      value={editCategorySelect}
                      onChange={(e) => setEditCategorySelect(e.target.value)}
                      className={`w-full h-10 px-3 border rounded-[4px] outline-none text-xs ${
                        theme === 'dark' ? 'bg-black/40 border-white/5 focus:border-emerald-500/35 text-white' : 'bg-white border-gray-250 focus:border-emerald-500/35 text-gray-900'
                      }`}
                    >
                      {parents.map(p => (
                        <optgroup key={p.id} label={language === 'ar' ? p.nAr : p.nEn}>
                          {children.filter(c => c.parent === p.id).map(c => (
                            <option key={c.id} value={c.id}>
                              {language === 'ar' ? c.nAr : c.nEn}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">
                        {language === 'ar' ? 'السعر ($) *' : 'Price ($) *'}
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={editPrice}
                        onChange={(e) => setEditPrice(e.target.value)}
                        placeholder="99"
                        className={`w-full h-10 px-2 border rounded-[4px] outline-none text-xs text-center ${
                          theme === 'dark' ? 'bg-black/40 border-white/5 focus:border-emerald-500/30 text-white' : 'bg-white border-gray-250 focus:border-emerald-500/30 text-gray-900'
                        }`}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">
                        {language === 'ar' ? 'الخصم (%)' : 'Discount (%)'}
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="99"
                        value={editDiscount}
                        onChange={(e) => setEditDiscount(e.target.value)}
                        placeholder="0"
                        className={`w-full h-10 px-2 border rounded-[4px] outline-none text-xs text-center ${
                          theme === 'dark' ? 'bg-black/40 border-white/5 focus:border-emerald-500/30 text-white' : 'bg-white border-gray-250 focus:border-emerald-500/30 text-gray-900'
                        }`}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">
                        {language === 'ar' ? 'النهائي' : 'Final'}
                      </label>
                      <div className={`w-full h-10 border rounded-[4px] text-xs font-black flex items-center justify-center text-emerald-400 select-none ${
                        theme === 'dark' ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-emerald-50/20 border-emerald-500/10'
                      }`}>
                        ${Math.round((Number(editPrice) || 0) * (1 - (Number(editDiscount) || 0) / 100))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Affiliate & Referral Configuration */}
                <div className={`p-4 border rounded-[4px] space-y-3 ${
                  theme === 'dark' ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-emerald-50/10 border-emerald-500/10'
                }`}>
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-emerald-400 select-none flex items-center gap-1.5 drop-shadow-[0_0_6px_rgba(16,185,129,0.3)]">
                      <Share2 size={13} />
                      <span>{language === 'ar' ? 'نظام التسويق بالعمولة (الإحالة)' : 'Affiliate & Referral Settings'}</span>
                    </h4>
                    <span className="text-[9px] text-gray-400 font-bold">
                      {language === 'ar' ? '* عمولة مخصصة لهذا المنتج بالتحديد' : '* Custom commission for this specific asset'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">
                        {language === 'ar' ? 'نسبة عمولة الإحالة (%)' : 'Referral Commission Rate (%)'}
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={editReferralPercent}
                          onChange={(e) => setEditReferralPercent(e.target.value)}
                          placeholder="20"
                          className={`w-full h-10 pl-3 pr-8 border rounded-[4px] outline-none text-xs text-left ${
                            theme === 'dark' ? 'bg-black/40 border-white/5 focus:border-emerald-500/35 text-white' : 'bg-white border-gray-250 focus:border-emerald-500/35 text-gray-900'
                          }`}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-gray-400 select-none">%</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">
                        {language === 'ar' ? 'قيمة عمولة المنتج لكل عملية بيع' : 'Referral Commission Value'}
                      </label>
                      <div className={`w-full h-10 border rounded-[4px] text-xs font-black flex items-center justify-center text-emerald-400 select-none ${
                        theme === 'dark' ? 'bg-black/60 border-white/5' : 'bg-gray-50 border-gray-200'
                      }`}>
                        ${Math.round((Number(editPrice) || 0) * (1 - (Number(editDiscount) || 0) / 100) * (Number(editReferralPercent) || 0) / 100 * 100) / 100}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Highlights and Licensing Setup */}
                <div className={`p-4 border rounded-[4px] space-y-3 ${
                  theme === 'dark' ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-emerald-50/10 border-emerald-500/10'
                }`}>
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-emerald-400 select-none flex items-center gap-1.5 drop-shadow-[0_0_6px_rgba(16,185,129,0.3)]">
                      <Award size={13} />
                      <span>{language === 'ar' ? 'التمييز وتراخيص الاستخدام' : 'Highlight Tag & License Type'}</span>
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Highlight Tag */}
                    <div className="space-y-1">
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">
                        {language === 'ar' ? 'تمييز المعروض (شارة)' : 'Highlight/Featured Tag'}
                      </label>
                      <select
                        value={editHighlightTag}
                        onChange={(e) => setEditHighlightTag(e.target.value)}
                        className={`w-full h-10 px-3 border rounded-[4px] outline-none text-xs ${
                          theme === 'dark' ? 'bg-black/40 border-white/5 focus:border-emerald-500/35 text-white' : 'bg-white border-gray-250 focus:border-emerald-500/35 text-gray-900'
                        }`}
                      >
                        <option value="">{language === 'ar' ? 'بدون تمييز' : 'No Highlight'}</option>
                        <option value="trending">{language === 'ar' ? 'رائج' : 'Trending'}</option>
                        <option value="exclusive">{language === 'ar' ? 'عرض حصري' : 'Exclusive Offer'}</option>
                        <option value="free">{language === 'ar' ? 'مجاني' : 'Free'}</option>
                        <option value="best_seller">{language === 'ar' ? 'الأكثر مبيعاً' : 'Best Seller'}</option>
                        <option value="new">{language === 'ar' ? 'جديد' : 'New'}</option>
                      </select>
                    </div>

                    {/* License Type */}
                    <div className="space-y-1">
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">
                        {language === 'ar' ? 'نوع ترخيص الملكية الفكرية' : 'Intellectual Property License'}
                      </label>
                      <select
                        value={editLicenseType}
                        onChange={(e) => setEditLicenseType(e.target.value)}
                        className={`w-full h-10 px-3 border rounded-[4px] outline-none text-xs ${
                          theme === 'dark' ? 'bg-black/40 border-white/5 focus:border-emerald-500/35 text-white' : 'bg-white border-gray-250 focus:border-emerald-500/35 text-gray-900'
                        }`}
                      >
                        <option value="mit">MIT License</option>
                        <option value="apache_2">Apache 2.0</option>
                        <option value="gpl_3">GNU GPL v3</option>
                        <option value="bsd_3">BSD 3-Clause</option>
                        <option value="cc_by_sa">Creative Commons BY-SA 4.0</option>
                        <option value="commercial_standard">{language === 'ar' ? 'تجاري قياسي' : 'Proprietary Commercial Standard'}</option>
                        <option value="commercial_extended">{language === 'ar' ? 'تجاري ممتد / مكرر' : 'Proprietary Commercial Extended'}</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Cover image selector and URLs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">
                      {language === 'ar' ? 'غلاف المعرض (صورة العرض) *' : 'Asset Image / Photo Cover URL *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={editImage || ''}
                      onChange={(e) => setEditImage(e.target.value)}
                      placeholder="https://images.unsplash.com/photo-..."
                      className={`w-full h-10 px-3 border rounded-[4px] outline-none text-xs mb-1.5 ${
                        theme === 'dark' ? 'bg-black/40 border-white/5 focus:border-emerald-500/35 text-white' : 'bg-white border-gray-250 focus:border-emerald-500/35 text-gray-900'
                      }`}
                    />

                    <label className={`flex flex-col items-center justify-center w-full h-20 border-2 border-dashed rounded-lg cursor-pointer transition-colors relative ${
                      theme === 'dark' ? 'border-white/10 hover:border-emerald-500/30 hover:bg-white/5' : 'border-gray-200 hover:border-emerald-500/35 hover:bg-gray-50'
                    }`}>
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                      
                      {editImage ? (
                        <div className="absolute inset-0 w-full h-full object-cover animate-fade-in">
                          <img src={editImage ? editImage.split(',')[0].trim() : ''} className="w-full h-full object-cover rounded-lg" alt="" referrerPolicy="no-referrer" />
                        </div>
                      ) : uploadingImage ? (
                        <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <div className="text-center select-none text-gray-500 animate-pulse">
                          <Upload className="w-4 h-4 mx-auto mb-1 opacity-50" />
                          <p className="text-[8px] font-bold">{language === 'ar' ? 'اسحب صورتك أو اختر لرفعها' : 'Drag & drop image or click to select'}</p>
                        </div>
                      )}
                    </label>
                    {uploadError && <p className="text-[8px] text-red-500">{uploadError}</p>}
                  </div>

                  <div className="space-y-2">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">
                        {language === 'ar' ? 'رابط المعاينة المباشرة' : 'Live Preview URL'}
                      </label>
                      <input
                        type="url"
                        value={editLinkPreview}
                        onChange={(e) => setEditLinkPreview(e.target.value)}
                        placeholder="https://demo.example.com"
                        className={`w-full h-9 px-3 border rounded-[4px] outline-none text-xs text-left ${
                          theme === 'dark' ? 'bg-black/40 border-white/5 focus:border-emerald-500/30 text-white' : 'bg-white border-gray-250 focus:border-emerald-500/30 text-gray-900'
                        }`}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">
                        {language === 'ar' ? 'رابط الفيديو التوضيحي' : 'Video Explanation URL'}
                      </label>
                      <input
                        type="url"
                        value={editLinkVideo}
                        onChange={(e) => setEditLinkVideo(e.target.value)}
                        placeholder="https://youtube.com/watch?v=..."
                        className={`w-full h-9 px-3 border rounded-[4px] outline-none text-xs text-left ${
                          theme === 'dark' ? 'bg-black/40 border-white/5 focus:border-emerald-500/30 text-white' : 'bg-white border-gray-250 focus:border-emerald-500/30 text-gray-900'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* Secure Download Link */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">
                    {language === 'ar' ? 'رابط تحميل الملف الآمن' : 'Secure Download Link (ZIP/Source)'}
                  </label>
                  <input
                    type="text"
                    value={editLinkDownload}
                    onChange={(e) => setEditLinkDownload(e.target.value)}
                    placeholder="https://..."
                    className={`w-full h-10 px-3 border rounded-[4px] outline-none text-xs text-left ${
                      theme === 'dark' ? 'bg-black/40 border-white/5 focus:border-emerald-500/35 text-white' : 'bg-white border-gray-250 focus:border-emerald-500/35 text-gray-900'
                    }`}
                  />
                </div>

                {/* Tech Specs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">
                      {language === 'ar' ? 'الميزات والخصائص المضمنة' : 'Key Features & Capabilities'}
                    </label>
                    <textarea
                      rows={2}
                      value={editFeatures}
                      onChange={(e) => setEditFeatures(e.target.value)}
                      placeholder="High Speed&#10;Open-source"
                      className={`w-full p-3 border rounded-[4px] outline-none text-xs leading-relaxed resize-none ${
                        theme === 'dark' ? 'bg-black/40 border-white/5 focus:border-emerald-500/35 text-white' : 'bg-white border-gray-250 focus:border-emerald-500/35 text-gray-900'
                      }`}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">
                      {language === 'ar' ? 'الأدوات وإطار العمل المستعمل (فواصل فاصلة)' : 'Tools & Frameworks Used'}
                    </label>
                    <input
                      type="text"
                      value={editTools}
                      onChange={(e) => setEditTools(e.target.value)}
                      placeholder="React, Django, Express"
                      className={`w-full h-10 px-3 border rounded-[4px] outline-none text-xs ${
                        theme === 'dark' ? 'bg-black/40 border-white/5 focus:border-emerald-500/30 text-white' : 'bg-white border-gray-250 focus:border-emerald-500/30 text-gray-900'
                      }`}
                    />
                  </div>
                </div>

                {/* Descriptions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">
                      {language === 'ar' ? 'الوصف (العربية) *' : 'Description (Arabic) *'}
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={editDescAr}
                      onChange={(e) => setEditDescAr(e.target.value)}
                      placeholder="شرح موجز لخصائص برمجيتك أو منصتك وما تقدمه..."
                      className={`w-full p-3 border rounded-[4px] outline-none text-xs leading-relaxed resize-none ${
                        theme === 'dark' ? 'bg-black/40 border-white/5 focus:border-emerald-500/35 text-white' : 'bg-white border-gray-250 focus:border-emerald-500/35 text-gray-900'
                      }`}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-gray-150 uppercase tracking-widest">
                      Description (English) *
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={editDescEn}
                      onChange={(e) => setEditDescEn(e.target.value)}
                      placeholder="A concise summary detailing the core architecture and value preposition..."
                      className={`w-full p-3 border rounded-[4px] outline-none text-xs leading-relaxed resize-none text-left ${
                        theme === 'dark' ? 'bg-black/40 border-white/5 focus:border-emerald-500/35 text-white' : 'bg-white border-gray-250 focus:border-emerald-500/35 text-gray-900'
                      }`}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-4 flex items-center justify-end gap-2 border-t border-gray-800">
                  <button
                    type="button"
                    onClick={() => setEditingItem(null)}
                    className="px-4 h-10 border border-gray-700 hover:bg-gray-800/20 rounded-[4px] text-xs font-black transition-colors duration-300 text-gray-400"
                  >
                    {language === 'ar' ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={updating || uploadingImage}
                    className="px-5 h-10 bg-emerald-500 text-black hover:bg-emerald-400 disabled:opacity-50 font-extrabold text-xs rounded-[4px] shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer leading-none"
                  >
                    {updating ? (
                      <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    ) : (
                      language === 'ar' ? 'حفظ التغييرات وتزامنها' : 'Save & Synchronize Changes'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ActionConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        description={confirmModal.description}
        variant={confirmModal.variant}
      />

    </div>
  );
};

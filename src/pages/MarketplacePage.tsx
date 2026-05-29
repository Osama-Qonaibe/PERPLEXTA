import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { ShoppingBag, Search, Plus, Filter, MessageSquare, ExternalLink, Clock, Tag, Eye, X, Upload, Check, Trash2, Landmark } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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
}

export const MarketplacePage: React.FC = () => {
  const { language, token, user, theme } = useAppContext();
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // Create item dialog
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [itemTitleAr, setItemTitleAr] = useState('');
  const [itemTitleEn, setItemTitleEn] = useState('');
  const [itemDescAr, setItemDescAr] = useState('');
  const [itemDescEn, setItemDescEn] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemCategory, setItemCategory] = useState('Code & APIs');
  const [itemContact, setItemContact] = useState('');
  const [itemImage, setItemImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const dir = language === 'ar' ? 'rtl' : 'ltr';

  const categories = [
    { id: 'All', labelAr: 'كل الفئات', labelEn: 'All Categories' },
    { id: 'Code & APIs', labelAr: 'الأكواد والربط البرمجي', labelEn: 'Code & APIs' },
    { id: 'Trading Strategies', labelAr: 'إستراتيجيات التداول', labelEn: 'Trading Strategies' },
    { id: 'AI Models', labelAr: 'نماذج الذكاء', labelEn: 'AI Models' },
    { id: 'Strategic Intelligence', labelAr: 'الاستخبارات والمعرفة', labelEn: 'Intelligence Data' },
    { id: 'Developer Tools', labelAr: 'أدوات المطورين', labelEn: 'Developer Tools' }
  ];

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/marketplace/items');
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      }
    } catch (err) {
      console.error('Failed to fetch marketplace items:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setUploadError('');

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Create matching 1080/1080 canvas for the crop as requested
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
              setUploadError(language === 'ar' ? 'فشل معالجة الصورة.' : 'Failed to crop image.');
              setUploadingImage(false);
              return;
            }

            const croppedFile = new File([blob], file.name, { type: 'image/jpeg' });
            const formData = new FormData();
            formData.append('file', croppedFile);

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
                  setItemImage(`/uploads/${data.file.file_url}`);
                } else {
                  setUploadError(language === 'ar' ? 'فشل الغلاف.' : 'Upload failed.');
                }
              } else {
                setUploadError(language === 'ar' ? 'فشل في رفع الصورة' : 'Failed uploading image');
              }
            } catch (err) {
              console.error(err);
              setUploadError(language === 'ar' ? 'خطأ في الاتصال بالخادم.' : 'Server network error.');
            } finally {
              setUploadingImage(false);
            }
          }, 'image/jpeg', 0.9);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemTitleAr || !itemTitleEn || !itemDescAr || !itemDescEn || !itemPrice) return;

    setSubmitting(true);
    const catObj = categories.find(c => c.id === itemCategory) || categories[1];

    try {
      const res = await fetch('/api/marketplace/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title_ar: itemTitleAr,
          title_en: itemTitleEn,
          description_ar: itemDescAr,
          description_en: itemDescEn,
          price: parseFloat(itemPrice),
          category_en: catObj.id,
          category_ar: catObj.labelAr,
          image_url: itemImage || 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1080&h=1080&fit=crop',
          contact_link: itemContact || 'https://t.me/perplexta_support'
        })
      });

      if (res.ok) {
        setSubmitSuccess(true);
        setTimeout(() => {
          setIsCreateOpen(false);
          setSubmitSuccess(false);
          setItemTitleAr('');
          setItemTitleEn('');
          setItemDescAr('');
          setItemDescEn('');
          setItemPrice('');
          setItemContact('');
          setItemImage(null);
          fetchItems();
        }, 2000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredItems = items.filter(item => {
    const title = language === 'ar' ? item.title_ar : item.title_en;
    const desc = language === 'ar' ? item.description_ar : item.description_en;
    const cat = language === 'ar' ? item.category_ar : item.category_en;

    const matchesSearch = title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          cat.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === 'All' || item.category_en === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] pt-16 pb-16 font-sans transition-theme" dir={dir}>
      
      {/* Sticky Premium Header Container */}
      <div className="sticky top-16 z-[39] bg-[var(--bg-base)]/95 backdrop-blur-md border-b border-[var(--border-main)] py-4 transition-all duration-300 select-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          
          {/* Header section with Emerald glow layout */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black tracking-tight font-sans text-transparent bg-clip-text bg-[length:200%_auto] bg-gradient-to-r from-[var(--text-primary)] via-emerald-400 to-[var(--text-primary)]">
                {language === 'ar' ? 'سوق بيربليكستا للمنتجات الرقمية' : 'Perplexta Digital Products Market'}
              </h1>
              <p className="text-sm text-gray-500 mt-1 font-medium leading-relaxed">
                {language === 'ar' ? 'منصة متكاملة لاستكشاف وشراء الحلول البرمجية الجاهزة، الخدمات الرقمية، والمنتجات التقنية النخبوية.' : 'Elite marketplace to explore and acquire ready-to-deploy software solutions, custom digital assets, and premium tech utilities.'}
              </p>
            </div>

            <div className="flex items-center gap-2 self-start md:self-auto">
              {user && (
                <button
                  onClick={() => setIsCreateOpen(true)}
                  className="flex items-center gap-1.5 px-4 h-10 rounded-[4px] bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.5)] font-bold transition-all duration-300 active:scale-95 text-xs"
                >
                  <Plus size={14} />
                  <span>{language === 'ar' ? 'إدراج منتج جديد' : 'List New Asset'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Filters and Search toolbar */}
          <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
            <div className="relative flex-1 max-w-lg">
              <Search className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder={language === 'ar' ? 'البحث عن خدمات أو أكواد...' : 'Search listed assets...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-4 bg-[var(--bg-secondary)] border border-[var(--border-main)] hover:border-gray-700 focus:border-emerald-500/50 rounded-[4px] outline-none text-xs transition-theme"
              />
            </div>

            {/* Categories track with active emerald glow indicators */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-none max-w-full">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`h-8.5 px-3.5 rounded-[4px] text-xs font-bold whitespace-nowrap transition-all duration-300 ${
                    selectedCategory === cat.id
                      ? 'text-emerald-500 bg-emerald-500/5 border border-emerald-500/30 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]'
                      : 'text-gray-400 hover:text-[var(--text-primary)] bg-[var(--bg-secondary)] border border-[var(--border-main)] hover:bg-[var(--bg-hover)]'
                  }`}
                >
                  {language === 'ar' ? cat.labelAr : cat.labelEn}
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 pt-8">

        {/* Catalog list in square 1080 proportions */}
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 rounded-full border-2 border-t-emerald-500 border-r-emerald-500 border-l-[var(--border-main)] border-b-[var(--border-main)] animate-spin" />
            <span className="text-xs text-gray-500">{language === 'ar' ? 'جاري تحميل المعروضات السيادية...' : 'Loading sovereign assets...'}</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-24 flex flex-col items-center justify-center text-[var(--text-muted)] opacity-30">
            <ShoppingBag size={48} className="mb-3" />
            <span className="text-xs">{language === 'ar' ? 'لا توجد منتجات مطابقة للبحث' : 'No assets matching this filter'}</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredItems.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  className="rounded-sm bg-[var(--bg-secondary)]/50 border border-[var(--border-main)] hover:border-emerald-500/30 dark:hover:border-emerald-500/30 overflow-hidden hover:shadow-[0_0_30px_rgba(16,185,129,0.06)] group transition-all duration-500 flex flex-col h-full"
                >
                  {/* Square Image 1080 aspect-ratio crop */}
                  <div className="relative aspect-square w-full overflow-hidden bg-black shrink-0">
                    <img
                      src={item.image_url}
                      alt={language === 'ar' ? item.title_ar : item.title_en}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-all duration-700"
                    />
                    <div className="absolute top-3 right-3 px-2 h-6 rounded-[3px] bg-black/70 backdrop-blur-md border border-white/10 flex items-center gap-1">
                      <Tag size={11} className="text-emerald-500" />
                      <span className="text-[10px] text-gray-300 tracking-tight font-sans font-black">
                        {language === 'ar' ? item.category_ar : item.category_en}
                      </span>
                    </div>

                    <div className="absolute bottom-3 left-3 px-2.5 h-7 rounded-[4px] bg-emerald-500/90 text-black border border-emerald-400 font-sans font-black text-xs flex items-center justify-center">
                      ${parseFloat(item.price.toString()).toLocaleString()}
                    </div>
                  </div>

                  {/* Body content */}
                  <div className="p-5 flex-1 flex flex-col space-y-4">
                    <div className="space-y-1">
                      <h3 className="font-bold text-sm tracking-tight text-[var(--text-primary)] group-hover:text-emerald-400 transition-theme line-clamp-1 leading-snug">
                        {language === 'ar' ? item.title_ar : item.title_en}
                      </h3>
                      
                      {/* Seller Profile block */}
                      <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                        {item.seller_avatar ? (
                          <img src={item.seller_avatar} referrerPolicy="no-referrer" className="w-4 h-4 rounded-full object-cover" alt="" />
                        ) : (
                          <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold text-[8px]">
                            {item.seller_name.charAt(0)}
                          </div>
                        )}
                        <span className="font-medium truncate max-w-[80px]">{item.seller_name}</span>
                        <span>•</span>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <Eye size={10} />
                          <span>{item.views || 0}</span>
                        </div>
                      </div>
                    </div>

                    <p className="text-[11px] text-gray-500 leading-relaxed font-sans line-clamp-3 flex-1">
                      {language === 'ar' ? item.description_ar : item.description_en}
                    </p>

                    <div className="pt-2 shrink-0">
                      <a
                        href={item.contact_link || 'https://t.me/perplexta_support'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full h-10 rounded-[4px] bg-transparent border border-gray-200 dark:border-gray-800/80 hover:border-emerald-500/50 hover:bg-emerald-500/5 hover:text-emerald-500 hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.3)] transition-all duration-300 font-bold text-xs flex items-center justify-center gap-1.5"
                      >
                        <ExternalLink size={13} className="shrink-0" />
                        <span>{language === 'ar' ? 'طلب شراء / تواصل بالبائع' : 'Request Asset / Contact Seller'}</span>
                      </a>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

      </div>

      {/* Add Item Dialog */}
      <AnimatePresence>
        {isCreateOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreateOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative max-w-xl w-full max-h-[85vh] overflow-y-auto bg-[var(--bg-secondary)] border border-[var(--border-main)] rounded-lg shadow-2xl p-6 scrollbar-none space-y-6"
            >
              <div className="flex items-center justify-between border-b border-[var(--border-main)] pb-3">
                <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-1.5">
                  <ShoppingBag size={15} className="text-emerald-500" />
                  {language === 'ar' ? 'عرض منتج جديد بالسوق' : 'List New Sovereign Asset'}
                </h3>
                <button
                  onClick={() => setIsCreateOpen(false)}
                  className="p-1.5 text-gray-400 hover:text-[var(--text-primary)] rounded-[4px] hover:bg-[var(--bg-hover)] transition-theme"
                >
                  <X size={14} />
                </button>
              </div>

              {submitSuccess ? (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                    <Check size={24} />
                  </div>
                  <h4 className="font-bold text-xs text-[var(--text-primary)]">
                    {language === 'ar' ? 'تم تقديم الخدمة بنجاح!' : 'Asset Listed Successfully!'}
                  </h4>
                  <p className="text-[10px] text-gray-500 max-w-xs leading-relaxed">
                    {language === 'ar' 
                      ? 'تم رفع تفاصيل العرض، وهو بانتظار مراجعة الإدارة السيادية للموافقة على عرضه للمستخدمين.' 
                      : 'The offering details are in review by admins. Once approved, it will be visible in the catalog.'}
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4 text-right" dir={dir}>
                  {/* Image Square Upload with Crop Preview */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-gray-400">
                      {language === 'ar' ? 'صورة العرض (تلقص تلقائياً مربع 1080/1080)' : 'Catalog Asset Square Image'}
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="relative w-20 h-20 border border-[var(--border-main)] rounded-md overflow-hidden bg-black flex items-center justify-center shrink-0">
                        {itemImage ? (
                          <img src={itemImage} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <ShoppingBag size={24} className="text-gray-600" />
                        )}
                        {uploadingImage && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <div className="w-5 h-5 border-2 border-emerald-500 rounded-full border-t-transparent animate-spin" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 space-y-1">
                        <label className="h-9 px-3 border border-[var(--border-main)] hover:border-emerald-500/30 hover:bg-emerald-500/5 hover:text-emerald-500 text-xs font-bold rounded-[4px] cursor-pointer flex items-center justify-center gap-1 w-max transition-all duration-300">
                          <Upload size={13} />
                          <span>{language === 'ar' ? 'رفع صورة العرض' : 'Upload Image'}</span>
                          <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                        </label>
                        <p className="text-[9px] text-gray-500 leading-normal">
                          {language === 'ar' ? 'رفع صور مربعة أو مستطيلة؛ سيقوم الحصاد التلقائي بالقص والتركيز المركزي لتوفير تجربة نخبوية.' : 'Upload any rectangular or square image; automatic central alignment crop preserves fidelity.'}
                        </p>
                        {uploadError && <p className="text-[9px] text-red-500">{uploadError}</p>}
                      </div>
                    </div>
                  </div>

                  {/* Dual titles */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-gray-400">{language === 'ar' ? 'العنوان بالعربية' : 'Arabic Title'}</label>
                      <input
                        type="text"
                        required
                        value={itemTitleAr}
                        onChange={(e) => setItemTitleAr(e.target.value)}
                        placeholder="مثال: خبير الأكواد v3"
                        className="w-full h-10 px-3 bg-[var(--bg-primary)] border border-[var(--border-main)] rounded-[4px] outline-none text-xs text-[var(--text-primary)]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-gray-400">{language === 'ar' ? 'العنوان بالإنجليزية' : 'English Title'}</label>
                      <input
                        type="text"
                        required
                        value={itemTitleEn}
                        onChange={(e) => setItemTitleEn(e.target.value)}
                        placeholder="e.g. Master Quant Bot"
                        className="w-full h-10 px-3 bg-[var(--bg-primary)] border border-[var(--border-main)] rounded-[4px] outline-none text-xs text-[var(--text-primary)]"
                      />
                    </div>
                  </div>

                  {/* Price and Category */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-gray-400">{language === 'ar' ? 'السعر (بالدولار)' : 'Price ($)'}</label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={itemPrice}
                        onChange={(e) => setItemPrice(e.target.value)}
                        placeholder="مثال: 150"
                        className="w-full h-10 px-3 bg-[var(--bg-primary)] border border-[var(--border-main)] rounded-[4px] outline-none text-xs text-[var(--text-primary)]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-gray-400">{language === 'ar' ? 'الفئة' : 'Category'}</label>
                      <select
                        value={itemCategory}
                        onChange={(e) => setItemCategory(e.target.value)}
                        className="w-full h-10 px-3 bg-[var(--bg-primary)] border border-[var(--border-main)] rounded-[4px] outline-none text-xs text-[var(--text-primary)]"
                      >
                        {categories.slice(1).map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {language === 'ar' ? cat.labelAr : cat.labelEn}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Dual descriptions */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-gray-400">{language === 'ar' ? 'الوصف بالعربية' : 'Arabic Description'}</label>
                    <textarea
                      required
                      rows={3}
                      value={itemDescAr}
                      onChange={(e) => setItemDescAr(e.target.value)}
                      placeholder="صف برمجيتك أو خلاصة أبحاثك..."
                      className="w-full p-3 bg-[var(--bg-primary)] border border-[var(--border-main)] rounded-[4px] outline-none text-xs text-[var(--text-primary)] leading-relaxed resize-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-gray-400">{language === 'ar' ? 'الوصف بالإنجليزية' : 'English Description'}</label>
                    <textarea
                      required
                      rows={3}
                      value={itemDescEn}
                      onChange={(e) => setItemDescEn(e.target.value)}
                      placeholder="Describe your asset or strategic workspace..."
                      className="w-full p-3 bg-[var(--bg-primary)] border border-[var(--border-main)] rounded-[4px] outline-none text-xs text-[var(--text-primary)] leading-relaxed resize-none"
                    />
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-gray-400">{language === 'ar' ? 'رابط التواصل للتسليم والمبيعات' : 'Contact Link for Sales/Delivery'}</label>
                    <input
                      type="url"
                      value={itemContact}
                      onChange={(e) => setItemContact(e.target.value)}
                      placeholder="مثال: (رابط تيليغرام) https://t.me/your_account"
                      className="w-full h-10 px-3 bg-[var(--bg-primary)] border border-[var(--border-main)] rounded-[4px] outline-none text-xs text-[var(--text-primary)]"
                    />
                  </div>

                  <div className="pt-4 flex items-center justify-end gap-2 border-t border-[var(--border-main)]">
                    <button
                      type="button"
                      onClick={() => setIsCreateOpen(false)}
                      className="px-4 h-10 border border-[var(--border-main)] rounded-[4px] text-xs font-bold text-gray-400 hover:text-[var(--text-primary)] transition-theme"
                    >
                      {language === 'ar' ? 'إلغاء' : 'Cancel'}
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || uploadingImage}
                      className="px-5 h-10 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-extrabold text-xs rounded-[4px] shadow-lg transition-theme flex items-center justify-center gap-1"
                    >
                      {submitting ? (
                        <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      ) : (
                        language === 'ar' ? 'إدراج الخدمة والتقديم' : 'Submit Asset'
                      )}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

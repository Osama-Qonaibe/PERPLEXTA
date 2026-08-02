import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Grid, Building2, Smartphone, Puzzle, Brain, TrendingUp, BarChart2, Layout,
  Rocket, Megaphone, Gamepad2, BookOpen, RefreshCw, Code, Package, Eye, Play,
  Plus, X, Upload, Check, ExternalLink, ArrowLeft, ArrowRight, Wallet, CreditCard,
  ChevronDown, SlidersHorizontal, Trash2, Search, Sliders, AlertCircle, Sparkles, Flame, Star, Award, ShoppingBag, Gift, Share2, ShoppingCart,
  Edit, ShieldAlert
} from 'lucide-react';
import { toast } from 'sonner';
import { RecommendationWidget } from '../components/RecommendationWidget';
import { getMediaUrl, compressAndResizeImage } from '../utils/mediaUtils';

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
  preview_url?: string;
  video_url?: string;
  download_url?: string;
  features?: string;
  technologies?: string;
  referral_percent?: number;
  highlight_tag?: string;
  license_type?: string;
}

interface CartItem {
  id: string; // unique combination of itemId and license_type, e.g., "12_regular"
  product: MarketplaceItem;
  licenseType: string;
  price: number;
}

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
  { id: 'game-bundles', parent: 'bundles', nAr: 'حزم ألعاب', nEn: 'Game Bundles', ic: 'game-bundles', co: '#ef4444' },
  { id: 'ebooks', parent: 'digital', nAr: 'كتب وأدلة رقمية', nEn: 'E-books & Guides', ic: 'ebooks', co: '#14b8a6' },
  { id: 'plr', parent: 'digital', nAr: 'منتجات إعادة البيع PLR', nEn: 'PLR/MRR Products', ic: 'plr', co: '#f97316' },
  { id: 'free-scripts', parent: 'free', nAr: 'أكواد مجانية جاهزة', nEn: 'Free Ready Code', ic: 'code', co: '#10b981' },
  { id: 'free-templates', parent: 'free', nAr: 'قوالب مجانية', nEn: 'Free Templates', ic: 'templates', co: '#ec4899' },
  { id: 'open-source', parent: 'free', nAr: 'أنظمة مفتوحة المصدر', nEn: 'Open Source Systems', ic: 'saas', co: '#10b981' }
];

const getCategoryIcon = (id: string, className?: string) => {
  switch (id) {
    case 'saas':
      return <Building2 className={className} />;
    case 'mobile':
      return <Smartphone className={className} />;
    case 'plugins':
      return <Puzzle className={className} />;
    case 'ai-agents':
      return <Brain className={className} />;
    case 'trading-bots':
      return <TrendingUp className={className} />;
    case 'indicators':
      return <BarChart2 className={className} />;
    case 'templates':
      return <Layout className={className} />;
    case 'figma':
      return <SlidersHorizontal className={className} />;
    case 'startup-box':
      return <Rocket className={className} />;
    case 'marketing-kits':
      return <Megaphone className={className} />;
    case 'game-bundles':
      return <Gamepad2 className={className} />;
    case 'ebooks':
      return <BookOpen className={className} />;
    case 'plr':
      return <RefreshCw className={className} />;
    case 'free':
    case 'free-scripts':
    case 'free-templates':
    case 'open-source':
      return <Gift className={className} />;
    case 'code':
      return <Code className={className} />;
    case 'bundles':
      return <Package className={className} />;
    default:
      return <Grid className={className} />;
  }
};

const getHighlightDetails = (tag: string, className?: string) => {
  const norm = tag.toLowerCase().trim();
  switch (norm) {
    case 'trending':
      return {
        labelAr: 'رائج',
        labelEn: 'Trending',
        colorClass: 'bg-orange-500/10 border-orange-500/25 text-orange-600 dark:text-orange-400 shadow-[0_0_10px_rgba(249,115,22,0.12)] animate-pulse',
        icon: <Flame className={className || "w-2.5 h-2.5"} strokeWidth={3} />
      };
    case 'exclusive':
      return {
        labelAr: 'عرض حصري',
        labelEn: 'Exclusive',
        colorClass: 'bg-purple-500/10 border-purple-500/25 text-purple-650 dark:text-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.12)]',
        icon: <Star className={className || "w-2.5 h-2.5"} strokeWidth={3} />
      };
    case 'free':
      return {
        labelAr: 'مجاني',
        labelEn: 'Free / OSS',
        colorClass: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.12)]',
        icon: <Gift className={className || "w-2.5 h-2.5"} strokeWidth={3} />
      };
    case 'best_seller':
    case 'bestseller':
      return {
        labelAr: 'الأكثر مبيعاً',
        labelEn: 'Best Seller',
        colorClass: 'bg-rose-500/10 border-rose-500/25 text-rose-600 dark:text-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.12)]',
        icon: <TrendingUp className={className || "w-2.5 h-2.5"} strokeWidth={3} />
      };
    case 'new':
      return {
        labelAr: 'جديد',
        labelEn: 'New',
        colorClass: 'bg-blue-500/10 border-blue-500/25 text-blue-600 dark:text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.12)]',
        icon: <Sparkles className={className || "w-2.5 h-2.5"} strokeWidth={3} />
      };
    case 'featured':
    default:
      return {
        labelAr: 'مميز',
        labelEn: 'Featured',
        colorClass: 'bg-amber-500/10 border-amber-500/25 text-amber-600 dark:text-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.12)]',
        icon: <Award className={className || "w-2.5 h-2.5"} strokeWidth={3} />
      };
  }
};

const getLicenseDetails = (type: string) => {
  const norm = (type || 'commercial_standard').toLowerCase().trim();
  switch (norm) {
    case 'mit':
      return {
        nameAr: 'رخصة MIT البرمجية المفتوحة',
        nameEn: 'MIT Open Source License',
        descAr: 'رخصة مرنة تتيح للمطورين التعديل والاستخدام التجاري بحرية كاملة مع شرط بسيط وهو الحفاظ على إشعار حقوق الملكية الأصلي.',
        descEn: 'A highly permissive license that allows modification, private/commercial usage, and distribution. Requires preservation of the original copyright notice.',
        permissions: [
          { ar: 'الاستخدام التجاري مسموح', en: 'Commercial Use Allowed', ok: true },
          { ar: 'حق التعديل وإعادة التوزيع والنسخ', en: 'Modification & Distribution', ok: true },
          { ar: 'لا توجد ضمانات أو مسؤولية قانونية', en: 'No Warranties Included', ok: false },
        ]
      };
    case 'apache_2':
    case 'apache_2.0':
    case 'apache2':
    case 'apache':
      return {
        nameAr: 'رخصة Apache 2.0 المفتوحة',
        nameEn: 'Apache License 2.0',
        descAr: 'رخصة مفتوحة المصدر مرنة ومتقدمة توفر حماية صريحة لبراءات الاختراع والمسؤولية للمطورين والمنظمات على حد سواء.',
        descEn: 'A permissive open-source license with trademark protections and explicit grants of patent rights by contributors.',
        permissions: [
          { ar: 'الاستخدام التجاري والتعديل متاح', en: 'Commercial Use & Modification', ok: true },
          { ar: 'حقوق صريحة لبراءات الاختراع', en: 'Patent Rights Granted', ok: true },
          { ar: 'يجب توثيق دقيق للتغييرات المدخلة', en: 'State Changes Log Required', ok: false },
        ]
      };
    case 'gpl_3':
    case 'gpl3':
    case 'gpl':
      return {
        nameAr: 'رخصة جي بي إل العامة الثالثة (GNU GPL v3)',
        nameEn: 'GNU GPL v3 Open Source License',
        descAr: 'رخصة قوية لحماية البرمجيات الحرة (Copyleft). تشترط إتاحة الشفرة المصدرية لأي تعديلات أو إضافات يتم نشرها وتوزيعها.',
        descEn: 'A strong copyleft license that requires any larger works or modifications of the codebase to be open for source inspections under GPLv3.',
        permissions: [
          { ar: 'الاستخدام والتوزيع مجاني للجميع', en: 'Free Use & Distribution', ok: true },
          { ar: 'إتاحة المصدر البرمجي إجبارية للمشتقات', en: 'Source Disclosure Required', ok: true },
          { ar: 'منع إغلاق الشفرة البرمجية لاحقاً', en: 'Lock-in Protection Active', ok: false },
        ]
      };
    case 'bsd_3':
    case 'bsd3':
    case 'bsd':
      return {
        nameAr: 'رخصة BSD ثلاثية الشروط المفتوحة',
        nameEn: 'BSD 3-Clause permissive license',
        descAr: 'رخصة مفتوحة مرنة للغاية شبيهة بـ MIT، تمنع استخدام اسم المالك الأصلي في تسويق المشتقات دون إذن صريح مسبق.',
        descEn: 'A simple, highly permissive license with zero endorsement of child projects. Requires attribution and copyright notices intact.',
        permissions: [
          { ar: 'الاستخدام التجاري والتعديل المطلق', en: 'Commercial Use & Mod Absolute', ok: true },
          { ar: 'منع استخدام العلامة التجارية دون إذن', en: 'No Trademark Usage allowed', ok: false },
          { ar: 'حفظ حقوق الملكية وناشري المنتج', en: 'Attribution Protection Enabled', ok: true },
        ]
      };
    case 'cc_by_sa':
    case 'cc_by':
    case 'cc':
      return {
        nameAr: 'رخصة المشاع الإبداعي النسبي (BY-SA 4.0)',
        nameEn: 'Creative Commons Attribution-ShareAlike',
        descAr: 'تتيح مشاركة وتعديل التصاميم والمواد الرقمية لأي غرض (بما فيها التجاري) بشرط نَسْب الفضل لصاحبه وبنفس الترخيص.',
        descEn: 'Permits copying and adapting digital materials for any purpose including commercial, requiring accurate author attributions is preserved.',
        permissions: [
          { ar: 'النشر والتثبيت والتعديل مسموح', en: 'Share & Reuse Authorized', ok: true },
          { ar: 'المشاركة يجب أن تتم تحت نفس الترخيص', en: 'ShareAlike requirements apply', ok: true },
          { ar: 'يجب الإشارة المباشرة لمؤلف العمل', en: 'Attribution Credits Mandatory', ok: false },
        ]
      };
    case 'commercial_extended':
      return {
        nameAr: 'الترخيص التجاري الممتد المطور (Extended)',
        nameEn: 'Proprietary Commercial Extended License',
        descAr: 'ترخيص تجاري مرن ومتقدم للمؤسسات ومطوري الحلول المجمعة. يتيح لك البناء والتثبيت في عدد غير محدود من المشاريع التجارية.',
        descEn: 'Premium enterprise-ready commercial license. Allows compiling, modifying, and integrating into unlimited commercial instances.',
        permissions: [
          { ar: 'عدد غير محدود من المشاريع والتطبيقات', en: 'Unlimited Projects & Domains', ok: true },
          { ar: 'حق دمج الكود ضمن حلول وحزم تجارية', en: 'Integration in Bundled Products', ok: true },
          { ar: 'منع إعادة بيع الكود بمفرده كمنتج مستقل', en: 'No standalone code resale allowed', ok: false },
        ]
      };
    case 'commercial_standard':
    default:
      return {
        nameAr: 'الترخيص التجاري القياسي الخاص (Standard)',
        nameEn: 'Proprietary Commercial Standard License',
        descAr: 'ترخيص تجاري لحماية الملكية الفكرية، مخصص للتثبيت والاستخدام في مشروع تجاري أو شخصي واحد فقط. يمنع بيعه أو توزيع الكود.',
        descEn: 'Standard proprietary license for single-use project cases. Authorizes running inside one end product, prohibiting sublicensing or resells.',
        permissions: [
          { ar: 'الاستخدام في مشروع وعميل فردي واحد', en: 'Use within a Single End Product', ok: true },
          { ar: 'حق التعديل الكامل لملائمة حاجاتك', en: 'Full Customization Authorized', ok: true },
          { ar: 'منع النسخ أو التشغيل في مواقع متعددة', en: 'Multi-domain/multi-site is restricted', ok: false },
        ]
      };
  }
};

const dict = {
  ar: {
    title: 'سوق بيربليكستا للمنتجات الرقمية',
    subtitle: 'منصة متكاملة لاستكشاف وشراء الحلول البرمجية الجاهزة والمنتجات التقنية النخبوية.',
    listNewAsset: 'إدراج منتج جديد',
    searchPlaceholder: 'البحث عن خدمات أو أكواد...',
    allCategories: 'كل الفئات',
    mainCategories: 'الأقسام الرئيسية',
    priceFilter: 'السعر',
    priceAll: 'الكل',
    sortByRecent: 'الأحدث أولاً',
    sortByPriceAsc: 'السعر (من الأقل للأعلى)',
    sortByPriceDesc: 'السعر (من الأعلى للأقل)',
    sortByLabel: 'الترتيب حسب',
    noProducts: 'لا توجد منتجات مطابقة لبحثك في هذا القسم الحالي',
    loadingAssets: 'جاري تحميل المعروضات السيادية...',
    buyWithBalance: 'شراء بالرصيد',
    creditCard: 'بطاقة الائتمان',
    byBalancePoints: 'بالرصيد',
    points: 'نقطة',
    licenseTitle: 'خيارات الترخيص',
    featuresTitle: 'المميزات',
    techTitle: 'التقنيات والأدوات',
    ctaHeading: 'هل تمتلك مهارات برمجية؟ حوّلها إلى مصدر دخل!',
    ctaText: 'أنشئ منتجاتك الرقمية وعرضها للملايين. ابدأ ببيع الأكواد، القوالب، والأنظمة الذكية اليوم واربح من كل عملية تحميل عبر منصتنا الآمنة.',
    ctaBtn: 'ابدأ البيع الآن',
    insertModalTitle: 'إدراج منتج تقني جديد',
    assetName: 'اسم المنتج البرمجي *',
    mainCategory: 'القسم الرئيسي *',
    basePrice: 'السعر الأساسي ($) *',
    discountPct: 'نسبة الخصم (%)',
    afterDiscount: 'السعر بعد الخصم',
    licenseType: 'نوع الترخيص *',
    previewUrl: 'رابط المعاينة',
    videoUrl: 'رابط الفيديو',
    downloadUrl: 'رابط التنزيل',
    programmingLang: 'لغة البرمجة',
    toolsFrameworks: 'الأدوات/إطارات العمل (افصل بفاصلة)',
    description: 'وصف مقتضب وعميق *',
    productFeatures: 'مميزات المنتج (افصل بفاصلة)',
    highlightProduct: 'تمييز المنتج',
    publishBtn: 'نشر المنتج فوراً بالمعرض',
    dragAndDrop: 'أو اسحب الصورة هنا',
    cancel: 'إلغاء',
    submit: 'إدراج الخدمة والتقديم',
    successMsg: 'تم تقديم الخدمة بنجاح! العرض بانتظار موافقة الإدارة وسيظهر قريباً.',
    successHeading: 'تم تقديم الخدمة بنجاح!',
    successDesc: 'تم رفع تفاصيل العرض، وهو بانتظار مراجعة الإدارة السيادية للموافقة على عرضه للمستخدمين.',
    contactSeller: 'طلب شراء / تواصل بالبائع',
    viewLink: 'معاينة',
    videoLink: 'فيديو',
    trending: 'رائج',
    new: 'جديد',
    exclusive: 'عرض حصري',
    featured: 'مميز',
    insufficientHeadline: 'رصيد غير كافٍ',
    insufficientBody: 'الرصيد المتاح حالياً بمحفظتك غير كافٍ لإتمام عملية الشراء البرمجية. تفضل بزيارة صفحة المكافآت أو الاشتراكات لشحن رصيدك.',
    purchaseInitiated: 'تأكيد الشراء',
    purchaseProgress: 'جاري تسجيل الحركة وتأمين الاتصال البرمجي...',
    purchaseDone: 'تم الشراء بنجاح بالرصيد! جاري مكاملة ملفات التحميل ونقلك لقنوات الدعم والاتصال بالبائـع.'
  },
  en: {
    title: 'Perplexta Digital Marketplace',
    subtitle: 'Elite marketplace to explore and acquire ready-to-deploy software solutions, custom digital assets, and premium tech utilities.',
    listNewAsset: 'List New Asset',
    searchPlaceholder: 'Search listed assets...',
    allCategories: 'All Categories',
    mainCategories: 'Main Categories',
    priceFilter: 'Price',
    priceAll: 'All',
    sortByRecent: 'Most Recent',
    sortByPriceAsc: 'Price: Low to High',
    sortByPriceDesc: 'Price: High to Low',
    sortByLabel: 'Sort By',
    noProducts: 'No products match your search query in this selection',
    loadingAssets: 'Loading sovereign assets...',
    buyWithBalance: 'Buy with Balance',
    creditCard: 'Credit Card',
    byBalancePoints: 'With Balance',
    points: 'points',
    licenseTitle: 'License Options',
    featuresTitle: 'Features',
    techTitle: 'Technologies & Tools',
    ctaHeading: 'Have coding skills? Turn them into income!',
    ctaText: 'Build and sell your digital goods to millions. List your codes, templates, and intelligent algorithms to start earning from secure downloads.',
    ctaBtn: 'Start Selling Now',
    insertModalTitle: 'List a New Technical Asset',
    assetName: 'Software Asset Name *',
    mainCategory: 'Main Category *',
    basePrice: 'Base Price ($) *',
    discountPct: 'Discount Percentage (%)',
    afterDiscount: 'Price After Discount',
    licenseType: 'License Type *',
    previewUrl: 'Preview Link',
    videoUrl: 'Video Link',
    downloadUrl: 'Download Link',
    programmingLang: 'Programming Language',
    toolsFrameworks: 'Tools / Frameworks (comma-separated)',
    description: 'Concise & Deep Description *',
    productFeatures: 'Product Features (comma-separated)',
    highlightProduct: 'Highlight Category',
    publishBtn: 'Publish Asset Immediately',
    dragAndDrop: 'or drag the image here',
    cancel: 'Cancel',
    submit: 'Submit Asset Details',
    successMsg: 'Asset posted successfully! Sovereign validation in progress.',
    successHeading: 'Sovereign Listing Submitted!',
    successDesc: 'Your listing is pending security validation. Once approved, it will go live across the Perplexta network.',
    contactSeller: 'Purchase Asset / Contact Seller',
    viewLink: 'Preview',
    videoLink: 'Video',
    trending: 'Trending',
    new: 'New',
    exclusive: 'Exclusive',
    featured: 'Featured',
    insufficientHeadline: 'Insufficient Balance',
    insufficientBody: 'Your available wallet balance is currently insufficient to perform this software acquisition. Please recharge from subscriptions or refer friends.',
    purchaseInitiated: 'Purchase Confirmation',
    purchaseProgress: 'Securing transfer protocol and recording transaction...',
    purchaseDone: 'SaaS acquisition successful! Download assets synchronized. Redirecting to delivery support chat.'
  }
};

export const DEFAULT_ITEMS: MarketplaceItem[] = [
  {
    id: -1,
    user_id: 1,
    title_en: 'Apex SaaS Multi-Tenant ERP Suite',
    title_ar: 'منظومة Apex لإدارة الموارد والمؤسسات SaaS',
    description_en: 'A complete modular hyper-optimized enterprise SaaS ERP with automated billing, analytics dashboard, dynamic routing, and role-based access control.',
    description_ar: 'نظام تخطيط موارد المؤسسات السحابي والأكثر مرونة وكفاءة، يدمج حسابات الفوترة والتحليلات البيانية والتحكم المتقدم بالصلاحيات للمنشآت الكبرى.',
    price: 899.00,
    category_en: 'SaaS Systems',
    category_ar: 'أنظمة SaaS',
    image_url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1080&h=1080&fit=crop',
    status: 'approved',
    views: 84,
    contact_link: 'https://t.me/perplexta_support',
    seller_name: 'Perplexta Core Team',
    seller_avatar: '',
    seller_role: 'admin',
    created_at: new Date().toISOString()
  },
  {
    id: -2,
    user_id: 1,
    title_en: 'Sovereign Mobile Crypto Wallet App',
    title_ar: 'تطبيق محفظة العملات الرقمية السيادي للجوال',
    description_en: 'Highly secure cross-platform React Native crypto wallet supporting biometric auth, real-time price feeds, gas optimization, and wallet connect.',
    description_ar: 'محفظة عملات مشفرة فائقة الأمان مبنية لتعمل على نظامي آندرويد وآي أو إس مع واجهات تفاعلية مذهلة، ومكاملة البصمة ومؤشرات الأسعار الفورية.',
    price: 450.00,
    category_en: 'Mobile Apps',
    category_ar: 'تطبيقات الجوال',
    image_url: 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?w=1080&h=1080&fit=crop',
    status: 'approved',
    views: 92,
    contact_link: 'https://t.me/perplexta_support',
    seller_name: 'Perplexta Core Team',
    seller_avatar: '',
    seller_role: 'admin',
    created_at: new Date().toISOString()
  },
  {
    id: -3,
    user_id: 1,
    title_en: 'Quantum Scalper High-Frequency Trading Bot',
    title_ar: 'بوت Quantum Scalper للتداول عالي التردد والخاطف',
    description_en: 'Automated trading system utilizing ultra-fast scalp strategies on Binance & Bybit. Programmed in Node.js and customizable with technical indicators.',
    description_ar: 'نظام تداول مؤتمت مصمم لإتمام صفقات سريعة وخاطفة على منصات التداول الكبرى بدقة متناهية وزمن استجابة فائق الصغر للربح السريع.',
    price: 699.00,
    category_en: 'Trading Bots',
    category_ar: 'بوتات التداول',
    image_url: 'https://images.unsplash.com/photo-1642790106117-e829e14a795f?w=1080&h=1080&fit=crop',
    status: 'approved',
    views: 128,
    contact_link: 'https://t.me/perplexta_support',
    seller_name: 'Perplexta Core Team',
    seller_avatar: '',
    seller_role: 'admin',
    created_at: new Date().toISOString()
  },
  {
    id: -4,
    user_id: 1,
    title_en: 'Perplexta Premium SaaS Landing Page Kit',
    title_ar: 'قوالب صفحات هبوط المواقع والشركات الممتازة',
    description_en: 'A production-ready responsive Next.js landing page compiled with stunning Framer Motion layout animations, eye-safe dark mode, and custom contact forms.',
    description_ar: 'صفحات هبوط غاية في الجاذبية والأناقة مبنية باستخدام Next.js و Tailwind CSS، مصممة لاستقطاب العملاء وزيادة التحويل والبيع السريع للبرمجيات.',
    price: 120.00,
    category_en: 'Templates & Sites',
    category_ar: 'قوالب ومواقع',
    image_url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1080&h=1080&fit=crop',
    status: 'approved',
    views: 45,
    contact_link: 'https://t.me/perplexta_support',
    seller_name: 'Perplexta Core Team',
    seller_avatar: '',
    seller_role: 'admin',
    created_at: new Date().toISOString()
  },
  {
    id: -5,
    user_id: 1,
    title_en: 'Hyper-Intelligence LLM Router Plugin',
    title_ar: 'إضافة التوجيه الذكي والربط بنماذج الذكاء الاصطناعي',
    description_en: 'Universal backend middleware to securely route prompts across OpenAI, Gemini & Anthropic with local vector database search and semantic memory caching.',
    description_ar: 'برمجية وسيطة ممتازة لربط الأنظمة بنماذج الذكاء الاصطناعي مع إتاحة استدعاء متوازي واستبدال تلقائي لحفظ ميزانية التشغيل ومنع توقف الخدمة.',
    price: 180.00,
    category_en: 'System Plugins',
    category_ar: 'إضافات الأنظمة',
    image_url: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?w=1080&h=1080&fit=crop',
    status: 'approved',
    views: 33,
    contact_link: 'https://t.me/perplexta_support',
    seller_name: 'Perplexta Core Team',
    seller_avatar: '',
    seller_role: 'admin',
    created_at: new Date().toISOString()
  },
  {
    id: -6,
    user_id: 1,
    title_en: 'Sovereign Startup-In-A-Box Tech Suite',
    title_ar: 'حزمة إطلاق المشاريع التقنية والشركات كاملة',
    description_en: 'Eradicate technical delays with full-stack templates. Compiles pre-built Auth, Stripe plans, admin database dashboard, mail templates, SEO config, and server setups.',
    description_ar: 'حزمة تقنية تأسيسية جاهزة تبدأ بها مشروعك فوراً؛ تختصر أسابيع التكويد عبر توفير الفوترة، وقواعد البيانات والتحليلات الجاهزة للتعديل.',
    price: 349.00,
    category_en: 'Startup-in-a-Box',
    category_ar: 'Startup-in-a-Box',
    image_url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1080&h=1080&fit=crop',
    status: 'approved',
    views: 75,
    contact_link: 'https://t.me/perplexta_support',
    seller_name: 'Perplexta Core Team',
    seller_avatar: '',
    seller_role: 'admin',
    created_at: new Date().toISOString()
  },
  {
    id: -7,
    user_id: 1,
    title_en: 'Perplexta Enterprise Figma Design System v3',
    title_ar: 'ملفات نظام تصميم واجهات المعاملات الاحترافية Figma v3',
    description_en: 'Pixel-perfect unified multi-device component library including charts, tables, cards, and adaptive grids. Built strictly with auto-layouts and design tokens.',
    description_ar: 'نظام متكامل وموحد من المكونات الرسومية وتخطيطات الشاشات لمصممي ومطوري الويب مبني بدقة متناهية ومكامل للوضع الداكن والفاتح.',
    price: 89.00,
    category_en: 'Figma Files',
    category_ar: 'ملفات Figma',
    image_url: 'https://images.unsplash.com/photo-1581291518655-9523c932ecbe?w=1080&h=1080&fit=crop',
    status: 'approved',
    views: 52,
    contact_link: 'https://t.me/perplexta_support',
    seller_name: 'Perplexta Core Team',
    seller_avatar: '',
    seller_role: 'admin',
    created_at: new Date().toISOString()
  },
  {
    id: -8,
    user_id: 1,
    title_en: 'Trend-Pulse Quantitative Pine Indicator Suite',
    title_ar: 'مؤشر Trend-Pulse للتحليل الفني وزخم الاتجاهات',
    description_en: 'Custom TradingView Pine script indicator offering clean trend reversal alerts, dynamic volatility channels, and automated backtesting modules.',
    description_ar: 'مؤشر فني برمجي لمنصة TradingView يقيس كميات التداول وزخم الاتجاه لمنحك نقاط دخول وخروج مؤكدة وخوارزميات مجهّزة بأمان كامل.',
    price: 150.00,
    category_en: 'Technical Indicators',
    category_ar: 'مؤشرات فنية',
    image_url: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=1080&h=1080&fit=crop',
    status: 'approved',
    views: 110,
    contact_link: 'https://t.me/perplexta_support',
    seller_name: 'Perplexta Core Team',
    seller_avatar: '',
    seller_role: 'admin',
    created_at: new Date().toISOString()
  },
  {
    id: -9,
    user_id: 1,
    title_en: 'Synthesized AI Agentic Workflow Pack',
    title_ar: 'ملفات سير عمل أتمتة الأنظمة باستخدام العملاء الأذكياء',
    description_en: 'Pre-configured workflow schemes for Make, n8n, and LangChain that automate continuous leads tracking, semantic CRM integration, and mailing broadcasts.',
    description_ar: 'مخططات وجداول عمل ذكية جاهزة لتلقين خوادم الأتمتة وجعل روبوتات المحادثة تدير عمليات المبيعات والدعم الفني وتحديث البيانات كلياً.',
    price: 220.00,
    category_en: 'AI & Automation',
    category_ar: 'AI & أتمتة',
    image_url: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=1080&h=1080&fit=crop',
    status: 'approved',
    views: 61,
    contact_link: 'https://t.me/perplexta_support',
    seller_name: 'Perplexta Core Team',
    seller_avatar: '',
    seller_role: 'admin',
    created_at: new Date().toISOString()
  },
  {
    id: -10,
    user_id: 1,
    title_en: 'Sovereign OSINT Intelligence & Security Codex',
    title_ar: 'الدليل الشامل لاستخبارات المصادر المفتوحة والأمن السيبراني',
    description_en: 'Deep tactical handbook for cybersecurity audit, open source intelligence collection, server defensive config, and operational OPSEC privacy standards.',
    description_ar: 'مرجع وتدريب سيادي غني بالمعلومات التكتيكية لحماية وتأمين الخوادم والاشتغال على جمع ومعالجة معلومات المصادر المفتوحة بأعلى درجات الأمان.',
    price: 45.00,
    category_en: 'E-books & Guides',
    category_ar: 'كتب وأدلة رقمية',
    image_url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1080&h=1080&fit=crop',
    status: 'approved',
    views: 140,
    contact_link: 'https://t.me/perplexta_support',
    seller_name: 'Perplexta Core Team',
    seller_avatar: '',
    seller_role: 'admin',
    created_at: new Date().toISOString()
  },
  {
    id: -11,
    user_id: 1,
    title_en: 'Agile Agency PLR Expansion Pack',
    title_ar: 'حزم إعادة البيع والترخيص غير المحدود لوكالات التقنية PLR',
    description_en: 'Unlock master resell rights for 15+ premium technical toolkits, ebooks, and marketing kits. Rebrand, sell, and retain 100% of profit channels.',
    description_ar: 'حقوق إعادة بيع وتوزيع غير محدودة لحزمة برمجية وتثقيفية كاملة، تتيح لك تخصيص الهوية باسم شركتك للبيع للمؤسسات والاستئثار بكامل الربح.',
    price: 299.00,
    category_en: 'PLR/MRR Products',
    category_ar: 'منتجات إعادة البيع PLR',
    image_url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1080&h=1080&fit=crop',
    status: 'approved',
    views: 67,
    contact_link: 'https://t.me/perplexta_support',
    seller_name: 'Perplexta Core Team',
    seller_avatar: '',
    seller_role: 'admin',
    created_at: new Date().toISOString()
  },
  {
    id: -12,
    user_id: 1,
    title_en: 'Perplexta Pure Core - Open Source Framework',
    title_ar: 'إطار عمل بيربليكستا كور - مفتوح المصدر بالكامل',
    description_en: 'Ultimate open-source lightweight modular Web & API framework built with pure TypeScript, zero-dependency streaming router, and military-grade encryption.',
    description_ar: 'النسخة مفتوحة المصدر من إطار عمل بيربليكستا الفائق لبناء خوادم وتطبيقات الويب بسرعات قياسية وتشفير عسكري لحماية ونقل البيانات بمرونة تامة.',
    price: 0.00,
    category_en: 'Open Source Systems',
    category_ar: 'أنظمة مفتوحة المصدر',
    image_url: 'https://images.unsplash.com/photo-1618401471353-b98aedd07871?w=1080&h=1080&fit=crop',
    status: 'approved',
    views: 280,
    contact_link: 'https://github.com/perplexta',
    seller_name: 'Perplexta Core Team',
    seller_avatar: '',
    seller_role: 'admin',
    created_at: new Date().toISOString()
  },
  {
    id: -13,
    user_id: 1,
    title_en: 'Free Tailwind Slate UI Dashboard Kit',
    title_ar: 'حزمة قوالب ولوحات تحكم Tailwind المجانية',
    description_en: 'Stunning premium dark-mode dashboard template featuring widgets, interactive telemetry charts, and customized responsive inputs.',
    description_ar: 'قالب لوحة تحكم وتصميم واجهات مستخدم مذهل مبني كلياً بـ Tailwind CSS مع أزرار ومؤشرات تفاعلية ومخططات بيانية مفتوحة للمطورين والنخبة.',
    price: 0.00,
    category_en: 'Free Templates',
    category_ar: 'قوالب مجانية',
    image_url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1080&h=1080&fit=crop',
    status: 'approved',
    views: 450,
    contact_link: 'https://t.me/perplexta_support',
    seller_name: 'Perplexta Core Team',
    seller_avatar: '',
    seller_role: 'admin',
    created_at: new Date().toISOString()
  }
];

export const MarketplacePage: React.FC = () => {
  const { language, token, user, theme, balanceUSD, refreshUser } = useAppContext();
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id?: string }>();
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedPriceRange, setSelectedPriceRange] = useState('all');
  const [sortBy, setSortBy] = useState<'recent' | 'price-asc' | 'price-desc'>('recent');

  const [referralCode, setReferralCode] = useState<string>('');
  const [showAdPopup, setShowAdPopup] = useState(false);

  useEffect(() => {
    const isAdDismissed = localStorage.getItem('hide_marketplace_ad');
    if (!isAdDismissed) {
      const timer = setTimeout(() => {
        setShowAdPopup(true);
      }, 5000); // Trigger 5 seconds after load
      return () => clearTimeout(timer);
    }
  }, []);

  const canPublish = (() => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    
    const limits = user.subscription?.limits || {};
    const maxListings = limits['marketplace_listings'];
    
    let limitVal = 3; // Baseline 3 free listings for registered accounts
    if (typeof maxListings === 'object' && maxListings !== null) {
      const rawVal = maxListings.monthly !== undefined ? maxListings.monthly : maxListings.daily;
      if (rawVal === 'unlimited') return true;
      if (rawVal !== undefined && rawVal !== null) {
        limitVal = parseInt(rawVal, 10);
      }
    } else if (maxListings === 'unlimited') {
      return true;
    } else if (maxListings !== undefined && maxListings !== null) {
      limitVal = parseInt(maxListings, 10);
    }
    return limitVal > 0;
  })();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref') || params.get('aff') || params.get('referral');
    if (ref) {
      setReferralCode(ref);
      localStorage.setItem('perplexta_marketplace_ref', ref);
    } else {
      const stored = localStorage.getItem('perplexta_marketplace_ref');
      if (stored) {
        setReferralCode(stored);
      }
    }
  }, []);

  const [openParents, setOpenParents] = useState<Record<string, boolean>>({
    code: true,
    fintech: false,
    ui: false,
    bundles: false,
    digital: false,
    free: false
  });

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<MarketplaceItem | null>(null);

  const resetForm = () => {
    setEditingProduct(null);
    setItemTitleAr('');
    setItemTitleEn('');
    setItemDescAr('');
    setItemDescEn('');
    setItemPrice('');
    setItemDiscount('');
    setItemReferralPercent('20');
    setItemHighlightTag('');
    setItemLicenseType('mit');
    setItemContact('');
    setItemImages([]);
    setItemLinkPreview('');
    setItemLinkVideo('');
    setItemLinkDownload('');
    setItemLang('');
    setItemTools('');
    setItemFeatures('');
    setSelectedHighlights([]);
    setSelectedLicenses(['regular']);
  };

  const startEditing = (prod: MarketplaceItem) => {
    setEditingProduct(prod);
    setItemTitleAr(prod.title_ar || '');
    setItemTitleEn(prod.title_en || '');
    setItemDescAr(prod.description_ar || '');
    setItemDescEn(prod.description_en || '');
    setItemPrice(prod.price?.toString() || '0');
    setItemDiscount('0');
    setItemReferralPercent(prod.referral_percent?.toString() || '20');
    
    const foundCat = children.find(c => c.nEn.toLowerCase() === prod.category_en.toLowerCase()) || children[0];
    setItemCategory(foundCat ? foundCat.id : 'saas');
    
    setItemContact(prod.contact_link || '');
    
    const urls = prod.image_url 
      ? prod.image_url.split(',').map((url: string) => url.trim()).filter(Boolean) 
      : [];
    setItemImages(urls);
    
    setItemLinkPreview(prod.preview_url || '');
    setItemLinkVideo(prod.video_url || '');
    setItemLinkDownload(prod.download_url || '');
    
    const formatArr = (val: any) => {
      if (Array.isArray(val)) return val.join(', ');
      if (typeof val === 'string') return val;
      return '';
    };
    setItemFeatures(formatArr(prod.features));
    setItemTools(formatArr(prod.technologies));
    setItemHighlightTag(prod.highlight_tag || '');
    setItemLicenseType(prod.license_type || 'mit');

    setSelectedProduct(null);
    setIsCreateOpen(true);
  };
  const [itemTitleAr, setItemTitleAr] = useState('');
  const [itemTitleEn, setItemTitleEn] = useState('');
  const [itemDescAr, setItemDescAr] = useState('');
  const [itemDescEn, setItemDescEn] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemDiscount, setItemDiscount] = useState('');
  const [itemReferralPercent, setItemReferralPercent] = useState('20');
  const [itemCategory, setItemCategory] = useState('saas');
  const [itemContact, setItemContact] = useState('');
  const [itemImages, setItemImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const [itemLinkPreview, setItemLinkPreview] = useState('');
  const [itemLinkVideo, setItemLinkVideo] = useState('');
  const [itemLinkDownload, setItemLinkDownload] = useState('');
  const [itemLang, setItemLang] = useState('');
  const [itemTools, setItemTools] = useState('');
  const [itemFeatures, setItemFeatures] = useState('');
  const [selectedHighlights, setSelectedHighlights] = useState<string[]>([]);
  const [selectedLicenses, setSelectedLicenses] = useState<string[]>(['regular']);
  const [itemHighlightTag, setItemHighlightTag] = useState('');
  const [itemLicenseType, setItemLicenseType] = useState('mit');

  const [selectedProduct, setSelectedProduct] = useState<MarketplaceItem | null>(null);
  const [selectedLicenseType, setSelectedLicenseType] = useState<string>('regular');
  const [buyingProgress, setBuyingProgress] = useState<'idle' | 'purchasing' | 'success' | 'insufficient'>('idle');

  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('perplexta_marketplace_cart');
    try {
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('perplexta_marketplace_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    if (selectedProduct) {
      setSelectedLicenseType(selectedProduct.license_type || 'mit');
    }
  }, [selectedProduct]);

  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxScale, setLightboxScale] = useState(1);
  const [lightboxRotation, setLightboxRotation] = useState(0);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isLightboxOpen) return;
      if (e.key === 'Escape') {
        setIsLightboxOpen(false);
      } else if (e.key === 'ArrowRight' || e.key === 'Right') {
        if (selectedProduct) {
          const assets = getPreviewAssets(selectedProduct);
          setLightboxIndex((prev) => (prev + 1) % assets.length);
          setLightboxScale(1);
          setLightboxRotation(0);
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'Left') {
        if (selectedProduct) {
          const assets = getPreviewAssets(selectedProduct);
          setLightboxIndex((prev) => (prev - 1 + assets.length) % assets.length);
          setLightboxScale(1);
          setLightboxRotation(0);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen, selectedProduct]);

  const dir = language === 'ar' ? 'rtl' : 'ltr';
  const t = language === 'ar' ? dict.ar : dict.en;

  const fetchItems = async () => {
    setLoading(true);
    try {
      const url = '/api/marketplace/items';
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(url, { headers });
      const deletedVirtuals = JSON.parse(localStorage.getItem('perplexta_deleted_virtual_items') || '[]');
      const availableDefaults = DEFAULT_ITEMS.filter(di => !deletedVirtuals.includes(di.id));

      if (res.ok) {
        const data = await res.json();
        const combined = [...data, ...availableDefaults.filter(di => !data.some((db: any) => db.title_en === di.title_en))];
        setItems(combined);
      } else {
        setItems(availableDefaults);
      }
    } catch (err) {
      console.error(err);
      const deletedVirtuals = JSON.parse(localStorage.getItem('perplexta_deleted_virtual_items') || '[]');
      const availableDefaults = DEFAULT_ITEMS.filter(di => !deletedVirtuals.includes(di.id));
      setItems(availableDefaults);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [user?.role, token]);

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const queryId = urlParams.get('id') || urlParams.get('product') || urlParams.get('item');
    const targetIdStr = id || queryId;

    if (targetIdStr && items.length > 0) {
      const itemId = parseInt(targetIdStr, 10);
      if (!isNaN(itemId)) {
        const found = items.find(item => item.id === itemId);
        if (found) {
          setSelectedProduct(found);
        }
      }
    } else if (!targetIdStr) {
      setSelectedProduct(null);
    }
  }, [id, items, location]);

  const getSubcategoryKey = (item: MarketplaceItem): string => {
    const cat = item.category_en.toLowerCase();
    if (cat.includes('free') || cat.includes('open source') || cat.includes('مفتوح') || cat.includes('مجاني')) {
      return 'free';
    }
    if (cat.includes('code') || cat.includes('api') || cat.includes('plugin') || cat.includes('saas') || cat.includes('system')) {
      return 'saas';
    }
    if (cat.includes('trading') || cat.includes('bot') || cat.includes('indicator') || cat.includes('strategy') || cat.includes('fintech')) {
      return 'trading-bots';
    }
    if (cat.includes('model') || cat.includes('ai') || cat.includes('agent') || cat.includes('automation')) {
      return 'ai-agents';
    }
    if (cat.includes('intelligence') || cat.includes('strategic') || cat.includes('knowledge') || cat.includes('ebook') || cat.includes('plr')) {
      return 'ebooks';
    }
    if (cat.includes('template') || cat.includes('figma') || cat.includes('ui') || cat.includes('design')) {
      return 'templates';
    }
    if (cat.includes('tool') || cat.includes('bundle') || cat.includes('kit') || cat.includes('startup')) {
      return 'startup-box';
    }
    return 'saas';
  };

  const getProductHighlights = (item: MarketplaceItem): string[] => {
    const list: string[] = [];
    if (item.highlight_tag) {
      list.push(item.highlight_tag);
    }
    if (item.views > 80 && !list.includes('trending')) list.push('trending');
    if (Number(item.price) > 300 && !list.includes('exclusive')) list.push('exclusive');
    if (list.length === 0) list.push('new');
    return Array.from(new Set(list));
  };

  const getProductFeatures = (item: MarketplaceItem, isAr: boolean) => {
    const desc = isAr ? item.description_ar : item.description_en;
    const bulletList = desc.split(/[,.،]/).map(s => s.trim()).filter(s => s.length > 5 && s.length < 50);
    if (bulletList.length >= 3) {
      return bulletList.slice(0, 4);
    }
    const cat = item.category_en.toLowerCase();
    if (cat.includes('code') || cat.includes('api') || cat.includes('plugin') || cat.includes('saas') || cat.includes('system')) {
      return isAr
        ? ['كود نظيف موثق بالكامل', 'سهل الإعداد والدمج والتشغيل', 'تحديثات مجانية مدى الحياة', 'لوحة تحكم إدارية متكاملة']
        : ['100% Clean documented code', 'Easy setup and custom integration', 'Lifetime continuous updates', 'High performance architecture'];
    }
    if (cat.includes('trading') || cat.includes('bot') || cat.includes('indicator') || cat.includes('strategy') || cat.includes('fintech')) {
      return isAr
        ? ['دقة عالية مع عتبات أمان متقدمة', 'تكامل فوري لرمز Pine / Python', 'إشعارات تيليغرام لحظية حية', 'استراتيجيات تداول آلية']
        : ['High-precision analytical triggers', 'Full Pine, Python & API support', 'Real-time Telegram integration', 'Automated trading algorithms'];
    }
    return isAr
      ? ['ترخيص كامل للتعديل والإنتاج', 'دعم فني كامل عبر المنصة', 'تحسينات مستمرة مجانية']
      : ['Full master reuse rights production', 'Direct technical support channels', 'Continuous product extensions'];
  };

  const getProductTech = (item: MarketplaceItem) => {
    const list: string[] = [];
    const descLower = (item.description_en + ' ' + item.title_en).toLowerCase();
    if (descLower.includes('react')) list.push('React');
    if (descLower.includes('next')) list.push('Next.js');
    if (descLower.includes('node')) list.push('Node.js');
    if (descLower.includes('python')) list.push('Python');
    if (descLower.includes('postgres')) list.push('PostgreSQL');
    if (descLower.includes('laravel') || descLower.includes('php')) list.push('Laravel');
    if (descLower.includes('flutter') || descLower.includes('dart')) list.push('Flutter');
    if (descLower.includes('pine') || descLower.includes('tradingview')) list.push('Pine Script');
    if (descLower.includes('figma')) list.push('Figma');
    if (descLower.includes('stripe')) list.push('Stripe');
    if (descLower.includes('firebase')) list.push('Firebase');
    if (descLower.includes('docker')) list.push('Docker');

    if (list.length === 0) {
      const sub = getSubcategoryKey(item);
      if (sub === 'saas' || sub === 'plugins') return ['TypeScript', 'Express', 'Vite'];
      if (sub === 'trading-bots' || sub === 'indicators') return ['Python', 'Pine Script', 'API'];
      if (sub === 'ai-agents') return ['Gemini API', 'Node.js', 'JSON-Schema'];
      return ['Digital Asset', 'Documentation'];
    }
    return list;
  };

  const getProgrammingLanguage = (item: MarketplaceItem) => {
    const descLower = (item.description_en + ' ' + item.title_en).toLowerCase();
    if (descLower.includes('python')) return 'Python';
    if (descLower.includes('typescript') || descLower.includes('next.js')) return 'TypeScript';
    if (descLower.includes('javascript') || descLower.includes('react')) return 'JavaScript';
    if (descLower.includes('php') || descLower.includes('laravel')) return 'PHP';
    if (descLower.includes('dart') || descLower.includes('flutter')) return 'Dart';
    if (descLower.includes('pine')) return 'Pine Script';
    return '-';
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImage(true);
    setUploadError('');
    const toastId = toast.loading(
      language === 'ar' ? 'جاري تحسين وتقليص صور المنتج...' : 'Optimizing and resizing product images...'
    );

    try {
      const filesArray = Array.from(files);
      for (const f of filesArray) {
        try {
          const compressed = await compressAndResizeImage(f, {
            format: 'feed',
            quality: 0.88,
            mimeType: 'image/webp'
          });

          const formData = new FormData();
          formData.append('file', compressed.file);

          const res = await fetch('/api/files/upload', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            },
            body: formData
          });

          if (res.ok) {
            const data = await res.json();
            const rawUrl = data.file?.file_url || data.fileUrl || data.file?.url || data.url;
            if (rawUrl) {
              const newUrl = getMediaUrl(rawUrl);
              setItemImages(prev => [...prev, newUrl]);
            }
          }
        } catch (singleErr) {
          console.error('Error processing image:', singleErr);
        }
      }
      toast.dismiss(toastId);
      toast.success(language === 'ar' ? 'تم رفع صور المنتج بنجاح!' : 'Product images uploaded successfully!');
    } catch (err) {
      console.error(err);
      toast.dismiss(toastId);
      setUploadError(language === 'ar' ? 'خطأ في رفع الصور.' : 'Error uploading images.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemTitleAr || !itemTitleEn || !itemDescAr || !itemDescEn || !itemPrice) return;

    setSubmitting(true);
    const catObj = children.find(c => c.id === itemCategory) || children[0];

    try {
      const parsedPrice = parseFloat(itemPrice);
      const discountPct = parseFloat(itemDiscount) || 0;
      const finalPrice = parsedPrice - (parsedPrice * (discountPct / 100));

      const url = editingProduct ? `/api/marketplace/items/${editingProduct.id}` : '/api/marketplace/items';
      const method = editingProduct ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title_ar: itemTitleAr,
          title_en: itemTitleEn,
          description_ar: itemDescAr,
          description_en: itemDescEn,
          price: finalPrice,
          category_en: catObj.nEn,
          category_ar: catObj.nAr,
          image_url: itemImages.length > 0 ? itemImages.join(',') : 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1080&h=1080&fit=crop',
          contact_link: null,
          download_url: itemLinkDownload,
          preview_url: itemLinkPreview,
          video_url: itemLinkVideo,
          features: itemFeatures,
          technologies: itemTools,
          referral_percent: itemReferralPercent ? parseFloat(itemReferralPercent) : null,
          highlight_tag: itemHighlightTag || null,
          license_type: itemLicenseType || null
        })
      });

      if (res.ok) {
        setSubmitSuccess(true);
        toast.success(editingProduct ? (language === 'ar' ? 'تم حفظ التعديلات بنجاح' : 'Changes saved successfully') : t.successMsg);
        setTimeout(() => {
          setIsCreateOpen(false);
          setSubmitSuccess(false);
          setEditingProduct(null);
          setItemTitleAr('');
          setItemTitleEn('');
          setItemDescAr('');
          setItemDescEn('');
          setItemPrice('');
          setItemDiscount('');
          setItemReferralPercent('20');
          setItemHighlightTag('');
          setItemLicenseType('mit');
          setItemContact('');
          setItemImages([]);
          setItemLinkPreview('');
          setItemLinkVideo('');
          setItemLinkDownload('');
          setItemLang('');
          setItemTools('');
          setItemFeatures('');
          setSelectedHighlights([]);
          setSelectedLicenses(['regular']);
          fetchItems();
        }, 2000);
      } else {
        const errData = await res.json();
        toast.error(errData.error || 'Operation failed');
      }
    } catch (err) {
      console.error(err);
      toast.error('Connection error');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleParent = (pId: string) => {
    setOpenParents(prev => {
      const next: Record<string, boolean> = {};
      Object.keys(prev).forEach(key => {
        next[key] = false;
      });
      next[pId] = !prev[pId];
      return next;
    });
  };

  const fCat = (id: string) => {
    setSelectedCategory(id);
    const matchedChild = children.find(c => c.id === id);
    if (matchedChild) {
      setOpenParents(prev => {
        const next: Record<string, boolean> = {};
        Object.keys(prev).forEach(key => {
          next[key] = false;
        });
        next[matchedChild.parent] = true;
        return next;
      });
    }
  };

  const filteredItems = items.filter(item => {
    const title = language === 'ar' ? item.title_ar : item.title_en;
    const desc = language === 'ar' ? item.description_ar : item.description_en;
    const catAr = item.category_ar;
    const catEn = item.category_en;

    const tech = item.technologies || '';
    const highlight = item.highlight_tag || '';
    const features = item.features || '';

    const matchesSearch =
      title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
      catAr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      catEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tech.toLowerCase().includes(searchQuery.toLowerCase()) ||
      highlight.toLowerCase().includes(searchQuery.toLowerCase()) ||
      features.toLowerCase().includes(searchQuery.toLowerCase());

    let matchesCategory = true;
    if (selectedCategory !== 'all') {
      const isParent = parents.some(p => p.id === selectedCategory);
      if (isParent) {
        const matchingKids = children.filter(c => c.parent === selectedCategory).map(c => c.nEn.toLowerCase());
        matchesCategory = matchingKids.includes(catEn.toLowerCase());
      } else {
        const matchingKid = children.find(c => c.id === selectedCategory);
        if (matchingKid) {
          matchesCategory = catEn.toLowerCase() === matchingKid.nEn.toLowerCase();
        }
      }
    }

    let matchesPrice = true;
    const parsedPrice = Number(item.price);
    if (selectedPriceRange === '0-100') matchesPrice = parsedPrice <= 100;
    else if (selectedPriceRange === '100-500') matchesPrice = parsedPrice > 100 && parsedPrice <= 500;
    else if (selectedPriceRange === '500+') matchesPrice = parsedPrice > 500;

    return matchesSearch && matchesCategory && matchesPrice;
  }).sort((a, b) => {
    if (sortBy === 'price-asc') {
      return Number(a.price) - Number(b.price);
    }
    if (sortBy === 'price-desc') {
      return Number(b.price) - Number(a.price);
    }
    // Default (recent): Newest first
    const dateA = new Date(a.created_at || 0).getTime();
    const dateB = new Date(b.created_at || 0).getTime();
    if (dateB === dateA) {
      return b.id - a.id;
    }
    return dateB - dateA;
  });

  const getLicensePriceMultiplier = (license: string): number => {
    switch (license) {
      case 'extended': return 2.5;
      case 'gpl': return 1.5;
      case 'plr': return 5.0;
      default: return 1.0;
    }
  };

  const getPreviewAssets = (product: MarketplaceItem) => {
    const assets: { type: 'image' | 'iframe' | 'pdf'; url: string; titleEn: string; titleAr: string }[] = [];

    // Main & Gallery Images
    const imageUrls = product.image_url 
      ? product.image_url.split(',').map(url => url.trim()).filter(Boolean) 
      : ['https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1080&h=1080&fit=crop'];

    imageUrls.forEach((url, index) => {
      assets.push({
        type: 'image',
        url,
        titleEn: index === 0 ? 'Main Product Presentation' : `Product Gallery Image ${index + 1}`,
        titleAr: index === 0 ? 'المخطط التعريفي والواجهة للمنتج' : `صورة المنتج الإضافية ${index + 1}`
      });
    });

    // Custom Preview URL from user
    if (product.preview_url && product.preview_url.trim()) {
      const url = product.preview_url.trim();
      const lowerUrl = url.toLowerCase();
      
      let type: 'image' | 'iframe' | 'pdf' = 'iframe';
      let titleEn = 'Interactive Web Demonstration / Live Frame';
      let titleAr = 'نموذج محاكاة تفاعلي مباشر وبوابة عرض';

      if (lowerUrl.endsWith('.pdf') || lowerUrl.includes('/pdf/') || lowerUrl.includes('drive.google.com') || lowerUrl.includes('document')) {
        type = 'pdf';
        titleEn = 'Product Feature Specification / Documentation PDF';
        titleAr = 'كراسة المواصفات الرقمية والتوثيق المرجعي (PDF)';
      } else if (/\.(jpg|jpeg|png|webp|gif|svg)$/i.test(lowerUrl) || lowerUrl.includes('unsplash.com') || lowerUrl.includes('images.')) {
        type = 'image';
        titleEn = 'Core System Blueprint & Software Workspace';
        titleAr = 'هيكل النظام ولوحة التحكم المعمارية';
      }

      assets.push({
        type,
        url,
        titleEn,
        titleAr
      });
    }

    // Category specific premium static mockups for complete design presentation and immersive galleries
    const categoryKey = getSubcategoryKey(product);
    
    const categoryMocks: Record<string, { url: string; en: string; ar: string }[]> = {
      saas: [
        { url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&fit=crop', en: 'Analytical Control Dashboard & Real-Time Node Tracking', ar: 'شاشة مراقبة العمليات البرمجية والمقاييس الذكية' },
        { url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&fit=crop', en: 'Platform Component Orchestrator & Task Pipelines Layout', ar: 'مخطط مكونات الواجهة وتوزيع وتصميم الإجراءات' },
        { url: 'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=1200&fit=crop', en: 'System Settings, API Sandbox & Performance Monitor', ar: 'لوحة التحكم ببارامترات التشغيل ومراقبة جودة الضخ الرقمي' }
      ],
      mobile: [
        { url: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=1200&fit=crop', en: 'Premium Native App Screens & Fluid Interaction Mockups', ar: 'المخطط السيميائي والواجهات التفاعلية للهواتف المحمولة' },
        { url: 'https://images.unsplash.com/photo-1555421689-491a97ff2040?w=1200&fit=crop', en: 'Workspace Dark Mode Visual Architecture & User Profiles', ar: 'بنية الواجهات الداكنة ولوحة الحساب السحابي للعميل' }
      ],
      templates: [
        { url: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=1200&fit=crop', en: 'Component Grid Layout & Adaptive Style Presets Canvas', ar: 'مصفوفة الترتيب الشبكي والجماليات المخصصة لكتل البرمجة' },
        { url: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=1200&fit=crop', en: 'UI Wireframing & Responsive Structural Design Library', ar: 'مكتبة الواجهات وعناصر figma الجاهزة متعددة الهيكلية' }
      ],
      'ai-agents': [
        { url: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?w=1200&fit=crop', en: 'Neural Flow Controller & Prompt Sequence Model Settings', ar: 'لوحة تحكم المسارات العصبية وتسلسل النماذج التوليدية' },
        { url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&fit=crop', en: 'Autonomous Automation Execution Frame and Web-Scraping Pipeline', ar: 'إطار المعالجة الذاتية التلقائية وصندوق أدوات الأتمتة' }
      ],
      'trading-bots': [
        { url: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1200&fit=crop', en: 'Quant High-Frequency Technical Graphs & Trade Logger', ar: 'رسوم بيانية كمية سريعة وسجل المعاملات الفورية للماتريكس' },
        { url: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=1200&fit=crop', en: 'Risk Assessor Engine Dashboard & Profit/Loss Visualizers', ar: 'واجهة مقيمي المخاطر المالية ونواتج الأرباح والنسب' }
      ]
    };

    const mocks = categoryMocks[categoryKey] || [
      { url: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=1200&fit=crop', en: 'Digital Workspace Structure Overview', ar: 'نظرة عامة على هيكلية ووثائق المنتج البرمجي والمرافق' },
      { url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&fit=crop', en: 'Functional Blueprint & System Specifications Sheet', ar: 'كراسة الإجراءات الهندسية ومحيط العمل والمنظومة البرمجية' }
    ];

    mocks.forEach((m) => {
      assets.push({
        type: 'image',
        url: m.url,
        titleEn: m.en,
        titleAr: m.ar
      });
    });

    return assets;
  };

  const getComputedPrice = (): number => {
    if (!selectedProduct) return 0;
    const base = Number(selectedProduct.price);
    const multi = getLicensePriceMultiplier(selectedLicenseType);
    return Math.round(base * multi);
  };

  const handleBuyWithWallet = async () => {
    if (!user) {
      toast.error(language === 'ar' ? 'يرجى تسجيل الدخول أولاً لإجراء هذه المعاملة' : 'Please log in to complete this transaction.');
      return;
    }

    if (!selectedProduct) return;

    const price = getComputedPrice();
    if (balanceUSD < price) {
      setBuyingProgress('insufficient');
      return;
    }

    setBuyingProgress('purchasing');
    try {
      const storedRef = referralCode || localStorage.getItem('perplexta_marketplace_ref') || '';
      const response = await fetch('/api/marketplace/buy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          itemId: selectedProduct.id,
          licenseType: selectedLicenseType,
          referralCode: storedRef
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to complete acquisition.');
      }

      setBuyingProgress('success');
      toast.success(t.purchaseDone);
      refreshUser();
      
      // Clear referral trackers as they have successfully bought the product and allocated the rewards
      localStorage.removeItem('perplexta_marketplace_ref');
      setReferralCode('');

      setTimeout(() => {
        setSelectedProduct(null);
        setBuyingProgress('idle');
      }, 3000);

    } catch (err: any) {
      setBuyingProgress('idle');
      toast.error(err.message || (language === 'ar' ? 'حدث خطأ أثناء معالجة الدفع.' : 'An error occurred during payment processing.'));
    }
  };

  const handleBuyWithStripe = async () => {
    if (!user) {
      toast.error(language === 'ar' ? 'يرجى تسجيل الدخول أولاً لإجراء هذه المعاملة' : 'Please log in to complete this transaction.');
      return;
    }

    if (!selectedProduct) return;

    setBuyingProgress('purchasing');
    try {
      const storedRef = referralCode || localStorage.getItem('perplexta_marketplace_ref') || '';
      const response = await fetch('/api/marketplace/create-stripe-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          itemId: selectedProduct.id,
          licenseType: selectedLicenseType,
          referralCode: storedRef
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to complete Stripe setup.');
      }

      if (data.url) {
        toast.info(language === 'ar' ? 'جاري توجيهك إلى بوابة الدفع الآمنة (Stripe)...' : 'Redirecting you to secure Stripe payment gateway...');
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received from server');
      }
    } catch (err: any) {
      setBuyingProgress('idle');
      toast.error(err.message || (language === 'ar' ? 'حدث خطأ أثناء الاتصال ببوابة الدفع.' : 'An error occurred connecting to the payment gateway.'));
    }
  };

  const handleAddToCart = (product: MarketplaceItem, licenseType: string) => {
    const base = Number(product.price);
    const multiplier = getLicensePriceMultiplier(licenseType);
    const price = Math.round(base * multiplier);
    
    const idStr = `${product.id}_${licenseType}`;
    
    if (cart.some(item => item.id === idStr)) {
      toast.error(language === 'ar' ? 'هذا المنتج مرخصًا بالكامل موجود بالفعل في سلتك' : 'This product under this license is already in your cart.');
      return;
    }
    
    const newItem: CartItem = {
      id: idStr,
      product,
      licenseType,
      price
    };
    
    setCart([...cart, newItem]);
    toast.success(language === 'ar' ? 'تمت إضافة المنتج إلى سلة المشتريات مسبقًا!' : 'Product added to shopping cart successfully!');
  };

  const handleRemoveFromCart = (idStr: string) => {
    setCart(cart.filter(item => item.id !== idStr));
    toast.success(language === 'ar' ? 'تم إزالة المنتج من السلة' : 'Item removed from cart.');
  };

  const handleCartCheckoutWithWallet = async () => {
    if (!user) {
      toast.error(language === 'ar' ? 'يرجى تسجيل الدخول أولاً لإجراء هذه المعاملة' : 'Please log in to complete this transaction.');
      return;
    }

    if (cart.length === 0) return;

    const total = cart.reduce((sum, item) => sum + item.price, 0);
    if (balanceUSD < total) {
      setBuyingProgress('insufficient');
      return;
    }

    setBuyingProgress('purchasing');
    try {
      const storedRef = referralCode || localStorage.getItem('perplexta_marketplace_ref') || '';
      const requestItems = cart.map(item => ({
        itemId: item.product.id,
        licenseType: item.licenseType
      }));

      const response = await fetch('/api/marketplace/cart/buy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          items: requestItems,
          referralCode: storedRef
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to complete acquisition.');
      }

      setBuyingProgress('success');
      toast.success(language === 'ar' ? 'تم شراء المنتجات المحددة بنجاح!' : 'All cart items have been purchased successfully!');
      setCart([]);
      refreshUser();

      localStorage.removeItem('perplexta_marketplace_ref');
      setReferralCode('');

      setTimeout(() => {
        setBuyingProgress('idle');
        setIsCartOpen(false);
      }, 2500);

    } catch (err: any) {
      setBuyingProgress('idle');
      toast.error(err.message || (language === 'ar' ? 'حدث خطأ أثناء معالجة الدفع.' : 'An error occurred during payment processing.'));
    }
  };

  const handleCartCheckoutWithStripe = async () => {
    if (!user) {
      toast.error(language === 'ar' ? 'يرجى تسجيل الدخول أولاً لإجراء هذه المعاملة' : 'Please log in to complete this transaction.');
      return;
    }

    if (cart.length === 0) return;

    setBuyingProgress('purchasing');
    try {
      const storedRef = referralCode || localStorage.getItem('perplexta_marketplace_ref') || '';
      const requestItems = cart.map(item => ({
        itemId: item.product.id,
        licenseType: item.licenseType
      }));

      const response = await fetch('/api/marketplace/cart/create-stripe-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          items: requestItems,
          referralCode: storedRef
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to initiate checkout.');
      }

      if (data.url) {
        toast.info(language === 'ar' ? 'جاري توجيهك إلى بوابة الدفع الآمنة (Stripe)...' : 'Redirecting to secure Stripe payment gateway...');
        setCart([]);
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received from server');
      }
    } catch (err: any) {
      setBuyingProgress('idle');
      toast.error(err.message || (language === 'ar' ? 'حدث خطأ أثناء الاتصال بمزود الدفع.' : 'An error occurred connecting to the payment gateway.'));
    }
  };

  const isThemeDark = theme === 'dark';

  return (
    <div
      className={`h-full w-full flex flex-col overflow-hidden relative transition-colors duration-300 select-none ${
        isThemeDark ? 'bg-[#050505] text-white' : 'bg-[var(--bg-base)] text-gray-900'
      }`}
      dir={dir}
    >
      <div className={`absolute inset-0 pointer-events-none opacity-[0.25] ${
        isThemeDark
          ? 'bg-[radial-gradient(rgba(255,255,255,0.02)_1px,transparent_1px)]'
          : 'bg-[radial-gradient(rgba(0,0,0,0.015)_1px,transparent_1px)]'
        } bg-[size:28px_28px]`}
      />

      {/* Main Content Card Wrapper - Integrated full screen with no outer margins */}
      <div className={`w-full h-full flex flex-col overflow-hidden relative z-10 ${
        isThemeDark
          ? 'bg-[#080808]/95 shadow-black/80'
          : 'bg-white shadow-gray-200/50'
      }`}>

        {/* Header Block with Emerald Line Accent */}
        <header className={`p-6 md:px-8 md:py-6 border-b relative select-none flex-shrink-0 ${
          isThemeDark ? 'border-white/5 bg-[#080808]' : 'border-gray-200/80 bg-white'
        }`}>
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="space-y-1">
                <h1 className="text-xl md:text-2xl font-black tracking-tight">
                  {language === 'ar' ? (
                    <>
                      <span className="text-emerald-600 dark:text-emerald-400 drop-shadow-[0_0_12px_rgba(16,185,129,0.15)] dark:drop-shadow-[0_0_12px_rgba(16,185,129,0.35)]">سوق بيربليكستا </span>
                      <span className="text-gray-900 dark:text-white">للمنتجات الرقمية</span>
                    </>
                  ) : (
                    <span className="text-emerald-600 dark:text-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.15)] dark:drop-shadow-[0_0_12px_rgba(52,211,153,0.35)]">{t.title}</span>
                  )}
                </h1>
                <p className={`text-[10px] md:text-xs font-semibold leading-relaxed ${
                  isThemeDark ? 'text-gray-400/80' : 'text-gray-500'
                }`}>
                  {t.subtitle}
                </p>
              </div>

              <div className="flex items-center gap-3">
                {user && (
                  <>
                    <button
                      onClick={() => navigate('/settings?tab=marketplace_purchases')}
                      className="h-10 px-4 rounded-[4px] bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/25 dark:border-amber-500/30 text-amber-600 dark:text-amber-400 font-bold transition-theme active:scale-95 text-xs flex items-center justify-center gap-1.5 hover:drop-shadow-[0_0_8px_rgba(245,158,11,0.5)] cursor-pointer"
                    >
                      <ShoppingBag size={14} />
                      <span>{language === 'ar' ? 'حقيبة تنزيلاتي ومشترياتي' : 'My Purchases & Downloads'}</span>
                    </button>

                    {canPublish && (
                      <button
                        onClick={() => {
                          resetForm();
                          setIsCreateOpen(true);
                        }}
                        className="h-10 px-4 rounded-[4px] bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/25 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold transition-theme active:scale-95 text-xs flex items-center justify-center gap-1.5 hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.5)] cursor-pointer"
                      >
                        <Plus size={14} />
                        <span>{t.listNewAsset}</span>
                      </button>
                    )}

                    <button
                      onClick={() => setIsCartOpen(true)}
                      className="w-10 h-10 rounded-[4px] border border-emerald-500/25 bg-emerald-500/5 text-emerald-500 flex items-center justify-center relative active:scale-95 cursor-pointer transition-theme hover:bg-emerald-500/15 hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]"
                      title={language === 'ar' ? 'سلة المشتريات' : 'Shopping Cart'}
                    >
                      <ShoppingCart size={16} />
                      {cart.length > 0 && (
                        <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[8px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center animate-pulse">
                          {cart.length}
                        </span>
                      )}
                    </button>
                  </>
                )}
                
                <button
                  onClick={() => setIsMobileMenuOpen(true)}
                  className={`lg:hidden w-10 h-10 rounded-[4px] border flex items-center justify-center transition-colors ${
                    isThemeDark ? 'border-white/5 bg-white/5 text-gray-300 hover:text-white' : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <SlidersHorizontal size={16} />
                </button>
              </div>
            </div>

            {/* Sub-header Filter and Search bar */}
            <div className={`mt-6 p-2 rounded-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border ${
              isThemeDark ? 'bg-[#07080a] border-white/5' : 'bg-[#fafafa] border-gray-200/80'
            }`}>
              
              <div className="flex items-center gap-1 overflow-x-auto scrollbar-none px-1 py-0.5 flex-1 min-w-0">
                <button
                  onClick={() => fCat('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-colors ${
                    selectedCategory === 'all'
                      ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.2)] dark:drop-shadow-[0_0_8px_rgba(16,185,129,0.3)] font-black'
                      : (isThemeDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-500 hover:text-gray-850')
                  }`}
                >
                  {t.allCategories}
                </button>
                {parents.map(p => {
                  const chList = children.filter(c => c.parent === p.id);
                  const isParentActive = selectedCategory === p.id || chList.some(c => c.id === selectedCategory);
                  return (
                    <button
                      key={p.id}
                      onClick={() => fCat(p.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-theme ${
                        isParentActive
                          ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.2)] dark:drop-shadow-[0_0_8px_rgba(16,185,129,0.3)] font-black'
                          : (isThemeDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-500 hover:text-gray-800')
                      }`}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <span style={{ color: p.co }}>{getCategoryIcon(p.id, "w-3 h-3")}</span>
                        <span>{language === 'ar' ? p.nAr : p.nEn}</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-shrink-0 w-full sm:w-auto">
                <div className={`flex items-center border rounded-lg px-3 py-1.5 w-full sm:w-64 md:w-72 transition-theme ${
                  isThemeDark ? 'bg-black/40 border-white/10 focus-within:border-emerald-500/35' : 'bg-white border-gray-200 focus-within:border-emerald-500/35'
                }`}>
                  <Search size={14} className="text-gray-400 shrink-0" />
                  <input
                    type="text"
                    placeholder={t.searchPlaceholder}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`flex-1 bg-transparent text-xs placeholder-gray-500 outline-none px-2 ${
                      isThemeDark ? 'text-white' : 'text-gray-800'
                    }`}
                  />
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0 select-none">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className={`h-8 px-2 border rounded-lg text-[11px] font-bold outline-none cursor-pointer transition-theme ${
                      isThemeDark ? 'bg-black/45 border-white/10 focus:border-emerald-500/40 text-gray-200' : 'bg-white border-gray-250 focus:border-emerald-500/40 text-gray-750'
                    }`}
                  >
                    <option className={isThemeDark ? 'bg-[#0f0f11] text-white' : 'bg-white text-gray-800'} value="recent">
                      {t.sortByRecent}
                    </option>
                    <option className={isThemeDark ? 'bg-[#0f0f11] text-white' : 'bg-white text-gray-800'} value="price-asc">
                      {t.sortByPriceAsc}
                    </option>
                    <option className={isThemeDark ? 'bg-[#0f0f11] text-white' : 'bg-white text-gray-800'} value="price-desc">
                      {t.sortByPriceDesc}
                    </option>
                  </select>
                </div>
              </div>

            </div>
          </header>

          {/* Interactive Layout Body */}
          <div className="flex flex-1 overflow-hidden">
            
            {/* Desktop Sidebar */}
            <aside className={`hidden lg:flex flex-col w-56 shrink-0 p-4 space-y-4 border-r select-none overflow-hidden ${
              isThemeDark ? 'bg-[#0a0a0c]/40 border-white/5' : 'bg-gray-50/50 border-gray-150'
            }`}>
              {/* Accordion Categories */}
              <div className="flex-1 overflow-y-auto scrollbar-none space-y-3 pr-0.5 pb-2">
                <div className="text-[9px] font-black uppercase tracking-wider text-gray-500 px-1">
                  {t.mainCategories}
                </div>
                
                <div className="space-y-0.5">
                  <div
                    onClick={() => fCat('all')}
                    className={`flex items-center gap-2 rounded px-2.5 py-1.5 text-[10px] font-bold cursor-pointer transition-colors ${
                      selectedCategory === 'all'
                        ? 'bg-emerald-500/10 text-emerald-400 border-r-2 border-emerald-500'
                        : (isThemeDark ? 'hover:bg-white/5 text-gray-400 hover:text-gray-200' : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900')
                    }`}
                  >
                    <Grid size={11} className="text-emerald-400 shrink-0" />
                    <span>{t.allCategories}</span>
                  </div>

                  {parents.map(p => {
                    const isParentSelected = selectedCategory === p.id;
                    const isOpen = openParents[p.id];
                    const categoryChildrenList = children.filter(c => c.parent === p.id);
                    const hasActiveChild = categoryChildrenList.some(c => c.id === selectedCategory);

                    return (
                      <div key={p.id} className="space-y-0.5">
                        <div
                          onClick={() => {
                            fCat(p.id);
                            toggleParent(p.id);
                          }}
                          className={`flex items-center justify-between rounded px-2.5 py-1.5 text-[10px] font-black cursor-pointer transition-colors ${
                            isParentSelected || hasActiveChild
                              ? 'bg-emerald-500/5 text-emerald-400'
                              : (isThemeDark ? 'hover:bg-white/5 text-gray-400 hover:text-gray-200' : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900')
                          }`}
                        >
                          <span className="flex items-center gap-1.5 truncate">
                            <span style={{ color: p.co }}>{getCategoryIcon(p.id, "w-3 h-3 shrink-0")}</span>
                            <span className="truncate">{language === 'ar' ? p.nAr : p.nEn}</span>
                          </span>
                          <ChevronDown
                            size={12}
                            className={`transform transition-transform text-gray-500 shrink-0 ${isOpen ? 'rotate-180' : ''}`}
                          />
                        </div>

                        <AnimatePresence initial={false}>
                          {isOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                              className="pl-4 space-y-0.5 mt-0.5 overflow-hidden"
                            >
                              {categoryChildrenList.map(c => {
                                const isChildSelected = selectedCategory === c.id;
                                return (
                                  <div
                                    key={c.id}
                                    onClick={() => fCat(c.id)}
                                    className={`rounded px-2.5 py-1 text-[9px] font-bold cursor-pointer transition-colors duration-200 ${
                                      isChildSelected
                                        ? 'bg-emerald-500/10 text-emerald-400 border-r-2 border-emerald-500 font-extrabold'
                                        : (isThemeDark ? 'hover:bg-white/5 text-gray-500 hover:text-gray-300' : 'hover:bg-gray-100 text-gray-650 hover:text-gray-900')
                                    }`}
                                  >
                                    {language === 'ar' ? c.nAr : c.nEn}
                                  </div>
                                );
                              })}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Price Filter Group */}
              <div className="space-y-2.5 pt-3 border-t border-[var(--border-main)] dark:border-white/5">
                <div className="text-[9px] font-black uppercase tracking-wider text-gray-500 px-1">
                  {t.priceFilter}
                </div>
                
                <div className="space-y-1.5">
                  {[
                    { label: t.priceAll, val: 'all' },
                    { label: '$0 – $100', val: '0-100' },
                    { label: '$100 – $500', val: '100-500' },
                    { label: '$500+', val: '500+' }
                  ].map(pItem => (
                    <label
                      key={pItem.val}
                      className={`flex items-center gap-2 text-[10px] font-bold cursor-pointer transition-colors ${
                        selectedPriceRange === pItem.val
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : (isThemeDark ? 'text-gray-400 hover:text-gray-250' : 'text-gray-600 hover:text-gray-950')
                      }`}
                    >
                      <input
                        type="radio"
                        name="priceRangeRadio"
                        value={pItem.val}
                        checked={selectedPriceRange === pItem.val}
                        onChange={(e) => setSelectedPriceRange(e.target.value)}
                        className="accent-emerald-500 w-3 h-3"
                      />
                      <span>{pItem.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </aside>

            {/* Main Product Catalog Grid */}
            <main className="flex-1 p-6 md:p-8 overflow-y-auto">
              
              {/* Recommendation Widget Bar */}
              <RecommendationWidget 
                filterType="marketplace" 
                limit={4} 
                className="mb-8 p-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm" 
              />
              
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className={`rounded-xl border flex flex-col h-[390px] animate-pulse ${
                      isThemeDark ? 'bg-[#090a0c]/80 border-white/5' : 'bg-white border-gray-150'
                    }`}>
                      {/* Image Block Skeleton */}
                      <div className="h-40 bg-gray-200/10 dark:bg-gray-800/15 shrink-0" />
                      {/* Body Skeleton */}
                      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                        <div className="space-y-2">
                          <div className="h-3 bg-gray-200/15 dark:bg-gray-800/20 rounded w-1/3" />
                          <div className="h-5 bg-gray-200/20 dark:bg-gray-800/25 rounded w-3/4" />
                          <div className="h-3.5 bg-gray-200/10 dark:bg-gray-800/15 rounded w-full" />
                          <div className="h-3.5 bg-gray-200/10 dark:bg-gray-800/15 rounded w-5/6" />
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-gray-200/10 dark:border-gray-800/10">
                          <div className="h-4 bg-gray-200/25 dark:bg-gray-800/30 rounded w-16" />
                          <div className="h-7 bg-gray-200/20 dark:bg-gray-800/25 rounded-[4px] w-20" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="py-24 flex flex-col items-center justify-center text-gray-500 max-w-sm mx-auto text-center space-y-3">
                  <ShoppingBag size={40} className="opacity-30" />
                  <p className="text-xs font-semibold leading-relaxed">{t.noProducts}</p>
                </div>
              ) : (
                <motion.div
                  id="product-list-container"
                  key={sortBy}
                  initial="hidden"
                  animate="visible"
                  variants={{
                    hidden: { opacity: 0 },
                    visible: {
                      opacity: 1,
                      transition: {
                        staggerChildren: 0.05
                      }
                    }
                  }}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6"
                >
                  <AnimatePresence mode="wait">
                    {filteredItems.map(item => {
                      const hList = getProductHighlights(item);
                      const isTrending = hList.includes('trending');
                      const isFeatured = hList.includes('featured');
                      const isExclusive = hList.includes('exclusive');
                      const isNew = hList.includes('new');

                      return (
                        <motion.div
                          key={item.id}
                          variants={{
                            hidden: { opacity: 0, y: 15 },
                            visible: { opacity: 1, y: 0 }
                          }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          whileHover={{ y: -6, transition: { duration: 0.25, ease: "easeOut" } }}
                          transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                          onClick={() => navigate(`/marketplace/${item.id}`)}
                          className={`rounded-xl border overflow-hidden transition-theme flex flex-col h-full cursor-pointer relative group ${
                            isThemeDark
                              ? 'bg-[#090a0c] border-white/5 hover:border-emerald-500/20 hover:shadow-[0_15px_30px_rgba(0,0,0,0.8)]'
                              : 'bg-white border-gray-150 hover:border-emerald-500/30 hover:shadow-[0_15px_30px_rgba(0,0,0,0.05)]'
                          }`}
                        >
                          {/* Bento Product Header Cover */}
                          <div className="h-40 relative overflow-hidden bg-black/45 shrink-0 select-none">
                            <img
                              src={getMediaUrl(item.image_url) || 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1080&h=1080&fit=crop'}
                              alt={language === 'ar' ? item.title_ar : item.title_en}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            />
                            <div className={`absolute inset-0 bg-gradient-to-t ${isThemeDark ? 'from-[#090a0c]' : 'from-white/40'} via-transparent to-transparent opacity-60`} />

                            {/* Status Badge overlay for admins or listing owners */}
                            {(user?.role === 'admin' || (item.user_id === user?.id && item.status !== 'approved')) && (
                              <div className="absolute top-2 left-10 z-10">
                                <span className={`text-[8px] font-black px-2 py-0.5 rounded-[4px] backdrop-blur-md border uppercase inline-flex items-center gap-1 ${
                                  item.status === 'approved' 
                                    ? 'bg-emerald-500/80 border-emerald-400 text-black'
                                    : item.status === 'rejected'
                                      ? 'bg-rose-500/80 border-rose-400 text-white'
                                      : 'bg-amber-500/80 border-amber-400 text-black'
                                }`}>
                                  {language === 'ar' 
                                    ? (item.status === 'approved' ? 'مقبول / منشور' : item.status === 'rejected' ? 'مرفوض / محجوب' : 'معلق للمراجعة') 
                                    : (item.status || 'pending')}
                                </span>
                              </div>
                            )}

                            <div className="absolute bottom-2 right-2 flex items-center gap-1.5 select-none">
                              <span className="text-[8px] font-black px-2 py-0.5 rounded bg-black/70 backdrop-blur-md border border-white/10 text-white flex items-center gap-1">
                                {getCategoryIcon(getSubcategoryKey(item), 'w-2.5 h-2.5 text-emerald-400')}
                                <span>{language === 'ar' ? item.category_ar : item.category_en}</span>
                              </span>
                            </div>
                          </div>

                          {/* Bento Body */}
                          <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                            <div className="space-y-1">
                              <h3 className={`text-xs font-black tracking-tight line-clamp-1 leading-snug transition-colors group-hover:text-emerald-500 dark:group-hover:text-emerald-400 ${isThemeDark ? 'text-white' : 'text-gray-900'}`}>
                                {language === 'ar' ? item.title_ar : item.title_en}
                              </h3>
                              <p className={`text-[9px] line-clamp-2 leading-relaxed ${
                                isThemeDark ? 'text-gray-400' : 'text-gray-600'
                              }`}>
                                {language === 'ar' ? item.description_ar : item.description_en}
                              </p>
                            </div>

                            <div className="pt-2 border-t border-[var(--border-main)] dark:border-white/5 flex items-center justify-between gap-1">
                              <div className="flex flex-col gap-1 min-w-0">
                                <span className="text-xs sm:text-sm font-black font-sans text-emerald-600 dark:text-emerald-400 tracking-tight shrink-0">
                                  {parseFloat(item.price.toString()) <= 0
                                    ? (language === 'ar' ? 'مجانًا' : 'FREE')
                                    : `$${parseFloat(item.price.toString()).toLocaleString()}`}
                                </span>
                                {/* Badge under price with exceptional premium visual shadow values */}
                                <div className="flex flex-wrap gap-1 mt-1 select-none">
                                  {getProductHighlights(item).map((tag) => {
                                    const details = getHighlightDetails(tag);
                                    if (!details) return null;
                                    return (
                                      <span
                                        key={tag}
                                        className={`px-1.5 py-0.5 rounded-[4px] border text-[8.5px] font-black flex items-center gap-0.5 transition-theme transform hover:scale-105 shrink-0 ${details.colorClass}`}
                                      >
                                        {details.icon}
                                        <span>{language === 'ar' ? details.labelAr : details.labelEn}</span>
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>
                              
                              <button className={`px-2 py-1 text-[10px] font-black rounded-[4px] transition-theme flex items-center gap-1 border shrink-0 ${
                                isThemeDark
                                  ? 'bg-[#10b981]/5 border-[#10b981]/15 text-emerald-400 hover:bg-[#10b981]/15 hover:border-[#10b981]/35 hover:shadow-[0_0_8px_rgba(16,185,129,0.4)]'
                                  : 'bg-emerald-500/5 border-emerald-500/15 text-emerald-700 hover:bg-emerald-500/10 hover:border-emerald-500/25 hover:shadow-[0_0_8px_rgba(16,185,129,0.15)]'
                              }`}>
                                <span>{language === 'ar' ? 'عرض التفاصيل' : 'View Details'}</span>
                                {dir === 'rtl' ? <ArrowLeft size={10} strokeWidth={3} className="text-emerald-500" /> : <ArrowRight size={10} strokeWidth={3} className="text-emerald-500" />}
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </motion.div>
              )}

            </main>
          </div>

          {/* Footer Block */}
          <footer className={`p-4 border-t text-[10px] select-none flex-shrink-0 ${
            isThemeDark ? 'bg-[#080808] border-white/5 text-gray-500' : 'bg-gray-50 border-gray-150 text-gray-600'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-center sm:text-right">
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                <span className="font-sans font-black tracking-widest text-[9px] uppercase">
                  PERPLEXTA PLATFORM MARKETPLACE SYSTEM
                </span>
                <div className="flex items-center justify-center gap-2.5 text-[9px] text-emerald-500 font-bold">
                  <span onClick={() => navigate('/about')} className="cursor-pointer hover:underline">{language === 'ar' ? 'من نحن' : 'About Us'}</span>
                  <span className="text-gray-500/20">•</span>
                  <span onClick={() => navigate('/terms')} className="cursor-pointer hover:underline">{language === 'ar' ? 'الشروط والأحكام' : 'Terms & Conditions'}</span>
                  <span className="text-gray-500/20">•</span>
                  <span onClick={() => navigate('/privacy')} className="cursor-pointer hover:underline">{language === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy'}</span>
                </div>
              </div>
              <span>
                {language === 'ar' ? 'الموقع محفوظ لـ ViralLinkUp 2026 ©' : 'All Sovereignties Reserved ViralLinkUp 2026 ©'}
              </span>
            </div>
          </footer>

      </div>

      {/* Mobile Drawer Menu - Fold-out panel from leading edge */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-[120] flex items-stretch outline-none">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute inset-0 bg-black/85 backdrop-blur-md"
            />

            <motion.div
              initial={{ x: dir === 'rtl' ? '100%' : '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: dir === 'rtl' ? '100%' : '-100%' }}
              transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
              className={`relative w-[280px] flex flex-col p-5 space-y-6 max-h-screen overflow-y-auto ${
                isThemeDark ? 'bg-[#080808] text-white border-l border-white/10' : 'bg-white text-gray-900 border-r border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between border-b border-[var(--border-main)] dark:border-white/5 pb-3">
                <span className="text-[11px] font-black uppercase tracking-wider">{t.mainCategories}</span>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`w-7 h-7 rounded-[4px] flex items-center justify-center border transition-colors ${
                    isThemeDark ? 'border-white/5 bg-white/5 text-gray-400 hover:text-white' : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <X size={14} />
                </button>
              </div>

              <div className="space-y-4 flex-1">
                <div className="space-y-1">
                  <div
                    onClick={() => {
                      fCat('all');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`flex items-center gap-2 rounded px-2.5 py-2 text-[10px] font-bold cursor-pointer transition-colors ${
                      selectedCategory === 'all'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'text-gray-400'
                    }`}
                  >
                    <Grid size={11} className="text-emerald-400" />
                    <span>{t.allCategories}</span>
                  </div>

                  {parents.map(p => {
                    const isParentSelected = selectedCategory === p.id;
                    const accordionOpen = openParents[p.id];
                    const categoryChildrenList = children.filter(c => c.parent === p.id);
                    const hasActiveChild = categoryChildrenList.some(c => c.id === selectedCategory);

                    return (
                      <div key={p.id} className="space-y-1">
                        <div
                          onClick={() => {
                            fCat(p.id);
                            toggleParent(p.id);
                          }}
                          className={`flex items-center justify-between rounded px-2.5 py-2 text-[10px] font-black cursor-pointer transition-colors ${
                            isParentSelected || hasActiveChild
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'text-gray-400'
                          }`}
                        >
                          <span className="flex items-center gap-1.5 select-none">
                            <span style={{ color: p.co }}>{getCategoryIcon(p.id, "w-3 h-3 shrink-0")}</span>
                            <span>{language === 'ar' ? p.nAr : p.nEn}</span>
                          </span>
                          <ChevronDown
                            size={12}
                            className={`transform transition-transform text-gray-500 ${accordionOpen ? 'rotate-180' : ''}`}
                          />
                        </div>

                        <AnimatePresence initial={false}>
                          {accordionOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                              className="pl-4 mt-0.5 space-y-0.5 border-l border-white/5 overflow-hidden"
                            >
                              {categoryChildrenList.map(c => {
                                const isChildSelected = selectedCategory === c.id;
                                return (
                                  <div
                                    key={c.id}
                                    onClick={() => {
                                      fCat(c.id);
                                      setIsMobileMenuOpen(false);
                                    }}
                                    className={`rounded px-2.5 py-1.5 text-[9px] font-bold cursor-pointer transition-colors duration-200 ${
                                      isChildSelected ? 'text-emerald-400 font-extrabold bg-emerald-500/5' : 'text-gray-500 hover:text-gray-300'
                                    }`}
                                  >
                                    {language === 'ar' ? c.nAr : c.nEn}
                                  </div>
                                );
                              })}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Mobile Price Range Section */}
              <div className="space-y-2 pt-4 border-t border-[var(--border-main)] dark:border-white/5">
                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block">{t.priceFilter}</span>
                <div className="flex flex-col gap-2 pt-1 select-none">
                  {[
                    { label: t.priceAll, val: 'all' },
                    { label: '$0 – $100', val: '0-100' },
                    { label: '$100 – $500', val: '100-500' },
                    { label: '$500+', val: '500+' }
                  ].map(pItem => (
                    <label
                      key={pItem.val}
                      className={`flex items-center gap-2.5 text-[10px] font-bold cursor-pointer transition-colors ${
                        selectedPriceRange === pItem.val ? 'text-emerald-400 font-black' : 'text-gray-400'
                      }`}
                    >
                      <input
                        type="radio"
                        name="priceRangeRadioMobile"
                        value={pItem.val}
                        checked={selectedPriceRange === pItem.val}
                        onChange={(e) => {
                          setSelectedPriceRange(e.target.value);
                          setIsMobileMenuOpen(false);
                        }}
                        className="accent-emerald-500 w-3 h-3"
                      />
                      <span>{pItem.label}</span>
                    </label>
                  ))}
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Product Detail Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setSelectedProduct(null);
                setBuyingProgress('idle');
                navigate('/marketplace');
              }}
              className="absolute inset-0 bg-black/85 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className={`relative w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl border flex flex-col scrollbar-none shadow-2xl ${
                isThemeDark ? 'bg-[#090a0c] border-white/10 text-white shadow-black/90' : 'bg-white border-gray-200 text-gray-900 shadow-gray-300/40'
              }`}
            >
              <div 
                onClick={() => {
                  setLightboxIndex(0);
                  setIsLightboxOpen(true);
                  setLightboxScale(1);
                  setLightboxRotation(0);
                }}
                className="relative h-56 md:h-64 object-cover overflow-hidden bg-black/60 sticky top-0 z-[101] shrink-0 group cursor-pointer"
              >
                <img
                  src={getMediaUrl(selectedProduct.image_url) || 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1080&h=1080&fit=crop'}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  alt=""
                  referrerPolicy="no-referrer"
                />
                
                {/* Glowing Overlay indicating "Click to view screenshots/documents" */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center z-10">
                  <div className="flex flex-col items-center gap-1.5 px-4 py-2 bg-black/75 rounded-lg border border-emerald-500/30 backdrop-blur-sm transform translate-y-2 group-hover:translate-y-0 transition-theme">
                    <Eye size={18} className="text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                    <span className="text-[10px] font-black text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]">
                      {language === 'ar' ? 'انقر للمعاينة والتكبير التفاعلي بملء الشاشة' : 'Click for Interactive Fullscreen Zoom & Preview'}
                    </span>
                  </div>
                </div>

                <div className={`absolute inset-0 bg-gradient-to-t ${isThemeDark ? 'from-[#090a0c]' : 'from-white'} via-transparent to-transparent opacity-85 z-1`} />
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedProduct(null);
                    setBuyingProgress('idle');
                    navigate('/marketplace');
                  }}
                  className="absolute top-4 left-4 w-9 h-9 rounded-lg bg-black/50 border border-white/10 flex items-center justify-center transition-theme hover:bg-black/80 hover:text-emerald-500 text-white cursor-pointer z-20"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Details Body */}
              <div className="p-6 -mt-10 relative z-10 space-y-6 flex-1">
                
                {/* Title block */}
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[9px] font-black px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 flex items-center gap-1 shrink-0">
                      {getCategoryIcon(getSubcategoryKey(selectedProduct), 'w-2.5 h-2.5 text-emerald-400')}
                      <span>{language === 'ar' ? selectedProduct.category_ar : selectedProduct.category_en}</span>
                    </span>
                    {getProgrammingLanguage(selectedProduct) !== '-' && (
                      <span className="text-[9px] font-black px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/15 shrink-0 select-none">
                        {getProgrammingLanguage(selectedProduct)}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <h2 className="text-sm md:text-base font-black leading-tight max-w-xl">
                      {language === 'ar' ? selectedProduct.title_ar : selectedProduct.title_en}
                    </h2>

                    <div className="flex items-center gap-2 flex-wrap">
                      {selectedProduct.preview_url && (
                        <a
                          href={selectedProduct.preview_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`h-9 px-3 rounded-lg border flex items-center gap-1.5 transition-theme text-[10px] font-black uppercase tracking-wider ${
                            isThemeDark
                              ? 'border-emerald-500/35 bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500/15 hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]'
                              : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          }`}
                          title={language === 'ar' ? 'معاينة مباشرة' : 'Live Preview'}
                        >
                          <Eye size={13} className="text-emerald-500" />
                          <span>{language === 'ar' ? 'معاينة مباشرة' : 'Live Preview'}</span>
                        </a>
                      )}

                      {selectedProduct.video_url && (
                        <a
                          href={selectedProduct.video_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`h-9 px-3 rounded-lg border flex items-center gap-1.5 transition-theme text-[10px] font-black uppercase tracking-wider ${
                            isThemeDark
                              ? 'border-blue-500/35 bg-blue-500/5 text-blue-400 hover:bg-blue-500/15'
                              : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
                          }`}
                          title={language === 'ar' ? 'فيديو توضيحي' : 'Video Explanation'}
                        >
                          <Play size={13} className="fill-current text-blue-500" />
                          <span>{language === 'ar' ? 'فيديو توضيحي' : 'Video Explanation'}</span>
                        </a>
                      )}


                    </div>
                  </div>

                  {(user?.role === 'admin' || selectedProduct.user_id === user?.id) && (
                    <div className="flex flex-wrap items-center gap-2 my-2 select-none">
                      <button
                        onClick={() => {
                          startEditing(selectedProduct);
                        }}
                        className="h-8 px-4 rounded-[4px] bg-blue-500/15 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 font-extrabold flex items-center gap-1 cursor-pointer transition-theme active:scale-95 text-[10px]"
                      >
                        <Edit size={12} />
                        <span>{language === 'ar' ? 'تعديل المعروض' : 'Edit Listing'}</span>
                      </button>

                      {selectedProduct.status === 'approved' && (
                        <button
                          onClick={async () => {
                            try {
                              const res = await fetch(`/api/marketplace/items/${selectedProduct.id}`, {
                                method: 'PATCH',
                                headers: {
                                  'Content-Type': 'application/json',
                                  'Authorization': `Bearer ${token}`
                                },
                                body: JSON.stringify({ status: 'sold' })
                              });
                              if (res.ok) {
                                toast.success(language === 'ar' ? 'تم تمييز المنتج كمباع بنجاح!' : 'Product marked as sold successfully!');
                                setSelectedProduct({ ...selectedProduct, status: 'sold' });
                                fetchItems();
                              } else {
                                const data = await res.json();
                                toast.error(data.error || 'Failed to update status');
                              }
                            } catch (e) {
                              console.error(e);
                            }
                          }}
                          className="h-8 px-4 rounded-[4px] bg-amber-500/15 hover:bg-amber-500/20 border border-amber-500/30 text-amber-500 font-extrabold flex items-center gap-1 cursor-pointer transition-theme active:scale-95 text-[10px]"
                        >
                          <span>{language === 'ar' ? 'تعليم كمباع' : 'Mark as Sold'}</span>
                        </button>
                      )}

                      {selectedProduct.status === 'sold' && (
                        <button
                          onClick={async () => {
                            try {
                              const res = await fetch(`/api/marketplace/items/${selectedProduct.id}`, {
                                method: 'PATCH',
                                headers: {
                                  'Content-Type': 'application/json',
                                  'Authorization': `Bearer ${token}`
                                },
                                body: JSON.stringify({ status: 'approved' })
                              });
                              if (res.ok) {
                                toast.success(language === 'ar' ? 'تمت إعادة عرض المنتج وتنشيطه بنجاح!' : 'Product reactivated and re-listed successfully!');
                                setSelectedProduct({ ...selectedProduct, status: 'approved' });
                                fetchItems();
                              } else {
                                const data = await res.json();
                                toast.error(data.error || 'Failed to update status');
                              }
                            } catch (e) {
                              console.error(e);
                            }
                          }}
                          className="h-8 px-4 rounded-[4px] bg-emerald-500/15 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-500 font-extrabold flex items-center gap-1 cursor-pointer transition-theme active:scale-95 text-[10px]"
                        >
                          <span>{language === 'ar' ? 'إعادة عرض المنتج' : 'Re-List Item'}</span>
                        </button>
                      )}
                    </div>
                  )}

                  {user?.role !== 'admin' && selectedProduct.user_id === user?.id && (
                    <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 flex items-center gap-2 text-[10px] text-amber-500 select-none">
                      <AlertCircle size={14} className="shrink-0" />
                      <span>
                        {selectedProduct.status === 'pending' || !selectedProduct.status
                          ? (language === 'ar' 
                              ? 'لقد قمت بإدراج هذا المنتج وهو معلق حالياً بانتظار مراجعة وقبول مدير المنصة قبل نشره للعامة.' 
                              : 'You uploaded this asset. It is currently pending review by our administration team before going live.')
                          : selectedProduct.status === 'rejected'
                            ? (language === 'ar' 
                                ? 'تم رفض إدراج هذا المنتج من قبل مدير المنصة.' 
                                : 'This listing was rejected has been hidden by admins.')
                            : selectedProduct.status === 'sold'
                              ? (language === 'ar' 
                                  ? 'هذا المنتج مميز حالياً كمباع ومخفي عن الزوار العامين ولكنه محفوظ تحت حسابك للتحكم.' 
                                  : 'This product is currently marked as sold. It is hidden from public view but remains accessible under your account.')
                              : (language === 'ar'
                                  ? 'منتجك معتمد ومنشور بنجاح للعامة!'
                                  : 'Your listing is live and visible to the public!')
                        }
                      </span>
                    </div>
                  )}

                  <p className={`text-[10px] md:text-xs leading-relaxed font-medium ${
                    isThemeDark ? 'text-gray-400/90' : 'text-gray-550'
                  }`}>
                    {language === 'ar' ? selectedProduct.description_ar : selectedProduct.description_en}
                  </p>

                  {/* Screenshots & Document Grid Previewer inside Details modal */}
                  <div className="space-y-2 pt-1 border-t border-dashed border-gray-100 dark:border-white/5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[9px] font-black text-gray-500 uppercase tracking-widest block">
                        {language === 'ar' ? 'معرض الصور وملفات التوثيق للمعاينة' : 'Screenshot Gallery & Preview Files'}
                      </h4>
                      <span 
                        onClick={() => {
                          setLightboxIndex(0);
                          setIsLightboxOpen(true);
                          setLightboxScale(1);
                          setLightboxRotation(0);
                        }}
                        className="text-[9px] font-bold text-emerald-500 hover:text-emerald-400 flex items-center gap-1 cursor-pointer select-none transition-theme hover:underline"
                      >
                        <Eye size={10} className="text-emerald-500" />
                        {language === 'ar' ? 'تصفح بملء الشاشة' : 'Browse Screen Lightbox'}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-2 select-none">
                      {getPreviewAssets(selectedProduct).map((asset, idx) => {
                        const isPdf = asset.type === 'pdf';
                        const isWeb = asset.type === 'iframe';
                        
                        return (
                          <div
                            key={idx}
                            onClick={() => {
                              setLightboxIndex(idx);
                              setIsLightboxOpen(true);
                              setLightboxScale(1);
                              setLightboxRotation(0);
                            }}
                            className={`relative h-14 sm:h-16 rounded-lg overflow-hidden border cursor-pointer hover:border-emerald-500/50 group transition-theme ${
                              isThemeDark ? 'bg-black/40 border-white/5' : 'bg-gray-100 border-gray-200'
                            }`}
                          >
                            {isPdf ? (
                              <div className="w-full h-full flex flex-col items-center justify-center p-1 bg-gradient-to-br from-red-500/10 to-red-600/5 group-hover:from-emerald-500/10 transition-colors">
                                <BookOpen size={16} className="text-red-400 group-hover:text-emerald-400 transition-colors" />
                                <span className="text-[7px] font-black text-red-500/85 group-hover:text-emerald-500 mt-0.5 uppercase">PDF DOC</span>
                              </div>
                            ) : isWeb ? (
                              <div className="w-full h-full flex flex-col items-center justify-center p-1 bg-gradient-to-br from-purple-500/10 to-purple-600/5 group-hover:from-emerald-500/10 transition-colors">
                                <Smartphone size={16} className="text-purple-400 group-hover:text-emerald-400 transition-colors" />
                                <span className="text-[7px] font-black text-purple-500/85 group-hover:text-emerald-500 mt-0.5 uppercase">WEB DEMO</span>
                              </div>
                            ) : (
                              <img
                                src={asset.url}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                referrerPolicy="no-referrer"
                                alt=""
                              />
                            )}
                            
                            <div className="absolute inset-0 bg-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                              <Eye size={11} className="text-emerald-400 drop-shadow-[0_0_4px_rgba(16,185,129,0.8)]" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Features & Tech Bento Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  <div className="space-y-2">
                    <h4 className="text-[9px] font-black text-gray-500 uppercase tracking-widest block">
                      {t.featuresTitle}
                    </h4>
                    <div className="space-y-1.5 select-none">
                      {getProductFeatures(selectedProduct, language === 'ar').map((feat, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-[10px] font-bold">
                          <Check size={12} className="text-emerald-400 shrink-0 mt-0.5" />
                          <span className={isThemeDark ? 'text-gray-300' : 'text-gray-700'}>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-[9px] font-black text-gray-500 uppercase tracking-widest block">
                      {t.techTitle}
                    </h4>
                    <div className="flex flex-wrap gap-1.5 select-none">
                      {getProductTech(selectedProduct).map((tech, idx) => (
                        <span
                          key={idx}
                          className={`text-[9px] font-black px-2 py-1 rounded border ${
                            isThemeDark
                              ? 'bg-white/5 border-white/5 text-gray-400'
                              : 'bg-gray-50 border-gray-150 text-gray-650'
                          }`}
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className={`h-px w-full bg-gradient-to-r from-transparent via-emerald-500/10 to-transparent`} />

                {/* Licenses and Purchase cards */}
                <div className={`grid grid-cols-1 md:grid-cols-5 gap-6 p-4 rounded-xl border border-dashed select-none ${
                  isThemeDark ? 'border-white/10 bg-black/10' : 'border-gray-200 bg-gray-50/50'
                }`}>
                  
                  {/* License checklist Column */}
                  <div className="md:col-span-3 space-y-3">
                    <h4 className="text-[9px] font-black text-gray-500 uppercase tracking-widest block">
                      {language === 'ar' ? 'تفاصيل ترخيص المنتج الحصري' : 'Exclusive Product License Details'}
                    </h4>
                    
                    {(() => {
                      const licKey = selectedProduct.license_type || 'commercial_standard';
                      const details = getLicenseDetails(licKey);
                      return (
                        <div className={`p-4 rounded-xl border transition-theme ${
                          isThemeDark
                            ? 'bg-emerald-400/5 border-emerald-500/15'
                            : 'bg-emerald-500/5 border-emerald-500/15'
                        }`}>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="p-1 rounded bg-emerald-500/10 text-emerald-500 shrink-0">
                              <Check size={14} className="drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                            </span>
                            <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400">
                              {language === 'ar' ? details.nameAr : details.nameEn}
                            </span>
                          </div>

                          <p className={`text-[10px] leading-relaxed mb-3.5 italic ${
                            isThemeDark ? 'text-gray-300' : 'text-gray-650'
                          }`}>
                            {language === 'ar' ? details.descAr : details.descEn}
                          </p>

                          <div className="space-y-1.5 pt-2 border-t border-emerald-555/10 dark:border-emerald-500/10">
                            <div className="text-[8px] font-black uppercase text-gray-400/80 tracking-wider mb-1">
                              {language === 'ar' ? 'صلاحيات الاستخدام:' : 'License Permissions:'}
                            </div>
                            {details.permissions.map((p, pIdx) => (
                              <div key={pIdx} className="flex items-center gap-1.5 text-[9px] font-bold">
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${p.ok ? 'bg-emerald-500' : 'bg-orange-400'}`} />
                                <span className={isThemeDark ? 'text-gray-350' : 'text-gray-650'}>
                                  {language === 'ar' ? p.ar : p.en}
                                </span>
                              </div>
                            ))}
                          </div>

                          {/* Viraly LinkUp Limited Copyright Signature */}
                          <div className="mt-3.5 pt-2.5 border-t border-emerald-500/10 flex flex-col gap-1 text-[8px] leading-relaxed text-gray-500 font-medium">
                            <div className="flex items-center justify-between font-black text-emerald-600/90 dark:text-emerald-450">
                              <span>{language === 'ar' ? 'حماية الملكية والناشر' : 'PROPRIETARY IP PROTECTION'}</span>
                              <span className="font-sans font-black select-none">© VIRALY LINKUP LTD</span>
                            </div>
                            <p className="italic text-gray-400/80">
                              {language === 'ar'
                                ? 'حقوق الملكية البرمجية والفكرية لهذا الإصدار محفوظة بالكامل لشركة فيرالي لينك اب المحدودة والناشر المعتمد ولا يجوز إعادة التوزيع خارج الأطر المرخصة.'
                                : 'All software copyright and intellectual property rights are fully secured and owned by Viraly LinkUp Limited and authorized publishers under international provisions.'}
                            </p>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Pricing summary widget */}
                  <div className="md:col-span-2 flex flex-col justify-between">
                    <div className={`rounded-xl border p-4 space-y-4 flex flex-col ${
                      isThemeDark ? 'bg-black/60 border-white/5' : 'bg-gray-50 border-gray-150'
                    }`}>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between select-none">
                          <span className="text-[10px] text-gray-500 font-bold">Price</span>
                          <div className="flex items-center gap-1">
                            <span className="text-base font-black font-sans text-emerald-600 dark:text-emerald-400">
                              {getComputedPrice() <= 0 ? (language === 'ar' ? 'مجانًا' : 'FREE') : `$${getComputedPrice().toLocaleString()}`}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between select-none">
                          <span className="text-[10px] text-gray-500 font-bold">{t.byBalancePoints}</span>
                          <span className="text-xs font-black font-sans text-purple-400">
                            {getComputedPrice() <= 0
                              ? (language === 'ar' ? 'مجانًا' : 'FREE')
                              : `${(getComputedPrice() * 10).toLocaleString()} ${t.points}`}
                          </span>
                        </div>
                      </div>

                      <div className={`h-px w-full ${isThemeDark ? 'bg-white/5' : 'bg-gray-150'}`} />

                      {buyingProgress === 'purchasing' ? (
                        <div className="flex flex-col items-center justify-center py-2 text-center space-y-2">
                          <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                          <span className="text-[9px] text-gray-400 font-bold animate-pulse">{t.purchaseProgress}</span>
                        </div>
                      ) : buyingProgress === 'success' ? (
                        <div className="flex flex-col items-center justify-center py-2 text-center text-emerald-400 space-y-1">
                          <Check size={16} />
                          <span className="text-[9px] font-black">{language === 'ar' ? 'تم الشراء بنجاح!' : 'Purchase Successful!'}</span>
                        </div>
                      ) : buyingProgress === 'insufficient' ? (
                        <div className="space-y-2">
                          <div className="flex items-start gap-1 pb-1">
                            <AlertCircle size={12} className="text-red-500 shrink-0 mt-0.5" />
                            <span className="text-[9px] text-red-400 font-black leading-normal">{t.insufficientHeadline}</span>
                          </div>
                          <p className="text-[8px] text-gray-500 leading-relaxed">{t.insufficientBody}</p>
                          <button
                            onClick={() => setBuyingProgress('idle')}
                            className="w-full h-8 rounded-[4px] border border-white/10 hover:bg-white/5 text-[9.5px] font-black transition-colors"
                          >
                            {language === 'ar' ? 'الرجوع' : 'Back'}
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {parseFloat(selectedProduct.price.toString()) <= 0 ? (
                            <a
                              href={selectedProduct.download_url || selectedProduct.preview_url || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full h-9 rounded-lg bg-emerald-500 text-black hover:bg-emerald-400 transition-theme font-black text-[10px] flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer shadow-lg shadow-emerald-500/10"
                            >
                              <ExternalLink size={12} strokeWidth={2.5} />
                              <span>{language === 'ar' ? 'تحميل مجاني / زيارة الرابط' : 'Get / Free Download'}</span>
                            </a>
                          ) : (
                            <>
                              <button
                                onClick={() => handleAddToCart(selectedProduct, selectedLicenseType)}
                                className="w-full h-9 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/35 text-emerald-500 transition-theme font-bold text-[10px] flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                              >
                                <ShoppingCart size={12} />
                                <span>{language === 'ar' ? 'إضافة إلى السلة' : 'Add to Shopping Cart'}</span>
                              </button>

                              <button
                                onClick={handleBuyWithWallet}
                                className="w-full h-9 rounded-lg bg-emerald-500 text-black hover:bg-emerald-400 transition-theme font-black text-[10px] flex items-center justify-center gap-1 active:scale-95 cursor-pointer shadow-lg shadow-emerald-500/10"
                              >
                                <Wallet size={12} />
                                <span>{t.buyWithBalance}</span>
                              </button>

                              <button
                                onClick={handleBuyWithStripe}
                                className={`w-full h-9 rounded-lg border transition-theme font-bold text-[10px] flex items-center justify-center gap-1 active:scale-95 cursor-pointer ${
                                  isThemeDark
                                    ? 'border-white/5 bg-[#141416] hover:bg-[#1a1a1c] text-white hover:text-emerald-400 hover:border-emerald-500/30'
                                    : 'border-gray-250 bg-white text-gray-700 hover:bg-gray-50 hover:text-emerald-600 hover:border-emerald-500/30'
                                }`}
                              >
                                <CreditCard size={12} />
                                <span>{language === 'ar' ? 'الدفع بالبطاقة الائتمانية (Stripe)' : 'Pay with Credit Card (Stripe)'}</span>
                              </button>

                              <button
                                onClick={() => {
                                  if (!user) {
                                    toast.error(language === 'ar' ? 'يرجى تسجيل الدخول أولاً للحصول على رابط الإحالة الخاص بك' : 'Please log in first to get your affiliate referral link.');
                                    return;
                                  }
                                  const refLink = `${window.location.origin}/marketplace?ref=${user.referral_code}`;
                                  navigator.clipboard.writeText(refLink);
                                  toast.success(
                                    language === 'ar'
                                      ? 'تم نسخ رابط إحالة المنتج! اربح 20٪ عمولة فورية عند شراء أي مستخدم عبر الرابط.'
                                      : 'Product referral link copied! Earn 20% commission on any purchase made through this link.'
                                  );
                                }}
                                className={`w-full h-9 rounded-lg border transition-theme font-bold text-[10px] flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer ${
                                  isThemeDark
                                    ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500/15'
                                    : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                }`}
                              >
                                <Gift size={12} className="text-emerald-400 animate-pulse" />
                                <span>{language === 'ar' ? 'رابط الإحالة (عمولة 20٪)' : 'Referral Link (25% Earn)'}</span>
                              </button>
                            </>
                          )}
                        </div>
                      )}

                    </div>
                  </div>

                </div>

                {/* Secondary Launcher Promo card banner */}
                <div className="relative rounded-2xl overflow-hidden border border-emerald-500/10 bg-gradient-to-l from-emerald-500/5 via-[#0c0d10] to-[#0c0d10] p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="absolute top-0 left-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-3xl -translate-x-8 -translate-y-8" />
                  <div className="flex items-start gap-3 relative z-10">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Rocket size={18} className="text-emerald-400" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black bg-gradient-to-l from-emerald-300 to-emerald-500 bg-clip-text text-transparent">
                        {t.ctaHeading}
                      </h4>
                      <p className="text-[9px] text-gray-400 mt-1 leading-relaxed max-w-lg">
                        {t.ctaText}
                      </p>
                    </div>
                  </div>
                  {canPublish && (
                    <button
                      onClick={() => {
                        setSelectedProduct(null);
                        resetForm();
                        setIsCreateOpen(true);
                      }}
                      className="flex-shrink-0 relative z-10 text-[9px] font-black bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-2.5 rounded-lg transition-theme active:scale-95 flex items-center gap-1 shadow-lg shadow-emerald-500/20 cursor-pointer"
                    >
                      <Plus size={10} />
                      <span>{t.ctaBtn}</span>
                    </button>
                  )}
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Immersive Lightbox Preview Studio */}
      <AnimatePresence>
        {isLightboxOpen && selectedProduct && (
          <div className="fixed inset-0 z-[150] flex flex-col bg-black/95 backdrop-blur-xl text-white select-none overflow-hidden font-sans">
            
            {/* Soft background ambient gradient */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none" />

            {/* Top Toolbar */}
            <div className="relative z-10 w-full h-16 border-b border-white/5 bg-black/40 backdrop-blur-md px-6 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-mono tracking-widest text-emerald-400 font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/15">
                  {lightboxIndex + 1} / {getPreviewAssets(selectedProduct).length}
                </span>
                <div className="flex flex-col">
                  <span className="text-xs font-black truncate max-w-[280px] sm:max-w-md">
                    {language === 'ar' ? selectedProduct.title_ar : selectedProduct.title_en}
                  </span>
                  <span className="text-[9px] text-gray-400 font-bold">
                    {language === 'ar' 
                      ? getPreviewAssets(selectedProduct)[lightboxIndex]?.titleAr 
                      : getPreviewAssets(selectedProduct)[lightboxIndex]?.titleEn}
                  </span>
                </div>
              </div>

              {/* Precise button toolbar layout */}
              <div className="flex items-center gap-1">
                {getPreviewAssets(selectedProduct)[lightboxIndex]?.type === 'image' && (
                  <>
                    <button
                      onClick={() => setLightboxScale(prev => Math.min(prev + 0.25, 3))}
                      className="bg-transparent border border-transparent transition-theme hover:bg-white/10 rounded-[4px] w-10 h-10 flex items-center justify-center cursor-pointer text-gray-300 hover:text-emerald-400 hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]"
                      title={language === 'ar' ? 'تكبير' : 'Zoom In'}
                    >
                      <Plus size={16} />
                    </button>
                    <button
                      onClick={() => setLightboxScale(prev => Math.max(prev - 0.25, 0.5))}
                      className="bg-transparent border border-transparent transition-theme hover:bg-white/10 rounded-[4px] w-10 h-10 flex items-center justify-center cursor-pointer text-gray-300 hover:text-emerald-400 hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]"
                      title={language === 'ar' ? 'تصغير' : 'Zoom Out'}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setLightboxRotation(prev => (prev + 90) % 360)}
                      className="bg-transparent border border-transparent transition-theme hover:bg-white/10 rounded-[4px] w-10 h-10 flex items-center justify-center cursor-pointer text-gray-300 hover:text-emerald-400 hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]"
                      title={language === 'ar' ? 'تدوير' : 'Rotate'}
                    >
                      <RefreshCw size={14} className="hover:animate-spin" />
                    </button>
                    <button
                      onClick={() => {
                        setLightboxScale(1);
                        setLightboxRotation(0);
                      }}
                      className="bg-transparent border border-transparent transition-theme hover:bg-white/10 rounded-[4px] w-10 h-10 flex items-center justify-center cursor-pointer text-gray-300 hover:text-emerald-400 hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]"
                      title={language === 'ar' ? 'إعادة ضبط' : 'Reset View'}
                    >
                      <SlidersHorizontal size={14} />
                    </button>
                  </>
                )}

                <div className="w-px h-5 bg-white/10 mx-1" />

                <button
                  onClick={() => setIsLightboxOpen(false)}
                  className="bg-transparent border border-transparent transition-theme hover:bg-white/10 rounded-[4px] w-10 h-10 flex items-center justify-center cursor-pointer text-gray-300 hover:text-emerald-400 hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Main Stage Display Area */}
            <div className="relative flex-1 w-full flex items-center justify-center p-4 sm:p-10 select-none overflow-hidden bg-black/20">
              
              {/* Previous Floating Button */}
              <button
                onClick={() => {
                  const assets = getPreviewAssets(selectedProduct);
                  setLightboxIndex(prev => (prev - 1 + assets.length) % assets.length);
                  setLightboxScale(1);
                  setLightboxRotation(0);
                }}
                className="absolute left-4 z-20 bg-black/60 border border-white/5 hover:bg-black/80 hover:border-emerald-500/30 transition-theme rounded-[4px] w-12 h-12 flex items-center justify-center cursor-pointer text-gray-300 hover:text-emerald-400 hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse"
              >
                <ArrowLeft size={18} />
              </button>

              {/* Dynamic Presentation Body */}
              <div className="w-full h-full flex items-center justify-center relative select-text">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={lightboxIndex}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="w-full h-full flex items-center justify-center"
                  >
                    {(() => {
                      const currentAsset = getPreviewAssets(selectedProduct)[lightboxIndex];
                      if (!currentAsset) return null;

                      if (currentAsset.type === 'pdf') {
                        return (
                          <div className="w-full max-w-4xl h-full flex flex-col rounded-2xl border border-white/10 bg-[#0c0d0f]/95 overflow-hidden shadow-2xl">
                            <div className="h-11 bg-[#121316] border-b border-white/5 px-4 flex items-center justify-between text-xs font-bold font-mono shrink-0">
                              <span className="text-red-400 flex items-center gap-1.5 uppercase tracking-wide">
                                <BookOpen size={13} strokeWidth={2.5} />
                                Document Viewer (PDF)
                              </span>
                              <div className="flex items-center gap-2">
                                <a
                                  href={currentAsset.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2.5 py-1 rounded bg-white/5 border border-white/10 text-[9px] font-black text-gray-300 hover:text-white hover:bg-white/10 flex items-center gap-1"
                                >
                                  <ExternalLink size={10} />
                                  {language === 'ar' ? 'فتح في علامة تبويب جديدة' : 'Open in New Tab'}
                                </a>
                              </div>
                            </div>
                            
                            <div className="flex-1 bg-black/40 relative">
                              <iframe
                                src={`https://docs.google.com/gview?url=${encodeURIComponent(currentAsset.url)}&embedded=true`}
                                className="w-full h-full border-0 rounded-b-2xl"
                                title="PDF Documentation Frame"
                              />
                            </div>
                          </div>
                        );
                      }

                      if (currentAsset.type === 'iframe') {
                        return (
                          <div className="w-full max-w-5xl h-full flex flex-col rounded-2xl border border-white/10 bg-[#0c0d10] overflow-hidden shadow-2xl">
                            <div className="h-11 bg-[#121316] border-b border-white/5 px-4 flex items-center justify-between shrink-0">
                              <div className="flex items-center gap-1.5 shrink-0">
                                <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                                <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                              </div>
                              
                              <div className="w-1/2 max-w-md h-6 rounded bg-[#1c1d22] border border-white/5 flex items-center justify-center px-4 overflow-hidden">
                                <span className="text-[9px] font-mono text-gray-400 select-all truncate">
                                  {currentAsset.url}
                                </span>
                              </div>
                              
                              <a
                                href={currentAsset.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2.5 py-1 rounded bg-white/5 border border-white/10 text-[9px] font-black text-gray-300 hover:text-white hover:bg-white/10 flex items-center gap-1 shrink-0"
                              >
                                {language === 'ar' ? 'الرابط المباشر' : 'Live Preview'}
                                <ExternalLink size={10} />
                              </a>
                            </div>

                            <div className="flex-1 bg-white relative">
                              <iframe
                                src={currentAsset.url}
                                className="w-full h-full border-0"
                                sandbox="allow-scripts allow-popups allow-forms allow-same-origin"
                                title="Interactive Live Demo"
                              />
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div className="relative max-w-5xl max-h-[80vh] overflow-hidden flex items-center justify-center rounded-xl p-2">
                          <img
                            src={currentAsset.url}
                            className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-2xl pointer-events-none transition-transform duration-300"
                            style={{
                              transform: `scale(${lightboxScale}) rotate(${lightboxRotation}deg)`,
                            }}
                            referrerPolicy="no-referrer"
                            alt=""
                          />
                        </div>
                      );
                    })()}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Next Floating Button */}
              <button
                onClick={() => {
                  const assets = getPreviewAssets(selectedProduct);
                  setLightboxIndex(prev => (prev + 1) % assets.length);
                  setLightboxScale(1);
                  setLightboxRotation(0);
                }}
                className="absolute right-4 z-20 bg-black/60 border border-white/5 hover:bg-black/80 hover:border-emerald-500/30 transition-theme rounded-[4px] w-12 h-12 flex items-center justify-center cursor-pointer text-gray-300 hover:text-emerald-400 hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse"
              >
                <ArrowRight size={18} />
              </button>
            </div>

            {/* Bottom Carousel Strip */}
            <div className="h-24 border-t border-white/5 bg-black/50 backdrop-blur-md px-6 flex items-center justify-center gap-3 overflow-x-auto shrink-0 select-none">
              {getPreviewAssets(selectedProduct).map((asset, idx) => {
                const isActive = lightboxIndex === idx;
                const isPdf = asset.type === 'pdf';
                const isWeb = asset.type === 'iframe';
                
                return (
                  <div
                    key={idx}
                    onClick={() => {
                      setLightboxIndex(idx);
                      setLightboxScale(1);
                      setLightboxRotation(0);
                    }}
                    className={`relative h-14 w-20 rounded-lg overflow-hidden border cursor-pointer transition-theme flex-shrink-0 flex items-center justify-center ${
                      isActive 
                        ? 'border-emerald-500 bg-emerald-500/10 scale-105 shadow-[0_0_12px_rgba(16,185,129,0.3)]' 
                        : 'border-white/5 opacity-50 hover:opacity-100'
                    }`}
                  >
                    {isPdf ? (
                      <div className="w-full h-full flex flex-col items-center justify-center p-1 bg-red-950/20">
                        <BookOpen size={14} className="text-red-400" />
                        <span className="text-[6px] font-black text-red-400/80 uppercase mt-0.5">PDF</span>
                      </div>
                    ) : isWeb ? (
                      <div className="w-full h-full flex flex-col items-center justify-center p-1 bg-purple-950/20">
                        <Smartphone size={14} className="text-purple-400" />
                        <span className="text-[6px] font-black text-purple-400/80 uppercase mt-0.5">WEB</span>
                      </div>
                    ) : (
                      <img
                        src={asset.url}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                        alt=""
                      />
                    )}

                    {isActive && (
                      <div className="absolute inset-0 border border-emerald-500/30 bg-emerald-500/5" />
                    )}
                  </div>
                );
              })}
            </div>

          </div>
        )}
      </AnimatePresence>

      {/* Add Item Dialog */}
      <AnimatePresence>
        {isCreateOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreateOpen(false)}
              className="absolute inset-0 bg-black/85 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`relative max-w-2xl w-full max-h-[85vh] overflow-y-auto border rounded-2xl shadow-2xl p-6 scrollbar-none space-y-6 ${
                isThemeDark ? 'bg-[#090a0c] border-white/10 text-white shadow-black/95' : 'bg-white border-gray-200 text-gray-900 shadow-gray-200/50'
              }`}
            >
              <div className="flex items-center justify-between border-b border-[var(--border-main)] dark:border-white/5 pb-3">
                <h3 className="font-black text-xs text-emerald-400 flex items-center gap-1.5 select-none text-emerald-400 drop-shadow-[0_0_6px_rgba(16,185,129,0.3)]">
                  <Grid size={13} />
                  <span>{editingProduct ? (language === 'ar' ? 'تعديل بيانات منتج السوق الأساسية' : 'Edit Base Marketplace Product Details') : t.insertModalTitle}</span>
                </h3>
                <button
                  onClick={() => setIsCreateOpen(false)}
                  className={`w-7 h-7 rounded-[4px] flex items-center justify-center border transition-colors ${
                    isThemeDark ? 'border-white/5 bg-white/5 text-gray-400 hover:text-white' : 'border-gray-200 bg-gray-50 text-gray-751 hover:bg-gray-100'
                  }`}
                >
                  <X size={13} />
                </button>
              </div>

              {submitSuccess ? (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                    <Check size={24} />
                  </div>
                  <h4 className="font-black text-xs">
                    {t.successHeading}
                  </h4>
                  <p className="text-[10px] text-gray-500 max-w-xs leading-relaxed">
                    {t.successDesc}
                  </p>
                </div>
              ) : (
                <form onSubmit={handleCreateProduct} className="space-y-4 text-right" dir={dir}>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">
                        {t.assetName}
                      </label>
                      <input
                        type="text"
                        required
                        value={itemTitleAr}
                        onChange={(e) => setItemTitleAr(e.target.value)}
                        placeholder="الأكواد والربط البرمجي ERPv4"
                        className={`w-full h-10 px-3 border rounded-[4px] outline-none text-xs ${
                          isThemeDark ? 'bg-black/40 border-white/5 focus:border-emerald-500/35' : 'bg-white border-gray-250 focus:border-emerald-500/35'
                        }`}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">
                        English Title *
                      </label>
                      <input
                        type="text"
                        required
                        value={itemTitleEn}
                        onChange={(e) => setItemTitleEn(e.target.value)}
                        placeholder="ERP Integration Suite v4"
                        className={`w-full h-10 px-3 border rounded-[4px] outline-none text-xs ${
                          isThemeDark ? 'bg-black/40 border-white/5 focus:border-emerald-500/35' : 'bg-white border-gray-250 focus:border-emerald-500/35'
                        }`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">
                        {t.mainCategory}
                      </label>
                      <select
                        value={itemCategory}
                        onChange={(e) => setItemCategory(e.target.value)}
                        className={`w-full h-10 px-3 border rounded-[4px] outline-none text-xs ${
                          isThemeDark ? 'bg-black/40 border-white/5 focus:border-emerald-500/35' : 'bg-white border-gray-250 focus:border-emerald-500/35'
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
                          {t.basePrice}
                        </label>
                        <input
                          type="number"
                          required
                          min="0"
                          value={itemPrice}
                          onChange={(e) => setItemPrice(e.target.value)}
                          placeholder="99"
                          className={`w-full h-10 px-2 border rounded-[4px] outline-none text-xs text-center ${
                            isThemeDark ? 'bg-black/40 border-white/5 focus:border-emerald-500/30' : 'bg-white border-gray-250 focus:border-emerald-500/30'
                          }`}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">
                          {t.discountPct}
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="99"
                          value={itemDiscount}
                          onChange={(e) => setItemDiscount(e.target.value)}
                          placeholder="0"
                          className={`w-full h-10 px-2 border rounded-[4px] outline-none text-xs text-center ${
                            isThemeDark ? 'bg-black/40 border-white/5 focus:border-emerald-500/30' : 'bg-white border-gray-250 focus:border-emerald-500/30'
                          }`}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">
                          {language === 'ar' ? 'النهائي' : 'Final'}
                        </label>
                        <div className={`w-full h-10 border rounded-[4px] text-xs font-black flex items-center justify-center text-emerald-400 select-none ${
                          isThemeDark ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-emerald-50/20 border-emerald-500/10'
                        }`}>
                          ${Math.round((Number(itemPrice) || 0) * (1 - (Number(itemDiscount) || 0) / 100))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Immersive Affiliate & Referral Configuration */}
                  <div className={`p-4 border rounded-[4px] space-y-3 ${
                    isThemeDark ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-emerald-50/10 border-emerald-500/10'
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
                            value={itemReferralPercent}
                            onChange={(e) => setItemReferralPercent(e.target.value)}
                            placeholder="20"
                            className={`w-full h-10 pl-3 pr-8 border rounded-[4px] outline-none text-xs ${
                              isThemeDark ? 'bg-black/40 border-white/5 focus:border-emerald-500/35' : 'bg-white border-gray-250 focus:border-emerald-500/35'
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
                          isThemeDark ? 'bg-black/60 border-white/5' : 'bg-gray-50 border-gray-200'
                        }`}>
                          ${Math.round((Number(itemPrice) || 0) * (1 - (Number(itemDiscount) || 0) / 100) * (Number(itemReferralPercent) || 0) / 100 * 100) / 100}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Highlights and Licensing Setup */}
                  <div className={`p-4 border rounded-[4px] space-y-3 ${
                    isThemeDark ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-emerald-50/10 border-emerald-500/10'
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
                          value={itemHighlightTag}
                          onChange={(e) => setItemHighlightTag(e.target.value)}
                          className={`w-full h-10 px-3 border rounded-[4px] outline-none text-xs ${
                            isThemeDark ? 'bg-black/40 border-white/5 focus:border-emerald-500/35' : 'bg-white border-gray-250 focus:border-emerald-500/35'
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
                          value={itemLicenseType}
                          onChange={(e) => setItemLicenseType(e.target.value)}
                          className={`w-full h-10 px-3 border rounded-[4px] outline-none text-xs ${
                            isThemeDark ? 'bg-black/40 border-white/5 focus:border-emerald-500/35' : 'bg-white border-gray-250 focus:border-emerald-500/35'
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

                  {/* Gallery Multi-Image Upload Section */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">
                        {language === 'ar' ? 'معرض صور المنتج (رفع صور متعددة)' : 'Product Gallery Photos (Multiple uploads supported)'}
                      </label>
                      
                      {/* Grid of uploaded images */}
                      {itemImages.length > 0 && (
                        <div className="grid grid-cols-3 gap-2 p-2 rounded-lg border border-emerald-500/10 bg-emerald-500/[0.01] max-h-[140px] overflow-y-auto mb-1.5 animate-fade-in">
                          {itemImages.map((img, idx) => (
                            <div key={idx} className="relative aspect-square rounded-md overflow-hidden border border-gray-200/50 dark:border-white/10 group shadow-sm shrink-0">
                              <img src={getMediaUrl(img)} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                              <span className="absolute bottom-0.5 right-1 bg-black/60 text-white text-[7px] font-bold px-0.5 rounded leading-none">
                                #{idx + 1}
                              </span>
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center justify-center">
                                <button
                                  type="button"
                                  onClick={() => setItemImages(prev => prev.filter((_, i) => i !== idx))}
                                  className="w-5 h-5 bg-rose-600 hover:bg-rose-700 text-white rounded-full flex items-center justify-center transition-theme cursor-pointer shadow"
                                  title={language === 'ar' ? 'حذف الصورة' : 'Delete photo'}
                                >
                                  <X size={10} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <label className={`flex flex-col items-center justify-center w-full h-[76px] border-2 border-dashed rounded-lg cursor-pointer transition-colors relative ${
                        isThemeDark ? 'border-white/10 hover:border-emerald-500/30 hover:bg-white/5' : 'border-gray-200 hover:border-emerald-500/35 hover:bg-gray-50'
                      }`}>
                        <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} />
                        
                        {uploadingImage ? (
                          <div className="flex flex-col items-center gap-1">
                            <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                            <p className="text-[7.5px] font-bold text-emerald-400">
                              {language === 'ar' ? 'جاري رفع الصور...' : 'Uploading...'}
                            </p>
                          </div>
                        ) : (
                          <div className="text-center select-none text-gray-500">
                            <Upload className="w-4 h-4 mx-auto mb-0.5 opacity-50 text-emerald-500" />
                            <p className="text-[8px] font-bold">
                              {language === 'ar' ? 'انقر لرفع صور المنتج' : 'Click to Upload Product Images'}
                            </p>
                            <p className="text-[7px] opacity-60">
                              {language === 'ar' ? 'يدعم صور متعددة (1:1 تلقائي)' : 'Supports multiple files (auto 1:1)'}
                            </p>
                          </div>
                        )}
                      </label>
                      {uploadError && <p className="text-[8px] text-red-500 mt-1">{uploadError}</p>}
                    </div>

                    <div className="space-y-2">
                      <div className="space-y-1">
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">{t.previewUrl}</label>
                        <input
                          type="url"
                          value={itemLinkPreview}
                          onChange={(e) => setItemLinkPreview(e.target.value)}
                          placeholder="https://demo.example.com"
                          className={`w-full h-9 px-3 border rounded-[4px] outline-none text-xs ${
                            isThemeDark ? 'bg-black/40 border-white/5 focus:border-emerald-500/30' : 'bg-white border-gray-250 focus:border-emerald-500/30'
                          }`}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">{t.videoUrl}</label>
                        <input
                          type="url"
                          value={itemLinkVideo}
                          onChange={(e) => setItemLinkVideo(e.target.value)}
                          placeholder="https://youtube.com/watch?v=..."
                          className={`w-full h-9 px-3 border rounded-[4px] outline-none text-xs ${
                            isThemeDark ? 'bg-black/40 border-white/5 focus:border-emerald-500/30' : 'bg-white border-gray-250 focus:border-emerald-500/30'
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">{t.programmingLang}</label>
                      <input
                        type="text"
                        value={itemLang}
                        onChange={(e) => setItemLang(e.target.value)}
                        placeholder="Python, JS, Pine Script"
                        className={`w-full h-10 px-3 border rounded-[4px] outline-none text-xs ${
                          isThemeDark ? 'bg-black/40 border-white/5 focus:border-emerald-500/30' : 'bg-white border-gray-250 focus:border-emerald-500/30'
                        }`}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">{t.toolsFrameworks}</label>
                      <input
                        type="text"
                        value={itemTools}
                        onChange={(e) => setItemTools(e.target.value)}
                        placeholder="React, Django, Express"
                        className={`w-full h-10 px-3 border rounded-[4px] outline-none text-xs ${
                          isThemeDark ? 'bg-black/40 border-white/5 focus:border-emerald-500/30' : 'bg-white border-gray-250 focus:border-emerald-500/30'
                        }`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">{t.description} (العربية)</label>
                      <textarea
                        required
                        rows={2}
                        value={itemDescAr}
                        onChange={(e) => setItemDescAr(e.target.value)}
                        placeholder="شرح موجز لخصائص برمجيتك أو منصتك وما تقدمه..."
                        className={`w-full p-3 border rounded-[4px] outline-none text-xs leading-relaxed resize-none ${
                          isThemeDark ? 'bg-black/40 border-white/5 focus:border-emerald-500/35' : 'bg-white border-gray-250 focus:border-emerald-500/35'
                        }`}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">English Description *</label>
                      <textarea
                        required
                        rows={2}
                        value={itemDescEn}
                        onChange={(e) => setItemDescEn(e.target.value)}
                        placeholder="A concise summary detailing the core architecture and value preposition..."
                        className={`w-full p-3 border rounded-[4px] outline-none text-xs leading-relaxed resize-none ${
                          isThemeDark ? 'bg-black/40 border-white/5 focus:border-emerald-500/35' : 'bg-white border-gray-250 focus:border-emerald-500/35'
                        }`}
                      />
                    </div>
                  </div>



                  <div className="pt-4 flex items-center justify-end gap-2 border-t border-[var(--border-main)] dark:border-white/5">
                    <button
                      type="button"
                      onClick={() => setIsCreateOpen(false)}
                      className={`px-4 h-10 border rounded-[4px] text-xs font-black transition-colors ${
                        isThemeDark ? 'border-white/5 text-gray-400 hover:text-white hover:bg-white/5' : 'border-gray-200 text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      {t.cancel}
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || uploadingImage}
                      className="px-5 h-10 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-extrabold text-xs rounded-[4px] shadow-lg transition-theme flex items-center justify-center gap-1.5 cursor-pointer leading-none"
                    >
                      {submitting ? (
                        <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      ) : (
                        editingProduct ? (language === 'ar' ? 'حفظ التغييرات' : 'Save Changes') : t.publishBtn
                      )}
                    </button>
                  </div>

                </form>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Shopping Cart Drawer */}
      <AnimatePresence>
        {isCartOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs cursor-pointer"
              onClick={() => setIsCartOpen(false)}
            />

            {/* Sidebar drawer container */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className={`w-full max-w-md h-full flex flex-col z-10 shadow-2xl relative border-l ${
                isThemeDark ? 'bg-[#0a0a0c] border-white/5 text-white' : 'bg-white border-gray-200 text-gray-900'
              }`}
            >
              {/* Header */}
              <div className="p-5 border-b border-[var(--border-main)] dark:border-white/5 flex items-center justify-between select-none">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-[4px] bg-emerald-500/10 text-emerald-500">
                    <ShoppingCart size={18} className="drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black tracking-tight select-none">
                      {language === 'ar' ? 'سلة المشتريات' : 'Shopping Cart'}
                    </h3>
                    <p className="text-[10px] text-gray-500 font-bold">
                      {cart.length === 1
                        ? (language === 'ar' ? 'منتج واحد مضاف حاليا' : '1 item added')
                        : language === 'ar'
                        ? `${cart.length} منتجات مضافة`
                        : `${cart.length} items added`}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsCartOpen(false)}
                  className={`w-9 h-9 rounded-[4px] border border-transparent hover:bg-gray-100 dark:hover:bg-white/5 flex items-center justify-center transition-theme ${
                    isThemeDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Items List */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3 select-none">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/5 border border-dashed border-emerald-500/10 flex items-center justify-center text-gray-500">
                      <ShoppingCart size={24} className="opacity-40" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-black text-gray-400">
                        {language === 'ar' ? 'سلتك فارغة تماماً' : 'Your Shopping Cart is Empty'}
                      </h4>
                      <p className="text-[10px] text-gray-500 leading-relaxed max-w-xs">
                        {language === 'ar' ? 'تصفح البرمجيات والأنظمة الفريدة المتوفرة في سوق بيربليكستا لإضافتها هنا' : 'Explore unique software assets and tools in the Perplexta Marketplace to add them here.'}
                      </p>
                    </div>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div
                      key={item.id}
                      className={`p-3 rounded-lg border flex items-start gap-3 transition-colors ${
                        isThemeDark ? 'bg-black/40 border-white/5' : 'bg-gray-50 border-gray-150'
                      }`}
                    >
                      {/* Product image */}
                      <div className="w-12 h-12 rounded-[4px] overflow-hidden shrink-0 bg-black/10 border border-white/5">
                        <img
                          src={getMediaUrl(item.product.image_url) || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe'}
                          alt={item.product.title_en}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Info & action */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1">
                          <h4 className="text-[11px] font-black truncate leading-tight">
                            {language === 'ar' ? item.product.title_ar : item.product.title_en}
                          </h4>
                          <button
                            onClick={() => handleRemoveFromCart(item.id)}
                            className="p-1 rounded-[4px] hover:bg-rose-500/10 text-gray-400 hover:text-rose-500 transition-colors shrink-0 -mt-0.5 cursor-pointer"
                            title={language === 'ar' ? 'إزالة' : 'Remove'}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>

                        <p className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider mt-0.5">
                          {item.licenseType === 'mit' ? 'MIT' : item.licenseType === 'apache_2' ? 'Apache 2.0' : item.licenseType === 'gpl_3' ? 'GNU GPL v3' : item.licenseType === 'bsd_3' ? 'BSD 3' : item.licenseType === 'cc_by_sa' ? 'CC BY-SA 4.0' : item.licenseType === 'commercial_standard' ? (language === 'ar' ? 'تجاري قياسي' : 'Proprietary Commercial Standard') : (language === 'ar' ? 'تجاري ممتد / مكرر' : 'Proprietary Commercial Extended')}
                        </p>

                        <div className="flex items-center justify-between mt-2.5">
                          {/* Price Display */}
                          <span className="text-[11px] font-black font-sans text-emerald-400">
                            {item.price <= 0 ? (language === 'ar' ? 'مجانًا' : 'FREE') : `$${item.price.toLocaleString()}`}
                          </span>

                          <span className="text-[9px] text-purple-400 font-bold font-sans">
                            {item.price <= 0 ? '' : `${(item.price * 10).toLocaleString()} ${language === 'ar' ? 'نقطة رصيد' : 'Points'}`}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer and checkout forms */}
              {cart.length > 0 && (
                <div className="p-5 border-t border-[var(--border-main)] dark:border-white/5 space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between select-none">
                      <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{language === 'ar' ? 'المجموع الكلي' : 'Grand Total'}</span>
                      <span className="text-base font-black font-sans text-emerald-400">
                        ${cart.reduce((sum, item) => sum + item.price, 0).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between select-none">
                      <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{language === 'ar' ? 'القيمة الإجمالية بالنقاط' : 'Grand Total Points'}</span>
                      <span className="text-xs font-black font-sans text-purple-400">
                        {(cart.reduce((sum, item) => sum + item.price, 0) * 10).toLocaleString()} {language === 'ar' ? 'نقطة' : 'Points'}
                      </span>
                    </div>
                  </div>

                  <div className={`h-px w-full ${isThemeDark ? 'bg-white/5' : 'bg-gray-150'}`} />

                  {buyingProgress === 'purchasing' ? (
                    <div className="flex flex-col items-center justify-center py-4 text-center space-y-2 select-none">
                      <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                      <span className="text-[10px] text-gray-400 font-bold animate-pulse">{t.purchaseProgress}</span>
                    </div>
                  ) : buyingProgress === 'success' ? (
                    <div className="flex flex-col items-center justify-center py-4 text-center text-emerald-400 space-y-1.5 select-none">
                      <Check size={20} className="animate-bounce" />
                      <span className="text-[10px] font-black">{language === 'ar' ? 'تهانينا! تم شراء المنتجات بنجاح!' : 'Congratulations! All items purchased successfully!'}</span>
                    </div>
                  ) : buyingProgress === 'insufficient' ? (
                    <div className="space-y-3">
                      <div className="flex items-start gap-1 pb-1">
                        <AlertCircle size={14} className="text-rose-500 shrink-0 mt-0.5" />
                        <span className="text-[10px] text-rose-400 font-black leading-normal">{t.insufficientHeadline}</span>
                      </div>
                      <p className="text-[9px] text-gray-500 leading-relaxed">{t.insufficientBody}</p>
                      <button
                        onClick={() => setBuyingProgress('idle')}
                        className="w-full h-9 rounded-[4px] border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 text-[10px] font-black transition-colors cursor-pointer"
                      >
                        {language === 'ar' ? 'الرجوع ومحاولة أخرى' : 'Go Back & Retry'}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <button
                        onClick={handleCartCheckoutWithWallet}
                        className="w-full h-10 rounded-[4px] bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-[11px] flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer shadow-lg shadow-emerald-500/10 transition-theme"
                      >
                        <Wallet size={14} />
                        <span>{language === 'ar' ? 'شراء كافة المنتجات بالرصيد المحفظة' : 'Buy Cart with Wallet Balance'}</span>
                      </button>

                      <button
                        onClick={handleCartCheckoutWithStripe}
                        className={`w-full h-10 rounded-[4px] border transition-theme font-bold text-[11px] flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer ${
                          isThemeDark
                            ? 'border-white/5 bg-[#141416] hover:bg-[#1a1a1c] text-white hover:text-emerald-400 hover:border-emerald-500/30'
                            : 'border-gray-250 bg-white text-gray-700 hover:bg-gray-50 hover:text-emerald-600 hover:border-emerald-500/30'
                        }`}
                      >
                        <CreditCard size={14} />
                        <span>{language === 'ar' ? 'شراء عبر بوابة الدفع الآمنة (Stripe)' : 'Pay with Credit Card (Stripe)'}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Dynamic Pop-up Ad */}
      <AnimatePresence>
        {showAdPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="bg-[var(--bg-primary)] border border-[var(--border-main)] rounded-lg w-full max-w-md p-6 shadow-2xl relative"
            >
              <button
                onClick={() => {
                  setShowAdPopup(false);
                  localStorage.setItem('hide_marketplace_ad', 'true');
                }}
                className="absolute top-4 right-4 text-gray-400 hover:text-emerald-500 hover:bg-[var(--bg-overlay)] p-1.5 rounded-[4px] transition-theme"
              >
                <X size={16} />
              </button>

              <div className="flex flex-col gap-4">
                {/* Promo Badge */}
                <div className="flex items-center gap-2">
                  <span className="bg-emerald-500/10 text-emerald-500 text-[10px] font-black px-2 py-0.5 rounded tracking-widest uppercase">
                    {language === 'ar' ? 'عرض الماركت بليس' : 'Marketplace Special'}
                  </span>
                  <div className="h-px flex-1 bg-[var(--border-main)]/50" />
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0 text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                    <Gift size={24} />
                  </div>
                  <div className={`flex flex-col gap-1 ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                    <h3 className="text-sm font-black text-[var(--text-primary)]">
                      {language === 'ar' ? 'احصل على خصم 20% على الاشتراك السنوي' : 'Get 20% Off Your Annual Plan'}
                    </h3>
                    <p className="text-xs text-gray-500 leading-relaxed font-sans">
                      {language === 'ar'
                        ? 'ضاعف قوتك التحليلية الآن! اشترك في خطة النخبة السنوية لتحصل على وصول كامل وغير محدود لأقوى نماذج الذكاء الاصطناعي وبوتات التداول.'
                        : 'Maximize your analytical capabilities today! Upgrade to our VIP Annual Plan and enjoy absolute, unrestricted access to top-tier models and indicators.'}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 mt-2">
                  <button
                    onClick={() => {
                      setShowAdPopup(false);
                      localStorage.setItem('hide_marketplace_ad', 'true');
                    }}
                    className="flex-1 py-2 rounded-[4px] text-xs font-bold uppercase text-[var(--text-secondary)] bg-[var(--bg-overlay)] hover:bg-[var(--bg-surface)] transition-theme border border-[var(--border)]"
                  >
                    {language === 'ar' ? 'تخطي العرض' : 'Dismiss'}
                  </button>
                  <button
                    onClick={() => {
                      setShowAdPopup(false);
                      localStorage.setItem('hide_marketplace_ad', 'true');
                      navigate('/subscription');
                    }}
                    className="flex-1 py-2 rounded-[4px] text-xs font-black uppercase bg-emerald-500 text-black hover:bg-emerald-400 transition-theme shadow-[0_5px_15px_rgba(16,185,129,0.3)] flex items-center justify-center gap-1.5"
                  >
                    <span>{language === 'ar' ? 'استفد من الخصم' : 'Claim Offer'}</span>
                    <ArrowRight size={14} className={language === 'ar' ? 'rotate-180' : ''} />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { motion, AnimatePresence } from 'motion/react';
import {
  Grid, Building2, Smartphone, Puzzle, Brain, TrendingUp, BarChart2, Layout,
  Rocket, Megaphone, Gamepad2, BookOpen, RefreshCw, Code, Package, Eye, Play,
  Plus, X, Upload, Check, ExternalLink, ArrowLeft, ArrowRight, Wallet, CreditCard,
  ChevronDown, SlidersHorizontal, Trash2, Search, Sliders, AlertCircle, Sparkles, Flame, Star, Award, ShoppingBag, Gift
} from 'lucide-react';
import { toast } from 'sonner';

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

const DEFAULT_ITEMS: MarketplaceItem[] = [
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
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedPriceRange, setSelectedPriceRange] = useState('all');

  const [openParents, setOpenParents] = useState<Record<string, boolean>>({
    code: true,
    fintech: false,
    ui: false,
    bundles: false,
    digital: false,
    free: false
  });

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [itemTitleAr, setItemTitleAr] = useState('');
  const [itemTitleEn, setItemTitleEn] = useState('');
  const [itemDescAr, setItemDescAr] = useState('');
  const [itemDescEn, setItemDescEn] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemDiscount, setItemDiscount] = useState('');
  const [itemCategory, setItemCategory] = useState('saas');
  const [itemContact, setItemContact] = useState('');
  const [itemImage, setItemImage] = useState<string | null>(null);
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

  const [selectedProduct, setSelectedProduct] = useState<MarketplaceItem | null>(null);
  const [selectedLicenseType, setSelectedLicenseType] = useState<string>('regular');
  const [buyingProgress, setBuyingProgress] = useState<'idle' | 'purchasing' | 'success' | 'insufficient'>('idle');

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const dir = language === 'ar' ? 'rtl' : 'ltr';
  const t = language === 'ar' ? dict.ar : dict.en;

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/marketplace/items');
      if (res.ok) {
        const data = await res.json();
        const combined = [...data, ...DEFAULT_ITEMS.filter(di => !data.some((db: any) => db.title_en === di.title_en))];
        setItems(combined);
      } else {
        setItems(DEFAULT_ITEMS);
      }
    } catch (err) {
      console.error(err);
      setItems(DEFAULT_ITEMS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

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
    if (item.views > 15) list.push('trending');
    if (item.id % 3 === 0) list.push('featured');
    if (item.id % 5 === 0) list.push('exclusive');
    if (list.length === 0) list.push('new');
    return list;
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setUploadError('');

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
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
                  setUploadError(language === 'ar' ? 'فشل إدراج الصورة.' : 'Upload failed.');
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

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemTitleAr || !itemTitleEn || !itemDescAr || !itemDescEn || !itemPrice) return;

    setSubmitting(true);
    const catObj = children.find(c => c.id === itemCategory) || children[0];

    try {
      const parsedPrice = parseFloat(itemPrice);
      const discountPct = parseFloat(itemDiscount) || 0;
      const finalPrice = parsedPrice - (parsedPrice * (discountPct / 100));

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
          price: finalPrice,
          category_en: catObj.nEn,
          category_ar: catObj.nAr,
          image_url: itemImage || 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1080&h=1080&fit=crop',
          contact_link: itemContact || 'https://t.me/perplexta_support'
        })
      });

      if (res.ok) {
        setSubmitSuccess(true);
        toast.success(t.successMsg);
        setTimeout(() => {
          setIsCreateOpen(false);
          setSubmitSuccess(false);
          setItemTitleAr('');
          setItemTitleEn('');
          setItemDescAr('');
          setItemDescEn('');
          setItemPrice('');
          setItemDiscount('');
          setItemContact('');
          setItemImage(null);
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
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleManualImageUrl = (url: string) => {
    setItemImage(url);
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

    const matchesSearch =
      title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
      catAr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      catEn.toLowerCase().includes(searchQuery.toLowerCase());

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
  });

  const getLicensePriceMultiplier = (license: string): number => {
    switch (license) {
      case 'extended': return 2.5;
      case 'gpl': return 1.5;
      case 'plr': return 5;
      default: return 1;
    }
  };

  const getComputedPrice = (): number => {
    if (!selectedProduct) return 0;
    const base = Number(selectedProduct.price);
    const multi = getLicensePriceMultiplier(selectedLicenseType);
    return Math.round(base * multi);
  };

  const handleBuyWithWallet = () => {
    if (!user) {
      toast.error(language === 'ar' ? 'يرجى تسجيل الدخول أولاً لإجراء هذه المعاملة' : 'Please log in to complete this transaction.');
      return;
    }

    const price = getComputedPrice();
    if (balanceUSD < price) {
      setBuyingProgress('insufficient');
      return;
    }

    setBuyingProgress('purchasing');
    setTimeout(() => {
      setBuyingProgress('success');
      toast.success(t.purchaseDone);
      refreshUser();
      setTimeout(() => {
        if (selectedProduct?.contact_link) {
          window.open(selectedProduct.contact_link, '_blank');
        }
        setSelectedProduct(null);
        setBuyingProgress('idle');
      }, 3000);
    }, 2000);
  };

  const isThemeDark = theme === 'dark';

  return (
    <div
      className={`h-[calc(100vh-72px)] w-full flex flex-col overflow-hidden relative transition-colors duration-300 select-none ${
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
                  <button
                    onClick={() => setIsCreateOpen(true)}
                    className="h-10 px-4 rounded-[4px] bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/25 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold transition-all duration-300 active:scale-95 text-xs flex items-center justify-center gap-1.5 hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.5)] cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>{t.listNewAsset}</span>
                  </button>
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
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-all ${
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

              <div className={`flex items-center border rounded-lg px-3 py-1.5 w-full sm:w-72 md:w-80 lg:w-96 flex-shrink-0 transition-all ${
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
                              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
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
              
              {loading ? (
                <div className="py-24 flex flex-col items-center justify-center space-y-3">
                  <div className="w-8 h-8 rounded-full border-2 border-t-emerald-500 border-r-emerald-500 border-l-transparent border-b-transparent animate-spin" />
                  <span className="text-xs text-gray-500 font-medium">{t.loadingAssets}</span>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="py-24 flex flex-col items-center justify-center text-gray-500 max-w-sm mx-auto text-center space-y-3">
                  <ShoppingBag size={40} className="opacity-30" />
                  <p className="text-xs font-semibold leading-relaxed">{t.noProducts}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  <AnimatePresence mode="popLayout">
                    {filteredItems.map(item => {
                      const hList = getProductHighlights(item);
                      const isTrending = hList.includes('trending');
                      const isFeatured = hList.includes('featured');
                      const isExclusive = hList.includes('exclusive');
                      const isNew = hList.includes('new');

                      return (
                        <motion.div
                          key={item.id}
                          layout
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          whileHover={{ y: -6, transition: { duration: 0.25, ease: "easeOut" } }}
                          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                          onClick={() => setSelectedProduct(item)}
                          className={`rounded-xl border overflow-hidden transition-all duration-300 flex flex-col h-full cursor-pointer relative group ${
                            isThemeDark
                              ? 'bg-[#090a0c] border-white/5 hover:border-emerald-500/20 hover:shadow-[0_15px_30px_rgba(0,0,0,0.8)]'
                              : 'bg-white border-gray-150 hover:border-emerald-500/30 hover:shadow-[0_15px_30px_rgba(0,0,0,0.05)]'
                          }`}
                        >
                          {/* Bento Product Header Cover */}
                          <div className="h-40 relative overflow-hidden bg-black/45 shrink-0 select-none">
                            <img
                              src={item.image_url || 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1080&h=1080&fit=crop'}
                              alt={language === 'ar' ? item.title_ar : item.title_en}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            />
                            <div className={`absolute inset-0 bg-gradient-to-t ${isThemeDark ? 'from-[#090a0c]' : 'from-white/40'} via-transparent to-transparent opacity-60`} />

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
                                <div className="flex flex-wrap gap-1">
                                  {isTrending && (
                                    <span className="bg-orange-500/10 border border-orange-500/25 text-orange-500 text-[7px] font-black px-1.5 py-0.5 rounded-[3px] flex items-center gap-0.5 shadow-[0_0_10px_rgba(249,115,22,0.15)] shrink-0 animate-pulse">
                                      <Flame size={7} strokeWidth={3.5} />
                                      <span>{t.trending}</span>
                                    </span>
                                  )}
                                  {isFeatured && (
                                    <span className="bg-yellow-500/10 border border-yellow-500/25 text-yellow-500 text-[7px] font-black px-1.5 py-0.5 rounded-[3px] flex items-center gap-0.5 shadow-[0_0_10px_rgba(234,179,8,0.15)] shrink-0">
                                      <Award size={7} strokeWidth={3.5} />
                                      <span>{t.featured}</span>
                                    </span>
                                  )}
                                  {isExclusive && (
                                    <span className="bg-purple-500/10 border border-purple-500/25 text-purple-400 text-[7px] font-black px-1.5 py-0.5 rounded-[3px] flex items-center gap-0.5 shadow-[0_0_10px_rgba(168,85,247,0.15)] shrink-0">
                                      <Star size={7} strokeWidth={3.5} />
                                      <span>{t.exclusive}</span>
                                    </span>
                                  )}
                                  {isNew && (
                                    <span className="bg-blue-500/10 border border-blue-500/25 text-blue-500 text-[7px] font-black px-1.5 py-0.5 rounded-[3px] flex items-center gap-0.5 shadow-[0_0_10px_rgba(59,130,246,0.15)] shrink-0">
                                      <Sparkles size={7} strokeWidth={3.5} />
                                      <span>{t.new}</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                              
                              <button className={`px-2 py-1 text-[10px] font-black rounded-[4px] transition-all duration-300 flex items-center gap-1 border shrink-0 ${
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
                </div>
              )}

            </main>
          </div>

          {/* Footer Block */}
          <footer className={`p-4 border-t text-[10px] select-none flex-shrink-0 ${
            isThemeDark ? 'bg-[#080808] border-white/5 text-gray-500' : 'bg-gray-50 border-gray-150 text-gray-600'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-center sm:text-right">
              <span className="font-sans font-black tracking-widest text-[9px] uppercase">
                PERPLEXTA PLATFORM MARKETPLACE SYSTEM
              </span>
              <span>
                {language === 'ar' ? 'الموقع محفوظ لـ PERPLEXTA 2026 ©' : 'All Sovereignties Reserved PERPLEXTA 2026 ©'}
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
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
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
                              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
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
              }}
              className="absolute inset-0 bg-black/85 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.3 }}
              className={`relative w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl border flex flex-col scrollbar-none shadow-2xl ${
                isThemeDark ? 'bg-[#090a0c] border-white/10 text-white shadow-black/90' : 'bg-white border-gray-200 text-gray-900 shadow-gray-300/40'
              }`}
            >
              <div className="relative h-56 md:h-64 object-cover overflow-hidden bg-black/60 sticky top-0 z-[101] shrink-0">
                <img
                  src={selectedProduct.image_url || 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1080&h=1080&fit=crop'}
                  className="w-full h-full object-cover"
                  alt=""
                />
                <div className={`absolute inset-0 bg-gradient-to-t ${isThemeDark ? 'from-[#090a0c]' : 'from-white'} via-transparent to-transparent opacity-85`} />
                
                <button
                  onClick={() => {
                    setSelectedProduct(null);
                    setBuyingProgress('idle');
                  }}
                  className="absolute top-4 left-4 w-9 h-9 rounded-lg bg-black/50 border border-white/10 flex items-center justify-center transition-all hover:bg-black/80 text-white cursor-pointer z-10"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Details Body */}
              <div className="p-6 -mt-10 relative z-10 space-y-6 flex-1">
                
                {/* Title block */}
                <div className="space-y-2">
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

                    <div className="flex items-center gap-2">
                      {selectedProduct.contact_link && (
                        <a
                          href={selectedProduct.contact_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-colors ${
                            isThemeDark ? 'border-white/5 bg-white/5 text-gray-350 hover:text-white hover:bg-white/15' : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                          }`}
                          title={t.viewLink}
                        >
                          <Eye size={14} />
                        </a>
                      )}
                    </div>
                  </div>

                  <p className={`text-[10px] md:text-xs leading-relaxed font-medium leading-relaxed ${
                    isThemeDark ? 'text-gray-400/90' : 'text-gray-550'
                  }`}>
                    {language === 'ar' ? selectedProduct.description_ar : selectedProduct.description_en}
                  </p>
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
                      {t.licenseTitle}
                    </h4>
                    
                    <div className="space-y-1.5">
                      {[
                        { type: 'regular', name: 'Regular License', multi: 1 },
                        { type: 'extended', name: 'Extended License', multi: 2.5 },
                        { type: 'gpl', name: 'GPL / OSS Free Use', multi: 1.5 },
                        { type: 'plr', name: 'PLR / MRR Commercial Rights', multi: 5 }
                      ].map(lic => {
                        const isActive = selectedLicenseType === lic.type;
                        const licPrice = Math.round(Number(selectedProduct.price) * lic.multi);
                        return (
                          <div
                            key={lic.type}
                            onClick={() => setSelectedLicenseType(lic.type)}
                            className={`rounded-lg border p-2.5 flex items-center justify-between cursor-pointer transition-all duration-300 ${
                              isActive
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-black'
                                : (isThemeDark ? 'border-white/5 bg-transparent text-gray-400 hover:bg-white/5' : 'border-gray-150 bg-white text-gray-600 hover:bg-gray-50')
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                                isActive ? 'border-emerald-500 dark:border-emerald-400 text-emerald-600 dark:text-emerald-400' : 'border-gray-500'
                              }`}>
                                {isActive && <div className="w-1.5 h-1.5 rounded-full bg-current" />}
                              </div>
                              <span className="text-[10px] font-black">{lic.name}</span>
                            </div>
                            <span className="text-[10px] font-black select-none text-emerald-500">
                              {licPrice <= 0 ? (language === 'ar' ? 'مجانًا' : 'FREE') : `$${licPrice.toLocaleString()}`}
                            </span>
                          </div>
                        );
                      })}
                    </div>
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
                              href={selectedProduct.contact_link || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full h-9 rounded-lg bg-emerald-500 text-black hover:bg-emerald-400 transition-all font-black text-[10px] flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer shadow-lg shadow-emerald-500/10"
                            >
                              <ExternalLink size={12} strokeWidth={2.5} />
                              <span>{language === 'ar' ? 'تحميل مجاني / زيارة الرابط' : 'Get / Free Download'}</span>
                            </a>
                          ) : (
                            <>
                              <button
                                onClick={handleBuyWithWallet}
                                className="w-full h-9 rounded-lg bg-emerald-500 text-black hover:bg-emerald-400 transition-all font-black text-[10px] flex items-center justify-center gap-1 active:scale-95 cursor-pointer shadow-lg shadow-emerald-500/10"
                              >
                                <Wallet size={12} />
                                <span>{t.buyWithBalance}</span>
                              </button>

                              <a
                                href={selectedProduct.contact_link || 'https://t.me/perplexta_support'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`w-full h-9 rounded-lg border transition-all font-bold text-[10px] flex items-center justify-center gap-1 active:scale-95 ${
                                  isThemeDark
                                    ? 'border-white/5 bg-[#141416] hover:bg-[#1a1a1c] text-white'
                                    : 'border-gray-250 bg-white text-gray-700 hover:bg-gray-50'
                                }`}
                              >
                                <CreditCard size={12} />
                                <span>{t.creditCard}</span>
                              </a>
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
                  <button
                    onClick={() => {
                      setSelectedProduct(null);
                      setIsCreateOpen(true);
                    }}
                    className="flex-shrink-0 relative z-10 text-[9px] font-black bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-2.5 rounded-lg transition-all active:scale-95 flex items-center gap-1 shadow-lg shadow-emerald-500/20 cursor-pointer"
                  >
                    <Plus size={10} />
                    <span>{t.ctaBtn}</span>
                  </button>
                </div>

              </div>
            </motion.div>
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
                  <span>{t.insertModalTitle}</span>
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

                  {/* 1080x1080 Image Section */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">
                        {language === 'ar' ? 'غلاف المعرض (صورة العرض)' : 'Asset Image / Photo Cover URL'}
                      </label>
                      <input
                        type="text"
                        value={itemImage || ''}
                        onChange={(e) => handleManualImageUrl(e.target.value)}
                        placeholder="https://images.unsplash.com/photo-..."
                        className={`w-full h-10 px-3 border rounded-[4px] outline-none text-xs mb-1.5 ${
                          isThemeDark ? 'bg-black/40 border-white/5 focus:border-emerald-500/35' : 'bg-white border-gray-250 focus:border-emerald-500/35'
                        }`}
                      />

                      <label className={`flex flex-col items-center justify-center w-full h-20 border-2 border-dashed rounded-lg cursor-pointer transition-colors relative ${
                        isThemeDark ? 'border-white/10 hover:border-emerald-500/30 hover:bg-white/5' : 'border-gray-200 hover:border-emerald-500/35 hover:bg-gray-50'
                      }`}>
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                        
                        {itemImage ? (
                          <div className="absolute inset-0 w-full h-full object-cover">
                            <img src={itemImage} className="w-full h-full object-cover rounded-lg" alt="" />
                          </div>
                        ) : uploadingImage ? (
                          <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <div className="text-center select-none text-gray-500">
                            <Upload className="w-4 h-4 mx-auto mb-1 opacity-50" />
                            <p className="text-[8px] font-bold">{t.dragAndDrop}</p>
                          </div>
                        )}
                      </label>
                      {uploadError && <p className="text-[8px] text-red-500">{uploadError}</p>}
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

                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">{t.contactSeller} *</label>
                    <input
                      type="url"
                      required
                      value={itemContact}
                      onChange={(e) => setItemContact(e.target.value)}
                      placeholder="https://t.me/your_telegram_account"
                      className={`w-full h-10 px-3 border rounded-[4px] outline-none text-xs ${
                        isThemeDark ? 'bg-black/40 border-white/5 focus:border-emerald-500/35' : 'bg-white border-gray-250 focus:border-emerald-500/35'
                      }`}
                    />
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
                      className="px-5 h-10 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-extrabold text-xs rounded-[4px] shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer leading-none"
                    >
                      {submitting ? (
                        <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      ) : (
                        t.publishBtn
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

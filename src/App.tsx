import React, { Suspense, useEffect, useState, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppProvider, useAppContext } from './context/AppContext';
import { VideoResourceProvider } from './context/VideoResourceContext';
import { MainLayout } from './layouts/MainLayout';
import { AdminLayout } from './layouts/AdminLayout';
import { ChatPage } from './pages/ChatPage';
import { RewardsPage } from './pages/RewardsPage';
import { SubscriptionPage } from './pages/SubscriptionPage';
import { SettingsPage } from './pages/SettingsPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { Terms } from './pages/Terms';
import { Privacy } from './pages/Privacy';
import { About } from './pages/About';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { BulletinBoardPage } from './pages/BulletinBoardPage';
import { BlogPage } from './pages/BlogPage';
import { AdminCommunityPage } from './pages/AdminCommunityPage';
import { MarketplacePage } from './pages/MarketplacePage';
import { SharedSnapshotPage } from './pages/SharedSnapshotPage';
import { RecommendationsPage } from './pages/RecommendationsPage';
import { StudioPage } from './pages/StudioPage';
import { IncentiveCard } from './components/IncentiveCard';
import { PWACinematicModal } from './components/PWACinematicModal';
import { GoogleAnalytics } from './components/GoogleAnalytics';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Toaster } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck } from 'lucide-react';
import { DefaultLogo } from './components/DefaultLogo';
import { UpgradePromptModal } from './components/UpgradePromptModal';
import { InactivityWarningModal } from './components/InactivityWarningModal';

const CenteredLoader = () => {
  const { siteSettings, language, theme } = useAppContext();
  const siteName = language === 'ar' ? siteSettings.siteNameAr : siteSettings.siteName;

  const loaderType = localStorage.getItem('app_loader_type') || 'refresh';
  if (loaderType === 'refresh') return null;
  let loaderText = '';
  if (language === 'ar') {
    if (loaderType === 'login') {
      loaderText = 'جاري تفعيل بيربليكستا';
    } else if (loaderType === 'logout') {
      loaderText = 'جاري مسح سجلات بيربليكستا';
    } else {
      loaderText = 'جاري تحديث النظام';
    }
  } else {
    if (loaderType === 'login') {
      loaderText = 'ACTIVATING PERPLEXTA';
    } else if (loaderType === 'logout') {
      loaderText = 'CLEARING PERPLEXTA LOGS';
    } else {
      loaderText = 'SYSTEM UPDATE IN PROGRESS';
    }
  }

  const currentTheme = theme || localStorage.getItem('theme') || 'dark';
  const activeLogo = (currentTheme === 'light' && siteSettings.logoLightBase64) 
    ? siteSettings.logoLightBase64 
    : siteSettings.logoBase64;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[var(--bg-primary)]"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-500/5 via-transparent to-transparent pointer-events-none" />

      <div className="relative flex flex-col items-center gap-10">
        <div className="relative">
          <motion.div
            animate={{ opacity: [0.15, 0.35, 0.15] }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
            className="absolute inset-0 bg-emerald-500 rounded-full blur-[50px]"
          />
          <div className="relative w-24 h-24 rounded-lg bg-gradient-to-br from-gray-900 to-black border border-[var(--border-main)]/80 flex items-center justify-center shadow-2xl overflow-hidden">
            {activeLogo ? (
              <img src={activeLogo} alt="Logo" className="w-[84px] h-[84px] object-cover block rounded-sm" />
            ) : (
              <DefaultLogo className="w-16 h-16" iconClassName="w-10 h-10" />
            )}
          </div>
        </div>

        <div className="flex flex-col items-center gap-4 text-center">
          <div className="space-y-1">
            <h2 className="text-2xl font-black text-white uppercase tracking-[0.2em]">
              {siteName || (language === 'ar' ? 'بيربليكستا' : 'PERPLEXTA')}
            </h2>
            <div className="flex items-center justify-center gap-3">
              <div className="h-px w-12 bg-gradient-to-r from-transparent to-gray-800" />
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.4em] translate-y-0.5">
                {loaderText}
              </span>
              <div className="h-px w-12 bg-gradient-to-l from-transparent to-gray-800" />
            </div>
          </div>

          <div className="w-48 h-[2px] bg-gray-900/50 rounded-full overflow-hidden">
            <motion.div
              animate={{ x: [-192, 192] }}
              transition={{ repeat: Infinity, duration: 1.8, ease: "linear" }}
              className="w-full h-full bg-gradient-to-r from-transparent via-emerald-500 to-transparent"
            />
          </div>
        </div>
      </div>

      <div className="absolute bottom-10 flex items-center gap-2 px-4 py-2 rounded-md bg-gray-900/30 border border-white/[0.03] backdrop-blur-md">
        <ShieldCheck size={14} className="text-emerald-500" />
        <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">
          {language === 'ar' ? 'نظام مشفر ومستقر' : 'STABLE ENCRYPTED PROTOCOL'}
        </span>
      </div>
    </motion.div>
  );
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isAuthReady } = useAppContext();
  if (!isAuthReady) return <CenteredLoader />;
  if (!user) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isAuthReady } = useAppContext();
  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;
  if (!isAuthReady) return <CenteredLoader />;
  const isAdmin = user && (['admin'].includes(user.role || '') || (adminEmail && user.email === adminEmail));
  const isSupport = user && ['support'].includes(user.role || '');
  if (!isAdmin && !isSupport) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const PWAWrapper = ({ children }: { children: React.ReactNode }) => {
  const { theme, isAuthReady, siteSettings, language } = useAppContext();
  const location = useLocation();
  const [dbRouteSeo, setDbRouteSeo] = useState<any[]>([]);
  const isFirstMount = useRef(true);

  useEffect(() => {
    fetch('/api/seo-routes')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setDbRouteSeo(data);
      })
      .catch(err => console.warn('[SEO] Failed to fetch route SEO settings:', err));
  }, []); // Only fetch once on mount

  useEffect(() => {
    const currentPath = location.pathname;

    // Check if this route is server-handled for initial SEO injection
    const isDynamicPublicRoute = currentPath.startsWith('/blog/') || 
                                 currentPath.startsWith('/marketplace/') || 
                                 currentPath.startsWith('/share/') ||
                                 currentPath.startsWith('/bulletin/');
    
    const PUBLIC_WHITELIST = ['/', '/subscription', '/marketplace', '/blog', '/bulletin', '/rewards', '/terms', '/privacy', '/about'];
    const isStaticPublicRoute = PUBLIC_WHITELIST.includes(currentPath);

    // Skip first mount if it's a route the server likely already handled
    // This prevents the "flash" of generic title on refresh
    if (isFirstMount.current && (isDynamicPublicRoute || isStaticPublicRoute)) {
      isFirstMount.current = false;
      return;
    }
    isFirstMount.current = false;

    const dynamicBlockedList = siteSettings?.blocked_paths
      ? siteSettings.blocked_paths.split(',').map((p: string) => p.trim()).filter(Boolean)
      : [];

    const isSensitive = [
      '/chat',
      '/admin',
      '/settings',
      '/rewards',
      '/wallet',
      '/reset-password',
      '/admin-community',
      '/admin-sections',
      '/admin/sections',
      ...dynamicBlockedList
    ].some(sensitivePath => {
      const cleanPath = sensitivePath.startsWith('/') ? sensitivePath : '/' + sensitivePath;
      return currentPath === cleanPath || currentPath.startsWith(cleanPath + '/');
    });

    let robotsMeta = document.querySelector('meta[name="robots"]');
    if (!robotsMeta) {
      robotsMeta = document.createElement('meta');
      robotsMeta.setAttribute('name', 'robots');
      document.head.appendChild(robotsMeta);
    }

    let googlebotMeta = document.querySelector('meta[name="googlebot"]');
    if (!googlebotMeta) {
      googlebotMeta = document.createElement('meta');
      googlebotMeta.setAttribute('name', 'googlebot');
      document.head.appendChild(googlebotMeta);
    }

    if (isSensitive) {
      robotsMeta.setAttribute('content', 'noindex, nofollow, noarchive, nosnippet, max-image-preview:none');
      googlebotMeta.setAttribute('content', 'noindex, nofollow, noarchive, nosnippet');
      
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) ogTitle.setAttribute('content', language === 'ar' ? 'بيربليكستا - مساحة عمل محصنة' : 'Perplexta - Secure Workspace');
      
      const ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc) ogDesc.setAttribute('content', language === 'ar' ? 'صفحة آمنة ومحمية من قبل الخوارزميات السيادية لمنصة بيربليكستا.' : 'Secure node with zero crawling, protected under deep local sovereign protocols.');
      
    } else {
      robotsMeta.setAttribute('content', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
      googlebotMeta.setAttribute('content', 'index, follow');

      const siteName = language === 'ar' ? (siteSettings?.siteNameAr || siteSettings?.siteName) : siteSettings?.siteName;
      const resolvedSiteName = siteName || (language === 'ar' ? 'بيربليكستا' : 'Perplexta');
      
      const siteDesc = language === 'ar' ? (siteSettings?.siteDescriptionAr || siteSettings?.siteDescription) : siteSettings?.siteDescription;
      const resolvedDesc = (language === 'ar' ? siteSettings?.seoDescriptionAr : siteSettings?.seoDescriptionEn) || siteDesc || '';
      
      const resolvedKeywords = (language === 'ar' ? siteSettings?.keywordsAr : siteSettings?.keywordsEn) || '';
      const resolvedOGImage = siteSettings?.seoImageUrl || '/app-assets/og-image.png';

      // Dynamic database route lookup
      const routeMatch = dbRouteSeo.find(r => r.route === currentPath && r.is_active !== false);

      const dbTitle = routeMatch ? (language === 'ar' ? (routeMatch.title_ar || routeMatch.title_en) : (routeMatch.title_en || routeMatch.title_ar)) : '';
      const dbDesc = routeMatch ? (language === 'ar' ? (routeMatch.description_ar || routeMatch.description_en) : (routeMatch.description_en || routeMatch.description_ar)) : '';
      const dbKeywords = routeMatch ? (language === 'ar' ? (routeMatch.keywords_ar || routeMatch.keywords_en) : (routeMatch.keywords_en || routeMatch.keywords_ar)) : '';
      const dbOgImage = routeMatch?.og_image_url || resolvedOGImage;

      let pageTitlePart = '';
      if (currentPath === '/subscription') {
        pageTitlePart = language === 'ar' ? 'خطط الاشتراك والترقيات النخبة' : 'Premium Elite Subscription Plans';
      } else if (currentPath === '/marketplace') {
        pageTitlePart = language === 'ar' ? 'متجر الأكواد ونخب مطالبات الذكاء الاصطناعي' : 'Elite Prompts & Advanced Software Marketplace';
      } else if (currentPath === '/blog') {
        pageTitlePart = language === 'ar' ? 'المدونة التقنية والتقارير الاستخباراتية' : 'Tech Intelligence Blog & Decoded Publications';
      } else if (currentPath === '/about') {
        pageTitlePart = language === 'ar' ? 'من نحن ورؤية بيربليكستا السيادية' : 'About Our Sovereign High-Precision Framework';
      } else if (currentPath === '/terms') {
        pageTitlePart = language === 'ar' ? 'شروط الخدمة والاتفاقية الرقمية' : 'Terms of Service';
      } else if (currentPath === '/privacy') {
        pageTitlePart = language === 'ar' ? 'سياسة الخصوصية وحقوق حماية البيانات' : 'Strict Privacy & Data Security Regulations';
      } else if (currentPath === '/Studio') {
        pageTitlePart = language === 'ar' ? 'استوديو بيربليكستا' : 'Perplexta Studio';
      }

      const defaultTitle = pageTitlePart ? `${pageTitlePart} | ${resolvedSiteName}` : `${resolvedSiteName} - ${language === 'ar' ? 'منصة التحليل والذكاء الاصطناعي الفاخر والمستقل' : 'Sovereign High-Performance AI Analysis Platform'}`;
      
      const finalTitle = dbTitle || defaultTitle;
      const finalDesc = dbDesc || resolvedDesc;
      const finalKeywords = dbKeywords || resolvedKeywords;
      const rawOGImage = dbOgImage;
      const finalOGImage = rawOGImage.startsWith('/') ? `${window.location.origin}${rawOGImage}` : rawOGImage;
      const currentUrl = window.location.href;

      // Only overwrite if we have a specific match or it's a static route we "own"
      // This prevents generic overwrites for dynamic pages like Blog or Marketplace details
      const shouldOverwrite = dbTitle || pageTitlePart || currentPath === '/';
      
      if (!isDynamicPublicRoute || shouldOverwrite) {
        document.title = finalTitle;

        let metaDescription = document.querySelector('meta[name="description"]');
        if (!metaDescription) {
          metaDescription = document.createElement('meta');
          metaDescription.setAttribute('name', 'description');
          document.head.appendChild(metaDescription);
        }
        metaDescription.setAttribute('content', finalDesc);

        let ogTitle = document.querySelector('meta[property="og:title"]');
        if (!ogTitle) {
          ogTitle = document.createElement('meta');
          ogTitle.setAttribute('property', 'og:title');
          document.head.appendChild(ogTitle);
        }
        ogTitle.setAttribute('content', finalTitle);

        let ogDesc = document.querySelector('meta[property="og:description"]');
        if (!ogDesc) {
          ogDesc = document.createElement('meta');
          ogDesc.setAttribute('property', 'og:description');
          document.head.appendChild(ogDesc);
        }
        ogDesc.setAttribute('content', finalDesc);

        let ogImage = document.querySelector('meta[property="og:image"]');
        if (!ogImage) {
          ogImage = document.createElement('meta');
          ogImage.setAttribute('property', 'og:image');
          document.head.appendChild(ogImage);
        }
        ogImage.setAttribute('content', finalOGImage);

        let ogUrl = document.querySelector('meta[property="og:url"]');
        if (!ogUrl) {
          ogUrl = document.createElement('meta');
          ogUrl.setAttribute('property', 'og:url');
          document.head.appendChild(ogUrl);
        }
        ogUrl.setAttribute('content', currentUrl);

        let ogSiteName = document.querySelector('meta[property="og:site_name"]');
        if (!ogSiteName) {
          ogSiteName = document.createElement('meta');
          ogSiteName.setAttribute('property', 'og:site_name');
          document.head.appendChild(ogSiteName);
        }
        ogSiteName.setAttribute('content', resolvedSiteName);

        let twitterTitle = document.querySelector('meta[name="twitter:title"]');
        if (!twitterTitle) {
          twitterTitle = document.createElement('meta');
          twitterTitle.setAttribute('name', 'twitter:title');
          document.head.appendChild(twitterTitle);
        }
        twitterTitle.setAttribute('content', finalTitle);

        let twitterDesc = document.querySelector('meta[name="twitter:description"]');
        if (!twitterDesc) {
          twitterDesc = document.createElement('meta');
          twitterDesc.setAttribute('name', 'twitter:description');
          document.head.appendChild(twitterDesc);
        }
        twitterDesc.setAttribute('content', finalDesc);

        let twitterImage = document.querySelector('meta[name="twitter:image"]');
        if (!twitterImage) {
          twitterImage = document.createElement('meta');
          twitterImage.setAttribute('name', 'twitter:image');
          document.head.appendChild(twitterImage);
        }
        twitterImage.setAttribute('content', finalOGImage);

        let metaKeywords = document.querySelector('meta[name="keywords"]');
        if (!metaKeywords) {
          metaKeywords = document.createElement('meta');
          metaKeywords.setAttribute('name', 'keywords');
          document.head.appendChild(metaKeywords);
        }
        metaKeywords.setAttribute('content', finalKeywords);

        let canonicalLink = document.querySelector('link[rel="canonical"]');
        if (!canonicalLink) {
          canonicalLink = document.createElement('link');
          canonicalLink.setAttribute('rel', 'canonical');
          document.head.appendChild(canonicalLink);
        }
        canonicalLink.setAttribute('href', currentUrl);
      }
    }
  }, [location.pathname, siteSettings, language, dbRouteSeo]);

  useEffect(() => {
    if (isAuthReady) {
      const loader = document.getElementById('initial-loader');
      if (loader) {
        loader.style.transition = 'opacity 0.4s ease-out';
        loader.style.opacity = '0';
        setTimeout(() => loader.remove(), 400);
      }
    }
  }, [isAuthReady]);

  return (
    <Suspense fallback={null}>
      <GoogleAnalytics />
      <Toaster
        position="top-center"
        richColors
        closeButton
        theme={theme === 'dark' ? 'dark' : 'light'}
        expand={false}
      />
      <IncentiveCard />
      <PWACinematicModal />
      <UpgradePromptModal />
      <InactivityWarningModal />

      {!isAuthReady && (() => {
        const loaderType = localStorage.getItem('app_loader_type') || 'refresh';
        return loaderType !== 'refresh' ? (
          <AnimatePresence mode="wait">
            <CenteredLoader key="global-loader" />
          </AnimatePresence>
        ) : null;
      })()}

      <motion.div
        animate={{ opacity: isAuthReady ? 1 : 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className={!isAuthReady ? 'hidden' : 'block h-full w-full'}
      >
        {children}
      </motion.div>
    </Suspense>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <VideoResourceProvider>
          <ErrorBoundary name="Perplexta Core Runtime">
            <PWAWrapper>
            <Routes>
              <Route path="/" element={<MainLayout />}>
                <Route index element={<Navigate to="/chat" replace />} />
                <Route path="rewards" element={<ProtectedRoute><RewardsPage /></ProtectedRoute>} />
                <Route path="subscription" element={<SubscriptionPage />} />
                <Route path="chat/:id?" element={<ChatPage />} />
                <Route path="bulletin/:id?" element={<BulletinBoardPage />} />
                <Route path="marketplace/:id?" element={<MarketplacePage />} />
                <Route path="discover" element={<RecommendationsPage />} />
                <Route path="Studio" element={<StudioPage />} />
                <Route path="blog/:slug?" element={<BlogPage />} />
                <Route path="admin-community" element={<AdminRoute><AdminCommunityPage /></AdminRoute>} />
                <Route path="terms" element={<Terms />} />
                <Route path="privacy" element={<Privacy />} />
                <Route path="about" element={<About />} />
                <Route path="reset-password" element={<ResetPasswordPage />} />
              </Route>

              <Route path="share/:id" element={<SharedSnapshotPage />} />

              <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

              <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
                <Route index element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="*" element={<AdminDashboard />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </PWAWrapper>
        </ErrorBoundary>
      </VideoResourceProvider>
    </AppProvider>
    </BrowserRouter>
  );
}

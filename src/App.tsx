import React, { Suspense, useEffect, useState, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeEngineProvider } from './context/ThemeContext';
import { AppProvider, useAppContext } from './context/AppContext';
import { VideoResourceProvider } from './context/VideoResourceContext';
import { PwaProvider } from './context/PwaContext';
import { NotificationProvider } from './context/NotificationContext';
import { ConfirmProvider } from './context/ConfirmContext';
import { MainLayout } from './layouts/MainLayout';
import { AdminLayout } from './layouts/AdminLayout';
import { injectJsonLdSchema, removeJsonLdSchema } from './utils/seoSchemaBuilder';

// Helper to extract default export cleanly from ES modules or named exports
const resolveModule = (m: any, name?: string) => {
  if (!m) return { default: () => null };
  if (m.default) return m;
  if (name && m[name]) return { default: m[name] };
  if (typeof m === 'function') return { default: m };
  return m;
};

// Lazy-loaded page components with robust retry wrapper to prevent dynamic import fetch failures
const lazyRetry = (componentImport: () => Promise<any>, name?: string) =>
  React.lazy(async () => {
    const pageHasAlreadyBeenReloaded = JSON.parse(
      sessionStorage.getItem('page_reloaded_for_chunk') || 'false'
    );

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const m = await componentImport();
        sessionStorage.removeItem('page_reloaded_for_chunk');
        return resolveModule(m, name);
      } catch (err) {
        console.warn(`[LazyRetry] Attempt ${attempt} failed for ${name || 'chunk'}:`, err);
        if (attempt < 3) {
          await new Promise((r) => setTimeout(r, 800 * attempt));
        }
      }
    }

    if (!pageHasAlreadyBeenReloaded) {
      sessionStorage.setItem('page_reloaded_for_chunk', 'true');
      window.location.reload();
      return new Promise<any>(() => {});
    }

    // Return a safe fallback component instead of throwing a hard crash error
    return {
      default: () => (
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center">
          <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 max-w-md">
            <h2 className="text-lg font-bold text-red-700 dark:text-red-400 mb-2">عذراً، تعذر تحميل الصفحة</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              تعذر تحميل مكون {name || 'الصفحة'}. يرجى التحقق من اتصالك بالإنترنت أو إعادة تحميل الصفحة.
            </p>
            <button
              onClick={() => {
                sessionStorage.removeItem('page_reloaded_for_chunk');
                window.location.reload();
              }}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              إعادة تحميل الصفحة
            </button>
          </div>
        </div>
      )
    };
  });

const ChatPage = lazyRetry(() => import('./pages/ChatPage'), 'ChatPage');
const RewardsPage = lazyRetry(() => import('./pages/RewardsPage'), 'RewardsPage');
const SubscriptionPage = lazyRetry(() => import('./pages/SubscriptionPage'), 'SubscriptionPage');
const SettingsPage = lazyRetry(() => import('./pages/SettingsPage'), 'SettingsPage');
const AdminDashboard = lazyRetry(() => import('./pages/AdminDashboard'), 'AdminDashboard');
const Terms = lazyRetry(() => import('./pages/Terms'), 'Terms');
const Privacy = lazyRetry(() => import('./pages/Privacy'), 'Privacy');
const About = lazyRetry(() => import('./pages/About'), 'About');
const ResetPasswordPage = lazyRetry(() => import('./pages/ResetPasswordPage'), 'ResetPasswordPage');
import { BulletinBoardPage } from './pages/BulletinBoardPage';
const GoogleHubPage = lazyRetry(() => import('./pages/GoogleHubPage'));
const SharedSnapshotPage = lazyRetry(() => import('./pages/SharedSnapshotPage'), 'SharedSnapshotPage');
const RecommendationsPage = lazyRetry(() => import('./pages/RecommendationsPage'), 'RecommendationsPage');
const StudioPage = lazyRetry(() => import('./pages/StudioPage'), 'StudioPage');
import { IncentiveCard } from './components/IncentiveCard';
import { GoogleAnalytics } from './components/GoogleAnalytics';
import { CookieConsentBanner } from './components/CookieConsentBanner';
import { ErrorBoundary } from './components/ErrorBoundary';

import { motion } from 'motion/react';
import { isPathBlocked } from './utils/sectionVisibility';
import { resolveImageUrl } from './utils/imageResolver';
import { GlobalLoadingOverlay } from "./components/GlobalLoadingOverlay";
import { InactivityWarningModal } from './components/InactivityWarningModal';
import { ServiceUpdateToast } from './components/ServiceUpdateToast';
import { PwaInstallBanner } from './components/PwaInstallBanner';
import { PwaInstallSuccessService } from './components/PwaInstallSuccessService';
import { CriticalResourcePreloader } from './utils/criticalResourcePreloader';
import { DiagnosticMobileOverlay } from './components/DiagnosticMobileOverlay';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isAuthReady } = useAppContext();
  if (!isAuthReady) return null;
  if (!user) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isAuthReady } = useAppContext();
  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;
  if (!isAuthReady) return null;
  const isAdmin = user && (['admin'].includes(user.role || '') || (adminEmail && user.email === adminEmail));
  const isSupport = user && ['support'].includes(user.role || '');
  if (!isAdmin && !isSupport) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const SectionRouteGuard = ({ pathKey, children }: { pathKey: string; children: React.ReactNode }) => {
  const { siteSettings } = useAppContext();
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
  if (isPathBlocked(pathKey, siteSettings?.blocked_paths, isMobile)) {
    return <Navigate to="/chat" replace />;
  }
  return <>{children}</>;
};

const PWAWrapper = ({ children }: { children: React.ReactNode }) => {
  const { theme, siteSettings, language } = useAppContext();
  const location = useLocation();
  const [dbRouteSeo, setDbRouteSeo] = useState<any[]>(() => {
    try {
      const cached = sessionStorage.getItem('perplexta_seo_routes');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [dynamicSeoMap, setDynamicSeoMap] = useState<Record<string, any>>({});
  const requestedRoutesRef = useRef<Set<string>>(new Set([
    typeof window !== 'undefined' ? (window.location.pathname === '/' ? '/' : window.location.pathname.replace(/\/$/, '')) : '/'
  ]));

  // Load static/admin-configured routes from route_seo_settings table (cached in sessionStorage)
  useEffect(() => {
    if (dbRouteSeo.length > 0) return;
    fetch('/api/seo-routes')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setDbRouteSeo(data);
          try {
            sessionStorage.setItem('perplexta_seo_routes', JSON.stringify(data));
          } catch {}
        }
      })
      .catch(() => {});
  }, [dbRouteSeo.length]);

  useEffect(() => {
    console.log('[App] Initializing application - Cache busted');
    const timer = setTimeout(() => {
      document.body.classList.remove('layout-locked');
    }, 100);
    return () => clearTimeout(timer);
  }, []); // Only fetch once on mount

  const currentPath = location.pathname;

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
    '/admin-sections',
    '/admin/sections',
    ...dynamicBlockedList
  ].some(sensitivePath => {
    const cleanPath = sensitivePath.startsWith('/') ? sensitivePath : '/' + sensitivePath;
    return currentPath === cleanPath || currentPath.startsWith(cleanPath + '/');
  });

  // Dynamically fetch route-specific SEO metadata from seo_metadata table (for dynamic/custom routes)
  useEffect(() => {
    if (isSensitive) return;
    const normalizedPath = currentPath === '/' ? '/' : currentPath.replace(/\/$/, '');
    if (requestedRoutesRef.current.has(normalizedPath) || dynamicSeoMap[normalizedPath]) return;

    requestedRoutesRef.current.add(normalizedPath);
    let isCurrent = true;

    fetch(`/api/seo-metadata?route=${encodeURIComponent(normalizedPath)}`)
      .then(res => res.json())
      .then(data => {
        if (isCurrent && data && data.metadata) {
          setDynamicSeoMap(prev => ({
            ...prev,
            [normalizedPath]: data.metadata
          }));
        }
      })
      .catch(() => {});

    return () => {
      isCurrent = false;
    };
  }, [currentPath, isSensitive, dynamicSeoMap]);

  useEffect(() => {
    // Deduplicated meta tag update helper: updates the first matching element and removes duplicates
    const updateMetaTag = (attrType: string, attrValue: string, content: string) => {
      if (content === undefined || content === null) return;
      const elements = Array.from(document.querySelectorAll(`meta[${attrType}="${attrValue}"]`));
      if (elements.length === 0) {
        const meta = document.createElement('meta');
        meta.setAttribute(attrType, attrValue);
        meta.setAttribute('content', content);
        document.head.appendChild(meta);
      } else {
        elements[0].setAttribute('content', content);
        for (let i = 1; i < elements.length; i++) {
          elements[i].remove();
        }
      }
    };

    // Deduplicated canonical link helper
    const updateCanonicalLink = (href: string) => {
      const elements = Array.from(document.querySelectorAll('link[rel="canonical"]'));
      if (elements.length === 0) {
        const link = document.createElement('link');
        link.setAttribute('rel', 'canonical');
        link.setAttribute('href', href);
        document.head.appendChild(link);
      } else {
        elements[0].setAttribute('href', href);
        for (let i = 1; i < elements.length; i++) {
          elements[i].remove();
        }
      }
    };

    const siteName = language === 'ar' ? (siteSettings?.siteNameAr || siteSettings?.siteName) : siteSettings?.siteName;
    const resolvedSiteName = siteName || (language === 'ar' ? 'بيربليكستا' : 'Perplexta');
    const resolvedOGImage = siteSettings?.seoImageUrl ? resolveImageUrl(siteSettings.seoImageUrl, 'general') : '';
    const finalOGImage = resolvedOGImage.startsWith('/') ? `${window.location.origin}${resolvedOGImage}` : resolvedOGImage;
    const currentUrl = window.location.href;

    if (isSensitive) {
      removeJsonLdSchema('jsonld-dynamic-route');
      updateMetaTag('name', 'robots', 'noindex, nofollow, noarchive, nosnippet, max-image-preview:none');
      updateMetaTag('name', 'googlebot', 'noindex, nofollow, noarchive, nosnippet');
      
      const sensitiveTitle = language === 'ar' ? 'بيربليكستا - مساحة عمل محصنة' : 'Perplexta - Secure Workspace';
      const sensitiveDesc = language === 'ar' ? 'صفحة آمنة ومحمية من قبل الخوارزميات السيادية لمنصة بيربليكستا.' : 'Secure node with zero crawling, protected under deep local sovereign protocols.';
      
      document.title = sensitiveTitle;
      updateMetaTag('name', 'description', sensitiveDesc);
      updateMetaTag('property', 'og:title', sensitiveTitle);
      updateMetaTag('property', 'og:description', sensitiveDesc);
      updateMetaTag('property', 'og:image', finalOGImage);
      updateMetaTag('property', 'og:url', currentUrl);
      updateMetaTag('property', 'og:site_name', resolvedSiteName);
      updateMetaTag('name', 'twitter:title', sensitiveTitle);
      updateMetaTag('name', 'twitter:description', sensitiveDesc);
      updateMetaTag('name', 'twitter:image', finalOGImage);
      updateMetaTag('name', 'twitter:image:alt', sensitiveTitle);
      updateMetaTag('name', 'keywords', '');
      return;
    }

    updateMetaTag('name', 'robots', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
    updateMetaTag('name', 'googlebot', 'index, follow');

    const normalizedPath = currentPath === '/' ? '/' : currentPath.replace(/\/$/, '');

    // 1. First priority: Dynamic route SEO from seo_metadata table
    const dynamicSeo = dynamicSeoMap[currentPath] || dynamicSeoMap[normalizedPath];
    const hasActiveDynamicSeo = dynamicSeo && dynamicSeo.is_active !== false;

    const dynamicTitle = hasActiveDynamicSeo
      ? (language === 'ar' ? (dynamicSeo.title_ar || dynamicSeo.title_en) : (dynamicSeo.title_en || dynamicSeo.title_ar))
      : '';
    const dynamicDesc = hasActiveDynamicSeo
      ? (language === 'ar' ? (dynamicSeo.description_ar || dynamicSeo.description_en) : (dynamicSeo.description_en || dynamicSeo.description_ar))
      : '';
    const dynamicKeywords = hasActiveDynamicSeo
      ? (language === 'ar' ? (dynamicSeo.keywords_ar || dynamicSeo.keywords_en) : (dynamicSeo.keywords_en || dynamicSeo.keywords_ar))
      : '';
    const dynamicOgImage = hasActiveDynamicSeo ? dynamicSeo.og_image_url : '';
    const dynamicCanonical = (hasActiveDynamicSeo && dynamicSeo.canonical_url) ? dynamicSeo.canonical_url : '';

    // 2. Second priority: Static / Admin route SEO from route_seo_settings table
    const routeMatch = dbRouteSeo.find(r => 
      (r.route === currentPath || r.route === normalizedPath) && r.is_active !== false
    );

    const dbTitle = routeMatch ? (language === 'ar' ? (routeMatch.title_ar || routeMatch.title_en) : (routeMatch.title_en || routeMatch.title_ar)) : '';
    const dbDesc = routeMatch ? (language === 'ar' ? (routeMatch.description_ar || routeMatch.description_en) : (routeMatch.description_en || routeMatch.description_ar)) : '';
    const dbKeywords = routeMatch ? (language === 'ar' ? (routeMatch.keywords_ar || routeMatch.keywords_en) : (routeMatch.keywords_en || routeMatch.keywords_ar)) : '';
    const dbOgImage = routeMatch?.og_image_url;

    // 3. Third priority: Known path presets
    let pageTitlePart = '';
    if (currentPath === '/subscription') {
      pageTitlePart = language === 'ar' ? 'خطط الاشتراك والترقيات النخبة' : 'Premium Elite Subscription Plans';
    } else if (currentPath === '/about') {
      pageTitlePart = language === 'ar' ? 'من نحن ورؤية بيربليكستا السيادية' : 'About Our Sovereign High-Precision Framework';
    } else if (currentPath === '/terms') {
      pageTitlePart = language === 'ar' ? 'شروط الخدمة والاتفاقية الرقمية' : 'Terms of Service';
    } else if (currentPath === '/privacy') {
      pageTitlePart = language === 'ar' ? 'سياسة الخصوصية وحقوق حماية البيانات' : 'Strict Privacy & Data Security Regulations';
    } else if (currentPath === '/Studio') {
      pageTitlePart = language === 'ar' ? 'استوديو بيربليكستا' : 'Perplexta Studio';
    } else if (currentPath === '/viralbook' || currentPath.startsWith('/viralbook') || currentPath === '/bulletin' || currentPath.startsWith('/bulletin')) {
      pageTitlePart = language === 'ar' ? 'فايرال بوك - شبكة المحتوى والمنشورات التفاعلية' : 'Viralbook - Interactive Social Feed & Community Hub';
    }

    const defaultTitle = pageTitlePart 
      ? `${pageTitlePart} | ${resolvedSiteName}` 
      : `${resolvedSiteName} - ${language === 'ar' ? 'منصة التحليل والذكاء الاصطناعي الفاخر والمستقل' : 'Sovereign High-Performance AI Analysis Platform'}`;

    const siteDesc = language === 'ar' ? (siteSettings?.siteDescriptionAr || siteSettings?.siteDescription) : siteSettings?.siteDescription;
    const resolvedDesc = (language === 'ar' ? siteSettings?.seoDescriptionAr : siteSettings?.seoDescriptionEn) || siteDesc || '';
    const resolvedKeywords = (language === 'ar' ? siteSettings?.keywordsAr : siteSettings?.keywordsEn) || '';

    // Final Hierarchical Merging: seo_metadata > route_seo_settings > path presets > siteSettings
    const finalTitle = dynamicTitle || dbTitle || defaultTitle;
    const finalDesc = dynamicDesc || dbDesc || resolvedDesc;
    const finalKeywords = dynamicKeywords || dbKeywords || resolvedKeywords;
    const rawOGImage = dynamicOgImage || dbOgImage || resolvedOGImage;
    const routeOGImage = rawOGImage.startsWith('/') ? `${window.location.origin}${rawOGImage}` : rawOGImage;
    const cleanOriginPath = `${window.location.origin}${normalizedPath}`;
    const finalCanonical = dynamicCanonical || cleanOriginPath;

    document.title = finalTitle;
    updateMetaTag('name', 'description', finalDesc);
    updateMetaTag('property', 'og:title', finalTitle);
    updateMetaTag('property', 'og:description', finalDesc);
    updateMetaTag('property', 'og:image', routeOGImage);
    updateMetaTag('property', 'og:url', finalCanonical);
    updateMetaTag('property', 'og:site_name', resolvedSiteName);
    updateMetaTag('name', 'twitter:title', finalTitle);
    updateMetaTag('name', 'twitter:description', finalDesc);
    updateMetaTag('name', 'twitter:image', routeOGImage);
    updateMetaTag('name', 'twitter:image:alt', finalTitle);
    updateMetaTag('name', 'keywords', finalKeywords);

    updateCanonicalLink(finalCanonical);

    // Dynamic JSON-LD Structured Data Schema handling
    if (hasActiveDynamicSeo && dynamicSeo.structured_data && typeof dynamicSeo.structured_data === 'object') {
      injectJsonLdSchema('jsonld-dynamic-route', dynamicSeo.structured_data);
    } else {
      removeJsonLdSchema('jsonld-dynamic-route');
    }
  }, [currentPath, isSensitive, siteSettings, language, dbRouteSeo, dynamicSeoMap]);

  return (
    <Suspense fallback={null}>
      <GoogleAnalytics />
      <div 
        id="platform-banners-stack"
        className={`fixed bottom-6 left-6 right-6 md:max-w-[320px] z-[9990] flex flex-col gap-2.5 pointer-events-none transition-all duration-300 ${
          language === 'ar' 
            ? 'md:right-auto md:left-6' 
            : 'md:left-auto md:right-6'
        }`}
      >
        <ServiceUpdateToast />
        <PwaInstallBanner />
        <CookieConsentBanner />
      </div>


      <IncentiveCard />
      <InactivityWarningModal />
      <GlobalLoadingOverlay />
      <PwaInstallSuccessService />
      <CriticalResourcePreloader />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="block h-full w-full"
      >
        {children}
      </motion.div>
    </Suspense>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <ThemeEngineProvider>
        <AppProvider>
          <NotificationProvider>
            <ConfirmProvider>
              <PwaProvider>
                <VideoResourceProvider>
                  <ErrorBoundary name="Perplexta Core Runtime">
                    <PWAWrapper>
                    <Routes>
              <Route path="/" element={<MainLayout />}>
                <Route index element={<Navigate to="/chat" replace />} />
                <Route path="rewards" element={<SectionRouteGuard pathKey="/rewards"><ProtectedRoute><RewardsPage /></ProtectedRoute></SectionRouteGuard>} />
                <Route path="subscription" element={<SectionRouteGuard pathKey="/subscription"><SubscriptionPage /></SectionRouteGuard>} />
                <Route path="chat/:id?" element={<ChatPage />} />
                <Route path="viralbook/:id?" element={<SectionRouteGuard pathKey="/viralbook"><BulletinBoardPage /></SectionRouteGuard>} />
                <Route path="bulletin/:id?" element={<SectionRouteGuard pathKey="/viralbook"><BulletinBoardPage /></SectionRouteGuard>} />
                <Route path="google-hub" element={<SectionRouteGuard pathKey="/google-hub"><GoogleHubPage /></SectionRouteGuard>} />
                <Route path="discover" element={<SectionRouteGuard pathKey="/explore"><RecommendationsPage /></SectionRouteGuard>} />
                <Route path="Studio" element={<SectionRouteGuard pathKey="/studio"><StudioPage /></SectionRouteGuard>} />
                <Route path="terms" element={<Terms />} />
                <Route path="privacy" element={<Privacy />} />
                <Route path="about" element={<About />} />
                <Route path="reset-password" element={<ResetPasswordPage />} />
              </Route>

              <Route path="share/:id" element={<SharedSnapshotPage />} />

              <Route path="/settings/:tab?" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

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
    </PwaProvider>
    </ConfirmProvider>
    <DiagnosticMobileOverlay />
  </NotificationProvider>
</AppProvider>
    </ThemeEngineProvider>
    </BrowserRouter>
  );
}

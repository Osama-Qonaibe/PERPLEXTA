import React, { Suspense, useEffect, useState, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeEngineProvider } from './context/ThemeContext';
import { AppProvider, useAppContext } from './context/AppContext';
import { VideoResourceProvider } from './context/VideoResourceContext';
import { PwaProvider } from './context/PwaContext';
import { MainLayout } from './layouts/MainLayout';
import { AdminLayout } from './layouts/AdminLayout';

// Lazy-loaded page components for optimal bundle splitting & instantaneous initial startup
const ChatPage = React.lazy(() => import('./pages/ChatPage').then(m => ({ default: m.ChatPage })));
const RewardsPage = React.lazy(() => import('./pages/RewardsPage').then(m => ({ default: m.RewardsPage })));
const SubscriptionPage = React.lazy(() => import('./pages/SubscriptionPage').then(m => ({ default: m.SubscriptionPage })));
const SettingsPage = React.lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const Terms = React.lazy(() => import('./pages/Terms').then(m => ({ default: m.Terms })));
const Privacy = React.lazy(() => import('./pages/Privacy').then(m => ({ default: m.Privacy })));
const About = React.lazy(() => import('./pages/About').then(m => ({ default: m.About })));
const ResetPasswordPage = React.lazy(() => import('./pages/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })));
const BulletinBoardPage = React.lazy(() => import('./pages/BulletinBoardPage').then(m => ({ default: m.BulletinBoardPage })));
const BlogPage = React.lazy(() => import('./pages/BlogPage').then(m => ({ default: m.BlogPage })));
const AdminCommunityPage = React.lazy(() => import('./pages/AdminCommunityPage').then(m => ({ default: m.AdminCommunityPage })));
const MarketplacePage = React.lazy(() => import('./pages/MarketplacePage').then(m => ({ default: m.MarketplacePage })));
const GoogleHubPage = React.lazy(() => import('./pages/GoogleHubPage'));
const SharedSnapshotPage = React.lazy(() => import('./pages/SharedSnapshotPage').then(m => ({ default: m.SharedSnapshotPage })));
const RecommendationsPage = React.lazy(() => import('./pages/RecommendationsPage').then(m => ({ default: m.RecommendationsPage })));
const StudioPage = React.lazy(() => import('./pages/StudioPage').then(m => ({ default: m.StudioPage })));
import { IncentiveCard } from './components/IncentiveCard';
import { GoogleAnalytics } from './components/GoogleAnalytics';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Toaster } from 'sonner';
import { motion } from 'motion/react';
import { UpgradePromptModal } from './components/UpgradePromptModal';
import { resolveImageUrl } from './utils/imageResolver';
import { InactivityWarningModal } from './components/InactivityWarningModal';
import { ServiceUpdateToast } from './components/ServiceUpdateToast';
import { PwaInstallBanner } from './components/PwaInstallBanner';
import { PwaInstallSuccessService } from './components/PwaInstallSuccessService';

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

const PWAWrapper = ({ children }: { children: React.ReactNode }) => {
  const { theme, isAuthReady, siteSettings, language } = useAppContext();
  const location = useLocation();
  const [dbRouteSeo, setDbRouteSeo] = useState<any[]>([]);

  useEffect(() => {
    const handleVersionMismatch = () => {
      console.log('PWA version mismatch detected. Triggering forced reload...');
      window.location.reload();
    };
    window.addEventListener('pwa-version-mismatch', handleVersionMismatch);
    return () => window.removeEventListener('pwa-version-mismatch', handleVersionMismatch);
  }, []);

  useEffect(() => {
    fetch('/api/seo-routes')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setDbRouteSeo(data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      document.body.classList.remove('layout-locked');
    }, 100);
    return () => clearTimeout(timer);
  }, []); // Only fetch once on mount

  useEffect(() => {
    const currentPath = location.pathname;

    const isDynamicPublicRoute = currentPath.startsWith('/blog/') || 
                                 currentPath.startsWith('/marketplace/') || 
                                 currentPath.startsWith('/share/') ||
                                 currentPath.startsWith('/bulletin/');

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

    const updateMetaTag = (attrType: string, attrValue: string, content: string) => {
      let meta = document.querySelector(`meta[${attrType}="${attrValue}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attrType, attrValue);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    const siteName = language === 'ar' ? (siteSettings?.siteNameAr || siteSettings?.siteName) : siteSettings?.siteName;
    const resolvedSiteName = siteName || (language === 'ar' ? 'بيربليكستا' : 'Perplexta');
    const resolvedOGImage = resolveImageUrl(siteSettings?.seoImageUrl || '/app-assets/og-image.png', 'general');
    const finalOGImage = resolvedOGImage.startsWith('/') ? `${window.location.origin}${resolvedOGImage}` : resolvedOGImage;
    const currentUrl = window.location.href;

    if (isSensitive) {
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
      
    } else {
      updateMetaTag('name', 'robots', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
      updateMetaTag('name', 'googlebot', 'index, follow');

      const siteDesc = language === 'ar' ? (siteSettings?.siteDescriptionAr || siteSettings?.siteDescription) : siteSettings?.siteDescription;
      const resolvedDesc = (language === 'ar' ? siteSettings?.seoDescriptionAr : siteSettings?.seoDescriptionEn) || siteDesc || '';
      
      const resolvedKeywords = (language === 'ar' ? siteSettings?.keywordsAr : siteSettings?.keywordsEn) || '';

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
      const routeOGImage = rawOGImage.startsWith('/') ? `${window.location.origin}${rawOGImage}` : rawOGImage;

      document.title = finalTitle;
      updateMetaTag('name', 'description', finalDesc);
      updateMetaTag('property', 'og:title', finalTitle);
      updateMetaTag('property', 'og:description', finalDesc);
      updateMetaTag('property', 'og:image', routeOGImage);
      updateMetaTag('property', 'og:url', currentUrl);
      updateMetaTag('property', 'og:site_name', resolvedSiteName);
      updateMetaTag('name', 'twitter:title', finalTitle);
      updateMetaTag('name', 'twitter:description', finalDesc);
      updateMetaTag('name', 'twitter:image', routeOGImage);
      updateMetaTag('name', 'twitter:image:alt', finalTitle);
      updateMetaTag('name', 'keywords', finalKeywords);

      let canonicalLink = document.querySelector('link[rel="canonical"]');
      if (!canonicalLink) {
        canonicalLink = document.createElement('link');
        canonicalLink.setAttribute('rel', 'canonical');
        document.head.appendChild(canonicalLink);
      }
      canonicalLink.setAttribute('href', currentUrl);
    }
  }, [location.pathname, siteSettings, language, dbRouteSeo]);

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
      <UpgradePromptModal />
      <InactivityWarningModal />
      <ServiceUpdateToast />
      <PwaInstallBanner />
      <PwaInstallSuccessService />

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
          <PwaProvider>
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
                <Route path="google-hub" element={<GoogleHubPage />} />
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
    </PwaProvider>
    </AppProvider>
    </ThemeEngineProvider>
    </BrowserRouter>
  );
}

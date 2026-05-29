import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useAppContext } from './context/AppContext';
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
import { ForumPage } from './pages/ForumPage';
import { BlogPage } from './pages/BlogPage';
import { AdminCommunityPage } from './pages/AdminCommunityPage';
import { MarketplacePage } from './pages/MarketplacePage';
import { IncentiveCard } from './components/IncentiveCard';
import { PWACinematicModal } from './components/PWACinematicModal';
import { GoogleAnalytics } from './components/GoogleAnalytics';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Toaster } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck } from 'lucide-react';
import { DefaultLogo } from './components/DefaultLogo';
import { UpgradePromptModal } from './components/UpgradePromptModal';

const CenteredLoader = () => {
  const { siteSettings, language } = useAppContext();
  const siteName = language === 'ar' ? siteSettings.siteNameAr : siteSettings.siteName;

  const loaderType = localStorage.getItem('app_loader_type') || 'refresh';
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
            {siteSettings.logoBase64 ? (
              <img src={siteSettings.logoBase64} alt="Logo" className="w-[84px] h-[84px] object-cover block rounded-sm" />
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
  const { theme, isAuthReady } = useAppContext();

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

      <AnimatePresence mode="wait">
        {!isAuthReady && <CenteredLoader key="global-loader" />}
      </AnimatePresence>

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
    <AppProvider>
      <BrowserRouter>
        <ErrorBoundary name="Perplexta Core Runtime">
          <PWAWrapper>
            <Routes>
              <Route path="/" element={<MainLayout />}>
                <Route index element={<ChatPage />} />
                <Route path="rewards" element={<ProtectedRoute><RewardsPage /></ProtectedRoute>} />
                <Route path="subscription" element={<SubscriptionPage />} />
                <Route path="chat/:id" element={<ChatPage />} />
                <Route path="forum" element={<ForumPage />} />
                <Route path="marketplace" element={<MarketplacePage />} />
                <Route path="blog" element={<BlogPage />} />
                <Route path="admin-community" element={<AdminRoute><AdminCommunityPage /></AdminRoute>} />
                <Route path="terms" element={<Terms />} />
                <Route path="privacy" element={<Privacy />} />
                <Route path="about" element={<About />} />
                <Route path="reset-password" element={<ResetPasswordPage />} />
              </Route>

              <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

              <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
                <Route index element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="radar" element={<AdminDashboard />} />
                <Route path="keys" element={<AdminDashboard />} />
                <Route path="databases" element={<AdminDashboard />} />
                <Route path="orchestrator" element={<AdminDashboard />} />
                <Route path="finance" element={<AdminDashboard />} />
                <Route path="plans" element={<AdminDashboard />} />
                <Route path="marketplace" element={<AdminDashboard />} />
                <Route path="users" element={<AdminDashboard />} />
                <Route path="memories" element={<AdminDashboard />} />
                <Route path="emails" element={<AdminDashboard />} />
                <Route path="broadcast" element={<AdminDashboard />} />
                <Route path="settings" element={<AdminDashboard />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </PWAWrapper>
        </ErrorBoundary>
      </BrowserRouter>
    </AppProvider>
  );
}

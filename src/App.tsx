import React, { Suspense, useEffect } from 'react';
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
import { IncentiveCard } from './components/IncentiveCard';
import { GoogleAnalytics } from './components/GoogleAnalytics';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Toaster } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, ShieldCheck } from 'lucide-react';

const CenteredLoader = () => {
  const { siteSettings, language } = useAppContext();
  const siteName = language === 'ar' ? siteSettings.siteNameAr : siteSettings.siteName;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: [0.65, 0, 0.35, 1] }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0f0f11]"
    >
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-transparent pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] pointer-events-none" />

      <div className="relative flex flex-col items-center gap-10">
        {/* Animated Brand Pulse */}
        <div className="relative">
          <motion.div
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.6, 0.3]
            }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
            className="absolute inset-0 bg-emerald-500 rounded-full blur-[60px]"
          />
          <div className="relative w-24 h-24 rounded-[var(--radius)] bg-gradient-to-br from-gray-900 to-black border border-[var(--border-main)]/80 flex items-center justify-center shadow-2xl overflow-hidden group">
            {siteSettings.logoBase64 ? (
              <img src={siteSettings.logoBase64} alt="Logo" className="w-14 h-14 object-contain" />
            ) : (
              <Sparkles className="text-emerald-500 w-12 h-12 drop-shadow-[0_0_10px_rgba(16,185,129,0.6)]" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/10 to-transparent opacity-50" />
          </div>
        </div>

        {/* Text & Progress */}
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="space-y-1">
             <h2 className="text-2xl font-black text-white uppercase tracking-[0.2em] drop-shadow-sm">
                {siteName || 'SOVEREIGN'}
             </h2>
             <div className="flex items-center justify-center gap-3">
                <div className="h-px w-12 bg-gradient-to-r from-transparent to-gray-800" />
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.4em] translate-y-0.5">
                   {language === 'ar' ? 'جاري تفعيل الاتصال السيادي' : 'ACTIVATING SOVEREIGN CONNECTION'}
                </span>
                <div className="h-px w-12 bg-gradient-to-l from-transparent to-gray-800" />
             </div>
          </div>

          <div className="w-48 h-1 bg-gray-900/50 rounded-full overflow-hidden border border-white/5">
             <motion.div 
               animate={{ x: [-192, 192] }}
               transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
               className="w-full h-full bg-gradient-to-r from-transparent via-emerald-500 to-transparent"
             />
          </div>
        </div>
      </div>
      
      {/* Encryption Tag */}
      <div className="absolute bottom-10 flex items-center gap-2 px-4 py-2 rounded-[var(--radius)] bg-gray-900/30 border border-white/[0.03] backdrop-blur-md">
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
  
  if (!isAuthReady) {
    return <CenteredLoader />;
  }
  
  if (!user) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isAuthReady } = useAppContext();
  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;
  
  if (!isAuthReady) {
    return <CenteredLoader />;
  }
  
  const isAdmin = user && (['admin'].includes(user.role || '') || (adminEmail && user.email === adminEmail));
  const isSupport = user && ['support'].includes(user.role || '');
  
  if (!isAdmin && !isSupport) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

const PWAWrapper = ({ children }: { children: React.ReactNode }) => {
  const { theme, isAuthReady } = useAppContext();

  return (
    <Suspense fallback={<CenteredLoader />}>
      <GoogleAnalytics />
      <Toaster 
        position="top-center" 
        richColors 
        closeButton 
        theme={theme === 'dark' ? 'dark' : 'light'}
        expand={false}
      />
      <IncentiveCard />
      
      <AnimatePresence>
        {!isAuthReady && <CenteredLoader key="global-loader" />}
      </AnimatePresence>
      
      <motion.div 
        animate={{ 
          opacity: isAuthReady ? 1 : 0
        }}
        transition={{ duration: 1.1, ease: [0.6, 0.01, 0, 1] }}
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
        <ErrorBoundary name="Sovereign Core Runtime">
          <PWAWrapper>
          <Routes>
            <Route path="/" element={<MainLayout />}>
              <Route index element={<ChatPage />} />
              <Route path="rewards" element={<ProtectedRoute><RewardsPage /></ProtectedRoute>} />
              <Route path="subscription" element={<SubscriptionPage />} />
              <Route path="chat/:id" element={<ChatPage />} />
              <Route path="terms" element={<Terms />} />
              <Route path="privacy" element={<Privacy />} />
              <Route path="about" element={<About />} />
              <Route path="reset-password" element={<ResetPasswordPage />} />
            </Route>
            
            <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
            
            <Route path="/admin" element={
              <AdminRoute>
                <AdminLayout />
              </AdminRoute>
            }>
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="radar" element={<AdminDashboard />} />
              <Route path="keys" element={<AdminDashboard />} />
              <Route path="databases" element={<AdminDashboard />} />
              <Route path="orchestrator" element={<AdminDashboard />} />
              <Route path="finance" element={<AdminDashboard />} />
              <Route path="plans" element={<AdminDashboard />} />
              <Route path="users" element={<AdminDashboard />} />
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

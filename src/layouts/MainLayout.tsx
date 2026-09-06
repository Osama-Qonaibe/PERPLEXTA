import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { AuthModal } from '../components/AuthModal';
import { SponsoredSidebar } from '../components/SponsoredSidebar';
import { useAppContext } from '../context/AppContext';
import { motion, AnimatePresence } from 'motion/react';
import { SIDEBAR_TRANSITION } from '../constants/motions';

export const MainLayout: React.FC = () => {
  const { isSidebarOpen, setIsSidebarOpen, language, isMobile, resolvedTheme, themeTransitioning } = useAppContext();
  const location = useLocation();
  const isBulletin = location.pathname.startsWith('/bulletin');

  const sidebarWidth = isMobile ? 0 : (isSidebarOpen ? 180 : 50);

  const onPanEnd = (_: any, info: any) => {
    if (!isMobile) return;
    const threshold = 50;
    const isRTL = language === 'ar';
    const { offset } = info;

    if (isRTL) {
      if (offset.x < -threshold && !isSidebarOpen) setIsSidebarOpen(true);
      if (offset.x > threshold && isSidebarOpen) setIsSidebarOpen(false);
    } else {
      if (offset.x > threshold && !isSidebarOpen) setIsSidebarOpen(true);
      if (offset.x < -threshold && isSidebarOpen) setIsSidebarOpen(false);
    }
  };

  return (
    <div 
      className="flex h-[100dvh] w-full overflow-hidden relative bg-[var(--bg-base)] text-[var(--text-primary)] transition-theme"
    >
      {/* Hide Header on mobile when visiting /bulletin (Ads Board) so the Ads Board header acts as the primary display header */}
      <div className={isBulletin ? 'hidden lg:block' : 'block'}>
        <Header activeLanguage={language} />
      </div>
      <Sidebar activeLanguage={language} />

      <AnimatePresence>
        {isSidebarOpen && isMobile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={SIDEBAR_TRANSITION}
            className={`fixed ${isBulletin ? 'top-0' : 'top-[calc(56px+env(safe-area-inset-top,0px)+6px)]'} bottom-0 left-0 right-0 z-[140] bg-black/60 backdrop-blur-[6px] cursor-pointer`}
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      <motion.div
        initial={false}
        animate={{ paddingInlineStart: sidebarWidth }}
        transition={SIDEBAR_TRANSITION}
        className="flex-1 flex flex-col relative min-w-0 h-full overflow-hidden pb-safe"
        style={{ 
          willChange: 'padding-inline-start',
          transform: 'translateZ(0)',
          WebkitBackfaceVisibility: 'hidden',
          backfaceVisibility: 'hidden'
        }}
        onClick={() => { if (isMobile && isSidebarOpen) setIsSidebarOpen(false); }}
      >
        <main className={`flex-1 overflow-hidden relative ${isBulletin ? 'pt-0 lg:pt-[calc(56px+env(safe-area-inset-top,0px)+6px)]' : 'pt-[calc(56px+env(safe-area-inset-top,0px)+6px)]'} bg-[var(--bg-base)] transition-theme flex h-[calc(100dvh-var(--safe-area-spacing))] lg:h-full`}>
          <div className="flex-1 h-full overflow-y-auto scrollbar-none relative min-w-0 touch-pan-y overscroll-y-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
            <Outlet />
          </div>
          <SponsoredSidebar />
        </main>
      </motion.div>

      <AuthModal />
    </div>
  );
};

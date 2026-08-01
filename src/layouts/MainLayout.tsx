import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { AuthModal } from '../components/AuthModal';
import { SponsoredSidebar } from '../components/SponsoredSidebar';
import { useAppContext } from '../context/AppContext';
import { motion, AnimatePresence } from 'motion/react';
import { SIDEBAR_TRANSITION } from '../constants/motions';

export const MainLayout: React.FC = () => {
  const { isSidebarOpen, setIsSidebarOpen, language, isMobile } = useAppContext();

  const sidebarWidth = isMobile ? 0 : (isSidebarOpen ? 220 : 80);

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
      <Header activeLanguage={language} />
      <Sidebar activeLanguage={language} />

      <AnimatePresence>
        {isSidebarOpen && isMobile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={SIDEBAR_TRANSITION}
            className="fixed top-[72px] bottom-0 left-0 right-0 z-[140] bg-black/60 backdrop-blur-[6px] cursor-pointer"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      <motion.div
        initial={false}
        animate={{ paddingInlineStart: sidebarWidth }}
        transition={SIDEBAR_TRANSITION}
        className="flex-1 flex flex-col relative min-w-0 h-full overflow-hidden pb-safe"
        style={{ paddingInlineStart: sidebarWidth, willChange: 'padding-inline-start' }}
        onClick={() => { if (isMobile && isSidebarOpen) setIsSidebarOpen(false); }}
      >
        <main className="flex-1 overflow-hidden relative pt-[72px] bg-[var(--bg-base)] transition-theme flex">
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

import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { AuthModal } from '../components/AuthModal';
import { SponsoredSidebar } from '../components/SponsoredSidebar';
import { useAppContext } from '../context/AppContext';
import { motion } from 'motion/react';
import { SIDEBAR_TRANSITION } from '../constants/motions';
import { isInsideActiveViewport } from '../utils/boundaryCheck';

export const DesktopLayout: React.FC = () => {
  const { isSidebarOpen, setIsSidebarOpen, language, isMobile } = useAppContext();
  const location = useLocation();

  const sidebarWidth = isMobile ? 0 : (isSidebarOpen ? 180 : 50);

  // Dynamic smooth collapse when clicking outside sidebar on desktop
  React.useEffect(() => {
    if (!isSidebarOpen || isMobile) return;

    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      // Ignore clicks/touches in top/bottom buffer zones (outside active viewport area)
      if (!isInsideActiveViewport(e, { topBuffer: 18, bottomBuffer: 18 })) {
        return;
      }

      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest('aside')) return;
      if (target.closest('button[aria-label="Open Sidebar"]')) return;

      setIsSidebarOpen(false);
    };

    window.addEventListener('mousedown', handleOutsideClick, { capture: true });
    window.addEventListener('touchstart', handleOutsideClick, { capture: true, passive: true });

    return () => {
      window.removeEventListener('mousedown', handleOutsideClick, { capture: true });
      window.removeEventListener('touchstart', handleOutsideClick, { capture: true });
    };
  }, [isSidebarOpen, setIsSidebarOpen, isMobile]);

  // Collapse sidebar on route change
  React.useEffect(() => {
    if (isSidebarOpen) {
      setIsSidebarOpen(false);
    }
  }, [location.pathname, location.search]);

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden relative bg-[var(--bg-base)] text-[var(--text-primary)] transition-theme">
      <div className="block">
        <Header activeLanguage={language} />
      </div>

      {/* Standard Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar activeLanguage={language} />
      </div>

      {/* Main Layout Content Area */}
      <motion.div
        initial={false}
        animate={{ paddingInlineStart: sidebarWidth }}
        transition={SIDEBAR_TRANSITION}
        className="flex-1 flex flex-col relative min-w-0 h-full overflow-hidden"
        style={{
          willChange: 'padding-inline-start',
          transform: 'translateZ(0)',
          WebkitBackfaceVisibility: 'hidden',
          backfaceVisibility: 'hidden',
        }}
      >
        <main className="flex-1 overflow-hidden relative pt-[calc(56px+env(safe-area-inset-top,0px))] pb-0 bg-[var(--bg-base)] transition-theme flex h-full">
          <div
            className="flex-1 h-full overflow-y-auto scrollbar-none relative min-w-0 touch-pan-y overscroll-y-contain"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <Outlet />
          </div>
          <SponsoredSidebar />
        </main>
      </motion.div>

      <AuthModal />
    </div>
  );
};

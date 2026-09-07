import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { AuthModal } from '../components/AuthModal';
import { SponsoredSidebar } from '../components/SponsoredSidebar';
import { MobileNavigation } from '../components/mobile/MobileNavigation';
import { useAppContext } from '../context/AppContext';
import { motion } from 'motion/react';
import { SIDEBAR_TRANSITION } from '../constants/motions';

export const MainLayout: React.FC = () => {
  const { isSidebarOpen, setIsSidebarOpen, language, isMobile } = useAppContext();
  const location = useLocation();

  const sidebarWidth = isMobile ? 0 : (isSidebarOpen ? 180 : 50);

  // 1. Dynamic smooth collapse when clicking or touching anywhere outside of the sidebar on desktop
  React.useEffect(() => {
    if (!isSidebarOpen || isMobile) return;

    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      // Do nothing if the click originated from inside the sidebar
      if (target.closest('aside')) return;
      // Do nothing if the click is on the header menu open button itself
      if (target.closest('button[aria-label="Open Sidebar"]')) return;

      setIsSidebarOpen(false);
    };

    // Attach listeners with passive flag for high-performance response
    window.addEventListener('mousedown', handleOutsideClick, { capture: true });
    window.addEventListener('touchstart', handleOutsideClick, { capture: true, passive: true });

    return () => {
      window.removeEventListener('mousedown', handleOutsideClick, { capture: true });
      window.removeEventListener('touchstart', handleOutsideClick, { capture: true });
    };
  }, [isSidebarOpen, setIsSidebarOpen, isMobile]);

  // 2. Automatically collapse sidebar on route change
  React.useEffect(() => {
    if (isSidebarOpen) {
      setIsSidebarOpen(false);
    }
  }, [location.pathname, location.search]);

  return (
    <div 
      className="flex h-[100dvh] w-full overflow-hidden relative bg-[var(--bg-base)] text-[var(--text-primary)] transition-theme"
    >
      <div className="block">
        <Header activeLanguage={language} />
      </div>

      {/* Standard Desktop Sidebar (Hidden on viewports < 1024px) */}
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
          backfaceVisibility: 'hidden'
        }}
      >
        <main className={`flex-1 overflow-hidden relative pt-[calc(50px+env(safe-area-inset-top,0px))] lg:pt-[calc(56px+env(safe-area-inset-top,0px))] pb-[calc(52px+env(safe-area-inset-bottom,0px))] lg:pb-0 bg-[var(--bg-base)] transition-theme flex h-full`}>
          <div className="flex-1 h-full overflow-y-auto scrollbar-none relative min-w-0 touch-pan-y overscroll-y-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
            <Outlet />
          </div>
          <SponsoredSidebar />
        </main>
      </motion.div>

      {/* Decoupled Native MobileNavigation (Active on viewports < 1024px) */}
      <MobileNavigation />

      <AuthModal />
    </div>
  );
};

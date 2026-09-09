import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Header } from '../components/Header';
import { AuthModal } from '../components/AuthModal';
import { MobileNavigation } from '../components/mobile/MobileNavigation';
import { DesktopOnlyNotice } from '../components/mobile/DesktopOnlyNotice';
import { useAppContext } from '../context/AppContext';
import { isDesktopOnlyRoute } from '../constants/mobileCapabilities';

export const MobileAppLayout: React.FC = () => {
  const { language } = useAppContext();
  const location = useLocation();

  const isRestrictedRoute = isDesktopOnlyRoute(location.pathname);

  return (
    <div className="flex flex-col h-[100dvh] w-full overflow-hidden relative bg-[var(--bg-base)] text-[var(--text-primary)] transition-theme select-none">
      {/* Native Compact Top Mobile Header */}
      <Header activeLanguage={language} />

      {/* Main Mobile Viewport */}
      <main className="flex-1 flex flex-col overflow-hidden relative pt-[calc(52px+env(safe-area-inset-top,0px))] pb-[calc(56px+env(safe-area-inset-bottom,0px))] bg-[var(--bg-base)] transition-theme">
        <div
          className="flex-1 h-full overflow-y-auto scrollbar-none relative min-w-0 touch-pan-y overscroll-y-contain"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {isRestrictedRoute ? (
            <div className="p-4 flex items-center justify-center min-h-full">
              <DesktopOnlyNotice />
            </div>
          ) : (
            <Outlet />
          )}
        </div>
      </main>

      {/* Persistent Bottom Mobile Navigation Bar */}
      <MobileNavigation />

      {/* Global Auth Modal */}
      <AuthModal />
    </div>
  );
};

import React from 'react';
import { Outlet } from 'react-router-dom';
import { AdminSidebar } from '../components/AdminSidebar';
import { Header } from '../components/Header';
import { AuthModal } from '../components/AuthModal';
import { useAppContext } from '../context/AppContext';
import { motion, AnimatePresence } from 'motion/react';
import { sovereignPageTransition } from '../constants/motions';

export const AdminLayout: React.FC = () => {
  const { theme, isSidebarOpen, setIsSidebarOpen, dir: globalDir, language, isMobile, isInstallable } = useAppContext();

  const localDir = language === 'ar' ? 'rtl' : 'ltr';

  return (
    <div className={`flex h-screen w-full overflow-hidden relative bg-[var(--bg-base)] text-[var(--text-primary)]`}>
      <div className={`absolute inset-0 z-0 bg-[var(--bg-base)]`} />

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          dir={localDir}
          initial="initial"
          animate="animate"
          exit="exit"
          variants={sovereignPageTransition}
          className="flex h-full w-full overflow-hidden relative z-10"
        >
          <AdminSidebar activeLanguage={language} />

          <div 
            style={{ 
              marginLeft: isMobile ? 0 : (localDir === 'rtl' ? 0 : 240),
              marginRight: isMobile ? 0 : (localDir === 'rtl' ? 240 : 0),
              transition: 'margin 0.2s ease'
            }}
            className="flex-1 flex flex-col relative min-w-0 overflow-hidden bg-inherit"
          >
            <Header activeLanguage={language} />
            <main className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth overscroll-none [WebkitOverflowScrolling:touch] bg-inherit">
              <div className="min-h-full flex flex-col pt-[72px] px-6 md:px-8 pb-12">
                <Outlet />
              </div>
            </main>
          </div>
        </motion.div>
      </AnimatePresence>
      <AuthModal />
    </div>
  );
};

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
    <div className={`flex h-screen w-full overflow-hidden relative ${theme === 'dark' ? 'bg-[#0f0f11] text-white' : 'bg-gray-50 text-gray-900'}`}>
      <div className={`absolute inset-0 z-0 ${theme === 'dark' ? 'bg-[#0f0f11]' : 'bg-gray-50'}`} />

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={language}
          dir={localDir}
          initial="initial"
          animate="animate"
          exit="exit"
          variants={sovereignPageTransition}
          className="flex h-full w-full overflow-hidden relative z-10"
        >
          <AdminSidebar activeLanguage={language} />

          <motion.div 
            layout="position"
            initial={false}
            animate={{ 
              marginLeft: isMobile ? 0 : (localDir === 'rtl' ? 0 : 240),
              marginRight: isMobile ? 0 : (localDir === 'rtl' ? 240 : 0),
              scale: 1,
              borderRadius: 0
            }}
            transition={{ type: "tween", duration: 0.8, ease: [0.4, 0, 0.2, 1] as any }}
            className={`flex-1 flex flex-col relative min-w-0 overflow-hidden shadow-2xl bg-inherit`}
          >
            <Header activeLanguage={language} />
            <main className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth overscroll-none [WebkitOverflowScrolling:touch] bg-inherit">
              <div className="min-h-full flex flex-col pt-[72px] px-6 md:px-8 pb-12">
                <Outlet />
              </div>
            </main>
          </motion.div>
        </motion.div>
      </AnimatePresence>
      <AuthModal />
    </div>
  );
};

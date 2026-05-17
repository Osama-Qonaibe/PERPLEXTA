import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { AuthModal } from '../components/AuthModal';
import { useAppContext } from '../context/AppContext';
import { motion, AnimatePresence } from 'motion/react';
import { SOVEREIGN_TRANSITION } from '../constants/motions';

export const MainLayout: React.FC = () => {
  const { theme, isSidebarOpen, setIsSidebarOpen, dir: globalDir, language, isMobile, isInstallable } = useAppContext();

  const localDir = language === 'ar' ? 'rtl' : 'ltr';
  
  return (
    <div className={`flex h-screen w-full overflow-hidden relative bg-[var(--bg-base)] text-[var(--text-primary)] transition-theme`}>
      <div
        dir={localDir}
        className="flex h-full w-full overflow-hidden relative z-10"
      >
        <Sidebar activeLanguage={language} />
        
        <AnimatePresence>
          {isSidebarOpen && isMobile && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.1, ease: [0.6, 0.01, 0, 1] }}
              className="absolute inset-0 z-[140] bg-black/60 backdrop-blur-[6px] cursor-pointer"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}
        </AnimatePresence>

        <motion.div 
          initial={false}
          animate={{ 
            paddingInlineStart: isMobile ? 0 : (isSidebarOpen ? 220 : 80),
            paddingInlineEnd: 0,
          }}
          transition={SOVEREIGN_TRANSITION}
          className="flex-1 flex flex-col relative min-w-0 h-full overflow-hidden"
          style={{ 
            paddingLeft: 'unset', 
            paddingRight: 'unset',
            willChange: 'padding-inline-start'
          }}
          onClick={() => { if(isMobile && isSidebarOpen) setIsSidebarOpen(false); }}
        >
          <Header activeLanguage={language} />
          <main className="flex-1 overflow-y-auto scrollbar-none relative pt-[72px] bg-[var(--bg-base)] transition-theme">
            <div className="h-full w-full">
              <Outlet />
            </div>
          </main>
        </motion.div>
      </div>
      <AuthModal />
    </div>
  );
};

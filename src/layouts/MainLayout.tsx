import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { AuthModal } from '../components/AuthModal';
import { useAppContext } from '../context/AppContext';
import { motion, AnimatePresence } from 'motion/react';

export const MainLayout: React.FC = () => {
  const { theme, isSidebarOpen, setIsSidebarOpen, dir: globalDir, language, isMobile, isInstallable } = useAppContext();

  const localDir = language === 'ar' ? 'rtl' : 'ltr';
  
  return (
    <div className={`flex h-screen w-full overflow-hidden relative theme-transition bg-[var(--bg-base)] text-[var(--text-primary)]`}>
      <div className={`absolute inset-0 z-0 bg-[var(--bg-base)]`} />
      
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
              transition={{ duration: 0.15 }}
              className="absolute inset-0 z-[140] bg-black/40 backdrop-blur-sm cursor-pointer"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}
        </AnimatePresence>

        <motion.div 
          initial={false}
          animate={{ 
            paddingInlineStart: isMobile ? 0 : (isSidebarOpen ? 220 : 80),
            paddingInlineEnd: 0,
            scale: (isMobile && isSidebarOpen) ? 1 : 1, // Remove scaling on mobile
            x: 0, // Remove shifting on mobile
            borderRadius: 0, // Remove border radius animation
          }}
          transition={{ 
            type: "tween", 
            duration: 0.2, 
            ease: "easeOut" 
          }}
          className="flex-1 flex flex-col relative min-w-0 overflow-hidden bg-inherit"
          style={{ paddingLeft: 'unset', paddingRight: 'unset' }}
          onClick={() => { if(isMobile && isSidebarOpen) setIsSidebarOpen(false); }}
        >
          <Header activeLanguage={language} />
          <main className="flex-1 overflow-y-auto scrollbar-none relative pt-[72px]">
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

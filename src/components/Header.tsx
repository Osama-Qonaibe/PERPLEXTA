import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate, NavLink } from 'react-router-dom';
import { Bell, Sun, Moon, Languages, Menu, Check, Trash2, Clock, ShieldCheck, Landmark, MessageSquare, Edit2, X, Plus, Download, Smartphone, Share, WifiOff } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { DefaultLogo } from './DefaultLogo';
import { motion, AnimatePresence } from 'motion/react';
import { MemoryNotification } from './MemoryNotification';

export const Header: React.FC<{ activeLanguage?: string }> = ({ activeLanguage }) => {
  const { language: globalLang, setLanguage, theme, setTheme, isSidebarOpen, setIsSidebarOpen, user, notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, clearAllNotifications, dir: globalDir, siteSettings, t, token, memoryNotification, closeMemoryNotification, isStandalone, isInstallable, installApp, isMobile } = useAppContext();
  
  const [isDismissed, setIsDismissed] = useState(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('pwa_banner_dismissed') === 'true';
  });

  const handleDismiss = () => {
    localStorage.setItem('pwa_banner_dismissed', 'true');
    setIsDismissed(true);
  };

  const [isOffline, setIsOffline] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !navigator.onLine;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const showMobileBanner = !isStandalone && isMobile && !isDismissed && isInstallable;
  
  // Use the locked language from props if available (for stable transitions)
  const language = activeLanguage || globalLang;
  const dir = language === 'ar' ? 'rtl' : 'ltr';

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  const [chatTitle, setChatTitle] = useState<string | null>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState('');

  const chatId = location.pathname.startsWith('/chat/') ? location.pathname.split('/chat/')[1] : null;

  useEffect(() => {
    const fetchChatTitle = async () => {
      if (!chatId || !token) {
        setChatTitle(null);
        return;
      }
      try {
        const res = await fetch(`/api/chats`, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        });
        if (res.ok) {
          const chats = await res.json();
          const currentChat = chats.find((c: any) => c.id === chatId || c.id?.toString() === chatId?.toString());
          if (currentChat) {
            setChatTitle(currentChat.title);
          }
        }
      } catch (error) {
        if (error instanceof Error && error.message.includes('Failed to fetch')) {
          console.debug('Transient network error fetching chat title (likely server initializing)');
        } else {
          console.error('Failed to fetch chat title', error);
        }
      }
    };

    fetchChatTitle();

    const handleChatUpdated = () => fetchChatTitle();
    window.addEventListener('chat-updated', handleChatUpdated);
    window.addEventListener('chat-created', handleChatUpdated);
    return () => {
      window.removeEventListener('chat-updated', handleChatUpdated);
      window.removeEventListener('chat-created', handleChatUpdated);
    };
  }, [chatId, token]);

  const handleRename = async () => {
    if (!chatId || !token) return;
    const trimmedTitle = tempTitle.trim();
    if (!trimmedTitle) {
      setIsEditingTitle(false);
      return;
    }
    try {
      const res = await fetch(`/api/chats/${chatId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title: trimmedTitle })
      });
      if (res.ok) {
        setChatTitle(trimmedTitle);
        setIsEditingTitle(false);
        window.dispatchEvent(new Event('chat-updated'));
      }
    } catch (error) {
      console.error('Failed to rename chat', error);
    }
  };

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isAdminPath = location.pathname.startsWith('/admin');
  const isMobileView = windowWidth < 1024;
  const shouldShowMenuButton = !isSidebarOpen && !isAdminPath && isMobileView;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleLanguage = () => {
    setLanguage(language === 'ar' ? 'en' : 'ar');
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'finance': return <Landmark size={14} className="text-amber-500" />;
      case 'support': return <MessageSquare size={14} className="text-emerald-500" />;
      case 'kyc': return <ShieldCheck size={14} className="text-blue-500" />;
      default: return <Bell size={14} className="text-pink-500" />;
    }
  };

  const handleNewChat = () => {
    if (location.pathname === '/') return;
    navigate('/');
    window.dispatchEvent(new Event('clear-chat'));
  };

  return (
    <header className={`fixed top-0 left-0 right-0 h-[72px] z-[80] transition-theme flex items-center bg-[var(--bg-base)]`}>
      <div className={`absolute inset-0 z-[-1] border-b border-[var(--border-main)] transition-theme`} />
      
      <div className="w-full flex justify-between items-center h-full">
        <div className="flex items-center h-full">
          <div className={`flex items-center h-full transition-theme ${!isMobileView ? 'min-w-[240px]' : 'w-auto ps-8 sm:ps-4 md:ps-6'}`}>
              <NavLink to="/" onClick={handleNewChat} className={`flex items-center gap-0 h-full transition-theme group text-[var(--text-primary)]`}>
                <div className={`${isMobileView ? 'w-10' : 'w-[80px]'} h-full flex-shrink-0 flex items-center justify-center p-0 relative`}>
                  {siteSettings.logoBase64 ? (
                    <div className={`w-10 h-10 rounded-sm overflow-hidden border border-[var(--border-main)] transition-theme group-hover:border-emerald-500/50 group-hover:scale-105 relative z-10 flex-shrink-0 bg-[var(--bg-secondary)] shadow-[0_0_15px_rgba(0,0,0,0.1)] group-hover:shadow-[0_0_25px_rgba(16,185,129,0.35)] group-hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]`}>
                      <img 
                        src={siteSettings.logoBase64} 
                        alt="Logo" 
                        className="w-full h-full object-cover block" 
                      />
                    </div>
                  ) : (
                    <DefaultLogo className="w-10 h-10 group-hover:scale-105 relative z-10 transition-theme" iconClassName="w-6 h-6" />
                  )}
                  <div className="absolute inset-0 bg-emerald-500/0 group-hover:bg-emerald-500/5 transition-theme rounded-full blur-2xl -z-10" />
                </div>
                {!isMobileView ? (
                  <span className={`text-[17px] font-bold tracking-tight font-sans whitespace-nowrap overflow-hidden px-1 text-[var(--text-primary)] group-hover:text-emerald-500 transition-theme`}>
                    {t('appName')}
                  </span>
                ) : null}
              </NavLink>
          </div>

          {shouldShowMenuButton && (
            <div className={`absolute bottom-0 ${dir === 'rtl' ? 'right-8 sm:right-4 md:right-6' : 'left-8 sm:left-4 md:left-6'} translate-y-1/2 z-[100] w-10 h-10 flex items-center justify-center`}>
              <button 
                onClick={(e) => { e.stopPropagation(); setIsSidebarOpen(true); }} 
                className="flex items-center justify-center w-10 h-10 bg-transparent border border-transparent transition-theme relative active:scale-95 group shrink-0"
                title={language === 'ar' ? 'فتح القائمة' : 'Open Menu'}
              >
                <Menu size={18} className="text-gray-400 group-hover:text-emerald-500 group-hover:drop-shadow-[0_0_12px_rgba(16,185,129,0.8)] transition-theme" />
              </button>
            </div>
          )}
        </div>

        <nav className="flex-1 flex items-center justify-center min-w-0 px-4 h-full">
            <AnimatePresence mode="wait">
              {memoryNotification.isVisible ? (
                <div className="flex items-center justify-center h-full">
                  <MemoryNotification 
                    key="memory-notif"
                    isVisible={memoryNotification.isVisible}
                    onClose={closeMemoryNotification}
                    type={memoryNotification.type}
                    customDesc={memoryNotification.desc}
                  />
                </div>
              ) : chatId && chatTitle ? (
              <motion.div 
                key="chat-title"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 px-3 h-8 rounded-[4px] bg-[var(--bg-secondary)]/30 border border-[var(--border-main)] hover:border-emerald-500/30 dark:hover:border-emerald-500/30 transition-all duration-300 max-w-[120px] xs:max-w-[150px] sm:max-w-[200px] md:max-w-xs cursor-pointer group"
                onClick={() => {
                  if (!isEditingTitle) {
                    setIsEditingTitle(true);
                    setTempTitle(chatTitle || '');
                  }
                }}
              >
                {isEditingTitle ? (
                  <div className="flex items-center gap-1.5 w-full h-full" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      autoFocus
                      value={tempTitle}
                      onChange={(e) => setTempTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRename();
                        if (e.key === 'Escape') setIsEditingTitle(false);
                      }}
                      className="bg-transparent text-[11px] sm:text-xs font-bold outline-none text-[var(--text-primary)] w-full h-full"
                    />
                    <div className="flex items-center gap-0.5">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleRename(); }}
                        className="p-1 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition-all duration-300"
                        title={language === 'ar' ? 'حفظ' : 'Save'}
                      >
                         <Check size={13} className="drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setIsEditingTitle(false); }}
                        className="p-1 text-gray-400 hover:text-rose-500 hover:bg-rose-500/10 rounded transition-all duration-300"
                        title={language === 'ar' ? 'إلغاء' : 'Cancel'}
                      >
                         <X size={13} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-1.5 overflow-hidden w-full h-full select-none">
                    <h2 className="text-[11px] sm:text-xs font-bold text-[var(--text-primary)] truncate lowercase tracking-tight transition-theme">
                      {chatTitle}
                    </h2>
                    <Edit2 size={10} className="text-gray-400 group-hover:text-emerald-500 group-hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)] transition-all duration-300 flex-shrink-0" />
                  </div>
                )}
              </motion.div>
            ) : null}
            </AnimatePresence>
        </nav>

        <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 px-8 sm:px-4 md:px-6 shrink-0 h-full">
          <AnimatePresence>
            {isOffline && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.3 }}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-[4px] bg-amber-500/10 border border-amber-500/20 shrink-0 select-none font-sans"
                title={language === 'ar' ? 'أنت تعمل دون اتصال بالإنترنت' : 'You are working offline'}
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
                <WifiOff size={14} className="text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                <span className="hidden sm:inline text-[11px] text-amber-500 font-bold tracking-tight uppercase">
                  {language === 'ar' ? 'دون اتصال' : 'Offline'}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

           {!isStandalone && isInstallable && (
             <button
               onClick={installApp}
               className="flex items-center justify-center gap-1 md:gap-1.5 text-[10px] sm:text-[11px] font-black px-1.5 sm:px-2 md:px-3 h-10 rounded-sm bg-transparent border border-emerald-500/20 hover:border-emerald-500 hover:bg-emerald-500/5 transition-theme active:scale-95 group shrink-0 shadow-[0_0_12px_rgba(16,185,129,0.05)] hover:shadow-[0_0_20px_rgba(16,185,129,0.15)] cursor-pointer"
               title={language === 'ar' ? 'تثبيت التطبيق على جهازك' : 'Install app on your device'}
             >
               <Download size={15} className="text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)] group-hover:scale-110 transition-theme animate-pulse" />
               <span className="hidden sm:inline text-[13px] text-emerald-500 font-bold transition-theme font-sans">
                 {language === 'ar' ? 'تثبيت التطبيق' : 'Install App'}
               </span>
               <span className="sm:hidden text-[10px] text-emerald-500 font-bold transition-theme font-sans">
                 PWA
               </span>
             </button>
           )}

           <button 
                onClick={toggleLanguage}
                className="flex items-center justify-center gap-1 md:gap-1.5 text-[10px] sm:text-[11px] font-black px-1.5 sm:px-2 md:px-3 h-10 rounded-sm bg-transparent border border-transparent hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] transition-theme active:scale-95 group"
              >
            <Languages size={15} className="text-gray-400 group-hover:text-emerald-500 group-hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)] transition-theme" />
            <span className="hidden sm:inline text-[13px] text-gray-500 group-hover:text-emerald-500 transition-theme">{language === 'ar' ? 'English' : 'عربي'}</span>
            <span className="sm:hidden uppercase text-gray-500 group-hover:text-emerald-500 transition-theme">{language === 'ar' ? 'EN' : 'AR'}</span>
          </button>

           <button 
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="flex items-center justify-center w-10 h-10 rounded-sm bg-transparent border border-transparent hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] transition-theme active:scale-95 group shrink-0"
                aria-label={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              >
                {theme === 'dark' ? (
                  <Sun size={18} className="text-gray-400 group-hover:text-amber-500 group-hover:drop-shadow-[0_0_8px_rgba(251,191,36,0.6)] transition-theme" />
                ) : (
                  <Moon size={18} className="text-gray-400 group-hover:text-blue-500 group-hover:drop-shadow-[0_0_8px_rgba(59,130,246,0.6)] transition-theme" />
                )}
              </button>
        
        {user && (
          <div className="relative flex items-center h-full" ref={dropdownRef}>
            <button 
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="flex items-center justify-center w-10 h-10 rounded-sm bg-transparent border border-transparent hover:bg-[var(--bg-hover)] dark:hover:bg-[var(--bg-hover)] transition-theme relative active:scale-95 group shrink-0"
            >
              <Bell size={16} className={`transition-theme ${unreadCount > 0 ? "text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]" : "text-gray-400 group-hover:text-emerald-500 group-hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]"}`} />
              {unreadCount > 0 && (
                <span className={`absolute top-2 right-2 w-1 h-1 bg-pink-500 rounded-full border border-[var(--bg-primary)] shadow-[0_0_5px_rgba(236,72,153,0.5)]`}></span>
              )}
            </button>

            <AnimatePresence>
              {isNotifOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className={`absolute top-full mt-2 w-[calc(100vw-32px)] sm:w-80 max-h-[480px] overflow-hidden rounded-lg border shadow-2xl z-[60] flex flex-col bg-[var(--bg-secondary)] border-[var(--border-main)] ${dir === 'rtl' ? 'left-0' : 'right-0'} fixed sm:absolute`}
                >
                  <div className="p-4 border-b border-[var(--border-main)] flex items-center justify-between">
                    <h3 className="font-bold text-sm text-[var(--text-primary)]">{language === 'ar' ? 'الإشعارات' : 'Notifications'}</h3>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={unreadCount > 0 ? markAllAsRead : undefined}
                        disabled={unreadCount === 0}
                        className={`text-[10px] font-bold flex items-center gap-1 transition-all duration-300 ${
                          unreadCount > 0 
                            ? 'text-emerald-500 hover:text-emerald-400 hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.5)] cursor-pointer' 
                            : 'text-[var(--text-muted)] opacity-40 cursor-not-allowed'
                        }`}
                      >
                        <Check size={12} />
                        {language === 'ar' ? 'تحديد كالمقروء' : 'Mark all read'}
                      </button>
                      <button 
                        onClick={notifications.length > 0 ? clearAllNotifications : undefined}
                        disabled={notifications.length === 0}
                        className={`text-[10px] font-bold flex items-center gap-1 transition-all duration-300 ${
                          notifications.length > 0 
                            ? 'text-rose-500 hover:text-rose-400 hover:drop-shadow-[0_0_8px_rgba(239,68,68,0.5)] cursor-pointer' 
                            : 'text-[var(--text-muted)] opacity-40 cursor-not-allowed'
                        }`}
                      >
                        <Trash2 size={12} />
                        {language === 'ar' ? 'مسح الكل' : 'Clear all'}
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto py-2 custom-scrollbar">
                    {notifications.length > 0 ? (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => { if (!notif.is_read) markAsRead(notif.id); }}
                          className={`w-full p-4 flex gap-3 text-right hover:bg-[var(--bg-primary)] transition-all duration-300 border-b border-[var(--border-main)] last:border-0 group relative cursor-pointer ${
                            !notif.is_read ? 'bg-emerald-500/[0.03] border-r-2 border-r-emerald-500' : ''
                          }`}
                          dir={dir}
                        >
                          <div className={`mt-1 h-8 w-8 rounded-sm flex items-center justify-center shrink-0 transition-theme ${
                            !notif.is_read ? 'bg-emerald-500/20 text-emerald-500 font-bold' : 'bg-[var(--bg-primary)] text-[var(--text-muted)]'
                          }`}>
                            {getNotifIcon(notif.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <h4 className={`text-xs font-bold truncate transition-theme ${!notif.is_read ? 'text-emerald-500' : 'text-[var(--text-primary)]'}`}>
                                {language === 'ar' ? notif.title_ar : notif.title_en}
                              </h4>
                              {!notif.is_read && (
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full shrink-0 animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
                              )}
                            </div>
                            <p className="text-[10px] text-[var(--text-muted)] mt-1 line-clamp-2 leading-relaxed transition-theme">
                              {language === 'ar' ? notif.message_ar : notif.message_en}
                            </p>
                            <div className="flex items-center justify-between mt-2.5">
                              <div className="flex items-center gap-1 text-[9px] text-[var(--text-muted)] transition-theme">
                                <Clock size={10} />
                                <span>{new Date(notif.created_at).toLocaleTimeString(language === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {!notif.is_read && (
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); markAsRead(notif.id); }}
                                    className="p-1 text-emerald-500/60 hover:text-emerald-500 hover:drop-shadow-[0_0_6px_rgba(16,185,129,0.8)] opacity-0 group-hover:opacity-100 transition-all duration-300 cursor-pointer"
                                    title={language === 'ar' ? 'تحديد كمقروء' : 'Mark as read'}
                                  >
                                    <Check size={12} className="stroke-[3px]" />
                                  </button>
                                )}
                                <button 
                                  onClick={(e) => { e.stopPropagation(); deleteNotification(notif.id); }}
                                  className="p-1 text-rose-500/60 hover:text-rose-500 hover:drop-shadow-[0_0_6px_rgba(239,68,68,0.8)] opacity-0 group-hover:opacity-100 transition-all duration-300 cursor-pointer"
                                  title={language === 'ar' ? 'حذف الإشعار' : 'Delete notification'}
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-12 flex flex-col items-center justify-center text-[var(--text-muted)] opacity-30 transition-theme">
                        <Bell size={32} className="mb-2" />
                        <span className="text-xs">{language === 'ar' ? 'لا توجد إشعارات' : 'No notifications'}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="p-3 border-t border-[var(--border-main)] text-center">
                    <span className="text-[10px] text-[var(--text-muted)] font-medium transition-theme">
                      {language === 'ar' ? 'البروتوكول الصامت للمنصة' : 'Silent Platform Protocol'}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>

    <AnimatePresence>
      {showMobileBanner && (
        <motion.div
          initial={{ opacity: 0, y: -15, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -15, height: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className={`absolute top-[72px] left-0 right-0 z-[70] transition-theme border-b flex items-center justify-between px-4 py-2.5 text-xs font-sans shadow-lg overflow-hidden ${
            theme === 'dark'
              ? 'bg-[#121418] border-gray-800/60 text-gray-300'
              : 'bg-[#fafafa] border-gray-200 text-gray-700'
          }`}
        >
          <div className="flex items-center gap-2 max-w-[80%] text-right" dir={dir}>
            <Smartphone size={16} className="text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)] shrink-0 animate-pulse" />
            <p className="font-medium truncate text-[11px] sm:text-xs leading-normal">
              {language === 'ar' 
                ? 'ثبّت بيربليكستا السيادية كتطبيق هاتف ذكي للوصول المباشر والتشغيل التلقائي.' 
                : 'Install Perplexta for offline resilience and fast mobile access.'}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={installApp}
              className="px-2.5 py-1 text-[10px] uppercase font-black tracking-wider text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/30 rounded-[4px] transition-all duration-300 cursor-pointer text-xs"
            >
              {language === 'ar' ? 'تثبيت' : 'Install'}
            </button>
            <button
              onClick={handleDismiss}
              className="w-8 h-8 flex items-center justify-center bg-transparent border border-transparent hover:bg-gray-100 dark:hover:bg-gray-800/60 text-gray-400 hover:text-[var(--text-primary)] rounded-[4px] transition-all duration-300 cursor-pointer shrink-0"
              title={language === 'ar' ? 'إغلاق التنبيه' : 'Dismiss prompt'}
            >
              <X size={14} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>

  </header>
);
};

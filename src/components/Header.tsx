import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate, NavLink } from 'react-router-dom';
import { Bell, Languages, Menu, Check, Trash2, Clock, ShieldCheck, Landmark, MessageSquare, Edit2, X, WifiOff, Megaphone, Cpu } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { DefaultLogo } from './DefaultLogo';
import { resolveImageUrl } from '../utils/imageResolver';
import { motion, AnimatePresence } from 'motion/react';
import { MemoryNotification } from './MemoryNotification';
import { ThemeToggleButton } from './ThemeToggleButton';
import { NotificationIconRenderer } from '../utils/imageProcessor';

export const Header: React.FC<{ activeLanguage?: string }> = ({ activeLanguage }) => {
  const { language: globalLang, setLanguage, theme, isSidebarOpen, setIsSidebarOpen, user, notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, clearAllNotifications, siteSettings, t, token, memoryNotification, closeMemoryNotification, isOperationPending } = useAppContext();
  
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
  
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
    const handleStreamingState = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent && customEvent.detail) {
        setIsStreaming(!!customEvent.detail.isGenerating);
      }
    };
    window.addEventListener('ai-streaming-state', handleStreamingState);
    return () => {
      window.removeEventListener('ai-streaming-state', handleStreamingState);
    };
  }, []);
  
  const language = activeLanguage || globalLang;
  const dir = language === 'ar' ? 'rtl' : 'ltr';

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const titleEditRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  const [chatTitle, setChatTitle] = useState<string | null>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState('');

  const chatId = location.pathname.startsWith('/chat/') ? location.pathname.split('/chat/')[1] : null;
  const isBulletinActive = location.pathname.startsWith('/bulletin');

  useEffect(() => {
    const fetchChatTitle = async () => {
      if (!chatId || !token) {
        setChatTitle(null);
        return;
      }
      try {
        const res = await fetch(`/api/chats/${chatId}`, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        });
        if (res.ok) {
          const contentType = res.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const currentChat = await res.json();
            if (currentChat && currentChat.title) {
              setChatTitle(currentChat.title);
            }
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

    let debounceTimer: any = null;
    const handleChatUpdated = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => fetchChatTitle(), 400);
    };
    window.addEventListener('chat-updated', handleChatUpdated);
    window.addEventListener('chat-created', handleChatUpdated);
    return () => {
      window.removeEventListener('chat-updated', handleChatUpdated);
      window.removeEventListener('chat-created', handleChatUpdated);
      if (debounceTimer) clearTimeout(debounceTimer);
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
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isAdminPath = location.pathname.startsWith('/admin');
  const isMobileView = windowWidth < 1024;
  const shouldShowMenuButton = !isSidebarOpen && !isAdminPath && isMobileView;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
      if (titleEditRef.current && !titleEditRef.current.contains(event.target as Node)) {
        setIsEditingTitle(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const toggleLanguage = () => {
    setLanguage(language === 'ar' ? 'en' : 'ar');
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'finance': return <Landmark size={14} className="text-amber-500" />;
      case 'support': return <MessageSquare size={14} className="text-accent" />;
      case 'kyc': return <ShieldCheck size={14} className="text-blue-500" />;
      default: return <Bell size={14} className="text-pink-500" />;
    }
  };

  const handleNewChat = (e: React.MouseEvent) => {
    window.dispatchEvent(new Event('clear-chat'));
    if (location.pathname === '/' || location.pathname === '/chat') {
      e.preventDefault();
    }
  };

  return (
    <header className={`fixed top-0 left-0 right-0 h-[64px] z-[80] transition-theme flex items-center bg-[var(--bg-base)]`}>
      <div className={`absolute inset-0 z-[-1] border-b border-[var(--border-main)] transition-theme`} />
      
      <div className="w-full flex justify-between items-center h-full">
        <div className="flex items-center h-full">
          <div className={`flex items-center gap-2 h-full transition-theme ${!isMobileView ? 'min-w-[220px]' : 'w-auto ps-8 sm:ps-4 md:ps-6'}`}>
              <NavLink 
                to="/chat" 
                onClick={handleNewChat} 
                className={`flex items-center gap-0 h-full transition-theme group text-[var(--text-primary)]`}
              >
                <div className={`${isMobileView ? 'w-10' : 'w-[56px]'} h-full flex-shrink-0 flex items-center justify-center p-0 relative`}>
                  {(siteSettings.logoBase64 || siteSettings.logoLightBase64) ? (
                    <motion.div 
                      className={`w-10 h-10 rounded-sm overflow-hidden border border-[var(--border-main)] transition-theme group-hover:border-accent/50 group-hover:scale-105 relative z-10 flex-shrink-0 bg-[var(--bg-secondary)] shadow-sm`}
                      animate={isStreaming ? {
                        scale: [1, 1.03, 1],
                        borderColor: ["var(--border-main)", "rgba(156,163,175,0.4)", "var(--border-main)"]
                      } : {}}
                      transition={isStreaming ? {
                        duration: 1.8,
                        repeat: Infinity,
                        ease: "easeInOut"
                      } : {}}
                    >
                      <img 
                        src={resolveImageUrl((theme === 'light' && siteSettings.logoLightBase64) ? siteSettings.logoLightBase64 : siteSettings.logoBase64, 'general')} 
                        alt="Logo" 
                        className="w-full h-full object-cover block"
                        onError={(e) => {
                          const target = e.currentTarget as HTMLImageElement;
                          if (target.src !== '/app-assets/icon.png') {
                            target.src = '/app-assets/icon.png';
                          }
                        }}
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      className="w-10 h-10 flex items-center justify-center relative z-10 transition-theme"
                      animate={isStreaming ? {
                        scale: [1, 1.05, 1]
                      } : {}}
                      transition={isStreaming ? {
                        duration: 1.8,
                        repeat: Infinity,
                        ease: "easeInOut"
                      } : {}}
                    >
                      <DefaultLogo className="w-10 h-10 group-hover:scale-105 relative z-10 transition-theme" iconClassName="w-6 h-6" />
                    </motion.div>
                  )}
                </div>
                 {!isMobileView ? (
                  <div className="flex items-center select-none px-1">
                    {/[\u0600-\u06FF]/.test(String(t('appName') || "Perplexta")) ? (
                      <motion.span
                        className="text-[17px] font-bold tracking-tight font-sans text-[var(--text-primary)] group-hover:text-gray-900 dark:group-hover:text-white transition-theme"
                      >
                        {t('appName')}
                      </motion.span>
                    ) : (
                      String(t('appName') || "Perplexta").split("").map((char, index) => (
                        <span 
                          key={index}
                          className="text-[17px] font-bold tracking-tight font-sans text-[var(--text-primary)] group-hover:text-gray-900 dark:group-hover:text-white transition-theme"
                        >
                          {char === " " ? "\u00A0" : char}
                        </span>
                      ))
                    )}
                  </div>
                ) : null}
              </NavLink>
              
              {shouldShowMenuButton && (
                <button 
                  onClick={(e) => { e.stopPropagation(); setIsSidebarOpen(true); }} 
                  className="flex items-center justify-center w-10 h-10 bg-transparent border border-transparent transition-theme relative active:scale-95 group shrink-0"
                  title={language === 'ar' ? 'فتح القائمة' : 'Open Menu'}
                >
                  <Menu size={18} className="text-gray-400 group-hover:text-accent transition-theme" />
                </button>
              )}
          </div>
        </div>

        <nav className="flex-1 flex items-center justify-center min-w-0 px-4 h-full relative">
            <AnimatePresence mode="wait">
              {chatId && chatTitle && !memoryNotification.isVisible ? (
                <motion.div 
                  key="chat-title"
                  ref={titleEditRef}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-transparent hover:bg-[var(--bg-secondary)] border border-transparent hover:border-[var(--border-main)] transition-theme max-w-[130px] xs:max-w-[180px] sm:max-w-[220px] md:max-w-sm cursor-pointer group"
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
                          className="p-1 text-accent hover:text-accent hover:bg-accent/10 rounded transition-theme"
                          title={language === 'ar' ? 'حفظ' : 'Save'}
                        >
                           <Check size={13} />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setIsEditingTitle(false); }}
                          className="p-1 text-gray-400 hover:text-rose-500 hover:bg-rose-500/10 rounded transition-theme"
                          title={language === 'ar' ? 'إلغاء' : 'Cancel'}
                        >
                           <X size={13} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-1.5 overflow-hidden w-full h-full select-none">
                      <span className="text-[11px] sm:text-xs font-normal text-[var(--text-primary)] truncate tracking-normal transition-theme">
                        {chatTitle}
                      </span>
                      <Edit2 size={10} className="text-gray-400 group-hover:text-accent transition-theme flex-shrink-0" />
                    </div>
                  )}
                </motion.div>
              ) : null}
            </AnimatePresence>

            <AnimatePresence>
              {memoryNotification.isVisible && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
                  <div className="pointer-events-auto bg-transparent">
                    <MemoryNotification 
                      key="memory-notif"
                      isVisible={memoryNotification.isVisible}
                      onClose={closeMemoryNotification}
                      type={memoryNotification.type}
                      customDesc={memoryNotification.desc}
                    />
                  </div>
                </div>
              )}
            </AnimatePresence>
        </nav>

        <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 px-8 sm:px-4 md:px-6 shrink-0 h-full">
            <NavLink
              to="/bulletin"
              className={`flex items-center justify-center gap-1 md:gap-1.5 text-[10px] sm:text-[11px] font-black w-10 sm:w-auto px-0 sm:px-2 md:px-3 h-10 rounded-[4px] border transition-theme active:scale-95 group shrink-0 ${
                isBulletinActive 
                  ? 'bg-accent/[0.04] border-accent/30 text-accent' 
                  : 'bg-transparent border-[var(--border-main)] hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] text-gray-500'
              }`}
              title={language === 'ar' ? 'لوحة الإعلانات التفاعلية' : 'Interactive Bulletin Board'}
            >
              <Megaphone 
                size={15} 
                className={`transition-theme ${
                  isBulletinActive 
                    ? 'text-accent ' 
                    : 'text-gray-400 group-hover:text-accent group-hover:'
                }`} 
              />
              <span className={`hidden sm:inline text-[13px] transition-theme ${
                isBulletinActive ? 'text-accent font-bold font-sans' : 'group-hover:text-gray-900 dark:group-hover:text-white'
              }`}>{language === 'ar' ? 'لوحة الإعلانات' : 'Bulletin Board'}</span>
            </NavLink>



            <NavLink
              to="/Studio"
              className={`hidden md:flex items-center justify-center gap-1 md:gap-1.5 text-[10px] sm:text-[11px] font-black px-1.5 sm:px-2 md:px-3 h-10 rounded-[4px] border transition-theme active:scale-95 group shrink-0 ${
                location.pathname === '/Studio' 
                  ? 'bg-accent/[0.04] border-accent/30 text-accent' 
                  : 'bg-transparent border-[var(--border-main)] hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] text-gray-500'
              }`}
              title={language === 'ar' ? 'استوديو بيربليكستا للمطورين' : 'Perplexta Developer Studio'}
            >
              <Cpu 
                size={15} 
                className={`transition-theme ${
                  location.pathname === '/Studio' 
                    ? 'text-accent ' 
                    : 'text-gray-400 group-hover:text-accent group-hover:'
                }`} 
              />
              <span className={`hidden sm:inline text-[13px] transition-theme ${
                location.pathname === '/Studio' ? 'text-accent font-bold font-sans' : 'group-hover:text-gray-900 dark:group-hover:text-white'
              }`}>{language === 'ar' ? 'الاستوديو' : 'Studio'}</span>
            </NavLink>
          <AnimatePresence>
            {isOffline && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-[4px] bg-amber-500/10 border border-amber-500/20 shrink-0 select-none font-sans"
                title={language === 'ar' ? 'أنت تعمل دون اتصال بالإنترنت' : 'You are working offline'}
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
                <WifiOff size={14} className="text-amber-500" />
                <span className="hidden sm:inline text-[11px] text-amber-500 font-bold tracking-tight uppercase">
                  {language === 'ar' ? 'دون اتصال' : 'Offline'}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

           <button 
                onClick={toggleLanguage}
                className="flex items-center justify-center gap-1 md:gap-1.5 text-[10px] sm:text-[11px] font-black w-10 sm:w-auto px-0 sm:px-2 md:px-3 h-10 rounded-[4px] bg-transparent border border-[var(--border-main)] hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] transition-theme active:scale-95 group shrink-0"
              >
            <Languages size={15} className="text-gray-400 group-hover:text-accent group-hover: transition-theme" />
            <span className="hidden sm:inline text-[13px] text-gray-500 group-hover:text-gray-900 dark:group-hover:text-white transition-theme">{language === 'ar' ? 'English' : 'عربي'}</span>
          </button>

          <ThemeToggleButton variant="icon-button" />
        
        {(user || token) && (
          <div className="flex items-center gap-1.5 h-full">
            <button
              onClick={() => {
                navigate('/bulletin');
                window.dispatchEvent(new CustomEvent('open-bulletin-inquiries'));
              }}
              className="hidden md:flex items-center justify-center w-10 h-10 rounded-[4px] bg-transparent border border-[var(--border-main)] hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] transition-theme relative active:scale-95 group shrink-0 cursor-pointer"
              title={language === 'ar' ? 'صندوق محادثات المسنجر' : 'Messenger Chats'}
            >
              <MessageSquare size={16} className="text-gray-400 group-hover:text-accent group-hover: transition-theme" />
            </button>

            <div className="relative flex items-center h-full" ref={dropdownRef}>
              <button 
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className={`flex items-center justify-center w-10 h-10 rounded-[4px] bg-transparent border transition-theme relative active:scale-95 group shrink-0 ${isNotifOpen ? 'border-accent/50 bg-[var(--bg-secondary)]' : 'border-[var(--border-main)] hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]'}`}
              >
                <Bell size={16} className={`transition-theme ${unreadCount > 0 ? "text-accent" : "text-gray-400 group-hover:text-accent"}`} />
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-pink-500 rounded-full border border-[var(--bg-primary)]"></span>
                )}
              </button>

            <AnimatePresence>
              {isNotifOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className={`absolute top-full mt-2 w-[280px] xs:w-80 sm:w-96 max-h-[350px] sm:max-h-[480px] overflow-hidden rounded-lg border shadow-2xl z-[100] flex flex-col bg-[var(--bg-secondary)] border-[var(--border-main)] ${dir === 'rtl' ? 'left-0' : 'right-0'}`}
                >
                  <div className="p-3 sm:p-4 border-b border-[var(--border-main)] flex items-center justify-between">
                    <h3 className="font-bold text-xs sm:text-sm text-[var(--text-primary)]">{language === 'ar' ? 'الإشعارات' : 'Notifications'}</h3>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <button 
                        onClick={unreadCount > 0 ? markAllAsRead : undefined}
                        disabled={unreadCount === 0}
                        className={`text-[9px] sm:text-[10px] font-bold flex items-center gap-1 transition-theme ${
                          unreadCount > 0 
                            ? 'text-accent hover:text-accent cursor-pointer' 
                            : 'text-[var(--text-muted)] opacity-40 cursor-not-allowed'
                        }`}
                      >
                        <Check size={11} />
                        {language === 'ar' ? 'تحديد كالمقروء' : 'Mark all read'}
                      </button>
                      <button 
                        onClick={notifications.length > 0 ? clearAllNotifications : undefined}
                        disabled={notifications.length === 0}
                        className={`text-[9px] sm:text-[10px] font-bold flex items-center gap-1 transition-theme ${
                          notifications.length > 0 
                            ? 'text-rose-500 hover:text-rose-400 cursor-pointer' 
                            : 'text-[var(--text-muted)] opacity-40 cursor-not-allowed'
                        }`}
                      >
                        <Trash2 size={11} />
                        {language === 'ar' ? 'مسح الكل' : 'Clear all'}
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto py-1 custom-scrollbar">
                    {notifications.length > 0 ? (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => { if (!notif.is_read) markAsRead(notif.id); }}
                          className={`w-full p-2.5 sm:p-4 flex gap-2.5 sm:gap-3 text-right hover:bg-[var(--bg-primary)] transition-theme border-b border-[var(--border-main)] last:border-0 group relative cursor-pointer ${
                            !notif.is_read ? 'bg-accent/[0.03] border-r-2 border-r-accent-500' : ''
                          }`}
                          dir={dir}
                        >
                          <div className={`mt-0.5 h-7 w-7 sm:h-8 sm:w-8 rounded-lg flex items-center justify-center shrink-0 transition-theme overflow-hidden ${
                            !notif.is_read ? 'bg-accent/20 text-accent font-bold' : 'bg-[var(--bg-primary)] text-[var(--text-muted)]'
                          }`}>
                            <NotificationIconRenderer
                              src={notif.image || notif.icon_url || notif.avatar || null}
                              size={28}
                              fallbackIcon={getNotifIcon(notif.type)}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1.5 flex-row-reverse">
                              {!notif.is_read && (
                                <span className="w-1.5 h-1.5 bg-accent rounded-full shrink-0" />
                              )}
                              <h4 className={`text-[11px] sm:text-xs font-bold truncate transition-theme ${!notif.is_read ? 'text-accent' : 'text-[var(--text-primary)]'}`}>
                                {language === 'ar' ? notif.title_ar : notif.title_en}
                              </h4>
                            </div>
                            <p className="text-[9px] sm:text-[10px] text-[var(--text-muted)] mt-0.5 line-clamp-2 leading-relaxed transition-theme">
                              {language === 'ar' ? notif.message_ar : notif.message_en}
                            </p>
                            <div className="flex items-center justify-between mt-1.5 sm:mt-2.5">
                              <div className="flex items-center gap-1 text-[8px] sm:text-[9px] text-[var(--text-muted)] transition-theme">
                                <Clock size={9} />
                                <span>{new Date(notif.created_at).toLocaleTimeString(language === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                              <div className="flex items-center gap-1.5 sm:gap-2">
                                {!notif.is_read && (
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); markAsRead(notif.id); }}
                                    className="p-0.5 sm:p-1 text-accent/60 hover:text-accent opacity-100 sm:opacity-0 group-hover:opacity-100 transition-theme cursor-pointer"
                                    title={language === 'ar' ? 'تحديد كمقروء' : 'Mark as read'}
                                  >
                                    <Check size={11} className="stroke-[3px]" />
                                  </button>
                                )}
                                <button 
                                  onClick={(e) => { e.stopPropagation(); deleteNotification(notif.id); }}
                                  className="p-0.5 sm:p-1 text-rose-500/60 hover:text-rose-500 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-theme cursor-pointer"
                                  title={language === 'ar' ? 'حذف الإشعار' : 'Delete notification'}
                                >
                                  <Trash2 size={11} />
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
                  
                  <div className="p-2 sm:p-3 border-t border-[var(--border-main)] text-center bg-[var(--bg-secondary)]">
                    <span className="text-[9px] sm:text-[10px] text-[var(--text-muted)] font-medium transition-theme">
                      {language === 'ar' ? 'البروتوكول الصامت للمنصة' : 'Silent Platform Protocol'}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          </div>
        )}
      </div>
    </div>

    {/* Sovereign Top Progress Loader Line */}
    <AnimatePresence>
      {(isStreaming || isOperationPending) && (
        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          exit={{ opacity: 0, scaleX: 0 }}
          transition={{ duration: 0.15 }}
          className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-gray-500/10 to-transparent z-[90] origin-left overflow-hidden pointer-events-none"
        >
          <motion.div
            animate={{ x: ['-100%', '100%'] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
            className="w-full h-full bg-gradient-to-r from-transparent via-gray-500/10 to-transparent shadow-[0_0_12px_rgba(156,163,175,0.9)]"
          />
        </motion.div>
      )}
    </AnimatePresence>

  </header>
);
};

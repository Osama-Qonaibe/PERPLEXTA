import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate, NavLink } from 'react-router-dom';
import { Bell, Sun, Moon, Languages, Menu, Check, Trash2, Clock, ShieldCheck, Landmark, MessageSquare, Edit2, X, Plus } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { motion, AnimatePresence } from 'motion/react';
import { MemoryNotification } from './MemoryNotification';

export const Header: React.FC<{ activeLanguage?: string }> = ({ activeLanguage }) => {
  const { language: globalLang, setLanguage, theme, setTheme, isSidebarOpen, setIsSidebarOpen, user, notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, clearAllNotifications, dir: globalDir, siteSettings, t, token, memoryNotification, closeMemoryNotification } = useAppContext();
  
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
    if (!chatId || !tempTitle.trim() || !token) return;
    try {
      const res = await fetch(`/api/chats/${chatId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title: tempTitle })
      });
      if (res.ok) {
        setChatTitle(tempTitle);
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
  // Professional Elite Protocol: Only show header menu button if it's the only toggle available
  // (Main sidebar has its own toggle on desktop; admin sidebar does not)
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

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
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
    navigate('/chat');
    window.dispatchEvent(new Event('clear-chat'));
  };

  return (
    <header className={`fixed top-0 left-0 right-0 h-[72px] z-[80] transition-all duration-300 flex items-center bg-[var(--bg-primary)]`}>
      <div className={`absolute inset-0 z-[-1] border-b border-[var(--border-main)]`} />
      
      <div className="w-full flex justify-between items-center h-full">
        {/* Logo and App Name - Perfectly aligned with Sidebar */}
        <div className="flex items-center h-full">
          <div className={`flex items-center h-full transition-all duration-300 ${!isMobileView ? 'min-w-[240px]' : 'w-auto'}`}>
              <NavLink to="/" onClick={handleNewChat} className={`flex items-center gap-0 h-full transition-opacity group text-[var(--text-primary)]`}>
                <div className={`${isMobileView ? 'w-14' : 'w-[80px]'} h-full flex-shrink-0 flex items-center justify-center p-0 relative`}>
                  {siteSettings.logoBase64 ? (
                    <div className="w-10 h-10 rounded-[8px] overflow-hidden border-2 border-[var(--border-main)] transition-all duration-500 group-hover:border-emerald-500/50 group-hover:scale-105 relative z-10 flex-shrink-0 bg-[var(--bg-secondary)] shadow-[0_0_15px_rgba(0,0,0,0.1)] group-hover:shadow-[0_0_25px_rgba(16,185,129,0.35)] group-hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]">
                      <img 
                        src={siteSettings.logoBase64} 
                        alt="Logo" 
                        className="w-full h-full object-cover block" 
                      />
                    </div>
                  ) : null}
                  {/* Subtle Glow Underlay */}
                  <div className="absolute inset-0 bg-emerald-500/0 group-hover:bg-emerald-500/5 transition-all duration-500 rounded-full blur-2xl -z-10" />
                </div>
                {!isMobileView ? (
                  <span className={`text-[17px] font-bold tracking-tight font-sans whitespace-nowrap overflow-hidden px-1 text-[var(--text-primary)] group-hover:text-emerald-500 transition-colors duration-300`}>
                    {t('appName')}
                  </span>
                ) : null}
              </NavLink>
          </div>

          {shouldShowMenuButton && (
            <div className={`absolute bottom-0 ${dir === 'rtl' ? (isMobileView ? 'right-[56px] translate-x-1/2' : 'right-[80px] translate-x-1/2') : (isMobileView ? 'left-[56px] -translate-x-1/2' : 'left-[80px] -translate-x-1/2')} translate-y-1/2 z-[100]`}>
              <button 
                onClick={(e) => { e.stopPropagation(); setIsSidebarOpen(true); }} 
                className={`w-8 h-8 flex items-center justify-center text-[var(--text-secondary)] transition-all hover:scale-125 active:scale-95 hover:text-emerald-500 group bg-transparent border-none`}
                title={language === 'ar' ? 'فتح القائمة' : 'Open Menu'}
              >
                <Menu size={20} className="group-hover:drop-shadow-[0_0_12px_rgba(16,185,129,0.8)] transition-all duration-300" />
              </button>
            </div>
          )}
        </div>

        {/* Global Notification Area - Parallel and Centered */}
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
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`hidden md:flex items-center gap-2 px-3 h-8 rounded-[8px] bg-transparent border border-[var(--border-main)] max-w-full`}
              >
                {isEditingTitle ? (
                  <div className="flex items-center gap-1.5 min-w-[200px] h-full">
                    <input
                      type="text"
                      autoFocus
                      value={tempTitle}
                      onChange={(e) => setTempTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRename();
                        if (e.key === 'Escape') setIsEditingTitle(false);
                      }}
                      className="bg-transparent text-[11px] font-bold outline-none text-[var(--text-primary)] w-full h-full"
                    />
                    <div className="flex items-center h-full">
                      <button onClick={handleRename} className="p-1 hover:text-emerald-500 transition-colors">
                         <Check size={14} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="group flex items-center gap-2 overflow-hidden h-full">
                    <h2 className="text-[11px] font-bold text-gray-500 truncate lowercase tracking-tight">
                      {chatTitle}
                    </h2>
                    <button 
                      onClick={() => { setIsEditingTitle(true); setTempTitle(chatTitle); }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:text-emerald-500 transition-all font-bold flex-shrink-0"
                    >
                      <Edit2 size={12} />
                    </button>
                  </div>
                )}
              </motion.div>
            ) : null}
            </AnimatePresence>
        </nav>

        {/* Global Tools Section */}
        <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 px-8 sm:px-4 md:px-6 shrink-0 h-full">
           <button 
                onClick={toggleLanguage}
                className="flex items-center justify-center gap-1 md:gap-1.5 text-[10px] sm:text-[11px] font-black px-1.5 sm:px-2 md:px-3 h-10 rounded-[8px] text-[var(--text-primary)] transition-all hover:bg-[var(--bg-overlay)] border border-[var(--border-main)] active:scale-95 group"
              >
          <Languages size={14} className="sm:size-[15px] text-gray-400 group-hover:text-emerald-500 group-hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)] transition-all duration-300" />
          <span className="hidden sm:inline text-[13px]">{language === 'ar' ? 'English' : 'عربي'}</span>
          <span className="sm:hidden uppercase">{language === 'ar' ? 'EN' : 'AR'}</span>
        </button>
        
        <button 
          onClick={toggleTheme} 
          className="flex items-center justify-center w-10 h-10 rounded-[8px] text-[var(--text-primary)] transition-all hover:bg-[var(--bg-overlay)] border border-[var(--border-main)] active:scale-95 group shrink-0"
        >
          {theme === 'dark' ? (
            <Sun size={14} className="sm:size-[16px] text-gray-400 group-hover:text-emerald-500 group-hover:drop-shadow-[0_0_8px_rgba(0,0,0,0)] transition-all duration-300" />
          ) : (
            <Moon size={14} className="sm:size-[16px] text-gray-400 group-hover:text-emerald-500 group-hover:drop-shadow-[0_0_8px_rgba(0,0,0,0)] transition-all duration-300" />
          )}
        </button>

        {user && (
          <div className="relative flex items-center h-full" ref={dropdownRef}>
            <button 
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="flex items-center justify-center w-10 h-10 rounded-[8px] text-[var(--text-primary)] transition-all hover:bg-[var(--bg-overlay)] border border-[var(--border-main)] relative active:scale-95 group shrink-0"
            >
              <Bell size={16} className={`transition-all duration-300 ${unreadCount > 0 ? "text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]" : "text-gray-400 group-hover:text-emerald-500 group-hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]"}`} />
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
                  className={`absolute top-full mt-2 w-[calc(100vw-32px)] sm:w-80 max-h-[480px] overflow-hidden rounded-[8px] border shadow-2xl z-[60] flex flex-col bg-[var(--bg-secondary)] border-[var(--border-main)] ${dir === 'rtl' ? 'left-0' : 'right-0'} fixed sm:absolute`}
                >
                  <div className="p-4 border-b border-[var(--border-main)] flex items-center justify-between">
                    <h3 className="font-bold text-sm text-[var(--text-primary)]">{language === 'ar' ? 'الإشعارات' : 'Notifications'}</h3>
                    <div className="flex items-center gap-3">
                      {unreadCount > 0 && (
                        <button 
                          onClick={markAllAsRead}
                          className="text-[10px] font-bold text-emerald-500 hover:text-emerald-400 transition-colors flex items-center gap-1"
                        >
                          <Check size={12} />
                          {language === 'ar' ? 'تعيين الكل كمقروء' : 'Mark all read'}
                        </button>
                      )}
                      {notifications.length > 0 && (
                        <button 
                          onClick={clearAllNotifications}
                          className="text-[10px] font-bold text-pink-500 hover:text-pink-400 transition-colors flex items-center gap-1"
                        >
                          <Trash2 size={12} />
                          {language === 'ar' ? 'مسح الكل' : 'Clear all'}
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto py-2 custom-scrollbar">
                    {notifications.length > 0 ? (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => markAsRead(notif.id)}
                          className={`w-full p-4 flex gap-3 text-right hover:bg-[var(--bg-primary)] transition-colors border-b border-[var(--border-main)] last:border-0 group cursor-pointer ${
                            !notif.is_read ? 'bg-emerald-500/5' : ''
                          }`}
                          dir={dir}
                        >
                          <div className={`mt-1 h-8 w-8 rounded-[8px] flex items-center justify-center shrink-0 ${
                            !notif.is_read ? 'bg-emerald-500/20 text-emerald-500' : 'bg-[var(--bg-primary)] text-gray-500'
                          }`}>
                            {getNotifIcon(notif.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className={`text-xs font-bold transition-all ${!notif.is_read ? 'text-emerald-500' : 'text-gray-500'}`}>
                              {language === 'ar' ? notif.title_ar : notif.title_en}
                            </h4>
                            <p className="text-[10px] text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                              {language === 'ar' ? notif.message_ar : notif.message_en}
                            </p>
                            <div className="flex items-center justify-between mt-2">
                              <div className="flex items-center gap-1 text-[9px] text-gray-600">
                                <Clock size={10} />
                                <span>{new Date(notif.created_at).toLocaleTimeString(language === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                              <button 
                                onClick={(e) => { e.stopPropagation(); deleteNotification(notif.id); }}
                                className="p-1 hover:text-pink-500 transition-colors opacity-0 group-hover:opacity-100"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-12 flex flex-col items-center justify-center text-gray-500 opacity-30">
                        <Bell size={32} className="mb-2" />
                        <span className="text-xs">{language === 'ar' ? 'لا توجد إشعارات' : 'No notifications'}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="p-3 border-t border-[var(--border-main)] text-center">
                    <span className="text-[10px] text-gray-500 font-medium">
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
  </header>
);
};

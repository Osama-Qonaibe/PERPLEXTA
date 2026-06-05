import React, { useEffect, useState, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { toast } from 'sonner';
import { Gift, CreditCard, LayoutDashboard, Plus, Settings, User, PanelRightClose, PanelLeftClose, LogOut, MessageSquare, Trash2, Edit2, Check, X, Settings2, Palette, Keyboard, Wallet, Link2, BrainCircuit, ChevronLeft, ChevronRight, Download, Loader2, Smartphone, Activity, ShoppingBag } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { PERPLEXTA_TRANSITION, SIDEBAR_TRANSITION, SIDEBAR_MOTION_TRANSITION } from '../constants/motions';
import { useSwipeToClose } from '../utils/swipe';
const sidebarTransition = SIDEBAR_TRANSITION;
const sidebarSpring = SIDEBAR_MOTION_TRANSITION;
const elasticSpring = SIDEBAR_TRANSITION;

export const Sidebar: React.FC<{ activeLanguage?: string }> = ({ activeLanguage }) => {
  const { t, theme, dir: globalDir, language: globalLang, isSidebarOpen, setIsSidebarOpen, user, logout, setIsAuthModalOpen, siteSettings, token, plans, isMobile, isInstallable, installApp, isInstalling } = useAppContext();
  
  const language = activeLanguage || globalLang;
  const dir = language === 'ar' ? 'rtl' : 'ltr';

  const swipeHandlers = useSwipeToClose({
    onSwipeClose: () => setIsSidebarOpen(false),
    direction: 'horizontal',
    dir: dir as 'rtl' | 'ltr',
    isMobile
  });

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [recentChats, setRecentChats] = useState<any[]>([]);
  const [isChatsLoading, setIsChatsLoading] = useState(true);
  const [streamingChatId, setStreamingChatId] = useState<string | null>(null);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [deletingChatConfirmId, setDeletingChatConfirmId] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const match = location.pathname.match(/^\/chat\/([^/]+)/);
  const activeChatId = match ? match[1] : null;

  const [isEditingContext, setIsEditingContext] = useState(false);
  const [editedContext, setEditedContext] = useState('');
  const [isSavingContext, setIsSavingContext] = useState(false);
  const [isContextCollapsed, setIsContextCollapsed] = useState(true);

  const currentChat = recentChats.find((c: any) => c.id?.toString() === activeChatId?.toString());

  useEffect(() => {
    if (currentChat) {
      setEditedContext(currentChat.context_summary || '');
    } else {
      setEditedContext('');
    }
    setIsEditingContext(false);
  }, [activeChatId, currentChat?.context_summary]);

  const handleSaveContext = async () => {
    if (!activeChatId || !token) return;
    setIsSavingContext(true);
    try {
      const res = await fetch(`/api/chats/${activeChatId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ context_summary: editedContext })
      });
      if (res.ok) {
        setIsEditingContext(false);
        fetchChats();
        toast.success(language === 'ar' ? 'تم تحديث ملخص السياق بنجاح' : 'Context summary updated successfully');
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.error || (language === 'ar' ? 'فشل التحديث' : 'Failed to update context summary'));
      }
    } catch (error) {
      console.error('Error saving context summary:', error);
      toast.error(language === 'ar' ? 'حدث خطأ غير متوقع' : 'An unexpected error occurred');
    } finally {
      setIsSavingContext(false);
    }
  };

  useEffect(() => {
    const handleStreamingState = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent && customEvent.detail) {
        if (customEvent.detail.isGenerating) {
          setStreamingChatId(customEvent.detail.chatId);
        } else {
          setStreamingChatId(null);
        }
      }
    };
    window.addEventListener('ai-streaming-state', handleStreamingState);
    return () => {
      window.removeEventListener('ai-streaming-state', handleStreamingState);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchChats = async () => {
    if (!token || token === 'null') {
      setIsChatsLoading(false);
      return;
    }
    try {
      const res = await fetch('/api/chats', {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
      if (res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await res.json();
          setRecentChats(data);
        } else {
          const text = await res.text();
          console.error(`Received non-JSON response for chats (200 OK):`, text.substring(0, 200));
        }
      } else if (res.status === 401) {
      } else {
        const text = await res.text();
        console.error(`Failed to fetch chats: ${res.status} ${res.statusText}`, text.substring(0, 100));
      }
    } catch (e) {
      if (e instanceof Error && e.message.includes('Failed to fetch')) {
        console.debug('Transient network error fetching chats (likely server initializing)');
      } else {
        console.error('Network error fetching chats:', e);
      }
    } finally {
      setIsChatsLoading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await fetch(`/api/chats/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchChats();
      navigate('/chat');
    } catch (e) {
      console.error('Failed to delete chat', e);
    }
  };

  const handleRename = async (id: string) => {
    try {
      await fetch(`/api/chats/${id}`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title: newTitle })
      });
      setEditingChatId(null);
      fetchChats();
    } catch (e) {
      console.error('Failed to rename chat', e);
    }
  };

  useEffect(() => {
    fetchChats();
    let debounceTimer: any = null;
    const debouncedFetch = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => fetchChats(), 300);
    };
    window.addEventListener('chat-created', debouncedFetch);
    window.addEventListener('chat-updated', debouncedFetch);
    return () => {
      window.removeEventListener('chat-created', debouncedFetch);
      window.removeEventListener('chat-updated', debouncedFetch);
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [token]);

  useEffect(() => {
    return () => {};
  }, []);

  const navItems: { icon: React.ReactNode, label: string, path: string, className?: string }[] = [];

  if (!isMobile) {
    navItems.push({ icon: <CreditCard size={18} />, label: t('subscription'), path: '/subscription' });
  }

  if (user) {
    navItems.unshift({ icon: <Gift size={18} />, label: t('rewards'), path: '/rewards' });
  }

  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;
  if (!isMobile && user && (['admin', 'support', 'elite'].includes(user.role || '') || (adminEmail && user.email === adminEmail))) {
    navItems.push({ 
      icon: <LayoutDashboard size={18} />, 
      label: t('dashboard'), 
      path: '/admin',
      className: 'hidden md:flex'
    });
    navItems.push({
      icon: <Settings2 size={18} />,
      label: language === 'ar' ? 'لوحة تحكم الأقسام' : 'Sections Dashboard',
      path: '/admin-community'
    });
  }

  const handleNewChat = () => {
    const isAlreadyAtNewChat = window.location.pathname === '/' || window.location.pathname === '/chat';
    
    if (isAlreadyAtNewChat) {
      window.dispatchEvent(new Event('clear-chat'));
      if (isMobile) setIsSidebarOpen(false);
      return;
    }

    navigate('/chat');
    window.dispatchEvent(new Event('clear-chat'));
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  };

  return (
    <>
      
      <motion.aside 
        initial={false}
        animate={{ 
          width: isMobile ? (isSidebarOpen ? '175px' : 0) : (isSidebarOpen ? 220 : 80),
          x: isMobile && !isSidebarOpen ? (dir === 'rtl' ? 300 : -300) : 0,
          opacity: isMobile && !isSidebarOpen ? 0 : 1
        }}
        transition={sidebarSpring}
        onTouchStart={swipeHandlers.onTouchStart}
        onTouchMove={swipeHandlers.onTouchMove}
        onTouchEnd={swipeHandlers.onTouchEnd}
        className={`fixed top-[72px] bottom-0 flex flex-col z-[150] select-none border-[var(--border)] bg-[var(--bg-base)] start-0 max-h-[calc(100dvh-72px)] ${dir === 'rtl' ? 'border-l' : 'border-r'} transition-theme ${
          isMobile && !isSidebarOpen ? 'pointer-events-none' : 'visible'
        }`}
        style={{ contain: 'layout', maxHeight: 'calc(100dvh - 72px)' }}
      >
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
          className={`absolute top-0 ${dir === 'rtl' ? '-left-4' : '-right-4'} z-[170] flex items-center justify-center transition-theme active:scale-90 group -translate-y-1/2 w-8 h-8
            ${isMobile ? 'hidden' : 'flex'}
          `}
          title={isSidebarOpen ? (language === 'ar' ? 'تصغير' : 'Collapse') : (language === 'ar' ? 'توسيع' : 'Expand')}
        >
          <div className="text-[var(--text-secondary)] transition-theme group-hover:text-emerald-500 group-hover:drop-shadow-[0_0_12px_rgba(16,185,129,0.8)]">
            {isSidebarOpen ? (
              dir === 'rtl' ? <ChevronRight size={22} strokeWidth={2.5} /> : <ChevronLeft size={22} strokeWidth={2.5} />
            ) : (
              dir === 'rtl' ? <ChevronLeft size={22} strokeWidth={2.5} /> : <ChevronRight size={22} strokeWidth={2.5} />
            )}
          </div>
        </button>

        <div className="w-full h-full overflow-hidden relative flex flex-col items-stretch px-0">
          <div className={`h-full flex flex-col flex-nowrap ${isMobile ? 'w-[175px]' : 'w-[220px]'} justify-between`}>
            
            <div className={`flex-shrink-0 ${isMobile ? 'pt-4' : 'pt-6'}`}>
              <nav className={isMobile ? "space-y-1" : "space-y-1"}>
                {navItems.map((item, index) => (
                  <NavLink
                    key={index}
                    to={item.path}
                    onClick={(e) => {
                      if (item.path === '#') {
                        e.preventDefault();
                        installApp();
                      } else if (isMobile) {
                        setIsSidebarOpen(false);
                      }
                    }}
                  >
                    {({ isActive }) => {
                      const active = isActive && item.path !== '#';
                      return (
                        <div className={`${(item as any).className || 'flex'} items-center transition-all duration-300 w-full ${isMobile ? 'h-[38px] px-3.5' : 'h-11'} overflow-hidden flex-shrink-0 group`}>
                          <div className={`${isMobile ? 'w-8' : 'w-[80px]'} h-full flex-shrink-0 flex items-center justify-center relative`}>
                            <div className={`absolute inset-0 mx-auto ${isMobile ? 'w-8 h-8' : 'w-10 h-10'} rounded-[4px] border border-transparent transition-all duration-300 ${
                              active ? 'bg-emerald-500/10 border-emerald-500/20' : 'group-hover:bg-gray-50 dark:group-hover:bg-gray-800'
                            }`} />
                            <div className={`relative z-10 transition-all duration-300 ${
                              active 
                                ? 'text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]' 
                                : 'text-gray-400 group-hover:text-emerald-500 group-hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]'
                            }`}>
                              {React.cloneElement(item.icon as React.ReactElement, { size: isMobile ? 18 : 18 } as any)}
                            </div>
                          </div>
                          <AnimatePresence mode="wait" initial={false}>
                            {isSidebarOpen && (
                              <motion.span
                                initial={false}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: dir === 'rtl' ? 10 : -10 }}
                                transition={sidebarTransition}
                                className={`font-bold text-sm whitespace-nowrap transition-all duration-300 ${
                                  active ? 'text-emerald-500 font-bold' : 'text-gray-400 group-hover:text-emerald-500'
                                } ${dir === 'rtl' ? 'mr-1.5' : 'ml-1.5'}`}
                              >
                                {item.label}
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    }}
                  </NavLink>
                ))}


                {user && token && (
                  <div className={`mt-4 py-2 border-t border-[var(--border-main)] transition-theme`}>
                    <button 
                      onClick={handleNewChat}
                      className={`flex items-center transition-all duration-300 w-full ${isMobile ? 'h-[38px] px-3.5' : 'h-11'} overflow-hidden flex-shrink-0 group`}
                    >
                      <div className={`${isMobile ? 'w-8' : 'w-[80px]'} h-full flex-shrink-0 flex items-center justify-center relative translate-y-0`}>
                        <div className={`absolute inset-0 m-auto ${isMobile ? 'w-8 h-8' : 'w-10 h-10'} rounded-[4px] border border-transparent transition-all duration-300 bg-emerald-500/5 border-emerald-500/10 group-hover:bg-emerald-500/15 group-hover:border-emerald-500/20`} />
                        <Plus size={isMobile ? 20 : 20} className={`relative z-10 transition-all duration-300 text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]`} />
                      </div>
                      <AnimatePresence mode="wait" initial={false}>
                        {isSidebarOpen && (
                          <motion.span
                            initial={false}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: dir === 'rtl' ? 10 : -10 }}
                            transition={sidebarTransition}
                            className={`font-black ${isMobile ? 'text-sm' : 'text-sm'} text-emerald-500 whitespace-nowrap ${dir === 'rtl' ? 'mr-1.5' : 'ml-1.5'}`}
                          >
                            {t('newChat')}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </button>
                  </div>
                )}
              </nav>
            </div>

            {user && token && (
              <div className="flex-grow flex-shrink flex-1 min-h-0 flex flex-col overflow-hidden">
                <div className={`pt-2 mt-2 border-t border-[var(--border-main)] transition-theme flex-shrink-0 flex items-center h-8 overflow-hidden ${isMobile ? 'px-3.5' : ''}`}>
                  <div className={`${isMobile ? 'w-8' : 'w-[80px]'} flex-shrink-0`} />
                  <AnimatePresence initial={false}>
                    {isSidebarOpen && (
                      <motion.h3 
                        initial={false}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={elasticSpring}
                        className="flex-1 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest whitespace-nowrap truncate text-start transition-theme"
                      >
                        {dir === 'rtl' ? 'المحادثات السابقة' : 'Recent Chats'}
                      </motion.h3>
                    )}
                  </AnimatePresence>
                </div>

                <div className="flex-1 overflow-y-auto scrollbar-none custom-scrollbar scroll-smooth pb-4 min-h-0">
                  <div className="min-h-[200px]">
                    {isChatsLoading ? (
                      <div className="space-y-1 px-3 py-2 animate-pulse w-full">
                        {[...Array(5)].map((_, i) => (
                          <div 
                            key={i} 
                            className={`flex items-center gap-3 w-full ${isMobile ? 'h-[38px] px-3.5' : 'h-11'} rounded-[4px] bg-gray-150/20 dark:bg-gray-800/10 border border-transparent`}
                          >
                            <div className="w-4 h-4 rounded-[4px] bg-gray-200/60 dark:bg-gray-800/60 shrink-0" />
                            {isSidebarOpen && (
                              <div className="h-2.5 bg-gray-200/40 dark:bg-gray-800/40 rounded w-1/2" />
                            )}
                          </div>
                        ))}
                      </div>
                    ) : recentChats.length > 0 ? (
                      <div className={isMobile ? "space-y-1" : "space-y-1"}>
                        {recentChats.map((chat) => {
                          const isActive = activeChatId?.toString() === chat.id?.toString();
                          return (
                            <motion.div
                              key={chat.id}
                              animate={streamingChatId === chat.id ? {
                                backgroundColor: ["rgba(16,185,129,0)", "rgba(16,185,129,0.06)", "rgba(16,185,129,0)"],
                                borderColor: ["rgba(16,185,129,0)", "rgba(16,185,129,0.25)", "rgba(16,185,129,0)"]
                              } : {}}
                              transition={{
                                duration: 1.5,
                                repeat: Infinity,
                                ease: "easeInOut"
                              }}
                              className={`flex items-center w-full ${isMobile ? 'h-[38px] px-3.5' : 'h-11'} overflow-hidden flex-shrink-0 transition-all duration-300 group relative border rounded-[4px] ${
                                isActive 
                                  ? 'text-emerald-500 bg-emerald-500/[0.04] dark:bg-emerald-500/[0.06] border-emerald-500/10' 
                                  : 'text-gray-400 hover:text-emerald-500 hover:bg-gray-50/50 dark:hover:bg-gray-800/20 border-transparent'
                              }`}
                            >
                              {editingChatId === chat.id ? (
                                <div className="flex items-center w-full h-full pr-1">
                                  <div className={`${isMobile ? 'w-8' : 'w-[80px]'} h-full flex-shrink-0 flex items-center justify-center relative`}>
                                    <div className={`absolute inset-0 mx-auto ${isMobile ? 'w-8 h-8' : 'w-10 h-10'} rounded-[4px] bg-[var(--bg-overlay)] transition-all duration-300`} />
                                    <MessageSquare size={isMobile ? 16 : 16} className="text-emerald-500 relative z-10" />
                                  </div>
                                  <div className="flex-1 flex items-center gap-1 min-w-0">
                                    <input
                                      type="text"
                                      value={newTitle}
                                      onChange={(e) => setNewTitle(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleRename(chat.id);
                                        if (e.key === 'Escape') setEditingChatId(null);
                                      }}
                                      className={`bg-[var(--bg-input)] text-[var(--text-primary)] ${isMobile ? 'text-[13px] px-2 py-1' : 'text-xs px-2 py-1'} rounded w-full outline-none border border-[var(--border-accent)] min-w-0 transition-theme`}
                                      autoFocus
                                    />
                                    <div className="flex items-center">
                                      <button 
                                        onClick={() => handleRename(chat.id)}
                                        className={`p-1.5 text-emerald-500 hover:text-emerald-400 transition-theme`}
                                        title={t('save')}
                                      >
                                        <Check size={isMobile ? 16 : 14} />
                                      </button>
                                      <button 
                                        onClick={() => setEditingChatId(null)}
                                        className={`p-1.5 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-theme`}
                                        title={t('cancel')}
                                      >
                                        <X size={isMobile ? 16 : 14} />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div
                                    onClick={() => {
                                      navigate(`/chat/${chat.id}`);
                                      if (window.innerWidth < 768) setIsSidebarOpen(false);
                                    }}
                                    className="flex items-center h-full flex-1 min-w-0 cursor-pointer"
                                  >
                                    <div className={`${isMobile ? 'w-8' : 'w-[80px]'} h-full flex-shrink-0 flex items-center justify-center relative`}>
                                      <div className={`absolute inset-0 mx-auto ${isMobile ? 'w-8 h-8' : 'w-10 h-10'} rounded-[4px] transition-all duration-300 ${isActive ? 'bg-emerald-500/[0.02] dark:bg-emerald-500/[0.04]' : 'group-hover:bg-gray-50 dark:group-hover:bg-gray-800'}`} />
                                      <MessageSquare 
                                        size={isMobile ? 16 : 16} 
                                        className={`relative z-10 transition-all duration-300 ${
                                          isActive 
                                            ? 'text-emerald-500' 
                                            : streamingChatId === chat.id 
                                              ? 'text-emerald-500 animate-pulse' 
                                              : 'text-gray-400 group-hover:text-emerald-500'
                                        }`} 
                                      />
                                    </div>
                                    <AnimatePresence mode="wait" initial={false}>
                                      {isSidebarOpen && (
                                        <motion.span
                                          initial={{ opacity: 0 }}
                                          animate={{ opacity: 1 }}
                                          exit={{ opacity: 0 }}
                                          transition={sidebarTransition}
                                          className={`font-semibold ${isMobile ? 'text-[12.5px]' : 'text-[13px]'} truncate whitespace-nowrap text-start transition-theme ${dir === 'rtl' ? 'mr-1' : 'ml-1'} ${
                                            isActive 
                                              ? 'text-emerald-500' 
                                              : streamingChatId === chat.id 
                                                ? 'text-emerald-500 font-extrabold' 
                                                : 'text-gray-400 group-hover:text-emerald-500'
                                          }`}
                                        >
                                          {chat.title}
                                        </motion.span>
                                      )}
                                    </AnimatePresence>
                                  </div>
                                  <AnimatePresence>
                                    {isSidebarOpen && (
                                      <motion.div 
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className={`flex items-center gap-1 ${deletingChatConfirmId === chat.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-all duration-300 ${dir === 'rtl' ? (isMobile ? 'mr-auto pl-2.5' : 'mr-auto pl-4') : (isMobile ? 'ml-auto pr-2.5' : 'ml-auto pr-4')}`}
                                      >
                                        {deletingChatConfirmId === chat.id ? (
                                          <div className="flex items-center gap-1 bg-pink-500/5 dark:bg-pink-500/10 border border-pink-500/20 rounded-[4px] px-1 py-0.5">
                                            <span className="text-[9px] text-pink-500 font-bold whitespace-nowrap px-0.5 select-none animate-pulse">
                                              {language === 'ar' ? 'تأكيد؟' : 'Sure?'}
                                            </span>
                                            <button 
                                              type="button"
                                              onClick={async (e) => {
                                                e.stopPropagation();
                                                await handleDelete(e, chat.id);
                                                setDeletingChatConfirmId(null);
                                              }}
                                              className="w-5 h-5 flex items-center justify-center rounded-[3px] text-pink-500 hover:bg-pink-500/20 transition-all duration-300"
                                              title={language === 'ar' ? 'تأكيد الحذف' : 'Confirm deletion'}
                                            >
                                              <Check size={11} />
                                            </button>
                                            <button 
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setDeletingChatConfirmId(null);
                                              }}
                                              className="w-5 h-5 flex items-center justify-center rounded-[3px] text-gray-400 hover:text-emerald-500 transition-all duration-300"
                                              title={language === 'ar' ? 'إلغاء' : 'Cancel'}
                                            >
                                              <X size={11} />
                                            </button>
                                          </div>
                                        ) : (
                                          <>
                                            <button 
                                              onClick={() => { setEditingChatId(chat.id); setNewTitle(chat.title); setDeletingChatConfirmId(null); }}
                                              className="w-8 h-8 flex items-center justify-center rounded-[4px] text-gray-400 hover:text-emerald-500 hover:bg-gray-50 dark:hover:bg-gray-800 hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)] transition-all duration-300"
                                            >
                                              <Edit2 size={isMobile ? 14 : 13} />
                                            </button>
                                            <button 
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setDeletingChatConfirmId(chat.id);
                                              }}
                                              className="w-8 h-8 flex items-center justify-center rounded-[4px] text-gray-400 hover:text-pink-500 hover:bg-pink-500/10 transition-all duration-300"
                                            >
                                              <Trash2 size={isMobile ? 14 : 13} />
                                            </button>
                                          </>
                                        )}
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                  {/* Left or Right indicator bar for active item */}
                                  {isActive && (
                                    <div className={`absolute top-1/2 -translate-y-1/2 w-[3px] h-4 bg-emerald-500 ${
                                      dir === 'rtl' ? 'right-0 rounded-l-[1.5px]' : 'left-0 rounded-r-[1.5px]'
                                    }`} />
                                  )}
                                </>
                              )}
                            </motion.div>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                </div>

                {isSidebarOpen && activeChatId && (
                  <div className={`mx-3 mb-2 p-2.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/10 flex flex-col transition-all duration-300`}>
                    <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsContextCollapsed(!isContextCollapsed)}>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <BrainCircuit size={14} className="text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)] flex-shrink-0" />
                        <span className="text-[11px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 truncate font-sans">
                          {language === 'ar' ? 'ملخص السياق النشط' : 'Context Summary'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        {!isEditingContext && (
                          <button
                            onClick={() => setIsEditingContext(true)}
                            className="w-5 h-5 flex items-center justify-center rounded-[4px] text-gray-400 hover:text-emerald-500 hover:bg-gray-150 dark:hover:bg-gray-800 transition-all duration-300"
                            title={language === 'ar' ? 'تعديل المعرفة' : 'Edit Context'}
                          >
                            <Edit2 size={11} />
                          </button>
                        )}
                        <button
                          onClick={() => setIsContextCollapsed(!isContextCollapsed)}
                          className={`w-5 h-5 flex items-center justify-center rounded-[4px] text-gray-400 hover:text-emerald-500 hover:bg-gray-150 dark:hover:bg-gray-800 transition-all duration-300 transform ${isContextCollapsed ? 'rotate-180' : ''}`}
                        >
                          <ChevronLeft size={12} className="rotate-270" style={{ transform: isContextCollapsed ? 'rotate(90deg)' : 'rotate(-90deg)' }} />
                        </button>
                      </div>
                    </div>

                    <AnimatePresence initial={false}>
                      {!isContextCollapsed && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          {isEditingContext ? (
                            <div className="flex flex-col gap-2 mt-2">
                              <textarea
                                value={editedContext}
                                onChange={(e) => setEditedContext(e.target.value)}
                                className="w-full h-24 text-[11px] font-sans p-1.5 rounded-[4px] bg-[var(--bg-input)] text-[var(--text-primary)] border border-emerald-500/20 focus:border-emerald-500/40 outline-none resize-none transition-theme"
                                placeholder={language === 'ar' ? 'اكتب سياق المعرفة هنا...' : 'Type active context summary here...'}
                                disabled={isSavingContext}
                                autoFocus
                              />
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => {
                                    setIsEditingContext(false);
                                    setEditedContext(currentChat?.context_summary || '');
                                  }}
                                  disabled={isSavingContext}
                                  className="text-[10px] text-gray-400 hover:text-pink-500 hover:bg-pink-500/10 transition-all duration-300 rounded-[4px] px-2 py-1 flex items-center gap-1"
                                >
                                  <X size={10} />
                                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                                </button>
                                <button
                                  onClick={handleSaveContext}
                                  disabled={isSavingContext}
                                  className="text-[10px] text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all duration-300 rounded-[4px] px-2 py-1 flex items-center gap-1 font-bold"
                                >
                                  {isSavingContext ? (
                                    <Loader2 size={10} className="animate-spin" />
                                  ) : (
                                    <Check size={10} />
                                  )}
                                  {language === 'ar' ? 'حفظ' : 'Save'}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1.5 mt-2">
                              <div className="text-[11px] text-gray-500 dark:text-gray-400 font-sans leading-relaxed tracking-wide select-text whitespace-pre-wrap max-h-[140px] overflow-y-auto custom-scrollbar p-2 bg-white/40 dark:bg-black/20 border border-gray-100 dark:border-gray-800/40 rounded-[4px]">
                                {editedContext ? (
                                  editedContext
                                ) : (
                                  <span className="text-gray-400 italic">
                                    {language === 'ar'
                                      ? 'لم يتم إنشاء ملخص سياق بعد لهذه المحادثة. يبدأ النموذج بالتلخيص قريباً.'
                                      : 'No active context summary generated yet for this chat.'}
                                  </span>
                                )}
                              </div>
                              {!editedContext && (
                                <button
                                  onClick={() => setIsEditingContext(true)}
                                  className="self-start text-[9px] font-bold text-emerald-500 hover:text-emerald-400 transition-theme flex items-center gap-1 mt-1"
                                >
                                  <Plus size={10} />
                                  {language === 'ar' ? 'إضافة ملخص يدوي' : 'Add summary manually'}
                                </button>
                              )}
                              <span className="text-[9px] text-gray-400 dark:text-gray-500/80 leading-snug">
                                {language === 'ar'
                                  ? '💡 يمثل هذا السياق النشط الذي يتم تضمينه في ذاكرة الذكاء الاصطناعي لفهم محتوى المحادثة الحالي.'
                                  : '💡 This represents the active context synthesized for the AI model to track key objectives.'}
                              </span>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            )}

            <div className={`mt-auto pt-4 pb-5 border-t border-[var(--border-main)] transition-theme ${isMobile ? 'space-y-1.5' : 'space-y-1'} flex-shrink-0 relative`} ref={dropdownRef}>
              {user ? (
                <>
                  <AnimatePresence>
                    {isDropdownOpen && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={`absolute bottom-full mb-2 w-[calc(100%-24px)] bg-[var(--bg-surface)] border-[var(--border)] border rounded-lg shadow-xl overflow-hidden z-50 ${dir === 'rtl' ? 'right-3' : 'left-3'}`}
                      >
                        <div className={`p-2 ${isMobile ? 'space-y-1.5' : 'space-y-1'}`}>
                          <button 
                            onClick={() => { navigate('/settings?tab=account'); setIsDropdownOpen(false); }} 
                            className={`w-full flex items-center gap-3 ${isMobile ? 'px-3 py-2' : 'px-3 py-2.5'} rounded-[4px] border border-transparent transition-all duration-300 text-gray-400 hover:text-emerald-500 hover:bg-gray-50 dark:hover:bg-gray-800 group/item`}
                          >
                            <User size={isMobile ? 16 : 16} className="flex-shrink-0 group-hover/item:text-emerald-500 group-hover/item:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)] text-gray-400 transition-all duration-300" />
                            <AnimatePresence mode="wait" initial={false}>
                              {isSidebarOpen && (
                                <motion.div
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  transition={sidebarTransition}
                                  className="overflow-hidden whitespace-nowrap text-start"
                                >
                                  <span className={`font-bold ${isMobile ? 'text-sm' : 'text-sm'}`}>{t('accountSettings') || (dir === 'rtl' ? 'الحساب' : 'Account')}</span>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </button>

                          <button 
                            onClick={() => { navigate('/settings?tab=usage'); setIsDropdownOpen(false); }} 
                            className={`w-full flex items-center gap-3 ${isMobile ? 'px-3 py-2' : 'px-3 py-2.5'} rounded-[4px] border border-transparent transition-all duration-300 text-gray-400 hover:text-emerald-500 hover:bg-gray-50 dark:hover:bg-gray-800 group/item`}
                          >
                            <Activity size={isMobile ? 16 : 16} className="flex-shrink-0 group-hover/item:text-emerald-500 group-hover/item:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)] text-gray-400 transition-all duration-300" />
                            <AnimatePresence mode="wait" initial={false}>
                              {isSidebarOpen && (
                                <motion.div
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  transition={sidebarTransition}
                                  className="overflow-hidden whitespace-nowrap text-start"
                                >
                                  <span className={`font-bold ${isMobile ? 'text-sm' : 'text-sm'}`}>{t('consumption') || (dir === 'rtl' ? 'الاستهلاك' : 'Consumption')}</span>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </button>

                          <div className={`h-px bg-[var(--border)] my-1 mx-2 transition-theme`}></div>

                          <button 
                            onClick={() => { navigate('/settings?tab=wallet'); setIsDropdownOpen(false); }} 
                            className={`w-full flex items-center gap-3 ${isMobile ? 'px-3 py-2' : 'px-3 py-2.5'} rounded-[4px] border border-transparent transition-all duration-300 text-gray-400 hover:text-emerald-500 hover:bg-gray-50 dark:hover:bg-gray-800 group/item`}
                          >
                            <Wallet size={isMobile ? 16 : 16} className="flex-shrink-0 group-hover/item:text-emerald-500 group-hover/item:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)] text-gray-400 transition-all duration-300" />
                            <AnimatePresence mode="wait" initial={false}>
                              {isSidebarOpen && (
                                <motion.div
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  transition={sidebarTransition}
                                  className="overflow-hidden whitespace-nowrap text-start"
                                >
                                  <span className={`font-bold ${isMobile ? 'text-sm' : 'text-sm'}`}>{t('wallet') || (dir === 'rtl' ? 'المحفظة' : 'Wallet')}</span>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </button>

                          <button 
                            onClick={() => { navigate('/settings?tab=marketplace_purchases'); setIsDropdownOpen(false); }} 
                            className={`w-full flex items-center gap-3 ${isMobile ? 'px-3 py-2' : 'px-3 py-2.5'} rounded-[4px] border border-transparent transition-all duration-300 text-gray-400 hover:text-emerald-500 hover:bg-gray-50 dark:hover:bg-gray-800 group/item`}
                          >
                            <ShoppingBag size={isMobile ? 16 : 16} className="flex-shrink-0 group-hover/item:text-emerald-500 group-hover/item:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)] text-gray-400 transition-all duration-300" />
                            <AnimatePresence mode="wait" initial={false}>
                              {isSidebarOpen && (
                                <motion.div
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  transition={sidebarTransition}
                                  className="overflow-hidden whitespace-nowrap text-start"
                                >
                                  <span className={`font-bold ${isMobile ? 'text-sm' : 'text-sm'}`}>{language === 'ar' ? 'مشترياتي الرقمية' : 'Digital Purchases'}</span>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </button>

                          <button 
                            onClick={() => { navigate('/settings?tab=memory'); setIsDropdownOpen(false); }} 
                            className={`w-full flex items-center gap-3 ${isMobile ? 'px-3 py-2' : 'px-3 py-2.5'} rounded-[4px] border border-transparent transition-all duration-300 text-gray-400 hover:text-emerald-500 hover:bg-gray-50 dark:hover:bg-gray-850 group/item`}
                          >
                            <BrainCircuit size={isMobile ? 16 : 16} className="flex-shrink-0 group-hover/item:text-emerald-500 group-hover/item:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)] text-gray-400 transition-all duration-300" />
                            <AnimatePresence mode="wait" initial={false}>
                              {isSidebarOpen && (
                                <motion.div
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  transition={sidebarTransition}
                                  className="overflow-hidden whitespace-nowrap text-start"
                                >
                                  <span className={`font-bold ${isMobile ? 'text-sm' : 'text-sm'}`}>{t('memoryCenter') || (dir === 'rtl' ? 'ذاكرة المساعد' : 'Memory Center')}</span>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </button>

                           <button 
                             onClick={() => { logout(); setIsDropdownOpen(false); }} 
                             className={`w-full flex items-center gap-3 ${isMobile ? 'px-3 py-2' : 'px-3 py-2.5'} rounded-[4px] border border-transparent text-gray-400 hover:text-pink-500 hover:bg-pink-500/10 transition-all duration-300`}
                           >
                            <LogOut size={isMobile ? 16 : 16} className="flex-shrink-0" />
                            <AnimatePresence mode="wait" initial={false}>
                              {isSidebarOpen && (
                                <motion.div
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  transition={sidebarTransition}
                                  className="overflow-hidden whitespace-nowrap text-start"
                                >
                                  <span className={`font-bold ${isMobile ? 'text-sm' : 'text-sm'}`}>{t('logout') || (dir === 'rtl' ? 'تسجيل الخروج' : 'Logout')}</span>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                    <div 
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className={`flex items-center group cursor-pointer w-full ${isMobile ? 'h-[44px] px-3.5' : 'h-[44px]'} overflow-hidden flex-shrink-0 text-gray-400 hover:text-emerald-500 transition-all duration-300`}
                    >
                      <div className="flex items-center h-full overflow-hidden w-full relative text-[var(--text-primary)]">
                        <div className={`${isMobile ? 'w-8' : 'w-[80px]'} ${isMobile ? 'h-[44px]' : 'h-[44px]'} flex-shrink-0 flex items-center justify-center relative`}>
                          <div className={`absolute inset-0 mx-auto ${isMobile ? 'w-8 h-8' : 'w-10 h-10'} rounded-[4px] transition-all duration-300 group-hover:bg-emerald-500/5 group-hover:border-emerald-500/20`} />
                          <div 
                            className={`${isMobile ? 'w-8 h-8' : 'w-10 h-10'} rounded-[4px] bg-[var(--bg-surface)] flex items-center justify-center flex-shrink-0 overflow-hidden border-2 transition-all duration-300 relative z-10 group-hover:border-emerald-500/50 shadow-[0_0_15px_rgba(0,0,0,0.1)] group-hover:shadow-[0_0_25px_rgba(16,185,129,0.35)] group-hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.4)] group-hover:scale-105`}
                            style={{ 
                              borderColor: user.subscription?.plan_color || 'var(--border)'
                            }}
                          >
                            {user.avatar ? (
                              <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <User size={isMobile ? 18 : 20} className="text-gray-400 group-hover:text-emerald-500 transition-all duration-300 group-hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                            )}
                          </div>
                          <div className={`absolute -bottom-1 left-0 right-0 flex justify-center transition-theme ${!isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                            <span 
                              className="text-[8px] font-black uppercase tracking-tighter leading-none whitespace-nowrap drop-shadow-[0_0_5px_rgba(0,0,0,0.2)]"
                              style={{ color: user.subscription?.plan_color || '#10b981' }}
                            >
                              {user.subscription?.plan_name_en || ''}
                            </span>
                          </div>
                        </div>
                        <div className={`flex flex-col min-w-0 ${dir === 'rtl' ? 'pr-2' : 'pl-2'} justify-center`}>
                        <AnimatePresence mode="wait" initial={false}>
                          {isSidebarOpen && (
                            <motion.div 
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={sidebarTransition}
                              className={`flex flex-col overflow-hidden ${dir === 'rtl' ? 'text-right' : 'text-left'}`}
                            >
                              <span className={`font-bold ${isMobile ? 'text-sm' : 'text-[13px]'} truncate whitespace-nowrap leading-tight text-[var(--text-primary)] transition-theme`}>{user.name}</span>
                              <span className={`text-[10px] text-emerald-500/80 truncate whitespace-nowrap uppercase tracking-widest font-black leading-tight mt-0.5`}>
                                {t(`role_${(user.role || 'user').toLowerCase()}`) || (user.subscription?.plan_id 
                                  ? (plans.find((p: any) => p.id.toString() === user.subscription?.plan_id.toString())?.name || t('activePlan'))
                                  : t('noPlan'))}
                              </span>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col w-full overflow-hidden flex-shrink-0 mt-2">
                  </div>
                </>
              ) : (
                  <div 
                    className={`flex items-center group cursor-pointer w-full ${isMobile ? 'h-[44px] px-3.5' : 'h-[44px]'} overflow-hidden flex-shrink-0 text-gray-400 hover:text-emerald-500 transition-all duration-300`}
                    onClick={() => {
                      setIsAuthModalOpen(true);
                      if (isMobile) {
                        setIsSidebarOpen(false);
                      }
                    }}
                  >
                    <div className={`${isMobile ? 'w-8' : 'w-[80px]'} h-[44px] flex-shrink-0 flex items-center justify-center relative`}>
                      <div className={`absolute inset-0 mx-auto ${isMobile ? 'w-8 h-8' : 'w-10 h-10'} rounded-[4px] transition-all duration-300 group-hover:bg-gray-50 dark:group-hover:bg-gray-800`} />
                      <div className={`${isMobile ? 'w-8 h-8' : 'w-10 h-10'} rounded-[4px] bg-[var(--bg-surface)] flex items-center justify-center flex-shrink-0 relative z-10 transition-all duration-300 border border-transparent group-hover:border-emerald-500/30 group-hover:shadow-[0_0_15px_rgba(16,185,129,0.2)]`}>
                        <User size={isMobile ? 16 : 18} className="text-gray-400 group-hover:text-emerald-500 transition-all duration-300 group-hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                      </div>
                    </div>
                    <div className={`flex flex-col min-w-0 ${dir === 'rtl' ? 'pr-2' : 'pl-2'} justify-center`}>
                      <AnimatePresence mode="wait">
                        {isSidebarOpen && (
                          <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={sidebarTransition}
                            className={`flex flex-col overflow-hidden ${dir === 'rtl' ? 'text-right' : 'text-left'}`}
                          >
                            <span className="text-[10px] text-gray-500 truncate whitespace-nowrap font-bold uppercase tracking-wider mb-0.5">{t('createAccount')}</span>
                            <span className={`font-bold text-sm truncate whitespace-nowrap text-gray-400 group-hover:text-emerald-500 group-hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)] transition-all duration-300`}>{t('login')}</span>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
              )}
              
              <div className={`flex flex-col w-full h-4 overflow-hidden flex-shrink-0 mt-2 ${isMobile ? 'px-2' : 'px-6'} relative`}>
                <AnimatePresence mode="wait">
                  {isSidebarOpen && (
                    <motion.div 
                      key="legal-footer"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={sidebarTransition}
                      className={`flex items-center ${isMobile ? 'justify-start gap-1.5' : 'justify-between gap-1'} opacity-35 hover:opacity-100 transition-all duration-300 pointer-events-auto w-full`}
                    >
                      <NavLink to="/terms" className={`${isMobile ? 'text-[7.5px]' : 'text-[6.5px]'} font-black text-gray-500 hover:text-emerald-500 transition-all duration-300 uppercase tracking-[0.08em] whitespace-nowrap`}>
                        {t('termsOfUse')}
                      </NavLink>
                      {!isMobile && <span className="w-0.5 h-0.5 rounded-full bg-[var(--border)] flex-shrink-0" />}
                      <NavLink to="/privacy" className={`${isMobile ? 'text-[7.5px]' : 'text-[6.5px]'} font-black text-gray-500 hover:text-emerald-500 transition-all duration-300 uppercase tracking-[0.08em] whitespace-nowrap`}>
                        {t('privacyPolicy')}
                      </NavLink>
                      {!isMobile && <span className="w-0.5 h-0.5 rounded-full bg-[var(--border)] flex-shrink-0" />}
                      <NavLink to="/about" className={`${isMobile ? 'text-[7.5px]' : 'text-[6.5px]'} font-black text-gray-500 hover:text-emerald-500 transition-all duration-300 uppercase tracking-[0.08em] whitespace-nowrap`}>
                        {language === 'ar' ? 'عن المنصة' : 'About'}
                      </NavLink>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

            </div>
          </div>
        </div>
      </motion.aside>

      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-[149] bg-transparent"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </>
  );
};

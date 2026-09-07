import { safeStorageGet, safeStorageSet } from "@/utils/safeStorage";
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { NavLink } from 'react-router-dom';
import { usePerplextaRouter } from '../hooks/usePerplextaRouter';
import { toast } from '../context/NotificationContext';
import { Gift, CreditCard, LayoutDashboard, Plus, User, LogOut, MessageSquare, Trash2, Edit2, Check, X, Settings2, Wallet, BrainCircuit, ChevronLeft, ChevronRight, Loader2, Activity, MoreHorizontal, Sparkles, LayoutGrid } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { isPathBlocked } from '../utils/sectionVisibility';
import { SkeletonLoader } from './SkeletonLoader';
import { resolveImageUrl } from '../utils/imageResolver';
import { motion, AnimatePresence } from 'motion/react';
import { SIDEBAR_TRANSITION } from '../constants/motions';
import { useSwipeToClose } from '../utils/swipe';
import { FloatingPopover } from './FloatingPopover';
import { triggerHaptic } from '../utils/haptics';
const sidebarTransition = SIDEBAR_TRANSITION;
const sidebarSpring = SIDEBAR_TRANSITION;
const elasticSpring = SIDEBAR_TRANSITION;

export const Sidebar: React.FC<{ activeLanguage?: string }> = ({ activeLanguage }) => {
  const { 
    t, 
    theme, 
    dir: globalDir, 
    language: globalLang, 
    isSidebarOpen, 
    setIsSidebarOpen, 
    user, 
    logout, 
    setIsAuthModalOpen, 
    siteSettings, 
    token, 
    plans, 
    isMobile
  } = useAppContext();
  
  const language = activeLanguage || globalLang;
  const dir = language === 'ar' ? 'rtl' : 'ltr';

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [recentChats, setRecentChats] = useState<any[]>(() => {
    try {
      const cached = safeStorageGet('perplexta_recent_chats');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [isChatsLoading, setIsChatsLoading] = useState<boolean>(() => {
    try {
      return !safeStorageGet('perplexta_recent_chats');
    } catch {
      return true;
    }
  });
  const [streamingChatId, setStreamingChatId] = useState<string | null>(null);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [deletingChatConfirmId, setDeletingChatConfirmId] = useState<string | null>(null);
  const [optionsMenuTarget, setOptionsMenuTarget] = useState<{ chatId: string; rect: DOMRect } | null>(null);
  const activeOptionsMenuChatId = optionsMenuTarget?.chatId || null;
  const deletingChat = recentChats.find((c: any) => c.id?.toString() === deletingChatConfirmId?.toString());
  const deletingChatTitle = deletingChat ? deletingChat.title : '';
  const { navigate, location } = usePerplextaRouter();

  const match = location.pathname.match(/^\/chat\/([^/]+)/);
  const activeChatId = match ? match[1] : null;

  const [isEditingContext, setIsEditingContext] = useState(false);
  const [editedContext, setEditedContext] = useState('');
  const [isSavingContext, setIsSavingContext] = useState(false);
  const [isContextCollapsed, setIsContextCollapsed] = useState(true);

  const currentChat = recentChats.find((c: any) => c.id?.toString() === activeChatId?.toString());

  useEffect(() => {
    try {
      safeStorageSet('perplexta_recent_chats', JSON.stringify(recentChats));
    } catch {}
  }, [recentChats]);

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

  useEffect(() => {
    const handleGlobalClick = () => {
      setOptionsMenuTarget(null);
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  const inFlightFetchRef = useRef<Promise<void> | null>(null);
  const retryTimeoutRef = useRef<any>(null);

  const fetchChats = useCallback(async (retryCount = 0) => {
    if (!token || token === 'null') {
      setIsChatsLoading(false);
      return;
    }

    if (inFlightFetchRef.current) {
      return inFlightFetchRef.current;
    }

    const fetchPromise = (async () => {
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
            if (Array.isArray(data)) {
              setRecentChats(data);
              try {
                safeStorageSet('perplexta_recent_chats', JSON.stringify(data));
              } catch {}
            }
          }
        } else if (res.status === 429) {
          // Rate limit reached - schedule a backoff retry without noisy console error
          if (retryCount < 3) {
            const backoffMs = Math.min(1500 * Math.pow(2, retryCount), 6000) + Math.random() * 400;
            if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
            retryTimeoutRef.current = setTimeout(() => {
              fetchChats(retryCount + 1);
            }, backoffMs);
          }
        } else if (res.status === 401) {
          // Token expired or invalid
        } else {
          const text = await res.text().catch(() => '');
          if (res.status !== 503 && res.status !== 502) {
            console.debug(`[Chats] HTTP ${res.status}:`, text.substring(0, 100));
          }
        }
      } catch (e) {
        if (e instanceof Error && (e.message.includes('Failed to fetch') || e.message.includes('NetworkError'))) {
          console.debug('Transient network error fetching chats (likely server initializing)');
        } else {
          console.debug('Network notice fetching chats:', e);
        }
      } finally {
        setIsChatsLoading(false);
        inFlightFetchRef.current = null;
      }
    })();

    inFlightFetchRef.current = fetchPromise;
    return fetchPromise;
  }, [token]);

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
      debounceTimer = setTimeout(() => fetchChats(), 400);
    };
    window.addEventListener('chat-created', debouncedFetch);
    window.addEventListener('chat-updated', debouncedFetch);
    return () => {
      window.removeEventListener('chat-created', debouncedFetch);
      window.removeEventListener('chat-updated', debouncedFetch);
      if (debounceTimer) clearTimeout(debounceTimer);
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    };
  }, [fetchChats]);

  useEffect(() => {
    return () => {};
  }, []);

  const rawNavItems: { icon: React.ReactNode, label: string, path: string, className?: string }[] = [];

  if (user) {
    rawNavItems.push({
      icon: <Sparkles size={18} className="text-accent" />,
      label: language === 'ar' ? 'اكتشف' : 'Discover',
      path: '/discover'
    });
    
  }

  if (user) {
    rawNavItems.push({ icon: <Gift size={18} />, label: t('rewards'), path: '/rewards' });
  }

  if (!isMobile && (typeof window === 'undefined' || window.innerWidth >= 768)) {
    rawNavItems.push({ 
      icon: <CreditCard size={18} />, 
      label: t('subscription'), 
      path: '/subscription',
      className: 'hidden md:flex'
    });
  }

  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;
  if (!isMobile && user && (['admin', 'support', 'elite'].includes(user.role || '') || (adminEmail && user.email === adminEmail))) {
    rawNavItems.push({ 
      icon: <LayoutDashboard size={18} />, 
      label: t('dashboard'), 
      path: '/admin',
      className: 'hidden md:flex'
    });
  }

  const navItems = rawNavItems.filter(item => !isPathBlocked(item.path, siteSettings?.blocked_paths, isMobile));

  const handleNewChat = () => {
    const isAlreadyAtNewChat = window.location.pathname === '/' || window.location.pathname === '/chat';
    
    if (isAlreadyAtNewChat) {
      window.dispatchEvent(new Event('clear-chat'));
      setIsSidebarOpen(false);
      return;
    }

    navigate('/chat');
    window.dispatchEvent(new Event('clear-chat'));
  };

  return (
    <>
      
      <motion.aside 
        initial={false}
        animate={{ 
          width: isSidebarOpen ? 180 : 50
        }}
        transition={sidebarSpring}
        className={`fixed z-[150] select-none bg-[var(--bg-base)] transition-theme flex flex-col top-[calc(56px+env(safe-area-inset-top,0px)+6px)] bottom-0 pb-safe start-0 max-h-[calc(100dvh-(56px+env(safe-area-inset-top,0px)+6px))] border-[var(--border-main)] ${
          dir === 'rtl' ? 'border-l' : 'border-r'
        } pointer-events-auto visible`}
        style={{ 
          contain: 'layout', 
          willChange: 'width',
          transform: 'none',
          WebkitBackfaceVisibility: 'visible',
          backfaceVisibility: 'visible',
          [dir === 'rtl' ? 'right' : 'left']: 0,
          [dir === 'rtl' ? 'left' : 'right']: 'auto',
          maxHeight: 'calc(100dvh - (56px + env(safe-area-inset-top, 0px) + 6px))' 
        }}
      >
        <div className="w-full h-full overflow-hidden relative flex flex-col items-stretch px-0">
          <div 
            className="h-full flex flex-col flex-nowrap justify-between"
            style={{
              width: '180px',
              minWidth: '180px',
              position: 'absolute',
              [dir === 'rtl' ? 'right' : 'left']: 0,
              top: 0,
              bottom: 0
            }}
          >
            <div className="flex-shrink-0 pt-3.5">
              <nav className="space-y-0.5">
                {navItems.map((item, index) => (
                  <NavLink
                    key={`nav-${item.path}-${index}`}
                    to={item.path}
                    onClick={() => {
                      triggerHaptic('selection');
                    }}
                  >
                    {({ isActive }) => {
                      const active = isActive;
                      return (
                        <div 
                          className={`${(item as any).className || 'flex'} items-center transition-theme w-full h-[34px] overflow-hidden flex-shrink-0 group`}
                          style={{ paddingInlineStart: '11px', paddingInlineEnd: '8px' }}
                        >
                          <div className="w-7 h-full flex-shrink-0 flex items-center justify-center relative">
                            <div className={`absolute inset-0 mx-auto w-7 h-7 rounded-[var(--radius-xs)] border border-transparent transition-theme ${
                              active ? 'bg-[var(--bg-accent-muted)] border-[var(--border-accent)]/30' : 'group-hover:bg-[var(--surface-subtle)]'
                            }`} />
                            <div className={`relative z-10 transition-theme ${
                              active 
                                ? 'text-[var(--fg-accent)]' 
                                : 'text-[var(--text-muted)] group-hover:text-[var(--fg-accent)]'
                            }`}>
                              {React.cloneElement(item.icon as React.ReactElement, { size: 15 } as any)}
                            </div>
                          </div>
                          <AnimatePresence initial={false}>
                            {isSidebarOpen && (
                              <motion.span
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{
                                  duration: isSidebarOpen ? 0.35 : 0.08,
                                  ease: [0.2, 0, 0, 1]
                                }}
                                className={`font-bold text-[12px] whitespace-nowrap overflow-hidden transition-theme ${
                                  active ? 'text-[var(--fg-accent)] font-bold' : 'text-[var(--text-muted)] group-hover:text-[var(--text-primary)]'
                                } ${dir === 'rtl' ? 'mr-1.5' : 'ml-1.5'}`}
                                style={{ display: 'inline-block' }}
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
                  <div className="mt-2 py-1 border-t border-[var(--border-main)] transition-theme">
                    <button 
                      onClick={handleNewChat}
                      className="flex items-center transition-theme w-full h-[34px] overflow-hidden flex-shrink-0 group"
                      style={{ paddingInlineStart: '11px', paddingInlineEnd: '8px' }}
                    >
                      <div className="w-7 h-full flex-shrink-0 flex items-center justify-center relative translate-y-0">
                        <div className="absolute inset-0 m-auto w-7 h-7 rounded-[var(--radius-xs)] border border-transparent transition-theme bg-[var(--bg-accent-muted)] border-[var(--border-accent)]/20 group-hover:bg-[var(--bg-accent-emphasis)]/20" />
                        <Plus size={16} className="relative z-10 transition-theme text-[var(--fg-accent)]" />
                      </div>
                      <AnimatePresence initial={false}>
                        {isSidebarOpen && (
                          <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{
                              duration: isSidebarOpen ? 0.35 : 0.08,
                              ease: [0.2, 0, 0, 1]
                            }}
                            className={`font-black text-[12px] text-accent whitespace-nowrap overflow-hidden ${dir === 'rtl' ? 'mr-1.5' : 'ml-1.5'}`}
                            style={{ display: 'inline-block' }}
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
                <div className="pt-1.5 pb-0.5 mt-0.5 h-6 border-t border-[var(--border-main)] transition-theme flex-shrink-0 flex items-center overflow-hidden">
                  <div className="w-7 flex-shrink-0" style={{ marginInlineStart: '11px' }} />
                  <AnimatePresence initial={false}>
                    {isSidebarOpen && (
                      <motion.span 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{
                          duration: isSidebarOpen ? 0.35 : 0.08,
                          ease: [0.2, 0, 0, 1]
                        }}
                        className={`flex-1 text-[9.5px] font-semibold text-gray-500 dark:text-gray-400/80 uppercase ${dir === 'rtl' ? 'tracking-normal mr-1' : 'tracking-wider ml-1'} whitespace-nowrap overflow-hidden text-start transition-theme`}
                        style={{ display: 'inline-block' }}
                      >
                        {dir === 'rtl' ? 'المحادثات السابقة' : 'Recent Chats'}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>

                <div className="flex-1 overflow-y-auto scrollbar-none custom-scrollbar scroll-smooth pb-2 min-h-0">
                  <div className="min-h-[85px]">
                    {isChatsLoading ? (
                      <SkeletonLoader 
                        type="chat-history" 
                        count={isMobile ? 3 : 5} 
                        isSidebarOpen={isSidebarOpen} 
                        isMobile={true} 
                        isRtl={dir === 'rtl'} 
                      />
                    ) : recentChats.length > 0 ? (
                      <div className="space-y-0.5">
                        {recentChats.map((chat, cIdx) => {
                          const isActive = activeChatId?.toString() === chat.id?.toString();
                          const isMenuOpen = activeOptionsMenuChatId === chat.id;
                          return (
                            <motion.div
                              key={`sidebar-chat-${chat.id || cIdx}-${cIdx}`}
                              animate={streamingChatId === chat.id ? {
                                backgroundColor: ["rgba(156,163,175,0)", "rgba(156,163,175,0.06)", "rgba(156,163,175,0)"],
                                borderColor: ["rgba(156,163,175,0)", "rgba(156,163,175,0.25)", "rgba(156,163,175,0)"]
                              } : {}}
                              transition={{
                                duration: 1.5,
                                repeat: Infinity,
                                ease: "easeInOut"
                              }}
                              className={`flex items-center w-full h-[34px] ${isMenuOpen ? 'overflow-visible z-30' : 'overflow-hidden'} flex-shrink-0 transition-theme group relative border rounded-[4px] ${
                                isActive 
                                  ? 'text-[var(--text-primary)] bg-gray-500/5 border-gray-500/15 shadow-[0_0_8px_rgba(156,163,175,0.05)]' 
                                  : 'text-gray-400 hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] border-transparent'
                              }`}
                              style={{ paddingInlineStart: '11px', paddingInlineEnd: '8px' }}
                            >
                              <div
                                onClick={() => {
                                  navigate(`/chat/${chat.id}`);
                                  if (window.innerWidth < 768) setIsSidebarOpen(false);
                                }}
                                className="flex items-center h-full flex-1 min-w-0 cursor-pointer"
                              >
                                <div className="w-7 h-full flex-shrink-0 flex items-center justify-center relative">
                                  <div className={`absolute inset-0 mx-auto w-7 h-7 rounded-[4px] transition-theme ${isActive ? 'bg-transparent' : 'group-hover:bg-[var(--bg-hover)]'}`} />
                                  <MessageSquare 
                                    size={14} 
                                    className={`relative z-10 transition-theme ${
                                      isActive 
                                        ? 'text-[var(--text-primary)]' 
                                        : streamingChatId === chat.id 
                                          ? 'text-[var(--text-primary)] animate-pulse' 
                                          : 'text-gray-400 group-hover:text-[var(--text-primary)]'
                                    }`} 
                                  />
                                </div>
                                <AnimatePresence initial={false}>
                                  {isSidebarOpen && (
                                    <motion.span
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                      exit={{ opacity: 0 }}
                                      transition={{
                                        duration: isSidebarOpen ? 0.35 : 0.08,
                                        ease: [0.2, 0, 0, 1]
                                      }}
                                      className={`font-semibold text-[11.5px] truncate whitespace-nowrap overflow-hidden text-start transition-theme ${dir === 'rtl' ? 'mr-1' : 'ml-1'} ${
                                        isActive 
                                          ? 'text-[var(--text-primary)] font-extrabold' 
                                          : streamingChatId === chat.id 
                                            ? 'text-[var(--text-primary)] font-extrabold' 
                                            : 'text-gray-400 group-hover:text-[var(--text-primary)]'
                                      }`}
                                      style={{ display: 'inline-block' }}
                                    >
                                      {chat.title}
                                    </motion.span>
                                  )}
                                </AnimatePresence>
                              </div>
                              
                              <AnimatePresence initial={false}>
                                {isSidebarOpen && (
                                  <motion.div 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{
                                      duration: isSidebarOpen ? 0.35 : 0.08,
                                      ease: [0.2, 0, 0, 1]
                                    }}
                                    className={`flex items-center gap-1 ${optionsMenuTarget?.chatId === chat.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-theme ${dir === 'rtl' ? 'mr-auto pl-1.5' : 'ml-auto pr-1.5'}`}
                                  >
                                    <button 
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (optionsMenuTarget?.chatId === chat.id) {
                                          setOptionsMenuTarget(null);
                                        } else {
                                          const rect = e.currentTarget.getBoundingClientRect();
                                          setOptionsMenuTarget({ chatId: chat.id, rect });
                                        }
                                      }}
                                      className={`w-6 h-6 flex items-center justify-center rounded-[4px] border border-transparent transition-theme ${
                                        optionsMenuTarget?.chatId === chat.id 
                                          ? 'bg-[var(--surface-subtle)] text-[var(--text-primary)]' 
                                          : 'text-gray-400 hover:text-[var(--text-primary)] hover:bg-[var(--surface-inset)]'
                                      }`}
                                      title={language === 'ar' ? 'خيارات' : 'Options'}
                                    >
                                      <MoreHorizontal size={12} />
                                    </button>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                              {/* Left or Right indicator bar for active item */}
                              {isActive && (
                                <div className={`absolute top-1/2 -translate-y-1/2 w-[3px] h-3 bg-[var(--text-primary)] ${
                                  dir === 'rtl' ? 'right-0 rounded-l-[1.5px]' : 'left-0 rounded-r-[1.5px]'
                                }`} />
                              )}
                            </motion.div>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                </div>

                {isSidebarOpen && activeChatId && (
                  <div className={`${isMobile ? 'mx-2 mb-1.5 p-2 rounded-md' : 'mx-3 mb-2 p-2.5 rounded-lg'} border border-gray-200 dark:border-gray-800 bg-[var(--surface-subtle)] flex flex-col transition-theme`}>
                    <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsContextCollapsed(!isContextCollapsed)}>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <BrainCircuit size={isMobile ? 12 : 14} className="text-[var(--text-primary)] flex-shrink-0" />
                        <span className={`${isMobile ? 'text-[9.5px]' : 'text-[11px]'} font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 truncate font-sans`}>
                          {language === 'ar' ? 'ملخص السياق النشط' : 'Context Summary'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        {!isEditingContext && (
                          <button
                            onClick={() => setIsEditingContext(true)}
                            className="w-5 h-5 flex items-center justify-center rounded-[4px] text-gray-400 hover:text-[var(--text-primary)] hover:bg-[var(--surface-inset)] transition-theme"
                            title={language === 'ar' ? 'تعديل المعرفة' : 'Edit Context'}
                          >
                            <Edit2 size={11} />
                          </button>
                        )}
                        <button
                          onClick={() => setIsContextCollapsed(!isContextCollapsed)}
                          className={`w-5 h-5 flex items-center justify-center rounded-[4px] text-gray-400 hover:text-[var(--text-primary)] hover:bg-[var(--surface-inset)] transition-theme transform ${isContextCollapsed ? 'rotate-180' : ''}`}
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
                                className="w-full h-20 text-[10.5px] font-sans p-1.5 rounded-[4px] bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-main)] focus:border-[var(--border-accent)] outline-none resize-none transition-theme"
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
                                  className="text-[10px] text-gray-400 hover:text-[var(--text-primary)] hover:bg-[var(--surface-inset)] transition-theme rounded-[4px] px-2 py-1 flex items-center gap-1"
                                >
                                  <X size={10} />
                                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                                </button>
                                <button
                                  onClick={handleSaveContext}
                                  disabled={isSavingContext}
                                  className="text-[10px] text-[var(--text-primary)] bg-[var(--bg-hover)] border border-[var(--border-main)] hover:bg-[var(--bg-secondary)] transition-theme rounded-[4px] px-2 py-1 flex items-center gap-1 font-bold"
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
                            <div className="flex flex-col gap-1 mt-1.5">
                              <div className="text-[10px] text-gray-500 dark:text-gray-400 font-sans leading-relaxed tracking-wide select-text whitespace-pre-wrap max-h-[120px] overflow-y-auto custom-scrollbar p-1.5 bg-white/40 dark:bg-black/20 border border-gray-100 dark:border-gray-800/40 rounded-[4px]">
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
                                  className="self-start text-[8.5px] font-bold text-[var(--text-primary)] hover:opacity-80 transition-theme flex items-center gap-1 mt-0.5"
                                >
                                  <Plus size={9} />
                                  {language === 'ar' ? 'إضافة ملخص يدوي' : 'Add summary manually'}
                                </button>
                              )}
                              <span className="text-[8.5px] text-gray-400 dark:text-gray-500/80 leading-snug">
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

            <div className={`mt-auto ${isMobile ? 'pt-2 pb-2 space-y-1' : 'pt-2 pb-2.5 space-y-1'} border-t border-[var(--border-main)] transition-theme flex-shrink-0 relative`} ref={dropdownRef}>
              {user ? (
                <>
                  <AnimatePresence>
                    {isDropdownOpen && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={`absolute bottom-full mb-1.5 ${isMobile ? 'w-[calc(100%-8px)]' : 'w-[calc(100%-12px)]'} bg-[var(--surface-card)] border-[var(--border-main)] border rounded-[var(--radius-md)] shadow-xl overflow-hidden z-50 ${dir === 'rtl' ? (isMobile ? 'right-1' : 'right-1.5') : (isMobile ? 'left-1' : 'left-1.5')}`}
                      >
                        <div className="p-1.5 space-y-0.5">
                          <button 
                            onClick={() => { 
                              navigate('/settings/account'); 
                              setIsDropdownOpen(false); 
                              if (isMobile) setIsSidebarOpen(false);
                            }} 
                            className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-[var(--radius-xs)] border border-transparent transition-theme text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] group/item"
                          >
                            <User size={14} className="flex-shrink-0 group-hover/item:text-[var(--text-primary)] text-[var(--text-muted)] transition-theme" />
                            <AnimatePresence mode="wait" initial={false}>
                              {isSidebarOpen && (
                                <motion.div
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  transition={sidebarTransition}
                                  className="overflow-hidden whitespace-nowrap text-start"
                                >
                                  <span className="font-bold text-xs">{t('accountSettings') || (dir === 'rtl' ? 'الحساب' : 'Account')}</span>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </button>

                          <button 
                            onClick={() => { 
                              navigate('/settings/usage'); 
                              setIsDropdownOpen(false); 
                              if (isMobile) setIsSidebarOpen(false);
                            }} 
                            className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-[var(--radius-xs)] border border-transparent transition-theme text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] group/item"
                          >
                            <Activity size={14} className="flex-shrink-0 group-hover/item:text-[var(--text-primary)] text-[var(--text-muted)] transition-theme" />
                            <AnimatePresence mode="wait" initial={false}>
                              {isSidebarOpen && (
                                <motion.div
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  transition={sidebarTransition}
                                  className="overflow-hidden whitespace-nowrap text-start"
                                >
                                  <span className="font-bold text-xs">{t('consumption') || (dir === 'rtl' ? 'الاستهلاك' : 'Consumption')}</span>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </button>

                          <div className="h-px bg-[var(--border-main)] my-0.5 mx-1 transition-theme"></div>

                          <button 
                            onClick={() => { 
                              navigate('/settings/wallet'); 
                              setIsDropdownOpen(false); 
                              if (isMobile) setIsSidebarOpen(false);
                            }} 
                            className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-[var(--radius-xs)] border border-transparent transition-theme text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] group/item"
                          >
                            <Wallet size={14} className="flex-shrink-0 group-hover/item:text-[var(--text-primary)] text-[var(--text-muted)] transition-theme" />
                            <AnimatePresence mode="wait" initial={false}>
                              {isSidebarOpen && (
                                <motion.div
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  transition={sidebarTransition}
                                  className="overflow-hidden whitespace-nowrap text-start"
                                >
                                  <span className="font-bold text-xs">{t('wallet') || (dir === 'rtl' ? 'المحفظة' : 'Wallet')}</span>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </button>

                          <button 
                            onClick={() => { 
                              navigate('/settings/memory'); 
                              setIsDropdownOpen(false); 
                              if (isMobile) setIsSidebarOpen(false);
                            }} 
                            className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-[var(--radius-xs)] border border-transparent transition-theme text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] group/item"
                          >
                            <BrainCircuit size={14} className="flex-shrink-0 group-hover/item:text-[var(--text-primary)] text-[var(--text-muted)] transition-theme" />
                            <AnimatePresence mode="wait" initial={false}>
                              {isSidebarOpen && (
                                <motion.div
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  transition={sidebarTransition}
                                  className="overflow-hidden whitespace-nowrap text-start"
                                >
                                  <span className="font-bold text-xs">{t('memoryCenter') || (dir === 'rtl' ? 'ذاكرة المساعد' : 'Memory Center')}</span>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </button>

                           <button 
                             onClick={() => { 
                               logout(); 
                               setIsDropdownOpen(false); 
                               if (isMobile) setIsSidebarOpen(false);
                             }} 
                             className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-[var(--radius-xs)] border border-transparent text-[var(--fg-danger,#ef4444)] hover:bg-[var(--surface-subtle)] transition-theme"
                           >
                            <LogOut size={14} className="flex-shrink-0" />
                            <AnimatePresence mode="wait" initial={false}>
                              {isSidebarOpen && (
                                <motion.div
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  transition={sidebarTransition}
                                  className="overflow-hidden whitespace-nowrap text-start"
                                >
                                  <span className="font-bold text-xs">{t('logout') || (dir === 'rtl' ? 'تسجيل الخروج' : 'Logout')}</span>
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
                      className="flex items-center group cursor-pointer w-full h-[36px] overflow-hidden flex-shrink-0 text-gray-400 hover:text-[var(--text-primary)] transition-theme"
                      style={{ paddingInlineStart: '11px', paddingInlineEnd: '8px' }}
                    >
                      <div className="flex items-center h-full overflow-hidden w-full relative text-[var(--text-primary)]">
                        <div className="w-7 h-[36px] flex-shrink-0 flex items-center justify-center relative">
                          <div className="absolute inset-0 mx-auto w-7 h-7 rounded-[4px] transition-theme group-hover:bg-[var(--bg-hover)] group-hover:border-[var(--border-main)]" />
                          <div 
                            className="w-7 h-7 rounded-[4px] bg-[var(--bg-surface)] flex items-center justify-center flex-shrink-0 overflow-hidden border-2 transition-theme relative z-10 group-hover:border-[var(--border-accent)] shadow-sm group-hover:scale-105"
                            style={{ 
                              borderColor: user.subscription?.plan_color || 'var(--border)'
                            }}
                          >
                            {user.avatar ? (
                              <img src={resolveImageUrl(user.avatar, 'avatar')} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <User size={15} className="text-gray-400 group-hover:text-[var(--text-primary)] transition-theme" />
                            )}
                          </div>
                          <div className={`absolute -bottom-1 left-0 right-0 flex justify-center transition-theme ${!isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                            <span 
                              className="text-[8px] font-black uppercase tracking-tighter leading-none whitespace-nowrap drop-shadow-[0_0_5px_rgba(0,0,0,0.2)]"
                              style={{ color: user.subscription?.plan_color || 'var(--text-primary)' }}
                            >
                              {user.subscription?.plan_name_en || ''}
                            </span>
                          </div>
                        </div>
                        <div className={`flex flex-col min-w-0 ${dir === 'rtl' ? 'pr-1.5' : 'pl-1.5'} justify-center`}>
                        <AnimatePresence initial={false}>
                          {isSidebarOpen && (
                            <motion.div 
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{
                                duration: isSidebarOpen ? 0.35 : 0.08,
                                ease: [0.2, 0, 0, 1]
                              }}
                              className={`flex flex-col overflow-hidden ${dir === 'rtl' ? 'text-right' : 'text-left'}`}
                            >
                              <span className="font-bold text-[11.5px] truncate whitespace-nowrap leading-tight text-[var(--text-primary)] transition-theme">{user.name}</span>
                              <span className="text-[8.5px] text-[var(--text-secondary)] truncate whitespace-nowrap uppercase tracking-widest font-black leading-tight mt-0.5">
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
                  
                  <div className="flex flex-col w-full overflow-hidden flex-shrink-0 mt-1">
                  </div>
                </>
              ) : (
                  <div 
                    className="flex items-center group cursor-pointer w-full h-[36px] overflow-hidden flex-shrink-0 text-gray-400 hover:text-[var(--text-primary)] transition-theme"
                    style={{ paddingInlineStart: '11px', paddingInlineEnd: '8px' }}
                    onClick={() => {
                      setIsAuthModalOpen(true);
                      if (isMobile) {
                        setIsSidebarOpen(false);
                      }
                    }}
                  >
                    <div className="w-7 h-[36px] flex-shrink-0 flex items-center justify-center relative">
                      <div className="absolute inset-0 mx-auto w-7 h-7 rounded-[4px] transition-theme group-hover:bg-[var(--surface-inset)]" />
                      <div className="w-7 h-7 rounded-[4px] bg-[var(--bg-surface)] flex items-center justify-center flex-shrink-0 relative z-10 transition-theme border border-transparent group-hover:border-[var(--border-accent)]">
                        <User size={15} className="text-gray-400 group-hover:text-[var(--text-primary)] transition-theme" />
                      </div>
                    </div>
                    <div className={`flex flex-col min-w-0 ${dir === 'rtl' ? 'pr-1.5' : 'pl-1.5'} justify-center`}>
                      <AnimatePresence initial={false}>
                        {isSidebarOpen && (
                          <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{
                              duration: isSidebarOpen ? 0.35 : 0.08,
                              ease: [0.2, 0, 0, 1]
                            }}
                            className={`flex flex-col overflow-hidden ${dir === 'rtl' ? 'text-right' : 'text-left'}`}
                          >
                            <span className="text-[9px] text-gray-500 truncate whitespace-nowrap font-bold uppercase tracking-wider mb-0.5">{t('createAccount')}</span>
                            <span className="font-bold text-xs truncate whitespace-nowrap text-gray-400 group-hover:text-[var(--text-primary)] transition-theme">{t('login')}</span>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
              )}
              

              
              <div className="flex flex-col w-full h-3 px-1.5 mt-0.5 overflow-hidden flex-shrink-0 relative">
                <AnimatePresence initial={false}>
                  {isSidebarOpen && (
                    <motion.div 
                      key="legal-footer"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{
                        duration: isSidebarOpen ? 0.35 : 0.08,
                        ease: [0.2, 0, 0, 1]
                      }}
                      className="flex items-center justify-between opacity-40 hover:opacity-100 transition-theme pointer-events-auto w-full overflow-hidden"
                    >
                      <NavLink to="/terms" className="text-[6.5px] font-bold text-gray-500 hover:text-[var(--text-primary)] transition-theme whitespace-nowrap">
                        {t('termsOfUse')}
                      </NavLink>
                      <span className="w-0.5 h-0.5 rounded-[1px] bg-gray-400/40 flex-shrink-0" />
                      <NavLink to="/privacy" className="text-[6.5px] font-bold text-gray-500 hover:text-[var(--text-primary)] transition-theme whitespace-nowrap">
                        {t('privacyPolicy')}
                      </NavLink>
                      <span className="w-0.5 h-0.5 rounded-[1px] bg-gray-400/40 flex-shrink-0" />
                      <NavLink to="/about" className="text-[6.5px] font-bold text-gray-500 hover:text-[var(--text-primary)] transition-theme whitespace-nowrap">
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

      {isSidebarOpen && isMobile && (
        <div
          className="fixed inset-0 z-[149] bg-transparent"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Dynamic Professional Delete Confirmation Modal - Elite custom styling matching Image 2 */}
      <AnimatePresence>
        {deletingChatConfirmId && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeletingChatConfirmId(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            {/* Content Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative max-w-sm w-full p-6 rounded-[var(--radius-lg)] border border-[var(--border-main)] bg-[var(--surface-card)] text-[var(--text-primary)] shadow-2xl transition-theme z-10"
            >
              <h3 className="text-base font-bold tracking-tight font-sans text-start text-[var(--text-primary)]">
                {language === 'ar' ? 'حذف الجلسة؟' : 'Delete session?'}
              </h3>
              
              <p className="text-xs mt-2 font-sans text-start text-[var(--text-muted)]">
                {language === 'ar' ? 'سيؤدي هذا إلى حذف الجلسة نهائيًا:' : 'This will permanently delete the session:'}
              </p>
              
              <div className="mt-3 p-3 rounded-[var(--radius-sm)] text-xs font-bold leading-relaxed break-all text-start border border-[var(--border-main)] bg-[var(--surface-subtle)] text-[var(--text-primary)]">
                {deletingChatTitle}
              </div>
              
              <div className={`flex justify-end gap-2.5 mt-6 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                <button
                  type="button"
                  onClick={() => setDeletingChatConfirmId(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-[var(--radius-xs)] font-sans transition-theme text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)]"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                
                <button
                  type="button"
                  onClick={async (e) => {
                    await handleDelete(e, deletingChatConfirmId);
                    setDeletingChatConfirmId(null);
                  }}
                  className="px-4 py-2 text-xs font-bold bg-[var(--bg-danger-emphasis)] hover:opacity-90 text-[var(--fg-on-emphasis)] rounded-[var(--radius-xs)] font-sans transition-theme shadow-xs"
                >
                  {language === 'ar' ? 'حذف' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Dynamic Professional Rename Modal - Elite custom styling matching the delete design */}
      <AnimatePresence>
        {editingChatId && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingChatId(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            {/* Content Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative max-w-sm w-full p-6 rounded-[var(--radius-lg)] border border-[var(--border-main)] bg-[var(--surface-card)] text-[var(--text-primary)] shadow-2xl transition-theme z-10"
            >
              <h3 className="text-base font-bold tracking-tight font-sans text-start text-[var(--text-primary)]">
                {language === 'ar' ? 'إعادة تسمية الجلسة؟' : 'Rename session?'}
              </h3>
              
              <p className="text-xs mt-2 font-sans text-start text-[var(--text-muted)]">
                {language === 'ar' ? 'أدخل الاسماً الجديداً للجلسة:' : 'Please enter a new name for this session:'}
              </p>
              
              <div className="mt-4">
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter' && newTitle.trim()) {
                      await handleRename(editingChatId);
                    }
                    if (e.key === 'Escape') setEditingChatId(null);
                  }}
                  className="w-full px-3 py-2 text-xs font-semibold leading-relaxed text-start border border-[var(--border-main)] rounded-[var(--radius-sm)] bg-[var(--surface-subtle)] text-[var(--text-primary)] focus:border-[var(--border-accent)] outline-none transition-theme"
                  autoFocus
                  placeholder={language === 'ar' ? 'اسم الجلسة...' : 'Session name...'}
                />
              </div>
              
              <div className={`flex justify-end gap-2.5 mt-6 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                <button
                  type="button"
                  onClick={() => setEditingChatId(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-[var(--radius-xs)] font-sans transition-theme text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)]"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                
                <button
                  type="button"
                  disabled={!newTitle.trim()}
                  onClick={async () => {
                    if (newTitle.trim()) {
                      await handleRename(editingChatId);
                    }
                  }}
                  className="px-4 py-2 text-xs font-bold bg-[var(--bg-accent-emphasis)] hover:opacity-90 disabled:opacity-50 text-[var(--fg-on-emphasis)] rounded-[var(--radius-xs)] font-sans transition-theme shadow-xs"
                >
                  {language === 'ar' ? 'حفظ' : 'Save'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <FloatingPopover
        isOpen={!!optionsMenuTarget}
        onClose={() => setOptionsMenuTarget(null)}
        triggerRect={optionsMenuTarget?.rect || null}
        direction={dir}
        placement="outward-sidebar"
        width={145}
      >
        {optionsMenuTarget && (
          <div className="flex flex-col gap-0.5 p-0.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const targetChat = recentChats.find((c: any) => c.id?.toString() === optionsMenuTarget.chatId?.toString());
                if (targetChat) {
                  setEditingChatId(targetChat.id);
                  setNewTitle(targetChat.title);
                }
                setOptionsMenuTarget(null);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-lg font-sans transition-theme text-start font-medium cursor-pointer ${
                theme === 'dark' 
                  ? 'text-gray-200 hover:bg-[var(--surface-inset)] hover:text-white' 
                  : 'text-gray-700 hover:bg-[var(--surface-inset)] hover:text-black'
              }`}
            >
              <Edit2 size={13} className="text-gray-400" />
              <span>{language === 'ar' ? 'إعادة تسمية' : 'Rename'}</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setDeletingChatConfirmId(optionsMenuTarget.chatId);
                setOptionsMenuTarget(null);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-lg font-sans transition-theme text-start font-medium text-[var(--fg-danger,#ef4444)] hover:bg-[var(--surface-inset)] active:scale-95 cursor-pointer"
            >
              <Trash2 size={13} className="text-[var(--fg-danger,#ef4444)]" />
              <span>{language === 'ar' ? 'حذف' : 'Delete'}</span>
            </button>
          </div>
        )}
      </FloatingPopover>
    </>
  );
};

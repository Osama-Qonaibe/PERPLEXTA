import React, { useEffect, useState, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { Gift, CreditCard, LayoutDashboard, Plus, Settings, User, PanelRightClose, PanelLeftClose, LogOut, MessageSquare, Trash2, Edit2, Check, X, Settings2, Palette, Keyboard, Wallet, Link2, BrainCircuit, ChevronLeft, ChevronRight, Download, Loader2, Smartphone, Activity } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { PERPLEXTA_TRANSITION } from '../constants/motions';
const sidebarTransition = PERPLEXTA_TRANSITION;
const sidebarSpring = PERPLEXTA_TRANSITION;
const elasticSpring = PERPLEXTA_TRANSITION;

export const Sidebar: React.FC<{ activeLanguage?: string }> = ({ activeLanguage }) => {
  const { t, theme, dir: globalDir, language: globalLang, isSidebarOpen, setIsSidebarOpen, user, logout, setIsAuthModalOpen, siteSettings, token, plans, isMobile, isInstallable, installApp, isInstalling } = useAppContext();
  
  // Use locked language for stable transitions
  const language = activeLanguage || globalLang;
  const dir = language === 'ar' ? 'rtl' : 'ltr';

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [recentChats, setRecentChats] = useState<any[]>([]);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const navigate = useNavigate();

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
    if (!token || token === 'null') return;
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
        // Just ignore, session likely ended
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
      navigate('/');
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
    window.addEventListener('chat-created', fetchChats);
    window.addEventListener('chat-updated', fetchChats);
    return () => {
      window.removeEventListener('chat-created', fetchChats);
      window.removeEventListener('chat-updated', fetchChats);
    };
  }, [token]);

  useEffect(() => {
    // Perplexta: The sidebar state is preserved regardless of window dimensions to ensure 
    // a consistent, professional, and user-centric experience. Auto-closing on resize 
    // was considered intrusive by the elite technical segment.
    return () => {};
  }, []);

  const navItems: { icon: React.ReactNode, label: string, path: string, className?: string }[] = [];

  if (!isMobile) {
    navItems.push({ icon: <CreditCard size={18} />, label: t('subscription'), path: '/subscription' });
  }

  if (user) {
    navItems.unshift({ icon: <Gift size={18} />, label: t('rewards'), path: '/rewards' });
  }

  if (isInstallable) {
    navItems.push({ 
      icon: <Smartphone size={18} />, 
      label: language === 'ar' ? 'تثبيت التطبيق' : 'Install App', 
      path: '#' 
    });
  }

  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;
  if (user && (['admin', 'support', 'elite'].includes(user.role || '') || (adminEmail && user.email === adminEmail))) {
    navItems.push({ 
      icon: <LayoutDashboard size={18} />, 
      label: t('dashboard'), 
      path: '/admin',
      className: 'hidden md:flex'
    });
  }

  const handleNewChat = () => {
    const isAlreadyAtNewChat = window.location.pathname === '/';
    
    if (isAlreadyAtNewChat) {
      // Perplexta: Silent fail if already at base. No movement allowed.
      if (isMobile) setIsSidebarOpen(false);
      return;
    }

    navigate('/');
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
          width: isMobile ? (isSidebarOpen ? '280px' : 0) : (isSidebarOpen ? 220 : 80),
          x: isMobile && !isSidebarOpen ? (dir === 'rtl' ? 300 : -300) : 0,
          opacity: isMobile && !isSidebarOpen ? 0 : 1
        }}
        transition={{ 
          ...sidebarSpring
        }}
        className={`fixed ${isMobile ? 'top-0' : 'top-[72px]'} bottom-0 flex flex-col z-[150] select-none border-[var(--border)] bg-[var(--bg-base)] start-0 ${dir === 'rtl' ? 'border-l' : 'border-r'} transition-theme ${
          isMobile && !isSidebarOpen ? 'pointer-events-none' : 'visible'
        }`}
        style={{ contain: 'layout' }}
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
          <div className={`h-full flex flex-col flex-nowrap ${isMobile ? 'w-full' : 'w-[220px]'} justify-between`}>
            
            {/* 1. FIXED HEADER - Navigation list */}
            <div className="flex-shrink-0 pt-6">
              <nav className={isMobile ? "space-y-3" : "space-y-1"}>
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
                    className="w-full flex"
                  >
                    {({ isActive }) => {
                      const active = isActive && item.path !== '#';
                      return (
                        <div className={`${(item as any).className || 'flex'} items-center transition-all duration-300 w-full ${isMobile ? 'h-13' : 'h-11'} overflow-hidden flex-shrink-0 group`}>
                          <div className={`${isMobile ? 'w-16' : 'w-[80px]'} h-full flex-shrink-0 flex items-center justify-center relative`}>
                            <div className={`absolute inset-0 mx-auto w-10 h-10 rounded-[4px] border border-transparent transition-all duration-300 ${
                              active ? 'bg-emerald-500/10 border-emerald-500/20' : 'group-hover:bg-gray-50 dark:group-hover:bg-gray-800'
                            }`} />
                            <div className={`relative z-10 transition-all duration-300 ${
                              active 
                                ? 'text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]' 
                                : 'text-gray-400 group-hover:text-emerald-500 group-hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]'
                            }`}>
                              {React.cloneElement(item.icon as React.ReactElement, { size: isMobile ? 20 : 18 } as any)}
                            </div>
                          </div>
                          <AnimatePresence mode="wait" initial={false}>
                            {isSidebarOpen && (
                              <motion.span
                                initial={false}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: dir === 'rtl' ? 10 : -10 }}
                                transition={PERPLEXTA_TRANSITION}
                                className={`font-bold text-sm whitespace-nowrap transition-all duration-300 ${
                                  active ? 'text-emerald-500 font-bold' : 'text-gray-400 group-hover:text-emerald-500'
                                } ${dir === 'rtl' ? 'mr-1' : 'ml-1'}`}
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


                <div className={`mt-4 py-2 border-t border-[var(--border-main)] transition-theme`}>
                  <button 
                    onClick={handleNewChat}
                    className={`flex items-center transition-all duration-300 w-full ${isMobile ? 'h-13' : 'h-11'} overflow-hidden flex-shrink-0 group`}
                  >
                    <div className={`${isMobile ? 'w-16' : 'w-[80px]'} h-full flex-shrink-0 flex items-center justify-center relative translate-y-0`}>
                      <div className={`absolute inset-0 m-auto w-10 h-10 rounded-[4px] border border-transparent transition-all duration-300 bg-emerald-500/5 border-emerald-500/10 group-hover:bg-emerald-500/15 group-hover:border-emerald-500/20`} />
                      <Plus size={isMobile ? 22 : 20} className={`relative z-10 transition-all duration-300 text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]`} />
                    </div>
                    <AnimatePresence mode="wait" initial={false}>
                      {isSidebarOpen && (
                        <motion.span
                          initial={false}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: dir === 'rtl' ? 10 : -10 }}
                          transition={PERPLEXTA_TRANSITION}
                          className={`font-black ${isMobile ? 'text-base' : 'text-sm'} text-emerald-500 whitespace-nowrap`}
                        >
                          {t('newChat')}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </button>
                </div>
              </nav>
            </div>

            {/* 2. DYNAMIC SCROLLABLE CONTENT - Recent Chats list */}
            <div className="flex-grow flex-shrink flex-1 min-h-0 flex flex-col overflow-hidden">
              <div className={`pt-2 mt-2 border-t border-[var(--border-main)] transition-theme flex-shrink-0 flex items-center h-8 overflow-hidden`}>
                <div className="w-[80px] flex-shrink-0" />
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
                  {recentChats.length > 0 && (
                    <div className={isMobile ? "space-y-3" : "space-y-1"}>
                        {recentChats.map((chat) => (
                      <div
                        key={chat.id}
                        className={`flex items-center w-full ${isMobile ? 'h-13' : 'h-11'} overflow-hidden flex-shrink-0 text-gray-400 hover:text-emerald-500 transition-all duration-300 group relative`}
                      >
                        {editingChatId === chat.id ? (
                          <div className="flex items-center w-full h-full pr-2">
                            <div className={`${isMobile ? 'w-16' : 'w-[80px]'} h-full flex-shrink-0 flex items-center justify-center relative`}>
                                <div className={`absolute inset-0 mx-auto w-10 h-10 rounded-[4px] bg-[var(--bg-overlay)] transition-all duration-300`} />
                              <MessageSquare size={isMobile ? 18 : 16} className="text-emerald-500 relative z-10" />
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
                                className={`bg-[var(--bg-input)] text-[var(--text-primary)] ${isMobile ? 'text-sm px-3 py-2' : 'text-xs px-2 py-1'} rounded w-full outline-none border border-[var(--border-accent)] min-w-0 transition-theme`}
                                autoFocus
                              />
                              <div className="flex items-center">
                                <button 
                                  onClick={() => handleRename(chat.id)}
                                  className={`p-1.5 text-emerald-500 hover:text-emerald-400 transition-theme`}
                                  title={t('save')}
                                >
                                  <Check size={isMobile ? 18 : 14} />
                                </button>
                                <button 
                                  onClick={() => setEditingChatId(null)}
                                  className={`p-1.5 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-theme`}
                                  title={t('cancel')}
                                >
                                  <X size={isMobile ? 18 : 14} />
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
                              <div className={`${isMobile ? 'w-16' : 'w-[80px]'} h-full flex-shrink-0 flex items-center justify-center relative`}>
                                <div className={`absolute inset-0 mx-auto w-10 h-10 rounded-[4px] transition-all duration-300 group-hover:bg-gray-50 dark:group-hover:bg-gray-800`} />
                                <MessageSquare size={isMobile ? 18 : 16} className="relative z-10 text-gray-400 transition-all duration-300 group-hover:text-emerald-500 group-hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                              </div>
                              <AnimatePresence mode="wait" initial={false}>
                                {isSidebarOpen && (
                                  <motion.span
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={PERPLEXTA_TRANSITION}
                                    className={`font-semibold ${isMobile ? 'text-sm' : 'text-[13px]'} truncate whitespace-nowrap text-start transition-theme ${dir === 'rtl' ? 'mr-1' : 'ml-1'} text-gray-400 group-hover:text-emerald-500 group-hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]`}
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
                                  className={`flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 ${dir === 'rtl' ? 'mr-auto pl-4' : 'ml-auto pr-4'}`}
                                >
                                  <button 
                                    onClick={() => { setEditingChatId(chat.id); setNewTitle(chat.title); }}
                                    className="w-8 h-8 flex items-center justify-center rounded-[4px] text-gray-400 hover:text-emerald-500 hover:bg-gray-50 dark:hover:bg-gray-800 hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)] transition-all duration-300"
                                  >
                                    <Edit2 size={isMobile ? 16 : 13} />
                                  </button>
                                  <button 
                                    type="button"
                                    onClick={(e) => handleDelete(e, chat.id)}
                                    className="w-8 h-8 flex items-center justify-center rounded-[4px] text-gray-400 hover:text-pink-500 hover:bg-pink-500/10 transition-all duration-300"
                                  >
                                    <Trash2 size={isMobile ? 16 : 13} />
                                  </button>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                  )}
                </div>
              </div>
            </div>

            {/* 3. FIXED FOOTER - User identity or action dropdown & legal info */}
            <div className={`mt-auto pt-4 pb-5 border-t border-[var(--border-main)] transition-theme ${isMobile ? 'space-y-3' : 'space-y-1'} flex-shrink-0 relative`} ref={dropdownRef}>
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
                        <div className={`p-2 ${isMobile ? 'space-y-2' : 'space-y-1'}`}>
                          {/* Account Settings Tab */}
                          <button 
                            onClick={() => { navigate('/settings?tab=account'); setIsDropdownOpen(false); }} 
                            className={`w-full flex items-center gap-3 ${isMobile ? 'px-4 py-3' : 'px-3 py-2.5'} rounded-[4px] border border-transparent transition-all duration-300 text-gray-400 hover:text-emerald-500 hover:bg-gray-50 dark:hover:bg-gray-800 group/item`}
                          >
                            <User size={isMobile ? 18 : 16} className="flex-shrink-0 group-hover/item:text-emerald-500 group-hover/item:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)] text-gray-400 transition-all duration-300" />
                            <AnimatePresence mode="wait" initial={false}>
                              {isSidebarOpen && (
                                <motion.div
                                  initial={{ opacity: 0, x: dir === 'rtl' ? 10 : -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  exit={{ opacity: 0, x: dir === 'rtl' ? 10 : -10 }}
                                  transition={elasticSpring}
                                  className="overflow-hidden whitespace-nowrap text-start"
                                >
                                  <span className={`font-bold ${isMobile ? 'text-base' : 'text-sm'}`}>{t('accountSettings') || (dir === 'rtl' ? 'الحساب' : 'Account')}</span>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </button>

                          {/* Consumption/Usage Tab */}
                          <button 
                            onClick={() => { navigate('/settings?tab=usage'); setIsDropdownOpen(false); }} 
                            className={`w-full flex items-center gap-3 ${isMobile ? 'px-4 py-3' : 'px-3 py-2.5'} rounded-[4px] border border-transparent transition-all duration-300 text-gray-400 hover:text-emerald-500 hover:bg-gray-50 dark:hover:bg-gray-800 group/item`}
                          >
                            <Activity size={isMobile ? 18 : 16} className="flex-shrink-0 group-hover/item:text-emerald-500 group-hover/item:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)] text-gray-400 transition-all duration-300" />
                            <AnimatePresence mode="wait" initial={false}>
                              {isSidebarOpen && (
                                <motion.div
                                  initial={{ opacity: 0, x: dir === 'rtl' ? 10 : -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  exit={{ opacity: 0, x: dir === 'rtl' ? 10 : -10 }}
                                  transition={elasticSpring}
                                  className="overflow-hidden whitespace-nowrap text-start"
                                >
                                  <span className={`font-bold ${isMobile ? 'text-base' : 'text-sm'}`}>{t('consumption') || (dir === 'rtl' ? 'الاستهلاك' : 'Consumption')}</span>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </button>

                          <div className={`h-px bg-[var(--border)] my-1 mx-2 transition-theme`}></div>

                          {/* Wallet Tab */}
                          <button 
                            onClick={() => { navigate('/settings?tab=wallet'); setIsDropdownOpen(false); }} 
                            className={`w-full flex items-center gap-3 ${isMobile ? 'px-4 py-3' : 'px-3 py-2.5'} rounded-[4px] border border-transparent transition-all duration-300 text-gray-400 hover:text-emerald-500 hover:bg-gray-50 dark:hover:bg-gray-800 group/item`}
                          >
                            <Wallet size={isMobile ? 18 : 16} className="flex-shrink-0 group-hover/item:text-emerald-500 group-hover/item:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)] text-gray-400 transition-all duration-300" />
                            <AnimatePresence mode="wait" initial={false}>
                              {isSidebarOpen && (
                                <motion.div
                                  initial={{ opacity: 0, x: dir === 'rtl' ? 10 : -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  exit={{ opacity: 0, x: dir === 'rtl' ? 10 : -10 }}
                                  transition={elasticSpring}
                                  className="overflow-hidden whitespace-nowrap text-start"
                                >
                                  <span className={`font-bold ${isMobile ? 'text-base' : 'text-sm'}`}>{t('wallet') || (dir === 'rtl' ? 'المحفظة' : 'Wallet')}</span>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </button>

                          {/* Memory Center Tab */}
                          <button 
                            onClick={() => { navigate('/settings?tab=memory'); setIsDropdownOpen(false); }} 
                            className={`w-full flex items-center gap-3 ${isMobile ? 'px-4 py-3' : 'px-3 py-2.5'} rounded-[4px] border border-transparent transition-all duration-300 text-gray-400 hover:text-emerald-500 hover:bg-gray-50 dark:hover:bg-gray-850 group/item`}
                          >
                            <BrainCircuit size={isMobile ? 18 : 16} className="flex-shrink-0 group-hover/item:text-emerald-500 group-hover/item:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)] text-gray-400 transition-all duration-300" />
                            <AnimatePresence mode="wait" initial={false}>
                              {isSidebarOpen && (
                                <motion.div
                                  initial={{ opacity: 0, x: dir === 'rtl' ? 10 : -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  exit={{ opacity: 0, x: dir === 'rtl' ? 10 : -10 }}
                                  transition={elasticSpring}
                                  className="overflow-hidden whitespace-nowrap text-start"
                                >
                                  <span className={`font-bold ${isMobile ? 'text-base' : 'text-sm'}`}>{t('memoryCenter') || (dir === 'rtl' ? 'ذاكرة المساعد' : 'Memory Center')}</span>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </button>

                           <button 
                             onClick={() => { logout(); setIsDropdownOpen(false); }} 
                             className={`w-full flex items-center gap-3 ${isMobile ? 'px-4 py-3' : 'px-3 py-2.5'} rounded-[4px] border border-transparent text-gray-400 hover:text-pink-500 hover:bg-pink-500/10 transition-all duration-300`}
                           >
                            <LogOut size={isMobile ? 18 : 16} className="flex-shrink-0" />
                            <AnimatePresence mode="wait" initial={false}>
                              {isSidebarOpen && (
                                <motion.div
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  transition={PERPLEXTA_TRANSITION}
                                  className="overflow-hidden whitespace-nowrap text-start"
                                >
                                  <span className={`font-bold ${isMobile ? 'text-base' : 'text-sm'}`}>{t('logout') || (dir === 'rtl' ? 'تسجيل الخروج' : 'Logout')}</span>
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
                      className={`flex items-center group cursor-pointer w-full ${isMobile ? 'h-13' : 'h-[44px]'} overflow-hidden flex-shrink-0 text-gray-400 hover:text-emerald-500 transition-all duration-300`}
                    >
                      <div className="flex items-center h-full overflow-hidden w-full relative text-[var(--text-primary)]">
                        <div className={`${isMobile ? 'w-16' : 'w-[80px]'} ${isMobile ? 'h-13' : 'h-[44px]'} flex-shrink-0 flex items-center justify-center relative`}>
                          <div className={`absolute inset-0 mx-auto w-10 h-10 rounded-[4px] transition-all duration-300 group-hover:bg-emerald-500/5 group-hover:border-emerald-500/20`} />
                          <div 
                            className={`w-10 h-10 rounded-[4px] bg-[var(--bg-surface)] flex items-center justify-center flex-shrink-0 overflow-hidden border-2 transition-all duration-300 relative z-10 group-hover:border-emerald-500/50 shadow-[0_0_15px_rgba(0,0,0,0.1)] group-hover:shadow-[0_0_25px_rgba(16,185,129,0.35)] group-hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.4)] group-hover:scale-105`}
                            style={{ 
                              borderColor: user.subscription?.plan_color || 'var(--border)'
                            }}
                          >
                            {user.avatar ? (
                              <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <User size={isMobile ? 22 : 20} className="text-gray-400 group-hover:text-emerald-500 transition-all duration-300 group-hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
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
                              transition={PERPLEXTA_TRANSITION}
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
                    className={`flex items-center group cursor-pointer w-full h-[44px] overflow-hidden flex-shrink-0 text-gray-400 hover:text-emerald-500 transition-all duration-300`}
                    onClick={() => setIsAuthModalOpen(true)}
                  >
                    <div className={`${isMobile ? 'w-14' : 'w-[80px]'} h-[44px] flex-shrink-0 flex items-center justify-center relative`}>
                      <div className={`absolute inset-0 mx-auto w-10 h-10 rounded-[4px] transition-all duration-300 group-hover:bg-gray-50 dark:group-hover:bg-gray-800`} />
                      <div className={`w-10 h-10 rounded-[4px] bg-[var(--bg-surface)] flex items-center justify-center flex-shrink-0 relative z-10 transition-all duration-300 border border-transparent group-hover:border-emerald-500/30 group-hover:shadow-[0_0_15px_rgba(16,185,129,0.2)]`}>
                        <User size={18} className="text-gray-400 group-hover:text-emerald-500 transition-all duration-300 group-hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                      </div>
                    </div>
                    <div className={`flex flex-col min-w-0 ${dir === 'rtl' ? 'pr-2' : 'pl-2'} justify-center`}>
                      <AnimatePresence mode="wait">
                        {isSidebarOpen && (
                          <motion.div 
                            initial={{ opacity: 0, x: dir === 'rtl' ? 8 : -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: dir === 'rtl' ? 8 : -8 }}
                            transition={PERPLEXTA_TRANSITION}
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
              
              {/* Legal Info links */}
              <div className="flex flex-col w-full h-4 overflow-hidden flex-shrink-0 mt-2 px-6 relative">
                <AnimatePresence mode="wait">
                  {isSidebarOpen && (
                    <motion.div 
                      key="legal-footer"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={PERPLEXTA_TRANSITION}
                      className="flex items-center justify-between gap-1 opacity-35 hover:opacity-100 transition-all duration-300 pointer-events-auto"
                    >
                      <NavLink to="/terms" className={`${isMobile ? 'text-[9px]' : 'text-[6.5px]'} font-black text-gray-500 hover:text-emerald-500 transition-all duration-300 uppercase tracking-[0.08em] whitespace-nowrap`}>
                        {t('termsOfUse')}
                      </NavLink>
                      <span className="w-0.5 h-0.5 rounded-full bg-[var(--border)] flex-shrink-0" />
                      <NavLink to="/privacy" className={`${isMobile ? 'text-[9px]' : 'text-[6.5px]'} font-black text-gray-500 hover:text-emerald-500 transition-all duration-300 uppercase tracking-[0.08em] whitespace-nowrap`}>
                        {t('privacyPolicy')}
                      </NavLink>
                      <span className="w-0.5 h-0.5 rounded-full bg-[var(--border)] flex-shrink-0" />
                      <NavLink to="/about" className={`${isMobile ? 'text-[9px]' : 'text-[6.5px]'} font-black text-gray-500 hover:text-emerald-500 transition-all duration-300 uppercase tracking-[0.08em] whitespace-nowrap`}>
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
    </>
  );
};


import React, { useEffect, useState, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { Gift, CreditCard, LayoutDashboard, Plus, Settings, User, PanelRightClose, PanelLeftClose, LogOut, MessageSquare, Trash2, Edit2, Check, X, Settings2, Palette, Keyboard, Wallet, Link2, BrainCircuit, ChevronLeft, ChevronRight, Download, Loader2, Smartphone } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { PWAInstall } from './PWAInstall'; 
const springConfig = { type: "spring" as const, stiffness: 300, damping: 30 };
const sidebarSpring = { type: "tween" as const, duration: 0.8, ease: [0.4, 0, 0.2, 1] as any };
const elasticSpring = { type: "tween" as const, duration: 0.2, ease: "easeOut" as const };

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
    // Sovereign: The sidebar state is preserved regardless of window dimensions to ensure 
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
          width: isMobile ? (isSidebarOpen ? '280px' : 0) : (isSidebarOpen ? 220 : 80),
          x: isMobile && !isSidebarOpen ? (dir === 'rtl' ? 300 : -300) : 0,
          opacity: isMobile && !isSidebarOpen ? 0 : 1
        }}
        transition={{ 
          ...sidebarSpring
        }}
        className={`fixed ${isMobile ? 'top-0' : 'top-[72px]'} bottom-0 flex flex-col z-[150] select-none border-[var(--border-main)] bg-[var(--bg-primary)] start-0 ${dir === 'rtl' ? 'border-l' : 'border-r'} ${
          isMobile && !isSidebarOpen ? 'pointer-events-none' : 'visible'
        }`}
        style={{ contain: 'layout' }}
      >
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
          className={`absolute top-0 ${dir === 'rtl' ? '-left-4' : '-right-4'} z-[170] flex items-center justify-center transition-all active:scale-90 group -translate-y-1/2 w-8 h-8
            ${isMobile ? 'hidden' : 'flex'}
          `}
          title={isSidebarOpen ? (language === 'ar' ? 'تصغير' : 'Collapse') : (language === 'ar' ? 'توسيع' : 'Expand')}
        >
          <div className="text-gray-400/80 transition-all duration-300 group-hover:text-emerald-500 group-hover:drop-shadow-[0_0_12px_rgba(16,185,129,0.8)]">
            {isSidebarOpen ? (
              dir === 'rtl' ? <ChevronRight size={22} strokeWidth={2.5} /> : <ChevronLeft size={22} strokeWidth={2.5} />
            ) : (
              dir === 'rtl' ? <ChevronLeft size={22} strokeWidth={2.5} /> : <ChevronRight size={22} strokeWidth={2.5} />
            )}
          </div>
        </button>

        <div className="w-full h-full overflow-hidden relative flex flex-col items-start px-0 pt-[25px]">
          <div className={`h-full flex flex-col flex-shrink-0 ${isMobile ? 'w-full' : 'w-[220px]'}`}>
            <div className="flex-shrink-0">
              <nav className="space-y-1">
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
                    className={({ isActive }) =>
                      `${(item as any).className || 'flex'} items-center transition-all duration-300 w-full h-11 overflow-hidden flex-shrink-0 ${
                        isActive && item.path !== '#'
                          ? 'text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]'
                          : 'text-[var(--text-secondary)]'
                      } ${dir === 'rtl' ? 'flex-row' : 'flex-row'}`
                    }
                  >
                    <div className={`${isMobile ? 'w-14' : 'w-[80px]'} h-full flex-shrink-0 flex items-center justify-center relative group`}>
                      <div className={`absolute inset-0 mx-auto w-10 h-10 rounded-[4px] transition-all duration-300 group-hover:bg-emerald-500/5 group-hover:border-emerald-500/20`} />
                      <div className="relative z-10 transition-all duration-300 group-hover:text-emerald-500 group-hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]">
                        {React.cloneElement(item.icon as React.ReactElement, { size: 18 } as any)}
                      </div>
                    </div>
                    <AnimatePresence mode="wait" initial={false}>
                      {isSidebarOpen && (
                        <motion.span
                          initial={false}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: dir === 'rtl' ? 10 : -10 }}
                          transition={{ duration: 0.2 }}
                          className={`font-medium text-sm whitespace-nowrap text-[var(--text-secondary)] ${dir === 'rtl' ? 'mr-1' : 'ml-1'}`}
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </NavLink>
                ))}


                <div className={`mt-4 py-2 border-t border-[var(--border-main)]`}>
                  <button 
                    onClick={handleNewChat}
                    className="flex items-center transition-all duration-300 w-full h-11 overflow-hidden flex-shrink-0 group"
                  >
                    <div className={`${isMobile ? 'w-14' : 'w-[80px]'} h-full flex-shrink-0 flex items-center justify-center relative`}>
                      <div className={`absolute top-[3px] left-0 right-0 mx-auto w-10 h-10 rounded-[4px] transition-all duration-300 bg-emerald-500/5 border border-emerald-500/10 group-hover:bg-emerald-500/15`} />
                      <Plus size={20} className={`relative z-10 translate-y-[1px] group-hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.5)] transition-all duration-300 text-emerald-500`} />
                    </div>
                    <AnimatePresence mode="wait" initial={false}>
                      {isSidebarOpen && (
                        <motion.span
                          initial={false}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: dir === 'rtl' ? 10 : -10 }}
                          transition={{ duration: 0.2 }}
                          className="font-bold text-sm text-emerald-500 whitespace-nowrap"
                        >
                          {t('newChat')}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </button>
                </div>
              </nav>
              
              <div className={`pt-2 mt-2 border-t border-[var(--border-main)] flex-shrink-0 flex items-center h-8 overflow-hidden`}>
                <div className="w-[80px] flex-shrink-0" />
                <AnimatePresence initial={false}>
                  {isSidebarOpen && (
                    <motion.h3 
                      initial={false}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={elasticSpring}
                      className="flex-1 text-[10px] font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap truncate text-start"
                    >
                      {dir === 'rtl' ? 'المحادثات السابقة' : 'Recent Chats'}
                    </motion.h3>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="flex-1 relative overflow-hidden flex flex-col">
              <div className="flex-1 overflow-y-auto scrollbar-none custom-scrollbar scroll-smooth pb-4 min-h-0">
                <div className="min-h-[200px]">
                  {recentChats.length > 0 && (
                    <div className="space-y-1">
                    {recentChats.map((chat) => (
                      <div
                        key={chat.id}
                        className={`flex items-center w-full h-11 overflow-hidden flex-shrink-0 ${
                          theme === 'dark' 
                            ? 'text-gray-400 hover:text-white' 
                            : 'text-gray-500 hover:text-gray-900'
                        } group relative`}
                      >
                        {editingChatId === chat.id ? (
                          <div className="flex items-center w-full h-full pr-2">
                            <div className="w-[80px] h-full flex-shrink-0 flex items-center justify-center relative">
                               <div className={`absolute inset-0 mx-auto w-10 h-10 rounded-[4px] ${
                                 theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-50'
                               }`} />
                              <MessageSquare size={16} className="text-emerald-500 relative z-10" />
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
                                className="bg-gray-800 text-white text-xs px-2 py-1 rounded w-full outline-none border border-emerald-500/30 min-w-0"
                                autoFocus
                              />
                              <div className="flex items-center">
                                <button 
                                  onClick={() => handleRename(chat.id)}
                                  className="p-1 text-emerald-500 hover:text-emerald-400 transition-colors"
                                  title={t('save')}
                                >
                                  <Check size={14} />
                                </button>
                                <button 
                                  onClick={() => setEditingChatId(null)}
                                  className="p-1 text-gray-500 hover:text-gray-400 transition-colors"
                                  title={t('cancel')}
                                >
                                  <X size={14} />
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
                              <div className="w-[80px] h-full flex-shrink-0 flex items-center justify-center relative">
                                <div className={`absolute inset-0 mx-auto w-10 h-10 rounded-[4px] transition-colors duration-300 ${
                                  theme === 'dark' ? 'group-hover:bg-gray-800/50' : 'group-hover:bg-gray-50'
                                }`} />
                                <MessageSquare size={16} className="relative z-10 transition-colors duration-300 group-hover:text-emerald-500" />
                              </div>
                              <AnimatePresence mode="wait" initial={false}>
                                {isSidebarOpen && (
                                  <motion.span
                                    initial={false}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={elasticSpring}
                                    className={`font-bold text-[13px] truncate whitespace-nowrap text-start ${theme === 'dark' ? 'text-white' : 'text-gray-900'} ${dir === 'rtl' ? 'mr-1' : 'ml-1'}`}
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
                                  className={`flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${dir === 'rtl' ? 'mr-auto pl-2' : 'ml-auto pr-2'}`}
                                >
                                  <button 
                                    onClick={() => { setEditingChatId(chat.id); setNewTitle(chat.title); }}
                                    className="p-1 hover:text-emerald-500 hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)] transition-all"
                                  >
                                    <Edit2 size={13} />
                                  </button>
                                  <button 
                                    type="button"
                                    onClick={(e) => handleDelete(e, chat.id)}
                                    className="p-1 hover:text-pink-500 transition-colors z-10"
                                  >
                                    <Trash2 size={13} />
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

            <div className={`mt-auto pt-4 pb-5 border-t border-[var(--border-main)] space-y-1 flex-shrink-0 relative`} ref={dropdownRef}>
              {user ? (
                <>
                  <AnimatePresence>
                    {isDropdownOpen && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className={`absolute bottom-full mb-2 w-[calc(100%-24px)] bg-[var(--bg-secondary)] border-[var(--border-main)] border rounded-[4px] shadow-xl overflow-hidden z-50 ${dir === 'rtl' ? 'right-3' : 'left-3'}`}
                      >
                        <div className="p-2 space-y-1">
                          <button onClick={() => { navigate('/settings?tab=account'); setIsDropdownOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[4px] transition-all text-gray-400 hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)] group/item`}>
                            <User size={16} className="flex-shrink-0 group-hover/item:text-emerald-500 transition-colors" />
                            <AnimatePresence mode="wait" initial={false}>
                              {isSidebarOpen && (
                                <motion.div
                                  initial={{ opacity: 0, x: dir === 'rtl' ? 10 : -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  exit={{ opacity: 0, x: dir === 'rtl' ? 10 : -10 }}
                                  transition={elasticSpring}
                                  className="overflow-hidden whitespace-nowrap"
                                >
                                  <span className="font-medium text-sm">{t('accountSettings') || (dir === 'rtl' ? 'الحساب' : 'Account')}</span>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </button>

                          {!isMobile && (
                            <button onClick={() => { navigate('/settings?tab=subscription'); setIsDropdownOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[4px] text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all`}>
                              <CreditCard size={16} className="flex-shrink-0" />
                              <AnimatePresence mode="wait" initial={false}>
                                {isSidebarOpen && (
                                  <motion.div
                                    initial={{ opacity: 0, x: dir === 'rtl' ? 10 : -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: dir === 'rtl' ? 10 : -10 }}
                                    transition={elasticSpring}
                                    className="overflow-hidden whitespace-nowrap"
                                  >
                                    <span className="font-medium text-sm">{t('consumption')}</span>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </button>
                          )}

                          <div className={`h-px bg-[var(--border-main)] my-1 mx-2`}></div>

                          <button onClick={() => { navigate('/settings?tab=usage'); setIsDropdownOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[4px] transition-all text-gray-400 hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)] group/item`}>
                            <Wallet size={16} className="flex-shrink-0 group-hover/item:text-emerald-500 transition-colors" />
                            <AnimatePresence mode="wait" initial={false}>
                              {isSidebarOpen && (
                                <motion.div
                                  initial={{ opacity: 0, x: dir === 'rtl' ? 10 : -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  exit={{ opacity: 0, x: dir === 'rtl' ? 10 : -10 }}
                                  transition={elasticSpring}
                                  className="overflow-hidden whitespace-nowrap"
                                >
                                  <span className="font-medium text-sm">{t('wallet') || (dir === 'rtl' ? 'المحفظة' : 'Wallet')}</span>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </button>

                          <button onClick={() => { navigate('/settings?tab=memory'); setIsDropdownOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[4px] transition-all text-gray-400 hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)] group/item`}>
                            <BrainCircuit size={16} className="flex-shrink-0 group-hover/item:text-emerald-500 transition-colors" />
                            <AnimatePresence mode="wait" initial={false}>
                              {isSidebarOpen && (
                                <motion.div
                                  initial={{ opacity: 0, x: dir === 'rtl' ? 10 : -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  exit={{ opacity: 0, x: dir === 'rtl' ? 10 : -10 }}
                                  transition={elasticSpring}
                                  className="overflow-hidden whitespace-nowrap"
                                  >
                                  <span className="font-medium text-sm">{t('memoryCenter') || (dir === 'rtl' ? 'ذاكرة المساعد' : 'Memory Center')}</span>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </button>

                           <button onClick={() => { logout(); setIsDropdownOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[4px] text-gray-400 hover:text-pink-500 hover:bg-pink-500/10 transition-all`}>
                            <LogOut size={16} className="flex-shrink-0" />
                            <AnimatePresence mode="wait" initial={false}>
                              {isSidebarOpen && (
                                <motion.div
                                  initial={{ opacity: 0, x: dir === 'rtl' ? 10 : -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  exit={{ opacity: 0, x: dir === 'rtl' ? 10 : -10 }}
                                  transition={elasticSpring}
                                  className="overflow-hidden whitespace-nowrap"
                                >
                                  <span className="font-medium text-sm">{t('logout') || (dir === 'rtl' ? 'تسجيل الخروج' : 'Logout')}</span>
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
                      className={`flex items-center group cursor-pointer w-full h-[44px] overflow-hidden flex-shrink-0 text-gray-400 hover:text-[var(--text-primary)]`}
                    >
                      <div className="flex items-center h-full overflow-hidden w-full relative text-[var(--text-primary)]">
                        <div className={`${isMobile ? 'w-14' : 'w-[80px]'} h-[44px] flex-shrink-0 flex items-center justify-center relative`}>
                          <div className={`absolute inset-0 mx-auto w-10 h-10 rounded-[4px] transition-all duration-300 group-hover:bg-emerald-500/5 group-hover:border-emerald-500/20`} />
                          <div 
                            className={`w-10 h-10 rounded-[4px] bg-[var(--bg-secondary)] flex items-center justify-center flex-shrink-0 overflow-hidden border-2 transition-all duration-500 relative z-10 group-hover:border-emerald-500/50 shadow-[0_0_15px_rgba(0,0,0,0.1)] group-hover:shadow-[0_0_25px_rgba(16,185,129,0.35)] group-hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.4)] group-hover:scale-105`}
                            style={{ 
                              borderColor: user.subscription?.plan_color || 'var(--border-main)'
                            }}
                          >
                            {user.avatar ? (
                              <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <User size={20} className="text-gray-400 group-hover:text-emerald-500 transition-all duration-300 group-hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                            )}
                          </div>
                          <div className={`absolute -bottom-1 left-0 right-0 flex justify-center transition-all ${!isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
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
                              initial={false}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              transition={elasticSpring}
                              className={`flex flex-col overflow-hidden ${dir === 'rtl' ? 'text-right' : 'text-left'}`}
                            >
                              <span className={`font-bold text-[13px] truncate whitespace-nowrap leading-tight ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{user.name}</span>
                              <span className="text-[10px] text-emerald-500/80 truncate whitespace-nowrap uppercase tracking-widest font-black leading-tight mt-0.5">
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
                    className={`flex items-center group cursor-pointer w-full h-[44px] overflow-hidden flex-shrink-0 ${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
                    onClick={() => setIsAuthModalOpen(true)}
                  >
                    <div className={`${isMobile ? 'w-14' : 'w-[80px]'} h-[44px] flex-shrink-0 flex items-center justify-center relative`}>
                      <div className={`absolute inset-0 mx-auto w-10 h-10 rounded-[4px] transition-colors duration-300 ${
                        theme === 'dark' ? 'group-hover:bg-gray-800/50' : 'group-hover:bg-gray-50'
                      }`} />
                      <div className={`w-10 h-10 rounded-[4px] ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'} flex items-center justify-center flex-shrink-0 relative z-10`}>
                        <User size={18} className="text-gray-400" />
                      </div>
                    </div>
                    <div className={`flex flex-col min-w-0 ${dir === 'rtl' ? 'pr-2' : 'pl-2'} justify-center`}>
                      <AnimatePresence mode="wait">
                        {isSidebarOpen && (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.85 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.85 }}
                            transition={elasticSpring}
                            className={`flex flex-col overflow-hidden ${dir === 'rtl' ? 'text-right' : 'text-left'}`}
                          >
                            <span className="text-[10px] text-gray-500 truncate whitespace-nowrap font-bold uppercase tracking-wider mb-0.5">{t('createAccount')}</span>
                            <span className={`font-bold text-sm truncate whitespace-nowrap ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{t('login')}</span>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
              )}
              
              {/* PWA Promotion integrated into NavItems */}

              <div className="flex flex-col w-full h-4 overflow-hidden flex-shrink-0 mt-2 px-6 relative">
                <AnimatePresence mode="wait">
                  {isSidebarOpen && (
                    <motion.div 
                      key="legal-footer"
                      initial={{ opacity: 0, filter: 'blur(4px)', y: 2 }}
                      animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
                      exit={{ opacity: 0, filter: 'blur(4px)', y: 2 }}
                      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                      className="flex items-center justify-between gap-1 opacity-30 hover:opacity-100 transition-all duration-700 pointer-events-auto"
                    >
                      <NavLink to="/terms" className="text-[6.5px] font-black text-gray-500 hover:text-emerald-500 transition-colors uppercase tracking-[0.08em] whitespace-nowrap">
                        {t('termsOfUse')}
                      </NavLink>
                      <span className="w-0.5 h-0.5 rounded-full bg-gray-800 flex-shrink-0" />
                      <NavLink to="/privacy" className="text-[6.5px] font-black text-gray-500 hover:text-emerald-500 transition-colors uppercase tracking-[0.08em] whitespace-nowrap">
                        {t('privacyPolicy')}
                      </NavLink>
                      <span className="w-0.5 h-0.5 rounded-full bg-gray-800 flex-shrink-0" />
                      <NavLink to="/about" className="text-[6.5px] font-black text-gray-500 hover:text-emerald-500 transition-colors uppercase tracking-[0.08em] whitespace-nowrap">
                        {language === 'ar' ? 'عن المنصة' : 'About'}
                      </NavLink>
                    </motion.div>
                  )}
                </AnimatePresence>
                {/* Background folding mask effect */}
                <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-transparent to-transparent" />
              </div>

            </div>
          </div>
        </div>
      </motion.aside>
    </>
  );
};


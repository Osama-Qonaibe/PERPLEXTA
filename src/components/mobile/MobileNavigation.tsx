import React, { useState, useEffect, useRef } from 'react';
import { useLocation, NavLink } from 'react-router-dom';
import { 
  MessageSquare, 
  Flame, 
  MessagesSquare,
  Sparkles, 
  User, 
  Wallet,
  Menu,
  X,
  Compass,
  CreditCard,
  Sliders,
  Shield,
  Plus,
  Trash2,
  Share2,
  Download,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Moon,
  Sun,
  Globe,
  GripVertical
} from 'lucide-react';
import { motion, AnimatePresence, PanInfo } from 'motion/react';
import { useAppContext } from '../../context/AppContext';
import { triggerHaptic } from '../../utils/haptics';
import { resolveImageUrl } from '../../utils/imageResolver';
import { NotificationIconRenderer } from '../../utils/imageProcessor';
import { useDeviceCapabilities } from '../../utils/deviceCapabilities';
import { useViewTransitionNavigate } from '../../utils/viewTransition';

export const MobileNavigation: React.FC = () => {
  const { 
    language, 
    user, 
    unreadCount, 
    chats, 
    chatId, 
    theme, 
    setTheme, 
    setLanguage,
    deleteChat,
    dir,
    siteSettings,
    setIsAuthModalOpen,
    t
  } = useAppContext();

  const { shouldDisableHeavyBlurs, isLowEndDevice } = useDeviceCapabilities();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const location = useLocation();
  const navigate = useViewTransitionNavigate();
  const currentPath = location.pathname;
  const isRtl = language === 'ar';

  // Automatically close drawer when route changes
  useEffect(() => {
    setIsDrawerOpen(false);
  }, [location.pathname, location.search]);

  // Prevent background scrolling when drawer is open
  useEffect(() => {
    if (isDrawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isDrawerOpen]);

  // Light Touch Swipe-to-Dismiss Handler
  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const swipeThreshold = 50;
    const velocityThreshold = 250;

    if (isRtl) {
      // In RTL (drawer from right), dragging towards right (positive x) dismisses
      if (info.offset.x > swipeThreshold || info.velocity.x > velocityThreshold) {
        triggerHaptic('light');
        setIsDrawerOpen(false);
      }
    } else {
      // In LTR (drawer from left), dragging towards left (negative x) dismisses
      if (info.offset.x < -swipeThreshold || info.velocity.x < -velocityThreshold) {
        triggerHaptic('light');
        setIsDrawerOpen(false);
      }
    }
  };

  const navItems = [
    {
      id: 'chat',
      labelAr: 'المحادثة',
      labelEn: 'Chat',
      path: '/bulletin?tab=inquiries',
      icon: MessageSquare,
    },
    {
      id: 'discover',
      labelAr: 'استكشاف',
      labelEn: 'Explore',
      path: '/discover',
      icon: Compass,
    },
    {
      id: 'studio',
      labelAr: 'إنشاء',
      labelEn: 'Create',
      path: '/chat',
      icon: Sparkles,
    },
    {
      id: 'viralbook',
      labelAr: 'فيرال بوك',
      labelEn: 'Viralbook',
      path: '/bulletin',
      icon: Flame,
    },
    {
      id: 'account',
      labelAr: 'الحساب',
      labelEn: 'Account',
      path: '/settings',
      isMenuTrigger: true,
      icon: User,
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
  ];

  const isTabActive = (id: string, path?: string) => {
    if (id === 'chat') return currentPath.startsWith('/bulletin') && (location.search.includes('tab=inquiries') || currentPath.includes('/inquiries'));
    if (id === 'discover') return currentPath.startsWith('/discover');
    if (id === 'studio') return currentPath === '/' || currentPath.startsWith('/chat');
    if (id === 'viralbook') return currentPath.startsWith('/bulletin') && !location.search.includes('tab=inquiries') && !currentPath.includes('/inquiries');
    if (id === 'account') return currentPath.startsWith('/settings');
    return path ? currentPath === path : false;
  };

  const handleTabPress = (item: typeof navItems[0]) => {
    triggerHaptic('selection');
    if (item.id === 'studio') {
      navigate('/chat');
      window.dispatchEvent(new Event('clear-chat'));
      setIsDrawerOpen(false);
    } else if (item.id === 'chat') {
      navigate('/bulletin?tab=inquiries');
      setIsDrawerOpen(false);
    } else if (item.id === 'account') {
      if (!user) {
        setIsAuthModalOpen(true);
        return;
      }
      if (currentPath.startsWith('/settings')) {
        setIsDrawerOpen((prev) => !prev);
      } else {
        navigate('/settings');
      }
    } else if (item.path) {
      navigate(item.path);
    }
  };

  const drawerNavLinks = [
    { icon: <Compass size={18} />, label: t('discover') || (isRtl ? 'اكتشف' : 'Discover'), path: '/discover' },
    { icon: <Sparkles size={18} />, label: t('studio') || (isRtl ? 'الاستوديو' : 'Studio'), path: '/Studio' },
    { icon: <Sparkles size={18} />, label: t('rewards') || (isRtl ? 'المكافآت' : 'Rewards'), path: '/rewards' },
    { icon: <CreditCard size={18} />, label: t('subscriptions') || (isRtl ? 'الاشتراكات' : 'Subscriptions'), path: '/subscription' },
    { icon: <Sliders size={18} />, label: t('settings') || (isRtl ? 'الإعدادات' : 'Settings'), path: '/settings' },
  ];

  const handleNewChat = () => {
    triggerHaptic('medium');
    navigate('/chat');
    window.dispatchEvent(new Event('clear-chat'));
    setIsDrawerOpen(false);
  };

  return (
    <div className="lg:hidden">
      {/* 1. Backdrop Overlay for Touch-Event Dismissal */}
      <AnimatePresence>
        {isDrawerOpen && (
          <motion.div
            key="mobile-drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={() => {
              triggerHaptic('light');
              setIsDrawerOpen(false);
            }}
            className={`fixed inset-0 z-[190] ${
              shouldDisableHeavyBlurs ? 'bg-black/75' : 'bg-black/60 backdrop-blur-[4px]'
            } touch-none`}
            aria-label="Close menu"
          />
        )}
      </AnimatePresence>

      {/* 2. Decoupled Mobile Drawer Panel with Swipe-to-Dismiss */}
      <AnimatePresence>
        {isDrawerOpen && (
          <motion.aside
            key="mobile-drawer-panel"
            initial={{ x: isRtl ? '100%' : '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: isRtl ? '100%' : '-100%' }}
            drag="x"
            dragDirectionLock
            dragConstraints={isRtl ? { left: 0, right: 280 } : { left: -280, right: 0 }}
            dragElastic={0.15}
            onDragEnd={handleDragEnd}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className={`fixed top-0 bottom-0 ${isRtl ? 'right-0' : 'left-0'} z-[200] w-[280px] max-w-[85vw] bg-[var(--surface-page)] text-[var(--text-primary)] border-[var(--border-main)] flex flex-col shadow-2xl overflow-hidden select-none touch-pan-y ${
              isRtl ? 'border-l' : 'border-r'
            }`}
          >
            {/* Drawer Header with Swipe Handle Indicator */}
            <div className="flex items-center justify-between px-4 h-16 border-b border-[var(--border-main)] pt-[env(safe-area-inset-top,0px)] shrink-0 bg-[var(--surface-card)] relative">
              <div className="flex items-center gap-2.5">
                {(siteSettings.logoBase64 || siteSettings.logoLightBase64) ? (
                  <NotificationIconRenderer
                    src={resolveImageUrl((theme === 'light' && siteSettings.logoLightBase64) ? siteSettings.logoLightBase64 : siteSettings.logoBase64, 'general')}
                    alt={isRtl ? (siteSettings?.siteNameAr || 'Logo') : (siteSettings?.siteName || 'Logo')}
                    size={32}
                    className="rounded-[var(--radius-sm)] border border-[var(--border-main)] bg-[var(--surface-subtle)]"
                    fallbackIcon={
                      <div className="w-8 h-8 rounded-[var(--radius-sm)] bg-[var(--bg-accent-muted)] border border-[var(--border-main)] flex items-center justify-center text-accent shadow-2xs">
                        <Sparkles size={16} />
                      </div>
                    }
                  />
                ) : (
                  <div className="w-8 h-8 rounded-[var(--radius-sm)] bg-[var(--bg-accent-muted)] border border-[var(--border-main)] flex items-center justify-center text-accent shadow-2xs">
                    <Sparkles size={16} />
                  </div>
                )}
                <span className="font-bold text-sm text-[var(--text-primary)] font-sans tracking-tight">
                  {isRtl ? (siteSettings?.siteNameAr || siteSettings?.siteName || 'بيربليكستا') : (siteSettings?.siteName || 'Perplexta')}
                </span>
              </div>

              {/* Native Visual Swipe Hint Pill */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-[var(--border-main)]" />

              <button
                onClick={() => {
                  triggerHaptic('light');
                  setIsDrawerOpen(false);
                }}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] active:scale-95 transition-transform cursor-pointer"
                title={isRtl ? 'إغلاق' : 'Close'}
              >
                <X size={18} />
              </button>
            </div>

            {/* Quick Action: New Chat */}
            <div className="p-3 border-b border-[var(--border-main)] shrink-0 bg-[var(--surface-page)]">
              <button
                onClick={handleNewChat}
                className="w-full h-10 px-3 rounded-[var(--radius)] bg-[var(--bg-accent-emphasis)] text-[var(--fg-on-emphasis)] font-bold text-xs flex items-center justify-center gap-2 shadow-xs active:scale-[0.98] transition-transform cursor-pointer"
              >
                <Plus size={16} />
                <span>{t('newChat') || (isRtl ? 'محادثة جديدة' : 'New Chat')}</span>
              </button>
            </div>

            {/* Main Scrollable Drawer Content */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4 overscroll-contain">
              {/* Primary Navigation Items */}
              <div className="space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] px-2 mb-1.5">
                  {isRtl ? 'التنقل الرئيسي' : 'Main Navigation'}
                </div>
                {drawerNavLinks.map((item) => {
                  const isActive = currentPath === item.path;
                  return (
                    <NavLink
                      key={`drawer-nav-${item.path}`}
                      to={item.path}
                      onClick={() => setIsDrawerOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius)] text-xs font-bold transition-all ${
                        isActive
                          ? 'bg-[var(--bg-accent-muted)] text-[var(--fg-accent)] border border-[var(--border-accent)]/30'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)]'
                      }`}
                    >
                      <span className={isActive ? 'text-accent' : 'text-[var(--text-muted)]'}>
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}
              </div>

              {/* Chat History Section */}
              {chats && chats.length > 0 && (
                <div className="space-y-1 pt-2 border-t border-[var(--border-main)]">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] px-2 mb-1.5 flex items-center justify-between">
                    <span>{t('history') || (isRtl ? 'المحادثات السابقة' : 'Chat History')}</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-[var(--surface-subtle)] text-[var(--text-muted)] font-mono">
                      {chats.length}
                    </span>
                  </div>
                  <div className="space-y-0.5 max-h-48 overflow-y-auto pr-1">
                    {chats.slice(0, 15).map((chat) => {
                      const isActive = chatId === chat.id;
                      return (
                        <div
                          key={`drawer-chat-${chat.id}`}
                          onClick={() => {
                            triggerHaptic('selection');
                            navigate(`/chat/${chat.id}`);
                            setIsDrawerOpen(false);
                          }}
                          className={`group flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-colors cursor-pointer ${
                            isActive
                              ? 'bg-[var(--bg-accent-muted)] text-accent font-bold'
                              : 'text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          <span className="truncate flex-1 text-[11px] leading-tight">
                            {chat.title || (isRtl ? 'محادثة بدون عنوان' : 'Untitled Chat')}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteChat(chat.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:text-red-500 transition-opacity"
                            title={isRtl ? 'حذف' : 'Delete'}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Settings & Appearance Quick Toggles */}
              <div className="space-y-2 pt-2 border-t border-[var(--border-main)]">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] px-2">
                  {isRtl ? 'المظهر واللغة' : 'Theme & Language'}
                </div>
                <div className="grid grid-cols-2 gap-2 px-1">
                  <button
                    onClick={() => {
                      triggerHaptic('selection');
                      setTheme(theme === 'dark' ? 'light' : 'dark');
                    }}
                    className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-main)] text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    {theme === 'dark' ? <Sun size={14} className="text-amber-400" /> : <Moon size={14} className="text-indigo-400" />}
                    <span className="text-[11px]">{theme === 'dark' ? (isRtl ? 'فاتح' : 'Light') : (isRtl ? 'داكن' : 'Dark')}</span>
                  </button>

                  <button
                    onClick={() => {
                      triggerHaptic('selection');
                      setLanguage(language === 'ar' ? 'en' : 'ar');
                    }}
                    className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-main)] text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    <Globe size={14} className="text-accent" />
                    <span className="text-[11px]">{language === 'ar' ? 'English' : 'العربية'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Drawer User Footer */}
            <div className="p-3 border-t border-[var(--border-main)] bg-[var(--surface-card)] shrink-0 pb-[calc(12px+env(safe-area-inset-bottom,0px))]">
              {user ? (
                <div className="flex items-center justify-between">
                  <div 
                    onClick={() => {
                      navigate('/settings');
                      setIsDrawerOpen(false);
                    }}
                    className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0"
                  >
                    <div className="w-8 h-8 rounded-full bg-accent/20 border border-accent/40 text-accent font-bold text-xs flex items-center justify-center shrink-0">
                      {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-[var(--text-primary)] truncate">{user.name || 'User'}</span>
                      <span className="text-[10px] text-[var(--text-muted)] truncate">{user.email}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      navigate('/settings');
                      setIsDrawerOpen(false);
                    }}
                    className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    {isRtl ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setIsDrawerOpen(false);
                    setIsAuthModalOpen(true);
                  }}
                  className="w-full h-10 px-4 rounded-[var(--radius)] bg-[var(--bg-accent-emphasis)] text-[var(--fg-on-emphasis)] font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-transform active:scale-[0.98] cursor-pointer"
                >
                  <User size={16} />
                  <span>{isRtl ? 'تسجيل الدخول / إنشاء حساب' : 'Sign In / Register'}</span>
                </button>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* 3. Bottom Navigation Bar (Fixed Bottom Anchor) */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="fixed bottom-0 left-0 right-0 z-[120] select-none bg-[var(--surface-page)]/95 backdrop-blur-md border-t border-[var(--border-main)] transition-colors duration-200 pb-[env(safe-area-inset-bottom,0px)]"
      >
        <div className="h-[52px] px-2 flex items-center justify-around max-w-lg mx-auto">
          {navItems.map((item) => {
            const active = isTabActive(item.id, item.path);
            const Icon = item.icon;

            // Menu button trigger with graceful fade transition
            if (item.isMenuTrigger) {
              return (
                <button
                  key={`mobile-nav-${item.id}`}
                  onClick={() => handleTabPress(item)}
                  className="relative flex-1 h-full flex flex-col items-center justify-center gap-1 cursor-pointer focus:outline-none active:scale-95 transition-transform"
                >
                  <div className="relative flex items-center justify-center mt-1">
                    <AnimatePresence mode="wait">
                      {isDrawerOpen ? (
                        <motion.div
                          key="drawer-active-icon"
                          initial={{ opacity: 0, scale: 0.7 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.7 }}
                          transition={{ duration: 0.15 }}
                        >
                          <X className="w-5 h-5 text-accent stroke-[2.2]" />
                        </motion.div>
                      ) : (
                        <motion.div
                          key="drawer-closed-icon"
                          initial={{ opacity: 0, scale: 0.7 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.7 }}
                          transition={{ duration: 0.15 }}
                        >
                          <Icon className="w-5 h-5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors" />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {item.badge && typeof item.badge === 'number' && item.badge > 0 && !isDrawerOpen && (
                      <span className="absolute -top-1 -right-2 min-w-[15px] h-[15px] px-1 bg-red-500 text-white text-[9px] font-extrabold rounded-full flex items-center justify-center leading-none">
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    )}
                  </div>

                  <span
                    className={`text-[10px] tracking-tight transition-colors duration-150 leading-none ${
                      isDrawerOpen ? 'text-accent font-bold' : 'text-[var(--text-muted)] font-medium'
                    }`}
                  >
                    {isRtl ? item.labelAr : item.labelEn}
                  </span>
                </button>
              );
            }

            // Standard Tab
            return (
              <button
                key={`mobile-nav-${item.id}`}
                onClick={() => handleTabPress(item)}
                className="relative flex-1 h-full flex flex-col items-center justify-center gap-1 cursor-pointer focus:outline-none active:scale-95 transition-transform"
              >
                {active && (
                  <motion.div
                    layoutId="mobile-nav-active-indicator"
                    className="absolute top-1 w-7 h-1 rounded-full bg-[var(--bg-accent-emphasis)]"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}

                <div className="relative flex items-center justify-center mt-1">
                  <Icon
                    className={`w-5 h-5 transition-colors duration-150 ${
                      active 
                        ? 'text-accent stroke-[2.4]' 
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] stroke-[1.8]'
                    }`}
                  />
                </div>

                <span
                  className={`text-[10px] tracking-tight transition-colors duration-150 leading-none ${
                    active 
                      ? 'text-accent font-bold' 
                      : 'text-[var(--text-muted)] font-medium'
                  }`}
                >
                  {isRtl ? item.labelAr : item.labelEn}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { useToast } from '../hooks/useToast';
import { User as AppUser } from '../context/AppContext';
import { AccountSettings } from '../components/AccountSettings';
import { MemoryCenter } from '../components/MemoryCenter';
import { UsageRadar } from '../components/UsageRadar';
import { WalletSystem } from '../components/WalletSystem';
import { DeveloperAgentPortal } from '../components/DeveloperAgentPortal';
import { motion, AnimatePresence } from 'motion/react';
import { perplextaPageTransition } from '../constants/motions';
import { triggerHaptic } from '../utils/haptics';
import { 
  User as UserIcon, Users, Settings2, Shield, CreditCard, 
  Wallet, Palette, Keyboard, BrainCircuit, Globe,
  ChevronRight, ChevronLeft, LogOut, Link2,
  Trash2, Edit2, Save, X, Plus, Loader2,
  Command, Terminal, MousePointer2, Type,
  MessageSquare, ImageIcon, Video, LayoutGrid,
  Activity, Clock, Zap, ShieldCheck, Brain, MapPin, 
  FileText, Mic, Volume2, Code
} from 'lucide-react';

interface ProfileUpdate {
  name?: string;
  email?: string;
  avatar?: string;
  theme?: string;
  language?: string;
  [key: string]: any;
}

interface ApiError extends Error {
  code?: string;
  status?: number;
}

const VALID_SETTINGS_TABS = ['account', 'usage', 'wallet', 'memory', 'developer'];

export const SettingsPage: React.FC = () => {
  const { t, dir, theme, setTheme, user, setUser, logout, token, language, setLanguage } = useAppContext();
  const { toast, showToast } = useToast(4000);
  const { tab: routeTab } = useParams<{ tab?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const getInitialTab = (): string => {
    if (routeTab && VALID_SETTINGS_TABS.includes(routeTab.toLowerCase())) {
      return routeTab.toLowerCase();
    }
    const queryTab = searchParams.get('tab');
    if (queryTab && VALID_SETTINGS_TABS.includes(queryTab.toLowerCase())) {
      return queryTab.toLowerCase();
    }
    return 'account';
  };

  const [activeTab, setActiveTab] = useState<string>(getInitialTab);
  const [localUser, setLocalUser] = useState(user);

  // Reference trackers for performance optimization
  const hasFetchedProfile = useRef(false);

  const getAuthHeaders = useCallback(() => ({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }), [token]);

  const handleApiError = useCallback((error: ApiError | any, logMessage: string, toastMessage?: string) => {
    if (process.env.NODE_ENV === 'development') {
      console.error(logMessage, error);
    }
    if (toastMessage) showToast(toastMessage, 'error');
  }, [showToast]);

  useEffect(() => {
    if (routeTab && VALID_SETTINGS_TABS.includes(routeTab.toLowerCase())) {
      if (activeTab !== routeTab.toLowerCase()) {
        setActiveTab(routeTab.toLowerCase());
      }
    } else if (searchParams.get('tab')) {
      const queryTab = searchParams.get('tab')!.toLowerCase();
      const resolved = VALID_SETTINGS_TABS.includes(queryTab) ? queryTab : 'account';
      setActiveTab(resolved);
      navigate(`/settings/${resolved}`, { replace: true });
    }
  }, [routeTab, searchParams, activeTab, navigate]);

  const handleTabChange = useCallback((tabId: string) => {
    triggerHaptic(15);
    setActiveTab(tabId);
    navigate(`/settings/${tabId}`, { replace: true });
  }, [navigate]);

  const fetchProfile = useCallback(async () => {
    if (!token || token === 'null') return;
    try {
      const res = await fetch('/api/user/profile', {
        headers: { 'Authorization': getAuthHeaders().Authorization }
      });
      if (res.status === 401) {
        logout();
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setLocalUser(data);
        setUser(data);
        hasFetchedProfile.current = true;
      }
    } catch (error) {
      handleApiError(error, 'Failed to fetch profile');
    }
  }, [token, setUser, getAuthHeaders, handleApiError, logout]);

  useEffect(() => {
    if (token && token !== 'null' && !hasFetchedProfile.current) {
      fetchProfile();
    }
  }, [token, fetchProfile]);

  const handleUpdateProfile = useCallback(async (updates: ProfileUpdate | AppUser) => {
    if (!token || token === 'null') return;
    
    // Validation
    if (updates && 'name' in updates && updates.name && updates.name.length < 2) {
      showToast(language === 'ar' ? 'الاسم قصير جداً' : 'Name is too short', 'error');
      return;
    }
    if (updates && 'email' in updates && updates.email && !updates.email.includes('@')) {
      showToast(language === 'ar' ? 'البريد الإلكتروني غير صالح' : 'Invalid email address', 'error');
      return;
    }

    // If updates is already a full user object (from avatar upload return)
    const isFullUser = updates && typeof updates === 'object' && 'id' in updates && 'email' in updates;
    
    if (isFullUser) {
      const userData = updates as AppUser;
      setLocalUser(userData);
      setUser(userData);
      showToast(t('saveSuccess'), 'success');
      return;
    }

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updates)
      });
      if (res.status === 401) {
        logout();
        return;
      }
      if (res.ok) {
        const updatedUser = await res.json();
        setLocalUser(updatedUser);
        setUser(updatedUser);
        showToast(t('saveSuccess'), 'success');
      } else {
        const errorData = await res.json().catch(() => ({}));
        showToast(errorData.error || t('saveFailed'), 'error');
      }
    } catch (error) {
      handleApiError(error, 'Failed to update profile', t('saveFailed'));
    }
  }, [token, setUser, showToast, t, getAuthHeaders, handleApiError, language, logout]);

  // Memory Center State
  const [memories, setMemories] = useState<any[]>([]);
  const [isLoadingMemories, setIsLoadingMemories] = useState(false);

  const fetchMemories = useCallback(async () => {
    if (!token || token === 'null') return;
    setIsLoadingMemories(true);
    try {
      const res = await fetch('/api/memories', {
        headers: { 'Authorization': getAuthHeaders().Authorization }
      });
      if (res.ok) {
        const data = await res.json();
        setMemories(data);
      }
    } catch (error) {
      handleApiError(error, 'Failed to fetch memories');
    } finally {
      setIsLoadingMemories(false);
    }
  }, [token, getAuthHeaders, handleApiError]);

  useEffect(() => {
    if (activeTab === 'memory') {
      fetchMemories();
    }
  }, [activeTab, fetchMemories]);

  const handleAddMemory = useCallback(async (fact: string, category: string = 'general') => {
    if (!token || token === 'null') return;
    try {
      const res = await fetch('/api/memories', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ fact, category, source: 'user' })
      });
      if (res.ok) {
        const newMemory = await res.json();
        setMemories(prev => [newMemory, ...prev]);
      }
    } catch (error) {
      handleApiError(error, 'Failed to add memory');
    }
  }, [token, getAuthHeaders, handleApiError]);

  const handleUpdateMemory = useCallback(async (id: number, fact: string, category?: string) => {
    if (!token || token === 'null') return;
    try {
      const res = await fetch(`/api/memories/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ fact, category })
      });
      if (res.ok) {
        const updatedMemory = await res.json();
        setMemories(prev => prev.map(m => m.id === id ? updatedMemory : m));
      }
    } catch (error) {
      handleApiError(error, 'Failed to update memory');
    }
  }, [token, getAuthHeaders, handleApiError]);

  const handleDeleteMemory = useCallback(async (id: number) => {
    if (!token || token === 'null') return;
    try {
      const res = await fetch(`/api/memories/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': getAuthHeaders().Authorization }
      });
      if (res.ok) {
        setMemories(prev => prev.filter(m => m.id !== id));
      }
    } catch (error) {
      handleApiError(error, 'Failed to delete memory');
    }
  }, [token, getAuthHeaders, handleApiError]);

  const handlePruneMemory = useCallback(async () => {
    if (!token || token === 'null') return;
    try {
      const res = await fetch('/api/memories/prune', {
        method: 'POST',
        headers: { 'Authorization': getAuthHeaders().Authorization }
      });
      if (res.ok) {
        await fetchMemories();
      }
    } catch (error) {
      handleApiError(error, 'Failed to prune memories');
    }
  }, [token, fetchMemories, getAuthHeaders, handleApiError]);

  const tabs = [
    { id: 'account', icon: <UserIcon size={18} />, label: language === 'ar' ? 'الحساب' : 'Account' },
    { id: 'usage', icon: <Activity size={18} />, label: language === 'ar' ? 'الاستهلاك' : 'Usage' },
    { id: 'wallet', icon: <Wallet size={18} />, label: language === 'ar' ? 'المحفظة' : 'Wallet' },
    { id: 'memory', icon: <BrainCircuit size={18} />, label: language === 'ar' ? 'الذاكرة' : 'Memory' },
    { id: 'developer', icon: <Terminal size={18} />, label: language === 'ar' ? 'المطورين' : 'Devs' },
  ];

  if (!user) return null;

  return (
    <div className={`h-screen w-full flex flex-col md:flex-row overflow-hidden bg-[var(--bg-base)] text-[var(--text-primary)]`}>
      
      {/* Mobile Top Header - Native App Style */}
      <div className="flex md:hidden sticky top-0 z-40 w-full h-14 px-4 items-center justify-between border-b backdrop-blur-xl bg-[var(--bg-base)]/95 border-[var(--border)]/60 shrink-0 select-none">
        <div className="flex items-center gap-2.5">
          <button 
            onClick={() => navigate('/chat')} 
            className="h-9 px-2.5 flex items-center gap-1 rounded-[var(--radius)] bg-[var(--surface-subtle)] border border-[var(--border-main)] text-[var(--text-primary)] hover:text-accent transition-theme active:scale-95 cursor-pointer"
          >
            {dir === 'rtl' ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            <span className="text-xs font-black">{dir === 'rtl' ? 'رجوع' : 'Back'}</span>
          </button>
          <div className="flex flex-col">
            <h1 className="text-sm font-black tracking-tight uppercase leading-none">{t('settings')}</h1>
            <span className="text-[9px] font-bold text-accent tracking-wider">{tabs.find(t => t.id === activeTab)?.label}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button 
            onClick={() => logout()}
            className="p-2 rounded-[var(--radius)] text-red-500 hover:bg-red-500/10 active:scale-95 transition-theme cursor-pointer"
            title={t('logout')}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {/* Desktop Sidebar Navigation - Elite Standard */}
      <div className={`hidden md:flex md:w-60 md:h-screen flex-col border-b md:border-b-0 border-[var(--border)] relative shrink-0 ${
        dir === 'rtl' ? 'md:border-l' : 'md:border-r'
      } border-[var(--border)] bg-[var(--bg-secondary)]`}>
        
        {/* Sidebar Header - Height matched with content header (h-20) */}
        <div className="h-20 px-6 border-b border-[var(--border)]/50 flex items-center">
           <div className="flex items-center gap-3">
              <button 
                onClick={() => navigate('/chat')} 
                className="w-8 h-8 flex items-center justify-center rounded-[8px] bg-transparent border border-transparent hover:bg-accent/10 text-[var(--text-muted)] hover:text-accent transition-theme group cursor-pointer"
              >
                {dir === 'rtl' ? <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" /> : <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />}
              </button>
              <h1 className="text-xl font-black tracking-tight uppercase">{t('settings')}</h1>
           </div>
        </div>

        {/* Sidebar Tabs - Scrollable Area */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-1.5 font-inter">
          {tabs.map((tab, tabIdx) => (
            <button
              key={`settings-tab-${tab.id}-${tabIdx}`}
              onClick={() => handleTabChange(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-[var(--radius)] transition-theme group relative overflow-hidden cursor-pointer ${
                activeTab === tab.id 
                  ? 'text-accent'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              <AnimatePresence>
                {activeTab === tab.id && (
                  <motion.div 
                    layoutId="activeTabGlow"
                    className="absolute inset-0 bg-accent/[0.03]"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
                  />
                )}
              </AnimatePresence>

              <span className={`shrink-0 transition-theme relative z-10 ${
                activeTab === tab.id ? 'scale-110 text-accent ' : 'group-hover:text-accent'
              }`}>
                 {tab.icon}
              </span>
              <span className={`font-bold text-sm tracking-tight relative z-10 transition-theme ${activeTab === tab.id ? 'translate-x-1' : ''}`}>
                {tab.label}
              </span>
            </button>
          ))}
        </div>

        {/* Sidebar Footer - Permanent Anchor */}
        <div className="p-4 border-t border-[var(--border)]/50">
          <button 
            onClick={() => logout()}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-[var(--radius)] text-red-500 hover:bg-red-500/10 transition-theme border border-transparent hover:border-red-500/20 group cursor-pointer"
          >
            <LogOut size={18} className="group-hover:rotate-12 transition-transform" />
            <span className="font-bold text-sm tracking-tight">{t('logout')}</span>
          </button>
        </div>
      </div>

      {/* Content Area - With Sticky Header */}
      <div className="flex-1 flex flex-col overflow-hidden relative min-w-0">
        {/* Sticky Desktop Page Header */}
        <div className="hidden md:flex sticky top-0 z-30 w-full h-20 px-6 md:px-12 items-center border-b backdrop-blur-xl transition-theme flex-none bg-[var(--bg-base)]/80 border-[var(--border)]/40">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-[var(--radius)] bg-accent/10 flex items-center justify-center text-accent shadow-[0_0_20px_rgba(156,163,175,0.15)]">
               {tabs.find(t => t.id === activeTab)?.icon}
            </div>
            <div className="flex flex-col">
              <h1 className="text-2xl font-black tracking-tight">{tabs.find(t => t.id === activeTab)?.label}</h1>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)] opacity-60">{t('appName')} Command / {activeTab}</span>
            </div>
          </div>
        </div>

        <div className={`flex-1 overflow-y-auto no-scrollbar scroll-smooth p-3 sm:p-6 md:p-12 pb-[calc(var(--safe-area-spacing)+24px+env(safe-area-inset-bottom,0px))] md:pb-12`}>
          <div className="max-w-5xl mx-auto w-full">
            <AnimatePresence>
              <motion.div
                key={activeTab}
                initial="initial"
                animate="animate"
                exit="exit"
                variants={perplextaPageTransition}
                className="space-y-6 md:space-y-12 pb-8 w-full"
              >
              {/* Account Tab */}
              {activeTab === 'account' && localUser && (
                <div className="w-full">
                  <AccountSettings 
                    user={localUser} 
                    onUpdate={handleUpdateProfile} 
                    dir={dir} 
                    theme={theme} 
                    showToast={showToast}
                  />
                </div>
              )}
              
              {/* Usage Tab */}
              {activeTab === 'usage' && (
                <UsageRadar />
              )}
              
              {/* Wallet Tab */}
              {activeTab === 'wallet' && (
                <WalletSystem theme={theme} dir={dir} />
              )}

              {/* Memory Center Tab */}
              {activeTab === 'memory' && (
                 <MemoryCenter
                   memories={memories}
                   isLoading={isLoadingMemories}
                   onAdd={handleAddMemory}
                   onUpdate={handleUpdateMemory}
                   onDelete={handleDeleteMemory}
                   onPrune={handlePruneMemory}
                   onRefresh={fetchMemories}
                   dir={dir}
                   theme={theme}
                   stickyOffset={80}
                 />
              )}

              {/* Developer & Bot Portal Tab */}
              {activeTab === 'developer' && (
                <div className="w-full">
                  <DeveloperAgentPortal />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav 
        dir={dir}
        className="md:!hidden mobile-bottom-nav"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={`settings-mobile-nav-${tab.id}`}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              className={`mobile-nav-item flex-1 ${isActive ? 'active text-accent' : ''}`}
            >
              <div className="mobile-nav-icon">
                <span className={`transition-transform duration-200 stroke-[2.2] ${isActive ? 'scale-105 text-accent' : ''}`}>
                  {tab.icon}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="settings-mobile-nav-indicator"
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-accent"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </div>
              <span className={`mobile-nav-label ${isActive ? 'opacity-100 font-extrabold' : 'opacity-80'}`}>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            className={`fixed bottom-6 ${dir === 'rtl' ? 'left-6' : 'right-6'} z-50 px-5 py-3.5 rounded-[var(--radius)] shadow-2xl flex items-center gap-3 backdrop-blur-md border ${
              (toast as any).type === 'success' 
                ? 'bg-accent/10 border-accent/20 text-accent' 
                : 'bg-red-500/10 border-red-500/20 text-red-500'
            }`}
            style={{ boxShadow: (toast as any).type === 'success' ? '0 10px 30px rgba(156,163,175,0.15)' : '0 10px 30px rgba(239,68,68,0.15)' }}
          >
            <span className={`w-2 h-2 rounded-[4px] ${(toast as any).type === 'success' ? 'bg-accent animate-pulse' : 'bg-red-500'}`} />
            <span className="font-bold text-sm tracking-tight">
              {typeof (toast as any).message === 'string' ? (toast as any).message.replace(/[<>]/g, '') : (toast as any).message}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

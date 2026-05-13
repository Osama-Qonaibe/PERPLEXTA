import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { AccountSettings } from '../components/AccountSettings';
import { MemoryCenter } from '../components/MemoryCenter';
import { UsageRadar } from '../components/UsageRadar';
import { WalletSystem } from '../components/WalletSystem';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, Settings2, Shield, CreditCard, 
  Wallet, Palette, Keyboard, BrainCircuit, Globe,
  ChevronRight, ChevronLeft, LogOut, Link2,
  Trash2, Edit2, Save, X, Plus, Loader2,
  Command, Terminal, MousePointer2, Type,
  MessageSquare, Image as ImageIcon, Video, LayoutGrid,
  Activity, Clock, Zap, ShieldCheck, Brain, MapPin, 
  FileText, Mic, Volume2, Code
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { t, dir, theme, setTheme, user, setUser, logout, token, language, setLanguage } = useAppContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => {
    const tab = searchParams.get('tab');
    if (tab === 'preferences' || tab === 'shortcuts') return 'account';
    return tab || 'account';
  });
  const [localUser, setLocalUser] = useState(user);
  const navigate = useNavigate();

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && tab !== activeTab) {
      if (tab === 'preferences' || tab === 'shortcuts') {
        setActiveTab('account');
        setSearchParams({ tab: 'account' });
      } else {
        setActiveTab(tab);
      }
    }
  }, [searchParams]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/user/profile', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setLocalUser(data);
          setUser(data);
        }
      } catch (error) {
        console.error('Failed to fetch profile', error);
      }
    };
    if (token && token !== 'null') fetchProfile();
  }, [token]);

  const handleUpdateProfile = async (updates: any) => {
    // If updates is already a full user object (from avatar upload return)
    if (updates && updates.id && updates.email) {
      setLocalUser(updates);
      setUser(updates);
      alert(t('saveSuccess'));
      return;
    }

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        const updatedUser = await res.json();
        setLocalUser(updatedUser);
        setUser(updatedUser);
        alert(t('saveSuccess'));
      }
    } catch (error) {
      console.error('Failed to update profile', error);
      alert(t('saveFailed'));
    }
  };

  // Memory Center State
  const [memories, setMemories] = useState<any[]>([]);
  const [isLoadingMemories, setIsLoadingMemories] = useState(false);

  useEffect(() => {
    if (activeTab === 'memory') {
      fetchMemories();
    }
  }, [activeTab]);

  const fetchMemories = async () => {
    if (!token || token === 'null') return;
    setIsLoadingMemories(true);
    try {
      const res = await fetch('/api/memories', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMemories(data);
      }
    } catch (error) {
      console.error('Failed to fetch memories', error);
    } finally {
      setIsLoadingMemories(false);
    }
  };

  const handleAddMemory = async (fact: string, category: string = 'general') => {
    try {
      const res = await fetch('/api/memories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ fact, category, source: 'user' })
      });
      if (res.ok) {
        const newMemory = await res.json();
        setMemories([newMemory, ...memories]);
      }
    } catch (error) {
      console.error('Failed to add memory', error);
    }
  };

  const handleUpdateMemory = async (id: number, fact: string, category?: string) => {
    try {
      const res = await fetch(`/api/memories/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ fact, category })
      });
      if (res.ok) {
        const updatedMemory = await res.json();
        setMemories(memories.map(m => m.id === id ? updatedMemory : m));
      }
    } catch (error) {
      console.error('Failed to update memory', error);
    }
  };

  const handleDeleteMemory = async (id: number) => {
    try {
      const res = await fetch(`/api/memories/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setMemories(memories.filter(m => m.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete memory', error);
    }
  };

  const handlePruneMemory = async () => {
    try {
      const res = await fetch('/api/memories/prune', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        await fetchMemories();
      }
    } catch (error) {
      console.error('Failed to prune memories', error);
    }
  };

  const tabs = [
    { id: 'account', icon: <User size={18} />, label: t('profile') },
    { id: 'subscription', icon: <CreditCard size={18} />, label: t('consumption') },
    { id: 'usage', icon: <Wallet size={18} />, label: t('wallet') },
    { id: 'memory', icon: <BrainCircuit size={18} />, label: t('memoryCenter') },
  ];

  if (!user) return null;

  return (
    <div className={`h-screen w-full flex flex-col md:flex-row overflow-hidden ${theme === 'dark' ? 'bg-[#0f0f11] text-white' : 'bg-white text-gray-900'}`}>
      
      {/* Sidebar Navigation - Elite Standard */}
      <div className={`w-full md:w-60 border-b md:border-b-0 border-gray-200 dark:border-gray-800/60 flex flex-col h-[280px] md:h-screen relative ${
        dir === 'rtl' ? 'md:border-l' : 'md:border-r'
      } ${theme === 'dark' ? 'bg-[#1a1a1c]/30' : 'bg-gray-50/40'}`}>
        
        {/* Sidebar Header - Height matched with content header (h-20) */}
        <div className="h-20 px-6 border-b border-gray-200/50 dark:border-gray-800/40 flex items-center">
           <div className="flex items-center gap-3">
              <button 
                onClick={() => navigate('/')} 
                className="w-10 h-10 flex items-center justify-center rounded-[4px] bg-transparent border border-transparent hover:bg-emerald-500/10 text-gray-500 hover:text-emerald-500 transition-all duration-300 group"
              >
                {dir === 'rtl' ? <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" /> : <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />}
              </button>
              <h1 className="text-xl font-black tracking-tight uppercase">{t('settings')}</h1>
           </div>
        </div>

        {/* Sidebar Tabs - Scrollable Area */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-1.5">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-[4px] transition-all duration-500 group relative overflow-hidden ${
                activeTab === tab.id 
                  ? (theme === 'dark' ? 'text-emerald-500' : 'bg-white text-emerald-600 shadow-xl shadow-emerald-500/5 border border-emerald-100')
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/5'
              }`}
            >
              <AnimatePresence>
                {activeTab === tab.id && (
                  <motion.div 
                    layoutId="activeTabGlow"
                    className="absolute inset-0 bg-emerald-500/5 dark:bg-emerald-500/[0.03]"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  />
                )}
              </AnimatePresence>

              <span className={`shrink-0 transition-all duration-500 relative z-10 ${
                activeTab === tab.id ? 'scale-110 text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'group-hover:text-emerald-500'
              }`}>
                 {tab.icon}
              </span>
              <span className={`font-bold text-sm tracking-tight relative z-10 transition-all duration-300 ${activeTab === tab.id ? 'translate-x-1' : ''}`}>
                {tab.label}
              </span>
            </button>
          ))}
        </div>

        {/* Sidebar Footer - Permanent Anchor */}
        <div className="p-4 border-t border-gray-200/50 dark:border-gray-800/40">
          <button 
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-[4px] text-red-500 hover:bg-red-500/10 transition-all duration-300 border border-transparent hover:border-red-500/20 group"
          >
            <LogOut size={18} className="group-hover:rotate-12 transition-transform" />
            <span className="font-bold text-sm tracking-tight">{t('logout')}</span>
          </button>
        </div>
      </div>

      {/* Content Area - With Sticky Header */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Sticky Page Header */}
        <div className={`sticky top-0 z-30 w-full h-20 px-6 md:px-12 flex items-center border-b backdrop-blur-xl transition-all duration-300 flex-none ${
          theme === 'dark' ? 'bg-[#0f0f11]/80 border-gray-800/40' : 'bg-white/80 border-gray-100'
        }`}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-[4px] bg-emerald-500/10 flex items-center justify-center text-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
               {tabs.find(t => t.id === activeTab)?.icon}
            </div>
            <div className="flex flex-col">
              <h1 className="text-2xl font-black tracking-tight">{tabs.find(t => t.id === activeTab)?.label}</h1>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 opacity-60">{t('appName')} Command / {activeTab}</span>
            </div>
          </div>
        </div>

        <div className={`flex-1 overflow-y-auto no-scrollbar scroll-smooth ${activeTab === 'usage' ? 'p-0' : 'p-6 md:p-12'}`}>
          <div className={activeTab === 'usage' ? 'h-full w-full' : 'max-w-5xl mx-auto'}>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                className={activeTab === 'usage' ? 'h-full flex flex-col' : 'space-y-12 pb-12'}
              >
              {/* Account Tab */}
              {activeTab === 'account' && localUser && (
                <div className={`p-8 md:p-12 rounded-[4px] border transition-all duration-500 ${
                  theme === 'dark' ? 'bg-[#1a1a1c]/60 border-gray-800/60 shadow-2xl' : 'bg-white border-gray-100 shadow-2xl shadow-gray-200/40'
                }`}>
                  <AccountSettings 
                    user={localUser} 
                    onUpdate={handleUpdateProfile} 
                    dir={dir} 
                    theme={theme} 
                  />
                </div>
              )}

              {/* Consumption Tab */}
              {activeTab === 'subscription' && (
                <div className={`rounded-[4px] border overflow-hidden transition-all duration-500 ${
                  theme === 'dark' ? 'bg-[#1a1a1c]/40 border-gray-800/60 shadow-2xl' : 'bg-white border-gray-100 shadow-xl'
                }`}>
                  <div className={`px-8 pt-8 pb-6 border-b ${theme === 'dark' ? 'border-gray-800/40 bg-gray-900/20' : 'border-gray-50 bg-gray-50/30'}`}>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-[4px] bg-emerald-500/10 flex items-center justify-center text-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                        <Activity size={24} />
                      </div>
                      <div>
                        <h2 className="text-2xl font-black tracking-tight">{t('consumptionRadar')}</h2>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-widest opacity-60">
                          {t('realTimeSync')}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 md:p-10">
                    <UsageRadar />
                  </div>
                </div>
              )}

              
              {/* Wallet Tab */}
              {activeTab === 'usage' && (
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
                   dir={dir}
                   theme={theme}
                   stickyOffset={80}
                 />
              )}
            </motion.div>
          </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

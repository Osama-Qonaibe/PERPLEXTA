import React, { useState, useRef, useEffect } from 'react';
import { User, Mail, Lock, Camera, Edit2, ShieldCheck, CreditCard, Check, X, Loader2, Sparkles, Languages, Monitor, Briefcase, Zap, Target, BookOpen, Code2, LayoutGrid } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { motion, AnimatePresence } from 'motion/react';

interface AccountSettingsProps {
  user: any;
  onUpdate: (updates: any) => void;
  dir: 'rtl' | 'ltr';
  theme: 'dark' | 'light' | 'system';
  showToast?: (message: string, type?: 'success' | 'error') => void;
}

export const AccountSettings: React.FC<AccountSettingsProps> = ({ user, onUpdate, dir, theme, showToast }) => {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<'profile' | 'preferences'>('profile');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t, token, setIsOperationPending, language, setLanguage, setTheme } = useAppContext();

  const notify = (message: string, type: 'success' | 'error' = 'success') => {
    if (showToast) {
      showToast(message, type);
    } else {
      alert(message);
    }
  };

  useEffect(() => {
    setIsOperationPending(isUploading || editingField !== null);
  }, [isUploading, editingField, setIsOperationPending]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_AVATAR_SIZE) {
      notify(dir === 'rtl' ? 'حجم الصورة كبير جداً (الحد الأقصى 5 ميجابايت)' : 'Image is too large (Max 5MB)', 'error');
      e.target.value = '';
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch('/api/user/avatar', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      
      const data = await res.json();
      if (res.ok) {
        if (data.user) {
          onUpdate(data.user);
        } else {
          onUpdate({ avatar: data.url });
        }
      } else {
        notify(data.error || t('saveFailed'), 'error');
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
      notify(t('saveFailed'), 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleStartEdit = (field: string, value: string) => {
    setEditingField(field);
    setEditValue(value);
  };

  const handleSave = async () => {
    if (!editingField) return;
    
    if (editingField === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(editValue)) {
        notify(dir === 'rtl' ? 'بريد إلكتروني غير صالح' : 'Invalid email address', 'error');
        return;
      }
    }

    if (editingField === 'password' && editValue.length > 0 && editValue.length < 8) {
      notify(dir === 'rtl' ? 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' : 'Password must be at least 8 characters', 'error');
      return;
    }

    await onUpdate({ [editingField]: editValue });
    setEditingField(null);
  };

  const renderEditableField = (label: string, field: string, value: string, icon: React.ReactNode, type: string = 'text', multiline: boolean = false) => {
    const isEditing = editingField === field;

    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between py-10 border-b border-[var(--border-main)] group gap-4">
        <div className="flex items-center gap-6 flex-1">
          <div className="p-3 rounded-[var(--radius)] bg-[var(--bg-primary)] text-slate-500 dark:text-slate-400 group-hover:text-emerald-500 transition-all duration-300 shrink-0">
            {React.cloneElement(icon as React.ReactElement<{ size?: number; className?: string }>, { size: 20 })}
          </div>
          <div className="flex-1 w-full">
            <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">{label}</p>
            {isEditing ? (
              multiline ? (
                <textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full p-4 rounded-[var(--radius)] border focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-slate-50 min-h-[120px] text-sm"
                  autoFocus
                />
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSave();
                }}
                className="w-full max-w-md"
              >
                <input
                  type={type}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full p-3 rounded-[var(--radius)] border focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-bold bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-slate-50"
                  autoFocus
                />
              </form>
            )
            ) : (
              <p className={`font-bold text-slate-900 dark:text-slate-50 tracking-tight ${multiline ? 'text-sm whitespace-pre-wrap leading-relaxed opacity-95' : 'text-base'}`}>
                {field === 'password' ? '••••••••' : (value || t('none'))}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center justify-end gap-2">
          {isEditing ? (
            <div className="flex gap-2">
              <button 
                onClick={handleSave}
                className="p-2 text-emerald-500 hover:bg-emerald-500/10 rounded-[var(--radius)] transition-all hover:scale-110 active:scale-95"
              >
                <Check size={20} />
              </button>
              <button 
                onClick={() => setEditingField(null)}
                className="p-2 text-red-500 hover:bg-red-500/10 rounded-[var(--radius)] transition-all hover:scale-110 active:scale-95"
              >
                <X size={20} />
              </button>
            </div>
          ) : (
            <button 
              onClick={() => handleStartEdit(field, field === 'password' ? '' : value)}
              className="text-emerald-500 hover:text-emerald-600 dark:text-emerald-400 dark:hover:text-emerald-300 text-[11px] md:text-sm font-black flex items-center gap-2 transition-all px-4 py-2 rounded-[var(--radius)] bg-transparent hover:bg-emerald-500/10"
            >
              <Edit2 size={16} />
              {t('edit').toUpperCase()}
            </button>
          )}
        </div>
      </div>
    );
  };

  const navItems = [
    { id: 'profile', icon: <User size={18} />, label: t('profile') },
    { id: 'preferences', icon: <Monitor size={18} />, label: t('preferences') },
  ];

  const kycStatus = user.kyc_status === 'verified' ? t('verified') : (user.kyc_status === 'pending' ? t('kycPending') : t('kycNone'));
  const planName = user.subscription ? (dir === 'rtl' ? user.subscription.plan_name_ar || user.subscription.plan_name_en : user.subscription.plan_name_en) : t('freeOnly');

  return (
    <div className="space-y-8 relative">
      {/* Category Tabs */}
      <div className="flex gap-2 p-1 bg-white dark:bg-zinc-900 rounded-[var(--radius)] border border-slate-200 dark:border-zinc-800 max-w-fit mx-auto md:mx-0">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveCategory(item.id as any)}
            className={`flex items-center gap-2 px-6 py-2 text-[10px] font-black uppercase tracking-widest transition-all duration-300 rounded-[var(--radius)] ${
              activeCategory === item.id 
                ? 'bg-zinc-100 dark:bg-zinc-800 text-emerald-500 shadow-lg' 
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-zinc-800/50'
            }`}
          >
            {item.icon}
            <span className="hidden md:inline">{item.label}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeCategory === 'profile' && (
          <motion.div
            key="profile"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-1"
          >
             {/* Avatar Section */}
            <div className="flex items-center justify-between py-10 border-b border-[var(--border-main)] group">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept="image/*"
              />
              <div className="flex items-center gap-6">
                <div className="relative">
                  {user.avatar ? (
                    <img 
                      src={user.avatar} 
                      alt="Avatar" 
                      className="w-20 h-20 rounded-[var(--radius)] object-cover border-4 transition-all duration-300 shadow-xl"
                      style={{ borderColor: user.subscription?.plan_color || 'transparent' }}
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div 
                      className="w-20 h-20 rounded-[var(--radius)] bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex items-center justify-center text-slate-400 dark:text-slate-500 group-hover:text-emerald-500 transition-all duration-300 border-4"
                      style={{ borderColor: user.subscription?.plan_color || 'transparent' }}
                    >
                      {isUploading ? <Loader2 className="animate-spin" /> : <Camera size={28} />}
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 p-2 bg-emerald-500 rounded-[var(--radius)] text-white shadow-lg cursor-pointer hover:scale-110 active:scale-95 transition-all" onClick={() => fileInputRef.current?.click()}>
                    {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">{t('avatar')}</p>
                  <div className="flex items-center gap-3">
                    {user.subscription?.plan_name_en && (
                      <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        {user.subscription.plan_name_en}
                      </span>
                    )}
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">
                       {user.kyc_status === 'verified' ? <Check size={14} className="inline text-blue-500 mr-1" /> : null}
                       ID_{user.id?.toString().slice(-4)}
                    </span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="text-emerald-500 hover:text-emerald-600 dark:text-emerald-400 dark:hover:text-emerald-300 text-sm font-black flex items-center gap-2 transition-all px-4 py-2 rounded-[var(--radius)] bg-transparent hover:bg-emerald-500/10"
              >
                {t('edit').toUpperCase()}
              </button>
            </div>

            {renderEditableField(t('userName'), 'name', user.name || '', <User size={20} />)}
            {renderEditableField(t('email'), 'email', user.email || '', <Mail size={20} />, 'email')}
            {renderEditableField(t('password'), 'password', '', <Lock size={20} />, 'password')}

            <div className="flex items-center justify-between py-10 border-b border-[var(--border-main)]">
              <div className="flex items-center gap-6">
                <div className="p-3 rounded-[var(--radius)] bg-[var(--bg-primary)] text-slate-500 dark:text-slate-400">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">{t('kycStatus')}</p>
                  <p className={`font-black text-sm tracking-widest uppercase flex items-center gap-2 ${user.kyc_status === 'verified' ? 'text-emerald-500' : 'text-slate-800 dark:text-slate-100'}`}>
                    {kycStatus}
                    {user.kyc_status === 'verified' && <Check size={14} />}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between py-10 border-b border-[var(--border-main)]">
              <div className="flex items-center gap-6">
                <div className="p-3 rounded-[var(--radius)] bg-[var(--bg-primary)] text-slate-500 dark:text-slate-400">
                  <CreditCard size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">{t('currentPlan')}</p>
                  <p className="font-black text-sm tracking-[0.2em] text-emerald-500 uppercase flex items-center gap-2 shadow-emerald-500/10">
                    {planName}
                    {user.subscription?.status === 'active' && <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeCategory === 'preferences' && (
          <motion.div
            key="preferences"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-1"
          >
            {/* Language Selection */}
            <div className="flex items-center justify-between py-8 border-b border-[var(--border-main)] group">
               <div className="flex items-center gap-6">
                  <div className="p-3 rounded-[var(--radius)] bg-[var(--bg-primary)] text-slate-500 dark:text-slate-400 group-hover:text-emerald-500 transition-all duration-300">
                    <Languages size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">{t('languagePreference') || 'Platform Language'}</p>
                    <p className="font-bold text-base text-slate-900 dark:text-slate-100">{language === 'ar' ? 'العربية' : 'English'}</p>
                  </div>
               </div>
               <div className="flex gap-2 p-1 bg-white dark:bg-zinc-900 rounded-[var(--radius)] border border-slate-200 dark:border-zinc-800">
                  <button 
                    onClick={() => setLanguage('ar')}
                    className={`px-4 py-2 rounded-[var(--radius)] text-[10px] font-black uppercase tracking-widest transition-all ${language === 'ar' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/40' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-zinc-800/50'}`}
                  >
                    العربية
                  </button>
                  <button 
                    onClick={() => setLanguage('en')}
                    className={`px-4 py-2 rounded-[var(--radius)] text-[10px] font-black uppercase tracking-widest transition-all ${language === 'en' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/40' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-zinc-800/50'}`}
                  >
                    English
                  </button>
               </div>
            </div>

            {/* Theme Selection */}
            <div className="flex items-center justify-between py-8 border-b border-[var(--border-main)] group">
               <div className="flex items-center gap-6">
                  <div className="p-3 rounded-[var(--radius)] bg-[var(--bg-primary)] text-slate-500 dark:text-slate-400 group-hover:text-amber-500 transition-all duration-300">
                    <Monitor size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">{t('themePreference')}</p>
                    <p className="font-bold text-base text-slate-800 dark:text-slate-100 uppercase">{theme === 'system' ? t('systemMode') : theme === 'dark' ? t('darkMode') : t('lightMode')}</p>
                  </div>
               </div>
               <div className="flex gap-2 p-1 bg-white dark:bg-zinc-900 rounded-[var(--radius)] border border-slate-200 dark:border-zinc-800">
                  <button 
                    onClick={() => setTheme('light')}
                    className={`px-4 py-2 rounded-[var(--radius)] text-[10px] font-black uppercase tracking-widest transition-all ${theme === 'light' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/40' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-zinc-800/50'}`}
                  >
                    {t('lightMode')}
                  </button>
                  <button 
                    onClick={() => setTheme('dark')}
                    className={`px-4 py-2 rounded-[var(--radius)] text-[10px] font-black uppercase tracking-widest transition-all ${
                      theme === 'dark' 
                        ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/40' 
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-zinc-800/50'
                    }`}
                  >
                    {t('darkMode')}
                  </button>
                  <button 
                    onClick={() => setTheme('system')}
                    className={`px-4 py-2 rounded-[var(--radius)] text-[10px] font-black uppercase tracking-widest transition-all ${
                      theme === 'system' 
                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/40' 
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-zinc-800/50'
                    }`}
                  >
                    {t('systemMode')}
                  </button>
               </div>
            </div>

            <div className="p-8 rounded-[var(--radius)] border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 mt-12">
               <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-[var(--radius)] bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                     <Target size={24} />
                  </div>
                  <div className="space-y-2">
                     <h4 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-slate-100">
                        {dir === 'rtl' ? 'تزامن التفضيلات عالمياً' : 'Global Preference Sync'}
                     </h4>
                     <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                        {dir === 'rtl' 
                          ? 'يتم تخزين جميع تفضيلاتك وتهيئة الذكاء بشكل آمن في السحابة ومزامنتها عبر جميع أجهزتك.' 
                          : 'All your preferences and intelligence calibrations are stored securely in the cloud and synced across all your devices.'}
                     </p>
                  </div>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

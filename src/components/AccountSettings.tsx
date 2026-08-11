import React, { useState, useRef, useEffect } from 'react';
import { User, Mail, Lock, Camera, Edit2, ShieldCheck, CreditCard, Check, X, Loader2, Sparkles, Languages, Monitor, Briefcase, Zap, Target, BookOpen, Code2, LayoutGrid, Archive } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { motion, AnimatePresence } from 'motion/react';
import { resolveImageUrl } from '../utils/imageResolver';
import { ThemeToggleButton } from './ThemeToggleButton';
import { StoryArchive } from './StoryArchive';

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
  const [activeCategory, setActiveCategory] = useState<'profile' | 'preferences' | 'archive'>('profile');
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
          <div className="p-3 rounded-[var(--radius)] bg-[var(--surface-subtle)] text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-theme shrink-0">
            {React.cloneElement(icon as React.ReactElement<{ size?: number; className?: string }>, { size: 20 })}
          </div>
          <div className="flex-1 w-full">
            <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">{label}</p>
            {isEditing ? (
              multiline ? (
                <textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full p-4 rounded-[var(--radius)] border focus:outline-none focus:ring-1 focus:ring-[var(--border-accent)] focus:border-[var(--border-accent)] transition-theme font-medium bg-[var(--surface-subtle)] border-[var(--border-main)] text-[var(--text-primary)] min-h-[120px] text-sm"
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
                  className="w-full p-3 rounded-[var(--radius)] border focus:outline-none focus:ring-1 focus:ring-[var(--border-accent)] focus:border-[var(--border-accent)] transition-theme font-bold bg-[var(--surface-subtle)] border-[var(--border-main)] text-[var(--text-primary)]"
                  autoFocus
                />
              </form>
            )
            ) : (
              <p className={`font-bold text-[var(--text-primary)] tracking-tight ${multiline ? 'text-sm whitespace-pre-wrap leading-relaxed opacity-95' : 'text-base'}`}>
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
                className="p-2 text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] rounded-[var(--radius)] transition-theme"
              >
                <Check size={20} />
              </button>
              <button 
                onClick={() => setEditingField(null)}
                className="p-2 text-[var(--fg-danger)] hover:bg-[var(--bg-danger-muted)] rounded-[var(--radius)] transition-theme"
              >
                <X size={20} />
              </button>
            </div>
          ) : (
            <button 
              onClick={() => handleStartEdit(field, field === 'password' ? '' : value)}
              className="text-[var(--text-primary)] text-[11px] md:text-sm font-black flex items-center gap-2 transition-theme px-4 py-2 rounded-[var(--radius)] bg-transparent hover:bg-[var(--surface-subtle)]"
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
    { id: 'archive', icon: <Archive size={18} />, label: dir === 'rtl' ? 'الأرشيف' : 'Archive' },
  ];

  const kycStatus = user.kyc_status === 'verified' ? t('verified') : (user.kyc_status === 'pending' ? t('kycPending') : t('kycNone'));
  const planName = user.subscription ? (dir === 'rtl' ? user.subscription.plan_name_ar || user.subscription.plan_name_en : user.subscription.plan_name_en) : t('freeOnly');

  return (
    <div className="space-y-8 relative">
      {/* Category Tabs */}
      <div className="flex gap-2 p-1 bg-[var(--surface-card)] rounded-[var(--radius)] border border-[var(--border-main)] max-w-fit mx-auto md:mx-0">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveCategory(item.id as any)}
            className={`flex items-center gap-2 px-6 py-2 text-[10px] font-black uppercase tracking-widest transition-theme rounded-[var(--radius)] ${
              activeCategory === item.id 
                ? 'bg-[var(--surface-subtle)] text-[var(--text-primary)] border border-[var(--border-main)]' 
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)]'
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
                      src={resolveImageUrl(user.avatar, 'avatar')} 
                      alt="Avatar" 
                      className="w-20 h-20 rounded-[var(--radius)] object-cover border-4 transition-theme"
                      style={{ borderColor: user.subscription?.plan_color || 'transparent' }}
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div 
                      className="w-20 h-20 rounded-[var(--radius)] bg-[var(--surface-subtle)] border border-[var(--border-main)] flex items-center justify-center text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-theme border-4"
                      style={{ borderColor: user.subscription?.plan_color || 'transparent' }}
                    >
                      {isUploading ? <Loader2 className="animate-spin" /> : <Camera size={28} />}
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 p-2 bg-[var(--bg-accent-emphasis)] rounded-[var(--radius)] text-[var(--fg-on-emphasis)] cursor-pointer hover:scale-105 active:scale-95 transition-theme" onClick={() => fileInputRef.current?.click()}>
                    {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">{t('avatar')}</p>
                  <div className="flex items-center gap-3">
                    {user.subscription?.plan_name_en && (
                      <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-[var(--bg-accent-muted)] text-[var(--text-primary)] border border-[var(--border-accent)]">
                        {user.subscription.plan_name_en}
                      </span>
                    )}
                    <span className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-widest">
                       {user.kyc_status === 'verified' ? <Check size={14} className="inline text-[var(--fg-info)] mr-1" /> : null}
                       ID_{user.id?.toString().slice(-4)}
                    </span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="text-[var(--text-primary)] text-sm font-black flex items-center gap-2 transition-theme px-4 py-2 rounded-[var(--radius)] bg-transparent hover:bg-[var(--surface-subtle)]"
              >
                {t('edit').toUpperCase()}
              </button>
            </div>

            {renderEditableField(t('userName'), 'name', user.name || '', <User size={20} />)}
            {renderEditableField(t('email'), 'email', user.email || '', <Mail size={20} />, 'email')}
            {renderEditableField(t('password'), 'password', '', <Lock size={20} />, 'password')}

            <div className="flex items-center justify-between py-10 border-b border-[var(--border-main)]">
              <div className="flex items-center gap-6">
                <div className="p-3 rounded-[var(--radius)] bg-[var(--surface-subtle)] text-[var(--text-muted)]">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">{t('kycStatus')}</p>
                  <p className={`font-black text-sm tracking-widest uppercase flex items-center gap-2 ${user.kyc_status === 'verified' ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
                    {kycStatus}
                    {user.kyc_status === 'verified' && <Check size={14} />}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between py-10 border-b border-[var(--border-main)]">
              <div className="flex items-center gap-6">
                <div className="p-3 rounded-[var(--radius)] bg-[var(--surface-subtle)] text-[var(--text-muted)]">
                  <CreditCard size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">{t('currentPlan')}</p>
                  <p className="font-black text-sm tracking-[0.2em] text-[var(--text-primary)] uppercase flex items-center gap-2">
                    {planName}
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
                  <div className="p-3 rounded-[var(--radius)] bg-[var(--surface-subtle)] text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-theme">
                    <Languages size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">{t('languagePreference') || 'Platform Language'}</p>
                    <p className="font-bold text-base text-[var(--text-primary)]">{language === 'ar' ? 'العربية' : 'English'}</p>
                  </div>
               </div>
               <div className="flex gap-2 p-1 bg-[var(--surface-card)] rounded-[var(--radius)] border border-[var(--border-main)]">
                  <button 
                    onClick={() => setLanguage('ar')}
                    className={`px-4 py-2 rounded-[var(--radius)] text-[10px] font-black uppercase tracking-widest transition-theme ${language === 'ar' ? 'bg-[var(--bg-accent-emphasis)] text-[var(--fg-on-emphasis)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)]'}`}
                  >
                    العربية
                  </button>
                  <button 
                    onClick={() => setLanguage('en')}
                    className={`px-4 py-2 rounded-[var(--radius)] text-[10px] font-black uppercase tracking-widest transition-theme ${language === 'en' ? 'bg-[var(--bg-accent-emphasis)] text-[var(--fg-on-emphasis)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)]'}`}
                  >
                    English
                  </button>
               </div>
            </div>

            {/* Theme Selection */}
            <div className="flex items-center justify-between py-8 border-b border-[var(--border-main)] group">
               <div className="flex items-center gap-6">
                  <div className="p-3 rounded-[var(--radius)] bg-[var(--surface-subtle)] text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-theme">
                    <Monitor size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">{t('themePreference')}</p>
                    <p className="font-bold text-base text-[var(--text-primary)] uppercase">{theme === 'system' ? t('systemMode') : theme === 'dark' ? t('darkMode') : t('lightMode')}</p>
                  </div>
               </div>
               <ThemeToggleButton variant="segmented" />
            </div>

            {/* Email Notifications */}
            <div className="flex items-center justify-between py-8 border-b border-[var(--border-main)] group">
               <div className="flex items-center gap-6">
                  <div className="p-3 rounded-[var(--radius)] bg-[var(--surface-subtle)] text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-theme">
                    <Mail size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">{dir === 'rtl' ? 'إشعارات البريد' : 'Email Notifications'}</p>
                    <p className="font-bold text-base text-[var(--text-primary)] uppercase">{user.email_notifications !== false ? (dir === 'rtl' ? 'مفعل' : 'Enabled') : (dir === 'rtl' ? 'معطل' : 'Disabled')}</p>
                  </div>
               </div>
               <div className="flex gap-2 p-1 bg-[var(--surface-card)] rounded-[var(--radius)] border border-[var(--border-main)]">
                  <button 
                    onClick={() => onUpdate({ email_notifications: true })}
                    className={`px-4 py-2 rounded-[var(--radius)] text-[10px] font-black uppercase tracking-widest transition-theme ${user.email_notifications !== false ? 'bg-[var(--bg-accent-emphasis)] text-[var(--fg-on-emphasis)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)]'}`}
                  >
                    {dir === 'rtl' ? 'تفعيل' : 'Enable'}
                  </button>
                  <button 
                    onClick={() => onUpdate({ email_notifications: false })}
                    className={`px-4 py-2 rounded-[var(--radius)] text-[10px] font-black uppercase tracking-widest transition-theme ${
                      user.email_notifications === false 
                        ? 'bg-[var(--bg-danger-emphasis)] text-[var(--fg-on-emphasis)]' 
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)]'
                    }`}
                  >
                    {dir === 'rtl' ? 'تعطيل' : 'Disable'}
                  </button>
               </div>
            </div>

            <div className="p-8 rounded-[var(--radius)] border border-[var(--border-main)] bg-[var(--surface-card)] mt-12">
               <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-[var(--radius)] bg-[var(--bg-accent-muted)] flex items-center justify-center text-[var(--text-primary)] shrink-0">
                     <Target size={24} />
                  </div>
                  <div className="space-y-2">
                     <h4 className="text-sm font-black uppercase tracking-widest text-[var(--text-primary)]">
                        {dir === 'rtl' ? 'تزامن التفضيلات عالمياً' : 'Global Preference Sync'}
                     </h4>
                     <p className="text-[11px] text-[var(--text-muted)] font-medium leading-relaxed">
                        {dir === 'rtl' 
                          ? 'يتم تخزين جميع تفضيلاتك وتهيئة الذكاء بشكل آمن في السحابة ومزامنتها عبر جميع أجهزتك.' 
                          : 'All your preferences and intelligence calibrations are stored securely in the cloud and synced across all your devices.'}
                     </p>
                  </div>
               </div>
            </div>
          </motion.div>
        )}
      
        {activeCategory === 'archive' && (
          <motion.div
            key="archive"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar"
          >
            <StoryArchive dir={dir} token={token} showToast={showToast} />
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
};

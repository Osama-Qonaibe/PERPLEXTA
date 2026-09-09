import React, { useState, useRef, useEffect } from 'react';
import { User, Mail, Lock, Camera, Edit2, ShieldCheck, CreditCard, Check, X, Loader2, Languages, Monitor, Target, Archive, Trash2, AlertTriangle, Palette, Sparkles } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { toast } from '../context/NotificationContext';
import { motion, AnimatePresence } from 'motion/react';
import { resolveImageUrl } from '../utils/imageResolver';
import { ThemeToggleButton } from './ThemeToggleButton';
import { StoryArchive } from './StoryArchive';
import { SOVEREIGN_TEMPLATES, applySovereignTemplate, getSavedSovereignTemplate } from '../constants/templates';

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
  const [avatarLoadError, setAvatarLoadError] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState<string>(getSavedSovereignTemplate);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t, token, setIsOperationPending, language, setLanguage, logout } = useAppContext();

  useEffect(() => {
    setAvatarLoadError(false);
  }, [user?.avatar]);

  const notify = (message: string, type: 'success' | 'error' = 'success') => {
    if (showToast) {
      showToast(message, type);
    } else if (type === 'error') {
      toast.error(message);
    } else {
      toast.success(message);
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

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    try {
      const res = await fetch('/api/user/account', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await res.json();
      if (res.ok) {
        notify(dir === 'rtl' ? 'تم حذف حسابك بنجاح. سيتم تحويلك الآن.' : 'Account deleted successfully. Logging out.', 'success');
        setIsDeleteDialogOpen(false);
        setTimeout(() => {
          logout(true);
        }, 600);
      } else {
        notify(data.error || (dir === 'rtl' ? 'فشل حذف الحساب' : 'Failed to delete account'), 'error');
      }
    } catch (error) {
      console.error('Failed to delete account:', error);
      notify(dir === 'rtl' ? 'حدث خطأ أثناء محاولة حذف الحساب' : 'Error deleting account', 'error');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const renderEditableField = (label: string, field: string, value: string, icon: React.ReactNode, type: string = 'text', multiline: boolean = false) => {
    const isEditing = editingField === field;

    return (
      <div className="flex flex-col md:flex-row md:items-center justify-between py-4 sm:py-5 border-b border-[var(--border-main)] group gap-3">
        <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
          <div className="p-2.5 rounded-[var(--radius)] bg-[var(--surface-subtle)] text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-theme shrink-0">
            {React.cloneElement(icon as React.ReactNode as React.ReactElement<{ size?: number; className?: string }>, { size: 18 })}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-0.5">{label}</p>
            {isEditing ? (
              multiline ? (
                <textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full p-3 rounded-[var(--radius)] border focus:outline-none focus:ring-1 focus:ring-[var(--border-accent)] focus:border-[var(--border-accent)] transition-theme font-medium bg-[var(--surface-subtle)] border-[var(--border-main)] text-[var(--text-primary)] min-h-[100px] text-xs sm:text-sm"
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
                  className="w-full p-2.5 rounded-[var(--radius)] border focus:outline-none focus:ring-1 focus:ring-[var(--border-accent)] focus:border-[var(--border-accent)] transition-theme font-bold bg-[var(--surface-subtle)] border-[var(--border-main)] text-[var(--text-primary)] text-xs sm:text-sm"
                  autoFocus
                />
              </form>
            )
            ) : (
              <p className={`font-bold text-[var(--text-primary)] tracking-tight truncate ${multiline ? 'text-xs sm:text-sm whitespace-pre-wrap leading-relaxed opacity-95' : 'text-sm sm:text-base'}`}>
                {field === 'password' ? '••••••••' : (value || t('none'))}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 shrink-0">
          {isEditing ? (
            <div className="flex gap-2">
              <button 
                type="button"
                onClick={handleSave}
                className="p-2 text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] rounded-[var(--radius)] transition-theme cursor-pointer"
              >
                <Check size={18} />
              </button>
              <button 
                type="button"
                onClick={() => setEditingField(null)}
                className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-[var(--radius)] transition-theme cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
          ) : (
            <button 
              type="button"
              onClick={() => handleStartEdit(field, field === 'password' ? '' : value)}
              className="text-[var(--text-primary)] text-xs font-black flex items-center gap-1.5 transition-theme px-3 py-1.5 rounded-[var(--radius)] bg-transparent hover:bg-[var(--surface-subtle)] cursor-pointer"
            >
              <Edit2 size={14} />
              <span>{t('edit').toUpperCase()}</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  const kycStatus = user.kyc_status === 'verified' ? t('verified') : (user.kyc_status === 'pending' ? t('kycPending') : t('kycNone'));
  const planName = user.subscription ? (dir === 'rtl' ? user.subscription.plan_name_ar || user.subscription.plan_name_en : user.subscription.plan_name_en) : t('freeOnly');

  return (
    <div className="space-y-3 sm:space-y-8 relative max-w-4xl mx-auto pb-12">
      
      {/* SECTION 1: Profile & Account Information Card */}
      <div className="bg-[var(--surface-card)] border border-[var(--border-main)] rounded-[var(--radius-lg)] p-3 sm:p-8 shadow-xs space-y-1 sm:space-y-2">
        <div className="flex items-center gap-2.5 sm:gap-3 pb-2.5 sm:pb-4 border-b border-[var(--border-main)] mb-1 sm:mb-2">
          <div className="p-1.5 sm:p-2 rounded-[var(--radius)] bg-[var(--bg-accent-muted)] text-accent shrink-0">
            <User size={18} className="sm:hidden" />
            <User size={20} className="hidden sm:block" />
          </div>
          <div>
            <h2 className="text-xs sm:text-base font-black uppercase tracking-wider text-[var(--text-primary)]">
              <span className="sm:hidden">{dir === 'rtl' ? 'الملف الشخصي' : 'Profile'}</span>
              <span className="hidden sm:inline">{dir === 'rtl' ? 'الملف الشخصي والحساب' : 'Profile & Account'}</span>
            </h2>
            <p className="hidden sm:block text-xs text-[var(--text-muted)] font-medium">
              {dir === 'rtl' ? 'إدارة بياناتك الشخصية وبيانات الاعتماد' : 'Manage your personal details and credentials'}
            </p>
          </div>
        </div>

        {/* Avatar Section */}
        <div className="flex items-center justify-between py-2.5 sm:py-5 border-b border-[var(--border-main)] group">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
            accept="image/*"
          />
          <div className="flex items-center gap-3 sm:gap-5 min-w-0">
            <div className="relative shrink-0">
              {user.avatar && !avatarLoadError ? (
                <img 
                  src={resolveImageUrl(user.avatar, 'avatar')} 
                  alt="Avatar" 
                  onError={() => setAvatarLoadError(true)}
                  className="w-11 h-11 sm:w-20 sm:h-20 rounded-[var(--radius)] object-cover border-2 sm:border-4 transition-theme"
                  style={{ borderColor: user.subscription?.plan_color || 'transparent' }}
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div 
                  className="w-11 h-11 sm:w-20 sm:h-20 rounded-[var(--radius)] bg-[var(--surface-subtle)] border border-[var(--border-main)] flex items-center justify-center text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-theme border-2 sm:border-4"
                  style={{ borderColor: user.subscription?.plan_color || 'transparent' }}
                >
                  {isUploading ? <Loader2 className="animate-spin" size={16} /> : <Camera size={18} />}
                </div>
              )}
              <div 
                className="absolute -bottom-1 -right-1 p-1 sm:p-1.5 bg-[var(--bg-accent-emphasis)] rounded-[var(--radius)] text-[var(--fg-on-emphasis)] cursor-pointer hover:scale-105 active:scale-95 transition-theme shadow-xs" 
                onClick={() => fileInputRef.current?.click()}
              >
                {isUploading ? <Loader2 size={10} className="animate-spin" /> : <Camera size={10} />}
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-[9px] sm:text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-0.5">{t('avatar')}</p>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                {user.subscription?.plan_name_en && (
                  <span className="px-1.5 sm:px-2.5 py-0.5 rounded-[4px] text-[8px] sm:text-[9px] font-black uppercase tracking-wider bg-[var(--bg-accent-muted)] text-[var(--text-primary)] border border-[var(--border-accent)]">
                    {user.subscription.plan_name_en}
                  </span>
                )}
                <span className="text-[10px] sm:text-xs text-[var(--text-muted)] font-bold uppercase tracking-wider">
                   ID_{user.id?.toString().slice(-4)}
                </span>
              </div>
            </div>
          </div>
          <button 
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="text-[var(--text-primary)] text-xs font-black flex items-center gap-1 transition-theme p-1.5 sm:px-3 sm:py-2 rounded-[var(--radius)] bg-transparent hover:bg-[var(--surface-subtle)] border border-[var(--border-main)] sm:border-transparent shrink-0 cursor-pointer"
            title={t('edit')}
          >
            <Edit2 size={13} className="sm:hidden" />
            <span className="hidden sm:inline">{t('edit').toUpperCase()}</span>
          </button>
        </div>

        {renderEditableField(t('userName'), 'name', user.name || '', <User size={18} />)}
        {renderEditableField(t('email'), 'email', user.email || '', <Mail size={18} />, 'email')}
        {renderEditableField(t('password'), 'password', '', <Lock size={18} />, 'password')}

        <div className="flex items-center justify-between py-2.5 sm:py-5 border-b border-[var(--border-main)]">
          <div className="flex items-center gap-3 sm:gap-5 min-w-0">
            <div className="p-2 sm:p-2.5 rounded-[var(--radius)] bg-[var(--surface-subtle)] text-[var(--text-muted)] shrink-0">
              <ShieldCheck size={16} className="sm:w-[18px] sm:h-[18px]" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] sm:text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-0.5">{t('kycStatus')}</p>
              <p className="font-black text-xs sm:text-sm tracking-wider uppercase text-[var(--text-primary)] flex items-center gap-1.5 truncate">
                {kycStatus}
                {user.kyc_status === 'verified' && <Check size={14} className="text-[var(--fg-success)] shrink-0" />}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between py-2.5 sm:py-5">
          <div className="flex items-center gap-3 sm:gap-5 min-w-0">
            <div className="p-2 sm:p-2.5 rounded-[var(--radius)] bg-[var(--surface-subtle)] text-[var(--text-muted)] shrink-0">
              <CreditCard size={16} className="sm:w-[18px] sm:h-[18px]" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] sm:text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-0.5">{t('currentPlan')}</p>
              <p className="font-black text-xs sm:text-sm tracking-wider text-[var(--text-primary)] uppercase flex items-center gap-1.5 truncate">
                {planName}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: Preferences & Appearance Card */}
      <div className="bg-[var(--surface-card)] border border-[var(--border-main)] rounded-[var(--radius-lg)] p-3 sm:p-8 shadow-xs space-y-1 sm:space-y-2">
        <div className="flex items-center gap-2.5 sm:gap-3 pb-2.5 sm:pb-4 border-b border-[var(--border-main)] mb-1 sm:mb-2">
          <div className="p-1.5 sm:p-2 rounded-[var(--radius)] bg-[var(--bg-accent-muted)] text-accent shrink-0">
            <Monitor size={18} className="sm:hidden" />
            <Monitor size={20} className="hidden sm:block" />
          </div>
          <div>
            <h2 className="text-xs sm:text-base font-black uppercase tracking-wider text-[var(--text-primary)]">
              {dir === 'rtl' ? 'التفضيلات والمظهر' : 'Preferences & Appearance'}
            </h2>
            <p className="hidden sm:block text-xs text-[var(--text-muted)] font-medium">
              {dir === 'rtl' ? 'تخصيص لغة المنصة والثيم والسمات البصرية' : 'Customize platform language, theme, and visual styling'}
            </p>
          </div>
        </div>

        {/* Language Selection */}
        <div className="flex items-center justify-between py-2.5 sm:py-5 border-b border-[var(--border-main)] group gap-2">
           <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <div className="p-2 sm:p-2.5 rounded-[var(--radius)] bg-[var(--surface-subtle)] text-[var(--text-muted)] shrink-0">
                <Languages size={16} className="sm:w-[18px] sm:h-[18px]" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] sm:text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-0.5">{t('languagePreference') || 'Platform Language'}</p>
                <p className="font-bold text-xs sm:text-sm text-[var(--text-primary)] truncate">{language === 'ar' ? 'العربية' : 'English'}</p>
              </div>
           </div>
           <div className="flex gap-1 p-0.5 sm:p-1 bg-[var(--surface-subtle)] rounded-[var(--radius)] border border-[var(--border-main)] shrink-0">
              <button 
                type="button"
                onClick={() => setLanguage('ar')}
                className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-[var(--radius)] text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-theme cursor-pointer ${language === 'ar' ? 'bg-[var(--bg-accent-emphasis)] text-[var(--fg-on-emphasis)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
              >
                العربية
              </button>
              <button 
                type="button"
                onClick={() => setLanguage('en')}
                className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-[var(--radius)] text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-theme cursor-pointer ${language === 'en' ? 'bg-[var(--bg-accent-emphasis)] text-[var(--fg-on-emphasis)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
              >
                English
              </button>
           </div>
        </div>

        {/* Theme Selection */}
        <div className="flex items-center justify-between py-2.5 sm:py-5 border-b border-[var(--border-main)] group gap-2">
           <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <div className="p-2 sm:p-2.5 rounded-[var(--radius)] bg-[var(--surface-subtle)] text-[var(--text-muted)] shrink-0">
                <Monitor size={16} className="sm:w-[18px] sm:h-[18px]" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] sm:text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-0.5">{t('themePreference')}</p>
                <p className="font-bold text-xs sm:text-sm text-[var(--text-primary)] uppercase truncate">{theme === 'system' ? t('systemMode') : theme === 'dark' ? t('darkMode') : t('lightMode')}</p>
              </div>
           </div>
           <div className="shrink-0 scale-90 sm:scale-100">
             <ThemeToggleButton variant="segmented" />
           </div>
        </div>

        {/* Sovereign Aesthetic Template Engine Selector */}
        <div className="py-3 sm:py-5 border-b border-[var(--border-main)] space-y-2 sm:space-y-3">
           <div className="flex items-center gap-3 sm:gap-4">
              <div className="p-2 sm:p-2.5 rounded-[var(--radius)] bg-[var(--surface-subtle)] text-[var(--text-muted)] shrink-0">
                <Palette size={16} className="sm:w-[18px] sm:h-[18px]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[9px] sm:text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">{dir === 'rtl' ? 'القالب اللوني السيادي' : 'Sovereign Color Palette'}</p>
                </div>
                <p className="font-bold text-xs sm:text-sm text-[var(--text-primary)] truncate">
                  {SOVEREIGN_TEMPLATES.find(t => t.id === currentTemplate)?.[dir === 'rtl' ? 'nameAr' : 'name'] || 'Claude Classic Dark'}
                </p>
              </div>
           </div>

           {/* Template Cards Grid - Compact Tiles on Mobile */}
           <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 pt-1">
             {SOVEREIGN_TEMPLATES.map((tmpl) => {
               const isSelected = currentTemplate === tmpl.id;
               return (
                 <button
                   key={tmpl.id}
                   type="button"
                   onClick={() => {
                     applySovereignTemplate(tmpl.id);
                     setCurrentTemplate(tmpl.id);
                     notify(dir === 'rtl' ? `تم تفعيل قالب ${tmpl.nameAr}` : `Activated ${tmpl.name} template`);
                   }}
                   className={`p-2.5 sm:p-3 rounded-[var(--radius)] border text-start transition-all cursor-pointer relative overflow-hidden group/tmpl ${
                     isSelected
                       ? 'border-[var(--border-accent)] bg-[var(--surface-subtle)] shadow-xs ring-1 ring-[var(--border-accent)]'
                       : 'border-[var(--border-main)] bg-[var(--surface-subtle)]/50 hover:bg-[var(--surface-subtle)]'
                   }`}
                 >
                   <div className="flex items-center justify-between mb-1 sm:mb-1.5">
                     <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                       <div 
                         className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border border-black/30 shadow-2xs shrink-0"
                         style={{ backgroundColor: tmpl.accentColor }} 
                       />
                       <span className="text-[11px] sm:text-xs font-black text-[var(--text-primary)] truncate">
                         {dir === 'rtl' ? tmpl.nameAr : tmpl.name}
                       </span>
                     </div>
                     {isSelected && (
                       <span className="w-3.5 h-3.5 rounded-full bg-[var(--bg-accent-emphasis)] text-[var(--fg-on-emphasis)] flex items-center justify-center text-[9px] shrink-0">
                         <Check size={9} className="stroke-[3]" />
                       </span>
                     )}
                   </div>
                   <p className="hidden sm:block text-[10px] text-[var(--text-muted)] font-medium line-clamp-2 leading-tight">
                     {dir === 'rtl' ? tmpl.descriptionAr : tmpl.description}
                   </p>
                 </button>
               );
             })}
           </div>
        </div>

        {/* Email Notifications */}
        <div className="flex items-center justify-between py-2.5 sm:py-5 group gap-2">
           <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <div className="p-2 sm:p-2.5 rounded-[var(--radius)] bg-[var(--surface-subtle)] text-[var(--text-muted)] shrink-0">
                <Mail size={16} className="sm:w-[18px] sm:h-[18px]" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] sm:text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-0.5">{dir === 'rtl' ? 'إشعارات البريد' : 'Email Notifications'}</p>
                <p className="font-bold text-xs sm:text-sm text-[var(--text-primary)] uppercase truncate">{user.email_notifications !== false ? (dir === 'rtl' ? 'مفعل' : 'Enabled') : (dir === 'rtl' ? 'معطل' : 'Disabled')}</p>
              </div>
           </div>
           <div className="flex gap-1 p-0.5 sm:p-1 bg-[var(--surface-subtle)] rounded-[var(--radius)] border border-[var(--border-main)] shrink-0">
              <button 
                type="button"
                onClick={() => onUpdate({ email_notifications: true })}
                className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-[var(--radius)] text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-theme cursor-pointer ${user.email_notifications !== false ? 'bg-[var(--bg-accent-emphasis)] text-[var(--fg-on-emphasis)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
              >
                {dir === 'rtl' ? 'تفعيل' : 'Enable'}
              </button>
              <button 
                type="button"
                onClick={() => onUpdate({ email_notifications: false })}
                className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-[var(--radius)] text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-theme cursor-pointer ${
                  user.email_notifications === false 
                    ? 'bg-rose-600 text-white' 
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                {dir === 'rtl' ? 'تعطيل' : 'Disable'}
              </button>
           </div>
        </div>
      </div>

      {/* SECTION 3: Archive & Data Card */}
      <div className="bg-[var(--surface-card)] border border-[var(--border-main)] rounded-[var(--radius-lg)] p-3 sm:p-8 shadow-xs space-y-2 sm:space-y-4">
        <div className="flex items-center gap-2.5 sm:gap-3 pb-2.5 sm:pb-4 border-b border-[var(--border-main)]">
          <div className="p-1.5 sm:p-2 rounded-[var(--radius)] bg-[var(--bg-accent-muted)] text-accent shrink-0">
            <Archive size={18} className="sm:hidden" />
            <Archive size={20} className="hidden sm:block" />
          </div>
          <div>
            <h2 className="text-xs sm:text-base font-black uppercase tracking-wider text-[var(--text-primary)]">
              {dir === 'rtl' ? 'أرشيف القصص والبيانات' : 'Stories & Data Archive'}
            </h2>
            <p className="hidden sm:block text-xs text-[var(--text-muted)] font-medium">
              {dir === 'rtl' ? 'استعراض المحتوى والأرشيف المؤقت' : 'Review archived stories and temporary records'}
            </p>
          </div>
        </div>
        <div className="pt-1 sm:pt-2">
          <StoryArchive dir={dir} token={token} showToast={showToast} />
        </div>
      </div>

      {/* SECTION 4: Danger Zone (Account Deletion) */}
      <div className="p-3 sm:p-6 rounded-[var(--radius-lg)] border border-rose-500/20 bg-rose-500/[0.03] transition-theme">
        <div className="flex flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
            <div className="p-2 sm:p-2.5 rounded-[var(--radius)] bg-rose-500/10 text-rose-600 dark:text-rose-400 shrink-0">
              <Trash2 size={18} className="sm:hidden" />
              <Trash2 size={20} className="hidden sm:block" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 truncate">
                {dir === 'rtl' ? 'حذف الحساب نهائياً' : 'Permanent Account Deletion'}
              </h4>
              <p className="hidden sm:block text-xs text-[var(--text-secondary)] leading-relaxed max-w-xl mt-1">
                {dir === 'rtl'
                  ? 'عند حذف حسابك، سيتم محو جميع بياناتك ومحادثاتك وسجلاتك ومحفظتك بالكامل. هذا الإجراء نهائي ولا يمكن التراجع عنه.'
                  : 'Once deleted, all your profile data, chats, records, and wallet history will be permanently erased. This action is irreversible.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsDeleteDialogOpen(true)}
            className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-[var(--radius)] text-[10px] sm:text-xs font-black uppercase tracking-wider text-white bg-rose-600 hover:bg-rose-700 active:scale-95 transition-theme shrink-0 shadow-xs cursor-pointer"
          >
            {dir === 'rtl' ? 'حذف الحساب' : 'Delete'}
          </button>
        </div>
      </div>

      {/* Account Deletion Confirmation Dialog */}
      <AnimatePresence>
        {isDeleteDialogOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md bg-[var(--surface-card)] border border-[var(--border-main)] rounded-[var(--radius)] p-5 sm:p-6 shadow-2xl space-y-4 sm:space-y-5"
            >
              <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
                <div className="p-2 rounded-[4px] bg-rose-500/10 shrink-0">
                  <AlertTriangle size={20} className="sm:w-6 sm:h-6" />
                </div>
                <h3 className="text-xs sm:text-base font-black uppercase tracking-wider">
                  {dir === 'rtl' ? 'تأكيد حذف الحساب' : 'Confirm Account Deletion'}
                </h3>
              </div>

              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                {dir === 'rtl'
                  ? 'هل أنت متأكد تماماً من رغبتك في حذف حسابك؟ سيتم حذف جميع بياناتك ومحادثاتك وسجلاتك فوراً وبشكل لا يمكن استرداده لاحقاً.'
                  : 'Are you absolutely sure you want to delete your account? All your data, chats, and records will be permanently erased and cannot be recovered.'}
              </p>

              <div className="flex items-center justify-end gap-2.5 sm:gap-3 pt-3 border-t border-[var(--border-main)]">
                <button
                  type="button"
                  disabled={isDeletingAccount}
                  onClick={() => setIsDeleteDialogOpen(false)}
                  className="px-3 sm:px-4 py-2 rounded-[var(--radius)] text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] transition-theme cursor-pointer"
                >
                  {dir === 'rtl' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="button"
                  disabled={isDeletingAccount}
                  onClick={handleDeleteAccount}
                  className="px-3 sm:px-4 py-2 rounded-[var(--radius)] text-xs font-black text-white bg-rose-600 hover:bg-rose-700 active:scale-95 transition-theme flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isDeletingAccount && <Loader2 size={14} className="animate-spin" />}
                  {dir === 'rtl' ? 'حذف نهائي' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

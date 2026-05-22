import React, { useState, useRef, useEffect } from 'react';
import { User, Mail, Lock, Camera, Edit2, ShieldCheck, CreditCard, Check, X, Loader2, Sparkles, Languages, Monitor, Briefcase, Zap, Target, BookOpen, Code2, LayoutGrid } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { motion, AnimatePresence } from 'motion/react';

interface AccountSettingsProps {
  user: any;
  onUpdate: (updates: any) => void;
  dir: 'rtl' | 'ltr';
  theme: 'dark' | 'light';
  showToast?: (message: string, type?: 'success' | 'error') => void;
}

export const AccountSettings: React.FC<AccountSettingsProps> = ({ user, onUpdate, dir, theme, showToast }) => {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<'profile' | 'intelligence' | 'preferences'>('profile');
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

  const PRESETS = [
    { id: 'precise', icon: <Target size={16} />, en: 'Perplexta Precise', ar: 'بيربليكستا الدقيق', desc_en: 'Strategic, concise, high authority.', desc_ar: 'استراتيجي، موجز، ذو سلطة عالية.' },
    { id: 'direct', icon: <Zap size={16} />, en: 'Direct & Concise', ar: 'مباشر وقليل الشروحات', desc_en: 'Straight to the point, minimal fluff.', desc_ar: 'مباشر، يركز على الجوهر، أقل قدر من المقدمات.' },
    { id: 'executive', icon: <Zap size={16} />, en: 'Executive Brief', ar: 'الموجز التنفيذي', desc_en: 'Action-oriented, bullet points, ROI focused.', desc_ar: 'موجه للعمل، نقاط مختصرة، يركز على النتائج.' },
    { id: 'creative', icon: <Sparkles size={16} />, en: 'Creative Catalyst', ar: 'المحفز الإبداعي', desc_en: 'Brainstorming-focused, expansive, vibrant.', desc_ar: 'يركز على العصف الذهني، توسعي، حيوي.' },
    { id: 'academic', icon: <BookOpen size={16} />, en: 'Academic Integrity', ar: 'النزاهة الأكاديمية', desc_en: 'Citations-ready, formal, rigorous.', desc_ar: 'جاهز للاقتباس، رسمي، صارم.' },
    { id: 'coder', icon: <Code2 size={16} />, en: 'Brutalist Code', ar: 'البرمجة الصريحة', desc_en: 'Direct, code-first, minimal chatter.', desc_ar: 'مباشر، الكود أولاً، أقل قدر من الحديث.' },
    { id: 'mckinsey', icon: <LayoutGrid size={16} />, en: 'Strategic Consultant', ar: 'المستشار الاستراتيجي', desc_en: 'Framework-driven, MECE structure, synthesis focused.', desc_ar: 'يعتمد على الأطر، هيكلية شاملة، يركز على التركيب والنتائج.' },
    { id: 'minimalist', icon: <Zap size={16} />, en: 'Extreme Minimalist', ar: 'التبسيط المطلق', desc_en: 'One-sentence answers where possible, ultra-dense.', desc_ar: 'إجابات من جملة واحدة قدر الإمكان، كثافة قصوى في المعلومة.' },
  ];

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

  const handlePresetSelect = (preset: typeof PRESETS[0]) => {
    const instruction = dir === 'rtl' ? `أسلوب الاستجابة: ${preset.ar}. ${preset.desc_ar}` : `Response Style: ${preset.en}. ${preset.desc_en}`;
    
    let newInstructions = user.custom_instructions || '';
    // Optimized removal of any existing preset styles
    const lines = newInstructions.split('\n');
    const filteredLines = lines.filter((l: string) => 
      !l.includes('Response Style:') && 
      !l.includes('أسلوب الاستجابة:') &&
      !PRESETS.some(p => l.includes(p.en) || l.includes(p.ar))
    );
    
    const finalInstructions = instruction + '\n' + filteredLines.join('\n');
    onUpdate({ custom_instructions: finalInstructions.trim() });
  };

  const isActivePreset = (preset: typeof PRESETS[0]) => {
    const instructions = (user.custom_instructions || '').toLowerCase();
    return instructions.includes(preset.en.toLowerCase()) || instructions.includes(preset.ar.toLowerCase());
  };

  const renderEditableField = (label: string, field: string, value: string, icon: React.ReactNode, type: string = 'text', multiline: boolean = false) => {
    const isEditing = editingField === field;

    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between py-10 border-b border-[var(--border-main)] group gap-4">
        <div className="flex items-center gap-6 flex-1">
          <div className="p-3 rounded-[var(--radius)] bg-[var(--bg-primary)] text-[var(--text-muted)] group-hover:text-emerald-500 transition-all duration-300 shrink-0">
            {React.cloneElement(icon as React.ReactElement<{ size?: number; className?: string }>, { size: 20 })}
          </div>
          <div className="flex-1 w-full">
            <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">{label}</p>
            {isEditing ? (
              multiline ? (
                <textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full p-4 rounded-[var(--radius)] border focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium bg-[var(--bg-primary)] border-[var(--border-main)] text-[var(--text-primary)] min-h-[120px] text-sm"
                  autoFocus
                />
              ) : (
                <input
                  type={type}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full max-w-md p-3 rounded-[var(--radius)] border focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-bold bg-[var(--bg-primary)] border-[var(--border-main)] text-[var(--text-primary)]"
                  autoFocus
                />
              )
            ) : (
              <p className={`font-bold text-[var(--text-primary)] tracking-tight ${multiline ? 'text-sm whitespace-pre-wrap leading-relaxed opacity-80' : 'text-base'}`}>
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
                <Check size={20} className="drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
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
              className="text-emerald-500 hover:text-emerald-600 text-[11px] md:text-sm font-black flex items-center gap-2 transition-all px-4 py-2 rounded-[var(--radius)] bg-transparent hover:bg-emerald-500/10"
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
    { id: 'intelligence', icon: <Sparkles size={18} />, label: t('intelligenceCalibration') },
    { id: 'preferences', icon: <Monitor size={18} />, label: t('preferences') },
  ];

  const kycStatus = user.kyc_status === 'verified' ? t('verified') : (user.kyc_status === 'pending' ? t('kycPending') : t('kycNone'));
  const planName = user.subscription ? (dir === 'rtl' ? user.subscription.plan_name_ar || user.subscription.plan_name_en : user.subscription.plan_name_en) : t('freeOnly');

  return (
    <div className="space-y-8 relative">
      {/* Category Tabs */}
      <div className="flex gap-2 p-1 bg-[var(--bg-primary)] rounded-[var(--radius)] border border-[var(--border-main)] max-w-fit mx-auto md:mx-0">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveCategory(item.id as any)}
            className={`flex items-center gap-2 px-6 py-2 text-[10px] font-black uppercase tracking-widest transition-all duration-300 rounded-[var(--radius)] ${
              activeCategory === item.id 
                ? 'bg-[var(--bg-secondary)] text-emerald-500 shadow-lg' 
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-white/5'
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
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
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
                      className="w-20 h-20 rounded-[var(--radius)] bg-[var(--bg-primary)] flex items-center justify-center text-[var(--text-muted)] group-hover:text-emerald-500 transition-all duration-300 border-4"
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
                  <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">{t('avatar')}</p>
                  <div className="flex items-center gap-3">
                    {user.subscription?.plan_name_en && (
                      <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        {user.subscription.plan_name_en}
                      </span>
                    )}
                    <span className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-widest">
                       {user.kyc_status === 'verified' ? <Check size={14} className="inline text-blue-500 mr-1" /> : null}
                       ID_{user.id?.toString().slice(-4)}
                    </span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="text-emerald-500 hover:text-emerald-600 text-sm font-black flex items-center gap-2 transition-all px-4 py-2 rounded-[var(--radius)] bg-transparent hover:bg-emerald-500/10"
              >
                {t('edit').toUpperCase()}
              </button>
            </div>

            {renderEditableField(t('userName'), 'name', user.name || '', <User size={20} />)}
            {renderEditableField(t('email'), 'email', user.email || '', <Mail size={20} />, 'email')}
            {renderEditableField(t('password'), 'password', '', <Lock size={20} />, 'password')}

            <div className="flex items-center justify-between py-10 border-b border-[var(--border-main)]">
              <div className="flex items-center gap-6">
                <div className="p-3 rounded-[var(--radius)] bg-[var(--bg-primary)] text-[var(--text-muted)]">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">{t('kycStatus')}</p>
                  <p className={`font-black text-sm tracking-widest uppercase flex items-center gap-2 ${user.kyc_status === 'verified' ? 'text-emerald-500' : 'text-[var(--text-primary)]'}`}>
                    {kycStatus}
                    {user.kyc_status === 'verified' && <Check size={14} className="drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]" />}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between py-10 border-b border-[var(--border-main)]">
              <div className="flex items-center gap-6">
                <div className="p-3 rounded-[var(--radius)] bg-[var(--bg-primary)] text-[var(--text-muted)]">
                  <CreditCard size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">{t('currentPlan')}</p>
                  <p className="font-black text-sm tracking-[0.2em] text-emerald-500 uppercase flex items-center gap-2 shadow-emerald-500/10">
                    {planName}
                    {user.subscription?.status === 'active' && <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeCategory === 'intelligence' && (
          <motion.div
            key="intelligence"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-2"
          >
            <div className="p-8 rounded-[var(--radius)] bg-emerald-500/5 border border-emerald-500/10 mb-6 group hover:bg-emerald-500/[0.08] transition-all duration-300">
              <div className="flex items-start gap-6">
                <div className="p-5 rounded-[var(--radius)] bg-emerald-500/10 text-emerald-500 shadow-emerald-500/20 shadow-lg group-hover:scale-110 transition-transform">
                  <Sparkles size={32} className="drop-shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-xl font-black tracking-tight text-emerald-500 uppercase">{dir === 'rtl' ? 'معايرة ذكاء بيربليكستا' : 'Perplexta Intelligence'}</h3>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-medium max-w-lg">
                    {dir === 'rtl' 
                      ? 'قم بتخصيص كيفية تفاعل المساعد معك بناءً على هويتك المهنية وأسلوب الردود المفضل لديك لضمان تجربة استخباراتية فائقة.' 
                      : 'Customize how the assistant interacts based on your professional identity and preferred response style for a superior intelligence experience.'}
                  </p>
                </div>
              </div>
            </div>

            {renderEditableField(t('professionalIdentity'), 'custom_instructions', user.custom_instructions || '', <Briefcase size={20} />, 'text', true)}

            <div className="py-8">
              <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
                <Zap size={14} className="text-amber-500" />
                {t('eliteResponseStyles').toUpperCase()}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {PRESETS.map((preset) => {
                  const active = isActivePreset(preset);
                  return (
                    <button
                      key={preset.id}
                      onClick={() => handlePresetSelect(preset)}
                      className={`p-5 rounded-[var(--radius)] border transition-all duration-300 text-start group relative overflow-hidden ${
                        active 
                          ? 'border-emerald-500 bg-emerald-500/[0.03] shadow-lg shadow-emerald-500/5' 
                          : 'border-[var(--border-main)] hover:border-emerald-500/40 hover:bg-emerald-500/5'
                      }`}
                    >
                      {active && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                          className="absolute top-0 right-0 p-2 text-emerald-500"
                        >
                          <Check size={16} className="drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                        </motion.div>
                      )}
                      
                      <div className="flex items-center gap-4 mb-2 relative z-10">
                        <div className={`p-2.5 rounded-[var(--radius)] transition-colors ${
                          active ? 'bg-emerald-500 text-white' : 'bg-[var(--bg-primary)] text-[var(--text-muted)] group-hover:text-emerald-500'
                        }`}>
                            {preset.icon}
                        </div>
                        <div>
                          <p className={`text-[9px] font-black uppercase tracking-widest mb-0.5 transition-all ${active ? 'text-emerald-500 opacity-100' : 'text-[var(--text-muted)] opacity-50'}`}>
                            {active ? t('activeNow') : (dir === 'rtl' ? 'أسلوب متاح' : 'Style Preset')}
                          </p>
                          <h4 className={`font-black text-sm transition-colors ${
                            active ? 'text-[var(--text-primary)]' : 'text-[var(--text-primary)] group-hover:text-emerald-500'
                          }`}>
                            {dir === 'rtl' ? preset.ar : preset.en}
                          </h4>
                        </div>
                      </div>
                      <p className="text-[11px] text-[var(--text-secondary)] font-medium leading-relaxed relative z-10">
                        {dir === 'rtl' ? preset.desc_ar : preset.desc_en}
                      </p>
                    </button>
                  );
                })}
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
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-1"
          >
            {/* Language Selection */}
            <div className="flex items-center justify-between py-8 border-b border-[var(--border-main)] group">
               <div className="flex items-center gap-6">
                  <div className="p-3 rounded-[var(--radius)] bg-[var(--bg-primary)] text-[var(--text-muted)] group-hover:text-emerald-500 transition-all duration-300">
                    <Languages size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">{t('languagePreference') || 'Platform Language'}</p>
                    <p className="font-bold text-base text-[var(--text-primary)]">{language === 'ar' ? 'العربية' : 'English'}</p>
                  </div>
               </div>
               <div className="flex gap-2 p-1 bg-[var(--bg-primary)] rounded-[var(--radius)] border border-[var(--border-main)]">
                  <button 
                    onClick={() => setLanguage('ar')}
                    className={`px-4 py-2 rounded-[var(--radius)] text-[10px] font-black uppercase tracking-widest transition-all ${language === 'ar' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/40' : 'text-[var(--text-muted)] hover:text-gray-200'}`}
                  >
                    العربية
                  </button>
                  <button 
                    onClick={() => setLanguage('en')}
                    className={`px-4 py-2 rounded-[var(--radius)] text-[10px] font-black uppercase tracking-widest transition-all ${language === 'en' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/40' : 'text-[var(--text-muted)] hover:text-gray-200'}`}
                  >
                    English
                  </button>
               </div>
            </div>

            {/* Theme Selection */}
            <div className="flex items-center justify-between py-8 border-b border-[var(--border-main)] group">
               <div className="flex items-center gap-6">
                  <div className="p-3 rounded-[var(--radius)] bg-[var(--bg-primary)] text-[var(--text-muted)] group-hover:text-amber-500 transition-all duration-300">
                    <Monitor size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">{t('themePreference')}</p>
                    <p className="font-bold text-base text-[var(--text-primary)] uppercase">{theme}</p>
                  </div>
               </div>
               <div className="flex gap-2 p-1 bg-[var(--bg-primary)] rounded-[var(--radius)] border border-[var(--border-main)]">
                  <button 
                    onClick={() => setTheme('light')}
                    className={`px-4 py-2 rounded-[var(--radius)] text-[10px] font-black uppercase tracking-widest transition-all ${theme === 'light' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/40' : 'text-[var(--text-muted)] hover:text-gray-200'}`}
                  >
                    Light
                  </button>
                  <button 
                    onClick={() => setTheme('dark')}
                    className="px-4 py-2 rounded-[var(--radius)] text-[10px] font-black uppercase tracking-widest transition-all bg-[var(--bg-secondary)] text-white shadow-lg shadow-black/40"
                  >
                    Dark
                  </button>
               </div>
            </div>

            <div className="p-8 rounded-[var(--radius)] border border-[var(--border-main)] bg-[var(--bg-primary)] mt-12">
               <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-[var(--radius)] bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                     <Target size={24} />
                  </div>
                  <div className="space-y-2">
                     <h4 className="text-sm font-black uppercase tracking-widest text-[var(--text-primary)]">
                        {dir === 'rtl' ? 'تزامن التفضيلات عالمياً' : 'Global Preference Sync'}
                     </h4>
                     <p className="text-[11px] text-[var(--text-secondary)] font-medium leading-relaxed">
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

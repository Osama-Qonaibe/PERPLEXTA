import React, { useState, useRef, useEffect } from 'react';
import { User, Mail, Lock, Camera, Edit2, ShieldCheck, CreditCard, Check, X, Loader2 } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

interface AccountSettingsProps {
  user: any;
  onUpdate: (updates: any) => void;
  dir: 'rtl' | 'ltr';
  theme: 'dark' | 'light';
}

export const AccountSettings: React.FC<AccountSettingsProps> = ({ user, onUpdate, dir, theme }) => {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t, token, setIsOperationPending } = useAppContext();

  useEffect(() => {
    setIsOperationPending(isUploading || editingField !== null);
  }, [isUploading, editingField, setIsOperationPending]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Sovereign: Avatar limit 5MB (Standard high-perf profile limit)
    const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_AVATAR_SIZE) {
      alert(dir === 'rtl' ? 'حجم الصورة كبير جداً (الحد الأقصى 5 ميجابايت)' : 'Image is too large (Max 5MB)');
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
      
      if (res.ok) {
        const data = await res.json();
        onUpdate({ avatar: data.url });
      } else {
        alert(t('saveFailed'));
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
      alert(t('saveFailed'));
    } finally {
      setIsUploading(false);
    }
  };

  const kycStatus = user.kyc_status === 'verified' ? t('verified') : (user.kyc_status === 'pending' ? t('kycPending') : t('kycNone'));
  const planName = user.subscription ? (dir === 'rtl' ? user.subscription.plan_name_ar || user.subscription.plan_name_en : user.subscription.plan_name_en) : t('freeOnly');

  const handleStartEdit = (field: string, value: string) => {
    setEditingField(field);
    setEditValue(value);
  };

  const handleSave = async () => {
    if (!editingField) return;
    await onUpdate({ [editingField]: editValue });
    setEditingField(null);
  };

  const renderEditableField = (label: string, field: string, value: string, icon: React.ReactNode, type: string = 'text') => {
    const isEditing = editingField === field;

    return (
      <div className="flex items-center justify-between py-6 border-b border-[var(--border-main)] group">
        <div className="flex items-center gap-6 flex-1">
          <div className="p-3 rounded-2xl bg-[var(--bg-primary)] text-gray-400 group-hover:text-emerald-500 transition-all duration-300">
            {React.cloneElement(icon as React.ReactElement<{ size?: number; className?: string }>, { size: 20 })}
          </div>
          <div className="flex-1">
            <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-1">{label}</p>
            {isEditing ? (
              <input
                type={type}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className={`w-full max-w-md p-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-bold bg-[var(--bg-primary)] border-[var(--border-main)] text-[var(--text-primary)]`}
                autoFocus
              />
            ) : (
              <p className="font-bold text-base text-[var(--text-primary)] tracking-tight">{field === 'password' ? '••••••••' : value}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <div className="flex gap-2">
              <button 
                onClick={handleSave}
                className="p-2 text-emerald-500 hover:bg-emerald-500/10 rounded-xl transition-all hover:scale-110 active:scale-95"
              >
                <Check size={20} className="drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
              </button>
              <button 
                onClick={() => setEditingField(null)}
                className="p-2 text-red-500 hover:bg-red-500/10 rounded-xl transition-all hover:scale-110 active:scale-95"
              >
                <X size={20} />
              </button>
            </div>
          ) : (
            <button 
              onClick={() => handleStartEdit(field, field === 'password' ? '' : value)}
              className="text-emerald-500 hover:text-emerald-600 text-[11px] md:text-sm font-black flex items-center gap-2 transition-all px-4 py-2 rounded-xl bg-transparent hover:bg-emerald-500/10"
            >
              <Edit2 size={16} />
              {t('edit').toUpperCase()}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-1 animate-fade-in relative">
      {/* Avatar Section */}
      <div className="flex items-center justify-between py-6 border-b border-[var(--border-main)] group">
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
                className="w-20 h-20 rounded-[1.5rem] object-cover border-2 border-transparent group-hover:border-emerald-500 transition-all duration-300 shadow-lg"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-20 h-20 rounded-[1.5rem] bg-[var(--bg-primary)] flex items-center justify-center text-gray-400 group-hover:text-emerald-500 transition-all duration-500 border-2 border-transparent group-hover:border-emerald-500">
                {isUploading ? <Loader2 className="animate-spin" /> : <Camera size={28} />}
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 p-2 bg-emerald-500 rounded-xl text-white shadow-lg cursor-pointer hover:scale-110 active:scale-95 transition-all" onClick={() => fileInputRef.current?.click()}>
              {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
            </div>
          </div>
          <div>
            <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-1">{t('avatar')}</p>
            <p className="text-sm text-gray-400 max-w-[200px] truncate font-medium">
              {isUploading ? t('processing') : (user.avatar ? (dir === 'rtl' ? 'صورة مخصصة' : 'Custom Avatar') : t('none'))}
            </p>
          </div>
        </div>
        <button 
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="text-emerald-500 hover:text-emerald-600 text-sm font-black flex items-center gap-2 transition-all px-4 py-2 rounded-xl bg-transparent hover:bg-emerald-500/10 disabled:opacity-50"
        >
          {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Edit2 size={16} />}
          {t('edit').toUpperCase()}
        </button>
      </div>

      {/* Editable Fields */}
      {renderEditableField(t('userName'), 'name', user.name || '', <User size={20} />)}
      {renderEditableField(t('email'), 'email', user.email || '', <Mail size={20} />, 'email')}
      {renderEditableField(t('password'), 'password', '', <Lock size={20} />, 'password')}

      {/* Read-only Status Fields */}
      <div className="flex items-center justify-between py-6 border-b border-[var(--border-main)]">
        <div className="flex items-center gap-6">
          <div className="p-3 rounded-2xl bg-[var(--bg-primary)] text-gray-400">
            <ShieldCheck size={20} />
          </div>
          <div>
            <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-1">{t('kycStatus')}</p>
            <p className={`font-bold text-base ${user.kyc_status === 'verified' ? 'text-emerald-500' : 'text-gray-400'}`}>
              {kycStatus}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between py-6 border-b border-[var(--border-main)]">
        <div className="flex items-center gap-6">
          <div className="p-3 rounded-2xl bg-[var(--bg-primary)] text-gray-400">
            <CreditCard size={20} />
          </div>
          <div>
            <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-1">{t('currentPlan')}</p>
            <p className="font-bold text-base text-emerald-500 uppercase">{planName}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

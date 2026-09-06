import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bookmark, MessageSquare, Edit3, Settings, BellOff, Bell,
  Handshake, Languages, Info, Calendar, Code, Archive,
  Trash2, EyeOff, Flag, Copy, Check, X, Shield, Sparkles,
  Users, Globe, Lock, CheckCircle2, ChevronLeft, ChevronRight,
  ExternalLink, Loader2
} from 'lucide-react';
import { BulletinAd } from '../../server/db/types';
import { toast } from '../context/NotificationContext';

export interface PostOptionsMenuProps {
  ad: BulletinAd;
  user: any;
  token?: string | null;
  isRtl: boolean;
  isOpen: boolean;
  onClose: () => void;
  onSaveAd?: (ad: BulletinAd) => void;
  onEditAd?: (ad: BulletinAd) => void;
  onArchiveAd?: (ad: BulletinAd) => void;
  onTrashAd?: (ad: BulletinAd) => void;
  onUpdateAd?: (updatedAd: Partial<BulletinAd> & { id: number }) => void;
  onReportAd?: (ad: BulletinAd) => void;
  onHideAd?: (adId: number) => void;
  onBoostAd?: (ad: BulletinAd) => void;
  dropdownAlign?: 'left' | 'right';
  className?: string;
}

type ActiveModal =
  | 'who_can_comment'
  | 'audience'
  | 'partnership'
  | 'ai_content'
  | 'edit_date'
  | 'embed'
  | 'archive_confirm'
  | 'trash_confirm'
  | null;

export const PostOptionsMenu: React.FC<PostOptionsMenuProps> = ({
  ad,
  user,
  token,
  isRtl,
  isOpen,
  onClose,
  onSaveAd,
  onEditAd,
  onArchiveAd,
  onTrashAd,
  onUpdateAd,
  onReportAd,
  onHideAd,
  onBoostAd,
  dropdownAlign,
  className = ''
}) => {
  const isOwner = Boolean(user?.id && (user.id === ad.user_id || user.role === 'admin'));
  
  // Local interaction states
  const [isSaved, setIsSaved] = useState(Boolean(ad.user_has_saved));
  const [isMuted, setIsMuted] = useState(Boolean(ad.is_muted_notifications));
  const [allowTranslation, setAllowTranslation] = useState(ad.allow_translation !== false);
  const [isAiGenerated, setIsAiGenerated] = useState(Boolean(ad.is_ai_generated));
  const [whoCanComment, setWhoCanComment] = useState(ad.who_can_comment || 'anyone');
  const [audience, setAudience] = useState(ad.audience || 'public');
  const [partnershipCode, setPartnershipCode] = useState(ad.partnership_code || '');
  const [partnershipBrand, setPartnersBrand] = useState(ad.partnership_brand || '');
  const [isPartnership, setIsPartnership] = useState(Boolean(ad.is_partnership));
  const [dateInput, setDateInput] = useState(() => {
    try {
      const d = new Date(ad.created_at || Date.now());
      return d.toISOString().slice(0, 16);
    } catch {
      return '';
    }
  });

  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    setIsSaved(Boolean(ad.user_has_saved));
    setIsMuted(Boolean(ad.is_muted_notifications));
    setAllowTranslation(ad.allow_translation !== false);
    setIsAiGenerated(Boolean(ad.is_ai_generated));
    setWhoCanComment(ad.who_can_comment || 'anyone');
    setAudience(ad.audience || 'public');
    setPartnershipCode(ad.partnership_code || '');
    setPartnersBrand(ad.partnership_brand || '');
    setIsPartnership(Boolean(ad.is_partnership));
  }, [ad]);

  if (!isOpen && !activeModal) return null;

  // 1. Handle Save / Unsave
  const handleToggleSave = async () => {
    if (!token) {
      toast.error(isRtl ? 'يرجى تسجيل الدخول أولاً' : 'Please log in first');
      return;
    }
    if (onSaveAd) {
      onSaveAd(ad);
      setIsSaved(!isSaved);
      onClose();
      return;
    }
    try {
      setIsActionLoading(true);
      const res = await fetch(`/api/bulletin/ads/${ad.id}/save`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setIsSaved(data.saved);
        toast.success(data.message);
        onUpdateAd?.({ id: ad.id, user_has_saved: data.saved });
      } else {
        toast.error(data.error || 'فشل حفظ المنشور');
      }
    } catch {
      toast.error('حدث خطأ أثناء حفظ المنشور');
    } finally {
      setIsActionLoading(false);
      onClose();
    }
  };

  // 2. Handle Notifications Mute Toggle
  const handleToggleNotifications = async () => {
    if (!token) {
      toast.error(isRtl ? 'يرجى تسجيل الدخول أولاً' : 'Please log in first');
      return;
    }
    try {
      setIsActionLoading(true);
      const res = await fetch(`/api/bulletin/ads/${ad.id}/toggle-notifications`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setIsMuted(data.is_muted);
        toast.success(data.message);
        onUpdateAd?.({ id: ad.id, is_muted_notifications: data.is_muted });
      } else {
        toast.error(data.error || 'فشل تغيير الإعدادات');
      }
    } catch {
      toast.error('حدث خطأ');
    } finally {
      setIsActionLoading(false);
      onClose();
    }
  };

  // 3. Handle Who Can Comment Save
  const handleSaveWhoCanComment = async (val: string) => {
    if (!token) return;
    try {
      setIsActionLoading(true);
      const res = await fetch(`/api/bulletin/ads/${ad.id}/who-can-comment`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ who_can_comment: val })
      });
      const data = await res.json();
      if (data.success) {
        setWhoCanComment(val);
        toast.success(data.message || (isRtl ? 'تم تحديث إعدادات التعليق' : 'Comment settings updated'));
        onUpdateAd?.({ id: ad.id, who_can_comment: val });
        setActiveModal(null);
      } else {
        toast.error(data.error || 'فشل الحفظ');
      }
    } catch {
      toast.error('خطأ في الاتصال');
    } finally {
      setIsActionLoading(false);
    }
  };

  // 4. Handle Audience Save
  const handleSaveAudience = async (val: string) => {
    if (!token) return;
    try {
      setIsActionLoading(true);
      const res = await fetch(`/api/bulletin/ads/${ad.id}/audience`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ audience: val })
      });
      const data = await res.json();
      if (data.success) {
        setAudience(val);
        toast.success(data.message || (isRtl ? 'تم تعديل جمهور المنشور' : 'Audience updated'));
        onUpdateAd?.({ id: ad.id, audience: val });
        setActiveModal(null);
      } else {
        toast.error(data.error || 'فشل التعديل');
      }
    } catch {
      toast.error('خطأ في الاتصال');
    } finally {
      setIsActionLoading(false);
    }
  };

  // 5. Handle Branded Partnership Save
  const handleSavePartnership = async () => {
    if (!token) return;
    try {
      setIsActionLoading(true);
      const res = await fetch(`/api/bulletin/ads/${ad.id}/partnership-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          partnership_code: partnershipCode,
          is_partnership: isPartnership,
          partnership_brand: partnershipBrand
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || (isRtl ? 'تم حفظ بيانات الشراكة' : 'Partnership saved'));
        onUpdateAd?.({
          id: ad.id,
          partnership_code: data.partnership_code,
          is_partnership: data.is_partnership,
          partnership_brand: data.partnership_brand
        });
        setActiveModal(null);
      } else {
        toast.error(data.error || 'فشل الحفظ');
      }
    } catch {
      toast.error('خطأ في الاتصال');
    } finally {
      setIsActionLoading(false);
    }
  };

  // 6. Handle Toggle Translation
  const handleToggleTranslation = async () => {
    if (!token) return;
    try {
      setIsActionLoading(true);
      const newVal = !allowTranslation;
      const res = await fetch(`/api/bulletin/ads/${ad.id}/toggle-translation`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ allow_translation: newVal })
      });
      const data = await res.json();
      if (data.success) {
        setAllowTranslation(data.allow_translation);
        toast.success(data.message);
        onUpdateAd?.({ id: ad.id, allow_translation: data.allow_translation });
      }
    } catch {
      toast.error('خطأ في الاتصال');
    } finally {
      setIsActionLoading(false);
      onClose();
    }
  };

  // 7. Handle Toggle AI Label
  const handleToggleAi = async (forcedVal?: boolean) => {
    if (!token) return;
    try {
      setIsActionLoading(true);
      const newVal = forcedVal !== undefined ? forcedVal : !isAiGenerated;
      const res = await fetch(`/api/bulletin/ads/${ad.id}/toggle-ai`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ is_ai_generated: newVal })
      });
      const data = await res.json();
      if (data.success) {
        setIsAiGenerated(data.is_ai_generated);
        toast.success(data.message);
        onUpdateAd?.({ id: ad.id, is_ai_generated: data.is_ai_generated });
        setActiveModal(null);
      }
    } catch {
      toast.error('خطأ في الاتصال');
    } finally {
      setIsActionLoading(false);
    }
  };

  // 8. Handle Date Update
  const handleSaveDate = async () => {
    if (!token || !dateInput) return;
    try {
      setIsActionLoading(true);
      const iso = new Date(dateInput).toISOString();
      const res = await fetch(`/api/bulletin/ads/${ad.id}/date`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ created_at: iso })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || (isRtl ? 'تم تحديث تاريخ المنشور' : 'Date updated'));
        onUpdateAd?.({ id: ad.id, created_at: iso });
        setActiveModal(null);
      } else {
        toast.error(data.error || 'فشل تحديث التاريخ');
      }
    } catch {
      toast.error('تاريخ غير صالح');
    } finally {
      setIsActionLoading(false);
    }
  };

  // 9. Handle Move to Archive
  const handleConfirmArchive = async () => {
    if (!token) return;
    try {
      setIsActionLoading(true);
      const res = await fetch(`/api/bulletin/ads/${ad.id}/archive`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        if (onArchiveAd) {
          onArchiveAd(ad);
        } else {
          onUpdateAd?.({ id: ad.id, status: 'archived' });
        }
        setActiveModal(null);
        onClose();
      } else {
        toast.error(data.error || 'فشل نقل المنشور إلى الأرشيف');
      }
    } catch {
      toast.error('خطأ في الاتصال');
    } finally {
      setIsActionLoading(false);
    }
  };

  // 10. Handle Move to Trash
  const handleConfirmTrash = async () => {
    if (!token) return;
    try {
      setIsActionLoading(true);
      const res = await fetch(`/api/bulletin/ads/${ad.id}/trash`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        if (onTrashAd) {
          onTrashAd(ad);
        } else {
          onUpdateAd?.({ id: ad.id, status: 'trash' });
        }
        setActiveModal(null);
        onClose();
      } else {
        toast.error(data.error || 'فشل نقل المنشور إلى سلة المهملات');
      }
    } catch {
      toast.error('خطأ في الاتصال');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Generate Embed Code
  const embedCode = `<iframe src="${window.location.origin}/viralbook?embed=1&ad=${ad.id}" width="500" height="650" frameborder="0" scrolling="no" allowtransparency="true" style="border:none;overflow:hidden;border-radius:16px;max-width:100%;"></iframe>`;

  const copyEmbedCode = () => {
    navigator.clipboard.writeText(embedCode);
    setCopiedEmbed(true);
    toast.success(isRtl ? 'تم نسخ رمز التضمين إلى الحافظة' : 'Embed code copied to clipboard');
    setTimeout(() => setCopiedEmbed(false), 2000);
  };

  const copyPartnershipCode = () => {
    const code = partnershipCode || `PRP-PARTNER-AD-${ad.id}`;
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    toast.success(isRtl ? 'تم نسخ رمز الشراكة' : 'Partnership code copied');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const alignClass = dropdownAlign === 'right'
    ? 'right-0'
    : dropdownAlign === 'left'
    ? 'left-0'
    : isRtl ? 'left-0' : 'right-0';

  return (
    <>
      {/* Background click dismiss for dropdown */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-transparent"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        />
      )}

      {/* Main Facebook-Style Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 6 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            className={`absolute top-full mt-2 ${alignClass} w-[300px] sm:w-[320px] max-w-[calc(100vw-32px)] rounded-2xl bg-white dark:bg-[#1a1a1c] border border-gray-200 dark:border-zinc-800 shadow-2xl p-2 z-50 text-xs font-medium space-y-0.5 text-gray-800 dark:text-zinc-200 ${className}`}
            style={{ maxHeight: '85vh', overflowY: 'auto' }}
          >
            {/* 1. Save / Unsave Post */}
            <button
              type="button"
              onClick={handleToggleSave}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-800/80 transition-colors text-start group cursor-pointer"
            >
              <div className="flex flex-col flex-1 min-w-0 pr-3 rtl:pr-0 rtl:pl-3">
                <span className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white">
                  {isSaved
                    ? (isRtl ? 'إلغاء حفظ المنشور' : 'Unsave post')
                    : (isRtl ? 'حفظ المنشور' : 'Save post')}
                </span>
                <span className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                  {isSaved
                    ? (isRtl ? 'إزالة هذا من عناصرك المحفوظة' : 'Remove from your saved items')
                    : (isRtl ? 'إضافة هذا إلى عناصرك المحفوظة' : 'Add this to your saved items')}
                </span>
              </div>
              <div className="w-9 h-9 rounded-[4px] bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-700 dark:text-gray-300 group-hover:bg-gray-200 dark:group-hover:bg-zinc-700 transition-colors shrink-0">
                <Bookmark size={18} className={isSaved ? 'text-blue-500 fill-blue-500' : ''} />
              </div>
            </button>

            <div className="my-1 border-t border-gray-100 dark:border-zinc-800" />

            {/* Author / Admin Options */}
            {isOwner && (
              <>
                {/* 2. Who can comment */}
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    setActiveModal('who_can_comment');
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-800/80 transition-colors text-start group cursor-pointer"
                >
                  <div className="flex flex-col flex-1 min-w-0 pr-3 rtl:pr-0 rtl:pl-3">
                    <span className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white">
                      {isRtl ? 'من الذي يمكنه التعليق على منشورك؟' : 'Who can comment on your post?'}
                    </span>
                  </div>
                  <div className="w-9 h-9 rounded-[4px] bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-700 dark:text-gray-300 group-hover:bg-gray-200 dark:group-hover:bg-zinc-700 transition-colors shrink-0">
                    <MessageSquare size={18} />
                  </div>
                </button>

                {/* 3. Edit Post */}
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onEditAd) onEditAd(ad);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-800/80 transition-colors text-start group cursor-pointer"
                >
                  <div className="flex flex-col flex-1 min-w-0 pr-3 rtl:pr-0 rtl:pl-3">
                    <span className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white">
                      {isRtl ? 'تعديل المنشور' : 'Edit post'}
                    </span>
                  </div>
                  <div className="w-9 h-9 rounded-[4px] bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-700 dark:text-gray-300 group-hover:bg-gray-200 dark:group-hover:bg-zinc-700 transition-colors shrink-0">
                    <Edit3 size={18} />
                  </div>
                </button>

                {/* 4. Edit Audience */}
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    setActiveModal('audience');
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-800/80 transition-colors text-start group cursor-pointer"
                >
                  <div className="flex flex-col flex-1 min-w-0 pr-3 rtl:pr-0 rtl:pl-3">
                    <span className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white">
                      {isRtl ? 'تعديل الجمهور' : 'Edit audience'}
                    </span>
                  </div>
                  <div className="w-9 h-9 rounded-[4px] bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-700 dark:text-gray-300 group-hover:bg-gray-200 dark:group-hover:bg-zinc-700 transition-colors shrink-0">
                    <Settings size={18} />
                  </div>
                </button>
              </>
            )}

            {/* 5. Notifications Mute Toggle */}
            <button
              type="button"
              onClick={handleToggleNotifications}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-800/80 transition-colors text-start group cursor-pointer"
            >
              <div className="flex flex-col flex-1 min-w-0 pr-3 rtl:pr-0 rtl:pl-3">
                <span className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white">
                  {isMuted
                    ? (isRtl ? 'تشغيل الإشعارات لهذا المنشور' : 'Turn on notifications for this post')
                    : (isRtl ? 'إيقاف تشغيل الإشعارات لهذا المنشور' : 'Turn off notifications for this post')}
                </span>
              </div>
              <div className="w-9 h-9 rounded-[4px] bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-700 dark:text-gray-300 group-hover:bg-gray-200 dark:group-hover:bg-zinc-700 transition-colors shrink-0">
                {isMuted ? <Bell size={18} className="text-blue-500" /> : <BellOff size={18} />}
              </div>
            </button>

            {/* 6. Partnership Code (Owner) */}
            {isOwner && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  setActiveModal('partnership');
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-800/80 transition-colors text-start group cursor-pointer"
              >
                <div className="flex flex-col flex-1 min-w-0 pr-3 rtl:pr-0 rtl:pl-3">
                  <span className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white">
                    {isRtl ? 'مشاركة رمز إعلان الشراكة' : 'Share partnership ad code'}
                  </span>
                </div>
                <div className="w-9 h-9 rounded-[4px] bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-700 dark:text-gray-300 group-hover:bg-gray-200 dark:group-hover:bg-zinc-700 transition-colors shrink-0">
                  <Handshake size={18} />
                </div>
              </button>
            )}

            {/* 7. Translation Toggle */}
            <button
              type="button"
              onClick={handleToggleTranslation}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-800/80 transition-colors text-start group cursor-pointer"
            >
              <div className="flex flex-col flex-1 min-w-0 pr-3 rtl:pr-0 rtl:pl-3">
                <span className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white">
                  {allowTranslation
                    ? (isRtl ? 'إيقاف تشغيل الترجمة' : 'Turn off translation')
                    : (isRtl ? 'تشغيل الترجمة' : 'Turn on translation')}
                </span>
              </div>
              <div className="w-9 h-9 rounded-[4px] bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-700 dark:text-gray-300 group-hover:bg-gray-200 dark:group-hover:bg-zinc-700 transition-colors shrink-0">
                <Languages size={18} />
              </div>
            </button>

            {/* 8. AI Content Label */}
            <button
              type="button"
              onClick={() => {
                onClose();
                setActiveModal('ai_content');
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-800/80 transition-colors text-start group cursor-pointer"
            >
              <div className="flex flex-col flex-1 min-w-0 pr-3 rtl:pr-0 rtl:pl-3">
                <span className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white">
                  {isRtl ? 'محتوى ذكاء اصطناعي' : 'AI content'}
                </span>
              </div>
              <div className="w-9 h-9 rounded-[4px] bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-700 dark:text-gray-300 group-hover:bg-gray-200 dark:group-hover:bg-zinc-700 transition-colors shrink-0">
                <Info size={18} />
              </div>
            </button>

            {/* 9. Edit Date (Owner) */}
            {isOwner && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  setActiveModal('edit_date');
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-800/80 transition-colors text-start group cursor-pointer"
              >
                <div className="flex flex-col flex-1 min-w-0 pr-3 rtl:pr-0 rtl:pl-3">
                  <span className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white">
                    {isRtl ? 'تعديل التاريخ' : 'Edit date'}
                  </span>
                </div>
                <div className="w-9 h-9 rounded-[4px] bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-700 dark:text-gray-300 group-hover:bg-gray-200 dark:group-hover:bg-zinc-700 transition-colors shrink-0">
                  <Calendar size={18} />
                </div>
              </button>
            )}

            {/* 10. Embed Post */}
            <button
              type="button"
              onClick={() => {
                onClose();
                setActiveModal('embed');
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-800/80 transition-colors text-start group cursor-pointer"
            >
              <div className="flex flex-col flex-1 min-w-0 pr-3 rtl:pr-0 rtl:pl-3">
                <span className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white">
                  {isRtl ? 'تضمين' : 'Embed'}
                </span>
              </div>
              <div className="w-9 h-9 rounded-[4px] bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-700 dark:text-gray-300 group-hover:bg-gray-200 dark:group-hover:bg-zinc-700 transition-colors shrink-0">
                <Code size={18} />
              </div>
            </button>

            <div className="my-1 border-t border-gray-100 dark:border-zinc-800" />

            {/* Owner Archive & Trash Actions */}
            {isOwner ? (
              <>
                {/* 11. Move to Archive */}
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    setActiveModal('archive_confirm');
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-800/80 transition-colors text-start group cursor-pointer"
                >
                  <div className="flex flex-col flex-1 min-w-0 pr-3 rtl:pr-0 rtl:pl-3">
                    <span className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white">
                      {isRtl ? 'نقل إلى الأرشيف' : 'Move to archive'}
                    </span>
                  </div>
                  <div className="w-9 h-9 rounded-[4px] bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-700 dark:text-gray-300 group-hover:bg-gray-200 dark:group-hover:bg-zinc-700 transition-colors shrink-0">
                    <Archive size={18} />
                  </div>
                </button>

                {/* 12. Move to Trash (Highlighted Inset Card) */}
                <div
                  onClick={() => {
                    onClose();
                    setActiveModal('trash_confirm');
                  }}
                  className="mt-1 p-2.5 rounded-xl bg-gray-100/90 dark:bg-zinc-800/90 hover:bg-red-50/80 dark:hover:bg-red-950/30 border border-transparent hover:border-red-500/30 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col flex-1 min-w-0 pr-3 rtl:pr-0 rtl:pl-3">
                      <span className="font-bold text-xs sm:text-sm text-red-600 dark:text-red-400 group-hover:text-red-500">
                        {isRtl ? 'نقل إلى سلة المهملات' : 'Move to trash'}
                      </span>
                      <span className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-normal">
                        {isRtl
                          ? 'يتم حذف العناصر الموجودة في سلة المهملات بعد 30 يومًا.'
                          : 'Items in your trash are deleted after 30 days.'}
                      </span>
                    </div>
                    <div className="w-9 h-9 rounded-[4px] bg-white dark:bg-zinc-700/80 flex items-center justify-center text-red-500 group-hover:bg-red-100 dark:group-hover:bg-red-900/50 transition-colors shrink-0">
                      <Trash2 size={18} />
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Non-owner: Hide Post */}
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onHideAd?.(ad.id);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-800/80 transition-colors text-start group cursor-pointer"
                >
                  <div className="flex flex-col flex-1 min-w-0 pr-3 rtl:pr-0 rtl:pl-3">
                    <span className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white">
                      {isRtl ? 'إخفاء هذا المنشور' : 'Hide this post'}
                    </span>
                  </div>
                  <div className="w-9 h-9 rounded-[4px] bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-700 dark:text-gray-300 group-hover:bg-gray-200 dark:group-hover:bg-zinc-700 transition-colors shrink-0">
                    <EyeOff size={18} />
                  </div>
                </button>

                {/* Non-owner: Report Post */}
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onReportAd?.(ad);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 dark:text-red-400 transition-colors text-start group cursor-pointer"
                >
                  <div className="flex flex-col flex-1 min-w-0 pr-3 rtl:pr-0 rtl:pl-3">
                    <span className="font-bold text-xs sm:text-sm text-red-600 dark:text-red-400">
                      {isRtl ? 'إبلاغ عن محتوى غير لائق' : 'Report inappropriate content'}
                    </span>
                  </div>
                  <div className="w-9 h-9 rounded-[4px] bg-red-100/50 dark:bg-red-900/30 flex items-center justify-center text-red-500 group-hover:bg-red-100 dark:group-hover:bg-red-900/50 transition-colors shrink-0">
                    <Flag size={18} />
                  </div>
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* DIALOG MODALS FOR DETAILED INTERACTIONS (100% REAL DATABASE CONNECTIVITY) */}
      {/* ========================================================================= */}

      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md bg-white dark:bg-[#1a1a1c] rounded-3xl border border-gray-200 dark:border-zinc-800 shadow-2xl p-5 overflow-hidden text-gray-900 dark:text-white"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button Header */}
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-zinc-800 mb-4">
                <h3 className="font-extrabold text-base flex items-center gap-2">
                  {activeModal === 'who_can_comment' && (isRtl ? 'من الذي يمكنه التعليق؟' : 'Who can comment?')}
                  {activeModal === 'audience' && (isRtl ? 'تعديل جمهور المنشور' : 'Edit audience')}
                  {activeModal === 'partnership' && (isRtl ? 'إعلان شراكة مدفوعة' : 'Paid Partnership Ad')}
                  {activeModal === 'ai_content' && (isRtl ? 'شفافية الذكاء الاصطناعي' : 'AI Content Disclosure')}
                  {activeModal === 'edit_date' && (isRtl ? 'تعديل تاريخ النشر' : 'Edit publication date')}
                  {activeModal === 'embed' && (isRtl ? 'تضمين المنشور' : 'Embed post')}
                  {activeModal === 'archive_confirm' && (isRtl ? 'نقل إلى الأرشيف' : 'Move to archive')}
                  {activeModal === 'trash_confirm' && (isRtl ? 'نقل إلى سلة المهملات' : 'Move to trash')}
                </h3>
                <button
                  onClick={() => setActiveModal(null)}
                  className="w-8 h-8 rounded-[4px] bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* 1. Modal: Who Can Comment */}
              {activeModal === 'who_can_comment' && (
                <div className="space-y-2.5">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                    {isRtl
                      ? 'اختر من يُسمح له بترك تعليقات على هذا المنشور الخاص بك على منصة بيربليكستا:'
                      : 'Choose who is allowed to comment on your post on Perplexta:'}
                  </p>

                  {[
                    { id: 'anyone', titleAr: 'الجميع', titleEn: 'Public / Anyone', descAr: 'يمكن لأي شخص مسجل في المنصة التعليق', descEn: 'Anyone registered can comment' },
                    { id: 'followers', titleAr: 'المتابعون فقط', titleEn: 'Followers only', descAr: 'يمكن لمتابعي صفحتك أو حسابك فقط التعليق', descEn: 'Only your followers can comment' },
                    { id: 'mentioned', titleAr: 'الملفات والشخصيات المذكورة فقط', titleEn: 'Mentioned profiles only', descAr: 'فقط من قمت بالإشارة إليهم في المنشور', descEn: 'Only users mentioned with @' },
                    { id: 'nobody', titleAr: 'إيقاف التعليقات تماماً', titleEn: 'Turn off comments', descAr: 'لا يمكن لأي مستخدم إضافة تعليقات جديدة', descEn: 'Nobody can add new comments' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSaveWhoCanComment(opt.id)}
                      disabled={isActionLoading}
                      className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all text-start cursor-pointer ${
                        whoCanComment === opt.id
                          ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20'
                          : 'border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800/50'
                      }`}
                    >
                      <div className="flex-1 min-w-0 pr-3 rtl:pr-0 rtl:pl-3">
                        <div className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white">
                          {isRtl ? opt.titleAr : opt.titleEn}
                        </div>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                          {isRtl ? opt.descAr : opt.descEn}
                        </div>
                      </div>
                      {whoCanComment === opt.id && (
                        <CheckCircle2 size={18} className="text-blue-500 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* 2. Modal: Audience */}
              {activeModal === 'audience' && (
                <div className="space-y-2.5">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                    {isRtl
                      ? 'حدد من يمكنه رؤية واكتشاف هذا المنشور في خلاصة المجتمع والبحث:'
                      : 'Choose who can discover and view this post in feeds and search:'}
                  </p>

                  {[
                    { id: 'public', icon: Globe, titleAr: 'الجمهور العام (عام)', titleEn: 'Public', descAr: 'أي شخص على بيرbليكستا أو خارجها', descEn: 'Anyone on or off Perplexta' },
                    { id: 'friends', icon: Users, titleAr: 'المتابعون والأصدقاء', titleEn: 'Followers only', descAr: 'متابعو ملفك الشخصي أو صفحتك المعتمدة', descEn: 'Your followers on Perplexta' },
                    { id: 'only_me', icon: Lock, titleAr: 'أنا فقط (خاص)', titleEn: 'Only me', descAr: 'مرئي لك وحدك ولن يظهر في الخلاصة', descEn: 'Only you can see this post' },
                  ].map((opt) => {
                    const IconComp = opt.icon;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleSaveAudience(opt.id)}
                        disabled={isActionLoading}
                        className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all text-start cursor-pointer ${
                          audience === opt.id
                            ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20'
                            : 'border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800/50'
                        }`}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 rounded-[4px] bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-700 dark:text-gray-300 shrink-0">
                            <IconComp size={18} />
                          </div>
                          <div>
                            <div className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white">
                              {isRtl ? opt.titleAr : opt.titleEn}
                            </div>
                            <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                              {isRtl ? opt.descAr : opt.descEn}
                            </div>
                          </div>
                        </div>
                        {audience === opt.id && (
                          <CheckCircle2 size={18} className="text-blue-500 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* 3. Modal: Branded Partnership */}
              {activeModal === 'partnership' && (
                <div className="space-y-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {isRtl
                      ? 'يمكنك وسم هذا المنشور كشراكة تجارية مدفوعة مع علامة تجارية ومشاركة الرمز مع المعلن:'
                      : 'Tag this post as a paid partnership and share the verification code with the sponsor brand:'}
                  </p>

                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-800">
                    <div>
                      <div className="font-bold text-xs text-gray-900 dark:text-white">
                        {isRtl ? 'وسم "شراكة مدفوعة"' : 'Paid partnership label'}
                      </div>
                      <div className="text-[11px] text-gray-500">
                        {isRtl ? 'إظهار علامة الشراكة فوق المنشور' : 'Display sponsor tag above post'}
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={isPartnership}
                      onChange={(e) => setIsPartnership(e.target.checked)}
                      className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1 text-gray-700 dark:text-gray-300">
                      {isRtl ? 'اسم العلامة التجارية / الراعي' : 'Sponsor / Brand Name'}
                    </label>
                    <input
                      type="text"
                      value={partnershipBrand}
                      onChange={(e) => setPartnersBrand(e.target.value)}
                      placeholder={isRtl ? 'مثال: شركة القدس للتقنية' : 'e.g., Nike, Perplexta'}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-xs font-medium focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1 text-gray-700 dark:text-gray-300">
                      {isRtl ? 'رمز إعلان الشراكة' : 'Partnership Ad Code'}
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={partnershipCode || `PRP-PARTNER-AD-${ad.id}`}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-gray-100 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 text-xs font-mono font-bold text-gray-700 dark:text-gray-300"
                      />
                      <button
                        type="button"
                        onClick={copyPartnershipCode}
                        className="px-3.5 py-2.5 rounded-xl bg-gray-200 dark:bg-zinc-700 hover:bg-gray-300 dark:hover:bg-zinc-600 text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0"
                      >
                        {copiedCode ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                        <span>{copiedCode ? (isRtl ? 'تم النسخ' : 'Copied') : (isRtl ? 'نسخ' : 'Copy')}</span>
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSavePartnership}
                      disabled={isActionLoading}
                      className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      {isActionLoading && <Loader2 size={14} className="animate-spin" />}
                      <span>{isRtl ? 'حفظ إعدادات الشراكة' : 'Save Partnership'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* 4. Modal: AI Content Disclosure */}
              {activeModal === 'ai_content' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs leading-relaxed flex items-start gap-3">
                    <Sparkles size={20} className="shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block mb-1">
                        {isRtl ? 'معايير الشفافية والموثوقية' : 'Transparency & Trust'}
                      </span>
                      {isRtl
                        ? 'تلتزم منصة بيربليكستا بتوضيح المحتوى المنشأ أو المعدل بواسطة الذكاء الاصطناعي لحماية سلامة المجتمع ودعم أصالة المحتوى.'
                        : 'Perplexta is committed to labeling content generated or modified by AI to foster community trust and authenticity.'}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-800">
                    <div>
                      <div className="font-bold text-xs text-gray-900 dark:text-white">
                        {isRtl ? 'وسم "محتوى ذكاء اصطناعي"' : 'AI Content Label'}
                      </div>
                      <div className="text-[11px] text-gray-500">
                        {isRtl ? 'إظهار شارة الذكاء الاصطناعي على المنشور' : 'Show AI badge on post'}
                      </div>
                    </div>
                    {isOwner ? (
                      <input
                        type="checkbox"
                        checked={isAiGenerated}
                        onChange={(e) => handleToggleAi(e.target.checked)}
                        className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                      />
                    ) : (
                      <span className="font-bold text-xs px-2.5 py-1 rounded-[4px] bg-gray-200 dark:bg-zinc-700">
                        {isAiGenerated ? (isRtl ? 'مُفعّل' : 'Active') : (isRtl ? 'غير مفعل' : 'Inactive')}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* 5. Modal: Edit Date */}
              {activeModal === 'edit_date' && (
                <div className="space-y-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {isRtl
                      ? 'يمكنك تعديل توقيت وتاريخ نشر هذا المنشور لتنظيم أرشيفك الشخصي:'
                      : 'You can adjust the publication timestamp of this post for your timeline:'}
                  </p>

                  <div>
                    <label className="block text-xs font-bold mb-1 text-gray-700 dark:text-gray-300">
                      {isRtl ? 'تاريخ ووقت النشر الجديد' : 'New publication date and time'}
                    </label>
                    <input
                      type="datetime-local"
                      value={dateInput}
                      onChange={(e) => setDateInput(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-xs font-medium focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleSaveDate}
                      disabled={isActionLoading}
                      className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      {isActionLoading && <Loader2 size={14} className="animate-spin" />}
                      <span>{isRtl ? 'حفظ التاريخ' : 'Save Date'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* 6. Modal: Embed */}
              {activeModal === 'embed' && (
                <div className="space-y-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {isRtl
                      ? 'انسخ كود iframe لتضمين هذا المنشور مباشرة في موقعك أو منصتك:'
                      : 'Copy this iframe snippet to embed this post directly onto your website or platform:'}
                  </p>

                  <div className="p-3 rounded-2xl bg-gray-100 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800">
                    <pre className="text-[11px] font-mono text-gray-700 dark:text-gray-300 overflow-x-auto whitespace-pre-wrap break-all">
                      {embedCode}
                    </pre>
                  </div>

                  <button
                    type="button"
                    onClick={copyEmbedCode}
                    className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    {copiedEmbed ? <Check size={16} /> : <Copy size={16} />}
                    <span>{copiedEmbed ? (isRtl ? 'تم النسخ بنجاح!' : 'Copied!') : (isRtl ? 'نسخ رمز التضمين' : 'Copy Embed Code')}</span>
                  </button>
                </div>
              )}

              {/* 7. Modal: Archive Confirm */}
              {activeModal === 'archive_confirm' && (
                <div className="space-y-4">
                  <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                    {isRtl
                      ? 'هل تريد نقل هذا المنشور إلى الأرشيف؟ سيتم إخفاؤه من الخلاصة العامة وقنوات التصفح، ويمكنك استعادته في أي وقت من قسم الأرشيف في حسابك.'
                      : 'Move this post to archive? It will be hidden from the public feed, and you can restore it anytime from your archive.'}
                  </p>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveModal(null)}
                      className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 font-bold text-xs transition-colors cursor-pointer"
                    >
                      {isRtl ? 'إلغاء' : 'Cancel'}
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmArchive}
                      disabled={isActionLoading}
                      className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      {isActionLoading && <Loader2 size={14} className="animate-spin" />}
                      <span>{isRtl ? 'تأكيد الأرشفة' : 'Confirm Archive'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* 8. Modal: Trash Confirm (30 Days Auto-Purge Notice) */}
              {activeModal === 'trash_confirm' && (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs leading-relaxed">
                    <span className="font-bold block mb-1 text-sm">
                      {isRtl ? 'نقل المنشور إلى سلة المهملات؟' : 'Move post to trash?'}
                    </span>
                    {isRtl
                      ? 'يتم حذف العناصر الموجودة في سلة المهملات نهائياً بعد 30 يومًا تلقائياً بواسطة نظام الصيانة.'
                      : 'Items placed in trash will be permanently deleted after 30 days automatically by system maintenance.'}
                  </div>

                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {isRtl
                      ? 'لن يظهر هذا المنشور للمتابعين بعد الآن. يمكنك التراجع واستعادة المنشور قبل انتهاء الـ 30 يوماً.'
                      : 'This post will no longer be visible to users. You can restore it before the 30-day window ends.'}
                  </p>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveModal(null)}
                      className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 font-bold text-xs transition-colors cursor-pointer"
                    >
                      {isRtl ? 'إلغاء' : 'Cancel'}
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmTrash}
                      disabled={isActionLoading}
                      className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      {isActionLoading && <Loader2 size={14} className="animate-spin" />}
                      <span>{isRtl ? 'نقل إلى سلة المهملات' : 'Move to Trash'}</span>
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

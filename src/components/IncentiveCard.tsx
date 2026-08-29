import React, { useState, useEffect, useCallback } from 'react';
import { Share2, Copy, Check, X, Megaphone, Users, ArrowUpRight, MousePointer2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppContext } from '../context/AppContext';
import { toast } from 'sonner';

export const IncentiveCard: React.FC = () => {
  const { dir, t, user, milestoneData, setMilestoneData, siteSettings } = useAppContext();
  const [copied, setCopied] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const isVisible = !!milestoneData && !isClosing;

  const currentSiteName = dir === 'rtl' ? (siteSettings.siteNameAr || siteSettings.siteName) : siteSettings.siteName;
  const shareTitle = currentSiteName || 'AI Platform';

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setMilestoneData(null);
      setIsClosing(false);
    }, 500);
  }, [setMilestoneData]);

  useEffect(() => {
    if (!isVisible) return;

    const hideHandler = () => {
      handleClose();
    };

    const timeout = setTimeout(() => {
      window.addEventListener('mousemove', hideHandler, { once: true });
      window.addEventListener('click', hideHandler, { once: true });
    }, 1500); // 1.5s grace period to see it

    return () => {
      clearTimeout(timeout);
      window.removeEventListener('mousemove', hideHandler);
      window.removeEventListener('click', hideHandler);
    };
  }, [isVisible, handleClose]);

  if (!milestoneData) return null;

  const { percentage } = milestoneData;
  
  const referralLink = `${window.location.origin}/?ref=${user?.referral_code || user?.id || 'elite'}`;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success(
      dir === 'rtl' 
        ? 'تم نسخ رابط الإحالة الخاص بك بنجاح!' 
        : 'Referral link copied to clipboard successfully!'
    );
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: t('quotaMilestoneIncentive'),
          url: referralLink,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      handleCopy(e);
    }
  };

  const getMilestoneContent = () => {
    if (percentage === 50) {
      return {
        title: t('quotaMilestoneTitle').replace('{percentage}', '50'),
        desc: t('quotaMilestone50'),
        color: 'text-accent',
        bg: 'bg-accent/10',
        progress: 'w-1/2',
        icon: <Megaphone className="text-accent" size={18} />
      };
    }
    if (percentage === 90) {
      return {
        title: t('quotaMilestoneTitle').replace('{percentage}', '90'),
        desc: t('quotaMilestone90'),
        color: 'text-amber-500',
        bg: 'bg-amber-500/10',
        progress: 'w-[90%]',
        icon: <Megaphone className="text-amber-500" size={18} />
      };
    }
    return {
      title: t('quotaMilestone100'),
      desc: t('quotaMilestone100'),
      color: 'text-rose-500',
      bg: 'bg-rose-500/10',
      progress: 'w-full',
      icon: <ArrowUpRight className="text-rose-500" size={18} />
    };
  };

  const content = getMilestoneContent();

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div 
          initial={{ opacity: 0, y: 30, scale: 0.95, x: '-50%' }}
          animate={{ opacity: 1, y: 0, scale: 1, x: '-50%' }}
          exit={{ opacity: 0, scale: 0.95, y: 20, x: '-50%' }}
          transition={{ type: 'spring', stiffness: 350, damping: 28 }}
          className={`fixed bottom-6 left-1/2 z-[200] w-[90%] max-w-[350px] rounded-2xl border border-[var(--border-main)] shadow-xl overflow-hidden bg-[var(--bg-secondary)]/95 backdrop-blur-2xl`}
          onClick={(e) => e.stopPropagation()} // Prevent close when clicking the card itself
        >
          {/* Progress Bar (Header) */}
          <div className="h-1 w-full bg-[var(--bg-primary)]">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className={`h-full ${content.color.replace('text', 'bg')}`}
            />
          </div>

          <div className="p-3.5 sm:p-4">
            <div className={`flex items-start gap-2.5 ${dir === 'rtl' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-9 h-9 rounded-xl ${content.bg} flex items-center justify-center shrink-0`}>
                {content.icon}
              </div>
              
              <div className={`flex-1 min-w-0 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
                <h3 className="text-[var(--text-primary)] font-extrabold text-xs tracking-tight truncate">
                  {content.title}
                </h3>
                <p className="text-[var(--text-secondary)] text-[10.5px] mt-0.5 leading-snug line-clamp-2">
                  {content.desc}
                </p>
              </div>

              <button 
                onClick={handleClose}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-0.5 rounded-lg transition-colors cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <div className={`mt-3 p-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-main)] ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
              <div className="flex items-center gap-1.5 mb-1">
                <Users size={13} className="text-accent" />
                <span className="text-[11px] font-extrabold text-accent uppercase tracking-wider">
                  {t('rewardFriends')}
                </span>
              </div>
              <p className="text-[var(--text-secondary)] text-[10.5px] leading-tight line-clamp-2">
                {t('quotaMilestoneIncentive')}
              </p>

              <div className="mt-2.5 flex items-center gap-1.5">
                <button 
                  onClick={handleShare}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent hover:opacity-90 text-black text-[11px] font-extrabold transition-all shadow-sm active:scale-95 cursor-pointer"
                >
                  <Share2 size={12} />
                  {dir === 'rtl' ? 'مشاركة الرابط' : 'Share Link'}
                </button>
                <button 
                  onClick={handleCopy}
                  className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-main)] text-[var(--text-primary)] text-[11px] font-bold transition-all active:scale-95 cursor-pointer"
                >
                  {copied ? <Check size={12} className="text-accent" /> : <Copy size={12} />}
                  {copied ? (dir === 'rtl' ? 'تم النسخ' : 'Copied') : (dir === 'rtl' ? 'نسخ' : 'Copy')}
                </button>
              </div>
            </div>

            <div className="mt-2 flex items-center justify-center gap-1.5 opacity-40">
              <MousePointer2 size={10} className="text-[var(--text-muted)]" />
              <span className="text-[9.5px] text-[var(--text-muted)]">
                {dir === 'rtl' ? 'حرك الماوس أو اضغط للإخفاء' : 'Move mouse or click to dismiss'}
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

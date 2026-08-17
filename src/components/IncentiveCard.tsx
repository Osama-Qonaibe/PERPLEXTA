import React, { useState, useEffect, useCallback } from 'react';
import { Share2, Copy, Check, X, Megaphone, Users, ArrowUpRight, MousePointer2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppContext } from '../context/AppContext';
import { toast } from 'sonner';

export const IncentiveCard: React.FC = () => {
  const { dir, t, user, milestoneData, setMilestoneData, siteSettings } = useAppContext();
  const [copied, setCopied] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  // Hidden/Visible state based on milestoneData
  const isVisible = !!milestoneData && !isClosing;

  // Use dynamic site name for share
  const currentSiteName = dir === 'rtl' ? (siteSettings.siteNameAr || siteSettings.siteName) : siteSettings.siteName;
  const shareTitle = currentSiteName || 'AI Platform';

  // Function to handle close
  const handleClose = useCallback(() => {
    setIsClosing(true);
    // Slight delay to allow animation to finish
    setTimeout(() => {
      setMilestoneData(null);
      setIsClosing(false);
    }, 500);
  }, [setMilestoneData]);

  // Handle global mouse move or click to hide
  useEffect(() => {
    if (!isVisible) return;

    const hideHandler = () => {
      // We use a small delay so human eyes can at least see it popped up
      // but the user requested "if user clicks or moves mouse anywhere it disappears"
      handleClose();
    };

    // Delay adding listeners to prevent immediate closing during the trigger action
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

  const { percentage, toolId, planNameEn, planNameAr } = milestoneData;
  const planName = dir === 'rtl' ? planNameAr : planNameEn;
  
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

  // Milestone specific content
  const getMilestoneContent = () => {
    if (percentage === 50) {
      return {
        title: t('quotaMilestoneTitle').replace('{percentage}', '50'),
        desc: t('quotaMilestone50'),
        color: 'text-accent',
        bg: 'bg-accent/10',
        progress: 'w-1/2',
        icon: <Megaphone className="text-accent" size={24} />
      };
    }
    if (percentage === 90) {
      return {
        title: t('quotaMilestoneTitle').replace('{percentage}', '90'),
        desc: t('quotaMilestone90'),
        color: 'text-amber-500',
        bg: 'bg-amber-500/10',
        progress: 'w-[90%]',
        icon: <Megaphone className="text-amber-500" size={24} />
      };
    }
    return {
      title: t('quotaMilestone100'),
      desc: t('quotaMilestone100'),
      color: 'text-rose-500',
      bg: 'bg-rose-500/10',
      progress: 'w-full',
      icon: <ArrowUpRight className="text-rose-500" size={24} />
    };
  };

  const content = getMilestoneContent();

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div 
          initial={{ opacity: 0, y: 50, scale: 0.9, x: '-50%' }}
          animate={{ opacity: 1, y: 0, scale: 1, x: '-50%' }}
          exit={{ opacity: 0, scale: 0.9, y: 20, x: '-50%' }}
          className={`fixed bottom-12 left-1/2 z-[200] w-[92%] max-w-[420px] rounded-[var(--radius)] border border-[var(--border-main)] shadow-2xl overflow-hidden bg-[var(--bg-secondary)]/95 backdrop-blur-2xl`}
          onClick={(e) => e.stopPropagation()} // Prevent close when clicking the card itself
        >
          {/* Progress Bar (Header) */}
          <div className="h-1.5 w-full bg-[var(--bg-primary)]">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className={`h-full ${content.color.replace('text', 'bg')}`}
            />
          </div>

          <div className="p-6">
            <div className={`flex items-start gap-4 ${dir === 'rtl' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-14 h-14 rounded-[var(--radius)] ${content.bg} flex items-center justify-center shrink-0`}>
                {content.icon}
              </div>
              
              <div className={`flex-1 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
                <h3 className="text-[var(--text-primary)] font-bold text-lg tracking-tight">
                  {content.title}
                </h3>
                <p className="text-[var(--text-secondary)] text-sm mt-1 leading-relaxed">
                  {content.desc}
                </p>
              </div>

              <button 
                onClick={handleClose}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className={`mt-6 p-4 rounded-[var(--radius)] bg-[var(--bg-primary)] border border-[var(--border-main)] ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
              <div className="flex items-center gap-2 mb-2">
                <Users size={16} className="text-accent" />
                <span className="text-[13px] font-bold text-accent uppercase tracking-wider">
                  {t('rewardFriends')}
                </span>
              </div>
              <p className="text-[var(--text-secondary)] text-[13px] leading-snug">
                {t('quotaMilestoneIncentive')}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <button 
                  onClick={handleShare}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-[var(--radius)] bg-accent hover:bg-accent text-white text-xs font-bold transition-theme shadow-lg shadow-none active:scale-95"
                >
                  <Share2 size={14} />
                  {dir === 'rtl' ? 'مشاركة الرابط' : 'Share Link'}
                </button>
                <button 
                  onClick={handleCopy}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-[var(--radius)] bg-[var(--bg-secondary)] border border-[var(--border-main)] text-[var(--text-primary)] text-xs font-bold transition-theme active:scale-95"
                >
                  {copied ? <Check size={14} className="text-accent" /> : <Copy size={14} />}
                  {copied ? (dir === 'rtl' ? 'تم النسخ' : 'Copied') : (dir === 'rtl' ? 'نسخ' : 'Copy')}
                </button>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-center gap-2 opacity-50">
              <MousePointer2 size={12} className="text-[var(--text-muted)]" />
              <span className="text-[10px] text-[var(--text-muted)] italic">
                {dir === 'rtl' ? 'حرك الماوس أو اضغط للإخفاء' : 'Move mouse or click to dismiss'}
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

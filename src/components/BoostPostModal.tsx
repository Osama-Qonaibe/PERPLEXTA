import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Rocket,
  X,
  CreditCard,
  Wallet,
  Zap,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  TrendingUp,
  Globe
} from 'lucide-react';
import { toast } from '../context/NotificationContext';
import { BulletinAd } from '../../server/db/types';
import { getMediaUrl } from '../utils/mediaUtils';

interface BoostPostModalProps {
  ad: BulletinAd | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedAd: BulletinAd) => void;
  walletBalance: number;
  token: string | null;
  isRtl: boolean;
  onNavigateToWallet?: () => void;
}

const BOOST_TIERS = [
  {
    days: 1,
    price: 2.00,
    titleAr: 'تنشيط سريع (24 ساعة)',
    titleEn: 'Quick Spark (24 Hours)',
    badgeAr: 'سريع',
    badgeEn: 'Starter',
    viewsAr: '+1,500 مشاهدة متوقعة',
    viewsEn: '+1,500 Est. Views',
    descAr: 'ظهور الأولوية في لوحة الإعلانات لمدة 24 ساعة.',
    descEn: 'Priority placement on bulletin board for 24 hours.'
  },
  {
    days: 3,
    price: 5.00,
    titleAr: 'تنشيط ذهبي (3 أيام)',
    titleEn: 'Gold Priority (3 Days)',
    badgeAr: 'الأكثر شعبية ⭐',
    badgeEn: 'Most Popular ⭐',
    popular: true,
    viewsAr: '+5,000 مشاهدة متوقعة',
    viewsEn: '+5,000 Est. Views',
    descAr: 'تثبيت في الصدارة وتوصية الذكاء الاصطناعي للمستخدمين المهتمين.',
    descEn: 'Top feed pin & AI recommendation for targeted audience.'
  },
  {
    days: 7,
    price: 10.00,
    titleAr: 'تنشيط ماسي VIP (7 أيام)',
    titleEn: 'Diamond VIP (7 Days)',
    badgeAr: 'أقصى انتشار 🚀',
    badgeEn: 'Max Reach VIP 🚀',
    viewsAr: '+12,000 مشاهدة متوقعة + تمييز خارجي',
    viewsEn: '+12,000 Est. Views + Featured Badge',
    descAr: 'تثبيت مستمر في القمة، شارة VIP ذهبية، وإشعار فوري للعملاء.',
    descEn: 'Continuous top placement, golden VIP badge, & client notifications.'
  }
];

export const BoostPostModal: React.FC<BoostPostModalProps> = ({
  ad,
  isOpen,
  onClose,
  onSuccess,
  walletBalance,
  token,
  isRtl,
  onNavigateToWallet
}) => {
  const [selectedDays, setSelectedDays] = useState<number>(3);
  const [paymentMethod, setPaymentMethod] = useState<'wallet' | 'stripe' | 'x402'>('wallet');
  const [loading, setLoading] = useState<boolean>(false);

  if (!isOpen || !ad) return null;

  const currentTier = BOOST_TIERS.find(t => t.days === selectedDays) || BOOST_TIERS[1];
  const hasSufficientBalance = walletBalance >= currentTier.price;

  const handleConfirmBoost = async () => {
    if (!token) {
      toast.error(isRtl ? 'يرجى تسجيل الدخول أولاً لتمويل الإعلان' : 'Please log in to boost your post');
      return;
    }

    setLoading(true);

    try {
      if (paymentMethod === 'wallet') {
        if (!hasSufficientBalance) {
          toast.error(
            isRtl
              ? `رصيدك الحالي ($${walletBalance.toFixed(2)}) غير كافٍ. يرجى شحن المحفظة أولاً.`
              : `Insufficient wallet balance ($${walletBalance.toFixed(2)}). Please top up.`
          );
          setLoading(false);
          return;
        }

        const res = await fetch(`/api/bulletin/ads/${ad.id}/boost-wallet`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            days: selectedDays,
            tierName: isRtl ? currentTier.titleAr : currentTier.titleEn
          })
        });

        const data = await res.json();
        if (data.success && data.ad) {
          toast.success(
            isRtl
              ? 'تم تمويل وتنشيط إعلانك بنجاح! سينتقل الآن لصدارة النتائج.'
              : 'Post boosted successfully! It is now prioritized at the top.'
          );
          onSuccess(data.ad);
          onClose();
        } else {
          toast.error(data.error || (isRtl ? 'فشل عملية التمويل' : 'Failed to boost post'));
        }
      } else if (paymentMethod === 'stripe') {
        const res = await fetch(`/api/bulletin/ads/${ad.id}/boost-stripe`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            days: selectedDays,
            tierName: isRtl ? currentTier.titleAr : currentTier.titleEn
          })
        });

        const data = await res.json();
        if (data.url) {
          toast.info(isRtl ? 'جاري تحويلك لبوابة الدفع Stripe...' : 'Redirecting to Stripe checkout...');
          window.location.href = data.url;
        } else {
          toast.error(data.error_ar || data.error || (isRtl ? 'فشل إعداد بوابة Stripe' : 'Failed to initialize Stripe'));
        }
      } else if (paymentMethod === 'x402') {
        const res = await fetch(`/api/bulletin/ads/${ad.id}/boost-x402`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            days: selectedDays,
            tierName: isRtl ? currentTier.titleAr : currentTier.titleEn,
            txHash: `x402_direct_${Date.now()}`
          })
        });

        const data = await res.json();
        if (data.success && data.ad) {
          toast.success(
            isRtl
              ? 'تم التمويل ببروتوكول Web3 X402 بنجاح!'
              : 'Boosted successfully via X402 Web3 Protocol!'
          );
          onSuccess(data.ad);
          onClose();
        } else {
          toast.error(data.error || (isRtl ? 'فشل الدفع عبر X402' : 'X402 Payment failed'));
        }
      }
    } catch (err: any) {
      toast.error(err.message || (isRtl ? 'حدث خطأ غير متوقع' : 'An unexpected error occurred'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-lg my-8 bg-[var(--surface-card)] border border-[var(--border-main)] rounded-[0px] shadow-lg overflow-hidden text-[var(--text-primary)]"
        >
          {/* Top Banner Header */}
          <div className="bg-[var(--surface-subtle)] border-b border-[var(--border-main)] p-4 text-[var(--text-primary)] relative overflow-hidden">
            <div className="absolute -end-6 -bottom-6 opacity-10 pointer-events-none">
              <Rocket size={120} />
            </div>

            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-[0px] bg-[var(--bg-accent-muted)] text-[var(--fg-accent)] border border-[var(--border-accent)]/30">
                  <Rocket size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <span>{isRtl ? 'تمويل وترويج الإعلان' : 'Boost & Promote Post'}</span>
                    <span className="px-1.5 py-0.5 rounded-[0px] bg-[var(--bg-accent-emphasis)] text-[var(--fg-on-emphasis)] text-[9px] font-bold uppercase">
                      VIP
                    </span>
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] font-medium pt-0.5">
                    {isRtl ? 'احصل على ضعف المشاهدات وضاعف مبيعاتك واستفساراتك' : 'Multiply views, inquiries & sales instantly'}
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-1.5 rounded-[0px] bg-[var(--surface-subtle)] hover:bg-[var(--surface-inset)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-theme border border-[var(--border-main)] cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="p-4 space-y-4 max-h-[80vh] overflow-y-auto">
            {/* Ad Preview Card Box */}
            <div className="p-3 bg-[var(--surface-subtle)] rounded-[0px] border border-[var(--border-main)] flex items-center gap-3">
              {ad.image_url ? (
                <img
                  src={getMediaUrl(ad.image_url)}
                  alt={ad.title}
                  className="w-12 h-12 rounded-[0px] object-cover border border-[var(--border-main)] shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-[0px] bg-[var(--bg-accent-muted)] text-[var(--fg-accent)] flex items-center justify-center shrink-0 font-bold text-xs border border-[var(--border-accent)]/30">
                  AD
                </div>
              )}

              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-bold truncate text-[var(--text-primary)]">
                  {ad.title}
                </h4>
                <p className="text-[11px] text-[var(--text-muted)] line-clamp-1 pt-0.5">
                  {ad.description}
                </p>
                <div className="flex items-center gap-2 text-[10px] text-[var(--fg-accent)] font-bold pt-1">
                  <span className="flex items-center gap-1">
                    <TrendingUp size={12} />
                    {isRtl ? 'الحالة الحالية:' : 'Current:'} {ad.is_boosted ? (isRtl ? 'مُموَّل مفعل 🚀' : 'Active Boost') : (isRtl ? 'عادي' : 'Standard')}
                  </span>
                </div>
              </div>
            </div>

            {/* Select Boost Duration / Tier */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[var(--text-primary)] flex items-center justify-between">
                <span>{isRtl ? 'اختر باقة التمويل والتنشيط:' : 'Select Boost Package:'}</span>
                <span className="text-[11px] text-[var(--fg-accent)] font-bold flex items-center gap-1">
                  <Sparkles size={12} />
                  {isRtl ? 'أولوية الظهور بقمة اللوحة' : 'Top Feed Priority'}
                </span>
              </label>

              <div className="grid grid-cols-1 gap-2">
                {BOOST_TIERS.map(tier => {
                  const isSelected = selectedDays === tier.days;
                  return (
                    <div
                      key={tier.days}
                      onClick={() => setSelectedDays(tier.days)}
                      className={`relative p-3 rounded-[0px] border transition-theme cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'border-[var(--border-accent)] bg-[var(--bg-accent-muted)]'
                          : 'border-[var(--border-main)] bg-[var(--surface-subtle)] hover:border-[var(--border-accent)]/50'
                      }`}
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[var(--text-primary)]">
                            {isRtl ? tier.titleAr : tier.titleEn}
                          </span>
                          {tier.popular && (
                            <span className="px-1.5 py-0.5 rounded-[0px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[9px] font-bold">
                              {isRtl ? tier.badgeAr : tier.badgeEn}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[var(--fg-accent)] font-bold flex items-center gap-1">
                          <Zap size={11} />
                          <span>{isRtl ? tier.viewsAr : tier.viewsEn}</span>
                        </p>
                        <p className="text-[10px] text-[var(--text-muted)]">
                          {isRtl ? tier.descAr : tier.descEn}
                        </p>
                      </div>

                      <div className="text-end shrink-0">
                        <span className="text-sm font-bold text-[var(--fg-accent)]">
                          ${tier.price.toFixed(2)}
                        </span>
                        <span className="text-[9px] text-[var(--text-muted)] block">USD</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Select Payment Method */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[var(--text-primary)]">
                {isRtl ? 'اختر طريقة الدفع:' : 'Select Payment Method:'}
              </label>

              <div className="grid grid-cols-3 gap-2">
                {/* Wallet Method */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('wallet')}
                  className={`p-2.5 rounded-[0px] border flex flex-col items-center justify-center gap-1 transition-theme cursor-pointer ${
                    paymentMethod === 'wallet'
                      ? 'border-[var(--border-accent)] bg-[var(--bg-accent-muted)] text-[var(--fg-accent)] font-bold'
                      : 'border-[var(--border-main)] text-[var(--text-muted)] bg-[var(--surface-subtle)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Wallet size={16} />
                  <span className="text-[10px] whitespace-nowrap">{isRtl ? 'رصيد المحفظة' : 'Wallet Balance'}</span>
                </button>

                {/* Stripe Method */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('stripe')}
                  className={`p-2.5 rounded-[0px] border flex flex-col items-center justify-center gap-1 transition-theme cursor-pointer ${
                    paymentMethod === 'stripe'
                      ? 'border-[var(--border-accent)] bg-[var(--bg-accent-muted)] text-[var(--fg-accent)] font-bold'
                      : 'border-[var(--border-main)] text-[var(--text-muted)] bg-[var(--surface-subtle)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <CreditCard size={16} />
                  <span className="text-[10px] whitespace-nowrap">{isRtl ? 'بطاقة الائتمان' : 'Credit Card'}</span>
                </button>

                {/* X402 Web3 Crypto */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('x402')}
                  className={`p-2.5 rounded-[0px] border flex flex-col items-center justify-center gap-1 transition-theme cursor-pointer ${
                    paymentMethod === 'x402'
                      ? 'border-[var(--border-accent)] bg-[var(--bg-accent-muted)] text-[var(--fg-accent)] font-bold'
                      : 'border-[var(--border-main)] text-[var(--text-muted)] bg-[var(--surface-subtle)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Globe size={16} />
                  <span className="text-[10px] whitespace-nowrap">{isRtl ? 'دفع X402 Web3' : 'X402 Crypto'}</span>
                </button>
              </div>

              {/* Wallet Info Box */}
              {paymentMethod === 'wallet' && (
                <div className={`p-2.5 rounded-[0px] border text-xs flex items-center justify-between gap-2 ${
                  hasSufficientBalance
                    ? 'bg-[var(--bg-accent-muted)] border-[var(--border-accent)]/40 text-[var(--fg-accent)]'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                }`}>
                  <div className="flex items-center gap-2">
                    {hasSufficientBalance ? (
                      <CheckCircle2 size={15} className="shrink-0" />
                    ) : (
                      <AlertCircle size={15} className="shrink-0" />
                    )}
                    <div>
                      <p className="font-bold">
                        {isRtl ? 'رصيد المحفظة المتوفر:' : 'Available Wallet Balance:'} ${walletBalance.toFixed(2)} USD
                      </p>
                      {!hasSufficientBalance && (
                        <p className="text-[10px] opacity-80 pt-0.5">
                          {isRtl
                            ? `تحتاج إضافة $${(currentTier.price - walletBalance).toFixed(2)} USD إضافية`
                            : `Need $${(currentTier.price - walletBalance).toFixed(2)} more`}
                        </p>
                      )}
                    </div>
                  </div>

                  {!hasSufficientBalance && onNavigateToWallet && (
                    <button
                      onClick={onNavigateToWallet}
                      className="px-2 py-1 rounded-[0px] bg-amber-500 text-white font-bold text-[10px] hover:bg-amber-600 transition-theme shrink-0 cursor-pointer"
                    >
                      {isRtl ? 'شحن المحفظة' : 'Top Up'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="p-3 bg-[var(--surface-subtle)] border-t border-[var(--border-main)] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-[0px] border border-[var(--border-main)] text-xs font-bold text-[var(--text-muted)] hover:bg-[var(--surface-card)] hover:text-[var(--text-primary)] transition-theme cursor-pointer"
            >
              {isRtl ? 'إلغاء' : 'Cancel'}
            </button>

            <button
              type="button"
              onClick={handleConfirmBoost}
              disabled={loading || (paymentMethod === 'wallet' && !hasSufficientBalance)}
              className="px-4 py-2 rounded-[0px] bg-[var(--bg-accent-emphasis)] text-[var(--fg-on-emphasis)] hover:opacity-90 disabled:opacity-50 font-bold text-xs flex items-center gap-2 transition-theme cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>{isRtl ? 'جاري معالجة التمويل...' : 'Processing Boost...'}</span>
                </>
              ) : (
                <>
                  <Rocket size={15} />
                  <span>
                    {isRtl
                      ? `تأكيد التمويل ($${currentTier.price.toFixed(2)})`
                      : `Confirm & Boost ($${currentTier.price.toFixed(2)})`}
                  </span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

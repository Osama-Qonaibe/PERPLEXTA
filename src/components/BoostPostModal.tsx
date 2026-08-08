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
  ShieldCheck,
  TrendingUp,
  Globe
} from 'lucide-react';
import { toast } from 'sonner';
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
          className="relative w-full max-w-lg my-8 bg-white dark:bg-[#18181b] border border-gray-200 dark:border-gray-800 rounded-3xl shadow-2xl overflow-hidden text-gray-900 dark:text-gray-100"
        >
          {/* Top Banner Header */}
          <div className="bg-gradient-to-r from-gray-500/10 via-teal-600 to-gray-500/5 p-5 text-white relative overflow-hidden">
            <div className="absolute -end-6 -bottom-6 opacity-20 pointer-events-none">
              <Rocket size={140} />
            </div>

            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-white/20 backdrop-blur-md text-amber-300 border border-white/30 shadow-inner">
                  <Rocket size={22} className="animate-bounce" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold flex items-center gap-2">
                    <span>{isRtl ? 'تمويل وترويج الإعلان' : 'Boost & Promote Post'}</span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-400 text-gray-900 text-[10px] font-black uppercase">
                      VIP
                    </span>
                  </h3>
                  <p className="text-xs text-accent-100 font-medium pt-0.5">
                    {isRtl ? 'احصل على ضعف المشاهدات وضاعف مبيعاتك واستفساراتك' : 'Multiply views, inquiries & sales instantly'}
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-theme"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="p-5 space-y-5 max-h-[80vh] overflow-y-auto">
            {/* Ad Preview Card Box */}
            <div className="p-3 bg-gray-50 dark:bg-gray-900/60 rounded-2xl border border-gray-200/80 dark:border-gray-800 flex items-center gap-3">
              {ad.image_url ? (
                <img
                  src={getMediaUrl(ad.image_url)}
                  alt={ad.title}
                  className="w-14 h-14 rounded-xl object-cover border border-accent/30 shrink-0"
                />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-accent/10 text-accent flex items-center justify-center shrink-0 font-black text-xs">
                  AD
                </div>
              )}

              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-bold truncate text-gray-900 dark:text-gray-100">
                  {ad.title}
                </h4>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-1 pt-0.5">
                  {ad.description}
                </p>
                <div className="flex items-center gap-2 text-[10px] text-accent font-extrabold pt-1">
                  <span className="flex items-center gap-1">
                    <TrendingUp size={12} />
                    {isRtl ? 'الحالة الحالية:' : 'Current:'} {ad.is_boosted ? (isRtl ? 'مُموَّل مفعل 🚀' : 'Active Boost') : (isRtl ? 'عادي' : 'Standard')}
                  </span>
                </div>
              </div>
            </div>

            {/* Select Boost Duration / Tier */}
            <div className="space-y-2.5">
              <label className="text-xs font-extrabold text-gray-700 dark:text-gray-300 flex items-center justify-between">
                <span>{isRtl ? 'اختر باقة التمويل والتنشيط:' : 'Select Boost Package:'}</span>
                <span className="text-[11px] text-accent font-bold flex items-center gap-1">
                  <Sparkles size={13} />
                  {isRtl ? 'أولوية الظهور بقمة اللوحة' : 'Top Feed Priority'}
                </span>
              </label>

              <div className="grid grid-cols-1 gap-2.5">
                {BOOST_TIERS.map(tier => {
                  const isSelected = selectedDays === tier.days;
                  return (
                    <div
                      key={tier.days}
                      onClick={() => setSelectedDays(tier.days)}
                      className={`relative p-3.5 rounded-2xl border-2 transition-theme cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'border-accent bg-accent/5 dark:bg-accent/10 shadow-md ring-1 ring-accent-500/30'
                          : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1a1a1c] hover:border-accent/40'
                      }`}
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-gray-900 dark:text-gray-100">
                            {isRtl ? tier.titleAr : tier.titleEn}
                          </span>
                          {tier.popular && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[9px] font-extrabold">
                              {isRtl ? tier.badgeAr : tier.badgeEn}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-accent dark:text-accent font-bold flex items-center gap-1">
                          <Zap size={12} />
                          <span>{isRtl ? tier.viewsAr : tier.viewsEn}</span>
                        </p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">
                          {isRtl ? tier.descAr : tier.descEn}
                        </p>
                      </div>

                      <div className="text-end shrink-0">
                        <span className="text-base font-black text-accent">
                          ${tier.price.toFixed(2)}
                        </span>
                        <span className="text-[10px] text-gray-400 block">USD</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Select Payment Method */}
            <div className="space-y-2.5">
              <label className="text-xs font-extrabold text-gray-700 dark:text-gray-300">
                {isRtl ? 'اختر طريقة الدفع:' : 'Select Payment Method:'}
              </label>

              <div className="grid grid-cols-3 gap-2">
                {/* Wallet Method */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('wallet')}
                  className={`p-3 rounded-2xl border-2 flex flex-col items-center justify-center gap-1.5 transition-theme ${
                    paymentMethod === 'wallet'
                      ? 'border-accent bg-accent/10 text-accent font-extrabold shadow-sm'
                      : 'border-gray-200 dark:border-gray-800 text-gray-500 hover:border-gray-300 dark:hover:border-gray-700'
                  }`}
                >
                  <Wallet size={20} />
                  <span className="text-[11px] whitespace-nowrap">{isRtl ? 'رصيد المحفظة' : 'Wallet Balance'}</span>
                </button>

                {/* Stripe Method */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('stripe')}
                  className={`p-3 rounded-2xl border-2 flex flex-col items-center justify-center gap-1.5 transition-theme ${
                    paymentMethod === 'stripe'
                      ? 'border-accent bg-accent/10 text-accent font-extrabold shadow-sm'
                      : 'border-gray-200 dark:border-gray-800 text-gray-500 hover:border-gray-300 dark:hover:border-gray-700'
                  }`}
                >
                  <CreditCard size={20} />
                  <span className="text-[11px] whitespace-nowrap">{isRtl ? 'بطاقة الائتمان' : 'Credit Card'}</span>
                </button>

                {/* X402 Web3 Crypto */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('x402')}
                  className={`p-3 rounded-2xl border-2 flex flex-col items-center justify-center gap-1.5 transition-theme ${
                    paymentMethod === 'x402'
                      ? 'border-accent bg-accent/10 text-accent font-extrabold shadow-sm'
                      : 'border-gray-200 dark:border-gray-800 text-gray-500 hover:border-gray-300 dark:hover:border-gray-700'
                  }`}
                >
                  <Globe size={20} />
                  <span className="text-[11px] whitespace-nowrap">{isRtl ? 'دفع X402 Web3' : 'X402 Crypto'}</span>
                </button>
              </div>

              {/* Wallet Info Box */}
              {paymentMethod === 'wallet' && (
                <div className={`p-3 rounded-2xl border text-xs flex items-center justify-between gap-2 ${
                  hasSufficientBalance
                    ? 'bg-accent/10 border-accent/30 text-accent dark:text-accent'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                }`}>
                  <div className="flex items-center gap-2">
                    {hasSufficientBalance ? (
                      <CheckCircle2 size={16} className="shrink-0" />
                    ) : (
                      <AlertCircle size={16} className="shrink-0" />
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
                      className="px-2.5 py-1 rounded-xl bg-amber-500 text-white font-extrabold text-[10px] hover:bg-amber-600 transition-theme shrink-0"
                    >
                      {isRtl ? 'شحن المحفظة' : 'Top Up'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="p-4 bg-gray-50 dark:bg-gray-900/80 border-t border-gray-200 dark:border-gray-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 transition-theme"
            >
              {isRtl ? 'إلغاء' : 'Cancel'}
            </button>

            <button
              type="button"
              onClick={handleConfirmBoost}
              disabled={loading || (paymentMethod === 'wallet' && !hasSufficientBalance)}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-gray-500/10 to-teal-600 hover:from-gray-500/10 hover:to-teal-700 disabled:opacity-50 text-white font-extrabold text-xs shadow-md shadow-none flex items-center gap-2 transition-theme"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>{isRtl ? 'جاري معالجة التمويل...' : 'Processing Boost...'}</span>
                </>
              ) : (
                <>
                  <Rocket size={16} />
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

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppContext } from '../context/AppContext';
import { 
  ShoppingBag, Download, ExternalLink, Gift, DollarSign, 
  Calendar, CreditCard, ChevronRight, LayoutGrid, Award, ShieldCheck, HeartPulse,
  Eye, Play
} from 'lucide-react';
import { toast } from 'sonner';
import { getMediaUrl } from '../utils/mediaUtils';

interface PurchasedItem {
  purchase_id: number;
  price_paid: string | number;
  license_type: string;
  download_token: string;
  purchased_at: string;
  item_id: number;
  title_en: string;
  title_ar: string;
  description_en: string;
  description_ar: string;
  category_en: string;
  category_ar: string;
  image_url: string;
  download_url: string;
  preview_url: string;
  video_url: string;
  contact_link: string;
  seller_name: string;
  seller_avatar: string;
}

interface AffiliateStat {
  total_earned: string | number;
  total_referral_sales: string | number;
}

interface ReferredSale {
  purchase_id: number;
  price_paid: string | number;
  license_type: string;
  commission_paid: string | number;
  sold_at: string;
  title_en: string;
  title_ar: string;
  category_en: string;
  category_ar: string;
  image_url: string;
}

export const MarketplacePortfolio: React.FC = () => {
  const { language, token, user } = useAppContext();
  const [purchased, setPurchased] = useState<PurchasedItem[]>([]);
  const [affStats, setAffStats] = useState<AffiliateStat>({ total_earned: 0, total_referral_sales: 0 });
  const [referredSales, setReferredSales] = useState<ReferredSale[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'downloads' | 'affiliate'>('downloads');

  const isRtl = language === 'ar';

  useEffect(() => {
    const fetchMarketplaceUserData = async () => {
      if (!token || token === 'null') return;
      setLoading(true);
      try {
        const resPortList = await fetch('/api/marketplace/portfolio', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (resPortList.ok) {
          const portfolioData = await resPortList.json();
          setPurchased(portfolioData);
        }

        const resAffStats = await fetch('/api/marketplace/affiliate/stats', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (resAffStats.ok) {
          const affData = await resAffStats.json();
          setAffStats(affData.summary || { total_earned: 0, total_referral_sales: 0 });
          setReferredSales(affData.sales || []);
        }
      } catch (err) {
        console.error('Failed to load portfolio statistics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMarketplaceUserData();
  }, [token]);

  useEffect(() => {
    const checkStripePaymentAndFulfill = async () => {
      const params = new URLSearchParams(window.location.search);
      const status = params.get('status');
      const sessionId = params.get('session_id');

      if (status === 'stripe_success' && sessionId) {
        const cleanUrl = window.location.pathname + (window.location.hash || '');
        window.history.replaceState({}, document.title, cleanUrl);

        toast.loading(isRtl ? 'جاري التحقق من عملية الدفع وتوثيقها...' : 'Verifying and securing your payment session...', { id: 'stripe-verify' });
        try {
          const res = await fetch(`/api/marketplace/verify-checkout-session?session_id=${sessionId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await res.json();
          if (res.ok && data.success) {
            toast.success(
              isRtl 
                ? 'تهانينا! تم التحقق من نجاح الدفع وتفعيل تنزيلاتك الرقمية.' 
                : 'Congratulations! Your premium asset downloads have been unlocked successfully.',
              { id: 'stripe-verify' }
            );
            const resPortList = await fetch('/api/marketplace/portfolio', {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (resPortList.ok) {
              const portfolioData = await resPortList.json();
              setPurchased(portfolioData);
            }
          } else {
            throw new Error(data.error || 'Verification failed');
          }
        } catch (err: any) {
          toast.error(
            err.message || (isRtl ? 'فشل إثبات الدفع. يرجى مراجعة الدعم الفني.' : 'Payment proof failed. Please contact technical services.'),
            { id: 'stripe-verify' }
          );
        }
      }
    };

    if (token && token !== 'null') {
      checkStripePaymentAndFulfill();
    }
  }, [token]);

  const handleCopyGlobalRefLink = () => {
    if (!user) return;
    const refLink = `${window.location.origin}/marketplace?ref=${user.referral_code}`;
    navigator.clipboard.writeText(refLink);
    toast.success(
      isRtl
        ? 'تم نسخ رابط التسويق العالمي للمتجر بنجاح! احصل على عمولة 20٪ فوراً.'
        : 'Storewide master referral link copied! Earn 20% instant commission on referred purchases.'
    );
  };

  const formatCurrency = (val: string | number) => {
    const num = parseFloat(typeof val === 'number' ? val.toString() : val);
    return isNaN(num) ? '$0.00' : `$${num.toFixed(2)}`;
  };

  const getLicenseColor = (lic: string) => {
    switch (lic.toLowerCase()) {
      case 'extended': return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
      case 'gpl': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'plr': return 'text-sky-400 bg-sky-500/10 border-sky-500/20';
      default: return 'text-accent bg-accent/10 border-accent/20';
    }
  };

  if (loading) {
    return (
      <div className="h-64 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 rounded-full border-t-2 border-accent animate-spin" />
        <span className="text-xs text-[var(--text-muted)]">
          {isRtl ? 'جاري تحميل المعاملات والمنتجات...' : 'Loading portfolio and affiliate assets...'}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-8 font-sans pb-12">
      {/* Sub Tabs Selection */}
      <div className="flex border-b border-[var(--border)]/40 gap-2">
        <button
          onClick={() => setActiveSubTab('downloads')}
          className={`px-6 py-3 text-xs font-black tracking-wider uppercase transition-theme border-b-2 cursor-pointer ${
            activeSubTab === 'downloads'
              ? 'border-accent text-accent'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          {isRtl ? 'منتجاتي وتنزيلاتي' : 'My Purchases & Licenses'}
        </button>
        <button
          onClick={() => setActiveSubTab('affiliate')}
          className={`px-6 py-3 text-xs font-black tracking-wider uppercase transition-theme border-b-2 cursor-pointer ${
            activeSubTab === 'affiliate'
              ? 'border-accent text-accent'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          {isRtl ? 'الأرباح والإحالات' : 'Affiliate Earnings & Referrals'}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeSubTab === 'downloads' ? (
          <motion.div
            key="downloads-panel"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="space-y-6"
          >
            {purchased.length === 0 ? (
              <div className="border border-[var(--border)]/60 bg-[var(--bg-secondary)]/30 rounded-lg p-12 text-center space-y-4">
                <ShoppingBag className="w-12 h-12 text-[var(--text-muted)] mx-auto opacity-40 animate-pulse" />
                <h3 className="font-bold text-lg">{isRtl ? 'لا توجد مشتريات حتى الآن' : 'No Purchased Items'}</h3>
                <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto leading-relaxed">
                  {isRtl 
                    ? 'اكتشف السوق الحصري لمنصة بيربليكستا واحصل على قوالب ومكونات برمجية خارقة لتسريع أعمالك.' 
                    : 'Browse through our elite digital templates and items in the marketplace to expand your technological production.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {purchased.map((item) => (
                  <div 
                    key={item.purchase_id} 
                    className="flex flex-col border border-[var(--border)]/50 bg-[var(--bg-secondary)]/40 rounded-xl overflow-hidden shadow-xl hover:border-accent/20 transition-theme group"
                  >
                    {/* Media Block */}
                    <div className="relative h-40 bg-[#0c0c0e] flex items-center justify-center overflow-hidden">
                      <img 
                        src={getMediaUrl(item.image_url) || 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&fit=crop'} 
                        alt={item.title_en}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80"
                      />
                      <div className="absolute top-3 left-3 flex gap-2">
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded border ${getLicenseColor(item.license_type)} uppercase`}>
                          {item.license_type}
                        </span>
                      </div>
                      <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-md text-[10px] text-accent font-bold px-2 py-1 rounded">
                        {isRtl ? 'التنزيل متاح دائمًا' : 'Lifetime Download'}
                      </div>
                    </div>

                    {/* Meta Fields */}
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4 bg-black/10">
                      <div>
                        <h4 className="font-bold text-lg group-hover:text-accent transition-colors leading-snug">
                          {isRtl ? item.title_ar : item.title_en}
                        </h4>
                        <p className="text-[11px] text-[var(--text-muted)] mt-1 line-clamp-2 leading-relaxed">
                          {isRtl ? item.description_ar : item.description_en}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-[var(--border)]/30 flex flex-col gap-2.5">
                        <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                          <span className="flex items-center gap-1.5 font-bold">
                            <Calendar size={13} />
                            {new Date(item.purchased_at).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')}
                          </span>
                          <span className="font-bold text-accent">
                            {formatCurrency(item.price_paid)}
                          </span>
                        </div>

                        {/* Actions Row */}
                        <div className="flex gap-2 pt-2">
                          {item.download_url ? (
                            <a
                              href={item.download_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 h-9 rounded-lg bg-accent text-black hover:bg-accent transition-theme font-black text-[10px] flex items-center justify-center gap-1 cursor-pointer active:scale-95 shadow-sm"
                            >
                              <Download size={13} />
                              <span>{isRtl ? 'تحميل الملف' : 'Download Package'}</span>
                            </a>
                          ) : (
                            <button
                              disabled
                              className="flex-1 h-9 rounded-lg bg-[#222] text-[#555] cursor-not-allowed font-black text-[10px] flex items-center justify-center gap-1"
                            >
                              <Download size={13} />
                              <span>{isRtl ? 'الرابط غير مدرج حالياً' : 'Link Unavailable'}</span>
                            </button>
                          )}

                          {item.preview_url && (
                            <a
                              href={item.preview_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-10 h-9 rounded-lg border border-accent/20 bg-accent/5 hover:bg-accent/15 text-accent flex items-center justify-center transition-theme cursor-pointer active:scale-95"
                              title={isRtl ? 'المعاينة المباشرة' : 'Live Preview'}
                            >
                              <Eye size={13} />
                            </a>
                          )}

                          {item.video_url && (
                            <a
                              href={item.video_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-10 h-9 rounded-lg border border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/15 text-blue-400 flex items-center justify-center transition-theme cursor-pointer active:scale-95"
                              title={isRtl ? 'الفيديو التوضيحي' : 'Video Explanation'}
                            >
                              <Play size={13} className="fill-current text-blue-400" />
                            </a>
                          )}


                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="affiliate-panel"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="space-y-6"
          >
            {/* Share Global Code Header */}
            <div className="border border-accent/20 bg-accent/5 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Gift className="w-5 h-5 text-accent animate-bounce" />
                  <h4 className="font-black text-base">{isRtl ? 'برنامج الإحالات الفرعي للمنتجات' : 'Product Affiliate Hub'}</h4>
                </div>
                <p className="text-xs text-[var(--text-muted)] max-w-xl leading-relaxed">
                  {isRtl 
                    ? 'شارك أي منتج في السوق عبر نسخ الرابط الخاص به، بوجود رمز الإحالة الخاص بك ستحصل على عمولة 20٪ تودع تلقائياً في محفظتك فوراً عند عملية شراء مكتملة!'
                    : 'Copy affiliate links of products to share online. If any user buys are routed through your address, 20% commission goes into your wallet balance instantly.'}
                </p>
              </div>

              <button
                onClick={handleCopyGlobalRefLink}
                className="h-10 px-6 rounded-lg bg-accent text-black hover:bg-accent transition-theme font-black text-[11px] flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shadow-md shadow-none hover:scale-102"
              >
                <Award size={14} />
                <span>{isRtl ? 'نسخ رابط المتجر العام' : 'Copy General Store Link'}</span>
              </button>
            </div>

            {/* Stat Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="border border-[var(--border)]/50 bg-[var(--bg-secondary)]/35 rounded-xl p-6 flex items-center justify-between shadow-lg">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">
                    {isRtl ? 'إجمالي الأرباح المكتسبة' : 'Total Revenue Earned'}
                  </span>
                  <p className="text-3xl font-black text-accent">
                    {formatCurrency(affStats.total_earned)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center text-accent shadow-md">
                  <DollarSign size={22} />
                </div>
              </div>

              <div className="border border-[var(--border)]/50 bg-[var(--bg-secondary)]/35 rounded-xl p-6 flex items-center justify-between shadow-lg">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">
                    {isRtl ? 'المبيعات المحالة المكتملة' : 'Referred Sales Succeeded'}
                  </span>
                  <p className="text-3xl font-black text-amber-500">
                    {affStats.total_referral_sales || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center text-amber-400 shadow-md">
                  <ShoppingBag size={22} />
                </div>
              </div>
            </div>

            {/* Referred List Details */}
            <div className="space-y-4">
              <h4 className="font-black text-[13px] uppercase tracking-wider text-[var(--text-muted)]">
                {isRtl ? 'سجل المبيعات المحالة' : 'Affiliate Referral Orders History'}
              </h4>

              {referredSales.length === 0 ? (
                <div className="border border-[var(--border)]/40 bg-[var(--bg-secondary)]/10 rounded-lg p-10 text-center text-xs text-[var(--text-muted)] leading-relaxed">
                  {isRtl 
                    ? 'لم تسجل أي مبيعات إحالة باسمك بعد. ابدأ بنشر روابط المنتجات عبر مجتمعات المطورين والتقنيين!' 
                    : 'No referral commissions tracked yet. Post outstanding marketplace listings through tech fields to yield revenues.'}
                </div>
              ) : (
                <div className="border border-[var(--border)]/50 rounded-xl overflow-hidden shadow-lg bg-[var(--bg-secondary)]/20 divide-y divide-[var(--border)]/35">
                  {referredSales.map((sale) => (
                    <div 
                      key={sale.purchase_id} 
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <img 
                          src={getMediaUrl(sale.image_url) || 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=200&fit=crop'} 
                          alt={sale.title_en}
                          className="w-10 h-10 object-cover rounded border border-[var(--border)]/60"
                        />
                        <div>
                          <h5 className="font-bold text-sm">
                            {isRtl ? sale.title_ar : sale.title_en}
                          </h5>
                          <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)] mt-0.5">
                            <span className="font-medium bg-[var(--bg-secondary)] px-1.5 py-0.5 rounded border border-[var(--border)]/40 text-[9px] uppercase">
                              {sale.license_type}
                            </span>
                            <span>•</span>
                            <span>{new Date(sale.sold_at).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-end justify-between sm:justify-center text-right">
                        <span className="text-[10.5px] text-[var(--text-muted)]">
                          {isRtl ? 'العمولة المكتسبة:' : 'Commission Earned:'}
                        </span>
                        <span className="font-black text-accent text-base">
                          +{formatCurrency(sale.commission_paid)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

import { safeStorageGet, safeStorageSet, safeStorageRemove } from "@/utils/safeStorage";
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { CheckCircle2, MessageSquare, LayoutGrid, ChevronRight, ChevronLeft, ChevronDown, Wallet, AlertCircle, X, Loader2, Copy, Share2, Search, Sparkles, Code2, Cloud, Cpu, Scale, FileText, Tv, Mic, Volume2, GraduationCap, Server, Key, Music } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { perplextaPageTransition } from '../constants/motions';
import { ContentContainer } from '../components/ContentContainer';
import { ALL_TOOLS } from '../constants';
import { toast } from '../context/NotificationContext';
import { trackPremiumSubscriptionEvent } from '../utils/analytics';

const ModalPortal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? createPortal(children, document.body) : null;
};

export const SubscriptionPage: React.FC = () => {
  const { t, dir, plans, plansLoaded, payWithBalance, stripeCheckout, user, balance, balanceUSD, refreshUser, setIsAuthModalOpen, isMobile, token } = useAppContext();
  const navigate = useNavigate();

  const [isVerifying, setIsVerifying] = React.useState(false);
  const [expandedPlans, setExpandedPlans] = React.useState<Record<string, boolean>>({});

  const togglePlanExpand = (id: string) => {
    setExpandedPlans(prev => ({ ...prev, [id]: !prev[id] }));
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');

    if (params.get('success') === 'true') {
      const verifyAndRefresh = async () => {
        setIsVerifying(true);
        const authToken = safeStorageGet('app_token') || token;
        if (sessionId && authToken) {
          try {
            await fetch(`/api/payments/verify-subscription-session?session_id=${sessionId}`, {
              headers: { 'Authorization': `Bearer ${authToken}` }
            });
          } catch (e) {
            console.error('Failed to verify session synchronously:', e);
          }
        }
        const updatedUser = (await refreshUser()) as any;
        const activePlanId = updatedUser?.subscription?.plan_id || (user as any)?.subscription?.plan_id;
        if (activePlanId) {
          const matchingPlan = plans.find(p => p.id.toString() === activePlanId.toString());
          if (matchingPlan) {
            setSelectedPlanForModal(matchingPlan);
            try {
              const price = billingCycle === 'annual' 
                ? (matchingPlan.annualPrice || matchingPlan.monthlyPrice * 12) 
                : (matchingPlan.monthlyPrice || 0);
              trackPremiumSubscriptionEvent(
                updatedUser?.id?.toString() || user?.id?.toString() || 'unknown',
                matchingPlan.id.toString(),
                matchingPlan.nameEn || matchingPlan.name || 'Premium Plan',
                Number(price),
                'USD',
                billingCycle
              );
            } catch (e) {
              console.error('[Analytics Error]:', e);
            }
          }
        }
        setResultModal('success');
        setIsVerifying(false);
        navigate('/subscription', { replace: true });
      };

      verifyAndRefresh();
    } else if (params.get('canceled') === 'true') {
      toast.info(dir === 'rtl' ? 'تم إلغاء عملية الدفع.' : 'Payment was canceled.');
      navigate('/subscription', { replace: true });
    }
  }, [refreshUser, navigate, dir, token, plans, user]);

  const [billingCycle, setBillingCycle] = React.useState<'monthly' | 'annual'>('monthly');
  const [loading, setLoading] = React.useState<string | null>(null);
  const [confirmingPlan, setConfirmingPlan] = React.useState<any>(null);
  const [selectedPlanForModal, setSelectedPlanForModal] = React.useState<any>(null);
  const [resultModal, setResultModal] = React.useState<'success' | 'insufficient' | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [redirectCountdown, setRedirectCountdown] = React.useState<number | null>(null);

  useEffect(() => {
    let timer: any;
    if (resultModal === 'success') {
      setRedirectCountdown(5);
      timer = setInterval(() => {
        setRedirectCountdown((prev) => {
          if (prev === null || prev <= 0) return 0;
          return prev - 1;
        });
      }, 1000);
    } else {
      setRedirectCountdown(null);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [resultModal]);

  useEffect(() => {
    if (redirectCountdown === 0) {
      setResultModal(null);
      navigate('/');
    }
  }, [redirectCountdown, navigate]);

  const [activeTab, setActiveTab] = React.useState<'user' | 'developer'>('user');

  const visiblePlans = plans.filter(plan => plan.isVisible);
  const displayedPlans = visiblePlans.filter(plan => {
    if (activeTab === 'developer') return plan.planType === 'developer';
    return !plan.planType || plan.planType === 'user';
  });

  if (!plansLoaded) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="w-10 h-10 border-2 border-accent/30 border-t-accent-500 rounded-[4px] animate-spin" />
      <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">{dir === 'rtl' ? 'جاري تحميل الخطط...' : 'Loading plans...'}</p>
    </div>
  );

  const getDisplayPrice = (plan: any, cycle: 'monthly' | 'annual') => {
    const m = Number(plan.monthlyPrice || 0);
    const a = Number(plan.annualPrice || 0);
    const d = Number(plan.discount || 0);
    if (cycle === 'monthly') return m;
    if (a > 0) return a;
    return m * 12 * (1 - d / 100);
  };

  const getSavingPercentage = (plan: any) => {
    const m = Number(plan.monthlyPrice || 0);
    const a = Number(plan.annualPrice || 0);
    const d = Number(plan.discount || 0);
    if (a > 0 && m > 0) {
      const fullPrice = m * 12;
      const saving = Math.round((1 - a / fullPrice) * 100);
      return saving > 0 ? saving : 0;
    }
    if (d > 0) return d;
    return 0;
  };

  const referralLink = `${window.location.origin}/?ref=${user?.referral_code || user?.id || 'guest'}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success(
      dir === 'rtl' 
        ? 'تم نسخ رابط الإحالة الخاص بك بنجاح!' 
        : 'Referral link copied to clipboard successfully!'
    );
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: t('appName'), text: t('subscriptionSuccessDesc'), url: referralLink });
      } catch (err) {
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  const isActivePlan = (planId: string) => {
    return user?.subscription?.plan_id?.toString() === planId.toString() && user?.subscription?.status === 'active';
  };

  const handleUpgrade = async (planId: string) => {
    if (!user) { setIsAuthModalOpen(true); return; }
    const plan = plans.find(p => p.id === planId);
    if (!plan) return;
    if (isActivePlan(planId)) return;
    
    const price = getDisplayPrice(plan, billingCycle);
    if (price === 0) {
      setLoading(`${planId}-stripe`);
      const res = await payWithBalance(planId, billingCycle);
      if (res.success) {
        await refreshUser();
        setResultModal('success');
      } else {
        toast.error(res.error || 'Activation failed');
      }
      setLoading(null);
      return;
    }

    setSelectedPlanForModal(plan);
    setLoading(`${planId}-stripe`);
    const res = await stripeCheckout(planId, billingCycle);
    if (res.error) toast.error(res.error);
    setLoading(null);
  };

  const handlePayWithBalance = async (planId: string) => {
    if (!user) { setIsAuthModalOpen(true); return; }
    const plan = plans.find(p => p.id === planId);
    if (!plan) return;
    setSelectedPlanForModal(plan);
    const price = getDisplayPrice(plan, billingCycle);
    if (balanceUSD < price) { setResultModal('insufficient'); return; }
    setConfirmingPlan(plan);
  };

  const executePayment = async () => {
    if (!confirmingPlan) return;
    setLoading(`${confirmingPlan.id}-balance`);
    const res = await payWithBalance(confirmingPlan.id, billingCycle);
    if (res.success) {
      setConfirmingPlan(null);
      await refreshUser();
      setResultModal('success');
      try {
        const price = billingCycle === 'annual' 
          ? (confirmingPlan.annualPrice || confirmingPlan.monthlyPrice * 12) 
          : (confirmingPlan.monthlyPrice || 0);
        trackPremiumSubscriptionEvent(
          user?.id?.toString() || 'unknown',
          confirmingPlan.id.toString(),
          confirmingPlan.nameEn || confirmingPlan.name || 'Premium Plan',
          Number(price),
          'USD',
          billingCycle
        );
      } catch (e) {
        console.error('[Analytics Error]:', e);
      }
    } else {
      toast.error(res.error || 'Error');
    }
    setLoading(null);
  };

  const LimitItem = ({ icon, label, value, color }: { icon: React.ReactNode, label: string, value: any, color: string }) => {
    let daily = null;
    if (typeof value === 'object' && value !== null) {
      daily = value.daily;
    } else {
      daily = value;
    }
    const formatLimit = (v: any) => v === 'unlimited' ? '∞' : (v || 0);
    return (
      <div title={label} className="flex flex-col items-center justify-center p-1.5 md:p-2 rounded-[var(--radius)] border bg-[var(--bg-primary)] border-[var(--border-main)] transition-theme hover:border-accent/30 hover:bg-[var(--surface-subtle)] group">
        <div className="transition-transform group-hover:scale-110 mb-1" style={{ color: color }}>{icon}</div>
        <span className="text-[10px] md:text-[11px] font-black text-[var(--text-primary)] leading-none">{formatLimit(daily)}</span>
      </div>
    );
  };

  return (
    <ContentContainer 
      initial="initial"
      animate="animate"
      exit="exit"
      variants={perplextaPageTransition}
      className=""
    >
      {isVerifying && (
        <div className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-black/85 backdrop-blur-md">
          <Loader2 className="animate-spin text-accent mb-4" size={50} />
          <h2 className="text-xl font-black text-white uppercase tracking-wider mb-2">
            {dir === 'rtl' ? 'جاري تفعيل الاشتراك...' : 'Activating Subscription...'}
          </h2>
          <p className="text-sm text-gray-400">
            {dir === 'rtl' ? 'يرجى الانتظار بينما نقوم بتأكيد الدفع الخاص بك وتنشيط الخطة' : 'Please wait while we confirm your payment and activate your plan'}
          </p>
        </div>
      )}

      <div className="sticky -top-0.5 z-20 -mx-4 md:-mx-8 px-4 md:px-8 py-3 mb-6 transition-theme bg-[var(--bg-primary)]/95 backdrop-blur-md border-b border-[var(--border-main)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 md:gap-4">
            <button 
              onClick={() => navigate(-1)}
              className="w-8 h-8 rounded-[8px] flex items-center justify-center transition-theme bg-[var(--bg-secondary)] border border-[var(--border-main)] text-[var(--text-secondary)] hover:text-accent hover:border-accent/40 active:scale-95 cursor-pointer"
              title={dir === 'rtl' ? 'رجوع' : 'Back'}
            >
              {dir === 'rtl' ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
            <div>
              <h1 className="text-xl md:text-2xl font-black tracking-tight text-[var(--text-primary)] uppercase">{t('subscription')}</h1>
              <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">
                {dir === 'rtl' ? 'اختر الخطة المثالية لاحتياجاتك' : 'CHOOSE YOUR PERFORMANCE TIER'}
              </p>
            </div>
          </div>
          <div className="p-1.5 rounded-[var(--radius)] flex items-center shadow-lg bg-[var(--bg-secondary)] border border-[var(--border-main)]">
            <button 
              onClick={() => setBillingCycle('monthly')}
              className={`px-5 md:px-7 py-2 rounded-[var(--radius)] text-xs font-black uppercase tracking-widest transition-theme ${
                billingCycle === 'monthly' 
                  ? 'bg-accent text-white shadow-[0_0_15px_rgba(156,163,175,0.4)]' 
                  : 'text-[var(--text-secondary)] hover:text-accent'
              }`}
            >
              {t('monthly')}
            </button>
            <button 
              onClick={() => setBillingCycle('annual')}
              className={`px-5 md:px-7 py-2 rounded-[var(--radius)] text-xs font-black uppercase tracking-widest transition-theme ${
                billingCycle === 'annual' 
                  ? 'bg-accent text-white shadow-[0_0_15px_rgba(156,163,175,0.4)]' 
                  : 'text-[var(--text-secondary)] hover:text-accent'
              }`}
            >
              {t('annual')}
              {Math.max(...plans.map(p => getSavingPercentage(p)), 0) > 0 && (
                <span className="ml-1.5 text-[9px] opacity-70">(-{Math.max(...plans.map(p => getSavingPercentage(p)), 0)}%)</span>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="flex justify-center mb-10">
        <div className="p-1 rounded-[var(--radius)] flex items-center bg-[var(--bg-secondary)] border border-[var(--border-main)]/60 max-w-lg w-full">
          <button
            onClick={() => setActiveTab('user')}
            className={`flex-1 px-5 py-2.5 rounded-[var(--radius)] text-xs font-black uppercase tracking-wider transition-theme flex items-center justify-center gap-2 ${
              activeTab === 'user'
                ? 'bg-accent/15 border border-accent/20 text-accent shadow-[0_0_15px_rgba(156,163,175,0.1)]'
                : 'text-[var(--text-secondary)] hover:text-accent'
            }`}
          >
            <Sparkles size={14} className={activeTab === 'user' ? 'text-accent ' : ''} />
            <span className={activeTab === 'user' ? 'text-accent ' : ''}>
              {dir === 'rtl' ? 'خطط الاستخدام العام' : 'Performance Plans'}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('developer')}
            className={`flex-1 px-5 py-2.5 rounded-[var(--radius)] text-xs font-black uppercase tracking-wider transition-theme flex items-center justify-center gap-2 ${
              activeTab === 'developer'
                ? 'bg-accent/15 border border-accent/20 text-accent shadow-[0_0_15px_rgba(156,163,175,0.1)]'
                : 'text-[var(--text-secondary)] hover:text-accent'
            }`}
          >
            <Code2 size={14} className={activeTab === 'developer' ? 'text-accent ' : ''} />
            <span className={activeTab === 'developer' ? 'text-accent ' : ''}>
              {dir === 'rtl' ? 'خطط المطورين والوكلاء' : 'Developer & Agent Plans'}
            </span>
          </button>
        </div>
      </div>

      {displayedPlans.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="w-full max-w-3xl mx-auto rounded-[var(--radius)] border border-[var(--border-main)] bg-[var(--bg-secondary)] p-8 md:p-12 text-center relative overflow-hidden flex flex-col items-center justify-center min-h-[350px]"
        >
          {/* Subtle glowing element background */}
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-gray-500/10 via-gray-500/10 to-gray-500/5" />
          
          <div className="w-16 h-16 rounded-[4px] bg-accent/10 flex items-center justify-center mb-6 border border-accent/20 text-accent hover:scale-105 transition-theme">
            <Code2 size={28} className="text-accent  animate-pulse" />
          </div>

          <h2 className="text-xl md:text-2xl font-black text-[var(--text-primary)] mb-3 tracking-wide">
            {dir === 'rtl' ? 'بوابة المطورين والوكلاء (قيد الإنشاء والتطوير)' : 'Developer & Agent Portal (Under Construction)'}
          </h2>

          <p className="text-xs md:text-sm text-[var(--text-secondary)] leading-relaxed max-w-2xl mb-8">
            {dir === 'rtl' ? (
              'نحن نعمل بجِد على بناء وبناء أدوات وحلول متكاملة مخصصة للمطورين والوكلاء لتمكين التوزيع البرمجي المباشر والمزامنة العبقرية لخدمات PERPLEXTA. ترقبوا إطلاق واجهات برمجة تطبيقات مخصصة، إمكانيات استخدام وكلاء مستقلين (Autonomous Bots)، وموارد سيادية هائلة تمكّنكم من دمج الذكاء الاصطناعي الفائق في تطبيقاتكم وبنيتكم التحتية بكفاءة متناهية.'
            ) : (
              'We are working diligently on building comprehensive tools and solutions tailored for developers and partners to enable direct programmatic distribution and deep integration with PERPLEXTA services. Stay tuned for custom API key provisioning, autonomous agent hosting, and enterprise-grade sovereign compute resources designed to integrate next-generation AI into your infrastructure.'
            )}
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 rounded-[var(--radius)] bg-[var(--bg-primary)] border border-[var(--border-main)] text-xs text-[var(--text-muted)] font-bold">
              <span className="w-2 h-2 rounded-[4px] bg-accent animate-ping" />
              <span>{dir === 'rtl' ? 'المرحلة: التأسيس المعماري والنمذجة' : 'Phase: Architectural Ingestion & Setup'}</span>
            </div>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-2 rounded-[var(--radius)] bg-accent/10 border border-accent/20 text-accent font-bold text-xs hover:bg-accent/20 hover:scale-105 transition-theme shadow-[0_0_15px_rgba(156,163,175,0.1)] active:scale-95"
            >
              {dir === 'rtl' ? 'العودة لمساحة العمل' : 'Return to Workspace'}
            </button>
          </div>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8 items-start">
          {displayedPlans.map((plan, planIdx) => (
            <div 
              key={`sub-plan-${plan.id || planIdx}-${planIdx}`} 
              className={`relative rounded-[var(--radius)] border p-5 md:p-8 flex flex-col transition-theme bg-[var(--bg-secondary)] border-[var(--border-main)] group ${
                isActivePlan(plan.id) 
                  ? 'ring-2 ring-accent-500/50 shadow-[0_0_30px_rgba(156,163,175,0.15)]' 
                  : 'hover:border-accent/30'
              }`}
            >
              <div className="absolute inset-0 rounded-[var(--radius)] bg-accent/0 group-hover:bg-accent/[0.02] transition-colors duration-300 pointer-events-none" />
              <div className="absolute top-0 left-0 right-0 h-1 md:h-1.5 rounded-t-sm transition-theme group-hover:h-2" style={{ backgroundColor: plan.color || '#334155' }}></div>
              {plan.badge !== 'none' && (
                <div className="absolute top-0 right-6 md:right-8 -translate-y-1/2">
                  <span className="px-2 md:px-3 py-1 text-[10px] md:text-xs font-bold uppercase tracking-wider text-white rounded-[4px] shadow-lg" style={{ backgroundColor: plan.color || '#334155' }}>
                    {t(plan.badge)}
                  </span>
                </div>
              )}
              <div className="mb-3 md:mb-4">
                <h3 className="text-xl md:text-2xl font-bold mb-0.5 md:mb-1 flex items-center gap-2 text-[var(--text-primary)]">
                  <span className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-[4px] shadow-sm" style={{ backgroundColor: plan.color || '#334155' }}></span>
                  {dir === 'rtl' ? plan.nameAr : plan.nameEn}
                </h3>
                <p className="text-[11px] md:text-sm text-[var(--text-secondary)] leading-tight">{dir === 'rtl' ? plan.descAr : plan.descEn}</p>
              </div>
              <div className="mb-4 md:mb-6 text-[var(--text-primary)]">
                <div className="flex items-baseline gap-1.5 md:gap-2">
                  <span className="text-3xl md:text-4xl font-bold text-[var(--text-primary)]">${getDisplayPrice(plan, billingCycle).toFixed(2)}</span>
                  <span className="text-xs text-[var(--text-muted)]">/ {billingCycle === 'annual' ? t('annual') : t('monthly')}</span>
                </div>
                {billingCycle === 'monthly' && getSavingPercentage(plan) > 0 ? (
                  <div className="mt-1 text-[10px] md:text-xs font-medium" style={{ color: plan.color || '#334155' }}>
                    {dir === 'rtl' ? `وفر ${getSavingPercentage(plan)}% مع الدفع السنوي` : `Save ${getSavingPercentage(plan)}% with annual billing`}
                  </div>
                ) : (
                  <div className="mt-1 text-[10px] md:text-xs font-medium text-transparent select-none">Spacer</div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 md:gap-3 mb-6 md:mb-8 relative z-10">
                <button 
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={loading !== null || isActivePlan(plan.id)}
                  className={`py-2 md:py-3 rounded-[var(--radius)] text-white font-bold text-xs md:text-sm transition-theme shadow-lg flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] ${loading === `${plan.id}-stripe` ? 'animate-pulse' : ''}`}
                  style={{ 
                    backgroundColor: plan.color || '#334155', 
                    boxShadow: isActivePlan(plan.id) ? `0 0 20px ${plan.color}30` : `0 4px 14px 0 ${plan.color}40`,
                    opacity: isActivePlan(plan.id) ? 0.9 : 1
                  }}
                >
                  {isActivePlan(plan.id) ? (
                    <div className="flex items-center gap-1.5"><CheckCircle2 size={16} />{dir === 'rtl' ? 'نشط' : 'Active'}</div>
                  ) : (loading === `${plan.id}-stripe` ? '...' : (dir === 'rtl' ? 'اشتراك' : 'Subscribe'))}
                </button>
                <button 
                  onClick={() => handlePayWithBalance(plan.id)}
                  disabled={loading !== null || isActivePlan(plan.id)}
                  className={`py-2 md:py-3 rounded-[var(--radius)] font-bold text-xs md:text-sm transition-theme border bg-transparent hover:bg-accent/5 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] ${loading === `${plan.id}-balance` ? 'animate-pulse' : ''}`}
                  style={{ borderColor: plan.color || '#334155', color: plan.color || '#334155', opacity: isActivePlan(plan.id) ? 0.8 : 1 }}
                >
                  {isActivePlan(plan.id) ? (dir === 'rtl' ? 'نشط' : 'Active') : (loading === `${plan.id}-balance` ? '...' : t('payWithBalance'))}
                </button>
              </div>
              <div className="flex-1 space-y-2 md:space-y-3 mb-6 md:mb-8">
                <p className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2 md:mb-3">
                  {dir === 'rtl' ? 'الميزات' : 'Features'}
                </p>
                {plan.features.map((feature: any, idx: number) => (
                  <div key={`feat-${plan.id}-${idx}`} className="flex items-start gap-2.5 md:gap-3">
                    <CheckCircle2 size={14} className="shrink-0 mt-0.5 md:w-4 md:h-4" style={{ color: plan.color || '#334155' }} />
                    <span className="text-xs md:text-sm text-[var(--text-secondary)] leading-tight">
                      {dir === 'rtl' ? feature.textAr : feature.textEn}
                    </span>
                  </div>
                ))}
              </div>
              {!plan.hideTools && (
                <div className="mt-auto pt-4 md:pt-6 border-t border-[var(--border-main)] dark:border-[var(--border-main)]">
                  <div className="flex justify-between items-center px-1 mb-3">
                    <p className="text-[10px] md:text-[11px] font-black uppercase tracking-wider text-[var(--text-muted)] m-0">
                      {dir === 'rtl' ? 'الأدوات' : 'Tools'}
                    </p>
                    <button 
                      onClick={() => togglePlanExpand(plan.id.toString())}
                      className="text-[10px] md:text-[11px] font-bold flex items-center gap-1 transition-opacity hover:opacity-80"
                      style={{ color: plan.color || 'var(--color-accent)' }}
                    >
                      {expandedPlans[plan.id.toString()] ? (dir === 'rtl' ? 'إخفاء' : 'Hide') : (dir === 'rtl' ? 'تفاصيل' : 'Details')}
                      <ChevronDown size={12} className={`transition-transform ${expandedPlans[plan.id.toString()] ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                  
                  <AnimatePresence>
                    {expandedPlans[plan.id.toString()] && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="max-h-[220px] overflow-y-auto pr-1 custom-scrollbar pb-1 pt-1">
                          <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5 md:gap-2">
                            {(() => {
                              const toolIcons: Record<string, React.ReactNode> = {
                                chat: <MessageSquare size={12} className="md:w-3.5 md:h-3.5" />,
                                chat_fast: <MessageSquare size={12} className="md:w-3.5 md:h-3.5" />,
                                chat_pro: <Sparkles size={12} className="md:w-3.5 md:h-3.5" />,
                                chat_reasoning: <Cpu size={12} className="md:w-3.5 md:h-3.5" />,
                                perplexta_analysis: <Search size={12} className="md:w-3.5 md:h-3.5" />,
                                legal_analysis: <Scale size={12} className="md:w-3.5 md:h-3.5" />,
                                notebook: <FileText size={12} className="md:w-3.5 md:h-3.5" />,
                                image: <Sparkles size={12} className="md:w-3.5 md:h-3.5" />,
                                video: <Tv size={12} className="md:w-3.5 md:h-3.5" />,
                                stt: <Mic size={12} className="md:w-3.5 md:h-3.5" />,
                                tts: <Volume2 size={12} className="md:w-3.5 md:h-3.5" />,
                                learning: <GraduationCap size={12} className="md:w-3.5 md:h-3.5" />,
                                code: <Code2 size={12} className="md:w-3.5 md:h-3.5" />,
                                canvas: <LayoutGrid size={12} className="md:w-3.5 md:h-3.5" />,
                                perplexta_music: <Music size={12} className="md:w-3.5 md:h-3.5" />,
                                sovereign_memory: <Server size={12} className="md:w-3.5 md:h-3.5" />,
                                sovereign_search: <Search size={12} className="md:w-3.5 md:h-3.5" />,
                                x402_api: <Key size={12} className="md:w-3.5 md:h-3.5" />,
                                storage_mb: <Cloud size={12} className="md:w-3.5 md:h-3.5" />,
                              };
                              return ALL_TOOLS.map((toolId) => {
                                const limitVal = (plan.limits && plan.limits[toolId] !== undefined)
                                  ? plan.limits[toolId]
                                  : { daily: 0, monthly: 0 };
                                
                                if (limitVal?.isHidden) return null;

                                const label = t(toolId) || toolId;
                                const icon = toolIcons[toolId] || <CheckCircle2 size={12} className="md:w-3.5 md:h-3.5" />;
                                return (
                                  <LimitItem
                                    key={`sub-tool-${plan.id}-${toolId}`}
                                    icon={icon}
                                    label={label}
                                    value={limitVal}
                                    color={plan.color || '#334155'}
                                  />
                                );
                              });
                            })()}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <ModalPortal>
        <AnimatePresence>
          {confirmingPlan && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => !loading && setConfirmingPlan(null)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-md rounded-[var(--radius)] shadow-2xl overflow-hidden border bg-[var(--bg-secondary)] border-[var(--border-main)]"
              >
                <div className="p-6 border-b border-[var(--border-main)] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-[var(--radius)] bg-accent/10 text-accent"><Wallet size={20} /></div>
                    <h3 className="text-lg font-bold">{t('confirmSubscription')}</h3>
                  </div>
                  <button onClick={() => setConfirmingPlan(null)} disabled={loading !== null} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                    <X size={20} />
                  </button>
                </div>
                <div className="p-6 space-y-6">
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                    {t('confirmSubscriptionDesc').replace('{plan}', dir === 'rtl' ? confirmingPlan.nameAr : confirmingPlan.nameEn)}
                  </p>
                  <div className="p-4 rounded-[var(--radius)] space-y-3 bg-[var(--bg-primary)]">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-[var(--text-muted)]">{t('currentBalance')}</span>
                      <span className="font-bold text-[var(--text-primary)]">${Number(balanceUSD || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-[var(--text-muted)]">{t('planPrice')}</span>
                      <span className="font-bold text-accent">-${getDisplayPrice(confirmingPlan, billingCycle).toFixed(2)}</span>
                    </div>
                    <div className="pt-3 border-t border-[var(--border-main)] flex justify-between items-center text-sm">
                      <span className="font-medium text-[var(--text-primary)]">{t('remainingBalance')}</span>
                      <span className={`font-bold ${balanceUSD - getDisplayPrice(confirmingPlan, billingCycle) < 0 ? 'text-red-500' : 'text-[var(--text-primary)]'}`}>
                        ${(Number(balanceUSD || 0) - getDisplayPrice(confirmingPlan, billingCycle)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                  {balanceUSD - getDisplayPrice(confirmingPlan, billingCycle) < 0 && (
                    <div className="flex items-start gap-3 p-4 rounded-[var(--radius)] bg-red-500/10 border border-red-500/20 text-red-500">
                      <AlertCircle size={18} className="shrink-0 mt-0.5" />
                      <p className="text-xs font-medium">{t('insufficientBalance')}</p>
                    </div>
                  )}
                </div>
                <div className="p-6 bg-[var(--bg-primary)]/50 flex gap-3">
                  <button 
                    onClick={() => setConfirmingPlan(null)} disabled={loading !== null}
                    className="flex-1 py-3 rounded-[var(--radius)] font-bold text-sm transition-theme border bg-[var(--bg-secondary)] border-[var(--border-main)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  >
                    {t('cancel')}
                  </button>
                  <button 
                    onClick={executePayment}
                    disabled={loading !== null || balanceUSD - getDisplayPrice(confirmingPlan, billingCycle) < 0}
                    className="flex-1 py-3 rounded-[var(--radius)] bg-accent hover:bg-accent text-white font-bold text-sm transition-theme shadow-lg shadow-none flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                    {t('confirmAndActivate')}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </ModalPortal>

      <ModalPortal>
        <AnimatePresence>
          {resultModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => {
                  if (resultModal === 'success') {
                    setResultModal(null);
                    navigate('/');
                  } else {
                    setResultModal(null);
                  }
                }}
                className="absolute inset-0 bg-black/80 backdrop-blur-md"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 30 }}
                className="relative w-full max-w-md rounded-[var(--radius)] shadow-2xl overflow-hidden border p-5 md:p-8 text-center bg-[var(--bg-secondary)] border-[var(--border-main)]"
              >
                <div className="absolute top-0 left-0 right-0 h-2" style={{ backgroundColor: selectedPlanForModal?.color || '#334155' }}></div>
                <button 
                  onClick={() => {
                    if (resultModal === 'success') {
                      setResultModal(null);
                      navigate('/');
                    } else {
                      setResultModal(null);
                    }
                  }} 
                  className="absolute top-4 right-4 md:top-6 md:right-6 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                  <X size={20} />
                </button>
                <div className="flex justify-center mb-5 md:mb-8">
                  <div 
                    className="w-16 h-16 md:w-20 md:h-20 rounded-[var(--radius)] flex items-center justify-center"
                    style={{ backgroundColor: `${selectedPlanForModal?.color || '#334155'}15`, color: selectedPlanForModal?.color || '#334155' }}
                  >
                    {resultModal === 'success' ? (
                      <CheckCircle2 size={32} className="md:w-10 md:h-10" style={{ filter: `drop-shadow(0 0 12px ${selectedPlanForModal?.color || '#334155'}60)` }} />
                    ) : (
                      <AlertCircle size={32} className="md:w-10 md:h-10" style={{ filter: `drop-shadow(0 0 12px ${selectedPlanForModal?.color || '#334155'}60)` }} />
                    )}
                  </div>
                </div>
                <h2 className="text-xl md:text-2xl font-bold mb-3 text-[var(--text-primary)]">
                  {resultModal === 'success' ? t('subscriptionSuccess') : t('insufficientBalanceTitle')}
                </h2>
                <p className="text-[var(--text-secondary)] text-xs md:text-sm leading-relaxed mb-5 md:mb-8 px-2 md:px-4">
                  {resultModal === 'success' ? t('subscriptionSuccessDesc') : t('insufficientBalanceDesc')}
                </p>
                {resultModal === 'success' && redirectCountdown !== null && (
                  <div 
                    className="mb-5 md:mb-6 p-4 rounded-[var(--radius)] border flex flex-col items-center justify-center transition-theme shadow-sm bg-[var(--bg-secondary)] border-[var(--border-main)]"
                  >
                    <div 
                      className="flex items-center gap-2.5 text-xs md:text-sm font-black uppercase tracking-wider mb-2"
                      style={{ color: selectedPlanForModal?.color || '#334155' }}
                    >
                      <Loader2 size={16} className="animate-spin" />
                      <span>
                        {dir === 'rtl' 
                          ? `جاري تفعيل الاشتراك وتوجيهك إلى المنصة خلال ${redirectCountdown} ثوانٍ...` 
                          : `Activating premium tier and redirecting to the console in ${redirectCountdown} seconds...`
                        }
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-[var(--border-main)]/50 h-1.5 rounded-[4px] overflow-hidden mt-1">
                      <motion.div 
                        initial={{ width: "100%" }}
                        animate={{ width: "0%" }}
                        transition={{ duration: 5, ease: "linear" }}
                        className="h-full"
                        style={{ backgroundColor: selectedPlanForModal?.color || '#334155' }}
                      />
                    </div>
                  </div>
                )}
                {resultModal === 'insufficient' && (
                  <div className="p-4 rounded-[var(--radius)] mb-6 flex items-center justify-between bg-[var(--bg-overlay)]">
                    <div className="flex items-center gap-2 text-[var(--text-secondary)] text-xs font-medium">
                      <Wallet size={14} />
                      {t('currentBalance')}
                    </div>
                    <span className="text-lg font-bold text-[var(--text-primary)]">${Number(balanceUSD || 0).toFixed(2)}</span>
                  </div>
                )}
                <div className="p-4 md:p-6 rounded-[var(--radius)] mb-5 md:mb-8 border bg-[var(--bg-overlay)] border-[var(--border)]">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-3 text-start">
                    {t('yourReferralLink')}
                  </p>
                  <div className="flex items-center gap-2 p-1.5 rounded-[var(--radius)] border bg-[var(--bg-base)] border-[var(--border)]">
                    <button 
                      onClick={handleCopyLink}
                      className="shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-[var(--radius)] flex items-center justify-center transition-theme text-white"
                      style={{ backgroundColor: copied ? '#334155' : selectedPlanForModal?.color || '#334155' }}
                    >
                      {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                    </button>
                    <div className="flex-1 overflow-hidden text-start">
                      <p className="text-[11px] md:text-xs font-mono text-[var(--text-secondary)] truncate px-2">{referralLink}</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  <button 
                    onClick={handleShare}
                    className="flex-1 py-3 md:py-4 rounded-[var(--radius)] text-white font-bold text-xs md:text-sm transition-theme shadow-lg flex items-center justify-center gap-2"
                    style={{ backgroundColor: selectedPlanForModal?.color || '#334155', boxShadow: `0 10px 20px -5px ${(selectedPlanForModal?.color || '#334155')}40` }}
                  >
                    <Share2 size={18} />
                    {t('shareWithFriends')}
                  </button>
                  <button 
                    onClick={() => {
                      setResultModal(null);
                      if (resultModal === 'success') {
                        navigate('/');
                      }
                    }}
                    className="flex-1 py-3 md:py-4 rounded-[var(--radius)] font-bold text-xs md:text-sm transition-theme border bg-[var(--bg-overlay)] border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] flex items-center justify-center gap-2"
                  >
                    {resultModal === 'success' ? (
                      <>
                        <CheckCircle2 size={16} style={{ color: selectedPlanForModal?.color || '#334155' }} />
                        <span>{dir === 'rtl' ? 'الانتقال للرئيسية' : 'Go to Homepage'}</span>
                      </>
                    ) : (
                      t('close')
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </ModalPortal>
    </ContentContainer>
  );
};
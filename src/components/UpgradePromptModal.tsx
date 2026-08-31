import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAppContext } from '../context/AppContext';
import { useSwipeToClose } from '../utils/swipe';
import { 
  X, Zap, CheckCircle2, AlertTriangle, 
  Sparkles, ShieldCheck, Wallet, 
  Lock, Check, Coins, ExternalLink
} from 'lucide-react';
import { toast } from '../context/NotificationContext';

const toolNameMap: Record<string, { en: string, ar: string }> = {
  chat: { en: 'Sovereign AI Chat', ar: 'محادثة الذكاء الاصطناعي السيادية' },
  chat_fast: { en: 'High-Speed AI Chat', ar: 'محادثة الذكاء الاصطناعي السريعة' },
  chat_pro: { en: 'Advanced Reasoning Engine', ar: 'محرك الاستدلال المتقدم' },
  chat_reasoning: { en: 'Complex Multi-step Reasoning', ar: 'التفكير متعدد الخطوات المعقد' },
  perplexta_analysis: { en: 'Perplexta Deep Synthesis & Search', ar: 'تحليل وبحث بيربليكستا العميق' },
  image: { en: 'High-Precision 8K Image Generation', ar: 'توليد صور بجودة 8K فائدة الدقة' },
  video: { en: 'Cinematic Video Generation', ar: 'التوليد السينمائي المتقدم للفيديو' },
  tts: { en: 'Natural Acoustic Voice Engineering (TTS)', ar: 'الهندسة الصوتية الطبيعية للحديث (TTS)' },
  stt: { en: 'High-Fidelity Dialogue Transcription (STT)', ar: 'تحويل الحديث النصي عالي الدقة (STT)' },
  legal_analysis: { en: 'Legal Workspace & Document Auditor', ar: 'مدقق الوثائق والعمل القانوني' },
  learning: { en: 'Education Assistant', ar: 'مساعد التعليم' },
  code: { en: 'Software Workstation & Code Architect', ar: 'محطة العمل البرمجية وبناء الأكواد' },
  canvas: { en: 'Creative Multi-Modal Design Canvas', ar: 'لوحة التصميم الإبداعي متعددة الوسائط' },
  notebook: { en: 'Strategic Research Workstation', ar: 'محطة عمل الأبحاث الاستراتيجية' },
  sovereign_memory: { en: 'Sovereign System Long-Term Memory', ar: 'ذاكرة النظام طويلة الأمد السيادية' },
  sovereign_search: { en: 'Real-Time Dynamic Web Grounding', ar: 'البحث والربط اللحظي بالشبكة' },
  storage_mb: { en: 'Secure Volume Storage Capacity', ar: 'حجم السعة التخزينية المشفرة' }
};

const toolDescMap: Record<string, { en: string, ar: string }> = {
  chat: { en: 'Strategic dialogue assistant for elite professional analysis.', ar: 'مساعد نقاش استراتيجي للتحليل المهني النخبوي.' },
  chat_fast: { en: 'Ultra-fast intelligence responses for high-speed workflows.', ar: 'استجابات ذكاء فائقة السرعة لسير العمل السريع.' },
  chat_pro: { en: 'Advanced logic framework to solve complex engineering bugs.', ar: 'إطار منطقي متقدم لحل الأخطاء البرمجية والهندسية المعقدة.' },
  chat_reasoning: { en: 'Multi-step planning protocol for critical analysis decisions.', ar: 'بروتوكول تتبع وتخطيط متعدد الخطوات للقرارات التحليلية الحرجة.' },
  perplexta_analysis: { en: 'Deep synthesis of live web results and technical validation.', ar: 'تركيب عميق لنتائج الويب المباشرة والتحقق الفني المتقدم.' },
  image: { en: 'Create studio-quality professional assets with customized models.', ar: 'إنشاء أصول فنية بمواصفات الاستوديوهات ونماذج مخصصة.' },
  video: { en: 'Bring ideas to life with high frame rate cinema synthesis.', ar: 'تجسيد الأفكار لفيديوهات حية عبر توليد سينمائي فائق الجودة.' },
  tts: { en: 'Generate human-like synthetic voices with rich acoustics.', ar: 'توليد أصوات بشرية اصطناعية طبيعية للغاية بتأثيرات صوتية غنية.' },
  stt: { en: 'Transcribe recordings with absolute acoustic accuracy.', ar: 'تحويل التسجيلات الصوتية لنصوص مكتوبة بدقة صوتية متناهية.' },
  legal_analysis: { en: 'Automated contract auditing and full compliance synthesis.', ar: 'التدقيق التلقائي للعقود وتركيب معايير الامتثال القانوني الكاملة.' },
  learning: { en: 'Intelligent assistant specializing in tailored education and training.', ar: 'مساعد ذكي متخصص في التعليم المخصص والتأهيل والتدريب.' },
  code: { en: 'Masterful assistance for refactoring, unit testing and reviews.', ar: 'مساعدة متقنة في إعادة صياغة الأكواد واختبارات الوحدة والمراجعات.' },
  canvas: { en: 'A collaborative digital board for creative logic schemas.', ar: 'لوحة رقمية تعاونية ومخططات منطقية تفاعلية ومبتكرة.' },
  notebook: { en: 'Aggregate strategic logs, drafts and notes with AI assistance.', ar: 'تجميع السجلات الاستراتيجية والمسودات والملاحظات بمساعدة الذكاء الاصطناعي.' },
  sovereign_memory: { en: 'Continuous session persistence for continuous context recall.', ar: 'استمرار الجلسة لاسترجاع كامل للسياقات السابقة.' },
  sovereign_search: { en: 'Incorporate real-time dynamic web data into queries.', ar: 'إدراج بيانات الويب الفورية المباشرة ضمن استعلاماتك.' },
  storage_mb: { en: 'Additional cloud volume for secure file storage and PDF indexes.', ar: 'مساحة تخزينية إضافية للملفات الحساسة وفهرسة ملفات PDF.' }
};

export const UpgradePromptModal: React.FC = () => {
  const navigate = useNavigate();
  const { 
    user, plans, balanceUSD, payWithBalance, stripeCheckout, refreshUser,
    upgradePromptState, closeUpgradePrompt, language, dir, isMobile
  } = useAppContext();

  const swipeHandlers = useSwipeToClose({
    onSwipeClose: closeUpgradePrompt,
    direction: 'both',
    dir: dir as 'rtl' | 'ltr',
    isMobile: !!isMobile
  });

  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [loadingType, setLoadingType] = useState<'stripe' | 'balance' | null>(null);

  if (!upgradePromptState || !upgradePromptState.isOpen) return null;

  const { toolId, limit, currentUsage, period } = upgradePromptState;

  const sortedPlans = [...plans].sort((a, b) => a.monthlyPrice - b.monthlyPrice);

  const currentPlan = plans.find(p => p.id === user?.subscription?.plan_id) || sortedPlans[0];

  const getPlanLimitForTool = (plan: any, tId: string) => {
    if (!plan || !plan.limits) return 0;
    const l = plan.limits[tId];
    if (l === 'unlimited') return Infinity;
    if (typeof l === 'object' && l !== null) {
      if (l.daily === 'unlimited') return Infinity;
      return parseInt(l.daily || '0', 10);
    }
    return parseInt(l || '0', 10);
  };

  const getPlanLimitText = (plan: any, tId: string) => {
    if (!plan || !plan.limits) return language === 'ar' ? 'غير متوفر' : 'Unavailable';
    const l = plan.limits[tId];
    if (l === 'unlimited') return language === 'ar' ? 'غير محدود' : 'Unlimited';
    if (typeof l === 'object' && l !== null) {
      const d = l.daily === 'unlimited' ? '∞' : l.daily;
      const m = l.monthly === 'unlimited' ? '∞' : l.monthly;
      return `${d} ${language === 'ar' ? 'يومياً' : 'daily'} / ${m} ${language === 'ar' ? 'شهرياً' : 'monthly'}`;
    }
    const val = parseInt(l || '0', 10);
    if (val === 0) return language === 'ar' ? 'غير متوفر' : 'No Access';
    return `${val} ${language === 'ar' ? 'مرة' : 'uses'}`;
  };

  const currentPlanLimitNum = getPlanLimitForTool(currentPlan, toolId);

  let nextRequiredPlan = sortedPlans.find(p => {
    if (p.monthlyPrice <= (currentPlan?.monthlyPrice || 0)) return false;
    const lNum = getPlanLimitForTool(p, toolId);
    return lNum > currentPlanLimitNum;
  });

  if (!nextRequiredPlan) {
    nextRequiredPlan = sortedPlans[sortedPlans.length - 1] || currentPlan;
  }

  const toolDetails = toolNameMap[toolId] || { en: toolId, ar: toolId };
  const toolDesc = toolDescMap[toolId] || { en: '', ar: '' };

  const currentPlanName = language === 'ar' ? currentPlan?.nameAr : currentPlan?.nameEn;
  const nextPlanName = language === 'ar' ? nextRequiredPlan?.nameAr : nextRequiredPlan?.nameEn;

  const nextPlanPrice = billingCycle === 'annual' ? nextRequiredPlan?.annualPrice : nextRequiredPlan?.monthlyPrice;
  const nextPlanPriceFormatted = nextPlanPrice === 0 ? (language === 'ar' ? 'مجاناً' : 'Free') : `$${nextPlanPrice}`;
  const nextPlanPeriodLabel = billingCycle === 'annual' 
    ? (language === 'ar' ? 'سنوياً' : '/yr') 
    : (language === 'ar' ? 'شهرياً' : '/mo');

  const activePriceFormatted = billingCycle === 'annual' ? currentPlan?.annualPrice : currentPlan?.monthlyPrice;

  const handleUpgradeWithBalance = async () => {
    if (!nextRequiredPlan) return;
    setLoadingType('balance');
    try {
      const res = await payWithBalance(nextRequiredPlan.id, billingCycle);
      if (res.success) {
        toast.success(
          language === 'ar' 
            ? `تم ترقيتك بنجاح إلى باقة ${nextPlanName}!` 
            : `Successfully upgraded to ${nextPlanName}!`
        );
        await refreshUser();
        closeUpgradePrompt();
      } else {
        toast.error(res.error || (language === 'ar' ? 'فشل إتمام عملية الدفع.' : 'Payment failed.'));
      }
    } catch (err) {
      toast.error(language === 'ar' ? 'خطأ في الشبكة الأساسية.' : 'Network connection error.');
    } finally {
      setLoadingType(null);
    }
  };

  const handleUpgradeWithStripe = async () => {
    if (!nextRequiredPlan) return;
    setLoadingType('stripe');
    try {
      const res = await stripeCheckout(nextRequiredPlan.id, billingCycle);
      if (res.error) {
        toast.error(res.error);
      }
    } catch (err) {
      toast.error(language === 'ar' ? 'خطأ في الوصول لبوابة الدفع.' : 'Gateway transition failed.');
    } finally {
      setLoadingType(null);
    }
  };

  const hasEnoughBalance = balanceUSD >= nextPlanPrice;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Darkened Backdrop blur */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeUpgradePrompt}
          className="absolute inset-0 bg-black/60 backdrop-blur-md"
        />

        {/* Modal Window Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 15 }}
          transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
          onTouchStart={swipeHandlers.onTouchStart}
          onTouchMove={swipeHandlers.onTouchMove}
          onTouchEnd={swipeHandlers.onTouchEnd}
          className="relative w-full max-w-2xl overflow-hidden rounded-lg border border-[var(--border-main)] bg-[#0f0f11] text-[var(--text-primary)] shadow-2xl flex flex-col font-sans"
          dir={dir}
        >
          {/* Subtle Ambient Glowing Background Aura */}
          <div 
            className="absolute -top-40 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full opacity-[0.13] blur-[80px] pointer-events-none transition-theme"
            style={{ backgroundColor: nextRequiredPlan?.color || '#334155' }}
          />

          {/* Modal Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-800/60 relative z-10 bg-[#161619]/40">
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-sm flex items-center justify-center border transition-theme shadow-sm"
                style={{ 
                  color: nextRequiredPlan?.color || '#334155', 
                  borderColor: `${nextRequiredPlan?.color || '#334155'}30`,
                  backgroundColor: `${nextRequiredPlan?.color || '#334155'}0a`,
                  textShadow: `0 0 10px ${nextRequiredPlan?.color || '#334155'}40`
                }}
              >
                <Zap className="animate-pulse" size={18} />
              </div>
              <div>
                <h3 className="text-base font-black tracking-tight text-white leading-tight">
                  {language === 'ar' ? 'طلب ترقية الحصة الرقمية' : 'Quota Upgrade Premium Request'}
                </h3>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">
                  {language === 'ar' ? 'تحليل القيود والمقارنة' : 'LIMIT SYNTHESIS & TIER MATCHING'}
                </p>
              </div>
            </div>
            <button 
              onClick={closeUpgradePrompt}
              className="w-8 h-8 rounded-[4px] border border-transparent flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 bg-transparent transition-theme"
            >
              <X size={16} />
            </button>
          </div>

          {/* Modal Content - Scrollable in case of small heights */}
          <div className="px-6 py-5 overflow-y-auto max-h-[70vh] flex flex-col gap-6 relative z-10 custom-scrollbar">
            
            {/* Warning / Notification Zone */}
            <div className="p-4 rounded-sm border border-amber-500/20 bg-amber-500/[0.03] flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-sm bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                <AlertTriangle size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-amber-500 uppercase tracking-wider mb-0.5">
                  {language === 'ar' ? 'تنفيذ محدود للحصة' : 'PROHIBITED USAGE EXCEEDED'}
                </p>
                <p className="text-xs text-gray-300 leading-relaxed font-medium">
                  {language === 'ar' ? (
                    `لقد تجاوزت الحد المسموح به لاستخدام أداة `
                  ) : (
                    `You have exceeded the available limits for utilizing the `
                  )}
                  <span className="text-white font-black underline decoration-amber-500/40">
                    {language === 'ar' ? toolDetails.ar : toolDetails.en}
                  </span>
                  {language === 'ar' ? (
                    ` على باقتك الحالية (${currentPlanName}). للبدء بمعدل استهلاك أعلى، يرجى الارتقاء للباقة الأعلى.`
                  ) : (
                    ` on your current active plan (${currentPlanName}). Upgrade to a higher professional tier to resume processing without intervals.`
                  )}
                </p>
              </div>
            </div>

            {/* Target Diagnostic Details */}
            <div className="p-4 rounded-sm bg-gray-900/40 border border-gray-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-accent">
                  {language === 'ar' ? 'أداة الاستهداف' : 'TARGET MODULE ACTIVATION'}
                </span>
                <h4 className="text-sm font-bold text-white">
                  {language === 'ar' ? toolDetails.ar : toolDetails.en}
                </h4>
                <p className="text-xs text-gray-400 font-medium">
                  {language === 'ar' ? toolDesc.ar : toolDesc.en}
                </p>
              </div>
              <div className="flex items-center gap-3 bg-[#0f0f11] py-2 px-3.5 rounded-sm border border-gray-800 shrink-0 self-start md:self-center">
                <div className="text-center min-w-[70px]">
                  <p className="text-[8px] font-black text-gray-500 uppercase tracking-tighter mb-0.5">{language === 'ar' ? 'استخدامك' : 'Your Count'}</p>
                  <p className="text-sm font-black text-amber-400 font-mono">{currentUsage || 0}</p>
                </div>
                <div className="w-px h-6 bg-gray-800" />
                <div className="text-center min-w-[70px]">
                  <p className="text-[8px] font-black text-gray-500 uppercase tracking-tighter mb-0.5">{language === 'ar' ? 'الحد الحالي' : 'Plan Limit'}</p>
                  <p className="text-sm font-black text-gray-400 font-mono">{limit || 0}</p>
                </div>
              </div>
            </div>

            {/* Billing toggler */}
            <div className="flex items-center justify-between border-b border-gray-800/50 pb-3">
              <h5 className="text-xs font-black uppercase text-gray-400 tracking-wider">
                {language === 'ar' ? 'طريقة الفوترة' : 'CYCLE ORCHESTRATION'}
              </h5>
              <div className="p-0.5 rounded-sm bg-gray-900 border border-gray-800 flex items-center">
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-3 py-1 rounded-[4px] text-[10px] font-black uppercase tracking-wider transition-theme ${
                    billingCycle === 'monthly'
                      ? 'bg-accent shadow-sm text-black'
                      : 'text-gray-400 hover:text-white bg-transparent'
                  }`}
                >
                  {language === 'ar' ? 'شهري' : 'Monthly'}
                </button>
                <button
                  onClick={() => setBillingCycle('annual')}
                  className={`px-3 py-1 rounded-[4px] text-[10px] font-black uppercase tracking-wider transition-theme flex items-center gap-1 ${
                    billingCycle === 'annual'
                      ? 'bg-accent shadow-sm text-black'
                      : 'text-gray-400 hover:text-white bg-transparent'
                  }`}
                >
                  <span>{language === 'ar' ? 'سنوي (وفر)' : 'Annual (Save)'}</span>
                </button>
              </div>
            </div>

            {/* Side-by-side Comparative Analysis */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* CURRENT PLAN BOX */}
              <div className="p-5 rounded-sm bg-[#161619]/25 border border-gray-800/80 hover:border-gray-800 transition-theme relative flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[9px] font-black tracking-widest text-gray-500 uppercase px-1.5 py-0.5 bg-gray-800/50 border border-gray-800 rounded-sm">
                      {language === 'ar' ? 'الحالي' : 'ACTIVE TIER'}
                    </span>
                    <span className="text-xs font-black text-gray-400 font-mono">
                      {currentPlan?.monthlyPrice === 0 ? (language === 'ar' ? 'مجانى' : 'Free') : `$${activePriceFormatted}`}
                    </span>
                  </div>

                  <h4 className="text-lg font-black text-gray-400 leading-tight">
                    {currentPlanName}
                  </h4>
                  <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-4">
                    {language === 'ar' ? currentPlan?.descAr : currentPlan?.descEn}
                  </p>

                  <div className="space-y-2 border-t border-gray-800/40 pt-4">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-gray-400">{language === 'ar' ? 'صلاحيات الأداة:' : 'Tool Quota:'}</span>
                      <span className="text-amber-500/80 font-bold font-mono">
                        {getPlanLimitText(currentPlan, toolId)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Lock size={12} className="text-gray-600" />
                      <span className="truncate">{language === 'ar' ? 'سرعة وميزات فنية محدودة' : 'Standard computing latency'}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-center gap-2 py-2.5 rounded-sm bg-gray-900/30 border border-gray-800/40 text-gray-500 text-[10px] font-black uppercase tracking-wider">
                  <Check size={12} />
                  <span>{language === 'ar' ? 'الباقة المفعلة الحالية' : 'CURRENT ACTIVE LICENSE'}</span>
                </div>
              </div>

              {/* NEXT LEVEL REQUIRED TIERS BOX */}
              <div 
                className="p-5 rounded-sm bg-[#161619]/50 border transition-theme relative flex flex-col justify-between shadow-xl"
                style={{ 
                  borderColor: `${nextRequiredPlan?.color || '#334155'}40`,
                  boxShadow: `0 0 25px ${(nextRequiredPlan?.color || '#334155')}05`
                }}
              >
                {/* Visual Accent Corner Diamond */}
                <div 
                  className="absolute top-0 right-0 w-2.5 h-2.5 rounded-bl-sm"
                  style={{ backgroundColor: nextRequiredPlan?.color || '#334155' }}
                />

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span 
                      className="text-[9px] font-black tracking-widest uppercase px-1.5 py-0.5 rounded-sm flex items-center gap-1"
                      style={{ 
                        color: nextRequiredPlan?.color || '#334155',
                        backgroundColor: `${nextRequiredPlan?.color || '#334155'}15`,
                        border: `1px solid ${nextRequiredPlan?.color || '#334155'}22`
                      }}
                    >
                      <Sparkles size={10} className="animate-spin" style={{ animationDuration: '6s' }} />
                      <span>{language === 'ar' ? 'الترقية المطلوبة' : 'RECOMMENDED'}</span>
                    </span>
                    <span className="text-xl font-black text-white font-mono flex items-baseline">
                      {nextPlanPriceFormatted}
                      <span className="text-[10px] font-bold text-gray-500 font-sans ml-0.5">{nextPlanPeriodLabel}</span>
                    </span>
                  </div>

                  <h4 
                    className="text-lg font-black leading-tight drop-shadow-sm"
                    style={{ color: nextRequiredPlan?.color || '#334155' }}
                  >
                    {nextPlanName}
                  </h4>
                  <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-4">
                    {language === 'ar' ? nextRequiredPlan?.descAr : nextRequiredPlan?.descEn}
                  </p>

                  <div className="space-y-2 border-t border-gray-850 pt-4">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-gray-300">{language === 'ar' ? 'حصة الأداة الجديدة:' : 'Upgraded Quota:'}</span>
                      <span className="text-accent font-mono  flex items-center gap-1">
                        <Coins size={12} />
                        {getPlanLimitText(nextRequiredPlan, toolId)}
                      </span>
                    </div>
                    {/* Render upgraded plan highlights */}
                    <div className="space-y-1.5 mt-3">
                      {nextRequiredPlan?.features?.slice(0, 3).map((feat: string, fIdx: number) => (
                        <div key={fIdx} className="flex items-center gap-2 text-[11px] text-gray-300">
                          <CheckCircle2 size={11} className="text-accent shrink-0" />
                          <span className="truncate">{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Subsidized with Balance section if sufficient, else standard */}
                <div className="mt-6 space-y-2">
                  <div className="flex items-center justify-between px-2.5 py-1.5 bg-gray-900 border border-gray-800 rounded-sm">
                    <span className="text-[9px] text-gray-500 font-bold uppercase flex items-center gap-1">
                      <Wallet size={10} />
                      {language === 'ar' ? 'رصيد محفظتك:' : 'Your Wallet Balance:'}
                    </span>
                    <span className={`text-[11px] font-black font-mono ${hasEnoughBalance ? 'text-accent' : 'text-gray-400'}`}>
                      ${balanceUSD.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

            </div>

          </div>

          {/* Modal Footer Controls */}
          <div className="flex flex-col sm:flex-row items-center gap-3 px-6 py-5 border-t border-gray-800/60 bg-[#161619]/40 relative z-10 justify-between">
            <button
              onClick={() => {
                closeUpgradePrompt();
                navigate('/subscription');
              }}
              className="w-full sm:w-auto text-[10px] font-black uppercase tracking-widest text-accent hover:text-white transition-theme flex items-center justify-center gap-1.5 py-2.5 px-4 bg-transparent hover:bg-accent/5 rounded-sm border border-accent/10 hover:border-accent/30"
            >
              <ExternalLink size={12} />
              <span>{language === 'ar' ? 'تصفح جميع الخطط المتاحة' : 'EXPLORE ALL TIERS & ADD-ONS'}</span>
            </button>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              {hasEnoughBalance ? (
                <button
                  disabled={loadingType !== null}
                  onClick={handleUpgradeWithBalance}
                  className="w-full sm:w-auto text-[11px] font-black uppercase tracking-wider text-black bg-accent hover:bg-accent disabled:opacity-50 py-3 px-6 rounded-sm shadow-xl shadow-none hover:-translate-y-0.5 active:translate-y-0 transition-transform duration-300 shrink-0 flex items-center justify-center gap-2"
                >
                  {loadingType === 'balance' ? (
                    <span className="w-4 h-4 rounded-full border-2 border-dashed border-black animate-spin" />
                  ) : (
                    <>
                      <Coins size={14} />
                      <span>{language === 'ar' ? 'تفعيل فوري بالرصيد' : 'ACTIVATE INSTANT WITH BALANCE'}</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  disabled={loadingType !== null}
                  onClick={handleUpgradeWithStripe}
                  className="w-full sm:w-auto text-[11px] font-black uppercase tracking-wider text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 py-3 px-6 rounded-sm shadow-xl shadow-blue-500/15 hover:-translate-y-0.5 active:translate-y-0 transition-transform duration-300 shrink-0 flex items-center justify-center gap-2"
                >
                  {loadingType === 'stripe' ? (
                    <span className="w-4 h-4 rounded-full border-2 border-dashed border-white animate-spin" />
                  ) : (
                    <>
                      <Zap size={14} />
                      <span>{language === 'ar' ? 'ترقية الدفع الآمن (Stripe)' : 'CHECKOUT WITH SECURE STRIPE'}</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Secure protocol footer message in gray */}
          <div className="px-6 pb-4 pt-1 bg-[#161619]/40 border-t border-gray-900 flex items-center justify-center gap-1.5 text-[8px] text-gray-500/70 font-bold uppercase tracking-[0.2em] relative z-10 selection:bg-transparent">
            <ShieldCheck size={11} className="text-accent/50" />
            <span>{language === 'ar' ? 'عملية مشفرة بالكامل ومعالجة فورية' : 'STABLE SECURE ENCRYPTED LICENSE PROVISIONING'}</span>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
};

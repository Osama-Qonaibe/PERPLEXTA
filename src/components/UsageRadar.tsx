import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, Clock, Zap, AlertCircle, ChevronDown, ChevronUp, BarChart3, Database, Calendar } from 'lucide-react';

interface UsageItem {
  id: string;
  name_en: string;
  name_ar: string;
  desc_en: string;
  desc_ar: string;
  usage: {
    daily: number;
    monthly: number;
  };
  limits: {
    daily: number | null;
    monthly: number | null;
  };
}

interface UsageData {
  plan: {
    id: number | null;
    name_en: string;
    name_ar: string;
    limits: any;
    status: string;
    billing_period: string;
    color: string;
    current_period_end?: string;
    subscription_start?: string;
  };
  usage: UsageItem[];
}

export const UsageRadar: React.FC = () => {
  const { t, dir, theme, token, socket, language } = useAppContext();
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchUsage = async () => {
    try {
      const res = await fetch('/api/user/usage', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const usageData = await res.json();
        setData(usageData);
      } else {
        setError('Failed to fetch usage data');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchUsage();

    if (socket) {
      const handleUpdate = () => {
        fetchUsage();
      };
      
      socket.on('user_profile_updated', handleUpdate);
      socket.on('usage_update', handleUpdate);
      
      return () => {
        socket.off('user_profile_updated', handleUpdate);
        socket.off('usage_update', handleUpdate);
      };
    }
  }, [token, socket]);

  if (loading) {
    return (
      <div className="space-y-10 animate-pulse transition-theme">
        {/* Skeleton Header - Precision matched to 412px loaded state */}
        <div className="h-[412px] w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-surface)] transition-theme" />
        
        {/* Skeleton Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
          {[1, 2, 3, 4].map(i => (
            <div key={`usage-radar-skel-${i}`} className="h-[156px] rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-surface)] transition-theme" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-12 p-6 rounded-[var(--radius)] border border-red-500/20 bg-red-500/5 text-red-500 space-y-4">
        <AlertCircle size={40} />
        <p className="font-bold">{error || 'Unknown error occurred'}</p>
        <button 
          onClick={() => {
            setError(null);
            setLoading(true);
            fetchUsage();
          }}
          className="px-6 py-2 rounded-[var(--radius)] bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition-colors"
        >
          {t('retry') || 'Retry'}
        </button>
      </div>
    );
  }

  const planColor = data.plan.color || '#334155';
  const renewalDate = data.plan.current_period_end ? new Date(data.plan.current_period_end).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '∞';
  const startDate = data.plan.subscription_start ? new Date(data.plan.subscription_start).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  return (
    <div className="space-y-4 sm:space-y-10 transition-theme">
      {/* Usage Radar Header - Elite Design (Perplexta Static) */}
      <div className={`p-4 sm:p-8 min-h-0 sm:min-h-[412px] flex flex-col justify-center rounded-[var(--radius)] border relative overflow-hidden transition-theme bg-[var(--bg-base)] border-[var(--border)] shadow-[var(--color-shadow)]`} style={{ borderColor: `${planColor}30` }}>
        
        {/* Fixed Header Row */}
        <div className="flex justify-between items-start mb-4 sm:mb-12">
          <div className="flex items-center gap-2.5 sm:gap-4">
            <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-[var(--radius)] flex items-center justify-center bg-accent/10 text-accent shrink-0">
               <Activity size={18} className="animate-pulse sm:w-6 sm:h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-xl font-black tracking-tight">{t('usageRadar') || (dir === 'rtl' ? 'رادار الاستهلاك' : 'Usage Radar')}</h2>
              <p className="text-[9px] sm:text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider opacity-60">
                {t('realTimeUsageSync') || (dir === 'rtl' ? 'مزامنة لحظية للموارد' : 'Real-time resource synchronization')}
              </p>
            </div>
          </div>
        </div>

        {/* Plan Info Card - Centered as per image */}
        <div className={`p-3 sm:p-6 md:p-10 rounded-[var(--radius)] border border-accent/10 bg-accent/[0.02] flex flex-col items-center relative group`}>
           {/* Chart Box - Hidden on very small mobile or positioned safely */}
           <div className="hidden sm:flex absolute left-4 md:left-10 top-1/2 -translate-y-1/2 w-20 h-20 md:w-32 md:h-32 rounded-[var(--radius)] border border-accent/20 items-center justify-center bg-black/20 text-accent group-hover:scale-105 transition-transform duration-300">
              <BarChart3 size={36} className="md:w-12 md:h-12" />
           </div>

           <div className="flex flex-col items-center text-center space-y-2 sm:space-y-6 w-full">
              <div className="space-y-0.5 sm:space-y-1">
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] opacity-60">
                  {t('activeSubscription') || 'Active Subscription'}
                </span>
                <h3 className="text-2xl sm:text-5xl md:text-7xl lg:text-8xl font-black transition-theme leading-none select-none break-words" style={{ color: planColor, filter: `drop-shadow(0 0 20px ${planColor}40)` }}>
                  {dir === 'rtl' ? data.plan.name_ar : data.plan.name_en}
                </h3>
              </div>

               {/* Status Badges Row */}
               <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-3 pt-1">
                  <div className="flex items-center gap-1 sm:gap-2 px-2.5 sm:px-4 py-1 sm:py-2 rounded-[var(--radius)] bg-[var(--surface-subtle)] border border-[var(--border-main)]">
                     <Zap size={12} className={data.plan.id === null || data.plan.status?.toLowerCase() !== 'active' ? "text-[var(--fg-danger)]" : "text-[var(--text-primary)]"} />
                     <span className={`text-[8px] sm:text-[9px] font-black uppercase tracking-wider ${data.plan.id === null || data.plan.status?.toLowerCase() !== 'active' ? "text-[var(--fg-danger)]" : "text-[var(--text-primary)]"}`}>
                       {data.plan.id === null || data.plan.status?.toLowerCase() !== 'active' ? (language === 'ar' ? 'غير نشط' : 'Inactive') : (t('active') || 'Active')}
                     </span>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2 px-2.5 sm:px-4 py-1 sm:py-2 rounded-[var(--radius)] bg-[var(--surface-subtle)] border border-[var(--border-main)] text-[var(--text-muted)]">
                     <Clock size={12} />
                     <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-wider">
                       {data.plan.id === null || data.plan.status?.toLowerCase() !== 'active' ? (language === 'ar' ? 'بدون فترة' : 'None') : (t(data.plan.billing_period.toLowerCase()) || data.plan.billing_period)}
                     </span>
                  </div>
                  {data.plan.id !== null && data.plan.status?.toLowerCase() === 'active' && (
                    <div className="flex items-center gap-1 sm:gap-2 px-2.5 sm:px-4 py-1 sm:py-2 rounded-[var(--radius)] bg-[var(--bg-accent-muted)] border border-[var(--border-accent)] text-[var(--text-primary)]">
                       <Calendar size={11} />
                       <span className="text-[8px] sm:text-[9px] font-black tracking-wider">{startDate} - {renewalDate}</span>
                    </div>
                  )}
               </div>
           </div>
        </div>
      </div>

      {/* Usage Grids */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6 pb-20">
        {data.usage.map((item) => {
          const isDailyUnlimited = item.limits.daily === null;
          const isMonthlyUnlimited = item.limits.monthly === null;
          const isStorage = item.id === 'storage_mb';
          
          const dailyPercent = isDailyUnlimited ? 0 : Math.min(100, (item.usage.daily / (item.limits.daily || 1)) * 100);
          const monthlyPercent = isMonthlyUnlimited ? 0 : Math.min(100, (item.usage.monthly / (item.limits.monthly || 1)) * 100);

          const isExpanded = expanded === item.id;

          return (
            <div className={`rounded-[var(--radius)] min-h-0 sm:min-h-[156px] border border-[var(--border)] bg-[var(--bg-base)] transition-theme overflow-hidden shadow-xs`}
              key={item.id}
              style={{ borderColor: isExpanded ? `${planColor}40` : undefined, boxShadow: isExpanded ? `0 0 20px ${planColor}05` : 'none' }}
            >
              <div className="p-3.5 sm:p-6">
                <div className="flex justify-between items-start mb-3 sm:mb-6">
                  <div className="space-y-0.5 sm:space-y-1 min-w-0 pr-2">
                    <h3 className="text-xs sm:text-[0.65rem] font-black uppercase tracking-wider leading-tight" style={{ color: planColor }}>
                      {t(item.id) || (dir === 'rtl' ? (item.name_ar || item.id) : (item.name_en || item.id))}
                    </h3>
                    <p className="text-[10px] text-[var(--text-muted)] font-medium max-w-[280px] line-clamp-1 leading-snug">
                      {dir === 'rtl' ? item.desc_ar : item.desc_en}
                    </p>
                  </div>
                  <button 
                    onClick={() => setExpanded(isExpanded ? null : item.id)}
                    className="p-1.5 sm:p-2 rounded-[var(--radius)] transition-theme hover:bg-white/5 shrink-0 cursor-pointer"
                  >
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>

                {/* Progress bars */}
                <div className="space-y-3 sm:space-y-6">
                  {/* Primary Progress */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter">
                      <span className="text-[var(--text-muted)]">{isStorage ? (t('usageLoad') || 'Capacity') : (t('usageToday') || 'Daily usage')}</span>
                      <span style={{ color: dailyPercent > 90 ? '#ef4444' : planColor }}>
                        {isStorage ? `${Math.round(item.usage.daily)} MB` : item.usage.daily} / {isDailyUnlimited ? '∞' : (isStorage ? `${item.limits.daily} MB` : item.limits.daily)}
                      </span>
                    </div>
                      <div className="h-2.5 w-full bg-[var(--bg-overlay)] dark:bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/5">
                        <div 
                          style={{ 
                            width: isDailyUnlimited ? '0%' : `${Math.max(2, dailyPercent)}%`,
                            backgroundColor: dailyPercent > 90 ? '#ef4444' : planColor, 
                            boxShadow: `0 0 12px ${dailyPercent > 90 ? '#ef4444' : planColor}80` 
                          }}
                          className="h-full rounded-full transition-theme ease-out"
                        />
                      </div>
                    </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="space-y-4 pt-4 border-t border-[var(--border-main)] dark:border-[var(--border-main)]/40"
                      >
                         {/* Monthly Progress (Skip for Storage) */}
                         {!isStorage && (
                           <div className="space-y-2">
                            <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter">
                              <span className="text-[var(--text-muted)]">{t('usageMonthly') || 'Monthly usage'}</span>
                              <span style={{ color: monthlyPercent > 90 ? '#ef4444' : planColor }}>
                                {item.usage.monthly} / {isMonthlyUnlimited ? '∞' : item.limits.monthly}
                              </span>
                            </div>
                            <div className="h-2.5 w-full bg-[var(--bg-overlay)] dark:bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/5">
                              <div 
                                style={{ 
                                  width: isMonthlyUnlimited ? '100%' : `${Math.max(2, monthlyPercent)}%`,
                                  backgroundColor: monthlyPercent > 90 ? '#ef4444' : planColor, 
                                  opacity: 0.8, 
                                  boxShadow: `0 0 15px ${monthlyPercent > 90 ? '#ef4444' : planColor}40` 
                                }}
                                className="h-full rounded-full transition-theme ease-out"
                              />
                            </div>
                          </div>
                         )}

                        <div className="grid grid-cols-2 gap-3 pt-2">
                          <div className="p-4 rounded-[var(--radius)] flex flex-col items-center justify-center text-center bg-white/5">
                            <Database size={14} className="text-gray-400 mb-2" />
                            <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">{t('resourceId') || 'ID'}</span>
                            <span className="text-xs font-bold font-mono" style={{ color: planColor }}>{item.id}</span>
                          </div>
                          <div className="p-4 rounded-[var(--radius)] flex flex-col items-center justify-center text-center bg-white/5">
                            <Clock size={14} className="text-gray-400 mb-2" />
                            <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">{t('renewal') || 'Renewal'}</span>
                            <span className="text-xs font-bold text-[var(--text-muted)]">{renewalDate}</span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Info Section */}
      <div className="p-8 rounded-[var(--radius)] border transition-theme bg-[var(--bg-secondary)]/10" style={{ borderColor: `${planColor}20` }}>
        <div className="flex gap-4 items-start">
          <div className="w-10 h-10 shrink-0 rounded-[var(--radius)] flex items-center justify-center" style={{ backgroundColor: `${planColor}20`, color: planColor }}>
            <AlertCircle size={20} />
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-black uppercase tracking-widest" style={{ color: planColor }}>
              {t('quotaInfoTitle') || 'Professional Quota Management'}
            </h4>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed font-medium">
              {t('quotaInfoDesc') || (dir === 'rtl' 
                ? 'يتم تصفير العدادات اليومية كل 24 ساعة، بينما يتم تصفير العدادات الشهرية في بداية كل شهر ميلادي. في حال تخطي الحصة المجانية، سيقوم النظام تلقائياً بالخصم من رصيد المحفظة لضمان استمرارية الخدمة بأقل تكلفة.' 
                : 'Daily counters reset every 24 hours, while monthly counters reset at the beginning of each calendar month. If free quota is exceeded, the system automatically draws from your wallet balance to ensure service continuity.'
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

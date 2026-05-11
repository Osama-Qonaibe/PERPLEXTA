import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, Clock, Zap, AlertCircle, ChevronDown, ChevronUp, BarChart3, Database } from 'lucide-react';

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
    name_en: string;
    name_ar: string;
    limits: any;
    status: string;
    billing_period: string;
  };
  usage: UsageItem[];
}

export const UsageRadar: React.FC = () => {
  const { t, dir, theme, token } = useAppContext();
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
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

    if (token) fetchUsage();
  }, [token]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-black uppercase tracking-widest text-gray-500 animate-pulse">{t('analyzingResources') || 'Analyzing Resources...'}</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-12 p-6 rounded-3xl border border-red-500/20 bg-red-500/5 text-red-500 space-y-4">
        <AlertCircle size={40} />
        <p className="font-bold">{error || 'Unknown error occurred'}</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-6 py-2 rounded-xl bg-red-500 text-white font-bold text-sm"
        >
          {t('retry') || 'Retry'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Plan Summary Header */}
      <div className={`p-8 rounded-[3rem] border transition-all duration-500 ${
        theme === 'dark' ? 'bg-[#0a0a0b] border-emerald-500/10 shadow-3xl' : 'bg-gray-50 border-gray-200 shadow-inner'
      }`}>
        <div className="flex flex-col md:flex-row gap-8 items-center justify-between">
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 opacity-60">
              {t('activeSubscription') || 'Active Subscription'}
            </span>
            <h2 className="text-4xl md:text-5xl font-black text-emerald-500 drop-shadow-[0_0_15px_rgba(16,185,129,0.4)]">
              {dir === 'rtl' ? data.plan.name_ar : data.plan.name_en}
            </h2>
            <div className="flex items-center gap-3 text-xs font-bold text-gray-400">
              <Zap size={14} className="text-amber-500" />
              <span className="uppercase tracking-widest">{t(data.plan.status.toLowerCase()) || data.plan.status}</span>
              <span className="opacity-20 font-light">/</span>
              <span className="uppercase tracking-widest">{t(data.plan.billing_period.toLowerCase()) || data.plan.billing_period}</span>
            </div>
          </div>
          
          <div className={`p-6 rounded-3xl flex items-center justify-center ${theme === 'dark' ? 'bg-gray-800/30' : 'bg-white shadow-xl'}`}>
            <BarChart3 size={48} className="text-emerald-500" />
          </div>
        </div>
      </div>

      {/* Usage Grids */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {data.usage.map((item) => {
          const isDailyUnlimited = item.limits.daily === null;
          const isMonthlyUnlimited = item.limits.monthly === null;
          
          const dailyPercent = isDailyUnlimited ? 0 : Math.min(100, (item.usage.daily / (item.limits.daily || 1)) * 100);
          const monthlyPercent = isMonthlyUnlimited ? 0 : Math.min(100, (item.usage.monthly / (item.limits.monthly || 1)) * 100);

          const isExpanded = expanded === item.id;

          return (
            <motion.div 
              key={item.id}
              layout
              className={`rounded-[2rem] border transition-all duration-300 overflow-hidden ${
                theme === 'dark' ? 'bg-[#0f0f11] border-gray-800/40' : 'bg-white border-gray-100 shadow-sm'
              } ${isExpanded ? 'ring-2 ring-emerald-500/20' : ''}`}
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div className="space-y-1">
                    <h3 className="text-[0.65rem] font-black uppercase tracking-widest text-emerald-500/80">
                      {dir === 'rtl' ? (item.name_ar || item.id) : (item.name_en || item.id)}
                    </h3>
                    <p className="text-[10px] text-gray-400 font-medium max-w-[200px] line-clamp-1">
                      {dir === 'rtl' ? item.desc_ar : item.desc_en}
                    </p>
                  </div>
                  <button 
                    onClick={() => setExpanded(isExpanded ? null : item.id)}
                    className={`p-2 rounded-xl transition-all ${theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}
                  >
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>

                {/* Progress bars */}
                <div className="space-y-6">
                  {/* Daily Progress */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter">
                      <span className="text-gray-400">{t('usageToday') || 'Daily usage'}</span>
                      <span className={dailyPercent > 90 ? 'text-red-500' : 'text-emerald-500'}>
                        {item.usage.daily} / {isDailyUnlimited ? '∞' : item.limits.daily}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-800/40 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: isDailyUnlimited ? '0%' : `${dailyPercent}%` }}
                        className={`h-full rounded-full ${
                          dailyPercent > 90 ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]'
                        }`}
                      />
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800/40"
                      >
                         {/* Monthly Progress */}
                         <div className="space-y-2">
                          <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter">
                            <span className="text-gray-400">{t('usageMonthly') || 'Monthly usage'}</span>
                            <span className={monthlyPercent > 90 ? 'text-red-500' : 'text-emerald-500'}>
                              {item.usage.monthly} / {isMonthlyUnlimited ? '∞' : item.limits.monthly}
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-800/40 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: isMonthlyUnlimited ? '0%' : `${monthlyPercent}%` }}
                              className={`h-full rounded-full ${
                                monthlyPercent > 90 ? 'bg-red-500/80 shadow-[0_0_8px_rgba(239,68,68,0.2)]' : 'bg-emerald-600 shadow-[0_0_10px_rgba(5,150,105,0.3)]'
                              }`}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-2">
                          <div className={`p-4 rounded-2xl flex flex-col items-center justify-center text-center ${theme === 'dark' ? 'bg-white/5' : 'bg-gray-50'}`}>
                            <Database size={14} className="text-gray-400 mb-2" />
                            <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{t('resourceId') || 'ID'}</span>
                            <span className="text-xs font-bold font-mono text-emerald-500">{item.id}</span>
                          </div>
                          <div className={`p-4 rounded-2xl flex flex-col items-center justify-center text-center ${theme === 'dark' ? 'bg-white/5' : 'bg-gray-50'}`}>
                            <Clock size={14} className="text-gray-400 mb-2" />
                            <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{t('renewal') || 'Renewal'}</span>
                            <span className="text-xs font-bold text-gray-500">24h / 30d</span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Info Section */}
      <div className={`p-8 rounded-[2.5rem] border transition-all duration-300 ${
        theme === 'dark' ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-emerald-50/50 border-emerald-100'
      }`}>
        <div className="flex gap-4 items-start">
          <div className="w-10 h-10 shrink-0 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-500">
            <AlertCircle size={20} />
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
              {t('quotaInfoTitle') || 'Professional Quota Management'}
            </h4>
            <p className="text-xs text-gray-500 leading-relaxed font-medium">
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

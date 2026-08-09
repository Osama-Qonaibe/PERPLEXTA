import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  BarChart2,
  TrendingUp,
  Eye,
  MousePointerClick,
  Users,
  MapPin,
  Sparkles,
  RefreshCw,
  Rocket,
  Heart,
  MessageSquare,
  Share2,
  Zap,
  ArrowUpRight,
  Target,
  Smartphone,
  DollarSign,
  X
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip
} from 'recharts';

export interface AdInsightsTabProps {
  adId: number;
  isRtl: boolean;
  token?: string | null;
  onBoostClick?: () => void;
  onClose?: () => void;
}

export interface AdInsightsData {
  ad_id: number;
  title: string;
  status: string;
  is_boosted: boolean;
  price_paid: number;
  impressions_count: number;
  clicks_count: number;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  inquiries_count: number;
  ctr: number;
  engagement_rate: number;
  cost_per_click: number;
  cpm: number;
  reach_stats: {
    estimated_unique_reach: number;
    daily_avg_views: number;
    reach_multiplier: string;
    duration_days: number;
    created_at?: string;
    expires_at?: string;
  };
  time_series: Array<{
    date: string;
    dateEn: string;
    impressions: number;
    clicks: number;
    interactions: number;
  }>;
  locations: Array<{
    city: string;
    cityEn: string;
    percentage: number;
    count: number;
  }>;
  devices: Array<{
    device: string;
    percentage: number;
    color: string;
  }>;
  recommendations: Array<{
    type: string;
    title_ar: string;
    title_en: string;
    message_ar: string;
    message_en: string;
  }>;
}

export const AdInsightsTab: React.FC<AdInsightsTabProps> = ({
  adId,
  isRtl,
  token,
  onBoostClick,
  onClose
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<AdInsightsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = async () => {
    setLoading(true);
    setError(null);
    try {
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch(`/api/bulletin/ads/${adId}/insights`, { headers });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.insights) {
          setData(json.insights);
        } else {
          setError(json.error || 'Failed to load insights');
        }
      } else {
        setError('Failed to fetch ad insights');
      }
    } catch (err: any) {
      console.error('[AdInsightsTab] Fetch error:', err);
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (adId) {
      fetchInsights();
    }
  }, [adId, token]);

  if (loading) {
    return (
      <div className="p-6 text-center text-xs text-gray-400 flex flex-col items-center justify-center gap-2 bg-gray-50/80 dark:bg-[#141417] rounded-2xl border border-gray-200 dark:border-gray-800 my-2">
        <RefreshCw size={22} className="animate-spin text-accent" />
        <span className="font-bold text-gray-700 dark:text-gray-300">
          {isRtl ? 'جاري تحليل إحصائيات وصول الإعلان ومعدلات التفاعل...' : 'Analyzing ad reach & interaction rate data...'}
        </span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-4 text-center text-xs text-red-500 bg-red-500/10 rounded-xl border border-red-500/20 my-2 flex items-center justify-between">
        <span>{error || (isRtl ? 'تعذر جلب بيانات التحليلات' : 'Unable to fetch analytics data')}</span>
        <button
          onClick={fetchInsights}
          className="px-2.5 py-1 rounded-lg bg-red-500 text-white font-bold text-[10px] flex items-center gap-1"
        >
          <RefreshCw size={11} />
          <span>{isRtl ? 'إعادة المحاولة' : 'Retry'}</span>
        </button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className="p-3.5 sm:p-4 bg-gray-900 text-white rounded-2xl border border-accent/30 space-y-4 my-2 shadow-xl overflow-hidden transition-theme [will-change:background-color,border-color,color]"
    >
      <div className="flex items-center justify-between border-b border-gray-800 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-accent/20 text-accent border border-accent/30">
            <BarChart2 size={16} />
          </div>
          <div>
            <h4 className="text-xs font-black text-white flex items-center gap-1.5">
              <span>{isRtl ? 'لوحة تحليلات ورؤى الإعلان' : 'Creator Ad Insights Panel'}</span>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-accent text-black font-extrabold">
                Live Analytics
              </span>
            </h4>
            <p className="text-[10px] text-gray-400">
              {isRtl ? 'بيانات حية مباشرة من قاعدة بيانات تحليلات المنصة' : 'Real-time analytics derived from our analytics database'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchInsights}
            className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-[10px] flex items-center gap-1 transition-theme"
            title={isRtl ? 'تحديث' : 'Refresh'}
          >
            <RefreshCw size={12} />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-[10px] flex items-center gap-1 transition-theme"
              title={isRtl ? 'إغلاق' : 'Close'}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* 4 Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {/* Metric 1: Impressions / View Counts */}
        <div className="p-2.5 rounded-xl bg-gray-800/80 border border-gray-700/80 space-y-1">
          <div className="flex items-center justify-between text-[10px] text-gray-400 font-bold">
            <span>{isRtl ? 'إجمالي المشاهدات' : 'Total Views'}</span>
            <Eye size={13} className="text-blue-400" />
          </div>
          <div className="text-base sm:text-lg font-black text-white flex items-baseline gap-1">
            <span>{data.impressions_count.toLocaleString()}</span>
            <span className="text-[9px] text-accent font-bold">
              +{data.reach_stats.daily_avg_views}/y
            </span>
          </div>
          <p className="text-[9px] text-gray-400 truncate">
            {isRtl ? 'إجمالي الظهور في اللوحة' : 'Ad Impressions Count'}
          </p>
        </div>

        {/* Metric 2: Interaction Rate / CTR */}
        <div className="p-2.5 rounded-xl bg-gray-800/80 border border-gray-700/80 space-y-1">
          <div className="flex items-center justify-between text-[10px] text-gray-400 font-bold">
            <span>{isRtl ? 'معدل التفاعل (CTR)' : 'Interaction Rate'}</span>
            <TrendingUp size={13} className="text-accent" />
          </div>
          <div className="text-base sm:text-lg font-black text-accent flex items-baseline gap-1">
            <span>{data.ctr}%</span>
            <span className="text-[9px] text-gray-300 font-bold">
              ({data.engagement_rate}% Eng)
            </span>
          </div>
          <p className="text-[9px] text-accent font-bold truncate">
            {data.ctr >= 2.5 ? (isRtl ? '🔥 أداء ممتااااز' : '🔥 Excellent CTR') : (isRtl ? 'أداء مستقر' : 'Normal CTR')}
          </p>
        </div>

        {/* Metric 3: Total Clicks & Inquiries */}
        <div className="p-2.5 rounded-xl bg-gray-800/80 border border-gray-700/80 space-y-1">
          <div className="flex items-center justify-between text-[10px] text-gray-400 font-bold">
            <span>{isRtl ? 'النقرات والتواصل' : 'Clicks & Leads'}</span>
            <MousePointerClick size={13} className="text-amber-400" />
          </div>
          <div className="text-base sm:text-lg font-black text-amber-400 flex items-baseline gap-1">
            <span>{data.clicks_count.toLocaleString()}</span>
            <span className="text-[9px] text-gray-300 font-bold">
              +{data.inquiries_count} {isRtl ? 'رسالة' : 'msgs'}
            </span>
          </div>
          <p className="text-[9px] text-gray-400 truncate">
            {isRtl ? 'نقرات الروابط والرسائل' : 'Direct Target Clicks'}
          </p>
        </div>

        {/* Metric 4: Estimated Unique Reach */}
        <div className="p-2.5 rounded-xl bg-gray-800/80 border border-gray-700/80 space-y-1">
          <div className="flex items-center justify-between text-[10px] text-gray-400 font-bold">
            <span>{isRtl ? 'الوصول الفريد' : 'Current Reach'}</span>
            <Users size={13} className="text-purple-400" />
          </div>
          <div className="text-base sm:text-lg font-black text-purple-300 flex items-baseline gap-1">
            <span>{data.reach_stats.estimated_unique_reach.toLocaleString()}</span>
            <span className="text-[9px] text-accent font-bold">
              ({data.reach_stats.reach_multiplier})
            </span>
          </div>
          <p className="text-[9px] text-gray-400 truncate">
            {isRtl ? 'مستفيدين فريدين وصلهم الإعلان' : 'Unique Reached Users'}
          </p>
        </div>
      </div>

      {/* Engagement Breakdown Pills */}
      <div className="grid grid-cols-4 gap-1.5 p-2 rounded-xl bg-gray-950/80 border border-gray-800 text-[10px] text-center">
        <div className="space-y-0.5">
          <span className="text-gray-400 flex items-center justify-center gap-1">
            <Heart size={10} className="text-red-400" />
            <span>{isRtl ? 'الإعجابات' : 'Likes'}</span>
          </span>
          <span className="font-extrabold text-white text-xs">{data.likes_count}</span>
        </div>
        <div className="space-y-0.5">
          <span className="text-gray-400 flex items-center justify-center gap-1">
            <MessageSquare size={10} className="text-blue-400" />
            <span>{isRtl ? 'التعليقات' : 'Comments'}</span>
          </span>
          <span className="font-extrabold text-white text-xs">{data.comments_count}</span>
        </div>
        <div className="space-y-0.5">
          <span className="text-gray-400 flex items-center justify-center gap-1">
            <Share2 size={10} className="text-accent" />
            <span>{isRtl ? 'المشاركات' : 'Shares'}</span>
          </span>
          <span className="font-extrabold text-white text-xs">{data.shares_count}</span>
        </div>
        <div className="space-y-0.5">
          <span className="text-gray-400 flex items-center justify-center gap-1">
            <DollarSign size={10} className="text-amber-400" />
            <span>{isRtl ? 'تكلفة النقرة' : 'CPC'}</span>
          </span>
          <span className="font-extrabold text-accent text-xs">${data.cost_per_click}</span>
        </div>
      </div>

      {/* 7-Day Reach Trend Visual Chart */}
      <div className="p-3 rounded-xl bg-gray-950/90 border border-gray-800 space-y-2">
        <div className="flex items-center justify-between text-[11px] font-extrabold text-gray-300">
          <span className="flex items-center gap-1.5">
            <Zap size={13} className="text-accent animate-pulse" />
            <span>{isRtl ? 'منحنى الوصول والتفاعل اليومي' : 'Daily Reach & Interaction Trend'}</span>
          </span>
          <span className="text-[9px] text-gray-400 font-normal">
            {isRtl ? 'آخر 7 أيام' : 'Last 7 Days'}
          </span>
        </div>

        <div className="h-32 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.time_series} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="colorReach" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#334155" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#334155" stopOpacity={0.0}/>
                </linearGradient>
                <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey={isRtl ? "date" : "dateEn"} stroke="#6b7280" fontSize={9} tickLine={false} />
              <YAxis stroke="#6b7280" fontSize={9} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  borderColor: '#374151',
                  borderRadius: '12px',
                  fontSize: '10px',
                  color: '#fff'
                }}
              />
              <Area type="monotone" dataKey="impressions" name={isRtl ? "المشاهدات" : "Views"} stroke="#334155" fillOpacity={1} fill="url(#colorReach)" />
              <Area type="monotone" dataKey="clicks" name={isRtl ? "النقرات" : "Clicks"} stroke="#3b82f6" fillOpacity={1} fill="url(#colorClicks)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Demographic & Geographic Reach Distribution */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Geographic Top Cities */}
        <div className="p-2.5 rounded-xl bg-gray-800/60 border border-gray-700/60 space-y-2 text-[10px]">
          <div className="flex items-center justify-between font-bold text-gray-300">
            <span className="flex items-center gap-1">
              <MapPin size={12} className="text-accent" />
              <span>{isRtl ? 'أعلى المدن والوصول الجغرافي' : 'Top Geographic Cities'}</span>
            </span>
            <span className="text-[9px] text-accent font-extrabold">% Reach</span>
          </div>

          <div className="space-y-1.5">
            {data.locations.map((loc, idx) => (
              <div key={idx} className="space-y-0.5">
                <div className="flex justify-between text-gray-300 font-medium text-[9.5px]">
                  <span>{isRtl ? loc.city : loc.cityEn}</span>
                  <span className="font-bold text-accent">{loc.percentage}% ({loc.count})</span>
                </div>
                <div className="w-full bg-gray-900 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-gray-500/10 to-teal-400 h-full rounded-full transition-theme"
                    style={{ width: `${loc.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Device Types */}
        <div className="p-2.5 rounded-xl bg-gray-800/60 border border-gray-700/60 space-y-2 text-[10px]">
          <div className="flex items-center justify-between font-bold text-gray-300">
            <span className="flex items-center gap-1">
              <Smartphone size={12} className="text-blue-400" />
              <span>{isRtl ? 'أجهزة التصفح والجمهور' : 'Devices & Tech Specs'}</span>
            </span>
            <span className="text-[9px] text-blue-400 font-extrabold">Device %</span>
          </div>

          <div className="space-y-2 pt-1">
            {data.devices.map((dev, idx) => (
              <div key={idx} className="flex items-center justify-between p-1.5 rounded-lg bg-gray-900/80 border border-gray-800">
                <span className="text-gray-300 font-medium">{dev.device}</span>
                <span className="font-extrabold text-accent bg-accent/10 px-2 py-0.5 rounded-full border border-accent/20">
                  {dev.percentage}%
                </span>
              </div>
            ))}

            <div className="p-2 rounded-lg bg-accent/40 border border-accent/30 text-[9.5px] text-accent flex items-center gap-1.5 mt-2">
              <Sparkles size={13} className="shrink-0 text-accent" />
              <span>
                {isRtl
                  ? '78% من الجمهور يفضل تصفح الإعلانات عبر الجوال، تأكد من وضوح الصورة.'
                  : '78% of your audience interacts via mobile devices.'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Creator AI Recommendations */}
      {data.recommendations && data.recommendations.length > 0 && (
        <div className="space-y-1.5 pt-1">
          {data.recommendations.map((rec, idx) => (
            <div
              key={idx}
              className="p-2.5 rounded-xl bg-gradient-to-r from-gray-500/10 via-gray-900 to-gray-950 border border-accent/30 flex items-start justify-between gap-2"
            >
              <div className="space-y-0.5 text-start">
                <h5 className="text-[11px] font-extrabold text-accent flex items-center gap-1">
                  <Sparkles size={11} className="text-amber-400" />
                  <span>{isRtl ? rec.title_ar : rec.title_en}</span>
                </h5>
                <p className="text-[10px] text-gray-300 leading-normal">
                  {isRtl ? rec.message_ar : rec.message_en}
                </p>
              </div>

              {onBoostClick && !data.is_boosted && (
                <button
                  onClick={onBoostClick}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-gray-500/5 hover:from-amber-600 hover:to-gray-500/5 text-white font-black text-[10px] flex items-center gap-1 shrink-0 shadow-sm transition-theme"
                >
                  <Rocket size={11} />
                  <span>{isRtl ? 'ترقية التمويل' : 'Boost Now'}</span>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

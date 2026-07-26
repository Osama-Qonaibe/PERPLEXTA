import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import {
  BarChart2,
  TrendingUp,
  Eye,
  MousePointerClick,
  DollarSign,
  MessageCircle,
  Users,
  MapPin,
  Smartphone,
  Sparkles,
  RefreshCw,
  Award,
  ChevronRight,
  ArrowUpRight,
  Zap,
  Globe,
  PieChart as PieIcon,
  Filter,
  CheckCircle2,
  Clock,
  ThumbsUp,
  Share2
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';
import { toast } from 'sonner';

export const UserAdAnalyticsView: React.FC = () => {
  const { language, token } = useAppContext();
  const isRtl = language === 'ar';

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [data, setData] = useState<any>(null);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/bulletin/my-analytics', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (res.ok) {
        const result = await res.json();
        if (result.success) {
          setData(result);
        }
      } else {
        toast.error(isRtl ? 'فشل تحميل تحليلات الإعلانات' : 'Failed to load ad analytics');
      }
    } catch (e) {
      console.error('[UserAdAnalyticsView] Error fetching data:', e);
      toast.error(isRtl ? 'خطأ في الاتصال بالسيرفر' : 'Server connection error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchAnalytics();
    }
  }, [token]);

  if (isLoading) {
    return (
      <div className="p-12 text-center text-xs text-gray-400 flex flex-col items-center justify-center gap-3 bg-[var(--bg-secondary)] border border-[var(--border-main)] rounded-2xl min-h-[400px]">
        <RefreshCw size={28} className="animate-spin text-emerald-500" />
        <span className="font-bold text-sm text-[var(--text-primary)]">
          {isRtl ? 'جاري تحليل نتائج الحملات والإعلانات الخاصة بك...' : 'Analyzing your ad campaigns & audience data...'}
        </span>
      </div>
    );
  }

  if (!data || !data.summary) {
    return (
      <div className="p-12 text-center text-xs text-gray-400 flex flex-col items-center justify-center gap-3 bg-[var(--bg-secondary)] border border-[var(--border-main)] rounded-2xl min-h-[300px]">
        <BarChart2 size={36} className="text-gray-500 opacity-50" />
        <span className="font-bold text-sm text-[var(--text-primary)]">
          {isRtl ? 'لا توجد بيانات إحصائية متاحة حالياً' : 'No ad analytics data available yet.'}
        </span>
      </div>
    );
  }

  const { summary, timeSeries, demographics, audienceType, locations, insights, ads } = data;

  const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#64748b'];

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-emerald-950/40 via-teal-950/30 to-[var(--bg-secondary)] border border-emerald-500/20 rounded-2xl p-6 relative overflow-hidden shadow-xl">
        <div className="absolute -top-12 -end-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)] text-xs font-black uppercase tracking-wider mb-1">
              <Sparkles size={16} />
              <span>{isRtl ? 'محلل نتائج الحملات والجمهور المستهدف' : 'Ad Performance & Demographic Intelligence'}</span>
            </div>
            <h2 className="text-2xl font-black text-[var(--text-primary)] flex items-center gap-2">
              <span>{isRtl ? 'لوحة تتبع نتائج الإعلانات الفردية' : 'My Ad Analytics Dashboard'}</span>
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-1 max-w-2xl leading-relaxed">
              {isRtl
                ? 'تتبع دقيق لمشاهدات إعلاناتك، نسبة النقرات (CTR)، التكلفة الإجمالية، والتوزيع الجغرافي.'
                : 'Precise tracking of impressions, CTR, audience demographics, and geography.'}
            </p>
          </div>

          <button
            onClick={fetchAnalytics}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-xs hover:bg-emerald-500 hover:text-white transition-all shadow-sm shrink-0"
          >
            <RefreshCw size={15} />
            <span>{isRtl ? 'تحديث البيانات' : 'Refresh Data'}</span>
          </button>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-main)] p-4 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-blue-500">
            <span className="text-[10px] font-bold text-[var(--text-muted)]">{isRtl ? 'المشاهدات' : 'Impressions'}</span>
            <Eye size={16} />
          </div>
          <div className="mt-2">
            <div className="text-xl font-black text-[var(--text-primary)]">{summary.totalImpressions.toLocaleString()}</div>
            <div className="text-[10px] text-blue-500 font-bold mt-0.5">{summary.activeAds} {isRtl ? 'إعلانات نشطة' : 'Active ads'}</div>
          </div>
        </div>

        <div className="bg-[var(--bg-secondary)] border border-[var(--border-main)] p-4 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-purple-500">
            <span className="text-[10px] font-bold text-[var(--text-muted)]">{isRtl ? 'النقرات' : 'Clicks'}</span>
            <MousePointerClick size={16} />
          </div>
          <div className="mt-2">
            <div className="text-xl font-black text-[var(--text-primary)]">{summary.totalClicks.toLocaleString()}</div>
            <div className="text-[10px] text-purple-500 font-bold mt-0.5">{isRtl ? 'نقرة حقيقية' : 'Unique clicks'}</div>
          </div>
        </div>

        <div className="bg-[var(--bg-secondary)] border border-[var(--border-main)] p-4 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-500">
            <span className="text-[10px] font-bold text-[var(--text-muted)]">{isRtl ? 'نسبة النقر CTR' : 'Click Rate (CTR)'}</span>
            <TrendingUp size={16} />
          </div>
          <div className="mt-2">
            <div className="text-xl font-black text-emerald-500">{summary.ctr}%</div>
            <div className="text-[10px] text-emerald-400 font-bold mt-0.5">
              {summary.ctr >= 2.5 ? (isRtl ? '🔥 ممتاز (أعلى من المتوسط)' : '🔥 High Performance') : (isRtl ? 'متوسط' : 'Average')}
            </div>
          </div>
        </div>

        <div className="bg-[var(--bg-secondary)] border border-[var(--border-main)] p-4 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-500">
            <span className="text-[10px] font-bold text-[var(--text-muted)]">{isRtl ? 'إجمالي الإنفاق' : 'Total Spend'}</span>
            <DollarSign size={16} />
          </div>
          <div className="mt-2">
            <div className="text-xl font-black text-[var(--text-primary)]">${summary.totalSpend}</div>
            <div className="text-[10px] text-amber-500 font-bold mt-0.5">{summary.totalAds} {isRtl ? 'حملات مدفوعة' : 'Campaigns'}</div>
          </div>
        </div>

        <div className="bg-[var(--bg-secondary)] border border-[var(--border-main)] p-4 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-teal-500">
            <span className="text-[10px] font-bold text-[var(--text-muted)]">{isRtl ? 'الاستفسارات والرسائل' : 'Customer Leads'}</span>
            <MessageCircle size={16} />
          </div>
          <div className="mt-2">
            <div className="text-xl font-black text-[var(--text-primary)]">{summary.totalInquiries}</div>
            <div className="text-[10px] text-teal-500 font-bold mt-0.5">{isRtl ? 'محادثة خاصة' : 'Direct Inquiries'}</div>
          </div>
        </div>

        <div className="bg-[var(--bg-secondary)] border border-[var(--border-main)] p-4 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-pink-500">
            <span className="text-[10px] font-bold text-[var(--text-muted)]">{isRtl ? 'التفاعل والإعجابات' : 'Engagements'}</span>
            <ThumbsUp size={16} />
          </div>
          <div className="mt-2">
            <div className="text-xl font-black text-[var(--text-primary)]">{summary.totalLikes + summary.totalShares}</div>
            <div className="text-[10px] text-pink-500 font-bold mt-0.5">👍 {summary.totalLikes} • ↗️ {summary.totalShares}</div>
          </div>
        </div>
      </div>

      {/* Main Charts Row 1: Time Series Trend & Geographic Location Reach */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Time-Series Area Chart (2 cols) */}
        <div className="lg:col-span-2 bg-[var(--bg-secondary)] border border-[var(--border-main)] rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-main)]">
            <div>
              <h3 className="font-extrabold text-sm text-[var(--text-primary)] flex items-center gap-2">
                <BarChart2 size={18} className="text-emerald-500" />
                <span>{isRtl ? 'مسار المشاهدات والنقرات اليومية (آخر 14 يوم)' : 'Daily Impressions vs Clicks Timeline'}</span>
              </h3>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                {isRtl ? 'تطور تفاعل الزوار مع إعلاناتك يوماً بيوم.' : 'Day-by-day engagement performance timeline.'}
              </p>
            </div>
          </div>

          <div className="h-[280px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="userImpGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="userClickGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#18181b',
                    borderColor: '#27272a',
                    borderRadius: '8px',
                    fontSize: '11px',
                    color: '#fff'
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Area
                  type="monotone"
                  dataKey="impressions"
                  name={isRtl ? 'المشاهدات (Impressions)' : 'Impressions'}
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#userImpGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="clicks"
                  name={isRtl ? 'النقرات (Clicks)' : 'Clicks'}
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#userClickGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Geographic Distribution Bar Chart */}
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-main)] rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="pb-3 border-b border-[var(--border-main)]">
            <h3 className="font-extrabold text-sm text-[var(--text-primary)] flex items-center gap-2">
              <MapPin size={18} className="text-blue-500" />
              <span>{isRtl ? 'التوزيع الجغرافي للجمهور' : 'Geographic Audience Reach'}</span>
            </h3>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
              {isRtl ? 'أعلى المدن والمحافظات تفاعلاً مع منتجاتك.' : 'Top cities and regions engaging with your ads.'}
            </p>
          </div>

          <div className="h-[280px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={locations} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#9ca3af' }} unit="%" />
                <YAxis dataKey={isRtl ? 'city' : 'city_en'} type="category" tick={{ fontSize: 10, fill: '#9ca3af' }} width={80} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#18181b',
                    borderColor: '#27272a',
                    borderRadius: '8px',
                    fontSize: '11px',
                    color: '#fff'
                  }}
                />
                <Bar dataKey="percentage" name={isRtl ? 'نسبة الجمهور (%)' : 'Audience Share (%)'} radius={[0, 4, 4, 0]}>
                  {locations.map((entry: any, index: number) => (
                    <Cell key={`cell-loc-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 2: Demographics (Age & Gender) & Audience Device Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Age Groups Bar Chart */}
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-main)] rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="pb-3 border-b border-[var(--border-main)]">
            <h3 className="font-extrabold text-sm text-[var(--text-primary)] flex items-center gap-2">
              <Users size={18} className="text-purple-500" />
              <span>{isRtl ? 'توزيع الفئات العمرية' : 'Age Demographic Groups'}</span>
            </h3>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
              {isRtl ? 'الفئات العمرية الأكثر اهتماماً بإعلانك.' : 'Primary age brackets viewing your ad.'}
            </p>
          </div>

          <div className="h-[220px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={demographics.ageGroups} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="group" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} unit="%" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#18181b',
                    borderColor: '#27272a',
                    borderRadius: '8px',
                    fontSize: '11px',
                    color: '#fff'
                  }}
                />
                <Bar dataKey="percentage" name={isRtl ? 'النسبة المئوية (%)' : 'Percentage (%)'} fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gender Distribution Pie Chart */}
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-main)] rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="pb-3 border-b border-[var(--border-main)]">
            <h3 className="font-extrabold text-sm text-[var(--text-primary)] flex items-center gap-2">
              <PieIcon size={18} className="text-pink-500" />
              <span>{isRtl ? 'توزيع الجنس (ذكور / إناث)' : 'Gender Breakdown'}</span>
            </h3>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
              {isRtl ? 'نسبة المتابعين والمهتمين حسب الجنس.' : 'Audience breakdown by gender.'}
            </p>
          </div>

          <div className="h-[220px] w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={demographics.gender}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="percentage"
                >
                  {demographics.gender.map((entry: any, index: number) => (
                    <Cell key={`gender-cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#18181b',
                    borderColor: '#27272a',
                    borderRadius: '8px',
                    fontSize: '11px',
                    color: '#fff'
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Devices & Audience Type Breakdown */}
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-main)] rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="pb-3 border-b border-[var(--border-main)]">
            <h3 className="font-extrabold text-sm text-[var(--text-primary)] flex items-center gap-2">
              <Smartphone size={18} className="text-emerald-500" />
              <span>{isRtl ? 'نوع الأجهزة والشرائح' : 'Device & Buyer Types'}</span>
            </h3>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
              {isRtl ? 'أنواع الأجهزة وشرائح المشتريين المباشرين.' : 'Browsing device types and customer segments.'}
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <div>
              <div className="text-[11px] font-bold text-gray-400 mb-2">{isRtl ? 'توزيع الأجهزة:' : 'Device Breakdown:'}</div>
              <div className="space-y-2">
                {audienceType.devices.map((dev: any, i: number) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold text-[var(--text-primary)]">
                      <span>{dev.device}</span>
                      <span className="text-emerald-500 font-mono">{dev.percentage}%</span>
                    </div>
                    <div className="w-full bg-[var(--bg-base)] h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${dev.percentage}%`, backgroundColor: dev.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-[var(--border-main)]">
              <div className="text-[11px] font-bold text-gray-400 mb-2">{isRtl ? 'شرائح الاهتمام:' : 'Customer Segments:'}</div>
              <div className="space-y-1.5">
                {audienceType.buyerSegments.map((seg: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between text-[11px] p-2 rounded bg-[var(--bg-base)]">
                    <span className="font-bold text-[var(--text-primary)]">{seg.segment}</span>
                    <span className="font-extrabold text-purple-400 font-mono">{seg.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: AI Growth Insights & Actionable Recommendations */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-main)] rounded-2xl p-5 space-y-4">
        <div className="pb-3 border-b border-[var(--border-main)]">
          <h3 className="font-extrabold text-sm text-[var(--text-primary)] flex items-center gap-2">
            <Zap size={18} className="text-amber-500 animate-pulse" />
            <span>{isRtl ? 'توصيات الذكاء الاصطناعي لمضاعفة مبيعاتك' : 'AI Performance Insights & Recommendations'}</span>
          </h3>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
            {isRtl ? 'نصائح مخصصة بناءً على سلوك زوار إعلاناتك لتحقيق أفضل عائد على الاستثمار.' : 'Automated tips to maximize campaign ROI based on audience metrics.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {insights.map((item: any, idx: number) => (
            <div
              key={idx}
              className="p-4 rounded-xl border bg-gradient-to-br from-[var(--bg-base)] to-[var(--bg-secondary)] space-y-2 border-emerald-500/20 shadow-sm"
            >
              <div className="font-extrabold text-xs text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 size={15} />
                <span>{isRtl ? item.title_ar : item.title_en}</span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                {isRtl ? item.message_ar : item.message_en}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Row 4: Individual Ad Performance Breakdown Table */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-main)] rounded-2xl p-5 space-y-4">
        <div className="pb-3 border-b border-[var(--border-main)] flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-sm text-[var(--text-primary)] flex items-center gap-2">
              <Award size={18} className="text-emerald-500" />
              <span>{isRtl ? 'جدول نتائج إعلاناتك الفردية' : 'Individual Ad Performance Breakdown'}</span>
            </h3>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
              {isRtl ? 'مقارنة أداء كل إعلان نُشر من حسابك بشكل منفصل.' : 'Detailed metrics for each ad you published.'}
            </p>
          </div>
        </div>

        {ads.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-400">
            {isRtl ? 'لم تقم بنشر إعلانات مموّلة بعد' : 'No ads published yet.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs border-collapse">
              <thead>
                <tr className="bg-[var(--bg-base)] border-b border-[var(--border-main)] text-[var(--text-muted)] font-bold">
                  <th className="p-3 text-start">{isRtl ? 'الإعلان' : 'Ad Title'}</th>
                  <th className="p-3 text-center">{isRtl ? 'الفئة والمدينة' : 'Category & City'}</th>
                  <th className="p-3 text-center">{isRtl ? 'المشاهدات' : 'Impressions'}</th>
                  <th className="p-3 text-center">{isRtl ? 'النقرات' : 'Clicks'}</th>
                  <th className="p-3 text-center">{isRtl ? 'نسبة CTR' : 'CTR %'}</th>
                  <th className="p-3 text-center">{isRtl ? 'الإنفاق' : 'Spend'}</th>
                  <th className="p-3 text-center">{isRtl ? 'الحالة' : 'Status'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-main)]">
                {ads.map((ad: any) => (
                  <tr key={ad.id} className="hover:bg-[var(--bg-base)]/50 transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={ad.image_url}
                          alt={ad.title}
                          className="w-12 h-12 rounded object-cover border border-[var(--border-main)] shrink-0"
                        />
                        <div>
                          <div className="font-extrabold text-[var(--text-primary)] text-xs line-clamp-1">{ad.title}</div>
                          <div className="text-[10px] text-gray-400 line-clamp-1">{ad.description}</div>
                        </div>
                      </div>
                    </td>

                    <td className="p-3 text-center">
                      <div className="font-bold text-[var(--text-primary)]">{ad.category || 'عام'}</div>
                      <div className="text-[10px] text-emerald-500 font-medium">{ad.location_city || 'فلسطين'}</div>
                    </td>

                    <td className="p-3 text-center font-bold text-blue-500 font-mono">
                      {(ad.impressions_count || 0).toLocaleString()}
                    </td>

                    <td className="p-3 text-center font-bold text-purple-500 font-mono">
                      {(ad.clicks_count || 0).toLocaleString()}
                    </td>

                    <td className="p-3 text-center font-black text-emerald-500 font-mono">
                      {ad.ctr}%
                    </td>

                    <td className="p-3 text-center font-extrabold text-amber-500 font-mono">
                      ${ad.price_paid || 0}
                    </td>

                    <td className="p-3 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                        ad.status === 'approved'
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : ad.status === 'pending'
                          ? 'bg-amber-500/10 text-amber-500 animate-pulse'
                          : 'bg-red-500/10 text-red-500'
                      }`}>
                        {ad.status === 'approved' && (isRtl ? 'نشط' : 'Active')}
                        {ad.status === 'pending' && (isRtl ? 'مراجعة' : 'Pending')}
                        {ad.status === 'rejected' && (isRtl ? 'مرفوض' : 'Rejected')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

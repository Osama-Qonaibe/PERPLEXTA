import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  BarChart, 
  Bar, 
  Legend 
} from 'recharts';
import { Activity, Clock, Cpu, RefreshCw, Server, Users, Zap } from 'lucide-react';
import { toast } from 'sonner';

interface RenderMetricItem {
  id: string;
  componentName: string;
  renderCount: number;
  timeSinceMount: number;
  renderDuration: number;
  timestamp: string;
  sessionId?: string;
}

export const AdminRenderMetricsView: React.FC = () => {
  const { token, theme } = useAppContext();
  const [metrics, setMetrics] = useState<RenderMetricItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedComponent, setSelectedComponent] = useState<string>('all');
  const [selectedSession, setSelectedSession] = useState<string>('all');

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/metrics/render', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.metrics)) {
          setMetrics(data.metrics);
        }
      } else {
        toast.error('فشل جلب مقاييس الأداء وعمليات الرندر / Failed to fetch render metrics');
      }
    } catch (err: any) {
      toast.error('خطأ في الاتصال بالخادم / Connection error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 15000); // Auto-refresh every 15s
    return () => clearInterval(interval);
  }, [token]);

  const isDark = theme === 'dark';

  const componentsList = Array.from(new Set(metrics.map(m => m.componentName)));
  const sessionsList = Array.from(new Set(metrics.map(m => m.sessionId || 'unknown')));

  const filteredMetrics = metrics.filter(m => {
    if (selectedComponent !== 'all' && m.componentName !== selectedComponent) return false;
    if (selectedSession !== 'all' && (m.sessionId || 'unknown') !== selectedSession) return false;
    return true;
  });

  // Calculate stats
  const totalRenders = filteredMetrics.reduce((acc, m) => acc + m.renderCount, 0);
  const avgDuration = filteredMetrics.length > 0 
    ? Math.round(filteredMetrics.reduce((acc, m) => acc + m.renderDuration, 0) / filteredMetrics.length) 
    : 0;
  const maxDuration = filteredMetrics.length > 0 
    ? Math.max(...filteredMetrics.map(m => m.renderDuration)) 
    : 0;

  // Prepare chart data (group by timestamp or sequence)
  const chartData = filteredMetrics.slice(0, 30).reverse().map((m, idx) => ({
    name: `#${idx + 1} (${m.componentName})`,
    duration: m.renderDuration,
    timeSinceMount: m.timeSinceMount,
    renders: m.renderCount,
    timestamp: new Date(m.timestamp).toLocaleTimeString()
  }));

  // Group by component for bar chart
  const componentLatencyMap: { [key: string]: { totalDuration: number; count: number } } = {};
  filteredMetrics.forEach(m => {
    if (!componentLatencyMap[m.componentName]) {
      componentLatencyMap[m.componentName] = { totalDuration: 0, count: 0 };
    }
    componentLatencyMap[m.componentName].totalDuration += m.renderDuration;
    componentLatencyMap[m.componentName].count += 1;
  });

  const barChartData = Object.keys(componentLatencyMap).map(comp => ({
    componentName: comp,
    avgDuration: Math.round(componentLatencyMap[comp].totalDuration / componentLatencyMap[comp].count)
  }));

  return (
    <div className={`p-6 space-y-6 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4 border-gray-200 dark:border-gray-800">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="w-6 h-6 text-accent animate-pulse" />
            <span>مراقبة زمن الانتقال وأداء المكونات (Render & Latency Telemetry)</span>
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            لوحة تحكم المشرفين لمراقبة مقاييس أداء مكونات الواجهة وزمن الاستجابة عبر جلسات المستخدمين الحية
          </p>
        </div>
        <button
          onClick={fetchMetrics}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent text-white rounded-lg text-sm font-medium transition-theme shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>تحديث البيانات / Refresh</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`p-5 rounded-xl border ${isDark ? 'bg-zinc-900/60 border-gray-800' : 'bg-white border-gray-200'} shadow-sm`}>
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">إجمالي عمليات الرندر</span>
            <Cpu className="w-5 h-5 text-accent" />
          </div>
          <div className="text-3xl font-bold font-mono">{totalRenders}</div>
          <p className="text-xs text-gray-500 mt-1">عبر الفلتر المحدد</p>
        </div>

        <div className={`p-5 rounded-xl border ${isDark ? 'bg-zinc-900/60 border-gray-800' : 'bg-white border-gray-200'} shadow-sm`}>
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">متوسط زمن الاستجابة (Latency)</span>
            <Clock className="w-5 h-5 text-cyan-500" />
          </div>
          <div className="text-3xl font-bold font-mono">{avgDuration} ms</div>
          <p className="text-xs text-accent mt-1">أداء ممتاز واستجابة فورية</p>
        </div>

        <div className={`p-5 rounded-xl border ${isDark ? 'bg-zinc-900/60 border-gray-800' : 'bg-white border-gray-200'} shadow-sm`}>
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">أقصى زمن رندر مسجل</span>
            <Zap className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-3xl font-bold font-mono">{maxDuration} ms</div>
          <p className="text-xs text-gray-500 mt-1">ذروة التحميل القياسية</p>
        </div>

        <div className={`p-5 rounded-xl border ${isDark ? 'bg-zinc-900/60 border-gray-800' : 'bg-white border-gray-200'} shadow-sm`}>
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">الجلسات النشطة</span>
            <Users className="w-5 h-5 text-purple-500" />
          </div>
          <div className="text-3xl font-bold font-mono">{sessionsList.length}</div>
          <p className="text-xs text-gray-500 mt-1">جلسات مستخدمين نشطة</p>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className={`p-4 rounded-xl border flex flex-wrap items-center gap-4 ${isDark ? 'bg-zinc-900/40 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500 uppercase">المكون (Component):</span>
          <select 
            value={selectedComponent}
            onChange={(e) => setSelectedComponent(e.target.value)}
            className={`px-3 py-1.5 rounded-lg text-sm border ${isDark ? 'bg-zinc-950 border-gray-800 text-gray-200' : 'bg-white border-gray-300 text-gray-800'}`}
          >
            <option value="all">جميع المكونات (All Components)</option>
            {componentsList.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500 uppercase">معرف الجلسة (Session):</span>
          <select 
            value={selectedSession}
            onChange={(e) => setSelectedSession(e.target.value)}
            className={`px-3 py-1.5 rounded-lg text-sm border ${isDark ? 'bg-zinc-950 border-gray-800 text-gray-200' : 'bg-white border-gray-300 text-gray-800'}`}
          >
            <option value="all">جميع الجلسات (All Sessions)</option>
            {sessionsList.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Area Chart: Latency Trend */}
        <div className={`p-5 rounded-xl border ${isDark ? 'bg-zinc-900/60 border-gray-800' : 'bg-white border-gray-200'} shadow-sm`}>
          <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-accent" />
            <span>مخطط زمن استجابة الرندر (Render Latency Area Trend)</span>
          </h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#27272a' : '#e5e7eb'} />
                <XAxis dataKey="name" stroke={isDark ? '#71717a' : '#9ca3af'} fontSize={11} />
                <YAxis stroke={isDark ? '#71717a' : '#9ca3af'} fontSize={11} unit="ms" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: isDark ? '#18181b' : '#ffffff', 
                    borderColor: isDark ? '#27272a' : '#e5e7eb',
                    borderRadius: '8px',
                    color: isDark ? '#f4f4f5' : '#111827'
                  }} 
                />
                <Area type="monotone" dataKey="duration" name="مدة الرندر (ms)" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Chart: Average Latency per Component */}
        <div className={`p-5 rounded-xl border ${isDark ? 'bg-zinc-900/60 border-gray-800' : 'bg-white border-gray-200'} shadow-sm`}>
          <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
            <Server className="w-4 h-4 text-cyan-500" />
            <span>متوسط زمن الرندر حسب المكون (Avg Latency per Component)</span>
          </h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#27272a' : '#e5e7eb'} />
                <XAxis dataKey="componentName" stroke={isDark ? '#71717a' : '#9ca3af'} fontSize={10} angle={-15} textAnchor="end" />
                <YAxis stroke={isDark ? '#71717a' : '#9ca3af'} fontSize={11} unit="ms" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: isDark ? '#18181b' : '#ffffff', 
                    borderColor: isDark ? '#27272a' : '#e5e7eb',
                    borderRadius: '8px',
                    color: isDark ? '#f4f4f5' : '#111827'
                  }} 
                />
                <Bar dataKey="avgDuration" name="متوسط المدة (ms)" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Detailed Telemetry Table */}
      <div className={`rounded-xl border overflow-hidden ${isDark ? 'bg-zinc-900/60 border-gray-800' : 'bg-white border-gray-200'} shadow-sm`}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 font-semibold flex items-center justify-between">
          <span>سجل القياسات الحية المفصلة (Detailed Telemetry Log)</span>
          <span className="text-xs font-normal text-gray-500">عرض أحدث {filteredMetrics.length} عملية</span>
        </div>
        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={`border-b text-xs font-semibold uppercase tracking-wider ${isDark ? 'bg-zinc-950/50 border-gray-800 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                <th className="p-3">اسم المكون</th>
                <th className="p-3">عدد الرندرات</th>
                <th className="p-3">مدة الرندر</th>
                <th className="p-3">منذ بدء التشغيل</th>
                <th className="p-3">معرف الجلسة</th>
                <th className="p-3">الوقت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800 text-sm font-mono">
              {filteredMetrics.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    لا توجد مقاييس مسجلة حالياً
                  </td>
                </tr>
              ) : (
                filteredMetrics.map((m) => (
                  <tr key={m.id} className={`hover:${isDark ? 'bg-zinc-800/40' : 'bg-gray-50/80'} transition-colors`}>
                    <td className="p-3 font-semibold text-accent font-sans">{m.componentName}</td>
                    <td className="p-3">{m.renderCount}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-xs ${m.renderDuration > 30 ? 'bg-amber-500/10 text-amber-500' : 'bg-accent/10 text-accent'}`}>
                        {m.renderDuration} ms
                      </span>
                    </td>
                    <td className="p-3 text-gray-500">{m.timeSinceMount} ms</td>
                    <td className="p-3 text-xs text-gray-400">{m.sessionId || 'N/A'}</td>
                    <td className="p-3 text-xs text-gray-500">{new Date(m.timestamp).toLocaleTimeString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from "react";
import { useAppContext } from "../context/AppContext";
import { motion, AnimatePresence } from "motion/react";
import {
  ShieldAlert,
  Activity,
  Globe,
  Clock,
  RefreshCw,
  AlertTriangle,
  Search,
  Filter,
  SlidersHorizontal,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";

const COLORS = ["#10b881", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export const AdminRateLimitMetricsView = ({
  theme,
  t,
}: {
  theme: string;
  t: (key: string, replacements?: any) => string;
}) => {
  const { token, language } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [threshold, setThreshold] = useState(5);
  const [data, setData] = useState<{
    byType: { type: string; count: string }[];
    trend: { hour: string; count: string }[];
    topIps: { ip_address: string; count: string }[];
    hotIps: { ip_address: string; count: string }[];
    recent: any[];
  } | null>(null);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/rate-limit-metrics", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setData(await res.json());
      }
    } catch (error) {
      console.error("Failed to fetch rate limit metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchMetrics();
  }, [token]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <RefreshCw size={40} className="text-emerald-500 animate-spin" />
        <p className="text-[var(--text-secondary)] font-medium">
          {language === "ar" ? "جاري تحميل مقاييس الحماية..." : "Loading Security Metrics..."}
        </p>
      </div>
    );
  }

  const totalBlocks = data?.byType.reduce((acc, curr) => acc + parseInt(curr.count, 10), 0) || 0;
  const criticalThreats = data?.hotIps.filter(ip => parseInt(ip.count, 10) >= threshold) || [];

  return (
    <div className="space-y-6">
      {/* Critical Alerts Bar */}
      <AnimatePresence>
        {criticalThreats.length > 0 && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-red-500/10 border-2 border-red-500/30 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center text-white shadow-[0_0_20px_rgba(239,68,68,0.5)]">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-red-500 uppercase tracking-tighter">
                    {language === "ar" ? "تنبيه: تهديدات نشطة مكتشفة" : "CRITICAL: ACTIVE THREATS DETECTED"}
                  </h4>
                  <p className="text-[10px] text-red-500/70 font-bold">
                    {language === "ar" 
                      ? `${criticalThreats.length} عنوان IP تجاوزوا حد العتبة (${threshold}) في آخر 5 دقائق`
                      : `${criticalThreats.length} IPs exceeded threshold (${threshold}) in the last 5 minutes`}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {criticalThreats.map((ip, i) => (
                  <span key={i} className="px-3 py-1 rounded-lg bg-red-500 text-white text-[10px] font-black shadow-lg shadow-red-500/20">
                    {ip.ip_address} ({ip.count})
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Threshold Controller & Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-1 p-5 rounded-lg border border-[var(--border-main)] bg-[var(--bg-secondary)] shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-md bg-amber-500/10 text-amber-500">
              <SlidersHorizontal size={20} />
            </div>
            <span className="text-sm font-black text-[var(--text-secondary)]">
              {language === "ar" ? "عتبة التنبيه" : "Alert Threshold"}
            </span>
          </div>
          <div className="space-y-2">
            <input 
              type="range" 
              min="1" 
              max="50" 
              value={threshold} 
              onChange={(e) => setThreshold(parseInt(e.target.value))}
              className="w-full h-1.5 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-red-500"
            />
            <div className="flex justify-between text-[10px] font-bold text-[var(--text-muted)]">
              <span>1</span>
              <span className="text-red-500">{threshold} {language === "ar" ? "محاولات/د" : "blocks/5m"}</span>
              <span>50</span>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-lg border border-[var(--border-main)] bg-[var(--bg-secondary)] shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-md bg-emerald-500/10 text-emerald-500">
              <ShieldAlert size={20} />
            </div>
            <span className="text-sm font-medium text-[var(--text-secondary)]">
              {language === "ar" ? "إجمالي التهديدات المحجوبة" : "Total Blocked Threats"}
            </span>
          </div>
          <p className="text-2xl font-bold">{totalBlocks.toLocaleString()}</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            {language === "ar" ? "آخر 30 يوماً" : "Last 30 days"}
          </p>
        </div>

        <div className="p-5 rounded-lg border border-[var(--border-main)] bg-[var(--bg-secondary)] shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-md bg-blue-500/10 text-blue-500">
              <Globe size={20} />
            </div>
            <span className="text-sm font-medium text-[var(--text-secondary)]">
              {language === "ar" ? "عناوين IP الفريدة المحجوبة" : "Unique IPs Blocked"}
            </span>
          </div>
          <p className="text-2xl font-bold">{data?.topIps.length || 0}</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            {language === "ar" ? "أعلى 10 عناوين مشبوهة" : "Top 10 suspicious IPs"}
          </p>
        </div>

        <div className="p-5 rounded-lg border border-[var(--border-main)] bg-[var(--bg-secondary)] shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-md bg-amber-500/10 text-amber-500">
              <Activity size={20} />
            </div>
            <span className="text-sm font-medium text-[var(--text-secondary)]">
              {language === "ar" ? "أكثر نوع هجوم شيوعاً" : "Most Common Attack Type"}
            </span>
          </div>
          <p className="text-2xl font-bold capitalize">
            {data?.byType[0]?.type?.replace(/_/g, " ") || "N/A"}
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            {language === "ar" ? "بناءً على تكرار الحجب" : "Based on block frequency"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Chart */}
        <div className="p-6 rounded-lg border border-[var(--border-main)] bg-[var(--bg-secondary)] shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Clock className="text-emerald-500" size={20} />
              <h2 className="text-lg font-bold">
                {language === "ar" ? "اتجاه الحجب (24 ساعة)" : "Block Trend (Last 24h)"}
              </h2>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.trend}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme === "dark" ? "#2a2a2c" : "#e5e7eb"} />
                <XAxis 
                  dataKey="hour" 
                  tick={{ fontSize: 10 }} 
                  stroke={theme === "dark" ? "#9ca3af" : "#4b5563"}
                  tickFormatter={(val) => val.split(" ")[1]}
                />
                <YAxis stroke={theme === "dark" ? "#9ca3af" : "#4b5563"} tick={{ fontSize: 10 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: theme === "dark" ? "#1a1a1c" : "#ffffff",
                    borderColor: theme === "dark" ? "#2a2a2c" : "#e5e7eb",
                    borderRadius: "8px"
                  }}
                />
                <Line type="monotone" dataKey="count" stroke="#10b881" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Blocks by Type */}
        <div className="p-6 rounded-lg border border-[var(--border-main)] bg-[var(--bg-secondary)] shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <ShieldAlert className="text-emerald-500" size={20} />
              <h2 className="text-lg font-bold">
                {language === "ar" ? "توزيع أنواع الحجب" : "Blocks by Category"}
              </h2>
            </div>
          </div>
          <div className="h-[300px] w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data?.byType}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="count"
                  nameKey="type"
                >
                  {data?.byType.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                   contentStyle={{ 
                    backgroundColor: theme === "dark" ? "#1a1a1c" : "#ffffff",
                    borderColor: theme === "dark" ? "#2a2a2c" : "#e5e7eb",
                    borderRadius: "8px"
                  }}
                />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top IPs */}
        <div className="lg:col-span-1 p-6 rounded-lg border border-[var(--border-main)] bg-[var(--bg-secondary)] shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <Filter className="text-emerald-500" size={20} />
            <h2 className="text-lg font-bold">
              {language === "ar" ? "أعلى العناوين المحجوبة" : "Top Blocked IPs"}
            </h2>
          </div>
          <div className="space-y-4">
            {data?.topIps.map((ip, idx) => {
              const isHot = data.hotIps.some(h => h.ip_address === ip.ip_address && parseInt(h.count, 10) >= threshold);
              return (
                <div 
                  key={idx} 
                  className={`flex items-center justify-between p-3 rounded-md bg-[var(--bg-primary)] border transition-all duration-500 ${
                    isHot ? "border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)] animate-pulse" : "border-[var(--border-main)]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {isHot && <AlertTriangle size={14} className="text-red-500" />}
                    <span className={`text-xs font-mono font-bold ${isHot ? "text-red-500" : "text-[var(--text-secondary)]"}`}>
                      {ip.ip_address}
                    </span>
                  </div>
                  <span className={`text-xs font-black px-2 py-1 rounded-full ${isHot ? "bg-red-500 text-white" : "text-red-500 bg-red-500/10"}`}>
                    {ip.count} {language === "ar" ? "حظر" : "blocks"}
                  </span>
                </div>
              );
            })}
            {(!data?.topIps || data.topIps.length === 0) && (
              <div className="text-center py-10 text-[var(--text-muted)] text-sm italic">
                {language === "ar" ? "لا توجد بيانات متاحة" : "No threat data recorded"}
              </div>
            )}
          </div>
        </div>

        {/* Recent Blocks Table */}
        <div className="lg:col-span-2 p-6 rounded-lg border border-[var(--border-main)] bg-[var(--bg-secondary)] shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Activity className="text-emerald-500" size={20} />
              <h2 className="text-lg font-bold">
                {language === "ar" ? "آخر عمليات الحجب المباشرة" : "Recent Live Blocks"}
              </h2>
            </div>
            <button 
              onClick={fetchMetrics}
              className="p-2 rounded-md hover:bg-[var(--bg-primary)] text-emerald-500 transition-all duration-300 active:scale-95"
            >
              <RefreshCw size={18} />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest border-b border-[var(--border-main)]">
                  <th className="pb-3 px-2">{language === "ar" ? "الوقت" : "Time"}</th>
                  <th className="pb-3 px-2">{language === "ar" ? "العنوان" : "IP Address"}</th>
                  <th className="pb-3 px-2">{language === "ar" ? "النوع" : "Type"}</th>
                  <th className="pb-3 px-2">{language === "ar" ? "التفاصيل" : "Details"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-main)]">
                {data?.recent.map((block, idx) => (
                  <tr key={idx} className="group hover:bg-[var(--bg-primary)]/50 transition-theme">
                    <td className="py-3 px-2 text-[10px] text-[var(--text-muted)]">
                      {new Date(block.created_at).toLocaleTimeString()}
                    </td>
                    <td className="py-3 px-2 text-xs font-mono font-bold text-[var(--text-secondary)]">
                      {block.ip_address}
                    </td>
                    <td className="py-3 px-2">
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500">
                        {block.limit_type}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-xs text-[var(--text-muted)] truncate max-w-[200px]">
                      {block.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(!data?.recent || data.recent.length === 0) && (
              <div className="flex flex-col items-center justify-center py-20 text-[var(--text-muted)]">
                <AlertTriangle size={32} className="mb-2 opacity-20" />
                <p className="text-sm italic">
                  {language === "ar" ? "النظام يعمل بشكل طبيعي، لا توجد تهديدات حديثة." : "System is clear. No recent threats detected."}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

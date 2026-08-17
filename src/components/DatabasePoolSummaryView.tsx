import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Database,
  Landmark,
  Globe,
  Shield,
  Activity,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Zap,
  Clock,
  Layers,
  Server,
  ArrowUpRight,
  ShieldAlert,
  Radio,
  Check,
  RotateCcw
} from "lucide-react";

export interface PoolHealthMetric {
  id: 'core' | 'ledger' | 'external' | 'security';
  name: string;
  role: string;
  status: 'connected' | 'disconnected';
  latencyMs: number;
  error?: string | null;
  active: number;
  idle: number;
  waiting: number;
  total: number;
  max: number;
  utilization: number;
  allocation: number;
  saturated: boolean;
  connection_leak_risk: boolean;
  available: boolean;
  alertLevel: 'optimal' | 'warning' | 'critical';
  alertMessage: string;
  alertMessageAr?: string;
  schemaVersion?: string;
  migrationCount?: number;
}

export interface ClusterSummary {
  totalActive: number;
  totalIdle: number;
  totalWaiting: number;
  totalAllocated: number;
  totalMaxLimit: number;
  clusterUtilization: number;
  avgLatencyMs: number;
  connectedCount: number;
  totalPools: number;
  warningCount: number;
  criticalCount: number;
  overallClusterStatus: 'optimal' | 'warning' | 'critical';
  timestamp: string;
}

interface DatabasePoolSummaryViewProps {
  token: string | null;
  language: string;
  dir: string;
  theme: string;
  onRefreshRegistry?: () => void;
  showToast?: (message: string, type: "success" | "error") => void;
}

export const DatabasePoolSummaryView: React.FC<DatabasePoolSummaryViewProps> = ({
  token,
  language,
  dir,
  theme,
  onRefreshRegistry,
  showToast
}) => {
  const [healthData, setHealthData] = useState<{
    pools: PoolHealthMetric[];
    summary: ClusterSummary;
  } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [reconnectingPool, setReconnectingPool] = useState<string | null>(null);
  const [isGlobalResetting, setIsGlobalResetting] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const isAr = language === 'ar';

  const fetchHealthMetrics = useCallback(async (isManual = false) => {
    if (!token) return;
    if (isManual) setIsRefreshing(true);
    try {
      const res = await fetch("/api/admin/databases/health", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setHealthData(data);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error("[DatabasePoolSummary] Failed to fetch health metrics:", err);
    } finally {
      setLoading(false);
      if (isManual) {
        setTimeout(() => setIsRefreshing(false), 500);
      }
    }
  }, [token]);

  useEffect(() => {
    fetchHealthMetrics();
  }, [fetchHealthMetrics]);

  useEffect(() => {
    if (autoRefresh && token) {
      intervalRef.current = setInterval(() => {
        fetchHealthMetrics(false);
      }, 5000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefresh, token, fetchHealthMetrics]);

  const handleReconnectPool = async (poolId: string, poolName: string) => {
    if (!token) return;
    setReconnectingPool(poolId);
    try {
      const res = await fetch("/api/admin/reconnect-pool", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ poolName: poolId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (showToast) {
          showToast(
            isAr
              ? `تم إعادة تهيئة واستعادة مجمع (${poolName}) بنجاح`
              : `Pool '${poolName}' reconnected & flushed successfully!`,
            "success"
          );
        }
        await fetchHealthMetrics(true);
        if (onRefreshRegistry) onRefreshRegistry();
      } else {
        throw new Error(data.error || "Reconnection failed");
      }
    } catch (err: any) {
      if (showToast) {
        showToast(
          isAr
            ? `فشل إعادة تهيئة المجمع: ${err.message || 'خطأ غير معروف'}`
            : `Failed to reconnect pool: ${err.message || 'Unknown error'}`,
          "error"
        );
      }
    } finally {
      setReconnectingPool(null);
    }
  };

  const handleGlobalPoolReset = async () => {
    if (!token) return;
    if (!window.confirm(isAr ? "هل أنت متأكد من رغبتك في إعادة تعيين وإعادة تهيئة جميع مجمعات الاتصال الأربعة؟" : "Are you sure you want to gracefully reset and reconnect all four database connection pools?")) {
      return;
    }
    setIsGlobalResetting(true);
    try {
      const res = await fetch("/api/admin/databases/reset-all", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (showToast) {
          showToast(
            isAr
              ? "تمت إعادة تعيين وتهيئة جميع مجمعات الاتصال بنجاح!"
              : "All four database pools successfully reset and reconnected!",
            "success"
          );
        }
        await fetchHealthMetrics(true);
        if (onRefreshRegistry) onRefreshRegistry();
      } else {
        throw new Error(data.error || "Global pool reset failed");
      }
    } catch (err: any) {
      if (showToast) {
        showToast(
          isAr
            ? `فشل إعادة التعيين الشامل: ${err.message || 'خطأ غير معروف'}`
            : `Failed global pool reset: ${err.message || 'Unknown error'}`,
          "error"
        );
      }
    } finally {
      setIsGlobalResetting(false);
    }
  };

  const getPoolIcon = (id: string) => {
    switch (id) {
      case 'core':
        return Database;
      case 'ledger':
        return Landmark;
      case 'external':
        return Globe;
      case 'security':
        return Shield;
      default:
        return Database;
    }
  };

  const getPoolArabicTitle = (id: string) => {
    switch (id) {
      case 'core':
        return 'قاعدة البيانات الرئيسية';
      case 'ledger':
        return 'خزينة الحسابات والمعاملات';
      case 'external':
        return 'لوحة تحكم الأقسام والمحتوى';
      case 'security':
        return 'منظومة الحماية والتدقيق';
      default:
        return id;
    }
  };

  const getPoolArabicRole = (id: string) => {
    switch (id) {
      case 'core':
        return 'المحرك التشغيلي والرسائل';
      case 'ledger':
        return 'المعاملات المالية والمحافظ';
      case 'external':
        return 'المقالات والتكاملات الخارجية';
      case 'security':
        return 'سجلات التدقيق والجدار الناري';
      default:
        return '';
    }
  };

  if (loading && !healthData) {
    return (
      <div className="p-6 rounded-xl border border-[var(--border-main)] bg-[var(--surface-card)] animate-pulse mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 w-56 bg-gray-200 dark:bg-gray-800 rounded-md" />
          <div className="h-6 w-24 bg-gray-200 dark:bg-gray-800 rounded-full" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-gray-200 dark:bg-gray-800 rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-44 bg-gray-200 dark:bg-gray-800 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const summary = healthData?.summary || {
    totalActive: 0,
    totalIdle: 0,
    totalWaiting: 0,
    totalAllocated: 0,
    totalMaxLimit: 0,
    clusterUtilization: 0,
    avgLatencyMs: 0,
    connectedCount: 4,
    totalPools: 4,
    warningCount: 0,
    criticalCount: 0,
    overallClusterStatus: 'optimal',
    timestamp: new Date().toISOString()
  };

  const pools = healthData?.pools || [];
  const hasCritical = summary.criticalCount > 0;
  const hasWarning = summary.warningCount > 0;

  // Filter pools that are approaching limit or in critical state for prominent alerting
  const alertedPools = pools.filter(p => p.alertLevel !== 'optimal');

  return (
    <div className="mb-6 space-y-4">
      {/* --- Main Aggregated Header & Cluster Health Panel --- */}
      <div className={`p-5 md:p-6 rounded-xl border transition-theme relative overflow-hidden bg-[var(--surface-card)] ${
        hasCritical
          ? 'border-rose-500/40 shadow-[0_0_25px_rgba(244,63,94,0.12)]'
          : hasWarning
          ? 'border-amber-500/40 shadow-[0_0_25px_rgba(245,158,11,0.1)]'
          : 'border-[var(--border-main)] hover:border-accent/30'
      }`}>
        {/* Top Status & Controls Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[var(--border-main)]">
          <div className="flex items-center gap-3.5">
            <div className={`p-3 rounded-xl border flex items-center justify-center transition-theme ${
              hasCritical
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-500'
                : hasWarning
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
            }`}>
              <Layers size={24} className={hasCritical ? 'animate-bounce' : hasWarning ? 'animate-pulse' : ''} />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-lg font-black text-[var(--text-primary)] tracking-tight">
                  {isAr ? "مصفوفة مجمعات الاتصال الرباعية" : "Quad-Pool Connection Matrix"}
                </h2>
                {/* Status Badge */}
                {hasCritical ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/15 text-rose-500 border border-rose-500/30 animate-pulse">
                    <AlertTriangle size={13} />
                    {isAr ? `تنبيه حرج (${summary.criticalCount})` : `Critical Alert (${summary.criticalCount})`}
                  </span>
                ) : hasWarning ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30">
                    <AlertCircle size={13} />
                    {isAr ? `اقتراب من السعة (${summary.warningCount})` : `Approaching Limit (${summary.warningCount})`}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                    <CheckCircle2 size={13} />
                    {isAr ? "جميع المجمعات بحالة مثالية" : "All 4 Pools Healthy"}
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-1 font-medium">
                {isAr
                  ? "مراقبة حية فورية ومباشرة لسعة واتصالات قواعد البيانات الأربعة مع فحص تشبع المجمعات"
                  : "Real-time health aggregation & saturation monitor across all four isolated database pools"}
              </p>
            </div>
          </div>

          {/* Quick Refresh & Auto-Sync Controls */}
          <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
            <button
              onClick={handleGlobalPoolReset}
              disabled={isGlobalResetting}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-rose-500/10 border border-rose-500/30 text-rose-500 hover:bg-rose-500/20 transition-theme flex items-center gap-1.5 disabled:opacity-50"
              title={isAr ? "إعادة تعيين وإعادة تهيئة جميع مجمعات الاتصال الأربعة فوراً دون إعادة تشغيل الخادم" : "Gracefully reset & reconnect all 4 database pools"}
            >
              <RotateCcw size={13} className={isGlobalResetting ? 'animate-spin' : ''} />
              <span>{isAr ? "إعادة تعيين شاملة" : "Global Pool Reset"}</span>
            </button>

            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-theme flex items-center gap-1.5 ${
                autoRefresh
                  ? 'bg-accent/10 border-accent/30 text-accent'
                  : 'bg-[var(--surface-subtle)] border-[var(--border-main)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
              title={isAr ? "تفعيل/تعطيل التحديث التلقائي كل 5 ثوانٍ" : "Toggle 5s live polling"}
            >
              <Radio size={13} className={autoRefresh ? 'text-accent animate-pulse' : ''} />
              {isAr ? (autoRefresh ? "مباشر (5 ث)" : "إيقاف مؤقت") : (autoRefresh ? "Live (5s)" : "Paused")}
            </button>

            <button
              onClick={() => fetchHealthMetrics(true)}
              disabled={isRefreshing}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[var(--surface-subtle)] border border-[var(--border-main)] text-[var(--text-primary)] hover:border-accent/40 hover:bg-accent/5 transition-theme flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw size={13} className={isRefreshing ? 'animate-spin text-accent' : ''} />
              <span>{isAr ? "تحديث الآن" : "Refresh"}</span>
            </button>

            {lastUpdated && (
              <span className="text-[10px] text-[var(--text-muted)] font-mono hidden md:inline-block">
                {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>

        {/* Aggregate KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mt-5">
          {/* 1. Cluster Active Utilization */}
          <div className="p-3.5 rounded-lg border border-[var(--border-main)] bg-[var(--surface-subtle)] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--text-secondary)]">
                {isAr ? "الاتصالات النشطة (الكل)" : "Cluster Active Conns"}
              </span>
              <Activity size={15} className="text-accent" />
            </div>
            <div className="mt-2.5 flex items-baseline justify-between">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-[var(--text-primary)] font-mono">
                  {summary.totalActive}
                </span>
                <span className="text-xs text-[var(--text-muted)] font-medium">
                  / {summary.totalMaxLimit} {isAr ? "أقصى سعة" : "max"}
                </span>
              </div>
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                summary.clusterUtilization >= 90
                  ? 'bg-rose-500/15 text-rose-500'
                  : summary.clusterUtilization >= 70
                  ? 'bg-amber-500/15 text-amber-500'
                  : 'bg-emerald-500/15 text-emerald-500'
              }`}>
                {summary.clusterUtilization}%
              </span>
            </div>
            {/* Mini Progress Bar */}
            <div className="w-full bg-[var(--surface-inset)] h-1.5 rounded-full mt-2.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  summary.clusterUtilization >= 90
                    ? 'bg-rose-500'
                    : summary.clusterUtilization >= 70
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(3, summary.clusterUtilization))}%` }}
              />
            </div>
          </div>

          {/* 2. Standby / Idle Available */}
          <div className="p-3.5 rounded-lg border border-[var(--border-main)] bg-[var(--surface-subtle)] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--text-secondary)]">
                {isAr ? "الاتصالات الجاهزة (Idle)" : "Standby Idle Conns"}
              </span>
              <Server size={15} className="text-blue-500" />
            </div>
            <div className="mt-2.5 flex items-baseline justify-between">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-blue-500 font-mono">
                  {summary.totalIdle}
                </span>
                <span className="text-xs text-[var(--text-muted)] font-medium">
                  {isAr ? "مفتوحة للاستجابة" : "ready in pool"}
                </span>
              </div>
              <span className="text-xs font-semibold text-[var(--text-secondary)]">
                {summary.totalAllocated} {isAr ? "مخصصة" : "allocated"}
              </span>
            </div>
            <div className="text-[11px] text-[var(--text-muted)] mt-2 flex items-center gap-1 font-medium">
              <Zap size={11} className="text-blue-400" />
              {isAr ? "استجابة فورية 0.001 ث" : "Zero-handshake ready"}
            </div>
          </div>

          {/* 3. Queue / Waiting Backlog */}
          <div className={`p-3.5 rounded-lg border flex flex-col justify-between transition-theme ${
            summary.totalWaiting > 0
              ? 'border-amber-500/40 bg-amber-500/5'
              : 'border-[var(--border-main)] bg-[var(--surface-subtle)]'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--text-secondary)]">
                {isAr ? "طابور الانتظار (Queue)" : "Waiting Queries"}
              </span>
              <Clock size={15} className={summary.totalWaiting > 0 ? 'text-amber-500 animate-pulse' : 'text-emerald-500'} />
            </div>
            <div className="mt-2.5 flex items-baseline justify-between">
              <div className="flex items-baseline gap-1.5">
                <span className={`text-2xl font-black font-mono ${
                  summary.totalWaiting > 0 ? 'text-amber-500' : 'text-emerald-500'
                }`}>
                  {summary.totalWaiting}
                </span>
                <span className="text-xs text-[var(--text-muted)] font-medium">
                  {isAr ? "استعلامات معلقة" : "queries queued"}
                </span>
              </div>
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                summary.totalWaiting > 0
                  ? 'bg-amber-500/20 text-amber-500'
                  : 'bg-emerald-500/15 text-emerald-500'
              }`}>
                {summary.totalWaiting > 0 ? (isAr ? "ضغط انتظار" : "Backlog") : (isAr ? "لا انتظار" : "0ms Queue")}
              </span>
            </div>
            <div className="text-[11px] text-[var(--text-muted)] mt-2 font-medium">
              {summary.totalWaiting > 0
                ? (isAr ? "⚠️ استعلامات تنتظر مجمع شاغر" : "⚠️ Queries waiting for free connection")
                : (isAr ? "كل المجمعات تستجيب فورياً" : "Instant query dispatch")}
            </div>
          </div>

          {/* 4. Average Ping Latency */}
          <div className="p-3.5 rounded-lg border border-[var(--border-main)] bg-[var(--surface-subtle)] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--text-secondary)]">
                {isAr ? "متوسط زمن الاستجابة" : "Avg Ping Latency"}
              </span>
              <Zap size={15} className="text-accent" />
            </div>
            <div className="mt-2.5 flex items-baseline justify-between">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-[var(--text-primary)] font-mono">
                  {summary.avgLatencyMs}
                </span>
                <span className="text-xs text-[var(--text-muted)] font-bold">ms</span>
              </div>
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                summary.avgLatencyMs <= 5
                  ? 'bg-emerald-500/15 text-emerald-500'
                  : summary.avgLatencyMs <= 20
                  ? 'bg-amber-500/15 text-amber-500'
                  : 'bg-rose-500/15 text-rose-500'
              }`}>
                {summary.avgLatencyMs <= 5 ? (isAr ? "فائق السرعة" : "Ultra Fast") : summary.avgLatencyMs <= 20 ? (isAr ? "طبيعي" : "Normal") : (isAr ? "مرتفع" : "High")}
              </span>
            </div>
            <div className="text-[11px] text-[var(--text-muted)] mt-2 flex items-center justify-between font-medium">
              <span>{summary.connectedCount} / {summary.totalPools} {isAr ? "مجمعات متصلة" : "Pools Online"}</span>
              <span className="text-emerald-500 font-mono text-[10px]">100% ACID</span>
            </div>
          </div>
        </div>
      </div>

      {/* --- Color-Coded Capacity & Saturation Alert Banners --- */}
      <AnimatePresence>
        {alertedPools.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-2.5"
          >
            {alertedPools.map((p) => {
              const isCrit = p.alertLevel === 'critical';
              const Icon = getPoolIcon(p.id);
              const poolArName = getPoolArabicTitle(p.id);

              return (
                <div
                  key={p.id}
                  className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 transition-theme ${
                    isCrit
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-500 shadow-sm'
                      : 'bg-amber-500/10 border-amber-500/30 text-amber-500 shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isCrit ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'}`}>
                      {isCrit ? <AlertTriangle size={18} /> : <AlertCircle size={18} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-[var(--text-primary)]">
                          {isAr ? poolArName : p.name}
                        </span>
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                          isCrit
                            ? 'bg-rose-500/20 border-rose-500/40 text-rose-500'
                            : 'bg-amber-500/20 border-amber-500/40 text-amber-500'
                        }`}>
                          {isCrit ? (isAr ? "تحذير حرج: تشبع المجمع" : "CRITICAL CAPACITY") : (isAr ? "اقتراب من الحد الأقصى" : "APPROACHING MAX LIMIT")}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5 font-medium">
                        {isAr ? (p.alertMessageAr || p.alertMessage) : p.alertMessage} • {isAr ? `المستخدم: ${p.active} من ${p.max} (${p.utilization}%)` : `Usage: ${p.active}/${p.max} (${p.utilization}%)`}
                        {p.waiting > 0 && ` • ${p.waiting} ${isAr ? 'استعلامات بالانتظار' : 'waiting in queue'}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => handleReconnectPool(p.id, isAr ? poolArName : p.name)}
                      disabled={reconnectingPool === p.id}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-theme border shadow-xs disabled:opacity-50 ${
                        isCrit
                          ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-500'
                          : 'bg-amber-600 hover:bg-amber-700 text-white border-amber-500'
                      }`}
                    >
                      <RotateCcw size={13} className={reconnectingPool === p.id ? 'animate-spin' : ''} />
                      <span>{isAr ? "تفريغ وإعادة تشغيل المجمع" : "Flush & Reconnect"}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- 4-Pool Detailed Status Matrix (Bento 4-Column Grid) --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {pools.map((p) => {
          const Icon = getPoolIcon(p.id);
          const isConnected = p.status === 'connected';
          const isCrit = p.alertLevel === 'critical';
          const isWarn = p.alertLevel === 'warning';
          const poolArName = getPoolArabicTitle(p.id);
          const poolArRole = getPoolArabicRole(p.id);
          const remainingSlots = Math.max(0, p.max - p.active);

          return (
            <div
              key={p.id}
              className={`p-4 rounded-xl border flex flex-col justify-between transition-theme bg-[var(--surface-card)] relative overflow-hidden ${
                isCrit
                  ? 'border-rose-500/40 shadow-sm'
                  : isWarn
                  ? 'border-amber-500/40 shadow-sm'
                  : 'border-[var(--border-main)] hover:border-accent/30'
              }`}
            >
              {/* Top Accent Strip */}
              <div className={`absolute top-0 inset-x-0 h-1 ${
                isCrit
                  ? 'bg-rose-500'
                  : isWarn
                  ? 'bg-amber-500'
                  : p.id === 'ledger'
                  ? 'bg-amber-500'
                  : p.id === 'external'
                  ? 'bg-accent'
                  : p.id === 'security'
                  ? 'bg-rose-500'
                  : 'bg-blue-500'
              }`} />

              <div>
                {/* Pool Header */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2 rounded-lg border transition-theme ${
                      p.id === 'ledger'
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                        : p.id === 'external'
                        ? 'bg-accent/10 border-accent/30 text-accent'
                        : p.id === 'security'
                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-500'
                        : 'bg-blue-500/10 border-blue-500/30 text-blue-500'
                    }`}>
                      <Icon size={18} />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-[var(--text-primary)] leading-tight">
                        {isAr ? poolArName : p.name}
                      </h3>
                      <span className="text-[10px] text-[var(--text-muted)] font-medium">
                        {isAr ? poolArRole : p.role}
                      </span>
                    </div>
                  </div>

                  {/* Status Indicator */}
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0 ${
                    isConnected
                      ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                  }`}>
                    {isConnected ? (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>{p.latencyMs}ms</span>
                      </>
                    ) : (
                      <>
                        <XCircle size={11} />
                        <span>{isAr ? "مقطوع" : "Offline"}</span>
                      </>
                    )}
                  </span>
                </div>

                {/* Schema Version Badge */}
                {p.schemaVersion && (
                  <div className="mb-3 flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-main)]">
                    <span className="text-[10px] text-[var(--text-secondary)] font-medium">
                      {isAr ? "إصدار الهيكل:" : "Schema Version:"}
                    </span>
                    <span className="text-[11px] font-mono font-bold text-accent px-2 py-0.5 rounded bg-accent/15 border border-accent/30" title={isAr ? `عدد الترحيلات المطبقة: ${p.migrationCount || 0}` : `${p.migrationCount || 0} migrations applied`}>
                      {p.schemaVersion}
                    </span>
                  </div>
                )}

                {/* Pool Capacity Progress Bar */}
                <div className="my-3 p-2.5 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-main)]">
                  <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
                    <span className="text-[var(--text-secondary)] text-[11px]">
                      {isAr ? "سعة الاتصال الفعلي" : "Active Pool Capacity"}
                    </span>
                    <span className={`font-mono font-bold text-xs ${
                      isCrit ? 'text-rose-500' : isWarn ? 'text-amber-500' : 'text-[var(--text-primary)]'
                    }`}>
                      {p.active} / {p.max} <span className="text-[10px] text-[var(--text-muted)] font-sans">({p.utilization}%)</span>
                    </span>
                  </div>

                  {/* Capacity Bar */}
                  <div className="w-full bg-[var(--surface-inset)] h-2 rounded-full overflow-hidden flex">
                    <div
                      className={`h-full transition-all duration-300 ${
                        isCrit
                          ? 'bg-rose-500'
                          : isWarn
                          ? 'bg-amber-500'
                          : p.utilization >= 50
                          ? 'bg-accent'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(4, p.utilization))}%` }}
                      title={`Active: ${p.active}`}
                    />
                    {p.idle > 0 && (
                      <div
                        className="h-full bg-blue-400/40"
                        style={{ width: `${Math.min(100 - p.utilization, (p.idle / p.max) * 100)}%` }}
                        title={`Idle: ${p.idle}`}
                      />
                    )}
                  </div>

                  {/* Capacity Warning Note */}
                  <div className="flex items-center justify-between mt-2 text-[10px] text-[var(--text-muted)] font-medium">
                    <span>
                      {remainingSlots === 0
                        ? (isAr ? "⚠️ لا يوجد شواغر متبقية" : "⚠️ 0 slots remaining")
                        : (isAr ? `متبقي ${remainingSlots} اتصال شاغر` : `${remainingSlots} slots free`)}
                    </span>
                    {p.waiting > 0 ? (
                      <span className="text-amber-500 font-bold">
                        {p.waiting} {isAr ? "انتظار" : "queued"}
                      </span>
                    ) : (
                      <span className="text-emerald-500 font-bold">
                        {isAr ? "0 انتظار" : "0 queue"}
                      </span>
                    )}
                  </div>
                </div>

                {/* Sub-Metrics Quad Chips */}
                <div className="grid grid-cols-3 gap-1.5 mb-3 text-center">
                  <div className="p-1.5 rounded bg-[var(--surface-subtle)] border border-[var(--border-main)]">
                    <div className="text-[9px] text-[var(--text-muted)] uppercase font-black">{isAr ? "نشط" : "Active"}</div>
                    <div className="text-xs font-black font-mono text-[var(--text-primary)] mt-0.5">{p.active}</div>
                  </div>
                  <div className="p-1.5 rounded bg-[var(--surface-subtle)] border border-[var(--border-main)]">
                    <div className="text-[9px] text-[var(--text-muted)] uppercase font-black">{isAr ? "جاهز" : "Idle"}</div>
                    <div className="text-xs font-black font-mono text-blue-500 mt-0.5">{p.idle}</div>
                  </div>
                  <div className="p-1.5 rounded bg-[var(--surface-subtle)] border border-[var(--border-main)]">
                    <div className="text-[9px] text-[var(--text-muted)] uppercase font-black">{isAr ? "الحد" : "Limit"}</div>
                    <div className="text-xs font-black font-mono text-[var(--text-secondary)] mt-0.5">{p.max}</div>
                  </div>
                </div>
              </div>

              {/* Card Footer Actions & Alert Tag */}
              <div className="pt-2.5 border-t border-[var(--border-main)] flex items-center justify-between gap-2">
                {isCrit ? (
                  <span className="text-[10px] font-bold text-rose-500 flex items-center gap-1">
                    <AlertTriangle size={11} /> {isAr ? "حرج / مشبع" : "Saturated"}
                  </span>
                ) : isWarn ? (
                  <span className="text-[10px] font-bold text-amber-500 flex items-center gap-1">
                    <AlertCircle size={11} /> {isAr ? "اقتراب الحد" : "Near Limit"}
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-1">
                    <CheckCircle2 size={11} /> {isAr ? "طاقة استيعابية ممتازة" : "Optimal"}
                  </span>
                )}

                <button
                  onClick={() => handleReconnectPool(p.id, isAr ? poolArName : p.name)}
                  disabled={reconnectingPool === p.id}
                  className="p-1.5 text-xs text-[var(--text-muted)] hover:text-accent hover:bg-accent/10 rounded-md border border-transparent hover:border-accent/20 transition-theme disabled:opacity-50"
                  title={isAr ? "إعادة اتصال وتهيئة المجمع" : "Flush & reconnect connection pool"}
                >
                  <RotateCcw size={13} className={reconnectingPool === p.id ? 'animate-spin text-accent' : ''} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

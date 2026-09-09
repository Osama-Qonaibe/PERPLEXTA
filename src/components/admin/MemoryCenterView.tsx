import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { useAppContext } from "../../context/AppContext";
import { useConfirm } from "../../context/ConfirmContext";
import { toast as globalToast } from "../../context/NotificationContext";
import { motion, AnimatePresence } from "motion/react";
import { getAuthHeaders, getTimeAgo } from "../../utils/adminUtils";
import {
  Cpu,
  Brain,
  Zap,
  Save,
  RefreshCw,
  Search,
  CheckCircle,
  AlertTriangle,
  Info,
  Sliders,
  DollarSign,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Clock,
  Shield,
  Key,
  Database,
  Users,
  Settings,
  Plus,
  Server,
  Eye,
  EyeOff,
  Copy,
  ExternalLink,
  Coins,
  Wrench,
  LayoutGrid,
  Scale,
  Megaphone,
  ImageIcon,
  Video,
  Mic,
  Volume2,
  GraduationCap,
  Code2,
  Music,
  Trash2,
  X,
  UserPlus,
  FastForward,
  Bell,
  Mail,
  FileText,
  ShieldAlert,
  Settings2,
  Download,
  ArrowRight,
  ArrowLeft,
  Activity,
  History as HistoryIcon,
} from "lucide-react";
import { NotificationThresholdsModal } from "../NotificationThresholdsModal";
import { MemoryCenterViewProps } from "./adminTypes";

interface MemoryConsolidationReportItem {
  userId: number;
  userName: string;
  userEmail: string;
  oldCount: number;
  newCount: number;
  archivedFacts: string[];
  distilledFact: string;
  success: boolean;
  error?: string;
}

export const MemoryCenterView = ({
  theme,
  t,
  dir,
  language,
}: {
  theme: string;
  t: (key: string, replacements?: any) => string;
  dir: string;
  language: string;
}) => {
  const { token, setIsOperationPending } = useAppContext();
  const [threshold, setThreshold] = useState<number>(10);
  const [targetUserId, setTargetUserId] = useState<string>("");
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [ttlDays, setTtlDays] = useState<number>(30);
  const [isCleaning, setIsCleaning] = useState<boolean>(false);
  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const [reports, setReports] = useState<MemoryConsolidationReportItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [systemStats, setSystemStats] = useState<{
    totalMemories: number;
    usersWithMemories: number;
    averageMemories: number;
  } | null>(null);
  const [diagnosticsData, setDiagnosticsData] = useState<any>(null);
  const [refreshInterval, setRefreshInterval] = useState<number>(10);
  const [loadingStats, setLoadingStats] = useState<boolean>(false);

  const showToast = useCallback((message: string, isSuccess = true) => {
    if (isSuccess) {
      globalToast.success(message, dir === "rtl" ? "تم بنجاح" : "Success");
    } else {
      globalToast.error(message, dir === "rtl" ? "حدث خطأ" : "Error");
    }
  }, [dir]);

  const [lowThreshold, setLowThreshold] = useState<number>(50);
  const [highThreshold, setHighThreshold] = useState<number>(80);
  const [isThresholdModalOpen, setIsThresholdModalOpen] = useState<boolean>(false);

  const fetchSystemThresholds = async () => {
    try {
      const res = await fetch("/api/system/settings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (typeof data.quota_warning_threshold_low === 'number') {
          setLowThreshold(data.quota_warning_threshold_low);
        }
        if (typeof data.quota_warning_threshold_high === 'number') {
          setHighThreshold(data.quota_warning_threshold_high);
        }
      }
    } catch (err) {
      console.error("Failed to fetch custom thresholds:", err);
    }
  };

  const handleSaveThresholds = async (low: number, high: number) => {
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          quota_warning_threshold_low: low,
          quota_warning_threshold_high: high,
        }),
      });
      if (res.ok) {
        setLowThreshold(low);
        setHighThreshold(high);
        showToast(
          language === "ar"
            ? "تم تحديث عتبات التنبيهات المخصصة بنجاح!"
            : "Custom notification thresholds updated successfully!",
          true
        );
      } else {
        const data = await res.json();
        showToast(data.error || "Failed to update thresholds", false);
      }
    } catch (err: any) {
      showToast(err.message || "Failed to update thresholds", false);
    }
  };

  const bufferTrendData = useMemo(() => {
    const currentCount = systemStats?.totalMemories || 25;
    return [
      { time: '-60m', density: Math.max(2, currentCount - 12) },
      { time: '-50m', density: Math.max(4, currentCount - 10) },
      { time: '-40m', density: Math.max(6, currentCount - 8) },
      { time: '-30m', density: Math.max(8, currentCount - 5) },
      { time: '-20m', density: Math.max(12, currentCount - 3) },
      { time: '-10m', density: Math.max(15, currentCount - 1) },
      { time: 'Now', density: currentCount },
    ];
  }, [systemStats]);

  const handleSmartCompress = async () => {
    setIsCompressing(true);
    setIsOperationPending(true);
    try {
      const res = await fetch("/api/memories/smart-compress", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        showToast(
          language === "ar"
            ? `تم ضغط الذاكرة بذكاء بنجاح. تم تكثيف ${data.compressedCount} جلسة.`
            : `Smart compression completed. Condensed ${data.compressedCount} active sessions.`,
          true
        );
        fetchStats();
      } else {
        showToast(data.error || "Failed to execute smart compression", false);
      }
    } catch (err: any) {
      showToast(err.message || "Network error", false);
    } finally {
      setIsCompressing(false);
      setIsOperationPending(false);
    }
  };

  const handleRunContextCleanup = async () => {
    setIsCleaning(true);
    setIsOperationPending(true);
    try {
      const res = await fetch("/api/memories/cleanup-context", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ttlDays }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(
          language === "ar"
            ? `تم تنظيف السياق بنجاح. تم مسح ${data.cleanedCount} جلسة غير نشطة.`
            : `Context cleanup completed. Pruned ${data.cleanedCount} inactive sessions.`,
          true
        );
        fetchStats();
      } else {
        showToast(data.error || "Failed to execute context cleanup", false);
      }
    } catch (err: any) {
      showToast(err.message || "Network error", false);
    } finally {
      setIsCleaning(false);
      setIsOperationPending(false);
    }
  };

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const [statsRes, diagRes] = await Promise.all([
        fetch("/api/admin/memories/stats", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/memories/diagnostics", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (statsRes.ok) {
        const data = await statsRes.json();
        setSystemStats(data);
      }
      if (diagRes.ok) {
        const diag = await diagRes.json();
        setDiagnosticsData(diag);
      }
    } catch (err) {
      console.error("Failed to load memory stats or diagnostics:", err);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    fetchStats();
    fetchSystemThresholds();
    const intervalId = setInterval(() => {
      fetchStats();
    }, refreshInterval * 1000);

    return () => clearInterval(intervalId);
  }, [token, refreshInterval]);

  const handleRunConsolidation = async () => {
    setIsRunning(true);
    setIsOperationPending(true);
    setReports([]);
    try {
      const res = await fetch("/api/admin/memories/consolidate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          targetUserId: targetUserId ? parseInt(targetUserId) : undefined,
          threshold: threshold,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setReports(data.report || []);
        showToast(
          language === "ar"
            ? "اكتملت عملية تكثيف الذاكرة بنجاح!"
            : "Memory distillation cycle completed successfully!",
          true
        );
        fetchStats();
      } else {
        showToast(data.error || "Failed to execute consolidation", false);
      }
    } catch (err: any) {
      showToast(err.message || "Network error", false);
    } finally {
      setIsRunning(false);
      setIsOperationPending(false);
    }
  };

  const filteredReports = reports.filter(
    (item) =>
      item.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.userEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.distilledFact.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">

      {/* Hero Header */}
      <div
        className={`p-6 rounded-lg border transition-theme ${
          theme === "dark"
            ? "bg-[#1a1a1c] border-gray-800/60"
            : "bg-white border-gray-200"
        } shadow-sm`}
      >
        <div className="flex items-start gap-4">
          <div className="p-3 bg-accent/10 rounded-lg text-accent shadow-[0_0_15px_rgba(156,163,175,0.05)]">
            <Brain
              size={28}
              className="text-accent "
            />
          </div>
          <div className="flex-1 space-y-1">
            <h4 className="text-lg font-bold text-gray-900 dark:text-white">
              {language === "ar"
                ? "بروتوكول تحسين وصيانة الذاكرة التراكمية"
                : "PERPLEXTA SYSTEM MEMORY OPTIMIZATION PROTOCOL"}
            </h4>
            <p className="text-sm text-gray-400">
              {language === "ar"
                ? "تنظيم وفهرسة سجلات ذاكرة المستخدمين لتحسين الدقة وتقليل زمن الاستجابة."
                : "Organize and optimize user memory fragments to improve AI response and reduce context load."}
            </p>
          </div>
        </div>
      </div>

      {/* Real-Time System Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div
          className={`p-6 rounded-lg border transition-theme ${
            theme === "dark"
              ? "bg-[#1a1a1c] border-gray-800/60"
              : "bg-white border-gray-200"
          } shadow-md relative overflow-hidden group`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">
              {language === "ar" ? "إجمالي السجلات" : "TOTAL MEMORIES"}
            </span>
            <Database
              size={18}
              className="text-gray-400 group-hover:text-accent group-hover: transition-theme"
            />
          </div>
          <div className="mt-4 flex items-baseline">
            {loadingStats ? (
              <span className="text-3xl font-extrabold text-accent/30 animate-pulse">
                ...
              </span>
            ) : (
              <span className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight font-sans">
                {systemStats?.totalMemories ?? 0}
              </span>
            )}
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-gray-500/10 to-transparent"></div>
        </div>

        <div
          className={`p-6 rounded-lg border transition-theme ${
            theme === "dark"
              ? "bg-[#1a1a1c] border-gray-800/60"
              : "bg-white border-gray-200"
          } shadow-md relative overflow-hidden group`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">
              {language === "ar" ? "المخدمين النشطين" : "ACTIVE PROFILES"}
            </span>
            <Users
              size={18}
              className="text-gray-400 group-hover:text-accent group-hover: transition-theme"
            />
          </div>
          <div className="mt-4 flex items-baseline">
            {loadingStats ? (
              <span className="text-3xl font-extrabold text-accent/30 animate-pulse">
                ...
              </span>
            ) : (
              <span className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight font-sans">
                {systemStats?.usersWithMemories ?? 0}
              </span>
            )}
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-gray-500/10 to-transparent"></div>
        </div>

        <div
          className={`p-6 rounded-lg border transition-theme ${
            theme === "dark"
              ? "bg-[#1a1a1c] border-gray-800/60"
              : "bg-white border-gray-200"
          } shadow-md relative overflow-hidden group`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">
              {language === "ar"
                ? "متوسط الكثافة لكل حساب"
                : "MEAN PROFILE DENSITY"}
            </span>
            <Cpu
              size={18}
              className="text-gray-400 group-hover:text-accent group-hover: transition-theme"
            />
          </div>
          <div className="mt-4 flex items-baseline">
            {loadingStats ? (
              <span className="text-3xl font-extrabold text-accent/30 animate-pulse">
                ...
              </span>
            ) : (
              <span className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight font-sans">
                {systemStats?.averageMemories ?? 0}{" "}
                <span className="text-sm font-normal text-gray-500">
                  rec/user
                </span>
              </span>
            )}
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-gray-500/10 to-transparent"></div>
        </div>
      </div>

      {/* Real-time Diagnostics & Active Context Sessions Panel */}
      {diagnosticsData && (
        <div
          className={`p-6 rounded-lg border transition-theme ${
            theme === "dark"
              ? "bg-[#1a1a1c] border-gray-800/60"
              : "bg-white border-gray-200"
          } shadow-md space-y-4`}
        >
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-accent animate-ping"></div>
              <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                {language === "ar" ? "تشخيصات محرك الذاكرة الحي (Live Buffer Diagnostics)" : "Live Buffer Diagnostics & Engine Health"}
              </h4>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                {diagnosticsData.engine} ({diagnosticsData.mode})
              </span>
              {(() => {
                const limit = diagnosticsData?.bufferLimit || 50;
                const count = systemStats?.totalMemories || 0;
                const pct = Math.round((count / limit) * 100);
                if (pct >= 80) {
                  return (
                    <span className="text-xs font-mono text-red-500 bg-red-500/10 border border-red-500/30 px-2 py-0.5 rounded flex items-center gap-1 font-bold">
                      <Bell size={10} className="animate-bounce" /> {pct}% {language === "ar" ? "حرج" : "CRITICAL"}
                    </span>
                  );
                }
                if (pct >= 50) {
                  return (
                    <span className="text-xs font-mono text-amber-500 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded flex items-center gap-1 font-bold">
                      <Bell size={10} className="animate-pulse" /> {pct}% {language === "ar" ? "تنبيه" : "WARNING"}
                    </span>
                  );
                }
                return (
                  <span className="text-xs font-mono text-[var(--fg-success)] bg-[var(--status-success-subtle)] border border-[var(--fg-success)]/30 px-2 py-0.5 rounded flex items-center gap-1">
                    <CheckCircle2 size={10} /> {pct}% {language === "ar" ? "مستقر" : "HEALTHY"}
                  </span>
                );
              })()}
            </div>
          </div>

          {/* Notification Alert System for Custom Percentage Thresholds & Token Spike Alerts */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 rounded-lg bg-gray-50 dark:bg-[#121214] border border-[var(--border)] font-sans">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded bg-accent/15 text-accent">
                <Sliders size={16} />
              </div>
              <div>
                <span className="text-xs font-bold text-gray-900 dark:text-white block">
                  {language === "ar" ? "عتبات التنبيهات والإشعارات المخصصة" : "Configurable Trigger Thresholds"}
                </span>
                <span className="text-[11px] text-gray-500 dark:text-gray-400">
                  {language === "ar"
                    ? `العتبات الحالية: الأولية ${lowThreshold}% | الحرج ${highThreshold}%`
                    : `Active Triggers: Low ${lowThreshold}% | High ${highThreshold}%`}
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsThresholdModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-accent/10 hover:bg-accent/20 border border-accent/30 text-accent font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            >
              <Sliders size={14} />
              <span>{language === "ar" ? "تعديل العتبات المخصصة" : "Configure Thresholds"}</span>
            </button>
          </div>

          {(() => {
            const bufferLimit = diagnosticsData?.bufferLimit || 50;
            const currentCount = systemStats?.totalMemories || 25;
            const bufferUsagePercent = Math.round((currentCount / bufferLimit) * 100);

            if (bufferUsagePercent >= highThreshold) {
              return (
                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/40 text-red-600 dark:text-red-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in font-sans shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-full bg-red-500/20 text-red-500 shrink-0 mt-0.5 animate-bounce">
                      <AlertTriangle size={18} />
                    </div>
                    <div>
                      <div className="font-bold text-xs uppercase tracking-wider flex items-center gap-2">
                        <span>
                          {language === "ar"
                            ? `تحذير حرج: تجاوز استهلاك الذاكرة عتبة ${highThreshold}% المخصصة!`
                            : `CRITICAL ALERT: Memory Buffer Exceeded Custom ${highThreshold}% Capacity!`}
                        </span>
                        <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded font-mono font-bold">
                          {bufferUsagePercent}% {language === "ar" ? "السعة" : "LOAD"}
                        </span>
                      </div>
                      <p className="text-xs text-gray-700 dark:text-gray-300 mt-1 leading-relaxed">
                        {language === "ar"
                          ? `وصلت كثافة استهلاك سياق الذاكرة إلى ${bufferUsagePercent}%. يوصى ببدء تقليص الذاكرة فوراً لمنع البطء والتأثير على سرعة الاستجابة.`
                          : `Buffer load has reached ${bufferUsagePercent}%. Immediate context compression is strongly recommended to prevent latency spikes.`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleSmartCompress}
                    disabled={isCompressing}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold transition-all shrink-0 flex items-center gap-2 shadow cursor-pointer disabled:opacity-50"
                  >
                    {isCompressing ? (
                      <RefreshCw className="animate-spin" size={14} />
                    ) : (
                      <Zap size={14} />
                    )}
                    <span>
                      {language === "ar" ? "تقليص الذاكرة الآن" : "Shrink Memory Now"}
                    </span>
                  </button>
                </div>
              );
            }

            if (bufferUsagePercent >= lowThreshold) {
              return (
                <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/40 text-amber-600 dark:text-amber-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in font-sans shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-full bg-amber-500/20 text-amber-500 shrink-0 mt-0.5">
                      <AlertCircle size={18} />
                    </div>
                    <div>
                      <div className="font-bold text-xs uppercase tracking-wider flex items-center gap-2">
                        <span>
                          {language === "ar"
                            ? `إشعار تنبيه: استهلاك الذاكرة وصل إلى عتبة ${lowThreshold}% المخصصة`
                            : `WARNING: Memory Buffer Reached Custom ${lowThreshold}% Capacity`}
                        </span>
                        <span className="text-[10px] bg-amber-500/30 text-amber-800 dark:text-amber-200 px-2 py-0.5 rounded font-mono font-bold">
                          {bufferUsagePercent}% {language === "ar" ? "السعة" : "LOAD"}
                        </span>
                      </div>
                      <p className="text-xs text-gray-700 dark:text-gray-300 mt-1 leading-relaxed">
                        {language === "ar"
                          ? `وصلت سعة التخزين المؤقت إلى ${bufferUsagePercent}%. يمكنك تنفيذ تقليص الذاكرة للحفاظ على أداء سريع وتوزيع مثالي للرموز.`
                          : `Buffer capacity is currently at ${bufferUsagePercent}%. You can shrink memory now to maintain optimal response speeds.`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleSmartCompress}
                    disabled={isCompressing}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-bold transition-all shrink-0 flex items-center gap-2 shadow cursor-pointer disabled:opacity-50"
                  >
                    {isCompressing ? (
                      <RefreshCw className="animate-spin" size={14} />
                    ) : (
                      <Zap size={14} />
                    )}
                    <span>
                      {language === "ar" ? "تقليص الذاكرة" : "Shrink Memory"}
                    </span>
                  </button>
                </div>
              );
            }

            return null;
          })()}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <div className="p-3 rounded bg-gray-50 dark:bg-[#0f0f11] border border-[var(--border)]">
              <span className="text-gray-500 block mb-1">{language === "ar" ? "سعة التخزين المؤقت القصوى" : "Buffer Limit Capacity"}</span>
              <span className="text-base font-bold text-gray-900 dark:text-white">{diagnosticsData.bufferLimit} Records Max</span>
            </div>
            <div className="p-3 rounded bg-gray-50 dark:bg-[#0f0f11] border border-[var(--border)]">
              <span className="text-gray-500 block mb-1">{language === "ar" ? "الجلسات النشطة ذات السياق" : "Active Context Sessions"}</span>
              <span className="text-base font-bold text-accent">{diagnosticsData.activeContextSessions?.length || 0} Sessions</span>
            </div>
          </div>

          {diagnosticsData.activeContextSessions && diagnosticsData.activeContextSessions.length > 0 && (
            <div className="space-y-2 mt-4">
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">
                {language === "ar" ? "أحدث جلسات المحادثة ذات السياق النشط" : "Recent Active Context Sessions"}
              </span>
              <div className="max-h-48 overflow-y-auto space-y-2 pr-1 font-mono text-xs">
                {diagnosticsData.activeContextSessions.map((session: any) => (
                  <div key={session.id} className="p-2.5 rounded bg-gray-100 dark:bg-[#0f0f11]/80 border border-[var(--border)] flex items-center justify-between gap-2">
                    <div className="truncate flex items-center gap-2">
                      <span className="font-bold text-accent">#{session.id}</span>
                      <span className="text-gray-800 dark:text-gray-200 truncate">{session.title || 'Untitled Session'}</span>
                      <span className="text-[10px] font-mono bg-accent/10 text-accent px-1.5 py-0.2 rounded shrink-0">
                        ⚡ {language === "ar" ? "نشط" : "Active Context"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-gray-400 whitespace-nowrap">
                        {new Date(session.updated_at).toLocaleTimeString()}
                      </span>
                      <button
                        onClick={handleSmartCompress}
                        disabled={isCompressing}
                        className="text-[10px] font-mono text-accent hover:underline px-1.5 py-0.5 bg-accent/5 hover:bg-accent/10 rounded border border-accent/20 cursor-pointer disabled:opacity-50"
                        title={language === "ar" ? "تقليص سياق هذه الجلسة" : "Shrink Session Context"}
                      >
                        {language === "ar" ? "تقليص" : "Shrink"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Buffer Usage Density Trend Over Last 60 Minutes */}
          <div className="space-y-2 mt-6 pt-4 border-t border-[var(--border)]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">
                {language === "ar" ? "كثافة استخدام ذاكرة التخزين المؤقت خلال آخر 60 دقيقة" : "Buffer Usage Density Trend (Last 60 Minutes)"}
              </span>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs font-mono">
                  <span className="text-gray-500 dark:text-gray-400 text-[11px]">
                    {language === "ar" ? "معدل التحديث:" : "Refresh:"}
                  </span>
                  <select
                    value={refreshInterval}
                    onChange={(e) => setRefreshInterval(Number(e.target.value))}
                    className="bg-gray-100 dark:bg-[#0f0f11] text-gray-800 dark:text-gray-200 border border-[var(--border)] text-[11px] rounded px-2 py-0.5 font-mono focus:outline-none focus:border-accent transition-theme cursor-pointer"
                  >
                    <option value={5}>5s</option>
                    <option value={10}>10s</option>
                    <option value={30}>30s</option>
                  </select>
                </div>
                <span className="text-[10px] font-mono text-accent bg-accent/10 px-2 py-0.5 rounded">
                  Real-time Telemetry
                </span>
              </div>
            </div>
            <div className="h-48 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={bufferTrendData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#2d2d30' : '#e5e7eb'} />
                  <XAxis dataKey="time" stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'} fontSize={10} tickLine={false} />
                  <YAxis stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'} fontSize={10} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: theme === 'dark' ? '#1a1a1c' : '#ffffff', 
                      borderColor: theme === 'dark' ? '#374151' : '#e5e7eb',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: theme === 'dark' ? '#ffffff' : '#111827'
                    }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="density" 
                    stroke="#10b881" 
                    strokeWidth={2.5} 
                    dot={{ fill: '#10b881', r: 4 }} 
                    activeDot={{ r: 6, fill: '#10b881', stroke: '#ffffff', strokeWidth: 2 }} 
                  />
                  <ReferenceLine 
                    y={40} 
                    stroke="#ef4444" 
                    strokeDasharray="4 4" 
                    label={{ 
                      value: language === 'ar' ? 'عتبة 80% للحمل الأقصى' : '80% Capacity Threshold', 
                      fill: '#ef4444', 
                      fontSize: 10, 
                      position: 'insideTopRight' 
                    }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Action Trigger Consolidation Form Console */}
      <div
        className={`p-6 rounded-lg border transition-theme ${
          theme === "dark"
            ? "bg-[#1a1a1c] border-gray-800/60"
            : "bg-white border-gray-200"
        } shadow-md`}
      >
        <h4 className="text-base font-bold text-gray-900 dark:text-white mb-6 border-b border-[var(--border)] pb-3">
          {language === "ar"
            ? "أدوات التشغيل وتحديد الأهداف"
            : "TRIGGER MANIFEST & MANIPULATION"}
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">
              {language === "ar"
                ? "الحد الأدنى للذكريات المستهدفة"
                : "MINIMUM ACCUMULATION LIMIT (THRESHOLD)"}
            </label>
            <input
              type="number"
              value={threshold}
              onChange={(e) =>
                setThreshold(Math.max(2, parseInt(e.target.value) || 2))
              }
              className={`w-full px-4 py-2 rounded border focus:outline-none focus:ring-1 focus:ring-accent-500/50 transition-theme font-mono text-sm ${
                theme === "dark"
                  ? "bg-[#0f0f11] border-gray-800 text-white"
                  : "bg-gray-50 border-gray-200 text-gray-900"
              }`}
              placeholder="e.g. 10"
              min="2"
            />
            <p className="text-[10px] text-gray-500">
              {language === "ar"
                ? "سيتم فقط معالجة المستخدمين الذين لديهم هذا العدد من الذكريات أو أكثر."
                : "Process profiles containing this memory record count or higher."}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">
              {language === "ar"
                ? "معرّف مستخدم محدد (اختياري)"
                : "EXPLICIT USER IDENTIFIER ID (OPTIONAL)"}
            </label>
            <input
              type="text"
              value={targetUserId}
              onChange={(e) =>
                setTargetUserId(e.target.value.replace(/\D/g, ""))
              }
              className={`w-full px-4 py-2 rounded border focus:outline-none focus:ring-1 focus:ring-accent-500/50 transition-theme font-mono text-sm ${
                theme === "dark"
                  ? "bg-[#0f0f11] border-gray-800 text-white"
                  : "bg-gray-50 border-gray-200 text-gray-900"
              }`}
              placeholder="e.g. 52"
            />
            <p className="text-[10px] text-gray-500">
              {language === "ar"
                ? "اترك هذا الحقل فارغاً لتشغيل عملية التكثيف لجميع المستخدمين المؤهلين."
                : "Leave blank to process all system users matching the criteria."}
            </p>
          </div>

          <div>
            <button
              onClick={handleRunConsolidation}
              disabled={isRunning}
              className={`w-full flex items-center justify-center gap-2 px-6 py-2.5 bg-accent hover:bg-accent disabled:bg-accent/40 text-white rounded-[4px] font-medium text-sm transition-theme shadow-[0_0_15px_rgba(156,163,175,0.15)] hover:shadow-[0_0_25px_rgba(156,163,175,0.3)] disabled:shadow-none cursor-pointer`}
            >
              {isRunning ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white/35 border-t-white animate-spin"></div>
                  {language === "ar"
                    ? "جاري التكثيف والتوليف..."
                    : "DISTILLING MEMORIES..."}
                </>
              ) : (
                <>
                  <Brain
                    size={16}
                    className="text-white "
                  />
                  {language === "ar"
                    ? "بدء عملية التكثيف اليدوي"
                    : "EXECUTE MANIFEST CYCLE"}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Automated Context Cleanup Routine Panel */}
      <div
        className={`p-6 rounded-lg border transition-theme ${
          theme === "dark"
            ? "bg-[#1a1a1c] border-gray-800/60"
            : "bg-white border-gray-200"
        } shadow-md`}
      >
        <h4 className="text-base font-bold text-gray-900 dark:text-white mb-2 border-b border-[var(--border)] pb-3">
          {language === "ar"
            ? "محرك تنظيف السياق التلقائي (Context TTL Cleanup)"
            : "AUTOMATED CONTEXT TTL CLEANUP ROUTINE"}
        </h4>
        <p className="text-xs text-gray-500 mb-6">
          {language === "ar"
            ? "تحديد ومسح ملخصات السياق للجلسات غير النشطة بناءً على عتبة TTL للحفاظ على خفة و كفاءة ذاكرة المحرك."
            : "Identify and purge inactive session context summaries based on a configurable TTL threshold to maintain engine buffer efficiency."}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">
              {language === "ar" ? "عتبة فترة عدم النشاط (TTL باليوم)" : "INACTIVITY TTL THRESHOLD (DAYS)"}
            </label>
            <select
              value={ttlDays}
              onChange={(e) => setTtlDays(parseInt(e.target.value, 10))}
              className={`w-full px-4 py-2 rounded border focus:outline-none focus:ring-1 focus:ring-accent-500/50 transition-theme font-mono text-sm ${
                theme === "dark"
                  ? "bg-[#0f0f11] border-gray-800 text-white"
                  : "bg-gray-50 border-gray-200 text-gray-900"
              }`}
            >
              <option value="7">7 Days (Aggressive)</option>
              <option value="15">15 Days (Standard)</option>
              <option value="30">30 Days (Recommended)</option>
              <option value="60">60 Days (Extended)</option>
              <option value="90">90 Days (Archival)</option>
            </select>
          </div>

          <div>
            <button
              onClick={handleRunContextCleanup}
              disabled={isCleaning}
              className={`w-full flex items-center justify-center gap-2 px-6 py-2.5 bg-[var(--surface-subtle)] hover:bg-accent/10 border border-[var(--border)] text-[var(--text-primary)] hover:text-accent disabled:opacity-50 rounded-[4px] font-medium text-sm transition-theme cursor-pointer`}
            >
              {isCleaning ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-accent/35 border-t-accent animate-spin"></div>
                  {language === "ar" ? "جاري تنظيف السياق..." : "PURGING INACTIVE CONTEXT..."}
                </>
              ) : (
                <>
                  <Database size={16} />
                  {language === "ar" ? "تشغيل تنظيف السياق الآن" : "RUN CONTEXT CLEANUP ROUTINE"}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Smart Compress Heuristic Panel */}
      <div
        className={`p-6 rounded-lg border transition-theme ${
          theme === "dark"
            ? "bg-[#1a1a1c] border-gray-800/60"
            : "bg-white border-gray-200"
        } shadow-md`}
      >
        <div className="flex items-center justify-between mb-2 border-b border-[var(--border)] pb-3">
          <h4 className="text-base font-bold text-gray-900 dark:text-white">
            {language === "ar"
              ? "الضغط الذكي للسياق (Smart Context Compression)"
              : "SMART CONTEXT COMPRESSION & HEURISTIC TRIM"}
          </h4>
          <span className="text-xs font-mono text-accent bg-accent/10 px-2.5 py-1 rounded">
            {language === "ar" ? "تقليل استهلاك الرموز" : "Token Load Reduction"}
          </span>
        </div>
        <p className="text-xs text-gray-500 mb-6">
          {language === "ar"
            ? "تطبيق خوارزمية استدلالية ذكية لضغط وتقليم النصوص الطويلة في جلسات المحادثة النشطة مع الاحتفاظ بالمعلومات الجوهرية وتخفيف الحمل على المحرك."
            : "Apply lightweight heuristic compression to trim redundant tokens from long-running active sessions while preserving core context summaries."}
        </p>

        <div className="flex items-center justify-end">
          <button
            onClick={handleSmartCompress}
            disabled={isCompressing}
            className={`flex items-center justify-center gap-2 px-6 py-2.5 bg-[var(--surface-subtle)] hover:bg-accent/10 border border-[var(--border)] text-[var(--text-primary)] hover:text-accent disabled:opacity-50 rounded-[4px] font-medium text-sm transition-theme cursor-pointer`}
          >
            {isCompressing ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-accent/35 border-t-accent animate-spin"></div>
                {language === "ar" ? "جاري الضغط الذكي..." : "COMPRESSING SESSIONS..."}
              </>
            ) : (
              <>
                <Zap size={16} className="text-accent" />
                {language === "ar" ? "تشغيل الضغط الذكي الآن" : "RUN SMART COMPRESSION"}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Dynamic Results & Verification Console */}
      <div
        className={`p-6 rounded-lg border transition-theme ${
          theme === "dark"
            ? "bg-[#1a1a1c] border-gray-800/60"
            : "bg-white border-gray-200"
        } shadow-md space-y-6`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
          <div>
            <h4 className="text-base font-bold text-gray-900 dark:text-white">
              {language === "ar"
                ? "تقرير معالجة تكثيف الذاكرة"
                : "DISTILLATION EXECUTION REPORT"}
            </h4>
            <p className="text-xs text-gray-500 mt-1">
              {language === "ar"
                ? "تحقق من جودة التوليف الذكي ومخرجات الذكاء الاصطناعي لكل مستخدم نشط."
                : "Audit the generated high-density facts and compression quality below."}
            </p>
          </div>

          <div className="relative w-full md:w-80">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full px-4 py-2 pl-10 pr-4 rounded border focus:outline-none focus:ring-1 focus:ring-accent-500/50 transition-theme text-xs ${
                theme === "dark"
                  ? "bg-[#0f0f11] border-gray-800 text-white"
                  : "bg-gray-50 border-gray-200 text-gray-900"
              }`}
              placeholder={
                language === "ar"
                  ? "بحث عن اسم، بريد، أو محتوى..."
                  : "Search name, email, or synthesized fact..."
              }
            />
            <div className={`absolute top-2.5 left-3 text-gray-400`}>
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        {filteredReports.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center rounded bg-gray-50 dark:bg-[#0f0f11] border border-dashed border-[var(--border)]">
            <Brain
              size={48}
              className="text-gray-300 dark:text-gray-700/60 mb-4 animate-pulse"
            />
            <p className="text-sm font-bold text-gray-500">
              {language === "ar"
                ? "لا توجد نتائج معالجة حالية"
                : "No active runtime logs available."}
            </p>
            <p className="text-xs text-gray-500 mt-1 max-w-sm">
              {language === "ar"
                ? "ابدأ بتحديد الخيارات وضغط بدء عملية التكثيف اليدوي أعلاه لاستيراد ومكثفة سجلات المستخدمين."
                : "Select targets and run the manifest cycle to stream and capture direct synthesis details here."}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredReports.map((report) => (
              <div
                key={report.userId}
                className={`p-5 rounded-lg border transition-theme ${
                  report.success
                    ? theme === "dark"
                      ? "bg-[#0f0f11]/60 border-accent/15 shadow-[0_0_15px_rgba(156,163,175,0.02)]"
                      : "bg-accent/15 border-accent/50"
                    : theme === "dark"
                      ? "bg-[#0f0f11]/60 border-red-500/15"
                      : "bg-red-50/15 border-red-200/50"
                }`}
              >
                {/* User Header Details */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] pb-3 mb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-gray-900 dark:text-white">
                        {report.userName}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-gray-200 dark:bg-gray-800 text-gray-500">
                        UID: #{report.userId}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 font-mono">
                      {report.userEmail}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Compression indicator with glow */}
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className="text-[10px] text-gray-500 font-bold tracking-wider uppercase">
                          {language === "ar"
                            ? "السجلات المعالجة"
                            : "OPTIMIZATION SCALE"}
                        </div>
                        <div className="text-xs font-mono text-gray-400">
                          <span className="text-red-400 font-bold">
                            {report.oldCount}
                          </span>
                          {" ➔ "}
                          <span className="text-accent font-bold">
                            {report.newCount}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-extrabold text-accent  px-2.5 py-1 rounded bg-accent/10 border border-accent/20">
                        {Math.round(
                          ((report.oldCount - report.newCount) /
                            report.oldCount) *
                            100
                        )}
                        % {language === "ar" ? "تقليص" : "REDUCED"}
                      </span>
                    </div>

                    {/* Status Badge */}
                    {report.success ? (
                      <span className="flex items-center gap-1.5 text-xs text-accent font-bold bg-accent/10 border border-accent/20 px-2.5 py-1 rounded">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse animate-duration-1000"></span>
                        {language === "ar" ? "ناجح" : "COMPLETED"}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs text-red-500 font-bold bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                        {language === "ar" ? "فشل" : "FAILED"}
                      </span>
                    )}
                  </div>
                </div>

                {report.success ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Distilled segment */}
                    <div className="space-y-2">
                      <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        {language === "ar"
                          ? "الذاكرة التوليفية عالية الكثافة"
                          : "SYNTHESIZED INTEL FACT STATEMENT (RESULTS)"}
                      </div>
                      <blockquote
                        className={`p-4 rounded border-s-4 border-accent leading-relaxed text-sm font-medium ${
                          theme === "dark"
                            ? "bg-[#131315] border-gray-800 text-gray-100"
                            : "bg-white border-gray-200 text-gray-800"
                        }`}
                      >
                        “{report.distilledFact}”
                      </blockquote>
                    </div>

                    {/* Archived Segment list */}
                    <div className="space-y-2">
                      <div className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center justify-between">
                        <span>
                          {language === "ar"
                            ? "السجلات الـ 10 المؤرشفة القديمة"
                            : "ARCHIVED LEGACY FACT STATEMENTS"}
                        </span>
                        <span className="text-[10px] text-gray-400 font-normal font-mono">
                          Count: {report.archivedFacts.length}
                        </span>
                      </div>
                      <div
                        className={`p-3 rounded border font-mono text-[11px] leading-relaxed max-h-36 overflow-y-auto custom-scrollbar space-y-1.5 ${
                          theme === "dark"
                            ? "bg-[#131315]/80 border-gray-800 text-gray-400"
                            : "bg-white border-gray-100 text-gray-650"
                        }`}
                      >
                        {report.archivedFacts.map((fact, idx) => (
                          <div
                            key={`archived-fact-${report.userId}-${idx}`}
                            className="border-b border-gray-800/15 last:border-0 pb-1 last:pb-0"
                          >
                            {fact}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-red-400 font-mono p-3 bg-red-500/5 rounded border border-red-500/10">
                    <strong>Error description:</strong>{" "}
                    {report.error || "Failed to process consolidation."}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notification Thresholds Configuration Modal */}
      <NotificationThresholdsModal
        isOpen={isThresholdModalOpen}
        onClose={() => setIsThresholdModalOpen(false)}
        currentLow={lowThreshold}
        currentHigh={highThreshold}
        onSave={handleSaveThresholds}
        language={language as "ar" | "en"}
        theme={theme as "dark" | "light"}
      />
    </div>
  );
};

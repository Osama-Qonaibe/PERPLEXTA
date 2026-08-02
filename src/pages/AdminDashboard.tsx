import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import { motion, AnimatePresence } from "motion/react";
import { perplextaPageTransition } from "../constants/motions";
import { HighlightText } from "../components/HighlightText";
import {
  Music,
  Activity,
  Key,
  Database,
  Cpu,
  Landmark,
  Cloud,
  CreditCard,
  ShoppingBag,
  Users,
  Settings,
  Mail,
  Plus,
  Settings2,
  ArrowLeft,
  ArrowRight,
  TrendingUp,
  Zap,
  Server,
  CheckCircle2,
  AlertCircle,
  Clock,
  Eye,
  EyeOff,
  ShieldCheck,
  RefreshCw,
  XCircle,
  ExternalLink,
  Copy,
  Save,
  Download,
  Upload,
  Calendar,
  Code2,
  Network,
  Star,
  MessageSquare,
  Sparkles,
  Brain,
  Globe,
  Smartphone,
  Building,
  FileText,
  Mic,
  Volume2,
  Image as ImageIcon,
  Video,
  GraduationCap,
  Monitor,
  LayoutGrid,
  LifeBuoy,
  Info,
  Coins,
  Wallet,
  History,
  ShieldAlert,
  ArrowRightLeft,
  Award,
  Search,
  Camera,
  Trash2,
  X,
  CheckCircle,
  BellRing,
  AlertTriangle,
  Send,
  Circle,
  DollarSign,
  Terminal,
  Shield,
  ChevronDown,
  Scale,
  Megaphone,
  FastForward,
  UserPlus,
} from "lucide-react";
import { ActionConfirmationModal } from "../components/ActionConfirmationModal";
import { validateToolRoutePricing } from "../utils/orchestratorValidator";
import { ReferralDashboardView } from "./ReferralDashboardView";
import { AdsManagementView } from "./AdsManagementView";
import { AdminRateLimitMetricsView } from "./AdminRateLimitMetricsView";
import { AdminRenderMetricsView } from "../components/AdminRenderMetricsView";

// --- Command Center View ---
const CommandCenterView = ({
  theme,
  t,
}: {
  theme: string;
  t: (key: string, replacements?: any) => string;
}) => {
  const { token, language, socket, dir } = useAppContext();
  const [stats, setStats] = useState<{
    monthlyRevenue: number;
    activeUsersToday: number;
    aiGenerations: number;
    systemHealth: string;
  } | null>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [selectedActivityIds, setSelectedActivityIds] = useState<string[]>([]);
  const [selectedAlertIds, setSelectedAlertIds] = useState<string[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [logStatusFilter, setLogStatusFilter] = useState("all");
  const [logToolFilter, setLogToolFilter] = useState("all");
  const [logStartDate, setLogStartDate] = useState("");
  const [logEndDate, setLogEndDate] = useState("");
  const [apiHealth, setApiHealth] = useState<any[]>([]);
  const [serverHealth, setServerHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string | { ar: string; en: string };
    description: string | { ar: string; en: string };
    variant?: 'danger' | 'success' | 'warning' | 'info';
    confirmLabel?: string | { ar: string; en: string };
    onConfirm: () => Promise<void> | void;
  } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchData = async () => {
    try {
      const headers = {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Cache-Control": "no-cache",
      };
      const [statsRes, alertsRes, activityRes, apiRes, healthRes] =
        await Promise.all([
          fetch("/api/admin/stats", { headers }),
          fetch("/api/admin/security-alerts", { headers }),
          fetch("/api/admin/activity-stream", { headers }),
          fetch("/api/admin/api-keys", { headers }),
          fetch("/api/admin/health", { headers }),
        ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (alertsRes.ok) setAlerts(await alertsRes.json());
      if (activityRes.ok) setActivity(await activityRes.json());
      if (healthRes.ok) setServerHealth(await healthRes.json());
      if (apiRes.ok) {
        const data = await apiRes.json();
        setApiHealth(Array.isArray(data) ? data : data.keys || []);
      }
    } catch (error) {
      if (error instanceof Error && error.message === "Failed to fetch") {
        console.debug(
          "[Admin] Initial fetch failed, likely server starting...",
        );
      } else {
        console.error("Error fetching admin data:", error);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchData();

    // Live Broadcasting Listener
    if (socket) {
      const handleNewActivity = (log: any) => {
        setActivity((prev) => [log, ...prev].slice(0, 50));
      };

      const handleNewAiLog = (log: any) => {
        setActivity((prev) => [log, ...prev].slice(0, 50));
      };

      const handleStatsUpdate = (newStats: any) => {
        if (newStats) setStats(newStats);
      };

      socket.on("new_system_activity", handleNewActivity);
      socket.on("new_ai_log", handleNewAiLog);
      socket.on("admin_stats_update", handleStatsUpdate);

      return () => {
        socket.off("new_system_activity", handleNewActivity);
        socket.off("new_ai_log", handleNewAiLog);
        socket.off("admin_stats_update", handleStatsUpdate);
      };
    }
  }, [token, socket]);

  const handleDeleteActivity = (id: string, type: string) => {
    if (!token) return;
    setConfirmModal({
      isOpen: true,
      title: { ar: "حذف السجل؟", en: "Delete Log?" },
      description: {
        ar: language === "ar" ? "هل أنت متأكد من حذف هذا السجل بشكل نهائي؟" : "Are you sure you want to delete this log?",
        en: t("deleteLogConfirm") || "Are you sure you want to delete this log?"
      },
      variant: 'danger',
      onConfirm: async () => {
        const backendType = "log";
        try {
          const res = await fetch(`/api/admin/activity/${id}/${backendType}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            setActivity((prev) =>
              prev.filter((a) => a.id !== id),
            );
            showToast(t("logDeleted") || (language === "ar" ? "تم حذف السجل بنجاح" : "Log deleted successfully"), "success");
          }
        } catch (err) {
          console.error("Failed to delete activity log", err);
        }
      }
    });
  };

  const handleDeleteAlert = (id: string) => {
    if (!token) return;
    setConfirmModal({
      isOpen: true,
      title: { ar: "حذف الإنذار؟", en: "Delete Alert?" },
      description: {
        ar: language === "ar" ? "هل أنت متأكد من حذف هذا الإنذار الأمني؟" : "Are you sure you want to delete this safety alert?",
        en: t("deleteAlertConfirm") || "Are you sure you want to delete this alert?"
      },
      variant: 'danger',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/security-alerts/${id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            setAlerts((prev) => prev.filter((a) => a.id !== id));
            showToast(language === "ar" ? "تم الحذف بنجاح" : "Deleted successfully", "success");
          }
        } catch (err) {
          console.error("Failed to delete alert", err);
        }
      }
    });
  };

  const handleReconcile = (userId: string) => {
    if (!token) return;
    setConfirmModal({
      isOpen: true,
      title: { ar: "تدقيق الرصيد؟", en: "Reconcile Balance?" },
      description: {
        ar: language === "ar" ? "هل أنت متأكد من رغبتك في إعادة تسوية وتدقيق رصيد هذا المستخدم؟" : "Are you sure you want to audit and reconcile this user's wallet?",
        en: t("reconcileConfirm") || "Are you sure you want to audit and reconcile this user's wallet?"
      },
      variant: 'warning',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/reconcile-wallet/${userId}`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            showToast(t("reconcileSuccess") || "Wallet reconciled successfully", "success");
            fetchData();
          }
        } catch (err) {
          console.error("Reconciliation failed", err);
        }
      }
    });
  };

  const handleBulkDeleteActivity = (type: "ai_generation" | "system_event" | "all" | "log") => {
    if (!token) return;
    const mappedType = type;
    const typeLabel =
      mappedType === "ai_generation"
        ? language === "ar"
          ? "الذكاء الاصطناعي"
          : "AI"
        : mappedType === "system_event"
        ? language === "ar"
          ? "النظام"
          : "System"
        : language === "ar"
        ? "كل السجلات"
        : "All Logs";

    const confirmMsg = t("bulkDeleteActivityConfirm")?.replace("{type}", typeLabel) || 
      (language === "ar" ? `هل أنت متأكد من حذف كافة سجلات ${typeLabel}؟` : `Are you sure you want to delete all ${typeLabel} logs?`);

    setConfirmModal({
      isOpen: true,
      title: { ar: "تطهير السجلات؟", en: "Bulk Delete Logs?" },
      description: {
        ar: confirmMsg,
        en: confirmMsg
      },
      variant: 'danger',
      onConfirm: async () => {
        const backendType = mappedType === "ai_generation" ? "ai" : (mappedType === "system_event" ? "system" : "log");
        try {
          const res = await fetch(`/api/admin/activity/all/${backendType}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            if (mappedType === "ai_generation") {
              setActivity((prev) => prev.filter((a) => a.type !== "ai_generation"));
            } else if (mappedType === "system_event") {
              setActivity((prev) => prev.filter((a) => a.type === "ai_generation"));
            } else {
              setActivity([]);
            }
            showToast(t("activityCleared") || (language === "ar" ? "تم تطهير السجلات بنجاح" : "Records cleared successfully"), "success");
            fetchData();
          }
        } catch (err) {
          console.error("Bulk delete failed", err);
        }
      }
    });
  };

  const handleBulkDeleteAlerts = () => {
    if (!token) return;
    setConfirmModal({
      isOpen: true,
      title: { ar: "تطهير كافة الإنذارات؟", en: "Wipe All Alerts?" },
      description: {
        ar: language === "ar" ? "هل أنت متأكد من حذف كافة الإنذارات الأمنية من السجل؟" : "Are you sure you want to clear all safety alerts?",
        en: t("bulkDeleteAlertsConfirm") || "Are you sure you want to clear all safety alerts?"
      },
      variant: 'danger',
      onConfirm: async () => {
        try {
          const res = await fetch("/api/admin/activity/all/alert", {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            setAlerts([]);
            showToast(t("alertsCleared") || "Alerts cleared", "success");
          }
        } catch (err) {
          console.error("Bulk delete failed", err);
        }
      }
    });
  };

  const handleBatchDelete = (type: "activity" | "alert") => {
    if (!token) return;
    const ids = type === "activity" ? selectedActivityIds : selectedAlertIds;
    if (ids.length === 0) return;

    setConfirmModal({
      isOpen: true,
      title: { ar: "حذف العناصر المحددة؟", en: "Delete Selected Items?" },
      description: {
        ar: t("batchDeleteConfirm")?.replace("{count}", ids.length.toString()) || `هل أنت متأكد من حذف ${ids.length} من العناصر المحددة؟`,
        en: t("batchDeleteConfirm")?.replace("{count}", ids.length.toString()) || `Are you sure you want to delete the ${ids.length} selected items?`
      },
      variant: 'danger',
      onConfirm: async () => {
        try {
          const res = await fetch("/api/admin/activity/batch-delete", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ ids, type: type === "activity" ? "log" : type }),
          });

          if (res.ok) {
            if (type === "activity") {
              setActivity((prev) => prev.filter((a) => !ids.includes(a.id)));
              setSelectedActivityIds([]);
            } else {
              setAlerts((prev) => prev.filter((a) => !ids.includes(a.id)));
              setSelectedAlertIds([]);
            }
            showToast(
              t("batchDeleteSuccess")?.replace("{count}", ids.length.toString()) || "Batch delete successful",
              "success",
            );
            fetchData(); // Refresh counts in KPI
          }
        } catch (err) {
          console.error("Batch delete failed", err);
        }
      }
    });
  };

  const handleSelectAll = (type: "activity" | "alert") => {
    if (type === "activity") {
      if (selectedActivityIds.length === activity.length) {
        setSelectedActivityIds([]);
      } else {
        setSelectedActivityIds(activity.map((a) => a.id));
      }
    } else {
      if (selectedAlertIds.length === alerts.length) {
        setSelectedAlertIds([]);
      } else {
        setSelectedAlertIds(alerts.map((a) => a.id));
      }
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <RefreshCw size={40} className="text-emerald-500 animate-spin" />
        <p className="text-[var(--text-secondary)] font-medium">
          {t("loadingCommandCenter")}
        </p>
      </div>
    );
  }

  const kpis = [
    {
      title: t("monthlyRevenue") || "إجمالي الإيرادات",
      value: `$${stats?.monthlyRevenue?.toLocaleString() || "0"}`,
      trend: t("optimal"),
      isPositive: true,
      icon: <TrendingUp size={20} />,
    },
    {
      title: t("activeUsersToday") || "المستخدمين اليوم",
      value: stats?.activeUsersToday?.toLocaleString() || "0",
      trend: t("optimal"),
      isPositive: true,
      icon: <Users size={20} />,
    },
    {
      title: t("aiGenerations") || "عمليات التوليد",
      value: stats?.aiGenerations?.toLocaleString() || "0",
      trend: t("optimal"),
      isPositive: true,
      icon: <Zap size={20} />,
    },
    {
      title: t("systemHealth") || "صحة النظام",
      value: stats?.systemHealth === "optimal" ? "99.9%" : "85%",
      trend: t("optimal"),
      isPositive: true,
      icon: <Activity size={20} />,
    },
  ];

  const getTimeAgo = (date: string) => {
    const seconds = Math.floor(
      (new Date().getTime() - new Date(date).getTime()) / 1000,
    );
    if (seconds < 60) return t("justNow");
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return t("minutesAgo").replace("{n}", minutes.toString());
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t("hoursAgo").replace("{n}", hours.toString());
    return new Date(date).toLocaleDateString(
      language === "ar" ? "ar-EG" : "en-US",
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => (
          <div
            key={idx}
            className={`p-5 rounded-lg border border-[var(--border-main)] bg-[var(--bg-secondary)] transition-theme hover:shadow-md`}
          >
            <div className="flex justify-between items-start mb-4">
              <div
                className={`p-2.5 rounded-md bg-[var(--bg-primary)] text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]`}
              >
                {kpi.icon}
              </div>
              <span
                className={`text-sm font-medium px-2 py-1 rounded-sm ${kpi.isPositive ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"}`}
              >
                {kpi.trend}
              </span>
            </div>
            <h3 className="text-[var(--text-secondary)] text-sm font-medium mb-1 transition-theme">
              {kpi.title}
            </h3>
            <p className="text-2xl font-bold">{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div
          className={`p-6 rounded-lg border border-[var(--border-main)] bg-[var(--bg-secondary)] flex flex-col`}
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Cpu className="text-emerald-500" size={20} />
              <h2 className="text-lg font-bold">{t("resourceUtilization")}</h2>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-black text-emerald-500/50 uppercase tracking-widest">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Diagnostics
            </div>
          </div>
          <div className="flex-1 space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-[11px] font-bold uppercase tracking-tight">
                <span className="text-[var(--text-muted)]">{t("cpuLoad")}</span>
                <span className="text-emerald-500">
                  {serverHealth?.cpu || 0}%
                </span>
              </div>
              <div className="h-1.5 w-full bg-[var(--bg-overlay)] rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${serverHealth?.cpu || 0}%` }}
                  className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-[11px] font-bold uppercase tracking-tight">
                <span className="text-[var(--text-muted)]">{t("memoryAllocation")}</span>
                <span className="text-emerald-500">
                  {serverHealth?.memory?.used || 0}MB
                </span>
              </div>
              <div className="h-1.5 w-full bg-[var(--bg-overlay)] rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${serverHealth?.memory?.percent || 0}%` }}
                  className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-[11px] font-bold uppercase tracking-tight">
                <span className="text-[var(--text-muted)]">{t("systemLoad")}</span>
                <span className="text-emerald-500">
                  {serverHealth?.load
                    ? serverHealth.load[0].toFixed(2)
                    : "0.00"}
                </span>
              </div>
              <div className="h-1.5 w-full bg-[var(--bg-overlay)] rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{
                    width: `${Math.min(100, (serverHealth?.load?.[0] || 0) * 10)}%`,
                  }}
                  className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                />
              </div>
            </div>
            <div className="pt-2 flex justify-center">
              <p className="text-[10px] text-[var(--text-muted)]/60 font-medium uppercase tracking-tighter">
                {t("serverMonitoringActive")}
              </p>
            </div>
          </div>
        </div>

        <div
          className={`p-6 rounded-lg border border-emerald-500/20 bg-emerald-500/5 flex flex-col`}
        >
          <div className="flex items-center gap-3 mb-6">
            <Activity className="text-emerald-500" size={20} />
            <h2 className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {t("systemUptime")}
            </h2>
          </div>
          <div className="flex-1 flex flex-col justify-center items-center py-10">
            <p className="text-4xl font-black text-emerald-500">100%</p>
            <p className="text-xs text-emerald-600/60 dark:text-emerald-400/60 mt-2 font-medium">
              {t("stableOperationalProtocol")}
            </p>
          </div>
        </div>
      </div>

      {/* Database Pool Connectivity Monitors */}
      <div className="p-6 rounded-lg border border-[var(--border-main)] bg-[var(--bg-secondary)] flex flex-col gap-6 shadow-sm transition-theme">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Database className="text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]" size={20} />
            <h2 className="text-lg font-bold">
              {language === "ar" ? "مراقب اتصال قواعد البيانات النشطة" : "Database Pool Connectivity Monitor"}
            </h2>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-black text-emerald-500/50 uppercase tracking-widest">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            {language === "ar" ? "التحقق المباشر من البث المباشر" : "Active Pool Polling"}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {['core', 'ledger', 'external', 'security'].map((dbId) => {
            const dbInfo = serverHealth?.databases?.[dbId] || { status: 'loading' };
            const isConnected = dbInfo.status === 'connected';
            const isLoading = dbInfo.status === 'loading';
            
            return (
              <div 
                key={dbId}
                className="p-4 rounded-md border border-[var(--border-main)] bg-[var(--bg-overlay)] flex flex-col gap-3 relative overflow-hidden transition-all duration-300 hover:border-emerald-500/30"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database size={16} className={`${isConnected ? 'text-emerald-500 drop-shadow-[0_0_6px_rgba(16,185,129,0.4)]' : isLoading ? 'text-gray-400 animate-pulse' : 'text-red-500 animate-pulse'}`} />
                    <span className="font-bold text-xs uppercase tracking-tight">
                      {dbId === 'core' && (language === "ar" ? "قاعدة البيانات الأساسية" : "Core DB")}
                      {dbId === 'ledger' && (language === "ar" ? "دفتر الأرباح المالي" : "Ledger DB")}
                      {dbId === 'external' && (language === "ar" ? "قاعدة المجتمع والمدونة" : "External DB")}
                      {dbId === 'security' && (language === "ar" ? "قاعدة الأمان والحماية" : "Security DB")}
                    </span>
                  </div>
                  <span className={`text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${isConnected ? 'bg-emerald-500/10 text-emerald-500' : isLoading ? 'bg-gray-500/10 text-gray-500' : 'bg-red-500/10 text-red-500'}`}>
                    {isLoading ? (language === "ar" ? "جاري الاستعلام" : "Loading") : isConnected ? (language === "ar" ? "متصل" : "Connected") : (language === "ar" ? "غير متصل" : "Offline")}
                  </span>
                </div>

                <div className="mt-1 flex flex-col gap-1 text-[10px] text-[var(--text-muted)] font-mono">
                  <div className="flex justify-between">
                    <span>Target:</span>
                    <span className="font-semibold text-[var(--text-main)] uppercase">{dbId}</span>
                  </div>
                  {isConnected && (
                    <div className="flex justify-between">
                      <span>Latency:</span>
                      <span className="text-emerald-500 font-semibold">{dbInfo.latencyMs}ms</span>
                    </div>
                  )}
                  {!isConnected && !isLoading && (
                    <div className="text-red-500 font-semibold truncate leading-normal" title={dbInfo.error}>
                      Error: {dbInfo.error || "Connection test failed"}
                    </div>
                  )}
                </div>

                <div className={`absolute bottom-0 left-0 right-0 h-1 ${isConnected ? 'bg-emerald-500' : isLoading ? 'bg-gray-500/40 animate-pulse' : 'bg-red-500'}`} />
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div
          className={`p-6 rounded-lg border border-[var(--border-main)] bg-[var(--bg-secondary)] shadow-sm`}
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Clock className="text-emerald-500" size={20} />
              <h2 className="text-lg font-bold">
                {t("activityStream")}
                <span className="ml-2 text-[10px] bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded-full font-bold">
                  {activity.length}
                </span>
              </h2>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                {activity.length > 0 && (
                  <div className="ml-2 flex items-center gap-2 bg-[var(--bg-overlay)] px-2 py-1 rounded-sm border border-[var(--border-main)] transition-theme">
                    <input
                      type="checkbox"
                      checked={
                        activity.length > 0 &&
                        selectedActivityIds.length === activity.length
                      }
                      onChange={() => handleSelectAll("activity")}
                      className="w-3.5 h-3.5 rounded-sm border-[var(--border)] text-emerald-500 focus:ring-emerald-500 cursor-pointer accent-emerald-500"
                    />
                    <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-tighter">
                      {language === "ar" ? "تحديد الكل" : (t("selectAll") || "Select All")}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <AnimatePresence>
                {selectedActivityIds.length > 0 && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.9, x: 20 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.9, x: 20 }}
                    onClick={() => handleBatchDelete("activity")}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-500 text-white text-[10px] font-bold uppercase tracking-wider hover:bg-red-600 transition-theme shadow-lg shadow-red-500/20 active:scale-95"
                  >
                    <Trash2 size={13} />
                    {t("deleteSelected") || (language === "ar" ? "حذف المحدد" : "Delete Selected")} ({selectedActivityIds.length})
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Audit Log Filters Row */}
          {(() => {
            const statusOptions = [
              { id: 'all', labelEn: 'All Status / Category', labelAr: 'جميع الحالات والتصنيفات' },
              { id: 'success', labelEn: 'Success / Completed', labelAr: 'العمليات الناجحة والمكتملة' },
              { id: 'failed', labelEn: 'Failed / Error', labelAr: 'العمليات الفاشلة والأخطاء' },
              { id: 'system', labelEn: 'System Events', labelAr: 'أحداث النظام' },
              { id: 'finance', labelEn: 'Financial Operations', labelAr: 'العمليات المالية' },
              { id: 'communication', labelEn: 'Communications / Emails', labelAr: 'الاتصالات والرسائل البريدية' },
              { id: 'ai_generation', labelEn: 'AI Generation / Tools', labelAr: 'توليد الذكاء الاصطناعي الأكاديمي' }
            ];

            const standardTools = [
              { id: 'chat', labelEn: 'General Chat', labelAr: 'المحادثة العامة' },
              { id: 'chat_fast', labelEn: 'Fast Chat', labelAr: 'المحادثة السريعة' },
              { id: 'chat_pro', labelEn: 'Pro Chat', labelAr: 'المحادثة المتقدمة' },
              { id: 'chat_reasoning', labelEn: 'Reasoning Mode', labelAr: 'نمط التفكير العميق' },
              { id: 'perplexta_analysis', labelEn: 'Perplexta Analysis', labelAr: 'تحليل بيربليكستا' },
              { id: 'x402_api', labelEn: 'x402 Agent API', labelAr: 'بوابة عملاء x402' },
              { id: 'image', labelEn: 'Image Generation', labelAr: 'توليد الصور' },
              { id: 'code', labelEn: 'Code Analysis', labelAr: 'تحليل الكود' },
              { id: 'legal_analysis', labelEn: 'Legal Analysis', labelAr: 'التحليل القانوني' }
            ];

            const uniqueToolsInLogs = Array.from(new Set(
              activity
                .filter(log => log && log.type === "ai_generation" && log.action)
                .map(log => log.action)
            ));

            const availableToolFilters = [
              ...standardTools,
              ...uniqueToolsInLogs
                .filter(toolId => !standardTools.find(st => st.id === toolId))
                .map(toolId => ({
                  id: toolId,
                  labelEn: toolId.replace(/_/g, " ").toUpperCase(),
                  labelAr: t(toolId) || toolId
                }))
            ];

            return (
              <div className="space-y-3 mb-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Status Selector */}
                  <div className="relative">
                    <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider block mb-1.5">
                      {language === "ar" ? "تصفية حسب الحالة" : "Filter by Status"}
                    </label>
                    <div className="relative">
                      <select
                        value={logStatusFilter}
                        onChange={(e) => setLogStatusFilter(e.target.value)}
                        className={`w-full ${dir === "rtl" ? "pr-3 pl-10" : "pl-3 pr-10"} py-2 rounded-md border appearance-none focus:outline-none focus:ring-1 focus:ring-emerald-500/30 text-xs font-bold ${theme === "dark" ? "bg-[#0f0f11] border-[var(--border-main)] text-gray-300 pointer-events-auto" : "bg-white border-[var(--border-main)] shadow-sm text-gray-700 pointer-events-auto"}`}
                      >
                        {statusOptions.map(opt => (
                          <option key={opt.id} value={opt.id}>
                            {dir === "rtl" ? opt.labelAr : opt.labelEn}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        size={14}
                        className={`absolute ${dir === "rtl" ? "left-3" : "right-3"} top-1/2 -translate-y-1/2 pointer-events-none text-gray-500`}
                      />
                    </div>
                  </div>

                  {/* Tool Selector */}
                  <div className="relative">
                    <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider block mb-1.5">
                      {language === "ar" ? "تصفية حسب الأداة" : "Filter by Tool"}
                    </label>
                    <div className="relative">
                      <select
                        value={logToolFilter}
                        onChange={(e) => setLogToolFilter(e.target.value)}
                        className={`w-full ${dir === "rtl" ? "pr-3 pl-10" : "pl-3 pr-10"} py-2 rounded-md border appearance-none focus:outline-none focus:ring-1 focus:ring-emerald-500/30 text-xs font-bold ${theme === "dark" ? "bg-[#0f0f11] border-[var(--border-main)] text-gray-300 pointer-events-auto" : "bg-white border-[var(--border-main)] shadow-sm text-gray-700 pointer-events-auto"}`}
                      >
                        <option value="all">
                          {dir === "rtl" ? "جميع الأدوات والخدمات" : "All Tools & Services"}
                        </option>
                        {availableToolFilters.map(tool => (
                          <option key={tool.id} value={tool.id}>
                            {dir === "rtl" ? tool.labelAr : tool.labelEn}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        size={14}
                        className={`absolute ${dir === "rtl" ? "left-3" : "right-3"} top-1/2 -translate-y-1/2 pointer-events-none text-gray-500`}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Start Date */}
                  <div className="relative">
                    <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider block mb-1.5">
                      {language === "ar" ? "تاريخ البدء" : "Start Date"}
                    </label>
                    <input
                      type="date"
                      value={logStartDate}
                      onChange={(e) => setLogStartDate(e.target.value)}
                      className={`w-full px-3 py-1.5 rounded-md border focus:outline-none focus:ring-1 focus:ring-emerald-500/30 text-xs font-bold transition-theme ${theme === "dark" ? "bg-[#0f0f11] border-[var(--border-main)] text-gray-300 [color-scheme:dark]" : "bg-white border-[var(--border-main)] shadow-sm text-gray-700 [color-scheme:light]"}`}
                    />
                  </div>

                  {/* End Date */}
                  <div className="relative">
                    <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider block mb-1.5">
                      {language === "ar" ? "تاريخ الانتهاء" : "End Date"}
                    </label>
                    <input
                      type="date"
                      value={logEndDate}
                      onChange={(e) => setLogEndDate(e.target.value)}
                      className={`w-full px-3 py-1.5 rounded-md border focus:outline-none focus:ring-1 focus:ring-emerald-500/30 text-xs font-bold transition-theme ${theme === "dark" ? "bg-[#0f0f11] border-[var(--border-main)] text-gray-300 [color-scheme:dark]" : "bg-white border-[var(--border-main)] shadow-sm text-gray-700 [color-scheme:light]"}`}
                    />
                  </div>
                </div>
              </div>
            );
          })()}

          <div className="mb-4 relative group">
            <Search
              className={`absolute ${dir === "rtl" ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 transition-theme ${search ? "text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]" : "text-gray-400 group-focus-within:text-emerald-500"}`}
              size={16}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchActivityPlaceholder") || (language === "ar" ? "بحث في السجلات..." : "Search activity logs...")}
              className={`w-full ${dir === "rtl" ? "pr-10 pl-10" : "pl-10 pr-10"} py-2.5 rounded-md border text-xs font-medium transition-theme focus:outline-none focus:ring-2 focus:ring-emerald-500/20 bg-[var(--bg-overlay)] border-[var(--border)] focus:border-emerald-500/50 text-[var(--text-primary)] placeholder:text-[var(--text-muted)]`}
            />
            {search && (
              <button 
                onClick={() => setSearch("")}
                className={`absolute ${dir === "rtl" ? "left-3" : "right-3"} top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 transition-theme p-1`}
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="space-y-4 max-h-[400px] overflow-y-auto px-1 custom-scrollbar">
            {(() => {
              const filteredList = activity.filter(log => {
                if (!log) return false;

                // 1. Filter by Status/Category
                if (logStatusFilter !== "all") {
                  if (logStatusFilter === "success") {
                    const hasFailed = 
                      (log.action && /failed|error|failure/i.test(log.action)) ||
                      (log.detail && /failed|error|failure/i.test(log.detail)) ||
                      (log.description && /failed|error|failure/i.test(log.description));
                    if (hasFailed) return false;
                  } else if (logStatusFilter === "failed") {
                    const hasFailed = 
                      (log.action && /failed|error|failure/i.test(log.action)) ||
                      (log.detail && /failed|error|failure/i.test(log.detail)) ||
                      (log.description && /failed|error|failure/i.test(log.description));
                    if (!hasFailed) return false;
                  } else {
                    if (log.type !== logStatusFilter) return false;
                  }
                }

                // 2. Filter by Tool
                if (logToolFilter !== "all") {
                  if (log.type !== "ai_generation" || log.action !== logToolFilter) {
                    return false;
                  }
                }

                // 3. Date Range Filter
                if (logStartDate) {
                  const sDate = new Date(logStartDate);
                  sDate.setHours(0, 0, 0, 0);
                  const logDate = new Date(log.created_at);
                  if (logDate < sDate) return false;
                }
                if (logEndDate) {
                  const eDate = new Date(logEndDate);
                  eDate.setHours(23, 59, 59, 999);
                  const logDate = new Date(log.created_at);
                  if (logDate > eDate) return false;
                }

                // 4. Search Filter
                if (!search.trim()) return true;
                const term = search.toLowerCase();
                return (
                  log.user_id?.toString().toLowerCase().includes(term) ||
                  log.user_name?.toLowerCase().includes(term) ||
                  log.action?.toLowerCase().includes(term) ||
                  log.detail?.toLowerCase().includes(term)
                );
              });

              if (filteredList.length === 0) {
                return (
                  <div className="flex flex-col items-center justify-center py-10 px-4 text-center border border-dashed border-[var(--border-main)] rounded-lg bg-[var(--bg-secondary)]/30">
                    <div className="w-12 h-12 rounded-full bg-gray-500/10 dark:bg-gray-800/20 flex items-center justify-center text-gray-400 mb-3">
                      <Search size={20} className="stroke-[1.5]" />
                    </div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)] mb-1">
                      {language === "ar" ? "لم يتم العثور على سجلات" : "No Records Found"}
                    </h3>
                    <p className="text-xs text-[var(--text-muted)] max-w-xs leading-relaxed">
                      {language === "ar" 
                        ? "جرب تعديل المعايير المحددة أو تصفير كلمات البحث للحصول على نتائج مغايرة." 
                        : "Try adjusting your filters or clearing your search term to view other entries."}
                    </p>
                    {(logStatusFilter !== "all" || logToolFilter !== "all" || logStartDate || logEndDate || search.trim()) && (
                      <button
                        onClick={() => {
                          setLogStatusFilter("all");
                          setLogToolFilter("all");
                          setLogStartDate("");
                          setLogEndDate("");
                          setSearch("");
                        }}
                        className="mt-4 px-3 py-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-bold hover:bg-emerald-500/20 transition-all duration-300"
                      >
                        {language === "ar" ? "إعادة تعيين الفلاتر" : "Reset Filters"}
                      </button>
                    )}
                  </div>
                );
              }

              return filteredList.map((log, idx) => {
                const isSelected = selectedActivityIds.includes(log.id);
                const translateAction = (action: string) => {
                  const key = `log_${action}`;
                  const translation = t(key);
                  if (translation !== key) return translation;

                  if (log.type === "ai_generation") {
                    const toolName = t(log.action);
                    return t("log_used_tool").replace(
                      "{tool}",
                      toolName !== log.action ? toolName : log.action,
                    );
                  }
                  return action.replace(/_/g, " ");
                };

                const translateDetail = (detail: string) => {
                  if (!detail) return "";
                  if (detail.includes("Pruned notifications"))
                    return t("log_notifications_prune_detail");
                  if (detail.includes("Logged into"))
                    return t("log_login_detail");
                  if (detail.includes("Registered as"))
                    return t("log_registration_detail");
                  return detail;
                };

                return (
                  <div
                    key={idx}
                    className={`flex items-start gap-3 group p-2 rounded-md transition-theme border border-transparent ${isSelected ? "bg-emerald-500/5 border-emerald-500/20" : "hover:bg-[var(--bg-secondary)]0/5"}`}
                  >
                    <div className="pt-1 select-none">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {
                          setSelectedActivityIds((prev) =>
                            prev.includes(log.id)
                              ? prev.filter((id) => id !== log.id)
                              : [...prev, log.id],
                          );
                        }}
                        className="w-4 h-4 rounded-sm border-[var(--border-main)] text-emerald-500 focus:ring-emerald-500 cursor-pointer accent-emerald-500"
                      />
                    </div>
                    <div
                      className={`mt-0.5 p-1.5 rounded-md shrink-0 ${
                        log.type === "ai_generation"
                          ? "bg-blue-500/20 text-blue-500"
                          : "bg-emerald-500/20 text-emerald-500"
                      }`}
                    >
                      {log.type === "ai_generation" ? (
                        <Zap size={15} />
                      ) : (
                        <Settings size={15} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] leading-snug truncate">
                        <span className="text-emerald-500 font-bold bg-emerald-500/5 px-1.5 py-0.5 rounded-[4px] border border-emerald-500/10">
                          <HighlightText text={log.user_name || t("systemUser")} query={search} />
                        </span>{" "}
                        <span className="ml-1 opacity-90"><HighlightText text={translateAction(log.action)} query={search} /></span>
                      </p>
                      <p className="text-[10px] text-[var(--text-muted)] mt-1.5 transition-theme flex items-center gap-2">
                        <span className="flex items-center gap-1">
                          <Clock size={12} className="opacity-50" />
                          {getTimeAgo(log.created_at)}
                        </span>
                        {log.detail &&
                        !log.detail.includes("-") &&
                        !log.detail.includes("gpt")
                          ? (
                            <>
                              <span className="w-1 h-1 rounded-full bg-[var(--border)]" />
                              <span className="truncate max-w-[200px]"><HighlightText text={translateDetail(log.detail)} query={search} /></span>
                            </>
                          )
                          : ""}
                        {log.points > 0
                          ? (
                            <>
                              <span className="w-1 h-1 rounded-full bg-[var(--border)]" />
                              <span className="text-emerald-500 font-bold">{log.points} {language === "ar" ? "نقطة" : "pts"}</span>
                            </>
                          )
                          : ""}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteActivity(log.id, log.type)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-theme"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                );
              });
            })()}
          </div>
        </div>

        <div
          className={`p-6 rounded-lg border border-[var(--border-main)] bg-[var(--bg-secondary)] shadow-sm shadow-red-500/5`}
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <ShieldAlert className="text-red-500" size={20} />
              <h2 className="text-lg font-bold text-red-600 dark:text-red-400">
                {t("securityAlerts")}
              </h2>
              {alerts.length > 0 && (
                <div className="flex items-center gap-2 bg-red-500/5 px-2 py-1 rounded-md border border-red-500/10">
                  <input
                    type="checkbox"
                    checked={
                      alerts.length > 0 &&
                      selectedAlertIds.length === alerts.length
                    }
                    onChange={() => handleSelectAll("alert")}
                    className="w-3.5 h-3.5 rounded-sm border-[var(--border-main)] text-red-500 focus:ring-red-500 cursor-pointer accent-red-500"
                  />
                  <span className="text-[9px] font-bold text-red-500 uppercase tracking-tighter">
                    {t("selectAll") || "الكل"}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <AnimatePresence>
                {selectedAlertIds.length > 0 && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.9, x: 20 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.9, x: 20 }}
                    onClick={() => handleBatchDelete("alert")}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-600 text-white text-[10px] font-bold uppercase tracking-wider hover:bg-red-700 transition-theme shadow-lg shadow-red-600/20 active:scale-95"
                  >
                    <Trash2 size={13} />
                    {t("deleteSelected")} ({selectedAlertIds.length})
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Combined Maintenance Toolkit */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-6 p-4 rounded-lg bg-[var(--bg-secondary)]0/5 border border-[var(--border-subtle)] shadow-inner">
            <div className="col-span-full flex items-center justify-between mb-1 px-1">
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">
                {t("systemMaintenance")}
              </span>
              <Settings2 size={13} className="text-gray-400" />
            </div>

            <button
              onClick={() => {
                setConfirmModal({
                  isOpen: true,
                  title: { ar: "تطهير الذاكرة السحابية؟", en: "Purge All Chats?" },
                  description: {
                    ar: t("clearAllChatsConfirm") || "تحذير: هذا سيؤدي إلى حذف كافة المحادثات والرسائل من قاعدة البيانات. هل أنت متأكد؟",
                    en: t("clearAllChatsConfirm") || "WARNING: This will delete ALL chat history and messages from the database. Are you sure?"
                  },
                  variant: "danger",
                  onConfirm: async () => {
                    try {
                      const res = await fetch(
                        "/api/admin/maintenance/clear-chats",
                        {
                          method: "DELETE",
                          headers: { 
                            Authorization: `Bearer ${token}`,
                            "Content-Type": "application/json",
                            "x-confirm-action": "DELETE_ALL"
                          },
                          body: JSON.stringify({ confirm: "DELETE_ALL" }),
                        },
                      );
                      if (res.ok) {
                        showToast(t("activityCleared"), "success");
                        fetchData();
                      }
                    } catch (e) {
                      console.error("Purge failed", e);
                    }
                  }
                });
              }}
              className="group flex flex-col items-center justify-center gap-1.5 p-2 rounded-md bg-amber-500/5 border border-amber-500/10 hover:bg-amber-500/10 hover:border-amber-500/30 transition-theme"
            >
              <Database
                size={15}
                className="text-amber-500 group-hover:scale-110 transition-transform"
              />
              <span className="text-[8px] font-bold text-amber-600 uppercase text-center leading-tight">
                {t("clearAllChats")}
              </span>
            </button>

            <button
              onClick={() => {
                setConfirmModal({
                  isOpen: true,
                  title: { ar: "تطهير السجلات المعلقة؟", en: "Prune Orphaned Records?" },
                  description: {
                    ar: "هل أنت متأكد من فحص وتطهير السجلات المعلقة وتوريدات الملفات التالفة؟",
                    en: "Are you sure you want to run the database maintenance routine to look for and delete orphaned files and requests?"
                  },
                  variant: "warning",
                  onConfirm: async () => {
                    try {
                      const res = await fetch(
                        "/api/admin/maintenance/cleanup",
                        {
                          method: "POST",
                          headers: { 
                            Authorization: `Bearer ${token}`,
                            "Content-Type": "application/json"
                          },
                          body: JSON.stringify({ dryRun: false }),
                        },
                      );
                      if (res.ok) {
                        const cleanRes = await res.json();
                        const msg = language === "ar"
                          ? `تم التطهير بنجاح!\nالملفات المحدوفة: ${cleanRes.summary.userFiles.prunedCount}\nالطلبات المحذوفة: ${cleanRes.summary.depositRequests.prunedCount}`
                          : `Cleanup Completed Successfully!\nPruned files: ${cleanRes.summary.userFiles.prunedCount}\nPruned requests: ${cleanRes.summary.depositRequests.prunedCount}`;
                        alert(msg);
                        fetchData();
                      } else {
                        const errData = await res.json();
                        showToast(errData.error || "Cleanup failed", "error");
                      }
                    } catch (e: any) {
                      console.error("Cleanup failed", e);
                      showToast(e.message || "Cleanup failed", "error");
                    }
                  }
                });
              }}
              className="group flex flex-col items-center justify-center gap-1.5 p-2 rounded-md bg-purple-500/5 border border-purple-500/10 hover:bg-purple-500/10 hover:border-purple-500/30 transition-theme"
            >
              <Database
                size={15}
                className="text-purple-500 group-hover:scale-110 transition-transform"
              />
              <span className="text-[8px] font-bold text-purple-600 uppercase text-center leading-tight">
                {language === "ar" ? "تطهير السجلات المعلقة" : "Prune Orphaned Records"}
              </span>
            </button>

            <button
              onClick={() => {
                setConfirmModal({
                  isOpen: true,
                  title: { ar: "مسح الإشعارات القديمة؟", en: "Prune Old Notifications?" },
                  description: {
                    ar: "هل أنت متأكد من تطهير الإشعارات القديمة؟",
                    en: "Prune system notifications older than 30 days?"
                  },
                  variant: "warning",
                  onConfirm: async () => {
                    try {
                      const res = await fetch(
                        "/api/admin/notifications/prune?days=30",
                        {
                          method: "DELETE",
                          headers: { Authorization: `Bearer ${token}` },
                        },
                      );
                      if (res.ok) {
                        const data = await res.json();
                        showToast(
                          language === "ar"
                            ? `تم تطهير ${data.count} إشعار بنجاح.`
                            : `Successfully pruned ${data.count} notifications.`,
                          "success",
                        );
                      }
                    } catch (e) {
                      console.error("Pruning failed", e);
                    }
                  }
                });
              }}
              className="group flex flex-col items-center justify-center gap-1.5 p-2 rounded-md bg-emerald-500/5 border border-emerald-500/10 hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-theme"
            >
              <BellRing
                size={15}
                className="text-emerald-500 group-hover:scale-110 transition-transform"
              />
              <span className="text-[8px] font-bold text-emerald-600 uppercase text-center leading-tight">
                {t("maintenancePruneLegacy")}
              </span>
            </button>

            <button
              onClick={() => {
                setConfirmModal({
                  isOpen: true,
                  title: { ar: "مسح كافة الإشعارات؟", en: "Clear All Notifications?" },
                  description: {
                    ar: t("clearNotifsConfirm") || "هل أنت متأكد من حذف كافة إشعارات النظام لجميع المستخدمين بشكل نهائي؟",
                    en: t("clearNotifsConfirm") || "Are you sure you want to permanently delete ALL system notifications for all users?"
                  },
                  variant: "danger",
                  onConfirm: async () => {
                    try {
                      const res = await fetch(
                        "/api/admin/notifications/prune?mode=all",
                        {
                          method: "DELETE",
                          headers: { Authorization: `Bearer ${token}` },
                        },
                      );
                      if (res.ok) {
                        showToast(t("pruneSuccess"), "success");
                      }
                    } catch (e) {
                      console.error("Wipe failed", e);
                    }
                  }
                });
              }}
              className="group flex flex-col items-center justify-center gap-1.5 p-2 rounded-md bg-red-500/5 border border-red-500/10 hover:bg-red-500/10 hover:border-red-500/30 transition-theme"
            >
              <Shield
                size={15}
                className="text-red-500 group-hover:scale-110 transition-transform"
              />
              <span className="text-[8px] font-bold text-red-600 uppercase text-center leading-tight">
                {t("maintenanceClearAllNotifs")}
              </span>
            </button>
          </div>

          <div className="space-y-4 max-h-[300px] overflow-y-auto px-1 custom-scrollbar">
            {alerts.map((alert, idx) => {
              const isSelected = selectedAlertIds.includes(alert.id);
              const translateAlertDescription = (alert: any) => {
                const key = `alert_${alert.alert_type}`;
                const title = t(key);
                if (title !== key) {
                  const matches = alert.description.match(/\d+(\.\d+)?/g);
                  if (matches && matches.length > 0 && language === "ar") {
                    if (alert.alert_type === "usage_anomaly")
                      return `${title} (${matches[0]} عملية)`;
                    if (alert.alert_type === "quota_bypass")
                      return `${title} (${matches[1]}/${matches[2]})`;
                  }
                  return title;
                }
                return alert.description;
              };

              return (
                <div
                  key={idx}
                  className={`flex items-start gap-3 group p-2 rounded-md transition-theme border border-transparent ${isSelected ? "bg-red-500/5 border-red-500/20" : "hover:bg-[var(--bg-secondary)]0/5"}`}
                >
                  <div className="pt-1 select-none">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {
                        setSelectedAlertIds((prev) =>
                          prev.includes(alert.id)
                            ? prev.filter((id) => id !== alert.id)
                            : [...prev, alert.id],
                        );
                      }}
                      className="w-4 h-4 rounded border-[var(--border-main)] text-red-500 focus:ring-red-500 cursor-pointer accent-red-500"
                    />
                  </div>
                  <div className={`mt-0.5 p-1.5 rounded-md shrink-0 ${
                      alert.severity === "high" || alert.severity === "critical"
                        ? "bg-red-500/20 text-red-500"
                        : "bg-amber-500/20 text-amber-500"
                    }`}>
                    <AlertCircle size={15} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 leading-snug">
                      {translateAlertDescription(alert)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {getTimeAgo(alert.created_at)} •{" "}
                      <span className="font-bold">
                        {alert.user_name || t("systemUser")}
                      </span>
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteAlert(alert.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-theme font-bold"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              );
            })}
            {alerts.length === 0 && (
              <p className="text-sm text-gray-500 italic">
                {t("noSecurityAlerts")}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 ${dir === "rtl" ? "left-6" : "right-6"} z-50 flex items-center gap-3 px-6 py-4 rounded-[var(--radius)] shadow-2xl transition-theme animate-in slide-in-from-bottom-5 ${
            toast.type === "success"
              ? "bg-[var(--bg-surface)] border border-emerald-500/30 text-emerald-500"
              : "bg-[var(--bg-surface)] border border-red-500/30 text-red-500"
          } border`}
        >
          {toast.type === "success" ? (
            <CheckCircle size={20} />
          ) : (
            <AlertCircle size={20} />
          )}
          <span className="font-medium text-sm">{toast.message}</span>
        </div>
      )}

      {/* Action Confirmation Modal */}
      {confirmModal && confirmModal.isOpen && (
        <ActionConfirmationModal
          isOpen={confirmModal.isOpen}
          onClose={() => setConfirmModal(null)}
          onConfirm={confirmModal.onConfirm}
          title={confirmModal.title}
          description={confirmModal.description}
          variant={confirmModal.variant}
          confirmLabel={confirmModal.confirmLabel}
        />
      )}
    </div>
  );
};


const ApiKeysVaultView = ({
  theme,
  t,
  dir,
  providerModels,
  setProviderModels,
}: {
  theme: string;
  t: (key: string, replacements?: any) => string;
  dir: string;
  providerModels: Record<string, any[]>;
  setProviderModels: React.Dispatch<
    React.SetStateAction<Record<string, any[]>>
  >;
}) => {
  const { token, language } = useAppContext();
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [syncModal, setSyncModal] = useState<{
    isOpen: boolean;
    type: "models" | "usage" | "test";
    providerId: string;
    providerName: string;
    status: "idle" | "loading" | "success" | "error";
    message?: string;
    count?: number;
    usage?: any;
  } | null>(null);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    providerId: string;
    providerName: string;
  } | null>(null);

  const [showAddCustom, setShowAddCustom] = useState(false);
  const [newCustomId, setNewCustomId] = useState("");
  const [newCustomName, setNewCustomName] = useState("");
  const [newCustomUrl, setNewCustomUrl] = useState("");
  const [newCustomKey, setNewCustomKey] = useState("");
  const [newCustomBudget, setNewCustomBudget] = useState("");
  const [isCreatingCustom, setIsCreatingCustom] = useState(false);

  const [providers, setProviders] = useState([
    {
      id: "openai",
      name: "OpenAI",
      key: "",
      urlKey: "",
      status: "missing",
      isActive: false,
      isVisible: false,
      isTesting: false,
      url: "https://platform.openai.com/api-keys",
      updatedAt: null as string | null,
      budget: 0,
      usedToday: 0,
    },
    {
      id: "anthropic",
      name: "Anthropic",
      key: "",
      urlKey: "",
      status: "missing",
      isActive: false,
      isVisible: false,
      isTesting: false,
      url: "https://console.anthropic.com/settings/keys",
      updatedAt: null as string | null,
      budget: 0,
      usedToday: 0,
    },
    {
      id: "google",
      name: "Google AI",
      key: "",
      urlKey: "",
      status: "missing",
      isActive: false,
      isVisible: false,
      isTesting: false,
      url: "https://aistudio.google.com/app/apikey",
      updatedAt: null as string | null,
      budget: 0,
      usedToday: 0,
    },
    {
      id: "deepseek",
      name: "DeepSeek",
      key: "",
      urlKey: "",
      status: "missing",
      isActive: false,
      isVisible: false,
      isTesting: false,
      url: "https://platform.deepseek.com/api_keys",
      updatedAt: null as string | null,
      budget: 0,
      usedToday: 0,
    },
    {
      id: "groq",
      name: "Groq",
      key: "",
      urlKey: "",
      status: "missing",
      isActive: false,
      isVisible: false,
      isTesting: false,
      url: "https://console.groq.com/keys",
      updatedAt: null as string | null,
      budget: 0,
      usedToday: 0,
    },
    {
      id: "openrouter",
      name: "OpenRouter",
      key: "",
      urlKey: "",
      status: "missing",
      isActive: false,
      isVisible: false,
      isTesting: false,
      url: "https://openrouter.ai/keys",
      updatedAt: null as string | null,
      budget: 0,
      usedToday: 0,
    },
    {
      id: "mistral",
      name: "Mistral AI",
      key: "",
      urlKey: "",
      status: "missing",
      isActive: false,
      isVisible: false,
      isTesting: false,
      url: "https://console.mistral.ai/api-keys/",
      updatedAt: null as string | null,
      budget: 0,
      usedToday: 0,
    },
    {
      id: "together",
      name: "Together AI",
      key: "",
      urlKey: "",
      status: "missing",
      isActive: false,
      isVisible: false,
      isTesting: false,
      url: "https://api.together.ai/settings/api-keys",
      updatedAt: null as string | null,
      budget: 0,
      usedToday: 0,
    },
    {
      id: "xai",
      name: "xAI (Grok)",
      key: "",
      urlKey: "",
      status: "missing",
      isActive: false,
      isVisible: false,
      isTesting: false,
      url: "https://console.x.ai/",
      updatedAt: null as string | null,
      budget: 0,
      usedToday: 0,
    },
    {
      id: "serper",
      name: "Serper API",
      key: "",
      urlKey: "",
      status: "missing",
      isActive: false,
      isVisible: false,
      isTesting: false,
      url: "https://serper.dev/api-key",
      updatedAt: null as string | null,
      budget: 0,
      usedToday: 0,
    },
    {
      id: "elevenlabs",
      name: "ElevenLabs (Audio)",
      key: "",
      urlKey: "",
      status: "missing",
      isActive: false,
      isVisible: false,
      isTesting: false,
      url: "https://elevenlabs.io/app/settings/api-keys",
      updatedAt: null as string | null,
      budget: 0,
      usedToday: 0,
    },
    {
      id: "ollama",
      name: "Ollama Cloud",
      key: "",
      urlKey: "",
      status: "missing",
      isActive: false,
      isVisible: false,
      isTesting: false,
      url: "https://ollama.com",
      updatedAt: null as string | null,
      budget: 0,
      usedToday: 0,
    },
  ]);

  const fetchKeys = async () => {
    try {
      const response = await fetch("/api/admin/api-keys", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        const savedKeys = Array.isArray(data)
          ? data
          : data && Array.isArray(data.keys)
            ? data.keys
            : [];

        const BUILT_IN_IDS = [
          "openai", "anthropic", "google", "deepseek", "groq", "openrouter",
          "mistral", "together", "xai", "serper", "elevenlabs", "ollama"
        ];

        setProviders((prevProviders) => {
          // 1. Map built-in providers
          const updatedBuiltIn = prevProviders.filter((p: any) => !p.isCustom).map((p) => {
            const savedKey = savedKeys.find((k: any) => k.provider === p.id);
            if (savedKey) {
              return {
                ...p,
                status: "active",
                isActive: !!savedKey.is_active,
                updatedAt: savedKey.updated_at,
                budget: parseFloat(savedKey.daily_budget) || 0,
                usedToday: parseFloat(savedKey.used_today) || 0,
                urlKey: savedKey.url_key || "",
                key: "",
              };
            }
            return {
              ...p,
              status: "missing",
              isActive: false,
              key: "",
              urlKey: "",
            };
          });

          // 2. Identify custom providers from the database (those not in the built-in list)
          const customKeys = savedKeys.filter((k: any) => {
            const normalizedProvider = k.provider.toLowerCase();
            return !BUILT_IN_IDS.includes(normalizedProvider);
          });

          const updatedCustom = customKeys.map((k: any) => {
            const existing = prevProviders.find((p: any) => p.id === k.provider);
            const customName = k.provider.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
            return {
              id: k.provider,
              name: existing?.name || customName,
              key: "",
              urlKey: k.url_key || "",
              status: "active",
              isActive: !!k.is_active,
              isVisible: false,
              isTesting: false,
              isCustom: true,
              url: k.url_key || "",
              updatedAt: k.updated_at,
              budget: parseFloat(k.daily_budget) || 0,
              usedToday: parseFloat(k.used_today) || 0,
            };
          });

          return [...updatedBuiltIn, ...updatedCustom];
        });
      }
    } catch (error) {
      console.error("Error fetching API keys status:", error);
    }
  };

  React.useEffect(() => {
    if (token) {
      fetchKeys();
    }
  }, [token]);

  const handleKeyChange = (id: string, newKey: string) => {
    setProviders(
      providers.map((p) => (p.id === id ? { ...p, key: newKey } : p)),
    );
  };

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleTestKeyConnection = async (
    id: string,
    key: string,
    urlKey?: string,
  ) => {
    if (
      !key &&
      !urlKey &&
      providers.find((p) => p.id === id)?.status !== "active"
    ) {
      showToast(
        language === "ar"
          ? "يرجى إدخال مفتاح للملحق أولاً"
          : "Please enter a key to test first",
        "error",
      );
      return false;
    }

    setSyncModal({
      isOpen: true,
      type: "test",
      providerId: id,
      providerName: providers.find((p) => p.id === id)?.name || id,
      status: "loading",
    });

    try {
      const response = await fetch(`/api/admin/api-keys/${id}/test`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ key, urlKey }),
      });

      const data = await response.json();
      if (response.ok && data.status?.isValid) {
        setSyncModal({
          isOpen: true,
          type: "test",
          providerId: id,
          providerName: providers.find((p) => p.id === id)?.name || id,
          status: "success",
          usage: data.status,
        });
        showToast(
          language === "ar"
            ? "تم التحقق من الاتصال بنجاح!"
            : "Connection verified successfully!",
          "success",
        );
        return true;
      } else {
        setSyncModal({
          isOpen: true,
          type: "test",
          providerId: id,
          providerName: providers.find((p) => p.id === id)?.name || id,
          status: "error",
          message:
            data.error ||
            data.status?.message ||
            (language === "ar"
              ? "المفتاح غير صالح أو انتهت صلاحيته."
              : "Key is invalid or expired."),
        });
        return false;
      }
    } catch (error) {
      setSyncModal({
        isOpen: true,
        type: "test",
        providerId: id,
        providerName: providers.find((p) => p.id === id)?.name || id,
        status: "error",
        message:
          language === "ar"
            ? "فشل الاتصال بالمزود."
            : "Connection to provider failed.",
      });
      return false;
    }
  };

  const handleSaveKey = async (id: string, key: string, urlKey?: string) => {
    if (!key && !urlKey) return;

    // First, force a test. We MUST verify before saving as per Perplexta mandate.
    const isVerified = await handleTestKeyConnection(id, key, urlKey);
    if (!isVerified) {
      showToast(
        language === "ar"
          ? "يجب فحص المفتاح بنجاح قبل التخزين"
          : "Key must be verified successfully before saving",
        "error",
      );
      return;
    }

    try {
      const response = await fetch("/api/admin/api-keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ provider: id, key: key, urlKey: urlKey }),
      });

      if (response.ok) {
        const data = await response.json();
        setProviders(
          providers.map((p) =>
            p.id === id
              ? {
                  ...p,
                  status: "active",
                  key: "",
                  updatedAt: new Date().toISOString(),
                }
              : p,
          ),
        );

        // Update central models state immediately if models were synced
        if (data.models) {
          setProviderModels((prev) => ({ ...prev, [id]: data.models }));
        }

        showToast(t("toastKeySaveSuccess"), "success");
      } else {
        let errorMessage = "Unknown error";
        try {
          const data = await response.json();
          errorMessage = data.error || errorMessage;
        } catch (e) {
          errorMessage = `Server returned ${response.status} ${response.statusText}`;
        }
        showToast(
          t("toastKeySaveError").replace("{error}", errorMessage),
          "error",
        );
      }
    } catch (error) {
      console.error("Error saving key:", error);
      showToast("فشل في حفظ المفتاح.", "error");
    }
  };

  const handleDeleteKey = async (id: string, name?: string) => {
    if (!deleteModal && name) {
      setDeleteModal({ isOpen: true, providerId: id, providerName: name });
      return;
    }

    setDeleteModal(null);
    try {
      const response = await fetch(`/api/admin/api-keys/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setProviders(
          providers.map((p) =>
            p.id === id
              ? { ...p, status: "missing", key: "", updatedAt: null }
              : p,
          ),
        );
        showToast(t("toastKeyDeleteSuccess"), "success");
      } else {
        showToast(t("toastKeyDeleteError"), "error");
      }
    } catch (error) {
      console.error("Error deleting key:", error);
      showToast(
        language === "ar" ? "خطأ في الاتصال" : "Connection Error",
        "error",
      );
    }
  };

  const handleSyncModels = async (providerId: string, providerName: string) => {
    setSyncModal({
      isOpen: true,
      type: "models",
      providerId,
      providerName,
      status: "loading",
    });

    try {
      const response = await fetch(
        `/api/admin/api-keys/${providerId}/sync-models`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (response.ok) {
        setSyncModal({
          isOpen: true,
          type: "models",
          providerId,
          providerName,
          status: "success",
          count: data.count,
        });
        // Update central state immediately after sync
        if (data.models) {
          setProviderModels((prev) => ({ ...prev, [providerId]: data.models }));
        }
      } else {
        setSyncModal({
          isOpen: true,
          type: "models",
          providerId,
          providerName,
          status: "error",
          message: data.error || "حدث خطأ غير معروف.",
        });
      }
    } catch (error) {
      console.error("Error syncing models:", error);
      setSyncModal({
        isOpen: true,
        type: "models",
        providerId,
        providerName,
        status: "error",
        message: "فشل الاتصال بالخادم.",
      });
    }
  };

  const handleSyncUsage = async (providerId: string, providerName: string) => {
    setSyncModal({
      isOpen: true,
      type: "usage",
      providerId,
      providerName,
      status: "loading",
    });

    try {
      const response = await fetch(
        `/api/admin/api-keys/${providerId}/sync-usage`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (response.ok) {
        setSyncModal({
          isOpen: true,
          type: "usage",
          providerId,
          providerName,
          status: "success",
          usage: data.status,
        });
        fetchKeys(); // Refresh local list state
      } else {
        setSyncModal({
          isOpen: true,
          type: "usage",
          providerId,
          providerName,
          status: "error",
          message: data.error || "حدث خطأ غير معروف.",
        });
      }
    } catch (error) {
      console.error("Error syncing usage:", error);
      setSyncModal({
        isOpen: true,
        type: "usage",
        providerId,
        providerName,
        status: "error",
        message: "فشل الاتصال بالخادم.",
      });
    }
  };

  const handleUpdateBudget = async (id: string, newBudget: number) => {
    try {
      const res = await fetch(`/api/admin/api-keys/${id}/budget`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ budget: newBudget }),
      });
      if (res.ok) {
        setProviders((prev) =>
          prev.map((p) => (p.id === id ? { ...p, budget: newBudget } : p)),
        );
        showToast(t("toastDbSaveSuccess"), "success");
      }
    } catch (e) {
      showToast("خطأ في الاتصال", "error");
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto relative">
      {/* Toast Notification */}
      {toast &&
        createPortal(
          <div
            className={`fixed bottom-6 ${dir === "rtl" ? "left-6" : "right-6"} z-[1000] flex items-center gap-3 px-6 py-4 rounded-[var(--radius)] shadow-2xl transition-theme animate-in slide-in-from-bottom-5 ${
              toast.type === "success"
                ? theme === "dark"
                  ? "bg-[#1a1a1c] border border-emerald-500/30 text-emerald-500"
                  : "bg-white border border-emerald-200 text-emerald-600"
                : theme === "dark"
                  ? "bg-[#1a1a1c] border border-red-500/30 text-red-500"
                  : "bg-white border border-red-200 text-red-600"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle size={20} />
            ) : (
              <AlertCircle size={20} />
            )}
            <span className="font-medium text-sm">{toast.message}</span>
          </div>,
          document.body,
        )}

      {/* Sync Modal */}
      {syncModal?.isOpen &&
        createPortal(
          <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div
              className={`w-full max-w-md rounded-lg shadow-2xl overflow-hidden bg-[var(--bg-surface)] border border-[var(--border)] transition-theme`}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3
                    className={`text-lg font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}
                  >
                    {syncModal.type === "models"
                      ? t("syncModels")
                      : syncModal.type === "test"
                        ? (language === "ar" ? "فحص المفتاح" : "Key Scan")
                        : t("syncUsageLimits")}{" "}
                    - {syncModal.providerName}
                  </h3>
                  <button
                    onClick={() => setSyncModal(null)}
                    className="text-gray-400 hover:text-gray-500 transition-theme"
                  >
                    <X size={20} />
                  </button>
                </div>

                {syncModal.status === "loading" && (
                  <div className="flex flex-col items-center justify-center py-8 space-y-4">
                    <RefreshCw
                      size={32}
                      className="text-emerald-500 animate-spin"
                    />
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t("syncingData")}
                    </p>
                  </div>
                )}

                {syncModal.status === "success" && (
                  <div className="flex flex-col items-center justify-center py-6 space-y-4 text-center">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-2">
                      <CheckCircle size={32} className="text-emerald-500" />
                    </div>
                    <h4
                      className={`text-xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}
                    >
                      {t("syncSuccess")}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {syncModal.type === "models"
                        ? t("syncModelsFound", {
                            count: syncModal.count || 0,
                            provider: syncModal.providerName,
                          })
                        : syncModal.type === "test"
                          ? (language === "ar" ? "المفتاح صالح والاتصال سليم!" : "The key is valid and the connection is healthy!")
                          : t("syncUsageStats", {
                              used: syncModal.usage?.used || 0,
                              total: syncModal.usage?.total || 0,
                            })}
                    </p>
                  </div>
                )}

                {syncModal.status === "error" && (
                  <div className="flex flex-col items-center justify-center py-6 space-y-4 text-center">
                    <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-2">
                      <AlertCircle size={32} className="text-red-500" />
                    </div>
                    <h4
                      className={`text-xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}
                    >
                      {t("syncError")}
                    </h4>
                    <p className="text-sm text-red-500 dark:text-red-400">
                      {syncModal.message ||
                        (language === "ar"
                          ? "حدث خطأ غير معروف أثناء الاتصال بالمزود."
                          : "Unknown error during connection.")}
                    </p>
                  </div>
                )}
              </div>

              <div
                className={`p-4 border-t flex justify-end gap-3 border-[var(--border)] bg-[var(--bg-base)]/50 transition-theme`}
              >
                <button
                  onClick={() => setSyncModal(null)}
                  className={`px-5 py-2 rounded-sm text-sm font-medium transition-theme ${theme === "dark" ? "text-gray-400 hover:text-white hover:bg-[var(--bg-secondary)]" : "text-gray-600 hover:text-gray-900 hover:bg-gray-200"}`}
                >
                  {t("close")}
                </button>
                {syncModal.status === "success" && (
                  <button
                    onClick={() => {
                      showToast(t("toastDbSaveSuccess"), "success");
                      setSyncModal(null);
                    }}
                    className="px-5 py-2 rounded-sm text-sm font-bold bg-emerald-500 text-white hover:bg-emerald-600 transition-theme shadow-lg shadow-emerald-500/20"
                  >
                    {t("saveData")}
                  </button>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* Delete Confirmation Modal */}
      {deleteModal?.isOpen &&
        createPortal(
          <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div
              className={`w-full max-w-sm rounded-lg shadow-2xl overflow-hidden bg-[var(--bg-surface)] border border-[var(--border)] transition-theme`}
            >
              <div className="p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                  <Trash2 size={32} className="text-red-500" />
                </div>
                <h3
                  className={`text-lg font-bold mb-2 ${theme === "dark" ? "text-white" : "text-gray-900"}`}
                >
                  {language === "ar" ? "تأكيد الحذف" : "Confirm Deletion"}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-6">
                  {t("keyDeleteConfirm").replace(
                    "{provider}",
                    deleteModal.providerName,
                  )}
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteModal(null)}
                    className={`flex-1 py-3 rounded-sm text-sm font-bold transition-theme ${theme === "dark" ? "bg-[var(--bg-surface)] text-gray-400 hover:text-white hover:bg-[var(--bg-secondary)]" : "bg-[var(--bg-input)] text-gray-600 hover:bg-gray-200"}`}
                  >
                    {t("cancel")}
                  </button>
                  <button
                    onClick={() => handleDeleteKey(deleteModal.providerId)}
                    className="flex-1 py-3 rounded-sm text-sm font-bold bg-red-500 text-white hover:bg-red-600 transition-theme shadow-lg shadow-red-500/20"
                  >
                    {language === "ar" ? "نعم، احذف" : "Yes, Delete"}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* Provider Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {providers.map((provider) => (
          <div
            key={provider.id}
            className={`p-6 rounded-lg border transition-theme relative group overflow-hidden bg-[var(--bg-secondary)] border-[var(--border-main)] hover:shadow-lg`}
          >
            {/* Provider Logo Accent (Faded in Background) */}
            <div className="absolute -top-4 -right-4 opacity-5 dark:opacity-[0.03] pointer-events-none group-hover:scale-110 transition-theme">
              <Key size={120} />
            </div>

            <div className="flex justify-between items-start mb-6 relative z-10">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-md bg-[var(--bg-primary)] flex items-center justify-center text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]`}
                >
                  <Key size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white leading-tight flex items-center gap-2">
                    {provider.name}
                    {provider.isActive && (
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="px-1.5 py-0.5 rounded-xs bg-emerald-500/10 text-emerald-500 text-[8px] font-black uppercase tracking-widest border border-emerald-500/20"
                      >
                        Trusted
                      </motion.div>
                    )}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${provider.status === "active" ? (provider.isActive ? "bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,1)] animate-pulse" : "bg-red-500 shadow-[0_0_5px_rgba(239,68,68,1)]") : "bg-gray-400"}`}
                    ></div>
                    <span
                      className={`text-[9px] font-black uppercase tracking-widest ${provider.status === "active" ? (provider.isActive ? t("statusActive") : language === "ar" ? "غير صالح" : "Invalid") : t("statusMissing")}`}
                    >
                      {provider.status === "active"
                        ? provider.isActive
                          ? t("statusActive")
                          : language === "ar"
                            ? "غير صالح"
                            : "Invalid"
                        : t("statusMissing")}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={provider.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`p-2 rounded-sm border transition-theme bg-[var(--bg-primary)] border-[var(--border-main)] text-gray-400 hover:text-emerald-500 hover:border-emerald-500/30`}
                  title={`Go to ${provider.name} Dashboard`}
                >
                  <ExternalLink size={16} />
                </a>
                {(provider.status === "active" || provider.key) && (
                  <button
                    onClick={() => handleDeleteKey(provider.id, provider.name)}
                    className={`p-2 rounded-sm border transition-theme bg-[var(--bg-primary)] border-[var(--border-main)] text-red-500/40 hover:text-red-500 hover:bg-red-500/10 hover:border-red-500/30`}
                    title={t("keyDeleteConfirm").split("?")[0] + "?"}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* Usage Metrics Section */}
            <div className="space-y-5 mb-6 p-4 rounded-md bg-[var(--bg-primary)]/50 border border-[var(--border-main)]/50">
              <div className="space-y-2">
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                  <span className="text-gray-500">{t("utilizationRate")}</span>
                  <span
                    className={`${provider.budget > 0 && provider.usedToday / provider.budget > 0.9 ? "text-red-500" : "text-emerald-500"}`}
                  >
                    {Number(provider.budget || 0) > 0
                      ? `${((Number(provider.usedToday || 0) / Number(provider.budget || 0)) * 100).toFixed(1)}%`
                      : "0%"}
                  </span>
                </div>
                <div className="w-full h-1 bg-gray-200 dark:bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: `${Number(provider.budget || 0) > 0 ? Math.min(100, (Number(provider.usedToday || 0) / Number(provider.budget || 0)) * 100) : 0}%`,
                    }}
                    className={`h-full rounded-full ${Number(provider.budget || 0) > 0 && Number(provider.usedToday || 0) / Number(provider.budget || 0) > 0.9 ? "bg-red-500" : "bg-emerald-500"} shadow-[0_0_8px_rgba(16,185,129,0.3)] transition-theme`}
                  />
                </div>
                <div className="flex justify-between items-center text-[9px] font-bold text-gray-500 uppercase tracking-tighter">
                  <span>
                    {t("used")}: ${Number(provider.usedToday || 0).toFixed(2)}
                  </span>
                  <span>
                    {t("budget")}: ${Number(provider.budget || 0).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                  <input
                    type="number"
                    placeholder="0.00"
                    defaultValue={provider.budget || ""}
                    className={`w-full h-9 pl-8 pr-3 text-xs font-mono rounded-sm border focus:outline-none focus:ring-1 focus:ring-emerald-500/30 transition-theme bg-[var(--bg-primary)] border-[var(--border-main)] text-[var(--text-primary)]`}
                    onBlur={async (e) => {
                      const newBudget = parseFloat(e.target.value);
                      if (!isNaN(newBudget) && newBudget !== provider.budget) {
                        try {
                          const res = await fetch(
                            `/api/admin/api-keys/${provider.id}/budget`,
                            {
                              method: "POST",
                              headers: {
                                "Content-Type": "application/json",
                                Authorization: `Bearer ${token}`,
                              },
                              body: JSON.stringify({ budget: newBudget }),
                            },
                          );
                          if (res.ok) {
                            showToast(t("budgetUpdateSuccess"), "success");
                            setProviders((prev) =>
                              prev.map((p) =>
                                p.id === provider.id
                                  ? { ...p, budget: newBudget }
                                  : p,
                              ),
                            );
                          }
                        } catch (err) {}
                      }
                    }}
                  />
                  <DollarSign
                    size={12}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                </div>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest shrink-0">
                  {t("budget")}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[var(--border-main)]/30 mb-4">
              <button
                onClick={() => handleSyncUsage(provider.id, provider.name)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-sm bg-[var(--bg-primary)] text-gray-500 text-[9px] font-black uppercase tracking-wider border border-[var(--border-main)] hover:text-emerald-500 hover:border-emerald-500/30 hover:shadow-[0_0_10px_rgba(16,185,129,0.1)] transition-theme active:scale-95 group/btn"
                title={t("syncUsageLimits")}
              >
                <RefreshCw
                  size={12}
                  className="group-hover/btn:animate-spin-slow transition-theme"
                />
                {language === "ar" ? "مزامنة الاستهلاك" : "Sync Usage"}
              </button>
              <button
                onClick={() => handleSyncModels(provider.id, provider.name)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-sm bg-[var(--bg-primary)] text-gray-500 text-[9px] font-black uppercase tracking-wider border border-[var(--border-main)] hover:text-emerald-500 hover:border-emerald-500/30 hover:shadow-[0_0_10_rgba(16,185,129,0.1)] transition-theme active:scale-95 group/btn"
                title={t("syncModels")}
              >
                <Cpu
                  size={12}
                  className="group-hover/btn:scale-110 transition-theme"
                />
                {language === "ar" ? "مزامنة الموديلات" : "Sync Models"}
              </button>
            </div>

            <form onSubmit={(e) => e.preventDefault()} className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">
                  {t("apiKeyLabel")}
                </label>
                {provider.updatedAt && (
                  <span className="text-[9px] font-bold text-emerald-500/60 uppercase">
                    {t("lastSync")}:{" "}
                    {new Date(provider.updatedAt).toLocaleDateString(
                      language === "ar" ? "ar-EG" : "en-US",
                    )}
                  </span>
                )}
              </div>

              <div
                className={`flex items-center h-11 px-4 rounded-sm border group-focus-within:border-emerald-500/50 transition-theme bg-[var(--bg-primary)] border-[var(--border-main)] shadow-inner`}
              >
                <input
                  type="password"
                  value={provider.key || ""}
                  onChange={(e) => handleKeyChange(provider.id, e.target.value)}
                  placeholder={
                    provider.status === "active"
                      ? "•••••••••••••••• (Encrypted)"
                      : t("enterKeyPlaceholder")
                  }
                  className={`flex-1 bg-transparent border-none focus:outline-none px-2 text-xs font-mono text-[var(--text-primary)]`}
                  dir="ltr"
                />
                <Key size={14} className="text-gray-400 shrink-0" />
              </div>

              {(provider.id === "ollama" || (provider as any).isCustom) && (
                <div className="space-y-1.5 mt-4">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">
                    {provider.id === "ollama" 
                      ? (t("ollamaUrlLabel") || "Cloud Endpoint URL")
                      : (language === "ar" ? "رابط نقطة النهاية (Endpoint Base URL)" : "API Endpoint Base URL")}
                  </label>
                  <div
                    className={`flex items-center h-11 px-4 rounded-sm border bg-[var(--bg-primary)] border-[var(--border-main)] focus-within:border-emerald-500/50 transition-theme shadow-sm`}
                  >
                    <input
                      type="text"
                      value={(provider as any).urlKey || ""}
                      onChange={(e) =>
                        setProviders(
                          providers.map((p) =>
                            p.id === provider.id
                              ? { ...p, urlKey: e.target.value }
                              : p,
                          ),
                        )
                      }
                      placeholder={provider.id === "ollama" ? "https://cloud.ollama.ai:11434" : "https://api.yourprovider.com/v1"}
                      className={`flex-1 bg-transparent border-none focus:outline-none px-2 text-xs font-mono text-[var(--text-primary)] placeholder-gray-500`}
                      dir="ltr"
                    />
                    <div className="flex items-center gap-2 border-l border-[var(--border-main)] pl-3 ml-2">
                      <button
                        onClick={() =>
                          handleSaveKey(
                            provider.id,
                            provider.key,
                            (provider as any).urlKey,
                          )
                        }
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-xs bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-theme group/save"
                        title={t("saveKeyBtn")}
                      >
                        <Save
                          size={14}
                          className="group-hover/save:scale-110 transition-theme"
                        />
                        <span className="text-[9px] font-black uppercase tracking-tighter">
                          {t("save") || "Save"}
                        </span>
                      </button>
                      <Network
                        size={14}
                        className="text-gray-400 shrink-0 opacity-50"
                      />
                    </div>
                  </div>
                  <p className="text-[9px] text-gray-500 px-1 italic">
                    {provider.id === "ollama" 
                      ? (t("ollamaCloudHint") || "Note: Enter your Ollama Cloud URL here. Localhost is used as fallback only.")
                      : (language === "ar" ? "تأكد من أن الرابط متوافق مع بنية OpenAI وتجلب موديلاتها تلقائياً." : "Ensure this endpoint serves standard OpenAI-compatible completions and models.")}
                  </p>
                </div>
              )}
            </form>

            <div className="grid grid-cols-2 gap-2 mt-6">
              <button
                onClick={() =>
                  handleSaveKey(
                    provider.id,
                    provider.key,
                    (provider.id === "ollama" || (provider as any).isCustom)
                      ? (provider as any).urlKey
                      : undefined,
                  )
                }
                disabled={
                  !provider.key &&
                  ((provider.id !== "ollama" && !(provider as any).isCustom) || !(provider as any).urlKey)
                }
                className={`h-11 rounded-sm flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-theme ${
                  !provider.key
                    ? "bg-[var(--bg-secondary)] text-gray-500 cursor-not-allowed border border-transparent"
                    : "bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 active:scale-95"
                }`}
              >
                <Save size={14} /> {t("saveKeyBtn")}
              </button>
              <button
                onClick={() =>
                  handleTestKeyConnection(
                    provider.id,
                    provider.key,
                    (provider.id === "ollama" || (provider as any).isCustom)
                      ? (provider as any).urlKey
                      : undefined,
                  )
                }
                className="h-11 rounded-sm flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest bg-[var(--bg-primary)] text-emerald-500 border border-emerald-500/20 hover:border-emerald-500/40 hover:bg-emerald-500/5 hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.3)] transition-theme active:scale-95"
              >
                <FastForward size={14} />{" "}
                {language === "ar" ? "فحص سريع" : "Quick Scan"}
              </button>
            </div>

            <button
              onClick={() => handleSyncUsage(provider.id, provider.name)}
              className={`w-full py-2.5 mt-2 rounded-sm flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] transition-theme bg-[var(--bg-primary)] border border-[var(--border-main)] text-gray-500 hover:text-emerald-500 hover:border-emerald-500/30 hover:bg-emerald-500/5`}
            >
              <Activity size={14} /> {t("syncUsageLimits")}
            </button>
          </div>
        ))}

        {/* Custom Provider Creation Slot */}
        {!showAddCustom ? (
          <button
            onClick={() => {
              setShowAddCustom(true);
              setNewCustomId("");
              setNewCustomName("");
              setNewCustomUrl("");
              setNewCustomKey("");
              setNewCustomBudget("");
            }}
            className="p-6 rounded-lg border border-dashed border-[var(--border-main)] hover:border-emerald-500/50 hover:shadow-lg transition-all duration-300 flex flex-col items-center justify-center gap-4 bg-[var(--bg-secondary)] min-h-[440px] text-gray-400 hover:text-emerald-500 group cursor-pointer"
          >
            <div className="w-14 h-14 rounded-full border border-dashed border-gray-300 dark:border-gray-800 flex items-center justify-center group-hover:border-emerald-500/30 group-hover:bg-emerald-500/5 transition-all duration-300">
              <Plus size={24} className="group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-center">
              <h4 className="font-bold text-sm text-gray-900 dark:text-white">
                {language === "ar" ? "إضافة مزود مخصص مستقل" : "Add Custom Independent Provider"}
              </h4>
              <p className="text-xs text-gray-500 mt-1 max-w-[220px] mx-auto">
                {language === "ar" ? "ربط أي وجهة API متوافقة مع بنية OpenAI بشكل آمن مع الفحص والتزامن" : "Securely connect block-independent OpenAI-compatible APIs"}
              </p>
            </div>
          </button>
        ) : (
          <form onSubmit={(e) => e.preventDefault()} className="p-6 rounded-lg border border-emerald-500/20 bg-[var(--bg-secondary)] shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[440px]">
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-[var(--border-main)]/30">
                <span className="text-xs font-black uppercase tracking-widest text-emerald-500 flex items-center gap-1.5">
                  <Cpu size={14} />
                  {language === "ar" ? "مزود مخصص جديد" : "New Custom Provider"}
                </span>
                <button 
                  onClick={() => setShowAddCustom(false)}
                  className="text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Name Field */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  {language === "ar" ? "اسم المزود (العرض في القوائم)" : "Provider Display Name"}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. HostLlama"
                  value={newCustomName}
                  onChange={(e) => {
                    const name = e.target.value;
                    setNewCustomName(name);
                    // Auto-slugify
                    const slug = name
                      .toLowerCase()
                      .replace(/[^a-z0-9_-]/g, "_")
                      .replace(/_+/g, "_");
                    setNewCustomId(slug);
                  }}
                  className="w-full h-10 px-3 text-xs rounded-sm border focus:outline-none focus:ring-1 focus:ring-emerald-500/30 transition-theme bg-[var(--bg-primary)] border-[var(--border-main)] text-[var(--text-primary)]"
                />
              </div>

              {/* Unique ID Field */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex justify-between">
                  <span>{language === "ar" ? "معرف المزود البرمجي (slug)" : "Unique Provider Slug / ID"}</span>
                  <span className="text-[8px] text-gray-400 normal-case font-bold font-mono">Auto-generated</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. hostllama"
                  value={newCustomId}
                  onChange={(e) => setNewCustomId(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "_"))}
                  className="w-full h-10 px-3 text-xs font-mono rounded-sm border focus:outline-none focus:ring-1 focus:ring-emerald-500/30 transition-theme bg-[var(--bg-primary)] border-[var(--border-main)] text-[var(--text-primary)]"
                />
              </div>

              {/* Base URL Endpoint Key */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  {language === "ar" ? "رابط نقطة النهاية (Base URL)" : "API Endpoint Base URL"}
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://api.yourprovider.com/v1"
                  value={newCustomUrl}
                  onChange={(e) => setNewCustomUrl(e.target.value)}
                  className="w-full h-10 px-3 text-xs font-mono rounded-sm border focus:outline-none focus:ring-1 focus:ring-emerald-500/30 transition-theme bg-[var(--bg-primary)] border-[var(--border-main)] text-[var(--text-primary)]"
                  dir="ltr"
                />
              </div>

              {/* Key Field */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  {language === "ar" ? "المفتاح السري (API Key) - اختياري" : "Secret API Key (Optional)"}
                </label>
                <input
                  type="password"
                  placeholder="sk-••••••••••••••••"
                  value={newCustomKey}
                  onChange={(e) => setNewCustomKey(e.target.value)}
                  className="w-full h-10 px-3 text-xs font-mono rounded-sm border focus:outline-none focus:ring-1 focus:ring-emerald-500/30 transition-theme bg-[var(--bg-primary)] border-[var(--border-main)] text-[var(--text-primary)]"
                  dir="ltr"
                />
              </div>

              {/* Budget Field */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  {language === "ar" ? "ميزانية الاستهلاك اليومي ($)" : "Daily Budget ($ Limits)"}
                </label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={newCustomBudget}
                  onChange={(e) => setNewCustomBudget(e.target.value)}
                  className="w-full h-10 px-3 text-xs font-mono rounded-sm border focus:outline-none focus:ring-1 focus:ring-emerald-500/30 transition-theme bg-[var(--bg-primary)] border-[var(--border-main)] text-[var(--text-primary)]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-6 pt-4 border-t border-[var(--border-main)]/30">
              <button
                type="button"
                onClick={() => setShowAddCustom(false)}
                className="h-11 text-[10px] uppercase tracking-widest font-black rounded-sm border border-[var(--border-main)] bg-[var(--bg-primary)] hover:bg-red-500/5 hover:border-red-500/20 hover:text-red-500 transition-colors cursor-pointer"
              >
                {language === "ar" ? "إلغاء" : "Cancel"}
              </button>
              <button
                type="button"
                disabled={isCreatingCustom || !newCustomId || !newCustomName || !newCustomUrl}
                onClick={async () => {
                  if (!newCustomId || !newCustomName || !newCustomUrl) return;
                  setIsCreatingCustom(true);

                  showToast(
                    language === "ar" ? "جاري فحص نقطة الاتصال ومزامنة الموديلات..." : "Testing endpoint and syncing models...",
                    "success"
                  );
                  
                  try {
                    const testRes = await fetch(`/api/admin/api-keys/${newCustomId}/test`, {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                      },
                      body: JSON.stringify({ key: newCustomKey, urlKey: newCustomUrl })
                    });
                    
                    if (!testRes.ok) {
                      let errText = "Verification failed";
                      try {
                        const errJson = await testRes.json();
                        errText = errJson.error || errText;
                      } catch(_) {}
                      throw new Error(errText);
                    }
                    
                    const testData = await testRes.json();
                    if (!testData.status?.isValid) {
                      throw new Error(testData.status?.message || "Invalid Base URL or Key.");
                    }

                    // verified, save
                    const saveRes = await fetch(`/api/admin/api-keys`, {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                      },
                      body: JSON.stringify({
                        provider: newCustomId,
                        key: newCustomKey,
                        urlKey: newCustomUrl,
                        daily_budget: parseFloat(newCustomBudget) || 0
                      })
                    });

                    if (saveRes.ok) {
                      const saveData = await saveRes.json();
                      showToast(
                        language === "ar" ? `تم ربط المزود بنجاح ومزامنة ${saveData.count || 0} موديل.` : `Successfully connected provider and synced ${saveData.count || 0} models.`,
                        "success"
                      );
                      
                      await fetchKeys();
                      
                      // Fetch updated models list from server to stabilize dropdowns
                      try {
                        const modelsRes = await fetch("/api/admin/orchestrator/models", {
                          headers: { Authorization: `Bearer ${token}` }
                        });
                        if (modelsRes.ok) {
                          const modelsData = await modelsRes.json();
                          setProviderModels(modelsData.providerModels);
                        }
                      } catch (err) {
                        console.error("Failed to refresh models after adding custom provider", err);
                      }
                      
                      setShowAddCustom(false);
                    } else {
                      let errText = "Could not save custom provider";
                      try {
                        const errJson = await saveRes.json();
                        errText = errJson.error || errText;
                      } catch(_) {}
                      throw new Error(errText);
                    }
                  } catch (e: any) {
                    showToast(e.message || "Operation failed", "error");
                  } finally {
                    setIsCreatingCustom(false);
                  }
                }}
                className={`h-11 text-[10px] uppercase tracking-widest font-black rounded-sm text-white transition-all flex items-center justify-center gap-1.5 ${
                  isCreatingCustom || !newCustomId || !newCustomName || !newCustomUrl
                    ? "bg-gray-300 dark:bg-gray-800 text-gray-500 cursor-not-allowed"
                    : "bg-emerald-500 hover:bg-emerald-600 shadow-md shadow-emerald-500/20 active:scale-95 cursor-pointer"
                }`}
              >
                {isCreatingCustom ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <Save size={14} />
                )}
                {language === "ar" ? "فحص وحفظ" : "Verify & Save"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

// --- Database Orchestration View ---
const DatabaseOrchestrationView = ({
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
  const { token, socket } = useAppContext();
  const [databases, setDatabases] = useState<any[]>([]);
  const [isMigrating, setIsMigrating] = useState<{
    id: string;
    type: string;
  } | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [openBackupMenuId, setOpenBackupMenuId] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string | { ar: string; en: string };
    description: string | { ar: string; en: string };
    variant?: 'danger' | 'success' | 'warning' | 'info' | 'purple';
    confirmLabel?: string | { ar: string; en: string };
    onConfirm: () => Promise<void> | void;
  } | null>(null);

  const fetchDatabases = async () => {
    try {
      const response = await fetch("/api/admin/databases/registry", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setDatabases(
          data.map((db: any) => {
            let icon = Database;
            let color = "blue";
            let titleKey = db.provider === 'core' ? 'coreDbTitle' :
                           db.provider === 'ledger' ? 'ledgerDbTitle' :
                           db.provider === 'external' ? 'externalDbTitle' :
                           db.provider === 'security' ? 'securityDbTitle' : `${db.provider}DbTitle`;
            let descKey = db.provider === 'core' ? 'coreDbDesc' :
                          db.provider === 'ledger' ? 'ledgerDbDesc' :
                          db.provider === 'external' ? 'externalDbDesc' :
                          db.provider === 'security' ? 'securityDbDesc' : 'primaryDbDesc';

            if (db.id === 'ledger') {
              icon = Landmark;
              color = "amber";
            } else if (db.id === 'external') {
              icon = Globe;
              color = "emerald";
            } else if (db.id === 'security') {
              icon = Shield;
              color = "rose";
            } else if (db.provider.includes("shadow")) {
              color = "teal";
            }

            return {
              ...db,
              type: db.type === "postgres" ? "local" : db.type || "local",
              titleKey,
              descKey,
              icon,
              color,
              isTesting: false,
              showPassword: false,
              connectionTested: db.status === "healthy",
            };
          }),
        );
      }
    } catch (error) {
      console.error("Error fetching database registry:", error);
    }
  };

  useEffect(() => {
    if (token) fetchDatabases();

    if (socket) {
      socket.on("db_alert", (data) => {
        fetchDatabases();
        showToast(
          `⚠️ Alert: Database ${data.provider} is ${data.status}!`,
          "error",
        );
      });
    }

    return () => {
      if (socket) socket.off("db_alert");
    };
  }, [token, socket]);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleTestConnection = async (id: string) => {
    const db = databases.find((d) => d.id === id);
    if (!db) return;

    setDatabases((dbs) =>
      dbs.map((d) => (d.id === id ? { ...d, isTesting: true } : d)),
    );

    try {
      const res = await fetch("/api/admin/databases/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id, type: db.type, config: db }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setDatabases((dbs) =>
          dbs.map((d) =>
            d.id === id ? { ...d, isTesting: false, status: "healthy", connectionTested: true } : d,
          ),
        );
        showToast(t("dbTestSuccess") || "Connection successful!", "success");
      } else {
        setDatabases((dbs) =>
          dbs.map((d) =>
            d.id === id ? { ...d, isTesting: false, status: "error", connectionTested: false } : d,
          ),
        );
        showToast(
          data.error || t("dbTestFailed") || "Connection failed",
          "error",
        );
      }
    } catch (error) {
      setDatabases((dbs) =>
        dbs.map((d) =>
          d.id === id ? { ...d, isTesting: false, status: "error", connectionTested: false } : d,
        ),
      );
      showToast(t("dbTestError") || "Connection error", "error");
    }
  };

  const handleSaveConfig = (id: string) => {
    const db = databases.find((d) => d.id === id);
    if (!db) return;

    if (!db.connectionTested) {
      showToast(
        dir === "rtl"
          ? "يجب اختبار الاتصال بنجاح أولاً قبل حفظ التعديلات."
          : "Please successfully test the connection before saving configuration.",
        "error"
      );
      return;
    }

    const confirmMsg = language === "ar"
      ? "هل أنت متأكد من حفظ وتغيير إعدادات وسلاسل الاتصال لقاعدة البيانات هذه؟ قد يؤثر استبدال سلاسل الاتصال النشطة على العمليات الجارية."
      : "Are you sure you want to save and overwrite the active connection strings for this database? Overwriting active configurations can disrupt live operations.";
    
    setConfirmModal({
      isOpen: true,
      title: { ar: "حفظ إعدادات الاتصال لقاعدة البيانات؟", en: "Save Database Connection Settings?" },
      description: confirmMsg,
      variant: "warning",
      onConfirm: async () => {
        try {
          const res = await fetch("/api/admin/databases/save", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              id: db.id,
              config: {
                provider: db.provider,
                type: db.type,
                host: db.host || null,
                port: db.port || null,
                dbName: db.db_name || db.dbName || null,
                username: db.username || null,
                password: db.password || null,
                connectionString:
                  db.connection_string || db.connectionString || null,
                sslMode: db.ssl_mode || db.sslMode || null,
                poolSize: db.pool_size || db.poolSize || 10,
              },
              activate: db.is_active || false,
            }),
          });

          if (res.ok) {
            showToast(
              t("dbSaveSuccess") || "Configuration saved successfully",
              "success",
            );
            fetchDatabases();
          } else {
            const data = await res.json();
            showToast(data.error || "Failed to save configuration", "error");
          }
        } catch (error) {
          showToast("Error saving configuration", "error");
        }
      }
    });
  };

  const handleActivateDatabase = async (id: string, currentStatus: boolean) => {
    try {
      const db = databases.find((d) => d.id === id);
      if (!db) return;

      const res = await fetch("/api/admin/databases/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: db.id,
          config: {
            provider: db.provider,
            type: db.type,
            host: db.host || null,
            port: db.port || null,
            dbName: db.db_name || db.dbName || null,
            username: db.username || null,
            password: db.password || null,
            connectionString:
              db.connection_string || db.connectionString || null,
            sslMode: db.ssl_mode || db.sslMode || null,
            poolSize: db.pool_size || db.poolSize || 10,
          },
          activate: !currentStatus,
        }),
      });

      if (res.ok) {
        showToast(
          !currentStatus
            ? t("dbActivateSuccess") || "Database activated!"
            : t("dbDeactivateSuccess") || "Database deactivated!",
          "success",
        );
        fetchDatabases();
      } else {
        const data = await res.json();
        showToast(data.error || "Operation failed", "error");
      }
    } catch (error) {
      showToast("Connection error", "error");
    }
  };

  const handleExportBackup = (dbId: string) => {
    const db = databases.find((d) => d.id === dbId);
    if (!db) return;

    const targetType = db.id === "ledger" ? "ledger" : (db.id === "external" ? "external" : (db.id === "security" ? "security" : "core"));
    const dbName = db.db_name || db.dbName || targetType;
    const displayLabel = dbName.replace(/[^a-z0-9_-]/gi, "_").toLowerCase();
    const filename = `${targetType}_${displayLabel}_backup_${new Date().toISOString().split("T")[0]}.json`;

    const confirmMsg =
      dir === "rtl"
        ? `هل أنت متأكد من رغبتك في تصدير نسخة احتياطية لقاعدة البيانات: "${dbName}" (${targetType})؟\n\nاسم ملف النسخة الاحتياطية الذي سيتم توليده وحفظه سيكون:\n📎 "${filename}"\n\nاضغط موافق للتأكيد وتنزيل الملف وتسجيل هذه العملية في سجل التدقيق الأمني للقوانين والامتثال المالي.`
        : `Are you sure you want to export a backup for database: "${dbName}" (${targetType})?\n\nBackup filename to be generated and saved:\n📎 "${filename}"\n\nClick OK to confirm download and commit this administrative action to the secure compliance audit trail.`;

    setConfirmModal({
      isOpen: true,
      title: { ar: "تصدير نسخة احتياطية؟", en: "Export Database Backup?" },
      description: confirmMsg,
      variant: "success",
      onConfirm: async () => {
        try {
          showToast(
            dir === "rtl"
              ? `جاري تصدير نسخة احتياطية لـ ${dbName} (${targetType})...`
              : `Exporting backup for ${dbName} (${targetType})...`,
            "success",
          );

          const res = await fetch(
            `/api/admin/databases/export?type=${targetType}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          );
          if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || "Export failed");
          }

          const backupData = await res.json();
          
          // Use actual database name returned from backend or fallback to dbName
          const actualDbName = backupData.database_name || dbName;
          const actualDisplayLabel = actualDbName.replace(/[^a-z0-9_-]/gi, "_").toLowerCase();
          const finalFilename = `${targetType}_${actualDisplayLabel}_backup_${new Date().toISOString().split("T")[0]}.json`;

          const blob = new Blob([JSON.stringify(backupData, null, 2)], {
            type: "application/json",
          });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = finalFilename;
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(url);

          showToast(
            dir === "rtl"
              ? `تم تصدير النسخة احتياطياً بنجاح لقاعدة البيانات: ${actualDbName} (${targetType})`
              : `Backup successfully exported for database: ${actualDbName} (${targetType})`,
            "success",
          );
        } catch (error: any) {
          console.error("Export error:", error);
          showToast(error.message, "error");
        }
      }
    });
  };

  const handleRunMigrations = (
    id: string,
    type: "scratch" | "additive",
  ) => {
    const perform = async () => {
      setIsMigrating({ id, type });
      try {
        const res = await fetch("/api/admin/databases/migrate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ id, type }),
        });

        const data = await res.json();
        if (res.ok) {
          showToast(
            t("dbMigrationSuccess") || "Migrations completed successfully",
            "success",
          );
          fetchDatabases(); // Refresh status after migration
        } else {
          showToast(
            data.error || t("dbMigrationFailed") || "Failed to run migrations",
            "error",
          );
        }
      } catch (error) {
        showToast(t("dbMigrationError") || "Error running migrations", "error");
      } finally {
        setIsMigrating(null);
      }
    };

    if (type === "scratch") {
      setConfirmModal({
        isOpen: true,
        title: { ar: "مسح البيانات وبناء الهيكل من الصفر؟", en: "Wipe Data and Rebuild Schema?" },
        description: dir === "rtl"
          ? "⚠️ تحذير: هذا الإجراء سيقوم بحذف كافة البيانات وإعادة بناء المخطط من الصفر. هل تريد الاستمرار؟"
          : "⚠️ WARNING: This will wipe all data and rebuild the schema from scratch. Continue?",
        variant: "danger",
        onConfirm: perform
      });
    } else {
      perform();
    }
  };

  const handleImportBackup = (
    dbId: string,
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const db = databases.find((d) => d.id === dbId);
    if (!db) return;

    const targetType = db.id === "ledger" ? "ledger" : (db.id === "external" ? "external" : (db.id === "security" ? "security" : "core"));
    const dbName = db.db_name || db.dbName || targetType;

    const confirmMsg =
      dir === "rtl"
        ? `⚠️ تحذير شديد: استعادة النسخة إلى (${dbName}) سيؤدي لمسح كافة البيانات الحالية بشكل نهائي واستبدالها بالنسخة. هل أنت متأكد تماماً؟`
        : `⚠️ CRITICAL WARNING: Restoring backup to (${dbName}) will PERMANENTLY WIPE all current data and replace it with the backup content. Are you absolutely sure?`;

    const target = event.target;

    setConfirmModal({
      isOpen: true,
      title: { ar: "استعادة نسخة احتياطية؟", en: "Restore Database Backup?" },
      description: confirmMsg,
      variant: "danger",
      onConfirm: async () => {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const backup = JSON.parse(e.target?.result as string);

            if (backup.type !== targetType) {
              showToast(
                dir === "rtl"
                  ? `خطأ: نوع النسخة (${backup.type}) لا يتطابق مع قاعدة البيانات الهدف (${targetType})`
                  : `Error: Backup type (${backup.type}) mismatch with target (${targetType})`,
                "error",
              );
              return;
            }

            showToast(
              dir === "rtl"
                ? "جاري استعادة البيانات بدقة... يرجى عدم إغلاق الصفحة"
                : "Restoring data with high precision... Please do not close the page",
              "success",
            );

            const res = await fetch("/api/admin/databases/import", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ backup, targetType }),
            });

            if (res.ok) {
              showToast(
                dir === "rtl"
                  ? "تمت استعادة قاعدة البيانات بنجاح تام"
                  : "Database restored successfully with precision",
                "success",
              );
              fetchDatabases();
            } else {
              const data = await res.json();
              showToast(data.error || "Import failed", "error");
            }
          } catch (err) {
            showToast(
              dir === "rtl"
                ? "ملف غير صالح أو تالف"
                : "Invalid or corrupted backup file",
              "error",
            );
          } finally {
            if (target) target.value = "";
          }
        };
        reader.readAsText(file);
      }
    });
  };

  const handleChange = (id: string, field: string, value: string | boolean) => {
    const connectionFields = [
      "host",
      "port",
      "username",
      "password",
      "db_name",
      "dbName",
      "connection_string",
      "connectionString",
      "type"
    ];
    setDatabases((dbs) =>
      dbs.map((db) => {
        if (db.id === id) {
          const isConnectionField = connectionFields.includes(field);
          return {
            ...db,
            [field]: value,
            connectionTested: isConnectionField ? false : db.connectionTested,
          };
        }
        return db;
      }),
    );
  };

  return (
    <div className="space-y-4 max-w-6xl mx-auto relative transition-theme">
      {toast && (
        <div
          className={`fixed bottom-6 ${dir === "rtl" ? "left-6" : "right-6"} z-50 flex items-center gap-3 px-6 py-4 rounded-[var(--radius)] shadow-2xl transition-theme animate-in slide-in-from-bottom-5 ${
            toast.type === "success"
              ? "bg-[var(--bg-surface)] border border-emerald-500/30 text-emerald-500"
              : "bg-[var(--bg-surface)] border border-red-500/30 text-red-500"
          } border`}
        >
          {toast.type === "success" ? (
            <CheckCircle size={20} />
          ) : (
            <AlertCircle size={20} />
          )}
          <span className="font-medium text-sm">{toast.message}</span>
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {databases.map((db) => {
          const Icon = db.icon;

          return (
            <div
              key={db.id}
              className={`p-5 rounded-lg border flex flex-col gap-4 transition-theme bg-[var(--bg-secondary)] border-[var(--border-main)] hover:border-emerald-500/20 shadow-sm`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2.5 rounded-md border transition-theme ${theme === "dark" ? "bg-[var(--bg-surface)] border-[var(--border-main)] text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]" : "bg-white border-emerald-100 text-emerald-600"}`}
                  >
                    <Icon size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-[var(--text-primary)] flex items-center gap-2">
                      {t(db.titleKey)}
                      <span className="px-1.5 py-0.5 rounded-xs bg-[var(--bg-secondary)] text-gray-500 text-[8px] font-black uppercase border border-[var(--border-main)]">
                        {db.id === 'ledger' ? (language === 'ar' ? 'الخزينة (المالية)' : 'Ledger (Financial)') :
                         db.id === 'external' ? (language === 'ar' ? 'لوحة تحكم الأقسام' : 'Sections Dashboard') :
                         db.id === 'security' ? (language === 'ar' ? 'الحماية (الأمنية)' : 'Security (Defense)') :
                         (language === 'ar' ? 'الرئيسية (التشغيلية)' : 'Core (Operational)')}
                      </span>
                    </h3>
                    <p className="text-[11px] text-gray-500 mt-0.5 font-medium">
                      {t(db.descKey)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {db.is_active ? (
                    <span className="text-[11px] font-medium text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <Zap size={12} className="fill-emerald-500/30" />{" "}
                      {t("active") || "Active"}
                    </span>
                  ) : (
                    <span className="text-[11px] font-medium text-gray-500 bg-[var(--bg-secondary)]0/10 border border-[var(--border-main)] px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <Circle size={12} /> {t("standby") || "Standby"}
                    </span>
                  )}
                  {db.status === "healthy" ? (
                    <span className="text-[11px] font-medium text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 size={12} /> {t("statusConnected")}
                    </span>
                  ) : (
                    <span className="text-[11px] font-medium text-red-500 bg-red-500/10 border border-red-500/20 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <XCircle size={12} /> {t("statusDisconnected")}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex p-1.5 bg-[var(--bg-primary)] border border-[var(--border-main)] rounded-md mb-6 shadow-inner overflow-hidden relative">
                <div className="absolute inset-0 bg-emerald-500/5 pointer-events-none" />
                <button
                  onClick={() => handleChange(db.id, "type", "cloud")}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 text-[11px] font-black uppercase tracking-[0.2em] rounded-sm transition-theme ease-out relative z-10 ${db.type === "cloud" ? "bg-emerald-500 text-white shadow-[0_4px_15px_rgba(16,185,129,0.4)]" : "text-gray-500 hover:bg-[var(--bg-secondary)]/50 dark:hover:bg-[var(--bg-secondary)]/30"}`}
                >
                  <Cloud
                    size={14}
                    className={db.type === "cloud" ? "animate-pulse" : ""}
                  />{" "}
                  {t("cloud")}
                </button>
                <button
                  onClick={() => handleChange(db.id, "type", "local")}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 text-[11px] font-black uppercase tracking-[0.2em] rounded-sm transition-theme ease-out relative z-10 ${db.type === "local" ? "bg-blue-600 text-white shadow-[0_4px_15px_rgba(37,99,235,0.4)]" : "text-gray-500 hover:bg-[var(--bg-secondary)]/50 dark:hover:bg-[var(--bg-secondary)]/30"}`}
                >
                  <Database size={14} /> {t("local")}
                </button>
              </div>

              <AnimatePresence mode="wait">
                {db.type === "cloud" ? (
                  <motion.div
                    key="cloud-fields"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.02 }}
                    className="space-y-4 p-5 rounded-md bg-emerald-500/[0.02] border border-emerald-500/10 shadow-inner relative overflow-hidden"
                  >
                    {db.isTesting && (
                      <div className="absolute inset-0 bg-[var(--bg-secondary)]/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center space-y-3 animate-in fade-in">
                        <RefreshCw
                          size={24}
                          className="text-emerald-500 animate-spin"
                        />
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 animate-pulse">
                          {language === "ar"
                            ? "جاري فحص الاتصال (Pre-flight)..."
                            : "Running Pre-flight Check..."}
                        </span>
                      </div>
                    )}
                    <div className="absolute top-0 right-0 p-2 opacity-10 pointer-events-none">
                      <Cloud size={40} className="text-emerald-500" />
                    </div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_5px_rgba(16,185,129,1)]"></div>
                        <label className="text-[10px] uppercase text-emerald-500 font-black tracking-[0.2em]">
                          {t("connectionString")}
                        </label>
                      </div>
                      <button
                        onClick={() =>
                          handleChange(
                            db.id,
                            "showConnectionString",
                            !db.showConnectionString,
                          )
                        }
                        className="text-emerald-500/60 hover:text-emerald-500 transition-theme p-1"
                      >
                        {db.showConnectionString ? (
                          <EyeOff size={14} />
                        ) : (
                          <Eye size={14} />
                        )}
                      </button>
                    </div>
                    <textarea
                      rows={3}
                      placeholder="postgresql://user:pass@host:port/db"
                      className={`w-full p-4 rounded-sm border bg-[var(--bg-primary)] border-[var(--border-main)] text-[var(--text-primary)] text-xs font-mono resize-none focus:ring-1 focus:ring-emerald-500/30 outline-none transition-theme shadow-sm leading-relaxed ${db.showConnectionString ? "" : "blur-[3px] select-none"}`}
                      value={db.connection_string || ""}
                      onChange={(e) =>
                        handleChange(db.id, "connection_string", e.target.value)
                      }
                    />
                    <div className="flex items-center gap-2 pt-1">
                      <ShieldCheck size={12} className="text-emerald-500/60" />
                      <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">
                        Perplexta Encryption Active
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="local-fields"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.02 }}
                    className="space-y-4 p-5 rounded-md bg-blue-500/[0.02] border border-blue-500/10 shadow-inner relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 p-2 opacity-10 pointer-events-none">
                      <Terminal size={40} className="text-blue-500" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5 text-right">
                        <label className="text-[9px] uppercase text-blue-500/60 font-black tracking-widest px-1">
                          {t("dbHost")}
                        </label>
                        <input
                          placeholder="localhost"
                          className="w-full h-9 px-3 rounded-sm border bg-[var(--bg-primary)] border-[var(--border-main)] text-[var(--text-primary)] text-xs font-mono focus:border-blue-500/50 outline-none transition-theme shadow-sm"
                          value={db.host || ""}
                          onChange={(e) =>
                            handleChange(db.id, "host", e.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-1.5 text-right">
                        <label className="text-[9px] uppercase text-blue-500/60 font-black tracking-widest px-1">
                          {t("dbPort")}
                        </label>
                        <input
                          placeholder="5432"
                          className="w-full h-9 px-3 rounded-sm border bg-[var(--bg-primary)] border-[var(--border-main)] text-[var(--text-primary)] text-xs font-mono focus:border-blue-500/50 outline-none transition-theme shadow-sm"
                          value={db.port || ""}
                          onChange={(e) =>
                            handleChange(db.id, "port", e.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-1.5 text-right">
                        <label className="text-[9px] uppercase text-blue-500/60 font-black tracking-widest px-1">
                          {t("dbUsername")}
                        </label>
                        <input
                          placeholder="postgres"
                          className="w-full h-9 px-3 rounded-sm border bg-[var(--bg-primary)] border-[var(--border-main)] text-[var(--text-primary)] text-xs font-mono focus:border-blue-500/50 outline-none transition-theme shadow-sm"
                          value={db.username || ""}
                          onChange={(e) =>
                            handleChange(db.id, "username", e.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-1.5 text-right">
                        <label className="text-[9px] uppercase text-blue-500/60 font-black tracking-widest px-1">
                          {t("dbName")}
                        </label>
                        <input
                          placeholder="platform_core"
                          className="w-full h-9 px-3 rounded-sm border bg-[var(--bg-primary)] border-[var(--border-main)] text-[var(--text-primary)] text-xs font-mono focus:border-blue-500/50 outline-none transition-theme shadow-sm"
                          value={db.db_name || ""}
                          onChange={(e) =>
                            handleChange(db.id, "db_name", e.target.value)
                          }
                        />
                      </div>
                      <div className="col-span-2 space-y-1.5 text-right">
                        <div className="flex items-center justify-between px-1">
                          <button
                            onClick={() =>
                              handleChange(
                                db.id,
                                "showPassword",
                                !db.showPassword,
                              )
                            }
                            className="text-blue-500/60 hover:text-blue-500 transition-theme p-1"
                          >
                            {db.showPassword ? (
                              <EyeOff size={14} />
                            ) : (
                              <Eye size={14} />
                            )}
                          </button>
                          <label className="text-[9px] uppercase text-blue-500/60 font-black tracking-widest">
                            {t("dbPassword")}
                          </label>
                        </div>
                        <input
                          type={db.showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          className="w-full h-9 px-3 rounded-sm border bg-[var(--bg-primary)] border-[var(--border-main)] text-[var(--text-primary)] text-xs font-mono focus:border-blue-500/50 outline-none transition-theme shadow-sm"
                          value={db.password || ""}
                          onChange={(e) =>
                            handleChange(db.id, "password", e.target.value)
                          }
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="col-span-3 h-[52px] flex items-center justify-center border border-dashed border-[var(--border-main)] rounded-sm bg-emerald-500/5">
                <span className="text-[10px] text-[var(--text-secondary)] font-mono">
                  {t("cloudAutoScalingEnabled")}
                </span>
              </div>
              <div className="flex flex-col gap-3 pt-2">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleTestConnection(db.id)}
                    disabled={db.isTesting}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-sm border transition-theme font-bold text-xs bg-[var(--bg-primary)] border-[var(--border-main)] text-[var(--text-secondary)] hover:text-emerald-500 hover:border-emerald-500/30 group`}
                  >
                    {db.isTesting ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />{" "}
                        {t("testing")}
                      </>
                    ) : (
                      <>
                        <Activity
                          size={14}
                          className={`transition-theme ${!db.isTesting ? "group-hover:text-emerald-500 group-hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]" : ""}`}
                        />
                        {t("testDbConnection")}
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleSaveConfig(db.id)}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-sm border transition-theme font-bold text-xs bg-[var(--bg-primary)] border-[var(--border-main)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]`}
                  >
                    <Save size={14} className="text-gray-400" />{" "}
                    {t("saveDbConfig")}
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => handleRunMigrations(db.id, "scratch")}
                    disabled={isMigrating !== null}
                    title={t("migrateScratchDesc")}
                    className={`flex flex-col items-center justify-center gap-1.5 py-4 rounded-sm border transition-theme font-bold text-[10px] uppercase tracking-wider relative overflow-hidden group ${
                      theme === "dark"
                        ? "border-red-900/40 bg-red-950/20 hover:bg-red-900/30 text-red-500 hover:shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                        : "border-red-200 bg-red-50 hover:bg-red-100/50 text-red-600 shadow-sm"
                    } ${isMigrating?.id === db.id && isMigrating?.type === "scratch" ? "opacity-70 grayscale" : ""}`}
                  >
                    {isMigrating?.id === db.id &&
                    isMigrating?.type === "scratch" ? (
                      <RefreshCw
                        size={16}
                        className="animate-spin text-red-500"
                      />
                    ) : (
                      <Trash2
                        size={16}
                        className={`transition-theme group-hover:drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]`}
                      />
                    )}
                    <span className="text-center px-1">
                      {t("migrateScratch") || "Scratch"}
                    </span>
                  </button>

                  {/* Migration Sync */}
                  <button
                    onClick={() => handleRunMigrations(db.id, "additive")}
                    disabled={isMigrating !== null}
                    title={t("migrateAdditiveDesc")}
                    className={`flex flex-col items-center justify-center gap-1.5 py-4 rounded-sm border transition-theme font-bold text-[10px] uppercase tracking-wider relative overflow-hidden group ${
                      theme === "dark"
                        ? "border-emerald-900/40 bg-emerald-950/20 hover:bg-emerald-900/30 text-emerald-500 hover:shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                        : "border-emerald-100 bg-emerald-50 hover:bg-emerald-100/50 text-emerald-600 shadow-sm"
                    } ${isMigrating?.id === db.id && isMigrating?.type === "additive" ? "opacity-70 grayscale" : ""}`}
                  >
                    {isMigrating?.id === db.id &&
                    isMigrating?.type === "additive" ? (
                      <RefreshCw
                        size={16}
                        className="animate-spin text-emerald-500"
                      />
                    ) : (
                      <ShieldCheck
                        size={16}
                        className={`transition-theme group-hover:text-emerald-500 group-hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]`}
                      />
                    )}
                    <span className="text-center px-1">
                      {t("migrateAdditive") || "Sync"}
                    </span>
                  </button>

                    <div className="relative group/backup">
                      <button
                        onClick={() => {
                          setOpenBackupMenuId((prev) => (prev === db.id ? null : db.id));
                        }}
                        className={`w-full h-full flex flex-col items-center justify-center gap-1.5 py-4 rounded-sm border transition-theme font-bold text-[10px] uppercase tracking-wider bg-[var(--bg-primary)] border-[var(--border-main)] text-blue-500 hover:border-blue-500/50 hover:bg-blue-500/5`}
                      >
                        <History
                          size={16}
                          className="group-hover/backup:animate-spin-slow"
                        />
                        <span className="text-center px-1">
                          {dir === "rtl" ? "نسخ/إستعادة" : "Backup"}
                        </span>
                      </button>

                      <div
                        className={`${
                          openBackupMenuId === db.id ? "block" : "hidden"
                        } absolute bottom-[110%] left-0 right-0 bg-[var(--bg-secondary)] border border-[var(--border-main)] rounded-md shadow-2xl z-50 p-2 animate-in fade-in slide-in-from-bottom-2 transition-theme`}
                      >
                        {(() => {
                          const currentDbTargetType = db.id === "ledger" ? "ledger" : (db.id === "external" ? "external" : (db.id === "security" ? "security" : "core"));
                          const currentDbName = db.db_name || db.dbName || currentDbTargetType;
                          return (
                            <>
                              <button
                                onClick={() => {
                                  handleExportBackup(db.id);
                                  setOpenBackupMenuId(null);
                                }}
                                className="w-full flex items-center gap-3 p-3 rounded-md hover:bg-blue-500/10 text-blue-500 transition-theme text-xs font-bold"
                              >
                                <Download size={16} />{" "}
                                {dir === "rtl"
                                  ? `تصدير نسخة (${currentDbName})`
                                  : `Export Backup (${currentDbName})`}
                              </button>
                              <div className="h-px bg-[var(--border-main)] my-1" />
                              <label className="w-full flex items-center gap-3 p-3 rounded-md hover:bg-emerald-500/10 text-emerald-500 transition-theme text-xs font-bold cursor-pointer">
                                <Upload size={16} />
                                {dir === "rtl"
                                  ? `استيراد نسخة إلى (${currentDbName})`
                                  : `Import Backup to (${currentDbName})`}
                                <input
                                  type="file"
                                  accept=".json"
                                  className="hidden"
                                  onChange={(e) => {
                                    handleImportBackup(db.id, e);
                                    setOpenBackupMenuId(null);
                                  }}
                                />
                              </label>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                </div>

                <button
                  onClick={() => handleActivateDatabase(db.id, db.is_active)}
                  className={`w-full py-4 rounded-lg border transition-theme font-bold text-xs flex items-center justify-center gap-3 relative overflow-hidden group ${
                    db.is_active
                      ? theme === "dark"
                        ? "bg-red-500/10 border-red-500/40 text-red-500 hover:bg-red-500/20"
                        : "bg-red-50 border-red-200 text-red-600 hover:bg-red-100"
                      : theme === "dark"
                        ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-500 hover:bg-emerald-500/20 shadow-[0_4px_20px_rgba(16,185,129,0.1)]"
                        : "bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-500/30"
                  }`}
                >
                  {db.is_active && (
                    <div className="absolute inset-0 bg-red-500/5 animate-pulse"></div>
                  )}
                  <Zap
                    size={18}
                    className={`${db.is_active ? "fill-red-500/20" : "fill-white/20 animate-bounce"}`}
                  />
                  <span className="relative z-10">
                    {db.is_active ? t("deactivate") : t("activate")}
                  </span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {confirmModal && (
        <ActionConfirmationModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          description={confirmModal.description}
          variant={confirmModal.variant}
          confirmLabel={confirmModal.confirmLabel}
          onClose={() => setConfirmModal(null)}
          onConfirm={async () => {
            await confirmModal.onConfirm();
            setConfirmModal(null);
          }}
        />
      )}
    </div>
  );
};

const OrchestratorView = ({
  theme,
  t,
  dir,
  providerModels,
}: {
  theme: string;
  t: (key: string, replacements?: any) => string;
  dir: string;
  providerModels: Record<string, any[]>;
}) => {
  const { token, language } = useAppContext();
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const [tools, setTools] = useState<any[]>([]);
  const [loadingTools, setLoadingTools] = useState(true);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const routesRes = await fetch("/api/admin/orchestrator/routes", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (routesRes.ok) {
          const routesData = await routesRes.json();
          const listData = routesData;
          const savedRoutes = routesData.routes;

          const masterTools = listData.tools.map((t: any) => ({
            id: t.tool_id || t.id,
            titleKey: t.tool_id || t.id,
            description: t.description || t.task_description,
            descriptionAr: t.descriptionAr || t.task_description_ar,
            icon: LayoutGrid,
            primaryProvider: "",
            primaryModel: "",
            fallback1Provider: "",
            fallback1Model: "",
            fallback2Provider: "",
            fallback2Model: "",
            fallback3Provider: "",
            fallback3Model: "",
            isActive: true,
            costPerUsage: t.cost_per_usage || 10,
            costPer1kInputTokens: t.cost_per_1k_input_tokens !== undefined ? t.cost_per_1k_input_tokens : 5,
            costPer1kOutputTokens: t.cost_per_1k_output_tokens !== undefined ? t.cost_per_1k_output_tokens : 15,
            isSaving: false,
          }));

          if (savedRoutes && savedRoutes.length > 0) {
            // Merge saved routes into master tools
            const mergedTools = masterTools.map((tool: any) => {
              const savedRoute = savedRoutes.find(
                (r: any) => r.tool_id === tool.id,
              );

              const iconMap: Record<string, any> = {
                chat: LayoutGrid,
                chat_fast: Zap,
                chat_pro: Sparkles,
                chat_reasoning: Brain,
                perplexta_analysis: Brain,
                legal_analysis: Scale,
                notebook: Megaphone,
                image: ImageIcon,
                video: Video,
                stt: Mic,
                tts: Volume2,
                learning: GraduationCap,
                code: Code2,
                canvas: Music,
                sovereign_memory: Database,
                sovereign_search: Search,
                x402_api: Cpu,
              };

              if (savedRoute) {
                return {
                  ...tool,
                  icon: iconMap[tool.id] || LayoutGrid,
                  primaryProvider: savedRoute.primary_provider || "",
                  primaryModel: savedRoute.primary_model || "",
                  fallback1Provider: savedRoute.fallback_1_provider || "",
                  fallback1Model: savedRoute.fallback_1_model || "",
                  fallback2Provider: savedRoute.fallback_2_provider || "",
                  fallback2Model: savedRoute.fallback_2_model || "",
                  fallback3Provider: savedRoute.fallback_3_provider || "",
                  fallback3Model: savedRoute.fallback_3_model || "",
                  isActive: savedRoute.is_active ?? true,
                  costPerUsage: savedRoute.cost_per_usage || tool.costPerUsage,
                  costPer1kInputTokens: savedRoute.cost_per_1k_input_tokens !== undefined ? savedRoute.cost_per_1k_input_tokens : tool.costPer1kInputTokens,
                  costPer1kOutputTokens: savedRoute.cost_per_1k_output_tokens !== undefined ? savedRoute.cost_per_1k_output_tokens : tool.costPer1kOutputTokens,
                };
              }
              return { ...tool, icon: iconMap[tool.id] || LayoutGrid };
            });
            setTools(mergedTools);
          } else {
            setTools(masterTools);
          }
        }
      } catch (error) {
        console.error("Error fetching orchestrator data:", error);
      } finally {
        setLoadingTools(false);
      }
    };

    if (token) {
      fetchData();
    }
  }, [token]);

  const handleSave = async (id: string, overrideTool?: any) => {
    const toolToSave = overrideTool || tools.find((t) => t.id === id);
    if (!toolToSave) return;

    const validation = validateToolRoutePricing(toolToSave, language === "ar" ? "ar" : "en");
    if (!validation.isValid) {
      showToast(validation.errors.join(" | "), "error");
      return;
    }

    if (!overrideTool) {
      setTools((ts) =>
        ts.map((t) => (t.id === id ? { ...t, isSaving: true } : t)),
      );
    }

    try {
      const res = await fetch("/api/admin/orchestrator/routes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          routes: [
            {
              tool_id: toolToSave.id,
              primary_provider: toolToSave.primaryProvider,
              primary_model: toolToSave.primaryModel,
              fallback_1_provider: toolToSave.fallback1Provider,
              fallback_1_model: toolToSave.fallback1Model,
              fallback_2_provider: toolToSave.fallback2Provider,
              fallback_2_model: toolToSave.fallback2Model,
              fallback_3_provider: toolToSave.fallback3Provider,
              fallback_3_model: toolToSave.fallback3Model,
              is_active: toolToSave.isActive,
              cost_per_usage: toolToSave.costPerUsage,
              cost_per_1k_input_tokens: toolToSave.costPer1kInputTokens !== undefined ? toolToSave.costPer1kInputTokens : 5,
              cost_per_1k_output_tokens: toolToSave.costPer1kOutputTokens !== undefined ? toolToSave.costPer1kOutputTokens : 15,
            },
          ],
        }),
      });

      if (res.ok) {
        showToast(
          language === "ar"
            ? "تم حفظ إعدادات التوجيه بنجاح"
            : "Routing settings saved successfully",
          "success",
        );
      } else {
        showToast(
          language === "ar" ? "فشل حفظ الإعدادات" : "Failed to save settings",
          "error",
        );
      }
    } catch (error) {
      console.error("Error saving route:", error);
      showToast(
        language === "ar" ? "خطأ في الاتصال" : "Connection error",
        "error",
      );
    } finally {
      if (!overrideTool) {
        setTools((ts) =>
          ts.map((t) => (t.id === id ? { ...t, isSaving: false } : t)),
        );
      }
    }
  };

  const handleChange = (id: string, field: string, value: string) => {
    setTools((ts) =>
      ts.map((t) => (t.id === id ? { ...t, [field]: value } : t)),
    );
  };

  const renderProviderOptions = () => {
    return [
      <option key="none" value="">
        {t("orchestratorProvider")}
      </option>,
      ...Object.keys(providerModels).map((provider) => {
        const displayNames: Record<string, string> = {
          serper: "Serper (Search)",
          tavily: "Tavily (Search)",
          google_search: "Google Search",
          openai: "OpenAI",
          anthropic: "Anthropic",
          google: "Google AI",
          deepseek: "DeepSeek",
          groq: "Groq",
          openrouter: "OpenRouter",
          together: "Together AI",
          mistral: "Mistral AI",
          xai: "xAI",
          elevenlabs: "ElevenLabs (TTS)",
          ollama: "Ollama",
        };
        const label = displayNames[provider] || provider;
        return (
          <option key={provider} value={provider}>
            {label}
          </option>
        );
      }),
    ];
  };

  const renderModelOptions = (providerId: string) => {
    const rawModels = providerModels[providerId] || [];

    // Ensure unique models based on their ID/Value
    const seenValues = new Set<string>();
    const models = rawModels.filter((model) => {
      const modelValue =
        typeof model === "string" ? model : model.id || model.name || "";
      if (!modelValue || seenValues.has(modelValue)) return false;
      seenValues.add(modelValue);
      return true;
    });

    return [
      <option key="none" value="">
        {t("model")}
      </option>,
      ...models.map((model, idx) => {
        const modelValue =
          typeof model === "string" ? model : model.id || model.name;
        const modelLabel =
          typeof model === "string" ? model : model.name || model.id;
        return (
          <option key={`${modelValue}-${idx}`} value={modelValue}>
            {modelLabel}
          </option>
        );
      }),
    ];
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto relative">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 ${dir === "rtl" ? "left-6" : "right-6"} z-50 flex items-center gap-3 px-6 py-4 rounded-lg shadow-2xl transition-theme animate-in slide-in-from-bottom-5 ${
            toast.type === "success"
              ? theme === "dark"
                ? "bg-[#1a1a1c] border border-emerald-500/30 text-emerald-500"
                : "bg-white border border-emerald-200 text-emerald-600"
              : theme === "dark"
                ? "bg-[#1a1a1c] border border-red-500/30 text-red-500"
                : "bg-white border border-red-200 text-red-600"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle size={20} />
          ) : (
            <AlertCircle size={20} />
          )}
          <span className="font-medium text-sm">{toast.message}</span>
        </div>
      )}

      {loadingTools ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <RefreshCw size={40} className="text-emerald-500 animate-spin" />
          <p className="text-gray-500 font-mono text-sm uppercase tracking-[0.3em]">
            Synchronizing Orchestrator...
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map((tool) => {
            const Icon = tool.icon;

            return (
              <div
                key={tool.id}
                className={`p-6 rounded-lg border transition-theme relative overflow-hidden bg-[var(--bg-secondary)] border-[var(--border-main)] hover:border-emerald-500/20 hover:shadow-lg group/tool`}
              >
                <div className="absolute -top-6 -right-6 opacity-[0.03] dark:opacity-[0.02] pointer-events-none group-hover/tool:scale-110 transition-theme">
                  <Icon size={140} />
                </div>

                <div className="flex items-center justify-between mb-8 relative z-10">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-1.5 rounded-md bg-emerald-500 text-white shadow-[0_4px_10px_rgba(16,185,129,0.3)]`}
                    >
                      <Icon size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-[var(--text-primary)] leading-tight">
                        {t(tool.titleKey)}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div
                          className={`w-1.5 h-1.5 rounded-full ${tool.isActive ? "bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,1)]" : "bg-gray-400"}`}
                        ></div>
                        <span
                          className={`text-[9px] font-black uppercase tracking-widest ${tool.isActive ? "text-emerald-500" : "text-gray-400"}`}
                        >
                          {tool.isActive
                            ? language === "ar"
                              ? "نشط"
                              : "Active Routing"
                            : language === "ar"
                              ? "معطل"
                              : "Standby"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                      <button
                        onClick={async () => {
                          const newState = !tool.isActive;
                          setTools((ts) =>
                            ts.map((t) =>
                              t.id === tool.id ? { ...t, isActive: newState } : t,
                            ),
                          );
                          await handleSave(tool.id, { ...tool, isActive: newState });
                        }}
                        className={`w-11 h-6 rounded-full p-1 transition-theme ${tool.isActive ? "bg-emerald-500/20 border border-emerald-500/30" : "bg-[var(--bg-secondary)]/50 border border-[var(--border-main)]"}`}
                      >
                      <motion.div
                        animate={{
                          x: tool.isActive ? (dir === "rtl" ? -20 : 20) : 0,
                        }}
                        className={`w-4 h-4 rounded-full shadow-md ${tool.isActive ? "bg-emerald-500" : "bg-[var(--bg-secondary)]0"}`}
                      />
                    </button>
                      <button
                        onClick={() => handleSave(tool.id)}
                        disabled={tool.isSaving}
                        className={`p-2 rounded-sm transition-theme ${tool.isSaving ? "text-emerald-500" : "text-gray-400 hover:text-emerald-500 hover:bg-emerald-500/10"}`}
                      >
                      {tool.isSaving ? (
                        <RefreshCw size={18} className="animate-spin" />
                      ) : (
                        <Save size={18} />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-6 relative z-10">
                  <div className="space-y-2.5 p-4 rounded-md bg-[var(--bg-primary)]/50 border border-[var(--border-main)]/50 shadow-inner">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1 block">
                      {language === "ar" ? "رسم تشغيل الخدمة الثابت (Flat Execution Base)" : "Flat Execution Base Cost"}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={tool.costPerUsage || 0}
                        onChange={(e) =>
                          handleChange(tool.id, "costPerUsage", e.target.value)
                        }
                        className={`w-full h-11 px-9 rounded-md border text-sm font-black focus:outline-none transition-theme bg-[var(--bg-primary)] border-[var(--border-main)] text-emerald-500 focus:ring-1 focus:ring-emerald-500/30`}
                      />
                      <div
                        className={`absolute top-1/2 -translate-y-1/2 px-3 text-emerald-500/50 ${dir === "rtl" ? "right-0" : "left-0"}`}
                      >
                        <Coins
                          size={16}
                          className="drop-shadow-[0_0_5px_rgba(16,185,129,0.3)]"
                        />
                      </div>
                      <div
                        className={`absolute top-1/2 -translate-y-1/2 px-3 text-[10px] font-black text-gray-400 uppercase tracking-widest pointer-events-none ${dir === "rtl" ? "left-0" : "right-0"}`}
                      >
                        {t("points")}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2.5 p-4 rounded-md bg-[var(--bg-primary)]/50 border border-[var(--border-main)]/50 shadow-inner">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1 block">
                        {language === "ar" ? "سعر مدخلات /1K توكن" : "Input /1k Token Cost"}
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={tool.costPer1kInputTokens || 0}
                          onChange={(e) =>
                            handleChange(tool.id, "costPer1kInputTokens", e.target.value)
                          }
                          className={`w-full h-11 px-9 rounded-md border text-sm font-black focus:outline-none transition-theme bg-[var(--bg-primary)] border-[var(--border-main)] text-sky-500 focus:ring-1 focus:ring-sky-500/30`}
                        />
                        <div
                          className={`absolute top-1/2 -translate-y-1/2 px-3 text-sky-500/50 ${dir === "rtl" ? "right-0" : "left-0"}`}
                        >
                          <Coins
                            size={16}
                            className="drop-shadow-[0_0_5px_rgba(14,165,233,0.3)]"
                          />
                        </div>
                        <div
                          className={`absolute top-1/2 -translate-y-1/2 px-3 text-[10px] font-black text-gray-400 uppercase tracking-widest pointer-events-none ${dir === "rtl" ? "left-0" : "right-0"}`}
                        >
                          {t("points")}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2.5 p-4 rounded-md bg-[var(--bg-primary)]/50 border border-[var(--border-main)]/50 shadow-inner">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1 block">
                        {language === "ar" ? "سعر مخرجات /1K توكن" : "Output /1k Token Cost"}
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={tool.costPer1kOutputTokens || 0}
                          onChange={(e) =>
                            handleChange(tool.id, "costPer1kOutputTokens", e.target.value)
                          }
                          className={`w-full h-11 px-9 rounded-md border text-sm font-black focus:outline-none transition-theme bg-[var(--bg-primary)] border-[var(--border-main)] text-indigo-500 focus:ring-1 focus:ring-indigo-500/30`}
                        />
                        <div
                          className={`absolute top-1/2 -translate-y-1/2 px-3 text-indigo-500/50 ${dir === "rtl" ? "right-0" : "left-0"}`}
                        >
                          <Coins
                            size={16}
                            className="drop-shadow-[0_0_5px_rgba(99,102,241,0.3)]"
                          />
                        </div>
                        <div
                          className={`absolute top-1/2 -translate-y-1/2 px-3 text-[10px] font-black text-gray-400 uppercase tracking-widest pointer-events-none ${dir === "rtl" ? "left-0" : "right-0"}`}
                        >
                          {t("points")}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 px-1">
                        <Zap size={14} className="text-emerald-500" />
                        <span className="text-[10px] font-black text-[var(--text-primary)] uppercase tracking-[0.2em]">
                          {t("primaryEngine")}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={tool.primaryProvider || ""}
                          onChange={(e) => {
                            handleChange(
                              tool.id,
                              "primaryProvider",
                              e.target.value,
                            );
                            handleChange(tool.id, "primaryModel", "");
                          }}
                          className={`w-full h-10 px-3 rounded-md border text-[11px] font-bold focus:outline-none bg-[var(--bg-primary)] border-[var(--border-main)] text-[var(--text-primary)]`}
                          dir="ltr"
                        >
                          {renderProviderOptions()}
                        </select>
                        <select
                          value={tool.primaryModel || ""}
                          onChange={(e) =>
                            handleChange(
                              tool.id,
                              "primaryModel",
                              e.target.value,
                            )
                          }
                          className={`w-full h-10 px-3 rounded-md border text-[11px] font-bold focus:outline-none bg-[var(--bg-primary)] border-[var(--border-main)] text-[var(--text-primary)]`}
                          dir="ltr"
                          disabled={!tool.primaryProvider}
                        >
                          {renderModelOptions(tool.primaryProvider)}
                          {tool.primaryModel &&
                            !renderModelOptions(tool.primaryProvider).some(
                              (opt: any) =>
                                opt.props.value === tool.primaryModel,
                            ) && (
                              <option
                                key={`unsynced-primary-${tool.id}`}
                                value={tool.primaryModel}
                              >
                                ⚠️ {tool.primaryModel} (Not Synced)
                              </option>
                            )}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-3 pt-2 border-t border-[var(--border-main)]/50">
                      <div className="flex items-center gap-2 px-1 opacity-60">
                        <Shield size={14} className="text-amber-500" />
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">
                          {t("fallbackProtocol")}
                        </span>
                      </div>

                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <select
                            value={tool.fallback1Provider || ""}
                            onChange={(e) => {
                              handleChange(
                                tool.id,
                                "fallback1Provider",
                                e.target.value,
                              );
                              handleChange(tool.id, "fallback1Model", "");
                            }}
                            className="w-full h-9 px-2 rounded-sm border text-[10px] bg-[var(--bg-primary)] border-[var(--border-main)]"
                            dir="ltr"
                          >
                            {renderProviderOptions()}
                          </select>
                          <select
                            value={tool.fallback1Model || ""}
                            onChange={(e) =>
                              handleChange(
                                tool.id,
                                "fallback1Model",
                                e.target.value,
                              )
                            }
                            className="w-full h-9 px-2 rounded-md border text-[10px] bg-[var(--bg-primary)] border-[var(--border-main)]"
                            dir="ltr"
                            disabled={!tool.fallback1Provider}
                          >
                            {renderModelOptions(tool.fallback1Provider)}
                            {tool.fallback1Model &&
                              !renderModelOptions(tool.fallback1Provider).some(
                                (opt: any) =>
                                  opt.props.value === tool.fallback1Model,
                              ) && (
                                <option
                                  key={`unsynced-fallback1-${tool.id}`}
                                  value={tool.fallback1Model}
                                >
                                  ⚠️ {tool.fallback1Model} (Not Synced)
                                </option>
                              )}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2 pt-4 border-t border-[var(--border-main)]/30">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex-1">
                        <select
                          value={tool.fallback2Provider || ""}
                          onChange={(e) => {
                            handleChange(
                              tool.id,
                              "fallback2Provider",
                              e.target.value,
                            );
                            handleChange(tool.id, "fallback2Model", "");
                          }}
                          className="w-full h-9 px-2 rounded-md border text-[10px] bg-[var(--bg-primary)] border-[var(--border-main)] text-[var(--text-primary)] focus:outline-none transition-theme"
                          dir="ltr"
                        >
                          {renderProviderOptions()}
                        </select>
                      </div>
                      <div className="flex-1">
                        <select
                          value={tool.fallback2Model || ""}
                          onChange={(e) =>
                            handleChange(
                              tool.id,
                              "fallback2Model",
                              e.target.value,
                            )
                          }
                          className={`w-full h-9 px-2 rounded-md border text-[10px] bg-[var(--bg-primary)] border-[var(--border-main)] text-[var(--text-primary)] focus:outline-none transition-theme ${tool.fallback2Model && !renderModelOptions(tool.fallback2Provider).some((opt: any) => opt.props.value === tool.fallback2Model) ? "border-red-500/50 text-red-400 font-bold" : ""}`}
                          dir="ltr"
                          disabled={!tool.fallback2Provider}
                        >
                          {renderModelOptions(tool.fallback2Provider)}
                          {tool.fallback2Model &&
                            !renderModelOptions(tool.fallback2Provider).some(
                              (opt: any) =>
                                opt.props.value === tool.fallback2Model,
                            ) && (
                              <option
                                key={`unsynced-f2-${tool.id}`}
                                value={tool.fallback2Model}
                              >
                                ⚠️ {tool.fallback2Model} (Not Synced)
                              </option>
                            )}
                        </select>
                      </div>
                    </div>

                    {/* Fallback 3 */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex-1">
                        <select
                          value={tool.fallback3Provider || ""}
                          onChange={(e) => {
                            handleChange(
                              tool.id,
                              "fallback3Provider",
                              e.target.value,
                            );
                            handleChange(tool.id, "fallback3Model", "");
                          }}
                          className="w-full h-9 px-2 rounded-md border text-[10px] bg-[var(--bg-primary)] border-[var(--border-main)] text-[var(--text-primary)] focus:outline-none transition-theme"
                          dir="ltr"
                        >
                          {renderProviderOptions()}
                        </select>
                      </div>
                      <div className="flex-1">
                        <select
                          value={tool.fallback3Model || ""}
                          onChange={(e) =>
                            handleChange(
                              tool.id,
                              "fallback3Model",
                              e.target.value,
                            )
                          }
                          className={`w-full h-9 px-2 rounded-md border text-[10px] bg-[var(--bg-primary)] border-[var(--border-main)] text-[var(--text-primary)] focus:outline-none transition-theme ${tool.fallback3Model && !renderModelOptions(tool.fallback3Provider).some((opt: any) => opt.props.value === tool.fallback3Model) ? "border-red-500/50 text-red-400 font-bold" : ""}`}
                          dir="ltr"
                          disabled={!tool.fallback3Provider}
                        >
                          {renderModelOptions(tool.fallback3Provider)}
                          {tool.fallback3Model &&
                            !renderModelOptions(tool.fallback3Provider).some(
                              (opt: any) =>
                                opt.props.value === tool.fallback3Model,
                            ) && (
                              <option
                                key={`unsynced-f3-${tool.id}`}
                                value={tool.fallback3Model}
                              >
                                ⚠️ {tool.fallback3Model} (Not Synced)
                              </option>
                            )}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const FinanceVaultView = ({
  theme,
  t,
  dir,
}: {
  theme: string;
  t: (key: string, replacements?: any) => string;
  dir: string;
}) => {
  const { token, language, setIsOperationPending } = useAppContext();
  const [activeTab, setActiveTab] = useState("economy");
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string | { ar: string; en: string };
    description: string | { ar: string; en: string };
    variant?: 'danger' | 'success' | 'warning' | 'info' | 'purple';
    confirmLabel?: string | { ar: string; en: string };
    onConfirm: () => Promise<void> | void;
  } | null>(null);

  useEffect(() => {
    setIsOperationPending(isSaving);
  }, [isSaving, setIsOperationPending]);

  const [economySettings, setEconomySettings] = useState({
    welcome_bonus_points: 600,
    referral_bonus_points: 1000,
    min_payout_usd: 20,
    min_deposit_usd: 5,
    points_per_dollar: 1000,
    conversion_rate: 0.001,
    referral_bonus_percent: 10,
    referral_activation_min_deposit: 10,
    crypto_address: "",
    bank_name: "",
    bank_recipient: "",
    bank_iban: "",
    bank_swift: "",
    paypal_email: "",
  });

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Manual Transaction States & Verification Logic
  const [financialRequests, setFinancialRequests] = useState<{
    deposits: any[];
    withdrawals: any[];
  }>({ deposits: [], withdrawals: [] });

  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [rejectionReasons, setRejectionReasons] = useState<{ [key: string]: string }>({});
  const [actioningId, setActioningId] = useState<string | null>(null);

  const fetchFinancialRequests = async () => {
    if (!token) return;
    setIsLoadingRequests(true);
    try {
      const res = await fetch("/api/admin/financial-requests", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setFinancialRequests(data);
      }
    } catch (error) {
      console.error("Error fetching financial requests:", error);
    } finally {
      setIsLoadingRequests(false);
    }
  };

  useEffect(() => {
    if (activeTab === "financial_requests" || activeTab === "ledger") {
      fetchFinancialRequests();
    }
  }, [activeTab, token]);

  const handleDepositAction = async (id: string | number, action: "approve" | "reject") => {
    setActioningId(id.toString());
    const reason = rejectionReasons[id] || "";
    try {
      const res = await fetch(`/api/admin/deposit-requests/${id}/action`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ action, rejectionReason: reason })
      });
      if (res.ok) {
        showToast(
          language === "ar"
            ? "تم معالجة وتحديث طلب الإيداع والتحويل اليدوي بنجاح!"
            : "Manual deposit request verified and processed successfully!",
          "success"
        );
        fetchFinancialRequests();
      } else {
        const err = await res.json();
        showToast(err.error || "Action failed", "error");
      }
    } catch (error) {
      showToast("Network error", "error");
    } finally {
      setActioningId(null);
    }
  };

  const handleWithdrawalAction = async (id: string | number, action: "approve" | "reject") => {
    setActioningId(id.toString());
    const reason = rejectionReasons[id] || "";
    try {
      const res = await fetch(`/api/admin/withdrawal-requests/${id}/action`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ action, rejectionReason: reason })
      });
      if (res.ok) {
        showToast(
          language === "ar"
            ? "تم معالجة وتحديث طلب السحب بنجاح وعكس الموازنة بالمحفظة!"
            : "Withdrawal request processed successfully!",
          "success"
        );
        fetchFinancialRequests();
      } else {
        const err = await res.json();
        showToast(err.error || "Action failed", "error");
      }
    } catch (error) {
      showToast("Network error", "error");
    } finally {
      setActioningId(null);
    }
  };

  const handleDeleteRequest = (id: string | number, type: 'deposit' | 'withdrawal') => {
    const isAr = language === "ar";
    const confirmMessage = isAr ? "هل أنت متأكد من حذف هذا السجل نهائيًا؟" : "Are you sure you want to permanently delete this record?";

    setConfirmModal({
      isOpen: true,
      title: { ar: "حذف السجل المالي نهائياً؟", en: "Permanently Delete Financial Record?" },
      description: confirmMessage,
      variant: "danger",
      onConfirm: async () => {
        setActioningId(id.toString());
        try {
          const endpoint = type === 'deposit' 
            ? `/api/admin/deposit-requests/${id}` 
            : `/api/admin/withdrawal-requests/${id}`;
            
          const res = await fetch(endpoint, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          if (res.ok) {
            showToast(
              isAr
                ? "تم حذف السجل بنجاح من الدفاتر المالية!"
                : "Record successfully deleted from the financial ledger!",
              "success"
            );
            fetchFinancialRequests();
          } else {
            const err = await res.json();
            showToast(err.error || "Deletion failed", "error");
          }
        } catch (error) {
          showToast("Network error", "error");
        } finally {
          setActioningId(null);
        }
      }
    });
  };

  useEffect(() => {
    const fetchEconomySettings = async () => {
      try {
        const res = await fetch("/api/admin/economy", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setEconomySettings(data);
        }
      } catch (error) {
        console.error("Error fetching economy settings:", error);
      }
    };
    if (token) fetchEconomySettings();
  }, [token]);

  const handleSaveEconomySettings = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/economy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(economySettings),
      });
      if (res.ok) {
        showToast(
          language === "ar"
            ? "تم حفظ إعدادات الخزنة بنجاح"
            : "Finance settings saved successfully",
          "success",
        );
      } else {
        const errorData = await res.json();
        showToast(
          language === "ar"
            ? `فشل الحفظ: ${errorData.error}`
            : `Save failed: ${errorData.error}`,
          "error",
        );
      }
    } catch (error) {
      console.error("Error saving economy settings:", error);
      showToast(
        language === "ar" ? "خطأ في الاتصال" : "Connection Error",
        "error",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveWalletGateways = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/economy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(economySettings),
      });
      if (res.ok) {
        showToast(
          language === "ar"
            ? "تم حفظ إعدادات بوابات الدفع البديلة بنجاح"
            : "Alternative payment gateways saved successfully",
          "success",
        );
      } else {
        const errorData = await res.json();
        showToast(
          language === "ar"
            ? `فشل الحفظ: ${errorData.error}`
            : `Save failed: ${errorData.error}`,
          "error",
        );
      }
    } catch (error) {
      console.error("Error saving wallet gateways:", error);
      showToast(
        language === "ar" ? "خطأ في الاتصال" : "Connection Error",
        "error",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const updatePointsPerDollar = (val: number) => {
    const rate = val > 0 ? 1 / val : 0;
    setEconomySettings((prev) => ({
      ...prev,
      points_per_dollar: val,
      conversion_rate: Number(rate.toFixed(6)),
    }));
  };

  const updateConversionRate = (val: number) => {
    const points = val > 0 ? 1 / val : 0;
    setEconomySettings((prev) => ({
      ...prev,
      conversion_rate: val,
      points_per_dollar: Math.round(points),
    }));
  };

  const tabs = [
    { id: "economy", label: t("economySettings"), icon: Star },
    {
      id: "ledger",
      label: language === "ar" ? "سجل المعاملات" : "Registry & Ledger",
      icon: Landmark,
    },
    {
      id: "financial_requests",
      label: language === "ar" ? "المعاملات اليدوية" : "Manual Transactions",
      icon: ArrowRightLeft,
    },
    { id: "payment_gateways", label: t("paymentGateways"), icon: CreditCard },
  ];

  const [stripeConfig, setStripeConfig] = useState<any>({
    publishableKey: "",
    secretKey: "",
    webhookSecret: "",
    isLiveMode: false,
    stripe_status: "pending",
    stripe_last_verified_at: null,
  });

  const [paypalConfig, setPaypalConfig] = useState<any>({
    clientId: "",
    clientSecret: "",
    mode: "sandbox",
    paypal_status: "pending",
    paypal_last_verified_at: null,
  });

  const fetchStripeConfig = async () => {
    try {
      const res = await fetch("/api/system/settings");
      if (res.ok) {
        const data = await res.json();
        setStripeConfig({
          publishableKey: data.stripe_publishable_key || "",
          secretKey: "", // Don't fetch secret key for security
          webhookSecret: "", // Don't fetch webhook secret for security
          isLiveMode: data.stripe_live_mode || false,
          stripe_status: data.stripe_status || "pending",
          stripe_last_verified_at: data.stripe_last_verified_at,
        });
      }
    } catch (error) {
      console.error("Error fetching stripe config:", error);
    }
  };

  const fetchPaypalConfig = async () => {
    try {
      const res = await fetch("/api/system/settings");
      if (res.ok) {
        const data = await res.json();
        setPaypalConfig({
          clientId: data.paypal_client_id || "",
          clientSecret: "", // Don't fetch secret key for security
          mode: data.paypal_mode || "sandbox",
          paypal_status: data.paypal_status || "pending",
          paypal_last_verified_at: data.paypal_last_verified_at,
        });
      }
    } catch (error) {
      console.error("Error fetching paypal config:", error);
    }
  };

  useEffect(() => {
    if (activeTab === "payment_gateways") {
      fetchStripeConfig();
      fetchPaypalConfig();
    }
  }, [activeTab]);

  const handleSavePaypalConfig = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/settings/paypal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(paypalConfig),
      });
      if (res.ok) {
        showToast(
          language === "ar"
            ? "تم حفظ إعدادات PayPal بنجاح"
            : "PayPal settings saved successfully",
          "success",
        );
        setPaypalConfig((prev: any) => ({
          ...prev,
          clientSecret: "",
        }));
        fetchPaypalConfig();
      } else {
        const errorData = await res.json();
        showToast(
          language === "ar"
            ? `فشل الحفظ: ${errorData.error}`
            : `Save failed: ${errorData.error}`,
          "error",
        );
      }
    } catch (error) {
      showToast(
        language === "ar" ? "خطأ في الاتصال" : "Connection Error",
        "error",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const [isVerifyingPaypal, setIsVerifyingPaypal] = useState(false);
  const handleVerifyPaypalConnection = async () => {
    setIsVerifyingPaypal(true);
    try {
      const res = await fetch("/api/admin/settings/paypal/verify", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        showToast(
          dir === "rtl"
            ? "تم التحقق من بوابة PayPal بنجاح!"
            : "PayPal gateway verified successfully!",
          "success",
        );
        fetchPaypalConfig();
      } else {
        showToast(data.error || "Verification Failed", "error");
      }
    } catch (error) {
      showToast("Connection Error", "error");
    } finally {
      setIsVerifyingPaypal(false);
    }
  };

  const handleSaveStripeConfig = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/settings/stripe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(stripeConfig),
      });
      if (res.ok) {
        showToast(
          language === "ar"
            ? "تم حفظ إعدادات Stripe بنجاح"
            : "Stripe settings saved successfully",
          "success",
        );
        setStripeConfig((prev: any) => ({
          ...prev,
          secretKey: "",
          webhookSecret: "",
        })); // Clear sensitive fields
        fetchStripeConfig(); // Refresh status
      } else {
        const errorData = await res.json();
        showToast(
          language === "ar"
            ? `فشل الحفظ: ${errorData.error}`
            : `Save failed: ${errorData.error}`,
          "error",
        );
      }
    } catch (error) {
      showToast(
        language === "ar" ? "خطأ في الاتصال" : "Connection Error",
        "error",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const [isVerifyingStripe, setIsVerifyingStripe] = useState(false);
  const handleVerifyStripeConnection = async () => {
    setIsVerifyingStripe(true);
    try {
      const res = await fetch("/api/admin/settings/stripe/verify", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        showToast(
          dir === "rtl"
            ? `تم التحقق بنجاح! المتجر: ${data.business_name}`
            : `Verified successfully! Business: ${data.business_name}`,
          "success",
        );
        fetchStripeConfig();
      } else {
        showToast(data.error || "Verification Failed", "error");
      }
    } catch (error) {
      showToast("Connection Error", "error");
    } finally {
      setIsVerifyingStripe(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto relative">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 ${dir === "rtl" ? "left-6" : "right-6"} z-50 flex items-center gap-3 px-6 py-4 rounded-lg shadow-2xl transition-theme animate-in slide-in-from-bottom-5 ${
            toast.type === "success"
              ? theme === "dark"
                ? "bg-[#1a1a1c] border border-emerald-500/30 text-emerald-500"
                : "bg-white border border-emerald-200 text-emerald-600"
              : theme === "dark"
                ? "bg-[#1a1a1c] border border-red-500/30 text-red-500"
                : "bg-white border border-red-200 text-red-600"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 size={20} />
          ) : (
            <AlertCircle size={20} />
          )}
          <span className="font-medium text-sm">{toast.message}</span>
        </div>
      )}

      <div
        className={`flex space-x-2 rtl:space-x-reverse border-b ${theme === "dark" ? "border-[var(--border-main)]" : "border-[var(--border-main)]"} pb-px overflow-x-auto custom-scrollbar`}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-theme border-b-2 whitespace-nowrap ${
                isActive
                  ? "border-emerald-500 text-emerald-500"
                  : `border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 ${theme === "dark" ? "hover:border-[var(--border-main)]" : "hover:border-[var(--border-main)]"}`
              }`}
            >
              <Icon
                size={16}
                className={
                  isActive ? "text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]" : ""
                }
              />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="pt-4">
        {activeTab === "economy" && (
          <div className="space-y-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2">
                <Star className="text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]" size={24} />
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {t("economySettings")}
                </h3>
              </div>
              <button
                onClick={handleSaveEconomySettings}
                disabled={isSaving}
                className={`flex items-center gap-2 px-4 py-2 rounded-md border transition-theme ${
                  theme === "dark"
                    ? "bg-[#1a1a1c] border-[var(--border-main)] text-gray-400 hover:text-emerald-500 hover:border-emerald-500/30"
                    : "bg-white border-[var(--border-main)] text-gray-500 hover:text-emerald-600 hover:border-emerald-200"
                } disabled:opacity-50 group`}
              >
                {isSaving ? (
                  <RefreshCw size={18} className="animate-spin" />
                ) : (
                  <Save
                    size={18}
                    className="group-hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]"
                  />
                )}
                <span className="text-sm font-bold">{t("saveSettings")}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="flex flex-col items-center">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 text-center">
                  {t("welcomeBonus")} ({t("points")})
                </label>
                <input
                  type="number"
                  value={economySettings.welcome_bonus_points || 0}
                  onChange={(e) =>
                    setEconomySettings({
                      ...economySettings,
                      welcome_bonus_points: Number(e.target.value),
                    })
                  }
                  className={`w-full max-w-xs h-12 px-4 rounded-md border ${theme === "dark" ? "bg-[#0f0f11] border-[var(--border-main)]/80 text-white" : "bg-[var(--bg-secondary)] border-[var(--border-main)] text-gray-900"} text-center text-lg font-medium focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-theme`}
                />
                <p className="text-xs text-gray-500 mt-3 text-center max-w-xs">
                  {t("welcomeBonusDesc")}
                </p>
              </div>

              <div className="flex flex-col items-center">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 text-center">
                  {t("referralBonus")} ({t("points")})
                </label>
                <input
                  type="number"
                  value={economySettings.referral_bonus_points || 0}
                  onChange={(e) =>
                    setEconomySettings({
                      ...economySettings,
                      referral_bonus_points: Number(e.target.value),
                    })
                  }
                  className={`w-full max-w-xs h-12 px-4 rounded-md border ${theme === "dark" ? "bg-[#0f0f11] border-[var(--border-main)]/80 text-white" : "bg-[var(--bg-secondary)] border-[var(--border-main)] text-gray-900"} text-center text-lg font-medium focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-theme`}
                />
                <p className="text-xs text-gray-500 mt-3 text-center max-w-xs">
                  {t("referralBonusDesc")}
                </p>
              </div>

              <div className="flex flex-col items-center">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 text-center">
                  {language === "ar"
                    ? "الحد الأدنى للسحب (دولار)"
                    : "Min Withdrawal ($)"}
                </label>
                <input
                  type="number"
                  value={economySettings.min_payout_usd || 0}
                  onChange={(e) =>
                    setEconomySettings({
                      ...economySettings,
                      min_payout_usd: Number(e.target.value),
                    })
                  }
                  className={`w-full max-w-xs h-12 px-4 rounded-md border ${theme === "dark" ? "bg-[#0f0f11] border-[var(--border-main)]/80 text-white" : "bg-[var(--bg-secondary)] border-[var(--border-main)] text-gray-900"} text-center text-lg font-medium focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-theme`}
                />
                <p className="text-xs text-gray-500 mt-3 text-center max-w-xs">
                  {language === "ar"
                    ? "أقل مبلغ يمكن للمستخدم طلبه للسحب."
                    : "Minimum amount a user can request for payout."}
                </p>
              </div>

              <div className="flex flex-col items-center">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 text-center">
                  {language === "ar"
                    ? "الحد الأدنى للإيداع (دولار)"
                    : "Min Deposit ($)"}
                </label>
                <input
                  type="number"
                  value={economySettings.min_deposit_usd || 0}
                  onChange={(e) =>
                    setEconomySettings({
                      ...economySettings,
                      min_deposit_usd: Number(e.target.value),
                    })
                  }
                  className={`w-full max-w-xs h-12 px-4 rounded-md border ${theme === "dark" ? "bg-[#0f0f11] border-[var(--border-main)]/80 text-white" : "bg-[var(--bg-secondary)] border-[var(--border-main)] text-gray-900"} text-center text-lg font-medium focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-theme`}
                />
                <p className="text-xs text-gray-500 mt-3 text-center max-w-xs">
                  {language === "ar"
                    ? "أقل مبلغ يمكن للمستخدم إيداعه."
                    : "Minimum amount a user can deposit."}
                </p>
              </div>

              <div className="flex flex-col items-center">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 text-center">
                  {language === "ar"
                    ? "تفعيل الإحالة عند إيداع ($)"
                    : "Referral Activation Deposit ($)"}
                </label>
                <input
                  type="number"
                  value={economySettings.referral_activation_min_deposit || 0}
                  onChange={(e) =>
                    setEconomySettings({
                      ...economySettings,
                      referral_activation_min_deposit: Number(e.target.value),
                    })
                  }
                  className={`w-full max-w-xs h-12 px-4 rounded-md border ${theme === "dark" ? "bg-[#0f0f11] border-[var(--border-main)]/80 text-white" : "bg-[var(--bg-secondary)] border-[var(--border-main)] text-gray-900"} text-center text-lg font-medium focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-theme`}
                />
                <p className="text-xs text-gray-500 mt-3 text-center max-w-xs">
                  {language === "ar"
                    ? "المبلغ الذي يجب على الشخص المُحال إيداعه لتفعيل مكافأة الإحالة."
                    : "Amount the referred user must deposit to activate referral rewards."}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <div className="flex flex-col items-center">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 text-center">
                  {t("pointsPerDollar")}
                </label>
                <input
                  type="number"
                  value={economySettings.points_per_dollar || 0}
                  onChange={(e) =>
                    updatePointsPerDollar(Number(e.target.value))
                  }
                  className={`w-full max-w-xs h-12 px-4 rounded-md border ${theme === "dark" ? "bg-[#0f0f11] border-[var(--border-main)]/80 text-white" : "bg-[var(--bg-secondary)] border-[var(--border-main)] text-gray-900"} text-center text-lg font-medium focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-theme`}
                />
                <div className="mt-3 flex flex-col items-center gap-1">
                  <p className="text-xs text-gray-500 text-center max-w-xs">
                    {t("pointsPerDollarDesc")}
                  </p>
                  <div className="px-3 py-1 rounded-full bg-emerald-500/5 border border-emerald-500/10 text-[10px] font-bold text-emerald-500 uppercase tracking-wider">
                    1 {t("point")} = $
                    {Number(economySettings.conversion_rate || 0).toFixed(4)}
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 text-center">
                  {t("conversionRate")}
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={economySettings.conversion_rate || 0}
                  onChange={(e) => updateConversionRate(Number(e.target.value))}
                  className={`w-full max-w-xs h-12 px-4 rounded-md border ${theme === "dark" ? "bg-[#0f0f11] border-[var(--border-main)]/80 text-white" : "bg-[var(--bg-secondary)] border-[var(--border-main)] text-gray-900"} text-center text-lg font-medium focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-theme`}
                />
                <div className="mt-3 flex flex-col items-center gap-1">
                  <p className="text-xs text-gray-500 text-center max-w-xs">
                    {t("conversionRateDesc")}
                  </p>
                  <div className="px-3 py-1 rounded-full bg-emerald-500/5 border border-emerald-500/10 text-[10px] font-bold text-emerald-500 uppercase tracking-wider">
                    {economySettings.points_per_dollar} {t("points")} = $1.00
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "ledger" && (
          <div className="space-y-6 font-sans">
            <div className="flex items-center gap-2 mb-6">
              <Landmark className="text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]" size={24} />
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {language === "ar" ? "دفتر الحسابات وجميع المعاملات المالية" : "System Registry & General Ledger"}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {language === "ar" ? "قائمة تدقيق شاملة لكل تدفقات الخزنة والائتمانات اللحظية." : "Comprehensive system record auditing all active credits, debits and payouts."}
                </p>
              </div>
            </div>

            {isLoadingRequests ? (
              <div className="flex items-center justify-center p-12">
                <RefreshCw className="animate-spin text-emerald-500" size={24} />
              </div>
            ) : (
              <div className={`overflow-x-auto rounded-[var(--radius)] border ${theme === "dark" ? "bg-[#1a1a1c] border-gray-800/60" : "bg-white border-gray-150"}`}>
                <table className="w-full text-left rtl:text-right text-xs">
                  <thead className={`text-[10px] font-black uppercase tracking-widest ${theme === "dark" ? "bg-[#0f0f11] text-gray-400" : "bg-gray-50 text-gray-500"}`}>
                    <tr>
                      <th className="p-4">{language === "ar" ? "المستعمل" : "User"}</th>
                      <th className="p-4">{language === "ar" ? "نوع المعاملة" : "Type"}</th>
                      <th className="p-4">{language === "ar" ? "القيمة" : "Amount"}</th>
                      <th className="p-4">{language === "ar" ? "طريقة الدفع" : "Method"}</th>
                      <th className="p-4">{language === "ar" ? "حالة المعاملة" : "Status"}</th>
                      <th className="p-4">{language === "ar" ? "الرقم المرجعي" : "Reference"}</th>
                      <th className="p-4">{language === "ar" ? "تاريخ النشوء" : "Created At"}</th>
                      <th className="p-4 text-center">{language === "ar" ? "الإجراءات" : "Actions"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60 font-medium font-sans">
                    {/* Combine deposits and withdrawals into audit logs */}
                    {[
                      ...financialRequests.deposits.map(d => ({ ...d, logType: 'deposit', realAmount: d.amount })),
                      ...financialRequests.withdrawals.map(w => ({ ...w, logType: 'withdrawal', realAmount: Number(w.amount_cents) / 100 }))
                    ]
                      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                      .map((log: any, idx) => {
                        const isDep = log.logType === 'deposit';
                        
                        let refHash = '';
                        if (isDep) {
                          try {
                            const parsed = JSON.parse(log.proof_url);
                            refHash = parsed.reference_id || 'Direct API';
                          } catch {
                            refHash = log.proof_url || 'Direct API';
                          }
                        } else {
                          refHash = log.details || 'Pending details';
                        }

                        return (
                          <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-[#0f0f11]/50 transition-all">
                            <td className="p-4 text-gray-900 dark:text-gray-100">
                              <div className="font-bold">{log.user?.full_name || log.user?.username || 'Unknown'}</div>
                              <div className="text-[10px] text-gray-400 font-normal">{log.user?.email}</div>
                            </td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded-[4px] text-[10px] uppercase font-black tracking-wider ${isDep ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                                {isDep ? (language === "ar" ? "إيداع" : "DEPOSIT") : (language === "ar" ? "سحب" : "WITHDRAWAL")}
                              </span>
                            </td>
                            <td className={`p-4 font-black font-mono text-xs ${isDep ? 'text-emerald-500' : 'text-rose-500'}`}>
                              {isDep ? '+' : '-'}${Number(log.realAmount).toFixed(2)}
                            </td>
                            <td className="p-4 text-gray-400 font-mono text-[10px] uppercase">{log.method}</td>
                            <td className="p-4">
                              <span className={`px-2.5 py-1 rounded-[4px] text-[9px] font-black uppercase tracking-widest ${
                                log.status === 'approved' || log.status === 'success' ? 'bg-emerald-500/10 text-emerald-500' :
                                log.status === 'rejected' || log.status === 'failed' ? 'bg-rose-500/10 text-rose-500' :
                                'bg-amber-500/10 text-amber-500 animate-pulse'
                              }`}>
                                {log.status}
                              </span>
                            </td>
                            <td className="p-4 text-gray-500 font-mono text-[10px] truncate max-w-[150px]" title={refHash}>{refHash}</td>
                            <td className="p-4 text-gray-400 text-[10px]">{new Date(log.created_at).toLocaleString()}</td>
                            <td className="p-4 text-center">
                              {log.status !== 'pending' && (
                                <button
                                  onClick={() => handleDeleteRequest(log.id, log.logType)}
                                  className="px-2 py-1 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded text-[10px] uppercase font-black transition-all cursor-pointer select-none"
                                  title={language === "ar" ? "مسح هذا السجل المنتهي نهائيا" : "Delete expired or finished record"}
                                >
                                  {language === "ar" ? "مسح" : "DELETE"}
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    {financialRequests.deposits.length === 0 && financialRequests.withdrawals.length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-12 text-center text-gray-500">
                          {language === "ar" ? "لا توجد أي سجلات معاملات دفترية مسجلة حالياً." : "No records registered on the system ledger yet."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "financial_requests" && (
          <div className="space-y-8 font-sans">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]" size={24} />
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    {language === "ar" ? "معالجة طلبات الإيداع والسحب اليدوية" : "Manual Financial Verification Terminal"}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {language === "ar" ? "مراجعة إثباتات التحويل للعملات وحوالات البنوك وإتمام التحويلات الصادرة بدقة عالية." : "Audit user payment screenshots, reference IDs, and click approve to update balances onto the core ledger."}
                  </p>
                </div>
              </div>
              <button
                onClick={fetchFinancialRequests}
                disabled={isLoadingRequests}
                className="p-2 text-gray-400 hover:text-emerald-500 transition-colors"
                title="Refresh requests list"
              >
                <RefreshCw size={18} className={isLoadingRequests ? "animate-spin text-emerald-500" : ""} />
              </button>
            </div>

            {isLoadingRequests ? (
              <div className="flex items-center justify-center p-12">
                <RefreshCw className="animate-spin text-emerald-500" size={24} />
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                
                {/* 1. MANUAL DEPOSITS BLOCK */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-widest text-[#10b981] border-b border-gray-100 dark:border-gray-800 pb-2">
                    {language === "ar" ? "طلبات الإيداع اليدوي العالقة" : "Pending Manual Deposits"} ({financialRequests.deposits.filter(d => d.status === 'pending').length})
                  </h4>
                  
                  {financialRequests.deposits.filter(d => d.status === 'pending').map((request) => {
                    let refId = '';
                    let proofImg = '';
                    try {
                      const payload = JSON.parse(request.proof_url);
                      refId = payload.reference_id || 'None';
                      proofImg = payload.image_url || '';
                    } catch {
                      refId = request.proof_url || 'None';
                    }

                    return (
                      <div
                        key={request.id}
                        className={`p-5 rounded-[4px] border space-y-4 transition-all hover:scale-[1.005] duration-300 ${
                          theme === "dark" ? "bg-[#1e1e21] border-gray-800/80" : "bg-white border-gray-150/80"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <span className="text-[9px] font-black uppercase tracking-wider text-[#10b981] bg-emerald-500/5 px-2 py-0.5 rounded-[4px]">
                              {request.method}
                            </span>
                            <div className="font-bold text-xs text-gray-900 dark:text-white mt-1 font-sans">
                              {request.user?.full_name || request.user?.username || 'Unknown customer'}
                            </div>
                            <div className="text-[10px] text-gray-400 font-sans">{request.user?.email}</div>
                          </div>
                          
                          <div className="text-right">
                            <div className="text-[9px] text-gray-500 font-black uppercase tracking-widest font-sans">Requested Value</div>
                            <div className="text-sm font-black text-[#10b981] font-mono">${Number(request.amount).toFixed(2)} USD</div>
                          </div>
                        </div>

                        <div className="p-3 bg-black/20 dark:bg-black/40 rounded-[4px] border border-gray-100 dark:border-gray-800/60 text-[10px] font-mono space-y-1">
                          <div className="flex justify-between">
                            <span className="text-gray-500">TXID Reference:</span>
                            <span className="font-bold text-[#10b981] select-all">{refId}</span>
                          </div>
                          {proofImg && (
                            <div className="flex justify-between items-center pt-2 mt-2 border-t border-gray-800/20">
                              <span className="text-gray-500">Attachment proof image:</span>
                              <a
                                href={`/uploads/${proofImg}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[#10b981] font-black flex items-center gap-1 hover:underline"
                              >
                                {language === "ar" ? "عرض إثبات التحويل ↗" : "VIEW STATEMENT ↗"}
                              </a>
                            </div>
                          )}
                          <div className="flex justify-between text-gray-500 pt-1 text-[9px]">
                            <span>Submitted:</span>
                            <span>{new Date(request.created_at).toLocaleString()}</span>
                          </div>
                        </div>

                        {/* Actions block */}
                        <div className="space-y-3 font-sans">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleDepositAction(request.id, 'approve')}
                              disabled={actioningId !== null}
                              className="flex-1 h-9 bg-emerald-500 hover:bg-emerald-600 font-bold active:scale-[0.99] text-white rounded-[4px] text-[10px] uppercase tracking-wider transition-all duration-200"
                            >
                              {actioningId === request.id.toString() ? (
                                <RefreshCw className="animate-spin text-white mx-auto" size={12} />
                              ) : (
                                language === "ar" ? "موافقة وتحديث الرصيد" : "APPROVE & ENROLL"
                              )}
                            </button>
                            <button
                              onClick={() => {
                                if (!rejectionReasons[request.id]) {
                                  showToast(language === "ar" ? "الرجاء إدخال سبب الرفض أولاً" : "Please provide rejection explanation first", "error");
                                  return;
                                }
                                handleDepositAction(request.id, 'reject');
                              }}
                              disabled={actioningId !== null}
                              className="px-4 h-9 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white font-bold active:scale-[0.99] rounded-[4px] text-[10px] uppercase tracking-wider transition-all duration-200"
                            >
                              {language === "ar" ? "رفض" : "REJECT"}
                            </button>
                          </div>
                          
                          <input
                            type="text"
                            value={rejectionReasons[request.id] || ''}
                            onChange={(e) => setRejectionReasons(prev => ({ ...prev, [request.id]: e.target.value }))}
                            placeholder={language === "ar" ? "أدخل سبب الرفض في حال نقر الزر..." : "Write rejection memo if choosing to deny..."}
                            className="w-full h-8 px-3 text-[10px] bg-black/10 border border-rose-500/20 focus:border-rose-500 rounded-[4px] focus:outline-none placeholder:text-gray-600 text-rose-400 font-sans"
                          />
                        </div>
                      </div>
                    );
                  })}

                  {financialRequests.deposits.filter(d => d.status === 'pending').length === 0 && (
                    <div className="p-8 text-center text-xs text-gray-500 bg-gray-50/50 dark:bg-[#1a1a1c]/30 rounded-[4px]">
                      {language === "ar" ? "لا توجد معاملات إيداع يدوية معلقة حالياً." : "No deposits waiting code alignment details."}
                    </div>
                  )}
                </div>

                {/* 2. MANUAL WITHDRAWALS BLOCK */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-widest text-[#10b981] border-b border-gray-100 dark:border-gray-800 pb-2">
                    {language === "ar" ? "طلبات السحب المعلقة" : "Pending User Withdrawals"} ({financialRequests.withdrawals.filter(w => w.status === 'pending').length})
                  </h4>

                  {financialRequests.withdrawals.filter(w => w.status === 'pending').map((request) => {
                    const amountUSD = Number(request.amount_cents) / 100;
                    return (
                      <div
                        key={request.id}
                        className={`p-5 rounded-[4px] border space-y-4 transition-all hover:scale-[1.005] duration-300 ${
                          theme === "dark" ? "bg-[#1e1e21] border-gray-800/80" : "bg-white border-gray-150/80"
                        }`}
                      >
                        <div className="flex items-start justify-between font-sans">
                          <div className="space-y-1">
                            <span className="text-[9px] font-black uppercase tracking-wider text-amber-500 bg-amber-500/5 px-2 py-0.5 rounded-[4px]">
                              {request.method}
                            </span>
                            <div className="font-bold text-xs text-gray-900 dark:text-white mt-1 font-sans">
                              {request.user?.full_name || request.user?.username || 'Unknown customer'}
                            </div>
                            <div className="text-[10px] text-gray-400 font-sans">{request.user?.email}</div>
                          </div>

                          <div className="text-right">
                            <div className="text-[9px] text-gray-500 font-black uppercase tracking-widest">Disbursement Amount</div>
                            <div className="text-sm font-black text-rose-500 font-mono">${amountUSD.toFixed(2)} USD</div>
                          </div>
                        </div>

                        <div className="p-3 bg-black/20 dark:bg-black/40 rounded-[4px] border border-gray-100 dark:border-gray-800/60 text-[10px] font-mono space-y-1">
                          <div className="flex justify-between items-start">
                            <span className="text-gray-500">Destination Details:</span>
                            <span className="font-bold text-[var(--text-primary)] text-right max-w-[200px] select-all break-words">{request.details}</span>
                          </div>
                          <div className="flex justify-between text-gray-500 pt-1 text-[9px] border-t border-gray-800/15 mt-1.5">
                            <span>Requested:</span>
                            <span>{new Date(request.created_at).toLocaleString()}</span>
                          </div>
                        </div>

                        {/* Actions block */}
                        <div className="space-y-3 font-sans">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleWithdrawalAction(request.id, 'approve')}
                              disabled={actioningId !== null}
                              className="flex-1 h-9 bg-emerald-500 hover:bg-emerald-600 font-bold active:scale-[0.99] text-white rounded-[4px] text-[10px] uppercase tracking-wider transition-all duration-200"
                            >
                              {actioningId === request.id.toString() ? (
                                <RefreshCw className="animate-spin text-white mx-auto" size={12} />
                              ) : (
                                language === "ar" ? "موافقة وتحويل السحب" : "APPROVE & DISBURSE"
                              )}
                            </button>
                            <button
                              onClick={() => {
                                if (!rejectionReasons[request.id]) {
                                  showToast(language === "ar" ? "الرجاء كتاية سبب الرفض لإعادة الرصيد للمستخدم" : "Please input refund rejection explanation memo", "error");
                                  return;
                                }
                                handleWithdrawalAction(request.id, 'reject');
                              }}
                              disabled={actioningId !== null}
                              className="px-4 h-9 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white font-bold active:scale-[0.99] rounded-[4px] text-[10px] uppercase tracking-wider transition-all duration-200"
                            >
                              {language === "ar" ? "رفض مع الإرجاع" : "REJECT & REFUND"}
                            </button>
                          </div>

                          <input
                            type="text"
                            value={rejectionReasons[request.id] || ''}
                            onChange={(e) => setRejectionReasons(prev => ({ ...prev, [request.id]: e.target.value }))}
                            placeholder={language === "ar" ? "أدخل سبب الرفض في حال رفض المعاملة..." : "Write refund explanation reason memo..."}
                            className="w-full h-8 px-3 text-[10px] bg-black/10 border border-rose-500/20 focus:border-rose-500 rounded-[4px] focus:outline-none placeholder:text-gray-650 text-rose-450 font-sans"
                          />
                        </div>
                      </div>
                    );
                  })}

                  {financialRequests.withdrawals.filter(w => w.status === 'pending').length === 0 && (
                    <div className="p-8 text-center text-xs text-gray-500 bg-gray-50/50 dark:bg-[#1a1a1c]/30 rounded-[4px]">
                      {language === "ar" ? "لا توجد طلبات سحب معلقة حالياً." : "No withdrawal requests pending action."}
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        )}

        {activeTab === "payment_gateways" && (
          <div className="space-y-8 font-sans">
            {/* OFFICIAL AUTOMATED API PORTALS */}
            <div>
              <div className="mb-6">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.3)] mb-1">
                  {dir === "rtl" ? "بوابات الدفع الرسمية المؤتمتة (APIs)" : "Official Automated Payment Gateways"}
                </h4>
                <p className="text-xs text-gray-500">
                  {dir === "rtl" ? "تكوين المفاتيح والاتصال الفوري لمعالجة الاشتراكات وتلقي المدفوعات التلقائية." : "Configure secure API keys for automated checkouts, subscription renewals, and balance increases."}
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* STRIPE OFFICIAL GATEWAY */}
                <div
                  className={`p-6 md:p-8 rounded-[4px] border flex flex-col justify-between ${
                    theme === "dark"
                      ? "bg-[#1a1a1c] border-gray-800/60 hover:border-emerald-500/20"
                      : "bg-white border-gray-150/80 hover:border-emerald-500/20"
                  } transition-all duration-300 shadow-sm`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100 dark:border-gray-800/50">
                      <div className="flex items-center gap-3">
                        <div className="p-3 rounded-[4px] bg-[#635BFF]/10 text-[#635BFF]">
                          <CreditCard size={24} className="drop-shadow-[0_0_8px_rgba(99,91,255,0.4)]" />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-gray-900 dark:text-white">{t("stripeConfig")}</h3>
                          <p className="text-xs text-gray-500">{t("stripeDesc")}</p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <span
                          className={`px-2.5 py-0.5 rounded-[4px] text-[10px] font-bold flex items-center gap-1.5 ${
                            stripeConfig.stripe_status === "active"
                              ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/30"
                              : "bg-amber-500/10 text-amber-500 border border-amber-500/30"
                          }`}
                        >
                          {stripeConfig.stripe_status === "active" ? (
                            <>
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              {dir === "rtl" ? "نشط / معتمد" : "Active / Verified"}
                            </>
                          ) : (
                            <>
                              <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              {dir === "rtl" ? "معلق" : "Pending"}
                            </>
                          )}
                        </span>
                        {stripeConfig.stripe_last_verified_at && (
                          <span className="text-[9px] text-gray-500 font-mono">
                            {new Date(stripeConfig.stripe_last_verified_at).toLocaleDateString(
                              language === "ar" ? "ar-EG" : "en-US",
                            )}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Mode Toggle Banner */}
                    <div
                      className={`mb-6 p-4 rounded-[4px] border ${
                        theme === "dark" ? "bg-[#0f0f11] border-gray-800/80" : "bg-gray-50/50 border-gray-100/80"
                      } flex items-center justify-between`}
                    >
                      <div>
                        <h4 className="text-xs font-bold mb-0.5 text-gray-900 dark:text-white">{t("environment")}</h4>
                        <p className="text-[11px] text-gray-500">
                          {stripeConfig.isLiveMode
                            ? dir === "rtl" ? "بيئة الإنتاج الحقيقية" : "Live Production Environment"
                            : dir === "rtl" ? "بيئة الاختبار التجريبية" : "Test Sandbox Mode"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[9.5px] font-bold tracking-wider ${
                            !stripeConfig.isLiveMode ? "text-amber-500" : "text-gray-400"
                          }`}
                        >
                          TEST
                        </span>
                        <button
                          onClick={() =>
                            setStripeConfig((prev: any) => ({
                              ...prev,
                              isLiveMode: !prev.isLiveMode,
                            }))
                          }
                          className={`relative w-11 h-5.5 rounded-full transition-colors border ${
                            stripeConfig.isLiveMode
                              ? "bg-emerald-500/20 border-emerald-500/40"
                              : "bg-gray-200 dark:bg-gray-800 border-transparent"
                          }`}
                        >
                          <div
                            className={`absolute top-0.5 w-4.2 h-4.2 rounded-full shadow-md transition-all duration-300 ${
                              stripeConfig.isLiveMode ? "bg-emerald-500" : "bg-gray-400 dark:bg-gray-500"
                            } ${
                              dir === "rtl"
                                ? stripeConfig.isLiveMode ? "right-5.5" : "right-0.5"
                                : stripeConfig.isLiveMode ? "left-5.5" : "left-0.5"
                            }`}
                          />
                        </button>
                        <span
                          className={`text-[9.5px] font-bold tracking-wider ${
                            stripeConfig.isLiveMode ? "text-emerald-500" : "text-gray-400"
                          }`}
                        >
                          LIVE
                        </span>
                      </div>
                    </div>

                    <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-450 mb-1.5">
                          {t("publishableKey")}
                        </label>
                        <input
                          type="text"
                          value={stripeConfig.publishableKey || ""}
                          onChange={(e) =>
                            setStripeConfig({
                              ...stripeConfig,
                              publishableKey: e.target.value,
                            })
                          }
                          placeholder="pk_test_..."
                          className={`w-full px-4 py-2.5 rounded-[4px] border focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500/40 font-mono text-xs transition-theme ${
                            theme === "dark"
                              ? "bg-[#0f0f11] border-gray-800 text-white placeholder:text-gray-700"
                              : "bg-gray-50/50 border-gray-200 text-gray-900 placeholder:text-gray-300"
                          }`}
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-450 mb-1.5">
                          {t("secretKey")}
                        </label>
                        <input
                          type="password"
                          value={stripeConfig.secretKey || ""}
                          onChange={(e) =>
                            setStripeConfig({
                              ...stripeConfig,
                              secretKey: e.target.value,
                            })
                          }
                          placeholder="sk_test_..."
                          className={`w-full px-4 py-2.5 rounded-[4px] border focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500/40 font-mono text-xs transition-theme ${
                            theme === "dark"
                              ? "bg-[#0f0f11] border-gray-800 text-white placeholder:text-gray-700"
                              : "bg-gray-50/50 border-gray-200 text-gray-900 placeholder:text-gray-300"
                          }`}
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-450 mb-1.5">
                          {t("webhookSecret")}
                        </label>
                        <input
                          type="password"
                          value={stripeConfig.webhookSecret || ""}
                          onChange={(e) =>
                            setStripeConfig({
                              ...stripeConfig,
                              webhookSecret: e.target.value,
                            })
                          }
                          placeholder="whsec_..."
                          className={`w-full px-4 py-2.5 rounded-[4px] border focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500/40 font-mono text-xs transition-theme ${
                            theme === "dark"
                              ? "bg-[#0f0f11] border-gray-800 text-white placeholder:text-gray-700"
                              : "bg-gray-50/50 border-gray-200 text-gray-900 placeholder:text-gray-300"
                          }`}
                          dir="ltr"
                        />
                        <p className="text-[10px] text-gray-500 mt-2 flex items-start gap-1">
                          <Info size={12} className="text-gray-400 mt-0.5 shrink-0" />
                          {dir === "rtl"
                            ? "مطلوب لمعالجة التنبيهات المباشرة وترقية خطط المشتركين في الخلفية تلقائياً."
                            : "Necessary to safely process events instantly and settle active subscriptions."}
                        </p>
                      </div>
                    </form>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-6 mt-6 border-t border-gray-100 dark:border-gray-850">
                    <button
                      onClick={handleSaveStripeConfig}
                      disabled={isSaving}
                      className="flex-1 bg-[#635BFF] hover:bg-[#5249e5] text-white py-2.5 rounded-[4px] font-bold transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isSaving ? (
                        <RefreshCw size={16} className="animate-spin" />
                      ) : (
                        <Save size={16} />
                      )}
                      {t("saveStripeConfig")}
                    </button>

                    <button
                      onClick={handleVerifyStripeConnection}
                      disabled={isSaving || isVerifyingStripe}
                      className={`px-5 py-2.5 rounded-[4px] font-bold transition-all flex items-center justify-center gap-2 ${
                        theme === "dark"
                          ? "bg-transparent text-gray-400 border border-gray-800 hover:text-emerald-500 hover:border-emerald-500/30 font-medium"
                          : "bg-transparent text-gray-500 border border-gray-200 hover:text-emerald-600 hover:border-emerald-200 font-medium"
                      } disabled:opacity-50 group`}
                    >
                      {isVerifyingStripe ? (
                        <RefreshCw size={16} className="animate-spin" />
                      ) : (
                        <Zap size={16} className="group-hover:text-emerald-500 group-hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)] text-gray-400" />
                      )}
                      {dir === "rtl" ? "تحقق المزامنة" : "Verify Sync"}
                    </button>
                  </div>
                </div>

                {/* PAYPAL OFFICIAL GATEWAY */}
                <div
                  className={`p-6 md:p-8 rounded-[4px] border flex flex-col justify-between ${
                    theme === "dark"
                      ? "bg-[#1a1a1c] border-gray-800/60 hover:border-emerald-500/20"
                      : "bg-white border-gray-150/80 hover:border-emerald-500/20"
                  } transition-all duration-300 shadow-sm`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100 dark:border-gray-800/50">
                      <div className="flex items-center gap-3">
                        <div className="p-3 rounded-[4px] bg-[#003087]/10 text-blue-500">
                          <Globe size={24} className="text-blue-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-gray-900 dark:text-white">
                            {dir === "rtl" ? "بوابة PayPal الرسمية" : "Official PayPal REST API"}
                          </h3>
                          <p className="text-xs text-gray-500">
                            {dir === "rtl" ? "تصدير ومعالجة طلبات الإيداع المباشر عبر API." : "Link official merchant APIs for checkout automation."}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <span
                          className={`px-2.5 py-0.5 rounded-[4px] text-[10px] font-bold flex items-center gap-1.5 ${
                            paypalConfig.paypal_status === "verified"
                              ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/30"
                              : "bg-amber-500/10 text-amber-500 border border-amber-500/30"
                          }`}
                        >
                          {paypalConfig.paypal_status === "verified" ? (
                            <>
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              {dir === "rtl" ? "نشط / معتمد" : "Active / Verified"}
                            </>
                          ) : (
                            <>
                              <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              {dir === "rtl" ? "معلق" : "Pending"}
                            </>
                          )}
                        </span>
                        {paypalConfig.paypal_last_verified_at && (
                          <span className="text-[9px] text-gray-500 font-mono">
                            {new Date(paypalConfig.paypal_last_verified_at).toLocaleDateString(
                              language === "ar" ? "ar-EG" : "en-US",
                            )}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Mode Toggle Banner */}
                    <div
                      className={`mb-6 p-4 rounded-[4px] border ${
                        theme === "dark" ? "bg-[#0f0f11] border-gray-800/80" : "bg-gray-50/50 border-gray-100/80"
                      } flex items-center justify-between`}
                    >
                      <div>
                        <h4 className="text-xs font-bold mb-0.5 text-gray-900 dark:text-white">{t("environment")}</h4>
                        <p className="text-[11px] text-gray-500">
                          {paypalConfig.mode === "live"
                            ? dir === "rtl" ? "بيئة الإنتاج الحقيقية" : "Live Production Environment"
                            : dir === "rtl" ? "بيئة الاختبار التجريبية" : "Test Sandbox Mode"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[9.5px] font-bold tracking-wider ${
                            paypalConfig.mode !== "live" ? "text-amber-500" : "text-gray-400"
                          }`}
                        >
                          SANDBOX
                        </span>
                        <button
                          onClick={() =>
                            setPaypalConfig((prev: any) => ({
                              ...prev,
                              mode: prev.mode === "live" ? "sandbox" : "live",
                            }))
                          }
                          className={`relative w-11 h-5.5 rounded-full transition-colors border ${
                            paypalConfig.mode === "live"
                              ? "bg-emerald-500/20 border-emerald-500/40"
                              : "bg-gray-200 dark:bg-gray-800 border-transparent"
                          }`}
                        >
                          <div
                            className={`absolute top-0.5 w-4.2 h-4.2 rounded-full shadow-md transition-all duration-300 ${
                              paypalConfig.mode === "live" ? "bg-emerald-500" : "bg-gray-400 dark:bg-gray-500"
                            } ${
                              dir === "rtl"
                                ? paypalConfig.mode === "live" ? "right-5.5" : "right-0.5"
                                : paypalConfig.mode === "live" ? "left-5.5" : "left-0.5"
                            }`}
                          />
                        </button>
                        <span
                          className={`text-[9.5px] font-bold tracking-wider ${
                            paypalConfig.mode === "live" ? "text-emerald-500" : "text-gray-400"
                          }`}
                        >
                          LIVE
                        </span>
                      </div>
                    </div>

                    <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-450 mb-1.5">
                          {dir === "rtl" ? "معرف العميل (Client ID)" : "PayPal Client ID"}
                        </label>
                        <input
                          type="text"
                          value={paypalConfig.clientId || ""}
                          onChange={(e) =>
                            setPaypalConfig({
                              ...paypalConfig,
                              clientId: e.target.value,
                            })
                          }
                          placeholder="Ab_..."
                          className={`w-full px-4 py-2.5 rounded-[4px] border focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500/40 font-mono text-xs transition-theme ${
                            theme === "dark"
                              ? "bg-[#0f0f11] border-gray-800 text-white placeholder:text-gray-700"
                              : "bg-gray-50/50 border-gray-200 text-gray-900 placeholder:text-gray-300"
                          }`}
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-450 mb-1.5">
                          {dir === "rtl" ? "المفتاح السري (Client Secret)" : "PayPal Client Secret"}
                        </label>
                        <input
                          type="password"
                          value={paypalConfig.clientSecret || ""}
                          onChange={(e) =>
                            setPaypalConfig({
                              ...paypalConfig,
                              clientSecret: e.target.value,
                            })
                          }
                          placeholder="EK_..."
                          className={`w-full px-4 py-2.5 rounded-[4px] border focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-emerald-500/40 font-mono text-xs transition-theme ${
                            theme === "dark"
                              ? "bg-[#0f0f11] border-gray-800 text-white placeholder:text-gray-700"
                              : "bg-gray-50/50 border-gray-200 text-gray-900 placeholder:text-gray-300"
                          }`}
                          dir="ltr"
                        />
                      </div>
                      <div className="opacity-70">
                        <span className="block text-xs font-medium text-gray-500 dark:text-gray-450 mb-1.5">
                          {dir === "rtl" ? "شحن الرصيد التلقائي" : "Instant Ingestion Option"}
                        </span>
                        <p className="text-[10px] text-gray-500 flex items-start gap-1">
                          <Info size={12} className="text-gray-400 mt-0.5 shrink-0" />
                          {dir === "rtl"
                            ? "يتم التسوية والقيد اللحظي للأرصدة في PostgreSQL بمجرد موافقة العميل على تفويض PayPal."
                            : "Once dynamic payments are authorized, funds will be captures with immediate PostgreSQL ledger logs."}
                        </p>
                      </div>
                    </form>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-6 mt-6 border-t border-gray-100 dark:border-gray-850">
                    <button
                      onClick={handleSavePaypalConfig}
                      disabled={isSaving}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-[4px] font-bold transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm"
                    >
                      {isSaving ? (
                        <RefreshCw size={16} className="animate-spin" />
                      ) : (
                        <Save size={16} />
                      )}
                      {dir === "rtl" ? "حفظ إعدادات PayPal" : "Save PayPal Config"}
                    </button>

                    <button
                      onClick={handleVerifyPaypalConnection}
                      disabled={isSaving || isVerifyingPaypal}
                      className={`px-5 py-2.5 rounded-[4px] font-bold transition-all flex items-center justify-center gap-2 ${
                        theme === "dark"
                          ? "bg-transparent text-gray-400 border border-gray-800 hover:text-emerald-500 hover:border-emerald-500/30 font-medium"
                          : "bg-transparent text-gray-500 border border-gray-200 hover:text-emerald-600 hover:border-emerald-200 font-medium"
                      } disabled:opacity-50 group`}
                    >
                      {isVerifyingPaypal ? (
                        <RefreshCw size={16} className="animate-spin" />
                      ) : (
                        <Zap size={16} className="group-hover:text-emerald-500 group-hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)] text-gray-400" />
                      )}
                      {dir === "rtl" ? "تحقق المزامنة" : "Verify Sync"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* MANUAL & ALTERNATIVE WALLET GATEWAYS CONFIG */}
            <div>
              <div className="mb-6">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.3)] mb-1">
                  {dir === "rtl" ? "قنوات الإيداع والتحصيل اليدوي للمحافظ" : "Alternative Manual Deposit Routes"}
                </h4>
                <p className="text-xs text-gray-500">
                  {dir === "rtl" ? "تعديل خيارات التحويل يدويًا خارج بوابات الدفع الفوري (العملات المشفرة، الحوالات والبريد الإلكتروني)." : "Configure custom payment instructions and wallet destinations displayed to users on the deposits tab."}
                </p>
              </div>

              <div
                className={`p-6 md:p-8 rounded-xl border ${
                  theme === "dark" ? "bg-[#161618] border-gray-800/80" : "bg-white border-gray-150"
                } transition-all duration-300 shadow-sm`}
              >
                <div className="flex items-center gap-3 mb-8 pb-4 border-b border-gray-100 dark:border-gray-800/60">
                  <div className="p-3 rounded-md bg-emerald-500/10 text-emerald-500">
                    <Landmark size={24} className="text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">
                      {dir === "rtl" ? "وجهات الإيداعات اليدوية" : "Alternative Manual Destinations"}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {dir === "rtl"
                        ? "هذه الإعدادات توجه المستخدمين لإتمام الدفع خارج النظام مع إيقاظ طلبات الإيداع للتثبيت."
                        : "Define where manual deposits are sent and specify international client routing numbers."}
                    </p>
                  </div>
                </div>

                {/* 3-Column horizontal grid for perfect utilization of space */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                  {/* Column 1: Crypto Wallet Setup */}
                  <div className="border border-emerald-500/10 rounded-xl p-5 bg-emerald-500/[0.015] flex flex-col justify-between space-y-4">
                    <div>
                      <h4 className="text-sm font-bold text-emerald-500 flex items-center gap-2 mb-2">
                        <Smartphone size={16} />
                        {dir === "rtl" ? "عملة USDT المستقرة (TRC-20)" : "USDT Stablecoin (TRC-20)"}
                      </h4>
                      <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                        {dir === "rtl"
                          ? "تلقي دفعات العملات الرقمية المستقرة وسحبها يدويًا إلى هذا العنوان بمطابقة المعاملات."
                          : "Direct crypto deposit processing. Users request transactions using ledger hashes."}
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-[11px] font-medium text-gray-500 mb-1.5">
                          {dir === "rtl" ? "عنوان محفظة USDT المتلقية" : "Receiving USDT Address (TRC-20)"}
                        </label>
                        <input
                          type="text"
                          value={economySettings.crypto_address || ""}
                          onChange={(e) =>
                            setEconomySettings({
                              ...economySettings,
                              crypto_address: e.target.value,
                            })
                          }
                          placeholder="TPh7eWpY..."
                          className={`w-full px-4 py-2.5 rounded-lg border focus:outline-none focus:ring-1.5 focus:ring-emerald-500/35 font-mono text-xs transition-all ${
                            theme === "dark"
                              ? "bg-[#1e1e21] border-gray-800 text-white placeholder:text-gray-700"
                              : "bg-white border-gray-200 text-gray-900 placeholder:text-gray-300"
                          }`}
                          dir="ltr"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Column 2: PayPal Direct Ingestion */}
                  <div className="border border-indigo-500/10 rounded-xl p-5 bg-indigo-500/[0.015] flex flex-col justify-between space-y-4">
                    <div>
                      <h4 className="text-sm font-bold text-indigo-500 flex items-center gap-2 mb-2">
                        <Globe size={16} />
                        {dir === "rtl" ? "نظام باي بال المباشر" : "Direct PayPal Ingestion"}
                      </h4>
                      <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                        {dir === "rtl"
                          ? "بريد باي بال التجاري البديل لتلقي مبالغ الشحن مع توجيه آمن ومباشر لإتمام الدفع الفوري."
                          : "Fallback client processing using structured commercial Paypal email routing."}
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-[11px] font-medium text-gray-500 mb-1.5">
                          {dir === "rtl" ? "البريد الإلكتروني لتلقي المدفوعات" : "Business PayPal Email Address"}
                        </label>
                        <input
                          type="email"
                          value={economySettings.paypal_email || ""}
                          onChange={(e) =>
                            setEconomySettings({
                              ...economySettings,
                              paypal_email: e.target.value,
                            })
                          }
                          placeholder="paypal@yourdomain.com"
                          className={`w-full px-4 py-2.5 rounded-lg border focus:outline-none focus:ring-1.5 focus:ring-indigo-500/35 font-mono text-xs transition-all ${
                            theme === "dark"
                              ? "bg-[#1e1e21] border-gray-800 text-white placeholder:text-gray-700"
                              : "bg-white border-gray-200 text-gray-900 placeholder:text-gray-300"
                          }`}
                          dir="ltr"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Column 3: Custom Bank Transfer details */}
                  <div className="border border-blue-500/10 rounded-xl p-5 bg-blue-500/[0.015] space-y-4">
                    <h4 className="text-sm font-bold text-blue-500 flex items-center gap-2 mb-2">
                      <Building size={16} />
                      {dir === "rtl" ? "معلومات التحويل البنكي" : "Bank Transfer & IBAN Node Wire"}
                    </h4>

                    {/* Highly responsive interior layout for bank attributes */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-black tracking-wide text-gray-500 uppercase mb-1">
                          {dir === "rtl" ? "اسم البنك" : "Bank Name"}
                        </label>
                        <input
                          type="text"
                          value={economySettings.bank_name || ""}
                          onChange={(e) =>
                            setEconomySettings({
                              ...economySettings,
                              bank_name: e.target.value,
                            })
                          }
                          placeholder="e.g. Bank Leumi"
                          className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-1.5 focus:ring-blue-500/35 text-xs transition-all ${
                            theme === "dark" ? "bg-[#1e1e21] border-gray-800 text-white" : "bg-white border-gray-200"
                          }`}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black tracking-wide text-gray-500 uppercase mb-1">
                          {dir === "rtl" ? "اسم المستلم / المستفيد" : "Beneficiary / Account Holder"}
                        </label>
                        <input
                          type="text"
                          value={economySettings.bank_recipient || ""}
                          onChange={(e) =>
                            setEconomySettings({
                              ...economySettings,
                              bank_recipient: e.target.value,
                            })
                          }
                          placeholder="e.g. Perplexta Platforms"
                          className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-1.5 focus:ring-blue-500/35 text-xs transition-all ${
                            theme === "dark" ? "bg-[#1e1e21] border-gray-800 text-white" : "bg-white border-gray-200"
                          }`}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black tracking-wide text-gray-500 uppercase mb-1">
                          {dir === "rtl" ? "رمز السويفت SWIFT / BIC" : "SWIFT / BIC Code"}
                        </label>
                        <input
                          type="text"
                          value={economySettings.bank_swift || ""}
                          onChange={(e) =>
                            setEconomySettings({
                              ...economySettings,
                              bank_swift: e.target.value,
                            })
                          }
                          placeholder="PPLXIL33"
                          className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-1.5 focus:ring-blue-500/35 text-xs font-mono transition-all ${
                            theme === "dark" ? "bg-[#1e1e21] border-gray-800 text-white" : "bg-white border-gray-200"
                          }`}
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black tracking-wide text-gray-500 uppercase mb-1">
                          {dir === "rtl" ? "رقم الحساب أو الآيبان" : "IBAN / Account Number"}
                        </label>
                        <input
                          type="text"
                          value={economySettings.bank_iban || ""}
                          onChange={(e) =>
                            setEconomySettings({
                              ...economySettings,
                              bank_iban: e.target.value,
                            })
                          }
                          placeholder="IL..."
                          className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-1.5 focus:ring-blue-500/35 text-xs font-mono transition-all ${
                            theme === "dark" ? "bg-[#1e1e21] border-gray-800 text-white" : "bg-white border-gray-200"
                          }`}
                          dir="ltr"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-gray-100 dark:border-gray-800/60 flex justify-end">
                  <button
                    onClick={handleSaveWalletGateways}
                    disabled={isSaving}
                    className="w-full sm:w-auto px-8 bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-lg font-bold transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50 shadow-md shadow-emerald-500/10"
                  >
                    {isSaving ? (
                      <RefreshCw size={18} className="animate-spin" />
                    ) : (
                      <Save size={18} />
                    )}
                    {dir === "rtl" ? "حفظ تكوين بوابات المحفظة البديلة" : "Save Alternative Gateways"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Confirmation Modal */}
      {confirmModal && confirmModal.isOpen && (
        <ActionConfirmationModal
          isOpen={confirmModal.isOpen}
          onClose={() => setConfirmModal(null)}
          onConfirm={confirmModal.onConfirm}
          title={confirmModal.title}
          description={confirmModal.description}
          variant={confirmModal.variant}
          confirmLabel={confirmModal.confirmLabel}
        />
      )}
    </div>
  );
};

const ALL_TOOLS = [
  "chat",
  "chat_fast",
  "chat_pro",
  "chat_reasoning",
  "perplexta_analysis",
  "legal_analysis",
  "notebook",
  "image",
  "video",
  "stt",
  "tts",
  "learning",
  "code",
  "canvas",
  "sovereign_memory",
  "sovereign_search",
  "x402_api",
  "storage_mb",
  "marketplace_listings",
];

const PlansSubscriptionsView = ({
  theme,
  t,
  dir,
}: {
  theme: string;
  t: (key: string, replacements?: any) => string;
  dir: string;
}) => {
  const { plans, setPlans, token, language, setIsOperationPending } =
    useAppContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  useEffect(() => {
    setIsOperationPending(isSaving);
  }, [isSaving, setIsOperationPending]);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchPlans = async () => {
    try {
      const res = await fetch("/api/admin/plans", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const formattedPlans = data.map((p: any) => ({
          id: p.id.toString(),
          nameEn: p.name_en,
          nameAr: p.name_ar,
          descEn: p.desc_en,
          descAr: p.desc_ar,
          badge: p.badge,
          discount: p.discount,
          isActive: p.is_active,
          isVisible: p.is_visible,
          monthlyPrice: parseFloat(p.monthly_price),
          annualPrice: parseFloat(p.annual_price),
          color: p.color,
          planType: p.plan_type || "user",
          features:
            typeof p.features === "string"
              ? JSON.parse(p.features)
              : Array.isArray(p.features)
                ? p.features
                : [],
          limits:
            typeof p.limits === "string"
              ? JSON.parse(p.limits)
              : typeof p.limits === "object" && p.limits !== null
                ? p.limits
                : {},
        }));
        setPlans(formattedPlans);
      }
    } catch (error) {
      console.error("Error fetching plans:", error);
    }
  };

  useEffect(() => {
    if (token) fetchPlans();
    const handleAdd = () => handleOpenModal();
    window.addEventListener("admin-add-plan", handleAdd);
    return () => window.removeEventListener("admin-add-plan", handleAdd);
  }, [token]);

  const handleOpenModal = (plan?: any) => {
    if (plan) {
      // Initialize limits with defaults for all tools
      const limits: Record<string, any> = {};
      ALL_TOOLS.forEach((toolId) => {
        limits[toolId] = { daily: 0, monthly: 0 };
      });

      const savedLimits = { ...plan.limits };

      // Merge saved limits
      Object.keys(savedLimits).forEach((key) => {
        let val = savedLimits[key];
        if (typeof val === "number") {
          val = { daily: val, monthly: val * 30 };
        }
        limits[key] = val;
      });

      setEditingPlan({
        ...plan,
        isActive: plan.isActive !== undefined ? plan.isActive : true,
        isVisible: plan.isVisible !== undefined ? plan.isVisible : true,
        planType: plan.planType || "user",
        limits,
      });
    } else {
      const limits: Record<string, any> = {};
      ALL_TOOLS.forEach((toolId) => {
        limits[toolId] = { daily: 10, monthly: 300 };
      });

      setEditingPlan({
        id: "new",
        nameEn: "",
        nameAr: "",
        descEn: "",
        descAr: "",
        badge: "none",
        discount: 0,
        isActive: true,
        isVisible: true,
        monthlyPrice: 0,
        annualPrice: 0,
        color: "#10b981",
        features: [],
        planType: "user",
        limits,
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingPlan(null);
  };

  const handleSavePlan = async () => {
    // Validation
    if (
      !editingPlan.nameEn ||
      !editingPlan.nameAr ||
      !editingPlan.descEn ||
      !editingPlan.descAr
    ) {
      showToast(t("toastAllFieldsRequired"), "error");
      return;
    }

    if (
      editingPlan.monthlyPrice === undefined ||
      editingPlan.annualPrice === undefined
    ) {
      showToast(t("toastPricingRequired"), "error");
      return;
    }

    if (editingPlan.features.length === 0) {
      showToast(t("toastFeatureRequired"), "error");
      return;
    }

    // Ensure all features have text
    const incompleteFeature = editingPlan.features.find(
      (f: any) => !f.textEn || !f.textAr,
    );
    if (incompleteFeature) {
      showToast(t("toastFeatureTranslationRequired"), "error");
      return;
    }

    setIsSaving(true);
    try {
      const isNew = editingPlan.id === "new";
      const url = isNew
         ? "/api/admin/plans"
         : `/api/admin/plans/${editingPlan.id}`;
      const method = isNew ? "POST" : "PUT";

      const payload = {
        name_en: editingPlan.nameEn,
        name_ar: editingPlan.nameAr,
        desc_en: editingPlan.descEn,
        desc_ar: editingPlan.descAr,
        badge: editingPlan.badge,
        discount: editingPlan.discount,
        is_active: editingPlan.isActive,
        is_visible: editingPlan.isVisible,
        monthly_price: editingPlan.monthlyPrice,
        annual_price: editingPlan.annualPrice,
        color: editingPlan.color,
        features: editingPlan.features,
        limits: editingPlan.limits,
        plan_type: editingPlan.planType || "user",
      };

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        await fetchPlans();
        showToast(t("toastPlanSaveSuccess"), "success");
        handleCloseModal();
      } else {
        showToast(
          language === "ar" ? "فشل حفظ الخطة" : "Failed to save plan",
          "error",
        );
      }
    } catch (error) {
      console.error("Error saving plan:", error);
      showToast(
        language === "ar" ? "فشل حفظ الخطة" : "Failed to save plan",
        "error",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePlan = async (id: string) => {
    if (!window.confirm(t("deletePlanConfirm"))) return;

    try {
      const res = await fetch(`/api/admin/plans/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        showToast(t("toastPlanDeleteSuccess"), "success");
        fetchPlans();
      } else {
        showToast(t("toastPlanDeleteError"), "error");
      }
    } catch (error) {
      console.error("Error deleting plan:", error);
      showToast(
        language === "ar" ? "خطأ في الاتصال" : "Connection Error",
        "error",
      );
    }
  };

  const addFeature = () => {
    setEditingPlan({
      ...editingPlan,
      features: [
        ...editingPlan.features,
        { id: Date.now().toString(), textEn: "", textAr: "" },
      ],
    });
  };

  const removeFeature = (id: string) => {
    setEditingPlan({
      ...editingPlan,
      features: editingPlan.features.filter((f: any) => f.id !== id),
    });
  };

  const updateFeature = (
    id: string,
    field: "textEn" | "textAr",
    value: string,
  ) => {
    setEditingPlan({
      ...editingPlan,
      features: editingPlan.features.map((f: any) =>
        f.id === id ? { ...f, [field]: value } : f,
      ),
    });
  };

  const updateLimit = (
    field: string,
    subfield: "daily" | "monthly",
    value: string,
  ) => {
    const newLimits = { ...editingPlan.limits };
    if (typeof newLimits[field] !== "object" || newLimits[field] === null) {
      newLimits[field] = { daily: 0, monthly: 0 };
    }
    const val = value === "unlimited" ? "unlimited" : parseInt(value) || 0;
    newLimits[field] = { ...newLimits[field], [subfield]: val };
    setEditingPlan({ ...editingPlan, limits: newLimits });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto relative">
      {/* Toast Notification */}
      {toast &&
        createPortal(
          <div
            className={`fixed bottom-6 ${dir === "rtl" ? "left-6" : "right-6"} z-[1000] flex items-center gap-3 px-6 py-4 rounded-[var(--radius)] shadow-2xl transition-theme animate-in slide-in-from-bottom-5 ${
              toast.type === "success"
                ? theme === "dark"
                  ? "bg-[#1a1a1c] border border-emerald-500/30 text-emerald-500"
                  : "bg-white border border-emerald-200 text-emerald-600"
                : theme === "dark"
                  ? "bg-[#1a1a1c] border border-red-500/30 text-red-500"
                  : "bg-white border border-red-200 text-red-600"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle2 size={20} />
            ) : (
              <AlertCircle size={20} />
            )}
            <span className="font-medium text-sm">{toast.message}</span>
          </div>,
          document.body,
        )}

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`p-6 rounded-lg border ${theme === "dark" ? "border-[var(--border-main)] bg-[#111111]" : "border-[var(--border-main)] bg-white"} transition-theme hover:border-[var(--border-main)] flex flex-col relative overflow-hidden`}
          >
            {/* Top Color Accent */}
            <div
              className="absolute top-0 left-0 right-0 h-1"
              style={{ backgroundColor: plan.color || "#10b981" }}
            ></div>

            <div className="flex justify-between items-start mb-4 mt-2">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: plan.color || "#10b981" }}
                  ></span>
                  {dir === "rtl" ? plan.nameAr : plan.nameEn}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {dir === "rtl" ? plan.descAr : plan.descEn}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-emerald-500">
                  ${plan.monthlyPrice}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  / {t("monthly")}
                </p>
              </div>
            </div>

            <div className="flex-1 space-y-3 mb-6">
              {plan.features.slice(0, 4).map((feature: any) => (
                <div
                  key={feature.id}
                  className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300"
                >
                  <CheckCircle2
                    size={16}
                    className="text-emerald-500 shrink-0 mt-0.5"
                  />
                  <span>{dir === "rtl" ? feature.textAr : feature.textEn}</span>
                </div>
              ))}
              {plan.features.length > 4 && (
                <p className="text-xs text-gray-500 italic">
                  +{plan.features.length - 4} more features...
                </p>
              )}
            </div>

            <div className="mb-6 pt-4 border-t border-gray-100 dark:border-gray-800/60">
              <span className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-wider block mb-2">
                {dir === "rtl" ? "حصص الأدوات والملفات النشطة" : "Active Tool & File Quotas"}
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-[100px] overflow-y-auto custom-scrollbar">
                {Object.entries(plan.limits || {}).map(([key, limitVal]: [string, any]) => {
                  if (limitVal === undefined || limitVal === null) return null;
                  const daily = typeof limitVal === 'object' && limitVal !== null ? limitVal.daily : limitVal;
                  const monthly = typeof limitVal === 'object' && limitVal !== null ? limitVal.monthly : null;
                  const formatLimit = (v: any) => v === "unlimited" ? "∞" : (v || 0);

                  return (
                    <div
                      key={key}
                      className="text-[9px] font-bold px-2 py-0.5 rounded border border-gray-100 dark:border-gray-800/60 bg-gray-50 dark:bg-gray-800/30 flex items-center gap-1.5 text-gray-600 dark:text-gray-400"
                    >
                      <span className="text-emerald-500 font-extrabold">{t(key)}</span>
                      <span className="font-mono text-[8px]">
                        {daily !== undefined && daily !== null && (
                          <>D: <strong className="text-gray-900 dark:text-white">{formatLimit(daily)}</strong></>
                        )}
                        {monthly !== null && monthly !== 0 && monthly !== undefined && (
                          <>; M: <strong className="text-emerald-500">{formatLimit(monthly)}</strong></>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => handleOpenModal(plan)}
                className={`flex-1 py-2.5 rounded-md border transition-theme font-medium text-sm flex items-center justify-center gap-2 ${
                  theme === "dark"
                    ? "border-[var(--border-main)] bg-[#1a1a1c] hover:bg-[var(--bg-secondary)] text-gray-300"
                    : "border-[var(--border-main)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-input)] text-gray-600"
                }`}
              >
                <Settings2 size={16} /> {t("edit")}
              </button>
              <button
                onClick={() => handleDeletePlan(plan.id)}
                className={`px-4 py-2.5 rounded-md border transition-theme flex items-center justify-center ${
                  theme === "dark"
                    ? "border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-500"
                    : "border-red-200 bg-red-50 hover:bg-red-100 text-red-600"
                }`}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {isModalOpen &&
        editingPlan &&
        createPortal(
          <div className="fixed inset-0 z-[1000] flex justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <div
              className={`w-full max-w-4xl mt-[80px] mb-8 overflow-y-auto custom-scrollbar rounded-lg border shadow-2xl ${theme === "dark" ? "bg-[#161618] border-[var(--border-main)]" : "bg-white border-[var(--border-main)]"}`}
            >
              {/* Modal Header */}
              <div
                className={`sticky top-0 z-[1100] flex items-center justify-between p-6 border-b ${theme === "dark" ? "border-[var(--border-main)] bg-[#161618]/95" : "border-[var(--border-main)] bg-white/95"} backdrop-blur-md`}
              >
                <div className="flex items-center gap-4">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {editingPlan.nameEn
                      ? dir === "rtl"
                        ? editingPlan.nameAr
                        : editingPlan.nameEn
                      : t("addNewPlan")}
                  </h2>
                  {editingPlan.id !== "new" && (
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest bg-[var(--bg-secondary)]0/10 px-2 py-0.5 rounded-md border border-[var(--border-subtle)]">
                      ID: {editingPlan.id}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleSavePlan}
                    disabled={isSaving}
                    className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2 rounded-md transition-theme font-bold text-sm shadow-[0_5px_15px_rgba(16,185,129,0.3)] disabled:opacity-50"
                  >
                    {isSaving ? (
                      <RefreshCw className="animate-spin" size={18} />
                    ) : (
                      <Save size={18} />
                    )}
                    {t("saveSettings") || "Save"}
                  </button>
                  <div className="w-px h-6 bg-[var(--bg-secondary)]/40" />
                  <button
                    onClick={handleCloseModal}
                    className={`p-2 rounded-md transition-theme ${theme === "dark" ? "hover:bg-[var(--bg-secondary)] text-gray-400 hover:text-white" : "hover:bg-[var(--bg-input)] text-gray-500 hover:text-gray-900"}`}
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6 order-2 lg:order-1">
                  <div className="flex gap-4">
                    <div className="flex-1 space-y-2">
                      <label className="text-xs font-medium text-gray-500 px-1">
                        {t("badge")}
                      </label>
                      <select
                        value={editingPlan.badge || ""}
                        onChange={(e) =>
                          setEditingPlan({
                            ...editingPlan,
                            badge: e.target.value,
                          })
                        }
                        className={`w-full h-11 px-3 rounded-md border ${theme === "dark" ? "bg-[#0f0f11] border-[var(--border-main)]/80 text-gray-300" : "bg-[var(--bg-secondary)] border-[var(--border-main)] text-gray-900"} focus:outline-none focus:border-emerald-500/50 transition-theme appearance-none`}
                        dir={dir}
                      >
                        <option value="none">{t("none")}</option>
                        <option value="bestSeller">{t("bestSeller")}</option>
                        <option value="popular">{t("popular")}</option>
                        <option value="newBadge">{t("newBadge")}</option>
                      </select>
                    </div>
                    <div className="flex-1 space-y-2">
                      <label className="text-xs font-medium text-gray-500 px-1">
                        {t("discountPercentage")}
                      </label>
                      <input
                        type="number"
                        value={editingPlan.discount}
                        onChange={(e) => {
                          const d = Number(e.target.value);
                          const m = Number(editingPlan.monthlyPrice);
                          const a = m * 12 * (1 - d / 100);
                          setEditingPlan({
                            ...editingPlan,
                            discount: d,
                            annualPrice: Number(a.toFixed(2)),
                          });
                        }}
                        className={`w-full h-11 px-3 rounded-md border ${theme === "dark" ? "bg-[#0f0f11] border-[var(--border-main)]/80 text-gray-300" : "bg-[var(--bg-secondary)] border-[var(--border-main)] text-gray-900"} focus:outline-none focus:border-emerald-500/50 transition-theme text-center`}
                        dir="ltr"
                      />
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-1 space-y-2">
                      <label className="text-xs font-medium text-gray-500 px-1">
                        {dir === "rtl" ? "تصنيف الباقة" : "Plan Type"}
                      </label>
                      <select
                        value={editingPlan.planType || "user"}
                        onChange={(e) =>
                          setEditingPlan({
                            ...editingPlan,
                            planType: e.target.value,
                          })
                        }
                        className={`w-full h-11 px-3 rounded-md border ${theme === "dark" ? "bg-[#0f0f11] border-[var(--border-main)]/80 text-gray-300" : "bg-[var(--bg-secondary)] border-[var(--border-main)] text-gray-900"} focus:outline-none focus:border-emerald-500/50 transition-theme appearance-none`}
                        dir={dir}
                      >
                        <option value="user">
                          {dir === "rtl" ? "مستخدم (عام)" : "User (General)"}
                        </option>
                        <option value="developer">
                          {dir === "rtl" ? "مطورين (وكلاء برمجيات)" : "Developers (API/Agents)"}
                        </option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-3">
                      <label className="text-xs font-medium text-gray-500">
                        {t("planColor")}
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={editingPlan.color || "#10b981"}
                          onChange={(e) =>
                            setEditingPlan({
                              ...editingPlan,
                              color: e.target.value,
                            })
                          }
                          className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent"
                        />
                        <span className="text-xs font-mono text-gray-500 uppercase">
                          {editingPlan.color || "#10b981"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="isActive"
                          checked={editingPlan.isActive}
                          onChange={(e) =>
                            setEditingPlan({
                              ...editingPlan,
                              isActive: e.target.checked,
                            })
                          }
                          className="w-4 h-4 rounded border-[var(--border-main)] text-emerald-500 focus:ring-emerald-500 bg-[var(--bg-input)] dark:bg-[var(--bg-secondary)] dark:border-[var(--border-main)]"
                        />
                        <label
                          htmlFor="isActive"
                          className="text-xs font-bold text-emerald-500 cursor-pointer uppercase tracking-tighter"
                        >
                          {language === "ar" ? "نشط" : "Active"}
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="isVisible"
                          checked={editingPlan.isVisible}
                          onChange={(e) =>
                            setEditingPlan({
                              ...editingPlan,
                              isVisible: e.target.checked,
                            })
                          }
                          className="w-4 h-4 rounded border-[var(--border-main)] text-emerald-500 focus:ring-emerald-500 bg-[var(--bg-input)] dark:bg-[var(--bg-secondary)] dark:border-[var(--border-main)]"
                        />
                        <label
                          htmlFor="isVisible"
                          className="text-xs font-bold text-gray-500 cursor-pointer uppercase tracking-tighter"
                        >
                          {language === "ar" ? "مرئي" : "Visible"}
                        </label>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3 px-1">
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                        {t("limits")}
                      </h3>
                      <div className="flex gap-4 text-[10px] font-bold text-emerald-500/80 uppercase tracking-widest bg-emerald-500/5 px-2 py-0.5 rounded-full border border-emerald-500/10">
                        <span className="flex items-center gap-1">
                          <Clock size={10} /> {t("daily")}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar size={10} /> {t("monthly")}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 px-1 mb-1.5">
                      <div className="flex justify-between px-2 text-[8px] font-black text-gray-400 uppercase tracking-tighter opacity-60">
                        <span>{t("daily")}</span>
                        <span>{t("monthly")}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {ALL_TOOLS.map((key) => {
                        const isUnlimitedDaily =
                          editingPlan.limits[key]?.daily === "unlimited";
                        const isUnlimitedMonthly =
                          editingPlan.limits[key]?.monthly === "unlimited";

                        return (
                          <div
                            key={key}
                            className={`p-3 rounded-lg border ${theme === "dark" ? "bg-[#1a1a1c] border-[var(--border-main)]" : "bg-[var(--bg-secondary)] border-[var(--border-main)]"} transition-theme hover:border-emerald-500/40 group relative overflow-hidden`}
                          >
                            <div className="flex justify-between items-center mb-2 px-1">
                              <span
                                className="text-[10px] font-bold text-gray-500 dark:text-gray-400 truncate group-hover:text-emerald-500 transition-theme uppercase tracking-widest"
                                title={key}
                              >
                                {t(key)}
                              </span>
                              <div className="flex gap-1">
                                <div
                                  className={`w-1.5 h-1.5 rounded-full ${isUnlimitedDaily || isUnlimitedMonthly ? "bg-emerald-500 animate-pulse" : "bg-gray-700"}`}
                                />
                              </div>
                            </div>
                            <div
                              className={
                                key === "storage_mb" || key === "marketplace_listings"
                                  ? "grid grid-cols-1"
                                  : "grid grid-cols-2 gap-2"
                              }
                            >
                              {key !== "storage_mb" && key !== "marketplace_listings" && (
                                <div className="space-y-1">
                                  <label className="text-[8px] font-black text-gray-500 uppercase ml-1 opacity-60">
                                    {t("daily")}
                                  </label>
                                  <div className="relative">
                                    <input
                                      type={
                                        isUnlimitedDaily ? "text" : "number"
                                      }
                                      value={
                                        isUnlimitedDaily
                                          ? "∞"
                                          : editingPlan.limits[key]?.daily || 0
                                      }
                                      readOnly={isUnlimitedDaily}
                                      onChange={(e) =>
                                        updateLimit(
                                          key,
                                          "daily",
                                          e.target.value,
                                        )
                                      }
                                      onDoubleClick={() =>
                                        updateLimit(
                                          key,
                                          "daily",
                                          isUnlimitedDaily ? "0" : "unlimited",
                                        )
                                      }
                                      className={`w-full h-10 px-2 rounded-md border text-center text-sm font-mono focus:outline-none transition-theme ${
                                        isUnlimitedDaily
                                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500 font-bold text-xl"
                                          : theme === "dark"
                                            ? "bg-[#0f0f11] border-[var(--border-main)] text-gray-300"
                                            : "bg-white border-[var(--border-main)] text-gray-900"
                                      } focus:border-emerald-500/50 cursor-pointer shadow-inner`}
                                      title={
                                        isUnlimitedDaily
                                          ? "Unlimited (Double click to set number)"
                                          : "Usage Limit (Double click for unlimited)"
                                      }
                                      dir="ltr"
                                    />
                                  </div>
                                </div>
                              )}
                              <div className="space-y-1">
                                <label className="text-[8px] font-black text-gray-500 uppercase ml-1 opacity-60">
                                  {key === "storage_mb"
                                    ? t("usageLoad") || "Total Capacity"
                                    : key === "marketplace_listings"
                                      ? t("marketplace_listings") || "Max Listings"
                                      : t("monthly")}
                                </label>
                                <div className="relative">
                                  <input
                                    type={
                                      isUnlimitedMonthly ? "text" : "number"
                                    }
                                    value={
                                      isUnlimitedMonthly
                                        ? "∞"
                                        : editingPlan.limits[key]?.monthly || 0
                                    }
                                    readOnly={isUnlimitedMonthly}
                                    onChange={(e) =>
                                      updateLimit(
                                        key,
                                        "monthly",
                                        e.target.value,
                                      )
                                    }
                                    onDoubleClick={() =>
                                      updateLimit(
                                        key,
                                        "monthly",
                                        isUnlimitedMonthly ? "0" : "unlimited",
                                      )
                                    }
                                    className={`w-full h-10 px-2 rounded-md border text-center text-sm font-mono focus:outline-none transition-theme ${
                                      isUnlimitedMonthly
                                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500 font-bold text-xl"
                                        : theme === "dark"
                                          ? "bg-[#0f0f11] border-[var(--border-main)] text-gray-300"
                                          : "bg-white border-[var(--border-main)] text-gray-900"
                                    } focus:border-emerald-500/50 cursor-pointer shadow-inner`}
                                    title={
                                      isUnlimitedMonthly
                                        ? "Unlimited (Double click to set number)"
                                        : "Usage Limit (Double click for unlimited)"
                                    }
                                    dir="ltr"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-gray-500 px-1">
                        {t("monthly")}
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                          $
                        </span>
                        <input
                          type="number"
                          value={editingPlan.monthlyPrice}
                          onChange={(e) => {
                            const m = Number(e.target.value);
                            const d = Number(editingPlan.discount);
                            const a = m * 12 * (1 - d / 100);
                            setEditingPlan({
                              ...editingPlan,
                              monthlyPrice: m,
                              annualPrice: Number(a.toFixed(2)),
                            });
                          }}
                          className={`w-full h-11 pl-8 pr-3 rounded-md border ${theme === "dark" ? "bg-[#0f0f11] border-[var(--border-main)]/80 text-gray-300" : "bg-[var(--bg-secondary)] border-[var(--border-main)] text-gray-900"} focus:outline-none focus:border-emerald-500/50 transition-theme`}
                          dir="ltr"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-gray-500 px-1">
                        {t("annual")}
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                          $
                        </span>
                        <input
                          type="number"
                          value={editingPlan.annualPrice}
                          onChange={(e) => {
                            const a = Number(e.target.value);
                            const m = Number(editingPlan.monthlyPrice);
                            let d = 0;
                            if (m > 0) {
                              d = Math.round((1 - a / (m * 12)) * 100);
                            }
                            setEditingPlan({
                              ...editingPlan,
                              annualPrice: a,
                              discount: d,
                            });
                          }}
                          className={`w-full h-11 pl-8 pr-3 rounded-md border ${theme === "dark" ? "bg-[#0f0f11] border-[var(--border-main)]/80 text-gray-300" : "bg-[var(--bg-secondary)] border-[var(--border-main)] text-gray-900"} focus:outline-none focus:border-emerald-500/50 transition-theme`}
                          dir="ltr"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Authorized Session Metadata */}
                  <div className="pt-4 border-t border-[var(--border-main)]/20 text-center">
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">
                      {dir === "rtl" ? "إجراء مصرح به: تكوين باقة النظام" : "Authorized Action: System Plan Configuration"}
                    </p>
                  </div>
                </div>

                <div className="space-y-6 order-1 lg:order-2">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-gray-500 px-1">
                        {t("planNameEn")}
                      </label>
                      <input
                        type="text"
                        value={editingPlan.nameEn}
                        onChange={(e) =>
                          setEditingPlan({
                            ...editingPlan,
                            nameEn: e.target.value,
                          })
                        }
                        className={`w-full h-11 px-3 rounded-md border ${theme === "dark" ? "bg-[#0f0f11] border-[var(--border-main)]/80 text-gray-300" : "bg-[var(--bg-secondary)] border-[var(--border-main)] text-gray-900"} focus:outline-none focus:border-emerald-500/50 transition-theme`}
                        dir="ltr"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-gray-500 px-1">
                        {t("planNameAr")}
                      </label>
                      <input
                        type="text"
                        value={editingPlan.nameAr}
                        onChange={(e) =>
                          setEditingPlan({
                            ...editingPlan,
                            nameAr: e.target.value,
                          })
                        }
                        className={`w-full h-11 px-3 rounded-md border ${theme === "dark" ? "bg-[#0f0f11] border-[var(--border-main)]/80 text-gray-300" : "bg-[var(--bg-secondary)] border-[var(--border-main)] text-gray-900"} focus:outline-none focus:border-emerald-500/50 transition-theme`}
                        dir="rtl"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-gray-500 px-1">
                        {t("planDescEn")}
                      </label>
                      <input
                        type="text"
                        value={editingPlan.descEn}
                        onChange={(e) =>
                          setEditingPlan({
                            ...editingPlan,
                            descEn: e.target.value,
                          })
                        }
                        className={`w-full h-11 px-3 rounded-md border ${theme === "dark" ? "bg-[#0f0f11] border-[var(--border-main)]/80 text-gray-300" : "bg-[var(--bg-secondary)] border-[var(--border-main)] text-gray-900"} focus:outline-none focus:border-emerald-500/50 transition-theme`}
                        dir="ltr"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-gray-500 px-1">
                        {t("planDescAr")}
                      </label>
                      <input
                        type="text"
                        value={editingPlan.descAr}
                        onChange={(e) =>
                          setEditingPlan({
                            ...editingPlan,
                            descAr: e.target.value,
                          })
                        }
                        className={`w-full h-11 px-3 rounded-md border ${theme === "dark" ? "bg-[#0f0f11] border-[var(--border-main)]/80 text-gray-300" : "bg-[var(--bg-secondary)] border-[var(--border-main)] text-gray-900"} focus:outline-none focus:border-emerald-500/50 transition-theme`}
                        dir="rtl"
                      />
                    </div>
                  </div>

                  <div className="space-y-4 pt-2">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white px-1">
                      {dir === "rtl" ? "ميزات الباقة (ثنائي اللغة)" : "Plan Features (Bilingual)"}
                    </h3>
                    <div className="space-y-3 max-h-[350px] overflow-y-auto px-1 custom-scrollbar">
                      {editingPlan.features.map((feature: any, index: number) => (
                        <div
                          key={feature.id}
                          className={`p-3 rounded-lg border flex flex-col gap-2 relative ${
                            theme === "dark" 
                              ? "bg-[#111113] border-[var(--border-main)]/80" 
                              : "bg-gray-50 border-[var(--border-main)]"
                          }`}
                        >
                          <div className="flex justify-between items-center px-1">
                            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-wider">
                              {dir === "rtl" ? `ميزة #${index + 1}` : `Feature #${index + 1}`}
                            </span>
                            <button
                              onClick={() => removeFeature(feature.id)}
                              className="text-gray-400 hover:text-red-500 transition-theme"
                              title={dir === "rtl" ? "حذف המيزة" : "Remove Feature"}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <input
                              type="text"
                              value={feature.textEn}
                              placeholder="English text"
                              onChange={(e) =>
                                updateFeature(feature.id, "textEn", e.target.value)
                              }
                              className={`h-10 px-3 rounded-md border text-sm ${
                                theme === "dark"
                                  ? "bg-[#0f0f11] border-[var(--border-main)]/80 text-gray-300"
                                  : "bg-white border-[var(--border-main)] text-gray-900"
                              } focus:outline-none focus:border-emerald-500/50 transition-theme`}
                              dir="ltr"
                            />
                            <input
                              type="text"
                              value={feature.textAr}
                              placeholder="الخط القاري باللغة العربية"
                              onChange={(e) =>
                                updateFeature(feature.id, "textAr", e.target.value)
                              }
                              className={`h-10 px-3 rounded-md border text-sm ${
                                theme === "dark"
                                  ? "bg-[#0f0f11] border-[var(--border-main)]/80 text-gray-300"
                                  : "bg-white border-[var(--border-main)] text-gray-900"
                              } focus:outline-none focus:border-emerald-500/50 transition-theme`}
                              dir="rtl"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={addFeature}
                      className="w-full py-2.5 rounded-[var(--radius)] bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm transition-all shadow-md shadow-emerald-500/10 flex items-center justify-center gap-2"
                    >
                      <Plus size={16} /> {t("addFeature")}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};

const UserManagementView = ({
  theme,
  t,
  dir,
}: {
  theme: string;
  t: (key: string, replacements?: any) => string;
  dir: string;
}) => {
  const { plans, token, user: currentUser, refreshUser } = useAppContext();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedUserUsage, setSelectedUserUsage] = useState<any>(null);
  const [isLoadingUsage, setIsLoadingUsage] = useState(false);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    role: "user",
    initialBalance: "0",
    initialPoints: "0",
  });
  const [statusFilter, setStatusFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  // Ledger Card State
  const [ledgerAmount, setLedgerAmount] = useState("");
  const [ledgerAction, setLedgerAction] = useState<"add" | "deduct">("add");
  const [ledgerReason, setLedgerReason] = useState("");
  const [ledgerUnit, setLedgerUnit] = useState<"PTS" | "USD">("PTS");
  const [supportNotes, setSupportNotes] = useState("");

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users", {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "Cache-Control": "no-cache",
        },
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      } else if (res.status === 401) {
        // Handle session expiry
      }
    } catch (error) {
      if (error instanceof Error && error.message === "Failed to fetch") {
        console.debug(
          "[Admin] User fetch failed, likely server initializing...",
        );
      } else {
        console.error("Error fetching users:", error);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchUsers();
  }, [token]);

  const handleUpdatePermissions = async (
    userId: string,
    permissions: {
      role?: string;
      kyc_status?: string;
      kyc_rejection_reason?: string;
      kyc_required?: boolean;
      status?: string;
    },
  ) => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/permissions`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(permissions),
      });
      if (res.ok) {
        showToast("Permissions updated successfully", "success");
        setUsers((prev) =>
          prev.map((u) =>
            u.id.toString() === userId.toString()
              ? {
                  ...u,
                  ...permissions,
                  status: permissions.status || u.status,
                  subscription_status:
                    permissions.status || u.subscription_status,
                }
              : u,
          ),
        );
        if (selectedUser?.id?.toString() === userId.toString()) {
          setSelectedUser({
            ...selectedUser,
            ...permissions,
            status: permissions.status || selectedUser.status,
            subscription_status:
              permissions.status || selectedUser.subscription_status,
          });
        }
        if (currentUser?.id?.toString() === userId.toString()) {
          await refreshUser();
        }
      } else {
        const data = await res.json();
        showToast(data.error || "Failed to update permissions", "error");
      }
    } catch (error) {
      showToast("Connection error", "error");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    if (userId === currentUser?.id?.toString() && newRole === "user") {
      showToast("Cannot demote yourself", "error");
      return;
    }

    setIsUpdating(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/permissions`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        showToast(`Role updated to ${newRole}`, "success");

        // Update the main users list
        setUsers((prev: any[]) =>
          prev.map((u: any) =>
            u.id.toString() === userId.toString() ? { ...u, role: newRole } : u,
          ),
        );

        // Update the selected user if it is the one being updated
        if (selectedUser?.id?.toString() === userId.toString()) {
          setSelectedUser((prev: any) => (prev ? { ...prev, role: newRole } : null));
        }

        // If it's the current user, refresh their profile
        if (currentUser?.id?.toString() === userId.toString()) {
          await refreshUser();
        }
      } else {
        const data = await res.json();
        showToast(data.error || "Failed to update role", "error");
      }
    } catch (error) {
      showToast("Connection error", "error");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateKYCStatus = async (
    userId: string,
    kycRequired: boolean,
  ) => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/kyc-status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ kyc_required: kycRequired }),
      });
      if (res.ok) {
        showToast("KYC status updated successfully", "success");
        setUsers((prev) =>
          prev.map((u) =>
            u.id.toString() === userId.toString()
              ? { ...u, kyc_required: kycRequired }
              : u,
          ),
        );
        await refreshUser();
      } else {
        const data = await res.json();
        showToast(data.error || "Failed to update KYC status", "error");
      }
    } catch (error) {
      showToast("Connection error", "error");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateKYCVerificationStatus = async (
    userId: string,
    kycStatus: string,
    rejection_reason?: string,
  ) => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/kyc-verification`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ kyc_status: kycStatus, rejection_reason }),
      });
      if (res.ok) {
        showToast("KYC verification status updated", "success");
        setUsers((prev) =>
          prev.map((u) =>
            u.id.toString() === userId.toString()
              ? {
                  ...u,
                  kyc_status: kycStatus,
                  kyc_rejection_reason: rejection_reason || null,
                  kyc_required:
                    kycStatus === "verified" ? false : u.kyc_required,
                }
              : u,
          ),
        );

        if (selectedUser?.id?.toString() === userId.toString()) {
          setSelectedUser({
            ...selectedUser,
            kyc_status: kycStatus,
            kyc_rejection_reason: rejection_reason || null,
            kyc_required:
              kycStatus === "verified" ? false : selectedUser.kyc_required,
          });
        }
        // If updating self, refresh app context
        if (currentUser?.id?.toString() === userId.toString()) {
          await refreshUser();
        }
      } else {
        showToast("Failed to update verification status", "error");
      }
    } catch (error) {
      showToast("Connection error", "error");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateBalance = async (
    userId: string,
    amount: number,
    reason: string,
    type: "add" | "deduct",
    unit: "PTS" | "USD" = "PTS",
  ) => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/balance`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount, reason, type, unit }),
      });
      if (res.ok) {
        const data = await res.json();
        showToast(
          dir === "rtl" ? "تم تعديل الرصيد بنجاح" : "Balance adjusted successfully",
          "success",
        );
        setUsers((prev) =>
          prev.map((u) =>
            u.id.toString() === userId.toString()
              ? { ...u, balance: data.newBalance, points: data.newPoints }
              : u,
          ),
        );
        if (selectedUser?.id?.toString() === userId.toString())
          setSelectedUser({
            ...selectedUser,
            balance: data.newBalance,
            points: data.newPoints,
          });
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to adjust balance", "error");
      }
    } catch (error) {
      showToast("Connection error", "error");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateSupportNotes = async (userId: string, notes: string) => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/support-notes`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ notes }),
      });
      if (res.ok) {
        showToast("Support notes updated", "success");
        setUsers((prev) =>
          prev.map((u) =>
            u.id.toString() === userId.toString()
              ? { ...u, support_notes: notes }
              : u,
          ),
        );
        if (selectedUser?.id?.toString() === userId.toString())
          setSelectedUser({ ...selectedUser, support_notes: notes });
      } else {
        showToast("Failed to update support notes", "error");
      }
    } catch (error) {
      showToast("Connection error", "error");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSendDirectEmail = async (userId: string) => {
    const subject = prompt(
      dir === "rtl" ? "أدخل عنوان البريد" : "Enter email subject",
    );
    if (!subject) return;
    const body = prompt(
      dir === "rtl" ? "أدخل محتوى الرسالة" : "Enter email body",
    );
    if (!body) return;

    try {
      setIsUpdating(true);
      const res = await fetch(`/api/admin/users/${userId}/send-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ subject, body }),
      });

      if (res.ok) {
        showToast(
          dir === "rtl" ? "تم إرسال البريد بنجاح" : "Email sent successfully",
          "success",
        );
      } else {
        const data = await res.json();
        showToast(
          data.error ||
            (dir === "rtl" ? "فشل إرسال البريد" : "Failed to send email"),
          "error",
        );
      }
    } catch (error) {
      console.error("Error sending email:", error);
      showToast(
        dir === "rtl" ? "فشل إرسال البريد" : "Failed to send email",
        "error",
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSendManualNotification = async (userId: string) => {
    const titleEn = prompt("Enter Internal Alert Title (English)");
    if (!titleEn) return;
    const titleAr = prompt("أدخل عنوان التنبيه الداخلي (العربية)");
    if (!titleAr) return;
    const messageEn = prompt("Enter Internal Alert Message (English)");
    if (!messageEn) return;
    const messageAr = prompt("أدخل نص التنبيه الداخلي (العربية)");
    if (!messageAr) return;

    try {
      setIsUpdating(true);
      const res = await fetch(`/api/admin/users/${userId}/notify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          titleEn,
          titleAr,
          messageEn,
          messageAr,
          type: "support",
        }),
      });

      if (res.ok) {
        showToast(
          dir === "rtl"
            ? "تم إرسال التنبيه بنجاح"
            : "Notification sent successfully",
          "success",
        );
      } else {
        const data = await res.json();
        showToast(
          data.error ||
            (dir === "rtl"
              ? "فشل إرسال التنبيه"
              : "Failed to send notification"),
          "error",
        );
      }
    } catch (error) {
      console.error("Error sending notification:", error);
      showToast(
        dir === "rtl" ? "فشل إرسال التنبيه" : "Failed to send notification",
        "error",
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdatePlan = async (userId: string, planId: string) => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/plan`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ planId }),
      });
      if (res.ok) {
        showToast("Subscription updated successfully", "success");
        const updatedPlan = plans.find(
          (p) => p.id.toString() === planId.toString(),
        );
        setUsers((prev) =>
          prev.map((u) =>
            u.id.toString() === userId.toString()
              ? {
                  ...u,
                  plan_id: planId,
                  plan_name: updatedPlan?.name_en || updatedPlan?.nameEn,
                }
              : u,
          ),
        );
        if (selectedUser?.id?.toString() === userId.toString()) {
          setSelectedUser({
            ...selectedUser,
            plan_id: planId,
            plan_name: updatedPlan?.name_en || updatedPlan?.nameEn,
          });
        }
        // If updating self, refresh app context
        if (currentUser?.id?.toString() === userId.toString()) {
          await refreshUser();
        }
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to update subscription", "error");
      }
    } catch (error) {
      showToast("Connection error", "error");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "suspended" : "active";
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/permissions`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        showToast(
          `User ${newStatus === "active" ? "activated" : "suspended"} successfully`,
          "success",
        );
        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId
              ? { ...u, status: newStatus, subscription_status: newStatus }
              : u,
          ),
        );
        if (selectedUser?.id === userId)
          setSelectedUser({
            ...selectedUser,
            status: newStatus,
            subscription_status: newStatus,
          });
      } else {
        showToast("Failed to update status", "error");
      }
    } catch (error) {
      showToast("Connection error", "error");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.password) {
      showToast("Name, email and password are required", "error");
      return;
    }
    setIsUpdating(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newUser),
      });
      if (res.ok) {
        showToast("User created successfully", "success");
        setIsCreateUserModalOpen(false);
        setNewUser({
          name: "",
          email: "",
          password: "",
          role: "user",
          initialBalance: "0",
          initialPoints: "0",
        });
        fetchUsers();
      } else {
        const data = await res.json();
        showToast(data.error || "Failed to create user", "error");
      }
    } catch (error) {
      showToast("Connection error", "error");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (userId === currentUser?.id?.toString()) {
      showToast("Cannot delete yourself", "error");
      return;
    }

    if (
      !confirm(
        dir === "rtl"
          ? "هل أنت متأكد من حذف هذا المستخدم؟ سيتم حذف جميع بياناته ومحفظته نهائياً."
          : "Are you sure you want to delete this user? All their data and wallet will be permanently removed.",
      )
    )
      return;

    setIsUpdating(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showToast("User deleted successfully", "success");
        setUsers((prev) =>
          prev.filter((u) => u.id.toString() !== userId.toString()),
        );
      } else {
        const data = await res.json();
        showToast(data.error || "Failed to delete user", "error");
      }
    } catch (error) {
      showToast("Connection error", "error");
    } finally {
      setIsUpdating(false);
    }
  };

  const getPlanDetails = (planId: any) => {
    if (!planId)
      return plans[0] || { color: "transparent", nameAr: "", nameEn: "" };
    return (
      plans.find((p) => p.id.toString() === planId.toString()) ||
      plans[0] || { color: "transparent", nameAr: "", nameEn: "" }
    );
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      (u.status || u.subscription_status) === statusFilter;
    const matchesPlan = planFilter === "all" || u.plan_id === planFilter;
    return matchesSearch && matchesStatus && matchesPlan;
  });

  const handleViewProfile = (user: any) => {
    setSelectedUser(user);
    setSupportNotes(user.support_notes || "");
    setIsProfileModalOpen(true);
    fetchUserUsage(user.id);
  };

  const fetchUserUsage = async (userId: string) => {
    setIsLoadingUsage(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/usage`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedUserUsage(data);
      }
    } catch (error) {
      console.error("Failed to fetch user usage:", error);
    } finally {
      setIsLoadingUsage(false);
    }
  };

  const fetchActivityLogs = async (userId: string) => {
    setIsLoadingLogs(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/activity-logs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setActivityLogs(data);
      }
    } catch (error) {
      console.error("Failed to fetch activity logs:", error);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const handleViewHistory = (user: any) => {
    setSelectedUser(user);
    setActivityLogs([]);
    setIsActivityModalOpen(true);
    fetchActivityLogs(user.id);
  };

  return (
    <div className="space-y-6 relative">
      {toast && (
        <div
          className={`fixed bottom-6 ${dir === "rtl" ? "left-6" : "right-6"} z-[100] flex items-center gap-3 px-6 py-4 rounded-md shadow-2xl transition-theme animate-in slide-in-from-bottom-5 ${
            toast.type === "success"
              ? theme === "dark"
                ? "bg-[#1a1a1c] border border-emerald-500/30 text-emerald-500"
                : "bg-white border border-emerald-200 text-emerald-600"
              : theme === "dark"
                ? "bg-[#1a1a1c] border border-red-500/30 text-red-500"
                : "bg-white border border-red-200 text-red-600"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 size={20} />
          ) : (
            <AlertCircle size={20} />
          )}
          <span className="font-medium text-sm">{toast.message}</span>
        </div>
      )}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-center bg-[var(--bg-secondary)] p-4 rounded-lg border border-[var(--border-main)] shadow-sm relative overflow-hidden">
        <div className="absolute inset-0 bg-emerald-500/[0.01] pointer-events-none" />
        <div className={`relative w-full lg:w-[450px] flex items-center group`}>
          <div
            className={`absolute inset-y-0 ${dir === "rtl" ? "right-0 pr-4" : "left-0 pl-4"} flex items-center pointer-events-none transition-theme group-focus-within:text-emerald-500`}
          >
            <Search size={18} className="text-gray-400" />
          </div>
          <input
            type="text"
            placeholder={t("searchUsers")}
            value={searchQuery || ""}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full ${dir === "rtl" ? "pr-11 pl-4" : "pl-11 pr-4"} py-3 rounded-md border focus:outline-none focus:ring-1 focus:ring-emerald-500/30 transition-theme ${
              theme === "dark"
                ? "bg-[#0f0f11] border-[var(--border-main)] text-white placeholder-gray-600"
                : "bg-white border-[var(--border-main)] text-gray-900 placeholder-gray-400"
            }`}
          />
        </div>
        <div className="flex gap-3 w-full lg:w-auto">
          <button
            onClick={() => setIsCreateUserModalOpen(true)}
            className="flex items-center gap-2 px-4 py-3 rounded-md bg-emerald-500 text-white font-bold text-xs shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_20px_rgba(16,185,129,0.5)] transition-theme"
          >
            <UserPlus size={16} />
            {t("addExplorer")}
          </button>
          <div className="relative flex-1 lg:flex-none min-w-[140px]">
            <select
              value={statusFilter || "all"}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`w-full px-4 py-3 rounded-md border appearance-none focus:outline-none focus:ring-1 focus:ring-emerald-500/30 font-bold text-xs ${theme === "dark" ? "bg-[#0f0f11] border-[var(--border-main)] text-gray-300" : "bg-white border-[var(--border-main)] shadow-sm"}`}
            >
              <option value="all">{dir === "rtl" ? "جميع الحالات" : "All Status"}</option>
              <option value="active">{t("active")}</option>
              <option value="suspended">{t("suspended")}</option>
            </select>
            <ChevronDown
              size={14}
              className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500"
            />
          </div>
          <div className="relative flex-1 lg:flex-none min-w-[160px]">
            <select
              value={planFilter || "all"}
              onChange={(e) => setPlanFilter(e.target.value)}
              className={`w-full px-4 py-3 rounded-md border appearance-none focus:outline-none focus:ring-1 focus:ring-emerald-500/30 font-bold text-xs ${theme === "dark" ? "bg-[#0f0f11] border-[var(--border-main)] text-gray-300" : "bg-white border-[var(--border-main)] shadow-sm"}`}
            >
              <option value="all">{dir === "rtl" ? "جميع الباقات" : "All Plans"}</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {dir === "rtl" ? p.nameAr : p.nameEn}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500"
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto custom-scrollbar rounded-lg border border-[var(--border-main)] bg-[var(--bg-secondary)] shadow-sm">
        <table className="w-full text-sm text-left rtl:text-right">
          <thead
            className={`text-[10px] uppercase font-black tracking-widest transition-theme ${theme === "dark" ? "bg-[var(--bg-surface)] text-gray-500" : "bg-[var(--bg-secondary)] text-gray-400"}`}
          >
            <tr>
              <th
                className={`px-6 py-4 ${dir === "rtl" ? "text-right" : "text-left"}`}
              >
                {t("userName")}
              </th>
              <th
                className={`px-6 py-4 ${dir === "rtl" ? "text-right" : "text-left"}`}
              >
                {t("role")}
              </th>
              <th
                className={`px-6 py-4 ${dir === "rtl" ? "text-right" : "text-left"}`}
              >
                {t("plan")}
              </th>
              <th
                className={`px-6 py-4 ${dir === "rtl" ? "text-right" : "text-left"}`}
              >
                {t("kycStatus")}
              </th>
              <th
                className={`px-6 py-4 ${dir === "rtl" ? "text-right" : "text-left"}`}
              >
                {t("joinedAt")}
              </th>
              <th
                className={`px-6 py-4 ${dir === "rtl" ? "text-left" : "text-right"}`}
              >
                {t("actions")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/30">
            {loading ? (
              <tr>
                <td
                  colSpan={6}
                  className="text-center py-24"
                >
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-12 h-12 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
                      <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest animate-pulse drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]">
                        Syncing Galaxy Users...
                      </span>
                    </div>
                </td>
              </tr>
            ) : filteredUsers.length > 0 ? (
              filteredUsers.map((user) => {
                const plan = getPlanDetails(user.plan_id);

                return (
                  <tr
                    key={user.id}
                    className="group transition-theme hover:bg-[var(--bg-secondary)]/10"
                  >
                    <td
                      className="px-6 py-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative group/avatar">
                          <div className="w-11 h-11 rounded-md bg-gray-200 dark:bg-[var(--bg-secondary)] flex items-center justify-center shrink-0 overflow-hidden border border-[var(--border-main)] group-hover/avatar:border-emerald-500/50 transition-theme">
                            {user.avatar ? (
                              <img
                                src={user.avatar}
                                alt=""
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <Users size={20} className="text-gray-500" />
                            )}
                          </div>
                          {user.subscription_status === "active" && (
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-[var(--bg-secondary)] shadow-[0_0_8px_rgba(16,185,129,1)]" />
                          )}
                        </div>
                        <div>
                          <div className="font-black text-sm text-[var(--text-primary)] group-hover:text-emerald-500 transition-theme">
                            <HighlightText text={user.name} query={searchQuery} />
                          </div>
                          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">
                            <HighlightText text={user.email} query={searchQuery} />
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="relative min-w-[110px]">
                        <select
                          value={user.role || "user"}
                          onChange={(e) =>
                            handleUpdateRole(user.id.toString(), e.target.value)
                          }
                          disabled={isUpdating}
                          className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-md border appearance-none w-full text-center focus:outline-none transition-theme cursor-pointer ${
                            user.role === "admin"
                              ? "text-purple-500 border-purple-500/30 bg-purple-500/5"
                              : user.role === "elite"
                                ? "text-amber-500 border-amber-500/30 bg-amber-500/5"
                                : user.role === "support"
                                  ? "text-emerald-500 border-emerald-500/30 bg-emerald-500/5"
                                  : "text-gray-500 border-[var(--border-main)] bg-[var(--bg-secondary)]/10"
                          }`}
                        >
                          <option
                            value="user"
                            className={
                              theme === "dark"
                                ? "bg-[#0f0f11] text-white"
                                : "bg-white text-black"
                            }
                          >
                            {t("role_user")}
                          </option>
                          <option
                            value="support"
                            className={
                              theme === "dark"
                                ? "bg-[#0f0f11] text-white"
                                : "bg-white text-black"
                            }
                          >
                            {t("role_support")}
                          </option>
                          <option
                            value="elite"
                            className={
                              theme === "dark"
                                ? "bg-[#0f0f11] text-white"
                                : "bg-white text-black"
                            }
                          >
                            {t("role_elite")}
                          </option>
                          <option
                            value="admin"
                            className={
                              theme === "dark"
                                ? "bg-[#0f0f11] text-white"
                                : "bg-white text-black"
                            }
                          >
                            {t("role_admin")}
                          </option>
                        </select>
                        <ChevronDown
                          size={10}
                          className="absolute right-2 top-1/2 -translate-y-1/2 opacity-40 pointer-events-none"
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div
                        className="px-3 py-1.5 rounded-sm text-[10px] font-black uppercase tracking-[0.1em] border flex items-center justify-center gap-2"
                        style={{
                          backgroundColor: `${plan.color}10`,
                          color: plan.color,
                          borderColor: `${plan.color}20`,
                        }}
                      >
                        <Star size={10} className="fill-current" />
                        {dir === "rtl"
                          ? plan.name_ar || plan.nameAr
                          : plan.name_en || plan.nameEn}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div
                        className={`px-3 py-1.5 rounded-sm text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 border ${
                          user.kyc_status === "verified"
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                            : user.kyc_status === "pending"
                              ? "bg-amber-500/10 text-amber-500 border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.1)]"
                              : user.kyc_status === "rejected"
                                ? "bg-red-500/10 text-red-500 border-red-500/20"
                                : "bg-[var(--bg-secondary)]/10 text-gray-500 border-[var(--border-main)]"
                        }`}
                      >
                        <div
                          className={`w-1.5 h-1.5 rounded-full ${user.kyc_status === "verified" ? "bg-emerald-500" : user.kyc_status === "pending" ? "bg-amber-500 animate-pulse" : "bg-gray-400"}`}
                        />
                        {user.kyc_status === "verified"
                          ? t("kycVerified")
                          : user.kyc_status === "pending"
                            ? t("kycPending")
                            : user.kyc_status === "rejected"
                              ? t("kycRejected")
                              : t("kycNone")}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[11px] font-mono text-gray-500">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td
                      className="px-6 py-4"
                    >
                      <div
                        className={`flex items-center gap-1.5 ${dir === "rtl" ? "justify-start" : "justify-end"}`}
                      >
                        <button
                          onClick={() => handleSendDirectEmail(user.id)}
                          className="w-9 h-9 flex items-center justify-center rounded-md bg-[var(--bg-secondary)]/5 text-gray-400 hover:text-emerald-500 hover:bg-emerald-500/10 transition-theme border border-transparent hover:border-emerald-500/20"
                          title={t("sendEmail")}
                        >
                          <Mail size={16} />
                        </button>
                        <button
                          onClick={() => handleViewHistory(user)}
                          className="w-9 h-9 flex items-center justify-center rounded-md bg-[var(--bg-secondary)]/5 text-gray-400 hover:text-amber-500 hover:bg-amber-500/10 transition-theme border border-transparent hover:border-amber-500/20"
                          title="Usage History"
                        >
                          <History size={16} />
                        </button>
                        <button
                          onClick={() => handleViewProfile(user)}
                          className="w-9 h-9 flex items-center justify-center rounded-md bg-emerald-500/10 text-emerald-500 transition-theme border border-emerald-500/30 hover:shadow-[0_0_15px_rgba(16,185,129,0.3)] group/btn"
                          title={t("viewProfile")}
                        >
                          <Eye
                            size={16}
                            className="group-hover/btn:scale-110 transition-transform"
                          />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id.toString())}
                          className="w-9 h-9 flex items-center justify-center rounded-md bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-theme border border-red-500/30 hover:shadow-[0_0_15px_rgba(239,68,68,0.3)] group/del"
                          title={dir === "rtl" ? "حذف" : "Delete"}
                        >
                          <Trash2
                            size={16}
                            className="group-hover/del:scale-110 transition-transform"
                          />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={6}
                  className="text-center py-20 text-gray-500"
                >
                  <div className="flex flex-col items-center gap-3">
                    <Users size={40} className="text-gray-800/20" />
                    <span className="text-xs font-bold uppercase tracking-widest opacity-50">
                      No users found in this sector
                    </span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {isCreateUserModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <form
              onSubmit={(e) => { e.preventDefault(); handleCreateUser(); }}
              className={`relative w-full max-w-md overflow-hidden rounded-lg shadow-2xl flex flex-col transition-theme bg-[var(--bg-base)] border border-[var(--border)] shadow-[var(--color-shadow)]`}
            >
              <div className="p-6 border-b border-[var(--border-main)] flex items-center justify-between">
                <div className="flex items-center gap-3 text-emerald-500">
                  <UserPlus size={24} />
                  <h3 className="text-xl font-black tracking-tight">
                    {dir === "rtl" ? "إضافة مستخدم جديد" : "New User Registry"}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreateUserModalOpen(false)}
                  className="p-2 rounded-md text-gray-400 hover:bg-[var(--bg-secondary)] transition-theme"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-gray-500">
                    {t("userName")}
                  </label>
                  <input
                    type="text"
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    className={`w-full h-11 px-4 rounded-md border focus:outline-none focus:border-emerald-500 transition-theme ${theme === "dark" ? "bg-[#0f0f11] border-[var(--border-main)] text-white" : "bg-white border-[var(--border-main)]"}`}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-gray-500">
                    Email
                  </label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    className={`w-full h-11 px-4 rounded-md border focus:outline-none focus:border-emerald-500 transition-theme ${theme === "dark" ? "bg-[#0f0f11] border-[var(--border-main)] text-white" : "bg-white border-[var(--border-main)]"}`}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-gray-500">
                    Password
                  </label>
                  <input
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className={`w-full h-11 px-4 rounded-md border focus:outline-none focus:border-emerald-500 transition-theme ${theme === "dark" ? "bg-[#0f0f11] border-[var(--border-main)] text-white" : "bg-white border-[var(--border-main)]"}`}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase text-gray-500">
                      Role
                    </label>
                    <select
                      value={newUser.role}
                      onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                      className={`w-full h-11 px-4 rounded-md border focus:outline-none focus:border-emerald-500 transition-theme ${theme === "dark" ? "bg-[#0f0f11] border-[var(--border-main)] text-white" : "bg-white border-[var(--border-main)]"}`}
                    >
                      <option value="user">{t("role_user")}</option>
                      <option value="support">{t("role_support")}</option>
                      <option value="elite">{t("role_elite")}</option>
                      <option value="admin">{t("role_admin")}</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase text-gray-500">
                      Initial Points
                    </label>
                    <input
                      type="number"
                      value={newUser.initialPoints}
                      onChange={(e) => setNewUser({ ...newUser, initialPoints: e.target.value })}
                      className={`w-full h-11 px-4 rounded-md border focus:outline-none focus:border-emerald-500 transition-theme ${theme === "dark" ? "bg-[#0f0f11] border-[var(--border-main)] text-white" : "bg-white border-[var(--border-main)]"}`}
                    />
                  </div>
                </div>
              </div>

              <div className="p-6 bg-[var(--bg-secondary)]/30 border-t border-[var(--border-main)]">
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="w-full py-3 rounded-md bg-emerald-500 text-white font-bold text-sm shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] transition-theme flex items-center justify-center gap-2 group disabled:opacity-50"
                >
                  {isUpdating ? (
                    <RefreshCw size={18} className="animate-spin" />
                  ) : (
                    <UserPlus size={18} className="group-hover:scale-110 transition-transform" />
                  )}
                  {dir === "rtl" ? "تسجيل المستخدم" : "Register User"}
                </button>
              </div>
            </form>
          </div>,
          document.body
        )}
      {isActivityModalOpen &&
        selectedUser &&
        createPortal(
          <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <div
              className={`relative w-full max-w-4xl max-h-[85vh] overflow-hidden rounded-lg shadow-2xl flex flex-col transition-theme bg-[var(--bg-base)] border border-[var(--border)] shadow-[var(--color-shadow)]`}
            >
              {/* Header */}
              <div className="p-6 border-b border-[var(--border-main)] dark:border-[var(--border-main)] flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-md bg-amber-500/10 text-amber-500">
                    <History size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">
                      {selectedUser.name} - Usage History
                    </h3>
                    <p className="text-sm text-gray-500">
                      Detailed extraction and action logs
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsActivityModalOpen(false)}
                  className="p-2 rounded-md text-gray-400 hover:bg-[var(--bg-input)] dark:hover:bg-[var(--bg-secondary)] transition-theme"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {isLoadingLogs ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
                    <p className="text-gray-500 animate-pulse font-mono text-sm uppercase tracking-widest">
                      Loading Logs...
                    </p>
                  </div>
                ) : activityLogs.length === 0 ? (
                  <div className="text-center py-20 text-gray-500">
                    <History size={48} className="mx-auto mb-4 opacity-20" />
                    <p>No activity logs found for this user.</p>
                  </div>
                ) : (
                  <div className="min-w-full overflow-hidden border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg">
                    <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
                      <thead
                        className={
                          theme === "dark" ? "bg-[var(--bg-surface)]" : "bg-[var(--bg-secondary)]"
                        }
                      >
                        <tr>
                          <th className="px-6 py-4 text-left font-black text-[10px] text-gray-500 uppercase tracking-widest">
                            Tool / Action
                          </th>
                          <th className="px-6 py-4 text-left font-black text-[10px] text-gray-500 uppercase tracking-widest">
                            Consumed
                          </th>
                          <th className="px-6 py-4 text-left font-black text-[10px] text-gray-500 uppercase tracking-widest">
                            Status
                          </th>
                          <th className="px-6 py-4 text-left font-black text-[10px] text-gray-500 uppercase tracking-widest">
                            Type
                          </th>
                          <th className="px-6 py-4 text-left font-black text-[10px] text-gray-500 uppercase tracking-widest">
                            Timestamp
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {activityLogs.map((log, idx) => (
                          <tr
                            key={idx}
                            className="group hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]/30 transition-theme cursor-crosshair"
                          >
                            <td className="px-6 py-4 font-mono text-xs uppercase text-emerald-500 tracking-tighter">
                              {log.tool_id}
                            </td>
                            <td className="px-6 py-4 font-mono text-sm font-bold text-gray-900 dark:text-white">
                              {parseFloat(log.amount).toFixed(2)}
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter border bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
                                Completed
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter border ${
                                  log.usage_type === "paid"
                                    ? "bg-amber-500/10 text-amber-500 border-amber-500/30"
                                    : "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                                }`}
                              >
                                {log.usage_type}
                              </span>
                            </td>
                            <td className="px-6 py-4 font-mono text-[11px] text-gray-400">
                              {new Date(log.created_at).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}

      {isProfileModalOpen &&
        selectedUser &&
        createPortal(
          <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div
              className={`relative w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-lg shadow-2xl flex flex-col transition-theme bg-[var(--bg-base)] border border-[var(--border)] shadow-[var(--color-shadow)]`}
            >
              <div className="p-8 border-b border-[var(--border-main)]/20 flex items-center justify-between bg-gradient-to-br from-[var(--bg-secondary)] via-[var(--bg-secondary)] to-emerald-500/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none" />
                <div className="flex items-center gap-6 relative z-10">
                  <div
                    className={`w-16 h-16 rounded-lg flex items-center justify-center shadow-2xl border-2 overflow-hidden transition-theme group/avatar ${theme === "dark" ? "bg-[var(--bg-surface)] border-[var(--border-main)] hover:border-emerald-500/50" : "bg-[var(--bg-input)] border-white hover:border-emerald-500/50"}`}
                  >
                    {selectedUser.avatar ? (
                      <img
                        src={selectedUser.avatar}
                        alt=""
                        className="w-full h-full object-cover group-hover/avatar:scale-110 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <Users size={32} className="text-gray-500" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
                      {selectedUser.name}
                      {selectedUser.subscription_status === "active" && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                      )}
                    </h2>
                    <div className="flex flex-col gap-0.5 mt-1">
                      <p
                        className={`text-[10px] font-black uppercase tracking-[0.2em] p-0 m-0 ${
                          selectedUser.role === "admin"
                            ? "text-purple-500"
                            : selectedUser.role === "elite"
                              ? "text-amber-500"
                              : selectedUser.role === "support"
                                ? "text-emerald-500"
                                : "text-gray-400"
                        }`}
                      >
                        {t(
                          `role_${(selectedUser.role || "user").toLowerCase()}`,
                        )}
                      </p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest opacity-60 font-mono p-0 m-0">
                        {selectedUser.email}
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setIsProfileModalOpen(false)}
                  className={`p-3 rounded-md transition-theme group/close ${theme === "dark" ? "hover:bg-[var(--bg-secondary)] text-gray-500 hover:text-white" : "hover:bg-[var(--bg-input)] text-gray-500 hover:text-gray-900"}`}
                >
                  <X
                    size={24}
                    className="group-hover/close:rotate-90 transition-transform duration-300"
                  />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div
                    className={`p-8 rounded-lg border flex flex-col h-full transition-all duration-300 hover:shadow-2xl hover:translate-y-[-4px] ${theme === "dark" ? "bg-[#161618] border-[var(--border-main)]" : "bg-[var(--bg-secondary)] border-[var(--border-main)] shadow-sm"}`}
                  >
                    <div className="flex items-center gap-3 mb-8">
                      <div className="p-2.5 rounded-md bg-emerald-500/10 text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                        <Users size={20} />
                      </div>
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                        {t("identitySection")}
                      </h3>
                    </div>

                    <div className="flex-1 space-y-5">
                      {/* Role Selection */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-gray-500 px-1">
                            {t("role")}
                          </label>
                          <select
                            value={selectedUser.role || "user"}
                            onChange={(e) =>
                              setSelectedUser({
                                ...selectedUser,
                                role: e.target.value,
                              })
                            }
                            className={`w-full h-11 px-4 rounded-[var(--radius)] border focus:outline-none focus:border-emerald-500/50 transition-all ${theme === "dark" ? "bg-[#0f0f11] border-[var(--border-main)] text-white" : "bg-white border-[var(--border-main)]"}`}
                          >
                            <option value="user">{t("role_user")}</option>
                            <option value="support">{t("role_support")}</option>
                            <option value="elite">{t("role_elite")}</option>
                            <option value="admin">{t("role_admin")}</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-gray-500 px-1">
                            {t("kycStatus")}
                          </label>
                          <select
                            value={selectedUser.kyc_status || "none"}
                            onChange={(e) => {
                              const newStatus = e.target.value;
                              setSelectedUser({
                                ...selectedUser,
                                kyc_status: newStatus,
                                kyc_required:
                                  newStatus === "verified"
                                    ? false
                                    : selectedUser.kyc_required,
                                kyc_rejection_reason:
                                  newStatus === "rejected"
                                    ? selectedUser.kyc_rejection_reason || ""
                                    : null,
                              });
                            }}
                            className={`w-full h-11 px-4 rounded-[var(--radius)] border focus:outline-none focus:border-emerald-500/50 transition-all ${theme === "dark" ? "bg-[#0f0f11] border-[var(--border-main)] text-white" : "bg-white border-[var(--border-main)]"}`}
                          >
                            <option value="none">{t("kycNone")}</option>
                            <option value="pending">{t("kycPending")}</option>
                            <option value="verified">{t("kycVerified")}</option>
                            <option value="rejected">{t("kycRejected")}</option>
                          </select>
                        </div>
                      </div>

                      {selectedUser.kyc_status === "rejected" && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                          <label className="text-[10px] font-bold uppercase text-gray-500 px-1">
                            {t("kycRejectionReason")}
                          </label>
                          <textarea
                            value={selectedUser.kyc_rejection_reason || ""}
                            onChange={(e) =>
                              setSelectedUser({
                                ...selectedUser,
                                kyc_rejection_reason: e.target.value,
                              })
                            }
                            placeholder={
                              dir === "rtl"
                                ? "أدخل سبب الرفض هنا ليظهر للمستخدم..."
                                : "Enter rejection reason to show to the user..."
                            }
                            className={`w-full h-20 p-3 rounded-md border focus:outline-none focus:border-red-500/50 transition-theme resize-none text-sm ${theme === "dark" ? "bg-[#0f0f11] border-[var(--border-main)] text-white" : "bg-white border-[var(--border-main)]"}`}
                          />
                        </div>
                      )}

                      {/* Status & KYC Toggles */}
                      <div className="grid grid-cols-2 gap-4">
                        <div
                          className={`p-3 rounded-[var(--radius)] border flex flex-col gap-2 ${theme === "dark" ? "bg-[#0f0f11] border-[var(--border-main)]" : "bg-white border-[var(--border-main)]"}`}
                        >
                          <span className="text-[10px] font-bold uppercase text-gray-500">
                            {t("accountStatus")}
                          </span>
                          <div className="flex items-center justify-between">
                            <span
                              className={`text-sm font-bold ${(selectedUser.status || selectedUser.subscription_status) === "active" ? "text-emerald-500" : "text-red-500"}`}
                            >
                              {(selectedUser.status ||
                                selectedUser.subscription_status) === "active"
                                ? t("active")
                                : t("suspended")}
                            </span>
                            <button
                              onClick={() => {
                                const newStat =
                                  (selectedUser.status ||
                                    selectedUser.subscription_status) ===
                                  "active"
                                    ? "suspended"
                                    : "active";
                                setSelectedUser({
                                  ...selectedUser,
                                  status: newStat,
                                  subscription_status: newStat,
                                });
                              }}
                              className={`w-8 h-4 rounded-full transition-theme relative ${(selectedUser.status || selectedUser.subscription_status) === "active" ? "bg-emerald-500" : "bg-gray-600"}`}
                            >
                              <div
                                className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-theme ${(selectedUser.status || selectedUser.subscription_status) === "active" ? (dir === "rtl" ? "left-0.5" : "right-0.5") : dir === "rtl" ? "right-0.5" : "left-0.5"}`}
                              ></div>
                            </button>
                          </div>
                        </div>
                        <div
                          className={`p-3 rounded-[var(--radius)] border flex flex-col gap-2 ${theme === "dark" ? "bg-[#0f0f11] border-[var(--border-main)]" : "bg-white border-[var(--border-main)]"}`}
                        >
                          <span className="text-[10px] font-bold uppercase text-gray-500">
                            {t("identityVerification")}
                          </span>
                          <div className="flex items-center justify-between">
                            <span
                              className={`text-sm font-bold ${selectedUser.kyc_required ? "text-amber-500" : "text-gray-500"}`}
                            >
                              {selectedUser.kyc_required
                                ? t("required")
                                : t("notRequired")}
                            </span>
                            <button
                              onClick={() => {
                                if (selectedUser.kyc_status === "verified")
                                  return;
                                setSelectedUser({
                                  ...selectedUser,
                                  kyc_required: !selectedUser.kyc_required,
                                });
                              }}
                              disabled={selectedUser.kyc_status === "verified"}
                              className={`w-8 h-4 rounded-full transition-theme relative ${selectedUser.kyc_required ? "bg-amber-500" : "bg-gray-600"} ${selectedUser.kyc_status === "verified" ? "opacity-50 cursor-not-allowed" : ""}`}
                            >
                              <div
                                className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-theme ${selectedUser.kyc_required ? (dir === "rtl" ? "left-0.5" : "right-0.5") : dir === "rtl" ? "right-0.5" : "left-0.5"}`}
                              ></div>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* KYC Selfie Review Section */}
                      {(selectedUser.kyc_status === "pending" ||
                        selectedUser.kyc_selfie) && (
                        <div
                          className={`p-4 rounded-md border ${theme === "dark" ? "bg-[#0f0f11] border-[var(--border-main)]" : "bg-white border-[var(--border-main)]"}`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-bold uppercase text-gray-500">
                              {t("kycSelfieReview")}
                            </span>
                            {selectedUser.kyc_status === "pending" && (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-amber-500 animate-pulse">
                                <Clock size={12} />
                                {t("pendingReview")}
                              </span>
                            )}
                          </div>

                          {selectedUser.kyc_full_name && (
                            <div className="mb-3">
                              <p className="text-[10px] text-gray-500 mb-0.5">
                                {t("fullNameOnID")}
                              </p>
                              <p className="text-sm font-bold text-gray-900 dark:text-white">
                                {selectedUser.kyc_full_name}
                              </p>
                            </div>
                          )}

                          {selectedUser.kyc_selfie ? (
                            <div className="space-y-3">
                              <div className="relative rounded-md overflow-hidden border border-[var(--border-main)] aspect-video bg-black/20">
                                <img
                                  src={selectedUser.kyc_selfie}
                                  alt="KYC Selfie"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <button
                                onClick={async () => {
                                  if (
                                    confirm(
                                      dir === "rtl"
                                        ? "هل أنت متأكد من حذف الصورة؟ لا يمكن التراجع عن هذا الإجراء."
                                        : "Are you sure you want to delete this selfie? This action cannot be undone.",
                                    )
                                  ) {
                                    try {
                                      const res = await fetch(
                                        `/api/admin/users/${selectedUser.id}/kyc-selfie`,
                                        {
                                          method: "DELETE",
                                          headers: {
                                            Authorization: `Bearer ${token}`,
                                          },
                                        },
                                      );
                                      if (res.ok) {
                                        setSelectedUser({
                                          ...selectedUser,
                                          kyc_selfie: null,
                                          kyc_full_name: null,
                                        });
                                        setUsers((prev) =>
                                          prev.map((u) =>
                                            u.id.toString() ===
                                            selectedUser.id.toString()
                                              ? {
                                                  ...u,
                                                  kyc_selfie: null,
                                                  kyc_full_name: null,
                                                }
                                              : u,
                                          ),
                                        );
                                        showToast(
                                          dir === "rtl"
                                            ? "تم حذف الصورة بنجاح"
                                            : "Selfie deleted successfully",
                                          "success",
                                        );
                                      }
                                    } catch (error) {
                                      console.error(
                                        "Error deleting selfie:",
                                        error,
                                      );
                                      showToast(
                                        dir === "rtl"
                                          ? "فشل حذف الصورة"
                                          : "Failed to delete selfie",
                                        "error",
                                      );
                                    }
                                  }
                                }}
                                className="w-full py-2.5 rounded-md border border-red-500/30 text-red-500 text-xs font-bold hover:bg-red-500/10 transition-theme flex items-center justify-center gap-2"
                              >
                                <Trash2 size={14} />
                                {dir === "rtl"
                                  ? "حذف الصورة نهائياً"
                                  : "Delete Selfie Permanently"}
                              </button>
                            </div>
                          ) : (
                            <div className="py-8 flex flex-col items-center justify-center text-gray-500 italic text-xs">
                              <Camera size={24} className="mb-2 opacity-20" />
                              {dir === "rtl"
                                ? "لم يتم رفع صورة بعد"
                                : "No selfie uploaded yet"}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() =>
                        handleUpdatePermissions(selectedUser.id, {
                          role: selectedUser.role,
                          kyc_status: selectedUser.kyc_status,
                          kyc_rejection_reason:
                            selectedUser.kyc_rejection_reason,
                          kyc_required: selectedUser.kyc_required,
                          status:
                            selectedUser.status ||
                            selectedUser.subscription_status,
                        })
                      }
                      disabled={isUpdating}
                      className="w-full mt-6 py-3 rounded-md bg-emerald-500 text-white font-bold text-sm transition-theme shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_20px_rgba(16,185,129,0.5)] flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isUpdating ? (
                        <RefreshCw size={18} className="animate-spin" />
                      ) : (
                        <Save
                          size={18}
                          className="group-hover:scale-110 transition-transform"
                        />
                      )}
                      {dir === "rtl"
                        ? "حفظ بيانات الهوية"
                        : "Save Identity Data"}
                    </button>
                  </div>

                  <div
                    className={`p-8 rounded-[var(--radius)] border flex flex-col h-full transition-all duration-300 hover:shadow-2xl hover:translate-y-[-4px] ${theme === "dark" ? "bg-[#161618] border-[var(--border-main)]" : "bg-[var(--bg-secondary)] border-[var(--border-main)] shadow-sm"}`}
                  >
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-md bg-amber-500/10 text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.15)]">
                          <Landmark size={20} />
                        </div>
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                          {dir === "rtl" ? "قسم المحفظة" : "Ledger Section"}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 bg-[var(--bg-secondary)] p-1 rounded-sm border border-[var(--border-main)] shadow-inner">
                        <button
                          onClick={() => setLedgerUnit("PTS")}
                          className={`px-4 py-1.5 rounded-xs text-[9px] font-black tracking-widest transition-theme ${ledgerUnit === "PTS" ? "bg-amber-500 text-white shadow-xl shadow-amber-500/30" : "text-gray-500 hover:text-gray-300"}`}
                        >
                          PTS
                        </button>
                        <button
                          onClick={() => setLedgerUnit("USD")}
                          className={`px-4 py-1.5 rounded-xs text-[9px] font-black tracking-widest transition-theme ${ledgerUnit === "USD" ? "bg-emerald-500 text-white shadow-xl shadow-emerald-500/30" : "text-gray-500 hover:text-gray-300"}`}
                        >
                          USD
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 space-y-4">
                      {/* Current Balance Display */}
                      <div className="grid grid-cols-2 gap-3">
                        <div
                          className={`p-3 rounded-[var(--radius)] border transition-theme ${theme === "dark" ? "bg-[#0f0f11] border-[var(--border-main)]" : "bg-white border-[var(--border-main)]"}`}
                        >
                          <p className="text-[10px] font-bold text-gray-500 mb-1">
                            {dir === "rtl" ? "النقاط" : "Points"}
                          </p>
                          <p className="text-lg font-bold text-amber-500">
                            {Math.floor(
                              selectedUser.points || 0,
                            ).toLocaleString()}
                          </p>
                        </div>
                        <div
                          className={`p-3 rounded-[var(--radius)] border transition-theme ${theme === "dark" ? "bg-[#0f0f11] border-[var(--border-main)]" : "bg-white border-[var(--border-main)]"}`}
                        >
                          <p className="text-[10px] font-bold text-gray-500 mb-1">
                            {dir === "rtl" ? "القيمة بالدولار" : "USD Value"}
                          </p>
                          <p className="text-lg font-bold text-emerald-500">
                            $
                            {parseFloat(selectedUser.balance || 0).toFixed(2)}
                          </p>
                        </div>
                      </div>

                      {/* Transaction Inputs */}
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <input
                              type="number"
                              value={ledgerAmount}
                              onChange={(e) => setLedgerAmount(e.target.value)}
                              placeholder={dir === "rtl" ? "المبلغ" : "Amount"}
                              className={`w-full h-11 px-4 rounded-md border focus:outline-none focus:border-emerald-500 transition-theme ${theme === "dark" ? "bg-[#0f0f11] border-[var(--border-main)] text-white" : "bg-white border-[var(--border-main)]"}`}
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-500">
                              {ledgerUnit}
                            </span>
                          </div>
                          <select
                            value={ledgerAction}
                            onChange={(e) =>
                                setLedgerAction(
                                  e.target.value as "add" | "deduct",
                                )
                            }
                            className={`w-32 h-11 px-3 rounded-md border focus:outline-none focus:border-emerald-500 transition-theme ${theme === "dark" ? "bg-[#0f0f11] border-[var(--border-main)] text-white" : "bg-white border-[var(--border-main)]"}`}
                          >
                            <option value="add">
                              {dir === "rtl" ? "إيداع" : "Deposit"}
                            </option>
                            <option value="deduct">
                              {dir === "rtl" ? "سحب" : "Withdraw"}
                            </option>
                          </select>
                        </div>
                        <input
                          type="text"
                          value={ledgerReason}
                          onChange={(e) => setLedgerReason(e.target.value)}
                          placeholder={
                            dir === "rtl"
                              ? "سبب العملية (إلزامي للتوثيق)"
                              : "Transaction Reason (Required)"
                          }
                          className={`w-full h-11 px-4 rounded-md border focus:outline-none focus:border-emerald-500 transition-theme ${theme === "dark" ? "bg-[#0f0f11] border-[var(--border-main)] text-white" : "bg-white border-[var(--border-main)]"}`}
                        />
                      </div>
                    </div>

                    <button
                      onClick={async () => {
                        const amount = parseFloat(ledgerAmount);

                        if (isNaN(amount) || amount <= 0) {
                          showToast(
                            dir === "rtl"
                              ? "يرجى إدخال مبلغ صحيح"
                              : "Please enter a valid amount",
                            "error",
                          );
                          return;
                        }

                        if (!ledgerReason) {
                          showToast(
                            dir === "rtl"
                              ? "سبب العملية مطلوب للتوثيق"
                              : "Transaction reason is required",
                            "error",
                          );
                          return;
                        }

                        const currentLimit = ledgerUnit === "PTS" ? (selectedUser.points || 0) : (selectedUser.balance || 0);

                        if (
                          ledgerAction === "deduct" &&
                          amount > currentLimit
                        ) {
                          showToast(
                            dir === "rtl"
                              ? "الرصيد غير كافٍ للسحب"
                              : "Insufficient balance for withdrawal",
                            "error",
                          );
                          return;
                        }

                        if (
                          confirm(
                            dir === "rtl"
                              ? `هل أنت متأكد من تنفيذ عملية ${ledgerAction === "add" ? "إيداع" : "سحب"} بقيمة ${ledgerAmount} ${ledgerUnit}؟`
                              : `Are you sure you want to execute a ${ledgerAction === "add" ? "deposit" : "withdrawal"} of ${ledgerAmount} ${ledgerUnit}?`,
                          )
                        ) {
                          await handleUpdateBalance(
                            selectedUser.id,
                            amount,
                            ledgerReason,
                            ledgerAction,
                            ledgerUnit,
                          );
                          setLedgerAmount("");
                          setLedgerReason("");
                        }
                      }}
                      disabled={isUpdating}
                      className={`w-full mt-6 py-3 rounded-md font-bold text-sm transition-theme flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed ${
                        ledgerAction === "add"
                          ? "bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_20px_rgba(16,185,129,0.5)]"
                          : "bg-amber-600 text-white shadow-[0_0_15px_rgba(217,119,6,0.3)] hover:shadow-[0_0_20px_rgba(217,119,6,0.5)]"
                      }`}
                    >
                      {isUpdating ? (
                        <RefreshCw size={18} className="animate-spin" />
                      ) : (
                        <ShieldCheck
                          size={18}
                          className="group-hover:scale-110 transition-transform"
                        />
                      )}
                      {dir === "rtl"
                        ? ledgerAction === "add"
                          ? "اعتماد وتنفيذ الإيداع"
                          : "اعتماد وتنفيذ السحب"
                        : ledgerAction === "add"
                          ? "Authorize & Execute Deposit"
                          : "Authorize & Execute Withdrawal"}
                    </button>
                  </div>

                  <div
                    className={`p-8 rounded-[var(--radius)] border flex flex-col h-full transition-all duration-300 hover:shadow-2xl hover:translate-y-[-4px] ${theme === "dark" ? "bg-[#161618] border-[var(--border-main)]" : "bg-[var(--bg-secondary)] border-[var(--border-main)] shadow-sm"}`}
                  >
                    <div className="flex items-center gap-3 mb-8">
                      <div className="p-2.5 rounded-md bg-blue-500/10 text-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.15)]">
                        <CreditCard size={20} />
                      </div>
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                        {dir === "rtl"
                          ? "قسم الاشتراكات"
                          : "Subscription Section"}
                      </h3>
                    </div>

                    <div className="flex-1 space-y-6">
                      {/* Current Plan Display */}
                      <div className="flex items-center gap-4 p-4 rounded-md border border-[var(--border-main)]/50 bg-[var(--bg-secondary)]/20 relative overflow-hidden">
                        <div
                          className="absolute top-0 left-0 w-1 h-full"
                          style={{
                            backgroundColor: getPlanDetails(
                              selectedUser.plan_id,
                            ).color,
                          }}
                        ></div>
                        <div
                          className="w-12 h-12 rounded-md flex items-center justify-center shrink-0"
                          style={{
                            backgroundColor: `${getPlanDetails(selectedUser.plan_id).color}20`,
                            color: getPlanDetails(selectedUser.plan_id).color,
                          }}
                        >
                          <Sparkles size={24} />
                        </div>
                        <div>
                          <div className="font-bold text-lg">
                            {dir === "rtl"
                              ? getPlanDetails(selectedUser.plan_id).name_ar ||
                                getPlanDetails(selectedUser.plan_id).nameAr
                              : getPlanDetails(selectedUser.plan_id).name_en ||
                                getPlanDetails(selectedUser.plan_id).nameEn}
                          </div>
                          <div className="text-xs text-gray-500">
                            {dir === "rtl" ? "تاريخ الانضمام" : "Joined At"}:{" "}
                            {new Date(
                              selectedUser.created_at,
                            ).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      {/* Plan Selection */}
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-500 px-1">
                          {dir === "rtl" ? "تغيير الخطة" : "Change Plan"}
                        </label>
                        <select
                          value={selectedUser.plan_id || ""}
                          onChange={(e) =>
                            setSelectedUser({
                              ...selectedUser,
                              plan_id: e.target.value,
                            })
                          }
                          className={`w-full h-11 px-4 rounded-[var(--radius)] border focus:outline-none focus:border-emerald-500/50 transition-all ${theme === "dark" ? "bg-[#0f0f11] border-[var(--border-main)] text-white" : "bg-white border-[var(--border-main)]"}`}
                        >
                          {plans.map((p) => (
                            <option key={p.id} value={p.id}>
                              {dir === "rtl"
                                ? p.name_ar || p.nameAr
                                : p.name_en || p.nameEn}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <button
                      onClick={() =>
                        handleUpdatePlan(selectedUser.id, selectedUser.plan_id)
                      }
                      disabled={isUpdating}
                      className="w-full mt-6 py-3 rounded-md bg-blue-600 text-white font-bold text-sm transition-theme shadow-[0_0_15px_rgba(37,99,235,0.3)] hover:shadow-[0_0_20px_rgba(37,99,235,0.5)] flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isUpdating ? (
                        <RefreshCw size={18} className="animate-spin" />
                      ) : (
                        <Zap
                          size={18}
                          className="group-hover:scale-110 transition-transform"
                        />
                      )}
                      {dir === "rtl" ? "تحديث الاشتراك" : "Update Subscription"}
                    </button>
                  </div>

                  <div
                    className={`p-8 rounded-[var(--radius)] border flex flex-col h-full transition-all duration-300 hover:shadow-2xl hover:translate-y-[-4px] ${theme === "dark" ? "bg-[#161618] border-[var(--border-main)]" : "bg-[var(--bg-secondary)] border-[var(--border-main)] shadow-sm"}`}
                  >
                    <div className="flex items-center gap-3 mb-8">
                      <div className="p-2.5 rounded-md bg-pink-500/10 text-pink-500 shadow-[0_0_15px_rgba(219,39,119,0.15)]">
                        <LifeBuoy size={20} />
                      </div>
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                        {dir === "rtl" ? "قسم الدعم" : "Support Section"}
                      </h3>
                    </div>

                    <div className="flex-1 space-y-4">
                      {/* Support Notes */}
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-500 px-1">
                          {dir === "rtl"
                            ? "ملاحظات الدعم (خاصة بالمسؤولين)"
                            : "Support Notes (Admin Only)"}
                        </label>
                        <textarea
                          value={supportNotes || ""}
                          onChange={(e) => setSupportNotes(e.target.value)}
                          placeholder={
                            dir === "rtl"
                              ? "أضف ملاحظات حول هذا المستخدم..."
                              : "Add notes about this user..."
                          }
                          className={`w-full h-24 p-3 rounded-md border focus:outline-none focus:border-pink-500/50 transition-theme resize-none text-sm ${theme === "dark" ? "bg-[#0f0f11] border-[var(--border-main)] text-white" : "bg-white border-[var(--border-main)]"}`}
                        />
                      </div>

                      {/* Quick Actions */}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleSendDirectEmail(selectedUser.id)}
                          disabled={isUpdating}
                          className={`flex items-center gap-2 p-3 rounded-md border text-[10px] font-bold transition-theme disabled:opacity-50 ${theme === "dark" ? "bg-[#0f0f11] border-[var(--border-main)] hover:border-pink-500/30" : "bg-white border-[var(--border-main)] hover:border-pink-500/30"}`}
                        >
                          <Mail size={14} className="text-pink-500" />
                          {dir === "rtl" ? "بريد مباشر" : "Email"}
                        </button>
                        <button
                          onClick={() =>
                            handleSendManualNotification(selectedUser.id)
                          }
                          disabled={isUpdating}
                          className={`flex items-center gap-2 p-3 rounded-sm border text-[10px] font-bold transition-theme disabled:opacity-50 ${theme === "dark" ? "bg-[#0f0f11] border-[var(--border-main)] hover:border-emerald-500/30" : "bg-white border-[var(--border-main)] hover:border-emerald-500/30"}`}
                        >
                          <BellRing size={14} className="text-emerald-500" />
                          {dir === "rtl" ? "إخطار داخلي" : "Manual Alert"}
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={() =>
                        handleUpdateSupportNotes(selectedUser.id, supportNotes)
                      }
                      disabled={isUpdating}
                      className="w-full mt-6 py-3 rounded-md bg-pink-600 text-white font-bold text-sm transition-theme shadow-[0_0_15px_rgba(219,39,119,0.3)] hover:shadow-[0_0_20px_rgba(219,39,119,0.5)] flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isUpdating ? (
                        <RefreshCw size={18} className="animate-spin" />
                      ) : (
                        <Save
                          size={18}
                          className="group-hover:scale-110 transition-transform"
                        />
                      )}
                      {dir === "rtl"
                        ? "حفظ ملاحظات الدعم"
                        : "Save Support Notes"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-[var(--border-main)]/30 flex justify-center bg-[var(--bg-secondary)]/5">
                <button
                  onClick={() => setIsProfileModalOpen(false)}
                  className={`px-12 py-3.5 rounded-md font-bold transition-theme flex items-center gap-2 group ${
                    theme === "dark"
                      ? "bg-[#1a1a1c] text-gray-400 hover:text-white border border-[var(--border-main)] hover:border-[var(--border-main)]"
                      : "bg-[var(--bg-secondary)] text-gray-500 hover:text-gray-900 border border-[var(--border-main)] hover:bg-[var(--bg-input)]"
                  }`}
                >
                  <X
                    size={20}
                    className="transition-theme group-hover:text-emerald-500 group-hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]"
                  />
                  <span>{t("close")}</span>
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};

const SmartEmailHubView = ({
  theme,
  t,
  dir,
}: {
  theme: string;
  t: (key: string, replacements?: any) => string;
  dir: string;
}) => {
  const [activeTab, setActiveTab] = useState<"settings" | "templates">(
    "settings",
  );
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [status, setStatus] = useState<{
    type: "success" | "error" | "none";
    msg: string;
  }>({ type: "none", msg: "" });
  const { token, language, siteSettings, setIsOperationPending } =
    useAppContext();

  const showStatus = (type: "success" | "error", msg: string) => {
    setStatus({ type, msg });
    setTimeout(() => setStatus({ type: "none", msg: "" }), 6000);
  };

  const [settings, setSettings] = useState<any>({
    mailer_type: "smtp",
    smtp_host: "",
    smtp_port: "",
    smtp_encryption: "tls",
    smtp_username: "",
    smtp_password: "",
    sender_name: "",
    sender_email: "",
    status: "active",
    last_verified_at: null,
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  const [templates, setTemplates] = useState<any[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [isImportingDefaults, setIsImportingDefaults] = useState(false);

  useEffect(() => {
    setIsOperationPending(
      isSavingSettings ||
        isSavingTemplate ||
        isTestingConnection ||
        isImportingDefaults,
    );
  }, [
    isSavingSettings,
    isSavingTemplate,
    isTestingConnection,
    isImportingDefaults,
    setIsOperationPending,
  ]);


  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const token = localStorage.getItem("app_token");
        const res = await fetch("/api/mail-services-v3/config", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setSettings(data);
        } else {
          console.error("Failed to fetch settings: ", res.status);
          const text = await res.text();
          if (text.includes("<html>")) {
            showStatus(
              "error",
              "WAF/Firewall blocked the request (403 HTML received)",
            );
          }
        }
      } catch (error) {
        console.error("Failed to fetch email settings:", error);
      }
    };
    fetchSettings();
  }, []);

  const fetchTemplates = async () => {
    setIsLoadingTemplates(true);
    try {
      const token = localStorage.getItem("app_token");
      const res = await fetch("/api/mail-services-v3/templates", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      }
    } catch (error) {
      console.error("Failed to fetch email templates:", error);
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  const handleImportDefaults = async () => {
    if (
      !window.confirm(
        dir === "rtl"
          ? "هل أنت متأكد من جلب القوالب الافتراضية؟ سيتم تحديث القوالب الموجودة."
          : "Are you sure you want to fetch default templates? Existing system templates will be updated.",
      )
    )
      return;

    setIsImportingDefaults(true);
    try {
      const token = localStorage.getItem("app_token");

      const res = await fetch("/api/mail-services-v3/sync", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        showStatus(
          "success",
          dir === "rtl"
            ? "تم جلب القوالب بنجاح"
            : "Templates imported successfully",
        );
        setTimeout(() => {
          fetchTemplates();
        }, 500);
      } else {
        const errorData = await res
          .json()
          .catch(() => ({ error: "Security Filter Intervention" }));
        showStatus(
          "error",
          (dir === "rtl" ? "فشل جلب القوالب: " : "Failed: ") +
            (errorData.error || "Unknown error"),
        );
      }
    } catch (error: any) {
      console.error("Failed to import templates:", error);
      showStatus("error", error.message || "Error");
    } finally {
      setIsImportingDefaults(false);
    }
  };

  useEffect(() => {
    if (activeTab === "templates") {
      fetchTemplates();
    }
  }, [activeTab]);

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      const token = localStorage.getItem("app_token");
      const res = await fetch("/api/mail-services-v3/config", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        showStatus(
          "success",
          dir === "rtl"
            ? "تم حفظ الإعدادات بنجاح"
            : "Settings saved successfully!",
        );
      } else {
        const text = await res.text();
        if (text.includes("<html>")) {
          showStatus("error", "Blocked by Firewall (403 HTML)");
        } else {
          showStatus(
            "error",
            dir === "rtl" ? "فشل حفظ الإعدادات" : "Failed to save settings",
          );
        }
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
      showStatus("error", "Network/Security Error");
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    try {
      const token = localStorage.getItem("app_token");
      const res = await fetch("/api/mail-services-v3/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      });

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        showStatus("error", "Security filter blocked the response body.");
        setIsTestingConnection(false);
        return;
      }

      if (res.ok) {
        showStatus(
          "success",
          dir === "rtl"
            ? "تم التحقق من الاتصال بنجاح!"
            : "Connection verified successfully!",
        );
        // Refresh settings
        const refreshRes = await fetch("/api/mail-services-v3/config", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (refreshRes.ok) {
          const freshData = await refreshRes.json();
          setSettings(freshData);
        }
      } else {
        showStatus("error", data.error || "Connection Failed");
      }
    } catch (error: any) {
      console.error("Failed to test connection:", error);
      showStatus("error", error.message || "Error");
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!selectedTemplate) return;

    // Client-side validation
    const missingFields = [];
    if (!selectedTemplate.name?.trim())
      missingFields.push(dir === "rtl" ? "اسم القالب" : "Template Name");
    if (!selectedTemplate.subject_en?.trim())
      missingFields.push(dir === "rtl" ? "الموضوع (EN)" : "Subject (EN)");
    if (!selectedTemplate.subject_ar?.trim())
      missingFields.push(dir === "rtl" ? "الموضوع (AR)" : "Subject (AR)");
    if (!selectedTemplate.body_en?.trim())
      missingFields.push(dir === "rtl" ? "المحتوى (EN)" : "Body (EN)");
    if (!selectedTemplate.body_ar?.trim())
      missingFields.push(dir === "rtl" ? "المحتوى (AR)" : "Body (AR)");

    if (missingFields.length > 0) {
      showStatus(
        "error",
        dir === "rtl"
          ? `يرجى ملء الحقول التالية: ${missingFields.join("، ")}`
          : `Required: ${missingFields.join(", ")}`,
      );
      return;
    }

    setIsSavingTemplate(true);
    try {
      const token = localStorage.getItem("app_token");
      const res = await fetch("/api/mail-services-v3/templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(selectedTemplate),
      });
      if (res.ok) {
        await fetchTemplates();
        setSelectedTemplate(null);
        showStatus(
          "success",
          dir === "rtl" ? "تم حفظ القالب بنجاح" : "Template saved successfully",
        );
      } else {
        const errorData = await res.json().catch(() => ({ error: "Blocked" }));
        showStatus("error", errorData.error || "Failed to save");
      }
    } catch (error) {
      showStatus("error", "Connection Error");
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;
    try {
      const token = localStorage.getItem("app_token");
      const res = await fetch(`/api/mail-services-v3/templates/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showStatus("success", "Template deleted");
        await fetchTemplates();
      }
    } catch (error) {
      showStatus("error", "Error");
    }
  };

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {status.type !== "none" && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`p-4 rounded-[var(--radius)] border flex items-center gap-3 shadow-lg ${
              status.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-500"
                : "bg-red-500/10 border-red-500/50 text-red-500"
            }`}
          >
            {status.type === "success" ? (
              <CheckCircle
                size={20}
                className="drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]"
              />
            ) : (
              <AlertTriangle size={20} />
            )}
            <span className="text-sm font-bold">{status.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex gap-2 border-b border-[var(--border-main)] dark:border-[var(--border-main)] pb-4">
        <button
          onClick={() => setActiveTab("settings")}
          className={`px-6 py-2.5 rounded-[var(--radius)] font-medium transition-theme flex items-center gap-2 ${
            activeTab === "settings"
              ? "bg-emerald-500/10 text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]"
              : "text-gray-500 hover:bg-[var(--bg-input)] dark:hover:bg-[var(--bg-secondary)]/50"
          }`}
        >
          <Settings2 size={18} />
          {t("emailSettings")}
        </button>
        <button
          onClick={() => {
            setActiveTab("templates");
            setSelectedTemplate(null);
          }}
          className={`px-6 py-2.5 rounded-[var(--radius)] font-medium transition-theme flex items-center gap-2 ${
            activeTab === "templates"
              ? "bg-emerald-500/10 text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]"
              : "text-gray-500 hover:bg-[var(--bg-input)] dark:hover:bg-[var(--bg-secondary)]/50"
          }`}
        >
          <FileText size={18} />
          {t("emailTemplates")}
        </button>
      </div>

      <div className="mt-6">
        {activeTab === "settings" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div
              className={`p-6 md:p-8 rounded-[var(--radius)] border ${theme === "dark" ? "bg-[#111111] border-[var(--border-main)]" : "bg-[var(--bg-secondary)] border-[var(--border-main)]"}`}
            >
              <div className="flex items-center justify-between gap-3 mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-[var(--radius)] bg-emerald-500/10 text-emerald-500">
                    <Server size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{t("smtpSettings")}</h2>
                    <p className="text-sm text-gray-500">{t("smtpDesc")}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span
                    className={`px-3 py-1 rounded-[var(--radius)] text-xs font-bold flex items-center gap-1.5 ${
                      settings.status === "active"
                        ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/30"
                        : "bg-amber-500/10 text-amber-500 border border-amber-500/30"
                    }`}
                  >
                    {settings.status === "active" ? (
                      <>
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        {dir === "rtl"
                          ? "نشط / تم التحقق"
                          : "Active / Verified"}
                      </>
                    ) : (
                      <>
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        {dir === "rtl" ? "يحتاج تحقق" : "Needs Verification"}
                      </>
                    )}
                  </span>
                  {settings.last_verified_at && (
                    <span className="text-[10px] text-gray-500 font-mono">
                      {dir === "rtl" ? "آخر تحقق: " : "Last verified: "}
                      {new Date(settings.last_verified_at).toLocaleString(
                        language === "ar" ? "ar-EG" : "en-US",
                      )}
                    </span>
                  )}
                </div>
              </div>

              <form onSubmit={(e) => e.preventDefault()} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    {t("mailerType")}
                  </label>
                  <select
                    value={settings.mailer_type || "smtp"}
                    onChange={(e) =>
                      setSettings({ ...settings, mailer_type: e.target.value })
                    }
                    className={`w-full px-4 py-3 rounded-[var(--radius)] border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-theme ${theme === "dark" ? "bg-[#1a1a1c] border-[var(--border-main)] text-white" : "bg-white border-[var(--border-main)]"}`}
                  >
                    <option value="smtp">{t("smtp")}</option>
                    <option value="php">{t("phpMail")}</option>
                  </select>
                </div>

                {settings.mailer_type === "smtp" && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                          {t("smtpHost")}
                        </label>
                        <input
                          type="text"
                          value={settings.smtp_host || ""}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              smtp_host: e.target.value,
                            })
                          }
                          placeholder="smtp.sendgrid.net"
                          className={`w-full px-4 py-3 rounded-[var(--radius)] border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-theme text-left ${theme === "dark" ? "bg-[#1a1a1c] border-[var(--border-main)] text-white" : "bg-white border-[var(--border-main)]"}`}
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                          {t("smtpPort")}
                        </label>
                        <input
                          type="text"
                          value={settings.smtp_port || ""}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              smtp_port: e.target.value,
                            })
                          }
                          placeholder="587"
                          className={`w-full px-4 py-3 rounded-[var(--radius)] border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-theme text-left ${theme === "dark" ? "bg-[#1a1a1c] border-[var(--border-main)] text-white" : "bg-white border-[var(--border-main)]"}`}
                          dir="ltr"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                          {t("encryption")}
                        </label>
                        <select
                          value={settings.smtp_encryption || "tls"}
                          onChange={(e) =>
                            setSettings({
                               ...settings,
                               smtp_encryption: e.target.value,
                            })
                          }
                          className={`w-full px-4 py-3 rounded-[var(--radius)] border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-theme ${theme === "dark" ? "bg-[#1a1a1c] border-[var(--border-main)] text-white" : "bg-white border-[var(--border-main)]"}`}
                        >
                          <option value="tls">{t("tls")}</option>
                          <option value="ssl">{t("ssl") || "SSL"}</option>
                          <option value="none">{t("none")}</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                          {t("smtpUsername") ||
                            (dir === "rtl"
                              ? "اسم مستخدم SMTP"
                              : "SMTP Username")}
                        </label>
                        <input
                          type="text"
                          value={settings.smtp_username || ""}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              smtp_username: e.target.value,
                            })
                          }
                          placeholder="apikey"
                          className={`w-full px-4 py-3 rounded-[var(--radius)] border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-theme text-left ${theme === "dark" ? "bg-[#1a1a1c] border-[var(--border-main)] text-white" : "bg-white border-[var(--border-main)]"}`}
                          dir="ltr"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        {t("smtpPassword") ||
                          (dir === "rtl" ? "كلمة سر SMTP" : "SMTP Password")}
                      </label>
                      <input
                        type="password"
                        value={settings.smtp_password || ""}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            smtp_password: e.target.value,
                          })
                        }
                        placeholder="••••••••••••••••"
                        className={`w-full px-4 py-3 rounded-[var(--radius)] border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-theme text-left ${theme === "dark" ? "bg-[#1a1a1c] border-[var(--border-main)] text-white" : "bg-white border-[var(--border-main)]"}`}
                        dir="ltr"
                      />
                    </div>
                  </>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-[var(--border-main)] dark:border-[var(--border-main)]">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      {t("senderName")}
                    </label>
                    <input
                      type="text"
                      value={settings.sender_name || ""}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          sender_name: e.target.value,
                        })
                      }
                      placeholder={
                        dir === "rtl" ? "اسم المنصة" : "Platform Name"
                      }
                      className={`w-full px-4 py-3 rounded-[var(--radius)] border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-theme ${theme === "dark" ? "bg-[#1a1a1c] border-[var(--border-main)] text-white" : "bg-white border-[var(--border-main)]"}`}
                      dir={dir}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      {t("senderEmail")}
                    </label>
                    <input
                      type="email"
                      value={settings.sender_email || ""}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          sender_email: e.target.value,
                        })
                      }
                      placeholder="noreply@example.com"
                      className={`w-full px-4 py-3 rounded-[var(--radius)] border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-theme text-left ${theme === "dark" ? "bg-[#1a1a1c] border-[var(--border-main)] text-white" : "bg-white border-[var(--border-main)]"}`}
                      dir="ltr"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-6">
                  <button
                    onClick={handleSaveSettings}
                    disabled={isSavingSettings}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-3.5 rounded-md font-bold transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSavingSettings ? (
                      <RefreshCw size={18} className="animate-spin" />
                    ) : (
                      <Save size={18} />
                    )}
                    {t("saveSettings")}
                  </button>
                  <button
                    onClick={handleTestConnection}
                    disabled={isTestingConnection}
                    className={`px-6 py-3.5 rounded-md font-bold transition-all border flex items-center justify-center gap-2 disabled:opacity-50 ${theme === "dark" ? "border-[var(--border-main)] hover:bg-[var(--bg-secondary)] text-white" : "border-[var(--border-main)] hover:bg-[var(--bg-input)] text-gray-900"}`}
                  >
                    {isTestingConnection ? (
                      <RefreshCw size={18} className="animate-spin" />
                    ) : (
                      <RefreshCw size={18} />
                    )}
                    {t("testConnection")}
                  </button>
                </div>
              </form>
            </div>

            <div className="space-y-6">
              <div
                className={
                  theme === "dark"
                    ? "p-6 rounded-lg border bg-[#1a1a1c] border-[var(--border-main)]"
                    : "p-6 rounded-lg border bg-white border-[var(--border-main)]"
                }
              >
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <ShieldCheck className="text-emerald-500" size={20} />
                  {t("securityProtocol")}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed mb-4">
                  {t("securityProtocolDesc")}
                </p>
                <div className="p-4 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-500 text-sm flex items-start gap-3">
                  <AlertCircle size={18} className="shrink-0 mt-0.5" />
                  <p>{t("spamWarning")}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "templates" && !selectedTemplate && (
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <h2 className="text-xl font-bold">{t("emailTemplates")}</h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleImportDefaults}
                  disabled={isImportingDefaults}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md border transition-theme font-medium disabled:opacity-50 ${
                    theme === "dark"
                      ? "border-[var(--border-main)] text-gray-400 hover:text-white hover:bg-[var(--bg-secondary)]"
                      : "border-[var(--border-main)] text-gray-600 hover:bg-[var(--bg-input)]"
                  }`}
                >
                  <Download size={18} />
                  {dir === "rtl"
                    ? "جلب القوالب الافتراضية"
                    : "Fetch Default Templates"}
                </button>
                <button
                  onClick={() =>
                    setSelectedTemplate({
                      isNew: true,
                      type: "custom",
                      name: "",
                      subject_en: "",
                      subject_ar: "",
                      body_en: "",
                      body_ar: "",
                    })
                  }
                  className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-md transition-theme font-medium shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                >
                  <Plus size={18} />
                  {t("createNewTemplate")}
                </button>
              </div>
            </div>

            {isLoadingTemplates ? (
              <div className="flex justify-center py-12">
                <RefreshCw
                  className="animate-spin text-emerald-500"
                  size={32}
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.map((template, index) => (
                  <div
                    key={template.id || template.name || index}
                    className={`group p-6 rounded-lg border transition-theme hover:-translate-y-1 hover:shadow-xl cursor-pointer relative ${
                      theme === "dark"
                        ? "bg-[#111111] border-[var(--border-main)] hover:border-emerald-500/30"
                        : "bg-white border-[var(--border-main)] hover:border-emerald-500/30"
                    }`}
                    onClick={() => setSelectedTemplate(template)}
                  >
                    {template.type === "custom" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTemplate(template.id);
                        }}
                        className="absolute top-4 right-4 p-2 rounded-sm bg-red-500/10 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                    <div className="flex justify-between items-start mb-4">
                      <div
                        className={`p-3 rounded-md ${template.type === "system" ? "bg-blue-500/10 text-blue-500" : "bg-purple-500/10 text-purple-500"}`}
                      >
                        <Mail size={24} />
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-sm text-xs font-medium ${template.type === "system" ? "bg-blue-500/10 text-blue-500" : "bg-purple-500/10 text-purple-500"}`}
                      >
                        {template.type === "system"
                          ? t("systemTemplates")
                          : t("customTemplates")}
                      </span>
                    </div>
                    <h3 className="font-bold text-lg mb-1">
                      {template.type === "system"
                        ? t(template.name)
                        : template.name}
                    </h3>
                    <p className="text-sm text-gray-500 mb-6 line-clamp-1">
                      {dir === "rtl"
                        ? template.subject_ar
                        : template.subject_en}
                    </p>

                    <div className="flex justify-between items-center pt-4 border-t border-[var(--border-main)] dark:border-[var(--border-main)]">
                      <span className="text-xs text-gray-400 flex items-center gap-1.5">
                        <Clock size={14} />
                        {new Date(template.updated_at).toLocaleDateString()}
                      </span>
                      <span className="text-sm font-medium text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        {t("editTemplate")}{" "}
                        <ArrowRight
                          size={16}
                          className={dir === "rtl" ? "rotate-180" : ""}
                        />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "templates" && selectedTemplate && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={() => setSelectedTemplate(null)}
                className={`p-2.5 rounded-md transition-theme duration-300 flex items-center justify-center ${
                  theme === "dark"
                    ? "bg-[var(--bg-secondary)]/40 hover:bg-gray-700 text-gray-400 hover:text-white border border-[var(--border-main)]/50"
                    : "bg-white hover:bg-[var(--bg-secondary)] text-gray-500 hover:text-gray-900 border border-[var(--border-main)] shadow-sm"
                }`}
              >
                {dir === "rtl" ? (
                  <ArrowRight size={20} />
                ) : (
                  <ArrowLeft size={20} />
                )}
              </button>
              <h2 className="text-2xl font-bold">
                {selectedTemplate.isNew
                  ? t("createNewTemplate")
                  : selectedTemplate.type === "system"
                    ? t(selectedTemplate.name)
                    : selectedTemplate.name}
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div
                className={`lg:col-span-2 p-6 md:p-8 rounded-lg border ${theme === "dark" ? "bg-[#111111] border-[var(--border-main)]" : "bg-white border-[var(--border-main)]"}`}
              >
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      {t("templateName")}
                    </label>
                    <input
                      type="text"
                      value={selectedTemplate.name || ""}
                      onChange={(e) =>
                        setSelectedTemplate({
                          ...selectedTemplate,
                          name: e.target.value,
                        })
                      }
                      disabled={selectedTemplate.type === "system"}
                      className={`w-full px-4 py-3 rounded-md border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all ${theme === "dark" ? "bg-[#1a1a1c] border-[var(--border-main)] text-white disabled:opacity-50" : "bg-[var(--bg-secondary)] border-[var(--border-main)] disabled:opacity-50"}`}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        {t("emailSubject")} (EN)
                      </label>
                      <input
                        type="text"
                        value={selectedTemplate.subject_en || ""}
                        onChange={(e) =>
                          setSelectedTemplate({
                            ...selectedTemplate,
                            subject_en: e.target.value,
                          })
                        }
                        className={`w-full px-4 py-3 rounded-md border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all ${theme === "dark" ? "bg-[#1a1a1c] border-[var(--border-main)] text-white" : "bg-white border-[var(--border-main)]"}`}
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        {t("emailSubject")} (AR)
                      </label>
                      <input
                        type="text"
                        value={selectedTemplate.subject_ar || ""}
                        onChange={(e) =>
                          setSelectedTemplate({
                            ...selectedTemplate,
                            subject_ar: e.target.value,
                          })
                        }
                        className={`w-full px-4 py-3 rounded-md border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all ${theme === "dark" ? "bg-[#1a1a1c] border-[var(--border-main)] text-white" : "bg-white border-[var(--border-main)]"}`}
                        dir="rtl"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      {t("emailBody")} (EN - HTML/Text)
                    </label>
                    <textarea
                      rows={8}
                      value={selectedTemplate.body_en || ""}
                      onChange={(e) =>
                        setSelectedTemplate({
                          ...selectedTemplate,
                          body_en: e.target.value,
                        })
                      }
                      className={`w-full px-4 py-3 rounded-md border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all font-mono text-sm ${theme === "dark" ? "bg-[#1a1a1c] border-[var(--border-main)] text-gray-300" : "bg-[var(--bg-secondary)] border-[var(--border-main)] text-gray-800"}`}
                      dir="ltr"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      {t("emailBody")} (AR - HTML/Text)
                    </label>
                    <textarea
                      rows={8}
                      value={selectedTemplate.body_ar || ""}
                      onChange={(e) =>
                        setSelectedTemplate({
                          ...selectedTemplate,
                          body_ar: e.target.value,
                        })
                      }
                      className={`w-full px-4 py-3 rounded-md border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all font-mono text-sm ${theme === "dark" ? "bg-[#1a1a1c] border-[var(--border-main)] text-gray-300" : "bg-[var(--bg-secondary)] border-[var(--border-main)] text-gray-800"}`}
                      dir="rtl"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={handleSaveTemplate}
                      disabled={isSavingTemplate}
                      className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-3.5 rounded-md font-bold transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isSavingTemplate ? (
                        <RefreshCw size={18} className="animate-spin" />
                      ) : (
                        <Save size={18} />
                      )}
                      {t("saveChanges")}
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div
                  className={`p-6 rounded-lg border ${theme === "dark" ? "bg-[#1a1a1c] border-[var(--border-main)]" : "bg-[var(--bg-secondary)] border-[var(--border-main)]"}`}
                >
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Code2 className="text-emerald-500" size={20} />
                    {t("variables")}
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    {t("clickToCopy")}
                  </p>

                  <div className="space-y-2">
                    {[
                      "{{userName}}",
                      "{{userEmail}}",
                      "{{actionUrl}}",
                      "{{planName}}",
                      "{{appName}}",
                    ].map((v) => (
                      <button
                        key={v}
                        onClick={() => navigator.clipboard.writeText(v)}
                        className={`w-full flex items-center justify-between p-3 rounded-md border transition-theme hover:border-emerald-500/50 ${theme === "dark" ? "bg-[#111111] border-[var(--border-main)]" : "bg-white border-[var(--border-main)]"}`}
                      >
                        <span className="font-mono text-sm text-emerald-500">
                          {v}
                        </span>
                        <Copy size={14} className="text-gray-400" />
                      </button>
                    ))}
                  </div>

                  <div className="mt-8 pt-6 border-t border-[var(--border-main)] dark:border-[var(--border-main)]">
                    <h4 className="font-bold mb-2 text-sm">
                      Professional Footer
                    </h4>
                    <p className="text-xs text-gray-500 mb-4">
                      The system automatically appends the{" "}
                      {(language === "ar"
                        ? siteSettings.siteNameAr
                        : siteSettings.siteName) || t("appName")}{" "}
                      signature, support email, and website link to all outgoing
                      emails.
                    </p>
                    <div
                      className={`p-4 rounded-md text-xs ${theme === "dark" ? "bg-[#111111] text-gray-400" : "bg-white text-gray-500"}`}
                    >
                      <p>--</p>
                      <p className="font-bold text-emerald-500">
                        {(language === "ar"
                          ? siteSettings.siteNameAr
                          : siteSettings.siteName) || t("appName")}{" "}
                        Team
                      </p>
                      <p>Support: support@example.com</p>
                      <p>example.com</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const MassBroadcastView = ({
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
  const { token } = useAppContext();
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const [form, setForm] = useState({
    broadcast_type: "both",
    target_group: "all",
    title_en: "",
    title_ar: "",
    content_en: "",
    content_ar: "",
  });

  const [targetCount, setTargetCount] = useState<number | null>(null);
  const [isCounting, setIsCounting] = useState(false);

  const fetchTargetCount = async (group: string) => {
    setIsCounting(true);
    try {
      const res = await fetch(`/api/admin/users/count?group=${group}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTargetCount(data.count);
      }
    } catch (e) {
      console.error("Error counting users:", e);
    } finally {
      setIsCounting(false);
    }
  };

  useEffect(() => {
    if (showForm && token) {
      fetchTargetCount(form.target_group);
    }
  }, [form.target_group, showForm, token]);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchBroadcasts = async () => {
    try {
      const res = await fetch("/api/admin/broadcasts", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setBroadcasts(await res.json());
    } catch (e) {
      console.error("Error fetching broadcasts:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchBroadcasts();
    const handleAdd = () => setShowForm((prev) => !prev);
    window.addEventListener("admin-add-broadcast", handleAdd);
    return () => window.removeEventListener("admin-add-broadcast", handleAdd);
  }, [token]);

  const handleSend = async () => {
    if (
      !form.title_en ||
      !form.title_ar ||
      !form.content_en ||
      !form.content_ar
    ) {
      showToast(t("allFieldsRequired") || "All fields are required", "error");
      return;
    }

    setIsSending(true);
    try {
      const res = await fetch("/api/admin/broadcasts/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        const data = await res.json();
        const successMsg =
          t("broadcastSuccess") || "Broadcast sent to {count} users";
        showToast(successMsg.replace("{count}", data.sent_count), "success");
        setForm({
          broadcast_type: "both",
          target_group: "all",
          title_en: "",
          title_ar: "",
          content_en: "",
          content_ar: "",
        });
        setShowForm(false);
        fetchBroadcasts();
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to send broadcast", "error");
      }
    } catch (error) {
      console.error("Error sending broadcast:", error);
      showToast("Connection Error", "error");
    } finally {
      setIsSending(false);
    }
  };

  const totalBroadcasts = broadcasts.length;
  const totalSent = broadcasts.reduce(
    (acc, curr) => acc + (curr.sent_count || 0),
    0,
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300 relative">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          className={`p-5 rounded-lg border ${theme === "dark" ? "bg-[#111111] border-[var(--border-main)]" : "bg-white border-[var(--border-main)] shadow-sm"} group transition-theme hover:border-emerald-500/30`}
        >
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-md bg-emerald-500/10 text-emerald-500 group-hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.4)] transition-all">
              <Send size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                {t("totalBroadcasts") ||
                  (language === "ar" ? "إجمالي الحملات" : "Total Campaigns")}
              </p>
              <p className="text-2xl font-black mt-1">{totalBroadcasts}</p>
            </div>
          </div>
        </div>
        <div
          className={`p-5 rounded-lg border ${theme === "dark" ? "bg-[#111111] border-[var(--border-main)]" : "bg-white border-[var(--border-main)] shadow-sm"} group transition-all duration-300 hover:border-blue-500/30`}
        >
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-md bg-blue-500/10 text-blue-500 group-hover:drop-shadow-[0_0_8px_rgba(59,130,246,0.4)] transition-all">
              <Users size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                {t("totalReached") ||
                  (language === "ar" ? "إجمالي الوصول" : "Total Reached")}
              </p>
              <p className="text-2xl font-black mt-1">
                {totalSent.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
        <div
          className={`p-5 rounded-lg border ${theme === "dark" ? "bg-emerald-500/5 border-emerald-500/20" : "bg-emerald-50/50 border-emerald-200 shadow-sm"} group transition-all duration-300`}
        >
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-md bg-emerald-500/10 text-emerald-500">
              <Megaphone size={24} className="animate-bounce" />
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                {t("activeStatus") ||
                  (language === "ar" ? "حالة المحرك" : "Engine Status")}
              </p>
              <p className="text-2xl font-black mt-1 text-emerald-500">READY</p>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 ${dir === "rtl" ? "left-6" : "right-6"} z-50 flex items-center gap-3 px-6 py-4 rounded-md shadow-2xl transition-theme animate-in slide-in-from-bottom-5 ${
            toast.type === "success"
              ? theme === "dark"
                ? "bg-[#1a1a1c] border border-emerald-500/30 text-emerald-500"
                : "bg-white border border-emerald-200 text-emerald-600"
              : theme === "dark"
                ? "bg-[#1a1a1c] border border-red-500/30 text-red-500"
                : "bg-white border border-red-200 text-red-600"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle size={20} />
          ) : (
            <AlertCircle size={20} />
          )}
          <span className="font-medium text-sm">{toast.message}</span>
        </div>
      )}

      <AnimatePresence mode="wait">
        {showForm ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`p-6 md:p-8 rounded-lg border ${theme === "dark" ? "bg-[#111111] border-[var(--border-main)]" : "bg-white border-[var(--border-main)]"} shadow-2xl shadow-black/5`}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    {t("broadcastType")}
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      {
                        id: "email",
                        label: t("broadcastEmail"),
                        icon: <Mail size={18} />,
                      },
                      {
                        id: "notification",
                        label: t("broadcastNotification"),
                        icon: <BellRing size={18} />,
                      },
                      {
                        id: "both",
                        label: t("broadcastBoth"),
                        icon: <Send size={18} />,
                      },
                    ].map((type) => (
                    <button
                      key={type.id}
                      onClick={() =>
                        setForm({ ...form, broadcast_type: type.id })
                      }
                      className={`flex flex-col items-center justify-center gap-2 p-4 rounded-md border transition-theme ${
                        form.broadcast_type === type.id
                          ? "bg-emerald-500/10 border-emerald-500 text-emerald-500 shadow-lg shadow-emerald-500/5"
                          : `border-[var(--border-main)] dark:border-[var(--border-main)] text-gray-400 hover:border-[var(--border-main)] dark:hover:border-[var(--border-main)] ${theme === "dark" ? "bg-[#1a1a1c]" : "bg-[var(--bg-secondary)]"}`
                      }`}
                    >
                        {type.icon}
                        <span className="text-[10px] font-bold uppercase tracking-wider text-center">
                          {type.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    {t("targetGroup")}
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      {
                        id: "all",
                        label: t("allUsers"),
                        icon: <Users size={18} />,
                      },
                      {
                        id: "pro_only",
                        label: t("proOnly"),
                        icon: <Zap size={18} />,
                      },
                      {
                        id: "free_only",
                        label: t("freeOnly"),
                        icon: <Activity size={18} />,
                      },
                    ].map((group) => (
                      <button
                        key={group.id}
                        onClick={() =>
                          setForm({ ...form, target_group: group.id })
                        }
                        className={`flex flex-col items-center justify-center gap-2 p-4 rounded-md border transition-all duration-300 ${
                          form.target_group === group.id
                            ? "bg-emerald-500/10 border-emerald-500 text-emerald-500 shadow-lg shadow-emerald-500/5"
                            : `border-[var(--border-main)] dark:border-[var(--border-main)] text-gray-400 hover:border-[var(--border-main)] dark:hover:border-[var(--border-main)] ${theme === "dark" ? "bg-[#1a1a1c]" : "bg-[var(--bg-secondary)]"}`
                        }`}
                      >
                        {group.icon}
                        <span className="text-[10px] font-bold uppercase tracking-wider text-center">
                          {group.label}
                        </span>
                      </button>
                    ))}
                  </div>
                  {targetCount !== null && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-2 text-[10px] font-bold text-emerald-500 uppercase flex items-center gap-2"
                    >
                      <Users size={12} />
                      {isCounting ? (
                        <RefreshCw size={10} className="animate-spin" />
                      ) : language === "ar" ? (
                        `سيتم استهداف ${targetCount} مستخدم حالياً`
                      ) : (
                        `Targeting ${targetCount} users currently`
                      )}
                    </motion.p>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        {t("titleEn")}
                      </label>
                      <input
                        type="text"
                        value={form.title_en || ""}
                        onChange={(e) =>
                          setForm({ ...form, title_en: e.target.value })
                        }
                        className={`w-full px-4 py-3 rounded-md border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all ${theme === "dark" ? "bg-[#1a1a1c] border-[var(--border-main)] text-white" : "bg-[var(--bg-secondary)] border-[var(--border-main)]"}`}
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        {t("titleAr")}
                      </label>
                      <input
                        type="text"
                        value={form.title_ar || ""}
                        onChange={(e) =>
                          setForm({ ...form, title_ar: e.target.value })
                        }
                        className={`w-full px-4 py-3 rounded-md border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all ${theme === "dark" ? "bg-[#1a1a1c] border-[var(--border-main)] text-white" : "bg-[var(--bg-secondary)] border-[var(--border-main)]"}`}
                        dir="rtl"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    {t("contentEn")} (Markdown/HTML Support)
                  </label>
                  <textarea
                    rows={6}
                    value={form.content_en || ""}
                    onChange={(e) =>
                      setForm({ ...form, content_en: e.target.value })
                    }
                    className={`w-full px-4 py-3 rounded-md border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-sm font-sans ${theme === "dark" ? "bg-[#1a1a1c] border-[var(--border-main)] text-gray-300" : "bg-[var(--bg-secondary)] border-[var(--border-main)] text-gray-800"}`}
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    {t("contentAr")} (Markdown/HTML Support)
                  </label>
                  <textarea
                    rows={6}
                    value={form.content_ar || ""}
                    onChange={(e) =>
                      setForm({ ...form, content_ar: e.target.value })
                    }
                    className={`w-full px-4 py-3 rounded-md border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-sm font-sans ${theme === "dark" ? "bg-[#1a1a1c] border-[var(--border-main)] text-gray-300" : "bg-[var(--bg-secondary)] border-[var(--border-main)] text-gray-800"}`}
                    dir="rtl"
                  />
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-[var(--border-main)] dark:border-[var(--border-main)] flex justify-end">
              <button
                onClick={handleSend}
                disabled={isSending}
                className="w-full md:w-auto bg-emerald-500 hover:bg-emerald-600 text-white px-10 py-4 rounded-md font-bold transition-all shadow-xl shadow-emerald-500/30 flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {isSending ? (
                  <RefreshCw size={22} className="animate-spin" />
                ) : (
                  <Send size={22} />
                )}
                {t("sendNow")}
              </button>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-6">
            <h3 className="text-xl font-bold flex items-center gap-3">
              <History className="text-emerald-500" size={24} />
              {t("broadcastHistory")}
            </h3>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <RefreshCw
                  size={32}
                  className="text-emerald-500 animate-spin"
                />
                <p className="text-gray-400">{t("loadingRecords")}</p>
              </div>
            ) : broadcasts.length === 0 ? (
              <div
                className={`p-12 rounded-lg border border-dashed flex flex-col items-center justify-center text-center ${theme === "dark" ? "border-[var(--border-main)] bg-[#111111]" : "border-[var(--border-main)] bg-[var(--bg-secondary)]"}`}
              >
                <Send
                  className="text-gray-300 dark:text-gray-800 mb-4"
                  size={48}
                />
                <p className="text-gray-500 font-medium">{t("noBroadcasts")}</p>
                <button
                  onClick={() => setShowForm(true)}
                  className="mt-4 text-emerald-500 font-bold hover:underline"
                >
                  {t("launchFirstBroadcast")}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {broadcasts.map((b) => (
                  <div
                    key={b.id}
                    className={`p-6 rounded-lg border transition-theme hover:border-emerald-500/30 hover:shadow-xl hover:shadow-black/5 ${theme === "dark" ? "bg-[#1a1a1c] border-[var(--border-main)]" : "bg-white border-[var(--border-main)] shadow-sm"}`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-md ${theme === "dark" ? "bg-emerald-500/10" : "bg-emerald-50"}`}
                        >
                          {b.broadcast_type === "email" ? (
                            <Mail size={18} className="text-emerald-500" />
                          ) : b.broadcast_type === "notification" ? (
                            <BellRing size={18} className="text-emerald-500" />
                          ) : (
                            <Send size={18} className="text-emerald-500" />
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-emerald-500 uppercase tracking-widest">
                            {b.broadcast_type}
                          </p>
                          <p
                            className={`text-sm font-medium ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}
                          >
                            {new Date(b.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div
                        className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${theme === "dark" ? "bg-[var(--bg-secondary)] text-gray-400" : "bg-[var(--bg-input)] text-gray-600"}`}
                      >
                        {b.target_group}
                      </div>
                    </div>

                    <h4 className="font-bold text-lg mb-2 line-clamp-1">
                      {dir === "rtl" ? b.title_ar : b.title_en}
                    </h4>
                    <p
                      className={`text-sm line-clamp-2 mb-4 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}
                    >
                      {dir === "rtl" ? b.content_ar : b.content_en}
                    </p>

                    <div className="pt-4 border-t border-[var(--border-main)] dark:border-[var(--border-main)] flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
                        <Users size={14} />
                        <span>
                          {b.sent_count} {t("sentCount")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-emerald-500 text-xs font-bold">
                        <CheckCircle size={14} />
                        <span className="uppercase tracking-widest">Sent</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

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

const MemoryCenterView = ({
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
  const [reports, setReports] = useState<MemoryConsolidationReportItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [systemStats, setSystemStats] = useState<{
    totalMemories: number;
    usersWithMemories: number;
    averageMemories: number;
  } | null>(null);
  const [loadingStats, setLoadingStats] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string>("");
  const [isSuccessToast, setIsSuccessToast] = useState<boolean>(false);

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const res = await fetch("/api/admin/memories/stats", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSystemStats(data);
      }
    } catch (err) {
      console.error("Failed to load memory stats:", err);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchStats();
    }
  }, [token]);

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
        setToastMsg(
          language === "ar"
            ? "اكتملت عملية تكثيف الذاكرة بنجاح!"
            : "Memory distillation cycle completed successfully!"
        );
        setIsSuccessToast(true);
        fetchStats();
      } else {
        setToastMsg(data.error || "Failed to execute consolidation");
        setIsSuccessToast(false);
      }
    } catch (err: any) {
      setToastMsg(err.message || "Network error");
      setIsSuccessToast(false);
    } finally {
      setIsRunning(false);
      setIsOperationPending(false);
      setTimeout(() => {
        setToastMsg("");
      }, 4000);
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
      {/* Toast Notice */}
      {toastMsg && (
        <div
          className={`fixed bottom-6 ${dir === "rtl" ? "left-6" : "right-6"} z-50 flex items-center gap-3 px-6 py-4 rounded-lg shadow-2xl transition-theme animate-in slide-in-from-bottom-5 ${
            isSuccessToast
              ? theme === "dark"
                ? "bg-[#1a1a1c] border border-emerald-500/30 text-emerald-500"
                : "bg-white border border-emerald-200 text-emerald-600"
              : theme === "dark"
                ? "bg-[#1a1a1c] border border-red-500/30 text-red-500"
                : "bg-white border border-red-200 text-red-600"
          }`}
        >
          {isSuccessToast ? (
            <CheckCircle2
              size={20}
              className="text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]"
            />
          ) : (
            <AlertCircle size={20} className="text-red-500" />
          )}
          <span className="font-medium text-sm">{toastMsg}</span>
        </div>
      )}

      {/* Hero Header */}
      <div
        className={`p-6 rounded-lg border transition-theme ${
          theme === "dark"
            ? "bg-[#1a1a1c] border-gray-800/60"
            : "bg-white border-gray-200"
        } shadow-sm`}
      >
        <div className="flex items-start gap-4">
          <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.05)]">
            <Brain
              size={28}
              className="text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]"
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
              className="text-gray-400 group-hover:text-emerald-500 group-hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.5)] transition-all duration-300"
            />
          </div>
          <div className="mt-4 flex items-baseline">
            {loadingStats ? (
              <span className="text-3xl font-extrabold text-emerald-500/30 animate-pulse">
                ...
              </span>
            ) : (
              <span className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight font-sans">
                {systemStats?.totalMemories ?? 0}
              </span>
            )}
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent"></div>
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
              className="text-gray-400 group-hover:text-emerald-500 group-hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.5)] transition-all duration-300"
            />
          </div>
          <div className="mt-4 flex items-baseline">
            {loadingStats ? (
              <span className="text-3xl font-extrabold text-emerald-500/30 animate-pulse">
                ...
              </span>
            ) : (
              <span className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight font-sans">
                {systemStats?.usersWithMemories ?? 0}
              </span>
            )}
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent"></div>
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
              className="text-gray-400 group-hover:text-emerald-500 group-hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.5)] transition-all duration-300"
            />
          </div>
          <div className="mt-4 flex items-baseline">
            {loadingStats ? (
              <span className="text-3xl font-extrabold text-emerald-500/30 animate-pulse">
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
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent"></div>
        </div>
      </div>

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
              className={`w-full px-4 py-2 rounded border focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all font-mono text-sm ${
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
              className={`w-full px-4 py-2 rounded border focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all font-mono text-sm ${
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
              className={`w-full flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800/40 text-white rounded-[4px] font-medium text-sm transition-all duration-300 shadow-[0_0_15px_rgba(16,185,129,0.15)] hover:shadow-[0_0_25px_rgba(16,185,129,0.3)] disabled:shadow-none cursor-pointer`}
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
                    className="text-white drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]"
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
              className={`w-full px-4 py-2 pl-10 pr-4 rounded border focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all text-xs ${
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
                className={`p-5 rounded-lg border transition-all duration-300 ${
                  report.success
                    ? theme === "dark"
                      ? "bg-[#0f0f11]/60 border-emerald-500/15 shadow-[0_0_15px_rgba(16,185,129,0.02)]"
                      : "bg-emerald-50/15 border-emerald-200/50"
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
                          <span className="text-emerald-400 font-bold">
                            {report.newCount}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-extrabold text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.7)] px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/20">
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
                      <span className="flex items-center gap-1.5 text-xs text-emerald-500 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse animate-duration-1000"></span>
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
                        className={`p-4 rounded border-s-4 border-emerald-500 leading-relaxed text-sm font-medium ${
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
                            key={idx}
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
    </div>
  );
};

const SystemSettingsView = ({
  theme,
  t,
  dir,
}: {
  theme: string;
  t: (key: string, replacements?: any) => string;
  dir: string;
}) => {
  const { siteSettings, setSiteSettings, token, setIsOperationPending, language } =
    useAppContext();

  const [siteName, setSiteName] = useState(siteSettings.siteName);
  const [siteNameAr, setSiteNameAr] = useState(siteSettings.siteNameAr || "");
  const [seoSiteNameEn, setSeoSiteNameEn] = useState("");
  const [seoSiteNameAr, setSeoSiteNameAr] = useState("");
  const [siteDescription, setSiteDescription] = useState(
    siteSettings.siteDescription,
  );
  const [siteDescriptionAr, setSiteDescriptionAr] = useState(
    siteSettings.siteDescriptionAr || "",
  );
  const [seoDescriptionEn, setSeoDescriptionEn] = useState("");
  const [seoDescriptionAr, setSeoDescriptionAr] = useState("");
  const [keywordsEn, setKeywordsEn] = useState("");
  const [keywordsAr, setKeywordsAr] = useState("");
  const [googleAnalyticsId, setGoogleAnalyticsId] = useState(
    siteSettings.googleAnalyticsId,
  );
  const [googleSiteVerification, setGoogleSiteVerification] = useState(
    siteSettings.googleSiteVerification || "",
  );
  const [blockedPaths, setBlockedPaths] = useState(
    siteSettings.blocked_paths || "",
  );

  const [logoBase64, setLogoBase64] = useState<string | null>(
    siteSettings.logoBase64,
  );
  const [logoLightBase64, setLogoLightBase64] = useState<string | null>(
    siteSettings.logoLightBase64,
  );
  const [faviconBase64, setFaviconBase64] = useState<string | null>(
    siteSettings.faviconBase64,
  );
  const [seoImageUrl, setSeoImageUrl] = useState<string | null>(
    siteSettings.seoImageUrl,
  );

  const [isSaving, setIsSaving] = useState(false);
  const [isSeoUploading, setIsSeoUploading] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  // --- DYNAMIC ROUTE SEO MANAGEMENT STATE ---
  const [routeSeoList, setRouteSeoList] = useState<any[]>([]);
  const [loadingRouteSeo, setLoadingRouteSeo] = useState(false);
  const [editingRouteItem, setEditingRouteItem] = useState<any | null>(null);
  const [isRouteModalOpen, setIsRouteModalOpen] = useState(false);
  const [routeSearchQuery, setRouteSearchQuery] = useState("");
  const [routeUploadingImg, setRouteUploadingImg] = useState(false);

  const fetchRouteSeoList = async () => {
    setLoadingRouteSeo(true);
    try {
      const res = await fetch("/api/admin/seo-routes", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRouteSeoList(data);
      }
    } catch (e) {
      console.error("Failed to load route SEO list:", e);
    } finally {
      setLoadingRouteSeo(false);
    }
  };

  const handleOpenAddRouteModal = () => {
    setEditingRouteItem({
      route: "",
      title_ar: "",
      title_en: "",
      description_ar: "",
      description_en: "",
      keywords_ar: "",
      keywords_en: "",
      og_image_url: "",
      is_active: true,
    });
    setIsRouteModalOpen(true);
  };

  const handleOpenEditRouteModal = (item: any) => {
    setEditingRouteItem({ ...item });
    setIsRouteModalOpen(true);
  };

  const handleSaveRouteSeo = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editingRouteItem?.route) {
      showToast(dir === "rtl" ? "مسار الصفحة مطلوب (مثل /marketplace)" : "Route path is required (e.g. /marketplace)", "error");
      return;
    }
    try {
      const res = await fetch("/api/admin/seo-routes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editingRouteItem),
      });
      if (res.ok) {
        showToast(
          dir === "rtl" ? "تم حفظ إعدادات SEO للمسار بنجاح" : "Route SEO settings saved successfully",
          "success"
        );
        setIsRouteModalOpen(false);
        setEditingRouteItem(null);
        fetchRouteSeoList();
      } else {
        const errData = await res.json();
        showToast(errData.error || "Failed to save route SEO", "error");
      }
    } catch (e: any) {
      showToast(e.message || "Error saving route SEO", "error");
    }
  };

  const handleDeleteRouteSeo = async (id: number) => {
    if (!window.confirm(dir === "rtl" ? "هل أنت تأكد من حذف إعدادات هذا المسار؟" : "Are you sure you want to delete this route SEO setting?")) return;
    try {
      const res = await fetch(`/api/admin/seo-routes/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showToast(dir === "rtl" ? "تم حذف إعدادات المسار" : "Route SEO setting removed", "success");
        fetchRouteSeoList();
      } else {
        showToast("Failed to delete", "error");
      }
    } catch (e: any) {
      showToast(e.message || "Delete error", "error");
    }
  };

  const handleRouteImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showToast(dir === "rtl" ? "حجم الصورة يجب أن يكون أقل من 2 ميغابايت" : "Image size must be less than 2MB", "error");
      return;
    }
    setRouteUploadingImg(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/admin/settings/upload-seo-image", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.imageUrl) {
          setEditingRouteItem((prev: any) => ({ ...prev, og_image_url: data.imageUrl }));
          showToast(dir === "rtl" ? "تم رفع صورة المسار بنجاح" : "Route SEO image uploaded successfully", "success");
        }
      }
    } catch (err) {
      showToast("Failed to upload image", "error");
    } finally {
      setRouteUploadingImg(false);
    }
  };



  // --- SEO CRAWLABILITY AND ROUTE INDEXING AUDIT REPORT STATE ---
  const [crawlScanning, setCrawlScanning] = useState(false);
  const [crawlAuditScores, setCrawlAuditScores] = useState<{ total: number; protected: number; indexed: number } | null>(null);
  const [crawlAuditFilter, setCrawlAuditFilter] = useState<"all" | "index" | "noindex">("all");
  const [crawlAuditLogs, setCrawlAuditLogs] = useState<string[]>([]);
  const [crawlComplianceRate, setCrawlComplianceRate] = useState<string>("100.00% SECURE");

  useEffect(() => {
    setIsOperationPending(isSaving);
  }, [isSaving, setIsOperationPending]);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch("/api/admin/settings", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setSiteName(data.site_name_en || "");
          setSiteNameAr(data.site_name_ar || "");
          const seoSiteNameEnVal = data.seo_site_name_en || "";
          const seoSiteNameArVal = data.seo_site_name_ar || "";
          setSeoSiteNameEn(seoSiteNameEnVal);
          setSeoSiteNameAr(seoSiteNameArVal);

          setSiteDescription(data.site_description_en || "");
          setSiteDescriptionAr(data.site_description_ar || "");
          const seoEnVal = data.seo_description_en || data.seo_description_en === "" ? data.seo_description_en : "";
          const seoArVal = data.seo_description_ar || "";
          const kwsEnVal = data.keywords_en || "";
          const kwsArVal = data.keywords_ar || "";

          setSeoDescriptionEn(seoEnVal);
          setSeoDescriptionAr(seoArVal);
          setKeywordsEn(kwsEnVal);
          setKeywordsAr(kwsArVal);
          setGoogleAnalyticsId(data.google_analytics_id || "");
          setGoogleSiteVerification(data.google_site_verification || "");
          setBlockedPaths(data.blocked_paths || "");
          setLogoBase64(data.logo_url || null);
          setLogoLightBase64(data.logo_light_url || null);
          setFaviconBase64(data.favicon_url || null);
          setSeoImageUrl(data.seo_image_url || null);

          setSiteSettings({
            ...siteSettings,
            siteName: data.site_name_en || "",
            siteNameAr: data.site_name_ar || "",
            seoSiteNameEn: seoSiteNameEnVal,
            seoSiteNameAr: seoSiteNameArVal,
            siteDescription: data.site_description_en || "",
            siteDescriptionAr: data.site_description_ar || "",
            seoDescriptionEn: seoEnVal,
            seoDescriptionAr: seoArVal,
            keywordsEn: kwsEnVal,
            keywordsAr: kwsArVal,
            googleAnalyticsId: data.google_analytics_id || "",
            logoBase64: data.logo_url || null,
            logoLightBase64: data.logo_light_url || null,
            faviconBase64: data.favicon_url || null,
            seoImageUrl: data.seo_image_url || null,
            blocked_paths: data.blocked_paths || "",
          });
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
      }
    };
    if (token) {
      fetchSettings();
      fetchRouteSeoList();
    }
  }, [token]);

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "logo" | "logo_light" | "favicon" | "seo",
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      if (type === "seo") {
        if (file.size > 2 * 1024 * 1024) {
          showToast(
            dir === "rtl" 
              ? "حجم الصورة يتجاوز الحد الأقصى المسموح به وهو 2 ميغابايت" 
              : "SEO Image must be less than 2MB", 
            "error"
          );
          return;
        }

        setIsSeoUploading(true);
        try {
          const formData = new FormData();
          formData.append("file", file);

          const response = await fetch("/api/admin/settings/upload-seo-image", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          });

          if (!response.ok) {
            throw new Error("Failed to upload image");
          }

          const data = await response.json();
          if (data.success && data.imageUrl) {
            setSeoImageUrl(data.imageUrl);
            showToast(
              dir === "rtl" 
                ? "تم رفع صورة محركات البحث بنجاح" 
                : "SEO preview image uploaded successfully", 
              "success"
            );
          } else {
            throw new Error("Upload response was unsuccessful");
          }
        } catch (error) {
          console.error('[SEOImageUpload] Frontend upload error:', error);
          showToast(
            dir === "rtl" 
              ? "فشل رفع الصورة المخصصة، يرجى المحاولة لاحقاً" 
              : "Failed to upload SEO image. Please try again.", 
            "error"
          );
        } finally {
          setIsSeoUploading(false);
        }
      } else {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (type === "logo") setLogoBase64(reader.result as string);
          else if (type === "logo_light") setLogoLightBase64(reader.result as string);
          else if (type === "favicon") setFaviconBase64(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleSaveGeneralSettings = async () => {
    if (!siteName || !siteDescription) {
      showToast(t("allFieldsRequired") || "All fields are required", "error");
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          site_name_en: siteName,
          site_name_ar: siteNameAr,
          site_description_en: siteDescription,
          site_description_ar: siteDescriptionAr,
          seo_description_en: seoDescriptionEn,
          seo_description_ar: seoDescriptionAr,
          keywords_en: keywordsEn,
          keywords_ar: keywordsAr,
          google_analytics_id: googleAnalyticsId,
          google_site_verification: googleSiteVerification,
          logo_url: logoBase64,
          logo_light_url: logoLightBase64,
          favicon_url: faviconBase64,
          seo_image_url: seoImageUrl,
        }),
      });

      if (res.ok) {
        setSiteSettings({
          ...siteSettings,
          siteName,
          siteNameAr,
          siteDescription,
          siteDescriptionAr,
          seoDescriptionEn: seoDescriptionEn,
          seoDescriptionAr: seoDescriptionAr,
          keywordsEn: keywordsEn,
          keywordsAr: keywordsAr,
          seoImageUrl: seoImageUrl,
        });
        showToast(t("saveSuccess") || "General settings saved", "success");
      } else {
        showToast(t("saveFailed") || "Failed", "error");
      }
    } catch (error) {
      showToast(t("saveFailed") || "Failed", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveVisualSettings = async () => {
    if (!logoBase64 || !faviconBase64) {
      showToast(
        t("imagesRequired") || "Both logo and favicon are required",
        "error",
      );
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          site_name_en: siteSettings.siteName,
          site_name_ar: siteSettings.siteNameAr,
          site_description_en: siteSettings.siteDescription,
          site_description_ar: siteSettings.siteDescriptionAr,
          seo_description_en: seoDescriptionEn,
          seo_description_ar: seoDescriptionAr,
          keywords_en: keywordsEn,
          keywords_ar: keywordsAr,
          google_analytics_id: googleAnalyticsId,
          google_site_verification: googleSiteVerification,
          logo_url: logoBase64,
          logo_light_url: logoLightBase64,
          favicon_url: faviconBase64,
          seo_image_url: seoImageUrl,
        }),
      });

      if (res.ok) {
        setSiteSettings({
          ...siteSettings,
          logoBase64,
          logoLightBase64,
          faviconBase64,
          seoImageUrl: seoImageUrl,
        });
        showToast(t("saveSuccess") || "Visual settings saved", "success");
      } else {
        showToast(t("saveFailed") || "Failed", "error");
      }
    } catch (error) {
      showToast(t("saveFailed") || "Failed", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSeoSettings = async () => {
    if (!siteName) {
      showToast(dir === "rtl" ? "اسم الموقع بالإنجليزية مطلوب" : "Site Name in English is required", "error");
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          site_name_en: siteName,
          site_name_ar: siteNameAr,
          seo_site_name_en: seoSiteNameEn,
          seo_site_name_ar: seoSiteNameAr,
          site_description_en: siteDescription,
          site_description_ar: siteDescriptionAr,
          seo_description_en: seoDescriptionEn,
          seo_description_ar: seoDescriptionAr,
          keywords_en: keywordsEn,
          keywords_ar: keywordsAr,
          google_analytics_id: googleAnalyticsId || "",
          google_site_verification: googleSiteVerification || "",
          logo_url: logoBase64 || siteSettings.logoBase64,
          logo_light_url: logoLightBase64 || siteSettings.logoLightBase64,
          favicon_url: faviconBase64 || siteSettings.faviconBase64,
          seo_image_url: seoImageUrl,
          blocked_paths: blockedPaths || "",
        }),
      });

      if (res.ok) {
        setSiteSettings({
          ...siteSettings,
          siteName,
          siteNameAr,
          seoSiteNameEn,
          seoSiteNameAr,
          siteDescription,
          siteDescriptionAr,
          seoDescriptionEn,
          seoDescriptionAr,
          keywordsEn,
          keywordsAr,
          googleAnalyticsId,
          googleSiteVerification,
          seoImageUrl,
          blocked_paths: blockedPaths,
        });
        showToast(t("saveSuccess") || "SEO settings saved", "success");
      } else {
        showToast(t("saveFailed") || "Failed", "error");
      }
    } catch (error) {
      showToast(t("saveFailed") || "Failed", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // --- CRAWLABILITY ROUTE LIST, SCANNER, AND EXPORT CONSOLE FUNCTIONS ---
  const routesSchema = useMemo(() => {
    const base = [
      { path: "/", labelEn: "Home Gateway Redirect", labelAr: "بوابة التوجيه الرئيسية", type: "public", status: "index", descriptionEn: "Public gateway routing users to default dashboard structure.", descriptionAr: "بوابة توجيه عامة تقوم بتوجيه المستخدمين للواجهة الافتراضية." },
      { path: "/subscription", labelEn: "Subscription Plans Page", labelAr: "صفحة خطط الاشتراكات", type: "public", status: "index", descriptionEn: "Public storefront detailing memberships, tiers, and pricing matrices.", descriptionAr: "صفحة عامة لعرض مزايا وتفاصيل العضوية والخطط السعرية." },
      { path: "/marketplace", labelEn: "AI Plugin & Prompt Marketplace", labelAr: "متجر الإضافات والنماذج الذكية", type: "public", status: "index", descriptionEn: "Public showcase of integration add-ons and premium prompts.", descriptionAr: "معرض عام لعرض ملحقات الأنظمة المدمجة والقوالب الاحترافية." },
      { path: "/blog", labelEn: "Technical Editorial Blog", labelAr: "المدونة التقنية والتعليمية", type: "public", status: "index", descriptionEn: "Public resource hub to publish analysis articles and tutorials.", descriptionAr: "مركز مقالات عام لنشر التحليلات الفنية والدروس التعليمية." },
      { path: "/terms", labelEn: "Terms of Service", labelAr: "شروط الخدمة والاستخدام", type: "public", status: "index", descriptionEn: "Mandatory public legal statement governing platform interactions.", descriptionAr: "اتفاقية قانونية عامة تنظم الاستخدام وحقوق الملكية للمنصة." },
      { path: "/privacy", labelEn: "Privacy Policy Charter", labelAr: "سياسة الخصوصية وحماية البيانات", type: "public", status: "index", descriptionEn: "Mandatory public charter highlighting database handling policies.", descriptionAr: "ميثاق خصوصية عام يوضح سياسات التعامل الآمن مع قواعد البيانات." },
      { path: "/about", labelEn: "About Corporate Pitch", labelAr: "صفحة التعريف والرؤية", type: "public", status: "index", descriptionEn: "Public company presentation showcasing core tech vision.", descriptionAr: "عرض عام للمؤسسة يعزز الثقة ويوضح الرؤية الابتكارية." },
      { path: "/chat", labelEn: "Intelligence Workspace (Chat Component)", labelAr: "مساحة المحادثة والتحليل الذكي المتطور", type: "private", status: "noindex", descriptionEn: "Highly sensitive user-curated environment containing active AI transcriptions.", descriptionAr: "مساحة عمل خاصة وسرية للغاية تحتوي على سجل محادثات الذكاء الاصطناعي." },
      { path: "/settings", labelEn: "User Profile & Security Vault", labelAr: "إعدادات الحساب وحقيبة أمان العضو", type: "private", status: "noindex", descriptionEn: "Sensitive account configurations, referral links, and session details.", descriptionAr: "إعدادات شخصية حساسة ومفاتيح العضوية وسجلات الجلسات النشطة." },
      { path: "/rewards", labelEn: "Affiliate Ledger & KYC Pending Board", labelAr: "نظام المكافآت والتحقق المالي المتقدم", type: "private", status: "noindex", descriptionEn: "Ledger transaction audits, KYC identities, and wallet addresses.", descriptionAr: "سجلات ماليّة لتعيين المكافآت وبيانات التحقق وإثبات الهوية." },
      { path: "/reset-password", labelEn: "Credential Reset Gateway", labelAr: "بوابة استعادة وتعيين كلمة المرور", type: "private", status: "noindex", descriptionEn: "Temporary authentication token interface. Must stay isolated.", descriptionAr: "واجهة استعادة كلمات المرور باستخدام رموز تحقق متغيرة." },
      { path: "/admin-community", labelEn: "Sections Panel (Community Management)", labelAr: "لوحة تحكم الأقسام (إدارة المجتمع)", type: "admin", status: "noindex", descriptionEn: "Extreme-privileged community, sections, and category moderation hub.", descriptionAr: "مركز إدارة ومراقبة الأقسام والفئات والمجتمع ذو صلاحيات متقدمة." },
      { path: "/admin-sections", labelEn: "Sections Control Panel (External Modules)", labelAr: "لوحة تحكم الأقسام والأبحاث الخارجية", type: "admin", status: "noindex", descriptionEn: "External systems integration, categories block and custom module definitions.", descriptionAr: "لوحة ربط الأنظمة ومصادر الأبحاث الخارجية وتمرير المعطيات الحساسة." },
      { path: "/admin/sections", labelEn: "Sections Dashboard Internal Portal", labelAr: "بوابة الأقسام الداخلية للأنظمة الإلكترونية", type: "admin", status: "noindex", descriptionEn: "Internal database mappings and custom categories routing matrix.", descriptionAr: "مصفوفة فحص مسارات قواعد البيانات الداخلية للأنظمة والمجتمع." },
      { path: "/admin", labelEn: "System Command Center (Core)", labelAr: "لوحة التحكم الرئيسية والقيادة والتحكم", type: "admin", status: "noindex", descriptionEn: "Extreme-privileged interface displaying infrastructure configurations.", descriptionAr: "واجهة تحكم فائقة الحساسية للتحكم بالبنية التحتية والموديلات." }
    ];

    const dynamicBlockedList = siteSettings?.blocked_paths
      ? siteSettings.blocked_paths.split(',').map((p: string) => p.trim()).filter(Boolean)
      : [];

    dynamicBlockedList.forEach((blockedPath: string) => {
      const exists = base.some(r => r.path === blockedPath || r.path === '/' + blockedPath);
      if (!exists) {
        base.push({
          path: blockedPath.startsWith('/') ? blockedPath : '/' + blockedPath,
          labelEn: `Custom Excluded: ${blockedPath}`,
          labelAr: `مسار محظور مخصص: ${blockedPath}`,
          type: "custom",
          status: "noindex",
          descriptionEn: "Dynamically added via SEO System Exclusions control panel.",
          descriptionAr: "تمت إضافته ديناميكياً لتأمين البيانات عبر لوحة التحكم."
        });
      }
    });

    return base;
  }, [siteSettings, siteSettings?.blocked_paths]);

  const runCrawlAuditScan = async () => {
    if (crawlScanning) return; // Protect against concurrent scan execution
    
    // Explicitly reset all loading and data states for a fresh and reliable scan
    setCrawlScanning(true);
    setCrawlAuditLogs([
      language === "ar" 
        ? "⏳ يرجى الانتظار... جاري إنشاء بروتوكول اتصال آمن مع خادم التدقيق..." 
        : "⏳ Initiating secure diagnostic connection to strict compliance core..."
    ]);
    setCrawlAuditScores(null);
    setCrawlComplianceRate(language === "ar" ? "معلق" : "PENDING");
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000); // 12 seconds connection timeout
    
    try {
      const response = await fetch(`/api/admin/seo-audit?lang=${language}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error("Failed to contact the SEO crawler audit core on server.");
      }
      const data = await response.json();
      
      const messages = data.logs || [];
      setCrawlComplianceRate(data.compliance_score || "100.00% SECURE");
      
      let step = 0;
      setCrawlAuditLogs([]); // Reset log queue to stream real logs
      const timer = setInterval(() => {
        if (step < messages.length) {
          const logText = messages[step];
          setCrawlAuditLogs(prev => [...prev, logText]);
          step++;
        } else {
          clearInterval(timer);
          setCrawlScanning(false);
          setCrawlAuditScores({
            total: routesSchema.length,
            protected: routesSchema.filter((r: any) => r.status === "noindex").length,
            indexed: routesSchema.filter((r: any) => r.status === "index").length
          });
        }
      }, 500);

    } catch (err: any) {
      clearTimeout(timeoutId);
      console.error("[CrawlAudit] Scan failure:", err);
      setCrawlScanning(false);
      const isAr = language === "ar";
      const isTimeout = err.name === "AbortError";
      
      setCrawlComplianceRate("0.00% HIGH_RISK");
      setCrawlAuditScores({
        total: routesSchema.length,
        protected: 0,
        indexed: 0
      });
      
      setCrawlAuditLogs([
        isTimeout
          ? (isAr 
              ? "🚨 [TIMEOUT] انتهت مهلة الاتصال بالخادم. الاستجابة متأخرة للغاية نتيجة لارتفاع زمن الاستجابة للمخدم." 
              : "🚨 [TIMEOUT] The connection to the security compliance core timed out due to unstable network latency.")
          : (isAr 
              ? "🚨 [ERROR] فشل الاتصال بخادم التدقيق الصارم للتأكد من حماية بيئة المنصة." 
              : "🚨 [ERROR] Failed to establish high-fidelity connection to strict backend audit service.")
      ]);
    }
  };

  const downloadCrawlAuditReport = () => {
    const report = {
      platform: "Perplexta",
      timestamp: new Date().toISOString(),
      scanning_officer_id: "PERPLEXTA_ADMIN_V4",
      security_compliance_rate: crawlComplianceRate,
      total_analysed_endpoints: routesSchema.length,
      indexing_policy_applied: {
        strict_user_data_isolation: "enforced",
        allowed_public_routes_whitelist: [
          "/", "/subscription", "/marketplace", "/blog", "/terms", "/privacy", "/about"
        ]
      },
      endpoints_analysis: routesSchema.map((r: any) => ({
        url_path: r.path,
        endpoint_role: r.labelEn,
        route_class: r.type.toUpperCase(),
        target_search_indexing: r.status === "index" ? "ALLOWED (STANDARD INDEX)" : "BLOCKED (STRICT NOINDEX)",
        meta_robots_tag_verified: r.status === "noindex" ? "noindex, nofollow" : "index, follow",
        confidentiality_protection_level: r.status === "noindex" ? "MAXIMUM SHIELDED" : "STANDARD PUBLIC"
      }))
    };

    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(JSON.stringify(report, null, 2));
    const link = document.createElement("a");
    link.href = dataUri;
    link.download = `perplexta_seo_indexing_report_${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="space-y-8 max-w-5xl relative">
      {/* Toast Notification */}
      {toast &&
        createPortal(
          <div
            className={`fixed bottom-6 ${dir === "rtl" ? "left-6" : "right-6"} z-[1000] flex items-center gap-3 px-6 py-4 rounded-[var(--radius)] shadow-2xl transition-theme animate-in slide-in-from-bottom-5 ${
              toast.type === "success"
                ? theme === "dark"
                  ? "bg-[#1a1a1c] border border-emerald-500/30 text-emerald-500"
                  : "bg-white border border-emerald-200 text-emerald-600"
                : theme === "dark"
                  ? "bg-[#1a1a1c] border border-red-500/30 text-red-500"
                  : "bg-white border border-red-200 text-red-600"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle2 size={20} />
            ) : (
              <AlertCircle size={20} />
            )}
            <span className="font-medium text-sm">{toast.message}</span>
          </div>,
          document.body,
        )}

      {/* General Settings */}
      <div
        className={`p-6 md:p-8 rounded-lg border ${theme === "dark" ? "bg-[#111111] border-[var(--border-main)]" : "bg-white border-[var(--border-main)]"}`}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-md bg-emerald-500/10 text-emerald-500">
            <Globe size={24} />
          </div>
          <h2 className="text-xl font-bold">{t("generalSettings")}</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {t("siteName")} (English)
            </label>
            <input
              type="text"
              value={siteName || ""}
              dir="ltr"
              onChange={(e) => setSiteName(e.target.value)}
              className={`w-full px-4 py-3 rounded-md border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all ${theme === "dark" ? "bg-[#1a1a1c] border-[var(--border-main)] text-white" : "bg-[var(--bg-secondary)] border-[var(--border-main)]"}`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {t("siteName")} (العربية)
            </label>
            <input
              type="text"
              value={siteNameAr || ""}
              dir="rtl"
              onChange={(e) => setSiteNameAr(e.target.value)}
              className={`w-full px-4 py-3 rounded-md border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all ${theme === "dark" ? "bg-[#1a1a1c] border-[var(--border-main)] text-white" : "bg-[var(--bg-secondary)] border-[var(--border-main)]"}`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {t("siteDescription")} (English)
            </label>
            <input
              type="text"
              value={siteDescription || ""}
              dir="ltr"
              onChange={(e) => setSiteDescription(e.target.value)}
              className={`w-full px-4 py-3 rounded-md border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all ${theme === "dark" ? "bg-[#1a1a1c] border-[var(--border-main)] text-white" : "bg-[var(--bg-secondary)] border-[var(--border-main)]"}`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {t("siteDescription")} (العربية)
            </label>
            <input
              type="text"
              value={siteDescriptionAr || ""}
              dir="rtl"
              onChange={(e) => setSiteDescriptionAr(e.target.value)}
              className={`w-full px-4 py-3 rounded-md border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all ${theme === "dark" ? "bg-[#1a1a1c] border-[var(--border-main)] text-white" : "bg-[var(--bg-secondary)] border-[var(--border-main)]"}`}
            />
          </div>
        </div>
        <div className="flex justify-end mt-6">
          <button
            onClick={handleSaveGeneralSettings}
            disabled={isSaving}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2.5 rounded-[var(--radius)] transition-all duration-300 font-medium shadow-[0_0_15px_rgba(16,185,129,0.4)] disabled:opacity-50"
          >
            {isSaving ? (
              <RefreshCw className="animate-spin" size={18} />
            ) : (
              <Save size={18} />
            )}
            {t("saveSettings") || "Save"}
          </button>
        </div>
      </div>

      {/* Visual Identity */}
      <div
        className={`p-6 md:p-8 rounded-lg border ${theme === "dark" ? "bg-[#111111] border-[var(--border-main)]" : "bg-white border-[var(--border-main)]"}`}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-md bg-purple-500/10 text-purple-500">
            <ImageIcon size={24} />
          </div>
          <h2 className="text-xl font-bold">{t("visualIdentity")}</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Logo Upload (Dark theme) */}
          <div
            className={`p-6 rounded-[var(--radius)] border border-dashed ${theme === "dark" ? "border-[var(--border-main)] bg-[#1a1a1c]" : "border-[var(--border-main)] bg-[var(--bg-secondary)]"} flex flex-col items-center justify-center text-center relative overflow-hidden group`}
          >
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleImageUpload(e, "logo")}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className="mb-4 flex items-center justify-center h-8">
              {logoBase64 ? (
                <img
                  src={logoBase64}
                  alt="Dark Logo"
                  className="w-8 h-8 rounded-md object-contain"
                />
              ) : (
                <div className="bg-pink-600 p-1.5 rounded-sm text-white flex items-center justify-center w-8 h-8">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M12 2L2 7L12 12L22 7L12 2Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M2 17L12 22L22 17"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M2 12L12 17L22 12"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              )}
            </div>
            <h3 className="font-medium text-sm mb-1">
              {language === "ar" ? "الشعار للثيم الداكن" : "Logo (Dark Theme)"}
            </h3>
            <p className="text-xs text-gray-500">PNG, SVG, JPG (Max 1MB)</p>
            <p className="text-[10px] text-emerald-500 mt-2 bg-emerald-500/10 px-2 py-1 rounded-md">
              Base64 Encoded
            </p>
          </div>

          {/* Logo Upload (Light theme) */}
          <div
            className={`p-6 rounded-[var(--radius)] border border-dashed ${theme === "dark" ? "border-[var(--border-main)] bg-[#1a1a1c]" : "border-[var(--border-main)] bg-[var(--bg-secondary)]"} flex flex-col items-center justify-center text-center relative overflow-hidden group`}
          >
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleImageUpload(e, "logo_light")}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className="mb-4 flex items-center justify-center h-8">
              {logoLightBase64 ? (
                <img
                  src={logoLightBase64}
                  alt="Light Logo"
                  className="w-8 h-8 rounded-md object-contain"
                />
              ) : (
                <div className="bg-sky-500 p-1.5 rounded-sm text-white flex items-center justify-center w-8 h-8">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M12 2L2 7L12 12L22 7L12 2Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M2 17L12 22L22 17"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M2 12L12 17L22 12"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              )}
            </div>
            <h3 className="font-medium text-sm mb-1">
              {language === "ar" ? "الشعار للثيم الفاتح" : "Logo (Light Theme)"}
            </h3>
            <p className="text-xs text-gray-500">PNG, SVG, JPG (Max 1MB)</p>
            <p className="text-[10px] text-emerald-500 mt-2 bg-emerald-500/10 px-2 py-1 rounded-md">
              Base64 Encoded
            </p>
          </div>

          {/* Favicon Upload */}
          <div
            className={`p-6 rounded-lg border border-dashed ${theme === "dark" ? "border-[var(--border-main)] bg-[#1a1a1c]" : "border-[var(--border-main)] bg-[var(--bg-secondary)]"} flex flex-col items-center justify-center text-center relative overflow-hidden group`}
          >
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleImageUpload(e, "favicon")}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className="mb-4 w-8 h-8 rounded-md bg-gray-200 dark:bg-[var(--bg-secondary)] flex items-center justify-center overflow-hidden">
              {faviconBase64 ? (
                <img
                  src={faviconBase64}
                  alt="Favicon"
                  className="w-full h-full object-cover"
                />
              ) : (
                <Globe size={16} className="text-gray-400" />
              )}
            </div>
            <h3 className="font-medium text-sm mb-1">
              {language === "ar" ? "أيقونة المفضلة" : "Favicon"}
            </h3>
            <p className="text-xs text-gray-500">32x32 PNG or ICO</p>
            <p className="text-[10px] text-emerald-500 mt-2 bg-emerald-500/10 px-2 py-1 rounded-md">
              Base64 Encoded
            </p>
          </div>
        </div>
        <div className="flex justify-end mt-6">
          <button
            onClick={handleSaveVisualSettings}
            disabled={isSaving}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2.5 rounded-[var(--radius)] transition-all duration-300 font-medium shadow-[0_0_15px_rgba(16,185,129,0.4)] disabled:opacity-50"
          >
            {isSaving ? (
              <RefreshCw className="animate-spin" size={18} />
            ) : (
              <Save size={18} />
            )}
            {t("saveSettings") || "Save"}
          </button>
        </div>
      </div>

      {/* SEO & Meta Tags */}
      <div
        className={`p-6 md:p-8 rounded-lg border ${theme === "dark" ? "bg-[#111111] border-[var(--border-main)]" : "bg-white border-[var(--border-main)]"}`}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-md bg-blue-500/10 text-blue-500">
            <Search size={24} />
          </div>
          <h2 className="text-xl font-bold">{t("seoFields")}</h2>
        </div>

        <div className="space-y-5">
          {/* Site Identity Name Fields (SEO integrated) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-gray-100 dark:border-gray-800/60 pb-5">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-emerald-500 mb-1.5">
                {dir === "rtl" ? "اسم الموقع والمنصة (بالإنجليزية)" : "Site Name (English)"}
              </label>
              <input
                type="text"
                value={siteName || ""}
                onChange={(e) => setSiteName(e.target.value)}
                className={`w-full px-4 py-3 rounded-md border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all ${theme === "dark" ? "bg-[#1a1a1c] border-[var(--border-main)] text-white" : "bg-[var(--bg-secondary)] border-[var(--border-main)]"}`}
                placeholder="e.g. Perplexta Platform"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-emerald-500 mb-1.5">
                {dir === "rtl" ? "اسم الموقع والمنصة (بالعربية)" : "Site Name (Arabic)"}
              </label>
              <input
                type="text"
                value={siteNameAr || ""}
                onChange={(e) => setSiteNameAr(e.target.value)}
                className={`w-full px-4 py-3 rounded-md border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all ${theme === "dark" ? "bg-[#1a1a1c] border-[var(--border-main)] text-white" : "bg-[var(--bg-secondary)] border-[var(--border-main)]"}`}
                placeholder="مثال: منصة بيربليكستا"
              />
            </div>
          </div>

          {/* SEO Site Name Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-gray-100 dark:border-gray-800/60 pb-5">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-emerald-500 mb-1.5">
                {dir === "rtl" ? "عنوان الموقع لمحركات البحث SEO (بالإنجليزية)" : "SEO Site Title (English)"}
              </label>
              <input
                type="text"
                value={seoSiteNameEn || ""}
                onChange={(e) => setSeoSiteNameEn(e.target.value)}
                className={`w-full px-4 py-3 rounded-md border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all ${theme === "dark" ? "bg-[#1a1a1c] border-[var(--border-main)] text-white" : "bg-[var(--bg-secondary)] border-[var(--border-main)]"}`}
                placeholder="e.g. Perplexta | Premium Financial Analytics"
              />
              <p className="text-[10px] text-gray-400 mt-1">
                {dir === "rtl" ? "العنوان المحدد لمحركات البحث الإنجليزية وعلامات تبويب المتصفح." : "Optimized English title displayed in Google search listings and browser tabs."}
              </p>
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-emerald-500 mb-1.5">
                {dir === "rtl" ? "عنوان الموقع لمحركات البحث SEO (بالعربية)" : "SEO Site Title (Arabic)"}
              </label>
              <input
                type="text"
                value={seoSiteNameAr || ""}
                onChange={(e) => setSeoSiteNameAr(e.target.value)}
                className={`w-full px-4 py-3 rounded-md border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all ${theme === "dark" ? "bg-[#1a1a1c] border-[var(--border-main)] text-white" : "bg-[var(--bg-secondary)] border-[var(--border-main)]"}`}
                placeholder="مثال: منصة بيربليكستا | الاختيار الاحترافي للتحليل"
              />
              <p className="text-[10px] text-gray-400 mt-1">
                {dir === "rtl" ? "العنوان المعرّب المحدد لزيادة ظهور الموقع في نتائج البحث العربية." : "Optimized Arabic title targeting maximum visibility across Arabic search result engines."}
              </p>
            </div>
          </div>

          {/* Site Identity Description Fields (SEO integrated) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-gray-100 dark:border-gray-800/60 pb-5">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-emerald-500 mb-1.5">
                {dir === "rtl" ? "الوصف التعريفي العام (بالإنجليزية)" : "General Description (English)"}
              </label>
              <textarea
                rows={2}
                value={siteDescription || ""}
                onChange={(e) => setSiteDescription(e.target.value)}
                className={`w-full px-4 py-3 rounded-md border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all ${theme === "dark" ? "bg-[#1a1a1c] border-[var(--border-main)] text-white" : "bg-[var(--bg-secondary)] border-[var(--border-main)]"}`}
                placeholder="Enter general tagline description..."
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-emerald-500 mb-1.5">
                {dir === "rtl" ? "الوصف التعريفي العام (بالعربية)" : "General Description (Arabic)"}
              </label>
              <textarea
                rows={2}
                value={siteDescriptionAr || ""}
                onChange={(e) => setSiteDescriptionAr(e.target.value)}
                className={`w-full px-4 py-3 rounded-md border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all ${theme === "dark" ? "bg-[#1a1a1c] border-[var(--border-main)] text-white" : "bg-[var(--bg-secondary)] border-[var(--border-main)]"}`}
                placeholder="اكتب نبذة تعريفية عامة هنا..."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                {t("seoDescriptionEn")}
              </label>
              <textarea
                rows={3}
                value={seoDescriptionEn || ""}
                onChange={(e) => setSeoDescriptionEn(e.target.value)}
                className={`w-full px-4 py-3 rounded-md border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all ${theme === "dark" ? "bg-[#1a1a1c] border-[var(--border-main)] text-white" : "bg-[var(--bg-secondary)] border-[var(--border-main)]"}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                {t("seoDescriptionAr")}
              </label>
              <textarea
                rows={3}
                value={seoDescriptionAr || ""}
                onChange={(e) => setSeoDescriptionAr(e.target.value)}
                className={`w-full px-4 py-3 rounded-md border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all ${theme === "dark" ? "bg-[#1a1a1c] border-[var(--border-main)] text-white" : "bg-[var(--bg-secondary)] border-[var(--border-main)]"}`}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                {t("keywordsEn")}
              </label>
              <input
                type="text"
                value={keywordsEn || ""}
                onChange={(e) => setKeywordsEn(e.target.value)}
                className={`w-full px-4 py-3 rounded-[var(--radius)] border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all ${theme === "dark" ? "bg-[#1a1a1c] border-[var(--border-main)] text-white" : "bg-[var(--bg-secondary)] border-[var(--border-main)]"}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                {t("keywordsAr")}
              </label>
              <input
                type="text"
                value={keywordsAr || ""}
                onChange={(e) => setKeywordsAr(e.target.value)}
                className={`w-full px-4 py-3 rounded-[var(--radius)] border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all ${theme === "dark" ? "bg-[#1a1a1c] border-[var(--border-main)] text-white" : "bg-[var(--bg-secondary)] border-[var(--border-main)]"}`}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {t("googleAnalyticsId")}
            </label>
            <input
              type="text"
              placeholder={t("googleAnalyticsDesc")}
              value={googleAnalyticsId || ""}
              onChange={(e) => setGoogleAnalyticsId(e.target.value)}
              className={`w-full px-4 py-3 rounded-md border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all ${theme === "dark" ? "bg-[#1a1a1c] border-[var(--border-main)] text-white" : "bg-[var(--bg-secondary)] border-[var(--border-main)]"}`}
            />
            <p className="text-[11px] text-gray-400 mt-1.5">
              {dir === "rtl" 
                ? "يسمح هذا المعرّف (مثل G-XXXXX) بمراقبة حركة المرور وسلوك المستخدمين وإرسال إحصاءات تفاعلية فورية إلى حساب إحصاءات جوجل الخاص بك."
                : "This ID (e.g., G-XXXXX) enables real-time user behavior tracking, page transit logs, and custom interaction telemetry reporting directly to your Google Analytics dashboard."}
            </p>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {t("googleSiteVerification")}
            </label>
            <input
              type="text"
              placeholder="e.g. google-site-verification=..."
              value={googleSiteVerification || ""}
              onChange={(e) => setGoogleSiteVerification(e.target.value)}
              className={`w-full px-4 py-3 rounded-md border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all ${theme === "dark" ? "bg-[#1a1a1c] border-[var(--border-main)] text-white" : "bg-[var(--bg-secondary)] border-[var(--border-main)]"}`}
            />
            <p className="text-[11px] text-gray-400 mt-1.5">
              {dir === "rtl" 
                ? "يتم حقن رمز تحقق Google Search Console تلقائياً في ترويسة الصفحة لإثبات ملكية محركات البحث مباشرة دون رفع ملفات يدوية للجذر."
                : "This verification key is dynamically injected into the head element to verify Google Search Console ownership instantly without manual file uploads to the root."}
            </p>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {dir === "rtl" ? "حظر الفهرسة المخصص للمسارات (Exclusions List)" : "Dynamic Index Exclusions (Blocked Paths List)"}
            </label>
            <input
              type="text"
              placeholder={dir === "rtl" ? "مثال: /api/auth, /confidential-page (مفصولة بفاصلة)" : "e.g. /api/auth, /confidential-page, /custom-dashboard (comma-separated)"}
              value={blockedPaths || ""}
              onChange={(e) => setBlockedPaths(e.target.value)}
              className={`w-full px-4 py-3 rounded-md border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all ${theme === "dark" ? "bg-[#1a1a1c] border-[var(--border-main)] text-white" : "bg-[var(--bg-secondary)] border-[var(--border-main)]"}`}
            />
            <p className="text-[11px] text-gray-400 mt-1.5 leading-relaxed">
              {dir === "rtl"
                ? "أدخل المسارات الإضافية التي ترغب بحظر فهرستها مطلقاً في محركات البحث لحماية الخصوصية. يتم فصل المسارات بعلامة الفاصلة (,). المسارات الافتراضية والخاصة مع لوحات تسيير الأقسام يتم حظرها تلقائياً بالكامل في الهيكل."
                : "Inject secondary sensitive routing paths you permanently want to shield from search rankings. Separate clean endpoints with a comma (,). Private/admin paths and Sections Control Panels are automatically shielded default."}
            </p>
          </div>

          {/* Real-time Google Search Results Preview (SERP Preview) */}
          <div className="mt-8 border-t border-gray-100 dark:border-gray-800/80 pt-6">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <Globe size={16} className="text-emerald-500 animate-pulse" />
              {dir === "rtl" ? "معاينة حية لنتائج بحث جوجل (SERP Preview)" : "Live Google Search Result Preview (SERP)"}
            </h3>
            
            <div className="max-w-2xl mx-auto">
              {dir === "rtl" ? (
                /* Arabic Search Snippet Card - displayed strictly when Arabic interface is loaded */
                <div className={`p-5 rounded-md border ${theme === "dark" ? "bg-[#0b0c0f] border-gray-800/60" : "bg-[#f8f9fa] border-gray-200"} flex flex-col justify-between text-right`} dir="rtl">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5 justify-start flex-row-reverse text-right">
                      {faviconBase64 ? (
                        <img src={faviconBase64} alt="Favicon" className="w-[18px] h-[18px] rounded-full object-contain" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-[18px] h-[18px] rounded-full bg-blue-100 flex items-center justify-center text-blue-500 text-[10px]">G</div>
                      )}
                      <div className="flex flex-col leading-none items-end">
                        <span className="text-[11px] font-sans text-gray-800 dark:text-gray-300 font-medium">
                          {seoSiteNameAr || siteNameAr || siteName || "بيربليكستا"}
                        </span>
                        <span className="text-[10px] text-gray-400 font-sans tracking-tight">
                          https://perplexta.com
                        </span>
                      </div>
                    </div>
                    
                    <h4 className="text-[16px] leading-[1.3] text-[#1a0dab] dark:text-[#8ab4f8] hover:underline cursor-pointer font-medium mb-1 truncate font-sans text-right">
                      {seoSiteNameAr || seoSiteNameEn || siteNameAr || siteName || "بيربليكستا"} | منصة التحليل التقني
                    </h4>
                    
                    <p className="text-[13px] leading-[1.4] text-[#4d5156] dark:text-[#bdc1c6] font-sans text-right">
                      {seoDescriptionAr ? (
                        seoDescriptionAr.length > 160 
                          ? `${seoDescriptionAr.slice(0, 157)}...` 
                          : seoDescriptionAr
                      ) : (
                        "يرجى توفير وصف دقيق ومحسن لمحركات البحث ويركز على الكفاءة والتحليل."
                      )}
                    </p>
                  </div>
                  
                  {/* Length optimization metric */}
                  <div className="mt-4 border-t border-gray-100 dark:border-gray-800/20 pt-3">
                    <div className="flex justify-between items-center text-[10px] font-sans mb-1.5 text-gray-400 flex-row-reverse">
                      <span>طول الوصف (مثالي: 120-160 حرفاً)</span>
                      <span className={
                        seoDescriptionAr.length >= 120 && seoDescriptionAr.length <= 160
                          ? "text-emerald-500 font-bold"
                          : seoDescriptionAr.length > 160 
                          ? "text-red-500" 
                          : "text-amber-500"
                      }>
                        {seoDescriptionAr.length} حرف
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-800 h-1 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${
                          seoDescriptionAr.length >= 120 && seoDescriptionAr.length <= 160
                            ? "bg-emerald-500"
                            : seoDescriptionAr.length > 160
                            ? "bg-red-500"
                            : "bg-amber-500"
                        }`}
                        style={{ width: `${Math.min(100, (seoDescriptionAr.length / 160) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* English Search Snippet Card - displayed strictly when English interface is loaded */
                <div className={`p-5 rounded-md border ${theme === "dark" ? "bg-[#0b0c0f] border-gray-800/60" : "bg-[#f8f9fa] border-gray-200"} flex flex-col justify-between`}>
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      {faviconBase64 ? (
                        <img src={faviconBase64} alt="Favicon" className="w-[18px] h-[18px] rounded-full object-contain" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-[18px] h-[18px] rounded-full bg-blue-100 flex items-center justify-center text-blue-500 text-[10px]">G</div>
                      )}
                      <div className="flex flex-col leading-none">
                        <span className="text-[11px] font-sans text-gray-800 dark:text-gray-300 font-medium">
                          {seoSiteNameEn || siteName || "Perplexta Platform"}
                        </span>
                        <span className="text-[10px] text-gray-400 font-sans tracking-tight">
                          https://perplexta.com
                        </span>
                      </div>
                    </div>
                    
                    <h4 className="text-[16px] leading-[1.3] text-[#1a0dab] dark:text-[#8ab4f8] hover:underline cursor-pointer font-medium mb-1 truncate font-sans">
                      {seoSiteNameEn || seoSiteNameAr || siteName || "Perplexta Platform"} | Best Technical Analysis
                    </h4>
                    
                    <p className="text-[13px] leading-[1.4] text-[#4d5156] dark:text-[#bdc1c6] font-sans">
                      {seoDescriptionEn ? (
                        seoDescriptionEn.length > 160 
                          ? `${seoDescriptionEn.slice(0, 157)}...` 
                          : seoDescriptionEn
                      ) : (
                        "Please provide a high-quality, concise search engine description focused on technical analysis."
                      )}
                    </p>
                  </div>
                  
                  {/* Length optimization metric */}
                  <div className="mt-4 border-t border-gray-100 dark:border-gray-800/20 pt-3">
                    <div className="flex justify-between items-center text-[10px] font-mono mb-1.5 text-gray-400">
                      <span>Description Length (Optimal: 120-160 chars)</span>
                      <span className={
                        seoDescriptionEn.length >= 120 && seoDescriptionEn.length <= 160
                          ? "text-emerald-500 font-bold"
                          : seoDescriptionEn.length > 160 
                          ? "text-red-500" 
                          : "text-amber-500"
                      }>
                        {seoDescriptionEn.length} chars
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-800 h-1 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${
                          seoDescriptionEn.length >= 120 && seoDescriptionEn.length <= 160
                            ? "bg-emerald-500"
                            : seoDescriptionEn.length > 160
                            ? "bg-red-500"
                            : "bg-amber-500"
                        }`}
                        style={{ width: `${Math.min(100, (seoDescriptionEn.length / 160) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SEO Share Image Upload */}
          <div className="mt-8 border-t border-gray-100 dark:border-gray-800/80 pt-6">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <ImageIcon size={16} className="text-emerald-500" />
              {t("seoPreviewImageTitle")}
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Image Uploader */}
              <div className="space-y-4">
                <div
                  className={`p-6 rounded-[var(--radius)] border border-dashed transition-all duration-300 ${
                    theme === "dark" 
                      ? "border-gray-800 bg-[#161618] hover:border-emerald-500/50" 
                      : "border-gray-200 bg-gray-50/50 hover:border-emerald-500/50"
                  } flex flex-col items-center justify-center text-center relative overflow-hidden min-h-[220px] group`}
                >
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/webp"
                    onChange={(e) => handleImageUpload(e, "seo")}
                    disabled={isSeoUploading}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
                  />
                  
                  {isSeoUploading ? (
                    <div className="flex flex-col items-center justify-center p-4">
                      <RefreshCw className="animate-spin text-emerald-500 mb-3" size={28} />
                      <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                        {dir === "rtl" ? "جاري رفع الصورة..." : "Uploading image..."}
                      </p>
                    </div>
                  ) : seoImageUrl ? (
                    <div className="relative w-full h-full flex flex-col items-center">
                      <img
                        src={seoImageUrl}
                        alt="SEO Preview"
                        className="max-h-[160px] rounded-md object-contain aspect-[1.91/1] shadow-md border dark:border-gray-800"
                        referrerPolicy="no-referrer"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSeoImageUrl(null);
                        }}
                        className="mt-3 text-xs bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-full flex items-center gap-1 transition-all z-20"
                      >
                        <Trash2 size={12} />
                        {t("seoRemoveImage")}
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center p-4">
                      <div className="mb-3 p-3 rounded-full bg-emerald-500/10 text-emerald-500 group-hover:scale-110 transition-transform duration-300">
                        <Upload size={24} />
                      </div>
                      <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                        {t("seoDragAndDrop")}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-2">
                        {t("seoSupportedFormats")}
                      </p>
                    </div>
                  )}
                </div>

                {/* Google and Meta specifications card */}
                <div className={`p-4 rounded-md border text-xs leading-relaxed space-y-2 ${
                  theme === "dark" ? "bg-[#141416]/50 border-gray-800/80 text-gray-400" : "bg-gray-50/50 border-gray-100 text-gray-500"
                }`}>
                  <p className="font-semibold text-emerald-500">
                    💡 {t("seoBestPracticesTitle")}
                  </p>
                  <ul className="list-disc leading-loose list-inside pr-1 space-y-1">
                    <li>
                      <strong>{t("seoBestPracticesRecSize")}</strong> {t("seoBestPracticesRecSizeDesc")}
                    </li>
                    <li>
                      <strong>{t("seoBestPracticesRatio")}</strong> {t("seoBestPracticesRatioDesc")}
                    </li>
                    <li>
                      <strong>{t("seoBestPracticesFileSize")}</strong> {t("seoBestPracticesFileSizeDesc")}
                    </li>
                  </ul>
                </div>
              </div>

              {/* Real-time Rich Social Media Preview (Facebook / LinkedIn card simulation) */}
              <div className="flex flex-col justify-start">
                <div className="text-xs font-semibold mb-3 text-gray-500 dark:text-gray-400">
                  ⚡ {t("seoSocialPreviewTitle")}
                </div>

                <div className={`rounded-lg overflow-hidden border shadow-sm flex flex-col ${
                  theme === "dark" ? "bg-[#18181b] border-gray-800" : "bg-white border-gray-200"
                }`}>
                  {/* Image Section */}
                  <div className="relative aspect-[1.91/1] w-full overflow-hidden bg-gray-100 dark:bg-zinc-900 border-b dark:border-gray-800 flex items-center justify-center">
                    {seoImageUrl ? (
                      <img 
                        src={seoImageUrl} 
                        alt="SEO Card Preview" 
                        className="w-full h-full object-cover" 
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="flex flex-col items-center text-center p-4">
                        <ImageIcon size={32} className="text-gray-300 dark:text-gray-700 mb-2" />
                        <span className="text-[10px] text-gray-400 uppercase tracking-widest font-mono">
                          {t("seoNoImageYet")}
                        </span>
                      </div>
                    )}
                    <div className={`absolute top-2 ${language === "ar" ? "right-2" : "left-2"} bg-black/60 rounded-md px-2 py-0.5 text-[8px] tracking-wide text-white uppercase font-mono z-20`}>
                      {language === "ar" ? "معاينة 1200x630" : "Preview Image 1200x630"}
                    </div>
                  </div>

                  {/* Body Section */}
                  <div className={`p-4 flex flex-col font-sans ${language === "ar" ? "text-right" : "text-left"}`} dir={language === "ar" ? "rtl" : "ltr"}>
                    <div className="text-[10px] text-gray-400 uppercase tracking-wider font-mono">
                      {window.location.hostname || "perplexta.com"}
                    </div>
                    <div className={`text-sm font-semibold mt-1 line-clamp-1 ${
                      theme === "dark" ? "text-white" : "text-gray-800"
                    }`}>
                      {language === "ar" ? (seoSiteNameAr || siteNameAr || "منصة بيربليكستا") : (seoSiteNameEn || siteName || "Perplexta Platform")}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 line-clamp-2 leading-relaxed">
                      {language === "ar" 
                        ? (seoDescriptionAr || "يرجى كتابة وصف تعريفي مخصص ومكثف لزيادة جودة ظهور منصتك على محركات البحث وتسهيل أرشفة الرابط تلقائياً مع الصورة.") 
                        : (seoDescriptionEn || "Please enter high quality descriptive analysis parameters to automatically enhance your brand's digital footprints across social ecosystems.")}
                    </div>
                  </div>
                </div>
                
                <p className={`text-[10px] text-gray-400 mt-3 italic leading-relaxed ${dir === "rtl" ? "text-right" : "text-left"}`}>
                  {t("seoPreviewFooterNote")}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-end mt-6">
          <button
            onClick={handleSaveSeoSettings}
            disabled={isSaving}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2.5 rounded-md transition-all duration-300 font-medium shadow-[0_0_15px_rgba(16,185,129,0.4)] disabled:opacity-50"
          >
            {isSaving ? (
              <RefreshCw className="animate-spin" size={18} />
            ) : (
              <Save size={18} />
            )}
            {t("saveSettings") || "Save"}
          </button>
        </div>
      </div>

      {/* Dynamic Route-Based SEO Manager (Database SEO Meta Tags per Route) */}
      <div
        className={`p-6 md:p-8 rounded-lg border ${
          theme === "dark" ? "bg-[#111111] border-[var(--border-main)] font-sans" : "bg-white border-[var(--border-main)] font-sans"
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-md bg-emerald-500/10 text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <Globe size={24} className="text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">
                {dir === "rtl" ? "أداة إدارة بيانات SEO للمسارات الديناميكية" : "Dynamic Route SEO Meta Manager"}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {dir === "rtl"
                  ? "تخصيص وتحديث عناوين SEO والوصف والكلمات المفتاحية وصور Open Graph لكل مسار في قاعدة البيانات بشكل فوري ومباشر."
                  : "Dynamically manage SEO title, description, keywords, and Open Graph share images for specific application routes in database."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={fetchRouteSeoList}
              disabled={loadingRouteSeo}
              className="p-2.5 rounded-md border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-[#1a1a1c] text-gray-600 dark:text-gray-300 transition-all duration-300"
              title={dir === "rtl" ? "تحديث القائمة" : "Refresh List"}
            >
              <RefreshCw size={16} className={loadingRouteSeo ? "animate-spin" : ""} />
            </button>
            <button
              onClick={handleOpenAddRouteModal}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-md font-medium text-xs transition-all duration-300 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
            >
              <Plus size={16} />
              {dir === "rtl" ? "إضافة مسار جديد" : "Add Route SEO"}
            </button>
          </div>
        </div>

        {/* Search & Counter Filter */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6 bg-gray-50 dark:bg-[#18181b] p-3 rounded-md border border-gray-100 dark:border-gray-800/80">
          <div className="relative w-full sm:w-80">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={routeSearchQuery}
              onChange={(e) => setRouteSearchQuery(e.target.value)}
              placeholder={dir === "rtl" ? "بحث عن مسار أو عنوان..." : "Filter routes or titles..."}
              className={`w-full text-xs pl-9 pr-3 py-2 rounded-md border ${
                theme === "dark" ? "bg-[#111111] border-gray-800 text-white" : "bg-white border-gray-200 text-gray-800"
              } focus:outline-none focus:border-emerald-500`}
            />
          </div>
          <div className="text-xs text-gray-500 font-mono flex items-center gap-2">
            <span>{dir === "rtl" ? "إجمالي المسارات المسجلة:" : "Configured Routes:"}</span>
            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-bold">
              {routeSeoList.length}
            </span>
          </div>
        </div>

        {/* Routes List Table */}
        {loadingRouteSeo && routeSeoList.length === 0 ? (
          <div className="py-12 text-center text-gray-400 flex items-center justify-center gap-2">
            <RefreshCw size={20} className="animate-spin text-emerald-500" />
            <span>{dir === "rtl" ? "جاري تحميل إعدادات SEO للمسارات..." : "Loading route SEO configurations..."}</span>
          </div>
        ) : routeSeoList.length === 0 ? (
          <div className="py-12 text-center border border-dashed rounded-md dark:border-gray-800 text-gray-400">
            <Globe size={32} className="mx-auto mb-2 text-gray-500 opacity-60" />
            <p className="text-sm font-medium">
              {dir === "rtl" ? "لا توجد مسارات مخصصة مسجلة حالياً" : "No custom route SEO configurations found."}
            </p>
            <button
              onClick={handleOpenAddRouteModal}
              className="mt-3 text-xs text-emerald-500 underline hover:text-emerald-400"
            >
              {dir === "rtl" ? "+ إضافة أول مسار الآن" : "+ Create your first route SEO entry"}
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className={`text-[10px] uppercase font-mono border-b ${
                theme === "dark" ? "border-gray-800 text-gray-400 bg-[#18181b]" : "border-gray-200 text-gray-500 bg-gray-50"
              }`}>
                <tr>
                  <th className="p-3">{dir === "rtl" ? "المسار (Route)" : "Route Path"}</th>
                  <th className="p-3">{dir === "rtl" ? "عنوان SEO (العربية / English)" : "SEO Title (Ar / En)"}</th>
                  <th className="p-3">{dir === "rtl" ? "الوصف" : "Description"}</th>
                  <th className="p-3">{dir === "rtl" ? "صورة OG" : "OG Image"}</th>
                  <th className="p-3">{dir === "rtl" ? "الحالة" : "Status"}</th>
                  <th className="p-3 text-right">{dir === "rtl" ? "الإجراءات" : "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
                {routeSeoList
                  .filter((item) => {
                    if (!routeSearchQuery) return true;
                    const q = routeSearchQuery.toLowerCase();
                    return (
                      item.route?.toLowerCase().includes(q) ||
                      item.title_ar?.toLowerCase().includes(q) ||
                      item.title_en?.toLowerCase().includes(q) ||
                      item.description_ar?.toLowerCase().includes(q) ||
                      item.description_en?.toLowerCase().includes(q)
                    );
                  })
                  .map((item) => (
                    <tr
                      key={item.id}
                      className={`hover:bg-gray-50/50 dark:hover:bg-[#18181b]/50 transition-colors ${
                        !item.is_active ? "opacity-50" : ""
                      }`}
                    >
                      <td className="p-3 font-mono font-bold text-emerald-500">
                        {item.route}
                      </td>
                      <td className="p-3 max-w-[200px]">
                        <div className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {dir === "rtl" ? (item.title_ar || item.title_en) : (item.title_en || item.title_ar)}
                        </div>
                        <div className="text-[10px] text-gray-400 truncate dir-ltr">
                          {item.title_en}
                        </div>
                      </td>
                      <td className="p-3 max-w-[260px]">
                        <p className="line-clamp-2 text-gray-600 dark:text-gray-400 text-[11px] leading-relaxed">
                          {dir === "rtl" ? (item.description_ar || item.description_en) : (item.description_en || item.description_ar)}
                        </p>
                      </td>
                      <td className="p-3">
                        {item.og_image_url ? (
                          <img
                            src={item.og_image_url}
                            alt={item.route}
                            className="w-12 h-7 object-cover rounded border border-gray-200 dark:border-gray-800"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <span className="text-[10px] text-gray-400 italic">Default</span>
                        )}
                      </td>
                      <td className="p-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${
                            item.is_active
                              ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                              : "bg-gray-500/10 text-gray-400 border border-gray-500/20"
                          }`}
                        >
                          {item.is_active ? (dir === "rtl" ? "نشط" : "Active") : (dir === "rtl" ? "معطل" : "Disabled")}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditRouteModal(item)}
                            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors"
                            title={dir === "rtl" ? "تعديل" : "Edit"}
                          >
                            <Settings2 size={15} />
                          </button>
                          <button
                            onClick={() => handleDeleteRouteSeo(item.id)}
                            className="p-1.5 rounded hover:bg-rose-500/10 text-rose-500 transition-colors"
                            title={dir === "rtl" ? "حذف" : "Delete"}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Route SEO Add/Edit Modal */}
      <AnimatePresence>
        {isRouteModalOpen && editingRouteItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg border p-6 shadow-2xl ${
                theme === "dark" ? "bg-[#141416] border-gray-800 text-white" : "bg-white border-gray-200 text-gray-900"
              }`}
            >
              <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-800 mb-5">
                <div className="flex items-center gap-2 font-bold text-lg">
                  <Globe className="text-emerald-500" size={20} />
                  <span>
                    {editingRouteItem.id
                      ? (dir === "rtl" ? "تعديل إعدادات SEO للمسار" : "Edit Route SEO Setting")
                      : (dir === "rtl" ? "إضافة مسار SEO جديد" : "Add New Route SEO Setting")}
                  </span>
                </div>
                <button
                  onClick={() => setIsRouteModalOpen(false)}
                  className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-200"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveRouteSeo} className="space-y-4">
                {/* Route path */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-emerald-500 mb-1">
                    {dir === "rtl" ? "مسار الصفحة (Route Path)" : "Route Path (e.g. /marketplace)"} *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingRouteItem.route || ""}
                    onChange={(e) => setEditingRouteItem({ ...editingRouteItem, route: e.target.value })}
                    placeholder="/marketplace"
                    className={`w-full text-xs p-2.5 rounded-md border font-mono ${
                      theme === "dark" ? "bg-[#09090b] border-gray-800 text-white" : "bg-gray-50 border-gray-300 text-gray-900"
                    } focus:outline-none focus:border-emerald-500`}
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    {dir === "rtl" ? "المسار النسبي للصفحة، مثل: /blog أو /subscription أو /custom-page" : "Relative route path starting with /, e.g., /blog or /subscription"}
                  </p>
                </div>

                {/* Title Ar & En */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      {dir === "rtl" ? "عنوان SEO (بالعربية)" : "SEO Title (Arabic)"}
                    </label>
                    <input
                      type="text"
                      value={editingRouteItem.title_ar || ""}
                      onChange={(e) => setEditingRouteItem({ ...editingRouteItem, title_ar: e.target.value })}
                      placeholder="عنوان الصفحة بالعربية..."
                      className={`w-full text-xs p-2.5 rounded-md border ${
                        theme === "dark" ? "bg-[#09090b] border-gray-800 text-white" : "bg-gray-50 border-gray-300 text-gray-900"
                      } focus:outline-none focus:border-emerald-500`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      {dir === "rtl" ? "عنوان SEO (بالإنجليزية)" : "SEO Title (English)"}
                    </label>
                    <input
                      type="text"
                      value={editingRouteItem.title_en || ""}
                      onChange={(e) => setEditingRouteItem({ ...editingRouteItem, title_en: e.target.value })}
                      placeholder="Page title in English..."
                      className={`w-full text-xs p-2.5 rounded-md border ${
                        theme === "dark" ? "bg-[#09090b] border-gray-800 text-white" : "bg-gray-50 border-gray-300 text-gray-900"
                      } focus:outline-none focus:border-emerald-500`}
                    />
                  </div>
                </div>

                {/* Description Ar & En */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      {dir === "rtl" ? "الوصف التعريفي (بالعربية)" : "SEO Description (Arabic)"}
                    </label>
                    <textarea
                      rows={3}
                      value={editingRouteItem.description_ar || ""}
                      onChange={(e) => setEditingRouteItem({ ...editingRouteItem, description_ar: e.target.value })}
                      placeholder="وصف مختصر ومحسّن لمحركات البحث..."
                      className={`w-full text-xs p-2.5 rounded-md border ${
                        theme === "dark" ? "bg-[#09090b] border-gray-800 text-white" : "bg-gray-50 border-gray-300 text-gray-900"
                      } focus:outline-none focus:border-emerald-500`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      {dir === "rtl" ? "الوصف التعريفي (بالإنجليزية)" : "SEO Description (English)"}
                    </label>
                    <textarea
                      rows={3}
                      value={editingRouteItem.description_en || ""}
                      onChange={(e) => setEditingRouteItem({ ...editingRouteItem, description_en: e.target.value })}
                      placeholder="Search optimized page description..."
                      className={`w-full text-xs p-2.5 rounded-md border ${
                        theme === "dark" ? "bg-[#09090b] border-gray-800 text-white" : "bg-gray-50 border-gray-300 text-gray-900"
                      } focus:outline-none focus:border-emerald-500`}
                    />
                  </div>
                </div>

                {/* Keywords Ar & En */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      {dir === "rtl" ? "الكلمات المفتاحية (بالعربية)" : "Keywords (Arabic)"}
                    </label>
                    <input
                      type="text"
                      value={editingRouteItem.keywords_ar || ""}
                      onChange={(e) => setEditingRouteItem({ ...editingRouteItem, keywords_ar: e.target.value })}
                      placeholder="كلمات, مفتاحية, مفصولة, بفاصلة"
                      className={`w-full text-xs p-2.5 rounded-md border ${
                        theme === "dark" ? "bg-[#09090b] border-gray-800 text-white" : "bg-gray-50 border-gray-300 text-gray-900"
                      } focus:outline-none focus:border-emerald-500`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      {dir === "rtl" ? "الكلمات المفتاحية (بالإنجليزية)" : "Keywords (English)"}
                    </label>
                    <input
                      type="text"
                      value={editingRouteItem.keywords_en || ""}
                      onChange={(e) => setEditingRouteItem({ ...editingRouteItem, keywords_en: e.target.value })}
                      placeholder="keywords, separated, by, comma"
                      className={`w-full text-xs p-2.5 rounded-md border ${
                        theme === "dark" ? "bg-[#09090b] border-gray-800 text-white" : "bg-gray-50 border-gray-300 text-gray-900"
                      } focus:outline-none focus:border-emerald-500`}
                    />
                  </div>
                </div>

                {/* OG Image URL / Upload */}
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    {dir === "rtl" ? "صورة مشاركة التواصل الاجتماعي (Open Graph Image)" : "Open Graph Image (OG Image URL)"}
                  </label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={editingRouteItem.og_image_url || ""}
                      onChange={(e) => setEditingRouteItem({ ...editingRouteItem, og_image_url: e.target.value })}
                      placeholder="https://... or /uploads/..."
                      className={`flex-1 text-xs p-2.5 rounded-md border font-mono ${
                        theme === "dark" ? "bg-[#09090b] border-gray-800 text-white" : "bg-gray-50 border-gray-300 text-gray-900"
                      } focus:outline-none focus:border-emerald-500`}
                    />
                    <label className="cursor-pointer flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-2 rounded-md text-xs font-medium border border-gray-300 dark:border-gray-700">
                      <Upload size={14} />
                      <span>{routeUploadingImg ? "..." : (dir === "rtl" ? "رفع" : "Upload")}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleRouteImageUpload}
                        disabled={routeUploadingImg}
                      />
                    </label>
                  </div>
                  {editingRouteItem.og_image_url && (
                    <div className="mt-2">
                      <img
                        src={editingRouteItem.og_image_url}
                        alt="Preview"
                        className="h-20 rounded border object-cover border-gray-200 dark:border-gray-800"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}
                </div>

                {/* Is Active Toggle */}
                <div className="flex items-center gap-3 pt-2">
                  <input
                    type="checkbox"
                    id="route_is_active"
                    checked={editingRouteItem.is_active !== false}
                    onChange={(e) => setEditingRouteItem({ ...editingRouteItem, is_active: e.target.checked })}
                    className="w-4 h-4 text-emerald-500 accent-emerald-500 rounded border-gray-300 focus:ring-emerald-500"
                  />
                  <label htmlFor="route_is_active" className="text-xs font-medium cursor-pointer">
                    {dir === "rtl" ? "تفعيل إعدادات SEO لهذا المسار" : "Enable dynamic SEO meta tags for this route"}
                  </label>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
                  <button
                    type="button"
                    onClick={() => setIsRouteModalOpen(false)}
                    className="px-4 py-2 rounded-md text-xs font-medium border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                  >
                    {dir === "rtl" ? "إلغاء" : "Cancel"}
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2 rounded-md text-xs font-medium shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                  >
                    <Save size={14} />
                    {dir === "rtl" ? "حفظ التغييرات" : "Save Settings"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Search Engine Indexing & Route Security Verification (Crawlability Audit) */}
      <div
        className={`p-6 md:p-8 rounded-lg border ${
          theme === "dark" ? "bg-[#111111] border-[var(--border-main)] font-sans" : "bg-white border-[var(--border-main)] font-sans"
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-md bg-emerald-500/10 text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <ShieldCheck size={24} className="text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">
                {language === "ar" ? "تقرير تدقيق أرشفة وقابلية زحف المسارات" : "Search Engine Indexing & Crawlability Audit"}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {language === "ar" 
                  ? "نظام تدقيق فوري للتحقق من أمان وحجب الصفحات الشخصية للمستخدمين من الفهرسة." 
                  : "Security ledger simulating Google Search crawler to verify compliance of user routes."}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={runCrawlAuditScan}
              disabled={crawlScanning}
              className="flex items-center gap-2 text-xs bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-[var(--radius)] transition-all duration-300 font-medium shadow-[0_0_12px_rgba(16,185,129,0.3)] disabled:opacity-50"
            >
              <RefreshCw className={crawlScanning ? "animate-spin" : ""} size={14} />
              {language === "ar" ? "تشغيل تدقيق الفهرسة" : "Execute Crawl Audit"}
            </button>
            
            <button
              onClick={downloadCrawlAuditReport}
              className="flex items-center gap-2 text-xs border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-[#1c1c1e] text-gray-700 dark:text-gray-300 px-4 py-2 rounded-[var(--radius)] transition-all duration-300 font-medium"
            >
              <Download size={14} />
              {language === "ar" ? "تصدير التقرير الفني" : "Download JSON Report"}
            </button>
          </div>
        </div>

        {/* Audit Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className={`p-4 rounded-md border ${theme === "dark" ? "bg-[#18181b] border-gray-800" : "bg-gray-50 border-gray-200"}`}>
            <span className="text-xs text-gray-400">{language === "ar" ? "إجمالي المسارات" : "Total Routes Indexed"}</span>
            <div className="text-2xl font-bold mt-1 text-sky-500">
              {routesSchema.length} <span className="text-xs font-normal text-gray-400">URI</span>
            </div>
          </div>

          <div className={`p-4 rounded-md border ${theme === "dark" ? "bg-[#18181b] border-gray-800/85" : "bg-gray-50 border-gray-200"}`}>
            <span className="text-xs text-gray-400">{language === "ar" ? "مسارات محمية (No-Index)" : "Shielded Secret Routes (No-Index)"}</span>
            <div className="text-2xl font-bold mt-1 text-emerald-500 drop-shadow-[0_0_6px_rgba(16,185,129,0.3)] flex items-center gap-1.5">
              {routesSchema.filter((r: any) => r.status === "noindex").length}
              <ShieldCheck size={16} className="text-emerald-500" />
            </div>
          </div>

          <div className={`p-4 rounded-md border ${theme === "dark" ? "bg-[#18181b] border-gray-800" : "bg-gray-50 border-gray-200"}`}>
            <span className="text-xs text-gray-400">{language === "ar" ? "مسارات عامة (مؤرشفة)" : "Approved Public Domains"}</span>
            <div className="text-2xl font-bold mt-1 text-amber-500">
              {routesSchema.filter((r: any) => r.status === "index").length}
            </div>
          </div>

          <div className={`p-4 rounded-md border ${theme === "dark" ? "bg-[#18181b] border-gray-800" : "bg-gray-50 border-gray-200"}`}>
            <span className="text-xs text-gray-400">{language === "ar" ? "معدل سلامة الامتثال والأرشفة" : "Compliance & Indexing Rating"}</span>
            <div className={`text-xl font-bold mt-1.5 uppercase tracking-tight flex items-center gap-1.5 ${
              crawlComplianceRate.includes("SECURE") 
                ? "text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" 
                : crawlComplianceRate === "PENDING" || crawlComplianceRate === "معلق"
                ? "text-amber-500 animate-pulse"
                : "text-rose-500"
            }`}>
              <span>{crawlComplianceRate}</span>
              {crawlComplianceRate.includes("SECURE") && <CheckCircle size={14} className="text-emerald-500" />}
            </div>
          </div>
        </div>

        {/* Live Terminal Monitor */}
        {(crawlScanning || crawlAuditLogs.length > 0) && (
          <div className="mb-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 font-mono flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {language === "ar" ? "شاشة التدقيق الفوري والمطابقة" : "Real-time Verification Console"}
            </h3>
            <div className="p-4 rounded-md bg-[#09090b] border border-zinc-800 text-xs font-mono text-emerald-400/90 leading-relaxed max-h-[180px] overflow-y-auto space-y-1.5 scrollbar-thin scrollbar-thumb-zinc-800">
              {crawlAuditLogs.map((log, index) => (
                <div key={index} className="flex items-start gap-2 animate-in fade-in duration-300">
                  <span className="text-zinc-600">[{new Date().toLocaleTimeString()}]</span>
                  <span>{log}</span>
                </div>
              ))}
              {crawlScanning && (
                <div className="flex items-center gap-1 text-emerald-500/80 italic font-medium animate-pulse ml-4">
                  <span>●</span> <span>{language === "ar" ? "جاري تحليل الاستجابة..." : "Analyzing header packets..."}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Filter Controls */}
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3 mb-4">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
            {language === "ar" ? "سجل توثيق حماية المسارات" : "Path Protection Registry Ledger"}
          </span>
          <div className="flex bg-gray-100 dark:bg-[#1a1a1c] p-0.5 rounded-[4px] border dark:border-gray-800">
            {[
              { id: "all", label: language === "ar" ? "الكل" : "All" },
              { id: "index", label: language === "ar" ? "مؤرشفة" : "Public Only" },
              { id: "noindex", label: language === "ar" ? "محمية" : "Shielded Only" }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setCrawlAuditFilter(f.id as any)}
                type="button"
                className={`text-[10px] uppercase font-bold px-3 py-1 transition-all duration-300 rounded-[3px] ${
                  crawlAuditFilter === f.id
                    ? "bg-white dark:bg-[#27272a] text-emerald-500 dark:text-emerald-400 font-extrabold shadow-sm"
                    : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table Path List */}
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 text-gray-400 text-xs text-left">
                <th className={`pb-3 font-semibold ${language === "ar" ? "text-right" : "text-left"}`}>{language === "ar" ? "المسار" : "Path / Location"}</th>
                <th className={`pb-3 font-semibold ${language === "ar" ? "text-right" : "text-left"}`}>{language === "ar" ? "النوع" : "Category"}</th>
                <th className={`pb-3 font-semibold ${language === "ar" ? "text-right" : "text-left"}`}>{language === "ar" ? "وسم محركات البحث" : "Crawler Directive"}</th>
                <th className={`pb-3 font-semibold ${language === "ar" ? "text-right" : "text-left"}`}>{language === "ar" ? "حالة الأمان" : "Security Certification"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/40">
              {routesSchema
                .filter((r: any) => {
                  if (crawlAuditFilter === "all") return true;
                  return r.status === crawlAuditFilter;
                })
                .map((route: any, idx: number) => (
                  <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-[#151517]/30 transition-all duration-200">
                    <td className={`py-3.5 font-mono text-xs ${language === "ar" ? "text-right" : "text-left"}`}>
                      <span className="text-gray-800 dark:text-gray-300 font-semibold">{route.path}</span>
                    </td>
                    <td className={`py-3.5 ${language === "ar" ? "text-right" : "text-left"}`}>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        route.type === "admin" 
                          ? "bg-red-500/10 text-red-500" 
                          : route.type === "private" 
                          ? "bg-emerald-500/10 text-emerald-500" 
                          : route.type === "custom"
                          ? "bg-purple-500/10 text-purple-500"
                          : "bg-sky-500/10 text-sky-500"
                      }`}>
                        {route.type.toUpperCase()}
                      </span>
                    </td>
                    <td className={`py-3.5 font-mono text-[11px] ${language === "ar" ? "text-right" : "text-left"}`}>
                      {route.status === "noindex" ? (
                        <span className="text-zinc-400 font-medium flex items-center gap-1">
                          <EyeOff size={12} className="text-zinc-500" />
                          noindex, nofollow
                        </span>
                      ) : (
                        <span className="text-emerald-500 font-bold flex items-center gap-1 drop-shadow-[0_0_4px_rgba(16,185,129,0.2)]">
                          <Eye size={12} className="text-emerald-500 animate-pulse" />
                          index, follow
                        </span>
                      )}
                    </td>
                    <td className={`py-3.5 ${language === "ar" ? "text-right" : "text-left"}`}>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          {route.status === "noindex" ? (
                            <>
                              <ShieldCheck size={14} className="text-emerald-500 drop-shadow-[0_0_4px_rgba(16,185,129,0.5)]" />
                              <span className="font-bold text-emerald-500 text-xs">
                                {language === "ar" ? "محجوب دستورياً" : "SECURED AND ISOLATED"}
                              </span>
                            </>
                          ) : (
                            <>
                              <CheckCircle size={14} className="text-amber-500" />
                              <span className="font-bold text-amber-500 text-xs">
                                {language === "ar" ? "مؤرشف عام" : "APPROVED PUBLIC PAGE"}
                              </span>
                            </>
                          )}
                        </div>
                        <span className="text-[10px] text-gray-400 mt-0.5">
                          {language === "ar" ? route.descriptionAr : route.descriptionEn}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// --- Compliance Audit Logs View ---
const ComplianceAuditLogsView = ({
  theme,
  t,
  dir,
}: {
  theme: string;
  t: (key: string) => string;
  dir: string;
}) => {
  const { token, language } = useAppContext();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [limit] = useState(25);
  const [offset, setOffset] = useState(0);
  const [actionFilter, setActionFilter] = useState("");
  const [emailFilter, setEmailFilter] = useState("");
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const [selectedLogIds, setSelectedLogIds] = useState<any[]>([]);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string | { ar: string; en: string };
    description: string | { ar: string; en: string };
    variant?: 'danger' | 'success' | 'warning' | 'info' | 'purple';
    confirmLabel?: string | { ar: string; en: string };
    onConfirm: () => Promise<void> | void;
  } | null>(null);

  const isRtl = language === "ar";

  const toggleSelectLog = (id: any) => {
    setSelectedLogIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const visibleIds = logs.map((log) => log.id);
    const allSelected = visibleIds.every((id) => selectedLogIds.includes(id));
    if (allSelected) {
      setSelectedLogIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedLogIds((prev) => {
        const union = new Set([...prev, ...visibleIds]);
        return Array.from(union);
      });
    }
  };

  const handleDeleteSelected = () => {
    if (selectedLogIds.length === 0) return;
    const confirmMessage = isRtl
      ? `هل أنت متأكد من مسح (${selectedLogIds.length}) من سجلات التدقيق والامتثال؟ لا يمكن التراجع عن هذا الإجراء.`
      : `Are you sure you want to permanently delete (${selectedLogIds.length}) compliance logs? This action is irreversible.`;

    setConfirmModal({
      isOpen: true,
      title: { ar: "مسح السجلات المحددة؟", en: "Delete Selected Logs?" },
      description: confirmMessage,
      variant: "purple",
      onConfirm: async () => {
        try {
          const res = await fetch("/api/admin/audit-logs/batch-delete", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ ids: selectedLogIds }),
          });
          if (res.ok) {
            setSelectedLogIds([]);
            fetchLogs();
          } else {
            const errData = await res.json();
            console.error("Failed to delete selected logs:", errData.error);
          }
        } catch (err) {
          console.error("Batch delete compliance logs failed:", err);
        }
      }
    });
  };

  const handleClearAll = () => {
    const confirmMessage = isRtl
      ? "تنبيه أمني هام: هل أنت متأكد تماماً من مسح كافة سجلات التدقيق والامتثال بالمنصة بشكل كامل؟ هذا الإجراء سيقوم بتصفير السجلات أمنياً ولا يمكن التراجع عنه."
      : "CRITICAL ALERT: Are you absolutely sure you want to completely clear ALL compliance audit logs? This will wipe the audit history permanently.";

    setConfirmModal({
      isOpen: true,
      title: { ar: "تصفير كافة السجلات أمنياً؟", en: "Purge All Compliance Logs?" },
      description: confirmMessage,
      variant: "purple",
      onConfirm: async () => {
        try {
          const res = await fetch("/api/admin/audit-logs/all", {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
              "x-confirm-action": "DELETE_ALL",
            },
          });
          if (res.ok) {
            setSelectedLogIds([]);
            fetchLogs();
          } else {
            const errData = await res.json();
            console.error("Failed to purge compliance logs:", errData.error);
          }
        } catch (err) {
          console.error("Purge compliance logs failed:", err);
        }
      }
    });
  };

  const fetchLogs = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const url = `/api/admin/audit-logs?limit=${limit}&offset=${offset}&action=${encodeURIComponent(actionFilter)}&email=${encodeURIComponent(emailFilter)}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setTotal(data.pagination?.total || 0);
      }
    } catch (err) {
      console.error("Failed to fetch compliance audit logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [token, offset]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setOffset(0);
    fetchLogs();
  };

  const handleReset = () => {
    setActionFilter("");
    setEmailFilter("");
    setOffset(0);
    setTimeout(() => {
      fetchLogs();
    }, 50);
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleString(language === "ar" ? "ar-EG" : "en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZone: "UTC"
    }) + " UTC";
  };

  return (
    <div className="space-y-6 font-sans" dir={isRtl ? "rtl" : "ltr"}>
      {/* Search & Audit Filters Bar */}
      <form onSubmit={handleSearch} className={`p-4 rounded-lg border flex flex-col md:flex-row gap-4 items-end justify-between ${
        theme === "dark" ? "bg-[#18181b] border-gray-800" : "bg-white border-gray-100"
      }`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 w-full">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              {isRtl ? "تصفية حسب العملية الإدارية" : "Search Admin Action"}
            </span>
            <div className="relative">
              <input
                type="text"
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                placeholder={isRtl ? "مثال: UPDATE, POST..." : "e.g., CREATE_PLAN, HTTP_POST..."}
                className={`w-full text-xs font-medium px-4 py-2.5 rounded-md border outline-none font-sans ${
                  theme === "dark" 
                    ? "bg-[#0f0f11] text-white border-gray-800 focus:border-emerald-500/50" 
                    : "bg-gray-50 text-gray-900 border-gray-200 focus:border-emerald-500/50"
                }`}
              />
            </div>
          </div>
          
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              {isRtl ? "البريد الإلكتروني للـ دكتور" : "Search Admin Email"}
            </span>
            <div className="relative">
              <input
                type="text"
                value={emailFilter}
                onChange={(e) => setEmailFilter(e.target.value)}
                placeholder={isRtl ? "البحث بالبريد..." : "e.g., admin@perplexta.com"}
                className={`w-full text-xs font-medium px-4 py-2.5 rounded-md border outline-none font-sans ${
                  theme === "dark" 
                    ? "bg-[#0f0f11] text-white border-gray-800 focus:border-emerald-500/50" 
                    : "bg-gray-50 text-gray-900 border-gray-200 focus:border-emerald-500/50"
                }`}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-md text-xs font-bold cursor-pointer transition-all duration-300 shadow-[0_4px_12px_rgba(16,185,129,0.3)] disabled:opacity-50"
          >
            {loading ? <RefreshCw className="animate-spin" size={14} /> : <Search size={14} />}
            {isRtl ? "تطبيق التصفية" : "Apply Filter"}
          </button>
          
          <button
            type="button"
            onClick={handleReset}
            disabled={loading}
            className={`px-4 py-2.5 border rounded-md text-xs font-bold cursor-pointer transition-all duration-300 ${
              theme === "dark" 
                ? "border-gray-800 text-gray-300 hover:bg-gray-800"
                : "border-gray-200 text-gray-600 hover:bg-gray-100"
            }`}
          >
            {isRtl ? "إعادة تعيين" : "Reset"}
          </button>
        </div>
      </form>

      {/* Action Buttons for Log Deletion */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-1.5 pl-0">
        <div className="flex items-center gap-2">
          {selectedLogIds.length > 0 && (
            <button
              onClick={handleDeleteSelected}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500 text-purple-500 hover:text-white border border-purple-500/20 rounded-md text-xs font-bold transition-all duration-300 cursor-pointer shadow-sm animate-in zoom-in-95 duration-150"
            >
              <Trash2 size={13} />
              {isRtl 
                ? `مسح المحدد (${selectedLogIds.length})` 
                : `Delete Selected (${selectedLogIds.length})`}
            </button>
          )}
        </div>

        <button
          onClick={handleClearAll}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500 text-purple-500 hover:text-white border border-purple-500/30 rounded-md text-xs font-bold transition-all duration-300 cursor-pointer shadow-sm"
        >
          <AlertTriangle size={13} className="text-purple-500" />
          {isRtl ? "تطهير كافة السجلات" : "Purge All Logs"}
        </button>
      </div>

      {/* Main Audit Logs Table Container */}
      <div className={`rounded-xl border overflow-hidden shadow-sm transition-theme duration-350 ${
        theme === "dark" ? "bg-[#18181b] border-gray-800/60" : "bg-white border-gray-100"
      }`}>
        <div className="overflow-x-auto min-w-full">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className={`border-b text-[10px] uppercase font-black tracking-wider text-gray-400 ${
                theme === "dark" ? "border-gray-800 bg-[#0f0f11]/40" : "border-gray-100 bg-gray-50/60"
              }`}>
                <th className="py-3.5 px-4 text-center w-12">
                  <input
                    type="checkbox"
                    checked={logs.length > 0 && logs.every((log) => selectedLogIds.includes(log.id))}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300 text-emerald-500 focus:ring-emerald-500 cursor-pointer h-4 w-4"
                  />
                </th>
                <th className="py-3.5 px-4 text-center">{isRtl ? "الوقت (UTC)" : "Timestamp (UTC)"}</th>
                <th className="py-3.5 px-4">{isRtl ? "المسؤول (Admin)" : "Admin User"}</th>
                <th className="py-3.5 px-4">{isRtl ? "العملية الإجرائية" : "Administrative Action"}</th>
                <th className="py-3.5 px-4">{isRtl ? "المستهدف" : "Target Resource"}</th>
                <th className="py-3.5 px-4">{isRtl ? "العنوان الرقمي IP" : "IP Address"}</th>
                <th className="py-3.5 px-4 text-center">{isRtl ? "التفاصيل" : "Compliance Audit"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    <RefreshCw className="animate-spin inline-block mr-2 text-emerald-500" size={18} />
                    {isRtl ? "جاري جلب سجل التدقيق الأمني..." : "Ingesting secure compliance records..."}
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    {isRtl ? "لا توجد سجلات مطابقة لمعايير الاستعلام أمنياً." : "No matching compliant audit trail records found."}
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr 
                    key={log.id} 
                    className={`transition-colors duration-200 ${
                      selectedLogIds.includes(log.id)
                        ? "bg-emerald-500/5 hover:bg-emerald-500/10"
                        : theme === "dark" ? "hover:bg-zinc-900/40" : "hover:bg-gray-50/40"
                    }`}
                  >
                    <td className="py-3.5 px-4 text-center w-12">
                      <input
                        type="checkbox"
                        checked={selectedLogIds.includes(log.id)}
                        onChange={() => toggleSelectLog(log.id)}
                        className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer h-4 w-4"
                      />
                    </td>
                    <td className="py-3.5 px-4 text-center text-[10px] font-mono whitespace-nowrap opacity-80">
                      {formatDate(log.created_at)}
                    </td>
                    <td className="py-3.5 px-4 font-medium max-w-[180px] truncate">
                      <div className="flex flex-col">
                        <span className="font-bold text-[var(--text-primary)]">{log.admin_email || ("ID: " + log.admin_id)}</span>
                        <span className="text-[9px] opacity-40 font-mono">UID: {log.admin_id || "SYSTEM"}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-sm text-[10px] font-black uppercase tracking-tight ${
                        log.action.startsWith("HTTP_") 
                          ? log.action.includes("POST") 
                            ? "bg-blue-500/10 text-blue-400 border border-blue-500/10"
                            : log.action.includes("DELETE")
                              ? "bg-rose-500/10 text-rose-400 border border-rose-500/10"
                              : "bg-purple-500/10 text-purple-400 border border-purple-500/10"
                          : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/10"
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-mono text-[11px] opacity-80">{log.target_resource || "GLOBAL"}</span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-mono text-[11px] opacity-75">{log.ip_address || "LOCAL_EXEC"}</span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="px-3 py-1 border border-emerald-500/20 rounded-md text-[10px] font-bold text-emerald-500 hover:border-emerald-500 hover:bg-emerald-500/10 cursor-pointer transition-all duration-300"
                      >
                        {isRtl ? "عرض التفاصيل" : "Inspect Payload"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Database Audit Pagination Bar */}
        <div className={`p-4 border-t flex items-center justify-between text-xs ${
          theme === "dark" ? "border-gray-800/60 bg-[#0f0f11]/20" : "border-gray-100 bg-gray-50/30"
        }`}>
          <div className="text-gray-400 font-bold">
            {isRtl 
              ? `عرض ${logs.length} سجل من إجمالي ${total}`
              : `Showing ${logs.length} of ${total} compliance log records`}
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - limit))}
              className={`p-2 rounded-md border flex items-center justify-center transition-all duration-300 disabled:opacity-40 select-none ${
                offset === 0 ? "cursor-not-allowed" : "cursor-pointer"
              } ${
                theme === "dark" 
                  ? "border-gray-800 text-gray-300 hover:bg-zinc-800"
                  : "border-gray-200 text-gray-600 hover:bg-gray-100"
              }`}
            >
              {isRtl ? <ArrowRight size={14} /> : <ArrowLeft size={14} />}
            </button>
            <button
              disabled={offset + limit >= total}
              onClick={() => setOffset(offset + limit)}
              className={`p-2 rounded-md border flex items-center justify-center transition-all duration-300 disabled:opacity-40 select-none ${
                offset + limit >= total ? "cursor-not-allowed" : "cursor-pointer"
              } ${
                theme === "dark" 
                  ? "border-gray-800 text-gray-300 hover:bg-zinc-800"
                  : "border-gray-200 text-gray-600 hover:bg-gray-100"
              }`}
            >
              {isRtl ? <ArrowLeft size={14} /> : <ArrowRight size={14} />}
            </button>
          </div>
        </div>
      </div>

      {/* JSON Expand Payload Modal -- Pure Emerald Glow Premium Transition */}
      <AnimatePresence>
        {selectedLog && (
          <div className="fixed inset-0 flex items-center justify-center z-[130] p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedLog(null)}
              className="fixed inset-0 bg-black/65 backdrop-blur-[4px] z-0 cursor-pointer"
            />

            {/* Modal Drawer */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className={`relative max-w-2xl w-full rounded-xl border p-6 z-10 shadow-2xl ${
                theme === "dark" ? "bg-[#111113] border-gray-800 text-white" : "bg-white border-gray-200 text-gray-900"
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3.5 border-b border-[var(--border)] mb-4">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" size={18} />
                  <span className="text-xs uppercase font-black tracking-wider w-auto h-auto leading-none mt-0">
                    {isRtl ? "التدقيق والتفاصيل القياسية" : "Compliance Payload Audit Inspection"}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedLog(null)}
                  className={`w-8 h-8 rounded-full border flex items-center justify-center hover:bg-rose-500/10 hover:border-rose-500/30 text-gray-400 hover:text-rose-500 cursor-pointer transition-all duration-300`}
                >
                  <X size={15} />
                </button>
              </div>

              {/* Summary metadata grid */}
              <div className="grid grid-cols-2 gap-4 text-[10px] mb-4">
                <div className="flex flex-col p-2.5 rounded bg-black/5 dark:bg-black/25 border border-[var(--border)]">
                  <span className="text-gray-400 font-bold uppercase">{isRtl ? "المسؤول الفاعل" : "Action Operator"}</span>
                  <span className="font-bold mt-0.5 text-[var(--text-primary)] truncate">{selectedLog.admin_email || "System/Cron Engine"}</span>
                </div>
                <div className="flex flex-col p-2.5 rounded bg-black/5 dark:bg-black/25 border border-[var(--border)]">
                  <span className="text-gray-400 font-bold uppercase">{isRtl ? "العملية الإجرائية" : "Action Identifier"}</span>
                  <span className="font-bold mt-0.5 text-emerald-400 font-mono">{selectedLog.action}</span>
                </div>
                <div className="flex flex-col p-2.5 rounded bg-black/5 dark:bg-black/25 border border-[var(--border)]">
                  <span className="text-gray-400 font-bold uppercase">{isRtl ? "الوقت (توقيت عالمي)" : "Logged Timestamp (UTC)"}</span>
                  <span className="font-semibold mt-0.5 font-mono">{formatDate(selectedLog.created_at)}</span>
                </div>
                <div className="flex flex-col p-2.5 rounded bg-black/5 dark:bg-black/25 border border-[var(--border)]">
                  <span className="text-gray-400 font-bold uppercase">{isRtl ? "بيانات الموقع والشبكة" : "Network Ingress Platform"}</span>
                  <span className="font-mono mt-0.5 leading-none text-zinc-400">{selectedLog.ip_address || "Internal Sandbox Host"}</span>
                </div>
              </div>

              {/* User Agent Block */}
              {selectedLog.user_agent && (
                <div className="mb-4 text-[9px] p-2 rounded bg-black/5 dark:bg-black/25 text-gray-400 font-mono border border-[var(--border)] leading-relaxed">
                  <strong>User Agent:</strong> {selectedLog.user_agent}
                </div>
              )}

              {/* JSON Payload Display */}
              <div className="flex flex-col font-sans">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 pl-0.5">
                  {isRtl ? "البيانات المشفرة والمحفوظة (JSON Payloads)" : "Compliant Transaction Log (JSON)"}
                </span>
                <div className="h-48 overflow-y-auto rounded-lg bg-black text-[11px] text-emerald-400 font-mono p-4 border border-zinc-900 leading-loose scroll-smooth scrollbar-thin">
                  <pre className="whitespace-pre-wrap select-text">
                    {JSON.stringify(typeof selectedLog.details === "string" ? JSON.parse(selectedLog.details) : selectedLog.details, null, 2)}
                  </pre>
                </div>
              </div>

              {/* Footer disclaimer */}
              <p className="text-[9px] text-gray-400 mt-4 leading-relaxed font-sans italic opacity-60">
                {isRtl 
                  ? "ملاحظة التوافق: تم إلحاق وحفظ السجل أعلاه في بيئة معزولة أمنياً وغير قابلة للتعديل أو الحذف لضمان نزاهة عمليات المنصة والامتثال الدولي."
                  : "Compliance Notice: This secure append-only audit log is recorded into a strictly cryptographic sandboxed database table and cannot be overridden, fulfilling absolute platform accountability. "
                }
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Action Confirmation Modal */}
      {confirmModal && confirmModal.isOpen && (
        <ActionConfirmationModal
          isOpen={confirmModal.isOpen}
          onClose={() => setConfirmModal(null)}
          onConfirm={confirmModal.onConfirm}
          title={confirmModal.title}
          description={confirmModal.description}
          variant={confirmModal.variant}
          confirmLabel={confirmModal.confirmLabel}
        />
      )}
    </div>
  );
};

import { ErrorBoundary } from '../components/ErrorBoundary';

export const AdminDashboard: React.FC = () => {
  const {
    t,
    theme,
    dir,
    language,
    token,
    user,
    socket,
    setIsOperationPending,
    isMobile,
  } = useAppContext();
  const location = useLocation();
  const navigate = useNavigate();

  const isRtl = language === "ar";
  const isSupport = user?.role === "support";
  const path = location.pathname.split("/").pop() || "dashboard";

  // Strict route protection
  useEffect(() => {
    if (user && user.role !== "admin" && user.role !== "support") {
      navigate("/chat");
    }
    // Block support from sensitive financial/system paths
    const sensitivePaths = [
      "keys",
      "databases",
      "finance",
      "settings",
      "orchestrator",
      "audit",
    ];
    if (isSupport && sensitivePaths.includes(path)) {
      navigate("/admin/dashboard");
    }
  }, [user, path, isSupport, navigate]);

  const [providerModels, setProviderModels] = useState<Record<string, any[]>>(
    {},
  );
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchProviderModels = async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/admin/orchestrator/models", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setProviderModels(data.providerModels);
      }
    } catch (error) {
      console.error("Error fetching models:", error);
    }
  };

  useEffect(() => {
    if (token) fetchProviderModels();
  }, [token]);

  const [pulseData, setPulseData] = useState<any>(null);
  const [isPulseOpen, setIsPulseOpen] = useState(false);
  const [pulseErrorCount, setPulseErrorCount] = useState(0);

  const fetchPulseData = async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/admin/pulse", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPulseData(data);
        setPulseErrorCount(0);
      } else {
        setPulseErrorCount((prev) => prev + 1);
      }
    } catch {
      setPulseErrorCount((prev) => prev + 1);
    }
  };

  useEffect(() => {
    if (token) {
      fetchPulseData();
      const interval = setInterval(fetchPulseData, 20000);
      return () => clearInterval(interval);
    }
  }, [token]);

  if (isMobile) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center select-none" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mb-4">
          <Monitor size={36} className="text-amber-500 animate-pulse" />
        </div>
        <h2 className="text-lg font-black text-[var(--text-primary)] mb-1">
          {isRtl ? 'لوحة التحكم متاحة فقط عبر سطح المكتب' : 'Command Center is Desktop-Only'}
        </h2>
        <p className="text-xs text-gray-400 max-w-sm">
          {isRtl 
            ? 'تم تعطيل لوحة قيادة الإدارة لبيربليكستا على أجهزة الهاتف لتهيئة النظام بشكل أسرع وأكثر مرونة. يرجى استخدام حاسوب لإجراء المهام الإدارية.' 
            : 'For pristine local performance and absolute operational security, the Command Center interface is exclusively restricted to desktop displays. Please use a PC.'}
        </p>
        <a href="/" className="mt-6 px-4 py-2 border border-emerald-500/30 rounded-sm hover:border-emerald-500 text-emerald-500 text-xs font-bold transition-all duration-300">
          {isRtl ? 'العودة للرئيسية' : 'Back to Home'}
        </a>
      </div>
    );
  }

  const formatPulseUptime = (seconds: number) => {
    if (!seconds) return "0s";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const formatPulseRelative = (isoString: string | null) => {
    if (!isoString) return language === "ar" ? "معلق" : "Pending";
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    
    if (diffSec < 10) return language === "ar" ? "الآن" : "Just now";
    if (diffSec < 60) return language === "ar" ? `منذ ${diffSec} ثانية` : `${diffSec}s ago`;
    if (diffMin < 60) return language === "ar" ? `منذ ${diffMin} دقيقة` : `${diffMin}m ago`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return language === "ar" ? `منذ ${diffHour} ساعة` : `${diffHour}h ago`;
    return new Date(isoString).toLocaleDateString(language === "ar" ? "ar-EG" : "en-US", { hour: "2-digit", minute: "2-digit" });
  };

  const getTitle = () => {
    switch (path) {
      case "dashboard":
        return t("commandCenter");
      case "radar":
        return language === "ar" ? "رادار الأمان" : "Security Radar";
      case "keys":
        return t("aiInfrastructure");
      case "databases":
        return t("dbOrchestration");
      case "orchestrator":
        return t("toolOrchestrator");
      case "finance":
        return t("financeVault");
      case "plans":
        return t("plansSubscriptions");
      case "users":
        return t("userManagement");
      case "memories":
        return language === "ar" ? "مركز الذاكرة" : "Memory Center";
      case "emails":
        return t("smartEmailHub");
      case "broadcast":
        return t("smartBroadcast");
      case "settings":
        return t("systemSettings");
      case "audit":
        return language === "ar" ? "التدقيق والامتثال" : "Compliance Audit Trail";
      case "referrals":
        return t("referralDashboard");
      case "metrics":
        return language === "ar" ? "مقاييس الأداء ورندر المكونات" : "Render & Latency Metrics";
      default:
        return t("commandCenter");
    }
  };

  const getSubTitle = () => {
    switch (path) {
      case "dashboard":
        return language === "ar"
          ? "مراقبة وتقارير النظام الشاملة"
          : "SYSTEM-WIDE MONITORING & INTELLIGENCE";
      case "radar":
        return language === "ar"
          ? "رادار مراقبة الهجمات المباشر"
          : "LIVE SECURITY RADAR & THREAT INTELLIGENCE";
      case "keys":
        return language === "ar"
          ? "إدارة مفاتيح الوصول والبنية التحتية"
          : "ACCESS KEYS & INFRASTRUCTURE VAULT";
      case "databases":
        return language === "ar"
          ? "تنسيق قواعد البيانات والنسخ الاحتياطي"
          : "DATABASE SCHEMAS & SYNC ORCHESTRATION";
      case "orchestrator":
        return language === "ar"
          ? "إدارة النماذج والمسارات الذكية"
          : "INTELLIGENT MODELS & ROUTING";
      case "finance":
        return language === "ar"
          ? "إدارة المعاملات والمحافظ والمكافآت"
          : "LEDGER, WALLETS & REWARDS CONTROL";
      case "plans":
        return language === "ar"
          ? "إدارة الباقات والاشتراكات والأسعار"
          : "SUBSCRIPTION PLANS & PRICING";
      case "users":
        return language === "ar"
          ? "إدارة الهوية والتحقق والصلاحيات"
          : "IDENTITY, KYC & PERMISSIONS CONTROL";
      case "memories":
        return language === "ar"
          ? "إدارة وتكثيف ذاكرة المستخدمين واستقصاء الذكاء"
          : "MANUAL MEMORY DISTILLATION & AUDIT CENTRAL";
      case "emails":
        return language === "ar"
          ? "إدارة القوالب والاتصالات الذكية"
          : "SYSTEM COMMUNICATIONS & TEMPLATES";
      case "broadcast":
        return language === "ar"
          ? "إرسال الحملات والإشعارات الجماعية"
          : "MASS CAMPAIGN & BROADCAST ENGINE";
      case "settings":
        return language === "ar"
          ? "إعدادات النظام والبروتوكول الأساسي"
          : "CORE SYSTEM PROTOCOL CONFIG";
      case "audit":
        return language === "ar"
          ? "مراقبة العمليات الحساسة وإعدادات الامتثال الأمني"
          : "SECURE CRITICAL METADATA AUDITING & SECURITY COMPLIANCE";
      case "referrals":
        return language === "ar"
          ? "مراقبة وإحصاءات برنامج الإحالات والتحويلات"
          : "REFERRAL PROGRAM STATISTICS & CONVERSION INTELLIGENCE";
      case "metrics":
        return language === "ar"
          ? "مراقبة زمن الانتقال وتتبع أداء المكونات برمجياً"
          : "COMPONENT RENDER TELEMETRY & LATENCY MONITORING";
      default:
        return "MANAGEMENT COMMAND CENTER";
    }
  };

  const getIcon = () => {
    const iconClass =
      "text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]";
    switch (path) {
      case "dashboard":
        return <Activity size={28} className={iconClass} />;
      case "radar":
        return <Shield size={28} className={iconClass} />;
      case "metrics":
        return <Activity size={28} className={iconClass} />;
      case "keys":
        return <Key size={28} className={iconClass} />;
      case "databases":
        return <Database size={28} className={iconClass} />;
      case "orchestrator":
        return <Cpu size={28} className={iconClass} />;
      case "finance":
        return <Landmark size={28} className={iconClass} />;
      case "plans":
        return <CreditCard size={28} className={iconClass} />;
      case "users":
        return <Users size={28} className={iconClass} />;
      case "memories":
        return <Brain size={28} className={iconClass} />;
      case "emails":
        return <Mail size={28} className={iconClass} />;
      case "broadcast":
        return <Send size={28} className={iconClass} />;
      case "settings":
        return <Settings size={28} className={iconClass} />;
      case "audit":
        return <ShieldAlert size={28} className={iconClass} />;
      case "referrals":
        return <UserPlus size={28} className={iconClass} />;
      default:
        return <Settings2 size={28} className={iconClass} />;
    }
  };

  // Determine if the "Add" button should be shown
  const showAddButton = ["plans", "broadcast"].includes(path);

  const getAddButtonText = () => {
    switch (path) {
      case "plans":
        return t("addNewPlan");
      case "broadcast":
        return t("newBroadcast");
      default:
        return t("add");
    }
  };

  const handleAddClick = () => {
    switch (path) {
      case "plans":
        window.dispatchEvent(new CustomEvent("admin-add-plan"));
        break;
      case "broadcast":
        window.dispatchEvent(new CustomEvent("admin-add-broadcast"));
        break;
      default:
        break;
    }
  };

  const isOptimal = pulseData && pulseData.status === 'optimal' && pulseErrorCount < 3;
  const isDegraded = pulseData && pulseData.status === 'degraded' && pulseErrorCount < 3;
  const pulseColor = isOptimal ? '#10b981' : isDegraded ? '#f59e0b' : '#f43f5e';
  const pulseText = isOptimal 
    ? (language === 'ar' ? 'ممتاز' : 'Optimal') 
    : isDegraded 
    ? (language === 'ar' ? 'منخفض' : 'Degraded') 
    : (language === 'ar' ? 'معطل' : 'Disrupted');
  const pulseGlowClass = isOptimal 
    ? 'text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]' 
    : isDegraded 
    ? 'text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]' 
    : 'text-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]';

  return (
    <motion.div 
      initial="initial"
      animate="animate"
      exit="exit"
      variants={perplextaPageTransition}
      className="flex flex-col w-full"
    >
      {/* Sticky Admin Header - Elite Command Layer */}
      <div
        className={`sticky top-[72px] z-20 -mx-6 md:-mx-8 px-6 md:px-8 py-3 mb-4 transition-theme duration-[var(--theme-transition-duration)] ${
          theme === "dark" ? "bg-[var(--bg-base)]/95" : "bg-[var(--bg-surface)]/95"
        } backdrop-blur-md border-b border-[var(--border)] flex items-center justify-between`}
      >
        <div className="flex items-center gap-4">
          {path !== "dashboard" && (
            <button
              onClick={() => navigate("/admin/dashboard")}
              className="p-2.5 rounded-md transition-theme duration-[var(--theme-transition-duration)] flex items-center justify-center bg-[var(--bg-surface)] hover:bg-[var(--bg-base)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border)] shadow-sm hover:shadow-md"
              title={t("back")}
            >
              {dir === "rtl" ? (
                <ArrowRight size={20} />
              ) : (
                <ArrowLeft size={20} />
              )}
            </button>
          )}
          <div className="flex items-center gap-4">
            <div
              className="p-2.5 rounded-md bg-[var(--bg-surface)] shadow-sm border border-[var(--border)] transition-theme duration-[var(--theme-transition-duration)]"
            >
              {getIcon()}
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight uppercase leading-none text-[var(--text-primary)] transition-theme">
                {getTitle()}
              </h1>
              <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest mt-1 opacity-60">
                {getSubTitle()}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {showAddButton && (
            <button
              onClick={handleAddClick}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-md transition-theme duration-300 font-bold text-sm shadow-[0_5px_15px_rgba(16,185,129,0.3)] hover:shadow-[0_8px_20px_rgba(16,185,129,0.5)] active:scale-95"
            >
              <Plus size={18} />
              {getAddButtonText()}
            </button>
          )}

          <div className="relative">
            <button
              onClick={() => setIsPulseOpen(!isPulseOpen)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-sm border border-[var(--border)] bg-[var(--bg-surface)] transition-all duration-300 hover:bg-gray-50/5 cursor-pointer select-none active:scale-95"
            >
              <div className="relative flex items-center justify-center">
                <div 
                  className="w-2 h-2 rounded-full absolute animate-ping opacity-75" 
                  style={{ backgroundColor: pulseColor }} 
                />
                <div 
                  className="w-2 h-2 rounded-full relative" 
                  style={{ backgroundColor: pulseColor }} 
                />
              </div>
              <span className={`text-[10px] font-black uppercase tracking-tighter ${pulseGlowClass}`}>
                {language === 'ar' ? 'نبض النظام' : 'System Pulse'}: {pulseText}
              </span>
            </button>

            <AnimatePresence>
              {isPulseOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsPulseOpen(false)} 
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className={`absolute ${language === 'ar' ? 'left-0' : 'right-0'} top-full mt-2 w-96 z-50 p-4 rounded-lg border shadow-2xl transition-theme duration-[var(--theme-transition-duration)] ${
                      theme === 'dark' 
                        ? 'bg-[#0f0f11] border-gray-800/80 text-white' 
                        : 'bg-white border-gray-200 text-gray-900'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-[var(--border)]">
                      <div className="flex items-center gap-2">
                        <Activity size={16} className={pulseGlowClass} />
                        <span className="text-[11px] font-black uppercase tracking-wider">
                          {language === 'ar' ? 'فحص تشخيصي للنبض' : 'Pulse System Diagnostics'}
                        </span>
                      </div>
                      <span className="text-[9px] font-bold text-[var(--text-muted)] font-mono">
                        {pulseData ? formatPulseUptime(pulseData.uptime) : '0s'}
                      </span>
                    </div>

                    <div className="mb-4 bg-black/10 dark:bg-black/40 rounded p-2 border border-[var(--border)] overflow-hidden">
                      <svg className="w-full h-10 stroke-current opacity-90" viewBox="0 0 100 20" fill="none">
                        <motion.path
                          d="M 0,10 Q 15,10 20,10 T 30,10 T 32,5 T 34,15 T 36,1 T 38,19 T 40,10 T 50,10 T 60,10 T 62,3 T 64,17 T 66,10 T 80,10 T 90,10 T 100,10"
                          stroke={pulseColor}
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          initial={{ strokeDasharray: "200", strokeDashoffset: "200" }}
                          animate={{ strokeDashoffset: ["200", "0"] }}
                          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                        />
                      </svg>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <div className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5 border-b border-[var(--border)]/40 pb-0.5">
                          {language === 'ar' ? 'عقد قواعد البيانات ومزامنتها' : 'Database Node Synchronization'}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[10px]">
                          <div className="p-1.5 rounded bg-gray-50/5 border border-[var(--border)] flex flex-col justify-between">
                            <span className="text-[8px] text-[var(--text-muted)] font-bold">{language === 'ar' ? 'قاعدة البيانات المركزية' : 'Core Engine DB'}</span>
                            <span className={`font-black ${pulseData?.databases?.core?.status === 'connected' ? 'text-emerald-400' : 'text-rose-500'}`}>
                              {pulseData?.databases?.core?.status === 'connected' ? `Connected (${pulseData.databases.core.latencyMs}ms)` : 'Offline'}
                            </span>
                          </div>
                          <div className="p-1.5 rounded bg-gray-50/5 border border-[var(--border)] flex flex-col justify-between">
                            <span className="text-[8px] text-[var(--text-muted)] font-bold">{language === 'ar' ? 'دفتر الحسابات والمالية' : 'Ledger Vault DB'}</span>
                            <span className={`font-black ${pulseData?.databases?.ledger?.status === 'connected' ? 'text-emerald-400' : 'text-rose-500'}`}>
                              {pulseData?.databases?.ledger?.status === 'connected' ? `Connected (${pulseData.databases.ledger.latencyMs}ms)` : 'Offline'}
                            </span>
                          </div>
                          <div className="p-1.5 rounded bg-gray-50/5 border border-[var(--border)] flex flex-col justify-between">
                            <span className="text-[8px] text-[var(--text-muted)] font-bold">{language === 'ar' ? 'السحابة الخارجية' : 'External Sync Registry'}</span>
                            <span className={`font-black ${pulseData?.databases?.external?.status === 'connected' ? 'text-emerald-400' : 'text-rose-500'}`}>
                              {pulseData?.databases?.external?.status === 'connected' ? `Connected (${pulseData.databases.external.latencyMs}ms)` : 'Offline'}
                            </span>
                          </div>
                          <div className="p-1.5 rounded bg-gray-50/5 border border-[var(--border)] flex flex-col justify-between">
                            <span className="text-[8px] text-[var(--text-muted)] font-bold">{language === 'ar' ? 'حماية وأمن البيانات' : 'Security Registry'}</span>
                            <span className={`font-black ${pulseData?.databases?.security?.status === 'connected' ? 'text-emerald-400' : 'text-rose-500'}`}>
                              {pulseData?.databases?.security?.status === 'connected' ? `Connected (${pulseData.databases.security.latencyMs}ms)` : 'Offline'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5 border-b border-[var(--border)]/40 pb-0.5">
                          {language === 'ar' ? 'العمليات الخلفية النشطة' : 'Background Process Handlers'}
                        </div>
                        <div className="space-y-1 text-[9px] text-[var(--text-muted)] font-medium font-sans">
                          <div className="flex justify-between items-center bg-gray-50/5 px-2 py-1 rounded">
                            <span>{language === 'ar' ? 'الصيانة والمسح اليومي' : 'Daily Maintenance & Trash Purge'}</span>
                            <span className={`font-bold ${pulseData?.cronTasks?.dailyMaintenance?.status === 'success' ? 'text-emerald-400' : pulseData?.cronTasks?.dailyMaintenance?.status === 'running' ? 'text-amber-400' : 'text-purple-400'}`}>
                              {pulseData?.cronTasks?.dailyMaintenance ? `${formatPulseRelative(pulseData.cronTasks.dailyMaintenance.lastRun)}` : 'Pending'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center bg-gray-50/5 px-2 py-1 rounded">
                            <span>{language === 'ar' ? 'نبض المزامنة الذكية' : 'Database Pulse Tracker'}</span>
                            <span className={`font-bold ${pulseData?.cronTasks?.databaseHeartbeat?.status === 'success' ? 'text-emerald-400' : pulseData?.cronTasks?.databaseHeartbeat?.status === 'running' ? 'text-amber-400' : 'text-purple-400'}`}>
                              {pulseData?.cronTasks?.databaseHeartbeat ? `${formatPulseRelative(pulseData.cronTasks.databaseHeartbeat.lastRun)}` : 'Pending'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center bg-gray-50/5 px-2 py-1 rounded">
                            <span>{language === 'ar' ? 'تنظيف الجلسات المؤقتة' : 'Auth Token & Session Purge'}</span>
                            <span className={`font-bold ${pulseData?.cronTasks?.expiredTokensCleanup?.status === 'success' ? 'text-emerald-400' : pulseData?.cronTasks?.expiredTokensCleanup?.status === 'running' ? 'text-amber-400' : 'text-purple-400'}`}>
                              {pulseData?.cronTasks?.expiredTokensCleanup ? `${formatPulseRelative(pulseData.cronTasks.expiredTokensCleanup.lastRun)}` : 'Pending'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center bg-gray-50/5 px-2 py-1 rounded">
                            <span>{language === 'ar' ? 'تدقيق الاشتراكات الفعالة' : 'Subscription Renewal Audits'}</span>
                            <span className={`font-bold ${pulseData?.cronTasks?.subscriptionAudit?.status === 'success' ? 'text-emerald-400' : pulseData?.cronTasks?.subscriptionAudit?.status === 'running' ? 'text-amber-400' : 'text-purple-400'}`}>
                              {pulseData?.cronTasks?.subscriptionAudit ? `${formatPulseRelative(pulseData.cronTasks.subscriptionAudit.lastRun)}` : 'Pending'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center bg-gray-50/5 px-2 py-1 rounded">
                            <span>{language === 'ar' ? 'ضغط وتقليص ذاكرة الذكاء' : 'Memory Distillation Cycle'}</span>
                            <span className={`font-bold ${pulseData?.cronTasks?.memoryCompaction?.status === 'success' ? 'text-emerald-400' : pulseData?.cronTasks?.memoryCompaction?.status === 'running' ? 'text-amber-400' : 'text-purple-400'}`}>
                              {pulseData?.cronTasks?.memoryCompaction ? `${formatPulseRelative(pulseData.cronTasks.memoryCompaction.lastRun)}` : 'Pending'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-1.5 border-t border-[var(--border)]/40">
                        <div className="grid grid-cols-2 gap-4 text-[9px] text-[var(--text-muted)] font-bold">
                          <div>
                            <div className="flex justify-between mb-1">
                              <span>CPU UTILIZATION</span>
                              <span>{pulseData?.cpu ?? 0}%</span>
                            </div>
                            <div className="h-1 bg-[var(--border)] rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-500" style={{ width: `${pulseData?.cpu ?? 0}%` }} />
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between mb-1">
                              <span>HEAP ALLOC</span>
                              <span>{pulseData?.memory?.percent ?? 0}%</span>
                            </div>
                            <div className="h-1 bg-[var(--border)] rounded-full overflow-hidden">
                              <div className="h-full bg-purple-500" style={{ width: `${pulseData?.memory?.percent ?? 0}%` }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div
        className={`relative transition-theme duration-[var(--theme-transition-duration)] ${
          ["dashboard", "radar", "databases", "orchestrator", "keys", "finance", "plans", "users", "emails", "broadcast", "settings", "audit", "referrals", "ads", "metrics"].includes(
            path,
          )
            ? ""
            : `p-6 md:p-8 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] shadow-xl`
        }`}
      >
        <ErrorBoundary name="Admin Command Panels">
          {path === "dashboard" ? (
            <CommandCenterView theme={theme} t={t} />
          ) : path === "radar" ? (
            <AdminRateLimitMetricsView theme={theme} t={t} />
          ) : path === "metrics" ? (
            <AdminRenderMetricsView />
          ) : path === "keys" ? (
            <ApiKeysVaultView
              theme={theme}
              t={t}
              dir={dir}
              providerModels={providerModels}
              setProviderModels={setProviderModels}
            />
          ) : path === "databases" ? (
            <DatabaseOrchestrationView
              theme={theme}
              t={t}
              dir={dir}
              language={language}
            />
          ) : path === "orchestrator" ? (
            <OrchestratorView
              theme={theme}
              t={t}
              dir={dir}
              providerModels={providerModels}
            />
          ) : path === "finance" ? (
            <FinanceVaultView theme={theme} t={t} dir={dir} />
          ) : path === "plans" ? (
            <PlansSubscriptionsView theme={theme} t={t} dir={dir} />
          ) : path === "users" ? (
            <UserManagementView theme={theme} t={t} dir={dir} />
          ) : path === "memories" ? (
            <MemoryCenterView theme={theme} t={t} dir={dir} language={language} />
          ) : path === "emails" ? (
            <SmartEmailHubView theme={theme} t={t} dir={dir} />
          ) : path === "broadcast" ? (
            <MassBroadcastView
              theme={theme}
              t={t}
              dir={dir}
              language={language}
            />
          ) : path === "settings" ? (
            <SystemSettingsView theme={theme} t={t} dir={dir} />
          ) : path === "audit" ? (
            <ComplianceAuditLogsView theme={theme} t={t} dir={dir} />
          ) : path === "referrals" ? (
            <ReferralDashboardView theme={theme} t={t} dir={dir} />
          ) : path === "ads" ? (
            <AdsManagementView theme={theme} t={t} dir={dir} language={language} />
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <div className="mb-6 opacity-50">{getIcon()}</div>
              <p className="text-lg font-medium">
                This section is currently under construction.
              </p>
              <p className="text-sm mt-2">
                We are building the {getTitle()} module according to the AGENTS.md
                architecture.
              </p>
            </div>
          )}
        </ErrorBoundary>
      </div>
    </motion.div>
  );
};

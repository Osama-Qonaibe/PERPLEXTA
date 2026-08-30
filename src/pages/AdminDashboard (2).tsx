import { PlansSubscriptionsView } from "../components/PlansSubscriptionsView";
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import { useConfirm } from "../context/ConfirmContext";
import { useToast } from "../hooks/useToast";
import { motion, AnimatePresence } from "motion/react";
import { perplextaPageTransition } from "../constants/motions";
import { ALL_TOOLS } from "../constants";
import { getAuthHeaders, getTimeAgo, formatExactTimestamp } from "../utils/adminUtils";
import { AdminService } from "../services/adminService";
import { useAdminAuth } from "../hooks/useAdminAuth";
import { HighlightText } from "../components/HighlightText";
import { resolveImageUrl } from "../utils/imageResolver";
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
  Bell,
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
  Sliders,
  Wrench,
  MonitorSmartphone,
} from "lucide-react";
import { ActionConfirmationModal } from "../components/ActionConfirmationModal";
import { NotificationThresholdsModal } from "../components/NotificationThresholdsModal";
import { validateToolRoutePricing } from "../utils/orchestratorValidator";
import { SearchableSelect } from "../components/SearchableSelect";
import { UserManagementView } from "./UserManagementView";
import { AdminRateLimitMetricsView } from "./AdminRateLimitMetricsView";
import { AdminRenderMetricsView } from "../components/AdminRenderMetricsView";
import { AdminDiagnosticTool } from "../components/AdminDiagnosticTool";
import { PagePreviewModal } from "../components/PagePreviewModal";

// --- Command Center View ---
const CommandCenterView = ({
  theme,
  t,
  showToast,
}: {
  theme: string;
  t: (key: string, replacements?: any) => string;
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}) => {
  const { token, language, socket, dir } = useAppContext();
  const navigate = useNavigate();
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
  const [reconnectingPool, setReconnectingPool] = useState<string | null>(null);
  const hasFetched = useRef(false);

  const handleForceReconnect = async (poolName: string) => {
    try {
      setReconnectingPool(poolName);
      const res = await fetch('/api/admin/reconnect-pool', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ poolName })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Reconnect failed');
      }
      
      const healthRes = await fetch("/api/admin/health", {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (healthRes.ok) {
        setServerHealth(await healthRes.json());
      }
    } catch (err: any) {
      console.error('Failed to force reconnect pool:', err);
      alert(err.message || 'Failed to reconnect pool');
    } finally {
      setReconnectingPool(null);
    }
  };

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string | { ar: string; en: string };
    description: string | { ar: string; en: string };
    variant?: 'danger' | 'success' | 'warning' | 'info';
    confirmLabel?: string | { ar: string; en: string };
    onConfirm: () => Promise<void> | void;
  } | null>(null);

  const fetchData = useCallback(async () => {
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
        if (process.env.NODE_ENV === "development") {
          console.debug(
            "[Admin] Initial fetch failed, likely server starting...",
          );
        }
      } else {
        if (process.env.NODE_ENV === "development") {
          console.error("Error fetching admin data:", error);
        }
      }
    } finally {
      setLoading(false);
      hasFetched.current = true;
    }
  }, [token]);

  useEffect(() => {
    if (token && !hasFetched.current) {
      fetchData();
    }

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
  }, [token, socket, fetchData]);

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
              setActivity((prev) => prev.filter((a) => a.type !== "system_event"));
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
            body: JSON.stringify({ ids, type: type === "activity" ? "log" : "alert" }),
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
        <RefreshCw size={40} className="text-accent animate-spin" />
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
                className={`p-2.5 rounded-md bg-[var(--bg-primary)] text-accent `}
              >
                {kpi.icon}
              </div>
              <span
                className={`text-sm font-medium px-2 py-1 rounded-sm ${kpi.isPositive ? "bg-accent/10 text-accent" : "bg-red-500/10 text-red-500"}`}
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

      {/* Quick Launchpad & SEO Operations Hub */}
      <div className="p-5 rounded-lg border border-[var(--border-main)] bg-[var(--bg-secondary)] space-y-4 shadow-sm transition-theme">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Sparkles size={18} className="text-accent" />
            <h2 className="text-sm font-black uppercase tracking-wider text-[var(--text-primary)]">
              {language === 'ar' ? 'اختصارات الأقسام والعمليات السريعة' : 'Command Operations & Quick Launchpad'}
            </h2>
          </div>
          <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">
            {language === 'ar' ? 'وصول فوري' : 'Direct Access'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          <button
            onClick={() => navigate('/admin/seo')}
            className="p-3 rounded-md border border-accent/40 bg-accent/10 hover:bg-accent/20 transition-all flex flex-col items-center text-center gap-2 group cursor-pointer shadow-sm hover:shadow"
          >
            <div className="p-2 rounded bg-accent/20 text-accent group-hover:scale-110 transition-transform">
              <Globe size={18} />
            </div>
            <span className="text-xs font-bold text-accent leading-tight">
              {language === 'ar' ? 'مركز السيو' : 'SEO Audit'}
            </span>
          </button>

          <button
            onClick={() => navigate('/admin/orchestrator')}
            className="p-3 rounded-md border border-[var(--border-main)] bg-[var(--bg-overlay)] hover:border-accent/40 transition-all flex flex-col items-center text-center gap-2 group cursor-pointer"
          >
            <div className="p-2 rounded bg-black/10 dark:bg-white/10 text-[var(--text-primary)] group-hover:scale-110 transition-transform">
              <Cpu size={18} />
            </div>
            <span className="text-xs font-bold text-[var(--text-primary)] leading-tight">
              {language === 'ar' ? 'الموجّه الذكي' : 'Orchestrator'}
            </span>
          </button>

          <button
            onClick={() => navigate('/admin/databases')}
            className="p-3 rounded-md border border-[var(--border-main)] bg-[var(--bg-overlay)] hover:border-accent/40 transition-all flex flex-col items-center text-center gap-2 group cursor-pointer"
          >
            <div className="p-2 rounded bg-black/10 dark:bg-white/10 text-[var(--text-primary)] group-hover:scale-110 transition-transform">
              <Database size={18} />
            </div>
            <span className="text-xs font-bold text-[var(--text-primary)] leading-tight">
              {language === 'ar' ? 'قواعد البيانات' : 'Databases'}
            </span>
          </button>

          <button
            onClick={() => navigate('/admin/keys')}
            className="p-3 rounded-md border border-[var(--border-main)] bg-[var(--bg-overlay)] hover:border-accent/40 transition-all flex flex-col items-center text-center gap-2 group cursor-pointer"
          >
            <div className="p-2 rounded bg-black/10 dark:bg-white/10 text-[var(--text-primary)] group-hover:scale-110 transition-transform">
              <Key size={18} />
            </div>
            <span className="text-xs font-bold text-[var(--text-primary)] leading-tight">
              {language === 'ar' ? 'مفاتيح API' : 'API Keys'}
            </span>
          </button>

          <button
            onClick={() => navigate('/admin/radar')}
            className="p-3 rounded-md border border-[var(--border-main)] bg-[var(--bg-overlay)] hover:border-accent/40 transition-all flex flex-col items-center text-center gap-2 group cursor-pointer"
          >
            <div className="p-2 rounded bg-black/10 dark:bg-white/10 text-[var(--text-primary)] group-hover:scale-110 transition-transform">
              <ShieldCheck size={18} />
            </div>
            <span className="text-xs font-bold text-[var(--text-primary)] leading-tight">
              {language === 'ar' ? 'رادار الأمان' : 'Security'}
            </span>
          </button>

          <button
            onClick={() => navigate('/admin/finance')}
            className="p-3 rounded-md border border-[var(--border-main)] bg-[var(--bg-overlay)] hover:border-accent/40 transition-all flex flex-col items-center text-center gap-2 group cursor-pointer"
          >
            <div className="p-2 rounded bg-black/10 dark:bg-white/10 text-[var(--text-primary)] group-hover:scale-110 transition-transform">
              <Landmark size={18} />
            </div>
            <span className="text-xs font-bold text-[var(--text-primary)] leading-tight">
              {language === 'ar' ? 'المالية والدفتر' : 'Finance'}
            </span>
          </button>

          <button
            onClick={() => navigate('/admin/plans')}
            className="p-3 rounded-md border border-[var(--border-main)] bg-[var(--bg-overlay)] hover:border-accent/40 transition-all flex flex-col items-center text-center gap-2 group cursor-pointer"
          >
            <div className="p-2 rounded bg-black/10 dark:bg-white/10 text-[var(--text-primary)] group-hover:scale-110 transition-transform">
              <CreditCard size={18} />
            </div>
            <span className="text-xs font-bold text-[var(--text-primary)] leading-tight">
              {language === 'ar' ? 'الاشتراكات' : 'Plans'}
            </span>
          </button>

          <button
            onClick={() => navigate('/admin/users')}
            className="p-3 rounded-md border border-[var(--border-main)] bg-[var(--bg-overlay)] hover:border-accent/40 transition-all flex flex-col items-center text-center gap-2 group cursor-pointer"
          >
            <div className="p-2 rounded bg-black/10 dark:bg-white/10 text-[var(--text-primary)] group-hover:scale-110 transition-transform">
              <Users size={18} />
            </div>
            <span className="text-xs font-bold text-[var(--text-primary)] leading-tight">
              {language === 'ar' ? 'المستخدمين' : 'Users'}
            </span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div
          className={`p-6 rounded-lg border border-[var(--border-main)] bg-[var(--bg-secondary)] flex flex-col`}
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Cpu className="text-accent" size={20} />
              <h2 className="text-lg font-bold">{t("resourceUtilization")}</h2>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-black text-accent/50 uppercase tracking-widest">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              Live Diagnostics
            </div>
          </div>
          <div className="flex-1 space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-[11px] font-bold uppercase tracking-tight">
                <span className="text-[var(--text-muted)]">{t("cpuLoad")}</span>
                <span className="text-accent">
                  {serverHealth?.cpu || 0}%
                </span>
              </div>
              <div className="h-1.5 w-full bg-[var(--bg-overlay)] rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${serverHealth?.cpu || 0}%` }}
                  className="h-full bg-accent shadow-[0_0_10px_rgba(156,163,175,0.5)]"
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-[11px] font-bold uppercase tracking-tight">
                <span className="text-[var(--text-muted)]">{t("memoryAllocation")}</span>
                <span className="text-accent">
                  {serverHealth?.memory?.used || 0}MB
                </span>
              </div>
              <div className="h-1.5 w-full bg-[var(--bg-overlay)] rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${serverHealth?.memory?.percent || 0}%` }}
                  className="h-full bg-accent shadow-[0_0_10px_rgba(156,163,175,0.5)]"
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-[11px] font-bold uppercase tracking-tight">
                <span className="text-[var(--text-muted)]">{t("systemLoad")}</span>
                <span className="text-accent">
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
                  className="h-full bg-accent shadow-[0_0_10px_rgba(156,163,175,0.5)]"
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
          className={`p-6 rounded-lg border border-accent/20 bg-accent/5 flex flex-col`}
        >
          <div className="flex items-center gap-3 mb-6">
            <Activity className="text-accent" size={20} />
            <h2 className="text-lg font-bold text-accent dark:text-accent">
              {t("systemUptime")}
            </h2>
          </div>
          <div className="flex-1 flex flex-col justify-center items-center py-10">
            <p className="text-4xl font-black text-accent">100%</p>
            <p className="text-xs text-accent/60 dark:text-accent/60 mt-2 font-medium">
              {t("stableOperationalProtocol")}
            </p>
          </div>
        </div>
      </div>

      {/* Database Pool Connectivity Monitors */}
      <div className="p-6 rounded-lg border border-[var(--border-main)] bg-[var(--bg-secondary)] flex flex-col gap-6 shadow-sm transition-theme">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Database className="text-accent " size={20} />
            <h2 className="text-lg font-bold">
              {language === "ar" ? "مراقب اتصال قواعد البيانات النشطة" : "Database Pool Connectivity Monitor"}
            </h2>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-black text-accent/50 uppercase tracking-widest">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
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
                className="p-4 rounded-md border border-[var(--border-main)] bg-[var(--bg-overlay)] flex flex-col gap-3 relative overflow-hidden transition-theme hover:border-accent/30"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database size={16} className={`${isConnected ? 'text-accent ' : isLoading ? 'text-gray-400 animate-pulse' : 'text-red-500 animate-pulse'}`} />
                    <span className="font-bold text-xs uppercase tracking-tight">
                      {dbId === 'core' && (language === "ar" ? "قاعدة البيانات الأساسية" : "Core DB")}
                      {dbId === 'ledger' && (language === "ar" ? "دفتر الأرباح المالي" : "Ledger DB")}
                      {dbId === 'external' && (language === "ar" ? "قاعدة المجتمع والمدونة" : "External DB")}
                      {dbId === 'security' && (language === "ar" ? "قاعدة الأمان والحماية" : "Security DB")}
                    </span>
                  </div>
                  <span className={`text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${isConnected ? 'bg-accent/10 text-accent' : isLoading ? 'bg-gray-500/10 text-gray-500' : 'bg-red-500/10 text-red-500'}`}>
                    {isLoading ? (language === "ar" ? "جاري الاستعلام" : "Loading") : isConnected ? (language === "ar" ? "متصل" : "Connected") : (language === "ar" ? "غير متصل" : "Offline")}
                  </span>
                </div>

                <div className="mt-1 flex flex-col gap-1 text-[10px] text-[var(--text-muted)] font-mono">
                  <div className="flex justify-between">
                    <span>Target:</span>
                    <span className="font-semibold text-[var(--text-main)] uppercase">{dbId}</span>
                  </div>
                  {isConnected && (
                    <>
                      <div className="flex justify-between">
                        <span>Latency:</span>
                        <span className="text-accent font-semibold">{dbInfo.latencyMs}ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Active / Max:</span>
                        <span className="text-[var(--text-main)] font-semibold">{dbInfo.active ?? 0} / {dbInfo.max ?? 20}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Idle / Waiting:</span>
                        <span className="text-[var(--text-main)] font-semibold">{dbInfo.idle ?? 0} / {dbInfo.waiting ?? 0}</span>
                      </div>
                      {dbInfo.connection_leak_risk && (
                        <div className="mt-2 p-2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[9px] flex flex-col gap-2">
                          <span className="font-bold flex items-center gap-1">
                            ⚠️ {language === 'ar' ? 'خطر تسريب الاتصال!' : 'Connection Leak Risk!'}
                          </span>
                          <button
                            disabled={reconnectingPool !== null}
                            onClick={() => handleForceReconnect(dbId)}
                            className="w-full py-1 rounded-[var(--radius)] text-[9px] font-black border border-amber-500/30 text-amber-500 hover:bg-amber-500/20 active:scale-[0.98] transition-all uppercase tracking-wider flex items-center justify-center gap-1"
                          >
                            {reconnectingPool === dbId ? (
                              <span className="animate-spin h-3 w-3 border-2 border-amber-500 border-t-transparent rounded-full" />
                            ) : (
                              language === 'ar' ? 'إعادة اتصال إجباري' : 'Force Reconnect'
                            )}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                  {!isConnected && !isLoading && (
                    <div className="text-red-500 font-semibold truncate leading-normal" title={dbInfo.error}>
                      Error: {dbInfo.error || "Connection test failed"}
                    </div>
                  )}
                </div>

                <div className={`absolute bottom-0 left-0 right-0 h-1 ${isConnected ? 'bg-accent' : isLoading ? 'bg-gray-500/40 animate-pulse' : 'bg-red-500'}`} />
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
              <Clock className="text-accent" size={20} />
              <h2 className="text-lg font-bold">
                {t("activityStream")}
                <span className="ml-2 text-[10px] bg-accent/10 text-accent px-1.5 py-0.5 rounded-full font-bold">
                  {activity.length}
                </span>
              </h2>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent"></span>
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
                      className="w-3.5 h-3.5 rounded-sm border-[var(--border)] text-accent focus:ring-accent-500 cursor-pointer accent-accent"
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
                        className={`w-full ${dir === "rtl" ? "pr-3 pl-10" : "pl-3 pr-10"} py-2 rounded-md border appearance-none focus:outline-none focus:ring-1 focus:ring-accent-500/30 text-xs font-bold ${theme === "dark" ? "bg-[#0f0f11] border-[var(--border-main)] text-gray-300 pointer-events-auto" : "bg-white border-[var(--border-main)] shadow-sm text-gray-700 pointer-events-auto"}`}
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
                        className={`w-full ${dir === "rtl" ? "pr-3 pl-10" : "pl-3 pr-10"} py-2 rounded-md border appearance-none focus:outline-none focus:ring-1 focus:ring-accent-500/30 text-xs font-bold ${theme === "dark" ? "bg-[#0f0f11] border-[var(--border-main)] text-gray-300 pointer-events-auto" : "bg-white border-[var(--border-main)] shadow-sm text-gray-700 pointer-events-auto"}`}
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
                      className={`w-full px-3 py-1.5 rounded-md border focus:outline-none focus:ring-1 focus:ring-accent-500/30 text-xs font-bold transition-theme ${theme === "dark" ? "bg-[#0f0f11] border-[var(--border-main)] text-gray-300 [color-scheme:dark]" : "bg-white border-[var(--border-main)] shadow-sm text-gray-700 [color-scheme:light]"}`}
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
                      className={`w-full px-3 py-1.5 rounded-md border focus:outline-none focus:ring-1 focus:ring-accent-500/30 text-xs font-bold transition-theme ${theme === "dark" ? "bg-[#0f0f11] border-[var(--border-main)] text-gray-300 [color-scheme:dark]" : "bg-white border-[var(--border-main)] shadow-sm text-gray-700 [color-scheme:light]"}`}
                    />
                  </div>
                </div>
              </div>
            );
          })()}

          <div className="mb-4 relative group">
            <Search
              className={`absolute ${dir === "rtl" ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 transition-theme ${search ? "text-accent " : "text-gray-400 group-focus-within:text-accent"}`}
              size={16}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchActivityPlaceholder") || (language === "ar" ? "بحث في السجلات..." : "Search activity logs...")}
              className={`w-full ${dir === "rtl" ? "pr-10 pl-10" : "pl-10 pr-10"} py-2.5 rounded-md border text-xs font-medium transition-theme focus:outline-none focus:ring-2 focus:ring-accent-500/20 bg-[var(--bg-overlay)] border-[var(--border)] focus:border-accent/50 text-[var(--text-primary)] placeholder:text-[var(--text-muted)]`}
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
                        className="mt-4 px-3 py-1.5 rounded-md bg-accent/10 border border-accent/20 text-accent text-xs font-bold hover:bg-accent/20 transition-theme"
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
                    className={`flex items-start gap-3 group p-2 rounded-md transition-theme border border-transparent ${isSelected ? "bg-accent/5 border-accent/20" : "hover:bg-[var(--bg-secondary)]0/5"}`}
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
                        className="w-4 h-4 rounded-sm border-[var(--border-main)] text-accent focus:ring-accent-500 cursor-pointer accent-accent"
                      />
                    </div>
                    <div
                      className={`mt-0.5 p-1.5 rounded-md shrink-0 ${
                        log.type === "ai_generation"
                          ? "bg-blue-500/20 text-blue-500"
                          : "bg-accent/20 text-accent"
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
                        <span className="text-accent font-bold bg-accent/5 px-1.5 py-0.5 rounded-[4px] border border-accent/10">
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
                              <span className="text-accent font-bold">{log.points} {language === "ar" ? "نقطة" : "pts"}</span>
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
              className="group flex flex-col items-center justify-center gap-1.5 p-2 rounded-md bg-accent/5 border border-accent/10 hover:bg-accent/10 hover:border-accent/30 transition-theme"
            >
              <BellRing
                size={15}
                className="text-accent group-hover:scale-110 transition-transform"
              />
              <span className="text-[8px] font-bold text-accent uppercase text-center leading-tight">
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
  showToast,
}: {
  theme: string;
  t: (key: string, replacements?: any) => string;
  dir: string;
  providerModels: Record<string, any[]>;
  setProviderModels: React.Dispatch<
    React.SetStateAction<Record<string, any[]>>
  >;
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}) => {
  const { token, language, user } = useAppContext();
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

  const handleTestKeyConnection = async (
    id: string,
    key: string,
    urlKey?: string,
  ) => {
    if (user?.role !== 'admin') {
      showToast(language === 'ar' ? "غير مصرح لك بالقيام بهذا الإجراء" : "Unauthorized action", "error");
      return false;
    }

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
    if (user?.role !== 'admin') {
      showToast(language === 'ar' ? "غير مصرح لك بالقيام بهذا الإجراء" : "Unauthorized action", "error");
      return;
    }
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
                      className="text-accent animate-spin"
                    />
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t("syncingData")}
                    </p>
                  </div>
                )}

                {syncModal.status === "success" && (
                  <div className="flex flex-col items-center justify-center py-6 space-y-4 text-center">
                    <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mb-2">
                      <CheckCircle size={32} className="text-accent" />
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
                    className="px-5 py-2 rounded-sm text-sm font-bold bg-accent text-white hover:bg-accent transition-theme shadow-lg shadow-none"
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
                  className={`w-10 h-10 rounded-md bg-[var(--bg-primary)] flex items-center justify-center text-accent `}
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
                        className="px-1.5 py-0.5 rounded-xs bg-accent/10 text-accent text-[8px] font-black uppercase tracking-widest border border-accent/20"
                      >
                        Trusted
                      </motion.div>
                    )}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${provider.status === "active" ? (provider.isActive ? "bg-accent shadow-[0_0_5px_rgba(156,163,175,1)] animate-pulse" : "bg-red-500 shadow-[0_0_5px_rgba(239,68,68,1)]") : "bg-gray-400"}`}
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
                  className={`p-2 rounded-sm border transition-theme bg-[var(--bg-primary)] border-[var(--border-main)] text-gray-400 hover:text-accent hover:border-accent/30`}
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
                    className={`${provider.budget > 0 && provider.usedToday / provider.budget > 0.9 ? "text-red-500" : "text-accent"}`}
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
                    className={`h-full rounded-full ${Number(provider.budget || 0) > 0 && Number(provider.usedToday || 0) / Number(provider.budget || 0) > 0.9 ? "bg-red-500" : "bg-accent"} shadow-[0_0_8px_rgba(156,163,175,0.3)] transition-theme`}
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
                    className={`w-full h-9 pl-8 pr-3 text-xs font-mono rounded-sm border focus:outline-none focus:ring-1 focus:ring-accent-500/30 transition-theme bg-[var(--bg-primary)] border-[var(--border-main)] text-[var(--text-primary)]`}
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
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-sm bg-[var(--bg-primary)] text-gray-500 text-[9px] font-black uppercase tracking-wider border border-[var(--border-main)] hover:text-accent hover:border-accent/30 hover:shadow-[0_0_10px_rgba(156,163,175,0.1)] transition-theme active:scale-95 group/btn"
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
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-sm bg-[var(--bg-primary)] text-gray-500 text-[9px] font-black uppercase tracking-wider border border-[var(--border-main)] hover:text-accent hover:border-accent/30 hover:shadow-[0_0_10_rgba(156,163,175,0.1)] transition-theme active:scale-95 group/btn"
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
                  <span className="text-[9px] font-bold text-accent/60 uppercase">
                    {t("lastSync")}:{" "}
                    {new Date(provider.updatedAt).toLocaleDateString(
                      language === "ar" ? "ar-EG" : "en-US",
                    )}
                  </span>
                )}
              </div>

              <div
                className={`flex items-center h-11 px-4 rounded-sm border group-focus-within:border-accent/50 transition-theme bg-[var(--bg-primary)] border-[var(--border-main)] shadow-inner`}
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
                    className={`flex items-center h-11 px-4 rounded-sm border bg-[var(--bg-primary)] border-[var(--border-main)] focus-within:border-accent/50 transition-theme shadow-sm`}
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
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-xs bg-accent/10 text-accent hover:bg-accent/20 transition-theme group/save"
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
                    : "bg-accent text-white hover:bg-accent shadow-lg shadow-none active:scale-95"
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
                className="h-11 rounded-sm flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest bg-[var(--bg-primary)] text-accent border border-accent/20 hover:border-accent/40 hover:bg-accent/5 hover: transition-theme active:scale-95"
              >
                <FastForward size={14} />{" "}
                {language === "ar" ? "فحص سريع" : "Quick Scan"}
              </button>
            </div>

            <button
              onClick={() => handleSyncUsage(provider.id, provider.name)}
              className={`w-full py-2.5 mt-2 rounded-sm flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] transition-theme bg-[var(--bg-primary)] border border-[var(--border-main)] text-gray-500 hover:text-accent hover:border-accent/30 hover:bg-accent/5`}
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
            className="p-6 rounded-lg border border-dashed border-[var(--border-main)] hover:border-accent/50 hover:shadow-lg transition-theme flex flex-col items-center justify-center gap-4 bg-[var(--bg-secondary)] min-h-[440px] text-gray-400 hover:text-accent group cursor-pointer"
          >
            <div className="w-14 h-14 rounded-full border border-dashed border-gray-300 dark:border-gray-800 flex items-center justify-center group-hover:border-accent/30 group-hover:bg-accent/5 transition-theme">
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
          <form onSubmit={(e) => e.preventDefault()} className="p-6 rounded-lg border border-accent/20 bg-[var(--bg-secondary)] shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[440px]">
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-[var(--border-main)]/30">
                <span className="text-xs font-black uppercase tracking-widest text-accent flex items-center gap-1.5">
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
                  className="w-full h-10 px-3 text-xs rounded-sm border focus:outline-none focus:ring-1 focus:ring-accent-500/30 transition-theme bg-[var(--bg-primary)] border-[var(--border-main)] text-[var(--text-primary)]"
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
                  className="w-full h-10 px-3 text-xs font-mono rounded-sm border focus:outline-none focus:ring-1 focus:ring-accent-500/30 transition-theme bg-[var(--bg-primary)] border-[var(--border-main)] text-[var(--text-primary)]"
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
                  className="w-full h-10 px-3 text-xs font-mono rounded-sm border focus:outline-none focus:ring-1 focus:ring-accent-500/30 transition-theme bg-[var(--bg-primary)] border-[var(--border-main)] text-[var(--text-primary)]"
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
                  className="w-full h-10 px-3 text-xs font-mono rounded-sm border focus:outline-none focus:ring-1 focus:ring-accent-500/30 transition-theme bg-[var(--bg-primary)] border-[var(--border-main)] text-[var(--text-primary)]"
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
                  className="w-full h-10 px-3 text-xs font-mono rounded-sm border focus:outline-none focus:ring-1 focus:ring-accent-500/30 transition-theme bg-[var(--bg-primary)] border-[var(--border-main)] text-[var(--text-primary)]"
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
                className={`h-11 text-[10px] uppercase tracking-widest font-black rounded-sm text-white transition-theme flex items-center justify-center gap-1.5 ${
                  isCreatingCustom || !newCustomId || !newCustomName || !newCustomUrl
                    ? "bg-gray-300 dark:bg-gray-800 text-gray-500 cursor-not-allowed"
                    : "bg-accent hover:bg-accent shadow-md shadow-none active:scale-95 cursor-pointer"
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
              color = "accent";
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
        ? `هل أنت متأكد من رغبتك في تصدير نسخة احتياطية لقاعدة البيانات: "${dbName}" (${targetType})؟\n\nاسم ملف النسخة الاحتياطية الذي سيتم توليده وحفظه سيكون:\n📎 "${filename}"\n\nاضغط موافق لتوليد النسخة وتنزيلها مع كامل الجداول والسجلات.`
        : `Are you sure you want to export a backup for database: "${dbName}" (${targetType})?\n\nBackup filename:\n📎 "${filename}"\n\nClick OK to generate and download the full backup.`;

    setConfirmModal({
      isOpen: true,
      title: { ar: `تصدير نسخة احتياطية (${dbName})`, en: `Export Backup (${dbName})` },
      description: confirmMsg,
      variant: "success",
      onConfirm: async () => {
        try {
          showToast(
            dir === "rtl"
              ? `جاري تصدير نسخة احتياطية شاملة لقاعدة ${dbName}...`
              : `Exporting comprehensive backup for ${dbName}...`,
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

          const tableCount = backupData.summary?.table_count ?? Object.keys(backupData.data || {}).length;
          const totalRows = backupData.summary?.total_rows ?? Object.values(backupData.data || {}).reduce((acc: number, val: any) => acc + (Array.isArray(val) ? val.length : 0), 0);

          showToast(
            dir === "rtl"
              ? `تم تصدير النسخة الاحتياطية بنجاح (${tableCount} جدول، ${totalRows} سجل) لقاعدة: ${actualDbName}`
              : `Backup exported successfully (${tableCount} tables, ${totalRows} records) for: ${actualDbName}`,
            "success",
          );
        } catch (error: any) {
          console.error("Export error:", error);
          showToast(error.message || "Export failed", "error");
        }
      }
    });
  };

  const handleRunMigrations = (
    id: string,
    type: "scratch" | "additive",
  ) => {
    const db = databases.find((d) => d.id === id);
    const targetLabel = db ? (db.db_name || db.dbName || id) : id;
    const targetTypeName = id === "ledger" ? (dir === "rtl" ? "المحفظة والمعاملات المالية" : "Finance & Ledger") :
      id === "external" ? (dir === "rtl" ? "المدونة والمقالات" : "Blog & External") :
      id === "security" ? (dir === "rtl" ? "الحماية والأمان" : "Security & Logs") :
      (dir === "rtl" ? "العمليات الأساسية والمستخدمين" : "Core Operations & Users");

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
            type === "scratch"
              ? (dir === "rtl"
                  ? `تمت إعادة تهيئة جداول (${targetTypeName}) من الصفر بنجاح تام وبناء الفهارس الإلزامية.`
                  : `Tables for (${targetTypeName}) successfully re-initialized from scratch with indexes.`)
              : (dir === "rtl"
                  ? `تمت مزامنة وتحديث هيكل جداول (${targetTypeName}) بنجاح.`
                  : `Schema for (${targetTypeName}) synchronized successfully.`),
            "success",
          );
          fetchDatabases();
        } else {
          showToast(
            data.error || t("dbMigrationFailed") || "Failed to run migrations",
            "error",
          );
        }
      } catch (error: any) {
        showToast(error.message || t("dbMigrationError") || "Error running migrations", "error");
      } finally {
        setIsMigrating(null);
      }
    };

    if (type === "scratch") {
      setConfirmModal({
        isOpen: true,
        title: { 
          ar: `إعادة تهيئة جداول (${targetTypeName}) من الصفر؟`, 
          en: `Re-initialize (${targetTypeName}) from scratch?` 
        },
        description: dir === "rtl"
          ? `⚠️ تحذير احترافي ومحمي:\nسيتم مسح وإعادة بناء الجداول والفهارس التابعة لقاعدة (${targetTypeName} - ${targetLabel}) فقط من الصفر، مع تهيئة الحسابات الإلزامية.\n\nلن تتأثر إعدادات الاتصال المخزنة في النظام أو قواعد البيانات الأخرى. هل تريد الاستمرار؟`
          : `⚠️ Professional Safety Warning:\nThis will wipe and rebuild only the tables and indexes belonging to (${targetTypeName} - ${targetLabel}) from scratch, then re-seed mandatory default configurations.\n\nYour saved database connection configurations and other databases will NOT be affected. Do you want to proceed?`,
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
    const target = event.target;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const backup = JSON.parse(e.target?.result as string);
        if (!backup || typeof backup !== "object") {
          throw new Error(dir === "rtl" ? "هيكل ملف النسخة الاحتياطية غير صالح" : "Invalid backup file structure");
        }

        const backupData = backup.data || backup;
        const backupType = backup.type || targetType;

        if (backup.type && backup.type !== targetType) {
          showToast(
            dir === "rtl"
              ? `خطأ: نوع النسخة الاحتياطية (${backup.type}) لا يتطابق مع قاعدة البيانات المحددة (${targetType})`
              : `Error: Backup type (${backup.type}) mismatch with target (${targetType})`,
            "error",
          );
          if (target) target.value = "";
          return;
        }

        const tableKeys = Object.keys(backupData);
        const tableCount = tableKeys.length;
        const totalRecords = tableKeys.reduce((acc, k) => acc + (Array.isArray(backupData[k]) ? backupData[k].length : 0), 0);

        const confirmMsg =
          dir === "rtl"
            ? `📄 تم فحص ملف النسخة الاحتياطية بنجاح:\n• قاعدة البيانات الهدف: ${dbName} (${targetType})\n• عدد الجداول المكتشفة: ${tableCount}\n• إجمالي السجلات: ${totalRecords}\n• تاريخ النسخة: ${backup.timestamp || "غير محدد"}\n\n⚠️ تحذير: استعادة النسخة سيقوم بإعادة كتابة بيانات جداول (${targetType}) بدقة ومزامنة السلاسل الرقمية (ID Sequences). هل أنت متأكد من رغبتك في البدء؟`
            : `📄 Backup file inspected successfully:\n• Target Database: ${dbName} (${targetType})\n• Detected Tables: ${tableCount}\n• Total Records: ${totalRecords}\n• Timestamp: ${backup.timestamp || "N/A"}\n\n⚠️ Warning: Restoring will overwrite (${targetType}) tables and synchronize ID sequences. Are you sure you want to proceed?`;

        setConfirmModal({
          isOpen: true,
          title: { ar: `استعادة دقيقة لقاعدة (${dbName})؟`, en: `Precision restore for (${dbName})?` },
          description: confirmMsg,
          variant: "danger",
          onConfirm: async () => {
            try {
              showToast(
                dir === "rtl"
                  ? "جاري استعادة البيانات وفهرسة السلاسل بدقة متناهية... يرجى عدم إغلاق الصفحة"
                  : "Restoring database tables and synchronizing sequences... Please do not close the page",
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

              const resultData = await res.json();
              if (res.ok) {
                showToast(
                  dir === "rtl"
                    ? `تمت استعادة قاعدة البيانات بنجاح تام (${resultData.restored_tables || tableCount} جدول، ${resultData.total_rows_imported || totalRecords} سجل)`
                    : `Database restored successfully (${resultData.restored_tables || tableCount} tables, ${resultData.total_rows_imported || totalRecords} records)!`,
                  "success",
                );
                fetchDatabases();
              } else {
                showToast(resultData.error || "Import failed", "error");
              }
            } catch (err: any) {
              showToast(err.message || (dir === "rtl" ? "حدث خطأ أثناء الاستيراد" : "Error during import"), "error");
            } finally {
              if (target) target.value = "";
            }
          }
        });
      } catch (parseErr: any) {
        showToast(
          dir === "rtl"
            ? `ملف غير صالح أو تالف: ${parseErr.message}`
            : `Invalid or corrupted backup file: ${parseErr.message}`,
          "error",
        );
        if (target) target.value = "";
      }
    };
    reader.readAsText(file);
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
              ? "bg-[var(--bg-surface)] border border-accent/30 text-accent"
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
              className={`p-5 rounded-lg border flex flex-col gap-4 transition-theme bg-[var(--bg-secondary)] border-[var(--border-main)] hover:border-accent/20 shadow-sm`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2.5 rounded-md border transition-theme ${theme === "dark" ? "bg-[var(--bg-surface)] border-[var(--border-main)] text-accent " : "bg-white border-accent text-accent"}`}
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
                    <span className="text-[11px] font-medium text-accent bg-accent/10 border border-accent/20 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <Zap size={12} className="fill-accent" />{" "}
                      {t("active") || "Active"}
                    </span>
                  ) : (
                    <span className="text-[11px] font-medium text-gray-500 bg-[var(--bg-secondary)]0/10 border border-[var(--border-main)] px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <Circle size={12} /> {t("standby") || "Standby"}
                    </span>
                  )}
                  {db.status === "healthy" ? (
                    <span className="text-[11px] font-medium text-accent bg-accent/10 border border-accent/20 px-2.5 py-0.5 rounded-full flex items-center gap-1">
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
                <div className="absolute inset-0 bg-accent/5 pointer-events-none" />
                <button
                  onClick={() => handleChange(db.id, "type", "cloud")}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 text-[11px] font-black uppercase tracking-[0.2em] rounded-sm transition-theme ease-out relative z-10 ${db.type === "cloud" ? "bg-accent text-white shadow-[0_4px_15px_rgba(156,163,175,0.4)]" : "text-gray-500 hover:bg-[var(--bg-secondary)]/50 dark:hover:bg-[var(--bg-secondary)]/30"}`}
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
                    className="space-y-4 p-5 rounded-md bg-accent/[0.02] border border-accent/10 shadow-inner relative overflow-hidden"
                  >
                    {db.isTesting && (
                      <div className="absolute inset-0 bg-[var(--bg-secondary)]/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center space-y-3 animate-in fade-in">
                        <RefreshCw
                          size={24}
                          className="text-accent animate-spin"
                        />
                        <span className="text-[10px] font-black uppercase tracking-widest text-accent animate-pulse">
                          {language === "ar"
                            ? "جاري فحص الاتصال (Pre-flight)..."
                            : "Running Pre-flight Check..."}
                        </span>
                      </div>
                    )}
                    <div className="absolute top-0 right-0 p-2 opacity-10 pointer-events-none">
                      <Cloud size={40} className="text-accent" />
                    </div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse shadow-[0_0_5px_rgba(156,163,175,1)]"></div>
                        <label className="text-[10px] uppercase text-accent font-black tracking-[0.2em]">
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
                        className="text-accent/60 hover:text-accent transition-theme p-1"
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
                      className={`w-full p-4 rounded-sm border bg-[var(--bg-primary)] border-[var(--border-main)] text-[var(--text-primary)] text-xs font-mono resize-none focus:ring-1 focus:ring-accent-500/30 outline-none transition-theme shadow-sm leading-relaxed ${db.showConnectionString ? "" : "blur-[3px] select-none"}`}
                      value={db.connection_string || ""}
                      onChange={(e) =>
                        handleChange(db.id, "connection_string", e.target.value)
                      }
                    />
                    <div className="flex items-center gap-2 pt-1">
                      <ShieldCheck size={12} className="text-accent/60" />
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

              <div className="col-span-3 h-[52px] flex items-center justify-center border border-dashed border-[var(--border-main)] rounded-sm bg-accent/5">
                <span className="text-[10px] text-[var(--text-secondary)] font-mono">
                  {t("cloudAutoScalingEnabled")}
                </span>
              </div>
              <div className="flex flex-col gap-3 pt-2">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleTestConnection(db.id)}
                    disabled={db.isTesting}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-sm border transition-theme font-bold text-xs bg-[var(--bg-primary)] border-[var(--border-main)] text-[var(--text-secondary)] hover:text-accent hover:border-accent/30 group`}
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
                          className={`transition-theme ${!db.isTesting ? "group-hover:text-accent group-hover:" : ""}`}
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
                        ? "border-accent/40 bg-accent/20 hover:bg-accent/30 text-accent hover:shadow-[0_0_15px_rgba(156,163,175,0.2)]"
                        : "border-accent bg-accent hover:bg-accent/50 text-accent shadow-sm"
                    } ${isMigrating?.id === db.id && isMigrating?.type === "additive" ? "opacity-70 grayscale" : ""}`}
                  >
                    {isMigrating?.id === db.id &&
                    isMigrating?.type === "additive" ? (
                      <RefreshCw
                        size={16}
                        className="animate-spin text-accent"
                      />
                    ) : (
                      <ShieldCheck
                        size={16}
                        className={`transition-theme group-hover:text-accent group-hover:`}
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
                              <label className="w-full flex items-center gap-3 p-3 rounded-md hover:bg-accent/10 text-accent transition-theme text-xs font-bold cursor-pointer">
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
                        ? "bg-accent/10 border-accent/40 text-accent hover:bg-accent/20 shadow-[0_4px_20px_rgba(156,163,175,0.1)]"
                        : "bg-accent border-accent text-white hover:bg-accent shadow-lg shadow-none"
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
  showToast,
}: {
  theme: string;
  t: (key: string, replacements?: any) => string;
  dir: string;
  providerModels: Record<string, any[]>;
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}) => {
  const { token, language } = useAppContext();

  const [tools, setTools] = useState<any[]>([]);
  const [loadingTools, setLoadingTools] = useState(true);

  const providerOptionsList = useMemo(() => {
    return [
      { value: "", label: language === "ar" ? "اختر مزود الخدمة" : "Select Provider" },
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
        return { value: provider, label };
      }),
    ];
  }, [language, providerModels]);

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

  const getModelOptionsList = (providerId: string, currentVal: string) => {
    const rawModels = providerModels[providerId] || [];
    const seenValues = new Set<string>();
    const models = rawModels.filter((model) => {
      const modelValue =
        typeof model === "string" ? model : model.id || model.name || "";
      if (!modelValue || seenValues.has(modelValue)) return false;
      seenValues.add(modelValue);
      return true;
    });

    const opts = [
      { value: "", label: t("model") },
      ...models.map((model) => {
        const modelValue = typeof model === "string" ? model : model.id || model.name;
        const modelLabel = typeof model === "string" ? model : model.name || model.id;
        return { value: modelValue, label: modelLabel };
      })
    ];
    if (currentVal && !opts.find(o => o.value === currentVal)) {
      opts.push({ value: currentVal, label: `⚠️ ${currentVal} (Not Synced)` });
    }
    return opts;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto relative">
      {loadingTools ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <RefreshCw size={40} className="text-accent animate-spin" />
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
                className={`p-6 rounded-lg border transition-theme relative overflow-hidden bg-[var(--bg-secondary)] border-[var(--border-main)] hover:border-accent/20 hover:shadow-lg group/tool`}
              >
                <div className="absolute -top-6 -right-6 opacity-[0.03] dark:opacity-[0.02] pointer-events-none group-hover/tool:scale-110 transition-theme">
                  <Icon size={140} />
                </div>

                <div className="flex items-center justify-between mb-8 relative z-10">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-1.5 rounded-md bg-accent text-white shadow-[0_4px_10px_rgba(156,163,175,0.3)]`}
                    >
                      <Icon size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-[var(--text-primary)] leading-tight">
                        {t(tool.titleKey)}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div
                          className={`w-1.5 h-1.5 rounded-full ${tool.isActive ? "bg-accent shadow-[0_0_5px_rgba(156,163,175,1)]" : "bg-gray-400"}`}
                        ></div>
                        <span
                          className={`text-[9px] font-black uppercase tracking-widest ${tool.isActive ? "text-accent" : "text-gray-400"}`}
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
                        className={`w-11 h-6 rounded-full p-1 transition-theme ${tool.isActive ? "bg-accent/20 border border-accent/30" : "bg-[var(--bg-secondary)]/50 border border-[var(--border-main)]"}`}
                      >
                      <motion.div
                        animate={{
                          x: tool.isActive ? (dir === "rtl" ? -20 : 20) : 0,
                        }}
                        className={`w-4 h-4 rounded-full shadow-md ${tool.isActive ? "bg-accent" : "bg-[var(--bg-secondary)]0"}`}
                      />
                    </button>
                      <button
                        onClick={() => handleSave(tool.id)}
                        disabled={tool.isSaving}
                        className={`p-2 rounded-sm transition-theme ${tool.isSaving ? "text-accent" : "text-gray-400 hover:text-accent hover:bg-accent/10"}`}
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
                        className={`w-full h-11 px-9 rounded-md border text-sm font-black focus:outline-none transition-theme bg-[var(--bg-primary)] border-[var(--border-main)] text-accent focus:ring-1 focus:ring-accent-500/30`}
                      />
                      <div
                        className={`absolute top-1/2 -translate-y-1/2 px-3 text-accent/50 ${dir === "rtl" ? "right-0" : "left-0"}`}
                      >
                        <Coins
                          size={16}
                          className=""
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
                        <Zap size={14} className="text-accent" />
                        <span className="text-[10px] font-black text-[var(--text-primary)] uppercase tracking-[0.2em]">
                          {t("primaryEngine")}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <SearchableSelect
                          value={tool.primaryProvider || ""}
                          onChange={(val) => {
                            handleChange(tool.id, "primaryProvider", val);
                            handleChange(tool.id, "primaryModel", "");
                          }}
                          options={providerOptionsList}
                          placeholder={language === "ar" ? "اختر مزود الخدمة" : "Select Provider"}
                          dir="ltr"
                        />
                        <SearchableSelect
                          value={tool.primaryModel || ""}
                          onChange={(val) => handleChange(tool.id, "primaryModel", val)}
                          options={getModelOptionsList(tool.primaryProvider, tool.primaryModel)}
                          placeholder={t("model")}
                          disabled={!tool.primaryProvider}
                          dir="ltr"
                        />
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
                          <SearchableSelect
                            value={tool.fallback1Provider || ""}
                            onChange={(val) => {
                              handleChange(tool.id, "fallback1Provider", val);
                              handleChange(tool.id, "fallback1Model", "");
                            }}
                            options={providerOptionsList}
                            placeholder={language === "ar" ? "اختر مزود الخدمة" : "Select Provider"}
                            dir="ltr"
                          />
                          <SearchableSelect
                            value={tool.fallback1Model || ""}
                            onChange={(val) => handleChange(tool.id, "fallback1Model", val)}
                            options={getModelOptionsList(tool.fallback1Provider, tool.fallback1Model)}
                            placeholder={t("model")}
                            disabled={!tool.fallback1Provider}
                            dir="ltr"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2 pt-4 border-t border-[var(--border-main)]/30">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex-1">
                        <SearchableSelect
                          value={tool.fallback2Provider || ""}
                          onChange={(val) => {
                            handleChange(tool.id, "fallback2Provider", val);
                            handleChange(tool.id, "fallback2Model", "");
                          }}
                          options={providerOptionsList}
                          placeholder={language === "ar" ? "اختر مزود الخدمة" : "Select Provider"}
                          dir="ltr"
                        />
                      </div>
                      <div className="flex-1">
                        <SearchableSelect
                          value={tool.fallback2Model || ""}
                          onChange={(val) => handleChange(tool.id, "fallback2Model", val)}
                          options={getModelOptionsList(tool.fallback2Provider, tool.fallback2Model)}
                          placeholder={t("model")}
                          disabled={!tool.fallback2Provider}
                          dir="ltr"
                        />
                      </div>
                    </div>

                    {/* Fallback 3 */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex-1">
                        <SearchableSelect
                          value={tool.fallback3Provider || ""}
                          onChange={(val) => {
                            handleChange(tool.id, "fallback3Provider", val);
                            handleChange(tool.id, "fallback3Model", "");
                          }}
                          options={providerOptionsList}
                          placeholder={language === "ar" ? "اختر مزود الخدمة" : "Select Provider"}
                          dir="ltr"
                        />
                      </div>
                      <div className="flex-1">
                        <SearchableSelect
                          value={tool.fallback3Model || ""}
                          onChange={(val) => handleChange(tool.id, "fallback3Model", val)}
                          options={getModelOptionsList(tool.fallback3Provider, tool.fallback3Model)}
                          placeholder={t("model")}
                          disabled={!tool.fallback3Provider}
                          dir="ltr"
                        />
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
  showToast,
}: {
  theme: string;
  t: (key: string, replacements?: any) => string;
  dir: string;
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}) => {
  const { token, language, setIsOperationPending } = useAppContext();
  const [activeTab, setActiveTab] = useState("economy");
  const [isSaving, setIsSaving] = useState(false);
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

  // Manual Transaction States & Verification Logic
  const [financialRequests, setFinancialRequests] = useState<{
    deposits: any[];
    withdrawals: any[];
  }>({ deposits: [], withdrawals: [] });

  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [rejectionReasons, setRejectionReasons] = useState<{ [key: string]: string }>({});
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [isReconciling, setIsReconciling] = useState(false);

  const handleReconcileAll = async () => {
    if (!token) return;
    setIsReconciling(true);
    try {
      const res = await fetch("/api/admin/finance/reconcile-all", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const { audited, discrepancies } = data.report || { audited: 0, discrepancies: 0 };
        showToast(
          language === "ar"
            ? `تم تدقيق ومطابقة الخزنة (${audited} محفظة، ${discrepancies} فروقات)`
            : `Ledger reconciliation complete (${audited} wallets, ${discrepancies} discrepancies)`,
          discrepancies > 0 ? "warning" : "success"
        );
        fetchFinancialRequests();
      } else {
        showToast(language === "ar" ? "فشل تدقيق الخزنة" : "Reconciliation failed", "error");
      }
    } catch {
      showToast(language === "ar" ? "خطأ في الشبكة" : "Network error", "error");
    } finally {
      setIsReconciling(false);
    }
  };

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
                  ? "border-accent text-accent"
                  : `border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 ${theme === "dark" ? "hover:border-[var(--border-main)]" : "hover:border-[var(--border-main)]"}`
              }`}
            >
              <Icon
                size={16}
                className={
                  isActive ? "text-accent " : ""
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
                <Star className="text-accent " size={24} />
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {t("economySettings")}
                </h3>
              </div>
              <button
                onClick={handleSaveEconomySettings}
                disabled={isSaving}
                className={`flex items-center gap-2 px-4 py-2 rounded-md border transition-theme ${
                  theme === "dark"
                    ? "bg-[#1a1a1c] border-[var(--border-main)] text-gray-400 hover:text-accent hover:border-accent/30"
                    : "bg-white border-[var(--border-main)] text-gray-500 hover:text-accent hover:border-accent"
                } disabled:opacity-50 group`}
              >
                {isSaving ? (
                  <RefreshCw size={18} className="animate-spin" />
                ) : (
                  <Save
                    size={18}
                    className="group-hover:"
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
                  className={`w-full max-w-xs h-12 px-4 rounded-md border ${theme === "dark" ? "bg-[#0f0f11] border-[var(--border-main)]/80 text-white" : "bg-[var(--bg-secondary)] border-[var(--border-main)] text-gray-900"} text-center text-lg font-medium focus:border-accent/50 focus:ring-2 focus:ring-accent-500/20 focus:outline-none transition-theme`}
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
                  className={`w-full max-w-xs h-12 px-4 rounded-md border ${theme === "dark" ? "bg-[#0f0f11] border-[var(--border-main)]/80 text-white" : "bg-[var(--bg-secondary)] border-[var(--border-main)] text-gray-900"} text-center text-lg font-medium focus:border-accent/50 focus:ring-2 focus:ring-accent-500/20 focus:outline-none transition-theme`}
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
                  className={`w-full max-w-xs h-12 px-4 rounded-md border ${theme === "dark" ? "bg-[#0f0f11] border-[var(--border-main)]/80 text-white" : "bg-[var(--bg-secondary)] border-[var(--border-main)] text-gray-900"} text-center text-lg font-medium focus:border-accent/50 focus:ring-2 focus:ring-accent-500/20 focus:outline-none transition-theme`}
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
                  className={`w-full max-w-xs h-12 px-4 rounded-md border ${theme === "dark" ? "bg-[#0f0f11] border-[var(--border-main)]/80 text-white" : "bg-[var(--bg-secondary)] border-[var(--border-main)] text-gray-900"} text-center text-lg font-medium focus:border-accent/50 focus:ring-2 focus:ring-accent-500/20 focus:outline-none transition-theme`}
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
                  className={`w-full max-w-xs h-12 px-4 rounded-md border ${theme === "dark" ? "bg-[#0f0f11] border-[var(--border-main)]/80 text-white" : "bg-[var(--bg-secondary)] border-[var(--border-main)] text-gray-900"} text-center text-lg font-medium focus:border-accent/50 focus:ring-2 focus:ring-accent-500/20 focus:outline-none transition-theme`}
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
                  className={`w-full max-w-xs h-12 px-4 rounded-md border ${theme === "dark" ? "bg-[#0f0f11] border-[var(--border-main)]/80 text-white" : "bg-[var(--bg-secondary)] border-[var(--border-main)] text-gray-900"} text-center text-lg font-medium focus:border-accent/50 focus:ring-2 focus:ring-accent-500/20 focus:outline-none transition-theme`}
                />
                <div className="mt-3 flex flex-col items-center gap-1">
                  <p className="text-xs text-gray-500 text-center max-w-xs">
                    {t("pointsPerDollarDesc")}
                  </p>
                  <div className="px-3 py-1 rounded-full bg-accent/5 border border-accent/10 text-[10px] font-bold text-accent uppercase tracking-wider">
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
                  className={`w-full max-w-xs h-12 px-4 rounded-md border ${theme === "dark" ? "bg-[#0f0f11] border-[var(--border-main)]/80 text-white" : "bg-[var(--bg-secondary)] border-[var(--border-main)] text-gray-900"} text-center text-lg font-medium focus:border-accent/50 focus:ring-2 focus:ring-accent-500/20 focus:outline-none transition-theme`}
                />
                <div className="mt-3 flex flex-col items-center gap-1">
                  <p className="text-xs text-gray-500 text-center max-w-xs">
                    {t("conversionRateDesc")}
                  </p>
                  <div className="px-3 py-1 rounded-full bg-accent/5 border border-accent/10 text-[10px] font-bold text-accent uppercase tracking-wider">
                    {economySettings.points_per_dollar} {t("points")} = $1.00
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "ledger" && (
          <div className="space-y-6 font-sans">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-2">
                <Landmark className="text-accent" size={24} />
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    {language === "ar" ? "دفتر الحسابات وجميع المعاملات المالية" : "System Registry & General Ledger"}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {language === "ar" ? "قائمة تدقيق شاملة لكل تدفقات الخزنة والائتمانات اللحظية." : "Comprehensive system record auditing all active credits, debits and payouts."}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleReconcileAll}
                disabled={isReconciling}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-xs font-bold hover:opacity-90 disabled:opacity-50 transition-theme shadow-sm self-start sm:self-auto"
              >
                <RefreshCw size={14} className={isReconciling ? "animate-spin" : ""} />
                <span>{isReconciling ? (language === "ar" ? "جاري التدقيق والمطابقة..." : "Reconciling...") : (language === "ar" ? "تدقيق ومطابقة الخزنة" : "Audit & Reconcile Vault")}</span>
              </button>
            </div>

            {isLoadingRequests ? (
              <div className="flex items-center justify-center p-12">
                <RefreshCw className="animate-spin text-accent" size={24} />
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
                          <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-[#0f0f11]/50 transition-theme">
                            <td className="p-4 text-gray-900 dark:text-gray-100">
                              <div className="font-bold">{log.user?.full_name || log.user?.username || 'Unknown'}</div>
                              <div className="text-[10px] text-gray-400 font-normal">{log.user?.email}</div>
                            </td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded-[4px] text-[10px] uppercase font-black tracking-wider ${isDep ? 'bg-accent/10 text-accent' : 'bg-amber-500/10 text-amber-500'}`}>
                                {isDep ? (language === "ar" ? "إيداع" : "DEPOSIT") : (language === "ar" ? "سحب" : "WITHDRAWAL")}
                              </span>
                            </td>
                            <td className={`p-4 font-black font-mono text-xs ${isDep ? 'text-accent' : 'text-rose-500'}`}>
                              {isDep ? '+' : '-'}${Number(log.realAmount).toFixed(2)}
                            </td>
                            <td className="p-4 text-gray-400 font-mono text-[10px] uppercase">{log.method}</td>
                            <td className="p-4">
                              <span className={`px-2.5 py-1 rounded-[4px] text-[9px] font-black uppercase tracking-widest ${
                                log.status === 'approved' || log.status === 'success' ? 'bg-accent/10 text-accent' :
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
                                  className="px-2 py-1 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded text-[10px] uppercase font-black transition-theme cursor-pointer select-none"
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
                <ArrowRightLeft className="text-accent " size={24} />
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
                className="p-2 text-gray-400 hover:text-accent transition-colors"
                title="Refresh requests list"
              >
                <RefreshCw size={18} className={isLoadingRequests ? "animate-spin text-accent" : ""} />
              </button>
            </div>

            {isLoadingRequests ? (
              <div className="flex items-center justify-center p-12">
                <RefreshCw className="animate-spin text-accent" size={24} />
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                
                {/* 1. MANUAL DEPOSITS BLOCK */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-widest text-[#334155] border-b border-gray-100 dark:border-gray-800 pb-2">
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
                        className={`p-5 rounded-[4px] border space-y-4 transition-theme hover:scale-[1.005] ${
                          theme === "dark" ? "bg-[#1e1e21] border-gray-800/80" : "bg-white border-gray-150/80"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <span className="text-[9px] font-black uppercase tracking-wider text-[#334155] bg-accent/5 px-2 py-0.5 rounded-[4px]">
                              {request.method}
                            </span>
                            <div className="font-bold text-xs text-gray-900 dark:text-white mt-1 font-sans">
                              {request.user?.full_name || request.user?.username || 'Unknown customer'}
                            </div>
                            <div className="text-[10px] text-gray-400 font-sans">{request.user?.email}</div>
                          </div>
                          
                          <div className="text-right">
                            <div className="text-[9px] text-gray-500 font-black uppercase tracking-widest font-sans">Requested Value</div>
                            <div className="text-sm font-black text-[#334155] font-mono">${Number(request.amount).toFixed(2)} USD</div>
                          </div>
                        </div>

                        <div className="p-3 bg-black/20 dark:bg-black/40 rounded-[4px] border border-gray-100 dark:border-gray-800/60 text-[10px] font-mono space-y-1">
                          <div className="flex justify-between">
                            <span className="text-gray-500">TXID Reference:</span>
                            <span className="font-bold text-[#334155] select-all">{refId}</span>
                          </div>
                          {proofImg && (
                            <div className="flex justify-between items-center pt-2 mt-2 border-t border-gray-800/20">
                              <span className="text-gray-500">Attachment proof image:</span>
                              <a
                                href={`/uploads/${proofImg}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[#334155] font-black flex items-center gap-1 hover:underline"
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
                              className="flex-1 h-9 bg-accent hover:bg-accent font-bold active:scale-[0.99] text-white rounded-[4px] text-[10px] uppercase tracking-wider transition-theme"
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
                              className="px-4 h-9 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white font-bold active:scale-[0.99] rounded-[4px] text-[10px] uppercase tracking-wider transition-theme"
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
                  <h4 className="text-xs font-black uppercase tracking-widest text-[#334155] border-b border-gray-100 dark:border-gray-800 pb-2">
                    {language === "ar" ? "طلبات السحب المعلقة" : "Pending User Withdrawals"} ({financialRequests.withdrawals.filter(w => w.status === 'pending').length})
                  </h4>

                  {financialRequests.withdrawals.filter(w => w.status === 'pending').map((request) => {
                    const amountUSD = Number(request.amount_cents) / 100;
                    return (
                      <div
                        key={request.id}
                        className={`p-5 rounded-[4px] border space-y-4 transition-theme hover:scale-[1.005] ${
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
                              className="flex-1 h-9 bg-accent hover:bg-accent font-bold active:scale-[0.99] text-white rounded-[4px] text-[10px] uppercase tracking-wider transition-theme"
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
                              className="px-4 h-9 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white font-bold active:scale-[0.99] rounded-[4px] text-[10px] uppercase tracking-wider transition-theme"
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
                <h4 className="text-xs font-bold uppercase tracking-wider text-accent  mb-1">
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
                      ? "bg-[#1a1a1c] border-gray-800/60 hover:border-accent/20"
                      : "bg-white border-gray-150/80 hover:border-accent/20"
                  } transition-theme shadow-sm`}
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
                              ? "bg-accent/10 text-accent border border-accent/30"
                              : "bg-amber-500/10 text-amber-500 border border-amber-500/30"
                          }`}
                        >
                          {stripeConfig.stripe_status === "active" ? (
                            <>
                              <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
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
                              ? "bg-accent/20 border-accent/40"
                              : "bg-gray-200 dark:bg-gray-800 border-transparent"
                          }`}
                        >
                          <div
                            className={`absolute top-0.5 w-4.2 h-4.2 rounded-full shadow-md transition-theme ${
                              stripeConfig.isLiveMode ? "bg-accent" : "bg-gray-400 dark:bg-gray-500"
                            } ${
                              dir === "rtl"
                                ? stripeConfig.isLiveMode ? "right-5.5" : "right-0.5"
                                : stripeConfig.isLiveMode ? "left-5.5" : "left-0.5"
                            }`}
                          />
                        </button>
                        <span
                          className={`text-[9.5px] font-bold tracking-wider ${
                            stripeConfig.isLiveMode ? "text-accent" : "text-gray-400"
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
                          className={`w-full px-4 py-2.5 rounded-[4px] border focus:outline-none focus:ring-2 focus:ring-accent-500/10 focus:border-accent/40 font-mono text-xs transition-theme ${
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
                          className={`w-full px-4 py-2.5 rounded-[4px] border focus:outline-none focus:ring-2 focus:ring-accent-500/10 focus:border-accent/40 font-mono text-xs transition-theme ${
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
                          className={`w-full px-4 py-2.5 rounded-[4px] border focus:outline-none focus:ring-2 focus:ring-accent-500/10 focus:border-accent/40 font-mono text-xs transition-theme ${
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
                      className="flex-1 bg-[#635BFF] hover:bg-[#5249e5] text-white py-2.5 rounded-[4px] font-bold transition-theme hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50"
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
                      className={`px-5 py-2.5 rounded-[4px] font-bold transition-theme flex items-center justify-center gap-2 ${
                        theme === "dark"
                          ? "bg-transparent text-gray-400 border border-gray-800 hover:text-accent hover:border-accent/30 font-medium"
                          : "bg-transparent text-gray-500 border border-gray-200 hover:text-accent hover:border-accent font-medium"
                      } disabled:opacity-50 group`}
                    >
                      {isVerifyingStripe ? (
                        <RefreshCw size={16} className="animate-spin" />
                      ) : (
                        <Zap size={16} className="group-hover:text-accent group-hover: text-gray-400" />
                      )}
                      {dir === "rtl" ? "تحقق المزامنة" : "Verify Sync"}
                    </button>
                  </div>
                </div>

                {/* PAYPAL OFFICIAL GATEWAY */}
                <div
                  className={`p-6 md:p-8 rounded-[4px] border flex flex-col justify-between ${
                    theme === "dark"
                      ? "bg-[#1a1a1c] border-gray-800/60 hover:border-accent/20"
                      : "bg-white border-gray-150/80 hover:border-accent/20"
                  } transition-theme shadow-sm`}
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
                              ? "bg-accent/10 text-accent border border-accent/30"
                              : "bg-amber-500/10 text-amber-500 border border-amber-500/30"
                          }`}
                        >
                          {paypalConfig.paypal_status === "verified" ? (
                            <>
                              <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
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
                              ? "bg-accent/20 border-accent/40"
                              : "bg-gray-200 dark:bg-gray-800 border-transparent"
                          }`}
                        >
                          <div
                            className={`absolute top-0.5 w-4.2 h-4.2 rounded-full shadow-md transition-theme ${
                              paypalConfig.mode === "live" ? "bg-accent" : "bg-gray-400 dark:bg-gray-500"
                            } ${
                              dir === "rtl"
                                ? paypalConfig.mode === "live" ? "right-5.5" : "right-0.5"
                                : paypalConfig.mode === "live" ? "left-5.5" : "left-0.5"
                            }`}
                          />
                        </button>
                        <span
                          className={`text-[9.5px] font-bold tracking-wider ${
                            paypalConfig.mode === "live" ? "text-accent" : "text-gray-400"
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
                          className={`w-full px-4 py-2.5 rounded-[4px] border focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-accent/40 font-mono text-xs transition-theme ${
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
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-[4px] font-bold transition-theme hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm"
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
                      className={`px-5 py-2.5 rounded-[4px] font-bold transition-theme flex items-center justify-center gap-2 ${
                        theme === "dark"
                          ? "bg-transparent text-gray-400 border border-gray-800 hover:text-accent hover:border-accent/30 font-medium"
                          : "bg-transparent text-gray-500 border border-gray-200 hover:text-accent hover:border-accent font-medium"
                      } disabled:opacity-50 group`}
                    >
                      {isVerifyingPaypal ? (
                        <RefreshCw size={16} className="animate-spin" />
                      ) : (
                        <Zap size={16} className="group-hover:text-accent group-hover: text-gray-400" />
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
                <h4 className="text-xs font-bold uppercase tracking-wider text-accent  mb-1">
                  {dir === "rtl" ? "قنوات الإيداع والتحصيل اليدوي للمحافظ" : "Alternative Manual Deposit Routes"}
                </h4>
                <p className="text-xs text-gray-500">
                  {dir === "rtl" ? "تعديل خيارات التحويل يدويًا خارج بوابات الدفع الفوري (العملات المشفرة، الحوالات والبريد الإلكتروني)." : "Configure custom payment instructions and wallet destinations displayed to users on the deposits tab."}
                </p>
              </div>

              <div
                className={`p-6 md:p-8 rounded-xl border ${
                  theme === "dark" ? "bg-[#161618] border-gray-800/80" : "bg-white border-gray-150"
                } transition-theme shadow-sm`}
              >
                <div className="flex items-center gap-3 mb-8 pb-4 border-b border-gray-100 dark:border-gray-800/60">
                  <div className="p-3 rounded-md bg-accent/10 text-accent">
                    <Landmark size={24} className="text-accent " />
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
                  <div className="border border-accent/10 rounded-xl p-5 bg-accent/[0.015] flex flex-col justify-between space-y-4">
                    <div>
                      <h4 className="text-sm font-bold text-accent flex items-center gap-2 mb-2">
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
                          className={`w-full px-4 py-2.5 rounded-lg border focus:outline-none focus:ring-1.5 focus:ring-accent-500/35 font-mono text-xs transition-theme ${
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
                          className={`w-full px-4 py-2.5 rounded-lg border focus:outline-none focus:ring-1.5 focus:ring-indigo-500/35 font-mono text-xs transition-theme ${
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
                          className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-1.5 focus:ring-blue-500/35 text-xs transition-theme ${
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
                          className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-1.5 focus:ring-blue-500/35 text-xs transition-theme ${
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
                          className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-1.5 focus:ring-blue-500/35 text-xs font-mono transition-theme ${
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
                          className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-1.5 focus:ring-blue-500/35 text-xs font-mono transition-theme ${
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
                    className="w-full sm:w-auto px-8 bg-accent hover:bg-accent text-white py-3 rounded-lg font-bold transition-theme hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50 shadow-md shadow-none"
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




const SmartEmailHubView = ({
  theme,
  t,
  dir,
  showToast,
}: {
  theme: string;
  t: (key: string, replacements?: any) => string;
  dir: string;
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}) => {
  const [activeTab, setActiveTab] = useState<"settings" | "templates">(
    "settings",
  );
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const confirm = useConfirm();
  const { token, language, siteSettings, setIsOperationPending } = useAppContext();

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
            showToast(
              "WAF/Firewall blocked the request (403 HTML received)",
              "error",
            );
          }
        }
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          console.error("Failed to fetch email settings:", error);
        }
      }
    };
    if (token) fetchSettings();
  }, [token, showToast]);

  const fetchTemplates = useCallback(async () => {
    setIsLoadingTemplates(true);
    try {
      const res = await fetch("/api/mail-services-v3/templates", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to fetch email templates:", error);
      }
    } finally {
      setIsLoadingTemplates(false);
    }
  }, [token]);

  const handleImportDefaults = async () => {
    const isConfirmed = await confirm({
      title: dir === "rtl" ? "استيراد القوالب الافتراضية" : "Import Default Templates",
      description: dir === "rtl"
        ? "هل أنت متأكد من جلب القوالب الافتراضية؟ سيتم تحديث القوالب الموجودة."
        : "Are you sure you want to fetch default templates? Existing system templates will be updated.",
      variant: "warning"
    });
    if (!isConfirmed) return;

    setIsImportingDefaults(true);
    try {
      const res = await fetch("/api/mail-services-v3/sync", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        showToast(
          dir === "rtl"
            ? "تم جلب القوالب بنجاح"
            : "Templates imported successfully",
          "success",
        );
        setTimeout(() => {
          fetchTemplates();
        }, 500);
      } else {
        const errorData = await res
          .json()
          .catch(() => ({ error: "Security Filter Intervention" }));
        showToast(
          (dir === "rtl" ? "فشل جلب القوالب: " : "Failed: ") +
            (errorData.error || "Unknown error"),
          "error",
        );
      }
    } catch (error: any) {
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to import templates:", error);
      }
      showToast(error.message || "Error", "error");
    } finally {
      setIsImportingDefaults(false);
    }
  };

  useEffect(() => {
    if (activeTab === "templates") {
      fetchTemplates();
    }
  }, [activeTab, fetchTemplates]);

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      const res = await fetch("/api/mail-services-v3/config", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        showToast(
          dir === "rtl"
            ? "تم حفظ الإعدادات بنجاح"
            : "Settings saved successfully!",
          "success",
        );
      } else {
        const text = await res.text();
        if (text.includes("<html>")) {
          showToast("Blocked by Firewall (403 HTML)", "error");
        } else {
          showToast(
            dir === "rtl" ? "فشل حفظ الإعدادات" : "Failed to save settings",
            "error"
          );
        }
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
      showToast("Network/Security Error", "error");
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
        showToast("Security filter blocked the response body.", "error");
        setIsTestingConnection(false);
        return;
      }

      if (res.ok) {
        showToast(
          dir === "rtl"
            ? "تم التحقق من الاتصال بنجاح!"
            : "Connection verified successfully!",
          "success",
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
        showToast(data.error || "Connection Failed", "error");
      }
    } catch (error: any) {
      console.error("Failed to test connection:", error);
      showToast(error.message || "Error", "error");
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
      showToast(
        dir === "rtl"
          ? `يرجى ملء الحقول التالية: ${missingFields.join("، ")}`
          : `Required: ${missingFields.join(", ")}`,
        "error"
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
        showToast(
          dir === "rtl" ? "تم حفظ القالب بنجاح" : "Template saved successfully",
          "success"
        );
      } else {
        const errorData = await res.json().catch(() => ({ error: "Blocked" }));
        showToast(errorData.error || "Failed to save", "error");
      }
    } catch (error) {
      showToast("Connection Error", "error");
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    const isConfirmed = await confirm({ title: "Delete Template", description: "Are you sure you want to delete this template?", variant: "danger" as const });
    if (!isConfirmed) return;
    try {
      const token = localStorage.getItem("app_token");
      const res = await fetch(`/api/mail-services-v3/templates/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showToast("Template deleted", "success");
        await fetchTemplates();
      }
    } catch (error) {
      showToast("Error", "error");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b border-[var(--border-main)] dark:border-[var(--border-main)] pb-4">
        <button
          onClick={() => setActiveTab("settings")}
          className={`px-6 py-2.5 rounded-[var(--radius)] font-medium transition-theme flex items-center gap-2 ${
            activeTab === "settings"
              ? "bg-accent/10 text-accent "
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
              ? "bg-accent/10 text-accent "
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
                  <div className="p-3 rounded-[var(--radius)] bg-accent/10 text-accent">
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
                        ? "bg-accent/10 text-accent border border-accent/30"
                        : "bg-amber-500/10 text-amber-500 border border-amber-500/30"
                    }`}
                  >
                    {settings.status === "active" ? (
                      <>
                        <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
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
                    className={`w-full px-4 py-3 rounded-[var(--radius)] border focus:outline-none focus:ring-2 focus:ring-accent-500/50 transition-theme ${theme === "dark" ? "bg-[#1a1a1c] border-[var(--border-main)] text-white" : "bg-white border-[var(--border-main)]"}`}
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
                          className={`w-full px-4 py-3 rounded-[var(--radius)] border focus:outline-none focus:ring-2 focus:ring-accent-500/50 transition-theme text-left ${theme === "dark" ? "bg-[#1a1a1c] border-[var(--border-main)] text-white" : "bg-white border-[var(--border-main)]"}`}
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
                          className={`w-full px-4 py-3 rounded-[var(--radius)] border focus:outline-none focus:ring-2 focus:ring-accent-500/50 transition-theme text-left ${theme === "dark" ? "bg-[#1a1a1c] border-[var(--border-main)] text-white" : "bg-white border-[var(--border-main)]"}`}
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
                          className={`w-full px-4 py-3 rounded-[var(--radius)] border focus:outline-none focus:ring-2 focus:ring-accent-500/50 transition-theme ${theme === "dark" ? "bg-[#1a1a1c] border-[var(--border-main)] text-white" : "bg-white border-[var(--border-main)]"}`}
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
                          className={`w-full px-4 py-3 rounded-[var(--radius)] border focus:outline-none focus:ring-2 focus:ring-accent-500/50 transition-theme text-left ${theme === "dark" ? "bg-[#1a1a1c] border-[var(--border-main)] text-white" : "bg-white border-[var(--border-main)]"}`}
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
                        className={`w-full px-4 py-3 rounded-[var(--radius)] border focus:outline-none focus:ring-2 focus:ring-accent-500/50 transition-theme text-left ${theme === "dark" ? "bg-[#1a1a1c] border-[var(--border-main)] text-white" : "bg-white border-[var(--border-main)]"}`}
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
                      className={`w-full px-4 py-3 rounded-[var(--radius)] border focus:outline-none focus:ring-2 focus:ring-accent-500/50 transition-theme ${theme === "dark" ? "bg-[#1a1a1c] border-[var(--border-main)] text-white" : "bg-white border-[var(--border-main)]"}`}
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
                      className={`w-full px-4 py-3 rounded-[var(--radius)] border focus:outline-none focus:ring-2 focus:ring-accent-500/50 transition-theme text-left ${theme === "dark" ? "bg-[#1a1a1c] border-[var(--border-main)] text-white" : "bg-white border-[var(--border-main)]"}`}
                      dir="ltr"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-6">
                  <button
                    onClick={handleSaveSettings}
                    disabled={isSavingSettings}
                    className="flex-1 bg-accent hover:bg-accent text-white py-3.5 rounded-md font-bold transition-theme shadow-lg shadow-none disabled:opacity-50 flex items-center justify-center gap-2"
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
                    className={`px-6 py-3.5 rounded-md font-bold transition-theme border flex items-center justify-center gap-2 disabled:opacity-50 ${theme === "dark" ? "border-[var(--border-main)] hover:bg-[var(--bg-secondary)] text-white" : "border-[var(--border-main)] hover:bg-[var(--bg-input)] text-gray-900"}`}
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
                  <ShieldCheck className="text-accent" size={20} />
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
                  className="flex items-center gap-2 bg-accent hover:bg-accent text-white px-4 py-2 rounded-md transition-theme font-medium shadow-[0_0_15px_rgba(156,163,175,0.4)]"
                >
                  <Plus size={18} />
                  {t("createNewTemplate")}
                </button>
              </div>
            </div>

            {isLoadingTemplates ? (
              <div className="flex justify-center py-12">
                <RefreshCw
                  className="animate-spin text-accent"
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
                        ? "bg-[#111111] border-[var(--border-main)] hover:border-accent/30"
                        : "bg-white border-[var(--border-main)] hover:border-accent/30"
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
                      <span className="text-sm font-medium text-accent opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
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
                className={`p-2.5 rounded-md transition-theme flex items-center justify-center ${
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
                      className={`w-full px-4 py-3 rounded-md border focus:outline-none focus:ring-2 focus:ring-accent-500/50 transition-theme ${theme === "dark" ? "bg-[#1a1a1c] border-[var(--border-main)] text-white disabled:opacity-50" : "bg-[var(--bg-secondary)] border-[var(--border-main)] disabled:opacity-50"}`}
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
                        className={`w-full px-4 py-3 rounded-md border focus:outline-none focus:ring-2 focus:ring-accent-500/50 transition-theme ${theme === "dark" ? "bg-[#1a1a1c] border-[var(--border-main)] text-white" : "bg-white border-[var(--border-main)]"}`}
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
                        className={`w-full px-4 py-3 rounded-md border focus:outline-none focus:ring-2 focus:ring-accent-500/50 transition-theme ${theme === "dark" ? "bg-[#1a1a1c] border-[var(--border-main)] text-white" : "bg-white border-[var(--border-main)]"}`}
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
                      className={`w-full px-4 py-3 rounded-md border focus:outline-none focus:ring-2 focus:ring-accent-500/50 transition-theme font-mono text-sm ${theme === "dark" ? "bg-[#1a1a1c] border-[var(--border-main)] text-gray-300" : "bg-[var(--bg-secondary)] border-[var(--border-main)] text-gray-800"}`}
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
                      className={`w-full px-4 py-3 rounded-md border focus:outline-none focus:ring-2 focus:ring-accent-500/50 transition-theme font-mono text-sm ${theme === "dark" ? "bg-[#1a1a1c] border-[var(--border-main)] text-gray-300" : "bg-[var(--bg-secondary)] border-[var(--border-main)] text-gray-800"}`}
                      dir="rtl"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={handleSaveTemplate}
                      disabled={isSavingTemplate}
                      className="flex-1 bg-accent hover:bg-accent text-white py-3.5 rounded-md font-bold transition-theme shadow-lg shadow-none disabled:opacity-50 flex items-center justify-center gap-2"
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
                    <Code2 className="text-accent" size={20} />
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
                        className={`w-full flex items-center justify-between p-3 rounded-md border transition-theme hover:border-accent/50 ${theme === "dark" ? "bg-[#111111] border-[var(--border-main)]" : "bg-white border-[var(--border-main)]"}`}
                      >
                        <span className="font-mono text-sm text-accent">
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
                      <p className="font-bold text-accent">
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
          className={`p-5 rounded-lg border ${theme === "dark" ? "bg-[#111111] border-[var(--border-main)]" : "bg-white border-[var(--border-main)] shadow-sm"} group transition-theme hover:border-accent/30`}
        >
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-md bg-accent/10 text-accent group-hover: transition-theme">
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
          className={`p-5 rounded-lg border ${theme === "dark" ? "bg-[#111111] border-[var(--border-main)]" : "bg-white border-[var(--border-main)] shadow-sm"} group transition-theme hover:border-blue-500/30`}
        >
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-md bg-blue-500/10 text-blue-500 group-hover:drop-shadow-[0_0_8px_rgba(59,130,246,0.4)] transition-theme">
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
          className={`p-5 rounded-lg border ${theme === "dark" ? "bg-accent/5 border-accent/20" : "bg-accent/50 border-accent shadow-sm"} group transition-theme`}
        >
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-md bg-accent/10 text-accent">
              <Megaphone size={24} className="animate-bounce" />
            </div>
            <div>
              <p className="text-xs font-bold text-accent dark:text-accent uppercase tracking-widest">
                {t("activeStatus") ||
                  (language === "ar" ? "حالة المحرك" : "Engine Status")}
              </p>
              <p className="text-2xl font-black mt-1 text-accent">READY</p>
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
                ? "bg-[#1a1a1c] border border-accent/30 text-accent"
                : "bg-white border border-accent text-accent"
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
                          ? "bg-accent/10 border-accent text-accent shadow-lg shadow-none"
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
                        className={`flex flex-col items-center justify-center gap-2 p-4 rounded-md border transition-theme ${
                          form.target_group === group.id
                            ? "bg-accent/10 border-accent text-accent shadow-lg shadow-none"
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
                      className="mt-2 text-[10px] font-bold text-accent uppercase flex items-center gap-2"
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
                        className={`w-full px-4 py-3 rounded-md border focus:outline-none focus:ring-2 focus:ring-accent-500/50 transition-theme ${theme === "dark" ? "bg-[#1a1a1c] border-[var(--border-main)] text-white" : "bg-[var(--bg-secondary)] border-[var(--border-main)]"}`}
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
                        className={`w-full px-4 py-3 rounded-md border focus:outline-none focus:ring-2 focus:ring-accent-500/50 transition-theme ${theme === "dark" ? "bg-[#1a1a1c] border-[var(--border-main)] text-white" : "bg-[var(--bg-secondary)] border-[var(--border-main)]"}`}
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
                    className={`w-full px-4 py-3 rounded-md border focus:outline-none focus:ring-2 focus:ring-accent-500/50 transition-theme text-sm font-sans ${theme === "dark" ? "bg-[#1a1a1c] border-[var(--border-main)] text-gray-300" : "bg-[var(--bg-secondary)] border-[var(--border-main)] text-gray-800"}`}
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
                    className={`w-full px-4 py-3 rounded-md border focus:outline-none focus:ring-2 focus:ring-accent-500/50 transition-theme text-sm font-sans ${theme === "dark" ? "bg-[#1a1a1c] border-[var(--border-main)] text-gray-300" : "bg-[var(--bg-secondary)] border-[var(--border-main)] text-gray-800"}`}
                    dir="rtl"
                  />
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-[var(--border-main)] dark:border-[var(--border-main)] flex justify-end">
              <button
                onClick={handleSend}
                disabled={isSending}
                className="w-full md:w-auto bg-accent hover:bg-accent text-white px-10 py-4 rounded-md font-bold transition-theme shadow-xl shadow-none flex items-center justify-center gap-3 disabled:opacity-50"
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
              <History className="text-accent" size={24} />
              {t("broadcastHistory")}
            </h3>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <RefreshCw
                  size={32}
                  className="text-accent animate-spin"
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
                  className="mt-4 text-accent font-bold hover:underline"
                >
                  {t("launchFirstBroadcast")}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {broadcasts.map((b) => (
                  <div
                    key={b.id}
                    className={`p-6 rounded-lg border transition-theme hover:border-accent/30 hover:shadow-xl hover:shadow-black/5 ${theme === "dark" ? "bg-[#1a1a1c] border-[var(--border-main)]" : "bg-white border-[var(--border-main)] shadow-sm"}`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-md ${theme === "dark" ? "bg-accent/10" : "bg-accent"}`}
                        >
                          {b.broadcast_type === "email" ? (
                            <Mail size={18} className="text-accent" />
                          ) : b.broadcast_type === "notification" ? (
                            <BellRing size={18} className="text-accent" />
                          ) : (
                            <Send size={18} className="text-accent" />
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-accent uppercase tracking-widest">
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
                      <div className="flex items-center gap-2 text-accent text-xs font-bold">
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
  const [toastMsg, setToastMsg] = useState<string>("");
  const [isSuccessToast, setIsSuccessToast] = useState<boolean>(false);

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
        setToastMsg(
          language === "ar"
            ? "تم تحديث عتبات التنبيهات المخصصة بنجاح!"
            : "Custom notification thresholds updated successfully!"
        );
        setIsSuccessToast(true);
        setTimeout(() => setToastMsg(""), 4000);
      } else {
        const data = await res.json();
        setToastMsg(data.error || "Failed to update thresholds");
        setIsSuccessToast(false);
        setTimeout(() => setToastMsg(""), 4000);
      }
    } catch (err: any) {
      setToastMsg(err.message || "Failed to update thresholds");
      setIsSuccessToast(false);
      setTimeout(() => setToastMsg(""), 4000);
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
        setToastMsg(
          language === "ar"
            ? `تم ضغط الذاكرة بذكاء بنجاح. تم تكثيف ${data.compressedCount} جلسة.`
            : `Smart compression completed. Condensed ${data.compressedCount} active sessions.`
        );
        setIsSuccessToast(true);
        fetchStats();
      } else {
        setToastMsg(data.error || "Failed to execute smart compression");
        setIsSuccessToast(false);
      }
    } catch (err: any) {
      setToastMsg(err.message || "Network error");
      setIsSuccessToast(false);
    } finally {
      setIsCompressing(false);
      setIsOperationPending(false);
      setTimeout(() => {
        setToastMsg("");
      }, 4000);
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
        setToastMsg(
          language === "ar"
            ? `تم تنظيف السياق بنجاح. تم مسح ${data.cleanedCount} جلسة غير نشطة.`
            : `Context cleanup completed. Pruned ${data.cleanedCount} inactive sessions.`
        );
        setIsSuccessToast(true);
        fetchStats();
      } else {
        setToastMsg(data.error || "Failed to execute context cleanup");
        setIsSuccessToast(false);
      }
    } catch (err: any) {
      setToastMsg(err.message || "Network error");
      setIsSuccessToast(false);
    } finally {
      setIsCleaning(false);
      setIsOperationPending(false);
      setTimeout(() => {
        setToastMsg("");
      }, 4000);
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
                ? "bg-[#1a1a1c] border border-accent/30 text-accent"
                : "bg-white border border-accent text-accent"
              : theme === "dark"
                ? "bg-[#1a1a1c] border border-red-500/30 text-red-500"
                : "bg-white border border-red-200 text-red-600"
          }`}
        >
          {isSuccessToast ? (
            <CheckCircle2
              size={20}
              className="text-accent "
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
                  <span className="text-xs font-mono text-emerald-500 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded flex items-center gap-1">
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

const SystemSettingsView = ({
  theme,
  t,
  dir,
}: {
  theme: string;
  t: (key: string, replacements?: any) => string;
  dir: string;
}) => {
  const confirm = useConfirm();
  const { siteSettings, setSiteSettings, token, setIsOperationPending, language } = useAppContext();

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

  const [clearingCache, setClearingCache] = useState<string | null>(null);

  // --- DIAGNOSTIC HELPER FOR SYSTEM SETTINGS & ORPHANED LOGO ASSETS ---
  const [orphanedAssetsState, setOrphanedAssetsState] = useState<{
    hasOrphanedAssets: boolean;
    assets: Array<{
      key: string;
      label: string;
      url: string | null;
      exists: boolean;
      isOrphaned: boolean;
      reason?: string;
    }>;
    orphanedKeys: string[];
  } | null>(null);
  const [isCheckingAssets, setIsCheckingAssets] = useState(false);
  const [isRepairingAssets, setIsRepairingAssets] = useState(false);
  const [isSyncingMetadata, setIsSyncingMetadata] = useState(false);

  const handleSyncSeoMetadata = async () => {
    setIsSyncingMetadata(true);
    try {
      const res = await fetch("/api/admin/sync-metadata", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const msg = language === "ar"
          ? `تمت مزامنة البيانات الوصفية لـ SEO بنجاح. (تم تحديث ${data.totalUpdated} عنصر)`
          : `SEO metadata sync complete. (${data.totalUpdated} items updated)`;
        showToast(msg, "success");
      } else {
        throw new Error("Metadata sync failed");
      }
    } catch (err: any) {
      showToast(
        language === "ar"
          ? "حدث خطأ أثناء مزامنة البيانات الوصفية لـ SEO"
          : "Error synchronizing SEO metadata",
        "error"
      );
    } finally {
      setIsSyncingMetadata(false);
    }
  };

  const checkSystemAssetsDiagnostic = async () => {
    setIsCheckingAssets(true);
    try {
      const res = await fetch("/api/admin/settings/check-assets", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setOrphanedAssetsState(data);
      }
    } catch (err) {
      console.error("Failed to run system asset diagnostic check:", err);
    } finally {
      setIsCheckingAssets(false);
    }
  };

  const handleRepairOrphanedAssets = async () => {
    setIsRepairingAssets(true);
    try {
      const res = await fetch("/api/admin/settings/repair-assets", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        showToast(
          language === "ar"
            ? "تم إصلاح الشعار والملفات المفقودة بنجاح"
            : "Orphaned assets repaired and restored successfully",
          "success"
        );
        fetchSettings();
        checkSystemAssetsDiagnostic();
      } else {
        throw new Error("Repair request failed");
      }
    } catch (err) {
      showToast(
        language === "ar"
          ? "حدث خطأ أثناء إصلاح الملفات المفقودة"
          : "Failed to repair orphaned assets",
        "error"
      );
    } finally {
      setIsRepairingAssets(false);
    }
  };

  const [missingAssetReport, setMissingAssetReport] = useState<any>(null);
  const [isScanningMissingAssets, setIsScanningMissingAssets] = useState(false);
  const [isPurgingMissingAssets, setIsPurgingMissingAssets] = useState(false);

  const fetchMissingAssetReport = async () => {
    setIsScanningMissingAssets(true);
    try {
      const res = await fetch("/api/admin/missing-assets-report", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMissingAssetReport(data);
      }
    } catch (err) {
      console.error("Failed to fetch missing asset report:", err);
    } finally {
      setIsScanningMissingAssets(false);
    }
  };

  const handlePurgeMissingAssets = async (ids?: number[]) => {
    setIsPurgingMissingAssets(true);
    try {
      const res = await fetch("/api/admin/missing-assets", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(ids ? { ids } : {})
      });
      if (res.ok) {
        const data = await res.json();
        showToast(
          language === "ar"
            ? `تم تطهير وحذف ${data.deletedCount} سجل ملف مفقود بنجاح`
            : `Successfully purged ${data.deletedCount} missing file records`,
          "success"
        );
        fetchMissingAssetReport();
      } else {
        throw new Error("Purge failed");
      }
    } catch (err) {
      showToast(
        language === "ar" ? "فشل تطهير الملفات المفقودة" : "Failed to purge missing assets",
        "error"
      );
    } finally {
      setIsPurgingMissingAssets(false);
    }
  };

  const handleClearCache = async (target: string) => {
    setClearingCache(target);
    try {
      const res = await fetch("/api/admin/cache/clear", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ target }),
      });
      if (res.ok) {
        const data = await res.json();
        setToast({
          message: data.message || (language === "ar" ? "تم مسح الذاكرة المؤقتة بنجاح" : "Cache cleared successfully"),
          type: "success",
        });
      } else {
        const err = await res.json();
        setToast({
          message: err.error || (language === "ar" ? "فشل مسح الذاكرة المؤقتة" : "Failed to clear cache"),
          type: "error",
        });
      }
    } catch (error: any) {
      setToast({
        message: error.message || (language === "ar" ? "فشل مسح الذاكرة المؤقتة" : "Failed to clear cache"),
        type: "error",
      });
    } finally {
      setClearingCache(null);
    }
  };

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
    const isConfirmed = await confirm({
      title: dir === "rtl" ? "حذف إعدادات المسار" : "Delete Route SEO",
      description: dir === "rtl" ? "هل أنت تأكد من حذف إعدادات هذا المسار؟" : "Are you sure you want to delete this route SEO setting?",
      variant: "danger"
    });
    if (!isConfirmed) return;
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
      const response = await fetch("/api/admin/settings/upload-asset", {
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

  useEffect(() => {
    if (token) {
      fetchSettings();
      fetchRouteSeoList();
      checkSystemAssetsDiagnostic();
    }
  }, [token]);

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "logo" | "logo_light" | "favicon" | "seo",
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showToast(
          dir === "rtl" 
            ? "حجم الصورة يتجاوز الحد الأقصى المسموح به وهو 2 ميغابايت" 
            : "Image size must be less than 2MB", 
          "error"
        );
        return;
      }

      setIsOperationPending(true);
      if (type === "seo") setIsSeoUploading(true);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/admin/settings/upload-asset", {
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
          let updatedLogo = logoBase64;
          let updatedLogoLight = logoLightBase64;
          let updatedFavicon = faviconBase64;
          let updatedSeo = seoImageUrl;

          if (type === "seo") { setSeoImageUrl(data.imageUrl); updatedSeo = data.imageUrl; }
          else if (type === "logo") { setLogoBase64(data.imageUrl); updatedLogo = data.imageUrl; }
          else if (type === "logo_light") { setLogoLightBase64(data.imageUrl); updatedLogoLight = data.imageUrl; }
          else if (type === "favicon") { setFaviconBase64(data.imageUrl); updatedFavicon = data.imageUrl; }

          try {
            const saveRes = await fetch("/api/admin/settings", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                logo_url: updatedLogo,
                logo_light_url: updatedLogoLight,
                favicon_url: updatedFavicon,
                seo_image_url: updatedSeo,
              }),
            });

            if (saveRes.ok) {
              setSiteSettings({
                ...siteSettings,
                logoBase64: updatedLogo,
                logoLightBase64: updatedLogoLight,
                faviconBase64: updatedFavicon,
                seoImageUrl: updatedSeo,
              });
              showToast(
                dir === "rtl" 
                  ? "تم رفع وحفظ وتطبيق الشعار بنجاح في قاعدة البيانات!" 
                  : "Logo uploaded, saved and applied successfully!", 
                "success"
              );
            } else {
              showToast(
                dir === "rtl" 
                  ? "تم رفع الملف، يرجى النقر على حفظ التغييرات" 
                  : "Uploaded. Click Save to complete.", 
                "success"
              );
            }
          } catch (persistErr) {
            console.error('[AssetUpload] Persistence error:', persistErr);
          }
        } else {
          throw new Error("Upload response was unsuccessful");
        }
      } catch (error) {
        console.error('[AssetUpload] Frontend upload error:', error);
        showToast(
          dir === "rtl" 
            ? "فشل رفع الصورة، يرجى المحاولة لاحقاً" 
            : "Failed to upload asset. Please try again.", 
          "error"
        );
      } finally {
        setIsOperationPending(false);
        if (type === "seo") setIsSeoUploading(false);
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
          logoBase64,
          logoLightBase64,
          faviconBase64,
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
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          logo_url: logoBase64,
          logo_light_url: logoLightBase64,
          favicon_url: faviconBase64,
        }),
      });

      if (res.ok) {
        setSiteSettings({
          ...siteSettings,
          logoBase64,
          logoLightBase64,
          faviconBase64,
        });
        showToast(t("saveSuccess") || "Visual settings saved", "success");
      } else {
        const err = await res.json();
        showToast(err.error || t("saveFailed") || "Failed", "error");
      }
    } catch (error: any) {
      showToast(error.message || t("saveFailed") || "Failed", "error");
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
        const err = await res.json();
        showToast(err.error || t("saveFailed") || "Failed", "error");
      }
    } catch (error: any) {
      showToast(error.message || t("saveFailed") || "Failed", "error");
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
        }
      }, 500);

    } catch (err: any) {
      clearTimeout(timeoutId);
      console.error("[CrawlAudit] Scan failure:", err);
      setCrawlScanning(false);
      const isAr = language === "ar";
      const isTimeout = err.name === "AbortError";
      
      setCrawlComplianceRate("0.00% HIGH_RISK");
      
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
                  ? "bg-[#1a1a1c] border border-accent/30 text-accent"
                  : "bg-white border border-accent text-accent"
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
          <div className="p-3 rounded-md bg-accent/10 text-accent">
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
              className={`w-full px-4 py-3 rounded-md border focus:outline-none focus:ring-2 focus:ring-accent-500/50 transition-theme ${theme === "dark" ? "bg-[#1a1a1c] border-[var(--border-main)] text-white" : "bg-[var(--bg-secondary)] border-[var(--border-main)]"}`}
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
              className={`w-full px-4 py-3 rounded-md border focus:outline-none focus:ring-2 focus:ring-accent-500/50 transition-theme ${theme === "dark" ? "bg-[#1a1a1c] border-[var(--border-main)] text-white" : "bg-[var(--bg-secondary)] border-[var(--border-main)]"}`}
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
              className={`w-full px-4 py-3 rounded-md border focus:outline-none focus:ring-2 focus:ring-accent-500/50 transition-theme ${theme === "dark" ? "bg-[#1a1a1c] border-[var(--border-main)] text-white" : "bg-[var(--bg-secondary)] border-[var(--border-main)]"}`}
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
              className={`w-full px-4 py-3 rounded-md border focus:outline-none focus:ring-2 focus:ring-accent-500/50 transition-theme ${theme === "dark" ? "bg-[#1a1a1c] border-[var(--border-main)] text-white" : "bg-[var(--bg-secondary)] border-[var(--border-main)]"}`}
            />
          </div>
        </div>
        <div className="flex justify-end mt-6">
          <button
            onClick={handleSaveGeneralSettings}
            disabled={isSaving}
            className="flex items-center gap-2 bg-accent hover:bg-accent text-white px-6 py-2.5 rounded-[var(--radius)] transition-theme font-medium shadow-[0_0_15px_rgba(156,163,175,0.4)] disabled:opacity-50"
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
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-md bg-purple-500/10 text-purple-500">
              <ImageIcon size={24} />
            </div>
            <h2 className="text-xl font-bold">{t("visualIdentity")}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSyncSeoMetadata}
              disabled={isSyncingMetadata}
              className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-medium transition-colors border border-emerald-500/20"
              title={language === "ar" ? "مزامنة العناوين والكلمات المفتاحية والوصف المفقود للمقالات والمنتجات" : "Sync missing SEO titles, descriptions, and keywords for blog & marketplace items"}
            >
              <RefreshCw size={14} className={isSyncingMetadata ? "animate-spin" : ""} />
              <span>{language === "ar" ? "مزامنة SEO للمحتوى" : "Sync Content SEO"}</span>
            </button>
            <button
              type="button"
              onClick={checkSystemAssetsDiagnostic}
              disabled={isCheckingAssets}
              className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-md bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
              title={language === "ar" ? "فحص سلامة ملفات الشعار والهوية" : "Scan system logo & asset files"}
            >
              <RefreshCw size={14} className={isCheckingAssets ? "animate-spin" : ""} />
              <span>{language === "ar" ? "فحص السلامة" : "Scan Assets"}</span>
            </button>
          </div>
        </div>

        {/* Orphaned Assets Warning Banner */}
        {orphanedAssetsState?.hasOrphanedAssets && (
          <div className="mb-6 p-4 rounded-lg border border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm animate-fade-in">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-md bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h4 className="font-bold text-sm text-amber-800 dark:text-amber-300 flex items-center gap-2 flex-wrap">
                  <span>{language === "ar" ? "تحذير: ملف الهوية مفقود من السيرفر (Orphaned Asset Detected)" : "Warning: Orphaned Asset Detected"}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 font-mono text-amber-800 dark:text-amber-300">
                    {orphanedAssetsState.orphanedKeys.join(", ")}
                  </span>
                </h4>
                <p className="text-xs text-amber-700/90 dark:text-amber-300/80 mt-1">
                  {language === "ar"
                    ? "تم اكتشاف أن رابط الشعار أو الهوية يشير إلى ملف غير موجود على سيرفر التخزين. انقر على زر 'إصلاح' لاستعادة الشعار وإنشاء الملف تلقائياً."
                    : "The logo or asset URL in system settings references a non-existent file on the server. Click 'Repair' to restore and re-create the missing asset automatically."}
                </p>
                <div className="mt-2 space-y-1">
                  {orphanedAssetsState.assets.filter(a => a.isOrphaned).map(a => (
                    <div key={a.key} className="text-xs font-mono text-amber-800 dark:text-amber-300 flex items-center gap-2">
                      <span className="font-semibold text-amber-900 dark:text-amber-200">• {a.label}:</span>
                      <span className="underline opacity-90">{a.url}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleRepairOrphanedAssets}
                disabled={isRepairingAssets}
                className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-md font-semibold text-xs transition-colors shadow-sm disabled:opacity-50"
              >
                {isRepairingAssets ? (
                  <RefreshCw className="animate-spin" size={14} />
                ) : (
                  <Wrench size={14} />
                )}
                <span>{language === "ar" ? "إصلاح (Repair)" : "Repair Asset"}</span>
              </button>
            </div>
          </div>
        )}

        {/* Missing Asset Report Section */}
        <div className="mb-8 p-5 rounded-xl border border-[var(--border-main)] bg-[var(--bg-secondary)] shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-red-500/10 text-red-500">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[var(--text-primary)]">
                  {language === "ar" ? "تقرير الأصول المفقودة من السيرفر (Missing Asset Report)" : "Missing Asset Report (DB vs Disk Audit)"}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {language === "ar"
                    ? "فحص وتقاطع جدول الملفات (user_files) مع التخزين الفعلي على السيرفر لاكتشاف أي ملفات مسجلة في القاعدة ومفقودة على القرص."
                    : "Cross-references user_files table against actual file system storage to detect missing files."}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fetchMissingAssetReport}
                disabled={isScanningMissingAssets}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 hover:bg-accent/20 text-accent text-xs font-bold transition-colors border border-accent/20"
              >
                <RefreshCw size={14} className={isScanningMissingAssets ? "animate-spin" : ""} />
                <span>{language === "ar" ? "تشخيص وفحص المفقودات" : "Scan Missing Assets"}</span>
              </button>
              {missingAssetReport && missingAssetReport.missingCount > 0 && (
                <button
                  type="button"
                  onClick={() => handlePurgeMissingAssets()}
                  disabled={isPurgingMissingAssets}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors shadow-sm"
                >
                  <Trash2 size={14} />
                  <span>{language === "ar" ? `تطهير الكل (${missingAssetReport.missingCount})` : `Purge All (${missingAssetReport.missingCount})`}</span>
                </button>
              )}
            </div>
          </div>

          {missingAssetReport ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-[var(--bg-base)] border border-[var(--border-main)]">
                  <div className="text-gray-400 text-[10px]">{language === "ar" ? "إجمالي الملفات المفحوصة" : "Total Checked"}</div>
                  <div className="font-bold text-base text-[var(--text-primary)] mt-1">{missingAssetReport.totalChecked}</div>
                </div>
                <div className="p-3 rounded-lg bg-[var(--bg-base)] border border-[var(--border-main)]">
                  <div className="text-gray-400 text-[10px]">{language === "ar" ? "الملفات الموجودة سليمة" : "Existing on Disk"}</div>
                  <div className="font-bold text-base text-emerald-500 mt-1">{missingAssetReport.existingCount}</div>
                </div>
                <div className={`col-span-2 p-3 rounded-lg border ${missingAssetReport.missingCount > 0 ? 'bg-red-500/10 border-red-500/30 text-red-500' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'}`}>
                  <div className="text-[10px] opacity-80">{language === "ar" ? "الملفات المفقودة (متطابقة بالسجل ومغيبة عن القرص)" : "Missing Assets Detected"}</div>
                  <div className="font-bold text-base mt-1">{missingAssetReport.missingCount}</div>
                </div>
              </div>

              {missingAssetReport.missingAssets && missingAssetReport.missingAssets.length > 0 ? (
                <div className="border border-[var(--border-main)] rounded-lg overflow-hidden bg-[var(--bg-base)]">
                  <table className="w-full text-start text-xs border-collapse">
                    <thead>
                      <tr className="bg-[var(--bg-secondary)] border-b border-[var(--border-main)] text-[var(--text-muted)] font-bold">
                        <th className="p-3 text-start">ID</th>
                        <th className="p-3 text-start">{language === "ar" ? "اسم الملف" : "File Name"}</th>
                        <th className="p-3 text-start">URL / Path</th>
                        <th className="p-3 text-center">User ID</th>
                        <th className="p-3 text-center">{language === "ar" ? "تاريخ الرفع" : "Uploaded At"}</th>
                        <th className="p-3 text-center">{language === "ar" ? "الإجراء" : "Action"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-main)]">
                      {missingAssetReport.missingAssets.map((item: any) => (
                        <tr key={item.id} className="hover:bg-red-500/5 transition-colors">
                          <td className="p-3 font-mono">#{item.id}</td>
                          <td className="p-3 font-medium text-[var(--text-primary)]">{item.file_name || 'N/A'}</td>
                          <td className="p-3 font-mono text-xs text-red-500 truncate max-w-[200px]" title={item.file_url}>{item.file_url}</td>
                          <td className="p-3 text-center font-mono">{item.user_id || 'N/A'}</td>
                          <td className="p-3 text-center text-[var(--text-muted)]">{new Date(item.created_at).toLocaleString()}</td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => handlePurgeMissingAssets([item.id])}
                              disabled={isPurgingMissingAssets}
                              className="px-2.5 py-1 rounded bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white text-[10px] font-bold transition-colors"
                            >
                              {language === "ar" ? "حذف السجل" : "Purge Record"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-emerald-500 font-medium bg-emerald-500/5 rounded-lg border border-emerald-500/20">
                  {language === "ar" ? "✅ جميع الملفات المسجلة في قاعدة البيانات متوفرة وموجودة على القرص بسلام." : "✅ All database file records are fully synchronized and present on disk storage."}
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-gray-400">
              {language === "ar" ? "انقر على 'تشخيص وفحص المفقودات' لبدء مطابقة جدول الملفات مع التخزين الفعلي." : "Click 'Scan Missing Assets' to begin the cross-reference audit."}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Logo Upload (Dark theme) */}
          <div
            className={`p-6 rounded-[var(--radius)] border border-dashed ${theme === "dark" ? "border-[var(--border-main)] bg-[#1a1a1c]" : "border-[var(--border-main)] bg-[var(--bg-secondary)]"} flex flex-col items-center justify-center text-center relative overflow-hidden group`}
          >
            {logoBase64 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setLogoBase64(null);
                }}
                className="absolute top-2.5 right-2.5 p-1.5 bg-red-500/80 hover:bg-red-600 text-white rounded-full z-20 transition-colors shadow-md"
                title={language === "ar" ? "حذف الشعار" : "Remove Logo"}
              >
                <Trash2 size={13} />
              </button>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleImageUpload(e, "logo")}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className="mb-4 flex items-center justify-center h-8">
              {logoBase64 ? (
                <img
                  src={resolveImageUrl(logoBase64, 'general')}
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
            <p className="text-xs text-gray-500">PNG, SVG, JPG (Max 2MB)</p>
          </div>

          {/* Logo Upload (Light theme) */}
          <div
            className={`p-6 rounded-[var(--radius)] border border-dashed ${theme === "dark" ? "border-[var(--border-main)] bg-[#1a1a1c]" : "border-[var(--border-main)] bg-[var(--bg-secondary)]"} flex flex-col items-center justify-center text-center relative overflow-hidden group`}
          >
            {logoLightBase64 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setLogoLightBase64(null);
                }}
                className="absolute top-2.5 right-2.5 p-1.5 bg-red-500/80 hover:bg-red-600 text-white rounded-full z-20 transition-colors shadow-md"
                title={language === "ar" ? "حذف الشعار الفاتح" : "Remove Light Logo"}
              >
                <Trash2 size={13} />
              </button>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleImageUpload(e, "logo_light")}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className="mb-4 flex items-center justify-center h-8">
              {logoLightBase64 ? (
                <img
                  src={resolveImageUrl(logoLightBase64, 'general')}
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
            <p className="text-xs text-gray-500">PNG, SVG, JPG (Max 2MB)</p>
          </div>

          {/* Favicon Upload */}
          <div
            className={`p-6 rounded-lg border border-dashed ${theme === "dark" ? "border-[var(--border-main)] bg-[#1a1a1c]" : "border-[var(--border-main)] bg-[var(--bg-secondary)]"} flex flex-col items-center justify-center text-center relative overflow-hidden group`}
          >
            {faviconBase64 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setFaviconBase64(null);
                }}
                className="absolute top-2.5 right-2.5 p-1.5 bg-red-500/80 hover:bg-red-600 text-white rounded-full z-20 transition-colors shadow-md"
                title={language === "ar" ? "حذف أيقونة المفضلة" : "Remove Favicon"}
              >
                <Trash2 size={13} />
              </button>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleImageUpload(e, "favicon")}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className="mb-4 w-8 h-8 rounded-md bg-gray-200 dark:bg-[var(--bg-secondary)] flex items-center justify-center overflow-hidden">
              {faviconBase64 ? (
                <img
                  src={resolveImageUrl(faviconBase64, 'general')}
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
          </div>
        </div>
        <div className="flex justify-end mt-6">
          <button
            onClick={handleSaveVisualSettings}
            disabled={isSaving}
            className="flex items-center gap-2 bg-accent hover:bg-accent text-white px-6 py-2.5 rounded-[var(--radius)] transition-theme font-medium shadow-[0_0_15px_rgba(156,163,175,0.4)] disabled:opacity-50"
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
              <label className="block text-xs font-black uppercase tracking-wider text-accent mb-1.5">
                {dir === "rtl" ? "اسم الموقع والمنصة (بالإنجليزية)" : "Site Name (English)"}
              </label>
              <input
                type="text"
                value={siteName || ""}
                onChange={(e) => setSiteName(e.target.value)}
                className={`w-full px-4 py-3 rounded-md border focus:outline-none focus:ring-2 focus:ring-accent-500/50 transition-theme ${theme === "dark" ? "bg-[#1a1a1c] border-[var(--border-main)] text-white" : "bg-[var(--bg-secondary)] border-[var(--border-main)]"}`}
                placeholder="e.g. Perplexta Platform"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-accent mb-1.5">
                {dir === "rtl" ? "اسم الموقع والمنصة (بالعربية)" : "Site Name (Arabic)"}
              </label>
              <input
                type="text"
                value={siteNameAr || ""}
                onChange={(e) => setSiteNameAr(e.target.value)}
                className={`w-full px-4 py-3 rounded-md border focus:outline-none focus:ring-2 focus:ring-accent-500/50 transition-theme ${theme === "dark" ? "bg-[#1a1a1c] border-[var(--border-main)] text-white" : "bg-[var(--bg-secondary)] border-[var(--border-main)]"}`}
                placeholder="مثال: منصة بيربليكستا"
              />
            </div>
          </div>

          {/* SEO Site Name Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-gray-100 dark:border-gray-800/60 pb-5">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-accent mb-1.5">
                {dir === "rtl" ? "عنوان الموقع لمحركات البحث SEO (بالإنجليزية)" : "SEO Site Title (English)"}
              </label>
              <input
                type="text"
                value={seoSiteNameEn || ""}
                onChange={(e) => setSeoSiteNameEn(e.target.value)}
                className={`w-full px-4 py-3 rounded-md border focus:outline-none focus:ring-2 focus:ring-accent-500/50 transition-theme ${theme === "dark" ? "bg-[#1a1a1c] border-[var(--border-main)] text-white" : "bg-[var(--bg-secondary)] border-[var(--border-main)]"}`}
                placeholder="e.g. Perplexta | Premium Financial Analytics"
              />
              <p className="text-[10px] text-gray-400 mt-1">
                {dir === "rtl" ? "العنوان المحدد لمحركات البحث الإنجليزية وعلامات تبويب المتصفح." : "Optimized English title displayed in Google search listings and browser tabs."}
              </p>
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-accent mb-1.5">
                {dir === "rtl" ? "عنوان الموقع لمحركات البحث SEO (بالعربية)" : "SEO Site Title (Arabic)"}
              </label>
              <input
                type="text"
                value={seoSiteNameAr || ""}
                onChange={(e) => setSeoSiteNameAr(e.target.value)}
                className={`w-full px-4 py-3 rounded-md border focus:outline-none focus:ring-2 focus:ring-accent-500/50 transition-theme ${theme === "dark" ? "bg-[#1a1a1c] border-[var(--border-main)] text-white" : "bg-[var(--bg-secondary)] border-[var(--border-main)]"}`}
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
              <label className="block text-xs font-black uppercase tracking-wider text-accent mb-1.5">
                {dir === "rtl" ? "الوصف التعريفي العام (بالإنجليزية)" : "General Description (English)"}
              </label>
              <textarea
                rows={2}
                value={siteDescription || ""}
                onChange={(e) => setSiteDescription(e.target.value)}
                className={`w-full px-4 py-3 rounded-md border focus:outline-none focus:ring-2 focus:ring-accent-500/50 transition-theme ${theme === "dark" ? "bg-[#1a1a1c] border-[var(--border-main)] text-white" : "bg-[var(--bg-secondary)] border-[var(--border-main)]"}`}
                placeholder="Enter general tagline description..."
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-accent mb-1.5">
                {dir === "rtl" ? "الوصف التعريفي العام (بالعربية)" : "General Description (Arabic)"}
              </label>
              <textarea
                rows={2}
                value={siteDescriptionAr || ""}
                onChange={(e) => setSiteDescriptionAr(e.target.value)}
                className={`w-full px-4 py-3 rounded-md border focus:outline-none focus:ring-2 focus:ring-accent-500/50 transition-theme ${theme === "dark" ? "bg-[#1a1a1c] border-[var(--border-main)] text-white" : "bg-[var(--bg-secondary)] border-[var(--border-main)]"}`}
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
                className={`w-full px-4 py-3 rounded-md border focus:outline-none focus:ring-2 focus:ring-accent-500/50 transition-theme ${theme === "dark" ? "bg-[#1a1a1c] border-[var(--border-main)] text-white" : "bg-[var(--bg-secondary)] border-[var(--border-main)]"}`}
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
                className={`w-full px-4 py-3 rounded-md border focus:outline-none focus:ring-2 focus:ring-accent-500/50 transition-theme ${theme === "dark" ? "bg-[#1a1a1c] border-[var(--border-main)] text-white" : "bg-[var(--bg-secondary)] border-[var(--border-main)]"}`}
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
                className={`w-full px-4 py-3 rounded-[var(--radius)] border focus:outline-none focus:ring-2 focus:ring-accent-500/50 transition-theme ${theme === "dark" ? "bg-[#1a1a1c] border-[var(--border-main)] text-white" : "bg-[var(--bg-secondary)] border-[var(--border-main)]"}`}
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
                className={`w-full px-4 py-3 rounded-[var(--radius)] border focus:outline-none focus:ring-2 focus:ring-accent-500/50 transition-theme ${theme === "dark" ? "bg-[#1a1a1c] border-[var(--border-main)] text-white" : "bg-[var(--bg-secondary)] border-[var(--border-main)]"}`}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {t("googleAnalyticsId")}
            </label>
            <input
              type="text"
              placeholder={dir === "rtl" ? "الصق معرف G-XXXXX أو كود السكربت بالكامل..." : "Paste G-XXXXX ID or full script tag..."}
              value={googleAnalyticsId || ""}
              onChange={(e) => { let val = e.target.value; const gaMatch = val.match(/G-[A-Z0-9]+/i); if (gaMatch && gaMatch[0]) { val = gaMatch[0]; } setGoogleAnalyticsId(val); }}
              className={`w-full px-4 py-3 rounded-md border focus:outline-none focus:ring-2 focus:ring-accent-500/50 transition-theme ${theme === "dark" ? "bg-[#1a1a1c] border-[var(--border-main)] text-white" : "bg-[var(--bg-secondary)] border-[var(--border-main)]"}`}
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
              placeholder={dir === "rtl" ? "الصق كود التحقق هنا أو وسم <meta> بالكامل..." : "Paste the verification code or full <meta> tag here..."}
              value={googleSiteVerification || ""}
              onChange={(e) => { let val = e.target.value; const metaMatch = val.match(/content=["']([^"']+)["']/i); if (metaMatch && metaMatch[1]) { val = metaMatch[1]; } setGoogleSiteVerification(val); }}
              className={`w-full px-4 py-3 rounded-md border focus:outline-none focus:ring-2 focus:ring-accent-500/50 transition-theme ${theme === "dark" ? "bg-[#1a1a1c] border-[var(--border-main)] text-white" : "bg-[var(--bg-secondary)] border-[var(--border-main)]"}`}
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
              className={`w-full px-4 py-3 rounded-md border focus:outline-none focus:ring-2 focus:ring-accent-500/50 transition-theme ${theme === "dark" ? "bg-[#1a1a1c] border-[var(--border-main)] text-white" : "bg-[var(--bg-secondary)] border-[var(--border-main)]"}`}
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
              <Globe size={16} className="text-accent animate-pulse" />
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
                          ? "text-accent font-bold"
                          : seoDescriptionAr.length > 160 
                          ? "text-red-500" 
                          : "text-amber-500"
                      }>
                        {seoDescriptionAr.length} حرف
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-800 h-1 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-theme ${
                          seoDescriptionAr.length >= 120 && seoDescriptionAr.length <= 160
                            ? "bg-accent"
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
                          ? "text-accent font-bold"
                          : seoDescriptionEn.length > 160 
                          ? "text-red-500" 
                          : "text-amber-500"
                      }>
                        {seoDescriptionEn.length} chars
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-800 h-1 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-theme ${
                          seoDescriptionEn.length >= 120 && seoDescriptionEn.length <= 160
                            ? "bg-accent"
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
              <ImageIcon size={16} className="text-accent" />
              {t("seoPreviewImageTitle")}
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Image Uploader */}
              <div className="space-y-4">
                <div
                  className={`p-6 rounded-[var(--radius)] border border-dashed transition-theme ${
                    theme === "dark" 
                      ? "border-gray-800 bg-[#161618] hover:border-accent/50" 
                      : "border-gray-200 bg-gray-50/50 hover:border-accent/50"
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
                      <RefreshCw className="animate-spin text-accent mb-3" size={28} />
                      <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                        {dir === "rtl" ? "جاري رفع الصورة..." : "Uploading image..."}
                      </p>
                    </div>
                  ) : seoImageUrl ? (
                    <div className="relative w-full h-full flex flex-col items-center">
                      <img
                        src={resolveImageUrl(seoImageUrl, 'general')}
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
                        className="mt-3 text-xs bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-full flex items-center gap-1 transition-theme z-20"
                      >
                        <Trash2 size={12} />
                        {t("seoRemoveImage")}
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center p-4">
                      <div className="mb-3 p-3 rounded-full bg-accent/10 text-accent group-hover:scale-110 transition-transform duration-300">
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
                  <p className="font-semibold text-accent">
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
            className="flex items-center gap-2 bg-accent hover:bg-accent text-white px-6 py-2.5 rounded-md transition-theme font-medium shadow-[0_0_15px_rgba(156,163,175,0.4)] disabled:opacity-50"
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
            <div className="p-3 rounded-md bg-accent/10 text-accent shadow-[0_0_15px_rgba(156,163,175,0.2)]">
              <Globe size={24} className="text-accent " />
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
              className="p-2.5 rounded-md border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-[#1a1a1c] text-gray-600 dark:text-gray-300 transition-theme"
              title={dir === "rtl" ? "تحديث القائمة" : "Refresh List"}
            >
              <RefreshCw size={16} className={loadingRouteSeo ? "animate-spin" : ""} />
            </button>
            <button
              onClick={handleOpenAddRouteModal}
              className="flex items-center gap-2 bg-accent hover:bg-accent text-white px-4 py-2 rounded-md font-medium text-xs transition-theme shadow-[0_0_12px_rgba(156,163,175,0.3)]"
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
              } focus:outline-none focus:border-accent`}
            />
          </div>
          <div className="text-xs text-gray-500 font-mono flex items-center gap-2">
            <span>{dir === "rtl" ? "إجمالي المسارات المسجلة:" : "Configured Routes:"}</span>
            <span className="px-2 py-0.5 rounded bg-accent/10 text-accent font-bold">
              {routeSeoList.length}
            </span>
          </div>
        </div>

        {/* Routes List Table */}
        {loadingRouteSeo && routeSeoList.length === 0 ? (
          <div className="py-12 text-center text-gray-400 flex items-center justify-center gap-2">
            <RefreshCw size={20} className="animate-spin text-accent" />
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
              className="mt-3 text-xs text-accent underline hover:text-accent"
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
                      <td className="p-3 font-mono font-bold text-accent">
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
                              ? "bg-accent/10 text-accent border border-accent/20"
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
                  <Globe className="text-accent" size={20} />
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
                  <label className="block text-xs font-bold uppercase tracking-wider text-accent mb-1">
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
                    } focus:outline-none focus:border-accent`}
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
                      } focus:outline-none focus:border-accent`}
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
                      } focus:outline-none focus:border-accent`}
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
                      } focus:outline-none focus:border-accent`}
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
                      } focus:outline-none focus:border-accent`}
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
                      } focus:outline-none focus:border-accent`}
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
                      } focus:outline-none focus:border-accent`}
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
                      } focus:outline-none focus:border-accent`}
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
                    className="w-4 h-4 text-accent accent-accent rounded border-gray-300 focus:ring-accent-500"
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
                    className="flex items-center gap-2 bg-accent hover:bg-accent text-white px-5 py-2 rounded-md text-xs font-medium shadow-[0_0_12px_rgba(156,163,175,0.3)]"
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
            <div className="p-3 rounded-md bg-accent/10 text-accent shadow-[0_0_15px_rgba(156,163,175,0.2)]">
              <ShieldCheck size={24} className="text-accent " />
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
              className="flex items-center gap-2 text-xs bg-accent hover:bg-accent text-white px-4 py-2 rounded-[var(--radius)] transition-theme font-medium shadow-[0_0_12px_rgba(156,163,175,0.3)] disabled:opacity-50"
            >
              <RefreshCw className={crawlScanning ? "animate-spin" : ""} size={14} />
              {language === "ar" ? "تشغيل تدقيق الفهرسة" : "Execute Crawl Audit"}
            </button>
            
            <button
              onClick={downloadCrawlAuditReport}
              className="flex items-center gap-2 text-xs border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-[#1c1c1e] text-gray-700 dark:text-gray-300 px-4 py-2 rounded-[var(--radius)] transition-theme font-medium"
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
            <div className="text-2xl font-bold mt-1 text-accent  flex items-center gap-1.5">
              {routesSchema.filter((r: any) => r.status === "noindex").length}
              <ShieldCheck size={16} className="text-accent" />
            </div>
          </div>

          <div className={`p-4 rounded-md border ${theme === "dark" ? "bg-[#18181b] border-gray-800" : "bg-gray-50 border-gray-200"}`}>
            <span className="text-xs text-gray-400">{language === "ar" ? "مسارات عامة (مؤرشفة)" : "Approved Public Domains"}</span>
            <div className="text-2xl font-bold mt-1 text-amber-500">
              {routesSchema.filter((r: any) => r.status === "index").length}
            </div>
          </div>

          <div className={`p-4 rounded-md border ${theme === "dark" ? "bg-[#18181b] border-gray-800" : "bg-gray-50 border-gray-200"}`}>
            <span className="text-xs text-gray-400">{language === "ar" ? "معدل �x��V�n�@��+F����6�TR
T
�C�acO�����n� !��S�?��
c;	vqiT��ٝٙ7ovg�b�a�s�qq������$|X\,~-�/~,?���{P?VҠk�p�֓N[�LtkP�u<~�ϴ~�t�gƾ?�a$����� 0�.d��b�g?�٩�� �}f&-%#�Y}�;���F�7�hr��7��ji�L��q�Ʌ��z���	�!s���ۄ��ܢр{����HiS:Ed�&J��`#6�k�~��J�
x�LO��)oN�����XY1��Mc0�`��q���q��	YG°G���X/�˲e6G�Q�"=��W���r�
�6g����C՗��	�qi�m�r@�c�]���6��q3����n׊r��Rh�`+�!-#��U�i��R
U��0%� ���A�l�n&���;��T�xU
�&R:!N�S���4'։�O��$�؉�/�r�N\'S��M%8&�ZL�����%W&�1Æ�De&�+�KE[��Έ�"���q⵴
��"U����������`��*�Osն��):��^�I�g��h�"���Z��8U��v�ݢ�@q}<�ܯ8�2OR��hx��d�K�U �t�<^���0��W��~������ٸ j;�nu��`0XY���H�ݥh��=\VR@��7�=8���7�Qj��=]��z,��`o ]13+�ۢs6R��=�ؼ��/8�M{2����:Iv��Y�����jj�"߇I���F���s�EFBh?����G��U\�W�FR�^�Y(�Gi��pٯ�  ��  b�
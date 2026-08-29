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
  Check,
  Link2,
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
import { ReferralDashboardView } from "./ReferralDashboardView";
import { AdsManagementView } from "./AdsManagementView";
import { UserManagementView } from "./UserManagementView";
import { AdminRateLimitMetricsView } from "./AdminRateLimitMetricsView";
import { AdminRenderMetricsView } from "../components/AdminRenderMetricsView";
import { SeoCenterView } from "../components/SeoCenterView";
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

  const [copiedDbId, setCopiedDbId] = useState<string | null>(null);

  const parseUriToFields = (uri: string) => {
    try {
      let clean = (uri || "").trim();
      if (!clean) return null;
      if (!/^postgres(ql)?:\/\//i.test(clean)) {
        clean = "postgresql://" + clean;
      }
      const parsed = new URL(clean);
      return {
        host: parsed.hostname || "",
        port: parsed.port || "5432",
        username: parsed.username ? decodeURIComponent(parsed.username) : "",
        password: parsed.password ? decodeURIComponent(parsed.password) : "",
        db_name: parsed.pathname ? parsed.pathname.replace(/^\//, "") : "",
      };
    } catch {
      return null;
    }
  };

  const buildUriFromDb = (db: any, overrideField?: string, overrideValue?: any) => {
    const d = { ...db, ...(overrideField ? { [overrideField]: overrideValue } : {}) };
    const host = (d.host || "localhost").trim();
    const port = (d.port || "5432").trim();
    const defaultDbName =
      d.id === "ledger"
        ? "platform_ledger"
        : d.id === "external"
        ? "platform_external"
        : d.id === "security"
        ? "platform_security"
        : "platform_core";
    const dbName = (d.db_name || d.dbName || defaultDbName).trim();
    const username = (d.username || "postgres").trim();
    const userPart = encodeURIComponent(username);
    const passPart = d.password ? ":" + encodeURIComponent(d.password) : "";
    let uri = "postgresql://" + userPart + passPart + "@" + host + ":" + port + "/" + dbName;
    if (d.ssl_mode && d.ssl_mode !== "disable") {
      uri += "?sslmode=" + d.ssl_mode;
    }
    return uri;
  };

  const handleFillDefaultLocalUri = (dbId: string) => {
    const defaultDbName =
      dbId === "ledger"
        ? "platform_ledger"
        : dbId === "external"
        ? "platform_external"
        : dbId === "security"
        ? "platform_security"
        : "platform_core";
    const defaultUri = "postgresql://postgres:postgres@localhost:5432/" + defaultDbName;
    setDatabases((dbs) =>
      dbs.map((d) => {
        if (d.id === dbId) {
          return {
            ...d,
            host: "localhost",
            port: "5432",
            username: "postgres",
            password: "postgres",
            db_name: defaultDbName,
            connection_string: defaultUri,
            connectionTested: false,
          };
        }
        return d;
      })
    );
    showToast(
      language === "ar"
        ? "تم توليد وتعبئة الرابط المحلي الافتراضي"
        : "Default local URI generated",
      "success"
    );
  };

  const handleCopyUri = (db: any) => {
    const uri = db.connection_string || buildUriFromDb(db);
    if (!uri) return;
    navigator.clipboard.writeText(uri);
    setCopiedDbId(db.id);
    setTimeout(() => setCopiedDbId(null), 2000);
    showToast(t("copyUriSuccess") || "URI copied to clipboard", "success");
  };
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
      "type",
      "localInputMode",
    ];
    setDatabases((dbs) =>
      dbs.map((db) => {
        if (db.id === id) {
          const isConnectionField = connectionFields.includes(field);
          const updated: any = {
            ...db,
            [field]: value,
            connectionTested: isConnectionField ? false : db.connectionTested,
          };

          if (field === "connection_string" && typeof value === "string") {
            const parsed = parseUriToFields(value);
            if (parsed) {
              if (parsed.host) updated.host = parsed.host;
              if (parsed.port) updated.port = parsed.port;
              if (parsed.username) updated.username = parsed.username;
              if (parsed.password) updated.password = parsed.password;
              if (parsed.db_name) updated.db_name = parsed.db_name;
            }
          } else if (
            ["host", "port", "username", "password", "db_name"].includes(field) &&
            db.type === "local"
          ) {
            updated.connection_string = buildUriFromDb(db, field, value);
          }

          return updated;
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
                    {db.isTesting && (
                      <div className="absolute inset-0 bg-[var(--bg-secondary)]/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center space-y-3 animate-in fade-in">
                        <RefreshCw size={24} className="text-blue-500 animate-spin" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-500 animate-pulse">
                          {t("dbTestRunning") || (language === "ar" ? "جاري فحص الاتصال (Pre-flight)..." : "Running Pre-flight Check...")}
                        </span>
                      </div>
                    )}
                    <div className="absolute top-0 right-0 p-2 opacity-10 pointer-events-none">
                      <Terminal size={40} className="text-blue-500" />
                    </div>

                    {/* Header with Mode switcher & Action buttons */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-500/10 pb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_5px_rgba(59,130,246,1)]"></div>
                        <label className="text-[10px] uppercase text-blue-500 font-black tracking-[0.2em] flex items-center gap-1.5">
                          <Link2 size={12} className="text-blue-500" />
                          {t("localConnectionStringTitle")}
                        </label>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleFillDefaultLocalUri(db.id)}
                          className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold rounded-sm bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 border border-blue-500/20 transition-theme cursor-pointer"
                          title={t("fillDefaultLocalUri")}
                        >
                          <Sparkles size={12} />
                          <span>{t("fillDefaultLocalUri")}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCopyUri(db)}
                          className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded-sm bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-main)] transition-theme cursor-pointer"
                          title="Copy URI"
                        >
                          {copiedDbId === db.id ? (
                            <Check size={12} className="text-emerald-500" />
                          ) : (
                            <Copy size={12} />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* View mode toggle: URI or Fields */}
                    <div className="flex items-center gap-2 bg-[var(--bg-primary)] p-1 rounded-sm border border-[var(--border-main)]">
                      <button
                        type="button"
                        onClick={() => handleChange(db.id, "localInputMode", "uri")}
                        className={`flex-1 py-1 px-2 text-[10px] font-bold rounded-xs transition-theme cursor-pointer ${
                          (db.localInputMode || "uri") === "uri"
                            ? "bg-blue-600 text-white shadow-xs"
                            : "text-gray-400 hover:text-[var(--text-primary)]"
                        }`}
                      >
                        {t("localConnectionModeUrl")}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleChange(db.id, "localInputMode", "fields")}
                        className={`flex-1 py-1 px-2 text-[10px] font-bold rounded-xs transition-theme cursor-pointer ${
                          db.localInputMode === "fields"
                            ? "bg-blue-600 text-white shadow-xs"
                            : "text-gray-400 hover:text-[var(--text-primary)]"
                        }`}
                      >
                        {t("localConnectionModeFields")}
                      </button>
                    </div>

                    {(db.localInputMode || "uri") === "uri" ? (
                      <div className="space-y-2">
                        <div className="relative">
                          <textarea
                            rows={2}
                            placeholder="postgresql://postgres:password@localhost:5432/platform_core"
                            className={`w-full p-3 rounded-sm border bg-[var(--bg-primary)] border-[var(--border-main)] text-[var(--text-primary)] text-xs font-mono resize-none focus:border-blue-500/50 outline-none transition-theme shadow-sm leading-relaxed ${
                              db.showConnectionString ? "" : "blur-[2.5px] select-none"
                            }`}
                            value={db.connection_string || ""}
                            onChange={(e) =>
                              handleChange(db.id, "connection_string", e.target.value)
                            }
                          />
                          <button
                            type="button"
                            onClick={() =>
                              handleChange(
                                db.id,
                                "showConnectionString",
                                !db.showConnectionString,
                              )
                            }
                            className="absolute top-2 right-2 text-blue-500/60 hover:text-blue-500 p-1 bg-[var(--bg-primary)] rounded-xs border border-[var(--border-main)] cursor-pointer"
                          >
                            {db.showConnectionString ? <EyeOff size={13} /> : <Eye size={13} />}
                          </button>
                        </div>

                        {/* Auto-detected metadata badges */}
                        <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono text-[var(--text-secondary)]">
                          <span className="px-2 py-0.5 rounded-xs bg-[var(--bg-primary)] border border-[var(--border-main)]">
                            Host: <strong className="text-blue-500">{db.host || "localhost"}</strong>
                          </span>
                          <span className="px-2 py-0.5 rounded-xs bg-[var(--bg-primary)] border border-[var(--border-main)]">
                            Port: <strong className="text-blue-500">{db.port || "5432"}</strong>
                          </span>
                          <span className="px-2 py-0.5 rounded-xs bg-[var(--bg-primary)] border border-[var(--border-main)]">
                            User: <strong className="text-blue-500">{db.username || "postgres"}</strong>
                          </span>
                          <span className="px-2 py-0.5 rounded-xs bg-[var(--bg-primary)] border border-[var(--border-main)]">
                            DB: <strong className="text-blue-500">{db.db_name || db.dbName || "default"}</strong>
                          </span>
                        </div>
                      </div>
                    ) : (
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
                              type="button"
                              onClick={() =>
                                handleChange(
                                  db.id,
                                  "showPassword",
                                  !db.showPassword,
                                )
                              }
                              className="text-blue-500/60 hover:text-blue-500 transition-theme p-1 cursor-pointer"
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
                    )}

                    {/* Container & Local Connection Guidance Box */}
                    <div className="p-3 rounded-sm bg-blue-500/5 border border-blue-500/15 flex items-start gap-2.5 text-[11px] text-[var(--text-secondary)]">
                      <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
                      <div className="space-y-1 leading-relaxed">
                        <p className="font-bold text-[var(--text-primary)]">
                          {language === "ar" ? "إرشادات الربط السريع لقاعدة البيانات المحلية:" : "Local Database Connectivity Guide:"}
                        </p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">
                          {t("localContainerHint")}
                        </p>
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

const PlansSubscriptionsView = ({
  theme,
  t,
  dir,
}: {
  theme: string;
  t: (key: string, replacements?: any) => string;
  dir: string;
}) => {
  const confirm = useConfirm();
  const { plans, setPlans, token, language, setIsOperationPending } = useAppContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [planFilter, setPlanFilter] = useState<string>("all");

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
        color: "#334155",
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
    const isConfirmed = await confirm({ title: t("deletePlanConfirm"), description: "", variant: "danger" as const });
    if (!isConfirmed) return;

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

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 pb-4">
        <button
          onClick={() => setPlanFilter("all")}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
            planFilter === "all"
              ? "bg-accent text-black shadow-lg shadow-none"
              : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
          }`}
        >
          <CreditCard size={14} />
          {dir === "rtl" ? "جميع الخطط" : "All Plans"} ({plans.length})
        </button>
        <button
          onClick={() => setPlanFilter("user")}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
            planFilter === "user"
              ? "bg-accent text-black shadow-lg shadow-none"
              : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
          }`}
        >
          <Users size={14} />
          {dir === "rtl" ? "خطط المستخدمين العاديين" : "User Plans"} ({plans.filter(p => (p.planType || "user") === "user").length})
        </button>
        <button
          onClick={() => setPlanFilter("developer")}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
            planFilter === "developer"
              ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20"
              : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
          }`}
        >
          <Terminal size={14} />
          {dir === "rtl" ? "خطط المطورين والوكلاء" : "Developer Plans"} ({plans.filter(p => (p.planType || "user") === "developer").length})
        </button>
      </div>

      {/* Grouped Plans View */}
      <div className="space-y-10">
        {/* User Plans Section */}
        {(planFilter === "all" || planFilter === "user") && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-accent/20 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
                  <Users size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    {dir === "rtl" ? "خطط المستخدمين العاديين" : "Standard User Plans"}
                    <span className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent font-mono font-bold">
                      {plans.filter(p => (p.planType || "user") === "user").length}
                    </span>
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {dir === "rtl" ? "خطط الاشتراكات المخصصة للمستخدمين والأفراد للاستخدام اليومي" : "Subscription plans tailored for end users and standard usage"}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {plans
                .filter(p => (p.planType || "user") === "user")
                .map((plan) => (
                  <div
                    key={plan.id}
                    className={`p-6 rounded-xl border transition-all relative overflow-hidden flex flex-col ${
                      theme === "dark"
                        ? "bg-[#111113] border-gray-800 hover:border-accent/40"
                        : "bg-white border-gray-200 hover:border-accent shadow-sm"
                    }`}
                  >
                    {/* Top Color Accent */}
                    <div
                      className="absolute top-0 left-0 right-0 h-1"
                      style={{ backgroundColor: plan.color || "#334155" }}
                    ></div>

                    {/* Badge */}
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-md flex items-center gap-1.5 uppercase tracking-wider bg-accent/10 text-accent border border-accent/20">
                        <Users size={12} />
                        {dir === "rtl" ? "مستخدم عام" : "Standard User"}
                      </span>
                      <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${plan.isActive ? "bg-accent/10 text-accent" : "bg-gray-500/10 text-gray-500"}`}>
                        {plan.isActive ? (dir === "rtl" ? "نشط" : "Active") : (dir === "rtl" ? "متوقف" : "Inactive")}
                      </span>
                    </div>

                    <div className="flex justify-between items-start mb-4 mt-1">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: plan.color || "#334155" }}
                          ></span>
                          {dir === "rtl" ? plan.nameAr : plan.nameEn}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {dir === "rtl" ? plan.descAr : plan.descEn}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-accent">
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
                            className="text-accent shrink-0 mt-0.5"
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
                              <span className="text-accent font-extrabold">{t(key)}</span>
                              <span className="font-mono text-[8px]">
                                {daily !== undefined && daily !== null && (
                                  <>D: <strong className="text-gray-900 dark:text-white">{formatLimit(daily)}</strong></>
                                )}
                                {monthly !== null && monthly !== 0 && monthly !== undefined && (
                                  <>; M: <strong className="text-accent">{formatLimit(monthly)}</strong></>
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
          </div>
        )}

        {/* Developer Plans Section */}
        {(planFilter === "all" || planFilter === "developer") && (
          <div className="space-y-4 pt-4 border-t border-gray-200/60 dark:border-gray-800/60">
            <div className="flex items-center justify-between border-b border-indigo-500/20 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Terminal size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    {dir === "rtl" ? "خطط المطورين والوكلاء الذكية" : "Developer & Agent API Plans"}
                    <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 font-mono font-bold">
                      {plans.filter(p => (p.planType || "user") === "developer").length}
                    </span>
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {dir === "rtl" ? "خطط متخصصة للمطورين وبناء الوكلاء والربط البرمجي عالي السعة" : "Dedicated plans for developer API access, AI agents, and custom integrations"}
                  </p>
                </div>
              </div>
            </div>

            {plans.filter(p => (p.planType || "user") === "developer").length === 0 ? (
              <div className="p-8 rounded-xl border border-dashed border-indigo-500/30 bg-indigo-500/5 text-center">
                <Terminal className="mx-auto w-8 h-8 text-indigo-400 mb-2 opacity-60" />
                <p className="text-xs text-gray-400 font-medium">
                  {dir === "rtl" ? "لا توجد خطط مطورين حالياً. يمكنك إضافة خطة جديدة وتعيين نوعها كـ 'مطورين'." : "No developer plans found. Click 'Add Plan' and set type to 'Developer'."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {plans
                  .filter(p => (p.planType || "user") === "developer")
                  .map((plan) => (
                    <div
                      key={plan.id}
                      className={`p-6 rounded-xl border transition-all relative overflow-hidden flex flex-col ${
                        theme === "dark"
                          ? "bg-[#13121f] border-indigo-500/30 hover:border-indigo-500/60 shadow-[0_0_15px_rgba(99,102,241,0.08)]"
                          : "bg-indigo-50/30 border-indigo-200 hover:border-indigo-400 shadow-sm"
                      }`}
                    >
                      {/* Top Color Accent */}
                      <div
                        className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-500"
                      ></div>

                      {/* Badge */}
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-md flex items-center gap-1.5 uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          <Terminal size={12} />
                          {dir === "rtl" ? "مطور / API" : "Developer & API"}
                        </span>
                        <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${plan.isActive ? "bg-indigo-500/10 text-indigo-400" : "bg-gray-500/10 text-gray-500"}`}>
                          {plan.isActive ? (dir === "rtl" ? "نشط" : "Active") : (dir === "rtl" ? "متوقف" : "Inactive")}
                        </span>
                      </div>

                      <div className="flex justify-between items-start mb-4 mt-1">
                        <div>
                          <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: plan.color || "#6366f1" }}
                            ></span>
                            {dir === "rtl" ? plan.nameAr : plan.nameEn}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {dir === "rtl" ? plan.descAr : plan.descEn}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-indigo-400">
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
                              className="text-indigo-400 shrink-0 mt-0.5"
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

                      <div className="mb-6 pt-4 border-t border-indigo-500/10 dark:border-indigo-500/20">
                        <span className="text-[10px] font-black uppercase text-indigo-400/80 tracking-wider block mb-2">
                          {dir === "rtl" ? "حصص المطور والوكلاء الذكية" : "Developer & Agent Quotas"}
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
                                className="text-[9px] font-bold px-2 py-0.5 rounded border border-indigo-500/20 bg-indigo-500/5 flex items-center gap-1.5 text-gray-600 dark:text-gray-300"
                              >
                                <span className="text-indigo-400 font-extrabold">{t(key)}</span>
                                <span className="font-mono text-[8px]">
                                  {daily !== undefined && daily !== null && (
                                    <>D: <strong className="text-gray-900 dark:text-white">{formatLimit(daily)}</strong></>
                                  )}
                                  {monthly !== null && monthly !== 0 && monthly !== undefined && (
                                    <>; M: <strong className="text-indigo-400">{formatLimit(monthly)}</strong></>
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
                              ? "border-indigo-500/30 bg-[#1e1c30] hover:bg-indigo-900/40 text-indigo-200"
                              : "border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700"
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
            )}
          </div>
        )}
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
                    className="flex items-center gap-2 bg-accent hover:bg-accent text-white px-5 py-2 rounded-md transition-theme font-bold text-sm shadow-[0_5px_15px_rgba(156,163,175,0.3)] disabled:opacity-50"
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
                        className={`w-full h-11 px-3 rounded-md border ${theme === "dark" ? "bg-[#0f0f11] border-[var(--border-main)]/80 text-gray-300" : "bg-[var(--bg-secondary)] border-[var(--border-main)] text-gray-900"} focus:outline-none focus:border-accent/50 transition-theme appearance-none`}
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
                        className={`w-full h-11 px-3 rounded-md border ${theme === "dark" ? "bg-[#0f0f11] border-[var(--border-main)]/80 text-gray-300" : "bg-[var(--bg-secondary)] border-[var(--border-main)] text-gray-900"} focus:outline-none focus:border-accent/50 transition-theme text-center`}
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
                        className={`w-full h-11 px-3 rounded-md border ${theme === "dark" ? "bg-[#0f0f11] border-[var(--border-main)]/80 text-gray-300" : "bg-[var(--bg-secondary)] border-[var(--border-main)] text-gray-900"} focus:outline-none focus:border-accent/50 transition-theme appearance-none`}
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
                          value={editingPlan.color || "#334155"}
                          onChange={(e) =>
                            setEditingPlan({
                              ...editingPlan,
                              color: e.target.value,
                            })
                          }
                          className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent"
                        />
                        <span className="text-xs font-mono text-gray-500 uppercase">
                          {editingPlan.color || "#334155"}
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
                          className="w-4 h-4 rounded border-[var(--border-main)] text-accent focus:ring-accent-500 bg-[var(--bg-input)] dark:bg-[var(--bg-secondary)] dark:border-[var(--border-main)]"
                        />
                        <label
                          htmlFor="isActive"
                          className="text-xs font-bold text-accent cursor-pointer uppercase tracking-tighter"
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
                          className="w-4 h-4 rounded border-[var(--border-main)] text-accent focus:ring-accent-500 bg-[var(--bg-input)] dark:bg-[var(--bg-secondary)] dark:border-[var(--border-main)]"
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
                      <div className="flex gap-4 text-[10px] font-bold text-accent/80 uppercase tracking-widest bg-accent/5 px-2 py-0.5 rounded-full border border-accent/10">
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
                            className={`p-3 rounded-lg border ${theme === "dark" ? "bg-[#1a1a1c] border-[var(--border-main)]" : "bg-[var(--bg-secondary)] border-[var(--border-main)]"} transition-theme hover:border-accent/40 group relative overflow-hidden`}
                          >
                            <div className="flex justify-between items-center mb-2 px-1">
                              <span
                                className="text-[10px] font-bold text-gray-500 dark:text-gray-400 truncate group-hover:text-accent transition-theme uppercase tracking-widest"
                                title={key}
                              >
                                {t(key)}
                              </span>
                              <div className="flex gap-1">
                                <div
                                  className={`w-1.5 h-1.5 rounded-full ${isUnlimitedDaily || isUnlimitedMonthly ? "bg-accent animate-pulse" : "bg-gray-700"}`}
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
                                          ? "bg-accent/10 border-accent/30 text-accent font-bold text-xl"
                                          : theme === "dark"
                                            ? "bg-[#0f0f11] border-[var(--border-main)] text-gray-300"
                                            : "bg-white border-[var(--border-main)] text-gray-900"
                                      } focus:border-accent/50 cursor-pointer shadow-inner`}
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
                                        ? "bg-accent/10 border-accent/30 text-accent font-bold text-xl"
                                        : theme === "dark"
                                          ? "bg-[#0f0f11] border-[var(--border-main)] text-gray-300"
                                          : "bg-white border-[var(--border-main)] text-gray-900"
                                    } focus:border-accent/50 cursor-pointer shadow-inner`}
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
                          className={`w-full h-11 pl-8 pr-3 rounded-md border ${theme === "dark" ? "bg-[#0f0f11] border-[var(--border-main)]/80 text-gray-300" : "bg-[var(--bg-secondary)] border-[var(--border-main)] text-gray-900"} focus:outline-none focus:border-accent/50 transition-theme`}
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
                          className={`w-full h-11 pl-8 pr-3 rounded-md border ${theme === "dark" ? "bg-[#0f0f11] border-[var(--border-main)]/80 text-gray-300" : "bg-[var(--bg-secondary)] border-[var(--border-main)] text-gray-900"} focus:outline-none focus:border-accent/50 transition-theme`}
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
                        className={`w-full h-11 px-3 rounded-md border ${theme === "dark" ? "bg-[#0f0f11] border-[var(--border-main)]/80 text-gray-300" : "bg-[var(--bg-secondary)] border-[var(--border-main)] text-gray-900"} focus:outline-none focus:border-accent/50 transition-theme`}
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
                        className={`w-full h-11 px-3 rounded-md border ${theme === "dark" ? "bg-[#0f0f11] border-[var(--border-main)]/80 text-gray-300" : "bg-[var(--bg-secondary)] border-[var(--border-main)] text-gray-900"} focus:outline-none focus:border-accent/50 transition-theme`}
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
                        className={`w-full h-11 px-3 rounded-md border ${theme === "dark" ? "bg-[#0f0f11] border-[var(--border-main)]/80 text-gray-300" : "bg-[var(--bg-secondary)] border-[var(--border-main)] text-gray-900"} focus:outline-none focus:border-accent/50 transition-theme`}
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
                        className={`w-full h-11 px-3 rounded-md border ${theme === "dark" ? "bg-[#0f0f11] border-[var(--border-main)]/80 text-gray-300" : "bg-[var(--bg-secondary)] border-[var(--border-main)] text-gray-900"} focus:outline-none focus:border-accent/50 transition-theme`}
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
                            <span className="text-[10px] font-black text-accent uppercase tracking-wider">
                              {dir === "rtl" ? `ميزة #${index + 1}` : `Feature #${index + 1}`}
                            </span>
                            <button
                              onClick={() => removeFeature(feature.id)}
                              className="text-gray-400 hover:text-red-500 transition-theme"
                              title={dir === "rtl" ? "حذف الميزة" : "Remove Feature"}
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
                              } focus:outline-none focus:border-accent/50 transition-theme`}
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
                              } focus:outline-none focus:border-accent/50 transition-theme`}
                              dir="rtl"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={addFeature}
                      className="w-full py-2.5 rounded-[var(--radius)] bg-accent hover:bg-accent text-white font-bold text-sm transition-theme shadow-md shadow-none flex items-center justify-center gap-2"
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

const LegacyUserManagementView = ({
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
  const { plans, token, user: currentUser, refreshUser } = useAppContext();
  const confirm = useConfirm();
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

  // Ledger Card State
  const [ledgerAmount, setLedgerAmount] = useState("");
  const [ledgerAction, setLedgerAction] = useState<"add" | "deduct">("add");
  const [ledgerReason, setLedgerReason] = useState("");
  const [ledgerUnit, setLedgerUnit] = useState<"PTS" | "USD">("PTS");
  const [supportNotes, setSupportNotes] = useState("");

  /**
   * جلب قائمة المستخدمين من الخادم
   * @param signal - AbortSignal لإلغاء الطلب
   * @returns void
   */
  const fetchUsers = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users", {
        signal,
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
      if (error instanceof Error && error.name === 'AbortError') return;
      if (error instanceof Error && error.message === "Failed to fetch") {
        if (process.env.NODE_ENV === "development") {
          console.debug(
            "[Admin] User fetch failed, likely server initializing...",
          );
        }
      } else {
        if (process.env.NODE_ENV === "development") {
          console.error("Error fetching users:", error);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const controller = new AbortController();
    if (token) fetchUsers(controller.signal);
    return () => controller.abort();
  }, [token, fetchUsers]);

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

    const isConfirmed = await confirm({
      title: dir === "rtl" ? "حذف المستخدم" : "Delete User",
      description: dir === "rtl"
          ? "هل أنت متأكد من حذف هذا المستخدم؟ سيتم حذف جميع بياناته ومحفظته نهائياً."
          : "Are you sure you want to delete this user? All their data and wallet will be permanently removed.",
      variant: "danger" as const
    });
    if (!isConfirmed) return;

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
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-center bg-[var(--bg-secondary)] p-4 rounded-lg border border-[var(--border-main)] shadow-sm relative overflow-hidden">
        <div className="absolute inset-0 bg-accent/[0.01] pointer-events-none" />
        <div className={`relative w-full lg:w-[450px] flex items-center group`}>
          <div
            className={`absolute inset-y-0 ${dir === "rtl" ? "right-0 pr-4" : "left-0 pl-4"} flex items-center pointer-events-none transition-theme group-focus-within:text-accent`}
          >
            <Search size={18} className="text-gray-400" />
          </div>
          <input
            type="text"
            placeholder={t("searchUsers")}
            value={searchQuery || ""}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full ${dir === "rtl" ? "pr-11 pl-4" : "pl-11 pr-4"} py-3 rounded-md border focus:outline-none focus:ring-1 focus:ring-accent-500/30 transition-theme ${
              theme === "dark"
                ? "bg-[#0f0f11] border-[var(--border-main)] text-white placeholder-gray-600"
                : "bg-white border-[var(--border-main)] text-gray-900 placeholder-gray-400"
            }`}
          />
        </div>
        <div className="flex gap-3 w-full lg:w-auto">
          <button
            onClick={() => setIsCreateUserModalOpen(true)}
            className="flex items-center gap-2 px-4 py-3 rounded-md bg-accent text-white font-bold text-xs shadow-[0_0_15px_rgba(156,163,175,0.3)] hover:shadow-[0_0_20px_rgba(156,163,175,0.5)] transition-theme"
          >
            <UserPlus size={16} />
            {t("addExplorer")}
          </button>
          <div className="relative flex-1 lg:flex-none min-w-[140px]">
            <select
              value={statusFilter || "all"}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`w-full px-4 py-3 rounded-md border appearance-none focus:outline-none focus:ring-1 focus:ring-accent-500/30 font-bold text-xs ${theme === "dark" ? "bg-[#0f0f11] border-[var(--border-main)] text-gray-300" : "bg-white border-[var(--border-main)] shadow-sm"}`}
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
              className={`w-full px-4 py-3 rounded-md border appearance-none focus:outline-none focus:ring-1 focus:ring-accent-500/30 font-bold text-xs ${theme === "dark" ? "bg-[#0f0f11] border-[var(--border-main)] text-gray-300" : "bg-white border-[var(--border-main)] shadow-sm"}`}
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
                      <div className="w-12 h-12 border-2 border-accent/20 border-t-accent-500 rounded-full animate-spin"></div>
                      <span className="text-[10px] font-black text-accent uppercase tracking-widest animate-pulse ">
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
                          <div className="w-11 h-11 rounded-md bg-gray-200 dark:bg-[var(--bg-secondary)] flex items-center justify-center shrink-0 overflow-hidden border border-[var(--border-main)] group-hover/avatar:border-accent/50 transition-theme">
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
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-accent rounded-full border-2 border-[var(--bg-secondary)] shadow-[0_0_8px_rgba(156,163,175,1)]" />
                          )}
                        </div>
                        <div>
                          <div className="font-black text-sm text-[var(--text-primary)] group-hover:text-accent transition-theme">
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
                                  ? "text-accent border-accent/30 bg-accent/5"
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
                            ? "bg-accent/10 text-accent border-accent/20"
                            : user.kyc_status === "pending"
                              ? "bg-amber-500/10 text-amber-500 border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.1)]"
                              : user.kyc_status === "rejected"
                                ? "bg-red-500/10 text-red-500 border-red-500/20"
                                : "bg-[var(--bg-secondary)]/10 text-gray-500 border-[var(--border-main)]"
                        }`}
                      >
                        <div
                          className={`w-1.5 h-1.5 rounded-full ${user.kyc_status === "verified" ? "bg-accent" : user.kyc_status === "pending" ? "bg-amber-500 animate-pulse" : "bg-gray-400"}`}
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
                          className="w-9 h-9 flex items-center justify-center rounded-md bg-[var(--bg-secondary)]/5 text-gray-400 hover:text-accent hover:bg-accent/10 transition-theme border border-transparent hover:border-accent/20"
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
                          className="w-9 h-9 flex items-center justify-center rounded-md bg-accent/10 text-accent transition-theme border border-accent/30 hover:shadow-[0_0_15px_rgba(156,163,175,0.3)] group/btn"
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
                <div className="flex items-center gap-3 text-accent">
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
                    className={`w-full h-11 px-4 rounded-md border focus:outline-none focus:border-accent transition-theme ${theme === "dark" ? "bg-[#0f0f11] border-[var(--border-main)] text-white" : "bg-white border-[var(--border-main)]"}`}
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
                    className={`w-full h-11 px-4 rounded-md border focus:outline-none focus:border-accent transition-theme ${theme === "dark" ? "bg-[#0f0f11] border-[var(--border-main)] text-white" : "bg-white border-[var(--border-main)]"}`}
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
                    className={`w-full h-11 px-4 rounded-md border focus:outline-none focus:border-accent transition-theme ${theme === "dark" ? "bg-[#0f0f11] border-[var(--border-main)] text-white" : "bg-white border-[var(--border-main)]"}`}
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
                      className={`w-full h-11 px-4 rounded-md border focus:outline-none focus:border-accent transition-theme ${theme === "dark" ? "bg-[#0f0f11] border-[var(--border-main)] text-white" : "bg-white border-[var(--border-main)]"}`}
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
                      className={`w-full h-11 px-4 rounded-md border focus:outline-none focus:border-accent transition-theme ${theme === "dark" ? "bg-[#0f0f11] border-[var(--border-main)] text-white" : "bg-white border-[var(--border-main)]"}`}
                    />
                  </div>
                </div>
              </div>

              <div className="p-6 bg-[var(--bg-secondary)]/30 border-t border-[var(--border-main)]">
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="w-full py-3 rounded-md bg-accent text-white font-bold text-sm shadow-[0_0_20px_rgba(156,163,175,0.3)] hover:shadow-[0_0_30px_rgba(156,163,175,0.5)] transition-theme flex items-center justify-center gap-2 group disabled:opacity-50"
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
                    <div className="w-10 h-10 border-4 border-accent/20 border-t-accent-500 rounded-full animate-spin"></div>
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
                            <td className="px-6 py-4 font-mono text-xs uppercase text-accent tracking-tighter">
                              {log.tool_id}
                            </td>
                            <td className="px-6 py-4 font-mono text-sm font-bold text-gray-900 dark:text-white">
                              {parseFloat(log.amount).toFixed(2)}
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter border bg-accent/10 text-accent border-accent/30">
                                Completed
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter border ${
                                  log.usage_type === "paid"
                                    ? "bg-amber-500/10 text-amber-500 border-amber-500/30"
                                    : "bg-accent/10 text-accent border-accent/30"
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
              <div className="p-8 border-b border-[var(--border-main)]/20 flex items-center justify-between bg-gradient-to-br from-[var(--bg-secondary)] via-[var(--bg-secondary)] to-gray-500/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 blur-[100px] rounded-full pointer-events-none" />
                <div className="flex items-center gap-6 relative z-10">
                  <div
                    className={`w-16 h-16 rounded-lg flex items-center justify-center shadow-2xl border-2 overflow-hidden transition-theme group/avatar ${theme === "dark" ? "bg-[var(--bg-surface)] border-[var(--border-main)] hover:border-accent/50" : "bg-[var(--bg-input)] border-white hover:border-accent/50"}`}
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
                        <span className="w-2 h-2 rounded-full bg-accent shadow-[0_0_8px_rgba(156,163,175,0.8)]" />
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
                                ? "text-accent"
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
                    className={`p-8 rounded-lg border flex flex-col h-full transition-theme hover:shadow-2xl hover:translate-y-[-4px] ${theme === "dark" ? "bg-[#161618] border-[var(--border-main)]" : "bg-[var(--bg-secondary)] border-[var(--border-main)] shadow-sm"}`}
                  >
                    <div className="flex items-center gap-3 mb-8">
                      <div className="p-2.5 rounded-md bg-accent/10 text-accent shadow-[0_0_15px_rgba(156,163,175,0.15)]">
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
                            className={`w-full h-11 px-4 rounded-[var(--radius)] border focus:outline-none focus:border-accent/50 transition-theme ${theme === "dark" ? "bg-[#0f0f11] border-[var(--border-main)] text-white" : "bg-white border-[var(--border-main)]"}`}
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
                            className={`w-full h-11 px-4 rounded-[var(--radius)] border focus:outline-none focus:border-accent/50 transition-theme ${theme === "dark" ? "bg-[#0f0f11] border-[var(--border-main)] text-white" : "bg-white border-[var(--border-main)]"}`}
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
                              className={`text-sm font-bold ${(selectedUser.status || selectedUser.subscription_status) === "active" ? "text-accent" : "text-red-500"}`}
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
                              className={`w-8 h-4 rounded-full transition-theme relative ${(selectedUser.status || selectedUser.subscription_status) === "active" ? "bg-accent" : "bg-gray-600"}`}
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
                                  const isConfirmed = await confirm({
                                    title: dir === "rtl" ? "حذف الصورة" : "Delete Selfie",
                                    description: dir === "rtl"
                                        ? "هل أنت متأكد من حذف الصورة؟ لا يمكن التراجع عن هذا الإجراء."
                                        : "Are you sure you want to delete this selfie? This action cannot be undone.",
                                    variant: "danger" as const
                                  });
                                  if (isConfirmed) {
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
                      className="w-full mt-6 py-3 rounded-md bg-accent text-white font-bold text-sm transition-theme shadow-[0_0_15px_rgba(156,163,175,0.3)] hover:shadow-[0_0_20px_rgba(156,163,175,0.5)] flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
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
                    className={`p-8 rounded-[var(--radius)] border flex flex-col h-full transition-theme hover:shadow-2xl hover:translate-y-[-4px] ${theme === "dark" ? "bg-[#161618] border-[var(--border-main)]" : "bg-[var(--bg-secondary)] border-[var(--border-main)] shadow-sm"}`}
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
                          className={`px-4 py-1.5 rounded-xs text-[9px] font-black tracking-widest transition-theme ${ledgerUnit === "USD" ? "bg-accent text-white shadow-xl shadow-none" : "text-gray-500 hover:text-gray-300"}`}
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
                          <p className="text-lg font-bold text-accent">
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
                              className={`w-full h-11 px-4 rounded-md border focus:outline-none focus:border-accent transition-theme ${theme === "dark" ? "bg-[#0f0f11] border-[var(--border-main)] text-white" : "bg-white border-[var(--border-main)]"}`}
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
                            className={`w-32 h-11 px-3 rounded-md border focus:outline-none focus:border-accent transition-theme ${theme === "dark" ? "bg-[#0f0f11] border-[var(--border-main)] text-white" : "bg-white border-[var(--border-main)]"}`}
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
                          className={`w-full h-11 px-4 rounded-md border focus:outline-none focus:border-accent transition-theme ${theme === "dark" ? "bg-[#0f0f11] border-[var(--border-main)] text-white" : "bg-white border-[var(--border-main)]"}`}
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

                        const isConfirmed = await confirm({
                            title: dir === "rtl" ? "تأكيد المعاملة" : "Confirm Transaction",
                            description: dir === "rtl"
                              ? `هل أنت متأكد من تنفيذ عملية ${ledgerAction === "add" ? "إيداع" : "سحب"} بقيمة ${ledgerAmount} ${ledgerUnit}؟`
                              : `Are you sure you want to execute a ${ledgerAction === "add" ? "deposit" : "withdrawal"} of ${ledgerAmount} ${ledgerUnit}?`,
                            variant: "warning" as const
                          });
                        if (isConfirmed) {
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
                          ? "bg-accent text-white shadow-[0_0_15px_rgba(156,163,175,0.3)] hover:shadow-[0_0_20px_rgba(156,163,175,0.5)]"
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
                    className={`p-8 rounded-[var(--radius)] border flex flex-col h-full transition-theme hover:shadow-2xl hover:translate-y-[-4px] ${theme === "dark" ? "bg-[#161618] border-[var(--border-main)]" : "bg-[var(--bg-secondary)] border-[var(--border-main)] shadow-sm"}`}
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
                          className={`w-full h-11 px-4 rounded-[var(--radius)] border focus:outline-none focus:border-accent/50 transition-theme ${theme === "dark" ? "bg-[#0f0f11] border-[var(--border-main)] text-white" : "bg-white border-[var(--border-main)]"}`}
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
                    className={`p-8 rounded-[var(--radius)] border flex flex-col h-full transition-theme hover:shadow-2xl hover:translate-y-[-4px] ${theme === "dark" ? "bg-[#161618] border-[var(--border-main)]" : "bg-[var(--bg-secondary)] border-[var(--border-main)] shadow-sm"}`}
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
                          className={`flex items-center gap-2 p-3 rounded-sm border text-[10px] font-bold transition-theme disabled:opacity-50 ${theme === "dark" ? "bg-[#0f0f11] border-[var(--border-main)] hover:border-accent/30" : "bg-white border-[var(--border-main)] hover:border-accent/30"}`}
                        >
                          <BellRing size={14} className="text-accent" />
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
                    className="transition-theme group-hover:text-accent group-hover:"
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
      consx��ksǵ(�ݿ��d[`6�/Y�E�(�����!�$��JCb" �=3����d��SukW�O�ν�G�,ّe�Q~	�5��������@R�Db�L�V�w�^+b��i��:^ĶܨZ/F��7�t�~��H��:�N�T�[�����[L|�nT�kS�����Q���]����*c�Y��6��n9�vë:��F~�-��f:�u�}H?O�[�]'p���ȿ��o%�&n���)�o�+��0
�ֶ��_<`QԘs�Cv8$_=zW��
#Vs"'����)�/y[��O��CʒB7��0Z
����Nk��l�lzz��{���>=���_��;ztt�u}�}y��{�u���g����eF/���>���˴nm�ﴢC�}�-����ߡ�M��~���|K�7�w��݄e7�7rke�t�G� ^˩FގkC؈P�9�Ab!\�T����Wy�0k=r�0�!s��O��~�~�{V��x�c�3wϭv"�U�rg���H��o����uV�Q����O�V��ZnBG��8�e7���ی斌�?�!�H6���,��Ԙ���v��U�U����5]��Cl�R���D�R�3����[� �B2�[U��}.�΃o���Q����u=�w��p��<g����j�7��-0��u��ǩ5�V�~�/���'�P�CB����p�-?��꩏xc���d&BG�0��M�#і���;���C�-����#�-�%���q��r��o����
7 �~�/��+���r�GCH��b����֖[Չ��ڭ!��Q'h�vi&ş�7�  �~���A�
v��B ��+�d���1p��Sل���r
���"�⾓A�3��:�'ե@;>պӪ5ܵNk�vū
g��BowR��Κ��ܶ�:����YJ�A��x���P�Pz��`ۍ��n� �V��>�v�Ѕ+�χ@hwZ5�ޭ��$N%��a�pTq��o��吋3C��K��c����hFЀ>B������
� ��3T�>�~�(K�_�/����7��%�^jp�F�#{u()�~�X�V����?]�I��{��H��Pl��B�&�(��lX�p�,z��q8I��#Xv�n9��]7�uB�8T�Z�F���xC���:n���2�4;�o�6��'��n�
����a�[�l��/ּ0N�j�a۩������	̷���V�o��w�4Y�$�F~�hkز��e?�*0N�e�Vf�c*���~pk��r����o�Σ]��cQ��l��nE�����ۮ�߇�C��j�{��TuQ�m�]g�=詽_�`��l�Vjl��������^D��
=ZWTw����(�(m��Z�yi���hD�	Y�VQs����~�ۥ�?u���� d��Oɩ�rF�+��5��u�[X;�k=u�9�!Rē��%6�(����o��.)�t��D�ڨg�n��� �3�z֍U��
A(Pc�rF�Y��6Ɲi�A��MJu-!et���"eKm�ZM��ּN��+l.��vxq$�]�fG~���}�|��N
�j��g(I!"��)��#��XU�`A�O�+)�n�wLŕCI�a3ƙK�р��0F@�A�1QPw�l�\�!s���D�1�땛����������S�<?<z~|x����J�29tC��8^ˎ�N��:dA�4ʤ(5�W�H�
'��������@ϸ�S����0_3�j�O�/��.���#��cP���qvt���oȃv�BCGįO�Ox *%(�V��:���8���������[�_ZY����n,,-�vfcae����l�̮,�=�8R�0 �N(l*`�P��`���{��;G`e�|I��Ǩ:�'����/q����x�<�/t�ҍ��
�??�P�~���l�J�B�C�5�#��_P��v�V�l71C�u�f;�w\6���Ht5�xa�����OPN�����W�E�vk��(��ɸ]ϖ\0٪����������~#�h֦����,�t��y�`��3�>Y��D��/hA����[xX�j5���;����g�z��(�[��M0>\�e�S�I:JI?�>�P�i�}Qu�Z�Fi���b#�����#ᘗTE������"���)�ԅ.=C��&����G{�r�,8�Ku������)L:�hF�.+;��hx-�{4?\J����qP�i�K�$"#Qt���y��=���9��i�l�e	��"�Ax��o��A�xj��,rK����{��tO�J�<g3�"o�W*��&PS�`��:�1�����ޱ�/�,¡� r�xNLZ���[�υKv�{�	��=�\qH�z@��������¯�Q)����;D�fx��x!煨�����?<��Y~h3À7�%
�ᷜ3~���{�(���Xh0Y�����e�7�����������v�y�1O�<�*@S�uX�ą^�������2:�TG�e�����{Ϸ�/�!B���f3<VJ�Z���)��܆z&R��)�>��
	�H�8-y ޔ\�q�b�Ŀ�`��Ҹ)4z������vKc�I�<���<AN�	��N�����C����[�e*�OA����Q���<{�}q���{���+."r_�lm��"S �G����60{<ahD�k�xN��:��Y��^(����Y�I�K���"��!b%�v��.���CVL���k��P<zM���?�nxM/b����&m�"���߳�ʻ=T1�c��]�>�y������^&����>�!�4�n��'���4�P�,�8�6?��8d�-�'� 2�0-��q�<���Uf�$/������ JN�	�T]<d ���"[���3��ٵ�����0"ԊI��lC�ec&_��8�M �ؚ�Kzs����õ�޻��3O�=���������׳A9����N#&�k�ꏃ�@ܵSy��`̏���v_�ߟ�Y�xߴ��!����Pq�4�L��0�.�/["���q�<X��6J��d� ���$�D����w��m�c(�&��l���6������N��y��$bb�U�ܖr,�@'��M�����e����(� �r�>������:���D���j�g9Kw�TՇζ�𫷭Ԑ�M^������!�d.\c{H?5�<x�Gn�o��q1᷶��آ�?0���	ڬ������h{��mI��y�m_��U�\����������	�P����n�F`%��-@x¯u0��oYG�b��I'�N�E�5K��C�n��M�<��lF���نW�=}�5D
����ל�J�m��'��q��
�	��ĸp�P�h,%�mqj&y ������j'����)�=	���$N��'ltO��i��~ɣ �h�A^�FSV����RŪ�s-[��W����	��1ۗ�?6i낏sC��h3uu�uډ!���ʦ�W�=5�J���JPZ�Lx����#��O�^<My,5MiKU�m,��`6�����KC�cL�i^�v�i��%��l��(/��`!Q�M@'���K�	eyP2�SZOQ�R��O9'?tK��_�Z'�ZS��`����񈬣�b��p��YZ"�'v�'?xqTؘlfq~mc��K��3�Wu]Tʄ��o�i;U/���E��˴��ZԎ
�A�˰a�iY�����mҞ�R���C�^	���23�a��^p�[�
�E띴�5^!e�XJxb�gu^�K]Y)�/�(�`&��7�\���96h�a����I����Q�~cvut��0���3�{�,��<�~�����	�%B�zEC�4_���B����q2�یu'i�T�t�ھ��&M:��e���A��G�lqOZ|x�7�����m[�}���3�ʈ�����j����n�z�ͬX�}j5/D;�6}���M�I�˺z:�=�|���wt ��b��*f,�2ؾ��**2�s"�F$�]�o9쌁��/t��ڜR��B���?���x��:�>z�p`山LY���?�Ȣu�)m��݁]h6e[�b�t�#tدz�Z������	�*���ُFKM�2V1ˆ��C5���)��������T��+R�+���I��Ӟک�j�ñVj�"��ר�j�
:^����p�La}
+���#�E��$��^���Wzj���>:��H� J��_�ԏ�@���b�Pm�r�(4zů�<����{�U�j�F����N��Q��P0�(sE�h�lS^�i�� M�����;>N#������꤉N����L/�^�iu����
��j��?��9:̿�6Ư��X���Ǒ�r�h?A�lU�FG{� ��.�9kn��r�v�����]��@�,�%w�K���Ϛ!���6���A��xB����z�I}g7w�����TD�:��*���ǈ_5��V�|{��qj3x�;1��r�mmGu��:����Y�z������%V�CJm�!#2�P՚0t��n��o��u��.�t��z�93q#�/v�Q�P
��LLJ��Z�nw�J��ą���~�逞���� �$�f����.7�v�(2��>ӗ�a@8�����x���CZ��HE?�Lb��H����ͳVM�FA�UEO�F�=UF���������.�Q�2���_��D^ԠLK箵��Ľs�^ؚ	biG���;�x�N�e�8�������Y1X	Y���iD�-��'���ޫ��ηH<s��'p�y�g��e@����r��	�j7�h��/U���	�)5�f���-�n��g �?=�P�;n!�x�G��I]'S�%I>{��X�f��M�6� 9z������-�Y ȸ'	�Ч���C`YV�u0{(����(�&�G
��\l�Ew�mn��VvP��|M�+l�ku��z�?jJ�y�ƛe3���ד^<�NiF��V���`2m�/�]�1��	^x���`�Ż�s��h���1U��|-)������y�<f�̘e�(�X��s/�~>%S�L�wn��5�?;N��Hkg :@hl��EW������e�2ORZ���<��檔����p�ѧR\�~t�^�S~'B9B��GFz<�&�.d���]D�(H����&�F��j1Z9�4Z��8��o�D8ӧ'�o�S������S�Tn��n�[�x��Y�s�ɶ�A�Xb�׸[[�_�M��GG�� �X��+��r��+�w����X'w�T�m�5}p�"�=�&����)6V�k�S����;<�n�,↞Ӻ�>>!���9!�t4]g��t� �z��0�s?����+����;��n��p�^��̞Ҋ~	ve��G翨:������;c*�9��z|�����J�5�4�l����fv�sJ�G��G�_bld�6�����5Ŧ2g~��y�>�3{$~����;����^�v���<���܅�^�����X�{՜�����FGG/��s����m��]��*�o�{��Ā�����5��d�&P��������o��x��XyҺӏe��F� A]�&2���������t||��)[������n6���&*�A�nM�'d
��`Y�6�M��Ck$���眀P/�7�P�y�zO*c��!�/�w��O����Q�_d�{1��V2_j�\��=�ƚ���P"����{7/�Ĳ(-=-r�??����Z]C���;Gz݁+~���`��f͖x�r��3#<V9?x�����%���7ͺ_cM!�D�ʗ�`��y'�����W���������6��zm���*����|=N�Ma��>���7��� �(o֐�3�+��&����η��F=z��3���w�d�]ZX^X���ffg�-��`�K��������+�s��~q��c@�k�;����l��Cs|a�ą*LsѴ<S�ǔ��q�.5����pR4ðH��Ґ�S!����-iı��1�tDo.��_��CA_��4g2̥�i&j!p�J�-��6���#fKk���Y���t�c6?L���@[�9n0]p��e�of�&�8���R���cޖ��OrB7.�R���[F�r�f�G� 2U2^|���WM���3I����'G�_�{aO�������T7$�d/�Du0rD�U@1 "7��e87�/!��%Ҟ�8���;L�-������v� 6b�
��߬..�㻶Rjan~yc���Ɋ��{eyf񤬐� 2�R��X�Piop>,Ń�X���F��Y�p��y\p���c����4����E����]ܑR�<��O5 +.љ�=�C�d�t����߷s�E���N�6��� :�|�
�5�tg�.��}���� Ͽ;o��fn�z\*J�AT�GL�	��Q3����'��9g�f��ŗ��O$.Z�LH�$��Q1:	�����X����v<Uр���Q7H)��1������h���ܮ��E8���?t#��a� ��jO�F��7�E�.����"wy��;岅���4��������|5ND���rM�BK��v8�*��O�M��58��m5V�� ��A39����ѣLh��f~���|b��~0�8�4M������5�Xr���o�8:mV��]ы~83�䙷���d�uxK�\�YU�9"b|���1y��Ѝ�E��C)��\�XY�٘�c�+����/��,_[ek+�6��S^��[��6����hP�P��B�ը�D�"s��r�R(q��0��5w�*���"���\���/xf���#��"�S�rC�RN�u�b�-�iw@iN���c��fӡ�'�i5���?*�`��GC��3=�l'������.k[�>��k���R�[��}��D�+Ъ���1��E8��!���.,S����hGbO+��|�ޟg���/��L#���Z�pJ��J:T���:�+u���D�)\z������6�7�CY!F���¥�I�|=���~���6^�גl��yz�l?�������L ����r��zy&��:m*!��N���1�lF7�k���~"��C������}�1����Xi�ZN���t�)���ȁ=��Jv-�^[�����Rsz�,啗N2gE��%Om�)0֮-�j`�
���ӶN(���0q���	�q�Gf����xV�I��Tu�f�<w�k�	j��C�	�y�d/Jy�1b}ifm#A╥UP�����m����5td̲���%�͜�}g��@�wF3�c�)J$��B���5)��"�Z��T�]_ON1��i�}K�9�����_���2Z�K���nS~�J5�X%�'p|�n�/��z�9O5��(G��z#C�h����e��>��5^�m��u�@a&暁3�vc�50�f�b7Y=faj.0�"�T�T>����k���Bx%u#2ěC`!bOn��/T��Mۖ����%e�YԱ�/�uH��~��)�18J�,
�⟡{�Ҽl�@�]13�k�3u���K�u�,�P�?�OWLw8m�Wo��*�R���]���4���V�jn��4���a�av�_�A�Z��(ߕ>߯�'3k֒df�w����(b����{��� ���|a���'J�T/�����������qʚ�u��R��%�A�]Y�4��\G��i��C������$�r)q��T�����X�O!!��~j=өyEo�-7����)�xqbh�ʪ�����n����:q�E�� <��3ݺǊH	]'���[����t�'���w�7ۍ��A"�N��)��{����K�k�縔�>��(b�{���J7�/�OZ#�����h�
0V�0s����ȴp�PE�]#��t����ё��V\�/�y�
*�7�_տ��u1��NM<�W�����D��o;��{�ߛ.TX��M�����q��������v��м7ۯ:m`H$�I����q�=^�S�hL��M��F��h�t�t�9V�t�a���GGK��_��2�_>L�`��{q������nm�m�Ag�A\��u���g��K�c�ăc$M�9a=�b���B+��;�_�����;����`�(y�Kviy�Q����h(�e3|�g��A�>������b�b.VI��Kclo�(��A�� B㮇��_sa��ǚƶ��;�K���qq��*��d�(L���6��U�
!zZH�V��%9d�{IԞ]�Y�� ��:Wk ڤ�4��\,���q1�Q�N��>N;�(5/��R���F�?!���ɯ���u�}�����%�Ś'�(��?�3�7���p]����1LةbD��D�>4���� C�]��}E�Uƀie��u��?}���+S'_B\�e2j�=ej�`���tô�eq)�y�A�X��uN`������&��/u��|_y�%�d�;v2ѾG���9�-��]!@������2�g]���V6_2&�ksS짽�I��#+-�(|n*����G�>+�i~*�>�Ҏev���7���h��-�cBP��ȶ�b�#�����!/뺭�-�_����Q�V����.�~�A������d�~��G�3�P�y����6�:s.$�d���+zB�&�.�^Z/�C��?����� (k�f�>��rwO<��d�?���߁cfad��Y�s�˓J%�@H�0�lVb��H.܍���s_�T2�L�XN�a5=���ܵ���,�}�L��;!��Զ�LV{�k�y��SJC�D^V��S�ȝ�.ͣ�ƌ���mdo��j���n0�U��	/3��c`���C����cnrn��c�mI��wS�(ǆ����G���,,��\n�$[��A��!ol�c�s4�9��h`z���n"z��[eE�g��y�f~z�@
�*T�Q�ǼJ�d��8�b^��M�`y�������ϱ���Evefv��o�l�/�/o������ōT���\yK�����#7s"���<m)���)X�Qr�i.A!auc�O�f>��'���ɌS�@��n�u����&���lt���OI�5I8W�jt����375ٸ�c�M	�9�6`�� ��N	�FKWY��� �,��,�k�N�.oa�{}XE3k��/�
�|q��������R����o���m�ㇴ֩X�8��Q�qg�Ϲl>W��Y�x��X3E�O�m����Si��T�V���t�8�5���ؒ��6�6q\�6�us>/��qx�/ȡ�G��̫�e���ܽ��ڡ�<�U�)k8H�8��IoE2�k]�������5.7ߨ�utd%������;C���j�*$9E���HĞ��Y�e^���|���@q�>���:(d�F$�����U���.OQU35�.{dC����CF4�~8������(	ڋsW��ǯ��K~��nL�͒V�Z<����F��o��4�,���!F�Ƞ���E�}��Q�-,���z�D������Q�[|��q�xc�;YL��J~'��촫�ӕ�^�%b���q�o�c�x���}��ݷ�B��:%Yw�DD�+��eӬ�����\�����oN���)<�6Xh�dX�|4�D�Կ���:,I�.���~Ğ���JqЄ�tBw�)R�/�����9S���b҇��r�Zu[5�\�C>�L�-�l� �(�q�e
����:}ܢ:��|]�h��L�u2��f��vA���e�|}����̖r.ꓼ���\¡�u(ϴքk��=�%ʸ�P@�=l	��`���� Q{�G�\��9�Jv�r�����>ڈ�~�i����w��4��b�B��^5�� j����+5 [�����F��$Cѭ�:Q���ʃ㈶71�,ԺO�o���e���OP��W���Ţ��,C)��_�S�(�J��o����Oe�+����;KS�B8쵠!	D~l�#s�d(1t������\���5q�k��Ԕ�ʣ���2������p�	�LW��<����ru��|���-�
��2��i�Y�I$��FFX�Tbs3W�W�J����k���[�`�p�>����|u���V�VߟYFc}��
�Y��ֱ�dV~�ƭ̈́0��F�����[ TwB��)P�}���a切3����49�B������N?����{^���F1��O��~�=}��K����C�����T�o����\�������m��>��=�`�U������$����N�^�M�|dh���c��Y�.FA��\�`��}�}�R�=�:^ĶܨZ/F��7�Ԛ^k(5EG��-_T�kx���d�Sd��&�������s�ߺ�v��Hc<��e�øҬ�Ŋ0��{H�OU���/�p����5�mx+�%�������{ݯ�L��}�qB���'n9��}G�G=� ��7�y</�"%tM
���p��ȏ��5^�퐢ݻ�t_���$؛/����7r�gkO��d���Эd�`���, ��琹x(�@5��e%,G�q����d�]�='JV�Ĉ�\U���d)˾YN����I�s���x�R�`[��>.���>D>��[AZ!"�w��C��2�H(�J]	�s*�[EvÍ>�,�⺚���Q���#4�g��3��.Ɗ�.�4�ᮙ���Ha�ʓ��Ԭ�;20��r��؆�mfH.�K��eC���6ԧm������.z]"�&�n?�k��9|�'�x�!??��(Qe�n[^��Ywꦨ�9�1M����n��E�U<��/��gb�?S�J�&mMdes�� ��c���;ߛu��mlK�>�Z�]�_ߋc�j���h�zӣK��*�'Um)�XS�A ڔ���Cy��R���K�\�`�.k����I����r4J۔O²��*q'��%ө�4pNA.�X�M|�}	$�&��K���(�h��c^3��s�m�uz�nPs�WfQ*���u�J`����n7�k�Scͽ(~�0i���������2�8��}0���=�up8tʨw�xK� �=�������i��\�(D ����8wf	WVd�-m�S�����K��b�hDxk01i��$!a���$O�s/!��6��U#��
6+a����"wV��;�V�9��o�����9�TL_��M��""P���@��e�~M�/���Ŭ��{L�C���˺�KA��	�'�b;��p�*p˦K�~@�,Z'������g�5Ҳ��u���kM�?�	I�K]����S_�u]�y|F'�X�U��tx�<��0KY!��ɲ4�<s��R������;���p�)L����KE�M��:?���Y��,_�vk^$_^ Ӌz�7����5S�8�A����� �s��@��@R��`e���t�>��,Pw"� 0`}2߅_����R*��>�~?�5e`�,��y�gB��lG������}�L��MnJ��.zQý��gnK}�So���m��� ~���o���L�&�6%�=hOY�b,�B~	��A���a���$�&��\.������F'�]��b�,O:��"e"���{n���Ӝ��t���?��dr�i�m�o���	�FAԕxI5<߀0z�f~K��'��i���݈�x:|��Y?ly�ȉV�rT���R���Q'h%x~j�{�g�;ַ�i5S���D,h�7t�a�����SbL�^7�w]U\�ٗt6���9�;�F!*�ˢ5E�OJ`���B:׿.޶���nAeSRd���2(O�(�"���#[<�L��t�(<�7���˒P!��| �?eA(�e0p)��xD��g�֒Ť���w�s����c�O���,tiW)2'���/��L�}��*���t�]�B��������5���	��F���l0i\��u�ʿF~v�Հ}�%;E�)G@^���������(؎�#�d�
m�m==�,L��(��,��"�[�R��$�/������i��{)E��P�fq�C���^�z冂��PG?|�O˘Ջ]bc��l�26!�ӗ2 ��L$ަ��h�=�����>���!��'��#�����,T���-/�� �c�فem���1� ��-]�K'��6�F��P������ �|���mՊL� ��I�X����D�C3���w +�	��L��y�e�7MшݐSJ^~�m��D����G�Dx5�D���3>6t}�_X�2�>8��r^�]U�����h��YJ������b�/+,��GL��I��x�Q�8epE�k3�^�����թf�焇fayn�7�0{���H�ks�Tg�!�xT��$ߩA�)q�J���Wj^�,�B6�V�ݣ�Z>��R�~���苛	��#K�fڙD�`R�����&C,g��-���F+�r��/ ��kk��Q��淶�jTL��w$�2��ۇé`[���icڬFD�pv4�>)ᬔNJ�N�g7���W��������J��2n���'�q.�%O���!�"|��	io�-�BI���|�	R��U���\����L��z&�l-��\4�1��.,������	�i�@��GF�<p���6�'4(e�^���A
�����n��TYfm ��&��]�)Jؤ�V��\��Zr��('nz��_Hݗ�{�o��t��^͆�0Z�%;��.z?���r}Eo�\V��f�0���H_:Q��E�����L��n��)��+YJ���X5U�MM��*d���ޖ�L��g���N`y]�=S)���*vnr"ss�"��4՗a#mc��M�<)�-����nS1�����%ѩ������dҜ�8�k%Z�xo��`��"��j;��he�zt�X6ҫM4�2n��O�ip�w�f�n�Ј�/?0��,5��i��2Ls\)}D�
}��ҴN���7�eNO��".���1R�W���7l$�:x�w�H����˻���r\&O���rm�d������]x-.��j�=GC�&�~p���O�F�Ϲ�4��4���rA4H�P���8^j��@���J_��MD���a��ectx*^�l�M�I� �C��P�K���!�ǎ%8.���94ބc��F�
�Cx]+&�f�GD����B_��5!��6?/Qd�e;ZX�x���=k?��� !��>1C1��^�G0|�f��R��}4��)Y�ϢЦGKv15���I�O��w*�O6��'���3��1��'�sh>�G.�ƑJڔ������Tj��-�l�ؼ�˚F6�PJj�C����1L�r�����ɱjXH�'�4%�o�����yP{��M��M��:�&C@5P�ʮ�=����K��z��ӗ9bh������p��E�d����6��A�8�3�S��'��UIy&���XI/�+b3(�'��ULU/��5�2��C�(T^">	XT�D�7���`E̫���[:箓M��w���fn�*NQ��3�/u�d\�Ƥ4a}��ݮ�N+A�aM���cW��5�;�QM7��^�w|�fC
c��1����c�Bx�is ��B[f��g��gζ��}��c�,������*�[��2w�� 6rOH=��&��b�nl�t�4]��F-\�k0_� �4 ���t����=��ySN���/�M;V��S�?���I����1L�cF�Z`e�/�ֳL�-R.���/�}'0���ע^�tU�W�/%;���]7���YZ�<�Y*ɔj4���mI�]Q-���G�SI�T�*ʢ��H �+�8#,QM'�p��9��\�qO�p��=�=m�'��d���|Zw��D>
�?Z�)�f��e 1e!��Tk�FN������8�D{�G����4��/���Q$��;=$���q��ϣ�	��q�X���A5;	�>1�f�~���0c0E�Jm�TfY���^x�����h�SM��x.�����!2R���om7�P��q���2߼�kD���ٯ:���>}\}:}">�Vm�ꦎ��ܬ���^����y�t��lג�qn�D��<+j�=�xN_�:���fJ��Q��Ņ��a�;��<�6L���0�ٕ����yv���,��S��=�պ�tx8�������C����\�J%Ȭ��0�Ǌ�\�}d�U'rw�}�����4�
�'��}RR
$������A�r�q�p��	r��TnoJd�W�h�Uz�m���0����*]LeX�~�w��&w�X���w���2Q�{u�?���ũ�����8�͈}=;z ������G����r!��	x��f<'���l��B�ʣ�`˫���[1l�k>��G��?>�)���EAs�u�ŋ}a�kc2~��s�v�U�w w+���J�|_�\�*Sp>�>���q���c��W Ç\e|�k�'~�]dCX��xf���M�m���vĖүҼ1yk�����i������=?W�_��}&Rg}tBGD���-Ѕ#w[�pj�Ы���Ĳdm���T��������
���G{����XW.� ��e����=ȓm�n����`xS�]����9��$+R�}u���!�#�R:	�A�����zg��M�$�����C�;�ۆ�Au�����h�+�]��	�a1_Kz
���+�������z�}�ҋ��:r�fh�� ���������D|,��dn8���v	`�u��98���n�Վ7Y�n�6���+=�-¨#�� �, z[y�c� L���"I�B��	�Yz%�(9����#���cJ��M|���8�}«�[�a��l���:�Q��,>����R	��~�|#���T�
ث|F�֐c	!��-$��@{����,�p�>�e��%Z?�'��A�И�<�H�'����q^�'��eہ�l��י7>a�~���3�l�u.C6�ɼ�ʖ�_t��	9�zc�,�8������*O�c;^H��,HmpgQ��%!��E��9`<�Lqe�QOA��#'tP. �5 ;���~p�*ñ"�sD���f1�K�)�Ę�UeЂ�)"Q��9�v_(�GJ�;�1��M�4���� t�ʼ�ԿRkL�5�v<PY�̀jj�����ЏХd�Y�<^�+��_�:���C�vd9�1#;�O}GWȼ�1hb�����}�@�u�(CGL\Qɶ]�E��B��o� x�>�*�:%�/�Üp�O$K|�u�O��WT�cn�z�7N�J5ƫj��Hm��B8�m�B�`h!qe�.��|ML�v�/�%'�{\?�_�[H�&}I��o��' ��s�m�&xȆ��6l����2��.�!���(�x!�>"}�O�>I�s7S��x�>�c!������8g�t;�-�֍P�.fh�	8�\�������<"ɶR3�~�l��S �'ɞ<����'@!����8Ѷf6piE�hk��4^�mV�^�}�c����}�*�/N��6�&J.���Du���ё��+C[���l	C��}�~Y��e����>k%U͛<�v�����6��qa�!��U^I�촀���˕90[[n�|̬X�ʹT��R�rn
�\WxIS,Z|I�V�MxF�5^%�@s�o��"���n�QL3�oCW�BJ��q�Q�j�5�6C�!�Ly�Kw�H�0ac���Y�*��1��vN�њ`��#�a�<����$�(�@-K~�Vπ$��'�F�z�K��1��i��`��'��,��E<,7X�_�ݢr��W�
t��-��e���k�ôu�9	�-{}�yq�T��H�[�g��}��k#��6��P{#ج�A�4r}q�>	�q�Q�������j�?E~���cm^<���h:�69���R6Q:�ȑ��A_X��!U�&-��`"��60z.ݤ��M���� A.���e���nI���M�.�Y�48-~KV�B0���^k+pbϩ���?rE��������K"6�~b�puZ���/������8d���[Nӫ�;�"��z���~�R��{9�� /*�>7�@�����2��,�@ d�2/4&�O��r��ɕ��`ީ֋E��Œ;>�:g�$��r�7�b�oeJ�g�JGx6��rn��W�w��Ox�����u�d���M�.��_{Q�c4�IL��bE$�ܚ�|`~���԰d���6�����n�Iv���)6�'��or��ù�~&�"#�G������1��@O;�C�p;���ĳ�BҶQҖ��匛��=�O����>yT�����r�q�fu���^0+�)'ש�����V&�x7�(ΛM[��ݠ�JR�`6��H-P�[��ԍ@��r^HXTff!�������_�j~C.����[�D8�^��!�~d���͢
Xu��?� 2�D�H�����aZ:�v��X���K=���)Z���r��Ֆh ~J�)����L��Nh�6g���t�/�|y
���3Э2�)>�T���_�"�W+Y���>(%��D���+"o��ٲ=�QF�{�8�K�@���s�W�Y���5�@�՝��g6~*ϋ��O$�P�˖F^�����Iu���%B�C0��Z�-�w�L�Wd��k�]$��=������zF{X�)T��H�m�6�.�?R�5�"0��T��gUjd\ιL9��y�M���	�e�^T7؁	����\���P^�l u�|�~C�����v��7C�!����pi��@F��c(�G5Y��WP��4�R)��P[�J�Q��������\��_n��m��:�a�w�%��ul��>L���^���~ni���W�fT��!]�Zߐm��w~��V�l�҃��<�(�hn�Ҹ���#	�5_�G굔zNTf��	lECͷ��0�D�1���J<o>�3��]8���p���k�L�k��b�<��x�i�#������x®o,,ͯ\۸��0� G��<���IlE��*�'wτ�J��O����z��?&������g����Y�Գ���8�Z�F�5���Pz�)H�Yc�o5N��M�#Zn�����Z�}`po���t~mme��w�R0�Kzq��4�{��Ғ'G��;�9v�ŧ�Y�J��K���s<p,my5P�@�a�e����u���5���[��q5�tPS �D/O�Q�p�vXUR��V�e��P9��W��&+�э�����L;��M�Z�V��1ssfnia��&�%��T�	�WM1[BH9!,���BCЫZm�I�Ե�%��lDFN�Nu�o��˪�w�&��D	w�{�)t�� @Uh�����EŞ>o��o��A���캂"1��k2�p�ؐ$rA=c�G�q�7b�.���qSFjP!k=PS�Ɲu��Mn�r9Y��ֈ)ȃ�0P�7h��Ն�e�#E���n0vRQ-�CɁn�TR��l�mL��E�Q ��ŕ_�ϱ��������O���\^\��%�qmav�-�����0L|��Dζ�	ƭ�G��-�)�f-��m���3�$�A�<���m2�n�;X�={����,,][b��/�/�������k�f�~q6p��w U��s��2����pdӝh�ta��������k 1y�]4��Q{�rt��!�|��I��jO+�UP�"W�*)F�r=p���	�T~�,~�Ֆ\�&�^KZ峸���,�#�P�����ʍCRvE5�xvx@d'��{�ZGWgX�[�E�	ό^T��
���%�X�v�:KO(2��_����^i�4��@#�����%�$�9�)b��(	>���T��L�_�~;�+�+�`���q|M�$s9�����l��f�<�4/�4ܭ�t�-�����}X��{�ۂ}���KU��vڥq�ރ����	�uؠZ���K���y�p���iiVO�t�P� �3��5a-%���
�Q�
`�b��0QC�8�ʅu{�T��V�i��6�K�:����7 @ؐ�?%��k���P|�u3E���v��~��3 ���S��+6�>�����-5��%�����A�ט�E*�=�`W�QR�郱�!ѻB5�l:pě�<Ծ^Zl����u	O�����%�a�^�Vj�G��.i�H��$?�	����%���XB�ͪ���j֦��=$a5��~���D�=�#�C���t��Ѝ��/&۝@��rY���	���Ԇ��\ZXӶ$�Q���x��o�?al<� �A}L��FDۿ�7j���¶���0{_S�̻̈́�v����T�aiw.�:FI�X)Oj��|V`'Ka�v���rE�J��# �hy� �h� ���"YQ��g2BS1��arH��s���f�it`����¡����B#
��~�g��>�:Z<�y��;N#IC�}�4�[��C(�&PD���)i�7�-�[j��#�";�|��H\v��ey4��l+��-%���)_�.qǪ��ӵΝY/��n���7{A��g�g�\DUh \�	ΰ񇁍ʥ�7��1O�=�y������o�Yj�pO�g�
�P�TP��jS��	#ok���fd�����[ڀ�����>�L�O��貯M��8��=텱D�gu��4�|O {�ʓ���Ԇ�)��+7+7G'�{7��M�8:y~x�����;�Õ�t"4川����XnX�r�6Kwͥ��]����VA3���)�dv���yl����H#�#2�J7�Ц�ex��ܤ���F������Ͱ�M���a���8�4��G)�q�r,`b�3�"��5�wh�嶧,�	�0�b�JRr�,RG�Y����/���N��R8�
đ�j���8�%��|{�Bc��{���<N}>&�V>;����<�t���U����WO�����>�
2��B��ů(��!���CM�t������x�N�;�)o�&w�������W���aM/�k�CS��Zq�@&��4<2co3�$�Ƥ�'a؂��(l,�.)��O��dR�pB^��J�g~M�	 D�$*�k�P�8�	�)�IQ����ۼ�"-z��P=�d#\���ޑ��<=E]��ﾤ0E��癦��z��[ྸ�ŷ�f���L9����ɱXߟ�Ab�\J3!������?����;j!+A��[}�_;���e�ڪ����x��Ju"�+םpE{��1�C5[Q泶rܕ�0��3~H����{�ئ'���?C�%z�!¡�Dc� '
!��=5�	��U*7wˡS�*�B�|8��b�\�L�~��1m��-�G���D�]���R����g�~o� Yu�=OO���!�yb�^������Y�m�n�-�ɧ'����v��C���Tao��T��u�`s.��5"!He�e�e�Se�ie1D�=�<���gd�������Y+��]��~�����^���1)�G��@���<m�֫L���/���@�<j]Gz筋��<�Kf_�E^��.q����"��HYu����>�����*�C����1"��/0��}
9�K#|��~*�\�cq��Wk
;%6?����H>�$;�6�vX����e"�A �����i0�������y��2��@���T�( ��Qp"EP�B��ܶ��0�d(�uJ<��H���t"�+��RNy����2�K�#�F2�ņ�4�Pުr��攽X���X�8]/#�(��T��І�Pl/̠����mz	Ε��K���?1�>�@��y�u8�Tz�������:A#�f��Yx�] Y,qˣ���X~�E�� �7R65']aJ/S�x�L3�o�`�4$�A�u� y�55ĂKȺSfs�,����'����Z܁���ӎ��܂����{4��e�suV�������Y�B�)�r��uI0Z����eq�[��-��P�Md�a��V~��>Ə�>�X}������ì'���s܊V�\���pَ�F���7�x���x����� ���OuJ�Nw�$�O05���(�\�N��6�D`E���e��9/��(�~Ȫ��R2�!�R�a4�.)� <$�<�~�7@�Q�����E�|'�Ð�&��"!O���:��)��TW]L~ƫ&ݑ�{��d<CQ�I����o�����Ò�&ka���� �T#<� �P*���!0)S*ݦ�:uЧ�w�����:ݵXLH�q8_���Zj��Hvt�N>�1%���y`�IP����yG�x�Oo�އ7����i= _w� *BRU�k
9�^r��i�(�Ӗ%��}4S��ް�Ӳx4K��.���4�d�f/�T�_R���j'�v5(�v���ئ7��WE�t����PM�A�D�H������>����b�-J.� I������,������-��[�#���$Ӑ�BH3�;CqT��P�T³�i�ZW�0�1�蒯�TXl�M��9�刔(��FbȌ�h[��IW!�N5Zi�A�L����JO;��s��x�'<�x��ѡ�f��)A�k|��([�~4���?1~��Y��G�b�
�C��%O},ve�](�TB��46F9O��W�̉�D�qp諄�������~��{�n��_�9��x�G��c��J
4�o��|�c�Ӆ�`۟��E�.=�<��,.��bf���쥯��N*�Ş	���`M6�hbIs~�����zG\c�j���QP������W���o�-v���e\��d:������C7��z1�|)��(��#�q�wH��ϛ<����ẽ�i��dͅKsG����g��Z�����
چto��Dc�Q��,[�놫���4>��e'��O���H���}A�j�f�ァ�ДL�G���9C����� �E���#���N�/��3�G߲?=9�h��r�>�?��e���h��X�U�w{����.�4 ��'r�Qb�3<x|t�P4�M=�<2s��c�T�q&���0o���}}�Bz���I&�G>���ǘ���*Xy���j'Z�:@����;�40?���t"�2��W��+o͟p����P?�<�_/�u��7���sׁ�Q��G�vtH��x
4���h��5�BQ��!�-�2���r�%�$�:G��(A��
U?Y��N�e�w�Q�h��ݪN��>է�i?oK[���4)��j4���0/&��ʌ0��?��?A�yF�I^�My���8�S92)�6z"e�n��4��h}�0�2a��Eqnc��AX:t07(溬~���F�n¢!h���XEx��x��p$�7x�͕|�W����Ϝ���KQ5O��?R!����8��uT��D��X�����b�/�w��G)<��i�*ǳ'�D?N޵��tx���RʊsNp����N��K)�1/�d�&҉+�Nf\V�q�,����*�8�.����dC��2�L��܆e��rz$E�m>��>�ہf���e���jෝmʈS�&�a"EX�/eh�y1^GsY^;�=�r6C��A1�StJ�C"�=�B�l�\����4f�1��Zzy�檠�v"X��X�E��
��~�@7�l��Sd����T�M�����{^*����J�_t�Y6�i�I��uP*L8R��?�Wa�N�A�2�}X5��+U��	K �A�u���G�:��kn��<�N`��Ǝ+�������srΪ09 >qP�S�����f�o�έ��U���SHԟZ���0��������NV=!-����c�(c�^-�O�G��Sw�d��㹻����B�U������Cc�������5�L�(jO�����w��~�=�	�G`�f�ᗡIצK�cllq�����_�ϱ�fYa��a�D~�Y�`���Z 5��E��V��t���������p�7@ ��w~�p#�x���c��W8\Dj��.�������c���A	����>R��}tt��=)�\� m8����g�"�($pu��0[����V��⒳�Ɩ.AO�SySO_D�y�����N`��h��b~d*���1_�sM'���h�7��B�W	�4z����zq�Cj}x��ʙV��g�{�՟i�?^�^��V�y�wE����x�hHh����S�]?:�}��񇠼_Q��cP�?��1X�5)s��W<PU�w���.�;��[tZ[� {|cO�Ӡ�4��)��ڿ�[_��Ļ^���R��_�W3���O'���-=�i܃���{Ly;>�7>�@�b�����������{�g�=�c�azOLA�6�wl�9�X���s����r���u*ku�e+B׿⹍��+䝷�T<�iN��R�>+"N� ��Rl5��~����qJ?.��� ��+��Y2/��2�&�oa6x��jdU��8����դf/�TF�n�Y���~y�����+5��7xMG���,H�0ó���K8��8}Ji��������}�Y��d%9�ry��l�u�c7�.���2��+�UQt�ܪ>�~o� �hoR�L�lz�7H Y��OZ	�LxhDpt��9�%:��A�x�Z?�lr�%
��
Y�cB��I3f��WG��j��̳������>��t���:Wި�s}I��EW2�\mxF�)�~�V�����崪��`3X�6��,iGX��wdRY�l�mR��9�p��K��<�mȎ��ȂL�?^��8��^�bZ��s��Ҏ�&�x��}�h�����bW}�roqk���؇tGb3�w�Bh�lZR�}�qS�0xΛ�+�1�j�6<c9oB� ^$�|�}���d��ǘ�/$�R�,�sj��w�E��W�[$�"^$r��������hI�������R\-&$�Mq\�c'�ȚΞ�n��ަG��;$��a�1��x,����i��ڙc@�M��Aɜ_ ��}xb�]��'+ߪ�0���p�IME���X��)�w*���	��s7����٦\�J�r9���{���`�J*��)�E)�{A��wF-&<4j�R��X~���n�誵,'� /f�xҲ��5��A��T.S�������c��x6�C��kmψf0�y��5��L���q`{󌇿Ft�Y���pe��AX��)�`�`�/�V�����~���]��A��1q0��˸�&�i6k�yCܷ�Y�e,�L�<�����`Ez�$"�&h�g6_5���s?f9���AlC5��b&X���bt�����c�e|t��~�1�Z�~��9~���wy�`~�"#c��C^��M?<�(I#�����Tc�>���K����ϻ�`FOqF7[(�;��ҍ~&����/1�U��3�8Ɠ]�`�)���G� T&���+��p�>��џX�i�"�2�M���x~���Y�
�p�s��0 _�7ɋ���&r�fQ��b�O��θը������N ��b�ax�e�w�Z:�V��7��q��Ao�ѡ�Wn�myU�F�?H�c��U�QF��8E4�gNwP�g�?c��mH�3�ݥ��Xn���ݣ��*E���
}�jV����"�C�*�#�>21L[�9:w)���UZ�������r)R
?��<�S��=���#<w|�E�Si s3xV�o9M^�X��(�;�.��ardF���}��~P�ݖ�u��ww"���m׋ꀨ���J�21F���\���v�?��-N� "�E���_���F�oG��Wњ߫6:!֪g�^(
���a@�{Ly�x�ۄi�e�׬=�֙��8mo��D�a6$����*O��E�-C%���:�.VGĨs��g$RK�@dŪ�l:�c�?�M1g��79�8���◕Vg���n� f��ƛ�{n:ￎ�6V����e��8ݩBb"s�_y��d�O�����'�vc�}
�}L	U9��|>�kB��|���`�����6�'qH�g�o"V*g,
��O���e���%�E=��H����'�aa/��1��ZyJ���I\8J!���9��.{H����/����K�p���`�v�.�: S�F�m~3�qZ���eB� ��N��]	I�0��� \�xsĩ5��5vQ04DI~k�m��Z�f1`�5~�y`��Q(k�e���5�z	1���`0�ڪ��+h肤ը�H��6/�.Oj�2.����_��%Lӵ�z�����\��]��P�����G���s�*)M"�I��:�yjDT�N��;�B�'��U�k��^	������V�%��D�[^��Fl�fI���#�s��d#2Y�@�b(Jy�|$5J��ZG7�t9�Y�V�n0#�WbY�ӭ[��r�w��������3�cN�[�hdO���?2��{+pLh��x�Yӷ�)Y�f�]��M�xn^s������7�����G/�ԭ�?��F'Fi�7X�^us��#��OV�i;@{LIޞ����%ِw+�:iW3kSєm��3�?F8�����'B'�J�YQ^Մ8_�Na��6�b����H���o�[o�d�Zv����ZbZ����(�H����©����#P�~��� G�O����E��EKt�>Z��@A�Ԝ��._��gsb��q�!�H8#хj�"�I���ԃ㤑ļ 30ְ�+1ԏ�@h�n�=��(���A n3-�xO��M�N���Y��Vϧ(�7��0�<^m��ԏ=_�/��c�~��Cv��a6:���a�\����Tj�c����3��Sy2d(㗰�����������s�\U��+��Gd��11]b�ɨݝɹ-���b�<�t�|�|�νe�I���,Ψu�1��ǳ���%����&#S����b�aC_��}^+�Ḡǂ��=�b�c�"7����zpaCb��P�O&5M㨘+덋�Hp���I.���k �.��,~iu1��& ��񲵤(��Y	��ئL��qy�3��I�.�X)Vw�I),���ȝ���p�J��,~��F�c��8�_����1�D��Єza��%LY~�hӢ�L�S(ɖ��^nz�"�aV�Z��e����kC��r˖	��Zf���~�]�\�w/��e��q�]��4��3��fGmbݺ!{ƒb���^��}���%����e7�؆[���h�G�^�]�m�5h"������d�|V���*�1tY;�3sXH���/$3`�U/�)�K��}D~F�"�$8Ό֌�a�R�f����FU�I
��r��H,�j�	��d�*��a($o��t R����L��٦Y�׈r'�MT�^ۦ�Z�#�i���99���@�����`
h�X|�WP�-��_����eJ-�	���׽��v�ޞ�.왺S ���J�j�A�w-�w��i�W��   ���}[sǕ�~E�WC c�q#(���5`��A6����n�k���N����F��Č�#�&-S�,ӿ|�_�?a�9y��VU�B�6[6�]�����'O��w
y���,�,y�b�ܗ����������4kV7ū@��O��Sݙg| n3G��)�t�������4� x?���]`�_э���h���$�?�7����(�9p��sF)24oq���o�dD^��˼}"�ه�)_Y�GI]�J�"��8%�j|�����Bԛ�z`f���-��ы�;���G���A���A&��AՔ�,����p�E�P(=�jm�����\�3<��7σ�ޢ,�C�OĖ��,�4�?^���N�7VO����d�����,a��6|�B�y���.̋#?��q�L��)�/G~8����@>�	J�̒ۦ�Q&\�&��>�g�F�����l���1{Nhs4�f6��֤�2�2��,�Ӱ@��n785�e�nx-P@�F�@"SFN����t�ފ�&'�� ��:J��'D�,yN��J��<�C`�$���Nc�W��6��f��8Uܚ�~�9���0��^z�&�)ѭ�=ۉ��iA�'�3;��@��B�R��&J��cm��6���"4�<sL���p|�E����=gHS�'���n�E��^��Q�jiЂ�R���?q�����H:@S���nG���('Я��Aj�;R��V�����*�n<X���m5�j�^wv��u`=�� f@iCD1oGE9?���p�	'm�sq˰�Km��M��-1h��IZ77�w�J��*�ؓ�&�0Ą�}3j4�Y8��@X[q�!g��·Qc��YH�l�[�S�pzk�i8�t�{m�Ƃ�7��u�?��Z��ע�����2�'}�?�L�Z/cL䚗�-ǱÛ Iyt�e���IDC�4���}���ʕfRӴ��l�]�P�}�{f(�u���2�;�9��*:
U�-r�G�2v��L{����Ĕg7@ �u`y°GO;=H8�.�wxX�T���@��״��"�]L8sY�4��ȓ�^k�I�2B��͔�4��i��E�Tb!�h�q�"���dA8$N�!qBco�k�1X��2�̖��D?����ш�����4gzr��|K�
m���� O�7c�\�6�G���-�@UqB0Ě���z4��^R	�w_d$%��p�ف�ڊ�������t�1����LH=��`T=�m��"h=�m�V<��y�磁����7[�qY���Fĝvc
��M�R+��T6S�1�9��\b>|2P���$x*���mg@�`�?>�0�!`4��A��cĳ�+� ����G=�
Z�݋_�x�gԪ<�1���o��� ̺fj>�ܱ����ĄSS潄��pTb7ߎ�,A����Qg��َ82�VR�4�R�C�����q��P��Hߐ�sD��)�Ձ	o3��$c���v�v����3�v-y��+G���a��d��0��=� ��e%Ƥ3�]���&��9$��hD�1�c�U� ����Nva���������ϟ9�<�ZN�2Xs�-�<X{D5�t>a%B�d�~��e�g$.���y�	�=X��ي��2�gj�N>�Z��٭,zpA�bwz�-���$�I��L
b_b�呰�.ڴ���ɗnI�n���,Ċ���г4�k�9���D��$����1�}A�b�#�9��x�X<҂@ŏ�ix����bO%4�7l�~#�w���1 K(=�"�V�,� �D ���c������d�6M u�T���ݣLB8s4O��)�Б�%eea�n�%q���7;01�#�M����T�`���6���>�����Ra�GH9���./�1d�0 �k�6=�,�[Kݧ$A鼔����e��$dK6�x0�t��RI쟊�-6z�߳f�YƙP��G�G�mJ�\��J���`��<�T=�h�oƍz+gO+�ޔN��ԕ⌭gʿ�L�֓?�k�~��y	�(�Ǳ�8S:~Bd�M�[���'wJ���M�<��[�A�~���Y^���E��$�B�b��
f/-��`K���qΕXl�)h���e�h3'��뿫�����&�����-\7t�2%�h0@L)��U�����(9((�n=S*���)A˞#܆��_�xĲԏ�{NP�ؕ��]��� Y���m�]A�󴳖}��Ȓ�b�."�פ�rUsGa�M��7��0�_����i�8� ��	�H~"�m��.<Ad�Y��L��'��L�l��gap�!�N_Lj�0�9\4��c1F�5%�"�m�p���`�ήy���v�:�;�!`S����H����ί��OM���ˉçB���g2�S�r�5	�_���g���[m��'ۂ����C����7�@c7^I1��o�D-�@Z$+�����g�p�d&�t	�h�m%<%�,����vZ�O8p�S�P[L���D��&�� ����h8���#���N�R�;~?f���;�~��#㿾�����l!�02�4�;�xI6b���`p����t���P�s=�e��_)���z�!��4�>���(�E�-.�ˈ_����2�٧}��^�5 ;1�W7�vJ6�u���FӍ`���z{�xE�Y��7r��q��˼�*�<�9u�k�2�ũk�'�z������g�bμıy�W���A�5p�o ���'e���4��z\uhK��r�:h����l���/�yH�(�w<�8}��Cu���a�:r��;l�G��d�%Q��t#��^���Uf?\����~�, 	�/��C�B��*�{ͬ���l���(�4L�=N画��5D��נ�O�����x+�����l�]�je腀 ?��R������ni��}J:�WX��V��y��?��H�����f�#�X��P�w�٪װ�v��,
�>��9�H?�sXLN[80�m�[	�)�fG?�����Hɉ^ �仸9��RES���HN2�XE�I��\N�� �M
�?��R�}4�{�֝p�/ͱq�0mr��3�IG��+���?�&kT�jr�l�������h��n�{�L<w����T{^�&~�kة5�K���p	.�?���{c�nÙR���%������q��Gkȅ���T�[��9���r�Έ���9}�w�f���j�)�\�$nN��҈�Ts��0�.Ф'Q&*?F,ׄ�4;^�d:C@Sy��sz]�v5�w��:P܏��?��/>��2a*=��@�G	��2d�K��|s09�Ƃ�j�d��j��j�f/�'q��4���ʖ�X���˦.��R�E�|��1?'�N��<�|*%Sw�R��3���!˰U椓���^$����p�K�42���pf����wJo�]8͔��맟�J�>-~F<��I�a{�*2Oө\���̭i��Gg��u?�yn�XK�4�lk/:l���'�la=i�Y��kyj֝�JV�Qa>BCv����T��;����Fw#7Km��\;�x@��ib�B�Y61�(,�U�̸���c<3���t�4{��c��2KqH�+���d�y���[�3�����2�� �30�^�x����ו��SDw+þ�*����m����L�Bkן���B�e�U��}��ơ�Ԁ���O*���"{���4v!���_�ż��+�r<sV�}߫����
E"7Lk�v�dq��z+u�<��E(���E�;�]�F{i��®�|l�;�?�n��H��F���,&P΃e!��6�,�}�K,#�i-#�,4��7�f��頇3��m�����x�9��H����~=I~ŭ"�8��$�?��I�g���ܢ�ͯ�?>���U��!�V�vݣ�@1�L�)v�8�4��0������^ʹ���W�?7�߳1J�<��t���?'���VR8���0���3��zt�-��B���4�v�;������_Y�1g�p���I�7}�^(;��(��6*j��^/-{5�y�<�<����!.Dm7�PX}N*�2LP��ͣw&m��W�e�cǄ�n�n9�AƖ�ڊ�[���6�;�o(��,^����؃�n[%�w%�]�B��2�S������V+���*��?ط����P^��m?����I�FQ%�#���j:�Ք�[�����,vNd��
r6P}|N��b'�IT48��ӫ�ӡ�Z�Y�|ֺ����x��.�����Ħ"����Ke��)�%m�%bp�5��v��_�����9�z1_"�Q�`x���~��^�n��W��F�6d5<��V����6����{��Qf����=Fw�/y��=����I�o���݄�%��y��8ϭW{�I�`y�F�
֋�l�r!���7k�%�2��Z_f��T]��Ә�ʬ֜ !X��Q����c�7�_?�K�������P��ڵ�B9�����g���޹��D&�sb�;�� �-'e2�0��,!}"�t���M��ga<�����i�5�g[�q��f�r��>�}�'�Py`��o7c����S杼T�F����#< ��x*�R��*"���2B)��R�?��6�gXÏ�e�oKeZYD�E3���'������3�&g�B�W��nH�,`��s�V���2���8}Vn+�cG0�$�ڃ�g�[���8;���J:��2��6��]�CUP���'�Еe{/��p+~��f�j����r�8�`5�T\�8!�#�/��u�N.�%��-����蟋l��;*�?�I����Z��N�@v]������^��~��C��!6s,/�>Fޞ�����a�K��C��̈�ۈ��C�R����5S�/2����ND$�	���AK%��=�U�S� P��T>��ף"�B�I�&I�<�/M����П���4!�v+@W� ��yJɽ�ȿ��@~3�f�D�}y�j  ��D_�0�?J�Ο�[|�1v��kU0ɃMJ �z��Y�@�('bB��`k�]�Y�Yx��l��s���%*�^H�����?߇���_��^3j5P�x���	N`���X�}|�͋����y^<"XVJ����oq�;�y|Ň���B^8s�<(���6�I���	���p�!�@��OɃJ<=~r���?����_g����}&j�a�%W����Uo�h�#��'b�˴q0�"Q���mxt���}�Y�p�z"�a�TAW�D9�0��u ���Ғ~�h�hhc���Gdr�:�xR��ش%���W0֤{v:rg�$
�-�(�B..���C�BΑB�H�O�Ƞq�����/ͤ���A������Z�#�%{B8Sh�m�/�SJcx
�*��E1J'���)0왴N�]�O�g/������ecu��I8Lg�UD�O��i.���/���֮��bIi$����Ó��i�1��A��v[#�t�.��ڲc"K�x���� ������q�ya������V���NR��ݲ;|k}��ʁ���nr�/ϼ����N	���+�M�p�#���D�Iԓӭ�:����2lw)�	ї̲z�� I5%|C��N�ĶVF���^��B:υ~�t�*���A~�$���<	p���v��l����c<4�gA,�-�`1�($�<���R�!i���/@�]������w�U&;�	�suF�����Qj�h�3��_0Xsl����׬�а(�x�l�n��|��d�9uwJ���棺V[Y\Z�QA�`!s�c�*�Ի%�K���n��zL&2�Di1Kx�}��Ӷ�U�W�7�.�9��d��k
�|�ܪ�~��2ٽ����`�����f�a� #'���x7�H�ﱉ�"�G�C��tP�P�=��NbKbR�������n��0Ȏ�&M�濣�N���>��$PBV���AU����P�.ĝ4n�6����"e�EKYg��H�I9͕�A��qt5Z�2�$�(-��)�چi�	�y��$n���	����gfT6�ݰ,:$��V�;�ho
`��Xp�X,u8�R��8���������!��ɶD-q��r	�}؉��"T;<B@���	3��C#���ѝ���`B�נ+�W���)YZ
�3C9�!��_�(���X8��
��S�����O�9�_�2�G|�5#�wUOx]�,b��~�]E�lDv�BI"��r0���+��
��矬����?��F�D�����?
z x��akF�F	!x��p.��N�_�蜖	Td-�{"��z��L{�[&嬕�I��Q�7Z����U�ݾ�\L�������Bc�t��jUFY�g�h�#9'W(ΎF�uq	<�6�h�Ǒ(V;��p���WX�8��G]Q�Q���;>�2���bx�V�L��0>��)^�
�J楠� }']���i|��'�m5��w'�buM�,f;��W�c��e�'=��I�Z-T�i�om7����.��M.���j�S%Zs�#>%�����sy�%b"��)���=�Ozr{r:c��lջ��E>�ΐ��1tD�<�R�oϖf������ċW��m?��@Z�L�no�/�<�3z�~��F"H�s��ҋvc̪��Z����@7o��A.6������)Sxk��bW���N4�F���'�Mpr�@'��OI�������I(�r"n�7�:�9Of~B8d�`8(5̲N�%�Tș�y�a��J�͘��޹3>�I_� 7C��:��u�|���J�o����z�Ƃ���*bs�:��@���}���w�Ad!P)�~U�Dm4o�K1&���I�s��u��M��1�G����H��C���6�wu�I�e�@g���ka�S�J�^���9���P�ŷP���z�Iΐ|�U+�v�!Q����U�Y/r�3UT���;�!�k��ΎT�N�J\zՌ'�����/; N������g�����/54�p(rơ�JU��9�x���_!�s�<UB�2IN���yS��x �MO�6�z\�Oz��p?��+v����^e/�ƛE6��Ȗ6V��7k��p����t.�L���T3ef���IY��`N�M��E(��������W
��v����[��Q{�q��_�3�m��w���֐��%�hWk�	��3���6�ԟ��6Mx=8i�����plc7��6��[=�����_m�'n�0*�|�����������m������Y��!���c�^|̿r��o�E:��z���e��x��q��s�q�b�~�]`7�v�hD��v-��u�7;�R�������_���(U`X�	���h�9�8�c��9Km�V��#+LR�m�� ��wh:aP�3������,=�:kE�$�'�7K��l�Y�Xy�E'�4���,���,���OQ�ԯ�Z�@�ۊ��;au7; b!/Zb;Q���-����g�k���NFlM�X�R3���d.O��5~����/�g`#+z��T���^ǉ�{�/-��Zm��������F�]��RYa]y�����?��x!t���KB��up罨����b�[��?��S���45#(M���8���-�������<��"����z�٨��/����{{q�����P`<�NQ1�4H�"�
6�h��hV���w37��Z�>������[���5�QtYK��
��2�	C-i��!EY��;���=V����"��'*3�g�=��#�__yz�� ��h!��g�O0"���LDo6����Wom�p��; Ϣ��y�-�i���N��+��|�#5В�D񛈗��o��/�|Jz��`X�ۏ)/��Z�t/��ʑ��mǝ��n�£8u�L��QL�(~��M����l�^9'�K��omI��{�3��x��ύ�o�|c�v�-����t#,�ˉx��<�8��'L�y�x��� �/|c%��ˍ���D����K�J(�#U�|O+�=?�#�d�R"�,��(I�����.�����T�ϕw�2��7)����{Eܿ`���Z�'�np*���z�W���V���pq�-���X^�>���n�ߨ����w��=yh�;s?aÜ@x$� �b����g�O���9gֺ�yX^>$�\L�����������'��	�?�ާ#n��8t�H���!�zX9�o�r�� e0��}0J�B��".��u\��R7�k��� ��<6�su�mb$O�Ghk}��!D�"����O����P_G�}��ݷ�gcccL\�� }�~ڌ���[@�iO+����U6�fS�c�>��?��ѷ�f��3�R
�C���,�0:��xć��f���.o�!��F��,~��O��n#���G�U�o����<��{����<��;��7|��Y�B��]H Gj����Qx¨��n���S3��xg*��V�k��:�Kq/az`^�`<V���E�z��=V�~�<�F�h�5�c>,�o{<�?�yo�Աē9�����!�;i�'U��]0�6�f��Y8bX��MM9%qAkY=�5��ŭ#^^s����d�޵Y6�@��dJ�d�����3�{����O:���]� �k���$,1Z:kI{X4w?n6ރ
�/=�'Ku3]�`@��L�p���"�03�eޙ���n���3��,r��Iפ>�T#~�mͲ��j�����h�(�Dd�Wŀ��2��i�h�W�8���
�{W{�'x${��y0L}��5��FEuA�U6��rF���i�0�#^t�"�-S}���;��MD��pR�F�d��3��*�Ȇ�d����0U�J�VY��e�EhY/�X�21k\N���gK2XwDȜ�ES��{/>G��_����׏���C�S�}�})lL��Hq��o�>|d���3��/>���Ǵ�?Aa�9�7C�F�)��/�{�ѳ��|����Ҿ��������zD��p.ɼ�k��H���&"L�Ɖ5�i�&�z�ݷ����m1�EF�
f�9�|�[搑K�7(��se�xZ�S����5-��`��,�"�Ce��V��E�ӃζAd�������!P}���N�����׻�q����H4�9�U��c|�?f�E;��������Y1�uy�z:�DUH��z�U0�S����Ɲ��;�[��f���˱wPz:�g�����Ko�p�|s}㈡i&5�r�=�_�0h����G.�}�x���Y6nX�L��(I뽺�#|5�ͰU�6GبB�8��2`b�ddiU�"A��fk�w8)ଳa(4�����TL��Z�l��"ީ�I���=r�:���
8!��~�f��*+�"'�5�\��Q����eb8#A��E��L׫<�>�Jd�>ֈ0MP%� ��h�����n��>*d�/>W�e�'X_�\Z�_f�˵��Y&�p}f�ߋ��:���7�{t�g��9'��3��&��~��I܆�=�Ԙ{�rjn�S6[����v4�:��ĝ9\C�)/֖k���ly0&l��Է1��V�+�iTr��7g��X���Y��-'�j���!�����;3��0.>�>�d�d� ���%�k�*���!�=��5�9���.D����Z_µ#s�u#G���/�iF��k4�]M�`}�dk�pd�������E�&�9�X�Js����2��^�[�mv�uת����ى�0�)����MR;b;���:�`�D2m�~ �Qmg��Nqֲ=E�i�8Y�q�e� 0��H��~��k�a���#:����h��o��X+M԰,���#(n��~Jj����2�[���l���o������L�kAo{��6Ȇ�i���#�R_��*�!z	4/oS=�� n����m4���~;J�ۊշA�߃���;����wej���mfW��~�̃���)�,��&�fy¨L>hG���m.TWd?f���!Cģ�lÜ����4���C�U�&4��V/�(ӟ�D�PAs�H����CV���A�ed�9��Q�ęE��smp�jn���F��3AN�c� I�
)d��e.g"�%7�gQ���&ͷ�Z�ah�A:�!)��
��S>��.�ʴ\���#�I\*N)�q�$V���Ta	Vű|���ZIV��׋q�da3X������E�Qt��e���7k��/��VG��z��][�_eln�ݕeܷ�O��{
aߛN��P*��v�YO�2L-������̐6z�'#��L���H�ʄ��ة���*	��]�sX���7b�"��1DN�|y�����1�v�/� ����D�r�W�_N�x3�'��j�_:$�g�!8+? �D�7+��\�E�|c�
1c���{`�<�"�${�#��h������	��'����ʼ��@��q�7�RN;�#�[����8���)�� 	�}���"XY�	Đu~ �C�n��� �D�K,�S�ۣ]��0�g�v^;:�ؔb#�w�j�S�]������B�<ƳfSF�|);H�0ue�o�Vc��/nMB��[�<<��vv�b$�N���C4˓o��~Yb?�w�*E�W����tp��d-�&u�E�.p��NYEݒ௜���_���6�����pr?�*̒r����>���_u4��Ǯ����L��ޔd\ӾV�v=k�f̕��S�=_��{��7��b�7M�r�_�r,��v3�-��L��dTa�(�m�If7C�vݗ5�;�`�m���y�%���w}���uQ`n��؟�)r$`����ز� >h)iWB�5�q٪�۟�fu��@�1j��|��\@c�,��EM��!�Ttt��{
�8^N@����2�cmm���Q_�M}��ɂ�l1���f�V@�=�j���&}���(u�D4�؊2d�].��ڻ#]>g�]-�t&���Vٹ����O�����{nB�5��
1>�;����]���rh�*�'oJ�����\��hgH{�vW\+����yn��Fä���H�q+Ea���pե�5�߳���I�H�LϤo�_|��|�H�@����vI�ꂮ}F�"�E�ً��8ϖ�8��o4�̖��<��Na���Sbg�yW_!���0ޞv��d}�1���6�����w��᚜2x]^bUa�9�5;�b�jŰ!��-VFG	�G*�̦K%�A��+&���C�T�-�K)���j�̹I�L-���Y �����:�&W�W:;�� ]�H-����돞���2Ǡ�/2�*���9��2<��Ю�p��t4�G�'l����-9��?�r������B������_�H*R�̐��]:�y=�D�N�P�ze(U_�p�8{
��@ݮ�?�`��.KQay
?ed*�(��`*���-��
�(��%KQ�	pҲ���s��)n�N9���fI*c/�f�Q�4��I_w�S�;��-!��n_���%��6b�	��@����'��$�C���d�Bǥ���"�Q�c��DR+��@�^�T~bj.Nd3Xy���P���1©����"�;i=��LR:�;y�xL���1����*eL���W���K��}���f9D): �A�!l��fZ�pQY�T"��\^����E�56�?鍒�W�Tx�m�V.�Q��N��Vn�-N���5�,�k�7d{���h�T��t6N�Vﻉ8���@	�<����;3�;���:?RRO�W������p�1N��~r�ɏ�8Os 'ɷ��%��R��V�d�ї�!�:<k�E0��r�Xv.|~����{�_�]"�V?��rRޟ�.�;�}h91:����p����݊+�ה���8 �S�K#n[��,MZK(g	L��N�g�5k�T[3�Ǌ��^[�5vO��ۺ��H*x��9�4j�ȫ�Woݳj�e�6��}<�ZU�;�!+6A��_��$���Ȍ��i��#l�wY��ǾY���������:gc��\�IhS!��</�L�8v����p�o�#���D����d3Q�h�dD�q��Y��
ʻ'��؞ZN��ԃ.}s�Iﯓ�k��Эe4��]��$1���{�*��,]�Ͽ�h��U�OU:���ҥ�3��p��`hV{�E�'!50��dcc���Z;J� ݀�ckI�F�¦"�(=�5�P(�`/��+�lgh>��{ �M�G��vs`��\ؽ�p�m$qׂ����c:��T��ف~�[W�=��^{B�o�t�E0�#��|I�PL�\~��3tz�����#r"҂4f�&�[�pK zXL��Qrځe)���ꕙQ��6Srpգ���g ��.���	�Ӎ~"B�&���PB(�+ß�~��>n�a�m���zВޯ��f����t���e�T��i�%CsL�f�\��	x�,��I`1����rI��F� �N&J�gy�
r
g�)0���8�p�h����"2t��S�����ِ��=���W�s��+9??j�S�|$���kF����=��� �aܲ�W����>j׵z�_ݘ��kn�Pѡ�cS���Ib��[�����C��6*�	Ꝃ�)�x�Z�y2OW��U\OW���v��0^����T63��pzd��-����K����+�yE��<�Y�e���1�h�]r�-&�z|!�6�:��NnQhu��T	� >_KX�͝ft3�����$s����h��:\�&󘧺Dț/�S�.���6�d(c1!�$h&V}>tS�_ˤ�YD$�0��s)|%>Kd�8�6�]��	���'�Lbb!�/�U[�ŲJ,��ف��H���8����!z%��]\���A��������:�w�6|��!��ϚN&�@<�K��K8j���G� !�`s�}/��,�%��+�x�d3��>A���ʹ۪�= ���A,x�</��!��3.b~9k�Vgian_J� ṏ�Rn�?b*}8�C��q%��%D�����A�Fqo��������'t��]y �A��M�e&I~ҙJ�]+���I�j���8��_[�D�f�O������,�p�k	�#�4N?��H�;�Z��n�%��xv���$5�	Q=�<�G	Rv�MyO$s���Ss��aa��FvJ��ڃ]ś�������f�/e"��;b���DbU�o��\�6�����,��1���T�<
+���Z�;��p���a�(O|�︈�%�[B���F�;��yH.��pN<�>� �"����߽�%b��A�H���[|�*�F'���'�z�xR�2� �����,G�޷u`>��X�idhJD��d���uZ'Оm�8�N��xst�4�|+�ri�0��ݮw:q�mE��
�ep�i�Zh��8~Y&X���
�0]e�Pq�f��L뗣{V�en�Qk:h!�x<n��:�l�0ٸ뿫�ܤ�x�z�TXk.�ꡧ.}PO�N�S����B�ԪY]�|�U���4�A��vG@�Z��U#P��J뷲G�FBt��o��q�p�5������b&��ju|["���F�!x:z@Ost+
�X��{[q=i(���K��S[z�I��~�"Q�D	��(��o)H����x)��|ٵ��$�[��fK�jʅ�	��2�Y������.�+�װxv���(o|3���.W�Ϛ����?��~��
݋o�L7@t��G�kU����R~�����1@����;�QUA
l��+㕑j7��ܡ�ߐ�A?����?�����nH+��r��a�p��_޸�X �T<7d�3(<9	о��z����Q��IA<ǩX*��G����n�[�"�6�9}K�,Uto�����|�
��"Y�v�ם�Vd�슞�%�J���y'e�&��lW����Gs�fM��e�iQ�G3�U(~@�1F�$�h�V*�S�d��:퓂T1OfQx�s�Ca�H�h�S�7��o�W�J������Ĉ�i�| `L3�U�2�E�}����	�3i\���������p ����
!�*;G}����\��2@�ݢU��V�~�U����!m�a�Ģz�T��(��J#ta��-��@܌"͔
�"��������Hü��]��욓y�Z��� �����n�{�e8���ڰ�f~�c6X<�j�:J/��UwUc�f����u��E���͇�<�9(T�fҋ	\=(��-�X�����T
򎎭��������;�e��m�zp���d�x%���Z�d(�`l���L���X��%Ҟhy�[*餼Rl�t�ms7�N3�q��/-��^�����[m���)��֮a�[�x�>��ٸ�� �Rap����/>��_�uT��ƃ�0���?((�����N�m<�.�A�s�b�~؋�c�p���6���^y3Zj��H۾�_��r����=��	;�7�'i+H������bM�D}�'/�;�D�����[��(@>#���B=�g��2	����jI��)~�Z�O9V���UF/}�����&aO�!���W�L<���s^�*��cS�>� � �G$��՟2!����<TA!R�4{����X�w���G@>MA\m ���LnA��j3�5�U��BW䊬���Ih���:�K���p.1LX�B �Gh�5i��kU�Qm+F91���7ɇ��uZ�1� nGF?��~���6z4��[]�Iƃ5W�͸�G�a �Xe"�艉� H��;��>Q����Kj��%�fIU�oxQx��@��o�r�BQͻ�����������P�.��Pz��B�yͅݦ�[��^>�mq���0�ޖ��bn�*�v8�WAc�h����QA�g���.<����8��#��Ѷ9���q69a��iv��X�6Y����ԕ�S���q�����x�򮧦K�5�#U��`*�#G����C��3dwRVߍ�/���x�I�+�%x���$��~�vx��I̪���8@��
��s�jm�{Z�J������Hw�ݓ����׊l���&0I5�5��kJ�Y��D�zÕm��������hRo@����L�~� 7���/���:Uh������՛K���|���"�u�>��tckUy�M�z�8����qkU/dU UO�gŽ�bF�9؁;�ӝ����V����@�?�wn�;0)mQ��kGm81�*�U���������B�Ī� b�$y]�ۗ����?�o���J�z��^WE�g����()e�u�Q�,I�E)��HAh�n��Qy*J�z`���E[��u8.�f��?�I�1�f�zėimU���_bk1�����	���Ԅ�HB���`Ԅ�<���`���w��+/�e`���vS�X6������kv�Iর�ΐ�:�ɬbaQB�%�1�i�)l����]�x�Zf%��ϖk�����������������ҍ��B�&����l��Ӎ����FfN_��Y�]^�i�m�n�/m����/ίCS7?��y-�oE�N�Zx��G�ߓ˪����ȣ��T��������I��4���ol��Zؼ�^c?����Y)�)������������D��=j�=��d�m���V��7��o�,|P�9������[]��Г�ͥՕ� [c���$�������t_%��zw�3��"_�-c��Wom�WJ��6�#]}*q�����Q]���
Lʢ�����(����rm��[�����[X]�\_]���k5�x���!e3Ćf�Q�� ���ܸu}ca}i	�a�l���҂;��c�a���'	*�f[������M�@�EF�O~������\�؀���x �'�H�O|�X��d�4�5��wW��y��G0%�+=�8���ss~���2�Y����s�������L��[�K�l:�>o�*$g8%#�(�1�Z���_�|�1�y������.m�6*���6?C�!݌�Z����:k3ߖ�{�(e�����������Ym��Ҋ��e��V?���&���.U�������5J�GV�Va���������������D�ʴ9r�6��)o_n�\�0�fS
5�2�ެm���靋1JX �Z[^��H3az@	���1Z��'_�@�}y"��OՂ��#�g{8�z���:,X����7��&,X��<`�~Z[G~�'����K���G�:�@�!�^�L��*5����ųt��.y�v�c�K7k|P�����%�H�[���	�3.WsI�1E0��<t�'>�0�܇�Yy7�VWPY��,�ց�-�`�añX����}��L���߀�Fd��+���k��ei��ܼ��mt���)�*�cFd�{����G���M]6R�wc ^���"�� ��������O���ʑ��<Ϡ��K�s���U��e8&��ɇW�_��6�����H�s����rB�����ZaH𚻉ᆃ֖#�m`�A+�+sR6p���A��o��V��z�͹�xk����j �JW�q��q��������Yr+�F��0e���gĖ��������}�1R��Q�x�X����߄�a %WXM]o4V��5�?���{��9*<xQHqǓ�@�(:���ov�~-��eD鑇�ҳ�O{1O�<�]eǠ=c]�� ��D���a��du_挜v�/t��5�两���CP�@��^�Gż�*�9[�96��V�b��}�(WqC�.��n.ĭ��Y󯱡�4=}qrfm������̕hb����i����L4dU(AV��5fZ���y�|*<o��:�3C��x}Q=��D�?P=򡬢�c�9�	��&�n�����CB
t;6��C�Y�P���eݛ�{Y�ܛ�83:9sytrrt�zi䎪t�Dzȫ�����+E'us+��&�e��no�[�Ó���ޙ�>�C�"jtw���;�yŅ}Q��Z��{��7�K]O�̋jj�G(m��f�2����T�K��ՒI��-cӁ�Kq2zL��)�+�U��/�J�c��A�+
E�yı��h�>�h�e�Q�nõ�������ӊ~Bߑ�T�g>�g_�!q0���O�ǽ񸾝N���Q��%�����s&����.ot@}B.k�2���A��;���jv�z��0F��ۋX4Z�����7���(���(��Dv�4��d�6z	,��A7��y�F�uq|)�����0$�"�+���2��g�p�;N�_U�y���V2o��N�U�W^�Z��C�w�a�����H�E�dg��Łz��4�j-\]�o�~�S��c�2����|AƦ&�X���vc�\F�:�ե��y�|nz�����Ư�H����z��#MA%�1�
���O�Y�Hez�R�xg��b���\X̋�����ڙ���)tR��A���ߏtg�6�Ćz$��8!�w�+��;�UD`����a���{�h&�"�^��Ox�`7NMx����]HH��e�<=ZK��%0��D�OX>H�3By8��t?��ߛ�
!�����%��2<	�$�������5�.��1����Q0�+ʃcb�[nol� @�,�5Չ?����V�]C�p�$���=pzݩrI����,�1�u��4f0C�L8C���n�s�Ԅ���G����,�d���tW^$�C['�.N/��aTO�
�(�Eϡߵ����c/s	L����L-��IwRS�8�n5���-0��{y�Ϲj�>Ϟ6Dt:U�*
	���J��A�0`q_ޥ�Hi2�+P�<9�|��'l����m�*�I�3`f��4�(�<.����l���Od�:�h-ͲC�}r��(c�� v�h��x`\^����� (4��������M��ǌ"'�O ?1�M\c��(�.���|X��_���zF't�/���&&{� rL�����@iт3g�+�<3AXV:
g��r��فt�C�DV�H=7��7���ӜS�,�S�y�[�@�Fm&M\wK��у%�+��,j�,�F���B��� ��d1�%4��Fy�pUy|���o_|�pͤ�㼗�Lw�Y��ĨqI����:r�v�1��A��08 g�u��-��8�W�t��C���'�򁭉{>�F��89a�4^T!��/�)�=����uד�~�@�{I�a4R`�	)+]��	�|���V&��1L<��_W+ОC�b�AUS�6�VnÇV�W69����&���Fg����I��syt�
��(J͈���ߩ�i�O��/�˗��+�/ti4?���I�
�Y�g�Fo�je�:S\�r�m׻"�i�� A��ڶΟE�w=.��q�Q�:O�"n�6N��v{��ۢ��D�N~5�ΝDݨ�/uv����^>�R#`�k�ɩ8�va���=��� ��^�~"ga��o�f{E���#2�EC���k=�����������?�����*]�V��0���$����e�����O�0򹽶��҈j��ى9�)��K��mBp[�\N݆���C>c*����XE�cBBzg�ׇ
s���~xOe��6�kU��w��/�fx7lǝ��Y��!�<>��,�N��{�֚��@T[<��fz�NG�{��2����*�������o��L����'����I,G4�R���k���*ȵ���˫xC��C�q�)Q�`��%��'�Nk$�<"��G�M�Α\#��WA�%�]L���7D{>D��8�#�U���\��'Οh%Tӫ ��.&ZYɫ#�|�K�Y�/�����-f]R��@�����]qC[Kbr�����I�>l��g�I=�G��+j`Z̼����U����g�pz���ݕ�Ry����|���\�/����q^l���:�#)��b�z���Bw��q�Q��l�Yt��~�"/�k�5A�'�>:IuI�ӁE0d9_��ȘZ���xtm@���dcoz��4��z�y�Z�[�wF���	�����Bb�����k#��T|p��&�(9O���� �'����;5���)�jǠ$l=����(���{�Bm��7L�&�ђ�&�f���yq���L��5]hE�N�{Jr.��Q��)����7t=d�u9@.�<�&�ԭ������!� ���#�T{)�딴]P�K#l��Q����:���Pgt��ކБ�84�]pq�[{�-l�ΑYS��"��4s�$���^-������_%�R`��z�9�>�������y��
�q��Y�ܼ�&����[��������K�%�ֿN��>�v�M�M�E[���~�sҼ�����J-�_~��U@K�����{;}�Ys|�Ju�����Am~��//�.��08_�VEm:�����3胒O(�AxDS��t+��P�-���h���?�/��D-�s0��IT/�����[ok����h��Gf���˴e,���(7�
Oƀ�Փ��De:h
^m�	�4��O4$c�)�veĸ{�UL_, خD���
,�C�?h�S/9�E���;��x𭌶]�w0�zՊ��t0��6�}�|����|;ʲ�]=T_�5����+9%���f�]/7�͞ -�6�r~C� |d����x�/��n�'p�\�
k���a�k�&�����Į����N�5����o��29��-ew��&Ԁ�?ǡ����HU�f�7�':���3ק�7�]ݾ��A������k�3s��k���缇��{n����C��澜��i�jE�X��k7�$���l����_�z.%7x��Ȅp:��"�w��H����E���l�Γp�>5��l:���Qf�LU�je��z�'�V��t��眢<a$�T���׀
�Q�n�̶ǽ
<7�^��_�U��X��J�f����>;@�ۄ�MQt�w�,b�$b[�fe��C`n�~�0w@z�1�G���j��TY����ٞ�IT�\g��ל�Q��
��S�`VO1���g
�jN�GK�(@3�9��*CoL�[q���X�v M*^y�0uxx���h���+W�(�i�@��������`���!7�Ҝ�j2������(A"W���)/�̛\��<=~#%+���7&0F�OuE�S��U��`0"�uIV"/��ؑ�RQc�j+~�A�3�a����cZ���<0�3#��:NM_�t��5;����	�d�^�S�7������dgP���b�����&�|� ���nm�P��ѯ��x�!����V�r���p���X?i]�8���8����5u��6�g�ހz�n�Ȼo����  �� G֛
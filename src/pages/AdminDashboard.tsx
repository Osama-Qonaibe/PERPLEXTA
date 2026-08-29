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
      title: { ar: "Ø­Ø°Ù Ø§Ù„Ø³Ø¬Ù„ØŸ", en: "Delete Log?" },
      description: {
        ar: language === "ar" ? "Ù‡Ù„ Ø£Ù†Øª Ù…ØªØ£ÙƒØ¯ Ù…Ù† Ø­Ø°Ù Ù‡Ø°Ø§ Ø§Ù„Ø³Ø¬Ù„ Ø¨Ø´ÙƒÙ„ Ù†Ù‡Ø§Ø¦ÙŠØŸ" : "Are you sure you want to delete this log?",
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
            showToast(t("logDeleted") || (language === "ar" ? "ØªÙ… Ø­Ø°Ù Ø§Ù„Ø³Ø¬Ù„ Ø¨Ù†Ø¬Ø§Ø­" : "Log deleted successfully"), "success");
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
      title: { ar: "Ø­Ø°Ù Ø§Ù„Ø¥Ù†Ø°Ø§Ø±ØŸ", en: "Delete Alert?" },
      description: {
        ar: language === "ar" ? "Ù‡Ù„ Ø£Ù†Øª Ù…ØªØ£ÙƒØ¯ Ù…Ù† Ø­Ø°Ù Ù‡Ø°Ø§ Ø§Ù„Ø¥Ù†Ø°Ø§Ø± Ø§Ù„Ø£Ù…Ù†ÙŠØŸ" : "Are you sure you want to delete this safety alert?",
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
            showToast(language === "ar" ? "ØªÙ… Ø§Ù„Ø­Ø°Ù Ø¨Ù†Ø¬Ø§Ø­" : "Deleted successfully", "success");
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
          ? "Ø§Ù„Ø°ÙƒØ§Ø¡ Ø§Ù„Ø§ØµØ·Ù†Ø§Ø¹ÙŠ"
          : "AI"
        : mappedType === "system_event"
        ? language === "ar"
          ? "Ø§Ù„Ù†Ø¸Ø§Ù…"
          : "System"
        : language === "ar"
        ? "ÙƒÙ„ Ø§Ù„Ø³Ø¬Ù„Ø§Øª"
        : "All Logs";

    const confirmMsg = t("bulkDeleteActivityConfirm")?.replace("{type}", typeLabel) || 
      (language === "ar" ? `Ù‡Ù„ Ø£Ù†Øª Ù…ØªØ£ÙƒØ¯ Ù…Ù† Ø­Ø°Ù ÙƒØ§ÙØ© Ø³Ø¬Ù„Ø§Øª ${typeLabel}ØŸ` : `Are you sure you want to delete all ${typeLabel} logs?`);

    setConfirmModal({
      isOpen: true,
      title: { ar: "ØªØ·Ù‡ÙŠØ± Ø§Ù„Ø³Ø¬Ù„Ø§ØªØŸ", en: "Bulk Delete Logs?" },
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
            showToast(t("activityCleared") || (language === "ar" ? "ØªÙ… ØªØ·Ù‡ÙŠØ± Ø§Ù„Ø³Ø¬Ù„Ø§Øª Ø¨Ù†Ø¬Ø§Ø­" : "Records cleared successfully"), "success");
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
      title: { ar: "ØªØ·Ù‡ÙŠØ± ÙƒØ§ÙØ© Ø§Ù„Ø¥Ù†Ø°Ø§Ø±Ø§ØªØŸ", en: "Wipe All Alerts?" },
      description: {
        ar: language === "ar" ? "Ù‡Ù„ Ø£Ù†Øª Ù…ØªØ£ÙƒØ¯ Ù…Ù† Ø­Ø°Ù ÙƒØ§ÙØ© Ø§Ù„Ø¥Ù†Ø°Ø§Ø±Ø§Øª Ø§Ù„Ø£Ù…Ù†ÙŠØ© Ù…Ù† Ø§Ù„Ø³Ø¬Ù„ØŸ" : "Are you sure you want to clear all safety alerts?",
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
      title: { ar: "Ø­Ø°Ù Ø§Ù„Ø¹Ù†Ø§ØµØ± Ø§Ù„Ù…Ø­Ø¯Ø¯Ø©ØŸ", en: "Delete Selected Items?" },
      description: {
        ar: t("batchDeleteConfirm")?.replace("{count}", ids.length.toString()) || `Ù‡Ù„ Ø£Ù†Øª Ù…ØªØ£ÙƒØ¯ Ù…Ù† Ø­Ø°Ù ${ids.length} Ù…Ù† Ø§Ù„Ø¹Ù†Ø§ØµØ± Ø§Ù„Ù…Ø­Ø¯Ø¯Ø©ØŸ`,
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
      title: t("monthlyRevenue") || "Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø¥ÙŠØ±Ø§Ø¯Ø§Øª",
      value: `$${stats?.monthlyRevenue?.toLocaleString() || "0"}`,
      trend: t("optimal"),
      isPositive: true,
      icon: <TrendingUp size={20} />,
    },
    {
      title: t("activeUsersToday") || "Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…ÙŠÙ† Ø§Ù„ÙŠÙˆÙ…",
      value: stats?.activeUsersToday?.toLocaleString() || "0",
      trend: t("optimal"),
      isPositive: true,
      icon: <Users size={20} />,
    },
    {
      title: t("aiGenerations") || "Ø¹Ù…Ù„ÙŠØ§Øª Ø§Ù„ØªÙˆÙ„ÙŠØ¯",
      value: stats?.aiGenerations?.toLocaleString() || "0",
      trend: t("optimal"),
      isPositive: true,
      icon: <Zap size={20} />,
    },
    {
      title: t("systemHealth") || "ØµØ­Ø© Ø§Ù„Ù†Ø¸Ø§Ù…",
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
              {language === 'ar' ? 'Ø§Ø®ØªØµØ§Ø±Ø§Øª Ø§Ù„Ø£Ù‚Ø³Ø§Ù… ÙˆØ§Ù„Ø¹Ù…Ù„ÙŠØ§Øª Ø§Ù„Ø³Ø±ÙŠØ¹Ø©' : 'Command Operations & Quick Launchpad'}
            </h2>
          </div>
          <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">
            {language === 'ar' ? 'ÙˆØµÙˆÙ„ ÙÙˆØ±ÙŠ' : 'Direct Access'}
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
              {language === 'ar' ? 'Ù…Ø±ÙƒØ² Ø§Ù„Ø³ÙŠÙˆ' : 'SEO Audit'}
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
              {language === 'ar' ? 'Ø§Ù„Ù…ÙˆØ¬Ù‘Ù‡ Ø§Ù„Ø°ÙƒÙŠ' : 'Orchestrator'}
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
              {language === 'ar' ? 'Ù‚ÙˆØ§Ø¹Ø¯ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª' : 'Databases'}
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
              {language === 'ar' ? 'Ù…ÙØ§ØªÙŠØ­ API' : 'API Keys'}
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
              {language === 'ar' ? 'Ø±Ø§Ø¯Ø§Ø± Ø§Ù„Ø£Ù…Ø§Ù†' : 'Security'}
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
              {language === 'ar' ? 'Ø§Ù„Ù…Ø§Ù„ÙŠØ© ÙˆØ§Ù„Ø¯ÙØªØ±' : 'Finance'}
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
              {language === 'ar' ? 'Ø§Ù„Ø§Ø´ØªØ±Ø§ÙƒØ§Øª' : 'Plans'}
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
              {language === 'ar' ? 'Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…ÙŠÙ†' : 'Users'}
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
              {language === "ar" ? "Ù…Ø±Ø§Ù‚Ø¨ Ø§ØªØµØ§Ù„ Ù‚ÙˆØ§Ø¹Ø¯ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ù†Ø´Ø·Ø©" : "Database Pool Connectivity Monitor"}
            </h2>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-black text-accent/50 uppercase tracking-widest">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
            </span>
            {language === "ar" ? "Ø§Ù„ØªØ­Ù‚Ù‚ Ø§Ù„Ù…Ø¨Ø§Ø´Ø± Ù…Ù† Ø§Ù„Ø¨Ø« Ø§Ù„Ù…Ø¨Ø§Ø´Ø±" : "Active Pool Polling"}
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
                      {dbId === 'core' && (language === "ar" ? "Ù‚Ø§Ø¹Ø¯Ø© Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø£Ø³Ø§Ø³ÙŠØ©" : "Core DB")}
                      {dbId === 'ledger' && (language === "ar" ? "Ø¯ÙØªØ± Ø§Ù„Ø£Ø±Ø¨Ø§Ø­ Ø§Ù„Ù…Ø§Ù„ÙŠ" : "Ledger DB")}
                      {dbId === 'external' && (language === "ar" ? "Ù‚Ø§Ø¹Ø¯Ø© Ø§Ù„Ù…Ø¬ØªÙ…Ø¹ ÙˆØ§Ù„Ù…Ø¯ÙˆÙ†Ø©" : "External DB")}
                      {dbId === 'security' && (language === "ar" ? "Ù‚Ø§Ø¹Ø¯Ø© Ø§Ù„Ø£Ù…Ø§Ù† ÙˆØ§Ù„Ø­Ù…Ø§ÙŠØ©" : "Security DB")}
                    </span>
                  </div>
                  <span className={`text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${isConnected ? 'bg-accent/10 text-accent' : isLoading ? 'bg-gray-500/10 text-gray-500' : 'bg-red-500/10 text-red-500'}`}>
                    {isLoading ? (language === "ar" ? "Ø¬Ø§Ø±ÙŠ Ø§Ù„Ø§Ø³ØªØ¹Ù„Ø§Ù…" : "Loading") : isConnected ? (language === "ar" ? "Ù…ØªØµÙ„" : "Connected") : (language === "ar" ? "ØºÙŠØ± Ù…ØªØµÙ„" : "Offline")}
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
                            âš ï¸ {language === 'ar' ? 'Ø®Ø·Ø± ØªØ³Ø±ÙŠØ¨ Ø§Ù„Ø§ØªØµØ§Ù„!' : 'Connection Leak Risk!'}
                          </span>
                          <button
                            disabled={reconnectingPool !== null}
                            onClick={() => handleForceReconnect(dbId)}
                            className="w-full py-1 rounded-[var(--radius)] text-[9px] font-black border border-amber-500/30 text-amber-500 hover:bg-amber-500/20 active:scale-[0.98] transition-all uppercase tracking-wider flex items-center justify-center gap-1"
                          >
                            {reconnectingPool === dbId ? (
                              <span className="animate-spin h-3 w-3 border-2 border-amber-500 border-t-transparent rounded-full" />
                            ) : (
                              language === 'ar' ? 'Ø¥Ø¹Ø§Ø¯Ø© Ø§ØªØµØ§Ù„ Ø¥Ø¬Ø¨Ø§Ø±ÙŠ' : 'Force Reconnect'
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
                      {language === "ar" ? "ØªØ­Ø¯ÙŠØ¯ Ø§Ù„ÙƒÙ„" : (t("selectAll") || "Select All")}
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
                    {t("deleteSelected") || (language === "ar" ? "Ø­Ø°Ù Ø§Ù„Ù…Ø­Ø¯Ø¯" : "Delete Selected")} ({selectedActivityIds.length})
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Audit Log Filters Row */}
          {(() => {
            const statusOptions = [
              { id: 'all', labelEn: 'All Status / Category', labelAr: 'Ø¬Ù…ÙŠØ¹ Ø§Ù„Ø­Ø§Ù„Ø§Øª ÙˆØ§Ù„ØªØµÙ†ÙŠÙØ§Øª' },
              { id: 'success', labelEn: 'Success / Completed', labelAr: 'Ø§Ù„Ø¹Ù…Ù„ÙŠØ§Øª Ø§Ù„Ù†Ø§Ø¬Ø­Ø© ÙˆØ§Ù„Ù…ÙƒØªÙ…Ù„Ø©' },
              { id: 'failed', labelEn: 'Failed / Error', labelAr: 'Ø§Ù„Ø¹Ù…Ù„ÙŠØ§Øª Ø§Ù„ÙØ§Ø´Ù„Ø© ÙˆØ§Ù„Ø£Ø®Ø·Ø§Ø¡' },
              { id: 'system', labelEn: 'System Events', labelAr: 'Ø£Ø­Ø¯Ø§Ø« Ø§Ù„Ù†Ø¸Ø§Ù…' },
              { id: 'finance', labelEn: 'Financial Operations', labelAr: 'Ø§Ù„Ø¹Ù…Ù„ÙŠØ§Øª Ø§Ù„Ù…Ø§Ù„ÙŠØ©' },
              { id: 'communication', labelEn: 'Communications / Emails', labelAr: 'Ø§Ù„Ø§ØªØµØ§Ù„Ø§Øª ÙˆØ§Ù„Ø±Ø³Ø§Ø¦Ù„ Ø§Ù„Ø¨Ø±ÙŠØ¯ÙŠØ©' },
              { id: 'ai_generation', labelEn: 'AI Generation / Tools', labelAr: 'ØªÙˆÙ„ÙŠØ¯ Ø§Ù„Ø°ÙƒØ§Ø¡ Ø§Ù„Ø§ØµØ·Ù†Ø§Ø¹ÙŠ Ø§Ù„Ø£ÙƒØ§Ø¯ÙŠÙ…ÙŠ' }
            ];

            const standardTools = [
              { id: 'chat', labelEn: 'General Chat', labelAr: 'Ø§Ù„Ù…Ø­Ø§Ø¯Ø«Ø© Ø§Ù„Ø¹Ø§Ù…Ø©' },
              { id: 'chat_fast', labelEn: 'Fast Chat', labelAr: 'Ø§Ù„Ù…Ø­Ø§Ø¯Ø«Ø© Ø§Ù„Ø³Ø±ÙŠØ¹Ø©' },
              { id: 'chat_pro', labelEn: 'Pro Chat', labelAr: 'Ø§Ù„Ù…Ø­Ø§Ø¯Ø«Ø© Ø§Ù„Ù…ØªÙ‚Ø¯Ù…Ø©' },
              { id: 'chat_reasoning', labelEn: 'Reasoning Mode', labelAr: 'Ù†Ù…Ø· Ø§Ù„ØªÙÙƒÙŠØ± Ø§Ù„Ø¹Ù…ÙŠÙ‚' },
              { id: 'perplexta_analysis', labelEn: 'Perplexta Analysis', labelAr: 'ØªØ­Ù„ÙŠÙ„ Ø¨ÙŠØ±Ø¨Ù„ÙŠÙƒØ³ØªØ§' },
              { id: 'x402_api', labelEn: 'x402 Agent API', labelAr: 'Ø¨ÙˆØ§Ø¨Ø© Ø¹Ù…Ù„Ø§Ø¡ x402' },
              { id: 'image', labelEn: 'Image Generation', labelAr: 'ØªÙˆÙ„ÙŠØ¯ Ø§Ù„ØµÙˆØ±' },
              { id: 'code', labelEn: 'Code Analysis', labelAr: 'ØªØ­Ù„ÙŠÙ„ Ø§Ù„ÙƒÙˆØ¯' },
              { id: 'legal_analysis', labelEn: 'Legal Analysis', labelAr: 'Ø§Ù„ØªØ­Ù„ÙŠÙ„ Ø§Ù„Ù‚Ø§Ù†ÙˆÙ†ÙŠ' }
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
                      {language === "ar" ? "ØªØµÙÙŠØ© Ø­Ø³Ø¨ Ø§Ù„Ø­Ø§Ù„Ø©" : "Filter by Status"}
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
                      {language === "ar" ? "ØªØµÙÙŠØ© Ø­Ø³Ø¨ Ø§Ù„Ø£Ø¯Ø§Ø©" : "Filter by Tool"}
                    </label>
                    <div className="relative">
                      <select
                        value={logToolFilter}
                        onChange={(e) => setLogToolFilter(e.target.value)}
                        className={`w-full ${dir === "rtl" ? "pr-3 pl-10" : "pl-3 pr-10"} py-2 rounded-md border appearance-none focus:outline-none focus:ring-1 focus:ring-accent-500/30 text-xs font-bold ${theme === "dark" ? "bg-[#0f0f11] border-[var(--border-main)] text-gray-300 pointer-events-auto" : "bg-white border-[var(--border-main)] shadow-sm text-gray-700 pointer-events-auto"}`}
                      >
                        <option value="all">
                          {dir === "rtl" ? "Ø¬Ù…ÙŠØ¹ Ø§Ù„Ø£Ø¯ÙˆØ§Øª ÙˆØ§Ù„Ø®Ø¯Ù…Ø§Øª" : "All Tools & Services"}
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
                      {language === "ar" ? "ØªØ§Ø±ÙŠØ® Ø§Ù„Ø¨Ø¯Ø¡" : "Start Date"}
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
                      {language === "ar" ? "ØªØ§Ø±ÙŠØ® Ø§Ù„Ø§Ù†ØªÙ‡Ø§Ø¡" : "End Date"}
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
              placeholder={t("searchActivityPlaceholder") || (language === "ar" ? "Ø¨Ø­Ø« ÙÙŠ Ø§Ù„Ø³Ø¬Ù„Ø§Øª..." : "Search activity logs...")}
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
                      {language === "ar" ? "Ù„Ù… ÙŠØªÙ… Ø§Ù„Ø¹Ø«ÙˆØ± Ø¹Ù„Ù‰ Ø³Ø¬Ù„Ø§Øª" : "No Records Found"}
                    </h3>
                    <p className="text-xs text-[var(--text-muted)] max-w-xs leading-relaxed">
                      {language === "ar" 
                        ? "Ø¬Ø±Ø¨ ØªØ¹Ø¯ÙŠÙ„ Ø§Ù„Ù…Ø¹Ø§ÙŠÙŠØ± Ø§Ù„Ù…Ø­Ø¯Ø¯Ø© Ø£Ùˆ ØªØµÙÙŠØ± ÙƒÙ„Ù…Ø§Øª Ø§Ù„Ø¨Ø­Ø« Ù„Ù„Ø­ØµÙˆÙ„ Ø¹Ù„Ù‰ Ù†ØªØ§Ø¦Ø¬ Ù…ØºØ§ÙŠØ±Ø©." 
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
                        {language === "ar" ? "Ø¥Ø¹Ø§Ø¯Ø© ØªØ¹ÙŠÙŠÙ† Ø§Ù„ÙÙ„Ø§ØªØ±" : "Reset Filters"}
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
                              <span className="text-accent font-bold">{log.points} {language === "ar" ? "Ù†Ù‚Ø·Ø©" : "pts"}</span>
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
                    {t("selectAll") || "Ø§Ù„ÙƒÙ„"}
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
                  title: { ar: "ØªØ·Ù‡ÙŠØ± Ø§Ù„Ø°Ø§ÙƒØ±Ø© Ø§Ù„Ø³Ø­Ø§Ø¨ÙŠØ©ØŸ", en: "Purge All Chats?" },
                  description: {
                    ar: t("clearAllChatsConfirm") || "ØªØ­Ø°ÙŠØ±: Ù‡Ø°Ø§ Ø³ÙŠØ¤Ø¯ÙŠ Ø¥Ù„Ù‰ Ø­Ø°Ù ÙƒØ§ÙØ© Ø§Ù„Ù…Ø­Ø§Ø¯Ø«Ø§Øª ÙˆØ§Ù„Ø±Ø³Ø§Ø¦Ù„ Ù…Ù† Ù‚Ø§Ø¹Ø¯Ø© Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª. Ù‡Ù„ Ø£Ù†Øª Ù…ØªØ£ÙƒØ¯ØŸ",
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
                  title: { ar: "ØªØ·Ù‡ÙŠØ± Ø§Ù„Ø³Ø¬Ù„Ø§Øª Ø§Ù„Ù…Ø¹Ù„Ù‚Ø©ØŸ", en: "Prune Orphaned Records?" },
                  description: {
                    ar: "Ù‡Ù„ Ø£Ù†Øª Ù…ØªØ£ÙƒØ¯ Ù…Ù† ÙØ­Øµ ÙˆØªØ·Ù‡ÙŠØ± Ø§Ù„Ø³Ø¬Ù„Ø§Øª Ø§Ù„Ù…Ø¹Ù„Ù‚Ø© ÙˆØªÙˆØ±ÙŠØ¯Ø§Øª Ø§Ù„Ù…Ù„ÙØ§Øª Ø§Ù„ØªØ§Ù„ÙØ©ØŸ",
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
                          ? `ØªÙ… Ø§Ù„ØªØ·Ù‡ÙŠØ± Ø¨Ù†Ø¬Ø§Ø­!\nØ§Ù„Ù…Ù„ÙØ§Øª Ø§Ù„Ù…Ø­Ø¯ÙˆÙØ©: ${cleanRes.summary.userFiles.prunedCount}\nØ§Ù„Ø·Ù„Ø¨Ø§Øª Ø§Ù„Ù…Ø­Ø°ÙˆÙØ©: ${cleanRes.summary.depositRequests.prunedCount}`
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
                {language === "ar" ? "ØªØ·Ù‡ÙŠØ± Ø§Ù„Ø³Ø¬Ù„Ø§Øª Ø§Ù„Ù…Ø¹Ù„Ù‚Ø©" : "Prune Orphaned Records"}
              </span>
            </button>

            <button
              onClick={() => {
                setConfirmModal({
                  isOpen: true,
                  title: { ar: "Ù…Ø³Ø­ Ø§Ù„Ø¥Ø´Ø¹Ø§Ø±Ø§Øª Ø§Ù„Ù‚Ø¯ÙŠÙ…Ø©ØŸ", en: "Prune Old Notifications?" },
                  description: {
                    ar: "Ù‡Ù„ Ø£Ù†Øª Ù…ØªØ£ÙƒØ¯ Ù…Ù† ØªØ·Ù‡ÙŠØ± Ø§Ù„Ø¥Ø´Ø¹Ø§Ø±Ø§Øª Ø§Ù„Ù‚Ø¯ÙŠÙ…Ø©ØŸ",
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
                            ? `ØªÙ… ØªØ·Ù‡ÙŠØ± ${data.count} Ø¥Ø´Ø¹Ø§Ø± Ø¨Ù†Ø¬Ø§Ø­.`
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
                  title: { ar: "Ù…Ø³Ø­ ÙƒØ§ÙØ© Ø§Ù„Ø¥Ø´Ø¹Ø§Ø±Ø§ØªØŸ", en: "Clear All Notifications?" },
                  description: {
                    ar: t("clearNotifsConfirm") || "Ù‡Ù„ Ø£Ù†Øª Ù…ØªØ£ÙƒØ¯ Ù…Ù† Ø­Ø°Ù ÙƒØ§ÙØ© Ø¥Ø´Ø¹Ø§Ø±Ø§Øª Ø§Ù„Ù†Ø¸Ø§Ù… Ù„Ø¬Ù…ÙŠØ¹ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…ÙŠÙ† Ø¨Ø´ÙƒÙ„ Ù†Ù‡Ø§Ø¦ÙŠØŸ",
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
                      return `${title} (${matches[0]} Ø¹Ù…Ù„ÙŠØ©)`;
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
                      {getTimeAgo(alert.created_at)} â€¢{" "}
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
      showToast(language === 'ar' ? "ØºÙŠØ± Ù…ØµØ±Ø­ Ù„Ùƒ Ø¨Ø§Ù„Ù‚ÙŠØ§Ù… Ø¨Ù‡Ø°Ø§ Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡" : "Unauthorized action", "error");
      return false;
    }

    if (
      !key &&
      !urlKey &&
      providers.find((p) => p.id === id)?.status !== "active"
    ) {
      showToast(
        language === "ar"
          ? "ÙŠØ±Ø¬Ù‰ Ø¥Ø¯Ø®Ø§Ù„ Ù…ÙØªØ§Ø­ Ù„Ù„Ù…Ù„Ø­Ù‚ Ø£ÙˆÙ„Ø§Ù‹"
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
            ? "ØªÙ… Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† Ø§Ù„Ø§ØªØµØ§Ù„ Ø¨Ù†Ø¬Ø§Ø­!"
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
              ? "Ø§Ù„Ù…ÙØªØ§Ø­ ØºÙŠØ± ØµØ§Ù„Ø­ Ø£Ùˆ Ø§Ù†ØªÙ‡Øª ØµÙ„Ø§Ø­ÙŠØªÙ‡."
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
            ? "ÙØ´Ù„ Ø§Ù„Ø§ØªØµØ§Ù„ Ø¨Ø§Ù„Ù…Ø²ÙˆØ¯."
            : "Connection to provider failed.",
      });
      return false;
    }
  };

  const handleSaveKey = async (id: string, key: string, urlKey?: string) => {
    if (user?.role !== 'admin') {
      showToast(language === 'ar' ? "ØºÙŠØ± Ù…ØµØ±Ø­ Ù„Ùƒ Ø¨Ø§Ù„Ù‚ÙŠØ§Ù… Ø¨Ù‡Ø°Ø§ Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡" : "Unauthorized action", "error");
      return;
    }
    if (!key && !urlKey) return;

    // First, force a test. We MUST verify before saving as per Perplexta mandate.
    const isVerified = await handleTestKeyConnection(id, key, urlKey);
    if (!isVerified) {
      showToast(
        language === "ar"
          ? "ÙŠØ¬Ø¨ ÙØ­Øµ Ø§Ù„Ù…ÙØªØ§Ø­ Ø¨Ù†Ø¬Ø§Ø­ Ù‚Ø¨Ù„ Ø§Ù„ØªØ®Ø²ÙŠÙ†"
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
      showToast("ÙØ´Ù„ ÙÙŠ Ø­ÙØ¸ Ø§Ù„Ù…ÙØªØ§Ø­.", "error");
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
        language === "ar" ? "Ø®Ø·Ø£ ÙÙŠ Ø§Ù„Ø§ØªØµØ§Ù„" : "Connection Error",
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
          message: data.error || "Ø­Ø¯Ø« Ø®Ø·Ø£ ØºÙŠØ± Ù…Ø¹Ø±ÙˆÙ.",
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
        message: "ÙØ´Ù„ Ø§Ù„Ø§ØªØµØ§Ù„ Ø¨Ø§Ù„Ø®Ø§Ø¯Ù….",
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
          message: data.error || "Ø­Ø¯Ø« Ø®Ø·Ø£ ØºÙŠØ± Ù…Ø¹Ø±ÙˆÙ.",
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
        message: "ÙØ´Ù„ Ø§Ù„Ø§ØªØµØ§Ù„ Ø¨Ø§Ù„Ø®Ø§Ø¯Ù….",
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
      showToast("Ø®Ø·Ø£ ÙÙŠ Ø§Ù„Ø§ØªØµØ§Ù„", "error");
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
                        ? (language === "ar" ? "ÙØ­Øµ Ø§Ù„Ù…ÙØªØ§Ø­" : "Key Scan")
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
                          ? (language === "ar" ? "Ø§Ù„Ù…ÙØªØ§Ø­ ØµØ§Ù„Ø­ ÙˆØ§Ù„Ø§ØªØµØ§Ù„ Ø³Ù„ÙŠÙ…!" : "The key is valid and the connection is healthy!")
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
                          ? "Ø­Ø¯Ø« Ø®Ø·Ø£ ØºÙŠØ± Ù…Ø¹Ø±ÙˆÙ Ø£Ø«Ù†Ø§Ø¡ Ø§Ù„Ø§ØªØµØ§Ù„ Ø¨Ø§Ù„Ù…Ø²ÙˆØ¯."
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
                  {language === "ar" ? "ØªØ£ÙƒÙŠØ¯ Ø§Ù„Ø­Ø°Ù" : "Confirm Deletion"}
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
                    {language === "ar" ? "Ù†Ø¹Ù…ØŒ Ø§Ø­Ø°Ù" : "Yes, Delete"}
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
                      className={`text-[9px] font-black uppercase tracking-widest ${provider.status === "active" ? (provider.isActive ? t("statusActive") : language === "ar" ? "ØºÙŠØ± ØµØ§Ù„Ø­" : "Invalid") : t("statusMissing")}`}
                    >
                      {provider.status === "active"
                        ? provider.isActive
                          ? t("statusActive")
                          : language === "ar"
                            ? "ØºÙŠØ± ØµØ§Ù„Ø­"
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
                {language === "ar" ? "Ù…Ø²Ø§Ù…Ù†Ø© Ø§Ù„Ø§Ø³ØªÙ‡Ù„Ø§Ùƒ" : "Sync Usage"}
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
                {language === "ar" ? "Ù…Ø²Ø§Ù…Ù†Ø© Ø§Ù„Ù…ÙˆØ¯ÙŠÙ„Ø§Øª" : "Sync Models"}
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
                      ? "â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢ (Encrypted)"
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
                      : (language === "ar" ? "Ø±Ø§Ø¨Ø· Ù†Ù‚Ø·Ø© Ø§Ù„Ù†Ù‡Ø§ÙŠØ© (Endpoint Base URL)" : "API Endpoint Base URL")}
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
                      : (language === "ar" ? "ØªØ£ÙƒØ¯ Ù…Ù† Ø£Ù† Ø§Ù„Ø±Ø§Ø¨Ø· Ù…ØªÙˆØ§ÙÙ‚ Ù…Ø¹ Ø¨Ù†ÙŠØ© OpenAI ÙˆØªØ¬Ù„Ø¨ Ù…ÙˆØ¯ÙŠÙ„Ø§ØªÙ‡Ø§ ØªÙ„Ù‚Ø§Ø¦ÙŠØ§Ù‹." : "Ensure this endpoint serves standard OpenAI-compatible completions and models.")}
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
                {language === "ar" ? "ÙØ­Øµ Ø³Ø±ÙŠØ¹" : "Quick Scan"}
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
                {language === "ar" ? "Ø¥Ø¶Ø§ÙØ© Ù…Ø²ÙˆØ¯ Ù…Ø®ØµØµ Ù…Ø³ØªÙ‚Ù„" : "Add Custom Independent Provider"}
              </h4>
              <p className="text-xs text-gray-500 mt-1 max-w-[220px] mx-auto">
                {language === "ar" ? "Ø±Ø¨Ø· Ø£ÙŠ ÙˆØ¬Ù‡Ø© API Ù…ØªÙˆØ§ÙÙ‚Ø© Ù…Ø¹ Ø¨Ù†ÙŠØ© OpenAI Ø¨Ø´ÙƒÙ„ Ø¢Ù…Ù† Ù…Ø¹ Ø§Ù„ÙØ­Øµ ÙˆØ§Ù„ØªØ²Ø§Ù…Ù†" : "Securely connect block-independent OpenAI-compatible APIs"}
              </p>
            </div>
          </button>
        ) : (
          <form onSubmit={(e) => e.preventDefault()} className="p-6 rounded-lg border border-accent/20 bg-[var(--bg-secondary)] shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[440px]">
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-[var(--border-main)]/30">
                <span className="text-xs font-black uppercase tracking-widest text-accent flex items-center gap-1.5">
                  <Cpu size={14} />
                  {language === "ar" ? "Ù…Ø²ÙˆØ¯ Ù…Ø®ØµØµ Ø¬Ø¯ÙŠØ¯" : "New Custom Provider"}
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
                  {language === "ar" ? "Ø§Ø³Ù… Ø§Ù„Ù…Ø²ÙˆØ¯ (Ø§Ù„Ø¹Ø±Ø¶ ÙÙŠ Ø§Ù„Ù‚ÙˆØ§Ø¦Ù…)" : "Provider Display Name"}
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
                  <span>{language === "ar" ? "Ù…Ø¹Ø±Ù Ø§Ù„Ù…Ø²ÙˆØ¯ Ø§Ù„Ø¨Ø±Ù…Ø¬ÙŠ (slug)" : "Unique Provider Slug / ID"}</span>
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
                  {language === "ar" ? "Ø±Ø§Ø¨Ø· Ù†Ù‚Ø·Ø© Ø§Ù„Ù†Ù‡Ø§ÙŠØ© (Base URL)" : "API Endpoint Base URL"}
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
                  {language === "ar" ? "Ø§Ù„Ù…ÙØªØ§Ø­ Ø§Ù„Ø³Ø±ÙŠ (API Key) - Ø§Ø®ØªÙŠØ§Ø±ÙŠ" : "Secret API Key (Optional)"}
                </label>
                <input
                  type="password"
                  placeholder="sk-â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                  value={newCustomKey}
                  onChange={(e) => setNewCustomKey(e.target.value)}
                  className="w-full h-10 px-3 text-xs font-mono rounded-sm border focus:outline-none focus:ring-1 focus:ring-accent-500/30 transition-theme bg-[var(--bg-primary)] border-[var(--border-main)] text-[var(--text-primary)]"
                  dir="ltr"
                />
              </div>

              {/* Budget Field */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  {language === "ar" ? "Ù…ÙŠØ²Ø§Ù†ÙŠØ© Ø§Ù„Ø§Ø³ØªÙ‡Ù„Ø§Ùƒ Ø§Ù„ÙŠÙˆÙ…ÙŠ ($)" : "Daily Budget ($ Limits)"}
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
                {language === "ar" ? "Ø¥Ù„ØºØ§Ø¡" : "Cancel"}
              </button>
              <button
                type="button"
                disabled={isCreatingCustom || !newCustomId || !newCustomName || !newCustomUrl}
                onClick={async () => {
                  if (!newCustomId || !newCustomName || !newCustomUrl) return;
                  setIsCreatingCustom(true);

                  showToast(
                    language === "ar" ? "Ø¬Ø§Ø±ÙŠ ÙØ­Øµ Ù†Ù‚Ø·Ø© Ø§Ù„Ø§ØªØµØ§Ù„ ÙˆÙ…Ø²Ø§Ù…Ù†Ø© Ø§Ù„Ù…ÙˆØ¯ÙŠÙ„Ø§Øª..." : "Testing endpoint and syncing models...",
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
                        language === "ar" ? `ØªÙ… Ø±Ø¨Ø· Ø§Ù„Ù…Ø²ÙˆØ¯ Ø¨Ù†Ø¬Ø§Ø­ ÙˆÙ…Ø²Ø§Ù…Ù†Ø© ${saveData.count || 0} Ù…ÙˆØ¯ÙŠÙ„.` : `Successfully connected provider and synced ${saveData.count || 0} models.`,
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
                {language === "ar" ? "ÙØ­Øµ ÙˆØ­ÙØ¸" : "Verify & Save"}
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
          `âš ï¸ Alert: Database ${data.provider} is ${data.status}!`,
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

  const handleSaveConfig = (id: string) => {    const db = databases.find((d) => d.id === id);    if (!db) return;

    const confirmMsg = language === "ar"
      ? "Ù‡Ù„ Ø£Ù†Øª Ù…ØªØ£ÙƒØ¯ Ù…Ù† Ø­ÙØ¸ ÙˆØªØºÙŠÙŠØ± Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª ÙˆØ³Ù„Ø§Ø³Ù„ Ø§Ù„Ø§ØªØµØ§Ù„ Ù„Ù‚Ø§Ø¹Ø¯Ø© Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ù‡Ø°Ù‡ØŸ Ù‚Ø¯ ÙŠØ¤Ø«Ø± Ø§Ø³ØªØ¨Ø¯Ø§Ù„ Ø³Ù„Ø§Ø³Ù„ Ø§Ù„Ø§ØªØµØ§Ù„ Ø§Ù„Ù†Ø´Ø·Ø© Ø¹Ù„Ù‰ Ø§Ù„Ø¹Ù…Ù„ÙŠØ§Øª Ø§Ù„Ø¬Ø§Ø±ÙŠØ©."
      : "Are you sure you want to save and overwrite the active connection strings for this database? Overwriting active configurations can disrupt live operations.";
    
    setConfirmModal({
      isOpen: true,
      title: { ar: "Ø­ÙØ¸ Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Ø§Ù„Ø§ØªØµØ§Ù„ Ù„Ù‚Ø§Ø¹Ø¯Ø© Ø§Ù„Ø¨ÙŠØ§Ù†Ø§ØªØŸ", en: "Save Database Connection Settings?" },
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
        ? `Ù‡Ù„ Ø£Ù†Øª Ù…ØªØ£ÙƒØ¯ Ù…Ù† Ø±ØºØ¨ØªÙƒ ÙÙŠ ØªØµØ¯ÙŠØ± Ù†Ø³Ø®Ø© Ø§Ø­ØªÙŠØ§Ø·ÙŠØ© Ù„Ù‚Ø§Ø¹Ø¯Ø© Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª: "${dbName}" (${targetType})ØŸ\n\nØ§Ø³Ù… Ù…Ù„Ù Ø§Ù„Ù†Ø³Ø®Ø© Ø§Ù„Ø§Ø­ØªÙŠØ§Ø·ÙŠØ© Ø§Ù„Ø°ÙŠ Ø³ÙŠØªÙ… ØªÙˆÙ„ÙŠØ¯Ù‡ ÙˆØ­ÙØ¸Ù‡ Ø³ÙŠÙƒÙˆÙ†:\nğŸ“ "${filename}"\n\nØ§Ø¶ØºØ· Ù…ÙˆØ§ÙÙ‚ Ù„ØªÙˆÙ„ÙŠØ¯ Ø§Ù„Ù†Ø³Ø®Ø© ÙˆØªÙ†Ø²ÙŠÙ„Ù‡Ø§ Ù…Ø¹ ÙƒØ§Ù…Ù„ Ø§Ù„Ø¬Ø¯Ø§ÙˆÙ„ ÙˆØ§Ù„Ø³Ø¬Ù„Ø§Øª.`
        : `Are you sure you want to export a backup for database: "${dbName}" (${targetType})?\n\nBackup filename:\nğŸ“ "${filename}"\n\nClick OK to generate and download the full backup.`;

    setConfirmModal({
      isOpen: true,
      title: { ar: `ØªØµØ¯ÙŠØ± Ù†Ø³Ø®Ø© Ø§Ø­ØªÙŠØ§Ø·ÙŠØ© (${dbName})`, en: `Export Backup (${dbName})` },
      description: confirmMsg,
      variant: "success",
      onConfirm: async () => {
        try {
          showToast(
            dir === "rtl"
              ? `Ø¬Ø§Ø±ÙŠ ØªØµØ¯ÙŠØ± Ù†Ø³Ø®Ø© Ø§Ø­ØªÙŠØ§Ø·ÙŠØ© Ø´Ø§Ù…Ù„Ø© Ù„Ù‚Ø§Ø¹Ø¯Ø© ${dbName}...`
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
              ? `ØªÙ… ØªØµØ¯ÙŠØ± Ø§Ù„Ù†Ø³Ø®Ø© Ø§Ù„Ø§Ø­ØªÙŠØ§Ø·ÙŠØ© Ø¨Ù†Ø¬Ø§Ø­ (${tableCount} Ø¬Ø¯ÙˆÙ„ØŒ ${totalRows} Ø³Ø¬Ù„) Ù„Ù‚Ø§Ø¹Ø¯Ø©: ${actualDbName}`
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
    const targetTypeName = id === "ledger" ? (dir === "rtl" ? "Ø§Ù„Ù…Ø­ÙØ¸Ø© ÙˆØ§Ù„Ù…Ø¹Ø§Ù…Ù„Ø§Øª Ø§Ù„Ù…Ø§Ù„ÙŠØ©" : "Finance & Ledger") :
      id === "external" ? (dir === "rtl" ? "Ø§Ù„Ù…Ø¯ÙˆÙ†Ø© ÙˆØ§Ù„Ù…Ù‚Ø§Ù„Ø§Øª" : "Blog & External") :
      id === "security" ? (dir === "rtl" ? "Ø§Ù„Ø­Ù…Ø§ÙŠØ© ÙˆØ§Ù„Ø£Ù…Ø§Ù†" : "Security & Logs") :
      (dir === "rtl" ? "Ø§Ù„Ø¹Ù…Ù„ÙŠØ§Øª Ø§Ù„Ø£Ø³Ø§Ø³ÙŠØ© ÙˆØ§Ù„Ù…Ø³ØªØ®Ø¯Ù…ÙŠÙ†" : "Core Operations & Users");

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
                  ? `ØªÙ…Øª Ø¥Ø¹Ø§Ø¯Ø© ØªÙ‡ÙŠØ¦Ø© Ø¬Ø¯Ø§ÙˆÙ„ (${targetTypeName}) Ù…Ù† Ø§Ù„ØµÙØ± Ø¨Ù†Ø¬Ø§Ø­ ØªØ§Ù… ÙˆØ¨Ù†Ø§Ø¡ Ø§Ù„ÙÙ‡Ø§Ø±Ø³ Ø§Ù„Ø¥Ù„Ø²Ø§Ù…ÙŠØ©.`
                  : `Tables for (${targetTypeName}) successfully re-initialized from scratch with indexes.`)
              : (dir === "rtl"
                  ? `ØªÙ…Øª Ù…Ø²Ø§Ù…Ù†Ø© ÙˆØªØ­Ø¯ÙŠØ« Ù‡ÙŠÙƒÙ„ Ø¬Ø¯Ø§ÙˆÙ„ (${targetTypeName}) Ø¨Ù†Ø¬Ø§Ø­.`
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
          ar: `Ø¥Ø¹Ø§Ø¯Ø© ØªÙ‡ÙŠØ¦Ø© Ø¬Ø¯Ø§ÙˆÙ„ (${targetTypeName}) Ù…Ù† Ø§Ù„ØµÙØ±ØŸ`, 
          en: `Re-initialize (${targetTypeName}) from scratch?` 
        },
        description: dir === "rtl"
          ? `âš ï¸ ØªØ­Ø°ÙŠØ± Ø§Ø­ØªØ±Ø§ÙÙŠ ÙˆÙ…Ø­Ù…ÙŠ:\nØ³ÙŠØªÙ… Ù…Ø³Ø­ ÙˆØ¥Ø¹Ø§Ø¯Ø© Ø¨Ù†Ø§Ø¡ Ø§Ù„Ø¬Ø¯Ø§ÙˆÙ„ ÙˆØ§Ù„ÙÙ‡Ø§Ø±Ø³ Ø§Ù„ØªØ§Ø¨Ø¹Ø© Ù„Ù‚Ø§Ø¹Ø¯Ø© (${targetTypeName} - ${targetLabel}) ÙÙ‚Ø· Ù…Ù† Ø§Ù„ØµÙØ±ØŒ Ù…Ø¹ ØªÙ‡ÙŠØ¦Ø© Ø§Ù„Ø­Ø³Ø§Ø¨Ø§Øª Ø§Ù„Ø¥Ù„Ø²Ø§Ù…ÙŠØ©.\n\nÙ„Ù† ØªØªØ£Ø«Ø± Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Ø§Ù„Ø§ØªØµØ§Ù„ Ø§Ù„Ù…Ø®Ø²Ù†Ø© ÙÙŠ Ø§Ù„Ù†Ø¸Ø§Ù… Ø£Ùˆ Ù‚ÙˆØ§Ø¹Ø¯ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø£Ø®Ø±Ù‰. Ù‡Ù„ ØªØ±ÙŠØ¯ Ø§Ù„Ø§Ø³ØªÙ…Ø±Ø§Ø±ØŸ`
          : `âš ï¸ Professional Safety Warning:\nThis will wipe and rebuild only the tables and indexes belonging to (${targetTypeName} - ${targetLabel}) from scratch, then re-seed mandatory default configurations.\n\nYour saved database connection configurations and other databases will NOT be affected. Do you want to proceed?`,
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
          throw new Error(dir === "rtl" ? "Ù‡ÙŠÙƒÙ„ Ù…Ù„Ù Ø§Ù„Ù†Ø³Ø®Ø© Ø§Ù„Ø§Ø­ØªÙŠØ§Ø·ÙŠØ© ØºÙŠØ± ØµØ§Ù„Ø­" : "Invalid backup file structure");
        }

        const backupData = backup.data || backup;
        const backupType = backup.type || targetType;

        if (backup.type && backup.type !== targetType) {
          showToast(
            dir === "rtl"
              ? `Ø®Ø·Ø£: Ù†ÙˆØ¹ Ø§Ù„Ù†Ø³Ø®Ø© Ø§Ù„Ø§Ø­ØªÙŠØ§Ø·ÙŠØ© (${backup.type}) Ù„Ø§ ÙŠØªØ·Ø§Ø¨Ù‚ Ù…Ø¹ Ù‚Ø§Ø¹Ø¯Ø© Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ù…Ø­Ø¯Ø¯Ø© (${targetType})`
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
            ? `ğŸ“„ ØªÙ… ÙØ­Øµ Ù…Ù„Ù Ø§Ù„Ù†Ø³Ø®Ø© Ø§Ù„Ø§Ø­ØªÙŠØ§Ø·ÙŠØ© Ø¨Ù†Ø¬Ø§Ø­:\nâ€¢ Ù‚Ø§Ø¹Ø¯Ø© Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ù‡Ø¯Ù: ${dbName} (${targetType})\nâ€¢ Ø¹Ø¯Ø¯ Ø§Ù„Ø¬Ø¯Ø§ÙˆÙ„ Ø§Ù„Ù…ÙƒØªØ´ÙØ©: ${tableCount}\nâ€¢ Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø³Ø¬Ù„Ø§Øª: ${totalRecords}\nâ€¢ ØªØ§Ø±ÙŠØ® Ø§Ù„Ù†Ø³Ø®Ø©: ${backup.timestamp || "ØºÙŠØ± Ù…Ø­Ø¯Ø¯"}\n\nâš ï¸ ØªØ­Ø°ÙŠØ±: Ø§Ø³ØªØ¹Ø§Ø¯Ø© Ø§Ù„Ù†Ø³Ø®Ø© Ø³ÙŠÙ‚ÙˆÙ… Ø¨Ø¥Ø¹Ø§Ø¯Ø© ÙƒØªØ§Ø¨Ø© Ø¨ÙŠØ§Ù†Ø§Øª Ø¬Ø¯Ø§ÙˆÙ„ (${targetType}) Ø¨Ø¯Ù‚Ø© ÙˆÙ…Ø²Ø§Ù…Ù†Ø© Ø§Ù„Ø³Ù„Ø§Ø³Ù„ Ø§Ù„Ø±Ù‚Ù…ÙŠØ© (ID Sequences). Ù‡Ù„ Ø£Ù†Øª Ù…ØªØ£ÙƒØ¯ Ù…Ù† Ø±ØºØ¨ØªÙƒ ÙÙŠ Ø§Ù„Ø¨Ø¯Ø¡ØŸ`
            : `ğŸ“„ Backup file inspected successfully:\nâ€¢ Target Database: ${dbName} (${targetType})\nâ€¢ Detected Tables: ${tableCount}\nâ€¢ Total Records: ${totalRecords}\nâ€¢ Timestamp: ${backup.timestamp || "N/A"}\n\nâš ï¸ Warning: Restoring will overwrite (${targetType}) tables and synchronize ID sequences. Are you sure you want to proceed?`;

        setConfirmModal({
          isOpen: true,
          title: { ar: `Ø§Ø³ØªØ¹Ø§Ø¯Ø© Ø¯Ù‚ÙŠÙ‚Ø© Ù„Ù‚Ø§Ø¹Ø¯Ø© (${dbName})ØŸ`, en: `Precision restore for (${dbName})?` },
          description: confirmMsg,
          variant: "danger",
          onConfirm: async () => {
            try {
              showToast(
                dir === "rtl"
                  ? "Ø¬Ø§Ø±ÙŠ Ø§Ø³ØªØ¹Ø§Ø¯Ø© Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª ÙˆÙÙ‡Ø±Ø³Ø© Ø§Ù„Ø³Ù„Ø§Ø³Ù„ Ø¨Ø¯Ù‚Ø© Ù…ØªÙ†Ø§Ù‡ÙŠØ©... ÙŠØ±Ø¬Ù‰ Ø¹Ø¯Ù… Ø¥ØºÙ„Ø§Ù‚ Ø§Ù„ØµÙØ­Ø©"
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
                    ? `ØªÙ…Øª Ø§Ø³ØªØ¹Ø§Ø¯Ø© Ù‚Ø§Ø¹Ø¯Ø© Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø¨Ù†Ø¬Ø§Ø­ ØªØ§Ù… (${resultData.restored_tables || tableCount} Ø¬Ø¯ÙˆÙ„ØŒ ${resultData.total_rows_imported || totalRecords} Ø³Ø¬Ù„)`
                    : `Database restored successfully (${resultData.restored_tables || tableCount} tables, ${resultData.total_rows_imported || totalRecords} records)!`,
                  "success",
                );
                fetchDatabases();
              } else {
                showToast(resultData.error || "Import failed", "error");
              }
            } catch (err: any) {
              showToast(err.message || (dir === "rtl" ? "Ø­Ø¯Ø« Ø®Ø·Ø£ Ø£Ø«Ù†Ø§Ø¡ Ø§Ù„Ø§Ø³ØªÙŠØ±Ø§Ø¯" : "Error during import"), "error");
            } finally {
              if (target) target.value = "";
            }
          }
        });
      } catch (parseErr: any) {
        showToast(
          dir === "rtl"
            ? `Ù…Ù„Ù ØºÙŠØ± ØµØ§Ù„Ø­ Ø£Ùˆ ØªØ§Ù„Ù: ${parseErr.message}`
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
          let updated = {
            ...db,
            [field]: value,
            connectionTested: isConnectionField ? false : db.connectionTested,
          };

          if (field === "type") {
            if (value === "cloud") {
              if ((!db.connection_string || db.connection_string.trim() === "") && db.local_connection_string) {
                updated.connection_string = db.local_connection_string;
              }
            } else if (value === "local") {
              if ((!db.host || db.host.trim() === "") && db.local_connection_string) {
                try {
                  const u = new URL(db.local_connection_string);
                  updated.host = u.hostname;
                  updated.port = u.port || "5432";
                  updated.db_name = u.pathname.startsWith('/') ? u.pathname.substring(1) : u.pathname;
                  updated.username = u.username;
                  updated.password = u.password;
                } catch {
                  updated.connection_string = db.local_connection_string;
                }
              }
            }
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
                        {db.id === 'ledger' ? (language === 'ar' ? 'Ø§Ù„Ø®Ø²ÙŠÙ†Ø© (Ø§Ù„Ù…Ø§Ù„ÙŠØ©)' : 'Ledger (Financial)') :
                         db.id === 'external' ? (language === 'ar' ? 'Ù„ÙˆØ­Ø© ØªØ­ÙƒÙ… Ø§Ù„Ø£Ù‚Ø³Ø§Ù…' : 'Sections Dashboard') :
                         db.id === 'security' ? (language === 'ar' ? 'Ø§Ù„Ø­Ù…Ø§ÙŠØ© (Ø§Ù„Ø£Ù…Ù†ÙŠØ©)' : 'Security (Defense)') :
                         (language === 'ar' ? 'Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠØ© (Ø§Ù„ØªØ´ØºÙŠÙ„ÙŠØ©)' : 'Core (Operational)')}
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

              {/* Detected Startup Default URL Field */}
              {db.local_connection_string && (
                <div className="mb-6 p-3 bg-blue-500/[0.02] border border-blue-500/10 rounded-sm flex flex-col gap-2 text-right">
                  <div className="flex items-center justify-between text-[10px]">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(db.local_connection_string);
                          showToast(
                            language === "ar" ? "ØªÙ… Ù†Ø³Ø® Ø§Ù„Ø±Ø§Ø¨Ø· Ø§Ù„Ø§ÙØªØ±Ø§Ø¶ÙŠ" : "Default connection URL copied",
                            "success"
                          );
                        }}
                        className="text-blue-500 hover:text-blue-600 font-bold transition-theme"
                      >
                        {language === "ar" ? "Ù†Ø³Ø® Ø§Ù„Ø±Ø§Ø¨Ø·" : "Copy URL"}
                      </button>
                      <span className="text-gray-300 dark:text-gray-800 font-bold">|</span>
                      <button
                        type="button"
                        onClick={() => {
                          if (db.type === 'cloud') {
                            handleChange(db.id, "connection_string", db.local_connection_string);
                          } else {
                            try {
                              const u = new URL(db.local_connection_string);
                              handleChange(db.id, "host", u.hostname);
                              handleChange(db.id, "port", u.port || "5432");
                              handleChange(db.id, "db_name", (u.pathname.startsWith('/') ? u.pathname.substring(1) : u.pathname));
                              handleChange(db.id, "username", u.username);
                              handleChange(db.id, "password", u.password);
                            } catch {
                              handleChange(db.id, "connection_string", db.local_connection_string);
                            }
                          }
                          showToast(
                            language === "ar" ? "ØªÙ… ØªØ¹Ø¨Ø¦Ø© Ø­Ù‚ÙˆÙ„ Ø§Ù„Ø¨Ø·Ø§Ù‚Ø© Ø¨Ø§Ù„Ù‚ÙŠÙ… Ø§Ù„Ø§ÙØªØ±Ø§Ø¶ÙŠØ©" : "Fields populated with default values",
                            "success"
                          );
                        }}
                        className="text-accent hover:text-accent/80 font-bold transition-theme"
                      >
                        {language === "ar" ? "Ø§Ø³ØªÙŠØ±Ø§Ø¯ Ø§Ù„Ø±Ø§Ø¨Ø· ÙˆØªØ¹Ø¨Ø¦Ø© Ø§Ù„Ø¨Ø·Ø§Ù‚Ø©" : "Import and Populate Card"}
                      </button>
                    </div>
                    <span className="font-black text-blue-500/80 text-[9px] uppercase tracking-wider">
                      {language === "ar" ? "Ø§Ù„Ø±Ø§Ø¨Ø· Ø§Ù„Ø§ÙØªØ±Ø§Ø¶ÙŠ ÙÙˆØ± Ø§Ù„ØªØ´ØºÙŠÙ„ Ø§Ù„Ù…ÙƒØªØ´Ù" : "Detected Startup Connection String"}
                    </span>
                  </div>
                  <div className="font-mono text-[10px] break-all bg-[var(--bg-primary)] p-2 rounded-sm border border-[var(--border-main)] select-all text-left text-gray-500">
                    {db.local_connection_string}
                  </div>
                </div>
              )}

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
                            ? "Ø¬Ø§Ø±ÙŠ ÙØ­Øµ Ø§Ù„Ø§ØªØµØ§Ù„ (Pre-flight)..."
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
                          placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
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
                    disabled={isMigrating?.id === db.id}
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
                    disabled={isMigrating?.id === db.id}
                    title={t("migrateAdditiveDesc")}
                    className={`flex flex-col items-center justify-center gap-1.5 py-4 rounded-sm border transition-theme font-bold text-[10px] uppercase tracking-wider relative overflow-hidden group ${
                      theme === "dark"
                        ? "border-accent/40 bg-accent/10 hover:bg-accent/20 text-accent hover:shadow-[0_0_15px_rgba(156,163,175,0.2)]"
                        : "border-accent/30 bg-accent/10 hover:bg-accent/20 text-accent shadow-sm"
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
                        className="transition-theme group-hover:scale-110 text-accent"
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
                          {dir === "rtl" ? "Ù†Ø³Ø®/Ø¥Ø³ØªØ¹Ø§Ø¯Ø©" : "Backup"}
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
                                  ? `ØªØµØ¯ÙŠØ± Ù†Ø³Ø®Ø© (${currentDbName})`
                                  : `Export Backup (${currentDbName})`}
                              </button>
                              <div className="h-px bg-[var(--border-main)] my-1" />
                              <label className="w-full flex items-center gap-3 p-3 rounded-md hover:bg-accent/10 text-accent transition-theme text-xs font-bold cursor-pointer">
                                <Upload size={16} />
                                {dir === "rtl"
                                  ? `Ø§Ø³ØªÙŠØ±Ø§Ø¯ Ù†Ø³Ø®Ø© Ø¥Ù„Ù‰ (${currentDbName})`
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
      { value: "", label: language === "ar" ? "Ø§Ø®ØªØ± Ù…Ø²ÙˆØ¯ Ø§Ù„Ø®Ø¯Ù…Ø©" : "Select Provider" },
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
            ? "ØªÙ… Ø­ÙØ¸ Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Ø§Ù„ØªÙˆØ¬ÙŠÙ‡ Ø¨Ù†Ø¬Ø§Ø­"
            : "Routing settings saved successfully",
          "success",
        );
      } else {
        showToast(
          language === "ar" ? "ÙØ´Ù„ Ø­ÙØ¸ Ø§Ù„Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª" : "Failed to save settings",
          "error",
        );
      }
    } catch (error) {
      console.error("Error saving route:", error);
      showToast(
        language === "ar" ? "Ø®Ø·Ø£ ÙÙŠ Ø§Ù„Ø§ØªØµØ§Ù„" : "Connection error",
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
      opts.push({ value: currentVal, label: `âš ï¸ ${currentVal} (Not Synced)` });
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
                              ? "Ù†Ø´Ø·"
                              : "Active Routing"
                            : language === "ar"
                              ? "Ù…Ø¹Ø·Ù„"
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
                      {language === "ar" ? "Ø±Ø³Ù… ØªØ´ØºÙŠÙ„ Ø§Ù„Ø®Ø¯Ù…Ø© Ø§Ù„Ø«Ø§Ø¨Øª (Flat Execution Base)" : "Flat Execution Base Cost"}
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
                        {language === "ar" ? "Ø³Ø¹Ø± Ù…Ø¯Ø®Ù„Ø§Øª /1K ØªÙˆÙƒÙ†" : "Input /1k Token Cost"}
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
                        {language === "ar" ? "Ø³Ø¹Ø± Ù…Ø®Ø±Ø¬Ø§Øª /1K ØªÙˆÙƒÙ†" : "Output /1k Token Cost"}
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
                          placeholder={language === "ar" ? "Ø§Ø®ØªØ± Ù…Ø²ÙˆØ¯ Ø§Ù„Ø®Ø¯Ù…Ø©" : "Select Provider"}
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
                            placeholder={language === "ar" ? "Ø§Ø®ØªØ± Ù…Ø²ÙˆØ¯ Ø§Ù„Ø®Ø¯Ù…Ø©" : "Select Provider"}
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
                          placeholder={language === "ar" ? "Ø§Ø®ØªØ± Ù…Ø²ÙˆØ¯ Ø§Ù„Ø®Ø¯Ù…Ø©" : "Select Provider"}
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
                          placeholder={language === "ar" ? "Ø§Ø®ØªØ± Ù…Ø²ÙˆØ¯ Ø§Ù„Ø®Ø¯Ù…Ø©" : "Select Provider"}
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
            ? `ØªÙ… ØªØ¯Ù‚ÙŠÙ‚ ÙˆÙ…Ø·Ø§Ø¨Ù‚Ø© Ø§Ù„Ø®Ø²Ù†Ø© (${audited} Ù…Ø­ÙØ¸Ø©ØŒ ${discrepancies} ÙØ±ÙˆÙ‚Ø§Øª)`
            : `Ledger reconciliation complete (${audited} wallets, ${discrepancies} discrepancies)`,
          discrepancies > 0 ? "warning" : "success"
        );
        fetchFinancialRequests();
      } else {
        showToast(language === "ar" ? "ÙØ´Ù„ ØªØ¯Ù‚ÙŠÙ‚ Ø§Ù„Ø®Ø²Ù†Ø©" : "Reconciliation failed", "error");
      }
    } catch {
      showToast(language === "ar" ? "Ø®Ø·Ø£ ÙÙŠ Ø§Ù„Ø´Ø¨ÙƒØ©" : "Network error", "error");
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
            ? "ØªÙ… Ù…Ø¹Ø§Ù„Ø¬Ø© ÙˆØªØ­Ø¯ÙŠØ« Ø·Ù„Ø¨ Ø§Ù„Ø¥ÙŠØ¯Ø§Ø¹ ÙˆØ§Ù„ØªØ­ÙˆÙŠÙ„ Ø§Ù„ÙŠØ¯ÙˆÙŠ Ø¨Ù†Ø¬Ø§Ø­!"
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
            ? "ØªÙ… Ù…Ø¹Ø§Ù„Ø¬Ø© ÙˆØªØ­Ø¯ÙŠØ« Ø·Ù„Ø¨ Ø§Ù„Ø³Ø­Ø¨ Ø¨Ù†Ø¬Ø§Ø­ ÙˆØ¹ÙƒØ³ Ø§Ù„Ù…ÙˆØ§Ø²Ù†Ø© Ø¨Ø§Ù„Ù…Ø­ÙØ¸Ø©!"
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
    const confirmMessage = isAr ? "Ù‡Ù„ Ø£Ù†Øª Ù…ØªØ£ÙƒØ¯ Ù…Ù† Ø­Ø°Ù Ù‡Ø°Ø§ Ø§Ù„Ø³Ø¬Ù„ Ù†Ù‡Ø§Ø¦ÙŠÙ‹Ø§ØŸ" : "Are you sure you want to permanently delete this record?";

    setConfirmModal({
      isOpen: true,
      title: { ar: "Ø­Ø°Ù Ø§Ù„Ø³Ø¬Ù„ Ø§Ù„Ù…Ø§Ù„ÙŠ Ù†Ù‡Ø§Ø¦ÙŠØ§Ù‹ØŸ", en: "Permanently Delete Financial Record?" },
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
                ? "ØªÙ… Ø­Ø°Ù Ø§Ù„Ø³Ø¬Ù„ Ø¨Ù†Ø¬Ø§Ø­ Ù…Ù† Ø§Ù„Ø¯ÙØ§ØªØ± Ø§Ù„Ù…Ø§Ù„ÙŠØ©!"
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
            ? "ØªÙ… Ø­ÙØ¸ Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Ø§Ù„Ø®Ø²Ù†Ø© Ø¨Ù†Ø¬Ø§Ø­"
            : "Finance settings saved successfully",
          "success",
        );
      } else {
        const errorData = await res.json();
        showToast(
          language === "ar"
            ? `ÙØ´Ù„ Ø§Ù„Ø­ÙØ¸: ${errorData.error}`
            : `Save failed: ${errorData.error}`,
          "error",
        );
      }
    } catch (error) {
      console.error("Error saving economy settings:", error);
      showToast(
        language === "ar" ? "Ø®Ø·Ø£ ÙÙŠ Ø§Ù„Ø§ØªØµØ§Ù„" : "Connection Error",
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
            ? "ØªÙ… Ø­ÙØ¸ Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Ø¨ÙˆØ§Ø¨Ø§Øª Ø§Ù„Ø¯ÙØ¹ Ø§Ù„Ø¨Ø¯ÙŠÙ„Ø© Ø¨Ù†Ø¬Ø§Ø­"
            : "Alternative payment gateways saved successfully",
          "success",
        );
      } else {
        const errorData = await res.json();
        showToast(
          language === "ar"
            ? `ÙØ´Ù„ Ø§Ù„Ø­ÙØ¸: ${errorData.error}`
            : `Save failed: ${errorData.error}`,
          "error",
        );
      }
    } catch (error) {
      console.error("Error saving wallet gateways:", error);
      showToast(
        language === "ar" ? "Ø®Ø·Ø£ ÙÙŠ Ø§Ù„Ø§ØªØµØ§Ù„" : "Connection Error",
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
      label: language === "ar" ? "Ø³Ø¬Ù„ Ø§Ù„Ù…Ø¹Ø§Ù…Ù„Ø§Øª" : "Registry & Ledger",
      icon: Landmark,
    },
    {
      id: "financial_requests",
      label: language === "ar" ? "Ø§Ù„Ù…Ø¹Ø§Ù…Ù„Ø§Øª Ø§Ù„ÙŠØ¯ÙˆÙŠØ©" : "Manual Transactions",
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
            ? "ØªÙ… Ø­ÙØ¸ Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª PayPal Ø¨Ù†Ø¬Ø§Ø­"
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
            ? `ÙØ´Ù„ Ø§Ù„Ø­ÙØ¸: ${errorData.error}`
            : `Save failed: ${errorData.error}`,
          "error",
        );
      }
    } catch (error) {
      showToast(
        language === "ar" ? "Ø®Ø·Ø£ ÙÙŠ Ø§Ù„Ø§ØªØµØ§Ù„" : "Connection Error",
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
            ? "ØªÙ… Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† Ø¨ÙˆØ§Ø¨Ø© PayPal Ø¨Ù†Ø¬Ø§Ø­!"
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
            ? "ØªÙ… Ø­ÙØ¸ Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Stripe Ø¨Ù†Ø¬Ø§Ø­"
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
            ? `ÙØ´Ù„ Ø§Ù„Ø­ÙØ¸: ${errorData.error}`
            : `Save failed: ${errorData.error}`,
          "error",
        );
      }
    } catch (error) {
      showToast(
        language === "ar" ? "Ø®Ø·Ø£ ÙÙŠ Ø§Ù„Ø§ØªØµØ§Ù„" : "Connection Error",
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
            ? `ØªÙ… Ø§Ù„ØªØ­Ù‚Ù‚ Ø¨Ù†Ø¬Ø§Ø­! Ø§Ù„Ù…ØªØ¬Ø±: ${data.business_name}`
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
                    ? "Ø§Ù„Ø­Ø¯ Ø§Ù„Ø£Ø¯Ù†Ù‰ Ù„Ù„Ø³Ø­Ø¨ (Ø¯ÙˆÙ„Ø§Ø±)"
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
                    ? "Ø£Ù‚Ù„ Ù…Ø¨Ù„Øº ÙŠÙ…ÙƒÙ† Ù„Ù„Ù…Ø³ØªØ®Ø¯Ù… Ø·Ù„Ø¨Ù‡ Ù„Ù„Ø³Ø­Ø¨."
                    : "Minimum amount a user can request for payout."}
                </p>
              </div>

              <div className="flex flex-col items-center">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 text-center">
                  {language === "ar"
                    ? "Ø§Ù„Ø­Ø¯ Ø§Ù„Ø£Ø¯Ù†Ù‰ Ù„Ù„Ø¥ÙŠØ¯Ø§Ø¹ (Ø¯ÙˆÙ„Ø§Ø±)"
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
                    ? "Ø£Ù‚Ù„ Ù…Ø¨Ù„Øº ÙŠÙ…ÙƒÙ† Ù„Ù„Ù…Ø³ØªØ®Ø¯Ù… Ø¥ÙŠØ¯Ø§Ø¹Ù‡."
                    : "Minimum amount a user can deposit."}
                </p>
              </div>

              <div className="flex flex-col items-center">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 text-center">
                  {language === "ar"
                    ? "ØªÙØ¹ÙŠÙ„ Ø§Ù„Ø¥Ø­Ø§Ù„Ø© Ø¹Ù†Ø¯ Ø¥ÙŠØ¯Ø§Ø¹ ($)"
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
                    ? "Ø§Ù„Ù…Ø¨Ù„Øº Ø§Ù„Ø°ÙŠ ÙŠØ¬Ø¨ Ø¹Ù„Ù‰ Ø§Ù„Ø´Ø®Øµ Ø§Ù„Ù…ÙØ­Ø§Ù„ Ø¥ÙŠØ¯Ø§Ø¹Ù‡ Ù„ØªÙØ¹ÙŠÙ„ Ù…ÙƒØ§ÙØ£Ø© Ø§Ù„Ø¥Ø­Ø§Ù„Ø©."
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
                    {language === "ar" ? "Ø¯ÙØªØ± Ø§Ù„Ø­Ø³Ø§Ø¨Ø§Øª ÙˆØ¬Ù…ÙŠØ¹ Ø§Ù„Ù…Ø¹Ø§Ù…Ù„Ø§Øª Ø§Ù„Ù…Ø§Ù„ÙŠØ©" : "System Registry & General Ledger"}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {language === "ar" ? "Ù‚Ø§Ø¦Ù…Ø© ØªØ¯Ù‚ÙŠÙ‚ Ø´Ø§Ù…Ù„Ø© Ù„ÙƒÙ„ ØªØ¯ÙÙ‚Ø§Øª Ø§Ù„Ø®Ø²Ù†Ø© ÙˆØ§Ù„Ø§Ø¦ØªÙ…Ø§Ù†Ø§Øª Ø§Ù„Ù„Ø­Ø¸ÙŠØ©." : "Comprehensive system record auditing all active credits, debits and payouts."}
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
                <span>{isReconciling ? (language === "ar" ? "Ø¬Ø§Ø±ÙŠ Ø§Ù„ØªØ¯Ù‚ÙŠÙ‚ ÙˆØ§Ù„Ù…Ø·Ø§Ø¨Ù‚Ø©..." : "Reconciling...") : (language === "ar" ? "ØªØ¯Ù‚ÙŠÙ‚ ÙˆÙ…Ø·Ø§Ø¨Ù‚Ø© Ø§Ù„Ø®Ø²Ù†Ø©" : "Audit & Reconcile Vault")}</span>
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
                      <th className="p-4">{language === "ar" ? "Ø§Ù„Ù…Ø³ØªØ¹Ù…Ù„" : "User"}</th>
                      <th className="p-4">{language === "ar" ? "Ù†ÙˆØ¹ Ø§Ù„Ù…Ø¹Ø§Ù…Ù„Ø©" : "Type"}</th>
                      <th className="p-4">{language === "ar" ? "Ø§Ù„Ù‚ÙŠÙ…Ø©" : "Amount"}</th>
                      <th className="p-4">{language === "ar" ? "Ø·Ø±ÙŠÙ‚Ø© Ø§Ù„Ø¯ÙØ¹" : "Method"}</th>
                      <th className="p-4">{language === "ar" ? "Ø­Ø§Ù„Ø© Ø§Ù„Ù…Ø¹Ø§Ù…Ù„Ø©" : "Status"}</th>
                      <th className="p-4">{language === "ar" ? "Ø§Ù„Ø±Ù‚Ù… Ø§Ù„Ù…Ø±Ø¬Ø¹ÙŠ" : "Reference"}</th>
                      <th className="p-4">{language === "ar" ? "ØªØ§Ø±ÙŠØ® Ø§Ù„Ù†Ø´ÙˆØ¡" : "Created At"}</th>
                      <th className="p-4 text-center">{language === "ar" ? "Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡Ø§Øª" : "Actions"}</th>
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
                                {isDep ? (language === "ar" ? "Ø¥ÙŠØ¯Ø§Ø¹" : "DEPOSIT") : (language === "ar" ? "Ø³Ø­Ø¨" : "WITHDRAWAL")}
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
                                  title={language === "ar" ? "Ù…Ø³Ø­ Ù‡Ø°Ø§ Ø§Ù„Ø³Ø¬Ù„ Ø§Ù„Ù…Ù†ØªÙ‡ÙŠ Ù†Ù‡Ø§Ø¦ÙŠØ§" : "Delete expired or finished record"}
                                >
                                  {language === "ar" ? "Ù…Ø³Ø­" : "DELETE"}
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    {financialRequests.deposits.length === 0 && financialRequests.withdrawals.length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-12 text-center text-gray-500">
                          {language === "ar" ? "Ù„Ø§ ØªÙˆØ¬Ø¯ Ø£ÙŠ Ø³Ø¬Ù„Ø§Øª Ù…Ø¹Ø§Ù…Ù„Ø§Øª Ø¯ÙØªØ±ÙŠØ© Ù…Ø³Ø¬Ù„Ø© Ø­Ø§Ù„ÙŠØ§Ù‹." : "No records registered on the system ledger yet."}
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
                    {language === "ar" ? "Ù…Ø¹Ø§Ù„Ø¬Ø© Ø·Ù„Ø¨Ø§Øª Ø§Ù„Ø¥ÙŠØ¯Ø§Ø¹ ÙˆØ§Ù„Ø³Ø­Ø¨ Ø§Ù„ÙŠØ¯ÙˆÙŠØ©" : "Manual Financial Verification Terminal"}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {language === "ar" ? "Ù…Ø±Ø§Ø¬Ø¹Ø© Ø¥Ø«Ø¨Ø§ØªØ§Øª Ø§Ù„ØªØ­ÙˆÙŠÙ„ Ù„Ù„Ø¹Ù…Ù„Ø§Øª ÙˆØ­ÙˆØ§Ù„Ø§Øª Ø§Ù„Ø¨Ù†ÙˆÙƒ ÙˆØ¥ØªÙ…Ø§Ù… Ø§Ù„ØªØ­ÙˆÙŠÙ„Ø§Øª Ø§Ù„ØµØ§Ø¯Ø±Ø© Ø¨Ø¯Ù‚Ø© Ø¹Ø§Ù„ÙŠØ©." : "Audit user payment screenshots, reference IDs, and click approve to update balances onto the core ledger."}
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
                    {language === "ar" ? "Ø·Ù„Ø¨Ø§Øª Ø§Ù„Ø¥ÙŠØ¯Ø§Ø¹ Ø§Ù„ÙŠØ¯ÙˆÙŠ Ø§Ù„Ø¹Ø§Ù„Ù‚Ø©" : "Pending Manual Deposits"} ({financialRequests.deposits.filter(d => d.status === 'pending').length})
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
                                {language === "ar" ? "Ø¹Ø±Ø¶ Ø¥Ø«Ø¨Ø§Øª Ø§Ù„ØªØ­ÙˆÙŠÙ„ â†—" : "VIEW STATEMENT â†—"}
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
                                language === "ar" ? "Ù…ÙˆØ§ÙÙ‚Ø© ÙˆØªØ­Ø¯ÙŠØ« Ø§Ù„Ø±ØµÙŠØ¯" : "APPROVE & ENROLL"
                              )}
                            </button>
                            <button
                              onClick={() => {
                                if (!rejectionReasons[request.id]) {
                                  showToast(language === "ar" ? "Ø§Ù„Ø±Ø¬Ø§Ø¡ Ø¥Ø¯Ø®Ø§Ù„ Ø³Ø¨Ø¨ Ø§Ù„Ø±ÙØ¶ Ø£ÙˆÙ„Ø§Ù‹" : "Please provide rejection explanation first", "error");
                                  return;
                                }
                                handleDepositAction(request.id, 'reject');
                              }}
                              disabled={actioningId !== null}
                              className="px-4 h-9 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white font-bold active:scale-[0.99] rounded-[4px] text-[10px] uppercase tracking-wider transition-theme"
                            >
                              {language === "ar" ? "Ø±ÙØ¶" : "REJECT"}
                            </button>
                          </div>
                          
                          <input
                            type="text"
                            value={rejectionReasons[request.id] || ''}
                            onChange={(e) => setRejectionReasons(prev => ({ ...prev, [request.id]: e.target.value }))}
                            placeholder={language === "ar" ? "Ø£Ø¯Ø®Ù„ Ø³Ø¨Ø¨ Ø§Ù„Ø±ÙØ¶ ÙÙŠ Ø­Ø§Ù„ Ù†Ù‚Ø± Ø§Ù„Ø²Ø±..." : "Write rejection memo if choosing to deny..."}
                            className="w-full h-8 px-3 text-[10px] bg-black/10 border border-rose-500/20 focus:border-rose-500 rounded-[4px] focus:outline-none placeholder:text-gray-600 text-rose-400 font-sans"
                          />
                        </div>
                      </div>
                    );
                  })}

                  {financialRequests.deposits.filter(d => d.status === 'pending').length === 0 && (
                    <div className="p-8 text-center text-xs text-gray-500 bg-gray-50/50 dark:bg-[#1a1a1c]/30 rounded-[4px]">
                      {language === "ar" ? "Ù„Ø§ ØªÙˆØ¬Ø¯ Ù…Ø¹Ø§Ù…Ù„Ø§Øª Ø¥ÙŠØ¯Ø§Ø¹ ÙŠØ¯ÙˆÙŠØ© Ù…Ø¹Ù„Ù‚Ø© Ø­Ø§Ù„ÙŠØ§Ù‹." : "No deposits waiting code alignment details."}
                    </div>
                  )}
                </div>

                {/* 2. MANUAL WITHDRAWALS BLOCK */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-widest text-[#334155] border-b border-gray-100 dark:border-gray-800 pb-2">
                    {language === "ar" ? "Ø·Ù„Ø¨Ø§Øª Ø§Ù„Ø³Ø­Ø¨ Ø§Ù„Ù…Ø¹Ù„Ù‚Ø©" : "Pending User Withdrawals"} ({financialRequests.withdrawals.filter(w => w.status === 'pending').length})
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
                                language === "ar" ? "Ù…ÙˆØ§ÙÙ‚Ø© ÙˆØªØ­ÙˆÙŠÙ„ Ø§Ù„Ø³Ø­Ø¨" : "APPROVE & DISBURSE"
                              )}
                            </button>
                            <button
                              onClick={() => {
                                if (!rejectionReasons[request.id]) {
                                  showToast(language === "ar" ? "Ø§Ù„Ø±Ø¬Ø§Ø¡ ÙƒØªØ§ÙŠØ© Ø³Ø¨Ø¨ Ø§Ù„Ø±ÙØ¶ Ù„Ø¥Ø¹Ø§Ø¯Ø© Ø§Ù„Ø±ØµÙŠØ¯ Ù„Ù„Ù…Ø³ØªØ®Ø¯Ù…" : "Please input refund rejection explanation memo", "error");
                                  return;
                                }
                                handleWithdrawalAction(request.id, 'reject');
                              }}
                              disabled={actioningId !== null}
                              className="px-4 h-9 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white font-bold active:scale-[0.99] rounded-[4px] text-[10px] uppercase tracking-wider transition-theme"
                            >
                              {language === "ar" ? "Ø±ÙØ¶ Ù…Ø¹ Ø§Ù„Ø¥Ø±Ø¬Ø§Ø¹" : "REJECT & REFUND"}
                            </button>
                          </div>

                          <input
                            type="text"
                            value={rejectionReasons[request.id] || ''}
                            onChange={(e) => setRejectionReasons(prev => ({ ...prev, [request.id]: e.target.value }))}
                            placeholder={language === "ar" ? "Ø£Ø¯Ø®Ù„ Ø³Ø¨Ø¨ Ø§Ù„Ø±ÙØ¶ ÙÙŠ Ø­Ø§Ù„ Ø±ÙØ¶ Ø§Ù„Ù…Ø¹Ø§Ù…Ù„Ø©..." : "Write refund explanation reason memo..."}
                            className="w-full h-8 px-3 text-[10px] bg-black/10 border border-rose-500/20 focus:border-rose-500 rounded-[4px] focus:outline-none placeholder:text-gray-650 text-rose-450 font-sans"
                          />
                        </div>
                      </div>
                    );
                  })}

                  {financialRequests.withdrawals.filter(w => w.status === 'pending').length === 0 && (
                    <div className="p-8 text-center text-xs text-gray-500 bg-gray-50/50 dark:bg-[#1a1a1c]/30 rounded-[4px]">
                      {language === "ar" ? "Ù„Ø§ ØªÙˆØ¬Ø¯ Ø·Ù„Ø¨Ø§Øª Ø³Ø­Ø¨ Ù…Ø¹Ù„Ù‚Ø© Ø­Ø§Ù„ÙŠØ§Ù‹." : "No withdrawal requests pending action."}
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
                  {dir === "rtl" ? "Ø¨ÙˆØ§Ø¨Ø§Øª Ø§Ù„Ø¯ÙØ¹ Ø§Ù„Ø±Ø³Ù…ÙŠØ© Ø§Ù„Ù…Ø¤ØªÙ…ØªØ© (APIs)" : "Official Automated Payment Gateways"}
                </h4>
                <p className="text-xs text-gray-500">
                  {dir === "rtl" ? "ØªÙƒÙˆÙŠÙ† Ø§Ù„Ù…ÙØ§ØªÙŠØ­ ÙˆØ§Ù„Ø§ØªØµØ§Ù„ Ø§Ù„ÙÙˆØ±ÙŠ Ù„Ù…Ø¹Ø§Ù„Ø¬Ø© Ø§Ù„Ø§Ø´ØªØ±Ø§ÙƒØ§Øª ÙˆØªÙ„Ù‚ÙŠ Ø§Ù„Ù…Ø¯ÙÙˆØ¹Ø§Øª Ø§Ù„ØªÙ„Ù‚Ø§Ø¦ÙŠØ©." : "Configure secure API keys for automated checkouts, subscription renewals, and balance increases."}
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
                              {dir === "rtl" ? "Ù†Ø´Ø· / Ù…Ø¹ØªÙ…Ø¯" : "Active / Verified"}
                            </>
                          ) : (
                            <>
                              <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              {dir === "rtl" ? "Ù…Ø¹Ù„Ù‚" : "Pending"}
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
                            ? dir === "rtl" ? "Ø¨ÙŠØ¦Ø© Ø§Ù„Ø¥Ù†ØªØ§Ø¬ Ø§Ù„Ø­Ù‚ÙŠÙ‚ÙŠØ©" : "Live Production Environment"
                            : dir === "rtl" ? "Ø¨ÙŠØ¦Ø© Ø§Ù„Ø§Ø®ØªØ¨Ø§Ø± Ø§Ù„ØªØ¬Ø±ÙŠØ¨ÙŠØ©" : "Test Sandbox Mode"}
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
                            ? "Ù…Ø·Ù„ÙˆØ¨ Ù„Ù…Ø¹Ø§Ù„Ø¬Ø© Ø§Ù„ØªÙ†Ø¨ÙŠÙ‡Ø§Øª Ø§Ù„Ù…Ø¨Ø§Ø´Ø±Ø© ÙˆØªØ±Ù‚ÙŠØ© Ø®Ø·Ø· Ø§Ù„Ù…Ø´ØªØ±ÙƒÙŠÙ† ÙÙŠ Ø§Ù„Ø®Ù„ÙÙŠØ© ØªÙ„Ù‚Ø§Ø¦ÙŠØ§Ù‹."
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
                      {dir === "rtl" ? "ØªØ­Ù‚Ù‚ Ø§Ù„Ù…Ø²Ø§Ù…Ù†Ø©" : "Verify Sync"}
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
                            {dir === "rtl" ? "Ø¨ÙˆØ§Ø¨Ø© PayPal Ø§Ù„Ø±Ø³Ù…ÙŠØ©" : "Official PayPal REST API"}
                          </h3>
                          <p className="text-xs text-gray-500">
                            {dir === "rtl" ? "ØªØµØ¯ÙŠØ± ÙˆÙ…Ø¹Ø§Ù„Ø¬Ø© Ø·Ù„Ø¨Ø§Øª Ø§Ù„Ø¥ÙŠØ¯Ø§Ø¹ Ø§Ù„Ù…Ø¨Ø§Ø´Ø± Ø¹Ø¨Ø± API." : "Link official merchant APIs for checkout automation."}
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
                              {dir === "rtl" ? "Ù†Ø´Ø· / Ù…Ø¹ØªÙ…Ø¯" : "Active / Verified"}
                            </>
                          ) : (
                            <>
                              <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              {dir === "rtl" ? "Ù…Ø¹Ù„Ù‚" : "Pending"}
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
                            ? dir === "rtl" ? "Ø¨ÙŠØ¦Ø© Ø§Ù„Ø¥Ù†ØªØ§Ø¬ Ø§Ù„Ø­Ù‚ÙŠÙ‚ÙŠØ©" : "Live Production Environment"
                            : dir === "rtl" ? "Ø¨ÙŠØ¦Ø© Ø§Ù„Ø§Ø®ØªØ¨Ø§Ø± Ø§Ù„ØªØ¬Ø±ÙŠØ¨ÙŠØ©" : "Test Sandbox Mode"}
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
                          {dir === "rtl" ? "Ù…Ø¹Ø±Ù Ø§Ù„Ø¹Ù…ÙŠÙ„ (Client ID)" : "PayPal Client ID"}
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
                          {dir === "rtl" ? "Ø§Ù„Ù…ÙØªØ§Ø­ Ø§Ù„Ø³Ø±ÙŠ (Client Secret)" : "PayPal Client Secret"}
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
                          {dir === "rtl" ? "Ø´Ø­Ù† Ø§Ù„Ø±ØµÙŠØ¯ Ø§Ù„ØªÙ„Ù‚Ø§Ø¦ÙŠ" : "Instant Ingestion Option"}
                        </span>
                        <p className="text-[10px] text-gray-500 flex items-start gap-1">
                          <Info size={12} className="text-gray-400 mt-0.5 shrink-0" />
                          {dir === "rtl"
                            ? "ÙŠØªÙ… Ø§Ù„ØªØ³ÙˆÙŠØ© ÙˆØ§Ù„Ù‚ÙŠØ¯ Ø§Ù„Ù„Ø­Ø¸ÙŠ Ù„Ù„Ø£Ø±ØµØ¯Ø© ÙÙŠ PostgreSQL Ø¨Ù…Ø¬Ø±Ø¯ Ù…ÙˆØ§ÙÙ‚Ø© Ø§Ù„Ø¹Ù…ÙŠÙ„ Ø¹Ù„Ù‰ ØªÙÙˆÙŠØ¶ PayPal."
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
                      {dir === "rtl" ? "Ø­ÙØ¸ Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª PayPal" : "Save PayPal Config"}
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
                      {dir === "rtl" ? "ØªØ­Ù‚Ù‚ Ø§Ù„Ù…Ø²Ø§Ù…Ù†Ø©" : "Verify Sync"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* MANUAL & ALTERNATIVE WALLET GATEWAYS CONFIG */}
            <div>
              <div className="mb-6">
                <h4 className="text-xs font-bold uppercase tracking-wider text-accent  mb-1">
                  {dir === "rtl" ? "Ù‚Ù†ÙˆØ§Øª Ø§Ù„Ø¥ÙŠØ¯Ø§Ø¹ ÙˆØ§Ù„ØªØ­ØµÙŠÙ„ Ø§Ù„ÙŠØ¯ÙˆÙŠ Ù„Ù„Ù…Ø­Ø§ÙØ¸" : "Alternative Manual Deposit Routes"}
                </h4>
                <p className="text-xs text-gray-500">
                  {dir === "rtl" ? "ØªØ¹Ø¯ÙŠÙ„ Ø®ÙŠØ§Ø±Ø§Øª Ø§Ù„ØªØ­ÙˆÙŠÙ„ ÙŠØ¯ÙˆÙŠÙ‹Ø§ Ø®Ø§Ø±Ø¬ Ø¨ÙˆØ§Ø¨Ø§Øª Ø§Ù„Ø¯ÙØ¹ Ø§Ù„ÙÙˆØ±ÙŠ (Ø§Ù„Ø¹Ù…Ù„Ø§Øª Ø§Ù„Ù…Ø´ÙØ±Ø©ØŒ Ø§Ù„Ø­ÙˆØ§Ù„Ø§Øª ÙˆØ§Ù„Ø¨Ø±ÙŠØ¯ Ø§Ù„Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠ)." : "Configure custom payment instructions and wallet destinations displayed to users on the deposits tab."}
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
                      {dir === "rtl" ? "ÙˆØ¬Ù‡Ø§Øª Ø§Ù„Ø¥ÙŠØ¯Ø§Ø¹Ø§Øª Ø§Ù„ÙŠØ¯ÙˆÙŠØ©" : "Alternative Manual Destinations"}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {dir === "rtl"
                        ? "Ù‡Ø°Ù‡ Ø§Ù„Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª ØªÙˆØ¬Ù‡ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…ÙŠÙ† Ù„Ø¥ØªÙ…Ø§Ù… Ø§Ù„Ø¯ÙØ¹ Ø®Ø§Ø±Ø¬ Ø§Ù„Ù†Ø¸Ø§Ù… Ù…Ø¹ Ø¥ÙŠÙ‚Ø§Ø¸ Ø·Ù„Ø¨Ø§Øª Ø§Ù„Ø¥ÙŠØ¯Ø§Ø¹ Ù„Ù„ØªØ«Ø¨ÙŠØª."
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
                        {dir === "rtl" ? "Ø¹Ù…Ù„Ø© USDT Ø§Ù„Ù…Ø³ØªÙ‚Ø±Ø© (TRC-20)" : "USDT Stablecoin (TRC-20)"}
                      </h4>
                      <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                        {dir === "rtl"
                          ? "ØªÙ„Ù‚ÙŠ Ø¯ÙØ¹Ø§Øª Ø§Ù„Ø¹Ù…Ù„Ø§Øª Ø§Ù„Ø±Ù‚Ù…ÙŠØ© Ø§Ù„Ù…Ø³ØªÙ‚Ø±Ø© ÙˆØ³Ø­Ø¨Ù‡Ø§ ÙŠØ¯ÙˆÙŠÙ‹Ø§ Ø¥Ù„Ù‰ Ù‡Ø°Ø§ Ø§Ù„Ø¹Ù†ÙˆØ§Ù† Ø¨Ù…Ø·Ø§Ø¨Ù‚Ø© Ø§Ù„Ù…Ø¹Ø§Ù…Ù„Ø§Øª."
                          : "Direct crypto deposit processing. Users request transactions using ledger hashes."}
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-[11px] font-medium text-gray-500 mb-1.5">
                          {dir === "rtl" ? "Ø¹Ù†ÙˆØ§Ù† Ù…Ø­ÙØ¸Ø© USDT Ø§Ù„Ù…ØªÙ„Ù‚ÙŠØ©" : "Receiving USDT Address (TRC-20)"}
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
                        {dir === "rtl" ? "Ù†Ø¸Ø§Ù… Ø¨Ø§ÙŠ Ø¨Ø§Ù„ Ø§Ù„Ù…Ø¨Ø§Ø´Ø±" : "Direct PayPal Ingestion"}
                      </h4>
                      <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                        {dir === "rtl"
                          ? "Ø¨Ø±ÙŠØ¯ Ø¨Ø§ÙŠ Ø¨Ø§Ù„ Ø§Ù„ØªØ¬Ø§Ø±ÙŠ Ø§Ù„Ø¨Ø¯ÙŠÙ„ Ù„ØªÙ„Ù‚ÙŠ Ù…Ø¨Ø§Ù„Øº Ø§Ù„Ø´Ø­Ù† Ù…Ø¹ ØªÙˆØ¬ÙŠÙ‡ Ø¢Ù…Ù† ÙˆÙ…Ø¨Ø§Ø´Ø± Ù„Ø¥ØªÙ…Ø§Ù… Ø§Ù„Ø¯ÙØ¹ Ø§Ù„ÙÙˆØ±ÙŠ."
                          : "Fallback client processing using structured commercial Paypal email routing."}
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-[11px] font-medium text-gray-500 mb-1.5">
                          {dir === "rtl" ? "Ø§Ù„Ø¨Ø±ÙŠØ¯ Ø§Ù„Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠ Ù„ØªÙ„Ù‚ÙŠ Ø§Ù„Ù…Ø¯ÙÙˆØ¹Ø§Øª" : "Business PayPal Email Address"}
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
                      {dir === "rtl" ? "Ù…Ø¹Ù„ÙˆÙ…Ø§Øª Ø§Ù„ØªØ­ÙˆÙŠÙ„ Ø§Ù„Ø¨Ù†ÙƒÙŠ" : "Bank Transfer & IBAN Node Wire"}
                    </h4>

                    {/* Highly responsive interior layout for bank attributes */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-black tracking-wide text-gray-500 uppercase mb-1">
                          {dir === "rtl" ? "Ø§Ø³Ù… Ø§Ù„Ø¨Ù†Ùƒ" : "Bank Name"}
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
                          {dir === "rtl" ? "Ø§Ø³Ù… Ø§Ù„Ù…Ø³ØªÙ„Ù… / Ø§Ù„Ù…Ø³ØªÙÙŠØ¯" : "Beneficiary / Account Holder"}
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
                          {dir === "rtl" ? "Ø±Ù…Ø² Ø§Ù„Ø³ÙˆÙŠÙØª SWIFT / BIC" : "SWIFT / BIC Code"}
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
                          {dir === "rtl" ? "Ø±Ù‚Ù… Ø§Ù„Ø­Ø³Ø§Ø¨ Ø£Ùˆ Ø§Ù„Ø¢ÙŠØ¨Ø§Ù†" : "IBAN / Account Number"}
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
                    {dir === "rtl" ? "Ø­ÙØ¸ ØªÙƒÙˆÙŠÙ† Ø¨ÙˆØ§Ø¨Ø§Øª Ø§Ù„Ù…Ø­ÙØ¸Ø© Ø§Ù„Ø¨Ø¯ÙŠÙ„Ø©" : "Save Alternative Gateways"}
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
          language === "ar" ? "ÙØ´Ù„ Ø­ÙØ¸ Ø§Ù„Ø®Ø·Ø©" : "Failed to save plan",
          "error",
        );
      }
    } catch (error) {
      console.error("Error saving plan:", error);
      showToast(
        language === "ar" ? "ÙØ´Ù„ Ø­ÙØ¸ Ø§Ù„Ø®Ø·Ø©" : "Failed to save plan",
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
        language === "ar" ? "Ø®Ø·Ø£ ÙÙŠ Ø§Ù„Ø§ØªØµØ§Ù„" : "Connection Error",
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
          {dir === "rtl" ? "Ø¬Ù…ÙŠØ¹ Ø§Ù„Ø®Ø·Ø·" : "All Plans"} ({plans.length})
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
          {dir === "rtl" ? "Ø®Ø·Ø· Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…ÙŠÙ† Ø§Ù„Ø¹Ø§Ø¯ÙŠÙŠÙ†" : "User Plans"} ({plans.filter(p => (p.planType || "user") === "user").length})
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
          {dir === "rtl" ? "Ø®Ø·Ø· Ø§Ù„Ù…Ø·ÙˆØ±ÙŠÙ† ÙˆØ§Ù„ÙˆÙƒÙ„Ø§Ø¡" : "Developer Plans"} ({plans.filter(p => (p.planType || "user") === "developer").length})
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
                    {dir === "rtl" ? "Ø®Ø·Ø· Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…ÙŠÙ† Ø§Ù„Ø¹Ø§Ø¯ÙŠÙŠÙ†" : "Standard User Plans"}
                    <span className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent font-mono font-bold">
                      {plans.filter(p => (p.planType || "user") === "user").length}
                    </span>
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {dir === "rtl" ? "Ø®Ø·Ø· Ø§Ù„Ø§Ø´ØªØ±Ø§ÙƒØ§Øª Ø§Ù„Ù…Ø®ØµØµØ© Ù„Ù„Ù…Ø³ØªØ®Ø¯Ù…ÙŠÙ† ÙˆØ§Ù„Ø£ÙØ±Ø§Ø¯ Ù„Ù„Ø§Ø³ØªØ®Ø¯Ø§Ù… Ø§Ù„ÙŠÙˆÙ…ÙŠ" : "Subscription plans tailored for end users and standard usage"}
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
                        {dir === "rtl" ? "Ù…Ø³ØªØ®Ø¯Ù… Ø¹Ø§Ù…" : "Standard User"}
                      </span>
                      <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${plan.isActive ? "bg-accent/10 text-accent" : "bg-gray-500/10 text-gray-500"}`}>
                        {plan.isActive ? (dir === "rtl" ? "Ù†Ø´Ø·" : "Active") : (dir === "rtl" ? "Ù…ØªÙˆÙ‚Ù" : "Inactive")}
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
                        {dir === "rtl" ? "Ø­ØµØµ Ø§Ù„Ø£Ø¯ÙˆØ§Øª ÙˆØ§Ù„Ù…Ù„ÙØ§Øª Ø§Ù„Ù†Ø´Ø·Ø©" : "Active Tool & File Quotas"}
                      </span>
                      <div className="flex flex-wrap gap-1.5 max-h-[100px] overflow-y-auto custom-scrollbar">
                        {Object.entries(plan.limits || {}).map(([key, limitVal]: [string, any]) => {
                          if (limitVal === undefined || limitVal === null) return null;
                          const daily = typeof limitVal === 'object' && limitVal !== null ? limitVal.daily : limitVal;
                          const monthly = typeof limitVal === 'object' && limitVal !== null ? limitVal.monthly : null;
                          const formatLimit = (v: any) => v === "unlimited" ? "âˆ" : (v || 0);

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
                    {dir === "rtl" ? "Ø®Ø·Ø· Ø§Ù„Ù…Ø·ÙˆØ±ÙŠÙ† ÙˆØ§Ù„ÙˆÙƒÙ„Ø§Ø¡ Ø§Ù„Ø°ÙƒÙŠØ©" : "Developer & Agent API Plans"}
                    <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 font-mono font-bold">
                      {plans.filter(p => (p.planType || "user") === "developer").length}
                    </span>
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {dir === "rtl" ? "Ø®Ø·Ø· Ù…ØªØ®ØµØµØ© Ù„Ù„Ù…Ø·ÙˆØ±ÙŠÙ† ÙˆØ¨Ù†Ø§Ø¡ Ø§Ù„ÙˆÙƒÙ„Ø§Ø¡ ÙˆØ§Ù„Ø±Ø¨Ø· Ø§Ù„Ø¨Ø±Ù…Ø¬ÙŠ Ø¹Ø§Ù„ÙŠ Ø§Ù„Ø³Ø¹Ø©" : "Dedicated plans for developer API access, AI agents, and custom integrations"}
                  </p>
                </div>
              </div>
            </div>

            {plans.filter(p => (p.planType || "user") === "developer").length === 0 ? (
              <div className="p-8 rounded-xl border border-dashed border-indigo-500/30 bg-indigo-500/5 text-center">
                <Terminal className="mx-auto w-8 h-8 text-indigo-400 mb-2 opacity-60" />
                <p className="text-xs text-gray-400 font-medium">
                  {dir === "rtl" ? "Ù„Ø§ ØªÙˆØ¬Ø¯ Ø®Ø·Ø· Ù…Ø·ÙˆØ±ÙŠÙ† Ø­Ø§Ù„ÙŠØ§Ù‹. ÙŠÙ…ÙƒÙ†Ùƒ Ø¥Ø¶Ø§ÙØ© Ø®Ø·Ø© Ø¬Ø¯ÙŠØ¯Ø© ÙˆØªØ¹ÙŠÙŠÙ† Ù†ÙˆØ¹Ù‡Ø§ ÙƒÙ€ 'Ù…Ø·ÙˆØ±ÙŠÙ†'." : "No developer plans found. Click 'Add Plan' and set type to 'Developer'."}
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
                          {dir === "rtl" ? "Ù…Ø·ÙˆØ± / API" : "Developer & API"}
                        </span>
                        <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${plan.isActive ? "bg-indigo-500/10 text-indigo-400" : "bg-gray-500/10 text-gray-500"}`}>
                          {plan.isActive ? (dir === "rtl" ? "Ù†Ø´Ø·" : "Active") : (dir === "rtl" ? "Ù…ØªÙˆÙ‚Ù" : "Inactive")}
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
                          {dir === "rtl" ? "Ø­ØµØµ Ø§Ù„Ù…Ø·ÙˆØ± ÙˆØ§Ù„ÙˆÙƒÙ„Ø§Ø¡ Ø§Ù„Ø°ÙƒÙŠØ©" : "Developer & Agent Quotas"}
                        </span>
                        <div className="flex flex-wrap gap-1.5 max-h-[100px] overflow-y-auto custom-scrollbar">
                          {Object.entries(plan.limits || {}).map(([key, limitVal]: [string, any]) => {
                            if (limitVal === undefined || limitVal === null) return null;
                            const daily = typeof limitVal === 'object' && limitVal !== null ? limitVal.daily : limitVal;
                            const monthly = typeof limitVal === 'object' && limitVal !== null ? limitVal.monthly : null;
                            const formatLimit = (v: any) => v === "unlimited" ? "âˆ" : (v || 0);

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
                        {dir === "rtl" ? "ØªØµÙ†ÙŠÙ Ø§Ù„Ø¨Ø§Ù‚Ø©" : "Plan Type"}
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
                          {dir === "rtl" ? "Ù…Ø³ØªØ®Ø¯Ù… (Ø¹Ø§Ù…)" : "User (General)"}
                        </option>
                        <option value="developer">
                          {dir === "rtl" ? "Ù…Ø·ÙˆØ±ÙŠÙ† (ÙˆÙƒÙ„Ø§Ø¡ Ø¨Ø±Ù…Ø¬ÙŠØ§Øª)" : "Developers (API/Agents)"}
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
                          {language === "ar" ? "Ù†Ø´Ø·" : "Active"}
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
                          {language === "ar" ? "Ù…Ø±Ø¦ÙŠ" : "Visible"}
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
                                          ? "âˆ"
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
                                        ? "âˆ"
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
                      {dir === "rtl" ? "Ø¥Ø¬Ø±Ø§Ø¡ Ù…ØµØ±Ø­ Ø¨Ù‡: ØªÙƒÙˆÙŠÙ† Ø¨Ø§Ù‚Ø© Ø§Ù„Ù†Ø¸Ø§Ù…" : "Authorized Action: System Plan Configuration"}
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
                      {dir === "rtl" ? "Ù…ÙŠØ²Ø§Øª Ø§Ù„Ø¨Ø§Ù‚Ø© (Ø«Ù†Ø§Ø¦ÙŠ Ø§Ù„Ù„ØºØ©)" : "Plan Features (Bilingual)"}
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
                              {dir === "rtl" ? `Ù…ÙŠØ²Ø© #${index + 1}` : `Feature #${index + 1}`}
                            </span>
                            <button
                              onClick={() => removeFeature(feature.id)}
                              className="text-gray-400 hover:text-red-500 transition-theme"
                              title={dir === "rtl" ? "Ø­Ø°Ù ×”×ÙŠØ²Ø©" : "Remove Feature"}
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
                              placeholder="Ø§Ù„Ø®Ø· Ø§Ù„Ù‚Ø§Ø±ÙŠ Ø¨Ø§Ù„Ù„ØºØ© Ø§Ù„Ø¹Ø±Ø¨ÙŠØ©"
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
   * Ø¬Ù„Ø¨ Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…ÙŠÙ† Ù…Ù† Ø§Ù„Ø®Ø§Ø¯Ù…
   * @param signal - AbortSignal Ù„Ø¥Ù„ØºØ§Ø¡ Ø§Ù„Ø·Ù„Ø¨
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
          dir === "rtl" ? "ØªÙ… ØªØ¹Ø¯ÙŠÙ„ Ø§Ù„Ø±ØµÙŠØ¯ Ø¨Ù†Ø¬Ø§Ø­" : "Balance adjusted successfully",
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
      dir === "rtl" ? "Ø£Ø¯Ø®Ù„ Ø¹Ù†ÙˆØ§Ù† Ø§Ù„Ø¨Ø±ÙŠØ¯" : "Enter email subject",
    );
    if (!subject) return;
    const body = prompt(
      dir === "rtl" ? "Ø£Ø¯Ø®Ù„ Ù…Ø­ØªÙˆÙ‰ Ø§Ù„Ø±Ø³Ø§Ù„Ø©" : "Enter email body",
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
          dir === "rtl" ? "ØªÙ… Ø¥Ø±Ø³Ø§Ù„ Ø§Ù„Ø¨Ø±ÙŠØ¯ Ø¨Ù†Ø¬Ø§Ø­" : "Email sent successfully",
          "success",
        );
      } else {
        const data = await res.json();
        showToast(
          data.error ||
            (dir === "rtl" ? "ÙØ´Ù„ Ø¥Ø±Ø³Ø§Ù„ Ø§Ù„Ø¨Ø±ÙŠØ¯" : "Failed to send email"),
          "error",
        );
      }
    } catch (error) {
      console.error("Error sending email:", error);
      showToast(
        dir === "rtl" ? "ÙØ´Ù„ Ø¥Ø±Ø³Ø§Ù„ Ø§Ù„Ø¨Ø±ÙŠØ¯" : "Failed to send email",
        "error",
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSendManualNotification = async (userId: string) => {
    const titleEn = prompt("Enter Internal Alert Title (English)");
    if (!titleEn) return;
    const titleAr = prompt("Ø£Ø¯Ø®Ù„ Ø¹Ù†ÙˆØ§Ù† Ø§Ù„ØªÙ†Ø¨ÙŠÙ‡ Ø§Ù„Ø¯Ø§Ø®Ù„ÙŠ (Ø§Ù„Ø¹Ø±Ø¨ÙŠØ©)");
    if (!titleAr) return;
    const messageEn = prompt("Enter Internal Alert Message (English)");
    if (!messageEn) return;
    const messageAr = prompt("Ø£Ø¯Ø®Ù„ Ù†Øµ Ø§Ù„ØªÙ†Ø¨ÙŠÙ‡ Ø§Ù„Ø¯Ø§Ø®Ù„ÙŠ (Ø§Ù„Ø¹Ø±Ø¨ÙŠØ©)");
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
            ? "ØªÙ… Ø¥Ø±Ø³Ø§Ù„ Ø§Ù„ØªÙ†Ø¨ÙŠÙ‡ Ø¨Ù†Ø¬Ø§Ø­"
            : "Notification sent successfully",
          "success",
        );
      } else {
        const data = await res.json();
        showToast(
          data.error ||
            (dir === "rtl"
              ? "ÙØ´Ù„ Ø¥Ø±Ø³Ø§Ù„ Ø§Ù„ØªÙ†Ø¨ÙŠÙ‡"
              : "Failed to send notification"),
          "error",
        );
      }
    } catch (error) {
      console.error("Error sending notification:", error);
      showToast(
        dir === "rtl" ? "ÙØ´Ù„ Ø¥Ø±Ø³Ø§Ù„ Ø§Ù„ØªÙ†Ø¨ÙŠÙ‡" : "Failed to send notification",
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
      title: dir === "rtl" ? "Ø­Ø°Ù Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…" : "Delete User",
      description: dir === "rtl"
          ? "Ù‡Ù„ Ø£Ù†Øª Ù…ØªØ£ÙƒØ¯ Ù…Ù† Ø­Ø°Ù Ù‡Ø°Ø§ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…ØŸ Ø³ÙŠØªÙ… Ø­Ø°Ù Ø¬Ù…ÙŠØ¹ Ø¨ÙŠØ§Ù†Ø§ØªÙ‡ ÙˆÙ…Ø­ÙØ¸ØªÙ‡ Ù†Ù‡Ø§Ø¦ÙŠØ§Ù‹."
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
              <option value="all">{dir === "rtl" ? "Ø¬Ù…ÙŠØ¹ Ø§Ù„Ø­Ø§Ù„Ø§Øª" : "All Status"}</option>
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
              <option value="all">{dir === "rtl" ? "Ø¬Ù…ÙŠØ¹ Ø§Ù„Ø¨Ø§Ù‚Ø§Øª" : "All Plans"}</option>
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
                          title={dir === "rtl" ? "Ø­Ø°Ù" : "Delete"}
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
                    {dir === "rtl" ? "Ø¥Ø¶Ø§ÙØ© Ù…Ø³ØªØ®Ø¯Ù… Ø¬Ø¯ÙŠØ¯" : "New User Registry"}
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
                  {dir === "rtl" ? "ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…" : "Register User"}
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
                                ? "Ø£Ø¯Ø®Ù„ Ø³Ø¨Ø¨ Ø§Ù„Ø±ÙØ¶ Ù‡Ù†Ø§ Ù„ÙŠØ¸Ù‡Ø± Ù„Ù„Ù…Ø³ØªØ®Ø¯Ù…..."
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
                                    title: dir === "rtl" ? "Ø­Ø°Ù Ø§Ù„ØµÙˆØ±Ø©" : "Delete Selfie",
                                    description: dir === "rtl"
                                        ? "Ù‡Ù„ Ø£Ù†Øª Ù…ØªØ£ÙƒØ¯ Ù…Ù† Ø­Ø°Ù Ø§Ù„ØµÙˆØ±Ø©ØŸ Ù„Ø§ ÙŠÙ…ÙƒÙ† Ø§Ù„ØªØ±Ø§Ø¬Ø¹ Ø¹Ù† Ù‡Ø°Ø§ Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡."
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
                                            ? "ØªÙ… Ø­Ø°Ù Ø§Ù„ØµÙˆØ±Ø© Ø¨Ù†Ø¬Ø§Ø­"
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
                                          ? "ÙØ´Ù„ Ø­Ø°Ù Ø§Ù„ØµÙˆØ±Ø©"
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
                                  ? "Ø­Ø°Ù Ø§Ù„ØµÙˆØ±Ø© Ù†Ù‡Ø§Ø¦ÙŠØ§Ù‹"
                                  : "Delete Selfie Permanently"}
                              </button>
                            </div>
                          ) : (
                            <div className="py-8 flex flex-col items-center justify-center text-gray-500 italic text-xs">
                              <Camera size={24} className="mb-2 opacity-20" />
                              {dir === "rtl"
                                ? "Ù„Ù… ÙŠØªÙ… Ø±ÙØ¹ ØµÙˆØ±Ø© Ø¨Ø¹Ø¯"
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
                        ? "Ø­ÙØ¸ Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ù‡ÙˆÙŠØ©"
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
                          {dir === "rtl" ? "Ù‚Ø³Ù… Ø§Ù„Ù…Ø­ÙØ¸Ø©" : "Ledger Section"}
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
                            {dir === "rtl" ? "Ø§Ù„Ù†Ù‚Ø§Ø·" : "Points"}
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
                            {dir === "rtl" ? "Ø§Ù„Ù‚ÙŠÙ…Ø© Ø¨Ø§Ù„Ø¯ÙˆÙ„Ø§Ø±" : "USD Value"}
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
                              placeholder={dir === "rtl" ? "Ø§Ù„Ù…Ø¨Ù„Øº" : "Amount"}
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
                              {dir === "rtl" ? "Ø¥ÙŠØ¯Ø§Ø¹" : "Deposit"}
                            </option>
                            <option value="deduct">
                              {dir === "rtl" ? "Ø³Ø­Ø¨" : "Withdraw"}
                            </option>
                          </select>
                        </div>
                        <input
                          type="text"
                          value={ledgerReason}
                          onChange={(e) => setLedgerReason(e.target.value)}
                          placeholder={
                            dir === "rtl"
                              ? "Ø³Ø¨Ø¨ Ø§Ù„Ø¹Ù…Ù„ÙŠØ© (Ø¥Ù„Ø²Ø§Ù…ÙŠ Ù„Ù„ØªÙˆØ«ÙŠÙ‚)"
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
                              ? "ÙŠØ±Ø¬Ù‰ Ø¥Ø¯Ø®Ø§Ù„ Ù…Ø¨Ù„Øº ØµØ­ÙŠØ­"
                              : "Please enter a valid amount",
                            "error",
                          );
                          return;
                        }

                        if (!ledgerReason) {
                          showToast(
                            dir === "rtl"
                              ? "Ø³Ø¨Ø¨ Ø§Ù„Ø¹Ù…Ù„ÙŠØ© Ù…Ø·Ù„ÙˆØ¨ Ù„Ù„ØªÙˆØ«ÙŠÙ‚"
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
                              ? "Ø§Ù„Ø±ØµÙŠØ¯ ØºÙŠØ± ÙƒØ§ÙÙ Ù„Ù„Ø³Ø­Ø¨"
                              : "Insufficient balance for withdrawal",
                            "error",
                          );
                          return;
                        }

                        const isConfirmed = await confirm({
                            title: dir === "rtl" ? "ØªØ£ÙƒÙŠØ¯ Ø§Ù„Ù…Ø¹Ø§Ù…Ù„Ø©" : "Confirm Transaction",
                            description: dir === "rtl"
                              ? `Ù‡Ù„ Ø£Ù†Øª Ù…ØªØ£ÙƒØ¯ Ù…Ù† ØªÙ†ÙÙŠØ° Ø¹Ù…Ù„ÙŠØ© ${ledgerAction === "add" ? "Ø¥ÙŠØ¯Ø§Ø¹" : "Ø³Ø­Ø¨"} Ø¨Ù‚ÙŠÙ…Ø© ${ledgerAmount} ${ledgerUnit}ØŸ`
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
                          ? "Ø§Ø¹ØªÙ…Ø§Ø¯ ÙˆØªÙ†ÙÙŠØ° Ø§Ù„Ø¥ÙŠØ¯Ø§Ø¹"
                          : "Ø§Ø¹ØªÙ…Ø§Ø¯ ÙˆØªÙ†ÙÙŠØ° Ø§Ù„Ø³Ø­Ø¨"
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
                          ? "Ù‚Ø³Ù… Ø§Ù„Ø§Ø´ØªØ±Ø§ÙƒØ§Øª"
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
                            {dir === "rtl" ? "ØªØ§Ø±ÙŠØ® Ø§Ù„Ø§Ù†Ø¶Ù…Ø§Ù…" : "Joined At"}:{" "}
                            {new Date(
                              selectedUser.created_at,
                            ).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      {/* Plan Selection */}
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-500 px-1">
                          {dir === "rtl" ? "ØªØºÙŠÙŠØ± Ø§Ù„Ø®Ø·Ø©" : "Change Plan"}
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
                      {dir === "rtl" ? "ØªØ­Ø¯ÙŠØ« Ø§Ù„Ø§Ø´ØªØ±Ø§Ùƒ" : "Update Subscription"}
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
                        {dir === "rtl" ? "Ù‚Ø³Ù… Ø§Ù„Ø¯Ø¹Ù…" : "Support Section"}
                      </h3>
                    </div>

                    <div className="flex-1 space-y-4">
                      {/* Support Notes */}
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-500 px-1">
                          {dir === "rtl"
                            ? "Ù…Ù„Ø§Ø­Ø¸Ø§Øª Ø§Ù„Ø¯Ø¹Ù… (Ø®Ø§ØµØ© Ø¨Ø§Ù„Ù…Ø³Ø¤ÙˆÙ„ÙŠÙ†)"
                            : "Support Notes (Admin Only)"}
                        </label>
                        <textarea
                          value={supportNotes || ""}
                          onChange={(e) => setSupportNotes(e.target.value)}
                          placeholder={
                            dir === "rtl"
                              ? "Ø£Ø¶Ù Ù…Ù„Ø§Ø­Ø¸Ø§Øª Ø­ÙˆÙ„ Ù‡Ø°Ø§ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…..."
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
                          {dir === "rtl" ? "Ø¨Ø±ÙŠØ¯ Ù…Ø¨Ø§Ø´Ø±" : "Email"}
                        </button>
                        <button
                          onClick={() =>
                            handleSendManualNotification(selectedUser.id)
                          }
                          disabled={isUpdating}
                          className={`flex items-center gap-2 p-3 rounded-sm border text-[10px] font-bold transition-theme disabled:opacity-50 ${theme === "dark" ? "bg-[#0f0f11] border-[var(--border-main)] hover:border-accent/30" : "bg-white border-[var(--border-main)] hover:border-accent/30"}`}
                        >
                          <BellRing size={14} className="text-accent" />
                          {dir === "rtl" ? "Ø¥Ø®Ø·Ø§Ø± Ø¯Ø§Ø®Ù„ÙŠ" : "Manual Alert"}
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
                        ? "Ø­ÙØ¸ Ù…Ù„Ø§Ø­Ø¸Ø§Øª Ø§Ù„Ø¯Ø¹Ù…"
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
      title: dir === "rtl" ? "Ø§Ø³ØªÙŠØ±Ø§Ø¯ Ø§Ù„Ù‚ÙˆØ§Ù„Ø¨ Ø§Ù„Ø§ÙØªØ±Ø§Ø¶ÙŠØ©" : "Import Default Templates",
      description: dir === "rtl"
        ? "Ù‡Ù„ Ø£Ù†Øª Ù…ØªØ£ÙƒØ¯ Ù…Ù† Ø¬Ù„Ø¨ Ø§Ù„Ù‚ÙˆØ§Ù„Ø¨ Ø§Ù„Ø§ÙØªØ±Ø§Ø¶ÙŠØ©ØŸ Ø³ÙŠØªÙ… ØªØ­Ø¯ÙŠØ« Ø§Ù„Ù‚ÙˆØ§Ù„Ø¨ Ø§Ù„Ù…ÙˆØ¬ÙˆØ¯Ø©."
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
            ? "ØªÙ… Ø¬Ù„Ø¨ Ø§Ù„Ù‚ÙˆØ§Ù„Ø¨ Ø¨Ù†Ø¬Ø§Ø­"
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
          (dir === "rtl" ? "ÙØ´Ù„ Ø¬Ù„Ø¨ Ø§Ù„Ù‚ÙˆØ§Ù„Ø¨: " : "Failed: ") +
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
            ? "ØªÙ… Ø­ÙØ¸ Ø§Ù„Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Ø¨Ù†Ø¬Ø§Ø­"
            : "Settings saved successfully!",
          "success",
        );
      } else {
        const text = await res.text();
        if (text.includes("<html>")) {
          showToast("Blocked by Firewall (403 HTML)", "error");
        } else {
          showToast(
            dir === "rtl" ? "ÙØ´Ù„ Ø­ÙØ¸ Ø§Ù„Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª" : "Failed to save settings",
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
            ? "ØªÙ… Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† Ø§Ù„Ø§ØªØµØ§Ù„ Ø¨Ù†Ø¬Ø§Ø­!"
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
      missingFields.push(dir === "rtl" ? "Ø§Ø³Ù… Ø§Ù„Ù‚Ø§Ù„Ø¨" : "Template Name");
    if (!selectedTemplate.subject_en?.trim())
      missingFields.push(dir === "rtl" ? "Ø§Ù„Ù…ÙˆØ¶ÙˆØ¹ (EN)" : "Subject (EN)");
    if (!selectedTemplate.subject_ar?.trim())
      missingFields.push(dir === "rtl" ? "Ø§Ù„Ù…ÙˆØ¶ÙˆØ¹ (AR)" : "Subject (AR)");
    if (!selectedTemplate.body_en?.trim())
      missingFields.push(dir === "rtl" ? "Ø§Ù„Ù…Ø­ØªÙˆÙ‰ (EN)" : "Body (EN)");
    if (!selectedTemplate.body_ar?.trim())
      missingFields.push(dir === "rtl" ? "Ø§Ù„Ù…Ø­ØªÙˆÙ‰ (AR)" : "Body (AR)");

    if (missingFields.length > 0) {
      showToast(
        dir === "rtl"
          ? `ÙŠØ±Ø¬Ù‰ Ù…Ù„Ø¡ Ø§Ù„Ø­Ù‚ÙˆÙ„ Ø§Ù„ØªØ§Ù„ÙŠØ©: ${missingFields.join("ØŒ ")}`
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
          dir === "rtl" ? "ØªÙ… Ø­ÙØ¸ Ø§Ù„Ù‚Ø§Ù„Ø¨ Ø¨Ù†Ø¬Ø§Ø­" : "Template saved successfully",
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
                          ? "Ù†Ø´Ø· / ØªÙ… Ø§Ù„ØªØ­Ù‚Ù‚"
                          : "Active / Verified"}
                      </>
                    ) : (
                      <>
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        {dir === "rtl" ? "ÙŠØ­ØªØ§Ø¬ ØªØ­Ù‚Ù‚" : "Needs Verification"}
                      </>
                    )}
                  </span>
                  {settings.last_verified_at && (
                    <span className="text-[10px] text-gray-500 font-mono">
                      {dir === "rtl" ? "Ø¢Ø®Ø± ØªØ­Ù‚Ù‚: " : "Last verified: "}
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
                              ? "Ø§Ø³Ù… Ù…Ø³ØªØ®Ø¯Ù… SMTP"
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
                          (dir === "rtl" ? "ÙƒÙ„Ù…Ø© Ø³Ø± SMTP" : "SMTP Password")}
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
                        placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
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
                        dir === "rtl" ? "Ø§Ø³Ù… Ø§Ù„Ù…Ù†ØµØ©" : "Platform Name"
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
                    ? "Ø¬Ù„Ø¨ Ø§Ù„Ù‚ÙˆØ§Ù„Ø¨ Ø§Ù„Ø§ÙØªØ±Ø§Ø¶ÙŠØ©"
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
                  (language === "ar" ? "Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø­Ù…Ù„Ø§Øª" : "Total Campaigns")}
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
                  (language === "ar" ? "Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„ÙˆØµÙˆÙ„" : "Total Reached")}
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
                  (language === "ar" ? "Ø­Ø§Ù„Ø© Ø§Ù„Ù…Ø­Ø±Ùƒ" : "Engine Status")}
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
                        `Ø³ÙŠØªÙ… Ø§Ø³ØªÙ‡Ø¯Ø§Ù ${targetCount} Ù…Ø³ØªØ®Ø¯Ù… Ø­Ø§Ù„ÙŠØ§Ù‹`
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
            ? "ØªÙ… ØªØ­Ø¯ÙŠØ« Ø¹ØªØ¨Ø§Øª Ø§Ù„ØªÙ†Ø¨ÙŠÙ‡Ø§Øª Ø§Ù„Ù…Ø®ØµØµØ© Ø¨Ù†Ø¬Ø§Ø­!"
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
            ? `ØªÙ… Ø¶ØºØ· Ø§Ù„Ø°Ø§ÙƒØ±Ø© Ø¨Ø°ÙƒØ§Ø¡ Ø¨Ù†Ø¬Ø§Ø­. ØªÙ… ØªÙƒØ«ÙŠÙ ${data.compressedCount} Ø¬Ù„Ø³Ø©.`
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
            ? `ØªÙ… ØªÙ†Ø¸ÙŠÙ Ø§Ù„Ø³ÙŠØ§Ù‚ Ø¨Ù†Ø¬Ø§Ø­. ØªÙ… Ù…Ø³Ø­ ${data.cleanedCount} Ø¬Ù„Ø³Ø© ØºÙŠØ± Ù†Ø´Ø·Ø©.`
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
            ? "Ø§ÙƒØªÙ…Ù„Øª Ø¹Ù…Ù„ÙŠØ© ØªÙƒØ«ÙŠÙ Ø§Ù„Ø°Ø§ÙƒØ±Ø© Ø¨Ù†Ø¬Ø§Ø­!"
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
                ? "Ø¨Ø±ÙˆØªÙˆÙƒÙˆÙ„ ØªØ­Ø³ÙŠÙ† ÙˆØµÙŠØ§Ù†Ø© Ø§Ù„Ø°Ø§ÙƒØ±Ø© Ø§Ù„ØªØ±Ø§ÙƒÙ…ÙŠØ©"
                : "PERPLEXTA SYSTEM MEMORY OPTIMIZATION PROTOCOL"}
            </h4>
            <p className="text-sm text-gray-400">
              {language === "ar"
                ? "ØªÙ†Ø¸ÙŠÙ… ÙˆÙÙ‡Ø±Ø³Ø© Ø³Ø¬Ù„Ø§Øª Ø°Ø§ÙƒØ±Ø© Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…ÙŠÙ† Ù„ØªØ­Ø³ÙŠÙ† Ø§Ù„Ø¯Ù‚Ø© ÙˆØªÙ‚Ù„ÙŠÙ„ Ø²Ù…Ù† Ø§Ù„Ø§Ø³ØªØ¬Ø§Ø¨Ø©."
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
              {language === "ar" ? "Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø³Ø¬Ù„Ø§Øª" : "TOTAL MEMORIES"}
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
              {language === "ar" ? "Ø§Ù„Ù…Ø®Ø¯Ù…ÙŠÙ† Ø§Ù„Ù†Ø´Ø·ÙŠÙ†" : "ACTIVE PROFILES"}
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
              <span xœì½ksÇµ(ú=¿¢g[`6‚ )+Œ(ER2OHJ—¤’xëª¤!0$&0ÈÌ€0¬Šd½¢}ªní[çÓ®sî®ÄÇ‘,K¶eÙq”_~Í/8?á®µº{¦{¦{ ”â‡àÄ&Ó3İ«×»×£ÖtÂpÅi¹3…ÈİJ»M¶é·£|	œ¿Ygt}+pöJ?«TXİ	nMÓ¥†¹îªİòÚ[¥ÈÛjD|lè´ÃÂ¹±Ôg?Ü#·µ9Qx¾Üİ ü•5–İ–xnÈÎŸg•ƒÔ¨³caÇiëÏQo:;V÷¶ÕßÏÂwVK–ål„~³3İğ£Èo•*¬énFğŸ 'ÿm”ÆÙÆ®°î¹0ûÈ/l3€[ammx} WÙ¶çp LU*cãw)?Î¥æ!¾şH•2Éd~û7;¥Ó,ğ»íº[/5·`šAİ=Ü‹<¿]ŠnËe?Ù×€À/ÎÌÌ°nI!·ó¬ kºöÎ¸ÿÔ®‹§òœœ®¤GLÓ¾©êİÕŠvëNİß)µê,p›Näm»ÌßvƒÍ&\lxõºÛf[°ÎÍd›òög³éî2xi+,Õ ’°ôßtÃÈÛÜ+m¸Ñë¶S˜tB} !cØâ¨×rë^·¥à,lëv:nPsB[w<X`G÷›N{«ël	À:AHØÃ{½§‡{/{ß°ŞãÃ»‡ö>…ÿŞî}ÂğËá]Ö{?>î=É //Ì®°+«—/..-°ù…•µÅõ
:Ú›şì\§›z\èığgüLšfÒ°!8Lh[JÜ-NÂNA®]Ï ¾ˆ±sÃĞ^+*M2eƒ7`š^ÛM~¿éíµ·ˆ3 „‹i&`Ür«â‹›¨0§íµœÈ-uºÍ0ıNü”ËåAØìÚñftòÌÓ­4ÕYç~Ò¸Ğ^Ú~Ğrš:½ŞÎ€ÖkcÈ²³Ï7€ì;Ï·µ/âÛşØOÙªë4a³€óÎ{ÎVÛFUÙ»l¶F|p@
dkn…ìŠÓv›ì§cråûõdØ¼9ìİwÜú^
	€tÍ-:)y _¼!ÿ¸¶íÅR‰¹Î:¥‰´Ğèû’-§Sªf0?=n§T-Oæá¿åvlv›MDDÁLc¦tA/ñÔÆ¤• à‹3“@ÃMï=í}ÕûìğQïkROÈ³ç½‡’4ë}ÿş°÷¤}}~øˆ—¹/t77P
â!,?U,´·€Ù³÷h¢F†5kL¦v)¬#oœ‘ëí†BKğÛ>Óe#ç${¥q	pyuvKUÖÙ+U’m7;EÜe—ÖÀŠ™_Z~İ=€gÂS‹Å6sígŞW±¦×ò"6ÃR¯8_Ş -Y¢Ÿÿ{6Uù¹å	5X>A“0‘9ÍX¾ÀxëğN/;Q£L°)ùÇøÔFØO u$;ÜÛdE|n†©ŒˆR'êíŒøn Ò)¾ÅâO‚…
"˜0n63£İxB²F™I“¼à{ªZå@“p‚SlÀKjnt+¶ğ8øÙ•öÍÍ­.®/ÎÍ.ä=½ÔˆIø1lCöÊÆL½ÎqZ z±5ñ—ìæ$?ı3¶‡kıwçéáıŞ“ÃG‡h‡~5»º²¸réõlPô…=(ÓŒ	Cùš…¿úãp;`ûÙ¹†[»5çµ¦[U ßÆ ©^œïô^Œß_˜]Z?m=åC8ßƒ‘âHÚüJ«¦)cë‚+>h%^ÍAõ‹Í6İ ô>â  ê€ÍÒâ·ØÔ \Èz#pÃ #ŠÆuÿh2kï–ËÇ†Š–Hï4	>üW©æÂ¶¦éïÀßP#& ×sU'Ü”	†ÿW•É-©!Ç’tÂ*ü3y=…	iUËf±œ”¾(¤ Y¬dO©¶ËÎ®5Q%
%r>ĞMWã>Ë—KUèlM¿vËHnò
”´'¤‘3®±=¤‹ƒ÷
.¼ˆïù´º¯{Ÿp1á·7½­.Ø¢MÀ?0œ¶ ò	š¬EÙ˜pm|¼³{=åmI–.•«×mdçÙMZk
ÏiµzŸLóï>äßÁjú;ñ•ü^ á	¿6À|T~¾i|ë4»)L:µpš-­ş><ÏğØAAkÒy—6º`·Scıö\Ó«İšÙçbèF‹a<‡e¿î4/wÜv1
ºîH“øùòs…Ô[ÔÆ69‡’KÕŒŒ½.ªg)EH0fA¯VŒYdr­„~Pêøİ%Ê°¥£Iœ)ºŸ4Ñ=íƒÕ4zÕûí.3 …¼\¦ŒŞ»1¾}¤ŠQÕçZ¶ªÍ¯ìE¿ Ócn }¿:ezÏÕà&D[Z÷Wß1¦N;1´ç¢²ix*èIeÕP«”"“)¼îkLVÓá´ÆÓğ
Ú‹')¥¦¹éÔİ’×N¤ª‚õ&š#eùëéñ6,¥jÆ¥!ÁQ­è–TØ¼ö­R…µ"ÒS–ŒUÙ&M8*P¤Ø%Qq¿I@'³·¾&–²yP,Ü)«§(/³)òò3 œ“”wOAX}ÂìãRdÜÓŞ3`@{_"ø0§ÇŸgXŸd%RŠıØ,øä ´1ÙìÒÂêú4#æ°'==»5×E¥L(ºÙ÷Í9§æE{?6ÈÂzV;H®Aí¨ Ú!éSÑ´ŒÖIlûô·iÏ²Én÷á¼¸s™°tyvŞbôõ_pÂÃ“š(Zïeu¯‰
‘è8kºtÀRÂ»]£ó*^ú0è
È
8ù5ê§L9K£èKÀåÇ‡w2¸ú1 äsLĞ.3Âøì?2Àç'½Ï{bhú‘–÷uúQ‡·á^PƒÿÏàî²üŠßò¤÷úòÓŞG½O9]½¢WÃ4_àÎñ{iÖHgH@å<ú êd€'W¬á„ œZPÍ¶šÅM“DAJ‡5¿Õ	øAó€ÕGlqOZ|¸™7òÜ³±	cÛµ=¢Í–­Duv¬3$7µÿ`Ô:ù'Ö=N»Şt×Z oæÄŠÌS«{!Ú!õ™}/”wNšoÖÕÓI$èªJğ±>ŠŞÓ9€¤zƒ¦«˜±³°}!~Óª¨\È´ÏˆD‘˜wA_¼á°3şª»‰ÌtnÇä”,hò”\ş1]Æ/ø7§3À,¬<6fuY¨—¾şùğ>1Ğ5Ú)mVü¡]h&e[şbÀô”Gè`PõTµOT;È*5T~E×QùµŒ–š ¥ZI;–SšjÕ”{$ß*¦¦*¦±Ã‰%©é>)W¤°WôÓ”'EWOûj§Â¿VKW…µÒÔ[¤RúuRí´BAÇ3­šß*¬o@aå0îUÀ»/›ïK4üß‡wğ–¾ê½Ãï#Ò=€ú¨÷E–z—ÔoÁü-VA?Õö1*· ‹Â WH0^ö%ÿr´jxıŞ¿¨Ö¶£~)3 `:‘uEø]Ôl“µ8mµA^€&Úr@ÿÿ3¿y5dÕñÛÀ¬ÂØ‚?X4Á‰—”.½ÕK¿ÓziVıçª¢B¥lƒÚ£ŞÇ0s·¯Îğ_¨†À\[õéäk•pjRÇJ=}ô”CDó	be³²9>ŞçqÀÀøp‰ÎÑXk–-Û9 [Ç/w@<<ü#m²`—Ü}.U³'ß6Cmô4¦Rüä ÄÔ <![vvÍ‡	}Ã¤¾µ›ƒ»òŒôøLå>(•ßà}‘ï	m%¶òøÛ#3›áĞÅåûÎ—›n{+jP,ÔA<6ÈpÔ3Ğ;1<t åÜÎ±ŠRjB‘YEUkrÈĞ¹v›|ívŒíÜ‚.õƒzô)KãF,>Æ_Ìx£ ¡íVLÊœÉ+Üîì–¥É3IöÃ^Éé‚”À·È ¤$ğf×İ=Ø.·œN±òoÓ`ïÑq¡1'{Ëİ›Ù·—½úAÊÖ#+2Ñ1“;“vCdÂ@úÆìæY«iÀFA·]COé°Fos-ÿ
”>ãÉ¢>šsröÀWä["/jºÈ7N]mÓßu‰{§ôzak&ˆ¥Õ«çï §âÑ:Y—±ã$Ö/s¬ªüçŸl1X	Yéôd5"ó–ØÇ“2@QÿÕäQç[$9ı‚Ñ8<Ã³íî0 VWRd¹Û©Ã×ú')Gş’_sšîº×r×"˜áV:Ìl0 å[<øŞêÁÏP–~ú"¡ŠwÜBl0ßGÃÃ)]§2%€À1S2˜T+G4{ø‡Èo¦¿! ÉáƒŞ‡˜¢·hf ã¾$0ŒûBŸŠò¶³Yü×álì‘£¤› )”jr1°yÜ=¶¸í:»¼Ú¶Fìt…-{í.]ŸøGMi9Í:˜Y&0#L}=nâá·J3Êœ¶‚¥ó9\¸ÇÒç*6è3r×Şe½?Ã/p#zŸÒ=‚_?Q"ÓşS{7rDjp?ØH
#ëcÇæmeŞÆ)¡`YÆˆ²»r7cxYïÓi¡˜’/ez¨fœ½Ûtk‘qÛN³.àO^DØÀ%3ë ÑBcn/º2„pUX\é¢/«è–#'Ør£2=?Ë#øGh®JÉúªQù
§}*Å…êGWıçµn8íw#”C ÔÛ®¸¤‰•l&.d÷£Eç(H±Sç¦ÀFä1^987^nÌŒ™ÈÈD83 'j`ÕS•úš,gŠ))•ë0Á–{†)#t6Å9ÈdÛá‡‡ E1è«Ü­-ì/ğ&`À££ÆLù_
¬áb
ªøf€ÜÂ
"@ìÈ™¾vbhÜ0PÑ¶¼öÌş>‹üÎ4›åI­Ó¬Z¥4×iVÂ?yê+ÜÀŒ›:/qCÏi_B†ÜrçŞt4S˜`quf?I=…ôv
˜Ó©wªõj}¢r
xÑ©wÜ)÷=wã”Ååzö×³»^H+úØ•Ü²>ÿYÍ™p6ùÃOo¼W=S‡#ê¬Å`ğŞBpÍìo:ÍĞµ½ûz÷zÙºï7#¯ÃÌ5=xh´‡zä¾ù&Æ6@¶oÚÏùMÓêMsæ‰·|Î›ô95j}"ñ«¼§M¼79>5®íåhîÃVºœ:ÓÙµŞ*A·Wsî«åÌL¬f6>>~¦úŞ)ãSL«7ïn¤VÑ^İ3À@'5ŸüH<®sÍÆr›@¹Â;ã•3gÆsïúñˆıjyÊ¸x§!ÊlzÍ&A‚	;`›´¬1î	šçCáÎÓ£Ùğ÷kX¤L	ØÊPÀ^Usí Ş›ÙŸ¬X&ƒÌİœ„O.È^5Él·6·™Ck$§™¦}rB½8ŞàLå_äùë=©Œ}D‡ $¼Äß¥ç?	ç·“£Ü¾Èœûbò¯Xoêø\÷€z€uwİï¬¢D8e1ğn‹eQVzäÜ`~lã×Ä Dã]C ŸÈœ#xAè7½:O–»è-qÉUÌ>­üÁq‹ä–>¶ğÁ@e”¢ñA¸+CÎÿ0gFx¬rzøÒ}¢#¸ısŒ3Íz_õşN	0ˆ Ì•Ï%Á< +óv<ë«‹—.-¬²åÙ•Å‹këì]úóÊÕ¥ÙõÅË+Š}ÃÓş“¯CVN™wZX~ Oi‹µúÒ â(oÖ¬´ÈT“àØß?ü#ç[_ Q^©ä„¢®àÛ`±g†¥†W—¯.³Ù¹¹«Ëb'ØÒâòâ:+®¿¿º°öşå¥ù´í~vŒ “‚˜×îtÓö&—³m²Óï†I‡^¥~O[™éƒ%sá"%µœİbu”uœ tÁ:M[¤”³4’®©`O{Û¿)€8–#åx´šèÍ¥ƒø7{(èkª’åL)s)l¥µ8ó‹µàGò-ıô6±£•#fÃhÎÅäYpŠéÜ'=ü ÚÓimáæ¸ÁLÁ-o•A¾¥GµÀÆ)Ts
HcÄ2ySI¢É	İ¸Oïa~ÀŞ7Œ|1äÊŞ1NDè;­@úÈ0÷ş„?0ğ€^5™ø9Ğ'æÈ›ºüèğ!şs/ÊFš¼ø57Y'ğA…pC2(@öbĞMÔ #GÄ\ jsø%Ã¹A9C¬ƒ|ş^±DÚ³‡ÿqx›©»Å«ÖàVôŸÁ.ãÀFŒÁ¾ğë+K‹sÀø®®”Zœ_XY_¼¸H²âå+Èg—Ë
éÀÂ‰U]İ`ñh¼PŸâ|åÀ%b,ıßóc[£¬PxËÿy\pêŸÊï€	Q%'•a=Ç£$FQ§/z9RŠš×{…åÎ‹Rb–Òyİ£8T+³¤…8şğ¾™ã-¹Î6@pÚ·x>g€èÈëeP)PÖr¢Zƒ³A—ÕØ¾ÀsÄğR ÏÏç§¦«İ¶f£¤7Z=.…{Û†£RQÙ˜´l ½ÓD{êÙhúd49çLÜ¬“¦øÒÒµÉÄE«”ÃzË¤°X®UnTnŒOuvo[Nq|êôèøé‰Ññ÷¦F+åñ)0,ødÔÛ«–Û'àîxªb qİ£"¥¾Ç`6†¢$Ñd8ZCÉ®áù"œà«òİØÄT|˜(€©´šË¸Ñ<­bQ ÄBO"¹‰¼€ÅáírÙ@FøRš_\[_\ZZ\¹Ä––/¯..¬áí¦Z™ĞRcÄ­PHÌ^YMÅìMq6IÓjŒ§!`)òA­œKTÃöğ‘š¿^˜»º¾Ø¬sÌ--Í4W²–w0~Í–œíF>â[=N›kºN»Ûa« zÑ—.%ùÖ[ÒÇ[R}Ş’¤V"&@ı-F6=Çù)Å?îı‹'Ê]__’›:’ØìÕõËË³ëólîòÊúÂ¯×ùíK³+W¯°ÕËW×W2^”ø[ŸLÔ×Ñ4¬k(qÿ !¡ô†Ï]JÒÊÄ\’—B‰Óü;Ï´ÖB|ŸÀŸ{D¦¿Hÿ,.×˜ó¯¬ü~H¿üI„|*1rSÊ°.ÖAL‚¼v^g.(ÍÌks:Q[q>vØmµª~‚˜V9ø£RA	æ{4´Œ^éQT;aîæ¦Wó0[»¬mYçÈ~¯ê÷Èï¥”·ÂÄ}ÔXyá
´êbtyæzåwH2ò‚£‹+³së‹¿\\ÿ€v$öd±âüìkƒqÆ 
i«EÍyg/;g
–Xç·-N©Q6^É†J¼µ¾NÄúÊhh1…÷
çŞc¸9¬8»µEáÛîˆ-D"5x|ªpn|J_‹€{8A}ĞÁ`¾MTÄàÕ¤šÃ ãA;-Ç/ìFCşş™<€E?X›bBNØ¢ÂB/Ï¤¢[^§M%DØ6‘7†İ¨éÆv¸2Hä¿Hw0‚½øYj@Œ!4õ(VÚ°–“„æk6dÉ7ÅvJÕÀÚxÒ%³Š…yR¯®^BKHˆƒ©9½‹ÃvHÿÌ)'™³"ÅÙ’§6Ê«WWb5Ğ®æ¬ì¤­Š)g2Lœ½ïvsU~`FÉĞ•êf…×øÉt×ècVËsÇ¿öş.Zšà¡†Ì8—Z”H ÌÓ¤zQÆãëË³«ë	_^¾JÚ?¾ËŞ_¸ºŠŒ9¶¾º¸¬atº&üÀ•¤-ˆ<ç`Ü€˜{OQ"ÙÊ"Ÿ•Wñ]ÂP«n½K1©õè‹i²{mvÛ7TœãšOÉñû%9rãhñÏyô7¿D»Mõ	P	„X%ÿ'p|ƒnø/Õİz”Ÿœ§šx”#Km=‡7Cï‰…š™±eù¾> ÃµOx0Âgø>É:E 0sÍÀÙN§¹ÇšQ³C±›¬³0µ˜tˆsÀf‚Ê‡qÁ¸Ã!µaMR¯¤nD†˜9">É¶ñ†š¸YÛrpƒĞÎ]2æŸA<)h D ••¿UÀTØ¤8J¿*
õâŸ¡{õÓ¼Lâ@ê]13İk3u£:­—û(À¡”8}á"‡Ó¤~õW¾ŒR.£zIÙË¬şKÓy~Zİê£]Íïµp¢U7ì6#¬ÿK7HJËŸåâ\éÓƒê[q1³V=)f÷Í>D›ÌøÕR–ïÉªfŸëRÏò§ê!,ú‰‡Rº$ó”äôˆ‡ñÃükuáÊåÕõŒ×,Óœg]%2´|t‰tP}GDÖ€è">×gcšrúª…½ ¦õ4‰Å¡ZJ\Çø4ô7¿âº,¶æÓCHH11ŸZÏvë^DGÑ[nÛèhcpJ"^œZE¿²ªAü¶ë4ñ×·éï;Z'n°(|€ç;@wi·î‘"RB×	jÿ«ë{ƒx:×’ÛÓ‘wCù7;ÍêæA"àNŞÕ)‘ó;îàÔÃK²kä¸”–>Ç¯(bì¹{½ÿJ7ò“ÏñOZ#İéì–óg´é+w”¹-ÇkbdZ¸×¨¢Ä®Q ¯+£#ışÍ¸ó_äó*ÔøoBOÕ¿™Iˆ:noe&Õ«²‹ÃPş™"\ö·mÏİ¹àïÎ*¬Âª“ğ¿ì=2á!.}ßô3{aĞs:NÔ0 š?ÃökNX ‰iC’û~ãcœeŸyrJ:“ê3…åê8«7K§K§[ÕÒ”ó{<>^Ÿ„ÿòo•qüò»ìU`/”Kß‡]QîÖWİDq…ÄõJJ±ÎWòL•Ni¼ÊñJ\8BÑ¤º6b.Ö/İZÁ•İÉÁú¸NdOåŞ#E“©–§¹d—•ç–„GGC)Ì¨šá3<C¾’÷qï/½g)-&næb”Ä+¾4¶Áö¦DÑ¦¿’ww}¤ìàšÃŠ>Æ2¶Gßa\ÊGÈ\S‰ŸñèTÙ¼GØ ÃD±`¡ÈWä´yÀd­rTÑÓBº¢z /É!£ç	$Q{fug‚—ë\­h“şÓœÚt±}ÈÇÅGQà:-®û8 Ô½ ÇKY²ºÁş„¬4<˜$¿¦íDÛéöé´7/Í1¨ZR@_Œu’RíVù‡j&ñAÔ¢<®›6¹¦†6¹äG¼&ìÖ0"Òp¢Õ ¿QÓZ!è®‚ñ©¢ı*U`Z–wpİ&yş[Ù•éã/!î×2•?5~Ÿ25¼P%-1;0«n\
`cĞ5ö0Å}X­×*á»ÂBBıËcd N›¨Î¶¤k¾#ããûTÛ
[CÚÂ
ØÄg±pR^ƒüªËRüWMİ`ó%cò¹º8?ÍŞéÇLú¯dˆYYáFUàsK¡àGäjö¶B§ù¥„ÀJ3–™1šÓßœÚ'£]G·˜@Ü#ÛH‹ƒ¿9¿M°¥:yU×MƒLşzõ_5*°Ê¯ø=lõvY÷;¥ÄjXşxà¯˜%³¼øoÜ}´67k•áWÜ·–îÌ¹0“yÜ§k úé	ÀÔ»Ì¾´~l‡V`ÿøÿşËmŞéÆyN»íî{ÚùÅÜsÌ=¦…¿']…‘™ÎgYÎ9P\ÿ-On(èr !µÂx³Y‰¥à8ÂÆrázÀûiîíã•ŠõwkY@Ærz«åáVæ¯Î-Ø«ø \¬ÜÛvCvÁ©o¹VV»¯k²yÕÃ3JCßB^F²SÈÛÍ£¡5ÆŒ›è§mdoÇßêİ€În°øUáò	ÏZhó10æçñ¡ÛÒÂú79·ÜúwDöÔ¶¤ocÅ×»)â-G†øíŞW‡w	Şg—
ls-7s‘-õFP}cÈ›[ÙòMk#"šX6t·ZˆŞƒêV¶ˆsûˆ~‘ç¶0ó“ëR0u¡Šš¸?æU$ƒÄEóŒŞ”VÖß_X[ü·…y¶¸²¾°Ä.ÎÎ­³µõÙõ…å…•uV\]X»º´	VWà•+o)Öş·]?r­ÑéÓ–R˜Ø›‚•¥Z®0Í%("$ŒnùĞÌçŸødyş™²œ²È‚}uSÛ¡³^gĞş˜¬/@~ìèö?üOI¦uI8Ztğ?ü/ë¦&w4qÌ#º©€4§Ğ&¼ú[H¦ıK‚¿ÑÖUFãç –Å9ÌÀ¾åT)yK?ÜÀ*š]{ñ—@çK—fç>HúÚ‘;+õq_ü¶`SşÆ>~HkåŒ#Ğ
ñWµuæùœËäs•eMdˆ5ãP”ÿL³-^–ât¦,Z‚•ÂZà7›NÇ &ñÚ[R<ßÄÛ&ÊÛÆµÇœÎ+y}ŞfÆr¨ãï(óê»ÖŞò“»×ø!_;<)ÏhÕkÊ¦¤qÒøƒ»"YÔµ‚®Òq~	şÊ…qû—›oTç::l…ró½zÃVì¶¨÷¹ŞAÍABT…$§èğS–Bì‰os,óV¶ç‚ÀXİŠó(ûhÿi¿`óHÌsiğïª¸ã5e+\^:¢¦Vj0%{Ø!5@ió‘T4Ÿ~8ÇàeÂøVü(	Ú‹kW…¿ÇSHé‡e¿îhê°dİ¿Õ/wÜ6FèÆwĞx5™,Æüú!FíÈ EÃıEª}ª¬Q„-,ù;3z·Äôï{[™T›oååkÎ¶ÇÃßÉb’»¤ÜV*ğ;!·¿`§]5x˜®¬õŠ7ëÅÛ(;¾SkÇû4òóüüG?B‰ØYs£DDøKÏİa3¬ˆ¼‹µL#üWİFt0Íâ_¦ñÆ`£-“E`UòÒ(wPÿ
Ï'}X’ğ¸äô#>™Ï‰RŠƒL¤ºsüK‘:ñß÷YÜ^Îy”‚¯´“>Ê÷v”#Ö·]§ÉÅ€=ào˜ítDÎ¾$~Ë5|É
…òˆà—ë|:}Ü¢:²¼]™hüˆÙ@{ÈlĞÿ1³œ¶Úã\_>b¯oM½¢=Ô:RÎE½’7nšO8T¼åš6šp-³"õ	?mÜÌ/P@¥]î%z™—¹¾rWDíb>sM]ÌT²ƒËÄ›`ŒxÛ/â¯9c¶|«éÎ¶ævLZ¬ÓĞKé«}€š}J
œüÜ+5 [yWú§^˜dŞJ2İú'jppA¹Ğç=bìŒ0µÇ'Ïoú[ş°ÛNOÒÓ—â¯ê³ÏrL›3¼JyLjøËrêÔ[”kÃ¿J}`ê}›Î¶*o»¨^î]úÃ²T¶Ø{5hJ‘ß‡{‹ú ôşx!ÈPbèÄçùmß¹ÿ¹6Äõ¯vš¾SW*—ò‡G>¨Ë4jÿÒ–Â­£(_0]U6ò@c°R„§’ËqÔİ
øóA¼zü·¶Ànø”9lØL¯S¯äA2yÖØ+•Jl~qöÒÊeJ)|aéÊÂ*»xy•­}°V8[[X__\¹´ÆŞe—W¯¼?»‚ÆúåK—Ùìü´†HfåĞ`Üúl
éí4·ËÙë 5œP¿q”f³±9¬qqK^Ÿ•&§¢[È¾T²"}±Ä—(ä/î®f^Fj£˜Mæ§ÀuB¿}^ÅÁ9ş_	àÅ¡¼ãÚuã~*È7×pÉÄW.ĞO¿ØWİãég¤®ö%‚½vn^v#‹¼K:Ğ¯?E(±0ÈGN—X1Vè˜ñÙÅ(èº¢•kì1¹ÏüÙ ã“v/b›nTkcNÇsê-¯=†/(µÄƒ
£ñX$¾¨á×1ï½TáoPdìÓ>‘jø÷;‡×¿yè	ì¶Ÿì“Æxp“Èaq§Yo“aJeÿÖˆò2>U¹jš+ŞôÀ™¢Ò¤–ßÖ
·à®<—özxƒïõ¾Ä6E‡÷¥Çı	åßOÜrØŸû¶ÈG=üïe^7ó<—Y‘
º&t`y8ÏräGNó*ïÀv@Ñî½¯{/FÔFÙ |š/£İÄì¦¹ğdã“È‡ÉDk·‘›ÉâÁ¶Ù!NY Œ&0†ÏsñP0jÔÀd%lG¦q±°¬Íd“]e<'JVÃÂˆ¬\UØò‰É2–y
²æg½o0Nõ£Ş§¼ ÓÑö¥ Á¶Àí}\
¬³íıù”
oi…ˆßÅŠØ¦ÊX3¡#u%$ÏAt nÙ7ú8³˜ûjÚÉWçQÇ¢^!ÙÇh%Îî5*şgR«YŒq\Îh !Â]3EÅ/ƒ‘Â¢”'-YéYËwd`€ÊİçÔ6äm³¨0CrA_’}—SRäD¶9 gšöùÛÈ­ì¢_5vû1?¥ísæğŒb6âC~~ÿ¿­D•a¹m™À³îL¦¨Ü9¡1MüÑçnùøE°U<âß+¨Ígb†_SÖJ›&mMdÙ9DqÎÍ±	fùÛ.†Æ÷gİ¯…k§¶%gR¬Z¡]¾_ß‹#²ê4åÑğµ–GIòt+Ù'Um9sYS´A š”ÏµšCuÔÑR4şÖO‹¼ÒÅ]Æç™~Ê×'	³ËÑ(MS>ËÀ¬ªÄìG—L'.˜²À9¹D``béB4ñ•$Ì›Ğ_.!~¸Ú d£½:zŒyÏŒk×ÓÛnÂ¬“Ûu³€š_À¸2£ˆR™íï{VZs¿ ÃœN§)Xc¸Ÿkî‡@ñ­É¨¿fğ[»¼Ræ§·¹‡à¸Ïğ¿À¸öFNõ"oJä›Ã<)ÿ!°è/oK[¤î¢E!‰EBãÜ™%\Y‘7µ7 ¢H=^¸´n~¸Änl&!šF„7‡“ÚB¶Ÿ¸ LÂñT8÷rºhãõ^5ò?ª`3fN@-rg%€§ØI·ŠÎ4˜¸óˆ¤_ÃGŒ‘“mHÅôµQıèÀd¿/ÊOŞâ¨§.3ök}‰oè7/Ú¢¯ï1QÙC([,ëÊ/ñ&Ğ¤Û)—ª7;]òõJcù0:9w7¯]Ğä «OQ#-›ZWË©Ñ¸Ö/ñ3ìºÔUùAÿ]=ñ•×uÇgtò•\•»H‡÷+³Ë‹sTrœ,Ë³+³—xp)EŸéníÀïâ¹ƒ¿ä	ÿªr!­__»~®º‰v–Cçr8ËÑ®åëÓnİ‹äÍ‹`zÑRÓóÈñ5Ó˜8¤Aú‰µ‹ù ‰kš¨@‰/æœ@Òøø`e±µ•<@½:€Y î„Í HÁúx¾¿D“ÿVù¥T ä+ş¨ı~Fk$ÊÀYÒ÷óH/áş²ql¶^O#KômK#xÌhrÓâX–vÑ‹šî'È^sÛê5%˜*u·ú‹>F°§Ä—õ»ı­IŞ Ó¦äºã©
Ã4Cìã—%È/ÁQ3è6:ìĞÑÓä ‘•Ëe¼ù¨¯Çà$¹Ñ	Å¹`—­ºX¿Û“.l»íH™"8à[î.ş4ïn:İf¬(ãÏ?N3¹óeÚg“â[÷.|‚¨Y}%^’GÏ× Œó‚™ßçı	+ÂßŸ‚|k9Á-7¢ $^ŸŞÇğ¬6‰<RäD+R;*ıöQ)bò
Ü¨´<?1†òĞ3Ó;6°¶i43›ÊÍDlhñ7tÕaçÀÇôÿ§Ä˜°¼n²ïºª¸³/élf¡³}dw¨‰BTg£5EÁOF`åŠ±B:?¸.î6âò®n@å´¤°–¹ª2(O­(¾"çùf!0O¶x–™xuéäQxˆB)æ–%¡"Bcù@¬Ú€PÜËÂ¥¸Êà!Ÿ[M“†§cc¬vŸù”ÚXÊF—Æ÷*Mæäë{ÿE˜\¶çwYÅ;¼–.ã¾Şè2H£øùxÛ ;˜ŸP¨c:a¤¨ÌVãˆÆÅá_7ükì'û^ØÇ^²T˜r„à%í†y Z>p‚é˜z8²N¦¨Ğ&ßÖ“£IÀÂtˆ9Ï¢h*Ò¿Á.å:/jH’ıìûëËK‹X6q¡Iq¼ç2tJµ×:¤n­çË×*×,Ä‹:úáe¼ZÆª^ì«²Ÿ²ñJuRüg e ¶ù™(¼Me·Ñ=|Òá	‘'ü}øááC¤ËxoG¤Ñ*£
ß§*T±ï-o–ƒ ¡c¬Õ…em¸¬‰1ô ƒU—/¤˜L›|#dt(ÁøÑWxQ|MKŞPQï¶ëÅ&Cıyš~±O½;È‰l—fÈŞ¯ï@VªrVú¦ydñ;Ó¢CN)™üî»ÜIå‰¸ÁM2‰ğ"j¬‰^ÍÕg¼6šÒõµçÂR”iÀ™^€–óŠÅèªò$»nCoc|Ï2º‘UX‹Ù¿¬°(şşÆ,K1™„YŒ7…ŠSW4·:û«¥Ù‹KØjve^xhWæ~³g¯Î/®‹’»&GM-pvšòà‰GEªWò4˜
×^¤RhÉxå¢æe)À¢)dÓk×İ]ú«íó¿ÏéGóó—|‘™0§]2mfIô,êÓ_sWeˆå\öºáy0­ñJ¥\©üÀ{îêêB{Tà¶…ÍM·3‡©é‰¢Œ­åöáh&Ø6=àºê´‰±mÖTDì¨=VŸ”pVJ'%§Ú³ë^Ëü+Æ©<|éã£l¢R©dŒ[-äÁèI:jœË·ÉS$³:[„o7° í·­$”dîÒ÷;Aæ~±¿jÎÉ/É5Á‡ºşìërFÏÖÑòåú\ÕÓÓ±İKK¿”£«%ƒC„î4²PËş°ŒÎgŒÙ×Ú~"AƒRÆvÃ´y2°7Í5=îÖN¨MUñYh/R<mr@jÓ´Dœ¢„MfouˆËõè·%É5E9qóğ9Qı†L¾ß[¥rÃ‘×oxuf˜3`´G–lgR]ôç¨y-|´!}E’$«ğ˜‚:Ş›òXd“N”!”Hh¨åğa"/Ä>FÉ)ÆÈ+YÊ˜4‘Å±jª>šš–¨*d‚à…Ş–åL¦›gƒÌíN`¸]å=Óh¹æDéIÌkˆ\>”3T_†‰´SSÔÈn:æIö»ÄZ2kHÜ¦cvaúÇK¢SÏ¤œ‰…XiNœäZ‰Qi¼Oß¬`½:"ƒöê8-óIŒ2`}
tç§™éÕ!‰‹A–¬5şÉ?¶
qçi6è‘
ÿòƒ”2oS#Qi!&y‘%À4Ç•2@äéĞGé]šÖÉFÿÌÉÁá)tTÄO#}»MÃFòÔÁ£xG¸sDl`ÇÈ@Şuå–ã2yŠf'¶k-Ãd=îïÀmqÛ°—ÔÓí9ª°˜öƒÃ‡FŠöÖÁœ+Ê=àHóÏ«.DƒÄ
5˜/ŠãE &Ü¯‘lâŸ"Æ¨vÀÀ›¾.›ÔOÄkc÷ÛXN’†9ÒÎ‡l.Îz4‡Ì-CpœÅÿ 94Ş„c¨éF2…	Õ!L×Š…ÉÏí÷‘ 7+ÂÄ2BèKp¿&D,wóóEv(P6£õ¾QÁŠüsıÉÚ?×ZK[1CñŠ´z™}ƒ€áğ¯lVyQF35¿MîÄp¯”¬\¼Ï Ğfß–ìbæ]*¦k,$Á^<¥[Ş©À?vZÇ…Şñ3Üù1ÿÃ'ğs¾`\Ì¼G*iÓêvf§£kfÓ™½ÏP´²éÔæeoÖ4²i…R2ËÑ¯hÜ?ˆab—3ü¿ÉnÏğOU“ÀB* }¦)¹C-5 n‰n›µŸ§Á`Òaø'G“áŸ”SUŠ! ¨qgW5+ñ°ó–¬ Ş<¦3Âl2ç¯š!¦&}ñ£"Ü S±ˆ˜RîùëªÿdCø'œÌ™â‰CL‰ÿïŒº¤<“ÊŞ}ì¤w±Tù“šDò*iU/†ÑU2£öªC‰(T&,ªb"ÍĞıB°"ÔóşÑ-S×È¦àó»Î®ğan»&NQ§O2åYê›“÷6&£Ñë#ÖîvœuÛ	jk,ÆZŸE\ˆ«×¥î/D5İğs{Aæ$ø"Í†ÆP;c,Ë;$?Æ>…páß³æ@FÛ#…¶Ì®4]^!s9[×.hd¥l&A:–g0«@u2…Ó!s—¨b3÷„ÔcémBşÇ)×é”.¢“¦‹Û¬‡«"|æ‹€Ùf`€?0ÎqpÛ ‡Ö²nÊI$û~÷¢Û´“aÅ?8ûÓ>6éœV<†™{Ò‘¦†XÖûå£õ*SêˆŒ‹:ãÀË»ß	Ò÷ëÏ×¢^•rU¦[ğYJu*åƒ»n:ëÛ3ŒÈxÄå°L‘)ÕhŠ5H½Ú’ö»¢:
%É¦3fŠ©@U”ÅT™"|Z¬¤âŒ0D5ÏÃmvdç¸‡s=Ç}=Ãy¨–õ÷E´…¾x6kE3Mù4îËA‰|Hÿp`”§ÀšQ\“Ä”… HE¦6rÂÇÄ£/ŠÄA%Ús€82]8ÒCmI¿\`ôÿG‘øK/ìö‘ˆo¥Ğ?“½~õO >sG"¾sÕpì$ûØôjıL'è½a*Æ`Š•ÚÁ8©Í²4C‚½ğŠÑ)ÂİŞÇh¨SO‰/y-¥8Åƒbã	)Ï^›-´·š^¨¥u¼Õ|i™o^óMEÿ¤NÅí·:éSñ·úôQõéì‰ø°Zµ18 ¯ª›9®Vk³fª¿EzqŠÚò$4é<½Ù¬%›5ãÜØ‰ìyVÔğ[{$ñœMÙz+›‡Í"”Z£æ!ÔK‹kë£Øwreeau”b«~MaÔs—WÖ./-°‹WWæ°9¥^Ò•çö¬ÕnËááÄËnË×Â;øV_sİ§”JYc…Q^M¹Âû>ÈæKNäî8{lÕå}¯åhÊzO°*ˆû¤¥HüG‡ø×½¿€àIíÎãxáNwä"|©İŞ´ÈUS¶èıWèN¶%f€«ÃÈlÜòTJLeØ•~Ãw‚:†&wkØ¤»¬?.3Ye¢Ø÷ê¿v›‹SKsmé¶â<›Ÿõìğ\:öÊzJõ¿âzË…Dr'à»ñœ4P¯)?°+M§²+<z_¶L•¥âhßˆ×ö¾â¯=üœùG3Õ ÛD?´hh°n¹˜Ø6¼ã÷àÏQ:'é^~w@r7Â;¯1Ì÷Ìõ¯²ç£Şc:è¡7_hïòE½>ä*ãCŞS>YğK|„ÂJ°àÙE kw4ÍwÙ•Àou"¶œ½•æÅ[{Ïd~òÇ½¿ÒŞŠvöü\å|ı¢÷L”Î8üğ˜<ˆKù› Gî–h áÔë% Wq·…mÉ:4y#À©Å-‚—\7ÑAÙSt¿÷7öÁµ±3®\âø'Ë,»m=È“-æën­ÑñÔd˜©ê.üuA¹‰c‰|ÿÃ¤+Râ}uÿŸÒ!Ö#ŠR: AÎøİ æ²Fwƒ—MÚ «ƒ´±ĞCÏ;ÈÛ¦ËAuù¤mÀ~4÷%÷ ÒÓò°˜¯$
=Øãì•~\·õõ}ÏzØ{É²‹5ƒ:rƒV˜‚5\AüYs0»Sœã+z¾  âcÉ»Kæ†3?
l—VØ§zƒ³ÆšîZí˜ÉB}Û¶°=¦ô0 ¶£Ë,² èmä9W D 0!„ï#Š$½
Ï&<fÙ•ğ£däèw’3ÒeMß»Tş÷k|½m;µ=ÂWø5vÅ‡5î±¹àŠèpFQ‡³øDBúk*%,vú9ò¸Ã¢zP}"`¯ñ1ìZC%„8¶´' íÎß3³lÂ9ìûx‡i“—hı®üƒåBc†ò”ß"9øŸ)Oã¼Oè3Ë6ßÙ A¯3o¼Âæü ãgtÙÔ9‹l”“y-%¿èıïcr<õÆ:=ØpšógÁ·ª5,†Ç¶½Z5:ÅE7¾—„00¿W Eôæ§€ñˆ3	Ä•eHlG=¥~8œĞA¹„×ì ãò_ùÁ-êÇŠ€ÎµŸ÷ÛX$-_’øD9%Æ2­*ƒ,N‰òf¬i÷°÷B>RåPÇĞ—™xYøc'&P«è`•yÛ.©¥ö˜rëÌmo{ ²›ÕÔâ3¼|¡ KÉÚy¼ºWƒ?Cu„/î%‡.íÈrøcEvlŸú(®ucĞÄ”ñíÑŸä¦}Ğ@äuøÈ¢#&®¨dÛ®Â¢Qo¡XäwÉ ¼hı`²	ó0'\áÉqø#bG÷•ëˆ[´ïS«QñšÚ,Ä.R›`.P tK¨!ZHD\Ù4KÔZ¾"¦D;À—ô’É=®ŸÁ/Ï
¤Ş
“¾$Œ‹äô76ò	Àğ ã\gF›°	²¡%·¾Ûò.ûÅsL„'°hˆèä"Š(^ˆ¡IŸüs¬OñÜ‰Åı;!êÏyïˆ;#fHDÀ¥-s0¶ çìÕn`ç\±%;`ÁºªÀåB‹VŸ€SÎõğ?¸nŠË#2L+MÙ—¿}ó$Ù“|ól{Rê8aˆmkæ—Vˆ¶ŠwIãÕn³’ÆğŠ0ìs&— ì®ª ¿8[w[(¹0&¦5p†ÂGGŞ^®m.³e­‡'î1/ô›ÈâŒ,Kµ=õ%ğY+¥2hŞä‘×´#¸~'ÄÛpÇ…a`E0£«¼’°ÕmóÑX—+s`¶¶İ&Èy˜Ym°d[Y©r—JÉrn
ó¾—¤+¼¤)->§J+ñ&<£Ö¯F’} 9¶»ØPn	·Ø(–™×‚ÙĞ5Á¬`Ü-Ô­Z~]Ä¡Ík(ÓEDæÒÄ7’,LØX·{Q­ÊxuDÆC&«“¢E´&XAşîÈe˜7Ï(¿)7	 Š9PË²_ï‚Õ3ä	öõ¬¥Ş§Ré}L!eš¾5Ü6ñIñ6¡jÊ–Åı—|·¨İ-î¬İB Øå}¼¬0ñoÒö0mİ×DNÂ|³¯;/î‘Š +ö)~#öL‘½/swm,×æcÿjo›+~9Í\_\²OÂÄ|ÜûL4x'eFwô>¦ïO‘_p+ëH›O0¶;ZN§Cbe£”M”N=r$íZè›±<¤Õ¤åÍâLDv£ïÒÓ´—³IúŞğ Èåp]s¼í7p½Àµ‘y1!)ŞÑÄíò(‘EÊ€“âw±¤au/c|Aïµ7'öœ¦t·~âG®ˆ4°¿Õ¢¢}óxéOÄ&İOL®N+p@Ñô¹ô˜àĞ–\‡L"yh¯í´¼šÈ©%EÕƒ¤ózš¥ØÕó9ıË /*=5Â@w´ÚÕ2üİ*Œ`
  ²x7“uÚ§Ù59ÅìäÊ›~°àÔÅ¢rîb(PŸ3XRQ9ô[n1À»‚2•?Ä3xåAx6¡ürjìûWõw-‡îÇüÙêù½¤ÓÚÉÇå1e@» 
åE"¼c ©Nb:ûb-VD’ÏÍ9ÎvkÍn[¶ıd_£'¤Ä´t3.²CfÖßH±?Á&è}ûA;œûèg¢2R~LÔ<ßT:æèiÛs¨`´xvMHÚJÚ²í±œqóva±§ù); öß'Ê#òZ=>üw®b$Î ²¬îÖfd8å$â:“],nylaŞ¹¹©æ¼vÚÒòwƒn;)•ƒÕ|¬‘&Z ¸¶Œ©øã1ä¼‘°èÌÌB|¢»0BEÿ‚Q»ráE°?d%0Ø*&"ÀIşğdè˜1û‘9l7‹.<`Õm€ş€/±%ZE"5À$S¨(Ó²·cØŸg…ü?/õ˜{Ú¿§h!ö^”ËeF©-/Ğ ü˜lSr<!5=X,0äkÎTWé&ŸKùòş¼ƒù3ğXeÓ|‹¨"9O¯!ãW;Yùí6×>¨%ñD<ñƒê‘·ŸÊÙr
$z]#Kò{ä8¹C@WVæW.É³T…Ç*jºÈÕİ Åg.¾*Ï‹ùİ/$´X§dËT]¡äQegƒú>Œ²ñ*BÔ¯"üv=ÔÏ‘LËWdÊıM—]$³û<Âbæ'qCp½ £9¬H‹*Ø`$ô¶@	›VÍ/)ñbX‡]B*`ü³*5,©À9‰Àä‘Ì›—Ø$Ñ;Ì€Á]¦èEuƒm˜`úÔ~˜$am€8ÁeZg¨åãµëòv¦Òİ	–ßi†xêŸ-Ã¥½&  :ğÆJú
ƒ¸ÎQ»&`Vì·]·ë

sv*E~µjëÁ]	8J“z½í4µ#}¹A4ƒ³ñòËM·½’_C'şDxÅº»‹ú’¼ùác?ÒÃ·^‹‹ê‰ç\ÑÂ“şõ_•Ì¨l¦!]¼Zßˆéİ1ãMçüÄÙV£lŠÊƒeâ<RQ}Ğ<UJãZ²òëŒ$ö|©÷Rê;QYw605Mß%¦‡¥&‚ ŒuüVâyqŸaï,x\àÈúşâ¥÷o¬.®ı"ƒ¯váÅ’y(ûqiÊ%~¹ğşë?Ÿ°kë‹Ë—¯®_g\˜e€‹Ã”G&ÏF¥¼z[Ñ ©ÊêÉİ3a¾’'ê#¸åEÚñNOÄªï’Èc@ô}É«÷ÆÏYèÔ³œIvœÎ¬a½á¦ä²¯PzÜSR¨³Îpßêœ–»°›¤G´İhÇn1tãµk{Àà~¤¾7¤««—W¯3™»—¡YÒ‹ì>Ò îI»K+nœA¢îø—ØµŸ†Úà#&”0w—–‰§çxàXÚôê @€ºÃ†Ê"æ×çùu‘ë–Àåº¿ÓFı-ÁÖ¸›\6¨)?I¢—§Í¨b¸A§	¬*iÌŠû+h‰‡²k	g¤ù‹k—×È&+ÆÑ¡ îşæ&L; MĞZV¯,-üz}öÆìüòâÊ_NÆÏ–ÈrC&x^5ÍL!å„°/A¯huÀ&ÁV×jX—àêr-85:Õİ»!ò—U‚ïÀ<6»î÷,SèhÁm€jĞß:³¿ƒŠ=|Şà/¿±Ó íŸÚK°k
ŠPÄX&®)†Ç†$‘ê»<òŸ{=fïâ7d¤F
*d­jé×øaİ yƒ²Ü@NV*Ÿ
kÄäAY¨Éôµ¦âËhGŠ\ítÜ`ì¤¢Ú‡Šİ©¥Ê¹/8ŠÛ˜œ—‹Ú£@æ³KK—µ0ÏŠkë³+ó³«ó¼p*ïspaéòÜ/ø«‹sëlå²ø1yv†‰oø ”ÈÙ1Á¸õú¥a‹ï²¶¿éã6ÓËÄ5q%y9‚Äy
"s‡Ûd*İt·±g»ıMË³¿^\¾ºÌÖŞ_\Xš_˜çÿr¥W®^XZœ“û}0ÂÙÀîŞT½x@Îüs:Nÿsw A6Ó6KgFì_a?k~İ½
“çØÅT°| zoR.VÑÌ<›DÑ¯uñ´¢\u,rE=©bÁ‘bï+7wS(˜0KåÉ²àÇ›ÉunPìµ¤U>‹?Ù·1á‡*¬F®U®²+ºqÇ³Ãd Qh®á5ëE|»:ÃfíÕ+¼2zQ©¦*l~K~¶îm3Âu–)Pd@i¯t†µœİÒNij·‰F²ƒ'½…sÒI:öSÆKÄ®øQ|şÓ1©¢™‚¿¾ûn‚WWîÁV³ØñıšôIæ²sÓÛ±Øù­Òiì˜NDiº›Qé4!Z€Ñ/ğ÷û]éèî•ëlö÷7/Õ¸³vËé”&XgÖÙ+M"­ÃÕK×¶ X*Nİë†#×YØp`OKUX=£ÒÉB	tĞÏœ¶×‚µ”<°bš@+ğGi3€Š‰NÁDS•ÀQVÖÍPàï »êÀO³·¾°±UºöÎ¸ÿÔ®€°!ÅJN×:6Qa`¡øjzÌ4=†x¼ñùã§?Ó  š|<Uñ}¸¹â °è“'œN?áà¦ZyâœöÛ¾mgPıMÍã,5ğó°+ªTmf¿Z9`cú#GPÍK8âCsFh_Ï-¶UÚÜËºŠ'F„ÒrÃVáœX°éÎá(õ¹gÇ€ÄÎi¾H•$?ŒÄ¾elœ9–P·F³*½v€¬ZõépIXÍ-¹_?ÙO#L‚ô‘è!‰Q|k9^{äzÁ€æ“íN ær6ÆĞÚ r.ÅÔx“\ZXÓ–$·qÜô={©éoÄ?™Úx¾Aê…FU}'=mÿ†ß¬ã¦[z¹ŠÂì}£ª¬™?Ö
ƒ­À«3üW©æ7ÃÒ8î\òµJÉ#µ0RÔ§òóY,ƒ±[³WzÈ`:¹4— øãå©èD‹™ş‹dE‘58¢ÏdŒ¦’š‡Å!Ó¼h5Íh¶f6H-ïQ(¤n4ShFAz°ßæ•)gö±¯i×òËHÒ+FÒÏTih§„õ‡PDM¢ˆÒÑSÒ&Ğo8Z*x·Ô¥G\BEvNùÂÑ‘¸ìT%+ÊòhRcÙFRã[J)ÉSŞ¶UâU'ØÉ§k;³~¤ñí@Aoö‚ìéO^;&Î9¸ˆªĞ¸8¼ÅÆï6*I‡oŒ/*ï<ö¨Öí‹—ßK¼|ƒÌRËÃ=©·*x‹¢'‚¢é¯&õü7İ0ò6÷JèAnEiUt£¶v[{!ì z?fö­%İô	Ö½]öõ™}ÙGÿ½¯½PMôÖÀt§éä{ÑØÛP-OYı™U	R8#®UnTnŒOuvo[Nq|êôèøé‰Ññ÷¦F+åIxˆ\Ğ´ßqj^´Ø¢byÊò•‹6Yº«.…HÌí¨@~°ãµÂ˜?3˜ıKu$íCtÀïËÄóØ´á™çpI#ç³c,x¥@hÓŠÒ2‹<~ï{nÒJÚp£×mjâZlã´IÛ×0îtÑJKÇÉ¥Œğ8Kµ±0³ÅL6È¹AMåmÚw¹íKÙ"A` i ¸’”\ü'ƒÔÑxÖ^»¶æúËnä “9+»·qØn€y_š@¾²œoÏn˜ÚBÀmàu¹‡1S¯WÅŞÊk§5A^„«š‘ğ»šßôƒ0åÕÓß†µÙ·}I!tqbñ+Š©{È<x¨i:a‚ÒøyÜ}Ši·ãß)Şøs™EšäşÆ±«÷Åé3ïJ‰»ÃZ^Hi‚CSµ°Z‘u ‹Pl™±w™r’Æw.¥Æd¨'aØ‚Éõ(l,ƒ.)ŸO£®”¦8á„<7 ¨•†Ï<Mî	 D•$jÕkğPš8ù1É)§IQ‘‡ÀÄÇ¼š"-z¼¢P]©J²‘ÎÈú}ïIWw‚¡®¡ˆGÛ÷^R˜"ÅËóJÓqh½,Ê-p_$nñíÆ¸ÃAUâ —©F0õĞ8>ëûs2H,–Ke&ä’“µğ7µfE7şZÈå ÜŞ­‹g³_9<Oş‚ÓmUQJàv_ÜËo¥>‘çË'¼¬]ÇæéC5[Qæ³rÜ•¨0òÄ+~HëµØø{ìØ¦+?Ó_CÔ%zÀ!Â¡ÂDcŒ '
!Çë}5”I©î‚U*7wÓ¡S¶>*ˆB“üu&½Å¤¹TÓ.ıxñUmñ§‹GÁ6ÀD»Uª ™R1Æòüg›~oå u“=OW“™Ó!Ôyb£^™æÃÔ'ä¾ømßNàt‹É§'Êëø£§ãĞÒ;™*Lãà-LÁJå/XQ§6ïbø[ç!‚T¦™å.3*“Î*‹!òì*òìŠbŸ‘éF®Àøm Èáf&è²¼öw/,ÿÆ÷ÚEŒÉ88z˜—
í¤ájÇ´^e¢ ?Æ~fœÿØBçqã:²;o\lÜ´à1%™}…‰¼Á7%qÅyxq“‡0RC–G½¯xšİÇ”q/Š2Ve=#TŠ3òcD1rŸaÊÃûr¨·Føş>ÕûX¦\bq¡Ì«M;%6?î¿€ÕHîR‘¿ğ„²˜Üp¹LÄBÛ««KXSÈË¸ª%Îc­†9¬BœRwP¢J cGÁ‰A-5œZu;œÂğ;¡XÖI$8”xè‘)½Ó|à¯<¹¥œñ”!VuH•.±à‹	ëi¡ÌªrĞåæ”½X²ñd,ºœí—Ï”ç™}jLz`Bõa(ÖÆ-”l;Ÿİ–—pá\©Y8÷?ü™ÁôÉz0mç]Æ×!§
ĞsÈ¤¿çgğHx\7hæğA‹ŒÁÏˆç˜’Á7\ÌˆågVT€| cSsÂĞ¦ì2U+€°š{c¥!qJ®›ò’‡XSC¸„¬;c6'ÊRï~²{]­ÁH[1¸K0ë¸ÁÉ-Hş²ºFŸÁ¼ÌÓAb®ÎŠ|y\}àsÁ¦*XLÑŒƒH¿0r ëøË‚ÑrõDÄ/‹ÜnMÃ7¨êg@UO4‘İfJU7:ğ­û?úûübõ=l%ê;ü=€Ê³\;Ïq+ÕsE/CÃe+O½1Å{b Å[ìw|@'¸ªSBuº£è}„¥¹DZ@¢Ds:«F›5‹óØvÈæ½ğ£û£:Ğ˜JÉ$‡ZHVÃh]R–xHyÜû3@QÁ»ŠFF~Š"E¾“ÓaD¤Ijú (ÈÇ‹îÅ*¡CrhŠë#ÕB‰ÉÏx×¤Û²vOÒ–ŒW(Š7Iynkïk»8øaXR”Àd-Œ'™ÈY§áyi…R‰ÍI•R)›Vê|ô€µ¼•ï'-Ö)×R`1!1Çá|™.“µÔqG‘ìèØS|:cJ‚Sç‰'A9”
*ç}<âñsúõ¼Á&hìNëë øª÷P’ªâ]SÈ!ö’£‡MãGO›M,ûhe½aÙ«eqij•c•´ÓL¼Ç‚›ı°SÁO¤Ä•Ï+İ`ËÕ \4Úõ*ªâ˜ş˜zl\±Ò	¦â…”j:š&FfF7Ìzà„j¾¾—‹a7©¸àƒ¤üÎ‡Àÿ‹?1`‚¶ç#7çnÒ0ì»6Ğ«!eCÈt·EqT®˜P8­„ÛÒ4ÒZWß0ß*jtÉ×Iq*,6Ú¤AåôrDJO,#1’ò7h·<õ&]…à:Õx¥³£­jÿ³T)=íà‚ÎùãÁğğ¯cö£Cî;´ØÅA§k|TòÈ®ó	?š	Ù(ıO¼ßözÛåïĞ¾·B¸îP7zÉK‹]Y@oJ0•P!=‰QÎ“s¶ÃoæÄ¬ıØ¿	ôUBÖÎåÔŞÈè‘A¤ÔyvJ·xò“gNa=ìÑ½áX}¢’Í©ƒ›c ßóØ÷t¦2Üö'ªq‘—‹E0/%Å“ÅEqU¬ÌöwY½ô•ÔÜI…6Ø3¡vp¬±#‰& †Á‘,çÇOÎ+’Ã½~÷ˆa0­&µâ<

¾¢‚°Ùßğêu°ù¼ÅÌ8¸µ¢¼WÄDr;™Îè¤†!^DÓt:¡kqº°^ŠÕCÚ"ûD1nô‰Tùy«‹ÇP×ÕØ"Ë<hiŞœ¬¹pnqşìXÔ8òp™©=¹€Úˆ:.¢mHyÇz'UŒ1¬²u´Çpµƒ5º~ù«áÁËb&Jí¡}_P»Z³Ùè¨`èój*¦ˆı#ğxˆŞ9K¾¾ü×ÁoÍEŸƒég#LÜS§	ä‰¨{Lü1°lÇO_ÄíÑ¼Prís ğcPöêÚÁŒflP¸!XÅ¾;øôzzâCÂ¹wâ— ­|"÷9J¼ÅƒÇßîê€†±©§VÆfOıñ•tœ	è lºm¬›)’±¯U+¤gÉød"xäs.õıÓQP]+0¹¡¼ú±Ö«¾ÀÆaá}q<½˜`Öo8¦Ì/ù5§éÊ¬ùcN"×ò¼ê§Ÿg@ıê%¸&ùºÑ] ~â:P?*pvÉÙî)ÿOæÖ’Ş]ù¯iÿPs|ù@Ëß"«û£Pn³D•äUçÈú_e ¨\¡êÇfàë÷ä!Ÿ½›ZÅdîFujŒô©µMóy[Öj<¥IÉ…T£Ie)óbÊV–
ãüğãÿ4™gÔ™ä•Ù”×ïŠã=S#“ªh£'RéVMÏ´[­X&ŒÁ™ ·(®mLŞö€0[Á….ÖÅZ—Ào{¿¢½›°iZ±u<Vy³Ş´}IÙjs¥ŸMã²i8ZøÌ©ÁÜ¼Uóşş5‚Ml<Ë¹M¿£¾'"äÅà>¦ø—[~a¼KM?Já•¨Ò;…¬r<{¬$ú	ò®Ñ@Œ§ÃKÄ•RVœw‚[¼–Æˆv2œJJÁO:1Å–M¤!vÊœ´$«ô9T–éc<Yå'Ğ…ƒTp¨ñ8YÅPñ·¬:“1?·`Ù¼šIÓj“ÿ˜§O";0]á?nh¼s%ğ;ÎUÄ)j“Û°",r·24ßØ¼¯£ˆµ‹·ä`9¡ßì¢öÅ):•È!OŠ~Æ&Û¹ ×â"WªbÌåA@«…^^¼¹*¨E°ÖÀÂED+–iú±Â„ñ„ß$ĞÓlÖ{ŠŒ?½4<•ëD3j±;öÓ¾I¥\ßã}Z‰ş‹î(+ Âfã=M;éµ±J…	GJƒÿGúà*¬ÖB?(Q…3 ¡ß•ÆSç…é”ªløÉ¤!.E¦OÃJuF”×Ú2¡yP›ÙÇ}ÍmW¶¯-*]çÙ)Qçä”Qarš |â „'ù§d;¥38u5ÌÊßø[–Ã»HeÇgh0µ
Óß0¤©¨£½ÉèNV}!-¦l‰ÂŞ6A”±¯5f
Ù£bşi¸Èì¿o{îÎw¦PaV„ÿ™ïzhÎ0kÙüûn«ÙÁä¢ÎôØØÎÎNyg¢ì[cX€y&ofñx`?‹&]Ÿ),WYu©ÊŞ[‚?Æá/ñgõßl–Eş-Ø(Q_|9Xş½¿@Í¿kÉk»5§3S ıî/F{çŞl<í ‡ cü½0ª„ïúÌú»
‡³HMƒÚ…}”_sx›^uŒ*@n8(Aôw©Íá#¥?Íá‡‡÷IŞ“RÌµáuÒ†3jz:ú¬_ä…^Y¹4ÊÖ~	ÿúoW.±â²³ËªËFRAO†Sù´¾„\ó­¢~ÒŠ:õû¢­+‹ù©ìÒJÇzÕÏ5ıÈæ‡¢Åß ¼ß]^%Ì“Pè•ç¤Õ+ˆó-RëÃ[$WŞjõoµzû½oµú·ZıW«×´ ®Õs^şmQë/:ÛšıuùÌa×N}ßäpü>(ïÕ¥üT÷°sv}MšÁÜîıTUå]€åû®¹Dş©íÖT)ÈßØWÿLQz–çë”}\í_{Ú@º¿Ä»~Š¿¶Rç‡Å]ãW+µŸÎˆÍO|Ó2¸›‰÷ˆòv¢º;Qe u±zÅâÜe³ µ}}]õ=yAÇ·å=ñ“Î?ÀòX‚î]†%îØºó¶c…­0çF³«—å”ÒükÔÖê„ÛV„®Ñs›õáVÈœ·©L<ÖiNªºRïşVDœ@A¼…­Øê&ÇıĞ=12ùqI?.–•‹g Ê§+¬³QJ'¿›*äé³0›\êb7²¥7•Ä+íxu©Ù&e©Ó0ËôQÒ“Şé½RK[~i:"/« =ÃX,Ïê}Â“phğqúŒÒh¬õmÑøòê}Ø¨ãx-9ŞÖòNÃƒª‘6€İ`¦à–·Ê,î¯È®ˆ¦‹é­ €ïw–’Šöi
˜œ¯ö	ÀVëş¸@ŞAŞë}Š¨@…9rF ^`Bë‡TMîñ°DavZ¡ KpLˆ··ÒŒ©øÕá}¢Úû)JæÕ‰_ÀÎÄÅlŸÀ…O	ºùN‚+oTÊ¹¾¤ØKÓ«ß’úIÊ»ß³+ÛBãí¢×vÚ5Ïi²YlRyµL6KÖ–5¸EL¦j’©¢Ijñ2çÎ^Î+–[pŞ„ì(ì^‰*ÈtûSàeX‹ó‰|êS,‹Ş{Îñ/w"¯E‚¸ïMU ß\÷Úì’ïSí-nM4yŠ}H9¿ƒ	¡‘³a(M”)LôĞÅyÒ*EŠç¼9½"áCªêÀ·,çMhÀ‹D3‚ÏzO1ëIÖ‹{Œuø1!™'Hñ¶ğÏièİo‹„?ü„·HE¼HÔàı–ñE19Ñ’îSÆ÷_zÏ2\-&¤4›â$$¸ÇNô‘µœ]¯Ü|Û½:Ú;”;$æ¸a·1·½x$eQî4†Údí­cHûMëÜAÅœ_ ÆË}xbö]®ª';ßªÛ0¼¾‡p×ÉLEŞÌ~5KıÃ´Ù;‘†zop^ànV‘³Eµ–•.år¦ˆãwĞá1Á¤4#©«¦œ¥ïª·ß[jIÃC£Q+õ	Šå'½/Pt+¸D©Ö²ÌLÌ>ñdeçñ{Z O¨]¦8s}1G$›	;Ù¤^9¤‚¯}K4ÃÍk¯gƒ7CÛ›oyøkDÇ¾}¿{W¶Û†ÕÙ‘’¼l¬şE<ê„ğÙ’vöGîo&Ãe‰Ãñ×_Ä£Şbâ›f³©1o¨û9ëã³ŒÅz7O¢c»j8^Š"=K‘34ã³	›/¥‡¾mç~Ävîñ¸ÙAlB5İ‘a&Øîã†bôƒ½æäcÍe|x›ªzx—]*ı?#è¿Gîî;¼V0?m‘‘±ğå!ïâ†Å¦~˜”ÃJSŸc©1ŞøcxÈKü‘ÁŸÏ{_cEOqF™-T‡Š×{HåF?‘İéàî—Xá*3ğUãÅ®àe©ÌØá‡† Ô&ÎÙâ<+â™ãh²>·ÑŸØÎi–"°2²·ál{~ûƒFY‡€pœÂs¢Ñ0 _ä·È‹·’¯&r›€fQ°OÅºŸè‡qkQs+iíùİ@ßÅtÃ0ÑeÃw‚z¶’VŸìCï¸Lß 7ÊèĞôK7ğ6½¥‘¼nnÇ’ù»Kè¿*m+oŸ18E4¶—î°¼/=ş-üv3@êùüğµÌÄvÛŒÎğîŞ‘T)btçüvèÃ×t7JÑšè)²?d¨²>"á#Ã²ÅŸ¢s—ŠïQ3Ş¥Õ|Z×ñŞ¯¨–"•ğ£™İÆ39¥Šß#ú‰„çÏ€¿Èáv*`í`×ê{m§Å[SËúÕtGŞåSa?,Ìˆya0¾ÏŸ°gŠ¿Óvƒ°áu0w'rÚÈÜv¼¨ˆÊZN;n¡Ô¥Œ ‰w¾o¨øápYGÿóŞßâ2 R_ÄÈ {úH«¯eûv”a/x­…İZ³b¯z¶ä…¢Ø<ß¶Ô¿Ë”[Šp°MX&\xÍÚcfÉ±ù˜ÓñÆœnÔec@ò›¯‚ğ$ùX¤lj©ÆOÖu±k 8Ú Fû¼F"µDV¬ù­–<¦ãğƒÚsü|ƒƒŠCj`.~Aõ–w¿!ŞÍšÀlpİ˜)»ëfëşëHhbå½zŸ÷>‹Ë*$&*Çÿ•‡iHöüT0íŞßQ›|"h7¦Û§ğßÇTP•s{Éç­\û.lŒ¿à3Ä|ø?†H0!hˆLS|‡„}’$x©°âèHÙ²(X?éıUF–Åê/—0õf("Í^‚
´;„…½¤³ÇX"hå)ÇO'qá(…”~|0Pæğ®Yö,’Xa1RÁ_„ÉÛ”KÊp‡èÔ`Öq.—: SÜfm~+qÚ¨„‡eBœ ª¹NÔ÷:¥„†$z˜ÃˆSp ^	¼m¸sÌ©·¼¶x'jì¢ahˆ’,
ü&0Ö¶ÛäU‡µæÍb&Àzë<Ñyh¹…Q(«±e¡ËÑUŠz	1æ«ˆ`0Êêù­_(
ĞĞI«Ñ`‘&g*¬“NÌ$OjÒ2n”k©yÃÓùú	Ól/­~Ù â¼]¦ÎuºÍĞ5d†¥‡>â¹›Ï¥ª¤D4‰h&i:ê0ç¥QM;¥oTÿ‚Ÿ¨¶Ôy ºÛd­İ"]]#›VÈ%©ÄD×Ú^§ãFl…fI‰£À#ës§á¶å 2Y7Aê£b(Zyüt,ó–L&µn"éräSe£R«l^giŒ<]‰eÑ;›g6¶éè÷`3ïtı…t§\^)kÜ<@#{†Àe,üaé[4hV`Uh…ñx«ÙÓ·„%Ù‹fdïÒ?<›×ÚâùßÚ˜=£[Ïß¾6~¥nCş¡>HqbTÆ;pƒ+~Ó«ía¢’¼d 9ù±õ6´Ï”döä¸±]¼©È†Ì­Ôû¤]²ö¦¢)›òâ­Û#œTSHwã¡“×¥(İQ^Õ„8_ÕNa›gÌ6ˆb°äöÓÈÆ‡Æo¤3il€A®fïwŸ·VCL«²rbå	~°V8=6Ö‘9eïGœmräüd¾¿1iXôi\´D—kãå	Ùî
ôJİÙ¸®ìòµwÎ8“›g®‹x¤†€"áR….T³ùOÒ¼&…J}8NIÒ	0Ccû½CıX„–êöÃû‡,oLp“i1‘‚÷dïÉúÔøÔiŞõÚxít†ûƒM£ÈãÕé›“şqã§+æ…ñÏyvó'™W•C`Èn±2ÊÆ§Ş9(—Ë7ó1yı‘Xwvúúİ©½™2”ñsØÑG‡wxûÀç`YÜÏIÁ W^ÿRëò!Ù9JL—k,½»­œÛĞa›_¶³á•£å›äóhvî-Cï=hHº¿ÀàŒR¯’.>aëÇ—WØC*>šŒÌt"úJŠ§ô+îó^Á`ÇE8¥/èğÑ4¯VJˆÜ„·ÑjéÃ…SÃT†Š¬Ô4ƒoÅÂX¶;ÎÎ ÁåÒ›fh$µ†¢¯!È» 6t2ø¥Õ×ˆ©µ6 ağnËÍÆ–¢ü“e%|¦b›¬Ò¾qyÂ3£ìI¥.SX)VwI+,¡•ö©¤½ÌºpÕJõ‹~´è¿FœcÂâ8—ß›«®ğ‰j}^Cê‡i€k†0eù	£=,‹¶Ï+©N£$[v¢F¹åµ‹ÀÿFYÑ¶–1\Ëû)ƒÛFşå¦©ÿØ
ZZ[ÑÑ?Ö,A.ÈÜËálk9êû`\ÛÛŸ„ıÖ:şYÇßR›X·nÈ1”Xyk§mà_	6w‰5ÀĞ½à†[wk6ğ¨Ğ¿­¶í -@dpƒv¡}ƒFÏ ]°5ŒícĞ^0†.ë>6qfk É•~Ûu0!y”«¯ya\H'!«ùˆüŒÄ7EvIp¼5Z-/8‚ÑJ›MFkUÍ“€)RrºÓL,ÔZÃ	Â×dœ*”a1’;Şˆq:©şSÓx¦|‡ŞÚ¦¶ÏkD¹ãØ¦)TûNÛ¦ÉZ¾%¶iŸÚÇ95ÍÍ@µ¢íù¿7´ÎEl>Ğ/¨ÀFÀ4Åé>=Š*eƒ–ñ„_¿Ô/o¯¹•ÉÛ3ô‚=Sw
 ‘•á¶²­é0Hy¯óÕ>mP^•ñSXÈ&iŞ3^Ëvş‰Mqß»±)»tšÖWå…¶1Îò<ÃãN¼ãp›˜öÕ*i:ÙşücäæÄ4‚³µx?ÿè%ü;˜ÀÀÿüMÇÿŞq7:æá–øºÉ¦ñV(Üõù L¹pù9¡– I5oñcÛÊoÂf¸FıÉÈ¼M*·¾«Ñ”ï,ÉÃ¤‘’ÅSûVO×)™¥Æ«ÙºáÊs%êuN=43V€––~†ÁŒEÈƒÛEĞüCŒ{Ç$$ãÈ„£xÙêš2ÛR9Âw„«/²‡ÂÀûÓ¶‹öíµï¥¹Ãÿû<(óí×åÈ÷‰J€ivİ)†şÇÓÕ™iúÆœ°ƒ_¯—6>6~=i˜"Å†IU°Ï Ï¿:œÂÅ¬}qä'¿?üÒ'G~ì—#?¼´B¼±–~8òcÕ8YJo›ˆ+%Êun#œÎ.Œéìi½ö|ÎhdãYáİsl Ìñ”êİlª9¬)VËxË‚™MÒ0Kœä×npl>Ë¸³Mh ğJ¢€´F…B"[FNªB‰ïdXsšni|\ÏÀ?ÑGÉêİ€°K>+lKó F?¾fÉ!j¦ÎÖl»>ô•·÷!`ñ¬šË-VûÏf­ÛÁdN·~ îDá¦dÇÄì£²¶˜X"<ƒÙ©/òä8Õ+d5<¢4¹§“†ÓF¹Ÿ©&mªYù·ç§LÂ?§¯£n°!uOŸ0üÍ=m‹&÷ı–SK˜*ìCóÆıŸÿúÿ$ñ ®PªoÍ–¢Ü@³§·«%©aáŞh­µÚMß]*è[]Ö x°¾©0(=·éÙİšQà··Î™°êÖÖ€PÛq›q¡â>s¹`Û:7Äçş3Ã»Şè¼.z˜ó; ĞäG™İÙ±n¦P‰…ƒ˜Y…{²êaƒO5µ—İºç$é±6|ÿcK^û–[_lsz­n“xJ:…Şš+#µ y‹¢¿!©|ZØNşñŸ1ÁòU‹åZ	ÖÆo3<Séh”¶ôÿ:1z½4˜É5ÏÀ?™Àc¤8¢cPv˜øœD6Ô€ÇF±!”¶vŒ¾òØ	3®xÚçµk¥ŸUbÎ¾a´úÆ:Xøàş öˆÉ7Ä”Øo­-
’&× ç yöìãOÎbÊ;7BV}`yÊ°ÁO;Qµ´œÈú{<-»šv3T,†¥äk%g‘ù!&œ¹¬pùÀ5´§WæuÔ¨›ĞH3%½M*pcoCÑ;•XHÓİÄ?x|@ KQ+º ‰U4+ò0ö…&iÀRÊÉY.š‰fşC4ÎQËá¶{z‚3=)°8ßŠ²‰ÕüóO¼à×÷†c‰\‰Öé#‰ó±l„’zªâ†`Š5e±Yöıh¸wQP°€Õ(W‡!€` üßßñÚ áÊMŸ›å†FmB£*»=øZ"<_Á¬z¸·…^
ëé©IÄ¦òáµÈ33µHR‚‡i·Š}ò²
ùíˆ;ÆfU2>"—ŠX?­+NãO¶ Ú7§?`VŞy>AÌÁ'U¨Bòc*O%UÔzÛI!‡ ñ{ŸÂz3ÌÖº"ˆyŠõ¬xêŠ=É…2ìğ¬§`F_Ş–ùP/hVßÊÇÜK;¿a»­ ˜ÎSóíçM\òbPAMIô*j"P‰aŞ|Ë…{©‹èî¶N»æòÊTÓ®Ÿ
myVqñı¨P’½hßr;Â­ùá^ˆº@yhÄæÜp$£™ó‚EØ|;—áÕ2şŒŸdO(ò³QÖ/¤Ü`şe¶02SõÌ>eßT`l:ó­ë Ü2D¿múûšşÊjD«>(•%Œª¯S\É2°“-7øÿ  ÿÿì}Ys[×•î»ÅÚ-‚œDY¢)ëR$,³Ã©IÊé´J%Ä!‰6€ƒ>E³YÕ‘']ß®ºuŸîcWiËŠdGâ(¿„z½¿ä®µöpöxpÀARÁ‰œak¯½ö¾ÅÊµnmÙ]UÉaïçïŸA`­§I¬¹ÅM¬½¢Q8Ÿ°¡k2Ú¿{Ï²Ò3ÆÅşy‡	‹=XĞùÙŠı‡"Ëgrøv>¢ZˆÎÙ­(zpŸÈıİé=¶húŠ`&éË3)ˆ}…y`—GÂv°»hÓş–N'_¸%» ^DşÙ²+Æ“·CÏÒ,®õÏÄÆ$&ñl_8	¶èK0»‡)Ï©	À“Æâ¡*~|BÃ#†°¿P{*¡‰H¼a« ğI­³Çø;L© XBÙè9ÁH´Òf¨ø+”¸<¯÷u6$Û´h¨” jDwîaÂ™£yjMMÉ…œP-™(+«u:M‰«‡Fp¿Ñ†‰áñlòW¥"³¶Y€×®öù¨»½G”
û<BÊÙmÎvyá!¢›±öjÓ“Ìr¹µÔ}J”ÎŸRW3”³Œö/ùƒ„l	Á¦¢ÆNü_)‰ı3±¼ÅFOø{Ö;Ë8
|şˆöˆbİ¦Ä0ƒÀu.¯ô¹ûÌ3—çªçêuªp9®×š9“xZ™ ğ&u*pï§®gl=“ş­g
¶ü_köRmÌ@FI”8Æ™Òñ"ƒoi"`Ü2–î€>¹Sâ×ÕorĞå¡&Ø<ğûf×òúÌ—,ÒV&Yô+¦H¬`öÒ2Œ¶„à.Ü7à\‰Åv‚¦ï^¶6³bL¼ş»J¹I:Ë)ÒqNŒM2îÿĞÄus@,S²½€Ä’	_¥Øº¿ëEÉA@Éuë~ ’ùØ›´ì9Âm(ıÏY–úQzÏ	J»âW#³K}^t$K¹:;ÍÑ+hurÖ²O6YPBWßE¤ôš´X®jî(Œ°iøúæ!WöMÇâÄ25w€eÚ$N& /zB0’ŸJxE[à¤Or††j1Sw{I$8S:S:òYkˆ®Ó“>dGM4ÁA†ïXŒÑnM¶ÈûB,&Aø0¢³k^¸À<í ±·NêÎyØÅ¤a¸r1Rr½u½ókïú“ãG!¥€árâğ©¡(ïY„ÌùŒ«C‚óWôÿ™E²†%áV›¨óÉ¶ #î6D<¢ïÄ¡Îâì†İj ±¯¤˜gü7N¢–yQ -’ÑZËRtÉ³k¸g2Mº J4â¶JÌXßR;-å'8ù)ç¨-¦É[‰e¢ĞôA“`Øú ”ƒ¼h8 êü#çæ£Nò¹Rœ;~?gš˜†;Ÿ~„¤#ã¼øœÆéçl>‰02œ4Ù;xI6bPur0¸gëélºVN^(ÏÙ.ñ2×î¯”Ërø\½J—ÙCšnŸÉUùTİ¢óÓeÄ’/ÈÆ\F™ˆéìÓ>õùl7ñš€˜Ê«’j;%+s#?¨Ñt#˜7²³îŞ)ªÈ2kó|òF®V6ÆTúb™W^¥”§›Ã§n€R¸pS¦·8uÉÂğÄVoğ\Ş7¸Yı,ZÌ™—86otkİ^:H±._ ™ˆR&~Lã˜Î¡ŠàªCkø$,/wÑm¡€Ö(Xî:œ1˜øb‡ô‹xÇ£‰Ó÷LÏ0TvHp/—QêÈ‰;hì°òÏì#É0K¢n/i#.Fä(€½8á?±«Ì~¹Ò—âı(™>
_Å‡œ…°Í*÷šYZ¥ÑŞnöêQZş'4Lä½Nç”;µä´%Dí“— éOÕ½œÜöxñÎÁ‘ïÙJ«ÖÑ(&ÊĞA~\=¤7ê!×%#jİÒĞù”t|¯°2lÇÍ8IóÂÛÆÛ‘ŞAÏÙ{.tÍ4G
±À»¡øï ³U·n3í$—Yúú„ãç0#ıp0@×a19máÀà·`o%Ğ¦`Í~({qÅÕ‘’½@ĞÉwqs È¥Š¦Fcå‘œd\±©%¹>r9'ƒ86)t hş(ºJåöÑhï	[wÂ9¾Ôo£‡áh“«¿˜AMè8Bı¼rh<üsn²F5­&§Ëæß¼î}¼-„ƒzë¾k7Ş½C&;½\wa*=/t?ä5ì”î%~Ğ}¸ áãGé½Ñw·áL©SÜğ’Ãqocüä¸èæ£5äÂËİzJï-ğìı€ÚrâµÎˆ¤¨í9}ÓwÓF›´«jò)é\¨$nNÉŒÒˆÚTs5!`l] IOâ™p¨ü±\ãªĞìxé’é4MåœøÒŸÓë"FÙUÔ|~üÃñOê@q/ân˜şD#?½ø”Ë„©ô4àí€Ë‹u/1ŠóÍÁä¤ûÄWã'‹ÖP#PT­7º™>‰­…™]GU¶,Åêf^6uı-Å\DÍ'èÃñsr
áô€]ÍÁ“Ì§R2…qg.(=(²[Ïœtò¢fÔ¤Ö½,Î§»$N#ƒ)Èg6)O§ô&Ø…ÓL‰¸~úù8¡4éÓbàgØ“éœ´¶©"ó4ÊeÏñÌÜšæêõ1¤qFKY÷ó›ã&µ$J£ö¶VÑa#Í?ùØ\¸À`ëJƒÎ"^ËS³î4îS²J
ó1²ûjĞ©N¸¼;ü­'q1r“ÑÔVŞÏ¶bŠgp”í¦(D01q0aã#ŒÂòá[åÊ´Ø ,>Æ;ê	÷…è~£;P®–YŠCz\¿·w;Ì;àF×ß1…¾=‰—xŸ‰÷ŠÇÄkí÷¾®ğF'":[öåV1ï¤ÖÖ¨os,ì¥eêš»şUÜxB.Ë¬Š^î3–0í¥<À||RQ¶¿õ³7ªıOcb;+ùµ]Ì+_ù¼r°,Ç3g%Ú÷UåÇ÷P(!¸aZÛ$°£E‹»•wjÍÔuóÀOhg¡ ƒ‹6•ï\vÍ	ì¥™¿»šó±ñïdş ºY‚"‰Û½­2²,˜@9…°ËvÌÛ³ğö)/°Œ0§µŒ€³Ğ´BŞ„šQR¦ƒ.g&)ÛDÅóÑ³±LsÔ%? áÒû/ız’üŠ[ıpâ|şMü“DÿÔk$‘Ÿ(‡{p‹ª7¿.ÿøœ¢ªV)åCV©Tì²G¸b†™.Sì( qiàõaôw7Ïé)à½ši‡
0äÉ®Àn¿gc”®yú“Sı¶Fş9¡ÿø·’âÀ9Å×†a°¥ŸÃGèÑıi¶Xÿ9şo)Ó4¬Û]îè6–ö¶2Œg~Id‰ÆœÑÂAW8&ß ô	tz¡ì°c#WÛˆ(9NÌr½´ìÕDæaópğ\Â.°ª?„¸/jh«î †úÃêsRqa‚:ÌFh½3iÛÅ™–q=ºY»åh[.këÏÜÂL·a„˜ØéØ˜¬¡0'³x™6ÈÆfb6ºm0Şdv9
ÅWËäNÉæBŒ.úZ­¬ß «|Bş`ßy×—òCyİ·ıœç‹Ú']`kD…`ôÂ7«éìWSŞn©§nøóŞ3³Ø9‘õ2C(ÈÙ@õñ9Õ6Š¨%Q-Ğà$ŞO¯N…Nh•»fáóYëf=']ñ2v]nÿH‰ME"Óÿ“—ÊôSøsÚb,Äà~k,ÇSíºç¿Ïsï5ë9éz1_"‰QTgx–ÓË~³ğ^înüı°çF®6d5<¯áV†±Ÿë6¬Urâ=Xü3G]üş£;ğŒ<f
ÿ‘\Éßp?§í·ĞâónÂÙ|Ï¼jyœçÖ«UrÒ5˜A^¤¢‚u£úÛ¢\ˆ­VíÍZ{‰;®Œ»a7×—Ø˜?U—(å4æ®"«5'Hë{ú‰„hÁXFâÍüçWÇOà.éç(Fk(*Ô;¾ví«ğœÖ{ÿBÎ3zùlïÜÜ^ Ë9± ÃøÜx€^ËI™€L+%¤G¤—”¹	~bâ,Œg¼À·0í´Æşl+0>Ôì PÎ¤ßGà£ïş*Œğ`ğáfìñÓòyÊ¼“—ªÕH=2‘›z„À“O¥ƒZl!ş^ID³{\F(¥”–BŠ£óçyİæ±€şÖğcfYû›B™–DÑà£càş|İg‰×ÂnŒf“3t¡—‚Ù+Ãl7$Pöa†–sŸV ›‰2œ¥ú¬ÜV„Ç`ÜI˜µKÏ·0b1N|qv0ïg•tf1eÜ'mÆ»»:‡* ^!&õOr_W–í½hû£­ø¾õ«%"ş;ÊÑ?à‚ÅàRq]ãT„ÀÏ€¿'×Ù;¹¨J´í[4)¸Ñ?Ùü_wTâä/“23Í·µ}Äìº~	—ïi{İVóı8q‡:˜ÑCl$æX\}Œ¼=Çñ‹ãß!ÂÆW¶'b› ê™n!&c¡JÒ¯»×H¹¿È`ÒgŞ:‘è'\vP-•@¦ö WñN]N @ÿÌx§òy4½}q§:Nâ7HJæi~a*ıœ„şˆ¨¥	µ›º
ôŸ§”Ü+ûù·ÈoºĞ,·/o\ ä°”èø &ñiÔù#p‹/9Æ·Ş`©
&y°I	$]BoW;À"‹(eáDLˆ;L`µ½‹ :‹0÷Ñ•í‚tx€›"Úû‡Q¢’¿±ò|RÛ®Õ  ø¹ì<o ˜ÿ’ ˜7öQ³>²ÄkÈìMpı´Æ¢‡èãão_<€Uü@Ï«ğâ!Á²RªÔE}‡«ŞAÍã+>´|ÜòjÀ™åÀàA©@´i}H24äO‰İ=…ë(ozÇ~FdğÄÓã'ÇtÿAåØğƒ@}ş:‹ß@ èo	WîsQë¯A¸zw¿®xÛG-=^¦ƒÁ‰*ÅTlãÀ£{}Ìî!Ï:@…s§Ù Ôñë¥
ºò ÊÙ…¯é—––ôÚDKDCÛ5>";S×ñ‘¶'zM[’Û	QxcMj°g§Ã·H¢ŞÒû%QÈÅEÖ¶chBXÈ9ò@ˆ“ ‰ÿ‘4NbP4?#Üò…A£™ô²¿`0¡Àp¶Q“QËz„¹dOCg
­½ÿE·iOAY}¨cAŒÒ‰&ûG
{&­jáşù‹/y$°¬âo7VWŸ„³Át¦YEÄÿ¤±æ"9;şiËğ—hîj?/”FB©|ß><i~IŸFãÊ$??`‡±5Ng`êòĞo©-›1&!à°´Gõ Ş­"hÒK(kñüˆ'v(Œo@Û0n5	nî$İÆŒĞM»Ã7×½­üÿì&wìòôK_ì”€kÑÊ¿Òd
ç:’Z1ÉL´D]9İÚS§Ÿq±Q†í.}hABô%3¬Ö> =HRI	ßw¹7°­¥a/&²W6·Îsa_!İ¼J¢¡tŸ!ÉÀ¿ÿ%Oœlæ:¶±:[ëma†¯…éYKk:ØŸAô%Š<’øËšRŒ!iì{ô 	å®ğõññoñ»È*“÷Ú¹:#\ÈqëtÀ(4Ñ4×™èÊ´/˜¬9¶YÇMòkÖHhX”a<–6ªó7×«¾ô~2Ûœ:Š;OÌøÊæ£ºV]YX\¹QBƒàC8æ˜ÇÄU¾©º%•K¬ŠÑN¯™zL&2Di1Ÿğ û
®§m«¬ïQß8^¸Àf‰ƒÎ7’í¦®)óÑb«ÎúiˆwKd÷Š’V£	Ôãv£›	;ËæAFN	†Kñn*‘ÒßcãÃı NqU.SAùC¹÷äG´g:‰-‰I1@şØEºIÃ ;’š4UX˜ÿr;IG#ûì&“@	Yñ'Ò=PIzd¾{C):·Ó¸iÛxfÇö¦ú)ë.ZÊ:Û'E²MÊi®JG£«ÑâØ•q'	¥@i™¸LñÕ6L‹ÄH@Î“n'q³¹UKàdÕh?{0£²	î†eÑ!¡Æ6ãİF{S ;–Æ‚CÄâSGÃ)EX‹³©œohÜN­Nël+AÔ‡°©/—ğ•[‡íhŸ-@±åaÒE8œM˜á.1ËÃG·Ã^‚	A_ƒ® ^İ¾‹§di)¼ÎÅtL†0:vY¢cá°V3ä?O]úÿ÷‹Î©şz—•‘=âS®á¾{¨ú{Â3èÊds˜5öcì*Bd#:°“¨J‘7–ƒ1_xÜ`¼"¡¬à.{şÉº?òô'”Ùq‚(w’9úùGA¯_1lÍh`Ò(!Oñ[ÎŸÒiùKÁÓ2Š¬%qWä0_vi79`K¤œµ²‚:É>|#êóFËÒ±ut ÊÑ[‘‹	ŞXÀ6}xË^h¬Q‡nÔšÍÒ#ëûóp$çä
³£Y\Ï/M?ZğqäŠÕvó \²<ğõ-[œzÍ£®(Û(ú6qçK†‰Gïx1¼]«}¦ä«Œ/²ZJ‡·€|Ç€‚y)h9H_Ã	WC¨hg
_öú‰n[Í¦ñİ	¡X]Ó,‹ÁN¾ÿÕnº€lYêIàwR£VUxÚò[ÛÄñ> ¦K¦'B„&ÙÔc5Ú©­¹æŸ’ÚÜÈ
È¹<ï1ÊÃ”ÇnóÒä'=¹51•±	Tt6kÔÆ"ŸdgH_÷º"[_)É·gK3ÒSÀé{KâÅ+Fÿ¶Ÿuk ­n&ñ ··ı—hÆ
=yI?^~#¤â¹ğréF»1fÕyÚ­úşÅg,ÆÍÛ+l$â>k¯CÃeÊŞZaÀ-ÆÕù(éª¿Ñ.<¨7ÅÉiœ\ì£s†Ò§$óqyLnâåô$ôÍr"nê7»8÷=Of~B8dĞ`8(ÕïÏ°vµ%ÁTÈ™øy©n–
åÍ˜†ÿŞ¹=6åI_Š 7CÁŞ:‚˜uî¼ŸˆJ½5†D_Å^=CcÁ”„O±¹rós pıİ>ÇNBEÙGÊ¸_C*ÑÂzÍÛÁç¥“€ddà$óß¹oÎ8µu’Æ=L÷Ñ¿>¯;Ò€µqh¶<Üf^W§—tš&tv)ïu®º&<õ®4é^Ì™sÉÁ¨•n|%X¯'œ4àÉ×Zµ"oÇµèÏZ•›õ"G=sQå@åJ‹€º#R¾z­îìH%î¤«Ä¥ª¦=Ù|ÍèÌ|Ùq2Ş÷(7&(?;…4ì|©¡‘`}‡"g
ªTõ‘ÓG(ºúòç<GÏS%D(’á¤‰ZW0=à1à¼é)Ğ&Xo‚«`şIO÷ƒã' }?bÇß¢:‘kéUöRn¼Y`s+lqcuin³ºÇOmï“Î…?“w¿_ª™"3RĞÔ¤¬Åg0'Ê&wÓ"”ZÂˆÎuekkë«Âl¬İ¼¾´8ÏÖænT_Ædœ<óWñŒ@AgÛìã*¾¨5ä¡¹D‰5ÚÕjn‚°ü/a¸ /õ'{°MDNš£r7³Ã|ml¹Ö†Ai!;¸Ùå¾Ñóœ-şÅFxâûFœ¯ÿì|§7°W¿7¿½m\>?¿7«ı·d˜øšalŞ‹OøWnÒı!]¤ƒ90©Ğ9ìaæè×ÿ…&Ÿëƒ3„ğ+ì[Zqr ­kÛµøÏÖ}ßì°³J¥ÓS4TcÄ"Æ+~m$n—ƒ¢tTa)ÇÑs>%p¤Ç.;s–Ú¨®â¥‡V˜¤€Û¦ÑFáĞtÂ Œgè7Ëµ¹#&ÆYz PuÖŒj	H uNF?n–òYÙæ³RÆXyÖA'‰4ÅÈ‘,õöˆ|6!XÃ(¢b©Wk6b·oÑwÂên´AÄB^´Èv¢¨y[úä6ï£İ>7\ƒ„u2bkªÇ‚•š‘Ÿ=¸Ìx%Ûpyjÿ®±KE\¼|¡>YÑ»Ä§J/f7õ:N”Ş{q©ÊÖªëË‹‹«+At1Ke…uå5´Ÿ—{hşd„«ã…Ğ	/^š"/	¡~×Á÷¢òO˜BPˆ‹ÙFlAÂşO=,[0ÒtÔŒ 4.>ä0n"¶HöW2¶gäÆóœBŠ`Û÷jÍF½†¿ÄJê¬ÖëîÅIãcî¾Cñ<`;EuxÄˆÓ i¤'Šê°¡'@#¶G³RÂzïdnÈjµˆ|8g	%Ğî5³k £è
²–²ƒî36iŠ†ZÒ
ÑuC2úeÍâî<Ç÷X}FÂrFˆLò¨ÌøŸ±÷€F¼¯Ø~}ÅéÙZ‚|c£…(VŸE>Áˆk;È2½ÙÎk#X_½¹YÅ1î <‹Ö«çı¶`¦¥şQ$ò:1úG¤±ùœGj %õ!ˆâËˆ—ÜoÀ•/Í|JzÅô`øJ·ŸP^
¾»5{é^Æ×58”#%ÛÛ;İ…Gqê~™\£˜¤Qü†Ÿ›TãáçÙX½rN.—gßÚ’:!÷gL	ñ†‡ŸßøÕÆfu™Í¯®¼¿x#,ÉË‰xõ¬<ç8­«'LÒyx»§ı Êÿ(|c%ÀËëø_Åÿ——Ğ!•P|‡+ÂùV6p{~”G¼É.¥DYàõQ’ÛOIi\á%ï©Ÿ+#îHeÄ¾oR”‡ïÛ#öŠ¸Ÿu(¶kp?¸Á©x&Sè_é^ fJmâÂÅq÷‰?¥ÍàÆÒêõ¹%¶vsıF5¸üC­3xÄìyÈó@ƒ?˜û)+sá‘¨‚XøŠYë%»¯ı?!§óçœYëêæ²¼|@¸	¸˜Gÿæø'øï_åşğ'ı•	Õ?¡Ü§ÃnÿÕ8tßJ©Ÿ–!ğzX9œoŒp°¥ a0ÿ¸u0BÛBœà".‡¡u\§üR7¾k½¤½ ¿å<6suñmb$O¸Ghk}Àİ!Dñ"¢¥ÆÍOŒûáüP_‡ß}ëèİ·Şc£££L\æè }Ç>lDûxû- ı´«=¤ôè‰«¬ŒfSšcŒ>éâ?Ğñ‘·f˜º3ÃR
ƒC·Öî+ÈK<âCİ…W³‡”.oÄ!ëÆEí‘,~åĞK£¹N#¯€ËÃïªÇo5¡•˜<€š{›?ºÑ…yœ­µnİ~¯|ë¶ù8…<Š7è»ş’@Ô^è"ä=NàÆÃãFÉV£kÜœÖïÇ;;P•´J_ÃEÕ(^Š{	ÓsÚãµRI/jÕMíµjö;ç­4jFÛİ¨¾óaÙÈ~ÛãÉş™¸Ì{eü7PÆ"Oæ —úÏÉŞI‹@<©€yí‚ñ:·á7RÔàÌ€ÀÃªosojÊ¡(‰Z{Èj­1|\Ü:âÏk¼u˜L­İ½6Ã†êˆº›ÁKCiŒ ô}¿–`p&}o´wbúÂıI‡x¢»K@sm€ºaëàoÂ£¥³–Ä°‡E³÷âFı=( ÿâ£Göd©¡n¤ëİ&¨ã}¢=Ó%\e>‡0ƒÈ0ÌÌt™wf¹\î$Ñ=|Bp&ü™EÎ7êÃÀ"éštÃÇİ‚JÄ/´áC3ìV¥RÁÑßı6F´rh"²Ò«b@åøÂ3÷i¶höW8¦Gáoê{W{Ù'x%{¿ÁyP¦>PüšŞo£‹¢8Œ Ğ
Va9£f¯êgZ#ŒzDEG,ÂĞÜ"ÅgŞ/¼³½6Ú´@t .'•r6êğ%«ööp« "æ+;@{e*D=q$[eÍ—q eİH`}ÊpÄ¬q8H ã2èBŸ-É4`İ!sÚM¹Æî¾øışf„øó¾~rü-·Šºüö¡·RØ˜¸‰‘â^uß|øĞF9ş7†j#^|"ÕÓiç‚ÂÀs¬7CˆFÄ)ºùï•»¢Ñ3ìî\±ƒ¸ÇÒø²Şİ˜ÄÕZD©æp.É¼Ök€†Hù×Ø&"Ló½Æ‰5’iš&¹r÷İ·ä’ÖùnYRŒä¶ğ"#P³åK	>Ø-sÈÈ%ó[Éÿ­4B<­Ä	)JÀİûšİj0fs–å#‚Caœ±–äEÖÒƒö¶AdÔğäÀúá´²!Pm¿âÑNÔİŞ+—ÆjÆEGŒÕP$ÅÛªÁÍQ>Ğ3Î¢u÷bÈ][İØ,™Áº<~=q"J$Ù€d½yĞ‰JsÜ©ãñUcÿ˜Æí’õ;§[¥f®ƒàË±wPz:ºk>o£—ŞáÎUøæ"zãˆ¡i&5ÁrÖ_=Ò_¯0h•ø£a«G.ºuÛx•ñÆY/7,f¦ÏO”$µnMÍVcS¶JŞæx>NÊ¥÷AÂL,—Œì!­Š$H^0Álú'œuV†‡†âÑª»N‰ª¬%Èv¨-¢N­&Yÿ{äluÚ1´Óõá„gû9šÕ^|A¨¬Cˆœ˜×pIF‰şÿ¿–‰áŒ;oÙâ3]¯òüú„+1yúX#Â4A‘d„—£¹/ÃWÔZ ºÅ›û°/#~ñ…ò-C=ÁúâæâüÜ›[ª®oÎ0É„k[0»½n,×áÇ4½İ£“'¼»¤Ï9ñùî7`ööLâ6\ï¢ÿ ÆÜ+¥Sscm˜²Ù
WÆ˜µ£iÖ‘?%îÌáLy¡ºTİ¬eËƒ1Y`ã¨W¥¾òm¶¤ª¼¤QÊaÊÚœµCDcq»3g­k¾ZNÌSÕ0a·BÄøM³)vfjƒ2.>QŸN²B²NMßõ’è5R\}ûş]àšøÍ¿]àÄ¢öv\n®/âZŒ‘9”uİÀğÑ:òûŸÔ´ÃGwß5šç®&h°¾j²5Ñwd„œ±Ÿ€yİõ~¤&”9e|°BsüÏÿÌ2—ÚşH§¶ÛhSë®UH]ƒÏg'’·ÂT¤h?/7Iíˆí [ó@?€IÉ´Iú¨—FÕXÃeâ¬e{4‚º'Ò„q²¸=ìËÄ`üëFåı8iUïÁôk%Gt¦ƒkÑN­×ìÊ±Vš¨²,»Në<nÉ–~Jj—˜¥2®[õâ|6ZQÜ3‡ÄÃË`X¦ÇİµŒ ·İBdåFsD.CÿÈ‹ÇWä¥Í½š—7Œ©–ŒVo
7jŞÜĞ6šƒˆöİv¯%mÅê[ ØïÁõtáÕşYù»49Zoì6²«{q/ñ\æAÑÿÎMõ@A“3<aT&´¢ Î€Ié6çK‚+²Ÿ³ÃßÙŠ!âÑj¶aN‚À]Ò`êäê!×*]šp¨¥ÙMJÊô§%¹ TĞœ,Rv½fÄõ•>noPf™x¿z4qf>á\½š›'0¥‘kşÌDúÄ1@¹B
™†!ôD™Ë™ÈtÉM9ı3‚¨ağG“æÛJ-ä04û… İEJñó)Ÿ¤Çg2m—õ¿åˆp—ŠSÊnœ"‰•c"éª‹°†«âX>ı‰İòR­Š$«úîëÅ¸r²°¬ÑLê	CÔÓ¢fƒ‡(:BÍ°›ks›Õ†Ê‰Uv+#l~½
wî¬-Í­Œ°67×îÈgÜZrÒ'ëö=…°ïM§je(ÌÀ;á¬'Ï3L-²ññ¿ÓÌ6z’'#êØtˆÂÎHúÊ¸ãº*Ø)×ÅÇ*‘]øSX½°æ·b¥"Ò¤1DNä|yñ/h~ÿ„‡Z»ë—d€×cùj"q±Õ«Ë/'\¼è“Ğ€È5×/şÌœ•ïƒP¢ç›•ûZ®Ü~Ñ|c˜
1c°µï{`ê<"á${™#ˆ°h›²šÃå	úÆ'½˜£†Ê¼Çó@öqô7²RN;Ş#™[ÈÅÎıÓ8†˜Ó)Èô 	ú}èŞè"XYØ	Äu~"ë©n¢Ì ‡DÎK,èS×Û£]ø°0•g‘v^;:åØ”b#‚wœj†ÓŸ» g	"'N9	…¼yŒgÌ2&2.ùRv:òaêÊfßˆ­Æ±_
Ü<š„>Snùóğ|ÚÙ‰‹‘ì:½ÆãÑ,Of4¼a#øe‰ı¤ÖÉwªY^	â»ÓÕÁõN’µÌošDÔyµº£œÏ|<pÊ*ê–å<Í„ıR„]¶¡Àt\U}‡“û‘V`–”Û¿\œõa­…øª£™Ç-ø;zeºO
«Í¤–îMJÆ5åK`Åi×³æîjÆ\i½Í15ßõå‹¸k›xsŞïïş¦‰[ÎşëPE5Òn¦×òºÑÊÔYÑJF†p1×Œ’î&šdv3ô )×}YÃ¼3	ÆÜæ^|‘gZ²|QWÒçÏœ^f¹†ÇşÌO‘#£n8(0Æ–%ñ~SI»x¯Q¯ËVUŞş4p6«Kg ²PŒQó7êÓõä#f™g,JºA¤¢ ŞUğÆyğÚpú(?ß‡ç”ákkÓ×ˆújoêü™,(Í¼(n&°nI Ä‘ØC­ü`tÂk<‰R§HD#¸€­ø~ C6Şå’Ø®½;Ò%ás&İÕBNgÂ- k•k-9ÿãú	\8ÛyÏM¨A<v¡Æ\\!Ægq§=ĞıÑ‹¾Qğ uAÍUé=óäMIz³òÍÍyv†´[kuÄµBËzmN¸UşAL”Iá!Ò‘îãfŠÂşi«pÕ¥Ü5â¿³ÃÖÖ €Ì$U¦gÒ·Ç/¾Àè
>z¤a ÑÆ½d» `uŸ®}N¾"ÂEãÙ‹è8Ï×8Ç›«×áÌ–^UY@§0xäGŒ)±3{‰¼«¯ÕúRoO;Íz²¾øPÚÇÁŒ›Zûêá;GÖpML¼./1ˆ*°ï9š5Ú¤bÚjÆ°!´™-VFG	ä²G*ıÌ¦K%‹Aéâ“yHÜŒLÒ¡E*Öé¥”ûY@µhæÜ$Ú¦–úõã, „çƒÁCge}“«ê+Ín€.P¤–}‚úÛÌõGOVÅh™cĞí—™WOÄóœ{pB|hW@8As:šå£Ú6r`B¦`Ø`9‹AvÔõça¡{Ç‰ ÒùÖyäÂH*ÒW™!?}véÀ[æõ´;‘ƒB=ã•¡T	\|…Ãåãì9(ğe»ºRü˜‚¶;¸,Ee„å)ü‘©ğ£äª>SFĞÔlDXV8Dÿ^²…Ÿ '-Šœ1^âfé”Ã½Ú1i–¤2örˆ1aÆå¨AC¸Dğµ~§Ö=%¸³Ñxİ‚)íöUJ»nÒko#ö| O
èÜHWàò#vûdr€€šÄ~Èòs‡LSè¸T.-.Àe?gÙM$µ~°·hÚ+”ÊOLÍÅñlKïİÄŠõZ°şGÄ§V“330Šlî¤9ô£"Iè|ïäE ãi0ÑjNÆ$ª+”e0ıe£»W.‘İ—P5û\ÓßÍrˆRt@î‹rCØjöÌ´tá¢²€©DrÙsyé
—WÜ	×Øğş¤7Jæ^ÍRAà·QÚsù’¶¾p·pãÙş)üà·f‘}÷ÚüÄÙÀgª†3Z7%¦S‡¸ÕûN"Î|Ä#8PB>x½ºóÎ´èN£s§Æ”Ô“¥Õù¹¥;Õ¿¯ÎŸCoŒh¨\zòã&ÎÓÀIò-$…dIï¼ï±U8eôe#DH½ÄÚÏ"Ze9K,;>?~vü{æ=Í/¶Ó[«ày9)ïÏT—İİ>´œ]ıFe8úÏoánÅâkÊÙÙrœ€Àˆ)ò¥·­Y–&­”³¦ëg'ûêg§4k±T[3ÕÇŠíä^[Ö5vWÉÛºõH*x€ço8Ú4jØÈ«½[kİµJšaw7öâ}<ïZEÅ;ê%+6Aïš¦_ßç$–ÕÛÈŒûÜiœ«#lòwYŠğÇ^®u÷àD}¿<.½ÎÙ(£(W¹lÚdm(ÏËÄ9S; °ò3÷[ñHhz?‘6ÇiÇÀª0ÙLT'Z4‘c(d–ğ°‚âî	*%¶§”Ó:(¸õ Kßì\’Äûë$ïÚ®.tk	ÍGao?Ç,HŒ?ç´ÄŞ»Êø‚)J—æû¯9)Ú½|C•òÓ‡*ÒSDéÒë™ æˆ_¸Ëb04«Şï ø“Å\²ÑQÄĞŠXµ%5‚nÀô±µ$j¡zaS‘n”ãšpx(`/È¡+¤lghÜê˜{ ê÷'à1“í8æÀ¶‘¹°{×á [Oâµ¶b:êÙTø§Ñ†~ÕšW¥=öÈ^{Bëo<6á>İÇ`ü¢ò%]B1Ésù1Æ‹ÎĞé±KÓlKtÈ‰Hşñ¨-œšÄ;flÑÂ-èa!©íGÉir„¥kß*W¦GÚtÁÁU¯NĞ{t»XuÄ·ë½D„üW&à¥„PtW†?«½nÉ}İğÃÎÛB7y¿)½_]ÌØó1ğéšuPéz¦—Í15ìšarµ+'àa@P°¤C'5ÄÔ¾ÊÛ2Ë%mä¾à;™()ŞåÙ*ÈQ(œÍ§á.”PÄQ„;E³=ş§‘¡“ï¶˜ú¦¯¹ËA ¹?ÛÊñ½²k¦_ÉùùQKœ"İà#Ñ×@¤_3>çŸ€ïáÇŒ¸ã–e¼¢•VTöQû¸®Õ3øêÆ”¸\óp“õ;ô{lJ^Rú{IlÓ^bİİ~(ş°×BÅ;A½S2İõ_µVlÆÓ•$ƒ¬G×ÓÑã3²kZ$Œ—¿'§-•Åü«9œÙ8Fg3Ç¯…~şšò1qıŠğF^…W!3Os–cáù¬r$š½F—œl‹‰€¼›O MÕön£…[ZÂ3UÀ=ˆÏ×b|c§ÅŒé©f¹=Éœ#®ÿšéj†´É<æ©.òæKî³-÷ø 6
ÇXLˆ>	š‰UŸİÔú—2)z‰#sô\Š?ÀŸˆ%²Xœ|›ş.ÙÖ`üà“C&11†C—ùª­åbY%qçlÃic¤[ñ}öAœvdjá½ÙÜ..ßëä åîFãzğü=ïÄmøwC¦™Ÿ5L.xf—3—pÔã‘€BêÂæ°û^ÖóK~-ÔWWLñ3Èf!&}‚'i§Y;(z@PK+ƒXğLy^&ÚAC€	g\ÄürÖÚ­ÎÒÂÜ¾”àAÂs?¥ÜjÀTúp¤Ã†ØİåJKˆŠzzØ#sÉßÅ½Ñ‹—3¿ÿ~Ğ¡"våÄ=·75–™P$ùIg*EwÍ_8_'q³9š¶â¸»'~mÕym?IvÓ‡?³|Â¬%Ó8ıX(~è"ïè>h•:ˆ»¦HÎŸÄ³3½Ø©%©¹Oˆ§ÑãÎsy„ eGØ¤÷D2;-?5wzF†»ŞHat`§ô¬=ØõW¼9˜/ÚüA‹xntkpğR&âK¾#f(HJ$Våù‰ÈÅi©ÿ×/Ì|Ã€yÌMÅÏ£°"ÿ Ë°ãÿN–_0å‰¯şºd~G(v_ÛÈvÇäÁ7È…óSîÂ‰'ßç$_¤PıŠjşİ‹_#&éïeÄÏ¿Ãê°T)6:iX|à}<±ÖC|Á“’•Yé•¸ÛØf8êğ¾­ói×Gãvó CSB Rn&#å¬Óöl#ÆévrĞéÆ»˜£¦)å[!<W—&Qƒ:ÛíZ»wÙVDë>¡PŸÇàF³‰V;‰ã—e‚µ,Š Óæ	whÖüÏ´~9ºgµXfÇÕ°¦ƒRº€Çã6^®sÌÀ¡“»±ş»ÂqÍMz–«—JkÍå¯]=ô”¥ê)€Õiz
œĞQT¨J­’Õuıa‚/´¤kúCî õ¨vGA Z‹«F< Çm=­ßÊ^Q	Ñex¿ÑêÄ	ÂÙWZì:n>¨{8bˆ™Ì†*•±m‰Ô–ÏÁÛÑ}z›£[QpÇB-İÛŠkI]!}Í8\=ŸÚÒå˜O
°_ õã‰j% €1úŠrÿ–‚D‰"`S~Ì‡‘]‹(M¿ÕH—cX:TR.D?H˜œ–é™%ñK¢]»×Øåà]ğÄŠøUÖÏná‚o½Õ¥ãÊ#öY#Ú¿™ğ·×ÔOS^á¯{ñíéˆN8#ôJr­Û»¨.åwJÙÓÆ¨~Wğw6ª
Hn¹4V®tâÌŠúu9±ôslŒmÿ	«;	ì†´‚ß
!Ç!Ø¶
×=şåû’NÉsC¶:ƒÂ““ íÛŞ«uKlµŠŸÄ{œŠ…¡bï^DxííF­9&rkcŸÓ·ÄÊ‚1Q®á[¢ÚÒGÑAªËJ’µk—xÙ€hI&~Ê®èéZ²«´ÉˆŸ·3Pöl2aXÌveîØşaïàp4ÇlÖtx¿v‹Öu$#›U€â´cäOŒ&j¦‚>õK®Ó>)HóÔ`…÷8§?$Fd1F-Å|{ñş&~•«”~”§ÆÇÇ‡m8L³ò€1]Ì|ÄV}Ê`ÅúJ¯ ¥9gÒ¸–ƒ/‡&‰Óóá@~Ã;.%Bj?¨HìõvzÎnpQË ™Kv‹V^ZİúG(®‚¿ËV‡L´ıa„Ñ‹êR%ÖgQx¯™FèÂÆ‰[ş²Ó¸E)=Œ2ˆàúêw~Âª‘†yÅ»¬Şìš“yÅZ²•çº ¨¯ÉËnµ{îeXÖĞUmXaÏÓf~ös6X<„já2
/› UwUcÄfº·{5ÄïEº¿ÊæKpç”¿*A3©bW/Êò|KF,¾-qyjØD*•‚¼£ck´G÷Fo½3~oï¶z™gëC[»Ü£¹4Y8CI·9Çº¡f7Ê-Ø¸ÄöğÓø¸;ZkmE‰´'Z^Çê–J:)¯ô·W:Æ¶Ùå¸İÀLmÜ`8åKË§Š—aª|ıé–EÛchoÒ)¦¹kØ¯Ã–+¸Okc6®h)€ƒ¹T?}ñÉ‹Ï8îşWtÕÇ?¡ñàÆc~ü“‚b!ì½G4-pÚnáÉw
œ£¢ô£nÜ]…ö·±7©õÊ›qĞR›ÏFÚòuÀ8ÿBo¸–u?‘îAõNØÙ¿µ0>I[Ajg¨¼Àİkúê#>}ñ?Q%òäÅÇß‰÷0GÚğ)W¾ê=Ûf–I ^ıŠ%ı>¦0ø-jI>ãX…Ç_WUúëàñ­ß`“°€§äğğø3ğ1ÿ‚?d•V†Ì±€)yHH c#ÿ›ˆêO‚†ÙRjˆXªà!R4º#”ÀXüw§ïÃG÷A>MA\m §ƒ‚LnA“j3Ô5§¶ÖDWäŠ¬ÆÖæ+IhŠŒÙÛK¢«p.1LX…B óGh¨5iË kUû£ÚVŒ0r>$b"]×32n’-†ë´cöAÜŠŒ~Ö,—?üÊá£môhbí7;“Œk®›q»‡¬Ã Äm)°ÒxZÒá¼©wš1È}âq6Æ¦.©]ƒ?Ù2ŸTş5^¹d¾ú‹şëì9l!‰¨æİ}ûpïhä‡ÖQënöPË~nÃCéQ*ÊîÈk.ì6Üºô÷òáo‹cµ=†ö¶¬Ç‹¹ªPtÛá¨B\aŒu½±³³Œ£‚FÏJ;Ş‡]xÔñ½ËqÆËÃöëÑ¶9ª¢Ì161nÍİi´İÇ±m²T?å½Y(+¿§Dçÿ!Pãş¶‡š‘x¿ô®§¤Kù%İ%Uîï`*Å+GŒô¸¨Cşú.3dwRVÛïš•`ÿ¬^9bÒ÷Ê¨ï´´J²aü î%a‡ÊÇLbVÏ²É‹4
ß¡`¯07¬Ö&º±§5ª .<^ŞtwÁÜ=™)ˆJ»ÍÈÆÙßoĞ“TÙQy¼¦DšQÌOt©[.mó…o(¥LÜ¥W“Z:à¼æ'Ğg"ßõ3¸T%0ù&ÆÖ©@³:~úšVk,¶w’ğ‰Ş6\‹ìÖeú ßÛõ­UuäE7=ëeã<ì{¿ÇÍUı!« ©zò½+î}ˆì÷`nû[Lw6z[J[Úï¢Éÿ.ŞY®µaRZ¢b½×ŠZpbôTˆ«>é;3A-÷…XÆ¢„ bÍ$y]ùÛ—‚ìË“?èmÙÍÛJâZ¾vÃ¯^WXï*…Ÿ÷UR8Ê<ëö«\Xºû¥°ò"¡ùºÑ´F	ä©(Ij’wl%bÖá¸h›MJ:üX&¥ÇX¼˜Aë!_¦ÕUÑîln‘­Åpâ‹Ç&'.‹SZ#	Aæ{Á¨	ÿxù[Á2(×Cî8 ÀQÛ(W^`KÀ^ÛÛlYT,›SçIK
ó5;ñ$pSXogÈPĞdV±°(¡ù#nI}LvÚg
[';¶p$ûìk½”	Â0úËÅ…*[^]YÜ\]_\¹Ã´¸²Y]ZZ¼Q]™¯ÚDW“›íÕxºÑtqø¢ĞÈÌÉãüøáø™ÕÚ¥Å«l£:s}qóWl}nanšºùæ$Èk±[è×`í$©å€ç-|xü#¹¬
ºÄEuÔ¦Gí±›Ÿ¯nl°_TµAüşúÜÆæúÍùÍ›ëUöáÜÍ¥ÍRáM©_Û1ß÷œ½< TõÏ%²¾îQ#\hàÑão$ oûWxÌ¶Ú¿0·9w}nf`şƒêòvbãW+ólu~COæ6WWJƒlÅg€·“häwÇO2ßŸïé¾Jø;XõîÀg”±	D¾P]Â¦¯¯ŞÜR/Ü‰l*GºúLâ`)W%Â1ıƒº €Mÿ˜”EéÕ…ÕõöË¹¥¥ê&µ·úË¹õ…6¿º²¹¾ºT*$	ÖjÊğ@k1-BÊfˆÍ.£şA¨íõ¹qóúÆüúâÃ!ØğµõÅyw âÇ€Ãü,Â/3OTr=È¶Ô9As×›&€€‹Œ°_üj[Y]_^ÜØ€†‡†x Á'ÌHOrü[X™¿f™4Ä5“²wWô¡yÈõG0%?*=’8ş°º³<·rsn‰-W—W×Å76—–hAâş{saq“ÍC‡×çì^…ä¬'âd„å<ÆVëY;ı‹“ï@0æËË7Wç©ÍH6p(h³ºQ*,àõoó3dÒÍè©µ>áşœ¬³6ómé¹§İÀ Ræ–×æoà ___[˜Îª+7Wì-(,[öoõsëo³ıQnírĞQõHîàŸ¨8
Z£~dµ{~v1èkë«›«ó«KHñï/ÚK´¨L›#—ajPŸò¦ñõàvÏu~i6å  Pe*£êrus÷(Nï\ŒQÂĞ×ÚÒâœGš	‹ĞJ`¿ÑBå=yD)öå‰Tê>UBcXQŸíáPëÕ÷«ë°`q–n¬Ï-³MX°°çqyÀŒ}X]G~•'øğû	–ä'äätœ!€&*Ô9CÆ½î™Ø5Uj{Ù36‚gèHu]ò.í–F7—«|P€ÊäÔŸ%òHö;ÖÁ	ñs.WsIï1E0«¯<tØ'>é0áÜ‡ÒYyËk«+(„¬WWªëÀâ–ª0À°áX¬neşW¾Î…N&Èôçn@	P"²Ï¹•bòÕõRğˆ²¸MRn^çÆ6ºİÕÒ”]õ˜™ïæ(C¾÷PiÃ-g“—{ªnÀ+tÖA¤¤“·Ğ¶˜ıE4xQ9òş¬‚ç´Ğ|	|v¾Ó¸È <»ÇäV-ùhà"òëì|Á&4T5p‘	sc3ÒPNHú›½`A	^³Ën8hi9RÑìf¡´À°¼2+u`—(ŒˆğDxû¦™^köo¨wÛœ½ÑŒ·Y!¾­p²pa'cQ7JZhûmì%·4W¯—SF?¼pFlé^¼ßVÌÁs<³:FŠ57¢ÏmË3ÑÜ<Ôë›°3 ä
«©kõúJ´¿÷Óã¶£}7G……w<yô¢ãOÑ­ıF»ïWĞ2^F”¹Œ–ù^Úyºä2w•…öŒv¨ÛšÔVÕ>ê?ƒÖ“•¬Ì9í®=^è°ßm´ÈqI¹İ¡‡ úØ¥İŠùÃCê‰ÌÙŠÍ²©wµr¢]Øï£z±‚ëâéş%ÓÍù¸£0kş56ôWSS'¦§Ñ¶¯U7v¦¯Dã[dôÿ«‹S;ÓÑU XYy4Z×˜iµª%Cäó™ğ¼ùÊï	hV£ú~å|~üˆÜ¿§räKYA¡×ÈsæSşR#Mz.¾eõ	A‡„èvlH‡Â²<¡'Ëº7~ç²L¹7yqzdbúòÈÄÄÈxåÒğmUè‰ôWÂÅ‘KS#W.ŠNêæVÜ³MÀËìŞÚ®5·Ëãã÷öFß™ìÜ¾Mè„"jtw¥µáÛ†yÅ…}Q¤ÙZ©:{ËË7ˆK]O³Ì‹jJÕG(m™îfÿ2„¾±ÌTÆKŠ—Õ’IAS†±é@ã¥8=&üÍ”Û×ªĞñ—ˆq%î²¹{ óPŒ…"á¼âXÆc´T¦5×²Ü¨]·áÚMæúĞéãiE?¡HSªô3ŸÇ³¯õ8tøzÄ÷qo<®o§Ó'epÔ|Ç`‰ÃSNÔ¿{ñúÌ_s—7: >!—µïDé ñ€ŠÎ÷^|Y1»c½	ÂO£L‚èíE,­NùşšˆÃ›`hiµSôv‚?X‡A";Qšro2`İKt¿då†<xH£ò:8¾ÆQSÎc’ÔƒğóúP™éâ³x8é'á¯Jâ‹<|Kl+™7D^'ğªş+¯ˆp­ôê¡J»Ï°×dcƒ|C$Ñ¢Çdg¦’Åzâ4ÊªM\]Òo©và¤Sƒ£cğ¤¼0ôÀ¼…|AÆ&ÇÙhë>ğV}¿\F:úÕ¡°‚y´|nz‰ô•ÅÓÆ®LK¤«ìzò»ªÌ#MA%†1§ú‚W)`Ÿ°³°Êôæ=¤¨…ŸñÎJÕÅÀ	#¹°˜·“ƒ%×±3';ÓÓ×IÙ?Ö’?Ò‰[°ëê•_ã|x„,ß/HünÕíxW	"*’†=>îY½‘pŠLºÍ’?áƒİ89îrò'wq !ıï”9òdôh-yşÉ#–ÀÔg‘?aù ÙÎ<åaÙ
'è~Ö†¿7áB€CÑ÷)K 13&dx.ĞIÑ)Çã7ë¹kØ]"‰cÂé
€£`W”7ÆÄ@·ÜîèDd Í³Ä×T'Vü<ÒŠOY	weÂÉ’ìÊ÷Àéu'‹%	×³Šç²XÄÖMvÒ˜ÆáÓáá«»ÅÏ%“ãşç§áyD¹ÍHfÿÔºšîÊ‹„xhëdÜÅéåS9ŒJâiBwµè9ô»V?rUƒyìe.Iİû?Ÿ©x¢3éNjªi'Ó­Â<Ø´†´ï^ös®Ã·Ã³§NUø‡ŠBB÷x-G…¯Ğ´{Ğ$XÜ—w©<RšÌè
”#O3jâ	®èï|è‡Šqş˜Ù‡"'M=Š7‹ÿÀüâs8şŞ0ğÓ™£2ZKCG3ìPiŸÜ½ÀÅ-ÊX€y9ˆ-š¨-Ş —l(0í9Êb¶8ï;ùü…GäzSêù1cƒÈÉüÀOFc×ØE$æŸ Š²‹ì¬æ–rñªó•Cïè„®øÅÛ~ÚÄdÏ£ãD	R:|?¢(-Za&áì{á•§Ç	ËJGÁâ[].ã0;át(œÈ
©çqòf_ÖqšsÊ™¡r
 8y‹(“áÀ¨Í¤‰ël©0¹à!z°Äs‘›E	–¥|Âˆ‚µÙ_([ •€–›èÏn	M.§‘A+\UÿpüÍ‹/®™xœ÷}ƒa‚é.4j»í5.éQGNšÁ.8W<èzÁä¶î0³¥\scË™q¥Gğ˜<4în~ò*Øš¸çoT¨ŒãLãEòI°ùRŸÂàÛ#@®œ\^÷v=ùì÷¾›ÄE£ &x²ÒØœÈçz|ÿjiœc ÃÄCøuµDí9$.öT5åkıji>´âïØÄ4ş¤_›lJş™Æ?G&è/,ğÏå‘‰+ğ÷¢xjZü½$ÿNLáxëü{‰_¾,n_¡K#ù™íøàˆÕMrVx5È§Ù¨w÷®–&*ÓıK^j´£íZG$1-öü?‚ ^àm[çï¢ê»– Çè¸ññÒˆv§V7B'ÿh»½ûş-Qri¼t;¿sçN¢NTƒ÷Û;Øîƒm/ŸT©0å5Ääd»°|ïí~õr ÉK/`¿‘³0|Ù·
³½~ø¢}vGd.°‹† Hå'`×zşâÁñ·}Â*^|Fğ‡Ÿ‘ÿàÇ_q³«táZ‰ë¸Ã´·÷’¸-ÀWr·—†Ò#?©ÃÈçöÚ.®C#ªÁêf'æ|¦lšF,Q&·	Ámñr1uf`ôîşøŒ©p\–bU¸ÿ|Œ	yé-\ê›××ôÃ»š(óv¶_«(w¿k•m¨èšáİ°·Û„Š:dYŞ‡óøPn²Pş9Y½wçå/VÖš•@Tš<¤n9=j¥ÃwÉ½ag™TQÓPõÎ>¤ÿgM­Çß’	ø™î3ÿÈ'úŠÃñI,Eu4ÛRœğùk“jzäÚ·æşË‹xC²çC²qø)Qª`²ßËÄE§ÕûrÏÖ£İˆOçH®‘¨ğUlºû“¬,äÑÑ>%N*Âÿ3‹şĞÄ®ˆUÈçO´ªéUmºû­,äÕm¾Ş%ç¬óg|vñ†ã}ƒY—Tø:üÇ?ixWÜĞÂÖ’˜œº> ãm’¯hüäYrBÏåÑGåÕ1-f^âŠp}Ä‚lÕª¡5øYç>œ(£¹`wE¸TŞù£à+_ëaìWàK<;¾øRœÍ¶\C{$Ü`TlRK÷0Qènt:îƒ4j0Ÿm8‹nÖÒRäP±V¯ÉÒy÷ùXĞIŠKzí6,‚!ËqøâøxÆÔ:=ôÇ£k²µœf {ûĞƒ-¦©DÕëÎÛÀ×Òîz¯=|D<Mà…½üø³n°Ìô_ÁŞ¦âƒëÖ7‘ïEÉyÒ/¯ïƒ¨–t·¢Z÷Ôœ[ŞK¤`«ƒ’°õú" ”?p8î™ş)´•Bè¿0Ùš cDKf››mpGèóæÅÑıN#‰êTk:ßŒjí^ç”äÜ¿È—FÑ¾¦FÔ¾ŞĞõ…×å ¹óT›”7PP·Gœv´‡t‚ğJÏ¼S­Rªë”´İ§¼—FØN;£jçõ7$=tüûã?ÿ$ Îèó£¡#Áqh2ºàâ$79ö›?Øn#³¦ ñDîãiæNIÌùÅ½4Z¶›1)Ûo¿J>¥2ÀP}uõsz7|NÏó$õsó0×oõYÇ}è½ÈJwàæ½%Ñ\Í¯İd77—ÿ \Š,9µşu:ìôØµklüè¯-Ú~üÌíç0'ÍkXê)¯Ô¢ş%á:T®Zò¥Ì•u½$/ØÛé»èÏšãCU¨Ó…¸üË¥ªsklniiuş¤„ÁùÊµ
jÓĞaçÏˆH×F”|BñÂË š"u [¡‡ònß¬fŒñCüÂhMÔò0J0#:—Dµ"Q™ÊË?ß¹õ–k8"áFŒ|dvš1™ºLËPÆ2ìr3¢ğd8=‰™JT¦ƒ¦àÕ:ı‘ĞH#şDC1Æ™2iW†»×XÉôÅ‚íˆ@ÔÑË¯àÁÂ8„ñıæ]UÉ‘/ÔÌ…Ø¦åÅƒoe´íZ­™ÀÜxĞ«V<¨p8;¯ƒØˆö¹“òÕCúsÄºğí(Ë†võP}µÖ$:ZfUrJp«£f¯]/5Z® -V›SœßP„¬—ŸSÏòåÔiüîa­X£Áö=l¾uÒÁ?öu3ØÕCó·ı´“dfÄ¾ä¼ã›=ã™œÁÉ–²;BRjÀÉŸãPÉƒÔUu¤*Ü3É›ÓÎşõ™ëÓÌ›ä®n_ß× øƒKOõ`ğµÏ™¹[ïšâ_ öœzø^áÖsÓ ü?*ô4·r~LïÃN³ª=W±Øİj7ô$çÑålöôä…_õz.%7x†ÎÈ„p:’ä"‰w—ÙHıµŸ¶¢Läq+[·ó$œ²Ouÿ.›´Æ$t”Ù<SÅ§ZY©ŞªõÄØJ{£—.š9âœS”'Œä’
Ö˜†ç5 ”§Ç/³íq¯ÏÁM¦—'í|A"ÍÖ£¬„ …™eğüb×gè{›¶(ŠÎS÷/#VK"¶Õk4QQF€:tæví5	s¤gz"¦‡æï~£Òª;EÖ`ïn`¶ç^õm®3ˆÚÁkÖÌ(î?R…CMË”;˜ÕRL2<lÇ™†6Ãš“ùÑ’'
ĞfNçVeè)Şu+îvãëÛ¤I‰Â+/¦¯¼T:bŞºråÊm…c0¥áˆÃ½4;¬—¿!„ÃãÆ^š“RétTrÒ_»Á6%HäêS98å•y“«¾œ·gÂ5R²b_p¯1‘0Ò~ª+²NñÛWÇ/‚Áˆ¬2Ô%Yˆ¼`–bGzJEUÕV|ƒ&gÆiÃàMÇ´Î}6…ÿx`&&¦‡İu^œœº2ré2ş¿6bvPïŸÅPÉfU¢S¼7´ÿíÃ¾6(ÉÎ :£ÏyÉş1OMÈAùÈA´ÃİÚ4Ğ \u£_¥ñÌCÌ+»ñÍ¤é0<„[ã·á€Sk²^Ò¼ª½pD!ñqi!ñkê.ÏmmlÏªŞ€zÌníğ»o½ûÖÿ  ÿÿ ÿKæF
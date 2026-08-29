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
        ? "ØªÙ… ØªÙˆÙ„ÙŠØ¯ ÙˆØªØ¹Ø¨Ø¦Ø© Ø§Ù„Ø±Ø§Ø¨Ø· Ø§Ù„Ù…Ø­Ù„ÙŠ Ø§Ù„Ø§ÙØªØ±Ø§Ø¶ÙŠ"
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

  const handleSaveConfig = (id: string) => {
    const db = databases.find((d) => d.id === id);
    if (!db) return;

    if (!db.connectionTested) {
      showToast(
        dir === "rtl"
          ? "ÙŠØ¬Ø¨ Ø§Ø®ØªØ¨Ø§Ø± Ø§Ù„Ø§ØªØµØ§Ù„ Ø¨Ù†Ø¬Ø§Ø­ Ø£ÙˆÙ„Ø§Ù‹ Ù‚Ø¨Ù„ Ø­ÙØ¸ Ø§Ù„ØªØ¹Ø¯ÙŠÙ„Ø§Øª."
          : "Please successfully test the connection before saving configuration.",
        "error"
      );
      return;
    }

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
                    {db.isTesting && (
                      <div className="absolute inset-0 bg-[var(--bg-secondary)]/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center space-y-3 animate-in fade-in">
                        <RefreshCw size={24} className="text-blue-500 animate-spin" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-500 animate-pulse">
                          {t("dbTestRunning") || (language === "ar" ? "Ø¬Ø§Ø±ÙŠ ÙØ­Øµ Ø§Ù„Ø§ØªØµØ§Ù„ (Pre-flight)..." : "Running Pre-flight Check...")}
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
                            placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
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
                          {language === "ar" ? "Ø¥Ø±Ø´Ø§Ø¯Ø§Øª Ø§Ù„Ø±Ø¨Ø· Ø§Ù„Ø³Ø±ÙŠØ¹ Ù„Ù‚Ø§Ø¹Ø¯Ø© Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ù…Ø­Ù„ÙŠØ©:" : "Local Database Connectivity Guide:"}
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
      const xœì½ksÇµ(úİ¿¢ƒd[`6‚/Y¡E¹(’’¹Ã×!©$®JCb" ƒ=3àÃ«¶dëíSukWİO§Î½§G²,Ù‘eÇQ~	ø5¿àü„»Öêî™î@RŠDb›L¿V¯w¯^+pC6Íœ]Ç‹Ø–UëÅÂˆÓöFšnÓ<7©6\§Õi—ª~+r÷¢Â0;x‹‰OÓê~mŠVWÖ7
ÃñóºëÔÜ œR^e¬0‹=´¢ÒÆ~Û-@#§İnxU'òüÖÈïB¿¥tÀØLº¼éç)vë²ënÀ~vù·İÖá­äİÃäÏM¿¶?Åşm}e¹F×Úö¶ö‹,ŠsÎ~È‡ä«‡CïŠ¿`YaÄjNäÄ`Ü°Œó)Æ/y[¬ˆOıÛCÊ’B7Úğ0Z
·‹ÊÌNk»ãl»lzz”ß{İê>=ºÇà_÷»;ztt‡u}Ü}yôş{—uŸÀógİÇİçeF/İë¾ì>‡…ãË´nmÖï´¢CÖ}†-»Ÿ±îß¡ùM¿î~Ûı¬|KÀ7Ëw‰İ„e7Û7rke¶t Gû ^Ë©FŞkCØˆPé9†Ab!\ïT«ğ¤Wy0k=r¢0ê!s¡›Oš‹~À~ÿ{V¸âx˜cä3wÏ­v"—Uõrg³åÀHÉÀoñáõªuV„Q¦˜ÓÚO¶VüZnBG¸¡8“e7ÚõƒÛŒæ–Œš?æ!ÛH6ûêá,Î°Ô˜ı¶ÒvÂıU·U³¾³á5]¿‹ClúRÉ‡ÙD¥R‘3‚¾ûÖ[’ ’B2÷[U¦ö}.úÎƒo¢²½Q¬Š÷u=ÄwÖÜp˜Õ<gş¸ÓÖjà7½Ğ-0Š×uôŒÇ©5½VÂ~¨/é¨ì¥'›P¹CBşÌÎêp¶-?Œ¼ê©xcˆ€d&BG±0£øM#Ñ–¬ï‡‘Ûä;‚çC‰-°¿Å#É-Í%€™ƒq¨ÏrÒÂo¸œ’‹
7 ›~Ÿ/‘¥+ğŸ‚ÀrèGCHÚbÜî„îüÖ–[Õ‰¡òÚ­!àõQ'hñvi&ÅŸ”7ê  ê~£ÿÈAè
vœÆB ‰”+¾d™îè1p·°SÙ„ıœr
¥øÔ"›â¾“A©3èê:­'Õ¥@;>ÕºÓª5ÜµNk–vÅ«
gÑûBowRˆİÎšôÖÜ¶À:¯ßÈäA†ÒaĞ~5§û=T;”^#'Øv£k¡,À´Õo ´ taÃŠêó!ÚVÍ¼wkê#‰‡SÉŸ6†s˜0œUööÛôr9äâÌPyäöÒ+}AÁï¶xí8šQ4 Pé­æ)ë¾Â?@¯ù¡ºŸ'ÊÒ_èÅøK¬.ıDï6z‰³—š¥ÑàÈ^İJJ´&Ö¸Õæ¢ôğO×múü^j6’u|¯¬Ğ­	´
à8–ù/?‹°xNR|-ƒô–¦[üE×fĞ-•½VµÑ©¹a1ŞP­ÿ·ìë¯<Íæ›°Í'îIà²[»zùà½½E˜ıV"[¨ï‹5oŒ†¸ÚéBØvªni¿tpÇkó-y-¶¬ÿ[ëğİ+MV*	®ƒ‘Ÿ3Ú¶ìƒôvÙÏG¤
Œ“o²•„à˜
½&£ÜÚòö€6ı(ò›¥óh—xçAÔ( ›h¸[Qé|i<ğ¶ëø÷!ûfÄ¶îA*,U]”lÛi—ÆY{zjï—&Xà#[­•Û,¬;5·4¶× å´BÖÕİ¦«®<JÄ?J[ »–Ä¼&a^¿ñ4Ñ~BÖÆ{¥UÔœàvÁx¸ßævéúOGø_õ¬? Y&şSrª¸œ‘ñ
C£G|Mw2EìÖÖòZOt@dˆñ$Å÷Af‰MÆ*JûózûÃ[‡ñ·KÊóú0Ñ¢6êÅÙº[½=ëÀüÇŒù„Ş‡€uc•Cã¹B
Ô˜¾œu(³qgnñq“R]KHİ©3ºDÙRnVSjº5¯Óäà
›…K1±^ÁIwÁ¸Ù‘_¡g…pßwş…ª“B·ªäÙJRˆHl`Š€4òÈÅ,;V•¶XàÓùJJ²èÃßSqåPRwØŒqæ’Æ}4`&lŒPhkLÔİ0› WiÂ­¨0QñELãzåfåæèd{ïf°½éG'Ï}gr¸R®LİĞƒá.×²£ê…“£ª†Y)2)
FÍéÕ'R£ÂÂ	)7A#å  mùĞ3nú=¢m3:4Ì×ñƒÚá“î‹£‡ ><úşùÔÂîstœİgğüò İG¥ĞĞñëSø€J	
¥•'­Î¯­.Îÿfc†­°¾1¿Ä–æ—VÖ>`+«K¿ÙXXYf«k++³+‹}.Ô'µS 
›
X&ñ9 ¤çğ¬úèÎÑXù _’;ğ1ªÎúâÉ…ø´ûE÷K\>Bëct/îÂËİ»¨t#t¿‚·ÅÏ©Ô³Ÿt?+[Á·lƒĞüEgùíÈkâT}¤¿8ÛM@Ìu]¯Ùü—Í, 1Ò]·^Ø©&î=ô”SÀnçà²öU|Q¸İšë4J¨a2n×³%L¶jh°>uó¶¯Æğ_¥ªß*šµ©äë81‹ó»dè6Ça=Øçà´Oª0Ñ&îZP°a°iÁVÖ½ZÍm`üN;C.çğY¡ı®
íÖ~iŒ×m™lÆ”z’RÒ¦2”uÚ`_TAİE¨VoƒQÚı-èƒØˆ¸>"ºGDóH8æ%U‘¾¹±²1³È9ÃÂüz
1u¡KÏĞa¶	ó±òòÑ¼\2çRÁ?¥ryõy
“N"š¨ËÊá"^ËäŞÅ—Ò¼²öp”nÚDø8‰ÈH]©·;`¦v±r¹ldZ'tFYB,Á¯mŞ6ğ[æz&Ú÷À&‹œÆ’pr±÷Şc)İÓº’ÃA6ÏÙıF‡È›ì•
#£	Ô2˜*¬|x ¬®æ¡w,òK#‡p¨íˆ\;“*9ğ–òsá’÷qBú|Ï9!W¥Ğ#~%n83»±ğ«yTŠ®,,öÇÑ½ñÂ3^Èy!ê‡á¯½¨~ÆÏøáw–ÚÌ0à`‰‚zø-çŒu?‡ÿŞA+
¾ ıLVkii~fYòM67¿¼¾°ñA?ìs¶İ9cgÌ“3O¶
ĞTgV0q¡½´ü é4tz±ŒçÕdÙéş- ûŞómí‹éCˆĞ‡ F°·Ù•’±Vë"fŠ­:-·¡‰ÔôxŠ¾F¾¿BB:'NKÈ7å×wœ X*ñoC7X{³4n
ƒ +g,…ùf»İÒXy0ÿ-·O‡pÂt€®Sè%zµøP%AöÁ5úg™
şSĞå¿8zÔı†|† Ïw_}dõ>?zÄŠ‹ˆÜ—;[[ (ñ‡ÈÈø¨b¾µÌOQ=Åš,Ó4°½qV®·
-ÁoùºGVp’ıÒ¨¸| „€‡ˆcxˆXI¶İlƒ¸Ë.­ÿS¿4ıš{8ÔÏ„^S§áòÃ¹^Ó‹Ø43†x¯¼I[²H?ÿş÷l²ònFUŒøÄ¦lW´ÏlŞ®bã%'ª—	6Å"ïp„Omˆ7¥›cà	6¾4Í.T†,4N«ÍO¿{,Ùp‹åI%‚Ì#LËfgœ.&$k•™4ÉË.°¡ªé'€’SlÂ UÏ ÙÀãğ_²È¨´ûŒhnvmacavÆ<Œˆµb~,ÛîBÙ˜É×¹1Ns@/¶&ş’Şœä§Æöpí±÷îàáÌ“£GGh‡~=³¶¼°|õõlPôû…=(Óˆ	Cùš†¿úã`;wíT^~/óã¬£»İã÷çg7Ş7­§|§à{8T2Í/S55Œy®bÀË–'dtÜ/–¶ü€Í‚Òâ7Ù*Hj€.$‰#Ñ¸A…l½íİvy[õŠÆ´	>:›­ú€°Í)ú;ğwµÓkx«:‰˜øGU&·¥†K>Ğ	Çàf¤‡©jeY,§¥o
)H¦œºOj-ém¾¸±;A(‘ëü¡nºZ÷YÎÀÒ].Uõ¡³m6üêm+5dp“W ¤=áGºtˆ-™×ØÒÃOA{^Äï‘Ûöøßg\Lø­-o»¶hğ§m€|‚‡6k1ƒlì ¸>:ÚŞ»ax[’¥gwÛ×mexk×jÀã9?¨ë~6Å¿‚a1ú³ƒ†¿¯XÉïeğkÌGåç[ÖQ§Ø-aÒ	¨…SlhÍÒùûĞŸ¥Û~AkÓy-6;`›Q!~k¶áUoOp‘‚,ã9,ù5§±Òv[<j5ÇIü|ù¹Bj‚-$1.Ü9”<KÉh[œšIH0vAC+Æ¬2¹Ú	B?(µ}
yO‚zt4IÓ û	İÓ>dšF¯º_ò(ˆ4Úe—«Ñ”Õ{7Â7°‡T±ªú\ËVµùÁ•}¡èwtzÌö¥ïMÚºàã\ÃĞa!ÚLİ_cDvbhı¢²iétO¤Òjh¦”"^÷4&ôHD…§á´OSKMSFÚÆRUÁzí+˜Ít…dCi,åÒàÓ;aZ×º]ª°fDZ aÉd*Û¤é GÊ‹Ã"G/XHT¼oĞÉì3‡1Á’bBY”î”ÖS”Á²yùéSÎÉİaõºÖÉ¥Öã!X ö¿b<"ëè†¦X|6œa}––Hû‰]ğÉ^6&›Yœ_Û˜bâR…ğôÌïU]•2¡è¦Ç›uÚNÕ‹öb‘…1ô2í ºµ£‚j‡@Ğó2l˜kZVë$¶}z[„´gi†”m÷ñP¡WB&,®ÌÌe}½œƒğÖ¸B@åDÑz'­{WˆDGYÃ¥–ØíYWñÒAW@V
¿ÄK;Ê1˜‰¢ñgW?„ü`ÚeBûş|~Òı²ûG&C»ß˜]İw1Ìó?ñî(Ë¯ø+OºßBC¡/?í~‚w‰®^ÑĞ0Í¸s¶PÇ<úÀëaœè6cİ	A9Õ:]¦¶¯f¡‰G“zÙo¶~PÀ<`õQà[ÜÇ“^&Ä|ïì @l@ÛVuŸ…h3†åL¢2b$û@®ì¬Z'ÿÄº'¿[¸Şy3+VdŸZÍÑ©Mx¡|pÒş²®N A©ë£øàHª·ØhºŠ‹±¶/Ä¯©ŠÊ…LùœÁH´‰}ôÅ[;cà¯ñ³»6§`A«§äòíì2à·N»2Xyl,ÓA–A½ôõO"²h6EJ›ew`šMÙ–¿X0İğö«ª–à©j§}yB¥†ÊŸè:*ö£ÑR ŒULÇ²¡©öPMµû:gŠ©öAÅ4v8±Ä!5ÕC#å
‚öŠ~jxRtõ´§v*üë¦Zº&Äp¬•£H¥ô5ê¤Úi…‚,4:f?\<SXß€ÂÊa ï}Ñı*‰u½×ıßGwñ•ê½£î#Ò=€ú¨û—<-õc:P¿ó·XıTÛÇ¨Ü‚.
^ñ«8q:øåiÕx'Z¿€á·>µÓªÀvÔ/…cL'Ê\Ñ~µÛ”×wZ /@m: ÿÀ?üÓH®ï„m°´:i"‚/)=:ÓK¿×ziZıçª¢B¥lÚ£¾Ç0sóo±ñ+¯:V¢èéq¤§"ÚO+[•­ÑÑ'ˆ}îÄ‡KtÆš›x´œ±}°uürÄÀÃ£?Ğ&vÉİçRE°{ò³fˆ¡­ıß‚M)~òCPbª -9{öÃ„aRßÙÍÁ]á©ëâ3‘¹®®Êã=á1âWMì±•'ßyxœÚùN(Ç{¯Üp[ÛQb¡ãiôµA–£¾Æ¤„<ı¼(çv‰UôRrÈˆÌ1Tµ&3°Û~à›mÇdƒg Ë'İç }ÎLœÁˆÅÇø‹oÄ"‚B£=“Rg²VÄ2ƒÛ½R½4q!¹ı°_r: '%ğm2)	¼Ù³Fw÷·ËM§],Š„Œ"¿Ïô%{Nö¶»?} ^/{µCÃÖ#+RÑ1“¹`º!Ra =cvó¬U°QĞiUÑS:¨ÑkO•‘&øŸª@éaàds¼iÔ§&böÀWä(‘5(ÓÒ¹k-ú»&qïÜ±†¶f‚XÚQ½zşz*­“u;Nbı2ÇªúÇÿøcVVBV:=e‘yKìáIé#†¨÷jr¨ó-Ïœ~Áè	œváÙrw«+)²ÜicÂºÚM'¢ôKU§ábÂuJg†™õ |‹?ƒ[=øÈòÁOO$TñBˆmŞ÷ÑğpRA×ÉT`I’OÅ`2V9¦ÙÃ?D~Ó½)Htÿrô€)z‹f2îIƒ¸/ô©(£åX–•ÁÌÆJái?1Jº	‚ñ‘B©&›sÑÀİgÛª±•Ô¶1_Óù
[òZ ºñšÒrµñf™ÀŒ¨?õõ¤¿SšQê´¯kÃƒ{f˜Lèr×~Ìº‚^àF`*xñ®@ñœı+{7tLªß_K
#ëaÇæmeŞÆ)B!3f#Ê>–»ñÃËºŸO	Å”|)S…0ãìİ†[5sÍñÏÓè ‡3ÒÁÚYˆÛğzÑ•!„kzÃâr}YE·Ì“”–©ÿ4à ¹*%ë©Få+œjô©ª]õŸW;á”ß‰PPo¹â‘‘Ï¼I§™şıhÑ9
AlÃäá¥I°ùÃ¾ZŒV/Vk3mÆóÛ 2Îôé‰ê[õT¥¾&Åû»3Å”+•0Á¦û–) tÖàd²íòÃC"–ô5îÖö—x0àÑQ}º Èü/Vwñ
ªøfÜ"4Â
xêİiák'Ö‰Æİ!mÛkM°ÈoO±Éa~©uŠU†éšë+áŸüê+¼À­›:ƒ¸¡ç´®¢CHn»sNcMÆÙxA<>H.ƒCz;ÌéÜOÇjcµñÊ9àEç~êNºï¸›ç2\®3³ç…´¢_‚]YÀ-ëÑù/ªÎ¸³Å;?¿ùÎØ…
t¨³ßø ƒ÷6‚kú€’Áfıı†ÛğıFäµ™ÃñœÒëÑ>ê‘ö—ÛÙ¾Mh?ë7ü@M±©Ì™_¼åsŞ¢Ï¹áÌ‰_åõ6şÎÄèä¨¶—Ã¹­958!;w¡½—ùª!¼6:–ó^5gfbm4³ÑÑÑcïœ³örxh[½}—p#í°ŠöÛèî:1à¨ıäGâqk6¯	”+üt´²yáÂhî[¿&q0V´.Æô#D™-¯Ñ HP—°ã ¶‰Œµ3Æ=As¼)¼y~8İ_Ã"eJÀV‚,h .ğªª›âıéƒ‰JÆ„c¹[ğÉ™Â«&XÖ«gÓmäĞ	Á)=Çø9' Ô‹ã.TşE¿Ş“ÊØ'tğÂKü]zş“pşlr”{À™ó^L>£•Ì—Ú>×= C°±ænøí5”çì-úŞÍ‹#±,JKO‹œëÏmıª§–E×è'òÎ‘^wàŠ4Å#÷˜x¶Y³%µÜùäÌUÎú Gt÷±‰ñ±ñM³î×XSh„¹ò¥$˜deŞIgcmáêÕù5¶4³¼pe~}ƒ½M®^[¤ì©Š}Ã¯ı'_“rSX~ Oåfê}¦'€8Ê›5äûÌğÊoªIpìïıó­¿ Q^©ä„¢®à;ym—––®-±™ÙÙkKb'ØâÂÒÂ+n¼¿6¿şşÊâœi»_!èóZíior9Û"ûĞ_&q¡
Ó\4-ÏÔô1å¿l\¤FMg¯86œÍ0,Rº³4dæTÈ¾övpKq,‡áxÌ4Ñ›K;ñnöPĞ×d%Í™s)lš‰Zœ½’°'|K?½MìhåˆÙÒšs1ylğ1û˜ÍS¡=íĞnLÜòvä›Ùª	6Na,'”5F,å˜·¥$ê“œĞK¥Ôî€¨ÿ–‘/†\¹Yù‘yˆL•Œ`óèU“7¿úL$ktùÉÑCü:ç^Ø“%¯>f«gíÀÂÉ  Ù‹A7QŒsP€ÈÍátÎúKˆüƒb‰´g/şëèSw‹g­Á­(è¿€]Æ-€²‚}ş7«‹³Àø®­ƒ”Z˜›_ŞX¸²@²"æù^YY<)+¤#€F¨Tø9/TÚœKñ 1Gş¯¹‘íaV(œqÁœü§ò»Ç˜íşè#a=Ç£$FQ§/ºw¤5O­¶ÄSÈŠKtæuâP3™%(< Äñ÷íoÑuv0‚ÓºÍï3qH<_¥eM,]ÄÙ Ëªl_à9ÇbxÈóïÎÛk£™­—ŠG}Uö“v‚-kÔŒ©g£æÉhrÎ™¸Y'lñ¥¥ë‰‹V+’&É~jTŒN‚aÁ'£¾>–ñú8¼OU4 ®¡{ÔRJá{fk(êÅ~.šìG«+·kø}NğcòİÈød|˜(€©´ÚÓ¸Ñ<ûÍbQ ‹…/dny…ÈÄİDÀâèN¹l!#ü )Í-¬o,,..,_Ñãë¶\©ĞRkÄ­¶
$ügS±ûFÎÆ!i[Õñ4 ,Å}ĞLÎ%²ƒ€a{ô(šó¿™Ÿ½¶1ŸØ¬³Ì.Î÷M“+e¦w°~M'–œéD>â[-N›õz×@ô¢ÎL%yæ-éá-{Ş’$WbVgˆ_ü¸ûgL(7tccQnêP
`3×6V–f6æçØìÊòÆüo6øë‹ó3Ë×VÙÚÊµ…åù”%şÖã¦êëè?Ô5”¸€x5j*Ñø…È©­œ¼Jœ&/L­‡øbÍÆÇİ?‚
"¯¿Hÿ,.×z?æYù!;úˆ~ù£ùÔ«ÜĞ¦”S`]¨˜yKfÚPšS…­ãûØa§Ùt(û	bZ4æàJ%˜cìÑĞnÄğL"Û	s·¶¼ª‡·µËÚ–µí÷ûù½”ôVxqŸê3Qâ
´êbtyæzéwH2ò„£ËT}`aãÚ‘Ø“ÅŠs3¬÷gÄY(¤­Æ‹Æ÷2ÓÈ,ã¯3œRÃl´’•8³¾NÅúJhh1…w
—Şa¸9¬8³½Má;îPVˆ„Ñxt²pitR4_€{8A­ßÆã`¾WDãµ$›C¿íA^:/ÛÏïE5ş4ş…l<€E?d4¶Å„œ²E…;*„^IE¯¼N›Jˆş°l!o;›QÃí-p¥ŸÈ#şşn`(ûq_j@Œ%4õ8VÚ –“„æk6dÊ7Åv2r`l<é†’]ÅB‹‡<©×Ö®¢%$ÄÁ¼Ôœ^‡E$Kyå¥“ÌY‘âlÉSe
ŒµkË±˜­æ¬ì´­Š)g2Lœ½ïv,G\ı‘%gª?rRã'U]£‡Y-ÏÿÚı»(i‚‡òÆ¹ÄĞ¢Da&Ù‹RwŒX_šYÛHxei”´u<|›½?m³lcmaIÃh3'|ß™¤3ùƒÑŒ ÄüØ{ŠIg¶7ğyM@Êâ»ˆ9 Ö°z%Um××“SŒ÷uÚmßRr»h>=$ÇïW¼ş©Œÿ’GóG´Û”Ÿ@à€R4VÉ¿ÁÄ	ß¢[şKy·å_ÎSÍ?<Ê‘©¶ÃÂĞ{"Z¡Á‡fflY>ƒ¯èp(E[0a"G˜‰¹fàL»İØgŒ¨Ù¥ØMVY˜š†LºÄ9•"•ã‚q‡C*+Â>&¤^IİˆñæXˆØ“ìàU?pÓ¶eÿa6wI™u¬ÿKA}]Òª´Ÿ)`
lÒ+‹‚E½øgè^½4/›8zWÌÌA÷ZçLİê…6õk%8”ôçÓÓÅN›úÕ[ù²J¹”ê%eW,³z/Mçù¦ºÕC»šÛo9MàDknØiD˜şWn¤–ÿ!ÊÅw¥Ï÷«oÅÉÌšµ$™üİóöñD?ŠXºò»aù®j6@áï»$_!,ú‰‡’º$ÕKrzÄÃÀøáşµ6¿º²¶qœ²æi]%²”|èw‰tP}WDÖ€è">×gcšrú²…½ ¦õ4‰Å¡\J\Çø4ô7¿âº,–æÓCHH1±ŸZÏtj^DGÑÛnËèhcpJ"^œZE¿²ªAü{Çià¯›nÃß=q´N\`Qø> ÏwîL·î±"RB×	ªõÿÖqƒı~<ëÉëfäİ@şÍv£„ºy¸ÓwuJäü;8õğ’ôZú9.å‡¥Ï1…Æ+ŠØ {î^÷¿£ÒüäKüƒÖHwF:ûCÆù3Út„„•;ÌÜ¦ã5†12-ÜoTQb×ˆ(,èë2Cbt¤?¸Wş‹|¥‚
ÿëWõo¥.D]w¶SOëUéÅa(ÿt.ıÛçî^ö÷¦Vacğÿô;òÂCœú¾á§öÂ¢ç´¨n4ïÃö«NX ‰mC’÷~çcœeùå3“jÓ…¥±Q66Ú(/o•&wØ;°àÑÑÒèü—«Œâ—Ó=X*«À^ë.Aüı vD¹[[sÛ~Ån×+†b¯(ä™*íÒèÇ+ñàI“jNX¹X¯;è¶Ğ
®ìNôWÇu<}*÷)bè(˜0Jæ’]ZgÔ <~<JaFÙŸáò}¼»î>3´˜¸˜‹U/ûÒØÛ›.Š6üm¼;À€Ğ¸ë!eû×\fô±¦±í;úãR>Aæj\œø‚G§Êâ=Â$ŠE¾"§Í&s•£BˆÒ…¨åxIı@µgWwÖé ˆq¹ÎÕ€6é?MÀ©-Ë‡ìcr\Lp®ÓäºÓ° JÍ°½”!«¹ìOÈê@ÃıéAò«i'fnŸ7½y&Ç lI}±æI2Ê­òåLâ¨Dy:\×4¹&6¹äGvªiyÑª…¿¨i-ÈtWÁèd_Ñ~•1`Zcpİ&éO +íÊÔÉ—×k™ÌŸO™>#-1İ0­nY\
`cĞ5Ö0Å}X­ç*áŸl)„‰„z§ÇêË@'6ßWmI'™EøŒC´ï‘m+lh+`Wû>fâ¤¼ùY—¥ø³UƒÍ—ŒÉçÚÂÜûi/fÒ{%äÈJ7ÊŸ›
?ê$çQ³ÏJtšŸJ¨¬´c™£9ıÍªu2Z5t‹ù˜”Ám0²­´ØÿÈ9ømƒ-åiÈËºnkd‹ğ×³ÿªqTq€U~ÆïA³·Ë¼ß†n«aùí¿â-™¥…ßr÷ÑúìŒ5T6†C^bğl¼Í¨Îœ	;™ÇuºúÊŸP ¼IµË²—Ö‹íPoöÿïÿa9 Êš·Y8¯Ïi·ÜİO;?™{î¹Ç´ğwà˜Y™í|–åœÅùßòä†R‰.R+Œ7›•˜Ç!6’w£ƒ!öóÜ×G+•Ìß3Ó2–SkXM·6?wmv>;‹Â%“ûbyÀNÈ.;µm7“Õèšl^öğ”ÒĞ3‘—•,úÂ”>B rç¶Kó¨k…1ã¢#úiÙÛñ·Z' ³L~UÁC¸|ÂËL´ùóóøĞmq~ã˜›œ›nı˜;"kj[Ò³°âëİ1Ê±!~§ûõÑÇï+3‹Ç¶=—›=ÉVõõGP=cÈÛéòMk#"˜6t·›ˆŞıêVYçÙ-zEg…™Ÿ^%‚­
U|ÔÄı1¯’ ü#Nº˜×3zS>XŞx~}á·óslayc~‘]™™İ`ë3óKóË¬¸6¿~mq#¬®À+WŞR¬ı¿wüÈÍœˆî¤0O[Jabo
Vf”\ašKPDHXİòÓ§™Ï?ñÉò8üo2ã”E&ì©›f:ëy³»Iûä'İşñÿS’iMÎ§şã?şßÌMM6îxâ˜GtSiN¡ú;H¦½S‚¿ÑÒUVãç?@-‹ï0øZ¤S¥Ë[˜úá^VÑÌÚìû¿:_œ¿:3ûAèëÇ®¬ÔÃ}a1ğ[~€Eyzûø!­u*–3@+Ä_yÔrÜ™çs.›ÏU~t–5> ÖŒC‘şÓd[<-ÿøùTZş*•+…ÕÀo46 =AMâµ1¶$y¾·M—·jİœÏKy}ŞfÇr¨ãï0ój{™µä'w¯ñC¾vè)ÏhÕsÊÒ8it’Á[‘LêZAWé(åÂ¸‡}ËÍ7ªsY‰ró½zƒfìÎPïs½ƒšƒ„¨
INÑá'3±':~–c™—²½4~Àj.PœG·¦€qğŸ
Y¾‰y.5şıïAw¼†,…ËSGTÕL¶ËÙê#µùÍ§NÅ1x©0¾e?J‚öâÜU!Æïñ+¤ôÃ’_s´j³¤½ê…+m·…ºñô>M&‹1¿~ˆQ;2hgÁò~‘rŸ*ka‹şî´^-Ñ|ã}o»>m”ùV_wvÜ8ŞşN“¼%å¶’ß	¹ı;íªÁóÄte®W|‰X/¾FqÜñ›âX;Ş§¡wß:|÷­·G"¶N	FÖİ(şÊswÙ4+"¯§~1—i„ÿªyÁğ[‡S,şe
9¡Ú9YV%3‘põ¯ğ½¤KÒºK:8¤±g>'ºR4a"Ğå_ŠTù‹ÿ~ÀBàörÎÃ|¥= ˜ôa¾¿°£±VİV&ö0Ón‹;8H<Êud™ByÄ øåoƒN·¨N£,_W&w1hÌ½»™á´]Ğºs}ÙÅ<_ßºúDë4³¥œ‹ú$¯%¼4—p¨xÊ3­5áZjEjo‰2nöPiODB/5˜ë+o%@ÔæÃÑ2WãaN{ ’]¬\&Fşeüµ6b´_Æ_sÚlûşvÃi9}¬˜´P£¦WÍ§=€šîÅ '÷JÈVÆ2êk@³‘}+ÉPtk«NTç<à²ò Ç8¢íMŒ0µî“şş¶ì¶óÔûbüUíû"çaÀt±èà%ËPJ7Æğ—EäÔÆ(Ê³Á‡R;4ÆÛrv<øSíŠúd°±ôÎÒT¶Ğ{-hH‘ßEíÈÜ/Jø<ÿ¢í;—ãïjM\ÿZ»á;5¥¡ò(¿yäƒºL­6ğ/m)Ü:j‚òÓUe#4+Ex*¹Gİ­€?Æ«Çk¬‚á†½ÌbÁfvV}’É¤¯‘V*•ØÜÂÌÕåºRøşüâêü»²²ÆÖ?X+œ­Ïol,,_]go³•µÕ÷g–ÑX_¹ºÂfÖá§uì ™•´Aƒqk3!L(¤Ñin+éç ÕPq
”focsX9âá¦¼¾(MNE·u=)e…ù°Ä(ä/î¦#µQÌ&õSà:¡ßzOâğÿ¯ğâP¾qı†u?ä›­»ä â+è§?ì…¿knÛñ³ãiO"ØoUáå%7r0É»¤ı©µ“¸¡ÄB ÙZ8!<bÅX¡cÖ¾‹QĞqE)×(ØgrŸyß cO»±-7ªÖ‹…§í8µ¦×ÁJMÑQa8n‹ÄÕıŞ{D/$Yøë™ût€I¤ê~à}èğ\â·.=İö³Òo±CÙì0®4ëm±"L©ìßRãS•«¦¹âK¿œ)*EjùkÍpŞÊsÉaíø§G÷0øñ^÷+,Stt_zÜŸĞıâû‰[ësß÷QşÈw…çÂ{ÏË¬H	]“B:°<œg9ò#§qW`;¤h÷î7İCj¡l 	ö&ÁËh7ñöFÃ\èÙÚù0™(í6t+Y<Ø6»Ä)‹ €á„Æğ9d.
&PêxY	ËÆ‘i\,,i3Ù"CWiÏ‰’U11"+W¶†ì1™AÊÀ²ïBA–Óü¢û-Æ©~Òıœ'd:Ş¾4Ø¸½Ku¶¼‘O©ğVVˆñ]¬ømy Œ5Š±RWBòD‡
áV‘İp£3‹¹¸®f6ùê<êDÔ+$ûÍ£ÄÙ½FÅÿLjµ‹±"¶ËÁ¹! D¸k¦¨øe0RX¤ò¤%+5kùL°«Ü}6¶!o›E†’ú’²wÙ"§²ÍõiÛçï"·¶°‹^—ˆx¬	°ÛOøéÚ>g_ãÉ(ŞF|ÈÏOàŸ;JT¦Û–øbÖº)*wN¨EŒC¿cô¹F>~lø÷jñ™˜áÆÏ”µÒ¦IE[YÙ¢8 çæØ³ü÷†Æ÷fİ¯…kÛ’³«Vh—/Ä×÷â˜¬Ú¤±<¾Şôè’<½ÊCöIU[J=Öm€6ås½êP^µµÔ­¿õÒ"W;X¢ËÚŸí§|}’°1½°Ò6å“°,lÁªJÜÉ~|Étê‚)œSK&–.D_y_É¾	½åâ‡«5J6Ú«¡Ç˜×Ì¸~ÃÜvfŞ®ÛÔÜ<Æ•YE”Êlgyİ³Ò˜ûhæ´ÛáÀÁıÔXs/Š_=LZmú50ƒÿm}e¹Ì-NokÁğ€áq2êG&Ş’&È·Gø¥ü‡À¢ÿrtGÚ"5-
H,.d1ÎYÂ•ÙxKíEêñÄ¥5{ç»±˜„(ŞLLZho IHØ~ê0	ÇSáÜKÈé¢ç{ÕÈÿ¸‚ÍJ˜½9y´È•p ~ÅNºUt yÀÄ›Ç$ı*v1BN¶Ó×FõÃ}“ı¸ˆT~ú6G=u™±_“èK|C¿y1+úúé-1„²Ä²®üR/aí‰©Ø©€4\ª
Ü²é’¯PúË‡ÖÉ¹»}í‚&ûY½A´lFhi]-§FëZS¼ÄOyBÒëRWå½wõÔWf]×aŸÑÉ?VrUî"Ş,Ï,-ÌRVÈyr²,Í,Ï\åÁ¥}¦»µ¿ƒçş¢'\ükÊS¿¾~ãRtí,‡Îd#q–£=Ë×§İšÉ—Àô¢æ‡æ<r|ÍÔ&i~bíaş„@âœ&*Pâ‡9'Ô>>XYhn'¨Oû0ÔÈ2XŸÌwá—hòß)¿”
„|Å¿µÁÏhD!Kú~é™î-ÛÇfjµé0²Dß6ÁcîD“›Ç²´‹^Ôpo:Aú™ÛRŸ)ÁTÆÛê/zyÀn4ˆëoûÛ7=<“¼I§MÉsÚS†)†ØÇK°_‚£vĞ!ltØ¡£=	¦É"+—Ëøòq‡Çà$¹Ñ	Å¹`—­¹˜¿Ë“Îï¸­H™"8à[n.ş4çn9F¬(ãÏ?1™Ü{eÚg›â[ó.|‚¨Qu%^’GÏ7 Œó„™ß’çı	+ÂßŸƒ|i:Ám7¢ $ŸÆcxÖ›D)r¢©•şú°G1ynÔ	Z	ŸCù^è™æõ­mZÍÆÔ¦r3Zü]uX9ğ1ıó”¦×Mö]W×bö%Í,tvíµQˆÊâ²hMÑAğ“X9†b¬Îõoƒ‹·­ÁŸ¸ü„«[PÙ”™‡e®ªÊS+Š¯Èéß.æÈO3¯&<
á1C(ÅüÁ²$TDH`,ˆõOYŠ{\Š³¼ òğY±µd1i!aéóc6°ûØçS*c)]ZÇUŠÌÉá»ÿ‹&0¸lßï ²Š?vy.]Æ}¼Ğe`¢ø{ñ<w@vğ~B¡†yè„‘~¨2[ŒCë‡İ²ò¯‘Ÿx5`zÉNQaÊ‚—ôµÿ)æ húÀ=
¶cêÁÈ:™¢B›|[O&Ó©/Jä<‹¢©HÿV»”ë<©!Iö‹ïo,-.`ÚÄùÅñ^JÑ)9Ô¦Yœëªµ¾W¾^¹¡`!>ÔÑãÓ2fõb—Øû9­ŒMˆÿô¥À6?‰·)í6Z G@:<!ò„¿>:zˆtù	¯íˆ4:Æ(Ã÷ß)Õc¬{Ë‹å H(Åkv`Y›.k`}À`cK—ûÒ	l¦M¾²:”`üè+¼"¾&ˆ%_(ƒ¨w[µb“!ˆ¾kÒ/Ö©wû9‘íĞ¹ÃûõÈJuB."“¾iŞ}YEüMS4b7ä”’ß~›;©<78¤éQ6^D5Ñ«¹úŒÏ†]_ë–¢L£Îô´œW,FW•'eë64ã{–Òm¬¬ê0ƒ±ØıË
‹âƒğÓ,Åf¦1Şf*N\ÑìÚÌ¯g./,buª™å9á¡YX›ÿ&Ì¹6·°!RîÚ5ÕÀÙmÈƒ'©>ÉwjPcJ\{…R¡%í•‡š—¥ ‹¦M¯Us÷è¯–Ïÿ¾T¤íı/úâfÂ¬öÈ´™v&Q/˜Ô§2¾ê®ÉËÙôsK0­ÑJ¥\©üÀ{öÚÚ|{Tàµù­-·S‡©æ‰¢Œ­åöáp*ØÖlpCuÚÄØ…6«;œ«OJ8+¥“’·SíÙ¯éşã«<¼éãÃl¼R©¤Œ[-äÁêI:nœËwÉS$ou¶ßnbBÚ›nK¹P’z{&0ßw‚ÔûbÕ;'¿"×oêú7ÓÃå´	2[ËÁõ¹ªÍie½K3åèªA¹Á¡@BweP»ı‘Ñ:œ)0¦‡Íú‰J™¬¦ì{‚½m®f»Û»¡6UÅC–Ù@Hñ´ÉÆ¦iqŠ6©½Õ!.×£¿–\®)Ê‰Û_€äDõR÷eøŞò[*7ùü¦W³a†ıŒÖaÉNêª‹Şz¯…·¶\_Ñ›$—Ux¼‚:¾kx,Ò—N”&t‘0»¡v„7÷B²Û(wAŠ1òÅJ–ÒÆ$²8VMÕç@SÓîª
™ x¡·¥9“íå™ õºX^WyÏTŠ#f¼Š›œÈœÄœæ€ÈåC9MõeØHÛ˜¢FvS1OÊ~K¬%µ†ä‚ÛTÌ.l¿c{Itêï©+gb!™4§6NîZ‰V&Ş›/+X¯¶H¡½ÚN»ù$ZY°Ş Äù)–ôjÄE£Œ[kü“œy(Ä{¤Ù D*4"üËe>KD¥…tšd Œ ÓWJ‘§‡B¥±4­“;9¬şjÙŸ“ƒÃSè¨ˆü>uŒôUì6ıÉ¯Ç;Â#`};Fúò®+?°—ÉS4;±\›(&óqrt^‹Ë†½¤šnÏÑP}€É´=´úS´Qûs®(Mô€#Í?¯º\+Ôb¾(šh<lp¿†ÒÿdÑFµúvØôtÙŠ×&Ûo“q’4Èév>”åÒá¬GsÈü$Ã±c	Ëğ?h7áj¸‘¼Â„ê^×Š…É»Ùï‘ /+Â$£…Ğ—à}Mˆd¼ÍÏKÙ¡@ÙÖV+^ğ»zÏÚïj%HÈ¥­@ÌPaª—éB°Ye ”fjMîÄ`CJV.Æ³(´éÑ’]L¥bºÆBìÅSºµÁ
ü“MëøÉ wüv~Ì?ƒğ	üšì‘‹©q¤’6¥ngz:ºf6•ÚûtE+›26/ı²¦‘M)”’ZæşDã~øA»œâ|¤l{†r¬šRí	4MÉíjFƒ<¸%ºmÔŞ5Á`Óaø'G“áÃ©ª	ÅPÔ¸²«z+ñ°ó’¬ Ş<¦3ÂôeÎŸX‡š!¦&}ñÃ"Ü ¯b1îùŸèªÿ¤CøÇ NêLñÔ!¦Ä‰ÿwFURIeï>VÒ‹«ÆŠØÊüIE"yESÕ‹atM€§Ì¨¼*ÃP"
•—ˆOU1‘æè~!Xóêùÿè–Î¹ëdSğùİ`«¼™ÛªŠSÔ©sÃLéK9×²1)FX±v·ë„¬ÓJPÃzX“a¬õXÄ•€¸zMêNñBTÓ?Ç°äİ‚_¤ÙÂ*gŒiay…äÇX§ügÚHi{¤Ğ–ÙjÃå2÷™³íx­rŸvAúX*Ë$0cyú³
ôV‡†)l†Ì]¥:ˆÜR¥·	møŸ®Û)]D'MW<·Q×DøÌ= 3À ` ãà¶~­eŞ”Ó¸ìûı‹nÓN†ÿàTì4}lÒ%8¥xSï˜‘¦–X™ïË®õ,Sj‹”‹*åÀË{ß	Ì÷õşµ¨W%]•íìKÉN¥¼bq×M¥}{–)¸l–J2¥M±©g[Ò~WTGK¢$ùÑtÆT’#¨Š²h¤)È§ÅJ*ÎKTÓÉ<ÜvGv{8×sÜÓ3œ‡jiqOD›ï‰g3™h¦)ŸÖ]`9(‘æ‡Vy
¬õÀuˆALY#2Õ°‘>&º¾".*Ñ}Ä‘ézÄ±:ÍºôËFïø‰¿òÂN‰x&…şyœìõó¨õqœ;ñõyGPÇNB±OL¯Ù±Ÿæ½7LÅLÑ·RÛ_ '•Y–fèC°^1:Eø¸û)êTSâ+K)¾âA±qˆ„Œ”g¯Åæ[Û/Ô®uœi¾´Ì7¯ùÑ?Æ©xö«y*~¦OWŸNŸˆªU[ƒzªº©ãj57kú ú;¤ç h6B†&§7Ûµd»fœ;‘ş1ÏŠ|k%ÓW¶Îdó ²Y„RkaÔ<„zqa}cëN./Ï¯Slõüo(Œzvey}eq]¹¶<‹Å)õ”®ünÏzµî6N¼ä6}-¼ƒ¿¸éĞaõu1×ºR	2k¤0Ìó±¢)WxßÙ|Õ‰Ü]gŸ­¹¼îµ|M¹B÷	fEqŸ””‰ÿèèÿú¢ûgü/©Üy/Üîl‚\„ï!•Û›’ÙÃê•-•ŞdÛb¸:ŒlÁÂ­!¿ŠCSV¥ßô †¡É*é.ëİ¥&«Lë^İãÏîbqq*i®­Ã,+Îo3b_ÏÈ¥c­¬§äQÿ+®·\H$wŞ°³ÏIõºò[m8­­òè}Øòª,%GûVÛıš{ô9ófÊA·…~hQĞaİtñb_X÷Ú˜Œßƒ?‡éœ¤xUúİEÈİ
ïx¾Ä0ßW0×¿Êœºé ‡rÜ| ı˜/êÀğ!WòšòÉ‚_bÙVî k Y °v¶AÓ|›­~³±¥ô«4oLŞÚ}&ï'Úı+í­(gÏÏUîÁ×¿tŸ‰ÔGÃ‘Qa)táÈİ4œZ­ô* î6±,Y›&o8•¸Eğr€«àÆ€ :({*ƒ‚îwÿÆÑ#8 6VÆ•K¼+ ÿDbÙsew²Aòd[ƒù†[­·@<5ŞÔuşº¬¼Ä±Dÿ0ÉÇŠ”x_İÿ§tˆõˆ¢”Nh3~'¨º¬ŞÙäi“6Éê m,ôĞóò¶árG>é,`¿ šû
{W éiyXÌ×…ìqöJ=®;úú¾„¾v_²ôbí Ü °†'ˆ?ën f·Á9¾¦şKÆ~,™Îü8°]Xaê}Î*k¸ÛhµãMªÛ¶å©ğJb‹0êˆ°<À$€ŞVŞñ˜s@Bø>¢HR«PğlÂc–^	?JF~79#ıHæôı˜Òÿ~“_`o;Nu_ƒğ*ÆV}Xã>›­®¸gu8‹Ï$¤¿¡TÂb§Ÿ#ßˆ+,ªÕ§ö*ŸÃª5äXBˆc`I{òĞàü=;Ë&œÃºw™6y‰ÖàÉ_1xP.4f(Où+’ƒÿ‰îi"Cbœ—à	}jÙvà;› èuæOØ¬´}àŒ.[õ@Ër2/°²¥Äñİÿ}BÎ§Ş˜§Ë³Nsş,ø6Bµ
Â“EÀğØR©&RÜYTã{Ió{BQDo~8“@\Y†ÄvÔSPêçˆCÀ	”@xÀ:.ÿµÜ¦Êp¬èQùy¿…Ù@Lø’DÀgÊ)1¦iU´`qŠH”/cN»‡İ
ğ‘’èu}y/¬Äj5 ¬2oÇ%õ¯TÅSn¹­Tb3 Ú‚ÚB|†§oa ô£ t)Ùa#W÷Šcğ¨ğÅ½äĞ¥İÂ YÌÈåSÅÑ2ïaš˜2şB{ôG¹iß 4ù_=ÊĞWT²m×`Ñ¨·P,òÛÀä ^´Ï~…
°N	éó0'\áÉqøbG÷•ë˜[´ïS­RñªZ,Ä*R[`.P t[¨!ZHD\Ù´Kc-_S¢àKzÉ‰ä×Ïà—çR/…I_ÆErúÛ,ò	Àğ ã\gF[°	²¡E·¶Ûò6ûå³L„'°Ëhˆèä"Š(^ˆ¡HŸüS¬OñÜÅı;!ªÏyï˜;#fHDÀ¥-sğ+lÎÙ«İÀÎ¹bKvÁ‚u#T;Ë…Z}N9×£ÿâº=*.È@²­ÔL²/~ûæI²'øæeí	PH©í„!:N´­™\Z Ú¾%×l›•4†W„aŸñ˜3¹à`«
ò‹ğ°·‰’cb:Qg(|täíåÊĞ°á2[ÂĞzèqŸy¡ß@geYªí©/ÏZI•Aó&¼¦Áó{ü²@¼÷x\eft•—@6;-`>ºëreÌÖ–Û y"ß3«–l3-U>¦T²œ›Â¼ï%×^Ò‹€_R¦•xQiWCÉ>ĞœúÛ…ù½l(·„[lÓÌÆkÁÛĞUÁ¬`ÜmÔ­š~MÄ¡Ík(ÓEDæÒİÄ7’,LØXwºV­ÊxuDÆC&³“¢E´&XAşîÈeØ7Ï(¿!7	 Š9PË’_ë€Õ3à	öõ	¬¥ŞçRé}L!eš¾5Ø6ñIñ2¡jË–Åı—|·¨Ü-î¬İB dËûxY/`âßšö0mİ7DNÂ|Ë^w^Ü#AfìRüVì™"{_æîÚHş®ÍÅş-ÔŞ6«~9\_\²OÂÄ|ÜıBx'eFwt?¥šïO‘_p+ëX›O0¶;šN»Mbe£”M”N=r$íeĞcyH«IËÿ†Å9˜ˆ4²ŒK7i/g“ô½á%@ËáºfyÙoàz›EDRäÅ„¤xG·Ë£D)N‹ßÅ’†Õ¼Œñ}½×Ú
œØsjèn½Ä\i`&«EEûæñÒŸˆMºŸ˜2\Và€¢éKé1Á=¡-¹!™Äå¡ı–ÓôªâNµH)ª$½§_³»ú^NıÀ2ÀÄ‹Šç†ÏñĞm-wu»7‹CCx Y¼ÌÉ<íSìºœbzrå-?˜wªõbQ9w±¤ÆG¨Î,	©¨úM·à[A™Òâ¼ÒM(¿œ9ÇşUı]»C÷Ş·z>Gƒ´;a];™ãø¯tS´¢ğ×^T/ÂC MuSéµXI>·f9˜ß«6:5,Ùö³¥~!%¦¥[q’2³şFŠü	6A÷›Ü.ípî£Ÿ‰¦ÈHùÑ$¨9¾©tÌ:2ĞÓçP*Áh=!ñìª´m”´å¬n9ãæåÂbOóS<v@ì¿O•Gäµz|ôŸ\ÅşDœA¤Yİ+ ­ÌÊpÊIÄuêv±<ºå±„	øŞÍ5ŠófÓ–v7è´’T9˜Í'3ÒDË çÃƒ10u#<†œ•™Yˆ=º{`#©/ú´šßÃ/‚ı!+ÁV1Nò‡ CÇdˆ·™Ã¶°p³¨ÂVİ&è8€Œ-Ñ2©&©|@Ey˜–Î¸Ãş=VøÇÿıR¹§ı{Šb÷E¹\ftµå€Ÿ’mJ®ƒ'¤Æ£Ç“¡¡“š|ƒÍ™êj#İäK)_ÂŸwñşt«LbŠObU$'âWÅ«ÈøÕJV~«ÅµJG‰g<¿øAùŠÈÛ…½r¶l€DÏk”‘ü9NîR ĞêüòÜÂòUy–ªğxAE7wug6Añ™ŸÊóbşvÄ	-Ôè²¥‘W(éªìlRİ‡a6:FÉ…uFÇ~«j‹ç]$Ó²ÆÙîşšiÉì~a1ı³¸ ¸€ÑV¤E
ú,0zÛ „M©‹æ”x±ÌÃ.!0şY•Ws.“G0l^b“Dï0ww™¢Õv`‚æ©ı —„µâ?”×:@(¯ß¯g`*½`ùÍfˆ§şé4\Ú¸è4Ğ†+æ
ƒ¸ÁQ»&`Vìß;nÇæ:M¬TŠüj;ÔÖƒ»p”&õzÇihGúrƒhãå—nk$¿†N¼GbÃİC}I¾|Çğ±Ïéá¨×ã¤z¢ŸCZCèé_ÿU¹•¾iEH¯…Ö7d;f¼æŸø¶Õ0›¤ô`©8#Ê£š©4®'+¿ÁH‚aÍà‘z-¥•Ypg[ÑPó-1=L5eŒ¨ã¯Ï›ë+x—Ç¬ï/\}ÿæÚÂú/Søš-¼X2e?ŞcEZ„òˆ?.üŸÿõ?°ëKó+×6n0.ÌÀ2@‡ÅÑºG&ÏF¥¼z[Ñ ©ÊêÉİ3a¾’'êxå…éx§ŞñƒêÉ ä± ú¾âÙ{-½ñs:õ,§.;N¥Ö°Qwù‡ì+”wC
uÖî[Órv“ôˆ–íúÁm†n¼VuÜ[ê¸ù _[[Y»Áäİ½í’^Üî#â´»´äÆÉ$ê]kñih|Ä„æîÒ2ñôK[^(EwØt@YÄûµÄùC~F@äFFàrÍßm¡ş–`k\M.ÔÈŸ$ÑËÓfT1Ü İ V•fÅ}ƒ4ÁÄCÙ5‡„3Tü…õ•u²ÉŠqtc(¨û¦¿µÓ(d´–µÕÅùßlÌÜœ™[ZX¾ù«‰¸o‰,7a‚çUSÌ–RNKñò¸Ğôj€Vl,u­†u	®.‘Ñ‚S£Sİı›âş²ªCğ¸‰Çf7QÂİäe
-¸- PÚâ÷AgöwQ±§ƒÏ›|ğ›»uĞş©¼»® EŒ¥âšÌ0œ86$‰\PÏØå‘oÜï˜½‹?b`Ü”‘TÈZÔÔ¯qg q“²Ü@NV*{…5b
ò ,Ôäãfµá„8`íH@‘kí¶Ì‚TTKàPr ›!•T¹)÷[q“ór‘{È|fqqå×ós¬¸¾1³<7³6Ç§ò:—WfÉ\[˜İ`Ë+âÇd<¬4ßô(‘³-b‚qëõ¥a‹cŠ¿‡YËßòq›i0ñL<IF G8OAdns›C¥îÖlÏiiæ7K×–Øúûó‹sós<à_®tõÚåÅ…Y¹ß‡Cœêî@Õkä\À?§Ìpúw1ÜÙt'Ú*].°…ı¬ú5÷@Lc`ù@ÔŞ¤]llH3ğluF¿ÚÁÓŠrÔ±Èù¤ŠGŠQ|¯\Ü-¡`Â,•$Ë‚oµ%×¹I±×’Vù,nşì ‹ñ?Ta£0t½rã”]Q;^Ù‰fë^£VÄÑÕVñÖ~Q}Â3£•lªÂæçwÉ/Ö¼F¸ÁÒÓŠ(í—.°¦³WÚ-Mî5ĞHvğ¤·pI:IG~ÎxŠØe?J‚Ï>"U40Sğ×·ßNğŠàÊ=Øê-v_“>É\nmy{ v Û#¿Y:õÍ‹(w+*'D0úş>d–®ƒî^¹Á¶`x}óR•;k·viœµ÷ ·ö~ii6¨Vº¾ãÅR)pj^'ºÁÂº{ZƒÕÓ9*,”@' ıÌiyMXKÉ+¦´”¶˜¡˜è$LÔ¨²raİ0U>½U~š~…ô…ÍíÒõŸ:ğ¿ê P 6¤øOÉ©âZGÆ+,,_mİLQ7Äã­]ä·Ÿ:ùL <hòñTÅ÷ÁæŠÀ¢Oz8oöpxKÍ<qIûí kgPı5æq‘
xÏzØc”mú`¬rÈFô.‡PÍ3›Î€ñ¦9-µ¯[*mne]Å#Bi¹a³pI¬@Øt‡G°•ÚïÅ ±Kš/Re'ÉCq$¤oy	6¾9–P·F³*½¶¬šµ©6pIXm¹_?;0&AúHôÄ(¾5¯5t£`Aû‹Év'P0¹\chn¹d°'µ!¾$—ÖÖ´-ÉmT'7}c/^mø›ñÆOÏ7H}PSÇ¤~Ñöoúnz±°­§«(ÁŞ×Ç”5ón3a°x5†ÿ*UıFXÅK¾DÒÀ0FÊ“Ú+?ŸØÉR»8û¥w€\¦’Gãğ€?Z4@‡$Z,Èë?°HV·‡ô™ŒĞTŒéy˜ÒäÅ@ë¨&£ÙqØ 5½G¡ph¼"hºĞˆ³±ßâ™)§°ÏiçòÓHÒCfŸ*í–0ÿŠ¨	Q:ºqJÚú§@Kï–Z ôˆG¨HÀÎ)_8:—¬¤EYMj,ÛJj|K‰"%yÊ×¶KÜ±êûCùt­sgÖ‹4¾((âÍ^=ıÙkÇÄ™ Q g‚3lüa`£réğñEeÌÓajŞş3¼üAâåd–Ú=ÜÓá™z©‚3=5¿ÚÔóßuÂÈÛÚ/¡¹™ªèflí–6 ì z?¦2Sºé¬y!ºìkÓ²<ş{O{a,ÑÿY¯;M%ßˆÆŞ†±òd¦¿!µ¡*A
gÄõÊÍÊÍÑÉöŞÍ`{Ó)N=?><úÎäp¥<ÈMùm§êEû€-*––¯\´ÍÒ]s)DbvW‚ô{„m¯UÆÌè…şì_Ê#™İDü¼x›6üæ9<ÒÈùâÇ‚¼Ò ´iEj™¿ÿ7i%mºÑ®ë¶ú5q3lcÓ¤íi·;è%%ãäQJx\¤Ü˜˜9ÃL¶È¹~MåÚw¹í)K9C‚öÁ L X¸’”\ü'‹ÔÑxÖ~«ºîúKnä “9-»¯qd½Úó¾4|	d9ß½ĞØBÀmà5¹‡1SŸ‰½•ÏÎk:ƒ|:O5#áwU¿á¡áÕÓG0¡Fåc§²‚Œ¾¢ºøbñ+Š©{È/xğPSóÂ]ãçq÷q8*^ƒ¼ÿNñÆ_Ê[¤Éİß8võ¾8}æU)qwXÓéš FÁĞ”C-¬VÜ:É@(6ÌØÛL9Iã;g¨1)êI¶`²@=
K¡BJççS¨+™'œ—ú µRğ™_“ûC‘%‰JõZ<”6N~BrÊ©E’GTäá0ñ6¯…¦H‹­(ÔDOÆ$ÙÈäı½w¤«;OAOQ×@Ä£í»/)L‘âåy¦é8´^&å¸/.nñíÆ¸~‡ƒ²Ä.S`ª¡qr,Ö÷çtX,—ÒLÈ%'ká#õµvE7şZÈJĞnïÖDßì×¿'Ùi¶ª(%ğº/Şå¯RÈ÷Êu'\ÑcqóPMÅV”ù¬­w%*Œ<ñÁŒÒº@-6ş;¶éÉ/4„ãÏu‰ğ_ˆp¨0Ñß#È‰„BÈñyOeBª»`•ÊÍİrè”­‡
¢Ğ$Î¦·Ø4—1Ó¥/~L[üyËâQ°…u0Ñn—*h¦T,†±<ÿÙÀ¢ßÛy'@VÇfÏÓÓúDêtuØ¨W¦yÁ2õq¹o>FÛ·8mËbòé‰îuü£§ãĞ®w2U˜ÆÁ[xe3•¿`E:Øœ‹án‡HR™boÙéT™tZY‘g!Ï®(ö™î&*pÆoù}@Ö
7;A—å³_ºûaùw¾×*b|LÊ¹ÀÑÃ¾<Ph',OÛ¶õ*ù1òëüG.:Z×‘Şyëbã¢é’Ù×xÑø¦K\ñ=¼¸ÈÃ'xRC–Gİ¯ù5»OéÆ½D(º±ÊèÆĞ3B¥øF~ŒH"FîLCytŸBõÒ_ÁßçºŸÊ+—çXD(ïÕšÂN‰Íë/`6’)ÉÎŸù…²x!¸îr™ˆwm¯­-bL!/ã¬jtqs5„Ìa-âtu(Ê€1vœHÔ¢PÃ¹5·íxÁ9¿ŠiÄ‡½ 6R#åÃ;ÈşÊ/·”S2Äª¶©LáùÈ°‘|±a=Í!”·ªt¹9e/–lü2=N×ËˆçÊóô&=´¡ú ›Å3(9ë|>t›^Â…s¥fáÒ?şãO¦O>ĞÃ©lŞe9U€C&ı=¿€.¡»NĞÈáƒ2?CcHKÜò¨?#:–ŸiQm5 òM€”MÍ	CW˜ÒËT­ Ş"ÓèÛ3+‰sPr]Ã?HbM±à²î”Ùœ(K=¼øIïyzµw mEÿ.Á´ã?6· uükduõ-x™§ƒÄ\ùò¸úÀÿæ:C–ªaŠ¦Dúƒ¡C]Ç_Œ–«'"~YÜíÖ4|‹ª~TõDÙkªºÕŸé±ñ£·Ï/VßÃf¢¾Ãß}¨ì0ë‰şµó·¢U=Wô24\¶ãÀ±Q#pì)Şã}(Şb?¸ã3 :ÁıèSªÓ]%É@÷LÍ%®$J4×¨Ój´9XQ³8w™í„lÎo3
¹²ªõñ”LrH …”i¢KÊ4 	2»ßâg”DğcE##?E‘"ßÉé0$®Ijú HÈÇ“îÅ*¡CrhŠë#ÕB“ŸñªIwdî¤,ÏPo’2nk÷›l=q6ğÃ°¤(ÉZ¿d"/È:ÕÏ3H+”J$h~LÊ”J·i¥ÎGô©åª|?m±Nw-sÎ—éò²–Úî8’{ª“OgLI0 q˜x”ãA© rŞÑÃ#÷Ó[¨÷á¶A£owZOÀ×İ/€ŠTïšB±—=l?Êğ´e‰e`Í" 7,ı´,ÍR®²K¬b:ÍÄ8¸Ù;üä—”¸ò¹Ú	¶]ÊE«]¯¢*¶é©'ÆU+`*>0TÓ~Ğ4Ñ0Rs´ºa6'¬åë{¹v‹’>HÒï|ü¿ø3&h{~8tpîíÃºk}5É4¤²ÒâÎP•'66•ğ¬k¦ÖÕ3Ìw5ºäë„8mÓ rz9"%Š'¦‘2£ü­'ÚÖ-7FÒU®SVÚ{Ğ:Síf¤ÒÓ.èœï9ì	ÿŞ¾ct¨À}‡vqJĞé¥<ÊÖù„Í†ltıOŒŸ5|ÖãïÑ¾X·B¸îP7zÉS‹]™GoJ0•P!=QÎ“s¶Ã#sâ?Ñ~Üú*!ë@ç²±72z¤)õ;§[<ù—gÎa>ôÑ½åX}¼’Í¹Ã[‡}c ßóØ÷t¡2Øö'ªq‘§‹E0O%Å/‹‹äª˜™íï2{é+©¹“
m±gBí(àX“$š€GÒœ?9C$‡{½Ş„ÂX´cÅ}x|Ea«2¾îÕj`ó[x‹qpkEWÄDr;™Îè¤†!¢i8íĞÍpº^Œ0_J¦‡4
´EöˆbÜì©òóf¡n¨±Eó yš¼9YsáÒÂÜÅ‘¨~ìæYd¦Öäj#ê¸‚¶!İ[8<Ñ˜xT1Â0ËÖñºáj)ôƒ9»~ÙI¦áÁÓb!Rí¡}_P«Z³™è¸`è14%SÄúx<DcÎ¯/8ø-ÈrÑç`úÅ/î©ÓòÆ‹¨ûLüÑ·lÇOOÄ/Ú£y¡ÜµÏ`Àe°AÙ«i3š±Aá–`•ìİÁŞkæşÄ‡<…K? fò‰Ü~”øİ)TcSÏ-Ìœ;ş˜ñ•tœ	è l:-Ì›).c_«%ãw’‰à‘Ï%ãû1¦£ º
VŞ1¹¡¼Ú‰Ö«Åaa¼ø<Ì0k7¯Ì/úU§áÊ[ó'œD.®åyÔO/Ï€úé×Kp] ò«»@ıÇu ~Tàì‘³İRş+Í­%½ºò_MÿPs|ù@Ëß¢L÷9F¡Üa‰*É³Î‘õ¿Ê@P³¸BÕO–¯¿“‡|Ùìİ~Ô*Ú s·ªS#¤Oõ©mÚÏÛÒVãù4MJ.¤M*s4Ì‹Éì°2#Œ·ÿÃüOĞdQe’WvS^w¾+÷TLÊ¢H™¤[5=M·<Z"°Lƒ3AoQœÛ˜¼ía–‚ÌŠ¹.ëßò>¢µ›°hZ±5<Vy»Ş¶=Iéhs¥Ÿ¾Æ•¥áhá3çúsóRTÍøûT6±ñ2ÎmzÕğ=!/÷1Å¿lºXòã]ªúQ
ÏDeî@²Êñì‰.Ñ“wí‚b<^Ä( ®”²âœÜæ¹4†´“aãR
~Ì‹)Y·‰t"ÄJy€“—Uz*Ëëcü²Ê1N ‡Fp¨õ8YÅPñ·Ì:“2?·aÙí¼œIÑj›ÿ„§Oâv ™á?nh¼½ømg›2âµ‡Ék˜H9ÇKÚßl^Œ×QÄÜE–×sO°œÍĞotPûâRäˆ§E¿%Û¹ ×â"?,YbÌåA@³–†^^¼¹*¨E°ÖÀÄED+)–i‘ú±Â¸õ„ß&ĞM6›}÷¿¹4<•kGÓ*±;òó—J¹¾Çë´ıİaV@„MÇ{ÚvÒka”
”:ÿôÁUXµ„~P¢g@C–FóBóJU:üdÂgiİàiøQ©Îê‚òšÛ64ªÓX¡¯±ãÊòµE¥ê<;'òœœ³*LN€O”ğ$ÿ”l·t§®†Yù›¿s«Àrx©tûõ§Váõ7iC*jkgo2:„“UOH‹)gDaïØ ÊØ®W‹êÓ…ôQ1ÿÔ]dÙ¿ïxîîeoºPa66ÿ·¿ôĞ˜.à­eûï{ÍF+“?ŠÚS##»»»åİñ²l`æ˜¼­Y†ÇsøehÒµéÂÒè[cï,Â£ğ—øsì·Y–EşmØ(‘_|9Xş»¿@ÍkÑk¹U§=] ıîı.F{ç¾l=í ‡ cô1Æ)Ş!8ô˜õ÷‘šúµ{(¿öğ6=ëe€èßpP‚è?¦2‡”ú4Gİ'yOJ1×†7HN©éfôY¯È3
	\]¾:ÌÖÿú·Õ«¬¸äì±±¥ËCFĞ“åTŞÔÓ‘k)ê§­¨X(Úº²˜™Ê.­tÌWı\Óß‰l~,ZüMªÁûƒĞåUÂ<…^é¯/­^AœïZŞ&¹r¦ÕŸiõÙïiõgZıW«×´ ®Õs^ş]Që¯8;&šı1uùÔa×N}ßâpü!(ïWÔ¥üT÷O°rV}MŠÁÜéşTUå]€å‡®¹Dş©íÖ–)ÈßØSÿ4(=ÍóuÊ>©ö¯õÖ—î/ñ®—â¯í€ÔùaqÇ×øÕLí£çÓIâcsKoZ÷ a;ñSŞí1º˜½bavÅ.h³¾¾®ü<¡ãYzOüÂùG˜ŞSĞ½Í0ÅÛpÎ*Vd%æÜltô´œòyƒÊZrÙŠĞõ¯xn£6xÁ
yçm2Oƒyš“¬®T»ÁŠˆ(ˆ·±[Íæ¸¸&Fêş@œÒ‹eåá€òù
ko–ÌËï¶Ì¹Iºã[˜u°Y•®7¥Ä+íz5©Ù&•‘§`–ª£¤_xxt·ûJMmù^Ó÷r0Ò3ŒÅÂğ¬îgüí >NCŸR­¹¾34¾¼|ß}ê8YI³\Ş&<(ièØ¦ny»ÌâúŠlU]4·ª¾ß[:H2Ú›08›^õ@V®û“V9#İë~¨@‰9rF ^à…Ö(›ÜãA‰Âî´BA–à˜ogÒŒY©øÕÑ}¢Úû%óìÄ/`gâd¶OàÁçİ|'Á¿Î•7*å\_Rì|FÑ•:W‘úiÊ»ß³ÕÀm¢ñvÅk9­ªç4Ø©¼jê6KÚ–6¸Å™TÖ$[>E›ÔâiÎ5œ¼ş’g,ÏÀy²£°{%² ÓëO—a.Î'²×§˜½ûœâ¯´#¯I7=pß#šª ¾}xîµØUß§Ü[Üšhğ+ö!İ‘Øü]¼9›–ÔD©ÄDßıáDœÇT)óæôŠ„s¨Z¨ÏXÎ›Ğ.€‰b_tŸâ­'™/î1æáÇÉü‚/ÿœš~ü]aQ€ğGÿ•ğÉ±ˆ‰¼ÃdÀ2¾(&'ZÒ}ºñıçî³W‹	ÉdSœ„—âØ‰>²¦³ç5›ïx¡·éQE{‡îÉ‚ynØiDÌmm‹ce(wšC-²væÇĞ~Ó*wP2ç€ñ2AXƒ}—«êÉÊ·ê6®ïáœÀuR“F‘7}0–¦şAÊìJA½3lÂCcÀóÜÍ*°!r¶)×²RÀ¥\N%qü:<"CC±’Ê jÊiQÊà^jûQ‹	ZD®Ô'(–Ÿtÿ‚¢[Á%ºj-ËÉ<À‹ÙÇ ´ì<yMëcä)•Ëa®¯`á¼%á˜d3M6Æ*øZÛ3¢Œh^ƒ|xè8¼qtØŞ<ãá¯{ÖEüş1\YnoV{lGJ2Ø XıË¸Õ)ásÆµ³9rW0q.{bLŒ¿ş2nu†‰ošÍmŞP÷mrÖÇg57O£b»j8XE‘&	È©	ÚñÙ†ÍWÍ¦gåÜYÎ=ÃA<jwÛPMwD¤˜	–ûx„¡İç`/‚9ùXsİ¡¬ÁŸ}Ì®–~ƒŸ!tß#w÷]+˜Ÿ¶ÈÈXøòWqÃdÓ>JÒˆa¦©/1Õ¯ü)tòdğçóî7˜ÑSœ…ÑÍÊCÅó=¤t£ŸÉêtğöKÌp•jøŒ2ñdW0ØcJ3vô‘¥•‰óB¶0ÇŠxæ8œ¬Ïmaô'V‡s¥ÈìÀ„ŒlÓ­;;Äş aÖ¦ §°âœ(4ÈùMò"Ã«ä«‰Ü YìC¯˜÷}á°3n5jìc&­}¿Èó»˜n^tÙô –Î¤Õãö¥v\ªnĞetèú•x[^•®‘¼nnÇ’ùØ%ô_•v”Ñ§-Ní™Ó”÷™íÏàw›RõÌçGw©d&–Ûft†w÷è®¤J£;ë·B¾šÕ(Ei¢§Èş¡Êüˆt†LÓÎ]J¾GÅ4x•Vûi5<Çw¿¦\Š”ÂfvÏä”,~è'êÏŸ‘ÃíTÀÜÁÕö[N“—¦–õ;Êé¼Ë§Ä~˜™óÂ`|Ÿ÷°Ÿ·åaİkãİÈi!sÛõ¢: *k:­¸„R‡n…LŒø¾%Wà÷„Ã¥ıÏ»‹Ó4€H}#ìé ­¾‘åÛQ†½àU´æ÷ªNˆµêÙ¢Šbs|gØPÿS^)^ÆuÀ6ašpÙâ5k©u&Çæ#NÛq:Q}˜ Éoyt¾
Â“äc‘nËPI5~²¨‹UÅÑ1êÜ.ğ‰ÔR,Y±ê7›ğ˜¶ÃjSÌYğóM*©¾¹øe¥Õï~C¼›5€Ùàºñ¦ì›Îû¯#¡•w?é~Ùı"Nwª˜ÈÿW¦!ÙóSÁ´»Gmò‰ İ˜nŸÂSBUÎí%ŸÏäÚƒĞÀÂ8ñ _ æÃ?"Á„ !r°MñIöYrÁ›H…‡‡Ê‹‚ñø“î_edY¬şr	CaQa†"Òì%¨àI¹CXØK:{Œå V’rütRH©Ç÷ e>¶Ë+,F*ø‹0y‡nà’2Ü&ú5˜µİ d…Ë…‡Ã¥È·Qc[ßŒ#Dœ*áa„ç€j®Óõ½FWBC=ÌaÄ)8 WoŞqjM¯%ÆD]Q’Eß ÆÚr<ë°V¼YÌXo_tXnaÊZlYèrt¢^BŒyÄ,"Œ²¶*¿õ
Eº i5ê/ÒäB…µÍ©Ë“š´Œåfä¼á×ùz	Ót-­^·AÅy»¼:×î4B×r3Ô*¥ğ8ô¿»ù\ªJJD“ˆf’¦£sZÕ¶SúFõN¸ò‰jûG•Æö¬¹WB¤ë­k¤¯Õr‰@*1Ñõ–×n»›E¡YRâEÃ(ğÈúÜ­»-ÙˆLÖ-ú¨ŠR?I’*Á¤ÖÑM$]|ªlVª•­ÌÄÈó•XıtëÂÖ/¶ı,æmæ_0+åòLù˜àÖ!ÙÓ.kâŒºEıŞ
Za<^jGÖô-aJ„@VÆ¢e×é}<›×Üæ÷¿µ6‡únışöõÑ(uëò-ñ‘Ä‰QïÀVı†WİÇE%ùÈBsò“UwÚĞS’·'G­åâmI6äİJ½NÚÕÌÚT4eÛ½øÌíNª)¤»ñ‰ĞÉ«RdV”W5!ÎWAµSØæ»¢,¹õ4ÒqÅ¡õéÃÖ›4Y€A®–]ï>o­–˜Veå2Ä*Ê%ü`>¬pjd¤-ï”A¾s¶9È‘ó“ııú„eÑçqÑ]®–Çe¹+PĞ+5gó†²Ë×zÁÙœØºpCÜGj(ÎHt¡š­È’â5*õà8i$1/ÀŒ5ì÷Jõc5ZªÛwî=Ê€x}b€ÛL‹qŞ1¼'j“£“çuxoÖª£Õó)
ì6=Œ"W›/'õãFÏWìãŸ÷Ø­Ÿ¥†*‡Àİbe˜N¾3tX.—oåõ1•şX¬»@;ııîTŞƒLÊø%ìè££»¼|às°,îç\Á W>ÿJ«òÙ9LL—k2jwgrnK…mş8ƒ˜-(-ß$ŸG³sozïACÒuğx ‹3j@]|Œtññ¬z|y‰=¤â£ÉÈTE Bp¡¯|ØĞW2qŸ×
c8.(Â± (}AG¦ØèX¥„ÈM(p­Æ¡\Ø¶4Tü“IMÓ8*&ÆÊzãâ4\.½i†F’Ka ú€¼jA'‹_ZFL­¹	ƒog¼l-)Ê?iVÂgz(¶)S@fo\ğL){R©K%VŠÕzR
Kh¥=r'iƒe.\µRDş"‹-ú¯ç˜0‡8Îå×æêk}Œ"Q­Ç04¡^˜¸f	S–Ÿ0ÚÇ´h<“êJ²%'ª—›^«üo˜³Ö2‚kb?gğÚĞá¿Ü²e‚ãŸ¬„–™¥h¨k‡ äİËÁlkÙê‡`\g—->;úÌ:şYÇßQ›X·nÈ±¤X9³¿×6p_†¯À„,wI&j€¡{Ù#¶áVë-<àQ;¡~WmÛ~Z€Hÿí|ë$-´>™A;ŸU0¶‡A»
`]Ö|,âÌV’+ı{ÇÁÉÃX}ÕãD
ü²z‘ŸÑ‚ø¦È.‰À€3£5c€c­T±Ùf´ö°QÕ{’0Eºœî4µZw‚ğ5§
ed
ÉoÄ8ˆTÿ©Æi<ÓC¾Cg¶iÖç5¢ÜIlSÕ¾×¶i²–ïˆmÚ#÷qNN³:F3P®èì„ü?˜€ZçèT`#à4Åé>uE™ÒAËxÂ¯?êuo¯±º·g©{¦î "-Ã³Ò¶šaò]æ¨|ZÌ«ş   ÿÿì}[sÇ•æ»~EºWC c q#(Å…5`ĞƒA6Ğ ­î®ªn‚kêÆÕNÄÆîËFìËÄŒÇ#‰&-S–,Ó¿|_°?aÏ9y©¼VUãBÒ6[6Ñ]•••—“'OËw
x•£§,›,yƒb¼Ü—íü§¢Ÿ»ñ™ğî4kV7Å«@ÛèO¨ÏSİ™g| n3Gû©)’tÜüüãåşÀ4ç x?ÿ˜ş]`à_ÑÔ÷ıh«ë¼$Ä?¬7¤ˆ ğ(æ9páòsF)24oq³ÃÊoÁdD^ùÉË¼}"·Ù‡à¡)_Y’GI]ïJµ"‹Û8%Ój|ÊÅ×êõBÔ›œz`f¬šë-ıÑ‹;·§ùGè÷A¸Œ³A&ÅËAÕ”ÿ,•³ùpñEæP(=jm›´Şğ\ú3<ğ7ÏƒÖŞ¢,üCºOÄ––,‡4Ô?^šĞNÒ7VO»øóödõÊäøä,aŠÜ6|¢B¸yúÕÁ.Ì‹#?ùùqä§Lù)™/G~8´‚šØ@>ù	JœÌ’Û¦¢Q&\ç&Âé>€gºF®½Œ‰lÒİü1{Nhs4¥f6›©Ö¤Ä22‡Æ,´Ó°@œìn785ÏeÜnx-P@F…@"SFN¢ÂŸÉt»ŞŠÆ&'ÍÈ üŠ:JÖè'D€,yNœÉJİ<çC`¦$õİùNcÖWŞÜ6€fÕ·8UÜš~ƒ9£Æû0àõ^z‚&…)Ñ­Ê=Û‰ÖÀiA¸'£3;åå@¬B½R¶&JŸĞcm¼è±6Êù´"4˜<sLù…ÿp|ÊEøïÒÃ=gHSÓ'şšänŸE³ò^½ÀQÀjiĞ‚‡RÅùĞ?qÿïŸÿ÷¿H:@SÀ…únG©÷¤('Ğ¯éíAjÜ;Rë¶íV§úŒ*ën<X¾”êm5ÃjÍ^wvßóu`=ÚŞ f@iCD1oGE9?ˆ€ìp¨	'mÒsqË°ÔKm×ûMŒù-1h²àIZ77Şw€JÄÏ*ÌØ“õ&ú0Ä„©}3j4ëY8Ãû@X[qü!gËÍÎ‡Qc©ÃYHÚl÷[ÄSìpzkîi8ÉtÅ{m˜Æ‚·7’uà?ş¯Z°¼×¢»Áâ·ÏÔ2Ù'}Á?…LŒZ/cLäš—á¿-Ç±Ã› Iyt”e‡™ÎIDC•4©ƒ}Ø÷êÊ•fRÓ´Ôìl]™Pœ}Ë{f(ôuğÁÃ2ç;á9’Ó*:
U§-r’G®2v€¼L{áçÏîÄ”g7@ Öu`yÂ°GO;=H8í.ôwxXöTÛÍ@¾È×´—Ù"ó]L8sYá4òóÈ“^k×I½2B›†Í”Ì4©Ài¼¹EîTb!­h¿qÿ"„¢ÖdA8$Ná!qBco“k’1Xú¡2ÏÌ–‹ÇD?ÿ¡ô¶Ñˆá›öàÒ4gzrÃâ|Kİ
m«ùö— O¼7c‰\ˆ6×Gæç˜-ô@UqB0Äš¢Øó‡z4œ»^R	«w_d$%èÿp¿Ù®ÚŠù‘£º§½t¡1•ÏøLH=´¯`T=”m£–"h=õm±V<¼áyæç£”ÆÃ7[ÃqY•üôFÄvc
™¥MäR+’ºT6S…1ı9ä×\b>|2P…’¿$x*¨¢ãmg@`Ä?>ş0“!`4°‘AÌÌcÄ³â¡+á Š°ÿœG=ı
Zôİ‹_Êx¨gÔª<ğ1ŸÚÊo˜îà Ìºfj>ıÜ±‰ï¼èÔÄ„SSæ½„‚špTb7ß ,A±˜îQg¯ŞÙ82ÕVRï4†RàC»Í¢¸Äq¯›P½HßòsD´§)ÊÕ	o3¸Ç$cç‹év¦v£¹íè3Şv-yŒÙ+GÆã÷a¤¢dşñŸ0…€=³ Æğe%Æ¤3¯]à¶Çı&éï9$ı•hDë1•cèUß ¿’›ÀNva‡ë½ú²ºª’ÃŞÏŸ9ƒ<ÁZN“2Xs‹-›<X{D5¢t>a%B×d´~÷e¥g$.Œ‹Åy‡	‹=XĞùÙŠı‡2ËgjäN>¢ZˆÎÙ­,zpAäbwz-Áƒ¾$˜IúòL
b_bØå‘°ì.Ú´¿¡ÓÉ—nIÀn€‘¶,ÄŠñäíĞ³4‹kÅ9ã’ØD‰Ä$íÇá1Á}Aãb÷#å9õñxÒX<Ò‚@ÅixäÀöŠbO%4‰7lµ~#©w÷†É1 K(=ç"‰VÚ,€ õD ƒòàc—çõ¾Îæ‚d›6M uTêÎİ£LB8s4O­©)¹Ğ‘ª%eeaõn·%qõÒî7;01œ#Mşª²±TÄ`ö¡Á6ğÃÕ>¿õ¶÷ˆRaŸGH9»ÍÙ./Ü1dá0 °k¯6=É,—[Kİ§$Aé¼”ºš¡œe´É$dK6x0îtâÿRIìŸŠå-6zÂß³fØYÆ™PàóG´GßmJ³\çòJŸ‘»`¹<‡T=ßhĞoÆz+gO+³Ş”NòâƒÔ•âŒ­gÊ¿õLÃÖ“?ğk­~ªy	È(‰Ç±Ó8S:~BdğMŒ[ÆÒĞ'wJüâºúMº<Ôä[€AÂ~¿ÙêY^Ÿù’EÚÎ$‹B±bšÄ
f/-ÃÈ`KîÂÍqÎ•Xl×)húşØeÛh3'ÆÄë¿«”›¤³œ&çäøãş-\7tÁ2%Ûh0@L)™ğUŠ­û¯ı(9((¹n=S*™½)AË#Ü†¢Ñ_½xÄ²ÔÒ{NP’Ø•¿™]êó¢ó YÊÕÙm]A«ó´³–}²¹È’ºbø."¥×¤ÅrUsGa„MÃ×7¹²0‹_ËÔÜ–i“8™ ¼è	ÁH~"ám“.<AdÈYªÄLİí'‘àLélåÈgap¬!ºN_Ljø09\4Ñ¾c1F»5%Ø"ïm°p˜áÃ`ˆÎ®yáó´ƒÆvÂ:©;ç!`S†áÊÅHÉõÖõÎ¯½ëOM…”†Ë‰Ã§B„¢¼g2çS®rü5	Î_ÒÿıgÉ–…[m¢Î'Û‚¸ÛñˆÂ‰CÅÙ»7Ô@c7^I1ÏøoœD-ó¢@Z$+¢µ–¥è’g×pÏd&št	”hÄm%<%”,˜±¾¥vZÊO8pòSÎP[L“·ËD¡éƒ&Á° ”ƒ¼h8 êü#çæ£Nò¹Rœ;~?fš˜†;Ÿ~„¤#ã¿¾øŒÆéÇl!‰02œ4Ù;ÍxI6bğêä`pÎÖÓÙt­œ¼Ps=âe®İ_)—åğ¹z•!²‡4İ>“«ò©(»Eç-.¦Ëˆ_¹Œ2ÓÙ§}êó¹^â5 ;1•W7ÔvJ6Ìuü FÓ`ŞÈÎz{§xE–Y›ç“7rµ²q¦ÒË¼ò*¥<İ9u”Â…k˜2½Å©k†'¶zƒçò¾ÁÍêgÑbÎ¼Ä±y£WïõÓAª5pùo ‘‰ø'e‚áÇ4éz\uhKÂòrİ:h‚åŞlÀƒ‰/æyH¿(€w<š8}ÏôCu‡÷áa”:râš;løGö‘d„%Q¯Ÿt#òÀ^œğØUf?\íÅËñ~”, 	…/ˆêCÎBØæ*Õ{Í¬­Úìl·ú(ş4Lä=Nç”»õä´5D“× éOÕ½Üöx+ñÎÁ‘¯lµ]ïjeè…€ ?Œ®Rƒ›ë’µnièÆ}J:¾WX¶ãVœ¤yáí?âíHï¢çìıºfš#…XàÙPüwĞÙª×°v’Ë,
…>áø9ÌH?ĞsXLN[80ømØ[	´)øfG?ˆ½¸âêHÉ‰^ èä»¸9äÆRES£±òHN2®XEêI®\NÀÉ M
š?†®R¹}4Ú{ÂÖp/Í±qô0mr•à3è¯IG¨È+‡ÆÃ?ç&kTÓjrºlşÍëŞâ´êh¬×n¼{—L<wû¹îÂT{^è&~ÈkØ©5ÜKü ûp	.Â?ÆÒ{cïnÃ™R§¼á%†ãŞÆøÉqÑÍGkÈ…—»õTŞ[äÙ9Š€ÚrâµÎˆ¤¨í9}ÓwÓf‡´«jò)é\¨$nNÉŒÒˆÚTs‹š0¶.Ğ¤'Q&*?F,×„ª4;^ºd:C@Syç¾sz]Äv5Ÿwüƒ:PÜ¸¦?ÑÈ/>áÇ2a*=ø@ûG	àò2dİKŒâ|s09©Æ‚øjüdÑÓjª“jf/Ó'q¡µ4³ëê¡Ê–¥XÃÌË¦.£ØRÌEÔ|‚Î1?'§NØÕ<É|*%SwæRÒ3¹Ò!Ë°Uæ¤“·µ¢^$µîÃâ¼pê¹Kâ42˜‚¼pf“òôøwJo‚]8Í”˜ë§ŸJ“>-~F<™ÎI‹a{*2OÓ©\öÀÌ­i¾ÑGg´”u?¿ynâXK¢4êlk/:l¦Ùâ'›la=iĞY²ÂkyjÖæJVÉQa>BCv¡¡êT€Ë;°ãÀßFw#7Kmåı\;¦x@©ÙibŠBÓY61Ê(,¾U¯Ì¸€Ââc<3©™tˆ4{½ÁcÃÕ2KqH+÷÷îdyÜâú[¢3¦ğÂÀ§2ñò ï30ñ^ñ˜x­ıŞÑ×•Şè¤SDw+Ã¾Ü*çÔŞóm¥½´L½Bk×Ÿ¡Š¯BÈe™UÑË}æÂÆ¡½Ô€ƒ˜O*Êö·"{£Úÿ4v!¶³Š_ÛÅ¼ò•Ï+ër<sV¢}ß«üñøş
E"7Lk›v´dq·áz+uİ<ğÚE(èà¢ÍEå;—]óF{iæïÂ®æ|lü;™?ˆn HâÎF«Œ,&PÎƒe!ì²ó6Á,¼}ÊK,#Ìi-#à,4­ä‚7¡f””é ‡3“”m¢âùèÙx¦9ê‘ĞHåˆı­—~=I~Å­"œ8Ÿÿ$Ñ?ô›IägÂÊáÜ¢êÍ¯Ë?>§¨šUËğ!«V«vİ£Ü@1ËL—)v84ğú0ú»›çôğ^Í´ÃòäWà?7†ß³1J×<½ätÑÖÈ?'ôâÿVR8§üÚ0¶ôã3øñzt’-–ãBÿÊ4ëv—;º§ı­ã™_Y¢1g´pĞ†IÆ7}^(;ìø(ÃÕ6*j³^/-{5‘yØ<Ü<Ÿ°¬æ!.Dm7ÔPX}N*2LP‡ÙÍ£w&m»øW¦eÜcÇ„£nÖn9šAÆ–ËÚŠ™[˜ƒé6Œ;“o(ÍÉ,^¦²±™Øƒn[%Œw%™]BñÕ2¹S²¹£†§¾V+ë×À*Ÿ?Ø·Şõ¥üP^·Æm?ç¹À¢ÎIØFQ%½#†ğÍj:ûÕ”·[ê©ş²÷Ì,vNd½Ì
r6P}|Nµb'êIT48‰÷Ó«‡Ó¡…Zå®Yø|Öºù“®x»ˆ.·¿§Ä¦"‘éÿÊKeú†)ü%m±%bp¿5–ã©vİó_ç¹÷šï9éz1_"‰QÔ`x–Óë~³ğ^înüıW°çF®6d5<¯áV†±Ÿë6¬½äÄ{°øQfºøı=Fwà/yÌş=¹’¿áIÛo©Åçİ„³%øyÕò8Ï­W{ÉI×`y‘Fˆ
Ö‹£l‹r!¶Ûõ7kí%î¸2î†İZ_fãşT]¢–Ó˜»Ê¬Öœ !X¬ßQìéÇ¢c‰7óŸ_?K¸¤Ÿ£­¡¨PïøÚµ¯B9­÷ş…œgôòÙŞ¹¹½D&–sb†;ñ¹ñ ı-'e2­0¼€,!}"½t¼¤ÌMğ“ga<ûËä¾…i§5ög[qô¡f€r¦ü>ï}÷'àPy`„ƒo7cŸî´ÏSæ¼T­Fê‘ÉÜÔ#< ìx*ÔRñ÷*"šİã2B)¥´R?Ïë6gXÃ™eíoKeZYDƒE3ÆÀı'øºÏ¯…İ3Ì&gèB³W†ÙnH ,`†–sŸV¡›‰2œ¥8}Vn+ÂcG0îƒ$ÌÚƒ¥gÇ[±§¾8;˜÷³J:³”2îÏ6ãİ]CUP¯‡ú'¹Ğ•e{/Úşp+~à…fãj…ˆÿ®rô8‚`5¸T\×8!ğ#à/äÉuöN.ê%Úö-šÜÀèŸ‹lş¯;*ñ?ò—I™ÏæÛZ‚¾Nâ@v]¿„Ë÷´½^»õ~œ¸CÌè!6s,/ˆ>FŞã€øùñïaãKÛ±CĞÌˆ…ÛˆÉØC¨R„ôëí5Sî/2˜ô™·ND$ú	—‡”AK%©=ÈU¼S— PœïT>¦×£"î”BÇIü&IÉ<Í/M¥¿†“ĞŸ•€£4!¢v+@Wá âyJÉ½²È¿íÔ@~3¥féD¸}yãj  ‡¥D_À0‰?J£ÎŸ€[|Á1v¸õkU0ÉƒMJ éz»ÚYü@¹('bBÜÑ`k]ÑY‚Yx€®l¤ÃsÜÑŞ%*ù^HêûÀµš?ß‡çó_óÆ^3j5P–x­™½	N`£ˆÖXô}|üÍ‹‡°Šêy^<"XVJ•º¨oqÕ;¨y|Å‡–»B^8s©<(õˆ6­I††ü	±»§pı!å­@ïØOÉƒJ<=~rü•î?¨¾¨Ï_gñıáÊ}&jÂaı%WÏàî×Uoûh #‚£'bÃË´q0Ø"Q¥˜Šmxt¯Ù}äY¨pî¶š”z"ŞaıTAWD9»0ğâu ıòÁÒ’~‡h‰hhc»îÀGdrê:éxR —Ø´%¹…W0Ö¤{v:rg€$
á-½(‰B..²¶õCÂBÎ‘BœHüOüÈ qƒ¢ùá/Í¤—øƒA†³ƒº˜ŒZÖ#Ì%{B8Shímø/ºSJcx
Ê* E1J'šìï)0ì™´N¨]„Oøg/¾à‘Àòÿecu…ñI8LgšUDüOšÛi.’³ã/‘¶‰Ö®öóbIi$”Ê÷íÃ“æ—ôiÔ1®ÌAòóv[#át¦.ı–Ú²c"KÛxÔàİú ‚¦¹„²†qÏya‡Âø´±ãV—à¶áNRÕÌİ²;|k}ÉÛÊÁÿÏnrÇ/Ï¼äùµÁN	¸­ü+ñM¦p®#©“ÌDÛIÔ“Ó­•:ıŒ‹2lw) 	Ñ—Ì²zç€ô I5%|CŞåNÜÄ¶VF¼˜È^ÙÜB:Ï…~…tó*‰†ÒA~Š$ÿş›<	p²™ïvØÆl­¿…¾c<4¦gA,í-è`1ƒ($Š<’øëšRŒ!iì÷è/@Ê]àëããßàw‘U&;î	´suF¸ãÖé€Qj¢h®3ÑÕ_0Xsl³›ä×¬‘Ğ°(Ãx¬lÔn­×|éıd¶9uwJÌúêæ£ºV[Y\Z¹QAƒ`!sÌcâ*ßÔ»%•K¬Š±n¿•zL&2Di1KxĞ}…×Ó¶€UÖWÔ7.°9â Íd»¥k
Ã|´Üª³~âİ2Ù½¢¤İì`õ¸ÓìÅfÂÃaó #'†Ãåx7•Héï±‰‘"¨GÜC•ËtPşPî=ùí™NbKbR¿ÀÃöÇƒnÊÄ0È¤&M•æ¿£ÜNÒÑÈ>»É$PBVü´AU’™ïŞPŠ.Ä4nÙ6¹ñ½é"eİEKYgû¤H¶I9Í•AéÈqt5Z¿2á$¡(-“—)¾Ú†i‘	ÈyÒí$nµ¶ê	œ¬šãgfT6Áİ°,:$ÔØV¼;Êho
`ÇÒXpˆX,u8œR„µ8›Êù†ÆíÔô·!àéÉ¶D-q›úr	¹}Ø‰öÙ"T;<B@º‡³	3¼ÑC#æğÈÑ°—‡`BĞ× +ˆW·ïâ)YZ
¯3C9“!Œ_–(††ÆX8¬İ
ùÏS—şãÿüOÑ9Õ_ï²2²G|Â5#ÜwUOx]™,b³Æ~„]EˆlDvõBI"òÆr0æÅÆ+ÚÀ
î¹çŸ¬‹‘¼ ?¡ÌFˆD¹“ÌÑÏ?
z xıŠakF“F	!xêˆßp.ø”NË_şèœ–	Td-‰{"‡ùz´ÛL{É[&å¬•ÔIöáQŸ7Z–­«Uİ¾ˆ\LğÆ¶éÃÛöBcÍt£ŞjUFYßg™h„#9'W(ÎFıuq	<¿6ıhÁÇ‘(V;­ƒpÍòÀWX·8õšG]Q·QõâÎ;>–2Şñbx»VûLÉÖ0>Èê)^Ü
òJæ¥ å }']¡¢i|Øë'ºm5›Æw'„buM³,f;õüW¿cè²e©'=‚ßIZ-TáiÛom7Çû€˜.™M.²©Çj´S%ZsÍ#>%µ¹‘•syŞ%b"”‡)İæ¥=ÉOzr{r:c¨èlÕ»©E>ÈÎ¾î1tD¶<¿R’oÏ–f¤§€Ó÷–Ä‹WŒşm?ëÖ@ZİLânoû/Ñ<Œ3zò’~¼üF"HÅsáåÒ‹vcÌªó´ZõûŸ²@7o¯°A.6“ˆû¬½—)Sxk…·bW¢¤§N4şF»ğ Ş'§Mpr±@'æ¥OIæãò˜ÜÄËéI(Ìr"nê7»:÷9Of~B8dĞ`8(5Ì²Nµ%ÁTÈ™øy©a–JåÍ˜ÿŞ¹3>íI_Š 7CÁŞ:‚˜uî|ˆJ½o‰¾Š½z†Æ‚©Ÿş*bså:çç@àú»}„w”Ad!P)ã~U¨Dm4oËK1&ÉÈÀIæ¿sŸœuŞÖMš÷1İGñû¼îH¾C³åá6ówuûI·eÂ@g—òçªkaÂSÏJ“^àÁœ9—ŒúPíÅ·P‚åùzÂIÎ|­U+òvœ!Q‹îù¬U¹Y/rÔ3UT®´¨;ò!åkÑêÎTâN¹J\zÕŒ'›¯ù…/; NÆûáåÆåg§ğ†/54¬p(rÆ¡¤JUÿˆ9İx„¢«_!Îsô<UB„2INº¨ySx çMO…6Áz\óOzºÔp?éû+vüª¹–^e/åÆ›E6¿²È–6V—ç7k‹¹püÔö‚t.¼LŞı¢T3ef¤¤©IY‹Ï`N”Mî¦E(µ„ëÊÖÖÖW
³±vëúòÒ[›¿Q{“qòÌ_å3m³w¨ø¢Ö‡æ%ÖhWk¹	Âò3¼„á6¼ÔŸìÁ6Mx=8iŒ—»™êplc7ë”6²ƒ[=î½ÀÙâ_mô€'n±0*à|ıûçºı½ú½ùímãòéüù½Yí¿!ÃÄ×có^|Ì¿r“îoÒE:˜“zñÃeîxı¿qÂäs½qb†~…]`7£vœhDëÚv-ş³uß7;ì¬RéÃôÕ±ˆñŠ_‰Ûå (U`X†	‰ƒãhˆ9Ÿ8Òc—9KmÔVñÒ#+LRÀmÓè „ğwh:aPÇ3ô›åˆÚÜã,=¨:kEõ$Ğ'£7Kù¬lóYÆXyÖE'‰4ÅÈÑ,õö¨,›Š¬OQ±Ô¯·Zˆ@±ÛŠ·è;au7; b!/Zb;QÔÀ¼-¹Í´Ûgá†k°NFlMõX°R3ò³¤—¯d.Oíß5~©Œ‹—/Ôg`#+z—øTéåì¦^Ç‰Ê{ï/-×ØZmıæÒÆÆÒêÊFĞ]ÎÇRYa]yÍíçåš?áêx!tÂ‹—¦ÈKB¨ßupç½¨ü“¦âb¶[°?ÅSËÖŒ45#(M§‹8Œ›ˆ-’ı•Œí¹ñ<§"¥Îız«Ù¨£Ã/±’«÷{{qÒüˆ»ïP`<ØNQ1â4Hé‰"…
6ôhÄöhV†‡ğ½w37äµZÄ>œ³„èô[ÙÎ5QtYKÙÁ
÷Ÿ2Å	C-i…èº!EY³¸;ÏÀñ=VŸ‘°œ"ÓÂ€¼'*3şgü= ï#¶__yz¶– ßØh!ŠÕg‘O0"ÄÚ²LDo6‚óÚÖWomÖpŒƒ; Ï¢õêy¿-˜i©‰¼NŒş+ÒØ|Æ#5Ğ’úDñ›ˆ—ÜoÀ•/Ì|JzÅô`X¥Û)/ßİZıt/ãëÊ‘ŒƒmÇænŠÂ£8u¿L®ÎQLÒ(~ÃÏMªñğól¬^9'—KŠ³omI{‹3¦‰xÃÃÏ‡oü|c³v“-¬®¼¿t#,ÉË‰xõ¬<ç8­«'LÒyx»§ı Ê/|c%ÀËëøŸDŒÿËKèJ(¾#Uá|O+¸=?Ê#ŞdR"È,ğú(I‰í§¤´.†ğ’÷¿TÏ•w¥2âß7)ÊÃ÷í{EÜ¿`Š­ÀZ†'Ünp*‡ÉzÇWº‚™V›¸pqÂ-ñç´ÜX^½>¿ÌÖn­ß¨÷‚¿¯w˜=yhğ;s?aÃœ@x$ª ¾bÖúÉî«gÿOÈéü9gÖººyX^>$Ü\L‚£ÿöøøïŸäşğˆ'ı•	Õ?¡Ş§#nÿÕ8tßH©Ÿ–!ğzX9œoŒr°¥ e0ÿ¸}0JÛBœà".‡¡u\§üR7¾k½¤½ ¿å<6suñmb$O¸Ghk}Àİ!Dñ"¢¥ÆÍOŒûáüP_GŞ}ëèİ·ŞgcccL\æè }Ç~ÚŒöñö[@úiO+¤ô¨ÄU6ŒfSšcŒ>éá?ĞñÑ·f™º3ËR
ƒC·ÖŞ,ş0:—xÄ‡ºf…”.oÄ!ëÅFÑ,~åĞO£ùn#¯€‡GŞUÅo· •˜<€š{‡İèÁ<ÎÕ;·ï¼7|ûYœBÅô]H GjôòƒŠø‡QxÂ¨¹ÙnöŒÛS3úıxg*¡šVék¸ª:ÅKq/az`^»`<V©èÏEíz³¥=VË~ç<•F­h»5–c>,Ùo{<Ù?—yoÿÔ±Ä“9èÕÀ¥â™!Ù;iˆ'U° ]0ç6üfŠœY8bXõîMM9%qAkY=£5†ÅÅ­#^^s¨à©ûÀdêŞµY6Ô@ÔİdJûd ïûõƒ3é{³³ÓîO:Äëİ]Æ šk¼¶ş$,1Z:kI{X4w?n6Şƒ
ğ/=²'Ku3]ïµ`@ï­Lp•ùÂ"À03ÓeŞ™åáánİÇ‚3áÏ,r¾ÙI×¤>îT#~¡mÍ²ÛÕj¢¿ûªŒhå(ĞDd¥WÅ€Êñ…2÷›i¶höW8¦¢ğ·
ï{W{Ù'x${¾Áy0L} ø5½ßFEuA U6¢ÂrFÍşªi0Ş#^tÄ"Í-S}æıÂ;Ûï MDàòpRÎF¾d¯½3’Å*ˆÈ†ùdÁêĞŞ0U¢JÉVY³ÅeœEhY/ÒXŸ21k\Nè„ºĞgK2XwDÈœ¶ES®±{/>Gÿ†_ÁÁŒÃ×¿á¶C±S¿}è})lLÜÄHq¯ºo„>|d£†ÿ3Ãµ/>–êéÇ´ó?Aaà9¾7CˆFÄ)ºù/Õ{¢Ñ³ìŞ|±ƒ¸ÏÒ¾ø²Ş½˜ÄÕzD©Öp.É¼Ök€†Hù×Ø&"Ló½Æ‰5“iš&¹zïİ·ä’Öùî°¤Ém1àEF 
fË9–|°[æ‘Kæ7(’ÿse”xZ…S”€»÷5-ºÕ`Ìæ,Ë"‚Ceœ±VäEÖÓƒÎ¶AdÔğäÀúá´²!P}¿âÑNÔÛŞ®Œ×»ÍqŠ¯£H4†9¾U‡›c| ?fœE;êíÅ»¶º±Y1ƒuyüz:ëDUH²Ézó U0æ¸SÇã«Æ‘ÆŠõ;¯[¥f®ƒàË±wPz:ºg–·‚†ÑKo–pçª|s}ãˆ¡i&5ÁrÖ=Ò_¯0hÕøÃ«G.º}Çx”ñÆY6nXÌLŸŸ(Ië½ºš#|5Í°Uó6GØ¨Bù8®¼2`b¹ddiUÌ"AòŠùfkÔw8)à¬³a(4âöºëTL¼ÊZ‚l‡Ú"Ş©½I¾‡ÿ=r¶:í€Úé
8!ÂÙ~†fµŸ*+Â"'æ5Ë\’§Q¢ÿÿƒeb8#AàÂE¶øL×«<¿>æJd>Öˆ0MP%™ á¡ÇhîËğµˆnñæ>*dÄ/>W¾e¨'X_Ú\Z˜_fóËµõÍY&™p}f·ß‹€å:ü˜¦7¢{tò„g—õ9'¡3ßı&ÌŞ~³á‘IÜ†ë=ôÔ˜{µrjn¬S6[áñÊ³v4Í:òçÄ9\C€)/Ö–k›µ²ly0&lõªÔ·1¾ÍVÔ+ïiTr˜òŸ7gíÑXÜîÌYëšï-'æ©j˜°Û!âüˆ¦Ù;3µÁ0.>ñ>d…d ›¾ç%Ñk¤*¸úö!ı=ºÀ5ğ›9ºÀ‰.Dí¸İZ_Âµ#sÖu#GèÈï/©iFî½k4Ï]MĞ`}Õdk¢pd„œ±Ÿ€ù»E¤&”9ÃX°JsüÿÈ2—Ú^¤[ßmv¨u×ª¤®ÁòÙ‰ä­0•)šÅÏËMR;b;ˆÃÖ:Ğ`’D2m’~ ê§QmgÖğ°NqÖ²=EİiÂ8YÜqeâ 0şõH£ú~œ´k÷aúµš#:ÓÁµÅh§ŞoõäX+MÔ°,»Î×#(nÉ–~Jj—˜¥2®[ïÅùl¶£¸o‰‡—Á°ÌL¸kAo{‹„6È†›iÌ¹ı#¯R_—*›!z	4/oS=«İ nÔ»µ¡m4í»~;JšÛŠÕ·A°ßƒëéÂ;«ı³òwej¬ÑÜmfW÷â~â¹Ìƒ¢ÿ)š,Š&§fyÂ¨L>hGœ“Òm.TWd?f†¿³!CÄ£ÕlÃœ»¤À4šÉÕC®Uº&4áğ–V/©(ÓŸ–Dä‚PAs²HÙõº×CVú¸³A™edâ9şèQĞÄ™Eø„smpôjnÀ”F®ù3ANècÄ Iä
)d†Ğe.g"Ó%7ågQÃà&Í·•ZÈahöA:º!)Š”
âçS>¿’.ŸÊ´\Öÿ†#ÂI\*N)ó¸qŠ$V‰¤Ta	VÅ±|ú»å¥ZIVõİ×‹qåda3X£™Õ†¨§EÍQt„še·Öç7k£•/ªîVGÙÂzîÜ][_eln®İ•eÜ·ä¤OÖí{
aß›NÕÊP*˜vÂYO2L-²‰‰¿ÓÌ6z’'#êøLˆÂÎHúÊ„ãºªØ©×ÅÇ*	‘]øsX½°æ7b¥"Ò¤1DNä|yñßĞüş1µv×/É ¯ÇòÕDâr«W—_N¸x3Ğ'¡‘j®_:$üg˜!8+? ¡DÏ7+÷µ\¹EÑ|c˜
1c°µï{`ê<"á${™#ˆ°h›²šÃå	úÆ'½œ£†Ê¼Çó@—öqô7²RN;Ş#™[ÈÅîƒÓ8†˜Ó)Èô 	ú}èŞè"XYØ	Äu~ ëC©n¢Ì ‡DÎK,èS×Û£]ø°0•g‘v^;:åØ”b#‚wœj†SÌ]³‘§„BŞ<Æ³fSF—|);Hù0ue³oÄVc†Ø/nMBÁ”[ş<<Ÿ£vvâb$»NñøC4Ë“o˜À~Yb?©wó*E–W‚øî¶Ætp½“d-ó›&uŞE­.p”ó™NYEİ’à¯œ§™°_Š²Ë6˜«ªïpr?Ò*Ì’rû—‹³>¬õ£_u4óâ¸Ç®Ì¤°ÚLêéŞ”d\Ó¾Vœv=kîfÌ•ÖÛSó=_¾ˆ{¶‰7çùb÷7MÜrö_‡r,ª‘v3ı-¯­LŸ­dTaó­(ém¢If7Cšvİ—5Ì;“`ÌmîÅçy¦%ËÇõw}şÌéuQ`nÖñØŸù)r$`´‘ÃÆØ²ä >h)iWBï5àqÙªÊÛŸÎfué”@Š1jşÆ|º\@cÄ,³áŒEM·¡!ˆTttãÃ{
Ş8^N@æçûğœ2¼cmmúúñQ_íM}’—É‚Òl1À‹âfëV@‰=ÔjÁöÇ&}±Á“(uŠD4‚ØŠ2dã].‰íÚ»#]>gÒ]-ät&ÜØ°VÙ¹Öò˜ó×OàÂùÛÎ{nBâ±5æâ
1>‹;íÁ€î]ô‚¨«rh®*ï™'oJÒû˜ßÚ\àÁhgH{õvW\+¹¬¿Íyn•ÿFÃ¤ğéÀH÷q+Eaÿ´¯pÕ¥Ü5âß³Ã¾­I˜HªLÏ¤o_|Ñ|ôHÂ@¢ûÉvIÀê‚®}F¾"ÂEãÙ‹‡è8Ï–Ö8Ç›o4àÌ–şª<²€NağÈ÷SbgöyW_!ªõ¥0Şvšõd}ñ¡´1ƒ·6ºõÎÕÃw¬ášœ2x]^bUaá9š5;¤bÚjÅ°!´™-VFG	ä²G*ıÌ¦K%‹Aéâ+&ó¸™¤C‹T¬-ÓK)÷³€jÑÌ¹I´L-õëÇY Ïƒ‡ÎÊ:û&WÕW:;šİ ] H-ûõ·™ë¬ŠÑ2Ç Û/2¯*ˆç9÷à2<…øĞ®€p‚æt4ËGµ'läÀ„š-9À°?Àrƒì¨ëÏÂB÷¤ó­óÈ_ÂH*R¨ÌŸ‚]:ğ”…y=ãDçNæ PÏze(U_ápù8{
üÅ@İ®®?¦` í.KQay
?ed*ü(¹ª`*Âšš-€Ë
‡(®à%KQø	pÒ²øÈÁsàå)n–N9Ü “fI*c/‡fŒQ4„ÛI_wë½S‚;×-!˜Òn_¥´ë%ıÎ6bÏ	ğ¤€Î@º”±Ø'“Ô$öC–Ÿ»dšBÇ¥áÊÒ"¬Qöc–İDR+‚½@Ó^¡T~bj.Nd3Xyï¾èP¾¿Â1Â©ÕäÌŒ"›;i=…ç¨LR:ß;yèxL´š“1‰„ê*eLÖìíWÈÎîK¨š}®éÏf9D): ÷A¹!lµúfZºpQYÀT"¹¬\^ºÆå·EÂ56¼?é’¹W³TxÁm”V.¿QÒÖNÃàVn”-NÑà¿5«,Ükó7d{©ÎhİTü™t6NâVï»‰8óà@	ù<âõêÎ;3¢;Íîİ:?RRO–Wæ—ïÖş®¶p½1N ¡~réÉ›8Os 'É·”’%½óR¼ÇVád”Ñ—!õ:<k‘E0´Êr–Xv.|~üìøÌ{š_ê¤]"¶V?ÀórRŞŸ©.»;º}h91:ºúÊpôŸßÂİŠ+Ä×”³³å8 SäK#n[ÿ²,MZK(g	L×ÏNêg§5k±T[3ÕÇŠíä^[Ö5vOÉÛºõH*x€ç¯9Ú4jØÈ«½Woİ³jše÷6öâ}<ïZUÅ;ê!+6Aï™¦_ßç$–ÕÛÈŒûÜiœ«#lòwYŠğÇ¾YïíÁ‰úÁğ„ô:gcŒ¢\å²IhS!´¡</çLí8v€ÀÊÏpÜoÅ#¡éıDÚ§«Âd3QƒhÑdDq ”YÂÃ
Ê»'¨”ØZNë àÔƒ.}sóIï¯“¼k»ºĞ­e4…½]ü³$1ş˜Ó{ï*ã¦,]šÏ¿æ¤h÷òUÊOU:¤§ˆÒ¥×3Ì¿p—Å`hV{ĞEğ'!50Š¹dccˆ¡±Z;Jê İ€éckIÔFõÂ¦"İ(=Ï5áP(`/È¡+¤lgh>ˆ˜{ êMğG˜Évs`ÛÈ\Ø½ëpĞm$q×‚ƒ·¶c:êÙTø§Ù~Õ[W¥=öÈ^{Bëo›t‹E0˜#¿ª|I—PLò\~Œñ¢ƒ3tzüÒÛÇ#r"Ò‚4f§&ñ[´pK zXLêûQrÚe)ÆÁ·ê•™Q†ƒ6SrpÕ£“ôœg İÁ.÷ºŒ	âÓ~"Bş&ª“ğPB(º+ÃŸÕ~¯â>nøaçm¡€›zĞ’Ş¯®‡fìùø‡tÍÀÂeİTºiÇ%CsL»f˜\íÊ	xÆ,éÄI`1µ¯ò¶ÌrIù„Fî„ øN&JŠgy¶
r
gó)0ÜƒÊ8Šp§h¶Çÿ´"2tòİSßš»üÚÙû³=¤ì¿W¶sÍô+9??j‰S¤|$úˆôkFÃçüğ=ü˜± —aÜ²ŒW´ÒÊÊ>j×µzÆ_İ˜¶—kn²PÑ¡ßcSò’ÒßIb›ñ[èìî°ğCñ‡ı6*Ş	ê‚)è®xÕZ±y2OW’²U\OWÏÈv¬‘0^şš±T63ğ¯æpzdã-Ì¿úùKÊÇÄõ+ÂyE„Ì<ÍYe„ç³Ê1hö]r²-&òz|!6Õ:»ÍNnQhuşÏT	÷ >_KXğÍft3¦§šåö$s¸ü¯h¤«:\Ğ&ó˜§ºDÈ›/¸SÌ.´Üãƒ6Ød(c1!ú$h&V}>tSë_Ë¤èYD$0ÌÑs)|%>Kd°8ù6ı]²¬	ÀøÁ'‡Lbb!†/óU[ËÅ²J,áÎÙÓÆH·âìƒ8íÈÔÂ!z%²ù]\¾×ÉAËİÆõ¡üİ:•wâ6|‚»!ÓÌÏšN&—@<³Kƒ™K8jŒñÈGÀ !õ`sØ}/ëù,Œ%¿ê«+¦x‡d3Ï“>AŠ“‹Í´Ûª”= ¨¥•A,x¦</í !À„3.b~9kí€Vgian_Jğ á¹ŸRnµ?b*}8ÒCìîq%ŠÀ%DÅ•ñÈÜAò·FqoìâåÌïÿ€Ÿ't¨ˆ]y ±AÏíMe&I~Ò™JÑ]+ÁÎ×IÜj¥í8îí‰_[õDŞfÇO’İÄôáÏ,Ÿp‡k	…#Å4N?ŠºHÅ;ºZµân³%„ó’xv¦»õ$5÷	Q=î<—G	Rv”MyO$sãĞòSs§÷aa¸ÍFvJïÁÚƒ]Å›ƒù¢Í´ˆçf¯/e"¾ä;b†‚¤DbUoˆ\œ6‘úùâá,Áç1˜ÇÜTü<
+âøZ°;ş•p²üœa¨(O|õï¸ˆĞ%ó[B±ûÚF¶;ş¾yH.œŸpN<ù>ç ù"…ê—ôæß½ø%b’şAæHüìø[|Ö*ÅF'‹¼'Öz„xR²2ë ½÷šÛÑ,G½Ş·u`>ÆXÜidhJDÊÍd¤¼ƒuZ'ĞmÄ8İNº½xstÁ4¥|+„riå0¨³İ®w:qmE´î
õepŞi¶Zhµ“8~Y&XëÀ 
Ê0]ePq‡fÀÿLë—£{V‹enÜQk:h!¥x<nãå:Çlê0Ù¸ë¿«ĞÜ¤çxµz­TXk.ìê¡§.}PO¬NÓSà„¢B½ÔªY]×|¡U®é…4ÜA«¨vG@ Z…ÅU#Pƒã¶Jë·²G”FBtÙŞo¶»q‚pö5„»›êb&³¡ju|["µ¥ãF™!x:z@Ost+
îX¬§{[q=i(¤¯‡K çS[zóIö´~ü"Q­D	£¯(÷ğo)H„‘¨æx)åÇ|ÙµˆÒ$ñ[ÍôfK‡jÊ…è	“Ó2•Y¿ôúıæ.ï‚+â×°xv›Øğ(o|3ğì¨.W±ÏšÑş­„?½¦~˜ò
İ‹oßL7@tÂ¡G’kUØŞÅëR~§’•îÖ1@õ»Š¿;°QUA
lö†+ã•‘j7îÂÜ¡¨ßËA?ÇÇÙñ?‘°º›ÀnH+ø­r‚ía«pİã_Ş¸ÑX éT<7d«3(<9	Ğ¾í½z¯¢ÁÖQ«øIA<Ç©X*öîG„×ÙnÖ[ã"·6ö9}K¬,UtoÀèÜ¯­|¤
¹¬"Y»v‰×ˆVdâ§ìŠ®%»J›Œøy'eÏ&†ÅlWæ‰íñGsÌfM‡÷e·iQ÷G3²U(~@›1Fş$Àh¢V*èS¿dĞè:í“‚T1OfQxsúCaÔHóhÔSÌ7±ïoâW¹JéÇğôÄÄÄˆ‡i¾| `L3±UŸ2ØEñ}•×€Ò	3i\ËÁ—ŒÃ“Äéùp ¿áˆ’
!µ*;G}§³\ÔÆ2@æ’İ¢U†—V·~ÕUñ÷°Õ!mÄa´Ä¢zT‰ï³(¼ßJ#taãÄ-Ùé@ÜŒ"Í”
£"¸¾úŸ°…ŞHÃ¼€â]öŞìš“yÅZ²•çº ¨¯ÉËnµ{îe8¬¡«Ú°ÂÒf~öc6X<„jé:J/› UwUcÄfº·ûuÄïEº¿†Í‡à<Á9(T‚fÒ‹	\=(ëó-±Xø¶Äå©©T
ò­ÙÛ»ıÎÄı½;èe­mízpæÒdáx%½Öë†Z½d(´`lòÛÃLããîX½½%Òhy«[*é¤¼Rl¯tŒms7ãN3µqƒá´/-Ÿª^†©òõ§[m¡½)§šÖ®a¿[®xâ>­Ù¸¢¥ æRapüôÅÇ/>å¸û_ÒuTÿ€Æƒ¯0ó÷Ç?((ÂŞûŠ¦NÛm<ù.ğAsôb”~Ø‹»c«pÂÒñ6ö¦´^y3ZjòÙHÛ¾ç_è×r îáÒ=¨Ş	;û7Æ'i+HÍñ•˜¢›bM¿D}Ä'/ş;ªD¼øüø[ñæ(@>#åÊçB=¢gÛÌ2	À£¿‡jI¿)~ƒZ’O9Váñ×UF/}‚ïàñ­¿Å&aOÉ!àÑñWÌL<ÀÇüs^È*­™cSò>  ÆG$ş·ÕŸ2!³¥Ô±<TA!R4{£”ÀXüw§ÏÃG@>MA\m §ƒ‚LnA“j3Ô5§U¶ÖBWäŠ¬ÎÖªIhŠŒ¹:ÛK¢«p.1LX…B óGh¨5iÛ kU‹Qm+F91‘®ë7É‡ƒÃuZ1û nGF?ë–Ë~åğÑ6z4±ö[]„IÆƒ5W†Í¸ÓGÖa â¶Xe"­è‰‰ğ HŞÔ;­ä>Qœ³éKj×à%ÛfIUôoxQxä’ù@ê¯úo²rØBQÍ»÷öáŞÑÈí£ö½¬PÛ.·¡Pz”ŠBÙyÍ…İ¦[—ş^>ümq¬¶Ç0ÃŞ–ïñbn£*İv8ªWAcİhîìÜÄQA£gµïÃ.<æ…øŞå8ãÃ#öãÑ¶9ª¢Îq69aÍİivÜâX‡6YªŸòŞÔ•ßS¢ó¨qÿ¥š‘x¿ò®§¦Kù5İ#Uîï`*Å#GŒô¸¨Cşú3dwRVßï™/ÁşøxäˆIß+ã%x§­½$Æâ~âvxù¸IÌªğ›º8@£ğ
öøsÃjm¢{Z£JàÂãõ±áHwÌİ“™‚¨´×Šlœıı&0I5‘5ÇkJ¤YÅüD—zÃ•m¾£ğ¥’‰»ôhRo@œÇüúLä»~¦ 7ªæ/ßÄØ:Uh¾„Ÿ¾¦Õ›K¤|¢¿×"»u™>È÷tckUyÑMÏzØ8ûïÅqkU/dU UO¾gÅ½ŸbFû9Ø;şÓş–ÒV§ö³¨@ò?‹wnÖ;0)mQ±kGm81ú*ÄUŸˆô­™ –ûBÜÄª„ bÍ$y]ùÛ—‚ìË“?èoÙÍÛJâz¾öÂ^WE¬g•ÂÏû()euûQ®,IİE)¬¼HAh¾n¶¬Qy*J’z` äİE[‰˜u8.Ûf‡’?–Ié1ïfĞzÄ—imU´û›_bk1œƒøâ±É	…ËòÔ„ÖHBù½`Ô„Á<ü`”ëwà¨”+/°e`¯ívS¼X6§Á“–”ækvâIà¦°ŞÎ¡: É¬baQBó¯¸%õ1ÙiŸ)lìØÂ]xî³¯õZf%ÃØÏ–kìæêÊÒæêúÒÊ¦¥•ÍÚòòÒÚÊBÍ&º’œÜl¯ÆÓ¦‹Ã…FfN_ÁïŸY­]^úimÔn­/mşœ­Ï/Î¯CS7?Àœy-öoEÖN’ZxŞÂGÇß“Ëª û¯¸È£ÚTÔëù……ÚÆûIíç4Àï¯Ïol®ßZØ¼µ^c?¿µ¼Y)½)µ³ğı³—‡”ªş¹DÖ×=j„=ş­dâmÿÙVûç7ç¯ÏoÀ,|P»9ØøùÊ[]‡ßĞ“ùÍ¥Õ•Ê [cùàí$ùİñ“Ì÷ç÷t_%ü¬zwà3ÊØ"_¬-cÓ×Wom©WJîÄ6•#]}*q°”«á˜şQ]À¦ÿ
LÊ¢ôÚâÚú(ûÙüòrm“Ú[ûÙüúâ[X]Ù\_]®”’k5åx¨µ˜!e3Ä†f—Qÿ ÔöúÜ¸u}ca}i	aŠløÚúÒ‚;ĞñcÀaşá™'	*¹f[ê÷œ ¹ë‰M‹@ÀEFÙO~¾€­¬­ß\ÚØ€†‡†x Á'ÌHO|üX™¿d™4Ä5“²wWô¡yÄõG0%ß+=’8ş°ºss~åÖü2»Y»¹ºşs¶¸´±¹´¼L÷ß[‹K›l:¼>o÷*$g8%#Ì(ç1¶ZÏÚé_œ|‚1¿yóÖÊÒµÉ.mÖ6*¥¼â6?C†!İŒZëîÇÉ:k3ß–{Ú(eşæÚüÒäëë«ó‹ÀÑYmåÆÒŠ½…eËâV?§±ş&ÛåÖ.Uäş±Š£ 5JáGV»Va·ƒ¾¶¾º¹º°ºŒÿş’½DËÊ´9r‰6 õ)o_n÷\‡0á—fS
5¦2ªŞ¬mÎãÅé‹1JX úZ[^š÷H3az@	ì×Ğ1Z¨¼'_‘@Š}y"•ºOÕ‚ĞÖ#Ôg{8ÔzíıÚ:,Xœ¥ëó7ÙÆ&,XØ¸<`Æ~Z[G~•'ø”ğ‹KòÆòƒGò‡:Î@êœ!ã^÷LìÇ*5½†ìÅ³t¤¶.yˆvËc›K7k|P€ÊäÔŸ%òHö[ÖÁ	ñ3.WsIï1E0«¯<tØ'>é0áÜ‡ÒYy7×VWPY¯­,ÖÖÅ-×`€aÃ±XİÊÂÏ}LéÏß€ FdŸó+‹Ääkë•àei›¤Ü¼ÎÍmt»«§)»*ŞcFd¾{š£ùŞG¥·œM]6Rì©wc ^©³†"¸º …œ¼…ş³ÅÜO¢Á«Ê‘÷ç<Ï •æKàsİşÀU…ä¹e8&·ëÉ‡W_ç’6¡ ª«H˜s›‘€rBÒßÜõóZaHğš»‰á†ƒÖ–#Ím`ÊA+Ë+sR6pÂˆ˜A„·ošéµVğ†z·Í¹­xkõâÛj §JW–qòñq¶õ¢¤¶ßæYr+óF…ñ0eôÃëgÄ–îÅûÅüñ”ã™}Ğ1R¬¹QxîX‰ææ¡ß„a %WXM]o4V¢ı5¸?˜·í{´¸9*<xQHqÇ“·@ß(:şİÚovñ~-ãèeDé‘‡ÑÒ³ĞO{1O—<Ì]eÇ =c]ê¶æ µ•Dõ‹‡aĞ÷du_æŒœv×/tØï5Ûä¸¤ÜîĞCPı@ìÒ^ŸGÅ¼ğ*‘9[±96ı®Vïb´û}Ô(WqC”.®™n.Ä­­€Yó¯±¡ÿ4=}qrfmûÚëñÆÎÌ•hb‹ŒşÿiçâôÎL4dU(AVÖ5fZí†êÉyã|*<o¾¥:Å3CšÕx}Q=ŸÿDî?P=ò¡¬¢Ğcä9ó	¨™&ınŸ²ú„ CB
t;6¤„Cá†YP„‰“eİ›¸{Y¦Ü›º83:9sytrrt¢ziäªtÈDzÈ«áâè¥éÑ+E'us+ïÙ&àeöÆno×[ÛÃ“÷÷ÆŞ™ê>¹Cè„"jtw¥µ‘;†yÅ…}Q¤ÙZ©º{ËË7ˆK]O³Ì‹jjÕG(m›îfÿ2„¾±ÌTÆKŠ—Õ’IÁ¦-cÓÆKq2zLø›)·+®U¡ã/ãJÜcó÷Aæ¡+
EÂyÄ±ŒÇh©>Ìh®e¹Q»nÃµ›Ìõ¡ÓÇßÓŠ~Bß‘¦Tég>g_ë!q0èğõOÜÇ½ñ¸¾NŸ”ÁQóƒ%¥œ¨÷âs&ô™¿ä.ot@}B.kß2¬ˆÒAâœ;ï½ø¢jvÆz„0F™ÑÛ‹X4Zƒòıµ‡7ÁĞÒ(ê¤èí(°ƒDv¢4åŞdÀ6z	,–èA7ÉÊyğFåuq|)Œ£®œÇ0$©"à+æõ¡2ÓÅgñpÒ;NÂ_UÄyø–ØV2oˆ¼NàUüW^áZéÕC•wŸa¯ÉÆù†H¢EÅdg¦’Åzâ4Æj-\]Òo¹~à¤Sƒ£cğ¤¼2ôÀ¼|AÆ¦&ØXûğvc¿\F:úÕ¥°‚y´|nz‰ô•ÅÓÆ¯ÌH¤«ìzò»ªÎ#MA%†1§
Á«°OØYØHezóRÔÂxg¥êbà„‘\XÌ‹ÛÉÁ’ëÚ™“é)tRöÏA†µäßtgâ6¬Ä†z$Ç×8!ËwÇ+¿Û;ŞUD`‚ˆŠ¤aƒ{Öh&œ"“^«âOxã`7NMx œüÉ]HHÿ³e<=ZKòˆ%0õÙDäOX>H¶3By8ì…t?çÃß›ô
!À¡èû´%˜2<	è$„è”ãñ›õˆÜ5ì.‘Ä1éôÀÀQ0‚+Êƒcb [nol² @ó,ñ5Õ‰?´âÓVÂ]C™p²$»òÄ=pzİ©rIÂõ¬â¹,Ö1u“4f0CøL8C¸ÁênósÉÔ„¿ü”Gô‘ûÑ,d§ÖÕtW^$ÄC['ã.N/ŸÊaTO³
¸(¨EÏ¡ßµú‘¨Ìc/s	LéŞÿùL-ÀIwRSÍ8™n5æÁ¦-0¤…{yØÏ¹jß>Ï6Dt:Uá*
	İãµ¾JÓŞA‹0`q_Ş¥úHi2«+P<9Ì|¨‰'l¸¢¿óm *ÆIø3`fŠœ4õ(Ş<.şó‹ÏàløÃÀOd:Èh-Í²C¥}r÷·(cæå v´h¢¶x`\^°¡À´ç (4†Ùâ¼Ïäó‘ëM©çÇŒ"'óO ?1ŒM\c‘˜(Ê.²²š|XÊå_‡¨zF'tÅ/ŞöÓ&&{› rLÒáû@iÑ‚3gß+¯<3AXV:
gØèrù‡Ùt¤CáDVĞH=7ˆ“7û²ÓœSÏ,ÕSÀyÈ[Å@™Fm&M\wK…ÉÑƒ%+‰Ü,j°,å“F¬ÍşBÙ©¦ ´Üd1»%4¹œFy¬pUy|üİño_|pÍ¤Àã¼—è›Lw±YßíÄ¨qI‡ü«ˆ:rÒvÁ1¸âA×08 g°u‡™-åšƒ8œWútÉCáîæ'¯ò­‰{>ğF…Ê89aÁ4^T!Ÿë˜/õ)¾=äÊÉåu×“Ï~@á{Iüa4R`‚	)+]Í	|®Ç®V&Øê1L<„€_W+ĞCâbÏAUS±6®VnÃ‡VüW69ƒ§è×&›–§FgğÏÅÑIúüsytò
ü½(JÍˆ¿—äß©ÑiüO½ƒ/ñË—Åí+â/ti4?³±ºIÎ
¯YúgÍFoïje²:S\ór³m×»"‰i¹ò¿ A½ÄÚ¶ÎŸEÕw=.Ñq•Qí:O­"n„6NşÑv{÷ùÛ¢æÊDåN~5æÎDİ¨Ï/uv°İ£Ú^>¥R#`ÊkˆÉ©8ÈvaùŞß=ıêå ’–^À~"gaø²o•f{Eø¢»#2ØEC¤ò°k=ñğø›‚°ŠŸüá§ä?øùñ—Üì*]¸Vâî0í½$îğ•Üíe ¡ôÂÈOé0ò¹½¶«ëÒˆj°ºÙ‰9Ÿ)›¦K”ÉmBp[¼\Nİ†½»ÿC>c*ÜÁ—¥XEî¿cBBzg‹×‡
sãúš~xOeŞÎ6ãkUåîw­º/ºfx7lÇ¡¢Y–÷!Ç<>”›,”NöŞ{òÖšÕ@T[<¤îfzÔNGî‘{ÃÎ2©¢¦¡*ÎÒÿ‹¦ÖãoÈüL÷™ÿÊ'ú’ÃñI,G4ÛRœğùk‹Şô*ÈµğÍÅË«xC²çC²qø)Qª`²¿%—‰'ŠNk$ä<"­G»MŸÎ‘\#ñÂWA°%Ş]L²²’7D{>Dû”8©#üUı¡‰\«'ÎŸh%TÓ« Úï.&ZYÉ«#Ú|½KÎYç/øìâÇû-f]Ráë@ğßÿ á]qC[Kbrêú€Œ·I¾>l ñ“gÉI=—GÊ+j`ZÌ¼Äá÷²U«†Ôàgİpz¢Œæ‚İ•áRyä÷‚¯|­‡±\/ğìøâq^l¶ØÍ:Ú#)à£b“zº‡‰Bw£Óq¤QƒùlÃYt³~˜"/€kï5AÚ'ï>:IuI¿ÓE0d9_œ˜È˜Z·şxtm@¶–Ódcoz°Å4•¨zÜyøZÚ[ïwFˆ§	¼°—¿¿BbÖ–™¾ãk#ØÛT|pİú&ò½(9Oúåïû ª'½­¨Ş;5çÖ÷)ØjÇ $l=ş††‡(å{¦Bm¥ú7L¶&èÑ’Ù&ÄfÜú¼yqô ÛL¢½5]hEõN¿{Jr.®ò¥Q´¯)ƒµ¯†7t=dáu9@.Ç<Õ&åÔ­£ÅÁ§íÃ! ¼Òó#ïT{)½ë”´]PßK#l§ƒQµóø’:şÃñŸPgt‚ùŞ†Ğ‘à84™]pq’[{-l·Î‘YSø"÷ñ4s§$æüê^-ÛÍŒ”í§_%ŸR`¨¾zú9½>§çù’ú¹Äy˜ë·
Öq½—YéÜ¼·&š«…µ[ìÖæÒòÒß”K™%§Ö¿N‡İ>»vMıM©E[ÄÏÜ~îsÒ¼†¥ÒğJ-ë_~‡ÊU@K¾’¹²î£—á{;}ıYs|¨Juº—¹ÔñAm~Í//¯.œ”08_¹VEm:ìü‰àÚ3èƒ’O(şAxDS†¡t+”ãPŞ-ÉÊñhö‡À?Ä/ŒÖD-£s0¢óIT/•©¼üó[ok±†£ŞhÔÈGf§“©Ë´e,Ãîà(7£
OÆ€óÕ“˜©De:h
^mĞ	4ÊáO4$cœ)ã˜veÄ¸{UL_, Ø®D»ìñ
,ŒCø?hİS/9òEƒš¹;´¼xğ­Œ¶]«w0˜zÕŠµçt0àŸ6£}î¤|õş±|;Ê²¡]=T_­5‰–Ù+9%¸¯£f¯]/7ÛÍ -¾6çr~C¯ |d½şœºx–/·¢nó'p‡\°
kÅ¶ïaó­k”&ş±¯›éÄ®š¿íÒN’5˜û’óŒoöŒ29ƒ“-ew„¤&Ô€“?Ç¡’©«êHUºf’7§':œıë3×§™7É]İ¾¾¯Ağ—êÁàkŸ3s÷½kˆ‰·ç¼‡ïî{n€ÿçÑC…æ¾œÓØiöjEç½XìŠîk7ô$çÑålöôä…_õz.%7x†ÎÈ„p:’ä"‰w—ÙHıµŸöE™Èã¾lİÎ“pÊ>5ü»l:ĞĞQfóLUŸje•¤zë­'ÆVÚ»tÑÌçœ¢<a$—T°Æ”×€
üQn¿Ì¶Ç½
<7™^´_ğU‰´XŸ²J‚f–Áó‹ı>;@ßÛ„´MQtwÿ,bõ$b[ıfeø§C`n×~‹0w@z¦1šG¼ûj»áTY‡½»‰ÙûITØ\gµƒ×œ™QÜ¤
‡šSî`VO1Éğˆg
ØjNåGK(@3˜9“û*CoLñ®[q¯·Xßv M*^y‰0uxxå¥Êûhìö•+Wî(ƒiÇ@àĞĞì§ÙÁˆ`½üø!7öÒœ”jï «2“şÚ¶á(A"WŸÊÁ)/¨Ì›\õå<=~#%+ö÷ğ7&0FÚOuE¾SüöUÁñ‹`0"«uIV"/˜µØ‘RQc½j+~°A“3ë´ağ¦cZ÷›Æ<0“3#î:NM_½tÿÇ5;¨÷Ïâ	¨d³^¢S¼7´ÿíÃÂ”dgPÕç¼bÿ¸§…Æ&ä |ä ÚáÇnmèP®ºÑ¯ÆÒxæ!æ†İøVÒrÂ­ñÛpÀ©·X?i]Õ8¢ø8´ø5u—ç¶6¶gõŞ€zÌníÈ»o½ûÖÿ  ÿÿ |Jš
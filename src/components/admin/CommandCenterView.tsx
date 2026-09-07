import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";
import { useConfirm } from "../../context/ConfirmContext";
import { motion, AnimatePresence } from "motion/react";
import { getAuthHeaders, getTimeAgo, formatExactTimestamp } from "../../utils/adminUtils";
import { resolveImageUrl } from "../../utils/imageResolver";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Activity,
  Key,
  Database,
  Cpu,
  Landmark,
  CreditCard,
  Users,
  Settings,
  Plus,
  ArrowLeft,
  ArrowRight,
  TrendingUp,
  Zap,
  Server,
  CheckCircle2,
  AlertCircle,
  Bell,
  Clock,
  RefreshCw,
  XCircle,
  ExternalLink,
  Download,
  Calendar,
  Code2,
  Star,
  MessageSquare,
  Sparkles,
  Brain,
  Globe,
  FileText,
  Image as ImageIcon,
  Video,
  GraduationCap,
  Info,
  Coins,
  Wallet,
  ShieldAlert,
  Search,
  Trash2,
  X,
  CheckCircle,
  AlertTriangle,
  Send,
  Palette,
  Terminal,
  Shield,
  ShieldCheck,
  Settings2,
  Scale,
  Megaphone,
  UserPlus,
  Sliders,
  Wrench,
  ChevronDown,
  Copy,
  Eye,
  EyeOff,
  Save,
  Upload,
  Building,
  Mic,
  Volume2,
  Monitor,
  LayoutGrid,
  LifeBuoy,
  History,
  ArrowRightLeft,
  Award,
  Camera,
  BellRing,
  Circle,
  DollarSign,
  FastForward,
  MonitorSmartphone,
} from "lucide-react";
import { ActionConfirmationModal } from "../ActionConfirmationModal";
import { HighlightText } from "../HighlightText";
import { CommandCenterViewProps } from "./adminTypes";

export const CommandCenterView = ({
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
      showToast(err.message || 'Failed to reconnect pool', 'error');
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
      {/* Theme Studio Banner Card */}
      <div 
        onClick={() => navigate('/admin/theme')}
        className="p-6 rounded-[var(--radius-lg)] border border-[var(--border-accent)] bg-gradient-to-r from-[var(--surface-card)] to-[var(--surface-subtle)] hover:opacity-95 transition-all cursor-pointer shadow-md flex items-center justify-between gap-4"
      >
        <div className="flex items-center gap-4">
          <div className="p-3.5 rounded-[var(--radius-md)] bg-[var(--bg-accent-emphasis)] text-[var(--fg-on-emphasis)] shadow-sm">
            <Palette size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-lg font-black text-[var(--text-primary)]">
                {language === 'ar' ? 'استوديو المظهر والثيمات (Theme Studio)' : 'Theme Studio & Appearance Control'}
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[var(--bg-accent-emphasis)] text-[var(--fg-on-emphasis)]">
                {language === 'ar' ? 'جديد' : 'NEW'}
              </span>
            </div>
            <p className="text-sm text-[var(--text-secondary)]">
              {language === 'ar' 
                ? 'تحكم دقيق وشامل في كل لون وكل سطر للوضع الداكن والفاتح، مع تطبيق فوري وقاعدة بيانات صارمة.' 
                : 'Sovereign color token control for dark and light themes with instant database application.'}
            </p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-md)] bg-[var(--surface-page)] text-[var(--text-primary)] font-bold text-sm border border-[var(--border-main)] shadow-xs">
          <span>{language === 'ar' ? 'فتح الاستوديو' : 'Open Studio'}</span>
          <ArrowRight size={16} className={language === 'ar' ? 'rotate-180' : ''} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => (
          <div
            key={`cmd-kpi-${idx}-${kpi.title}`}
            className="p-5 rounded-[var(--radius-md)] border border-[var(--border-main)] bg-[var(--surface-card)] transition-theme shadow-xs hover:shadow-sm"
          >
            <div className="flex justify-between items-start mb-4">
              <div
                className="p-2.5 rounded-[var(--radius-sm)] bg-[var(--surface-subtle)] text-[var(--fg-accent)] border border-[var(--border-main)]"
              >
                {kpi.icon}
              </div>
              <span
                className={`text-xs font-bold px-2 py-1 rounded-[var(--radius-xs)] ${kpi.isPositive ? "bg-[var(--surface-subtle)] text-[var(--fg-accent)]" : "bg-red-500/10 text-red-500"}`}
              >
                {kpi.trend}
              </span>
            </div>
            <h3 className="text-[var(--text-secondary)] text-xs font-semibold mb-1 transition-theme">
              {kpi.title}
            </h3>
            <p className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Quick Launchpad & SEO Operations Hub */}
      <div className="p-5 rounded-[var(--radius-md)] border border-[var(--border-main)] bg-[var(--surface-card)] space-y-4 shadow-xs transition-theme">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Sparkles size={18} className="text-[var(--fg-accent)]" />
            <h2 className="text-sm font-black uppercase tracking-wider text-[var(--text-primary)]">
              {language === 'ar' ? 'اختصارات الأقسام والعمليات السريعة' : 'Command Operations & Quick Launchpad'}
            </h2>
          </div>
          <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">
            {language === 'ar' ? 'وصول فوري' : 'Direct Access'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-9 gap-3">
          <button
            onClick={() => navigate('/admin/theme')}
            className="p-3 rounded-[var(--radius-sm)] border border-[var(--border-accent)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-card)] transition-all flex flex-col items-center text-center gap-2 group cursor-pointer shadow-xs"
          >
            <div className="p-2 rounded-[var(--radius-xs)] bg-[var(--surface-card)] text-[var(--fg-accent)] group-hover:scale-105 transition-transform border border-[var(--border-main)]">
              <Palette size={18} />
            </div>
            <span className="text-xs font-bold text-[var(--fg-accent)] leading-tight">
              {language === 'ar' ? 'استوديو المظهر' : 'Theme Studio'}
            </span>
          </button>

          <button
            onClick={() => navigate('/admin/seo')}
            className="p-3 rounded-[var(--radius-sm)] border border-[var(--border-main)] bg-[var(--surface-subtle)] hover:border-[var(--border-accent)] hover:bg-[var(--surface-card)] transition-all flex flex-col items-center text-center gap-2 group cursor-pointer"
          >
            <div className="p-2 rounded-[var(--radius-xs)] bg-[var(--surface-card)] text-[var(--fg-accent)] group-hover:scale-105 transition-transform border border-[var(--border-main)]">
              <Globe size={18} />
            </div>
            <span className="text-xs font-bold text-[var(--fg-accent)] leading-tight">
              {language === 'ar' ? 'مركز السيو' : 'SEO Audit'}
            </span>
          </button>

          <button
            onClick={() => navigate('/admin/orchestrator')}
            className="p-3 rounded-[var(--radius-sm)] border border-[var(--border-main)] bg-[var(--surface-subtle)] hover:border-[var(--border-accent)] hover:bg-[var(--surface-card)] transition-all flex flex-col items-center text-center gap-2 group cursor-pointer"
          >
            <div className="p-2 rounded-[var(--radius-xs)] bg-[var(--surface-card)] text-[var(--text-primary)] group-hover:scale-105 transition-transform border border-[var(--border-main)]">
              <Cpu size={18} />
            </div>
            <span className="text-xs font-bold text-[var(--text-primary)] leading-tight">
              {language === 'ar' ? 'الموجّه الذكي' : 'Orchestrator'}
            </span>
          </button>

          <button
            onClick={() => navigate('/admin/databases')}
            className="p-3 rounded-[var(--radius-sm)] border border-[var(--border-main)] bg-[var(--surface-subtle)] hover:border-[var(--border-accent)] hover:bg-[var(--surface-card)] transition-all flex flex-col items-center text-center gap-2 group cursor-pointer"
          >
            <div className="p-2 rounded-[var(--radius-xs)] bg-[var(--surface-card)] text-[var(--text-primary)] group-hover:scale-105 transition-transform border border-[var(--border-main)]">
              <Database size={18} />
            </div>
            <span className="text-xs font-bold text-[var(--text-primary)] leading-tight">
              {language === 'ar' ? 'قواعد البيانات' : 'Databases'}
            </span>
          </button>

          <button
            onClick={() => navigate('/admin/keys')}
            className="p-3 rounded-[var(--radius-sm)] border border-[var(--border-main)] bg-[var(--surface-subtle)] hover:border-[var(--border-accent)] hover:bg-[var(--surface-card)] transition-all flex flex-col items-center text-center gap-2 group cursor-pointer"
          >
            <div className="p-2 rounded-[var(--radius-xs)] bg-[var(--surface-card)] text-[var(--text-primary)] group-hover:scale-105 transition-transform border border-[var(--border-main)]">
              <Key size={18} />
            </div>
            <span className="text-xs font-bold text-[var(--text-primary)] leading-tight">
              {language === 'ar' ? 'مفاتيح API' : 'API Keys'}
            </span>
          </button>

          <button
            onClick={() => navigate('/admin/radar')}
            className="p-3 rounded-[var(--radius-sm)] border border-[var(--border-main)] bg-[var(--surface-subtle)] hover:border-[var(--border-accent)] hover:bg-[var(--surface-card)] transition-all flex flex-col items-center text-center gap-2 group cursor-pointer"
          >
            <div className="p-2 rounded-[var(--radius-xs)] bg-[var(--surface-card)] text-[var(--text-primary)] group-hover:scale-105 transition-transform border border-[var(--border-main)]">
              <ShieldCheck size={18} />
            </div>
            <span className="text-xs font-bold text-[var(--text-primary)] leading-tight">
              {language === 'ar' ? 'رادار الأمان' : 'Security'}
            </span>
          </button>

          <button
            onClick={() => navigate('/admin/finance')}
            className="p-3 rounded-[var(--radius-sm)] border border-[var(--border-main)] bg-[var(--surface-subtle)] hover:border-[var(--border-accent)] hover:bg-[var(--surface-card)] transition-all flex flex-col items-center text-center gap-2 group cursor-pointer"
          >
            <div className="p-2 rounded-[var(--radius-xs)] bg-[var(--surface-card)] text-[var(--text-primary)] group-hover:scale-105 transition-transform border border-[var(--border-main)]">
              <Landmark size={18} />
            </div>
            <span className="text-xs font-bold text-[var(--text-primary)] leading-tight">
              {language === 'ar' ? 'المالية والدفتر' : 'Finance'}
            </span>
          </button>

          <button
            onClick={() => navigate('/admin/plans')}
            className="p-3 rounded-[var(--radius-sm)] border border-[var(--border-main)] bg-[var(--surface-subtle)] hover:border-[var(--border-accent)] hover:bg-[var(--surface-card)] transition-all flex flex-col items-center text-center gap-2 group cursor-pointer"
          >
            <div className="p-2 rounded-[var(--radius-xs)] bg-[var(--surface-card)] text-[var(--text-primary)] group-hover:scale-105 transition-transform border border-[var(--border-main)]">
              <CreditCard size={18} />
            </div>
            <span className="text-xs font-bold text-[var(--text-primary)] leading-tight">
              {language === 'ar' ? 'الاشتراكات' : 'Plans'}
            </span>
          </button>

          <button
            onClick={() => navigate('/admin/users')}
            className="p-3 rounded-[var(--radius-sm)] border border-[var(--border-main)] bg-[var(--surface-subtle)] hover:border-[var(--border-accent)] hover:bg-[var(--surface-card)] transition-all flex flex-col items-center text-center gap-2 group cursor-pointer"
          >
            <div className="p-2 rounded-[var(--radius-xs)] bg-[var(--surface-card)] text-[var(--text-primary)] group-hover:scale-105 transition-transform border border-[var(--border-main)]">
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
          className="p-6 rounded-[var(--radius-md)] border border-[var(--border-main)] bg-[var(--surface-card)] flex flex-col shadow-xs"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Cpu className="text-[var(--fg-accent)]" size={20} />
              <h2 className="text-lg font-bold text-[var(--text-primary)]">{t("resourceUtilization")}</h2>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-black text-[var(--fg-accent)]/70 uppercase tracking-widest">
              <span className="w-2 h-2 rounded-full bg-[var(--fg-accent)] animate-pulse" />
              Live Diagnostics
            </div>
          </div>
          <div className="flex-1 space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-[11px] font-bold uppercase tracking-tight">
                <span className="text-[var(--text-muted)]">{t("cpuLoad")}</span>
                <span className="text-[var(--fg-accent)] font-bold">
                  {serverHealth?.cpu || 0}%
                </span>
              </div>
              <div className="h-1.5 w-full bg-[var(--surface-subtle)] rounded-full overflow-hidden border border-[var(--border-main)]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${serverHealth?.cpu || 0}%` }}
                  className="h-full bg-[var(--bg-accent-emphasis)]"
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-[11px] font-bold uppercase tracking-tight">
                <span className="text-[var(--text-muted)]">{t("memoryAllocation")}</span>
                <span className="text-[var(--fg-accent)] font-bold">
                  {serverHealth?.memory?.used || 0}MB
                </span>
              </div>
              <div className="h-1.5 w-full bg-[var(--surface-subtle)] rounded-full overflow-hidden border border-[var(--border-main)]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${serverHealth?.memory?.percent || 0}%` }}
                  className="h-full bg-[var(--bg-accent-emphasis)]"
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-[11px] font-bold uppercase tracking-tight">
                <span className="text-[var(--text-muted)]">{t("systemLoad")}</span>
                <span className="text-[var(--fg-accent)] font-bold">
                  {serverHealth?.load
                    ? serverHealth.load[0].toFixed(2)
                    : "0.00"}
                </span>
              </div>
              <div className="h-1.5 w-full bg-[var(--surface-subtle)] rounded-full overflow-hidden border border-[var(--border-main)]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{
                    width: `${Math.min(100, (serverHealth?.load?.[0] || 0) * 10)}%`,
                  }}
                  className="h-full bg-[var(--bg-accent-emphasis)]"
                />
              </div>
            </div>
            <div className="pt-2 flex justify-center">
              <p className="text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-tighter">
                {t("serverMonitoringActive")}
              </p>
            </div>
          </div>
        </div>

        <div
          className="p-6 rounded-[var(--radius-md)] border border-[var(--border-accent)] bg-[var(--surface-card)] flex flex-col shadow-xs"
        >
          <div className="flex items-center gap-3 mb-6">
            <Activity className="text-[var(--fg-accent)]" size={20} />
            <h2 className="text-lg font-bold text-[var(--text-primary)]">
              {t("systemUptime")}
            </h2>
          </div>
          <div className="flex-1 flex flex-col justify-center items-center py-10">
            <p className="text-4xl font-black text-[var(--fg-accent)]">100%</p>
            <p className="text-xs text-[var(--text-muted)] mt-2 font-medium">
              {t("stableOperationalProtocol")}
            </p>
          </div>
        </div>
      </div>

      {/* Database Pool Connectivity Monitors */}
      <div className="p-6 rounded-[var(--radius-md)] border border-[var(--border-main)] bg-[var(--surface-card)] flex flex-col gap-6 shadow-xs transition-theme">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Database className="text-[var(--fg-accent)]" size={20} />
            <h2 className="text-lg font-bold text-[var(--text-primary)]">
              {language === "ar" ? "مراقب اتصال قواعد البيانات النشطة" : "Database Pool Connectivity Monitor"}
            </h2>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-black text-[var(--fg-accent)]/70 uppercase tracking-widest">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--fg-accent)] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--fg-accent)]"></span>
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
                className="p-4 rounded-[var(--radius-sm)] border border-[var(--border-main)] bg-[var(--surface-subtle)] flex flex-col gap-3 relative overflow-hidden transition-theme hover:border-[var(--border-accent)]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database size={16} className={`${isConnected ? 'text-accent ' : isLoading ? 'text-gray-400 animate-pulse' : 'text-red-500 animate-pulse'}`} />
                    <span className="font-bold text-xs uppercase tracking-tight text-[var(--text-primary)]">
                      {dbId === 'core' && (language === "ar" ? "قاعدة البيانات الأساسية" : "Core DB")}
                      {dbId === 'ledger' && (language === "ar" ? "دفتر الأرباح المالي" : "Ledger DB")}
                      {dbId === 'external' && (language === "ar" ? "قاعدة المجتمع والمدونة" : "External DB")}
                      {dbId === 'security' && (language === "ar" ? "قاعدة الأمان والحماية" : "Security DB")}
                    </span>
                  </div>
                  <span className={`text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-[var(--radius-xs)] ${isConnected ? 'bg-accent/10 text-accent' : isLoading ? 'bg-gray-500/10 text-gray-500' : 'bg-red-500/10 text-red-500'}`}>
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
                    key={`cmd-log-${log.id || idx}-${idx}`}
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
                          ? `تم التطهير بنجاح! (الملفات المحدوفة: ${cleanRes.summary.userFiles.prunedCount} | الطلبات المحذوفة: ${cleanRes.summary.depositRequests.prunedCount})`
                          : `Cleanup Completed Successfully! (Pruned files: ${cleanRes.summary.userFiles.prunedCount} | Pruned requests: ${cleanRes.summary.depositRequests.prunedCount})`;
                        showToast(msg, "success");
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
                  key={`cmd-alert-${alert.id || idx}-${idx}`}
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


import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import { motion, AnimatePresence } from "motion/react";
import { sovereignPageTransition } from "../constants/motions";
import {
  Music,
  Activity,
  Key,
  Database,
  Cpu,
  Landmark,
  Cloud,
  CreditCard,
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
} from "lucide-react";

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
  const [apiHealth, setApiHealth] = useState<any[]>([]);
  const [serverHealth, setServerHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
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

      socket.on("new_system_activity", handleNewActivity);
      socket.on("new_ai_log", handleNewAiLog);

      return () => {
        socket.off("new_system_activity", handleNewActivity);
        socket.off("new_ai_log", handleNewAiLog);
      };
    }
  }, [token, socket]);

  const handleDeleteActivity = async (id: string, type: string) => {
    if (!token || !window.confirm(t("deleteLogConfirm"))) return;
    try {
      const res = await fetch(`/api/admin/activity/${id}/${type}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setActivity((prev) =>
          prev.filter((a) => a.id !== id || a.type !== type),
        );
      }
    } catch (err) {
      console.error("Failed to delete activity log", err);
    }
  };

  const handleDeleteAlert = async (id: string) => {
    if (!token || !window.confirm(t("deleteAlertConfirm"))) return;
    try {
      const res = await fetch(`/api/admin/security-alerts/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setAlerts((prev) => prev.filter((a) => a.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete alert", err);
    }
  };

  const handleReconcile = async (userId: string) => {
    if (!token || !window.confirm(t("reconcileConfirm"))) return;
    try {
      const res = await fetch(`/api/admin/reconcile-wallet/${userId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showToast(t("reconcileSuccess"), "success");
        fetchData();
      }
    } catch (err) {
      console.error("Reconciliation failed", err);
    }
  };

  const handleBulkDeleteActivity = async (type: string) => {
    const typeLabel =
      type === "ai_generation"
        ? language === "ar"
          ? "الذكاء الاصطناعي"
          : "AI"
        : language === "ar"
          ? "النظام"
          : "System";
    if (
      !token ||
      !window.confirm(
        t("bulkDeleteActivityConfirm").replace("{type}", typeLabel),
      )
    )
      return;
    try {
      const res = await fetch(`/api/admin/activity/all/${type}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        if (type === "ai_generation") {
          setActivity((prev) => prev.filter((a) => a.type !== "ai_generation"));
        } else if (type === "system_event") {
          setActivity((prev) => prev.filter((a) => a.type === "ai_generation"));
        } else {
          setActivity([]);
        }
        showToast(t("activityCleared"), "success");
        // Refresh stats as well since AI generations count might change if we cleared messages (though we didn't wipe messages yet)
        fetchData();
      }
    } catch (err) {
      console.error("Bulk delete failed", err);
    }
  };

  const handleBulkDeleteAlerts = async () => {
    if (!token || !window.confirm(t("bulkDeleteAlertsConfirm"))) return;
    try {
      const res = await fetch("/api/admin/activity/all/alert", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setAlerts([]);
        showToast(t("alertsCleared"), "success");
      }
    } catch (err) {
      console.error("Bulk delete failed", err);
    }
  };

  const handleBatchDelete = async (type: "activity" | "alert") => {
    const ids = type === "activity" ? selectedActivityIds : selectedAlertIds;
    if (
      !token ||
      ids.length === 0 ||
      !window.confirm(
        t("batchDeleteConfirm").replace("{count}", ids.length.toString()),
      )
    )
      return;

    try {
      const res = await fetch("/api/admin/activity/batch-delete", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids, type }),
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
          t("batchDeleteSuccess").replace("{count}", ids.length.toString()),
          "success",
        );
        fetchData(); // Refresh counts in KPI
      }
    } catch (err) {
      console.error("Batch delete failed", err);
    }
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
            className={`p-5 rounded-[4px] border border-[var(--border-main)] bg-[var(--bg-secondary)] transition-all duration-300 hover:shadow-md`}
          >
            <div className="flex justify-between items-start mb-4">
              <div
                className={`p-2.5 rounded-[4px] bg-[var(--bg-primary)] text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]`}
              >
                {kpi.icon}
              </div>
              <span
                className={`text-sm font-medium px-2 py-1 rounded-[4px] ${kpi.isPositive ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"}`}
              >
                {kpi.trend}
              </span>
            </div>
            <h3 className="text-[var(--text-secondary)] text-sm font-medium mb-1 transition-colors duration-[var(--theme-transition-duration)]">
              {kpi.title}
            </h3>
            <p className="text-2xl font-bold">{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div
          className={`p-6 rounded-[4px] border border-[var(--border-main)] bg-[var(--bg-secondary)] flex flex-col`}
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
          className={`p-6 rounded-[4px] border border-emerald-500/20 bg-emerald-500/5 flex flex-col`}
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div
          className={`p-6 rounded-[4px] border border-[var(--border-main)] bg-[var(--bg-secondary)] shadow-sm`}
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Clock className="text-emerald-500" size={20} />
              <h2 className="text-lg font-bold">{t("activityStream")}</h2>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                {activity.length > 0 && (
                  <div className="ml-2 flex items-center gap-2 bg-[var(--bg-overlay)] px-2 py-1 rounded-[4px] border border-[var(--border-main)]">
                    <input
                      type="checkbox"
                      checked={
                        activity.length > 0 &&
                        selectedActivityIds.length === activity.length
                      }
                      onChange={() => handleSelectAll("activity")}
                      className="w-3.5 h-3.5 rounded border-[var(--border)] text-emerald-500 focus:ring-emerald-500 cursor-pointer accent-emerald-500"
                    />
                    <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-tighter">
                      {t("selectAll") || "الكل"}
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
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] bg-red-500 text-white text-[10px] font-bold uppercase tracking-wider hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 active:scale-95"
                  >
                    <Trash2 size={12} />
                    {t("deleteSelected")} ({selectedActivityIds.length})
                  </motion.button>
                )}
              </AnimatePresence>

              <div className="w-px h-4 bg-[var(--border)] mx-1" />

              <button
                onClick={() => handleBulkDeleteActivity("ai_generation")}
                className="text-[var(--text-muted)] hover:text-emerald-500 transition-all p-1.5 hover:bg-emerald-500/5 rounded-[4px] border border-transparent hover:border-emerald-500/10"
                title={t("clearAILogs")}
              >
                <Zap size={14} />
              </button>
              <button
                onClick={() => handleBulkDeleteActivity("system_event")}
                className="text-[var(--text-muted)] hover:text-emerald-500 transition-all p-1.5 hover:bg-emerald-500/5 rounded-[4px] border border-transparent hover:border-emerald-500/10"
                title={t("clearSystemLogs")}
              >
                <Settings size={14} />
              </button>
              <button
                onClick={() => handleBulkDeleteActivity("log")}
                className="text-[var(--text-muted)] hover:text-red-500 transition-all p-1.5 hover:bg-red-500/5 rounded-[4px] border border-transparent hover:border-red-500/10"
                title={t("clearAll")}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          <div className="space-y-4 max-h-[400px] overflow-y-auto px-1 custom-scrollbar">
            {activity.map((log, idx) => {
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
                  className={`flex items-start gap-3 group p-2 rounded-[4px] transition-all border border-transparent ${isSelected ? "bg-emerald-500/5 border-emerald-500/20" : "hover:bg-gray-500/5"}`}
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
                      className="w-4 h-4 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500 cursor-pointer accent-emerald-500"
                    />
                  </div>
                  <div
                    className={`mt-0.5 p-1.5 rounded-[4px] shrink-0 ${
                      log.type === "ai_generation"
                        ? "bg-blue-500/20 text-blue-500"
                        : "bg-emerald-500/20 text-emerald-500"
                    }`}
                  >
                    {log.type === "ai_generation" ? (
                      <Zap size={14} />
                    ) : (
                      <Settings size={14} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] leading-snug truncate">
                      <span className="text-emerald-500 font-bold">
                        {log.user_name || t("systemUser")}
                      </span>{" "}
                      {translateAction(log.action)}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)] mt-1 transition-all duration-[var(--theme-transition-duration)]">
                      {getTimeAgo(log.created_at)}
                      {log.detail &&
                      !log.detail.includes("-") &&
                      !log.detail.includes("gpt")
                        ? ` • ${translateDetail(log.detail)}`
                        : ""}
                      {log.points > 0
                        ? ` • ${log.points} ${language === "ar" ? "نقطة" : "pts"}`
                        : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteActivity(log.id, log.type)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
            {activity.length === 0 && (
              <p className="text-sm text-gray-500 italic">
                {t("noActivityLogged")}
              </p>
            )}
          </div>
        </div>

        <div
          className={`p-6 rounded-[4px] border border-[var(--border-main)] bg-[var(--bg-secondary)] shadow-sm shadow-red-500/5`}
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <ShieldAlert className="text-red-500" size={20} />
              <h2 className="text-lg font-bold text-red-600 dark:text-red-400">
                {t("securityAlerts")}
              </h2>
              {alerts.length > 0 && (
                <div className="flex items-center gap-2 bg-red-500/5 px-2 py-1 rounded-[4px] border border-red-500/10">
                  <input
                    type="checkbox"
                    checked={
                      alerts.length > 0 &&
                      selectedAlertIds.length === alerts.length
                    }
                    onChange={() => handleSelectAll("alert")}
                    className="w-3.5 h-3.5 rounded border-gray-300 text-red-500 focus:ring-red-500 cursor-pointer accent-red-500"
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
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] bg-red-600 text-white text-[10px] font-bold uppercase tracking-wider hover:bg-red-700 transition-all shadow-lg shadow-red-600/20 active:scale-95"
                  >
                    <Trash2 size={12} />
                    {t("deleteSelected")} ({selectedAlertIds.length})
                  </motion.button>
                )}
              </AnimatePresence>

              <div className="w-px h-4 bg-gray-200 dark:bg-gray-800 mx-1" />

              <button
                onClick={handleBulkDeleteAlerts}
                className="text-gray-400 hover:text-red-500 transition-all p-1.5 hover:bg-red-500/5 rounded-[4px] border border-transparent hover:border-red-500/10"
                title={t("clearAll")}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>

          {/* Combined Maintenance Toolkit */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-6 p-4 rounded-[4px] bg-gray-500/5 border border-gray-500/10 shadow-inner">
            <div className="col-span-full flex items-center justify-between mb-1 px-1">
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">
                {t("systemMaintenance")}
              </span>
              <Settings2 size={12} className="text-gray-400" />
            </div>

            <button
              onClick={async () => {
                if (!window.confirm(t("clearAllChatsConfirm"))) return;
                try {
                  const res = await fetch(
                    "/api/admin/maintenance/clear-chats",
                    {
                      method: "DELETE",
                      headers: { Authorization: `Bearer ${token}` },
                    },
                  );
                  if (res.ok) {
                    showToast(t("activityCleared"), "success");
                    fetchData();
                  }
                } catch (e) {
                  console.error("Purge failed", e);
                }
              }}
              className="group flex flex-col items-center justify-center gap-1.5 p-2 rounded-[4px] bg-amber-500/5 border border-amber-500/10 hover:bg-amber-500/10 hover:border-amber-500/30 transition-all"
            >
              <Database
                size={14}
                className="text-amber-500 group-hover:scale-110 transition-transform"
              />
              <span className="text-[8px] font-bold text-amber-600 uppercase text-center leading-tight">
                {t("clearAllChats")}
              </span>
            </button>

            <button
              onClick={async () => {
                if (
                  !window.confirm(
                    language === "ar"
                      ? "هل أنت متأكد من تطهير الإشعارات القديمة؟"
                      : "Prune system notifications older than 30 days?",
                  )
                )
                  return;
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
              }}
              className="group flex flex-col items-center justify-center gap-1.5 p-2 rounded-[4px] bg-emerald-500/5 border border-emerald-500/10 hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all"
            >
              <BellRing
                size={14}
                className="text-emerald-500 group-hover:scale-110 transition-transform"
              />
              <span className="text-[8px] font-bold text-emerald-600 uppercase text-center leading-tight">
                {t("maintenancePruneLegacy")}
              </span>
            </button>

            <button
              onClick={async () => {
                if (!window.confirm(t("clearNotifsConfirm"))) return;
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
              }}
              className="group flex flex-col items-center justify-center gap-1.5 p-2 rounded-[4px] bg-red-500/5 border border-red-500/10 hover:bg-red-500/10 hover:border-red-500/30 transition-all"
            >
              <Shield
                size={14}
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
                  className={`flex items-start gap-3 group p-2 rounded-[4px] transition-all border border-transparent ${isSelected ? "bg-red-500/5 border-red-500/20" : "hover:bg-gray-500/5"}`}
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
                      className="w-4 h-4 rounded border-gray-300 text-red-500 focus:ring-red-500 cursor-pointer accent-red-500"
                    />
                  </div>
                  <div className={`mt-0.5 p-1.5 rounded-[4px] shrink-0 ${
                      alert.severity === "high" || alert.severity === "critical"
                        ? "bg-red-500/20 text-red-500"
                        : "bg-amber-500/20 text-amber-500"
                    }`}>
                    <AlertCircle size={14} />
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
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all font-bold"
                  >
                    <Trash2 size={14} />
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
          className={`fixed bottom-6 ${dir === "rtl" ? "left-6" : "right-6"} z-50 flex items-center gap-3 px-6 py-4 rounded-[var(--radius)] shadow-2xl transition-all duration-[var(--theme-transition-duration)] animate-in slide-in-from-bottom-5 ${
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
    </div>
  );
};

const DigitalFinancialRadarView = ({
  theme,
  t,
}: {
  theme: string;
  t: (key: string, replacements?: any) => string;
}) => {
  const { token, language, socket, dir } = useAppContext();
  const [financials, setFinancials] = useState<any[]>([]);
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<
    string[]
  >([]);
  const [radarStats, setRadarStats] = useState<any>({
    total_liquidity: 0,
    transaction_count: 0,
    volume_24h: 0,
    health_score: 100,
  });
  const [walletDiagnostics, setWalletDiagnostics] = useState<any[]>([]);
  const [walletAlerts, setWalletAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [financeRes, diagRes, alertsRes] = await Promise.all([
        fetch("/api/admin/financial-radar", { headers }),
        fetch("/api/admin/wallet-diagnostics", { headers }),
        fetch("/api/admin/wallet-alerts", { headers }),
      ]);

      if (financeRes.ok) {
        const data = await financeRes.json();
        setFinancials(data.transactions || []);
        if (data.stats) setRadarStats(data.stats);
      }
      if (diagRes.ok) setWalletDiagnostics(await diagRes.json());
      if (alertsRes.ok) setWalletAlerts(await alertsRes.json());
    } catch (error) {
      console.error("Error fetching radar data:", error);
    } finally {
      setTimeout(() => setLoading(false), 800);
    }
  };

  useEffect(() => {
    if (token) fetchData();

    if (socket) {
      const handleNewTransaction = (tx: any) => {
        setFinancials((prev) => [tx, ...prev].slice(0, 100));
      };
      socket.on("new_financial_transaction", handleNewTransaction);
      return () => {
        socket.off("new_financial_transaction", handleNewTransaction);
      };
    }
  }, [token, socket]);

  const handleBatchDelete = async () => {
    if (
      !token ||
      selectedTransactionIds.length === 0 ||
      !window.confirm(
        t("batchDeleteConfirm").replace(
          "{count}",
          selectedTransactionIds.length.toString(),
        ),
      )
    )
      return;

    try {
      const res = await fetch("/api/admin/activity/batch-delete", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ids: selectedTransactionIds,
          type: "financial",
        }),
      });

      if (res.ok) {
        setFinancials((prev) =>
          prev.filter((tx) => !selectedTransactionIds.includes(tx.id)),
        );
        showToast(
          t("batchDeleteSuccess").replace(
            "{count}",
            selectedTransactionIds.length.toString(),
          ),
          "success",
        );
        setSelectedTransactionIds([]);
        fetchData(); // Refresh stats
      }
    } catch (err) {
      console.error("Batch delete failed", err);
    }
  };

  const handleBulkPurge = async () => {
    if (
      !token ||
      !window.confirm(
        language === "ar"
          ? "هل أنت متأكد من تطهير كافة سجلات العمليات؟ هذا الإجراء نهائي."
          : "Are you sure you want to purge ALL transaction logs? This action is irreversible.",
      )
    )
      return;

    try {
      const res = await fetch("/api/admin/financial/all", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setFinancials([]);
        showToast(t("activityCleared"), "success");
        fetchData();
      }
    } catch (err) {
      console.error("Purge failed", err);
    }
  };

  const handleSelectAll = () => {
    if (selectedTransactionIds.length === filteredFinancials.length) {
      setSelectedTransactionIds([]);
    } else {
      setSelectedTransactionIds(filteredFinancials.map((tx) => tx.id));
    }
  };

  const handleReconcile = async (userId: string) => {
    if (
      !token ||
      !window.confirm(
        "Start wallet reconciliation? This will recalibrate user balance based strictly on ledger transactions.",
      )
    )
      return;
    try {
      const res = await fetch(`/api/admin/reconcile-wallet/${userId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error("Reconciliation failed", err);
    }
  };

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

  const filteredFinancials = React.useMemo(() => {
    if (!search.trim()) return financials;
    const term = search.toLowerCase();
    return financials.filter(
      (tx) =>
        tx.user_name?.toLowerCase().includes(term) ||
        tx.description?.toLowerCase().includes(term) ||
        tx.transaction_type?.toLowerCase().includes(term) ||
        tx.amount?.toString().includes(term),
    );
  }, [financials, search]);

  const handleDeleteAlert = async (alert: any) => {
    if (!token || !window.confirm(t("deleteAlert"))) return;
    try {
      if (alert.alert_type === "kyc_request") {
        // KYC alert is just a view, dismissing it locally for now
        setWalletAlerts((prev) =>
          prev.filter(
            (a) =>
              !(a.user_id === alert.user_id && a.alert_type === "kyc_request"),
          ),
        );
        return;
      }

      const res = await fetch(`/api/admin/ledger-transactions/${alert.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setWalletAlerts((prev) => prev.filter((a) => a.id !== alert.id));
      }
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`px-3 py-2 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-surface)] flex items-center gap-2 transition-all duration-[var(--theme-transition-duration)]`}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,1)]" />
            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-tighter">
              Live Monitor
            </span>
          </div>
          <AnimatePresence>
            {selectedTransactionIds.length > 0 && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9, x: -20 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.9, x: -20 }}
                onClick={handleBatchDelete}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-wider hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
              >
                <Trash2 size={12} />
                {t("deleteSelected")} ({selectedTransactionIds.length})
              </motion.button>
            )}
          </AnimatePresence>
          <button
            onClick={handleBulkPurge}
            className="p-1.5 rounded-[4px] text-red-500/40 hover:text-red-500 hover:bg-red-500/10 transition-all"
            title={t("clearAll")}
          >
            <Shield size={16} />
          </button>
        </div>
        <div
          className={`flex items-center gap-3 ${dir === "rtl" ? "flex-row-reverse" : "flex-row"}`}
        >
          <div className="relative group">
            <Search
              className={`absolute ${dir === "rtl" ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 transition-all duration-300 ${search ? "text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]" : "text-gray-400"}`}
              size={18}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                t("searchTxPlaceholder") ||
                (language === "ar"
                  ? "بحث في السجلات الفنية..."
                  : "Search financial records...")
              }
              className={`w-full md:w-80 ${dir === "rtl" ? "pr-10 pl-4" : "pl-10 pr-4"} py-2.5 rounded-[var(--radius)] border text-sm font-medium transition-all duration-[var(--theme-transition-duration)] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 bg-[var(--bg-overlay)] border-[var(--border)] focus:border-emerald-500/50 text-[var(--text-primary)] placeholder:text-[var(--text-muted)]`}
            />
          </div>
          <button
            onClick={fetchData}
            title={language === "ar" ? "تحديث السجل" : "Refresh Log"}
            className={`w-10 h-10 flex items-center justify-center rounded-[4px] border transition-all duration-300 group ${
              loading
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500"
                : "bg-[#1a1a1c]/40 border-gray-800/60 text-gray-400 hover:border-emerald-500/50 hover:bg-emerald-500/5 hover:text-emerald-500"
            }`}
          >
            <RefreshCw
              size={20}
              className={`${loading ? "animate-spin" : "group-hover:rotate-180"} transition-all duration-700 ${loading || search ? "drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]" : ""}`}
            />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8 mt-2">
        <div
          className={`p-5 rounded-[4px] border border-[var(--border-main)] bg-[var(--bg-secondary)] transition-all duration-300 hover:shadow-md`}
        >
          <div className="flex justify-between items-start mb-4">
            <div
              className={`p-2.5 rounded-[4px] bg-[var(--bg-primary)] text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]`}
            >
              <Landmark size={20} />
            </div>
            <span
              className={`text-sm font-medium px-2 py-1 rounded-[4px] bg-emerald-500/10 text-emerald-500`}
            >
              {radarStats?.health_score}%
            </span>
          </div>
          <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">
            {language === "ar" ? "إجمالي السيولة" : "Total Liquidity"}
          </h3>
          <p className="text-2xl font-bold">
            ${radarStats?.total_liquidity?.toLocaleString() || 0}
          </p>
        </div>

        <div
          className={`p-5 rounded-[4px] border border-[var(--border-main)] bg-[var(--bg-secondary)] transition-all duration-300 hover:shadow-md`}
        >
          <div className="flex justify-between items-start mb-4">
            <div
              className={`p-2.5 rounded-[4px] bg-[var(--bg-primary)] text-blue-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.4)]`}
            >
              <ArrowRightLeft size={20} />
            </div>
            <span
              className={`text-sm font-medium px-2 py-1 rounded-[4px] bg-blue-500/10 text-blue-500`}
            >
              +5.2%
            </span>
          </div>
          <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">
            {language === "ar" ? "حجم تداول 24 ساعة" : "24h Volume"}
          </h3>
          <p className="text-2xl font-bold">
            ${radarStats?.volume_24h?.toLocaleString() || 0}
          </p>
        </div>

        <div
          className={`p-5 rounded-[4px] border border-[var(--border-main)] bg-[var(--bg-secondary)] transition-all duration-300 hover:shadow-md`}
        >
          <div className="flex justify-between items-start mb-4">
            <div
              className={`p-2.5 rounded-[4px] bg-[var(--bg-primary)] text-amber-500 drop-shadow-[0_0_8_rgba(245,158,11,0.4)]`}
            >
              <History size={20} />
            </div>
            <span
              className={`text-sm font-medium px-2 py-1 rounded-[4px] bg-amber-500/10 text-amber-500`}
            >
              Live
            </span>
          </div>
          <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">
            {language === "ar" ? "عدد العمليات الكلي" : "Total Transactions"}
          </h3>
          <p className="text-2xl font-bold">
            {radarStats?.transaction_count?.toLocaleString() || 0}
          </p>
        </div>

        <div
          className={`p-5 rounded-[4px] border border-[var(--border-main)] bg-[var(--bg-secondary)] transition-all duration-300 hover:shadow-md`}
        >
          <div className="flex justify-between items-start mb-4">
            <div
              className={`p-2.5 rounded-[4px] bg-[var(--bg-primary)] text-purple-500 drop-shadow-[0_0_8px_rgba(168,85,247,0.4)]`}
            >
              <Zap size={20} />
            </div>
            <span
              className={`text-sm font-medium px-2 py-1 rounded-[4px] bg-purple-500/10 text-purple-500`}
            >
              Syncing
            </span>
          </div>
          <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">
            {language === "ar" ? "سجل العمليات النشط" : "Active Registry"}
          </h3>
          <p className="text-2xl font-bold">{financials.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Diagnostics & Alerting */}
        <div className="lg:col-span-1 space-y-6">
          {/* Wallet Alerts */}
          <div
            className={`p-6 rounded-[4px] border border-red-500/20 bg-red-500/5`}
          >
            <h3 className="text-sm font-bold text-red-500 mb-4 flex items-center gap-2 uppercase tracking-widest">
              <AlertCircle size={16} />
              {t("walletAlerts")}
            </h3>
            <div className="space-y-3">
              {walletAlerts.map((alert, idx) => {
                let badgeColor = "bg-red-500/20 text-red-500";
                let typeLabel = t("highValue");

                if (alert.alert_type === "withdrawal_request") {
                  badgeColor = "bg-amber-500/20 text-amber-500";
                  typeLabel = t("withdrawal");
                } else if (alert.alert_type === "kyc_request") {
                  badgeColor = "bg-purple-500/20 text-purple-500";
                  typeLabel = t("kyc");
                }

                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-[4px] border group transition-all bg-[var(--bg-secondary)] border-[var(--border-main)] hover:shadow-md`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-[4px] ${badgeColor}`}
                      >
                        {typeLabel}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-500">
                          {getTimeAgo(alert.created_at)}
                        </span>
                        <button
                          onClick={() => handleDeleteAlert(alert)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all font-bold"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                      {alert.user_name}
                    </p>
                    {alert.alert_type !== "kyc_request" && (
                      <p className="text-xs font-bold text-emerald-500 mt-1">
                        ${(Math.abs(alert.amount) / 100).toFixed(2)}
                      </p>
                    )}
                    {alert.alert_type === "kyc_request" && (
                      <p className="text-[10px] text-amber-500 mt-1 italic">
                        {language === "ar"
                          ? "بانتظار المراجعة"
                          : "Pending Review"}
                      </p>
                    )}
                  </div>
                );
              })}
              {walletAlerts.length === 0 && (
                <p className="text-xs text-gray-500 italic">
                  {t("walletAlertsEmpty")}
                </p>
              )}
            </div>
          </div>

          <div
            className={`p-6 rounded-[4px] border border-amber-500/20 bg-amber-500/5`}
          >
            <h3 className="text-sm font-bold text-amber-600 dark:text-amber-400 mb-4 flex items-center gap-2 uppercase tracking-widest">
              <ShieldAlert size={16} />
              {t("discrepancyAnalysis")}
            </h3>

            <div className="space-y-3">
              {walletDiagnostics.map((diag, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-[4px] border animate-in fade-in slide-in-from-right-5 duration-300 bg-[var(--bg-secondary)] border-[var(--border-main)] shadow-sm`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-[4px] bg-red-500/10 flex items-center justify-center text-red-500 text-xs font-bold uppercase">
                        {diag.user?.name?.substring(0, 2)}
                      </div>
                      <span className="text-sm font-bold">
                        {diag.user?.name}
                      </span>
                    </div>
                    <button
                      onClick={() => handleReconcile(diag.user_id)}
                      className="p-2 hover:bg-emerald-500/10 text-emerald-500 rounded-[4px] transition-colors border border-transparent hover:border-emerald-500/30"
                    >
                      <ShieldCheck size={16} />
                    </button>
                  </div>
                  <div className="flex justify-between text-xs py-2 border-t border-gray-800/30 mt-2">
                    <span className="text-gray-500">{t("currentBalance")}</span>
                    <span className="text-red-500 font-black">
                      ${diag.balance}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs pt-1">
                    <span className="text-gray-500">
                      {t("ledgerExpectation")}
                    </span>
                    <span className="text-emerald-500 font-black">
                      ${diag.expected_balance}
                    </span>
                  </div>
                </div>
              ))}
              {walletDiagnostics.length === 0 && (
                <div className="py-10 text-center space-y-2 opacity-50">
                  <CheckCircle2
                    size={32}
                    className="mx-auto text-emerald-500"
                  />
                  <p className="text-xs font-medium text-gray-500">
                    {t("allBalancesSynced")}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div
            className={`p-6 rounded-[4px] border border-[var(--border-main)] bg-[var(--bg-secondary)]`}
          >
            <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-4 flex items-center justify-between uppercase tracking-widest">
              <div className="flex items-center gap-2">
                <Zap size={16} />
                {t("quickVelocity")}
              </div>
              <TrendingUp size={14} className="text-emerald-500" />
            </h3>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 rounded-[4px] bg-emerald-500/5 border border-[var(--border-main)]">
                <p className="text-[10px] uppercase text-[var(--text-secondary)] font-bold mb-1">
                  {t("todayTx")}
                </p>
                <p className="text-xl font-black text-emerald-500">
                  {financials.length}
                </p>
              </div>
              <div className="p-4 rounded-[4px] bg-emerald-500/5 border border-[var(--border-main)]">
                <p className="text-[10px] uppercase text-[var(--text-secondary)] font-bold mb-1">
                  {t("alertLevel")}
                </p>
                <p
                  className={`text-xl font-black ${walletDiagnostics.length > 5 ? "text-red-500" : walletDiagnostics.length > 0 ? "text-amber-500" : "text-emerald-500"}`}
                >
                  {walletDiagnostics.length > 5
                    ? t("critical")
                    : walletDiagnostics.length > 0
                      ? t("warning")
                      : t("secure")}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-end justify-between gap-1 h-12 px-2">
                {[
                  40, 70, 45, 90, 65, 80, 50, 85, 95, 60, 75, 55, 30, 80, 100,
                ].map((h, i) => (
                  <motion.div
                    key={i}
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    transition={{ delay: i * 0.05, duration: 0.5 }}
                    className={`flex-1 rounded-t-sm transition-all duration-300 ${i === 14 ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "bg-gray-800 hover:bg-emerald-500/40"}`}
                  />
                ))}
              </div>
              <div className="flex justify-between text-[9px] font-bold text-gray-600 uppercase tracking-tighter px-1">
                <span>00:00</span>
                <span>REGISTRY VELOCITY INDEX</span>
                <span>NOW</span>
              </div>
            </div>
          </div>
        </div>

        {/* Live Transaction Stream & Historical Audit */}
        <div className="lg:col-span-2">
          <div
            className={`rounded-[4px] border overflow-hidden bg-[var(--bg-secondary)] border-[var(--border-main)]`}
          >
            <div className="p-6 border-b border-[var(--border-main)] flex items-center justify-between">
              <h3 className="font-bold flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                {t("liveTransactionRegistry")}
              </h3>
              <span className="text-[10px] font-bold text-gray-500 uppercase">
                {t("showingLast100")}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left rtl:text-right">
                <thead
                  className={`text-[10px] uppercase font-bold transition-all duration-[var(--theme-transition-duration)] ${theme === "dark" ? "bg-[var(--bg-surface)] text-gray-500" : "bg-gray-50 text-gray-400"}`}
                >
                  <tr>
                    <th scope="col" className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={
                          filteredFinancials.length > 0 &&
                          selectedTransactionIds.length ===
                            filteredFinancials.length
                        }
                        onChange={handleSelectAll}
                        className="w-3.5 h-3.5 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500 cursor-pointer accent-emerald-500"
                      />
                    </th>
                    <th scope="col" className="px-6 py-4">
                      {t("entityUser")}
                    </th>
                    <th scope="col" className="px-6 py-4">
                      {t("protocol")}
                    </th>
                    <th scope="col" className="px-6 py-4">
                      {t("vector")}
                    </th>
                    <th scope="col" className="px-6 py-4">
                      {t("timestamp")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/30">
                  {filteredFinancials.map((tx, idx) => {
                    const isSelected = selectedTransactionIds.includes(tx.id);
                    return (
                      <tr
                        key={idx}
                        className={`group transition-all ${isSelected ? "bg-emerald-500/5" : theme === "dark" ? "hover:bg-gray-800/20" : "hover:bg-gray-50"}`}
                      >
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              setSelectedTransactionIds((prev) =>
                                prev.includes(tx.id)
                                  ? prev.filter((id) => id !== tx.id)
                                  : [...prev, tx.id],
                              );
                            }}
                            className="w-3.5 h-3.5 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500 cursor-pointer accent-emerald-500"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-[4px] flex items-center justify-center font-bold text-xs uppercase ${
                                tx.amount > 0
                                  ? "bg-emerald-500/10 text-emerald-500"
                                  : "bg-amber-500/10 text-amber-500"
                              }`}
                            >
                              {tx.user_name?.substring(0, 1)}
                            </div>
                            <div>
                              <div className="font-bold text-gray-900 dark:text-gray-100">
                                {tx.user_name}
                              </div>
                              <div className="text-[10px] text-gray-500 font-mono">
                                WID: {tx.wallet_id}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-500/80">
                              {tx.transaction_type?.replace("_", " ")}
                            </div>
                            <div className="text-[10px] text-gray-500 max-w-[200px] truncate">
                              {tx.description}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`text-sm font-black ${tx.amount > 0 ? "text-emerald-400 drop-shadow-[0_0_5px_rgba(16,185,129,0.3)]" : "text-red-400"}`}
                          >
                            {tx.amount > 0 ? "+" : "-"}$
                            {Math.abs(tx.amount).toFixed(2)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-[10px] text-gray-500 font-medium">
                          {getTimeAgo(tx.created_at)}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredFinancials.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-20 text-center">
                        <div className="space-y-3 opacity-30">
                          <Search size={48} className="mx-auto" />
                          <p className="text-sm font-medium">
                            {t("noFinancialVectors")}
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toast &&
        createPortal(
          <div
            className={`fixed bottom-6 ${dir === "rtl" ? "left-6" : "right-6"} z-[1000] flex items-center gap-3 px-6 py-4 rounded-[4px] shadow-2xl transition-all duration-300 animate-in slide-in-from-bottom-5 ${
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
    type: "models" | "usage";
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

        setProviders((prevProviders) =>
          prevProviders.map((p) => {
            const savedKey = savedKeys.find((k: any) => k.provider === p.id);
            if (savedKey) {
              return {
                ...p,
                status: "active",
                isActive: !!savedKey.is_active,
                updatedAt: savedKey.updated_at,
                budget: parseFloat(savedKey.daily_budget) || 0,
                usedToday: parseFloat(savedKey.used_today) || 0,
                key: "",
                urlKey: "",
              };
            }
            return p;
          }),
        );
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
      type: "usage",
      providerId: id,
      providerName: providers.find((p) => p.id === id)?.name || id,
      status: "loading",
    });

    try {
      const response = await fetch(`/api/admin/api-keys/${id}/sync-usage`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (response.ok && data.status?.isValid) {
        setSyncModal({
          isOpen: true,
          type: "usage",
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
          type: "usage",
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
        type: "usage",
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

    // First, force a test. We MUST verify before saving as per Sovereign mandate.
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
            className={`fixed bottom-6 ${dir === "rtl" ? "left-6" : "right-6"} z-[1000] flex items-center gap-3 px-6 py-4 rounded-[4px] shadow-2xl transition-all duration-300 animate-in slide-in-from-bottom-5 ${
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
          <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div
              className={`w-full max-w-md rounded-[var(--radius)] shadow-2xl overflow-hidden bg-[var(--bg-surface)] border border-[var(--border)] transition-all duration-[var(--theme-transition-duration)]`}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3
                    className={`text-lg font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}
                  >
                    {syncModal.type === "models"
                      ? t("syncModels")
                      : t("syncUsageLimits")}{" "}
                    - {syncModal.providerName}
                  </h3>
                  <button
                    onClick={() => setSyncModal(null)}
                    className="text-gray-400 hover:text-gray-500 transition-colors"
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
                className={`p-4 border-t flex justify-end gap-3 border-[var(--border)] bg-[var(--bg-base)]/50 transition-all duration-[var(--theme-transition-duration)]`}
              >
                <button
                  onClick={() => setSyncModal(null)}
                  className={`px-5 py-2 rounded-[4px] text-sm font-medium transition-colors ${theme === "dark" ? "text-gray-400 hover:text-white hover:bg-gray-800" : "text-gray-600 hover:text-gray-900 hover:bg-gray-200"}`}
                >
                  {t("close")}
                </button>
                {syncModal.status === "success" && (
                  <button
                    onClick={() => {
                      showToast(t("toastDbSaveSuccess"), "success");
                      setSyncModal(null);
                    }}
                    className="px-5 py-2 rounded-[4px] text-sm font-bold bg-emerald-500 text-white hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20"
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
          <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div
              className={`w-full max-w-sm rounded-[var(--radius)] shadow-2xl overflow-hidden bg-[var(--bg-surface)] border border-[var(--border)] transition-all duration-[var(--theme-transition-duration)]`}
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
                    className={`flex-1 py-3 rounded-[var(--radius)] text-sm font-bold transition-all duration-[var(--theme-transition-duration)] ${theme === "dark" ? "bg-[var(--bg-surface)] text-gray-400 hover:text-white hover:bg-gray-800" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                  >
                    {t("cancel")}
                  </button>
                  <button
                    onClick={() => handleDeleteKey(deleteModal.providerId)}
                    className="flex-1 py-3 rounded-[4px] text-sm font-bold bg-red-500 text-white hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
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
            className={`p-6 rounded-[4px] border transition-all duration-300 relative group overflow-hidden bg-[var(--bg-secondary)] border-[var(--border-main)] hover:shadow-lg`}
          >
            {/* Provider Logo Accent (Faded in Background) */}
            <div className="absolute -top-4 -right-4 opacity-5 dark:opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform duration-700">
              <Key size={120} />
            </div>

            <div className="flex justify-between items-start mb-6 relative z-10">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-[4px] bg-[var(--bg-primary)] flex items-center justify-center text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]`}
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
                        className="px-1.5 py-0.5 rounded-[4px] bg-emerald-500/10 text-emerald-500 text-[8px] font-black uppercase tracking-widest border border-emerald-500/20"
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
                  className={`p-2 rounded-[4px] border transition-all bg-[var(--bg-primary)] border-[var(--border-main)] text-gray-400 hover:text-emerald-500 hover:border-emerald-500/30`}
                  title={`Go to ${provider.name} Dashboard`}
                >
                  <ExternalLink size={16} />
                </a>
                {(provider.status === "active" || provider.key) && (
                  <button
                    onClick={() => handleDeleteKey(provider.id, provider.name)}
                    className={`p-2 rounded-[4px] border transition-all bg-[var(--bg-primary)] border-[var(--border-main)] text-red-500/40 hover:text-red-500 hover:bg-red-500/10 hover:border-red-500/30`}
                    title={t("keyDeleteConfirm").split("?")[0] + "?"}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* Usage Metrics Section */}
            <div className="space-y-5 mb-6 p-4 rounded-[4px] bg-[var(--bg-primary)]/50 border border-[var(--border-main)]/50">
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
                <div className="w-full h-1 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: `${Number(provider.budget || 0) > 0 ? Math.min(100, (Number(provider.usedToday || 0) / Number(provider.budget || 0)) * 100) : 0}%`,
                    }}
                    className={`h-full rounded-full ${Number(provider.budget || 0) > 0 && Number(provider.usedToday || 0) / Number(provider.budget || 0) > 0.9 ? "bg-red-500" : "bg-emerald-500"} shadow-[0_0_8px_rgba(16,185,129,0.3)]`}
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
                    className={`w-full h-9 pl-8 pr-3 text-xs font-mono rounded-[4px] border focus:outline-none focus:ring-1 focus:ring-emerald-500/30 transition-all bg-[var(--bg-primary)] border-[var(--border-main)] text-[var(--text-primary)]`}
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
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-[4px] bg-[var(--bg-primary)] text-gray-500 text-[9px] font-black uppercase tracking-wider border border-[var(--border-main)] hover:text-emerald-500 hover:border-emerald-500/30 hover:shadow-[0_0_10px_rgba(16,185,129,0.1)] transition-all active:scale-95 group/btn"
                title={t("syncUsageLimits")}
              >
                <RefreshCw
                  size={12}
                  className="group-hover/btn:animate-spin-slow transition-transform"
                />
                {language === "ar" ? "مزامنة الاستهلاك" : "Sync Usage"}
              </button>
              <button
                onClick={() => handleSyncModels(provider.id, provider.name)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-[4px] bg-[var(--bg-primary)] text-gray-500 text-[9px] font-black uppercase tracking-wider border border-[var(--border-main)] hover:text-emerald-500 hover:border-emerald-500/30 hover:shadow-[0_0_10px_rgba(16,185,129,0.1)] transition-all active:scale-95 group/btn"
                title={t("syncModels")}
              >
                <Cpu
                  size={12}
                  className="group-hover/btn:scale-110 transition-transform"
                />
                {language === "ar" ? "مزامنة الموديلات" : "Sync Models"}
              </button>
            </div>

            <div className="space-y-3">
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
                className={`flex items-center h-11 px-4 rounded-[4px] border group-focus-within:border-emerald-500/50 transition-all bg-[var(--bg-primary)] border-[var(--border-main)] shadow-inner`}
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

              {provider.id === "ollama" && (
                <div className="space-y-1.5 mt-4">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">
                    {t("ollamaUrlLabel") || "Cloud Endpoint URL"}
                  </label>
                  <div
                    className={`flex items-center h-11 px-4 rounded-[4px] border bg-[var(--bg-primary)] border-[var(--border-main)] focus-within:border-emerald-500/50 transition-all shadow-sm`}
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
                      placeholder="https://cloud.ollama.ai:11434"
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
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-[4px] bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-all group/save"
                        title={t("saveKeyBtn")}
                      >
                        <Save
                          size={14}
                          className="group-hover/save:scale-110 transition-transform"
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
                    {t("ollamaCloudHint") ||
                      "Note: Enter your Ollama Cloud URL here. Localhost is used as fallback only."}
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 mt-6">
              <button
                onClick={() =>
                  handleSaveKey(
                    provider.id,
                    provider.key,
                    provider.id === "ollama"
                      ? (provider as any).urlKey
                      : undefined,
                  )
                }
                disabled={
                  !provider.key &&
                  (provider.id !== "ollama" || !(provider as any).urlKey)
                }
                className={`h-11 rounded-[4px] flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${
                  !provider.key
                    ? "bg-gray-500/5 text-gray-500 cursor-not-allowed border border-transparent"
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
                    provider.id === "ollama"
                      ? (provider as any).urlKey
                      : undefined,
                  )
                }
                className="h-11 rounded-[4px] flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest bg-[var(--bg-primary)] text-emerald-500 border border-emerald-500/20 hover:border-emerald-500/40 hover:bg-emerald-500/5 hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.3)] transition-all active:scale-95"
              >
                <FastForward size={14} />{" "}
                {language === "ar" ? "فحص سريع" : "Quick Scan"}
              </button>
            </div>

            <button
              onClick={() => handleSyncUsage(provider.id, provider.name)}
              className={`w-full py-2.5 mt-2 rounded-[4px] flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all bg-[var(--bg-primary)] border border-[var(--border-main)] text-gray-500 hover:text-emerald-500 hover:border-emerald-500/30 hover:bg-emerald-500/5`}
            >
              <Activity size={14} /> {t("syncUsageLimits")}
            </button>
          </div>
        ))}
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

  const fetchDatabases = async () => {
    try {
      const response = await fetch("/api/admin/databases/registry", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setDatabases(
          data.map((db: any) => ({
            ...db,
            titleKey: `${db.provider}DbTitle`,
            descKey: `${db.provider.includes("shadow") ? "shadow" : "primary"}DbDesc`,
            icon: db.provider.includes("core") ? Database : Landmark,
            // Color coding: Blue for Core, Amber/Orange for Ledger, Teal for Shadows
            color: db.provider.includes("shadow")
              ? "teal"
              : db.provider.includes("core")
                ? "blue"
                : "amber",
            isTesting: false,
            showPassword: false,
          })),
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
            d.id === id ? { ...d, isTesting: false, status: "healthy" } : d,
          ),
        );
        showToast(t("dbTestSuccess") || "Connection successful!", "success");
      } else {
        setDatabases((dbs) =>
          dbs.map((d) =>
            d.id === id ? { ...d, isTesting: false, status: "error" } : d,
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
          d.id === id ? { ...d, isTesting: false, status: "error" } : d,
        ),
      );
      showToast(t("dbTestError") || "Connection error", "error");
    }
  };

  const handleSaveConfig = async (id: string) => {
    const db = databases.find((d) => d.id === id);
    if (!db) return;

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

  const handleRunMigrations = async (
    id: string,
    type: "scratch" | "additive",
  ) => {
    if (
      type === "scratch" &&
      !window.confirm(
        dir === "rtl"
          ? "⚠️ تحذير: هذا الإجراء سيقوم بحذف كافة البيانات وإعادة بناء المخطط من الصفر. هل تريد الاستمرار؟"
          : "⚠️ WARNING: This will wipe all data and rebuild the schema from scratch. Continue?",
      )
    ) {
      return;
    }

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

  const handleExportBackup = async (dbId: string) => {
    try {
      const db = databases.find((d) => d.id === dbId);
      if (!db) return;

      const targetType = db.id.includes("ledger") ? "ledger" : "core";

      const dbName = db.db_name || db.dbName || targetType;
      const displayLabel = dbName.replace(/[^a-z0-9_-]/gi, "_").toLowerCase();
      const filename = `${displayLabel}_backup_${new Date().toISOString().split("T")[0]}.json`;

      showToast(
        dir === "rtl"
          ? `جاري تصدير نسخة احتياطية: ${dbName}...`
          : `Exporting backup: ${dbName}...`,
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
      const blob = new Blob([JSON.stringify(backupData, null, 2)], {
        type: "application/json",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      showToast(
        dir === "rtl"
          ? "تم تصدير النسخة بنجاح"
          : "Backup exported successfully",
        "success",
      );
    } catch (error: any) {
      console.error("Export error:", error);
      showToast(error.message, "error");
    }
  };

  const handleImportBackup = async (
    dbId: string,
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const db = databases.find((d) => d.id === dbId);
    if (!db) return;

    const targetType = db.id.includes("ledger") ? "ledger" : "core";
    const dbName = db.db_name || db.dbName || targetType;

    const confirmMsg =
      dir === "rtl"
        ? `⚠️ تحذير شديد: استعادة النسخة إلى (${dbName}) سيؤدي لمسح كافة البيانات الحالية بشكل نهائي واستبدالها بالنسخة. هل أنت متأكد تماماً؟`
        : `⚠️ CRITICAL WARNING: Restoring backup to (${dbName}) will PERMANENTLY WIPE all current data and replace it with the backup content. Are you absolutely sure?`;

    if (!window.confirm(confirmMsg)) {
      if (event.target) event.target.value = "";
      return;
    }

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
        if (event.target) event.target.value = "";
      }
    };
    reader.readAsText(file);
  };

  const handleChange = (id: string, field: string, value: string | boolean) => {
    setDatabases((dbs) =>
      dbs.map((db) => (db.id === id ? { ...db, [field]: value } : db)),
    );
  };

  return (
    <div className="space-y-4 max-w-6xl mx-auto relative transition-all duration-[var(--theme-transition-duration)]">
      {toast && (
        <div
          className={`fixed bottom-6 ${dir === "rtl" ? "left-6" : "right-6"} z-50 flex items-center gap-3 px-6 py-4 rounded-[var(--radius)] shadow-2xl transition-all duration-[var(--theme-transition-duration)] animate-in slide-in-from-bottom-5 ${
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
              className={`p-5 rounded-[4px] border flex flex-col gap-4 transition-all duration-300 bg-[var(--bg-secondary)] border-[var(--border-main)] hover:border-emerald-500/20 shadow-sm`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2.5 rounded-[var(--radius)] border transition-all duration-[var(--theme-transition-duration)] ${theme === "dark" ? "bg-[var(--bg-surface)] border-gray-800 text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]" : "bg-white border-emerald-100 text-emerald-600"}`}
                  >
                    <Icon size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-[var(--text-primary)] flex items-center gap-2">
                      {t(db.titleKey)}
                      <span className="px-1.5 py-0.5 rounded-[4px] bg-gray-500/10 text-gray-500 text-[8px] font-black uppercase border border-gray-500/20">
                        {db.id.includes("ledger")
                          ? "Ledger (Financial)"
                          : "Core (Operational)"}
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
                    <span className="text-[11px] font-medium text-gray-500 bg-gray-500/10 border border-gray-500/20 px-2.5 py-0.5 rounded-full flex items-center gap-1">
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

              <div className="flex p-1.5 bg-[var(--bg-primary)] border border-[var(--border-main)] rounded-[4px] mb-6 shadow-inner overflow-hidden relative">
                <div className="absolute inset-0 bg-emerald-500/5 pointer-events-none" />
                <button
                  onClick={() => handleChange(db.id, "type", "cloud")}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 text-[11px] font-black uppercase tracking-[0.2em] rounded-[4px] transition-all duration-500 ease-out relative z-10 ${db.type === "cloud" ? "bg-emerald-500 text-white shadow-[0_4px_15px_rgba(16,185,129,0.4)]" : "text-gray-500 hover:bg-gray-50/50 dark:hover:bg-gray-800/30"}`}
                >
                  <Cloud
                    size={14}
                    className={db.type === "cloud" ? "animate-pulse" : ""}
                  />{" "}
                  {t("cloud")}
                </button>
                <button
                  onClick={() => handleChange(db.id, "type", "local")}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 text-[11px] font-black uppercase tracking-[0.2em] rounded-[4px] transition-all duration-500 ease-out relative z-10 ${db.type === "local" ? "bg-blue-600 text-white shadow-[0_4px_15px_rgba(37,99,235,0.4)]" : "text-gray-500 hover:bg-gray-50/50 dark:hover:bg-gray-800/30"}`}
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
                    className="space-y-4 p-5 rounded-[4px] bg-emerald-500/[0.02] border border-emerald-500/10 shadow-inner relative overflow-hidden"
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
                        className="text-emerald-500/60 hover:text-emerald-500 transition-all p-1"
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
                      className={`w-full p-4 rounded-[4px] border bg-[var(--bg-primary)] border-[var(--border-main)] text-[var(--text-primary)] text-xs font-mono resize-none focus:ring-1 focus:ring-emerald-500/30 outline-none transition-all shadow-sm leading-relaxed ${db.showConnectionString ? "" : "blur-[3px] select-none"}`}
                      value={db.connection_string || ""}
                      onChange={(e) =>
                        handleChange(db.id, "connection_string", e.target.value)
                      }
                    />
                    <div className="flex items-center gap-2 pt-1">
                      <ShieldCheck size={12} className="text-emerald-500/60" />
                      <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">
                        Sovereign Encryption Active
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="local-fields"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.02 }}
                    className="space-y-4 p-5 rounded-[4px] bg-blue-500/[0.02] border border-blue-500/10 shadow-inner relative overflow-hidden"
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
                          className="w-full h-9 px-3 rounded-[4px] border bg-[var(--bg-primary)] border-[var(--border-main)] text-[var(--text-primary)] text-xs font-mono focus:border-blue-500/50 outline-none transition-all shadow-sm"
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
                          className="w-full h-9 px-3 rounded-[4px] border bg-[var(--bg-primary)] border-[var(--border-main)] text-[var(--text-primary)] text-xs font-mono focus:border-blue-500/50 outline-none transition-all shadow-sm"
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
                          className="w-full h-9 px-3 rounded-[4px] border bg-[var(--bg-primary)] border-[var(--border-main)] text-[var(--text-primary)] text-xs font-mono focus:border-blue-500/50 outline-none transition-all shadow-sm"
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
                          className="w-full h-9 px-3 rounded-[4px] border bg-[var(--bg-primary)] border-[var(--border-main)] text-[var(--text-primary)] text-xs font-mono focus:border-blue-500/50 outline-none transition-all shadow-sm"
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
                            className="text-blue-500/60 hover:text-blue-500 transition-all p-1"
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
                          className="w-full h-9 px-3 rounded-[4px] border bg-[var(--bg-primary)] border-[var(--border-main)] text-[var(--text-primary)] text-xs font-mono focus:border-blue-500/50 outline-none transition-all shadow-sm"
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

              <div className="col-span-3 h-[52px] flex items-center justify-center border border-dashed border-[var(--border-main)] rounded-[4px] bg-emerald-500/5">
                <span className="text-[10px] text-[var(--text-secondary)] font-mono">
                  {t("cloudAutoScalingEnabled")}
                </span>
              </div>
              <div className="flex flex-col gap-3 pt-2">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleTestConnection(db.id)}
                    disabled={db.isTesting}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-[4px] border transition-all duration-300 font-bold text-xs bg-[var(--bg-primary)] border-[var(--border-main)] text-[var(--text-secondary)] hover:text-emerald-500 hover:border-emerald-500/30 group`}
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
                          className={`transition-all duration-300 ${!db.isTesting ? "group-hover:text-emerald-500 group-hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]" : ""}`}
                        />
                        {t("testDbConnection")}
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleSaveConfig(db.id)}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-[4px] border transition-all duration-300 font-bold text-xs bg-[var(--bg-primary)] border-[var(--border-main)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]`}
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
                    className={`flex flex-col items-center justify-center gap-1.5 py-4 rounded-[4px] border transition-all duration-300 font-bold text-[10px] uppercase tracking-wider relative overflow-hidden group ${
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
                        className={`transition-all duration-300 group-hover:drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]`}
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
                    className={`flex flex-col items-center justify-center gap-1.5 py-4 rounded-[4px] border transition-all duration-300 font-bold text-[10px] uppercase tracking-wider relative overflow-hidden group ${
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
                        className={`transition-all duration-300 group-hover:text-emerald-500 group-hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]`}
                      />
                    )}
                    <span className="text-center px-1">
                      {t("migrateAdditive") || "Sync"}
                    </span>
                  </button>

                  <div className="relative group/backup">
                    <button
                      onClick={() => {
                        const menu = document.getElementById(
                          `backup-menu-${db.id}`,
                        );
                        if (menu) menu.classList.toggle("hidden");
                      }}
                      className={`w-full h-full flex flex-col items-center justify-center gap-1.5 py-4 rounded-[4px] border transition-all duration-300 font-bold text-[10px] uppercase tracking-wider bg-[var(--bg-primary)] border-[var(--border-main)] text-blue-500 hover:border-blue-500/50 hover:bg-blue-500/5`}
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
                      id={`backup-menu-${db.id}`}
                      className="hidden absolute bottom-[110%] left-0 right-0 bg-[var(--bg-secondary)] border border-[var(--border-main)] rounded-[4px] shadow-2xl z-50 p-2 animate-in fade-in slide-in-from-bottom-2 duration-300"
                    >
                      <button
                        onClick={() => {
                          handleExportBackup(db.id);
                          document
                            .getElementById(`backup-menu-${db.id}`)
                            ?.classList.add("hidden");
                        }}
                        className="w-full flex items-center gap-3 p-3 rounded-[4px] hover:bg-blue-500/10 text-blue-500 transition-all text-xs font-bold"
                      >
                        <Download size={16} />{" "}
                        {dir === "rtl"
                          ? "تصدير نسخة (Export)"
                          : "Export Backup"}
                      </button>
                      <div className="h-px bg-[var(--border-main)] my-1" />
                      <label className="w-full flex items-center gap-3 p-3 rounded-[4px] hover:bg-emerald-500/10 text-emerald-500 transition-all text-xs font-bold cursor-pointer">
                        <Upload size={16} />
                        {dir === "rtl"
                          ? "استيراد نسخة (Import)"
                          : "Import Backup"}
                        <input
                          type="file"
                          accept=".json"
                          className="hidden"
                          onChange={(e) => handleImportBackup(db.id, e)}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleActivateDatabase(db.id, db.is_active)}
                  className={`w-full py-4 rounded-[4px] border transition-all duration-500 font-bold text-xs flex items-center justify-center gap-3 relative overflow-hidden group ${
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
              fallback1_provider: toolToSave.fallback1Provider,
              fallback1_model: toolToSave.fallback1Model,
              fallback2_provider: toolToSave.fallback2Provider,
              fallback2_model: toolToSave.fallback2Model,
              fallback3_provider: toolToSave.fallback3Provider,
              fallback3_model: toolToSave.fallback3Model,
              is_active: toolToSave.isActive,
              cost_per_usage: toolToSave.costPerUsage,
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
          className={`fixed bottom-6 ${dir === "rtl" ? "left-6" : "right-6"} z-50 flex items-center gap-3 px-6 py-4 rounded-[4px] shadow-2xl transition-all duration-300 animate-in slide-in-from-bottom-5 ${
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
                className={`p-6 rounded-[4px] border transition-all duration-300 relative overflow-hidden bg-[var(--bg-secondary)] border-[var(--border-main)] hover:border-emerald-500/20 hover:shadow-lg group/tool`}
              >
                <div className="absolute -top-6 -right-6 opacity-[0.03] dark:opacity-[0.02] pointer-events-none group-hover/tool:scale-110 transition-transform duration-700">
                  <Icon size={140} />
                </div>

                <div className="flex items-center justify-between mb-8 relative z-10">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-1.5 rounded-[4px] bg-emerald-500 text-white shadow-[0_4px_10px_rgba(16,185,129,0.3)]`}
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
                      className={`w-11 h-6 rounded-full p-1 transition-all duration-500 ${tool.isActive ? "bg-emerald-500/20 border border-emerald-500/30" : "bg-gray-800/50 border border-gray-700"}`}
                    >
                      <motion.div
                        animate={{
                          x: tool.isActive ? (dir === "rtl" ? -20 : 20) : 0,
                        }}
                        className={`w-4 h-4 rounded-full shadow-md ${tool.isActive ? "bg-emerald-500" : "bg-gray-500"}`}
                      />
                    </button>
                    <button
                      onClick={() => handleSave(tool.id)}
                      disabled={tool.isSaving}
                      className={`p-2 rounded-[4px] transition-all ${tool.isSaving ? "text-emerald-500" : "text-gray-400 hover:text-emerald-500 hover:bg-emerald-500/10"}`}
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
                  <div className="space-y-2.5 p-4 rounded-[4px] bg-[var(--bg-primary)]/50 border border-[var(--border-main)]/50 shadow-inner">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1 block">
                      {t("costPoints")}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={tool.costPerUsage || 0}
                        onChange={(e) =>
                          handleChange(tool.id, "costPerUsage", e.target.value)
                        }
                        className={`w-full h-11 px-9 rounded-[4px] border text-sm font-black focus:outline-none transition-all bg-[var(--bg-primary)] border-[var(--border-main)] text-emerald-500 focus:ring-1 focus:ring-emerald-500/30`}
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
                          className={`w-full h-10 px-3 rounded-[4px] border text-[11px] font-bold focus:outline-none bg-[var(--bg-primary)] border-[var(--border-main)] text-[var(--text-primary)]`}
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
                          className={`w-full h-10 px-3 rounded-[4px] border text-[11px] font-bold focus:outline-none bg-[var(--bg-primary)] border-[var(--border-main)] text-[var(--text-primary)]`}
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
                            className="w-full h-9 px-2 rounded-[4px] border text-[10px] bg-[var(--bg-primary)] border-[var(--border-main)]"
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
                            className="w-full h-9 px-2 rounded-[4px] border text-[10px] bg-[var(--bg-primary)] border-[var(--border-main)]"
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
                          className="w-full h-9 px-2 rounded-[4px] border text-[10px] bg-[var(--bg-primary)] border-[var(--border-main)] text-[var(--text-primary)] focus:outline-none transition-all"
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
                          className={`w-full h-9 px-2 rounded-[4px] border text-[10px] bg-[var(--bg-primary)] border-[var(--border-main)] text-[var(--text-primary)] focus:outline-none transition-all ${tool.fallback2Model && !renderModelOptions(tool.fallback2Provider).some((opt: any) => opt.props.value === tool.fallback2Model) ? "border-red-500/50 text-red-400 font-bold" : ""}`}
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
                          className="w-full h-9 px-2 rounded-[4px] border text-[10px] bg-[var(--bg-primary)] border-[var(--border-main)] text-[var(--text-primary)] focus:outline-none transition-all"
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
                          className={`w-full h-9 px-2 rounded-[4px] border text-[10px] bg-[var(--bg-primary)] border-[var(--border-main)] text-[var(--text-primary)] focus:outline-none transition-all ${tool.fallback3Model && !renderModelOptions(tool.fallback3Provider).some((opt: any) => opt.props.value === tool.fallback3Model) ? "border-red-500/50 text-red-400 font-bold" : ""}`}
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
  });

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
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

  const fetchStripeConfig = async () => {
    try {
      const res = await fetch("/api/settings");
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

  useEffect(() => {
    if (activeTab === "payment_gateways") {
      fetchStripeConfig();
    }
  }, [activeTab]);

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
          className={`fixed bottom-6 ${dir === "rtl" ? "left-6" : "right-6"} z-50 flex items-center gap-3 px-6 py-4 rounded-[4px] shadow-2xl transition-all duration-300 animate-in slide-in-from-bottom-5 ${
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
        className={`flex space-x-2 rtl:space-x-reverse border-b ${theme === "dark" ? "border-gray-800/60" : "border-gray-200"} pb-px overflow-x-auto custom-scrollbar`}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-300 border-b-2 whitespace-nowrap ${
                isActive
                  ? "border-emerald-500 text-emerald-500"
                  : `border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 ${theme === "dark" ? "hover:border-gray-700" : "hover:border-gray-300"}`
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
                className={`flex items-center gap-2 px-4 py-2 rounded-[4px] border transition-all duration-300 ${
                  theme === "dark"
                    ? "bg-[#1a1a1c] border-gray-800 text-gray-400 hover:text-emerald-500 hover:border-emerald-500/30"
                    : "bg-white border-gray-200 text-gray-500 hover:text-emerald-600 hover:border-emerald-200"
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
                  className={`w-full max-w-xs h-12 px-4 rounded-[4px] border ${theme === "dark" ? "bg-[#0f0f11] border-gray-800/80 text-white" : "bg-gray-50 border-gray-200 text-gray-900"} text-center text-lg font-medium focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all`}
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
                  className={`w-full max-w-xs h-12 px-4 rounded-[4px] border ${theme === "dark" ? "bg-[#0f0f11] border-gray-800/80 text-white" : "bg-gray-50 border-gray-200 text-gray-900"} text-center text-lg font-medium focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all`}
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
                  className={`w-full max-w-xs h-12 px-4 rounded-[4px] border ${theme === "dark" ? "bg-[#0f0f11] border-gray-800/80 text-white" : "bg-gray-50 border-gray-200 text-gray-900"} text-center text-lg font-medium focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all`}
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
                  className={`w-full max-w-xs h-12 px-4 rounded-[4px] border ${theme === "dark" ? "bg-[#0f0f11] border-gray-800/80 text-white" : "bg-gray-50 border-gray-200 text-gray-900"} text-center text-lg font-medium focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all`}
                />
                <p className="text-xs text-gray-500 mt-3 text-center max-w-xs">
                  {language === "ar"
                    ? "أقل مبلغ يمكن للمستخدم إيداعه."
                    : "Minimum amount a user can deposit."}
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
                  className={`w-full max-w-xs h-12 px-4 rounded-[4px] border ${theme === "dark" ? "bg-[#0f0f11] border-gray-800/80 text-white" : "bg-gray-50 border-gray-200 text-gray-900"} text-center text-lg font-medium focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all`}
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
                  className={`w-full max-w-xs h-12 px-4 rounded-[4px] border ${theme === "dark" ? "bg-[#0f0f11] border-gray-800/80 text-white" : "bg-gray-50 border-gray-200 text-gray-900"} text-center text-lg font-medium focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all`}
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
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <DigitalFinancialRadarView theme={theme} t={t} />
          </div>
        )}

        {activeTab === "payment_gateways" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div
              className={`p-6 rounded-[4px] border ${theme === "dark" ? "bg-[#111111] border-gray-800/60" : "bg-white border-gray-200"}`}
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-[4px] bg-[#635BFF]/10 text-[#635BFF]">
                    <CreditCard size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{t("stripeConfig")}</h3>
                    <p className="text-xs text-gray-500">{t("stripeDesc")}</p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1.5">
                  <span
                    className={`px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5 ${
                      stripeConfig.stripe_status === "active"
                        ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/30"
                        : "bg-amber-500/10 text-amber-500 border border-amber-500/30"
                    }`}
                  >
                    {stripeConfig.stripe_status === "active" ? (
                      <>
                        <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                        {dir === "rtl"
                          ? "نشط / تم التحقق"
                          : "Active / Verified"}
                      </>
                    ) : (
                      <>
                        <div className="w-1 h-1 rounded-full bg-amber-500" />
                        {dir === "rtl" ? "يحتاج تحقق" : "Needs Verification"}
                      </>
                    )}
                  </span>
                  {stripeConfig.stripe_last_verified_at && (
                    <span className="text-[10px] text-gray-500 font-mono">
                      {new Date(
                        stripeConfig.stripe_last_verified_at,
                      ).toLocaleDateString(
                        language === "ar" ? "ar-EG" : "en-US",
                      )}
                    </span>
                  )}
                </div>
              </div>

              <div
                className={`mb-6 p-4 rounded-[4px] border ${theme === "dark" ? "bg-[#1a1a1c] border-gray-800" : "bg-gray-50 border-gray-100"} flex items-center justify-between`}
              >
                <div>
                  <h4 className="text-sm font-bold mb-1">{t("environment")}</h4>
                  <p className="text-xs text-gray-500">
                    {stripeConfig.isLiveMode
                      ? dir === "rtl"
                        ? "الإنتاج (بيانات حقيقية)"
                        : "Production (Live Data)"
                      : dir === "rtl"
                        ? "الاختبار (Sandbox)"
                        : "Testing (Sandbox)"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-widest ${!stripeConfig.isLiveMode ? "text-amber-500" : "text-gray-500"}`}
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
                    className={`relative w-12 h-6 rounded-full transition-all duration-300 border ${
                      stripeConfig.isLiveMode
                        ? "bg-emerald-500/10 border-emerald-500/40"
                        : "bg-gray-200 dark:bg-gray-800 border-transparent"
                    }`}
                  >
                    <div
                      className={`absolute top-1 w-4 h-4 rounded-full shadow-lg transition-all duration-300 ${
                        stripeConfig.isLiveMode
                          ? "bg-emerald-500"
                          : "bg-gray-400"
                      } ${
                        dir === "rtl"
                          ? stripeConfig.isLiveMode
                            ? "right-7"
                            : "right-1"
                          : stripeConfig.isLiveMode
                            ? "left-7"
                            : "left-1"
                      }`}
                    />
                  </button>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-widest ${stripeConfig.isLiveMode ? "text-emerald-500" : "text-gray-500"}`}
                  >
                    LIVE
                  </span>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1.5">
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
                    className={`w-full px-4 py-2.5 rounded-[4px] border focus:outline-none focus:ring-2 focus:ring-[#635BFF]/30 ${theme === "dark" ? "bg-[#1a1a1c] border-gray-800 text-white placeholder:text-gray-700" : "bg-white border-gray-200 placeholder:text-gray-300"}`}
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1.5">
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
                    className={`w-full px-4 py-2.5 rounded-[4px] border focus:outline-none focus:ring-2 focus:ring-[#635BFF]/30 ${theme === "dark" ? "bg-[#1a1a1c] border-gray-800 text-white placeholder:text-gray-700" : "bg-white border-gray-200 placeholder:text-gray-300"}`}
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1.5">
                    {t("webhookSecret")}
                  </label>
                  <div className="relative">
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
                      className={`w-full px-4 py-2.5 rounded-[4px] border focus:outline-none focus:ring-2 focus:ring-[#635BFF]/30 ${theme === "dark" ? "bg-[#1a1a1c] border-gray-800 text-white placeholder:text-gray-700" : "bg-white border-gray-200 placeholder:text-gray-300"}`}
                      dir="ltr"
                    />
                  </div>
                  <p className="text-[10px] text-gray-500 mt-2 flex items-center gap-1">
                    <Info size={12} className="text-gray-400" />
                    {dir === "rtl"
                      ? "مطلوب للتحديثات التلقائية للخطط وتجديد الاشتراكات."
                      : "Required for automatic plan updates and subscription renewals."}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <button
                    onClick={handleSaveStripeConfig}
                    disabled={isSaving}
                    className="flex-1 bg-[#635BFF] hover:bg-[#5249e5] text-white py-3 rounded-[4px] font-bold transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSaving ? (
                      <RefreshCw size={18} className="animate-spin" />
                    ) : (
                      <Save size={18} />
                    )}
                    {t("saveStripeConfig")}
                  </button>

                  <button
                    onClick={handleVerifyStripeConnection}
                    disabled={isSaving || isVerifyingStripe}
                    className={`px-6 py-3 rounded-[4px] font-bold transition-all flex items-center justify-center gap-2 ${
                      theme === "dark"
                        ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20"
                        : "bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100"
                    } disabled:opacity-50`}
                  >
                    {isVerifyingStripe ? (
                      <RefreshCw size={18} className="animate-spin" />
                    ) : (
                      <Zap size={18} />
                    )}
                    {dir === "rtl" ? "تحقق من المزامنة" : "Verify Sync"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
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
  "storage_mb",
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

      // Ensure legal_analysis exists if not already present
      if (!savedLimits["legal_analysis"]) {
        savedLimits["legal_analysis"] = 5; // Default fallback
      }

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
            className={`fixed bottom-6 ${dir === "rtl" ? "left-6" : "right-6"} z-[1000] flex items-center gap-3 px-6 py-4 rounded-[4px] shadow-2xl transition-all duration-300 animate-in slide-in-from-bottom-5 ${
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
            className={`p-6 rounded-[4px] border ${theme === "dark" ? "border-gray-800/60 bg-[#111111]" : "border-gray-200 bg-white"} transition-all duration-300 hover:border-gray-700 flex flex-col relative overflow-hidden`}
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

            <div className="flex gap-3">
              <button
                onClick={() => handleOpenModal(plan)}
                className={`flex-1 py-2.5 rounded-[4px] border transition-all font-medium text-sm flex items-center justify-center gap-2 ${
                  theme === "dark"
                    ? "border-gray-800 bg-[#1a1a1c] hover:bg-gray-800 text-gray-300"
                    : "border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-600"
                }`}
              >
                <Settings2 size={16} /> {t("edit")}
              </button>
              <button
                onClick={() => handleDeletePlan(plan.id)}
                className={`px-4 py-2.5 rounded-[4px] border transition-all flex items-center justify-center ${
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
              className={`w-full max-w-4xl mt-[80px] mb-8 overflow-y-auto custom-scrollbar rounded-[4px] border shadow-2xl ${theme === "dark" ? "bg-[#161618] border-gray-800/60" : "bg-white border-gray-200"}`}
            >
              {/* Modal Header */}
              <div
                className={`sticky top-0 z-[1100] flex items-center justify-between p-6 border-b ${theme === "dark" ? "border-gray-800/60 bg-[#161618]/95" : "border-gray-200 bg-white/95"} backdrop-blur-md`}
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
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest bg-gray-500/10 px-2 py-0.5 rounded-md border border-gray-500/10">
                      ID: {editingPlan.id}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleSavePlan}
                    disabled={isSaving}
                    className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2 rounded-[4px] transition-all duration-300 font-bold text-sm shadow-[0_5px_15px_rgba(16,185,129,0.3)] disabled:opacity-50"
                  >
                    {isSaving ? (
                      <RefreshCw className="animate-spin" size={18} />
                    ) : (
                      <Save size={18} />
                    )}
                    {t("saveSettings") || "Save"}
                  </button>
                  <div className="w-px h-6 bg-gray-800/40" />
                  <button
                    onClick={handleCloseModal}
                    className={`p-2 rounded-[4px] transition-colors ${theme === "dark" ? "hover:bg-gray-800 text-gray-400 hover:text-white" : "hover:bg-gray-100 text-gray-500 hover:text-gray-900"}`}
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
                        className={`w-full h-11 px-3 rounded-[4px] border ${theme === "dark" ? "bg-[#0f0f11] border-gray-800/80 text-gray-300" : "bg-gray-50 border-gray-200 text-gray-900"} focus:outline-none focus:border-emerald-500/50 transition-colors appearance-none`}
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
                        className={`w-full h-11 px-3 rounded-[4px] border ${theme === "dark" ? "bg-[#0f0f11] border-gray-800/80 text-gray-300" : "bg-gray-50 border-gray-200 text-gray-900"} focus:outline-none focus:border-emerald-500/50 transition-colors text-center`}
                        dir="ltr"
                      />
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
                          className="w-4 h-4 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500 bg-gray-100 dark:bg-gray-800 dark:border-gray-700"
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
                          className="w-4 h-4 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500 bg-gray-100 dark:bg-gray-800 dark:border-gray-700"
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
                            className={`p-3 rounded-[4px] border ${theme === "dark" ? "bg-[#1a1a1c] border-gray-800/60" : "bg-gray-50 border-gray-200"} transition-all duration-300 hover:border-emerald-500/40 group relative overflow-hidden`}
                          >
                            <div className="flex justify-between items-center mb-2 px-1">
                              <span
                                className="text-[10px] font-bold text-gray-500 dark:text-gray-400 truncate group-hover:text-emerald-500 transition-colors uppercase tracking-widest"
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
                                key === "storage_mb"
                                  ? "grid grid-cols-1"
                                  : "grid grid-cols-2 gap-2"
                              }
                            >
                              {key !== "storage_mb" && (
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
                                      className={`w-full h-10 px-2 rounded-[4px] border text-center text-sm font-mono focus:outline-none transition-all ${
                                        isUnlimitedDaily
                                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500 font-bold text-xl"
                                          : theme === "dark"
                                            ? "bg-[#0f0f11] border-gray-800 text-gray-300"
                                            : "bg-white border-gray-200 text-gray-900"
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
                                    className={`w-full h-10 px-2 rounded-[4px] border text-center text-sm font-mono focus:outline-none transition-all ${
                                      isUnlimitedMonthly
                                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500 font-bold text-xl"
                                        : theme === "dark"
                                          ? "bg-[#0f0f11] border-gray-800 text-gray-300"
                                          : "bg-white border-gray-200 text-gray-900"
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
                          className={`w-full h-11 pl-8 pr-3 rounded-[4px] border ${theme === "dark" ? "bg-[#0f0f11] border-gray-800/80 text-gray-300" : "bg-gray-50 border-gray-200 text-gray-900"} focus:outline-none focus:border-emerald-500/50 transition-colors`}
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
                          className={`w-full h-11 pl-8 pr-3 rounded-[4px] border ${theme === "dark" ? "bg-[#0f0f11] border-gray-800/80 text-gray-300" : "bg-gray-50 border-gray-200 text-gray-900"} focus:outline-none focus:border-emerald-500/50 transition-colors`}
                          dir="ltr"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Save Button Placeholder replaced by Header Button */}
                  <div className="pt-4 border-t border-gray-800/20">
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest text-center">
                      Authorized Action: Plan Configuration
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
                        className={`w-full h-11 px-3 rounded-[4px] border ${theme === "dark" ? "bg-[#0f0f11] border-gray-800/80 text-gray-300" : "bg-gray-50 border-gray-200 text-gray-900"} focus:outline-none focus:border-emerald-500/50 transition-colors`}
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
                        className={`w-full h-11 px-3 rounded-[4px] border ${theme === "dark" ? "bg-[#0f0f11] border-gray-800/80 text-gray-300" : "bg-gray-50 border-gray-200 text-gray-900"} focus:outline-none focus:border-emerald-500/50 transition-colors`}
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
                        className={`w-full h-11 px-3 rounded-[4px] border ${theme === "dark" ? "bg-[#0f0f11] border-gray-800/80 text-gray-300" : "bg-gray-50 border-gray-200 text-gray-900"} focus:outline-none focus:border-emerald-500/50 transition-colors`}
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
                        className={`w-full h-11 px-3 rounded-[4px] border ${theme === "dark" ? "bg-[#0f0f11] border-gray-800/80 text-gray-300" : "bg-gray-50 border-gray-200 text-gray-900"} focus:outline-none focus:border-emerald-500/50 transition-colors`}
                        dir="rtl"
                      />
                    </div>
                  </div>

                  <div className="space-y-4 pt-2">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white px-1">
                      {t("planFeaturesEn")}
                    </h3>
                    {editingPlan.features.map((feature: any) => (
                      <div
                        key={`en-${feature.id}`}
                        className="flex items-center gap-2"
                      >
                        <button
                          onClick={() => removeFeature(feature.id)}
                          className="w-11 h-11 rounded-[4px] bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white flex items-center justify-center transition-colors shrink-0"
                        >
                          <Trash2 size={18} />
                        </button>
                        <input
                          type="text"
                          value={feature.textEn}
                          onChange={(e) =>
                            updateFeature(feature.id, "textEn", e.target.value)
                          }
                          className={`flex-1 h-11 px-3 rounded-[4px] border ${theme === "dark" ? "bg-[#0f0f11] border-gray-800/80 text-gray-300" : "bg-gray-50 border-gray-200 text-gray-900"} focus:outline-none focus:border-emerald-500/50 transition-colors`}
                          dir="ltr"
                        />
                      </div>
                    ))}
                    <button
                      onClick={addFeature}
                      className="w-full py-3 rounded-[4px] bg-rose-600 hover:bg-rose-700 text-white font-medium text-sm transition-all"
                    >
                      {t("addFeature")}
                    </button>

                    <h3 className="text-sm font-bold text-gray-900 dark:text-white px-1 mt-6">
                      {t("planFeaturesAr")}
                    </h3>
                    {editingPlan.features.map((feature: any) => (
                      <div
                        key={`ar-${feature.id}`}
                        className="flex items-center gap-2"
                      >
                        <button
                          onClick={() => removeFeature(feature.id)}
                          className="w-11 h-11 rounded-[4px] bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white flex items-center justify-center transition-colors shrink-0"
                        >
                          <Trash2 size={18} />
                        </button>
                        <input
                          type="text"
                          value={feature.textAr}
                          onChange={(e) =>
                            updateFeature(feature.id, "textAr", e.target.value)
                          }
                          className={`flex-1 h-11 px-3 rounded-[4px] border ${theme === "dark" ? "bg-[#0f0f11] border-gray-800/80 text-gray-300" : "bg-gray-50 border-gray-200 text-gray-900"} focus:outline-none focus:border-emerald-500/50 transition-colors`}
                          dir="rtl"
                        />
                      </div>
                    ))}
                    <button
                      onClick={addFeature}
                      className="w-full py-3 rounded-[4px] bg-rose-600 hover:bg-rose-700 text-white font-medium text-sm transition-all"
                    >
                      {t("addFeature")}
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
      const res = await fetch(`/api/admin/users/${userId}/role`, {
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
  ) => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/balance`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount, reason, type }),
      });
      if (res.ok) {
        const data = await res.json();
        showToast("Balance adjusted successfully", "success");
        setUsers((prev) =>
          prev.map((u) =>
            u.id.toString() === userId.toString()
              ? { ...u, balance: data.newBalance }
              : u,
          ),
        );
        if (selectedUser?.id?.toString() === userId.toString())
          setSelectedUser({ ...selectedUser, balance: data.newBalance });
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
      const res = await fetch(`/api/admin/users/${userId}/status`, {
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
          className={`fixed bottom-6 ${dir === "rtl" ? "left-6" : "right-6"} z-[100] flex items-center gap-3 px-6 py-4 rounded-[4px] shadow-2xl transition-all duration-300 animate-in slide-in-from-bottom-5 ${
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
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-center bg-[var(--bg-secondary)] p-4 rounded-[4px] border border-[var(--border-main)] shadow-sm relative overflow-hidden">
        <div className="absolute inset-0 bg-emerald-500/[0.01] pointer-events-none" />
        <div className={`relative w-full lg:w-[450px] flex items-center group`}>
          <div
            className={`absolute inset-y-0 ${dir === "rtl" ? "right-0 pr-4" : "left-0 pl-4"} flex items-center pointer-events-none transition-colors group-focus-within:text-emerald-500`}
          >
            <Search size={18} className="text-gray-400" />
          </div>
          <input
            type="text"
            placeholder={t("searchUsers")}
            value={searchQuery || ""}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full ${dir === "rtl" ? "pr-11 pl-4" : "pl-11 pr-4"} py-3 rounded-[4px] border focus:outline-none focus:ring-1 focus:ring-emerald-500/30 transition-all ${
              theme === "dark"
                ? "bg-[#0f0f11] border-gray-800 text-white placeholder-gray-600"
                : "bg-white border-gray-200 text-gray-900 placeholder-gray-400"
            }`}
          />
        </div>
        <div className="flex gap-3 w-full lg:w-auto">
          <div className="relative flex-1 lg:flex-none min-w-[140px]">
            <select
              value={statusFilter || "all"}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`w-full px-4 py-3 rounded-[4px] border appearance-none focus:outline-none focus:ring-1 focus:ring-emerald-500/30 font-bold text-xs ${theme === "dark" ? "bg-[#0f0f11] border-gray-800 text-gray-300" : "bg-white border-gray-200 shadow-sm"}`}
            >
              <option value="all">All Status</option>
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
              className={`w-full px-4 py-3 rounded-[4px] border appearance-none focus:outline-none focus:ring-1 focus:ring-emerald-500/30 font-bold text-xs ${theme === "dark" ? "bg-[#0f0f11] border-gray-800 text-gray-300" : "bg-white border-gray-200 shadow-sm"}`}
            >
              <option value="all">All Plans</option>
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

      <div className="overflow-x-auto custom-scrollbar rounded-[4px] border border-[var(--border-main)] bg-[var(--bg-secondary)] shadow-sm">
        <table className="w-full text-sm text-left rtl:text-right">
          <thead
            className={`text-[10px] uppercase font-black tracking-widest transition-all duration-[var(--theme-transition-duration)] ${theme === "dark" ? "bg-[var(--bg-surface)] text-gray-500" : "bg-gray-50 text-gray-400"}`}
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
                    className="group transition-all duration-300 hover:bg-gray-800/10"
                  >
                    <td
                      className="px-6 py-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative group/avatar">
                          <div className="w-11 h-11 rounded-[4px] bg-gray-200 dark:bg-gray-800 flex items-center justify-center shrink-0 overflow-hidden border border-[var(--border-main)] group-hover/avatar:border-emerald-500/50 transition-all">
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
                          <div className="font-black text-sm text-[var(--text-primary)] group-hover:text-emerald-500 transition-colors">
                            {user.name}
                          </div>
                          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">
                            {user.email}
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
                          className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-[4px] border appearance-none w-full text-center focus:outline-none transition-all cursor-pointer ${
                            user.role === "admin"
                              ? "text-purple-500 border-purple-500/30 bg-purple-500/5"
                              : user.role === "elite"
                                ? "text-amber-500 border-amber-500/30 bg-amber-500/5"
                                : user.role === "support"
                                  ? "text-emerald-500 border-emerald-500/30 bg-emerald-500/5"
                                  : "text-gray-500 border-gray-500/30 bg-gray-500/5"
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
                        className="px-3 py-1.5 rounded-[4px] text-[10px] font-black uppercase tracking-[0.1em] border flex items-center justify-center gap-2"
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
                        className={`px-3 py-1.5 rounded-[4px] text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 border ${
                          user.kyc_status === "verified"
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                            : user.kyc_status === "pending"
                              ? "bg-amber-500/10 text-amber-500 border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.1)]"
                              : user.kyc_status === "rejected"
                                ? "bg-red-500/10 text-red-500 border-red-500/20"
                                : "bg-gray-500/10 text-gray-500 border-gray-500/20"
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
                          className="w-9 h-9 flex items-center justify-center rounded-[4px] bg-gray-500/5 text-gray-400 hover:text-emerald-500 hover:bg-emerald-500/10 transition-all border border-transparent hover:border-emerald-500/20"
                          title={t("sendEmail")}
                        >
                          <Mail size={16} />
                        </button>
                        <button
                          onClick={() => handleViewHistory(user)}
                          className="w-9 h-9 flex items-center justify-center rounded-[4px] bg-gray-500/5 text-gray-400 hover:text-amber-500 hover:bg-amber-500/10 transition-all border border-transparent hover:border-amber-500/20"
                          title="Usage History"
                        >
                          <History size={16} />
                        </button>
                        <button
                          onClick={() => handleViewProfile(user)}
                          className="w-9 h-9 flex items-center justify-center rounded-[4px] bg-emerald-500/10 text-emerald-500 transition-all border border-emerald-500/30 hover:shadow-[0_0_15px_rgba(16,185,129,0.3)] group/btn"
                          title={t("viewProfile")}
                        >
                          <Eye
                            size={16}
                            className="group-hover/btn:scale-110 transition-transform"
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
                      No explorers found in this sector
                    </span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {isActivityModalOpen &&
        selectedUser &&
        createPortal(
          <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <div
              className={`relative w-full max-w-4xl max-h-[85vh] overflow-hidden rounded-[var(--radius)] shadow-2xl flex flex-col transition-all duration-[var(--theme-transition-duration)] bg-[var(--bg-base)] border border-[var(--border)] shadow-[var(--color-shadow)]`}
            >
              {/* Header */}
              <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-[4px] bg-amber-500/10 text-amber-500">
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
                  className="p-2 rounded-[4px] text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
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
                  <div className="min-w-full overflow-hidden border border-gray-100 dark:border-gray-800 rounded-[4px]">
                    <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
                      <thead
                        className={
                          theme === "dark" ? "bg-[var(--bg-surface)]" : "bg-gray-50"
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
                            className="group hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-all cursor-crosshair"
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
          <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div
              className={`relative w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-[var(--radius)] shadow-2xl flex flex-col transition-all duration-[var(--theme-transition-duration)] bg-[var(--bg-base)] border border-[var(--border)] shadow-[var(--color-shadow)]`}
            >
              <div className="p-8 border-b border-gray-800/20 flex items-center justify-between bg-gradient-to-br from-[var(--bg-secondary)] via-[var(--bg-secondary)] to-emerald-500/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none" />
                <div className="flex items-center gap-6 relative z-10">
                  <div
                    className={`w-16 h-16 rounded-[var(--radius)] flex items-center justify-center shadow-2xl border-2 overflow-hidden transition-all duration-[var(--theme-transition-duration)] group/avatar ${theme === "dark" ? "bg-[var(--bg-surface)] border-gray-800 hover:border-emerald-500/50" : "bg-gray-100 border-white hover:border-emerald-500/50"}`}
                  >
                    {selectedUser.avatar ? (
                      <img
                        src={selectedUser.avatar}
                        alt=""
                        className="w-full h-full object-cover group-hover/avatar:scale-110 transition-transform duration-700"
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
                  className={`p-3 rounded-[4px] transition-all duration-300 group/close ${theme === "dark" ? "hover:bg-gray-800 text-gray-500 hover:text-white" : "hover:bg-gray-100 text-gray-500 hover:text-gray-900"}`}
                >
                  <X
                    size={24}
                    className="group-hover/close:rotate-90 transition-transform duration-500"
                  />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div
                    className={`p-8 rounded-[4px] border flex flex-col h-full transition-all duration-500 hover:shadow-2xl hover:translate-y-[-4px] ${theme === "dark" ? "bg-[#161618] border-gray-800/60" : "bg-gray-50 border-gray-100 shadow-sm"}`}
                  >
                    <div className="flex items-center gap-3 mb-8">
                      <div className="p-2.5 rounded-[4px] bg-emerald-500/10 text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
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
                            className={`w-full h-11 px-4 rounded-[4px] border focus:outline-none focus:border-emerald-500/50 transition-all ${theme === "dark" ? "bg-[#0f0f11] border-gray-800 text-white" : "bg-white border-gray-200"}`}
                          >
                            <option value="user">{t("role_user")}</option>
                            <option value="support">{t("role_support")}</option>
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
                            className={`w-full h-11 px-4 rounded-[4px] border focus:outline-none focus:border-emerald-500/50 transition-all ${theme === "dark" ? "bg-[#0f0f11] border-gray-800 text-white" : "bg-white border-gray-200"}`}
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
                            className={`w-full h-20 p-3 rounded-[4px] border focus:outline-none focus:border-red-500/50 transition-all resize-none text-sm ${theme === "dark" ? "bg-[#0f0f11] border-gray-800 text-white" : "bg-white border-gray-200"}`}
                          />
                        </div>
                      )}

                      {/* Status & KYC Toggles */}
                      <div className="grid grid-cols-2 gap-4">
                        <div
                          className={`p-3 rounded-[4px] border flex flex-col gap-2 ${theme === "dark" ? "bg-[#0f0f11] border-gray-800" : "bg-white border-gray-200"}`}
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
                              className={`w-8 h-4 rounded-full transition-all relative ${(selectedUser.status || selectedUser.subscription_status) === "active" ? "bg-emerald-500" : "bg-gray-600"}`}
                            >
                              <div
                                className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${(selectedUser.status || selectedUser.subscription_status) === "active" ? (dir === "rtl" ? "left-0.5" : "right-0.5") : dir === "rtl" ? "right-0.5" : "left-0.5"}`}
                              ></div>
                            </button>
                          </div>
                        </div>
                        <div
                          className={`p-3 rounded-[4px] border flex flex-col gap-2 ${theme === "dark" ? "bg-[#0f0f11] border-gray-800" : "bg-white border-gray-200"}`}
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
                              className={`w-8 h-4 rounded-full transition-all relative ${selectedUser.kyc_required ? "bg-amber-500" : "bg-gray-600"} ${selectedUser.kyc_status === "verified" ? "opacity-50 cursor-not-allowed" : ""}`}
                            >
                              <div
                                className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${selectedUser.kyc_required ? (dir === "rtl" ? "left-0.5" : "right-0.5") : dir === "rtl" ? "right-0.5" : "left-0.5"}`}
                              ></div>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* KYC Selfie Review Section */}
                      {(selectedUser.kyc_status === "pending" ||
                        selectedUser.kyc_selfie) && (
                        <div
                          className={`p-4 rounded-[4px] border ${theme === "dark" ? "bg-[#0f0f11] border-gray-800" : "bg-white border-gray-200"}`}
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
                              <div className="relative rounded-[4px] overflow-hidden border border-gray-800/60 aspect-video bg-black/20">
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
                                className="w-full py-2.5 rounded-[4px] border border-red-500/30 text-red-500 text-xs font-bold hover:bg-red-500/10 transition-all flex items-center justify-center gap-2"
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
                      className="w-full mt-6 py-3 rounded-[4px] bg-emerald-500 text-white font-bold text-sm transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_20px_rgba(16,185,129,0.5)] flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
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
                    className={`p-8 rounded-[4px] border flex flex-col h-full transition-all duration-500 hover:shadow-2xl hover:translate-y-[-4px] ${theme === "dark" ? "bg-[#161618] border-gray-800/60" : "bg-gray-50 border-gray-100 shadow-sm"}`}
                  >
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-[4px] bg-amber-500/10 text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.15)]">
                          <Landmark size={20} />
                        </div>
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                          {dir === "rtl" ? "قسم المحفظة" : "Ledger Section"}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 bg-[var(--bg-secondary)] p-1 rounded-[4px] border border-[var(--border-main)] shadow-inner">
                        <button
                          onClick={() => setLedgerUnit("PTS")}
                          className={`px-4 py-1.5 rounded-[4px] text-[9px] font-black tracking-widest transition-all ${ledgerUnit === "PTS" ? "bg-amber-500 text-white shadow-xl shadow-amber-500/30" : "text-gray-500 hover:text-gray-300"}`}
                        >
                          PTS
                        </button>
                        <button
                          onClick={() => setLedgerUnit("USD")}
                          className={`px-4 py-1.5 rounded-[4px] text-[9px] font-black tracking-widest transition-all ${ledgerUnit === "USD" ? "bg-emerald-500 text-white shadow-xl shadow-emerald-500/30" : "text-gray-500 hover:text-gray-300"}`}
                        >
                          USD
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 space-y-4">
                      {/* Current Balance Display */}
                      <div className="grid grid-cols-2 gap-3">
                        <div
                          className={`p-3 rounded-[4px] border ${theme === "dark" ? "bg-[#0f0f11] border-gray-800" : "bg-white border-gray-200"}`}
                        >
                          <p className="text-[10px] font-bold text-gray-500 mb-1">
                            {dir === "rtl" ? "النقاط" : "Points"}
                          </p>
                          <p className="text-lg font-bold text-amber-500">
                            {Math.floor(
                              selectedUser.balance || 0,
                            ).toLocaleString()}
                          </p>
                        </div>
                        <div
                          className={`p-3 rounded-[4px] border ${theme === "dark" ? "bg-[#0f0f11] border-gray-800" : "bg-white border-gray-200"}`}
                        >
                          <p className="text-[10px] font-bold text-gray-500 mb-1">
                            {dir === "rtl" ? "القيمة بالدولار" : "USD Value"}
                          </p>
                          <p className="text-lg font-bold text-emerald-500">
                            $
                            {(
                              parseFloat(selectedUser.balance || 0) * 0.001
                            ).toFixed(2)}
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
                              className={`w-full h-11 px-4 rounded-[4px] border focus:outline-none focus:border-emerald-500 transition-colors ${theme === "dark" ? "bg-[#0f0f11] border-gray-800 text-white" : "bg-white border-gray-200"}`}
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
                            className={`w-32 h-11 px-3 rounded-[4px] border focus:outline-none focus:border-emerald-500 transition-colors ${theme === "dark" ? "bg-[#0f0f11] border-gray-800 text-white" : "bg-white border-gray-200"}`}
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
                          className={`w-full h-11 px-4 rounded-[4px] border focus:outline-none focus:border-emerald-500 transition-colors ${theme === "dark" ? "bg-[#0f0f11] border-gray-800 text-white" : "bg-white border-gray-200"}`}
                        />
                      </div>
                    </div>

                    <button
                      onClick={async () => {
                        let amount = parseFloat(ledgerAmount);

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

                        if (ledgerUnit === "USD") {
                          amount = amount / 0.001;
                        }

                        if (
                          ledgerAction === "deduct" &&
                          amount > (selectedUser.balance || 0)
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
                          const finalAmount = amount;
                          await handleUpdateBalance(
                            selectedUser.id,
                            finalAmount,
                            ledgerReason,
                            ledgerAction,
                          );
                          setLedgerAmount("");
                          setLedgerReason("");
                        }
                      }}
                      disabled={isUpdating}
                      className={`w-full mt-6 py-3 rounded-[4px] font-bold text-sm transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed ${
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
                    className={`p-8 rounded-[4px] border flex flex-col h-full transition-all duration-500 hover:shadow-2xl hover:translate-y-[-4px] ${theme === "dark" ? "bg-[#161618] border-gray-800/60" : "bg-gray-50 border-gray-100 shadow-sm"}`}
                  >
                    <div className="flex items-center gap-3 mb-8">
                      <div className="p-2.5 rounded-[4px] bg-blue-500/10 text-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.15)]">
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
                      <div className="flex items-center gap-4 p-4 rounded-[4px] border border-gray-800/50 bg-gray-800/20 relative overflow-hidden">
                        <div
                          className="absolute top-0 left-0 w-1 h-full"
                          style={{
                            backgroundColor: getPlanDetails(
                              selectedUser.plan_id,
                            ).color,
                          }}
                        ></div>
                        <div
                          className="w-12 h-12 rounded-[4px] flex items-center justify-center shrink-0"
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
                          className={`w-full h-11 px-4 rounded-[4px] border focus:outline-none focus:border-emerald-500/50 transition-all ${theme === "dark" ? "bg-[#0f0f11] border-gray-800 text-white" : "bg-white border-gray-200"}`}
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
                      className="w-full mt-6 py-3 rounded-[4px] bg-blue-600 text-white font-bold text-sm transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)] hover:shadow-[0_0_20px_rgba(37,99,235,0.5)] flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
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
                    className={`p-8 rounded-[4px] border flex flex-col h-full transition-all duration-500 hover:shadow-2xl hover:translate-y-[-4px] ${theme === "dark" ? "bg-[#161618] border-gray-800/60" : "bg-gray-50 border-gray-100 shadow-sm"}`}
                  >
                    <div className="flex items-center gap-3 mb-8">
                      <div className="p-2.5 rounded-[4px] bg-pink-500/10 text-pink-500 shadow-[0_0_15px_rgba(219,39,119,0.15)]">
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
                          className={`w-full h-24 p-3 rounded-[4px] border focus:outline-none focus:border-pink-500/50 transition-all resize-none text-sm ${theme === "dark" ? "bg-[#0f0f11] border-gray-800 text-white" : "bg-white border-gray-200"}`}
                        />
                      </div>

                      {/* Quick Actions */}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleSendDirectEmail(selectedUser.id)}
                          disabled={isUpdating}
                          className={`flex items-center gap-2 p-3 rounded-[4px] border text-[10px] font-bold transition-all disabled:opacity-50 ${theme === "dark" ? "bg-[#0f0f11] border-gray-800 hover:border-pink-500/30" : "bg-white border-gray-200 hover:border-pink-500/30"}`}
                        >
                          <Mail size={14} className="text-pink-500" />
                          {dir === "rtl" ? "بريد مباشر" : "Email"}
                        </button>
                        <button
                          onClick={() =>
                            handleSendManualNotification(selectedUser.id)
                          }
                          disabled={isUpdating}
                          className={`flex items-center gap-2 p-3 rounded-[4px] border text-[10px] font-bold transition-all disabled:opacity-50 ${theme === "dark" ? "bg-[#0f0f11] border-gray-800 hover:border-emerald-500/30" : "bg-white border-gray-200 hover:border-emerald-500/30"}`}
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
                      className="w-full mt-6 py-3 rounded-[4px] bg-pink-600 text-white font-bold text-sm transition-all shadow-[0_0_15px_rgba(219,39,119,0.3)] hover:shadow-[0_0_20px_rgba(219,39,119,0.5)] flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
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

                  <div
                    className={`p-8 rounded-[3rem] border flex flex-col h-full lg:col-span-2 transition-all duration-700 hover:shadow-3xl hover:translate-y-[-6px] relative overflow-hidden ${theme === "dark" ? "bg-[#161618] border-emerald-500/10 focus-within:border-emerald-500/30" : "bg-gray-50 border-gray-100 shadow-sm"}`}
                  >
                    <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/[0.03] blur-[120px] rounded-full pointer-events-none" />
                    <div className="flex items-center justify-between mb-8 relative z-10">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-[4px] bg-emerald-500/10 text-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                          <Activity size={20} />
                        </div>
                        <h3 className="text-[12px] font-black uppercase tracking-[0.3em] text-gray-400">
                          {t("consumptionRadar")}
                        </h3>
                      </div>
                      {isLoadingUsage && (
                        <RefreshCw
                          size={16}
                          className="animate-spin text-emerald-500"
                        />
                      )}
                    </div>

                    {!selectedUserUsage ? (
                      <div className="flex-1 flex flex-col items-center justify-center py-12 text-gray-500 italic text-sm">
                        <Zap size={32} className="mb-3 opacity-20" />
                        {dir === "rtl"
                          ? "جاري جلب بيانات الاستهلاك..."
                          : "Fetching consumption data..."}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {ALL_TOOLS.map((toolId) => {
                          const limits =
                            getPlanDetails(selectedUser.plan_id).limits || {};
                          const limit = limits[toolId] || {
                            daily: 0,
                            monthly: 0,
                          };
                          const toolKey = toolId;
                          const usage = selectedUserUsage[toolKey] || {
                            daily: 0,
                            monthly: 0,
                          };
                          const dailyLimit =
                            limit?.daily ||
                            (typeof limit === "number" ? limit : 0);
                          const monthlyLimit =
                            limit?.monthly ||
                            (typeof limit === "number" ? limit * 30 : 0);

                          const dailyPercent =
                            dailyLimit > 0
                              ? Math.min(100, (usage.daily / dailyLimit) * 100)
                              : 0;
                          const monthlyPercent =
                            monthlyLimit > 0
                              ? Math.min(
                                  100,
                                  (usage.monthly / monthlyLimit) * 100,
                                )
                              : 0;

                          return (
                            <div
                              key={toolKey}
                              className={`p-4 rounded-[4px] border ${theme === "dark" ? "bg-[#0f0f11] border-gray-800" : "bg-white border-gray-200"} transition-all hover:border-emerald-500/30 group`}
                            >
                              <div className="flex items-center justify-between mb-3 px-1">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest group-hover:text-emerald-500 transition-colors">
                                  {t(toolKey)}
                                </span>
                                <Zap
                                  size={10}
                                  className={
                                    dailyPercent > 80
                                      ? "text-amber-500 animate-pulse"
                                      : "text-gray-600"
                                  }
                                />
                              </div>

                              <div className="space-y-3">
                                {/* Daily Bar */}
                                <div className="space-y-1">
                                  <div className="flex justify-between text-[8px] font-bold uppercase">
                                    <span className="text-gray-500">
                                      {t("daily")}
                                    </span>
                                    <span
                                      className={
                                        dailyPercent > 90
                                          ? "text-red-500"
                                          : "text-emerald-500"
                                      }
                                    >
                                      {String(
                                        typeof usage.daily === "number"
                                          ? usage.daily
                                          : 0,
                                      )}{" "}
                                      / {String(Number(dailyLimit))}
                                    </span>
                                  </div>
                                  <div className="h-1 w-full bg-gray-800/40 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all duration-1000 ${dailyPercent > 90 ? "bg-red-500" : "bg-emerald-500"}`}
                                      style={{ width: `${dailyPercent}%` }}
                                    />
                                  </div>
                                </div>

                                {/* Monthly Bar */}
                                <div className="space-y-1">
                                  <div className="flex justify-between text-[8px] font-bold uppercase">
                                    <span className="text-gray-500">
                                      {t("monthly")}
                                    </span>
                                    <span
                                      className={
                                        monthlyPercent > 90
                                          ? "text-red-500"
                                          : "text-blue-500"
                                      }
                                    >
                                      {String(
                                        typeof usage.monthly === "number"
                                          ? usage.monthly
                                          : 0,
                                      )}{" "}
                                      / {String(Number(monthlyLimit))}
                                    </span>
                                  </div>
                                  <div className="h-1 w-full bg-gray-800/40 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all duration-1000 ${monthlyPercent > 90 ? "bg-red-500" : "bg-blue-500"}`}
                                      style={{ width: `${monthlyPercent}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-800/30 flex justify-center bg-gray-800/5">
                <button
                  onClick={() => setIsProfileModalOpen(false)}
                  className={`px-12 py-3.5 rounded-[4px] font-bold transition-all duration-300 flex items-center gap-2 group ${
                    theme === "dark"
                      ? "bg-[#1a1a1c] text-gray-400 hover:text-white border border-gray-800 hover:border-gray-700"
                      : "bg-gray-50 text-gray-500 hover:text-gray-900 border border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  <X
                    size={20}
                    className="transition-all duration-300 group-hover:text-emerald-500 group-hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]"
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

  // const { token, language, siteSettings } = useAppContext(); // Removed as it was moved up

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

  // Fetch Campaigns removed

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {status.type !== "none" && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`p-4 rounded-[4px] border flex items-center gap-3 shadow-lg ${
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

      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-800/60 pb-4">
        <button
          onClick={() => setActiveTab("settings")}
          className={`px-6 py-2.5 rounded-[4px] font-medium transition-all duration-300 flex items-center gap-2 ${
            activeTab === "settings"
              ? "bg-emerald-500/10 text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]"
              : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800/50"
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
          className={`px-6 py-2.5 rounded-[4px] font-medium transition-all duration-300 flex items-center gap-2 ${
            activeTab === "templates"
              ? "bg-emerald-500/10 text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]"
              : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800/50"
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
              className={`p-6 md:p-8 rounded-[4px] border ${theme === "dark" ? "bg-[#111111] border-gray-800/60" : "bg-gray-50 border-gray-100"}`}
            >
              <div className="flex items-center justify-between gap-3 mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-[4px] bg-emerald-500/10 text-emerald-500">
                    <Server size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{t("smtpSettings")}</h2>
                    <p className="text-sm text-gray-500">{t("smtpDesc")}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span
                    className={`px-3 py-1 rounded-[4px] text-xs font-bold flex items-center gap-1.5 ${
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

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    {t("mailerType")}
                  </label>
                  <select
                    value={settings.mailer_type || "smtp"}
                    onChange={(e) =>
                      setSettings({ ...settings, mailer_type: e.target.value })
                    }
                    className={`w-full px-4 py-3 rounded-[4px] border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all ${theme === "dark" ? "bg-[#1a1a1c] border-gray-800 text-white" : "bg-white border-gray-200"}`}
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
                          className={`w-full px-4 py-3 rounded-[4px] border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-left ${theme === "dark" ? "bg-[#1a1a1c] border-gray-800 text-white" : "bg-white border-gray-200"}`}
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
                          className={`w-full px-4 py-3 rounded-[4px] border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-left ${theme === "dark" ? "bg-[#1a1a1c] border-gray-800 text-white" : "bg-white border-gray-200"}`}
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
                          className={`w-full px-4 py-3 rounded-[4px] border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all ${theme === "dark" ? "bg-[#1a1a1c] border-gray-800 text-white" : "bg-white border-gray-200"}`}
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
                          className={`w-full px-4 py-3 rounded-[4px] border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-left ${theme === "dark" ? "bg-[#1a1a1c] border-gray-800 text-white" : "bg-white border-gray-200"}`}
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
                        className={`w-full px-4 py-3 rounded-[4px] border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-left ${theme === "dark" ? "bg-[#1a1a1c] border-gray-800 text-white" : "bg-white border-gray-200"}`}
                        dir="ltr"
                      />
                    </div>
                  </>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-800/60">
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
                      className={`w-full px-4 py-3 rounded-[4px] border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all ${theme === "dark" ? "bg-[#1a1a1c] border-gray-800 text-white" : "bg-white border-gray-200"}`}
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
                      className={`w-full px-4 py-3 rounded-[4px] border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-left ${theme === "dark" ? "bg-[#1a1a1c] border-gray-800 text-white" : "bg-white border-gray-200"}`}
                      dir="ltr"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-6">
                  <button
                    onClick={handleSaveSettings}
                    disabled={isSavingSettings}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-3.5 rounded-[4px] font-bold transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
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
                    className={`px-6 py-3.5 rounded-[4px] font-bold transition-all border flex items-center justify-center gap-2 disabled:opacity-50 ${theme === "dark" ? "border-gray-700 hover:bg-gray-800 text-white" : "border-gray-200 hover:bg-gray-100 text-gray-900"}`}
                  >
                    {isTestingConnection ? (
                      <RefreshCw size={18} className="animate-spin" />
                    ) : (
                      <RefreshCw size={18} />
                    )}
                    {t("testConnection")}
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div
                className={
                  theme === "dark"
                    ? "p-6 rounded-[4px] border bg-[#1a1a1c] border-gray-800/60"
                    : "p-6 rounded-[4px] border bg-white border-gray-200"
                }
              >
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <ShieldCheck className="text-emerald-500" size={20} />
                  {t("securityProtocol")}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed mb-4">
                  {t("securityProtocolDesc")}
                </p>
                <div className="p-4 rounded-[4px] bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-500 text-sm flex items-start gap-3">
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
                  className={`flex items-center gap-2 px-4 py-2 rounded-[4px] border transition-all duration-300 font-medium disabled:opacity-50 ${
                    theme === "dark"
                      ? "border-gray-800 text-gray-400 hover:text-white hover:bg-gray-800"
                      : "border-gray-200 text-gray-600 hover:bg-gray-100"
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
                  className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-[4px] transition-all duration-300 font-medium shadow-[0_0_15px_rgba(16,185,129,0.4)]"
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
                    className={`group p-6 rounded-[4px] border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl cursor-pointer relative ${
                      theme === "dark"
                        ? "bg-[#111111] border-gray-800/60 hover:border-emerald-500/30"
                        : "bg-white border-gray-200 hover:border-emerald-500/30"
                    }`}
                    onClick={() => setSelectedTemplate(template)}
                  >
                    {template.type === "custom" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTemplate(template.id);
                        }}
                        className="absolute top-4 right-4 p-2 rounded-[4px] bg-red-500/10 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                    <div className="flex justify-between items-start mb-4">
                      <div
                        className={`p-3 rounded-[4px] ${template.type === "system" ? "bg-blue-500/10 text-blue-500" : "bg-purple-500/10 text-purple-500"}`}
                      >
                        <Mail size={24} />
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-[4px] text-xs font-medium ${template.type === "system" ? "bg-blue-500/10 text-blue-500" : "bg-purple-500/10 text-purple-500"}`}
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

                    <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-800/60">
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
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={() => setSelectedTemplate(null)}
                className={`p-2.5 rounded-[4px] transition-all duration-300 flex items-center justify-center ${
                  theme === "dark"
                    ? "bg-gray-800/40 hover:bg-gray-700 text-gray-400 hover:text-white border border-gray-700/50"
                    : "bg-white hover:bg-gray-50 text-gray-500 hover:text-gray-900 border border-gray-200 shadow-sm"
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
                className={`lg:col-span-2 p-6 md:p-8 rounded-[4px] border ${theme === "dark" ? "bg-[#111111] border-gray-800/60" : "bg-white border-gray-200"}`}
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
                      className={`w-full px-4 py-3 rounded-[4px] border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all ${theme === "dark" ? "bg-[#1a1a1c] border-gray-800 text-white disabled:opacity-50" : "bg-gray-50 border-gray-200 disabled:opacity-50"}`}
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
                        className={`w-full px-4 py-3 rounded-[4px] border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all ${theme === "dark" ? "bg-[#1a1a1c] border-gray-800 text-white" : "bg-white border-gray-200"}`}
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
                        className={`w-full px-4 py-3 rounded-[4px] border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all ${theme === "dark" ? "bg-[#1a1a1c] border-gray-800 text-white" : "bg-white border-gray-200"}`}
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
                      className={`w-full px-4 py-3 rounded-[4px] border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all font-mono text-sm ${theme === "dark" ? "bg-[#1a1a1c] border-gray-800 text-gray-300" : "bg-gray-50 border-gray-200 text-gray-800"}`}
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
                      className={`w-full px-4 py-3 rounded-[4px] border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all font-mono text-sm ${theme === "dark" ? "bg-[#1a1a1c] border-gray-800 text-gray-300" : "bg-gray-50 border-gray-200 text-gray-800"}`}
                      dir="rtl"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={handleSaveTemplate}
                      disabled={isSavingTemplate}
                      className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-3.5 rounded-[4px] font-bold transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
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
                  className={`p-6 rounded-[4px] border ${theme === "dark" ? "bg-[#1a1a1c] border-gray-800/60" : "bg-gray-50 border-gray-100"}`}
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
                        className={`w-full flex items-center justify-between p-3 rounded-[4px] border transition-all hover:border-emerald-500/50 ${theme === "dark" ? "bg-[#111111] border-gray-800" : "bg-white border-gray-200"}`}
                      >
                        <span className="font-mono text-sm text-emerald-500">
                          {v}
                        </span>
                        <Copy size={14} className="text-gray-400" />
                      </button>
                    ))}
                  </div>

                  <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800/60">
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
                      className={`p-4 rounded-[4px] text-xs ${theme === "dark" ? "bg-[#111111] text-gray-400" : "bg-white text-gray-500"}`}
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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          className={`p-5 rounded-[4px] border ${theme === "dark" ? "bg-[#111111] border-gray-800/60" : "bg-white border-gray-200 shadow-sm"} group transition-all duration-300 hover:border-emerald-500/30`}
        >
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-[4px] bg-emerald-500/10 text-emerald-500 group-hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.4)] transition-all">
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
          className={`p-5 rounded-[4px] border ${theme === "dark" ? "bg-[#111111] border-gray-800/60" : "bg-white border-gray-200 shadow-sm"} group transition-all duration-300 hover:border-blue-500/30`}
        >
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-[4px] bg-blue-500/10 text-blue-500 group-hover:drop-shadow-[0_0_8px_rgba(59,130,246,0.4)] transition-all">
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
          className={`p-5 rounded-[4px] border ${theme === "dark" ? "bg-emerald-500/5 border-emerald-500/20" : "bg-emerald-50/50 border-emerald-200 shadow-sm"} group transition-all duration-300`}
        >
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-[4px] bg-emerald-500/10 text-emerald-500">
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
          className={`fixed bottom-6 ${dir === "rtl" ? "left-6" : "right-6"} z-50 flex items-center gap-3 px-6 py-4 rounded-[4px] shadow-2xl transition-all duration-300 animate-in slide-in-from-bottom-5 ${
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
            className={`p-6 md:p-8 rounded-[4px] border ${theme === "dark" ? "bg-[#111111] border-gray-800/60" : "bg-white border-gray-200"} shadow-2xl shadow-black/5`}
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
                        className={`flex flex-col items-center justify-center gap-2 p-4 rounded-[4px] border transition-all duration-300 ${
                          form.broadcast_type === type.id
                            ? "bg-emerald-500/10 border-emerald-500 text-emerald-500 shadow-lg shadow-emerald-500/5"
                            : `border-gray-200 dark:border-gray-800 text-gray-400 hover:border-gray-300 dark:hover:border-gray-700 ${theme === "dark" ? "bg-[#1a1a1c]" : "bg-gray-50"}`
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
                        className={`flex flex-col items-center justify-center gap-2 p-4 rounded-[4px] border transition-all duration-300 ${
                          form.target_group === group.id
                            ? "bg-emerald-500/10 border-emerald-500 text-emerald-500 shadow-lg shadow-emerald-500/5"
                            : `border-gray-200 dark:border-gray-800 text-gray-400 hover:border-gray-300 dark:hover:border-gray-700 ${theme === "dark" ? "bg-[#1a1a1c]" : "bg-gray-50"}`
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
                        className={`w-full px-4 py-3 rounded-[4px] border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all ${theme === "dark" ? "bg-[#1a1a1c] border-gray-800 text-white" : "bg-gray-50 border-gray-200"}`}
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
                        className={`w-full px-4 py-3 rounded-[4px] border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all ${theme === "dark" ? "bg-[#1a1a1c] border-gray-800 text-white" : "bg-gray-50 border-gray-200"}`}
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
                    className={`w-full px-4 py-3 rounded-[4px] border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-sm font-sans ${theme === "dark" ? "bg-[#1a1a1c] border-gray-800 text-gray-300" : "bg-gray-50 border-gray-200 text-gray-800"}`}
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
                    className={`w-full px-4 py-3 rounded-[4px] border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-sm font-sans ${theme === "dark" ? "bg-[#1a1a1c] border-gray-800 text-gray-300" : "bg-gray-50 border-gray-200 text-gray-800"}`}
                    dir="rtl"
                  />
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800/60 flex justify-end">
              <button
                onClick={handleSend}
                disabled={isSending}
                className="w-full md:w-auto bg-emerald-500 hover:bg-emerald-600 text-white px-10 py-4 rounded-[4px] font-bold transition-all shadow-xl shadow-emerald-500/30 flex items-center justify-center gap-3 disabled:opacity-50"
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
                className={`p-12 rounded-[4px] border border-dashed flex flex-col items-center justify-center text-center ${theme === "dark" ? "border-gray-800 bg-[#111111]" : "border-gray-200 bg-gray-50"}`}
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
                    className={`p-6 rounded-[4px] border transition-all duration-300 hover:border-emerald-500/30 hover:shadow-xl hover:shadow-black/5 ${theme === "dark" ? "bg-[#1a1a1c] border-gray-800/60" : "bg-white border-gray-100 shadow-sm"}`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-[4px] ${theme === "dark" ? "bg-emerald-500/10" : "bg-emerald-50"}`}
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
                        className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${theme === "dark" ? "bg-gray-800 text-gray-400" : "bg-gray-100 text-gray-600"}`}
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

                    <div className="pt-4 border-t border-gray-200 dark:border-gray-800/60 flex items-center justify-between">
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

const SystemSettingsView = ({
  theme,
  t,
  dir,
}: {
  theme: string;
  t: (key: string, replacements?: any) => string;
  dir: string;
}) => {
  const { siteSettings, setSiteSettings, token, setIsOperationPending } =
    useAppContext();

  const [siteName, setSiteName] = useState(siteSettings.siteName);
  const [siteNameAr, setSiteNameAr] = useState(siteSettings.siteNameAr || "");
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

  const [logoBase64, setLogoBase64] = useState<string | null>(
    siteSettings.logoBase64,
  );
  const [faviconBase64, setFaviconBase64] = useState<string | null>(
    siteSettings.faviconBase64,
  );

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
          setSiteDescription(data.site_description_en || "");
          setSiteDescriptionAr(data.site_description_ar || "");
          const seoData =
            data.seo_description && data.seo_description.startsWith("{")
              ? JSON.parse(data.seo_description)
              : { en: data.seo_description || "", ar: "" };
          const kwsData =
            data.keywords && data.keywords.startsWith("{")
              ? JSON.parse(data.keywords)
              : { en: data.keywords || "", ar: "" };

          setSeoDescriptionEn(seoData.en || "");
          setSeoDescriptionAr(seoData.ar || "");
          setKeywordsEn(kwsData.en || "");
          setKeywordsAr(kwsData.ar || "");
          setGoogleAnalyticsId(data.google_analytics_id || "");
          setLogoBase64(data.logo_url || null);
          setFaviconBase64(data.favicon_url || null);

          setSiteSettings({
            ...siteSettings,
            siteName: data.site_name_en || "",
            siteNameAr: data.site_name_ar || "",
            siteDescription: data.site_description_en || "",
            siteDescriptionAr: data.site_description_ar || "",
            seoDescriptionEn: seoData.en || "",
            seoDescriptionAr: seoData.ar || "",
            keywordsEn: kwsData.en || "",
            keywordsAr: kwsData.ar || "",
            googleAnalyticsId: data.google_analytics_id || "",
            logoBase64: data.logo_url || null,
            faviconBase64: data.favicon_url || null,
          });
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
      }
    };
    if (token) fetchSettings();
  }, [token]);

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "logo" | "favicon",
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === "logo") setLogoBase64(reader.result as string);
        else setFaviconBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
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
          seo_description: JSON.stringify({
            en: siteSettings.seoDescriptionEn,
            ar: siteSettings.seoDescriptionAr,
          }),
          keywords: JSON.stringify({
            en: siteSettings.keywordsEn,
            ar: siteSettings.keywordsAr,
          }),
          google_analytics_id: siteSettings.googleAnalyticsId,
          logo_url: logoBase64,
          favicon_url: faviconBase64,
        }),
      });

      if (res.ok) {
        setSiteSettings({
          ...siteSettings,
          siteName,
          siteNameAr,
          siteDescription,
          siteDescriptionAr,
          seoDescriptionEn: siteSettings.seoDescriptionEn,
          seoDescriptionAr: siteSettings.seoDescriptionAr,
          keywordsEn: siteSettings.keywordsEn,
          keywordsAr: siteSettings.keywordsAr,
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
          seo_description: JSON.stringify({
            en: siteSettings.seoDescriptionEn,
            ar: siteSettings.seoDescriptionAr,
          }),
          keywords: JSON.stringify({
            en: siteSettings.keywordsEn,
            ar: siteSettings.keywordsAr,
          }),
          google_analytics_id: siteSettings.googleAnalyticsId,
          logo_url: logoBase64,
          favicon_url: faviconBase64,
        }),
      });

      if (res.ok) {
        setSiteSettings({
          ...siteSettings,
          logoBase64,
          faviconBase64,
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
    if (
      !seoDescriptionEn ||
      !seoDescriptionAr ||
      !keywordsEn ||
      !keywordsAr ||
      !googleAnalyticsId
    ) {
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
          site_name_en: siteSettings.siteName,
          site_name_ar: siteSettings.siteNameAr,
          site_description_en: siteSettings.siteDescription,
          site_description_ar: siteSettings.siteDescriptionAr,
          seo_description: JSON.stringify({
            en: seoDescriptionEn,
            ar: seoDescriptionAr,
          }),
          keywords: JSON.stringify({ en: keywordsEn, ar: keywordsAr }),
          google_analytics_id: googleAnalyticsId,
          logo_url: siteSettings.logoBase64,
          favicon_url: siteSettings.faviconBase64,
        }),
      });

      if (res.ok) {
        setSiteSettings({
          ...siteSettings,
          seoDescriptionEn,
          seoDescriptionAr,
          keywordsEn,
          keywordsAr,
          googleAnalyticsId,
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

  return (
    <div className="space-y-8 max-w-5xl relative">
      {/* Toast Notification */}
      {toast &&
        createPortal(
          <div
            className={`fixed bottom-6 ${dir === "rtl" ? "left-6" : "right-6"} z-[1000] flex items-center gap-3 px-6 py-4 rounded-[4px] shadow-2xl transition-all duration-300 animate-in slide-in-from-bottom-5 ${
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
        className={`p-6 md:p-8 rounded-[4px] border ${theme === "dark" ? "bg-[#111111] border-gray-800/60" : "bg-white border-gray-200"}`}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-[4px] bg-emerald-500/10 text-emerald-500">
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
              className={`w-full px-4 py-3 rounded-[4px] border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all ${theme === "dark" ? "bg-[#1a1a1c] border-gray-800 text-white" : "bg-gray-50 border-gray-200"}`}
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
              className={`w-full px-4 py-3 rounded-[4px] border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all ${theme === "dark" ? "bg-[#1a1a1c] border-gray-800 text-white" : "bg-gray-50 border-gray-200"}`}
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
              className={`w-full px-4 py-3 rounded-[4px] border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all ${theme === "dark" ? "bg-[#1a1a1c] border-gray-800 text-white" : "bg-gray-50 border-gray-200"}`}
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
              className={`w-full px-4 py-3 rounded-[4px] border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all ${theme === "dark" ? "bg-[#1a1a1c] border-gray-800 text-white" : "bg-gray-50 border-gray-200"}`}
            />
          </div>
        </div>
        <div className="flex justify-end mt-6">
          <button
            onClick={handleSaveGeneralSettings}
            disabled={isSaving}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2.5 rounded-[4px] transition-all duration-300 font-medium shadow-[0_0_15px_rgba(16,185,129,0.4)] disabled:opacity-50"
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
        className={`p-6 md:p-8 rounded-[4px] border ${theme === "dark" ? "bg-[#111111] border-gray-800/60" : "bg-white border-gray-200"}`}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-[4px] bg-purple-500/10 text-purple-500">
            <ImageIcon size={24} />
          </div>
          <h2 className="text-xl font-bold">{t("visualIdentity")}</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Logo Upload */}
          <div
            className={`p-6 rounded-[4px] border border-dashed ${theme === "dark" ? "border-gray-700 bg-[#1a1a1c]" : "border-gray-300 bg-gray-50"} flex flex-col items-center justify-center text-center relative overflow-hidden group`}
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
                  alt="Logo"
                  className="w-8 h-8 rounded-[4px] object-contain"
                />
              ) : (
                <div className="bg-pink-600 p-1.5 rounded-[4px] text-white flex items-center justify-center w-8 h-8">
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
            <h3 className="font-medium text-sm mb-1">{t("uploadLogo")}</h3>
            <p className="text-xs text-gray-500">PNG, SVG, JPG (Max 1MB)</p>
            <p className="text-[10px] text-emerald-500 mt-2 bg-emerald-500/10 px-2 py-1 rounded-md">
              Base64 Encoded (No external files)
            </p>
          </div>

          {/* Favicon Upload */}
          <div
            className={`p-6 rounded-[4px] border border-dashed ${theme === "dark" ? "border-gray-700 bg-[#1a1a1c]" : "border-gray-300 bg-gray-50"} flex flex-col items-center justify-center text-center relative overflow-hidden group`}
          >
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleImageUpload(e, "favicon")}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className="mb-4 w-8 h-8 rounded-md bg-gray-200 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
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
            <h3 className="font-medium text-sm mb-1">{t("uploadFavicon")}</h3>
            <p className="text-xs text-gray-500">32x32 PNG or ICO</p>
            <p className="text-[10px] text-emerald-500 mt-2 bg-emerald-500/10 px-2 py-1 rounded-md">
              Base64 Encoded (No external files)
            </p>
          </div>
        </div>
        <div className="flex justify-end mt-6">
          <button
            onClick={handleSaveVisualSettings}
            disabled={isSaving}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2.5 rounded-[4px] transition-all duration-300 font-medium shadow-[0_0_15px_rgba(16,185,129,0.4)] disabled:opacity-50"
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
        className={`p-6 md:p-8 rounded-[4px] border ${theme === "dark" ? "bg-[#111111] border-gray-800/60" : "bg-white border-gray-200"}`}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-[4px] bg-blue-500/10 text-blue-500">
            <Search size={24} />
          </div>
          <h2 className="text-xl font-bold">{t("seoFields")}</h2>
        </div>

        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                {t("seoDescriptionEn")}
              </label>
              <textarea
                rows={3}
                value={seoDescriptionEn || ""}
                onChange={(e) => setSeoDescriptionEn(e.target.value)}
                className={`w-full px-4 py-3 rounded-[4px] border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all ${theme === "dark" ? "bg-[#1a1a1c] border-gray-800 text-white" : "bg-gray-50 border-gray-200"}`}
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
                className={`w-full px-4 py-3 rounded-[4px] border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all ${theme === "dark" ? "bg-[#1a1a1c] border-gray-800 text-white" : "bg-gray-50 border-gray-200"}`}
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
                className={`w-full px-4 py-3 rounded-[4px] border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all ${theme === "dark" ? "bg-[#1a1a1c] border-gray-800 text-white" : "bg-gray-50 border-gray-200"}`}
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
                className={`w-full px-4 py-3 rounded-[4px] border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all ${theme === "dark" ? "bg-[#1a1a1c] border-gray-800 text-white" : "bg-gray-50 border-gray-200"}`}
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
              className={`w-full px-4 py-3 rounded-[4px] border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all ${theme === "dark" ? "bg-[#1a1a1c] border-gray-800 text-white" : "bg-gray-50 border-gray-200"}`}
            />
          </div>
        </div>
        <div className="flex justify-end mt-6">
          <button
            onClick={handleSaveSeoSettings}
            disabled={isSaving}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2.5 rounded-[4px] transition-all duration-300 font-medium shadow-[0_0_15px_rgba(16,185,129,0.4)] disabled:opacity-50"
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
  } = useAppContext();
  const location = useLocation();
  const navigate = useNavigate();

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

  const getTitle = () => {
    switch (path) {
      case "dashboard":
        return t("commandCenter");
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
      case "emails":
        return t("smartEmailHub");
      case "broadcast":
        return t("smartBroadcast");
      case "settings":
        return t("systemSettings");
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
      case "emails":
        return <Mail size={28} className={iconClass} />;
      case "broadcast":
        return <Send size={28} className={iconClass} />;
      case "settings":
        return <Settings size={28} className={iconClass} />;
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

  return (
    <motion.div 
      initial="initial"
      animate="animate"
      exit="exit"
      variants={sovereignPageTransition}
      className="flex flex-col w-full"
    >
      {/* Sticky Admin Header - Elite Command Layer */}
      <div
        className={`sticky top-[72px] z-20 -mx-6 md:-mx-8 px-6 md:px-8 py-3 mb-4 transition-all duration-[var(--theme-transition-duration)] ${
          theme === "dark" ? "bg-[var(--bg-base)]/95" : "bg-[var(--bg-surface)]/95"
        } backdrop-blur-md border-b border-[var(--border)] flex items-center justify-between`}
      >
        <div className="flex items-center gap-4">
          {path !== "dashboard" && (
            <button
              onClick={() => navigate("/admin/dashboard")}
              className="p-2.5 rounded-[var(--radius)] transition-all duration-[var(--theme-transition-duration)] flex items-center justify-center bg-[var(--bg-surface)] hover:bg-[var(--bg-base)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border)] shadow-sm hover:shadow-md"
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
              className="p-2.5 rounded-[var(--radius)] bg-[var(--bg-surface)] shadow-sm border border-[var(--border)] transition-all duration-[var(--theme-transition-duration)]"
            >
              {getIcon()}
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight uppercase leading-none text-[var(--text-primary)] transition-colors">
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
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-[4px] transition-all duration-300 font-bold text-sm shadow-[0_5px_15px_rgba(16,185,129,0.3)] hover:shadow-[0_8px_20px_rgba(16,185,129,0.5)] active:scale-95"
            >
              <Plus size={18} />
              {getAddButtonText()}
            </button>
          )}

          <div
            className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-surface)] transition-all duration-[var(--theme-transition-duration)]"
          >
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-tighter">
              Live Monitor
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div
        className={`relative transition-all duration-[var(--theme-transition-duration)] ${
          ["dashboard", "radar", "databases", "orchestrator", "keys", "finance", "plans", "users", "emails", "broadcast", "settings"].includes(
            path,
          )
            ? ""
            : `p-6 md:p-8 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-surface)] shadow-xl`
        }`}
      >
        <ErrorBoundary name="Admin Command Panels">
          {path === "dashboard" ? (
            <CommandCenterView theme={theme} t={t} />
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

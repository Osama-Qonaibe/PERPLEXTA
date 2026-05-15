import React, { useState, useEffect } from "react";
import { 
  TrendingUp, Users, Zap, Activity, Cpu, Clock, 
  Trash2, Settings, ShieldAlert, AlertCircle, 
  RefreshCw, Database, BellRing, Shield, CheckCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useSocket } from "../../context/SocketContext";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { toast } from "../../components/ui/Toast";

export const CommandCenter: React.FC = () => {
  const { token } = useAuth();
  const { t, language, dir } = useTheme();
  const { socket } = useSocket();
  
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
  const [loading, setLoading] = useState(true);
  const [serverHealth, setServerHealth] = useState<any>(null);

  const fetchData = async () => {
    try {
      const headers = {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Cache-Control": "no-cache",
      };
      const [statsRes, alertsRes, activityRes, healthRes] =
        await Promise.all([
          fetch("/api/admin/stats", { headers }),
          fetch("/api/admin/security-alerts", { headers }),
          fetch("/api/admin/activity-stream", { headers }),
          fetch("/api/admin/health", { headers }),
        ]);

      if (statsRes.ok) setStats(await statsRes.ok ? await statsRes.json() : null);
      if (alertsRes.ok) setAlerts(await alertsRes.json());
      if (activityRes.ok) setActivity(await activityRes.json());
      if (healthRes.ok) setServerHealth(await healthRes.json());
    } catch (error) {
      console.error("Error fetching admin data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchData();

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
    if (!token) return;
    try {
      const res = await fetch(`/api/admin/activity/${id}/${type}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setActivity((prev) => prev.filter((a) => a.id !== id || a.type !== type));
        toast.success(t('activityDeleted'));
      }
    } catch (err) {
      console.error("Failed to delete activity log", err);
    }
  };

  const handleBulkDeleteActivity = async (type: string) => {
     if (!token) return;
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
        toast.success(t("activityCleared"));
        fetchData();
      }
    } catch (err) {
      console.error("Bulk delete failed", err);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <RefreshCw size={40} className="text-emerald-500 animate-spin" />
        <p className="text-gray-400 font-medium">{t("loadingCommandCenter")}</p>
      </div>
    );
  }

  const kpis = [
    {
      title: t("monthlyRevenue"),
      value: `$${stats?.monthlyRevenue?.toLocaleString() || "0"}`,
      trend: t("optimal"),
      isPositive: true,
      icon: <TrendingUp size={20} />,
    },
    {
      title: t("activeUsersToday"),
      value: stats?.activeUsersToday?.toLocaleString() || "0",
      trend: t("optimal"),
      isPositive: true,
      icon: <Users size={20} />,
    },
    {
      title: t("aiGenerations"),
      value: stats?.aiGenerations?.toLocaleString() || "0",
      trend: t("optimal"),
      isPositive: true,
      icon: <Zap size={20} />,
    },
    {
      title: t("systemHealth"),
      value: stats?.systemHealth === "optimal" ? "99.9%" : "85%",
      trend: t("optimal"),
      isPositive: true,
      icon: <Activity size={20} />,
    },
  ];

  const getTimeAgo = (date: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return t("justNow");
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return t("minutesAgo").replace("{n}", minutes.toString());
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t("hoursAgo").replace("{n}", hours.toString());
    return new Date(date).toLocaleDateString(language === "ar" ? "ar-EG" : "en-US");
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => (
          <Card key={idx} className="p-5">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2.5 rounded-[4px] bg-[#0a0a0b] text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]">
                {kpi.icon}
              </div>
              <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-[4px] ${kpi.isPositive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                {kpi.trend}
              </span>
            </div>
            <h3 className="text-gray-400 text-sm font-medium mb-1">{kpi.title}</h3>
            <p className="text-2xl font-bold text-white">{kpi.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Cpu className="text-emerald-500" size={20} />
              <h2 className="text-lg font-bold text-white">{t("resourceUtilization")}</h2>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-black text-emerald-500/50 uppercase tracking-widest">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Diagnostics
            </div>
          </div>
          <div className="flex-1 space-y-6">
             <div className="space-y-2">
                <div className="flex justify-between text-[11px] font-bold uppercase tracking-tight">
                  <span className="text-gray-500">{t("cpuLoad")}</span>
                  <span className="text-emerald-500">{serverHealth?.cpu || 0}%</span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${serverHealth?.cpu || 0}%` }} className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                </div>
             </div>
             <div className="space-y-2">
                <div className="flex justify-between text-[11px] font-bold uppercase tracking-tight">
                  <span className="text-gray-500">{t("memoryAllocation")}</span>
                  <span className="text-emerald-500">{serverHealth?.memory?.used || 0}MB</span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${serverHealth?.memory?.percent || 0}%` }} className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                </div>
             </div>
          </div>
        </Card>

        <Card className="p-6 border-emerald-500/20 bg-emerald-500/5 flex flex-col justify-center items-center text-center">
          <Activity className="text-emerald-500 mb-4" size={32} />
          <p className="text-4xl font-black text-emerald-500">100%</p>
          <p className="text-xs text-emerald-500/60 mt-2 font-medium uppercase tracking-widest">{t("stableOperationalProtocol")}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
           <div className="flex items-center justify-between mb-6">
             <div className="flex items-center gap-3">
               <Clock className="text-emerald-500" size={20} />
               <h2 className="text-lg font-bold text-white">{t("activityStream")}</h2>
             </div>
             <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => handleBulkDeleteActivity("ai_generation")}>
                   <Zap size={14} className="mr-2" /> {t("clearAILogs")}
                </Button>
                <Button variant="danger" size="sm" onClick={() => handleBulkDeleteActivity("log")}>
                   <Trash2 size={14} className="mr-2" /> {t("clearAll")}
                </Button>
             </div>
           </div>
           <div className="space-y-4 max-h-[400px] overflow-y-auto px-1 custom-scrollbar">
             {activity.map((log, idx) => (
                <div key={idx} className="flex items-start gap-3 group p-2 rounded-[4px] hover:bg-white/5 transition-all">
                   <div className={`mt-0.5 p-1.5 rounded-[4px] shrink-0 ${log.type === "ai_generation" ? "bg-blue-500/20 text-blue-500" : "bg-emerald-500/20 text-emerald-500"}`}>
                      {log.type === "ai_generation" ? <Zap size={14} /> : <Settings size={14} />}
                   </div>
                   <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                         <span className="text-emerald-500 font-bold">{log.user_name || t("systemUser")}</span> {log.action}
                      </p>
                      <p className="text-[10px] text-gray-500 mt-1">{getTimeAgo(log.created_at)}</p>
                   </div>
                   <button onClick={() => handleDeleteActivity(log.id, log.type)} className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-red-500 transition-all">
                      <Trash2 size={14} />
                   </button>
                </div>
             ))}
           </div>
        </Card>

        <Card className="p-6 border-rose-500/20">
          <div className="flex items-center justify-between mb-6">
             <div className="flex items-center gap-3">
               <ShieldAlert className="text-rose-500" size={20} />
               <h2 className="text-lg font-bold text-rose-500">{t("securityAlerts")}</h2>
             </div>
          </div>
          <div className="space-y-4 max-h-[300px] overflow-y-auto px-1 custom-scrollbar">
             {alerts.map((alert, idx) => (
                <div key={idx} className="flex items-start gap-3 group p-2 rounded-[4px] hover:bg-rose-500/5 transition-all">
                   <div className="mt-0.5 p-1.5 rounded-[4px] bg-rose-500/20 text-rose-500">
                      <AlertCircle size={14} />
                   </div>
                   <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">{alert.description}</p>
                      <p className="text-[10px] text-gray-500 mt-1">{getTimeAgo(alert.created_at)}</p>
                   </div>
                </div>
             ))}
             {alerts.length === 0 && <p className="text-center text-gray-600 py-10 text-sm italic">{t("noSecurityAlerts")}</p>}
          </div>
        </Card>
      </div>
    </div>
  );
};

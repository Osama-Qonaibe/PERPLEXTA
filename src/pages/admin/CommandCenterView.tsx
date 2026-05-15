import React, { useState, useEffect } from "react";
import { 
  TrendingUp, Users, Zap, Activity, RefreshCw, Cpu
} from "lucide-react";
import { motion } from "motion/react";
import { useAppContext } from "../../context/AppContext";
import { AdminStats, ServerHealth } from "../../types/admin.types";
import { ActivityAuditView } from "./ActivityAuditView";
import { SecurityVaultView } from "./SecurityVaultView";

export const CommandCenterView = ({
  theme,
  t,
}: {
  theme: string;
  t: (key: string, replacements?: any) => string;
}) => {
  const { token, dir } = useAppContext();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [serverHealth, setServerHealth] = useState<ServerHealth | null>(null);

  const fetchData = async () => {
    try {
      const headers = {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Cache-Control": "no-cache",
      };
      const [statsRes, healthRes] = await Promise.all([
        fetch("/api/admin/stats", { headers }),
        fetch("/api/admin/health", { headers }),
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (healthRes.ok) setServerHealth(await healthRes.json());
    } catch (error) {
      console.error("Error fetching admin data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchData();
  }, [token]);

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
        <ActivityAuditView theme={theme} t={t} dir={dir} />
        <SecurityVaultView theme={theme} t={t} dir={dir} />
      </div>
    </div>
  );
};

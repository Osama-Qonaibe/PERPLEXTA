import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import { motion, AnimatePresence } from "motion/react";
import { sovereignPageTransition } from "../constants/motions";
import { ErrorBoundary } from '../components/ErrorBoundary';
import {
  Activity, Key, Database, Cpu, Landmark, CreditCard, Users, 
  Mail, Send, Settings, ArrowLeft, ArrowRight, Plus, RefreshCw, 
  Settings2, ShieldAlert, Clock
} from "lucide-react";

// Impoted Views from Sovereign Admin Ecosystem
import { CommandCenterView } from "./admin/CommandCenterView";
import { DigitalFinancialRadarView } from "./admin/DigitalFinancialRadarView";
import { ApiKeysVaultView } from "./admin/ApiKeysVaultView";
import { DatabaseOrchestrationView } from "./admin/DatabaseOrchestrationView";
import { OrchestratorView } from "./admin/OrchestratorView";
import { FinanceVaultView } from "./admin/FinanceVaultView";
import { PlansEngineeringView } from "./admin/PlansEngineeringView";
import { UserManagementView } from "./admin/UserManagementView";
import { EmailTemplateHubView } from "./admin/EmailTemplateHubView";
import { MarketingBroadcastView } from "./admin/MarketingBroadcastView";
import { SystemSettingsView } from "./admin/SystemSettingsView";
import { SecurityVaultView } from "./admin/SecurityVaultView";
import { ActivityAuditView } from "./admin/ActivityAuditView";

export const AdminDashboard: React.FC = () => {
  const {
    t, theme, dir, language, token, user, setIsOperationPending
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
    const sensitivePaths = ["keys", "databases", "finance", "settings", "orchestrator"];
    if (isSupport && sensitivePaths.includes(path)) {
      navigate("/admin/dashboard");
    }
  }, [user, path, isSupport, navigate]);

  const [providerModels, setProviderModels] = useState<Record<string, any[]>>({});
  const [isSyncing, setIsSyncing] = useState(false);

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

  const syncAllModels = async () => {
    if (!token || isSyncing) return;
    setIsSyncing(true);
    setIsOperationPending(true);
    try {
      const res = await fetch("/api/admin/orchestrator/sync-all", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        await fetchProviderModels();
      }
    } catch (error) {
      console.error("Error syncing models:", error);
    } finally {
      setIsSyncing(false);
      setIsOperationPending(false);
    }
  };

  useEffect(() => {
    if (token) fetchProviderModels();
  }, [token]);

  const getTitle = () => {
    switch (path) {
      case "dashboard": return t("commandCenter");
      case "radar": return "Digital Financial Radar";
      case "security": return t("securityAlerts");
      case "activity": return t("activityStream");
      case "keys": return t("aiInfrastructure");
      case "databases": return t("dbOrchestration");
      case "orchestrator": return t("toolOrchestrator");
      case "finance": return t("financeVault");
      case "plans": return t("plansSubscriptions");
      case "users": return t("userManagement");
      case "emails": return t("smartEmailHub");
      case "broadcast": return t("smartBroadcast");
      case "settings": return t("systemSettings");
      default: return t("commandCenter");
    }
  };

  const getIcon = () => {
    const iconClass = "text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]";
    switch (path) {
      case "dashboard": return <Activity size={28} className={iconClass} />;
      case "radar": return <Landmark size={28} className={iconClass} />;
      case "keys": return <Key size={28} className={iconClass} />;
      case "databases": return <Database size={28} className={iconClass} />;
      case "orchestrator": return <Cpu size={28} className={iconClass} />;
      case "finance": return <Landmark size={28} className={iconClass} />;
      case "plans": return <CreditCard size={28} className={iconClass} />;
      case "users": return <Users size={28} className={iconClass} />;
      case "emails": return <Mail size={28} className={iconClass} />;
      case "broadcast": return <Send size={28} className={iconClass} />;
      case "settings": return <Settings size={28} className={iconClass} />;
      case "security": return <ShieldAlert size={28} className={iconClass} />;
      case "activity": return <Clock size={28} className={iconClass} />;
      default: return <Settings2 size={28} className={iconClass} />;
    }
  };

  const showAddButton = ["plans", "broadcast"].includes(path);
  const showSyncButton = path === "orchestrator";

  const handleAddClick = () => {
    switch (path) {
      case "plans": window.dispatchEvent(new CustomEvent("admin-add-plan")); break;
      case "broadcast": window.dispatchEvent(new CustomEvent("admin-add-broadcast")); break;
      case "orchestrator": syncAllModels(); break;
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
      <div className={`sticky top-[72px] z-20 -mx-6 md:-mx-8 px-6 md:px-8 py-3 mb-4 transition-all duration-[var(--theme-transition-duration)] ${theme === "dark" ? "bg-[var(--bg-base)]/95" : "bg-[var(--bg-surface)]/95"} backdrop-blur-md border-b border-[var(--border)] flex items-center justify-between`}>
        <div className="flex items-center gap-4">
          {path !== "dashboard" && (
            <button onClick={() => navigate("/admin/dashboard")} className="p-2.5 rounded-[var(--radius)] transition-all bg-[var(--bg-surface)] hover:bg-[var(--bg-base)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border)]">
              {dir === "rtl" ? <ArrowRight size={20} /> : <ArrowLeft size={20} />}
            </button>
          )}
          <div className="flex items-center gap-4">
            <div className="p-2.5 rounded-[var(--radius)] bg-[var(--bg-surface)] shadow-sm border border-[var(--border)] transition-all">
              {getIcon()}
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight uppercase leading-none text-[var(--text-primary)]">
                {getTitle()}
              </h1>
              <p className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-widest mt-1 opacity-60">
                Sovereign Command Protocol
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {(showAddButton || showSyncButton) && (
            <button onClick={handleAddClick} disabled={isSyncing} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white px-5 py-2.5 rounded-[4px] transition-all font-bold text-sm shadow-lg active:scale-95">
              {isSyncing ? <RefreshCw size={18} className="animate-spin" /> : showSyncButton ? <RefreshCw size={18} /> : <Plus size={18} />}
              {path === "orchestrator" ? (isSyncing ? t("syncingModels") : t("syncModels")) : t("add")}
            </button>
          )}
          <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-surface)]">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-tighter">Live Monitor</span>
          </div>
        </div>
      </div>

      <div className="relative">
        <ErrorBoundary name="Admin Content Engine">
          <AnimatePresence mode="wait">
            <motion.div
              key={path}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              {path === "dashboard" ? <CommandCenterView theme={theme} t={t} /> :
               path === "radar" ? <DigitalFinancialRadarView theme={theme} t={t} /> :
               path === "security" ? <SecurityVaultView theme={theme} t={t} dir={dir} /> :
               path === "activity" ? <ActivityAuditView theme={theme} t={t} dir={dir} /> :
               path === "keys" ? <ApiKeysVaultView theme={theme} t={t} dir={dir} providerModels={providerModels} setProviderModels={setProviderModels} /> :
               path === "databases" ? <DatabaseOrchestrationView theme={theme} t={t} dir={dir} language={language} /> :
               path === "orchestrator" ? <OrchestratorView theme={theme} t={t} dir={dir} providerModels={providerModels} /> :
               path === "finance" ? <FinanceVaultView theme={theme} t={t} dir={dir} /> :
               path === "plans" ? <PlansEngineeringView theme={theme} t={t} dir={dir} /> :
               path === "users" ? <UserManagementView theme={theme} t={t} dir={dir} /> :
               path === "emails" ? <EmailTemplateHubView theme={theme} t={t} dir={dir} /> :
               path === "broadcast" ? <MarketingBroadcastView theme={theme} t={t} dir={dir} language={language} /> :
               path === "settings" ? <SystemSettingsView theme={theme} t={t} dir={dir} /> :
               <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                  <div className="mb-6 opacity-30">{getIcon()}</div>
                  <p className="text-xl font-black uppercase tracking-widest">Protocol Unavailable</p>
               </div>
              }
            </motion.div>
          </AnimatePresence>
        </ErrorBoundary>
      </div>
    </motion.div>
  );
};

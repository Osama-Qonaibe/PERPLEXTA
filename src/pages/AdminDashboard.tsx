import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useSocket } from "../context/SocketContext";
import { useUI } from "../context/UIContext";
import { motion } from "motion/react";
import { sovereignPageTransition } from "../constants/motions";
import {
  Activity,
  Key,
  Database,
  Cpu,
  Landmark,
  CreditCard,
  Users,
  Settings,
  Mail,
  Plus,
  Settings2,
  ArrowLeft,
  ArrowRight,
  Send,
} from "lucide-react";

import { ErrorBoundary } from '../components/ErrorBoundary';
import { CommandCenter } from './admin/CommandCenter';
import { ApiKeysVault } from './admin/ApiKeysVault';
import { DatabaseOrchestration } from './admin/DatabaseOrchestration';
import { Orchestrator } from './admin/Orchestrator';
import { FinanceVault } from './admin/FinanceVault';
import { DigitalFinancialRadar } from './admin/DigitalFinancialRadar';
import { PlansSubscriptions } from './admin/PlansSubscriptions';
import { UserManagement } from './admin/UserManagement';
import { SmartEmailHub } from './admin/SmartEmailHub';
import { MassBroadcast } from './admin/MassBroadcast';
import { SystemSettings } from './admin/SystemSettings';

export const AdminDashboard: React.FC = () => {
  const { t, theme, dir, language } = useTheme();
  const { token, user } = useAuth();
  const { socket } = useSocket();
  const { setIsOperationPending } = useUI();
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
      <div
        className={`sticky top-[72px] z-20 -mx-6 md:-mx-8 px-4 md:px-8 py-3 mb-4 transition-all duration-[var(--theme-transition-duration)] ${
          theme === "dark" ? "bg-[var(--bg-base)]/95" : "bg-[var(--bg-surface)]/95"
        } backdrop-blur-md border-b border-[var(--border)] flex items-center justify-between`}
      >
        <div className="flex items-center gap-2 md:gap-4 max-w-[70%] sm:max-w-none">
          {path !== "dashboard" && (
            <button
              onClick={() => navigate("/admin/dashboard")}
              className="p-1.5 md:p-2.5 rounded-[var(--radius)] transition-all duration-[var(--theme-transition-duration)] flex items-center justify-center bg-[var(--bg-surface)] hover:bg-[var(--bg-base)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border)]"
              title={t("back")}
            >
              {dir === "rtl" ? (
                <ArrowRight size={16} className="md:size-5" />
              ) : (
                <ArrowLeft size={16} className="md:size-5" />
              )}
            </button>
          )}
          <div className="flex items-center gap-2 md:gap-4 min-w-0">
            <div
              className="p-1.5 md:p-2.5 rounded-[var(--radius)] bg-[var(--bg-surface)] shadow-sm border border-[var(--border)] hidden xs:block"
            >
              {getIcon()}
            </div>
            <div className="min-w-0">
              <h1 className="text-base md:text-3xl font-black tracking-tight uppercase leading-none text-[var(--text-primary)] truncate">
                {getTitle()}
              </h1>
              <p className="text-[7px] md:text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest mt-1 opacity-60 truncate">
                {getSubTitle()}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          {showAddButton && (
            <button
              onClick={handleAddClick}
              className="flex items-center gap-1.5 md:gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-3 md:px-5 py-1.5 md:py-2.5 rounded-[4px] transition-all duration-300 font-bold text-[10px] md:text-sm shadow-lg shadow-emerald-500/20"
            >
              <Plus size={14} className="md:size-[18px]" />
              <span className="hidden xs:inline">{getAddButtonText()}</span>
              <span className="xs:hidden uppercase">{t('add')}</span>
            </button>
          )}

          <div
            className="hidden md:flex items-center gap-2 px-3 py-2 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-surface)]"
          >
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-tighter">
              Live Monitor
            </span>
          </div>
        </div>
      </div>

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
            <CommandCenter />
          ) : path === "radar" ? (
            <DigitalFinancialRadar />
          ) : path === "keys" ? (
            <ApiKeysVault
              providerModels={providerModels}
              setProviderModels={setProviderModels}
            />
          ) : path === "databases" ? (
            <DatabaseOrchestration />
          ) : path === "orchestrator" ? (
            <Orchestrator
              providerModels={providerModels}
            />
          ) : path === "finance" ? (
            <FinanceVault />
          ) : path === "plans" ? (
            <PlansSubscriptions />
          ) : path === "users" ? (
            <UserManagement />
          ) : path === "emails" ? (
            <SmartEmailHub />
          ) : path === "broadcast" ? (
            <MassBroadcast />
          ) : path === "settings" ? (
            <SystemSettings />
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

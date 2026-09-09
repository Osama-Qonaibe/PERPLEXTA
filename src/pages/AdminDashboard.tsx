import { ErrorBoundary } from "../components/ErrorBoundary";
import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import { useToast } from "../hooks/useToast";
import { motion, AnimatePresence } from "motion/react";
import { perplextaPageTransition } from "../constants/motions";
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
  Palette,
  Brain,
  Globe,
  ShieldAlert,
  Send,
  Shield,
  UserPlus,
  Server,
  MonitorSmartphone,
} from "lucide-react";
import { ReferralDashboardView } from "./ReferralDashboardView";
import { AdsManagementView } from "./AdsManagementView";
import { UserManagementView } from "./UserManagementView";
import { AdminRateLimitMetricsView } from "./AdminRateLimitMetricsView";
import { AdminRenderMetricsView } from "../components/AdminRenderMetricsView";
import { SeoCenterView } from "../components/SeoCenterView";
import { PagePreviewModal } from "../components/PagePreviewModal";

import { CommandCenterView } from "../components/admin/CommandCenterView";
import { ApiKeysVaultView } from "../components/admin/ApiKeysVaultView";
import { GpuInfrastructureView } from "../components/admin/GpuInfrastructureView";
import { DatabaseOrchestrationView } from "../components/admin/DatabaseOrchestrationView";
import { OrchestratorView } from "../components/admin/OrchestratorView";
import { FinanceVaultView } from "../components/admin/FinanceVaultView";
import { PlansSubscriptionsView } from "../components/admin/PlansSubscriptionsView";
import { SmartEmailHubView } from "../components/admin/SmartEmailHubView";
import { MassBroadcastView } from "../components/admin/MassBroadcastView";
import { MemoryCenterView } from "../components/admin/MemoryCenterView";
import { SystemSettingsView } from "../components/admin/SystemSettingsView";
import { ThemeStudioView } from "../components/admin/ThemeStudioView";

// --- Compliance Audit Logs View ---
import { ComplianceAuditLogsView } from "../components/admin/ComplianceAuditLogsView";
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
    isMobile,
  } = useAppContext();
  const location = useLocation();
  const navigate = useNavigate();

  const [isRtl, setIsRtl] = useState(language === "ar");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
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
      "gpu",
      "databases",
      "finance",
      "settings",
      "theme",
      "orchestrator",
      "audit",
    ];
    if (isSupport && sensitivePaths.includes(path)) {
      navigate("/admin/dashboard");
    }
  }, [user, path, isSupport, navigate]);

  const [providerModels, setProviderModels] = useState<Record<string, any[]>>(
    {},
  );
  const { toast, showToast } = useToast(3000);

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
    if (token && (path === "orchestrator" || path === "keys" || Object.keys(providerModels).length === 0)) {
      fetchProviderModels();
    }
  }, [token, path]);

  const [pulseData, setPulseData] = useState<any>(null);
  const [isPulseOpen, setIsPulseOpen] = useState(false);
  const [pulseErrorCount, setPulseErrorCount] = useState(0);

  const fetchPulseData = async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/admin/pulse", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPulseData(data);
        setPulseErrorCount(0);
      } else {
        setPulseErrorCount((prev) => prev + 1);
      }
    } catch {
      setPulseErrorCount((prev) => prev + 1);
    }
  };

  useEffect(() => {
    if (token) {
      fetchPulseData();
      const interval = setInterval(() => {
        if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
        fetchPulseData();
      }, 30000);

      const handleVisibility = () => {
        if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
          fetchPulseData();
        }
      };
      document.addEventListener('visibilitychange', handleVisibility);

      return () => {
        clearInterval(interval);
        document.removeEventListener('visibilitychange', handleVisibility);
      };
    }
  }, [token]);

  const formatPulseUptime = (seconds: number) => {
    if (!seconds) return "0s";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const formatPulseRelative = (isoString: string | null) => {
    if (!isoString) return language === "ar" ? "معلق" : "Pending";
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    
    if (diffSec < 10) return language === "ar" ? "الآن" : "Just now";
    if (diffSec < 60) return language === "ar" ? `منذ ${diffSec} ثانية` : `${diffSec}s ago`;
    if (diffMin < 60) return language === "ar" ? `منذ ${diffMin} دقيقة` : `${diffMin}m ago`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return language === "ar" ? `منذ ${diffHour} ساعة` : `${diffHour}h ago`;
    return new Date(isoString).toLocaleDateString(language === "ar" ? "ar-EG" : "en-US", { hour: "2-digit", minute: "2-digit" });
  };

  const getTitle = () => {
    switch (path) {
      case "dashboard":
        return t("commandCenter");
      case "radar":
        return language === "ar" ? "رادار الأمان" : "Security Radar";
      case "keys":
        return t("aiInfrastructure");
      case "gpu":
        return language === "ar" ? "مزودي خوادم الـ GPU" : "GPU Infrastructure & Vault";
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
      case "memories":
        return language === "ar" ? "مركز الذاكرة" : "Memory Center";
      case "emails":
        return t("smartEmailHub");
      case "broadcast":
        return t("smartBroadcast");
      case "settings":
        return t("systemSettings");
      case "audit":
        return language === "ar" ? "التدقيق والامتثال" : "Compliance Audit Trail";
      case "referrals":
        return t("referralDashboard");
      case "seo":
        return language === "ar" ? "تدقيق الميتاداتا والسيو" : "SEO Audit & AI Population";
      case "theme":
        return language === "ar" ? "استوديو المظهر والثيمات" : "Theme Studio & Tokens";
      case "metrics":
        return language === "ar" ? "مقاييس الأداء ورندر المكونات" : "Render & Latency Metrics";
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
      case "radar":
        return language === "ar"
          ? "رادار مراقبة الهجمات المباشر"
          : "LIVE SECURITY RADAR & THREAT INTELLIGENCE";
      case "keys":
        return language === "ar"
          ? "إدارة مفاتيح الوصول والبنية التحتية"
          : "ACCESS KEYS & INFRASTRUCTURE VAULT";
      case "gpu":
        return language === "ar"
          ? "إدارة خوادم الحوسبة الرسومية ومعالجة الوسائط المنفصلة"
          : "ISOLATED GPU COMPUTE & MEDIA PROCESSING CLUSTERS";
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
      case "memories":
        return language === "ar"
          ? "إدارة وتكثيف ذاكرة المستخدمين واستقصاء الذكاء"
          : "MANUAL MEMORY DISTILLATION & AUDIT CENTRAL";
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
      case "audit":
        return language === "ar"
          ? "مراقبة العمليات الحساسة وإعدادات الامتثال الأمني"
          : "SECURE CRITICAL METADATA AUDITING & SECURITY COMPLIANCE";
      case "referrals":
        return language === "ar"
          ? "مراقبة وإحصاءات برنامج الإحالات والتحويلات"
          : "REFERRAL PROGRAM STATISTICS & CONVERSION INTELLIGENCE";
      case "seo":
        return language === "ar"
          ? "مراقبة وتوليد الميتاداتا وفحص جاهزية محركات البحث"
          : "METADATA AUDITING, AI GENERATION & REAL-TIME PROGRESS MONITORING";
      case "theme":
        return language === "ar"
          ? "تحكم دقيق وشامل في كل لون وكل سطر في الثيمات"
          : "SOVEREIGN CONTROL OVER EVERY COLOR TOKEN AND THEME SURFACE";
      case "metrics":
        return language === "ar"
          ? "مراقبة زمن الانتقال وتتبع أداء المكونات برمجياً"
          : "COMPONENT RENDER TELEMETRY & LATENCY MONITORING";
      default:
        return "MANAGEMENT COMMAND CENTER";
    }
  };

  const getIcon = () => {
    const iconClass =
      "text-accent ";
    switch (path) {
      case "dashboard":
        return <Activity size={28} className={iconClass} />;
      case "radar":
        return <Shield size={28} className={iconClass} />;
      case "metrics":
        return <Activity size={28} className={iconClass} />;
      case "keys":
        return <Key size={28} className={iconClass} />;
      case "gpu":
        return <Server size={28} className={iconClass} />;
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
      case "memories":
        return <Brain size={28} className={iconClass} />;
      case "emails":
        return <Mail size={28} className={iconClass} />;
      case "broadcast":
        return <Send size={28} className={iconClass} />;
      case "settings":
        return <Settings size={28} className={iconClass} />;
      case "audit":
        return <ShieldAlert size={28} className={iconClass} />;
      case "referrals":
        return <UserPlus size={28} className={iconClass} />;
      case "seo":
        return <Globe size={28} className={iconClass} />;
      case "theme":
        return <Palette size={28} className={iconClass} />;
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

  const isOptimal = pulseData && pulseData.status === 'optimal' && pulseErrorCount < 3;
  const isDegraded = pulseData && pulseData.status === 'degraded' && pulseErrorCount < 3;
  const pulseColor = isOptimal ? '#334155' : isDegraded ? '#f59e0b' : '#f43f5e';
  const pulseText = isOptimal 
    ? (language === 'ar' ? 'ممتاز' : 'Optimal') 
    : isDegraded 
    ? (language === 'ar' ? 'منخفض' : 'Degraded') 
    : (language === 'ar' ? 'معطل' : 'Disrupted');
  const pulseGlowClass = isOptimal 
    ? 'text-accent ' 
    : isDegraded 
    ? 'text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]' 
    : 'text-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]';

  if (isMobile) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-[calc(100vh-72px)] bg-[var(--bg-base)] text-center p-6 transition-theme">
        <MonitorSmartphone size={64} className="text-gray-400 mb-6 drop-shadow-sm" />
        <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-3 tracking-tight">
          {language === 'ar' ? 'غير متاح على الجوال' : 'Not Available on Mobile'}
        </h2>
        <p className="text-base text-gray-500 max-w-sm leading-relaxed">
          {language === 'ar'
            ? 'لوحة الإدارة مصممة للشاشات الكبيرة لضمان تجربة تحكم احترافية. يرجى فتح هذه الصفحة من جهاز كمبيوتر مكتبي.'
            : 'The Admin Dashboard is optimized for larger screens to ensure a professional control experience. Please access this page from a desktop computer.'}
        </p>
        <button
          onClick={() => navigate("/chat")}
          className="mt-6 px-5 py-2.5 bg-accent hover:bg-accent/90 text-white rounded-[var(--radius-md)] text-sm font-semibold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
        >
          {language === 'ar' ? 'العودة للمحادثة' : 'Back to Chat'}
        </button>
      </div>
    );
  }

  return (
    <motion.div 
      initial="initial"
      animate="animate"
      exit="exit"
      variants={perplextaPageTransition}
      className="flex flex-col w-full"
    >
      {/* Sticky Admin Header - Elite Command Layer */}
      <div
        className="sticky top-[72px] z-20 -mx-6 md:-mx-8 px-6 md:px-8 py-3 mb-4 transition-theme bg-[var(--surface-page)]/95 backdrop-blur-md border-b border-[var(--border-main)] flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          {path !== "dashboard" && (
            <button
              onClick={() => navigate("/admin/dashboard")}
              className="p-2.5 rounded-[var(--radius-sm)] transition-theme flex items-center justify-center bg-[var(--surface-card)] hover:bg-[var(--surface-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-main)] shadow-xs"
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
              className="p-2.5 rounded-[var(--radius-sm)] bg-[var(--surface-card)] shadow-xs border border-[var(--border-main)] transition-theme text-[var(--text-primary)]"
            >
              {getIcon()}
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight uppercase leading-none text-[var(--text-primary)] transition-theme">
                {getTitle()}
              </h1>
              <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest mt-1 opacity-70">
                {getSubTitle()}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {showAddButton && (
            <button
              onClick={handleAddClick}
              className="flex items-center gap-2 bg-[var(--bg-accent-emphasis)] hover:opacity-90 text-[var(--fg-on-emphasis)] px-5 py-2.5 rounded-[var(--radius-sm)] transition-theme font-bold text-sm shadow-sm active:scale-95 cursor-pointer"
            >
              <Plus size={18} />
              {getAddButtonText()}
            </button>
          )}

          <div className="relative">
            <button
              onClick={() => setIsPulseOpen(!isPulseOpen)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-[var(--radius-xs)] border border-[var(--border-main)] bg-[var(--surface-card)] transition-theme hover:bg-[var(--surface-subtle)] cursor-pointer select-none active:scale-95"
            >
              <div className="relative flex items-center justify-center">
                <div 
                  className="w-2 h-2 rounded-full absolute animate-ping opacity-75" 
                  style={{ backgroundColor: pulseColor }} 
                />
                <div 
                  className="w-2 h-2 rounded-full relative" 
                  style={{ backgroundColor: pulseColor }} 
                />
              </div>
              <span className={`text-[10px] font-black uppercase tracking-tighter ${pulseGlowClass}`}>
                {language === 'ar' ? 'نبض النظام' : 'System Pulse'}: {pulseText}
              </span>
            </button>

            <AnimatePresence>
              {isPulseOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsPulseOpen(false)} 
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className={`absolute ${language === 'ar' ? 'left-0' : 'right-0'} top-full mt-2 w-96 z-50 p-4 rounded-[var(--radius-md)] border border-[var(--border-main)] bg-[var(--surface-card)] text-[var(--text-primary)] shadow-2xl transition-theme`}
                  >
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-[var(--border-main)]">
                      <div className="flex items-center gap-2">
                        <Activity size={16} className={pulseGlowClass} />
                        <span className="text-[11px] font-black uppercase tracking-wider text-[var(--text-primary)]">
                          {language === 'ar' ? 'فحص تشخيصي للنبض' : 'Pulse System Diagnostics'}
                        </span>
                      </div>
                      <span className="text-[9px] font-bold text-[var(--text-muted)] font-mono">
                        {pulseData ? formatPulseUptime(pulseData.uptime) : '0s'}
                      </span>
                    </div>

                    <div className="mb-4 bg-[var(--surface-subtle)] rounded-[var(--radius-xs)] p-2 border border-[var(--border-main)] overflow-hidden">
                      <svg className="w-full h-10 stroke-current opacity-90" viewBox="0 0 100 20" fill="none">
                        <motion.path
                          d="M 0,10 Q 15,10 20,10 T 30,10 T 32,5 T 34,15 T 36,1 T 38,19 T 40,10 T 50,10 T 60,10 T 62,3 T 64,17 T 66,10 T 80,10 T 90,10 T 100,10"
                          stroke={pulseColor}
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          initial={{ strokeDasharray: "200", strokeDashoffset: "200" }}
                          animate={{ strokeDashoffset: ["200", "0"] }}
                          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                        />
                      </svg>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <div className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5 border-b border-[var(--border-main)]/60 pb-0.5">
                          {language === 'ar' ? 'عقد قواعد البيانات ومزامنتها' : 'Database Node Synchronization'}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[10px]">
                          <div className="p-1.5 rounded-[var(--radius-xs)] bg-[var(--surface-subtle)] border border-[var(--border-main)] flex flex-col justify-between">
                            <span className="text-[8px] text-[var(--text-muted)] font-bold">{language === 'ar' ? 'قاعدة البيانات المركزية' : 'Core Engine DB'}</span>
                            <span className={`font-black ${pulseData?.databases?.core?.status === 'connected' ? 'text-accent' : 'text-rose-500'}`}>
                              {pulseData?.databases?.core?.status === 'connected' ? `Connected (${pulseData.databases.core.latencyMs}ms)` : 'Offline'}
                            </span>
                          </div>
                          <div className="p-1.5 rounded-[var(--radius-xs)] bg-[var(--surface-subtle)] border border-[var(--border-main)] flex flex-col justify-between">
                            <span className="text-[8px] text-[var(--text-muted)] font-bold">{language === 'ar' ? 'دفتر الحسابات والمالية' : 'Ledger Vault DB'}</span>
                            <span className={`font-black ${pulseData?.databases?.ledger?.status === 'connected' ? 'text-accent' : 'text-rose-500'}`}>
                              {pulseData?.databases?.ledger?.status === 'connected' ? `Connected (${pulseData.databases.ledger.latencyMs}ms)` : 'Offline'}
                            </span>
                          </div>
                          <div className="p-1.5 rounded-[var(--radius-xs)] bg-[var(--surface-subtle)] border border-[var(--border-main)] flex flex-col justify-between">
                            <span className="text-[8px] text-[var(--text-muted)] font-bold">{language === 'ar' ? 'السحابة الخارجية' : 'External Sync Registry'}</span>
                            <span className={`font-black ${pulseData?.databases?.external?.status === 'connected' ? 'text-accent' : 'text-rose-500'}`}>
                              {pulseData?.databases?.external?.status === 'connected' ? `Connected (${pulseData.databases.external.latencyMs}ms)` : 'Offline'}
                            </span>
                          </div>
                          <div className="p-1.5 rounded-[var(--radius-xs)] bg-[var(--surface-subtle)] border border-[var(--border-main)] flex flex-col justify-between">
                            <span className="text-[8px] text-[var(--text-muted)] font-bold">{language === 'ar' ? 'حماية وأمن البيانات' : 'Security Registry'}</span>
                            <span className={`font-black ${pulseData?.databases?.security?.status === 'connected' ? 'text-accent' : 'text-rose-500'}`}>
                              {pulseData?.databases?.security?.status === 'connected' ? `Connected (${pulseData.databases.security.latencyMs}ms)` : 'Offline'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5 border-b border-[var(--border-main)]/60 pb-0.5">
                          {language === 'ar' ? 'العمليات الخلفية النشطة' : 'Background Process Handlers'}
                        </div>
                        <div className="space-y-1 text-[9px] text-[var(--text-muted)] font-medium font-sans">
                          <div className="flex justify-between items-center bg-[var(--surface-subtle)] px-2 py-1 rounded-[var(--radius-xs)]">
                            <span>{language === 'ar' ? 'الصيانة والمسح اليومي' : 'Daily Maintenance & Trash Purge'}</span>
                            <span className={`font-bold ${pulseData?.cronTasks?.dailyMaintenance?.status === 'success' ? 'text-accent' : pulseData?.cronTasks?.dailyMaintenance?.status === 'running' ? 'text-amber-400' : 'text-purple-400'}`}>
                              {pulseData?.cronTasks?.dailyMaintenance ? `${formatPulseRelative(pulseData.cronTasks.dailyMaintenance.lastRun)}` : 'Pending'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center bg-[var(--surface-subtle)] px-2 py-1 rounded-[var(--radius-xs)]">
                            <span>{language === 'ar' ? 'نبض المزامنة الذكية' : 'Database Pulse Tracker'}</span>
                            <span className={`font-bold ${pulseData?.cronTasks?.databaseHeartbeat?.status === 'success' ? 'text-accent' : pulseData?.cronTasks?.databaseHeartbeat?.status === 'running' ? 'text-amber-400' : 'text-purple-400'}`}>
                              {pulseData?.cronTasks?.databaseHeartbeat ? `${formatPulseRelative(pulseData.cronTasks.databaseHeartbeat.lastRun)}` : 'Pending'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center bg-[var(--surface-subtle)] px-2 py-1 rounded-[var(--radius-xs)]">
                            <span>{language === 'ar' ? 'تنظيف الجلسات المؤقتة' : 'Auth Token & Session Purge'}</span>
                            <span className={`font-bold ${pulseData?.cronTasks?.expiredTokensCleanup?.status === 'success' ? 'text-accent' : pulseData?.cronTasks?.expiredTokensCleanup?.status === 'running' ? 'text-amber-400' : 'text-purple-400'}`}>
                              {pulseData?.cronTasks?.expiredTokensCleanup ? `${formatPulseRelative(pulseData.cronTasks.expiredTokensCleanup.lastRun)}` : 'Pending'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center bg-[var(--surface-subtle)] px-2 py-1 rounded-[var(--radius-xs)]">
                            <span>{language === 'ar' ? 'تدقيق الاشتراكات الفعالة' : 'Subscription Renewal Audits'}</span>
                            <span className={`font-bold ${pulseData?.cronTasks?.subscriptionAudit?.status === 'success' ? 'text-accent' : pulseData?.cronTasks?.subscriptionAudit?.status === 'running' ? 'text-amber-400' : 'text-purple-400'}`}>
                              {pulseData?.cronTasks?.subscriptionAudit ? `${formatPulseRelative(pulseData.cronTasks.subscriptionAudit.lastRun)}` : 'Pending'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center bg-[var(--surface-subtle)] px-2 py-1 rounded-[var(--radius-xs)]">
                            <span>{language === 'ar' ? 'ضغط وتقليص ذاكرة الذكاء' : 'Memory Distillation Cycle'}</span>
                            <span className={`font-bold ${pulseData?.cronTasks?.memoryCompaction?.status === 'success' ? 'text-accent' : pulseData?.cronTasks?.memoryCompaction?.status === 'running' ? 'text-amber-400' : 'text-purple-400'}`}>
                              {pulseData?.cronTasks?.memoryCompaction ? `${formatPulseRelative(pulseData.cronTasks.memoryCompaction.lastRun)}` : 'Pending'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-1.5 border-t border-[var(--border-main)]/60">
                        <div className="grid grid-cols-2 gap-4 text-[9px] text-[var(--text-muted)] font-bold">
                          <div>
                            <div className="flex justify-between mb-1">
                              <span>CPU UTILIZATION</span>
                              <span>{pulseData?.cpu ?? 0}%</span>
                            </div>
                            <div className="h-1 bg-[var(--border-main)] rounded-full overflow-hidden">
                              <div className="h-full bg-accent" style={{ width: `${pulseData?.cpu ?? 0}%` }} />
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between mb-1">
                              <span>HEAP ALLOC</span>
                              <span>{pulseData?.memory?.percent ?? 0}%</span>
                            </div>
                            <div className="h-1 bg-[var(--border-main)] rounded-full overflow-hidden">
                              <div className="h-full bg-purple-500" style={{ width: `${pulseData?.memory?.percent ?? 0}%` }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div
        className={`relative transition-theme ${
          ["dashboard", "radar", "databases", "orchestrator", "keys", "gpu", "finance", "plans", "users", "emails", "broadcast", "settings", "audit", "referrals", "ads", "metrics", "seo", "theme"].includes(
            path,
          )
            ? ""
            : `p-6 md:p-8 rounded-[var(--radius-md)] border border-[var(--border-main)] bg-[var(--surface-card)] shadow-xl`
        }`}
      >
        <ErrorBoundary name="Admin Command Panels">
          {path === "dashboard" ? (
            <CommandCenterView theme={theme} t={t} showToast={showToast} />
          ) : path === "radar" ? (
            <ComplianceAuditLogsView theme={theme} t={t} dir={dir} initialTab="radar" />
          ) : path === "metrics" ? (
            <ComplianceAuditLogsView theme={theme} t={t} dir={dir} initialTab="metrics" />
          ) : path === "keys" ? (
            <ApiKeysVaultView
              theme={theme}
              t={t}
              dir={dir}
              providerModels={providerModels}
              setProviderModels={setProviderModels}
              showToast={showToast}
            />
          ) : path === "gpu" ? (
            <GpuInfrastructureView
              theme={theme}
              t={t}
              dir={dir}
              showToast={showToast}
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
              showToast={showToast}
              onRefreshModels={fetchProviderModels}
            />
          ) : path === "finance" ? (
            <FinanceVaultView theme={theme} t={t} dir={dir} showToast={showToast} />
          ) : path === "plans" ? (
            <PlansSubscriptionsView theme={theme} t={t} dir={dir} />
          ) : path === "users" ? (
            <UserManagementView theme={theme} t={t} dir={dir} showToast={showToast} />
          ) : path === "memories" ? (
            <MemoryCenterView theme={theme} t={t} dir={dir} language={language} />
          ) : path === "emails" ? (
            <SmartEmailHubView theme={theme} t={t} dir={dir} showToast={showToast} />
          ) : path === "broadcast" ? (
            <MassBroadcastView
              theme={theme}
              t={t}
              dir={dir}
              language={language}
            />
          ) : path === "settings" ? (
            <SystemSettingsView theme={theme} t={t} dir={dir} />
          ) : path === "audit" ? (
            <ComplianceAuditLogsView theme={theme} t={t} dir={dir} />
          ) : path === "referrals" ? (
            <ReferralDashboardView theme={theme} t={t} dir={dir} />
          ) : path === "ads" ? (
            <AdsManagementView theme={theme} t={t} dir={dir} language={language} />
          ) : path === "seo" ? (
            <SeoCenterView theme={theme} t={t} dir={dir} language={language} showToast={showToast} />
          ) : path === "theme" ? (
            <ThemeStudioView t={t} showToast={showToast} token={token} language={language} />
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

      <AnimatePresence>
        {previewUrl && (
          <PagePreviewModal url={previewUrl} onClose={() => setPreviewUrl(null)} />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

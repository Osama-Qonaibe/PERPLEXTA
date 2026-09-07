import { ErrorBoundary } from "../components/ErrorBoundary";
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
  Palette,
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

import { CommandCenterView } from "../components/admin/CommandCenterView";
import { ApiKeysVaultView } from "../components/admin/ApiKeysVaultView";
import { GpuInfrastructureView } from "../components/admin/GpuInfrastructureView";
import { DatabaseOrchestrationView } from "../components/admin/DatabaseOrchestrationView";
import { OrchestratorView } from "../components/admin/OrchestratorView";
import { FinanceVaultView } from "../components/admin/FinanceVaultView";
import { PlansSubscriptionsView } from "../components/admin/PlansSubscriptionsView";
import { SmartEmailHubView } from "../components/admin/SmartEmailHubView";
import { MassBroadcastView } from "../components/admin/MassBroadcastView";
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

  if (isMobile) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center select-none" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mb-4">
          <Monitor size={36} className="text-amber-500 animate-pulse" />
        </div>
        <h2 className="text-lg font-black text-[var(--text-primary)] mb-1">
          {isRtl ? 'لوحة التحكم متاحة فقط عبر سطح المكتب' : 'Command Center is Desktop-Only'}
        </h2>
        <p className="text-xs text-gray-400 max-w-sm">
          {isRtl 
            ? 'تم تعطيل لوحة قيادة الإدارة لبيربليكستا على أجهزة الهاتف لتهيئة النظام بشكل أسرع وأكثر مرونة. يرجى استخدام حاسوب لإجراء المهام الإدارية.' 
            : 'For pristine local performance and absolute operational security, the Command Center interface is exclusively restricted to desktop displays. Please use a PC.'}
        </p>
        <a href="/" className="mt-6 px-4 py-2 border border-accent/30 rounded-sm hover:border-accent text-accent text-xs font-bold transition-theme">
          {isRtl ? 'العودة للرئيسية' : 'Back to Home'}
        </a>
      </div>
    );
  }

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
            <AdminRateLimitMetricsView theme={theme} t={t} />
          ) : path === "metrics" ? (
            <AdminRenderMetricsView />
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
        {(toast as any) && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            className={`fixed bottom-6 ${dir === "rtl" ? "left-6" : "right-6"} z-[999] px-5 py-3.5 rounded-[var(--radius)] shadow-2xl flex items-center gap-3 backdrop-blur-md border ${
              (toast as any).type === "success"
                ? "bg-accent/10 border-accent/20 text-accent"
                : (toast as any).type === "error"
                  ? "bg-red-500/10 border-red-500/20 text-red-500"
                  : "bg-blue-500/10 border-blue-500/20 text-blue-500"
            }`}
            style={{
              boxShadow:
                (toast as any).type === "success"
                  ? "0 10px 30px rgba(156,163,175,0.15)"
                  : "0 10px 30px rgba(239,68,68,0.15)",
            }}
          >
            <span
              className={`w-2 h-2 rounded-full ${(toast as any).type === "success" ? "bg-accent animate-pulse" : "bg-red-500"}`}
            />
            <span className="font-bold text-sm tracking-tight">
              {(toast as any).message}
            </span>
          </motion.div>
        )}
        {previewUrl && (
          <PagePreviewModal url={previewUrl} onClose={() => setPreviewUrl(null)} />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

import React, { useState } from "react";
import { useAppContext } from "../context/AppContext";
import {
  ShieldCheck,
  ArrowLeft,
  MonitorSmartphone,
  CreditCard,
  Users,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Header } from "../components/Header";
import { AuthModal } from "../components/AuthModal";
import { PlansSubscriptionsView } from "../components/PlansSubscriptionsView";
import { ReferralDashboardView } from "./ReferralDashboardView";
import { perplextaPageTransition } from "../constants/motions";

export const AdminAgencyPage: React.FC = () => {
  const { language, user, isMobile, theme, t } = useAppContext();
  const [activeTab, setActiveTab] = useState<"plans" | "agents">("plans");

  const isRtl = language === "ar";
  const dir = isRtl ? "rtl" : "ltr";

  const AgencySidebar = () => {
    return (
      <aside
        className={`fixed top-[72px] bottom-0 h-[calc(100dvh-72px)] flex flex-col z-[70] shadow-2xl bg-[var(--bg-base)] border-[var(--border)] ${
          dir === "rtl" ? "right-0 border-l" : "left-0 border-r"
        } translate-x-0 visible transition-colors`}
        style={{
          width: isMobile ? "68%" : "240px",
          maxWidth: isMobile ? "260px" : "none",
        }}
      >
        <div className="p-4 border-b border-[var(--border)]">
          <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest opacity-80">
            {isRtl ? "المركز الأمني للوكلاء" : "AGENCY CONSOLE"}
          </p>
        </div>
        <nav className="flex-1 px-3 space-y-1 pt-[25px] overflow-y-auto custom-scrollbar scroll-smooth">
          <button
            onClick={() => setActiveTab("plans")}
            className={`w-full group flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius)] transition-theme border border-transparent ${
              activeTab === "plans"
                ? "bg-accent/10 text-accent border-accent/10 shadow-[0_0_15px_rgba(156,163,175,0.05)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-overlay)]"
            }`}
          >
            <div
              className={`transition-theme ${activeTab === "plans" ? "text-accent" : "text-[var(--text-muted)] group-hover:text-accent"}`}
            >
              <CreditCard size={18} />
            </div>
            <span
              className={`font-medium text-sm transition-colors ${activeTab === "plans" ? "text-accent" : ""}`}
            >
              {isRtl ? "الخطط والاشتراكات" : "Plans & Subscriptions"}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("agents")}
            className={`w-full group flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius)] transition-theme border border-transparent ${
              activeTab === "agents"
                ? "bg-accent/10 text-accent border-accent/10 shadow-[0_0_15px_rgba(156,163,175,0.05)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-overlay)]"
            }`}
          >
            <div
              className={`transition-theme ${activeTab === "agents" ? "text-accent" : "text-[var(--text-muted)] group-hover:text-accent"}`}
            >
              <Users size={18} />
            </div>
            <span
              className={`font-medium text-sm transition-colors ${activeTab === "agents" ? "text-accent" : ""}`}
            >
              {isRtl ? "الوكلاء والإحالات" : "Agents & Referrals"}
            </span>
          </button>
        </nav>

        {/* Bottom Navigation Lock */}
        <div className="p-4 border-t border-[var(--border)] mt-auto transition-colors">
          <a
            href="/admin/dashboard"
            className="group flex items-center justify-between px-4 py-3 rounded-[var(--radius)] transition-theme border border-[var(--border)] bg-[var(--bg-surface)] hover:bg-[var(--bg-base)] hover:border-accent/30 shadow-sm hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <div className="text-[var(--text-muted)] group-hover:text-accent transition-theme">
                <ArrowLeft
                  size={18}
                  className={dir === "rtl" ? "rotate-180" : ""}
                />
              </div>
              <span className="font-bold text-sm text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                {isRtl ? "المركز الرئيسي" : "Command Center"}
              </span>
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-accent opacity-0 group-hover:opacity-100 transition-theme"></div>
          </a>
        </div>
      </aside>
    );
  };

  if (isMobile) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-[calc(100vh-72px)] bg-[var(--bg-base)] text-center p-6 transition-theme">
        <MonitorSmartphone
          size={64}
          className="text-gray-400 mb-6 drop-shadow-sm"
        />
        <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-3 tracking-tight">
          {language === "ar"
            ? "غير متاح على الجوال"
            : "Not Available on Mobile"}
        </h2>
        <p className="text-base text-gray-500 max-w-sm leading-relaxed">
          {language === "ar"
            ? "لوحة الإدارة مصممة للشاشات الكبيرة لضمان تجربة تحكم احترافية. يرجى فتح هذه الصفحة من جهاز كمبيوتر مكتبي."
            : "The Admin Dashboard is optimized for larger screens to ensure a professional control experience. Please access this page from a desktop computer."}
        </p>
      </div>
    );
  }

  if (user?.role !== "admin") {
    return (
      <div
        className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center select-none"
        dir={isRtl ? "rtl" : "ltr"}
      >
        <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-505 flex items-center justify-center mb-4">
          <ShieldCheck size={32} />
        </div>
        <h2 className="text-2xl font-black text-[var(--text-primary)] tracking-tight mb-2">
          {isRtl ? "وصول مرفوض" : "Access Denied"}
        </h2>
        <p className="text-xs text-gray-400 max-w-sm">
          {isRtl
            ? "هذه اللوحة مخصصة لإدارة العمليات ومحميّة بالكامل ببروتوكولات التشفير الرقابية."
            : "This secure administrative console requires verified staff credentials."}
        </p>
        <a
          href="/"
          className="mt-6 px-4 py-2 border border-accent/30 rounded-sm hover:border-accent text-accent text-xs font-bold transition-theme"
        >
          {isRtl ? "الرئيسية" : "Go Home"}
        </a>
      </div>
    );
  }

  return (
    <div
      className={`flex h-[100dvh] w-full overflow-hidden relative bg-[var(--bg-base)] text-[var(--text-primary)]`}
    >
      <div className={`absolute inset-0 z-0 bg-[var(--bg-base)]`} />
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          dir={dir}
          initial="initial"
          animate="animate"
          exit="exit"
          variants={perplextaPageTransition}
          className="flex h-full w-full overflow-hidden relative z-10"
        >
          <AgencySidebar />
          <div
            style={{
              marginLeft: isMobile ? 0 : dir === "rtl" ? 0 : 240,
              marginRight: isMobile ? 0 : dir === "rtl" ? 240 : 0,
              transition: "margin 0.2s ease",
            }}
            className="flex-1 flex flex-col relative min-w-0 overflow-hidden bg-inherit"
          >
            <Header activeLanguage={language} />
            <main className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth overscroll-none [WebkitOverflowScrolling:touch] bg-inherit">
              <div className="min-h-full flex flex-col pt-[72px] px-6 md:px-8 pb-12 w-full max-w-[1600px] mx-auto">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-gray-200/5 dark:border-gray-800/10 select-none">
                  <div className="flex items-center gap-4">
                    <div>
                      <h1 className="text-2xl md:text-3xl font-black tracking-tight uppercase leading-none text-[var(--text-primary)] transition-theme font-sans">
                        {isRtl ? "لوحة تحكم الوكلاء" : "Agency Dashboard"}
                      </h1>
                      <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest mt-1.5 opacity-80">
                        {isRtl
                          ? "المركز الأمني للوكلاء والاشتراكات"
                          : "AGENCY & SUBSCRIPTIONS CONSOLE"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-start md:self-auto text-[10px] uppercase font-mono tracking-wider text-accent font-bold select-none bg-accent/10 border border-accent/10 px-3 py-1.5 rounded-[4px]">
                    <ShieldCheck size={12} className="text-accent " />
                    <span>{isRtl ? "مدير الوكلاء" : "Agency Manager"}</span>
                  </div>
                </div>

                <div className="w-full">
                  {activeTab === "plans" ? (
                    <div className="space-y-8">
                      <div className="p-6 sm:p-8 rounded-lg border border-[var(--border-main)] bg-[var(--bg-secondary)] shadow-xl">
                        <PlansSubscriptionsView theme={theme || "dark"} t={t} dir={dir} />
                      </div>
                    </div>
                  ) : activeTab === "agents" ? (
                    <div className="space-y-8">
                      <div className="p-6 sm:p-8 rounded-lg border border-[var(--border-main)] bg-[var(--bg-secondary)] shadow-xl">
                        <ReferralDashboardView theme={theme || "dark"} t={t} dir={dir} />
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </main>
          </div>
        </motion.div>
      </AnimatePresence>
      <AuthModal />
    </div>
  );
};

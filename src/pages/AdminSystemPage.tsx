import React, { useState } from "react";
import { useAppContext } from "../context/AppContext";
import {
  ShieldCheck,
  ArrowLeft,
  Settings, Search,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { SeoCenterView } from "../components/SeoCenterView";
import { Header } from "../components/Header";
import { AuthModal } from "../components/AuthModal";
import { perplextaPageTransition } from "../constants/motions";

export const AdminSystemPage: React.FC = () => {
  const { language, user, isMobile, theme, t } = useAppContext();
  const [activeTab, setActiveTab] = useState<"system" | "seo" | "maintenance">("seo");
  
    const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    if (type === 'error') toast.error(message);
    else if (type === 'warning') toast.warning(message);
    else if (type === 'info') toast.info(message);
    else toast.success(message);
  };

  const isRtl = language === "ar";
  const dir = isRtl ? "rtl" : "ltr";

  const SystemSidebar = () => {
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
            {isRtl ? "مركز النظام الأساسي" : "SYSTEM CONSOLE"}
          </p>
        </div>

        <nav className="flex-1 px-3 space-y-1 pt-[25px] overflow-y-auto custom-scrollbar scroll-smooth">
                    <button
            onClick={() => setActiveTab("seo")}
            className={`w-full group flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius)] transition-theme border border-transparent ${
              activeTab === "seo"
                ? "bg-accent/10 text-accent border-accent/10 shadow-[0_0_15px_rgba(156,163,175,0.05)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-overlay)]"
            }`}
          >
            <div
              className={`transition-theme ${activeTab === "seo" ? "text-accent" : "text-[var(--text-muted)] group-hover:text-accent"}`}
            >
              <Search size={18} />
            </div>
            <span
              className={`font-medium text-sm transition-colors ${activeTab === "seo" ? "text-accent" : ""}`}
            >
              {isRtl ? "مركز السيو" : "SEO Center"}
            </span>
          </button>
          
          <button
            onClick={() => setActiveTab("system")}
            className={`w-full group flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius)] transition-theme border border-transparent ${
              activeTab === "system"
                ? "bg-accent/10 text-accent border-accent/10 shadow-[0_0_15px_rgba(156,163,175,0.05)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-overlay)]"
            }`}
          >
            <div
              className={`transition-theme ${activeTab === "system" ? "text-accent" : "text-[var(--text-muted)] group-hover:text-accent"}`}
            >
              <Settings size={18} />
            </div>
            <span
              className={`font-medium text-sm transition-colors ${activeTab === "system" ? "text-accent" : ""}`}
            >
              {isRtl ? "إعدادات النظام" : "System Settings"}
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
              <span className="font-bold text-sm text-[var(--text-primary)] transition-theme">
                {isRtl ? "المركز الرئيسي" : "Main Center"}
              </span>
            </div>
            <ShieldCheck
              size={14}
              className="text-emerald-500 opacity-50 group-hover:opacity-100 transition-opacity"
            />
          </a>
        </div>
      </aside>
    );
  };

  return (
    <div className="flex h-screen w-full overflow-hidden relative bg-[var(--bg-base)] text-[var(--text-primary)]">
      <AnimatePresence mode="wait">
        <motion.div
          key="admin-system-page"
          className="flex h-full w-full overflow-hidden relative z-10 font-sans"
          dir={dir}
          initial="initial"
          animate="animate"
          exit="exit"
          variants={perplextaPageTransition}
        >
          <Header />
          <SystemSidebar />
          
          <div
            style={{ 
              marginLeft: isMobile ? 0 : (dir === 'rtl' ? 0 : 240),
              marginRight: isMobile ? 0 : (dir === 'rtl' ? 240 : 0),
              transition: 'margin 0.2s ease'
            }}
            className="flex-1 flex flex-col relative min-w-0 overflow-hidden bg-inherit"
          >
            <main className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth overscroll-none [WebkitOverflowScrolling:touch] bg-inherit">
              <div className="min-h-full flex flex-col pt-[72px] px-4 sm:px-6 md:px-8 pb-12 w-full max-w-7xl mx-auto">
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex-1">
                                
                  {activeTab === "seo" ? (
                    <SeoCenterView 
                      theme={theme} 
                      t={t} 
                      dir={dir} 
                      language={language} 
                      showToast={showToast} 
                    />
                  ) : null}
                  
                  {activeTab === "system" ? (
                    <div className="space-y-8">
                      <div className="p-6 sm:p-8 rounded-[var(--radius)] border border-[var(--border-main)] bg-[var(--bg-surface)] shadow-xl flex flex-col items-center justify-center min-h-[400px]">
                        <Settings size={48} className="text-gray-400/50 mb-4" />
                        <h2 className="text-xl font-bold mb-2">
                          {isRtl ? "لوحة تحكم النظام" : "System Dashboard"}
                        </h2>
                        <p className="text-[var(--text-muted)] font-medium text-center max-w-sm">
                          {isRtl
                            ? "لوحة تحكم النظام قيد التجهيز وسيتم نقل الأقسام المحددة إليها قريباً."
                            : "System Dashboard is being prepared. Specified sections will be migrated here shortly."}
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </main>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default AdminSystemPage;

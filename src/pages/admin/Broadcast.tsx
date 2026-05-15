import React, { useState, useEffect } from "react";
import { 
  Send, Users, Megaphone, CheckCircle, AlertCircle, 
  RefreshCw, Mail, BellRing, Zap, Activity, History,
  Megaphone as BroadcastIcon
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";

interface BroadcastProps {}

export const Broadcast: React.FC<BroadcastProps> = () => {
  const { theme, t, dir, language } = useTheme();
  const { token } = useAuth();
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
        const successMsg = t("broadcastSuccess") || "Broadcast sent to {count} users";
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className={`p-5 rounded-[4px] border ${theme === "dark" ? "bg-[#111111] border-gray-800/60" : "bg-white border-gray-200 shadow-sm"} group transition-all duration-300 hover:border-emerald-500/30`}>
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-[4px] bg-emerald-500/10 text-emerald-500 group-hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.4)] transition-all">
              <Send size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                {t("totalBroadcasts") || (language === "ar" ? "إجمالي الحملات" : "Total Campaigns")}
              </p>
              <p className="text-2xl font-black mt-1">{totalBroadcasts}</p>
            </div>
          </div>
        </div>
        <div className={`p-5 rounded-[4px] border ${theme === "dark" ? "bg-[#111111] border-gray-800/60" : "bg-white border-gray-200 shadow-sm"} group transition-all duration-300 hover:border-blue-500/30`}>
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-[4px] bg-blue-500/10 text-blue-500 group-hover:drop-shadow-[0_0_8px_rgba(59,130,246,0.4)] transition-all">
              <Users size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                {t("totalReached") || (language === "ar" ? "إجمالي الوصول" : "Total Reached")}
              </p>
              <p className="text-2xl font-black mt-1">{totalSent.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className={`p-5 rounded-[4px] border ${theme === "dark" ? "bg-emerald-500/5 border-emerald-500/20" : "bg-emerald-50/50 border-emerald-200 shadow-sm"} group transition-all duration-300`}>
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-[4px] bg-emerald-500/10 text-emerald-500">
              <Megaphone size={24} className="animate-bounce" />
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                {t("activeStatus") || (language === "ar" ? "حالة المحرك" : "Engine Status")}
              </p>
              <p className="text-2xl font-black mt-1 text-emerald-500">READY</p>
            </div>
          </div>
        </div>
      </div>

      {toast && (
        <div className={`fixed bottom-6 ${dir === "rtl" ? "left-6" : "right-6"} z-50 flex items-center gap-3 px-6 py-4 rounded-[4px] shadow-2xl transition-all duration-300 animate-in slide-in-from-bottom-5 ${toast.type === "success" ? (theme === "dark" ? "bg-[#1a1a1c] border border-emerald-500/30 text-emerald-500" : "bg-white border border-emerald-200 text-emerald-600") : (theme === "dark" ? "bg-[#1a1a1c] border border-red-500/30 text-red-500" : "bg-white border border-red-200 text-red-600")}`}>
          {toast.type === "success" ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <span className="font-medium text-sm">{toast.message}</span>
        </div>
      )}

      <AnimatePresence mode="wait">
        {showForm ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={`p-6 md:p-8 rounded-[4px] border ${theme === "dark" ? "bg-[#111111] border-gray-800/60" : "bg-white border-gray-200"} shadow-2xl shadow-black/5`}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">{t("broadcastType")}</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: "email", label: t("broadcastEmail"), icon: <Mail size={18} /> },
                      { id: "notification", label: t("broadcastNotification"), icon: <BellRing size={18} /> },
                      { id: "both", label: t("broadcastBoth"), icon: <Send size={18} /> },
                    ].map((type) => (
                      <button key={type.id} onClick={() => setForm({ ...form, broadcast_type: type.id })} className={`flex flex-col items-center justify-center gap-2 p-4 rounded-[4px] border transition-all duration-300 ${form.broadcast_type === type.id ? "bg-emerald-500/10 border-emerald-500 text-emerald-500 shadow-lg shadow-emerald-500/5" : `border-gray-200 dark:border-gray-800 text-gray-400 hover:border-gray-300 dark:hover:border-gray-700 ${theme === "dark" ? "bg-[#1a1a1c]" : "bg-gray-50"}`}`}>
                        {type.icon}
                        <span className="text-[10px] font-bold uppercase tracking-wider text-center">{type.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">{t("targetGroup")}</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: "all", label: t("allUsers"), icon: <Users size={18} /> },
                      { id: "pro_only", label: t("proOnly"), icon: <Zap size={18} /> },
                      { id: "free_only", label: t("freeOnly"), icon: <Activity size={18} /> },
                    ].map((group) => (
                      <button key={group.id} onClick={() => setForm({ ...form, target_group: group.id })} className={`flex flex-col items-center justify-center gap-2 p-4 rounded-[4px] border transition-all duration-300 ${form.target_group === group.id ? "bg-emerald-500/10 border-emerald-500 text-emerald-500 shadow-lg shadow-emerald-500/5" : `border-gray-200 dark:border-gray-800 text-gray-400 hover:border-gray-300 dark:hover:border-gray-700 ${theme === "dark" ? "bg-[#1a1a1c]" : "bg-gray-50"}`}`}>
                        {group.icon}
                        <span className="text-[10px] font-bold uppercase tracking-wider text-center">{group.label}</span>
                      </button>
                    ))}
                  </div>
                  {targetCount !== null && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 text-[10px] font-bold text-emerald-500 uppercase flex items-center gap-2">
                      <Users size={12} />
                      {isCounting ? <RefreshCw size={10} className="animate-spin" /> : language === "ar" ? `سيتم استهداف ${targetCount} مستخدم حالياً` : `Targeting ${targetCount} users currently`}
                    </motion.p>
                  )}
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t("titleEn")}</label>
                      <input type="text" value={form.title_en} onChange={(e) => setForm({ ...form, title_en: e.target.value })} className={`w-full px-4 py-3 rounded-[4px] border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all ${theme === "dark" ? "bg-[#1a1a1c] border-gray-800 text-white" : "bg-gray-50 border-gray-200"}`} dir="ltr" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t("titleAr")}</label>
                      <input type="text" value={form.title_ar} onChange={(e) => setForm({ ...form, title_ar: e.target.value })} className={`w-full px-4 py-3 rounded-[4px] border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all ${theme === "dark" ? "bg-[#1a1a1c] border-gray-800 text-white" : "bg-gray-50 border-gray-200"}`} dir="rtl" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t("contentEn")} (Markdown/HTML Support)</label>
                  <textarea rows={6} value={form.content_en} onChange={(e) => setForm({ ...form, content_en: e.target.value })} className={`w-full px-4 py-3 rounded-[4px] border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-sm font-sans ${theme === "dark" ? "bg-[#1a1a1c] border-gray-800 text-gray-300" : "bg-gray-50 border-gray-200 text-gray-800"}`} dir="ltr" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t("contentAr")} (Markdown/HTML Support)</label>
                  <textarea rows={6} value={form.content_ar} onChange={(e) => setForm({ ...form, content_ar: e.target.value })} className={`w-full px-4 py-3 rounded-[4px] border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-sm font-sans ${theme === "dark" ? "bg-[#1a1a1c] border-gray-800 text-gray-300" : "bg-gray-50 border-gray-200 text-gray-800"}`} dir="rtl" />
                </div>
              </div>
            </div>
            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800/60 flex justify-end">
              <button onClick={handleSend} disabled={isSending} className="w-full md:w-auto bg-emerald-500 hover:bg-emerald-600 text-white px-10 py-4 rounded-[4px] font-bold transition-all shadow-xl shadow-emerald-500/30 flex items-center justify-center gap-3 disabled:opacity-50">
                {isSending ? <RefreshCw size={22} className="animate-spin" /> : <Send size={22} />}
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
                <RefreshCw size={32} className="text-emerald-500 animate-spin" />
                <p className="text-gray-400">{t("loadingRecords")}</p>
              </div>
            ) : broadcasts.length === 0 ? (
              <div className={`p-12 rounded-[4px] border border-dashed flex flex-col items-center justify-center text-center ${theme === "dark" ? "border-gray-800 bg-[#111111]" : "border-gray-200 bg-gray-50"}`}>
                <Send className="text-gray-300 dark:text-gray-800 mb-4" size={48} />
                <p className="text-gray-500 font-medium">{t("noBroadcasts")}</p>
                <button onClick={() => setShowForm(true)} className="mt-4 text-emerald-500 font-bold hover:underline">{t("launchFirstBroadcast")}</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {broadcasts.map((b) => (
                  <div key={b.id} className={`p-6 rounded-[4px] border transition-all duration-300 hover:border-emerald-500/30 hover:shadow-xl hover:shadow-black/5 ${theme === "dark" ? "bg-[#1a1a1c] border-gray-800/60" : "bg-white border-gray-100 shadow-sm"}`}>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-[4px] ${theme === "dark" ? "bg-emerald-500/10" : "bg-emerald-50"}`}>
                          {b.broadcast_type === "email" ? <Mail size={18} className="text-emerald-500" /> : b.broadcast_type === "notification" ? <BellRing size={18} className="text-emerald-500" /> : <Send size={18} className="text-emerald-500" />}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-emerald-500 uppercase tracking-widest">{b.broadcast_type}</p>
                          <p className={`text-sm font-medium ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>{new Date(b.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${theme === "dark" ? "bg-gray-800 text-gray-400" : "bg-gray-100 text-gray-600"}`}>{b.target_group}</div>
                    </div>
                    <h4 className="font-bold text-lg mb-2 line-clamp-1">{dir === "rtl" ? b.title_ar : b.title_en}</h4>
                    <p className={`text-sm line-clamp-2 mb-4 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>{dir === "rtl" ? b.content_ar : b.content_en}</p>
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-800/60 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-gray-400 font-medium"><Users size={14} /><span>{b.sent_count} {t("sentCount")}</span></div>
                      <div className="flex items-center gap-2 text-emerald-500 text-xs font-bold"><CheckCircle size={14} /><span className="uppercase tracking-widest">Sent</span></div>
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

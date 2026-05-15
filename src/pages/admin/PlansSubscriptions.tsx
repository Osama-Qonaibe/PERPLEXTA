import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { 
  CheckCircle2, AlertCircle, Save, X, RefreshCw,
  Plus, Trash2, Settings2, Clock, Calendar, Info
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useSettings } from "../../context/SettingsContext";
import { useUI } from "../../context/UIContext";

const ALL_TOOLS = [
  "chat", "chat_fast", "chat_pro", "chat_reasoning",
  "perplexta_analysis", "legal_analysis", "notebook",
  "image", "video", "stt", "tts", "learning",
  "code", "canvas", "storage_mb"
];

interface PlansSubscriptionsProps {}

export const PlansSubscriptions: React.FC<PlansSubscriptionsProps> = () => {
  const { token } = useAuth();
  const { theme, t, dir, language } = useTheme();
  const { setIsOperationPending } = useUI();
  const { plans, setPlans } = useSettings();
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
          features: typeof p.features === "string" ? JSON.parse(p.features) : Array.isArray(p.features) ? p.features : [],
          limits: typeof p.limits === "string" ? JSON.parse(p.limits) : typeof p.limits === "object" && p.limits !== null ? p.limits : {},
        }));
        setPlans(formattedPlans);
      }
    } catch (error) {
      console.error("Error fetching plans:", error);
    }
  };

  useEffect(() => {
    if (token) fetchPlans();
    
    // Listen for custom event from parent to add new plan
    const handleAdd = () => handleOpenModal();
    window.addEventListener("admin-add-plan", handleAdd);
    return () => window.removeEventListener("admin-add-plan", handleAdd);
  }, [token]);

  const handleOpenModal = (plan?: any) => {
    if (plan) {
      const limits: Record<string, any> = {};
      ALL_TOOLS.forEach((toolId) => {
        limits[toolId] = { daily: 0, monthly: 0 };
      });

      const savedLimits = { ...plan.limits };
      if (!savedLimits["legal_analysis"]) {
        savedLimits["legal_analysis"] = 5; 
      }

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
    if (!editingPlan.nameEn || !editingPlan.nameAr || !editingPlan.descEn || !editingPlan.descAr) {
      showToast(t("toastAllFieldsRequired"), "error");
      return;
    }

    if (editingPlan.monthlyPrice === undefined || editingPlan.annualPrice === undefined) {
      showToast(t("toastPricingRequired"), "error");
      return;
    }

    if (editingPlan.features.length === 0) {
      showToast(t("toastFeatureRequired"), "error");
      return;
    }

    const incompleteFeature = editingPlan.features.find((f: any) => !f.textEn || !f.textAr);
    if (incompleteFeature) {
      showToast(t("toastFeatureTranslationRequired"), "error");
      return;
    }

    setIsSaving(true);
    try {
      const isNew = editingPlan.id === "new";
      const url = isNew ? "/api/admin/plans" : `/api/admin/plans/${editingPlan.id}`;
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
        showToast(language === "ar" ? "فشل حفظ الخطة" : "Failed to save plan", "error");
      }
    } catch (error) {
      console.error("Error saving plan:", error);
      showToast(language === "ar" ? "فشل حفظ الخطة" : "Failed to save plan", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePlan = async (id: string) => {
    if (!window.confirm(t("deletePlanConfirm"))) return;

    try {
      const res = await fetch(`/api/admin/plans/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showToast(t("toastPlanDeleteSuccess"), "success");
        fetchPlans();
      } else {
        showToast(t("toastPlanDeleteError"), "error");
      }
    } catch (error) {
      console.error("Error deleting plan:", error);
      showToast(language === "ar" ? "خطأ في الاتصال" : "Connection Error", "error");
    }
  };

  const addFeature = () => {
    setEditingPlan({
      ...editingPlan,
      features: [...editingPlan.features, { id: Date.now().toString(), textEn: "", textAr: "" }],
    });
  };

  const removeFeature = (id: string) => {
    setEditingPlan({
      ...editingPlan,
      features: editingPlan.features.filter((f: any) => f.id !== id),
    });
  };

  const updateFeature = (id: string, field: "textEn" | "textAr", value: string) => {
    setEditingPlan({
      ...editingPlan,
      features: editingPlan.features.map((f: any) => (f.id === id ? { ...f, [field]: value } : f)),
    });
  };

  const updateLimit = (field: string, subfield: "daily" | "monthly", value: string) => {
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
      {toast && createPortal(
        <div className={`fixed bottom-6 ${dir === "rtl" ? "left-6" : "right-6"} z-[1000] flex items-center gap-3 px-6 py-4 rounded-[4px] shadow-2xl transition-all duration-300 animate-in slide-in-from-bottom-5 ${toast.type === "success" ? (theme === "dark" ? "bg-[#1a1a1c] border border-emerald-500/30 text-emerald-500" : "bg-white border border-emerald-200 text-emerald-600") : (theme === "dark" ? "bg-[#1a1a1c] border border-red-500/30 text-red-500" : "bg-white border border-red-200 text-red-600")}`}>
          {toast.type === "success" ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span className="font-medium text-sm">{toast.message}</span>
        </div>,
        document.body
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div key={plan.id} className={`p-6 rounded-[4px] border ${theme === "dark" ? "border-gray-800/60 bg-[#111111]" : "border-gray-200 bg-white"} transition-all duration-300 hover:border-gray-700 flex flex-col relative overflow-hidden`}>
            <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: plan.color || "#10b981" }}></div>
            <div className="flex justify-between items-start mb-4 mt-2">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: plan.color || "#10b981" }}></span>
                  {dir === "rtl" ? plan.nameAr : plan.nameEn}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{dir === "rtl" ? plan.descAr : plan.descEn}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-emerald-500">${plan.monthlyPrice}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">/ {t("monthly")}</p>
              </div>
            </div>
            <div className="flex-1 space-y-3 mb-6">
              {plan.features.slice(0, 4).map((feature: any) => (
                <div key={feature.id} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                  <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                  <span>{dir === "rtl" ? feature.textAr : feature.textEn}</span>
                </div>
              ))}
              {plan.features.length > 4 && <p className="text-xs text-gray-500 italic">+{plan.features.length - 4} more features...</p>}
            </div>
            <div className="flex gap-3">
              <button onClick={() => handleOpenModal(plan)} className={`flex-1 py-2.5 rounded-[4px] border transition-all font-medium text-sm flex items-center justify-center gap-2 ${theme === "dark" ? "border-gray-800 bg-[#1a1a1c] hover:bg-gray-800 text-gray-300" : "border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-600"}`}>
                <Settings2 size={16} /> {t("edit")}
              </button>
              <button onClick={() => handleDeletePlan(plan.id)} className={`px-4 py-2.5 rounded-[4px] border transition-all flex items-center justify-center ${theme === "dark" ? "border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-500" : "border-red-200 bg-red-50 hover:bg-red-100 text-red-600"}`}>
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && editingPlan && createPortal(
        <div className="fixed inset-0 z-[1000] flex justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className={`w-full max-w-4xl mt-[80px] mb-8 overflow-y-auto custom-scrollbar rounded-[4px] border shadow-2xl ${theme === "dark" ? "bg-[#161618] border-gray-800/60" : "bg-white border-gray-200"}`}>
            <div className={`sticky top-0 z-[1100] flex items-center justify-between p-6 border-b ${theme === "dark" ? "border-gray-800/60 bg-[#161618]/95" : "border-gray-200 bg-white/95"} backdrop-blur-md`}>
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {editingPlan.nameEn ? (dir === "rtl" ? editingPlan.nameAr : editingPlan.nameEn) : t("addNewPlan")}
                </h2>
                {editingPlan.id !== "new" && <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest bg-gray-500/10 px-2 py-0.5 rounded-md border border-gray-500/10">ID: {editingPlan.id}</span>}
              </div>
              <div className="flex items-center gap-3">
                <button onClick={handleSavePlan} disabled={isSaving} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2 rounded-[4px] transition-all duration-300 font-bold text-sm shadow-[0_5px_15px_rgba(16,185,129,0.3)] disabled:opacity-50">
                  {isSaving ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />} {t("saveSettings") || "Save"}
                </button>
                <div className="w-px h-6 bg-gray-800/40" />
                <button onClick={handleCloseModal} className={`p-2 rounded-[4px] transition-colors ${theme === "dark" ? "hover:bg-gray-800 text-gray-400 hover:text-white" : "hover:bg-gray-100 text-gray-500 hover:text-gray-900"}`}><X size={20} /></button>
              </div>
            </div>

            <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6 order-2 lg:order-1">
                <div className="flex gap-4">
                  <div className="flex-1 space-y-2">
                    <label className="text-xs font-medium text-gray-500 px-1">{t("badge")}</label>
                    <select value={editingPlan.badge || ""} onChange={(e) => setEditingPlan({ ...editingPlan, badge: e.target.value })} className={`w-full h-11 px-3 rounded-[4px] border ${theme === "dark" ? "bg-[#0f0f11] border-gray-800/80 text-gray-300" : "bg-gray-50 border-gray-200 text-gray-900"} focus:outline-none focus:border-emerald-500/50 transition-colors appearance-none`} dir={dir}>
                      <option value="none">{t("none")}</option>
                      <option value="bestSeller">{t("bestSeller")}</option>
                      <option value="popular">{t("popular")}</option>
                      <option value="newBadge">{t("newBadge")}</option>
                    </select>
                  </div>
                  <div className="flex-1 space-y-2">
                    <label className="text-xs font-medium text-gray-500 px-1">{t("discountPercentage")}</label>
                    <input type="number" value={editingPlan.discount} onChange={(e) => { const d = Number(e.target.value); const m = Number(editingPlan.monthlyPrice); const a = m * 12 * (1 - d / 100); setEditingPlan({ ...editingPlan, discount: d, annualPrice: Number(a.toFixed(2)) }); }} className={`w-full h-11 px-3 rounded-[4px] border ${theme === "dark" ? "bg-[#0f0f11] border-gray-800/80 text-gray-300" : "bg-gray-50 border-gray-200 text-gray-900"} focus:outline-none focus:border-emerald-500/50 transition-colors text-center`} dir="ltr" />
                  </div>
                </div>

                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-3">
                    <label className="text-xs font-medium text-gray-500">{t("planColor")}</label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={editingPlan.color || "#10b981"} onChange={(e) => setEditingPlan({ ...editingPlan, color: e.target.value })} className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent" />
                      <span className="text-xs font-mono text-gray-500 uppercase">{editingPlan.color || "#10b981"}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="isActive" checked={editingPlan.isActive} onChange={(e) => setEditingPlan({ ...editingPlan, isActive: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500 bg-gray-100 dark:bg-gray-800 dark:border-gray-700" />
                      <label htmlFor="isActive" className="text-xs font-bold text-emerald-500 cursor-pointer uppercase tracking-tighter">{language === "ar" ? "نشط" : "Active"}</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="isVisible" checked={editingPlan.isVisible} onChange={(e) => setEditingPlan({ ...editingPlan, isVisible: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500 bg-gray-100 dark:bg-gray-800 dark:border-gray-700" />
                      <label htmlFor="isVisible" className="text-xs font-bold text-gray-500 cursor-pointer uppercase tracking-tighter">{language === "ar" ? "مرئي" : "Visible"}</label>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3 px-1">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">{t("limits")}</h3>
                    <div className="flex gap-4 text-[10px] font-bold text-emerald-500/80 uppercase tracking-widest bg-emerald-500/5 px-2 py-0.5 rounded-full border border-emerald-500/10">
                      <span className="flex items-center gap-1"><Clock size={10} /> {t("daily")}</span>
                      <span className="flex items-center gap-1"><Calendar size={10} /> {t("monthly")}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto px-1 custom-scrollbar">
                    {ALL_TOOLS.map((key) => {
                      const isUnlimitedDaily = editingPlan.limits[key]?.daily === "unlimited";
                      const isUnlimitedMonthly = editingPlan.limits[key]?.monthly === "unlimited";
                      return (
                        <div key={key} className={`p-3 rounded-[4px] border ${theme === "dark" ? "bg-[#1a1a1c] border-gray-800/60" : "bg-gray-50 border-gray-200"} transition-all duration-300 hover:border-emerald-500/40 group relative overflow-hidden`}>
                          <div className="flex justify-between items-center mb-2 px-1">
                            <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 truncate group-hover:text-emerald-500 transition-colors uppercase tracking-widest">{t(key)}</span>
                            <div className="flex gap-1">
                              <div className={`w-1.5 h-1.5 rounded-full ${isUnlimitedDaily || isUnlimitedMonthly ? "bg-emerald-500 animate-pulse" : "bg-gray-700"}`} />
                            </div>
                          </div>
                          <div className={key === "storage_mb" ? "grid grid-cols-1" : "grid grid-cols-2 gap-2"}>
                            {key !== "storage_mb" && (
                              <div className="space-y-1">
                                <label className="text-[8px] font-black text-gray-500 uppercase ml-1 opacity-60">{t("daily")}</label>
                                <input type={isUnlimitedDaily ? "text" : "number"} value={isUnlimitedDaily ? "∞" : editingPlan.limits[key]?.daily || 0} readOnly={isUnlimitedDaily} onChange={(e) => updateLimit(key, "daily", e.target.value)} onDoubleClick={() => updateLimit(key, "daily", isUnlimitedDaily ? "0" : "unlimited")} className={`w-full h-10 px-2 rounded-[4px] border text-center text-sm font-mono focus:outline-none transition-all ${isUnlimitedDaily ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500 font-bold text-xl" : (theme === "dark" ? "bg-[#0f0f11] border-gray-800 text-gray-300" : "bg-white border-gray-200 text-gray-900")} focus:border-emerald-500/50 cursor-pointer shadow-inner`} dir="ltr" />
                              </div>
                            )}
                            <div className="space-y-1">
                              <label className="text-[8px] font-black text-gray-500 uppercase ml-1 opacity-60">{key === "storage_mb" ? (t("usageLoad") || "Total Capacity") : t("monthly")}</label>
                              <input type={isUnlimitedMonthly ? "text" : "number"} value={isUnlimitedMonthly ? "∞" : editingPlan.limits[key]?.monthly || 0} readOnly={isUnlimitedMonthly} onChange={(e) => updateLimit(key, "monthly", e.target.value)} onDoubleClick={() => updateLimit(key, "monthly", isUnlimitedMonthly ? "0" : "unlimited")} className={`w-full h-10 px-2 rounded-[4px] border text-center text-sm font-mono focus:outline-none transition-all ${isUnlimitedMonthly ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500 font-bold text-xl" : (theme === "dark" ? "bg-[#0f0f11] border-gray-800 text-gray-300" : "bg-white border-gray-200 text-gray-900")} focus:border-emerald-500/50 cursor-pointer shadow-inner`} dir="ltr" />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-500 px-1">{t("monthly")}</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                      <input type="number" value={editingPlan.monthlyPrice} onChange={(e) => { const m = Number(e.target.value); const d = Number(editingPlan.discount); const a = m * 12 * (1 - d / 100); setEditingPlan({ ...editingPlan, monthlyPrice: m, annualPrice: Number(a.toFixed(2)) }); }} className={`w-full h-11 pl-8 pr-3 rounded-[4px] border ${theme === "dark" ? "bg-[#0f0f11] border-gray-800/80 text-gray-300" : "bg-gray-50 border-gray-200 text-gray-900"} focus:outline-none focus:border-emerald-500/50 transition-colors`} dir="ltr" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-500 px-1">{t("annual")}</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                      <input type="number" value={editingPlan.annualPrice} onChange={(e) => { const a = Number(e.target.value); const m = Number(editingPlan.monthlyPrice); let d = 0; if (m > 0) { d = Math.round((1 - a / (m * 12)) * 100); } setEditingPlan({ ...editingPlan, annualPrice: a, discount: d }); }} className={`w-full h-11 pl-8 pr-3 rounded-[4px] border ${theme === "dark" ? "bg-[#0f0f11] border-gray-800/80 text-gray-300" : "bg-gray-50 border-gray-200 text-gray-900"} focus:outline-none focus:border-emerald-500/50 transition-colors`} dir="ltr" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6 order-1 lg:order-2">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-500 px-1">{t("planNameEn")}</label>
                    <input type="text" value={editingPlan.nameEn} onChange={(e) => setEditingPlan({ ...editingPlan, nameEn: e.target.value })} className={`w-full h-11 px-3 rounded-[4px] border ${theme === "dark" ? "bg-[#0f0f11] border-gray-800/80 text-gray-300" : "bg-gray-50 border-gray-200 text-gray-900"} focus:outline-none focus:border-emerald-500/50 transition-colors`} dir="ltr" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-500 px-1">{t("planNameAr")}</label>
                    <input type="text" value={editingPlan.nameAr} onChange={(e) => setEditingPlan({ ...editingPlan, nameAr: e.target.value })} className={`w-full h-11 px-3 rounded-[4px] border ${theme === "dark" ? "bg-[#0f0f11] border-gray-800/80 text-gray-300" : "bg-gray-50 border-gray-200 text-gray-900"} focus:outline-none focus:border-emerald-500/50 transition-colors`} dir="rtl" />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-500 px-1">{t("planDescEn")}</label>
                    <input type="text" value={editingPlan.descEn} onChange={(e) => setEditingPlan({ ...editingPlan, descEn: e.target.value })} className={`w-full h-11 px-3 rounded-[4px] border ${theme === "dark" ? "bg-[#0f0f11] border-gray-800/80 text-gray-300" : "bg-gray-50 border-gray-200 text-gray-900"} focus:outline-none focus:border-emerald-500/50 transition-colors`} dir="ltr" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-500 px-1">{t("planDescAr")}</label>
                    <input type="text" value={editingPlan.descAr} onChange={(e) => setEditingPlan({ ...editingPlan, descAr: e.target.value })} className={`w-full h-11 px-3 rounded-[4px] border ${theme === "dark" ? "bg-[#0f0f11] border-gray-800/80 text-gray-300" : "bg-gray-50 border-gray-200 text-gray-900"} focus:outline-none focus:border-emerald-500/50 transition-colors`} dir="rtl" />
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white px-1">{t("planFeaturesEn")}</h3>
                  {editingPlan.features.map((feature: any) => (
                    <div key={`en-${feature.id}`} className="flex items-center gap-2">
                      <button onClick={() => removeFeature(feature.id)} className="w-11 h-11 rounded-[4px] bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white flex items-center justify-center transition-colors shrink-0"><Trash2 size={18} /></button>
                      <input type="text" value={feature.textEn} onChange={(e) => updateFeature(feature.id, "textEn", e.target.value)} className={`flex-1 h-11 px-3 rounded-[4px] border ${theme === "dark" ? "bg-[#0f0f11] border-gray-800/80 text-gray-300" : "bg-gray-50 border-gray-200 text-gray-900"} focus:outline-none focus:border-emerald-500/50 transition-colors`} dir="ltr" />
                    </div>
                  ))}
                  <button onClick={addFeature} className="w-full py-3 rounded-[4px] bg-rose-600 hover:bg-rose-700 text-white font-medium text-sm transition-all">{t("addFeature")}</button>

                  <h3 className="text-sm font-bold text-gray-900 dark:text-white px-1 mt-6">{t("planFeaturesAr")}</h3>
                  {editingPlan.features.map((feature: any) => (
                    <div key={`ar-${feature.id}`} className="flex items-center gap-2">
                      <button onClick={() => removeFeature(feature.id)} className="w-11 h-11 rounded-[4px] bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white flex items-center justify-center transition-colors shrink-0"><Trash2 size={18} /></button>
                      <input type="text" value={feature.textAr} onChange={(e) => updateFeature(feature.id, "textAr", e.target.value)} className={`flex-1 h-11 px-3 rounded-[4px] border ${theme === "dark" ? "bg-[#0f0f11] border-gray-800/80 text-gray-300" : "bg-gray-50 border-gray-200 text-gray-900"} focus:outline-none focus:border-emerald-500/50 transition-colors`} dir="rtl" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

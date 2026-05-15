import React, { useState, useEffect } from "react";
import { 
  CreditCard, Plus, Save, Trash2, Edit, CheckCircle, AlertCircle, 
  RefreshCw, Award, Zap, Star, Shield, DollarSign, Wallet
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAppContext } from "../../context/AppContext";

export const PlansEngineeringView = ({
  theme,
  t,
  dir,
}: {
  theme: string;
  t: (key: string, replacements?: any) => string;
  dir: string;
}) => {
  const { token, setIsOperationPending } = useAppContext();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchPlans = async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/admin/plans", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setPlans(await res.json());
      }
    } catch (err) {
      console.error("Error fetching plans:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();

    const handleAdd = () => {
      const newPlan = {
        id: `plan_${Date.now()}`,
        name_en: "New Plan",
        name_ar: "خطة جديدة",
        price_monthly: 0,
        price_annual: 0,
        discount_percentage: 0,
        features_en: [],
        features_ar: [],
        color: "emerald",
        badge_en: "",
        badge_ar: "",
        is_active: false,
        daily_limit: 50,
      };
      setPlans((prev) => [newPlan, ...prev]);
      setEditingId(newPlan.id);
    };

    window.addEventListener("admin-add-plan", handleAdd);
    return () => window.removeEventListener("admin-add-plan", handleAdd);
  }, [token]);

  const handleSave = async (plan: any) => {
    if (!token) return;
    setIsSaving(true);
    setIsOperationPending(true);
    try {
      const isNew = !plans.find(p => p.id === plan.id && p.id.startsWith("plan_") === false);
      const res = await fetch(`/api/admin/plans${isNew ? "" : `/${plan.id}`}`, {
        method: isNew ? "POST" : "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(plan),
      });
      if (res.ok) {
        setEditingId(null);
        await fetchPlans();
      }
    } catch (err) {
      console.error("Error saving plan:", err);
    } finally {
      setIsSaving(false);
      setIsOperationPending(false);
    }
  };

  const calculatePlanPrice = (monthly: number, discount: number) => {
    const annualBase = monthly * 12;
    return annualBase - (annualBase * discount) / 100;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <CreditCard size={48} className="text-emerald-500 animate-pulse mb-4" />
        <p className="text-gray-500 font-medium uppercase tracking-widest">PRICING ENGINE LOADING...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <motion.div
            key={plan.id}
            layout
            className={`p-6 rounded-[4px] border ${theme === "dark" ? "bg-[#111111] border-gray-800/60" : "bg-white border-gray-100"} hover:shadow-xl transition-all duration-300 relative group`}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-[4px] bg-${plan.color || "emerald"}-500/10 text-${plan.color || "emerald"}-500`}>
                  <Award size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-lg uppercase tracking-tight">{plan.name_en}</h3>
                  <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">{plan.badge_en || "BASIC"}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingId(editingId === plan.id ? null : plan.id)}
                className="p-2 rounded-[4px] hover:bg-gray-500/10 transition-colors text-gray-500"
              >
                <Edit size={18} />
              </button>
            </div>

            <div className="space-y-6">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black">${plan.price_monthly}</span>
                <span className="text-gray-500 text-xs font-bold uppercase">/ {t("month")}</span>
              </div>

              {editingId === plan.id ? (
                <div className="space-y-4 pt-4 border-t border-gray-800/20">
                   <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-gray-500 uppercase mb-1 d-block">Monthly Price</label>
                      <input
                        type="number"
                        value={plan.price_monthly}
                        onChange={(e) => setPlans(plans.map(p => p.id === plan.id ? {...p, price_monthly: Number(e.target.value)} : p))}
                        className={`w-full px-3 py-2 rounded-[4px] border text-sm font-bold ${theme === "dark" ? "bg-[#1a1a1c] border-gray-800 text-white" : "bg-gray-50 border-gray-200"}`}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-500 uppercase mb-1 d-block">Discount %</label>
                      <input
                        type="number"
                        value={plan.discount_percentage}
                        onChange={(e) => setPlans(plans.map(p => p.id === plan.id ? {...p, discount_percentage: Number(e.target.value)} : p))}
                        className={`w-full px-3 py-2 rounded-[4px] border text-sm font-bold ${theme === "dark" ? "bg-[#1a1a1c] border-gray-800 text-white" : "bg-gray-50 border-gray-200"}`}
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => handleSave(plan)}
                    disabled={isSaving}
                    className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white py-2.5 rounded-[4px] font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-50"
                  >
                     {isSaving ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
                     SAVE PLAN ARCHITECTURE
                  </button>
                </div>
              ) : (
                 <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                      <Zap size={14} className="text-amber-500" />
                      <span>{plan.daily_limit} AI GENERATIONS / DAY</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                      <Shield size={14} className="text-blue-500" />
                      <span>SECURE TRANSACTION VAULT</span>
                    </div>
                 </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

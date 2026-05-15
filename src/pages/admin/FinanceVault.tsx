import React, { useState, useEffect } from "react";
import { 
  Coins, TrendingUp, BarChart, AlertTriangle, 
  Trash2, Plus, Search, Building, CreditCard, 
  ChevronDown, CheckCircle2, AlertCircle, X, 
  ExternalLink, Code, Save, RefreshCw, Zap,
  Info
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useUI } from "../../context/UIContext";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";

interface FinanceVaultProps {}

export const FinanceVault: React.FC<FinanceVaultProps> = () => {
  const { token } = useAuth();
  const { theme, t, dir, language } = useTheme();
  const { setIsOperationPending } = useUI();
  const [activeTab, setActiveTab] = useState("economy");
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  useEffect(() => {
    setIsOperationPending(isSaving);
  }, [isSaving, setIsOperationPending]);

  const [economySettings, setEconomySettings] = useState({
    welcome_bonus_points: 600,
    referral_bonus_points: 1000,
    min_payout_usd: 20,
    min_deposit_usd: 5,
    points_per_dollar: 1000,
    conversion_rate: 0.001,
    referral_bonus_percent: 10,
  });

  const [stripeConfig, setStripeConfig] = useState({
    publishableKey: "",
    secretKey: "",
    webhookSecret: "",
    isLive: false,
  });

  const [isVerifyingStripe, setIsVerifyingStripe] = useState(false);
  const [stripeVerification, setStripeVerification] = useState<any>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const fetchEconomySettings = async () => {
      try {
        const res = await fetch("/api/admin/economy", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setEconomySettings(data);
        }
      } catch (error) {
        console.error("Error fetching economy settings:", error);
      }
    };

    const fetchStripeConfig = async () => {
      try {
        const res = await fetch("/api/admin/economy/stripe", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setStripeConfig(data);
        }
      } catch (error) {
        console.error("Error fetching Stripe config:", error);
      }
    };

    if (token) {
      fetchEconomySettings();
      fetchStripeConfig();
    }
  }, [token]);

  const handleSaveEconomySettings = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/economy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(economySettings),
      });
      if (res.ok) {
        showToast(
          language === "ar"
            ? "تم حفظ إعدادات الخزنة بنجاح"
            : "Finance settings saved successfully",
          "success"
        );
      } else {
        const errorData = await res.json();
        showToast(
          language === "ar"
            ? `فشل الحفظ: ${errorData.error}`
            : `Save failed: ${errorData.error}`,
          "error"
        );
      }
    } catch (error) {
      console.error("Error saving economy settings:", error);
      showToast(
        language === "ar" ? "خطأ في الاتصال" : "Connection Error",
        "error"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveStripeConfig = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/economy/stripe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(stripeConfig),
      });
      if (res.ok) {
        showToast(
          language === "ar" ? "تم حفظ إعدادات Stripe بنجاح" : "Stripe settings saved successfully",
          "success"
        );
      } else {
        showToast(language === "ar" ? "فشل حفظ إعدادات Stripe" : "Failed to save Stripe config", "error");
      }
    } catch (error) {
      console.error("Error saving Stripe config:", error);
      showToast(language === "ar" ? "خطأ في الاتصال" : "Connection Error", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleVerifyStripeConnection = async () => {
    if (isVerifyingStripe) return;
    setIsVerifyingStripe(true);
    setStripeVerification(null);
    try {
      const res = await fetch("/api/admin/economy/stripe/verify", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setStripeVerification({
        success: res.ok,
        message: data.message || (res.ok ? "Stripe Ready" : "Stripe Connection Failed"),
        details: data.details,
      });
      if (res.ok) {
        showToast(language === "ar" ? "تم التحقق من Stripe بنجاح" : "Stripe verified successfully", "success");
      } else {
        showToast(language === "ar" ? "فشل التحقق من Stripe" : "Stripe verification failed", "error");
      }
    } catch (error) {
      console.error("Stripe verification error:", error);
      showToast(language === "ar" ? "خطأ في الاتصال" : "Connection error", "error");
    } finally {
      setIsVerifyingStripe(false);
    }
  };

  const updatePointsPerDollar = (val: number) => {
    const rate = val > 0 ? 1 / val : 0;
    setEconomySettings({
      ...economySettings,
      points_per_dollar: val,
      conversion_rate: Number(rate.toFixed(6)),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-start justify-between">
        <div className="flex items-center gap-1.5 p-1 rounded-[4px] bg-[var(--bg-secondary)] border border-[var(--border-main)]">
          <button
            onClick={() => setActiveTab("economy")}
            className={`px-6 py-2.5 rounded-[4px] text-xs font-black uppercase tracking-widest transition-all ${activeTab === "economy" ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "text-gray-500 hover:text-emerald-500 hover:bg-emerald-500/5"}`}
          >
            {t("economyCore") || "Economy Core"}
          </button>
          <button
            onClick={() => setActiveTab("gateways")}
            className={`px-6 py-2.5 rounded-[4px] text-xs font-black uppercase tracking-widest transition-all ${activeTab === "gateways" ? "bg-[#635BFF] text-white shadow-lg shadow-[#635BFF]/20" : "text-gray-500 hover:text-[#635BFF] hover:bg-[#635BFF]/5"}`}
          >
            {t("paymentGateways") || "Payment Gateways"}
          </button>
        </div>

        {activeTab === "economy" && (
          <Button
            onClick={handleSaveEconomySettings}
            disabled={isSaving}
            className="w-full md:w-auto h-11 px-8 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-[4px] shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
          >
            {isSaving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
            {t("saveFinanceSettings") || "Save Finance Protocol"}
          </Button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "economy" ? (
          <motion.div
            key="economy"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
          >
            <Card className="p-6 border-emerald-500/20 bg-emerald-500/[0.02]">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-[4px] bg-emerald-500/10 text-emerald-500">
                  <Coins size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white uppercase tracking-tighter">{t("referralSystemCore")}</h3>
                  <p className="text-[10px] text-gray-500 font-medium uppercase tracking-[0.2em]">{t("incentiveProtocols")}</p>
                </div>
              </div>

              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{t("welcomeBonus")}</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={economySettings.welcome_bonus_points}
                      onChange={(e) => setEconomySettings({...economySettings, welcome_bonus_points: Number(e.target.value)})}
                      className={`w-full h-11 px-4 rounded-[4px] border ${theme === "dark" ? "bg-[#161618] border-gray-800 text-white" : "bg-white border-gray-200"} focus:outline-none focus:ring-1 focus:ring-emerald-500/30 transition-all font-mono`}
                    />
                    <span className={`absolute top-1/2 -translate-y-1/2 px-4 text-[10px] font-bold text-emerald-500/50 ${dir === "rtl" ? "left-0" : "right-0"}`}>PTS</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{t("referralBonus")}</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={economySettings.referral_bonus_points}
                      onChange={(e) => setEconomySettings({...economySettings, referral_bonus_points: Number(e.target.value)})}
                      className={`w-full h-11 px-4 rounded-[4px] border ${theme === "dark" ? "bg-[#161618] border-gray-800 text-white" : "bg-white border-gray-200"} focus:outline-none focus:ring-1 focus:ring-emerald-500/30 transition-all font-mono`}
                    />
                    <span className={`absolute top-1/2 -translate-y-1/2 px-4 text-[10px] font-bold text-emerald-500/50 ${dir === "rtl" ? "left-0" : "right-0"}`}>PTS</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{t("referralBonusPercent")}</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={economySettings.referral_bonus_percent}
                      onChange={(e) => setEconomySettings({...economySettings, referral_bonus_percent: Number(e.target.value)})}
                      className={`w-full h-11 px-4 rounded-[4px] border ${theme === "dark" ? "bg-[#161618] border-gray-800 text-white" : "bg-white border-gray-200"} focus:outline-none focus:ring-1 focus:ring-emerald-500/30 transition-all font-mono`}
                    />
                    <span className={`absolute top-1/2 -translate-y-1/2 px-4 text-[10px] font-bold text-emerald-500/50 ${dir === "rtl" ? "left-0" : "right-0"}`}>%</span>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6 border-amber-500/20 bg-amber-500/[0.02]">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-[4px] bg-amber-500/10 text-amber-500">
                  <TrendingUp size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white uppercase tracking-tighter">{t("thresholdManagement")}</h3>
                  <p className="text-[10px] text-gray-500 font-medium uppercase tracking-[0.2em]">{t("payoutWithdrawalRules")}</p>
                </div>
              </div>

              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{t("minPayoutUsd")}</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={economySettings.min_payout_usd}
                      onChange={(e) => setEconomySettings({...economySettings, min_payout_usd: Number(e.target.value)})}
                      className={`w-full h-11 px-4 rounded-[4px] border ${theme === "dark" ? "bg-[#161618] border-gray-800 text-white" : "bg-white border-gray-200"} focus:outline-none focus:ring-1 focus:ring-amber-500/30 transition-all font-mono`}
                    />
                    <span className={`absolute top-1/2 -translate-y-1/2 px-4 text-[10px] font-bold text-amber-500/50 ${dir === "rtl" ? "left-0" : "right-0"}`}>USD</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{t("minDepositUsd")}</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={economySettings.min_deposit_usd}
                      onChange={(e) => setEconomySettings({...economySettings, min_deposit_usd: Number(e.target.value)})}
                      className={`w-full h-11 px-4 rounded-[4px] border ${theme === "dark" ? "bg-[#161618] border-gray-800 text-white" : "bg-white border-gray-200"} focus:outline-none focus:ring-1 focus:ring-amber-500/30 transition-all font-mono`}
                    />
                    <span className={`absolute top-1/2 -translate-y-1/2 px-4 text-[10px] font-bold text-amber-500/50 ${dir === "rtl" ? "left-0" : "right-0"}`}>USD</span>
                  </div>
                </div>

                <div className="p-4 rounded-[4px] bg-amber-500/10 border border-amber-500/20 flex gap-3">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-600" />
                  <p className="text-[10px] text-amber-800 dark:text-amber-200 font-medium leading-relaxed uppercase">
                    {t("thresholdAdvisory") || "Ensure thresholds are aligned with international financial laws and anti-money laundering protocols."}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6 border-blue-500/20 bg-blue-500/[0.02]">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-[4px] bg-blue-500/10 text-blue-500">
                  <BarChart size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white uppercase tracking-tighter">{t("valuationEngine")}</h3>
                  <p className="text-[10px] text-gray-500 font-medium uppercase tracking-[0.2em]">{t("conversionScales")}</p>
                </div>
              </div>

              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{t("pointsPerDollar")}</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={economySettings.points_per_dollar}
                      onChange={(e) => updatePointsPerDollar(Number(e.target.value))}
                      className={`w-full h-11 px-4 rounded-[4px] border ${theme === "dark" ? "bg-[#161618] border-gray-800 text-white" : "bg-white border-gray-200"} focus:outline-none focus:ring-1 focus:ring-blue-500/30 transition-all font-mono`}
                    />
                    <span className={`absolute top-1/2 -translate-y-1/2 px-4 text-[10px] font-bold text-blue-500/50 ${dir === "rtl" ? "left-0" : "right-0"}`}>PTS / $1</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{t("conversionRateRaw")}</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={economySettings.conversion_rate}
                      readOnly
                      className={`w-full h-11 px-4 rounded-[4px] border text-xs font-mono ${theme === "dark" ? "bg-[#0f0f11] border-gray-800 text-blue-400" : "bg-gray-50 border-gray-200 text-blue-600"}`}
                    />
                  </div>
                </div>

                <div className="p-4 rounded-[4px] bg-blue-500/5 border border-blue-500/10 space-y-3">
                  <h4 className="text-[9px] font-black text-blue-500 uppercase tracking-[0.2em]">{t("liveCalculationPreview")}</h4>
                  <div className="flex items-center justify-between">
                    <div className="text-center flex-1">
                      <p className="text-[10px] font-bold text-gray-500 uppercase">{t("userPays")}</p>
                      <p className="text-lg font-black">$10</p>
                    </div>
                    <div className="h-6 w-px bg-blue-500/20" />
                    <div className="text-center flex-1">
                      <p className="text-[10px] font-bold text-gray-500 uppercase">{t("userReceives")}</p>
                      <p className="text-lg font-black text-emerald-500">{(10 * economySettings.points_per_dollar).toLocaleString()} <span className="text-[10px]">PTS</span></p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="gateways"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-3xl mx-auto"
          >
            <Card className="overflow-hidden border-[#635BFF]/20">
              <div className="p-8 bg-[#635BFF] flex items-center justify-between">
                <div className="flex items-center gap-4 text-white">
                  <div className="w-12 h-12 rounded-[4px] bg-white/20 flex items-center justify-center">
                    <Building size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tighter">Stripe Ecosystem</h3>
                    <p className="text-xs font-medium text-white/70 uppercase tracking-widest">{t("globalMerchantProtocol")}</p>
                  </div>
                </div>
                <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-lg ${stripeConfig.isLive ? "bg-amber-500 text-white animate-pulse" : "bg-blue-400 text-white"}`}>
                  {stripeConfig.isLive ? "Live Protocol" : "Sandbox Mode"}
                </div>
              </div>

              <div className="p-8 space-y-6">
                <div className="flex items-center justify-between p-4 rounded-[4px] border border-[var(--border-main)] bg-[var(--bg-secondary)] mb-2">
                  <div className="flex items-center gap-3">
                    <CreditCard size={20} className="text-[#635BFF]" />
                    <div>
                      <h4 className="text-sm font-bold uppercase tracking-tight">{t("operatingEnvironment")}</h4>
                      <p className="text-[10px] text-gray-500 uppercase tracking-widest">{stripeConfig.isLive ? "High-Security Live Processing" : "Non-Transactional Testing"}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setStripeConfig({ ...stripeConfig, isLive: !stripeConfig.isLive })}
                    className={`w-14 h-7 rounded-full p-1 transition-all duration-500 flex items-center ${stripeConfig.isLive ? "bg-amber-500/20 border border-amber-500/30" : "bg-blue-500/20 border border-blue-500/30"}`}
                  >
                    <motion.div
                      animate={{ x: stripeConfig.isLive ? (dir === "rtl" ? -28 : 28) : 0 }}
                      className={`w-5 h-5 rounded-full shadow-md ${stripeConfig.isLive ? "bg-amber-500" : "bg-blue-500"}`}
                    />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{t("publishableKey")}</label>
                    <input
                      type="text"
                      value={stripeConfig.publishableKey || ""}
                      onChange={(e) => setStripeConfig({ ...stripeConfig, publishableKey: e.target.value })}
                      placeholder="pk_test_..."
                      className={`w-full h-12 px-4 rounded-[4px] border focus:outline-none focus:ring-1 focus:ring-[#635BFF]/30 transition-all font-mono text-xs ${theme === "dark" ? "bg-[#161618] border-gray-800 text-white" : "bg-white border-gray-200 text-gray-900"}`}
                      dir="ltr"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{t("secretKey")}</label>
                    <input
                      type="password"
                      value={stripeConfig.secretKey || ""}
                      onChange={(e) => setStripeConfig({ ...stripeConfig, secretKey: e.target.value })}
                      placeholder="sk_test_..."
                      className={`w-full h-12 px-4 rounded-[4px] border focus:outline-none focus:ring-1 focus:ring-[#635BFF]/30 transition-all font-mono text-xs ${theme === "dark" ? "bg-[#161618] border-gray-800 text-white" : "bg-white border-gray-200 text-gray-900"}`}
                      dir="ltr"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{t("webhookSecret")}</label>
                  <div className="relative">
                    <input
                      type="password"
                      value={stripeConfig.webhookSecret || ""}
                      onChange={(e) => setStripeConfig({ ...stripeConfig, webhookSecret: e.target.value })}
                      placeholder="whsec_..."
                      className={`w-full h-12 px-4 rounded-[4px] border focus:outline-none focus:ring-1 focus:ring-[#635BFF]/30 transition-all font-mono text-xs ${theme === "dark" ? "bg-[#161618] border-gray-800 text-white" : "bg-white border-gray-200 text-gray-900"}`}
                      dir="ltr"
                    />
                  </div>
                  <p className="text-[10px] text-gray-500 mt-2 px-1 flex items-center gap-2">
                    <Info size={12} className="text-emerald-500" />
                    {dir === "rtl" ? "مطلوب لتجديد الاشتراكات والحصول على إخطارات الدفع الحقيقية." : "Required for subscription renewals and receiving real-time payment notifications."}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-[var(--border-main)]/50">
                  <Button
                    onClick={handleSaveStripeConfig}
                    disabled={isSaving}
                    className="flex-1 h-12 bg-[#635BFF] hover:bg-[#5249e5] text-white py-3 rounded-[4px] font-black uppercase tracking-widest transition-all hover:scale-[1.02] shadow-lg shadow-[#635BFF]/20 flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {isSaving ? <RefreshCw size={20} className="animate-spin" /> : <Save size={20} />}
                    {t("saveMerchantConfig") || "Save Merchant Protocol"}
                  </Button>

                  <Button
                    onClick={handleVerifyStripeConnection}
                    disabled={isSaving || isVerifyingStripe}
                    className={`px-8 h-12 rounded-[4px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 ${theme === "dark" ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20" : "bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100"} disabled:opacity-50 shadow-inner`}
                  >
                    {isVerifyingStripe ? <RefreshCw size={20} className="animate-spin" /> : <Zap size={20} />}
                    {dir === "rtl" ? "تحقق" : "Verify Sync"}
                  </Button>
                </div>

                {stripeVerification && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className={`mt-4 p-4 rounded-[4px] border ${stripeVerification.success ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-red-500/10 border-red-500/20 text-red-500"}`}
                  >
                    <div className="flex items-center gap-3">
                      {stripeVerification.success ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                      <span className="text-xs font-bold uppercase tracking-tight">{stripeVerification.message}</span>
                    </div>
                    {stripeVerification.details && (
                      <p className="text-[10px] mt-2 opacity-70 font-mono">{JSON.stringify(stripeVerification.details)}</p>
                    )}
                  </motion.div>
                )}
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Toast Placeholder */}
      {toast && (
        <div className={`fixed bottom-8 ${dir === "rtl" ? "left-8" : "right-8"} z-[9999] px-6 py-4 rounded-[4px] shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-300 ${toast.type === "success" ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"}`}>
          {toast.type === "success" ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span className="text-sm font-black uppercase tracking-tighter">{toast.message}</span>
        </div>
      )}
    </div>
  );
};

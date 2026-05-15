import React, { useState, useEffect } from "react";
import { 
  Settings, Globe, Info, Search, BarChart3, Image as ImageIcon,
  CheckCircle, AlertCircle, RefreshCw, Save, Camera, Globe2,
  Lock, Activity, ShieldCheck
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useSettings } from "../../context/SettingsContext";
import { useUI } from "../../context/UIContext";

interface SystemSettingsProps {}

export const SystemSettings: React.FC<SystemSettingsProps> = () => {
  const { theme, t, dir, language } = useTheme();
  const { token } = useAuth();
  const { siteSettings, setSiteSettings } = useSettings();
  const { setIsOperationPending } = useUI();

  const [siteName, setSiteName] = useState(siteSettings.siteName);
  const [siteNameAr, setSiteNameAr] = useState(siteSettings.siteNameAr || "");
  const [siteDescription, setSiteDescription] = useState(siteSettings.siteDescription);
  const [siteDescriptionAr, setSiteDescriptionAr] = useState(siteSettings.siteDescriptionAr || "");
  const [seoDescriptionEn, setSeoDescriptionEn] = useState("");
  const [seoDescriptionAr, setSeoDescriptionAr] = useState("");
  const [keywordsEn, setKeywordsEn] = useState("");
  const [keywordsAr, setKeywordsAr] = useState("");
  const [googleAnalyticsId, setGoogleAnalyticsId] = useState(siteSettings.googleAnalyticsId);

  const [logoBase64, setLogoBase64] = useState<string | null>(siteSettings.logoBase64);
  const [faviconBase64, setFaviconBase64] = useState<string | null>(siteSettings.faviconBase64);

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

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch("/api/admin/settings", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setSiteName(data.site_name_en || "");
          setSiteNameAr(data.site_name_ar || "");
          setSiteDescription(data.site_description_en || "");
          setSiteDescriptionAr(data.site_description_ar || "");
          
          const seoData = data.seo_description && data.seo_description.startsWith("{")
            ? JSON.parse(data.seo_description)
            : { en: data.seo_description || "", ar: "" };
          const kwsData = data.keywords && data.keywords.startsWith("{")
            ? JSON.parse(data.keywords)
            : { en: data.keywords || "", ar: "" };

          setSeoDescriptionEn(seoData.en || "");
          setSeoDescriptionAr(seoData.ar || "");
          setKeywordsEn(kwsData.en || "");
          setKeywordsAr(kwsData.ar || "");
          setGoogleAnalyticsId(data.google_analytics_id || "");
          setLogoBase64(data.logo_url || null);
          setFaviconBase64(data.favicon_url || null);

          setSiteSettings({
            ...siteSettings,
            siteName: data.site_name_en || "",
            siteNameAr: data.site_name_ar || "",
            siteDescription: data.site_description_en || "",
            siteDescriptionAr: data.site_description_ar || "",
            seoDescriptionEn: seoData.en || "",
            seoDescriptionAr: seoData.ar || "",
            keywordsEn: kwsData.en || "",
            keywordsAr: kwsData.ar || "",
            googleAnalyticsId: data.google_analytics_id || "",
            logoBase64: data.logo_url || null,
            faviconBase64: data.favicon_url || null,
          });
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
      }
    };
    if (token) fetchSettings();
  }, [token]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: "logo" | "favicon") => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showToast("Maximum file size is 2MB", "error");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === "logo") setLogoBase64(reader.result as string);
        else setFaviconBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveGeneralSettings = async () => {
    if (!siteName || !siteDescription) {
      showToast(t("allFieldsRequired") || "All fields are required", "error");
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          site_name_en: siteName,
          site_name_ar: siteNameAr,
          site_description_en: siteDescription,
          site_description_ar: siteDescriptionAr,
          seo_description: JSON.stringify({ en: seoDescriptionEn, ar: seoDescriptionAr }),
          keywords: JSON.stringify({ en: keywordsEn, ar: keywordsAr }),
          google_analytics_id: googleAnalyticsId,
          logo_url: logoBase64,
          favicon_url: faviconBase64,
          maintenance_mode: siteSettings.maintenanceMode,
        }),
      });

      if (res.ok) {
        showToast("Settings saved successfully", "success");
        setSiteSettings({
          ...siteSettings,
          siteName,
          siteNameAr,
          siteDescription,
          siteDescriptionAr,
          logoBase64,
          faviconBase64,
          googleAnalyticsId,
        });
      } else {
        const data = await res.json();
        showToast(data.error || "Failed to save settings", "error");
      }
    } catch (error) {
      showToast("Connection Error", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {toast && (
        <div className={`fixed bottom-6 ${dir === "rtl" ? "left-6" : "right-6"} z-50 flex items-center gap-3 px-6 py-4 rounded-[4px] shadow-2xl transition-all duration-300 animate-in slide-in-from-bottom-5 ${toast.type === "success" ? (theme === "dark" ? "bg-[#1a1a1c] border border-emerald-500/30 text-emerald-500" : "bg-white border border-emerald-200 text-emerald-600") : (theme === "dark" ? "bg-[#1a1a1c] border border-red-500/30 text-red-500" : "bg-white border border-red-200 text-red-600")}`}>
          {toast.type === "success" ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <span className="font-medium text-sm">{toast.message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className={`p-8 rounded-[4px] border ${theme === "dark" ? "bg-[#111111] border-gray-800/60" : "bg-white border-gray-200"} shadow-sm`}>
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 rounded-[4px] bg-emerald-500/10 text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                <Globe size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold">{t("generalSettings")}</h2>
                <p className="text-sm text-gray-500">{t("generalSettingsDesc")}</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">{t("siteName")} (EN)</label>
                  <input type="text" value={siteName} onChange={(e) => setSiteName(e.target.value)} className={`w-full h-12 px-4 rounded-[4px] border focus:outline-none focus:border-emerald-500/50 transition-all ${theme === "dark" ? "bg-[#0f0f11] border-gray-800 text-white" : "bg-gray-50 border-gray-200"}`} dir="ltr" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">{t("siteName")} (AR)</label>
                  <input type="text" value={siteNameAr} onChange={(e) => setSiteNameAr(e.target.value)} className={`w-full h-12 px-4 rounded-[4px] border focus:outline-none focus:border-emerald-500/50 transition-all ${theme === "dark" ? "bg-[#0f0f11] border-gray-800 text-white" : "bg-gray-50 border-gray-200"}`} dir="rtl" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">{t("siteDescription")} (EN)</label>
                <textarea rows={3} value={siteDescription} onChange={(e) => setSiteDescription(e.target.value)} className={`w-full p-4 rounded-[4px] border focus:outline-none focus:border-emerald-500/50 transition-all ${theme === "dark" ? "bg-[#0f0f11] border-gray-800 text-white" : "bg-gray-50 border-gray-200"}`} dir="ltr" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">{t("siteDescription")} (AR)</label>
                <textarea rows={3} value={siteDescriptionAr} onChange={(e) => setSiteDescriptionAr(e.target.value)} className={`w-full p-4 rounded-[4px] border focus:outline-none focus:border-emerald-500/50 transition-all ${theme === "dark" ? "bg-[#0f0f11] border-gray-800 text-white" : "bg-gray-50 border-gray-200"}`} dir="rtl" />
              </div>

              <div className="pt-6 border-t border-gray-800/20">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-[4px] bg-blue-500/10 text-blue-500"><Search size={18} /></div>
                  <h3 className="text-sm font-bold uppercase tracking-widest">{t("seoSettings")}</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">{t("seoDescription")} (EN)</label>
                    <textarea rows={3} value={seoDescriptionEn} onChange={(e) => setSeoDescriptionEn(e.target.value)} className={`w-full p-4 rounded-[4px] border focus:outline-none focus:border-emerald-500/50 transition-all ${theme === "dark" ? "bg-[#0f0f11] border-gray-800 text-white text-xs" : "bg-gray-50 border-gray-200 text-xs"}`} dir="ltr" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">{t("seoDescription")} (AR)</label>
                    <textarea rows={3} value={seoDescriptionAr} onChange={(e) => setSeoDescriptionAr(e.target.value)} className={`w-full p-4 rounded-[4px] border focus:outline-none focus:border-emerald-500/50 transition-all ${theme === "dark" ? "bg-[#0f0f11] border-gray-800 text-white text-xs" : "bg-gray-50 border-gray-200 text-xs"}`} dir="rtl" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">{t("keywords")} (EN)</label>
                    <input type="text" value={keywordsEn} onChange={(e) => setKeywordsEn(e.target.value)} placeholder="ai, analysis, crypto" className={`w-full h-11 px-4 rounded-[4px] border focus:outline-none focus:border-emerald-500/50 transition-all ${theme === "dark" ? "bg-[#0f0f11] border-gray-800 text-white text-xs" : "bg-gray-50 border-gray-200 text-xs"}`} dir="ltr" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">{t("keywords")} (AR)</label>
                    <input type="text" value={keywordsAr} onChange={(e) => setKeywordsAr(e.target.value)} placeholder="ذكاء، تحليل، عملات" className={`w-full h-11 px-4 rounded-[4px] border focus:outline-none focus:border-emerald-500/50 transition-all ${theme === "dark" ? "bg-[#0f0f11] border-gray-800 text-white text-xs" : "bg-gray-50 border-gray-200 text-xs"}`} dir="rtl" />
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-800/20">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-[4px] bg-rose-500/10 text-rose-500"><BarChart3 size={18} /></div>
                  <h3 className="text-sm font-bold uppercase tracking-widest">{t("analyticsSettings")}</h3>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">{t("googleAnalyticsId")}</label>
                  <input type="text" value={googleAnalyticsId} onChange={(e) => setGoogleAnalyticsId(e.target.value)} placeholder="G-XXXXXXXXXX" className={`w-full h-12 px-4 rounded-[4px] border focus:outline-none focus:border-emerald-500/50 transition-all ${theme === "dark" ? "bg-[#0f0f11] border-gray-800 text-white" : "bg-gray-50 border-gray-200"}`} dir="ltr" />
                </div>
              </div>
            </div>

            <div className="mt-10 flex justify-end">
              <button onClick={handleSaveGeneralSettings} disabled={isSaving} className="bg-emerald-500 hover:bg-emerald-600 text-white px-10 py-4 rounded-[4px] font-bold transition-all shadow-xl shadow-emerald-500/20 flex items-center gap-3 disabled:opacity-50">
                {isSaving ? <RefreshCw size={20} className="animate-spin" /> : <Save size={20} />}
                <span>{t("saveAllSettings")}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className={`p-8 rounded-[4px] border ${theme === "dark" ? "bg-[#111111] border-gray-800/60" : "bg-white border-gray-200"} shadow-sm`}>
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 rounded-[4px] bg-emerald-500/10 text-emerald-500"><ImageIcon size={20} /></div>
              <h3 className="text-sm font-bold uppercase tracking-widest">{t("brandVisuals")}</h3>
            </div>
            
            <div className="space-y-8">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">{t("platformLogo")}</label>
                  <label className="cursor-pointer group">
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, "logo")} />
                    <div className="flex items-center gap-2 text-emerald-500 text-xs font-bold"><Camera size={14} className="group-hover:scale-110 transition-transform" /><span>{t("change")}</span></div>
                  </label>
                </div>
                <div className={`w-full aspect-video rounded-[4px] border-2 border-dashed border-gray-800/50 bg-[#0f0f11] flex items-center justify-center p-6 relative overflow-hidden group/logo`}>
                  {logoBase64 ? <img src={logoBase64} alt="Platform Logo" className="max-w-full max-h-full object-contain relative z-10 transition-all duration-500 group-hover/logo:scale-110" /> : <div className="text-center"><ImageIcon size={40} className="mx-auto mb-2 text-gray-800" /><p className="text-[10px] text-gray-600 uppercase font-black tracking-widest">No Logo Uploaded</p></div>}
                  {logoBase64 && <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover/logo:opacity-100 transition-opacity" />}
                </div>
              </div>

              <div className="space-y-4 pt-6 border-t border-gray-800/20">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">{t("platformFavicon")}</label>
                  <label className="cursor-pointer group">
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, "favicon")} />
                    <div className="flex items-center gap-2 text-emerald-500 text-xs font-bold"><Camera size={14} className="group-hover:scale-110 transition-transform" /><span>{t("change")}</span></div>
                  </label>
                </div>
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 rounded-[4px] border-2 border-dashed border-gray-800/50 bg-[#0f0f11] flex items-center justify-center p-2 group/favicon relative overflow-hidden`}>
                    {faviconBase64 ? <img src={faviconBase64} alt="Favicon" className="w-full h-full object-contain relative z-10" /> : <Globe2 size={24} className="text-gray-800" />}
                  </div>
                  <div className="text-[10px] text-gray-500 leading-relaxed font-bold uppercase tracking-wider">
                    Recommended: 64x64px<br />PNG or ICO format<br />Max 512KB
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className={`p-8 rounded-[4px] border ${theme === "dark" ? "bg-[#111111] border-gray-800/60" : "bg-white border-gray-200"} group transition-all duration-300 hover:border-amber-500/20`}>
             <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-[4px] bg-amber-500/10 text-amber-500"><Lock size={20} /></div>
              <h3 className="text-sm font-bold uppercase tracking-widest">{t("maintenanceMode")}</h3>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed mb-6">
              Enable maintenance mode to disable all public access to the platform except for administrators.
            </p>
            <button onClick={() => setSiteSettings({...siteSettings, maintenanceMode: !siteSettings.maintenanceMode})} className={`w-full py-4 rounded-[4px] font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 border ${siteSettings.maintenanceMode ? "bg-amber-500 text-white border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.3)]" : "bg-gray-500/10 text-gray-400 border-gray-800 hover:bg-gray-800"}`}>
               {siteSettings.maintenanceMode ? (
                 <><Activity size={16} className="animate-pulse" /> <span>ADMIN ACCESS ONLY</span></>
               ) : (
                 <><ShieldCheck size={16} /> <span>PLATFORM LIVE</span></>
               )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from "react";
import { 
  Settings, RefreshCw, Save, Search, Plus, Trash2, Edit, CheckCircle, 
  AlertCircle, Info, ChevronDown, Globe, Image as ImageIcon, Search as SearchIcon
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAppContext } from "../../context/AppContext";

export const SystemSettingsView = ({
  theme,
  t,
  dir,
}: {
  theme: string;
  t: (key: string, replacements?: any) => string;
  dir: string;
}) => {
  const { token, setIsOperationPending, language } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // States match the massive AdminDashboard implementation
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  const [faviconBase64, setFaviconBase64] = useState<string | null>(null);
  const [seoDescriptionEn, setSeoDescriptionEn] = useState("");
  const [seoDescriptionAr, setSeoDescriptionAr] = useState("");
  const [keywordsEn, setKeywordsEn] = useState("");
  const [keywordsAr, setKeywordsAr] = useState("");
  const [googleAnalyticsId, setGoogleAnalyticsId] = useState("");

  const fetchSettings = async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/admin/settings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLogoBase64(data.logo);
        setFaviconBase64(data.favicon);
        setSeoDescriptionEn(data.seo_description_en);
        setSeoDescriptionAr(data.seo_description_ar);
        setKeywordsEn(data.keywords_en);
        setKeywordsAr(data.keywords_ar);
        setGoogleAnalyticsId(data.google_analytics_id);
      }
    } catch (err) {
      console.error("Error fetching settings:", err);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [token]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: "logo" | "favicon") => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) return alert(t("fileTooLarge"));

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      if (type === "logo") setLogoBase64(base64);
      else setFaviconBase64(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (field: string, value: any) => {
    if (!token) return;
    setIsSaving(true);
    setIsOperationPending(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ [field]: value }),
      });
      if (res.ok) {
        // Updated globally or locally
      }
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setIsSaving(false);
      setIsOperationPending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Visual Identity */}
      <div className={`p-6 md:p-8 rounded-[4px] border ${theme === "dark" ? "bg-[#111111] border-gray-800/60" : "bg-white border-gray-200"}`}>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-[4px] bg-purple-500/10 text-purple-500">
            <ImageIcon size={24} />
          </div>
          <h2 className="text-xl font-bold">{t("visualIdentity")}</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className={`p-6 rounded-[4px] border border-dashed flex flex-col items-center justify-center text-center relative overflow-hidden group ${theme === "dark" ? "border-gray-700 bg-[#1a1a1c]" : "border-gray-300 bg-gray-50"}`}>
             <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, "logo")} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
             <div className="mb-4 h-8 flex items-center justify-center">
                {logoBase64 ? <img src={logoBase64} alt="Logo" className="h-8 object-contain" /> : <div className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">No Logo</div>}
             </div>
             <h3 className="font-bold text-sm mb-1">{t("uploadLogo")}</h3>
             <p className="text-[10px] text-gray-500">PNG, SVG, JPG (MAX 1MB)</p>
          </div>

          <div className={`p-6 rounded-[4px] border border-dashed flex flex-col items-center justify-center text-center relative overflow-hidden group ${theme === "dark" ? "border-gray-700 bg-[#1a1a1c]" : "border-gray-300 bg-gray-50"}`}>
             <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, "favicon")} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
             <div className="mb-4 w-8 h-8 rounded-md bg-gray-800 flex items-center justify-center overflow-hidden">
                {faviconBase64 ? <img src={faviconBase64} alt="Favicon" className="w-full h-full" /> : <Globe size={16} className="text-gray-400" />}
             </div>
             <h3 className="font-bold text-sm mb-1">{t("uploadFavicon")}</h3>
             <p className="text-[10px] text-gray-500">32x32 PNG or ICO</p>
          </div>
        </div>
        
        <div className="flex justify-end mt-6">
           <button onClick={() => handleSave("logo", logoBase64)} disabled={isSaving} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2.5 rounded-[4px] font-bold text-xs shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-50">
              {isSaving ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
              SAVE ASSETS
           </button>
        </div>
      </div>

      {/* SEO */}
       <div className={`p-6 md:p-8 rounded-[4px] border ${theme === "dark" ? "bg-[#111111] border-gray-800/60" : "bg-white border-gray-200"}`}>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-[4px] bg-blue-500/10 text-blue-500">
            <SearchIcon size={24} />
          </div>
          <h2 className="text-xl font-bold">{t("seoFields")}</h2>
        </div>

        <div className="space-y-6">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                 <label className="text-xs font-black text-gray-500 uppercase mb-2 d-block">SEO Description (EN)</label>
                 <textarea rows={3} value={seoDescriptionEn} onChange={(e) => setSeoDescriptionEn(e.target.value)} className={`w-full px-4 py-3 rounded-[4px] border focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${theme === "dark" ? "bg-[#1a1a1c] border-gray-800" : "bg-gray-50 border-gray-200"}`} />
              </div>
              <div>
                 <label className="text-xs font-black text-gray-500 uppercase mb-2 d-block">SEO Description (AR)</label>
                 <textarea rows={3} value={seoDescriptionAr} onChange={(e) => setSeoDescriptionAr(e.target.value)} className={`w-full px-4 py-3 rounded-[4px] border focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${theme === "dark" ? "bg-[#1a1a1c] border-gray-800" : "bg-gray-50 border-gray-200"}`} />
              </div>
           </div>
           <div>
              <label className="text-xs font-black text-gray-500 uppercase mb-2 d-block">Google Analytics ID</label>
              <input type="text" value={googleAnalyticsId} onChange={(e) => setGoogleAnalyticsId(e.target.value)} className={`w-full px-4 py-3 rounded-[4px] border focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${theme === "dark" ? "bg-[#1a1a1c] border-gray-800" : "bg-gray-50 border-gray-200"}`} />
           </div>
        </div>

        <div className="flex justify-end mt-6">
           <button onClick={() => handleSave("seo_description_en", seoDescriptionEn)} disabled={isSaving} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-2.5 rounded-[4px] font-bold text-xs shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-50">
              {isSaving ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
              UPDATE PROTOCOL
           </button>
        </div>
      </div>
    </div>
  );
};

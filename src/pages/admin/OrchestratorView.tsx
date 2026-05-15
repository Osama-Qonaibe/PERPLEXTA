import React, { useState, useEffect } from "react";
import { 
  Cpu, RefreshCw, Save, Search, ChevronDown, CheckCircle, 
  AlertCircle, Info, Zap, Settings, Globe, Command
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAppContext } from "../../context/AppContext";

export const OrchestratorView = ({
  theme,
  t,
  dir,
  providerModels,
}: {
  theme: string;
  t: (key: string, replacements?: any) => string;
  dir: string;
  providerModels: Record<string, any[]>;
}) => {
  const { token, setIsOperationPending } = useAppContext();
  const [tools, setTools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchTools = async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/admin/orchestrator/tools", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setTools(await res.json());
      }
    } catch (err) {
      console.error("Error fetching tools:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTools();
  }, [token]);

  const handleUpdateTool = (id: string, field: string, value: any) => {
    setTools((prev) =>
      prev.map((t) => (t.id === id ? { ...t, [field]: value } : t)),
    );
  };

  const handleSaveTool = async (tool: any) => {
    if (!token) return;
    setIsSaving(true);
    setIsOperationPending(true);
    try {
      const res = await fetch(`/api/admin/orchestrator/tools/${tool.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(tool),
      });
      if (res.ok) {
        // Success
      }
    } catch (err) {
      console.error("Error saving tool:", err);
    } finally {
      setIsSaving(false);
      setIsOperationPending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Cpu size={48} className="text-emerald-500 animate-spin mb-4" />
        <p className="text-gray-500 font-medium">SYSTÈM ORCHESTRATION LOADING...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {tools.map((tool) => (
          <motion.div
            key={tool.id}
            layout
            className={`p-6 rounded-[4px] border ${theme === "dark" ? "bg-[#111111] border-gray-800/60" : "bg-white border-gray-100"}`}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                 <div
                  className={`p-2.5 rounded-[4px] ${tool.is_active ? "bg-emerald-500/10 text-emerald-500" : "bg-gray-500/10 text-gray-500"}`}
                >
                  <Command size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-lg uppercase tracking-tight">{t(tool.id) || tool.id}</h3>
                  <p className="text-[10px] font-black text-gray-500 uppercase">{tool.task_description?.substring(0, 40)}...</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={tool.is_active}
                  onChange={() => handleUpdateTool(tool.id, "is_active", !tool.is_active)}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-500"></div>
              </label>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {["primary", "fallback_1", "fallback_2"].map((level) => (
                  <div key={level}>
                    <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5">{t(level)}</label>
                    <select
                      value={`${tool[`${level}_provider`]}:${tool[`${level}_model`]}`}
                      onChange={(e) => {
                        const [p, m] = e.target.value.split(":");
                        handleUpdateTool(tool.id, `${level}_provider`, p);
                        handleUpdateTool(tool.id, `${level}_model`, m);
                      }}
                      className={`w-full px-3 py-2 rounded-[4px] border text-xs font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500 ${theme === "dark" ? "bg-[#1a1a1c] border-gray-800 text-white" : "bg-gray-50 border-gray-200"}`}
                    >
                      <option value="">{t("disabled")}</option>
                      {Object.entries(providerModels).map(([provider, models]) => (
                        <optgroup key={provider} label={provider.toUpperCase()}>
                          {models.map((m: any) => (
                            <option key={m.id} value={`${provider}:${m.id}`}>
                              {m.id}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                   <Zap size={14} className="text-amber-500" />
                   <span className="text-[10px] font-black text-gray-500 uppercase">Routing Priority: Stable</span>
                </div>
                <button
                  onClick={() => handleSaveTool(tool)}
                  disabled={isSaving}
                  className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2 rounded-[4px] font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSaving ? <RefreshCw className="animate-spin" size={14} /> : <Save size={14} />}
                  {t("saveChanges")}
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

import React, { useState, useEffect } from "react";
import { 
  Key, RefreshCw, Save, Copy, Eye, EyeOff, Search, PlusCircle, Trash,
  CheckCircle, AlertCircle, Info, Trash2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAppContext } from "../../context/AppContext";

export const ApiKeysVaultView = ({
  theme,
  t,
  dir,
  providerModels,
  setProviderModels,
}: {
  theme: string;
  t: (key: string, replacements?: any) => string;
  dir: string;
  providerModels: Record<string, any[]>;
  setProviderModels: (models: Record<string, any[]>) => void;
}) => {
  const { token, setIsOperationPending } = useAppContext();
  const [keys, setKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  const fetchKeys = async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/admin/api-keys", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setKeys(data.keys || []);
      }
    } catch (error) {
      console.error("Error fetching API keys:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, [token]);

  const handleUpdateKey = async (id: string, value: string) => {
    setKeys((prev) =>
      prev.map((k) => (k.id === id ? { ...k, api_key: value } : k)),
    );
  };

  const handleToggleActive = async (id: string, current: boolean) => {
    setKeys((prev) =>
      prev.map((k) => (k.id === id ? { ...k, is_active: !current } : k)),
    );
  };

  const handleSave = async (apiKey: any) => {
    if (!token) return;
    setIsSaving(true);
    setIsOperationPending(true);
    try {
      const res = await fetch(`/api/admin/api-keys/${apiKey.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          api_key: apiKey.api_key,
          is_active: apiKey.is_active,
        }),
      });
      if (res.ok) {
        // Refresh models if provider key changed
        const modelsRes = await fetch("/api/admin/orchestrator/models", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (modelsRes.ok) {
          const data = await modelsRes.json();
          setProviderModels(data.providerModels);
        }
      }
    } catch (error) {
      console.error("Error saving API key:", error);
    } finally {
      setIsSaving(false);
      setIsOperationPending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-pulse">
        <Key size={48} className="text-emerald-500 mb-4 animate-bounce" />
        <p className="text-gray-500 font-medium">
          {t("accessingVault") || "ACCESSING SECURE VAULT..."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {keys.map((apiKey) => (
          <motion.div
            key={apiKey.id}
            layout
            className={`p-6 rounded-[4px] border ${theme === "dark" ? "bg-[#111111] border-gray-800/60" : "bg-white border-gray-100"} shadow-sm hover:shadow-md transition-all duration-300`}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2.5 rounded-[4px] ${apiKey.is_active ? "bg-emerald-500/10 text-emerald-500" : "bg-gray-500/10 text-gray-500"}`}
                >
                  <Key size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-lg uppercase tracking-tight">
                    {apiKey.provider_name}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${apiKey.is_active ? "bg-emerald-500 animate-pulse" : "bg-gray-500"}`}
                    />
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-tighter">
                      {apiKey.is_active ? t("active") : t("inactive")}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={apiKey.is_active}
                    onChange={() =>
                      handleToggleActive(apiKey.id, apiKey.is_active)
                    }
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-500"></div>
                </label>
              </div>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <input
                  type={showKeys[apiKey.id] ? "text" : "password"}
                  value={apiKey.api_key || ""}
                  onChange={(e) => handleUpdateKey(apiKey.id, e.target.value)}
                  placeholder={`Enter ${apiKey.provider_name} API Key`}
                  className={`w-full px-4 py-3 rounded-[4px] border font-mono text-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${theme === "dark" ? "bg-[#1a1a1c] border-gray-800 text-white" : "bg-gray-50 border-gray-200"}`}
                />
                <button
                  onClick={() =>
                    setShowKeys((prev) => ({
                      ...prev,
                      [apiKey.id]: !prev[apiKey.id],
                    }))
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-emerald-500 p-1"
                >
                  {showKeys[apiKey.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-[10px] text-gray-500 font-medium">
                  <Info size={12} />
                  <span>
                    {providerModels[apiKey.provider_name.toLowerCase()]?.length ||
                      0}{" "}
                    MODELS LOADED
                  </span>
                </div>
                <button
                  onClick={() => handleSave(apiKey)}
                  disabled={isSaving}
                  className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2 rounded-[4px] font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSaving ? (
                    <RefreshCw className="animate-spin" size={14} />
                  ) : (
                    <Save size={14} />
                  )}
                  {t("saveChanges") || "SAVE"}
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

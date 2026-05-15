import React, { useState, useEffect } from "react";
import { 
  LayoutGrid, Zap, Sparkles, Brain, Scale, 
  Megaphone, ImageIcon, Video, Mic, Volume2, 
  GraduationCap, Code2, Music, Database, Search,
  RefreshCw, CheckCircle, AlertCircle, Save, 
  Shield, Coins
} from "lucide-react";
import { motion } from "motion/react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { toast } from "../../components/ui/Toast";

interface OrchestratorProps {
  providerModels: Record<string, any[]>;
}

export const Orchestrator: React.FC<OrchestratorProps> = ({
  providerModels,
}) => {
  const { token } = useAuth();
  const { theme, t, dir, language } = useTheme();
  const [tools, setTools] = useState<any[]>([]);
  const [loadingTools, setLoadingTools] = useState(true);

  const fetchData = async () => {
    try {
      const routesRes = await fetch("/api/admin/orchestrator/routes", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (routesRes.ok) {
        const routesData = await routesRes.json();
        const listData = routesData;
        const savedRoutes = routesData.routes;

        const masterTools = listData.tools.map((t: any) => ({
          id: t.tool_id || t.id,
          titleKey: t.tool_id || t.id,
          description: t.description || t.task_description,
          descriptionAr: t.descriptionAr || t.task_description_ar,
          icon: LayoutGrid,
          primaryProvider: "",
          primaryModel: "",
          fallback1Provider: "",
          fallback1Model: "",
          fallback2Provider: "",
          fallback2Model: "",
          fallback3Provider: "",
          fallback3Model: "",
          isActive: true,
          costPerUsage: t.cost_per_usage || 10,
          isSaving: false,
        }));

        if (savedRoutes && savedRoutes.length > 0) {
          const mergedTools = masterTools.map((tool: any) => {
            const savedRoute = savedRoutes.find((r: any) => r.tool_id === tool.id);

            const iconMap: Record<string, any> = {
              chat: LayoutGrid,
              chat_fast: Zap,
              chat_pro: Sparkles,
              chat_reasoning: Brain,
              perplexta_analysis: Brain,
              legal_analysis: Scale,
              notebook: Megaphone,
              image: ImageIcon,
              video: Video,
              stt: Mic,
              tts: Volume2,
              learning: GraduationCap,
              code: Code2,
              canvas: Music,
              sovereign_memory: Database,
              sovereign_search: Search,
            };

            if (savedRoute) {
              return {
                ...tool,
                icon: iconMap[tool.id] || LayoutGrid,
                primaryProvider: savedRoute.primary_provider || "",
                primaryModel: savedRoute.primary_model || "",
                fallback1Provider: savedRoute.fallback_1_provider || "",
                fallback1Model: savedRoute.fallback_1_model || "",
                fallback2Provider: savedRoute.fallback_2_provider || "",
                fallback2Model: savedRoute.fallback_2_model || "",
                fallback3Provider: savedRoute.fallback_3_provider || "",
                fallback3Model: savedRoute.fallback_3_model || "",
                isActive: savedRoute.is_active ?? true,
                costPerUsage: savedRoute.cost_per_usage || tool.costPerUsage,
              };
            }
            return { ...tool, icon: iconMap[tool.id] || LayoutGrid };
          });
          setTools(mergedTools);
        } else {
          setTools(masterTools);
        }
      }
    } catch (error) {
      console.error("Error fetching orchestrator data:", error);
    } finally {
      setLoadingTools(false);
    }
  };

  useEffect(() => {
    if (token) fetchData();
  }, [token]);

  const handleSave = async (id: string, overrideTool?: any) => {
    const toolToSave = overrideTool || tools.find((t) => t.id === id);
    if (!toolToSave) return;

    if (!overrideTool) {
      setTools((ts) => ts.map((t) => (t.id === id ? { ...t, isSaving: true } : t)));
    }

    try {
      const res = await fetch("/api/admin/orchestrator/routes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          routes: [
            {
              tool_id: toolToSave.id,
              primary_provider: toolToSave.primaryProvider,
              primary_model: toolToSave.primaryModel,
              fallback1_provider: toolToSave.fallback1Provider,
              fallback1_model: toolToSave.fallback1Model,
              fallback2_provider: toolToSave.fallback2Provider,
              fallback2_model: toolToSave.fallback2Model,
              fallback3_provider: toolToSave.fallback3Provider,
              fallback3_model: toolToSave.fallback3Model,
              is_active: toolToSave.isActive,
              cost_per_usage: toolToSave.costPerUsage,
            },
          ],
        }),
      });

      if (res.ok) {
        toast.success(language === "ar" ? "تم حفظ إعدادات التوجيه بنجاح" : "Routing settings saved successfully");
      } else {
        toast.error(language === "ar" ? "فشل حفظ الإعدادات" : "Failed to save settings");
      }
    } catch (error) {
      console.error("Error saving route:", error);
      toast.error(language === "ar" ? "خطأ في الاتصال" : "Connection error");
    } finally {
      if (!overrideTool) {
        setTools((ts) => ts.map((t) => (t.id === id ? { ...t, isSaving: false } : t)));
      }
    }
  };

  const handleChange = (id: string, field: string, value: string | number) => {
    setTools((ts) => ts.map((t) => (t.id === id ? { ...t, [field]: value } : t)));
  };

  const renderProviderOptions = () => {
    const providers = Object.keys(providerModels);
    return [
      <option key="none" value="">{t("orchestratorProvider")}</option>,
      ...providers.map((provider) => {
        const displayNames: Record<string, string> = {
          serper: "Serper (Search)",
          tavily: "Tavily (Search)",
          google_search: "Google Search",
          openai: "OpenAI",
          anthropic: "Anthropic",
          google: "Google AI",
          deepseek: "DeepSeek",
          groq: "Groq",
          openrouter: "OpenRouter",
          together: "Together AI",
          mistral: "Mistral AI",
          xai: "xAI",
          elevenlabs: "ElevenLabs (TTS)",
          ollama: "Ollama",
        };
        const label = displayNames[provider] || provider;
        return <option key={provider} value={provider}>{label}</option>;
      }),
    ];
  };

  const renderModelOptions = (providerId: string) => {
    const rawModels = providerModels[providerId] || [];
    const seenValues = new Set<string>();
    const models = rawModels.filter((model) => {
      const modelValue = typeof model === "string" ? model : model.id || model.name || "";
      if (!modelValue || seenValues.has(modelValue)) return false;
      seenValues.add(modelValue);
      return true;
    });

    return [
      <option key="none" value="">{t("model")}</option>,
      ...models.map((model, idx) => {
        const modelValue = typeof model === "string" ? model : model.id || model.name;
        const modelLabel = typeof model === "string" ? model : model.name || model.id;
        return <option key={`${modelValue}-${idx}`} value={modelValue}>{modelLabel}</option>;
      }),
    ];
  };

  if (loadingTools) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <RefreshCw size={40} className="text-emerald-500 animate-spin" />
        <p className="text-gray-500 font-mono text-sm uppercase tracking-[0.3em]">
          Synchronizing Orchestrator...
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {tools.map((tool) => {
        const Icon = tool.icon;
        return (
          <Card key={tool.id} className="p-6 relative overflow-hidden bg-[var(--bg-secondary)] border-[var(--border-main)] hover:border-emerald-500/20 hover:shadow-lg group/tool">
            <div className="absolute -top-6 -right-6 opacity-[0.03] dark:opacity-[0.02] pointer-events-none group-hover/tool:scale-110 transition-transform duration-700">
              <Icon size={140} />
            </div>

            <div className="flex items-center justify-between mb-8 relative z-10">
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-[4px] bg-emerald-500 text-white shadow-[0_4px_10px_rgba(16,185,129,0.3)]">
                  <Icon size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-[var(--text-primary)] leading-tight">{t(tool.titleKey)}</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${tool.isActive ? "bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,1)]" : "bg-gray-400"}`} />
                    <span className={`text-[9px] font-black uppercase tracking-widest ${tool.isActive ? "text-emerald-500" : "text-gray-400"}`}>
                      {tool.isActive ? (language === "ar" ? "نشط" : "Active Routing") : (language === "ar" ? "معطل" : "Standby")}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={async () => {
                    const newState = !tool.isActive;
                    setTools((ts) => ts.map((t) => t.id === tool.id ? { ...t, isActive: newState } : t));
                    await handleSave(tool.id, { ...tool, isActive: newState });
                  }}
                  className={`w-11 h-6 rounded-full p-1 transition-all duration-500 ${tool.isActive ? "bg-emerald-500/20 border border-emerald-500/30" : "bg-gray-800/50 border border-gray-700"}`}
                >
                  <motion.div animate={{ x: tool.isActive ? (dir === "rtl" ? -20 : 20) : 0 }} className={`w-4 h-4 rounded-full shadow-md ${tool.isActive ? "bg-emerald-500" : "bg-gray-500"}`} />
                </button>
                <button
                  onClick={() => handleSave(tool.id)}
                  disabled={tool.isSaving}
                  className={`p-2 rounded-[4px] transition-all ${tool.isSaving ? "text-emerald-500" : "text-gray-400 hover:text-emerald-500 hover:bg-emerald-500/10"}`}
                >
                  {tool.isSaving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                </button>
              </div>
            </div>

            <div className="space-y-6 relative z-10">
              <div className="space-y-2.5 p-4 rounded-[4px] bg-[var(--bg-primary)]/50 border border-[var(--border-main)]/50 shadow-inner">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1 block">{t("costPoints")}</label>
                <div className="relative">
                  <input
                    type="number"
                    value={tool.costPerUsage || 0}
                    onChange={(e) => handleChange(tool.id, "costPerUsage", Number(e.target.value))}
                    className="w-full h-11 px-9 rounded-[4px] border text-sm font-black focus:outline-none transition-all bg-[var(--bg-primary)] border-[var(--border-main)] text-emerald-500 focus:ring-1 focus:ring-emerald-500/30"
                  />
                  <div className={`absolute top-1/2 -translate-y-1/2 px-3 text-emerald-500/50 ${dir === "rtl" ? "right-0" : "left-0"}`}>
                    <Coins size={16} className="drop-shadow-[0_0_5px_rgba(16,185,129,0.3)]" />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 px-1">
                    <Zap size={14} className="text-emerald-500" />
                    <span className="text-[10px] font-black text-[var(--text-primary)] uppercase tracking-[0.2em]">{t("primaryEngine")}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={tool.primaryProvider || ""}
                      onChange={(e) => { handleChange(tool.id, "primaryProvider", e.target.value); handleChange(tool.id, "primaryModel", ""); }}
                      className="w-full h-10 px-3 rounded-[4px] border text-[11px] font-bold focus:outline-none bg-[var(--bg-primary)] border-[var(--border-main)] text-[var(--text-primary)]"
                      dir="ltr"
                    >
                      {renderProviderOptions()}
                    </select>
                    <select
                      value={tool.primaryModel || ""}
                      onChange={(e) => handleChange(tool.id, "primaryModel", e.target.value)}
                      className="w-full h-10 px-3 rounded-[4px] border text-[11px] font-bold focus:outline-none bg-[var(--bg-primary)] border-[var(--border-main)] text-[var(--text-primary)]"
                      dir="ltr"
                      disabled={!tool.primaryProvider}
                    >
                      {renderModelOptions(tool.primaryProvider)}
                    </select>
                  </div>
                </div>

                <div className="space-y-3 pt-2 border-t border-[var(--border-main)]/50">
                  <div className="flex items-center gap-2 px-1 opacity-60">
                    <Shield size={14} className="text-amber-500" />
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">{t("fallbackProtocol")}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={tool.fallback1Provider || ""}
                      onChange={(e) => { handleChange(tool.id, "fallback1Provider", e.target.value); handleChange(tool.id, "fallback1Model", ""); }}
                      className="w-full h-9 px-2 rounded-[4px] border text-[10px] bg-[var(--bg-primary)] border-[var(--border-main)]"
                      dir="ltr"
                    >
                      {renderProviderOptions()}
                    </select>
                    <select
                      value={tool.fallback1Model || ""}
                      onChange={(e) => handleChange(tool.id, "fallback1Model", e.target.value)}
                      className="w-full h-9 px-2 rounded-[4px] border text-[10px] bg-[var(--bg-primary)] border-[var(--border-main)]"
                      dir="ltr"
                      disabled={!tool.fallback1Provider}
                    >
                      {renderModelOptions(tool.fallback1Provider)}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

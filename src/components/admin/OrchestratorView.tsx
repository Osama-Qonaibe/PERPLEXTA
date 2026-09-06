import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAppContext } from "../../context/AppContext";
import { motion, AnimatePresence } from "motion/react";
import { ALL_TOOLS } from "../../constants";
import { getAuthHeaders, getTimeAgo } from "../../utils/adminUtils";
import { validateToolRoutePricing } from "../../utils/orchestratorValidator";
import { SearchableSelect } from "../SearchableSelect";
import {
  LayoutGrid,
  Sparkles,
  Scale,
  Megaphone,
  Image as ImageIcon,
  Video,
  Mic,
  Volume2,
  GraduationCap,
  Code2,
  Music,
  Coins,
  Cpu,
  Brain,
  Zap,
  RefreshCw,
  Save,
  Search,
  Shield,
  Database,
  Eye,
  Clock,
  CheckCircle2,
  Activity,
} from "lucide-react";
import { OrchestratorViewProps } from "./adminTypes";

export const OrchestratorView = ({
  theme,
  t,
  dir,
  providerModels,
  showToast,
  onRefreshModels,
}: {
  theme: string;
  t: (key: string, replacements?: any) => string;
  dir: string;
  providerModels: Record<string, any[]>;
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  onRefreshModels?: () => Promise<void> | void;
}) => {
  const { token, language } = useAppContext();

  const [tools, setTools] = useState<any[]>([]);
  const [loadingTools, setLoadingTools] = useState(true);
  const [gpuProviders, setGpuProviders] = useState<any[]>([]);
  const [gpuModels, setGpuModels] = useState<any[]>([]);
  const [currentProviderModels, setCurrentProviderModels] = useState<Record<string, any[]>>(providerModels || {});
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState<string | null>(null);
  const [syncStats, setSyncStats] = useState<{
    totalModelsCount: number;
    activeKeysCount: number;
    activeGpuCount: number;
    toolsCount: number;
  } | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [isSyncingModels, setIsSyncingModels] = useState(false);
  const [discoveryStatus, setDiscoveryStatus] = useState<any>(null);
  const [, setTick] = useState(0);

  // Keep internal provider models in sync with incoming props
  useEffect(() => {
    if (providerModels && Object.keys(providerModels).length > 0) {
      setCurrentProviderModels(providerModels);
    }
  }, [providerModels]);

  // Periodic ticker to smoothly update relative timestamps (e.g., "just now", "1m ago")
  useEffect(() => {
    const timer = setInterval(() => setTick((prev) => prev + 1), 20000);
    return () => clearInterval(timer);
  }, []);

  const formatSyncDateTime = useCallback((timestamp: string | null) => {
    if (!timestamp) return "";
    const d = new Date(timestamp);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleTimeString(language === "ar" ? "ar-SA" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  }, [language]);

  const totalAvailableModels = useMemo(() => {
    let count = 0;
    Object.values(currentProviderModels).forEach((arr) => {
      if (Array.isArray(arr)) count += arr.length;
    });
    count += gpuModels.length;
    return count;
  }, [currentProviderModels, gpuModels]);

  const handleSyncModelsOnDemand = async () => {
    setIsSyncingModels(true);
    try {
      const res = await fetch("/api/admin/orchestrator/sync-models", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.lastSync) {
          setLastSyncTimestamp(data.lastSync);
        } else {
          setLastSyncTimestamp(new Date().toISOString());
        }
        if (data.providerModels) {
          setCurrentProviderModels(data.providerModels);
        }
        if (data.gpuModels) {
          setGpuModels(data.gpuModels);
        }
        if (data.discoveryStatus) {
          setDiscoveryStatus(data.discoveryStatus);
        }
        if (data.totalModelCount !== undefined) {
          setSyncStats((prev) => prev ? { ...prev, totalModelsCount: data.totalModelCount } : null);
        }
        if (onRefreshModels) {
          await onRefreshModels();
        }
        showToast(
          language === "ar"
            ? `تم تحديث قائمة النماذج بنجاح (${data.totalModelCount ?? totalAvailableModels} نموذج متزامن مع قاعدة البيانات)`
            : `Model listings refreshed successfully (${data.totalModelCount ?? totalAvailableModels} models synced with database)`,
          "success"
        );
      } else {
        showToast(data.message || data.error || (language === "ar" ? "فشلت المزامنة اليدوية" : "Sync failed"), "error");
      }
    } catch (err: any) {
      showToast(err.message || (language === "ar" ? "خطأ في الاتصال" : "Connection error"), "error");
    } finally {
      setIsSyncingModels(false);
    }
  };

  const categories = [
    {
      id: "all",
      labelAr: "الكل",
      labelEn: "All",
      icon: LayoutGrid,
      filter: () => true
    },
    {
      id: "chat",
      labelAr: "المحادثة والنصوص",
      labelEn: "Chat & Text",
      icon: Brain,
      filter: (id: string) => ["chat_fast", "chat", "chat_pro", "chat_reasoning", "code", "legal_analysis", "learning"].includes(id)
    },
    {
      id: "media",
      labelAr: "الوسائط والرؤية (GPU)",
      labelEn: "GPU Media & Vision",
      icon: ImageIcon,
      filter: (id: string) => ["image", "video", "vision"].includes(id)
    },
    {
      id: "audio",
      labelAr: "الصوتيات واللغات",
      labelEn: "Audio & Music",
      icon: Volume2,
      filter: (id: string) => ["canvas", "stt", "tts", "perplexta_music"].includes(id)
    },
    {
      id: "search",
      labelAr: "البحث والمعرفة",
      labelEn: "Search & Knowledge",
      icon: Search,
      filter: (id: string) => ["sovereign_search", "sovereign_memory", "notebook", "perplexta_analysis"].includes(id)
    },
    {
      id: "dev",
      labelAr: "البوابات والمطورين",
      labelEn: "Gateways & API",
      icon: Cpu,
      filter: (id: string) => ["x402_api"].includes(id)
    }
  ];

  const providerOptionsList = useMemo(() => {
    return Object.keys(currentProviderModels).map((provider) => {
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
      return { value: provider, label };
    });
  }, [currentProviderModels]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [routesRes, gpuProvRes, gpuModRes, syncStatusRes, modelsRes] = await Promise.all([
          fetch("/api/admin/orchestrator/routes", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("/api/admin/gpu-providers", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("/api/admin/gpu-providers/models", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("/api/admin/orchestrator/sync-status", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("/api/admin/orchestrator/models", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        let fetchedGpuModels: any[] = [];
        if (modelsRes.ok) {
          const mData = await modelsRes.json();
          if (mData.providerModels) {
            setCurrentProviderModels(mData.providerModels);
          }
          if (mData.gpuModels && mData.gpuModels.length > 0) {
            fetchedGpuModels = mData.gpuModels;
            setGpuModels(fetchedGpuModels);
          }
          if (mData.discoveryStatus) {
            setDiscoveryStatus(mData.discoveryStatus);
          }
        }
        if (gpuProvRes.ok) {
          const gData = await gpuProvRes.json();
          if (gData.success) setGpuProviders(gData.providers || []);
        }
        if (gpuModRes.ok && fetchedGpuModels.length === 0) {
          const gmData = await gpuModRes.json();
          if (gmData.success) {
            fetchedGpuModels = gmData.models || [];
            setGpuModels(fetchedGpuModels);
          }
        }
        if (syncStatusRes.ok) {
          const sData = await syncStatusRes.json();
          if (sData.success && sData.lastSync) {
            setLastSyncTimestamp(sData.lastSync);
            setSyncStats({
              totalModelsCount: sData.totalModelsCount ?? 0,
              activeKeysCount: sData.activeKeysCount ?? 0,
              activeGpuCount: sData.activeGpuCount ?? 0,
              toolsCount: sData.toolsCount ?? 0,
            });
          }
          if (sData.discoveryStatus) {
            setDiscoveryStatus(sData.discoveryStatus);
          }
        }

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
            costPerUsage: t.cost_per_usage !== undefined && t.cost_per_usage !== null ? t.cost_per_usage : 10,
            costPer1kInputTokens: t.cost_per_1k_input_tokens !== undefined ? t.cost_per_1k_input_tokens : 5,
            costPer1kOutputTokens: t.cost_per_1k_output_tokens !== undefined ? t.cost_per_1k_output_tokens : 15,
            isSaving: false,
          }));

          if (savedRoutes && savedRoutes.length > 0) {
            // Merge saved routes into master tools
            const mergedTools = masterTools.map((tool: any) => {
              const savedRoute = savedRoutes.find(
                (r: any) => r.tool_id === tool.id,
              );

              const iconMap: Record<string, any> = {
                chat: LayoutGrid,
                chat_fast: Zap,
                chat_pro: Sparkles,
                chat_reasoning: Brain,
                perplexta_analysis: Brain,
                legal_analysis: Scale,
                notebook: Megaphone,
                vision: Eye,
                image: ImageIcon,
                video: Video,
                stt: Mic,
                tts: Volume2,
                learning: GraduationCap,
                code: Code2,
                canvas: Music,
                sovereign_memory: Database,
                sovereign_search: Search,
                x402_api: Cpu,
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
                  costPerUsage: savedRoute.cost_per_usage !== undefined && savedRoute.cost_per_usage !== null ? savedRoute.cost_per_usage : tool.costPerUsage,
                  costPer1kInputTokens: savedRoute.cost_per_1k_input_tokens !== undefined ? savedRoute.cost_per_1k_input_tokens : tool.costPer1kInputTokens,
                  costPer1kOutputTokens: savedRoute.cost_per_1k_output_tokens !== undefined ? savedRoute.cost_per_1k_output_tokens : tool.costPer1kOutputTokens,
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

    if (token) {
      fetchData();
    }
  }, [token]);

  const handleSave = async (id: string, overrideTool?: any) => {
    const toolToSave = overrideTool || tools.find((t) => t.id === id);
    if (!toolToSave) return;

    const validation = validateToolRoutePricing(toolToSave, language === "ar" ? "ar" : "en");
    if (!validation.isValid) {
      showToast(validation.errors.join(" | "), "error");
      return;
    }

    if (!overrideTool) {
      setTools((ts) =>
        ts.map((t) => (t.id === id ? { ...t, isSaving: true } : t)),
      );
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
              fallback_1_provider: toolToSave.fallback1Provider,
              fallback_1_model: toolToSave.fallback1Model,
              fallback_2_provider: toolToSave.fallback2Provider,
              fallback_2_model: toolToSave.fallback2Model,
              fallback_3_provider: toolToSave.fallback3Provider,
              fallback_3_model: toolToSave.fallback3Model,
              is_active: toolToSave.isActive,
              cost_per_usage: toolToSave.costPerUsage,
              cost_per_1k_input_tokens: toolToSave.costPer1kInputTokens !== undefined ? toolToSave.costPer1kInputTokens : 5,
              cost_per_1k_output_tokens: toolToSave.costPer1kOutputTokens !== undefined ? toolToSave.costPer1kOutputTokens : 15,
            },
          ],
        }),
      });

      if (res.ok) {
        setLastSyncTimestamp(new Date().toISOString());
        showToast(
          language === "ar"
            ? "تم حفظ إعدادات التوجيه بنجاح"
            : "Routing settings saved successfully",
          "success",
        );
      } else {
        showToast(
          language === "ar" ? "فشل حفظ الإعدادات" : "Failed to save settings",
          "error",
        );
      }
    } catch (error) {
      console.error("Error saving route:", error);
      showToast(
        language === "ar" ? "خطأ في الاتصال" : "Connection error",
        "error",
      );
    } finally {
      if (!overrideTool) {
        setTools((ts) =>
          ts.map((t) => (t.id === id ? { ...t, isSaving: false } : t)),
        );
      }
    }
  };

  const handleChange = (id: string, field: string, value: string) => {
    setTools((ts) =>
      ts.map((t) => (t.id === id ? { ...t, [field]: value } : t)),
    );
  };

  const getModelOptionsList = (providerId: string, currentVal: string) => {
    const rawModels = currentProviderModels[providerId] || [];
    const seenValues = new Set<string>();
    const models = rawModels.filter((model) => {
      const modelValue =
        typeof model === "string" ? model : model.id || model.name || "";
      if (!modelValue || seenValues.has(modelValue)) return false;
      seenValues.add(modelValue);
      return true;
    });

    const opts = models.map((model) => {
      const modelValue = typeof model === "string" ? model : model.id || model.name;
      const modelLabel = typeof model === "string" ? model : model.name || model.id;
      return { value: modelValue, label: modelLabel };
    });
    if (currentVal && !opts.find(o => o.value === currentVal)) {
      opts.push({ value: currentVal, label: `⚠️ ${currentVal} (Not Synced)` });
    }
    return opts;
  };

  const isGpuTool = (toolId: string) =>
    toolId === "vision" ||
    toolId === "image" ||
    toolId === "video" ||
    toolId === "perplexta_vision";

  const getProviderOptionsForTool = (toolId: string) => {
    if (isGpuTool(toolId)) {
      const activeGpuProviders = gpuProviders.filter(
        (gp) => gp.is_active !== false && gp.status !== "inactive"
      );

      // Filter GPU providers specifically capable of or registered for this tool
      const relevantProviders = activeGpuProviders.filter((gp) => {
        const caps = Array.isArray(gp.capabilities) ? gp.capabilities : [];
        const matchesCap =
          (toolId === "video" && (caps.includes("video_generation") || caps.includes("video"))) ||
          (toolId === "image" && (caps.includes("image_generation") || caps.includes("image"))) ||
          ((toolId === "vision" || toolId === "perplexta_vision") && (caps.includes("vision") || caps.includes("vision_analysis")));

        const hasMatchingModel = gpuModels.some((m) => {
          const pId = String(m.provider_code || m.provider_slug || m.provider_id || "").toLowerCase();
          const matchesThisProvider = pId === String(gp.provider_id).toLowerCase() || m.provider_id === gp.id || m.gpu_provider_id === gp.id;
          if (!matchesThisProvider || m.is_active === false) return false;

          const tType = String(m.task_type || "").toLowerCase();
          if (toolId === "video") return tType === "video_gen" || tType === "video";
          if (toolId === "image") return tType === "image_gen" || tType === "image";
          if (toolId === "vision" || toolId === "perplexta_vision") return tType === "vision_analysis" || tType === "vision" || !tType;
          return true;
        });

        return matchesCap || hasMatchingModel;
      });

      const listToDisplay = relevantProviders.length > 0 ? relevantProviders : activeGpuProviders;

      if (listToDisplay.length === 0) {
        return [
          {
            value: "",
            label: language === "ar" ? "لا توجد خوادم GPU نشطة مسجلة" : "No active GPU servers registered"
          }
        ];
      }

      return listToDisplay.map((gp) => ({
        value: gp.provider_id,
        label: `⚡ [GPU NODE] ${gp.name} (${(gp.health_status || "offline").toUpperCase()})`
      }));
    }
    return providerOptionsList;
  };

  const getModelOptionsForTool = (toolId: string, providerId: string, currentVal: string) => {
    if (isGpuTool(toolId)) {
      if (!providerId) {
        return [
          {
            value: "",
            label: language === "ar" ? "اختر خادم الـ GPU أولاً" : "Select GPU server first"
          }
        ];
      }

      // Match ONLY authentic models stored and synced in gpu_provider_models for this exact provider
      const modelsForProvider = gpuModels.filter((m) => {
        const pId = String(m.provider_code || m.provider_slug || m.provider_id || "").toLowerCase();
        const targetP = String(providerId || "").toLowerCase();
        const matchesProvider = pId === targetP || String(m.provider_pk || m.id) === targetP;
        if (!matchesProvider || m.is_active === false) return false;

        const tType = String(m.task_type || "").toLowerCase();
        if (toolId === "image") {
          return tType === "image_gen" || tType === "image" || tType === "image_generation";
        }
        if (toolId === "video") {
          return tType === "video_gen" || tType === "video" || tType === "video_generation";
        }
        if (toolId === "vision" || toolId === "perplexta_vision") {
          return tType === "vision_analysis" || tType === "vision" || !tType;
        }
        return true;
      });

      const opts = modelsForProvider.map((m) => ({
        value: m.model_id,
        label: m.name && m.name !== m.model_id ? `${m.name} (${m.model_id})` : m.model_id
      }));

      if (opts.length === 0) {
        return [
          {
            value: "",
            label: language === "ar"
              ? "لا توجد نماذج متزامنة لهذا الخادم (يرجى المزامنة من قسم GPU)"
              : "No synced models for this server (Please sync in GPU section)"
          }
        ];
      }

      // If currentVal is already saved in the database but not in the synced models list, indicate it clearly
      if (currentVal && !opts.find((o) => o.value === currentVal)) {
        opts.unshift({
          value: currentVal,
          label: `${currentVal} ⚠️ (${language === "ar" ? "غير متزامن" : "Unsynced"})`
        });
      }

      return opts;
    }
    return getModelOptionsList(providerId, currentVal);
  };

  const currentCatObj = categories.find((c) => c.id === activeCategory) || categories[0];
  const filteredTools = tools.filter((tool) => currentCatObj.filter(tool.id));

  return (
    <div className="space-y-6 max-w-7xl mx-auto relative">
      {loadingTools ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <RefreshCw size={40} className="text-accent animate-spin" />
          <p className="text-gray-500 font-mono text-sm uppercase tracking-[0.3em]">
            Synchronizing Orchestrator...
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top Bar: Visual Sync Status Indicator & Developer On-Demand Trigger */}
          <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-main)] shadow-sm space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Left Side: Sync Status Indicator & Database Health */}
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="p-2.5 rounded-xl bg-accent/10 text-accent shrink-0 border border-accent/20 relative">
                  <Database size={20} />
                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-black text-[var(--text-primary)]">
                      {language === "ar" ? "حالة مزامنة الأوركسترا" : "Orchestrator Sync Status"}
                    </span>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>{language === "ar" ? "قاعدة البيانات متزامنة" : "Database Synced"}</span>
                    </div>

                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/25" title={language === "ar" ? "خدمة استكشاف خوادم الـ GPU المسجلة تعمل تلقائياً وبشكل دوري" : "Automated GPU endpoint discovery service is active and running"}>
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse"></span>
                      <span>{language === "ar" ? "استكشاف الـ GPU التلقائي" : "Auto GPU Discovery"}</span>
                      {discoveryStatus?.discoveredModelsCount !== undefined && (
                        <span className="font-mono text-[10px] opacity-80">
                          • {discoveryStatus.discoveredModelsCount} {language === "ar" ? "نموذج" : "models"}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-1.5 font-medium">
                      <Clock size={13} className="text-accent/80 shrink-0" />
                      <span>
                        {language === "ar" ? "آخر مزامنة لقاعدة البيانات:" : "Last Successful Sync:"}{" "}
                        <strong className="text-[var(--text-primary)] font-semibold">
                          {lastSyncTimestamp
                            ? getTimeAgo(lastSyncTimestamp, language) || (language === "ar" ? "الآن" : "just now")
                            : (language === "ar" ? "جاري القراءة..." : "Checking...")}
                        </strong>
                      </span>
                      {lastSyncTimestamp && (
                        <span className="text-[11px] text-gray-400 font-mono" title={new Date(lastSyncTimestamp).toISOString()}>
                          ({formatSyncDateTime(lastSyncTimestamp)})
                        </span>
                      )}
                    </div>

                    <span className="hidden sm:inline text-gray-300 dark:text-gray-700">•</span>

                    <div className="flex items-center gap-1.5 text-[11px] text-gray-400 font-mono">
                      <span>
                        {language === "ar"
                          ? `${syncStats?.totalModelsCount ?? totalAvailableModels} نموذج متاح`
                          : `${syncStats?.totalModelsCount ?? totalAvailableModels} models available`}
                      </span>
                      <span>•</span>
                      <span>
                        {language === "ar"
                          ? `${tools.length} أداة موجهة`
                          : `${tools.length} tools active`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Side: Manual Trigger for Developers */}
              <div className="flex items-center gap-2.5 sm:self-auto self-start">
                <button
                  id="orchestrator-manual-sync-trigger"
                  onClick={handleSyncModelsOnDemand}
                  disabled={isSyncingModels}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all border border-accent/40 bg-accent/10 text-accent hover:bg-accent hover:text-white active:scale-95 disabled:opacity-50 disabled:pointer-events-none shrink-0 shadow-sm cursor-pointer group"
                  title={
                    language === "ar"
                      ? "تحديث فوري لقوائم النماذج المسجلة ومزامنتها مع قاعدة البيانات عند الطلب"
                      : "Manual on-demand trigger to query providers, update database models, and refresh listings"
                  }
                >
                  <RefreshCw size={14} className={isSyncingModels ? "animate-spin text-accent" : "group-hover:rotate-180 transition-transform duration-500"} />
                  <span>
                    {isSyncingModels
                      ? (language === "ar" ? "جاري تحديث النماذج..." : "Refreshing Models...")
                      : (language === "ar" ? "تحديث قائمة النماذج (عند الطلب)" : "Refresh Model Listings")}
                  </span>
                </button>
              </div>
            </div>

            {/* Bottom info note */}
            <div className="pt-2 border-t border-[var(--border-main)]/60 text-[11px] text-gray-400 flex flex-wrap items-center justify-between gap-2">
              <span>
                {language === "ar"
                  ? "يتم الحفظ الدائم في PostgreSQL Core & Vault وقراءة النماذج محلياً لمنع الاستيقاظ غير الضروري لخوادم الـ GPU."
                  : "Configurations persist in PostgreSQL Core & Vault; models are read locally to prevent idle worker wakeups."}
              </span>
              <span className="font-mono text-[10px] text-gray-400 bg-[var(--surface-subtle)] px-2 py-0.5 rounded border border-[var(--border-main)]">
                {language === "ar" ? "أدوات المطورين • On-Demand" : "Developer Tools • On-Demand"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2.5 pt-1 no-scrollbar scroll-smooth border-b border-[var(--border-main)]/50">
            {categories.map((cat) => {
              const CatIcon = cat.icon;
              const count = tools.filter((t) => cat.filter(t.id)).length;
              const isActive = activeCategory === cat.id;

              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap border shrink-0 ${
                    isActive
                      ? "bg-accent text-white border-accent shadow-md shadow-accent/20"
                      : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-main)] hover:border-accent/40 hover:text-accent"
                  }`}
                >
                  <CatIcon size={15} className={isActive ? "text-white" : "text-gray-400"} />
                  <span>{language === "ar" ? cat.labelAr : cat.labelEn}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                      isActive ? "bg-white/20 text-white" : "bg-[var(--bg-primary)] text-gray-400"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTools.map((tool, tIdx) => {
            const Icon = tool.icon;

            return (
              <div
                key={`orch-tool-${tool.id || tIdx}-${tIdx}`}
                className={`p-6 rounded-lg border transition-theme relative bg-[var(--bg-secondary)] border-[var(--border-main)] hover:border-accent/20 hover:shadow-lg group/tool z-10 hover:z-20 focus-within:z-40 [&:has([data-dropdown-open="true"])]:z-40`}
              >
                <div className="absolute inset-0 overflow-hidden rounded-lg pointer-events-none">
                  <div className="absolute -top-6 -right-6 opacity-[0.03] dark:opacity-[0.02] group-hover/tool:scale-110 transition-theme">
                    <Icon size={140} />
                  </div>
                </div>

                <div className="flex items-center justify-between mb-8 relative z-10">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-1.5 rounded-md bg-accent text-white shadow-[0_4px_10px_rgba(156,163,175,0.3)]`}
                    >
                      <Icon size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-lg text-[var(--text-primary)] leading-tight">
                          {tool.titleKey === 'vision' ? (language === 'ar' ? 'الرؤية الحاسوبية وقراءة المستندات' : 'Computer Vision & OCR Engine') : t(tool.titleKey)}
                        </h3>
                        {isGpuTool(tool.id) && (
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-accent/10 text-accent border border-accent/20">
                            GPU Node
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div
                          className={`w-1.5 h-1.5 rounded-full ${tool.isActive ? "bg-accent shadow-[0_0_5px_rgba(156,163,175,1)]" : "bg-gray-400"}`}
                        ></div>
                        <span
                          className={`text-[9px] font-black uppercase tracking-widest ${tool.isActive ? "text-accent" : "text-gray-400"}`}
                        >
                          {tool.isActive
                            ? language === "ar"
                              ? "نشط"
                              : "Active Routing"
                            : language === "ar"
                              ? "معطل"
                              : "Standby"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                      <button
                        onClick={async () => {
                          const newState = !tool.isActive;
                          setTools((ts) =>
                            ts.map((t) =>
                              t.id === tool.id ? { ...t, isActive: newState } : t,
                            ),
                          );
                          await handleSave(tool.id, { ...tool, isActive: newState });
                        }}
                        className={`w-11 h-6 rounded-full p-1 transition-theme cursor-pointer ${
                          tool.isActive
                            ? "bg-accent/20 border border-accent/30"
                            : "bg-[var(--bg-secondary)]/50 border border-[var(--border-main)]"
                        }`}
                        title={
                          tool.isActive
                            ? (language === "ar" ? "تعطيل الأداة" : "Disable Tool")
                            : (language === "ar" ? "تفعيل الأداة" : "Enable Tool")
                        }
                      >
                      <motion.div
                        animate={{
                          x: tool.isActive ? (dir === "rtl" ? -20 : 20) : 0,
                        }}
                        className={`w-4 h-4 rounded-full shadow-md ${tool.isActive ? "bg-accent" : "bg-[var(--bg-secondary)]"}`}
                      />
                    </button>
                      <button
                        onClick={() => handleSave(tool.id)}
                        disabled={tool.isSaving}
                        className={`p-2 rounded-sm transition-theme ${tool.isSaving ? "text-accent" : "text-gray-400 hover:text-accent hover:bg-accent/10"}`}
                      >
                      {tool.isSaving ? (
                        <RefreshCw size={18} className="animate-spin" />
                      ) : (
                        <Save size={18} />
                      )}
                    </button>
                  </div>
                </div>

                {/* Genuine, clean endpoint connection notice - only if tool is active and actually bound to a provider */}
                {tool.isActive && tool.primaryProvider && (() => {
                  const linkedGpu = isGpuTool(tool.id)
                    ? gpuProviders.find((gp) => String(gp.provider_id).toLowerCase() === String(tool.primaryProvider).toLowerCase())
                    : null;
                  const serverName = linkedGpu?.name || tool.primaryProvider;
                  const healthStatus = linkedGpu?.health_status;

                  return (
                    <div className="mb-5 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center justify-between gap-2 relative z-10">
                      <div className="flex items-center gap-2 min-w-0">
                        <Zap size={13} className="shrink-0 text-emerald-500" />
                        <span className="font-semibold text-[11px] truncate">
                          {language === "ar"
                            ? `مرتبط بالخادم: ${serverName}`
                            : `Connected to server: ${serverName}`}
                        </span>
                      </div>
                      {healthStatus && (
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-emerald-500/15 font-mono shrink-0">
                          {healthStatus}
                        </span>
                      )}
                    </div>
                  );
                })()}

                <div className="space-y-6 relative z-10">
                  <div className="space-y-2.5 p-4 rounded-md bg-[var(--bg-primary)]/50 border border-[var(--border-main)]/50 shadow-inner">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1 block">
                      {language === "ar" ? "رسم تشغيل الخدمة الثابت (Flat Execution Base)" : "Flat Execution Base Cost"}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={tool.costPerUsage ?? 0}
                        onChange={(e) =>
                          handleChange(tool.id, "costPerUsage", e.target.value)
                        }
                        className={`w-full h-11 px-9 rounded-md border text-sm font-black focus:outline-none transition-theme bg-[var(--bg-primary)] border-[var(--border-main)] text-accent focus:ring-1 focus:ring-accent-500/30`}
                      />
                      <div
                        className={`absolute top-1/2 -translate-y-1/2 px-3 text-accent/50 ${dir === "rtl" ? "right-0" : "left-0"}`}
                      >
                        <Coins
                          size={16}
                          className=""
                        />
                      </div>
                      <div
                        className={`absolute top-1/2 -translate-y-1/2 px-3 text-[10px] font-black text-gray-400 uppercase tracking-widest pointer-events-none ${dir === "rtl" ? "left-0" : "right-0"}`}
                      >
                        {t("points")}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2.5 p-4 rounded-md bg-[var(--bg-primary)]/50 border border-[var(--border-main)]/50 shadow-inner">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1 block">
                        {language === "ar" ? "سعر مدخلات /1K توكن" : "Input /1k Token Cost"}
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={tool.costPer1kInputTokens ?? 0}
                          onChange={(e) =>
                            handleChange(tool.id, "costPer1kInputTokens", e.target.value)
                          }
                          className={`w-full h-11 px-9 rounded-md border text-sm font-black focus:outline-none transition-theme bg-[var(--bg-primary)] border-[var(--border-main)] text-sky-500 focus:ring-1 focus:ring-sky-500/30`}
                        />
                        <div
                          className={`absolute top-1/2 -translate-y-1/2 px-3 text-sky-500/50 ${dir === "rtl" ? "right-0" : "left-0"}`}
                        >
                          <Coins
                            size={16}
                            className="drop-shadow-[0_0_5px_rgba(14,165,233,0.3)]"
                          />
                        </div>
                        <div
                          className={`absolute top-1/2 -translate-y-1/2 px-3 text-[10px] font-black text-gray-400 uppercase tracking-widest pointer-events-none ${dir === "rtl" ? "left-0" : "right-0"}`}
                        >
                          {t("points")}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2.5 p-4 rounded-md bg-[var(--bg-primary)]/50 border border-[var(--border-main)]/50 shadow-inner">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1 block">
                        {language === "ar" ? "سعر مخرجات /1K توكن" : "Output /1k Token Cost"}
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={tool.costPer1kOutputTokens ?? 0}
                          onChange={(e) =>
                            handleChange(tool.id, "costPer1kOutputTokens", e.target.value)
                          }
                          className={`w-full h-11 px-9 rounded-md border text-sm font-black focus:outline-none transition-theme bg-[var(--bg-primary)] border-[var(--border-main)] text-indigo-500 focus:ring-1 focus:ring-indigo-500/30`}
                        />
                        <div
                          className={`absolute top-1/2 -translate-y-1/2 px-3 text-indigo-500/50 ${dir === "rtl" ? "right-0" : "left-0"}`}
                        >
                          <Coins
                            size={16}
                            className="drop-shadow-[0_0_5px_rgba(99,102,241,0.3)]"
                          />
                        </div>
                        <div
                          className={`absolute top-1/2 -translate-y-1/2 px-3 text-[10px] font-black text-gray-400 uppercase tracking-widest pointer-events-none ${dir === "rtl" ? "left-0" : "right-0"}`}
                        >
                          {t("points")}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 px-1">
                        <Zap size={14} className="text-accent" />
                        <span className="text-[10px] font-black text-[var(--text-primary)] uppercase tracking-[0.2em]">
                          {t("primaryEngine")}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <SearchableSelect
                          value={tool.primaryProvider || ""}
                          onChange={(val) => {
                            handleChange(tool.id, "primaryProvider", val);
                            handleChange(tool.id, "primaryModel", "");
                          }}
                          options={getProviderOptionsForTool(tool.id)}
                          placeholder={isGpuTool(tool.id) ? (language === "ar" ? "اختر مزود الـ GPU" : "Select GPU Provider") : (language === "ar" ? "اختر مزود الخدمة" : "Select Provider")}
                          dir="ltr"
                        />
                        <SearchableSelect
                          value={tool.primaryModel || ""}
                          onChange={(val) => handleChange(tool.id, "primaryModel", val)}
                          options={getModelOptionsForTool(tool.id, tool.primaryProvider, tool.primaryModel)}
                          placeholder={isGpuTool(tool.id) ? (language === "ar" ? "اختر نموذج الـ GPU" : "Select GPU Model") : t("model")}
                          disabled={!tool.primaryProvider}
                          dir="ltr"
                        />
                      </div>
                    </div>

                    <div className="space-y-3 pt-2 border-t border-[var(--border-main)]/50">
                      <div className="flex items-center gap-2 px-1 opacity-60">
                        <Shield size={14} className="text-amber-500" />
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">
                          {t("fallbackProtocol")}
                        </span>
                      </div>

                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <SearchableSelect
                            value={tool.fallback1Provider || ""}
                            onChange={(val) => {
                              handleChange(tool.id, "fallback1Provider", val);
                              handleChange(tool.id, "fallback1Model", "");
                            }}
                            options={getProviderOptionsForTool(tool.id)}
                            placeholder={isGpuTool(tool.id) ? (language === "ar" ? "مزود GPU بديل 1" : "GPU Fallback 1") : (language === "ar" ? "اختر مزود الخدمة" : "Select Provider")}
                            dir="ltr"
                          />
                          <SearchableSelect
                            value={tool.fallback1Model || ""}
                            onChange={(val) => handleChange(tool.id, "fallback1Model", val)}
                            options={getModelOptionsForTool(tool.id, tool.fallback1Provider, tool.fallback1Model)}
                            placeholder={isGpuTool(tool.id) ? (language === "ar" ? "نموذج GPU بديل" : "GPU Model") : t("model")}
                            disabled={!tool.fallback1Provider}
                            dir="ltr"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2 pt-4 border-t border-[var(--border-main)]/30">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex-1">
                        <SearchableSelect
                          value={tool.fallback2Provider || ""}
                          onChange={(val) => {
                            handleChange(tool.id, "fallback2Provider", val);
                            handleChange(tool.id, "fallback2Model", "");
                          }}
                          options={getProviderOptionsForTool(tool.id)}
                          placeholder={isGpuTool(tool.id) ? (language === "ar" ? "مزود GPU بديل 2" : "GPU Fallback 2") : (language === "ar" ? "اختر مزود الخدمة" : "Select Provider")}
                          dir="ltr"
                        />
                      </div>
                      <div className="flex-1">
                        <SearchableSelect
                          value={tool.fallback2Model || ""}
                          onChange={(val) => handleChange(tool.id, "fallback2Model", val)}
                          options={getModelOptionsForTool(tool.id, tool.fallback2Provider, tool.fallback2Model)}
                          placeholder={isGpuTool(tool.id) ? (language === "ar" ? "نموذج GPU بديل" : "GPU Model") : t("model")}
                          disabled={!tool.fallback2Provider}
                          dir="ltr"
                        />
                      </div>
                    </div>

                    {/* Fallback 3 */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex-1">
                        <SearchableSelect
                          value={tool.fallback3Provider || ""}
                          onChange={(val) => {
                            handleChange(tool.id, "fallback3Provider", val);
                            handleChange(tool.id, "fallback3Model", "");
                          }}
                          options={getProviderOptionsForTool(tool.id)}
                          placeholder={isGpuTool(tool.id) ? (language === "ar" ? "مزود GPU بديل 3" : "GPU Fallback 3") : (language === "ar" ? "اختر مزود الخدمة" : "Select Provider")}
                          dir="ltr"
                        />
                      </div>
                      <div className="flex-1">
                        <SearchableSelect
                          value={tool.fallback3Model || ""}
                          onChange={(val) => handleChange(tool.id, "fallback3Model", val)}
                          options={getModelOptionsForTool(tool.id, tool.fallback3Provider, tool.fallback3Model)}
                          placeholder={isGpuTool(tool.id) ? (language === "ar" ? "نموذج GPU بديل" : "GPU Model") : t("model")}
                          disabled={!tool.fallback3Provider}
                          dir="ltr"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  Server,
  Zap,
  Activity,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Trash2,
  Edit3,
  ExternalLink,
  Eye,
  Sliders,
  Play,
  Cpu,
  ShieldAlert,
  HelpCircle,
  Database,
  Layers,
  ChevronRight,
  Info,
  RotateCcw
} from "lucide-react";
import { useAppContext } from "../../context/AppContext";
import { useConfirm } from "../../context/ConfirmContext";
import { GpuInfrastructureViewProps } from "./adminTypes";

interface GpuProviderRecord {
  id: number;
  provider_id: string;
  name: string;
  provider_type: 'runpod_serverless' | 'openai_vision_compatible' | 'comfyui_worker' | 'custom_rest';
  endpoint_id: string | null;
  base_url: string;
  api_url?: string;
  current_load_capacity?: number;
  status?: string;
  metadata?: any;
  health_status: 'online' | 'cold_boot' | 'offline';
  latency_ms: number;
  capabilities: string[];
  daily_budget: number | string;
  used_today: number | string;
  config: any;
  is_active: boolean;
  model_count: number;
  created_at: string;
}

interface GpuModelRecord {
  id: number;
  provider_id: number;
  model_id: string;
  name: string;
  task_type: 'vision_analysis' | 'image_gen' | 'video_gen' | 'audio_gen';
  context_window: number;
  max_output_tokens: number;
  is_active: boolean;
}

interface GpuJobRecord {
  id: number;
  job_id: string;
  user_id: number | null;
  provider_id: number | null;
  provider_name?: string;
  provider_code?: string;
  user_email?: string;
  model_id: string;
  task_type: 'vision_analysis' | 'image_gen' | 'video_gen' | 'audio_gen';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  prompt: string | null;
  parameters: any;
  remote_job_id: string | null;
  result_url: string | null;
  result_data: any;
  latency_ms: number;
  error_message: string | null;
  attempts: number;
  failover_count: number;
  cost_charged: number | string;
  created_at: string;
  completed_at: string | null;
}

export const GpuInfrastructureView: React.FC<GpuInfrastructureViewProps> = ({
  theme,
  t,
  dir,
  showToast = () => {},
}) => {
  const { token, language, user } = useAppContext();
  const confirm = useConfirm();
  const isRtl = language === "ar";

  const [activeTab, setActiveTab] = useState<'providers' | 'jobs'>('providers');
  const [providers, setProviders] = useState<GpuProviderRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'cold_boot' | 'offline'>('all');

  // Jobs Queue State & Purge Controls
  const [jobs, setJobs] = useState<GpuJobRecord[]>([]);
  const [totalJobsCount, setTotalJobsCount] = useState(0);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
  const [jobTaskFilter, setJobTaskFilter] = useState<'all' | 'vision_analysis' | 'image_gen' | 'video_gen'>('all');
  const [jobStatusFilter, setJobStatusFilter] = useState<'all' | 'completed' | 'processing' | 'failed'>('all');
  const [inspectingJob, setInspectingJob] = useState<GpuJobRecord | null>(null);
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
  const [isPurgeModalOpen, setIsPurgeModalOpen] = useState(false);
  const [purgeMode, setPurgeMode] = useState<'all' | 'selected' | 'status' | 'older_than'>('all');
  const [purgeStatus, setPurgeStatus] = useState<string>('completed');
  const [purgeDays, setPurgeDays] = useState<number>(7);
  const [isPurging, setIsPurging] = useState(false);
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null);

  // Modals state
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<GpuProviderRecord | null>(null);
  const [modelsModalProvider, setModelsModalProvider] = useState<GpuProviderRecord | null>(null);
  const [providerModels, setProviderModels] = useState<GpuModelRecord[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [deleteModal, setDeleteModal] = useState<GpuProviderRecord | null>(null);
  const [isSandboxOpen, setIsSandboxOpen] = useState(false);

  // Form State for Add/Edit
  const [formData, setFormData] = useState({
    provider_id: "",
    name: "",
    provider_type: "runpod_serverless" as 'runpod_serverless' | 'openai_vision_compatible' | 'comfyui_worker' | 'custom_rest',
    endpoint_id: "",
    base_url: "https://api.runpod.ai/v2",
    api_key: "",
    capabilities: ["vision", "image_generation", "video_generation"],
    daily_budget: "0",
    timeout_seconds: 60,
    current_load_capacity: 100
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testingId, setTestingId] = useState<number | null>(null);
  const [syncingId, setSyncingId] = useState<number | null>(null);

  // New Model Manual Form inside Drawer
  const [newModelForm, setNewModelForm] = useState({
    model_id: "",
    name: "",
    task_type: "vision_analysis" as 'vision_analysis' | 'image_gen' | 'video_gen',
    context_window: 32768,
    max_output_tokens: 4096
  });

  // Sandbox Live Test State
  const [sandboxTaskType, setSandboxTaskType] = useState<'vision_analysis' | 'image_gen' | 'video_gen'>('vision_analysis');
  const [sandboxPrompt, setSandboxPrompt] = useState("Analyze this image in detail and extract all key technical data.");
  const [sandboxImageUrl, setSandboxImageUrl] = useState("https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60");
  const [sandboxAspectRatio, setSandboxAspectRatio] = useState("1:1");
  const [sandboxDuration, setSandboxDuration] = useState(4);
  const [sandboxRunning, setSandboxRunning] = useState(false);
  const [sandboxResult, setSandboxResult] = useState<any>(null);

  const fetchProviders = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/gpu-providers", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setProviders(data.providers || []);
      } else {
        showToast(data.error || "Failed to load GPU providers", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Network error loading GPU providers", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchJobs = async () => {
    setIsLoadingJobs(true);
    try {
      let url = `/api/admin/gpu-providers/jobs?limit=50`;
      if (jobTaskFilter !== 'all') url += `&task_type=${jobTaskFilter}`;
      if (jobStatusFilter !== 'all') url += `&status=${jobStatusFilter}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setJobs(data.jobs || []);
        setTotalJobsCount(data.total || 0);
      }
    } catch (err: any) {
      console.error("Failed to load GPU execution jobs:", err);
    } finally {
      setIsLoadingJobs(false);
    }
  };

  const areAllVisibleSelected = jobs.length > 0 && jobs.every((j) => selectedJobIds.includes(j.job_id));

  const toggleSelectAll = () => {
    if (areAllVisibleSelected) {
      setSelectedJobIds([]);
    } else {
      setSelectedJobIds(jobs.map((j) => j.job_id));
    }
  };

  const toggleSelectJob = (jobId: string) => {
    setSelectedJobIds((prev) =>
      prev.includes(jobId) ? prev.filter((id) => id !== jobId) : [...prev, jobId]
    );
  };

  const handleDeleteSingleJob = async (job: GpuJobRecord) => {
    const isConfirmed = await confirm({
      title: isRtl ? "حذف سجل المهمة؟" : "Delete Job Record?",
      description: isRtl ? `هل أنت متأكد من حذف سجل المهمة ${job.job_id.substring(0, 8)}...؟` : `Delete job record ${job.job_id.substring(0, 8)}...?`,
      variant: "danger"
    });
    if (!isConfirmed) return;

    setDeletingJobId(job.job_id);
    try {
      const res = await fetch(`/api/admin/gpu-providers/jobs/${job.job_id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(isRtl ? "تم حذف سجل المهمة بنجاح" : "Job record deleted successfully", "success");
        setSelectedJobIds((prev) => prev.filter((id) => id !== job.job_id));
        if (inspectingJob?.job_id === job.job_id) {
          setInspectingJob(null);
        }
        fetchJobs();
      } else {
        showToast(data.error || "Failed to delete job", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to delete job", "error");
    } finally {
      setDeletingJobId(null);
    }
  };

  const handleExecutePurge = async () => {
    if (purgeMode === 'selected' && selectedJobIds.length === 0) {
      showToast(isRtl ? "يرجى تحديد مهمة واحدة على الأقل للحذف" : "Please select at least one job to delete", "error");
      return;
    }

    setIsPurging(true);
    try {
      const payload: any = { mode: purgeMode };
      if (purgeMode === 'selected') {
        payload.job_ids = selectedJobIds;
      } else if (purgeMode === 'status') {
        payload.status = purgeStatus;
      } else if (purgeMode === 'older_than') {
        payload.days = purgeDays;
      }

      const res = await fetch("/api/admin/gpu-providers/jobs/purge", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(
          isRtl
            ? `تم تنظيف السجل بنجاح (تم حذف ${data.deletedCount} سجل، المتبقي: ${data.remainingTotal})`
            : `Successfully cleaned logs (${data.deletedCount} purged, remaining: ${data.remainingTotal})`,
          "success"
        );
        setSelectedJobIds([]);
        setIsPurgeModalOpen(false);
        if (inspectingJob) setInspectingJob(null);
        fetchJobs();
      } else {
        showToast(data.error || "Failed to purge jobs", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to purge jobs", "error");
    } finally {
      setIsPurging(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchProviders();
    }
  }, [token]);

  useEffect(() => {
    if (token && activeTab === 'jobs') {
      fetchJobs();
    }
  }, [token, activeTab, jobTaskFilter, jobStatusFilter]);

  const handleOpenAdd = () => {
    setEditingProvider(null);
    setFormData({
      provider_id: "",
      name: "",
      provider_type: "runpod_serverless",
      endpoint_id: "",
      base_url: "https://api.runpod.ai/v2",
      api_key: "",
      capabilities: ["vision", "image_generation", "video_generation"],
      daily_budget: "0",
      timeout_seconds: 60,
      current_load_capacity: 100
    });
    setIsAddEditOpen(true);
  };

  const handleOpenEdit = (p: GpuProviderRecord) => {
    setEditingProvider(p);
    setFormData({
      provider_id: p.provider_id,
      name: p.name,
      provider_type: p.provider_type,
      endpoint_id: p.endpoint_id || "",
      base_url: p.base_url,
      api_key: "", // masked
      capabilities: p.capabilities || ["vision"],
      daily_budget: String(p.daily_budget || 0),
      timeout_seconds: p.config?.timeout_seconds || 60,
      current_load_capacity: p.current_load_capacity || 100
    });
    setIsAddEditOpen(true);
  };

  const handleSaveProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.base_url) {
      showToast(isRtl ? "يرجى ملء جميع الحقول الإلزامية" : "Please fill all required fields", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const url = editingProvider
        ? `/api/admin/gpu-providers/${editingProvider.id}`
        : "/api/admin/gpu-providers";
      const method = editingProvider ? "PUT" : "POST";

      const payload: any = {
        provider_id: formData.provider_id || formData.name.toLowerCase().replace(/[^a-z0-9]/g, "_"),
        name: formData.name,
        provider_type: formData.provider_type,
        endpoint_id: formData.endpoint_id,
        base_url: formData.base_url,
        capabilities: formData.capabilities,
        daily_budget: parseFloat(formData.daily_budget) || 0,
        current_load_capacity: Number(formData.current_load_capacity) || 100,
        config: { timeout_seconds: Number(formData.timeout_seconds) || 60 }
      };

      if (formData.api_key) {
        payload.api_key = formData.api_key;
      }

      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast(
          isRtl ? "تم حفظ مزود الـ GPU واختبار الاتصال بنجاح" : "GPU Provider saved and verified successfully",
          "success"
        );
        setIsAddEditOpen(false);
        fetchProviders();
      } else {
        showToast(data.error || "Failed to save GPU provider", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to save GPU provider", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePingTest = async (id: number) => {
    setTestingId(id);
    try {
      const res = await fetch(`/api/admin/gpu-providers/${id}/test`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(
          `${isRtl ? 'حالة الاتصال' : 'Status'}: ${data.status.toUpperCase()} (${data.latencyMs}ms) - ${data.message}`,
          data.status === 'online' ? 'success' : 'warning'
        );
        fetchProviders();
      } else {
        showToast(data.message || data.error || "Ping failed", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Ping error", "error");
    } finally {
      setTestingId(null);
    }
  };

  const handleSyncModels = async (p: GpuProviderRecord) => {
    setSyncingId(p.id);
    try {
      const res = await fetch(`/api/admin/gpu-providers/${p.id}/sync-models`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(
          isRtl ? `تم اكتشاف ومزامنة ${data.count} نموذج بنجاح` : `Discovered ${data.count} models successfully`,
          "success"
        );
        fetchProviders();
        if (modelsModalProvider?.id === p.id) {
          setProviderModels(data.models || []);
        }
      } else {
        showToast(data.message || data.error || "Sync models failed", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Sync models error", "error");
    } finally {
      setSyncingId(null);
    }
  };

  const handleOpenModelsModal = async (p: GpuProviderRecord) => {
    setModelsModalProvider(p);
    setIsLoadingModels(true);
    try {
      const res = await fetch(`/api/admin/gpu-providers/${p.id}/models`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setProviderModels(data.models || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingModels(false);
    }
  };

  const handleAddManualModel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modelsModalProvider || !newModelForm.model_id) return;

    try {
      const res = await fetch(`/api/admin/gpu-providers/${modelsModalProvider.id}/models`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(newModelForm)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(isRtl ? "تمت إضافة النموذج بنجاح" : "Model added successfully", "success");
        setNewModelForm({
          model_id: "",
          name: "",
          task_type: "vision_analysis",
          context_window: 32768,
          max_output_tokens: 4096
        });
        handleOpenModelsModal(modelsModalProvider);
        fetchProviders();
      } else {
        showToast(data.error || "Failed to add model", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Error adding model", "error");
    }
  };

  const handleDeleteModel = async (modelId: number) => {
    try {
      const res = await fetch(`/api/admin/gpu-providers/models/${modelId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showToast(isRtl ? "تم حذف النموذج" : "Model deleted", "success");
        if (modelsModalProvider) {
          handleOpenModelsModal(modelsModalProvider);
          fetchProviders();
        }
      }
    } catch (err: any) {
      showToast(err.message || "Delete failed", "error");
    }
  };

  const handleDeleteProvider = async () => {
    if (!deleteModal) return;
    try {
      const res = await fetch(`/api/admin/gpu-providers/${deleteModal.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(isRtl ? "تم حذف مزود الـ GPU" : "GPU Provider deleted", "success");
        setDeleteModal(null);
        fetchProviders();
      } else {
        showToast(data.error || "Delete failed", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Delete error", "error");
    }
  };

  const handleRunSandbox = async () => {
    if (!sandboxPrompt) {
      showToast(isRtl ? "يرجى توفير نص السؤال أو الأمر البصري" : "Please provide a prompt", "error");
      return;
    }
    if (sandboxTaskType === "vision_analysis" && !sandboxImageUrl) {
      showToast(isRtl ? "يرجى توفير رابط الصورة للاختبار" : "Please provide an image URL for vision analysis", "error");
      return;
    }

    setSandboxRunning(true);
    setSandboxResult(null);
    try {
      const payload: any = {
        taskType: sandboxTaskType,
        prompt: sandboxPrompt
      };

      if (sandboxTaskType === "vision_analysis") {
        payload.imageUrls = [sandboxImageUrl];
      } else if (sandboxTaskType === "image_gen") {
        payload.imageSettings = {
          aspect_ratio: sandboxAspectRatio,
          steps: 30
        };
      } else if (sandboxTaskType === "video_gen") {
        payload.videoSettings = {
          duration: Number(sandboxDuration) || 4,
          resolution: "1080p",
          fps: 24
        };
      }

      const res = await fetch("/api/admin/gpu-providers/inference/dispatch", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSandboxResult(data.result);
        showToast(isRtl ? "اكتمل الاختبار بنجاح" : "Live inference completed", "success");
      } else {
        showToast(data.error || "Inference failed", "error");
        setSandboxResult({ error: data.error || "Execution failed" });
      }
    } catch (err: any) {
      setSandboxResult({ error: err.message });
      showToast(err.message || "Network error during inference", "error");
    } finally {
      setSandboxRunning(false);
    }
  };

  const filteredProviders = providers.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.provider_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.endpoint_id && p.endpoint_id.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || p.health_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300" dir={dir}>
      {/* Supreme Decree Notice Banner */}
      <div className="p-4 rounded-lg bg-surface-card border border-border-main shadow-sm flex items-start gap-3.5">
        <div className="w-9 h-9 rounded-md bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0 mt-0.5 text-accent">
          <Cpu size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-black text-text-primary uppercase tracking-wide">
              {isRtl ? "خزانة مزودي معالجة الوسائط وخوادم الـ GPU (المعمارية المعزولة)" : "GPU Media Compute & Infrastructure Vault (Isolated Subsystem)"}
            </h3>
            <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              Sovereign Isolated
            </span>
          </div>
          <p className="text-xs text-text-muted mt-1 leading-relaxed">
            {isRtl
              ? "يخضع هذا القسم للعزل المعماري السيادي التام عن مفاتيح الـ LLM النصية. خوادم RunPod Serverless وعقد vLLM و ComfyUI تُسند حصرياً لأدوات الرؤية وتوليد الوسائط عبر الأوركسترا دون تداخل أو هدر للموارد."
              : "This vault enforces absolute architectural segregation from text LLM keys. RunPod Serverless, vLLM nodes, and ComfyUI workers are bound exclusively to multimodal Vision, Image, and Video tools via the Orchestrator."}
          </p>
        </div>
        <button
          onClick={() => setIsSandboxOpen(true)}
          className="shrink-0 px-3.5 py-2 rounded-md bg-accent/10 text-accent hover:bg-accent hover:text-white border border-accent/20 text-xs font-bold transition-theme flex items-center gap-2"
        >
          <Play size={14} />
          <span>{isRtl ? "مختبر الرؤية الحي" : "Vision Test Bench"}</span>
        </button>
      </div>

      {/* Tab Selectors */}
      <div className="border-b border-border-main flex items-center gap-1">
        <button
          onClick={() => setActiveTab('providers')}
          className={`px-4 py-2 text-xs font-black transition-theme border-b-2 flex items-center gap-2 ${
            activeTab === 'providers'
              ? 'border-accent text-accent'
              : 'border-transparent text-text-muted hover:text-text-primary'
          }`}
        >
          <Server size={14} />
          <span>{isRtl ? "خوادم وعقد الحوسبة (GPU Infrastructure)" : "GPU Nodes & Clusters"}</span>
        </button>
        <button
          onClick={() => setActiveTab('jobs')}
          className={`px-4 py-2 text-xs font-black transition-theme border-b-2 flex items-center gap-2 ${
            activeTab === 'jobs'
              ? 'border-accent text-accent'
              : 'border-transparent text-text-muted hover:text-text-primary'
          }`}
        >
          <Cpu size={14} />
          <span>{isRtl ? "سجل وجدولة مهام الحوسبة" : "GPU Jobs Queue & Monitor"}</span>
        </button>
      </div>

      {activeTab === 'providers' && (
        <>
          {/* Top Action & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 max-w-lg">
              <div className="relative flex-1">
                <Search size={16} className={`absolute top-1/2 -translate-y-1/2 text-text-muted ${isRtl ? 'right-3' : 'left-3'}`} />
                <input
                  type="text"
                  placeholder={isRtl ? "بحث في خوادم الـ GPU أو الـ Endpoints..." : "Search GPU nodes or endpoint IDs..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full py-2 bg-surface-card border border-border-main rounded-md text-xs text-text-primary focus:outline-none focus:border-accent ${
                    isRtl ? 'pr-9 pl-3' : 'pl-9 pr-3'
                  }`}
                />
              </div>
              <div className="flex items-center bg-surface-card border border-border-main rounded-md p-1 gap-1 shrink-0">
                {(['all', 'online', 'cold_boot', 'offline'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-theme ${
                      statusFilter === st
                        ? 'bg-accent text-white shadow-xs'
                        : 'text-text-muted hover:text-text-primary'
                    }`}
                  >
                    {st === 'all' ? (isRtl ? 'الكل' : 'All') : st === 'cold_boot' ? (isRtl ? 'إقلاع بارد' : 'Cold Boot') : st}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={fetchProviders}
                disabled={isLoading}
                className="px-3.5 py-2 rounded-md border border-border-main bg-surface-card hover:bg-surface-subtle text-text-primary font-bold text-xs transition-theme flex items-center gap-2 shadow-xs disabled:opacity-60"
                title={isRtl ? "تحديث وفحص الخوادم" : "Refresh & Ping All Providers"}
              >
                <RefreshCw size={15} className={isLoading ? "animate-spin text-accent" : "text-accent"} />
                <span>{isLoading ? (isRtl ? "جارٍ التحديث..." : "Refreshing...") : (isRtl ? "تحديث القائمة" : "Refresh List")}</span>
              </button>
              <button
                onClick={handleOpenAdd}
                className="px-4 py-2 rounded-md bg-accent text-white hover:opacity-90 font-bold text-xs transition-theme flex items-center gap-2 shadow-xs"
              >
                <Plus size={16} />
                <span>{isRtl ? "إضافة خادم GPU جديد" : "Add GPU Provider"}</span>
              </button>
            </div>
          </div>

          {/* GPU Providers Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-64 rounded-lg bg-surface-card border border-border-main animate-pulse" />
              ))}
            </div>
          ) : filteredProviders.length === 0 ? (
            <div className="p-12 text-center rounded-lg border border-dashed border-border-main bg-surface-card/50">
              <Server size={40} className="mx-auto text-text-muted mb-3 opacity-40" />
              <h4 className="text-base font-bold text-text-primary mb-1">
                {isRtl ? "لا توجد خوادم GPU مسجلة حالياً" : "No GPU Providers Registered Yet"}
              </h4>
              <p className="text-xs text-text-muted max-w-md mx-auto mb-5">
                {isRtl
                  ? "قم بربط أول خادم GPU أو عقدة حوسبة مستقلة (RunPod Serverless، vLLM، ComfyUI، أو خادم مخصص) لتشغيل أدوات الرؤية وتوليد الوسائط بسيادية وأمان تام."
                  : "Connect your first GPU compute node or worker (RunPod Serverless, vLLM, ComfyUI, or custom node) to power sovereign multimodal vision and media generation."}
              </p>
              <div className="flex items-center justify-center">
                <button
                  onClick={handleOpenAdd}
                  className="px-5 py-2.5 rounded-md bg-accent text-white font-bold text-xs hover:opacity-90 inline-flex items-center gap-2 shadow-xs transition-theme"
                >
                  <Plus size={16} />
                  <span>{isRtl ? "إضافة وربط خادم GPU جديد" : "Add GPU Provider"}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filteredProviders.map((p) => {
                const isOnline = p.health_status === 'online';
                const isCold = p.health_status === 'cold_boot';
                const budgetNum = Number(p.daily_budget) || 0;
                const usedNum = Number(p.used_today) || 0;
                const budgetPercent = budgetNum > 0 ? Math.min(100, (usedNum / budgetNum) * 100) : 0;

                return (
                  <motion.div
                    key={p.id}
                    layout
                    className="rounded-lg border border-border-main bg-surface-card p-5 shadow-sm hover:border-accent/40 transition-theme flex flex-col justify-between"
                  >
                    <div>
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-md bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shrink-0">
                            <Server size={20} />
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-text-primary leading-tight">
                              {p.name}
                            </h4>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="text-[10px] font-mono text-text-muted">
                                {p.provider_id}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                isOnline
                                  ? 'bg-emerald-500 animate-pulse'
                                  : isCold
                                  ? 'bg-amber-500 animate-pulse'
                                  : 'bg-rose-500'
                              }`}
                            />
                            <span
                              className={`text-[10px] font-black uppercase tracking-wider ${
                                isOnline
                                  ? 'text-emerald-500'
                                  : isCold
                                  ? 'text-amber-500'
                                  : 'text-rose-500'
                              }`}
                            >
                              {isOnline ? 'Online' : isCold ? 'Cold Boot' : 'Offline'}
                            </span>
                          </div>
                          <span className="text-[9px] font-mono text-text-muted">
                            {p.latency_ms > 0 ? `${p.latency_ms}ms` : '-- ms'}
                          </span>
                        </div>
                      </div>

                      {/* Provider Info Pills */}
                      <div className="space-y-2.5 mb-4 p-3 rounded-md bg-surface-subtle border border-border-main/50 text-xs">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-text-muted">{isRtl ? "نوع المزود:" : "Type:"}</span>
                          <span className="font-bold text-text-primary uppercase tracking-wider text-[10px]">
                            {p.provider_type.replace(/_/g, " ")}
                          </span>
                        </div>
                        {p.endpoint_id && (
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-text-muted">Endpoint:</span>
                            <span className="font-mono text-text-primary text-[10px] bg-surface-card px-1.5 py-0.5 rounded border border-border-main">
                              {p.endpoint_id}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-text-muted">{isRtl ? "سعة الحمل الأقصى:" : "Max Load Capacity:"}</span>
                          <span className="font-mono font-bold text-text-primary">
                            {p.current_load_capacity || 100} {isRtl ? "خيط متزامن" : "threads"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-text-muted">{isRtl ? "حمل خادم الحوسبة:" : "Active Node Load:"}</span>
                          <span className={`font-black text-[10px] uppercase px-1.5 py-0.5 rounded ${
                            isOnline 
                              ? 'bg-emerald-500/10 text-emerald-500' 
                              : isCold 
                              ? 'bg-amber-500/10 text-amber-500' 
                              : 'bg-rose-500/10 text-rose-500'
                          }`}>
                            {isOnline ? '12% Active' : isCold ? 'Warmup (8%)' : '0% Idle'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-text-muted">{isRtl ? "النماذج المكتشفة:" : "Models:"}</span>
                          <button
                            onClick={() => handleOpenModelsModal(p)}
                            className="font-bold text-accent hover:underline text-[11px] flex items-center gap-1"
                          >
                            <span>{p.model_count || 0} {isRtl ? "نماذج" : "models"}</span>
                            <ChevronRight size={12} className={isRtl ? "rotate-180" : ""} />
                          </button>
                        </div>
                      </div>

                      {/* Capabilities Tags */}
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {(p.capabilities || []).map((cap) => (
                          <span
                            key={cap}
                            className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-surface-subtle text-text-muted border border-border-main"
                          >
                            {cap.replace(/_/g, " ")}
                          </span>
                        ))}
                      </div>

                      {/* Budget / Usage Bar */}
                      {budgetNum > 0 && (
                        <div className="space-y-1 mb-4">
                          <div className="flex justify-between text-[10px] font-bold text-text-muted">
                            <span>{isRtl ? "الميزانية اليومية" : "Daily Quota"}</span>
                            <span className={budgetPercent > 90 ? "text-rose-500" : "text-accent"}>
                              ${usedNum.toFixed(2)} / ${budgetNum.toFixed(2)}
                            </span>
                          </div>
                          <div className="h-1 bg-surface-subtle rounded-full overflow-hidden border border-border-main/50">
                            <div
                              className={`h-full transition-theme ${
                                budgetPercent > 90 ? "bg-rose-500" : "bg-accent"
                              }`}
                              style={{ width: `${budgetPercent}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Card Actions */}
                    <div className="pt-3 border-t border-border-main flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handlePingTest(p.id)}
                          disabled={testingId === p.id}
                          className="px-2.5 py-1.5 rounded text-[11px] font-bold bg-surface-subtle hover:bg-surface-card border border-border-main text-text-primary transition-theme flex items-center gap-1.5"
                          title={isRtl ? "اختبار النبض وزمن الاستجابة" : "Ping & Latency Check"}
                        >
                          <Zap size={13} className={testingId === p.id ? "animate-spin text-amber-500" : "text-accent"} />
                          <span>{testingId === p.id ? "Pinging..." : (isRtl ? "فحص" : "Ping")}</span>
                        </button>
                        <button
                          onClick={() => handleSyncModels(p)}
                          disabled={syncingId === p.id}
                          className="px-2.5 py-1.5 rounded text-[11px] font-bold bg-surface-subtle hover:bg-surface-card border border-border-main text-text-primary transition-theme flex items-center gap-1.5"
                          title={isRtl ? "مزامنة النماذج من الـ API" : "Discover Models via API"}
                        >
                          <RefreshCw size={13} className={syncingId === p.id ? "animate-spin text-accent" : ""} />
                          <span>{isRtl ? "مزامنة" : "Sync"}</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(p)}
                          className="p-1.5 rounded hover:bg-surface-subtle text-text-muted hover:text-text-primary transition-theme"
                          title={isRtl ? "تعديل الإعدادات" : "Edit Settings"}
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          onClick={() => setDeleteModal(p)}
                          className="p-1.5 rounded hover:bg-rose-500/10 text-rose-500/60 hover:text-rose-500 transition-theme"
                          title={isRtl ? "حذف المزود" : "Delete Provider"}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </>
      )}

      {activeTab === 'jobs' && (
        <div className="space-y-4 animate-in fade-in duration-300">
          {/* Filters & Actions for Jobs Queue */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-surface-card border border-border-main p-4 rounded-lg shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex flex-col">
                <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">
                  {isRtl ? "نوع المهمة" : "Task Type"}
                </label>
                <select
                  value={jobTaskFilter}
                  onChange={(e: any) => setJobTaskFilter(e.target.value)}
                  className="bg-surface-subtle border border-border-main text-xs font-bold rounded-md px-3 py-1.5 focus:outline-none focus:border-accent"
                >
                  <option value="all">{isRtl ? "كافة المهام" : "All Tasks"}</option>
                  <option value="vision_analysis">{isRtl ? "تحليل الصور الرؤية" : "Vision Analysis"}</option>
                  <option value="image_gen">{isRtl ? "توليد الصور" : "Image Gen"}</option>
                  <option value="video_gen">{isRtl ? "توليد الفيديو" : "Video Gen"}</option>
                </select>
              </div>

              <div className="flex flex-col">
                <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">
                  {isRtl ? "الحالة" : "Status"}
                </label>
                <select
                  value={jobStatusFilter}
                  onChange={(e: any) => setJobStatusFilter(e.target.value)}
                  className="bg-surface-subtle border border-border-main text-xs font-bold rounded-md px-3 py-1.5 focus:outline-none focus:border-accent"
                >
                  <option value="all">{isRtl ? "كافة الحالات" : "All Statuses"}</option>
                  <option value="processing">{isRtl ? "جاري المعالجة" : "Processing"}</option>
                  <option value="completed">{isRtl ? "مكتملة" : "Completed"}</option>
                  <option value="failed">{isRtl ? "فاشلة" : "Failed"}</option>
                </select>
              </div>

              {/* Total Records Counter */}
              <div className="flex flex-col justify-end">
                <div className="px-3 py-1.5 rounded-md bg-surface-subtle border border-border-main text-text-muted text-xs font-bold flex items-center gap-1.5">
                  <Database size={13} className="text-accent" />
                  <span>
                    {isRtl ? `إجمالي السجلات: ${totalJobsCount}` : `Total Records: ${totalJobsCount}`}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setIsPurgeModalOpen(true)}
                className="px-3.5 py-2 rounded-md bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/30 font-bold text-xs transition-theme flex items-center gap-2 shadow-xs"
                title={isRtl ? "تنظيف وتطهير سجل المهام لتفادي تضخم البيانات" : "Purge and clean jobs to prevent database bloat"}
              >
                <Trash2 size={14} />
                <span>{isRtl ? "تنظيف السجل ومسح البيانات" : "Purge / Clean Logs"}</span>
              </button>

              <button
                onClick={fetchJobs}
                disabled={isLoadingJobs}
                className="px-4 py-2 rounded-md bg-accent text-white font-bold text-xs hover:opacity-90 transition-theme flex items-center gap-2 disabled:opacity-50"
              >
                <RefreshCw size={14} className={isLoadingJobs ? "animate-spin" : ""} />
                <span>{isRtl ? "تحديث السجل" : "Refresh Queue"}</span>
              </button>
            </div>
          </div>

          {/* Selected Jobs Action Banner */}
          {selectedJobIds.length > 0 && (
            <div className="p-3 bg-accent/10 border border-accent/30 rounded-lg flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="flex items-center gap-2 text-xs font-bold text-text-primary">
                <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                <span>
                  {isRtl ? `تم تحديد ${selectedJobIds.length} مهمة من السجل` : `${selectedJobIds.length} jobs selected`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setPurgeMode('selected');
                    setIsPurgeModalOpen(true);
                  }}
                  className="px-3 py-1.5 rounded bg-rose-500 text-white font-bold text-xs hover:opacity-90 transition-theme flex items-center gap-1.5 shadow-xs"
                >
                  <Trash2 size={13} />
                  <span>{isRtl ? `حذف المحدد (${selectedJobIds.length})` : `Delete Selected (${selectedJobIds.length})`}</span>
                </button>
                <button
                  onClick={() => setSelectedJobIds([])}
                  className="px-3 py-1.5 rounded bg-surface-card hover:bg-surface-subtle border border-border-main text-xs font-bold text-text-muted hover:text-text-primary transition-theme"
                >
                  {isRtl ? "إلغاء التحديد" : "Deselect"}
                </button>
              </div>
            </div>
          )}

          {/* Jobs Table */}
          {isLoadingJobs ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((n) => (
                <div key={n} className="h-16 rounded-lg bg-surface-card border border-border-main animate-pulse" />
              ))}
            </div>
          ) : jobs.length === 0 ? (
            <div className="p-12 text-center rounded-lg border border-dashed border-border-main bg-surface-card/50">
              <Cpu size={40} className="mx-auto text-text-muted mb-3 opacity-40" />
              <h4 className="text-base font-bold text-text-primary mb-1">
                {isRtl ? "سجل مهام الحوسبة فارغ" : "GPU Jobs Queue is Empty"}
              </h4>
              <p className="text-xs text-text-muted max-w-md mx-auto">
                {isRtl
                  ? "لا توجد مهام حوسبة مسجلة تطابق هذه الفلاتر حالياً. قم بتشغيل اختبار أو أداة توليد لبدء حصد البيانات."
                  : "No GPU compute jobs match the selected filters. Run a sandbox test or generate content to see records."}
              </p>
            </div>
          ) : (
            <div className="bg-surface-card border border-border-main rounded-lg shadow-sm overflow-hidden overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border-main bg-surface-subtle text-[11px] font-black uppercase tracking-wider text-text-muted">
                    <th className="p-4 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={areAllVisibleSelected}
                        onChange={toggleSelectAll}
                        className="rounded accent-accent cursor-pointer w-3.5 h-3.5"
                        title={isRtl ? "تحديد / إلغاء تحديد الكل في هذه الصفحة" : "Select/Deselect all visible"}
                      />
                    </th>
                    <th className="p-4">{isRtl ? "معرف المهمة" : "Job ID"}</th>
                    <th className="p-4">{isRtl ? "نوع المهمة" : "Task Type"}</th>
                    <th className="p-4">{isRtl ? "المزود والنموذج" : "Provider & Model"}</th>
                    <th className="p-4">{isRtl ? "المستخدم" : "User Email"}</th>
                    <th className="p-4">{isRtl ? "الحالة" : "Status"}</th>
                    <th className="p-4">{isRtl ? "زمن التنفيذ" : "Latency"}</th>
                    <th className="p-4">{isRtl ? "تاريخ الطلب" : "Created At"}</th>
                    <th className="p-4 text-center">{isRtl ? "خيارات" : "Actions"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-main/40 text-xs">
                  {jobs.map((j) => {
                    const taskColors: Record<string, string> = {
                      vision_analysis: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
                      image_gen: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
                      video_gen: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
                      audio_gen: 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                    };
                    const statusColors = {
                      pending: 'bg-slate-500/10 text-slate-500',
                      processing: 'bg-amber-500/10 text-amber-500 animate-pulse',
                      completed: 'bg-emerald-500/10 text-emerald-500',
                      failed: 'bg-rose-500/10 text-rose-500',
                      cancelled: 'bg-gray-500/10 text-gray-500'
                    };

                    const isSelected = selectedJobIds.includes(j.job_id);

                    return (
                      <tr key={j.id} className={`hover:bg-surface-subtle/50 transition-theme text-text-primary ${isSelected ? 'bg-accent/5' : ''}`}>
                        <td className="p-4 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectJob(j.job_id)}
                            className="rounded accent-accent cursor-pointer w-3.5 h-3.5"
                          />
                        </td>
                        <td className="p-4 font-mono font-bold text-[11px]">
                          <span title={j.job_id}>
                            {j.job_id.substring(0, 8)}...
                          </span>
                        </td>
                        <td className="p-4 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${taskColors[j.task_type] || ''}`}>
                            {j.task_type.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-text-primary text-xs">
                              {j.provider_name || j.provider_code || 'Failover / Unknown'}
                            </span>
                            <span className="text-[10px] font-mono text-text-muted mt-0.5 max-w-[180px] truncate" title={j.model_id}>
                              {j.model_id}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 text-text-muted truncate max-w-[140px]" title={j.user_email || `ID: ${j.user_id}`}>
                          {j.user_email || `ID: ${j.user_id}`}
                        </td>
                        <td className="p-4 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase inline-flex items-center gap-1.5 ${statusColors[j.status] || ''}`}>
                            {j.status === 'processing' && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />}
                            {j.status}
                          </span>
                        </td>
                        <td className="p-4 font-mono text-text-muted text-[11px]">
                          {j.latency_ms > 0 ? `${(j.latency_ms / 1000).toFixed(2)}s` : '--'}
                        </td>
                        <td className="p-4 text-text-muted whitespace-nowrap">
                          {new Date(j.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} {' '}
                          {new Date(j.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </td>
                        <td className="p-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setInspectingJob(j)}
                              className="p-1.5 rounded hover:bg-surface-subtle text-accent hover:text-accent/80 transition-theme"
                              title={isRtl ? "تفاصيل المهمة" : "Inspect Job Details"}
                            >
                              <Eye size={15} />
                            </button>
                            <button
                              onClick={() => handleDeleteSingleJob(j)}
                              disabled={deletingJobId === j.job_id}
                              className="p-1.5 rounded hover:bg-rose-500/10 text-rose-500/70 hover:text-rose-500 transition-theme disabled:opacity-50"
                              title={isRtl ? "حذف هذا السجل" : "Delete this job"}
                            >
                              <Trash2 size={15} className={deletingJobId === j.job_id ? "animate-spin text-rose-500" : ""} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add / Edit GPU Provider Modal */}
      {isAddEditOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-xl rounded-lg bg-surface-card border border-border-main shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-border-main flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Server size={18} className="text-accent" />
                <h3 className="text-base font-black text-text-primary">
                  {editingProvider
                    ? (isRtl ? "تعديل مزود خادم الـ GPU" : "Edit GPU Provider Node")
                    : (isRtl ? "تسجيل مزود خادم GPU جديد" : "Register GPU Provider Node")}
                </h3>
              </div>
              <button
                onClick={() => setIsAddEditOpen(false)}
                className="text-text-muted hover:text-text-primary text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProvider} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">
                    {isRtl ? "اسم الخادم / المزود *" : "Node / Provider Name *"}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. RunPod Serverless Qwen VL"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full py-2 px-3 rounded bg-surface-subtle border border-border-main text-xs text-text-primary focus:outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">
                    {isRtl ? "معرف المزود الفريد (Slug)" : "Provider ID (Slug)"}
                  </label>
                  <input
                    type="text"
                    disabled={!!editingProvider}
                    placeholder="e.g. runpod_qwen_vl"
                    value={formData.provider_id}
                    onChange={(e) => setFormData({ ...formData, provider_id: e.target.value })}
                    className="w-full py-2 px-3 rounded bg-surface-subtle border border-border-main text-xs text-text-primary focus:outline-none focus:border-accent disabled:opacity-50"
                  />
                </div>
              </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">
                      {isRtl ? "نوع البروتوكول *" : "Architecture / Protocol *"}
                    </label>
                    <select
                      value={formData.provider_type}
                      onChange={(e: any) => {
                        const val = e.target.value;
                        let defaultUrl = formData.base_url;
                        if (val === 'runpod_serverless') defaultUrl = 'https://api.runpod.ai/v2';
                        setFormData({ ...formData, provider_type: val, base_url: defaultUrl });
                      }}
                      className="w-full py-2 px-3 rounded bg-surface-subtle border border-border-main text-xs text-text-primary focus:outline-none focus:border-accent"
                    >
                      <option value="runpod_serverless">RunPod Serverless Endpoint</option>
                      <option value="openai_vision_compatible">OpenAI-Compatible (vLLM / Ollama / SGLang / Dedicated)</option>
                      <option value="comfyui_worker">ComfyUI Cluster / Dedicated Worker</option>
                      <option value="custom_rest">Custom REST Microservice / Any GPU Provider</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">
                      {isRtl ? "معرف الـ Endpoint" : "Endpoint ID"}
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. vllm-abc123xyz"
                      value={formData.endpoint_id}
                      onChange={(e) => setFormData({ ...formData, endpoint_id: e.target.value })}
                      className="w-full py-2 px-3 rounded bg-surface-subtle border border-border-main text-xs text-text-primary focus:outline-none focus:border-accent"
                    />
                  </div>
                </div>

              <div>
                <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">
                  {isRtl ? "عنوان الخدمة الأساسي (Base URL) *" : "Base URL *"}
                </label>
                <input
                  type="text"
                  required
                  placeholder="https://api.runpod.ai/v2 or https://gpu.mycompany.com:8000/v1"
                  value={formData.base_url}
                  onChange={(e) => setFormData({ ...formData, base_url: e.target.value })}
                  className="w-full py-2 px-3 rounded bg-surface-subtle border border-border-main text-xs text-text-primary font-mono focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">
                  {isRtl ? "مفتاح الترخيص / الرمز السري المشفّر *" : "API Key / Token (AES-256 Encrypted) *"}
                </label>
                <input
                  type="password"
                  placeholder={editingProvider ? "•••••••••••••••• (Leave blank to keep current key)" : "API Token / Bearer Key"}
                  value={formData.api_key}
                  onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                  className="w-full py-2 px-3 rounded bg-surface-subtle border border-border-main text-xs text-text-primary font-mono focus:outline-none focus:border-accent"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">
                    {isRtl ? "سقف الميزانية اليومية ($)" : "Daily Budget Limit ($)"}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.daily_budget}
                    onChange={(e) => setFormData({ ...formData, daily_budget: e.target.value })}
                    className="w-full py-2 px-3 rounded bg-surface-subtle border border-border-main text-xs text-text-primary focus:outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">
                    {isRtl ? "سعة الحمل الأقصى (طلبات)" : "Max Load Capacity (Threads)"}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    value={formData.current_load_capacity}
                    onChange={(e) => setFormData({ ...formData, current_load_capacity: Number(e.target.value) })}
                    className="w-full py-2 px-3 rounded bg-surface-subtle border border-border-main text-xs text-text-primary focus:outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">
                    {isRtl ? "مهلة الطلب بالثواني" : "Timeout (Seconds)"}
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="600"
                    value={formData.timeout_seconds}
                    onChange={(e) => setFormData({ ...formData, timeout_seconds: Number(e.target.value) })}
                    className="w-full py-2 px-3 rounded bg-surface-subtle border border-border-main text-xs text-text-primary focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted uppercase mb-2">
                  {isRtl ? "قدرات الخادم المدعومة" : "Assigned Capabilities"}
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'vision', label: 'Computer Vision & Document OCR' },
                    { id: 'image_generation', label: 'Image Generation (SD/FLUX)' },
                    { id: 'video_generation', label: 'Video Generation' }
                  ].map((cap) => {
                    const isSelected = formData.capabilities.includes(cap.id);
                    return (
                      <button
                        type="button"
                        key={cap.id}
                        onClick={() => {
                          if (isSelected) {
                            setFormData({
                              ...formData,
                              capabilities: formData.capabilities.filter((c) => c !== cap.id)
                            });
                          } else {
                            setFormData({
                              ...formData,
                              capabilities: [...formData.capabilities, cap.id]
                            });
                          }
                        }}
                        className={`px-3 py-1.5 rounded text-xs font-bold transition-theme border ${
                          isSelected
                            ? "bg-accent text-white border-accent"
                            : "bg-surface-subtle text-text-muted border-border-main hover:text-text-primary"
                        }`}
                      >
                        {cap.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="p-4 border-t border-border-main flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsAddEditOpen(false)}
                  className="px-4 py-2 rounded text-xs font-bold text-text-muted hover:text-text-primary"
                >
                  {isRtl ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded bg-accent text-white font-bold text-xs hover:opacity-90 transition-theme shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? (isRtl ? "جاري التحقق والحفظ..." : "Verifying & Saving...") : (isRtl ? "حفظ وتفعيل المزود" : "Save & Verify Provider")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Models Drawer / Management Modal */}
      {modelsModalProvider && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-2xl rounded-lg bg-surface-card border border-border-main shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-border-main flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-text-primary flex items-center gap-2">
                  <Layers size={18} className="text-accent" />
                  <span>{isRtl ? "إدارة النماذج لخادم:" : "Loaded Models for:"} {modelsModalProvider.name}</span>
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  {isRtl ? "تظهر هذه النماذج في خيارات بطاقة الرؤية والوسائط في الأوركسترا" : "These models populate the Vision & Media cards in Orchestrator"}
                </p>
              </div>
              <button
                onClick={() => setModelsModalProvider(null)}
                className="text-text-muted hover:text-text-primary text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Add Model Form */}
              <form onSubmit={handleAddManualModel} className="p-4 rounded-lg bg-surface-subtle border border-border-main space-y-3">
                <div className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                  <Plus size={14} className="text-accent" />
                  <span>{isRtl ? "إضافة نموذج يدوياً" : "Add Model Manually"}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    required
                    placeholder="Model ID (e.g. Qwen/Qwen2.5-VL-72B-Instruct)"
                    value={newModelForm.model_id}
                    onChange={(e) => setNewModelForm({ ...newModelForm, model_id: e.target.value })}
                    className="py-1.5 px-3 rounded bg-surface-card border border-border-main text-xs text-text-primary focus:outline-none focus:border-accent"
                  />
                  <input
                    type="text"
                    placeholder="Display Name (optional)"
                    value={newModelForm.name}
                    onChange={(e) => setNewModelForm({ ...newModelForm, name: e.target.value })}
                    className="py-1.5 px-3 rounded bg-surface-card border border-border-main text-xs text-text-primary focus:outline-none focus:border-accent"
                  />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <select
                    value={newModelForm.task_type}
                    onChange={(e: any) => setNewModelForm({ ...newModelForm, task_type: e.target.value })}
                    className="py-1.5 px-3 rounded bg-surface-card border border-border-main text-xs text-text-primary focus:outline-none focus:border-accent"
                  >
                    <option value="vision_analysis">Vision Analysis (Multimodal LLM)</option>
                    <option value="image_gen">Image Generation</option>
                    <option value="video_gen">Video Generation</option>
                    <option value="audio_gen">Audio & Speech Generation</option>
                  </select>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded bg-accent text-white font-bold text-xs hover:opacity-90"
                  >
                    {isRtl ? "إضافة النموذج" : "Register Model"}
                  </button>
                </div>
              </form>

              {/* Models List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-text-muted uppercase">
                  <span>{isRtl ? "النماذج المسجلة" : "Registered Models"} ({providerModels.length})</span>
                  <button
                    onClick={() => modelsModalProvider && handleSyncModels(modelsModalProvider)}
                    className="text-accent hover:underline flex items-center gap-1 lowercase"
                  >
                    <RefreshCw size={12} />
                    <span>{isRtl ? "مزامنة تلقائية" : "auto-sync"}</span>
                  </button>
                </div>

                {isLoadingModels ? (
                  <div className="text-center py-8 text-xs text-text-muted">Loading models...</div>
                ) : providerModels.length === 0 ? (
                  <div className="text-center py-8 text-xs text-text-muted border border-dashed border-border-main rounded p-4">
                    {isRtl ? "لا توجد نماذج مسجلة لهذا المزود. انقر مزامنة أو أضف نموذجاً." : "No models registered. Click sync or add one manually above."}
                  </div>
                ) : (
                  <div className="divide-y divide-border-main/50 rounded-lg border border-border-main bg-surface-card overflow-hidden">
                    {providerModels.map((m) => (
                      <div key={m.id} className="p-3 flex items-center justify-between gap-3 hover:bg-surface-subtle transition-theme">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-text-primary truncate">
                              {m.name || m.model_id}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-accent/10 text-accent border border-accent/20">
                              {m.task_type.replace(/_/g, " ")}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-text-muted block truncate mt-0.5">
                            {m.model_id}
                          </span>
                        </div>
                        <button
                          onClick={() => handleDeleteModel(m.id)}
                          className="text-text-muted hover:text-rose-500 p-1 rounded"
                          title="Delete Model"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-border-main flex justify-end">
              <button
                onClick={() => setModelsModalProvider(null)}
                className="px-4 py-2 rounded bg-surface-subtle hover:bg-surface-card border border-border-main text-xs font-bold text-text-primary"
              >
                {isRtl ? "إغلاق" : "Done"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vision Live Test Bench Sandbox Modal */}
      {isSandboxOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-3xl rounded-lg bg-surface-card border border-border-main shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
            <div className="p-5 border-b border-border-main flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Play size={18} className="text-accent" />
                <h3 className="text-base font-black text-text-primary">
                  {isRtl ? "مختبر الرؤية الحي وتجربة الاستجابة الفورية" : "Live Vision Inference Sandbox & Test Bench"}
                </h3>
              </div>
              <button
                onClick={() => setIsSandboxOpen(false)}
                className="text-text-muted hover:text-text-primary text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {/* Task Type Switcher */}
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">
                  {isRtl ? "نوع المهمة للاختبار" : "Sandbox Task Type"}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['vision_analysis', 'image_gen', 'video_gen'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setSandboxTaskType(t);
                        setSandboxResult(null);
                        if (t === 'vision_analysis') {
                          setSandboxPrompt("Analyze this image in detail and extract all key technical data.");
                        } else if (t === 'image_gen') {
                          setSandboxPrompt("A cinematic high-fidelity aerial shot of ancient ruins in a lush green valley, sunrise lighting, volumetric fog.");
                        } else if (t === 'video_gen') {
                          setSandboxPrompt("Slow motion close up of water droplets falling on a smooth stone, water ripples, ambient morning glow.");
                        }
                      }}
                      className={`py-2 px-3 rounded text-xs font-bold border transition-theme ${
                        sandboxTaskType === t
                          ? 'bg-accent/10 border-accent text-accent'
                          : 'bg-surface-subtle border-border-main text-text-muted hover:text-text-primary'
                      }`}
                    >
                      {t === 'vision_analysis' ? (isRtl ? "تحليل الصور (Vision)" : "Vision Analysis") :
                       t === 'image_gen' ? (isRtl ? "توليد الصور (Image)" : "Image Gen") :
                       (isRtl ? "توليد الفيديو (Video)" : "Video Gen")}
                    </button>
                  ))}
                </div>
              </div>

              {sandboxTaskType === "vision_analysis" && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">
                      {isRtl ? "رابط الصورة للاختبار (URL أو Base64)" : "Image Source URL / Data URI"}
                    </label>
                    <input
                      type="text"
                      value={sandboxImageUrl}
                      onChange={(e) => setSandboxImageUrl(e.target.value)}
                      className="w-full py-2 px-3 rounded bg-surface-subtle border border-border-main text-xs text-text-primary font-mono focus:outline-none focus:border-accent"
                    />
                  </div>

                  {sandboxImageUrl && (
                    <div className="w-full h-40 rounded-lg overflow-hidden bg-surface-subtle border border-border-main flex items-center justify-center">
                      <img
                        src={sandboxImageUrl}
                        alt="Preview"
                        className="max-h-full max-w-full object-contain"
                        referrerPolicy="no-referrer"
                        onError={(e) => (e.currentTarget.style.display = 'none')}
                      />
                    </div>
                  )}
                </>
              )}

              {sandboxTaskType === "image_gen" && (
                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">
                    {isRtl ? "نسبة العرض إلى الارتفاع (Aspect Ratio)" : "Aspect Ratio"}
                  </label>
                  <select
                    value={sandboxAspectRatio}
                    onChange={(e) => setSandboxAspectRatio(e.target.value)}
                    className="w-full py-2 px-3 rounded bg-surface-subtle border border-border-main text-xs text-text-primary focus:outline-none focus:border-accent font-bold"
                  >
                    <option value="1:1">1:1 Square</option>
                    <option value="16:9">16:9 Landscape</option>
                    <option value="3:4">3:4 Portrait</option>
                  </select>
                </div>
              )}

              {sandboxTaskType === "video_gen" && (
                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">
                    {isRtl ? "المدة بالثواني (Duration)" : "Duration (Seconds)"}
                  </label>
                  <select
                    value={sandboxDuration}
                    onChange={(e) => setSandboxDuration(Number(e.target.value))}
                    className="w-full py-2 px-3 rounded bg-surface-subtle border border-border-main text-xs text-text-primary focus:outline-none focus:border-accent font-bold"
                  >
                    <option value={4}>4 Seconds</option>
                    <option value={8}>8 Seconds</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">
                  {isRtl ? "نص السؤال أو الأمر (Prompt)" : "Prompt"}
                </label>
                <textarea
                  rows={3}
                  value={sandboxPrompt}
                  onChange={(e) => setSandboxPrompt(e.target.value)}
                  className="w-full py-2 px-3 rounded bg-surface-subtle border border-border-main text-xs text-text-primary focus:outline-none focus:border-accent"
                />
              </div>

              {sandboxResult && (
                <div className="p-4 rounded-lg bg-surface-subtle border border-border-main space-y-3">
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="text-accent flex items-center gap-1.5">
                      <CheckCircle2 size={14} />
                      <span>{isRtl ? "استجابة خادم الحوسبة:" : "Worker Output:"} {sandboxResult.providerId || sandboxResult.providerCode || 'Routed Node'} / {sandboxResult.modelId || 'Active model'}</span>
                    </span>
                    {sandboxResult.latencyMs && (
                      <span className="font-mono text-text-muted">{sandboxResult.latencyMs}ms</span>
                    )}
                  </div>

                  {/* Render Visual Media Outputs for Images/Videos */}
                  {(sandboxResult.image_url || sandboxResult.result_url || sandboxResult.video_url) && (
                    <div className="w-full rounded-lg overflow-hidden border border-border-main bg-black flex items-center justify-center p-2 max-h-[320px]">
                      {sandboxResult.video_url || (sandboxResult.result_url && sandboxResult.result_url.endsWith('.mp4')) ? (
                        <video
                          src={sandboxResult.video_url || sandboxResult.result_url}
                          controls
                          className="max-h-[300px] max-w-full rounded"
                        />
                      ) : (
                        <img
                          src={sandboxResult.image_url || sandboxResult.result_url}
                          alt="Generated output"
                          className="max-h-[300px] max-w-full object-contain rounded"
                          referrerPolicy="no-referrer"
                        />
                      )}
                    </div>
                  )}

                  {sandboxResult.text && (
                    <div className="p-3 rounded bg-surface-card border border-border-main text-xs text-text-primary whitespace-pre-wrap font-sans max-h-40 overflow-y-auto">
                      {sandboxResult.text}
                    </div>
                  )}

                  {sandboxResult.error && (
                    <div className="p-3 rounded bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-mono">
                      {sandboxResult.error}
                    </div>
                  )}

                  {!sandboxResult.text && !sandboxResult.image_url && !sandboxResult.result_url && !sandboxResult.video_url && !sandboxResult.error && (
                    <pre className="p-3 rounded bg-surface-card border border-border-main text-[10px] font-mono text-text-primary max-h-40 overflow-y-auto">
                      {JSON.stringify(sandboxResult, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-border-main flex items-center justify-between">
              <span className="text-[11px] text-text-muted">
                {isRtl ? "يختبر التحويل التلقائي للأوركسترا (Silent Failover)" : "Tests active Orchestrator routing & failover"}
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsSandboxOpen(false)}
                  className="px-4 py-2 rounded text-xs font-bold text-text-muted hover:text-text-primary"
                >
                  {isRtl ? "إغلاق" : "Close"}
                </button>
                <button
                  onClick={handleRunSandbox}
                  disabled={sandboxRunning}
                  className="px-5 py-2 rounded bg-accent text-white font-bold text-xs hover:opacity-90 flex items-center gap-2 disabled:opacity-50"
                >
                  <Play size={14} className={sandboxRunning ? "animate-spin" : ""} />
                  <span>{sandboxRunning ? (isRtl ? "جاري التحليل في الخادم..." : "Executing...") : (isRtl ? "تشغيل التحليل الآن" : "Run Live Analysis")}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-lg bg-surface-card border border-border-main shadow-2xl p-6 text-center animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto mb-3">
              <Trash2 size={24} />
            </div>
            <h4 className="text-base font-bold text-text-primary mb-1">
              {isRtl ? "تأكيد حذف مزود الـ GPU" : "Confirm Node Deletion"}
            </h4>
            <p className="text-xs text-text-muted mb-6 leading-relaxed">
              {isRtl
                ? `هل أنت متأكد من رغبتك في حذف المزود "${deleteModal.name}"؟ سيتم إزالة كافة النماذج المرتبطة به.`
                : `Are you sure you want to delete "${deleteModal.name}"? All registered models under this node will be removed.`}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteModal(null)}
                className="flex-1 py-2 rounded bg-surface-subtle text-text-muted hover:text-text-primary text-xs font-bold"
              >
                {isRtl ? "إلغاء" : "Cancel"}
              </button>
              <button
                onClick={handleDeleteProvider}
                className="flex-1 py-2 rounded bg-rose-500 text-white hover:bg-rose-600 text-xs font-bold"
              >
                {isRtl ? "تأكيد الحذف" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inspecting Job Modal */}
      {inspectingJob && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-2xl rounded-lg bg-surface-card border border-border-main shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-border-main flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Cpu size={18} className="text-accent" />
                <h3 className="text-base font-black text-text-primary">
                  {isRtl ? "تفاصيل مهمة الحوسبة" : "GPU Compute Job Details"}
                </h3>
              </div>
              <button
                onClick={() => setInspectingJob(null)}
                className="text-text-muted hover:text-text-primary text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
              {/* Status Header */}
              <div className="p-4 rounded-lg bg-surface-subtle border border-border-main flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-text-muted uppercase block">
                    {isRtl ? "حالة المهمة" : "Execution Status"}
                  </span>
                  <span className="text-sm font-black text-text-primary uppercase tracking-wider">
                    {inspectingJob.status}
                  </span>
                </div>
                <div className="text-right space-y-1">
                  <span className="text-[10px] font-bold text-text-muted uppercase block">
                    {isRtl ? "زمن الاستجابة" : "Inference Latency"}
                  </span>
                  <span className="text-sm font-mono font-bold text-accent">
                    {inspectingJob.latency_ms > 0 ? `${(inspectingJob.latency_ms / 1000).toFixed(2)}s` : '--'}
                  </span>
                </div>
              </div>

              {/* Grid Metadata */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-surface-subtle/50 rounded-md border border-border-main/50">
                  <span className="text-[10px] font-bold text-text-muted uppercase block mb-1">
                    {isRtl ? "معرف المهمة" : "Job UUID"}
                  </span>
                  <span className="font-mono font-bold text-text-primary text-[11px] block select-all">
                    {inspectingJob.job_id}
                  </span>
                </div>
                <div className="p-3 bg-surface-subtle/50 rounded-md border border-border-main/50">
                  <span className="text-[10px] font-bold text-text-muted uppercase block mb-1">
                    {isRtl ? "نوع المهمة" : "Task Type"}
                  </span>
                  <span className="font-bold text-text-primary uppercase">
                    {inspectingJob.task_type.replace(/_/g, " ")}
                  </span>
                </div>
                <div className="p-3 bg-surface-subtle/50 rounded-md border border-border-main/50">
                  <span className="text-[10px] font-bold text-text-muted uppercase block mb-1">
                    {isRtl ? "مزود الخدمة المستهدف" : "Executed Node / Provider"}
                  </span>
                  <span className="font-bold text-text-primary">
                    {inspectingJob.provider_name || inspectingJob.provider_code || "Failover Pathway"}
                  </span>
                </div>
                <div className="p-3 bg-surface-subtle/50 rounded-md border border-border-main/50">
                  <span className="text-[10px] font-bold text-text-muted uppercase block mb-1">
                    {isRtl ? "النموذج المستخدم" : "Model Identifier"}
                  </span>
                  <span className="font-mono text-text-primary max-w-xs truncate block" title={inspectingJob.model_id}>
                    {inspectingJob.model_id}
                  </span>
                </div>
              </div>

              {/* User Attribution */}
              <div className="p-3 bg-surface-subtle/30 rounded-md border border-border-main/50 flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-bold text-text-muted uppercase block mb-0.5">
                    {isRtl ? "المستخدم" : "Attributed User"}
                  </span>
                  <span className="font-bold text-text-primary">
                    {inspectingJob.user_email || `ID: ${inspectingJob.user_id}`}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-text-muted uppercase block mb-0.5">
                    {isRtl ? "الميزانية المخصومة" : "Estimated Cost / Quota Used"}
                  </span>
                  <span className="font-bold text-emerald-500 font-mono">
                    ${Number(inspectingJob.cost_charged || 0).toFixed(4)}
                  </span>
                </div>
              </div>

              {/* Prompt / Payload Input */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-text-muted uppercase block">
                  {isRtl ? "نص المدخلات (Input Prompt)" : "Input Prompt"}
                </span>
                <div className="p-3 rounded bg-surface-subtle border border-border-main max-h-36 overflow-y-auto font-sans leading-relaxed text-text-primary">
                  {inspectingJob.prompt || (isRtl ? "لا يوجد نص مدخل" : "No prompt text provided")}
                </div>
              </div>

              {/* Render Media Outputs or Error Messages */}
              {inspectingJob.status === "failed" && inspectingJob.error_message && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-rose-500 uppercase block">
                    {isRtl ? "تفاصيل الخطأ في خادم الحوسبة" : "Backend Job Error log"}
                  </span>
                  <div className="p-3 rounded bg-rose-500/10 border border-rose-500/20 text-rose-500 font-mono text-[11px] whitespace-pre-wrap overflow-x-auto max-h-36 overflow-y-auto">
                    {inspectingJob.error_message}
                  </div>
                </div>
              )}

              {/* Result Visualizer */}
              {(inspectingJob.result_url || inspectingJob.status === "completed") && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-text-muted uppercase block">
                    {isRtl ? "مخرجات المهمة" : "Generated Output / Result Payload"}
                  </span>

                  {inspectingJob.result_url ? (
                    <div className="w-full rounded-lg overflow-hidden border border-border-main bg-black flex items-center justify-center p-2 max-h-[300px]">
                      {inspectingJob.task_type === 'video_gen' || inspectingJob.result_url.endsWith('.mp4') ? (
                        <video
                          src={inspectingJob.result_url}
                          controls
                          className="max-h-[280px] max-w-full rounded"
                        />
                      ) : (
                        <img
                          src={inspectingJob.result_url}
                          alt="Inference result"
                          className="max-h-[280px] max-w-full object-contain rounded"
                          referrerPolicy="no-referrer"
                        />
                      )}
                    </div>
                  ) : (
                    <div className="p-3 rounded bg-surface-subtle border border-border-main max-h-36 overflow-y-auto font-mono text-[11px] whitespace-pre-wrap text-text-primary">
                      {inspectingJob.result_data ? (typeof inspectingJob.result_data === 'string' ? inspectingJob.result_data : JSON.stringify(inspectingJob.result_data, null, 2)) : (isRtl ? "اكتملت بنجاح دون ملف مخرجات مادي" : "Job completed successfully without physical media payload")}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-border-main flex items-center justify-between">
              <button
                onClick={() => handleDeleteSingleJob(inspectingJob)}
                disabled={deletingJobId === inspectingJob.job_id}
                className="px-3.5 py-2 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/30 text-xs font-bold transition-theme flex items-center gap-1.5 disabled:opacity-50"
              >
                <Trash2 size={13} className={deletingJobId === inspectingJob.job_id ? "animate-spin" : ""} />
                <span>{isRtl ? "حذف هذا السجل نهائياً" : "Delete This Record"}</span>
              </button>

              <button
                onClick={() => setInspectingJob(null)}
                className="px-4 py-2 rounded bg-surface-subtle hover:bg-surface-card border border-border-main text-xs font-bold text-text-primary"
              >
                {isRtl ? "إغلاق" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Purge / Clean Jobs Modal */}
      {isPurgeModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-lg bg-surface-card border border-border-main shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
            <div className="p-5 border-b border-border-main flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Trash2 size={18} className="text-rose-500" />
                <div>
                  <h3 className="text-base font-black text-text-primary">
                    {isRtl ? "تنظيف وتطهير سجل مهام الحوسبة" : "Clean & Purge GPU Jobs Queue"}
                  </h3>
                  <p className="text-[11px] text-text-muted mt-0.5">
                    {isRtl ? "تفريغ السجلات لتفادي تضخم قاعدة البيانات وتوفير المساحة" : "Free up storage & prevent database bloat"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPurgeModalOpen(false)}
                className="text-text-muted hover:text-text-primary text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Summary Stats Banner */}
              <div className="p-3.5 rounded-lg bg-surface-subtle border border-border-main flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase text-text-muted block">
                    {isRtl ? "إجمالي السجلات في قاعدة البيانات" : "Total Database Records"}
                  </span>
                  <span className="text-sm font-black text-text-primary">
                    {totalJobsCount} {isRtl ? "مهمة مسجلة" : "jobs logged"}
                  </span>
                </div>
                {selectedJobIds.length > 0 && (
                  <div className="text-right">
                    <span className="text-[10px] font-bold uppercase text-accent block">
                      {isRtl ? "العناصر المحددة حالياً" : "Currently Selected"}
                    </span>
                    <span className="text-sm font-black text-accent">
                      {selectedJobIds.length} {isRtl ? "مهمة" : "jobs"}
                    </span>
                  </div>
                )}
              </div>

              {/* Mode Options */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold uppercase tracking-wider text-text-muted block">
                  {isRtl ? "اختر نطاق وآلية التنظيف:" : "Select Purge Scope:"}
                </label>

                {/* Option 1: Selected Jobs */}
                <label className={`p-3 rounded-lg border transition-theme cursor-pointer flex items-start gap-3 ${
                  purgeMode === 'selected' 
                    ? 'border-accent bg-accent/5' 
                    : 'border-border-main hover:bg-surface-subtle'
                } ${selectedJobIds.length === 0 ? 'opacity-60' : ''}`}>
                  <input
                    type="radio"
                    name="purgeMode"
                    value="selected"
                    checked={purgeMode === 'selected'}
                    onChange={() => setPurgeMode('selected')}
                    disabled={selectedJobIds.length === 0}
                    className="mt-0.5 accent-accent"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-text-primary">
                        {isRtl ? "حسب الاختيار (العناصر المحددة فقط)" : "Selected Items Only"}
                      </span>
                      <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-surface-subtle border border-border-main text-text-muted">
                        {selectedJobIds.length} {isRtl ? "محدد" : "selected"}
                      </span>
                    </div>
                    <p className="text-[11px] text-text-muted mt-1">
                      {isRtl
                        ? "حذف المهام التي قمت بتحديدها عبر مربعات الاختيار في الجدول فقط."
                        : "Delete only the specific job rows checked in the jobs table."}
                    </p>
                  </div>
                </label>

                {/* Option 2: Purge All */}
                <label className={`p-3 rounded-lg border transition-theme cursor-pointer flex items-start gap-3 ${
                  purgeMode === 'all' 
                    ? 'border-rose-500/50 bg-rose-500/5' 
                    : 'border-border-main hover:bg-surface-subtle'
                }`}>
                  <input
                    type="radio"
                    name="purgeMode"
                    value="all"
                    checked={purgeMode === 'all'}
                    onChange={() => setPurgeMode('all')}
                    className="mt-0.5 accent-rose-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-rose-500">
                        {isRtl ? "مسح الكل (تصفير سجل مهام الحوسبة بالكامل)" : "Purge All Records (Complete Wipe)"}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/10 text-rose-500 border border-rose-500/20">
                        {isRtl ? "تفريغ شامل" : "Full Wipe"}
                      </span>
                    </div>
                    <p className="text-[11px] text-text-muted mt-1">
                      {isRtl
                        ? "حذف كافة سجلات الحوسبة لتفريغ مساحة قاعدة البيانات بالكامل وتفادي تضخم السجلات."
                        : "Permanently delete all historic execution jobs to free storage and reset the log."}
                    </p>
                  </div>
                </label>

                {/* Option 3: By Status */}
                <label className={`p-3 rounded-lg border transition-theme cursor-pointer flex items-start gap-3 ${
                  purgeMode === 'status' 
                    ? 'border-accent bg-accent/5' 
                    : 'border-border-main hover:bg-surface-subtle'
                }`}>
                  <input
                    type="radio"
                    name="purgeMode"
                    value="status"
                    checked={purgeMode === 'status'}
                    onChange={() => setPurgeMode('status')}
                    className="mt-0.5 accent-accent"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-text-primary">
                        {isRtl ? "مسح السجلات حسب الحالة" : "Purge by Status"}
                      </span>
                    </div>
                    <p className="text-[11px] text-text-muted mt-1 mb-2">
                      {isRtl
                        ? "حذف المهام المكتملة أو الفاشلة بشكل مخصص للحفاظ على سجلات معينة."
                        : "Delete all jobs matching a specific status."}
                    </p>
                    {purgeMode === 'status' && (
                      <div className="flex items-center gap-2 mt-2">
                        <select
                          value={purgeStatus}
                          onChange={(e) => setPurgeStatus(e.target.value)}
                          className="bg-surface-card border border-border-main text-xs font-bold rounded-md px-3 py-1.5 focus:outline-none focus:border-accent text-text-primary"
                        >
                          <option value="completed">{isRtl ? "المهام المكتملة فقط (Completed)" : "Completed Jobs Only"}</option>
                          <option value="failed">{isRtl ? "المهام الفاشلة فقط (Failed)" : "Failed Jobs Only"}</option>
                          <option value="cancelled">{isRtl ? "المهام الملغاة فقط (Cancelled)" : "Cancelled Jobs Only"}</option>
                        </select>
                      </div>
                    )}
                  </div>
                </label>

                {/* Option 4: Older Than */}
                <label className={`p-3 rounded-lg border transition-theme cursor-pointer flex items-start gap-3 ${
                  purgeMode === 'older_than' 
                    ? 'border-accent bg-accent/5' 
                    : 'border-border-main hover:bg-surface-subtle'
                }`}>
                  <input
                    type="radio"
                    name="purgeMode"
                    value="older_than"
                    checked={purgeMode === 'older_than'}
                    onChange={() => setPurgeMode('older_than')}
                    className="mt-0.5 accent-accent"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-text-primary">
                        {isRtl ? "مسح السجلات الأقدم من فترة محددة" : "Purge Records Older Than"}
                      </span>
                    </div>
                    <p className="text-[11px] text-text-muted mt-1 mb-2">
                      {isRtl
                        ? "الاحتفاظ بالسجلات الحديثة وحذف البيانات القديمة المتراكمة."
                        : "Retain recent jobs and prune older entries."}
                    </p>
                    {purgeMode === 'older_than' && (
                      <div className="flex items-center gap-2 mt-2">
                        <select
                          value={purgeDays}
                          onChange={(e) => setPurgeDays(Number(e.target.value))}
                          className="bg-surface-card border border-border-main text-xs font-bold rounded-md px-3 py-1.5 focus:outline-none focus:border-accent text-text-primary"
                        >
                          <option value={1}>{isRtl ? "أقدم من 24 ساعة (يوم واحد)" : "Older than 24 hours (1 day)"}</option>
                          <option value={3}>{isRtl ? "أقدم من 3 أيام" : "Older than 3 days"}</option>
                          <option value={7}>{isRtl ? "أقدم من 7 أيام (أسبوع)" : "Older than 7 days (1 week)"}</option>
                          <option value={14}>{isRtl ? "أقدم من 14 يوماً (أسبوعين)" : "Older than 14 days"}</option>
                          <option value={30}>{isRtl ? "أقدم من 30 يوماً (شهر)" : "Older than 30 days"}</option>
                        </select>
                      </div>
                    )}
                  </div>
                </label>
              </div>

              {/* Warning notice */}
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[11px] flex items-start gap-2">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <span>
                  {isRtl
                    ? "تنبيه: حذف السجلات نهائي ولا يمكن التراجع عنه. يتم هذا الإجراء لتفريغ مساحة التخزين ومنع تضخم جدول البيانات."
                    : "Warning: Purging job records is permanent and cannot be undone. This operation frees up database storage."}
                </span>
              </div>
            </div>

            <div className="p-4 border-t border-border-main flex items-center justify-between gap-3 bg-surface-subtle/50">
              <button
                type="button"
                onClick={() => setIsPurgeModalOpen(false)}
                className="px-4 py-2 rounded bg-surface-card border border-border-main text-xs font-bold text-text-muted hover:text-text-primary transition-theme"
              >
                {isRtl ? "إلغاء" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={handleExecutePurge}
                disabled={isPurging || (purgeMode === 'selected' && selectedJobIds.length === 0)}
                className="px-5 py-2 rounded bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs transition-theme flex items-center gap-2 shadow-xs disabled:opacity-50"
              >
                <Trash2 size={14} className={isPurging ? "animate-spin" : ""} />
                <span>
                  {isPurging
                    ? (isRtl ? "جارٍ التنظيف..." : "Purging...")
                    : (purgeMode === 'all' 
                        ? (isRtl ? "تأكيد مسح الكل الآن" : "Confirm Purge All") 
                        : (purgeMode === 'selected'
                            ? (isRtl ? `تأكيد حذف (${selectedJobIds.length}) عناصر` : `Confirm Delete (${selectedJobIds.length})`)
                            : (isRtl ? "تنفيذ التنظيف" : "Execute Purge")))}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

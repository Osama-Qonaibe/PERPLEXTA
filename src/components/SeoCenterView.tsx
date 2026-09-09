import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Globe,
  Search,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  FileText,
  Zap,
  ShieldCheck,
  TrendingUp,
  Tag,
  Wand2,
  Check
} from "lucide-react";
import { useAppContext } from "../context/AppContext";

export interface SeoAuditItem {
  id: number;
  type: 'bulletin';
  title_en: string;
  title_ar: string;
  slug: string;
  category_en: string;
  category_ar: string;
  image_url: string;
  meta_title_en: string;
  meta_title_ar: string;
  meta_description_en: string;
  meta_description_ar: string;
  keywords_en: string;
  keywords_ar: string;
  og_image_url: string;
  seo_score: number;
  missing_fields: string[];
  requires_metadata_population: boolean;
  updated_at: string;
}

export interface SeoAuditSummary {
  total_items: number;
  total_bulletin_ads: number;
  items_missing_metadata: number;
  items_fully_optimized: number;
  overall_seo_health_score: number;
  estimated_time_seconds: number;
}

interface SeoCenterViewProps {
  theme: string;
  t: (key: string, replacements?: any) => string;
  dir?: string;
  language?: string;
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const SeoCenterView: React.FC<SeoCenterViewProps> = ({
  theme,
  t,
  dir = "rtl",
  language = "ar",
  showToast
}) => {
  const { token } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<SeoAuditSummary | null>(null);
  const [items, setItems] = useState<SeoAuditItem[]>([]);
  const [filterCategory, setFilterCategory] = useState<'all' | 'missing' | 'optimized' | 'bulletin'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<SeoAuditItem | null>(null);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{
    total: number;
    completed: number;
    currentTitle: string;
    elapsedSeconds: number;
  }>({ total: 0, completed: 0, currentTitle: '', elapsedSeconds: 0 });
  const [syncingItemId, setSyncingItemId] = useState<string | null>(null);

  const [smartSuggestItem, setSmartSuggestItem] = useState<SeoAuditItem | null>(null);
  const [loadingSmartSuggest, setLoadingSmartSuggest] = useState(false);
  const [smartSuggestData, setSmartSuggestData] = useState<{
    item_title_en: string;
    item_title_ar: string;
    category_en: string;
    category_ar: string;
    current: any;
    suggested: any;
    ai_generated: boolean;
  } | null>(null);

  const [suggestMetaTitleEn, setSuggestMetaTitleEn] = useState('');
  const [suggestMetaTitleAr, setSuggestMetaTitleAr] = useState('');
  const [suggestMetaDescEn, setSuggestMetaDescEn] = useState('');
  const [suggestMetaDescAr, setSuggestMetaDescAr] = useState('');
  const [suggestKeywordsEn, setSuggestKeywordsEn] = useState('');
  const [suggestKeywordsAr, setSuggestKeywordsAr] = useState('');
  const [suggestSlug, setSuggestSlug] = useState('');
  const [isApplyingSuggest, setIsApplyingSuggest] = useState(false);

  const isAr = language === 'ar';

  const handleOpenSmartSuggest = async (item: SeoAuditItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSmartSuggestItem(item);
    setLoadingSmartSuggest(true);
    setSmartSuggestData(null);

    try {
      const res = await fetch("/api/admin/seo-content-audit/suggest", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ type: item.type, id: item.id })
      });

      if (res.ok) {
        const data = await res.json();
        setSmartSuggestData(data);
        setSuggestMetaTitleEn(data.suggested?.meta_title_en || '');
        setSuggestMetaTitleAr(data.suggested?.meta_title_ar || '');
        setSuggestMetaDescEn(data.suggested?.meta_description_en || '');
        setSuggestMetaDescAr(data.suggested?.meta_description_ar || '');
        setSuggestKeywordsEn(data.suggested?.keywords_en || '');
        setSuggestKeywordsAr(data.suggested?.keywords_ar || '');
        setSuggestSlug(data.suggested?.slug || '');
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || (isAr ? "فشل توليد الاقتراحات الذكية" : "Failed to generate smart suggestions"), "error");
      }
    } catch (err: any) {
      console.error("[SeoCenter] Smart suggest error:", err);
      showToast(err.message || (isAr ? "حدث خطأ أثناء التواصل مع الخادم" : "Server communication error"), "error");
    } finally {
      setLoadingSmartSuggest(false);
    }
  };

  const handleApplySmartSuggest = async () => {
    if (!smartSuggestItem) return;
    setIsApplyingSuggest(true);

    try {
      const res = await fetch("/api/admin/seo-content-audit/apply", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          type: smartSuggestItem.type,
          id: smartSuggestItem.id,
          meta_title_en: suggestMetaTitleEn,
          meta_title_ar: suggestMetaTitleAr,
          meta_description_en: suggestMetaDescEn,
          meta_description_ar: suggestMetaDescAr,
          keywords_en: suggestKeywordsEn,
          keywords_ar: suggestKeywordsAr,
          slug: suggestSlug
        })
      });

      if (res.ok) {
        showToast(
          isAr
            ? "تم تطبيق واعتماد ميتاداتا السيو المقترحة بنجاح بنقرة واحدة! ⚡"
            : "Suggested SEO metadata applied successfully in 1-click! ⚡",
          "success"
        );
        await fetchAuditData(true);
        setSmartSuggestItem(null);
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || (isAr ? "فشل تطبيق الميتاداتا" : "Failed to apply metadata"), "error");
      }
    } catch (err: any) {
      console.error("[SeoCenter] Apply suggest error:", err);
      showToast(err.message || (isAr ? "حدث خطأ أثناء الحفظ" : "An error occurred during save"), "error");
    } finally {
      setIsApplyingSuggest(false);
    }
  };

  const fetchAuditData = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const res = await fetch("/api/admin/seo-content-audit", {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "Cache-Control": "no-cache"
        }
      });
      if (res.ok) {
        const data = await res.json();
        setSummary(data.summary);
        setItems(data.items || []);
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || (isAr ? "فشل تحميل بيانات تدقيق السيو" : "Failed to load SEO audit data"), "error");
      }
    } catch (error) {
      console.error("[SeoCenter] Error fetching audit data:", error);
      showToast(isAr ? "خطأ أثناء التواصل مع الخادم" : "Server communication error", "error");
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [token, isAr, showToast]);

  useEffect(() => {
    if (token) {
      fetchAuditData();
    }
  }, [token, fetchAuditData]);

  const handleRunFullSync = async () => {
    if (!summary) return;
    setIsSyncingAll(true);
    const missingCount = summary.items_missing_metadata;
    setSyncProgress({
      total: missingCount || summary.total_items || 1,
      completed: 0,
      currentTitle: isAr ? "جاري تهيئة نماذج الذكاء الاصطناعي وتجهيز الحقول..." : "Initializing AI models & metadata schema...",
      elapsedSeconds: 0
    });

    const timer = setInterval(() => {
      setSyncProgress(prev => ({
        ...prev,
        elapsedSeconds: prev.elapsedSeconds + 1,
        completed: Math.min(prev.completed + (prev.completed < prev.total ? 1 : 0), prev.total)
      }));
    }, 1200);

    try {
      const res = await fetch("/api/admin/sync-metadata", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      clearInterval(timer);

      if (res.ok) {
        const result = await res.json();
        const updatedTotal = result.totalUpdated || 0;
        const aiTotal = result.totalAiProcessed || 0;
        showToast(
          isAr
            ? `تم تحديث الميتاداتا بنجاح! الإجمالي: ${updatedTotal} عنصر (${aiTotal} بواسطة الذكاء الاصطناعي)`
            : `Metadata updated successfully! Total: ${updatedTotal} items (${aiTotal} AI-generated)`,
          "success"
        );
        await fetchAuditData(true);
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || (isAr ? "فشل تحديث البيانات" : "Metadata sync failed"), "error");
      }
    } catch (err: any) {
      clearInterval(timer);
      console.error("[SeoCenter] Sync error:", err);
      showToast(err.message || (isAr ? "حدث خطأ أثناء مزامنة الميتاداتا" : "An error occurred during metadata sync"), "error");
    } finally {
      setIsSyncingAll(false);
    }
  };

  const handleSyncSingleItem = async (item: SeoAuditItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const itemKey = `${item.type}-${item.id}`;
    setSyncingItemId(itemKey);

    try {
      const res = await fetch("/api/admin/seo-content-audit/sync-item", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ type: item.type, id: item.id })
      });

      if (res.ok) {
        const updated = await res.json();
        showToast(
          isAr
            ? `تم استكمال بيانات السيو لـ "${item.title_ar || item.title_en}" بنجاح!`
            : `SEO metadata generated for "${item.title_en || item.title_ar}"!`,
          "success"
        );
        await fetchAuditData(true);
        if (selectedItem && selectedItem.id === item.id && selectedItem.type === item.type) {
          setSelectedItem({
            ...selectedItem,
            ...updated,
            seo_score: 100,
            missing_fields: [],
            requires_metadata_population: false
          });
        }
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || (isAr ? "فشل توليد ميتاداتا العنصر" : "Failed to sync item metadata"), "error");
      }
    } catch (err: any) {
      console.error("[SeoCenter] Sync item error:", err);
      showToast(err.message || (isAr ? "حدث خطأ أثناء المعالجة" : "Item processing error"), "error");
    } finally {
      setSyncingItemId(null);
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (filterCategory === 'missing' && !item.requires_metadata_population) return false;
      if (filterCategory === 'optimized' && item.requires_metadata_population) return false;
      if (filterCategory === 'bulletin' && item.type !== 'bulletin') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleEnMatch = item.title_en?.toLowerCase().includes(q);
        const titleArMatch = item.title_ar?.toLowerCase().includes(q);
        const slugMatch = item.slug?.toLowerCase().includes(q);
        const categoryMatch = item.category_en?.toLowerCase().includes(q) || item.category_ar?.toLowerCase().includes(q);
        return titleEnMatch || titleArMatch || slugMatch || categoryMatch;
      }
      return true;
    });
  }, [items, filterCategory, searchQuery]);

  const getMissingFieldLabel = (field: string) => {
    const labels: Record<string, { ar: string; en: string }> = {
      slug: { ar: 'الرابط الدائم (Slug)', en: 'Slug URL' },
      meta_title_en: { ar: 'عنوان SEO (إنكليزي)', en: 'Meta Title (EN)' },
      meta_title_ar: { ar: 'عنوان SEO (عربي)', en: 'Meta Title (AR)' },
      meta_description_en: { ar: 'وصف SEO (إنكليزي)', en: 'Meta Description (EN)' },
      meta_description_ar: { ar: 'وصف SEO (عربي)', en: 'Meta Description (AR)' },
      keywords_en: { ar: 'الكلمات المفتاحية (إنكليزي)', en: 'Keywords (EN)' },
      keywords_ar: { ar: 'الكلمات المفتاحية (عربي)', en: 'Keywords (AR)' },
      og_image_url: { ar: 'صورة المشاركة (OG Image)', en: 'OG Image URL' },
    };
    return labels[field] ? (isAr ? labels[field].ar : labels[field].en) : field;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <RefreshCw size={36} className="text-accent animate-spin" />
        <p className="text-[var(--text-secondary)] font-medium text-sm">
          {isAr ? "جاري إجراء الفحص الشامل لبيانات السيو والميتاداتا..." : "Conducting comprehensive SEO metadata audit..."}
        </p>
      </div>
    );
  }

  const healthScore = summary?.overall_seo_health_score ?? 100;
  const healthBadgeClass = healthScore >= 85 ? "bg-[var(--status-success-subtle)] text-[var(--fg-success)]" : healthScore >= 60 ? "bg-amber-500/20 text-amber-500" : "bg-rose-500/20 text-rose-500";
  const healthTextClass = healthScore >= 85 ? "text-[var(--fg-success)]" : healthScore >= 60 ? "text-amber-500" : "text-rose-500";

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="p-6 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-lg transition-theme relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-accent/5 rounded-[4px] blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="p-2 rounded-md bg-accent/10 text-accent border border-accent/20">
                <Globe size={22} />
              </span>
              <span className="text-xs font-black uppercase tracking-widest text-accent">
                {isAr ? "مركز أرشفة وتدقيق السيو الشامل" : "PERPLEXTA SEO & METADATA AUDIT CENTER"}
              </span>
            </div>
            <h2 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">
              {isAr ? "فحص وتوليد بيانات السيو والميتاداتا" : "SEO Audit & AI Metadata Population"}
            </h2>
            <p className="text-sm text-[var(--text-muted)] mt-1 max-w-2xl leading-relaxed">
              {isAr
                ? "أداة متخصصة لفحص منشورات وإعلانات فيرال بوك، واكتشاف الحقول الناقصة، وتوليد ميتاداتا ذكية عالية التأثير متوافقة مع محركات البحث جوجل ووسائط التواصل."
                : "Rigorously audit Viralbook posts and bulletin listings, detect incomplete meta fields, and populate search-engine optimized metadata automatically using Gemini AI."}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchAuditData()}
              className="p-3 rounded-lg border border-[var(--border)] bg-[var(--bg-base)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-accent/40 transition-theme flex items-center justify-center shadow-sm"
              title={isAr ? "إعادة تحديث التدقيق" : "Refresh Audit"}
            >
              <RefreshCw size={18} />
            </button>
            <button
              onClick={handleRunFullSync}
              disabled={isSyncingAll}
              className="flex items-center gap-2 bg-accent hover:bg-accent/90 text-white font-bold px-5 py-3 rounded-lg transition-theme shadow-md hover:shadow-lg disabled:opacity-50 active:scale-95"
            >
              {isSyncingAll ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  <span>{isAr ? "جاري التوليد بالذكاء الاصطناعي..." : "AI Sync Running..."}</span>
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  <span>{isAr ? "بدء المزامنة الشاملة بالذكاء الاصطناعي" : "Start Global AI Metadata Sync"}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Real-time Progress & Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Missing Metadata Items */}
        <div className={`p-5 rounded-xl border transition-theme ${
          (summary?.items_missing_metadata || 0) > 0 
            ? 'border-amber-500/40 bg-amber-500/5 dark:bg-amber-500/10' 
            : 'border-[var(--border)] bg-[var(--bg-surface)]'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black uppercase tracking-wider text-[var(--text-muted)]">
              {isAr ? "عناصر تتطلب استكمال الميتاداتا" : "Requires Metadata Population"}
            </span>
            <div className={`p-2 rounded-md ${
              (summary?.items_missing_metadata || 0) > 0 ? 'bg-amber-500/20 text-amber-500' : 'bg-[var(--status-success-subtle)] text-[var(--fg-success)]'
            }`}>
              <AlertTriangle size={18} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-[var(--text-primary)] font-mono">
              {summary?.items_missing_metadata || 0}
            </span>
            <span className="text-xs font-bold text-[var(--text-muted)]">
              / {summary?.total_items || 0} {isAr ? "عنصر" : "items"}
            </span>
          </div>
          <p className="text-[11px] text-[var(--text-muted)] mt-2">
            {(summary?.items_missing_metadata || 0) > 0
              ? (isAr ? "⚠️ تحتوي على حقول SEO غائبة تتطلب التدخل" : "⚠️ Contains empty or missing SEO tags")
              : (isAr ? "✅ جميع العناصر مكتملة ومؤرشفة" : "✅ All content items fully populated")}
          </p>
        </div>

        {/* Metric 2: SEO Health Score */}
        <div className="p-5 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] transition-theme">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black uppercase tracking-wider text-[var(--text-muted)]">
              {isAr ? "معدل صحة جودة السيو" : "SEO Health Score"}
            </span>
            <div className={`p-2 rounded-md ${healthBadgeClass}`}>
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-black font-mono ${healthTextClass}`}>
              {healthScore}%
            </span>
          </div>
          <div className="w-full bg-[var(--bg-base)] h-2 rounded-[4px] overflow-hidden mt-3 border border-[var(--border)]">
            <div
              className={`h-full bg-accent transition-all duration-500`}
              style={{ width: `${healthScore}%` }}
            />
          </div>
        </div>

        {/* Metric 3: Total Audited Items */}
        <div className="p-5 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] transition-theme">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black uppercase tracking-wider text-[var(--text-muted)]">
              {isAr ? "إجمالي المحتوى المفحوص" : "Total Content Audited"}
            </span>
            <div className="p-2 rounded-md bg-blue-500/20 text-blue-500">
              <Layers size={18} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-[var(--text-primary)] font-mono">
              {summary?.total_items || 0}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-2 text-xs text-[var(--text-muted)] font-medium">
            <span className="flex items-center gap-1">
              <Tag size={12} className="text-orange-400" /> {summary?.total_bulletin_ads || 0} {isAr ? "منشورات وإعلانات" : "posts & ads"}
            </span>
          </div>
        </div>

        {/* Metric 4: Real-time Estimated Time Remaining */}
        <div className="p-5 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] transition-theme">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black uppercase tracking-wider text-[var(--text-muted)]">
              {isAr ? "الوقت التقديري للاستكمال" : "Est. Completion Time"}
            </span>
            <div className="p-2 rounded-md bg-purple-500/20 text-purple-500">
              <Clock size={18} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-[var(--text-primary)] font-mono">
              ~{summary?.estimated_time_seconds || 0}s
            </span>
          </div>
          <p className="text-[11px] text-[var(--text-muted)] mt-2">
            {isAr
              ? `تقدير بناءً على معالجة الذكاء الاصطناعي السريعة (1.5ث / عنصر)`
              : `Calculated at ~1.5s per item via Gemini Flash AI`}
          </p>
        </div>
      </div>

      {/* Real-time Progress Monitor Component (When syncing is active) */}
      {isSyncingAll && (
        <div className="p-6 rounded-xl border border-accent/40 bg-accent/5 backdrop-blur-md shadow-xl animate-pulse transition-theme space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-accent text-white shadow-lg animate-spin">
                <RefreshCw size={20} />
              </div>
              <div>
                <h4 className="text-base font-bold text-[var(--text-primary)]">
                  {isAr ? "شاشة المراقبة المباشرة - جاري توليد الميتاداتا بالذكاء الاصطناعي" : "Real-time AI Metadata Generation Monitor"}
                </h4>
                <p className="text-xs text-[var(--text-muted)] mt-0.5 font-mono">
                  {syncProgress.currentTitle}
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-accent font-mono">
                {Math.round((syncProgress.completed / (syncProgress.total || 1)) * 100)}%
              </span>
              <p className="text-[11px] text-[var(--text-muted)] font-mono">
                {syncProgress.completed} / {syncProgress.total} {isAr ? "تم معالجته" : "processed"}
              </p>
            </div>
          </div>

          <div className="w-full bg-[var(--bg-base)] h-3 rounded-[4px] overflow-hidden border border-[var(--border)] p-0.5">
            <div
              className="h-full bg-accent rounded-[4px] transition-all duration-300 shadow-[0_0_12px_rgba(156,163,175,0.8)]"
              style={{ width: `${Math.min(100, Math.max(5, (syncProgress.completed / (syncProgress.total || 1)) * 100))}%` }}
            />
          </div>

          <div className="flex justify-between items-center text-xs font-mono text-[var(--text-muted)]">
            <span>{isAr ? `الوقت المنقضي: ${syncProgress.elapsedSeconds} ثانية` : `Elapsed: ${syncProgress.elapsedSeconds}s`}</span>
            <span>{isAr ? `المتبقي المقدر: ~${Math.max(0, syncProgress.total - syncProgress.completed) * 2} ثانية` : `Remaining ETA: ~${Math.max(0, syncProgress.total - syncProgress.completed) * 2}s`}</span>
          </div>
        </div>
      )}

      {/* Control Bar & Filter Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)]">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setFilterCategory('all')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-theme ${
              filterCategory === 'all'
                ? 'bg-accent text-white shadow-md'
                : 'bg-[var(--bg-base)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border)]'
            }`}
          >
            {isAr ? "جميع المحتويات" : "All Content"} ({items.length})
          </button>
          <button
            onClick={() => setFilterCategory('missing')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-theme flex items-center gap-1.5 ${
              filterCategory === 'missing'
                ? 'bg-amber-500 text-white shadow-md'
                : 'bg-[var(--bg-base)] text-amber-500 hover:bg-amber-500/10 border border-amber-500/30'
            }`}
          >
            <AlertTriangle size={14} />
            <span>{isAr ? "يتطلب استكمال الميتاداتا" : "Requires Metadata"}</span>
            <span className="px-1.5 py-0.5 rounded-[4px] bg-black/20 text-[10px]">
              {items.filter(i => i.requires_metadata_population).length}
            </span>
          </button>
          <button
            onClick={() => setFilterCategory('optimized')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-theme flex items-center gap-1.5 ${
              filterCategory === 'optimized'
                ? 'bg-[var(--bg-accent-emphasis)] text-[var(--fg-on-emphasis)] shadow-md'
                : 'bg-[var(--bg-base)] text-[var(--fg-success)] hover:bg-[var(--status-success-subtle)] border border-[var(--fg-success)]/30'
            }`}
          >
            <ShieldCheck size={14} />
            <span>{isAr ? "مكتمل ومؤرشف" : "Fully Optimized"}</span>
          </button>
          <button
            onClick={() => setFilterCategory('bulletin')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-theme flex items-center gap-1.5 ${
              filterCategory === 'bulletin'
                ? 'bg-orange-600 text-white shadow-md'
                : 'bg-[var(--bg-base)] text-orange-500 hover:bg-orange-500/10 border border-orange-500/30'
            }`}
          >
            <Tag size={14} />
            <span>{isAr ? "منشورات وإعلانات فيرال بوك" : "Viralbook Posts & Ads"}</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[260px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isAr ? "بحث بالعنوان أو التصنيف أو الرابط..." : "Search title, category, slug..."}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-base)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-accent"
          />
        </div>
      </div>

      {/* Main Content Audit Table */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-md overflow-hidden transition-theme">
        <div className="overflow-x-auto">
          <table className="w-full text-right dir-rtl">
            <thead className="bg-[var(--bg-base)] border-b border-[var(--border)] text-[11px] font-black uppercase text-[var(--text-muted)] tracking-wider">
              <tr>
                <th className="p-4">{isAr ? "العنصر والمحتوى" : "Content Item"}</th>
                <th className="p-4">{isAr ? "النوع والتصنيف" : "Type & Category"}</th>
                <th className="p-4">{isAr ? "نتيجة السيو" : "SEO Audit Score"}</th>
                <th className="p-4">{isAr ? "الحقول الناقصة" : "Missing Metadata"}</th>
                <th className="p-4 text-center">{isAr ? "الحالة والإجراء" : "Status & Actions"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] text-xs">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-[var(--text-muted)]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <CheckCircle2 size={32} className="text-accent/60" />
                      <p className="font-bold text-sm">
                        {isAr ? "لا توجد عناصر مطابقة للفلتر المحدد" : "No content items match the selected filter"}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const itemKey = `${item.type}-${item.id}`;
                  const isSyncingThis = syncingItemId === itemKey;

                  return (
                    <tr
                      key={itemKey}
                      onClick={() => setSelectedItem(item)}
                      className={`hover:bg-[var(--bg-base)] transition-theme cursor-pointer ${
                        item.requires_metadata_population ? 'bg-amber-500/5 dark:bg-amber-500/10' : ''
                      }`}
                    >
                      {/* Item Details */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-[var(--bg-base)] border border-[var(--border)] overflow-hidden flex-shrink-0 flex items-center justify-center">
                            {item.image_url ? (
                              <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Globe size={18} className="text-[var(--text-muted)]" />
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-[var(--text-primary)] text-xs line-clamp-1">
                              {isAr ? (item.title_ar || item.title_en) : (item.title_en || item.title_ar)}
                            </div>
                            <div className="text-[10px] text-[var(--text-muted)] font-mono mt-0.5 line-clamp-1">
                              /{item.slug || `item-${item.id}`}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Type & Category */}
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-orange-500/10 text-orange-500 border border-orange-500/20">
                            {isAr ? "منشور / إعلان" : "Post / Ad"}
                          </span>
                          <span className="text-[11px] text-[var(--text-muted)]">
                            {item.category_ar || item.category_en || "-"}
                          </span>
                        </div>
                      </td>

                      {/* SEO Score Progress */}
                      <td className="p-4">
                        <div className="w-36">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-mono font-bold text-[11px]">
                              {item.seo_score} / 100
                            </span>
                            <span className={`text-[10px] font-bold ${
                              item.seo_score >= 85 ? 'text-[var(--fg-success)]' : item.seo_score >= 60 ? 'text-amber-500' : 'text-rose-500'
                            }`}>
                              {item.seo_score}%
                            </span>
                          </div>
                          <div className="w-full bg-[var(--bg-base)] h-1.5 rounded-[4px] overflow-hidden border border-[var(--border)]">
                            <div
                              className={`h-full ${
                                item.seo_score >= 85 ? 'bg-[var(--fg-success)]' : item.seo_score >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                              }`}
                              style={{ width: `${item.seo_score}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Missing Metadata Fields */}
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {item.missing_fields.length === 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[var(--status-success-subtle)] text-[var(--fg-success)]">
                              <CheckCircle2 size={12} />
                              {isAr ? "مكتمل بالكامل" : "Fully Optimized"}
                            </span>
                          ) : (
                            item.missing_fields.slice(0, 3).map((field) => (
                              <span
                                key={field}
                                className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-500 border border-amber-500/30"
                              >
                                {getMissingFieldLabel(field)}
                              </span>
                            ))
                          )}
                          {item.missing_fields.length > 3 && (
                            <span className="px-1 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-500">
                              +{item.missing_fields.length - 3}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => handleOpenSmartSuggest(item, e)}
                            className="flex items-center gap-1.5 bg-accent/10 hover:bg-accent text-accent hover:text-white px-3 py-1.5 rounded-lg font-bold text-[11px] border border-accent/30 shadow-sm transition-all group"
                            title={isAr ? "عرض المقتراحات الذكية بالذكاء الاصطناعي والتحديث بنقرة واحدة" : "Smart AI Suggest & 1-Click Update"}
                          >
                            <Wand2 size={13} className="group-hover:rotate-12 transition-transform" />
                            <span>{isAr ? "اقتراح ذكي ✨" : "Smart Suggest ✨"}</span>
                          </button>

                          {item.requires_metadata_population ? (
                            <button
                              onClick={(e) => handleSyncSingleItem(item, e)}
                              disabled={isSyncingThis}
                              className="flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-white px-2.5 py-1.5 rounded-lg font-bold text-[10px] shadow-sm transition-theme disabled:opacity-50"
                              title={isAr ? "استكمال الميتاداتا تلقائياً" : "Auto Populate"}
                            >
                              {isSyncingThis ? (
                                <RefreshCw size={12} className="animate-spin" />
                              ) : (
                                <Zap size={12} />
                              )}
                              <span>{isAr ? "توليد سريع" : "Quick AI"}</span>
                            </button>
                          ) : (
                            <button
                              onClick={(e) => handleSyncSingleItem(item, e)}
                              disabled={isSyncingThis}
                              className="flex items-center gap-1 bg-[var(--bg-base)] hover:bg-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] px-2.5 py-1.5 rounded-lg font-bold text-[10px] border border-[var(--border)] transition-theme disabled:opacity-50"
                              title={isAr ? "إعادة توليد الميتاداتا" : "Regenerate Metadata"}
                            >
                              <RefreshCw size={12} className={isSyncingThis ? "animate-spin" : ""} />
                              <span>{isAr ? "تحديث" : "Refresh"}</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Item Detail Drawer/Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-4 border-b border-[var(--border)]">
              <div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-accent/10 text-accent border border-accent/20">
                  {isAr ? "منشور / إعلان فيرال بوك" : "Viralbook Post / Ad"}
                </span>
                <h3 className="text-xl font-black text-[var(--text-primary)] mt-1">
                  {isAr ? (selectedItem.title_ar || selectedItem.title_en) : (selectedItem.title_en || selectedItem.title_ar)}
                </h3>
                <p className="text-xs text-[var(--text-muted)] font-mono mt-0.5">
                  /{selectedItem.slug}
                </p>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="p-2 rounded-lg bg-[var(--bg-base)] hover:bg-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Score & Status Banner */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--bg-base)] border border-[var(--border)]">
                <div>
                  <span className="text-[10px] text-[var(--text-muted)] font-black uppercase">
                    {isAr ? "تقييم أرشفة السيو" : "SEO Audit Score"}
                  </span>
                  <div className="text-2xl font-black font-mono text-accent mt-0.5">
                    {selectedItem.seo_score} / 100
                  </div>
                </div>
                <div>
                  {selectedItem.requires_metadata_population ? (
                    <span className="px-3 py-1 rounded-[4px] text-xs font-bold bg-amber-500/20 text-amber-500 border border-amber-500/30">
                      ⚠️ {isAr ? "يتطلب استكمال البيانات" : "Requires Metadata"}
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-[4px] text-xs font-bold bg-[var(--status-success-subtle)] text-[var(--fg-success)] border border-[var(--fg-success)]/30">
                      ✅ {isAr ? "مكتمل ومؤرشف بنجاح" : "Fully Optimized"}
                    </span>
                  )}
                </div>
              </div>

              {/* Populated / Missing Fields */}
              <div className="grid grid-cols-1 gap-3">
                <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--bg-base)] space-y-1">
                  <div className="font-bold text-[var(--text-primary)]">{isAr ? "عنوان SEO (EN):" : "Meta Title (EN):"}</div>
                  <p className="text-[var(--text-secondary)] font-mono">{selectedItem.meta_title_en || (isAr ? "(فارغ)" : "(Empty)")}</p>
                </div>

                <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--bg-base)] space-y-1">
                  <div className="font-bold text-[var(--text-primary)]">{isAr ? "عنوان SEO (AR):" : "Meta Title (AR):"}</div>
                  <p className="text-[var(--text-secondary)] font-mono">{selectedItem.meta_title_ar || (isAr ? "(فارغ)" : "(Empty)")}</p>
                </div>

                <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--bg-base)] space-y-1">
                  <div className="font-bold text-[var(--text-primary)]">{isAr ? "وصف SEO (EN):" : "Meta Description (EN):"}</div>
                  <p className="text-[var(--text-secondary)]">{selectedItem.meta_description_en || (isAr ? "(فارغ)" : "(Empty)")}</p>
                </div>

                <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--bg-base)] space-y-1">
                  <div className="font-bold text-[var(--text-primary)]">{isAr ? "وصف SEO (AR):" : "Meta Description (AR):"}</div>
                  <p className="text-[var(--text-secondary)]">{selectedItem.meta_description_ar || (isAr ? "(فارغ)" : "(Empty)")}</p>
                </div>

                <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--bg-base)] space-y-1">
                  <div className="font-bold text-[var(--text-primary)]">{isAr ? "الكلمات المفتاحية (EN):" : "Keywords (EN):"}</div>
                  <p className="text-[var(--text-secondary)] font-mono">{selectedItem.keywords_en || (isAr ? "(فارغ)" : "(Empty)")}</p>
                </div>

                <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--bg-base)] space-y-1">
                  <div className="font-bold text-[var(--text-primary)]">{isAr ? "الكلمات المفتاحية (AR):" : "Keywords (AR):"}</div>
                  <p className="text-[var(--text-secondary)] font-mono">{selectedItem.keywords_ar || (isAr ? "(فارغ)" : "(Empty)")}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
              <button
                onClick={() => setSelectedItem(null)}
                className="px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] font-bold text-xs"
              >
                {isAr ? "إغلاق" : "Close"}
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    const item = selectedItem;
                    setSelectedItem(null);
                    handleOpenSmartSuggest(item, e);
                  }}
                  className="flex items-center gap-1.5 bg-accent text-white font-black px-4 py-2 rounded-lg text-xs shadow-md hover:bg-accent/90"
                >
                  <Wand2 size={14} />
                  <span>{isAr ? "اقتراح ذكي وتعديل ✨" : "Smart Suggest & Edit ✨"}</span>
                </button>
                <button
                  onClick={() => handleSyncSingleItem(selectedItem)}
                  disabled={syncingItemId === `${selectedItem.type}-${selectedItem.id}`}
                  className="flex items-center gap-1.5 bg-[var(--bg-base)] hover:bg-[var(--border)] text-[var(--text-primary)] font-bold px-4 py-2 rounded-lg text-xs border border-[var(--border)] shadow-sm"
                >
                  <Sparkles size={14} />
                  <span>{isAr ? "توليد تلقائي فوراً" : "Auto Populate Now"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Smart Suggest Modal */}
      {smartSuggestItem && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-[var(--border)]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-accent/10 text-accent border border-accent/20">
                  <Wand2 size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-accent/10 text-accent">
                      {isAr ? "اقتراح ذكي بالذكاء الاصطناعي" : "AI Smart Suggest"}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[var(--bg-base)] text-[var(--text-muted)] border border-[var(--border)]">
                      {isAr ? "منشور / إعلان فيرال بوك" : "Viralbook Post / Ad"}
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-[var(--text-primary)] mt-1">
                    {isAr ? (smartSuggestItem.title_ar || smartSuggestItem.title_en) : (smartSuggestItem.title_en || smartSuggestItem.title_ar)}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setSmartSuggestItem(null)}
                className="p-2 rounded-lg bg-[var(--bg-base)] hover:bg-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                ✕
              </button>
            </div>

            {loadingSmartSuggest ? (
              <div className="flex flex-col items-center justify-center py-16 space-y-4">
                <div className="p-4 rounded-[4px] bg-accent/10 text-accent animate-bounce">
                  <Wand2 size={32} />
                </div>
                <div className="text-center space-y-1">
                  <p className="font-bold text-sm text-[var(--text-primary)]">
                    {isAr ? "جاري تحليل المحتوى واستخراج عناوين وأوصاف SEO بالذكاء الاصطناعي..." : "Analyzing content & generating smart meta title and description with Gemini AI..."}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {isAr ? "يتم التحليل بناءً على نص المادة والتصنيف والتقنيات" : "Derived from body content, keywords & tech specs"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-5 text-xs">
                {/* Meta Titles Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Meta Title EN */}
                  <div className="space-y-2 p-3.5 rounded-xl border border-[var(--border)] bg-[var(--bg-base)]">
                    <div className="flex items-center justify-between">
                      <label className="font-black text-[var(--text-primary)] flex items-center gap-1.5">
                        <span>{isAr ? "عنوان SEO المقترح (إنكليزي)" : "Meta Title Suggested (EN)"}</span>
                      </label>
                      <span className="text-[10px] font-mono text-[var(--text-muted)]">
                        {suggestMetaTitleEn.length} / 60 {isAr ? "حرف" : "chars"}
                      </span>
                    </div>
                    {smartSuggestData?.current?.meta_title_en && (
                      <div className="text-[10px] text-[var(--text-muted)] bg-[var(--bg-surface)] p-2 rounded border border-[var(--border)]">
                        <span className="font-bold">{isAr ? "العنوان الحالي:" : "Current:"}</span> {smartSuggestData.current.meta_title_en}
                      </div>
                    )}
                    <input
                      type="text"
                      value={suggestMetaTitleEn}
                      onChange={(e) => setSuggestMetaTitleEn(e.target.value)}
                      placeholder="Meta Title EN..."
                      className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-xs text-[var(--text-primary)] font-medium focus:outline-none focus:border-accent"
                    />
                  </div>

                  {/* Meta Title AR */}
                  <div className="space-y-2 p-3.5 rounded-xl border border-[var(--border)] bg-[var(--bg-base)]">
                    <div className="flex items-center justify-between">
                      <label className="font-black text-[var(--text-primary)] flex items-center gap-1.5">
                        <span>{isAr ? "عنوان SEO المقترح (عربي)" : "Meta Title Suggested (AR)"}</span>
                      </label>
                      <span className="text-[10px] font-mono text-[var(--text-muted)]">
                        {suggestMetaTitleAr.length} / 60 {isAr ? "حرف" : "chars"}
                      </span>
                    </div>
                    {smartSuggestData?.current?.meta_title_ar && (
                      <div className="text-[10px] text-[var(--text-muted)] bg-[var(--bg-surface)] p-2 rounded border border-[var(--border)]">
                        <span className="font-bold">{isAr ? "العنوان الحالي:" : "Current:"}</span> {smartSuggestData.current.meta_title_ar}
                      </div>
                    )}
                    <input
                      type="text"
                      value={suggestMetaTitleAr}
                      onChange={(e) => setSuggestMetaTitleAr(e.target.value)}
                      placeholder="Meta Title AR..."
                      className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-xs text-[var(--text-primary)] font-medium focus:outline-none focus:border-accent dir-rtl"
                    />
                  </div>
                </div>

                {/* Meta Descriptions Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Meta Desc EN */}
                  <div className="space-y-2 p-3.5 rounded-xl border border-[var(--border)] bg-[var(--bg-base)]">
                    <div className="flex items-center justify-between">
                      <label className="font-black text-[var(--text-primary)]">
                        {isAr ? "وصف SEO المقترح (إنكليزي)" : "Meta Description Suggested (EN)"}
                      </label>
                      <span className={`text-[10px] font-mono font-bold ${
                        suggestMetaDescEn.length >= 120 && suggestMetaDescEn.length <= 160 ? 'text-[var(--fg-success)]' : 'text-amber-500'
                      }`}>
                        {suggestMetaDescEn.length} / 155 {isAr ? "حرف (مستحسن 130-155)" : "chars (recommended 130-155)"}
                      </span>
                    </div>
                    {smartSuggestData?.current?.meta_description_en && (
                      <div className="text-[10px] text-[var(--text-muted)] bg-[var(--bg-surface)] p-2 rounded border border-[var(--border)]">
                        <span className="font-bold">{isAr ? "الوصف الحالي:" : "Current:"}</span> {smartSuggestData.current.meta_description_en}
                      </div>
                    )}
                    <textarea
                      rows={3}
                      value={suggestMetaDescEn}
                      onChange={(e) => setSuggestMetaDescEn(e.target.value)}
                      placeholder="Meta Description EN..."
                      className="w-full p-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-xs text-[var(--text-primary)] leading-relaxed focus:outline-none focus:border-accent resize-none"
                    />
                  </div>

                  {/* Meta Desc AR */}
                  <div className="space-y-2 p-3.5 rounded-xl border border-[var(--border)] bg-[var(--bg-base)]">
                    <div className="flex items-center justify-between">
                      <label className="font-black text-[var(--text-primary)]">
                        {isAr ? "وصف SEO المقترح (عربي)" : "Meta Description Suggested (AR)"}
                      </label>
                      <span className={`text-[10px] font-mono font-bold ${
                        suggestMetaDescAr.length >= 120 && suggestMetaDescAr.length <= 160 ? 'text-[var(--fg-success)]' : 'text-amber-500'
                      }`}>
                        {suggestMetaDescAr.length} / 155 {isAr ? "حرف (مستحسن 130-155)" : "chars (recommended 130-155)"}
                      </span>
                    </div>
                    {smartSuggestData?.current?.meta_description_ar && (
                      <div className="text-[10px] text-[var(--text-muted)] bg-[var(--bg-surface)] p-2 rounded border border-[var(--border)]">
                        <span className="font-bold">{isAr ? "الوصف الحالي:" : "Current:"}</span> {smartSuggestData.current.meta_description_ar}
                      </div>
                    )}
                    <textarea
                      rows={3}
                      value={suggestMetaDescAr}
                      onChange={(e) => setSuggestMetaDescAr(e.target.value)}
                      placeholder="Meta Description AR..."
                      className="w-full p-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-xs text-[var(--text-primary)] leading-relaxed focus:outline-none focus:border-accent resize-none dir-rtl"
                    />
                  </div>
                </div>

                {/* Keywords & Slug */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5 p-3 rounded-lg border border-[var(--border)] bg-[var(--bg-base)]">
                    <label className="font-bold text-[var(--text-primary)] block text-[11px]">
                      {isAr ? "الكلمات المفتاحية (EN)" : "Keywords (EN)"}
                    </label>
                    <input
                      type="text"
                      value={suggestKeywordsEn}
                      onChange={(e) => setSuggestKeywordsEn(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded border border-[var(--border)] bg-[var(--bg-surface)] text-[11px] font-mono"
                    />
                  </div>

                  <div className="space-y-1.5 p-3 rounded-lg border border-[var(--border)] bg-[var(--bg-base)]">
                    <label className="font-bold text-[var(--text-primary)] block text-[11px]">
                      {isAr ? "الكلمات المفتاحية (AR)" : "Keywords (AR)"}
                    </label>
                    <input
                      type="text"
                      value={suggestKeywordsAr}
                      onChange={(e) => setSuggestKeywordsAr(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded border border-[var(--border)] bg-[var(--bg-surface)] text-[11px] font-mono dir-rtl"
                    />
                  </div>

                  <div className="space-y-1.5 p-3 rounded-lg border border-[var(--border)] bg-[var(--bg-base)]">
                    <label className="font-bold text-[var(--text-primary)] block text-[11px]">
                      {isAr ? "الرابط الدائم (Slug)" : "Slug URL"}
                    </label>
                    <input
                      type="text"
                      value={suggestSlug}
                      onChange={(e) => setSuggestSlug(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded border border-[var(--border)] bg-[var(--bg-surface)] text-[11px] font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => setSmartSuggestItem(null)}
                className="px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] font-bold text-xs"
              >
                {isAr ? "إلغاء" : "Cancel"}
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => smartSuggestItem && handleOpenSmartSuggest(smartSuggestItem)}
                  disabled={loadingSmartSuggest || isApplyingSuggest}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-base)] text-[var(--text-primary)] font-bold text-xs hover:border-accent/40 disabled:opacity-50"
                >
                  <RefreshCw size={14} className={loadingSmartSuggest ? "animate-spin" : ""} />
                  <span>{isAr ? "إعادة التوليد" : "Regenerate Suggestion"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleApplySmartSuggest}
                  disabled={loadingSmartSuggest || isApplyingSuggest}
                  className="flex items-center gap-2 bg-accent hover:bg-accent/90 text-white font-black px-6 py-2.5 rounded-lg text-xs shadow-lg hover:shadow-xl transition-all disabled:opacity-50 active:scale-95"
                >
                  {isApplyingSuggest ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>{isAr ? "جاري الاعتماد والتحديث..." : "Applying Update..."}</span>
                    </>
                  ) : (
                    <>
                      <Zap size={16} />
                      <span>{isAr ? "تطبيق وتحديث بنقرة واحدة ⚡" : "One-Click Apply & Save ⚡"}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect, useCallback } from "react";
import { useAppContext } from "../../context/AppContext";
import { motion, AnimatePresence } from "motion/react";
import {
  AlertTriangle,
  Scale,
  Search,
  RefreshCw,
  Clock,
  UserCheck,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Eye,
  Trash2,
  X,
  Plus,
  Sliders,
  DollarSign,
  ChevronDown,
  Shield,
  Key,
  Database,
  Users,
  Settings,
  Server,
  EyeOff,
  Copy,
  ExternalLink,
  Coins,
  Wrench,
  LayoutGrid,
  Megaphone,
  ImageIcon,
  Video,
  Mic,
  Volume2,
  GraduationCap,
  Code2,
  Music,
  UserPlus,
  FastForward,
  Bell,
  Mail,
  FileText,
  ShieldAlert,
  Settings2,
  Download,
  ArrowRight,
  ArrowLeft,
  Activity,
  History as HistoryIcon,
} from "lucide-react";
import { ActionConfirmationModal } from "../ActionConfirmationModal";
import { ComplianceAuditLogsViewProps } from "./adminTypes";

export const ComplianceAuditLogsView = ({
  theme,
  t,
  dir,
}: {
  theme: string;
  t: (key: string) => string;
  dir: string;
}) => {
  const { token, language } = useAppContext();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [limit] = useState(25);
  const [offset, setOffset] = useState(0);
  const [actionFilter, setActionFilter] = useState("");
  const [emailFilter, setEmailFilter] = useState("");
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const [selectedLogIds, setSelectedLogIds] = useState<any[]>([]);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string | { ar: string; en: string };
    description: string | { ar: string; en: string };
    variant?: 'danger' | 'success' | 'warning' | 'info' | 'purple';
    confirmLabel?: string | { ar: string; en: string };
    onConfirm: () => Promise<void> | void;
  } | null>(null);

  const isRtl = language === "ar";

  const toggleSelectLog = (id: any) => {
    setSelectedLogIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const visibleIds = logs.map((log) => log.id);
    const allSelected = visibleIds.every((id) => selectedLogIds.includes(id));
    if (allSelected) {
      setSelectedLogIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedLogIds((prev) => {
        const union = new Set([...prev, ...visibleIds]);
        return Array.from(union);
      });
    }
  };

  const handleDeleteSelected = () => {
    if (selectedLogIds.length === 0) return;
    const confirmMessage = isRtl
      ? `هل أنت متأكد من مسح (${selectedLogIds.length}) من سجلات التدقيق والامتثال؟ لا يمكن التراجع عن هذا الإجراء.`
      : `Are you sure you want to permanently delete (${selectedLogIds.length}) compliance logs? This action is irreversible.`;

    setConfirmModal({
      isOpen: true,
      title: { ar: "مسح السجلات المحددة؟", en: "Delete Selected Logs?" },
      description: confirmMessage,
      variant: "purple",
      onConfirm: async () => {
        try {
          const res = await fetch("/api/admin/audit-logs/batch-delete", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ ids: selectedLogIds }),
          });
          if (res.ok) {
            setSelectedLogIds([]);
            fetchLogs();
          } else {
            const errData = await res.json();
            console.error("Failed to delete selected logs:", errData.error);
          }
        } catch (err) {
          console.error("Batch delete compliance logs failed:", err);
        }
      }
    });
  };

  const handleClearAll = () => {
    const confirmMessage = isRtl
      ? "تنبيه أمني هام: هل أنت متأكد تماماً من مسح كافة سجلات التدقيق والامتثال بالمنصة بشكل كامل؟ هذا الإجراء سيقوم بتصفير السجلات أمنياً ولا يمكن التراجع عنه."
      : "CRITICAL ALERT: Are you absolutely sure you want to completely clear ALL compliance audit logs? This will wipe the audit history permanently.";

    setConfirmModal({
      isOpen: true,
      title: { ar: "تصفير كافة السجلات أمنياً؟", en: "Purge All Compliance Logs?" },
      description: confirmMessage,
      variant: "purple",
      onConfirm: async () => {
        try {
          const res = await fetch("/api/admin/audit-logs/all", {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
              "x-confirm-action": "DELETE_ALL",
            },
          });
          if (res.ok) {
            setSelectedLogIds([]);
            fetchLogs();
          } else {
            const errData = await res.json();
            console.error("Failed to purge compliance logs:", errData.error);
          }
        } catch (err) {
          console.error("Purge compliance logs failed:", err);
        }
      }
    });
  };

  const fetchLogs = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const url = `/api/admin/audit-logs?limit=${limit}&offset=${offset}&action=${encodeURIComponent(actionFilter)}&email=${encodeURIComponent(emailFilter)}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setTotal(data.pagination?.total || 0);
      }
    } catch (err) {
      console.error("Failed to fetch compliance audit logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [token, offset]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setOffset(0);
    fetchLogs();
  };

  const handleReset = () => {
    setActionFilter("");
    setEmailFilter("");
    setOffset(0);
    setTimeout(() => {
      fetchLogs();
    }, 50);
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleString(language === "ar" ? "ar-EG" : "en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZone: "UTC"
    }) + " UTC";
  };

  return (
    <div className="space-y-6 font-sans" dir={isRtl ? "rtl" : "ltr"}>
      {/* Search & Audit Filters Bar */}
      <form onSubmit={handleSearch} className={`p-4 rounded-lg border flex flex-col md:flex-row gap-4 items-end justify-between ${
        theme === "dark" ? "bg-[#18181b] border-gray-800" : "bg-white border-gray-100"
      }`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 w-full">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              {isRtl ? "تصفية حسب العملية الإدارية" : "Search Admin Action"}
            </span>
            <div className="relative">
              <input
                type="text"
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                placeholder={isRtl ? "مثال: UPDATE, POST..." : "e.g., CREATE_PLAN, HTTP_POST..."}
                className={`w-full text-xs font-medium px-4 py-2.5 rounded-md border outline-none font-sans ${
                  theme === "dark" 
                    ? "bg-[#0f0f11] text-white border-gray-800 focus:border-accent/50" 
                    : "bg-gray-50 text-gray-900 border-gray-200 focus:border-accent/50"
                }`}
              />
            </div>
          </div>
          
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              {isRtl ? "البريد الإلكتروني للـ دكتور" : "Search Admin Email"}
            </span>
            <div className="relative">
              <input
                type="text"
                value={emailFilter}
                onChange={(e) => setEmailFilter(e.target.value)}
                placeholder={isRtl ? "البحث بالبريد..." : "e.g., admin@perplexta.com"}
                className={`w-full text-xs font-medium px-4 py-2.5 rounded-md border outline-none font-sans ${
                  theme === "dark" 
                    ? "bg-[#0f0f11] text-white border-gray-800 focus:border-accent/50" 
                    : "bg-gray-50 text-gray-900 border-gray-200 focus:border-accent/50"
                }`}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent text-white rounded-md text-xs font-bold cursor-pointer transition-theme shadow-[0_4px_12px_rgba(156,163,175,0.3)] disabled:opacity-50"
          >
            {loading ? <RefreshCw className="animate-spin" size={14} /> : <Search size={14} />}
            {isRtl ? "تطبيق التصفية" : "Apply Filter"}
          </button>
          
          <button
            type="button"
            onClick={handleReset}
            disabled={loading}
            className={`px-4 py-2.5 border rounded-md text-xs font-bold cursor-pointer transition-theme ${
              theme === "dark" 
                ? "border-gray-800 text-gray-300 hover:bg-gray-800"
                : "border-gray-200 text-gray-600 hover:bg-gray-100"
            }`}
          >
            {isRtl ? "إعادة تعيين" : "Reset"}
          </button>
        </div>
      </form>

      {/* Action Buttons for Log Deletion */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-1.5 pl-0">
        <div className="flex items-center gap-2">
          {selectedLogIds.length > 0 && (
            <button
              onClick={handleDeleteSelected}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500 text-purple-500 hover:text-white border border-purple-500/20 rounded-md text-xs font-bold transition-theme cursor-pointer shadow-sm animate-in zoom-in-95"
            >
              <Trash2 size={13} />
              {isRtl 
                ? `مسح المحدد (${selectedLogIds.length})` 
                : `Delete Selected (${selectedLogIds.length})`}
            </button>
          )}
        </div>

        <button
          onClick={handleClearAll}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500 text-purple-500 hover:text-white border border-purple-500/30 rounded-md text-xs font-bold transition-theme cursor-pointer shadow-sm"
        >
          <AlertTriangle size={13} className="text-purple-500" />
          {isRtl ? "تطهير كافة السجلات" : "Purge All Logs"}
        </button>
      </div>

      {/* Main Audit Logs Table Container */}
      <div className={`rounded-xl border overflow-hidden shadow-sm transition-theme ${
        theme === "dark" ? "bg-[#18181b] border-gray-800/60" : "bg-white border-gray-100"
      }`}>
        <div className="overflow-x-auto min-w-full">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className={`border-b text-[10px] uppercase font-black tracking-wider text-gray-400 ${
                theme === "dark" ? "border-gray-800 bg-[#0f0f11]/40" : "border-gray-100 bg-gray-50/60"
              }`}>
                <th className="py-3.5 px-4 text-center w-12">
                  <input
                    type="checkbox"
                    checked={logs.length > 0 && logs.every((log) => selectedLogIds.includes(log.id))}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300 text-accent focus:ring-accent-500 cursor-pointer h-4 w-4"
                  />
                </th>
                <th className="py-3.5 px-4 text-center">{isRtl ? "الوقت (UTC)" : "Timestamp (UTC)"}</th>
                <th className="py-3.5 px-4">{isRtl ? "المسؤول (Admin)" : "Admin User"}</th>
                <th className="py-3.5 px-4">{isRtl ? "العملية الإجرائية" : "Administrative Action"}</th>
                <th className="py-3.5 px-4">{isRtl ? "المستهدف" : "Target Resource"}</th>
                <th className="py-3.5 px-4">{isRtl ? "العنوان الرقمي IP" : "IP Address"}</th>
                <th className="py-3.5 px-4 text-center">{isRtl ? "التفاصيل" : "Compliance Audit"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    <RefreshCw className="animate-spin inline-block mr-2 text-accent" size={18} />
                    {isRtl ? "جاري جلب سجل التدقيق الأمني..." : "Ingesting secure compliance records..."}
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    {isRtl ? "لا توجد سجلات مطابقة لمعايير الاستعلام أمنياً." : "No matching compliant audit trail records found."}
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr 
                    key={log.id} 
                    className={`transition-theme ${
                      selectedLogIds.includes(log.id)
                        ? "bg-accent/5 hover:bg-accent/10"
                        : theme === "dark" ? "hover:bg-zinc-900/40" : "hover:bg-gray-50/40"
                    }`}
                  >
                    <td className="py-3.5 px-4 text-center w-12">
                      <input
                        type="checkbox"
                        checked={selectedLogIds.includes(log.id)}
                        onChange={() => toggleSelectLog(log.id)}
                        className="rounded border-gray-300 text-accent focus:ring-accent-500 cursor-pointer h-4 w-4"
                      />
                    </td>
                    <td className="py-3.5 px-4 text-center text-[10px] font-mono whitespace-nowrap opacity-80">
                      {formatDate(log.created_at)}
                    </td>
                    <td className="py-3.5 px-4 font-medium max-w-[180px] truncate">
                      <div className="flex flex-col">
                        <span className="font-bold text-[var(--text-primary)]">{log.admin_email || ("ID: " + log.admin_id)}</span>
                        <span className="text-[9px] opacity-40 font-mono">UID: {log.admin_id || "SYSTEM"}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-sm text-[10px] font-black uppercase tracking-tight ${
                        log.action.startsWith("HTTP_") 
                          ? log.action.includes("POST") 
                            ? "bg-blue-500/10 text-blue-400 border border-blue-500/10"
                            : log.action.includes("DELETE")
                              ? "bg-rose-500/10 text-rose-400 border border-rose-500/10"
                              : "bg-purple-500/10 text-purple-400 border border-purple-500/10"
                          : "bg-accent/10 text-accent border border-accent/10"
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-mono text-[11px] opacity-80">{log.target_resource || "GLOBAL"}</span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-mono text-[11px] opacity-75">{log.ip_address || "LOCAL_EXEC"}</span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="px-3 py-1 border border-accent/20 rounded-md text-[10px] font-bold text-accent hover:border-accent hover:bg-accent/10 cursor-pointer transition-theme"
                      >
                        {isRtl ? "عرض التفاصيل" : "Inspect Payload"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Database Audit Pagination Bar */}
        <div className={`p-4 border-t flex items-center justify-between text-xs ${
          theme === "dark" ? "border-gray-800/60 bg-[#0f0f11]/20" : "border-gray-100 bg-gray-50/30"
        }`}>
          <div className="text-gray-400 font-bold">
            {isRtl 
              ? `عرض ${logs.length} سجل من إجمالي ${total}`
              : `Showing ${logs.length} of ${total} compliance log records`}
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - limit))}
              className={`p-2 rounded-md border flex items-center justify-center transition-theme disabled:opacity-40 select-none ${
                offset === 0 ? "cursor-not-allowed" : "cursor-pointer"
              } ${
                theme === "dark" 
                  ? "border-gray-800 text-gray-300 hover:bg-zinc-800"
                  : "border-gray-200 text-gray-600 hover:bg-gray-100"
              }`}
            >
              {isRtl ? <ArrowRight size={14} /> : <ArrowLeft size={14} />}
            </button>
            <button
              disabled={offset + limit >= total}
              onClick={() => setOffset(offset + limit)}
              className={`p-2 rounded-md border flex items-center justify-center transition-theme disabled:opacity-40 select-none ${
                offset + limit >= total ? "cursor-not-allowed" : "cursor-pointer"
              } ${
                theme === "dark" 
                  ? "border-gray-800 text-gray-300 hover:bg-zinc-800"
                  : "border-gray-200 text-gray-600 hover:bg-gray-100"
              }`}
            >
              {isRtl ? <ArrowLeft size={14} /> : <ArrowRight size={14} />}
            </button>
          </div>
        </div>
      </div>

      {/* JSON Expand Payload Modal -- Pure Emerald Glow Premium Transition */}
      <AnimatePresence>
        {selectedLog && (
          <div className="fixed inset-0 flex items-center justify-center z-[130] p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedLog(null)}
              className="fixed inset-0 bg-black/65 backdrop-blur-[4px] z-0 cursor-pointer"
            />

            {/* Modal Drawer */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className={`relative max-w-2xl w-full rounded-xl border p-6 z-10 shadow-2xl ${
                theme === "dark" ? "bg-[#111113] border-gray-800 text-white" : "bg-white border-gray-200 text-gray-900"
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3.5 border-b border-[var(--border)] mb-4">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="text-accent " size={18} />
                  <span className="text-xs uppercase font-black tracking-wider w-auto h-auto leading-none mt-0">
                    {isRtl ? "التدقيق والتفاصيل القياسية" : "Compliance Payload Audit Inspection"}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedLog(null)}
                  className={`w-8 h-8 rounded-full border flex items-center justify-center hover:bg-rose-500/10 hover:border-rose-500/30 text-gray-400 hover:text-rose-500 cursor-pointer transition-theme`}
                >
                  <X size={15} />
                </button>
              </div>

              {/* Summary metadata grid */}
              <div className="grid grid-cols-2 gap-4 text-[10px] mb-4">
                <div className="flex flex-col p-2.5 rounded bg-black/5 dark:bg-black/25 border border-[var(--border)]">
                  <span className="text-gray-400 font-bold uppercase">{isRtl ? "المسؤول الفاعل" : "Action Operator"}</span>
                  <span className="font-bold mt-0.5 text-[var(--text-primary)] truncate">{selectedLog.admin_email || "System/Cron Engine"}</span>
                </div>
                <div className="flex flex-col p-2.5 rounded bg-black/5 dark:bg-black/25 border border-[var(--border)]">
                  <span className="text-gray-400 font-bold uppercase">{isRtl ? "العملية الإجرائية" : "Action Identifier"}</span>
                  <span className="font-bold mt-0.5 text-accent font-mono">{selectedLog.action}</span>
                </div>
                <div className="flex flex-col p-2.5 rounded bg-black/5 dark:bg-black/25 border border-[var(--border)]">
                  <span className="text-gray-400 font-bold uppercase">{isRtl ? "الوقت (توقيت عالمي)" : "Logged Timestamp (UTC)"}</span>
                  <span className="font-semibold mt-0.5 font-mono">{formatDate(selectedLog.created_at)}</span>
                </div>
                <div className="flex flex-col p-2.5 rounded bg-black/5 dark:bg-black/25 border border-[var(--border)]">
                  <span className="text-gray-400 font-bold uppercase">{isRtl ? "بيانات الموقع والشبكة" : "Network Ingress Platform"}</span>
                  <span className="font-mono mt-0.5 leading-none text-zinc-400">{selectedLog.ip_address || "Internal Sandbox Host"}</span>
                </div>
              </div>

              {/* User Agent Block */}
              {selectedLog.user_agent && (
                <div className="mb-4 text-[9px] p-2 rounded bg-black/5 dark:bg-black/25 text-gray-400 font-mono border border-[var(--border)] leading-relaxed">
                  <strong>User Agent:</strong> {selectedLog.user_agent}
                </div>
              )}

              {/* JSON Payload Display */}
              <div className="flex flex-col font-sans">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 pl-0.5">
                  {isRtl ? "البيانات المشفرة والمحفوظة (JSON Payloads)" : "Compliant Transaction Log (JSON)"}
                </span>
                <div className="h-48 overflow-y-auto rounded-lg bg-black text-[11px] text-accent font-mono p-4 border border-zinc-900 leading-loose scroll-smooth scrollbar-thin">
                  <pre className="whitespace-pre-wrap select-text">
                    {JSON.stringify(typeof selectedLog.details === "string" ? JSON.parse(selectedLog.details) : selectedLog.details, null, 2)}
                  </pre>
                </div>
              </div>

              {/* Footer disclaimer */}
              <p className="text-[9px] text-gray-400 mt-4 leading-relaxed font-sans italic opacity-60">
                {isRtl 
                  ? "ملاحظة التوافق: تم إلحاق وحفظ السجل أعلاه في بيئة معزولة أمنياً وغير قابلة للتعديل أو الحذف لضمان نزاهة عمليات المنصة والامتثال الدولي."
                  : "Compliance Notice: This secure append-only audit log is recorded into a strictly cryptographic sandboxed database table and cannot be overridden, fulfilling absolute platform accountability. "
                }
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Action Confirmation Modal */}
      {confirmModal && confirmModal.isOpen && (
        <ActionConfirmationModal
          isOpen={confirmModal.isOpen}
          onClose={() => setConfirmModal(null)}
          onConfirm={confirmModal.onConfirm}
          title={confirmModal.title}
          description={confirmModal.description}
          variant={confirmModal.variant}
          confirmLabel={confirmModal.confirmLabel}
        />
      )}
    </div>
  );
};


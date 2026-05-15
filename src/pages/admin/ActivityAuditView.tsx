import React, { useState, useEffect } from "react";
import { 
  Clock, Trash2, Zap, Settings, RefreshCw, CheckCircle, AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAppContext } from "../../context/AppContext";
import { getTimeAgo } from "../../utils/timeAgo";
import { ActivityLog } from "../../types/admin.types";

export const ActivityAuditView = ({
  theme,
  t,
  dir,
}: {
  theme: string;
  t: (key: string, replacements?: any) => string;
  dir: string;
}) => {
  const { token, language, socket, setIsOperationPending } = useAppContext();
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedActivityIds, setSelectedActivityIds] = useState<string[]>([]);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchActivity = async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/admin/activity-stream", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setActivity(await res.json());
    } catch (err) {
      console.error("Fetch activity failed", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchActivity();

    if (socket) {
      const handleNewActivity = (log: any) => {
        setActivity((prev) => [log, ...prev].slice(0, 100));
      };
      socket.on("new_system_activity", handleNewActivity);
      socket.on("new_ai_log", handleNewActivity);
      return () => {
        socket.off("new_system_activity", handleNewActivity);
        socket.off("new_ai_log", handleNewActivity);
      };
    }
  }, [token, socket]);

  const handleDeleteActivity = async (id: string, type: string) => {
    if (!token || !window.confirm(t("deleteLogConfirm"))) return;
    try {
      const res = await fetch(`/api/admin/activity/${id}/${type}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setActivity(prev => prev.filter(a => a.id !== id || a.type !== type));
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  const handleBulkDeleteActivity = async (type: string) => {
    if (!token || !window.confirm(t("bulkDeleteActivityConfirm"))) return;
    try {
      const res = await fetch(`/api/admin/activity/all/${type}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        if (type === "all") setActivity([]);
        else setActivity(prev => prev.filter(a => a.type !== type));
        showToast(t("activityCleared"), "success");
      }
    } catch (err) {
      console.error("Bulk delete failed", err);
    }
  };

  const handleBatchDelete = async () => {
    if (!token || selectedActivityIds.length === 0 || !window.confirm(t("batchDeleteConfirm").replace("{count}", selectedActivityIds.length.toString()))) return;
    try {
      const res = await fetch("/api/admin/activity/batch-delete", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids: selectedActivityIds, type: "activity" }),
      });
      if (res.ok) {
        setActivity(prev => prev.filter(a => !selectedActivityIds.includes(a.id)));
        setSelectedActivityIds([]);
        showToast(t("batchDeleteSuccess").replace("{count}", selectedActivityIds.length.toString()), "success");
      }
    } catch (err) {
      console.error("Batch delete failed", err);
    }
  };

  const handleSelectAll = () => {
    if (selectedActivityIds.length === activity.length) {
      setSelectedActivityIds([]);
    } else {
      setSelectedActivityIds(activity.map(a => a.id));
    }
  };

  return (
    <div className="space-y-6">
       <div className={`p-6 rounded-[4px] border border-[var(--border-main)] bg-[var(--bg-secondary)] shadow-sm`}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Clock className="text-emerald-500" size={20} />
              <h2 className="text-lg font-bold">{t("activityStream")}</h2>
              {activity.length > 0 && (
                <div className="flex items-center gap-2 bg-[var(--bg-overlay)] px-2 py-1 rounded-[4px] border border-[var(--border-main)]">
                  <input
                    type="checkbox"
                    checked={activity.length > 0 && selectedActivityIds.length === activity.length}
                    onChange={handleSelectAll}
                    className="w-3.5 h-3.5 rounded border-[var(--border)] text-emerald-500 focus:ring-emerald-500 cursor-pointer accent-emerald-500"
                  />
                  <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-tighter">
                    {t("selectAll") || "الكل"}
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <AnimatePresence>
                {selectedActivityIds.length > 0 && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.9, x: 20 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.9, x: 20 }}
                    onClick={handleBatchDelete}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] bg-red-500 text-white text-[10px] font-bold uppercase tracking-wider hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 active:scale-95"
                  >
                    <Trash2 size={12} />
                    {t("deleteSelected")} ({selectedActivityIds.length})
                  </motion.button>
                )}
              </AnimatePresence>
              <button
                onClick={() => handleBulkDeleteActivity("ai_generation")}
                className="text-[var(--text-muted)] hover:text-emerald-500 transition-all p-1.5 hover:bg-emerald-500/5 rounded-[4px]"
                title={t("clearAILogs")}
              >
                <Zap size={14} />
              </button>
              <button
                onClick={() => handleBulkDeleteActivity("all")}
                className="text-[var(--text-muted)] hover:text-red-500 transition-all p-1.5 hover:bg-red-500/5 rounded-[4px]"
                title={t("clearAll")}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          <div className="space-y-4 max-h-[600px] overflow-y-auto px-1 custom-scrollbar">
            {activity.map((log, idx) => {
              const isSelected = selectedActivityIds.includes(log.id);
              return (
                <div
                  key={idx}
                  className={`flex items-start gap-3 group p-2 rounded-[4px] transition-all border border-transparent ${isSelected ? "bg-emerald-500/5 border-emerald-500/20" : "hover:bg-gray-500/5"}`}
                >
                  <div className="pt-1 select-none">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {
                        setSelectedActivityIds((prev) =>
                          prev.includes(log.id)
                            ? prev.filter((id) => id !== log.id)
                            : [...prev, log.id],
                        );
                      }}
                      className="w-4 h-4 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500 cursor-pointer accent-emerald-500"
                    />
                  </div>
                  <div className={`mt-0.5 p-1.5 rounded-[4px] shrink-0 ${log.type === "ai_generation" ? "bg-blue-500/20 text-blue-500" : "bg-emerald-500/20 text-emerald-500"}`}>
                    {log.type === "ai_generation" ? <Zap size={14} /> : <Settings size={14} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] leading-snug truncate">
                      <span className="text-emerald-500 font-bold">{log.user_name || t("systemUser")}</span> {log.action}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">
                      {getTimeAgo(log.created_at)} {log.detail ? `• ${log.detail}` : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteActivity(log.id, log.type)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
      </div>
    </div>
  );
};

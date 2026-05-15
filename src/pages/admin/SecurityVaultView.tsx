import React, { useState, useEffect } from "react";
import { 
  ShieldAlert, Trash2, Trash, AlertCircle, RefreshCw, CheckCircle, 
  Settings2, Database, BellRing, Shield
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAppContext } from "../../context/AppContext";
import { getTimeAgo } from "../../utils/timeAgo";
import { SecurityAlert } from "../../types/admin.types";

export const SecurityVaultView = ({
  theme,
  t,
  dir,
}: {
  theme: string;
  t: (key: string, replacements?: any) => string;
  dir: string;
}) => {
  const { token, language, setIsOperationPending } = useAppContext();
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlertIds, setSelectedAlertIds] = useState<string[]>([]);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchAlerts = async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/admin/security-alerts", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setAlerts(await res.json());
    } catch (err) {
      console.error("Fetch alerts failed", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [token]);

  const handleDeleteAlert = async (id: string) => {
    if (!token || !window.confirm(t("deleteAlertConfirm"))) return;
    try {
      const res = await fetch(`/api/admin/security-alerts/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setAlerts(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      console.error("Delete alert failed", err);
    }
  };

  const handleBulkDeleteAlerts = async () => {
    if (!token || !window.confirm(t("bulkDeleteAlertsConfirm"))) return;
    try {
      const res = await fetch("/api/admin/activity/all/alert", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setAlerts([]);
        showToast(t("alertsCleared"), "success");
      }
    } catch (err) {
      console.error("Bulk delete failed", err);
    }
  };

  const handleBatchDelete = async () => {
    if (!token || selectedAlertIds.length === 0 || !window.confirm(t("batchDeleteConfirm").replace("{count}", selectedAlertIds.length.toString()))) return;
    try {
      const res = await fetch("/api/admin/activity/batch-delete", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids: selectedAlertIds, type: "alert" }),
      });
      if (res.ok) {
        setAlerts(prev => prev.filter(a => !selectedAlertIds.includes(a.id)));
        setSelectedAlertIds([]);
        showToast(t("batchDeleteSuccess").replace("{count}", selectedAlertIds.length.toString()), "success");
      }
    } catch (err) {
      console.error("Batch delete failed", err);
    }
  };

  const handleSelectAll = () => {
    if (selectedAlertIds.length === alerts.length) {
      setSelectedAlertIds([]);
    } else {
      setSelectedAlertIds(alerts.map(a => a.id));
    }
  };

  return (
    <div className="space-y-6">
      <div className={`p-6 rounded-[4px] border border-[var(--border-main)] bg-[var(--bg-secondary)] shadow-sm shadow-red-500/5`}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <ShieldAlert className="text-red-500" size={20} />
              <h2 className="text-lg font-bold text-red-600 dark:text-red-400">
                {t("securityAlerts")}
              </h2>
              {alerts.length > 0 && (
                <div className="flex items-center gap-2 bg-red-500/5 px-2 py-1 rounded-[4px] border border-red-500/10">
                  <input
                    type="checkbox"
                    checked={alerts.length > 0 && selectedAlertIds.length === alerts.length}
                    onChange={handleSelectAll}
                    className="w-3.5 h-3.5 rounded border-gray-300 text-red-500 focus:ring-red-500 cursor-pointer accent-red-500"
                  />
                  <span className="text-[9px] font-bold text-red-500 uppercase tracking-tighter">
                    {t("selectAll") || "الكل"}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <AnimatePresence>
                {selectedAlertIds.length > 0 && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.9, x: 20 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.9, x: 20 }}
                    onClick={handleBatchDelete}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] bg-red-600 text-white text-[10px] font-bold uppercase tracking-wider hover:bg-red-700 transition-all shadow-lg shadow-red-600/20 active:scale-95"
                  >
                    <Trash2 size={12} />
                    {t("deleteSelected")} ({selectedAlertIds.length})
                  </motion.button>
                )}
              </AnimatePresence>

              <div className="w-px h-4 bg-gray-200 dark:bg-gray-800 mx-1" />

              <button
                onClick={handleBulkDeleteAlerts}
                className="text-gray-400 hover:text-red-500 transition-all p-1.5 hover:bg-red-500/5 rounded-[4px] border border-transparent hover:border-red-500/10"
                title={t("clearAll")}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>

          <div className="space-y-4 max-h-[500px] overflow-y-auto px-1 custom-scrollbar">
            {alerts.map((alert, idx) => {
              const isSelected = selectedAlertIds.includes(alert.id);
              return (
                <div
                  key={idx}
                  className={`flex items-start gap-3 group p-2 rounded-[4px] transition-all border border-transparent ${isSelected ? "bg-red-500/5 border-red-500/20" : "hover:bg-gray-500/5"}`}
                >
                  <div className="pt-1 select-none">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {
                        setSelectedAlertIds((prev) =>
                          prev.includes(alert.id)
                            ? prev.filter((id) => id !== alert.id)
                            : [...prev, alert.id],
                        );
                      }}
                      className="w-4 h-4 rounded border-gray-300 text-red-500 focus:ring-red-500 cursor-pointer accent-red-500"
                    />
                  </div>
                  <div className={`mt-0.5 p-1.5 rounded-[4px] shrink-0 ${
                      alert.severity === "high" || alert.severity === "critical"
                        ? "bg-red-500/20 text-red-500"
                        : "bg-amber-500/20 text-amber-500"
                    }`}>
                    <ShieldAlert size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 leading-snug">
                       {alert.description}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {getTimeAgo(alert.created_at)} •{" "}
                      <span className="font-bold">
                        {alert.user_name || t("systemUser")}
                      </span>
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteAlert(alert.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all font-bold"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
            {alerts.length === 0 && (
              <p className="text-sm text-gray-500 italic text-center py-10">
                {t("noSecurityAlerts")}
              </p>
            )}
          </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from "react";
import { 
  Database, RefreshCw, Save, Search, Download, Trash2, 
  CheckCircle, AlertCircle, Info, HardDrive, ShieldCheck
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAppContext } from "../../context/AppContext";

export const DatabaseOrchestrationView = ({
  theme,
  t,
  dir,
  language,
}: {
  theme: string;
  t: (key: string, replacements?: any) => string;
  dir: string;
  language: string;
}) => {
  const { token, setIsOperationPending } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [tables, setTables] = useState<any[]>([]);

  const fetchTables = async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/admin/databases/tables", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setTables(await res.json());
      }
    } catch (err) {
      console.error("Error fetching tables:", err);
    }
  };

  useEffect(() => {
    fetchTables();
  }, [token]);

  const handleBackup = async () => {
    if (!token) return;
    setIsSyncing(true);
    setIsOperationPending(true);
    try {
      window.location.href = `/api/admin/databases/export?token=${token}`;
    } catch (err) {
      console.error("Backup failed:", err);
    } finally {
      setTimeout(() => {
        setIsSyncing(false);
        setIsOperationPending(false);
      }, 2000);
    }
  };

  const handleRestore = async () => {
    if (!token || !window.confirm(t("restoreConfirm"))) return;
    setIsSyncing(true);
    setIsOperationPending(true);
    try {
      const res = await fetch("/api/admin/databases/restore", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        await fetchTables();
        alert(t("restoreSuccess"));
      }
    } catch (err) {
      console.error("Restore failed:", err);
    } finally {
      setIsSyncing(false);
      setIsOperationPending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className={`p-6 rounded-[4px] border ${theme === "dark" ? "bg-[#111111] border-gray-800/60" : "bg-white border-gray-100"}`}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-[4px] bg-blue-500/10 text-blue-500">
                <Database size={20} />
              </div>
              <div>
                <h3 className="font-bold text-lg uppercase tracking-tight">PostgreSQL Core</h3>
                <p className="text-[10px] font-black text-gray-500 uppercase">Operational Cluster</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black text-emerald-500 uppercase">Active</span>
            </div>
          </div>

          <div className="space-y-3">
             <button
              onClick={handleBackup}
              disabled={isSyncing}
              className="w-full flex items-center justify-between p-4 rounded-[4px] bg-emerald-500/5 border border-emerald-500/20 hover:bg-emerald-500/10 transition-all group"
            >
              <div className="flex items-center gap-3">
                <Download size={18} className="text-emerald-500" />
                <span className="font-bold text-sm">{t("exportSchema")}</span>
              </div>
              <RefreshCw size={14} className={`text-emerald-500/40 group-hover:rotate-180 transition-all duration-700 ${isSyncing ? "animate-spin" : ""}`} />
            </button>

            <button
              onClick={handleRestore}
              disabled={isSyncing}
              className="w-full flex items-center justify-between p-4 rounded-[4px] bg-red-500/5 border border-red-500/20 hover:bg-red-500/10 transition-all group"
            >
              <div className="flex items-center gap-3">
                <ShieldCheck size={18} className="text-red-500" />
                <span className="font-bold text-sm">{t("restoreSchema")}</span>
              </div>
              <RefreshCw size={14} className={`text-red-500/40 group-hover:rotate-180 transition-all duration-700 ${isSyncing ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        <div className={`p-6 rounded-[4px] border ${theme === "dark" ? "bg-[#111111] border-gray-800/60" : "bg-white border-gray-100"}`}>
           <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-[4px] bg-purple-500/10 text-purple-500">
                <HardDrive size={20} />
              </div>
              <div>
                <h3 className="font-bold text-lg uppercase tracking-tight">Active Schemas</h3>
                <p className="text-[10px] font-black text-gray-500 uppercase">Architecture Audit</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {tables.map((table, idx) => (
              <div key={idx} className="p-3 rounded-[4px] border border-gray-800/40 bg-gray-500/5 flex items-center justify-between">
                <span className="text-xs font-mono text-gray-400">{table.table_name}</span>
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/30" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

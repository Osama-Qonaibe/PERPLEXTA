import React, { useState, useEffect } from "react";
import { 
  Database, Landmark, CheckCircle, AlertCircle, 
  RefreshCw, PlayCircle, Trash2, Download, Upload,
  Eye, EyeOff, ShieldCheck, Activity, Save
} from "lucide-react";
import { motion } from "motion/react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useSocket } from "../../context/SocketContext";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { toast } from "../../components/ui/Toast";

export const DatabaseOrchestration: React.FC = () => {
  const { token } = useAuth();
  const { theme, t, dir, language } = useTheme();
  const { socket } = useSocket();
  const [databases, setDatabases] = useState<any[]>([]);
  const [isMigrating, setIsMigrating] = useState<{
    id: string;
    type: string;
  } | null>(null);

  const fetchDatabases = async () => {
    try {
      const response = await fetch("/api/admin/databases/registry", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setDatabases(
          data.map((db: any) => ({
            ...db,
            titleKey: `${db.provider}DbTitle`,
            descKey: `${db.provider.includes("shadow") ? "shadow" : "primary"}DbDesc`,
            icon: db.provider.includes("core") ? Database : Landmark,
            color: db.provider.includes("shadow") ? "teal" : db.provider.includes("core") ? "blue" : "amber",
            isTesting: false,
            showPassword: false,
          })),
        );
      }
    } catch (error) {
      console.error("Error fetching database registry:", error);
    }
  };

  useEffect(() => {
    if (token) fetchDatabases();

    if (socket) {
      socket.on("db_alert", (data) => {
        fetchDatabases();
        toast.error(`⚠️ Alert: Database ${data.provider} is ${data.status}!`);
      });
    }

    return () => {
      if (socket) socket.off("db_alert");
    };
  }, [token, socket]);

  const handleTestConnection = async (id: string) => {
    const db = databases.find((d) => d.id === id);
    if (!db) return;

    setDatabases((dbs) => dbs.map((d) => (d.id === id ? { ...d, isTesting: true } : d)));

    try {
      const res = await fetch("/api/admin/databases/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id, type: db.type, config: db }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setDatabases((dbs) => dbs.map((d) => d.id === id ? { ...d, isTesting: false, status: "healthy" } : d));
        toast.success(t("dbTestSuccess") || "Connection successful!");
      } else {
        setDatabases((dbs) => dbs.map((d) => d.id === id ? { ...d, isTesting: false, status: "error" } : d));
        toast.error(data.error || t("dbTestFailed") || "Connection failed");
      }
    } catch (error) {
      setDatabases((dbs) => dbs.map((d) => d.id === id ? { ...d, isTesting: false, status: "error" } : d));
      toast.error(t("dbTestError") || "Connection error");
    }
  };

  const handleSaveConfig = async (id: string) => {
    const db = databases.find((d) => d.id === id);
    if (!db) return;

    try {
      const res = await fetch("/api/admin/databases/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: db.id,
          config: {
            provider: db.provider,
            type: db.type,
            host: db.host || null,
            port: db.port || null,
            dbName: db.db_name || db.dbName || null,
            username: db.username || null,
            password: db.password || null,
            connectionString: db.connection_string || db.connectionString || null,
            sslMode: db.ssl_mode || db.sslMode || null,
            poolSize: db.pool_size || db.poolSize || 10,
          },
          activate: db.is_active || false,
        }),
      });

      if (res.ok) {
        toast.success(t("dbSaveSuccess") || "Configuration saved successfully");
        fetchDatabases();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to save configuration");
      }
    } catch (error) {
      toast.error("Error saving configuration");
    }
  };

  const handleActivateDatabase = async (id: string, currentStatus: boolean) => {
    try {
      const db = databases.find((d) => d.id === id);
      if (!db) return;

      const res = await fetch("/api/admin/databases/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: db.id,
          config: {
            provider: db.provider,
            type: db.type,
            host: db.host || null,
            port: db.port || null,
            dbName: db.db_name || db.dbName || null,
            username: db.username || null,
            password: db.password || null,
            connectionString: db.connection_string || db.connectionString || null,
            sslMode: db.ssl_mode || db.sslMode || null,
            poolSize: db.pool_size || db.poolSize || 10,
          },
          activate: !currentStatus,
        }),
      });

      if (res.ok) {
        toast.success(!currentStatus ? t("dbActivateSuccess") || "Database activated!" : t("dbDeactivateSuccess") || "Database deactivated!");
        fetchDatabases();
      } else {
        const data = await res.json();
        toast.error(data.error || "Operation failed");
      }
    } catch (error) {
      toast.error("Connection error");
    }
  };

  const handleRunMigrations = async (id: string, type: "scratch" | "additive") => {
    if (type === "scratch" && !window.confirm(dir === "rtl" ? "⚠️ تحذير: هذا الإجراء سيقوم بحذف كافة البيانات وإعادة بناء المخطط من الصفر. هل تريد الاستمرار؟" : "⚠️ WARNING: This will wipe all data and rebuild the schema from scratch. Continue?")) {
      return;
    }

    setIsMigrating({ id, type });
    try {
      const res = await fetch("/api/admin/databases/migrate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id, type }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(t("dbMigrationSuccess") || "Migrations completed successfully");
        fetchDatabases();
      } else {
        toast.error(data.error || t("dbMigrationFailed") || "Failed to run migrations");
      }
    } catch (error) {
      toast.error(t("dbMigrationError") || "Error running migrations");
    } finally {
      setIsMigrating(null);
    }
  };

  const handleExportBackup = async (dbId: string) => {
    try {
      const db = databases.find((d) => d.id === dbId);
      if (!db) return;

      const targetType = db.id.includes("ledger") ? "ledger" : "core";
      const dbName = db.db_name || db.dbName || targetType;
      const displayLabel = dbName.replace(/[^a-z0-9_-]/gi, "_").toLowerCase();
      const filename = `${displayLabel}_backup_${new Date().toISOString().split("T")[0]}.json`;

      toast.success(dir === "rtl" ? `جاري تصدير نسخة احتياطية: ${dbName}...` : `Exporting backup: ${dbName}...`);

      const res = await fetch(`/api/admin/databases/export?type=${targetType}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Export failed");

      const backupData = await res.json();
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.success(dir === "rtl" ? "تم تصدير النسخة بنجاح" : "Backup exported successfully");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleImportBackup = async (dbId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const db = databases.find((d) => d.id === dbId);
    if (!db) return;

    const targetType = db.id.includes("ledger") ? "ledger" : "core";
    const dbName = db.db_name || db.dbName || targetType;

    if (!window.confirm(dir === "rtl" ? `⚠️ تحذير شديد: استعادة النسخة إلى (${dbName}) سيؤدي لمسح كافة البيانات الحالية بشكل نهائي واستبدالها بالنسخة. هل أنت متأكد تماماً؟` : `⚠️ CRITICAL WARNING: Restoring backup to (${dbName}) will PERMANENTLY WIPE all current data and replace it with the backup content. Are you absolutely sure?`)) {
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const backup = JSON.parse(e.target?.result as string);
        if (backup.type !== targetType) {
          toast.error(dir === "rtl" ? `نوع النسخة (${backup.type}) لا يتطابق` : `Type (${backup.type}) mismatch`);
          return;
        }

        toast.success(dir === "rtl" ? "جاري استعادة البيانات..." : "Restoring data...");
        const res = await fetch("/api/admin/databases/import", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ backup, targetType }),
        });

        if (res.ok) {
          toast.success(dir === "rtl" ? "تمت الاستعادة بنجاح" : "Restored successfully");
          fetchDatabases();
        } else {
          toast.error("Import failed");
        }
      } catch (err) {
        toast.error("Invalid file");
      } finally {
        event.target.value = "";
      }
    };
    reader.readAsText(file);
  };

  const handleChange = (id: string, field: string, value: string | boolean) => {
    setDatabases((dbs) => dbs.map((db) => (db.id === id ? { ...db, [field]: value } : db)));
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {databases.map((db) => {
          const Icon = db.icon;
          return (
            <Card key={db.id} className="p-5 flex flex-col gap-4 bg-[var(--bg-secondary)] border-[var(--border-main)] hover:border-emerald-500/20">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-[var(--radius)] bg-[var(--bg-primary)] text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]">
                    <Icon size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                       {t(db.titleKey)}
                       <span className="px-1.5 py-0.5 rounded-[4px] bg-gray-500/10 text-gray-500 text-[8px] font-black uppercase border border-gray-500/20">
                         {db.provider.includes("shadow") ? "Redundant" : "Primary"}
                       </span>
                    </h3>
                    <p className="text-[10px] text-gray-500 font-medium uppercase tracking-widest">{db.type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                   <div className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${db.status === "healthy" ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"}`}>
                      {db.status === "healthy" ? t("statusActive") : t("statusError")}
                   </div>
                   <div className={`w-2 h-2 rounded-full ${db.is_active ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,1)]" : "bg-gray-400"}`} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-2">
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{t("dbHost")}</label>
                    <input type="text" value={db.host || ""} onChange={(e) => handleChange(db.id, "host", e.target.value)} className="w-full bg-[var(--bg-primary)] border border-[var(--border-main)] rounded-[4px] px-3 py-2 text-xs text-white" />
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{t("dbPort")}</label>
                    <input type="number" value={db.port || ""} onChange={(e) => handleChange(db.id, "port", e.target.value)} className="w-full bg-[var(--bg-primary)] border border-[var(--border-main)] rounded-[4px] px-3 py-2 text-xs text-white" />
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{t("dbName")}</label>
                    <input type="text" value={db.db_name || db.dbName || ""} onChange={(e) => handleChange(db.id, "db_name", e.target.value)} className="w-full bg-[var(--bg-primary)] border border-[var(--border-main)] rounded-[4px] px-3 py-2 text-xs text-white" />
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{t("dbUser")}</label>
                    <input type="text" value={db.username || ""} onChange={(e) => handleChange(db.id, "username", e.target.value)} className="w-full bg-[var(--bg-primary)] border border-[var(--border-main)] rounded-[4px] px-3 py-2 text-xs text-white" />
                 </div>
              </div>

              <div className="space-y-1.5">
                 <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{t("dbPass")}</label>
                 <div className="relative">
                    <input type={db.showPassword ? "text" : "password"} value={db.password || ""} onChange={(e) => handleChange(db.id, "password", e.target.value)} className="w-full bg-[var(--bg-primary)] border border-[var(--border-main)] rounded-[4px] px-3 py-2 text-xs text-white pr-10" />
                    <button onClick={() => handleChange(db.id, "showPassword", !db.showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-all">
                       {db.showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                 </div>
              </div>

              <div className="mt-4 flex flex-col gap-3">
                 <div className="flex gap-2">
                    <Button variant="ghost" className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest border-emerald-500/20 text-emerald-500" onClick={() => handleTestConnection(db.id)} disabled={db.isTesting}>
                       {db.isTesting ? <RefreshCw size={14} className="animate-spin mr-2" /> : <PlayCircle size={14} className="mr-2" />}
                       {t("testConnection")}
                    </Button>
                    <Button variant="primary" className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest" onClick={() => handleSaveConfig(db.id)}>
                       <Save size={14} className="mr-2" /> {t("saveConfig")}
                    </Button>
                 </div>

                 <div className="flex gap-2">
                    <Button variant={db.is_active ? "danger" : "primary"} className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest" onClick={() => handleActivateDatabase(db.id, db.is_active)}>
                       {db.is_active ? t("deactivate") : t("activate")}
                    </Button>
                    <div className="flex-1 flex gap-2">
                       <Button variant="ghost" className="flex-1 text-[10px] p-0" title={t("exportBackup")} onClick={() => handleExportBackup(db.id)}>
                          <Download size={14} />
                       </Button>
                       <label className="flex-1">
                          <input type="file" accept=".json" className="hidden" onChange={(e) => handleImportBackup(db.id, e)} />
                          <div className="h-full flex items-center justify-center rounded-[var(--radius)] border border-[var(--border)] cursor-pointer hover:bg-white/5 transition-all">
                             <Upload size={14} />
                          </div>
                       </label>
                    </div>
                 </div>

                 <div className="flex gap-2 border-t border-[var(--border-main)] pt-3">
                    <Button variant="ghost" className="flex-1 text-[9px] font-bold uppercase py-2 border-amber-500/20 text-amber-500" onClick={() => handleRunMigrations(db.id, "additive")}>
                       <ShieldCheck size={12} className="mr-1" /> {t("runMigrations")}
                    </Button>
                    <Button variant="danger" className="flex-1 text-[9px] font-bold uppercase py-2" onClick={() => handleRunMigrations(db.id, "scratch")}>
                       <Trash2 size={12} className="mr-1" /> {t("wipeAndBuild")}
                    </Button>
                 </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

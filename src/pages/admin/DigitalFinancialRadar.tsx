import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { 
  Landmark, ArrowRightLeft, History, Zap, Search, 
  RefreshCw, Shield, AlertCircle, CheckCircle, X,
  ShieldAlert, ShieldCheck, CheckCircle2, TrendingUp,
  Trash2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useSocket } from "../../context/SocketContext";

interface DigitalFinancialRadarProps {}

export const DigitalFinancialRadar: React.FC<DigitalFinancialRadarProps> = () => {
  const { theme, t } = useTheme();
  const { token } = useAuth();
  const { language, dir } = useTheme();
  const { socket } = useSocket();
  const [financials, setFinancials] = useState<any[]>([]);
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<string[]>([]);
  const [radarStats, setRadarStats] = useState<any>({
    total_liquidity: 0,
    transaction_count: 0,
    volume_24h: 0,
    health_score: 100,
  });
  const [walletDiagnostics, setWalletDiagnostics] = useState<any[]>([]);
  const [walletAlerts, setWalletAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [financeRes, diagRes, alertsRes] = await Promise.all([
        fetch("/api/admin/financial-radar", { headers }),
        fetch("/api/admin/wallet-diagnostics", { headers }),
        fetch("/api/admin/wallet-alerts", { headers }),
      ]);

      if (financeRes.ok) {
        const data = await financeRes.json();
        setFinancials(data.transactions || []);
        if (data.stats) setRadarStats(data.stats);
      }
      if (diagRes.ok) setWalletDiagnostics(await diagRes.json());
      if (alertsRes.ok) setWalletAlerts(await alertsRes.json());
    } catch (error) {
      console.error("Error fetching radar data:", error);
    } finally {
      setTimeout(() => setLoading(false), 800);
    }
  };

  useEffect(() => {
    if (token) fetchData();

    if (socket) {
      const handleNewTransaction = (tx: any) => {
        setFinancials((prev) => [tx, ...prev].slice(0, 100));
      };
      socket.on("new_financial_transaction", handleNewTransaction);
      return () => {
        socket.off("new_financial_transaction", handleNewTransaction);
      };
    }
  }, [token, socket]);

  const handleBatchDelete = async () => {
    if (
      !token ||
      selectedTransactionIds.length === 0 ||
      !window.confirm(
        t("batchDeleteConfirm").replace(
          "{count}",
          selectedTransactionIds.length.toString(),
        ),
      )
    )
      return;

    try {
      const res = await fetch("/api/admin/activity/batch-delete", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ids: selectedTransactionIds,
          type: "financial",
        }),
      });

      if (res.ok) {
        setFinancials((prev) =>
          prev.filter((tx) => !selectedTransactionIds.includes(tx.id)),
        );
        showToast(
          t("batchDeleteSuccess").replace(
            "{count}",
            selectedTransactionIds.length.toString(),
          ),
          "success",
        );
        setSelectedTransactionIds([]);
        fetchData(); // Refresh stats
      }
    } catch (err) {
      console.error("Batch delete failed", err);
    }
  };

  const handleBulkPurge = async () => {
    if (
      !token ||
      !window.confirm(
        language === "ar"
          ? "هل أنت متأكد من تطهير كافة سجلات العمليات؟ هذا الإجراء نهائي."
          : "Are you sure you want to purge ALL transaction logs? This action is irreversible.",
      )
    )
      return;

    try {
      const res = await fetch("/api/admin/financial/all", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setFinancials([]);
        showToast(t("activityCleared"), "success");
        fetchData();
      }
    } catch (err) {
      console.error("Purge failed", err);
    }
  };

  const handleSelectAll = () => {
    if (selectedTransactionIds.length === filteredFinancials.length) {
      setSelectedTransactionIds([]);
    } else {
      setSelectedTransactionIds(filteredFinancials.map((tx) => tx.id));
    }
  };

  const handleReconcile = async (userId: string) => {
    if (
      !token ||
      !window.confirm(
        "Start wallet reconciliation? This will recalibrate user balance based strictly on ledger transactions.",
      )
    )
      return;
    try {
      const res = await fetch(`/api/admin/reconcile-wallet/${userId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error("Reconciliation failed", err);
    }
  };

  const getTimeAgo = (date: string) => {
    const seconds = Math.floor(
      (new Date().getTime() - new Date(date).getTime()) / 1000,
    );
    if (seconds < 60) return t("justNow");
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return t("minutesAgo").replace("{n}", minutes.toString());
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t("hoursAgo").replace("{n}", hours.toString());
    return new Date(date).toLocaleDateString(
      language === "ar" ? "ar-EG" : "en-US",
    );
  };

  const filteredFinancials = React.useMemo(() => {
    if (!search.trim()) return financials;
    const term = search.toLowerCase();
    return financials.filter(
      (tx) =>
        tx.user_name?.toLowerCase().includes(term) ||
        tx.description?.toLowerCase().includes(term) ||
        tx.transaction_type?.toLowerCase().includes(term) ||
        tx.amount?.toString().includes(term),
    );
  }, [financials, search]);

  const handleDeleteAlert = async (alert: any) => {
    if (!token || !window.confirm(t("deleteAlert"))) return;
    try {
      if (alert.alert_type === "kyc_request") {
        setWalletAlerts((prev) =>
          prev.filter(
            (a) =>
              !(a.user_id === alert.user_id && a.alert_type === "kyc_request"),
          ),
        );
        return;
      }

      const res = await fetch(`/api/admin/ledger-transactions/${alert.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setWalletAlerts((prev) => prev.filter((a) => a.id !== alert.id));
      }
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`px-3 py-2 rounded-[4px] border border-[var(--border-main)] bg-[var(--bg-secondary)] flex items-center gap-2 transition-all duration-300`}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,1)]" />
            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-tighter">
              Live Monitor
            </span>
          </div>
          <AnimatePresence>
            {selectedTransactionIds.length > 0 && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9, x: -20 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.9, x: -20 }}
                onClick={handleBatchDelete}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-wider hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
              >
                <Trash2 size={12} />
                {t("deleteSelected")} ({selectedTransactionIds.length})
              </motion.button>
            )}
          </AnimatePresence>
          <button
            onClick={handleBulkPurge}
            className="p-1.5 rounded-[4px] text-red-500/40 hover:text-red-500 hover:bg-red-500/10 transition-all"
            title={t("clearAll")}
          >
            <Shield size={16} />
          </button>
        </div>
        <div
          className={`flex items-center gap-3 ${dir === "rtl" ? "flex-row-reverse" : "flex-row"}`}
        >
          <div className="relative group">
            <Search
              className={`absolute ${dir === "rtl" ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 transition-all duration-300 ${search ? "text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]" : "text-gray-400"}`}
              size={18}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                t("searchTxPlaceholder") ||
                (language === "ar"
                  ? "بحث في السجلات الفنية..."
                  : "Search financial records...")
              }
              className={`w-full md:w-80 ${dir === "rtl" ? "pr-10 pl-4" : "pl-10 pr-4"} py-2.5 rounded-[4px] border text-sm font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 bg-[var(--bg-overlay)] border-[var(--border-main)] focus:border-emerald-500/50 text-[var(--text-primary)] placeholder:text-[var(--text-muted)]`}
            />
          </div>
          <button
            onClick={fetchData}
            title={language === "ar" ? "تحديث السجل" : "Refresh Log"}
            className={`w-10 h-10 flex items-center justify-center rounded-[4px] border transition-all duration-300 group ${
              loading
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500"
                : "bg-[#1a1a1c]/40 border-gray-800/60 text-gray-400 hover:border-emerald-500/50 hover:bg-emerald-500/5 hover:text-emerald-500"
            }`}
          >
            <RefreshCw
              size={20}
              className={`${loading ? "animate-spin" : "group-hover:rotate-180"} transition-all duration-700 ${loading || search ? "drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]" : ""}`}
            />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8 mt-2">
        <div
          className={`p-5 rounded-[4px] border border-[var(--border-main)] bg-[var(--bg-secondary)] transition-all duration-300 hover:shadow-md`}
        >
          <div className="flex justify-between items-start mb-4">
            <div
              className={`p-2.5 rounded-[4px] bg-[var(--bg-primary)] text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]`}
            >
              <Landmark size={20} />
            </div>
            <span
              className={`text-sm font-medium px-2 py-1 rounded-[4px] bg-emerald-500/10 text-emerald-500`}
            >
              {radarStats?.health_score}%
            </span>
          </div>
          <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">
            {language === "ar" ? "إجمالي السيولة" : "Total Liquidity"}
          </h3>
          <p className="text-2xl font-bold">
            ${radarStats?.total_liquidity?.toLocaleString() || 0}
          </p>
        </div>

        <div
          className={`p-5 rounded-[4px] border border-[var(--border-main)] bg-[var(--bg-secondary)] transition-all duration-300 hover:shadow-md`}
        >
          <div className="flex justify-between items-start mb-4">
            <div
              className={`p-2.5 rounded-[4px] bg-[var(--bg-primary)] text-blue-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.4)]`}
            >
              <ArrowRightLeft size={20} />
            </div>
            <span
              className={`text-sm font-medium px-2 py-1 rounded-[4px] bg-blue-500/10 text-blue-500`}
            >
              +5.2%
            </span>
          </div>
          <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">
            {language === "ar" ? "حجم تداول 24 ساعة" : "24h Volume"}
          </h3>
          <p className="text-2xl font-bold">
            ${radarStats?.volume_24h?.toLocaleString() || 0}
          </p>
        </div>

        <div
          className={`p-5 rounded-[4px] border border-[var(--border-main)] bg-[var(--bg-secondary)] transition-all duration-300 hover:shadow-md`}
        >
          <div className="flex justify-between items-start mb-4">
            <div
              className={`p-2.5 rounded-[4px] bg-[var(--bg-primary)] text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]`}
            >
              <History size={20} />
            </div>
            <span
              className={`text-sm font-medium px-2 py-1 rounded-[4px] bg-amber-500/10 text-amber-500`}
            >
              Live
            </span>
          </div>
          <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">
            {language === "ar" ? "عدد العمليات الكلي" : "Total Transactions"}
          </h3>
          <p className="text-2xl font-bold">
            {radarStats?.transaction_count?.toLocaleString() || 0}
          </p>
        </div>

        <div
          className={`p-5 rounded-[4px] border border-[var(--border-main)] bg-[var(--bg-secondary)] transition-all duration-300 hover:shadow-md`}
        >
          <div className="flex justify-between items-start mb-4">
            <div
              className={`p-2.5 rounded-[4px] bg-[var(--bg-primary)] text-purple-500 drop-shadow-[0_0_8px_rgba(168,85,247,0.4)]`}
            >
              <Zap size={20} />
            </div>
            <span
              className={`text-sm font-medium px-2 py-1 rounded-[4px] bg-purple-500/10 text-purple-500`}
            >
              Syncing
            </span>
          </div>
          <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">
            {language === "ar" ? "سجل العمليات النشط" : "Active Registry"}
          </h3>
          <p className="text-2xl font-bold">{financials.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div
            className={`p-6 rounded-[4px] border border-red-500/20 bg-red-500/5`}
          >
            <h3 className="text-sm font-bold text-red-500 mb-4 flex items-center gap-2 uppercase tracking-widest">
              <AlertCircle size={16} />
              {t("walletAlerts")}
            </h3>
            <div className="space-y-3">
              {walletAlerts.map((alert, idx) => {
                let badgeColor = "bg-red-500/20 text-red-500";
                let typeLabel = t("highValue");

                if (alert.alert_type === "withdrawal_request") {
                  badgeColor = "bg-amber-500/20 text-amber-500";
                  typeLabel = t("withdrawal");
                } else if (alert.alert_type === "kyc_request") {
                  badgeColor = "bg-purple-500/20 text-purple-500";
                  typeLabel = t("kyc");
                }

                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-[4px] border group transition-all bg-[var(--bg-secondary)] border-[var(--border-main)] hover:shadow-md`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-[4px] ${badgeColor}`}
                      >
                        {typeLabel}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-500">
                          {getTimeAgo(alert.created_at)}
                        </span>
                        <button
                          onClick={() => handleDeleteAlert(alert)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all font-bold"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                      {alert.user_name}
                    </p>
                    {alert.alert_type !== "kyc_request" && (
                      <p className="text-xs font-bold text-emerald-500 mt-1">
                        ${(Math.abs(alert.amount) / 100).toFixed(2)}
                      </p>
                    )}
                    {alert.alert_type === "kyc_request" && (
                      <p className="text-[10px] text-amber-500 mt-1 italic">
                        {language === "ar"
                          ? "بانتظار المراجعة"
                          : "Pending Review"}
                      </p>
                    )}
                  </div>
                );
              })}
              {walletAlerts.length === 0 && (
                <p className="text-xs text-gray-500 italic">
                  {t("walletAlertsEmpty")}
                </p>
              )}
            </div>
          </div>

          <div
            className={`p-6 rounded-[4px] border border-amber-500/20 bg-amber-500/5`}
          >
            <h3 className="text-sm font-bold text-amber-600 dark:text-amber-400 mb-4 flex items-center gap-2 uppercase tracking-widest">
              <ShieldAlert size={16} />
              {t("discrepancyAnalysis")}
            </h3>

            <div className="space-y-3">
              {walletDiagnostics.map((diag, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-[4px] border animate-in fade-in slide-in-from-right-5 duration-300 bg-[var(--bg-secondary)] border-[var(--border-main)] shadow-sm`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-[4px] bg-red-500/10 flex items-center justify-center text-red-500 text-xs font-bold uppercase">
                        {diag.user?.name?.substring(0, 2)}
                      </div>
                      <span className="text-sm font-bold">
                        {diag.user?.name}
                      </span>
                    </div>
                    <button
                      onClick={() => handleReconcile(diag.user_id)}
                      className="p-2 hover:bg-emerald-500/10 text-emerald-500 rounded-[4px] transition-all border border-transparent hover:border-emerald-500/30"
                    >
                      <ShieldCheck size={16} />
                    </button>
                  </div>
                  <div className="flex justify-between text-xs py-2 border-t border-gray-800/30 mt-2">
                    <span className="text-gray-500">{t("currentBalance")}</span>
                    <span className="text-red-500 font-black">
                      ${diag.balance}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs pt-1">
                    <span className="text-gray-500">
                      {t("ledgerExpectation")}
                    </span>
                    <span className="text-emerald-500 font-black">
                      ${diag.expected_balance}
                    </span>
                  </div>
                </div>
              ))}
              {walletDiagnostics.length === 0 && (
                <div className="py-10 text-center space-y-2 opacity-50">
                  <CheckCircle2
                    size={32}
                    className="mx-auto text-emerald-500"
                  />
                  <p className="text-xs font-medium text-gray-500">
                    {t("allBalancesSynced")}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div
            className={`p-6 rounded-[4px] border border-[var(--border-main)] bg-[var(--bg-secondary)]`}
          >
            <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-4 flex items-center justify-between uppercase tracking-widest">
              <div className="flex items-center gap-2">
                <Zap size={16} />
                {t("quickVelocity")}
              </div>
              <TrendingUp size={14} className="text-emerald-500" />
            </h3>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 rounded-[4px] bg-emerald-500/5 border border-[var(--border-main)]">
                <p className="text-[10px] uppercase text-[var(--text-secondary)] font-bold mb-1">
                  {t("todayTx")}
                </p>
                <p className="text-xl font-black text-emerald-500">
                  {financials.length}
                </p>
              </div>
              <div className="p-4 rounded-[4px] bg-emerald-500/5 border border-[var(--border-main)]">
                <p className="text-[10px] uppercase text-[var(--text-secondary)] font-bold mb-1">
                  {t("alertLevel")}
                </p>
                <p
                  className={`text-xl font-black ${walletDiagnostics.length > 5 ? "text-red-500" : walletDiagnostics.length > 0 ? "text-amber-500" : "text-emerald-500"}`}
                >
                  {walletDiagnostics.length > 5
                    ? t("critical")
                    : walletDiagnostics.length > 0
                      ? t("warning")
                      : t("secure")}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-end justify-between gap-1 h-12 px-2">
                {[
                  40, 70, 45, 90, 65, 80, 50, 85, 95, 60, 75, 55, 30, 80, 100,
                ].map((h, i) => (
                  <motion.div
                    key={i}
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    transition={{ delay: i * 0.05, duration: 0.5 }}
                    className={`flex-1 rounded-t-sm transition-all duration-300 ${i === 14 ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "bg-gray-800 hover:bg-emerald-500/40"}`}
                  />
                ))}
              </div>
              <div className="flex justify-between text-[9px] font-bold text-gray-600 uppercase tracking-tighter px-1">
                <span>00:00</span>
                <span>REGISTRY VELOCITY INDEX</span>
                <span>NOW</span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div
            className={`rounded-[4px] border overflow-hidden bg-[var(--bg-secondary)] border-[var(--border-main)]`}
          >
            <div className="p-6 border-b border-[var(--border-main)] flex items-center justify-between">
              <h3 className="font-bold flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                {t("liveTransactionRegistry")}
              </h3>
              <span className="text-[10px] font-bold text-gray-500 uppercase">
                {t("showingLast100")}
              </span>
            </div>

            <div className="overflow-x-auto overflow-y-auto max-h-[700px]">
              <table className="w-full text-sm text-left rtl:text-right">
                <thead
                  className={`sticky top-0 z-10 text-[10px] uppercase font-bold transition-all duration-300 ${theme === "dark" ? "bg-[var(--bg-surface)] text-gray-500" : "bg-gray-50 text-gray-400"}`}
                >
                  <tr>
                    <th scope="col" className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={
                          filteredFinancials.length > 0 &&
                          selectedTransactionIds.length ===
                            filteredFinancials.length
                        }
                        onChange={handleSelectAll}
                        className="w-3.5 h-3.5 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500 cursor-pointer accent-emerald-500"
                      />
                    </th>
                    <th scope="col" className="px-6 py-4">
                      {t("entityUser")}
                    </th>
                    <th scope="col" className="px-6 py-4">
                      {t("protocol")}
                    </th>
                    <th scope="col" className="px-6 py-4">
                      {t("vector")}
                    </th>
                    <th scope="col" className="px-6 py-4">
                      {t("timestamp")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/30">
                  {filteredFinancials.map((tx, idx) => {
                    const isSelected = selectedTransactionIds.includes(tx.id);
                    return (
                      <tr
                        key={idx}
                        className={`group transition-all ${isSelected ? "bg-emerald-500/5" : theme === "dark" ? "hover:bg-gray-800/20" : "hover:bg-gray-50"}`}
                      >
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              setSelectedTransactionIds((prev) =>
                                prev.includes(tx.id)
                                  ? prev.filter((id) => id !== tx.id)
                                  : [...prev, tx.id],
                              );
                            }}
                            className="w-3.5 h-3.5 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500 cursor-pointer accent-emerald-500"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-[4px] flex items-center justify-center font-bold text-xs uppercase ${
                                tx.amount > 0
                                  ? "bg-emerald-500/10 text-emerald-500"
                                  : "bg-amber-500/10 text-amber-500"
                              }`}
                            >
                              {tx.user_name?.substring(0, 1)}
                            </div>
                            <div>
                              <div className="font-bold text-gray-900 dark:text-gray-100">
                                {tx.user_name}
                              </div>
                              <div className="text-[10px] text-gray-500 font-mono">
                                WID: {tx.wallet_id}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-500/80">
                              {tx.transaction_type?.replace("_", " ")}
                            </div>
                            <div className="text-[10px] text-gray-500 max-w-[200px] truncate">
                              {tx.description}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`text-sm font-black ${tx.amount > 0 ? "text-emerald-400 drop-shadow-[0_0_5px_rgba(16,185,129,0.3)]" : "text-red-400"}`}
                          >
                            {tx.amount > 0 ? "+" : "-"}$
                            {Math.abs(tx.amount).toFixed(2)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-[10px] text-gray-500 font-medium">
                          {getTimeAgo(tx.created_at)}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredFinancials.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-20 text-center">
                        <div className="space-y-3 opacity-30">
                          <Search size={48} className="mx-auto" />
                          <p className="text-sm font-medium">
                            {t("noFinancialVectors")}
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {toast &&
        createPortal(
          <div
            className={`fixed bottom-6 ${dir === "rtl" ? "left-6" : "right-6"} z-[1000] flex items-center gap-3 px-6 py-4 rounded-[4px] shadow-2xl transition-all duration-300 animate-in slide-in-from-bottom-5 ${
              toast.type === "success"
                ? theme === "dark"
                  ? "bg-[#1a1a1c] border border-emerald-500/30 text-emerald-500"
                  : "bg-white border border-emerald-200 text-emerald-600"
                : theme === "dark"
                  ? "bg-[#1a1a1c] border border-red-500/30 text-red-500"
                  : "bg-white border border-red-200 text-red-600"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle size={20} />
            ) : (
              <AlertCircle size={20} />
            )}
            <span className="font-medium text-sm">{toast.message}</span>
          </div>,
          document.body,
        )}
    </div>
  );
};

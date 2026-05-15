import React, { useState, useEffect } from "react";
import { 
  Landmark, RefreshCw, Search, ArrowRightLeft, DollarSign, Wallet, 
  History, TrendingUp, Filter, Download as DownloadIcon, Wallet2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAppContext } from "../../context/AppContext";
import { getTimeAgo } from "../../utils/timeAgo";
import { FinancialTransaction } from "../../types/admin.types";

export const FinanceVaultView = ({
  theme,
  t,
  dir,
}: {
  theme: string;
  t: (key: string, replacements?: any) => string;
  dir: string;
}) => {
  const { token, language, setIsOperationPending } = useAppContext();
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchTransactions = async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/admin/financial/transactions", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setTransactions(await res.json());
      }
    } catch (err) {
      console.error("Error fetching transactions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [token]);

  const filteredTransactions = transactions.filter(
    (tx) =>
      tx.user_name?.toLowerCase().includes(search.toLowerCase()) ||
      tx.description?.toLowerCase().includes(search.toLowerCase()) ||
      tx.transaction_type?.toLowerCase().includes(search.toLowerCase()) ||
      tx.amount?.toString().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-[4px] bg-emerald-500/10 text-emerald-500">
            <Landmark size={20} />
          </div>
          <div>
            <h3 className="font-bold text-lg uppercase tracking-tight">{t("financialLedger")}</h3>
            <p className="text-[10px] font-black text-gray-500 uppercase">Append-Only Audit Trail</p>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchTransactions")}
            className={`pl-10 pr-4 py-2 rounded-[4px] border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${theme === "dark" ? "bg-[#1a1a1c] border-gray-800 text-white" : "bg-gray-50 border-gray-200"}`}
          />
        </div>
      </div>

      <div className={`rounded-[4px] border overflow-hidden ${theme === "dark" ? "bg-[#111111] border-gray-800/60" : "bg-white border-gray-100"}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left rtl:text-right">
            <thead className={`text-[10px] uppercase font-black ${theme === "dark" ? "bg-[#1a1a1c] text-gray-500" : "bg-gray-50 text-gray-400"}`}>
              <tr>
                <th className="px-6 py-4">{t("user")}</th>
                <th className="px-6 py-4">{t("description")}</th>
                <th className="px-6 py-4">{t("type")}</th>
                <th className="px-6 py-4">{t("amount")}</th>
                <th className="px-6 py-4">{t("date")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/20">
              {filteredTransactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-gray-500/5 transition-colors">
                  <td className="px-6 py-4 font-bold">{tx.user_name}</td>
                  <td className="px-6 py-4 text-xs font-medium text-gray-500">{tx.description}</td>
                  <td className="px-6 py-4 font-mono text-[10px] uppercase text-blue-500">{tx.transaction_type}</td>
                  <td className={`px-6 py-4 font-black ${tx.amount > 0 ? "text-emerald-500" : "text-red-500"}`}>
                    {tx.amount > 0 ? "+" : ""}${Math.abs(tx.amount).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-[10px] text-gray-500 font-bold">{getTimeAgo(tx.created_at)}</td>
                </tr>
              ))}
              {filteredTransactions.length === 0 && (
                <tr>
                   <td colSpan={5} className="px-6 py-12 text-center text-gray-500 italic">
                    {loading ? <RefreshCw className="animate-spin mx-auto mb-2" /> : t("noTransactionsFound")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

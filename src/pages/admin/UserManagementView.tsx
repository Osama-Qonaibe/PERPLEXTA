import React, { useState, useEffect } from "react";
import { 
  Users, Search, Filter, MoreVertical, Edit, Trash2, ShieldCheck, 
  UserCheck, UserX, Star, RefreshCw, Mail, CheckCircle, Smartphone, 
  Monitor, Tablet, CreditCard, ChevronDown, Landmark, Activity,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAppContext } from "../../context/AppContext";
import { getTimeAgo } from "../../utils/timeAgo";

export const UserManagementView = ({
  theme,
  t,
  dir,
}: {
  theme: string;
  t: (key: string, replacements?: any) => string;
  dir: string;
}) => {
  const { token, language, setIsOperationPending } = useAppContext();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [kpiStats, setKpiStats] = useState<any>({
    total: 0,
    active: 0,
    premium: 0,
    newToday: 0
  });

  const fetchUsers = async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/admin/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
        // Quick KPI calc
        setKpiStats({
          total: data.length,
          active: data.filter((u: any) => u.is_active).length,
          premium: data.filter((u: any) => u.plan_id !== "free").length,
          newToday: data.filter((u: any) => new Date(u.created_at).toDateString() === new Date().toDateString()).length
        });
      }
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [token]);

  const toggleUserStatus = async (userId: string, current: boolean) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/admin/users/${userId}/status`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ is_active: !current }),
      });
      if (res.ok) {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: !current } : u));
      }
    } catch (err) {
      console.error("Status toggle failed:", err);
    }
  };

  const filteredUsers = users.filter((u) =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Users size={48} className="text-emerald-500 animate-bounce mb-4" />
        <p className="text-gray-500 font-medium uppercase tracking-widest">IDENTITY VAULT LOADING...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
       <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
        {[
          { label: "TOTAL ENTITIES", value: kpiStats.total, icon: <Users size={16} />, color: "emerald" },
          { label: "ACTIVE NODES", value: kpiStats.active, icon: <UserCheck size={16} />, color: "blue" },
          { label: "PREMIUM USERS", value: kpiStats.premium, icon: <Star size={16} />, color: "purple" },
          { label: "NEW INGESTION", value: kpiStats.newToday, icon: <Activity size={16} />, color: "amber" }
        ].map((kpi, i) => (
          <div key={i} className={`p-4 rounded-[4px] border border-[var(--border-main)] bg-[var(--bg-secondary)] shadow-sm`}>
            <div className={`p-2 w-fit rounded-[4px] bg-${kpi.color}-500/10 text-${kpi.color}-500 mb-2`}>
              {kpi.icon}
            </div>
            <p className="text-[10px] font-black text-gray-500 uppercase">{kpi.label}</p>
            <p className="text-xl font-black">{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchUsers")}
            className={`w-full pl-10 pr-4 py-2.5 rounded-[4px] border text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${theme === "dark" ? "bg-[#1a1a1c] border-gray-800 text-white" : "bg-gray-50 border-gray-200"}`}
          />
        </div>
        <div className="flex items-center gap-3">
           <button className="flex items-center gap-2 px-4 py-2 rounded-[4px] border border-[var(--border-main)] bg-[var(--bg-secondary)] text-xs font-bold uppercase transition-all hover:bg-emerald-500/5 hover:border-emerald-500/20">
              <Filter size={14} />
              {t("filters")}
           </button>
        </div>
      </div>

      <div className={`rounded-[4px] border overflow-hidden ${theme === "dark" ? "bg-[#111111] border-gray-800/60" : "bg-white border-gray-100"}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left rtl:text-right">
            <thead className={`text-[10px] uppercase font-black ${theme === "dark" ? "bg-[#1a1a1c] text-gray-500" : "bg-gray-50 text-gray-400"}`}>
              <tr>
                <th className="px-6 py-4">{t("identity")}</th>
                <th className="px-6 py-4">{t("entitlement")}</th>
                <th className="px-6 py-4">{t("status")}</th>
                <th className="px-6 py-4">{t("lastActivity")}</th>
                <th className="px-6 py-4 text-right">PROTOCOL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/20">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-gray-500/5 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-[4px] bg-emerald-500/10 flex items-center justify-center text-emerald-500 font-bold text-xs">
                          {u.name?.substring(0, 1)}
                       </div>
                       <div>
                          <p className="font-bold text-sm leading-none mb-1">{u.name}</p>
                          <p className="text-[10px] text-gray-500 font-mono">{u.email}</p>
                       </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                       <Star size={14} className={u.plan_id !== "free" ? "text-amber-500 fill-amber-500" : "text-gray-500"} />
                       <span className="text-[10px] font-black uppercase tracking-widest">{u.plan_id || "FREE"}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                     <span className={`px-2 py-1 rounded-[4px] text-[9px] font-black uppercase ${u.is_active ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"}`}>
                        {u.is_active ? t("active") : t("blocked")}
                     </span>
                  </td>
                  <td className="px-6 py-4 text-[10px] font-bold text-gray-500">{getTimeAgo(u.created_at)}</td>
                  <td className="px-6 py-4 text-right">
                     <button
                      onClick={() => toggleUserStatus(u.id, u.is_active)}
                      className={`p-2 rounded-[4px] transition-all ${u.is_active ? "text-gray-500 hover:text-red-500 hover:bg-red-500/10" : "text-red-500 hover:text-emerald-500 hover:bg-emerald-500/10"}`}
                     >
                        {u.is_active ? <UserX size={18} /> : <UserCheck size={18} />}
                     </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

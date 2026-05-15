import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { 
  Users as UsersIcon, Search, ChevronDown, Star, Eye, Mail, History, 
  X, Camera, Save, RefreshCw, Landmark, CreditCard, 
  LifeBuoy, Sparkles, Zap, Activity, AlertCircle, CheckCircle2,
  BellRing, ShieldCheck, Trash2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useSettings } from "../../context/SettingsContext";
import { useUI } from "../../context/UIContext";

const ALL_TOOLS = [
  "chat", "chat_fast", "chat_pro", "chat_reasoning",
  "perplexta_analysis", "legal_analysis", "notebook",
  "image", "video", "stt", "tts", "learning",
  "code", "canvas", "storage_mb"
];

interface UsersProps {}

export const Users: React.FC<UsersProps> = () => {
  const { theme, t, dir, language } = useTheme();
  const { token, user: currentUser, fetchUserProfile: refreshUser } = useAuth();
  const { plans } = useSettings();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedUserUsage, setSelectedUserUsage] = useState<any>(null);
  const [isLoadingUsage, setIsLoadingUsage] = useState(false);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  // Ledger Card State
  const [ledgerAmount, setLedgerAmount] = useState("");
  const [ledgerAction, setLedgerAction] = useState<"add" | "deduct">("add");
  const [ledgerReason, setLedgerReason] = useState("");
  const [ledgerUnit, setLedgerUnit] = useState<"PTS" | "USD">("PTS");
  const [supportNotes, setSupportNotes] = useState("");

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users", {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "Cache-Control": "no-cache",
        },
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchUsers();
  }, [token]);

  const handleUpdatePermissions = async (
    userId: string,
    permissions: {
      role?: string;
      kyc_status?: string;
      kyc_rejection_reason?: string;
      kyc_required?: boolean;
      status?: string;
    },
  ) => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/permissions`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(permissions),
      });
      if (res.ok) {
        showToast("Permissions updated successfully", "success");
        setUsers((prev) =>
          prev.map((u) =>
            u.id.toString() === userId.toString()
              ? {
                  ...u,
                  ...permissions,
                  status: permissions.status || u.status,
                  subscription_status:
                    permissions.status || u.subscription_status,
                }
              : u,
          ),
        );
        if (selectedUser?.id?.toString() === userId.toString()) {
          setSelectedUser({
            ...selectedUser,
            ...permissions,
            status: permissions.status || selectedUser.status,
            subscription_status:
              permissions.status || selectedUser.subscription_status,
          });
        }
        if (currentUser?.id?.toString() === userId.toString()) {
          await refreshUser();
        }
      } else {
        const data = await res.json();
        showToast(data.error || "Failed to update permissions", "error");
      }
    } catch (error) {
      showToast("Connection error", "error");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    if (userId === currentUser?.id?.toString() && newRole === "user") {
      showToast("Cannot demote yourself", "error");
      return;
    }

    setIsUpdating(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        showToast(`Role updated to ${newRole}`, "success");
        setUsers((prev: any[]) =>
          prev.map((u: any) =>
            u.id.toString() === userId.toString() ? { ...u, role: newRole } : u,
          ),
        );
        if (selectedUser?.id?.toString() === userId.toString()) {
          setSelectedUser((prev: any) => (prev ? { ...prev, role: newRole } : null));
        }
        if (currentUser?.id?.toString() === userId.toString()) {
          await refreshUser();
        }
      } else {
        const data = await res.json();
        showToast(data.error || "Failed to update role", "error");
      }
    } catch (error) {
      showToast("Connection error", "error");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateBalance = async (
    userId: string,
    amount: number,
    reason: string,
    type: "add" | "deduct",
  ) => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/balance`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount, reason, type }),
      });
      if (res.ok) {
        const data = await res.json();
        showToast("Balance adjusted successfully", "success");
        setUsers((prev) =>
          prev.map((u) =>
            u.id.toString() === userId.toString()
              ? { ...u, balance: data.newBalance }
              : u,
          ),
        );
        if (selectedUser?.id?.toString() === userId.toString())
          setSelectedUser({ ...selectedUser, balance: data.newBalance });
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to adjust balance", "error");
      }
    } catch (error) {
      showToast("Connection error", "error");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateSupportNotes = async (userId: string, notes: string) => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/support-notes`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ notes }),
      });
      if (res.ok) {
        showToast("Support notes updated", "success");
        setUsers((prev) =>
          prev.map((u) =>
            u.id.toString() === userId.toString()
              ? { ...u, support_notes: notes }
              : u,
          ),
        );
        if (selectedUser?.id?.toString() === userId.toString())
          setSelectedUser({ ...selectedUser, support_notes: notes });
      } else {
        showToast("Failed to update support notes", "error");
      }
    } catch (error) {
      showToast("Connection error", "error");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSendDirectEmail = async (userId: string) => {
    const subject = prompt(
      dir === "rtl" ? "أدخل عنوان البريد" : "Enter email subject",
    );
    if (!subject) return;
    const body = prompt(
      dir === "rtl" ? "أدخل محتوى الرسالة" : "Enter email body",
    );
    if (!body) return;

    try {
      setIsUpdating(true);
      const res = await fetch(`/api/admin/users/${userId}/send-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ subject, body }),
      });

      if (res.ok) {
        showToast(
          dir === "rtl" ? "تم إرسال البريد بنجاح" : "Email sent successfully",
          "success",
        );
      } else {
        const data = await res.json();
        showToast(
          data.error ||
            (dir === "rtl" ? "فشل إرسال البريد" : "Failed to send email"),
          "error",
        );
      }
    } catch (error) {
      console.error("Error sending email:", error);
      showToast(
        dir === "rtl" ? "فشل إرسال البريد" : "Failed to send email",
        "error",
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSendManualNotification = async (userId: string) => {
    const titleEn = prompt("Enter Internal Alert Title (English)");
    if (!titleEn) return;
    const titleAr = prompt("أدخل عنوان التنبيه الداخلي (العربية)");
    if (!titleAr) return;
    const messageEn = prompt("Enter Internal Alert Message (English)");
    if (!messageEn) return;
    const messageAr = prompt("أدخل نص التنبيه الداخلي (العربية)");
    if (!messageAr) return;

    try {
      setIsUpdating(true);
      const res = await fetch(`/api/admin/users/${userId}/notify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          titleEn,
          titleAr,
          messageEn,
          messageAr,
          type: "support",
        }),
      });

      if (res.ok) {
        showToast(
          dir === "rtl"
            ? "تم إرسال التنبيه بنجاح"
            : "Notification sent successfully",
          "success",
        );
      } else {
        const data = await res.json();
        showToast(
          data.error ||
            (dir === "rtl"
              ? "فشل إرسال التنبيه"
              : "Failed to send notification"),
          "error",
        );
      }
    } catch (error) {
      console.error("Error sending notification:", error);
      showToast(
        dir === "rtl" ? "فشل إرسال التنبيه" : "Failed to send notification",
        "error",
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdatePlan = async (userId: string, planId: string) => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/plan`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ planId }),
      });
      if (res.ok) {
        showToast("Subscription updated successfully", "success");
        const updatedPlan = plans.find(
          (p: any) => p.id.toString() === planId.toString(),
        );
        setUsers((prev) =>
          prev.map((u) =>
            u.id.toString() === userId.toString()
              ? {
                  ...u,
                  plan_id: planId,
                  plan_name: updatedPlan?.name_en || updatedPlan?.nameEn,
                }
              : u,
          ),
        );
        if (selectedUser?.id?.toString() === userId.toString()) {
          setSelectedUser({
            ...selectedUser,
            plan_id: planId,
            plan_name: updatedPlan?.name_en || updatedPlan?.nameEn,
          });
        }
        if (currentUser?.id?.toString() === userId.toString()) {
          await refreshUser();
        }
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to update subscription", "error");
      }
    } catch (error) {
      showToast("Connection error", "error");
    } finally {
      setIsUpdating(false);
    }
  };

  const fetchUserUsage = async (userId: string) => {
    setIsLoadingUsage(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/usage`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedUserUsage(data);
      }
    } catch (error) {
      console.error("Failed to fetch user usage:", error);
    } finally {
      setIsLoadingUsage(false);
    }
  };

  const handleViewProfile = (user: any) => {
    setSelectedUser(user);
    setSupportNotes(user.support_notes || "");
    setSelectedUserUsage(null);
    setIsProfileModalOpen(true);
    fetchUserUsage(user.id);
  };

  const fetchActivityLogs = async (userId: string) => {
    setIsLoadingLogs(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/activity-logs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setActivityLogs(data);
      }
    } catch (error) {
      console.error("Failed to fetch activity logs:", error);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const handleViewHistory = (user: any) => {
    setSelectedUser(user);
    setActivityLogs([]);
    setIsActivityModalOpen(true);
    fetchActivityLogs(user.id);
  };

  const getPlanDetails = (planId: any) => {
    const p = plans.find((p: any) => p.id.toString() === planId?.toString());
    return p || { nameEn: "Standard", nameAr: "عادية", color: "#6b7280", limits: {} };
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && (u.status === "active" || u.subscription_status === "active")) ||
        (statusFilter === "suspended" && (u.status === "suspended" || u.subscription_status === "suspended"));

      const matchesPlan =
        planFilter === "all" || u.plan_id?.toString() === planFilter.toString();

      return matchesSearch && matchesStatus && matchesPlan;
    });
  }, [users, searchQuery, statusFilter, planFilter]);

  return (
    <div className="space-y-6 relative">
      {toast && createPortal(
        <div className={`fixed bottom-6 ${dir === "rtl" ? "left-6" : "right-6"} z-[1000] flex items-center gap-3 px-6 py-4 rounded-[4px] shadow-2xl transition-all duration-300 animate-in slide-in-from-bottom-5 ${toast.type === "success" ? (theme === "dark" ? "bg-[#1a1a1c] border border-emerald-500/30 text-emerald-500" : "bg-white border border-emerald-200 text-emerald-600") : (theme === "dark" ? "bg-[#1a1a1c] border border-red-500/30 text-red-500" : "bg-white border border-red-200 text-red-600")}`}>
          {toast.type === "success" ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span className="font-medium text-sm">{toast.message}</span>
        </div>,
        document.body
      )}

      <div className="flex flex-col lg:flex-row gap-4 justify-between items-center bg-[#111111]/40 p-4 rounded-[4px] border border-gray-800/60 shadow-sm relative overflow-hidden backdrop-blur-sm">
        <div className="absolute inset-0 bg-emerald-500/[0.01] pointer-events-none" />
        <div className={`relative w-full lg:w-[450px] flex items-center group`}>
          <div className={`absolute inset-y-0 ${dir === "rtl" ? "right-0 pr-4" : "left-0 pl-4"} flex items-center pointer-events-none transition-colors group-focus-within:text-emerald-500`}>
            <Search size={18} className="text-gray-400" />
          </div>
          <input
            type="text"
            placeholder={t("searchUsers")}
            value={searchQuery || ""}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full ${dir === "rtl" ? "pr-11 pl-4" : "pl-11 pr-4"} py-3 rounded-[4px] border focus:outline-none focus:ring-1 focus:ring-emerald-500/30 transition-all ${theme === "dark" ? "bg-[#0f0f11] border-gray-800 text-white placeholder-gray-600" : "bg-white border-gray-200 text-gray-900 placeholder-gray-400"}`}
          />
        </div>
        <div className="flex gap-3 w-full lg:w-auto">
          <div className="relative flex-1 lg:flex-none min-w-[140px]">
            <select
              value={statusFilter || "all"}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`w-full px-4 py-3 rounded-[4px] border appearance-none focus:outline-none focus:ring-1 focus:ring-emerald-500/30 font-bold text-xs ${theme === "dark" ? "bg-[#0f0f11] border-gray-800 text-gray-300" : "bg-white border-gray-200 shadow-sm"}`}
            >
              <option value="all">All Status</option>
              <option value="active">{t("active")}</option>
              <option value="suspended">{t("suspended")}</option>
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500" />
          </div>
          <div className="relative flex-1 lg:flex-none min-w-[160px]">
            <select
              value={planFilter || "all"}
              onChange={(e) => setPlanFilter(e.target.value)}
              className={`w-full px-4 py-3 rounded-[4px] border appearance-none focus:outline-none focus:ring-1 focus:ring-emerald-500/30 font-bold text-xs ${theme === "dark" ? "bg-[#0f0f11] border-gray-800 text-gray-300" : "bg-white border-gray-200 shadow-sm"}`}
            >
              <option value="all">All Plans</option>
              {plans.map((p: any) => (
                <option key={p.id} value={p.id}>{dir === "rtl" ? p.nameAr : p.nameEn}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500" />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto custom-scrollbar rounded-[4px] border border-gray-800/60 bg-[#111111]/40 shadow-sm">
        <table className="w-full text-sm text-left rtl:text-right">
          <thead className={`text-[10px] uppercase font-black tracking-widest transition-all duration-300 ${theme === "dark" ? "bg-[#1a1a1c] text-gray-500" : "bg-gray-50 text-gray-400"}`}>
            <tr>
              <th className={`px-6 py-4 ${dir === "rtl" ? "text-right" : "text-left"}`}>{t("userName")}</th>
              <th className={`px-6 py-4 ${dir === "rtl" ? "text-right" : "text-left"}`}>{t("role")}</th>
              <th className={`px-6 py-4 ${dir === "rtl" ? "text-right" : "text-left"}`}>{t("plan")}</th>
              <th className={`px-6 py-4 ${dir === "rtl" ? "text-right" : "text-left"}`}>{t("kycStatus")}</th>
              <th className={`px-6 py-4 ${dir === "rtl" ? "text-right" : "text-left"}`}>{t("joinedAt")}</th>
              <th className={`px-6 py-4 ${dir === "rtl" ? "text-left" : "text-right"}`}>{t("actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/30">
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-24">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-12 h-12 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
                      <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest animate-pulse drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]">
                        Syncing Galaxy Users...
                      </span>
                    </div>
                </td>
              </tr>
            ) : filteredUsers.length > 0 ? (
              filteredUsers.map((user) => {
                const plan = getPlanDetails(user.plan_id);
                return (
                  <tr key={user.id} className="group transition-all duration-300 hover:bg-gray-800/10">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="relative group/avatar">
                          <div className="w-11 h-11 rounded-[4px] bg-gray-200 dark:bg-gray-800 flex items-center justify-center shrink-0 overflow-hidden border border-gray-800/50 group-hover/avatar:border-emerald-500/50 transition-all">
                            {user.avatar ? (
                              <img src={user.avatar} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <UsersIcon size={20} className="text-gray-500" />
                            )}
                          </div>
                          {user.subscription_status === "active" && (
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-[#111111] shadow-[0_0_8px_rgba(16,185,129,1)]" />
                          )}
                        </div>
                        <div>
                          <div className="font-black text-sm text-gray-100 group-hover:text-emerald-500 transition-colors">{user.name}</div>
                          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="relative min-w-[110px]">
                        <select
                          value={user.role || "user"}
                          onChange={(e) => handleUpdateRole(user.id.toString(), e.target.value)}
                          disabled={isUpdating}
                          className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-[4px] border appearance-none w-full text-center focus:outline-none transition-all cursor-pointer ${
                            user.role === "admin" ? "text-purple-500 border-purple-500/30 bg-purple-500/5" : 
                            user.role === "elite" ? "text-amber-500 border-amber-500/30 bg-amber-500/5" : 
                            user.role === "support" ? "text-emerald-500 border-emerald-500/30 bg-emerald-500/5" : 
                            "text-gray-500 border-gray-500/30 bg-gray-500/5"
                          }`}
                        >
                          <option value="user" className={theme === "dark" ? "bg-[#0f0f11] text-white" : "bg-white text-black"}>{t("role_user")}</option>
                          <option value="support" className={theme === "dark" ? "bg-[#0f0f11] text-white" : "bg-white text-black"}>{t("role_support")}</option>
                          <option value="admin" className={theme === "dark" ? "bg-[#0f0f11] text-white" : "bg-white text-black"}>{t("role_admin")}</option>
                        </select>
                        <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 opacity-40 pointer-events-none" />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div
                        className="px-3 py-1.5 rounded-[4px] text-[10px] font-black uppercase tracking-[0.1em] border flex items-center justify-center gap-2"
                        style={{
                          backgroundColor: `${plan.color}10`,
                          color: plan.color,
                          borderColor: `${plan.color}20`,
                        }}
                      >
                        <Star size={10} className="fill-current" />
                        {dir === "rtl" ? plan.nameAr || plan.name_ar : plan.nameEn || plan.name_en}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className={`px-3 py-1.5 rounded-[4px] text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 border ${
                          user.kyc_status === "verified" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : 
                          user.kyc_status === "pending" ? "bg-amber-500/10 text-amber-500 border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.1)]" : 
                          user.kyc_status === "rejected" ? "bg-red-500/10 text-red-500 border-red-500/20" : 
                          "bg-gray-500/10 text-gray-500 border-gray-500/20"
                        }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${user.kyc_status === "verified" ? "bg-emerald-500" : user.kyc_status === "pending" ? "bg-amber-500 animate-pulse" : "bg-gray-400"}`} />
                        {user.kyc_status === "verified" ? t("kycVerified") : user.kyc_status === "pending" ? t("kycPending") : user.kyc_status === "rejected" ? t("kycRejected") : t("kycNone")}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[11px] font-mono text-gray-500">{new Date(user.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <div className={`flex items-center gap-1.5 ${dir === "rtl" ? "justify-start" : "justify-end"}`}>
                        <button onClick={() => handleSendDirectEmail(user.id)} className="w-9 h-9 flex items-center justify-center rounded-[4px] bg-gray-500/5 text-gray-400 hover:text-emerald-500 hover:bg-emerald-500/10 transition-all border border-transparent hover:border-emerald-500/20" title={t("sendEmail")}><Mail size={16} /></button>
                        <button onClick={() => handleViewHistory(user)} className="w-9 h-9 flex items-center justify-center rounded-[4px] bg-gray-500/5 text-gray-400 hover:text-amber-500 hover:bg-amber-500/10 transition-all border border-transparent hover:border-amber-500/20" title="Usage History"><History size={16} /></button>
                        <button onClick={() => handleViewProfile(user)} className="w-9 h-9 flex items-center justify-center rounded-[4px] bg-emerald-500/10 text-emerald-500 transition-all border border-emerald-500/30 hover:shadow-[0_0_15px_rgba(16,185,129,0.3)] group/btn" title={t("viewProfile")}><Eye size={16} className="group-hover/btn:scale-110 transition-transform" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="text-center py-20 text-gray-500">
                  <div className="flex flex-col items-center gap-3">
                    <UsersIcon size={40} className="text-gray-800/20" />
                    <span className="text-xs font-bold uppercase tracking-widest opacity-50">No explorers found in this sector</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {isActivityModalOpen && selectedUser && createPortal(
          <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className={`relative w-full max-w-4xl max-h-[85vh] overflow-hidden rounded-[4px] shadow-2xl flex flex-col bg-[#161618] border border-gray-800/60`}>
              <div className="p-6 border-b border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-[4px] bg-amber-500/10 text-amber-500"><History size={24} /></div>
                  <div>
                    <h3 className="text-xl font-bold">{selectedUser.name} - Usage History</h3>
                    <p className="text-sm text-gray-500">Detailed extraction and action logs</p>
                  </div>
                </div>
                <button onClick={() => setIsActivityModalOpen(false)} className="p-2 rounded-[4px] text-gray-400 hover:bg-gray-800 transition-all"><X size={20} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                {isLoadingLogs ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
                    <p className="text-gray-500 animate-pulse font-mono text-sm uppercase tracking-widest">Loading Logs...</p>
                  </div>
                ) : activityLogs.length === 0 ? (
                  <div className="text-center py-20 text-gray-500">
                    <History size={48} className="mx-auto mb-4 opacity-20" />
                    <p>No activity logs found for this user.</p>
                  </div>
                ) : (
                  <div className="min-w-full overflow-hidden border border-gray-800 rounded-[4px]">
                    <table className="min-w-full divide-y divide-gray-800">
                      <thead className="bg-[#1a1a1c]">
                        <tr>
                          <th className="px-6 py-4 text-left font-black text-[10px] text-gray-500 uppercase tracking-widest">Tool / Action</th>
                          <th className="px-6 py-4 text-left font-black text-[10px] text-gray-500 uppercase tracking-widest">Consumed</th>
                          <th className="px-6 py-4 text-left font-black text-[10px] text-gray-500 uppercase tracking-widest">Status</th>
                          <th className="px-6 py-4 text-left font-black text-[10px] text-gray-500 uppercase tracking-widest">Type</th>
                          <th className="px-6 py-4 text-left font-black text-[10px] text-gray-500 uppercase tracking-widest">Timestamp</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                        {activityLogs.map((log, idx) => (
                          <tr key={idx} className="group hover:bg-gray-800/30 transition-all">
                            <td className="px-6 py-4 font-mono text-xs uppercase text-emerald-500 tracking-tighter">{log.tool_id}</td>
                            <td className="px-6 py-4 font-mono text-sm font-bold text-white">{parseFloat(log.amount).toFixed(2)}</td>
                            <td className="px-6 py-4"><span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter border bg-emerald-500/10 text-emerald-500 border-emerald-500/30">Completed</span></td>
                            <td className="px-6 py-4"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter border ${log.usage_type === "paid" ? "bg-amber-500/10 text-amber-500 border-amber-500/30" : "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"}`}>{log.usage_type}</span></td>
                            <td className="px-6 py-4 font-mono text-[11px] text-gray-400">{new Date(log.created_at).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </motion.div>
          </div>,
          document.body
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isProfileModalOpen && selectedUser && createPortal(
          <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className={`relative w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-[4px] shadow-2xl flex flex-col bg-[#161618] border border-gray-800/60`}>
              <div className="p-8 border-b border-gray-800/20 flex items-center justify-between bg-gradient-to-br from-[#111111] via-[#111111] to-emerald-500/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none" />
                <div className="flex items-center gap-6 relative z-10">
                  <div className={`w-16 h-16 rounded-[4px] flex items-center justify-center shadow-2xl border-2 overflow-hidden transition-all duration-300 group/avatar bg-[#1a1a1c] border-gray-800 hover:border-emerald-500/50`}>
                    {selectedUser.avatar ? (
                      <img src={selectedUser.avatar} alt="" className="w-full h-full object-cover group-hover/avatar:scale-110 transition-transform duration-700" referrerPolicy="no-referrer" />
                    ) : (
                      <UsersIcon size={32} className="text-gray-500" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                      {selectedUser.name}
                      {selectedUser.subscription_status === "active" && <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />}
                    </h2>
                    <div className="flex flex-col gap-0.5 mt-1">
                      <p className={`text-[10px] font-black uppercase tracking-[0.2em] p-0 m-0 ${selectedUser.role === "admin" ? "text-purple-500" : selectedUser.role === "elite" ? "text-amber-500" : selectedUser.role === "support" ? "text-emerald-500" : "text-gray-400"}`}>
                        {t(`role_${(selectedUser.role || "user").toLowerCase()}`)}
                      </p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest opacity-60 font-mono p-0 m-0">{selectedUser.email}</p>
                    </div>
                  </div>
                </div>
                <button onClick={() => setIsProfileModalOpen(false)} className={`p-3 rounded-[4px] transition-all duration-300 group/close hover:bg-gray-800 text-gray-500 hover:text-white`}>
                  <X size={24} className="group-hover/close:rotate-90 transition-transform duration-500" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className={`p-8 rounded-[4px] border flex flex-col h-full bg-[#161618] border-gray-800/60`}>
                    <div className="flex items-center gap-3 mb-8">
                      <div className="p-2.5 rounded-[4px] bg-emerald-500/10 text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.15)]"><UsersIcon size={20} /></div>
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">{t("identitySection")}</h3>
                    </div>
                    <div className="flex-1 space-y-5">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-gray-500 px-1">{t("role")}</label>
                          <select value={selectedUser.role || "user"} onChange={(e) => setSelectedUser({...selectedUser, role: e.target.value})} className={`w-full h-11 px-4 rounded-[4px] border bg-[#0f0f11] border-gray-800 text-white focus:outline-none focus:border-emerald-500/50 transition-all`}>
                            <option value="user">{t("role_user")}</option>
                            <option value="support">{t("role_support")}</option>
                            <option value="admin">{t("role_admin")}</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-gray-500 px-1">{t("kycStatus")}</label>
                          <select value={selectedUser.kyc_status || "none"} onChange={(e) => setSelectedUser({...selectedUser, kyc_status: e.target.value})} className={`w-full h-11 px-4 rounded-[4px] border bg-[#0f0f11] border-gray-800 text-white focus:outline-none focus:border-emerald-500/50 transition-all`}>
                            <option value="none">{t("kycNone")}</option>
                            <option value="pending">{t("kycPending")}</option>
                            <option value="verified">{t("kycVerified")}</option>
                            <option value="rejected">{t("kycRejected")}</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className={`p-3 rounded-[4px] border bg-[#0f0f11] border-gray-800 flex flex-col gap-2`}>
                          <span className="text-[10px] font-bold uppercase text-gray-500">{t("accountStatus")}</span>
                          <div className="flex items-center justify-between">
                            <span className={`text-sm font-bold ${(selectedUser.status === "active") ? "text-emerald-500" : "text-red-500"}`}>{selectedUser.status === "active" ? t("active") : t("suspended")}</span>
                            <button onClick={() => setSelectedUser({...selectedUser, status: selectedUser.status === "active" ? "suspended" : "active"})} className={`w-8 h-4 rounded-full transition-all relative ${selectedUser.status === "active" ? "bg-emerald-500" : "bg-gray-600"}`}>
                              <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${selectedUser.status === "active" ? (dir === "rtl" ? "left-0.5" : "right-0.5") : (dir === "rtl" ? "right-0.5" : "left-0.5")}`} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <button onClick={() => handleUpdatePermissions(selectedUser.id, { role: selectedUser.role, kyc_status: selectedUser.kyc_status, status: selectedUser.status })} className="w-full mt-6 py-3 rounded-[4px] bg-emerald-500 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 group disabled:opacity-50">
                      {isUpdating ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />} {dir === "rtl" ? "حفظ بيانات الهوية" : "Save Identity Data"}
                    </button>
                  </div>

                  <div className={`p-8 rounded-[4px] border flex flex-col h-full bg-[#161618] border-gray-800/60`}>
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-[4px] bg-amber-500/10 text-amber-500"><Landmark size={20} /></div>
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">{dir === "rtl" ? "قسم المحفظة" : "Ledger Section"}</h3>
                      </div>
                    </div>
                    <div className="flex-1 space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className={`p-3 rounded-[4px] border bg-[#0f0f11] border-gray-800`}>
                          <p className="text-[10px] font-bold text-gray-500 mb-1">{dir === "rtl" ? "النقاط" : "Points"}</p>
                          <p className="text-lg font-bold text-amber-500">{Math.floor(selectedUser.balance || 0).toLocaleString()}</p>
                        </div>
                        <div className={`p-3 rounded-[4px] border bg-[#0f0f11] border-gray-800`}>
                          <p className="text-[10px] font-bold text-gray-500 mb-1">{dir === "rtl" ? "القيمة بالدولار" : "USD Value"}</p>
                          <p className="text-lg font-bold text-emerald-500">${(parseFloat(selectedUser.balance || 0) * 0.001).toFixed(2)}</p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <input type="number" value={ledgerAmount} onChange={(e) => setLedgerAmount(e.target.value)} placeholder={dir === "rtl" ? "المبلغ" : "Amount"} className={`flex-1 h-11 px-4 rounded-[4px] border bg-[#0f0f11] border-gray-800 text-white focus:outline-none focus:border-emerald-500`} />
                          <select value={ledgerAction} onChange={(e: any) => setLedgerAction(e.target.value)} className={`w-32 h-11 px-3 rounded-[4px] border bg-[#0f0f11] border-gray-800 text-white focus:outline-none focus:border-emerald-500`}>
                            <option value="add">{dir === "rtl" ? "إيداع" : "Deposit"}</option>
                            <option value="deduct">{dir === "rtl" ? "سحب" : "Withdraw"}</option>
                          </select>
                        </div>
                        <input type="text" value={ledgerReason} onChange={(e) => setLedgerReason(e.target.value)} placeholder={dir === "rtl" ? "السبب" : "Reason"} className={`w-full h-11 px-4 rounded-[4px] border bg-[#0f0f11] border-gray-800 text-white focus:outline-none focus:border-emerald-500`} />
                      </div>
                    </div>
                    <button onClick={() => handleUpdateBalance(selectedUser.id, parseFloat(ledgerAmount), ledgerReason, ledgerAction)} className={`w-full mt-6 py-3 rounded-[4px] font-bold text-sm transition-all flex items-center justify-center gap-2 group disabled:opacity-50 ${ledgerAction === "add" ? "bg-emerald-500" : "bg-amber-600"} text-white`}>
                      {isUpdating ? <RefreshCw size={18} className="animate-spin" /> : <ShieldCheck size={18} />} {dir === "rtl" ? (ledgerAction === "add" ? "اعتماد الإيداع" : "اعتماد السحب") : (ledgerAction === "add" ? "Execute Deposit" : "Execute Withdrawal")}
                    </button>
                  </div>
                </div>

                <div className={`p-8 rounded-[4px] border bg-[#161618] border-emerald-500/10`}>
                  <div className="flex items-center gap-3 mb-8">
                    <div className="p-2.5 rounded-[4px] bg-emerald-500/10 text-emerald-500"><Activity size={20} /></div>
                    <h3 className="text-[12px] font-black uppercase tracking-[0.3em] text-gray-400">{t("consumptionRadar")}</h3>
                  </div>
                  {isLoadingUsage ? (
                    <div className="flex justify-center py-12"><RefreshCw size={32} className="animate-spin text-emerald-500/20" /></div>
                  ) : selectedUserUsage && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {ALL_TOOLS.map((toolId) => {
                        const limits = getPlanDetails(selectedUser.plan_id).limits || {};
                        const limit = limits[toolId] || { daily: 0, monthly: 0 };
                        const usage = selectedUserUsage[toolId] || { daily: 0, monthly: 0 };
                        const dailyPercent = limit.daily > 0 ? Math.min(100, (usage.daily / limit.daily) * 100) : 0;
                        const monthlyPercent = limit.monthly > 0 ? Math.min(100, (usage.monthly / limit.monthly) * 100) : 0;
                        return (
                          <div key={toolId} className={`p-4 rounded-[4px] border bg-[#0f0f11] border-gray-800 transition-all hover:border-emerald-500/30 group`}>
                            <div className="flex justify-between mb-3"><span className="text-[10px] font-black text-gray-400 group-hover:text-emerald-500 uppercase">{t(toolId)}</span></div>
                            <div className="space-y-3">
                              <div className="space-y-1">
                                <div className="flex justify-between text-[8px] font-bold uppercase"><span className="text-gray-500">{t("daily")}</span><span className={dailyPercent > 90 ? "text-red-500" : "text-emerald-500"}>{usage.daily} / {limit.daily}</span></div>
                                <div className="h-1 w-full bg-gray-800/40 rounded-full"><div className={`h-full rounded-full ${dailyPercent > 90 ? "bg-red-500" : "bg-emerald-500"}`} style={{ width: `${dailyPercent}%` }} /></div>
                              </div>
                              <div className="space-y-1">
                                <div className="flex justify-between text-[8px] font-bold uppercase"><span className="text-gray-500">{t("monthly")}</span><span className={monthlyPercent > 90 ? "text-red-500" : "text-blue-500"}>{usage.monthly} / {limit.monthly}</span></div>
                                <div className="h-1 w-full bg-gray-800/40 rounded-full"><div className={`h-full rounded-full ${monthlyPercent > 90 ? "bg-red-500" : "bg-blue-500"}`} style={{ width: `${monthlyPercent}%` }} /></div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              <div className="p-6 border-t border-gray-800/30 flex justify-center bg-gray-800/5">
                <button onClick={() => setIsProfileModalOpen(false)} className={`px-12 py-3.5 rounded-[4px] font-bold transition-all border border-gray-800 bg-[#1a1a1c] text-gray-400 hover:text-white flex items-center gap-2`}><X size={20} /><span>{t("close")}</span></button>
              </div>
            </motion.div>
          </div>,
          document.body
        )}
      </AnimatePresence>
    </div>
  );
};

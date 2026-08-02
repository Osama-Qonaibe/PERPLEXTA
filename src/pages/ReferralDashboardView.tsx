import React, { useEffect, useState } from "react";
import { useAppContext } from "../context/AppContext";
import { 
  Send, CheckCircle, Clock, Award, Users, TrendingUp, AlertCircle, RefreshCw, ChevronRight, UserPlus, Mail, Gift, Search, Download 
} from "lucide-react";
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid 
} from "recharts";

interface SummaryData {
  totalSent: number;
  accepted: number;
  pending: number;
  reminded: number;
  conversionRate: number;
  totalReferrers: number;
}

interface ActiveReferrer {
  referrer_id: number;
  referrer_name: string;
  referrer_email: string;
  total_sent: number;
  total_accepted: number;
  total_pending: number;
  conversion_rate: number;
}

interface RecentInvitation {
  id: number;
  referred_email: string;
  status: string;
  created_at: string;
  referrer_name: string;
  referrer_email: string;
}

interface DailyTrendPoint {
  date: string;
  sent: number;
  accepted: number;
}

interface ReferralStats {
  summary: SummaryData;
  mostActiveReferrers: ActiveReferrer[];
  topPerformers?: ActiveReferrer[];
  recentInvitations: RecentInvitation[];
  dailyTrend?: DailyTrendPoint[];
}

export const ReferralDashboardView = ({
  theme,
  t,
  dir,
}: {
  theme: string;
  t: (key: string, replacements?: any) => string;
  dir: string;
}) => {
  const { token, language } = useAppContext();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ReferralStats | null>(null);

  // Search & Filter States
  const [referrerSearch, setReferrerSearch] = useState<string>("");
  const [inviteStatusFilter, setInviteStatusFilter] = useState<"all" | "accepted" | "pending">("all");
  const [rankingTab, setRankingTab] = useState<"active" | "top_conversions">("active");

  // Manual dispatch states
  const [sendingReminder, setSendingReminder] = useState<Record<number, boolean>>({});
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [downloading, setDownloading] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<Record<number, boolean>>({});
  const [sendingBulkReminder, setSendingBulkReminder] = useState<boolean>(false);

  const isRtl = language === "ar";

  const handleDownloadCSV = async () => {
    setDownloading(true);
    try {
      const response = await fetch("/api/admin/referrals/export", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(
          language === "ar"
            ? "فشل في تصدير ملف البيانات"
            : "Failed to download referral CSV"
        );
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `perplexta_referrals_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setNotification({
        message: language === "ar" ? "تم تحميل ملف الإحالات بنجاح!" : "Referral CSV downloaded successfully!",
        type: 'success'
      });
      setTimeout(() => setNotification(null), 4000);
    } catch (err: any) {
      console.error(err);
      setNotification({
        message: err.message || "An error occurred during download",
        type: 'error'
      });
      setTimeout(() => setNotification(null), 4000);
    } finally {
      setDownloading(false);
    }
  };

  const handleSendReminder = async (invitationId: number) => {
    setSendingReminder(prev => ({ ...prev, [invitationId]: true }));
    try {
      const response = await fetch("/api/admin/referrals/remind", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ invitationId })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          language === "ar"
            ? (result.error_ar || "فشل في إرسال التذكير")
            : (result.error || "Failed to dispatch reminder")
        );
      }

      setNotification({
        message: language === "ar" ? "تم إرسال التذكير بنجاح!" : "Reminder sent successfully!",
        type: 'success'
      });

      // Update local state instantly so the user sees immediate feedback
      if (data) {
        setData(prev => {
          if (!prev) return null;
          return {
            ...prev,
            recentInvitations: prev.recentInvitations.map(invite => {
              if (invite.id === invitationId) {
                return { ...invite, status: 'reminded' };
              }
              return invite;
            })
          };
        });
      }

      // Auto-clear notification after 4s
      setTimeout(() => setNotification(null), 4000);
    } catch (err: any) {
      console.error(err);
      setNotification({
        message: err.message || "An error occurred",
        type: 'error'
      });
      setTimeout(() => setNotification(null), 4000);
    } finally {
      setSendingReminder(prev => ({ ...prev, [invitationId]: false }));
    }
  };

  const handleSendBulkReminder = async () => {
    const idsToRemind = Object.keys(selectedIds)
      .map(Number)
      .filter(id => selectedIds[id]);

    if (idsToRemind.length === 0) return;

    setSendingBulkReminder(true);
    try {
      const response = await fetch("/api/admin/referrals/remind-bulk", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ invitationIds: idsToRemind })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          language === "ar"
            ? (result.error_ar || "فشل في إرسال التذكيرات الجماعية")
            : (result.error || "Failed to dispatch bulk reminders")
        );
      }

      const actuallySent = result.sentCount || idsToRemind.length;

      setNotification({
        message: language === "ar"
          ? `تم إرسال ${actuallySent} تذكير بنجاح!`
          : `Successfully dispatched ${actuallySent} reminder(s)!`,
        type: 'success'
      });

      // Clear selection
      setSelectedIds({});

      // Update local state instantly so the user sees immediate feedback
      if (data) {
        setData(prev => {
          if (!prev) return null;
          return {
            ...prev,
            recentInvitations: prev.recentInvitations.map(invite => {
              if (idsToRemind.includes(invite.id)) {
                return { ...invite, status: 'reminded' };
              }
              return invite;
            })
          };
        });
      }

      // Auto-clear notification after 4s
      setTimeout(() => setNotification(null), 4000);
    } catch (err: any) {
      console.error(err);
      setNotification({
        message: err.message || "An error occurred during mass update",
        type: 'error'
      });
      setTimeout(() => setNotification(null), 4000);
    } finally {
      setSendingBulkReminder(false);
    }
  };

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/referrals/stats", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        throw new Error(
          language === "ar"
            ? "فشل في جلب إحصاءات الإحالات من النظام"
            : "Failed to fetch referral statistics"
        );
      }
      const json = await response.json();
      setData(json);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchStats();
    }
  }, [token]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <RefreshCw size={40} className="text-emerald-500 animate-spin" />
        <p className="text-xs text-[var(--text-muted)] mt-4 font-bold uppercase tracking-widest animate-pulse">
          {isRtl ? "جاري تحميل إحصائيات الإحالات..." : "INGESTING REFERRAL DATA..."}
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 rounded-lg border border-red-500/20 bg-red-500/5 text-center flex flex-col items-center justify-center max-w-lg mx-auto my-12">
        <AlertCircle size={36} className="text-red-500 mb-3" />
        <h3 className="text-sm font-black uppercase text-red-500 tracking-wider">
          {isRtl ? "خطأ في الاتصال بالنظام" : "CRITICAL CONNECTION FAILURE"}
        </h3>
        <p className="text-xs text-[var(--text-muted)] mt-1 mb-4">
          {error || "An integration error has occurred."}
        </p>
        <button
          onClick={fetchStats}
          className="flex items-center gap-2 px-4 py-2 border border-red-500/30 rounded-sm hover:border-red-500 text-red-500 text-xs font-bold transition-theme"
        >
          <RefreshCw size={12} />
          {isRtl ? "إعادة المحاولة" : "RETRY CONNECTION"}
        </button>
      </div>
    );
  }

  const { summary, mostActiveReferrers, topPerformers = [], recentInvitations, dailyTrend = [] } = data;

  // Filter Referrers (Search by ID, Name or Email)
  const filteredReferrers = mostActiveReferrers.filter(ref => {
    if (!referrerSearch.trim()) return true;
    const q = referrerSearch.toLowerCase().trim();
    return (
      ref.referrer_id.toString() === q ||
      ref.referrer_name.toLowerCase().includes(q) ||
      ref.referrer_email.toLowerCase().includes(q)
    );
  });

  // Filter Top Performers (Search by ID, Name or Email)
  const filteredTopPerformers = topPerformers.filter(ref => {
    if (!referrerSearch.trim()) return true;
    const q = referrerSearch.toLowerCase().trim();
    return (
      ref.referrer_id.toString() === q ||
      ref.referrer_name.toLowerCase().includes(q) ||
      ref.referrer_email.toLowerCase().includes(q)
    );
  });

  // Filter Recent Invitations by accepted/pending status
  const filteredInvitations = recentInvitations.filter(invite => {
    if (inviteStatusFilter === "all") return true;
    if (inviteStatusFilter === "accepted") return invite.status === "accepted";
    if (inviteStatusFilter === "pending") return invite.status === "sent" || invite.status === "reminded";
    return true;
  });

  const remindableInvitationsInView = filteredInvitations.filter(invite => invite.status !== "accepted");
  const selectedCount = Object.keys(selectedIds).filter(id => selectedIds[Number(id)]).length;
  const isAllSelected = remindableInvitationsInView.length > 0 && remindableInvitationsInView.every(invite => !!selectedIds[invite.id]);

  return (
    <div className="space-y-6 w-full animate-fade-in" dir={dir}>
      {/* Dynamic Toast Notification */}
      {notification && (
        <div 
          className={`p-3 rounded-[4px] border flex items-center justify-between animate-fade-in text-xs font-semibold ${
            notification.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
              : 'bg-red-500/10 border-red-500/20 text-red-500'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle size={14} className={notification.type === 'success' ? 'text-emerald-500' : 'text-red-500'} />
            <span>{notification.message}</span>
          </div>
          <button 
            onClick={() => setNotification(null)}
            className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded-sm hover:bg-gray-500/10 text-[var(--text-muted)] cursor-pointer"
          >
            {isRtl ? "إغلاق" : "CLOSE"}
          </button>
        </div>
      )}

      {/* View Header with Action Button */}
      <div 
        className={`p-5 rounded-sm border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-theme ${
          theme === "dark" 
            ? "bg-[#1a1a1c] border-gray-800/60" 
            : "bg-white border-gray-200 shadow-sm"
        }`}
      >
        <div>
          <h1 className="text-xl font-black uppercase text-[var(--text-primary)] flex items-center gap-2 tracking-tight">
            <Users size={22} className="text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            {isRtl ? "إدارة الإحالة والتبشير" : "REFERRAL ADOCACY MANAGEMENT"}
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1.5 font-medium max-w-2xl leading-relaxed">
            {isRtl 
              ? "تحليلات الدعوات، تتبع كبار المروجين، وتصدير قواعد البيانات الشاملة للإحالات في الوقت الفعلي."
              : "Real-time advocacy analytics, tracking top advocates, and exporting comprehensive referral registries."}
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            disabled={downloading}
            onClick={handleDownloadCSV}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-emerald-500 bg-emerald-500/5 hover:bg-emerald-500/10 active:scale-95 disabled:opacity-50 disabled:pointer-events-none rounded-[4px] border border-emerald-500/20 transition-theme cursor-pointer shadow-[0_0_12px_rgba(16,185,129,0.05)]`}
          >
            <Download size={14} className={downloading ? "animate-pulse" : ""} />
            <span>
              {downloading 
                ? (isRtl ? "جاري التصدير..." : "EXPORTING...") 
                : (isRtl ? "تصدير CSV" : "DOWNLOAD CSV")}
            </span>
          </button>
        </div>
      </div>

      {/* 1. Statistics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Sent */}
        <div
          className={`p-4 rounded-sm border transition-theme ${
            theme === "dark" 
              ? "bg-[#1a1a1c] border-gray-800/60" 
              : "bg-white border-gray-200 shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider">
              {isRtl ? "إجمالي الدعوات" : "TOTAL INVITATIONS"}
            </span>
            <div className={`p-1.5 rounded-sm bg-blue-500/10 text-blue-500`}>
              <Send size={15} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-[var(--text-primary)] font-sans">
              {summary.totalSent.toLocaleString()}
            </span>
          </div>
          <div className="text-[9px] text-gray-500 mt-1 font-medium leading-none uppercase">
            {isRtl ? "إجمالي دعوات الإحالة الصادرة" : "All dispatched referral invites"}
          </div>
        </div>

        {/* Total Accepted */}
        <div
          className={`p-4 rounded-sm border transition-theme ${
            theme === "dark" 
              ? "bg-[#1a1a1c] border-gray-800/60" 
              : "bg-white border-gray-200 shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider">
              {isRtl ? "الدعوات المقبولة" : "ACCEPTED CONVERSIONS"}
            </span>
            <div className={`p-1.5 rounded-sm bg-emerald-500/10 text-emerald-500`}>
              <CheckCircle size={15} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-500 font-sans">
              {summary.accepted.toLocaleString()}
            </span>
          </div>
          <div className="text-[9px] text-gray-500 mt-1 font-medium leading-none uppercase">
            {isRtl ? "مسجلون عبر الرابط بنجاح" : "Successfully converted users"}
          </div>
        </div>

        {/* Conversion Rate */}
        <div
          className={`p-4 rounded-sm border transition-theme ${
            theme === "dark" 
              ? "bg-[#1a1a1c] border-gray-800/60" 
              : "bg-white border-gray-200 shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider">
              {isRtl ? "معدل التحويل" : "CONVERSION RATE"}
            </span>
            <div className={`p-1.5 rounded-sm bg-purple-500/10 text-purple-500`}>
              <TrendingUp size={15} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-purple-500 font-sans">
              {summary.conversionRate}%
            </span>
          </div>
          <div className="mt-1 w-full bg-gray-200 dark:bg-gray-800 rounded-full h-1">
            <div 
              className="bg-purple-500 h-1 rounded-full transition-theme" 
              style={{ width: `${Math.min(summary.conversionRate, 100)}%` }}
            />
          </div>
        </div>

        {/* Pending / Reminded */}
        <div
          className={`p-4 rounded-sm border transition-theme ${
            theme === "dark" 
              ? "bg-[#1a1a1c] border-gray-800/60" 
              : "bg-white border-gray-200 shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider">
              {isRtl ? "الدعوات المعلقة" : "PENDING AUTHORIZATIONS"}
            </span>
            <div className={`p-1.5 rounded-sm bg-amber-500/10 text-amber-500`}>
              <Clock size={15} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-500 font-sans">
              {summary.pending.toLocaleString()}
            </span>
          </div>
          <div className="text-[9px] text-gray-500 mt-1 font-medium leading-none uppercase">
            {isRtl 
              ? `منها ${summary.reminded} تذكير مرسل` 
              : `Includes ${summary.reminded} standard reminders`}
          </div>
        </div>

        {/* Total Active Referrers */}
        <div
          className={`p-4 rounded-sm border transition-theme ${
            theme === "dark" 
              ? "bg-[#1a1a1c] border-gray-800/60" 
              : "bg-white border-gray-200 shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider">
              {isRtl ? "المحيلون المميزون" : "ACTIVE REFERRERS"}
            </span>
            <div className={`p-1.5 rounded-sm bg-amber-500/10 text-amber-500`}>
              <Users size={15} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-[var(--text-primary)] font-sans">
              {summary.totalReferrers.toLocaleString()}
            </span>
          </div>
          <div className="text-[9px] text-gray-500 mt-1 font-medium leading-none uppercase">
            {isRtl ? "إجمالي المستخدمين المحيلين" : "Uniquely referring users"}
          </div>
        </div>
      </div>

      {/* 2. 30-Day Daily Trend Chart */}
      <div
        className={`p-5 rounded-sm border transition-theme ${
          theme === "dark" 
            ? "bg-[#1a1a1c] border-gray-800/60" 
            : "bg-white border-gray-200 shadow-sm"
        }`}
      >
        <div className="flex items-center justify-between mb-6 pb-2 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <TrendingUp size={18} className="text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            <h2 className="text-sm font-black uppercase text-[var(--text-primary)]">
              {isRtl ? "منحنى الإحالات اليومي (آخر 30 يوم)" : "REFERRAL DISPATCH & CONVERSION TREND (LAST 30 DAYS)"}
            </h2>
          </div>
          <div className="flex items-center gap-4 text-[10px] font-bold font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500/80" />
              <span className="text-[var(--text-muted)] uppercase">{isRtl ? "مُرسل" : "SENT"}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-[var(--text-muted)] uppercase">{isRtl ? "مقبول" : "ACCEPTED"}</span>
            </div>
          </div>
        </div>

        <div className="h-64 w-full text-xs font-mono">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={dailyTrend}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorAccepted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === "dark" ? "#2a2a2c" : "#e5e7eb"} />
              <XAxis 
                dataKey="date" 
                stroke={theme === "dark" ? "#6b7280" : "#9ca3af"}
                tickLine={false}
                axisLine={false}
                tickFormatter={(str) => {
                  if (!str) return '';
                  const parts = str.split('-');
                  if (parts.length < 3) return str;
                  return `${parts[1]}/${parts[2]}`; // MM/DD
                }}
              />
              <YAxis 
                stroke={theme === "dark" ? "#6b7280" : "#9ca3af"}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: theme === "dark" ? "#1a1a1c" : "#ffffff",
                  borderColor: theme === "dark" ? "#374151" : "#e5e7eb",
                  color: "var(--text-primary)",
                  borderRadius: "4px",
                  fontSize: "11px",
                  fontFamily: "monospace"
                }}
                labelFormatter={(label) => {
                  return `${isRtl ? "التاريخ" : "Date"}: ${label}`;
                }}
              />
              <Area 
                type="monotone" 
                dataKey="sent" 
                name={isRtl ? "المرسل" : "Sent"}
                stroke="#3b82f6" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorSent)" 
              />
              <Area 
                type="monotone" 
                dataKey="accepted" 
                name={isRtl ? "المقبول" : "Accepted"}
                stroke="#10b981" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorAccepted)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. Structured Layout: Left Table & Right Activity List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Most Active Referrers & Top Performers */}
        <div
          className={`lg:col-span-2 p-5 rounded-sm border transition-theme ${
            theme === "dark" 
              ? "bg-[#1a1a1c] border-gray-800/60" 
              : "bg-white border-gray-200 shadow-sm"
          }`}
        >
          <div className="mb-4 pb-2 border-b border-[var(--border)] flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Tab Toggles */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setRankingTab("active")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-theme rounded-[4px] cursor-pointer ${
                  rankingTab === "active"
                    ? "text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)] bg-emerald-500/5 border border-emerald-500/10"
                    : "text-gray-400 hover:text-[var(--text-primary)] border border-transparent bg-transparent"
                }`}
              >
                <Award size={14} className={rankingTab === "active" ? "text-emerald-500" : "text-gray-400"} />
                <span>{isRtl ? "الأكثر نشاطاً" : "Most Active"}</span>
              </button>

              <div className="w-px h-5 bg-gray-200 dark:bg-gray-800/80" />

              <button
                onClick={() => setRankingTab("top_conversions")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-theme rounded-[4px] cursor-pointer ${
                  rankingTab === "top_conversions"
                    ? "text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)] bg-emerald-500/5 border border-emerald-500/10"
                    : "text-gray-400 hover:text-[var(--text-primary)] border border-transparent bg-transparent"
                }`}
              >
                <TrendingUp size={14} className={rankingTab === "top_conversions" ? "text-emerald-500" : "text-gray-400"} />
                <span>{isRtl ? "كبار المنجزين" : "Top Performers"}</span>
              </button>
            </div>

            {/* Search Query and Counts */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative w-full md:w-60">
                <span className="absolute inset-y-0 left-3 flex items-center text-gray-400 pointer-events-none">
                  <Search size={14} />
                </span>
                <input
                  type="text"
                  placeholder={isRtl ? "البحث بالاسم، المعرّف أو البريد..." : "Search by ID, Name or Email..."}
                  value={referrerSearch}
                  onChange={(e) => setReferrerSearch(e.target.value)}
                  className={`w-full text-xs pl-8 pr-3 py-1.5 rounded-[4px] border focus:outline-none transition-theme duration-[var(--theme-transition-duration)] ${
                    theme === "dark"
                      ? "bg-[#252528] border-gray-700/60 text-[var(--text-primary)] focus:border-emerald-500"
                      : "bg-gray-50 border-gray-200 text-[var(--text-primary)] focus:border-emerald-500 focus:bg-white"
                  }`}
                />
              </div>
              <span className="text-[10px] whitespace-nowrap font-mono font-bold bg-emerald-500/10 text-emerald-500 px-2.5 py-1.5 rounded-[4px]">
                {isRtl 
                  ? `العدد: ${(rankingTab === "active" ? filteredReferrers : filteredTopPerformers).length}` 
                  : `TOTAL: ${(rankingTab === "active" ? filteredReferrers : filteredTopPerformers).length}`}
              </span>
            </div>
          </div>

          {(rankingTab === "active" ? filteredReferrers : filteredTopPerformers).length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center text-[var(--text-muted)] animate-fade-in">
              <Gift size={32} className="opacity-30 mb-2" />
              <p className="text-xs font-semibold uppercase">
                {isRtl ? "لا توجد نتائج مطابقة" : "NO ADVOCATE MATCHES FOUND"}
              </p>
              <p className="text-[10px] mt-1 max-w-xs">
                {isRtl 
                  ? "جرّب استخدام كلمات مفاتيح مختلفة أو تحكّم بعبارة البحث." 
                  : "Try clearing search filter parameters or write specific names/IDs."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto animate-fade-in">
              <table className="w-full text-left border-collapse select-none">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[9px] font-black uppercase tracking-wider text-[var(--text-muted)]">
                    <th className="py-2.5 px-3 text-center w-12">{isRtl ? "الرتبة" : "RANK"}</th>
                    <th className="py-2.5 px-3">{isRtl ? "المحيل" : "ADVOCATE"}</th>
                    {rankingTab === "active" ? (
                      <>
                        <th className="py-2.5 px-3 text-center">{isRtl ? "الدعوات" : "INVITES"}</th>
                        <th className="py-2.5 px-3 text-center text-emerald-500">{isRtl ? "المقبولة" : "ACCEPTED"}</th>
                      </>
                    ) : (
                      <>
                        <th className="py-2.5 px-3 text-center text-emerald-500 font-extrabold">{isRtl ? "تحويلات ناجحة 🏆" : "CONVERSIONS 🏆"}</th>
                        <th className="py-2.5 px-3 text-center">{isRtl ? "إجمالي المحاولات" : "TOTAL ATTEMPTS"}</th>
                      </>
                    )}
                    <th className="py-2.5 px-3 text-center text-amber-500">{isRtl ? "المعلقة" : "PENDING"}</th>
                    <th className="py-2.5 px-3 text-right">{isRtl ? "معدل التحويل" : "CONVERSION"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]/30">
                  {(rankingTab === "active" ? filteredReferrers : filteredTopPerformers).map((ref, idx) => {
                    const isTopOne = idx === 0;
                    const glowClass = isTopOne 
                      ? "text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" 
                      : idx === 1 
                      ? "text-slate-400" 
                      : idx === 2 
                      ? "text-amber-700" 
                      : "text-[var(--text-muted)]";

                    return (
                      <tr 
                        key={ref.referrer_id} 
                        className="group hover:bg-gray-50/5 transition-theme text-xs font-medium text-[var(--text-secondary)]"
                      >
                        <td className="py-3 px-3 text-center font-black animate-fade-in">
                          <span className={`${glowClass}`}>
                            #{idx + 1}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex flex-col">
                            <span className="font-bold text-[var(--text-primary)] group-hover:text-emerald-500 transition-colors duration-200">
                              {ref.referrer_name}
                            </span>
                            <span className="text-[10px] text-[var(--text-muted)] font-mono">
                              ID: {ref.referrer_id} &bull; {ref.referrer_email}
                            </span>
                          </div>
                        </td>
                        {rankingTab === "active" ? (
                          <>
                            <td className="py-3 px-3 text-center font-bold font-sans">
                              {ref.total_sent}
                            </td>
                            <td className="py-3 px-3 text-center font-black text-emerald-500 font-sans">
                              {ref.total_accepted}
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="py-3 px-3 text-center font-black text-emerald-500 bg-emerald-500/5 font-sans border-x border-emerald-500/10">
                              {ref.total_accepted}
                            </td>
                            <td className="py-3 px-3 text-center font-bold text-[var(--text-secondary)] font-sans">
                              {ref.total_sent}
                            </td>
                          </>
                        )}
                        <td className="py-3 px-3 text-center font-bold text-amber-500/85 font-sans">
                          {ref.total_pending}
                        </td>
                        <td className="py-3 px-3 text-right font-sans">
                          <div className="flex flex-col items-end">
                            <span className="font-bold text-[var(--text-primary)]">
                              {ref.conversion_rate}%
                            </span>
                            <div className="w-20 bg-gray-200 dark:bg-gray-800 rounded-full h-1 mt-1 overflow-hidden">
                              <div 
                                className="bg-emerald-500 h-1 rounded-full transition-theme" 
                                style={{ width: `${Math.min(ref.conversion_rate, 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right: Recent Invitations stream */}
        <div
          className={`p-5 rounded-sm border transition-theme ${
            theme === "dark" 
              ? "bg-[#1a1a1c] border-gray-800/60" 
              : "bg-white border-gray-200 shadow-sm"
          }`}
        >
          <div className="mb-4 pb-2 border-b border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Mail size={18} className="text-blue-500" />
              <h2 className="text-sm font-black uppercase text-[var(--text-primary)]">
                {isRtl ? "أحدث الدعوات المرسلة" : "RECENT ACTIVITY FEED"}
              </h2>
            </div>
            <select
              value={inviteStatusFilter}
              onChange={(e) => setInviteStatusFilter(e.target.value as "all" | "accepted" | "pending")}
              className={`text-[10px] uppercase font-bold px-2 py-1.5 rounded-[4px] border focus:outline-none cursor-pointer transition-theme duration-[var(--theme-transition-duration)] ${
                theme === "dark" 
                  ? "bg-[#252528] border-gray-700/60 text-gray-300 focus:border-emerald-500" 
                  : "bg-gray-50 border-gray-200 text-gray-700 focus:border-emerald-500"
              }`}
            >
              <option value="all">{isRtl ? "الكل" : "ALL STATUSES"}</option>
              <option value="accepted">{isRtl ? "مقبول فقط" : "ACCEPTED ONLY"}</option>
              <option value="pending">{isRtl ? "معلق فقط" : "PENDING ONLY"}</option>
            </select>
          </div>

          {/* Bulk Selection and Batch Action row */}
          {remindableInvitationsInView.length > 0 && (
            <div className="mb-4 p-2.5 rounded-sm bg-gray-50/5 border border-[var(--border)] flex items-center justify-between gap-2 text-xs">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={(e) => {
                    if (e.target.checked) {
                      const newSelected: Record<number, boolean> = { ...selectedIds };
                      remindableInvitationsInView.forEach(invite => {
                        newSelected[invite.id] = true;
                      });
                      setSelectedIds(newSelected);
                    } else {
                      const newSelected = { ...selectedIds };
                      remindableInvitationsInView.forEach(invite => {
                        delete newSelected[invite.id];
                      });
                      setSelectedIds(newSelected);
                    }
                  }}
                  className="rounded-[4px] border-gray-300 dark:border-gray-800 text-emerald-500 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer accent-emerald-500"
                />
                <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">
                  {isRtl ? `تحديد الكل معلق (${remindableInvitationsInView.length})` : `Select All Pending (${remindableInvitationsInView.length})`}
                </span>
              </label>

              {selectedCount > 0 && (
                <button
                  disabled={sendingBulkReminder}
                  onClick={handleSendBulkReminder}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/15 active:scale-95 disabled:opacity-50 disabled:pointer-events-none rounded-[4px] border border-emerald-500/30 transition-theme cursor-pointer animate-fade-in"
                >
                  <Send size={10} className={sendingBulkReminder ? "animate-spin text-emerald-500" : "text-emerald-500"} />
                  <span>
                    {sendingBulkReminder
                      ? (isRtl ? "جاري الإرسال..." : "SENDING CHECKED...")
                      : (isRtl ? `تذكير المحدد (${selectedCount})` : `REMIND SELECTED (${selectedCount})`)}
                  </span>
                </button>
              )}
            </div>
          )}

          {filteredInvitations.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center text-[var(--text-muted)] min-h-[300px]">
              <Mail size={28} className="opacity-30 mb-2" />
              <p className="text-xs font-semibold uppercase">
                {isRtl ? "لا توجد دعوات مطابقة" : "NO MATCHING OUTBOUND TRAFFIC"}
              </p>
              <p className="text-[10px] mt-1 max-w-xs">
                {isRtl 
                  ? "تعديل خيار الفلتر لمشاهدة دعوات بحالات أخرى." 
                  : "Change state filters to observe dispatch traffic of other types."}
              </p>
            </div>
          ) : (
            <div className="space-y-3.5 max-h-[420px] overflow-y-auto pr-1 select-none custom-scrollbar">
              {filteredInvitations.map((invite) => {
                const badgeStyle = 
                  invite.status === "accepted" 
                    ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                    : invite.status === "reminded" 
                    ? "bg-amber-500/10 text-amber-500 border-amber-500/20" 
                    : "bg-blue-500/10 text-blue-500 border-blue-500/20";
                
                const statusLabel = 
                  invite.status === "accepted" 
                    ? (isRtl ? "مقبول" : "ACCEPTED") 
                    : invite.status === "reminded" 
                    ? (isRtl ? "تذكير" : "REMINDED") 
                    : (isRtl ? "مُرسل" : "SENT");
 
                const timeFormatted = new Date(invite.created_at).toLocaleDateString(
                  language === "ar" ? "ar-EG" : "en-US",
                  { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }
                );
 
                return (
                  <div 
                    key={invite.id}
                    className={`p-3 rounded-sm bg-gray-50/5 border transition-theme flex flex-col gap-2 animate-fade-in ${
                      selectedIds[invite.id] 
                        ? "border-emerald-500/50 bg-emerald-500/[0.01]" 
                        : "border-[var(--border)] hover:border-emerald-500/30"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 max-w-[190px]">
                        {invite.status !== "accepted" && (
                          <input
                            type="checkbox"
                            checked={!!selectedIds[invite.id]}
                            onChange={(e) => {
                              setSelectedIds(prev => {
                                const copy = { ...prev };
                                if (e.target.checked) {
                                  copy[invite.id] = true;
                                } else {
                                  delete copy[invite.id];
                                }
                                return copy;
                              });
                            }}
                            className="rounded-[4px] border-gray-300 dark:border-gray-800 text-emerald-500 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer accent-emerald-500"
                          />
                        )}
                        <span className="text-[11px] font-bold text-[var(--text-primary)] font-mono break-all truncate">
                          {invite.referred_email}
                        </span>
                      </div>
                      <span className={`text-[8px] font-black tracking-wider uppercase px-2 py-0.5 rounded-sm border ${badgeStyle}`}>
                        {statusLabel}
                      </span>
                    </div>
 
                    <div className="flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-1 text-[var(--text-muted)]">
                        <span className="font-semibold">{isRtl ? "بواسطة" : "By"}:</span>
                        <span className="text-[var(--text-secondary)] font-bold">{invite.referrer_name}</span>
                      </div>
                      <span className="text-[9px] text-[var(--text-muted)] font-bold font-mono">
                        {timeFormatted}
                      </span>
                    </div>
 
                    {invite.status !== "accepted" && (
                      <div className="mt-1 pt-1.5 border-t border-[var(--border)]/30 flex justify-end">
                        <button
                          disabled={sendingReminder[invite.id]}
                          onClick={() => handleSendReminder(invite.id)}
                          className="flex items-center gap-1 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-emerald-500 bg-emerald-500/5 hover:bg-emerald-500/10 active:scale-95 disabled:opacity-50 disabled:pointer-events-none rounded-[4px] border border-emerald-500/20 transition-theme cursor-pointer"
                        >
                          <Send size={10} className={sendingReminder[invite.id] ? "animate-spin text-emerald-500" : "text-emerald-500"} />
                          <span>
                            {sendingReminder[invite.id] 
                              ? (isRtl ? "جاري الإرسال..." : "SENDING...") 
                              : (isRtl ? "إرسال تذكير" : "REMIND")}
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

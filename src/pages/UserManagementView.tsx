import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppContext } from '../context/AppContext';
import {
  Users,
  Search,
  UserPlus,
  ChevronDown,
  Mail,
  Eye,
  Trash2,
  ShieldCheck,
  ShieldAlert,
  Wallet,
  CreditCard,
  Clock,
  Sparkles,
  RefreshCw,
  X,
  FileText,
  Activity,
  UserCheck,
  Lock,
  Star,
  Zap,
  CheckCircle2,
  XCircle,
  Send,
  PlusCircle,
  MinusCircle,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  Check,
  Building,
  Key,
  Layers,
  Settings,
  Calendar,
  DollarSign,
  Tag,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import { HighlightText } from '../components/HighlightText';

export interface UserManagementProps {
  theme: string;
  t: (key: string, replacements?: any) => string;
  dir: string;
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const UserManagementView: React.FC<UserManagementProps> = ({
  theme,
  t,
  dir,
  showToast,
}) => {
  const { plans, token, user: currentUser, refreshUser, socket } = useAppContext();
  const isRtl = dir === 'rtl';
  const isDark = theme === 'dark';

  // State Management
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbPlans, setDbPlans] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  const [kycFilter, setKycFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');

  // Data Grid Sorting & Pagination State
  const [sortField, setSortField] = useState<'name' | 'email' | 'role' | 'plan' | 'kyc' | 'status' | 'joined' | 'balance'>('joined');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Detail Modal State
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'wallet' | 'plan' | 'activity'>('profile');

  // Sub-data states for Selected User
  const [selectedUserUsage, setSelectedUserUsage] = useState<any>(null);
  const [isLoadingUsage, setIsLoadingUsage] = useState(false);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [userSubscription, setUserSubscription] = useState<any | null>(null);
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(false);
  const [userTransactions, setUserTransactions] = useState<any[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Forms & Dialogs
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user',
    initialBalance: '0',
    initialPoints: '0',
  });

  // Direct Email Dialog
  const [emailModalUser, setEmailModalUser] = useState<any | null>(null);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Wallet / Ledger Adjustments Form
  const [ledgerAmount, setLedgerAmount] = useState('');
  const [ledgerAction, setLedgerAction] = useState<'add' | 'deduct'>('add');
  const [ledgerReason, setLedgerReason] = useState('');
  const [ledgerUnit, setLedgerUnit] = useState<'PTS' | 'USD'>('PTS');
  const [supportNotes, setSupportNotes] = useState('');

  // Rejection Reason state
  const [kycRejectionReason, setKycRejectionReason] = useState('');

  // Fetch Database Plans Directly
  const fetchDbPlans = useCallback(async () => {
    try {
      const res = await fetch('/api/plans', {
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        setDbPlans(data);
      }
    } catch (err) {
      console.error('[UserManagement] Fetch db plans failed:', err);
    }
  }, []);

  useEffect(() => {
    fetchDbPlans();
  }, [fetchDbPlans]);

  // Normalize Plans Schema to prevent missing or zero fields
  const rawPlans = dbPlans.length > 0 ? dbPlans : plans;
  const normalizedPlans = (rawPlans || []).map((p: any) => ({
    id: (p.id || p.plan_id || '').toString(),
    nameAr: p.nameAr || p.name_ar || p.nameEn || p.name_en || 'الباقة',
    nameEn: p.nameEn || p.name_en || p.nameAr || p.name_ar || 'Plan',
    monthlyPrice: parseFloat((p.monthlyPrice ?? p.priceMonthly ?? p.price_monthly ?? p.monthly_price ?? 0).toString()),
    annualPrice: parseFloat((p.annualPrice ?? p.priceAnnual ?? p.price_annual ?? p.annual_price ?? 0).toString()),
    descAr: p.descAr || p.desc_ar || '',
    descEn: p.descEn || p.desc_en || '',
    color: p.color || '#334155',
    planType: p.planType || p.plan_type || 'user',
    badge: p.badge || 'none',
    features: Array.isArray(p.features) ? p.features : (typeof p.features === 'string' ? JSON.parse(p.features || '[]') : []),
    limits: typeof p.limits === 'object' && p.limits !== null ? p.limits : (typeof p.limits === 'string' ? JSON.parse(p.limits || '{}') : {}),
  }));

  const getPlanDetails = (planId: any) => {
    if (!planId) return normalizedPlans[0] || { id: 'free', color: '#334155', nameAr: 'مجاني', nameEn: 'Free', monthlyPrice: 0, annualPrice: 0, descAr: '', descEn: '', planType: 'user' };
    return (
      normalizedPlans.find((p) => p.id.toString() === planId.toString()) ||
      normalizedPlans[0] || { id: 'free', color: '#334155', nameAr: 'مجاني', nameEn: 'Free', monthlyPrice: 0, annualPrice: 0, descAr: '', descEn: '', planType: 'user' }
    );
  };

  // Fetch Users List
  const fetchUsers = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users', {
        signal,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          'Cache-Control': 'no-cache',
        },
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      console.error('[UserManagement] Fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const controller = new AbortController();
    if (token) fetchUsers(controller.signal);
    return () => controller.abort();
  }, [token, fetchUsers]);

  // Real-time & Auto-Sync State
  const [autoSync, setAutoSync] = useState(true);
  const [pollIntervalSeconds, setPollIntervalSeconds] = useState(10);
  const [lastSyncedTime, setLastSyncedTime] = useState<Date | null>(new Date());
  const [isSyncing, setIsSyncing] = useState(false);

  // Background Silent Sync for Zero-flicker Realtime
  const fetchUsersSilently = useCallback(async () => {
    if (!token) return;
    setIsSyncing(true);
    try {
      const res = await fetch('/api/admin/users', {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          'Cache-Control': 'no-cache',
        },
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
        setLastSyncedTime(new Date());

        // Keep selected user updated if modal is currently open
        if (selectedUser?.id) {
          const fresh = data.find((u: any) => u.id.toString() === selectedUser.id.toString());
          if (fresh) {
            setSelectedUser((prev: any) => (prev ? { ...prev, ...fresh } : null));
          }
        }
      }
    } catch (error) {
      console.error('[UserManagement] Silent sync error:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [token, selectedUser?.id]);

  // Realtime Socket Listeners
  useEffect(() => {
    if (!socket) return;

    const handleRealtimeUpdate = (data?: any) => {
      fetchUsersSilently();

      if (data?.userId && selectedUser?.id && data.userId.toString() === selectedUser.id.toString()) {
        if (data.action === 'plan_updated' || data.type === 'plan') {
          fetchUserSubscription(selectedUser.id);
        }
        if (data.action === 'balance_updated' || data.type === 'balance') {
          fetchUserTransactions(selectedUser.id);
        }
        if (data.action === 'activity' || data.type === 'activity') {
          fetchActivityLogs(selectedUser.id);
        }
      }
    };

    socket.on('user_management_update', handleRealtimeUpdate);
    socket.on('user_profile_updated', handleRealtimeUpdate);
    socket.on('admin_users_update', handleRealtimeUpdate);
    socket.on('kyc_status_updated', handleRealtimeUpdate);
    socket.on('subscription_updated', handleRealtimeUpdate);
    socket.on('wallet_updated', handleRealtimeUpdate);

    return () => {
      socket.off('user_management_update', handleRealtimeUpdate);
      socket.off('user_profile_updated', handleRealtimeUpdate);
      socket.off('admin_users_update', handleRealtimeUpdate);
      socket.off('kyc_status_updated', handleRealtimeUpdate);
      socket.off('subscription_updated', handleRealtimeUpdate);
      socket.off('wallet_updated', handleRealtimeUpdate);
    };
  }, [socket, fetchUsersSilently, selectedUser?.id]);

  // Polling Interval Effect
  useEffect(() => {
    if (!autoSync || !token) return;

    const timer = setInterval(() => {
      fetchUsersSilently();
    }, pollIntervalSeconds * 1000);

    return () => clearInterval(timer);
  }, [autoSync, pollIntervalSeconds, token, fetchUsersSilently]);

  // Sync support notes & kyc rejection reason when selectedUser changes
  useEffect(() => {
    if (selectedUser) {
      setSupportNotes(selectedUser.support_notes || '');
      setKycRejectionReason(selectedUser.kyc_rejection_reason || '');
    }
  }, [selectedUser]);

  // Fetch Sub-data for Selected User
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
      console.error('[UserManagement] Usage fetch failed:', error);
    } finally {
      setIsLoadingUsage(false);
    }
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
      console.error('[UserManagement] Activity logs fetch failed:', error);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const fetchUserSubscription = async (userId: string) => {
    setIsLoadingSubscription(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/subscription`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUserSubscription(data);
      }
    } catch (error) {
      console.error('[UserManagement] Subscription fetch failed:', error);
    } finally {
      setIsLoadingSubscription(false);
    }
  };

  const fetchUserTransactions = async (userId: string) => {
    setIsLoadingTransactions(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/transactions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUserTransactions(data);
      }
    } catch (error) {
      console.error('[UserManagement] Transactions fetch failed:', error);
    } finally {
      setIsLoadingTransactions(false);
    }
  };

  // Open User Detail Modal
  const handleOpenUserDetail = (user: any, initialTab: 'profile' | 'wallet' | 'plan' | 'activity' = 'profile') => {
    setSelectedUser(user);
    setActiveTab(initialTab);
    setIsDetailModalOpen(true);
    fetchUserUsage(user.id);
    fetchActivityLogs(user.id);
    fetchUserSubscription(user.id);
    fetchUserTransactions(user.id);
  };

  // Handlers for User Actions
  const handleUpdateRole = async (userId: string, newRole: string) => {
    if (userId === currentUser?.id?.toString() && newRole === 'user') {
      showToast(isRtl ? 'لا يمكنك خفض صلاحيات نفسك' : 'Cannot demote yourself', 'error');
      return;
    }

    setIsUpdating(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/permissions`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        showToast(isRtl ? `تم تحديث الدور إلى ${newRole}` : `Role updated to ${newRole}`, 'success');
        setUsers((prev) =>
          prev.map((u) => (u.id.toString() === userId.toString() ? { ...u, role: newRole } : u))
        );
        if (selectedUser?.id?.toString() === userId.toString()) {
          setSelectedUser((prev: any) => (prev ? { ...prev, role: newRole } : null));
        }
        if (currentUser?.id?.toString() === userId.toString()) {
          await refreshUser();
        }
      } else {
        const data = await res.json();
        showToast(data.error || (isRtl ? 'فشل تحديث الدور' : 'Failed to update role'), 'error');
      }
    } catch (error) {
      showToast(isRtl ? 'خطأ في الاتصال' : 'Connection error', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/permissions`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        showToast(
          isRtl
            ? `تم ${newStatus === 'active' ? 'تنشيط' : 'تجميد'} الحساب بنجاح`
            : `User ${newStatus === 'active' ? 'activated' : 'suspended'} successfully`,
          'success'
        );
        setUsers((prev) =>
          prev.map((u) =>
            u.id.toString() === userId.toString()
              ? { ...u, status: newStatus, subscription_status: newStatus }
              : u
          )
        );
        if (selectedUser?.id?.toString() === userId.toString()) {
          setSelectedUser((prev: any) =>
            prev ? { ...prev, status: newStatus, subscription_status: newStatus } : null
          );
        }
      } else {
        showToast(isRtl ? 'فشل تحديث حالة الحساب' : 'Failed to update status', 'error');
      }
    } catch (error) {
      showToast(isRtl ? 'خطأ في الاتصال' : 'Connection error', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateKYCVerificationStatus = async (
    userId: string,
    kycStatus: string,
    rejectionReason?: string
  ) => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/kyc-verification`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ kyc_status: kycStatus, rejection_reason: rejectionReason }),
      });
      if (res.ok) {
        showToast(isRtl ? 'تم تحديث حالة توثيق الهوية' : 'KYC verification status updated', 'success');
        setUsers((prev) =>
          prev.map((u) =>
            u.id.toString() === userId.toString()
              ? {
                  ...u,
                  kyc_status: kycStatus,
                  kyc_rejection_reason: rejectionReason || null,
                  kyc_required: kycStatus === 'verified' ? false : u.kyc_required,
                }
              : u
          )
        );
        if (selectedUser?.id?.toString() === userId.toString()) {
          setSelectedUser((prev: any) =>
            prev
              ? {
                  ...prev,
                  kyc_status: kycStatus,
                  kyc_rejection_reason: rejectionReason || null,
                  kyc_required: kycStatus === 'verified' ? false : prev.kyc_required,
                }
              : null
          );
        }
        if (currentUser?.id?.toString() === userId.toString()) {
          await refreshUser();
        }
      } else {
        showToast(isRtl ? 'فشل تحديث حالة التوثيق' : 'Failed to update verification status', 'error');
      }
    } catch (error) {
      showToast(isRtl ? 'خطأ في الاتصال' : 'Connection error', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteKYCSelfie = async (userId: string) => {
    if (!confirm(isRtl ? 'هل أنت متأكد من حذف صورة التوثيق؟' : 'Are you sure you want to delete this selfie?')) return;
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/kyc-selfie`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showToast(isRtl ? 'تم حذف صورة التوثيق بنجاح' : 'Selfie deleted successfully', 'success');
        setUsers((prev) =>
          prev.map((u) =>
            u.id.toString() === userId.toString()
              ? { ...u, kyc_selfie: null, kyc_full_name: null }
              : u
          )
        );
        if (selectedUser?.id?.toString() === userId.toString()) {
          setSelectedUser((prev: any) =>
            prev ? { ...prev, kyc_selfie: null, kyc_full_name: null } : null
          );
        }
      } else {
        showToast(isRtl ? 'فشل حذف الصورة' : 'Failed to delete selfie', 'error');
      }
    } catch (error) {
      showToast(isRtl ? 'خطأ في الاتصال' : 'Connection error', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    const amountNum = parseFloat(ledgerAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      showToast(isRtl ? 'يرجى إدخال مبلغ صحيح' : 'Please enter a valid amount', 'error');
      return;
    }

    setIsUpdating(true);
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}/balance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: amountNum,
          reason: ledgerReason || (isRtl ? 'تعديل إداري' : 'Administrative adjustment'),
          type: ledgerAction,
          unit: ledgerUnit,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        showToast(isRtl ? 'تم تسوية الرصيد بنجاح' : 'Balance adjusted successfully', 'success');
        setUsers((prev) =>
          prev.map((u) =>
            u.id.toString() === selectedUser.id.toString()
              ? { ...u, balance: data.newBalance, points: data.newPoints }
              : u
          )
        );
        setSelectedUser((prev: any) =>
          prev ? { ...prev, balance: data.newBalance, points: data.newPoints } : null
        );
        setLedgerAmount('');
        setLedgerReason('');
        fetchUserTransactions(selectedUser.id);
      } else {
        const err = await res.json();
        showToast(err.error || (isRtl ? 'فشل تعديل الرصيد' : 'Failed to adjust balance'), 'error');
      }
    } catch (error) {
      showToast(isRtl ? 'خطأ في الاتصال' : 'Connection error', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdatePlan = async (userId: string, planId: string) => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/plan`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ planId }),
      });
      if (res.ok) {
        showToast(isRtl ? 'تم تحديث اشتراك الباقة بنجاح' : 'Subscription updated successfully', 'success');
        const updatedPlan = getPlanDetails(planId);
        
        setUsers((prev) =>
          prev.map((u) =>
            u.id.toString() === userId.toString()
              ? {
                  ...u,
                  plan_id: planId,
                  plan_name: updatedPlan.nameEn,
                }
              : u
          )
        );
        if (selectedUser?.id?.toString() === userId.toString()) {
          setSelectedUser((prev: any) =>
            prev
              ? {
                  ...prev,
                  plan_id: planId,
                  plan_name: updatedPlan.nameEn,
                }
              : null
          );
          fetchUserSubscription(userId);
        }
        if (currentUser?.id?.toString() === userId.toString()) {
          await refreshUser();
        }
      } else {
        const err = await res.json();
        showToast(err.error || (isRtl ? 'فشل تحديث اشتراك الباقة' : 'Failed to update subscription'), 'error');
      }
    } catch (error) {
      showToast(isRtl ? 'خطأ في الاتصال' : 'Connection error', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveSupportNotes = async () => {
    if (!selectedUser) return;
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}/support-notes`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ notes: supportNotes }),
      });
      if (res.ok) {
        showToast(isRtl ? 'تم حفظ ملاحظات الدعم' : 'Support notes updated', 'success');
        setUsers((prev) =>
          prev.map((u) =>
            u.id.toString() === selectedUser.id.toString()
              ? { ...u, support_notes: supportNotes }
              : u
          )
        );
        setSelectedUser((prev: any) => (prev ? { ...prev, support_notes: supportNotes } : null));
      } else {
        showToast(isRtl ? 'فشل حفظ الملاحظات' : 'Failed to update support notes', 'error');
      }
    } catch (error) {
      showToast(isRtl ? 'خطأ في الاتصال' : 'Connection error', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSendEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailModalUser || !emailSubject.trim() || !emailBody.trim()) {
      showToast(isRtl ? 'يرجى إكمال عنوان ونص الرسالة' : 'Subject and body are required', 'error');
      return;
    }

    setIsSendingEmail(true);
    try {
      const res = await fetch(`/api/admin/users/${emailModalUser.id}/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ subject: emailSubject, body: emailBody }),
      });

      if (res.ok) {
        showToast(isRtl ? 'تم إرسال الرسالة الإلكترونية بنجاح' : 'Email sent successfully', 'success');
        setEmailModalUser(null);
        setEmailSubject('');
        setEmailBody('');
      } else {
        const data = await res.json();
        showToast(data.error || (isRtl ? 'فشل إرسال البريد' : 'Failed to send email'), 'error');
      }
    } catch (error) {
      showToast(isRtl ? 'خطأ أثناء الإرسال' : 'Failed to send email', 'error');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (userId === currentUser?.id?.toString()) {
      showToast(isRtl ? 'لا يمكنك حذف حسابك الشخصي' : 'Cannot delete yourself', 'error');
      return;
    }

    if (
      !confirm(
        isRtl
          ? 'هل أنت متأكد من حذف هذا المستخدم نهائياً؟ سيتم إلغاء كافة بياناته ورصيده بصفة قطعية.'
          : 'Are you sure you want to delete this user? All their data and wallet will be permanently removed.'
      )
    )
      return;

    setIsUpdating(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showToast(isRtl ? 'تم حذف المستخدم بنجاح' : 'User deleted successfully', 'success');
        setUsers((prev) => prev.filter((u) => u.id.toString() !== userId.toString()));
        if (selectedUser?.id?.toString() === userId.toString()) {
          setIsDetailModalOpen(false);
          setSelectedUser(null);
        }
      } else {
        const data = await res.json();
        showToast(data.error || (isRtl ? 'فشل حذف المستخدم' : 'Failed to delete user'), 'error');
      }
    } catch (error) {
      showToast(isRtl ? 'خطأ في الاتصال' : 'Connection error', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.name || !newUser.email || !newUser.password) {
      showToast(isRtl ? 'يرجى إكمال الحقول المطلوبة' : 'Name, email and password are required', 'error');
      return;
    }

    setIsUpdating(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newUser),
      });

      if (res.ok) {
        showToast(isRtl ? 'تم إنشاء حساب المستخدم بنجاح' : 'User created successfully', 'success');
        setIsCreateModalOpen(false);
        setNewUser({
          name: '',
          email: '',
          password: '',
          role: 'user',
          initialBalance: '0',
          initialPoints: '0',
        });
        fetchUsers();
      } else {
        const data = await res.json();
        showToast(data.error || (isRtl ? 'فشل إنشاء الحساب' : 'Failed to create user'), 'error');
      }
    } catch (error) {
      showToast(isRtl ? 'خطأ في الاتصال' : 'Connection error', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  // Filtered Users List
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      (u.name && u.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      u.id.toString().includes(searchQuery);

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && (u.status === 'active' || u.subscription_status === 'active')) ||
      (statusFilter === 'suspended' && (u.status === 'suspended' || u.subscription_status === 'suspended'));

    const matchesPlan =
      planFilter === 'all' || u.plan_id?.toString() === planFilter.toString();

    const matchesKyc =
      kycFilter === 'all' ||
      (kycFilter === 'verified' && u.kyc_status === 'verified') ||
      (kycFilter === 'pending' && u.kyc_status === 'pending') ||
      (kycFilter === 'unverified' && (!u.kyc_status || u.kyc_status === 'none' || u.kyc_status === 'rejected'));

    const matchesRole = roleFilter === 'all' || u.role === roleFilter;

    return matchesSearch && matchesStatus && matchesPlan && matchesKyc && matchesRole;
  });

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, planFilter, kycFilter, roleFilter, pageSize]);

  // Column Sort Handler
  const handleSort = (field: 'name' | 'email' | 'role' | 'plan' | 'kyc' | 'status' | 'joined' | 'balance') => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Sorted Users List
  const sortedUsers = React.useMemo(() => {
    return [...filteredUsers].sort((a, b) => {
      let valA: any = '';
      let valB: any = '';

      switch (sortField) {
        case 'name':
          valA = (a.name || '').toLowerCase();
          valB = (b.name || '').toLowerCase();
          break;
        case 'email':
          valA = (a.email || '').toLowerCase();
          valB = (b.email || '').toLowerCase();
          break;
        case 'role':
          valA = (a.role || 'user').toLowerCase();
          valB = (b.role || 'user').toLowerCase();
          break;
        case 'plan':
          valA = (a.plan_id || '').toString();
          valB = (b.plan_id || '').toString();
          break;
        case 'kyc':
          valA = (a.kyc_status || 'none').toLowerCase();
          valB = (b.kyc_status || 'none').toLowerCase();
          break;
        case 'status':
          valA = (a.status || a.subscription_status || 'active').toLowerCase();
          valB = (b.status || b.subscription_status || 'active').toLowerCase();
          break;
        case 'balance':
          valA = Number(a.balance || 0);
          valB = Number(b.balance || 0);
          break;
        case 'joined':
        default:
          valA = new Date(a.created_at || a.createdAt || 0).getTime() || Number(a.id) || 0;
          valB = new Date(b.created_at || b.createdAt || 0).getTime() || Number(b.id) || 0;
          break;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredUsers, sortField, sortOrder]);

  // Data Grid Pagination calculations
  const totalPages = Math.max(1, Math.ceil(sortedUsers.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const paginatedUsers = sortedUsers.slice(startIndex, startIndex + pageSize);

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Command Center Header */}
      <div className={`p-6 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
        isDark ? 'bg-[#161618] border-gray-800' : 'bg-white border-gray-200 shadow-sm'
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shadow-[0_0_15px_rgba(156,163,175,0.15)]">
            <Users size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight flex items-center gap-2">
              <span>{isRtl ? 'إدارة المستخدمين والاشتراكات' : 'User & Subscription Command Center'}</span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/30">
                {users.length} {isRtl ? 'مستخدم' : 'Users'}
              </span>
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {isRtl
                ? 'إدارة الحسابات، ترقية الباقات، تسوية الرصيد، وتوثيق الهوية بمرجعية لحظية موثوقة'
                : 'Real-time database administration for accounts, plans, balance adjustments, and KYC'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Live Sync Status Badge */}
          <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 text-xs font-mono font-bold transition-all ${
            isDark ? 'bg-black/30 border-gray-800 text-gray-300' : 'bg-gray-100 border-gray-200 text-gray-700'
          }`}>
            <span className="relative flex h-2.5 w-2.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${autoSync ? 'bg-accent opacity-75' : 'bg-amber-400 opacity-75'}`}></span>
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${autoSync ? 'bg-accent' : 'bg-amber-500'}`}></span>
            </span>
            <span className="text-[11px]">
              {autoSync 
                ? (socket?.connected ? (isRtl ? 'اتصال لحظي (Socket)' : 'Live WebSocket') : (isRtl ? `تحديث تلقائي (${pollIntervalSeconds}ث)` : `Auto Sync (${pollIntervalSeconds}s)`))
                : (isRtl ? 'المزامنة متوقفة' : 'Sync Paused')}
            </span>
            {lastSyncedTime && (
              <span className="text-[10px] text-gray-400 font-normal border-l dark:border-gray-800 ltr:pl-2 rtl:pr-2 rtl:border-r rtl:border-l-0">
                {lastSyncedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            )}
          </div>

          {/* Auto-Sync Toggle & Interval Selector */}
          <div className={`flex items-center rounded-xl border p-1 text-xs font-bold ${
            isDark ? 'bg-black/20 border-gray-800' : 'bg-gray-50 border-gray-200'
          }`}>
            <button
              onClick={() => setAutoSync(!autoSync)}
              className={`px-2.5 py-1 rounded-lg text-[10px] uppercase tracking-wider font-extrabold transition-all ${
                autoSync
                  ? 'bg-accent text-black shadow-sm'
                  : (isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-black')
              }`}
              title={isRtl ? 'تبديل المزامنة التلقائية' : 'Toggle Real-Time Auto Sync'}
            >
              {autoSync ? (isRtl ? 'مباشر' : 'LIVE') : (isRtl ? 'يدوي' : 'MANUAL')}
            </button>

            {autoSync && (
              <select
                value={pollIntervalSeconds}
                onChange={(e) => setPollIntervalSeconds(Number(e.target.value))}
                className={`bg-transparent text-[10px] font-mono font-bold focus:outline-none cursor-pointer px-1.5 ${
                  isDark ? 'text-accent' : 'text-accent'
                }`}
              >
                <option value={5} className={isDark ? 'bg-gray-900 text-white' : 'bg-white text-black'}>5s</option>
                <option value={10} className={isDark ? 'bg-gray-900 text-white' : 'bg-white text-black'}>10s</option>
                <option value={20} className={isDark ? 'bg-gray-900 text-white' : 'bg-white text-black'}>20s</option>
                <option value={30} className={isDark ? 'bg-gray-900 text-white' : 'bg-white text-black'}>30s</option>
              </select>
            )}
          </div>

          {/* Manual Refresh Button */}
          <button
            onClick={() => {
              fetchUsersSilently();
              fetchDbPlans();
            }}
            disabled={loading || isSyncing}
            className={`p-2.5 rounded-xl border transition-all flex items-center gap-2 text-xs font-bold ${
              isDark ? 'bg-gray-800/80 hover:bg-gray-700 text-gray-200 border-gray-700' : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-200'
            }`}
            title={isRtl ? 'تحديث البيانات فوراً' : 'Force Refresh Data'}
          >
            <RefreshCw size={14} className={loading || isSyncing ? 'animate-spin text-accent' : ''} />
            <span>{isRtl ? 'مزامنة الآن' : 'Sync Now'}</span>
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-accent hover:bg-accent text-black font-black text-xs flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(156,163,175,0.3)]"
          >
            <UserPlus size={16} />
            <span>{isRtl ? 'إضافة مستخدم جديد' : 'Add New Explorer'}</span>
          </button>
        </div>
      </div>

      {/* 2. Advanced Multi-level Search & Filtering Bar */}
      <div className={`p-4 rounded-2xl border space-y-3 ${
        isDark ? 'bg-[#161618] border-gray-800' : 'bg-white border-gray-200 shadow-sm'
      }`}>
        <div className="relative">
          <Search size={16} className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isRtl ? 'بحث باسم المستخدم، البريد الإلكتروني، أو المصرّح المالي #ID...' : 'Search name, email, or user ID...'}
            className={`w-full ltr:pl-9 ltr:pr-4 rtl:pr-9 rtl:pl-4 py-2.5 rounded-xl border text-xs focus:outline-none focus:border-accent/50 ${
              isDark ? 'bg-[#0f0f11] border-gray-800 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'
            }`}
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`w-full p-2.5 rounded-xl border text-xs font-bold appearance-none cursor-pointer ${
                isDark ? 'bg-[#0f0f11] border-gray-800 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-700'
              }`}
            >
              <option value="all">{isRtl ? 'جميع الحالات' : 'All Statuses'}</option>
              <option value="active">{isRtl ? 'الحسابات النشطة' : 'Active Only'}</option>
              <option value="suspended">{isRtl ? 'الحسابات المعطلة' : 'Suspended Only'}</option>
            </select>
            <ChevronDown size={14} className="absolute ltr:right-2.5 rtl:left-2.5 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none" />
          </div>

          {/* Plan Filter */}
          <div className="relative">
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className={`w-full p-2.5 rounded-xl border text-xs font-bold appearance-none cursor-pointer ${
                isDark ? 'bg-[#0f0f11] border-gray-800 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-700'
              }`}
            >
              <option value="all">{isRtl ? 'جميع الباقات' : 'All Tiers'}</option>
              {normalizedPlans.map((p) => (
                <option key={p.id} value={p.id}>
                  {isRtl ? p.nameAr : p.nameEn}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute ltr:right-2.5 rtl:left-2.5 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none" />
          </div>

          {/* KYC Filter */}
          <div className="relative">
            <select
              value={kycFilter}
              onChange={(e) => setKycFilter(e.target.value)}
              className={`w-full p-2.5 rounded-xl border text-xs font-bold appearance-none cursor-pointer ${
                isDark ? 'bg-[#0f0f11] border-gray-800 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-700'
              }`}
            >
              <option value="all">{isRtl ? 'جميع حالات التوثيق' : 'All KYC'}</option>
              <option value="verified">{isRtl ? 'موثق رسمياً' : 'Verified'}</option>
              <option value="pending">{isRtl ? 'قيد المراجعة' : 'Pending'}</option>
              <option value="unverified">{isRtl ? 'غير موثق' : 'Unverified'}</option>
            </select>
            <ChevronDown size={14} className="absolute ltr:right-2.5 rtl:left-2.5 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none" />
          </div>

          {/* Role Filter */}
          <div className="relative">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className={`w-full p-2.5 rounded-xl border text-xs font-bold appearance-none cursor-pointer ${
                isDark ? 'bg-[#0f0f11] border-gray-800 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-700'
              }`}
            >
              <option value="all">{isRtl ? 'جميع الصلاحيات' : 'All Roles'}</option>
              <option value="user">{isRtl ? 'مستخدم عادي' : 'Standard User'}</option>
              
              <option value="admin">{isRtl ? 'مدير نظام' : 'Admin'}</option>
            </select>
            <ChevronDown size={14} className="absolute ltr:right-2.5 rtl:left-2.5 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* 3. Primary Users Data Grid */}
      <div className={`rounded-2xl border overflow-hidden transition-all ${
        isDark ? 'bg-[#161618] border-gray-800' : 'bg-white border-gray-200 shadow-sm'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-right rtl:text-right ltr:text-left border-collapse">
            <thead>
              <tr className={`border-b text-[10px] font-black uppercase tracking-wider select-none ${
                isDark ? 'border-gray-800/80 bg-[#121214] text-gray-400' : 'border-gray-100 bg-gray-50 text-gray-500'
              }`}>
                {/* 1. User Name & Email */}
                <th className="px-5 py-4">
                  <button
                    type="button"
                    onClick={() => handleSort('name')}
                    className={`inline-flex items-center gap-1.5 transition-colors focus:outline-none ${
                      sortField === 'name' ? 'text-accent font-extrabold' : 'hover:text-accent'
                    }`}
                  >
                    <span>{isRtl ? 'المستخدم' : 'Explorer'}</span>
                    {sortField === 'name' ? (
                      sortOrder === 'asc' ? <ArrowUp size={12} className="text-accent" /> : <ArrowDown size={12} className="text-accent" />
                    ) : (
                      <ArrowUpDown size={11} className="opacity-40 hover:opacity-100" />
                    )}
                  </button>
                </th>

                {/* 2. Role */}
                <th className="px-5 py-4">
                  <button
                    type="button"
                    onClick={() => handleSort('role')}
                    className={`inline-flex items-center gap-1.5 transition-colors focus:outline-none ${
                      sortField === 'role' ? 'text-accent font-extrabold' : 'hover:text-accent'
                    }`}
                  >
                    <span>{isRtl ? 'الدور / الصلاحية' : 'Role'}</span>
                    {sortField === 'role' ? (
                      sortOrder === 'asc' ? <ArrowUp size={12} className="text-accent" /> : <ArrowDown size={12} className="text-accent" />
                    ) : (
                      <ArrowUpDown size={11} className="opacity-40 hover:opacity-100" />
                    )}
                  </button>
                </th>

                {/* 3. Active Tier / Plan */}
                <th className="px-5 py-4">
                  <button
                    type="button"
                    onClick={() => handleSort('plan')}
                    className={`inline-flex items-center gap-1.5 transition-colors focus:outline-none ${
                      sortField === 'plan' ? 'text-accent font-extrabold' : 'hover:text-accent'
                    }`}
                  >
                    <span>{isRtl ? 'الباقة الحالية' : 'Active Tier'}</span>
                    {sortField === 'plan' ? (
                      sortOrder === 'asc' ? <ArrowUp size={12} className="text-accent" /> : <ArrowDown size={12} className="text-accent" />
                    ) : (
                      <ArrowUpDown size={11} className="opacity-40 hover:opacity-100" />
                    )}
                  </button>
                </th>

                {/* 4. KYC Status */}
                <th className="px-5 py-4">
                  <button
                    type="button"
                    onClick={() => handleSort('kyc')}
                    className={`inline-flex items-center gap-1.5 transition-colors focus:outline-none ${
                      sortField === 'kyc' ? 'text-accent font-extrabold' : 'hover:text-accent'
                    }`}
                  >
                    <span>{isRtl ? 'توثيق الهوية' : 'KYC Status'}</span>
                    {sortField === 'kyc' ? (
                      sortOrder === 'asc' ? <ArrowUp size={12} className="text-accent" /> : <ArrowDown size={12} className="text-accent" />
                    ) : (
                      <ArrowUpDown size={11} className="opacity-40 hover:opacity-100" />
                    )}
                  </button>
                </th>

                {/* 5. Account Status */}
                <th className="px-5 py-4">
                  <button
                    type="button"
                    onClick={() => handleSort('status')}
                    className={`inline-flex items-center gap-1.5 transition-colors focus:outline-none ${
                      sortField === 'status' ? 'text-accent font-extrabold' : 'hover:text-accent'
                    }`}
                  >
                    <span>{isRtl ? 'الحالة' : 'Status'}</span>
                    {sortField === 'status' ? (
                      sortOrder === 'asc' ? <ArrowUp size={12} className="text-accent" /> : <ArrowDown size={12} className="text-accent" />
                    ) : (
                      <ArrowUpDown size={11} className="opacity-40 hover:opacity-100" />
                    )}
                  </button>
                </th>

                {/* 6. Balance & Points */}
                <th className="px-5 py-4">
                  <button
                    type="button"
                    onClick={() => handleSort('balance')}
                    className={`inline-flex items-center gap-1.5 transition-colors focus:outline-none ${
                      sortField === 'balance' ? 'text-accent font-extrabold' : 'hover:text-accent'
                    }`}
                  >
                    <span>{isRtl ? 'الرصيد والنقاط' : 'Balance & PTS'}</span>
                    {sortField === 'balance' ? (
                      sortOrder === 'asc' ? <ArrowUp size={12} className="text-accent" /> : <ArrowDown size={12} className="text-accent" />
                    ) : (
                      <ArrowUpDown size={11} className="opacity-40 hover:opacity-100" />
                    )}
                  </button>
                </th>

                {/* 7. Joined Date */}
                <th className="px-5 py-4">
                  <button
                    type="button"
                    onClick={() => handleSort('joined')}
                    className={`inline-flex items-center gap-1.5 transition-colors focus:outline-none ${
                      sortField === 'joined' ? 'text-accent font-extrabold' : 'hover:text-accent'
                    }`}
                  >
                    <span>{isRtl ? 'تاريخ الانضمام' : 'Joined Date'}</span>
                    {sortField === 'joined' ? (
                      sortOrder === 'asc' ? <ArrowUp size={12} className="text-accent" /> : <ArrowDown size={12} className="text-accent" />
                    ) : (
                      <ArrowUpDown size={11} className="opacity-40 hover:opacity-100" />
                    )}
                  </button>
                </th>

                {/* 8. Actions */}
                <th className="px-5 py-4 ltr:text-right rtl:text-left">{isRtl ? 'إجراءات فورية' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-gray-800/40' : 'divide-gray-100'}`}>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-10 h-10 border-2 border-accent/20 border-t-accent-500 rounded-full animate-spin" />
                      <span className="text-xs font-bold text-accent animate-pulse">
                        {isRtl ? 'جاري مزامنة بيانات المستخدمين...' : 'Syncing Galaxy Users...'}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : paginatedUsers.length > 0 ? (
                <AnimatePresence mode="popLayout" initial={false}>
                  {paginatedUsers.map((user) => {
                    const plan = getPlanDetails(user.plan_id);
                    const isUserActive = (user.status || user.subscription_status) === 'active';

                    return (
                      <motion.tr
                        key={user.id}
                        layout
                        initial={{ opacity: 0, y: 10, scale: 0.99 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.98, transition: { duration: 0.15 } }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className={`group transition-colors ${
                          isDark ? 'hover:bg-[#1a1a1e]' : 'hover:bg-gray-50/80'
                        }`}
                      >
                      {/* User Info */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className={`w-9 h-9 rounded-lg border flex items-center justify-center overflow-hidden shrink-0 transition-colors ${
                              isDark ? 'bg-gray-800 border-gray-700/80 group-hover:border-accent/50' : 'bg-gray-100 border-gray-200 group-hover:border-accent/50'
                            }`}>
                              {user.avatar ? (
                                <img
                                  src={user.avatar}
                                  alt=""
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <Users size={16} className="text-gray-400" />
                              )}
                            </div>
                            {isUserActive && (
                              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-accent rounded-full border-2 border-white dark:border-[#161618] " />
                            )}
                          </div>
                          <div>
                            <div className={`font-bold text-xs transition-colors flex items-center gap-2 ${
                              isDark ? 'text-white group-hover:text-accent' : 'text-gray-900 group-hover:text-accent'
                            }`}>
                              <HighlightText text={user.name || ''} query={searchQuery} />
                              <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-gray-500/10 text-gray-400">
                                #{user.id}
                              </span>
                            </div>
                            <div className="text-[11px] font-mono text-gray-500">
                              <HighlightText text={user.email || ''} query={searchQuery} />
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Inline Role Selector */}
                      <td className="px-5 py-3.5">
                        <div className="relative min-w-[105px]">
                          <select
                            value={user.role || 'user'}
                            onChange={(e) => handleUpdateRole(user.id.toString(), e.target.value)}
                            disabled={isUpdating}
                            className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md border appearance-none w-full text-center focus:outline-none cursor-pointer transition-all ${
                              user.role === 'admin'
                                ? 'text-purple-500 border-purple-500/30 bg-purple-500/10'
                                : isDark
                                ? 'text-gray-400 border-gray-800 bg-[#0f0f11]'
                                : 'text-gray-600 border-gray-200 bg-gray-50'
                            }`}
                          >
                            <option value="user" className={isDark ? 'bg-[#0f0f11] text-white' : 'bg-white text-black'}>{isRtl ? 'مستخدم' : 'User'}</option>
                            
                            <option value="admin" className={isDark ? 'bg-[#0f0f11] text-white' : 'bg-white text-black'}>{isRtl ? 'مدير نظام' : 'Admin'}</option>
                          </select>
                          <ChevronDown size={10} className="absolute ltr:right-2 rtl:left-2 top-1/2 -translate-y-1/2 opacity-40 pointer-events-none text-gray-400" />
                        </div>
                      </td>

                      {/* Inline Subscription Plan Selector */}
                      <td className="px-5 py-3.5">
                        <div className="relative min-w-[120px]">
                          <select
                            value={user.plan_id || 'free'}
                            onChange={(e) => handleUpdatePlan(user.id.toString(), e.target.value)}
                            disabled={isUpdating}
                            className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md border appearance-none w-full text-center focus:outline-none cursor-pointer transition-all"
                            style={{
                              backgroundColor: `${plan.color}15`,
                              color: plan.color,
                              borderColor: `${plan.color}35`,
                            }}
                          >
                            {normalizedPlans.map((p) => (
                              <option
                                key={p.id}
                                value={p.id}
                                className={isDark ? 'bg-[#0f0f11] text-white' : 'bg-white text-black'}
                              >
                                {isRtl ? p.nameAr : p.nameEn}
                              </option>
                            ))}
                          </select>
                          <ChevronDown
                            size={10}
                            className="absolute ltr:right-2 rtl:left-2 top-1/2 -translate-y-1/2 opacity-60 pointer-events-none"
                            style={{ color: plan.color }}
                          />
                        </div>
                      </td>

                      {/* KYC Status */}
                      <td className="px-5 py-3.5">
                        <div
                          className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1.5 border ${
                            user.kyc_status === 'verified'
                              ? 'bg-accent/10 text-accent border-accent/30'
                              : user.kyc_status === 'pending'
                              ? 'bg-amber-500/10 text-amber-500 border-amber-500/30 animate-pulse'
                              : user.kyc_status === 'rejected'
                              ? 'bg-red-500/10 text-red-500 border-red-500/30'
                              : isDark
                              ? 'bg-gray-800/40 text-gray-400 border-gray-800'
                              : 'bg-gray-100 text-gray-500 border-gray-200'
                          }`}
                        >
                          <div
                            className={`w-1.5 h-1.5 rounded-full ${
                              user.kyc_status === 'verified'
                                ? 'bg-accent'
                                : user.kyc_status === 'pending'
                                ? 'bg-amber-500'
                                : user.kyc_status === 'rejected'
                                ? 'bg-red-500'
                                : 'bg-gray-400'
                            }`}
                          />
                          <span>
                            {user.kyc_status === 'verified'
                              ? (isRtl ? 'موثق' : 'Verified')
                              : user.kyc_status === 'pending'
                              ? (isRtl ? 'مراجعة' : 'Pending')
                              : user.kyc_status === 'rejected'
                              ? (isRtl ? 'مرفوض' : 'Rejected')
                              : (isRtl ? 'غير موثق' : 'None')}
                          </span>
                        </div>
                      </td>

                      {/* Account Status Inline Toggle */}
                      <td className="px-5 py-3.5">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(user.id.toString(), user.status || user.subscription_status || 'active')}
                          disabled={isUpdating}
                          className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1.5 border transition-all cursor-pointer ${
                            isUserActive
                              ? 'bg-accent/10 text-accent border-accent/30 hover:bg-amber-500/20 hover:text-amber-500 hover:border-amber-500/40'
                              : 'bg-red-500/10 text-red-500 border-red-500/30 hover:bg-accent/20 hover:text-accent hover:border-accent/40'
                          }`}
                          title={isRtl ? 'تغيير حالة الحساب' : 'Toggle Account Status'}
                        >
                          <div className={`w-1.5 h-1.5 rounded-full ${isUserActive ? 'bg-accent' : 'bg-red-500'}`} />
                          <span>{isUserActive ? (isRtl ? 'نشط' : 'Active') : (isRtl ? 'معطل' : 'Suspended')}</span>
                        </button>
                      </td>

                      {/* Balance & Points */}
                      <td className="px-5 py-3.5">
                        <div className="flex flex-col text-[11px] font-mono">
                          <span className="font-bold text-accent">${parseFloat((user.balance || 0).toString()).toFixed(2)}</span>
                          <span className="text-[10px] text-gray-500">{user.points || 0} PTS</span>
                        </div>
                      </td>

                      {/* Joined Date */}
                      <td className="px-5 py-3.5 text-[11px] font-mono text-gray-500">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
                      </td>

                      {/* Actions Toolbar */}
                      <td className="px-5 py-3.5 ltr:text-right rtl:text-left">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Send Email */}
                          <button
                            onClick={() => setEmailModalUser(user)}
                            className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all ${
                              isDark
                                ? 'bg-gray-800/60 text-gray-400 hover:text-accent hover:bg-accent/10 border-gray-700/60 hover:border-accent/30'
                                : 'bg-gray-100 text-gray-600 hover:text-accent hover:bg-accent border-gray-200 hover:border-accent'
                            }`}
                            title={isRtl ? 'إرسال بريد' : 'Send Email'}
                          >
                            <Mail size={13} />
                          </button>

                          {/* View Detail Modal */}
                          <button
                            onClick={() => handleOpenUserDetail(user, 'profile')}
                            className="w-7 h-7 rounded-lg bg-accent/10 hover:bg-accent/20 text-accent border border-accent/30 flex items-center justify-center transition-all "
                            title={isRtl ? 'إعدادات وإدارة الحساب' : 'View Account Settings'}
                          >
                            <Eye size={13} />
                          </button>

                          {/* Delete Account */}
                          <button
                            onClick={() => handleDeleteUser(user.id.toString())}
                            className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all ${
                              isDark
                                ? 'bg-gray-800/60 text-gray-400 hover:text-red-400 hover:bg-red-500/20 border-gray-700/60 hover:border-red-500/30'
                                : 'bg-gray-100 text-gray-600 hover:text-red-600 hover:bg-red-50 border-gray-200 hover:border-red-300'
                            }`}
                            title={isRtl ? 'حذف الحساب' : 'Delete Account'}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              ) : (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-500 text-xs font-bold">
                    {isRtl ? 'لا يوجد مستخدمون مطابقون لمعايير البحث' : 'No users match the search criteria'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Data Grid Pagination Bar */}
        <div className={`p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4 text-xs ${
          isDark ? 'border-gray-800 bg-[#121214]' : 'border-gray-100 bg-gray-50'
        }`}>
          {/* Entries count summary */}
          <div className="text-gray-500 font-medium text-[11px]">
            {isRtl ? (
              <>
                عرض <span className="font-bold text-gray-900 dark:text-gray-100">{sortedUsers.length > 0 ? startIndex + 1 : 0}</span> إلى{' '}
                <span className="font-bold text-gray-900 dark:text-gray-100">{Math.min(startIndex + pageSize, sortedUsers.length)}</span> من أصل{' '}
                <span className="font-bold text-accent">{sortedUsers.length}</span> مستخدم
              </>
            ) : (
              <>
                Showing <span className="font-bold text-gray-900 dark:text-gray-100">{sortedUsers.length > 0 ? startIndex + 1 : 0}</span> to{' '}
                <span className="font-bold text-gray-900 dark:text-gray-100">{Math.min(startIndex + pageSize, sortedUsers.length)}</span> of{' '}
                <span className="font-bold text-accent">{sortedUsers.length}</span> users
              </>
            )}
          </div>

          {/* Page Size & Navigation Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Page size selector */}
            <div className="flex items-center gap-1.5 text-[11px] text-gray-500 font-medium">
              <span>{isRtl ? 'عرض:' : 'Show:'}</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className={`p-1 rounded-lg border text-xs font-mono font-bold focus:outline-none cursor-pointer ${
                  isDark ? 'bg-[#18181b] border-gray-800 text-gray-200' : 'bg-white border-gray-200 text-gray-800'
                }`}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                disabled={safeCurrentPage <= 1}
                className={`p-1.5 rounded-lg border transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                  isDark ? 'bg-[#18181b] border-gray-800 text-gray-300 hover:bg-gray-800' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
                title={isRtl ? 'الصفحة الأولى' : 'First Page'}
              >
                <ChevronsLeft size={14} className="rtl:rotate-180" />
              </button>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safeCurrentPage <= 1}
                className={`p-1.5 rounded-lg border transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                  isDark ? 'bg-[#18181b] border-gray-800 text-gray-300 hover:bg-gray-800' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
                title={isRtl ? 'الصفحة السابقة' : 'Previous Page'}
              >
                <ChevronLeft size={14} className="rtl:rotate-180" />
              </button>

              {/* Page Numbers */}
              <div className="flex items-center gap-1 px-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((page) => page === 1 || page === totalPages || Math.abs(page - safeCurrentPage) <= 1)
                  .map((page, idx, arr) => {
                    const prevPage = arr[idx - 1];
                    const showEllipsis = prevPage && page - prevPage > 1;

                    return (
                      <React.Fragment key={page}>
                        {showEllipsis && <span className="text-gray-500 text-xs px-0.5">...</span>}
                        <button
                          type="button"
                          onClick={() => setCurrentPage(page)}
                          className={`w-7 h-7 rounded-lg text-xs font-mono font-bold transition-all ${
                            safeCurrentPage === page
                              ? 'bg-accent text-black shadow-sm font-black'
                              : isDark
                              ? 'bg-[#18181b] border border-gray-800 text-gray-300 hover:bg-gray-800'
                              : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          {page}
                        </button>
                      </React.Fragment>
                    );
                  })}
              </div>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safeCurrentPage >= totalPages}
                className={`p-1.5 rounded-lg border transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                  isDark ? 'bg-[#18181b] border-gray-800 text-gray-300 hover:bg-gray-800' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
                title={isRtl ? 'الصفحة التالية' : 'Next Page'}
              >
                <ChevronRight size={14} className="rtl:rotate-180" />
              </button>

              <button
                type="button"
                onClick={() => setCurrentPage(totalPages)}
                disabled={safeCurrentPage >= totalPages}
                className={`p-1.5 rounded-lg border transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                  isDark ? 'bg-[#18181b] border-gray-800 text-gray-300 hover:bg-gray-800' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
                title={isRtl ? 'الصفحة الأخيرة' : 'Last Page'}
              >
                <ChevronsRight size={14} className="rtl:rotate-180" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Professional Centered User Detail Modal */}
      <AnimatePresence>
        {isDetailModalOpen && selectedUser && (
          <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 md:p-6 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              className={`relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl border shadow-2xl flex flex-col ${
                isDark ? 'bg-[#161618] border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-900'
              }`}
            >
              {/* Modal Header */}
              <div className={`p-5 md:p-6 border-b flex items-center justify-between ${
                isDark ? 'border-gray-800 bg-[#121214]' : 'border-gray-100 bg-gray-50/80'
              }`}>
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl border flex items-center justify-center overflow-hidden shrink-0 ${
                    isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                  }`}>
                    {selectedUser.avatar ? (
                      <img src={selectedUser.avatar} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <Users size={22} className="text-gray-400" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-black">{selectedUser.name}</h2>
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${
                        selectedUser.role === 'admin'
                          ? 'text-purple-500 bg-purple-500/10 border-purple-500/30'
                          : 'text-accent bg-accent/10 border-accent/30'
                      }`}>
                        {selectedUser.role}
                      </span>
                    </div>
                    <p className="text-xs font-mono text-gray-500 mt-0.5">{selectedUser.email}</p>
                  </div>
                </div>

                <button
                  onClick={() => setIsDetailModalOpen(false)}
                  className={`p-2 rounded-lg transition-colors ${
                    isDark ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/60'
                  }`}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Tabs Bar */}
              <div className={`flex items-center border-b px-6 gap-2 ${
                isDark ? 'border-gray-800 bg-[#0f0f11]' : 'border-gray-200 bg-gray-100/50'
              }`}>
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`py-3 px-4 font-black text-xs border-b-2 flex items-center gap-2 transition-all ${
                    activeTab === 'profile'
                      ? 'border-accent text-accent '
                      : isDark ? 'border-transparent text-gray-400 hover:text-gray-200' : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <UserCheck size={16} />
                  <span>{isRtl ? 'الهوية والتوثيق' : 'Identity & KYC'}</span>
                </button>

                <button
                  onClick={() => setActiveTab('wallet')}
                  className={`py-3 px-4 font-black text-xs border-b-2 flex items-center gap-2 transition-all ${
                    activeTab === 'wallet'
                      ? 'border-accent text-accent '
                      : isDark ? 'border-transparent text-gray-400 hover:text-gray-200' : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <Wallet size={16} />
                  <span>{isRtl ? 'المحفظة والتسوية' : 'Wallet & Ledger'}</span>
                </button>

                <button
                  onClick={() => setActiveTab('plan')}
                  className={`py-3 px-4 font-black text-xs border-b-2 flex items-center gap-2 transition-all ${
                    activeTab === 'plan'
                      ? 'border-accent text-accent '
                      : isDark ? 'border-transparent text-gray-400 hover:text-gray-200' : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <CreditCard size={16} />
                  <span>{isRtl ? 'الاشتراك والباقة' : 'Subscription'}</span>
                </button>

                <button
                  onClick={() => setActiveTab('activity')}
                  className={`py-3 px-4 font-black text-xs border-b-2 flex items-center gap-2 transition-all ${
                    activeTab === 'activity'
                      ? 'border-accent text-accent '
                      : isDark ? 'border-transparent text-gray-400 hover:text-gray-200' : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <Activity size={16} />
                  <span>{isRtl ? 'سجل الأنشطة' : 'Audit Trail'}</span>
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                {/* TAB 1: Profile & KYC */}
                {activeTab === 'profile' && (
                  <div className="space-y-6">
                    {/* Identity Summary Card */}
                    <div className={`p-4 rounded-xl border space-y-4 ${
                      isDark ? 'bg-[#121214] border-gray-800' : 'bg-gray-50 border-gray-200'
                    }`}>
                      <h4 className="text-xs font-black uppercase tracking-wider text-gray-400 flex items-center gap-2">
                        <UserCheck size={14} className="text-accent" />
                        <span>{isRtl ? 'بيانات الحساب الأساسية' : 'Account Metadata'}</span>
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="text-gray-500 block mb-1">{isRtl ? 'معرف المستخدم' : 'User ID'}</span>
                          <span className="font-mono font-bold">#{selectedUser.id}</span>
                        </div>

                        <div>
                          <span className="text-gray-500 block mb-1">{isRtl ? 'تاريخ التسجيل' : 'Registration Date'}</span>
                          <span>
                            {selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleString() : '—'}
                          </span>
                        </div>

                        <div>
                          <span className="text-gray-500 block mb-1">{isRtl ? 'حالة الحساب' : 'Account Status'}</span>
                          <button
                            onClick={() => handleToggleStatus(selectedUser.id, selectedUser.status || selectedUser.subscription_status || 'active')}
                            disabled={isUpdating}
                            className={`inline-flex items-center gap-1.5 font-bold text-xs px-2.5 py-1 rounded-md border ${
                              (selectedUser.status || selectedUser.subscription_status) === 'active'
                                ? 'bg-accent/10 text-accent border-accent/30'
                                : 'bg-red-500/10 text-red-500 border-red-500/30'
                            }`}
                          >
                            {(selectedUser.status || selectedUser.subscription_status) === 'active' ? (
                              <CheckCircle2 size={12} />
                            ) : (
                              <XCircle size={12} />
                            )}
                            <span>{(selectedUser.status || selectedUser.subscription_status) === 'active' ? (isRtl ? 'نشط (تجميد الحساب)' : 'Active (Click to Suspend)') : (isRtl ? 'معطل (تنشيط الحساب)' : 'Suspended (Click to Activate)')}</span>
                          </button>
                        </div>

                        <div>
                          <span className="text-gray-500 block mb-1">{isRtl ? 'الصلاحية / الدور' : 'User Role'}</span>
                          <select
                            value={selectedUser.role || 'user'}
                            onChange={(e) => handleUpdateRole(selectedUser.id, e.target.value)}
                            disabled={isUpdating}
                            className={`p-1.5 rounded-md border text-xs font-bold ${
                              isDark ? 'bg-[#0f0f11] border-gray-800 text-white' : 'bg-white border-gray-300 text-gray-900'
                            }`}
                          >
                            <option value="user">{isRtl ? 'مستخدم' : 'User'}</option>
                            
                            <option value="admin">{isRtl ? 'مدير نظام' : 'Admin'}</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* KYC Verification Protocol Card */}
                    <div className={`p-4 rounded-xl border space-y-4 ${
                      isDark ? 'bg-[#121214] border-gray-800' : 'bg-gray-50 border-gray-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black uppercase tracking-wider text-gray-400 flex items-center gap-2">
                          <ShieldCheck size={14} className="text-accent" />
                          <span>{isRtl ? 'توثيق الهوية (KYC)' : 'Identity Verification (KYC)'}</span>
                        </h4>

                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${
                          selectedUser.kyc_status === 'verified'
                            ? 'bg-accent/10 text-accent border-accent/30'
                            : selectedUser.kyc_status === 'pending'
                            ? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                            : selectedUser.kyc_status === 'rejected'
                            ? 'bg-red-500/10 text-red-500 border-red-500/30'
                            : isDark ? 'bg-gray-800 text-gray-400 border-gray-700' : 'bg-gray-200 text-gray-600 border-gray-300'
                        }`}>
                          {selectedUser.kyc_status || 'unverified'}
                        </span>
                      </div>

                      {/* Selfie Photo Preview if available */}
                      {selectedUser.kyc_selfie && (
                        <div className="space-y-2 p-3 rounded-lg bg-black/20 border border-gray-800">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-gray-400">{isRtl ? 'صورة التوثيق المرفوعة:' : 'Uploaded Selfie:'}</span>
                            <button
                              onClick={() => handleDeleteKYCSelfie(selectedUser.id)}
                              className="text-red-500 hover:text-red-400 text-xs font-bold flex items-center gap-1"
                            >
                              <Trash2 size={12} />
                              <span>{isRtl ? 'حذف الصورة' : 'Delete Photo'}</span>
                            </button>
                          </div>
                          {selectedUser.kyc_full_name && (
                            <p className="text-xs font-bold">{isRtl ? 'الاسم بالهوية:' : 'Name on ID:'} <span className="text-accent">{selectedUser.kyc_full_name}</span></p>
                          )}
                          <div className="max-w-xs rounded-lg overflow-hidden border border-gray-700">
                            <img src={selectedUser.kyc_selfie} alt="KYC Selfie" className="w-full h-auto object-cover max-h-48" />
                          </div>
                        </div>
                      )}

                      {/* KYC Actions */}
                      <div className="space-y-3 pt-2">
                        {selectedUser.kyc_status === 'pending' && (
                          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs flex items-center gap-2">
                            <Clock size={16} className="shrink-0" />
                            <span>{isRtl ? 'هذا المستخدم ينتظر مراجعة وتوثيق وثائق الهوية الرسمية' : 'User pending identity verification audit'}</span>
                          </div>
                        )}

                        {selectedUser.kyc_status === 'rejected' && selectedUser.kyc_rejection_reason && (
                          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                            <span className="font-bold block mb-1">{isRtl ? 'سبب الرفض السابق:' : 'Rejection Reason:'}</span>
                            <p className="font-mono">{selectedUser.kyc_rejection_reason}</p>
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-2 pt-2">
                          <button
                            onClick={() => handleUpdateKYCVerificationStatus(selectedUser.id, 'verified')}
                            disabled={isUpdating}
                            className="flex-1 py-2 px-3 rounded-lg bg-accent hover:bg-accent text-black font-black text-xs flex items-center justify-center gap-1.5 transition-all"
                          >
                            <CheckCircle2 size={14} />
                            <span>{isRtl ? 'اعتماد التوثيق' : 'Approve KYC'}</span>
                          </button>

                          <button
                            onClick={() => {
                              const reason = prompt(isRtl ? 'أدخل سبب رفض التوثيق:' : 'Enter rejection reason:');
                              if (reason) handleUpdateKYCVerificationStatus(selectedUser.id, 'rejected', reason);
                            }}
                            disabled={isUpdating}
                            className="flex-1 py-2 px-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                          >
                            <XCircle size={14} />
                            <span>{isRtl ? 'رفض التوثيق' : 'Reject KYC'}</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Admin Support Notes */}
                    <div className={`p-4 rounded-xl border space-y-3 ${
                      isDark ? 'bg-[#121214] border-gray-800' : 'bg-gray-50 border-gray-200'
                    }`}>
                      <h4 className="text-xs font-black uppercase tracking-wider text-gray-400 flex items-center gap-2">
                        <FileText size={14} className="text-accent" />
                        <span>{isRtl ? 'ملاحظات الدعم الفني السرية' : 'Internal Support Notes'}</span>
                      </h4>

                      <textarea
                        rows={3}
                        value={supportNotes}
                        onChange={(e) => setSupportNotes(e.target.value)}
                        placeholder={isRtl ? 'اكتب أي ملاحظات خاصة بهذا المستخدم تظهر للفريق فقط...' : 'Internal notes visible to team only...'}
                        className={`w-full p-3 rounded-lg border text-xs focus:outline-none focus:border-accent/50 ${
                          isDark
                            ? 'bg-[#0f0f11] border-gray-800 text-gray-200 placeholder-gray-600'
                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                        }`}
                      />

                      <div className="flex justify-end">
                        <button
                          onClick={handleSaveSupportNotes}
                          disabled={isUpdating}
                          className="px-4 py-2 rounded-lg bg-accent hover:bg-accent text-black font-bold text-xs transition-all"
                        >
                          {isRtl ? 'حفظ الملاحظات' : 'Save Notes'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: Wallet & Ledger Adjustments */}
                {activeTab === 'wallet' && (
                  <div className="space-y-6">
                    {/* Current Balance Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl border border-accent/20 bg-accent/5">
                        <span className="text-[10px] font-black uppercase text-gray-400 block mb-1">
                          {isRtl ? 'الرصيد المالي (USD)' : 'USD Balance'}
                        </span>
                        <h3 className="text-2xl font-black text-accent font-mono">
                          ${parseFloat(selectedUser.balance || 0).toFixed(2)}
                        </h3>
                      </div>

                      <div className="p-4 rounded-xl border border-purple-500/20 bg-purple-500/5">
                        <span className="text-[10px] font-black uppercase text-gray-400 block mb-1">
                          {isRtl ? 'نقاط المنصة (PTS)' : 'Platform Points'}
                        </span>
                        <h3 className="text-2xl font-black text-purple-500 font-mono">
                          {selectedUser.points || 0} PTS
                        </h3>
                      </div>
                    </div>

                    {/* Ledger Adjustment Action Form */}
                    <form onSubmit={handleUpdateBalance} className={`p-4 rounded-xl border space-y-4 ${
                      isDark ? 'bg-[#121214] border-gray-800' : 'bg-gray-50 border-gray-200'
                    }`}>
                      <h4 className="text-xs font-black uppercase tracking-wider text-gray-400 flex items-center gap-2">
                        <Wallet size={14} className="text-accent" />
                        <span>{isRtl ? 'إجراء تسوية رصيد إدارية' : 'Admin Ledger Settlement'}</span>
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Unit Selection */}
                        <div>
                          <label className="text-[10px] text-gray-400 block mb-1">{isRtl ? 'نوع الوحدة' : 'Unit Type'}</label>
                          <select
                            value={ledgerUnit}
                            onChange={(e: any) => setLedgerUnit(e.target.value)}
                            className={`w-full p-2.5 rounded-lg border text-xs ${
                              isDark ? 'bg-[#0f0f11] border-gray-800 text-white' : 'bg-white border-gray-300 text-gray-900'
                            }`}
                          >
                            <option value="PTS">{isRtl ? 'نقاط (PTS)' : 'Points (PTS)'}</option>
                            <option value="USD">{isRtl ? 'دولار أمريكي (USD)' : 'USD ($)'}</option>
                          </select>
                        </div>

                        {/* Action Type */}
                        <div>
                          <label className="text-[10px] text-gray-400 block mb-1">{isRtl ? 'نوع الحركة' : 'Action Type'}</label>
                          <select
                            value={ledgerAction}
                            onChange={(e: any) => setLedgerAction(e.target.value)}
                            className={`w-full p-2.5 rounded-lg border text-xs ${
                              isDark ? 'bg-[#0f0f11] border-gray-800 text-white' : 'bg-white border-gray-300 text-gray-900'
                            }`}
                          >
                            <option value="add">{isRtl ? 'إضافة / إيداع (+)' : 'Credit / Deposit (+)'}</option>
                            <option value="deduct">{isRtl ? 'خصم / سحب (-)' : 'Debit / Withdraw (-)'}</option>
                          </select>
                        </div>
                      </div>

                      {/* Amount & Reason */}
                      <div>
                        <label className="text-[10px] text-gray-400 block mb-1">{isRtl ? 'المبلغ أو الكمية' : 'Amount'}</label>
                        <input
                          type="number"
                          step="any"
                          placeholder="0.00"
                          value={ledgerAmount}
                          onChange={(e) => setLedgerAmount(e.target.value)}
                          className={`w-full p-2.5 rounded-lg border text-xs font-mono focus:border-accent/50 ${
                            isDark ? 'bg-[#0f0f11] border-gray-800 text-white' : 'bg-white border-gray-300 text-gray-900'
                          }`}
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-gray-400 block mb-1">{isRtl ? 'سبب التسوية' : 'Reason / Note'}</label>
                        <input
                          type="text"
                          placeholder={isRtl ? 'مثال: مكافأة تشجيعية، تعويض فني...' : 'e.g. Compensation, Promo reward...'}
                          value={ledgerReason}
                          onChange={(e) => setLedgerReason(e.target.value)}
                          className={`w-full p-2.5 rounded-lg border text-xs focus:border-accent/50 ${
                            isDark ? 'bg-[#0f0f11] border-gray-800 text-white' : 'bg-white border-gray-300 text-gray-900'
                          }`}
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isUpdating}
                        className="w-full py-2.5 rounded-lg bg-accent hover:bg-accent text-black font-black text-xs transition-all shadow-[0_0_15px_rgba(156,163,175,0.2)]"
                      >
                        {isRtl ? 'تأكيد التسوية وتسجيل الحركة' : 'Execute Ledger Transaction'}
                      </button>
                    </form>

                    {/* Live Wallet Transactions Trail */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black uppercase tracking-wider text-gray-400 flex items-center gap-2">
                          <Activity size={14} className="text-accent" />
                          <span>{isRtl ? 'سجل العمليات المالية والتحويلات المباشر' : 'Live Ledger Transactions History'}</span>
                        </h4>
                        <button
                          onClick={() => fetchUserTransactions(selectedUser.id)}
                          className="text-[11px] font-bold text-accent hover:underline flex items-center gap-1"
                        >
                          <RefreshCw size={12} className={isLoadingTransactions ? 'animate-spin' : ''} />
                          <span>{isRtl ? 'تحديث' : 'Refresh'}</span>
                        </button>
                      </div>

                      {isLoadingTransactions ? (
                        <div className="text-center py-6 text-xs text-gray-500">{isRtl ? 'جاري تحميل سجل التحويلات...' : 'Loading transactions...'}</div>
                      ) : userTransactions.length > 0 ? (
                        <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                          {userTransactions.map((tx: any, idx: number) => {
                            const isDeposit = tx.type === 'deposit' || tx.type === 'add' || tx.amount > 0;
                            return (
                              <div key={idx} className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
                                isDark ? 'bg-[#121214] border-gray-800' : 'bg-gray-50 border-gray-200'
                              }`}>
                                <div className="flex items-center gap-2.5">
                                  <div className={`w-7 h-7 rounded-md flex items-center justify-center font-bold text-xs ${
                                    isDeposit ? 'bg-accent/10 text-accent border border-accent/30' : 'bg-amber-500/10 text-amber-500 border border-amber-500/30'
                                  }`}>
                                    {isDeposit ? '+' : '-'}
                                  </div>
                                  <div>
                                    <span className="font-bold block text-xs">{tx.description || tx.reason || (isDeposit ? 'إيداع / رصيد' : 'خصم / سحب')}</span>
                                    <span className="text-[10px] text-gray-500 font-mono">ID: #{tx.id || tx.transaction_id || idx + 1}</span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className={`font-mono font-black block text-xs ${isDeposit ? 'text-accent' : 'text-amber-500'}`}>
                                    {isDeposit ? '+' : '-'}${Math.abs(parseFloat(tx.amount || 0)).toFixed(2)}
                                  </span>
                                  <span className="text-[10px] text-gray-500 font-mono">
                                    {tx.created_at ? new Date(tx.created_at).toLocaleString() : '—'}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-6 text-xs text-gray-500 border rounded-lg border-dashed border-gray-700/50">
                          {isRtl ? 'لا توجد حركات مالية سابقة مسجلة لهذا المستخدم' : 'No recorded transactions'}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 3: Plan Subscription */}
                {activeTab === 'plan' && (
                  <div className="space-y-6">
                    {/* Active Subscription Live Status Card */}
                    <div className={`p-5 rounded-2xl border space-y-3 ${
                      isDark ? 'bg-[#121214] border-gray-800' : 'bg-gray-50 border-gray-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black uppercase tracking-wider text-gray-400 flex items-center gap-2">
                          <CreditCard size={14} className="text-accent" />
                          <span>{isRtl ? 'بيانات اشتراك المستخدم النشط (من قاعدة البيانات)' : 'Active Database Subscription'}</span>
                        </h4>
                        <button
                          onClick={() => fetchUserSubscription(selectedUser.id)}
                          className="text-[11px] font-bold text-accent hover:underline flex items-center gap-1"
                        >
                          <RefreshCw size={12} className={isLoadingSubscription ? 'animate-spin' : ''} />
                          <span>{isRtl ? 'مزامنة الاشتراك' : 'Sync'}</span>
                        </button>
                      </div>

                      {isLoadingSubscription ? (
                        <div className="text-center py-4 text-xs text-gray-500">{isRtl ? 'جاري استدعاء تفاصيل الاشتراك...' : 'Loading subscription details...'}</div>
                      ) : userSubscription && userSubscription.plan_id ? (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                          <div className="p-3 rounded-xl bg-black/20 border border-gray-800">
                            <span className="text-gray-500 block text-[10px] mb-0.5">{isRtl ? 'اسم الباقة الحالية' : 'Current Tier'}</span>
                            <span className="font-black text-accent text-sm flex items-center gap-1.5">
                              <Star size={12} className="fill-current" />
                              {isRtl ? (userSubscription.name_ar || userSubscription.nameAr) : (userSubscription.name_en || userSubscription.nameEn)}
                            </span>
                          </div>

                          <div className="p-3 rounded-xl bg-black/20 border border-gray-800">
                            <span className="text-gray-500 block text-[10px] mb-0.5">{isRtl ? 'حالة الاشتراك' : 'Status'}</span>
                            <span className={`font-black uppercase px-2 py-0.5 rounded text-[10px] inline-block border ${
                              userSubscription.status === 'active'
                                ? 'bg-accent/10 text-accent border-accent/30'
                                : 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                            }`}>
                              {userSubscription.status || 'active'}
                            </span>
                          </div>

                          <div className="p-3 rounded-xl bg-black/20 border border-gray-800">
                            <span className="text-gray-500 block text-[10px] mb-0.5">{isRtl ? 'تاريخ الانتهاء / التجديد' : 'Period End'}</span>
                            <span className="font-mono font-bold text-gray-300">
                              {userSubscription.current_period_end ? new Date(userSubscription.current_period_end).toLocaleDateString() : 'مفتوح (دائم)'}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 rounded-xl bg-accent/5 border border-accent/20 text-xs text-accent font-bold flex items-center gap-2">
                          <Sparkles size={16} />
                          <span>{isRtl ? 'الباقة الحالية المفعلة من خلال ملف المستخدم الأساسي' : 'Active tier synchronized from user profile'}</span>
                        </div>
                      )}
                    </div>

                    {/* All Real Database Plans Grid */}
                    <div className={`p-5 rounded-2xl border space-y-4 ${
                      isDark ? 'bg-[#121214] border-gray-800' : 'bg-gray-50 border-gray-200'
                    }`}>
                      <h4 className="text-xs font-black uppercase tracking-wider text-gray-400 flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Layers size={14} className="text-accent" />
                          <span>{isRtl ? 'ترقية / تعيين باقة جديدة (تنفيذ فوري برامجي)' : 'Upgrade or Reassign Plan (Instant Strict Execution)'}</span>
                        </span>
                        <span className="text-[10px] font-mono text-accent">
                          {normalizedPlans.length} {isRtl ? 'باقة متاحة' : 'Plans'}
                        </span>
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {normalizedPlans.map((p) => {
                          const isCurrent = selectedUser.plan_id?.toString() === p.id.toString();
                          return (
                            <div
                              key={p.id}
                              className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 transition-all ${
                                isCurrent
                                  ? 'border-accent bg-accent/10 shadow-[0_0_20px_rgba(156,163,175,0.15)]'
                                  : isDark
                                  ? 'border-gray-800 bg-[#0f0f11] hover:border-gray-700'
                                  : 'border-gray-200 bg-white hover:border-gray-300'
                              }`}
                            >
                              <div className="space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-black text-sm" style={{ color: p.color }}>
                                        {isRtl ? p.nameAr : p.nameEn}
                                      </span>
                                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded border border-gray-700 text-gray-400 bg-gray-800/50">
                                        {p.planType === 'developer' ? (isRtl ? 'مطور' : 'Developer') : (isRtl ? 'مستخدم' : 'User')}
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-gray-400 mt-1 line-clamp-2">
                                      {isRtl ? p.descAr : p.descEn}
                                    </p>
                                  </div>
                                  {isCurrent && (
                                    <span className="shrink-0 text-[10px] font-black px-2 py-0.5 rounded bg-accent text-black flex items-center gap-1">
                                      <CheckCircle2 size={12} />
                                      {isRtl ? 'نشط' : 'Active'}
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-baseline gap-2 font-mono">
                                  <span className="text-xl font-black text-accent">
                                    ${p.monthlyPrice}
                                  </span>
                                  <span className="text-[11px] text-gray-500">
                                    / {isRtl ? 'شهرياً' : 'monthly'}
                                  </span>
                                  {p.annualPrice > 0 && (
                                    <span className="text-[10px] text-gray-500 ltr:ml-auto rtl:mr-auto">
                                      (${p.annualPrice}/{isRtl ? 'سنوياً' : 'yr'})
                                    </span>
                                  )}
                                </div>

                                {/* Limits Summary Pill list */}
                                {p.limits && Object.keys(p.limits).length > 0 && (
                                  <div className="pt-1 flex flex-wrap gap-1 text-[9px] font-mono">
                                    {Object.entries(p.limits).slice(0, 3).map(([k, v]: [string, any]) => {
                                      if (v === undefined || v === null) return null;
                                      const daily = typeof v === 'object' && v !== null ? v.daily : v;
                                      const monthly = typeof v === 'object' && v !== null ? v.monthly : null;
                                      const formatVal = (val: any) => val === 'unlimited' ? '∞' : (val ?? '0');
                                      const formatted = typeof v === 'object' && v !== null
                                        ? `${formatVal(daily)}D${monthly !== null && monthly !== undefined && monthly !== 0 ? `/${formatVal(monthly)}M` : ''}`
                                        : formatVal(v);
                                      return (
                                        <span key={k} className="px-2 py-0.5 rounded bg-black/30 border border-gray-800 text-gray-400">
                                          {k}: {formatted}
                                        </span>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={() => handleUpdatePlan(selectedUser.id, p.id)}
                                disabled={isUpdating || isCurrent}
                                className={`w-full py-2.5 px-4 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 ${
                                  isCurrent
                                    ? 'bg-accent/20 text-accent cursor-default border border-accent/30'
                                    : 'bg-accent hover:bg-accent text-black shadow-[0_0_15px_rgba(156,163,175,0.25)]'
                                }`}
                              >
                                {isCurrent ? (
                                  <>
                                    <CheckCircle2 size={14} />
                                    <span>{isRtl ? 'الباقة المفعلة حالياً' : 'Current Plan Assigned'}</span>
                                  </>
                                ) : (
                                  <>
                                    <Zap size={14} />
                                    <span>{isRtl ? `تطبيق التعيين الفوري ($${p.monthlyPrice})` : `Set Plan Now ($${p.monthlyPrice})`}</span>
                                  </>
                                )}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 4: Activity Logs */}
                {activeTab === 'activity' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black uppercase tracking-wider text-gray-400 flex items-center gap-2">
                        <Activity size={14} className="text-accent" />
                        <span>{isRtl ? 'سجل العمليات الأخير والتتبع المباشر' : 'Live Audit & Event Logs'}</span>
                      </h4>
                      <button
                        onClick={() => fetchActivityLogs(selectedUser.id)}
                        className="text-[11px] font-bold text-accent hover:underline flex items-center gap-1"
                      >
                        <RefreshCw size={12} className={isLoadingLogs ? 'animate-spin' : ''} />
                        <span>{isRtl ? 'تحديث السجل' : 'Sync Logs'}</span>
                      </button>
                    </div>

                    {isLoadingLogs ? (
                      <div className="text-center py-8 text-xs text-gray-500">{isRtl ? 'جاري استدعاء السجلات...' : 'Loading logs...'}</div>
                    ) : activityLogs.length > 0 ? (
                      <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
                        {activityLogs.map((log: any, idx: number) => (
                          <div key={idx} className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
                            isDark ? 'bg-[#121214] border-gray-800' : 'bg-gray-50 border-gray-200'
                          }`}>
                            <div className="space-y-0.5">
                              <span className="font-bold block text-accent">{log.action || log.tool_id || log.event || 'System Event'}</span>
                              <span className="text-[10px] text-gray-400 font-mono">
                                {log.details ? (typeof log.details === 'object' ? JSON.stringify(log.details) : log.details) : (log.description || 'No additional parameters')}
                              </span>
                            </div>
                            <span className="text-[10px] text-gray-500 font-mono shrink-0 ltr:ml-2 rtl:mr-2">
                              {log.created_at ? new Date(log.created_at).toLocaleString() : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-xs text-gray-500 border rounded-lg border-dashed border-gray-800">
                        {isRtl ? 'لا توجد سجلات نشاط مسجلة مؤخراً' : 'No recorded activity'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. Create New Explorer Modal */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-[1300] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`w-full max-w-md rounded-2xl p-6 border shadow-2xl relative space-y-5 ${
                isDark ? 'bg-[#161618] border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-900'
              }`}
            >
              <div className={`flex items-center justify-between border-b pb-4 ${
                isDark ? 'border-gray-800' : 'border-gray-100'
              }`}>
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
                    <UserPlus size={18} />
                  </div>
                  <h3 className="font-black text-base">{isRtl ? 'إضافة مستخدم جديد' : 'Add New Explorer'}</h3>
                </div>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    isDark ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <label className="text-xs font-bold block mb-1">{isRtl ? 'الاسم الكامل' : 'Full Name'}</label>
                  <input
                    type="text"
                    required
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    className={`w-full p-2.5 rounded-lg border text-xs focus:border-accent/50 ${
                      isDark ? 'bg-[#0f0f11] border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold block mb-1">{isRtl ? 'البريد الإلكتروني' : 'Email Address'}</label>
                  <input
                    type="email"
                    required
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    className={`w-full p-2.5 rounded-lg border text-xs focus:border-accent/50 ${
                      isDark ? 'bg-[#0f0f11] border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold block mb-1">{isRtl ? 'كلمة المرور' : 'Password'}</label>
                  <input
                    type="password"
                    required
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className={`w-full p-2.5 rounded-lg border text-xs focus:border-accent/50 ${
                      isDark ? 'bg-[#0f0f11] border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold block mb-1">{isRtl ? 'الصلاحية / الدور' : 'Role'}</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    className={`w-full p-2.5 rounded-lg border text-xs ${
                      isDark ? 'bg-[#0f0f11] border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                    }`}
                  >
                    <option value="user">{isRtl ? 'مستخدم عادي' : 'Standard User'}</option>
                    
                    <option value="admin">{isRtl ? 'مدير نظام' : 'System Admin'}</option>
                  </select>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className={`px-4 py-2 rounded-lg text-xs font-bold ${
                      isDark ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {isRtl ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="px-5 py-2 rounded-lg bg-accent hover:bg-accent text-black font-black text-xs shadow-[0_0_15px_rgba(156,163,175,0.3)]"
                  >
                    {isRtl ? 'إنشاء الحساب' : 'Create User'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 6. Direct Email Modal */}
      <AnimatePresence>
        {emailModalUser && (
          <div className="fixed inset-0 z-[1300] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`w-full max-w-lg rounded-2xl p-6 border shadow-2xl relative space-y-5 ${
                isDark ? 'bg-[#161618] border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-900'
              }`}
            >
              <div className={`flex items-center justify-between border-b pb-4 ${
                isDark ? 'border-gray-800' : 'border-gray-100'
              }`}>
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
                    <Mail size={18} />
                  </div>
                  <div>
                    <h3 className="font-black text-base">{isRtl ? 'إرسال رسالة مباشرة' : 'Send Direct Email'}</h3>
                    <p className="text-[11px] text-gray-500 font-mono">{emailModalUser.name} ({emailModalUser.email})</p>
                  </div>
                </div>
                <button
                  onClick={() => setEmailModalUser(null)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    isDark ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSendEmailSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-bold block mb-1">{isRtl ? 'عنوان الرسالة (الموضوع)' : 'Subject'}</label>
                  <input
                    type="text"
                    required
                    placeholder={isRtl ? 'مثال: تحديث بشأن حسابك...' : 'e.g. Account update...'}
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    className={`w-full p-2.5 rounded-lg border text-xs focus:border-accent/50 ${
                      isDark ? 'bg-[#0f0f11] border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold block mb-1">{isRtl ? 'محتوى الرسالة' : 'Message Body'}</label>
                  <textarea
                    rows={5}
                    required
                    placeholder={isRtl ? 'اكتب نص الرسالة التي ستصل للبريد الإلكتروني...' : 'Write message content...'}
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    className={`w-full p-3 rounded-lg border text-xs focus:border-accent/50 ${
                      isDark ? 'bg-[#0f0f11] border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                    }`}
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEmailModalUser(null)}
                    className={`px-4 py-2 rounded-lg text-xs font-bold ${
                      isDark ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {isRtl ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={isSendingEmail}
                    className="px-5 py-2 rounded-lg bg-accent hover:bg-accent text-black font-black text-xs flex items-center gap-2 shadow-[0_0_15px_rgba(156,163,175,0.3)]"
                  >
                    <Send size={14} />
                    <span>{isSendingEmail ? (isRtl ? 'جاري الإرسال...' : 'Sending...') : (isRtl ? 'إرسال الرسالة' : 'Send Email')}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UserManagementView;

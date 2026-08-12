import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppContext } from '../context/AppContext';
import { getMediaUrl } from '../utils/mediaUtils';
import {
  Megaphone,
  Plus,
  Trash2,
  Edit,
  Eye,
  MousePointerClick,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Upload,
  RefreshCw,
  Search,
  Sparkles,
  BarChart2,
  TrendingUp,
  DollarSign,
  Award,
  Users,
  PieChart as PieIcon,
  Layers,
  X,
  Gift,
  Coins,
  Settings2,
  Save,
  PlusCircle,
  Zap,
  Monitor,
  Smartphone,
  Info,
  ShieldCheck,
  History,
  Download
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';
import { toast } from 'sonner';
import { MediaFormatPlayer } from '../components/MediaFormatPlayer';
import { CustomVideoPlayer } from '../components/CustomVideoPlayer';
import { extractVideoThumbnail, getRecommendedDimensions, compressAndResizeImage } from '../utils/mediaUtils';

export interface AdItem {
  id: number;
  title_ar: string;
  title_en: string;
  description_ar: string | null;
  description_en: string | null;
  meta_title_ar: string | null;
  meta_title_en: string | null;
  meta_description_ar: string | null;
  meta_description_en: string | null;
  keywords_ar: string | null;
  keywords_en: string | null;
  image_url: string;
  video_url?: string;
  poster_url?: string;
  target_url: string;
  sponsor_name: string | null;
  badge_text_ar: string | null;
  badge_text_en: string | null;
  position: string;
  format?: 'sidebar' | 'feed' | 'story' | 'reel' | 'video';
  display_order: number;
  is_active: boolean;
  click_count: number;
  impression_count: number;
  created_at: string;
}

export const AdsManagementView: React.FC<{
  theme: string;
  t: (key: string) => string;
  dir: string;
  language: string;
}> = ({ theme, t, dir, language }) => {
  const { token } = useAppContext();
  const [ads, setAds] = useState<AdItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingAd, setEditingAd] = useState<AdItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'platform' | 'bulletin' | 'analytics' | 'economy' | 'approval' | 'audit'>('analytics');
  const [bulletinAds, setBulletinAds] = useState<any[]>([]);
  const [isBulletinLoading, setIsBulletinLoading] = useState<boolean>(false);
  const [rejectingAdId, setRejectingAdId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [refundOnReject, setRefundOnReject] = useState<boolean>(true);
  const [selectedBulletinIds, setSelectedBulletinIds] = useState<number[]>([]);
  const [stoppingAdId, setStoppingAdId] = useState<number | null>(null);
  const [stopReason, setStopReason] = useState<string>('');
  const [economySettings, setEconomySettings] = useState({
    bulletin_ad_daily_price: 1.0,
    live_gift_commission_percent: 10,
    sidebar_ad_impression_price: 0.01,
    sidebar_ad_click_price: 0.10,
    sidebar_ads_enabled: true,
    require_2fa_for_economy: false
  });
  const [approvalRequests, setApprovalRequests] = useState<any[]>([]);
  const [isApproving, setIsApproving] = useState(false);
  const [verificationModal, setVerificationModal] = useState<{
    isOpen: boolean;
    requestId: number | null;
    code: string;
    actionType: string;
    payload: any;
  }>({
    isOpen: false,
    requestId: null,
    code: '',
    actionType: '',
    payload: null
  });
  const [giftCatalog, setGiftCatalog] = useState<any[]>([]);
  const [selectedRequests, setSelectedRequests] = useState<number[]>([]);
  const [isEconomyLoading, setIsEconomyLoading] = useState(false);
  const [isGiftsLoading, setIsGiftsLoading] = useState(false);
  const [editingGift, setEditingGift] = useState<any>(null);
  const [isGiftModalOpen, setIsGiftModalOpen] = useState(false);
  const [showAdPreview, setShowAdPreview] = useState(false);
  const [batchAdjustmentPercent, setBatchAdjustmentPercent] = useState<number>(0);
  const [giftFormData, setGiftFormData] = useState({
    name_en: '',
    name_ar: '',
    icon: '🌹',
    points: 10,
    is_active: true
  });
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState<boolean>(false);
  const [heatmapData, setHeatmapData] = useState<any[]>([]);
  const [isHeatmapLoading, setIsHeatmapLoading] = useState(false);
  const [roiData, setRoiData] = useState<any[]>([]);
  const [isRoiLoading, setIsRoiLoading] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isAuditLoading, setIsAuditLoading] = useState(false);
  const [selectedAdIds, setSelectedAdIds] = useState<number[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title_ar: '',
    title_en: '',
    description_ar: '',
    description_en: '',
    meta_title_ar: '',
    meta_title_en: '',
    meta_description_ar: '',
    meta_description_en: '',
    keywords_ar: '',
    keywords_en: '',
    image_url: '',
    video_url: '',
    poster_url: '',
    target_url: '',
    sponsor_name: '',
    badge_text_ar: 'مُموَّل',
    badge_text_en: 'Sponsored',
    position: 'sidebar',
    format: 'sidebar' as 'sidebar' | 'feed' | 'story' | 'reel' | 'video',
    display_order: 0,
    is_active: true
  });

  const isRtl = language === 'ar';

  const fetchAds = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/ads/admin/list', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.ads)) {
          setAds(data.ads);
        }
      } else {
        toast.error(isRtl ? 'فشل تحميل الإعلانات' : 'Failed to load advertisements');
      }
    } catch (err) {
      console.error('[AdsManagementView] Fetch error:', err);
      toast.error(isRtl ? 'خطأ في الاتصال بالخادم' : 'Server connection error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAds();
    if (token) {
      fetchBulletinAds();
      fetchAdminAnalytics();
      fetchEconomySettings();
      fetchGiftCatalog();
    }
  }, [token]);

  const fetchApprovalQueue = async () => {
    try {
      const res = await fetch('/api/admin/approval-queue', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setApprovalRequests(data);
      }
    } catch (e) {
      console.error('Failed to fetch approval queue:', e);
    }
  };

  const handleVerifyApproval = async () => {
    if (!verificationModal.requestId || !verificationModal.code) return;
    
    setIsApproving(true);
    try {
      const endpoint = verificationModal.requestId === -1 
        ? '/api/admin/approval-queue/bulk-verify' 
        : '/api/admin/approval-queue/verify';
      
      const body = verificationModal.requestId === -1
        ? { requestIds: selectedRequests, code: verificationModal.code }
        : { requestId: verificationModal.requestId, code: verificationModal.code };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(isRtl ? 'تم التحقق والتنفيذ بنجاح' : 'Verified and executed successfully');
        setVerificationModal({ ...verificationModal, isOpen: false, code: '' });
        setSelectedRequests([]);
        fetchApprovalQueue();
        fetchEconomySettings();
      } else {
        toast.error(data.error || 'Verification failed');
      }
    } catch (e) {
      toast.error('Connection error');
    } finally {
      setIsApproving(false);
    }
  };

  const handleRejectApproval = async (id: number, reason: string) => {
    try {
      const res = await fetch('/api/admin/approval-queue/reject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ requestId: id, reason })
      });
      if (res.ok) {
        toast.success('Rejected');
        fetchApprovalQueue();
      }
    } catch (e) {}
  };

  const handleBulkReject = async () => {
    const reason = window.prompt(`Reject ${selectedRequests.length} requests? Reason:`);
    if (!reason) return;
    
    try {
      const res = await fetch('/api/admin/approval-queue/bulk-reject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ requestIds: selectedRequests, reason })
      });
      if (res.ok) {
        toast.success(`Rejected ${selectedRequests.length} requests`);
        setSelectedRequests([]);
        fetchApprovalQueue();
      }
    } catch (e) {
      toast.error('Bulk rejection failed');
    }
  };

  const handleBulkVerifyOpen = () => {
    setVerificationModal({
      isOpen: true,
      requestId: -1, // -1 indicates bulk
      code: '',
      actionType: 'BULK_APPROVAL',
      payload: { count: selectedRequests.length }
    });
  };

  const fetchEconomySettings = async () => {
    try {
      const res = await fetch('/api/admin/economy/settings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data && !data.error) {
        setEconomySettings(data);
      }
    } catch (e) {}
  };

  const fetchGiftCatalog = async () => {
    setIsGiftsLoading(true);
    try {
      const res = await fetch('/api/admin/gifts', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setGiftCatalog(data);
      }
    } catch (e) {}
    finally { setIsGiftsLoading(false); }
  };

  const handleUpdateEconomy = async () => {
    setIsEconomyLoading(true);
    try {
      if (economySettings.require_2fa_for_economy) {
        const res = await fetch('/api/admin/approval-queue/submit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            actionType: 'update_ad_pricing',
            payload: economySettings
          })
        });
        const data = await res.json();
        if (data.success) {
          setVerificationModal({
            isOpen: true,
            requestId: data.requestId,
            code: '',
            actionType: 'update_ad_pricing',
            payload: economySettings
          });
          toast.info(isRtl ? 'تم تقديم الطلب. يرجى التحقق بالرمز.' : 'Request submitted. Verification required.');
        }
        return;
      }

      const res = await fetch('/api/admin/economy/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(economySettings)
      });
      if (res.ok) {
        toast.success(isRtl ? 'تم تحديث إعدادات الاقتصاد بنجاح' : 'Economy settings updated');
      }
    } catch (e) {
      toast.error('Failed to update economy');
    } finally {
      setIsEconomyLoading(false);
    }
  };

  const handleSaveGift = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingGift ? `/api/admin/gifts/${editingGift.id}` : '/api/admin/gifts';
      const method = editingGift ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(giftFormData)
      });
      if (res.ok) {
        toast.success(isRtl ? 'تم حفظ الهدية' : 'Gift saved');
        setIsGiftModalOpen(false);
        fetchGiftCatalog();
      }
    } catch (e) {
      toast.error('Error saving gift');
    }
  };

  const handleDeleteGift = async (id: number) => {
    if (!window.confirm('Are you sure?')) return;
    try {
      const res = await fetch(`/api/admin/gifts/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('Deleted');
        fetchGiftCatalog();
      }
    } catch (e) {}
  };

  const fetchAdminAnalytics = async () => {
    setIsAnalyticsLoading(true);
    try {
      const res = await fetch('/api/ads/admin/analytics', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setAnalyticsData(data);
        }
      }
    } catch (err) {
      console.error('Fetch admin analytics error:', err);
    } finally {
      setIsAnalyticsLoading(false);
    }
    fetchHeatmapData();
    fetchRoiData();
  };

  const fetchHeatmapData = async () => {
    setIsHeatmapLoading(true);
    try {
      const res = await fetch('/api/admin/ads/heatmap', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setHeatmapData(data);
      }
    } catch (err) {
      console.error('Fetch heatmap error:', err);
    } finally {
      setIsHeatmapLoading(false);
    }
  };

  const fetchRoiData = async () => {
    setIsRoiLoading(true);
    try {
      const res = await fetch('/api/admin/ads/roi-analytics', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRoiData(data);
      }
    } catch (err) {
      console.error('Fetch ROI error:', err);
    } finally {
      setIsRoiLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    setIsAuditLoading(true);
    try {
      const res = await fetch('/api/admin/economy/audit', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data);
      }
    } catch (err) {
      console.error('Fetch audit logs error:', err);
    } finally {
      setIsAuditLoading(false);
    }
  };

  const fetchBulletinAds = async () => {
    setIsBulletinLoading(true);
    try {
      const res = await fetch('/api/bulletin/admin/list', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setBulletinAds(data.ads || []);
        }
      }
    } catch (err) {
      console.error('Fetch bulletin error:', err);
    } finally {
      setIsBulletinLoading(false);
    }
  };

  const handleExportSchedule = async () => {
    try {
      const res = await fetch('/api/bulletin/admin/export-schedule', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Export failed');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Ad_Schedule_Export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success(isRtl ? 'تم تصدير الجدول الزمني بنجاح' : 'Schedule exported successfully');
    } catch (err) {
      console.error('Export error:', err);
      toast.error(isRtl ? 'فشل تصدير الجدول' : 'Failed to export schedule');
    }
  };

  const handleApproveBulletinAd = async (id: number) => {
    try {
      const res = await fetch(`/api/bulletin/admin/${id}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        toast.success(isRtl ? 'تمت الموافقة على الإعلان ونشره بنجاح' : 'Ad approved and published successfully');
        fetchBulletinAds();
      } else {
        toast.error(data.error || 'فشل اعتماد الإعلان');
      }
    } catch (e) {
      toast.error('حدث خطأ أثناء القبول');
    }
  };

  const handleRejectBulletinAd = async (id: number) => {
    try {
      const res = await fetch(`/api/bulletin/admin/${id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          reason: rejectionReason || (isRtl ? 'لا يتوافق مع شروط النشر' : 'Does not meet guidelines'),
          refund: refundOnReject
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(isRtl ? 'تم رفض الإعلان ومعالجة الطلب' : 'Ad rejected');
        setRejectingAdId(null);
        setRejectionReason('');
        fetchBulletinAds();
      } else {
        toast.error(data.error || 'فشل رفض الإعلان');
      }
    } catch (e) {
      toast.error('حدث خطأ أثناء الرفض');
    }
  };

  const handleDeleteBulletinAd = async (id: number) => {
    if (!window.confirm(isRtl ? 'هل أنت تأكد من حذف هذا الإعلان نهائياً؟' : 'Are you sure you want to delete this ad?')) {
      return;
    }
    try {
      const res = await fetch(`/api/bulletin/admin/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        toast.success(isRtl ? 'تم حذف الإعلان نهائياً' : 'Ad deleted');
        fetchBulletinAds();
      } else {
        toast.error(data.error || 'فشل الحذف');
      }
    } catch (e) {
      toast.error('حدث خطأ أثناء الحذف');
    }
  };

  const handleBulkDeleteBulletinAds = async (targetIds?: number[]) => {
    const idsToDelete = targetIds || selectedBulletinIds;
    if (idsToDelete.length === 0) {
      toast.error(isRtl ? 'الرجاء تحديد إعلان واحد على الأقل' : 'Please select at least one ad');
      return;
    }
    if (!window.confirm(isRtl ? `هل أنت متأكد من حذف ${idsToDelete.length} إعلان المحددة نهائياً؟` : `Are you sure you want to delete ${idsToDelete.length} selected ads permanently?`)) {
      return;
    }
    try {
      const res = await fetch('/api/bulletin/admin/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ids: idsToDelete })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(isRtl ? 'تم حذف الإعلانات المحددة بنجاح' : 'Selected ads deleted successfully');
        setSelectedBulletinIds([]);
        fetchBulletinAds();
      } else {
        toast.error(data.error || 'فشل الحذف الجماعي');
      }
    } catch (e) {
      toast.error('حدث خطأ أثناء الحذف الجماعي');
    }
  };

  const handleDeleteAllExpiredOrRejected = () => {
    const targetIds = bulletinAds
      .filter(a => a.status === 'expired' || a.status === 'rejected')
      .map(a => a.id);
    if (targetIds.length === 0) {
      toast.info(isRtl ? 'لا توجد إعلانات منتهية أو مرفوضة للحذف' : 'No expired or rejected ads to delete');
      return;
    }
    handleBulkDeleteBulletinAds(targetIds);
  };

  const handleStopBulletinAd = async (id: number) => {
    try {
      const res = await fetch(`/api/bulletin/admin/${id}/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason: stopReason })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(isRtl ? 'تم إيقاف الإعلان وإشعار صاحب الإعلان بنجاح' : 'Ad stopped and user notified successfully');
        setStoppingAdId(null);
        setStopReason('');
        fetchBulletinAds();
      } else {
        toast.error(data.error || 'فشل إيقاف الإعلان');
      }
    } catch (e) {
      toast.error('حدث خطأ أثناء إيقاف الإعلان');
    }
  };

  const handleOpenCreateModal = () => {
    setEditingAd(null);
    setFormData({
      title_ar: '',
      title_en: '',
      description_ar: '',
      description_en: '',
      meta_title_ar: '',
      meta_title_en: '',
      meta_description_ar: '',
      meta_description_en: '',
      keywords_ar: '',
      keywords_en: '',
      image_url: '',
      video_url: '',
      poster_url: '',
      target_url: '',
      sponsor_name: 'Sponsor',
      badge_text_ar: 'مُموَّل',
      badge_text_en: 'Sponsored',
      position: 'sidebar',
      format: 'sidebar',
      display_order: 0,
      is_active: true
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (ad: AdItem) => {
    setEditingAd(ad);
    setFormData({
      title_ar: ad.title_ar || '',
      title_en: ad.title_en || '',
      description_ar: ad.description_ar || '',
      description_en: ad.description_en || '',
      meta_title_ar: ad.meta_title_ar || '',
      meta_title_en: ad.meta_title_en || '',
      meta_description_ar: ad.meta_description_ar || '',
      meta_description_en: ad.meta_description_en || '',
      keywords_ar: ad.keywords_ar || '',
      keywords_en: ad.keywords_en || '',
      image_url: ad.image_url || '',
      video_url: ad.video_url || '',
      poster_url: ad.poster_url || '',
      target_url: ad.target_url || '',
      sponsor_name: ad.sponsor_name || '',
      badge_text_ar: ad.badge_text_ar || 'مُموَّل',
      badge_text_en: ad.badge_text_en || 'Sponsored',
      position: ad.position || 'sidebar',
      format: ad.format || 'sidebar',
      display_order: ad.display_order || 0,
      is_active: ad.is_active
    });
    setIsModalOpen(true);
  };

  const handleToggleSelectAll = () => {
    if (selectedAdIds.length === filteredAds.length) {
      setSelectedAdIds([]);
    } else {
      setSelectedAdIds(filteredAds.map((a) => a.id));
    }
  };

  const handleToggleSelectAd = (id: number) => {
    setSelectedAdIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBulkDeleteAds = async () => {
    if (selectedAdIds.length === 0) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/ads/admin/bulk', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ ids: selectedAdIds })
      });

      if (res.ok) {
        toast.success(isRtl ? `تم حذف ${selectedAdIds.length} إعلان بنجاح` : `Successfully deleted ${selectedAdIds.length} ads`);
        setSelectedAdIds([]);
        setIsBulkDeleteModalOpen(false);
        fetchAds();
      } else {
        const err = await res.json();
        toast.error(err.error || (isRtl ? 'فشل الحذف الجماعي للإعلانات' : 'Failed to bulk delete ads'));
      }
    } catch (error) {
      console.error('Bulk delete error:', error);
      toast.error(isRtl ? 'حدث خطأ أثناء الحذف الجماعي' : 'An error occurred during bulk deletion');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePosterUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const toastId = toast.loading(
      isRtl ? 'جاري رفع صورة الغلاف المصغرة (Poster)...' : 'Uploading poster thumbnail...'
    );

    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);

      const res = await fetch('/api/files/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formDataUpload
      });

      if (res.ok) {
        const data = await res.json();
        const fileUrl = data.fileUrl || data.url || data.path;
        if (fileUrl) {
          setFormData((prev) => ({ ...prev, poster_url: fileUrl }));
          toast.dismiss(toastId);
          toast.success(isRtl ? 'تم رفع صورة الغلاف المصغرة بنجاح' : 'Poster thumbnail uploaded successfully');
          return;
        }
      }
      toast.dismiss(toastId);
      toast.error(isRtl ? 'فشل رفع صورة الغلاف' : 'Poster upload failed');
    } catch (err) {
      toast.dismiss(toastId);
      toast.error(isRtl ? 'خطأ أثناء رفع صورة الغلاف' : 'Error during poster upload');
    } finally {
      setIsUploading(false);
    }
  };

  const handleVideoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 100 * 1024 * 1024) {
      toast.error(isRtl ? 'حجم الفيديو كبير جداً (الحد الأقصى 100MB)' : 'Video is too large (max 100MB)');
      return;
    }

    const formDataUpload = new FormData();
    formDataUpload.append('file', file);

    setIsUploading(true);
    try {
      const res = await fetch('/api/files/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formDataUpload
      });

      if (res.ok) {
        const data = await res.json();
        const fileUrl = data.fileUrl || data.url || data.path;
        if (fileUrl) {
          setFormData((prev) => ({ ...prev, video_url: fileUrl }));
          toast.success(isRtl ? 'تم رفع مقطع الفيديو بنجاح!' : 'Video uploaded successfully!');

          try {
            const thumb = await extractVideoThumbnail(file);
            if (thumb) {
              setFormData((prev) => ({ ...prev, image_url: prev.image_url || thumb }));
              toast.info(isRtl ? 'تم التقاط صورة الغلاف تلقائياً من إطار الفيديو' : 'Cover image extracted automatically from video');
            }
          } catch (tErr) {
            // Auto thumb extraction silent handling
          }
        }
      } else {
        toast.error(isRtl ? 'فشل رفع ملف الفيديو' : 'Video upload failed');
      }
    } catch (err) {
      console.error('Video upload error:', err);
      toast.error(isRtl ? 'خطأ أثناء رفع الفيديو' : 'Error uploading video');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement> | { target: { files: FileList | File[] } }) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const toastId = toast.loading(
      isRtl ? 'جاري تقليص وتحسين الصورة لتناسب الشريط الجانبي...' : 'Optimizing and resizing image for sidebar display...'
    );

    try {
      const compressed = await compressAndResizeImage(file, {
        format: formData.format || 'sidebar',
        quality: 0.88,
        mimeType: 'image/webp'
      });

      const uploadFile = compressed.file;

      const formDataUpload = new FormData();
      formDataUpload.append('file', uploadFile);

      const res = await fetch('/api/files/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formDataUpload
      });

      if (res.ok) {
        const data = await res.json();
        const fileUrl = data.fileUrl || data.url || data.path;
        if (fileUrl) {
          setFormData((prev) => ({ ...prev, image_url: fileUrl }));
          toast.dismiss(toastId);

          const origKb = (compressed.originalSize / 1024).toFixed(0);
          const compKb = (compressed.compressedSize / 1024).toFixed(0);

          if (compressed.compressedSize < compressed.originalSize) {
            toast.success(
              isRtl
                ? `تم تقليص ورفع الصورة بنجاح! (${compKb}KB بدلاً من ${origKb}KB)`
                : `Image optimized & uploaded! (${compKb}KB down from ${origKb}KB)`
            );
          } else {
            toast.success(isRtl ? 'تم رفع الصورة بنجاح' : 'Image uploaded successfully');
          }
          return;
        }
      }
      toast.dismiss(toastId);
      toast.error(isRtl ? 'فشل رفع الصورة' : 'Image upload failed');
    } catch (err) {
      toast.dismiss(toastId);
      console.error('Image upload error:', err);
      toast.error(isRtl ? 'خطأ أثناء رفع الصورة' : 'Error during image upload');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const hasMedia = Boolean(formData.image_url.trim() || formData.video_url?.trim());

    if (!formData.title_ar.trim() || !formData.title_en.trim() || !hasMedia || !formData.target_url.trim()) {
      toast.error(isRtl ? 'يرجى ملء جميع الحقول الإلزامية (العنوان والصورة أو الفيديو والرابط)' : 'Please fill all required fields (Titles, Image/Video, Target URL)');
      return;
    }

    const payload = {
      ...formData,
      image_url: formData.image_url.trim() || (formData.video_url?.trim() ? '/uploads/default_video_poster.jpg' : ''),
      meta_title_ar: formData.meta_title_ar.trim() || null,
      meta_title_en: formData.meta_title_en.trim() || null,
      meta_description_ar: formData.meta_description_ar.trim() || null,
      meta_description_en: formData.meta_description_en.trim() || null,
      keywords_ar: formData.keywords_ar.trim() || null,
      keywords_en: formData.keywords_en.trim() || null,
    };

    setIsSubmitting(true);
    try {
      const url = editingAd ? `/api/ads/admin/update/${editingAd.id}` : '/api/ads/admin/create';
      const method = editingAd ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success(editingAd ? (isRtl ? 'تم تحديث الإعلان بنجاح' : 'Ad updated successfully') : (isRtl ? 'تم إنشاء الإعلان بنجاح' : 'Ad created successfully'));
        setIsModalOpen(false);
        fetchAds();
      } else {
        const errData = await res.json();
        toast.error(errData.error || (isRtl ? 'فشل حفظ الإعلان' : 'Failed to save ad'));
      }
    } catch (err) {
      console.error('Submit error:', err);
      toast.error(isRtl ? 'حدث خطأ غير متوقع' : 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (id: number) => {
    try {
      const res = await fetch(`/api/ads/admin/toggle/${id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (res.ok) {
        toast.success(isRtl ? 'تم تغيير حالة الإعلان' : 'Ad status updated');
        setAds((prev) =>
          prev.map((ad) => (ad.id === id ? { ...ad, is_active: !ad.is_active } : ad))
        );
      } else {
        toast.error(isRtl ? 'فشل تغيير الحالة' : 'Failed to toggle status');
      }
    } catch (err) {
      toast.error(isRtl ? 'خطأ في الاتصال' : 'Connection error');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(isRtl ? 'هل أنت تأكد من حذف هذا الإعلان؟' : 'Are you sure you want to delete this ad?')) {
      return;
    }

    try {
      const res = await fetch(`/api/ads/admin/delete/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (res.ok) {
        toast.success(isRtl ? 'تم حذف الإعلان بنجاح' : 'Ad deleted successfully');
        setAds((prev) => prev.filter((ad) => ad.id !== id));
      } else {
        toast.error(isRtl ? 'فشل حذف الإعلان' : 'Failed to delete ad');
      }
    } catch (err) {
      toast.error(isRtl ? 'خطأ أثناء الحذف' : 'Error deleting ad');
    }
  };

  const filteredAds = ads.filter((ad) => {
    const q = search.toLowerCase();
    return (
      ad.title_ar.toLowerCase().includes(q) ||
      ad.title_en.toLowerCase().includes(q) ||
      (ad.sponsor_name && ad.sponsor_name.toLowerCase().includes(q))
    );
  });

  const totalActive = ads.filter((a) => a.is_active).length;
  const totalImpressions = ads.reduce((acc, a) => acc + (a.impression_count || 0), 0);
  const totalClicks = ads.reduce((acc, a) => acc + (a.click_count || 0), 0);
  const avgCtr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-6 ads-management-container transition-theme [will-change:background-color,border-color,color]">
      {/* Top Header & Stat Cards */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[var(--bg-secondary)] border border-[var(--border-main)] p-5 rounded-lg shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-accent  mb-1">
            <Megaphone size={20} />
            <h2 className="text-xl font-black text-[var(--text-primary)]">
              {isRtl ? 'إدارة الإعلانات والشريط الجانبي' : 'Ads & Sidebar Sponsored Management'}
            </h2>
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            {isRtl
              ? 'التحكم المباشر بالإعلانات الجانبية التي تظهر للمستخدمين.'
              : 'Directly control sidebar sponsored cards shown to users.'}
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-accent hover:bg-accent text-white font-bold text-xs shadow-lg shadow-none transition-theme shrink-0"
        >
          <Plus size={16} />
          <span>{isRtl ? 'إضافة إعلان جديد' : 'Create New Ad'}</span>
        </button>
      </div>

      {/* Sub-Tab Switcher */}
      <div className="flex items-center gap-3 border-b border-[var(--border-main)] pb-3">
        <button
          onClick={() => setActiveTab('platform')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-theme flex items-center gap-2 ${
            activeTab === 'platform'
              ? 'bg-accent text-white shadow-md shadow-none'
              : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-accent'
          }`}
        >
          <Megaphone size={15} />
          <span>{isRtl ? 'إعلانات الشريط الجانبي والمنصة' : 'Platform & Sidebar Ads'}</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/20 text-white font-extrabold">
            {ads.length}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveTab('bulletin');
            fetchBulletinAds();
          }}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-theme flex items-center gap-2 ${
            activeTab === 'bulletin'
              ? 'bg-accent text-white shadow-md shadow-none'
              : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-accent'
          }`}
        >
          <Sparkles size={15} />
          <span>{isRtl ? 'لوحة إعلانات المستخدمين والمجتمع' : 'Community Bulletin Ads'}</span>
          {bulletinAds.filter(b => b.status === 'pending').length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500 text-white font-extrabold animate-pulse">
              {bulletinAds.filter(b => b.status === 'pending').length} {isRtl ? 'معلّق' : 'Pending'}
            </span>
          )}
        </button>

        <button
          onClick={() => {
            setActiveTab('analytics');
            fetchAdminAnalytics();
          }}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-theme flex items-center gap-2 ${
            activeTab === 'analytics'
              ? 'bg-accent text-white shadow-md shadow-none'
              : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-accent'
          }`}
        >
          <BarChart2 size={15} />
          <span>{isRtl ? 'تحليلات الإعلانات والإيرادات الشاملة' : 'Ad Analytics & Advertiser Revenue'}</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('economy');
            fetchEconomySettings();
            fetchGiftCatalog();
          }}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-theme flex items-center gap-2 ${
            activeTab === 'economy'
              ? 'bg-accent text-white shadow-md shadow-none'
              : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-accent'
          }`}
        >
          <Coins size={15} />
          <span>{isRtl ? 'إعدادات الأسعار والهدايا' : 'Economy & Pricing Settings'}</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('approval');
            fetchApprovalQueue();
          }}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-theme flex items-center gap-2 ${
            activeTab === 'approval'
              ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
              : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-amber-500'
          }`}
        >
          <CheckCircle2 size={15} />
          <span>{isRtl ? 'قائمة الموافقات (2FA)' : 'Approval Queue (2FA)'}</span>
          {approvalRequests.filter(r => r.status === 'pending').length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-red-500 text-white font-extrabold animate-pulse">
              {approvalRequests.filter(r => r.status === 'pending').length}
            </span>
          )}
        </button>

        <button
          onClick={() => {
            setActiveTab('audit');
            fetchAuditLogs();
          }}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-theme flex items-center gap-2 ${
            activeTab === 'audit'
              ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20'
              : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-blue-500'
          }`}
        >
          <History size={15} />
          <span>{isRtl ? 'سجل التدقيق المالي' : 'Audit Trail'}</span>
        </button>
      </div>

      {/* Conditional Content based on Active Tab */}
      {activeTab === 'analytics' ? (
        <div className="space-y-6">
          {isAnalyticsLoading || !analyticsData ? (
            <div className="p-12 text-center text-xs text-gray-400 flex flex-col items-center gap-2 bg-[var(--bg-secondary)] border border-[var(--border-main)] rounded-xl">
              <RefreshCw size={24} className="animate-spin text-accent" />
              <span>{isRtl ? 'جاري تحميل تحليلات وإيرادات الإعلانات...' : 'Loading ad analytics & revenue...'}</span>
            </div>
          ) : (
            <>
              {/* Summary Metrics */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-[var(--bg-secondary)] border border-[var(--border-main)] p-4 rounded-xl flex items-center gap-3 shadow-sm">
                  <div className="p-2.5 rounded-lg bg-accent/10 text-accent ">
                    <DollarSign size={22} />
                  </div>
                  <div>
                    <div className="text-[11px] text-[var(--text-muted)] font-bold">{isRtl ? 'إجمالي إيرادات الإعلانات' : 'Total Ad Revenue'}</div>
                    <div className="text-xl font-black text-accent">${analyticsData.summary.totalRevenue}</div>
                  </div>
                </div>

                <div className="bg-[var(--bg-secondary)] border border-[var(--border-main)] p-4 rounded-xl flex items-center gap-3 shadow-sm">
                  <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-500">
                    <Eye size={22} />
                  </div>
                  <div>
                    <div className="text-[11px] text-[var(--text-muted)] font-bold">{isRtl ? 'إجمالي المشاهدات' : 'Total Impressions'}</div>
                    <div className="text-xl font-black text-[var(--text-primary)]">{analyticsData.summary.totalImpressions.toLocaleString()}</div>
                  </div>
                </div>

                <div className="bg-[var(--bg-secondary)] border border-[var(--border-main)] p-4 rounded-xl flex items-center gap-3 shadow-sm">
                  <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-500">
                    <MousePointerClick size={22} />
                  </div>
                  <div>
                    <div className="text-[11px] text-[var(--text-muted)] font-bold">{isRtl ? 'إجمالي النقرات' : 'Total Clicks'}</div>
                    <div className="text-xl font-black text-[var(--text-primary)]">{analyticsData.summary.totalClicks.toLocaleString()}</div>
                  </div>
                </div>

                <div className="bg-[var(--bg-secondary)] border border-[var(--border-main)] p-4 rounded-xl flex items-center gap-3 shadow-sm">
                  <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-500">
                    <TrendingUp size={22} />
                  </div>
                  <div>
                    <div className="text-[11px] text-[var(--text-muted)] font-bold">{isRtl ? 'متوسط نسبة النقر (CTR)' : 'Average CTR'}</div>
                    <div className="text-xl font-black text-amber-500">{analyticsData.summary.avgCTR}%</div>
                  </div>
                </div>

                <div className="bg-[var(--bg-secondary)] border border-[var(--border-main)] p-4 rounded-xl flex items-center gap-3 shadow-sm col-span-2 lg:col-span-1">
                  <div className="p-2.5 rounded-lg bg-teal-500/10 text-teal-500">
                    <Users size={22} />
                  </div>
                  <div>
                    <div className="text-[11px] text-[var(--text-muted)] font-bold">{isRtl ? 'عدد المعلنين والشركاء' : 'Active Advertisers'}</div>
                    <div className="text-xl font-black text-[var(--text-primary)]">{analyticsData.summary.activeAdvertisersCount}</div>
                  </div>
                </div>
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Time Series Area Chart */}
                <div className="lg:col-span-2 bg-[var(--bg-secondary)] border border-[var(--border-main)] rounded-2xl p-5 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between pb-3 border-b border-[var(--border-main)]">
                    <div>
                      <h3 className="font-black text-sm text-[var(--text-primary)] flex items-center gap-2">
                        <TrendingUp size={18} className="text-accent" />
                        <span>{isRtl ? 'مؤشر نمو المشاهدات والإيرادات اليومية' : 'Daily Impressions vs Revenue Timeline'}</span>
                      </h3>
                      <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                        {isRtl ? 'تطور الأداء المالي والمشاهدات خلال الـ 14 يوماً الماضية.' : 'Performance & revenue timeline for the past 14 days.'}
                      </p>
                    </div>
                  </div>

                  <div className="h-[280px] w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={analyticsData.timeSeriesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="adminRevGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#334155" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#334155" stopOpacity={0.0} />
                          </linearGradient>
                          <linearGradient id="adminImpGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                        <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#18181b',
                            borderColor: '#27272a',
                            borderRadius: '8px',
                            fontSize: '11px',
                            color: '#fff'
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                        <Area
                          type="monotone"
                          dataKey="revenue"
                          name={isRtl ? 'الإيرادات اليومية ($)' : 'Daily Revenue ($)'}
                          stroke="#334155"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#adminRevGrad)"
                        />
                        <Area
                          type="monotone"
                          dataKey="impressions"
                          name={isRtl ? 'المشاهدات (Impressions)' : 'Impressions'}
                          stroke="#3b82f6"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#adminImpGrad)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Placement & Type Breakdown */}
                <div className="bg-[var(--bg-secondary)] border border-[var(--border-main)] rounded-2xl p-5 space-y-4 shadow-sm">
                  <div className="pb-3 border-b border-[var(--border-main)]">
                    <h3 className="font-black text-sm text-[var(--text-primary)] flex items-center gap-2">
                      <PieIcon size={18} className="text-purple-500" />
                      <span>{isRtl ? 'توزيع أنواع وأماكن الإعلانات' : 'Ad Placement Breakdown'}</span>
                    </h3>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                      {isRtl ? 'مقارنة بين إعلانات لوحة المجتمع والشريط الجانبي.' : 'Comparison of Bulletin vs Sidebar ads.'}
                    </p>
                  </div>

                  <div className="h-[220px] w-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={analyticsData.placementData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          <Cell fill="#334155" />
                          <Cell fill="#6366f1" />
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#18181b',
                            borderColor: '#27272a',
                            borderRadius: '8px',
                            fontSize: '11px',
                            color: '#fff'
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: '10px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-[var(--border-main)] text-xs">
                    {analyticsData.placementData.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center">
                        <span className="text-[var(--text-muted)] font-medium">{item.name}</span>
                        <span className="font-extrabold text-accent">${item.revenue}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Advertisers Revenue Leaderboard Table */}
              <div className="bg-[var(--bg-secondary)] border border-[var(--border-main)] rounded-2xl p-5 space-y-4 shadow-sm">
                <div className="pb-3 border-b border-[var(--border-main)] flex items-center justify-between">
                  <div>
                    <h3 className="font-black text-sm text-[var(--text-primary)] flex items-center gap-2">
                      <Award size={18} className="text-accent" />
                      <span>{isRtl ? 'قائمة المعلنين والشركاء حسب الإيرادات والإنفاق' : 'Advertiser Revenue Leaderboard'}</span>
                    </h3>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                      {isRtl ? 'ترتيب أعلى المعلنين المولدين للإيرادات ونسب تفاعل إعلاناتهم.' : 'Top revenue-generating advertisers and their campaign CTR.'}
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-start text-xs border-collapse">
                    <thead>
                      <tr className="bg-[var(--bg-base)] border-b border-[var(--border-main)] text-[var(--text-muted)] font-bold">
                        <th className="p-3 text-start">{isRtl ? 'المُعلن / الشركة' : 'Advertiser / Sponsor'}</th>
                        <th className="p-3 text-center">{isRtl ? 'عدد الحملات' : 'Ads Count'}</th>
                        <th className="p-3 text-center">{isRtl ? 'إجمالي الإنفاق / الإيراد' : 'Total Revenue'}</th>
                        <th className="p-3 text-center">{isRtl ? 'المشاهدات' : 'Impressions'}</th>
                        <th className="p-3 text-center">{isRtl ? 'النقرات' : 'Clicks'}</th>
                        <th className="p-3 text-center">{isRtl ? 'معدل CTR' : 'CTR %'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-main)]">
                      {analyticsData.advertisers.map((adv: any, idx: number) => (
                        <tr key={idx} className="hover:bg-[var(--bg-base)]/50 transition-colors">
                          <td className="p-3">
                            <div className="font-extrabold text-[var(--text-primary)] flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-accent/10 text-accent flex items-center justify-center text-[10px] shrink-0 font-mono">
                                #{idx + 1}
                              </span>
                              <span>{adv.sponsor_name}</span>
                            </div>
                            <div className="text-[10px] text-gray-400 ms-7">{adv.user_email}</div>
                          </td>

                          <td className="p-3 text-center font-bold text-[var(--text-primary)]">
                            {adv.ads_count}
                          </td>

                          <td className="p-3 text-center font-black text-accent font-mono text-sm">
                            ${adv.total_revenue}
                          </td>

                          <td className="p-3 text-center font-bold text-blue-500 font-mono">
                            {adv.impressions.toLocaleString()}
                          </td>

                          <td className="p-3 text-center font-bold text-purple-500 font-mono">
                            {adv.clicks.toLocaleString()}
                          </td>

                          <td className="p-3 text-center font-black text-amber-500 font-mono">
                            {adv.ctr}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Campaign ROI Correlation Widget */}
              <div className="bg-[var(--bg-secondary)] border border-[var(--border-main)] rounded-2xl p-6 shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b border-[var(--border-main)] pb-4">
                  <div>
                    <h3 className="font-black text-sm text-[var(--text-primary)] flex items-center gap-2">
                      <TrendingUp size={18} className="text-accent" />
                      <span>{isRtl ? 'تحليل عائد الاستثمار (Campaign ROI Analysis)' : 'Campaign ROI & Revenue Correlation'}</span>
                    </h3>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                      {isRtl 
                        ? 'ربط الإنفاق الإعلاني بإجمالي إيرادات البث المباشر (الهدايا) لتحديد فترات الربحية القصوى.' 
                        : 'Correlating ad spend with live gift revenue to identify maximum profitability windows.'}
                    </p>
                  </div>
                  <button
                    onClick={fetchRoiData}
                    disabled={isRoiLoading}
                    className="p-2 rounded-lg bg-[var(--bg-base)] border border-[var(--border-main)] text-[var(--text-muted)] hover:text-accent transition-theme"
                  >
                    <RefreshCw size={14} className={isRoiLoading ? 'animate-spin' : ''} />
                  </button>
                </div>

                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={roiData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-main)" opacity={0.5} />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(val) => new Date(val).toLocaleDateString(isRtl ? 'ar-EG' : 'en-US', { day: 'numeric', month: 'short' })}
                        tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis 
                        yAxisId="left"
                        tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(val) => `$${val}`}
                      />
                      <YAxis 
                        yAxisId="right"
                        orientation="right"
                        tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(val) => `${val}%`}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'var(--bg-secondary)', 
                          borderColor: 'var(--border-main)',
                          borderRadius: '12px',
                          fontSize: '11px',
                          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                        }}
                        labelFormatter={(label) => {
                          if (!label || (typeof label !== 'string' && typeof label !== 'number')) return '';
                          return new Date(label).toLocaleDateString(isRtl ? 'ar-EG' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                      <Bar 
                        yAxisId="left"
                        dataKey="spend" 
                        name={isRtl ? 'الإنفاق الإعلاني' : 'Ad Spend'} 
                        fill="#6366f1" 
                        radius={[4, 4, 0, 0]} 
                        barSize={20}
                      />
                      <Area 
                        yAxisId="left"
                        type="monotone" 
                        dataKey="revenue" 
                        name={isRtl ? 'إيرادات الهدايا' : 'Gift Revenue'} 
                        fill="rgba(16, 185, 129, 0.1)" 
                        stroke="#334155" 
                        strokeWidth={2}
                      />
                      <Area 
                        yAxisId="right"
                        type="step" 
                        dataKey="roi_percent" 
                        name={isRtl ? 'نسبة الربحية ROI' : 'ROI %'} 
                        fill="rgba(245, 158, 11, 0.05)" 
                        stroke="#f59e0b" 
                        strokeWidth={1}
                        strokeDasharray="5 5"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-[var(--border-main)]">
                  <div className="bg-[var(--bg-base)]/50 p-3 rounded-xl border border-[var(--border-main)]">
                    <div className="text-[9px] text-[var(--text-muted)] font-black uppercase tracking-wider mb-1">{isRtl ? 'متوسط العائد' : 'Avg ROI'}</div>
                    <div className="text-sm font-black text-accent">
                      {roiData.length > 0 
                        ? (roiData.reduce((acc, curr) => acc + Number(curr.roi_percent), 0) / roiData.length).toFixed(1)
                        : '0.0'}%
                    </div>
                  </div>
                  <div className="bg-[var(--bg-base)]/50 p-3 rounded-xl border border-[var(--border-main)]">
                    <div className="text-[9px] text-[var(--text-muted)] font-black uppercase tracking-wider mb-1">{isRtl ? 'إجمالي الإنفاق' : 'Total Spend'}</div>
                    <div className="text-sm font-black text-indigo-500">
                      ${roiData.reduce((acc, curr) => acc + Number(curr.spend), 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-[var(--bg-base)]/50 p-3 rounded-xl border border-[var(--border-main)]">
                    <div className="text-[9px] text-[var(--text-muted)] font-black uppercase tracking-wider mb-1">{isRtl ? 'إجمالي الإيرادات' : 'Total Revenue'}</div>
                    <div className="text-sm font-black text-accent">
                      ${roiData.reduce((acc, curr) => acc + Number(curr.revenue), 0).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Ad Performance Heatmap Section */}
              <div className="bg-[var(--bg-secondary)] border border-[var(--border-main)] rounded-2xl p-6 shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b border-[var(--border-main)] pb-4">
                  <div>
                    <h3 className="font-black text-sm text-[var(--text-primary)] flex items-center gap-2">
                      <Monitor size={18} className="text-amber-500" />
                      <span>{isRtl ? 'خريطة الأداء الحرارية (Conversion Heatmap)' : 'Performance Heatmap (CR%)'}</span>
                    </h3>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                      {isRtl 
                        ? 'معدل التحويل (Clicks/Impressions) موزعة حسب اليوم والساعة لتحسين فترات البث المباشر.' 
                        : 'Conversion Rate distribution by day & hour to optimize high-traffic live windows.'}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-gray-800 border border-[var(--border-main)]"></div>
                      <span className="text-[9px] text-[var(--text-muted)] font-bold">0%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-accent shadow-[0_0_8px_rgba(156,163,175,0.5)]"></div>
                      <span className="text-[9px] text-[var(--text-muted)] font-bold">10%+</span>
                    </div>
                    <button
                      onClick={fetchHeatmapData}
                      className="p-2 rounded-lg bg-[var(--bg-base)] border border-[var(--border-main)] text-[var(--text-muted)] hover:text-amber-500 transition-theme"
                    >
                      <RefreshCw size={14} className={isHeatmapLoading ? 'animate-spin' : ''} />
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto pb-4 custom-scrollbar">
                  <div className="min-w-[800px] space-y-1">
                    {/* Header Hours */}
                    <div className="flex gap-1 ml-16 mb-2">
                      {Array.from({ length: 24 }).map((_, h) => (
                        <div key={h} className="flex-1 text-center text-[9px] font-black text-[var(--text-muted)] opacity-60">
                          {h.toString().padStart(2, '0')}
                        </div>
                      ))}
                    </div>

                    {/* Heatmap Rows */}
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, dIdx) => (
                      <div key={day} className="flex items-center gap-1">
                        <div className="w-16 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-tighter">
                          {isRtl ? [
                            'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'
                          ][dIdx] : day}
                        </div>
                        <div className="flex-1 flex gap-1">
                          {Array.from({ length: 24 }).map((_, hour) => {
                            const cell = heatmapData.find(item => item.day_of_week === dIdx && item.hour_of_day === hour);
                            const cr = cell ? Number(cell.conversion_rate) : 0;
                            
                            let bgColor = 'bg-gray-800/20';
                            let opacity = 'opacity-20';
                            let glow = '';

                            if (cr > 0) {
                              opacity = 'opacity-100';
                              if (cr < 2) bgColor = 'bg-accent/40';
                              else if (cr < 5) bgColor = 'bg-accent/60';
                              else if (cr < 8) bgColor = 'bg-accent/80';
                              else {
                                bgColor = 'bg-accent';
                                glow = 'shadow-[0_0_10px_rgba(156,163,175,0.4)]';
                              }
                            }

                            return (
                              <div 
                                key={hour}
                                title={`${day} ${hour}:00 - CR: ${cr.toFixed(2)}%`}
                                className={`flex-1 h-8 rounded-sm border border-[var(--border-main)]/50 transition-theme cursor-help group relative ${bgColor} ${opacity} ${glow} hover:scale-110 hover:z-10 hover:border-accent`}
                              >
                                {cr > 5 && (
                                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100">
                                    <TrendingUp size={10} className="text-white drop-shadow-md" />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-center gap-8 py-2 bg-[var(--bg-base)]/50 rounded-xl border border-[var(--border-main)]">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-accent"></div>
                    <span className="text-[10px] text-[var(--text-muted)] font-bold">
                      {isRtl ? 'تحويل مرتفع (>8%)' : 'High Conversion (>8%)'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-accent"></div>
                    <span className="text-[10px] text-[var(--text-muted)] font-bold">
                      {isRtl ? 'تحويل متوسط (2-5%)' : 'Moderate Conversion (2-5%)'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-gray-800"></div>
                    <span className="text-[10px] text-[var(--text-muted)] font-bold">
                      {isRtl ? 'بيانات منخفضة / صفرية' : 'Low / Zero Data'}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      ) : activeTab === 'approval' ? (
        <div className="space-y-6">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-main)] rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-[var(--border-main)] pb-4">
              <div>
                <h3 className="font-black text-sm text-[var(--text-primary)] flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-amber-500" />
                  <span>{isRtl ? 'قائمة الموافقات الإدارية (Approval Queue)' : 'Administrative Approval Queue'}</span>
                </h3>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  {isRtl 
                    ? 'الطلبات الحساسة التي تتطلب مراجعة أو تحقق بخطوتين (2FA) قبل التنفيذ.' 
                    : 'Sensitive requests requiring review or two-factor verification (2FA) before execution.'}
                </p>
              </div>
              <button
                onClick={fetchApprovalQueue}
                className="p-2 rounded-md border border-[var(--border-main)] bg-[var(--bg-base)] text-gray-400 hover:text-amber-500 transition-colors"
              >
                <RefreshCw size={15} />
              </button>
            </div>

            {approvalRequests.length === 0 ? (
              <div className="p-12 text-center text-xs text-gray-400 bg-[var(--bg-base)]/50 rounded-xl border border-dashed border-[var(--border-main)]">
                {isRtl ? 'لا توجد طلبات معلقة حالياً' : 'No pending approval requests.'}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Bulk Actions Bar */}
                {selectedRequests.length > 0 && (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-black text-xs">
                        {selectedRequests.length}
                      </div>
                      <span className="text-xs font-bold text-[var(--text-primary)]">
                        {isRtl ? `${selectedRequests.length} طلبات محددة` : `${selectedRequests.length} requests selected`}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleBulkReject}
                        className="px-4 py-2 rounded-lg bg-red-500/10 text-red-500 border border-red-500/20 text-[10px] font-black hover:bg-red-500 hover:text-white transition-theme"
                      >
                        {isRtl ? 'رفض المحدد' : 'Reject Selected'}
                      </button>
                      <button
                        onClick={handleBulkVerifyOpen}
                        className="px-6 py-2 rounded-lg bg-accent text-white shadow-lg shadow-none text-[10px] font-black hover:bg-accent active:scale-95 transition-theme"
                      >
                        {isRtl ? 'موافقة جماعية (2FA)' : 'Bulk Approve (2FA)'}
                      </button>
                    </div>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-start text-xs border-collapse">
                    <thead>
                      <tr className="bg-[var(--bg-base)] border-b border-[var(--border-main)] text-[var(--text-muted)] font-bold">
                        <th className="p-3 text-start w-10">
                          <input 
                            type="checkbox"
                            checked={selectedRequests.length === approvalRequests.filter(r => r.status === 'pending').length && approvalRequests.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedRequests(approvalRequests.filter(r => r.status === 'pending').map(r => r.id));
                              } else {
                                setSelectedRequests([]);
                              }
                            }}
                            className="w-4 h-4 rounded border-[var(--border-main)] bg-[var(--bg-secondary)] accent-accent"
                          />
                        </th>
                        <th className="p-3 text-start">{isRtl ? 'الطلب' : 'Request'}</th>
                        <th className="p-3 text-start">{isRtl ? 'صاحب الطلب' : 'Requester'}</th>
                        <th className="p-3 text-center">{isRtl ? 'الحالة' : 'Status'}</th>
                        <th className="p-3 text-center">{isRtl ? 'التاريخ' : 'Date'}</th>
                        <th className="p-3 text-end">{isRtl ? 'الإجراءات' : 'Actions'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-main)]">
                      {approvalRequests.map((req) => (
                        <motion.tr 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          key={req.id} 
                          className={`group transition-theme border-l-4 ${
                            selectedRequests.includes(req.id) ? 'bg-accent/5 border-accent' : 'hover:bg-[var(--bg-base)]/80 border-transparent'
                          } ${
                            req.status === 'approved' ? 'hover:border-accent/50' :
                            req.status === 'rejected' ? 'hover:border-red-500/50' :
                            'hover:border-amber-500/50'
                          }`}
                        >
                          <td className="p-3">
                            <input 
                              type="checkbox"
                              disabled={req.status !== 'pending'}
                              checked={selectedRequests.includes(req.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedRequests(prev => [...prev, req.id]);
                                } else {
                                  setSelectedRequests(prev => prev.filter(id => id !== req.id));
                                }
                              }}
                              className="w-4 h-4 rounded border-[var(--border-main)] bg-[var(--bg-secondary)] accent-accent disabled:opacity-30 cursor-pointer"
                            />
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${
                                req.status === 'approved' ? 'bg-accent/10 text-accent' :
                                req.status === 'rejected' ? 'bg-red-500/10 text-red-500' :
                                'bg-amber-500/10 text-amber-500'
                              }`}>
                                {req.action_type.includes('batch') ? <Zap size={14} /> : <Coins size={14} />}
                              </div>
                              <div>
                                <div className="font-black text-[var(--text-primary)] uppercase tracking-tight group-hover:text-accent transition-colors">
                                  {req.action_type.replace(/_/g, ' ')}
                                </div>
                                <div className="text-[9px] text-[var(--text-muted)] font-mono mt-0.5">
                                  REF: <span className="text-accent/70">#{req.id.toString().padStart(5, '0')}</span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex flex-col">
                              <div className="font-bold text-[var(--text-primary)] text-[11px]">{req.requester_name}</div>
                              <div className="text-[9px] text-[var(--text-muted)]">{req.requester_email}</div>
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider shadow-sm border ${
                                req.status === 'approved' ? 'bg-accent/10 text-accent border-accent/20' :
                                req.status === 'pending' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse' :
                                'bg-red-500/10 text-red-500 border-red-500/20'
                              }`}>
                                {req.status}
                              </span>
                              {req.status === 'rejected' && req.rejection_reason && (
                                <span className="text-[8px] text-red-400 max-w-[100px] truncate" title={req.rejection_reason}>
                                  {req.rejection_reason}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-center text-[10px] text-[var(--text-muted)] font-medium">
                            <div className="flex flex-col">
                              <span>{new Date(req.created_at).toLocaleDateString(isRtl ? 'ar-EG' : 'en-US')}</span>
                              <span className="opacity-60">{new Date(req.created_at).toLocaleTimeString(isRtl ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </td>
                          <td className="p-3 text-end">
                            {req.status === 'pending' ? (
                              <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => setVerificationModal({ 
                                    isOpen: true, 
                                    requestId: req.id, 
                                    code: '', 
                                    actionType: req.action_type,
                                    payload: req.payload
                                  })}
                                  className="px-3 py-1.5 rounded-lg bg-accent text-white font-black text-[9px] hover:bg-accent shadow-lg shadow-none active:scale-95 transition-theme"
                                >
                                  {isRtl ? 'اعتماد' : 'APPROVE'}
                                </button>
                                <button
                                  onClick={() => {
                                    const reason = window.prompt('Reason for rejection?');
                                    if (reason) handleRejectApproval(req.id, reason);
                                  }}
                                  className="p-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-theme"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end gap-2 text-[var(--text-muted)] opacity-40">
                                <Info size={14} />
                                <span className="text-[9px] font-bold uppercase">{isRtl ? 'مكتمل' : 'Processed'}</span>
                              </div>
                            )}
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : activeTab === 'audit' ? (
        <div className="space-y-6">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-main)] rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-sm font-black text-[var(--text-primary)] flex items-center gap-2 uppercase tracking-tight">
                  <History size={18} className="text-blue-500" />
                  <span>{isRtl ? 'سجل التدقيق المالي والامتثال' : 'Financial Audit & Compliance Trail'}</span>
                </h3>
                <p className="text-[10px] text-[var(--text-muted)] mt-1 font-bold">
                  {isRtl ? 'سجل كامل لجميع تغييرات الأسعار، تعديلات الاقتصاد، والموافقات الجماعية.' : 'Full chronological log of all pricing changes, economy adjustments, and batch approvals.'}
                </p>
              </div>
              <button 
                onClick={fetchAuditLogs}
                disabled={isAuditLoading}
                className="p-2 rounded-lg bg-[var(--bg-base)] border border-[var(--border-main)] text-[var(--text-muted)] hover:text-blue-500 transition-theme shadow-sm disabled:opacity-50"
              >
                <RefreshCw size={15} className={isAuditLoading ? 'animate-spin' : ''} />
              </button>
            </div>

            {isAuditLoading && auditLogs.length === 0 ? (
              <div className="p-12 text-center text-xs text-gray-400 bg-[var(--bg-base)]/50 rounded-xl border border-dashed border-[var(--border-main)]">
                <RefreshCw size={24} className="animate-spin text-blue-500 mx-auto mb-2" />
                <span>{isRtl ? 'جاري تحميل سجل التدقيق...' : 'Loading audit history...'}</span>
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="p-12 text-center text-xs text-gray-400 bg-[var(--bg-base)]/50 rounded-xl border border-dashed border-[var(--border-main)]">
                {isRtl ? 'لا توجد سجلات تدقيق متاحة حالياً.' : 'No audit records available yet.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-start text-[10px] border-collapse">
                  <thead>
                    <tr className="bg-[var(--bg-base)] border-b border-[var(--border-main)] text-[var(--text-muted)] font-bold uppercase tracking-wider">
                      <th className="p-3 text-start w-12">#</th>
                      <th className="p-3 text-start">{isRtl ? 'المسؤول' : 'Admin'}</th>
                      <th className="p-3 text-start">{isRtl ? 'الحقل' : 'Field'}</th>
                      <th className="p-3 text-center">{isRtl ? 'القيمة القديمة' : 'Old Value'}</th>
                      <th className="p-3 text-center">{isRtl ? 'القيمة الجديدة' : 'New Value'}</th>
                      <th className="p-3 text-center">{isRtl ? 'النوع' : 'Type'}</th>
                      <th className="p-3 text-end">{isRtl ? 'التاريخ' : 'Date'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-main)]">
                    {auditLogs.map((log) => (
                      <motion.tr 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        key={log.id} 
                        className="hover:bg-[var(--bg-base)]/50 transition-colors group"
                      >
                        <td className="p-3 font-mono text-[var(--text-muted)] opacity-50">
                          {log.id.toString().padStart(4, '0')}
                        </td>
                        <td className="p-3">
                          <div className="flex flex-col">
                            <span className="font-black text-[var(--text-primary)]">{log.admin_name}</span>
                            <span className="opacity-60 text-[9px]">{log.admin_email}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="font-bold text-[var(--text-primary)] lowercase bg-[var(--bg-base)] px-1.5 py-0.5 rounded border border-[var(--border-main)]">
                            {log.field_name.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span className="text-red-500/80 font-mono">${Number(log.old_value).toFixed(log.field_name.includes('impression') ? 4 : 2)}</span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <TrendingUp size={10} className={Number(log.new_value) > Number(log.old_value) ? 'text-accent' : 'text-red-500 rotate-180'} />
                            <span className="text-accent font-black font-mono">
                              ${Number(log.new_value).toFixed(log.field_name.includes('impression') ? 4 : 2)}
                            </span>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter ${
                            log.change_type === 'batch' ? 'bg-purple-500/10 text-purple-500' :
                            log.change_type === 'bulk_approval' ? 'bg-amber-500/10 text-amber-500' :
                            'bg-blue-500/10 text-blue-500'
                          }`}>
                            {log.change_type.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="p-3 text-end font-medium">
                          <div className="flex flex-col items-end">
                            <span className="text-[var(--text-primary)]">{new Date(log.created_at).toLocaleDateString(isRtl ? 'ar-EG' : 'en-US')}</span>
                            <span className="text-[var(--text-muted)] opacity-60">{new Date(log.created_at).toLocaleTimeString(isRtl ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : activeTab === 'economy' ? (
        <div className="space-y-6">
          {/* Batch Pricing Adjustment Control */}
          <div className="bg-accent/5 border border-accent/20 rounded-2xl p-6 shadow-sm overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none group-hover:scale-110 transition-transform duration-700">
              <TrendingUp size={120} className="text-accent" />
            </div>
            
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex-1">
                <h3 className="font-black text-sm text-[var(--text-primary)] flex items-center gap-2">
                  <Zap size={18} className="text-accent animate-pulse" />
                  <span>{isRtl ? 'التحكم الجماعي في الأسعار' : 'Batch Pricing Adjustment'}</span>
                </h3>
                <p className="text-[11px] text-[var(--text-muted)] mt-1 max-w-lg">
                  {isRtl 
                    ? 'تطبيق زيادة أو خفض مئوي على جميع وحدات الإعلانات (لوحة المجتمع، الظهور الجانبي، والنقرات) في خطوة واحدة.' 
                    : 'Apply a global percentage increase or decrease across all ad units (Bulletin, Sidebar Impressions, and Clicks) simultaneously.'}
                </p>
              </div>

              <div className="flex items-center gap-4 bg-[var(--bg-secondary)] p-2 rounded-xl border border-[var(--border-main)] min-w-[300px]">
                <div className="flex-1 space-y-1 px-2">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-black text-[var(--text-muted)] uppercase">{isRtl ? 'النسبة' : 'Percentage'}</span>
                    <span className={`text-xs font-black ${batchAdjustmentPercent > 0 ? 'text-accent' : batchAdjustmentPercent < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                      {batchAdjustmentPercent > 0 ? '+' : ''}{batchAdjustmentPercent}%
                    </span>
                  </div>
                  <input 
                    type="range"
                    min="-50"
                    max="100"
                    step="5"
                    value={batchAdjustmentPercent}
                    onChange={(e) => setBatchAdjustmentPercent(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-accent"
                  />
                </div>
                <button
                  onClick={async () => {
                    if (batchAdjustmentPercent === 0) return;
                    
                    if (economySettings.require_2fa_for_economy) {
                      try {
                        const res = await fetch('/api/admin/approval-queue/submit', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                          },
                          body: JSON.stringify({
                            actionType: 'batch_update_ad_pricing',
                            payload: { percent: batchAdjustmentPercent }
                          })
                        });
                        const data = await res.json();
                        if (data.success) {
                          setVerificationModal({
                            isOpen: true,
                            requestId: data.requestId,
                            code: '',
                            actionType: 'batch_update_ad_pricing',
                            payload: { percent: batchAdjustmentPercent }
                          });
                          toast.info(isRtl ? 'تم تقديم طلب التعديل الجماعي. يرجى التحقق.' : 'Batch adjustment request submitted. Verification required.');
                          setBatchAdjustmentPercent(0);
                        }
                      } catch (e) {
                        toast.error('Failed to submit batch request');
                      }
                      return;
                    }

                    const multiplier = 1 + (batchAdjustmentPercent / 100);
                    setEconomySettings(prev => ({
                      ...prev,
                      bulletin_ad_daily_price: Number((prev.bulletin_ad_daily_price * multiplier).toFixed(2)),
                      sidebar_ad_impression_price: Number((prev.sidebar_ad_impression_price * multiplier).toFixed(4)),
                      sidebar_ad_click_price: Number((prev.sidebar_ad_click_price * multiplier).toFixed(2))
                    }));
                    toast.info(isRtl 
                      ? `تم تطبيق تعديل بنسبة ${batchAdjustmentPercent}%. تأكد من الحفظ.` 
                      : `Applied ${batchAdjustmentPercent}% adjustment. Please save to persist.`
                    );
                    setBatchAdjustmentPercent(0);
                  }}
                  disabled={batchAdjustmentPercent === 0}
                  className="px-5 py-2.5 rounded-lg bg-accent text-white font-black text-xs hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed transition-theme shadow-lg shadow-none active:scale-95"
                >
                  {isRtl ? 'تطبيق التعديل' : 'Apply Adjustment'}
                </button>
              </div>
            </div>
          </div>

          {/* Ad Preview Simulation Trigger */}
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-main)] rounded-2xl p-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                <Monitor size={20} />
              </div>
              <div>
                <h4 className="text-sm font-black text-[var(--text-primary)]">
                  {isRtl ? 'محاكي معاينة الإعلانات الحية' : 'Live Ad Preview Simulator'}
                </h4>
                <p className="text-[10px] text-[var(--text-muted)] font-bold">
                  {isRtl ? 'اختبار كيف يرى المستخدمون إعلاناتك بناءً على الأسعار الحالية.' : 'Test how users see your ads based on the current pricing configurations.'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowAdPreview(true)}
              className="px-6 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-main)] text-[var(--text-primary)] font-black text-xs flex items-center gap-2 hover:border-accent hover:text-accent transition-theme shadow-sm group"
            >
              <ExternalLink size={14} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              <span>{isRtl ? 'فتح المحاكي' : 'Open Simulator'}</span>
            </button>
          </div>

          {/* System Economy Pricing */}
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-main)] rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-[var(--border-main)] pb-4">
              <div>
                <h3 className="font-black text-sm text-[var(--text-primary)] flex items-center gap-2">
                  <Coins size={18} className="text-accent" />
                  <span>{isRtl ? 'إعدادات تسعير المنصة والعمولات' : 'Platform Pricing & Commission Settings'}</span>
                </h3>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  {isRtl ? 'التحكم المطلق في أسعار الإعلانات ونسبة عمولة المنصة من هدايا البث المباشر.' : 'Total control over ad prices and live stream gift commission.'}
                </p>
              </div>
              <button
                onClick={handleUpdateEconomy}
                disabled={isEconomyLoading}
                className="px-4 py-2 rounded-md bg-accent text-white font-bold text-xs flex items-center gap-2 hover:bg-accent disabled:opacity-50"
              >
                {isEconomyLoading ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                <span>{isRtl ? 'حفظ التغييرات المالية' : 'Save Economy Settings'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider block">
                  {isRtl ? 'سعر إعلان لوحة المجتمع (يومي)' : 'Bulletin Ad Price (Daily)'}
                </label>
                <div className="relative">
                  <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-accent" />
                  <input
                    type="number"
                    step="0.1"
                    value={economySettings.bulletin_ad_daily_price}
                    onChange={(e) => setEconomySettings({ ...economySettings, bulletin_ad_daily_price: parseFloat(e.target.value) })}
                    className="w-full bg-[var(--bg-base)] border border-[var(--border-main)] rounded-md py-2.5 pl-9 pr-4 text-xs font-bold text-[var(--text-primary)] focus:border-accent outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider block">
                  {isRtl ? 'عمولة المنصة من الهدايا (%)' : 'Gift Commission Percent (%)'}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-amber-500">%</span>
                  <input
                    type="number"
                    value={economySettings.live_gift_commission_percent}
                    onChange={(e) => setEconomySettings({ ...economySettings, live_gift_commission_percent: parseInt(e.target.value) })}
                    className="w-full bg-[var(--bg-base)] border border-[var(--border-main)] rounded-md py-2.5 pl-9 pr-4 text-xs font-bold text-[var(--text-primary)] focus:border-accent outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider block">
                  {isRtl ? 'سعر ظهور الإعلان الجانبي' : 'Sidebar Ad Impression Price'}
                </label>
                <div className="relative">
                  <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500" />
                  <input
                    type="number"
                    step="0.001"
                    value={economySettings.sidebar_ad_impression_price}
                    onChange={(e) => setEconomySettings({ ...economySettings, sidebar_ad_impression_price: parseFloat(e.target.value) })}
                    className="w-full bg-[var(--bg-base)] border border-[var(--border-main)] rounded-md py-2.5 pl-9 pr-4 text-xs font-bold text-[var(--text-primary)] focus:border-accent outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider block">
                  {isRtl ? 'سعر النقرة على الإعلان الجانبي' : 'Sidebar Ad Click Price'}
                </label>
                <div className="relative">
                  <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-500" />
                  <input
                    type="number"
                    step="0.01"
                    value={economySettings.sidebar_ad_click_price}
                    onChange={(e) => setEconomySettings({ ...economySettings, sidebar_ad_click_price: parseFloat(e.target.value) })}
                    className="w-full bg-[var(--bg-base)] border border-[var(--border-main)] rounded-md py-2.5 pl-9 pr-4 text-xs font-bold text-[var(--text-primary)] focus:border-accent outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Sidebar Master Control */}
            <div className="pt-6 border-t border-[var(--border-main)] flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500">
                  <Monitor size={24} />
                </div>
                <div>
                  <h4 className="font-black text-sm text-[var(--text-primary)]">
                    {isRtl ? 'حالة الشريط الجانبي (تحكم إداري كامل)' : 'Sidebar Master Control'}
                  </h4>
                  <p className="text-[10px] text-[var(--text-muted)] mt-1 max-w-md">
                    {isRtl 
                      ? 'عند تعطيل الشريط الجانبي، سيتم إيقاف عرض الإعلانات والعناصر الجانبية بالكامل في واجهة المستخدم فوراً وعدم خروجها عن السيطرة.' 
                      : 'When disabled, sidebar ads and sponsored panels are fully hidden across the application under strict admin control.'}
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={economySettings.sidebar_ads_enabled ?? true}
                  onChange={(e) => setEconomySettings({ ...economySettings, sidebar_ads_enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-500"></div>
              </label>
            </div>

            {/* 2FA Security Control */}
            <div className="pt-6 border-t border-[var(--border-main)] flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-amber-500/10 text-amber-500">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h4 className="font-black text-sm text-[var(--text-primary)]">
                    {isRtl ? 'حماية الموافقة الثنائية (2FA)' : '2FA Approval Protection'}
                  </h4>
                  <p className="text-[10px] text-[var(--text-muted)] mt-1 max-w-md">
                    {isRtl 
                      ? 'عند التفعيل، سيتطلب أي تغيير في أسعار الإعلانات أو إعدادات الاقتصاد رمز تحقق (2FA) قبل التنفيذ.' 
                      : 'When enabled, any changes to ad pricing or economy settings will require a verification code (2FA) before execution.'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEconomySettings(prev => ({ ...prev, require_2fa_for_economy: !prev.require_2fa_for_economy }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  economySettings.require_2fa_for_economy ? 'bg-amber-500' : 'bg-gray-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    economySettings.require_2fa_for_economy ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Gift Catalog Management */}
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-main)] rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-[var(--border-main)] pb-4">
              <div>
                <h3 className="font-black text-sm text-[var(--text-primary)] flex items-center gap-2">
                  <Gift size={18} className="text-yellow-500" />
                  <span>{isRtl ? 'كتالوج هدايا البث المباشر والعملات' : 'Live Stream Gift Catalog'}</span>
                </h3>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  {isRtl ? 'إدارة الهدايا المتوفرة للمستخدمين، وتحديد سعر كل منها بالنقاط.' : 'Manage gifts available for users and set their point prices.'}
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingGift(null);
                  setGiftFormData({ name_en: '', name_ar: '', icon: '🌹', points: 10, is_active: true });
                  setIsGiftModalOpen(true);
                }}
                className="px-4 py-2 rounded-md bg-accent text-white font-bold text-xs flex items-center gap-2 hover:bg-accent shadow-md"
              >
                <Plus size={14} />
                <span>{isRtl ? 'إضافة هدية جديدة' : 'Add New Gift'}</span>
              </button>
            </div>

            {isGiftsLoading ? (
              <div className="p-12 text-center text-xs text-gray-400">
                <RefreshCw size={24} className="animate-spin text-accent mx-auto mb-2" />
                <span>{isRtl ? 'جاري تحميل كتالوج الهدايا...' : 'Loading gift catalog...'}</span>
              </div>
            ) : giftCatalog.length === 0 ? (
              <div className="p-12 text-center text-xs text-gray-400 bg-[var(--bg-base)]/50 rounded-xl border border-dashed border-[var(--border-main)]">
                {isRtl ? 'لا توجد هدايا مسجلة حالياً' : 'No gifts registered yet.'}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {giftCatalog.map((gift) => (
                  <div key={gift.id} className="p-4 bg-[var(--bg-base)] border border-[var(--border-main)] rounded-xl flex flex-col gap-3 group relative overflow-hidden transition-theme hover:border-accent/30">
                    <div className="flex items-center justify-between">
                      <span className="text-3xl">{gift.icon}</span>
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${gift.is_active ? 'bg-accent/10 text-accent' : 'bg-red-500/10 text-red-500'}`}>
                        {gift.is_active ? (isRtl ? 'نشط' : 'Active') : (isRtl ? 'معطل' : 'Disabled')}
                      </span>
                    </div>
                    <div>
                      <div className="font-extrabold text-[var(--text-primary)] text-sm">{isRtl ? gift.name_ar : gift.name_en}</div>
                      <div className="text-[10px] text-yellow-500 font-black mt-1 flex items-center gap-1">
                        <Coins size={12} /> {gift.points} {isRtl ? 'نقطة' : 'Points'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[var(--border-main)] opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          setEditingGift(gift);
                          setGiftFormData({
                            name_en: gift.name_en,
                            name_ar: gift.name_ar,
                            icon: gift.icon,
                            points: gift.points,
                            is_active: gift.is_active
                          });
                          setIsGiftModalOpen(true);
                        }}
                        className="flex-1 py-1 rounded bg-blue-500/10 text-blue-500 text-[10px] font-bold hover:bg-blue-500 hover:text-white transition-theme"
                      >
                        {isRtl ? 'تعديل' : 'Edit'}
                      </button>
                      <button
                        onClick={() => handleDeleteGift(gift.id)}
                        className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Gift Edit Modal */}
          {isGiftModalOpen && (
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <div className="bg-[var(--bg-secondary)] border border-[var(--border-main)] rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-[var(--border-main)]">
                  <h4 className="font-extrabold text-sm flex items-center gap-2">
                    <Gift size={18} className="text-accent" />
                    <span>{editingGift ? (isRtl ? 'تعديل بيانات الهدية' : 'Edit Gift') : (isRtl ? 'إضافة هدية جديدة للمنصة' : 'Add New Gift')}</span>
                  </h4>
                  <button onClick={() => setIsGiftModalOpen(false)} className="text-gray-400 hover:text-white">
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleSaveGift} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">{isRtl ? 'الاسم (English)' : 'Name (English)'}</label>
                      <input
                        required
                        type="text"
                        value={giftFormData.name_en}
                        onChange={(e) => setGiftFormData({ ...giftFormData, name_en: e.target.value })}
                        className="w-full bg-[var(--bg-base)] border border-[var(--border-main)] rounded-md px-3 py-2 text-xs font-bold text-[var(--text-primary)] focus:border-accent outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">{isRtl ? 'الاسم (العربية)' : 'Name (Arabic)'}</label>
                      <input
                        required
                        type="text"
                        value={giftFormData.name_ar}
                        onChange={(e) => setGiftFormData({ ...giftFormData, name_ar: e.target.value })}
                        className="w-full bg-[var(--bg-base)] border border-[var(--border-main)] rounded-md px-3 py-2 text-xs font-bold text-[var(--text-primary)] focus:border-accent outline-none text-end"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">{isRtl ? 'الأيقونة (Emoji)' : 'Icon (Emoji)'}</label>
                      <input
                        required
                        type="text"
                        value={giftFormData.icon}
                        onChange={(e) => setGiftFormData({ ...giftFormData, icon: e.target.value })}
                        className="w-full bg-[var(--bg-base)] border border-[var(--border-main)] rounded-md px-3 py-2 text-lg text-center focus:border-accent outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">{isRtl ? 'السعر (بالنقاط)' : 'Price (Points)'}</label>
                      <input
                        required
                        type="number"
                        value={giftFormData.points}
                        onChange={(e) => setGiftFormData({ ...giftFormData, points: parseInt(e.target.value) })}
                        className="w-full bg-[var(--bg-base)] border border-[var(--border-main)] rounded-md px-3 py-2 text-xs font-bold text-yellow-500 focus:border-accent outline-none"
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer select-none py-2">
                    <input
                      type="checkbox"
                      checked={giftFormData.is_active}
                      onChange={(e) => setGiftFormData({ ...giftFormData, is_active: e.target.checked })}
                      className="w-4 h-4 rounded text-accent focus:ring-accent-500 accent-accent"
                    />
                    <span className="text-xs font-bold text-[var(--text-primary)]">
                      {isRtl ? 'هذه الهدية نشطة ومتاحة للاستخدام الآن' : 'Gift is active and available for use'}
                    </span>
                  </label>

                  <div className="flex items-center gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setIsGiftModalOpen(false)}
                      className="flex-1 px-4 py-2 rounded-md border border-[var(--border-main)] text-xs font-bold text-gray-400 hover:bg-gray-800"
                    >
                      {isRtl ? 'إلغاء' : 'Cancel'}
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 rounded-md bg-accent text-white font-black text-xs hover:bg-accent shadow-lg shadow-none"
                    >
                      {isRtl ? 'حفظ البيانات' : 'Save Gift'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      ) : activeTab === 'bulletin' ? (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-main)] rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-main)]">
            <div>
              <h3 className="font-black text-sm text-[var(--text-primary)] flex items-center gap-2">
                <Sparkles size={16} className="text-accent" />
                <span>{isRtl ? 'طلبات إعلانات لوحة المجتمع (Community Bulletin Ads)' : 'Community Bulletin Ad Submissions'}</span>
              </h3>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                {isRtl ? 'مراجعة واعتماد أو رفض الإعلانات الممولة التي نشرها المستخدمون ودفعوا ثمنها من محفظتهم.' : 'Review, approve or reject paid community ads submitted by users.'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportSchedule}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-[var(--border-main)] bg-[var(--bg-base)] text-[var(--text-primary)] text-[10px] font-black hover:border-accent hover:text-accent transition-theme shadow-sm"
              >
                <Download size={13} />
                <span>{isRtl ? 'تصدير الجدول' : 'Export Schedule'}</span>
              </button>
              <button
                onClick={fetchBulletinAds}
                className="p-2 rounded-md border border-[var(--border-main)] bg-[var(--bg-base)] text-gray-400 hover:text-accent transition-colors"
              >
                <RefreshCw size={15} className={isBulletinLoading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Bulk Action Toolbar */}
          {!isBulletinLoading && bulletinAds.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 bg-[var(--bg-base)] p-3 rounded-lg border border-[var(--border-main)]">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[var(--text-primary)]">
                  {isRtl ? `تم تحديد ${selectedBulletinIds.length} من ${bulletinAds.length}` : `${selectedBulletinIds.length} of ${bulletinAds.length} selected`}
                </span>
                {selectedBulletinIds.length > 0 && (
                  <button
                    onClick={() => handleBulkDeleteBulletinAds()}
                    className="px-3 py-1 rounded bg-red-500 text-white font-bold text-[10px] hover:bg-red-600 transition-theme flex items-center gap-1 shadow"
                  >
                    <Trash2 size={12} />
                    <span>{isRtl ? 'حذف المحدد' : 'Delete Selected'}</span>
                  </button>
                )}
              </div>
              <button
                onClick={handleDeleteAllExpiredOrRejected}
                className="px-3 py-1 rounded border border-red-500/30 text-red-500 hover:bg-red-500/10 font-bold text-[10px] transition-theme flex items-center gap-1"
              >
                <Trash2 size={12} />
                <span>{isRtl ? 'حذف جميع المنتهية والمرفوضة' : 'Delete All Expired & Rejected'}</span>
              </button>
            </div>
          )}

          {isBulletinLoading ? (
            <div className="p-12 text-center text-xs text-gray-400 flex flex-col items-center gap-2">
              <RefreshCw size={24} className="animate-spin text-accent" />
              <span>{isRtl ? 'جاري تحميل طلبات لوحة الإعلانات...' : 'Loading bulletin ads...'}</span>
            </div>
          ) : bulletinAds.length === 0 ? (
            <div className="p-12 text-center text-xs text-gray-400 flex flex-col items-center gap-2">
              <Sparkles size={32} className="opacity-40" />
              <span>{isRtl ? 'لا توجد طلبات إعلانات مجتمعية حتى الآن' : 'No community ads submitted yet.'}</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-start text-xs border-collapse">
                <thead>
                  <tr className="bg-[var(--bg-base)] border-b border-[var(--border-main)] text-[var(--text-muted)] font-bold">
                    <th className="p-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={selectedBulletinIds.length === bulletinAds.length && bulletinAds.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedBulletinIds(bulletinAds.map(a => a.id));
                          } else {
                            setSelectedBulletinIds([]);
                          }
                        }}
                        className="w-4 h-4 rounded text-accent focus:ring-accent-500 accent-accent cursor-pointer"
                      />
                    </th>
                    <th className="p-3 text-start">{isRtl ? 'المستخدم & الإعلان' : 'User & Ad'}</th>
                    <th className="p-3 text-center">{isRtl ? 'المدة والخصم' : 'Duration & Paid'}</th>
                    <th className="p-3 text-center">{isRtl ? 'التفاعل' : 'Interactions'}</th>
                    <th className="p-3 text-center">{isRtl ? 'الحالة' : 'Status'}</th>
                    <th className="p-3 text-end">{isRtl ? 'الإجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-main)]">
                  {bulletinAds.map((ad) => (
                    <tr key={ad.id} className="hover:bg-[var(--bg-base)]/50 transition-colors">
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={selectedBulletinIds.includes(ad.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedBulletinIds(prev => [...prev, ad.id]);
                            } else {
                              setSelectedBulletinIds(prev => prev.filter(id => id !== ad.id));
                            }
                          }}
                          className="w-4 h-4 rounded text-accent focus:ring-accent-500 accent-accent cursor-pointer"
                        />
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={getMediaUrl(ad.image_url)}
                            alt={ad.title}
                            className="w-14 h-14 rounded-md object-cover border border-[var(--border-main)] shrink-0"
                          />
                          <div>
                            <div className="font-extrabold text-[var(--text-primary)] text-xs">{ad.title}</div>
                            <div className="text-[11px] text-[var(--text-muted)] line-clamp-1">{ad.description}</div>
                            <div className="text-[10px] text-accent font-mono mt-1">
                              👤 @{ad.username || 'مستخدم'} • ID: #{ad.id}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="p-3 text-center">
                        <div className="font-extrabold text-[var(--text-primary)]">{ad.duration_days} {isRtl ? 'أيام' : 'days'}</div>
                        <div className="text-[11px] text-accent font-black mt-0.5">${ad.amount_paid}</div>
                      </td>

                      <td className="p-3 text-center">
                        <div className="text-[11px] text-[var(--text-muted)]">
                          👍 {ad.like_count || 0} • 💬 {ad.comment_count || 0} • 👁️ {ad.impression_count || 0}
                        </div>
                      </td>

                      <td className="p-3 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                          ad.status === 'approved'
                            ? 'bg-accent/10 text-accent border border-accent/20'
                            : ad.status === 'pending'
                            ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse'
                            : ad.status === 'rejected'
                            ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                            : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                        }`}>
                          {ad.status === 'approved' && (isRtl ? 'مقبول / نشط' : 'Approved')}
                          {ad.status === 'pending' && (isRtl ? 'قيد المراجعة' : 'Pending')}
                          {ad.status === 'rejected' && (isRtl ? 'مرفوض' : 'Rejected')}
                          {ad.status === 'expired' && (isRtl ? 'منتهي' : 'Expired')}
                        </span>
                      </td>

                      <td className="p-3 text-end">
                        <div className="flex items-center justify-end gap-1.5">
                          {ad.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApproveBulletinAd(ad.id)}
                                className="px-2.5 py-1 rounded bg-accent text-white font-bold text-[10px] hover:bg-accent transition-theme flex items-center gap-1 shadow"
                              >
                                <CheckCircle2 size={12} />
                                <span>{isRtl ? 'اعتماد' : 'Approve'}</span>
                              </button>

                              <button
                                onClick={() => {
                                  setRejectingAdId(ad.id);
                                  setRejectionReason('');
                                }}
                                className="px-2.5 py-1 rounded bg-red-500/10 text-red-500 font-bold text-[10px] hover:bg-red-500 hover:text-white transition-theme flex items-center gap-1"
                              >
                                <XCircle size={12} />
                                <span>{isRtl ? 'رفض' : 'Reject'}</span>
                              </button>
                            </>
                          )}

                          {ad.status === 'approved' && (
                            <button
                              onClick={() => {
                                setStoppingAdId(ad.id);
                                setStopReason('');
                              }}
                              className="px-2.5 py-1 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-[10px] hover:bg-amber-500 hover:text-white transition-theme flex items-center gap-1"
                              title={isRtl ? 'إيقاف الإعلان فوراً وإشعار المستخدم' : 'Stop Ad & Notify User'}
                            >
                              <XCircle size={12} />
                              <span>{isRtl ? 'إيقاف' : 'Stop'}</span>
                            </button>
                          )}

                          <button
                            onClick={() => handleDeleteBulletinAd(ad.id)}
                            className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                            title={isRtl ? 'حذف نهائي' : 'Delete'}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Stop Ad Modal */}
          {stoppingAdId && (
            <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
              <div className="bg-[var(--bg-secondary)] border border-[var(--border-main)] rounded-xl w-full max-w-md p-5 shadow-2xl space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-[var(--border-main)]">
                  <h4 className="font-extrabold text-sm text-amber-500 flex items-center gap-1.5">
                    <XCircle size={16} />
                    <span>{isRtl ? 'إيقاف الإعلان وإرسال إشعار' : 'Stop Advertisement & Notify'}</span>
                  </h4>
                  <button onClick={() => setStoppingAdId(null)} className="text-gray-400 hover:text-white">
                    <X size={16} />
                  </button>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-400 mb-1">
                    {isRtl ? 'سبب الإيقاف (سيصل للمستخدم عبر الإشعارات والبريد الإلكتروني):' : 'Stoppage Reason (Sent via notification & email):'}
                  </label>
                  <textarea
                    rows={3}
                    value={stopReason}
                    onChange={(e) => setStopReason(e.target.value)}
                    placeholder={isRtl ? 'مثال: مخالفة شروط النشر أو انتهاء ترخيص النشاط...' : 'e.g. Violation of guidelines...'}
                    className="w-full p-2.5 text-xs rounded bg-[var(--bg-base)] border border-[var(--border-main)] text-[var(--text-primary)] focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-main)]">
                  <button
                    onClick={() => setStoppingAdId(null)}
                    className="px-3 py-1.5 rounded text-xs text-gray-400 hover:bg-gray-800"
                  >
                    {isRtl ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    onClick={() => handleStopBulletinAd(stoppingAdId)}
                    className="px-4 py-1.5 rounded text-xs font-bold bg-amber-500 text-white hover:bg-amber-600 shadow"
                  >
                    {isRtl ? 'تأكيد الإيقاف وإشعار المستخدم' : 'Confirm Stoppage & Notify'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Rejection Modal */}
          {rejectingAdId && (
            <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
              <div className="bg-[var(--bg-secondary)] border border-[var(--border-main)] rounded-xl w-full max-w-md p-5 shadow-2xl space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-[var(--border-main)]">
                  <h4 className="font-extrabold text-sm text-red-500 flex items-center gap-1.5">
                    <XCircle size={16} />
                    <span>{isRtl ? 'سبب رفض الإعلان' : 'Reject Ad Submission'}</span>
                  </h4>
                  <button onClick={() => setRejectingAdId(null)} className="text-gray-400 hover:text-white">
                    <X size={16} />
                  </button>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-400 mb-1">
                    {isRtl ? 'أدخل سبب الرفض (سيصل للمستخدم):' : 'Rejection Reason:'}
                  </label>
                  <textarea
                    rows={3}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder={isRtl ? 'مثال: الصورة غير واضحة أو الرابط لا يعمل...' : 'e.g. Inappropriate content...'}
                    className="w-full p-2.5 text-xs rounded bg-[var(--bg-base)] border border-[var(--border-main)] text-[var(--text-primary)] focus:border-red-500 focus:outline-none"
                  />
                </div>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={refundOnReject}
                    onChange={(e) => setRefundOnReject(e.target.checked)}
                    className="w-4 h-4 rounded text-accent focus:ring-accent-500 accent-accent"
                  />
                  <span className="text-xs font-bold text-[var(--text-primary)]">
                    {isRtl ? 'إعادة المبلغ ($) لحساب/محفظة المستخدم فوراً' : 'Refund payment ($) back to user wallet'}
                  </span>
                </label>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-main)]">
                  <button
                    onClick={() => setRejectingAdId(null)}
                    className="px-3 py-1.5 rounded text-xs text-gray-400 hover:bg-gray-800"
                  >
                    {isRtl ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    onClick={() => handleRejectBulletinAd(rejectingAdId)}
                    className="px-4 py-1.5 rounded text-xs font-bold bg-red-500 text-white hover:bg-red-600 shadow"
                  >
                    {isRtl ? 'تأكيد الرفض' : 'Confirm Rejection'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Search & Actions Bar */}
          <div className="flex items-center justify-between gap-4 bg-[var(--bg-secondary)] border border-[var(--border-main)] p-3 rounded-lg">
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={isRtl ? 'بحث حسب العنوان أو الراع...' : 'Search by title or sponsor...'}
                className="w-full ps-9 pe-4 py-1.5 text-xs rounded-md bg-[var(--bg-base)] border border-[var(--border-main)] text-[var(--text-primary)] focus:outline-none focus:border-accent"
              />
            </div>

            <button
              onClick={fetchAds}
              title={isRtl ? 'تحديث' : 'Refresh'}
              className="p-2 rounded-md border border-[var(--border-main)] bg-[var(--bg-base)] text-gray-400 hover:text-accent transition-colors"
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Ads List Table / Cards */}
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-main)] rounded-lg overflow-hidden shadow-sm">
            {selectedAdIds.length > 0 && (
              <div className="p-3 bg-red-500/10 border-b border-red-500/20 flex items-center justify-between text-xs">
                <span className="font-bold text-red-500">
                  {isRtl ? `تم تحديد ${selectedAdIds.length} إعلان` : `${selectedAdIds.length} ads selected`}
                </span>
                <button
                  onClick={() => setIsBulkDeleteModalOpen(true)}
                  className="px-3 py-1 rounded bg-red-600 text-white font-bold hover:bg-red-700 transition-colors flex items-center gap-1.5"
                >
                  <Trash2 size={14} />
                  <span>{isRtl ? 'حذف الإعلانات المحددة جماعياً' : 'Delete Selected Ads'}</span>
                </button>
              </div>
            )}
            {isLoading ? (
              <div className="p-12 text-center text-xs text-gray-400 flex flex-col items-center gap-2">
                <RefreshCw size={24} className="animate-spin text-accent" />
                <span>{isRtl ? 'جاري تحميل قائمة الإعلانات...' : 'Loading advertisements...'}</span>
              </div>
            ) : filteredAds.length === 0 ? (
              <div className="p-12 text-center text-xs text-gray-400 flex flex-col items-center gap-2">
                <Megaphone size={32} className="opacity-40" />
                <span>{isRtl ? 'لا توجد إعلانات مطابقة' : 'No matching advertisements found'}</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-start text-xs border-collapse">
                  <thead>
                    <tr className="bg-[var(--bg-base)] border-b border-[var(--border-main)] text-[var(--text-muted)] font-bold">
                      <th className="p-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={filteredAds.length > 0 && selectedAdIds.length === filteredAds.length}
                          onChange={handleToggleSelectAll}
                          className="rounded accent-accent cursor-pointer"
                        />
                      </th>
                      <th className="p-3 text-start">{isRtl ? 'الإعلان' : 'Advertisement'}</th>
                      <th className="p-3 text-start">{isRtl ? 'الرابط المستهدف' : 'Target URL'}</th>
                      <th className="p-3 text-center">{isRtl ? 'المشاهدات' : 'Impressions'}</th>
                      <th className="p-3 text-center">{isRtl ? 'النقرات' : 'Clicks'}</th>
                      <th className="p-3 text-center">{isRtl ? 'الحالة' : 'Status'}</th>
                      <th className="p-3 text-end">{isRtl ? 'الإجراءات' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-main)]">
                    {filteredAds.map((ad) => (
                      <tr key={ad.id} className="hover:bg-[var(--bg-base)]/50 transition-colors">
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={selectedAdIds.includes(ad.id)}
                            onChange={() => handleToggleSelectAd(ad.id)}
                            className="rounded accent-accent cursor-pointer"
                          />
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={getMediaUrl(ad.image_url)}
                              alt={ad.title_ar}
                              className="w-14 h-10 object-cover rounded border border-gray-200 dark:border-gray-800 shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <div className="font-bold text-[var(--text-primary)] truncate max-w-[180px]">
                                  {isRtl ? ad.title_ar : ad.title_en}
                                </div>
                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter border ${
                                  ad.format === 'story' ? 'bg-purple-500/10 text-purple-500 border-purple-500/20' :
                                  ad.format === 'reel' ? 'bg-pink-500/10 text-pink-500 border-pink-500/20' :
                                  ad.format === 'feed' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                                  ad.format === 'video' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                                  'bg-accent/10 text-accent border-accent/20'
                                }`}>
                                  {ad.format || 'sidebar'}
                                </span>
                              </div>
                              <div className="text-[10px] text-accent font-medium">
                                {ad.sponsor_name || 'Sponsor'} • <span className="text-gray-400">{ad.badge_text_ar || 'مُموَّل'}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="p-3">
                          <a
                            href={ad.target_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-gray-400 hover:text-accent font-mono text-[11px] flex items-center gap-1 truncate max-w-[180px]"
                          >
                            <span className="truncate">{ad.target_url}</span>
                            <ExternalLink size={10} className="shrink-0" />
                          </a>
                        </td>

                        <td className="p-3 text-center font-bold text-blue-500">
                          {ad.impression_count.toLocaleString()}
                        </td>

                        <td className="p-3 text-center font-bold text-purple-500">
                          {ad.click_count.toLocaleString()}
                        </td>

                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleToggleActive(ad.id)}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-theme ${
                              ad.is_active
                                ? 'bg-accent/10 text-accent border-accent/20 hover:bg-accent/20'
                                : 'bg-gray-500/10 text-gray-400 border-gray-500/20 hover:bg-gray-500/20'
                            }`}
                          >
                            {ad.is_active ? (isRtl ? 'نشط' : 'Active') : (isRtl ? 'معطل' : 'Disabled')}
                          </button>
                        </td>

                        <td className="p-3 text-end">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenEditModal(ad)}
                              title={isRtl ? 'تعديل' : 'Edit'}
                              className="p-1.5 rounded bg-gray-500/10 hover:bg-accent/20 text-gray-400 hover:text-accent transition-colors"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              onClick={() => handleDelete(ad.id)}
                              title={isRtl ? 'حذف' : 'Delete'}
                              className="p-1.5 rounded bg-red-500/10 hover:bg-red-500/20 text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal for Creating / Editing Ads */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-main)] rounded-xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-main)]">
              <div className="flex items-center gap-2 text-accent">
                <Megaphone size={18} />
                <h3 className="font-bold text-sm text-[var(--text-primary)]">
                  {editingAd
                    ? (isRtl ? 'تعديل بيانات الإعلان' : 'Edit Advertisement')
                    : (isRtl ? 'إنشاء إعلان جديد' : 'Create New Advertisement')}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto scrollbar-thin">
              {/* Titles AR / EN */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 mb-1">
                    {isRtl ? 'العنوان بالعربية *' : 'Title (Arabic) *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title_ar}
                    onChange={(e) => setFormData({ ...formData, title_ar: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs rounded bg-[var(--bg-base)] border border-[var(--border-main)] text-[var(--text-primary)] focus:border-accent focus:outline-none"
                    placeholder="مثال: حزمة الذكاء الاصطناعي"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 mb-1">
                    {isRtl ? 'العنوان بالإنجليزية *' : 'Title (English) *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title_en}
                    onChange={(e) => setFormData({ ...formData, title_en: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs rounded bg-[var(--bg-base)] border border-[var(--border-main)] text-[var(--text-primary)] focus:border-accent focus:outline-none"
                    placeholder="e.g. Sovereign AI Suite"
                  />
                </div>
              </div>

              {/* Sponsor & Badge */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 mb-1">
                    {isRtl ? 'اسم الراعي/المُعلن' : 'Sponsor Name'}
                  </label>
                  <input
                    type="text"
                    value={formData.sponsor_name}
                    onChange={(e) => setFormData({ ...formData, sponsor_name: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs rounded bg-[var(--bg-base)] border border-[var(--border-main)] text-[var(--text-primary)] focus:border-accent focus:outline-none"
                    placeholder="Hercules App / Perplexta"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 mb-1">
                    {isRtl ? 'نص الشارة (Badge)' : 'Badge Label'}
                  </label>
                  <input
                    type="text"
                    value={formData.badge_text_ar}
                    onChange={(e) => setFormData({ ...formData, badge_text_ar: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs rounded bg-[var(--bg-base)] border border-[var(--border-main)] text-[var(--text-primary)] focus:border-accent focus:outline-none"
                    placeholder="مُموَّل / Sponsored"
                  />
                </div>
              </div>

              {/* Descriptions AR / EN */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 mb-1">
                    {isRtl ? 'الوصف بالعربية' : 'Description (Arabic)'}
                  </label>
                  <textarea
                    rows={2}
                    value={formData.description_ar}
                    onChange={(e) => setFormData({ ...formData, description_ar: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs rounded bg-[var(--bg-base)] border border-[var(--border-main)] text-[var(--text-primary)] focus:border-accent focus:outline-none"
                    placeholder="وصف مختصر للإعلان..."
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 mb-1">
                    {isRtl ? 'الوصف بالإنجليزية' : 'Description (English)'}
                  </label>
                  <textarea
                    rows={2}
                    value={formData.description_en}
                    onChange={(e) => setFormData({ ...formData, description_en: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs rounded bg-[var(--bg-base)] border border-[var(--border-main)] text-[var(--text-primary)] focus:border-accent focus:outline-none"
                    placeholder="Short description..."
                  />
                </div>
              </div>

              {/* SEO Meta Fields */}
              <div className="bg-[var(--bg-base)] p-3 rounded-lg border border-[var(--border-main)] space-y-3">
                <h4 className="text-xs font-bold text-accent">{isRtl ? 'إعدادات SEO' : 'SEO Settings'}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 mb-1">
                      {isRtl ? 'Meta Title (AR)' : 'Meta Title (AR)'}
                    </label>
                    <input
                      type="text"
                      value={formData.meta_title_ar}
                      onChange={(e) => setFormData({ ...formData, meta_title_ar: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs rounded bg-[var(--bg-secondary)] border border-[var(--border-main)] text-[var(--text-primary)] focus:border-accent focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 mb-1">
                      {isRtl ? 'Meta Title (EN)' : 'Meta Title (EN)'}
                    </label>
                    <input
                      type="text"
                      value={formData.meta_title_en}
                      onChange={(e) => setFormData({ ...formData, meta_title_en: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs rounded bg-[var(--bg-secondary)] border border-[var(--border-main)] text-[var(--text-primary)] focus:border-accent focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 mb-1">
                      {isRtl ? 'Meta Description (AR)' : 'Meta Description (AR)'}
                    </label>
                    <input
                      type="text"
                      value={formData.meta_description_ar}
                      onChange={(e) => setFormData({ ...formData, meta_description_ar: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs rounded bg-[var(--bg-secondary)] border border-[var(--border-main)] text-[var(--text-primary)] focus:border-accent focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 mb-1">
                      {isRtl ? 'Meta Description (EN)' : 'Meta Description (EN)'}
                    </label>
                    <input
                      type="text"
                      value={formData.meta_description_en}
                      onChange={(e) => setFormData({ ...formData, meta_description_en: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs rounded bg-[var(--bg-secondary)] border border-[var(--border-main)] text-[var(--text-primary)] focus:border-accent focus:outline-none"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[11px] font-bold text-gray-400 mb-1">
                      {isRtl ? 'الكلمات المفتاحية (Keywords - comma separated)' : 'Keywords (Comma separated)'}
                    </label>
                    <input
                      type="text"
                      value={formData.keywords_ar}
                      onChange={(e) => setFormData({ ...formData, keywords_ar: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs rounded bg-[var(--bg-secondary)] border border-[var(--border-main)] text-[var(--text-primary)] focus:border-accent focus:outline-none mb-1"
                      placeholder="AR Keywords..."
                    />
                    <input
                      type="text"
                      value={formData.keywords_en}
                      onChange={(e) => setFormData({ ...formData, keywords_en: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs rounded bg-[var(--bg-secondary)] border border-[var(--border-main)] text-[var(--text-primary)] focus:border-accent focus:outline-none"
                      placeholder="EN Keywords..."
                    />
                  </div>
                </div>
              </div>

              {/* Image URL & File Upload */}
              <div>
                <label className="block text-[11px] font-bold text-gray-400 mb-1">
                  {isRtl ? 'صورة الإعلان / صورة الغلاف *' : 'Ad Image / Cover URL *'}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    className="flex-1 px-3 py-1.5 text-xs rounded bg-[var(--bg-base)] border border-[var(--border-main)] text-[var(--text-primary)] focus:border-accent focus:outline-none"
                    placeholder="https://images.unsplash.com/... or /uploads/..."
                  />
                  <label className="px-3 py-1.5 rounded bg-accent/10 border border-accent/30 text-accent text-xs font-bold cursor-pointer hover:bg-accent/20 transition-colors flex items-center gap-1 shrink-0">
                    <Upload size={14} />
                    <span>{isUploading ? (isRtl ? 'جاري الرفع...' : 'Uploading...') : (isRtl ? 'رفع صورة من الجهاز' : 'Upload File')}</span>
                    <input type="file" accept="image/*,.png,.jpg,.jpeg,.gif,.webp,.heic,.heif,.svg,.bmp" onChange={handleFileUpload} className="hidden" />
                  </label>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] text-accent font-medium">
                    ✨ {getRecommendedDimensions(formData.format, isRtl)}
                  </span>
                </div>
                {formData.image_url && (
                  <div className="flex items-center gap-1 mt-1 text-[10px] text-accent font-medium">
                    <CheckCircle2 size={12} className="shrink-0" />
                    <span>
                      {formData.image_url.startsWith('/uploads/')
                        ? (isRtl ? 'تم الرفع واعتماد الصورة من جهازك المحلي بنجاح' : 'Uploaded & verified from your local desktop')
                        : (isRtl ? 'تم ربط رابط الصورة بنجاح' : 'Image URL linked successfully')}
                    </span>
                  </div>
                )}
              </div>

              {/* Video URL & Video File Upload */}
              <div>
                <label className="block text-[11px] font-bold text-accent mb-1 flex items-center justify-between">
                  <span>{isRtl ? 'رابط مقطع الفيديو / ريلز (اختياري - MP4, YouTube, Vimeo, TikTok)' : 'Video / Reels URL (Optional - MP4, YouTube, Vimeo, TikTok)'}</span>
                  <span className="text-[9px] text-gray-500">{isRtl ? 'يدعم القص والتكيف تلقائياً' : 'Supports auto crop & fit'}</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.video_url || ''}
                    onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                    className="flex-1 px-3 py-1.5 text-xs rounded bg-[var(--bg-base)] border border-[var(--border-main)] text-[var(--text-primary)] focus:border-accent focus:outline-none"
                    placeholder="https://example.com/video.mp4 or YouTube / TikTok link"
                  />
                  <label className="px-3 py-1.5 rounded bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold cursor-pointer hover:bg-blue-500/20 transition-colors flex items-center gap-1 shrink-0">
                    <Upload size={14} />
                    <span>{isUploading ? (isRtl ? 'جاري الرفع...' : 'Uploading...') : (isRtl ? 'رفع فيديو' : 'Upload Video')}</span>
                    <input type="file" accept="video/*,.mp4,.mov,.webm,.mkv,.avi,.3gp,.m4v" onChange={handleVideoFileUpload} className="hidden" />
                  </label>
                </div>
                {formData.video_url && (
                  <div className="flex items-center gap-1 mt-1 text-[10px] text-blue-400 font-medium">
                    <CheckCircle2 size={12} className="shrink-0" />
                    <span>
                      {formData.video_url.startsWith('/uploads/')
                        ? (isRtl ? 'تم رفع الفيديو واعتماده من جهازك المحلي' : 'Uploaded & verified video from desktop')
                        : (isRtl ? 'تم ربط رابط الفيديو بنجاح' : 'Video URL linked successfully')}
                    </span>
                  </div>
                )}
              </div>

              {/* Poster Image URL & Upload */}
              <div>
                <label className="block text-[11px] font-bold text-gray-400 mb-1">
                  {isRtl ? 'صورة الغلاف المصغرة للفيديو / البوستر (اختياري - Poster URL)' : 'Video Poster / Thumbnail URL (Optional)'}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.poster_url || ''}
                    onChange={(e) => setFormData({ ...formData, poster_url: e.target.value })}
                    className="flex-1 px-3 py-1.5 text-xs rounded bg-[var(--bg-base)] border border-[var(--border-main)] text-[var(--text-primary)] focus:border-accent focus:outline-none"
                    placeholder="https://... or /uploads/poster.jpg"
                  />
                  <label className="px-3 py-1.5 rounded bg-accent/10 border border-accent/30 text-accent text-xs font-bold cursor-pointer hover:bg-accent/20 transition-colors flex items-center gap-1 shrink-0">
                    <Upload size={14} />
                    <span>{isUploading ? (isRtl ? 'جاري الرفع...' : 'Uploading...') : (isRtl ? 'رفع بوستر' : 'Upload Poster')}</span>
                    <input type="file" accept="image/*" onChange={handlePosterUpload} className="hidden" />
                  </label>
                </div>
                {formData.poster_url && (
                  <div className="flex items-center gap-1 mt-1 text-[10px] text-accent font-medium">
                    <CheckCircle2 size={12} className="shrink-0" />
                    <span>{isRtl ? 'تم تحديد صورة الغلاف المصغرة بنجاح' : 'Poster thumbnail attached'}</span>
                  </div>
                )}
              </div>

              {/* Media Live Player Preview inside Modal */}
              {(formData.video_url || formData.image_url) && (
                <div className="p-3 bg-black/40 rounded-xl border border-gray-800 space-y-2">
                  <span className="text-[10px] font-black text-accent uppercase tracking-widest block">
                    {isRtl ? 'معاينة الوسائط والتكيف مع الأبعاد المعتمده' : 'Live Media Aspect Ratio Preview'}
                  </span>
                  
                  {formData.video_url ? (
                    <CustomVideoPlayer
                      src={getMediaUrl(formData.video_url)}
                      poster={formData.poster_url ? getMediaUrl(formData.poster_url) : (formData.image_url ? getMediaUrl(formData.image_url) : undefined)}
                      title={formData.title_ar || 'Ad Video Preview'}
                      isRtl={isRtl}
                      className={formData.format === 'story' || formData.format === 'reel' ? 'max-h-[320px] mx-auto' : 'h-48'}
                    />
                  ) : (
                    <div className="relative w-full h-32 rounded-lg border border-gray-700 overflow-hidden bg-black">
                      <img src={getMediaUrl(formData.image_url)} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              )}

              {/* Target URL */}
              <div>
                <label className="block text-[11px] font-bold text-gray-400 mb-1">
                  {isRtl ? 'الرابط المستهدف عند النقر *' : 'Target URL on Click *'}
                </label>
                <input
                  type="text"
                  required
                  value={formData.target_url}
                  onChange={(e) => setFormData({ ...formData, target_url: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs rounded bg-[var(--bg-base)] border border-[var(--border-main)] text-[var(--text-primary)] focus:border-accent focus:outline-none"
                  placeholder="/subscription or https://example.com"
                />
              </div>

              {/* Format & Position Selection */}
              <div className="space-y-3 p-3 bg-black/20 rounded-lg border border-[var(--border-main)]">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-1 h-3 bg-accent rounded-full" />
                  <span className="text-[10px] font-black text-accent uppercase tracking-widest">
                    {isRtl ? 'إعدادات الظهور والقياسات' : 'Display & Aspect Ratio Config'}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 mb-1">
                      {isRtl ? 'تنسيق الإعلان (Format)' : 'Ad Format'}
                    </label>
                    <select
                      value={formData.format}
                      onChange={(e) => setFormData({ ...formData, format: e.target.value as any })}
                      className="w-full px-3 py-1.5 text-xs rounded bg-[var(--bg-base)] border border-[var(--border-main)] text-[var(--text-primary)] focus:border-accent focus:outline-none font-bold"
                    >
                      <option value="sidebar">{isRtl ? 'إعلان جانبي (Sidebar)' : 'Sidebar Ad'}</option>
                      <option value="feed">{isRtl ? 'منشور (Feed Post)' : 'Feed Post'}</option>
                      <option value="story">{isRtl ? 'قصة (Story)' : 'Story Ad'}</option>
                      <option value="reel">{isRtl ? 'ريلز (Reel)' : 'Reel Video'}</option>
                      <option value="video">{isRtl ? 'فيديو (In-stream Video)' : 'In-stream Video'}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 mb-1">
                      {isRtl ? 'موقع العرض (Position)' : 'Display Position'}
                    </label>
                    <select
                      value={formData.position}
                      onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs rounded bg-[var(--bg-base)] border border-[var(--border-main)] text-[var(--text-primary)] focus:border-accent focus:outline-none"
                    >
                      <option value="sidebar">{isRtl ? 'الشريط الجانبي' : 'Sidebar'}</option>
                      <option value="feed">{isRtl ? 'الرئيسية (Newsfeed)' : 'Newsfeed'}</option>
                      <option value="header_banner">{isRtl ? 'أعلى الصفحة' : 'Header Banner'}</option>
                      <option value="footer_banner">{isRtl ? 'أسفل الصفحة' : 'Footer Banner'}</option>
                      <option value="popup">{isRtl ? 'نافذة منبثقة' : 'Popup'}</option>
                    </select>
                  </div>
                </div>

                {/* Technical Specs Guidance */}
                <div className="bg-accent/5 border border-accent/10 rounded p-2.5 flex items-start gap-2">
                  <Info size={14} className="text-accent mt-0.5 shrink-0" />
                  <div className="text-[10px] leading-relaxed text-[var(--text-muted)] font-medium">
                    {formData.format === 'story' || formData.format === 'reel' ? (
                      <span className="text-accent">
                        {isRtl 
                          ? 'القياس الموصى به: 1080x1920 بكسل (9:16). مثالي للهواتف الذكية.'
                          : 'Recommended: 1080x1920 px (9:16 aspect ratio). Optimized for full-screen mobile.'}
                      </span>
                    ) : formData.format === 'feed' ? (
                      <span className="text-accent">
                        {isRtl 
                          ? 'القياس الموصى به: 1080x1080 بكسل (1:1) أو 1080x1350 (4:5).'
                          : 'Recommended: 1080x1080 px (1:1) or 1080x1350 (4:5 ratio).'}
                      </span>
                    ) : formData.format === 'sidebar' ? (
                      <span className="text-accent">
                        {isRtl 
                          ? 'القياس الموصى به: 600x600 بكسل. يظهر في الشريط الجانبي للحواسيب.'
                          : 'Recommended: 600x600 px. Displayed in the desktop sidebar area.'}
                      </span>
                    ) : (
                      <span className="text-accent">
                        {isRtl 
                          ? 'القياس الموصى به: 1920x1080 بكسل (16:9). للفيديوهات العريضة.'
                          : 'Recommended: 1920x1080 px (16:9 ratio). Optimized for widescreen video.'}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Options: Order & Active Status */}
              <div className="flex items-center justify-between pt-2 border-t border-[var(--border-main)]">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-gray-400">{isRtl ? 'الترتيب:' : 'Order:'}</label>
                  <input
                    type="number"
                    value={formData.display_order}
                    onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                    className="w-16 px-2 py-1 text-xs rounded bg-[var(--bg-base)] border border-[var(--border-main)] text-[var(--text-primary)]"
                  />
                </div>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 rounded text-accent focus:ring-accent-500 accent-accent"
                  />
                  <span className="text-xs font-bold text-[var(--text-primary)]">
                    {isRtl ? 'إعلان نشط' : 'Active Ad'}
                  </span>
                </label>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-[var(--border-main)]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded text-xs font-bold bg-gray-500/10 hover:bg-gray-500/20 text-gray-400 transition-colors"
                >
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded text-xs font-bold bg-accent hover:bg-accent text-white shadow-lg shadow-none transition-theme flex items-center gap-1.5"
                >
                  {isSubmitting && <RefreshCw size={14} className="animate-spin" />}
                  <span>{editingAd ? (isRtl ? 'تحديث الإعلان' : 'Save Changes') : (isRtl ? 'نشر الإعلان' : 'Publish Ad')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-main)] rounded-xl w-full max-w-md p-5 space-y-4 shadow-2xl">
            <h3 className="font-bold text-base text-[var(--text-primary)]">
              {isRtl ? 'تأكيد الحذف الجماعي للإعلانات' : 'Confirm Bulk Ad Deletion'}
            </h3>
            <p className="text-xs text-gray-400">
              {isRtl
                ? `هل أنت متأكد من حذف ${selectedAdIds.length} إعلان نهائياً من قاعدة البيانات وخوادم التخزين؟ لا يمكن التراجع عن هذا الإجراء.`
                : `Are you sure you want to permanently delete ${selectedAdIds.length} ads from the database and storage server? This action cannot be undone.`}
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="px-4 py-2 rounded text-xs font-bold bg-gray-500/10 hover:bg-gray-500/20 text-gray-300 transition-colors"
              >
                {isRtl ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handleBulkDeleteAds}
                disabled={isSubmitting}
                className="px-4 py-2 rounded text-xs font-bold bg-red-600 hover:bg-red-700 text-white transition-colors flex items-center gap-1.5"
              >
                <Trash2 size={14} />
                <span>{isSubmitting ? (isRtl ? 'جاري الحذف...' : 'Deleting...') : (isRtl ? 'تأكيد الحذف النهائي' : 'Confirm Delete')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Ad Preview Simulator Modal */}
      {showAdPreview && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/95 backdrop-blur-md overflow-y-auto">
          <div className="w-full h-full p-4 md:p-10 flex flex-col gap-6">
            <div className="flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-accent text-white shadow-xl shadow-none">
                  <Monitor size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white">{isRtl ? 'محاكي تجربة إعلانات المستخدم' : 'User Ad Experience Simulator'}</h2>
                  <p className="text-xs text-gray-400 font-bold">{isRtl ? 'معاينة حية وتفاعلية لوحدات الإعلانات الحالية.' : 'Live interactive preview of current ad units.'}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAdPreview(false)}
                className="w-12 h-12 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-red-500 hover:text-red-500 transition-theme"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8 overflow-hidden">
              {/* Left Side: Control & Info */}
              <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-8 flex flex-col">
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-accent uppercase tracking-widest">{isRtl ? 'تكوين المعاينة' : 'Preview Configuration'}</h4>
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">{isRtl ? 'سعر إعلان اللوحة' : 'Bulletin Ad Price'}</span>
                      <span className="text-white font-black">${economySettings.bulletin_ad_daily_price}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">{isRtl ? 'سعر ظهور الجانبي' : 'Sidebar Impression'}</span>
                      <span className="text-white font-black">${economySettings.sidebar_ad_impression_price}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">{isRtl ? 'سعر نقرة الجانبي' : 'Sidebar Click'}</span>
                      <span className="text-white font-black">${economySettings.sidebar_ad_click_price}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-black text-blue-500 uppercase tracking-widest">{isRtl ? 'أوضاع العرض' : 'Display Modes'}</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <button className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-blue-500 text-white border border-blue-400 shadow-lg shadow-blue-500/20">
                      <Monitor size={24} />
                      <span className="text-[10px] font-black">{isRtl ? 'سطح المكتب' : 'Desktop View'}</span>
                    </button>
                    <button className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-white/5 text-gray-400 border border-white/5 hover:border-accent/30 hover:text-white transition-theme">
                      <Smartphone size={24} />
                      <span className="text-[10px] font-black">{isRtl ? 'الجوال' : 'Mobile View'}</span>
                    </button>
                  </div>
                </div>

                <div className="mt-auto p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex gap-3">
                  <Info size={20} className="text-amber-500 shrink-0" />
                  <p className="text-[10px] text-amber-500/80 font-bold leading-relaxed">
                    {isRtl 
                      ? 'هذه المعاينة توضح التصميم الافتراضي للإعلانات. قد يختلف المظهر الفعلي بناءً على محتوى الإعلان المرفوع من قبل المعلن.' 
                      : 'This preview shows the default ad styling. Actual appearance may vary based on user-uploaded content.'}
                  </p>
                </div>
              </div>

              {/* Middle & Right: The actual preview simulator area */}
              <div className="lg:col-span-2 bg-[var(--bg-base)] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col relative">
                <div className="h-10 bg-[var(--bg-secondary)] border-b border-white/5 flex items-center px-4 gap-2 shrink-0">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/50"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500/50"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-accent/50"></div>
                  </div>
                  <div className="mx-auto w-1/2 h-5 bg-[var(--bg-primary)] rounded-md border border-white/5 flex items-center justify-center">
                    <span className="text-[8px] text-gray-500 font-mono">https://perplexta.ai/bulletin</span>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-gray-50 dark:bg-[#0f0f11]">
                  <div className="max-w-4xl mx-auto space-y-10">
                    <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-4">
                      <h3 className="text-xl font-black text-gray-900 dark:text-white">
                        {isRtl ? 'لوحة المجتمع' : 'Bulletin Board'}
                      </h3>
                      <div className="w-24 h-8 bg-accent rounded-lg opacity-20"></div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div className="md:col-span-3 space-y-6">
                        {/* Simulation: Bulletin Ad */}
                        <div className="relative group">
                          <div className="absolute -top-3 -right-3 z-20 px-2 py-1 bg-amber-500 text-white text-[8px] font-black rounded shadow-lg animate-bounce">
                            {isRtl ? 'إعلان ممول' : 'SPONSORED'}
                          </div>
                          <div className="bg-white dark:bg-[#1a1a1c] border-2 border-accent/30 rounded-2xl overflow-hidden shadow-xl shadow-none hover:border-accent transition-theme">
                            <div className="h-40 bg-gradient-to-br from-gray-500/10 to-blue-500/10 relative flex items-center justify-center">
                              <Zap size={40} className="text-accent " />
                              <div className="absolute bottom-4 right-4 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full text-[9px] font-black text-white border border-white/10">
                                {isRtl ? `فقط $${economySettings.bulletin_ad_daily_price} / يومياً` : `From $${economySettings.bulletin_ad_daily_price} / Day`}
                              </div>
                            </div>
                            <div className="p-4 space-y-2">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-md bg-accent flex items-center justify-center text-white text-[10px] font-black">P</div>
                                <span className="text-[10px] font-black text-gray-900 dark:text-white">{isRtl ? 'فريق بيربليكستا' : 'Perplexta Team'}</span>
                              </div>
                              <h5 className="font-extrabold text-sm text-gray-900 dark:text-white">
                                {isRtl ? 'عزز وصول علامتك التجارية الآن!' : 'Supercharge your brand reach!'}
                              </h5>
                              <p className="text-[11px] text-gray-500 leading-relaxed line-clamp-2">
                                {isRtl 
                                  ? 'أعلن على لوحة المجتمع بأسعار تبدأ من 5 دولارات فقط في اليوم.' 
                                  : 'Advertise on the Bulletin Board starting from just $5/day.'}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Skeleton Context */}
                        {[1, 2].map(i => (
                          <div key={i} className="bg-white dark:bg-[#1a1a1c] border border-gray-200 dark:border-gray-800 rounded-2xl p-4 space-y-2 opacity-30">
                            <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-1/4"></div>
                            <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded w-full"></div>
                            <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded w-3/4"></div>
                          </div>
                        ))}
                      </div>

                      {/* Simulation: Sidebar Ad */}
                      <div className="space-y-6">
                        <div className="bg-white dark:bg-[#1a1a1c] border border-gray-200 dark:border-gray-800 rounded-2xl p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{isRtl ? 'مروج' : 'PROMOTED'}</span>
                          </div>
                          <div className="aspect-square bg-blue-500/5 rounded-xl border border-blue-500/10 flex items-center justify-center">
                            <PieIcon size={32} className="text-blue-500 opacity-40" />
                          </div>
                          <div className="space-y-1">
                            <div className="text-[10px] font-black text-gray-900 dark:text-white leading-tight">
                              {isRtl ? 'تحليلات البيانات للمحترفين' : 'Data Analytics Elite'}
                            </div>
                            <div className="text-[8px] text-accent font-bold uppercase">
                              ${economySettings.sidebar_ad_click_price} / CLICK
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* 2FA Verification Modal */}
      {verificationModal.isOpen && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-main)] rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-6">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-lg font-black text-[var(--text-primary)]">
                {isRtl ? 'تحقق بخطوتين مطلوب' : 'Two-Factor Verification Required'}
              </h3>
              <p className="text-xs text-[var(--text-muted)] font-bold">
                {isRtl 
                  ? `يرجى إدخال رمز التحقق للموافقة على: ${verificationModal.actionType}` 
                  : `Please enter the verification code to approve: ${verificationModal.actionType}`}
              </p>
            </div>

            <div className="space-y-4">
              <input
                type="text"
                maxLength={6}
                value={verificationModal.code}
                onChange={(e) => setVerificationModal({ ...verificationModal, code: e.target.value })}
                placeholder="000000"
                className="w-full bg-[var(--bg-base)] border-2 border-[var(--border-main)] rounded-xl py-4 text-center text-2xl font-black tracking-[1em] focus:border-accent outline-none text-accent"
              />
              
              <div className="flex gap-3">
                <button
                  onClick={() => setVerificationModal({ ...verificationModal, isOpen: false })}
                  className="flex-1 px-4 py-3 rounded-xl border border-[var(--border-main)] text-xs font-bold text-gray-400 hover:bg-gray-800"
                >
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  onClick={handleVerifyApproval}
                  disabled={isApproving || verificationModal.code.length < 4}
                  className="flex-1 px-4 py-3 rounded-xl bg-accent text-white font-black text-xs hover:bg-accent shadow-lg shadow-none disabled:opacity-50"
                >
                  {isApproving ? <RefreshCw size={18} className="animate-spin mx-auto" /> : (isRtl ? 'تأكيد الرمز' : 'Verify & Execute')}
                </button>
              </div>
            </div>
            
            <p className="text-[10px] text-center text-[var(--text-muted)] italic">
              {isRtl ? 'تم إرسال الرمز إلى بريدك الإلكتروني المسجل (محاكاة)' : 'Code has been sent to your registered email (Simulated)'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdsManagementView;

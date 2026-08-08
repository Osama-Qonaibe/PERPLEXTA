import { safeStorageGet, safeStorageSet, safeStorageRemove } from "@/utils/safeStorage";
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { toast } from 'sonner';
import { Wallet, Gift, Copy, Check, History, Zap, Share2, UserPlus, CheckCircle2, ChevronRight, ChevronLeft, Clock, XCircle, ArrowRightLeft, Landmark, Bitcoin, CreditCard, Send, ShieldCheck, Camera, Lock, RefreshCw, AlertTriangle, Users, Mail } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { perplextaPageTransition, perplextaItemTransition } from '../constants/motions';
import { useSwipeToClose } from '../utils/swipe';

const getTxTypeBadgeClass = (type: string, points: number, amount: number) => {
  const isPositive = points > 0 || (points === 0 && amount > 0);
  if (type === 'welcome_bonus' || type === 'referral_bonus') {
    return 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20';
  }
  if (type === 'deposit') {
    return 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20';
  }
  if (type === 'withdrawal') {
    return 'bg-rose-500/10 text-rose-500 border border-rose-500/20';
  }
  if (type === 'tool_usage_hold') {
    return 'bg-amber-500/10 text-amber-500 border border-amber-500/20';
  }
  if (type === 'tool_usage_reconcile') {
    return isPositive 
      ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
      : 'bg-rose-500/10 text-rose-500 border border-rose-500/20';
  }
  if (type === 'admin_adjustment') {
    return isPositive
      ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
      : 'bg-rose-500/10 text-rose-500 border border-rose-500/20';
  }
  return isPositive 
    ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
    : 'bg-rose-500/10 text-rose-500 border border-rose-500/20';
};

const getTxLabel = (type: string, isAr: boolean) => {
  const mapping: Record<string, { en: string; ar: string }> = {
    welcome_bonus: { en: 'Welcome Bonus', ar: 'مكافأة التسجيل الترحيبية' },
    referral_bonus: { en: 'Referral Reward', ar: 'مكافأة إحالة' },
    deposit: { en: 'Top-up Deposit', ar: 'شحن رصيد' },
    withdrawal: { en: 'Withdrawal', ar: 'سحب رصيد' },
    tool_usage_hold: { en: 'Quota Reserved Hold', ar: 'حجز رصيد للعملية' },
    tool_usage_reconcile: { en: 'Usage Adjustment', ar: 'تسوية الاستخدام' },
    admin_adjustment: { en: 'Admin Adjustment', ar: 'تعديل إداري' },
    conversion: { en: 'Points Conversion', ar: 'تحويل نقاط' }
  };
  return mapping[type] ? (isAr ? mapping[type].ar : mapping[type].en) : type;
};

const getToolLabel = (toolId: string, isAr: boolean) => {
  const tools: Record<string, { en: string; ar: string }> = {
    chat: { en: 'Chat', ar: 'المحادثة والدردشة' },
    image_generation: { en: 'Image Generation', ar: 'توليد الصور' },
    code_analysis: { en: 'Code Analysis', ar: 'تحليل الأكواد' },
    smart_search: { en: 'Smart Search', ar: 'البحث الذكي' },
    custom_tool: { en: 'Custom Tool', ar: 'أداة مخصصة' },
    document_summarizer: { en: 'Document Summarizer', ar: 'ملخص المستندات' },
    academic_search: { en: 'Academic Search', ar: 'البحث الأكاديمي' },
    translator: { en: 'Translator', ar: 'المترجم الاحترافي' },
  };
  const normalized = toolId.toLowerCase().replace(/[\-_]/g, '_');
  return tools[normalized] ? (isAr ? tools[normalized].ar : tools[normalized].en) : toolId;
};

const getTranslatedDescription = (description: string, isAr: boolean) => {
  if (!description) return '';

  // 1. Welcome Bonus Registration description
  if (description.toLowerCase().includes('welcome registration bonus') || description.toLowerCase().includes('welcome_bonus') || description.includes('مكافأة التسجيل الترحيبية')) {
    return isAr ? 'مكافأة التسجيل الترحيبية' : 'Welcome registration bonus';
  }

  // 2. Upfront hold description
  const holdRegex = /(?:\.)?Upfront hold of (\d+) pts for tool ([\w_\-]+)/i;
  const holdMatch = description.match(holdRegex);
  if (holdMatch) {
    const pts = parseInt(holdMatch[1], 10);
    const toolId = holdMatch[2];
    const toolName = getToolLabel(toolId, isAr);
    return isAr 
      ? `حجز مؤقت لـ ${pts} نقطة لاستخدام أداة ${toolName}`
      : `Temporary reservation of ${pts} points for tool ${toolName}`;
  }

  // 3. Reconciled surcharge / refund
  // Pattern 1: ".Reconciled chat. Surcharge: 5 pts. Actual: 106 pts"
  const surchargeRegex = /(?:\.)?Reconciled ([\w_\-]+)\. Surcharge: (\d+) pts\. Actual: (\d+) pts/i;
  const surchargeMatch = description.match(surchargeRegex);
  if (surchargeMatch) {
    const toolId = surchargeMatch[1];
    const surcharge = parseInt(surchargeMatch[2], 10);
    const actual = parseInt(surchargeMatch[3], 10);
    const toolName = getToolLabel(toolId, isAr);
    return isAr
      ? `تسوية أداة ${toolName}: خصم إضافي ${surcharge} نقطة (الاستهلاك الفعلي: ${actual} نقطة)`
      : `Reconciliation for ${toolName}: Surcharge of ${surcharge} points (Actual use: ${actual} points)`;
  }

  // Pattern 2: ".Reconciled chat. Refunded 5 pts. Actual: 106 pts"
  const refundRegex = /(?:\.)?Reconciled ([\w_\-]+)\. Refunded (\d+) pts\. Actual: (\d+) pts/i;
  const refundMatch = description.match(refundRegex);
  if (refundMatch) {
    const toolId = refundMatch[1];
    const refund = parseInt(refundMatch[2], 10);
    const actual = parseInt(refundMatch[3], 10);
    const toolName = getToolLabel(toolId, isAr);
    return isAr
      ? `تسوية أداة ${toolName}: استرجاع ${refund} نقطة (الاستهلاك الفعلي: ${actual} نقطة)`
      : `Reconciliation for ${toolName}: Refunded ${refund} points (Actual use: ${actual} points)`;
  }

  // 4. Admin adjustment
  const adminRegex = /^\[(POINTS|BALANCE)\]\s*(.*)$/i;
  const adminMatch = description.match(adminRegex);
  if (adminMatch) {
    const target = adminMatch[1].toLowerCase();
    const reasonValue = adminMatch[2].trim();
    const isPoints = target === 'points';
    
    let translatedReason = reasonValue;
    if (reasonValue.toLowerCase().includes('welcome bonus') || reasonValue.includes('مكافأة التسجيل الترحيبية')) {
      translatedReason = isAr ? 'مكافأة التسجيل الترحيبية الصالحة' : 'Welcome Registration Bonus';
    } else if (reasonValue.toLowerCase() === 'referral registration bonus' || reasonValue.includes('مكافأة إحالة ترحيبية')) {
      translatedReason = isAr ? 'مكافأة رصيد الإحالة عند التسجيل' : 'Referral Registration Bonus';
    } else if (reasonValue.toLowerCase() === 'kyc verification points' || reasonValue.includes('نقاط تفعيل الهوية')) {
      translatedReason = isAr ? 'نقاط مكافأة تفعيل الحساب وتوثيق الهوية' : 'Identity Verification Bonus';
    }

    if (isAr) {
      return `تعديل إداري (${isPoints ? 'نقاط' : 'رصيد'}): ${translatedReason}`;
    } else {
      return `Admin adjustment (${isPoints ? 'Points' : 'Balance'}): ${translatedReason}`;
    }
  }

  // 5. Points conversion
  if (description.toLowerCase().includes('points conversion') || description.toLowerCase().includes('convert') || description.includes('تحويل النقاط')) {
    return isAr ? 'تحويل النقاط إلى رصيد المحفظة' : 'Conversion of points to wallet balance';
  }

  // 6. Referral Commission / signup reward
  if (description.toLowerCase().includes('referral signup reward') || description.includes('مكافأة إحالة')) {
    return isAr ? 'مكافأة تسجيل صديق جديد عبر رمز الإحالة الخاص بك' : 'Reward for a friend signing up via your referral link';
  }

  if (description.includes('/') && (description.toLowerCase().includes('welcome') || description.includes('مكافأة'))) {
    const parts = description.split('/');
    if (parts.length === 2) {
      return isAr ? parts[1].trim() : parts[0].trim();
    }
  }

  return description;
};

export const RewardsPage: React.FC = () => {
  const { t, theme, dir, token, user: contextUser, setUser, refreshUser, economySettings, isMobile } = useAppContext();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [isClearHistoryConfirmOpen, setIsClearHistoryConfirmOpen] = useState(false);
  const [convertAmount, setConvertAmount] = useState('10000');
  
  const swipeHandlers = useSwipeToClose({
    onSwipeClose: () => setIsConvertModalOpen(false),
    direction: 'both',
    dir: dir as 'rtl' | 'ltr',
    isMobile: !!isMobile
  });
  

  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activationFileInputRef = useRef<HTMLInputElement>(null);
  const [kycFullName, setKycFullName] = useState('');
  const [selfieCaptured, setSelfieCaptured] = useState(false);
  const [selfieData, setSelfieData] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [wallet, setWallet] = useState<any>({ points: 0, balance: 0, referral_activated: false });
  const [transactions, setTransactions] = useState<any[]>([]);
  const [referralCount, setReferralCount] = useState(0);
  const [referredFriends, setReferredFriends] = useState<any[]>([]);
  const [isLoadingReferredFriends, setIsLoadingReferredFriends] = useState(false);
  const [friendsFilter, setFriendsFilter] = useState<'all' | 'verified' | 'pending' | 'nodeposityet'>('all');
  const [friendsSort, setFriendsSort] = useState<'joined_at' | 'deposit_amount'>('joined_at');
  const [txOffset, setTxOffset] = useState(0);
  const [hasMoreTx, setHasMoreTx] = useState(true);
  const TX_LIMIT = 20;

  // Activation Deposit Form States
  const [showActivationForm, setShowActivationForm] = useState(false);
  const [activationMethod, setActivationMethod] = useState<'balance' | 'crypto' | 'bank' | 'paypal' | 'stripe'>('balance');
  const [activationRefId, setActivationRefId] = useState('');
  const [activationProofFile, setActivationProofFile] = useState<File | null>(null);
  const [isActivating, setIsActivating] = useState(false);
  const [activationStep, setActivationStep] = useState(0); // 0: idle, 1: uploading, 2: processing
  
  // Email Invitation States
  const [sentInvitations, setSentInvitations] = useState<any[]>([]);
  const [isFetchingInvitations, setIsFetchingInvitations] = useState<boolean>(false);
  const [inviteEmail, setInviteEmail] = useState<string>('');
  const [isInviting, setIsInviting] = useState<boolean>(false);
  const [remindingEmails, setRemindingEmails] = useState<Record<string, boolean>>({});
  const startCamera = async () => {
    setIsCapturing(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      console.error("Error accessing camera:", err);
      if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        toast.error(dir === 'rtl' ? 'لم يتم العثور على كاميرا في جهازك. يرجى استخدام جهاز يحتوي على كاميرا لإتمام عملية التحقق.' : 'No camera found on your device. Please use a device with a camera for verification.');
      } else {
        toast.error(dir === 'rtl' ? 'تعذر الوصول إلى الكاميرا. يرجى التأكد من منح الإذن.' : 'Could not access camera. Please ensure permissions are granted.');
      }
      setIsCapturing(false);
    }
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
        const data = canvasRef.current.toDataURL('image/png');
        setSelfieData(data);
        setSelfieCaptured(true);
        setIsCapturing(false);
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    }
  };

  const handleSubmitKYC = async () => {
    if (!kycFullName.trim() || !selfieCaptured || !token) return;
    
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/kyc/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ fullName: kycFullName, selfie: selfieData })
      });
      
      if (res.ok) {
        const userRes = await fetch('/api/user/profile', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (userRes.ok) {
          const userData = await userRes.json();
          setUser(userData);
        }
      } else {
        const data = await res.json();
        console.error('KYC submission failed:', data.error);
      }
    } catch (error) {
      console.error('Error submitting KYC:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConvertPoints = async () => {
    if (!convertAmount || isNaN(Number(convertAmount)) || Number(convertAmount) <= 0 || !token) return;
    
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/wallet/convert-points', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ amountPoints: Number(convertAmount) })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        toast.success(dir === 'rtl' ? `تم تحويل النقاط بنجاح! الرصيد الجديد: $${Number(data.usdAmount).toFixed(2)}` : `Points converted successfully! New Balance: $${Number(data.usdAmount).toFixed(2)}`);
        setIsConvertModalOpen(false);
        setConvertAmount('1000');
        
        refreshUser();
        const walletRes = await fetch('/api/wallet', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (walletRes.ok) {
          const wData = await walletRes.json();
          setWallet(wData);
        }
      } else {
        toast.error(data.error || 'Conversion failed');
      }
    } catch (error) {
      console.error('Error converting points:', error);
      toast.error(dir === 'rtl' ? 'حدث خطأ غير متوقع' : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClearHistory = () => {
    if (!token) return;
    setIsClearHistoryConfirmOpen(true);
  };

  const handleClearHistoryConfirm = async () => {
    setIsClearHistoryConfirmOpen(false);
    if (!token) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/wallet/clear', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await res.json();
      if (res.ok) {
        setTransactions([]);
        setHasMoreTx(false);
        setTxOffset(0);
        toast.success(dir === 'rtl' ? 'تم مسح السجل بنجاح لضمان نظافة البيانات وعدم التضخم!' : 'History cleared successfully to ensure clean data and no bloat!');
      } else {
        toast.error(data.error || 'Failed to clear history');
      }
    } catch (err) {
      console.error('Error clearing history:', err);
      toast.error(dir === 'rtl' ? 'حدث خطأ أثناء مسح سجل المعاملات' : 'An error occurred while clearing history');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleActivateWithBalance = async () => {
    setIsActivating(true);
    setActivationStep(2);
    try {
      const res = await fetch('/api/wallet/activate-referral-balance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(
          dir === 'rtl'
            ? '🚀 تهانينا! لقد تم تفعيل نظام الأرباح الخاص بك بنجاح خصماً من رصيدك المتاح.'
            : '🚀 Congratulations! Your referral and earnings program has been successfully activated from your wallet balance.'
        );
        setWallet((prev: any) => ({ ...prev, referral_activated: true, balance: data.newBalance }));
        if (setUser && contextUser) {
          setUser({ ...contextUser, referral_activated: true, balance: data.newBalance } as any);
        }
        setShowActivationForm(false);
      } else {
        toast.error(data.error_ar && dir === 'rtl' ? data.error_ar : data.error || 'Activation failed');
      }
    } catch (err) {
      toast.error(dir === 'rtl' ? 'فشل الاتصال لتفعيل نظام الأرباح' : 'Failed to connect for activation');
    } finally {
      setIsActivating(false);
      setActivationStep(0);
    }
  };

  const handleActivateWithDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    
    const minAmount = Number(economySettings?.referral_activation_min_deposit || 10);
    
    if (activationMethod === 'stripe') {
      setIsActivating(true);
      setActivationStep(2);
      try {
        const stripeRes = await fetch('/api/payments/stripe-deposit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ amount: minAmount })
        });
        if (stripeRes.ok) {
          const stripeData = await stripeRes.json();
          if (stripeData.url) {
            toast.success(dir === 'rtl' ? 'جاري تحويلك إلى نافذة دفع Stripe الآمنة...' : 'Redirecting to secure Stripe checkout...');
            setTimeout(() => {
              window.location.href = stripeData.url;
            }, 800);
            return;
          }
        }
        toast.error(dir === 'rtl' ? 'فشل توليد رابط الدفع آلياً' : 'Failed to create payment session');
      } catch (err) {
        toast.error(dir === 'rtl' ? 'حدث خطأ في التهيئة' : 'An error occurred during initialization');
      } finally {
        setIsActivating(false);
        setActivationStep(0);
      }
      return;
    }

    // Manual deposits
    if (!activationRefId.trim()) {
      toast.error(dir === 'rtl' ? 'يرجى إدخال الرقم المرجعي أو إثبات الشحن' : 'Please enter transaction reference / ID');
      return;
    }

    setIsActivating(true);
    setActivationStep(1); // Uploading files

    let uploadedFileUrl = '';
    if (activationProofFile) {
      try {
        const formData = new FormData();
        formData.append('file', activationProofFile);
        const authToken = token || safeStorageGet('app_token') || '';
        const uploadRes = await fetch('/api/files/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`
          },
          body: formData
        });
        if (!uploadRes.ok) {
          throw new Error('Screenshot upload failed');
        }
        const data = await uploadRes.json();
        uploadedFileUrl = data.file?.file_url || data.fileUrl || data.url || '';
      } catch (uploadErr) {
        toast.error(dir === 'rtl' ? 'فشل تحميل صورة إثبات المعاملة' : 'Failed to upload transaction proof image.');
        setIsActivating(false);
        setActivationStep(0);
        return;
      }
    }

    setActivationStep(2); // Recording and sync

    try {
      const res = await fetch('/api/wallet/deposit-manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: minAmount,
          method: 
            activationMethod === 'crypto'
              ? 'USDT (TRC-20)'
              : activationMethod === 'paypal'
              ? 'PAYPAL'
              : 'BANK TRANSFER',
          reference_id: activationRefId,
          proof_url: uploadedFileUrl
        })
      });

      if (res.ok) {
        toast.success(
          dir === 'rtl'
            ? 'تم إرسال طلب تفعيل نظام الأرباح الخاص بك بنجاح! سيقوم المشرف بالتحقق من الإيداع وقبوله فوراً.'
            : 'Referral activation deposit requested successfully! Administrator will verify and unlock your link.'
        );
        setActivationRefId('');
        setActivationProofFile(null);
        setShowActivationForm(false);
      } else {
        const errData = await res.json();
        toast.error(errData.error || (dir === 'rtl' ? 'فشل إرسال طلب الشحن للتفعيل' : 'Failed to request activation deposit.'));
      }
    } catch (err) {
      toast.error(dir === 'rtl' ? 'عطل في الاتصال بخادم المحفظة المالية' : 'Database connection error.');
    } finally {
      setIsActivating(false);
      setActivationStep(0);
    }
  };

  const fetchSentInvitations = async () => {
    if (!token) return;
    setIsFetchingInvitations(true);
    try {
      const res = await fetch('/api/wallet/referral-invitations', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSentInvitations(data);
      }
    } catch (err) {
      console.error('Error fetching referral invitations:', err);
    } finally {
      setIsFetchingInvitations(false);
    }
  };

  const handleSendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail)) {
      toast.error(
        dir === 'rtl'
          ? 'تنسيق البريد الإلكتروني غير صالح.'
          : 'Please enter a valid email address.'
      );
      return;
    }

    setIsInviting(true);
    try {
      const res = await fetch('/api/wallet/invite-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ email: inviteEmail })
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(dir === 'rtl' ? data.message_ar || 'تم إرسال الدعوة بنجاح!' : data.message || 'Invitation sent successfully!');
        setInviteEmail('');
        fetchSentInvitations();
      } else {
        toast.error(dir === 'rtl' ? data.error_ar || data.error || 'فشل إرسال الدعوة.' : data.error || 'Failed to send invitation.');
      }
    } catch (err) {
      console.error('Error sending referral invitation:', err);
      toast.error(
        dir === 'rtl'
          ? 'عملية الاتصال بالخادم فشلت.'
          : 'Server communication failed.'
      );
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemindInvitation = async (email: string) => {
    if (!token || !email) return;

    setRemindingEmails((prev) => ({ ...prev, [email]: true }));
    try {
      const res = await fetch('/api/wallet/remind-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ email })
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(
          dir === 'rtl'
            ? data.message_ar || 'تم إرسال تذكير بضغطة زر بنجاح!'
            : data.message || 'One-click reminder dispatched successfully!'
        );
        fetchSentInvitations();
      } else {
        toast.error(
          dir === 'rtl'
            ? data.error_ar || data.error || 'فشل إرسال التذكير.'
            : data.error || 'Failed to dispatch invitation reminder.'
        );
      }
    } catch (err) {
      console.error('Error sending invitation reminder:', err);
      toast.error(
        dir === 'rtl'
          ? 'عملية الاتصال بالخادم فشلت.'
          : 'Server communication failed.'
      );
    } finally {
      setRemindingEmails((prev) => ({ ...prev, [email]: false }));
    }
  };

  useEffect(() => {
    if (token) {
      fetchSentInvitations();
    }
  }, [token]);

  
  useEffect(() => {
    const fetchData = async () => {
      try {
        if (token) {
          const userRes = await fetch('/api/user/profile', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (userRes.ok) {
            const userData = await userRes.json();
            setUser(userData);
          }

          const walletRes = await fetch('/api/wallet', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (walletRes.ok) {
            const data = await walletRes.json();
            setWallet(data);
          }

          const transRes = await fetch(`/api/wallet/history?limit=${TX_LIMIT}&offset=${txOffset}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (transRes.ok) {
            const data = await transRes.json();
            const newTransactions = Array.isArray(data) ? data : (data.transactions || []);
            if (txOffset === 0) {
              setTransactions(newTransactions);
              if (newTransactions.length >= 20) {
                toast.info(dir === 'rtl' 
                  ? 'تم الوصول إلى الحد الأقصى (20 من السجلات). سيتم حذف السجلات القديمة تلقائيًا لمنع تضخم البيانات.' 
                  : 'Transaction limit of 20 records reached. Oldest transactions are automatically pruned to prevent data bloat.'
                );
              }
            } else {
              setTransactions(prev => {
                const updated = [...prev, ...newTransactions];
                if (updated.length >= 20) {
                  toast.info(dir === 'rtl' 
                    ? 'تم الوصول إلى الحد الأقصى (20 من السجلات). سيتم حذف السجلات القديمة تلقائيًا لمنع تضخم البيانات.' 
                    : 'Transaction limit of 20 records reached. Oldest transactions are automatically pruned to prevent data bloat.'
                  );
                }
                return updated;
              });
            }
            if (newTransactions.length < TX_LIMIT || (data.hasMore === false)) setHasMoreTx(false);
          }

          const refRes = await fetch('/api/wallet/referral-count', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (refRes.ok) {
            const data = await refRes.json();
            setReferralCount(data.count);
          }

          setIsLoadingReferredFriends(true);
          try {
            const detailedRefRes = await fetch('/api/wallet/referred-friends-detailed', {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (detailedRefRes.ok) {
              const detailedData = await detailedRefRes.json();
              setReferredFriends(detailedData);
            }
          } catch (detailedErr) {
            console.error('Error fetching detailed referred friends:', detailedErr);
          } finally {
            setIsLoadingReferredFriends(false);
          }
        }
      } catch (error) {
        console.error('Error fetching rewards data:', error);
      }
    };
    fetchData();
  }, [token, txOffset]);

  const formatTranslation = (key: string) => {
    let text = t(key);
    text = text.replace('{welcomeBonus}', economySettings.welcome_bonus_points.toLocaleString());
    text = text.replace('{referralBonus}', economySettings.referral_bonus_points.toLocaleString());
    return text;
  };

  const referralLink = contextUser ? `${window.location.origin}/?ref=${contextUser.referral_code || contextUser.id}` : "...";

  const handleCopy = () => {
    if (!contextUser) return;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success(
      dir === 'rtl' 
        ? 'تم نسخ رابط الإحالة الخاص بك بنجاح!' 
        : 'Referral link copied to clipboard successfully!'
    );
    setTimeout(() => setCopied(false), 2000);
  };

  const withdrawableUSD = Number(wallet.balance || 0).toFixed(2);
  const estimatedPointsWorth = (Number(wallet.points || 0) * Number(economySettings.conversion_rate || 0)).toFixed(2);

  return (
    <motion.div 
      initial="initial"
      animate="animate"
      exit="exit"
      variants={perplextaPageTransition}
      className="max-w-5xl mx-auto w-[92%] md:w-[85%] pb-24 space-y-6 md:space-y-10"
    >
      
      {/* Sticky Header with Back Button - Elite Standard */}
      <div className={`sticky -top-0.5 z-[40] -mx-4 md:-mx-8 px-4 md:px-8 py-3 mb-6 transition-theme bg-[var(--bg-base)]/95 backdrop-blur-md border-b border-[var(--border-main)]`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 md:gap-4">
            <button 
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-[4px] flex items-center justify-center transition-all duration-300 bg-[var(--bg-secondary)] border border-[var(--border-main)] text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white cursor-pointer group"
            >
              {dir === 'rtl' ? <ChevronRight size={18} className="text-gray-600 dark:text-gray-300 group-hover:scale-110 transition-transform" /> : <ChevronLeft size={18} className="text-gray-600 dark:text-gray-300 group-hover:scale-110 transition-transform" />}
            </button>
            <div className="flex items-center gap-2 md:gap-3">
              <h1 className="text-xl md:text-2xl font-black tracking-tight text-[var(--text-primary)] uppercase">{t('rewards')}</h1>
              {contextUser?.kyc_status === 'verified' && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-[4px] bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">
                  <CheckCircle2 size={12} className="md:w-3.5 md:h-3.5 text-emerald-500" />
                  <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest">{t('verified')}</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => navigate('/settings?tab=wallet')}
              className="flex items-center gap-2 px-3.5 md:px-4 py-2 rounded-[4px] border border-gray-300 dark:border-gray-800 bg-gray-100 hover:bg-gray-200 dark:bg-[#1a1a1c] dark:hover:bg-[#222225] text-gray-900 dark:text-white transition-all duration-300 cursor-pointer group shadow-sm font-bold"
            >
              <Landmark size={14} className="text-emerald-500 transition-all duration-300" />
              <span className="text-[10px] font-black uppercase tracking-tighter">
                {dir === 'rtl' ? 'إيداع أموال / Deposit Funds' : 'Deposit Funds / إيداع أموال'}
              </span>
            </button>
            <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-[4px] border bg-[var(--bg-secondary)] border-[var(--border-main)]">
               <Landmark size={14} className="text-emerald-500" />
               <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-tighter">PLATFORM LEDGER</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Cards: Balance and Points */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        
        {/* Withdrawable Balance Card */}
        <div className="relative overflow-hidden rounded-[var(--radius)] p-5 md:p-8 border bg-[var(--bg-secondary)] border-[var(--border-main)] flex flex-col items-center justify-center text-center min-h-[180px] md:min-h-[240px]">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[120px] md:text-[180px] font-bold text-gray-400/5 dark:text-gray-600/5 select-none pointer-events-none">
            $
          </div>
          <div className="relative z-10 space-y-2 md:space-y-4">
            <h3 className="text-[11px] md:text-base text-gray-700 dark:text-gray-300 font-bold uppercase tracking-wider">{t('withdrawableBalance')}</h3>
            <div className="flex items-baseline justify-center gap-1.5 md:gap-2">
              <span className="text-sm md:text-xl font-bold text-gray-700 dark:text-gray-300">USD</span>
              <span className="text-4xl md:text-6xl font-bold text-[var(--text-primary)] tracking-tight">${withdrawableUSD}</span>
            </div>
            <button 
              onClick={() => navigate('/settings?tab=wallet')}
              className="mt-2 md:mt-6 flex items-center justify-center gap-2 mx-auto px-5 py-2.5 md:px-6 md:py-3 rounded-[4px] bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-xs md:text-base font-extrabold transition-all duration-300 cursor-pointer group shadow-sm"
            >
              <Wallet size={16} className="md:w-[18px] md:h-[18px] text-emerald-500 transition-all duration-300" />
              <span>{t('requestWithdrawal')}</span>
            </button>
          </div>
        </div>

        {/* Points Balance Card */}
        <div className="relative overflow-hidden rounded-[var(--radius)] p-5 md:p-8 border bg-[var(--bg-secondary)] border-[var(--border-main)] flex flex-col items-center justify-center text-center min-h-[180px] md:min-h-[240px]">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 select-none pointer-events-none opacity-5">
            <Gift className="text-gray-400 dark:text-gray-600 w-[140px] h-[140px] md:w-[200px] md:h-[200px]" />
          </div>
          <div className="relative z-10 space-y-2 md:space-y-4">
            <h3 className="text-[11px] md:text-base text-gray-700 dark:text-gray-300 font-bold uppercase tracking-wider">{t('pointsBalance')}</h3>
            <div className="flex flex-col items-center justify-center gap-0.5 md:gap-1">
              <div className="flex items-baseline gap-1.5 md:gap-2">
                <span className="text-sm md:text-xl font-bold text-gray-700 dark:text-gray-300">PTS</span>
                <span className="text-4xl md:text-6xl font-bold text-[var(--text-primary)] tracking-tight">{Math.floor(Number(wallet.points || 0)).toLocaleString()}</span>
              </div>
              <span className="text-[10px] md:text-sm text-gray-600 dark:text-gray-300 font-semibold">≈ ${estimatedPointsWorth}</span>
            </div>
            <button 
              onClick={() => setIsConvertModalOpen(true)}
              className="mt-2 md:mt-6 flex items-center justify-center gap-2 mx-auto px-5 py-2.5 md:px-6 md:py-3 rounded-[4px] bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-xs md:text-base font-extrabold transition-all duration-300 cursor-pointer group shadow-sm"
            >
              <Zap size={16} className="md:w-[18px] md:h-[18px] text-emerald-500 transition-all duration-300" />
              <span>{t('convertPointsToBalance')}</span>
            </button>
          </div>
        </div>

      </div>

      {/* Middle Cards: How it works and Invite */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        
        {/* How it works */}
        <div className="rounded-[var(--radius)] p-5 md:p-8 border bg-[var(--bg-secondary)] border-[var(--border-main)] transition-theme hover:border-gray-300 dark:hover:border-gray-700">
          <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-6 md:mb-8 text-center flex items-center justify-center gap-2">
            <Zap size={20} className="text-emerald-500" />
            <span>{t('howSystemWorks')}</span>
          </h3>
          
          <div className="space-y-6 md:space-y-8">
            {/* Step 1 */}
            <div className="flex items-start gap-3 md:gap-4 group">
              <div className="flex-shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-[4px] bg-gray-100 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-300 text-sm md:text-lg font-bold group-hover:bg-gray-200 dark:group-hover:bg-gray-700 group-hover:text-gray-900 dark:group-hover:text-white transition-all duration-300">
                1
              </div>
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white text-base md:text-lg tracking-tight group-hover:text-gray-900 dark:group-hover:text-white transition-colors duration-300">{t('shareYourLink')}</h4>
                <p className="text-[11px] md:text-sm text-gray-500 dark:text-gray-400 mt-0.5 md:mt-1 font-medium leading-relaxed">{t('shareYourLinkDesc')}</p>
              </div>
            </div>
            
            {/* Step 2 */}
            <div className="flex items-start gap-3 md:gap-4 group">
              <div className="flex-shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-[4px] bg-gray-100 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-300 text-sm md:text-lg font-bold group-hover:bg-gray-200 dark:group-hover:bg-gray-700 group-hover:text-gray-900 dark:group-hover:text-white transition-all duration-300">
                2
              </div>
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white text-base md:text-lg tracking-tight group-hover:text-gray-900 dark:group-hover:text-white transition-colors duration-300">{t('registration')}</h4>
                <p className="text-[11px] md:text-sm text-gray-500 dark:text-gray-400 mt-0.5 md:mt-1 font-medium leading-relaxed">{formatTranslation('registrationDesc')}</p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-3 md:gap-4 group">
              <div className="flex-shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-[4px] bg-gray-100 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-300 text-sm md:text-lg font-bold group-hover:bg-gray-200 dark:group-hover:bg-gray-700 group-hover:text-gray-900 dark:group-hover:text-white transition-all duration-300">
                3
              </div>
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white text-base md:text-lg tracking-tight group-hover:text-gray-900 dark:group-hover:text-white transition-colors duration-300">{t('activationAndProfit')}</h4>
                <p className="text-[11px] md:text-sm text-gray-500 dark:text-gray-400 mt-0.5 md:mt-1 font-medium leading-relaxed">{formatTranslation('activationAndProfitDesc')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Invite Friends */}
        <div className="rounded-[var(--radius)] p-5 md:p-8 border bg-[var(--bg-secondary)] border-[var(--border-main)] flex flex-col transition-theme hover:border-gray-300 dark:hover:border-gray-700">
          <div className="text-center mb-6 md:mb-8">
            <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white flex items-center justify-center gap-2">
              <Zap size={18} className="text-emerald-500" />
              <span>{t('inviteFriendsAndEarn')}</span>
            </h3>
            <p className="text-[11px] md:text-sm text-gray-500 dark:text-gray-400 mt-1.5 md:mt-2 max-w-sm mx-auto font-medium leading-relaxed">
              {formatTranslation('inviteFriendsDesc')}
            </p>
          </div>

          <div className="mt-auto space-y-4 md:space-y-6">
            {!wallet?.referral_activated ? (
              <div className="p-4 md:p-6 rounded-[var(--radius)] border border-gray-200 dark:border-gray-800 bg-[var(--bg-primary)] flex flex-col gap-4 text-center">
                {!showActivationForm ? (
                  <>
                    <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-700 dark:text-gray-300 mx-auto border border-gray-200 dark:border-gray-700">
                      <Zap size={18} className="text-emerald-500" />
                    </div>
                    <div className="space-y-1.5">
                      <h4 className="text-xs md:text-sm font-extrabold text-gray-900 dark:text-white uppercase tracking-wider">
                        {dir === 'rtl' ? 'مطلوب تفعيل نظام الأرباح' : 'Earnings Activation Required'}
                      </h4>
                      <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 font-medium leading-relaxed max-w-sm mx-auto">
                        {dir === 'rtl'
                          ? `سعر تفعيل خدمة الأرباح والحصول على رابط إحالة خاص بك هو إيداع حد أدنى بقيمة $${economySettings?.referral_activation_min_deposit || 10}. يمكنك شحن رصيدك أو التنشيط الفوري للاشتراك وجني المكافآت.`
                          : `To activate your referral link and start receiving rewards, you must first deposit or pay a minimum of $${economySettings?.referral_activation_min_deposit || 10}.`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowActivationForm(true);
                        const cost = Number(economySettings?.referral_activation_min_deposit || 10);
                        if (Number(wallet?.balance || 0) >= cost) {
                          setActivationMethod('balance');
                        } else {
                          setActivationMethod('stripe');
                        }
                      }}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-[4px] bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 font-extrabold text-[11px] md:text-xs uppercase tracking-wider transition-all duration-300 border border-gray-800 dark:border-gray-200 cursor-pointer shadow-sm group"
                    >
                      <Zap size={14} className="text-emerald-500 transition-all duration-300" />
                      <span>{dir === 'rtl' ? 'تفعيل نظام الأرباح الآن' : 'Activate Earnings Now'}</span>
                    </button>
                  </>
                ) : (
                  <form onSubmit={handleActivateWithDeposit} className="text-left space-y-4">
                    <div className="flex items-center justify-between border-b border-[var(--border-main)] pb-2 mb-2">
                      <span className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest flex items-center gap-1.5">
                        <Zap size={14} className="text-emerald-500" />
                        {dir === 'rtl' ? 'تفعيل حساب الإحالات والعمولات' : 'Referral Activation Hub'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowActivationForm(false)}
                        className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all duration-300 cursor-pointer"
                      >
                        {dir === 'rtl' ? 'إلغاء' : 'Cancel'}
                      </button>
                    </div>

                    {/* Method Selector Tabs */}
                    <div className="grid grid-cols-5 gap-1 bg-[var(--bg-primary)] p-0.5 rounded-[4px] border border-[var(--border-main)]">
                      <button
                        type="button"
                        onClick={() => setActivationMethod('balance')}
                        className={`py-1.5 rounded-[4px] text-[9px] font-black uppercase text-center transition-all duration-300 cursor-pointer ${
                          activationMethod === 'balance'
                            ? 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-700 font-extrabold'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-transparent'
                        }`}
                        title={dir === 'rtl' ? 'رصيد المحفظة' : 'Wallet Balance'}
                      >
                        {dir === 'rtl' ? 'الرصيد' : 'Balance'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setActivationMethod('stripe')}
                        className={`py-1.5 rounded-[4px] text-[9px] font-black uppercase text-center transition-all duration-300 cursor-pointer ${
                          activationMethod === 'stripe'
                            ? 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-700 font-extrabold'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-transparent'
                        }`}
                        title={dir === 'rtl' ? 'بطاقة الائتمان' : 'Credit Card'}
                      >
                        {dir === 'rtl' ? 'البطاقة' : 'Card'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setActivationMethod('crypto')}
                        className={`py-1.5 rounded-[4px] text-[9px] font-black uppercase text-center transition-all duration-300 cursor-pointer ${
                          activationMethod === 'crypto'
                            ? 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-700 font-extrabold'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-transparent'
                        }`}
                        title={dir === 'rtl' ? 'عملة USDT' : 'USDT Crypto'}
                      >
                        USDT
                      </button>
                      <button
                        type="button"
                        onClick={() => setActivationMethod('paypal')}
                        className={`py-1.5 rounded-[4px] text-[9px] font-black uppercase text-center transition-all duration-300 cursor-pointer ${
                          activationMethod === 'paypal'
                            ? 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-700 font-extrabold'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-transparent'
                        }`}
                        title="PayPal"
                      >
                        PayPal
                      </button>
                      <button
                        type="button"
                        onClick={() => setActivationMethod('bank')}
                        className={`py-1.5 rounded-[4px] text-[9px] font-black uppercase text-center transition-all duration-300 cursor-pointer ${
                          activationMethod === 'bank'
                            ? 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-700 font-extrabold'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-transparent'
                        }`}
                        title={dir === 'rtl' ? 'تحويل بنكي' : 'Bank Transfer'}
                      >
                        {dir === 'rtl' ? 'البنك' : 'Bank'}
                      </button>
                    </div>

                    {/* Method Content */}
                    <div className="bg-[var(--bg-primary)] p-3 rounded-md border border-[var(--border-main)] text-xs space-y-3">
                      {activationMethod === 'balance' && (
                        <div className="space-y-3 text-left">
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-relaxed font-semibold">
                            {dir === 'rtl'
                              ? `يمكنك تفعيل حساب الأرباح فوراً باستخدام رصيدك المتوفر حالياً في المحفظة التقنية.`
                              : `Directly activate your referrals and earnings using your available tech wallet balance.`}
                          </p>
                          <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 p-2 rounded-[4px] text-[11px] font-black">
                            <span className="text-gray-500 dark:text-gray-400">{dir === 'rtl' ? 'الرصيد المتاح:' : 'Available Balance:'}</span>
                            <span className="text-gray-900 dark:text-white font-mono">${wallet?.balance || 0}</span>
                          </div>
                          <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 p-2 rounded-[4px] text-[11px] font-black">
                            <span className="text-gray-500 dark:text-gray-400">{dir === 'rtl' ? 'رسوم التفعيل:' : 'Activation Fee:'}</span>
                            <span className="text-gray-900 dark:text-white font-mono">${economySettings?.referral_activation_min_deposit || 10}</span>
                          </div>
                          {Number(wallet?.balance || 0) >= Number(economySettings?.referral_activation_min_deposit || 10) ? (
                            <button
                              type="button"
                              disabled={isActivating}
                              onClick={handleActivateWithBalance}
                              className="w-full py-2 bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 font-extrabold text-[10px] uppercase tracking-wider rounded-[4px] flex items-center justify-center gap-1.5 transition-all duration-300 cursor-pointer group"
                            >
                              {isActivating ? (
                                <RefreshCw size={12} className="animate-spin text-emerald-500" />
                              ) : (
                                <ShieldCheck size={12} className="text-emerald-500" />
                              )}
                              <span>{dir === 'rtl' ? 'تفعيل فوري وخصم من الرصيد' : 'Deduct Balance & Activate Now'}</span>
                            </button>
                          ) : (
                            <div className="p-2 border border-rose-500/10 bg-rose-500/[0.02] rounded-[4px] text-[9px] text-rose-500 font-bold leading-relaxed flex items-center gap-2">
                              <AlertTriangle size={12} className="flex-shrink-0" />
                              <span>
                                {dir === 'rtl'
                                  ? 'رصيدك الحالي غير كافٍ للتفعيل الفوري. يرجى اختيار وسيلة دفع أخرى لشحن رصيد وتفعيله.'
                                  : 'Your wallet balance is insufficient. Please use another deposit channel.'}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {activationMethod === 'stripe' && (
                        <div className="space-y-3 text-left">
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-relaxed font-semibold">
                            {dir === 'rtl'
                              ? `سوف تصدر معاملة إيداع فوري بمبلغ التفعيل ($${economySettings?.referral_activation_min_deposit || 10})، وسيتم تحويلك لبوابة Stripe الآمنة لتأكيد الدفع بالبطاقة.`
                              : `Initiate a secure card checkout session for exactly the activation fee ($${economySettings?.referral_activation_min_deposit || 10}) via Stripe.`}
                          </p>
                          <button
                            type="submit"
                            disabled={isActivating}
                            className="w-full py-2 bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 font-extrabold text-[10px] uppercase tracking-wider rounded-[4px] flex items-center justify-center gap-1.5 transition-all duration-300 cursor-pointer group"
                          >
                            {isActivating ? (
                              <RefreshCw size={12} className="animate-spin text-emerald-500" />
                            ) : (
                              <CreditCard size={12} className="text-emerald-500" />
                            )}
                            <span>{dir === 'rtl' ? 'الدفع الآمن بالبطاقة والتفعيل الفوري' : 'Pay Safely & Activate Instantly'}</span>
                          </button>
                        </div>
                      )}

                      {/* Manual USDT Deposit Channel */}
                      {activationMethod === 'crypto' && (
                        <div className="space-y-3.5 text-left">
                          <div className="p-2 border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800/40 rounded-[4px] space-y-1.5">
                            <span className="text-[9px] uppercase font-black text-gray-700 dark:text-gray-300 tracking-wider block">USDT TRC-20 Address</span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[9px] text-[var(--text-primary)] select-all truncate block flex-1 bg-[var(--bg-secondary)] p-1 border border-[var(--border-main)] py-1 shadow-inner rounded-[3px]">
                                {economySettings?.crypto_address || 'No Address available'}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  if (economySettings?.crypto_address) {
                                    navigator.clipboard.writeText(economySettings.crypto_address);
                                    toast.success(dir === 'rtl' ? 'تم نسخ العنوان بنجاح!' : 'USDT TRC-20 Address Copied!');
                                  }
                                }}
                                className="px-2 py-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-[3px] text-[9px] font-black cursor-pointer transition-all duration-300 border border-gray-300 dark:border-gray-600"
                              >
                                {dir === 'rtl' ? 'نسخ' : 'Copy'}
                              </button>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tight block">
                              {dir === 'rtl' ? 'الرقم المرجعي أو هاش العملية *' : 'Transaction Hash / TxID *'}
                            </label>
                            <input
                              type="text"
                              required
                              value={activationRefId}
                              onChange={(e) => setActivationRefId(e.target.value)}
                              placeholder="e.g. 0x82c1f301ae9f..."
                              className="w-full px-2.5 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border-main)] rounded-[4px] text-[10px] font-bold font-mono focus:outline-none focus:border-gray-400 dark:focus:border-gray-600 transition-all duration-300 text-[var(--text-primary)]"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tight block">
                              {dir === 'rtl' ? 'صورة إثبات التحويل (اختياري)' : 'Proof Screenshot / Image (Optional)'}
                            </label>
                            <input
                              type="file"
                              accept="image/*"
                              ref={activationFileInputRef}
                              onChange={(e) => {
                                const file = e.target.files?.[0] || null;
                                setActivationProofFile(file);
                              }}
                              className="hidden"
                            />
                            <div
                              onClick={() => activationFileInputRef.current?.click()}
                              className="border border-dashed border-[var(--border-main)] hover:border-gray-400 dark:hover:border-gray-500 p-2 py-3 rounded-[4px] flex flex-col items-center justify-center gap-1 bg-[var(--bg-secondary)] cursor-pointer text-center text-[9px] text-gray-500 dark:text-gray-400 group hover:text-gray-900 dark:hover:text-white transition-all duration-300"
                            >
                              <Camera size={14} className="text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-all duration-300" />
                              <span className="font-semibold select-none">
                                {activationProofFile ? activationProofFile.name : (dir === 'rtl' ? 'انقر لاختيار لقطة شاشة إثبات الدفع' : 'Click to select transaction screenshot')}
                              </span>
                            </div>
                          </div>

                          <button
                            type="submit"
                            disabled={isActivating}
                            className="w-full py-2 bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 font-extrabold text-[10px] uppercase tracking-wider rounded-[4px] flex items-center justify-center gap-1.5 transition-all duration-300 cursor-pointer group"
                          >
                            {isActivating ? (
                              <span className="flex items-center gap-1.5 text-[9px]">
                                <RefreshCw size={11} className="animate-spin text-emerald-500" />
                                {activationStep === 1 ? (dir === 'rtl' ? 'جاري رفع الملف...' : 'Uploading proof...') : (dir === 'rtl' ? 'جاري التقييد والمزامنة...' : 'Validating request...')}
                              </span>
                            ) : (
                              <>
                                <Send size={11} className="text-emerald-500" />
                                <span>{dir === 'rtl' ? 'إرسال الإثبات وتفعيل الحساب' : 'Submit Proof & Request Activation'}</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}

                      {/* Manual PayPal Channel */}
                      {activationMethod === 'paypal' && (
                        <div className="space-y-3.5 text-left">
                          <div className="p-2 border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800/40 rounded-[4px] space-y-1.5">
                            <span className="text-[9px] uppercase font-black text-gray-700 dark:text-gray-300 tracking-wider block">PayPal Recipient Email</span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[9px] text-[var(--text-primary)] select-all truncate block flex-1 bg-[var(--bg-secondary)] p-1 border border-[var(--border-main)] py-1 shadow-inner rounded-[3px]">
                                {economySettings?.paypal_email || 'No email configured'}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  if (economySettings?.paypal_email) {
                                    navigator.clipboard.writeText(economySettings.paypal_email);
                                    toast.success(dir === 'rtl' ? 'تم نسخ ايميل بايبال!' : 'PayPal Email Copied!');
                                  }
                                }}
                                className="px-2 py-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-[3px] text-[9px] font-black cursor-pointer transition-all duration-300 border border-gray-300 dark:border-gray-600"
                              >
                                {dir === 'rtl' ? 'نسخ' : 'Copy'}
                              </button>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tight block">
                              {dir === 'rtl' ? 'الرقم المرجعي أو بريد الدافع *' : 'Transaction Reference / Email *'}
                            </label>
                            <input
                              type="text"
                              required
                              value={activationRefId}
                              onChange={(e) => setActivationRefId(e.target.value)}
                              placeholder="e.g. PP-581023 or sender@example.com"
                              className="w-full px-2.5 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border-main)] rounded-[4px] text-[10px] font-bold font-mono focus:outline-none focus:border-gray-400 dark:focus:border-gray-600 transition-all duration-300 text-[var(--text-primary)]"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tight block">
                              {dir === 'rtl' ? 'لقطة شاشة تثبت الدفع والخصم (اختياري)' : 'Proof Screenshot / Image (Optional)'}
                            </label>
                            <input
                              type="file"
                              accept="image/*"
                              ref={activationFileInputRef}
                              onChange={(e) => {
                                const file = e.target.files?.[0] || null;
                                setActivationProofFile(file);
                              }}
                              className="hidden"
                            />
                            <div
                              onClick={() => activationFileInputRef.current?.click()}
                              className="border border-dashed border-[var(--border-main)] hover:border-gray-400 dark:hover:border-gray-500 p-2 py-3 rounded-[4px] flex flex-col items-center justify-center gap-1 bg-[var(--bg-secondary)] cursor-pointer text-center text-[9px] text-gray-500 dark:text-gray-400 group hover:text-gray-900 dark:hover:text-white transition-all duration-300"
                            >
                              <Camera size={14} className="text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-all duration-300" />
                              <span className="font-semibold select-none">
                                {activationProofFile ? activationProofFile.name : (dir === 'rtl' ? 'انقر لاختيار صورة إثبات بايبال' : 'Click to select PayPal screenshot')}
                              </span>
                            </div>
                          </div>

                          <button
                            type="submit"
                            disabled={isActivating}
                            className="w-full py-2 bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 font-extrabold text-[10px] uppercase tracking-wider rounded-[4px] flex items-center justify-center gap-1.5 transition-all duration-300 cursor-pointer group"
                          >
                            {isActivating ? (
                              <span className="flex items-center gap-1.5 text-[9px]">
                                <RefreshCw size={11} className="animate-spin text-emerald-500" />
                                {activationStep === 1 ? (dir === 'rtl' ? 'جاري رفع الملف...' : 'Uploading proof...') : (dir === 'rtl' ? 'جاري التقييد والمزامنة...' : 'Validating request...')}
                              </span>
                            ) : (
                              <>
                                <Send size={11} className="text-emerald-500" />
                                <span>{dir === 'rtl' ? 'إرسال الإثبات وتفعيل الحساب' : 'Submit Proof & Request Activation'}</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}

                      {/* Manual Bank Transfer Channel */}
                      {activationMethod === 'bank' && (
                        <div className="space-y-3 text-left">
                          <div className="p-2 border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800/40 rounded-[4px] space-y-2 text-[9px] font-bold">
                            <span className="text-[9px] uppercase font-black text-gray-700 dark:text-gray-300 tracking-wider block">Official Bank Details</span>
                            <div className="grid grid-cols-2 gap-2 text-[9px]">
                              <div>
                                <span className="text-gray-500 dark:text-gray-400 block">Bank Name:</span>
                                <span className="text-[var(--text-primary)] block font-black truncate">{economySettings?.bank_name || 'Bank'}</span>
                              </div>
                              <div>
                                <span className="text-gray-500 dark:text-gray-400 block">Recipient / Name:</span>
                                <span className="text-[var(--text-primary)] block font-black truncate">{economySettings?.bank_recipient || 'Perplexta Tech'}</span>
                              </div>
                              <div className="col-span-2">
                                <span className="text-gray-500 dark:text-gray-400 block">IBAN Number:</span>
                                <span className="text-[var(--text-primary)] font-mono block font-black select-all whitespace-normal bg-[var(--bg-secondary)] p-1 border border-[var(--border-main)] mb-1 rounded-[3px]">{economySettings?.bank_iban || 'SA0380000000000'}</span>
                              </div>
                              {economySettings?.bank_swift && (
                                <div className="col-span-2">
                                  <span className="text-gray-500 dark:text-gray-400 block">Bank SWIFT / BIC:</span>
                                  <span className="text-[var(--text-primary)] font-mono block font-black select-all bg-[var(--bg-secondary)] p-1 border border-[var(--border-main)] rounded-[3px]">{economySettings.bank_swift}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tight block">
                              {dir === 'rtl' ? 'اسم المحول أو الرقم المرجعي *' : 'Sender Name / Transaction ID *'}
                            </label>
                            <input
                              type="text"
                              required
                              value={activationRefId}
                              onChange={(e) => setActivationRefId(e.target.value)}
                              placeholder={dir === 'rtl' ? 'مثل: محمد أحمد أحمد / كود 58210' : 'e.g. John Doe / Ref ID 9821a'}
                              className="w-full px-2.5 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border-main)] rounded-[4px] text-[10px] font-bold focus:outline-none focus:border-gray-400 dark:focus:border-gray-600 transition-all duration-300 text-[var(--text-primary)]"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tight block">
                              {dir === 'rtl' ? 'صورة إيصال التحويل البنكي (اختياري)' : 'Bank Receipt Image / Copy (Optional)'}
                            </label>
                            <input
                              type="file"
                              accept="image/*"
                              ref={activationFileInputRef}
                              onChange={(e) => {
                                const file = e.target.files?.[0] || null;
                                setActivationProofFile(file);
                              }}
                              className="hidden"
                            />
                            <div
                              onClick={() => activationFileInputRef.current?.click()}
                              className="border border-dashed border-[var(--border-main)] hover:border-gray-400 dark:hover:border-gray-500 p-2 py-3 rounded-[4px] flex flex-col items-center justify-center gap-1 bg-[var(--bg-secondary)] cursor-pointer text-center text-[9px] text-gray-500 dark:text-gray-400 group hover:text-gray-900 dark:hover:text-white transition-all duration-300"
                            >
                              <Camera size={14} className="text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-all duration-300" />
                              <span className="font-semibold select-none">
                                {activationProofFile ? activationProofFile.name : (dir === 'rtl' ? 'انقر لاختيار صورة إيصال البنك' : 'Click to select transaction statement receipt')}
                              </span>
                            </div>
                          </div>

                          <button
                            type="submit"
                            disabled={isActivating}
                            className="w-full py-2 bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 font-extrabold text-[10px] uppercase tracking-wider rounded-[4px] flex items-center justify-center gap-1.5 transition-all duration-300 cursor-pointer group"
                          >
                            {isActivating ? (
                              <span className="flex items-center gap-1.5 text-[9px]">
                                <RefreshCw size={11} className="animate-spin text-emerald-500" />
                                {activationStep === 1 ? (dir === 'rtl' ? 'جاري رفع الملف...' : 'Uploading proof...') : (dir === 'rtl' ? 'جاري التقييد والمزامنة...' : 'Validating request...')}
                              </span>
                            ) : (
                              <>
                                <Send size={11} className="text-emerald-500" />
                                <span>{dir === 'rtl' ? 'إرسال الإثبات وتفعيل الحساب' : 'Submit Proof & Request Activation'}</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </form>
                )}
              </div>
            ) : (
              <div className="space-y-1.5 md:space-y-2">
                <label className="text-xs md:text-sm text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest">{t('yourReferralLink')}</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 p-2.5 md:p-3 rounded-[4px] border bg-[var(--bg-primary)] border-[var(--border-main)] text-gray-900 dark:text-white font-mono text-[11px] md:text-xs overflow-hidden text-ellipsis whitespace-nowrap shadow-inner">
                    {referralLink}
                  </div>
                  <button 
                    onClick={handleCopy}
                    className={`flex items-center justify-center gap-2 px-3 md:px-4 py-2.5 md:py-3 rounded-[4px] border transition-all duration-300 cursor-pointer ${
                      copied 
                        ? 'bg-gray-900 dark:bg-white border-gray-800 dark:border-gray-200 text-white dark:text-gray-900 font-bold' 
                        : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white font-extrabold'
                    }`}
                  >
                    {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} className="text-emerald-500" />}
                    <span className="hidden sm:inline text-xs md:text-sm font-bold">{copied ? t('copied') : t('copy')}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Email Invitation Form - Integrated with Status Check */}
            {wallet?.referral_activated && (
              <div className="pt-6 border-t border-[var(--border-main)] space-y-4">
                <div className="space-y-1.5" style={{ textAlign: dir === 'rtl' ? 'right' : 'left' }}>
                  <label className={`text-xs md:text-sm text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest flex items-center gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                    <Mail size={14} className="text-emerald-500" />
                    <span>{dir === 'rtl' ? 'دعوة صديق عبر البريد الإلكتروني' : 'Invite Friend via Email'}</span>
                  </label>
                  <p className="text-[10px] md:text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                    {dir === 'rtl'
                      ? 'أدخل البريد الإلكتروني لصديقك لإرسال دعوة انضمام مهنية مشفرة وموثقة برمز الإحالة الخاص بك تلقائياً.'
                      : "Send a professional, cryptographically certified invitation directly to your peer's inbox with your referral credentials."}
                  </p>
                </div>

                <form onSubmit={handleSendInvitation} className="flex gap-2">
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder={dir === 'rtl' ? 'البريد الإلكتروني للزميل (مثال: peer@example.com)' : 'Peer email address (e.g., peer@example.com)'}
                    className="flex-1 px-3 md:px-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-main)] rounded-[4px] text-xs md:text-sm focus:outline-none focus:border-gray-400 dark:focus:border-gray-600 font-sans text-[var(--text-primary)] transition-all duration-300"
                    disabled={isInviting}
                  />
                  <button
                    type="submit"
                    disabled={isInviting}
                    className={`flex items-center justify-center gap-2 px-4 md:px-5 py-2 rounded-[4px] bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 font-bold text-xs md:text-sm shadow-md transition-all duration-300 cursor-pointer ${
                      isInviting ? 'opacity-60 cursor-not-allowed' : ''
                    }`}
                  >
                    {isInviting ? (
                      <RefreshCw size={14} className="animate-spin text-emerald-500" />
                    ) : (
                      <Send size={14} className="text-emerald-500" />
                    )}
                    <span>{isInviting ? (dir === 'rtl' ? 'جاري الإرسال...' : 'Sending...') : (dir === 'rtl' ? 'إرسال الدعوة' : 'Send Invite')}</span>
                  </button>
                </form>

                {/* Sent Invitations Ledger Log */}
                {sentInvitations.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] block" style={{ textAlign: dir === 'rtl' ? 'right' : 'left' }}>
                      {dir === 'rtl' ? 'سجل الدعوات المرسلة' : 'Sent Invitations Ledger'}
                    </span>
                    <div className="max-h-32 overflow-y-auto space-y-1.5 scrollbar-thin border border-[var(--border-main)] rounded-[4px] bg-[var(--bg-primary)]/40 p-2 md:p-3">
                      {sentInvitations.map((inv: any) => (
                        <div key={inv.id} className="flex items-center justify-between text-[11px] py-1 border-b border-[var(--border-main)]/40 last:border-0" style={{ direction: dir === 'rtl' ? 'rtl' : 'ltr' }}>
                          <span className="font-mono text-gray-600 dark:text-gray-300 font-bold">{inv.email}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-[var(--text-muted)] font-medium">
                              {new Date(inv.created_at).toLocaleDateString(dir === 'rtl' ? 'ar-EG' : 'en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </span>
                            <span className="px-1.5 py-0.5 rounded-sm text-[9px] font-black uppercase bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                              {inv.status === 'reminded' ? (dir === 'rtl' ? 'تم التذكير' : 'Reminded') : (dir === 'rtl' ? 'تم الإرسال' : 'Sent')}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemindInvitation(inv.email)}
                              disabled={remindingEmails[inv.email]}
                              className="px-2 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-[10px] font-bold rounded-[4px] transition-all duration-300 cursor-pointer flex items-center gap-1"
                            >
                              {remindingEmails[inv.email] ? (
                                <RefreshCw size={10} className="animate-spin text-emerald-500" />
                              ) : (
                                <Zap size={10} className="text-emerald-500" />
                              )}
                              <span>{dir === 'rtl' ? 'تذكير' : 'Remind'}</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="group flex items-center justify-between p-4 md:p-6 rounded-[var(--radius)] border bg-[var(--bg-primary)] border-[var(--border-main)] hover:border-gray-300 dark:hover:border-gray-700 transition-all duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-[4px] bg-gray-100 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-300 transition-all duration-300">
                  <Gift size={20} className="md:w-6 md:h-6 group-hover:scale-110 transition-transform duration-300 text-emerald-500" />
                </div>
                <span className="font-black text-xs md:text-base text-gray-900 dark:text-white uppercase tracking-tight">
                  {t('totalSuccessfulReferralsUser')}
                </span>
              </div>
              <span className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white">
                {referralCount}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Referred Friends & Deposit Verification History List */}
      <div className="rounded-[var(--radius)] p-5 md:p-8 border bg-[var(--bg-secondary)] border-[var(--border-main)] flex flex-col transition-theme hover:border-gray-300 dark:hover:border-gray-700">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 border-b border-[var(--border-main)] pb-6">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Users size={20} className="text-emerald-500" />
              <span>{dir === 'rtl' ? 'سجل الأصدقاء والعمولات' : 'Invited Friends & Verification Status'}</span>
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium select-none">
              {dir === 'rtl' 
                ? 'تتبع الأصدقاء المسجلين، وثائق الإثبات وعمليات المراجعة الخاصة بمدفوعاتهم.' 
                : 'Track your invited friends, their manual deposit receipts, and verification cycles.'}
            </p>
          </div>
          
          {/* Filters & Sorting */}
          <div className="flex flex-wrap items-center gap-3 self-start sm:self-center">
            {/* Filters */}
            <div className="flex flex-wrap gap-1 bg-[var(--bg-primary)] p-1 rounded-[4px] border border-[var(--border-main)]">
              {(['all', 'verified', 'pending', 'nodeposityet'] as const).map((filterOpt) => {
                const label = {
                  all: dir === 'rtl' ? 'الكل' : 'All',
                  verified: dir === 'rtl' ? 'مكتمل ومفعل' : 'Verified',
                  pending: dir === 'rtl' ? 'قيد المراجعة' : 'Reviewing',
                  nodeposityet: dir === 'rtl' ? 'بانتظار الإيداع' : 'Awaiting Dep.'
                }[filterOpt];
                
                return (
                  <button
                    key={filterOpt}
                    type="button"
                    onClick={() => setFriendsFilter(filterOpt)}
                    className={`px-3 py-1.5 rounded-[4px] text-[10px] font-black uppercase text-center transition-all duration-300 cursor-pointer ${
                      friendsFilter === filterOpt
                        ? 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-700 font-extrabold'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-transparent'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Sorting Dropdown */}
            <div className="flex items-center gap-1.5 bg-[var(--bg-primary)] px-2 py-1.5 rounded-sm border border-[var(--border-main)] text-xs font-bold text-[var(--text-secondary)]">
              <span className="text-[10px] uppercase font-black tracking-wider select-none">
                {dir === 'rtl' ? 'ترتيب:' : 'Sort:'}
              </span>
              <select
                value={friendsSort}
                onChange={(e) => setFriendsSort(e.target.value as 'joined_at' | 'deposit_amount')}
                className="bg-transparent border-none outline-none text-[var(--text-primary)] font-black text-[10px] uppercase cursor-pointer py-0.5"
              >
                <option value="joined_at" className="bg-[var(--bg-secondary)] text-[var(--text-primary)] font-bold">
                  {dir === 'rtl' ? 'التاريخ' : 'Date'}
                </option>
                <option value="deposit_amount" className="bg-[var(--bg-secondary)] text-[var(--text-primary)] font-bold">
                  {dir === 'rtl' ? 'مبلغ الإيداع' : 'Deposit Amount'}
                </option>
              </select>
            </div>
          </div>
        </div>

        {/* Loading Spinner */}
        {isLoadingReferredFriends ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-[var(--text-secondary)]">
            <RefreshCw className="animate-spin text-emerald-500" size={24} />
            <span className="text-xs font-bold uppercase tracking-wider">
              {dir === 'rtl' ? 'جاري تحميل سجل الأرباح...' : 'Loading referral ledger...'}
            </span>
          </div>
        ) : (() => {
          // Filter calculation
          const filtered = referredFriends.filter((f) => {
            if (friendsFilter === 'verified') return f.referral_status === 'active';
            if (friendsFilter === 'pending') return f.referral_status === 'pending' && f.deposit_status === 'pending';
            if (friendsFilter === 'nodeposityet') return f.referral_status === 'pending' && (f.deposit_status === null || f.deposit_status === 'rejected');
            return true;
          });

          if (filtered.length === 0) {
            return (
              <div className="py-12 text-center rounded-[var(--radius)] border border-dashed border-[var(--border-main)] bg-[var(--bg-primary)]/40">
                <Users className="mx-auto text-[var(--text-muted)] opacity-30 mb-3" size={32} />
                <h4 className="text-sm font-bold text-[var(--text-primary)]">
                  {dir === 'rtl' ? 'لا توجد نتائج مطابقة لتصفيتك' : 'No Friends Fit This Filter'}
                </h4>
                <p className="text-[11px] text-[var(--text-secondary)] mt-1 max-w-xs mx-auto">
                  {dir === 'rtl' 
                    ? 'الأصدقاء المسجلين برابط إحالتك سيظهرون هنا لتتبع الإيداع وتأكيد نقاط العمليات.' 
                    : 'Invitees will represent dynamic ledger lines here to monitor deposit checks and verified reward claims.'}
                </p>
              </div>
            );
          }

          const sortedAndFiltered = [...filtered].sort((a, b) => {
            if (friendsSort === 'joined_at') {
              const dateA = a.joined_at ? new Date(a.joined_at).getTime() : 0;
              const dateB = b.joined_at ? new Date(b.joined_at).getTime() : 0;
              return dateB - dateA;
            } else if (friendsSort === 'deposit_amount') {
              const amountA = Number(a.deposit_amount || 0);
              const amountB = Number(b.deposit_amount || 0);
              return amountB - amountA;
            }
            return 0;
          });

          return (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border-main)] text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-extrabold select-none">
                    <th className={`pb-3 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
                      {dir === 'rtl' ? 'المستخدم' : 'User'}
                    </th>
                    <th className={`pb-3 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
                      {dir === 'rtl' ? 'تاريخ التسجيل' : 'Registration Date'}
                    </th>
                    <th className={`pb-3 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
                      {dir === 'rtl' ? 'التحقق من الإيداع' : 'Deposit Verification'}
                    </th>
                    <th className={`pb-3 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
                      {dir === 'rtl' ? 'حالة العمولة' : 'Commissions / Balance'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-main)]/50">
                  {sortedAndFiltered.map((friend) => {
                    // Decide deposit badge styling
                    let depBadgeProps = {
                      bg: 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300',
                      label: dir === 'rtl' ? 'بانتظار الإيداع' : 'Pending First Deposit'
                    };
                    if (friend.referral_status === 'active') {
                      depBadgeProps = {
                        bg: 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300',
                        label: dir === 'rtl' ? 'مقبول وتم التأكيد' : 'Approved & Verified'
                      };
                    } else if (friend.deposit_status === 'pending') {
                      depBadgeProps = {
                        bg: 'bg-amber-500/10 border-amber-500/20 text-amber-500 animate-pulse',
                        label: dir === 'rtl' ? 'قيد المراجعة اليدوية' : 'Under Review'
                      };
                    } else if (friend.deposit_status === 'rejected') {
                      depBadgeProps = {
                        bg: 'bg-red-500/10 border-red-500/20 text-red-500',
                        label: dir === 'rtl' ? 'مرفوض إدارياً' : 'Rejected Proof'
                      };
                    }

                    // Decide referral reward / status props
                    let refStatusProps = {
                      bg: 'bg-amber-500/10 text-amber-500 border border-amber-500/20',
                      label: dir === 'rtl' ? 'قيد الانتظار' : 'Pending Activation'
                    };
                    if (friend.referral_status === 'active') {
                      refStatusProps = {
                        bg: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700',
                        label: dir === 'rtl' ? 'مكافأة مكتسبة' : 'Earned & Counted'
                      };
                    } else {
                      refStatusProps = {
                        bg: 'bg-gray-100 dark:bg-gray-800 text-gray-500 border border-gray-200 dark:border-gray-700',
                        label: dir === 'rtl' ? 'غير مسدد' : 'Inactive Account'
                      };
                    }

                    return (
                      <tr key={friend.referral_id} className="hover:bg-[var(--bg-primary)]/40 transition-theme">
                        <td className="py-4 pr-3">
                          <div className={`flex items-center gap-3 ${dir === 'rtl' ? 'flex-row-reverse text-right' : 'flex-row text-left'}`}>
                            <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 flex items-center justify-center font-bold text-xs uppercase border border-gray-200 dark:border-gray-700 select-none">
                              {friend.name ? friend.name.charAt(0) : 'U'}
                            </div>
                            <div>
                              <div className="font-bold text-[var(--text-primary)] text-sm">{friend.name}</div>
                              <div className="text-[10px] text-[var(--text-muted)] font-mono">{friend.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className={`py-4 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
                          <span className="block font-semibold text-[var(--text-primary)]">
                            {new Date(friend.joined_at).toLocaleDateString(dir === 'rtl' ? 'ar-EG' : 'en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </span>
                          <span className="text-[9px] text-[var(--text-muted)] font-mono block mt-0.5">
                            {new Date(friend.joined_at).toLocaleTimeString(dir === 'rtl' ? 'ar-EG' : 'en-US', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </td>
                        <td className={`py-4 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
                          <div className="inline-flex flex-col">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-[3px] text-[9px] font-black border uppercase tracking-wider ${depBadgeProps.bg}`}>
                              {depBadgeProps.label}
                            </span>
                            {friend.deposit_rejection_reason && friend.deposit_status === 'rejected' && (
                              <span className="text-[8px] text-red-400 mt-1 max-w-[150px] break-words">
                                {dir === 'rtl' ? 'السبب: ' : 'Reason: '}{friend.deposit_rejection_reason}
                              </span>
                            )}
                            {friend.deposit_status === 'pending' && friend.deposit_method && (
                              <span className="text-[8px] text-[var(--text-muted)] mt-1 uppercase font-mono">
                                {friend.deposit_method} • ${Number(friend.deposit_amount).toFixed(2)}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className={`py-4 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-sm text-[9px] font-bold uppercase tracking-wider ${refStatusProps.bg}`}>
                                {refStatusProps.label}
                              </span>
                              {friend.referral_status === 'pending' && (
                                <button
                                  onClick={() => handleRemindInvitation(friend.email)}
                                  disabled={remindingEmails[friend.email]}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[9px] font-black uppercase bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 transition-theme cursor-pointer"
                                >
                                  {remindingEmails[friend.email] ? (
                                    <RefreshCw size={10} className="animate-spin text-emerald-500" />
                                  ) : (
                                    <Zap size={10} className="text-emerald-500" />
                                  )}
                                  <span>{dir === 'rtl' ? 'تذكير' : 'Remind'}</span>
                                </button>
                              )}
                            </div>
                            {friend.referral_status === 'active' && (
                              <span className="block text-[10px] text-emerald-500 font-extrabold tracking-tight">
                                +{Number(friend.bonus_points || 0).toLocaleString()} PTS
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })()}
      </div>

      {/* KYC Verification Card */}
      {contextUser?.kyc_required && contextUser?.kyc_status !== 'verified' && (
        <div className={`rounded-[var(--radius)] p-5 md:p-8 border transition-theme bg-[var(--bg-secondary)] border-[var(--border-main)] col-span-1 md:col-span-2 shadow-sm ${
          contextUser?.kyc_status === 'pending' ? 'bg-gray-100/50 dark:bg-gray-800/30 border-gray-300 dark:border-gray-700' : 
          contextUser?.kyc_status === 'rejected' ? 'bg-red-500/5 border-red-500/20 shadow-red-500/5' : ''
        }`}>
          
          {contextUser?.kyc_status === 'pending' ? (
            <div className="flex flex-col items-center text-center py-6 md:py-10 space-y-4 md:space-y-6">
              <div className="relative">
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-[var(--radius)] bg-gray-100 dark:bg-gray-800 flex items-center justify-center border border-gray-200 dark:border-gray-700">
                  <ShieldCheck size={40} className="md:w-[48px] md:h-[48px] text-emerald-500" />
                </div>
                <div className="absolute -bottom-1.5 -right-1.5 w-8 h-8 md:w-10 md:h-10 rounded-[var(--radius)] bg-[var(--bg-surface)] border-[3px] md:border-4 border-[var(--bg-base)] flex items-center justify-center">
                  <Clock size={16} className="text-amber-500" />
                </div>
              </div>

              <div className="space-y-2 md:space-y-3 max-w-2xl px-2">
                <h3 className="text-lg md:text-2xl font-bold text-[var(--text-primary)]">
                  {dir === 'rtl' ? 'تم إرسال طلبك للمراجعة بنجاح' : 'Your request has been sent for review successfully'}
                </h3>
                <p className="text-[11px] md:text-base text-[var(--text-secondary)] leading-relaxed md:leading-relaxed">
                  {dir === 'rtl' 
                    ? 'نشكرك على تعاونك. يقوم فريقنا حالياً بمراجعة بياناتك يدوياً لضمان أعلى مستويات الأمان. سيتم تحديث حالتك تلقائياً فور الانتهاء.' 
                    : 'Thank you for your cooperation. Our team is currently reviewing your data manually to ensure the highest security standards. Your status will be updated automatically once complete.'}
                </p>
              </div>

              <div className={`mt-4 md:mt-8 p-4 md:p-6 rounded-[var(--radius)] border flex flex-col md:flex-row items-center gap-4 md:gap-6 max-w-3xl bg-[var(--bg-primary)]/50 border-[var(--border-main)]`}>
                <div className="flex-shrink-0 p-3 md:p-4 rounded-[var(--radius)] bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                  <Lock size={20} className="md:w-6 md:h-6" />
                </div>
                <div className={`text-[10px] md:text-sm leading-relaxed ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
                  <p className="font-bold text-[var(--text-primary)] mb-1.5 md:mb-2 text-xs md:text-sm">
                    {dir === 'rtl' ? 'التزامنا بالخصوصية والأمان (UK GDPR)' : 'Our Commitment to Privacy & Security (UK GDPR)'}
                  </p>
                  <p className="text-[var(--text-secondary)] opacity-80">
                    {dir === 'rtl'
                      ? 'نحن نلتزم بصرامة بقوانين حماية البيانات في المملكة المتحدة (UK GDPR). نؤكد لك أن صورك لا يتم تخزينها بشكل دائم على خوادمنا؛ حيث يتم تشفيرها بالكامل (End-to-End Encryption) وإرسالها مباشرة إلى الإدارة للتحقق اليدوي فقط، ثم تُحذف فوراً من الذاكرة المؤقتة لضمان خصوصيتك التامة.'
                      : 'We strictly adhere to UK Data Protection laws (UK GDPR). We assure you that your images are not stored permanently on our servers; they are fully encrypted (End-to-End Encryption) and sent directly to administration for manual verification only, then immediately deleted from temporary memory to ensure your total privacy.'}
                  </p>
                </div>
              </div>
            </div>
          ) : contextUser?.kyc_status === 'rejected' ? (
            <div className="flex flex-col items-center text-center py-6 md:py-10 space-y-4 md:space-y-6">
              <div className="relative">
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-[var(--radius)] bg-red-500/10 flex items-center justify-center">
                  <XCircle size={40} className="md:w-[48px] md:h-[48px] text-red-500" />
                </div>
              </div>

              <div className="space-y-2 md:space-y-3 max-w-2xl px-2">
                <h3 className="text-lg md:text-2xl font-bold text-[var(--text-primary)]">
                  {dir === 'rtl' ? 'تم رفض طلب التحقق' : 'Verification Request Rejected'}
                </h3>
                {contextUser?.kyc_rejection_reason && (
                  <div className={`p-4 rounded-[var(--radius)] border bg-red-500/5 border-red-500/20 text-red-500 text-sm md:text-base font-medium`}>
                    <p className="text-[10px] uppercase tracking-widest text-red-400 mb-1 font-black">
                      {t('kycRejectionReason')}
                    </p>
                    {contextUser.kyc_rejection_reason}
                  </div>
                )}
                <p className="text-[11px] md:text-base text-[var(--text-secondary)] leading-relaxed md:leading-relaxed">
                  {dir === 'rtl' 
                    ? 'نأسف لإبلاغك بأنه لم يتم قبول طلب التحقق الخاص بك. يرجى مراجعة سبب الرفض أعلاه وإعادة المحاولة ببيانات صحيحة ووثائق واضحة.' 
                    : 'We regret to inform you that your verification request was not accepted. Please review the rejection reason above and try again with correct data and clear documents.'}
                </p>
                <button 
                  onClick={() => {
                    setUser({ ...contextUser, kyc_status: 'none' });
                    setSelfieCaptured(false);
                    setSelfieData(null);
                    setKycFullName('');
                  }}
                  className="mt-4 px-8 py-3 rounded-[var(--radius)] bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 font-bold text-sm md:text-base transition-all duration-300 shadow-md flex items-center gap-2 mx-auto cursor-pointer"
                >
                  <RefreshCw size={18} className="text-emerald-500" />
                  {dir === 'rtl' ? 'إعادة المحاولة' : 'Try Again'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row gap-6 md:gap-8">
              {/* Left Side: Info */}
              <div className="flex-1 space-y-4 md:space-y-6">
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-[var(--radius)] bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <ShieldCheck size={20} className="md:w-6 md:h-6 text-emerald-500" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2 md:gap-3">
                      <h3 className="text-lg md:text-xl font-bold text-[var(--text-primary)]">
                        {t('kycVerification')}
                      </h3>
                      <span className={`px-2 py-0.5 rounded-[calc(var(--radius)/2)] text-[9px] md:text-xs font-bold border bg-[var(--bg-primary)]/50 border-[var(--border-main)] text-[var(--text-secondary)]`}>
                        {t('kycThresholdNote')}
                      </span>
                    </div>
                  </div>
                </div>
                
                <p className="text-[11px] md:text-base text-[var(--text-secondary)] leading-relaxed">
                  {t('kycDescription')}
                </p>

                <div className={`p-4 rounded-[var(--radius)] border flex items-start gap-3 ${
                  theme === 'dark' ? 'bg-gray-800/40 border-gray-700' : 'bg-gray-100 border-gray-200'
                }`}>
                  <Lock className="text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0" size={16} />
                  <p className="text-[10px] md:text-sm text-gray-600 dark:text-gray-300 leading-relaxed font-medium">
                    {t('selfieSecurityNote')}
                  </p>
                </div>
              </div>

              {/* Right Side: Form */}
              <div className="flex-1 space-y-4 md:space-y-6">
                {/* Full Name Input */}
                <div className="space-y-1.5 md:space-y-2">
                  <label className="block text-xs md:text-sm font-medium text-[var(--text-secondary)]">
                    {t('fullNameAsPerIdUser')}
                  </label>
                  <div className={`relative flex items-center rounded-[var(--radius)] border transition-theme bg-[var(--bg-input)] border-[var(--border)] focus-within:border-gray-400 dark:focus-within:border-gray-600`}>
                    <input 
                      type="text"
                      value={kycFullName || ''}
                      onChange={(e) => setKycFullName(e.target.value)}
                      className={`w-full bg-transparent px-4 py-3 md:px-6 md:py-4 text-xs md:text-sm font-medium text-[var(--text-primary)] focus:outline-none ${dir === 'rtl' ? 'text-right' : 'text-left'}`}
                      dir="auto"
                    />
                  </div>
                </div>

                {/* Selfie Button */}
                <div className="space-y-2">
                  {isCapturing && !selfieCaptured ? (
                    <div className="space-y-2">
                      <video ref={videoRef} className="w-full rounded-[var(--radius)] bg-black" autoPlay playsInline />
                      <button 
                        onClick={captureImage}
                        className="w-full py-2.5 md:py-3 rounded-[var(--radius)] bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 font-bold text-xs md:text-base cursor-pointer transition-all duration-300"
                      >
                        {t('capture')}
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={startCamera}
                      disabled={selfieCaptured}
                      className={`w-full flex items-center justify-center gap-2 md:gap-3 py-3 md:py-4 rounded-[var(--radius)] border-2 border-dashed transition-theme ${
                        selfieCaptured 
                          ? 'border-gray-800 dark:border-gray-200 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white cursor-default shadow-sm'
                          : `border-[var(--border)] hover:border-gray-400 dark:hover:border-gray-600 text-[var(--text-secondary)] hover:text-gray-900 dark:hover:text-white`
                      }`}
                    >
                      {selfieCaptured ? (
                        <>
                          <CheckCircle2 size={16} className="md:w-5 md:h-5 text-emerald-500" />
                          <span className="font-bold text-xs md:text-base">{t('selfieCaptured')}</span>
                        </>
                      ) : (
                        <>
                          <Camera size={16} className="md:w-5 md:h-5 text-gray-500 dark:text-gray-400" />
                          <span className="font-bold text-xs md:text-base">{t('takeSelfieWithId')}</span>
                        </>
                      )}
                    </button>
                  )}
                  <canvas ref={canvasRef} className="hidden" />
                </div>

                {/* Submit Button */}
                <button 
                  onClick={handleSubmitKYC}
                  disabled={!kycFullName.trim() || !selfieCaptured || isSubmitting}
                  className={`w-full flex items-center justify-center gap-2 py-3 md:py-4 rounded-[4px] font-bold text-xs md:text-base transition-all duration-300 cursor-pointer ${
                    !kycFullName.trim() || !selfieCaptured || isSubmitting
                      ? 'opacity-50 cursor-not-allowed bg-gray-200 dark:bg-gray-800 text-gray-400'
                      : 'bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 shadow-md'
                  }`}
                >
                  {isSubmitting ? (
                    <RefreshCw className="animate-spin text-emerald-500" size={16} />
                  ) : (
                    <ShieldCheck size={16} className="text-emerald-500" />
                  )}
                  <span>
                    {isSubmitting 
                      ? (dir === 'rtl' ? 'جاري الإرسال...' : 'Sending...') 
                      : t('submitKyc')}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Transaction History Footer */}
      <div className="pt-4 md:pt-8 space-y-6 md:space-y-12">
        
        {/* Transaction History */}
        <div className="md:col-span-2">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <div className="flex items-center gap-2">
              <History className="text-emerald-500 md:w-5 md:h-5" size={18} />
              <h3 className="text-base md:text-lg font-bold text-gray-900 dark:text-white">{t('transactionHistory')}</h3>
            </div>
            {transactions.length > 0 && (
              <button
                onClick={handleClearHistory}
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-500 text-xs font-bold transition-theme disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw size={12} className={isSubmitting ? "animate-spin" : ""} />
                {dir === 'rtl' ? 'مسح السجل' : 'Clear History'}
              </button>
            )}
          </div>
          
          <div className={`overflow-hidden rounded-[var(--radius)] border border-[var(--border-main)] bg-[var(--bg-secondary)]`}>
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-[10px] md:text-sm text-left rtl:text-right">
                <thead className={`text-[9px] md:text-xs uppercase bg-[var(--bg-primary)]/40 text-[var(--text-muted)]`}>
                  <tr>
                    <th scope="col" className="px-4 md:px-6 py-3 md:py-4 font-bold whitespace-nowrap">{t('type')}</th>
                    <th scope="col" className="px-4 md:px-6 py-3 md:py-4 font-bold whitespace-nowrap">{t('amount')}</th>
                    <th scope="col" className="px-4 md:px-6 py-3 md:py-4 font-bold whitespace-nowrap">{t('description')}</th>
                    <th scope="col" className="px-4 md:px-6 py-3 md:py-4 font-bold whitespace-nowrap">{t('date')}</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-[var(--text-muted)]">
                        {t('noTransactionsYet')}
                      </td>
                    </tr>
                  ) : (
                    <>
                      {transactions.map((tx) => {
                        const pts = Number(tx.points || 0);
                        const amt = Number(tx.amount || 0);
                        const hasPoints = pts !== 0;
                        const hasAmount = amt !== 0;

                        const badgeClass = getTxTypeBadgeClass(tx.transaction_type, pts, amt);
                        const label = getTxLabel(tx.transaction_type, dir === 'rtl');

                        return (
                          <tr key={tx.id} className="border-b border-[var(--border-main)] hover:bg-[var(--bg-primary)]/20 transition-colors">
                            <td className="px-6 py-4 font-medium text-[var(--text-primary)] whitespace-nowrap">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius)] text-xs font-semibold ${badgeClass}`}>
                                {label}
                              </span>
                            </td>
                            <td className="px-6 py-4 font-bold text-[var(--text-primary)] whitespace-nowrap">
                              {hasPoints ? (
                                <span className={pts > 0 ? 'text-gray-900 dark:text-white font-bold' : 'text-rose-500 font-bold'}>
                                  {pts > 0 ? '+' : ''}{pts.toLocaleString()} PTS
                                </span>
                              ) : hasAmount ? (
                                <span className={amt > 0 ? 'text-gray-900 dark:text-white font-bold' : 'text-rose-500 font-bold'}>
                                  {amt > 0 ? '+' : '-'}${Math.abs(amt).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              ) : (
                                <span className="text-gray-400 font-medium">0 PTS</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-[var(--text-secondary)] whitespace-nowrap">{getTranslatedDescription(tx.description, dir === 'rtl')}</td>
                             <td className="px-6 py-4 text-[var(--text-secondary)] whitespace-nowrap text-xs">
                              <span className="block font-semibold">
                                {new Date(tx.created_at).toLocaleDateString(dir === 'rtl' ? 'ar-EG' : 'en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </span>
                              <span className="text-[9px] text-[var(--text-muted)] font-mono block mt-0.5">
                                {new Date(tx.created_at).toLocaleTimeString(dir === 'rtl' ? 'ar-EG' : 'en-US', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  second: '2-digit'
                                })}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      {hasMoreTx && (
                        <tr>
                          <td colSpan={4} className="px-6 py-4 text-center">
                            <button 
                              onClick={() => setTxOffset(prev => prev + TX_LIMIT)}
                              className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-bold flex items-center gap-2 mx-auto transition-theme cursor-pointer"
                            >
                              <RefreshCw size={14} className={`text-emerald-500 ${isSubmitting ? "animate-spin" : ""}`} />
                              {t('loadMore')}
                            </button>
                          </td>
                        </tr>
                      )}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>


      {/* Convert Points Modal */}
      {isConvertModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsConvertModalOpen(false)}
          />
          
          {/* Modal Content */}
          <div 
            onTouchStart={swipeHandlers.onTouchStart}
            onTouchMove={swipeHandlers.onTouchMove}
            onTouchEnd={swipeHandlers.onTouchEnd}
            className={`relative w-full max-w-md rounded-[var(--radius)] p-6 md:p-8 shadow-2xl bg-[var(--bg-secondary)] border border-[var(--border-main)]`}
          >
            
            {/* Header */}
            <div className="flex items-center justify-center gap-2 md:gap-3 mb-6 md:mb-8">
              <Zap className="text-emerald-500 md:w-7 md:h-7" size={24} />
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                {t('convertPoints')}
              </h2>
            </div>

            {/* Input Area */}
            <div className="space-y-1.5 md:space-y-2 mb-5 md:mb-6">
              <label className="block text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400">
                {t('numberOfPoints')}
              </label>
              <div className={`relative flex items-center rounded-[4px] border transition-all duration-300 bg-[var(--bg-input)] border-[var(--border)] focus-within:border-gray-400 dark:focus-within:border-gray-600`}>
                <input 
                  type="text"
                  value={convertAmount || ''}
                  onChange={(e) => setConvertAmount(e.target.value)}
                  className={`w-full bg-transparent px-4 py-3 md:px-6 md:py-4 text-lg md:text-xl font-bold text-[var(--text-primary)] focus:outline-none ${dir === 'rtl' ? 'text-right' : 'text-left'}`}
                  dir="ltr"
                />
              </div>
              <p className="text-[11px] md:text-sm text-gray-500 dark:text-gray-400 mt-1.5 md:mt-2">
                {t('currentBalancePoints').replace('{points}', Math.floor(wallet.points || 0).toLocaleString())}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 md:gap-4 mt-6 md:mt-8">
              <button 
                onClick={() => setIsConvertModalOpen(false)}
                className="flex-1 py-3 md:py-4 rounded-[4px] font-bold text-sm md:text-base transition-all duration-300 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
              >
                {t('cancel')}
              </button>
              <button 
                onClick={handleConvertPoints}
                disabled={isSubmitting}
                className="flex-[2] py-3 md:py-4 rounded-[4px] font-bold text-sm md:text-base transition-all duration-300 bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 cursor-pointer disabled:opacity-50 shadow-md"
              >
                {isSubmitting ? <RefreshCw className="animate-spin text-emerald-500" size={16} /> : t('confirmConversion')}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Premium custom confirmation modal for clearing transaction history */}
      <AnimatePresence>
        {isClearHistoryConfirmOpen && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsClearHistoryConfirmOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className={`relative max-w-sm w-full p-6 rounded-xl border shadow-2xl transition-theme z-10 ${
                theme === 'dark' 
                  ? 'bg-[#161618] border-zinc-800 text-gray-100' 
                  : 'bg-white border-gray-150 text-gray-900'
              }`}
            >
              <h3 className="text-base font-bold tracking-tight font-sans text-start text-red-500 dark:text-red-400 flex items-center gap-2">
                <AlertTriangle size={18} className="text-red-500 animate-pulse" />
                <span>{dir === 'rtl' ? 'مسح سجل المعاملات؟' : 'Clear Transaction History?'}</span>
              </h3>
              
              <p className={`text-xs mt-2.5 font-sans leading-relaxed text-start ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                {dir === 'rtl' 
                  ? 'هل أنت متأكد من رغبتك في مسح سجل المعاملات بالكامل؟ سيتم إزالة كافة السجلات لضمان نظافة البيانات وعدم التضخم، ولا يمكن التراجع عن هذا الإتلاف.' 
                  : 'Are you sure you want to completely clear your entire transaction history? All records will be removed to ensure clean data and prevent bloat. This action is irreversible.'}
              </p>
              
              <div className={`flex justify-end gap-2.5 mt-6 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                <button
                  type="button"
                  onClick={() => setIsClearHistoryConfirmOpen(false)}
                  className={`px-4 py-2 text-xs font-semibold rounded-[4px] font-sans transition-theme ${
                    theme === 'dark' 
                      ? 'text-gray-400 hover:text-white hover:bg-[#252528]' 
                      : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
                  }`}
                >
                  {dir === 'rtl' ? 'إلغاء' : 'Cancel'}
                </button>
                
                <button
                  type="button"
                  onClick={handleClearHistoryConfirm}
                  className="px-4 py-2 text-xs font-bold bg-[#db6b7a] hover:bg-[#c95968] text-white rounded-[4px] font-sans transition-theme shadow-[0_0_12px_rgba(219,107,122,0.25)]"
                >
                  {dir === 'rtl' ? 'تطهير السجل ومسحه' : 'Wipe & Clear History'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </motion.div>
  );
};

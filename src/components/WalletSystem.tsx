import { safeStorageGet, safeStorageSet, safeStorageRemove } from "@/utils/safeStorage";
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wallet, TrendingUp, Users, ArrowUpCircle, 
  ArrowDownCircle, Settings, History, CreditCard,
  DollarSign, CheckCircle2, Clock, AlertCircle,
  Plus, Copy, ExternalLink, Check, ShieldCheck,
  Smartphone, Building, Mail, Globe, Save, Loader2,
  Lock, Send, Info, Paperclip, Trash2, Sparkles
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { toast } from 'sonner';

interface Transaction {
  id: number;
  amount: number;
  transaction_type: string;
  description: string;
  status: string;
  created_at: string;
}

interface WalletData {
  balance: number;
  points: number;
  referral_activated: boolean;
  crypto_address?: string;
  bank_name?: string;
  bank_recipient?: string;
  bank_iban?: string;
  bank_swift?: string;
  paypal_email?: string;
}

export const WalletSystem: React.FC<{ theme: string; dir: 'ltr' | 'rtl' }> = ({ theme, dir }) => {
  const navigate = useNavigate();
  const { t, token, refreshUser, siteSettings } = useAppContext() as any;
  const isStripeActive = !!(siteSettings?.stripe_active || siteSettings?.stripe_status === 'verified');
  const isPaypalActive = !!(siteSettings?.paypal_active || siteSettings?.paypal_status === 'verified');
  const [activeTab, setActiveTab ] = useState('transactions');
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [manualDeposits, setManualDeposits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCopied, setIsCopied] = useState(false);

  const [isVerifying, setIsVerifying] = useState(false);
  const [depositSuccessAmount, setDepositSuccessAmount] = useState<number | null>(null);
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);
  const verificationStarted = React.useRef(false);

  const [depositAmount, setDepositAmount] = useState<string>('150');
  const [depositMethod, setDepositMethod] = useState<'card' | 'crypto' | 'bank' | 'paypal'>('card');
  const [isSubmittingDeposit, setIsSubmittingDeposit] = useState(false);
  const [depositProgressStep, setDepositProgressStep] = useState<number>(0);

  const [manualRefId, setManualRefId] = useState('');
  const [manualProofFile, setManualProofFile] = useState<File | null>(null);

  const uploadProofImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    const authToken = token || safeStorageGet('app_token') || '';
    const res = await fetch('/api/files/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      body: formData
    });
    if (!res.ok) {
      throw new Error('Screenshot upload failed');
    }
    const data = await res.json();
    return data.file?.file_url || data.fileUrl || data.url || '';
  };

  const [ccNumber, setCcNumber] = useState('');
  const [ccExpiry, setCcExpiry] = useState('');
  const [ccCvv, setCcCvv] = useState('');
  const [ccName, setCcName] = useState('');

  const [withdrawAmount, setWithdrawAmount] = useState<string>('50');
  const [withdrawMethod, setWithdrawMethod] = useState<'paypal' | 'bank' | 'crypto'>('paypal');
  const [withdrawDetails, setWithdrawDetails] = useState('');
  const [withdrawBankIBAN, setWithdrawBankIBAN] = useState('');
  const [withdrawBankName, setWithdrawBankName] = useState('');
  const [withdrawSwift, setWithdrawSwift] = useState('');
  const [withdrawHolderName, setWithdrawHolderName] = useState('');
  const [isSubmittingWithdraw, setIsSubmittingWithdraw] = useState(false);

  useEffect(() => {
    fetchWallet();

    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    const amount = params.get('amount');
    const sessionId = params.get('session_id');
    const tokenParam = params.get('token') || params.get('orderId');

    if (status === 'stripe-success' && sessionId) {
      if (verificationStarted.current) return;
      verificationStarted.current = true;
      const verifyStripeSession = async () => {
        setIsVerifying(true);
        try {
          await new Promise((resolve) => setTimeout(resolve, 1500));
          const res = await fetch(`/api/payments/verify-stripe-session?session_id=${sessionId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            setDepositSuccessAmount(data.amount);
            
            await fetchWallet();
            if (typeof refreshUser === 'function') {
              await refreshUser();
            }
            setRedirectCountdown(5);
          } else {
            toast.error(
              dir === 'rtl'
                ? 'فشل التحقق من صحة عملية الدفع ومطابقة حركات الدفتر المالي.'
                : 'Could not verify database records for Stripe checkout session.'
            );
          }
        } catch (err: any) {
          console.error('[Stripe Callback] Verification error:', err);
          toast.error(
            dir === 'rtl'
              ? 'حدث خطأ في الاتصال أثناء تأكيد ومزامنة الرصيد.'
              : 'Connection error during wallet database balance sync.'
          );
        } finally {
          setIsVerifying(false);
          const url = new URL(window.location.href);
          url.searchParams.delete('status');
          url.searchParams.delete('session_id');
          window.history.replaceState({}, '', url.toString());
        }
      };
      verifyStripeSession();
    } else if (status === 'cancel') {
      toast.error(
        dir === 'rtl'
          ? 'تم إلغاء عملية الدفع والتحويل عبر بوابة Stripe.'
          : 'Stripe payment was cancelled.'
      );
      const url = new URL(window.location.href);
      url.searchParams.delete('status');
      window.history.replaceState({}, '', url.toString());
    } else if (status === 'paypal-success') {
      const orderId = tokenParam;
      if (orderId) {
        const capturePayment = async () => {
          const toastId = toast.loading(
            dir === 'rtl'
              ? 'جاري تأكيد عملية الدفع والتحصيل من خوادم بايبال الفورية...'
              : 'Capturing and securing PayPal order payment...'
          );

          try {
            const captureRes = await fetch('/api/payments/paypal-capture', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ orderId })
            });

            toast.dismiss(toastId);

            if (captureRes.ok) {
              const capData = await captureRes.json();
              setDepositSuccessAmount(capData.amount);
              
              await fetchWallet();
              if (typeof refreshUser === 'function') {
                await refreshUser();
              }
              setRedirectCountdown(5);
            } else {
              const errData = await captureRes.json();
              throw new Error(errData.error || 'Capture verification failed');
            }
          } catch (err: any) {
            toast.dismiss(toastId);
            console.error('PayPal Capture failed:', err);
            toast.error(
              dir === 'rtl'
                ? `فشل التقاط وتأكيد دفعة بايبال: ${err.message}`
                : `PayPal claim capture failed: ${err.message}`
            );
          } finally {
            const url = new URL(window.location.href);
            url.searchParams.delete('status');
            url.searchParams.delete('token');
            url.searchParams.delete('PayerID');
            window.history.replaceState({}, '', url.toString());
          }
        };

        capturePayment();
      }
    } else if (status === 'paypal-cancel') {
      toast.error(
        dir === 'rtl'
          ? 'تم إلغاء عملية شحن الرصيد عبر بايبال.'
          : 'PayPal checkout process was cancelled.'
      );
      const url = new URL(window.location.href);
      url.searchParams.delete('status');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  useEffect(() => {
    let timer: any;
    if (depositSuccessAmount !== null) {
      setRedirectCountdown(5);
      
      timer = setInterval(() => {
        setRedirectCountdown((prev) => {
          if (prev === null) return null;
          if (prev <= 1) {
            clearInterval(timer);
            setDepositSuccessAmount(null);
            setRedirectCountdown(null);
            setActiveTab('transactions');
            navigate('/settings?tab=wallet');
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setRedirectCountdown(null);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [depositSuccessAmount, navigate]);

  useEffect(() => {
    if (activeTab !== 'deposit' && activeTab !== 'withdraw') {
      fetchTransactions(activeTab);
    }
  }, [activeTab]);

  const fetchWallet = async () => {
    try {
      const res = await fetch('/api/wallet', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setWallet(data);
      }
    } catch (err) {
      console.error('Wallet fetch error', err);
    }
  };

  const fetchTransactions = async (type: string) => {
    setLoading(true);
    try {
      let queryType = type;
      if (type === 'transactions') queryType = 'deposit';
      if (type === 'withdrawal_history') queryType = 'withdrawal';
      if (type === 'earnings') queryType = 'conversion';
      if (type === 'expenses') queryType = 'all'; // display full audit trail for expenses

      const res = await fetch(`/api/wallet/history?type=${queryType}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.transactions || []);
        setTransactions(list);
      }

      if (type === 'transactions') {
        try {
          const manualRes = await fetch('/api/wallet/manual-deposits', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (manualRes.ok) {
            const manualData = await manualRes.json();
            setManualDeposits(manualData);
          }
        } catch (e) {
          console.error('Failed to fetch manual deposits list', e);
        }
      }
    } catch (err) {
      console.error('Transactions fetch error', err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    toast.success(dir === 'rtl' ? 'تم نسخ العنوان إلى الحافظة!' : 'Address copied to clipboard!');
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleClearAllHistory = async () => {
    if (!token) return;
    const confirmMessage = dir === 'rtl' 
      ? 'هل أنت متأكد من رغبتك في تصفية وتنظيف تامة لسجل المعاملات بالدفتر المالي؟ لن تظهر المعاملات الحالية في واجهة العرض مجدداً، دون التأثير على رصيدك الفعلي.' 
      : 'Are you sure you want to completely archive and clear your ledger transactions view history? Existing transactions will be cleared from this screen without affecting your actual balance.';
    
    if (!window.confirm(confirmMessage)) return;

    try {
      const res = await fetch('/api/wallet/clear', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        toast.success(dir === 'rtl' ? 'تم تنظيف وأرشفة الدفتر بالكامل وبنجاح.' : 'Ledger logs archived and cleared with elegance.');
        fetchTransactions(activeTab);
      } else {
        toast.error(dir === 'rtl' ? 'فشل إتمام الأرشفة والتصفية' : 'Failed to archive ledger records.');
      }
    } catch (err) {
      console.error('Clear history error', err);
      toast.error(dir === 'rtl' ? 'حدث خطأ غير متوقع أثناء تصفية المعاملات' : 'An error occurred while clearing transactions.');
    }
  };

  const handleHideTransaction = async (transactionId: number) => {
    if (!token) return;
    try {
      const res = await fetch('/api/wallet/hide', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ transactionId })
      });
      if (res.ok) {
        toast.success(dir === 'rtl' ? 'تم إخفاء وحذف المعاملة من واجهة العرض بنجاح.' : 'Transaction record cleared from current view.');
        fetchTransactions(activeTab);
      } else {
        toast.error(dir === 'rtl' ? 'فشل تصفية المعاملة المحددة' : 'Failed to hide transaction.');
      }
    } catch (err) {
      console.error('Hide transaction error', err);
      toast.error(dir === 'rtl' ? 'حدث خطأ أثناء تصفية السجل' : 'Error clearing individual record.');
    }
  };

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(depositAmount);
    if (isNaN(amountVal) || amountVal <= 0) {
      toast.error(dir === 'rtl' ? 'نصيحة: برجاء إدخال قيمة إيداع صحيحة أكبر من الصفر' : 'Please input a valid positive amount.');
      return;
    }

    if (amountVal < 10) {
      toast.error(
        dir === 'rtl'
          ? 'تنبيه: الحد الأدنى لكل عملية إيداع هو 10 دولار أمريكي لحماية المحفظة.'
          : 'Notice: Minimum deposit is $10 USD to protect the wallet.'
      );
      return;
    }

    if (amountVal > 1000) {
      toast.error(
        dir === 'rtl'
          ? 'تنبيه: الحد الأقصى لكل عملية إيداع هو 1000 دولار أمريكي لحماية المحفظة من غسيل الأموال والإغراق.'
          : 'Notice: Maximum deposit is $1,000 USD per transaction to protect the wallet.'
      );
      return;
    }

    setIsSubmittingDeposit(true);

    if (depositMethod === 'crypto' || depositMethod === 'bank' || depositMethod === 'paypal') {
      if (!manualRefId || manualRefId.trim().length === 0) {
        toast.error(
          dir === 'rtl'
            ? 'الرجاء إدخال كود تحويل المعاملة أو إثبات الهوية لتاكيد طلب الشحن'
            : 'Please enter transaction reference code / TXID.'
        );
        setIsSubmittingDeposit(false);
        return;
      }

      setDepositProgressStep(1); // Uploading files
      let uploadedFileUrl = '';
      if (manualProofFile) {
        try {
          uploadedFileUrl = await uploadProofImage(manualProofFile);
        } catch (err: any) {
          toast.error(dir === 'rtl' ? 'فشل تحميل كود الإثبات لتعبئة الرصيد' : 'Failed to upload screenshot proof.');
          setIsSubmittingDeposit(false);
          setDepositProgressStep(0);
          return;
        }
      }

      setDepositProgressStep(2); // Connecting and record logging
      await new Promise(resolve => setTimeout(resolve, 600));
      setDepositProgressStep(3); // Sync and finish

      try {
        const res = await fetch('/api/wallet/deposit-manual', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            amount: amountVal,
            method: 
              depositMethod === 'crypto'
                ? 'USDT (TRC-20)'
                : depositMethod === 'paypal'
                ? 'PAYPAL'
                : 'BANK TRANSFER',
            reference_id: manualRefId,
            proof_url: uploadedFileUrl
          })
        });

        if (res.ok) {
          toast.success(
            dir === 'rtl'
              ? 'تم إرسال طلب الشحن بنجاح! سيراجع المشرف المالي التحويل ويقوم بتفعيل الرصيد في حسابك قريباً.'
              : 'Manual deposit request submitted! Administrator will verify and credit your wallet soon.'
          );
          setManualRefId('');
          setManualProofFile(null);
          await fetchWallet();
          setActiveTab('transactions');
        } else {
          const errData = await res.json();
          toast.error(errData.error || (dir === 'rtl' ? 'فشل إرسال طلب شحن الرصيد' : 'Failed to submit manual transfer proof.'));
        }
      } catch (err) {
        toast.error(dir === 'rtl' ? 'عطل في الاتصال بخادم المحفظة المالية' : 'Database connection error.');
      } finally {
        setIsSubmittingDeposit(false);
        setDepositProgressStep(0);
      }
      return;
    }

    if (depositMethod === 'card') {
      setDepositProgressStep(1); // Connecting to secure Stripe gateway
      try {
        const stripeRes = await fetch('/api/payments/stripe-deposit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ amount: amountVal })
        });

        if (stripeRes.ok) {
          const stripeData = await stripeRes.json();
          if (stripeData.url) {
            setDepositProgressStep(3); // Redirecting to Stripe secure page
            toast.success(dir === 'rtl' ? 'جاري تحويلك إلى نافذة دفع Stripe الآمنة...' : 'Redirecting to secure Stripe checkout...');
            setTimeout(() => {
              window.location.href = stripeData.url;
            }, 800);
            return;
          }
        }
      } catch (err) {
        // Stripe checkout session failed to load silent handling
      }
    }

    setIsSubmittingDeposit(false);
    setDepositProgressStep(0);
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(withdrawAmount);
    if (isNaN(amountVal) || amountVal <= 0) {
      toast.error(dir === 'rtl' ? 'الرجاء إدخال مبلغ صحيح للسحب' : 'Please enter a valid withdrawal amount.');
      return;
    }

    if (!wallet || wallet.balance < amountVal) {
      toast.error(dir === 'rtl' ? 'الرصيد المتاح غير كافٍ لإجراء هذه المعاملة' : 'Insufficient available balance.');
      return;
    }

    let detailsStr = '';
    if (withdrawMethod === 'paypal') {
      if (!withdrawDetails || !withdrawDetails.includes('@')) {
        toast.error(dir === 'rtl' ? 'يرجى إدخال بريد إلكتروني صالح لحساب بيبال' : 'Please enter a valid PayPal email.');
        return;
      }
      detailsStr = withdrawDetails;
    } else if (withdrawMethod === 'bank') {
      if (!withdrawBankIBAN || !withdrawHolderName || !withdrawBankName) {
        toast.error(dir === 'rtl' ? 'يرجى إدخال كافة تفاصيل الحساب البنكي الخاصة بك' : 'Please fill all bank account parameters.');
        return;
      }
      detailsStr = `IBAN: ${withdrawBankIBAN} | Holder: ${withdrawHolderName} | Bank: ${withdrawBankName} | SWIFT: ${withdrawSwift}`;
    } else if (withdrawMethod === 'crypto') {
      if (!withdrawDetails || withdrawDetails.length < 20) {
        toast.error(dir === 'rtl' ? 'يرجى إدخال عنوان محفظة USDT TRC-20 صحيح ومؤمن' : 'Please enter a valid USDT TRC-20 wallet address.');
        return;
      }
      detailsStr = withdrawDetails;
    }

    setIsSubmittingWithdraw(true);
    try {
      const res = await fetch('/api/wallet/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amountUSD: amountVal,
          method: withdrawMethod.toUpperCase() === 'CRYPTO' ? 'USDT (TRC-20)' : withdrawMethod.toUpperCase(),
          details: detailsStr
        })
      });

      if (res.ok) {
        toast.success(dir === 'rtl' ? 'تم تقديم طلب السحب بنجاح وهو قيد المراجعة الفورية' : 'Withdrawal request submitted for review!');
        await fetchWallet();
        setActiveTab('withdrawal_history'); // Switch to withdrawals history to demonstrate status tracking
        setWithdrawDetails('');
        setWithdrawBankIBAN('');
        setWithdrawBankName('');
        setWithdrawSwift('');
        setWithdrawHolderName('');
      } else {
        const errObj = await res.json();
        toast.error(errObj.error || (dir === 'rtl' ? 'فشل معالجة طلب السحب' : 'Failed to request withdrawal.'));
      }
    } catch (e) {
      console.error(e);
      toast.error(dir === 'rtl' ? 'خطأ في الاتصال بالخادم المالي' : 'Connection failure in settlement server.');
    } finally {
      setIsSubmittingWithdraw(false);
    }
  };

  const selectPredefinedAmount = (val: string) => {
    setDepositAmount(val);
  };

  const handleDepositAmountChange = (val: string) => {
    if (val === '') {
      setDepositAmount('');
      return;
    }
    
    const sanitizedVal = val.replace(/[^0-9.]/g, '');
    
    const parts = sanitizedVal.split('.');
    if (parts.length > 2) return;

    const num = parseFloat(sanitizedVal);
    if (!isNaN(num)) {
      if (num > 1000) {
        setDepositAmount('1000');
        toast.warning(
          dir === 'rtl' 
            ? 'تنبيه: الحد الأقصى للإيداع هو 1000 دولار لحماية المحفظة.' 
            : 'Maximum deposit limit ($1,000) automatically enforced.'
        );
      } else {
        setDepositAmount(sanitizedVal);
      }
    } else {
      setDepositAmount('');
    }
  };

  const handleDepositAmountBlur = () => {
    if (depositAmount === '') {
      setDepositAmount('10');
      toast.info(
        dir === 'rtl' 
          ? 'تم تطبيق الحد الأدنى للإيداع (10$) تلقائياً.' 
          : 'Minimum deposit limit ($10) automatically enforced.'
      );
      return;
    }
    const num = parseFloat(depositAmount);
    if (isNaN(num) || num < 10) {
      setDepositAmount('10');
      toast.info(
        dir === 'rtl' 
          ? 'تم تطبيق الحد الأدنى للإيداع (10$) تلقائياً.' 
          : 'Minimum deposit limit ($10) automatically enforced.'
      );
    }
  };

  const handleCcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let clean = e.target.value.replace(/\D/g, '');
    if (clean.length > 16) clean = clean.slice(0, 16);
    const parts = [];
    for (let i = 0; i < clean.length; i += 4) {
      parts.push(clean.substring(i, i + 4));
    }
    setCcNumber(parts.join(' '));
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let clean = e.target.value.replace(/\D/g, '');
    if (clean.length > 4) clean = clean.slice(0, 4);
    if (clean.length >= 2) {
      setCcExpiry(clean.substring(0, 2) + '/' + clean.substring(2, 4));
    } else {
      setCcExpiry(clean);
    }
  };

  if (loading && !wallet) {
    return (
      <div className="space-y-10 animate-pulse w-full max-w-5xl mx-auto px-6 md:px-12 pt-6">
        <div className="h-[280px] w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-surface)] transition-theme" />
        <div className="h-[400px] w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-surface)] transition-theme" />
      </div>
    );
  }

  const currentBalance = wallet ? wallet.balance : 0;

  return (
    <div className="w-full h-full flex flex-col overflow-y-auto no-scrollbar relative transition-theme pt-12 pb-20">
      
      {/* Centered Banking Hero Card - High Density Elite */}
      <div className="px-6 md:px-12 flex justify-center flex-none mt-4">
        <div className="relative w-full max-w-5xl p-10 rounded-[var(--radius)] border shadow-2xl transition-theme bg-[var(--bg-base)] border-[var(--border)] shadow-[var(--color-shadow)]">
          
          {/* Neon Top Accent Line for the Wallet Hero */}
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-gray-500/10 via-gray-500/10 to-gray-500/5 blur-[1px]" />
          
          <div className="flex flex-col gap-10">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-8">
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 rounded-[var(--radius)] bg-accent/10 flex items-center justify-center text-accent shadow-[0_0_20px_rgba(16,185,129,0.15)] border border-accent/30">
                  <Wallet size={28} strokeWidth={1} />
                </div>
                <div className="space-y-1 text-center md:text-left rtl:md:text-right">
                  <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.4em]">
                    {dir === 'rtl' ? 'الرصيد الكلي المتاح للمشتريات' : 'Available Perplexta Liquidity'}
                  </p>
                  <div className="flex items-baseline justify-center md:justify-start gap-2">
                    <span className="text-2xl font-medium opacity-40">$</span>
                    <span className="text-5xl font-black tracking-tighter text-[var(--text-primary)] transition-theme">
                       {currentBalance.toLocaleString(undefined, { 
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                       })}
                    </span>
                    <span className="text-base font-bold opacity-30 tracking-widest">USD</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons - Refined Side-by-Side Arrangement */}
              <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                <button 
                  onClick={() => setActiveTab('deposit')}
                  className={`flex items-center gap-3 px-8 py-3.5 rounded-[var(--radius)] border text-[10px] font-black uppercase tracking-[0.3em] transition-theme group w-full md:w-auto justify-center ${
                    activeTab === 'deposit'
                      ? 'bg-accent border-accent/50 text-white '
                      : 'bg-[var(--bg-surface)] border-[var(--border)] text-[var(--text-muted)] hover:text-accent hover:border-accent/30 shadow-sm'
                  }`}
                >
                  <Plus size={14} className={`${activeTab === 'deposit' ? 'text-white scale-125' : 'text-accent group-hover:scale-125'} transition-transform`} />
                  {dir === 'rtl' ? 'إيداع رصيد' : 'Deposit Funds'}
                </button>
                <button 
                  onClick={() => setActiveTab('withdraw')}
                  className={`flex items-center gap-3 px-8 py-3.5 rounded-[var(--radius)] border text-[10px] font-black uppercase tracking-[0.3em] transition-theme group w-full md:w-auto justify-center ${
                    activeTab === 'withdraw'
                      ? 'bg-accent border-accent/50 text-white '
                      : 'bg-[var(--bg-surface)] border-[var(--border)] text-[var(--text-muted)] hover:text-accent hover:border-accent/30 shadow-sm'
                  }`}
                >
                  <Send size={12} className={`${activeTab === 'withdraw' ? 'text-white' : 'text-accent'}`} />
                  {dir === 'rtl' ? 'سحب العمولات' : 'Withdraw Funds'}
                </button>
              </div>
            </div>

            {/* Bottom Stats Row */}
            <div className="pt-8 flex flex-wrap items-center justify-center md:justify-start gap-12 border-t border-[var(--border)] transition-theme">
               <div className="space-y-1">
                  <p className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-[0.3em] opacity-60">
                    {dir === 'rtl' ? 'الرصيد بنقاط المكافآت' : 'Points Pool'}
                  </p>
                  <p className="text-xl font-black text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.2)]">
                    {wallet ? wallet.points.toLocaleString() : '0'} PTS
                  </p>
               </div>
               <div className="space-y-1">
                  <p className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-[0.3em] opacity-60">
                    {dir === 'rtl' ? 'قيمة الرصيد بالدولار' : 'US Dollar Valuation'}
                  </p>
                  <p className="text-xl font-black text-accent ">
                    ${currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                  </p>
               </div>
               <div className="space-y-1">
                  <p className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-[0.3em] opacity-60">
                    {dir === 'rtl' ? 'حالة ميزان الدفاتر' : 'Ledger Integrity'}
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-accent animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
                    <p className="text-[10px] font-black text-accent uppercase tracking-[0.2em]">Verified (AES-256)</p>
                  </div>
               </div>
               <div className="hidden lg:block h-10 w-px bg-[var(--border)]" />
               <div className="space-y-1 hidden md:block">
                  <p className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-[0.3em] opacity-60">{dir === 'rtl' ? 'الفئة العضوية' : 'Financial Level'}</p>
                  <p className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest">Enterprise Premium</p>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Perplexta Tabs - Emerald Glow Hierarchy */}
      <div className="px-6 md:px-12 mt-8 flex-none w-full max-w-5xl mx-auto">
        <div className="flex items-center overflow-x-auto gap-4 border-b border-[var(--border)] no-scrollbar transition-theme">
          {[
            { id: 'transactions', label: dir === 'rtl' ? 'سجل الإيداع' : 'Deposits Book' },
            { id: 'withdrawal_history', label: dir === 'rtl' ? 'سجل السحب' : 'Withdrawals Book' },
            { id: 'earnings', label: dir === 'rtl' ? 'مكافآت النقاط' : 'Converted Points' },
            { id: 'expenses', label: dir === 'rtl' ? 'سجل المشتريات والغاز' : 'Operations expenses' },
            { id: 'deposit', label: dir === 'rtl' ? 'قسم الإيداع' : 'Deposit Area', hideOnDesktop: true },
            { id: 'withdraw', label: dir === 'rtl' ? 'طلب سحب' : 'Disbursement Request', hideOnDesktop: true }
          ].map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-4 text-[9px] font-black uppercase tracking-[0.25em] transition-theme relative shrink-0 overflow-hidden ${
                  active 
                    ? 'text-accent' 
                    : `text-[var(--text-muted)] hover:text-[var(--text-primary)]`
                }`}
              >
                <span className={`relative z-10 ${active ? '' : ''}`}>{tab.label}</span>
                {active && (
                   <motion.div 
                     layoutId="activeTabGlow"
                     className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent shadow-[0_0_15px_rgba(16,185,129,0.8)]"
                     transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
                   />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Dynamic Content Area - Full Expansion to Bottom */}
      <div className="flex-1 px-6 md:px-12 py-8 w-full max-w-5xl mx-auto">
        
        <AnimatePresence mode="wait">
          
          {/* 1. DEPOSIT PORTAL VIEW */}
          {activeTab === 'deposit' && (
            <motion.div
              key="deposit"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.15 }}
              className="p-8 rounded-[var(--radius)] border bg-[var(--bg-base)] border-[var(--border)] shadow-xl relative"
            >
              <div className="flex items-center gap-4 mb-8">
                <div className="w-10 h-10 rounded-[var(--radius)] bg-accent/10 flex items-center justify-center text-accent border border-accent/30">
                  <ArrowUpCircle size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight text-[var(--text-primary)] font-sans">
                    {dir === 'rtl' ? 'بوابة الإيداع الفوري والمباشر' : 'Secure instant deposit portal'}
                  </h3>
                  <p className="text-[11px] font-bold text-[var(--text-muted)] tracking-wider">
                    {dir === 'rtl' ? 'رصيد مؤمن ومدعوم ومسجل بشكل فوري في دفتر المعاملات العام.' : 'Secured ledger transaction with 256-bit dynamic point-to-point authentication.'}
                  </p>
                </div>
              </div>

              <form onSubmit={handleDepositSubmit} className="space-y-8">
                
                {/* STRICT TRANSACTION BOUNDARIES & COMPLIANCE WARNING */}
                <div className="p-4 rounded-[var(--radius)] bg-accent/[0.02] border border-accent/10 space-y-2.5">
                  <div className="flex items-center gap-2 text-accent">
                    <ShieldCheck size={14} className=" shrink-0" />
                    <span className="text-[10px] font-black uppercase tracking-widest">
                      {dir === 'rtl' ? 'امتثال مالي صارم وضوابط أمنية' : 'Strict Financial Compliance & Security Protocol'}
                    </span>
                  </div>
                  <p className="text-[10px] text-[var(--text-muted)] font-black leading-relaxed uppercase">
                    {dir === 'rtl' 
                      ? 'تلتزم المحفظة بمعايير الامتثال الدولية الصارمة وقواعد مكافحة غسيل الأموال، ولا تقبل دفعات غير مصرح بها أو مسيئة للاستخدام داخل الموقع. تخضع كافة المعاملات للرقابة والتدقيق المستمر لحماية الحسابات من الإغراق.'
                      : 'This wallet strictly adheres to international financial compliance and anti-money laundering (AML) controls. Unauthorized transactions or direct transfers outside platform services are rejected. All actions are fully audited on the immutable ledger.'}
                  </p>
                  <div className="flex flex-wrap items-center gap-4 text-[9px] font-black text-accent/80 border-t border-accent/5 pt-2 uppercase tracking-wide">
                    <div>
                      {dir === 'rtl' ? 'الحد الأدنى لعملية الشحن:' : 'MIN LIMIT:'}{' '}
                      <span className="text-[var(--text-primary)] font-mono font-black">$10.00 USD</span>
                    </div>
                    <div className="w-1 h-px bg-accent/20 self-stretch hidden sm:block" />
                    <div>
                      {dir === 'rtl' ? 'الحد الأقصى لعملية الشحن:' : 'MAX LIMIT:'}{' '}
                      <span className="text-[var(--text-primary)] font-mono font-black">$1,000.00 USD</span>
                    </div>
                  </div>
                </div>

                {/* Predefined Amounts */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] block">
                    {dir === 'rtl' ? 'حدد أو ابحث عن قيمة الإيداع المرغوبة:' : 'Select pre-set deposit amount:'}
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {['50', '150', '250', '500', '1000'].map((val) => (
                      <button
                        type="button"
                        key={val}
                        onClick={() => selectPredefinedAmount(val)}
                        className={`py-4 rounded-[var(--radius)] border text-xs font-black transition-theme flex flex-col items-center justify-center gap-1 ${
                          depositAmount === val
                            ? 'bg-accent/10 border-accent text-accent  shadow-inner'
                            : 'bg-[var(--bg-surface)] border-[var(--border)] text-[var(--text-muted)] hover:border-accent hover:text-accent'
                        }`}
                      >
                        <span className="text-sm font-black">$ {val}</span>
                        <span className="text-[9px] opacity-60 font-bold">USD</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom input */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] block">
                    {dir === 'rtl' ? 'أو أدخل مبلغاً مخصصاً بالدولار الأمريكي :' : 'Or define custom deposit amount (USD):'}
                  </label>
                  <div className="relative rounded-[var(--radius)] shadow-sm bg-[var(--bg-surface)]">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <span className="text-[13px] font-black text-accent">$</span>
                    </div>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={depositAmount}
                      onChange={(e) => handleDepositAmountChange(e.target.value)}
                      onBlur={handleDepositAmountBlur}
                      placeholder="0.00"
                      className="block w-full pl-10 pr-12 py-4 bg-transparent border border-[var(--border)] rounded-[var(--radius)] text-sm font-black text-[var(--text-primary)] focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent-500"
                    />
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                      <span className="text-[10px] font-black opacity-30 tracking-widest">USD</span>
                    </div>
                  </div>
                </div>

                {/* Multi Payment Selector Cards */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] block">
                    {dir === 'rtl' ? 'حدد وسيلة الدفع المناسبة لك:' : 'Choose deposit settlement route:'}
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    {[
                      { id: 'card', name: dir === 'rtl' ? 'بطاقة ائتمان' : 'Credit/Debit Card', icon: <CreditCard size={18} />, active: isStripeActive },
                      { id: 'crypto', name: dir === 'rtl' ? 'USDT (TRC20)' : 'USDT Crypto', icon: <Smartphone size={18} />, active: true },
                      { id: 'bank', name: dir === 'rtl' ? 'تحويل بنكي' : 'Bank IBAN wire', icon: <Building size={18} />, active: true },
                      { id: 'paypal', name: dir === 'rtl' ? 'بايبال ويب' : 'PayPal Secure', icon: <Globe size={18} />, active: isPaypalActive }
                    ].map((m) => (
                      <button
                        type="button"
                        key={m.id}
                        onClick={() => setDepositMethod(m.id as any)}
                        className={`p-5 rounded-[var(--radius)] border text-left rtl:text-right flex items-center gap-4 transition-theme relative overflow-hidden group ${
                          depositMethod === m.id
                            ? 'bg-accent/10 border-accent text-accent  shadow-[inset_0_0_8px_rgba(16,185,129,0.1)]'
                            : 'bg-[var(--bg-surface)] border-[var(--border)] text-[var(--text-muted)] hover:border-accent/40 hover:text-[var(--text-primary)]'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          depositMethod === m.id ? 'bg-accent/20 text-accent' : 'bg-[var(--bg-secondary)]'
                        }`}>
                          {m.icon}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-xs font-black font-sans leading-none">{m.name}</p>
                            {!m.active && (
                              <span className="text-[7px] font-black bg-red-400/10 text-red-400 border border-red-500/20 px-1 py-0.5 rounded uppercase tracking-wider">
                                {dir === 'rtl' ? 'مغلق' : 'Inactive'}
                              </span>
                            )}
                          </div>
                          <span className="text-[8px] font-bold opacity-50 tracking-widest uppercase">
                            {m.id === 'card' ? 'Secure 3D' : m.id === 'crypto' ? 'Instant' : m.id === 'bank' ? 'Wire' : dir === 'rtl' ? 'مراجعة يدوية' : 'Manual'}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sub-Forms depending on Payment chosen */}
                <div className="p-6 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-surface)] transition-theme">
                  
                  {/* CREDIT CARD FIELDS */}
                  {depositMethod === 'card' && (
                    <div className="space-y-6">
                      {!isStripeActive ? (
                        <div className="p-8 rounded-[var(--radius)] border border-amber-500/20 bg-amber-500/5 text-center space-y-4">
                          <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
                            <Lock size={20} className="drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                          </div>
                          <div className="space-y-1">
                            <h4 className="text-sm font-black text-amber-800 dark:text-amber-300 uppercase tracking-wider">{dir === 'rtl' ? 'بوابة الدفع غير متاحة' : 'Payment Gateway Offline'}</h4>
                            <p className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-wide leading-relaxed">
                              {dir === 'rtl' 
                                ? 'بوابة دفع بطاقات الائتمان Stripe قيد التطوير والامتثال لأعلى معايير الأمان.'
                                : 'Stripe credit card gateway is currently undergoing integration and optimization for maximum security standards.'}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 text-accent mb-2">
                            <ShieldCheck size={16} className="" />
                            <span className="text-[10px] font-black uppercase tracking-widest">{dir === 'rtl' ? 'بوابة دفع آمنة معتمدة بالكامل من Stripe' : 'Stripe Certified PCI-DSS 3D-Secure Gateway'}</span>
                          </div>
                          
                          {/* Premium Graphic Card displaying the current checkout value empowered by Stripe */}
                          <div className="relative w-full max-w-sm h-48 rounded-[var(--radius)] bg-gradient-to-br from-[#1a1a1c] via-[#2d2d30] to-[#121214] border border-gray-800/80 p-6 flex flex-col justify-between overflow-hidden shadow-2xl mx-auto">
                            <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-accent/5 rounded-full blur-3xl pointer-events-none" />
                            
                            <div className="flex items-start justify-between">
                              <div className="space-y-1">
                                <span className="text-[8px] font-black tracking-widest text-gray-500 uppercase">{dir === 'rtl' ? 'الربط المالي الرسمي' : 'OFFICIAL INTEGRATION'}</span>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-sm font-black text-white tracking-widest">STRIPE</span>
                                  <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                                </div>
                              </div>
                              <div className="font-sans font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-xl tracking-tight">
                                stripe
                              </div>
                            </div>

                            <div className="w-10 h-8 rounded-[4px] bg-gradient-to-tr from-amber-400/80 to-amber-200/50 relative border border-amber-500/30">
                              <div className="absolute inset-2 border-r border-b border-amber-600/30" />
                            </div>

                            <div className="space-y-1">
                              <div className="text-xs font-mono tracking-[0.3em] font-black text-gray-400">
                                •••• •••• •••• ••••
                              </div>
                              <div className="flex justify-between items-end">
                                <div>
                                  <span className="text-[7px] text-gray-600 uppercase block leading-none">{dir === 'rtl' ? 'قيمة الإيداع بالدولار' : 'Deposit Value'}</span>
                                  <span className="text-xs font-black text-accent">$ {parseFloat(depositAmount || '0').toLocaleString(undefined, { minimumFractionDigits: 2 })} USD</span>
                                </div>
                                <span className="text-[8px] font-black tracking-widest text-gray-500 uppercase">3D SECURED</span>
                              </div>
                            </div>
                          </div>

                          <div className="p-4 rounded-[var(--radius)] bg-accent/5 border border-accent/10 flex gap-3 text-left rtl:text-right">
                            <Lock size={16} className="text-accent shrink-0 mt-0.5" />
                            <div className="space-y-1">
                              <p className="text-[10px] font-black text-accent dark:text-accent uppercase tracking-widest">{dir === 'rtl' ? 'بوابة Stripe الخارجية المشفرة' : 'FULLY EXTERNALIZED ENCRYPTED GATEWAY'}</p>
                              <p className="text-[9px] text-[var(--text-muted)] font-black uppercase tracking-wider leading-relaxed">
                                {dir === 'rtl' 
                                  ? 'عند النقر على زر التأكيد بالأسفل، سيتم توجيهك بأمان كامل إلى صفحة دفع Stripe الرسمية والمؤمنة لتعبئة البيانات وإكمال المعاملة بدقة بالغة ورصيد فوري تزامني.'
                                  : 'Upon clicking the confirm button below, you will transition to Stripe secure checkout. Your transaction is processed instantly onto the ledger.'}
                              </p>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* CRYPTO ADDRESS INFO */}
                  {depositMethod === 'crypto' && (
                    <div className="space-y-6">
                      <div className="flex items-center gap-2 text-accent mb-2">
                        <ShieldCheck size={16} className="" />
                        <span className="text-[10px] font-black uppercase tracking-widest">{dir === 'rtl' ? 'بوابة تسوية الدفع الفوري عبر USDT (TRC-20) اليدوي' : 'USDT TRC-20 Secure Direct Settlement Ingestion Node'}</span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold leading-relaxed text-[var(--primary)] uppercase">
                        <div className="md:col-span-2 p-4 bg-[var(--bg-base)] rounded-[var(--radius)] border border-[var(--border)] flex items-center justify-between">
                          <div>
                            <span className="text-[8px] text-[var(--text-muted)] tracking-widest block">{dir === 'rtl' ? 'عنوان محفظة الإيداع المخصصة لك (USDT TRC-20)' : 'Your Permanent Dedicated Deposit Address (USDT TRC-20)'}</span>
                            <span className="font-sans font-black text-xs text-accent tracking-wider font-mono select-all truncate block max-w-sm md:max-w-md">{wallet?.crypto_address || 'TPh7eWpY29kZVN6QXV0VGhlbnRpY2F0aW9uTGVkZ2Vy'}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(wallet?.crypto_address || 'TPh7eWpY29kZVN6QXV0VGhlbnRpY2F0aW9uTGVkZ2Vy')}
                            className="p-1 hover:bg-[var(--bg-surface)] text-accent rounded-[for-badge-radius] transition-colors shrink-0"
                          >
                            <Copy size={14} />
                          </button>
                        </div>
                      </div>

                      <div className="p-4 bg-[var(--bg-base)] rounded-[var(--radius)] border border-[var(--border)] text-center">
                        <p className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-widest leading-relaxed">
                          {dir === 'rtl' 
                            ? 'الرجاء إرسال شبكة TRC-20 فقط إلى العنوان الموضح أعلاه أولاً، ثم املأ رقم معاملة الهاش المرجعي وأرفق صورة الإيصال لإرسال الطلب للمراجعة والموافقة يدويًا.' 
                            : 'Ensure to send your USDT TRC-20 transfer directly to the address above before transmitting the verification details below.'}
                        </p>
                      </div>

                      <div className="p-4 rounded-[var(--radius)] bg-amber-500/5 border border-amber-500/10 flex gap-3 text-left rtl:text-right">
                        <Info size={16} className="text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-[9px] font-black text-amber-500 uppercase tracking-wider leading-relaxed">
                          {dir === 'rtl' 
                            ? 'انتبه: أرسل شبكة TRC-20 فقط. إرسال أي عملة أخرى قد يؤدي إلى فقدان أموالك نهائياً. يتم إيداع رصيد المحفظة المكافئ بعد مراجعة المشرف للعملية بشكل يدوي ودقيق.' 
                            : 'ATTENTION: Only dispatch USDT via the Tron (TRC-20) network. Your manual request will be verified by the system administrator immediately upon receipt verification.'}
                        </p>
                      </div>

                      {/* Manual Verification Form Fields for Crypto */}
                      <div className="p-4 rounded-[var(--radius)] bg-[#1a1a1c]/80 border border-gray-800/80 space-y-4">
                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase tracking-widest text-[#10b981] block">
                            {dir === 'rtl' ? 'هاش المعاملة أو الكود التعريفي (مطلوب)' : 'Transaction Hash / Hash ID (Required)'}
                          </label>
                          <input
                            type="text"
                            required
                            value={manualRefId}
                            onChange={(e) => setManualRefId(e.target.value)}
                            placeholder={dir === 'rtl' ? 'أدخل هاش التحويل (TXID) هنا...' : 'Enter USDT TRC-20 Transaction details...'}
                            className="w-full bg-[var(--bg-base)] text-xs text-[var(--text-primary)] font-mono p-3 rounded-[var(--radius)] border border-[var(--border)] focus:outline-none focus:border-accent/50 transition-colors"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase tracking-widest text-[#10b981] block">
                            {dir === 'rtl' ? 'صورة إيصال المعاملة أو لقطة الشاشة' : 'Screenshot / Upload Payment Receipt (Optional)'}
                          </label>
                          <div className="flex items-center gap-3">
                            <input
                              type="file"
                              id="manual-proof-upload"
                              accept="image/*,application/pdf"
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  setManualProofFile(e.target.files[0]);
                                }
                              }}
                            />
                            <label
                              htmlFor="manual-proof-upload"
                              className="flex items-center justify-center gap-2 px-4 py-3 bg-[var(--bg-base)] border border-[var(--border)] hover:border-accent/40 rounded-[var(--radius)] cursor-pointer text-[10px] font-black uppercase tracking-wider text-[var(--text-primary)] transition-theme select-none"
                            >
                              <Paperclip size={12} className="text-accent" />
                              {manualProofFile ? (manualProofFile.name.length > 20 ? manualProofFile.name.substring(0, 20) + '...' : manualProofFile.name) : (dir === 'rtl' ? 'اختر ملف الإثبات' : 'SELECT PROOF IMAGE')}
                            </label>
                            {manualProofFile && (
                              <button
                                type="button"
                                onClick={() => setManualProofFile(null)}
                                className="text-[10px] font-black text-rose-500 uppercase hover:underline"
                              >
                                {dir === 'rtl' ? 'إزالة' : 'REMOVE'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* BANK WIRE FIELDS */}
                  {depositMethod === 'bank' && (
                    <div className="space-y-6">
                      <div className="flex items-center gap-2 text-accent mb-2">
                        <Building size={16} className="" />
                        <span className="text-[10px] font-black uppercase tracking-widest">{dir === 'rtl' ? 'بوابة التحويل البنكي المحلي والدولي اليدوي' : 'Bank Wire Secure Direct Settlement Ingestion Node'}</span>
                      </div>
 
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold leading-relaxed text-[var(--primary)] uppercase">
                        <div className="p-3 bg-[var(--bg-base)] rounded-[var(--radius)] border border-[var(--border)] space-y-1">
                          <span className="text-[8px] text-[var(--text-muted)] tracking-widest block">{dir === 'rtl' ? 'البنك المستلم' : 'Receiver Bank'}</span>
                          <span className="font-black text-[10px] text-[var(--text-primary)]">{wallet?.bank_name || 'Merchant Discount Bank IL (011)'}</span>
                        </div>
                        <div className="p-3 bg-[var(--bg-base)] rounded-[var(--radius)] border border-[var(--border)] space-y-1">
                          <span className="text-[8px] text-[var(--text-muted)] tracking-widest block">{dir === 'rtl' ? 'اسم المستفيد' : 'Beneficiary'}</span>
                          <span className="font-black text-[10px] text-[var(--text-primary)]">{wallet?.bank_recipient || 'Perplexta Tech Platforms LTD.'}</span>
                        </div>
                        <div className="md:col-span-2 p-3 bg-[var(--bg-base)] rounded-[var(--radius)] border border-[var(--border)] flex items-center justify-between">
                          <div>
                            <span className="text-[8px] text-[var(--text-muted)] tracking-widest block">IBAN / الحساب</span>
                            <span className="font-sans font-black text-xs text-accent tracking-wider font-mono">{wallet?.bank_iban || 'IL42 0110 0000 0000 3484 2192'}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(wallet?.bank_iban || 'IL42 0110 0000 0000 3484 2192')}
                            className="p-1 hover:bg-[var(--bg-surface)] text-accent rounded-[for-badge-radius] transition-colors"
                          >
                            <Copy size={14} />
                          </button>
                        </div>
                        <div className="p-3 bg-[var(--bg-base)] rounded-[var(--radius)] border border-[var(--border)] flex items-center justify-between">
                          <div>
                            <span className="text-[8px] text-[var(--text-muted)] tracking-widest block">SWIFT / BIC Code</span>
                            <span className="font-sans font-black text-xs text-accent tracking-widest font-mono">{wallet?.bank_swift || 'PPLXIL33XXX'}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(wallet?.bank_swift || 'PPLXIL33XXX')}
                            className="p-1 hover:bg-[var(--bg-surface)] text-accent rounded-[for-badge-radius] transition-colors"
                          >
                            <Copy size={14} />
                          </button>
                        </div>
                        <div className="md:col-span-2 p-3 bg-[var(--bg-base)] rounded-[var(--radius)] border border-[var(--border)] space-y-1">
                          <span className="text-[8px] text-[var(--text-muted)] tracking-widest block">{dir === 'rtl' ? 'الرمز التعريفي للإيداع (يجب كتابته كشرح للحوالة للتعرف الفوري)' : 'Deposit Ref Code (Include in transfer description/memo)'}</span>
                          <span className="font-black font-mono text-[11px] text-amber-500">MEMO-PPLX-{wallet?.referral_activated ? 'ACT' : 'NEW'}</span>
                        </div>
                      </div>

                      <div className="p-4 bg-[var(--bg-base)] rounded-[var(--radius)] border border-[var(--border)] text-center">
                        <p className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-widest leading-relaxed">
                          {dir === 'rtl' 
                            ? 'الرجاء إجراء التحويل البنكي بالتفاصيل الموضحة أعلاه أولاً، ثم املأ الرقم المرجعي للحوالة وأرفق صورة الإيصال لإرسال الطلب للمراجعة والموافقة يدويًا.' 
                            : 'Ensure to complete your manual bank transfer with the details above before transmitting the verification details below.'}
                        </p>
                      </div>

                      {/* Manual Verification Form Fields for Bank */}
                      <div className="p-4 rounded-[var(--radius)] bg-[#1a1a1c]/80 border border-gray-800/80 space-y-4">
                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase tracking-widest text-[#10b981] block">
                            {dir === 'rtl' ? 'الرقم المرجعي أو كود التحويل البنكي (مطلوب)' : 'Bank Transaction Reference / Hash ID (Required)'}
                          </label>
                          <input
                            type="text"
                            required
                            value={manualRefId}
                            onChange={(e) => setManualRefId(e.target.value)}
                            placeholder={dir === 'rtl' ? 'أدخل الرقم المرجعي أو كود التحويل البنكي هنا...' : 'Enter Bank transfer reference details...'}
                            className="w-full bg-[var(--bg-base)] text-xs text-[var(--text-primary)] font-mono p-3 rounded-[var(--radius)] border border-[var(--border)] focus:outline-none focus:border-accent/50 transition-colors"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase tracking-widest text-[#10b981] block">
                            {dir === 'rtl' ? 'صورة إيصال المعاملة أو لقطة الشاشة' : 'Screenshot / Upload Bank Transfer Receipt (Optional)'}
                          </label>
                          <div className="flex items-center gap-3">
                            <input
                              type="file"
                              id="bank-proof-upload"
                              accept="image/*,application/pdf"
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  setManualProofFile(e.target.files[0]);
                                }
                              }}
                            />
                            <label
                              htmlFor="bank-proof-upload"
                              className="flex items-center justify-center gap-2 px-4 py-3 bg-[var(--bg-base)] border border-[var(--border)] hover:border-accent/40 rounded-[var(--radius)] cursor-pointer text-[10px] font-black uppercase tracking-wider text-[var(--text-primary)] transition-theme select-none"
                            >
                              <Paperclip size={12} className="text-accent" />
                              {manualProofFile ? (manualProofFile.name.length > 20 ? manualProofFile.name.substring(0, 20) + '...' : manualProofFile.name) : (dir === 'rtl' ? 'اختر ملف الإثبات' : 'SELECT PROOF IMAGE')}
                            </label>
                            {manualProofFile && (
                              <button
                                type="button"
                                onClick={() => setManualProofFile(null)}
                                className="text-[10px] font-black text-rose-500 uppercase hover:underline"
                              >
                                {dir === 'rtl' ? 'إزالة' : 'REMOVE'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* PAYPAL DIRECT GATEWAY */}
                  {depositMethod === 'paypal' && (
                    <div className="space-y-6">
                      {!isPaypalActive ? (
                        <div className="p-8 rounded-[var(--radius)] border border-amber-500/20 bg-amber-500/5 text-center space-y-4">
                          <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
                            <Lock size={20} className="drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                          </div>
                          <div className="space-y-1">
                            <h4 className="text-sm font-black text-amber-800 dark:text-amber-300 uppercase tracking-wider">{dir === 'rtl' ? 'بوابة الدفع غير متاحة' : 'Payment Gateway Offline'}</h4>
                            <p className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-wide leading-relaxed">
                              {dir === 'rtl' 
                                ? 'بوابة دفع PayPal قيد التطوير والامتثال لأعلى معايير الأمان.'
                                : 'PayPal gateway is currently undergoing integration and optimization for maximum security standards.'}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 text-accent mb-2">
                            <Globe size={16} className="" />
                            <span className="text-[10px] font-black uppercase tracking-widest">{dir === 'rtl' ? 'رئاسة تسوية الدفع المباشر عبر PayPal اليدوي' : 'PayPal Secure Direct Settlement Ingestion Node'}</span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold leading-relaxed text-[var(--primary)] uppercase">
                            <div className="md:col-span-2 p-4 bg-[var(--bg-base)] rounded-[var(--radius)] border border-[var(--border)] flex items-center justify-between">
                              <div>
                                <span className="text-[8px] text-[var(--text-muted)] tracking-widest block">{dir === 'rtl' ? 'بريد PayPal الخاص بمحفظة الاستلام' : 'PayPal Receiver Email'}</span>
                                <span className="font-sans font-black text-xs text-accent tracking-wider font-mono">{wallet?.paypal_email || 'paypal@perplexta.com'}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(wallet?.paypal_email || 'paypal@perplexta.com')}
                                className="p-1 hover:bg-[var(--bg-surface)] text-accent rounded-[for-badge-radius] transition-colors"
                              >
                                <Copy size={14} />
                              </button>
                            </div>
                          </div>

                          <div className="p-4 bg-[var(--bg-base)] rounded-[var(--radius)] border border-[var(--border)] text-center">
                            <p className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-widest leading-relaxed">
                              {dir === 'rtl' 
                                ? 'الرجاء تحويل القيمة المطلوبة إلى حساب بايبال الموضح أعلاه أولاً، ثم املأ رقم المعاملة المرجعي وأرفق صورة الإيصال لإرسال الطلب للمراجعة والموافقة يدويًا.' 
                                : 'Ensure to send your transfer directly to the address above before transmitting the verification details below.'}
                            </p>
                          </div>

                          {/* Manual Verification Form Fields for PayPal */}
                          <div className="p-4 rounded-[var(--radius)] bg-[#1a1a1c]/80 border border-gray-800/80 space-y-4">
                            <div className="space-y-1">
                              <label className="text-[9px] font-black uppercase tracking-widest text-[#10b981] block">
                                {dir === 'rtl' ? 'رقم معاملة بايبال أو كود الحوالة (مطلوب)' : 'PayPal Transaction ID / Invoice Hash (Required)'}
                              </label>
                              <input
                                type="text"
                                required
                                value={manualRefId}
                                onChange={(e) => setManualRefId(e.target.value)}
                                placeholder={dir === 'rtl' ? 'أدخل رقم المعاملة المرجعي هنا...' : 'Enter PayPal Transaction details...'}
                                className="w-full bg-[var(--bg-base)] text-xs text-[var(--text-primary)] font-mono p-3 rounded-[var(--radius)] border border-[var(--border)] focus:outline-none focus:border-accent/50 transition-colors"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[9px] font-black uppercase tracking-widest text-[#10b981] block">
                                {dir === 'rtl' ? 'صورة إيصال المعاملة أو لقطة الشاشة' : 'Screenshot / Upload PayPal Payment Receipt (Optional)'}
                              </label>
                              <div className="flex items-center gap-3">
                                <input
                                  type="file"
                                  id="paypal-proof-upload"
                                  accept="image/*,application/pdf"
                                  className="hidden"
                                  onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) {
                                      setManualProofFile(e.target.files[0]);
                                    }
                                  }}
                                />
                                <label
                                  htmlFor="paypal-proof-upload"
                                  className="flex items-center justify-center gap-2 px-4 py-3 bg-[var(--bg-base)] border border-[var(--border)] hover:border-accent/40 rounded-[var(--radius)] cursor-pointer text-[10px] font-black uppercase tracking-wider text-[var(--text-primary)] transition-theme select-none"
                                >
                                  <Paperclip size={12} className="text-accent" />
                                  {manualProofFile ? (manualProofFile.name.length > 20 ? manualProofFile.name.substring(0, 20) + '...' : manualProofFile.name) : (dir === 'rtl' ? 'اختر ملف الإثبات' : 'SELECT PROOF IMAGE')}
                                </label>
                                {manualProofFile && (
                                  <button
                                    type="button"
                                    onClick={() => setManualProofFile(null)}
                                    className="text-[10px] font-black text-rose-500 uppercase hover:underline"
                                  >
                                    {dir === 'rtl' ? 'إزالة' : 'REMOVE'}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                </div>

                {/* Submit Container with Progress Loader */}
                <div className="space-y-4">
                  <AnimatePresence>
                    {isSubmittingDeposit && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="p-4 rounded-[var(--radius)] border border-accent/20 bg-accent/5 space-y-3"
                      >
                        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-accent">
                          <span>
                            {depositMethod === 'card' ? (
                              <>
                                {depositProgressStep === 1 && (dir === 'rtl' ? 'جاري الاتصال بالقنوات المصرفية الآمنة...' : 'Connecting to secure gateway channels...')}
                                {depositProgressStep === 2 && (dir === 'rtl' ? 'التحقق وتأمين تفاصيل معاملتك الرقمية...' : 'Validating and securing your digital transaction...')}
                                {depositProgressStep === 3 && (dir === 'rtl' ? 'جاري تحويلك الآن لبوابة الدفع الآمنة... يرجى الانتظار' : 'Redirecting you automatically to secure payment gateway... Please wait')}
                              </>
                            ) : (
                              <>
                                {depositProgressStep === 1 && (dir === 'rtl' ? 'الاتصال بخادم المعاملات المصرفية المشفر...' : 'Contacting financial clearing node')}
                                {depositProgressStep === 2 && (dir === 'rtl' ? 'التحقق ومصادقة تفاصيل طلبك المالي...' : 'Validating and authenticating financial request...')}
                                {depositProgressStep === 3 && (dir === 'rtl' ? 'حفظ وتوثيق العملية في دفتر المعاملات الآمن...' : 'Securing and recording transaction in the safe ledger...')}
                              </>
                            )}
                          </span>
                          <Loader2 size={12} className="animate-spin" />
                        </div>
                        <div className="w-full bg-[var(--bg-secondary)] h-1 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: '0%' }}
                            animate={{ 
                              width: depositProgressStep === 1 ? '33%' : depositProgressStep === 2 ? '66%' : '100%' 
                            }}
                            className="h-full bg-accent shadow-[0_0_8px_rgba(16,185,129,0.8)]"
                            transition={{ duration: 0.15 }}
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <button
                    type="submit"
                    disabled={
                      isSubmittingDeposit || 
                      !depositAmount || 
                      (depositMethod === 'card' && !isStripeActive) ||
                      (depositMethod === 'paypal' && !isPaypalActive)
                    }
                    className="w-full bg-accent hover:bg-accent disabled:opacity-40 text-white font-black py-4 rounded-[var(--radius)] text-[10px] uppercase tracking-[0.4em] transition-theme shadow-md hover:shadow-none"
                  >
                    {isSubmittingDeposit ? (
                      (depositMethod === 'card') ? (
                        dir === 'rtl' ? 'جاري تحويلك إلى بوابة الدفع الآمنة...' : 'REDIRECTING TO SECURE PAYMENT GATEWAY...'
                      ) : (
                        dir === 'rtl' ? 'جاري معالجة المعاملة وتأكيد الطلب المالي...' : 'TRANSMITTING SECURE TRANSACTION DATA...'
                      )
                    ) : (
                      (depositMethod === 'paypal' || depositMethod === 'crypto' || depositMethod === 'bank') ? (
                        dir === 'rtl' ? 'إرسال الطلب' : 'SUBMIT REQUEST'
                      ) : (
                        dir === 'rtl' ? 'تأكيد المعاملة وشحن الرصيد' : 'CONFIRM TRANSACTION & CREDIT FUNDS'
                      )
                    )}
                  </button>
                </div>

              </form>
            </motion.div>
          )}

          {/* 2. WITHDRAW PORTAL VIEW */}
          {activeTab === 'withdraw' && (
            <motion.div
              key="withdraw"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.15 }}
              className="p-8 rounded-[var(--radius)] border bg-[var(--bg-base)] border-[var(--border)] shadow-xl relative"
            >
              <div className="flex items-center gap-4 mb-8">
                <div className="w-10 h-10 rounded-[var(--radius)] bg-accent/10 flex items-center justify-center text-accent border border-accent/30">
                  <ArrowDownCircle size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight text-[var(--text-primary)] font-sans">
                    {dir === 'rtl' ? 'طلب سحب وتسوية الأرباح' : 'Disbursement Request Area'}
                  </h3>
                  <p className="text-[11px] font-bold text-[var(--text-muted)] tracking-wider">
                    {dir === 'rtl' ? 'حول عمولاتك أو أرصدتك المتاحة مباشرة إلى قنوات السحب المعتمدة لديك.' : 'Transmit accrued commission yields or credits directly to accredited payout pipelines.'}
                  </p>
                </div>
              </div>

              {currentBalance === 0 ? (
                <div className="p-12 text-center rounded-[var(--radius)] border border-dashed border-[var(--border)] opacity-60">
                  <AlertCircle size={40} className="mx-auto text-amber-500 mb-4" />
                  <h4 className="text-xs font-black uppercase tracking-widest text-[var(--text-primary)] mb-2">
                    {dir === 'rtl' ? 'رصيدك الحالي فارغ بالدولار' : 'Wallet balance is currently empty'}
                  </h4>
                  <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest max-w-sm mx-auto leading-relaxed">
                    {dir === 'rtl' ? 'يرجى إيداع بعض الأموال أولاً أو جلب الأصدقاء والربح لاستخدام المحفظة والمشتريات.' : 'Earn yields or deposit dollars to unlock secured withdrawal requests.'}
                  </p>
                </div>
              ) : (
                <form onSubmit={handleWithdrawSubmit} className="space-y-8">
                  
                  {/* Amount entry */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                      <span>{dir === 'rtl' ? 'المبلغ المراد سحبه (USD):' : 'Requested Withdrawal Amount (USD):'}</span>
                      <span className="text-accent">
                        {dir === 'rtl' ? 'الحد الأقصى المتاح:' : 'Max Available:'} ${currentBalance.toLocaleString()}
                      </span>
                    </div>
                    <div className="relative rounded-[var(--radius)] shadow-sm bg-[var(--bg-surface)]">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <span className="text-[13px] font-black text-accent">$</span>
                      </div>
                      <input
                        type="number"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        placeholder="0.00"
                        className="block w-full pl-10 pr-12 py-4 bg-transparent border border-[var(--border)] rounded-[var(--radius)] text-sm font-black text-[var(--text-primary)] focus:border-accent focus:outline-none"
                      />
                      <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                        <span className="text-[10px] font-black opacity-30 tracking-widest">USD</span>
                      </div>
                    </div>
                    {parseFloat(withdrawAmount) > 0 && (
                      <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest">
                        <span className="text-accent">
                           ${parseFloat(withdrawAmount).toFixed(2)} USD
                        </span>
                        {parseFloat(withdrawAmount) > currentBalance && (
                          <span className="text-red-500 flex items-center gap-1 font-bold">
                            <AlertCircle size={10} /> {dir === 'rtl' ? 'تجاوزت رصيدك المتاح!' : 'Exceeds balance!'}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Method select */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] block">
                      {dir === 'rtl' ? 'اختر قناة السحب المعتمدة لديك:' : 'Accredited output settlement channel:'}
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {[
                        { id: 'paypal', name: dir === 'rtl' ? 'حساب بيبال' : 'PayPal Secure Email', icon: <Globe size={18} /> },
                        { id: 'bank', name: dir === 'rtl' ? 'حساب بنكي محلي' : 'Bank IBAN Transfer', icon: <Building size={18} /> },
                        { id: 'crypto', name: dir === 'rtl' ? 'USDT (TRC-20)' : 'Decentralized USDT Wallet', icon: <Smartphone size={18} /> }
                      ].map((m) => (
                        <button
                          type="button"
                          key={m.id}
                          onClick={() => setWithdrawMethod(m.id as any)}
                          className={`p-5 rounded-[var(--radius)] border text-left rtl:text-right flex items-center gap-4 transition-theme relative overflow-hidden group ${
                            withdrawMethod === m.id
                              ? 'bg-accent/10 border-accent text-accent  shadow-[inset_0_0_8px_rgba(16,185,129,0.1)]'
                              : 'bg-[var(--bg-surface)] border-[var(--border)] text-[var(--text-muted)] hover:border-accent/40 hover:text-[var(--text-primary)]'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            withdrawMethod === m.id ? 'bg-accent/20 text-accent' : 'bg-[var(--bg-secondary)]'
                          }`}>
                            {m.icon}
                          </div>
                          <div>
                            <p className="text-xs font-black font-sans leading-none">{m.name}</p>
                            <span className="text-[8px] font-bold opacity-50 tracking-widest uppercase">
                              {m.id === 'paypal' ? 'Instant' : m.id === 'bank' ? '2-3 Business' : 'Fast network'}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Form fields for payout methods */}
                  <div className="p-6 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-surface)] transition-theme">
                    
                    {withdrawMethod === 'paypal' && (
                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase text-[var(--text-muted)]">
                          {dir === 'rtl' ? 'البريد الإلكتروني المسجل في بايبال:' : 'Your PayPal Email Address:'}
                        </label>
                        <input
                          type="email"
                          required
                          value={withdrawDetails}
                          onChange={(e) => setWithdrawDetails(e.target.value)}
                          placeholder="payout-individual@email.com"
                          className="block w-full px-4 py-3 bg-[var(--bg-base)] border border-[var(--border)] rounded-[var(--radius)] text-xs font-black text-[var(--text-primary)] focus:border-accent focus:outline-none"
                        />
                        <span className="text-[8px] font-bold tracking-widest text-[var(--text-muted)] uppercase block mt-1">
                          {dir === 'rtl' ? '* تأكد من تطابق البريد لتجنب حدوث عمليات فشل في قنوات الدفع.' : '* Settlement will process directly to this authorized address within 12 hours.'}
                        </span>
                      </div>
                    )}

                    {withdrawMethod === 'crypto' && (
                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase text-[var(--text-muted)]">
                          {dir === 'rtl' ? 'عنوان محفظة المستلم (USDT TRC-20) :' : 'Receiving USDT TRC-20 Wallet Address:'}
                        </label>
                        <input
                          type="text"
                          required
                          value={withdrawDetails}
                          onChange={(e) => setWithdrawDetails(e.target.value)}
                          placeholder="TPh7eWpY29kZVN6QXV0VGhlbn..."
                          className="block w-full px-4 py-3 bg-[var(--bg-base)] border border-[var(--border)] rounded-[var(--radius)] text-xs font-black tracking-wider text-[var(--text-primary)] focus:border-accent focus:outline-none"
                        />
                        <span className="text-[8px] font-bold tracking-widest text-[var(--text-muted)] uppercase block mt-1">
                          {dir === 'rtl' ? '* لا ترسل سوى عنوان TRC-20 لتجنب تلف المعاملة نهائياً.' : '* Node clearance executes on the TRON network instantly.'}
                        </span>
                      </div>
                    )}

                    {withdrawMethod === 'bank' && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase text-[var(--text-muted)]">{dir === 'rtl' ? 'اسم صاحب الحساب البنكي:' : 'Account Holder Name:'}</label>
                            <input
                              type="text"
                              required
                              value={withdrawHolderName}
                              onChange={(e) => setWithdrawHolderName(e.target.value)}
                              placeholder="Full Name here"
                              className="block w-full px-4 py-3 bg-[var(--bg-base)] border border-[var(--border)] rounded-[var(--radius)] text-xs font-black text-[var(--text-primary)] focus:border-accent focus:outline-none"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase text-[var(--text-muted)]">{dir === 'rtl' ? 'اسم البنك باللغة الانجليزية:' : 'Bank Name:'}</label>
                            <input
                              type="text"
                              required
                              value={withdrawBankName}
                              onChange={(e) => setWithdrawBankName(e.target.value)}
                              placeholder="e.g. Bank Hapoalim"
                              className="block w-full px-4 py-3 bg-[var(--bg-base)] border border-[var(--border)] rounded-[var(--radius)] text-xs font-black text-[var(--text-primary)] focus:border-accent focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="md:col-span-2 space-y-2">
                            <label className="text-[9px] font-black uppercase text-[var(--text-muted)]">IBAN / رقم الحساب الدولي:</label>
                            <input
                              type="text"
                              required
                              value={withdrawBankIBAN}
                              onChange={(e) => setWithdrawBankIBAN(e.target.value.toUpperCase())}
                              placeholder="IL0000000..."
                              className="block w-full px-4 py-3 bg-[var(--bg-base)] border border-[var(--border)] rounded-[var(--radius)] text-xs font-black text-[var(--text-primary)] focus:border-accent focus:outline-none"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase text-[var(--text-muted)]">BIC / SWIFT Code:</label>
                            <input
                              type="text"
                              required
                              value={withdrawSwift}
                              onChange={(e) => setWithdrawSwift(e.target.value.toUpperCase())}
                              placeholder="SWIFT"
                              className="block w-full px-4 py-3 bg-[var(--bg-base)] border border-[var(--border)] rounded-[var(--radius)] text-xs font-black text-[var(--text-primary)] focus:border-accent focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingWithdraw || parseFloat(withdrawAmount) > currentBalance}
                    className="w-full bg-accent hover:bg-accent disabled:opacity-40 text-white font-black py-4 rounded-[var(--radius)] text-[10px] uppercase tracking-[0.4em] transition-theme shadow-md hover:shadow-none"
                  >
                    {isSubmittingWithdraw ? (dir === 'rtl' ? 'جاري إثبات طلب التسوية المالي مع البنك المركزي...' : 'SUBMITTING SECURED DISBURSEMENT FLOW...') : (dir === 'rtl' ? 'تقديم طلب السحب الفوري' : 'SUBMIT WITHDRAWAL SETTLEMENT')}
                  </button>

                </form>
              )}
            </motion.div>
          )}

          {/* 3. TRANSACTION / DEPOSIT BOOKING DATA */}
          {activeTab !== 'deposit' && activeTab !== 'withdraw' && (
            <motion.div
              key="table"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full w-full rounded-[var(--radius)] border overflow-hidden transition-theme flex flex-col bg-[var(--bg-base)] border-[var(--border)] shadow-sm shadow-[var(--color-shadow)]"
            >
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Premium Clean Up Utility Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 border-b border-[var(--border)] bg-[var(--bg-surface)] gap-4 transition-theme">
                  <div className="flex flex-col gap-1">
                    <p className="text-[12px] font-black text-[var(--text-primary)] transition-theme flex items-center gap-2">
                      <Sparkles size={14} className="text-accent animate-pulse" />
                      {dir === 'rtl' ? 'تنظيف وتبسيط واجهة الدفتر المالي' : 'Ledger Interface De-clutter'}
                    </p>
                    <p className="text-[9px] text-[var(--text-muted)] leading-relaxed">
                      {dir === 'rtl' 
                        ? 'أرشفة المعاملات لإخفائها وتجنب تكدس السجلات في واجهة مستخدم المنصة.' 
                        : 'Safe archiving to instantly clear interface log overload and keep view lightweight.'}
                    </p>
                  </div>
                  {transactions.length > 0 && (
                    <button
                      onClick={handleClearAllHistory}
                      className="px-4 py-2 rounded-[4px] border border-[var(--border)] bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-[9px] font-black tracking-widest uppercase transition-theme flex items-center gap-2 hover:drop-shadow-[0_0_8px_rgba(239,68,68,0.5)] cursor-pointer self-start sm:self-auto"
                    >
                      <Trash2 size={12} />
                      {dir === 'rtl' ? 'أرشفة السجل بالكامل' : 'Archive Entire Log'}
                    </button>
                  )}
                </div>

                {activeTab === 'transactions' && manualDeposits.length > 0 && (
                  <div className="p-6 border-b border-[var(--border)] bg-[var(--bg-surface)]">
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-4 flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                      </span>
                      {dir === 'rtl' ? 'طلبات الإيداع قيد المراجعة والتحقق المالي بالمستندات:' : 'Manual verification queue logs & pending requests:'}
                    </p>
                    <div className="space-y-3 max-h-60 overflow-y-auto no-scrollbar">
                      {manualDeposits.map((dep) => {
                        let refId = '';
                        try {
                          const parsed = JSON.parse(dep.proof_url);
                          refId = parsed.reference_id || 'N/A';
                        } catch (e) {
                          refId = dep.proof_url || 'N/A';
                        }
                        return (
                          <div key={dep.id} className="p-4 rounded-[var(--radius)] border border-dashed border-[var(--border)] bg-[var(--bg-base)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex flex-col gap-1">
                              <p className="text-[11px] font-black text-[var(--text-primary)] leading-tight flex items-center gap-2">
                                <span>{dir === 'rtl' ? 'طلب شحن يدوي' : 'Manual Deposit Claim'}</span>
                                <span className="text-accent font-mono font-black">${Number(dep.amount).toFixed(2)} USD</span>
                              </p>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[9px] text-[var(--text-muted)] font-mono">
                                <span>{dir === 'rtl' ? `القناة: ${dep.method}` : `Method: ${dep.method}`}</span>
                                <span className="opacity-40">|</span>
                                <span>{dir === 'rtl' ? `كود أو الهاش: ${refId}` : `Ref Hash: ${refId}`}</span>
                                <span className="opacity-40">|</span>
                                <span className="opacity-70">{new Date(dep.created_at).toLocaleString()}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className={`px-2.5 py-1 rounded-[4px] text-[8px] font-black uppercase tracking-wider ${
                                dep.status === 'pending'
                                  ? 'bg-amber-500/10 text-amber-500 border border-amber-500/15'
                                  : dep.status === 'approved'
                                  ? 'bg-accent/10 text-accent border border-accent/15'
                                  : 'bg-rose-500/10 text-rose-500 border border-rose-500/15'
                              }`}>
                                {dep.status === 'pending' ? (dir === 'rtl' ? 'قيد مراجعة المشرف' : 'UNDER REVIEW') : dep.status === 'approved' ? (dir === 'rtl' ? 'تم الشحن بنجاح' : 'APPROVED & CREDITED') : (dir === 'rtl' ? 'طلب مرفوض' : 'REJECTED')}
                              </span>
                              {dep.status === 'rejected' && dep.rejection_reason && (
                                <p className="text-[9px] text-rose-500 font-medium max-w-xs truncate" title={dep.rejection_reason}>
                                  ({dep.rejection_reason})
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div className="flex-1 overflow-y-auto no-scrollbar">
                  <table className="w-full text-left border-separate border-spacing-0">
                    <thead className="sticky top-0 z-20">
                      <tr className={`${
                        theme === 'dark' ? 'bg-[#1a1a1c] border-[var(--border)] text-[var(--text-muted)]' : 'bg-[var(--bg-surface)] border-[var(--border)] text-[var(--text-secondary)]'
                      }`}>
                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest border-b border-[var(--border)]">{dir === 'rtl' ? 'رقم المعاملة' : 'Transaction Ref'}</th>
                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest border-b border-[var(--border)]">{dir === 'rtl' ? 'تصنيف الحركة' : 'Payment Class'}</th>
                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest border-b border-[var(--border)]">{dir === 'rtl' ? 'البيانات المالية والوصف' : 'Description'}</th>
                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest border-b border-[var(--border)] text-right">{dir === 'rtl' ? 'التوقيت' : 'Timestamp'}</th>
                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest border-b border-[var(--border)] text-right">{dir === 'rtl' ? 'أرشفة' : 'Archive'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {loading ? (
                        <tr>
                          <td colSpan={5} className="p-32 text-center">
                            <div className="flex flex-col items-center gap-4 opacity-40">
                              <Loader2 size={32} className="animate-spin text-accent" />
                              <p className="text-[10px] font-black uppercase tracking-[0.4em]">Synchronizing Secure Ledger...</p>
                            </div>
                          </td>
                        </tr>
                      ) : transactions.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="h-96">
                             <div className="flex flex-col items-center justify-center p-20 text-center opacity-40">
                               <div className="w-20 h-20 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center mb-6">
                                  <History size={40} />
                                </div>
                               <p className="text-[11px] font-black uppercase tracking-[0.6em]">{dir === 'rtl' ? 'لا توجد بيانات مسجلة في هذا القسم' : 'NO RECORDED DATA IN THIS SECTOR'}</p>
                             </div>
                          </td>
                        </tr>
                      ) : (
                        transactions.map(tx => (
                          <tr key={tx.id} className="hover:bg-[var(--bg-overlay)] transition-colors group">
                             <td className="px-8 py-7">
                                <code className="text-[11px] font-black text-accent opacity-80 bg-accent/5 px-2 py-1 rounded-[var(--radius)]">TRX-{tx.id.toString(36).toUpperCase().padEnd(8, '0')}</code>
                             </td>
                             <td className="px-8 py-7">
                               <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${tx.transaction_type === 'deposit' ? 'bg-accent' : tx.transaction_type === 'withdrawal' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                                  <span className="text-[11px] font-bold text-[var(--text-primary)] uppercase tracking-wider">{tx.transaction_type}</span>
                               </div>
                             </td>
                             <td className="px-8 py-7">
                               <div className="flex flex-col gap-1.5">
                                 <div className="text-[14px] font-black tracking-tight text-[var(--text-primary)]">
                                    {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-[10px] opacity-40 font-bold ml-1">USD</span>
                                 </div>
                                 <div className="text-[10px] text-[var(--text-muted)] tracking-wide font-sans normal-case">
                                    {tx.description || (dir === 'rtl' ? 'عملية مسجلة ومؤمنة في الدفتر المالي' : 'Registered ledger process')}
                                 </div>
                                 <div className={`text-[9px] font-black uppercase tracking-widest ${tx.status === 'success' ? 'text-accent' : 'text-amber-500'}`}>
                                   {tx.status}
                                 </div>
                               </div>
                             </td>
                             <td className="px-8 py-7 text-right">
                               <div className="flex flex-col gap-1">
                                 <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase">
                                   {new Date(tx.created_at).toLocaleDateString()}
                                 </div>
                                 <div className="text-[10px] font-bold text-[var(--text-muted)] opacity-60">
                                   {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                                 </div>
                               </div>
                             </td>
                             <td className="px-8 py-7 text-right">
                               <span className="flex justify-end">
                                 <button
                                   onClick={() => handleHideTransaction(tx.id)}
                                   className="bg-transparent border border-transparent transition-theme hover:bg-gray-150 dark:hover:bg-gray-800 rounded-[4px] w-8 h-8 flex items-center justify-center text-gray-400 hover:text-accent hover: cursor-pointer"
                                   title={dir === 'rtl' ? 'أرشفة المعاملة' : 'Archive Transaction'}
                                 >
                                   <Trash2 size={13} />
                                  </button>
                               </span>
                             </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>

        {/* Verification Loader Overlay */}
        <AnimatePresence>
          {isVerifying && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-[#0a0a0c]/95 backdrop-blur-md text-white p-6"
            >
              <div className="max-w-md w-full text-center flex flex-col items-center">
                <div className="relative mb-8 pt-4">
                  <div className="w-16 h-16 rounded-full border-2 border-accent/25 border-t-accent-500 animate-spin" />
                  <div className="absolute inset-x-0 top-4 bottom-0 flex items-center justify-center">
                    <ShieldCheck className="text-accent" size={24} />
                  </div>
                </div>
                
                <h3 className="text-xl md:text-2xl font-black mb-3 tracking-tight text-white font-sans">
                  {dir === 'rtl' ? 'تأكيد إيداع الأموال ومزامنة الرصيد...' : 'Verifying secure deposit...'}
                </h3>
                <p className="text-gray-400 text-xs md:text-sm font-medium leading-relaxed max-w-sm">
                  {dir === 'rtl' 
                    ? 'جاري تحديث ومزامنة الرصيد الفوري في محفظتك بشكل آمن...' 
                    : 'Securing your transaction and updating your wallet balance...'}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Deposit Success Modal Overlay */}
        <AnimatePresence>
          {depositSuccessAmount !== null && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[999] flex items-center justify-center bg-[#0a0a0c]/90 backdrop-blur-lg p-4"
            >
              <motion.div
                initial={{ scale: 0.95, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 15 }}
                className="bg-[#121215] border border-gray-800/80 rounded-[8px] max-w-lg w-full p-6 md:p-8 text-center shadow-[0_0_50px_rgba(16,185,129,0.15)] relative overflow-hidden"
              >
                {/* Background glow circle */}
                <div className="absolute -top-24 -left-24 w-48 h-48 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-accent/10 rounded-full blur-3xl pointer-events-none" />

                <div className="w-16 h-16 bg-accent/10 border border-accent/20 rounded-full flex items-center justify-center mx-auto mb-6 hover:scale-110 transition-transform duration-300 ">
                  <CheckCircle2 className="text-accent" size={32} />
                </div>

                <h3 className="text-2xl md:text-3xl font-black text-white mb-2 tracking-tight">
                  {dir === 'rtl' ? 'تم شحن المحفظة بنجاح!' : 'Wallet Loaded Successfully!'}
                </h3>
                
                <p className="text-gray-400 text-xs md:text-sm font-medium mb-6">
                  {dir === 'rtl' 
                    ? 'تمت إضافة الأموال إلى محفظتك بنجاح ومزامنة الرصيد لتتمكن من استخدامه فوراً.' 
                    : 'Funds have been successfully added to your wallet and your balance is now up-to-date and ready.'}
                </p>

                {/* Amount segment */}
                <div className="bg-[#18181c] border border-gray-800/40 rounded-[6px] py-4 px-6 inline-flex flex-col items-center justify-center mb-8 min-w-[200px]">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">
                    {dir === 'rtl' ? 'الرصيد المودع' : 'DEPOSITED AMOUNT'}
                  </span>
                  <span className="text-3xl md:text-4xl font-extrabold text-accent font-mono ">
                    +${Number(depositSuccessAmount).toFixed(2)}
                  </span>
                </div>

                {/* Redirect countdown section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-2 text-accent font-medium text-xs md:text-sm">
                    <Clock size={16} className="animate-pulse" />
                    <span>
                      {dir === 'rtl' 
                        ? `سيتم تحويلك إلى سجل العمليات والمحفظة خلال ${redirectCountdown || 5} ثوان...` 
                        : `Returning you to the wallet transactions index in ${redirectCountdown || 5} seconds...`}
                    </span>
                  </div>

                  {/* Progressive countdown loader bar */}
                  <div className="w-full bg-gray-800/40 h-[3px] rounded-full overflow-hidden">
                    <motion.div 
                      key={redirectCountdown}
                      initial={{ width: '100%' }}
                      animate={{ width: '0%' }}
                      transition={{ duration: 0.15, ease: 'linear' }}
                      className="bg-accent h-full"
                    />
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
};

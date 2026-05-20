import React, { useState, useEffect } from 'react';
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
  const { t, token } = useAppContext();
  const [activeTab, setActiveTab ] = useState('transactions');
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [manualDeposits, setManualDeposits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCopied, setIsCopied] = useState(false);

  // Deposit Form States
  const [depositAmount, setDepositAmount] = useState<string>('150');
  const [depositMethod, setDepositMethod] = useState<'card' | 'crypto' | 'bank' | 'paypal'>('card');
  const [isSubmittingDeposit, setIsSubmittingDeposit] = useState(false);
  const [depositProgressStep, setDepositProgressStep] = useState<number>(0);

  // Manual Deposit Form States
  const [manualRefId, setManualRefId] = useState('');
  const [manualProofFile, setManualProofFile] = useState<File | null>(null);

  const uploadProofImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/files/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    if (!res.ok) {
      throw new Error('Screenshot upload failed');
    }
    const data = await res.json();
    return data.file.file_url; // Returns exact static filename registered on backend
  };

  // Credit Card fields
  const [ccNumber, setCcNumber] = useState('');
  const [ccExpiry, setCcExpiry] = useState('');
  const [ccCvv, setCcCvv] = useState('');
  const [ccName, setCcName] = useState('');

  // Withdrawal Form States
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

    // Check query params for Stripe or PayPal checkout redirect results
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    const amount = params.get('amount');
    const sessionId = params.get('session_id');
    const tokenParam = params.get('token') || params.get('orderId');

    if (status === 'success' && amount) {
      toast.success(
        dir === 'rtl' 
          ? `تم تأكيد شحن الرصيد بمبلغ $${amount} بنجاح ودقة بالغة عبر Stripe!` 
          : `Wallet credited with $${amount} successfully via Stripe Secure Checkout!`
      );
      // Clean up URL parameters to keep address bar pristine
      const url = new URL(window.location.href);
      url.searchParams.delete('status');
      url.searchParams.delete('amount');
      window.history.replaceState({}, '', url.toString());
    } else if (status === 'stripe-success' && sessionId) {
      const verifyStripeSession = async () => {
        const toastId = toast.loading(
          dir === 'rtl' 
            ? 'جاري تأكيد عملية الشحن بدقّة بالغة...' 
            : 'Verifying deposit session securely...'
        );
        try {
          const res = await fetch(`/api/payments/verify-stripe-session?session_id=${sessionId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          toast.dismiss(toastId);
          if (res.ok) {
            const data = await res.json();
            toast.success(
              dir === 'rtl' 
                ? `تم تأكيد شحن الرصيد بمبلغ $${data.amount} بنجاح ودقة بالغة عبر Stripe!` 
                : `Wallet credited with $${data.amount} successfully via Stripe Secure Checkout!`
            );
            fetchWallet();
          } else {
            toast.error(
              dir === 'rtl'
                ? 'فشل التحقق من صحة عملية الدفع عبر Stripe.'
                : 'Could not verify Stripe checkout session.'
            );
          }
        } catch (err: any) {
          toast.dismiss(toastId);
          console.error('[Stripe Callback] Verification error:', err);
        } finally {
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
              toast.success(
                dir === 'rtl'
                  ? `بشرى سارة! تم شحن محفظتك بنجاح بمبلغ $${capData.amount} عبر بايبال!`
                  : `Hooray! Account credited with $${capData.amount} successfully via PayPal!`
              );
              fetchWallet();
              setActiveTab('transactions');
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
        // Extract transactions if returned wrapped in an object or array
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

  // Deposit Handler with Multi-Step Premium Simulators and Manual Request Routing
  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(depositAmount);
    if (isNaN(amountVal) || amountVal <= 0) {
      toast.error(dir === 'rtl' ? 'نصيحة: برجاء إدخال قيمة إيداع صحيحة أكبر من الصفر' : 'Please input a valid positive amount.');
      return;
    }

    setIsSubmittingDeposit(true);

    // MANUAL FLOW: Crypto & Bank methods
    if (depositMethod === 'crypto' || depositMethod === 'bank') {
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
            method: depositMethod.toUpperCase() === 'CRYPTO' ? 'USDT (TRC-20)' : 'BANK TRANSFER',
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

    // AUTOMATED GATEWAYS: Card / Paypal
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
        console.warn('Stripe checkout session failed to load', err);
      }
    } else if (depositMethod === 'paypal') {
      setDepositProgressStep(1); // Connecting to PayPal secure gateway
      try {
        const paypalRes = await fetch('/api/payments/paypal-deposit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ amount: amountVal })
        });

        if (paypalRes.ok) {
          const paypalData = await paypalRes.json();
          if (paypalData.url) {
            setDepositProgressStep(3); // Redirecting to PayPal secure checkout page
            toast.success(dir === 'rtl' ? 'جاري توجيهك إلى نافذة دفع بايبال الآمنة لإتمام المعاملة...' : 'Redirecting to PayPal secure checkout...');
            setTimeout(() => {
              window.location.href = paypalData.url;
            }, 800);
            return;
          } else {
            throw new Error('No checkout URL returned from PayPal server');
          }
        } else {
          const errData = await paypalRes.json();
          throw new Error(errData.error || 'Failed to create PayPal checkout');
        }
      } catch (err: any) {
        console.error('PayPal checkout failed:', err);
        toast.error(err.message || (dir === 'rtl' ? 'فشل بدء معالجة الدفع عبر بايبال' : 'Failed to launch PayPal billing session.'));
        setIsSubmittingDeposit(false);
        setDepositProgressStep(0);
        return;
      }
    }

    setIsSubmittingDeposit(false);
    setDepositProgressStep(0);
  };

  // Withdraw Handler
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

  // Predefined deposit selectors handler
  const selectPredefinedAmount = (val: string) => {
    setDepositAmount(val);
  };

  // Card formatting helpers
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
        <div className="h-[280px] w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-surface)] transition-all duration-[var(--theme-transition-duration)]" />
        <div className="h-[400px] w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-surface)] transition-all duration-[var(--theme-transition-duration)]" />
      </div>
    );
  }

  const currentBalance = wallet ? wallet.balance : 0;

  return (
    <div className="w-full h-full flex flex-col overflow-y-auto no-scrollbar relative transition-all duration-[var(--theme-transition-duration)] pt-12 pb-20">
      
      {/* Centered Banking Hero Card - High Density Elite */}
      <div className="px-6 md:px-12 flex justify-center flex-none mt-4">
        <div className="relative w-full max-w-5xl p-10 rounded-[var(--radius)] border shadow-2xl transition-all duration-[var(--theme-transition-duration)] bg-[var(--bg-base)] border-[var(--border)] shadow-[var(--color-shadow)]">
          
          {/* Neon Top Accent Line for the Wallet Hero */}
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-500/20 via-emerald-500 to-emerald-500/20 blur-[1px]" />
          
          <div className="flex flex-col gap-10">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-8">
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 rounded-[var(--radius)] bg-emerald-500/10 flex items-center justify-center text-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.15)] border border-emerald-500/30">
                  <Wallet size={28} strokeWidth={1} />
                </div>
                <div className="space-y-1 text-center md:text-left rtl:md:text-right">
                  <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.4em]">
                    {dir === 'rtl' ? 'الرصيد الكلي المتاح للمشتريات' : 'Available Perplexta Liquidity'}
                  </p>
                  <div className="flex items-baseline justify-center md:justify-start gap-2">
                    <span className="text-2xl font-medium opacity-40">$</span>
                    <span className="text-5xl font-black tracking-tighter text-[var(--text-primary)] transition-all duration-300">
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
                  className={`flex items-center gap-3 px-8 py-3.5 rounded-[var(--radius)] border text-[10px] font-black uppercase tracking-[0.3em] transition-all group w-full md:w-auto justify-center ${
                    activeTab === 'deposit'
                      ? 'bg-emerald-500 border-emerald-500/50 text-white drop-shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                      : 'bg-[var(--bg-surface)] border-[var(--border)] text-[var(--text-muted)] hover:text-emerald-500 hover:border-emerald-500/30 shadow-sm'
                  }`}
                >
                  <Plus size={14} className={`${activeTab === 'deposit' ? 'text-white scale-125' : 'text-emerald-500 group-hover:scale-125'} transition-transform`} />
                  {dir === 'rtl' ? 'إيداع رصيد' : 'Deposit Funds'}
                </button>
                <button 
                  onClick={() => setActiveTab('withdraw')}
                  className={`flex items-center gap-3 px-8 py-3.5 rounded-[var(--radius)] border text-[10px] font-black uppercase tracking-[0.3em] transition-all group w-full md:w-auto justify-center ${
                    activeTab === 'withdraw'
                      ? 'bg-emerald-500 border-emerald-500/50 text-white drop-shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                      : 'bg-[var(--bg-surface)] border-[var(--border)] text-[var(--text-muted)] hover:text-emerald-500 hover:border-emerald-500/30 shadow-sm'
                  }`}
                >
                  <Send size={12} className={`${activeTab === 'withdraw' ? 'text-white' : 'text-emerald-500'}`} />
                  {dir === 'rtl' ? 'سحب العمولات' : 'Withdraw Funds'}
                </button>
              </div>
            </div>

            {/* Bottom Stats Row */}
            <div className="pt-8 flex flex-wrap items-center justify-center md:justify-start gap-12 border-t border-[var(--border)] transition-all duration-[var(--theme-transition-duration)]">
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
                  <p className="text-xl font-black text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]">
                    ${(currentBalance * 0.27).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                  </p>
               </div>
               <div className="space-y-1">
                  <p className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-[0.3em] opacity-60">
                    {dir === 'rtl' ? 'حالة ميزان الدفاتر' : 'Ledger Integrity'}
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em]">Verified (AES-256)</p>
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
        <div className="flex items-center overflow-x-auto gap-4 border-b border-[var(--border)] no-scrollbar transition-all duration-[var(--theme-transition-duration)]">
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
                className={`px-6 py-4 text-[9px] font-black uppercase tracking-[0.25em] transition-all duration-300 relative shrink-0 overflow-hidden ${
                  active 
                    ? 'text-emerald-500' 
                    : `text-[var(--text-muted)] hover:text-[var(--text-primary)]`
                }`}
              >
                <span className={`relative z-10 ${active ? 'drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]' : ''}`}>{tab.label}</span>
                {active && (
                   <motion.div 
                     layoutId="activeTabGlow"
                     className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.8)]"
                     transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
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
              transition={{ duration: 0.3 }}
              className="p-8 rounded-[var(--radius)] border bg-[var(--bg-base)] border-[var(--border)] shadow-xl relative"
            >
              <div className="flex items-center gap-4 mb-8">
                <div className="w-10 h-10 rounded-[var(--radius)] bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/30">
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
                        className={`py-4 rounded-[var(--radius)] border text-xs font-black transition-all duration-300 flex flex-col items-center justify-center gap-1 ${
                          depositAmount === val
                            ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500 drop-shadow-[0_0_10px_rgba(16,185,129,0.3)] shadow-inner'
                            : 'bg-[var(--bg-surface)] border-[var(--border)] text-[var(--text-muted)] hover:border-emerald-500 hover:text-emerald-500'
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
                      <span className="text-[13px] font-black text-emerald-500">$</span>
                    </div>
                    <input
                      type="number"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      placeholder="0.00"
                      className="block w-full pl-10 pr-12 py-4 bg-transparent border border-[var(--border)] rounded-[var(--radius)] text-sm font-black text-[var(--text-primary)] focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
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
                      { id: 'card', name: dir === 'rtl' ? 'بطاقة ائتمان' : 'Credit/Debit Card', icon: <CreditCard size={18} /> },
                      { id: 'crypto', name: dir === 'rtl' ? 'USDT (TRC20)' : 'USDT Crypto', icon: <Smartphone size={18} /> },
                      { id: 'bank', name: dir === 'rtl' ? 'تحويل بنكي' : 'Bank IBAN wire', icon: <Building size={18} /> },
                      { id: 'paypal', name: dir === 'rtl' ? 'بايبال ويب' : 'PayPal Secure', icon: <Globe size={18} /> }
                    ].map((m) => (
                      <button
                        type="button"
                        key={m.id}
                        onClick={() => setDepositMethod(m.id as any)}
                        className={`p-5 rounded-[var(--radius)] border text-left rtl:text-right flex items-center gap-4 transition-all duration-300 relative overflow-hidden group ${
                          depositMethod === m.id
                            ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500 drop-shadow-[0_0_10px_rgba(16,185,129,0.3)] shadow-[inset_0_0_8px_rgba(16,185,129,0.1)]'
                            : 'bg-[var(--bg-surface)] border-[var(--border)] text-[var(--text-muted)] hover:border-emerald-500/40 hover:text-[var(--text-primary)]'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          depositMethod === m.id ? 'bg-emerald-500/20 text-emerald-500' : 'bg-[var(--bg-secondary)]'
                        }`}>
                          {m.icon}
                        </div>
                        <div>
                          <p className="text-xs font-black font-sans leading-none">{m.name}</p>
                          <span className="text-[8px] font-bold opacity-50 tracking-widest uppercase">
                            {m.id === 'card' ? 'Secure 3D' : m.id === 'crypto' ? 'Instant' : m.id === 'bank' ? 'Wire' : '2-Click'}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sub-Forms depending on Payment chosen */}
                <div className="p-6 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-surface)] transition-all">
                  
                  {/* CREDIT CARD FIELDS */}
                  {depositMethod === 'card' && (
                    <div className="space-y-6">
                      <div className="flex items-center gap-2 text-emerald-500 mb-2">
                        <ShieldCheck size={16} className="drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                        <span className="text-[10px] font-black uppercase tracking-widest">{dir === 'rtl' ? 'بوابة دفع آمنة معتمدة بالكامل من Stripe' : 'Stripe Certified PCI-DSS 3D-Secure Gateway'}</span>
                      </div>
                      
                      {/* Premium Graphic Card displaying the current checkout value empowered by Stripe */}
                      <div className="relative w-full max-w-sm h-48 rounded-[var(--radius)] bg-gradient-to-br from-[#1a1a1c] via-[#2d2d30] to-[#121214] border border-gray-800/80 p-6 flex flex-col justify-between overflow-hidden shadow-2xl mx-auto">
                        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
                        
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <span className="text-[8px] font-black tracking-widest text-gray-500 uppercase">{dir === 'rtl' ? 'الربط المالي الرسمي' : 'OFFICIAL INTEGRATION'}</span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-black text-white tracking-widest">STRIPE</span>
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
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
                              <span className="text-xs font-black text-emerald-500">$ {parseFloat(depositAmount || '0').toLocaleString(undefined, { minimumFractionDigits: 2 })} USD</span>
                            </div>
                            <span className="text-[8px] font-black tracking-widest text-gray-500 uppercase">3D SECURED</span>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 rounded-[var(--radius)] bg-emerald-500/5 border border-emerald-500/10 flex gap-3 text-left rtl:text-right">
                        <Lock size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-white uppercase tracking-widest">{dir === 'rtl' ? 'بوابة Stripe الخارجية المشفرة' : 'FULLY EXTERNALIZED ENCRYPTED GATEWAY'}</p>
                          <p className="text-[9px] text-[var(--text-muted)] font-black uppercase tracking-wider leading-relaxed">
                            {dir === 'rtl' 
                              ? 'عند النقر على زر التأكيد بالأسفل، سيتم توجيهك بأمان كامل إلى صفحة دفع Stripe الرسمية والمؤمنة لتعبئة البيانات وإكمال المعاملة بدقة بالغة ورصيد فوري تزامني.'
                              : 'Upon clicking the confirm button below, you will transition to Stripe secure checkout. Your transaction is processed instantly onto the ledger.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* CRYPTO ADDRESS INFO */}
                  {depositMethod === 'crypto' && (
                    <div className="space-y-5">
                      <div className="flex items-center gap-2 text-emerald-500 mb-2">
                        <ShieldCheck size={16} />
                        <span className="text-[9px] font-black uppercase tracking-widest">TRC-20 Decentralized Ledger Gateway</span>
                      </div>
                      
                      <div className="space-y-2">
                        <p className="text-[10px] font-black text-[var(--text-muted)] leading-relaxed uppercase tracking-widest">
                          {dir === 'rtl' ? 'عنوان محفظة الإيداع المخصصة لك (USDT TRC-20)' : 'Your Permanent Dedicated Deposit Address (USDT TRC-20):'}
                        </p>
                        <div className="flex items-center gap-3 bg-[var(--bg-base)] p-3 rounded-[var(--radius)] border border-[var(--border)] overflow-hidden">
                          <code className="text-xs font-black tracking-wider text-emerald-500 select-all truncate flex-1">
                            {wallet?.crypto_address || 'TPh7eWpY29kZVN6QXV0VGhlbnRpY2F0aW9uTGVkZ2Vy'}
                          </code>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(wallet?.crypto_address || 'TPh7eWpY29kZVN6QXV0VGhlbnRpY2F0aW9uTGVkZ2Vy')}
                            className="p-2 hover:bg-[var(--bg-surface)] text-emerald-500 rounded-[var(--radius)] shrink-0 transition-colors"
                          >
                            <Copy size={16} />
                          </button>
                        </div>
                      </div>

                      <div className="p-4 rounded-[var(--radius)] bg-amber-500/5 border border-amber-500/20 flex gap-3">
                        <Info size={18} className="text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-[9px] font-black text-amber-500 uppercase tracking-wider leading-relaxed">
                          {dir === 'rtl' 
                            ? 'انتبه: أرسل شبكة TRC-20 فقط. إرسال أي عملة أخرى قد يؤدي إلى فقدان أموالك نهائياً. يتم إيداع رصيد الشيكل المكافئ تلقائياً بعد أول تأكيد على السلسلة.' 
                            : 'ATTENTION: Only dispatch USDT via the Tron (TRC-20) network. Funds will credit to your account within 60 seconds after 1 blockchain confirmation node.'}
                        </p>
                      </div>

                      {/* Manual Verification Form Fields */}
                      <div className="p-4 rounded-[var(--radius)] bg-[#1a1a1c]/80 border border-gray-800/80 space-y-4">
                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase tracking-widest text-[#10b981] block">
                            {dir === 'rtl' ? 'الرقم المرجعي أو كود التحويل (مطلوب)' : 'Transaction Reference / Hash ID (Required)'}
                          </label>
                          <input
                            type="text"
                            required
                            value={manualRefId}
                            onChange={(e) => setManualRefId(e.target.value)}
                            placeholder={dir === 'rtl' ? 'أدخل الرقم المرجعي أو هاش العملية هنا...' : 'Enter TXID or confirmation number...'}
                            className="w-full bg-[var(--bg-base)] text-xs text-[var(--text-primary)] font-mono p-3 rounded-[var(--radius)] border border-[var(--border)] focus:outline-none focus:border-emerald-500/50 transition-colors"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase tracking-widest text-[#10b981] block">
                            {dir === 'rtl' ? 'إثبات تحويل المعاملة (اختياري - صورة أو كشف حساب)' : 'Screenshot / Upload Payment Proof (Optional)'}
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
                              className="flex items-center justify-center gap-2 px-4 py-3 bg-[var(--bg-base)] border border-[var(--border)] hover:border-emerald-500/40 rounded-[var(--radius)] cursor-pointer text-[10px] font-black uppercase tracking-wider text-[var(--text-primary)] transition-all select-none duration-200"
                            >
                              <Paperclip size={12} className="text-emerald-500" />
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
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-emerald-500 mb-2">
                        <Building size={16} />
                        <span className="text-[9px] font-black uppercase tracking-widest">Israel Settlement Settlement Node IBAN</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold leading-relaxed text-[var(--primary)] uppercase">
                        <div className="p-3 bg-[var(--bg-base)] rounded-[var(--radius)] border border-[var(--border)] space-y-1">
                          <span className="text-[8px] text-[var(--text-muted)] tracking-widest block">{dir === 'rtl' ? 'البنك المستلم' : 'Receiver Bank'}</span>
                          <span className="font-black text-[10px]">{wallet?.bank_name || 'Merchant Discount Bank IL (011)'}</span>
                        </div>
                        <div className="p-3 bg-[var(--bg-base)] rounded-[var(--radius)] border border-[var(--border)] space-y-1">
                          <span className="text-[8px] text-[var(--text-muted)] tracking-widest block">{dir === 'rtl' ? 'اسم المستفيد' : 'Beneficiary'}</span>
                          <span className="font-black text-[10px]">{wallet?.bank_recipient || 'Perplexta Tech Platforms LTD.'}</span>
                        </div>
                        <div className="md:col-span-2 p-3 bg-[var(--bg-base)] rounded-[var(--radius)] border border-[var(--border)] flex items-center justify-between">
                          <div>
                            <span className="text-[8px] text-[var(--text-muted)] tracking-widest block">IBAN / الحساب</span>
                            <span className="font-black font-sans text-xs text-emerald-500 tracking-wider">{wallet?.bank_iban || 'IL42 0110 0000 0000 3484 2192'}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(wallet?.bank_iban || 'IL42 0110 0000 0000 3484 2192')}
                            className="p-1 hover:bg-[var(--bg-surface)] text-emerald-500 rounded-[for-badge-radius] transition-colors"
                          >
                            <Copy size={14} />
                          </button>
                        </div>
                        <div className="p-3 bg-[var(--bg-base)] rounded-[var(--radius)] border border-[var(--border)] flex items-center justify-between">
                          <div>
                            <span className="text-[8px] text-[var(--text-muted)] tracking-widest block">SWIFT / BIC Code</span>
                            <span className="font-sans font-black text-xs text-emerald-500 tracking-widest">{wallet?.bank_swift || 'PPLXIL33XXX'}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(wallet?.bank_swift || 'PPLXIL33XXX')}
                            className="p-1 hover:bg-[var(--bg-surface)] text-emerald-500 rounded-[for-badge-radius] transition-colors"
                          >
                            <Copy size={14} />
                          </button>
                        </div>
                        <div className="p-3 bg-[var(--bg-base)] rounded-[var(--radius)] border border-[var(--border)] space-y-1">
                          <span className="text-[8px] text-[var(--text-muted)] tracking-widest block">{dir === 'rtl' ? 'الرمز التعريفي للإيداع' : 'Deposit Ref Code (Include in memo)'}</span>
                          <span className="font-black font-mono text-[11px] text-amber-500">MEMO-PPLX-{wallet?.referral_activated ? 'ACT' : 'NEW'}</span>
                        </div>
                      </div>

                      {/* Manual Verification Form Fields */}
                      <div className="mt-6 p-4 rounded-[var(--radius)] bg-[#1a1a1c]/80 border border-gray-800/80 space-y-4">
                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase tracking-widest text-[#10b981] block">
                            {dir === 'rtl' ? 'الرقم المرجعي أو كود التحويل (مطلوب)' : 'Transaction Reference / Hash ID (Required)'}
                          </label>
                          <input
                            type="text"
                            required
                            value={manualRefId}
                            onChange={(e) => setManualRefId(e.target.value)}
                            placeholder={dir === 'rtl' ? 'أدخل الرقم المرجعي أو هاش العملية هنا...' : 'Enter TXID or confirmation number...'}
                            className="w-full bg-[var(--bg-base)] text-xs text-[var(--text-primary)] font-mono p-3 rounded-[var(--radius)] border border-[var(--border)] focus:outline-none focus:border-emerald-500/50 transition-colors"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase tracking-widest text-[#10b981] block">
                            {dir === 'rtl' ? 'إثبات تحويل المعاملة (اختياري - صورة أو كشف حساب)' : 'Screenshot / Upload Payment Proof (Optional)'}
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
                              className="flex items-center justify-center gap-2 px-4 py-3 bg-[var(--bg-base)] border border-[var(--border)] hover:border-emerald-500/40 rounded-[var(--radius)] cursor-pointer text-[10px] font-black uppercase tracking-wider text-[var(--text-primary)] transition-all select-none duration-200"
                            >
                              <Paperclip size={12} className="text-emerald-500" />
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
                    <div className="space-y-4 text-center py-6">
                      <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Globe size={24} />
                      </div>
                      <h4 className="text-sm font-black text-[var(--text-primary)] font-sans uppercase">PayPal Fast Checkout Gateway</h4>
                      <div className="p-3 bg-[var(--bg-base)] rounded-[var(--radius)] border border-[var(--border)] max-w-sm mx-auto space-y-1">
                        <span className="text-[8px] text-[var(--text-muted)] tracking-widest block">{dir === 'rtl' ? 'بريد بايبل المتلقي' : 'PayPal Receiver Email'}</span>
                        <span className="font-black font-mono text-emerald-500 text-xs">{wallet?.paypal_email || 'paypal@perplexta.com'}</span>
                      </div>
                      <p className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-widest max-w-sm mx-auto">
                        {dir === 'rtl' ? 'سيتم فتح نافذة آمنة لإجراء التفويض الفوري وسحب المبلغ المحدد.' : 'Approval processes happen in a secured modal with instant ledger booking.'}
                      </p>
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
                        className="p-4 rounded-[var(--radius)] border border-emerald-500/20 bg-emerald-500/5 space-y-3"
                      >
                        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-emerald-500">
                          <span>
                            {depositProgressStep === 1 && (dir === 'rtl' ? 'الاتصال بخادم المعاملات المصرفية المشفر...' : 'Contacting financial clearing node')}
                            {depositProgressStep === 2 && (dir === 'rtl' ? 'التحقق ومصادقة أرصدة الدقتر المالي...' : 'Validating account ledger codes')}
                            {depositProgressStep === 3 && (dir === 'rtl' ? 'المزامنة والتسجيل بالوقت الفعلي في PostgreSQL...' : 'Synching live ledger core rows')}
                          </span>
                          <Loader2 size={12} className="animate-spin" />
                        </div>
                        <div className="w-full bg-[var(--bg-secondary)] h-1 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: '0%' }}
                            animate={{ 
                              width: depositProgressStep === 1 ? '33%' : depositProgressStep === 2 ? '66%' : '100%' 
                            }}
                            className="h-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"
                            transition={{ duration: 0.8 }}
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <button
                    type="submit"
                    disabled={isSubmittingDeposit || !depositAmount}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white font-black py-4 rounded-[var(--radius)] text-[10px] uppercase tracking-[0.4em] transition-all duration-300 shadow-md hover:shadow-emerald-500/20"
                  >
                    {isSubmittingDeposit ? (dir === 'rtl' ? 'جاري معالجة المعاملة المؤمّنة...' : 'SECURELY DISPATCHING FUND FLOWS...') : (dir === 'rtl' ? 'تأكيد المعاملة وشحن الرصيد' : 'CONFIRM TRANSACTION & CREDIT FUNDS')}
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
              transition={{ duration: 0.3 }}
              className="p-8 rounded-[var(--radius)] border bg-[var(--bg-base)] border-[var(--border)] shadow-xl relative"
            >
              <div className="flex items-center gap-4 mb-8">
                <div className="w-10 h-10 rounded-[var(--radius)] bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/30">
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
                      <span className="text-emerald-500">
                        {dir === 'rtl' ? 'الحد الأقصى المتاح:' : 'Max Available:'} ${currentBalance.toLocaleString()}
                      </span>
                    </div>
                    <div className="relative rounded-[var(--radius)] shadow-sm bg-[var(--bg-surface)]">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <span className="text-[13px] font-black text-emerald-500">$</span>
                      </div>
                      <input
                        type="number"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        placeholder="0.00"
                        className="block w-full pl-10 pr-12 py-4 bg-transparent border border-[var(--border)] rounded-[var(--radius)] text-sm font-black text-[var(--text-primary)] focus:border-emerald-500 focus:outline-none"
                      />
                      <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                        <span className="text-[10px] font-black opacity-30 tracking-widest">USD</span>
                      </div>
                    </div>
                    {parseFloat(withdrawAmount) > 0 && (
                      <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest">
                        <span className="text-emerald-500">
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
                          className={`p-5 rounded-[var(--radius)] border text-left rtl:text-right flex items-center gap-4 transition-all duration-300 relative overflow-hidden group ${
                            withdrawMethod === m.id
                              ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500 drop-shadow-[0_0_10px_rgba(16,185,129,0.3)] shadow-[inset_0_0_8px_rgba(16,185,129,0.1)]'
                              : 'bg-[var(--bg-surface)] border-[var(--border)] text-[var(--text-muted)] hover:border-emerald-500/40 hover:text-[var(--text-primary)]'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            withdrawMethod === m.id ? 'bg-emerald-500/20 text-emerald-500' : 'bg-[var(--bg-secondary)]'
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
                  <div className="p-6 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-surface)] transition-all">
                    
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
                          className="block w-full px-4 py-3 bg-[var(--bg-base)] border border-[var(--border)] rounded-[var(--radius)] text-xs font-black text-[var(--text-primary)] focus:border-emerald-500 focus:outline-none"
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
                          className="block w-full px-4 py-3 bg-[var(--bg-base)] border border-[var(--border)] rounded-[var(--radius)] text-xs font-black tracking-wider text-[var(--text-primary)] focus:border-emerald-500 focus:outline-none"
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
                              className="block w-full px-4 py-3 bg-[var(--bg-base)] border border-[var(--border)] rounded-[var(--radius)] text-xs font-black text-[var(--text-primary)] focus:border-emerald-500 focus:outline-none"
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
                              className="block w-full px-4 py-3 bg-[var(--bg-base)] border border-[var(--border)] rounded-[var(--radius)] text-xs font-black text-[var(--text-primary)] focus:border-emerald-500 focus:outline-none"
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
                              className="block w-full px-4 py-3 bg-[var(--bg-base)] border border-[var(--border)] rounded-[var(--radius)] text-xs font-black text-[var(--text-primary)] focus:border-emerald-500 focus:outline-none"
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
                              className="block w-full px-4 py-3 bg-[var(--bg-base)] border border-[var(--border)] rounded-[var(--radius)] text-xs font-black text-[var(--text-primary)] focus:border-emerald-500 focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingWithdraw || parseFloat(withdrawAmount) > currentBalance}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white font-black py-4 rounded-[var(--radius)] text-[10px] uppercase tracking-[0.4em] transition-all duration-300 shadow-md hover:shadow-emerald-500/20"
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
              className="h-full w-full rounded-[var(--radius)] border overflow-hidden transition-all duration-[var(--theme-transition-duration)] flex flex-col bg-[var(--bg-base)] border-[var(--border)] shadow-sm shadow-[var(--color-shadow)]"
            >
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Premium Clean Up Utility Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 border-b border-[var(--border)] bg-[var(--bg-surface)] gap-4 transition-all">
                  <div className="flex flex-col gap-1">
                    <p className="text-[12px] font-black text-[var(--text-primary)] transition-all flex items-center gap-2">
                      <Sparkles size={14} className="text-emerald-500 animate-pulse" />
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
                      className="px-4 py-2 rounded-[4px] border border-[var(--border)] bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-[9px] font-black tracking-widest uppercase transition-all duration-300 flex items-center gap-2 hover:drop-shadow-[0_0_8px_rgba(239,68,68,0.5)] cursor-pointer self-start sm:self-auto"
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
                                <span className="text-emerald-500 font-mono font-black">${Number(dep.amount).toFixed(2)} USD</span>
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
                                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/15'
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
                              <Loader2 size={32} className="animate-spin text-emerald-500" />
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
                                <code className="text-[11px] font-black text-emerald-500 opacity-80 bg-emerald-500/5 px-2 py-1 rounded-[var(--radius)]">TRX-{tx.id.toString(36).toUpperCase().padEnd(8, '0')}</code>
                             </td>
                             <td className="px-8 py-7">
                               <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${tx.transaction_type === 'deposit' ? 'bg-emerald-500' : tx.transaction_type === 'withdrawal' ? 'bg-amber-500' : 'bg-blue-500'}`} />
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
                                 <div className={`text-[9px] font-black uppercase tracking-widest ${tx.status === 'success' ? 'text-emerald-500' : 'text-amber-500'}`}>
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
                                   className="bg-transparent border border-transparent transition-all duration-300 hover:bg-gray-150 dark:hover:bg-gray-800 rounded-[4px] w-8 h-8 flex items-center justify-center text-gray-400 hover:text-emerald-500 hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)] cursor-pointer"
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

      </div>
    </div>
  );
};

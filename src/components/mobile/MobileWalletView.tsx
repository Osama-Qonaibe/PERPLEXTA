import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Wallet,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Sparkles,
  History,
  Eye,
  EyeOff,
  ShieldCheck,
  CreditCard,
  Building,
  Smartphone,
  Globe,
  Trash2,
  Copy,
  Check,
  Loader2,
  ArrowLeft,
  ArrowRight,
  Send,
  RefreshCw,
  Share2,
  CheckCircle2,
  Coins
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export interface MobileWalletViewProps {
  wallet: any;
  currentBalance: number;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  transactions: any[];
  manualDeposits: any[];
  loading: boolean;
  dir: 'ltr' | 'rtl';
  theme?: string;
  handleClearAllHistory: () => void;
  handleHideTransaction: (id: number) => void;
  depositAmount: string;
  setDepositAmount?: (val: string) => void;
  handleDepositAmountChange: (val: string) => void;
  handleDepositAmountBlur: () => void;
  selectPredefinedAmount: (val: string) => void;
  depositMethod: 'card' | 'crypto' | 'bank' | 'paypal';
  setDepositMethod: (method: any) => void;
  isSubmittingDeposit: boolean;
  handleDepositSubmit: (e: React.FormEvent) => void;
  isStripeActive: boolean;
  isPaypalActive: boolean;
  withdrawAmount: string;
  setWithdrawAmount?: (val: string) => void;
  handleWithdrawAmountChange: (val: string) => void;
  handleWithdrawAmountBlur: (balance: number) => void;
  selectWithdrawPredefinedAmount: (val: string, balance: number) => void;
  withdrawMethod: 'paypal' | 'bank' | 'crypto';
  setWithdrawMethod: (method: any) => void;
  withdrawDetails: string;
  setWithdrawDetails: (val: string) => void;
  withdrawHolderName: string;
  setWithdrawHolderName: (val: string) => void;
  withdrawBankName: string;
  setWithdrawBankName: (val: string) => void;
  withdrawBankIBAN: string;
  setWithdrawBankIBAN: (val: string) => void;
  withdrawSwift: string;
  setWithdrawSwift: (val: string) => void;
  isSubmittingWithdraw: boolean;
  handleWithdrawSubmit: (e: React.FormEvent) => void;
  copyToClipboard: (text: string) => void;
  isCopied: boolean;
  manualRefId: string;
  setManualRefId: (val: string) => void;
  manualProofFile: File | null;
  setManualProofFile: (file: File | null) => void;
  onRefresh?: () => Promise<void> | void;
  handleConvertPoints?: (points: number) => Promise<boolean>;
}

export const MobileWalletView: React.FC<MobileWalletViewProps> = ({
  wallet,
  currentBalance,
  activeTab,
  setActiveTab,
  transactions,
  manualDeposits,
  loading,
  dir,
  handleClearAllHistory,
  handleHideTransaction,
  depositAmount,
  handleDepositAmountChange,
  handleDepositAmountBlur,
  selectPredefinedAmount,
  depositMethod,
  setDepositMethod,
  isSubmittingDeposit,
  handleDepositSubmit,
  isStripeActive,
  isPaypalActive,
  withdrawAmount,
  handleWithdrawAmountChange,
  handleWithdrawAmountBlur,
  selectWithdrawPredefinedAmount,
  withdrawMethod,
  setWithdrawMethod,
  withdrawDetails,
  setWithdrawDetails,
  withdrawHolderName,
  setWithdrawHolderName,
  withdrawBankName,
  setWithdrawBankName,
  withdrawBankIBAN,
  setWithdrawBankIBAN,
  withdrawSwift,
  setWithdrawSwift,
  isSubmittingWithdraw,
  handleWithdrawSubmit,
  copyToClipboard,
  isCopied,
  manualRefId,
  setManualRefId,
  manualProofFile,
  setManualProofFile,
  onRefresh,
  handleConvertPoints
}) => {
  const isRtl = dir === 'rtl';
  const [showBalance, setShowBalance] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [convertAmount, setConvertAmount] = useState<string>('1000');
  const [isConverting, setIsConverting] = useState(false);

  // Manual Trigger Refresh with Animation
  const handleManualRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      if (onRefresh) {
        await onRefresh();
      }
      toast.success(isRtl ? 'تمت مزامنة بيانات المحفظة بنجاح بالوقت الفعلي' : 'Wallet synchronized in real-time');
    } catch {
      toast.error(isRtl ? 'تعذرت المزامنة' : 'Sync failed');
    } finally {
      setTimeout(() => setIsRefreshing(false), 600);
    }
  };

  // Convert points submit handler
  const handleConvertSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const pts = parseInt(convertAmount, 10);
    const availablePoints = wallet?.points || 0;
    if (isNaN(pts) || pts < 100) {
      toast.error(isRtl ? 'الحد الأدنى للتحويل هو 100 نقطة' : 'Minimum conversion is 100 points');
      return;
    }
    if (pts > availablePoints) {
      toast.error(isRtl ? 'رصيد النقاط لديك غير كافٍ لإتمام العملية' : 'Insufficient points balance');
      return;
    }
    if (handleConvertPoints) {
      setIsConverting(true);
      await handleConvertPoints(pts);
      setIsConverting(false);
    }
  };

  // Filter tabs for transactions view
  const transactionTabs = [
    { id: 'transactions', label: isRtl ? 'الإيداعات' : 'Deposits' },
    { id: 'withdrawal_history', label: isRtl ? 'السحوبات' : 'Withdrawals' },
    { id: 'earnings', label: isRtl ? 'المكافآت والنقاط' : 'Rewards' },
    { id: 'expenses', label: isRtl ? 'كل العمليات' : 'All Activity' }
  ];

  const pointsCount = wallet?.points ? Number(wallet.points) : 0;
  const referralLink = `${window.location.origin}/register?ref=${wallet?.referral_code || 'VIP'}`;

  return (
    <div className="w-full flex flex-col space-y-3.5 pb-16 select-none">
      
      {/* 1. Top Real-time Status Bar */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--status-success-subtle)] border border-[var(--fg-success)]/20 text-[var(--fg-success)]">
          <span className="w-2 h-2 rounded-full bg-[var(--fg-success)] animate-pulse" />
          <span className="text-[10px] font-bold tracking-tight">
            {isRtl ? 'مزامنة مباشرة بالوقت الفعلي' : 'Real-time Live Sync'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="p-1.5 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-main)] text-[var(--text-muted)] hover:text-accent active:scale-90 transition-all cursor-pointer"
            title={isRtl ? 'تحديث الرصيد يدوياً' : 'Refresh wallet'}
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin text-accent' : ''} />
          </button>
          <button
            type="button"
            onClick={() => setShowBalance(!showBalance)}
            className="p-1.5 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-main)] text-[var(--text-muted)] hover:text-[var(--text-primary)] active:scale-90 transition-all cursor-pointer"
            title={showBalance ? (isRtl ? 'إخفاء الرصيد' : 'Hide balance') : (isRtl ? 'إظهار الرصيد' : 'Show balance')}
          >
            {showBalance ? <Eye size={14} /> : <EyeOff size={14} />}
          </button>
        </div>
      </div>

      {/* 2. Top Primary Action Bar (Reordered to Top for Elite Accessibility) */}
      <div className="grid grid-cols-4 gap-2">
        {/* Button 1: Top Up / Deposit */}
        <button
          type="button"
          onClick={() => setActiveTab('deposit')}
          className={`flex flex-col items-center gap-1.5 p-2.5 rounded-2xl border transition-all active:scale-95 cursor-pointer shadow-xs ${
            activeTab === 'deposit'
              ? 'bg-[var(--bg-accent-emphasis)] text-[var(--fg-on-emphasis)] border-transparent ring-2 ring-accent/30'
              : 'bg-[var(--surface-card)] border-[var(--border-main)] hover:border-accent/40'
          }`}
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
            activeTab === 'deposit'
              ? 'bg-white/20 text-white'
              : 'bg-[var(--status-success-subtle)] text-[var(--fg-success)]'
          }`}>
            <Plus size={20} strokeWidth={2.5} />
          </div>
          <span className={`text-[11px] font-bold leading-none ${activeTab === 'deposit' ? 'text-white' : 'text-[var(--text-primary)]'}`}>
            {isRtl ? 'إيداع' : 'Top Up'}
          </span>
        </button>

        {/* Button 2: Withdraw */}
        <button
          type="button"
          onClick={() => setActiveTab('withdraw')}
          className={`flex flex-col items-center gap-1.5 p-2.5 rounded-2xl border transition-all active:scale-95 cursor-pointer shadow-xs ${
            activeTab === 'withdraw'
              ? 'bg-[var(--bg-accent-emphasis)] text-[var(--fg-on-emphasis)] border-transparent ring-2 ring-accent/30'
              : 'bg-[var(--surface-card)] border-[var(--border-main)] hover:border-accent/40'
          }`}
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
            activeTab === 'withdraw'
              ? 'bg-white/20 text-white'
              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
          }`}>
            <ArrowUpRight size={20} strokeWidth={2.5} />
          </div>
          <span className={`text-[11px] font-bold leading-none ${activeTab === 'withdraw' ? 'text-white' : 'text-[var(--text-primary)]'}`}>
            {isRtl ? 'سحب' : 'Withdraw'}
          </span>
        </button>

        {/* Button 3: Points & Rewards */}
        <button
          type="button"
          onClick={() => setActiveTab('earnings')}
          className={`flex flex-col items-center gap-1.5 p-2.5 rounded-2xl border transition-all active:scale-95 cursor-pointer shadow-xs ${
            activeTab === 'earnings'
              ? 'bg-[var(--bg-accent-emphasis)] text-[var(--fg-on-emphasis)] border-transparent ring-2 ring-accent/30'
              : 'bg-[var(--surface-card)] border-[var(--border-main)] hover:border-accent/40'
          }`}
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
            activeTab === 'earnings'
              ? 'bg-white/20 text-white'
              : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
          }`}>
            <Sparkles size={18} strokeWidth={2.4} />
          </div>
          <span className={`text-[11px] font-bold leading-none ${activeTab === 'earnings' ? 'text-white' : 'text-[var(--text-primary)]'}`}>
            {isRtl ? 'المكافآت' : 'Rewards'}
          </span>
        </button>

        {/* Button 4: History / Statement */}
        <button
          type="button"
          onClick={() => setActiveTab('transactions')}
          className={`flex flex-col items-center gap-1.5 p-2.5 rounded-2xl border transition-all active:scale-95 cursor-pointer shadow-xs ${
            activeTab === 'transactions' || activeTab === 'withdrawal_history' || activeTab === 'expenses'
              ? 'bg-[var(--bg-accent-emphasis)] text-[var(--fg-on-emphasis)] border-transparent ring-2 ring-accent/30'
              : 'bg-[var(--surface-card)] border-[var(--border-main)] hover:border-accent/40'
          }`}
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
            activeTab === 'transactions' || activeTab === 'withdrawal_history' || activeTab === 'expenses'
              ? 'bg-white/20 text-white'
              : 'bg-[var(--surface-subtle)] text-[var(--text-muted)]'
          }`}>
            <History size={18} strokeWidth={2.4} />
          </div>
          <span className={`text-[11px] font-bold leading-none ${
            activeTab === 'transactions' || activeTab === 'withdrawal_history' || activeTab === 'expenses'
              ? 'text-white'
              : 'text-[var(--text-primary)]'
          }`}>
            {isRtl ? 'السجل' : 'History'}
          </span>
        </button>
      </div>

      {/* 3. Virtual Banking Digital Card (Hero Component) */}
      <div className="relative w-full rounded-2xl p-5 bg-gradient-to-br from-[var(--surface-card)] via-[var(--surface-card)] to-[var(--surface-subtle)] border border-[var(--border-main)] shadow-sm overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-accent/5 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-32 h-32 rounded-full bg-accent/5 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col space-y-3.5">
          {/* Card Top: Brand & Badge */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[var(--bg-accent-emphasis)]/10 text-accent flex items-center justify-center border border-[var(--border-accent)]/30">
                <Wallet size={16} strokeWidth={2.2} />
              </div>
              <div>
                <p className="text-[11px] font-black tracking-wider text-[var(--text-primary)] leading-tight uppercase">
                  PERPLEXTA
                </p>
                <p className="text-[9px] font-semibold text-[var(--text-muted)] leading-tight">
                  {isRtl ? 'الدفتر المالي المعتمد' : 'Verified Ledger'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent">
              <ShieldCheck size={12} />
              <span className="text-[9px] font-extrabold tracking-tight">Enterprise VIP</span>
            </div>
          </div>

          {/* Balance Section */}
          <div className="pt-1">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                {isRtl ? 'الرصيد المتاح للتشغيل والمشتريات' : 'Available Liquidity Balance'}
              </p>
              <div className="flex items-center gap-1 text-[10px] font-bold text-amber-500">
                <Coins size={12} />
                <span>{pointsCount.toLocaleString()} PTS</span>
              </div>
            </div>

            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-bold text-accent">$</span>
              <span className="text-3xl font-black tracking-tight text-[var(--text-primary)] font-mono">
                {showBalance
                  ? currentBalance.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })
                  : '••••••'}
              </span>
              <span className="text-xs font-bold text-[var(--text-muted)] ml-1">USD</span>
            </div>
          </div>

          {/* Card Bottom: Masked Number & Audit Status */}
          <div className="pt-2 border-t border-[var(--border-main)]/60 flex items-center justify-between text-[10px] font-medium text-[var(--text-muted)]">
            <div className="font-mono tracking-widest text-[var(--text-primary)] font-bold">
              •••• •••• •••• 8842
            </div>
            <div className="flex items-center gap-1 text-[var(--fg-success)] font-bold">
              <CheckCircle2 size={12} />
              <span>{isRtl ? 'مدقق ومشفر 100%' : '100% Audited'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Dynamic Interactive Panels */}
      <AnimatePresence mode="wait">
        
        {/* ===================== VIEW 1: DEPOSIT PORTAL ===================== */}
        {activeTab === 'deposit' && (
          <motion.div
            key="mobile-deposit-view"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-4 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-main)] space-y-4 shadow-sm"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-main)]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[var(--status-success-subtle)] text-[var(--fg-success)] flex items-center justify-center">
                  <Plus size={18} strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-xs font-black text-[var(--text-primary)]">
                    {isRtl ? 'شحن رصيد المحفظة الفوري' : 'Instant Top Up Portal'}
                  </h3>
                  <p className="text-[10px] text-[var(--text-muted)]">
                    {isRtl ? 'الحد الأدنى: 10$ | الحد الأقصى: 1000$' : 'Min: $10 | Max: $1,000 USD'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('transactions')}
                className="text-[11px] font-bold text-accent hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                {isRtl ? 'إلغاء' : 'Cancel'}
              </button>
            </div>

            <form onSubmit={handleDepositSubmit} className="space-y-3.5">
              {/* Preset Buttons */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  {isRtl ? 'المبالغ المقترحة:' : 'Quick Select Amount:'}
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {['50', '150', '250', '500', '1000'].map((val) => (
                    <button
                      key={`mob-preset-${val}`}
                      type="button"
                      onClick={() => selectPredefinedAmount(val)}
                      className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        depositAmount === val
                          ? 'bg-[var(--bg-accent-emphasis)] text-[var(--fg-on-emphasis)] shadow-xs'
                          : 'bg-[var(--surface-subtle)] text-[var(--text-primary)] border border-[var(--border-main)] hover:border-accent'
                      }`}
                    >
                      ${val}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Input */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  {isRtl ? 'أو أدخل مبلغاً مخصصاً ($):' : 'Custom Amount (USD):'}
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-3 flex items-center text-sm font-bold text-accent">
                    $
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={depositAmount}
                    onChange={(e) => handleDepositAmountChange(e.target.value)}
                    onBlur={handleDepositAmountBlur}
                    placeholder="100.00"
                    className="w-full pl-8 pr-12 py-2.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-main)] text-sm font-bold text-[var(--text-primary)] focus:border-accent focus:outline-none"
                  />
                  <span className="absolute inset-y-0 right-3 flex items-center text-[10px] font-bold text-[var(--text-muted)]">
                    USD
                  </span>
                </div>
              </div>

              {/* Method Selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  {isRtl ? 'اختر وسيلة الدفع:' : 'Payment Method:'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'card', name: isRtl ? 'بطاقة بنكية (Stripe)' : 'Credit Card', icon: <CreditCard size={15} />, active: isStripeActive },
                    { id: 'crypto', name: isRtl ? 'USDT (TRC-20)' : 'USDT Crypto', icon: <Smartphone size={15} />, active: true },
                    { id: 'paypal', name: isRtl ? 'بايبال (PayPal)' : 'PayPal', icon: <Globe size={15} />, active: isPaypalActive },
                    { id: 'bank', name: isRtl ? 'تحويل بنكي' : 'Bank Wire', icon: <Building size={15} />, active: true }
                  ].map((m) => (
                    <button
                      key={`mob-pay-${m.id}`}
                      type="button"
                      onClick={() => setDepositMethod(m.id as any)}
                      className={`p-2.5 rounded-xl border flex items-center gap-2 transition-all cursor-pointer ${
                        depositMethod === m.id
                          ? 'bg-[var(--bg-accent-emphasis)]/10 border-accent text-accent font-bold shadow-xs'
                          : 'bg-[var(--surface-subtle)] border-[var(--border-main)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {m.icon}
                      <span className="text-[11px] font-bold truncate">{m.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Crypto USDT (TRC-20) Panel */}
              {depositMethod === 'crypto' && (
                <div className="p-3.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-main)] space-y-2.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-[var(--text-primary)]">
                    <span>{isRtl ? 'عنوان المحفظة (USDT - TRC20):' : 'USDT TRC-20 Wallet Address:'}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(wallet?.crypto_address || 'TPnB82hPZk7dZ6eU5rX9Y21pQ6')}
                      className="flex items-center gap-1 text-accent font-bold cursor-pointer"
                    >
                      {isCopied ? <Check size={12} /> : <Copy size={12} />}
                      <span>{isCopied ? (isRtl ? 'تم النسخ' : 'Copied') : (isRtl ? 'نسخ' : 'Copy')}</span>
                    </button>
                  </div>
                  <code className="block p-2 rounded-lg bg-[var(--surface-card)] border border-[var(--border-main)] text-[11px] font-mono text-[var(--text-primary)] break-all select-all font-bold">
                    {wallet?.crypto_address || 'TPnB82hPZk7dZ6eU5rX9Y21pQ6'}
                  </code>

                  <div className="space-y-1 pt-1">
                    <label className="text-[10px] font-bold text-[var(--text-muted)]">
                      {isRtl ? 'رقم الحوالة أو الهاش (TXID):' : 'Transaction Reference / TXID:'}
                    </label>
                    <input
                      type="text"
                      required
                      value={manualRefId}
                      onChange={(e) => setManualRefId(e.target.value)}
                      placeholder="e.g. 748f93021bc89..."
                      className="w-full px-3 py-2 rounded-lg bg-[var(--surface-card)] border border-[var(--border-main)] text-xs font-mono text-[var(--text-primary)] focus:border-accent focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[var(--text-muted)]">
                      {isRtl ? 'صورة إشعار التحويل (اختياري):' : 'Receipt Screenshot (Optional):'}
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setManualProofFile(e.target.files?.[0] || null)}
                      className="w-full text-[10px] text-[var(--text-muted)] file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-[10px] file:font-bold file:bg-accent file:text-white"
                    />
                  </div>
                </div>
              )}

              {/* Bank Wire Panel */}
              {depositMethod === 'bank' && (
                <div className="p-3.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-main)] space-y-2 text-xs">
                  <p className="text-[11px] font-bold text-[var(--text-primary)]">
                    {isRtl ? 'بيانات التحويل البنكي المعتمد:' : 'Direct Wire Banking Details:'}
                  </p>
                  <div className="space-y-1.5 text-[10px] text-[var(--text-muted)] font-mono bg-[var(--surface-card)] p-2.5 rounded-lg border border-[var(--border-main)]">
                    <div className="flex justify-between"><span>Bank:</span><span className="font-bold text-[var(--text-primary)]">{wallet?.bank_name || 'Standard Chartered'}</span></div>
                    <div className="flex justify-between"><span>Recipient:</span><span className="font-bold text-[var(--text-primary)]">{wallet?.bank_recipient || 'Perplexta Global Ltd'}</span></div>
                    <div className="flex justify-between"><span>IBAN:</span><span className="font-bold text-[var(--text-primary)]">{wallet?.bank_iban || 'GB29NWBK60161331926819'}</span></div>
                    <div className="flex justify-between"><span>SWIFT:</span><span className="font-bold text-[var(--text-primary)]">{wallet?.bank_swift || 'SCBLUS33XXX'}</span></div>
                  </div>

                  <div className="space-y-1 pt-1">
                    <label className="text-[10px] font-bold text-[var(--text-muted)]">
                      {isRtl ? 'رقم الإشعار البنكي / رقم العملية:' : 'Bank Transfer Reference #:'}
                    </label>
                    <input
                      type="text"
                      required
                      value={manualRefId}
                      onChange={(e) => setManualRefId(e.target.value)}
                      placeholder="e.g. WIRE-89421"
                      className="w-full px-3 py-2 rounded-lg bg-[var(--surface-card)] border border-[var(--border-main)] text-xs font-mono text-[var(--text-primary)] focus:border-accent focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Submit Action */}
              <button
                type="submit"
                disabled={isSubmittingDeposit}
                className="w-full py-3.5 rounded-xl bg-[var(--bg-accent-emphasis)] text-[var(--fg-on-emphasis)] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm active:scale-98 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSubmittingDeposit ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>{isRtl ? 'جاري الاتصال والتأكيد المشفر...' : 'Processing...'}</span>
                  </>
                ) : (
                  <>
                    <Plus size={16} strokeWidth={2.5} />
                    <span>{isRtl ? `تأكيد إيداع $${depositAmount || '0'} USD` : `Confirm $${depositAmount || '0'} Deposit`}</span>
                  </>
                )}
              </button>
            </form>
          </motion.div>
        )}

        {/* ===================== VIEW 2: WITHDRAWAL PORTAL ===================== */}
        {activeTab === 'withdraw' && (
          <motion.div
            key="mobile-withdraw-view"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-4 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-main)] space-y-4 shadow-sm"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-main)]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <ArrowUpRight size={18} strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-xs font-black text-[var(--text-primary)]">
                    {isRtl ? 'طلب سحب الأرباح والسيولة' : 'Withdrawal Request Portal'}
                  </h3>
                  <p className="text-[10px] text-[var(--text-muted)]">
                    {isRtl ? `الرصيد المتاح: $${currentBalance.toFixed(2)} USD` : `Available: $${currentBalance.toFixed(2)} USD`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('transactions')}
                className="text-[11px] font-bold text-accent hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                {isRtl ? 'إلغاء' : 'Cancel'}
              </button>
            </div>

            <form onSubmit={handleWithdrawSubmit} className="space-y-3.5">
              {/* Quick Amount Selectors */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  {isRtl ? 'المبالغ السريعة:' : 'Quick Select Amount:'}
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {['20', '50', '100', '250'].map((val) => (
                    <button
                      key={`mob-w-preset-${val}`}
                      type="button"
                      onClick={() => selectWithdrawPredefinedAmount(val, currentBalance)}
                      className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        withdrawAmount === val
                          ? 'bg-[var(--bg-accent-emphasis)] text-[var(--fg-on-emphasis)] shadow-xs'
                          : 'bg-[var(--surface-subtle)] text-[var(--text-primary)] border border-[var(--border-main)] hover:border-accent'
                      }`}
                    >
                      ${val}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Input */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  {isRtl ? 'المبلغ المطلوب سحبه ($):' : 'Withdraw Amount (USD):'}
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-3 flex items-center text-sm font-bold text-accent">
                    $
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={withdrawAmount}
                    onChange={(e) => handleWithdrawAmountChange(e.target.value)}
                    onBlur={() => handleWithdrawAmountBlur(currentBalance)}
                    placeholder="50.00"
                    className="w-full pl-8 pr-12 py-2.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-main)] text-sm font-bold text-[var(--text-primary)] focus:border-accent focus:outline-none"
                  />
                  <span className="absolute inset-y-0 right-3 flex items-center text-[10px] font-bold text-[var(--text-muted)]">
                    USD
                  </span>
                </div>
              </div>

              {/* Payout Channels */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  {isRtl ? 'وسيلة التحويل والسحب:' : 'Payout Channel:'}
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'paypal', name: isRtl ? 'بايبال' : 'PayPal', icon: <Globe size={14} /> },
                    { id: 'crypto', name: isRtl ? 'USDT (TRC20)' : 'USDT TRC20', icon: <Smartphone size={14} /> },
                    { id: 'bank', name: isRtl ? 'تحويل بنكي' : 'Bank Wire', icon: <Building size={14} /> }
                  ].map((m) => (
                    <button
                      key={`mob-w-channel-${m.id}`}
                      type="button"
                      onClick={() => setWithdrawMethod(m.id as any)}
                      className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                        withdrawMethod === m.id
                          ? 'bg-[var(--bg-accent-emphasis)]/10 border-accent text-accent font-bold shadow-xs'
                          : 'bg-[var(--surface-subtle)] border-[var(--border-main)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {m.icon}
                      <span className="text-[10px] font-bold">{m.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Channel Detail Inputs */}
              {withdrawMethod === 'paypal' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[var(--text-muted)]">
                    {isRtl ? 'البريد الإلكتروني لحساب بايبال:' : 'PayPal Email:'}
                  </label>
                  <input
                    type="email"
                    required
                    value={withdrawDetails}
                    onChange={(e) => setWithdrawDetails(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full px-3 py-2.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-main)] text-xs font-bold text-[var(--text-primary)] focus:border-accent focus:outline-none"
                  />
                </div>
              )}

              {withdrawMethod === 'crypto' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[var(--text-muted)]">
                    {isRtl ? 'عنوان محفظة USDT (TRC-20):' : 'USDT TRC-20 Address:'}
                  </label>
                  <input
                    type="text"
                    required
                    value={withdrawDetails}
                    onChange={(e) => setWithdrawDetails(e.target.value)}
                    placeholder="T..."
                    className="w-full px-3 py-2.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-main)] text-xs font-mono text-[var(--text-primary)] focus:border-accent focus:outline-none"
                  />
                </div>
              )}

              {withdrawMethod === 'bank' && (
                <div className="space-y-2">
                  <input
                    type="text"
                    required
                    value={withdrawHolderName}
                    onChange={(e) => setWithdrawHolderName(e.target.value)}
                    placeholder={isRtl ? 'اسم صاحب الحساب' : 'Account Holder Name'}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-main)] text-xs font-bold text-[var(--text-primary)] focus:border-accent focus:outline-none"
                  />
                  <input
                    type="text"
                    required
                    value={withdrawBankName}
                    onChange={(e) => setWithdrawBankName(e.target.value)}
                    placeholder={isRtl ? 'اسم البنك' : 'Bank Name'}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-main)] text-xs font-bold text-[var(--text-primary)] focus:border-accent focus:outline-none"
                  />
                  <input
                    type="text"
                    required
                    value={withdrawBankIBAN}
                    onChange={(e) => setWithdrawBankIBAN(e.target.value)}
                    placeholder={isRtl ? 'رقم IBAN أو الحساب' : 'IBAN / Account Number'}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-main)] text-xs font-mono text-[var(--text-primary)] focus:border-accent focus:outline-none"
                  />
                  <input
                    type="text"
                    value={withdrawSwift}
                    onChange={(e) => setWithdrawSwift(e.target.value)}
                    placeholder={isRtl ? 'رمز SWIFT / BIC (اختياري)' : 'SWIFT / BIC Code'}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-main)] text-xs font-mono text-[var(--text-primary)] focus:border-accent focus:outline-none"
                  />
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmittingWithdraw || parseFloat(withdrawAmount) > currentBalance || currentBalance < 10}
                className="w-full py-3.5 rounded-xl bg-amber-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm active:scale-98 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSubmittingWithdraw ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>{isRtl ? 'جاري إرسال الطلب للمراجعة...' : 'Submitting...'}</span>
                  </>
                ) : (
                  <>
                    <Send size={15} />
                    <span>{isRtl ? `طلب سحب $${withdrawAmount || '0'} USD` : `Submit $${withdrawAmount || '0'} Withdrawal`}</span>
                  </>
                )}
              </button>
            </form>
          </motion.div>
        )}

        {/* ===================== VIEW 3: POINTS & REWARDS PORTAL ===================== */}
        {activeTab === 'earnings' && (
          <motion.div
            key="mobile-points-view"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-3.5"
          >
            {/* Points Conversion Card */}
            <div className="p-4 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-main)] space-y-3.5 shadow-sm">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--border-main)]">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                    <Sparkles size={18} strokeWidth={2.4} />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-[var(--text-primary)]">
                      {isRtl ? 'تحويل نقاط المكافآت إلى رصيد' : 'Points to Cash Converter'}
                    </h3>
                    <p className="text-[10px] text-[var(--text-muted)]">
                      {isRtl ? '1,000 نقطة = $1.00 USD في رصيدك فوراً' : '1,000 Points = $1.00 USD Instant Credit'}
                    </p>
                  </div>
                </div>

                <div className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-bold">
                  {pointsCount.toLocaleString()} PTS
                </div>
              </div>

              <form onSubmit={handleConvertSubmit} className="space-y-3">
                {/* Conversion Input */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    {isRtl ? 'عدد النقاط المراد تحويلها:' : 'Points to Convert:'}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="100"
                      step="100"
                      value={convertAmount}
                      onChange={(e) => setConvertAmount(e.target.value)}
                      placeholder="1000"
                      className="w-full pl-4 pr-16 py-2.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-main)] text-sm font-bold text-[var(--text-primary)] focus:border-accent focus:outline-none"
                    />
                    <span className="absolute inset-y-0 right-3 flex items-center text-[10px] font-bold text-accent">
                      PTS
                    </span>
                  </div>
                </div>

                {/* Preset Points Buttons */}
                <div className="grid grid-cols-4 gap-1.5">
                  {['500', '1000', '2500', pointsCount.toString()].map((ptsVal, idx) => (
                    <button
                      key={`pts-preset-${idx}`}
                      type="button"
                      onClick={() => setConvertAmount(ptsVal)}
                      className={`py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                        convertAmount === ptsVal
                          ? 'bg-[var(--bg-accent-emphasis)] text-[var(--fg-on-emphasis)]'
                          : 'bg-[var(--surface-subtle)] text-[var(--text-primary)] border border-[var(--border-main)]'
                      }`}
                    >
                      {idx === 3 ? (isRtl ? 'الكل' : 'All') : `${ptsVal}`}
                    </button>
                  ))}
                </div>

                {/* Live Value Calculation Preview */}
                <div className="p-2.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-main)] flex items-center justify-between text-xs">
                  <span className="text-[11px] font-bold text-[var(--text-muted)]">
                    {isRtl ? 'القيمة المالية الناتجة:' : 'Estimated USD Value:'}
                  </span>
                  <span className="font-mono font-black text-[var(--fg-success)]">
                    +${(Math.max(0, parseInt(convertAmount, 10) || 0) / 1000).toFixed(2)} USD
                  </span>
                </div>

                {/* Submit Convert Button */}
                <button
                  type="submit"
                  disabled={isConverting || pointsCount < 100 || parseInt(convertAmount, 10) > pointsCount}
                  className="w-full py-3 rounded-xl bg-indigo-600 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm active:scale-98 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isConverting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>{isRtl ? 'جاري التحويل الفوري...' : 'Converting...'}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={15} />
                      <span>{isRtl ? 'تحويل النقاط لرصيد فوري' : 'Convert to Instant Cash'}</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Referral Tree Card */}
            <div className="p-4 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-main)] space-y-3 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center">
                  <Share2 size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[var(--text-primary)]">
                    {isRtl ? 'رابط الإحالة ونظام الأرباح' : 'Referral Rewards System'}
                  </h4>
                  <p className="text-[10px] text-[var(--text-muted)]">
                    {isRtl ? 'احصل على عمولات ونقاط مع كل دعوة جديدة' : 'Earn commission points for every invite'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <code className="flex-1 p-2.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-main)] text-[10px] font-mono text-[var(--text-primary)] truncate">
                  {referralLink}
                </code>
                <button
                  type="button"
                  onClick={() => copyToClipboard(referralLink)}
                  className="px-3 py-2.5 rounded-xl bg-[var(--bg-accent-emphasis)] text-[var(--fg-on-emphasis)] text-xs font-bold flex items-center gap-1 active:scale-95 cursor-pointer"
                >
                  {isCopied ? <Check size={14} /> : <Copy size={14} />}
                  <span>{isCopied ? (isRtl ? 'تم' : 'Done') : (isRtl ? 'نسخ' : 'Copy')}</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ===================== VIEW 4: TRANSACTIONS & HISTORY ===================== */}
        {activeTab !== 'deposit' && activeTab !== 'withdraw' && activeTab !== 'earnings' && (
          <motion.div
            key="mobile-history-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-main)] overflow-x-auto no-scrollbar scrollbar-none">
              {transactionTabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={`mob-tab-${tab.id}`}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 py-1.5 px-2.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all text-center cursor-pointer shrink-0 ${
                      isActive
                        ? 'bg-[var(--surface-card)] text-accent shadow-xs'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Pending Deposits Notice if any */}
            {activeTab === 'transactions' && manualDeposits.length > 0 && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-2">
                <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 text-xs font-bold">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                  <span>{isRtl ? 'عمليات إيداع قيد المراجعة الفورية' : 'Pending Review Deposits'}</span>
                </div>
                {manualDeposits.map((dep, idx) => (
                  <div key={`mob-manual-${dep.id || idx}`} className="p-2 rounded-lg bg-[var(--surface-card)] border border-[var(--border-main)] flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-[var(--text-primary)]">${Number(dep.amount).toFixed(2)} USD</p>
                      <p className="text-[10px] text-[var(--text-muted)] font-mono">{dep.method}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                      {isRtl ? 'قيد التدقيق' : 'Pending'}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Transactions List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                  {isRtl ? 'الحركات والتدقيق المالي' : 'Ledger Feed'}
                </p>
                {transactions.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAllHistory}
                    className="flex items-center gap-1 text-[10px] font-bold text-rose-500 hover:text-rose-600 active:scale-95 transition-transform cursor-pointer"
                  >
                    <Trash2 size={12} />
                    <span>{isRtl ? 'أرشفة السجل' : 'Archive'}</span>
                  </button>
                )}
              </div>

              {loading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-[var(--text-muted)]">
                  <Loader2 size={24} className="animate-spin text-accent" />
                  <span className="text-xs font-bold">{isRtl ? 'مزامنة السجل بالوقت الفعلي...' : 'Syncing Ledger in Real-time...'}</span>
                </div>
              ) : transactions.length === 0 ? (
                <div className="py-10 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-main)] flex flex-col items-center justify-center text-center p-6 space-y-2">
                  <div className="w-12 h-12 rounded-full bg-[var(--surface-subtle)] flex items-center justify-center text-[var(--text-muted)]">
                    <History size={22} />
                  </div>
                  <p className="text-xs font-bold text-[var(--text-primary)]">
                    {isRtl ? 'لا توجد حركات مسجلة حالياً' : 'No recorded transactions yet'}
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)] max-w-xs">
                    {isRtl ? 'كافة عمليات الإيداع والسحب والتحويلات ستظهر هنا بدقة فورية.' : 'All wallet activities will be synced and logged here.'}
                  </p>
                </div>
              ) : (
                transactions.map((tx, idx) => {
                  const isDeposit = tx.transaction_type === 'deposit' || tx.amount > 0;
                  const isWithdrawal = tx.transaction_type === 'withdrawal' || tx.amount < 0;

                  return (
                    <div
                      key={`mob-tx-${tx.id || idx}`}
                      className="p-3.5 rounded-xl bg-[var(--surface-card)] border border-[var(--border-main)] flex items-center justify-between gap-3 shadow-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          isDeposit
                            ? 'bg-[var(--status-success-subtle)] text-[var(--fg-success)]'
                            : isWithdrawal
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                            : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                        }`}>
                          {isDeposit ? (
                            <ArrowDownLeft size={18} strokeWidth={2.4} />
                          ) : isWithdrawal ? (
                            <ArrowUpRight size={18} strokeWidth={2.4} />
                          ) : (
                            <Sparkles size={18} strokeWidth={2.4} />
                          )}
                        </div>

                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-[var(--text-primary)] leading-tight line-clamp-1">
                            {tx.description || (isDeposit ? (isRtl ? 'شحن رصيد المحفظة' : 'Deposit') : (isRtl ? 'سحب رصيد' : 'Withdrawal'))}
                          </p>
                          <div className="flex items-center gap-1.5 text-[9px] text-[var(--text-muted)] font-mono">
                            <span>{new Date(tx.created_at).toLocaleDateString()}</span>
                            <span>•</span>
                            <span>{new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={`text-xs font-black font-mono ${
                          isDeposit ? 'text-[var(--fg-success)]' : 'text-[var(--text-primary)]'
                        }`}>
                          {isDeposit ? '+' : ''}${Math.abs(tx.amount).toFixed(2)}
                        </span>
                        
                        <div className="flex items-center gap-1.5">
                          <span className={`px-1.5 py-0.2 rounded text-[8px] font-bold uppercase tracking-wider ${
                            tx.status === 'success'
                              ? 'bg-[var(--status-success-subtle)] text-[var(--fg-success)]'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          }`}>
                            {tx.status}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleHideTransaction(tx.id)}
                            className="text-[var(--text-muted)] hover:text-rose-500 p-0.5 transition-colors cursor-pointer"
                            title={isRtl ? 'إخفاء المعاملة' : 'Hide'}
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}

      </AnimatePresence>

    </div>
  );
};

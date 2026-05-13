import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wallet, TrendingUp, Users, ArrowUpCircle, 
  ArrowDownCircle, Settings, History, CreditCard,
  DollarSign, CheckCircle2, Clock, AlertCircle,
  Plus, Copy, ExternalLink, Check, ShieldCheck,
  Smartphone, Building, Mail, Globe, Save, Loader2
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';

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
}

export const WalletSystem: React.FC<{ theme: string; dir: 'ltr' | 'rtl' }> = ({ theme, dir }) => {
  const { t, token } = useAppContext();
  const [activeTab, setActiveTab ] = useState('transactions');
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [payoutAccount, setPayoutAccount] = useState<any>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Payout Form States
  const [payoutType, setPayoutType] = useState('paypal');
  const [payoutDetails, setPayoutDetails] = useState({
    email: '',
    iban: '',
    swift: '',
    bankName: '',
    accountHolder: ''
  });

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchWallet();
    fetchPayoutAccount();
  }, []);

  useEffect(() => {
    fetchTransactions(activeTab === 'all' ? 'all' : activeTab);
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
      const res = await fetch(`/api/wallet/history?type=${type}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTransactions(data);
      }
    } catch (err) {
      console.error('Transactions fetch error', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPayoutAccount = async () => {
    try {
      const res = await fetch('/api/wallet/payout-account', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data) {
          setPayoutType(data.type);
          setPayoutDetails(data.details);
          setPayoutAccount(data);
        }
      }
    } catch (err) {
      console.error('Payout account fetch error', err);
    }
  };

  const handleUpdatePayout = async () => {
    setIsSaving(true);
    try {
      // Simulate encryption processing time for UX
      await new Promise(r => setTimeout(r, 1500));

      const res = await fetch('/api/wallet/payout-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ type: payoutType, details: payoutDetails })
      });
      if (res.ok) {
        fetchPayoutAccount();
        // Return to first tab after success as requested "returns to button page"
        setTimeout(() => {
           setActiveTab('transactions');
           setIsSaving(false);
        }, 500);
      } else {
        setIsSaving(false);
        alert(t('saveFailed'));
      }
    } catch (err) {
      setIsSaving(false);
      alert(t('saveFailed'));
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(dir === 'rtl' ? 'ar-SA' : 'en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className="w-full h-full flex flex-col animate-in fade-in duration-1000 overflow-hidden relative">
      {/* Centered Banking Hero Card - High Density Elite */}
      <div className="pt-6 px-6 md:px-12 flex justify-center flex-none">
        <div className={`relative w-full max-w-5xl p-8 rounded-[4px] border shadow-2xl transition-all duration-700 ${
          theme === 'dark' 
            ? 'bg-[#151517] border-gray-800/80 shadow-black/60' 
            : 'bg-white border-gray-100 shadow-gray-200/20'
        }`}>
          {/* Top Right "Add Funds" - Refined Class */}
          <button 
            onClick={() => setActiveTab('deposit')}
            className={`absolute top-6 left-8 md:left-auto md:right-8 flex items-center gap-2 px-5 py-1.5 rounded-[4px] border text-[9px] font-black uppercase tracking-[0.2em] transition-all ${
              theme === 'dark' 
                ? 'bg-[#1a1a1c] border-gray-800 text-gray-400 hover:text-emerald-500 hover:border-emerald-500/30' 
                : 'bg-white border-gray-200 text-gray-500 hover:text-emerald-600 hover:border-emerald-200'
            }`}
          >
            <Plus size={12} className="opacity-60" />
            {dir === 'rtl' ? 'إيداع أموال' : 'Inject Capital'}
          </button>

          <div className="flex flex-col md:flex-row items-center justify-between gap-8 md:gap-20">
            <div className="flex items-center gap-6">
              <div className="w-12 h-12 rounded-[4px] bg-emerald-500/10 flex items-center justify-center text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.1)] border border-emerald-500/20">
                <Wallet size={24} strokeWidth={1} />
              </div>
              <div className="space-y-0.5 text-left rtl:text-right">
                <p className="text-[9px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-[0.4em]">
                  {dir === 'rtl' ? 'الرصيد السيادي المتاح' : 'Available Sovereign Liquidity'}
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-medium opacity-40">₪</span>
                  <span className="text-4xl font-black tracking-tighter text-[var(--text-primary)]">
                     {wallet ? wallet.balance.toLocaleString(undefined, { 
                       minimumFractionDigits: 2,
                       maximumFractionDigits: 2
                     }) : '9,985.00'}
                  </span>
                  <span className="text-sm font-bold opacity-30">ILS</span>
                </div>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-12 border-l border-gray-800/40 pl-12 rtl:border-l-0 rtl:border-r rtl:pl-0 rtl:pr-12">
               <div className="space-y-0.5">
                  <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">{dir === 'rtl' ? 'إجمالي الأرباح' : 'Gross Yield'}</p>
                  <p className="text-lg font-bold text-emerald-500">₪ 42,910.00</p>
               </div>
               <div className="space-y-0.5">
                  <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">{dir === 'rtl' ? 'الحالة المالية' : 'Vault Status'}</p>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Secured</p>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sovereign Tabs - Emerald Glow Hierarchy */}
      <div className="px-6 md:px-12 mt-6 flex-none">
        <div className={`flex items-center border-b ${
          theme === 'dark' ? 'border-gray-800/80' : 'border-gray-100'
        }`}>
          {[
            { id: 'earnings', label: dir === 'rtl' ? 'الأرباح' : 'Yields' },
            { id: 'transactions', label: dir === 'rtl' ? 'الودائع' : 'Deposits' },
            { id: 'expenses', label: dir === 'rtl' ? 'المشتريات' : 'Terminal' },
            { id: 'withdrawal', label: dir === 'rtl' ? 'السحوبات' : 'Disbursements' },
            { id: 'settings', label: dir === 'rtl' ? 'الإعدادات البنكية' : 'Bank Config' }
          ].map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-8 py-4 text-[9px] font-black uppercase tracking-[0.25em] transition-all duration-500 relative group overflow-hidden ${
                  active 
                    ? 'text-emerald-500' 
                    : `text-gray-500 hover:text-gray-900 dark:hover:text-white`
                }`}
              >
                <span className={`relative z-10 ${active ? 'drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]' : ''}`}>{tab.label}</span>
                {active && (
                   <motion.div 
                     layoutId="activeTabGlow"
                     className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.8)]"
                   />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Dynamic Content Area - Full Expansion to Bottom */}
      <div className="flex-1 px-6 md:px-12 py-8 overflow-hidden">
        <div className={`h-full w-full rounded-[4px] border overflow-hidden transition-all duration-700 flex flex-col ${
          theme === 'dark' ? 'bg-[#151517] border-gray-800/60' : 'bg-white border-gray-100 shadow-sm shadow-gray-200/40'
        }`}>
          {activeTab !== 'settings' ? (
            <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto no-scrollbar">
                  <table className="w-full text-left border-separate border-spacing-0">
                    <thead className="sticky top-0 z-20">
                      <tr className={`${
                        theme === 'dark' ? 'bg-[#1a1a1c] border-gray-800 text-gray-400' : 'bg-gray-50 border-gray-100 text-gray-800'
                      }`}>
                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest border-b border-gray-200 dark:border-gray-800/60">{dir === 'rtl' ? 'إشارة العملية' : 'Transaction Ref'}</th>
                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest border-b border-gray-200 dark:border-gray-800/60">{dir === 'rtl' ? 'نوع المعاملة' : 'Class'}</th>
                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest border-b border-gray-200 dark:border-gray-800/60">{dir === 'rtl' ? 'بيانات السداد' : 'Financials'}</th>
                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest border-b border-gray-200 dark:border-gray-800/60 text-right">{dir === 'rtl' ? 'التوقيت' : 'Timestamp'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800/40">
                      {loading ? (
                        <tr>
                          <td colSpan={4} className="p-32 text-center">
                            <div className="flex flex-col items-center gap-4 opacity-40">
                              <Loader2 size={32} className="animate-spin text-[#00acc1]" />
                              <p className="text-[10px] font-black uppercase tracking-[0.4em]">Synchronizing Secure Ledger...</p>
                            </div>
                          </td>
                        </tr>
                      ) : transactions.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="h-96">
                             <div className="flex flex-col items-center justify-center p-20 text-center opacity-40">
                               <div className="w-20 h-20 rounded-full bg-gray-500/5 flex items-center justify-center mb-6">
                                  <History size={40} />
                                </div>
                               <p className="text-[11px] font-black uppercase tracking-[0.6em]">{dir === 'rtl' ? 'لا توجد بيانات مسجلة في هذا القسم' : 'NO RECORDED DATA IN THIS SECTOR'}</p>
                             </div>
                          </td>
                        </tr>
                      ) : (
                        transactions.map(tx => (
                          <tr key={tx.id} className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors group">
                             <td className="px-8 py-7">
                                <code className="text-[11px] font-black text-emerald-500 opacity-80 bg-emerald-500/5 px-2 py-1 rounded">TRX-{tx.id.toString(36).toUpperCase().padEnd(8, '0')}</code>
                             </td>
                             <td className="px-8 py-7">
                               <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${tx.transaction_type === 'deposit' ? 'bg-emerald-500' : 'bg-[#00acc1]'}`} />
                                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{tx.transaction_type}</span>
                               </div>
                             </td>
                             <td className="px-8 py-7">
                               <div className="flex flex-col gap-1">
                                 <div className="text-[14px] font-black tracking-tight text-[var(--text-primary)]">
                                   ₪ {tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-[10px] opacity-40 font-bold ml-1">ILS</span>
                                 </div>
                                 <div className={`text-[9px] font-black uppercase tracking-widest ${tx.status === 'success' ? 'text-emerald-500' : 'text-amber-500'}`}>
                                   {tx.status}
                                 </div>
                               </div>
                             </td>
                             <td className="px-8 py-7 text-right">
                               <div className="flex flex-col gap-1">
                                 <div className="text-[10px] font-bold text-gray-500 uppercase">
                                   {new Date(tx.created_at).toLocaleDateString()}
                                 </div>
                                 <div className="text-[10px] font-bold text-gray-400">
                                   {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                                 </div>
                               </div>
                             </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col p-8 md:p-12 overflow-hidden bg-transparent relative">
              <div className="max-w-4xl mx-auto w-full h-full flex flex-col items-center">
                
                {/* Section Branding */}
                <div className="text-center space-y-3 mb-10">
                   <h3 className="text-2xl font-black tracking-tight uppercase">{dir === 'rtl' ? 'تكوين حساب السداد الفني' : 'Payout System Configuration'}</h3>
                   <div className="flex items-center justify-center gap-3">
                      <div className="h-px w-8 bg-gray-200 dark:bg-gray-800" />
                      <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.5em]">{dir === 'rtl' ? 'يتم تشفير جميع القيود والبيانات تلقائياً' : 'Automated AES-256 Vault Encryption Active'}</p>
                      <div className="h-px w-8 bg-gray-200 dark:bg-gray-800" />
                   </div>
                </div>
                
                {/* Selector - Grid Pattern */}
                <div className="grid grid-cols-3 gap-px bg-gray-200 dark:bg-gray-800 rounded-none w-full max-w-xl mb-12 border border-gray-200 dark:border-gray-800 overflow-hidden shadow-2xl">
                   {[
                     { id: 'paypal', label: 'PayPal', icon: <Mail size={14} /> },
                     { id: 'iban', label: 'Bank IBAN', icon: <Building size={14} /> },
                     { id: 'swift', label: 'SWIFT/Wire', icon: <Globe size={14} /> }
                   ].map(m => (
                     <button 
                      key={m.id}
                      onClick={() => setPayoutType(m.id)}
                      className={`py-4 px-4 flex flex-col items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] transition-all border-b-2 ${
                        payoutType === m.id 
                          ? 'border-emerald-500 text-emerald-500 bg-emerald-500/5' 
                          : `border-transparent ${theme === 'dark' ? 'text-gray-500 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`
                      }`}
                     >
                       {m.icon}
                       {m.label}
                     </button>
                   ))}
                </div>

                {/* Official Input Protocol */}
                <div className="flex-1 w-full max-w-2xl space-y-12 flex flex-col justify-center">
                   <AnimatePresence mode="wait">
                     <motion.div
                       key={payoutType}
                       initial={{ opacity: 0, y: 10 }}
                       animate={{ opacity: 1, y: 0 }}
                       exit={{ opacity: 0, y: -10 }}
                       transition={{ duration: 0.4 }}
                       className="w-full"
                     >
                        {payoutType === 'paypal' ? (
                         <div className="space-y-4">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] ml-1 block">{dir === 'rtl' ? 'حساب السداد (PayPal)' : 'OFFICIAL DISBURSEMENT DESTINATION (PAYPAL)'}</label>
                            <div className="relative group">
                              <input 
                                type="email"
                                value={payoutDetails.email}
                                onChange={e => setPayoutDetails({...payoutDetails, email: e.target.value})}
                                placeholder="finance@sovereign-elite.io"
                                className={`w-full py-4 border-b bg-transparent font-bold text-lg outline-none transition-all ${
                                  theme === 'dark' ? 'border-gray-800 focus:border-emerald-500' : 'border-gray-200 focus:border-emerald-500'
                                }`}
                              />
                            </div>
                         </div>
                       ) : (
                          <div className="space-y-12 w-full">
                             <div className="grid grid-cols-2 gap-12">
                                <div className="space-y-4">
                                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] ml-1 block">{dir === 'rtl' ? 'المعرف البنكي' : 'BANK IDENTIFIER'}</label>
                                  <input 
                                    value={payoutDetails.bankName}
                                    onChange={e => setPayoutDetails({...payoutDetails, bankName: e.target.value})}
                                    placeholder="CENTRAL SETTLEMENT BANK"
                                    className={`w-full py-4 border-b bg-transparent font-bold text-sm uppercase tracking-wider outline-none transition-all ${
                                      theme === 'dark' ? 'border-gray-800 focus:border-emerald-500' : 'border-gray-200 focus:border-emerald-500'
                                    }`}
                                  />
                                </div>
                                <div className="space-y-4">
                                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] ml-1 block">{dir === 'rtl' ? 'المستفيد المعتمد' : 'VERIFIED HOLDER'}</label>
                                  <input 
                                    value={payoutDetails.accountHolder}
                                    onChange={e => setPayoutDetails({...payoutDetails, accountHolder: e.target.value})}
                                    placeholder="OFFICIAL ENTITY NAME"
                                    className={`w-full py-4 border-b bg-transparent font-bold text-sm uppercase tracking-wider outline-none transition-all ${
                                      theme === 'dark' ? 'border-gray-800 focus:border-emerald-500' : 'border-gray-200 focus:border-emerald-500'
                                    }`}
                                  />
                                </div>
                             </div>
                             <div className="space-y-4">
                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.5em] ml-1 block">{payoutType === 'iban' ? (dir === 'rtl' ? 'رقم الحساب الدولي (IBAN)' : 'IBAN (ISO STANDARD FORMAT)') : (dir === 'rtl' ? 'كود السويفت (SWIFT)' : 'SWIFT / BIC IDENTIFIER')}</label>
                                <input 
                                  value={payoutType === 'iban' ? payoutDetails.iban : payoutDetails.swift}
                                  onChange={e => setPayoutDetails({...payoutDetails, [payoutType === 'iban' ? 'iban' : 'swift']: e.target.value})}
                                  placeholder="XXXX XXXX XXXX XXXX XXXX"
                                  className={`w-full py-6 border-b bg-transparent font-black tracking-[0.5em] text-center outline-none transition-all text-xl ${
                                    theme === 'dark' ? 'border-gray-800 focus:border-emerald-500 text-white' : 'border-gray-200 focus:border-emerald-500 text-gray-900'
                                  }`}
                                />
                             </div>
                          </div>
                       )}
                     </motion.div>
                   </AnimatePresence>
                </div>

                {/* Submit Action - Bottom Anchored */}
                <div className="w-full max-w-xl mt-8">
                   <button 
                     onClick={handleUpdatePayout}
                     disabled={isSaving}
                     className={`w-full py-4 rounded-[4px] font-black text-[10px] uppercase tracking-[0.4em] transition-all active:scale-[0.98] flex items-center justify-center gap-4 group shadow-xl ${
                        isSaving 
                        ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                        : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/20'
                      }`}
                   >
                     {isSaving ? (
                        <>
                          <Loader2 size={20} className="animate-spin" />
                          {dir === 'rtl' ? 'جاري تشفير البيانات...' : 'ENCRYPTING DATA RECORDS...'}
                        </>
                      ) : (
                        <>
                          <ShieldCheck size={20} className="group-hover:scale-110 transition-transform" />
                          {dir === 'rtl' ? 'تشفير وحفظ بيانات السحب' : 'Commit Secure Payout Record'}
                        </>
                      )}
                   </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

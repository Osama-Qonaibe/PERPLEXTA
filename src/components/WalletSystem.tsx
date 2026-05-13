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
  const [isCopied, setIsCopied] = useState(false);

  // Payout Form States - Removed as integrated into withdrawal flows if needed or deleted
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchWallet();
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

  if (loading && !wallet) {
    return (
      <div className="space-y-10 animate-pulse w-full max-w-5xl mx-auto px-6 md:px-12 pt-6">
        {/* Banking Hero Skeleton - Precision matched to 280px roughly */}
        <div className={`h-[280px] w-full rounded-[4px] border ${theme === 'dark' ? 'bg-[#0a0a0b] border-gray-800/40' : 'bg-gray-50 border-gray-200'}`} />
        
        {/* Transactions Section Skeleton */}
        <div className={`h-[400px] w-full rounded-[4px] border ${theme === 'dark' ? 'bg-[#0a0a0b] border-gray-800/40' : 'bg-gray-50 border-gray-200'}`} />
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col overflow-hidden relative">
      {/* Centered Banking Hero Card - High Density Elite */}
      <div className="pt-6 px-6 md:px-12 flex justify-center flex-none">
        <div className={`relative w-full max-w-5xl p-10 rounded-[4px] border shadow-2xl transition-all duration-700 ${
          theme === 'dark' 
            ? 'bg-[#151517] border-gray-800/80 shadow-black/60' 
            : 'bg-white border-gray-100 shadow-gray-200/20'
        }`}>
          <div className="flex flex-col gap-10">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-8">
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 rounded-[4px] bg-emerald-500/10 flex items-center justify-center text-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.15)] border border-emerald-500/30">
                  <Wallet size={28} strokeWidth={1} />
                </div>
                <div className="space-y-1 text-center md:text-left rtl:md:text-right">
                  <p className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-[0.4em]">
                    {dir === 'rtl' ? 'الرصيد السيادي المتاح' : 'Available Sovereign Liquidity'}
                  </p>
                  <div className="flex items-baseline justify-center md:justify-start gap-2">
                    <span className="text-2xl font-medium opacity-40">₪</span>
                    <span className="text-5xl font-black tracking-tighter text-[var(--text-primary)]">
                       {wallet ? wallet.balance.toLocaleString(undefined, { 
                         minimumFractionDigits: 2,
                         maximumFractionDigits: 2
                       }) : '9,985.00'}
                    </span>
                    <span className="text-base font-bold opacity-30 tracking-widest">ILS</span>
                  </div>
                </div>
              </div>

              {/* Action Button - Refined Positioning */}
              <button 
                onClick={() => setActiveTab('deposit')}
                dir={dir}
                className={`flex items-center gap-3 px-8 py-3 rounded-[4px] border text-[10px] font-black uppercase tracking-[0.3em] transition-all group w-full md:w-auto justify-center ${
                  theme === 'dark' 
                    ? 'bg-[#1a1a1c] border-gray-800 text-gray-400 hover:text-emerald-500 hover:border-emerald-500/30' 
                    : 'bg-white border-gray-200 text-gray-500 hover:text-emerald-600 hover:border-emerald-200 shadow-sm'
                }`}
              >
                <Plus size={14} className="text-emerald-500 group-hover:scale-125 transition-transform" />
                {dir === 'rtl' ? 'إيداع أموال' : 'Deposit Funds'}
              </button>
            </div>

            {/* Bottom Stats Row */}
            <div className={`pt-8 flex flex-wrap items-center justify-center md:justify-start gap-12 border-t ${theme === 'dark' ? 'border-gray-800/40' : 'border-gray-100'}`}>
               <div className="space-y-1">
                  <p className="text-[8px] font-black text-gray-500 uppercase tracking-[0.3em] opacity-60">{dir === 'rtl' ? 'إجمالي الأرباح' : 'Gross Yield'}</p>
                  <p className="text-xl font-black text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]">₪ 42,910.00</p>
               </div>
               <div className="space-y-1">
                  <p className="text-[8px] font-black text-gray-500 uppercase tracking-[0.3em] opacity-60">{dir === 'rtl' ? 'الحالة المالية' : 'Vault Status'}</p>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em]">Secured</p>
                  </div>
               </div>
               <div className="hidden lg:block h-10 w-px bg-gray-200 dark:bg-gray-800/40" />
               <div className="space-y-1 hidden md:block">
                  <p className="text-[8px] font-black text-gray-500 uppercase tracking-[0.3em] opacity-60">{dir === 'rtl' ? 'المستوى السيادي' : 'Sovereign tier'}</p>
                  <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Elite Intelligence</p>
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
            { id: 'withdrawal', label: dir === 'rtl' ? 'السحوبات' : 'Disbursements' }
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
          {/* Transactions Section - Full expansion */}
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
        </div>
      </div>
    </div>
  );
};

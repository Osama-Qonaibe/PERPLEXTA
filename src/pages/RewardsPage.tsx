import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { Wallet, Gift, Copy, Check, History, Zap, Share2, UserPlus, CheckCircle2, ChevronRight, ChevronLeft, Clock, XCircle, ArrowRightLeft, Landmark, Bitcoin, CreditCard, Send, ShieldCheck, Camera, Lock, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';
import { sovereignPageTransition, sovereignItemTransition } from '../constants/motions';

export const RewardsPage: React.FC = () => {
  const { t, theme, dir, token, user: contextUser, setUser, refreshUser, economySettings } = useAppContext();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [convertAmount, setConvertAmount] = useState('10000');
  
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState<'paypal' | 'crypto' | 'bank'>('paypal');
  const [paymentDetails, setPaymentDetails] = useState('');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [kycFullName, setKycFullName] = useState('');
  const [selfieCaptured, setSelfieCaptured] = useState(false);
  const [selfieData, setSelfieData] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [wallet, setWallet] = useState({ points: 0, balance: 0 });
  const [transactions, setTransactions] = useState<any[]>([]);
  const [referralCount, setReferralCount] = useState(0);
  const [txOffset, setTxOffset] = useState(0);
  const [hasMoreTx, setHasMoreTx] = useState(true);
  const TX_LIMIT = 20;
  
  const startCamera = async () => {
    setIsCapturing(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Could not access camera. Please ensure permissions are granted.");
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
        alert(dir === 'rtl' ? `تم تحويل النقاط بنجاح! الرصيد الجديد: $${Number(data.usdAmount).toFixed(2)}` : `Points converted successfully! New Balance: $${Number(data.usdAmount).toFixed(2)}`);
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
        alert(data.error || 'Conversion failed');
      }
    } catch (error) {
      console.error('Error converting points:', error);
      alert('An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleWithdraw = async () => {
    if (!withdrawAmount || !paymentDetails || !token) return;
    
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/wallet/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amountUSD: Number(withdrawAmount),
          method: withdrawMethod,
          details: paymentDetails
        })
      });
      
      if (res.ok) {
        alert(t('withdrawalRequestSent'));
        setIsWithdrawModalOpen(false);
        setWithdrawAmount('');
        setPaymentDetails('');
        const walletRes = await fetch('/api/wallet', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (walletRes.ok) {
          const data = await walletRes.json();
          setWallet(data);
        }
        refreshUser();
      } else {
        const data = await res.json();
        alert(data.error || 'Withdrawal failed');
      }
    } catch (error) {
      console.error('Error requesting withdrawal:', error);
      alert('An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };
  
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
            } else {
              setTransactions(prev => [...prev, ...newTransactions]);
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

  const referralLink = contextUser ? `${window.location.origin}/?ref=${contextUser.id}` : "...";

  const handleCopy = () => {
    if (!contextUser) return;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const withdrawableUSD = Number(wallet.balance || 0).toFixed(2);
  const estimatedPointsWorth = (Number(wallet.points || 0) * Number(economySettings.conversion_rate || 0)).toFixed(2);
  const minWithdrawalUSD = (Number(economySettings.min_withdrawal_cents || 0) / 100).toFixed(2);

  return (
    <motion.div 
      initial="initial"
      animate="animate"
      exit="exit"
      variants={sovereignPageTransition}
      className="max-w-5xl mx-auto w-[92%] md:w-[85%] pb-24 space-y-6 md:space-y-10"
    >
      
      {/* Sticky Header with Back Button - Elite Standard */}
      <div className={`sticky -top-0.5 z-[40] -mx-4 md:-mx-8 px-4 md:px-8 py-3 mb-6 transition-all duration-300 bg-[var(--bg-base)]/95 backdrop-blur-md border-b border-[var(--border-main)]`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 md:gap-4">
            <button 
              onClick={() => navigate(-1)}
              className={`w-10 h-10 rounded-[var(--radius)] flex items-center justify-center transition-all duration-300 bg-[var(--bg-secondary)] border border-[var(--border-main)] text-[var(--text-secondary)] hover:text-emerald-500`}
            >
              {dir === 'rtl' ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
            <div className="flex items-center gap-2 md:gap-3">
              <h1 className="text-xl md:text-2xl font-black tracking-tight text-[var(--text-primary)] uppercase">{t('rewards')}</h1>
              {contextUser?.kyc_status === 'verified' && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-[var(--radius)] bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                  <CheckCircle2 size={12} className="md:w-3.5 md:h-3.5 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                  <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest">{t('verified')}</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => navigate('/settings')}
              className={`flex items-center gap-2 px-4 py-2 rounded-[var(--radius)] border bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 transition-all duration-300 group`}
            >
              <Landmark size={14} className="group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-black uppercase tracking-tighter">
                {dir === 'rtl' ? 'إيداع أموال / Deposit Funds' : 'Deposit Funds / إيداع أموال'}
              </span>
            </button>
            <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-[var(--radius)] border bg-[var(--bg-secondary)] border-[var(--border-main)]`}>
               <Landmark size={14} className="text-[var(--text-muted)]" />
               <span className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-tighter">PLATFORM LEDGER</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Cards: Balance and Points */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        
        {/* Withdrawable Balance Card */}
        <div className={`relative overflow-hidden rounded-[var(--radius)] p-5 md:p-8 border bg-[var(--bg-secondary)] border-[var(--border-main)] flex flex-col items-center justify-center text-center min-h-[180px] md:min-h-[240px]`}>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[120px] md:text-[180px] font-bold text-emerald-500/5 select-none pointer-events-none">
            $
          </div>
          <div className="relative z-10 space-y-2 md:space-y-4">
            <h3 className="text-[11px] md:text-base text-[var(--text-secondary)] font-medium uppercase tracking-wider">{t('withdrawableBalance')}</h3>
            <div className="flex items-baseline justify-center gap-1.5 md:gap-2">
              <span className="text-sm md:text-xl font-bold text-emerald-500">USD</span>
              <span className="text-4xl md:text-6xl font-bold text-white tracking-tight">${withdrawableUSD}</span>
            </div>
            <button 
              onClick={() => setIsWithdrawModalOpen(true)}
              className="mt-2 md:mt-6 flex items-center justify-center gap-2 mx-auto px-5 py-2.5 md:px-6 md:py-3 rounded-[var(--radius)] bg-transparent border border-[var(--border-main)] hover:border-emerald-500/50 hover:bg-emerald-500/5 text-white text-xs md:text-base font-bold transition-all duration-300 group"
            >
              <Wallet size={16} className="md:w-[18px] md:h-[18px] text-emerald-500 group-hover:scale-110 transition-transform" />
              <span className="text-white">{t('requestWithdrawal')}</span>
            </button>
          </div>
        </div>

        {/* Points Balance Card */}
        <div className={`relative overflow-hidden rounded-[var(--radius)] p-5 md:p-8 border bg-[var(--bg-secondary)] border-[var(--border-main)] flex flex-col items-center justify-center text-center min-h-[180px] md:min-h-[240px]`}>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 select-none pointer-events-none opacity-5">
            <Gift className="text-rose-500 w-[140px] h-[140px] md:w-[200px] md:h-[200px]" />
          </div>
          <div className="relative z-10 space-y-2 md:space-y-4">
            <h3 className="text-[11px] md:text-base text-[var(--text-secondary)] font-medium uppercase tracking-wider">{t('pointsBalance')}</h3>
            <div className="flex flex-col items-center justify-center gap-0.5 md:gap-1">
              <div className="flex items-baseline gap-1.5 md:gap-2">
                <span className="text-sm md:text-xl font-bold text-rose-500">PTS</span>
                <span className="text-4xl md:text-6xl font-bold text-white tracking-tight">{Math.floor(Number(wallet.points || 0)).toLocaleString()}</span>
              </div>
              <span className="text-[10px] md:text-sm text-slate-400">≈ ${estimatedPointsWorth}</span>
            </div>
            <button 
              onClick={() => setIsConvertModalOpen(true)}
              className="mt-2 md:mt-6 flex items-center justify-center gap-2 mx-auto px-5 py-2.5 md:px-6 md:py-3 rounded-[var(--radius)] bg-transparent border border-[var(--border-main)] hover:border-emerald-500/50 hover:bg-emerald-500/5 text-white text-xs md:text-base font-bold transition-all duration-300 group"
            >
              <Zap size={16} className="md:w-[18px] md:h-[18px] text-emerald-500 group-hover:scale-110 transition-transform" />
              <span className="text-white">{t('convertPointsToBalance')}</span>
            </button>
          </div>
        </div>

      </div>

      {/* Middle Cards: How it works and Invite */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        
        {/* How it works */}
        <div className={`rounded-[var(--radius)] p-5 md:p-8 border bg-[var(--bg-secondary)] border-[var(--border-main)] transition-all duration-300 hover:border-emerald-500/20`}>
          <h3 className="text-lg md:text-xl font-bold text-emerald-500 mb-6 md:mb-8 text-center drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]">{t('howSystemWorks')}</h3>
          
          <div className="space-y-6 md:space-y-8">
            {/* Step 1 */}
            <div className="flex items-start gap-3 md:gap-4 group">
              <div className="flex-shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-[var(--radius)] bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 text-sm md:text-lg font-bold group-hover:bg-emerald-500/20 transition-all">
                1
              </div>
              <div>
                <h4 className="font-bold text-emerald-500 text-base md:text-lg tracking-tight">{t('shareYourLink')}</h4>
                <p className="text-[11px] md:text-sm text-slate-200 mt-0.5 md:mt-1 font-medium leading-relaxed">{t('shareYourLinkDesc')}</p>
              </div>
            </div>
            
            {/* Step 2 */}
            <div className="flex items-start gap-3 md:gap-4 group">
              <div className="flex-shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-[var(--radius)] bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 text-sm md:text-lg font-bold group-hover:bg-emerald-500/20 transition-all">
                2
              </div>
              <div>
                <h4 className="font-bold text-emerald-500 text-base md:text-lg tracking-tight">{t('registration')}</h4>
                <p className="text-[11px] md:text-sm text-slate-200 mt-0.5 md:mt-1 font-medium leading-relaxed">{formatTranslation('registrationDesc')}</p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-3 md:gap-4 group">
              <div className="flex-shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-[var(--radius)] bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 text-sm md:text-lg font-bold group-hover:bg-emerald-500/20 transition-all">
                3
              </div>
              <div>
                <h4 className="font-bold text-emerald-500 text-base md:text-lg tracking-tight">{t('activationAndProfit')}</h4>
                <p className="text-[11px] md:text-sm text-slate-200 mt-0.5 md:mt-1 font-medium leading-relaxed">{formatTranslation('activationAndProfitDesc')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Invite Friends */}
        <div className={`rounded-[var(--radius)] p-5 md:p-8 border bg-[var(--bg-secondary)] border-[var(--border-main)] flex flex-col transition-all duration-300 hover:border-emerald-500/20`}>
          <div className="text-center mb-6 md:mb-8">
            <h3 className="text-lg md:text-xl font-bold text-emerald-500 flex items-center justify-center gap-2 drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]">
              {t('inviteFriendsAndEarn')}
              <Zap className="text-rose-500 animate-pulse" size={18} />
            </h3>
            <p className="text-[11px] md:text-sm text-slate-100 mt-1.5 md:mt-2 max-w-sm mx-auto font-medium leading-relaxed">
              {formatTranslation('inviteFriendsDesc')}
            </p>
          </div>

          <div className="mt-auto space-y-4 md:space-y-6">
            <div className="space-y-1.5 md:space-y-2">
              <label className="text-xs md:text-sm text-slate-300 font-bold uppercase tracking-widest">{t('yourReferralLink')}</label>
              <div className="flex items-center gap-2">
                <div className="flex-1 p-2.5 md:p-3 rounded-[var(--radius)] border bg-[var(--bg-primary)] border-[var(--border-main)] text-emerald-400 font-mono text-[11px] md:text-xs overflow-hidden text-ellipsis whitespace-nowrap shadow-inner">
                  {referralLink}
                </div>
                <button 
                  onClick={handleCopy}
                  className={`flex items-center justify-center gap-2 px-3 md:px-4 py-2.5 md:py-3 rounded-[var(--radius)] border transition-all duration-300 ${
                    copied 
                      ? 'bg-emerald-500 border-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)] px-6' 
                      : `bg-emerald-500/10 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/20`
                  }`}
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  <span className="hidden sm:inline text-xs md:text-sm font-bold">{copied ? t('copied') : t('copy')}</span>
                </button>
              </div>
            </div>

            <div className={`flex items-center justify-between p-4 md:p-6 rounded-[var(--radius)] border bg-[var(--bg-primary)] border-[var(--border-main)] hover:border-rose-500/20 transition-all`}>
              <div className="flex items-center gap-3 md:gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-[var(--radius)] bg-rose-500/10 flex items-center justify-center text-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.1)]">
                  <Gift size={20} className="md:w-6 md:h-6" />
                </div>
                <span className="font-bold text-xs md:text-base text-white uppercase tracking-tight">{t('totalSuccessfulReferralsUser')}</span>
              </div>
              <span className="text-2xl md:text-3xl font-black text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">{referralCount}</span>
            </div>
          </div>
        </div>

      </div>

      {/* KYC Verification Card */}
      {contextUser?.kyc_required && contextUser?.kyc_status !== 'verified' && (
        <div className={`rounded-[var(--radius)] p-5 md:p-8 border transition-all duration-300 bg-[var(--bg-secondary)] border-[var(--border-main)] col-span-1 md:col-span-2 shadow-sm ${
          contextUser?.kyc_status === 'pending' ? 'bg-emerald-500/5 border-emerald-500/20 shadow-emerald-500/5' : 
          contextUser?.kyc_status === 'rejected' ? 'bg-red-500/5 border-red-500/20 shadow-red-500/5' : ''
        }`}>
          
          {contextUser?.kyc_status === 'pending' ? (
            <div className="flex flex-col items-center text-center py-6 md:py-10 space-y-4 md:space-y-6">
              <div className="relative">
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-[var(--radius)] bg-emerald-500/10 flex items-center justify-center animate-pulse">
                  <ShieldCheck size={40} className="md:w-[48px] md:h-[48px] text-emerald-500 drop-shadow-[0_0_15px_rgba(16,185,129,0.4)]" />
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
                <div className="flex-shrink-0 p-3 md:p-4 rounded-[var(--radius)] bg-blue-500/10 text-blue-500">
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
                  <XCircle size={40} className="md:w-[48px] md:h-[48px] text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.4)]" />
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
                  className="mt-4 px-8 py-3 rounded-[var(--radius)] bg-emerald-500 text-white font-bold text-sm md:text-base hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2 mx-auto"
                >
                  <RefreshCw size={18} />
                  {dir === 'rtl' ? 'إعادة المحاولة' : 'Try Again'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row gap-6 md:gap-8">
              {/* Left Side: Info */}
              <div className="flex-1 space-y-4 md:space-y-6">
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-[var(--radius)] bg-emerald-500/10 flex items-center justify-center text-emerald-500 flex-shrink-0">
                    <ShieldCheck size={20} className="md:w-6 md:h-6" />
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
                  theme === 'dark' ? 'bg-rose-500/5 border-rose-500/20' : 'bg-rose-50 border-rose-100'
                }`}>
                  <Lock className="text-rose-500 mt-0.5 flex-shrink-0" size={16} />
                  <p className="text-[10px] md:text-sm text-rose-600 dark:text-rose-400 leading-relaxed font-medium">
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
                  <div className={`relative flex items-center rounded-[var(--radius)] border transition-all bg-[var(--bg-input)] border-[var(--border)] focus-within:border-emerald-500/50`}>
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
                        className="w-full py-2.5 md:py-3 rounded-[var(--radius)] bg-emerald-500 text-white font-bold text-xs md:text-base"
                      >
                        {t('capture')}
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={startCamera}
                      disabled={selfieCaptured}
                      className={`w-full flex items-center justify-center gap-2 md:gap-3 py-3 md:py-4 rounded-[var(--radius)] border-2 border-dashed transition-all duration-300 ${
                        selfieCaptured 
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500 cursor-default shadow-sm'
                          : `border-[var(--border)] hover:border-emerald-500/50 hover:bg-emerald-500/5 text-[var(--text-secondary)] hover:text-emerald-500`
                      }`}
                    >
                      {selfieCaptured ? (
                        <>
                          <CheckCircle2 size={16} className="md:w-5 md:h-5" />
                          <span className="font-bold text-xs md:text-base">{t('selfieCaptured')}</span>
                        </>
                      ) : (
                        <>
                          <Camera size={16} className="md:w-5 md:h-5" />
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
                  className={`w-full flex items-center justify-center gap-2 py-3 md:py-4 rounded-[var(--radius)] font-bold text-xs md:text-base transition-all duration-300 ${
                    !kycFullName.trim() || !selfieCaptured || isSubmitting
                      ? 'opacity-50 cursor-not-allowed bg-[var(--bg-primary)] text-[var(--text-muted)]'
                      : 'bg-[var(--text-primary)] text-[var(--bg-base)] hover:opacity-90 shadow-[0_4px_20px_rgba(0,0,0,0.15)]'
                  }`}
                >
                  {isSubmitting ? (
                    <RefreshCw className="animate-spin" size={16} />
                  ) : (
                    <ShieldCheck size={16} />
                  )}
                  {isSubmitting 
                    ? (dir === 'rtl' ? 'جاري الإرسال...' : 'Sending...') 
                    : t('submitKyc')}
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
              <h3 className="text-base md:text-lg font-bold text-emerald-500">{t('transactionHistory')}</h3>
            </div>
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
                      {transactions.map((tx) => (
                        <tr key={tx.id} className={`border-b border-[var(--border-main)] hover:bg-[var(--bg-primary)]/20 transition-colors`}>
                          <td className="px-6 py-4 font-medium text-[var(--text-primary)] whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius)] text-xs font-medium ${
                              tx.transaction_type === 'welcome_bonus' ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'
                            }`}>
                              {tx.transaction_type}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-bold text-[var(--text-primary)] whitespace-nowrap">
                            {Number(tx.amount) > 0 ? '+' : ''}{Number(tx.amount).toLocaleString()} PTS
                          </td>
                          <td className="px-6 py-4 text-[var(--text-secondary)] whitespace-nowrap">{tx.description}</td>
                          <td className="px-6 py-4 text-[var(--text-secondary)] whitespace-nowrap">
                            {new Date(tx.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                      {hasMoreTx && (
                        <tr>
                          <td colSpan={4} className="px-6 py-4 text-center">
                            <button 
                              onClick={() => setTxOffset(prev => prev + TX_LIMIT)}
                              className="text-emerald-500 hover:text-emerald-400 font-bold flex items-center gap-2 mx-auto transition-all"
                            >
                              <RefreshCw size={14} className={isSubmitting ? "animate-spin" : ""} />
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
          <div className={`relative w-full max-w-md rounded-[var(--radius)] p-6 md:p-8 shadow-2xl bg-[var(--bg-secondary)] border border-[var(--border-main)]`}>
            
            {/* Header */}
            <div className="flex items-center justify-center gap-2 md:gap-3 mb-6 md:mb-8">
              <h2 className="text-xl md:text-2xl font-bold text-[var(--text-primary)]">
                {t('convertPoints')}
              </h2>
              <Zap className="text-rose-500 md:w-7 md:h-7" size={24} />
            </div>

            {/* Input Area */}
            <div className="space-y-1.5 md:space-y-2 mb-5 md:mb-6">
              <label className="block text-xs md:text-sm font-medium text-[var(--text-secondary)]">
                {t('numberOfPoints')}
              </label>
              <div className={`relative flex items-center rounded-[var(--radius)] border transition-all bg-[var(--bg-input)] border-[var(--border)] focus-within:border-emerald-500/50 focus-within:ring-1 focus-within:ring-emerald-500/50`}>
                <input 
                  type="text"
                  value={convertAmount || ''}
                  onChange={(e) => setConvertAmount(e.target.value)}
                  className={`w-full bg-transparent px-4 py-3 md:px-6 md:py-4 text-lg md:text-xl font-bold text-[var(--text-primary)] focus:outline-none ${dir === 'rtl' ? 'text-right' : 'text-left'}`}
                  dir="ltr"
                />
              </div>
              <p className="text-[11px] md:text-sm text-[var(--text-secondary)] mt-1.5 md:mt-2">
                {t('currentBalancePoints').replace('{points}', Math.floor(wallet.points || 0).toLocaleString())}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 md:gap-4 mt-6 md:mt-8">
              <button 
                onClick={() => setIsConvertModalOpen(false)}
                className={`flex-1 py-3 md:py-4 rounded-[var(--radius)] font-bold text-sm md:text-base transition-all duration-300 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-overlay)]`}
              >
                {t('cancel')}
              </button>
              <button 
                onClick={handleConvertPoints}
                disabled={isSubmitting}
                className={`flex-[2] py-3 md:py-4 rounded-[var(--radius)] font-bold text-sm md:text-base transition-all duration-300 bg-[var(--text-primary)] text-[var(--bg-base)] hover:opacity-90 disabled:opacity-50`}
              >
                {isSubmitting ? <RefreshCw className="animate-spin" size={16} /> : t('confirmConversion')}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Withdraw Balance Modal */}
      {isWithdrawModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsWithdrawModalOpen(false)}
          />
          
          {/* Modal Content */}
          <div className={`relative w-full max-w-md rounded-[var(--radius)] p-6 md:p-8 shadow-2xl bg-[var(--bg-secondary)] border border-[var(--border-main)]`}>
            
            {/* Header */}
            <div className="flex items-center justify-center gap-2 md:gap-3 mb-6 md:mb-8">
              <h2 className="text-xl md:text-2xl font-bold text-[var(--text-primary)]">
                {t('withdrawBalance')}
              </h2>
              <Wallet className="text-emerald-500 md:w-7 md:h-7" size={24} />
            </div>

            {/* Amount Input */}
            <div className="space-y-1.5 md:space-y-2 mb-5 md:mb-6">
              <label className="block text-xs md:text-sm font-medium text-[var(--text-secondary)]">
                {t('withdrawalAmount')}
              </label>
              <div className={`relative flex items-center rounded-[var(--radius)] border transition-all bg-[var(--bg-input)] border-[var(--border)] focus-within:border-emerald-500/50 focus-within:ring-1 focus-within:ring-emerald-500/50`}>
                <span className="px-3 md:px-4 text-[var(--text-muted)] font-bold text-lg md:text-xl">$</span>
                <input 
                  type="text"
                  value={withdrawAmount || ''}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="0.00"
                  className={`w-full bg-transparent py-3 md:py-4 text-lg md:text-xl font-bold text-[var(--text-primary)] focus:outline-none ${dir === 'rtl' ? 'text-right' : 'text-left'}`}
                  dir="ltr"
                />
              </div>
              <div className="flex items-center justify-between mt-1.5 md:mt-2">
                <p className="text-[10px] md:text-sm text-emerald-500/80">
                  {t('minWithdrawalAmount').replace('{min}', minWithdrawalUSD)}
                </p>
                {withdrawAmount && !isNaN(Number(withdrawAmount)) && Number(withdrawAmount) > 0 && (
                  <p className="text-[10px] md:text-xs font-bold text-rose-500">
                    - {Math.round(Number(withdrawAmount) * economySettings.points_per_dollar).toLocaleString()} {t('points')}
                  </p>
                )}
              </div>
            </div>

            {/* Withdrawal Method */}
            <div className="space-y-2.5 md:space-y-3 mb-5 md:mb-6">
              <label className="block text-xs md:text-sm font-medium text-[var(--text-secondary)]">
                {t('withdrawalMethod')}
              </label>
              <div className="grid grid-cols-3 gap-2 md:gap-3">
                <button
                  onClick={() => setWithdrawMethod('paypal')}
                  className={`flex flex-col items-center justify-center gap-1.5 md:gap-2 p-2.5 md:p-3 rounded-[var(--radius)] border transition-all duration-300 ${
                    withdrawMethod === 'paypal'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500'
                      : 'border-[var(--border-main)] text-[var(--text-secondary)] hover:border-emerald-500/30 hover:text-emerald-500'
                  }`}
                >
                  <CreditCard size={18} className="md:w-5 md:h-5" />
                  <span className="text-[9px] md:text-xs font-medium">{t('paypalUser')}</span>
                </button>
                <button
                  onClick={() => setWithdrawMethod('crypto')}
                  className={`flex flex-col items-center justify-center gap-1.5 md:gap-2 p-2.5 md:p-3 rounded-[var(--radius)] border transition-all duration-300 ${
                    withdrawMethod === 'crypto'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500'
                      : 'border-[var(--border-main)] text-[var(--text-secondary)] hover:border-emerald-500/30 hover:text-emerald-500'
                  }`}
                >
                  <Bitcoin size={18} className="md:w-5 md:h-5" />
                  <span className="text-[9px] md:text-xs font-medium">{t('crypto')}</span>
                </button>
                <button
                  onClick={() => setWithdrawMethod('bank')}
                  className={`flex flex-col items-center justify-center gap-1.5 md:gap-2 p-2.5 md:p-3 rounded-[var(--radius)] border transition-all duration-300 ${
                    withdrawMethod === 'bank'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500'
                      : 'border-[var(--border-main)] text-[var(--text-secondary)] hover:border-emerald-500/30 hover:text-emerald-500'
                  }`}
                >
                  <Landmark size={18} className="md:w-5 md:h-5" />
                  <span className="text-[9px] md:text-xs font-medium">{t('bankAccount')}</span>
                </button>
              </div>
            </div>

            {/* Payment Details Input */}
            <div className="space-y-1.5 md:space-y-2 mb-6 md:mb-8">
              <label className="block text-xs md:text-sm font-medium text-[var(--text-secondary)]">
                {t('paymentDetails')}
              </label>
              <div className={`relative flex items-center rounded-[var(--radius)] border transition-all bg-[var(--bg-input)] border-[var(--border)] focus-within:border-emerald-500/50 focus-within:ring-1 focus-within:ring-emerald-500/50`}>
                <input 
                  type="text"
                  value={paymentDetails || ''}
                  onChange={(e) => setPaymentDetails(e.target.value)}
                  placeholder={
                    withdrawMethod === 'paypal' ? t('paypalEmailPlaceholder') :
                    withdrawMethod === 'crypto' ? t('cryptoAddressPlaceholder') :
                    t('bankDetailsPlaceholder')
                  }
                  className={`w-full bg-transparent px-4 py-3 md:px-6 md:py-4 text-[11px] md:text-sm font-medium text-[var(--text-primary)] focus:outline-none ${dir === 'rtl' ? 'text-right' : 'text-left'}`}
                  dir="ltr"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 md:gap-4">
              <button 
                onClick={() => setIsWithdrawModalOpen(false)}
                className={`flex-1 py-3 md:py-4 rounded-[var(--radius)] font-bold text-sm md:text-base transition-all duration-300 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-overlay)]`}
              >
                {t('cancel')}
              </button>
              <button 
                onClick={handleWithdraw}
                disabled={isSubmitting}
                className={`flex-[2] py-3 md:py-4 rounded-[var(--radius)] font-bold text-sm md:text-base flex items-center justify-center gap-2 transition-all duration-300 bg-[var(--text-primary)] text-[var(--bg-base)] hover:opacity-90 disabled:opacity-50`}
              >
                {isSubmitting ? <RefreshCw className="animate-spin" size={16} /> : <Send size={16} className="md:w-4.5 md:h-4.5" />}
                {t('sendRequest')}
              </button>
            </div>

          </div>
        </div>
      )}

    </motion.div>
  );
};

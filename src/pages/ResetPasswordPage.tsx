import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Lock, ShieldCheck, ArrowRight, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { motion, AnimatePresence } from 'motion/react';
import { sovereignPageTransition } from '../constants/motions';
import { toast } from 'sonner';

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t, language } = useAppContext();
  const token = searchParams.get('token');
  const email = searchParams.get('email');
  const dir = language === 'ar' ? 'rtl' : 'ltr';
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError(language === 'ar' ? 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' : 'Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError(language === 'ar' ? 'كلمات المرور غير متطابقة' : 'Passwords do not match');
      return;
    }

    setIsLoading(true);
    
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token, password })
      });
      
      const data = await res.json();

      if (res.ok) {
        setSuccess(true);
        toast.success(language === 'ar' ? 'تم إعادة تعيين كلمة المرور بنجاح' : 'Password reset successful');
        setTimeout(() => navigate('/'), 3000);
      } else {
        setError(data.error || (language === 'ar' ? 'فشل إعادة تعيين كلمة المرور' : 'Failed to reset password'));
      }
    } catch {
      setError(language === 'ar' ? 'حدث خطأ غير متوقع' : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (!token || !email) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--bg-primary)] p-6">
        <div className="text-center space-y-4">
           <AlertCircle size={48} className="mx-auto text-red-500 opacity-50" />
           <h2 className="text-xl font-bold text-gray-500 uppercase tracking-widest">{t('invalidRequest') || 'Invalid Request'}</h2>
           <button onClick={() => navigate('/')} className="text-emerald-500 hover:underline">{t('backToHome') || 'Back to Home'}</button>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial="initial"
      animate="animate"
      exit="exit"
      variants={sovereignPageTransition}
      className="flex items-center justify-center min-h-screen bg-[var(--bg-primary)] p-6" 
      dir={dir}
    >
      {/* Background Decorative Glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-[120px] animate-pulse delay-700"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-8">
           <div className="inline-flex items-center justify-center w-16 h-16 rounded-[var(--radius)] bg-emerald-500/10 border border-emerald-500/20 mb-4 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
              <ShieldCheck size={32} className="text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
           </div>
           <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight leading-tight">
             {language === 'ar' ? 'إعادة ضبط كلمة المرور' : 'Reset Password'}
           </h2>
           <p className="text-gray-500 mt-2 text-sm">
             {language === 'ar' ? 'قم بتعيين كلمة مرور جديدة قوية لنظامك' : 'Provision a new high-security credential for your account'}
           </p>
        </div>

        <AnimatePresence mode="wait">
          {success ? (
            <motion.div 
              key="success"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="p-8 rounded-[var(--radius)] border bg-emerald-500/5 border-emerald-500/20 text-center space-y-4"
            >
               <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(16,185,129,0.4)]">
                 <CheckCircle2 size={24} className="text-black" />
               </div>
               <h3 className="text-xl font-bold text-emerald-500">{language === 'ar' ? 'تم التحديث بنجاح' : 'Credential Synchronized'}</h3>
               <p className="text-gray-500 text-sm">
                 {language === 'ar' ? 'ستتم إعادة توجيهك إلى تسجيل الدخول خلال لحظات...' : 'Redirecting to secure terminal access shortly...'}
               </p>
               <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-500/40" />
            </motion.div>
          ) : (
            <motion.div 
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-8 rounded-[var(--radius)] shadow-2xl border bg-[var(--bg-secondary)] border-[var(--border-main)] relative overflow-hidden group"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent"></div>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 px-1">
                      {language === 'ar' ? 'كلمة المرور الجديدة' : 'New Access Key'}
                    </label>
                    <div className="relative group/input">
                      <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within/input:text-emerald-500 transition-colors" />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full h-12 pl-12 pr-4 rounded-[var(--radius)] border bg-[var(--bg-primary)] border-[var(--border-main)] focus:border-emerald-500/40 focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none text-gray-900 dark:text-white font-mono text-sm"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 px-1">
                        {language === 'ar' ? 'تأكيد كلمة المرور' : 'Confirm Access Key'}
                    </label>
                    <div className="relative group/input">
                      <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within/input:text-emerald-500 transition-colors" />
                      <input
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full h-12 pl-12 pr-4 rounded-[var(--radius)] border bg-[var(--bg-primary)] border-[var(--border-main)] focus:border-emerald-500/40 focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none text-gray-900 dark:text-white font-mono text-sm"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs rounded-[var(--radius)] flex items-center gap-2"
                    >
                      <AlertCircle size={14} />
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <button 
                  type="submit" 
                  disabled={isLoading} 
                  className="w-full h-12 bg-emerald-500 text-black rounded-[var(--radius)] font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_4px_20px_rgba(16,185,129,0.2)] hover:shadow-[0_8px_25px_rgba(16,185,129,0.3)] active:scale-[0.98]"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      {language === 'ar' ? 'تحديث النظام' : 'Apply Protocol Update'}
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-8 text-center text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 opacity-40">
           Sovereign Secure Auth Core v2.4.0
        </div>
      </motion.div>
    </motion.div>
  );
};

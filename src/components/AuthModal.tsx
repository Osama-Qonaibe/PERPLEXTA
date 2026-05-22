import React, { useState, useEffect } from 'react';
import { X, Mail, Lock, Loader2, Sparkles, LogIn, UserPlus, KeyRound } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { motion, AnimatePresence } from 'motion/react';

export const AuthModal: React.FC = () => {
  const { t, theme, dir, isAuthModalOpen, setIsAuthModalOpen, loginWithGoogle, login, signup, rememberMe, setRememberMe, user } = useAppContext();
  const [searchParams] = useSearchParams();
  const ref = searchParams.get('ref') || localStorage.getItem('app_ref') || undefined;
  
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot-password'>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (isAuthModalOpen && user) {
      setIsAuthModalOpen(false);
    }
  }, [isAuthModalOpen, user, setIsAuthModalOpen]);

  if (!isAuthModalOpen) return null;

  const handleClose = () => {
    setIsAuthModalOpen(false);
    // Reset state
    setMode('login');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setError(null);
    setSuccess(null);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, language: dir === 'rtl' ? 'ar' : 'en' })
      });
      if (res.ok) {
        setSuccess(dir === 'rtl' ? 'تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني.' : 'Password reset link sent to your email.');
      } else {
        setError(dir === 'rtl' ? 'حدث خطأ ما.' : 'An error occurred.');
      }
    } catch (err) {
      setError(dir === 'rtl' ? 'حدث خطأ غير متوقع' : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'forgot-password') return handleForgotPassword(e);
    
    setError(null);
    setIsLoading(true);

    try {
      if (mode === 'signup') {
        if (password !== confirmPassword) {
          setError(dir === 'rtl' ? 'كلمات المرور غير متطابقة' : 'Passwords do not match');
          setIsLoading(false);
          return;
        }
        const result = await signup(email, password, email.split('@')[0], ref);
        if (!result.success) {
          setError(result.error || 'Signup failed');
        }
      } else {
        const result = await login(email, password);
        if (!result.success) {
          setError(result.error || 'Login failed');
        }
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.3, bounce: 0.3 }}
            className={`relative w-full max-w-[380px] md:p-7 p-6 rounded-xl shadow-2xl border bg-[var(--bg-surface)] border-[var(--border)] overflow-hidden mx-auto`}
            dir={dir}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Background Accent */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-1 bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent rounded-full" />
            
            <button 
              onClick={handleClose}
              className={`absolute top-3 right-3 md:top-4 md:right-4 text-gray-500 hover:text-[var(--text-primary)] transition-colors p-2 hover:bg-[var(--bg-overlay)] rounded-md z-20`}
              style={dir === 'rtl' ? { left: '1rem', right: 'auto' } : {}}
            >
              <X size={18} />
            </button>

            <div className="text-center mb-5 md:mb-7">
              <h2 className="text-xl md:text-2xl font-bold mb-1 md:mb-2 bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent">
                {mode === 'login' ? t('login') : mode === 'signup' ? t('signup') : t('forgotPasswordTitle')}
              </h2>
              <p className="text-[12px] md:text-sm text-gray-500 leading-relaxed max-w-[240px] md:max-w-[280px] mx-auto">
                {mode === 'login' ? t('welcome') : mode === 'signup' ? t('createAccount') : t('forgotPasswordDesc')}
              </p>
            </div>

        {error && (
          <div className="mb-3 md:mb-4 p-2.5 md:p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-500 text-[12px] md:text-sm text-center">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-3 md:mb-4 p-2.5 md:p-3 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[12px] md:text-sm text-center">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-2 md:space-y-3">
          <div>
            <label className="block text-[9px] md:text-[10px] font-semibold uppercase tracking-wider mb-1 md:mb-1.5 text-gray-500">
              {t('email')}
            </label>
            <div className="relative group">
              <div className={`absolute inset-y-0 flex items-center pointer-events-none ${dir === 'rtl' ? 'right-4' : 'left-4'}`}>
                <Mail size={15} className="md:w-[17px] text-gray-600 group-focus-within:text-emerald-500 transition-colors" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full py-2 md:py-2.5 rounded-[var(--radius)] border outline-none transition-all duration-300 bg-[var(--bg-base)] border-[var(--border)] text-[var(--text-primary)] placeholder:text-gray-400 focus:border-emerald-500/50 text-[13px] md:text-sm font-inter ${dir === 'rtl' ? 'pr-11 md:pr-12 pl-4' : 'pl-11 md:pl-12 pr-4'}`}
                placeholder="name@example.com"
                dir="ltr"
              />
            </div>
          </div>

          {mode !== 'forgot-password' && (
            <div>
              <label className="block text-[9px] md:text-[10px] font-semibold uppercase tracking-wider mb-1 md:mb-1.5 text-gray-500">
                {t('password')}
              </label>
              <div className="relative group">
                <div className={`absolute inset-y-0 flex items-center pointer-events-none ${dir === 'rtl' ? 'right-4' : 'left-4'}`}>
                  <Lock size={15} className="md:w-[17px] text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full py-2 md:py-2.5 rounded-[var(--radius)] border outline-none transition-all duration-300 bg-[var(--bg-base)] border-[var(--border)] text-[var(--text-primary)] placeholder:text-gray-400 focus:border-emerald-500/50 text-[13px] md:text-sm font-inter ${dir === 'rtl' ? 'pr-11 md:pr-12 pl-4' : 'pl-11 md:pl-12 pr-4'}`}
                  placeholder="••••••••"
                  dir="ltr"
                />
              </div>
              
              {mode === 'login' && (
                <div className="mt-4 flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <div className="relative">
                      <input 
                        type="checkbox" 
                        className="peer sr-only"
                        checked={rememberMe}
                        onChange={(e) => {
                          setRememberMe(e.target.checked);
                          localStorage.setItem('app_remember_me', e.target.checked ? 'true' : 'false');
                        }}
                      />
                      <div className="w-5 h-5 rounded-sm border border-[var(--border)] bg-[var(--bg-base)] peer-checked:bg-emerald-500 peer-checked:border-emerald-500 transition-all duration-300"></div>
                      <svg className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-xs font-medium text-gray-500 group-hover:text-emerald-500 transition-colors">
                      {t('remember_me')}
                    </span>
                  </label>
                  
                  <button
                    type="button"
                    onClick={() => setMode('forgot-password')}
                    className="text-xs font-bold text-gray-500 hover:text-[var(--text-primary)] transition-colors"
                  >
                    {t('forgotPassword')}
                  </button>
                </div>
              )}
            </div>
          )}

          {mode === 'signup' && (
            <div>
              <label className="block text-[9px] md:text-[10px] font-semibold uppercase tracking-wider mb-1 md:mb-1.5 text-gray-500">
                {t('confirmPassword')}
              </label>
              <div className="relative group">
                <div className={`absolute inset-y-0 flex items-center pointer-events-none ${dir === 'rtl' ? 'right-4' : 'left-4'}`}>
                  <Lock size={15} className="md:w-[17px] text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                </div>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full py-2 md:py-2.5 rounded-[var(--radius)] border outline-none transition-all duration-300 bg-[var(--bg-base)] border-[var(--border)] text-[var(--text-primary)] placeholder:text-gray-400 focus:border-emerald-500/50 text-[13px] md:text-sm font-inter ${dir === 'rtl' ? 'pr-11 md:pr-12 pl-4' : 'pl-11 md:pl-12 pr-4'}`}
                  placeholder="••••••••"
                  dir="ltr"
                />
              </div>
            </div>
          )}

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isLoading}
            className={`w-full py-3 md:py-3.5 mt-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md font-bold transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''} text-sm md:text-base`}
          >
            {isLoading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                <span>{t('processing')}...</span>
              </>
            ) : (
              <>
                <span>{mode === 'login' ? t('login') : mode === 'signup' ? t('signup') : t('sendResetLink')}</span>
                <Sparkles size={18} className="opacity-70" />
              </>
            )}
          </motion.button>
        </form>

        {mode !== 'forgot-password' && (
          <>
            <div className="mt-5 md:mt-6 flex items-center gap-4">
              <div className="flex-grow border-t border-[var(--border-main)]"></div>
              <span className="flex-shrink-0 text-[10px] md:text-xs font-bold text-gray-600 uppercase tracking-widest">{t('or') || 'OR'}</span>
              <div className="flex-grow border-t border-[var(--border-main)]"></div>
            </div>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={loginWithGoogle}
              type="button"
              className={`w-full mt-4 md:mt-5 py-3 md:py-3.5 flex items-center justify-center gap-3 rounded-md border transition-all bg-[#0f0f11] border-[var(--border-main)] hover:bg-black hover:border-emerald-500/40 text-white shadow-2xl text-sm md:text-base group active:scale-95`}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="group-hover:drop-shadow-[0_0_8px_rgba(66,133,244,0.4)] transition-all">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span className="text-white font-bold tracking-tight">{t('continueWithGoogle')}</span>
            </motion.button>
          </>
        )}

        <div className="mt-5 md:mt-7 text-center">
          <p className="text-gray-500 text-[12px] md:text-sm">
            {mode === 'login' ? t('noAccount') : mode === 'signup' ? t('haveAccount') : t('rememberedPassword')}
            <button
              onClick={() => {
                if (mode === 'forgot-password') setMode('login');
                else setMode(mode === 'login' ? 'signup' : 'login');
              }}
              className="mx-2 text-emerald-500 hover:text-emerald-400 decoration-emerald-500/30 hover:decoration-emerald-400 underline underline-offset-4 font-bold transition-all"
            >
              {mode === 'login' ? t('signup') : mode === 'signup' ? t('login') : t('login')}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
      )}
    </AnimatePresence>
  );
};

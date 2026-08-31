import { safeStorageGet, safeStorageSet } from "@/utils/safeStorage";
import React, { useState, useEffect } from 'react';
import { X, Mail, Lock, Loader2, Sparkles } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { motion, AnimatePresence } from 'motion/react';
import { useSwipeToClose } from '../utils/swipe';

export const AuthModal: React.FC = () => {
  const { t, dir, isAuthModalOpen, setIsAuthModalOpen, loginWithGoogle, login, signup, rememberMe, setRememberMe, user } = useAppContext();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const ref = searchParams.get('ref') || safeStorageGet('app_ref') || undefined;
  
  const swipeHandlers = useSwipeToClose({
    onSwipeClose: () => setIsAuthModalOpen(false),
    direction: 'both',
    dir: dir as 'rtl' | 'ltr',
    isMobile: true
  });
  
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

  const handleClose = () => {
    setIsAuthModalOpen(false);
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
        } else {
          navigate('/chat');
        }
      } else {
        const result = await login(email, password);
        if (!result.success) {
          setError(result.error || 'Login failed');
        } else {
          navigate('/chat');
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
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", duration: 0.3, bounce: 0.1 }}
            onTouchStart={swipeHandlers.onTouchStart}
            onTouchMove={swipeHandlers.onTouchMove}
            onTouchEnd={swipeHandlers.onTouchEnd}
            className={`relative w-full max-w-[320px] md:max-w-[360px] p-4 md:p-5 rounded-[20px] sm:rounded-[16px] shadow-2xl border bg-[var(--bg-secondary)] border-[var(--border-main)] mx-auto flex flex-col justify-between`}
            dir={dir}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Background Accent */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-transparent via-gray-500/10 to-transparent rounded-full" />
            
            <button 
              onClick={handleClose}
              className={`absolute top-2.5 right-2.5 md:top-3 md:right-3 text-gray-500 hover:text-[var(--text-primary)] transition-colors p-1.5 hover:bg-[var(--bg-overlay)] rounded-md z-20`}
              style={dir === 'rtl' ? { left: '0.6rem', right: 'auto' } : {}}
            >
              <X size={16} />
            </button>

            <div className="text-center mb-1">
              <h2 className="text-sm md:text-base font-bold bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent">
                {mode === 'login' ? t('login') : mode === 'signup' ? t('signup') : t('forgotPasswordTitle')}
              </h2>
            </div>

        {error && (
          <div className="mb-1.5 p-1.5 rounded-md bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] md:text-xs text-center">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-1.5 p-1.5 rounded-md bg-accent/10 border border-accent/20 text-accent text-[10px] md:text-xs text-center">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-1.5">
          <div>
            <div className="relative group">
              <div className={`absolute inset-y-0 flex items-center pointer-events-none ${dir === 'rtl' ? 'right-3' : 'left-3'}`}>
                <Mail size={13} className="md:w-[14px] text-gray-500 group-focus-within:text-accent transition-colors" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full py-1.5 md:py-2 rounded-[var(--radius)] border outline-none transition-theme bg-[var(--bg-base)] border-[var(--border)] text-[var(--text-primary)] placeholder:text-gray-400 focus:border-accent/50 text-[11px] md:text-xs font-inter ${dir === 'rtl' ? 'pr-9 md:pr-10 pl-3' : 'pl-9 md:pl-10 pr-3'}`}
                placeholder="name@example.com"
                dir="ltr"
              />
            </div>
          </div>

          {mode !== 'forgot-password' && (
            <div>
              <div className="relative group">
                <div className={`absolute inset-y-0 flex items-center pointer-events-none ${dir === 'rtl' ? 'right-3' : 'left-3'}`}>
                  <Lock size={13} className="md:w-[14px] text-gray-400 group-focus-within:text-accent transition-colors" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full py-1.5 md:py-2 rounded-[var(--radius)] border outline-none transition-theme bg-[var(--bg-base)] border-[var(--border)] text-[var(--text-primary)] placeholder:text-gray-400 focus:border-accent/50 text-[11px] md:text-xs font-inter ${dir === 'rtl' ? 'pr-9 md:pr-10 pl-3' : 'pl-9 md:pl-10 pr-3'}`}
                  placeholder="••••••••"
                  dir="ltr"
                />
              </div>
              
              {mode === 'login' && (
                <div className="mt-1.5 flex items-center justify-between px-0.5">
                  <label className="flex items-center gap-1.5 cursor-pointer group">
                    <div className="relative">
                      <input 
                        type="checkbox" 
                        className="peer sr-only"
                        checked={rememberMe}
                        onChange={(e) => {
                          setRememberMe(e.target.checked);
                          safeStorageSet('app_remember_me', e.target.checked ? 'true' : 'false');
                        }}
                      />
                      <div className="w-3.5 h-3.5 rounded-sm border border-[var(--border)] bg-[var(--bg-base)] peer-checked:bg-accent peer-checked:border-accent transition-theme"></div>
                      <svg className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-[10px] font-medium text-gray-500 group-hover:text-accent transition-colors">
                      {t('remember_me')}
                    </span>
                  </label>
                  
                  <button
                    type="button"
                    onClick={() => setMode('forgot-password')}
                    className="text-[10px] font-bold text-gray-500 hover:text-[var(--text-primary)] transition-colors"
                  >
                    {t('forgotPassword')}
                  </button>
                </div>
              )}
            </div>
          )}

          {mode === 'signup' && (
            <div>
              <div className="relative group">
                <div className={`absolute inset-y-0 flex items-center pointer-events-none ${dir === 'rtl' ? 'right-3' : 'left-3'}`}>
                  <Lock size={13} className="md:w-[14px] text-gray-400 group-focus-within:text-accent transition-colors" />
                </div>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full py-1.5 md:py-2 rounded-[var(--radius)] border outline-none transition-theme bg-[var(--bg-base)] border-[var(--border)] text-[var(--text-primary)] placeholder:text-gray-400 focus:border-accent/50 text-[11px] md:text-xs font-inter ${dir === 'rtl' ? 'pr-9 md:pr-10 pl-3' : 'pl-9 md:pl-10 pr-3'}`}
                  placeholder="••••••••"
                  dir="ltr"
                />
              </div>
            </div>
          )}

          {/* Dual Action Buttons Row: Login/Submit + Google Login side-by-side */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isLoading}
              className={`w-full py-2 bg-accent hover:bg-accent text-white rounded-[6px] font-bold transition-theme shadow-sm flex items-center justify-center gap-1.5 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''} text-[11px] md:text-xs`}
            >
              {isLoading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>{t('processing')}...</span>
                </>
              ) : (
                <>
                  <span>{mode === 'login' ? t('login') : mode === 'signup' ? t('signup') : t('sendResetLink')}</span>
                  <Sparkles size={13} className="opacity-70" />
                </>
              )}
            </motion.button>

            {mode !== 'forgot-password' && (
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={loginWithGoogle}
                type="button"
                className={`w-full py-2 flex items-center justify-center gap-1.5 rounded-[6px] border transition-theme bg-[var(--bg-base)] border-[var(--border-main)] hover:border-accent/40 text-[var(--text-primary)] shadow-sm text-[11px] md:text-xs group active:scale-95`}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="group-hover:drop-shadow-[0_0_4px_rgba(66,133,244,0.4)] transition-theme flex-shrink-0">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <span className="text-[var(--text-primary)] font-bold truncate">Google</span>
              </motion.button>
            )}
          </div>
        </form>

        <div className="mt-2 text-center">
          <p className="text-gray-500 text-[10px] md:text-[11px]">
            {mode === 'login' ? t('noAccount') : mode === 'signup' ? t('haveAccount') : t('rememberedPassword')}
            <button
              onClick={() => {
                if (mode === 'forgot-password') setMode('login');
                else setMode(mode === 'login' ? 'signup' : 'login');
              }}
              className="mx-1 text-accent hover:text-accent underline underline-offset-2 font-bold transition-theme"
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

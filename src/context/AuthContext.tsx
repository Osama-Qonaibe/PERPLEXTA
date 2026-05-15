import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '../types/user.types';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  token: string | null;
  setToken: (token: string | null) => void;
  isAuthReady: boolean;
  logout: (forceRedirect?: boolean) => void;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (email: string, password: string, name: string, ref?: string) => Promise<{ success: boolean; error?: string }>;
  balance: number;
  balanceUSD: number;
  setBalance: (val: number) => void;
  setBalanceUSD: (val: number) => void;
  showAuthModal: boolean;
  setShowAuthModal: (show: boolean) => void;
  authView: 'login' | 'signup' | 'forgot-password';
  setAuthView: (view: 'login' | 'signup' | 'forgot-password') => void;
  rememberMe: boolean;
  setRememberMe: (val: boolean) => void;
  fetchUserProfile: () => Promise<void>;
  fetchBalance: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  payWithBalance: (planId: string, billingCycle: 'monthly' | 'annual') => Promise<{ success: boolean; message?: string; error?: string }>;
  stripeCheckout: (planId: string, billingCycle: 'monthly' | 'annual') => Promise<{ url?: string; error?: string }>;
  isOperationPending: boolean;
  setIsOperationPending: (pending: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isOperationPending, setIsOperationPending] = useState(false);
  const [token, setToken] = useState<string | null>(() => {
    try {
      const getParam = (name: string) => {
        const searchParams = new URLSearchParams(window.location.search);
        if (searchParams.get(name)) return searchParams.get(name);
        const hash = window.location.hash;
        if (hash.includes('?')) {
          const hashQueryParams = new URLSearchParams(hash.split('?')[1]);
          return hashQueryParams.get(name);
        }
        return null;
      };

      const fromUrl = getParam('token');
      if (fromUrl) {
        localStorage.setItem('app_token', fromUrl);
        return fromUrl;
      }
      const rawToken = localStorage.getItem('app_token');
      if (rawToken === 'null' || rawToken === 'undefined') return null;
      return rawToken;
    } catch (e) {
      return null;
    }
  });

  const [isAuthReady, setIsAuthReady] = useState(false);
  const [balance, setBalance] = useState(0);
  const [balanceUSD, setBalanceUSD] = useState(0);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authView, setAuthView] = useState<'login' | 'signup' | 'forgot-password'>('login');
  const [rememberMe, setRememberMe] = useState(() => localStorage.getItem('app_remember_me') === 'true');

  const logout = useCallback((forceRedirect = true) => {
    if (token) {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      }).catch(e => console.error('API Logout error', e));
    }
    localStorage.removeItem('app_token');
    setToken(null);
    setUser(null);
    setBalance(0);
    setBalanceUSD(0);
    if (forceRedirect) {
      setTimeout(() => { window.location.href = '/'; }, 100);
    }
  }, [token]);

  const fetchWithRetry = async (url: string, options: any = {}, retries = 5, backoff = 1000): Promise<any> => {
    try {
      const res = await fetch(url, options);
      if (!res.ok) {
        if (retries > 0 && (res.status >= 500 || res.status === 404)) {
           await new Promise(r => setTimeout(r, backoff));
           return fetchWithRetry(url, options, retries - 1, backoff * 1.5);
        }
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return await res.json();
    } catch (err) {
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, backoff));
        return fetchWithRetry(url, options, retries - 1, backoff * 1.5);
      }
      throw err;
    }
  };

  const fetchUserProfile = useCallback(async () => {
    if (!token) {
      setIsAuthReady(true);
      return;
    }
    try {
      const data = await fetchWithRetry(`/api/user/me?t=${Date.now()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const userProfile = data.user || (data.email ? data : null);
      if (userProfile) {
        setUser(userProfile);
        setBalance(Number(userProfile.points || 0));
        setBalanceUSD(Number(userProfile.balance || 0));
      }
      setIsAuthReady(true);
    } catch (err) {
      console.error('Profile fetch error:', err);
      if (err instanceof Error && (err.message.includes('401') || err.message.includes('403'))) {
        logout(false);
      }
      setIsAuthReady(true);
    }
  }, [token, logout]);

  const fetchBalance = useCallback(async () => {
    if (!token) return;
    try {
      const data = await fetchWithRetry(`/api/user/me?skip_profile=1&t=${Date.now()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (data.points !== undefined) setBalance(Number(data.points));
      if (data.balance !== undefined) setBalanceUSD(Number(data.balance));
    } catch (err) {
      console.error('Balance fetch error:', err);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchUserProfile();
      fetchBalance();
    } else {
      setIsAuthReady(true);
    }
  }, [token, fetchUserProfile, fetchBalance]);

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch(`/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, remember: rememberMe })
      });
      if (res.ok) {
        const data = await res.json();
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem('app_token', data.token);
        setShowAuthModal(false);
        return { success: true };
      } else {
        const data = await res.json();
        return { success: false, error: data.error };
      }
    } catch (error) {
      return { success: false, error: 'Connection error' };
    }
  };

  const signup = async (email: string, password: string, name: string, ref?: string) => {
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, ref })
      });
      if (res.ok) {
        const data = await res.json();
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem('app_token', data.token);
        setShowAuthModal(false);
        return { success: true };
      } else {
        const data = await res.json();
        return { success: false, error: data.error };
      }
    } catch (error) {
      return { success: false, error: 'Connection error' };
    }
  };

  const loginWithGoogle = async () => {
    try {
      const ref = localStorage.getItem('app_ref');
      const lang = localStorage.getItem('language') || 'ar';
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
      const mode = (isMobileDevice || isStandalone) ? 'redirect' : 'popup';
      const res = await fetch(`/api/auth/google/url?lang=${lang}${ref ? `&ref=${ref}` : ''}&mode=${mode}&remember=${rememberMe}`);
      if (!res.ok) throw new Error(`Auth URL fetch failed: ${res.status}`);
      const data = await res.json();
      if (mode === 'redirect') {
        window.location.href = data.url;
        return;
      }
      const width = 500;
      const height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      window.open(data.url, 'Google Login', `width=${width},height=${height},left=${left},top=${top}`);
    } catch (error) {
      console.error('Login failed', error);
    }
  };

  const payWithBalance = async (planId: string, billingCycle: 'monthly' | 'annual') => {
    if (!token) {
      setShowAuthModal(true);
      return { success: false, error: 'Auth required' };
    }
    try {
      const res = await fetch('/api/subscriptions/pay-with-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ planId, billingCycle })
      });
      const data = await res.json();
      if (res.ok) {
        await fetchUserProfile();
        return { success: true, message: data.message };
      }
      return { success: false, error: data.error };
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  };

  const stripeCheckout = async (planId: string, billingCycle: 'monthly' | 'annual') => {
    if (!token) {
      setShowAuthModal(true);
      return { error: 'Auth required' };
    }
    try {
      const res = await fetch('/api/subscriptions/stripe-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ planId, billingCycle })
      });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
        return { url: data.url };
      }
      return { error: data.error || 'Stripe error' };
    } catch (error) {
      return { error: 'Network error' };
    }
  };

  return (
    <AuthContext.Provider value={{
      user, setUser, token, setToken, isAuthReady, logout, login, signup,
      balance, balanceUSD, setBalance, setBalanceUSD,
      showAuthModal, setShowAuthModal, authView, setAuthView,
      rememberMe, setRememberMe, fetchUserProfile, fetchBalance,
      loginWithGoogle, payWithBalance, stripeCheckout, isOperationPending, setIsOperationPending
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

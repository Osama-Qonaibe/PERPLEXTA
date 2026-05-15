import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../constants';

export interface User {
  id?: number;
  name: string;
  email: string;
  avatar?: string;
  role?: string;
  kyc_required?: boolean;
  kyc_status?: 'pending' | 'verified' | 'rejected' | 'none';
  kyc_rejection_reason?: string | null;
  custom_instructions?: string;
  memory?: string;
  subscription?: {
    plan_id: string;
    status: string;
    created_at?: string;
    current_period_end: string;
    last_period_start?: string;
    plan_name_en: string;
    plan_name_ar?: string;
    billing_period?: string;
    limits: Record<string, unknown>;
    plan_color?: string;
  } | null;
  usageStats?: Record<string, number>;
}

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  isAuthReady: boolean;
  token: string | null;
  balance: number;
  balanceUSD: number;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (email: string, password: string, name: string, ref?: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
  rememberMe: boolean;
  setRememberMe: (val: boolean) => void;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (isOpen: boolean) => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within AuthContext');
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);
  const [balanceUSD, setBalanceUSD] = useState(0);
  const [rememberMe, setRememberMe] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (stored) {
      setToken(stored);
      refreshUserWithToken(stored);
    } else {
      setIsAuthReady(true);
    }
  }, []);

  const refreshUserWithToken = useCallback(async (t: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      const data = await res.json();
      if (data.success && data.user) {
        setUser(data.user);
        setToken(t);
        setBalance(data.balance ?? 0);
        setBalanceUSD(data.balanceUSD ?? 0);
      } else {
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
        setToken(null);
      }
    } finally {
      setIsAuthReady(true);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    if (!token) return;
    await refreshUserWithToken(token);
  }, [token, refreshUserWithToken]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.success && data.token) {
        const storage = rememberMe ? localStorage : sessionStorage;
        storage.setItem('token', data.token);
        setToken(data.token);
        setUser(data.user);
        setBalance(data.balance ?? 0);
        setBalanceUSD(data.balanceUSD ?? 0);
        setIsAuthModalOpen(false);
        return { success: true };
      }
      return { success: false, error: data.message || 'Login failed' };
    } catch {
      return { success: false, error: 'Network error' };
    }
  }, [rememberMe]);

  const signup = useCallback(async (email: string, password: string, name: string, ref?: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, ref }),
      });
      const data = await res.json();
      if (data.success && data.token) {
        localStorage.setItem('token', data.token);
        setToken(data.token);
        setUser(data.user);
        setIsAuthModalOpen(false);
        return { success: true };
      }
      return { success: false, error: data.message || 'Signup failed' };
    } catch {
      return { success: false, error: 'Network error' };
    }
  }, []);

  const loginWithGoogle = useCallback(() => {
    window.location.href = `${API_BASE_URL}/api/v1/auth/google`;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setBalance(0);
    setBalanceUSD(0);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user, setUser, isAuthReady, token, balance, balanceUSD,
        login, signup, loginWithGoogle, logout, refreshUser,
        rememberMe, setRememberMe, isAuthModalOpen, setIsAuthModalOpen,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

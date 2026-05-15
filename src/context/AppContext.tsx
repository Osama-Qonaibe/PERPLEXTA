import React, { createContext, useContext } from 'react';
import { AuthProvider, useAuthContext, type User } from './AuthContext';
import { ThemeProvider, useThemeContext } from './ThemeContext';
import { SocketProvider, useSocketContext } from './SocketContext';
import { SettingsProvider, useSettingsContext, type SiteSettings } from './SettingsContext';
import { ChatProvider } from './ChatContext';
import { toast } from 'sonner';
import { API_BASE_URL } from '../constants';
import { Socket } from 'socket.io-client';

interface NotificationItem {
  id: number;
  type: string;
  title_ar?: string;
  title_en?: string;
  body_ar?: string;
  body_en?: string;
  is_read: boolean;
  created_at: string;
}

interface MilestoneData {
  percentage: number;
  toolKey: string;
  desc?: string;
}

interface MemoryNotification {
  isVisible: boolean;
  type: 'success' | 'warning' | 'cleanup' | 'optimization' | 'startup';
  desc?: string;
}

interface AppContextType {
  language: string;
  setLanguage: (lang: 'ar' | 'en') => void;
  theme: string;
  setTheme: (theme: 'dark' | 'light') => void;
  dir: 'rtl' | 'ltr';
  t: (key: string, replacements?: Record<string, string | number>) => string;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
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
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (isOpen: boolean) => void;
  plans: Record<string, unknown>[];
  setPlans: (plans: Record<string, unknown>[]) => void;
  siteSettings: SiteSettings;
  setSiteSettings: (settings: SiteSettings) => void;
  economySettings: Record<string, unknown>;
  setEconomySettings: (settings: Record<string, unknown>) => void;
  payWithBalance: (planId: string, billingCycle: 'monthly' | 'annual') => Promise<{ success: boolean; message?: string; error?: string }>;
  stripeCheckout: (planId: string, billingCycle: 'monthly' | 'annual') => Promise<{ url?: string; error?: string }>;
  refreshUser: () => Promise<void>;
  notifications: NotificationItem[];
  setNotifications: (notifications: NotificationItem[]) => void;
  unreadCount: number;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: number) => Promise<void>;
  clearAllNotifications: () => Promise<void>;
  socket: Socket | null;
  milestoneData: MilestoneData | null;
  setMilestoneData: (data: MilestoneData | null) => void;
  isMobile: boolean;
  isInstallable: boolean;
  isInstalling: boolean;
  rememberMe: boolean;
  isOperationPending: boolean;
  setIsOperationPending: (val: boolean) => void;
  setRememberMe: (val: boolean) => void;
  installApp: () => Promise<void>;
  memoryNotification: MemoryNotification;
  triggerMemoryNotification: (type: MemoryNotification['type'], desc?: string) => void;
  closeMemoryNotification: () => void;
}

export const AppContext = createContext<AppContextType | null>(null);

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
}

export { type User, type SiteSettings };

function AppContextBridge({ children }: { children: React.ReactNode }) {
  const auth = useAuthContext();
  const theme = useThemeContext();
  const { socket } = useSocketContext();
  const settings = useSettingsContext();

  const [notifications, setNotifications] = React.useState<NotificationItem[]>([]);
  const [milestoneData, setMilestoneData] = React.useState<MilestoneData | null>(null);
  const [isInstallable, setIsInstallable] = React.useState(false);
  const [isInstalling, setIsInstalling] = React.useState(false);
  const [isOperationPending, setIsOperationPending] = React.useState(false);
  const [memoryNotification, setMemoryNotification] = React.useState<MemoryNotification>({
    isVisible: false,
    type: 'startup',
  });
  const deferredPromptRef = React.useRef<BeforeInstallPromptEvent | null>(null);

  React.useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      deferredPromptRef.current = e as BeforeInstallPromptEvent;
      setIsInstallable(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  React.useEffect(() => {
    if (!auth.token) return;
    fetch(`${API_BASE_URL}/api/v1/notifications`, {
      headers: { Authorization: `Bearer ${auth.token}` },
    })
      .then((r) => r.json())
      .then((data) => { if (data.success) setNotifications(data.notifications ?? []); })
      .catch(() => {});
  }, [auth.token]);

  const translations: Record<string, Record<string, string>> = {};

  const t = React.useCallback(
    (key: string, replacements?: Record<string, string | number>): string => {
      const lang = theme.language;
      let val = translations[lang]?.[key] ?? key;
      if (replacements) {
        Object.entries(replacements).forEach(([k, v]) => {
          val = val.replace(`{${k}}`, String(v));
        });
      }
      return val;
    },
    [theme.language]
  );

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAsRead = React.useCallback(async (id: number) => {
    if (!auth.token) return;
    await fetch(`${API_BASE_URL}/api/v1/notifications/${id}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${auth.token}` },
    });
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  }, [auth.token]);

  const markAllAsRead = React.useCallback(async () => {
    if (!auth.token) return;
    await fetch(`${API_BASE_URL}/api/v1/notifications/read-all`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${auth.token}` },
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }, [auth.token]);

  const deleteNotification = React.useCallback(async (id: number) => {
    if (!auth.token) return;
    await fetch(`${API_BASE_URL}/api/v1/notifications/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${auth.token}` },
    });
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, [auth.token]);

  const clearAllNotifications = React.useCallback(async () => {
    if (!auth.token) return;
    await fetch(`${API_BASE_URL}/api/v1/notifications`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${auth.token}` },
    });
    setNotifications([]);
  }, [auth.token]);

  const payWithBalance = React.useCallback(async (
    planId: string,
    billingCycle: 'monthly' | 'annual'
  ) => {
    if (!auth.token) return { success: false, error: 'Not authenticated' };
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/payments/pay-with-balance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
        body: JSON.stringify({ planId, billingCycle }),
      });
      const data = await res.json();
      if (data.success) await auth.refreshUser();
      return data;
    } catch {
      return { success: false, error: 'Network error' };
    }
  }, [auth]);

  const stripeCheckout = React.useCallback(async (
    planId: string,
    billingCycle: 'monthly' | 'annual'
  ) => {
    if (!auth.token) return { error: 'Not authenticated' };
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/payments/stripe-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
        body: JSON.stringify({ planId, billingCycle }),
      });
      return res.json();
    } catch {
      return { error: 'Network error' };
    }
  }, [auth.token]);

  const installApp = React.useCallback(async () => {
    if (!deferredPromptRef.current) return;
    setIsInstalling(true);
    deferredPromptRef.current.prompt();
    await deferredPromptRef.current.userChoice;
    deferredPromptRef.current = null;
    setIsInstallable(false);
    setIsInstalling(false);
  }, []);

  const triggerMemoryNotification = React.useCallback(
    (type: MemoryNotification['type'], desc?: string) => {
      setMemoryNotification({ isVisible: true, type, desc });
    },
    []
  );

  const closeMemoryNotification = React.useCallback(() => {
    setMemoryNotification((prev) => ({ ...prev, isVisible: false }));
  }, []);

  const value: AppContextType = {
    language: theme.language,
    setLanguage: theme.setLanguage,
    theme: theme.theme,
    setTheme: theme.setTheme,
    dir: theme.dir,
    t,
    isSidebarOpen: theme.isSidebarOpen,
    setIsSidebarOpen: theme.setIsSidebarOpen,
    user: auth.user,
    setUser: auth.setUser,
    isAuthReady: auth.isAuthReady,
    token: auth.token,
    balance: auth.balance,
    balanceUSD: auth.balanceUSD,
    login: auth.login,
    signup: auth.signup,
    loginWithGoogle: auth.loginWithGoogle,
    logout: auth.logout,
    isAuthModalOpen: auth.isAuthModalOpen,
    setIsAuthModalOpen: auth.setIsAuthModalOpen,
    plans: settings.plans,
    setPlans: settings.setPlans,
    siteSettings: settings.siteSettings,
    setSiteSettings: settings.setSiteSettings,
    economySettings: settings.economySettings,
    setEconomySettings: settings.setEconomySettings,
    payWithBalance,
    stripeCheckout,
    refreshUser: auth.refreshUser,
    notifications,
    setNotifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    socket,
    milestoneData,
    setMilestoneData,
    isMobile: theme.isMobile,
    isInstallable,
    isInstalling,
    rememberMe: auth.rememberMe,
    isOperationPending,
    setIsOperationPending,
    setRememberMe: auth.setRememberMe,
    installApp,
    memoryNotification,
    triggerMemoryNotification,
    closeMemoryNotification,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => void;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AuthTokenBridge>
          {(token) => (
            <SocketProvider token={token}>
              <SettingsProvider token={token}>
                <ChatProvider>
                  <AppContextBridge>{children}</AppContextBridge>
                </ChatProvider>
              </SettingsProvider>
            </SocketProvider>
          )}
        </AuthTokenBridge>
      </ThemeProvider>
    </AuthProvider>
  );
}

function AuthTokenBridge({ children }: { children: (token: string | null) => React.ReactNode }) {
  const { token } = useAuthContext();
  return <>{children(token)}</>;
}

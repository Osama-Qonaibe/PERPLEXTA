import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { API_BASE_URL, SOCKET_URL } from '../constants/config';
import { translations, Language } from './translations';
import { User, SiteSettings, Theme, MemoryNotification } from '../types';

interface AppContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
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
  login: (email: string, password: string) => Promise<{ success: boolean, error?: string }>;
  signup: (email: string, password: string, name: string, ref?: string) => Promise<{ success: boolean, error?: string }>;
  loginWithGoogle: () => void;
  logout: () => void;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (isOpen: boolean) => void;
  plans: any[];
  setPlans: (plans: any[]) => void;
  siteSettings: SiteSettings;
  setSiteSettings: (settings: SiteSettings) => void;
  economySettings: any;
  setEconomySettings: (settings: any) => void;
  payWithBalance: (planId: string, billingCycle: 'monthly' | 'annual') => Promise<{ success: boolean, message?: string, error?: string }>;
  stripeCheckout: (planId: string, billingCycle: 'monthly' | 'annual') => Promise<{ url?: string, error?: string }>;
  refreshUser: () => Promise<void>;
  notifications: any[];
  setNotifications: (notifications: any[]) => void;
  unreadCount: number;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: number) => Promise<void>;
  clearAllNotifications: () => Promise<void>;
  socket: Socket | null;
  milestoneData: any;
  setMilestoneData: (data: any) => void;
  isMobile: boolean;
  isInstallable: boolean;
  isInstalling: boolean;
  rememberMe: boolean;
  isOperationPending: boolean;
  setIsOperationPending: (val: boolean) => void;
  setRememberMe: (val: boolean) => void;
  installApp: () => Promise<void>;
  memoryNotification: {
    isVisible: boolean;
    type: 'success' | 'warning' | 'cleanup' | 'optimization' | 'startup';
    desc?: string;
  };
  triggerMemoryNotification: (type: 'success' | 'warning' | 'cleanup' | 'optimization' | 'startup', desc?: string) => void;
  closeMemoryNotification: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    try { return (localStorage.getItem('language') as Language) || 'ar'; } catch (e) { return 'ar'; }
  });
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      return (localStorage.getItem('theme') as Theme) || 'dark';
    } catch (e) {
      return 'dark';
    }
  });
  const [user, setUser] = useState<User | null>(null);
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
      console.warn('Failed to parse token from URL or storage', e);
      return null;
    }
  });
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isAuthReady, setIsAuthReady] = useState<boolean>(false);
  const [balance, setBalance] = useState<number>(0);
  const [balanceUSD, setBalanceUSD] = useState<number>(0);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isOperationPending, setIsOperationPending] = useState(false);

  const [memoryNotification, setMemoryNotification] = useState<{
    isVisible: boolean;
    type: 'success' | 'warning' | 'cleanup' | 'optimization' | 'startup';
    desc?: string;
  }>({
    isVisible: false,
    type: 'success'
  });

  const triggerMemoryNotification = (type: 'success' | 'warning' | 'cleanup' | 'optimization' | 'startup', desc?: string) => {
    setMemoryNotification({
      isVisible: true,
      type,
      desc
    });
  };

  const closeMemoryNotification = () => {
    setMemoryNotification(prev => ({ ...prev, isVisible: false }));
  };
  const [rememberMe, setRememberMe] = useState<boolean>(() => {
    return localStorage.getItem('app_remember_me') === 'true';
  });
  
  const dir = language === 'ar' ? 'rtl' : 'ltr';
  
  const handleLanguageChange = async (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('language', lang); 
    if (token) {
      try {
        await fetch('/api/user/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ language: lang })
        });
      } catch (e) {
        console.error('Failed to sync language to server', e);
      }
    }
  };

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
  };

  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isOperationPending) {
        e.preventDefault();
        e.returnValue = ''; 
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isOperationPending]);

  const installApp = async () => {
    if (!deferredPrompt) return;
    setIsInstalling(true);
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
      setDeferredPrompt(null);
    }
    setIsInstalling(false);
  };

  const [economySettings, setEconomySettings] = useState<any>({ 
    welcome_bonus_points: 600, 
    referral_bonus_points: 1000, 
    points_per_dollar: 1000, 
    conversion_rate: 0.001 
  });
  useEffect(() => {
    const handleAuthSuccess = (userData: any) => {
      if (localStorage.getItem('app_oauth_syncing') === 'true') return;
      localStorage.setItem('app_oauth_syncing', 'true');

      const { token: newToken, lang: authLang, ...info } = userData;
      localStorage.setItem('app_token', newToken);
      setToken(newToken);
      setUser(info);
      setIsAuthModalOpen(false); 
      
      if (authLang && (authLang === 'ar' || authLang === 'en')) {
        setLanguage(authLang as any);
        localStorage.setItem('language', authLang);
      }
      
      const targetRefRaw = userData.ref || localStorage.getItem('app_ref') || '/';
      const targetRef = (targetRefRaw.startsWith('/') && !targetRefRaw.startsWith('//')) ? targetRefRaw : '/';
      localStorage.removeItem('app_ref');
      
      setTimeout(() => {
        localStorage.removeItem('app_oauth_syncing');
        
        const currentPath = window.location.pathname;
        if ((targetRef === '/' || targetRef === '/chats') && (currentPath === '/' || currentPath === '/chats')) {
          return;
        }
        
        window.location.href = targetRef;
      }, 600);
    };

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

    const urlToken = getParam('token');
    const urlUserRaw = getParam('user');

    if (urlToken && urlToken !== token) {
      localStorage.setItem('app_token', urlToken);
      setToken(urlToken);
      
      let userData = null;
      if (urlUserRaw) {
        try {
          userData = JSON.parse(decodeURIComponent(urlUserRaw));
          setUser(userData);
        } catch (e) {
          console.error('Failed to parse user from URL', e);
        }
      }

      if (window.opener && window.opener !== window) {
        window.opener.postMessage({ 
          type: 'OAUTH_AUTH_SUCCESS', 
          user: { token: urlToken, ...userData } 
        }, window.location.origin);
        
        const authChannel = new BroadcastChannel('app_oauth_channel');
        authChannel.postMessage({ 
          type: 'OAUTH_AUTH_SUCCESS', 
          user: { token: urlToken, ...userData } 
        });
        
        setTimeout(() => window.close(), 500);
      } else {
        handleAuthSuccess({ token: urlToken, ...userData });
        const newUrl = window.location.pathname + (window.location.hash.includes('?') ? window.location.hash.split('?')[0] : window.location.hash);
        window.history.replaceState({}, '', newUrl);
      }
    }

    const ref = getParam('ref');
    if (ref) localStorage.setItem('app_ref', ref);

    const messageListener = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        handleAuthSuccess(event.data.user);
      }
    };

    const authChannel = new BroadcastChannel('app_oauth_channel');
    authChannel.onmessage = (event) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        handleAuthSuccess(event.data.user);
      }
    };

    const storageListener = (event: StorageEvent) => {
      if (event.key === 'app_oauth_trigger' && event.newValue) {
        const storedToken = localStorage.getItem('app_token');
        const userDataJson = localStorage.getItem('app_oauth_user');
        if (storedToken && userDataJson) {
          try {
            const userData = JSON.parse(userDataJson);
            const processedUser = userData.user ? { token: userData.token, ...userData.user } : userData;
            handleAuthSuccess(processedUser);
            localStorage.removeItem('app_oauth_user');
            localStorage.removeItem('app_oauth_trigger');
          } catch (e) { console.error('Failed to parse OAuth storage data', e); }
        }
      }
    };

    window.addEventListener('message', messageListener);
    window.addEventListener('storage', storageListener);

    return () => {
      authChannel.close();
      window.removeEventListener('message', messageListener);
      window.removeEventListener('storage', storageListener);
    };
  }, [dir]);

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
        console.warn(`Fetch failed for ${url}, retrying in ${backoff}ms... (${retries} retries left)`, err);
        await new Promise(resolve => setTimeout(resolve, backoff));
        return fetchWithRetry(url, options, retries - 1, backoff * 1.5);
      }
      throw err;
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isAuthReady) {
        console.warn('Auth ready took too long, forcing ready state for boot resilience.');
        setIsAuthReady(true);
      }
    }, 8000); 
    return () => clearTimeout(timer);
  }, [isAuthReady]);

  const fetchUserProfile = async () => {
    if (!token) return;
    try {
      const data = await fetchWithRetry(`/api/user/me?t=${Date.now()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const userProfile = data.user || (data.email ? data : null);
      
      if (userProfile) {
        setUser(userProfile);
        setBalance(Number(userProfile.points || 0));
        setBalanceUSD(Number(userProfile.balance || 0));
        if (userProfile.language) setLanguage(userProfile.language as Language);
        if (data.economy) setEconomySettings(data.economy);
      }
      setIsAuthReady(true);
    } catch (err) {
      console.error('Profile fetch error:', err);
      if (err instanceof Error && (err.message.includes('401') || err.message.includes('403'))) {
        logout(false);
      }
      setIsAuthReady(true);
    }
  };

  const fetchBalance = async () => {
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
  };

  useEffect(() => {
    fetch(`/api/economy`)
      .then(res => res.json())
      .then(data => data && data.points_per_dollar && setEconomySettings(data))
      .catch(() => {});

    if (token) {
      fetchUserProfile();
      fetchBalance();
      if (socket && !socket.connected) {
        socket.auth = { token };
        socket.connect();
      }
    } else {
      setIsAuthReady(true);
    }
  }, [token, socket]);

  const loginWithGoogle = async () => {
    try {
      const ref = localStorage.getItem('app_ref');
      const lang = localStorage.getItem('language') || 'ar';
      
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
      
      const mode = (isMobileDevice || isStandalone) ? 'redirect' : 'popup';
      
      const res = await fetch(`/api/auth/google/url?lang=${lang}${ref ? `&ref=${ref}` : ''}&mode=${mode}&remember=${rememberMe}`);
      
      if (!res.ok) {
        throw new Error(`Auth URL fetch failed: ${res.status}`);
      }

      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await res.text();
        console.error('Non-JSON response from Google Auth URL:', text);
        throw new Error('Invalid server response');
      }

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

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch(`/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, remember: rememberMe })
      });
      
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (res.ok) {
          setToken(data.token);
          setUser(data.user);
          localStorage.setItem('app_token', data.token);
          setIsAuthModalOpen(false);
          toast.success(dir === 'rtl' ? 'تم تسجيل الدخول بنجاح!' : 'Login Successful!');
          
          setTimeout(() => {
            window.location.href = '/';
          }, 500);
          
          return { success: true };
        } else {
          return { success: false, error: data.error };
        }
      } else {
        const text = await res.text();
        console.error('Non-JSON response from login:', text);
        return { 
          success: false, 
          error: text.includes('Rate exceeded') 
            ? (dir === 'rtl' ? 'تم تجاوز حد الطلبات. يرجى المحاولة لاحقاً.' : 'Rate limit exceeded. Please try again later.')
            : (dir === 'rtl' ? 'حدث خطأ في الخادم' : 'Server error occurred') 
        };
      }
    } catch (error) {
      console.error('Login connection error:', error);
      return { success: false, error: dir === 'rtl' ? 'خطأ في الاتصال' : 'Connection error' };
    }
  };

  const signup = async (email: string, password: string, name: string, ref?: string) => {
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, ref })
      });
      
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (res.ok) {
          setToken(data.token);
          setUser(data.user);
          localStorage.setItem('app_token', data.token);
          setIsAuthModalOpen(false);
          toast.success(dir === 'rtl' ? 'تم إنشاء الحساب بنجاح!' : 'Account Created Successfully!');
          
          setTimeout(() => {
            window.location.href = '/';
          }, 500);
          
          return { success: true };
        } else {
          return { success: false, error: data.error };
        }
      } else {
        const text = await res.text();
        console.error('Non-JSON response from signup:', text);
        return { 
          success: false, 
          error: text.includes('Rate exceeded') 
            ? (dir === 'rtl' ? 'تم تجاوز حد الطلبات. يرجى المحاولة لاحقاً.' : 'Rate limit exceeded. Please try again later.')
            : (dir === 'rtl' ? 'حدث خطأ في الخادم' : 'Server error occurred') 
        };
      }
    } catch (error) {
      console.error('Signup connection error:', error);
      return { success: false, error: dir === 'rtl' ? 'خطأ في الاتصال' : 'Connection error' };
    }
  };

  const logout = (forceRedirect = true) => {
    // 1. Force UI into loading/reset state immediately to prevent "stale state" crashes in sub-components
    setIsAuthReady(false);
    setIsAuthModalOpen(false);

    // 2. Clear Token from local storage first to prevent auto-login on refresh
    localStorage.removeItem('app_token');
    
    // 3. API logout (Fire and forget, but keep it clean)
    if (token) {
      fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      }).catch(e => console.error('API Logout error', e));
    }

    // 4. Force Disconnect Socket and Null it out to stop all real-time events
    if (socket) {
      try {
        socket.disconnect();
      } catch (e) {
        console.error('Socket disconnect error during logout', e);
      }
      setSocket(null);
    }
    
    // 5. Clear ALL sensitive state variants
    setToken(null);
    setUser(null);
    setBalance(0);
    setBalanceUSD(0);
    setNotifications([]);
    setMilestoneData(null);
    
    // 6. Pre-emptive small delay to let React states settle before the hard redirect
    // Use window.location.replace to eliminate the legacy session from history
    if (forceRedirect) {
      setTimeout(() => {
        window.location.replace('/');
      }, 50);
    }
  };

  const [siteSettings, setSiteSettings] = useState<SiteSettings>(() => {
    const saved = localStorage.getItem('site_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved site settings', e);
      }
    }
    return {
      siteName: '',
      siteNameAr: '',
      siteDescription: '',
      siteDescriptionAr: '',
      logoBase64: null,
      faviconBase64: null,
      seoDescriptionEn: '',
      seoDescriptionAr: '',
      keywordsEn: '',
      keywordsAr: '',
      googleAnalyticsId: ''
    };
  });

  useEffect(() => {
    localStorage.setItem('site_settings', JSON.stringify(siteSettings));
  }, [siteSettings]);

  useEffect(() => {
    const appName = language === 'ar' ? siteSettings.siteNameAr : siteSettings.siteName;
    const nameToUse = appName || (language === 'ar' ? 'المنصة الذكية' : 'Smart Platform');
    
    document.title = nameToUse;
  }, [siteSettings, language]);

  const [plans, setPlans] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [milestoneData, setMilestoneData] = useState<any>(null);
  const unreadCount = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    const socketEndpoint = SOCKET_URL || window.location.origin;
    const socketOptions: any = { 
      transports: ['polling', 'websocket'], 
      autoConnect: !!token 
    };

    if (token) {
      socketOptions.auth = { token };
    }

    const newSocket = io(socketEndpoint, socketOptions);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      if (user?.id) {
        newSocket.emit('register_user', user.id);
      }
    });

    newSocket.on('new_notification', (notif: any) => {
      setNotifications(prev => [notif, ...prev]);
    });

    newSocket.on('quota_milestone', (data: any) => {
      setMilestoneData(data);
    });

    newSocket.on('user_profile_updated', () => {
      refreshUser();
    });

    newSocket.on('usage_update', (data: { toolId: string; usageCount: number }) => {
      setUser(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          usageStats: {
            ...prev.usageStats,
            [data.toolId]: data.usageCount
          }
        };
      });
    });

    return () => {
      if (newSocket) newSocket.disconnect();
    };
  }, [token]);

  useEffect(() => {
    if (socket && socket.connected && user?.id) {
      socket.emit('register_user', user.id);
      
      const handleNewNotification = (notif: any) => {
        setNotifications(prev => [notif, ...prev]);
        
        if (Notification.permission === 'granted') {
          new Notification(language === 'ar' ? notif.title_ar : notif.title_en, {
            body: language === 'ar' ? notif.message_ar : notif.message_en,
            icon: '/favicon.ico'
          });
        }
      };

      socket.on('new_notification', handleNewNotification);

      return () => {
        socket.off('new_notification', handleNewNotification);
      };
    }
  }, [socket, user, language]);

  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/notifications', {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
      if (res.ok) {
        setNotifications(await res.json());
      } else if (res.status === 401) {
        console.warn('Unauthorized notification fetch - session likely expired');
      } else {
        console.error('Failed to fetch notifications:', res.status, res.statusText);
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('Failed to fetch')) {
        console.debug('Transient network error fetching notifications (likely server initializing)');
      } else {
        console.error('Error fetching notifications:', error);
      }
    }
  };

  const markAsRead = async (id: number) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      }
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/notifications/read-all', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const deleteNotification = async (id: number) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const clearAllNotifications = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/notifications/all', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setNotifications([]);
      }
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  };

  useEffect(() => {
    if (token) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [token]);

  const refreshUser = async () => {
    if (!token) return;
    try {
      const res = await fetch(`/api/user/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const userProfile = data.user || (data.email ? data : null);
        if (userProfile) {
          setUser(userProfile);
          setBalance(Number(userProfile.points || 0));
          setBalanceUSD(Number(userProfile.balance || 0));
          if (data.economy) {
            setEconomySettings(data.economy);
          }
        }
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
    }
  };

  const payWithBalance = async (planId: string, billingCycle: 'monthly' | 'annual') => {
    if (!token) {
      setIsAuthModalOpen(true);
      return { success: false, error: 'Auth required' };
    }
    try {
      const res = await fetch('/api/subscriptions/pay-with-balance', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ planId, billingCycle })
      });
      const data = await res.json();
      if (res.ok) {
        await refreshUser();
        return { success: true, message: data.message };
      }
      return { success: false, error: data.error };
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  };

  const stripeCheckout = async (planId: string, billingCycle: 'monthly' | 'annual') => {
    if (!token) {
      setIsAuthModalOpen(true);
      return { error: 'Auth required' };
    }
    try {
      const res = await fetch('/api/subscriptions/stripe-checkout', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
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

  useEffect(() => {
    const fetchSettingsAndPlans = async () => {
      const options = token ? { headers: { 'Authorization': `Bearer ${token}` } } : {};
      
      try {
        const settingsData = await fetchWithRetry('/api/settings', options);
        setSiteSettings({
          siteName: settingsData.site_name_en || '',
          siteNameAr: settingsData.site_name_ar || '',
          siteDescription: settingsData.site_description_en || '',
          siteDescriptionAr: settingsData.site_description_ar || '',
          seoDescriptionEn: settingsData.seo_description_en || '',
          seoDescriptionAr: settingsData.seo_description_ar || '',
          keywordsEn: settingsData.keywords_en || '',
          keywordsAr: settingsData.keywords_ar || '',
          googleAnalyticsId: settingsData.google_analytics_id || '',
          maintenanceMode: !!settingsData.maintenance_mode,
          registrationEnabled: !!settingsData.registration_enabled,
          logoBase64: settingsData.logo_url || null,
          faviconBase64: settingsData.favicon_url || null
        });
      } catch (err) {
         console.warn('Settings fetch failed (likely unauthorized or server starting):', err);
      }

      try {
        const ecoData = await fetchWithRetry('/api/economy', options, 2, 500);
        setEconomySettings(ecoData);
      } catch (ecoError) {
        console.log('Economy fetch failed (likely unauthorized):', ecoError);
      }

      try {
        const plansData = await fetchWithRetry('/api/plans', options);
        const formattedPlans = (plansData || []).map((p: any) => {
          let features = [];
          let limits = {};
          
          try {
            features = Array.isArray(p.features) ? p.features : (typeof p.features === 'string' ? JSON.parse(p.features || '[]') : []);
          } catch (e) {
            console.error(`Error parsing features for plan ${p.id}:`, e);
          }
          
          try {
            limits = typeof p.limits === 'object' && p.limits !== null ? p.limits : (typeof p.limits === 'string' ? JSON.parse(p.limits || '{}') : {});
          } catch (e) {
            console.error(`Error parsing limits for plan ${p.id}:`, e);
          }

          return {
            id: p.id.toString(),
            nameEn: p.name_en || '',
            nameAr: p.name_ar || '',
            descEn: p.desc_en || '',
            descAr: p.desc_ar || '',
            badge: p.badge || 'none',
            discount: p.discount || 0,
            isActive: p.is_active ?? true,
            isVisible: p.is_visible ?? true,
            monthlyPrice: parseFloat(p.monthly_price || 0),
            annualPrice: parseFloat(p.annual_price || 0),
            color: p.color || '#10b981',
            features,
            limits
          };
        });
        setPlans(formattedPlans);
      } catch (error) {
        console.error('CRITICAL: Error fetching public plan data:', error);
      }
    };
    fetchSettingsAndPlans();
  }, [token]);

  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = language;
    localStorage.setItem('language', language);
    
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
    localStorage.setItem('theme', theme);
  }, [language, theme, dir]);


  useEffect(() => {
    const currentSiteName = language === 'ar' ? (siteSettings.siteNameAr || siteSettings.siteName) : siteSettings.siteName;
    const currentSiteDesc = language === 'ar' ? (siteSettings.siteDescriptionAr || siteSettings.siteDescription) : siteSettings.siteDescription;
    
    document.title = currentSiteName || '...';
    
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', (language === 'ar' ? siteSettings.seoDescriptionAr : siteSettings.seoDescriptionEn) || currentSiteDesc);

    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (!metaKeywords) {
      metaKeywords = document.createElement('meta');
      metaKeywords.setAttribute('name', 'keywords');
      document.head.appendChild(metaKeywords);
    }
    metaKeywords.setAttribute('content', (language === 'ar' ? siteSettings.keywordsAr : siteSettings.keywordsEn));

    if (siteSettings.faviconBase64) {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = siteSettings.faviconBase64;
    }

    if (siteSettings.googleAnalyticsId) {
      let gaScript = document.getElementById('ga-script') as HTMLScriptElement;
      if (!gaScript) {
        gaScript = document.createElement('script');
        gaScript.id = 'ga-script';
        gaScript.async = true;
        document.head.appendChild(gaScript);
      }
      gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${siteSettings.googleAnalyticsId}`;

      let gaInlineScript = document.getElementById('ga-inline-script');
      if (!gaInlineScript) {
        gaInlineScript = document.createElement('script');
        gaInlineScript.id = 'ga-inline-script';
        document.head.appendChild(gaInlineScript);
      }
      gaInlineScript.innerHTML = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${siteSettings.googleAnalyticsId}');
      `;
    }
  }, [siteSettings, language]);

  const t = (key: string, replacements?: Record<string, string | number>) => {
    let str = (translations[language] as any)[key] || key;
    
    if (key === 'appName') {
      str = language === 'ar' 
        ? (siteSettings.siteNameAr || '') 
        : (siteSettings.siteName || '');
    }

    if (replacements) {
      Object.entries(replacements).forEach(([k, v]) => {
        str = str.replace(`{${k}}`, v.toString());
      });
    }
    return str;
  };

  return (
    <AppContext.Provider value={{ 
      language, setLanguage: handleLanguageChange, 
      theme, setTheme: handleThemeChange, 
      dir, t, 
      isSidebarOpen, setIsSidebarOpen,
      user, setUser, isAuthReady,
      token, balance,
      login, signup,
      loginWithGoogle, logout,
      isAuthModalOpen, setIsAuthModalOpen,
      plans, setPlans,
      siteSettings, setSiteSettings,
      economySettings, setEconomySettings,
      payWithBalance, stripeCheckout, refreshUser, balanceUSD,
      notifications, setNotifications, unreadCount, markAsRead, markAllAsRead,
      deleteNotification,
      clearAllNotifications,
      socket,
      milestoneData,
      setMilestoneData,
      isMobile,
      isInstallable,
      isInstalling,
      rememberMe,
      setRememberMe,
      isOperationPending,
      setIsOperationPending,
      installApp,
      memoryNotification,
      triggerMemoryNotification,
      closeMemoryNotification
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

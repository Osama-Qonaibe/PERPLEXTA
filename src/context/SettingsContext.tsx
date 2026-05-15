import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { SiteSettings } from '../types/ui.types';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';
import { useTheme } from './ThemeContext';

interface SettingsContextType {
  siteSettings: SiteSettings;
  setSiteSettings: (settings: SiteSettings) => void;
  economySettings: any;
  setEconomySettings: (settings: any) => void;
  plans: any[];
  setPlans: (plans: any[]) => void;
  notifications: any[];
  setNotifications: (notifs: any[]) => void;
  isSettingsLoading: boolean;
  refreshEconomy: () => Promise<void>;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: number) => Promise<void>;
  clearAllNotifications: () => Promise<void>;
  milestoneData: any;
  setMilestoneData: (data: any) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, user, fetchUserProfile } = useAuth();
  const { socket } = useSocket();
  const { language } = useTheme();

  const [milestoneData, setMilestoneData] = useState<any>(null);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(() => {
    const saved = localStorage.getItem('site_settings');
    return saved ? JSON.parse(saved) : {
      siteName: '', siteNameAr: '', siteDescription: '', siteDescriptionAr: '',
      logoBase64: null, faviconBase64: null, seoDescriptionEn: '', seoDescriptionAr: '',
      keywordsEn: '', keywordsAr: '', googleAnalyticsId: '',
      maintenanceMode: false
    };
  });

  const [economySettings, setEconomySettings] = useState<any>({ 
    welcome_bonus_points: 600, referral_bonus_points: 1000, 
    points_per_dollar: 1000, conversion_rate: 0.001 
  });
  const [plans, setPlans] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isSettingsLoading, setIsSettingsLoading] = useState(true);

  useEffect(() => {
    localStorage.setItem('site_settings', JSON.stringify(siteSettings));
    const appName = language === 'ar' ? siteSettings.siteNameAr : siteSettings.siteName;
    document.title = appName || (language === 'ar' ? 'المنصة الذكية' : 'Smart Platform');
  }, [siteSettings, language]);

  const fetchSettingsAndPlans = useCallback(async () => {
    const options = token ? { headers: { 'Authorization': `Bearer ${token}` } } : {};
    try {
      const settingsRes = await fetch('/api/settings', options);
      if (settingsRes.ok) {
        const s = await settingsRes.json();
        setSiteSettings({
          siteName: s.site_name_en || '', siteNameAr: s.site_name_ar || '',
          siteDescription: s.site_description_en || '', siteDescriptionAr: s.site_description_ar || '',
          seoDescriptionEn: s.seo_description_en || '', seoDescriptionAr: s.seo_description_ar || '',
          keywordsEn: s.keywords_en || '', keywordsAr: s.keywords_ar || '',
          googleAnalyticsId: s.google_analytics_id || '',
          logoBase64: s.logo_url || null, faviconBase64: s.favicon_url || null,
          maintenanceMode: s.maintenance_mode || false
        });
      }
      const ecoRes = await fetch('/api/economy', options);
      if (ecoRes.ok) setEconomySettings(await ecoRes.json());
      
      const plansRes = await fetch('/api/plans', options);
      if (plansRes.ok) setPlans(await plansRes.json());

      setIsSettingsLoading(false);
    } catch (err) {
      setIsSettingsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchSettingsAndPlans();
  }, [fetchSettingsAndPlans]);

  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/notifications', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setNotifications(await res.json());
    } catch (err) {}
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [token, fetchNotifications]);

  useEffect(() => {
    if (socket) {
      socket.on('new_notification', (notif: any) => {
        setNotifications(prev => [notif, ...prev]);
        if (Notification.permission === 'granted') {
          new Notification(language === 'ar' ? notif.title_ar : notif.title_en, {
            body: language === 'ar' ? notif.message_ar : notif.message_en,
            icon: siteSettings.faviconBase64 || '/favicon.ico'
          });
        }
      });
      socket.on('quota_milestone', (data: any) => {
        setMilestoneData(data);
      });
      socket.on('user_profile_updated', fetchUserProfile);
      return () => {
        socket.off('new_notification');
        socket.off('quota_milestone');
        socket.off('user_profile_updated');
      };
    }
  }, [socket, language, siteSettings.faviconBase64, fetchUserProfile]);

  const markAsRead = async (id: number) => {
    if (!token) return;
    await fetch(`/api/notifications/${id}/read`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const markAllAsRead = async () => {
    if (!token) return;
    await fetch('/api/notifications/read-all', { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } });
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const deleteNotification = async (id: number) => {
    if (!token) return;
    await fetch(`/api/notifications/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAllNotifications = async () => {
    if (!token) return;
    await fetch('/api/notifications/all', { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    setNotifications([]);
  };

  return (
    <SettingsContext.Provider value={{
      siteSettings, setSiteSettings, economySettings, setEconomySettings,
      plans, setPlans, notifications, setNotifications, isSettingsLoading, milestoneData, setMilestoneData,
      refreshEconomy: fetchSettingsAndPlans, markAsRead, markAllAsRead, deleteNotification, clearAllNotifications
    }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) throw new Error('useSettings must be used within a SettingsProvider');
  return context;
};

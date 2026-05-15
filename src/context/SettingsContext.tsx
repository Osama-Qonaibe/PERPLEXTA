import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../constants';

export interface SiteSettings {
  siteName: string;
  siteNameAr: string;
  siteDescription: string;
  siteDescriptionAr: string;
  logoBase64: string | null;
  faviconBase64: string | null;
  seoDescriptionEn: string;
  seoDescriptionAr: string;
  keywordsEn: string;
  keywordsAr: string;
  googleAnalyticsId: string;
}

const defaultSiteSettings: SiteSettings = {
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
  googleAnalyticsId: '',
};

interface SettingsContextType {
  siteSettings: SiteSettings;
  setSiteSettings: (settings: SiteSettings) => void;
  economySettings: Record<string, unknown>;
  setEconomySettings: (settings: Record<string, unknown>) => void;
  plans: Record<string, unknown>[];
  setPlans: (plans: Record<string, unknown>[]) => void;
}

export const SettingsContext = createContext<SettingsContextType | null>(null);

export function useSettingsContext() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettingsContext must be used within SettingsContext');
  return ctx;
}

export function SettingsProvider({ token, children }: { token: string | null; children: React.ReactNode }) {
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(defaultSiteSettings);
  const [economySettings, setEconomySettings] = useState<Record<string, unknown>>({});
  const [plans, setPlans] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/v1/system/settings`)
      .then((r) => r.json())
      .then((data) => { if (data.success && data.settings) setSiteSettings(data.settings); })
      .catch(() => {});

    fetch(`${API_BASE_URL}/api/v1/plans`)
      .then((r) => r.json())
      .then((data) => { if (data.success && data.plans) setPlans(data.plans); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE_URL}/api/v1/admin/financial/economy`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => { if (data.success && data.settings) setEconomySettings(data.settings); })
      .catch(() => {});
  }, [token]);

  return (
    <SettingsContext.Provider value={{ siteSettings, setSiteSettings, economySettings, setEconomySettings, plans, setPlans }}>
      {children}
    </SettingsContext.Provider>
  );
}

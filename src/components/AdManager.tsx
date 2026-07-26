import React from 'react';
import { AdsManagementView, AdItem } from '../pages/AdsManagementView';
import { useAppContext } from '../context/AppContext';

export type { AdItem };

export interface AdManagerProps {
  theme?: string;
  t?: (key: string) => string;
  dir?: string;
  language?: string;
}

export const AdManager: React.FC<AdManagerProps> = ({
  theme = 'dark',
  t = (k: string) => k,
  dir = 'rtl',
  language
}) => {
  const { language: ctxLang } = useAppContext();
  const currentLang = language || ctxLang || 'ar';

  return (
    <AdsManagementView
      theme={theme}
      t={t}
      dir={dir}
      language={currentLang}
    />
  );
};

export default AdManager;

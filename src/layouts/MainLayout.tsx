import React from 'react';
import { useAppContext } from '../context/AppContext';
import { MobileAppLayout } from './MobileAppLayout';
import { DesktopLayout } from './DesktopLayout';

export const MainLayout: React.FC = () => {
  const { isMobile } = useAppContext();

  return isMobile ? <MobileAppLayout /> : <DesktopLayout />;
};

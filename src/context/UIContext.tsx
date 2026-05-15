import React, { createContext, useContext, useState, useEffect } from 'react';
import { MemoryNotification } from '../types/ui.types';

interface UIContextType {
  isMobile: boolean;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  deferredPrompt: any;
  isInstallable: boolean;
  isInstalling: boolean;
  isOperationPending: boolean;
  setIsOperationPending: (pending: boolean) => void;
  installApp: () => void;
  memoryNotification: MemoryNotification;
  setMemoryNotification: (notif: MemoryNotification) => void;
  triggerMemoryNotification: (type: 'success' | 'warning' | 'cleanup' | 'optimization' | 'startup', desc?: string) => void;
  closeMemoryNotification: () => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isOperationPending, setIsOperationPending] = useState(false);
  const [memoryNotification, setMemoryNotification] = useState<MemoryNotification>({
    isVisible: false,
    type: 'success'
  });

  const triggerMemoryNotification = (type: any, desc?: string) => {
    setMemoryNotification({ isVisible: true, type, desc });
  };

  const closeMemoryNotification = () => {
    setMemoryNotification(prev => ({ ...prev, isVisible: false }));
  };

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

  return (
    <UIContext.Provider value={{
      isMobile, isSidebarOpen, setIsSidebarOpen, deferredPrompt,
      isInstallable, isInstalling, isOperationPending, setIsOperationPending, installApp, memoryNotification, setMemoryNotification,
      triggerMemoryNotification, closeMemoryNotification
    }}>
      {children}
    </UIContext.Provider>
  );
};

export const useUI = () => {
  const context = useContext(UIContext);
  if (context === undefined) throw new Error('useUI must be used within a UIProvider');
  return context;
};

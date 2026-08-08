import React, { createContext, useContext } from 'react';
import { usePwaInstall, UsePwaInstallReturn } from '../hooks/usePwaInstall';

const PwaContext = createContext<UsePwaInstallReturn | null>(null);

export const PwaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pwaState = usePwaInstall();

  return (
    <PwaContext.Provider value={pwaState}>
      {children}
    </PwaContext.Provider>
  );
};

export const usePwaContext = (): UsePwaInstallReturn => {
  const context = useContext(PwaContext);
  if (!context) {
    throw new Error('usePwaContext must be used within a PwaProvider');
  }
  return context;
};

export const usePwa = usePwaContext;

import React, { createContext, useContext } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import { ThemeProvider, useTheme } from './ThemeContext';
import { SocketProvider, useSocket } from './SocketContext';
import { SettingsProvider, useSettings } from './SettingsContext';
import { UIProvider, useUI } from './UIContext';
// Create a bridge context for backward compatibility
const AppContext = createContext<any>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <SettingsProvider>
            <UIProvider>
              <AppContextBridge>
                {children}
              </AppContextBridge>
            </UIProvider>
          </SettingsProvider>
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

// This component bridges the new split context values into the old monolithic useAppContext
const AppContextBridge: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const auth = useAuth();
  const theme = useTheme();
  const socket = useSocket();
  const settings = useSettings();
  const ui = useUI();

  // Combine everything for backward compatibility
  const value: any = {
    ...auth,
    ...theme,
    ...socket,
    ...settings,
    ...ui,
    // Explicitly define compatibility naming if different
    setIsAuthModalOpen: auth.setShowAuthModal,
    isAuthModalOpen: auth.showAuthModal,
    unreadCount: settings.notifications.filter(n => !n.is_read).length,
    refreshUser: auth.fetchUserProfile,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

// Export individual hooks for the new architecture
export { useAuth, useTheme, useSocket, useSettings, useUI };

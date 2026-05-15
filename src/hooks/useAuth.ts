import { useContext } from 'react';
import { AppContext } from '../context/AppContext';

export function useAuth() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAuth must be used within AppContext');
  return {
    user: ctx.user,
    setUser: ctx.setUser,
    isAuthReady: ctx.isAuthReady,
    token: ctx.token,
    login: ctx.login,
    signup: ctx.signup,
    loginWithGoogle: ctx.loginWithGoogle,
    logout: ctx.logout,
    refreshUser: ctx.refreshUser,
  };
}

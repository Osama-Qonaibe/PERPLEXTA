import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

export const useAdminAuth = (allowedRoles: string[] = ['admin']) => {
  const { user, isAuthReady, token } = useAppContext();
  const navigate = useNavigate();
  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;

  const isAuthorized = !!user && (
    (!!user.role && (user.role === 'admin' || allowedRoles.includes(user.role))) ||
    (!!adminEmail && user.email === adminEmail)
  );

  useEffect(() => {
    if (isAuthReady && !token) {
      return;
    }
    if (isAuthReady && user && !isAuthorized) {
      navigate('/chat');
    }
  }, [user, isAuthReady, token, isAuthorized, navigate]);

  return { 
    user, 
    isAdmin: isAuthorized,
    isSupport: user?.role === 'support',
    isElite: user?.role === 'elite',
    isAuthorized
  };
};



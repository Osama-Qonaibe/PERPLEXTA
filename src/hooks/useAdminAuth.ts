import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

export const useAdminAuth = () => {
  const { user } = useAppContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && user.role !== 'admin' && user.role !== 'support') {
      navigate('/chat');
    }
  }, [user, navigate]);

  return { user, isAdmin: user?.role === 'admin' || user?.role === 'support' };
};

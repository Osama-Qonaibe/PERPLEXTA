import { useCallback } from 'react';
import { useNotification, toast as globalToast } from '../context/NotificationContext';

export interface ToastState {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

export const useToast = (duration = 4500) => {
  const { showNotification, dismissNotification } = useNotification();

  const showToast = useCallback((message: string, type: ToastState['type'] = 'success') => {
    return showNotification({ message, type, duration });
  }, [showNotification, duration]);

  const hideToast = useCallback((id?: string) => {
    if (id) {
      dismissNotification(id);
    } else {
      globalToast.dismiss();
    }
  }, [dismissNotification]);

  return { toast: null, showToast, hideToast };
};

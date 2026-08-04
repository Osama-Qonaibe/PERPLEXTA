import { useState, useCallback } from 'react';

export interface ToastState {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

export const useToast = (duration = 3000) => {
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback((message: string, type: ToastState['type'] = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), duration);
  }, [duration]);

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  return { toast, showToast, hideToast };
};

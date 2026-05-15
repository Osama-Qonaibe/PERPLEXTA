import React from 'react';
import { Toaster } from 'sonner';

interface ToastProviderProps {
  dir?: 'rtl' | 'ltr';
}

export function ToastProvider({ dir = 'rtl' }: ToastProviderProps) {
  return (
    <Toaster
      dir={dir}
      position={dir === 'rtl' ? 'bottom-right' : 'bottom-left'}
      toastOptions={{
        duration: 3000,
        style: {
          background: '#111',
          border: '1px solid #2a2a2a',
          color: '#e5e5e5',
          borderRadius: '8px',
          fontSize: '14px',
        },
      }}
    />
  );
}

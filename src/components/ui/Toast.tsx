import React from 'react';
import { Toaster } from 'sonner';

export const Toast: React.FC = () => {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        style: {
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          color: 'var(--text-primary)',
          borderRadius: 'var(--radius)',
        },
      }}
    />
  );
};

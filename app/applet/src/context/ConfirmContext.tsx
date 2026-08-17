import React from 'react';

export type ConfirmOptions = {
  title: string;
  description: string;
  variant?: 'danger' | 'warning' | 'info';
};

export const useConfirm = () => {
  return (options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      // In a real implementation this would trigger a custom modal.
      // Since ConfirmProvider was missing from the app shell, falling back to window.confirm.
      const result = window.confirm(`${options.title}\n\n${options.description}`);
      resolve(result);
    });
  };
};

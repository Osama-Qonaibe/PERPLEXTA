import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ActionConfirmationModal, ActionConfirmationModalProps } from '../components/ActionConfirmationModal';

export type ConfirmOptions = Omit<ActionConfirmationModalProps, 'isOpen' | 'onClose' | 'onConfirm'>;

interface ConfirmContextType {
  confirm: (options: ConfirmOptions | string) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context.confirm;
};

export const ConfirmProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    options: ConfirmOptions | null;
    resolve: ((value: boolean) => void) | null;
  }>({
    isOpen: false,
    options: null,
    resolve: null,
  });

  const confirm = useCallback((options: ConfirmOptions | string) => {
    const normalizedOptions: ConfirmOptions = typeof options === 'string'
      ? { title: options, description: '', variant: 'warning' }
      : options;

    return new Promise<boolean>((resolve) => {
      setModalState({
        isOpen: true,
        options: normalizedOptions,
        resolve,
      });
    });
  }, []);

  const handleClose = useCallback(() => {
    setModalState((prev) => {
      if (prev.resolve) prev.resolve(false);
      return { ...prev, isOpen: false, options: null, resolve: null };
    });
  }, []);

  const handleConfirm = useCallback(async () => {
    setModalState((prev) => {
      if (prev.resolve) prev.resolve(true);
      return { ...prev, isOpen: false, options: null, resolve: null };
    });
  }, []);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {modalState.options && (
        <ActionConfirmationModal
          {...modalState.options}
          isOpen={modalState.isOpen}
          onClose={handleClose}
          onConfirm={handleConfirm}
        />
      )}
    </ConfirmContext.Provider>
  );
};

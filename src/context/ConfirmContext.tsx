import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { ActionConfirmationModal } from '../components/ActionConfirmationModal';

export type ConfirmOptions = {
  title: string | { ar: string; en: string };
  description: string | { ar: string; en: string };
  variant?: 'danger' | 'success' | 'warning' | 'info' | 'purple';
  confirmLabel?: string | { ar: string; en: string };
  cancelLabel?: string | { ar: string; en: string };
};

type ConfirmContextType = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

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

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setModalState({
        isOpen: true,
        options,
        resolve,
      });
    });
  }, []);

  const handleClose = () => {
    if (modalState.resolve) {
      modalState.resolve(false);
    }
    setModalState({ isOpen: false, options: null, resolve: null });
  };

  const handleConfirm = async () => {
    if (modalState.resolve) {
      modalState.resolve(true);
    }
    setModalState({ isOpen: false, options: null, resolve: null });
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {modalState.options && (
        <ActionConfirmationModal
          isOpen={modalState.isOpen}
          onClose={handleClose}
          onConfirm={handleConfirm}
          title={modalState.options.title}
          description={modalState.options.description}
          variant={modalState.options.variant}
          confirmLabel={modalState.options.confirmLabel}
          cancelLabel={modalState.options.cancelLabel}
        />
      )}
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    // Fallback if not wrapped in provider
    return (options: ConfirmOptions): Promise<boolean> => {
      return new Promise((resolve) => {
        const title = typeof options.title === 'string' ? options.title : options.title.en;
        const desc = typeof options.description === 'string' ? options.description : options.description.en;
        const result = window.confirm(`${title}\n\n${desc}`);
        resolve(result);
      });
    };
  }
  return context;
};


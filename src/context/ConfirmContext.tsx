import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { ActionConfirmationModal } from '../components/ActionConfirmationModal';

export type ConfirmOptions = {
  title: string | { ar: string; en: string };
  description?: string | { ar: string; en: string };
  variant?: 'danger' | 'success' | 'warning' | 'info' | 'purple';
  confirmLabel?: string | { ar: string; en: string };
  cancelLabel?: string | { ar: string; en: string };
  hasInput?: boolean;
  inputPlaceholder?: string | { ar: string; en: string };
  defaultValue?: string;
  inputType?: string;
  requiredInput?: boolean;
};

type ConfirmContextType = (options: ConfirmOptions) => Promise<any>;

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export const ConfirmProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    options: ConfirmOptions | null;
    resolve: ((value: any) => void) | null;
  }>({
    isOpen: false,
    options: null,
    resolve: null,
  });

  const confirm = useCallback((options: ConfirmOptions): Promise<any> => {
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
      if (modalState.options?.hasInput) {
        modalState.resolve(null);
      } else {
        modalState.resolve(false);
      }
    }
    setModalState({ isOpen: false, options: null, resolve: null });
  };

  const handleConfirm = async (inputValue?: string) => {
    if (modalState.resolve) {
      if (modalState.options?.hasInput) {
        modalState.resolve(inputValue ?? '');
      } else {
        modalState.resolve(true);
      }
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
          hasInput={modalState.options.hasInput}
          inputPlaceholder={modalState.options.inputPlaceholder}
          defaultValue={modalState.options.defaultValue}
          inputType={modalState.options.inputType}
          requiredInput={modalState.options.requiredInput}
        />
      )}
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    // Non-intrusive fallback if called outside provider: logs warning and safely resolves
    return (options: ConfirmOptions): Promise<any> => {
      return new Promise((resolve) => {
        console.warn('[ActionConfirmationModal] Confirm called outside ConfirmProvider. Resolving safely.');
        resolve(options.hasInput ? (options.defaultValue || '') : true);
      });
    };
  }
  return context;
};



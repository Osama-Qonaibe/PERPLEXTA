import { useState, useCallback } from 'react';

interface ConfirmState {
  isOpen: boolean;
  message: string;
  resolve: ((val: boolean) => void) | null;
}

export function useConfirm() {
  const [state, setState] = useState<ConfirmState>({
    isOpen: false,
    message: '',
    resolve: null,
  });

  const confirm = useCallback((message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({ isOpen: true, message, resolve });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    state.resolve?.(true);
    setState({ isOpen: false, message: '', resolve: null });
  }, [state]);

  const handleCancel = useCallback(() => {
    state.resolve?.(false);
    setState({ isOpen: false, message: '', resolve: null });
  }, [state]);

  return {
    confirm,
    confirmState: state,
    handleConfirm,
    handleCancel,
  };
}

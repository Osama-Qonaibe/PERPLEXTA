import { useState, useCallback } from 'react';
import type { ConfirmOptions } from '../types';

export const useConfirm = () => {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [resolve, setResolve] = useState<((val: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise((res) => {
      setOptions(opts);
      setResolve(() => res);
    });
  }, []);

  const handleConfirm = () => {
    resolve?.(true);
    setOptions(null);
    setResolve(null);
  };

  const handleCancel = () => {
    resolve?.(false);
    setOptions(null);
    setResolve(null);
  };

  return { confirm, options, handleConfirm, handleCancel };
};

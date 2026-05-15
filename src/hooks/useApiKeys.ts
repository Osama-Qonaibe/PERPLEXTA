import { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { useToast } from './useToast';

export const useApiKeys = () => {
  const { token } = useAppContext();
  const toast = useToast();
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const fetchKeys = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/admin/keys', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setKeys(data.keys ?? {});
    } catch {
      toast.error('Failed to fetch API keys');
    } finally {
      setIsLoading(false);
    }
  };

  const saveKey = async (provider: string, key: string) => {
    try {
      const res = await fetch('/api/v1/admin/keys', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ provider, key }),
      });
      const data = await res.json();
      if (data.success) {
        setKeys(prev => ({ ...prev, [provider]: key }));
        toast.success('Key saved');
      } else {
        toast.error(data.error ?? 'Save failed');
      }
    } catch {
      toast.error('Save failed');
    }
  };

  return { keys, isLoading, fetchKeys, saveKey };
};

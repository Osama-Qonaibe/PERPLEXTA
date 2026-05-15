import { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import type { AIProviderConfig } from '../types';

export const useAdminData = () => {
  const { token } = useAppContext();
  const [providerModels, setProviderModels] = useState<AIProviderConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchProviders = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/admin/orchestrator/providers', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setProviderModels(data.providers ?? []);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchProviders(); }, [token]);

  return { providerModels, setProviderModels, isLoading, fetchProviders };
};

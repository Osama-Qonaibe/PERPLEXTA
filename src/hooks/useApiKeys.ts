import { useState, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';

export const useApiKeys = () => {
  const { token } = useAppContext();
  const [loading, setLoading] = useState(false);

  const fetchKeys = useCallback(async () => {
    if (!token) return [];
    setLoading(true);
    try {
      const res = await fetch('/api/admin/keys', {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.ok ? await res.json() : [];
    } finally {
      setLoading(false);
    }
  }, [token]);

  const saveKey = useCallback(async (provider: string, key: string, budget?: number) => {
    if (!token) return false;
    const res = await fetch('/api/admin/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ provider, api_key: key, daily_budget: budget })
    });
    return res.ok;
  }, [token]);

  const deleteKey = useCallback(async (provider: string) => {
    if (!token) return false;
    const res = await fetch(`/api/admin/keys/${provider}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.ok;
  }, [token]);

  return { fetchKeys, saveKey, deleteKey, loading };
};

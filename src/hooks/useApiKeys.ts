import { useState, useCallback } from 'react';
import { API_BASE_URL } from '../constants';

interface ApiKey {
  provider: string;
  status: 'active' | 'missing' | 'needs_verification';
  hasKey: boolean;
}

export function useApiKeys(token: string | null) {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchKeys = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/keys`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setKeys(data.keys);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const saveKey = useCallback(async (provider: string, apiKey: string, budget?: number) => {
    if (!token) return { success: false };
    const res = await fetch(`${API_BASE_URL}/api/v1/admin/keys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ provider, apiKey, budget }),
    });
    return res.json();
  }, [token]);

  return { keys, loading, fetchKeys, saveKey };
}

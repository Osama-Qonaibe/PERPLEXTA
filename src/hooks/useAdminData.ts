import { useState, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';

export const useAdminData = () => {
  const { token } = useAppContext();
  const [loading, setLoading] = useState(false);

  const fetchAdmin = useCallback(async <T>(endpoint: string): Promise<T | null> => {
    if (!token) return null;
    setLoading(true);
    try {
      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.ok ? await res.json() : null;
    } finally {
      setLoading(false);
    }
  }, [token]);

  const postAdmin = useCallback(async <T>(endpoint: string, body: unknown): Promise<T | null> => {
    if (!token) return null;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body)
    });
    return res.ok ? await res.json() : null;
  }, [token]);

  return { fetchAdmin, postAdmin, loading };
};

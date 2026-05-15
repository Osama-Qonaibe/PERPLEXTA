import { useState, useCallback } from 'react';
import { API_BASE_URL } from '../constants';

export function useAdminData(token: string | null) {
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchStats = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setStats(data.stats);
    } finally {
      setLoading(false);
    }
  }, [token]);

  return { stats, loading, fetchStats };
}

import { useState, useEffect } from 'react';

export const useFollowUpSuggestions = (lastMessage: string | undefined, userQuery?: string) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!lastMessage || lastMessage.length < 50) {
      setSuggestions([]);
      return;
    }

    const fetchSuggestions = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/ai/generate-followups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lastMessage, userQuery }),
        });
        const data = await response.json();
        if (response.status === 401) {
            console.warn('Follow-up suggestions disabled: Invalid API Key');
            setSuggestions([]);
            return;
        }
        if (Array.isArray(data)) {
          setSuggestions(data);
        }
      } catch (err) {
        console.error('Failed to fetch follow-up suggestions:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, [lastMessage]);

  return { suggestions, loading };
};

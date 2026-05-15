import { useState, useCallback, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

export const useChat = (chatId: string | null) => {
  const { socket } = useSocket();
  const { token, user } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);

  const loadMessages = useCallback(async (id: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/chats/${id}/messages`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (err) {
      console.error('Failed to load messages', err);
    }
  }, [token]);

  useEffect(() => {
    if (chatId) {
      loadMessages(chatId);
    } else {
      setMessages([]);
    }
  }, [chatId, loadMessages]);

  return {
    messages,
    setMessages,
    isGenerating,
    setIsGenerating,
  };
};

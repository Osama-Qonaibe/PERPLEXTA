import React, { createContext, useContext, useState } from 'react';

interface Conversation {
  id: string | number;
  title: string;
  created_at: string;
  updated_at?: string;
}

interface Message {
  id: string | number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at?: string;
  model?: string;
  tool?: string;
}

interface ChatContextType {
  conversations: Conversation[];
  setConversations: (c: Conversation[]) => void;
  activeConversationId: string | number | null;
  setActiveConversationId: (id: string | number | null) => void;
  messages: Message[];
  setMessages: (m: Message[]) => void;
}

export const ChatContext = createContext<ChatContextType | null>(null);

export function useChatContext() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChatContext must be used within ChatContext');
  return ctx;
}

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  return (
    <ChatContext.Provider value={{
      conversations, setConversations,
      activeConversationId, setActiveConversationId,
      messages, setMessages,
    }}>
      {children}
    </ChatContext.Provider>
  );
}

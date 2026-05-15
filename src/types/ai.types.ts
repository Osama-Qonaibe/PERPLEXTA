export type MessageRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id?: string;
  role: MessageRole;
  content: string;
  toolId?: string;
  feedback?: 'up' | 'down' | null;
  createdAt?: string;
}

export interface Conversation {
  id: string;
  title: string;
  titleAr?: string;
  toolId?: string;
  createdAt: string;
  updatedAt: string;
  messageCount?: number;
}

export interface AiTool {
  id: string;
  name: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  icon?: string;
  isActive: boolean;
  category?: string;
}

export interface StreamChunk {
  type: 'chunk' | 'done' | 'error';
  content?: string;
  messageId?: string;
  error?: string;
}

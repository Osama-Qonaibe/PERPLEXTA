export type AIProvider = 'openai' | 'anthropic' | 'google' | 'mistral' | 'groq' | string;

export interface AIModel {
  id: string;
  name: string;
  provider: AIProvider;
  mode: 'fast' | 'pro' | 'reasoning';
  is_active: boolean;
  priority: number;
  cost_per_token?: number;
}

export interface AIProviderConfig {
  id: string;
  name: string;
  api_key_encrypted?: string;
  is_active: boolean;
  models: AIModel[];
}

export type ChatMode = 'fast' | 'pro' | 'reasoning';

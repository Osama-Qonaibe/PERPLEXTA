export const AI_PROVIDERS = [
  'openai',
  'anthropic',
  'google',
  'mistral',
  'cohere',
  'ollama',
  'groq',
  'deepseek',
  'xai',
] as const;

export type AiProvider = typeof AI_PROVIDERS[number];

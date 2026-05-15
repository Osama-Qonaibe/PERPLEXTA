export interface AIModel {
  id: string;
  name: string;
  provider: string;
  active: boolean;
  is_reasoning?: boolean;
}

export interface AITool {
  id: string;
  name_en: string;
  name_ar: string;
  description_en: string;
  description_ar: string;
  task_description: string;
  icon: string;
  primary_model: string;
  fallback_1_model?: string;
  fallback_2_model?: string;
  active: boolean;
  is_premium: boolean;
  daily_limit?: number;
  monthly_limit?: number;
}

export interface AIProvider {
  id: string;
  name: string;
  models: AIModel[];
}

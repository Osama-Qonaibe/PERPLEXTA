/**
 * 🎨 Perplexta Design System - Type-Safe Token Architecture
 * Centralized schema, categories, presets, and token definitions
 */

export type ThemeMode = 'light' | 'dark' | 'system';

export type TokenCategory =
  | 'surfaces'
  | 'typography'
  | 'brand_accent'
  | 'borders_dividers'
  | 'buttons_controls'
  | 'inputs_forms'
  | 'admin_layout'
  | 'chat_messages'
  | 'status_alerts'
  | 'geometry_elevation';

export type TokenType = 'color' | 'size' | 'select' | 'shadow' | 'font';

export interface TokenDefinition {
  key: string;
  category: TokenCategory;
  type: TokenType;
  labelEn: string;
  labelAr: string;
  descriptionEn: string;
  descriptionAr: string;
  defaultValueLight: string;
  defaultValueDark: string;
  options?: string[]; // for select types
  cssVariable: string;
}

export type ThemeTokensMap = Record<string, string>;

export interface ThemePreset {
  id: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  author: string;
  version: string;
  previewColors: {
    surface: string;
    card: string;
    accent: string;
    text: string;
  };
  tokens: {
    light: ThemeTokensMap;
    dark: ThemeTokensMap;
  };
}

export interface ThemeCustomizationsPayload {
  light?: ThemeTokensMap;
  dark?: ThemeTokensMap;
}

export interface DesignSystemAuditItem {
  key: string;
  category: TokenCategory;
  isCovered: boolean;
  currentLightValue: string;
  currentDarkValue: string;
  contrastRatio?: number;
  contrastStatus?: 'pass' | 'fail' | 'warning';
}

export interface DesignSystemAuditReport {
  totalTokens: number;
  categoriesCount: number;
  tokensByCategory: Record<TokenCategory, number>;
  items: DesignSystemAuditItem[];
  healthScore: number;
  lastAudited: string;
}

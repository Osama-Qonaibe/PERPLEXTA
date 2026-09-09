export interface AdminViewProps {
  theme: string;
  t: (key: string, replacements?: any) => string;
  dir?: string;
  language?: string;
  showToast?: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  providerModels?: Record<string, string[]>;
  setProviderModels?: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
}

export interface CommandCenterViewProps {
  theme: string;
  t: (key: string, replacements?: any) => string;
  showToast?: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export interface ApiKeysVaultViewProps {
  theme: string;
  t: (key: string, replacements?: any) => string;
  dir: string;
  providerModels: Record<string, string[]>;
  setProviderModels: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  showToast?: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export interface GpuInfrastructureViewProps {
  theme: string;
  t: (key: string, replacements?: any) => string;
  dir: string;
  showToast?: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export interface DatabaseOrchestrationViewProps {
  theme: string;
  t: (key: string, replacements?: any) => string;
  dir: string;
  language: string;
}

export interface OrchestratorViewProps {
  theme: string;
  t: (key: string, replacements?: any) => string;
  dir: string;
  providerModels: Record<string, any[]>;
  showToast?: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  onRefreshModels?: () => Promise<void> | void;
}

export interface FinanceVaultViewProps {
  theme: string;
  t: (key: string, replacements?: any) => string;
  dir: string;
  showToast?: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export interface PlansSubscriptionsViewProps {
  theme: string;
  t: (key: string, replacements?: any) => string;
  dir: string;
}

export interface UserManagementViewProps {
  theme: string;
  t: (key: string, replacements?: any) => string;
  dir: string;
  showToast?: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export interface SmartEmailHubViewProps {
  theme: string;
  t: (key: string, replacements?: any) => string;
  dir: string;
  showToast?: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export interface MassBroadcastViewProps {
  theme: string;
  t: (key: string, replacements?: any) => string;
  dir: string;
  language: string;
}

export interface MemoryCenterViewProps {
  theme: string;
  t: (key: string, replacements?: any) => string;
  dir: string;
  language: string;
}

export interface SystemSettingsViewProps {
  theme: string;
  t: (key: string, replacements?: any) => string;
  dir: string;
}

export interface ComplianceAuditLogsViewProps {
  theme: string;
  t: (key: string, replacements?: any) => string;
  dir: string;
  initialTab?: 'logs' | 'radar' | 'metrics';
}

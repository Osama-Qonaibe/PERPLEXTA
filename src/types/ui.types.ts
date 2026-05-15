export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id?: string;
  message: string;
  type: ToastType;
  duration?: number;
}

export type Direction = 'ltr' | 'rtl';
export type Language = 'ar' | 'en';
export type Theme = 'dark' | 'light';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  children: React.ReactNode;
}

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
}

export interface SiteSettings {
  siteName: string;
  siteNameAr: string;
  logoBase64?: string;
  primaryColor?: string;
  supportEmail?: string;
  maintenanceMode?: boolean;
}

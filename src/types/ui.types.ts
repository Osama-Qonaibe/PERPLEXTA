export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  type: ToastType;
  message: string;
  duration?: number;
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

export type MemoryNotificationType = 'success' | 'warning' | 'cleanup' | 'optimization' | 'startup';

export interface MemoryNotification {
  isVisible: boolean;
  type: MemoryNotificationType;
  desc?: string;
}

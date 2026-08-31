import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertOctagon, AlertTriangle, Info, X, Sparkles } from 'lucide-react';
import { NotificationIconRenderer, useStandardizedNotificationIcon } from '../utils/imageProcessor';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface NotificationAction {
  label: string;
  onClick: () => void;
}

export interface NotificationOptions {
  message?: string; // Make optional to support description-only toasts
  title?: string;
  type?: NotificationType;
  duration?: number;
  action?: NotificationAction;
  id?: string;
  image?: string;
  icon?: React.ReactNode;
  description?: string;
}

export interface NotificationItem {
  id: string;
  message: string;
  title?: string;
  type: NotificationType;
  duration: number;
  action?: NotificationAction;
  createdAt: number;
  image?: string;
  icon?: React.ReactNode;
  description?: string;
}

interface NotificationContextType {
  notifications: NotificationItem[];
  showNotification: (options: NotificationOptions) => string;
  success: (message: string, title?: string, options?: Omit<NotificationOptions, 'message' | 'type' | 'title'>) => string;
  error: (message: string, title?: string, options?: Omit<NotificationOptions, 'message' | 'type' | 'title'>) => string;
  warning: (message: string, title?: string, options?: Omit<NotificationOptions, 'message' | 'type' | 'title'>) => string;
  info: (message: string, title?: string, options?: Omit<NotificationOptions, 'message' | 'type' | 'title'>) => string;
  loading: (message: string, title?: string, options?: Omit<NotificationOptions, 'message' | 'type' | 'title'>) => string;
  dismissNotification: (id: string) => void;
  clearAllNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Global Bridge Handlers for direct toast calls across the workspace
let globalShowNotification: ((options: NotificationOptions) => string) | null = null;
let globalDismissNotification: ((id: string) => void) | null = null;

// Track recent notifications to prevent duplicate toasts
const recentNotificationsCache = new Map<string, number>();
const DEDUP_WINDOW_MS = 1800;

export const toast = {
  success: (message: string, titleOrOpts?: string | Partial<NotificationOptions>) => {
    const opts = typeof titleOrOpts === 'string' ? { title: titleOrOpts } : titleOrOpts || {};
    return globalShowNotification?.({ message, type: 'success', ...opts }) || '';
  },
  error: (message: string, titleOrOpts?: string | Partial<NotificationOptions>) => {
    const opts = typeof titleOrOpts === 'string' ? { title: titleOrOpts } : titleOrOpts || {};
    return globalShowNotification?.({ message, type: 'error', ...opts }) || '';
  },
  warning: (message: string, titleOrOpts?: string | Partial<NotificationOptions>) => {
    const opts = typeof titleOrOpts === 'string' ? { title: titleOrOpts } : titleOrOpts || {};
    return globalShowNotification?.({ message, type: 'warning', ...opts }) || '';
  },
  info: (message: string, titleOrOpts?: string | Partial<NotificationOptions>) => {
    const opts = typeof titleOrOpts === 'string' ? { title: titleOrOpts } : titleOrOpts || {};
    return globalShowNotification?.({ message, type: 'info', ...opts }) || '';
  },
  loading: (message: string, titleOrOpts?: string | Partial<NotificationOptions>) => {
    const opts = typeof titleOrOpts === 'string' ? { title: titleOrOpts } : titleOrOpts || {};
    return globalShowNotification?.({ message, type: 'info', duration: 120000, ...opts }) || '';
  },
  dismiss: (id?: string) => {
    if (id && globalDismissNotification) globalDismissNotification(id);
  },
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isRtl, setIsRtl] = useState<boolean>(false);

  useEffect(() => {
    const checkDir = () => {
      const dir = document.documentElement.dir || document.body.dir || 'rtl';
      setIsRtl(dir === 'rtl');
    };
    checkDir();

    const observer = new MutationObserver(checkDir);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['dir'] });
    return () => observer.disconnect();
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const showNotification = useCallback((options: NotificationOptions): string => {
    const now = Date.now();
    const dedupKey = `${options.id || ''}:${options.type || 'info'}:${options.message}`;

    // Check duplicate within window
    const lastSeen = recentNotificationsCache.get(dedupKey);
    if (lastSeen && now - lastSeen < DEDUP_WINDOW_MS) {
      return options.id || '';
    }
    recentNotificationsCache.set(dedupKey, now);

    // Clean up old dedup entries
    if (recentNotificationsCache.size > 50) {
      for (const [k, v] of recentNotificationsCache.entries()) {
        if (now - v > DEDUP_WINDOW_MS * 2) {
          recentNotificationsCache.delete(k);
        }
      }
    }

    const id = options.id || `toast-${now}-${Math.random().toString(36).substring(2, 7)}`;
    const newItem: NotificationItem = {
      id,
      message: options.message || options.description || '',
      title: options.title,
      type: options.type || 'info',
      duration: options.duration ?? 4500,
      action: options.action,
      createdAt: now,
      image: options.image,
      icon: options.icon,
      description: options.description,
    };

    setNotifications((prev) => {
      // Keep queue at max 5 visible toasts to avoid clutter and eliminate any existing duplicate id
      const filtered = prev.filter((item) => item.id !== id && item.message !== options.message);
      return [...filtered.slice(-4), newItem];
    });

    return id;
  }, []);

  useEffect(() => {
    globalShowNotification = showNotification;
    globalDismissNotification = dismissNotification;
    return () => {
      globalShowNotification = null;
      globalDismissNotification = null;
    };
  }, [showNotification, dismissNotification]);

  const success = useCallback((message: string, title?: string, options?: Omit<NotificationOptions, 'message' | 'type' | 'title'>) => {
    return showNotification({ message, title, type: 'success', ...options });
  }, [showNotification]);

  const error = useCallback((message: string, title?: string, options?: Omit<NotificationOptions, 'message' | 'type' | 'title'>) => {
    return showNotification({ message, title, type: 'error', ...options });
  }, [showNotification]);

  const warning = useCallback((message: string, title?: string, options?: Omit<NotificationOptions, 'message' | 'type' | 'title'>) => {
    return showNotification({ message, title, type: 'warning', ...options });
  }, [showNotification]);

  const info = useCallback((message: string, title?: string, options?: Omit<NotificationOptions, 'message' | 'type' | 'title'>) => {
    return showNotification({ message, title, type: 'info', ...options });
  }, [showNotification]);

  const loading = useCallback((message: string, title?: string, options?: Omit<NotificationOptions, 'message' | 'type' | 'title'>) => {
    return showNotification({ message, title, type: 'info', duration: 120000, ...options });
  }, [showNotification]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        showNotification,
        success,
        error,
        warning,
        info,
        loading,
        dismissNotification,
        clearAllNotifications,
      }}
    >
      {children}
      <NotificationContainer notifications={notifications} onDismiss={dismissNotification} isRtl={isRtl} />
    </NotificationContext.Provider>
  );
};

export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    // Safe fallback if called outside provider
    return {
      notifications: [],
      showNotification: (options) => toast.info(options.message || options.description || '', options),
      success: (msg, title, opts) => toast.success(msg, { title, ...opts }),
      error: (msg, title, opts) => toast.error(msg, { title, ...opts }),
      warning: (msg, title, opts) => toast.warning(msg, { title, ...opts }),
      info: (msg, title, opts) => toast.info(msg, { title, ...opts }),
      loading: (msg, title, opts) => toast.loading(msg, { title, ...opts }),
      dismissNotification: (id) => toast.dismiss(id),
      clearAllNotifications: () => {},
    };
  }
  return context;
};

// Notification Toast Item Component
const ToastCard: React.FC<{ item: NotificationItem; onDismiss: (id: string) => void; isRtl: boolean }> = ({
  item,
  onDismiss,
  isRtl,
}) => {
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(100);
  const startTimeRef = useRef(Date.now());
  const remainingTimeRef = useRef(item.duration);

  useEffect(() => {
    if (item.duration <= 0 || paused) return;

    startTimeRef.current = Date.now();
    const intervalTime = 50;

    const timer = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      remainingTimeRef.current -= elapsed;
      startTimeRef.current = Date.now();

      const percentage = Math.max(0, (remainingTimeRef.current / item.duration) * 100);
      setProgress(percentage);

      if (remainingTimeRef.current <= 0) {
        clearInterval(timer);
        onDismiss(item.id);
      }
    }, intervalTime);

    return () => clearInterval(timer);
  }, [item.duration, item.id, onDismiss, paused]);

  const getTheme = () => {
    switch (item.type) {
      case 'success':
        return {
          icon: <CheckCircle2 size={18} className="text-emerald-500 flex-shrink-0" />,
          barBg: 'bg-emerald-500',
          badgeBg: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
          defaultTitle: isRtl ? 'تم بنجاح' : 'Success',
        };
      case 'error':
        return {
          icon: <AlertOctagon size={18} className="text-red-500 flex-shrink-0" />,
          barBg: 'bg-red-500',
          badgeBg: 'bg-red-500/10 text-red-500 border-red-500/20',
          defaultTitle: isRtl ? 'حدث خطأ' : 'Error',
        };
      case 'warning':
        return {
          icon: <AlertTriangle size={18} className="text-amber-500 flex-shrink-0" />,
          barBg: 'bg-amber-500',
          badgeBg: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
          defaultTitle: isRtl ? 'تنبيه' : 'Warning',
        };
      case 'info':
      default:
        return {
          icon: <Sparkles size={18} className="text-sky-500 flex-shrink-0" />,
          barBg: 'bg-sky-500',
          badgeBg: 'bg-sky-500/10 text-sky-500 border-sky-500/20',
          defaultTitle: isRtl ? 'ملاحظة' : 'Notice',
        };
    }
  };

  const themeConfig = getTheme();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, y: 15 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="group relative w-full sm:w-[360px] rounded-2xl p-3.5 shadow-2xl border transition-theme overflow-hidden backdrop-blur-2xl bg-[var(--surface-card)] border-[var(--border-main)] text-[var(--text-primary)] shadow-black/20 dark:shadow-black/60 pointer-events-auto"
    >
      {/* Accent side bar indicator */}
      <div className={`absolute top-0 bottom-0 ${isRtl ? 'right-0' : 'left-0'} w-1 ${themeConfig.barBg}`} />

      <div className="flex items-start gap-3 pl-1 pr-1">
        <div className="mt-0.5 flex-shrink-0">
          {item.image ? (
            <NotificationIconRenderer 
              src={item.image} 
              size={24} 
              className="rounded-lg border border-[var(--border-main)]"
              fallbackIcon={item.icon || themeConfig.icon} 
            />
          ) : (
            item.icon || themeConfig.icon
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <h4 className="text-xs font-bold font-sans text-[var(--text-primary)] truncate">
              {item.title || themeConfig.defaultTitle}
            </h4>
            <button
              type="button"
              onClick={() => onDismiss(item.id)}
              className="text-gray-400 hover:text-[var(--text-primary)] p-0.5 rounded-lg hover:bg-[var(--surface-inset)] transition-theme"
              title={isRtl ? 'إغلاق' : 'Close'}
            >
              <X size={14} />
            </button>
          </div>

          <p className="text-xs text-[var(--text-secondary)] font-sans leading-relaxed break-words">
            {item.message}
          </p>

          {item.action && (
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  item.action?.onClick();
                  onDismiss(item.id);
                }}
                className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-[var(--surface-subtle)] hover:bg-[var(--surface-inset)] text-[var(--text-primary)] border border-[var(--border-main)] transition-theme"
              >
                {item.action.label}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Auto-dismiss progress bar */}
      {item.duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--border-main)]/30 overflow-hidden">
          <div
            className={`h-full ${themeConfig.barBg} transition-all duration-75 ease-linear`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </motion.div>
  );
};

// Floating Notification Container Component
const NotificationContainer: React.FC<{
  notifications: NotificationItem[];
  onDismiss: (id: string) => void;
  isRtl: boolean;
}> = ({ notifications, onDismiss, isRtl }) => {
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed top-2.5 left-1/2 -translate-x-1/2 z-[999999] pointer-events-none flex flex-col gap-2.5 p-2 max-w-full sm:max-w-md w-full items-center"
      style={{
        direction: isRtl ? 'rtl' : 'ltr',
      }}
    >
      <AnimatePresence mode="sync">
        {notifications.map((item, nIdx) => (
          <ToastCard key={`toast-${item.id || nIdx}-${nIdx}`} item={item} onDismiss={onDismiss} isRtl={isRtl} />
        ))}
      </AnimatePresence>
    </div>,
    document.body
  );
};


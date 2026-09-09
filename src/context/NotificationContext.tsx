import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertOctagon, AlertTriangle, Info, X, Sparkles, Loader2 } from 'lucide-react';
import { NotificationIconRenderer, useStandardizedNotificationIcon } from '../utils/imageProcessor';

export type NotificationType = 'success' | 'error' | 'warning' | 'info' | 'loading';

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
let globalClearAllNotifications: (() => void) | null = null;

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
  clear: () => {
    if (globalClearAllNotifications) globalClearAllNotifications();
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
    globalClearAllNotifications = clearAllNotifications;

    // Listen for native Capacitor push notifications and route through standardized toasts
    const handleNativePush = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent && customEvent.detail) {
        const notif = customEvent.detail;
        const title = notif.title || '';
        const body = notif.body || notif.message || '';
        if (title || body) {
          showNotification({
            title,
            message: body,
            type: 'info',
            duration: 5000,
          });
        }
      }
    };

    window.addEventListener('native-push-received', handleNativePush);

    return () => {
      globalShowNotification = null;
      globalDismissNotification = null;
      globalClearAllNotifications = null;
      window.removeEventListener('native-push-received', handleNativePush);
    };
  }, [showNotification, dismissNotification, clearAllNotifications]);

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
    return showNotification({ message, title, type: 'loading', duration: 120000, ...options });
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

  const getVariantStyles = () => {
    switch (item.type) {
      case 'success':
        return {
          dotBg: 'bg-emerald-500',
          dotPing: 'bg-emerald-400',
          actionBtnBg: 'bg-emerald-600 hover:bg-emerald-500 text-white',
          fallbackIcon: <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />,
          defaultTitle: isRtl ? 'تم بنجاح' : 'Success',
        };
      case 'error':
        return {
          dotBg: 'bg-rose-500',
          dotPing: 'bg-rose-400',
          actionBtnBg: 'bg-rose-600 hover:bg-rose-500 text-white',
          fallbackIcon: <AlertOctagon size={13} className="text-rose-500 shrink-0" />,
          defaultTitle: isRtl ? 'حدث خطأ' : 'Error',
        };
      case 'warning':
        return {
          dotBg: 'bg-amber-500',
          dotPing: 'bg-amber-400',
          actionBtnBg: 'bg-amber-600 hover:bg-amber-500 text-white',
          fallbackIcon: <AlertTriangle size={13} className="text-amber-500 shrink-0" />,
          defaultTitle: isRtl ? 'تنبيه' : 'Warning',
        };
      case 'loading':
        return {
          dotBg: 'bg-amber-400',
          dotPing: 'bg-amber-300',
          actionBtnBg: 'bg-amber-600 hover:bg-amber-500 text-white',
          fallbackIcon: <Loader2 size={13} className="text-amber-400 animate-spin shrink-0" />,
          defaultTitle: isRtl ? 'جاري المعالجة...' : 'Processing...',
        };
      case 'info':
      default:
        return {
          dotBg: 'bg-[var(--fg-accent)]',
          dotPing: 'bg-[var(--fg-accent)]',
          actionBtnBg: 'bg-[var(--bg-accent-emphasis)] text-[var(--fg-on-emphasis)]',
          fallbackIcon: <Sparkles size={13} className="text-accent shrink-0" />,
          defaultTitle: isRtl ? 'إشعار النظام' : 'System Notice',
        };
    }
  };

  const variant = getVariantStyles();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 15, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.98 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="toast-floating shadow-md"
    >
      {/* Status Dot / Live Indicator */}
      <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2.5 shrink min-w-0 max-w-[calc(100vw-110px)] sm:max-w-xs">
        <span className="toast-live-dot">
          <span className={`toast-live-dot-ping ${variant.dotPing}`} />
          <span className={`toast-live-dot-core ${variant.dotBg}`} />
        </span>
        <span className="text-[10.5px] sm:text-xs font-bold text-[var(--fg-primary)] whitespace-nowrap truncate font-sans">
          {item.message || item.title || variant.defaultTitle}
        </span>
      </div>

      <div className="toast-divider" />

      {/* Action Buttons Group */}
      <div className="flex items-center h-full shrink-0">
        {item.action ? (
          <>
            <button
              type="button"
              onClick={() => onDismiss(item.id)}
              className="toast-dismiss-btn font-sans"
            >
              {isRtl ? 'لاحقاً' : 'Later'}
            </button>
            <button
              type="button"
              onClick={() => {
                item.action?.onClick();
                onDismiss(item.id);
              }}
              className={`toast-action-btn font-sans ${variant.actionBtnBg}`}
            >
              <span>{item.action.label}</span>
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => onDismiss(item.id)}
            className="toast-dismiss-btn font-sans hover:text-[var(--fg-primary)]"
          >
            {isRtl ? 'إغلاق' : 'Dismiss'}
          </button>
        )}
      </div>
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
      className={`toast-container-floating ${isRtl ? 'pos-bottom-start' : 'pos-bottom-end'}`}
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


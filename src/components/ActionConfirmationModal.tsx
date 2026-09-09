import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, AlertTriangle, CheckCircle, Info, ShieldAlert } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

export interface ActionConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (inputValue?: string) => Promise<void> | void;
  title: string | { ar: string; en: string };
  description?: string | { ar: string; en: string };
  variant?: 'danger' | 'success' | 'warning' | 'info' | 'purple';
  confirmLabel?: string | { ar: string; en: string };
  cancelLabel?: string | { ar: string; en: string };
  hasInput?: boolean;
  inputPlaceholder?: string | { ar: string; en: string };
  defaultValue?: string;
  inputType?: string;
  requiredInput?: boolean;
  extraContent?: React.ReactNode;
}

export const ActionConfirmationModal: React.FC<ActionConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  variant = 'danger',
  confirmLabel,
  cancelLabel,
  hasInput,
  inputPlaceholder,
  defaultValue = '',
  inputType = 'text',
  requiredInput = false,
  extraContent,
}) => {
  const { theme, dir } = useAppContext();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inputValue, setInputValue] = useState(defaultValue);

  useEffect(() => {
    if (isOpen) {
      setInputValue(defaultValue);
    }
  }, [isOpen, defaultValue]);

  const getLocalizedValue = (val: string | { ar: string; en: string } | undefined, defaultVal: string): string => {
    if (!val) return defaultVal;
    if (typeof val === 'string') return val;
    return dir === 'rtl' ? val.ar : val.en;
  };

  const currentTitle = getLocalizedValue(title, dir === 'rtl' ? 'هل أنت متأكد؟' : 'Are you sure?');
  const currentDescription = getLocalizedValue(description, '');
  const currentPlaceholder = getLocalizedValue(inputPlaceholder, dir === 'rtl' ? 'اكتب هنا...' : 'Enter text here...');
  
  const defaultConfirmText = {
    danger: { ar: 'تأكيد الحذف', en: 'Confirm Delete' },
    success: { ar: 'تأكيد الحفظ', en: 'Save & Confirm' },
    warning: { ar: 'تأكيد ومتابعة', en: 'Proceed' },
    info: { ar: 'فهمت ومتابعة', en: 'Acknowledge' },
    purple: { ar: 'تطهير السجلات', en: 'Prune Records' },
  }[variant];

  const currentConfirmLabel = getLocalizedValue(confirmLabel, dir === 'rtl' ? defaultConfirmText.ar : defaultConfirmText.en);
  const currentCancelLabel = getLocalizedValue(cancelLabel, dir === 'rtl' ? 'إلغاء' : 'Cancel');

  const handleConfirm = async () => {
    if (requiredInput && !inputValue.trim()) return;
    setIsSubmitting(true);
    try {
      await onConfirm(hasInput ? inputValue : undefined);
    } catch (err) {
      console.error('[ActionConfirmationModal] confirmation failed:', err);
    } finally {
      setIsSubmitting(false);
      onClose();
    }
  };

  const colorConfigs = {
    danger: {
      accent: 'text-red-500',
      icon: <ShieldAlert size={22} className="text-red-500 shrink-0" />,
      btnClass: 'bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold border border-red-500/20 shadow-lg shadow-red-900/20',
    },
    success: {
      accent: 'text-[var(--fg-success)]',
      icon: <CheckCircle size={22} className="text-[var(--fg-success)] shrink-0" />,
      btnClass: 'bg-white hover:bg-gray-100 active:scale-95 text-gray-900 font-bold shadow-md',
    },
    warning: {
      accent: 'text-amber-400',
      icon: <AlertTriangle size={22} className="text-amber-400 shrink-0" />,
      btnClass: 'bg-white hover:bg-gray-100 active:scale-95 text-gray-900 font-bold shadow-md',
    },
    info: {
      accent: 'text-sky-400',
      icon: <Info size={22} className="text-sky-400 shrink-0" />,
      btnClass: 'bg-white hover:bg-gray-100 active:scale-95 text-gray-900 font-bold shadow-md',
    },
    purple: {
      accent: 'text-purple-400',
      icon: <AlertTriangle size={22} className="text-purple-400 shrink-0" />,
      btnClass: 'bg-white hover:bg-gray-100 active:scale-95 text-gray-900 font-bold shadow-md',
    },
  }[variant];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={isSubmitting ? undefined : onClose}
            className="absolute inset-0 bg-black/75 backdrop-blur-md transition-all"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 15 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative max-w-md w-full p-6 sm:p-7 rounded-2xl border border-white/10 bg-[#18181b] text-white shadow-2xl transition-theme z-10 font-sans"
            style={{ direction: dir }}
          >
            {/* Header / Title */}
            <h3 className={`text-lg sm:text-xl font-bold tracking-tight text-start flex items-center gap-2.5 mb-2 ${colorConfigs.accent}`}>
              {colorConfigs.icon}
              <span className="text-white">{currentTitle}</span>
            </h3>

            {/* Description */}
            {currentDescription && (
              <p className="text-sm font-sans leading-relaxed text-start text-gray-300 mb-3">
                {currentDescription}
              </p>
            )}

            {/* Optional Input prompt */}
            {hasInput && (
              <div className="mt-3 mb-2">
                <input
                  type={inputType}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (!requiredInput || inputValue.trim())) {
                      handleConfirm();
                    }
                  }}
                  placeholder={currentPlaceholder}
                  autoFocus
                  className="w-full bg-[#27272a] border border-gray-700/80 focus:border-white/50 focus:ring-2 focus:ring-white/10 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm transition-all outline-none font-sans"
                />
              </div>
            )}

            {/* Optional extra content slot */}
            {extraContent && (
              <div className="mt-3">
                {extraContent}
              </div>
            )}

            {/* Action buttons */}
            <div className={`flex items-center justify-end gap-3 mt-6 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={onClose}
                className="px-4.5 py-2.5 text-sm font-semibold rounded-xl text-gray-400 hover:text-white hover:bg-white/5 active:scale-95 transition-all font-sans disabled:opacity-50"
              >
                {currentCancelLabel}
              </button>

              <button
                type="button"
                disabled={isSubmitting || (requiredInput && !inputValue.trim())}
                onClick={handleConfirm}
                className={`px-5 py-2.5 text-sm font-bold rounded-xl font-sans flex items-center justify-center gap-2 transition-all disabled:opacity-50 min-w-[95px] ${colorConfigs.btnClass}`}
              >
                {isSubmitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : null}
                <span>{currentConfirmLabel}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};


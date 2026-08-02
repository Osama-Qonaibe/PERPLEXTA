import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, AlertTriangle, CheckCircle, Info, HelpCircle } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

export interface ActionConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string | { ar: string; en: string };
  description: string | { ar: string; en: string };
  variant?: 'danger' | 'success' | 'warning' | 'info' | 'purple';
  confirmLabel?: string | { ar: string; en: string };
  cancelLabel?: string | { ar: string; en: string };
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
  extraContent,
}) => {
  const { theme, dir } = useAppContext();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getLocalizedValue = (val: string | { ar: string; en: string } | undefined, defaultVal: string): string => {
    if (!val) return defaultVal;
    if (typeof val === 'string') return val;
    return dir === 'rtl' ? val.ar : val.en;
  };

  const currentTitle = getLocalizedValue(title, dir === 'rtl' ? 'هل أنت متأكد؟' : 'Are you sure?');
  const currentDescription = getLocalizedValue(description, '');
  
  const defaultConfirmText = {
    danger: { ar: 'تأكيد الحذف', en: 'Confirm Delete' },
    success: { ar: 'تأكيد الإجراء', en: 'Confirm Action' },
    warning: { ar: 'تأكيد ومتابعة', en: 'Proceed' },
    info: { ar: 'فهمت ومتابعة', en: 'Acknowledge' },
    purple: { ar: 'تطهير السجلات', en: 'Prune Records' },
  }[variant];

  const currentConfirmLabel = getLocalizedValue(confirmLabel, dir === 'rtl' ? defaultConfirmText.ar : defaultConfirmText.en);
  const currentCancelLabel = getLocalizedValue(cancelLabel, dir === 'rtl' ? 'إلغاء' : 'Cancel');

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm();
    } catch (err) {
      console.error('[ActionConfirmationModal] confirmation failed:', err);
    } finally {
      setIsSubmitting(false);
      onClose(); // Auto close on completion
    }
  };

  // Color configurations based on variants
  const colorConfigs = {
    danger: {
      accent: 'text-red-500 dark:text-red-400',
      icon: <AlertTriangle size={20} className="text-red-500 animate-pulse shrink-0" />,
      btnClass: 'bg-[#db6b7a] hover:bg-[#c95968] text-white shadow-[0_0_12px_rgba(219,107,122,0.25)]',
    },
    success: {
      accent: 'text-emerald-500 dark:text-emerald-400',
      icon: <CheckCircle size={20} className="text-emerald-500 shrink-0" />,
      btnClass: 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-[0_0_12px_rgba(16,185,129,0.25)]',
    },
    warning: {
      accent: 'text-amber-500 dark:text-amber-400',
      icon: <AlertTriangle size={20} className="text-amber-500 shrink-0" />,
      btnClass: 'bg-amber-500 hover:bg-amber-600 text-white shadow-[0_0_12px_rgba(245,158,11,0.25)]',
    },
    info: {
      accent: 'text-blue-500 dark:text-blue-400',
      icon: <Info size={20} className="text-blue-500 shrink-0" />,
      btnClass: 'bg-blue-500 hover:bg-blue-600 text-white shadow-[0_0_12px_rgba(59,130,246,0.25)]',
    },
    purple: {
      accent: 'text-purple-500 dark:text-purple-400',
      icon: <AlertTriangle size={20} className="text-purple-500 shrink-0" />,
      btnClass: 'bg-purple-500 hover:bg-purple-600 text-white shadow-[0_0_12px_rgba(168,85,247,0.25)]',
    },
  }[variant];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={isSubmitting ? undefined : onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className={`relative max-w-sm w-full p-6 rounded-xl border shadow-2xl transition-all duration-300 z-10 ${
              theme === 'dark'
                ? 'bg-[#161618] border-zinc-800 text-gray-100'
                : 'bg-white border-gray-150 text-gray-900'
            }`}
          >
            {/* Header / Title */}
            <h3 className={`text-base font-bold tracking-tight font-sans text-start flex items-center gap-2 ${colorConfigs.accent}`}>
              {colorConfigs.icon}
              <span>{currentTitle}</span>
            </h3>

            {/* Description */}
            {currentDescription && (
              <p className={`text-xs mt-2.5 font-sans leading-relaxed text-start ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                {currentDescription}
              </p>
            )}

            {/* Optional extra content slot (e.g. previewing the deleted item details) */}
            {extraContent && (
              <div className="mt-4">
                {extraContent}
              </div>
            )}

            {/* Action buttons (RTL/LTR dynamic direction pairing) */}
            <div className={`flex justify-end gap-2.5 mt-6 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={onClose}
                className={`px-4 py-2 text-xs font-semibold rounded-[4px] font-sans transition-all duration-300 disabled:opacity-50 ${
                  theme === 'dark'
                    ? 'text-gray-400 hover:text-white hover:bg-[#252528]'
                    : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
                }`}
              >
                {currentCancelLabel}
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirm}
                className={`px-4 py-2 text-xs font-bold rounded-[4px] font-sans flex items-center justify-center gap-1.5 transition-all duration-300 disabled:opacity-80 min-w-[100px] ${colorConfigs.btnClass}`}
              >
                {isSubmitting ? (
                  <Loader2 size={13} className="animate-spin" />
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

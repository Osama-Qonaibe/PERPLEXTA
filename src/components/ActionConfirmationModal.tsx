import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, AlertTriangle, CheckCircle, Info } from 'lucide-react';
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

  const colorConfigs = {
    danger: {
      accent: 'text-[var(--fg-danger)]',
      icon: <AlertTriangle size={20} className="text-[var(--fg-danger)] shrink-0" />,
      btnClass: 'bg-[var(--bg-danger-emphasis)] text-[var(--fg-on-emphasis)] hover:opacity-90',
    },
    success: {
      accent: 'text-[var(--fg-success)]',
      icon: <CheckCircle size={20} className="text-[var(--fg-success)] shrink-0" />,
      btnClass: 'bg-[var(--bg-accent-emphasis)] text-[var(--fg-on-emphasis)] hover:opacity-90',
    },
    warning: {
      accent: 'text-[var(--fg-attention)]',
      icon: <AlertTriangle size={20} className="text-[var(--fg-attention)] shrink-0" />,
      btnClass: 'bg-[var(--bg-attention-emphasis)] text-[var(--fg-on-emphasis)] hover:opacity-90',
    },
    info: {
      accent: 'text-[var(--fg-info)]',
      icon: <Info size={20} className="text-[var(--fg-info)] shrink-0" />,
      btnClass: 'bg-[var(--bg-accent-emphasis)] text-[var(--fg-on-emphasis)] hover:opacity-90',
    },
    purple: {
      accent: 'text-[var(--text-primary)]',
      icon: <AlertTriangle size={20} className="text-[var(--text-primary)] shrink-0" />,
      btnClass: 'bg-[var(--bg-accent-emphasis)] text-[var(--fg-on-emphasis)] hover:opacity-90',
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
            className="relative max-w-sm w-full p-6 rounded-xl border border-[var(--border-main)] bg-[var(--surface-card)] text-[var(--text-primary)] shadow-2xl transition-theme z-10"
          >
            {/* Header / Title */}
            <h3 className={`text-base font-bold tracking-tight font-sans text-start flex items-center gap-2 ${colorConfigs.accent}`}>
              {colorConfigs.icon}
              <span>{currentTitle}</span>
            </h3>

            {/* Description */}
            {currentDescription && (
              <p className="text-xs mt-2.5 font-sans leading-relaxed text-start text-[var(--text-secondary)]">
                {currentDescription}
              </p>
            )}

            {/* Optional extra content slot */}
            {extraContent && (
              <div className="mt-4">
                {extraContent}
              </div>
            )}

            {/* Action buttons */}
            <div className={`flex justify-end gap-2.5 mt-6 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold rounded-[4px] font-sans transition-theme disabled:opacity-50 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] border border-[var(--border-main)]"
              >
                {currentCancelLabel}
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirm}
                className={`px-4 py-2 text-xs font-bold rounded-[4px] font-sans flex items-center justify-center gap-1.5 transition-theme disabled:opacity-80 min-w-[100px] ${colorConfigs.btnClass}`}
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

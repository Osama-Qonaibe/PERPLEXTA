import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';

interface ConfirmDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary';
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen, onConfirm, onCancel, title = 'تأكيد', message,
  confirmText = 'تأكيد', cancelText = 'إلغاء', variant = 'danger'
}) => (
  <Modal isOpen={isOpen} onClose={onCancel} title={title} size="sm">
    <p className="text-gray-300 text-sm mb-4">{message}</p>
    <div className="flex gap-2 justify-end">
      <Button variant="ghost" size="sm" onClick={onCancel}>{cancelText}</Button>
      <Button variant={variant} size="sm" onClick={onConfirm}>{confirmText}</Button>
    </div>
  </Modal>
);

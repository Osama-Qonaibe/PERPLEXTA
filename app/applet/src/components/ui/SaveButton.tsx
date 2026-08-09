import React, { useState } from 'react';
import { Bookmark, BookmarkCheck } from 'lucide-react';

interface SaveButtonProps {
  isSaved?: boolean;
  onToggle?: () => void;
  label?: string;
  savedLabel?: string;
  className?: string;
}

export const SaveButton: React.FC<SaveButtonProps> = ({
  isSaved = false,
  onToggle,
  label = 'حفظ',
  savedLabel = 'تم الحفظ',
  className = '',
}) => {
  const [saved, setSaved] = useState(isSaved);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSaved(!saved);
    if (onToggle) onToggle();
  };

  return (
    <button
      onClick={handleClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary hover:bg-overlay text-text-primary border border-border-main transition-all ui-transition ${className}`}
    >
      {saved ? (
        <BookmarkCheck size={15} className="text-success" />
      ) : (
        <Bookmark size={15} className="text-text-muted" />
      )}
      <span>{saved ? savedLabel : label}</span>
    </button>
  );
};

import React, { useState } from 'react';
import { Copy, Check, RotateCcw } from 'lucide-react';
import { TokenDefinition } from '../types';

interface TokenColorPickerProps {
  definition: TokenDefinition;
  value: string;
  defaultValue: string;
  onChange: (newValue: string) => void;
  language: string;
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const TokenColorPicker: React.FC<TokenColorPickerProps> = ({
  definition,
  value,
  defaultValue,
  onChange,
  language,
  showToast,
}) => {
  const isAr = language === 'ar';
  const [copied, setCopied] = useState(false);

  const handleCopyKey = () => {
    navigator.clipboard.writeText(`var(${definition.key})`);
    setCopied(true);
    showToast(isAr ? `تم نسخ: var(${definition.key})` : `Copied var(${definition.key})`, 'info');
    setTimeout(() => setCopied(false), 1600);
  };

  const handleReset = () => {
    onChange(defaultValue);
  };

  const isDefault = value === defaultValue;
  const isHex = value && value.startsWith('#');

  return (
    <div className="bg-[var(--surface-subtle)] border border-[var(--border-main)] rounded-[var(--radius-md)] p-4 flex flex-col justify-between gap-3 hover:border-accent/40 transition-colors">
      <div>
        <div className="flex items-start justify-between gap-2 mb-1">
          <span className="font-bold text-sm text-[var(--text-primary)]">
            {isAr ? definition.labelAr : definition.labelEn}
          </span>
          <button
            type="button"
            onClick={handleCopyKey}
            className="flex items-center gap-1 text-[11px] font-mono bg-[var(--surface-inset)] hover:bg-[var(--surface-card)] text-[var(--text-muted)] hover:text-[var(--text-primary)] px-2 py-0.5 rounded border border-[var(--border-main)] transition-colors cursor-pointer"
            title={isAr ? 'نسخ كود المتغير' : 'Copy CSS variable'}
          >
            {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
            <span>{definition.key}</span>
          </button>
        </div>

        <p className="text-xs text-[var(--text-secondary)] line-clamp-2">
          {isAr ? definition.descriptionAr : definition.descriptionEn}
        </p>
      </div>

      <div className="flex items-center gap-3 pt-2 border-t border-[var(--border-main)]/60">
        {/* Visual Swatch & Native Color Picker */}
        <div className="relative w-10 h-10 rounded-[var(--radius-sm)] overflow-hidden border border-[var(--border-main)] shadow-sm shrink-0">
          <div
            className="absolute inset-0 w-full h-full"
            style={{ backgroundColor: value || defaultValue }}
          />
          <input
            type="color"
            value={isHex && value.length === 7 ? value : '#181715'}
            onChange={(e) => onChange(e.target.value)}
            className="absolute -inset-2 w-16 h-16 cursor-pointer opacity-0"
            title={isAr ? 'اختر اللون' : 'Pick Color'}
          />
        </div>

        {/* Text Input for HEX or RGBA */}
        <div className="flex-1 relative">
          <input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={defaultValue}
            className="w-full bg-[var(--surface-page)] border border-[var(--border-main)] text-[var(--text-primary)] px-3 py-2 rounded-[var(--radius-sm)] text-xs font-mono focus:outline-none focus:border-accent"
          />
        </div>

        {/* Reset Single Token */}
        {!isDefault && (
          <button
            type="button"
            onClick={handleReset}
            className="p-2 rounded-[var(--radius-sm)] hover:bg-[var(--surface-inset)] text-[var(--text-muted)] hover:text-accent transition-colors"
            title={isAr ? 'استعادة القيمة الافتراضية لهذا الرمز' : 'Reset to default'}
          >
            <RotateCcw size={14} />
          </button>
        )}
      </div>
    </div>
  );
};

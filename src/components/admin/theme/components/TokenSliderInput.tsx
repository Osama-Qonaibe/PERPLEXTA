import React, { useState } from 'react';
import { Copy, Check, RotateCcw } from 'lucide-react';
import { TokenDefinition } from '../types';

interface TokenSliderInputProps {
  definition: TokenDefinition;
  value: string;
  defaultValue: string;
  onChange: (newValue: string) => void;
  language: string;
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const TokenSliderInput: React.FC<TokenSliderInputProps> = ({
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

  const isDefault = value === defaultValue;

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
        {definition.options && definition.options.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5 flex-1">
            {definition.options.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => onChange(opt)}
                className={`px-2.5 py-1 text-xs rounded font-mono font-bold transition-all ${
                  value === opt
                    ? 'bg-[var(--bg-accent-emphasis)] text-[var(--fg-on-emphasis)] shadow-sm'
                    : 'bg-[var(--surface-page)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-main)]'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        ) : (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={defaultValue}
            className="flex-1 bg-[var(--surface-page)] border border-[var(--border-main)] text-[var(--text-primary)] px-3 py-2 rounded-[var(--radius-sm)] text-xs font-mono focus:outline-none focus:border-accent"
          />
        )}

        {!isDefault && (
          <button
            type="button"
            onClick={() => onChange(defaultValue)}
            className="p-2 rounded-[var(--radius-sm)] hover:bg-[var(--surface-inset)] text-[var(--text-muted)] hover:text-accent transition-colors shrink-0"
            title={isAr ? 'استعادة القيمة الافتراضية' : 'Reset to default'}
          >
            <RotateCcw size={14} />
          </button>
        )}
      </div>
    </div>
  );
};

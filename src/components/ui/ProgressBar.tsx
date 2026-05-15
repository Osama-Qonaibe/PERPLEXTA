import React from 'react';

interface ProgressBarProps {
  value: number;
  max?: number;
  className?: string;
  showLabel?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  className = '',
  showLabel = false,
}) => {
  const percentage = Math.min(Math.round((value / max) * 100), 100);
  const color = percentage >= 90 ? 'var(--danger)' : percentage >= 70 ? 'var(--warning)' : 'var(--accent)';

  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex justify-between text-xs text-[var(--text-muted)] mb-1">
          <span>{value}</span>
          <span>{percentage}%</span>
        </div>
      )}
      <div className="w-full h-1.5 bg-[var(--bg-overlay)] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-600"
          style={{ width: `${percentage}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
};

import React from 'react';

interface ProgressBarProps {
  value: number;
  max?: number;
  showLabel?: boolean;
  className?: string;
  color?: 'emerald' | 'red' | 'yellow' | 'blue';
}

export function ProgressBar({
  value,
  max = 100,
  showLabel = false,
  className = '',
  color = 'emerald',
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));

  const colors: Record<string, string> = {
    emerald: 'bg-emerald-500',
    red: 'bg-red-500',
    yellow: 'bg-yellow-500',
    blue: 'bg-blue-500',
  };

  return (
    <div className={`w-full ${className}`}>
      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full ${colors[color]} transition-all duration-[600ms] cubic-bezier-[0.22,1,0.36,1]`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs text-gray-500 mt-1">{Math.round(pct)}%</span>
      )}
    </div>
  );
}

import React from 'react';

interface ProgressBarProps {
  value: number;
  max?: number;
  className?: string;
  showLabel?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ value, max = 100, className = '', showLabel = false }) => {
  const percent = Math.min(100, Math.round((value / max) * 100));
  const color = percent >= 90 ? 'bg-red-500' : percent >= 70 ? 'bg-yellow-500' : 'bg-emerald-500';

  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>{value}</span>
          <span>{percent}%</span>
        </div>
      )}
      <div className="w-full bg-gray-800 rounded-full h-1.5">
        <div
          className={`h-1.5 rounded-full transition-all duration-600 ${color}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
};

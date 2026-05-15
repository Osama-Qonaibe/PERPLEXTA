import React from 'react';

interface ProgressBarProps {
  value: number;
  max: number;
  color?: string;
  className?: string;
  showLabel?: boolean;
  label?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ 
  value, max, color = 'bg-emerald-500', className = '', showLabel = false, label 
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div className={`space-y-1.5 ${className}`}>
      {(showLabel || label) && (
        <div className="flex justify-between text-xs font-medium text-gray-400">
          <span>{label}</span>
          <span>{Math.round(percentage)}%</span>
        </div>
      )}
      <div className="h-1.5 w-full bg-gray-800/50 rounded-full overflow-hidden">
        <div 
          className={`h-full ${color} transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(16,185,129,0.3)]`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

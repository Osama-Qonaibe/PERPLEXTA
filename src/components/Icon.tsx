import React from 'react';
import { LucideIcon, LucideProps } from 'lucide-react';

export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;

export interface IconProps extends Omit<LucideProps, 'size'> {
  icon: LucideIcon;
  size?: IconSize;
  className?: string;
}

const SIZE_MAP: Record<string, number> = {
  xs: 14,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
};

export const Icon: React.FC<IconProps> = ({
  icon: LucideComponent,
  size = 'md',
  className = '',
  strokeWidth = 2,
  ...props
}) => {
  const pixelSize = typeof size === 'number' ? size : SIZE_MAP[size] || 20;

  return (
    <LucideComponent
      size={pixelSize}
      strokeWidth={strokeWidth}
      className={`shrink-0 inline-block transition-colors duration-150 ${className}`}
      {...props}
    />
  );
};

export default Icon;

import React from 'react';
import { SOCIAL_COLORS, SocialProvider } from '../../constants/socialColors';

export type SocialPlatform = SocialProvider;

export interface SocialButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  platform: SocialPlatform;
  children?: React.ReactNode;
  icon?: React.ReactNode;
}

export const SocialButton: React.FC<SocialButtonProps> = ({
  platform,
  children,
  icon,
  className = '',
  ...props
}) => {
  const config = SOCIAL_COLORS[platform] || SOCIAL_COLORS.whatsapp;

  return (
    <button
      style={{
        backgroundColor: config.base,
        color: '#ffffff',
      }}
      className={`inline-flex items-center justify-center gap-2 px-4 py-2 font-medium text-sm rounded-[var(--radius-sm)] transition-opacity hover:opacity-90 ${className}`}
      {...props}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children && <span>{children}</span>}
    </button>
  );
};

export default SocialButton;

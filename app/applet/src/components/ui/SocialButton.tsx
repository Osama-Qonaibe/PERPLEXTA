import React from 'react';
import { SOCIAL_COLORS, SocialProvider } from '../../constants/socialColors';
import { MessageCircle, Send, Linkedin, Globe, Share2 } from 'lucide-react';

interface SocialButtonProps {
  provider: SocialProvider;
  href: string;
  label?: string;
  className?: string;
  size?: number;
}

export const SocialButton: React.FC<SocialButtonProps> = ({
  provider,
  href,
  label,
  className = '',
  size = 16,
}) => {
  const config = SOCIAL_COLORS[provider] || SOCIAL_COLORS.whatsapp;

  const getIcon = () => {
    switch (provider) {
      case 'whatsapp':
        return <MessageCircle size={size} style={{ color: config.base }} />;
      case 'telegram':
        return <Send size={size} style={{ color: config.base }} />;
      case 'linkedin':
        return <Linkedin size={size} style={{ color: config.base }} />;
      case 'facebook':
        return <Globe size={size} style={{ color: config.base }} />;
      default:
        return <Share2 size={size} style={{ color: config.base }} />;
    }
  };

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ui-transition border ${className}`}
      style={{
        backgroundColor: config.soft,
        borderColor: config.border,
        color: config.base,
      }}
    >
      {getIcon()}
      {label && <span>{label}</span>}
    </a>
  );
};

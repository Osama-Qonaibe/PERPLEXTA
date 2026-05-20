import React from 'react';

interface DefaultLogoProps {
  className?: string;
  iconClassName?: string;
}

export const DefaultLogo: React.FC<DefaultLogoProps> = ({ 
  className = "w-10 h-10", 
  iconClassName = "w-7 h-7" 
}) => {
  return (
    <div 
      className={`${className} rounded-[10px] bg-emerald-500 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.3)] select-none flex-shrink-0 overflow-hidden relative group`}
    >
      {/* Background radial gradient to give it a premium 3D/ambient shine */}
      <div className="absolute inset-0 bg-gradient-to-tr from-black/20 via-transparent to-white/10" />
      
      {/* High-fidelity continuous-line neural-network/infinite-node symbol */}
      <svg 
        className={`${iconClassName} text-white filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.15)]`} 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="1.8" 
        strokeLinecap="round" 
        strokeLinejoin="round"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    </div>
  );
};

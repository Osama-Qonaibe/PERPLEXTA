import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

interface VisitorShellProps {
  children: React.ReactNode;
}

export const VisitorShell: React.FC<VisitorShellProps> = ({ children }) => {
  const navigate = useNavigate();
  const { dir } = useAppContext();
  const isRtl = dir === 'rtl';

  return (
    <div className="flex-1 flex flex-col justify-between w-full h-full max-w-3xl mx-auto px-4 md:px-6 py-4 sm:py-6 relative z-10 box-border">
      {/* Centered Hero & Prompt Box */}
      <div className="w-full text-[var(--text-primary)] my-auto flex flex-col items-center justify-center py-4 sm:py-8">
        <div className="w-full text-center mb-4 sm:mb-8 px-2 sm:px-4">
          <h1 className="text-base sm:text-xl md:text-2xl font-semibold sm:font-bold tracking-tight text-[var(--text-primary)] leading-snug max-w-2xl mx-auto select-none">
            {isRtl 
              ? 'ما هو جدول أعمالك اليوم؟'
              : 'What is your agenda for today?'
            }
          </h1>
        </div>

        <div className="w-full">
          {children}
        </div>
      </div>

      {/* Clean Horizontal Footer Bar */}
      <footer className="w-full pt-4 pb-[calc(10px+env(safe-area-inset-bottom,0px))] sm:pb-3 border-t border-[var(--border-muted)] select-none flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] sm:text-[11px] text-[var(--text-secondary)] px-1 sm:px-2">
        <nav className="flex items-center gap-3 sm:gap-4 font-bold text-accent">
          <button 
            type="button"
            onClick={() => navigate('/about')} 
            className="cursor-pointer hover:underline bg-transparent border-0 p-0 text-inherit font-inherit transition-colors duration-150"
          >
            {isRtl ? 'من نحن' : 'About Us'}
          </button>
          <span className="text-[var(--text-muted)] select-none">•</span>
          <button 
            type="button"
            onClick={() => navigate('/terms')} 
            className="cursor-pointer hover:underline bg-transparent border-0 p-0 text-inherit font-inherit transition-colors duration-150"
          >
            {isRtl ? 'شروط الخدمة' : 'Terms of Service'}
          </button>
          <span className="text-[var(--text-muted)] select-none">•</span>
          <button 
            type="button"
            onClick={() => navigate('/privacy')} 
            className="cursor-pointer hover:underline bg-transparent border-0 p-0 text-inherit font-inherit transition-colors duration-150"
          >
            {isRtl ? 'سياسة الخصوصية' : 'Privacy Policy'}
          </button>
          <span className="text-[var(--text-muted)] select-none">•</span>
          <button 
            type="button"
            onClick={() => navigate('/copyright')} 
            className="cursor-pointer hover:underline bg-transparent border-0 p-0 text-inherit font-inherit transition-colors duration-150"
          >
            {isRtl ? 'حقوق الملكية الفكرية' : 'Intellectual Property'}
          </button>
        </nav>
        <p className="font-sans tracking-wide leading-relaxed text-[var(--text-muted)] whitespace-nowrap text-[9px] sm:text-[11px]">
          {isRtl 
            ? 'جميع الحقوق محفوظة © 2026 ViralLinkUp'
            : '© 2026 ViralLinkUp. All rights reserved.'
          }
        </p>
      </footer>
    </div>
  );
};

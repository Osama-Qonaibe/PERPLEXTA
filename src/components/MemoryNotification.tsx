import React, { useEffect } from 'react';
import { BrainCircuit } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

interface MemoryNotificationProps {
  isVisible: boolean;
  onClose: () => void;
  type?: 'success' | 'warning' | 'cleanup' | 'optimization' | 'startup';
  customDesc?: string;
}

export const MemoryNotification: React.FC<MemoryNotificationProps> = ({ isVisible, onClose, type = 'success', customDesc }) => {
  const { dir, theme, isMobile } = useAppContext();

  useEffect(() => {
    if (isVisible) {
      const duration = type === 'startup' ? 3000 : 8000;
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose, type]);

  if (!isVisible) return null;

  const config = {
    startup: {
      title: '',
      desc: dir === 'rtl' ? 'يتم الآن تلخيص الجلسات وحفظ السياق لضمان ذكاء مستمر واستجابة دقيقة' : 'Sessions are being summarized and context preserved for continuous intelligence.',
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
      border: 'border-[var(--border-main)]',
      shadow: 'shadow-emerald-500/10'
    },
    success: {
      title: dir === 'rtl' ? 'تم التحديث في الذاكرة' : 'Memory Updated',
      desc: dir === 'rtl' ? 'سيتذكر المساعد هذا للجلسات القادمة.' : 'The Assistant will remember this for future sessions.',
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
      border: 'border-[var(--border-main)]',
      shadow: 'shadow-emerald-500/10'
    },
    warning: {
      title: dir === 'rtl' ? 'تنبيه: سعة الذاكرة' : 'Warning: Memory Capacity',
      desc: dir === 'rtl' ? 'تخزين الذاكرة شارف على النهاية (45/50). يرجى مراجعة وتنظيم الذاكرة في مركز الذاكرة.' : 'Memory limit almost reached (45/50). Please review and organize your memories in Memory Center.',
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
      border: 'border-[var(--border-main)]',
      shadow: 'shadow-amber-500/10'
    },
    cleanup: {
      title: dir === 'rtl' ? 'تحسين الذاكرة التلقائي' : 'Auto Memory Optimization',
      desc: dir === 'rtl' ? 'وصلت الذاكرة للحد الأقصى. تم دمج السجلات القديمة تلقائياً لتحرير مساحة للذكاء الجديد.' : 'Memory limit reached. Old records automatically merged to free up space for new intelligence.',
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
      border: 'border-[var(--border-main)]',
      shadow: 'shadow-blue-500/10'
    },
    optimization: {
      title: dir === 'rtl' ? 'تحسين الذاكرة الرقمية' : 'Memory Intelligence Optimized',
      desc: dir === 'rtl' ? 'تم دمج السجلات القديمة في حقائق عالية المستوى لرفع كفاءة النظام.' : 'Old entries consolidated into high-level facts for peak efficiency.',
      color: 'text-violet-500',
      bg: 'bg-violet-500/10',
      border: 'border-[var(--border-main)]',
      shadow: 'shadow-violet-500/10'
    }
  };

  const current = config[type];
  const displayDesc = customDesc || current.desc;

  return (
    <div className={`fixed ${isMobile ? 'bottom-4' : 'top-12'} left-1/2 -translate-x-1/2 z-[100] px-3 md:px-5 py-2 md:py-3 rounded-xl md:rounded-2xl shadow-2xl flex items-center gap-3 md:gap-4 animate-in fade-in slide-in-from-${isMobile ? 'bottom-8' : 'top-8'} duration-700 border ${current.border} ${current.shadow} bg-[var(--bg-secondary)]/90 backdrop-blur-xl transition-colors duration-300 w-[90%] md:w-auto min-w-[280px] md:min-w-0 max-w-[400px]`}>
      <div className={`w-9 h-9 md:w-11 md:h-11 rounded-lg md:rounded-xl ${current.bg} flex items-center justify-center relative overflow-hidden group flex-shrink-0`}>
        <div className={`absolute inset-0 opacity-20 ${current.bg} animate-pulse`}></div>
        <BrainCircuit className={`${current.color} drop-shadow-[0_0_10px_rgba(16,185,129,0.8)] relative z-10 transition-transform duration-500 group-hover:scale-110`} size={isMobile ? 20 : 24} />
      </div>

      <div className={`flex flex-col flex-1 min-w-0 ${dir === 'rtl' ? 'items-end text-right' : 'items-start text-left'}`}>
        {current.title && (
          <span className={`${current.color} font-black text-[11px] md:text-[13px] tracking-tight drop-shadow-[0_0_8px_rgba(16,185,129,0.4)] uppercase truncate w-full`}>
            {current.title}
          </span>
        )}
        <span className={`${!current.title ? current.color : 'text-gray-500 dark:text-gray-400'} text-[10px] md:text-[11px] font-bold leading-tight line-clamp-2`}>
          {displayDesc}
        </span>
      </div>

      <div className="w-px h-6 md:h-8 bg-[var(--border-main)] mx-0.5 md:mx-1 flex-shrink-0"></div>

      <button 
        onClick={onClose}
        className="text-gray-400 hover:text-[var(--text-primary)] transition-colors p-1.5 flex-shrink-0"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
      </button>
    </div>
  );
};

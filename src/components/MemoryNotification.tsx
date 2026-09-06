import React, { useEffect } from 'react';
import { BrainCircuit, X } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { motion } from 'motion/react';

interface MemoryNotificationProps {
  isVisible: boolean;
  onClose: () => void;
  type?: 'success' | 'warning' | 'cleanup' | 'optimization' | 'startup';
  customDesc?: string;
}

export const MemoryNotification: React.FC<MemoryNotificationProps> = ({ isVisible, onClose, type = 'success', customDesc }) => {
  const { dir, isMobile } = useAppContext();

  useEffect(() => {
    if (isVisible) {
      const duration = 3500; // Increased to 3.5 seconds to give the user enough time to read the text clearly
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible || isMobile) return null;

  const config = {
    startup: {
      desc: dir === 'rtl' ? 'جاري مزامنة الذاكرة...' : 'Syncing memory...',
      color: 'text-accent',
      bg: 'bg-accent/10',
    },
    success: {
      desc: dir === 'rtl' ? 'تم تحديث الذاكرة.' : 'Memory updated.',
      color: 'text-accent',
      bg: 'bg-accent/10',
    },
    warning: {
      desc: dir === 'rtl' ? 'تنبيه: امتلاء الذاكرة (45/50).' : 'Warning: Memory limit (45/50).',
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
    },
    cleanup: {
      desc: dir === 'rtl' ? 'تم دمج السجلات القديمة.' : 'Old records merged.',
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
    },
    optimization: {
      desc: dir === 'rtl' ? 'تم تحسين الكفاءة.' : 'Efficiency optimized.',
      color: 'text-violet-500',
      bg: 'bg-violet-500/10',
    }
  };

  const current = config[type];
  const displayDesc = customDesc || current.desc;

  if (isMobile) {
    return (
      <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-[280px] bg-[var(--bg-secondary)]/95 backdrop-blur-xl border border-[var(--border)] rounded-[4px] shadow-2xl py-1.5 px-3 flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-300">
        <div className={`w-5 h-5 rounded-[4px] ${current.bg} flex items-center justify-center flex-shrink-0`}>
          <BrainCircuit className={current.color} size={12} />
        </div>
        <p className="text-[10px] font-bold text-[var(--text-primary)] leading-none flex-1 truncate">
          {displayDesc}
        </p>
        <button onClick={onClose} className="p-0.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
          <X size={12} />
        </button>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="hidden md:flex items-center gap-3 px-4 py-1.5 rounded-[4px] bg-accent/[0.03] border border-accent/20 backdrop-blur-sm shadow-[0_0_20px_rgba(156,163,175,0.05)]"
    >
      <BrainCircuit className="text-accent" size={14} />
      <span className="text-[11px] font-black text-accent/90 tracking-tight uppercase whitespace-nowrap">
        {displayDesc}
      </span>
      <div className="w-px h-3 bg-accent/20 mx-1" />
      <button 
        onClick={onClose}
        className="text-accent/40 hover:text-accent transition-colors"
      >
        <X size={12} />
      </button>
    </motion.div>
  );
};

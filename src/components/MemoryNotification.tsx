import React, { useEffect } from 'react';
import { BrainCircuit, X } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { motion, AnimatePresence } from 'motion/react';

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
      const duration = 1500; // Fast 1.5 seconds for premium, less annoying presentation
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  const config = {
    startup: {
      desc: dir === 'rtl' ? 'يتم الآن تلخيص الجلسات وحفظ السياق...' : 'Summarizing session context...',
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
    },
    success: {
      desc: dir === 'rtl' ? 'تم تحديث الذاكرة بنجاح.' : 'Memory updated successfully.',
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
    },
    warning: {
      desc: dir === 'rtl' ? 'تنبيه: سعة الذاكرة شارفت على الانتهاء (45/50).' : 'Warning: Memory capacity almost reached (45/50).',
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
    },
    cleanup: {
      desc: dir === 'rtl' ? 'تم دمج السجلات القديمة تلقائياً.' : 'Old records merged automatically.',
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
    },
    optimization: {
      desc: dir === 'rtl' ? 'تم تحسين كفاءة النظام بنجاح.' : 'System efficiency optimized successfully.',
      color: 'text-violet-500',
      bg: 'bg-violet-500/10',
    }
  };

  const current = config[type];
  const displayDesc = customDesc || current.desc;

  if (isMobile) {
    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] w-[88%] max-w-[320px] bg-[var(--bg-secondary)]/95 backdrop-blur-xl border border-[var(--border)] rounded-full shadow-2xl py-1.5 px-3 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className={`w-6 h-6 rounded-full ${current.bg} flex items-center justify-center flex-shrink-0`}>
          <BrainCircuit className={current.color} size={13} />
        </div>
        <p className="text-[9.5px] font-bold text-[var(--text-primary)] leading-none flex-1 truncate">
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
      className="hidden md:flex items-center gap-3 px-4 py-1.5 rounded-full bg-emerald-500/[0.03] border border-emerald-500/20 backdrop-blur-sm shadow-[0_0_20px_rgba(16,185,129,0.05)]"
    >
      <BrainCircuit className="text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" size={14} />
      <span className="text-[11px] font-black text-emerald-500/90 tracking-tight uppercase whitespace-nowrap">
        {displayDesc}
      </span>
      <div className="w-px h-3 bg-emerald-500/20 mx-1" />
      <button 
        onClick={onClose}
        className="text-emerald-500/40 hover:text-emerald-500 transition-colors"
      >
        <X size={12} />
      </button>
    </motion.div>
  );
};

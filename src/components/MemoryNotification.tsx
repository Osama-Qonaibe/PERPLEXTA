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
      const duration = 3000; // Force 3 seconds for all memory notifications for non-annoyance
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  const config = {
    startup: {
      desc: dir === 'rtl' ? 'يتم الآن تلخيص الجلسات وحفظ السياق لضمان سياق مستمر واستجابة دقيقة' : 'Sessions are being summarized and context saved to ensure continuous context and accurate response.',
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
    },
    success: {
      desc: dir === 'rtl' ? 'تم تحديث الذاكرة السيادية بنجاح.' : 'Sovereign memory updated successfully.',
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
    },
    warning: {
      desc: dir === 'rtl' ? 'تنبيه: سعة الذاكرة شارفت على الانتهاء (45/50).' : 'Warning: Memory capacity almost reached (45/50).',
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
    },
    cleanup: {
      desc: dir === 'rtl' ? 'تم دمج السجلات القديمة تلقائياً لتحرير مساحة.' : 'Old records merged to free up space.',
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
    },
    optimization: {
      desc: dir === 'rtl' ? 'تم تحسين كفاءة النظام عبر دمج السجلات.' : 'System efficiency optimized via consolidation.',
      color: 'text-violet-500',
      bg: 'bg-violet-500/10',
    }
  };

  const current = config[type];
  const displayDesc = customDesc || current.desc;

  if (isMobile) {
    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] w-[92%] max-w-[400px] bg-[var(--bg-secondary)]/90 backdrop-blur-xl border border-[var(--border)] rounded-[var(--radius)] shadow-2xl p-3 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-8 duration-500">
        <div className={`w-9 h-9 rounded-[var(--radius)] ${current.bg} flex items-center justify-center flex-shrink-0`}>
          <BrainCircuit className={current.color} size={20} />
        </div>
        <p className="text-[10px] font-bold text-[var(--text-primary)] leading-tight flex-1">
          {displayDesc}
        </p>
        <button onClick={onClose} className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
          <X size={14} />
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

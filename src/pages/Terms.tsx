import React from 'react';
import { useAppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Scale } from 'lucide-react';
import { motion } from 'motion/react';
import { sovereignPageTransition } from '../constants/motions';

export const Terms: React.FC = () => {
  const { t, dir, theme } = useAppContext();
  const navigate = useNavigate();

  return (
    <motion.div 
      initial="initial"
      animate="animate"
      exit="exit"
      variants={sovereignPageTransition}
      className="max-w-4xl mx-auto px-6 sm:px-8 pb-12"
    >
      <div className={`sticky -top-0.5 z-20 -mx-6 sm:-mx-8 px-6 sm:px-8 py-3 mb-8 transition-all duration-300 bg-[var(--bg-primary)]/95 backdrop-blur-md border-b border-[var(--border-main)]`}>
        <div className="flex items-center gap-3 md:gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-[var(--radius)] flex items-center justify-center transition-all duration-300 bg-[var(--bg-secondary)] border border-[var(--border-main)] text-[var(--text-secondary)] hover:text-emerald-500"
          >
            {dir === 'rtl' ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-gray-900 dark:text-white uppercase flex items-center gap-2">
              <Scale className="text-emerald-500" size={20} />
              {t('termsOfUse')}
            </h1>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest opacity-60">
              {dir === 'rtl' ? 'القواعد والسياسات المنظمة' : 'GOVERNING RULES & POLICIES'}
            </p>
          </div>
        </div>
      </div>

      <div className={`p-8 md:p-12 rounded-[var(--radius)] border ${theme === 'dark' ? 'bg-[#1a1a1c] border-[var(--border-main)]' : 'bg-white border-[var(--border-main)]'} shadow-xl`}>
        <div className="prose dark:prose-invert max-w-none">
          <p>This is a placeholder for the Terms of Use. Please update this content with your legal agreements.</p>
        </div>
      </div>
    </motion.div>
  );
};
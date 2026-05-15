import React from 'react';
import { useAppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { motion } from 'motion/react';
import { sovereignPageTransition } from '../constants/motions';

export const About: React.FC = () => {
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
            className="w-10 h-10 rounded-[4px] flex items-center justify-center transition-all duration-300 bg-[var(--bg-secondary)] border border-[var(--border-main)] text-[var(--text-secondary)] hover:text-emerald-500"
          >
            {dir === 'rtl' ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-gray-900 dark:text-white uppercase flex items-center gap-2">
              <Info className="text-emerald-500" size={20} />
              {dir === 'rtl' ? 'من نحن' : 'About Us'}
            </h1>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest opacity-60">
              {dir === 'rtl' ? 'رؤية المنصة وهويتها' : 'PLATFORM VISION & IDENTITY'}
            </p>
          </div>
        </div>
      </div>

      <div className={`p-8 md:p-12 rounded-[4px] border ${theme === 'dark' ? 'bg-[#1a1a1c] border-gray-800/60' : 'bg-white border-gray-200'} shadow-xl`}>
        <div className="prose dark:prose-invert max-w-none">
          <p>
            {dir === 'rtl' 
              ? 'هذه الصفحة مخصصة لتعريف المستخدمين بالمنصة ورؤيتها وأهدافها.' 
              : 'This is a placeholder for the About Us page. Please update this content with your information regarding the platform and its vision.'}
          </p>
        </div>
      </div>
    </motion.div>
  );
};
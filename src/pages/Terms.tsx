import React from 'react';
import { useAppContext } from '../context/AppContext';

import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Scale } from 'lucide-react';

export const Terms: React.FC = () => {
  const { t, dir, theme } = useAppContext();
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto px-6 sm:px-8 pb-12">
      {/* Sticky Header Section - Elite Standard */}
      <div className={`sticky -top-0.5 z-20 -mx-6 sm:-mx-8 px-6 sm:px-8 py-3 mb-8 transition-all duration-300 ${
        theme === 'dark' ? 'bg-[#0f0f11]/95' : 'bg-white/95'
      } backdrop-blur-md border-b ${theme === 'dark' ? 'border-gray-800/40' : 'border-gray-100'}`}>
        <div className="flex items-center gap-3 md:gap-4">
          <button 
            onClick={() => navigate(-1)}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
              theme === 'dark' 
                ? 'bg-gray-800/30 hover:bg-gray-800 text-gray-400 hover:text-emerald-500 border border-gray-800/40' 
                : 'bg-gray-50 hover:bg-gray-100 text-gray-500 hover:text-emerald-600 border border-gray-200'
            }`}
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

      <div className={`p-8 md:p-12 rounded-[2.5rem] border ${theme === 'dark' ? 'bg-[#1a1a1c] border-gray-800/60' : 'bg-white border-gray-200'} shadow-xl`}>
        <div className="prose dark:prose-invert max-w-none">
          <p>This is a placeholder for the Terms of Use. Please update this content with your legal agreements.</p>
        </div>
      </div>
    </div>
  );
};

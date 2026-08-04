import React from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { ASPECT_RATIO_CLASSES } from '../constants/chat';

export const ImageGenerationPlaceholder = ({ 
  dir, 
  aspectRatio = '1:1', 
  liveElapsed = 0, 
  style = 'Cinematic', 
  quality = 'HD',
  t,
  isFailed = false,
  errorMessage = '',
  onRetry,
  progress,
  statusLabel
}: { 
  dir: 'ltr' | 'rtl'; 
  aspectRatio?: string; 
  liveElapsed?: number; 
  style?: string;
  quality?: string;
  t: any;
  isFailed?: boolean;
  errorMessage?: string;
  onRetry?: () => void;
  progress?: number;
  statusLabel?: string;
}) => {
  const currentClass = ASPECT_RATIO_CLASSES[aspectRatio] || 'aspect-square max-w-[240px] sm:max-w-[260px]';

  const getAIStatusLabel = () => {
    if (statusLabel) return statusLabel;
    if (liveElapsed < 4) {
      return dir === 'rtl' 
        ? 'تحليل المطلب الفني وتجهيز الأنماط العصبية الدقيقة...' 
        : 'Analyzing artistic prompt & aligning neural style maps...';
    } else if (liveElapsed < 8) {
      return dir === 'rtl' 
        ? 'رسم تفاصيل الشكل والهيكل الهندسي وتوزيع الكتلة والضوء...' 
        : 'Synthesizing layout structure, composition geometry & volumetric lighting...';
    } else if (liveElapsed < 14) {
      return dir === 'rtl' 
        ? 'توليد البيكسلات الفائقة بدقة عالية وتنسيق التفاصيل البصرية...' 
        : 'Executing deep pixel matrix synthesis & forming high-fidelity textures...';
    } else {
      return dir === 'rtl' 
        ? 'تنقيح الألوان الجمالية واللمسات السينمائية المتقدمة وتأصيل النتيجة...' 
        : 'Refining stylistic color grading & preparing masterwork presentation...';
    }
  };

  return (
    <div className="w-full flex justify-start">
      <div className="flex flex-col gap-4 w-full my-4 items-start">
        <div 
          className={`relative w-full ${currentClass} rounded-xl border ${isFailed ? 'border-rose-500/20 shadow-[0_0_40px_rgba(244,63,94,0.05)]' : 'border-emerald-500/20 shadow-[0_0_40px_rgba(16,185,129,0.05)]'} bg-zinc-950/60 dark:bg-zinc-950 overflow-hidden transition-theme flex flex-col justify-between`}
        >
          <div className={`absolute inset-0 bg-[linear-gradient(rgba(${isFailed ? '244,63,94' : '16,185,129'},0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(${isFailed ? '244,63,94' : '16,185,129'},0.05)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none opacity-40 animate-pulse`} />

          <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full ${isFailed ? 'bg-rose-500/5' : 'bg-emerald-500/5'} blur-[50px] pointer-events-none`} />

          <motion.div 
            animate={{ y: ['0%', '100%', '0%'] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className={`absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-${isFailed ? 'rose' : 'emerald'}-500/45 to-transparent shadow-[0_0_12px_rgba(${isFailed ? '244,63,94' : '16,185,129'},0.6)] pointer-events-none`}
          />

          <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none overflow-hidden select-none">
            <svg className={`w-full h-full max-w-sm max-h-xs ${isFailed ? 'text-rose-500/10' : 'text-emerald-500/20'}`} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
              <motion.circle cx="100" cy="100" r="4" className={isFailed ? 'fill-rose-400/40' : 'fill-emerald-400 drop-shadow-[0_0_4px_rgba(16,185,129,0.6)]'} animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 2 }} />
              <motion.circle cx="40" cy="60" r="3" className={isFailed ? 'fill-rose-400/30' : 'fill-emerald-400'} animate={{ scale: [0.9, 1.2, 0.9] }} transition={{ repeat: Infinity, duration: 2.5 }} />
              <motion.circle cx="160" cy="60" r="3" className={isFailed ? 'fill-rose-400/30' : 'fill-emerald-400'} animate={{ scale: [1.1, 0.8, 1.1] }} transition={{ repeat: Infinity, duration: 1.8 }} />
              <motion.circle cx="70" cy="150" r="3" className={isFailed ? 'fill-rose-400/30' : 'fill-emerald-400'} animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 2.2 }} />
              <motion.circle cx="130" cy="150" r="3" className={isFailed ? 'fill-rose-400/30' : 'fill-emerald-400'} animate={{ scale: [0.8, 1.1, 0.8] }} transition={{ repeat: Infinity, duration: 2.7 }} />

              <motion.path d="M40 60 L100 100 M160 60 L100 100 M70 150 L100 100 M130 150 L100 100" stroke="currentColor" strokeWidth="0.8" strokeDasharray="4,4" animate={{ strokeDashoffset: [0, -20] }} transition={{ repeat: Infinity, duration: 5, ease: 'linear' }} />
              <motion.path d="M40 60 L160 60 L130 150 L70 150 Z" stroke="currentColor" strokeWidth="0.5" opacity="0.6" />
            </svg>
          </div>

          <div className={`p-3 w-full flex items-center justify-between bg-zinc-950/40 border-b ${isFailed ? 'border-rose-500/10' : 'border-emerald-500/10'} backdrop-blur-sm z-10`}>
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isFailed ? 'bg-rose-400' : 'bg-emerald-400'} opacity-75`} />
                <span className={`relative inline-flex rounded-full h-2 w-2 ${isFailed ? 'bg-rose-500' : 'bg-emerald-500'}`} />
              </span>
              <span className={`text-[9px] font-mono font-black uppercase ${isFailed ? 'text-rose-400' : 'text-emerald-400'} tracking-wider`}>
                {isFailed 
                  ? (dir === 'rtl' ? 'فشل النظام الفني' : 'AI ART ENGINE CRITICAL') 
                  : (dir === 'rtl' ? 'جاري التركيز البصري' : 'AI ART ENGINE LIVE')}
              </span>
            </div>
            <span className="text-[9px] font-mono text-gray-500 font-bold whitespace-nowrap">
              {quality} • {style} • {aspectRatio}
            </span>
          </div>

          {isFailed ? (
            <div className="flex flex-col items-center justify-center p-6 gap-3.5 select-none text-center z-10 flex-1">
              <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.15)] animate-bounce-slow">
                <AlertTriangle size={22} />
              </div>

              <div className="flex flex-col items-center max-w-[90%] gap-1">
                <span className="text-[11px] md:text-sm font-bold text-gray-200">
                  {dir === 'rtl' ? 'عذراً، تعذر إنشاء العمل الفني المطلوب' : 'Artwork synthesis encountered an issue'}
                </span>
                <span className="text-[9px] font-medium text-rose-400/80 bg-rose-950/30 border border-rose-500/10 px-2.5 py-1 rounded-[4px] font-mono select-text text-center break-words max-w-full">
                  {errorMessage || (dir === 'rtl' ? 'خطأ غير معروف في خادم التوليد.' : 'Unspecified generator fault occurred.')}
                </span>
              </div>

              {onRetry && (
                <button 
                  onClick={onRetry}
                  className="group relative flex items-center gap-1.5 px-4.5 py-1.5 text-[10px] md:text-xs font-semibold text-slate-100 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 hover:border-rose-400/55 rounded-[4px] transition-theme shadow-[0_0_15px_rgba(244,63,94,0.1)] focus:outline-none cursor-pointer pointer-events-auto active:scale-95"
                >
                  <RefreshCw size={12} className="text-rose-400 group-hover:rotate-180 transition-transform duration-500" />
                  <span>{dir === 'rtl' ? 'إعادة محاولة التوليد' : 'Retry Image Generation'}</span>
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-6 gap-3 select-none text-center z-10 flex-1">
              <div className="relative flex items-center justify-center">
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                  className="w-16 h-16 rounded-full border border-dashed border-emerald-500/40 flex items-center justify-center"
                />
                <motion.div 
                  animate={{ rotate: -360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                  className="absolute w-12 h-12 rounded-full border border-t-emerald-500 border-r-transparent border-b-emerald-500/20 border-l-transparent"
                />
                <div className="absolute text-[10px] font-mono font-black text-emerald-400 drop-shadow-[0_0_6px_rgba(16,185,129,0.5)]">
                  {progress !== undefined ? `${progress}%` : `${liveElapsed.toFixed(1)}s`}
                </div>
              </div>

              <div className="flex flex-col items-center max-w-[85%] mt-1">
                <span className="text-[10px] md:text-[11px] font-bold text-gray-200 uppercase tracking-wide leading-relaxed animate-pulse">
                  {getAIStatusLabel()}
                </span>
                <span className="text-[8px] font-black text-emerald-500/60 uppercase tracking-widest mt-0.5">
                  {dir === 'rtl' ? 'خوارزميات التوليف الفني من بريليكستا' : 'PERPLEXTA HIGH-FIDELITY ENGINE'}
                </span>
              </div>
            </div>
          )}

          <div className={`p-2.5 w-full bg-zinc-950/50 border-t ${isFailed ? 'border-rose-500/5' : 'border-emerald-500/5'} backdrop-blur-sm z-10 flex items-center justify-between text-[8px] font-mono text-gray-500`}>
            <span>{isFailed ? 'CORES: DISENGAGED' : 'CORES: ALLOCATED'}</span>
            <span>{isFailed ? 'STATUS: HALTED 500' : `LATENCY: ${(liveElapsed * 1000).toFixed(0)}MS`}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

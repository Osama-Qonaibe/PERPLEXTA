import React, { useState, useMemo, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  MessageSquare, 
  Code, 
  Search, 
  Image as ImageIcon, 
  Video, 
  Music, 
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppContext } from '../context/AppContext';

interface ToolItem {
  id: string;
  title: string;
  desc: string;
  imageUrl: string;
  icon: React.ReactNode;
}

const GalleryCardImage: React.FC<{ toolId: string; title: string; imageUrl: string }> = ({ toolId, title, imageUrl }) => {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const renderFallback = () => {
    switch (toolId) {
      case "image":
        return (
          <div className="absolute inset-0 bg-gradient-to-br from-[#0c120f] to-[#121a16] flex flex-col items-center justify-center overflow-hidden">
            <div className="absolute inset-0 opacity-[0.06] bg-[linear-gradient(to_right,#334155_1px,transparent_1px),linear-gradient(to_bottom,#334155_1px,transparent_1px)] bg-[size:10px_10px]" />
            <svg className="w-10 h-10 text-accent/80 " viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="15" y="15" width="70" height="70" rx="4" stroke="currentColor" strokeWidth="1.5" className="opacity-40" />
              <circle cx="50" cy="50" r="16" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2" />
              <path d="M22 70L42 48L55 61L78 36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="32" cy="32" r="3" fill="currentColor" className="text-accent" />
            </svg>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.12)_0%,transparent_70%)] animate-pulse" />
          </div>
        );
      case "video":
        return (
          <div className="absolute inset-0 bg-gradient-to-br from-[#0c1012] to-[#12161a] flex flex-col items-center justify-center overflow-hidden">
            <div className="absolute inset-0 opacity-[0.06] bg-[linear-gradient(to_right,#334155_1px,transparent_1px),linear-gradient(to_bottom,#334155_1px,transparent_1px)] bg-[size:10px_10px]" />
            <svg className="w-10 h-10 text-accent/80 " viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="15" y="22" width="70" height="56" rx="4" stroke="currentColor" strokeWidth="1.5" className="opacity-40" />
              <circle cx="35" cy="42" r="6" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="65" cy="42" r="6" stroke="currentColor" strokeWidth="1.5" />
              <polygon points="45,46 45,62 61,54" fill="currentColor" className="text-accent" />
              <path d="M15 34H85" stroke="currentColor" strokeWidth="1" className="opacity-30" />
              <path d="M15 62H85" stroke="currentColor" strokeWidth="1" className="opacity-30" />
            </svg>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.12)_0%,transparent_70%)] animate-pulse" />
          </div>
        );
      case "code":
        return (
          <div className="absolute inset-0 bg-gradient-to-br from-[#0e0e11] to-[#15151a] flex flex-col items-center justify-center overflow-hidden">
            <div className="absolute inset-0 opacity-[0.06] bg-[linear-gradient(to_right,#334155_1px,transparent_1px),linear-gradient(to_bottom,#334155_1px,transparent_1px)] bg-[size:10px_10px]" />
            <svg className="w-10 h-10 text-accent/80 " viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="15" y="18" width="70" height="64" rx="4" stroke="currentColor" strokeWidth="1.5" className="opacity-40" />
              <path d="M15 32H85" stroke="currentColor" strokeWidth="1.5" className="opacity-30" />
              <circle cx="25" cy="25" r="2" fill="currentColor" className="opacity-50" />
              <circle cx="33" cy="25" r="2" fill="currentColor" className="opacity-50" />
              <circle cx="41" cy="25" r="2" fill="currentColor" className="opacity-50" />
              <path d="M36 44L28 52L36 60" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M64 44L72 52L64 60" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="53" y1="44" x2="47" y2="60" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.12)_0%,transparent_70%)] animate-pulse" />
          </div>
        );
      case "canvas":
        return (
          <div className="absolute inset-0 bg-gradient-to-br from-[#100d14] to-[#17141f] flex flex-col items-center justify-center overflow-hidden">
            <div className="absolute inset-0 opacity-[0.06] bg-[linear-gradient(to_right,#334155_1px,transparent_1px),linear-gradient(to_bottom,#334155_1px,transparent_1px)] bg-[size:10px_10px]" />
            <svg className="w-10 h-10 text-accent/80" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="15" y="15" width="70" height="70" rx="4" stroke="currentColor" strokeWidth="1.5" className="opacity-40" />
              <line x1="25" y1="50" x2="25" y2="50" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
              <line x1="33" y1="38" x2="33" y2="62" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
              <line x1="41" y1="24" x2="41" y2="76" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
              <line x1="50" y1="32" x2="50" y2="68" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
              <line x1="58" y1="20" x2="58" y2="80" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
              <line x1="67" y1="40" x2="67" y2="60" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
              <line x1="75" y1="50" x2="75" y2="50" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.12)_0%,transparent_70%)] animate-pulse" />
          </div>
        );
      default:
        return (
          <div className="absolute inset-0 bg-gradient-to-br from-[#0c1315] to-[#12191c] flex flex-col items-center justify-center overflow-hidden">
            <div className="absolute inset-0 opacity-[0.06] bg-[linear-gradient(to_right,#334155_1px,transparent_1px),linear-gradient(to_bottom,#334155_1px,transparent_1px)] bg-[size:10px_10px]" />
            <svg className="w-10 h-10 text-accent/80" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="15" y="15" width="70" height="70" rx="4" stroke="currentColor" strokeWidth="1.5" className="opacity-40" />
              <circle cx="45" cy="45" r="14" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 1" />
              <line x1="55" y1="55" x2="75" y2="75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <circle cx="38" cy="40" r="2" fill="currentColor" className="text-accent" />
              <circle cx="52" cy="48" r="2" fill="currentColor" className="text-accent" />
              <line x1="38" y1="40" x2="52" y2="48" stroke="currentColor" strokeWidth="1" className="opacity-55" />
            </svg>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.12)_0%,transparent_70%)] animate-pulse" />
          </div>
        );
    }
  };

  return (
    <div className="relative w-full h-full">
      {!hasError ? (
        <img
          src={imageUrl}
          alt={title}
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          className={`w-full h-full object-cover transition-theme ${isLoaded ? 'opacity-85 group-hover:opacity-100 group-hover:scale-105' : 'opacity-0'} pointer-events-none`}
          referrerPolicy="no-referrer"
        />
      ) : null}
      {(hasError || !isLoaded) && renderFallback()}
    </div>
  );
};

export const ToolsGallerySlider: React.FC = () => {
  const { language, dir } = useAppContext();
  const isAr = language === 'ar';

  const tools: ToolItem[] = useMemo(() => [
    {
      id: "image",
      title: isAr ? "صناعة صور فائقة الدقة" : "Stunning Image Generation",
      desc: isAr
        ? "شاهد خيالك يتجسد في صورة فوتوغرافية فائقة الجمال وبأدق التفاصيل والنسب البصرية الإبداعية."
        : "Watch your imagination materialize into highly cinematic photos with supreme precision.",
      imageUrl: "https://images.unsplash.com/photo-1561557944-6e7860d1a7eb?auto=format&fit=crop&q=80&w=400",
      icon: <ImageIcon size={18} />
    },
    {
      id: "video",
      title: isAr ? "توليد فيديو سينمائي" : "Cinematic Video Generation",
      desc: isAr
        ? "حوّل أفكارك إلى مشهد سينمائي احترافي متحرك بدقة فائقة، إخراج ذكي، وحركة طبيعية للعناصر."
        : "Transform your ideas into majestic cinematic videos with smooth motion and advanced physics.",
      imageUrl: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&q=80&w=400",
      icon: <Video size={18} />
    },
    {
      id: "code",
      title: isAr ? "تحليل وتوليد الأكواد" : "Expert Code Scaffolding",
      desc: isAr
        ? "بناء وتدقيق الأنظمة وهياكل الكود المعقدة لضمان أداء برمجيات متين، آمن، وخالٍ تماماً من الثغرات."
        : "Architect full software systems, debug codebases, and optimize files with maximum accuracy.",
      imageUrl: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80&w=400",
      icon: <Code size={18} />
    },
    {
      id: "canvas",
      title: isAr ? "استوديو هندسة الصوت" : "Advanced Audio Production",
      desc: isAr
        ? "هندسة وتحرير الملفات الصوتية باحترافية وتوليد ألحان ومؤثرات موسيقية مذهلة بدقة نبرة طبيعية."
        : "Synthesize high-fidelity melodies, edit soundtracks, and model voice files with supreme control.",
      imageUrl: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&q=80&w=400",
      icon: <Music size={18} />
    },
    {
      id: "perplexta_analysis",
      title: isAr ? "البحث والتحليل الإدراكي" : "Perplexta Deep Analysis",
      desc: isAr
        ? "تنقيب الويب اللحظي واستخراج المعارف الرقمية والمؤشرات الإحصائية الموثوقة وصياغتها استراتيجياً."
        : "Perform deep research, pull live web data, and synthesize massive concepts into technical summaries.",
      imageUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=400",
      icon: <Search size={18} />
    }
  ], [isAr]);

  const [startIndex, setStartIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setStartIndex((prev) => (prev + 1) % tools.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [tools.length]);

  const handlePrev = () => {
    setStartIndex((prev) => (prev - 1 + tools.length) % tools.length);
  };

  const handleNext = () => {
    setStartIndex((prev) => (prev + 1) % tools.length);
  };

  const visibleTools = useMemo(() => {
    const list: ToolItem[] = [];
    for (let i = 0; i < 3; i++) {
      const index = (startIndex + i) % tools.length;
      list.push(tools[index]);
    }
    return list;
  }, [startIndex, tools]);

  return (
    <div className="hidden sm:flex w-full max-w-4xl mx-auto mt-6 px-1 select-none flex-col items-center">
      {/* Header title */}
      <div className="flex items-center gap-1.5 mb-5 opacity-90 justify-center">
        <Sparkles size={14} className="text-accent" />
        <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-accent font-sans">
          {isAr ? "قدرات المنصة والأدوات الاحترافية المتاحة" : "Available Intelligent Platform Capabilities"}
        </span>
      </div>

      {/* Main slider row - Fixed stable height structure with responsive height */}
      <div className="relative w-full flex items-center justify-between gap-4 h-[210px] sm:h-[280px]">
        
        {/* Left Arrow Button */}
        <button
          onClick={handlePrev}
          type="button"
          className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-[4px] border border-transparent bg-transparent text-gray-400 dark:text-gray-500 transition-theme hover:bg-gray-50 dark:hover:bg-gray-800/80 hover:text-accent group cursor-pointer z-10"
        >
          {dir === 'rtl' ? (
            <ChevronRight size={20} className="transition-transform group-hover:scale-110 text-gray-400 group-hover:text-accent" />
          ) : (
            <ChevronLeft size={20} className="transition-transform group-hover:scale-110 text-gray-400 group-hover:text-accent" />
          )}
        </button>

        {/* Sliding Cards Area */}
        <div className="flex-1 h-full overflow-hidden">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-5 h-full items-center">
            <AnimatePresence mode="popLayout" initial={false}>
              {visibleTools.map((tool, index) => {
                let responsiveClass = "w-full h-full";
                if (index === 1) responsiveClass += " hidden sm:block";
                if (index === 2) responsiveClass += " hidden md:block";

                return (
                  <motion.div
                    key={tool.id}
                    layoutId={`gallery-card-${tool.id}`}
                    initial={{ opacity: 0, x: dir === 'rtl' ? -30 : 30, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: dir === 'rtl' ? 30 : -30, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 300, damping: 28 }}
                    className={`${responsiveClass} p-2.5 sm:p-4 rounded-[4px] border border-gray-200/50 dark:border-gray-800/60 bg-white/40 dark:bg-[#131315]/40 backdrop-blur-sm shadow-sm hover:border-accent/25 transition-theme group flex flex-col justify-between`}
                  >
                    <div className="flex flex-col gap-2 sm:gap-3 h-full">
                      {/* Tool Header Icon + Title */}
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-[4px] bg-accent/15 border border-accent/25 flex items-center justify-center text-accent group-hover:bg-accent/25 transition-theme">
                          {tool.icon}
                        </div>
                        <h4 className="text-xs sm:text-sm font-black text-gray-850 dark:text-gray-100 group-hover:text-accent transition-colors duration-300 line-clamp-1 font-sans">
                          {tool.title}
                        </h4>
                      </div>

                      {/* Visual Image Area */}
                      <div className="relative w-full aspect-[24/9] sm:aspect-[16/10] rounded-[4px] overflow-hidden border border-gray-200/40 dark:border-gray-800/50 bg-black/10 dark:bg-black/25">
                        <GalleryCardImage
                          toolId={tool.id}
                          title={tool.title}
                          imageUrl={tool.imageUrl}
                        />
                        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                      </div>

                      {/* Short Description */}
                      <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 font-semibold leading-relaxed tracking-wide line-clamp-2 sm:line-clamp-3 font-sans mt-0.5">
                        {tool.desc}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        {/* Right Arrow Button */}
        <button
          onClick={handleNext}
          type="button"
          className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-[4px] border border-transparent bg-transparent text-gray-400 dark:text-gray-500 transition-theme hover:bg-gray-50 dark:hover:bg-gray-800/80 hover:text-accent group cursor-pointer z-10"
        >
          {dir === 'rtl' ? (
            <ChevronLeft size={20} className="transition-transform group-hover:scale-110 text-gray-400 group-hover:text-accent" />
          ) : (
            <ChevronRight size={20} className="transition-transform group-hover:scale-110 text-gray-400 group-hover:text-accent" />
          )}
        </button>

      </div>

      {/* Slide Navigation Indicators (Dots) */}
      <div className="flex items-center gap-1.5 mt-4">
        {tools.map((_, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setStartIndex(idx)}
            className={`transition-theme rounded-full cursor-pointer ${
              idx === startIndex
                ? 'w-4 h-1.5 bg-accent shadow-[0_0_8px_rgba(16,185,129,0.7)]'
                : 'w-1.5 h-1.5 bg-gray-300 dark:bg-gray-700 hover:bg-accent/60'
            }`}
            title={`Slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

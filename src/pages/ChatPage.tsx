import React, { useState, useRef, useEffect, useLayoutEffect, useMemo } from 'react';
import { useVideoPlayback } from '../hooks/useVideoPlayback';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-markup';
import { ArrowDown, MessageSquare, Music, Play, Pause, Plus, Mic, MicOff, Send, LayoutGrid, Zap, Code, FileText, Image as ImageIcon, Sparkles, Brain, Video, Volume2, VolumeX, Search, BookOpen, Square, AlertTriangle, AlertCircle, Paperclip, Copy, Download, Scale, Megaphone, Maximize2, ThumbsUp, ThumbsDown, Share2, RefreshCw, MoreHorizontal, Bookmark, Flag, Trash2, Check, Pencil, X, Pin, PinOff, FileDown, FileCode, FolderPlus, Loader2, ExternalLink, Settings, Database, GitFork, Sliders, ZoomIn, ZoomOut } from 'lucide-react';
import { toast } from 'sonner';
import { useAppContext } from '../context/AppContext';
import { useVideoResource } from '../context/VideoResourceContext';
import { trackGAEvent } from '../components/GoogleAnalytics';
import { getCSPNonce, applyNonce } from '../utils/csp';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { encrypt } from '../utils/browserCrypto';
import { motion, AnimatePresence } from 'motion/react';
import { perplextaPageTransition } from '../constants/motions';
import { jsPDF } from 'jspdf';
import { toPng } from 'html-to-image';
import { TypewriterMotive } from '../components/TypewriterMotive';
import { ToolsGallerySlider } from '../components/ToolsGallerySlider';
import { generateProceduralTrack } from '../utils/audioGenerator';

const ASPECT_RATIO_CLASSES: { [key: string]: string } = {
  '1:1': 'aspect-square max-w-[240px] sm:max-w-[260px]',
  '4:3': 'aspect-[4/3] max-w-[280px] sm:max-w-[300px]',
  '3:2': 'aspect-[3/2] max-w-[290px] sm:max-w-[310px]',
  '16:9': 'aspect-[16/9] max-w-[320px] sm:max-w-[340px]',
  '9:16': 'aspect-[9/16] max-w-[185px] max-h-[320px] sm:max-h-[340px]'
};

const ResponseSkeleton = ({ dir }: { dir: 'ltr' | 'rtl' }) => (
  <div className="flex flex-col gap-3 w-full animate-pulse transition-theme">
    <div className="flex items-center gap-2">
      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/40" />
      <div className="h-1.5 w-32 bg-[var(--bg-overlay)] rounded-full" />
    </div>
    <div className="space-y-3">
      <div className="h-2 w-full bg-[var(--bg-overlay)] rounded-full" />
      <div className="h-2 w-[85%] bg-[var(--bg-overlay)] rounded-full" />
      <div className="h-2 w-[60%] bg-[var(--bg-overlay)] rounded-full" />
    </div>
  </div>
);

const ImageGenerationPlaceholder = ({ 
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
          className={`relative w-full ${currentClass} rounded-xl border ${isFailed ? 'border-rose-500/20 shadow-[0_0_40px_rgba(244,63,94,0.05)]' : 'border-emerald-500/20 shadow-[0_0_40px_rgba(16,185,129,0.05)]'} bg-zinc-950/60 dark:bg-zinc-950 overflow-hidden transition-all duration-500 flex flex-col justify-between`}
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
                  className="group relative flex items-center gap-1.5 px-4.5 py-1.5 text-[10px] md:text-xs font-semibold text-slate-100 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 hover:border-rose-400/55 rounded-[4px] transition-all duration-300 shadow-[0_0_15px_rgba(244,63,94,0.1)] focus:outline-none cursor-pointer pointer-events-auto active:scale-95"
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

const ShareableImageOutput = ({ src, dir, alt, ...props }: { src?: string; dir?: string; alt?: string; [key: string]: any }) => {
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied' | 'sharing'>('idle');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  const srcVal = src || '';
  let imgAspect = '1:1';
  if (srcVal.includes('#aspect=')) {
    imgAspect = srcVal.split('#aspect=')[1] || '1:1';
  }

  const currentRatioClass = ASPECT_RATIO_CLASSES[imgAspect] || 'aspect-square max-w-[240px] sm:max-w-[260px]';

  const handleDownload = async () => {
    if (!srcVal) return;
    try {
      const cleanUrl = srcVal.split('#')[0];
      const cleanResponse = await fetch(cleanUrl);
      const cleanBlob = await cleanResponse.blob();
      const cleanObjectUrl = window.URL.createObjectURL(cleanBlob);
      const link = document.createElement('a');
      link.href = cleanObjectUrl;
      link.download = `Perplexta_Gen_${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(cleanObjectUrl);
    } catch (err) {
      const link = document.createElement('a');
      link.href = srcVal;
      link.download = `Perplexta_Gen_${Date.now()}.png`;
      link.target = '_blank';
      link.click();
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setShareStatus('copied');
      setTimeout(() => setShareStatus('idle'), 2500);
    } catch (err) {
    }
  };

  const handleShare = async () => {
    if (!srcVal) return;
    const cleanUrl = srcVal.split('#')[0];

    if (navigator.share) {
      try {
        setShareStatus('sharing');
        await navigator.share({
          title: 'Perplexta AI Art',
          text: dir === 'rtl' ? 'شاهد هذا العمل الفني الرائع المولد بواسطة منصة بيربليكستا للذكاء الاصطناعي!' : 'Check out this stunning artwork generated with Perplexta AI!',
          url: cleanUrl,
        });
        setShareStatus('idle');
      } catch (err) {
        setShareStatus('idle');
        if (err && (err as any).name !== 'AbortError') {
          copyToClipboard(cleanUrl);
        }
      }
    } else {
      copyToClipboard(cleanUrl);
    }
  };

  const resetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setIsDragging(false);
  };

  const toggleZoom = (e: React.MouseEvent<HTMLImageElement>) => {
    e.stopPropagation();
    if (scale > 1) {
      resetZoom();
    } else {
      setScale(2.5);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || scale <= 1) return;
    e.preventDefault();
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (!isPreviewOpen) return;
    resetZoom();
    setIsImageLoaded(false);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsPreviewOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPreviewOpen]);

  return (
    <>
      <div className="w-full flex my-4 justify-start">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className={`relative group overflow-hidden rounded-xl border border-[var(--border)] shadow-md transition-all duration-500 ease-out hover:shadow-[0_0_35px_rgba(16,185,129,0.22)] hover:border-emerald-500/40 w-full ${currentRatioClass}`}
        >
          <img 
            src={srcVal}
            alt={alt || "Generated Output"}
            className="block w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03] cursor-pointer" 
            referrerPolicy="no-referrer" 
            loading="lazy"
            onClick={() => setIsPreviewOpen(true)}
          />
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-x-0 bottom-0 p-3.5 bg-gradient-to-t from-black/85 via-black/40 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-300 flex justify-center items-center backdrop-blur-[2px] z-10"
          >
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsPreviewOpen(true)}
                className="w-8 h-8 rounded-[4px] bg-zinc-900 border border-zinc-805 text-gray-200 hover:text-emerald-500 hover:border-emerald-500/35 hover:bg-zinc-800 transition-all duration-300 flex items-center justify-center cursor-pointer active:scale-95 shadow-md"
                title={dir === 'rtl' ? 'معاينة' : 'Preview'}
              >
                <Maximize2 size={13} />
              </button>
              <button 
                onClick={handleShare}
                className={`w-8 h-8 rounded-[4px] border flex items-center justify-center cursor-pointer transition-all duration-300 shadow-md active:scale-95 ${
                  shareStatus === 'copied' 
                    ? 'bg-emerald-500/25 text-emerald-400 border-emerald-500/45 hover:bg-emerald-500/35' 
                    : 'bg-zinc-900 border border-zinc-805 hover:text-emerald-500 hover:border-emerald-500/35 hover:bg-zinc-800 text-gray-200'
                }`}
                title={dir === 'rtl' ? 'مشاركة' : 'Share'}
              >
                <Share2 size={13} className={shareStatus === 'sharing' ? 'animate-pulse text-emerald-400' : ''} />
              </button>
              <button 
                onClick={handleDownload}
                className="w-8 h-8 rounded-[4px] bg-zinc-900 border border-zinc-805 text-gray-200 hover:text-emerald-500 hover:border-emerald-500/35 hover:bg-zinc-800 transition-all duration-300 flex items-center justify-center cursor-pointer active:scale-95 shadow-md"
                title={dir === 'rtl' ? 'تنزيل' : 'Download'}
              >
                <Download size={13} />
              </button>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {createPortal(
        <AnimatePresence>
          {isPreviewOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-neutral-955/98 backdrop-blur-2xl z-[999999] flex flex-col items-center justify-center select-none"
              onClick={() => setIsPreviewOpen(false)}
            >
              <div 
                className="absolute top-0 inset-x-0 h-20 bg-gradient-to-b from-black/90 via-black/45 to-transparent flex items-center justify-between px-6 z-[1000]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] font-bold text-emerald-400/90 tracking-widest uppercase font-mono">
                    {dir === 'rtl' ? 'مستكشف الدقة الفائقة من بريليكستا' : 'PERPLEXTA HIGH-FIDELITY PREVIEW'}
                  </span>
                  <span className="text-[10px] text-gray-400 font-medium font-sans">
                    {dir === 'rtl' ? 'توليف آمن ومحمي بالكامل لقواعد التصميم الذكية' : 'Strictly audited smart synthesis artifact'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDownload}
                    className="w-10 h-10 rounded-[4px] bg-zinc-900/80 border border-zinc-800 text-gray-200 hover:text-emerald-400 hover:border-emerald-500/40 hover:bg-zinc-800/90 transition-all duration-300 flex items-center justify-center cursor-pointer shadow-lg active:scale-95"
                    title={dir === 'rtl' ? 'تنزيل' : 'Download'}
                  >
                    <Download size={15} />
                  </button>
                  <button
                    onClick={handleShare}
                    className="w-10 h-10 rounded-[4px] bg-zinc-900/80 border border-zinc-800 text-gray-200 hover:text-emerald-400 hover:border-emerald-500/40 hover:bg-zinc-800/90 transition-all duration-300 flex items-center justify-center cursor-pointer shadow-lg active:scale-95"
                    title={dir === 'rtl' ? 'مشاركة' : 'Share'}
                  >
                    <Share2 size={15} />
                  </button>
                  <button
                    onClick={() => setIsPreviewOpen(false)}
                    className="w-10 h-10 rounded-[4px] bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 hover:border-rose-500/45 transition-all duration-300 flex items-center justify-center cursor-pointer shadow-lg active:scale-95"
                    title={dir === 'rtl' ? 'إغلاق' : 'Close'}
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              <div 
                className="w-full h-full flex items-center justify-center overflow-hidden p-6 relative cursor-zoom-out"
                onClick={() => setIsPreviewOpen(false)}
              >
                {!isImageLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center z-10 bg-zinc-950/20 backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                      <span className="text-[10px] font-mono text-emerald-400/80 tracking-wider">
                        {dir === 'rtl' ? 'تجهيز بكسلات الإطار الفائقة...' : 'INGESTING ULTRA-RES CANVAS...'}
                      </span>
                    </div>
                  </div>
                )}

                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: isImageLoaded ? 1 : 0 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  transition={{ type: 'spring', damping: 28, stiffness: 220 }}
                  className="relative max-w-[90vw] max-h-[80vh] flex items-center justify-center transition-shadow duration-500 bg-black/40 rounded-[4px]"
                  style={{
                    boxShadow: '0 25px 70px -10px rgba(0, 0, 0, 0.85), 0 0 50px rgba(16,185,129,0.06)'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <img
                    src={srcVal}
                    alt={alt || "Output Preview"}
                    onLoad={() => setIsImageLoaded(true)}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onClick={toggleZoom}
                    className="max-w-[90vw] max-h-[80vh] rounded-[4px] object-contain block select-none border border-zinc-800/80"
                    style={{
                      transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                      cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in',
                      transition: isDragging ? 'none' : 'transform 0.1s ease-out'
                    }}
                    draggable={false}
                  />
                </motion.div>
              </div>

              <div 
                className="absolute bottom-8 bg-zinc-900/80 backdrop-blur-md border border-zinc-800 shadow-[0_15px_40px_rgba(0,0,0,0.5)] z-[1000] px-4 py-2.5 rounded-[4px] flex items-center gap-4 text-xs font-mono select-none"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-1.5 border-r border-zinc-700/60 pe-3 text-gray-400">
                  <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold">{dir === 'rtl' ? 'التقريب' : 'ZOOM'}:</span>
                  <span className="text-[11px] font-bold text-gray-200">{(scale * 100).toFixed(0)}%</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setScale(prev => Math.max(prev - 0.5, 1));
                      if (scale <= 1.5) setPosition({ x: 0, y: 0 });
                    }}
                    disabled={scale <= 1}
                    className="w-7 h-7 rounded-[4px] bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/60 transition-colors flex items-center justify-center text-gray-300 hover:text-white disabled:opacity-45 disabled:pointer-events-none active:scale-95"
                    title={dir === 'rtl' ? 'تصغير' : 'Zoom Out'}
                  >
                    <ZoomOut size={13} />
                  </button>
                  <button
                    onClick={resetZoom}
                    className="px-2 h-7 rounded-[4px] bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/60 transition-colors flex items-center justify-center text-[9px] uppercase font-bold text-emerald-400 hover:text-emerald-300 active:scale-95"
                    title={dir === 'rtl' ? 'إعادة ضبط' : 'Reset View'}
                  >
                    {dir === 'rtl' ? 'ضبط' : 'Reset'}
                  </button>
                  <button
                    onClick={() => setScale(prev => Math.min(prev + 0.5, 4))}
                    disabled={scale >= 4}
                    className="w-7 h-7 rounded-[4px] bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/60 transition-colors flex items-center justify-center text-gray-300 hover:text-white disabled:opacity-45 disabled:pointer-events-none active:scale-95"
                    title={dir === 'rtl' ? 'تكبير' : 'Zoom In'}
                  >
                    <ZoomIn size={13} />
                  </button>
                </div>
                {scale > 1 && (
                  <div className="hidden sm:flex text-[9px] text-zinc-400 border-l border-zinc-700/60 ps-3 items-center gap-1.5 animate-pulse">
                    <span>💡 {dir === 'rtl' ? 'اسحب للتنقل داخل الصورة' : 'Drag inside frame to pan details'}</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};

const VideoGenerationPlaceholder = ({ 
  dir, 
  aspectRatio = '16:9', 
  liveElapsed = 0, 
  resolution = '720p', 
  duration = 5,
  t,
  isFailed = false,
  errorMessage = '',
  onRetry,
  progressData = null
}: { 
  dir: 'ltr' | 'rtl'; 
  aspectRatio?: string; 
  liveElapsed?: number; 
  resolution?: string;
  duration?: number;
  t: any;
  isFailed?: boolean;
  errorMessage?: string;
  onRetry?: () => void;
  progressData?: {
    progress: number;
    renderedFrames: number;
    totalFrames: number;
    phase: string;
    phase_ar: string;
    fps?: number;
    currentStep?: number;
    totalSteps?: number;
  } | null;
}) => {
  const currentClass = ASPECT_RATIO_CLASSES[aspectRatio] || 'aspect-[16/9] max-w-[320px] sm:max-w-[340px]';

  const progressValue = isFailed 
    ? (progressData?.progress || Math.min(99, Math.round(liveElapsed * 4.5)))
    : (progressData ? progressData.progress : Math.min(99, Math.round(liveElapsed * 4.5)));

  const getAIStatusLabel = () => {
    if (isFailed) {
      return dir === 'rtl' ? 'تم إيقاف الإنتاج بسبب خطأ' : 'Synthesis halted due to error';
    }
    if (progressData) {
      return dir === 'rtl' ? progressData.phase_ar : progressData.phase;
    }
    if (liveElapsed < 4) {
      return dir === 'rtl' 
        ? 'بناء الخلايا الشبكية وتهيئة مصفوفة الفيديو...' 
        : 'Initializing neural grid & allocating keyframe matrices...';
    } else if (liveElapsed < 8) {
      return dir === 'rtl' 
        ? 'حساب وتوليد الإطارات الوسيطة وتتبع تسلسل الحركة...' 
        : 'Computing flow motion vectors & rendering temporal vectors...';
    } else if (liveElapsed < 14) {
      return dir === 'rtl' 
        ? 'تركيب بيكسلات الصور الحركية ودمج القناتين الفائقتين...' 
        : 'Executing latent frame synthesis & polishing hyper-resolution...';
    } else {
      return dir === 'rtl' 
        ? 'تنقيح المشاهد النهائية وضبط المؤثرات السينمائية الصورية...' 
        : 'Finalizing cosmetic filters & structuring master sequence...';
    }
  };

  return (
    <div className="w-full flex justify-start">
      <div className="flex flex-col gap-3.5 w-full my-4 items-start">
        <div 
          className={`relative w-full ${currentClass} rounded-xl border ${isFailed ? 'border-rose-500/20 shadow-[0_0_40px_rgba(244,63,94,0.05)]' : 'border-emerald-500/20 shadow-[0_0_40px_rgba(16,185,129,0.05)]'} bg-zinc-950/60 dark:bg-zinc-950 overflow-hidden transition-all duration-500 flex flex-col justify-between`}
        >
          <div className={`absolute inset-0 bg-[linear-gradient(rgba(${isFailed ? '244,63,94' : '16,185,129'},0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(${isFailed ? '244,63,94' : '16,185,129'},0.05)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none opacity-20`} />

          <div className={`p-3 w-full flex items-center justify-between bg-zinc-950/40 border-b ${isFailed ? 'border-rose-500/10' : 'border-emerald-500/10'} backdrop-blur-sm z-10`}>
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                {!isFailed && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${isFailed ? 'bg-rose-500' : 'bg-emerald-500'}`} />
              </span>
              <span className={`text-[9px] font-mono font-black uppercase ${isFailed ? 'text-rose-400' : 'text-emerald-400'} tracking-wider`}>
                {isFailed 
                  ? (dir === 'rtl' ? 'فشل إنتاج الفيديو' : 'VIDEO SYNTHESIS CRITICAL') 
                  : (dir === 'rtl' ? 'جاري بناء التدفق البصري' : 'AI VIDEO STREAM ACTIVE')}
              </span>
            </div>
            <span className="text-[9px] font-mono text-gray-400 font-bold whitespace-nowrap">
              {resolution} • {duration}s • {aspectRatio}
            </span>
          </div>

          <div className="flex flex-col items-center justify-center p-6 gap-4 select-none text-center z-10 flex-1 w-full">
            {isFailed ? (
              <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.15)] mb-1">
                <AlertTriangle size={22} />
              </div>
            ) : (
              <div className="relative flex items-center justify-center w-12 h-12">
                <motion.div 
                  animate={{ scale: [0.95, 1.05, 0.95], opacity: [0.5, 0.9, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-10 h-10 rounded-full border border-emerald-500/30 flex items-center justify-center"
                />
                <div className="absolute text-[10px] font-mono font-bold text-emerald-400">
                  {liveElapsed.toFixed(0)}s
                </div>
              </div>
            )}

            <div className="w-full max-w-[280px] flex flex-col gap-2">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className={`font-black tracking-tight ${isFailed ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {progressValue}%
                </span>
                <span className="text-gray-400 max-w-[200px] truncate text-right">
                  {getAIStatusLabel()}
                </span>
              </div>

              <div className={`h-1.5 w-full ${isFailed ? 'bg-rose-950/40 border-rose-900/30' : 'bg-zinc-900 border-zinc-800'} rounded-full overflow-hidden border p-0.5`}>
                <motion.div 
                  className={`h-full rounded-full ${isFailed ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]'}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${progressValue}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </div>
            </div>

            {isFailed && (
              <div className="flex flex-col items-center gap-2 max-w-[90%]">
                <span className="text-[10px] text-rose-400 font-mono bg-rose-950/20 border border-rose-500/10 px-2 py-0.5 rounded-[4px] break-words text-center">
                  {errorMessage || (dir === 'rtl' ? 'حدث خطأ غير محدد أثناء المعالجة.' : 'Unspecified frame generation fault.')}
                </span>
                {onRetry && (
                  <button 
                    onClick={onRetry}
                    aria-label={dir === 'rtl' ? 'إعادة محاولة التوليف' : 'Retry Video Generation'}
                    className="group flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold text-slate-100 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 hover:border-rose-400/50 rounded-[4px] transition-all duration-300 shadow-[0_0_10px_rgba(244,63,94,0.1)] cursor-pointer"
                  >
                    <RefreshCw size={10} className="text-rose-400 group-hover:rotate-180 transition-transform duration-500" />
                    <span>{dir === 'rtl' ? 'إعادة محاولة التوليف' : 'Retry Video Generation'}</span>
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="p-2.5 w-full bg-zinc-950/50 border-t border-zinc-900/40 backdrop-blur-sm z-10 flex items-center justify-between text-[8px] font-mono text-gray-500">
            <span>{isFailed ? 'STATE: HALTED' : 'PROCESS: SYNCHRONIZED'}</span>
            <span>{isFailed ? 'FAIL_CODE: 0x2A4' : `TIME_ELAPSED: ${(liveElapsed * 1000).toFixed(0)}MS`}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const UnifiedVideoMessageWidget = ({
  msg,
  idx,
  messages,
  dir,
  videoSettings,
  liveElapsed,
  isGenerating,
  t,
  onRetry
}: {
  msg: any;
  idx: number;
  messages: any[];
  dir: 'ltr' | 'rtl';
  videoSettings: any;
  liveElapsed: number;
  isGenerating: boolean;
  t: any;
  onRetry: () => void;
}) => {
  const { registerProcessingVideo, relinkMessageId } = useVideoResource();
  const msgId = msg.id || msg.client_id;

  useEffect(() => {
    const isProcessing = msg.tool === 'video' && 
      !msg.content.includes('.mp4') && 
      !msg.content.includes('mixkit') && 
      !msg.content.includes('/uploads/') && 
      !msg.content.includes('[Generated Video]') &&
      !msg.is_video_failed;

    if (isProcessing && msgId) {
      registerProcessingVideo(msgId);
    }
  }, [msgId, msg.content, msg.tool, msg.is_video_failed, registerProcessingVideo]);

  useEffect(() => {
    if (msg.client_id && msg.id && msg.client_id !== msg.id) {
      relinkMessageId(msg.client_id, msg.id);
    }
  }, [msg.client_id, msg.id, relinkMessageId]);

  const {
    status,
    progressData,
    resolvedUrl,
    generationError
  } = useVideoPlayback({ src: msg.content, messageId: msgId, dir });

  if (status === 'ready' && resolvedUrl) {
    return (
      <VideoPlaybackComponent 
        src={resolvedUrl} 
        dir={dir} 
        alt="Generated Video"
      />
    );
  }

  const failedState = status === 'error' || !!msg.is_video_failed || (!isGenerating && idx === messages.length - 1 && !msg.content);

  return (
    <VideoGenerationPlaceholder 
      dir={dir} 
      aspectRatio={videoSettings.aspectRatio}
      liveElapsed={idx === messages.length - 1 ? liveElapsed : 0}
      resolution={videoSettings.resolution}
      duration={videoSettings.duration}
      t={t}
      isFailed={failedState}
      errorMessage={generationError || msg.content || (dir === 'rtl' ? 'تم إيقاف توليد وإعداد الفيديو من قبل العميل أو لعدم الاتصال' : 'Video generation stopped or halted.')}
      progressData={progressData}
      onRetry={onRetry}
    />
  );
};

const VideoPlaybackComponent = ({ src, dir, alt, title, ...props }: { src?: string; dir?: string; alt?: string; title?: string; [key: string]: any }) => {
  const {
    shareStatus,
    isPreviewOpen,
    setIsPreviewOpen,
    isPlaying,
    setIsPlaying,
    isMuted,
    progress,
    currentTime,
    duration,
    isVideoLoaded,
    setIsVideoLoaded,

    isPreviewPlaying,
    setIsPreviewPlaying,
    isPreviewMuted,
    previewProgress,
    previewTime,
    previewDur,

    videoRef,
    previewVideoRef,

    cleanDisplayUrl,
    vidAspect,
    providerMeta,

    handleDownload,
    handleShare,
    togglePlay,
    toggleMute,
    handleTimeUpdate,
    handleLoadedMetadata,
    handleSeek,

    togglePreviewPlay,
    togglePreviewMute,
    handlePreviewSeek,
    handlePreviewTimeUpdate,
    handlePreviewLoadedMetadata,
  } = useVideoPlayback({ src, dir });

  const currentRatioClass = ASPECT_RATIO_CLASSES[vidAspect] || 'aspect-[16/9] max-w-[320px] sm:max-w-[340px]';

  return (
    <>
      <div className="w-full flex my-4 justify-start">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className={`relative group overflow-hidden rounded-xl border border-[var(--border)] shadow-md transition-all duration-500 ease-out hover:shadow-[0_0_35px_rgba(16,185,129,0.22)] hover:border-emerald-500/40 w-full ${currentRatioClass} bg-black/40`}
        >
          {providerMeta.isValid && (
            <div className={`absolute top-3 ${dir === 'rtl' ? 'right-3' : 'left-3'} bg-zinc-950/70 backdrop-blur-md px-2 py-1 rounded-[3px] border border-emerald-500/10 text-[8px] font-mono text-emerald-400 z-10 transition-all duration-500 hover:border-emerald-500/30 flex items-center gap-1`}>
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              <span>{providerMeta.label}</span>
            </div>
          )}

          <video 
            ref={videoRef}
            src={cleanDisplayUrl}
            onTimeUpdate={handleTimeUpdate}
            onLoadedData={() => {
              setIsVideoLoaded(true);
            }}
            onLoadedMetadata={() => {
              setIsVideoLoaded(true);
              handleLoadedMetadata();
            }}
            onEnded={() => setIsPlaying(false)}
            onClick={() => setIsPreviewOpen(true)}
            className={`block w-full h-full object-cover cursor-pointer transition-opacity duration-300 ${isVideoLoaded ? 'opacity-100' : 'opacity-0'}`} 
            loop
            playsInline
            muted={isMuted}
          />

          {!isVideoLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/95 pointer-events-none z-20">
              <div className="flex flex-col items-center gap-2.5">
                <Loader2 size={24} className="animate-spin text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                <span className="text-[10px] font-sans font-medium text-zinc-400 tracking-wide">
                  {dir === 'rtl' ? 'جاري التحميل...' : 'Loading video...'}
                </span>
              </div>
            </div>
          )}

          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/35 transition-colors duration-300 pointer-events-none" />

          <div 
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-auto cursor-pointer"
          >
            <div className="w-12 h-12 rounded-full bg-zinc-950/80 backdrop-blur-md border border-zinc-800/80 hover:border-emerald-500/40 flex items-center justify-center text-emerald-400 hover:text-emerald-300 hover:scale-110 active:scale-95 transition-all duration-300 shadow-[0_0_20px_rgba(0,0,0,0.6)]">
              {isPlaying ? <Pause size={18} className="fill-emerald-400/20" /> : <Play size={18} className="fill-emerald-400/20 ml-0.5" />}
            </div>
          </div>

          <div className="absolute bottom-0 inset-x-0 h-1 bg-zinc-900/40 backdrop-blur-xs z-10 overflow-hidden pointer-events-none">
            <div 
              className="h-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] transition-all duration-100" 
              style={{ width: `${progress}%` }}
            />
          </div>

          <div 
            className="absolute inset-x-0 bottom-0 p-3.5 bg-gradient-to-t from-black/90 via-black/45 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-300 flex justify-between items-center backdrop-blur-[2px] z-10"
          >
            <div onClick={handleSeek} className="absolute top-0 inset-x-0 h-1.5 bg-zinc-850 cursor-pointer overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="h-full bg-emerald-500" style={{ width: `${progress}%` }} />
            </div>

            <div className="flex items-center gap-1.5 font-mono text-[9px] text-gray-400">
              <span className="text-gray-200">{currentTime.toFixed(0)}s</span>
              <span>/</span>
              <span>{duration ? `${duration.toFixed(0)}s` : '5s'}</span>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={toggleMute}
                className="w-8 h-8 rounded-[4px] bg-zinc-900 border border-zinc-805 text-gray-200 hover:text-emerald-500 hover:border-emerald-500/35 hover:bg-zinc-800 transition-all duration-300 flex items-center justify-center cursor-pointer active:scale-95 shadow-md"
                title={isMuted ? (dir === 'rtl' ? 'إلغاء الكتم' : 'Unmute') : (dir === 'rtl' ? 'كتم الصوت' : 'Mute')}
              >
                {isMuted ? <VolumeX size={13} className="text-gray-400" /> : <Volume2 size={13} />}
              </button>
              <button 
                onClick={() => setIsPreviewOpen(true)}
                className="w-8 h-8 rounded-[4px] bg-zinc-900 border border-zinc-805 text-gray-200 hover:text-emerald-500 hover:border-emerald-500/35 hover:bg-zinc-800 transition-all duration-300 flex items-center justify-center cursor-pointer active:scale-95 shadow-md"
                title={dir === 'rtl' ? 'ملء الشاشة' : 'Fullscreen'}
              >
                <Maximize2 size={13} />
              </button>
              <button 
                onClick={handleShare}
                className={`w-8 h-8 rounded-[4px] border flex items-center justify-center cursor-pointer transition-all duration-300 shadow-md active:scale-95 ${
                  shareStatus === 'copied' 
                    ? 'bg-emerald-500/25 text-emerald-400 border-emerald-500/45 hover:bg-emerald-500/35' 
                    : 'bg-zinc-900 border border-zinc-805 hover:text-emerald-500 hover:border-emerald-500/35 hover:bg-zinc-800 text-gray-200'
                }`}
                title={dir === 'rtl' ? 'مشاركة' : 'Share'}
              >
                <Share2 size={13} className={shareStatus === 'sharing' ? 'animate-pulse text-emerald-400' : ''} />
              </button>
              <button 
                onClick={handleDownload}
                className="w-8 h-8 rounded-[4px] bg-zinc-900 border border-zinc-805 text-gray-200 hover:text-emerald-500 hover:border-emerald-500/35 hover:bg-zinc-800 transition-all duration-300 flex items-center justify-center cursor-pointer active:scale-95 shadow-md"
                title={dir === 'rtl' ? 'تنزيل' : 'Download'}
              >
                <Download size={13} />
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {createPortal(
        <AnimatePresence>
          {isPreviewOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-neutral-955/98 backdrop-blur-2xl z-[999999] flex flex-col items-center justify-center select-none"
              onClick={() => setIsPreviewOpen(false)}
            >
              <div 
                className="absolute top-0 inset-x-0 h-20 bg-gradient-to-b from-black/90 via-black/45 to-transparent flex items-center justify-between px-6 z-[1000]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] font-bold text-emerald-400/90 tracking-widest uppercase font-mono">
                    {dir === 'rtl' ? 'عرض السينما الفائقة من بيربليكستا' : 'PERPLEXTA CINEMATIC PRO PREVIEW'}
                  </span>
                  <span className="text-[10px] text-gray-400 font-medium font-sans">
                    {dir === 'rtl' ? 'مخرجات آلة توليد الفيديو المتكاملة بدقة ووضوح فائقين' : 'Engineered high-fidelity video production container'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDownload}
                    className="w-10 h-10 rounded-[4px] bg-zinc-900/80 border border-zinc-800 text-gray-200 hover:text-emerald-400 hover:border-emerald-500/40 hover:bg-zinc-800/90 transition-all duration-300 flex items-center justify-center cursor-pointer shadow-lg active:scale-95"
                    title={dir === 'rtl' ? 'تنزيل' : 'Download'}
                  >
                    <Download size={15} />
                  </button>
                  <button
                    onClick={handleShare}
                    className="w-10 h-10 rounded-[4px] bg-zinc-900/80 border border-zinc-800 text-gray-200 hover:text-emerald-400 hover:border-emerald-500/40 hover:bg-zinc-800/90 transition-all duration-300 flex items-center justify-center cursor-pointer shadow-lg active:scale-95"
                    title={dir === 'rtl' ? 'مشاركة' : 'Share'}
                  >
                    <Share2 size={15} />
                  </button>
                  <button
                    onClick={() => setIsPreviewOpen(false)}
                    className="w-10 h-10 rounded-[4px] bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 hover:border-rose-500/45 transition-all duration-300 flex items-center justify-center cursor-pointer shadow-lg active:scale-95"
                    title={dir === 'rtl' ? 'إغلاق' : 'Close'}
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              <div 
                className="w-full h-full flex flex-col items-center justify-center p-6 relative animate-fade-in"
                onClick={() => setIsPreviewOpen(false)}
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  transition={{ type: 'spring', damping: 28, stiffness: 220 }}
                  className="relative max-w-[90vw] max-h-[75vh] aspect-video flex items-center justify-center transition-shadow duration-500 bg-black rounded-[4px] border border-zinc-800/80 shadow-[0_25px_70px_-10px_rgba(0,0,0,0.85)]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <video
                    ref={previewVideoRef}
                    src={cleanDisplayUrl}
                    onTimeUpdate={handlePreviewTimeUpdate}
                    onLoadedMetadata={handlePreviewLoadedMetadata}
                    onEnded={() => setIsPreviewPlaying(false)}
                    onClick={togglePreviewPlay}
                    className="max-w-full max-h-[70vh] rounded-[4px] object-contain block focus:outline-none"
                    loop
                    preload="auto"
                    muted={isPreviewMuted}
                    playsInline
                  />

                  <div 
                    onClick={togglePreviewPlay}
                    className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-300 cursor-pointer"
                  >
                    <div className="w-16 h-16 rounded-full bg-zinc-950/80 backdrop-blur-md border border-zinc-850/80 flex items-center justify-center text-emerald-400 shadow-2xl">
                      {isPreviewPlaying ? <Pause size={24} className="fill-emerald-400/25" /> : <Play size={24} className="fill-emerald-400/25 ml-1" />}
                    </div>
                  </div>
                </motion.div>
              </div>

              <div 
                className="absolute bottom-8 bg-zinc-900/90 backdrop-blur-md border border-zinc-800 shadow-[0_15px_40px_rgba(0,0,0,0.5)] z-[1000] px-5 py-3 rounded-xl flex items-center gap-4 text-xs font-mono select-none w-full max-w-lg"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-2">
                  <button
                    onClick={togglePreviewPlay}
                    className="w-8 h-8 rounded-[4px] bg-zinc-800 hover:bg-zinc-700/80 border border-zinc-700/60 text-emerald-400 hover:text-emerald-300 flex items-center justify-center active:scale-95 transition-all duration-200"
                    title={isPreviewPlaying ? (dir === 'rtl' ? 'إيقاف' : 'Pause') : (dir === 'rtl' ? 'تشغيل' : 'Play')}
                  >
                    {isPreviewPlaying ? <Pause size={13} className="fill-emerald-400/10" /> : <Play size={13} className="fill-emerald-400/10 ml-0.5" />}
                  </button>

                  <button
                    onClick={togglePreviewMute}
                    className="w-8 h-8 rounded-[4px] bg-zinc-800 hover:bg-zinc-700/80 border border-zinc-700/60 text-emerald-400 hover:text-emerald-300 flex items-center justify-center active:scale-95 transition-all duration-200"
                    title={isPreviewMuted ? (dir === 'rtl' ? 'إلغاء كتم الصوت' : 'Unmute') : (dir === 'rtl' ? 'كتم الصوت' : 'Mute')}
                  >
                    {isPreviewMuted ? <VolumeX size={13} className="text-zinc-500" /> : <Volume2 size={13} />}
                  </button>
                </div>

                <div 
                  onClick={handlePreviewSeek} 
                  className="flex-1 h-1.5 bg-zinc-950/80 rounded-full cursor-pointer relative overflow-hidden"
                >
                  <div 
                    className="h-full bg-emerald-500 transition-all duration-100 shadow-[0_5px_10px_rgba(16,185,129,0.3)]" 
                    style={{ width: `${previewProgress}%` }}
                  />
                </div>

                <div className="flex items-center gap-1.5 font-mono text-[9.5px] text-zinc-400 select-none">
                  <span className="text-zinc-200 font-bold">{previewTime.toFixed(0)}s</span>
                  <span className="text-zinc-650">/</span>
                  <span>{previewDur ? `${previewDur.toFixed(0)}s` : '5s'}</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};

const BlockquoteWithActions = ({ children, dir }: any) => {
  const [copied, setCopied] = useState(false);

  const extractText = (node: any): string => {
    if (!node) return '';
    if (typeof node === 'string') return node;
    if (typeof node === 'number') return String(node);
    if (Array.isArray(node)) return node.map(extractText).join('');
    if (node.props && node.props.children) return extractText(node.props.children);
    return '';
  };

  const textToProcess = extractText(children).trim();

  const handleCopy = () => {
    if (!textToProcess) return;
    navigator.clipboard.writeText(textToProcess)
      .then(() => {
        setCopied(true);
        toast.success(dir === 'rtl' ? 'تم نسخ النص المقتبس' : 'Quote copied to clipboard!');
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {
        toast.error(dir === 'rtl' ? 'فشل في النسخ' : 'Failed to copy text');
      });
  };

  const handleApply = () => {
    if (!textToProcess) return;
    window.dispatchEvent(new CustomEvent('insert_to_prompt', { detail: textToProcess }));
  };

  return (
    <div className="relative group/bq transition-all duration-300 my-4 p-4 rounded-[4px] border border-emerald-500/15 bg-emerald-500/[0.02] dark:bg-emerald-500/[0.01]">
      <div className={`absolute top-2 ${dir === 'rtl' ? 'left-2' : 'right-2'} opacity-100 sm:opacity-0 sm:group-hover/bq:opacity-100 transition-opacity duration-300 flex items-center gap-1 z-10 pointer-events-auto`}>
        <button
          onClick={handleCopy}
          className="w-8 h-8 flex items-center justify-center rounded-[4px] bg-transparent border border-transparent hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-300 text-gray-400 hover:text-emerald-500 hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)] cursor-pointer"
          title={dir === 'rtl' ? 'نسخ النص' : 'Copy Text'}
        >
          {copied ? <Check size={14} className="text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse" /> : <Copy size={14} />}
        </button>
        <button
          onClick={handleApply}
          className="w-8 h-8 flex items-center justify-center rounded-[4px] bg-transparent border border-transparent hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-300 text-gray-400 hover:text-emerald-500 hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)] cursor-pointer"
          title={dir === 'rtl' ? 'تطبيق كأمر للدردشة' : 'Apply as Chat Prompt'}
        >
          <Send size={14} className={dir === 'rtl' ? 'transform -scale-x-100' : ''} />
        </button>
      </div>
      <blockquote className="m-0 pl-2 pr-10 rtl:pr-2 rtl:pl-10 italic">
        {children}
      </blockquote>
    </div>
  );
};

const CodeBlock = ({ inline, className, children, ...props }: any) => {
  const { dir } = useAppContext();
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const lang = match ? match[1] : 'text';
  const codeContent = String(children).trim();

  const [sandboxMode, setSandboxMode] = useState(false);
  const [editableCode, setEditableCode] = useState(codeContent);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [outputLogs, setOutputLogs] = useState<{ type: 'log' | 'info' | 'warn' | 'error'; text: string; time: string }[]>([]);
  const [iframeSrc, setIframeSrc] = useState<string | null>(null);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    setEditableCode(codeContent);
  }, [codeContent]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSandboxMode(false);
        setIsPlaying(false);
        setIframeSrc(null);
        setOutputLogs([]);
      }
    };
    handleResize(); 
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const highlightedCode = useMemo(() => {
    const language = lang.toLowerCase();
    let prismLang = language;
    if (language === 'js') prismLang = 'javascript';
    if (language === 'ts') prismLang = 'typescript';
    if (language === 'py') prismLang = 'python';
    if (language === 'sh') prismLang = 'bash';
    if (language === 'html' || language === 'xml' || language === 'svg') prismLang = 'markup';

    const hasGrammar = Prism.languages[prismLang];
    if (hasGrammar) {
      try {
        return Prism.highlight(editableCode, Prism.languages[prismLang], prismLang);
      } catch (e) {

      }
    }
    return editableCode
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }, [editableCode, lang]);

  const isMediaUrl = (codeContent.startsWith('http') || codeContent.startsWith('/')) && (codeContent.includes('.png') || codeContent.includes('.jpg') || codeContent.includes('.mp4') || codeContent.includes('.gif') || codeContent.includes('.mp3') || codeContent.includes('.wav') || codeContent.includes('.ogg'));

  const isExecutable = !isMediaUrl && ['javascript', 'js', 'typescript', 'ts', 'html', 'css'].includes(lang.toLowerCase());

  const copyToClipboard = () => {
    navigator.clipboard.writeText(editableCode)
      .then(() => {
        setCopied(true);
        toast.success(dir === 'rtl' ? 'تم نسخ الكود بنجاح' : 'Code copied to clipboard!');
        setTimeout(() => setCopied(false), 2000);
      })
      .catch((err) => {

        toast.error(dir === 'rtl' ? 'فشل نسخ الكود' : 'Failed to copy code');
      });
  };

  const downloadCode = () => {
    const blob = new Blob([editableCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `code.${lang}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadFile = (fileUrl: string) => {
    const a = document.createElement('a');
    a.href = fileUrl;
    a.download = 'generated-file';
    a.target = '_blank';
    a.click();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      const newValue = editableCode.substring(0, start) + '  ' + editableCode.substring(end);
      setEditableCode(newValue);
      setTimeout(() => {
        e.currentTarget.selectionStart = e.currentTarget.selectionEnd = start + 2;
      }, 0);
    }
  };

  const handleRun = async () => {
    setIsPlaying(true);
    setIframeSrc(null);
    setOutputLogs([]);

    const language = lang.toLowerCase();
    if (['html', 'css'].includes(language)) {
      setIsRunning(true);
      try {
        let fullHtml = '';
        const isDark = document.body.classList.contains('dark') || document.documentElement.className.includes('dark');
        const documentClass = isDark ? 'dark' : 'light';

        if (language === 'html') {
          fullHtml = `
            <!DOCTYPE html>
            <html class="${documentClass}">
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <style>
                body { 
                  font-family: system-ui, -apple-system, sans-serif; 
                  margin: 1rem; 
                  padding: 0;
                  color: ${isDark ? '#e2e8f0' : '#1e293b'}; 
                  background-color: ${isDark ? '#0f0f11' : '#ffffff'}; 
                }
              </style>
            </head>
            <body>
              ${editableCode}
            </body>
            </html>
          `;
        } else {
          fullHtml = `
            <!DOCTYPE html>
            <html class="${documentClass}">
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <style>
                body { 
                  font-family: system-ui, -apple-system, sans-serif; 
                  margin: 1rem; 
                  padding: 0;
                  color: ${isDark ? '#e2e8f0' : '#1e293b'}; 
                  background-color: ${isDark ? '#0f0f11' : '#ffffff'}; 
                }
                ${editableCode}
              </style>
            </head>
            <body>
              <div class="sandbox-demo-container">
                <h1 class="demo-title">CSS Sandbox Preview</h1>
                <p class="demo-text">Style standard selectors, utilities, classes, or ID attributes here!</p>
                <div class="demo-card" style="border: 1px solid ${isDark ? '#334155' : '#e2e8f0'}; padding: 1.5rem; border-radius: 8px; margin: 1.5rem 0; background-color: ${isDark ? '#1a1a1c' : '#f8fafc'}; max-width: 450px;">
                  <h3 style="margin-top: 0;">Interactive Demo Card</h3>
                  <p style="font-size: 14px; opacity: 0.85;">This card mimics typical interface content to display visual styles clearly.</p>
                  <button class="demo-button" style="padding: 0.5rem 1rem; border-radius: 4px; border: none; font-weight: bold; background-color: #10b981; color: white;">Button One</button>
                  <button class="demo-button outline" style="padding: 0.5rem 1rem; border-radius: 4px; border: 1px solid #10b981; font-weight: bold; background-color: transparent; color: #10b981; margin-left: 0.5rem;">Button Two</button>
                </div>
              </div>
            </body>
            </html>
          `;
        }
        if (mountedRef.current) setIframeSrc(fullHtml);
      } catch (err: any) {
      } finally {
        if (mountedRef.current) setIsRunning(false);
      }
    } else {
      setIsRunning(true);
      const startTime = performance.now();
      const logsList: { type: 'log' | 'info' | 'warn' | 'error'; text: string; time: string }[] = [];
      const getTimestamp = () => new Date().toLocaleTimeString([], { hour12: false });

      let jsCode = editableCode;
      if (['typescript', 'ts'].includes(language)) {
        jsCode = jsCode
          .replace(/import\s+[\s\S]*?\s+from\s+['"].*?['"];?/g, '')
          .replace(/export\s+(default\s+)?/g, '')
          .replace(/(?:interface|type)\s+\w+[\s\S]*?\{[\s\S]*?\}/g, '')
          .replace(/(const|let|var)\s+(\w+)\s*:\s*\w+/g, '$1 $2')
          .replace(/function\s+(\w+)\s*\((.*?)\)\s*:\s*\w+/g, 'function $1($2)')
          .replace(/\((.*?)\)\s*:\s*\w+\s*=>/g, '($1) =>');
      }

      const nonceVal = getCSPNonce();
      const nonceAttr = nonceVal ? ` nonce="${nonceVal}"` : '';

      const iframe = document.createElement('iframe');
      iframe.setAttribute('sandbox', 'allow-scripts');
      iframe.style.display = 'none';

      const scriptContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <script${nonceAttr}>
            const customConsole = {
              log: (...args) => {
                const text = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
                window.parent.postMessage({ type: 'PERPLEXTA_LOG', level: 'log', text }, '*');
              },
              info: (...args) => {
                const text = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
                window.parent.postMessage({ type: 'PERPLEXTA_LOG', level: 'info', text }, '*');
              },
              warn: (...args) => {
                const text = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
                window.parent.postMessage({ type: 'PERPLEXTA_LOG', level: 'warn', text }, '*');
              },
              error: (...args) => {
                const text = args.map(arg => typeof arg === 'object' ? String(arg?.message || JSON.stringify(arg)) : String(arg)).join(' ');
                window.parent.postMessage({ type: 'PERPLEXTA_LOG', level: 'error', text }, '*');
              }
            };
            window.console = {
              ...window.console,
              ...customConsole
            };
            window.addEventListener('error', (e) => {
              customConsole.error(e.error || e.message);
            });
          </script>
        </head>
        <body>
          <script${nonceAttr}>
            try {
              ${jsCode}
              window.parent.postMessage({ type: 'PERPLEXTA_DONE' }, '*');
            } catch (err) {
              window.parent.postMessage({ type: 'PERPLEXTA_LOG', level: 'error', text: err?.message || String(err) }, '*');
              window.parent.postMessage({ type: 'PERPLEXTA_DONE' }, '*');
            }
          </script>
        </body>
        </html>
      `;

      iframe.srcdoc = scriptContent;
      let runTimeout: any = null;

      const cleanup = () => {
        if (runTimeout) clearTimeout(runTimeout);
        window.removeEventListener('message', messageHandler);
        if (iframe && iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      };

      const messageHandler = (event: MessageEvent) => {
        const data = event.data;
        if (!data || typeof data !== 'object') return;

        if (data.type === 'PERPLEXTA_LOG') {
          logsList.push({
            type: data.level,
            text: data.text,
            time: getTimestamp()
          });
          if (mountedRef.current) setOutputLogs([...logsList]);
        } else if (data.type === 'PERPLEXTA_DONE') {
          const duration = (performance.now() - startTime).toFixed(1);
          logsList.push({
            type: 'info',
            text: `[SYSTEM] Process completed in ${duration}ms.`,
            time: getTimestamp()
          });
          if (mountedRef.current) {
            setOutputLogs([...logsList]);
            setIsRunning(false);
          }
          cleanup();
        }
      };

      window.addEventListener('message', messageHandler);
      document.body.appendChild(iframe);

      runTimeout = setTimeout(() => {
        logsList.push({
          type: 'warn',
          text: `[SYSTEM] Process exceeded 3000ms limit. Execution aborted.`,
          time: getTimestamp()
        });
        if (mountedRef.current) {
          setOutputLogs([...logsList]);
          setIsRunning(false);
        }
        cleanup();
      }, 3000);
    }
  };

  const handleStop = () => {
    setIsPlaying(false);
    setIframeSrc(null);
    setOutputLogs([]);
  };

  const handleReset = () => {
    setEditableCode(codeContent);
    handleStop();
    toast.success(dir === 'rtl' ? 'تمت إعادة تعيين الكود البرمجي' : 'Code reset for execution');
  };

  if (inline) return <code className={className} {...props}>{children}</code>;

  return (
    <div className="relative group mx-auto my-6 w-full max-w-[850px] bg-transparent border border-gray-200/40 dark:border-gray-800/20 rounded-md shadow-sm transition-all duration-300">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50/50 dark:bg-[#1a1a1c]/40 border-b border-gray-100 dark:border-gray-800/40 rounded-t-md">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{lang === 'audio' ? 'Perplexta Audio Slate' : lang}</span>
        </div>

        <div className="flex items-center gap-2">
          {isExecutable && (
            <div className="hidden md:flex items-center bg-gray-100 dark:bg-gray-800/50 p-0.5 rounded-[4px] border border-gray-200/20 dark:border-gray-700/20 shadow-inner mr-2">
              <button
                onClick={() => { setSandboxMode(false); handleStop(); }}
                className={`px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wider rounded-sm transition-all duration-300 ${!sandboxMode ? 'bg-[var(--bg-secondary)] text-emerald-500 shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
              >
                {dir === 'rtl' ? 'مصدر الكود' : 'Source Code'}
              </button>
              <button
                onClick={() => { setSandboxMode(true); }}
                className={`px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wider rounded-sm transition-all duration-300 ${sandboxMode ? 'bg-[var(--bg-secondary)] text-emerald-500 shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
              >
                {dir === 'rtl' ? 'بيئة الاختبار' : 'Interactive Sandbox'}
              </button>
            </div>
          )}

          <div className="flex items-center gap-1 transition-theme">
            {isMediaUrl ? (
              <button onClick={() => downloadFile(children)} className="p-1.5 rounded-sm text-[var(--text-muted)] hover:text-emerald-500 transition-theme hover:bg-[var(--bg-overlay)] active:scale-95" title="Download">
                <Download size={13} />
              </button>
            ) : (
              <>
                <button 
                  onClick={copyToClipboard} 
                  className="relative w-9 h-9 flex items-center justify-center rounded-sm text-[var(--text-muted)] hover:text-emerald-500 transition-all duration-300 hover:bg-[var(--bg-overlay)] active:scale-95" 
                  title={copied ? (dir === 'rtl' ? 'تم النسخ' : 'Copied!') : (dir === 'rtl' ? 'نسخ الكود' : 'Copy code')}
                >
                  <AnimatePresence mode="wait">
                    {copied ? (
                      <motion.div
                        key="checked"
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.5, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]"
                      >
                        <Check size={14} />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="copy"
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.5, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                      >
                        <Copy size={14} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {copied && (
                    <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-[10px] px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap font-sans pointer-events-none">
                      {dir === 'rtl' ? 'تم النسخ!' : 'Copied!'}
                    </span>
                  )}
                </button>
                <button 
                  onClick={() => window.dispatchEvent(new CustomEvent('insert_to_prompt', { detail: editableCode }))}
                  className="w-9 h-9 flex items-center justify-center rounded-sm text-[var(--text-muted)] hover:text-emerald-500 transition-all duration-300 hover:bg-[var(--bg-overlay)] active:scale-95 cursor-pointer"
                  title={dir === 'rtl' ? 'تطبيق كأمر للدردشة' : 'Apply as Chat Prompt'}
                >
                  <Send size={14} className={dir === 'rtl' ? 'transform -scale-x-100' : ''} />
                </button>
                <button onClick={downloadCode} className="w-9 h-9 flex items-center justify-center rounded-sm text-[var(--text-muted)] hover:text-emerald-500 transition-theme hover:bg-[var(--bg-overlay)] active:scale-95" title="Download source code">
                  <FileText size={14} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {lang === 'audio' ? (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden bg-[#0a0a0b] border border-[var(--border-main)] rounded-b-lg p-8 flex flex-col items-center gap-6 shadow-2xl"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent pointer-events-none" />

          <div className="relative">
             <div className="absolute inset-0 bg-emerald-500/20 blur-2xl rounded-full" />
             <div className="relative w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
                  <Volume2 size={32} />
             </div>
          </div>

          <div className="text-center space-y-1">
            <h3 className="text-xs font-black text-emerald-500 tracking-[0.2em] uppercase">Perplexta Orchestra Master</h3>
            <p className="text-[10px] text-[var(--text-secondary)] font-medium tracking-widest leading-none">
              {dir === 'rtl' ? 'الإنتاج الأوركسترالي الحصري' : 'EXCLUSIVE ORCHESTRAL PRODUCTION'}
            </p>
          </div>

          <audio 
            controls 
            src={codeContent} 
            className="w-full max-w-md accent-emerald-500 h-10 custom-audio-player" 
          />

          <button 
            onClick={() => downloadFile(codeContent)}
            className="flex items-center gap-2 px-8 py-3 bg-emerald-500 text-white hover:bg-emerald-600 rounded-sm text-[11px] font-black uppercase tracking-[0.1em] transition-theme active:scale-95 shadow-[0_10px_25px_rgba(16,185,129,0.3)] group-hover:shadow-[0_15px_35px_rgba(16,185,129,0.4)]"
          >
            <Download size={14} />
            {dir === 'rtl' ? 'تنزيل فوري' : 'INSTANT DOWNLOAD'}
          </button>

          <div className="flex items-center gap-8 pt-2">
            <div className="flex flex-col items-center gap-1">
               <span className="text-[8px] font-bold text-[var(--text-muted)] uppercase tracking-tighter">Bitrate</span>
               <span className="text-[10px] font-mono text-[var(--text-secondary)]">320kbps</span>
            </div>
            <div className="w-px h-6 bg-[var(--border)]" />
            <div className="flex flex-col items-center gap-1">
               <span className="text-[8px] font-bold text-[var(--text-muted)] uppercase tracking-tighter">Sample Rate</span>
               <span className="text-[10px] font-mono text-[var(--text-secondary)]">48kHz</span>
            </div>
            <div className="w-px h-6 bg-[var(--border)]" />
            <div className="flex flex-col items-center gap-1">
               <span className="text-[8px] font-bold text-[var(--text-muted)] uppercase tracking-tighter">Encoding</span>
               <span className="text-[10px] font-mono text-[var(--text-secondary)]">Direct</span>
            </div>
          </div>
        </motion.div>
      ) : (
        <div className="relative">
          {sandboxMode ? (

            <div className="flex flex-col w-full bg-[var(--bg-secondary)] overflow-hidden rounded-b-md">
              <div className="relative p-1">
                <textarea
                  value={editableCode}
                  onChange={(e) => setEditableCode(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full min-h-[220px] max-h-[450px] p-4 bg-transparent outline-none border-b border-gray-100 dark:border-gray-800/40 font-mono text-[16px] md:text-[14px] leading-relaxed text-[var(--text-primary)] resize-y custom-scrollbar text-left"
                  style={{ direction: 'ltr', textAlign: 'left' }}
                  spellCheck="false"
                  placeholder={dir === 'rtl' ? 'اكتب أو عدل الكود البرمجي هنا لتجربته...' : 'Type or modify code snippet here to test...'}
                />
              </div>

              <div className="flex items-center justify-between px-4 py-2 bg-gray-50/30 dark:bg-black/10">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleRun}
                    disabled={isRunning}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-[4px] bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.5)] transition-all duration-300 disabled:opacity-50"
                  >
                    {isRunning ? (
                      <Loader2 size={13} className="animate-spin text-emerald-500" />
                    ) : (
                      <Play size={13} className="fill-emerald-500/20 stroke-emerald-500" />
                    )}
                    <span>{dir === 'rtl' ? 'تنفيذ برمجياً' : 'Run Sandbox'}</span>
                  </button>

                  <button
                    onClick={handleReset}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-[4px] hover:bg-gray-100 dark:hover:bg-gray-800 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all duration-300 border border-transparent"
                  >
                    <RefreshCw size={12} />
                    <span>{dir === 'rtl' ? 'إعادة التعيين' : 'Reset'}</span>
                  </button>

                  {isPlaying && (
                    <button
                      onClick={handleStop}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-[4px] hover:bg-red-500/10 text-red-500 hover:text-red-600 transition-all duration-300 border border-transparent"
                    >
                      <Square size={12} className="fill-red-500/10" />
                      <span>{dir === 'rtl' ? 'إخفاء النتائج' : 'Clear View'}</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {isPlaying && ['html', 'css'].includes(lang.toLowerCase()) && (
                    <>
                      <button
                        onClick={() => {
                          if (iframeSrc) {
                            const blob = new Blob([iframeSrc], { type: 'text/html' });
                            const url = URL.createObjectURL(blob);
                            window.open(url, '_blank');
                            setTimeout(() => URL.revokeObjectURL(url), 1000);
                          }
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold rounded-[4px] hover:bg-emerald-500/10 text-[var(--text-muted)] hover:text-emerald-500 transition-all duration-300 border border-transparent"
                      >
                        <ExternalLink size={12} />
                        <span>{dir === 'rtl' ? 'فتح في المتصفح' : 'Open in Browser'}</span>
                      </button>
                    </>
                  )}
                  <div className="text-[10px] font-mono text-[var(--text-muted)] select-none">
                    {dir === 'rtl' ? 'محرر بيربليكستا النشط' : 'PERPLEXTA ACTIVE SANDBOX'}
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {isPlaying && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    className="border-t border-gray-100 dark:border-gray-800/40 overflow-hidden"
                  >
                    {['html', 'css'].includes(lang.toLowerCase()) ? (
                      <div className="p-4 bg-gray-50/10 dark:bg-black/20">
                        <div className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2 select-none flex items-center justify-between">
                          <span>{dir === 'rtl' ? 'معاينة النتيجة التفاعلية' : 'LIVE COMPONENT INTERFACE'}</span>
                          <span className="flex h-1.5 w-1.5 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                          </span>
                        </div>
                        {iframeSrc ? (
                          <iframe
                            srcDoc={iframeSrc}
                            sandbox="allow-scripts"
                            className="w-full h-[300px] bg-white rounded-[4px] border border-gray-200 dark:border-gray-800/80 shadow-inner"
                            title="Sandbox PreviewFrame"
                          />
                        ) : (
                          <div className="w-full h-[300px] flex items-center justify-center bg-gray-100 dark:bg-black/30 text-xs text-[var(--text-muted)] rounded-[4px]">
                            {dir === 'rtl' ? 'جاري تحميل المعاينة...' : 'Loading Visual Component...'}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-4 bg-[#08080a] text-gray-300 font-mono text-xs select-text">
                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 border-b border-gray-800/50 pb-1.5 select-none flex items-center justify-between">
                          <span>{dir === 'rtl' ? 'مخرجات كونسول الآلة' : 'CONSOLE RUNTIME WORKSPACE'}</span>
                          <button
                            onClick={() => setOutputLogs([])}
                            className="text-gray-600 hover:text-emerald-500 transition-theme"
                            title="Clear Logs"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>

                        <div className="space-y-1.5 max-h-[250px] overflow-y-auto custom-scrollbar">
                          {outputLogs.map((log, lidx) => (
                            <div key={lidx} className={`flex items-start gap-2.5 leading-relaxed py-0.5 border-b border-gray-900/10 ${
                              log.type === 'error' ? 'text-red-400 bg-red-950/20 px-2 rounded-sm' :
                              log.type === 'warn' ? 'text-amber-400 bg-amber-950/20 px-2 rounded-sm' :
                              log.type === 'info' ? 'text-emerald-400 bg-emerald-950/10 px-2 rounded-sm' : 'text-gray-300'
                            }`}>
                              <span className="text-gray-600 select-none text-[9px] mt-0.5 font-bold tracking-tighter">[{log.time}]</span>
                              {log.type === 'error' && <AlertTriangle size={12} className="mt-0.5 shrink-0" />}
                              {log.type === 'warn' && <AlertTriangle size={12} className="mt-0.5 shrink-0" />}
                              <pre className="font-mono whitespace-pre-wrap break-all text-[12px]">{log.text}</pre>
                            </div>
                          ))}
                          {outputLogs.length === 0 && (
                            <div className="text-gray-600 italic py-2 text-center text-[10px]">
                              {dir === 'rtl' ? 'لا يوجد إنتاج برامجي مسجل حتى الآن. اضغط فوق "تشغيل المعمل" للبدء.' : 'No console output. Click "Run Sandbox" to trigger execution.'}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (

            isMediaUrl ? (
              <div className="w-full p-4 bg-[var(--bg-secondary)] rounded-b-md border-t border-gray-100 dark:border-gray-800/40">
                {codeContent.includes('.mp3') || codeContent.includes('.wav') || codeContent.includes('.ogg') ? (
                  <div className="flex flex-col items-center gap-4 py-8">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                      <Music size={32} />
                    </div>
                    <span className="text-sm font-bold text-emerald-500 tracking-widest uppercase">Sonic Draft Ready</span>
                    <audio controls src={codeContent} className="w-full max-w-md accent-emerald-500" />
                  </div>
                ) : (
                  <img src={codeContent} alt="Generated" className="max-w-full rounded-md mx-auto" referrerPolicy="no-referrer" />
                )}
              </div>
            ) : (
              <div 
                className="w-full overflow-x-auto bg-[#0c0c0e] text-[#f8f8f2] border-t border-gray-100/10 dark:border-gray-800/20 rounded-b-md select-text custom-scrollbar animate-fade-in" 
                style={{ direction: 'ltr', textAlign: 'left' }}
                {...props}
              >
                <div className="flex items-start min-w-max md:min-w-full">
                  <div className="flex select-none flex-col text-right text-[#5c5c62] py-5 pl-4 pr-3.5 border-r border-gray-100/10 dark:border-gray-800/20 font-mono text-[13px] md:text-[14px] leading-relaxed shrink-0 bg-[#0a0a0c]" style={{ userSelect: 'none' }}>
                    {Array.from({ length: editableCode.split('\n').length || 1 }, (_, i) => (
                      <span key={i + 1} className="block select-none min-w-[24px] text-right pr-0.5">
                        {i + 1}
                      </span>
                    ))}
                  </div>
                  <pre 
                    className="flex-1 py-5 px-5 font-mono text-[13px] md:text-[14px] leading-relaxed bg-transparent text-[#f8f8f2] block text-left overflow-x-visible"
                    style={{ 
                      whiteSpace: 'pre', 
                      wordBreak: 'normal', 
                      wordWrap: 'normal', 
                      unicodeBidi: 'isolate',
                      direction: 'ltr',
                      textAlign: 'left'
                    }}
                  >
                    <code 
                      className={`${className || ''} font-mono block text-left`} 
                      style={{ 
                        whiteSpace: 'pre',
                        wordBreak: 'normal', 
                        wordWrap: 'normal', 
                        unicodeBidi: 'isolate',
                        direction: 'ltr', 
                        textAlign: 'left' 
                      }} 
                      dangerouslySetInnerHTML={{ __html: highlightedCode }} 
                    />
                  </pre>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
};

interface Message {
  client_id?: string;
  id?: number;
  role: 'user' | 'assistant';
  content: string;
  tool?: string;
  feedback?: number;
  is_pinned?: boolean;
  is_quota_error?: boolean;
  is_system_inactive?: boolean;
  is_insufficient_funds?: boolean;
  is_image_failed?: boolean;
  is_video_failed?: boolean;
  quota_data?: any;
  thinking_steps?: { step: string; status: 'completed' | 'processing' | 'pending' }[];
  citations?: { title: string; url: string; index: number; link?: string }[];
  follow_ups?: string[];
  is_streaming?: boolean;
  generation_time?: number;
  created_at?: string;
  file?: {
    name: string;
    type: string;
    preview?: string;
    base64?: string;
  };
}

const formatExactTimestamp = (createdAt: string | Date | undefined, dir: 'ltr' | 'rtl') => {
  const dateObj = createdAt ? new Date(createdAt) : new Date();
  if (isNaN(dateObj.getTime())) return '';
  const pad = (num: number, size = 2) => String(num).padStart(size, '0');

  const yyyy = dateObj.getFullYear();
  const mm = pad(dateObj.getMonth() + 1);
  const dd = pad(dateObj.getDate());

  const hh = pad(dateObj.getHours());
  const min = pad(dateObj.getMinutes());
  const ss = pad(dateObj.getSeconds());
  const ms = pad(dateObj.getMilliseconds(), 3);

  return `[${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}.${ms}]`;
};

const getToolDetails = (toolId: string | undefined, dir: 'ltr' | 'rtl', t: any) => {
  const normId = toolId || 'chat';

  if (normId.startsWith('chat_fast')) {
    return {
      label: dir === 'rtl' ? 'البحث السريع والتوليد الخفيف' : 'Fast Generation',
      icon: Zap,
      colorClass: 'text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]',
      bgClass: 'bg-amber-500/10 border-amber-500/20'
    };
  }
  if (normId.startsWith('chat_pro')) {
    return {
      label: dir === 'rtl' ? 'الذكاء الفائق والتحليل المتقدم' : 'Elite Reasoning',
      icon: Sparkles,
      colorClass: 'text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]',
      bgClass: 'bg-emerald-500/10 border-emerald-500/20'
    };
  }
  if (normId.startsWith('chat_reasoning')) {
    return {
      label: dir === 'rtl' ? 'التفكير العميق والتحميص المنطقي' : 'Deep Reasoning',
      icon: Brain,
      colorClass: 'text-sky-500 drop-shadow-[0_0_8px_rgba(14,165,233,0.5)]',
      bgClass: 'bg-sky-500/10 border-sky-500/20'
    };
  }

  switch (normId) {
    case 'code':
      return {
        label: t('code') || (dir === 'rtl' ? 'توليد وتحليل البرمجيات' : 'Code Engine'),
        icon: Code,
        colorClass: 'text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]',
        bgClass: 'bg-emerald-500/10 border-emerald-500/20'
      };
    case 'video':
      return {
        label: t('video') || (dir === 'rtl' ? 'محرك إنتاج الفيديو' : 'Video Creator'),
        icon: Video,
        colorClass: 'text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]',
        bgClass: 'bg-red-500/10 border-red-500/20'
      };
    case 'image':
      return {
        label: t('image') || (dir === 'rtl' ? 'التوليد الصوري الإبداعي' : 'Studio Image'),
        icon: ImageIcon,
        colorClass: 'text-pink-500 drop-shadow-[0_0_8px_rgba(236,72,153,0.5)]',
        bgClass: 'bg-pink-500/10 border-pink-500/20'
      };
    case 'learning':
      return {
        label: t('learning') || (dir === 'rtl' ? 'مساعد التعليم' : 'Education Assistant'),
        icon: BookOpen,
        colorClass: 'text-purple-500 drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]',
        bgClass: 'bg-purple-500/10 border-purple-500/20'
      };
    case 'perplexta_analysis':
      return {
        label: t('perplexta_analysis') || (dir === 'rtl' ? 'تحليل رقمي عميق وبحث شامل' : 'Deep Digital Search'),
        icon: Search,
        colorClass: 'text-teal-500 drop-shadow-[0_0_8px_rgba(20,184,166,0.5)]',
        bgClass: 'bg-teal-500/10 border-teal-500/20'
      };
    case 'sovereign_search':
      return {
        label: t('sovereign_search') || (dir === 'rtl' ? 'البحث الاستخباراتي السيادي' : 'Sovereign Intelligence Search'),
        icon: Search,
        colorClass: 'text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]',
        bgClass: 'bg-emerald-500/10 border-emerald-500/20'
      };
    case 'sovereign_memory':
      return {
        label: t('sovereign_memory') || (dir === 'rtl' ? 'الذاكرة السيادية الجوهرية' : 'Sovereign Core Memory'),
        icon: Database,
        colorClass: 'text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]',
        bgClass: 'bg-amber-500/10 border-amber-500/20'
      };
    case 'legal_analysis':
      return {
        label: t('legal_analysis') || (dir === 'rtl' ? 'التحقيق والتدقيق القانوني' : 'Legal Auditing'),
        icon: Scale,
        colorClass: 'text-indigo-500 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]',
        bgClass: 'bg-indigo-500/10 border-indigo-500/20'
      };
    case 'notebook':
      return {
        label: t('notebook') || (dir === 'rtl' ? 'صياغة ونشر المدونات والمذكرات' : 'Smart Editor'),
        icon: Megaphone,
        colorClass: 'text-lime-500 drop-shadow-[0_0_8px_rgba(132,204,22,0.5)]',
        bgClass: 'bg-lime-500/10 border-lime-500/20'
      };
    case 'canvas':
      return {
        label: t('canvas') || (dir === 'rtl' ? 'استوديو تأليف الموسيقى والمؤثرات' : 'Sound Orchestra'),
        icon: Music,
        colorClass: 'text-cyan-500 drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]',
        bgClass: 'bg-cyan-500/10 border-cyan-500/20'
      };
    case 'tts':
      return {
        label: t('tts') || (dir === 'rtl' ? 'توليد النطق الطبيعي (سمعي)' : 'Studio Voice'),
        icon: Volume2,
        colorClass: 'text-blue-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]',
        bgClass: 'bg-blue-500/10 border-blue-500/20'
      };
    case 'stt':
      return {
        label: t('stt') || (dir === 'rtl' ? 'تحليل وتسجيل الصوت المباشر' : 'Live Audio Capture'),
        icon: Mic,
        colorClass: 'text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]',
        bgClass: 'bg-orange-500/10 border-orange-500/20'
      };
    default:
      return {
        label: t('chat') || (dir === 'rtl' ? 'مساعد بيربليكستا المباشر' : 'AI Companion'),
        icon: MessageSquare,
        colorClass: 'text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]',
        bgClass: 'bg-emerald-500/10 border-emerald-500/20'
      };
  }
};

const ToolStatusIndicator = ({ tool, isGenerating, dir, t }: { tool?: string, isGenerating: boolean, dir: 'ltr' | 'rtl', t: any }) => {
  const details = getToolDetails(tool, dir, t);
  const Icon = details.icon;

  return (
    <div className={`flex items-center gap-2.5 mb-5 w-fit select-none bg-gray-50/50 dark:bg-[#1a1a1c]/20 border border-gray-100/60 dark:border-gray-800/20 px-3 py-1.5 rounded-[4px] shadow-sm backdrop-blur-[2px] flex-row`}>
      <div className={`relative flex items-center justify-center w-6.5 h-6.5 rounded-[4px] border border-transparent transition-all duration-300 ${details.bgClass}`}>
        {isGenerating ? (
          <>
            <motion.div 
              className="absolute inset-0 rounded-[4px] bg-emerald-500/20 blur-sm"
              animate={{ 
                scale: [1, 1.3, 1],
                opacity: [0.3, 0.7, 0.3]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            <motion.div
              animate={{
                rotate: [0, 15, -15, 0],
                scale: [1, 1.1, 0.9, 1]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className={details.colorClass}
            >
              <Icon size={12} />
            </motion.div>
          </>
        ) : (
          <div className={details.colorClass}>
            <Icon size={12} />
          </div>
        )}
      </div>

      <div className="flex flex-col min-w-0">
        <div className="flex items-center gap-1.5 flex-row">
          <span className="text-[10px] md:text-[11px] font-bold uppercase tracking-wider text-[var(--text-primary)] truncate max-w-[180px] sm:max-w-[250px]">
            {details.label}
          </span>
          {isGenerating && (
            <span className="relative flex h-1.5 w-1.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
          )}
        </div>
        <span className="text-[8px] md:text-[9px] text-[var(--text-muted)] tracking-tight uppercase">
          {isGenerating 
            ? (dir === 'rtl' ? 'جاري التحليل والمعالجة المباشرة...' : 'Processing Technical Context...') 
            : (dir === 'rtl' ? 'مخرجات عملية الآلة المتكاملة' : 'Executed Engine Result')
          }
        </span>
      </div>
    </div>
  );
};

const ThinkingSteps = ({ steps, dir }: { steps: Message['thinking_steps'], dir: 'ltr' | 'rtl' }) => {
  if (!steps || steps.length === 0) return null;

  return (
    <div className="mb-4 sm:mb-6 space-y-2 sm:space-y-3" id="thinking-steps-container">
      <div className="flex items-center gap-2 mb-2 sm:mb-4 opacity-70">
         <div className="w-1 h-3 sm:w-1.5 sm:h-4 bg-emerald-500/60 rounded-full" />
         <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">
           {dir === 'rtl' ? 'مراحل التحليل والبحث' : 'ANALYSIS & RESEARCH PHASES'}
         </span>
      </div>
      <div className="space-y-1 sm:space-y-2 ps-2.5 sm:ps-5 border-s-2 border-emerald-500/10 ml-0.5 sm:ml-2">
        {steps.map((step, idx) => (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: idx * 0.05, duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            key={idx} 
            className="flex items-center gap-2 sm:gap-4 group"
          >
            {step.status === 'completed' ? (
              <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-sm bg-emerald-500/5 flex items-center justify-center text-emerald-500/70">
                <Check size={10} strokeWidth={3} />
              </div>
            ) : step.status === 'processing' ? (
              <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-sm bg-emerald-500/5 flex items-center justify-center">
                <Loader2 size={10} className="animate-spin text-emerald-500/60" style={{ animationDuration: '2s' }} />
              </div>
            ) : (
              <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-sm bg-[var(--bg-surface)] border border-[var(--border)] flex items-center justify-center">
                <div className="w-1 h-1 rounded-full bg-[var(--text-muted)]" />
              </div>
            )}
            <span className={`text-[10px] sm:text-[12px] font-medium ${step.status === 'completed' ? 'text-[var(--text-secondary)]' : 'text-[var(--text-muted)]/60'} transition-theme truncate`}>
              {step.step}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const renderChildrenWithCitations = (node: React.ReactNode, msg: any, depth = 0): React.ReactNode => {
  if (depth > 8) {
    return node;
  }
  if (typeof node === 'string') {
    const parts = node.split(/(\[\d+\])/g);
    return parts.map((part, i) => {
      const match = part.match(/^\[(\d+)\]$/);
      if (match && msg.citations) {
        const index = parseInt(match[1]);
        const citation = msg.citations.find((c: any) => c.index === index);
        if (citation) {
          return (
            <MarkdownCitationLink 
              key={i}
              citation={citation}
              index={index}
            />
          );
        }
      }
      return part;
    });
  }

  if (Array.isArray(node)) {
    return node.map((child, index) => (
      <React.Fragment key={index}>
        {renderChildrenWithCitations(child, msg, depth + 1)}
      </React.Fragment>
    ));
  }

  if (React.isValidElement(node)) {
    if (typeof node.type !== 'string') return node;
    if (!['img', 'video', 'a', 'iframe', 'canvas', 'svg', 'button', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'colgroup', 'col'].includes(node.type)) {
      const elementProps = node.props as any;
      if (elementProps && 'children' in elementProps) {
        return React.cloneElement(node, {
          ...elementProps,
          children: renderChildrenWithCitations(elementProps.children, msg, depth + 1)
        } as any);
      }
    }
  }

  return node;
};

const getCleanUrl = (url: string) => {
  try {
    let finalUrl = (url || '').trim();
    if (!finalUrl) return '';
    if (!/^https?:\/\//i.test(finalUrl)) {
      finalUrl = 'https://' + finalUrl;
    }
    return finalUrl;
  } catch {
    return url || '';
  }
};

const getFavicon = (url: string) => {
  try {
    const cleanUrl = getCleanUrl(url);
    if (!cleanUrl) return 'https://www.google.com/s2/favicons?domain=google.com&sz=32';
    const domain = new URL(cleanUrl).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch {
    return 'https://www.google.com/s2/favicons?domain=google.com&sz=32';
  }
};

const getPlatformBrand = (urlStr: string) => {
  const url = (urlStr || '').toLowerCase();

  if (url.includes('t.me') || url.includes('telegram')) {
    return {
      name: 'Telegram',
      color: '#0088cc',
      icon: (className = "w-3.5 h-3.5") => (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-1.96 1.24-5.54 3.66-.52.36-.97.53-1.35.52-.42-.01-1.23-.24-1.83-.43-.74-.24-1.33-.37-1.28-.79.03-.22.33-.45.91-.69 3.56-1.55 5.92-2.57 7.09-3.07 3.38-1.42 4.08-1.67 4.54-1.68.1.01.33.03.48.15.13.1.17.24.19.33.02.12.01.24 0 .31z"/>
        </svg>
      )
    };
  }
  if (url.includes('twitter.com') || url.includes('x.com')) {
    return {
      name: 'X',
      color: '#ffffff',
      icon: (className = "w-3.5 h-3.5") => (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      )
    };
  }
  if (url.includes('discord.gg') || url.includes('discord.com')) {
    return {
      name: 'Discord',
      color: '#5865F2',
      icon: (className = "w-3.5 h-3.5") => (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.46-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.094 13.094 0 0 1-1.873-.894.077.077 0 0 1-.008-.128c.126-.093.252-.19.372-.287a.075.075 0 0 1 .077-.011c3.92 1.793 8.18 1.793 12.061 0a.073.073 0 0 1 .078.009c.12.099.246.195.373.289a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.156 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.156 2.418z"/>
        </svg>
      )
    };
  }
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    return {
      name: 'YouTube',
      color: '#FF0000',
      icon: (className = "w-3.5 h-3.5") => (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.11C19.517 3.545 12 3.545 12 3.545s-7.517 0-9.388.508a3.003 3.003 0 0 0-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 0 0 2.11 2.11c1.871.502 9.388.502 9.388.502s7.517 0 9.388-.502a3.003 3.003 0 0 0 2.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
        </svg>
      )
    };
  }
  if (url.includes('github.com')) {
    return {
      name: 'GitHub',
      color: '#ffffff',
      icon: (className = "w-3.5 h-3.5") => (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
        </svg>
      )
    };
  }
  if (url.includes('linkedin.com')) {
    return {
      name: 'LinkedIn',
      color: '#0077b5',
      icon: (className = "w-3.5 h-3.5") => (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0z"/>
        </svg>
      )
    };
  }
  if (url.includes('facebook.com') || url.includes('fb.com')) {
    return {
      name: 'Facebook',
      color: '#1877F2',
      icon: (className = "w-3.5 h-3.5") => (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      )
    };
  }
  if (url.includes('whatsapp.com') || url.includes('wa.me')) {
    return {
      name: 'WhatsApp',
      color: '#25D366',
      icon: (className = "w-3.5 h-3.5") => (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.022-.015-.03-.022-.053-.053l-.113-.15c-.27-.361-.534-.722-.803-1.081-.135-.18-.3-.15-.42.03-.135.21-.256.42-.39.63-.12.18-.285.21-.495.105-.33-.165-.66-.345-.96-.585-.45-.36-.84-.795-1.185-1.275-.12-.165-.105-.3.045-.45.195-.195.39-.39.57-.6.15-.18.135-.345-.03-.525-.225-.24-.45-.48-.675-.72-.18-.195-.345-.195-.525-.015-.225.225-.435.465-.615.735-.33.48-.465 1.02-.375 1.605.09.585.345 1.11.69 1.59.855 1.17 1.935 2.085 3.225 2.73.345.18.72.315 1.11.39.42.075.825.045 1.215-.12.435-.18.795-.495 1.05-.885.12-.18.09-.345-.06-.48zM12.007 2a9.999 9.999 0 0 0-8.666 14.997l-.78 2.855 2.923-.765A9.997 9.997 0 1 0 12.007 2zm0 18a7.994 7.994 0 0 1-4.085-1.115l-.293-.173-1.733.454.462-1.69-.19-.302A7.996 7.996 0 1 1 12.007 20z"/>
        </svg>
      )
    };
  }
  return null;
};

const linkMetadataCache = new Map<string, Promise<any> | any>();

const fetchLinkMetadata = (url: string): Promise<any> => {
  if (linkMetadataCache.has(url)) {
    const cached = linkMetadataCache.get(url);
    if (cached instanceof Promise) {
      return cached;
    }
    return Promise.resolve(cached);
  }

  if (linkMetadataCache.size > 150) {
    const oldKeys = Array.from(linkMetadataCache.keys()).slice(0, 20);
    oldKeys.forEach(key => linkMetadataCache.delete(key));
  }

  const promise = fetch(`/api/system/link-metadata?url=${encodeURIComponent(url)}`)
    .then(res => {
      if (!res.ok) throw new Error('Failed to fetch link metadata');
      return res.json();
    })
    .then(data => {
      linkMetadataCache.set(url, data);
      return data;
    })
    .catch(err => {
      linkMetadataCache.delete(url);
      return null;
    });

  linkMetadataCache.set(url, promise);
  return promise;
};

const HighlightText = ({ text, query }: { text: string; query?: string }) => {
  if (!query || !query.trim() || !text) {
    return <>{text}</>;
  }

  const cleanTerm = query.trim();
  if (!cleanTerm) return <>{text}</>;

  const stopWords = new Set([
    'the', 'and', 'a', 'an', 'or', 'to', 'for', 'in', 'of', 'on', 'with', 'is', 'at', 'by', 'from', 'this', 'that', 'these', 'those', 'it', 'its',
    'من', 'إلى', 'عن', 'على', 'في', 'ب', 'ل', 'ك', 'و', 'أو', 'ثم', 'مع', 'هذا', 'هذه', 'ذلك', 'التي', 'الذي', 'فيما', 'حيث'
  ]);

  const keywords = cleanTerm
    .split(/\s+/)
    .map(word => word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "").trim())
    .filter(word => word.length >= 2 && !stopWords.has(word.toLowerCase()));

  const searchTerms: string[] = [];
  if (cleanTerm.split(/\s+/).length > 1) {
    const cleanPhrase = cleanTerm.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "").trim();
    if (cleanPhrase.length > 2) {
      searchTerms.push(cleanPhrase);
    }
  }
  searchTerms.push(...keywords);

  const uniqueTerms = Array.from(new Set(searchTerms)).filter(Boolean);

  if (uniqueTerms.length === 0) {
    return <>{text}</>;
  }

  const sortedTerms = uniqueTerms
    .map(term => term.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'))
    .sort((a, b) => b.length - a.length);

  try {
    const pattern = `(${sortedTerms.join('|')})`;
    const isAr = /[\u0600-\u06FF]/.test(cleanTerm);
    const regex = new RegExp(pattern, isAr ? 'g' : 'gi');
    const parts = text.split(regex);
    const testRegex = new RegExp(`^(${sortedTerms.join('|')})$`, isAr ? '' : 'i');

    return (
      <>
        {parts.map((part, i) => {
          if (testRegex.test(part)) {
            return (
              <span 
                key={i} 
                className="bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 font-medium px-0.5 rounded-[2px] drop-shadow-[0_0_4px_rgba(16,185,129,0.4)]"
                id={`highlight-text-match-${i}`}
              >
                {part}
              </span>
            );
          }
          return part;
        })}
      </>
    );
  } catch (e) {

    return <>{text}</>;
  }
};

const CitationRow = ({ cite, idx, dir, getCleanUrl, getFavicon, query }: { cite: any, idx: number, dir: 'ltr' | 'rtl', getCleanUrl: (url: string) => string, getFavicon: (url: string) => string, query?: string }) => {
  const [meta, setMeta] = useState<any>(null);

  const rawUrl = cite.url || cite.link || '';
  const cleanUrl = getCleanUrl(rawUrl);
  const displayHost = rawUrl ? rawUrl.replace(/^https?:\/\//i, '').split('/')[0] : '';
  const brand = getPlatformBrand(cleanUrl);

  useEffect(() => {
    let active = true;
    if (!cleanUrl) return;

    fetchLinkMetadata(cleanUrl)
      .then(data => {
        if (active) {
          setMeta(data);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [cleanUrl]);

  const displayTitle = meta?.title || cite.title || displayHost;
  const displayDesc = meta?.description || cite.snippet || '';
  const displayImage = meta?.image || '';

  return (
    <motion.a
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.02, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      href={cleanUrl || '#'}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3.5 p-2.5 rounded-md hover:bg-emerald-500/[0.03] dark:hover:bg-emerald-500/[0.02] transition-theme group min-w-0 cursor-pointer border-b border-[var(--border-main)]/30 dark:border-zinc-800/20 last:border-0"
    >
      <div className="flex-shrink-0">
        <div 
          className="w-7 h-7 rounded-full flex items-center justify-center border border-[var(--border-main)]/60 bg-white dark:bg-zinc-900 shadow-sm transition-theme group-hover:scale-105 group-hover:border-emerald-500/20"
          style={{ color: brand ? brand.color : 'inherit' }}
        >
          {brand ? (
            brand.icon("w-3.5 h-3.5")
          ) : (
            <img
              src={getFavicon(cleanUrl)}
              alt=""
              className="w-3.5 h-3.5 object-contain"
              onError={(e) => { (e.target as HTMLImageElement).src = 'https://www.google.com/s2/favicons?domain=google.com&sz=32'; }}
            />
          )}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-4 h-4 rounded-full bg-emerald-500/10 flex items-center justify-center text-[9px] font-black text-emerald-500 shrink-0 group-hover:bg-emerald-500 group-hover:text-white transition-theme">
            {cite.index || (idx + 1)}
          </div>
          <span className="text-[11px] font-semibold text-[var(--text-primary)] truncate group-hover:text-emerald-500 transition-theme group-hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]">
            <HighlightText text={displayTitle} query={query} />
          </span>
          <ExternalLink size={10} className="text-[var(--text-muted)] group-hover:text-emerald-500 transition-theme shrink-0 opacity-0 group-hover:opacity-100 transform translate-x-[-2px] group-hover:translate-x-0 transition-transform duration-300" />
        </div>

        {displayDesc ? (
          <p className="text-[10px] text-[var(--text-muted)] truncate mt-0.5 font-normal leading-relaxed">
            <HighlightText text={displayDesc} query={query} />
          </p>
        ) : null}

        <span className="text-[9px] text-[var(--text-muted)] font-medium block truncate opacity-70">
          {displayHost || (dir === 'rtl' ? 'رابط المصدر' : 'Source Link')}
        </span>
      </div>

      {displayImage ? (
        <div className="flex-shrink-0 self-center hidden sm:block">
          <img
            src={displayImage}
            alt=""
            className="w-12 h-8 object-cover rounded border border-[var(--border-main)]/60 bg-zinc-100 dark:bg-zinc-800 shadow-sm group-hover:border-emerald-500/30 transition-theme"
            referrerPolicy="no-referrer"
          />
        </div>
      ) : null}
    </motion.a>
  );
};

const MarkdownLink = ({ href, children }: { href?: string, children: React.ReactNode }) => {
  const [meta, setMeta] = useState<any>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const cleanUrl = getCleanUrl(href || '');
  const displayHost = cleanUrl ? cleanUrl.replace(/^https?:\/\//i, '').split('/')[0] : '';
  const brand = getPlatformBrand(cleanUrl);

  useEffect(() => {
    if (!cleanUrl) return;
    let active = true;
    fetchLinkMetadata(cleanUrl)
      .then(data => {
        if (active) setMeta(data);
      })
      .catch(() => {});
    return () => { active = false; };
  }, [cleanUrl]);

  const displayTitle = meta?.title || (typeof children === 'string' ? children : '') || displayHost;
  const displayDesc = meta?.description || '';
  const displayImage = meta?.image || '';
  const favicon = meta?.favicon || getFavicon(cleanUrl);

  return (
    <span className="relative inline-block group/link align-middle">
      <a
        href={cleanUrl}
        target="_blank"
        rel="noopener noreferrer"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="inline-flex items-center gap-1.5 px-2 py-0.5 mx-0.5 rounded bg-emerald-500/[0.04] dark:bg-emerald-500/[0.02] border border-emerald-500/15 hover:border-emerald-500/35 hover:bg-emerald-500/[0.08] transition-all duration-200 text-emerald-500 font-semibold no-underline text-[12px] align-middle shadow-sm hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.3)] cursor-pointer"
      >
        <span className="shrink-0 flex items-center justify-center" style={{ color: brand ? brand.color : 'inherit' }}>
          {brand ? (
            brand.icon("w-3 h-3")
          ) : (
            <img
              src={favicon}
              alt=""
              className="w-3 h-3 object-contain"
              onError={(e) => { (e.target as HTMLImageElement).src = 'https://www.google.com/s2/favicons?domain=google.com&sz=32'; }}
            />
          )}
        </span>
        <span className="truncate max-w-[160px]">{displayTitle}</span>
        <ExternalLink size={9} className="opacity-0 group-hover/link:opacity-100 transition-opacity shrink-0" />
      </a>

      {showTooltip && (meta?.title || meta?.description) && (
        <div className="absolute z-[9999] bottom-full left-1/2 -translate-x-1/2 mb-2 w-[280px] p-3 bg-white dark:bg-zinc-950 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.15)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.42)] border border-[var(--border-main)] dark:border-zinc-800 flex flex-col gap-2 pointer-events-none transition-all duration-300">
          <div className="flex items-start gap-2 min-w-0">
            <div className="w-5.5 h-5.5 rounded overflow-hidden bg-zinc-100 dark:bg-zinc-900 flex-shrink-0 flex items-center justify-center border border-[var(--border-main)]/40 text-emerald-500">
              {brand ? brand.icon("w-3.5 h-3.5") : <img src={favicon} className="w-3.5 h-3.5 object-contain" alt="" />}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[11px] font-bold text-[var(--text-primary)] block truncate">
                {displayTitle}
              </span>
              <span className="text-[9px] text-[var(--text-muted)] block truncate opacity-70">
                {displayHost}
              </span>
            </div>
          </div>

          {displayDesc && (
            <p className="text-[9.5px] text-[var(--text-muted)] leading-relaxed mt-0.5 pt-1.5 border-t border-[var(--border-main)]/30 dark:border-zinc-800/40 font-normal line-clamp-3">
              {displayDesc}
            </p>
          )}

          {displayImage && (
            <div className="w-full h-24 overflow-hidden rounded bg-zinc-100 dark:bg-zinc-800 border border-[var(--border-main)]/40 mt-1">
              <img src={displayImage} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
            </div>
          )}
        </div>
      )}
    </span>
  );
};

const MarkdownCitationLink = ({ citation, index }: { citation: any, index: number }) => {
  const [meta, setMeta] = useState<any>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const cleanUrl = getCleanUrl(citation.url || citation.link || '');
  const displayHost = cleanUrl ? cleanUrl.replace(/^https?:\/\//i, '').split('/')[0] : '';
  const brand = getPlatformBrand(cleanUrl);

  useEffect(() => {
    if (!cleanUrl) return;
    let active = true;
    fetchLinkMetadata(cleanUrl)
      .then(data => {
        if (active) setMeta(data);
      })
      .catch(() => {});
    return () => { active = false; };
  }, [cleanUrl]);

  const displayTitle = meta?.title || citation.title || displayHost;
  const displayDesc = meta?.description || citation.snippet || '';
  const displayImage = meta?.image || '';
  const favicon = meta?.favicon || getFavicon(cleanUrl);

  return (
    <span className="relative inline-flex items-center align-middle group/cite mx-0.5">
      <a
        href={cleanUrl}
        target="_blank"
        rel="noopener noreferrer"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="inline-flex items-center justify-center w-4 h-4 rounded-full transition-all duration-350 transform hover:scale-110 cursor-pointer overflow-hidden border border-transparent hover:border-emerald-500/20"
      >
        <span 
          className="w-3.5 h-3.5 flex items-center justify-center shrink-0 text-gray-400 group-hover/cite:text-emerald-500 group-hover/cite:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)] transition-all duration-300"
          style={{ color: brand ? brand.color : 'inherit' }}
        >
          {brand ? brand.icon("w-3.5 h-3.5 rounded-full") : <img src={favicon} className="w-3.5 h-3.5 object-contain rounded-full bg-white dark:bg-zinc-805" alt="" />}
        </span>
      </a>

      {showTooltip && (displayTitle || displayDesc) && (
        <div className="absolute z-[9999] bottom-full left-1/2 -translate-x-1/2 mb-2 w-[280px] p-3 bg-white dark:bg-zinc-950 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.15)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.42)] border border-[var(--border-main)] dark:border-zinc-800 flex flex-col gap-2 pointer-events-none transition-all duration-300">
          <div className="flex items-start gap-2 min-w-0">
            <div className="w-5.5 h-5.5 rounded overflow-hidden bg-zinc-100 dark:bg-zinc-900 flex-shrink-0 flex items-center justify-center border border-[var(--border-main)]/40 text-emerald-500">
              {brand ? brand.icon("w-3.5 h-3.5") : <img src={favicon} className="w-3.5 h-3.5 object-contain" alt="" />}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[11px] font-bold text-[var(--text-primary)] block truncate border-b border-[var(--border-main)]/35 dark:border-zinc-800/40 pb-1 mb-1">
                {displayTitle}
              </span>
              <span className="text-[9px] text-[var(--text-muted)] block truncate opacity-70">
                {displayHost}
              </span>
            </div>
          </div>

          {displayDesc && (
            <p className="text-[9.5px] text-[var(--text-muted)] leading-relaxed mt-0.5 font-normal line-clamp-3">
              {displayDesc}
            </p>
          )}

          {displayImage && (
            <div className="w-full h-24 overflow-hidden rounded bg-zinc-100 dark:bg-zinc-800 border border-[var(--border-main)]/40 mt-1">
              <img src={displayImage} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
            </div>
          )}
        </div>
      )}
    </span>
  );
};

const Citations = ({ citations, dir, isOpen, onToggle, query }: { citations: Message['citations'], dir: 'ltr' | 'rtl', isOpen: boolean, onToggle: () => void, query?: string }) => {
  if (!citations || citations.length === 0) return null;

  return (
    <div className="mt-4" id="citations-container">
      <button 
        onClick={onToggle}
        className="flex items-center gap-2.5 px-3.5 py-1.5 rounded bg-transparent border border-[var(--border-main)] hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-theme group shadow-sm active:scale-95 cursor-pointer"
      >
        <div className="flex -space-x-1.5 rtl:space-x-reverse">
          {citations.slice(0, 3).map((cite, i) => {
            const rawUrl = cite.url || cite.link || '';
            const cleanUrl = getCleanUrl(rawUrl);
            const brand = getPlatformBrand(cleanUrl);
            return (
              <div 
                key={i} 
                className="w-5 h-5 rounded-full bg-white dark:bg-zinc-800 border border-[var(--border)] flex items-center justify-center overflow-hidden shadow-sm z-[10]"
                style={{ color: brand ? brand.color : 'inherit' }}
              >
                {brand ? (
                  brand.icon("w-3 h-3")
                ) : (
                  <img 
                    src={getFavicon(cleanUrl)} 
                    alt="" 
                    className="w-3 h-3 object-contain"
                    onError={(e) => { (e.target as HTMLImageElement).src = 'https://www.google.com/s2/favicons?domain=google.com&sz=32'; }}
                  />
                )}
              </div>
            );
          })}
        </div>
        <div className="w-px h-3 bg-[var(--border)] mx-0.5" />
        <span className="text-[11px] font-black text-[var(--text-secondary)] group-hover:text-emerald-500 transition-theme uppercase tracking-wider">
          {citations.length} {dir === 'rtl' ? 'مصادر موثقة' : 'Verified Sources'}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          className="text-[var(--text-muted)] group-hover:text-emerald-500 transition-theme"
        >
          <Plus size={11} strokeWidth={3} />
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0, y: -5 }}
            animate={{ height: 'auto', opacity: 1, y: 0 }}
            exit={{ height: 0, opacity: 0, y: -5 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="pt-3 max-w-full flex flex-col gap-1">
              {citations.map((cite, idx) => (
                <CitationRow 
                  key={idx} 
                  cite={cite} 
                  idx={idx} 
                  dir={dir} 
                  getCleanUrl={getCleanUrl} 
                  getFavicon={getFavicon} 
                  query={query}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const FollowUps = ({ followUps, onSelect, dir }: { followUps: string[], onSelect: (q: string) => void, dir: 'ltr' | 'rtl' }) => {
  if (!followUps || followUps.length === 0) return null;

  return (
    <div className="mt-8 pt-6 border-t border-[var(--border-main)]" id="follow-ups-container">
      <div className="flex items-center gap-2 mb-4 px-0">
        <Sparkles size={14} className="text-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]" />
        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-500">
          {dir === 'rtl' ? 'استكمال البحث' : 'FURTHER EXPLORATION'}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {followUps.map((q, idx) => (
          <button
            key={idx}
            onClick={() => onSelect(q)}
            id={`follow-up-${idx}`}
            className="flex items-center gap-3 sm:gap-4 px-4 py-3.5 bg-transparent border border-[var(--border-main)] hover:border-emerald-500/40 hover:bg-emerald-500/[0.03] transition-theme text-start relative overflow-hidden rounded-md flex-row"
          >
            <div className="w-8 h-8 rounded-sm bg-[var(--bg-overlay)] border border-[var(--border-main)] flex items-center justify-center text-[var(--text-muted)] group-hover:text-emerald-500 group-hover:border-emerald-500/50 group-hover:shadow-[0_0_8px_rgba(16,185,129,0.3)] transition-theme shrink-0 order-first">
               <Plus size={14} className="group-hover:scale-110 transition-transform" />
            </div>
            <span className="text-[12px] sm:text-[13px] font-bold text-[var(--text-primary)] group-hover:text-emerald-500 transition-theme flex-1 min-w-0 leading-tight">
              {q}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

const InteractiveAudioPlayer = ({ body, fullContent, dir, theme, coverImageUrl }: { body: string; fullContent?: string; dir: 'ltr' | 'rtl'; theme: string; coverImageUrl: string | null }) => {
  const [status, setStatus] = useState<'idle' | 'rendering' | 'ready' | 'error'>('idle');
  const [progressPercent, setProgressPercent] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(30);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);

  const [aiVolume, setAiVolume] = useState(0.85);
  const [uploadedVolume, setUploadedVolume] = useState(0.70);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [uploadedDuration, setUploadedDuration] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isMixerExpanded, setIsMixerExpanded] = useState(true);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const uploadedAudioRef = useRef<HTMLAudioElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const aiSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const uploadedSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const aiGainNodeRef = useRef<GainNode | null>(null);
  const uploadedGainNodeRef = useRef<GainNode | null>(null);
  const masterGainNodeRef = useRef<GainNode | null>(null);

  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (status === 'rendering') {
      setProgressPercent(0);
      const interval = setInterval(() => {
        setProgressPercent(prev => {
          if (prev >= 98) return prev;
          const inc = Math.floor(Math.random() * 8) + 4;
          return Math.min(98, prev + inc);
        });
      }, 150);
      return () => clearInterval(interval);
    } else if (status === 'ready') {
      setProgressPercent(100);
    }
  }, [status]);

  const { styleName, vocalName, durationVal } = useMemo(() => {
    const bodyText = (fullContent || '') + '\n' + (body || '');
    let style = 'Epic';
    let vocal = 'None';
    let dVal = 30;

    if (bodyText.includes('ملحمية') || bodyText.toLowerCase().includes('epic') || bodyText.toLowerCase().includes('orchestra')) {
      style = 'Epic';
    } else if (bodyText.includes('طرب') || bodyText.includes('شرقي') || bodyText.toLowerCase().includes('tarab') || bodyText.toLowerCase().includes('maqam')) {
      style = 'Tarab';
    } else if (bodyText.includes('إلكترونك') || bodyText.includes('دي جي') || bodyText.toLowerCase().includes('edm') || bodyText.toLowerCase().includes('techno') || bodyText.toLowerCase().includes('electronic') || bodyText.toLowerCase().includes('تقنو') || bodyText.toLowerCase().includes('تكنو')) {
      style = 'EDM';
    } else if (bodyText.includes('غيتار') || bodyText.includes('تخت') || bodyText.toLowerCase().includes('acoustic') || bodyText.toLowerCase().includes('guitar') || bodyText.toLowerCase().includes('soft') || bodyText.toLowerCase().includes('كلاسيك') || bodyText.toLowerCase().includes('هادئ')) {
      style = 'Acoustic';
    } else if (bodyText.includes('لو-فاي') || bodyText.includes('لوفاي') || bodyText.toLowerCase().includes('lofi') || bodyText.toLowerCase().includes('lo-fi') || bodyText.toLowerCase().includes('chill')) {
      style = 'LoFi';
    } else if (bodyText.includes('جاز') || bodyText.toLowerCase().includes('jazz') || bodyText.toLowerCase().includes('blues')) {
      style = 'Jazz';
    } else if (bodyText.includes('بوب') || bodyText.toLowerCase().includes('pop') || bodyText.toLowerCase().includes('upbeat')) {
      style = 'Pop';
    }

    if (bodyText.includes('كورال') || bodyText.toLowerCase().includes('choir') || bodyText.toLowerCase().includes('choral')) {
      vocal = 'Choir';
    } else if (bodyText.includes('أنثوي') || bodyText.toLowerCase().includes('female') || bodyText.toLowerCase().includes('soprano')) {
      vocal = 'Female';
    } else if (bodyText.includes('ذكوري') || bodyText.toLowerCase().includes('male') || bodyText.toLowerCase().includes('baritone') || bodyText.toLowerCase().includes('hum') || bodyText.toLowerCase().includes('تينور')) {
      vocal = 'Male';
    } else if (bodyText.includes('روبوت') || bodyText.toLowerCase().includes('vocaloid') || bodyText.toLowerCase().includes('ai synth')) {
      vocal = 'Vocaloid';
    } else if (bodyText.includes('بدون غناء') || bodyText.includes('موسيقى فقط') || bodyText.includes('عزف') || bodyText.toLowerCase().includes('instrumental') || bodyText.toLowerCase().includes('none')) {
      vocal = 'None';
    }

    const normalizedBody = bodyText
      .replace(/[٠0]/g, '0')
      .replace(/[١1]/g, '1')
      .replace(/[٢2]/g, '2')
      .replace(/[٣3]/g, '3')
      .replace(/[٤4]/g, '4')
      .replace(/[٥5]/g, '5')
      .replace(/[٦6]/g, '6')
      .replace(/[٧7]/g, '7')
      .replace(/[٨8]/g, '8')
      .replace(/[٩9]/g, '9');

    const durationMatch = normalizedBody.match(/(?:المدة|Duration|المدة الزمنية|طول)\s*:\s*\*?(\d+)/i) || normalizedBody.match(/(\d+)\s*(?:ثانية|ثوانٍ|seconds|secs|s)/i);
    if (durationMatch) {
      dVal = parseInt(durationMatch[1], 10);
      if (isNaN(dVal) || dVal < 10) dVal = 30;
    }

    return { styleName: style, vocalName: vocal, durationVal: dVal };
  }, [fullContent, body]);

  const mixDuration = uploadedFile ? Math.max(duration, uploadedDuration) : duration;

  useEffect(() => {
    let active = true;
    let createdUrl: string | null = null;
    const renderTrack = async () => {
      setStatus('rendering');
      try {
        const trackBlob = await generateProceduralTrack(styleName, vocalName, durationVal);
        if (!active) return;
        const url = URL.createObjectURL(trackBlob);
        createdUrl = url;
        setAudioUrl(url);
        setDuration(durationVal);
        setStatus('ready');
      } catch (err) {

        if (active) setStatus('error');
      }
    };
    renderTrack();

    return () => {
      active = false;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [styleName, vocalName, durationVal]);

  useEffect(() => {
    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      if (uploadedUrl) {
        URL.revokeObjectURL(uploadedUrl);
      }
    };
  }, [uploadedUrl]);

  useEffect(() => {
    if (masterGainNodeRef.current) {
      masterGainNodeRef.current.gain.setValueAtTime(isMuted ? 0 : volume, audioCtxRef.current?.currentTime || 0);
    }
  }, [volume, isMuted]);

  const updateProgress = () => {
    if (audioRef.current) {
      const mainTime = audioRef.current.currentTime;
      let displayTime = mainTime;

      if (audioRef.current.ended) {
        if (uploadedAudioRef.current && !uploadedAudioRef.current.ended && uploadedUrl) {

          displayTime = uploadedAudioRef.current.currentTime;
          setCurrentTime(displayTime);
          animationFrameRef.current = requestAnimationFrame(updateProgress);
        } else {
          setIsPlaying(false);
          setCurrentTime(0);
          if (uploadedAudioRef.current) {
            uploadedAudioRef.current.currentTime = 0;
          }
        }
      } else {

        if (uploadedAudioRef.current && !uploadedAudioRef.current.paused && uploadedUrl) {
          const diff = Math.abs(uploadedAudioRef.current.currentTime - mainTime);
          if (diff > 0.22) {
            uploadedAudioRef.current.currentTime = Math.min(mainTime, uploadedAudioRef.current.duration || 0);
          }
        }
        setCurrentTime(displayTime);
        animationFrameRef.current = requestAnimationFrame(updateProgress);
      }
    }
  };

  const handlePlayPause = async () => {
    if (!audioRef.current || status !== 'ready') return;

    let ctx = audioCtxRef.current;
    if (!ctx) {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        ctx = new AudioContextClass();
        audioCtxRef.current = ctx;

        const masterGain = ctx.createGain();
        masterGain.gain.setValueAtTime(isMuted ? 0 : volume, ctx.currentTime);
        masterGain.connect(ctx.destination);
        masterGainNodeRef.current = masterGain;
      } catch (e) {

      }
    }

    if (ctx && ctx.state === 'suspended') {
      await ctx.resume();
    }

    if (ctx && !aiSourceRef.current && masterGainNodeRef.current) {
      try {
        const aiSrc = ctx.createMediaElementSource(audioRef.current);
        const aiGain = ctx.createGain();
        aiGain.gain.setValueAtTime(aiVolume, ctx.currentTime);
        aiSrc.connect(aiGain);
        aiGain.connect(masterGainNodeRef.current);

        aiSourceRef.current = aiSrc;
        aiGainNodeRef.current = aiGain;
      } catch (err) {

      }
    }

    if (ctx && uploadedAudioRef.current && uploadedUrl && !uploadedSourceRef.current && masterGainNodeRef.current) {
      try {
        const uplSrc = ctx.createMediaElementSource(uploadedAudioRef.current);
        const uplGain = ctx.createGain();
        uplGain.gain.setValueAtTime(uploadedVolume, ctx.currentTime);
        uplSrc.connect(uplGain);
        uplGain.connect(masterGainNodeRef.current);

        uploadedSourceRef.current = uplSrc;
        uploadedGainNodeRef.current = uplGain;
      } catch (err) {

      }
    }

    if (isPlaying) {
      audioRef.current.pause();
      if (uploadedAudioRef.current && uploadedUrl) {
        uploadedAudioRef.current.pause();
      }
      setIsPlaying(false);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    } else {
      if (uploadedAudioRef.current && uploadedUrl) {
        uploadedAudioRef.current.currentTime = Math.min(audioRef.current.currentTime, uploadedAudioRef.current.duration || 0);
      }

      try {
        const playPromises = [];
        playPromises.push(audioRef.current.play());
        if (uploadedAudioRef.current && uploadedUrl) {
          playPromises.push(uploadedAudioRef.current.play());
        }

        await Promise.all(playPromises);
        setIsPlaying(true);
        animationFrameRef.current = requestAnimationFrame(updateProgress);
      } catch (err) {

      }
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (val > 0) setIsMuted(false);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !audioRef.current || status !== 'ready') return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const targetTime = percentage * mixDuration;

    audioRef.current.currentTime = targetTime;
    if (uploadedAudioRef.current && uploadedUrl) {
      uploadedAudioRef.current.currentTime = Math.min(targetTime, uploadedAudioRef.current.duration || 0);
    }
    setCurrentTime(targetTime);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith('audio/')) {
      toast.error(dir === 'rtl' ? 'يرجى تحميل ملف صوتي صالح.' : 'Please upload a valid audio file.');
      return;
    }

    if (uploadedUrl) {
      URL.revokeObjectURL(uploadedUrl);
    }

    const url = URL.createObjectURL(file);
    setUploadedFile(file);
    setUploadedUrl(url);

    if (isPlaying) {
      audioRef.current?.pause();
      if (uploadedAudioRef.current) {
        uploadedAudioRef.current.pause();
      }
      setIsPlaying(false);
    }

    setCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }

    if (uploadedSourceRef.current) {
      try {
        uploadedSourceRef.current.disconnect();
      } catch (e) {}
      uploadedSourceRef.current = null;
    }
    uploadedGainNodeRef.current = null;

    toast.success(dir === 'rtl' ? 'تم جلب الملف الصوتي المساعد للمزج!' : 'Companion file imported successfully into production mixer!');
  };

  const removeUploadedFile = () => {
    if (uploadedUrl) {
      URL.revokeObjectURL(uploadedUrl);
    }
    setUploadedFile(null);
    setUploadedUrl(null);
    setUploadedDuration(0);

    if (uploadedSourceRef.current) {
      try {
        uploadedSourceRef.current.disconnect();
      } catch (e) {}
      uploadedSourceRef.current = null;
    }
    uploadedGainNodeRef.current = null;

    setCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    }
  };

  const formatTime = (timeInSecs: number) => {
    const min = Math.floor(timeInSecs / 60);
    const sec = Math.floor(timeInSecs % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  const styleDisplayMap: Record<string, { ar: string; en: string }> = {
    'Epic': { ar: 'أوركسترا ملحمية', en: 'Epic Orchestral' },
    'Tarab': { ar: 'طرب ومقام شرقي', en: 'Arabic Tarab' },
    'EDM': { ar: 'إلكترونك ودي جي', en: 'EDM & Techno' },
    'Acoustic': { ar: 'غيتار وتخت هادئ', en: 'Acoustic & Soft' },
    'LoFi': { ar: 'لو-فاي مريح', en: 'Chill Lo-Fi' },
    'Jazz': { ar: 'جاز بلوز', en: 'Jazz & Blues' },
    'Pop': { ar: 'بوب حماسي', en: 'Energetic Pop' }
  };

  const vocalDisplayMap: Record<string, { ar: string; en: string }> = {
    'None': { ar: 'مقطوعة موسيقية', en: 'Instrumental Only' },
    'Choir': { ar: 'صوت كورال سينمائي', en: 'Cinematic Choir vocal' },
    'Female': { ar: 'أداء سوبرانو نسائي', en: 'Soprano Female vocal' },
    'Male': { ar: 'غناء تينور ذكوري', en: 'Tenor Male vocal' },
    'Vocaloid': { ar: 'سنتسيزر ذكاء اصطناعي', en: 'AI Vocal Synthesizer' }
  };

  const styleLabel = styleDisplayMap[styleName] || { ar: styleName, en: styleName };
  const vocalLabel = vocalDisplayMap[vocalName] || { ar: vocalName, en: vocalName };

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-3xl mx-auto">
      {audioUrl && (
        <audio 
          ref={audioRef} 
          src={audioUrl} 
          onLoadedMetadata={() => audioRef.current && setDuration(audioRef.current.duration)} 
        />
      )}

      {uploadedUrl && (
        <audio
          ref={uploadedAudioRef}
          src={uploadedUrl}
          onLoadedMetadata={() => {
            if (uploadedAudioRef.current) {
              setUploadedDuration(uploadedAudioRef.current.duration);
            }
          }}
        />
      )}

      <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-emerald-500/15 shadow-2xl bg-black">
        {coverImageUrl ? (
          <img 
            src={coverImageUrl} 
            className={`w-full h-full object-cover opacity-50 transition-transform duration-700 ${isPlaying ? 'scale-105' : 'scale-100'}`} 
            referrerPolicy="no-referrer" 
            alt="Orchestra Cover" 
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#0b0c10] via-gray-950 to-black flex items-center justify-center">
             <Music className={`text-emerald-500/10 transition-transform duration-1000 ${isPlaying ? 'rotate-6 scale-110' : ''}`} size={140} />
          </div>
        )}

        {}
        <div className={`absolute top-4 ${dir === 'rtl' ? 'right-4' : 'left-4'} flex flex-col gap-1 z-10`}>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[9px] font-black tracking-widest text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            {dir === 'rtl' ? styleLabel.ar : styleLabel.en}
          </div>
          <p className="text-[10px] text-gray-400 font-medium px-1">
            {dir === 'rtl' ? vocalLabel.ar : vocalLabel.en}
          </p>
        </div>

        {}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/30 backdrop-blur-[2px]">
          {status === 'rendering' || status === 'idle' ? (
            <div className="flex flex-col items-center gap-3">
              <div className="relative flex items-center justify-center">
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                  className="w-20 h-20 rounded-full border-2 border-t-emerald-500 border-r-emerald-500/30 border-b-emerald-500/10 border-l-transparent shadow-[0_0_30px_rgba(16,185,129,0.15)]" 
                />
                <div className="absolute w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center backdrop-blur-sm">
                  <span className="text-[11px] font-mono font-black text-emerald-400">
                    {progressPercent}%
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-center text-center">
                <span className="text-[11px] font-black text-emerald-400 uppercase tracking-widest animate-pulse leading-none mb-1">
                  {dir === 'rtl' ? 'جاري التوليف الابتكاري والهندسة الفنية...' : 'SYNTHESIZING & ORCHESTRATING SOUNDWAVE...'}
                </span>
                <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">
                  {dir === 'rtl' ? 'جودة فائقة الدقة استوديو 24 بت' : 'ULTRA-RES 24-BIT DIGITAL SIGNAL PROCESSING'}
                </span>
              </div>
            </div>
          ) : status === 'error' ? (
            <div className="flex flex-col items-center gap-2 text-rose-500">
               <AlertTriangle size={32} className="animate-bounce" />
               <span className="text-xs font-black uppercase tracking-wider">
                 {dir === 'rtl' ? 'فشل إعداد المسار الصوتي' : 'SOUND GENERATION ERROR'}
               </span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <button 
                onClick={handlePlayPause}
                className="w-20 h-20 rounded-full bg-emerald-500/20 backdrop-blur-md border-2 border-emerald-500/40 hover:border-emerald-500 hover:bg-emerald-500/30 text-emerald-500 shadow-[0_0_40px_rgba(16,185,129,0.25)] flex items-center justify-center hover:scale-105 active:scale-95 cursor-pointer transition-all duration-300"
                title={isPlaying ? (dir === 'rtl' ? 'إيقاف مؤقت' : 'Pause') : (dir === 'rtl' ? 'تشغيل' : 'Play')}
              >
                {isPlaying ? (
                  <Pause size={30} className="fill-emerald-500 text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                ) : (
                  <Play size={30} className="ml-1.5 fill-emerald-500 text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                )}
              </button>

              <div className="text-center px-6">
                <h4 className="text-sm font-black text-white tracking-[0.2em] uppercase mb-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                  {dir === 'rtl' ? 'تحفة الأوركسترا من بيربليكستا' : 'PERPLEXTA ORCHESTRA MASTERPIECE'}
                </h4>
                <p className="text-[9px] text-emerald-400 font-black tracking-widest uppercase">
                  {dir === 'rtl' ? 'أصلية بالكامل • جودة استوديو 24 بت' : 'FULLY ORIGINAL • 24-BIT CUSTOM SYNTH'}
                </p>
              </div>
            </div>
          )}
        </div>

        {}
        <div className="absolute bottom-0 left-0 w-full h-12 flex items-end justify-center gap-1 sm:gap-1.5 px-6 pb-4 opacity-65 pointer-events-none">
          {Array.from({ length: 36 }).map((_, i) => {
            let scaleVal = 4;
            if (status === 'ready' && isPlaying) {
              const speed = 0.15;
              const indexFactor = Math.sin(i * 0.4 + currentTime * 8);
              const volumeFactor = 16 + indexFactor * 12;
              scaleVal = Math.max(4, Math.min(26, volumeFactor));
              return (
                <div 
                  key={i}
                  style={{ height: `${scaleVal}px` }}
                  className="w-1 bg-emerald-500/70 rounded-full transition-all duration-100 shadow-[0_0_8px_rgba(16,185,129,0.4)]"
                />
              );
            } else if (status === 'rendering' || status === 'idle') {

              return (
                <motion.div 
                  key={i}
                  animate={{ 
                    height: [4, 18 + Math.sin(i * 0.5) * 10, 4] 
                  }}
                  transition={{ 
                    duration: 1.5, 
                    repeat: Infinity, 
                    ease: "easeInOut",
                    delay: i * 0.05 
                  }}
                  className="w-1 bg-emerald-500/60 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                />
              );
            } else {

              scaleVal = 4 + Math.sin(i * 0.3) * 3;
              return (
                <div 
                  key={i}
                  style={{ height: `${scaleVal}px` }}
                  className="w-1 bg-emerald-500/40 rounded-full transition-all duration-100 shadow-[0_0_4px_rgba(16,185,129,0.1)]"
                />
              );
            }
          })}
        </div>
      </div>

      {}
      <div className={`w-full px-5 py-4 rounded-md border flex flex-col gap-3 ${
        theme === 'dark' 
          ? 'bg-[#151518] border-gray-800/40' 
          : 'bg-gray-50/80 border-gray-200/65'
      }`}>
        <div className="flex items-center justify-between gap-4 w-full">
          {}
          <span className="text-[11px] font-mono font-bold text-[var(--text-muted)] min-w-[34px]">
            {formatTime(currentTime)}
          </span>

          {}
          <div 
            ref={progressBarRef}
            onClick={handleTimelineClick}
            className="flex-1 h-2 relative rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden cursor-pointer group"
          >
            <div 
              style={{ width: `${(currentTime / mixDuration) * 100}%` }}
              className="absolute left-0 top-0 h-full bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.7)]"
            />
            {}
            <div 
              style={{ left: `calc(${(currentTime / mixDuration) * 100}% - 4px)` }}
              className="absolute top-0 w-2 h-2 rounded-full bg-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
            />
          </div>

          <span className="text-[11px] font-mono font-bold text-[var(--text-muted)] min-w-[34px]">
            {formatTime(mixDuration)}
          </span>
        </div>

        <div className="flex items-center justify-between w-full pt-1">
          {}
          <div className="flex items-center gap-2">
            <button 
              onClick={toggleMute}
              className="w-10 h-10 rounded-[4px] bg-transparent border border-transparent transition-all duration-300 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-center text-gray-400 hover:text-emerald-500 hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]"
              title={isMuted ? (dir === 'rtl' ? 'إلغاء كتم الصوت' : 'Unmute') : (dir === 'rtl' ? 'كتم الصوت' : 'Mute')}
            >
              <Volume2 size={16} className={isMuted ? 'text-gray-500 line-through' : 'text-emerald-500 hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]'} />
            </button>

            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-16 sm:w-24 h-1 rounded-lg accent-emerald-500 bg-gray-200 dark:bg-gray-700 cursor-pointer"
            />
          </div>

          {}
          <div className="hidden sm:flex flex-col text-center">
            <span className="text-[10px] text-[#10b981] font-[#10b981] drop-shadow-[0_0_8px_rgba(16,185,129,0.6)] font-bold uppercase tracking-widest leading-none">
              {styleName} • {vocalName}
            </span>
            <span className="text-[8px] text-[var(--text-muted)] font-mono mt-0.5">
              {durationVal} SECONDS / 16-BIT PCM WAV
            </span>
          </div>

          {}
          {audioUrl && status === 'ready' ? (
            <a 
              href={audioUrl}
              download={`perplexta_song_${styleName.toLowerCase()}_${durationVal}s.wav`}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-[4px] bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-black uppercase text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all duration-300 group/down shadow-md"
              title={dir === 'rtl' ? 'تنزيل الأغنية بصيغة WAV' : 'Download fully-mastered WAV track'}
            >
              <Download size={12} className="group-hover/down:translate-y-0.5 transition-transform duration-300" />
              <span>{dir === 'rtl' ? 'تنزيل المسار الرئيسي' : 'DOWNLOAD MASTER'}</span>
            </a>
          ) : (
            <button 
              disabled
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-[4px] bg-transparent border border-gray-200 dark:border-gray-800 text-[10px] font-black uppercase text-[var(--text-muted)] opacity-50"
            >
              <Loader2 size={12} className="animate-spin" />
              <span>{dir === 'rtl' ? 'تجهيز التحميل' : 'COMPILING...'}</span>
            </button>
          )}
        </div>
      </div>

      {}
      <div className={`w-full px-5 py-4 rounded-md border flex flex-col gap-4 transition-all duration-300 ${
        theme === 'dark' 
          ? 'bg-[#151518]/95 border-gray-800/40 shadow-xl' 
          : 'bg-white border-gray-200/65 shadow-sm'
      }`}>
        <div className="flex items-center justify-between border-b border-gray-200/65 dark:border-gray-800/45 pb-3">
          <div className="flex items-center gap-2">
            <div className="relative">
              <span className="absolute inset-0 bg-emerald-500 rounded-full blur-[6px] opacity-15 animate-pulse" />
              <Sliders size={16} className="text-emerald-400 relative drop-shadow-[0_0_6px_rgba(16,185,129,0.4)]" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest leading-none mb-1">
                {dir === 'rtl' ? 'مستودع هندسة وتوليف الصوت' : 'STUDIO PRODUCTION MIXER'}
              </span>
              <h5 className="text-[12px] font-bold text-[var(--text-primary)] leading-none">
                {dir === 'rtl' ? 'دمج المسارات والملفات المحلية' : 'Multi-Channel Live Web Audio Console'}
              </h5>
            </div>
          </div>

          <button 
            type="button"
            onClick={() => setIsMixerExpanded(!isMixerExpanded)}
            className="text-[10px] font-black text-[var(--text-muted)] hover:text-emerald-500 hover:drop-shadow-[0_0_6px_rgba(16,185,129,0.3)] uppercase tracking-wider transition-colors pt-1"
          >
            {isMixerExpanded 
              ? (dir === 'rtl' ? 'طي اللوحة' : 'COLLAPSE PANEL') 
              : (dir === 'rtl' ? 'توسيع ومزج الملفات' : 'EXPAND & MIX')}
          </button>
        </div>

        {isMixerExpanded && (
          <div className="flex flex-col gap-5 animate-fadeIn">
            {}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                  {dir === 'rtl' ? 'تحميل مسار خارجي / صوت مضاف' : 'UPLOAD COMPANION/VOCAL TRACK'}
                </span>

                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-md p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 ${
                    uploadedFile 
                      ? 'border-emerald-500/30 bg-emerald-500/[0.02]' 
                      : isDragging 
                        ? 'border-emerald-500 bg-emerald-500/[0.04]' 
                        : 'border-gray-300 dark:border-gray-800/80 hover:border-emerald-500/40 hover:bg-emerald-500/[0.01]'
                  }`}
                >
                  <input 
                    ref={fileInputRef}
                    type="file" 
                    accept="audio/*" 
                    onChange={handleFileChange}
                    className="hidden" 
                  />

                  {uploadedFile ? (
                    <div className="flex flex-col items-center gap-1.5 w-full">
                      <div className="flex items-center gap-2 text-emerald-400">
                        <Check size={16} />
                        <span className="text-[11px] font-bold truncate max-w-[180px]">{uploadedFile.name}</span>
                      </div>
                      <span className="text-[9px] text-[var(--text-muted)] font-mono uppercase">
                        {(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB • {formatTime(uploadedDuration)} • {uploadedFile.type.split('/')[1]?.toUpperCase()}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeUploadedFile();
                        }}
                        className="mt-1.5 px-2 py-1 rounded-[3px] bg-red-500/10 border border-red-500/20 text-[9px] font-black text-red-400 hover:bg-red-500 hover:text-white transition-all uppercase"
                      >
                        {dir === 'rtl' ? 'إزالة الملف' : 'REMOVE TRACK'}
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Paperclip 
                        size={18} 
                        className={`transition-colors duration-300 ${
                          isDragging ? 'text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'text-gray-400'
                        }`} 
                      />
                      <div className="flex flex-col gap-0.5 animate-pulse">
                        <span className="text-[11px] font-bold text-[var(--text-primary)]">
                          {dir === 'rtl' ? 'اسحب وأفلت الملف الصوتي هنا' : 'Drag & drop companion audio'}
                        </span>
                        <span className="text-[9px] text-[var(--text-muted)]">
                          {dir === 'rtl' ? 'أو انقر للتصفح من جهازك (MP3, WAV, M4A)' : 'or click to browse local files (MP3, WAV, M4A)'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {}
              <div className="flex flex-col gap-3 justify-center">
                <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">
                  {dir === 'rtl' ? 'لوحة التحكم بمستويات الصوت (دمج حي)' : 'CHANNEL MIXER CONTROLS'}
                </span>

                {}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="font-bold text-[var(--text-primary)] flex items-center gap-1">
                      <Sparkles size={11} className="text-emerald-400" />
                      {dir === 'rtl' ? 'قناة الذكاء الاصطناعي (مورث)' : 'AI Synthesized Stem'}
                    </span>
                    <span className="font-mono text-emerald-500 font-bold">
                      {Math.round(aiVolume * 100)}%
                    </span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.01"
                    disabled={status !== 'ready'}
                    value={aiVolume}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setAiVolume(val);
                      if (aiGainNodeRef.current) {
                        aiGainNodeRef.current.gain.setValueAtTime(val, audioCtxRef.current?.currentTime || 0);
                      }
                    }}
                    className="w-full h-1.5 rounded-lg accent-emerald-500 bg-gray-200 dark:bg-gray-800 cursor-pointer disabled:opacity-50"
                  />
                </div>

                {}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="font-bold text-[var(--text-primary)] flex items-center gap-1">
                      <Paperclip size={11} className={uploadedFile ? 'text-emerald-400' : 'text-gray-500'} />
                      {dir === 'rtl' ? 'القناة المضافة الخارجية' : 'External Companion Stem'}
                    </span>
                    <span className={`font-mono font-bold ${uploadedFile ? 'text-emerald-500' : 'text-gray-500'}`}>
                      {uploadedFile ? `${Math.round(uploadedVolume * 100)}%` : (dir === 'rtl' ? 'غير نشط' : 'INACTIVE')}
                    </span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.01"
                    disabled={!uploadedFile}
                    value={uploadedVolume}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setUploadedVolume(val);
                      if (uploadedGainNodeRef.current) {
                        uploadedGainNodeRef.current.gain.setValueAtTime(val, audioCtxRef.current?.currentTime || 0);
                      }
                    }}
                    className="w-full h-1.5 rounded-lg accent-emerald-500 bg-gray-200 dark:bg-gray-800 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {}
            <div className="flex items-center gap-2 px-3 py-2 rounded bg-black/5 dark:bg-white/[0.02] border border-gray-200/50 dark:border-gray-800/30 text-[10px] text-[var(--text-muted)] font-medium leading-normal">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span>
                {dir === 'rtl' 
                  ? 'بروتوكول ويب أوديو (Web Audio API) يقوم بدمج المسارين في بث واحد فائق الدقة ٢٤ بت بالوقت الفعلي.' 
                  : 'High-fidelity 24-bit real-time digital mixing pipeline driven entirely by your browser Web Audio API.'
                }
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const ProductionSuite = ({ content, dir, theme }: { content: string; dir: 'ltr' | 'rtl'; theme: string }) => {
  const sections: { title: string; body: string; id: string }[] = [];

  const splitRegex = /(?:^|\n)(?:#\s*|[\d]\.\s*)?\[(?:I|II|III)\.\s*[^\]]+\]/g;
  const rawSections = content.split(splitRegex).filter(s => s.trim().length > 0);
  const titles = (content.match(splitRegex) || []) as string[];

  titles.forEach((title: string, idx: number) => {
    sections.push({
      id: `section-${idx}`,
      title: title.replace(/#\s*\[/, '').replace(/\]/, '').trim(),
      body: rawSections[idx] || ''
    });
  });

  const coverSection = sections.find(s => s.title.includes('الغلاف') || s.title.toLowerCase().includes('cover'));
  const coverMatch = coverSection?.body.match(/!\[.*?\]\((.*?)\)/);
  const coverImageUrl = coverMatch ? coverMatch[1] : null;

  const isAudioConcept = content.includes('[I. Cover') || content.includes('[II. Audio') || content.includes('البيئة الصوتية') || content.includes('الأوركسترا');
  if (sections.length === 0 && !isAudioConcept) {
    return <Markdown remarkPlugins={[remarkGfm]} components={{ code: CodeBlock as any, p: 'div', a: ({ href, children }: any) => <MarkdownLink href={href}>{children}</MarkdownLink>, blockquote: ({ children }: any) => <BlockquoteWithActions dir={dir}>{children}</BlockquoteWithActions> }}>{content}</Markdown>;
  }

  const canonicalSlots = [
    {
      phase: 1,
      id: 'phase-1-cover',
      titleEn: 'I. COVER & MOOD ART',
      titleAr: 'أولاً: غلاف الألبوم واللوحة الفنية المعبرة',
      pendingTextEn: 'Designing album cover artwork and visual branding concepts...',
      pendingTextAr: 'جاري توليد وصياغة غلاف الألبوم الرشيق وتجلياته البصرية...',
      icon: 'image'
    },
    {
      phase: 2,
      id: 'phase-2-env',
      titleEn: 'II. AUDIO SUITE ENVIRONMENT',
      titleAr: 'ثانياً: هندسة البيئة الصوتية والآلات الموسيقية',
      pendingTextEn: 'Calibrating digital audio workstation environment, frequencies and scales...',
      pendingTextAr: 'جاري معايرة مقامات الصوت الفنية وضبط توزيع ترددات الآلات...',
      icon: 'sliders'
    },
    {
      phase: 3,
      id: 'phase-3-sonic',
      titleEn: 'III. SONIC ORCHESTRATION',
      titleAr: 'ثالثاً: المقطع الموسيقي واللحن النهائي التفاعلي',
      pendingTextEn: 'Orchestrating musical composition parameters and final DSP rendering...',
      pendingTextAr: 'جاري تأليف المقامات الصوتية المتقدمة وتحضير التوزيع الفني للمركبات اللحنية...',
      icon: 'music'
    }
  ];

  const slots = canonicalSlots.map((canon, i) => {
    let matched = sections.find(sec => {
      const lowerT = sec.title.toLowerCase();
      if (i === 0) return lowerT.includes('cover') || lowerT.includes('art') || lowerT.includes('غلاف');
      if (i === 1) return lowerT.includes('environment') || lowerT.includes('بيئة') || lowerT.includes('suite');
      if (i === 2) return lowerT.includes('orchestration') || lowerT.includes('sonic') || lowerT.includes('مقطع') || lowerT.includes('موسيقي');
      return false;
    });

    if (!matched && sections[i] && i === sections.length - 1) {
      matched = sections[i];
    }

    return {
      canon,
      data: matched || null,
      isPending: !matched
    };
  });

  return (
    <div className="flex flex-col gap-10 py-4 w-full">
      {slots.map((slot, idx) => {
        const { canon, data, isPending } = slot;
        const isMusicSection = canon.phase === 3;
        const currentTitle = dir === 'rtl' ? canon.titleAr : canon.titleEn;

        return (
          <motion.div
            key={canon.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
              duration: 0.3, 
              delay: idx * 0.1,
              ease: [0.22, 1, 0.36, 1] 
            }}
            className={`relative overflow-hidden rounded-lg border transition-theme group ${
              theme === 'dark' 
                ? 'bg-[#121214] border-[var(--border)] shadow-[0_20px_50px_rgba(0,0,0,0.5)]' 
                : 'bg-[var(--bg-surface)] border-[var(--border)] shadow-none'
            } ${isPending ? 'opacity-85 border-dashed border-emerald-500/20 bg-emerald-500/[0.01]' : ''}`}
          >
            {}
            <div className={`px-8 py-6 border-b flex items-center justify-between ${
              theme === 'dark' ? 'border-[var(--border)] bg-[var(--bg-surface)]' : 'border-[var(--border)] bg-[var(--bg-base)]'
            }`}>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-emerald-500 rounded-full blur-md opacity-20" />
                  <div className={`relative w-2 h-8 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.4)] ${isPending ? 'bg-amber-500/50 animate-pulse' : 'bg-emerald-500'}`} />
                </div>
                <div className="flex flex-col">
                  <span className={`text-[10px] font-black uppercase tracking-[0.3em] mb-0.5 ${isPending ? 'text-amber-500' : 'text-emerald-500 glow-emerald'}`}>
                    {dir === 'rtl' ? 'مرحلة إنتاج بيربليكستا' : 'PERPLEXTA PRODUCTION PHASE'} {canon.phase}
                  </span>
                  <h3 className={`text-xl font-black tracking-tight uppercase ${isPending ? 'text-[var(--text-primary)] opacity-60 animate-pulse' : 'text-[var(--text-primary)]'}`}>
                    {currentTitle}
                  </h3>
                </div>
              </div>

              <div className="hidden md:flex items-center gap-4">
                 <div className="flex flex-col items-end">
                   <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest leading-none mb-1">
                     {dir === 'rtl' ? 'حالة العمل' : 'COMPILATION'}
                   </span>
                    <div className="flex items-center gap-2">
                     <div className={`w-1.5 h-1.5 rounded-full ${isPending ? 'bg-amber-400' : 'bg-emerald-500'} animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]`} />
                     <span className={`text-[10px] font-black uppercase ${isPending ? 'text-amber-400' : 'text-emerald-500'}`}>
                       {isPending ? (dir === 'rtl' ? 'في الانتظار' : 'QUEUED') : (dir === 'rtl' ? 'مكتمل' : 'RESOLVED')}
                     </span>
                   </div>
                 </div>
                 <div className="w-px h-8 bg-[var(--border)]" />
                 <div className="flex flex-col items-end">
                   <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest leading-none mb-1">
                     {dir === 'rtl' ? 'دقة الإخراج' : 'OUTPUT PRECISION'}
                   </span>
                   <span className="text-[10px] font-black text-[var(--text-primary)]">
                     {isPending ? '--' : '99.8%'}
                   </span>
                 </div>
              </div>
            </div>

            {}
            <div className={`p-8 md:p-10 text-[13px] md:text-base ${isMusicSection ? 'text-center' : ''}`}>
              <div className="markdown-body prose dark:prose-invert max-w-none prose-p:leading-relaxed prose-headings:mb-4 prose-headings:mt-8">
                {isPending ? (
                  <div className="flex flex-col gap-4 py-4">
                    {canon.phase === 3 ? (

                      <div className="flex flex-col items-center gap-6">
                        <InteractiveAudioPlayer 
                          body="" 
                          fullContent={content}
                          dir={dir} 
                          theme={theme} 
                          coverImageUrl={coverImageUrl} 
                        />
                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 animate-pulse justify-center">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                          <span>{dir === 'rtl' ? canon.pendingTextAr : canon.pendingTextEn}</span>
                        </div>
                      </div>
                    ) : (

                      <div className="space-y-3">
                        <div className="h-4 bg-emerald-500/5 rounded-md w-3/4 animate-pulse border border-emerald-500/10" />
                        <div className="h-4 bg-emerald-500/5 rounded-md w-1/2 animate-pulse border border-emerald-500/10" />
                        <div className="h-4 bg-emerald-500/5 rounded-md w-5/6 animate-pulse border border-emerald-500/10" />
                        <p className="text-xs text-[var(--text-muted)] font-bold animate-pulse mt-4">
                          {dir === 'rtl' ? canon.pendingTextAr : canon.pendingTextEn}
                        </p>
                      </div>
                    )}
                  </div>
                ) : isMusicSection ? (
                  <div className="flex flex-col items-center gap-8">
                    {}
                    <InteractiveAudioPlayer 
                      body={data?.body || ''} 
                      fullContent={content}
                      dir={dir} 
                      theme={theme} 
                      coverImageUrl={coverImageUrl} 
                    />

                    <Markdown 
                      remarkPlugins={[remarkGfm]} 
                      components={{ 
                        code: CodeBlock as any,
                        img: () => null, 
                        p: 'div',
                        blockquote: ({ children }: any) => <BlockquoteWithActions dir={dir}>{children}</BlockquoteWithActions>
                      }}
                    >
                      {data?.body || ''}
                    </Markdown>
                  </div>
                ) : (
                  <Markdown 
                    remarkPlugins={[remarkGfm]} 
                    components={{ 
                      code: CodeBlock as any,
                      p: 'div',
                      blockquote: ({ children }: any) => <BlockquoteWithActions dir={dir}>{children}</BlockquoteWithActions>,
                      img: ({ node, ...props }: any) => (
                        <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-emerald-500/20 shadow-2xl group/video">
                          <img {...props} className="w-full h-full object-cover transition-transform duration-300 group-hover/video:scale-110" referrerPolicy="no-referrer" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-center justify-center">
                             <div className="w-20 h-20 rounded-full bg-emerald-500/20 backdrop-blur-md border border-emerald-500/30 flex items-center justify-center text-emerald-500 animate-pulse">
                               <Music size={40} />
                             </div>
                          </div>
                          <div className="absolute top-4 right-4 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full border border-white/10 text-[10px] font-bold text-white uppercase tracking-widest">
                            {dir === 'rtl' ? 'عرض فني من بيربليكستا' : 'PERPLEXTA ART VIEW'}
                          </div>
                        </div>
                      )
                    }}
                  >
                    {data?.body || ''}
                  </Markdown>
                )}
              </div>
            </div>

            {}
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-[80px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/3 blur-[100px] pointer-events-none" />
          </motion.div>
        );
      })}

      {}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="flex flex-col items-center justify-center gap-3 pt-6 pb-12"
      >
        <div className="h-px w-24 bg-gradient-to-r from-transparent via-[var(--border)] to-transparent" />
        <div className="flex items-center gap-2 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.3em]">
          <LayoutGrid size={12} className="text-emerald-500" />
          {dir === 'rtl' ? 'تم توليد الحزمة عبر محرك بيربليكستا الإبداعي' : 'GENERATED VIA PERPLEXTA CREATIVE ENGINE'}
        </div>
      </motion.div>
    </div>
  );
};

const stripProtocolMarkers = (text: string) => {
  if (!text) return text;
  return text
    .replace(/\[FOLLOW_UPS\][\s\S]*$/, '')
    .replace(/\[FOLLOW_UPS_START\][\s\S]*$/, '')
    .replace(/\[أسئلة_متابعة\][\s\S]*$/, '')
    .trim();
};

export const SystemInactiveCard = ({ data, dir }: { data: any, dir: 'rtl' | 'ltr' }) => (
  <motion.div 
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    className={`mt-4 p-6 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.02] backdrop-blur-sm self-stretch flex flex-col gap-4 relative overflow-hidden`}
  >
    <div className="absolute top-0 right-0 p-4 opacity-5">
      <Settings size={64} className="text-emerald-500" />
    </div>

    <div className="flex items-start gap-4 relative z-10">
      <div className="w-12 h-12 rounded-md bg-emerald-500/10 flex items-center justify-center text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
        <Settings size={24} className="animate-spin-slow" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500 font-sans shadow-sm">
            {dir === 'rtl' ? 'تحديث الأنظمة' : 'System Excellence Protocol'}
          </span>
        </div>
        <p className="text-[15px] font-medium text-[var(--text-primary)] leading-relaxed font-sans">
          {dir === 'rtl' ? data.error_ar : data.error}
        </p>
        <p className="text-[11px] text-[var(--text-muted)] mt-2 font-sans opacity-80">
          {dir === 'rtl' 
            ? 'نعمل حالياً على تعزيز كفاءة هذا الموديل لضمان تقديم أعلى مستويات التحليل التقني.' 
            : 'We are currently enhancing this model\'s efficiency to ensure the highest standards of technical analysis.'}
        </p>
      </div>
    </div>
  </motion.div>
);

export const QuotaExceededCard = ({ data, dir, t, navigate, user, tool }: { data: any, dir: 'rtl' | 'ltr', t: any, navigate: any, user: any, tool?: string }) => {
  const [copied, setCopied] = useState(false);
  const { triggerUpgradePrompt } = useAppContext();
  const referralLink = `${window.location.origin}/?ref=${user?.referral_code || user?.id || 'elite'}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Perplexta Intelligence',
          text: dir === 'rtl' ? 'انضم إلي في بيربليكستا واستخدم الذكاء الاصطناعي الأقوى.' : 'Join me on Perplexta and use the most powerful AI.',
          url: referralLink,
        });
      } catch (err) {
        handleCopy();
      }
    } else {
      handleCopy();
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`mt-4 p-5 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.03] backdrop-blur-sm self-stretch flex flex-col gap-4 relative overflow-hidden group`}
    >
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <Sparkles size={48} className="text-emerald-500" />
      </div>

      <div className="flex items-start gap-4 relative z-10">
        <div className="w-12 h-12 rounded-md bg-emerald-500/10 flex items-center justify-center text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
          <Zap size={24} className="animate-pulse" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500">Premium Upgrade Required</span>
          </div>
          <p className="text-[14px] font-bold text-[var(--text-primary)] leading-relaxed mb-1">
            {dir === 'rtl' ? data.error_ar : data.error}
          </p>
          <div className="flex items-center gap-4 mt-3">
             <div className="flex flex-col">
               <span className="text-[9px] font-black uppercase text-[var(--text-muted)] mb-0.5 tracking-tighter">{dir === 'rtl' ? 'الحد المتاح' : 'Available Limit'}</span>
               <span className="text-xs font-black text-emerald-500">{data.limit}</span>
             </div>
             <div className="w-px h-6 bg-[var(--border)]" />
             <div className="flex flex-col">
               <span className="text-[9px] font-black uppercase text-[var(--text-muted)] mb-0.5 tracking-tighter">{dir === 'rtl' ? 'المستخدم حالياً' : 'Currently Used'}</span>
               <span className="text-xs font-black text-[var(--text-primary)]">{data.current}</span>
             </div>
          </div>
        </div>
      </div>

      {}
      <div className="relative z-10 bg-[var(--bg-overlay)] border border-emerald-500/10 rounded-md p-3 flex items-center gap-3">
        <div className="flex-1 truncate text-[10px] font-mono text-[var(--text-muted)]">
          {referralLink}
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleCopy}
            className="w-10 h-10 flex items-center justify-center rounded-sm bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 transition-theme"
            title="Copy Link"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>
          <button 
            onClick={handleShare}
            className="w-10 h-10 flex items-center justify-center rounded-sm bg-emerald-500 text-white hover:bg-emerald-600 transition-theme shadow-lg shadow-emerald-500/20"
            title="Share"
          >
            <Share2 size={16} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 mt-1 relative z-10">
        <button 
          onClick={() => {
            if (triggerUpgradePrompt) {
              triggerUpgradePrompt(tool || 'chat', data.limit, data.current, data.period);
            } else {
              navigate('/subscription');
            }
          }}
          className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-sm text-[11px] font-black uppercase tracking-wider transition-theme shadow-[0_10px_20px_rgba(16,185,129,0.3)] hover:translate-y-[-2px] active:translate-y-0"
        >
          {dir === 'rtl' ? 'ترقية الخطة الآن' : 'Upgrade Plan Now'}
        </button>
        <button 
          onClick={() => navigate('/rewards')}
          className="flex-1 bg-[var(--bg-surface)] border border-emerald-500/20 hover:bg-emerald-500/5 text-emerald-500 py-3 rounded-sm text-[11px] font-black uppercase tracking-wider transition-theme hover:translate-y-[-2px] active:translate-y-0"
        >
          {dir === 'rtl' ? 'صفحة المكافآت' : 'Rewards Page'}
        </button>
      </div>
    </motion.div>
  );
};

export const InsufficientFundsCard = ({ data, dir, t, navigate, user }: { data: any, dir: 'rtl' | 'ltr', t: any, navigate: any, user: any }) => {
  const [copied, setCopied] = useState(false);
  const { triggerUpgradePrompt } = useAppContext();
  const referralLink = `${window.location.origin}/?ref=${user?.referral_code || user?.id || 'elite'}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Perplexta Intelligence',
          text: dir === 'rtl' ? 'انضم إلي في بيربليكستا واستخدم الذكاء الاصطناعي الأقوى.' : 'Join me on Perplexta and use the most powerful AI.',
          url: referralLink,
        });
      } catch (err) {
        handleCopy();
      }
    } else {
      handleCopy();
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mt-4 p-5 rounded-lg border border-red-500/20 bg-red-500/[0.03] backdrop-blur-sm self-stretch flex flex-col gap-4 relative overflow-hidden group"
    >
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <Sparkles size={48} className="text-red-500" />
      </div>

      <div className="flex items-start gap-4 relative z-10">
        <div className="w-12 h-12 rounded-md bg-red-500/10 flex items-center justify-center text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
          <AlertCircle size={24} className="animate-pulse" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500">
              {dir === 'rtl' ? 'رصيد غير كافٍ' : 'Insufficient Wallet Balance'}
            </span>
          </div>
          <p className="text-[14px] font-bold text-[var(--text-primary)] leading-relaxed mb-1">
            {dir === 'rtl' ? (data?.error_ar || data?.error) : (data?.error || data?.error_ar)}
          </p>
          <p className="text-[11px] text-[var(--text-muted)] mt-1 font-sans">
            {dir === 'rtl' ? 'رصيد محفظتك غير كافٍ لتشغيل الخدمة. يرجى إعادة شحن محفظتك أو دعوة الأصدقاء للمزيد من النقاط مجاناً.' : 'Your wallet balance is insufficient to execute the service. Please top up your wallet or invite friends for free points.'}
          </p>
        </div>
      </div>

      <div className="relative z-10 bg-[var(--bg-overlay)] border border-red-500/10 rounded-md p-3 flex items-center gap-3">
        <div className="flex-1 truncate text-[10px] font-mono text-[var(--text-muted)] p-1">
          {referralLink}
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleCopy}
            className="w-10 h-10 flex items-center justify-center rounded-sm bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-theme"
            title="Copy Link"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>
          <button 
            onClick={handleShare}
            className="w-10 h-10 flex items-center justify-center rounded-sm bg-red-500 text-white hover:bg-emerald-600 transition-theme shadow-lg shadow-red-500/20"
            title="Share"
          >
            <Share2 size={16} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 mt-1 relative z-10">
        <button 
          onClick={() => {
            if (triggerUpgradePrompt) {
              triggerUpgradePrompt('wallet');
            } else {
              navigate('/settings?tab=wallet');
            }
          }}
          className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-sm text-[11px] font-black uppercase tracking-wider transition-theme shadow-[0_10px_20px_rgba(239,68,68,0.3)] hover:translate-y-[-2px] active:translate-y-0"
        >
          {dir === 'rtl' ? 'شحن رصيد المحفظة الأن' : 'Recharge Wallet Now'}
        </button>
        <button 
          onClick={() => navigate('/rewards')}
          className="flex-1 bg-[var(--bg-surface)] border border-red-500/20 hover:bg-red-500/5 text-red-500 py-3 rounded-sm text-[11px] font-black uppercase tracking-wider transition-theme hover:translate-y-[-2px] active:translate-y-0"
        >
          {dir === 'rtl' ? 'صفحة المكافآت' : 'Rewards Page'}
        </button>
      </div>
    </motion.div>
  );
};

import { ErrorBoundary } from '../components/ErrorBoundary';

const toolbarVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.6, ease: [0.0, 0.0, 0.2, 1] }
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.2 }
  }
} as const;

const toolbarItemVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    
    transition: {
      duration: 0.6,
      ease: [0.0, 0.0, 0.2, 1],
    }
  }
} as const;

export const ChatPage: React.FC = () => {
  const { 
    t, theme, dir, user, token, setIsAuthModalOpen, socket, isMobile, isInstallable, 
    installApp, isInstalling, siteSettings, setIsOperationPending, isAuthReady,
    refreshUser, balanceUSD, economySettings, triggerMemoryNotification, triggerUpgradePrompt
  } = useAppContext();
  const { id: routeChatId } = useParams();
  const navigate = useNavigate();
  const [query, setQuery] = useState(() => {
    return sessionStorage.getItem('draft_query') || '';
  });
  const [isFocused, setIsFocused] = useState(false);
  const [selectedModel, setSelectedModel] = useState<'fast' | 'thinking' | 'pro'>(() => {
    return (localStorage.getItem('last_active_model') as any) || 'fast';
  });
  const [selectedTool, setSelectedTool] = useState<string>(() => {
    return localStorage.getItem('last_active_tool') || 'chat';
  });

  const prevUserRef = useRef<any>(null);
  useEffect(() => {
    if (user && !prevUserRef.current) {
      setSelectedTool('chat');
      localStorage.setItem('last_active_tool', 'chat');
    }
    if (!user && prevUserRef.current) {
      setSelectedTool('chat');
      setSelectedModel('fast');
    }
    prevUserRef.current = user;
  }, [user]);

  useEffect(() => {
    if (!user || !user.subscription || user.subscription.status !== 'active') return;
    const periodEnd = user.subscription.current_period_end;
    if (!periodEnd) return;

    const expiryTime = new Date(periodEnd).getTime();
    const nowTime = Date.now();
    const diffDays = (expiryTime - nowTime) / (1000 * 60 * 60 * 24);

    if (diffDays > 0 && diffDays <= 3) {
      const daysLeft = Math.ceil(diffDays);
      const planNameAr = user.subscription.plan_name_ar || user.subscription.plan_name_en;
      const planNameEn = user.subscription.plan_name_en;

      const title = dir === 'rtl' ? '⚠️ تذكير بتجديد الاشتراك' : '⚠️ Subscription Renewal Alert';
      const desc = dir === 'rtl'
        ? `باقي ${daysLeft} من الأيام على انتهاء/تجديد اشتراكك في باقة "${planNameAr}". يرجى التأكد من شحن حسابك للاستمرار بالخدمة.`
        : `Your "${planNameEn}" membership will renew/expire in ${daysLeft} days. Ensure your balance is sufficient to maintain access.`;

      toast.warning(title, {
        description: desc,
        duration: 10000,
        action: {
          label: dir === 'rtl' ? 'إدارة الاشتراك' : 'Manage Subscription',
          onClick: () => navigate('/subscription')
        }
      });
    }
  }, [user, dir, navigate]);

  useEffect(() => {
    if (isMobile && (selectedTool === 'code' || selectedTool === 'notebook')) {
      setSelectedTool('chat');
    }
  }, [isMobile, selectedTool]);

  const [activeDropdown, setActiveDropdown] = useState<'tool' | 'model'>('tool');
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAdvancedToolsOpen, setIsAdvancedToolsOpen] = useState(false);
  const [forensicMode, setForensicMode] = useState(false);
  const [isAnalyzingForensic, setIsAnalyzingForensic] = useState(false);
  const [forensicReport, setForensicReport] = useState<any | null>(null);
  const [isForensicModalOpen, setIsForensicModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isChatMessagesLoading, setIsChatMessagesLoading] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [liveElapsed, setLiveElapsed] = useState<number>(0);
  const [imageProgress, setImageProgress] = useState<{ progress?: number; statusLabel?: string } | null>(null);
  const [ledgerNotice, setLedgerNotice] = useState<{ textAr: string; textEn: string } | null>(null);
  const [typedNotice, setTypedNotice] = useState<string>('');

  useEffect(() => {
    if (!ledgerNotice) {
      return;
    }
    const fullText = dir === 'rtl' ? ledgerNotice.textAr : ledgerNotice.textEn;
    setTypedNotice('');
    let i = 0;
    const interval = setInterval(() => {
      i++;
      if (i <= fullText.length) {
        setTypedNotice(fullText.slice(0, i));
      } else {
        clearInterval(interval);
      }
    }, 15);
    return () => clearInterval(interval);
  }, [ledgerNotice, dir]);

  useEffect(() => {
    if (!isGenerating && ledgerNotice) {
      const handler = setTimeout(() => {
        setLedgerNotice(null);
      }, 4500);
      return () => clearTimeout(handler);
    }
  }, [isGenerating, ledgerNotice]);

  useEffect(() => {
    if (isGenerating) {
      setLedgerNotice(null);
    }
  }, [isGenerating]);

  useEffect(() => {
    let intervalId: any = null;
    if (isGenerating && generationStartTimeRef.current) {
      intervalId = setInterval(() => {
        const secs = parseFloat(((Date.now() - generationStartTimeRef.current!) / 1000).toFixed(1));
        setLiveElapsed(secs);
      }, 100);
    } else {
      setLiveElapsed(0);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isGenerating]);

  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [typingParty, setTypingParty] = useState<'assistant' | 'user' | null>(null);
  const [typingName, setTypingName] = useState<string>('');
  const typingTimeoutRef = useRef<any>(null);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [chatId, setChatId] = useState<string | null>(routeChatId && routeChatId !== 'new' ? routeChatId : null);

  const hasActiveSub = !user || !!(user.subscription && user.subscription.status === 'active');
  const isInputDisabled = !!(user && (!user.subscription || user.subscription.status !== 'active'));

  useEffect(() => {
    if (!query) {
      sessionStorage.setItem('draft_query', '');
      return;
    }

    const handler = setTimeout(() => {
      sessionStorage.setItem('draft_query', query);
    }, 500); 

    return () => {
      clearTimeout(handler);
    };
  }, [query]);

  useEffect(() => {
    localStorage.setItem('last_active_model', selectedModel);
  }, [selectedModel]);

  useEffect(() => {
    localStorage.setItem('last_active_tool', selectedTool);
    triggerMemoryNotification('startup');
  }, [selectedTool]);

  const handleUserTyping = () => {
    if (!socket || !user) return;

    socket.emit('typing', { isTyping: true, role: 'user', name: user.name || 'User' });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing', { isTyping: false, role: 'user', name: user.name || 'User' });
    }, 2000);
  };

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const triggerForensicDiagnostic = async () => {
    if (!selectedFile) return;
    setIsAnalyzingForensic(true);
    setForensicReport(null);
    setIsForensicModalOpen(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 120000); 

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const authToken = token || localStorage.getItem('app_token');
      const response = await fetch('/api/files/analyze-forensic', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: formData,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Diagnostic mapping failed');
      }

      const data = await response.json();
      if (data.success && data.forensic) {
        setForensicReport(data.forensic);
        toast.success(
          dir === 'rtl' 
            ? 'تم إنجاز الفحص الرقمي بنجاح' 
            : 'Forensic digital audit completed successfully'
        );
      } else {
        throw new Error('No forensic diagnostic record found');
      }
    } catch (err: any) {
      clearTimeout(timeoutId);

      const isAbort = err.name === 'AbortError';
      toast.error(
        dir === 'rtl'
          ? (isAbort ? 'انتهت مهلة المخدم (دقيقتان) أثناء معالجة الملف.' : `عذرًا، فشل الفحص: ${err.message}`)
          : (isAbort ? 'Forensic processor timed out (2 minutes limit).' : `Document diagnostic failed: ${err.message}`)
      );
      setIsForensicModalOpen(false);
    } finally {
      setIsAnalyzingForensic(false);
    }
  };

  useEffect(() => {
    setIsOperationPending(isGenerating || query.length > 100);
  }, [isGenerating, query, setIsOperationPending]);

  const lastDispatchedStateRef = useRef<{ isGenerating: boolean; chatId: string | null }>({ isGenerating: false, chatId: null });

  useEffect(() => {
    const activeChatId = chatId || routeChatId || null;
    const cache = lastDispatchedStateRef.current;

    if (cache.isGenerating !== isGenerating || cache.chatId !== activeChatId) {
      const prevWasGenerating = cache.isGenerating;
      cache.isGenerating = isGenerating;
      cache.chatId = activeChatId;
      window.dispatchEvent(new CustomEvent('ai-streaming-state', {
        detail: { isGenerating, chatId: activeChatId }
      }));

      if (!isGenerating && activeChatId && prevWasGenerating) {
        window.dispatchEvent(new Event('chat-updated'));
      }
    }
  }, [isGenerating, chatId, routeChatId]);

  const [videoSettings, setVideoSettings] = useState({
    aspectRatio: '16:9',
    resolution: '720p',
    duration: 5,
    style: 'Cinematic'
  });
  const [imageSettings, setImageSettings] = useState({
    aspectRatio: '1:1',
    quality: 'HD',
    style: 'Cinematic'
  });
  const [audioSettings, setAudioSettings] = useState({
    mood: 'Epic',
    duration: 30,
    format: 'wav',
    vocalType: 'Instrumental'
  });
  const [showVideoSettings, setShowVideoSettings] = useState(true);
  const [showImageSettings, setShowImageSettings] = useState(true);
  const [showAudioSettings, setShowAudioSettings] = useState(true);

  useEffect(() => {
    const firstUserMsg = messages.find(m => m.role === 'user');
    if (firstUserMsg) {
      document.title = stripProtocolMarkers(firstUserMsg.content).slice(0, 60);
    } else {
      document.title = dir === 'rtl' ? (siteSettings?.siteNameAr || 'محادثة بيربليكستا') : (siteSettings?.siteName || 'Perplexta Chat');
    }
  }, [messages, siteSettings, dir]);

  useEffect(() => {
    const handleInsertToPrompt = (e: Event) => {
      const text = (e as CustomEvent).detail;
      if (text) {
        setQuery(text);
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.style.height = 'auto';

          textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
        }
        toast.success(dir === 'rtl' ? 'تم نسخ البرومبت وتطبيقه في حقل الإدخال' : 'Prompt loaded directly into the input field!');
      }
    };
    window.addEventListener('insert_to_prompt', handleInsertToPrompt);
    return () => window.removeEventListener('insert_to_prompt', handleInsertToPrompt);
  }, [dir]);
  const [showChatLimitWarning, setShowChatLimitWarning] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [playingTTSId, setPlayingTTSId] = useState<string | number | null>(null);
  const [chatRenameTitle, setChatRenameTitle] = useState('');
  const [openCitationsMap, setOpenCitationsMap] = useState<Record<number, boolean>>({});
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const threshold = 300; 
    const distanceToBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    setShowScrollToBottom(distanceToBottom > threshold);
  };

  const MAX_CHAT_MESSAGES = 50;

  const abortControllerRef = useRef<AbortController | null>(null);
  const chatIdRef = useRef<string | null>(chatId);
  const streamingBuffer = useRef('');
  const typewriterInterval = useRef<any>(null);
  const checkBufferIntervalRef = useRef<any>(null);
  const isGeneratingRef = useRef(false);
  const isServerDoneRef = useRef(false);
  const generationStartTimeRef = useRef<number | null>(null);
  const finalResponseDataRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (behavior === 'auto' || isGenerating) {
      const container = document.getElementById('chat-messages-container');
      if (container) {
        container.scrollTop = container.scrollHeight;
        return;
      }
    }
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  const lastMessageContent = messages[messages.length - 1]?.content;

  useEffect(() => {
    if (messages.length > 0) {
      if (isGenerating) {

        scrollToBottom('auto');
      } else {
        scrollToBottom('smooth');
      }
    }
  }, [messages.length, chatId]);

  useEffect(() => {
    if (!isGenerating) {
      setIsOtherTyping(false);
    }
  }, [isGenerating]);

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingMessageIndex, setEditingMessageIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showPinnedModal, setShowPinnedModal] = useState(false);

  const handleRegenerate = async (index: number) => {
    if (isGenerating) return;
    const lastUserMessage = messages.slice(0, index).reverse().find(m => m.role === 'user');
    if (lastUserMessage) {
      const truncated = messages.slice(0, index);
      setMessages(truncated);
      handleSendOrStop(lastUserMessage.content, truncated);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error(dir === 'rtl' ? 'متصفحك لا يدعم التعرف على الكلام' : 'Your browser does not support speech recognition');
      return;
    }

    if (!recognitionRef.current) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {

          setQuery(prev => prev + (prev && !prev.endsWith(' ') ? ' ' : '') + finalTranscript);
          if (textareaRef.current) {
             textareaRef.current.style.height = 'auto';
             textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
          }
        }
      };

      recognition.onerror = (event: any) => {

        if (event.error === 'not-allowed') {
          toast.error(dir === 'rtl' ? 'يرجى السماح بالوصول إلى الميكروفون' : 'Please allow microphone access');
        }
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }

    try {
      recognitionRef.current.lang = dir === 'rtl' ? 'ar-SA' : 'en-US';
      recognitionRef.current.start();
      setIsRecording(true);
    } catch (err) {

      setIsRecording(false);
    }
  };

  const handleEditSubmit = async (index: number) => {
    if (!editValue.trim() || editValue === messages[index].content) {
      setEditingMessageIndex(null);
      return;
    }

    const messageToEdit = messages[index];
    if (messageToEdit.id && chatId) {
      try {
        await fetch(`/api/messages/branch/${chatId}/${messageToEdit.id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } catch (e) {

      }
    }

    const truncated = messages.slice(0, index);
    setMessages(truncated);
    const newContent = editValue;
    setEditingMessageIndex(null);
    setEditValue('');
    handleSendOrStop(newContent, truncated);
  };

  const detectLanguage = (text: string) => {
    const arabicRegex = /[\u0600-\u06FF]/;
    return arabicRegex.test(text) ? 'ar-SA' : 'en-US';
  };

  const handleTTS = (text: string, msgId: string | number) => {
    if (!window.speechSynthesis) {
      toast.error(dir === 'rtl' ? 'متصفحك لا يدعم تحويل النص إلى صوت' : 'Browser doesn\'t support TTS');
      return;
    }

    if (playingTTSId === msgId) {
      window.speechSynthesis.cancel();
      setPlayingTTSId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*#_~`\[\]()>]/g, '').slice(0, 5000);
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = detectLanguage(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onend = () => setPlayingTTSId(null);
    utterance.onerror = () => setPlayingTTSId(null);

    window.speechSynthesis.speak(utterance);
    setPlayingTTSId(msgId);
    toast.info(dir === 'rtl' ? 'جاري القراءة الصوتية...' : 'Reading aloud...');
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setIsExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    };
  }, []);

  const [isExporting, setIsExporting] = useState(false);

  const handleExportChat = async (format: 'md' | 'pdf' | 'docx') => {
    if (messages.length === 0) return;
    setIsExporting(true);
    setIsExportMenuOpen(false);

    try {
      if (format === 'md') {
        let content = `# Chat Export - ${new Date().toLocaleString()}\n\n`;
        messages.forEach(msg => {
          const role = msg.role === 'user' ? (dir === 'rtl' ? 'المستخدم' : 'User') : (dir === 'rtl' ? 'المساعد' : 'Assistant');
          content += `## ${role}\n\n${msg.content}\n\n${msg.tool ? `*Used Tool: ${msg.tool}*\n\n` : ''}---\n\n`;
        });
        const blob = new Blob([content], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Perplexta_Chat_${new Date().toISOString().split('T')[0]}.md`;
        link.click();
        URL.revokeObjectURL(url);
      } 
      else if (format === 'pdf') {
        const chatContainer = document.getElementById('chat-messages-container');
        if (!chatContainer) throw new Error('Chat container not found');

        const exportEl = document.createElement('div');
        exportEl.style.padding = '40px 30px';
        exportEl.style.width = '800px'; 
        exportEl.style.backgroundColor = theme === 'dark' ? '#0f0f11' : '#ffffff';
        exportEl.style.color = theme === 'dark' ? '#ffffff' : '#000000';
        exportEl.dir = dir;
        exportEl.style.position = 'fixed';
        exportEl.style.left = '0';
        exportEl.style.top = '0';
        exportEl.style.zIndex = '-9999';
        exportEl.style.opacity = '1';

        const fontStyle = document.createElement('style');
        applyNonce(fontStyle);
        fontStyle.textContent = `
          @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Tajawal:wght@200;300;400;500;700;800;900&family=Inter:wght@400;500;600;700&display=swap');
          * {
            font-family: 'Space Grotesk', 'Tajawal', 'Inter', sans-serif !important;
            box-sizing: border-box;
          }
          .msg-body-text {
            font-family: 'Space Grotesk', 'Tajawal', 'Inter', sans-serif !important;
            font-size: 15px !important;
            line-height: 1.8 !important;
            white-space: pre-wrap !important;
            word-break: break-word !important;
          }
        `;
        exportEl.appendChild(fontStyle);

        const header = document.createElement('div');
        header.innerHTML = `
          <div style="text-align: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid ${theme === 'dark' ? '#1a1a1c' : '#f0f0f0'};">
            <h1 style="margin: 0; font-size: 28px; color: #10b981;">PERPLEXTA</h1>
            <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.6;">${dir === 'rtl' ? 'تقرير تصدير الذكاء الاصطناعي' : 'AI Intelligence Export Report'}</p>
            <p style="margin: 5px 0 0 0; font-size: 10px; opacity: 0.4;">${new Date().toLocaleString()}</p>
          </div>
        `;
        exportEl.appendChild(header);

        messages.forEach((msg, idx) => {
          const msgEl = document.createElement('div');
          msgEl.style.marginBottom = '25px';
          msgEl.style.padding = '20px';
          msgEl.style.borderRadius = '16px';
          msgEl.style.backgroundColor = msg.role === 'user' 
            ? (theme === 'dark' ? '#1a1a1c' : '#f8f9fa')
            : 'transparent';
          msgEl.style.border = theme === 'dark' ? '1px solid #2d2d2f' : '1px solid #e9ecef';

          const roleLabel = document.createElement('div');
          roleLabel.innerText = msg.role === 'user' ? (dir === 'rtl' ? 'المستخدم' : 'User') : (dir === 'rtl' ? 'مساعد بيربليكستا' : 'Perplexta Assistant');
          roleLabel.style.fontWeight = '900';
          roleLabel.style.marginBottom = '10px';
          roleLabel.style.fontSize = '12px';
          roleLabel.style.textTransform = 'uppercase';
          roleLabel.style.letterSpacing = '1px';
          roleLabel.style.color = '#10b981';

          const content = document.createElement('div');
          content.innerText = msg.content;
          content.className = 'msg-body-text';

          msgEl.appendChild(roleLabel);
          msgEl.appendChild(content);
          exportEl.appendChild(msgEl);
        });

        const footer = document.createElement('div');
        footer.style.marginTop = '40px';
        footer.style.textAlign = 'center';
        footer.style.fontSize = '10px';
        footer.style.opacity = '0.3';
        footer.innerText = '© 2026 ViralLinkUp PLATFORM - CONFIDENTIAL AI REPORT';
        exportEl.appendChild(footer);

        document.body.appendChild(exportEl);

        await new Promise((resolve) => setTimeout(resolve, 500));

        const imgData = await toPng(exportEl, {
          backgroundColor: theme === 'dark' ? '#0f0f11' : '#ffffff',
          pixelRatio: 2, 
          style: {
            transform: 'scale(1)',
          }
        });

        document.body.removeChild(exportEl);

        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgWidth = 210; 
        const pageHeight = 297; 

        const img = new Image();
        img.src = imgData;
        await new Promise((resolve) => {
          img.onload = resolve;
        });

        const imgHeight = (img.height * imgWidth) / img.width;
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft >= 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }

        pdf.save(`Perplexta_Chat_${new Date().toISOString().split('T')[0]}.pdf`);
      }
      else if (format === 'docx') {
        let htmlContent = `
          <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
          <head><meta charset='utf-8'><title>Chat Export</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; }
            .user { background-color: #f0f0f0; padding: 10px; margin-bottom: 10px; }
            .assistant { padding: 10px; margin-bottom: 10px; border-left: 3px solid #10b981; }
            .label { font-weight: bold; color: #10b981; font-size: 0.8em; }
          </style>
          </head>
          <body dir="${dir}">
            <h1 style="text-align: center;">Perplexta Chat Export</h1>
            <p style="text-align: center; color: #666;">${new Date().toLocaleString()}</p>
        `;

        messages.forEach(msg => {
          const role = msg.role === 'user' ? (dir === 'rtl' ? 'المستخدم' : 'User') : (dir === 'rtl' ? 'المساعد' : 'Assistant');
          htmlContent += `
            <div class="${msg.role}">
              <div class="label">${role}</div>
              <p>${msg.content.replace(/\n/g, '<br>')}</p>
            </div>
          `;
        });

        htmlContent += `</body></html>`;

        const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Perplexta_Chat_${new Date().toISOString().split('T')[0]}.doc`;
        link.click();
        URL.revokeObjectURL(url);
      }

      const formatLabels = { md: 'Markdown', pdf: 'PDF', docx: 'DOCX' };
      toast.success(dir === 'rtl' 
        ? `تم تصدير المحادثة بتنسيق ${formatLabels[format]} بنجاح` 
        : `Conversation exported as ${formatLabels[format]} successfully`
      );
    } catch (error) {

      toast.error(dir === 'rtl' ? 'فشل تصدير المحادثة' : 'Failed to export conversation');
    } finally {
      setIsExporting(false);
    }
  };

  const handleThreadRename = async () => {
    if (!chatId || !chatRenameTitle.trim()) return;
    try {
      const res = await fetch(`/api/chats/${chatId}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ title: chatRenameTitle.trim() })
      });
      if (res.ok) {
        toast.success(dir === 'rtl' ? 'تم تغيير العنوان' : 'Title updated');
        window.dispatchEvent(new Event('chat-updated'));
        setIsRenaming(false);
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || (dir === 'rtl' ? 'فشل تعديل اسم المحادثة' : 'Failed to update chat title'));
      }
    } catch (e) {

      toast.error(dir === 'rtl' ? 'فشل تعديل اسم المحادثة' : 'Failed to update chat title');
    }
  };

  const handleThreadDelete = () => {
    if (!chatId) return;
    setIsDeleteModalOpen(true);
  };

  const handleThreadDeleteConfirm = async () => {
    setIsDeleteModalOpen(false);
    if (!chatId) return;
    try {
      const res = await fetch(`/api/chats/${chatId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success(dir === 'rtl' ? 'تم حذف المحادثة بنجاح' : 'Chat deleted successfully');
        window.dispatchEvent(new Event('chat-updated'));
        navigate('/chat');
      }
    } catch (e) {

    }
  };

  const handlePinMessage = async (messageId: number, isPinned: boolean) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/messages/${messageId}/pin`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ is_pinned: isPinned })
      });
      if (res.ok) {
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, is_pinned: isPinned } : m));
        toast.success(isPinned 
          ? (dir === 'rtl' ? 'تم تثبيت الرسالة' : 'Message pinned') 
          : (dir === 'rtl' ? 'تم إلغاء التثبيت' : 'Message unpinned')
        );

        trackGAEvent(isPinned ? 'message_pinned' : 'message_unpinned', 'interaction');
      }
    } catch (err) {

    }
  };

  const handleFeedback = async (messageId: number, feedback: number) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/messages/${messageId}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ feedback })
      });
      if (res.ok) {
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, feedback } : m));

        const feedLabel = feedback === 1 ? 'thumbs_up' : feedback === -1 ? 'thumbs_down' : 'neutral';
        trackGAEvent('feedback_submitted', 'message_quality', feedLabel);
      }
    } catch (err) {

    }
  };

  const handleForkThread = async (messageId: number) => {
    if (!token) {
      toast.error(dir === 'rtl' ? 'يجب تسجيل الدخول أولاً' : 'Please log in to fork a thread');
      return;
    }
    if (!chatId) return;

    const loader = toast.loading(dir === 'rtl' ? 'جاري تفريع المحادثة...' : 'Forking thread...');
    try {
      const res = await fetch(`/api/chats/${chatId}/fork`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ messageId })
      });

      if (res.ok) {
        const newChat = await res.json();
        toast.dismiss(loader);
        toast.success(dir === 'rtl' ? 'تم تفريع المحادثة بنجاح!' : 'Thread forked successfully!');
        window.dispatchEvent(new Event('chat-updated'));
        navigate(`/chat/${newChat.id}`);
      } else {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to fork');
      }
    } catch (err: any) {
      toast.dismiss(loader);

      toast.error(dir === 'rtl' ? 'فشل تفريع المحادثة' : `Failed to fork thread: ${err.message || ''}`);
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <ImageIcon size={20} />;
    if (fileType.startsWith('video/')) return <Video size={20} />;
    if (fileType.startsWith('audio/')) return <Music size={20} />;
    if (fileType.includes('pdf')) return <FileText size={20} />;
    if (fileType.includes('javascript') || fileType.includes('typescript') || fileType.includes('json') || fileType.includes('css') || fileType.includes('html') || fileType.includes('python') || fileType.includes('java')) return <Code size={20} />;
    return <FileText size={20} />;
  };

  useEffect(() => {
    isGeneratingRef.current = isGenerating;
    if (isGenerating) {
      startTypewriter();
    }
  }, [isGenerating]);

  useEffect(() => {
    return () => {
      if (typewriterInterval.current) {
        clearInterval(typewriterInterval.current);
        typewriterInterval.current = null;
      }
    };
  }, []);

  const startTypewriter = () => {
    if (typewriterInterval.current) return;

    typewriterInterval.current = setInterval(() => {
      if (streamingBuffer.current.length > 0) {

        const bufferLen = streamingBuffer.current.length;
        let pullAmount = 1;
        if (isServerDoneRef.current) {

          pullAmount = Math.min(bufferLen, Math.max(12, Math.ceil(bufferLen / 3)));
        } else if (bufferLen > 200) {

          pullAmount = Math.min(bufferLen, Math.max(32, Math.ceil(bufferLen / 5)));
        } else if (bufferLen > 100) {
          pullAmount = Math.min(bufferLen, 18);
        } else if (bufferLen > 50) {
          pullAmount = Math.min(bufferLen, 10);
        } else if (bufferLen > 15) {
          pullAmount = Math.min(bufferLen, 5);
        } else {
          pullAmount = Math.min(bufferLen, 3);
        }

        if (pullAmount < bufferLen) {
          const charCode = streamingBuffer.current.charCodeAt(pullAmount - 1);

          if (charCode >= 0xD800 && charCode <= 0xDBFF) {
            pullAmount = Math.min(bufferLen, pullAmount + 1);
          }
        }

        const elapsed = generationStartTimeRef.current 
          ? parseFloat(((Date.now() - generationStartTimeRef.current) / 1000).toFixed(1)) 
          : undefined;

        const chunk = streamingBuffer.current.substring(0, pullAmount);
        streamingBuffer.current = streamingBuffer.current.substring(pullAmount);

        setMessages(prev => {
          const newMessages = [...prev];
          const lastIdx = newMessages.length - 1;
          const lastMessage = newMessages[lastIdx];

          if (lastMessage && lastMessage.role === 'assistant' && !lastMessage.is_quota_error && !lastMessage.is_system_inactive) {
            newMessages[lastIdx] = {
              ...lastMessage,
              content: lastMessage.content + chunk,
              is_streaming: true,
              generation_time: elapsed
            };
            return newMessages;
          } else if (lastIdx === -1 || (lastMessage && lastMessage.role === 'user')) {
            newMessages.push({ role: 'assistant', content: chunk, is_streaming: true, generation_time: elapsed });
            return newMessages;
          }
          return prev;
        });
      } else if (isServerDoneRef.current) {

        if (typewriterInterval.current) {
          clearInterval(typewriterInterval.current);
          typewriterInterval.current = null;

          setMessages(prev => {
            const newMessages = [...prev];
            const lastIdx = newMessages.length - 1;
            if (lastIdx >= 0 && newMessages[lastIdx].role === 'assistant') {
              const finalElapsed = generationStartTimeRef.current 
                ? parseFloat(((Date.now() - generationStartTimeRef.current) / 1000).toFixed(1)) 
                : undefined;
              newMessages[lastIdx] = { 
                ...newMessages[lastIdx], 
                is_streaming: false,
                generation_time: finalElapsed || newMessages[lastIdx].generation_time
              };
              return newMessages;
            }
            return prev;
          });
        }
      }
    }, 20);
  };

  useLayoutEffect(() => {
    if (!isGenerating && !isOtherTyping) return;
    const container = document.getElementById('chat-messages-container');
    if (container) {

      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight <= 300;
      if (isNearBottom) {
        container.scrollTop = container.scrollHeight;
      }
    }
  }, [messages[messages.length - 1]?.content, isGenerating, isOtherTyping]);

  useEffect(() => {
    chatIdRef.current = chatId;
  }, [chatId]);

  useEffect(() => {
    if (isGenerating || isGeneratingRef.current) {
      return;
    }
    if (routeChatId && routeChatId !== 'new') {

      const belongsToCurrentSession =
        chatIdRef.current?.toString() === routeChatId.toString() ||
        chatId?.toString() === routeChatId.toString() ||
        (!chatIdRef.current && (isGenerating || isGeneratingRef.current));

      if ((isGenerating || isGeneratingRef.current) && belongsToCurrentSession) {
        return;
      }

      if (chatIdRef.current?.toString() === routeChatId.toString() && messages.length > 0) { return; }
      if (isAuthReady) {
        loadChat(routeChatId);
      }
    } else {
      setMessages([]);
      setChatId(null);
      localStorage.removeItem('last_chat_id');
    }
  }, [routeChatId, token, isAuthReady, isGenerating]);

  useEffect(() => {
    if (chatId) {
      localStorage.setItem('last_chat_id', chatId);
    } else {
      localStorage.removeItem('last_chat_id');
    }
  }, [chatId]);

  const createdUrls = useRef<string[]>([]);

  useEffect(() => {
    return () => {
      createdUrls.current.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {

      const MAX_SIZE = 100 * 1024 * 1024;
      if (file.size > MAX_SIZE) {
        toast.error(
          dir === 'rtl' 
            ? 'حجم الملف يتجاوز الحد المسموح (100 ميجابايت). يرجى اختيار ملف أصغر.' 
            : 'File size exceeds the 100MB limit. Please select a smaller file.'
        );
        e.target.value = ''; 
        return;
      }

      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      createdUrls.current.push(url);
    }
  };

  const loadChat = async (id: string) => {
    if (!token || token === 'null') return;
    if (isGenerating || isGeneratingRef.current) {

      return;
    }
    setChatId(id);
    setIsChatMessagesLoading(true);

    try {
      const res = await fetch(`/api/chats/${id}/messages`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.map((msg: any) => ({ 
          id: msg.id,
          role: msg.role, 
          content: msg.content,
          tool: msg.tool,
          feedback: msg.feedback,
          is_pinned: msg.is_pinned,
          generation_time: msg.generation_time ? parseFloat(msg.generation_time) : undefined,
          thinking_steps: typeof msg.thinking_steps === 'string' ? JSON.parse(msg.thinking_steps) : msg.thinking_steps,
          citations: typeof msg.citations === 'string' ? JSON.parse(msg.citations) : msg.citations,
          follow_ups: typeof msg.follow_ups === 'string' ? JSON.parse(msg.follow_ups) : msg.follow_ups,
          created_at: msg.created_at
        })));

      }
    } catch (error) {

    } finally {
      setIsChatMessagesLoading(false);
    }
  };

  useEffect(() => {
    const handleSWMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'sync-complete' && event.data.chatId === chatIdRef.current) {
        if (chatIdRef.current) {
          loadChat(chatIdRef.current);
        }
      }
    };
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSWMessage);
    }
    return () => {
      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSWMessage);
      }
    };
  }, [chatId]);

  useEffect(() => {
    if (!socket) return;

    const applyFinalResponse = (data: any) => {
      if (!data) return;
      setMessages(prev => {
        const newMessages = [...prev];
        const lastMessage = newMessages[newMessages.length - 1];
        if (lastMessage && lastMessage.role === 'assistant') {
          newMessages[newMessages.length - 1] = {
            ...lastMessage,
            content: data.result,
            tool: data.tool || lastMessage.tool,
            id: data.message_id || lastMessage.id,
            thinking_steps: data.thinking_steps || lastMessage.thinking_steps,
            citations: data.citations || lastMessage.citations,
            follow_ups: data.follow_ups || [],
            is_streaming: false,
            generation_time: data.generation_time !== undefined ? parseFloat(data.generation_time) : lastMessage.generation_time,
            created_at: data.created_at || lastMessage.created_at || new Date().toISOString()
          };
        }
        return newMessages;
      });
      finalResponseDataRef.current = null;
    };

    const onChatChunk = (data: any) => {
      if (data.isFinal) {
        isServerDoneRef.current = true;

        if (streamingBuffer.current.length === 0) {
          streamingBuffer.current += data.chunk || '';
        }
      } else {
        streamingBuffer.current += data.chunk || '';
      }
    };

    const onChatResponse = async (data: any) => {

      finalResponseDataRef.current = data;

      if (streamingBuffer.current.length === 0) {
        applyFinalResponse(data);
        setIsGenerating(false);
      } else {
        if (checkBufferIntervalRef.current) {
          clearInterval(checkBufferIntervalRef.current);
        }

        let ticks = 0;
        const maxTicks = 1200; 
        checkBufferIntervalRef.current = setInterval(async () => {
          ticks++;
          if (streamingBuffer.current.length === 0 || ticks >= maxTicks) {
            if (checkBufferIntervalRef.current) {
              clearInterval(checkBufferIntervalRef.current);
              checkBufferIntervalRef.current = null;
            }
            applyFinalResponse(finalResponseDataRef.current || data);
            setIsGenerating(false);
            streamingBuffer.current = ''; 
          }
        }, 100);
      }
    };

    const onMemoryExtracted = (data: any) => {
      triggerMemoryNotification('success');
    };

    const onMemoryWarning = (data: any) => {
      triggerMemoryNotification('warning');
    };

    const onMemoryCleanup = (data: any) => {
      triggerMemoryNotification('cleanup');
    };

    const onMemoryConsolidation = (data: any) => {
      const { consolidated, result } = data;
      const desc = dir === 'rtl' 
        ? `بروتوكول التحسين: تم دمج ${consolidated} سجلات قديمة في ${result} حقائق جوهرية لتحرير المساحة.`
        : `Optimization Protocol: Consolidated ${consolidated} old records into ${result} core facts to free up space.`;

      triggerMemoryNotification('cleanup', desc);
    };

    const getToolFriendlyNameLocal = (toolId: string, lang: 'en' | 'ar'): string => {
      const mapping: Record<string, { en: string; ar: string }> = {
        'chat': { en: 'Strategic Assistant', ar: 'المساعد الاستراتيجي' },
        'chat_fast': { en: 'Fast Technical AI', ar: 'الذكاء التقني السريع' },
        'chat_pro': { en: 'Reasoning Pro Engine', ar: 'محرك الاستنتاج المتقدم' },
        'chat_reasoning': { en: 'Advanced Reasoning Protocol', ar: 'بروتوكول التفكير المعقد' },
        'perplexta_analysis': { en: 'Perplexta Analysis & Audit', ar: 'تحليل وبحث بيربليكستا' },
        'image': { en: 'Visual Synthesis Engine', ar: 'محرك التوليد البصري' },
        'video': { en: 'Cinematic Video Generator', ar: 'مولد الفيديو السينمائي' },
        'tts': { en: 'Voice Synthesis Engine', ar: 'محرك التوليد الصوتي' },
        'stt': { en: 'Speech Transcription', ar: 'التحويل الصوتي للنص' },
      };
      return mapping[toolId]?.[lang] || toolId;
    };

    const onWalletChargeNotice = (data: any) => {
      const textAr = `✓ سيتم خصم من رصيد محفظتك لتشغيل الخدمة. لمزيد من النقاط، قم بدعوة الأصدقاء`;
      const textEn = `✓ Your wallet balance will be debited to run the service. For more points, invite friends.`;

      setLedgerNotice({ textAr, textEn });
    };

    const onQuotaWarning = (data: any) => {
      const { toolId, pct, threshold, period } = data;
      const pctString = `${pct}%`;
      const periodStrAr = period === 'daily' ? 'اليومي' : 'الشهري';
      const periodStrEn = period === 'daily' ? 'Daily' : 'Monthly';

      let title = '';
      let desc = '';

      const toolNameAr = getToolFriendlyNameLocal(toolId, 'ar');
      const toolNameEn = getToolFriendlyNameLocal(toolId, 'en');

      if (threshold === 100) {
        title = dir === 'rtl' ? `⛔ استنفاد حد الاستهلاك` : `⛔ Quota Exhausted`;
        desc = dir === 'rtl' 
          ? `لقد استنفدت حدك ${periodStrAr} بالكامل لأداة "${toolNameAr}". سيتم السحب من الرصيد الاحتياطي في محفظتك للاستمرار دون توقف.`
          : `You have fully consumed your ${periodStrEn} quota for "${toolNameEn}". Future charges will fall back to your wallet.`;
      } else if (threshold === 80) {
        title = dir === 'rtl' ? `⚠️ تنبيه هام: استهلاك ${pctString}` : `⚠️ Urgent Quota Warning: ${pctString}`;
        desc = dir === 'rtl'
          ? `اقتربت من السعة الكاملة بنسبة استهلاك بلغت ${pctString} من حدك ${periodStrAr} لأداة "${toolNameAr}". بادر بدعوة أصدقائك وكسب أرصدة فورية في محفظتك!`
          : `You are approaching full capacity with ${pctString} of your ${periodStrEn} limit spent for "${toolNameEn}". Invite your friends to earn points!`;
      } else {
        title = dir === 'rtl' ? `ℹ️ تنبيه استهلاك الحدود: ${pctString}` : `ℹ️ Quota Status Alert: ${pctString}`;
        desc = dir === 'rtl'
          ? `استهلكت ${pctString} من حدك ${periodStrAr} للمساعد "${toolNameAr}". شارك كود الإحالة المخصص لك مع زملائك المتميزين لكسب أرصدة مجانية فوراً!`
          : `You have consumed ${pctString} of your ${periodStrEn} limit for "${toolNameEn}". Share your referral link to earn points instantly!`;
      }

      toast.info(title, {
        description: desc,
        duration: 8000,
        action: {
          label: dir === 'rtl' ? 'دعوة الأصدقاء 🎁' : 'Invite Friends 🎁',
          onClick: () => {
            const referralCode = user?.referral_code || '';
            const shareUrl = `${window.location.origin}/register?ref=${referralCode}`;
            navigator.clipboard.writeText(shareUrl);
            toast.success(dir === 'rtl' ? 'تم نسخ رابط الدعوة مجهزاً للمشاركة!' : 'Invitation link copied successfully!');
          }
        }
      });
    };

    const onChatError = (data: any) => {
      let errorMessage = '';
      let isQuota = false;
      let isInactive = false;
      let isFunds = false;
      let quotaData = null;

      try {

        const parsed = JSON.parse(data.message);
        errorMessage = dir === 'rtl' ? (parsed.error_ar || parsed.error) : (parsed.error || parsed.error_ar);
        if (parsed.type === 'QUOTA_EXCEEDED') {
          isQuota = true;
          quotaData = parsed;
        } else if (parsed.type === 'INSUFFICIENT_FUNDS') {
          isFunds = true;
          quotaData = parsed;
        } else if (parsed.type === 'TOKEN_EXPIRED') {
          errorMessage = dir === 'rtl' ? 'انتهت صلاحية الجلسة. يرجى تحديث الصفحة أو تسجيل الدخول مرة أخرى.' : 'Session expired. Please refresh the page or login again.';
          setTimeout(() => window.location.reload(), 3000);
        } else if (parsed.type === 'SYSTEM_INACTIVE') {
          isInactive = true;
          quotaData = parsed;
        }
      } catch (e) {

        errorMessage = dir === 'rtl' ? `حدث خطأ: ${data.message}` : `Error: ${data.message}`;
      }

      setMessages(prev => {
        const newMessages = [...prev];
        const lastMessage = newMessages[newMessages.length - 1];

        if (lastMessage && lastMessage.role === 'assistant' && lastMessage.content === '') {
          newMessages[newMessages.length - 1] = { 
            ...lastMessage, 
            content: errorMessage,
            is_quota_error: isQuota,
            is_system_inactive: isInactive,
            is_insufficient_funds: isFunds,
            quota_data: quotaData,
            is_image_failed: lastMessage.tool === 'image' || selectedTool === 'image',
            is_video_failed: lastMessage.tool === 'video' || selectedTool === 'video',
            tool: lastMessage.tool || selectedTool
          };
          return newMessages;
        }
        return [...prev, { 
          role: 'assistant', 
          content: errorMessage,
          is_quota_error: isQuota,
          is_system_inactive: isInactive,
          is_insufficient_funds: isFunds,
          quota_data: quotaData,
          is_image_failed: selectedTool === 'image',
          is_video_failed: selectedTool === 'video',
          tool: selectedTool
        }];
      });
      setIsGenerating(false);
    };

    const onSearchSteps = (data: { step: string; status: 'completed' | 'processing' | 'pending' }) => {
      setMessages(prev => {
        const newMessages = [...prev];
        const lastMessage = newMessages[newMessages.length - 1];
        if (lastMessage && lastMessage.role === 'assistant') {
          const steps = [...(lastMessage.thinking_steps || [])];
          const existingIdx = steps.findIndex(s => s.step === data.step);
          if (existingIdx !== -1) {
            steps[existingIdx] = data;
          } else {
            steps.push(data);
          }
          newMessages[newMessages.length - 1] = { ...lastMessage, thinking_steps: steps };
        }
        return newMessages;
      });
    };

    const onCitations = (data: { citations: Message['citations'] }) => {
      setMessages(prev => {
        const newMessages = [...prev];
        const lastMessage = newMessages[newMessages.length - 1];
        if (lastMessage && lastMessage.role === 'assistant') {
          newMessages[newMessages.length - 1] = { ...lastMessage, citations: data.citations };
        }
        return newMessages;
      });
    };

    const onTyping = (data: { isTyping: boolean; role?: 'assistant' | 'user'; name?: string }) => {
      if (data) {
        setIsOtherTyping(data.isTyping);
        setTypingParty(data.role || 'assistant');
        setTypingName(data.name || '');
      }
    };

    const onImageProgress = (data: { progress?: number; status_ar?: string; status_en?: string }) => {
      setImageProgress({
        progress: data.progress,
        statusLabel: dir === 'rtl' ? data.status_ar : data.status_en
      });
    };

    socket.on('chat_chunk', onChatChunk);
    socket.on('chat_response', onChatResponse);
    socket.on('search_steps', onSearchSteps);
    socket.on('citations', onCitations);
    socket.on('typing', onTyping);
    socket.on('memory_extracted', onMemoryExtracted);
    socket.on('memory_warning', onMemoryWarning);
    socket.on('memory_cleanup', onMemoryCleanup);
    socket.on('memory_consolidation', onMemoryConsolidation);
    socket.on('wallet_charge_notice', onWalletChargeNotice);
    socket.on('quota_warning', onQuotaWarning);
    socket.on('chat_error', onChatError);
    socket.on('image_progress', onImageProgress);

    return () => {
      if (checkBufferIntervalRef.current) {
        clearInterval(checkBufferIntervalRef.current);
        checkBufferIntervalRef.current = null;
      }
      socket.off('chat_chunk', onChatChunk);
      socket.off('chat_response', onChatResponse);
      socket.off('search_steps', onSearchSteps);
      socket.off('citations', onCitations);
      socket.off('typing', onTyping);
      socket.off('memory_extracted', onMemoryExtracted);
      socket.off('memory_warning', onMemoryWarning);
      socket.off('memory_cleanup', onMemoryCleanup);
      socket.off('memory_consolidation', onMemoryConsolidation);
      socket.off('wallet_charge_notice', onWalletChargeNotice);
      socket.off('quota_warning', onQuotaWarning);
      socket.off('chat_error', onChatError);
      socket.off('image_progress', onImageProgress);
    };
  }, [socket, dir]);

  useEffect(() => {
    const handleClearChat = () => {
      setMessages(prev => {
        if (prev.length === 0 && !chatId) return prev;
        return [];
      });
      setChatId(null);
    };

    const handleLoadChat = (e: any) => {
      navigate(`/chat/${e.detail}`);
    };

    window.addEventListener('clear-chat', handleClearChat);
    window.addEventListener('load-chat', handleLoadChat);
    return () => {
      window.removeEventListener('clear-chat', handleClearChat);
      window.removeEventListener('load-chat', handleLoadChat);
    };
  }, [navigate]);

  const findUserPrompt = (index: number): string => {
    for (let i = index - 1; i >= 0; i--) {
      if (messages[i]?.role === 'user') {
        return messages[i].content;
      }
    }
    return '';
  };

  const handleSendOrStop = async (overrideQuery?: string, overrideMessages?: Message[]) => {
    if (isGenerating) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setIsGenerating(false);
    } else {
      if (!user) {
        setIsAuthModalOpen(true);
        return;
      }

      if (!hasActiveSub) {
        navigate('/subscription');
        return;
      }

      setLedgerNotice(null);
      setTypedNotice('');

      const currentQuery = overrideQuery || query;
      if (!currentQuery.trim() && !selectedFile) return;

      const MAX_USER_PROMPT_LIMIT = 16000;
      if (currentQuery.length > MAX_USER_PROMPT_LIMIT) {
        toast.error(
          dir === 'rtl' 
            ? `تنبيه: يتجاوز هذا النص حد الاستخدام العادل المسموح به (${MAX_USER_PROMPT_LIMIT.toLocaleString()} حرفاً). يرجى تقسيمه أو اختصاره.`
            : `Constraint Alert: This text exceeds the fair-use limit of ${MAX_USER_PROMPT_LIMIT.toLocaleString()} characters. Please partition or shorten your text.`
        );
        return;
      }

      const toolToUse = selectedFile ? 'perplexta_analysis' : (activeDropdown === 'model' 
        ? (selectedModel === 'fast' ? 'chat_fast' : selectedModel === 'pro' ? 'chat_pro' : selectedModel === 'thinking' ? 'chat_reasoning' : 'chat')
        : selectedTool);

      const tempUserMsgId = `cli_${Date.now()}_u`;
      const tempAstMsgId = `cli_${Date.now()}_a`;

      let updatedMessages: Message[] = [
        ...(overrideMessages || messages), 
        { 
          client_id: tempUserMsgId,
          role: 'user', 
          content: currentQuery,
          tool: toolToUse,
          created_at: new Date().toISOString(),
          file: selectedFile ? {
            name: selectedFile.name,
            type: selectedFile.type,
            preview: previewUrl || undefined
          } : undefined
        }, 
        { 
          client_id: tempAstMsgId,
          role: 'assistant', 
          content: '', 
          tool: toolToUse, 
          is_streaming: true,
          created_at: new Date().toISOString()
        }
      ];

      if (updatedMessages.length > MAX_CHAT_MESSAGES) {
        updatedMessages = updatedMessages.slice(updatedMessages.length - MAX_CHAT_MESSAGES);
        setShowChatLimitWarning(true);
      }

      generationStartTimeRef.current = Date.now();
      setImageProgress(null);
      setIsGenerating(true);
      isGeneratingRef.current = true;
      streamingBuffer.current = '';
      isServerDoneRef.current = false;

      trackGAEvent('chat_submitted', 'chat_engagement', toolToUse);

      setMessages(updatedMessages);

      setQuery('');
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (socket) {
        socket.emit('typing', { isTyping: false, role: 'user', name: user?.name || 'User' });
      }
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }

      abortControllerRef.current = new AbortController();

      const encodeHex = (str: string) => {
        return Array.from(new TextEncoder().encode(str))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');
      };

      try {
        const authToken = token || localStorage.getItem('app_token');

        let currentChatId = chatId;
        if (!currentChatId) {
          const res = await fetch('/api/chats', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json', 
              'Authorization': `Bearer ${authToken}` 
            },
            body: JSON.stringify({ 
              title: currentQuery.substring(0, 50),
              message: currentQuery,
              tool: toolToUse
            })
          });

          if (res.ok) {
            const data = await res.json();
            currentChatId = data.id;
            setChatId(currentChatId);
            chatIdRef.current = currentChatId; 
            navigate(`/chat/${currentChatId}`, { replace: true });
            setTimeout(() => {
              window.dispatchEvent(new Event('chat-created'));
              window.dispatchEvent(new Event('chat-updated'));
            }, 100);
          } else {
            const errorData = await res.json();
            throw new Error(errorData.error || 'Failed to create chat');
          }
        } else {
          const msgRes = await fetch(`/api/chats/${currentChatId}/messages`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json', 
              'Authorization': `Bearer ${authToken}` 
            },
            body: JSON.stringify({ role: 'user', content: currentQuery })
          });

          if (!msgRes.ok) {
            const errorData = await msgRes.json();
            throw new Error(errorData.error || 'Failed to save message');
          }
          window.dispatchEvent(new Event('chat-updated'));
        }

      const encryptedQuery = await encrypt(currentQuery);
      const encryptedCustomInstructions = '';

        if (!socket) {
          throw new Error(dir === 'rtl' ? 'لم يتم العثور على اتصال' : 'Socket connection not found');
        }

      const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = error => reject(error);
        });
      };

      let fileData = null;
      if (selectedFile) {
        const MAX_SIZE = 100 * 1024 * 1024;
        if (selectedFile.size > MAX_SIZE) {
          throw new Error(dir === 'rtl' 
            ? 'حجم الملف كبير جداً (الحد الأقصى 100 ميجابايت)' 
            : 'File size exceeds maximum allowed limit (max 100MB)');
        }

        try {
          const base64 = await fileToBase64(selectedFile);
          const base64Content = base64.includes(',') ? base64.split(',')[1] : base64;
          fileData = {
            data: base64Content,
            name: selectedFile.name,
            type: selectedFile.type
          };
        } catch (error) {

        }
      }

      let finalAudioSettings = audioSettings;
      if (selectedTool === 'canvas') {
        const textToParse = currentQuery.toLowerCase();
        let updated = { ...audioSettings };

        if (textToParse.includes('ملحمية') || textToParse.includes('أوركسترا') || textToParse.includes('epic') || textToParse.includes('orchestra') || textToParse.includes('orchestral')) {
          updated.mood = 'Epic';
        } else if (textToParse.includes('طرب') || textToParse.includes('شرقي') || textToParse.includes('مقام') || textToParse.includes('tarab') || textToParse.includes('maqam')) {
          updated.mood = 'Tarab';
        } else if (textToParse.includes('إلكترونك') || textToParse.includes('دي جي') || textToParse.includes('تقنو') || textToParse.includes('تكنو') || textToParse.includes('edm') || textToParse.includes('techno') || textToParse.includes('electronic')) {
          updated.mood = 'EDM';
        } else if (textToParse.includes('غيتار') || textToParse.includes('تخت') || textToParse.includes('هادئ') || textToParse.includes('acoustic') || textToParse.includes('guitar') || textToParse.includes('soft') || textToParse.includes('كلاسيك')) {
          updated.mood = 'Acoustic';
        } else if (textToParse.includes('لوفاي') || textToParse.includes('لو-فاي') || textToParse.includes('lofi') || textToParse.includes('lo-fi') || textToParse.includes('chill')) {
          updated.mood = 'LoFi';
        } else if (textToParse.includes('جاز') || textToParse.includes('بلوز') || textToParse.includes('jazz') || textToParse.includes('blues')) {
          updated.mood = 'Jazz';
        } else if (textToParse.includes('بوب') || textToParse.includes('حماسي') || textToParse.includes('pop') || textToParse.includes('upbeat')) {
          updated.mood = 'Pop';
        }

        if (textToParse.includes('كورال') || textToParse.includes('choir') || textToParse.includes('choral')) {
          updated.vocalType = 'Choir';
        } else if (textToParse.includes('أنثوي') || textToParse.includes('سوبرانو') || textToParse.includes('female') || textToParse.includes('soprano')) {
          updated.vocalType = 'Female';
        } else if (textToParse.includes('ذكوري') || textToParse.includes('تينور') || textToParse.includes('male') || textToParse.includes('baritone')) {
          updated.vocalType = 'Male';
        } else if (textToParse.includes('روبوت') || textToParse.includes('سنتسيزر') || textToParse.includes('vocaloid') || textToParse.includes('ai synth')) {
          updated.vocalType = 'Vocaloid';
        } else if (textToParse.includes('بدون غناء') || textToParse.includes('موسيقى فقط') || textToParse.includes('عزف') || textToParse.includes('instrumental') || textToParse.includes('no vocals') || textToParse.includes('none')) {
          updated.vocalType = 'Instrumental';
        }

        const normalizedPrompt = textToParse
          .replace(/[٠0]/g, '0')
          .replace(/[١1]/g, '1')
          .replace(/[٢2]/g, '2')
          .replace(/[٣3]/g, '3')
          .replace(/[٤4]/g, '4')
          .replace(/[٥5]/g, '5')
          .replace(/[٦6]/g, '6')
          .replace(/[٧7]/g, '7')
          .replace(/[٨8]/g, '8')
          .replace(/[٩9]/g, '9');

        const durationMatch = normalizedPrompt.match(/(?:المدة|duration|المدة الزمنية|طول)\s*:\s*\*?(\d+)/) || 
                              normalizedPrompt.match(/(\d+)\s*(?:ثانية|ثوانٍ|seconds|secs|s)/);
        if (durationMatch) {
          const durVal = parseInt(durationMatch[1], 10);
          if (!isNaN(durVal) && durVal >= 10 && durVal <= 120) {
            updated.duration = durVal;
          }
        }

        setAudioSettings(updated);
        finalAudioSettings = updated;
      }

      socket.emit('chat_message', {
        token: authToken,
        tool_id: toolToUse,
        model_id: activeDropdown === 'model' ? selectedModel : undefined,
        chat_id: currentChatId,
        data_p: encryptedQuery,
        data_s: encryptedCustomInstructions,
        mode: 'aes_v2',
        file_data: fileData,
        forensic_mode: forensicMode,
        video_settings: selectedTool === 'video' ? videoSettings : undefined,
        image_settings: selectedTool === 'image' ? imageSettings : undefined,
        audio_settings: selectedTool === 'canvas' ? finalAudioSettings : undefined
      });
      setSelectedFile(null);
      setPreviewUrl(null);
      setForensicMode(false);
      setForensicReport(null);
      const input = document.getElementById('unified-upload') as HTMLInputElement;
      if (input) input.value = '';
    } catch (error: any) {
        const isOffline = !navigator.onLine || 
                         error.message.includes('fetch') || 
                         error.message.includes('NetworkError') || 
                         error.message.includes('connection') ||
                         error.message.includes('Failed to fetch') ||
                         error.message.includes('Socket');

        if (isOffline) {
          try {
            const dbRequest = indexedDB.open('perplexta-pwa-db', 2);
            dbRequest.onupgradeneeded = (evt: any) => {
              const db = evt.target.result;
              if (!db.objectStoreNames.contains('failed-messages')) {
                db.createObjectStore('failed-messages', { keyPath: 'id' });
              }
            };
            dbRequest.onsuccess = (evt: any) => {
              const db = evt.target.result;
              const transaction = db.transaction('failed-messages', 'readwrite');
              const store = transaction.objectStore('failed-messages');
              const failedId = 'failed_' + Date.now().toString();
              const payload = {
                id: failedId,
                chatId: chatIdRef.current || chatId,
                content: currentQuery,
                toolId: toolToUse,
                modelId: activeDropdown === 'model' ? selectedModel : undefined,
                token: token || localStorage.getItem('app_token'),
                timestamp: Date.now()
              };
              store.add(payload);

              if ('serviceWorker' in navigator && 'SyncManager' in window) {
                navigator.serviceWorker.ready.then(reg => {
                  return (reg as any).sync.register('sync-failed-messages');
                }).then(() => {
                }).catch(() => {});
              }
            };
          } catch (e) {

          }

          setMessages(prev => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];
            const offlineLabelAr = 'أنت غير متصل بالإنترنت. تم حفظ رسالتك في قائمة الانتظار، وسيتم إرسالها تلقائياً عند استعادة الاتصال (مزامنة خلفية).';
            const offlineLabelEn = 'You are offline. Your message has been queued and will be automatically delivered once connection is restored (Background Sync).';
            const notification = dir === 'rtl' ? offlineLabelAr : offlineLabelEn;
            if (lastMessage && lastMessage.role === 'assistant') {
              newMessages[newMessages.length - 1] = { 
                role: 'assistant', 
                content: notification, 
                tool: toolToUse,
                created_at: new Date().toISOString()
              };
              return newMessages;
            }
            return [...prev, { role: 'assistant', content: notification, tool: toolToUse, created_at: new Date().toISOString() }];
          });
          setIsGenerating(false);
          setSelectedFile(null);
          setPreviewUrl(null);
          setForensicMode(false);
          setForensicReport(null);
          const input = document.getElementById('unified-upload') as HTMLInputElement;
          if (input) input.value = '';
          return;
        }

        if (error.name === 'AbortError') {
          setMessages(prev => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];
            const stopMessage = dir === 'rtl' ? 'تم إيقاف التوليد.' : 'Generation stopped.';
            if (lastMessage && lastMessage.role === 'assistant' && lastMessage.content === '') {
              newMessages[newMessages.length - 1] = { ...lastMessage, content: stopMessage };
              return newMessages;
            }
            return [...prev, { role: 'assistant', content: stopMessage }];
          });
        } else {

          setMessages(prev => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];
            const errorMessage = dir === 'rtl' ? `حدث خطأ: ${error.message}` : `Error: ${error.message}`;
            if (lastMessage && lastMessage.role === 'assistant' && lastMessage.content === '') {
              newMessages[newMessages.length - 1] = { ...lastMessage, content: errorMessage };
              return newMessages;
            }
            return [...prev, { role: 'assistant', content: errorMessage }];
          });
        }
        setIsGenerating(false);
      } finally {
        abortControllerRef.current = null;
      }
    }
  };

  const models = [
    { id: 'pro', label: t('pro'), icon: <Sparkles size={18} />, color: 'text-emerald-500', dotColor: 'bg-emerald-500' },
    { id: 'fast', label: t('fast'), icon: <Zap size={18} />, color: 'text-emerald-500', dotColor: 'bg-emerald-500' },
    { id: 'thinking', label: t('thinking'), icon: <Brain size={18} />, color: 'text-emerald-500', dotColor: 'bg-emerald-500' },
  ];

  const renderImageSettings = () => {
    if (selectedTool !== 'image' || !showImageSettings) return null;

    const ratios = ['1:1', '4:3', '3:2', '16:9', '9:16'];
    const qualities = ['Standard', 'HD', 'Ultra'];
    const styles = ['Cinematic', 'Realistic', 'Anime', 'Digital Art'];

    return (
      <motion.div 
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, y: 5 }}
        className="mb-1 w-full pointer-events-auto"
      >
        <div className={`flex items-center justify-between px-1 md:px-8 pb-1 overflow-x-auto scrollbar-none gap-3 md:gap-0 ${dir === 'rtl' ? 'flex-row' : 'flex-row-reverse'}`}>
          <div className={`flex items-center gap-3 md:gap-7 shrink-0 ${dir === 'rtl' ? 'flex-row-reverse' : 'flex-row'}`}>
            <div className="flex items-center gap-2 md:gap-3.5">
              {ratios.map(r => (
                <button
                  key={r}
                  onClick={() => setImageSettings(prev => ({ ...prev, aspectRatio: r }))}
                  className={`text-[7px] md:text-[9px] font-black transition-theme pointer-events-auto cursor-pointer ${
                    imageSettings.aspectRatio === r 
                      ? 'text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.7)] scale-110' 
                      : 'text-gray-400/40 hover:text-gray-200'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            <div className="w-px h-2 bg-gray-200/5 dark:bg-[var(--bg-secondary)]/5" />

            <div className="flex items-center gap-2.5 md:gap-4">
              {qualities.map(q => (
                <button
                  key={q}
                  onClick={() => setImageSettings(prev => ({ ...prev, quality: q }))}
                  className={`text-[6px] md:text-[8px] font-black uppercase tracking-widest transition-theme pointer-events-auto cursor-pointer ${
                    imageSettings.quality === q 
                      ? 'text-emerald-500 underline underline-offset-4 decoration-2 scale-105' 
                      : 'text-[var(--text-muted)]/30 hover:text-[var(--text-primary)]'
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          <div className={`flex items-center gap-2.5 md:gap-6 shrink-0 ${dir === 'rtl' ? 'flex-row' : 'flex-row'}`}>
            <div className={`flex items-center gap-2 md:gap-4 ${dir === 'rtl' ? 'flex-row' : 'flex-row'}`}>
              {styles.map(s => (
                <button
                  key={s}
                  onClick={() => setImageSettings(prev => ({ ...prev, style: s }))}
                  className={`text-[6.5px] md:text-[8.5px] font-black uppercase tracking-wider transition-all duration-300 whitespace-nowrap pointer-events-auto cursor-pointer ${
                    imageSettings.style === s 
                      ? 'text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)] scale-110 font-bold underline underline-offset-4 decoration-2' 
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {dir === 'rtl' ? (
                    s === 'Cinematic' ? 'سينمائي' :
                    s === 'Realistic' ? 'واقعي' :
                    s === 'Anime' ? 'أنمي' :
                    'فن رقمي'
                  ) : s}
                </button>
              ))}
            </div>

            <div className="w-px h-2 bg-gray-200/5 dark:bg-[var(--bg-secondary)]/5 mx-1" />

            <button 
              onClick={() => setShowImageSettings(false)}
              className="text-gray-400/10 hover:text-emerald-500 transition-theme hover:rotate-90 p-0.5 pointer-events-auto"
              title={dir === 'rtl' ? 'إغلاق' : 'Close'}
            >
              <Plus size={10} className="rotate-45" />
            </button>
          </div>
        </div>
      </motion.div>
    );
  };

  const renderAudioSettings = () => {
    if (selectedTool !== 'canvas' || !showAudioSettings) return null;

    const moods = [
      { id: 'Epic', label: dir === 'rtl' ? 'أوركسترا ملحمية' : 'Epic Orchestral' },
      { id: 'Tarab', label: dir === 'rtl' ? 'طرب ومقام شرقي' : 'Arabic Tarab' },
      { id: 'EDM', label: dir === 'rtl' ? 'إلكترونك ودي جي' : 'EDM & Techno' },
      { id: 'Acoustic', label: dir === 'rtl' ? 'غيتار وتخت هادئ' : 'Acoustic & Soft' },
      { id: 'LoFi', label: dir === 'rtl' ? 'لو-فاي مريح' : 'Chill Lo-Fi' },
      { id: 'Jazz', label: dir === 'rtl' ? 'جاز بلوز' : 'Jazz & Blues' },
      { id: 'Pop', label: dir === 'rtl' ? 'بوب حماسي' : 'Energetic Pop' }
    ];

    const vocalTypes = [
      { id: 'Instrumental', label: dir === 'rtl' ? 'لحن صامت' : 'Instrumental' },
      { id: 'Male', label: dir === 'rtl' ? 'صوت رجالي' : 'Male Vocal' },
      { id: 'Female', label: dir === 'rtl' ? 'صوت نسائي' : 'Female Vocal' },
      { id: 'Choir', label: dir === 'rtl' ? 'كورال جماعي' : 'Choir Vocal' },
      { id: 'Vocaloid', label: dir === 'rtl' ? 'مؤثرات أصوات AI' : 'AI Synth Vocal' }
    ];

    const appendAudioTag = (tagLabel: string) => {
      setQuery(prev => {
        const cleanedLabel = tagLabel.trim();
        if (prev.includes(`[${cleanedLabel}]`)) return prev;
        const trimmed = prev.trim();
        if (!trimmed) return `[${cleanedLabel}] `;
        return `${trimmed} [${cleanedLabel}] `;
      });
    };

    return (
      <motion.div 
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, y: 5 }}
        className="mb-1 w-full pointer-events-auto"
      >
        <div className={`flex items-center justify-between px-1 md:px-8 pb-1 overflow-x-auto scrollbar-none gap-3 md:gap-0 ${dir === 'rtl' ? 'flex-row' : 'flex-row-reverse'}`}>
          <div className={`flex items-center gap-3 md:gap-7 shrink-0 ${dir === 'rtl' ? 'flex-row-reverse' : 'flex-row'}`}>
            <div className="flex items-center gap-2 md:gap-3.5">
              {moods.map(m => (
                <button
                  key={m.id}
                  onClick={() => {
                    setAudioSettings(prev => ({ ...prev, mood: m.id }));
                    appendAudioTag(m.label);
                  }}
                  className={`text-[7px] md:text-[9px] font-black transition-theme pointer-events-auto cursor-pointer ${
                    audioSettings.mood === m.id 
                      ? 'text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.7)] scale-110 font-bold' 
                      : 'text-gray-400/40 hover:text-gray-200'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <div className="w-px h-2 bg-gray-200/5 dark:bg-[var(--bg-secondary)]/5" />

            <div className="flex items-center gap-2.5 md:gap-4">
              {[15, 30, 60, 90].map(d => (
                <button
                  key={d}
                  onClick={() => {
                    setAudioSettings(prev => ({ ...prev, duration: d }));
                    appendAudioTag(`${d}${dir === 'rtl' ? ' ثواني' : 's'}`);
                  }}
                  className={`text-[7px] md:text-[9px] font-bold tracking-widest transition-theme pointer-events-auto cursor-pointer ${
                    audioSettings.duration === d 
                      ? 'text-emerald-500 underline underline-offset-4 decoration-2 scale-105' 
                      : 'text-gray-400/30 hover:text-gray-200'
                  }`}
                >
                  {d}{dir === 'rtl' ? 'ث' : 'S'}
                </button>
              ))}
            </div>
          </div>

          <div className={`flex items-center gap-2.5 md:gap-6 shrink-0 ${dir === 'rtl' ? 'flex-row' : 'flex-row'}`}>
            <div className={`flex items-center gap-2 md:gap-4 ${dir === 'rtl' ? 'flex-row-reverse' : 'flex-row'}`}>
              {vocalTypes.map(v => (
                <button
                  key={v.id}
                  onClick={() => {
                    setAudioSettings(prev => ({ ...prev, vocalType: v.id }));
                    appendAudioTag(v.label);
                  }}
                  className={`text-[7px] md:text-[9px] font-bold transition-theme pointer-events-auto cursor-pointer px-1.5 py-0.5 rounded-[var(--radius)] ${
                    audioSettings.vocalType === v.id 
                      ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.2)]' 
                      : 'text-gray-400/30 hover:text-gray-200'
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>

            <div className="w-px h-2 bg-gray-200/5 dark:bg-[var(--bg-secondary)]/5 mx-1" />

            <button 
              onClick={() => setShowAudioSettings(false)}
              className="text-gray-400/10 hover:text-emerald-500 transition-theme hover:rotate-90 p-0.5 pointer-events-auto"
              title={dir === 'rtl' ? 'إغلاق' : 'Close'}
            >
              <Plus size={10} className="rotate-45" />
            </button>
          </div>
        </div>
      </motion.div>
    );
  };

  const renderVideoSettings = () => {
    if (selectedTool !== 'video' || !showVideoSettings) return null;

    const ratios = ['16:9', '9:16', '1:1', '4:3'];
    const resolutions = ['720p', '1080p'];
    const styles = ['Cinematic', 'Realistic', '3D Render', 'Anime', 'Cyberpunk'];

    const styleTrans: Record<string, string> = {
      'Cinematic': dir === 'rtl' ? 'سينمائي' : 'Cinematic',
      'Realistic': dir === 'rtl' ? 'واقعي' : 'Realistic',
      '3D Render': dir === 'rtl' ? 'رندر ثلاثي' : '3D Render',
      'Anime': dir === 'rtl' ? 'أنمي' : 'Anime',
      'Cyberpunk': dir === 'rtl' ? 'سايبربانك' : 'Cyberpunk'
    };

    return (
      <motion.div 
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, y: 5 }}
        className={`mb-1 w-full flex items-center justify-between pointer-events-auto px-1 md:px-8 pb-1 overflow-x-auto scrollbar-none ${dir === 'rtl' ? 'flex-row' : 'flex-row-reverse'}`}
      >
        <div className={`flex items-center gap-3 md:gap-7 shrink-0 ${dir === 'rtl' ? 'flex-row-reverse' : 'flex-row'}`}>

          <div className="flex items-center gap-1.5 md:gap-2">
            {styles.map(st => (
              <button
                key={st}
                onClick={() => setVideoSettings(prev => ({ ...prev, style: st }))}
                className={`text-[7px] md:text-[9px] font-bold px-2 py-0.5 rounded-[4px] border transition-all duration-300 pointer-events-auto cursor-pointer ${
                  videoSettings.style === st
                    ? 'text-emerald-500 border-emerald-500/30 bg-emerald-500/5 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)] scale-105'
                    : 'text-gray-400/40 border-transparent hover:text-gray-200'
                }`}
              >
                {styleTrans[st]}
              </button>
            ))}
          </div>

          <div className="w-px h-3 bg-zinc-800/80" />

          <div className="flex items-center gap-2 md:gap-3.5">
            {ratios.map(r => (
              <button
                key={r}
                onClick={() => setVideoSettings(prev => ({ ...prev, aspectRatio: r }))}
                className={`text-[7px] md:text-[9px] font-black transition-theme pointer-events-auto cursor-pointer ${
                  videoSettings.aspectRatio === r 
                    ? 'text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.7)] scale-110' 
                    : 'text-gray-400/40 hover:text-gray-200'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <div className="w-px h-3 bg-zinc-800/80" />

          <div className="flex items-center gap-2.5 md:gap-4">
            {resolutions.map(res => (
              <button
                key={res}
                onClick={() => setVideoSettings(prev => ({ ...prev, resolution: res }))}
                className={`text-[6px] md:text-[8px] font-black uppercase tracking-widest transition-theme pointer-events-auto cursor-pointer ${
                  videoSettings.resolution === res 
                    ? 'text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.7)] scale-110' 
                    : 'text-gray-400/30 hover:text-gray-200'
                }`}
              >
                {res}
              </button>
            ))}
          </div>
        </div>

        <div className={`flex items-center gap-2.5 md:gap-6 shrink-0 ${dir === 'rtl' ? 'flex-row' : 'flex-row-reverse'}`}>
          <button 
            onClick={() => setShowVideoSettings(false)}
            className="text-gray-400/10 hover:text-emerald-500 transition-theme hover:rotate-90 p-0.5 pointer-events-auto"
            title="Close Settings"
          >
            <Plus size={10} className="rotate-45" />
          </button>

          <div className={`flex items-center gap-1.5 md:gap-3 min-w-[80px] md:min-w-[150px] ${dir === 'rtl' ? 'flex-row' : 'flex-row-reverse'}`}>
            <span className="text-[8px] font-black text-emerald-500/80 whitespace-nowrap drop-shadow-[0_0_5px_rgba(16,185,129,0.2)]">{videoSettings.duration}s</span>

            <div className="relative flex-1 h-3 flex items-center group/slider">
              <input 
                type="range" 
                min="1" 
                max="15" 
                value={videoSettings.duration} 
                onChange={(e) => setVideoSettings(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                className="w-full h-0.5 bg-[var(--bg-overlay)] rounded-full appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-400 transition-theme pointer-events-auto"
              />
            </div>

            <span className="text-[6px] md:text-[8px] font-bold text-gray-400/30 uppercase tracking-tighter whitespace-nowrap">{t('videoDuration')}</span>
          </div>
        </div>
      </motion.div>
    );
  };

  const advancedTools = [
    { id: 'chat', label: t('chat'), icon: <MessageSquare size={18} />, isNew: false },
    { id: 'code', label: t('code'), icon: <Code size={18} />, isNew: true },
    { id: 'image', label: t('image'), icon: <ImageIcon size={18} />, isNew: false },
    { id: 'video', label: t('video'), icon: <Video size={18} />, isNew: true },
    { id: 'learning', label: t('learning'), icon: <BookOpen size={18} />, isNew: true },
    { id: 'legal_analysis', label: t('legal_analysis'), icon: <Scale size={18} />, isNew: true },
    { id: 'perplexta_analysis', label: t('perplexta_analysis'), icon: <Search size={18} />, isNew: true },
    { id: 'canvas', label: t('canvas'), icon: <Music size={18} />, isNew: true },
    { id: 'notebook', label: t('notebook'), icon: <Megaphone size={18} />, isNew: true },
    { id: 'tts', label: t('tts'), icon: <Volume2 size={18} />, isNew: true },
    { id: 'stt', label: t('stt'), icon: <Mic size={18} />, isNew: true },
  ].filter(t => !isMobile || (t.id !== 'code' && t.id !== 'notebook'));

  const currentModel = models.find(m => m.id === selectedModel) || models[2];
  const currentTool = advancedTools.find(t => t.id === selectedTool) || advancedTools[0];
  const isToolActive = selectedTool !== 'chat';

  const renderInputArea = () => (
    <div className="w-full flex flex-col box-border min-w-0 px-3 sm:px-6 max-w-4xl mx-auto">

      {renderVideoSettings()}
      {renderImageSettings()}
      {renderAudioSettings()}

      <div className="relative w-full">

        <AnimatePresence>
          {ledgerNotice && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: -2 }}
              transition={{ 
                opacity: { duration: 0.35, ease: "easeInOut" },
                y: { duration: 0.4, ease: "easeInOut" }
              }}
              className="absolute bottom-full left-0 mb-2 w-full z-50 pointer-events-none"
            >
              <div 
                className={`flex items-center gap-2 font-sans text-xs sm:text-[13px] md:text-[14px] font-medium leading-relaxed select-none ${dir === 'rtl' ? 'justify-start text-right pr-1' : 'justify-start text-left pl-1'}`}
                style={{ 
                  color: user?.subscription?.plan_color || '#10b981',
                  textShadow: `0 0 14px ${(user?.subscription?.plan_color || '#10b981')}45`
                }}
              >
                <span>{typedNotice || ''}</span>
                {typedNotice && typedNotice.length < (dir === 'rtl' ? ledgerNotice.textAr : ledgerNotice.textEn).length && (
                  <span 
                    className="inline-block w-1.5 h-4 animate-pulse bg-current relative top-0.5" 
                    style={{ backgroundColor: user?.subscription?.plan_color || '#10b981' }} 
                  />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div 
          className={`w-full flex flex-col rounded-md border box-border min-w-0 transition-theme bg-transparent border-[var(--border-main)] ${
            isFocused 
              ? 'border-emerald-500/40 shadow-[0_0_0_4px_rgba(16,185,129,0.03)]' 
              : ''
          }`}
        >

        {selectedFile && (
          <div className="px-2 pt-2 flex items-start gap-2">
            <div className={`relative group p-1 rounded-sm border transition-theme bg-transparent border-[var(--border)] flex-shrink-0`}>
              <div className="flex items-center gap-2 px-1.5 py-1 min-w-[120px]">
                {previewUrl && selectedFile.type.startsWith('image/') ? (
                  <div className="w-8 h-8 rounded-sm overflow-hidden border border-[var(--border)] bg-[var(--bg-base)]">
                    <img src={previewUrl} alt="preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                ) : (
                  <div className={`w-8 h-8 rounded-sm flex items-center justify-center bg-[var(--bg-base)] text-emerald-500 shadow-sm`}>
                    {getFileIcon(selectedFile.type)}
                  </div>
                )}
                <div className="flex flex-col min-w-0 pr-6">
                  <span className="text-[10px] font-bold text-[var(--text-primary)] truncate max-w-[100px]">
                    {selectedFile.name}
                  </span>
                  <span className="text-[8px] text-[var(--text-muted)] uppercase font-black tracking-tight">
                    {(Number(selectedFile.size || 0) / 1024).toFixed(1)} KB
                  </span>
                </div>
              </div>

              <button 
                onClick={() => {
                  setSelectedFile(null);
                  setPreviewUrl(null);
                  setForensicMode(false);
                  setForensicReport(null);
                  const input = document.getElementById('unified-upload') as HTMLInputElement;
                  if (input) input.value = '';
                }}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-theme z-10"
              >
                <Plus size={10} className="rotate-45" />
              </button>
            </div>

            {selectedFile.type === 'application/pdf' && (
              <div className="flex items-center gap-3 self-center pl-2 border-l border-[var(--border)] ml-2 h-10 select-none">
                <button
                  type="button"
                  onClick={triggerForensicDiagnostic}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] border border-transparent hover:border-emerald-500/30 hover:bg-emerald-500/5 text-xs font-semibold text-emerald-500 transition-all duration-300 shadow-none bg-transparent"
                >
                  <Sparkles size={13} className="text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse" />
                  <span>{dir === 'rtl' ? 'فحص جنائي مباشر' : 'Run Forensic Scan'}</span>
                </button>

                <div className="w-px h-5 bg-gray-200 dark:bg-gray-800/80" />

                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={forensicMode}
                      onChange={(e) => setForensicMode(e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`w-8 h-4 bg-gray-200 dark:bg-gray-800 rounded-full transition-colors duration-300 ${forensicMode ? 'bg-emerald-500/80 dark:bg-emerald-500/50' : ''}`} />
                    <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white shadow-md transition-transform duration-300 ${forensicMode ? 'transform translate-x-4 bg-emerald-500' : ''}`} />
                  </div>
                  <span className={`text-[10px] font-bold ${forensicMode ? 'text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'text-[var(--text-muted)]'}`}>
                    {dir === 'rtl' ? 'وضع التحقيق الجنائي' : 'Forensic Mode'}
                  </span>
                </label>
              </div>
            )}
          </div>
        )}

        <div className="flex items-end px-1 sm:px-3 py-1 sm:py-3 gap-0.5 sm:gap-2">

          <div className="flex-shrink-0 flex items-center">
            <motion.button 
              onClick={() => handleSendOrStop()}
              className={`w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-sm transition-theme group shadow-none
                ${!isGenerating && !query.trim() 
                  ? 'cursor-not-allowed opacity-40 grayscale' 
                  : 'hover:bg-emerald-500/5 hover:border-emerald-500/20 active:scale-95'
                } border border-transparent`}
              disabled={!isGenerating && !query.trim()}
              animate={isGenerating ? {
                boxShadow: [
                  "0 0 0px rgba(16, 185, 129, 0)",
                  "0 0 16px rgba(16, 185, 129, 0.4)",
                  "0 0 0px rgba(16, 185, 129, 0)"
                ],
                borderColor: [
                  "rgba(16, 185, 129, 0.1)",
                  "rgba(16, 185, 129, 0.4)",
                  "rgba(16, 185, 129, 0.1)"
                ]
              } : {}}
              transition={isGenerating ? {
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut"
              } : {}}
            >
              {isGenerating ? (
                <div className="relative flex items-center justify-center w-8 h-8 md:w-10 md:h-10">
                   <div className="absolute inset-0 rounded-full border-2 border-emerald-500/10 border-t-emerald-500 animate-spin w-5 h-5 md:w-7 md:h-7 m-auto" />
                   <Square size={10} className="md:size-[14px] text-emerald-500 relative z-10 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" fill="currentColor" />
                </div>
              ) : (
                <div className={`${dir === 'rtl' ? 'transform -scale-x-100' : ''} flex items-center justify-center`}>
                  <Send 
                    size={18} 
                    className={`md:w-6 md:h-6 transition-theme ${
                      query.trim() 
                        ? 'text-emerald-500 drop-shadow-[0_0_12px_rgba(16,185,129,0.8)] scale-100' 
                        : 'text-gray-400 group-hover:text-emerald-500'
                    }`} 
                  />
                </div>
              )}
            </motion.button>
          </div>

          <div className="flex-1 min-w-0 relative">
            <textarea
              ref={textareaRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
                handleUserTyping();
              }}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendOrStop();
                  if (textareaRef.current) textareaRef.current.style.height = 'auto'; 
                }
              }}
              disabled={isInputDisabled}
              placeholder={isInputDisabled ? (dir === 'rtl' ? 'يرجى تنشيط حسابك بتفعيل باقة اشتراك للبدء...' : 'Activate your account with a subscription to start...') : t('askAssistant')}
              className={`w-full bg-transparent border-none outline-none px-1 py-1 text-[16px] sm:text-[17px] font-medium placeholder:text-[var(--text-secondary)]/50 text-[var(--text-primary)] resize-none scrollbar-none overflow-hidden leading-relaxed ${dir === 'rtl' ? 'text-right' : 'text-left'} ${isInputDisabled ? 'cursor-not-allowed text-gray-400' : ''}`}
              dir="auto"
              rows={1}
              style={{ minHeight: '32px', maxHeight: '200px', height: '32px' }}
            />
            {query.length > 500 && (
              <span className={`absolute bottom-[-14px] ${dir === 'rtl' ? 'left-1' : 'right-1'} text-[10px] font-mono select-none pointer-events-none transition-all duration-300 ${query.length > 15000 ? 'text-red-500 font-bold drop-shadow-[0_0_4px_rgba(239,68,68,0.5)]' : 'text-gray-400'}`}>
                {query.length.toLocaleString()} / 16,000
              </span>
            )}
          </div>

          <div className="relative flex-shrink-0 flex items-center gap-1">
            <input 
              type="file" 
              id="unified-upload" 
              className="hidden" 
              accept="*/*" 
              onChange={handleFileChange} 
              disabled={isInputDisabled}
            />
            <button 
              title={dir === 'rtl' ? 'رفع ملف (الحد الأقصى 100 ميجابايت)' : 'Upload File (Max 100MB)'}
              onClick={() => {
                if (!isInputDisabled) {
                  document.getElementById('unified-upload')?.click();
                }
              }}
              disabled={isInputDisabled}
              className={`w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-sm transition-theme border border-transparent shadow-none ${isInputDisabled ? 'opacity-30 cursor-not-allowed' : 'hover:bg-emerald-500/5 group hover:border-emerald-500/20 hover:shadow-[0_0_15px_rgba(16,185,129,0.1)]'}`}
            >
              <Plus size={18} className="md:w-5 md:h-5 text-[var(--text-secondary)] group-hover:hidden transition-theme" />
              <Paperclip size={18} className="md:w-5 md:h-5 text-emerald-500 hidden group-hover:block transition-theme drop-shadow-[0_0_10px_rgba(16,185,129,0.6)]" />
            </button>
          </div>
        </div>

        <div className={`flex items-center justify-between px-1.5 sm:px-3 py-1.5 sm:py-2.5 border-t border-dashed border-[var(--border-main)]`}>
          <div className="flex items-center gap-1 sm:gap-1.5">
            <div className="relative">
              <button 
                onClick={() => {
                  if (!isInputDisabled) {
                    setIsAdvancedToolsOpen(!isAdvancedToolsOpen);
                  }
                }}
                disabled={isInputDisabled}
                className={`flex items-center gap-1.5 md:gap-2 px-2 md:px-2.5 py-1 md:py-1.5 rounded-sm transition-theme border ${
                  isInputDisabled
                    ? 'opacity-30 cursor-not-allowed border-transparent text-gray-500 bg-transparent'
                    : activeDropdown === 'tool'
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
                      : 'bg-transparent border-transparent text-[var(--text-secondary)] hover:text-emerald-500 hover:bg-emerald-500/5'
                }`}
              >
                <span className={activeDropdown === 'tool' ? 'drop-shadow-[0_0_10px_rgba(16,185,129,0.7)] text-emerald-500' : 'opacity-60 group-hover:opacity-100'}>
                  {React.cloneElement(currentTool.icon as React.ReactElement<{ size?: number; className?: string }>, { size: 14, className: 'md:w-4 md:h-4' })}
                </span>
                <span className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.1em] hidden xs:inline">{currentTool.label}</span>
              </button>

              {isAdvancedToolsOpen && (
                <div className={`absolute bottom-full mb-3 ${dir === 'rtl' ? 'right-0' : 'left-0'} w-56 rounded-lg border shadow-2xl flex flex-col z-50 overflow-hidden bg-[var(--bg-dropdown)] border-[var(--border-main)]`}>
                  <div className={`px-4 py-3 text-[10px] font-black tracking-[0.2em] text-[var(--text-muted)] bg-[var(--bg-base)]/30`}>
                    {t('tools').toUpperCase()}
                  </div>
                  <div className="p-1.5 flex flex-col gap-0.5 max-h-[50vh] overflow-y-auto custom-scrollbar">
                    {advancedTools.filter(t => t.id !== 'sovereign_search' && t.id !== 'sovereign_memory').map((tool) => (
                      <button 
                        key={tool.id} 
                        onClick={() => {
                          setSelectedTool(tool.id);
                          if (tool.id === 'video') setShowVideoSettings(true);
                          if (tool.id === 'image') setShowImageSettings(true);
                          if (tool.id === 'canvas') setShowAudioSettings(true);
                          setActiveDropdown('tool');
                          setIsAdvancedToolsOpen(false);
                        }}
                        className={`flex items-center gap-3 px-3 py-2 rounded-sm transition-theme text-[13px] font-bold ${
                          selectedTool === tool.id && activeDropdown === 'tool'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                            : 'hover:bg-[var(--bg-base)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        <span className={selectedTool === tool.id && activeDropdown === 'tool' ? 'text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'text-[var(--text-muted)]'}>
                          {tool.icon}
                        </span>
                        <div className="flex items-center justify-between flex-1 min-w-0">
                          <span className="truncate">{tool.label}</span>
                          {tool.isNew && (
                            <span className="px-1.5 py-0.5 rounded-md bg-emerald-500 text-[8px] font-black text-white ml-2 animate-pulse">
                              NEW
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="w-px h-4 bg-[var(--border-main)] mx-0.5 hidden sm:block" />

            <div className="relative">
              <button 
                onClick={() => {
                  if (!isInputDisabled) {
                    setIsModelMenuOpen(!isModelMenuOpen);
                  }
                }}
                disabled={isInputDisabled}
                className={`flex items-center gap-1.5 md:gap-2 px-2 md:px-2.5 py-1 md:py-1.5 rounded-sm transition-theme border ${
                  isInputDisabled
                    ? 'opacity-30 cursor-not-allowed border-transparent text-gray-500 bg-transparent'
                    : activeDropdown === 'model'
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
                      : 'bg-transparent border-transparent text-[var(--text-muted)] hover:text-emerald-500 hover:bg-emerald-500/5'
                }`}
              >
                <span className={activeDropdown === 'model' ? 'drop-shadow-[0_0_10px_rgba(16,185,129,0.7)] text-emerald-500' : 'opacity-60 group-hover:opacity-100'}>
                  {React.cloneElement(currentModel.icon as React.ReactElement<{ size?: number; className?: string }>, { size: 14, className: 'md:w-4 md:h-4' })}
                </span>
                <span className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.1em] hidden xs:inline">{currentModel.label}</span>
              </button>
              {isModelMenuOpen && (
                <div className={`absolute bottom-full mb-3 ${dir === 'rtl' ? 'right-0' : 'left-0'} w-32 p-1.5 rounded-lg border shadow-2xl flex flex-col gap-0.5 z-50 bg-[var(--bg-dropdown)] border-[var(--border-main)]`}>
                  {models.map((model, idx) => (
                    <button 
                      key={`${model.id}-${idx}`}
                      onClick={() => {
                        setSelectedModel(model.id as any);
                        const toolMapping: Record<string, string> = {
                          'fast': 'chat_fast',
                          'pro': 'chat_pro',
                          'thinking': 'chat_reasoning'
                        };
                        setSelectedTool(toolMapping[model.id] || 'chat');
                        setActiveDropdown('model');
                        setIsModelMenuOpen(false);
                      }}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-sm transition-theme text-[13px] font-black uppercase tracking-tight hover:bg-emerald-500/10 text-[var(--text-secondary)] hover:text-emerald-500 group`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`${model.color} group-hover:scale-110 transition-transform`}>{model.icon}</span>
                        <span>{model.label}</span>
                      </div>
                      {selectedModel === model.id && activeDropdown === 'model' && (
                        <div className={`w-1.5 h-1.5 rounded-full ${model.dotColor} shadow-[0_0_8px_rgba(16,185,129,0.6)]`} />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="relative flex-shrink-0 flex items-center">
            <button 
              onClick={toggleRecording}
              disabled={isInputDisabled}
              title={dir === 'rtl' ? (isRecording ? 'إيقاف التسجيل الصوتي' : 'بدء الكتابة بالصوت') : (isRecording ? 'Stop voice recording' : 'Start voice-to-text')}
              className={`w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-[4px] bg-transparent border border-transparent transition-all duration-300 relative group ${
                isInputDisabled 
                  ? 'opacity-30 cursor-not-allowed' 
                  : isRecording
                    ? 'bg-red-500/10 text-red-500 border-red-500/25 shadow-[0_0_15px_rgba(239,68,68,0.25)]' 
                    : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-emerald-500 hover:border-emerald-500/20 active:scale-95'
              }`}
            >
              {isRecording ? (
                <div className="relative flex items-center justify-center">
                  <MicOff size={18} className="md:w-5 md:h-5 text-red-500 animate-pulse drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
                  <span className="absolute -top-1 -right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                </div>
              ) : (
                <Mic 
                  size={18} 
                  className="md:w-5 md:h-5 text-gray-400 group-hover:text-emerald-500 group-hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)] transition-all duration-300" 
                />
              )}
            </button>
          </div>
        </div>
      </motion.div>
      </div>

      {user && token && (
        <div className="text-center mt-2 mb-1 text-[8px] md:text-[10px] font-bold uppercase tracking-wider md:tracking-widest text-[var(--text-muted)]/80 px-8 line-clamp-1 md:line-clamp-none">
          {dir === 'rtl' ? (
            <>
              <span className="md:hidden">{t('appName')} قد يخطئ. فدقق.</span>
              <span className="hidden md:inline">{t('appName')} قد تخطئ أحياناً. يرجى التحقق من المعلومات المهمة.</span>
            </>
          ) : (
            <>
              <span className="md:hidden">{t('appName')} may err. Verify.</span>
              <span className="hidden md:inline">{t('appName')} can make mistakes. Consider verifying important information.</span>
            </>
          )}
        </div>
      )}
    </div>
  );

  return (
    <ErrorBoundary name="Chat Intelligence Engine">
      <motion.div 
        initial="initial"
        animate="animate"
        exit="exit"
        variants={perplextaPageTransition}
        className="h-full flex flex-col w-full overflow-hidden"
      >
      {showChatLimitWarning && (
        <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-[100] px-6 py-4 rounded-[var(--radius)] shadow-2xl flex items-center gap-4 animate-in fade-in duration-300 border bg-[var(--bg-secondary)] border-pink-500/30 shadow-pink-500/10`}>
          <div className="w-12 h-12 rounded-[var(--radius)] bg-pink-500/10 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="text-pink-500" size={24} />
          </div>
          <div className={`flex flex-col ${dir === 'rtl' ? 'items-end' : 'items-start'}`}>
            <span className="text-pink-500 font-bold text-sm">
              {dir === 'rtl' ? 'تنبيه: حد الرسائل' : 'Warning: Chat Limit'}
            </span>
            <span className="text-[var(--text-secondary)] text-xs font-medium max-w-[250px] leading-relaxed">
              {dir === 'rtl' 
                ? 'لقد وصلت إلى حد 50 رسالة. تم حذف الرسائل القديمة لإدارة المساحة.' 
                : 'You have reached the 50-message limit. Older messages have been pruned to manage space.'}
            </span>
            <button 
              onClick={() => setShowChatLimitWarning(false)}
              className="mt-2 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] hover:text-pink-500 transition-theme"
            >
              {dir === 'rtl' ? 'إغلاق' : 'Dismiss'}
            </button>
          </div>
        </div>
      )}

      {(isModelMenuOpen || isAttachmentMenuOpen || isAdvancedToolsOpen) && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => {
            setIsModelMenuOpen(false);
            setIsAttachmentMenuOpen(false);
            setIsAdvancedToolsOpen(false);
          }} 
        />
      )}

      <div className="flex-1 flex flex-col w-full overflow-hidden relative">
          <AnimatePresence>
            {isRenaming && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
              >
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="bg-[var(--bg-base)] border border-[var(--border-main)] rounded-lg w-full max-w-sm p-6 shadow-2xl"
            >
               <h3 className={`text-lg font-black mb-4 uppercase tracking-tighter ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
                 {dir === 'rtl' ? 'إعادة تسمية المحادثة' : 'Rename Conversation'}
               </h3>
               <input 
                 type="text" 
                 value={chatRenameTitle} 
                 onChange={(e) => setChatRenameTitle(e.target.value)}
                 className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-sm px-4 py-3 outline-none focus:border-emerald-500/50 transition-theme font-bold text-sm mb-6 text-[var(--text-primary)]"
                 autoFocus
                 onKeyDown={(e) => e.key === 'Enter' && handleThreadRename()}
               />
               <div className="flex gap-3">
                 <button 
                   onClick={() => setIsRenaming(false)}
                   className="flex-1 py-1.5 rounded-sm text-xs font-bold uppercase text-[var(--text-secondary)] bg-[var(--bg-overlay)] hover:bg-[var(--bg-surface)] transition-theme border border-[var(--border)]"
                 >
                   {dir === 'rtl' ? 'إلغاء' : 'Cancel'}
                 </button>
                 <button 
                   onClick={handleThreadRename}
                   className="flex-1 py-1.5 rounded-sm text-xs font-bold uppercase bg-emerald-500 text-white hover:bg-emerald-600 transition-theme shadow-[0_5px_15px_rgba(16,185,129,0.3)]"
                 >
                   {dir === 'rtl' ? 'حفظ' : 'Save'}
                 </button>
               </div>
            </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {(!user || !token) ? (
            <div className="flex-1 flex flex-col items-center justify-between w-full min-h-[calc(100dvh-120px)] sm:min-h-[calc(100dvh-140px)] max-w-4xl mx-auto px-4 md:px-6 py-6 relative z-10">
              <div className="w-full text-[var(--text-primary)] my-auto">
                <AnimatePresence mode="wait">
                  {messages.length === 0 ? (
                    <motion.div
                      key="welcome-and-slider-wrapper-guest"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ 
                        opacity: 0, 
                        y: -20,
                        transition: { duration: 0.25, ease: "easeInOut" } 
                      }}
                      className="w-full flex flex-col items-center gap-6"
                    >
                      <TypewriterMotive isVisible={true} />
                      <ToolsGallerySlider />
                    </motion.div>
                  ) : null}
                </AnimatePresence>

                <div className="w-full mt-6">
                  {renderInputArea()}
                </div>
              </div>

              <div className="w-full pt-4 border-t border-gray-250/20 dark:border-gray-800/10 text-center select-none flex flex-col gap-2">
                <div className="flex items-center justify-center gap-2.5 text-[9.5px] text-emerald-500 font-bold">
                  <span onClick={() => navigate('/about')} className="cursor-pointer hover:underline">{dir === 'rtl' ? 'من نحن' : 'About Us'}</span>
                  <span className="text-gray-500/20">•</span>
                  <span onClick={() => navigate('/terms')} className="cursor-pointer hover:underline">{dir === 'rtl' ? 'الشروط والأحكام' : 'Terms & Conditions'}</span>
                  <span className="text-gray-500/20">•</span>
                  <span onClick={() => navigate('/privacy')} className="cursor-pointer hover:underline">{dir === 'rtl' ? 'الخصوصية' : 'Privacy'}</span>
                </div>
                <p className="text-[9.5px] sm:text-[10px] text-gray-400 dark:text-gray-500 font-sans tracking-wide leading-relaxed px-4">
                  {dir === 'rtl' 
                    ? "الملكية الفكرية محفوظة لـ ViralLinkUp 2026 ©"
                    : "Intellectual Property Protected by ViralLinkUp 2026 ©"
                  }
                </p>
              </div>
            </div>
          ) : (
            <>
              <AnimatePresence>
                {chatId && (
                  <motion.div 
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: -8 }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    className="sticky top-0 z-30 bg-[var(--bg-primary)]/80 backdrop-blur-md border-b border-[var(--border-main)]"
                  >

                    {isChatMessagesLoading && (
                      <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-emerald-500/10 overflow-hidden z-40">
                        <div className="animate-sovereign-progress h-full bg-emerald-500 rounded-full animate-pulse" />
                      </div>
                    )}
              <div className="max-w-4xl mx-auto w-full flex items-center justify-between px-8 md:px-6 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)] flex-shrink-0" />
                  <h2 className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500 truncate max-w-[120px] md:max-w-[300px] font-mono">
                    {dir === 'rtl' ? 'نشط' : 'Active'}
                  </h2>
               </div>
               <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setShowPinnedModal(true)}
                    className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-sm transition-all duration-300 text-gray-400 hover:bg-[var(--bg-overlay)] hover:text-emerald-500 hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)] relative"
                    title={dir === 'rtl' ? 'الرسائل المثبتة' : 'Pinned Messages'}
                  >
                    <Pin size={18} className={messages.some(m => m.is_pinned) ? "text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]" : "transition-all duration-300"} />
                    {messages.filter(m => m.is_pinned).length > 0 && (
                      <span className="absolute -top-1 -right-1 bg-emerald-500 text-black text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-[0_0_4px_rgba(16,185,129,0.6)]">
                        {messages.filter(m => m.is_pinned).length}
                      </span>
                    )}
                  </button>
                  <div className="relative" ref={exportMenuRef}>
                    <button 
                      onClick={() => !isExporting && setIsExportMenuOpen(!isExportMenuOpen)}
                      disabled={isExporting}
                      className={`w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-sm transition-theme group ${
                        isExporting
                          ? 'text-emerald-500 bg-emerald-500/10 cursor-wait'
                          : isExportMenuOpen 
                            ? 'text-emerald-500 bg-emerald-500/10' 
                            : 'text-gray-400 hover:bg-[var(--bg-overlay)]'
                      }`}
                      title={dir === 'rtl' ? 'خيارات المحادثة' : 'Thread Options'}
                    >
                      {isExporting ? (
                        <Loader2 size={20} className="animate-spin text-emerald-500" />
                      ) : (
                        <MoreHorizontal 
                          size={20} 
                          className={`transition-theme ${
                            isExportMenuOpen 
                              ? 'drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]' 
                              : 'group-hover:text-emerald-500 group-hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]'
                          }`} 
                        />
                      )}
                    </button>

                    <AnimatePresence>
                      {isExportMenuOpen && (
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className={`absolute top-full mt-2 ${dir === 'rtl' ? 'left-0' : 'right-0'} w-56 bg-[var(--bg-secondary)] border border-[var(--border-main)] rounded-lg shadow-2xl overflow-hidden z-50 backdrop-blur-xl`}
                        >
                          <div className="p-1.5 space-y-0.5">
                            <button 
                              onClick={() => {
                                toast.info(dir === 'rtl' ? 'تمت إضافة العلامة المرجعية' : 'Bookmark added');
                                setIsExportMenuOpen(false);
                              }}
                              disabled={isExporting}
                              className="w-full flex items-center gap-3 px-3 py-2 text-[11px] font-bold text-[var(--text-secondary)] hover:text-emerald-500 hover:bg-emerald-500/5 rounded-sm transition-theme group disabled:opacity-50"
                            >
                              <Bookmark size={14} className="group-hover:drop-shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
                              <span>{dir === 'rtl' ? 'إضافة علامة مرجعية' : 'Add Bookmark'}</span>
                            </button>

                            <button 
                              onClick={() => {
                                toast.info(dir === 'rtl' ? 'تمت الإضافة للمساحة' : 'Added to space');
                                setIsExportMenuOpen(false);
                              }}
                              disabled={isExporting}
                              className="w-full flex items-center gap-3 px-3 py-2 text-[11px] font-bold text-[var(--text-secondary)] hover:text-emerald-500 hover:bg-emerald-500/5 rounded-sm transition-theme group disabled:opacity-50"
                            >
                              <FolderPlus size={14} className="group-hover:drop-shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
                              <span>{dir === 'rtl' ? 'إضافة إلى مساحة' : 'Add to Space'}</span>
                            </button>

                            <button 
                              onClick={async () => {
                                setIsRenaming(true);
                                setChatRenameTitle(dir === 'rtl' ? 'جاري التحميل...' : 'Loading...');
                                setIsExportMenuOpen(false);
                                try {
                                  const res = await fetch(`/api/chats`, {
                                    headers: { 'Authorization': `Bearer ${token}` }
                                  });
                                  if (res.ok) {
                                    const chats = await res.json();
                                    const currentChat = chats.find((c: any) => c.id === chatId || c.id?.toString() === chatId?.toString());
                                    if (currentChat) {
                                      setChatRenameTitle(currentChat.title);
                                      return;
                                    }
                                  }
                                } catch (e) {

                                }
                                setChatRenameTitle(messages[0]?.content.substring(0, 30) || 'New Title');
                              }}
                              disabled={isExporting}
                              className="w-full flex items-center gap-3 px-3 py-2 text-[11px] font-bold text-[var(--text-secondary)] hover:text-emerald-500 hover:bg-emerald-500/5 rounded-sm transition-theme group disabled:opacity-50"
                            >
                              <Pencil size={14} className="group-hover:drop-shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
                              <span>{dir === 'rtl' ? 'إعادة تسمية' : 'Rename Thread'}</span>
                            </button>

                            <div className="my-1.5 mx-2 h-px bg-[var(--border-main)]/50" />

                            <button 
                              onClick={() => handleExportChat('pdf')}
                              disabled={isExporting}
                              className="w-full flex items-center gap-3 px-3 py-2 text-[11px] font-bold text-[var(--text-secondary)] hover:text-emerald-500 hover:bg-emerald-500/5 rounded-sm transition-theme group disabled:opacity-50"
                            >
                              <FileDown size={14} className="group-hover:drop-shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
                              <span>{dir === 'rtl' ? 'تصدير كـ PDF' : 'Export as PDF'}</span>
                            </button>

                            <button 
                              onClick={() => handleExportChat('md')}
                              disabled={isExporting}
                              className="w-full flex items-center gap-3 px-3 py-2 text-[11px] font-bold text-[var(--text-secondary)] hover:text-emerald-500 hover:bg-emerald-500/5 rounded-sm transition-theme group disabled:opacity-50"
                            >
                              <FileCode size={14} className="group-hover:drop-shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
                              <span>{dir === 'rtl' ? 'تصدير كـ Markdown' : 'Export as Markdown'}</span>
                            </button>

                            <button 
                              onClick={() => handleExportChat('docx')}
                              disabled={isExporting}
                              className="w-full flex items-center gap-3 px-3 py-2 text-[11px] font-bold text-[var(--text-secondary)] hover:text-emerald-500 hover:bg-emerald-500/5 rounded-sm transition-theme group disabled:opacity-50"
                            >
                              <FileText size={14} className="group-hover:drop-shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
                              <span>{dir === 'rtl' ? 'تصدير كـ DOCX' : 'Export as DOCX'}</span>
                            </button>

                            <div className="my-1.5 mx-2 h-px bg-[var(--border-main)]/50" />

                            <button 
                              onClick={() => {
                                handleThreadDelete();
                                setIsExportMenuOpen(false);
                              }}
                              disabled={isExporting}
                              className="w-full flex items-center gap-3 px-3 py-2 text-[11px] font-bold text-pink-500 hover:bg-pink-500/5 rounded-sm transition-theme group disabled:opacity-50"
                            >
                              <Trash2 size={14} className="group-hover:scale-110 transition-transform" />
                              <span>{dir === 'rtl' ? 'حذف المحادثة' : 'Delete Thread'}</span>
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  {messages.some(m => m.is_pinned) && (
                    <button 
                      onClick={() => setShowPinnedModal(true)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-sm text-[9px] md:text-[10px] font-black uppercase tracking-wider text-emerald-500 bg-emerald-500/5 transition-theme border border-emerald-500/10 hover:bg-emerald-500/10"
                    >
                      <Bookmark size={14} />
                      <span className="hidden lg:inline">{dir === 'rtl' ? 'المثبتة' : 'Pinned'}</span>
                    </button>
                  )}
               </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
          <div 
            id="chat-messages-container" 
            onScroll={handleScroll}
            className="flex-1 min-h-0 overflow-y-scroll scrollbar-none custom-scrollbar w-full overflow-anchor-none relative flex flex-col scroll-smooth"
          >
          <AnimatePresence mode="popLayout">
            {isChatMessagesLoading && messages.length === 0 && !user ? (
              <motion.div
                key="chat-messages-skeleton"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="flex-1 max-w-4xl mx-auto w-full px-8 md:px-6 py-12 flex flex-col gap-8 min-h-full"
              >
                {[...Array(3)].map((_, i) => (
                  <motion.div 
                    key={i} 
                    className="flex gap-4 w-full p-6 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-main)]"
                    animate={{
                      opacity: [0.45, 0.75, 0.45]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: i * 0.2
                    }}
                  >

                    <div className="w-10 h-10 rounded-full bg-gray-200/20 dark:bg-gray-800/40 shrink-0" />

                    <div className="flex-1 space-y-3 pt-1">
                      <div className={`h-2.5 bg-gray-250/50 dark:bg-gray-800/50 rounded ${i === 0 ? 'w-1/4' : i === 1 ? 'w-1/5' : 'w-1/3'}`} />
                      <div className={`h-3 bg-gray-200/30 dark:bg-gray-800/30 rounded ${i === 0 ? 'w-3/4' : i === 1 ? 'w-5/6' : 'w-2/3'}`} />
                      <div className={`h-3 bg-gray-200/30 dark:bg-gray-800/30 rounded ${i === 0 ? 'w-1/2' : i === 1 ? 'w-2/3' : 'w-3/4'}`} />
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            ) : messages.length === 0 && !routeChatId ? (
              !hasActiveSub ? (
                <motion.div
                  key="subscription-blocker-onboarding"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="flex-1 flex flex-col items-center justify-center min-h-full py-8 md:py-16 selection:bg-emerald-500/10 w-full"
                >
                  <div className="w-full max-w-xl px-4 md:px-6">
                    <div className="rounded-[var(--radius)] border bg-[var(--bg-secondary)] border-[var(--border-main)] overflow-hidden shadow-2xl relative p-6 md:p-8 flex flex-col items-center text-center">
                      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500" />

                      <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 drop-shadow-[0_0_12px_rgba(16,185,129,0.3)] mb-6 transition-all duration-300 hover:scale-110">
                        <Sparkles size={32} className="animate-pulse" />
                      </div>

                      <h2 className="text-xl md:text-2xl font-black text-[var(--text-primary)] tracking-tight mb-3">
                        {dir === 'rtl' ? 'تنشيط حسابك مطلوب' : 'Account Activation Required'}
                      </h2>

                      <p className="text-xs md:text-sm text-gray-500 leading-relaxed max-w-md mb-8">
                        {dir === 'rtl' 
                          ? 'أنت مسجل حالياً بدون خطة نشطة. للاستفادة من محادثات الذكاء الاصطناعي وخدمات الأدوات المتقدمة، يرجى تفعيل أي من الخطط المجانية أو المدفوعة.'
                          : 'You are currently registered without an active subscription plan. To use AI conversations and analytical tools, please subscribe to a free or premium plan.'}
                      </p>

                      <div className="w-full flex flex-col sm:flex-row gap-3 justify-center mb-8">
                        <button
                          onClick={() => navigate('/subscription')}
                          className="px-6 py-3 rounded-[var(--radius)] bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs md:text-sm transition-all duration-300 shadow-lg shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98]"
                        >
                          {dir === 'rtl' ? 'اختر خطة لتنشيط الحساب' : 'Choose Plan to Activate'}
                        </button>
                      </div>

                      <div className="w-full border-t border-[var(--border-main)] pt-6 flex flex-col items-center">
                        <h4 className="text-[10px] md:text-xs font-black uppercase text-gray-400 tracking-wider mb-2">
                          {dir === 'rtl' ? 'ادعُ أصدقاءك واربح الرصيد' : 'Invite Friends and Earn Credits'}
                        </h4>
                        <p className="text-[9px] md:text-[11px] text-gray-500 mb-4 max-w-sm">
                          {dir === 'rtl'
                            ? 'احصل على نقاط إضافية عن كل صديق يسجل من خلالك لتفعيل ميزاتك المتقدمة مجاناً!'
                            : 'Get bonus points dynamically when friends register with your code to activate premium features for free!'}
                        </p>

                        <div className="flex items-center gap-2 w-full max-w-sm rounded-[var(--radius)] border bg-[var(--bg-primary)] border-[var(--border-main)] p-1.5">
                          <input
                            type="text"
                            readOnly
                            value={`${window.location.origin}/?ref=${user?.referral_code || user?.id || 'guest'}`}
                            className="bg-transparent text-[10px] md:text-xs flex-1 outline-none text-[var(--text-secondary)] px-2 font-mono truncate animate-none border-none shadow-none"
                          />
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(`${window.location.origin}/?ref=${user?.referral_code || user?.id || 'guest'}`);
                              alert(dir === 'rtl' ? 'تم نسخ رابط الدعوة!' : 'Invitation link copied!');
                            }}
                            className="h-8 px-3 rounded-[4px] border border-[var(--border-main)] hover:bg-gray-50 dark:hover:bg-gray-800 text-xs font-bold transition-all duration-300 flex items-center justify-center gap-1 hover:text-emerald-500"
                          >
                            {dir === 'rtl' ? 'نسخ' : 'Copy'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="onboarding-view" 
                  initial={{ opacity: 0, scale: 1, filter: "blur(4px)" }}
                  animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, scale: 0.98, filter: "blur(6px)", transition: { duration: 0.15, ease: "easeOut" } }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="flex-1 flex flex-col items-center justify-center min-h-[65vh] py-12 md:py-16 selection:bg-emerald-500/10 w-full relative overflow-hidden"
                >

                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-500/[0.02] via-transparent to-transparent pointer-events-none select-none" />

                  <div className="w-full max-w-4xl px-6 flex flex-col items-center text-center relative z-10">

                    <div className="w-14 h-14 rounded-full bg-emerald-500/[0.04] border border-emerald-500/10 flex items-center justify-center text-emerald-500 drop-shadow-[0_0_15px_rgba(16,185,129,0.2)] mb-6 transition-all duration-300 hover:scale-110">
                      <Sparkles size={24} className="animate-pulse" />
                    </div>

                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-[var(--text-primary)] tracking-tight mb-3">
                      {dir === 'rtl' 
                        ? `مرحباً بك، ${user?.name || 'عضو بيربليكستا النخبة'} 👋`
                        : `Welcome back, ${user?.name || 'Perplexta Elite Member'} 👋`
                      }
                    </h1>

                    <p className="text-xs sm:text-sm text-gray-500 uppercase tracking-widest font-black leading-relaxed max-w-xl mb-4">
                      {dir === 'rtl'
                        ? 'كيف يمكنني مساندة رؤيتك الاستثمارية والتحليلية اليوم؟'
                        : 'How can I support your investment and analytical vision today?'
                      }
                    </p>

                    <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-emerald-500 to-transparent" />
                  </div>
                </motion.div>
              )
            ) : (
              <motion.div
                key="chat-thread-view"
                initial={{ opacity: 0, filter: "blur(3px)" }}
                animate={{ opacity: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, filter: "blur(3px)" }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col gap-4 md:gap-6 max-w-4xl mx-auto w-full px-8 md:px-6 pt-4"
              >
              {messages.map((msg, idx) => {
                return (
                  <motion.div 
                    layout="position"
                    key={msg.client_id || msg.id || idx} 
                    id={`message-${idx}`}
                    className={`w-full ${msg.role === 'user' ? 'user-message-anchor' : ''}`}
                  >
                    <div className={`w-full ${msg.role === 'user' ? 'bg-transparent' : 'bg-transparent'} px-0`}>
                      {msg.role === 'user' ? (
                        <div className={`flex flex-col gap-2 w-full ${dir === 'rtl' ? 'items-end' : 'items-start'}`}>
                              {msg.file && (
                                <div className={`mb-1 p-2 rounded-[var(--radius)] border flex items-center gap-3 w-fit ${
                                  dir === 'rtl' ? 'self-end' : 'self-start'
                                  } bg-[var(--bg-secondary)] border-[var(--border)]`}>
                                  {msg.file.type.startsWith('image/') ? (
                                    <img 
                                      src={msg.file.preview} 
                                      alt={msg.file.name} 
                                      className="w-10 h-10 object-cover rounded-[var(--radius)]" 
                                      referrerPolicy="no-referrer"
                                    />
                                  ) : (
                                    <div className="w-10 h-10 rounded-[var(--radius)] bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                      {getFileIcon(msg.file.type)}
                                    </div>
                                  )}
                                  <div className="flex flex-col min-w-0 pe-2">
                                    <span className="text-[11px] font-bold truncate max-w-[150px] text-[var(--text-primary)]">{msg.file.name}</span>
                                    <span className="text-[9px] text-[var(--text-muted)] font-black uppercase tracking-tighter">
                                      {msg.file.type.split('/')[1] || 'FILE'}
                                    </span>
                                  </div>
                                </div>
                              )}
                              {editingMessageIndex === idx ? (
                                <div className="flex flex-col gap-2 w-full max-w-2xl bg-zinc-50 dark:bg-zinc-900/60 p-4 rounded-xl border border-gray-200 dark:border-zinc-850/80">
                                  <textarea
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    autoFocus
                                    className="w-full bg-transparent border-none focus:ring-0 text-[15px] md:text-sm resize-none outline-none text-zinc-900 dark:text-zinc-100"
                                    rows={Math.max(1, editValue.split('\n').length)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleEditSubmit(idx);
                                      }
                                      if (e.key === 'Escape') {
                                        setEditingMessageIndex(null);
                                      }
                                    }}
                                  />
                                  <div className="flex justify-end gap-2 mt-2">
                                    <button 
                                      onClick={() => setEditingMessageIndex(null)}
                                      className="px-3 py-1 text-[10px] uppercase font-bold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                                    >
                                      {dir === 'rtl' ? 'إلغاء' : 'Cancel'}
                                    </button>
                                    <button 
                                      onClick={() => handleEditSubmit(idx)}
                                      className="px-4 py-1.5 text-[10px] uppercase font-bold bg-emerald-500 text-white rounded-[var(--radius)] hover:bg-emerald-600 transition-theme"
                                    >
                                      {dir === 'rtl' ? 'حفظ وإرسال' : 'Save & Send'}
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="group relative flex items-center gap-3 w-full">

                                  <div 
                                    className={`text-[14px] md:text-[15px] font-semibold leading-relaxed whitespace-pre-wrap text-zinc-950 dark:text-zinc-50 tracking-wide font-sans flex-1 ${
                                      dir === 'rtl' ? 'text-right' : 'text-left'
                                    }`}
                                    dir={dir === 'rtl' ? 'rtl' : 'ltr'}
                                  >
                                    {stripProtocolMarkers(msg.content) || msg.content || (dir === 'rtl' ? 'محتوى فارغ' : 'Empty Content')}
                                  </div>

                                  {msg.is_pinned && (
                                    <div className="flex items-center gap-1 bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)] shrink-0 scale-90">
                                      <Pin size={8} className="text-emerald-500" />
                                      <span className="text-[7px] font-black uppercase text-emerald-500/80 tracking-tighter">Pinned</span>
                                    </div>
                                  )}

                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shrink-0">
                                    <button 
                                      onClick={() => handlePinMessage(msg.id!, !msg.is_pinned)}
                                      className={`p-1.5 rounded-md hover:bg-[var(--bg-overlay)] transition-colors duration-200 shrink-0 ${
                                        msg.is_pinned ? 'text-emerald-500 hover:text-emerald-600' : 'text-gray-400 hover:text-emerald-500'
                                      }`}
                                      title={msg.is_pinned ? (dir === 'rtl' ? 'إلغاء التثبيت' : 'Unpin') : (dir === 'rtl' ? 'تثبيت' : 'Pin')}
                                    >
                                      {msg.is_pinned ? <PinOff size={13} /> : <Pin size={13} />}
                                    </button>
                                    <button 
                                      onClick={() => {
                                        setEditingMessageIndex(idx);
                                        setEditValue(msg.content);
                                      }}
                                      className="p-1.5 rounded-md hover:bg-[var(--bg-overlay)] text-gray-400 hover:text-emerald-500 transition-colors duration-200 shrink-0"
                                      title={dir === 'rtl' ? 'تعديل' : 'Edit'}
                                    >
                                      <Pencil size={13} />
                                    </button>
                                  </div>
                                </div>
                              )}

                              <div className={`text-[10px] font-mono text-gray-400 dark:text-gray-500/80 mt-1 select-none ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
                                {formatExactTimestamp(msg.created_at, dir)}
                              </div>
                        </div>
                      ) : (
                      <motion.div 
                        layout
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                        className="markdown-body prose dark:prose-invert max-w-none relative text-[13px] md:text-base leading-relaxed tracking-tight"
                      >
                        {!msg.is_quota_error && !msg.is_system_inactive && msg.tool !== 'video' && (
                          <ToolStatusIndicator 
                            tool={msg.tool} 
                            isGenerating={isGenerating && idx === messages.length - 1} 
                            dir={dir} 
                            t={t} 
                          />
                        )}
                        {msg.tool === 'video' ? (
                          <UnifiedVideoMessageWidget 
                            msg={msg}
                            idx={idx}
                            messages={messages}
                            dir={dir}
                            videoSettings={videoSettings}
                            liveElapsed={liveElapsed}
                            isGenerating={isGenerating}
                            t={t}
                            onRetry={() => {
                              const userPrompt = findUserPrompt(idx);
                              if (userPrompt) {
                                handleSendOrStop(userPrompt, messages.slice(0, idx - 1));
                              }
                            }}
                          />
                        ) : isGenerating && idx === messages.length - 1 && msg.content === '' && (!msg.thinking_steps || msg.thinking_steps.length === 0) ? (
                          msg.tool === 'image' ? (
                            <ImageGenerationPlaceholder 
                              dir={dir} 
                              aspectRatio={imageSettings.aspectRatio}
                              liveElapsed={liveElapsed}
                              style={imageSettings.style}
                              quality={imageSettings.quality}
                              t={t}
                              progress={imageProgress?.progress}
                              statusLabel={imageProgress?.statusLabel}
                            />
                          ) : (
                            <ResponseSkeleton dir={dir} />
                          )
                        ) : msg.is_image_failed ? (
                          <ImageGenerationPlaceholder 
                            dir={dir} 
                            aspectRatio={imageSettings.aspectRatio}
                            liveElapsed={0}
                            style={imageSettings.style}
                            quality={imageSettings.quality}
                            t={t}
                            isFailed={true}
                            errorMessage={msg.content}
                            onRetry={() => {
                              const userPrompt = findUserPrompt(idx);
                              if (userPrompt) {
                                handleSendOrStop(userPrompt, messages.slice(0, idx - 1));
                              }
                            }}
                          />
                        ) : msg.is_quota_error ? (
                           <QuotaExceededCard tool={msg.tool} data={msg.quota_data} dir={dir} t={t} navigate={navigate} user={user} />
                        ) : msg.is_insufficient_funds ? (
                           <InsufficientFundsCard data={msg.quota_data} dir={dir} t={t} navigate={navigate} user={user} />
                        ) : msg.is_system_inactive ? (
                           <SystemInactiveCard data={msg.quota_data} dir={dir} />
                        ) : (
                          <>
                            {msg.is_pinned && (
                              <div className="absolute -top-4 -start-2 flex items-center gap-1 bg-emerald-500/10 px-1.5 py-0.5 rounded-md border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)] z-10 scale-75 md:scale-90 origin-top-left">
                                <Pin size={10} className="text-emerald-500" />
                                <span className="text-[9px] font-black uppercase text-emerald-500 tracking-tighter">Pinned Response</span>
                              </div>
                            )}
                            <ThinkingSteps 
                              steps={msg.thinking_steps?.map(s => (!isGenerating || idx < messages.indexOf(msg)) ? { ...s, status: 'completed' as const } : s)} 
                              dir={dir} 
                            />
                            {(msg.tool === 'canvas') ? (
                              <ProductionSuite content={stripProtocolMarkers(msg.content)} dir={dir} theme={theme} />
                            ) : (
                              <Markdown 
                                remarkPlugins={[remarkGfm]} 
                                components={{ 
                                  code: CodeBlock,
                                  a: ({ href, children }: any) => {
                                    const isVideo = href && (
                                      href.endsWith('.mp4') || 
                                      href.endsWith('.webm') || 
                                      href.endsWith('.mov') || 
                                      href.includes('assets.mixkit.co/videos') ||
                                      href.includes('/uploads/') ||
                                      href.includes('.mp4') ||
                                      href.includes('.webm') ||
                                      href.includes('.mov')
                                    );
                                    if (isVideo) {
                                      return (
                                        <VideoPlaybackComponent 
                                          src={href} 
                                          dir={dir} 
                                          alt="Generated Video"
                                        />
                                      );
                                    }
                                    return <MarkdownLink href={href}>{children}</MarkdownLink>;
                                  },
                                  blockquote: ({ children }: any) => <BlockquoteWithActions dir={dir}>{children}</BlockquoteWithActions>,
                                  p: ({ children, node }: any) => {
                                    const isLastMessage = idx === messages.length - 1;
                                    const isStreamingActive = isLastMessage && msg.is_streaming;

                                    const isLastParagraph = node && node.parent && node.parent.children[node.parent.children.length - 1] === node;

                                    return (
                                      <div className="last:mb-0 mb-3 text-sm leading-relaxed text-slate-900 dark:text-slate-100 antialiased font-normal">
                                        {renderChildrenWithCitations(children, msg)}
                                        {isStreamingActive && isLastParagraph && (
                                          <span className="typing-cursor-emerald" />
                                        )}
                                      </div>
                                    );
                                  },
                                  h1: ({ children }) => <h1 className="text-xs md:text-sm font-black text-emerald-500 mb-3 mt-5 uppercase tracking-wider border-b border-emerald-500/10 pb-1.5">{children}</h1>,
                                  h2: ({ children }) => <h2 className="text-[11px] md:text-xs font-bold text-[var(--text-primary)] mb-2.5 mt-4 flex items-center gap-2">
                                    <div className="w-0.5 h-3 bg-emerald-500 rounded-full" />
                                    {children}
                                  </h2>,
                                  h3: ({ children }) => <h3 className="text-[10px] md:text-[11px] font-bold text-gray-400 mb-2 mt-3 uppercase tracking-widest">{children}</h3>,
                              img: ({ node, ...props }) => (
                                <ShareableImageOutput 
                                  src={props.src} 
                                  dir={dir} 
                                  alt={props.alt} 
                                  {...props} 
                                />
                              ),
                            video: ({ node, ...props }) => (
                              <VideoPlaybackComponent 
                                src={props.src} 
                                dir={dir} 
                                alt={(props as any).alt || "Generated Video"}
                                {...props} 
                              />
                            )
                          }}
                        >
                          {stripProtocolMarkers(msg.content)}
                        </Markdown>
                      )}

                      {(((msg.citations && msg.citations.length > 0) || (msg.follow_ups && msg.follow_ups.length > 0))) && (
                        <>
                          {msg.citations && msg.citations.length > 0 && (
                            <Citations 
                              citations={msg.citations} 
                              dir={dir} 
                              isOpen={!!openCitationsMap[idx]}
                              onToggle={() => setOpenCitationsMap(prev => ({ ...prev, [idx]: !prev[idx] }))}
                              query={messages.slice(0, idx).reverse().find(m => m.role === 'user')?.content || ''}
                            />
                          )}
                          <AnimatePresence mode="wait">
                            {(!isGenerating || idx < messages.length - 1) && msg.follow_ups && msg.follow_ups.length > 0 && (
                              <motion.div
                                key={`follow-ups-${idx}-${msg.id || idx}`}
                                initial={{ opacity: 0, y: 3, filter: "blur(2px)" }}
                                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                                exit={{ opacity: -3, filter: "blur(2px)" }}
                                transition={{ duration: 0.35, ease: "easeOut" }}
                              >
                                <FollowUps followUps={msg.follow_ups || []} onSelect={(q) => handleSendOrStop(q)} dir={dir} />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </>
                      )}
                    </>
                      )}

                      <div className={`text-[10px] font-mono text-gray-400 dark:text-gray-500/80 mt-2 select-none ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
                        {formatExactTimestamp(msg.created_at, dir)}
                      </div>
                    </motion.div>
                  )}

                  <AnimatePresence mode="wait">
                    {(!isGenerating || idx < messages.length - 1) && msg.role === 'assistant' && (
                      <motion.div 
                        key={`toolbar-${idx}-${msg.id || idx}`}
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
                        variants={toolbarVariants}
                        className="flex items-center justify-between mt-6 pt-4 px-0"
                      >
                      <div className="flex items-center gap-0.5 sm:gap-1.5">
                        <motion.button 
                          
                          onClick={() => handleFeedback(msg.id!, msg.feedback === 1 ? 0 : 1)}
                          className={`w-7 h-7 sm:w-10 sm:h-10 flex items-center justify-center rounded-sm transition-theme ${msg.feedback === 1 ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-transparent border border-transparent hover:bg-[var(--bg-overlay)] text-[var(--text-muted)] hover:text-emerald-500 hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]'}`}
                        >
                          <ThumbsUp size={13} />
                        </motion.button>
                        <motion.button 
                          
                          onClick={() => handleFeedback(msg.id!, msg.feedback === -1 ? 0 : -1)}
                          className={`w-7 h-7 sm:w-10 sm:h-10 flex items-center justify-center rounded-sm transition-theme ${msg.feedback === -1 ? 'text-amber-500 bg-amber-500/10 border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.3)]' : 'bg-transparent border border-transparent hover:bg-[var(--bg-overlay)] text-[var(--text-muted)] hover:text-amber-500 hover:drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]'}`}
                        >
                          <ThumbsDown size={13} />
                        </motion.button>
                        <motion.div  className="w-px h-3 sm:h-4 bg-[var(--border)] mx-0.5 sm:mx-1" />
                        <motion.button 
                          
                          onClick={() => handlePinMessage(msg.id!, !msg.is_pinned)}
                          title={msg.is_pinned ? (dir === 'rtl' ? 'إلغاء التثبيت' : 'Unpin') : (dir === 'rtl' ? 'تثبيت' : 'Pin')}
                          className={`hidden sm:flex w-7 h-7 sm:w-10 sm:h-10 items-center justify-center rounded-sm bg-transparent border transition-theme ${msg.is_pinned ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'border-transparent text-[var(--text-muted)] hover:text-emerald-500 hover:bg-emerald-500/5'}`}
                        >
                          {msg.is_pinned ? <PinOff size={13} /> : <Pin size={13} />}
                        </motion.button>
                        <motion.button 
                          
                          onClick={() => handleTTS(msg.content, msg.client_id || msg.id || idx)}
                          title={playingTTSId === (msg.client_id || msg.id || idx) ? (dir === 'rtl' ? 'إيقاف الصوت' : 'Stop') : (dir === 'rtl' ? 'قراءة صوتية' : 'Read Aloud')}
                          className={`hidden sm:flex w-7 h-7 sm:w-10 sm:h-10 items-center justify-center rounded-sm bg-transparent border transition-theme ${playingTTSId === (msg.client_id || msg.id || idx) ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'border-transparent text-[var(--text-muted)] hover:bg-[var(--bg-overlay)] hover:text-emerald-500 hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]'}`}
                        >
                          {playingTTSId === (msg.client_id || msg.id || idx) ? (
                            <Square size={13} fill="currentColor" />
                          ) : (
                            <Volume2 size={13} />
                          )}
                        </motion.button>
                        <motion.button 
                          
                          onClick={() => handleRegenerate(idx)}
                          title={dir === 'rtl' ? 'إعادة توليد' : 'Regenerate'}
                          className={`w-7 h-7 sm:w-10 sm:h-10 flex items-center justify-center rounded-sm bg-transparent border border-transparent hover:bg-[var(--bg-overlay)] text-[var(--text-muted)] hover:text-emerald-500 hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)] transition-theme ${isGenerating && idx === messages.length - 1 ? 'animate-spin opacity-50' : ''}`}
                        >
                          <RefreshCw size={13} />
                        </motion.button>
                        <motion.button 
                          
                          onClick={() => {
                            navigator.clipboard.writeText(msg.content);
                            toast.success(dir === 'rtl' ? 'تم النسخ بنجاح' : 'Copied successfully');
                          }}
                          title={dir === 'rtl' ? 'نسخ' : 'Copy'}
                          className="w-7 h-7 sm:w-10 sm:h-10 flex items-center justify-center rounded-sm bg-transparent border border-transparent hover:bg-[var(--bg-overlay)] text-gray-400 hover:text-emerald-500 hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)] transition-theme"
                        >
                          <Copy size={13} />
                        </motion.button>
                        <motion.button 
                          
                          onClick={async () => {
                            const blob = new Blob([msg.content], { type: 'text/markdown' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `Perplexta_Response_${Date.now()}.md`;
                            a.click();
                            URL.revokeObjectURL(url);
                          }}
                          title={dir === 'rtl' ? 'تحميل' : 'Download'}
                          className="hidden sm:flex w-7 h-7 sm:w-10 sm:h-10 items-center justify-center rounded-sm bg-transparent border border-transparent hover:bg-[var(--bg-overlay)] text-gray-400 hover:text-emerald-500 hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)] transition-theme"
                        >
                          <Download size={13} />
                        </motion.button>
                        {msg.id && (
                          <motion.button 
                            
                            id={`fork-btn-${msg.id}`}
                            onClick={() => handleForkThread(msg.id!)}
                            title={dir === 'rtl' ? 'تفريع المحادثة' : 'Fork Thread'}
                            className="hidden sm:flex w-10 h-10 items-center justify-center rounded-[4px] bg-transparent border border-transparent text-gray-400 hover:text-emerald-500 hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)] hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-300"
                          >
                            <GitFork size={13} />
                          </motion.button>
                        )}
                      </div>

                      <div className="flex items-center gap-1 sm:gap-2">
                        {msg.generation_time !== undefined && (
                          <motion.div 
                            
                            className="flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] bg-emerald-500/5 dark:bg-emerald-500/5 border border-emerald-500/10 text-emerald-500 select-none mr-1 sm:mr-2"
                          >
                            <Zap size={10} className="text-emerald-500" />
                            <span className="text-[10px] font-mono leading-none font-semibold">
                              {Number(msg.generation_time).toFixed(2)}s
                            </span>
                          </motion.div>
                        )}
                        <motion.button 
                          
                          onClick={async () => {
                            try {
                              if (navigator.share) {
                                await navigator.share({
                                  title: 'Perplexta AI Response',
                                  text: msg.content,
                                  url: window.location.href
                                });
                              } else {
                                navigator.clipboard.writeText(msg.content);
                                toast.success(dir === 'rtl' ? 'تم نسخ الرابط للمشاركة' : 'Link copied for sharing');
                              }
                            } catch (err) {

                            }
                          }}
                          title={dir === 'rtl' ? 'مشاركة' : 'Share'}
                          className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-[var(--radius)] bg-[var(--bg-overlay)] border border-[var(--border)] text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.15)] hover:bg-emerald-500/10 transition-theme ml-1 sm:ml-2"
                        >
                          <Share2 size={14} className="drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                        </motion.button>

                         <motion.div  className="relative">
                           <button 
                             onClick={() => setOpenMenuId(openMenuId === (msg.id?.toString() || idx.toString()) ? null : (msg.id?.toString() || idx.toString()))}
                             className={`w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-[var(--radius)] transition-theme ${openMenuId === (msg.id?.toString() || idx.toString()) ? 'text-emerald-500 bg-emerald-500/10' : 'bg-transparent border border-transparent hover:bg-[var(--bg-overlay)] text-[var(--text-muted)] hover:text-emerald-500'}`}
                           >
                             <MoreHorizontal size={14} />
                           </button>

                           <AnimatePresence>
                             {openMenuId === (msg.id?.toString() || idx.toString()) && (
                               <motion.div 
                                 initial={{ opacity: 0 }}
                                 animate={{ opacity: 1 }}
                                 exit={{ opacity: 0 }}
                                 className="absolute bottom-full end-0 mb-2 w-56 p-1 bg-[var(--bg-base)] border border-[var(--border)] rounded-[var(--radius)] shadow-2xl z-50 backdrop-blur-xl"
                               >
                                 <button 
                                   onClick={async () => {
                                     const userMsg = messages.slice(0, idx).reverse().find(m => m.role === 'user');
                                     if (userMsg) {
                                        try {
                                          const res = await fetch('/api/shortcuts', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                                            body: JSON.stringify({ title: userMsg.content.slice(0, 30) + '...', query: userMsg.content })
                                          });
                                          if (res.ok) toast.success(dir === 'rtl' ? 'تم حفظ التساؤل كاختصار' : 'Query saved as shortcut');
                                        } catch (e) {

                                        }
                                     }
                                     setOpenMenuId(null);
                                   }}
                                   className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] rounded-[var(--radius)] transition-theme group"
                                 >
                                   <Bookmark size={15} className="text-gray-400 group-hover:text-emerald-500 transition-theme" />
                                   <span>{dir === 'rtl' ? 'حفظ كاختصار' : 'Save query as shortcut'}</span>
                                 </button>
                                 <button 
                                   onClick={async () => {
                                     try {
                                       const res = await fetch('/api/reports', {
                                         method: 'POST',
                                         headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                                         body: JSON.stringify({ messageId: msg.id, reason: 'Manual User Report' })
                                       });
                                       if (res.ok) toast.info(dir === 'rtl' ? 'تم إرسال بلاغ للمراجعة' : 'Report sent for review');
                                     } catch (e) {

                                     }
                                     setOpenMenuId(null);
                                   }}
                                   className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] rounded-[var(--radius)] transition-theme group"
                                 >
                                   <Flag size={15} className="text-gray-400 group-hover:text-amber-500 transition-theme" />
                                   <span>{dir === 'rtl' ? 'إبلاغ' : 'Report'}</span>
                                 </button>
                                 <div className="my-1 h-px bg-[var(--bg-input)] dark:bg-[var(--bg-secondary)]" />
                                 <button 
                                   onClick={async () => {
                                     if (msg.id) {
                                       try {
                                         const res = await fetch(`/api/messages/${msg.id}`, {
                                           method: 'DELETE',
                                           headers: { 'Authorization': `Bearer ${token}` }
                                         });
                                         if (!res.ok) throw new Error('Delete failed');
                                       } catch (e) {

                                         toast.error(dir === 'rtl' ? 'فشل الحذف من الخادم' : 'Server deletion failed');
                                       }
                                     }
                                     setMessages(prev => prev.filter((_, i) => i !== idx));
                                     setOpenMenuId(null);
                                     toast.success(dir === 'rtl' ? 'تم حذف الرسالة' : 'Message deleted');
                                   }}
                                   className="w-full flex items-center gap-3 px-3 py-2 text-sm text-rose-500 hover:bg-rose-500/5 rounded-[var(--radius)] transition-theme group"
                                 >
                                   <Trash2 size={15} className="text-rose-400 group-hover:text-rose-500 transition-theme" />
                                   <span>{dir === 'rtl' ? 'حذف' : 'Delete'}</span>
                                 </button>
                               </motion.div>
                             )}
                           </AnimatePresence>
                         </motion.div>
                      </div>
                    </motion.div>
                  )}
                  </AnimatePresence>

                  </div>
                </motion.div>
                );
              })}

              <AnimatePresence>
                {isOtherTyping && (
                  <motion.div
                    key="global-typing-indicator"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-3 px-4 py-2 border rounded-full w-fit bg-emerald-500/5 border-emerald-500/10 text-emerald-500 select-none shadow-[0_0_15px_rgba(16,185,129,0.1)] mb-4 shrink-0 transition-theme"
                  >
                    <div className="flex gap-1 items-center justify-center">
                      <span className="perplexta-dot" />
                      <span className="perplexta-dot" />
                      <span className="perplexta-dot" />
                    </div>
                    <span className="text-xs font-semibold font-sans tracking-tight flex items-center gap-1">
                      <span>
                        {typingParty === 'assistant' 
                          ? (dir === 'rtl' ? 'بيربليكستا يكتب الآن...' : 'Perplexta is typing...') 
                          : (dir === 'rtl' ? `${typingName || 'مستخدم آخر'} يكتب الآن...` : `${typingName || 'Someone'} is typing...`)}
                      </span>
                      {typingParty === 'assistant' && liveElapsed > 0 && (
                        <span className="text-emerald-500/75 dark:text-emerald-400 font-mono text-[10px] ml-1 bg-emerald-500/10 dark:bg-emerald-400/10 px-1.5 py-0.5 rounded-[4px] leading-none">
                          ({liveElapsed.toFixed(1)}s)
                        </span>
                      )}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              <div ref={messagesEndRef} className="h-10" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="w-full flex-shrink-0 px-0 md:px-4 pb-2 sm:pb-4 pt-2 bg-transparent relative">
        <AnimatePresence>
          {showScrollToBottom && (
            <motion.button
              key="scroll-to-bottom-btn"
              initial={{ opacity: 0, y: 10, x: "-50%", scale: 0.8 }}
              animate={{ opacity: 1, y: 0, x: "-50%", scale: 1 }}
              exit={{ opacity: 10, x: "-50%", scale: 0.8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              onClick={() => scrollToBottom('smooth')}
              style={{ left: '50%' }}
              className="absolute bottom-full mb-3 z-40 flex items-center justify-center p-2 text-gray-400 hover:text-emerald-500 hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)] transition-all duration-300 cursor-pointer active:scale-95 bg-transparent border-0"
              title={dir === 'rtl' ? 'الرجوع للأسفل' : 'Scroll to Bottom'}
            >
              <ArrowDown size={22} className="animate-[bounce_2s_infinite]" />
            </motion.button>
          )}
        </AnimatePresence>

        <div className="max-w-5xl mx-auto w-full text-[var(--text-primary)]">
          {renderInputArea()}
        </div>
      </div>
            </>
          )}
      </div>

      <AnimatePresence>
        {showPinnedModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 20 }}
              className="bg-[var(--bg-base)] border border-[var(--border-main)] rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-[var(--border-main)] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-md bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                    <Bookmark size={20} />
                  </div>
                  <div>
                    <h2 className="text-sm font-black uppercase tracking-widest">{dir === 'rtl' ? 'الرسائل المثبتة' : 'Pinned Messages'}</h2>
                    <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-tighter mt-0.5">
                       {messages.filter(m => m.is_pinned).length} {dir === 'rtl' ? 'رسائل محفوظة' : 'saved messages'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowPinnedModal(false)}
                  className="w-10 h-10 rounded-sm hover:bg-[var(--bg-overlay)] flex items-center justify-center text-[var(--text-secondary)]"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                {messages.filter(m => m.is_pinned).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Pin size={32} className="text-[var(--text-muted)] opacity-35 mb-3 animate-pulse text-emerald-500/40" />
                    <p className="text-[12px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                      {dir === 'rtl' ? 'لا توجد رسائل مثبتة حالياً' : 'No pinned messages yet'}
                    </p>
                    <p className="text-[10px] text-gray-500 mt-1 max-w-[280px] leading-relaxed">
                      {dir === 'rtl' ? 'ثبّت الرسائل المهمة في المحادثة لتبقى محفوظة هنا.' : 'Pin important questions or responses to view them in this list.'}
                    </p>
                  </div>
                ) : (
                  messages.filter(m => m.is_pinned).map((msg, pIdx) => (
                    <div key={pIdx} className="group relative p-4 rounded-md bg-[var(--bg-secondary)] border border-[var(--border-main)] hover:border-emerald-500/30 transition-theme">
                      <div className="flex items-center justify-between mb-2">
                         <span className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-500">
                           {msg.role === 'user' ? (dir === 'rtl' ? 'سؤالك' : 'Your Question') : (dir === 'rtl' ? 'إجابة بيربليكستا' : 'Perplexta Answer')}
                         </span>
                         <button
                           onClick={() => handlePinMessage(msg.id!, false)}
                           className="text-gray-400 hover:text-emerald-500 transition-all duration-300 p-1.5 rounded-sm hover:bg-[var(--bg-overlay)]"
                           title={dir === 'rtl' ? 'إلغاء التثبيت' : 'Unpin'}
                         >
                           <PinOff size={12} />
                         </button>
                      </div>
                      <div className="markdown-body prose dark:prose-invert text-[13px] line-clamp-6 text-gray-700 dark:text-gray-300">
                        <Markdown>{stripProtocolMarkers(msg.content)}</Markdown>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}

        {isForensicModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 20 }}
              className="bg-[#0f0f11] border border-gray-800 text-gray-100 rounded-lg w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden font-sans"
            >

              <div className="p-6 border-b border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-md bg-emerald-500/10 flex items-center justify-center text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]">
                    <Sparkles size={20} className="animate-pulse" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black uppercase tracking-widest text-emerald-400">
                      {dir === 'rtl' ? 'التحليل الجنائي للوثيقة' : 'Document Forensic Audit'}
                    </h2>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter mt-0.5">
                      {selectedFile?.name || 'document.pdf'} • {(Number(selectedFile?.size || 0) / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsForensicModalOpen(false)}
                  className="w-10 h-10 rounded-sm hover:bg-gray-800 flex items-center justify-center text-gray-400 transition-colors bg-transparent border-transparent cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                {isAnalyzingForensic ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <Loader2 size={36} className="text-emerald-500 animate-spin mb-4" />
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest animate-pulse">
                      {dir === 'rtl' ? 'جاري فحص الطبقات المخفية وهيكل الملف المصدري...' : 'Analyzing binary optional content streams & file layers...'}
                    </p>
                    <p className="text-[10px] text-gray-600 mt-1">
                      Parsing incremental update trees, trailers & OCG dictionaries
                    </p>
                  </div>
                ) : forensicReport ? (
                  <div className="space-y-6">

                    {forensicReport.anomalies.length > 0 ? (
                      <div className="p-4 rounded-md bg-red-950/20 border border-red-900/40 text-red-200">
                        <div className="flex items-center gap-2 mb-2 font-black text-xs tracking-wider uppercase">
                          <AlertTriangle size={14} className="text-red-500" />
                          <span>{dir === 'rtl' ? 'تنبيهات أمنية هيكلية' : 'Structural Security Violations'}</span>
                        </div>
                        <ul className="text-[11px] list-disc list-inside space-y-1 text-red-300">
                          {forensicReport.anomalies.map((anomaly: string, aIdx: number) => (
                            <li key={aIdx}>{anomaly}</li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <div className="p-4 rounded-md bg-emerald-950/20 border border-emerald-900/40 text-emerald-200">
                        <div className="flex items-center gap-2 font-black text-xs tracking-wider uppercase">
                          <Check size={14} className="text-emerald-500" />
                          <span>{dir === 'rtl' ? 'التحقق السليم لهيكل الملف' : 'Document Format Integrity Verified'}</span>
                        </div>
                        <p className="text-[10px] text-emerald-400/75 mt-1">
                          No deceptive multi-incremental states or nested active script payloads detected in this scope.
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                      <div className="space-y-4">
                        <h3 className="text-xs font-black uppercase tracking-widest text-emerald-500/80 mb-2">
                          {dir === 'rtl' ? 'مؤشرات الهيكل الكوديكى' : 'Core Forensic Properties'}
                        </h3>
                        <div className="bg-[#121214] border border-gray-800/60 rounded-md p-4 space-y-3">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-gray-400">{dir === 'rtl' ? 'إصدار الـ PDF القياسي' : 'PDF Specification Version'}</span>
                            <span className="font-mono font-bold text-gray-100">{forensicReport.pdfVersion}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-gray-400">{dir === 'rtl' ? 'التشفير وحماية كلمة المرور' : 'Is Passcode Encrypted'}</span>
                            <span className={`font-mono font-bold ${forensicReport.isEncrypted ? 'text-amber-500' : 'text-gray-400'}`}>
                              {forensicReport.isEncrypted ? (dir === 'rtl' ? 'نعم (مؤمن)' : 'Yes (Locked)') : (dir === 'rtl' ? 'لا (مفتوح)' : 'No')}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-gray-400">{dir === 'rtl' ? 'إجمالي كائنات الـ Object' : 'Parsed Objects Count'}</span>
                            <span className="font-mono font-bold text-emerald-400">{forensicReport.totalObjectsCount}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-gray-400">{dir === 'rtl' ? 'مجموعات المحتوى الاختياري OCG (الأطياف)' : 'Optional Content Layers (OCG)'}</span>
                            <span className="font-mono font-bold text-emerald-400">{forensicReport.optionalContentGroupsCount}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-gray-400">{dir === 'rtl' ? 'الملفات المدمجة داخلياً' : 'Nested Embedded Files'}</span>
                            <span className={`font-mono font-bold ${forensicReport.embeddedFilesCount > 0 ? 'text-amber-500' : 'text-gray-400'}`}>
                              {forensicReport.embeddedFilesCount}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-gray-400">{dir === 'rtl' ? 'الروابط التشعبية الفعالة' : 'Active URI References'}</span>
                            <span className="font-mono font-bold text-gray-400">{forensicReport.actionsUriCount}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-gray-400">{dir === 'rtl' ? 'تعديلات متراكمة (علامات EOF)' : 'Append Signatures (EOF Flags)'}</span>
                            <span className={`font-mono font-bold ${forensicReport.incrementalEofCount > 1 ? 'text-amber-500' : 'text-gray-400'}`}>
                              {forensicReport.incrementalEofCount} {forensicReport.incrementalEofCount > 1 && `(${dir==='rtl'?'معدل تراكمياً':'Incremental modification'})`}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-gray-400">{dir === 'rtl' ? 'سجلات شجرة الصفحات الرئيسية' : 'Page Tree Descriptors'}</span>
                            <span className="font-mono font-bold text-gray-400">{forensicReport.rootDefCount}</span>
                          </div>
                        </div>

                        <div className="bg-[#121214] border border-gray-800/60 rounded-md p-4 space-y-2">
                          <span className="text-xs font-black uppercase tracking-wider text-gray-400">
                            {dir === 'rtl' ? 'طبقات الوثيقة المحددة (الأطياف المخفية)' : 'Optional Content Layers List (Hidden Paths)'}
                          </span>
                          {forensicReport.hiddenLayers.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {forensicReport.hiddenLayers.map((layer: string, lIdx: number) => (
                                <span key={lIdx} className="text-[9px] font-bold tracking-tight bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-1 rounded-[4px]">
                                  {layer}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[10px] text-gray-600 italic">
                              {dir === 'rtl' ? 'لم يتم العثور على مجموعات أو طبقات محتوى مغلفة منفصلة.' : 'No optional layer dictionaries or overlay hierarchies found.'}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-xs font-black uppercase tracking-widest text-emerald-500/80 mb-2">
                          {dir === 'rtl' ? 'سجل البيانات الوصفية الملحقة' : 'Embedded Metadata Trail'}
                        </h3>
                        <div className="bg-[#121214] border border-gray-800/60 rounded-md p-4 space-y-4">
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">{dir==='rtl'?'العنوان':'Title'}</span>
                            <p className="text-xs text-gray-200 mt-1 font-semibold">{forensicReport.metadata.title !== 'N/A' ? forensicReport.metadata.title : (dir==='rtl'?'غير محدد':'None')}</p>
                          </div>
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">{dir==='rtl'?'المؤلف / المالك المصدري':'Author / Owner'}</span>
                            <p className="text-xs mt-1 font-semibold text-emerald-400">{forensicReport.metadata.author !== 'N/A' ? forensicReport.metadata.author : (dir==='rtl'?'غير محدد':'None')}</p>
                          </div>
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">{dir==='rtl'?'الموضوع':'Subject'}</span>
                            <p className="text-xs text-gray-300 mt-1">{forensicReport.metadata.subject !== 'N/A' ? forensicReport.metadata.subject : (dir==='rtl'?'غير محدد':'None')}</p>
                          </div>
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">{dir==='rtl'?'تاريخ الإنشاء الرقمي':'Creation Date'}</span>
                            <p className="text-xs text-gray-300 mt-1 font-mono">{forensicReport.metadata.creationDate !== 'N/A' ? forensicReport.metadata.creationDate : (dir==='rtl'?'غير محدد':'None')}</p>
                          </div>
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">{dir==='rtl'?'أداة تحرير المحتوى المصدري':'Creator Software'}</span>
                            <p className="text-xs text-gray-300 mt-1 font-mono">{forensicReport.metadata.creator !== 'N/A' ? forensicReport.metadata.creator : (dir==='rtl'?'غير محدد':'None')}</p>
                          </div>
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">{dir==='rtl'?'أداة إنتاج الـ PDF':'Producer Engine'}</span>
                            <p className="text-xs text-gray-300 mt-1 font-mono">{forensicReport.metadata.producer !== 'N/A' ? forensicReport.metadata.producer : (dir==='rtl'?'غير محدد':'None')}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-gray-800">
                      <h3 className="text-xs font-black uppercase tracking-widest text-emerald-500/80 mb-2">
                        {dir === 'rtl' ? 'سجل الفحص المعالج خطوة بخطوة' : 'Scanner Processing Stream Logs'}
                      </h3>
                      <div className="bg-[#0b0b0c] border border-gray-900 rounded p-4 font-mono text-[9px] text-gray-400 space-y-1 max-h-[160px] overflow-y-auto custom-scrollbar">
                        {forensicReport.detailedLog.map((log: string, lIdx: number) => (
                          <div key={lIdx} className="leading-relaxed hover:text-emerald-400 transition-colors">
                            {log}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-gray-500">
                    <p className="text-xs">{dir === 'rtl' ? 'توصيف ناقص للتقرير' : 'Forensic logs truncated.'}</p>
                  </div>
                )}
              </div>

              <div className="p-4 bg-gray-950 border-t border-gray-800 flex justify-end">
                <button
                  onClick={() => setIsForensicModalOpen(false)}
                  className="px-5 py-2.5 rounded-[4px] bg-emerald-500 hover:bg-emerald-600 text-black font-black text-xs uppercase tracking-widest transition-colors duration-300 cursor-pointer border-transparent"
                >
                  {dir === 'rtl' ? 'إغلاق نافذة الفحص' : 'Close Forensic Console'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDeleteModalOpen(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className={`relative max-w-sm w-full p-6 rounded-xl border shadow-2xl transition-all duration-300 z-10 ${
                theme === 'dark' 
                  ? 'bg-[#161618] border-zinc-800 text-gray-100' 
                  : 'bg-white border-gray-150 text-gray-900'
              }`}
            >
              <h3 className="text-base font-bold tracking-tight font-sans text-start text-red-500 dark:text-red-400">
                {dir === 'rtl' ? 'حذف المحادثة؟' : 'Delete conversation?'}
              </h3>

              <p className={`text-xs mt-2 font-sans text-start ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                {dir === 'rtl' 
                  ? 'سيؤدي هذا إلى حذف المحادثة الحالية وجميع الرسائل المرتبطة بها نهائيًا ولا يمكن التراجع عن هذا العمل.' 
                  : 'This will permanently delete the current conversation and all associated messages. This action cannot be undone.'}
              </p>

              <div className={`flex justify-end gap-2.5 mt-6 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className={`px-4 py-2 text-xs font-semibold rounded-[4px] font-sans transition-all duration-300 ${
                    theme === 'dark' 
                      ? 'text-gray-400 hover:text-white hover:bg-[#252528]' 
                      : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
                  }`}
                >
                  {dir === 'rtl' ? 'إلغاء' : 'Cancel'}
                </button>

                <button
                  type="button"
                  onClick={handleThreadDeleteConfirm}
                  className="px-4 py-2 text-xs font-bold bg-[#db6b7a] hover:bg-[#c95968] text-white rounded-[4px] font-sans transition-all duration-300 shadow-[0_0_12px_rgba(219,107,122,0.25)]"
                >
                  {dir === 'rtl' ? 'تأكيد الحذف' : 'Confirm Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </motion.div>
    </ErrorBoundary>
  );
};

import { secureStorage } from "@/lib/storage";
import React, { useState, useRef, useEffect, useLayoutEffect, useMemo } from 'react';
import { useVideoPlayback } from '../hooks/useVideoPlayback';
import { useTypingDebounce } from '../hooks/useTypingDebounce';
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
import { ArrowDown, ArrowUpRight, MessageSquare, Music, Play, Pause, Plus, Mic, MicOff, Send, LayoutGrid, Zap, Code, FileText, Image as ImageIcon, Sparkles, Brain, Video, Volume2, VolumeX, Search, BookOpen, Square, AlertTriangle, AlertCircle, Paperclip, Copy, Download, Scale, Megaphone, Maximize2, Minimize2, ThumbsUp, ThumbsDown, Share2, RefreshCw, MoreHorizontal, Bookmark, Flag, Trash2, Check, Pencil, X, Pin, PinOff, FileDown, FileCode, FolderPlus, Loader2, ExternalLink, Settings, Database, GitFork, Sliders, ZoomIn, ZoomOut, Twitter, Linkedin, CornerDownLeft, CornerDownRight, Lock, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from '../context/NotificationContext';
import { useAppContext } from '../context/AppContext';
import { useVideoResource } from '../context/VideoResourceContext';
import { trackGAEvent } from '../components/GoogleAnalytics';
import { getCSPNonce, applyNonce } from '../utils/csp';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { triggerHaptic } from '../utils/haptics';
import { encrypt } from '../utils/browserCrypto';
import { motion, AnimatePresence } from 'motion/react';
import { perplextaPageTransition } from '../constants/motions';
import { jsPDF } from 'jspdf';
import { toPng } from 'html-to-image';
import { generateProceduralTrack } from '../utils/audioGenerator';
import { HighlightText } from '../components/HighlightText';
import { useFollowUpSuggestions } from '../hooks/useFollowUpSuggestions';
import { stripProtocolMarkers, extractFollowUpsClient, formatActionableSuggestion } from '../utils/chatUtils';
import { fileToBase64 } from '../utils/fileUtils';
import { formatExactTimestamp } from '../utils/adminUtils';
import { ChatService } from '../services/chatService';
import { enqueueOfflineMessage, initBackgroundSyncListener, QueuedChatMessage } from '../utils/offlineQueue';

import { ResponseSkeleton } from '../components/ResponseSkeleton';
import { VisitorShell } from '../components/VisitorShell';
import { ASPECT_RATIO_CLASSES } from '../constants/chat';

const SimpleImageLoadingPlaceholder = ({ dir, aspectRatio = '1:1' }: { dir: 'ltr' | 'rtl'; aspectRatio?: string }) => {
  const containerAspectClass = ASPECT_RATIO_CLASSES[aspectRatio] || 'aspect-square max-w-[440px] sm:max-w-[480px]';

  return (
    <div className="w-full flex flex-col my-3 items-start gap-3">
      {/* Top Assistant Status Message */}
      <div className="flex items-center gap-2 text-zinc-300 dark:text-zinc-200 text-sm font-medium">
        <span>{dir === 'rtl' ? 'جارٍ إنشاء صورتك...' : 'Creating your image...'}</span>
        <motion.span
          animate={{
            opacity: [0.35, 1, 0.35],
            scale: [0.9, 1.15, 0.9],
            rotate: [0, 8, -8, 0]
          }}
          transition={{
            duration: 2.2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="inline-flex text-accent select-none"
        >
          ✨
        </motion.span>
      </div>

      {/* Modern Shaded Square Canvas Placeholder */}
      <div 
        className={`relative overflow-hidden rounded-2xl border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-transparent ${containerAspectClass} w-full flex items-center justify-center`}
      >
        {/* Soft breathing center radial aura */}
        <motion.div 
          animate={{
            scale: [0.85, 1.15, 0.85],
            opacity: [0.2, 0.45, 0.2]
          }}
          transition={{
            duration: 3.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute w-56 h-56 rounded-[4px] bg-gradient-to-tr from-accent/20 via-purple-500/10 to-transparent blur-3xl pointer-events-none"
        />

        {/* Shimmer sweep effect across the dark card */}
        <motion.div
          animate={{
            x: dir === 'rtl' ? ['150%', '-150%'] : ['-150%', '150%']
          }}
          transition={{
            duration: 2.6,
            repeat: Infinity,
            ease: "easeInOut",
            repeatDelay: 0.4
          }}
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent skew-x-12 pointer-events-none"
        />
      </div>
    </div>
  );
};

const SimpleImageErrorPlaceholder = ({ dir, errorMessage, onRetry, aspectRatio = '1:1' }: { dir: 'ltr' | 'rtl'; errorMessage?: string; onRetry?: () => void; aspectRatio?: string }) => {
  const containerAspectClass = ASPECT_RATIO_CLASSES[aspectRatio] || 'aspect-square max-w-[440px] sm:max-w-[480px]';

  return (
    <div className="w-full flex flex-col my-3 items-start gap-3">
      <div 
        className={`relative overflow-hidden rounded-2xl border border-rose-200 dark:border-rose-950/40 bg-rose-50/5 dark:bg-rose-950/10 ${containerAspectClass} w-full shadow-sm flex flex-col items-center justify-center p-6 text-center`}
      >
        <AlertTriangle className="text-rose-500 mb-3" size={24} />
        <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-1">
          {dir === 'rtl' ? 'تعذر إنشاء العمل الفني' : 'Synthesis failed'}
        </span>
        <span className="text-[10px] text-rose-500 font-medium break-words max-w-full leading-relaxed px-2">
          {errorMessage || (dir === 'rtl' ? 'خطأ غير معروف.' : 'Unknown generation error.')}
        </span>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900 bg-white dark:bg-zinc-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/10 transition-theme text-[11px] font-black uppercase cursor-pointer"
          >
            <RefreshCw size={12} className="animate-spin-slow" />
            <span>{dir === 'rtl' ? 'إعادة المحاولة' : 'Retry'}</span>
          </button>
        )}
      </div>
    </div>
  );
};

const loadedImageCache = new Set<string>();

const ShareableImageOutput = ({ src, dir: propDir, alt }: { src?: string; dir?: string; alt?: string; [key: string]: any }) => {
  const { dir: contextDir } = useAppContext();
  const dir = propDir || contextDir || (document.documentElement.dir === 'rtl' ? 'rtl' : 'ltr');
  const rawSrc = src || '';
  const cleanUrl = rawSrc.split('#')[0];
  const aspectMatch = rawSrc.match(/#aspect=([0-9]+:[0-9]+)/);
  const selectedRatio = aspectMatch ? aspectMatch[1] : '1:1';
  const containerAspectClass = ASPECT_RATIO_CLASSES[selectedRatio] || 'aspect-square max-w-[440px] sm:max-w-[480px]';

  const [isImageFocused, setIsImageFocused] = useState(() => loadedImageCache.has(cleanUrl));
  const [isSaved, setIsSaved] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isCopiedPrompt, setIsCopiedPrompt] = useState(false);
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied' | 'sharing'>('idle');
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!cleanUrl) return;

    if (loadedImageCache.has(cleanUrl) || (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0)) {
      setIsImageFocused(true);
      loadedImageCache.add(cleanUrl);
    }

    const timer = setTimeout(() => {
      setIsImageFocused(true);
      if (cleanUrl) loadedImageCache.add(cleanUrl);
    }, 800);

    try {
      const savedImages = JSON.parse(secureStorage.getSync('saved_ai_images') || '[]');
      if (savedImages.includes(rawSrc) || savedImages.includes(cleanUrl)) {
        setIsSaved(true);
      }
    } catch (e) {
      console.warn('LocalStorage list parsing failed', e);
    }

    return () => clearTimeout(timer);
  }, [rawSrc, cleanUrl]);

  // Keyboard navigation for the in-page Lightbox
  useEffect(() => {
    if (!isPreviewOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsPreviewOpen(false);
        setZoomLevel(1);
      } else if (e.key === '+' || e.key === '=') {
        setZoomLevel(prev => Math.min(prev + 0.5, 3));
      } else if (e.key === '-' || e.key === '_') {
        setZoomLevel(prev => Math.max(prev - 0.5, 1));
      } else if (e.key === '0') {
        setZoomLevel(1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPreviewOpen]);

  const handleDownload = async () => {
    if (!cleanUrl) return;
    try {
      const targetUrl = cleanUrl.startsWith('/') ? `${window.location.origin}${cleanUrl}` : cleanUrl;
      const cleanResponse = await fetch(targetUrl);
      const cleanBlob = await cleanResponse.blob();
      const cleanObjectUrl = window.URL.createObjectURL(cleanBlob);
      const link = document.createElement('a');
      link.href = cleanObjectUrl;
      link.download = `Perplexta_Art_${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(cleanObjectUrl);
      toast.success(dir === 'rtl' ? 'تم تنزيل الصورة بنجاح!' : 'Image downloaded successfully!');
    } catch (err) {
      const link = document.createElement('a');
      link.href = cleanUrl;
      link.download = `Perplexta_Art_${Date.now()}.png`;
      link.target = '_blank';
      link.click();
    }
  };

  const handleSaveToggle = () => {
    if (!cleanUrl) return;
    try {
      const savedImages = JSON.parse(secureStorage.getSync('saved_ai_images') || '[]');
      if (isSaved) {
        const updated = savedImages.filter((item: string) => item !== rawSrc && item !== cleanUrl);
        secureStorage.set('saved_ai_images', JSON.stringify(updated));
        setIsSaved(false);
        toast.success(dir === 'rtl' ? 'تمت إزالة الصورة من المحفوظات' : 'Image removed from bookmarks');
      } else {
        savedImages.push(cleanUrl);
        secureStorage.set('saved_ai_images', JSON.stringify(savedImages));
        setIsSaved(true);
        toast.success(dir === 'rtl' ? 'تم حفظ الصورة في المحفوظات!' : 'Image saved to bookmarks!');
      }
    } catch (e) {
      setIsSaved(!isSaved);
    }
  };

  const handleOpenInBrowser = () => {
    if (!cleanUrl) return;
    const targetUrl = cleanUrl.startsWith('/') ? `${window.location.origin}${cleanUrl}` : cleanUrl;
    window.open(targetUrl, '_blank');
  };

  const handleCopyPrompt = () => {
    if (!alt) return;
    navigator.clipboard.writeText(alt);
    setIsCopiedPrompt(true);
    toast.success(dir === 'rtl' ? 'تم نسخ البرومبت بنجاح!' : 'Prompt copied to clipboard!');
    setTimeout(() => setIsCopiedPrompt(false), 2000);
  };

  const handleShare = async () => {
    if (!cleanUrl) return;
    const shareUrl = cleanUrl.startsWith('/') ? `${window.location.origin}${cleanUrl}` : cleanUrl;
    if (navigator.share) {
      try {
        setShareStatus('sharing');
        await navigator.share({
          title: 'Perplexta Art 1080p',
          text: alt || 'Generated with Perplexta AI Studio',
          url: shareUrl
        });
        setShareStatus('idle');
      } catch (e) {
        setShareStatus('idle');
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
      setShareStatus('copied');
      toast.success(dir === 'rtl' ? 'تم نسخ رابط الصورة!' : 'Image link copied to clipboard!');
      setTimeout(() => setShareStatus('idle'), 2000);
    }
  };

  const formattedRatio = selectedRatio === '1:1' ? '1080 × 1080 HD' : `${selectedRatio} Pro Canvas`;

  return (
    <div className="w-full flex flex-col my-4 items-start gap-3">
      {/* Thumbnail Card */}
      <div 
        className={`relative group overflow-hidden rounded-2xl border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-transparent ${containerAspectClass} w-full transition-all duration-300 cursor-pointer`}
        onClick={() => setIsPreviewOpen(true)}
      >
        {!imageError && (
          <motion.img 
            ref={imgRef}
            initial={isImageFocused ? { filter: "blur(0px)", scale: 1 } : { filter: "blur(20px)", scale: 0.98 }}
            animate={isImageFocused ? { filter: "blur(0px)", scale: 1 } : { filter: "blur(20px)", scale: 0.98 }}
            transition={{ duration: 0.8, ease: [0.25, 1, 0.5, 1] }}
            onLoad={() => {
              setIsImageFocused(true);
              if (cleanUrl) loadedImageCache.add(cleanUrl);
            }}
            onError={() => {
              setIsImageFocused(true);
              setImageError(true);
            }}
            src={cleanUrl}
            alt={alt || "Perplexta Art Output"}
            className="block w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            referrerPolicy="no-referrer"
          />
        )}

        {/* Hover overlay with expand button */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/35 transition-colors duration-300 flex items-center justify-center pointer-events-none">
          <div className="w-11 h-11 rounded-[4px] bg-zinc-950/80 backdrop-blur-md border border-zinc-700/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transform scale-90 group-hover:scale-100 transition-all duration-300 shadow-xl">
            <Maximize2 size={18} className="text-accent" />
          </div>
        </div>

        {/* Aspect Ratio Badge */}
        <div className={`absolute top-2.5 ${dir === 'rtl' ? 'right-2.5' : 'left-2.5'} bg-zinc-950/70 backdrop-blur-md px-2 py-0.5 rounded-[4px] border border-white/10 text-[9px] font-mono font-medium text-white/90 pointer-events-none z-10`}>
          {selectedRatio === '1:1' ? '1080×1080' : selectedRatio}
        </div>

        {!isImageFocused && !imageError && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/10 backdrop-blur-sm pointer-events-none">
            <span className="text-[10px] font-mono tracking-widest text-zinc-500 dark:text-zinc-400 uppercase animate-pulse">
              {dir === 'rtl' ? 'جاري التركيز البصري...' : 'Focusing canvas...'}
            </span>
          </div>
        )}

        {imageError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-rose-500/5 dark:bg-rose-950/20 p-4 text-center">
            <AlertTriangle className="text-rose-500 mb-2" size={20} />
            <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400">
              {dir === 'rtl' ? 'تعذر تحميل الصورة' : 'Failed to load image'}
            </span>
          </div>
        )}
      </div>

      {/* Action Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setIsPreviewOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-accent/40 bg-accent/10 hover:bg-accent/20 text-accent transition-theme text-[11px] font-black tracking-wide uppercase cursor-pointer active:scale-95 shadow-sm"
          title={dir === 'rtl' ? 'عرض الصورة بدقة فائقة 1080×1080' : 'Open 1080×1080 Lightbox'}
        >
          <Maximize2 size={13} />
          <span>{dir === 'rtl' ? 'فتح الصورة' : 'Open'}</span>
        </button>

        <button
          onClick={handleDownload}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:text-accent hover:border-accent/40 dark:hover:text-accent transition-theme text-[11px] font-black tracking-wide uppercase cursor-pointer active:scale-95 shadow-sm"
          title={dir === 'rtl' ? 'تنزيل الصورة' : 'Download Image'}
        >
          <Download size={13} />
          <span>{dir === 'rtl' ? 'تنزيل' : 'Download'}</span>
        </button>

        <button
          onClick={handleSaveToggle}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-theme text-[11px] font-black tracking-wide uppercase cursor-pointer active:scale-95 shadow-sm ${
            isSaved 
              ? 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400' 
              : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:text-rose-500 hover:border-rose-500/30'
          }`}
          title={dir === 'rtl' ? 'حفظ الصورة' : 'Save Image'}
        >
          <Bookmark size={13} className={isSaved ? 'fill-current' : ''} />
          <span>{isSaved ? (dir === 'rtl' ? 'محفوظة' : 'Saved') : (dir === 'rtl' ? 'حفظ' : 'Save')}</span>
        </button>

        {alt && alt !== 'Generated Image' && alt !== 'Perplexta Art Output' && alt !== 'صورة مولدة' && (
          <button
            onClick={handleCopyPrompt}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:text-accent hover:border-accent/40 dark:hover:text-accent transition-theme text-[11px] font-black tracking-wide uppercase cursor-pointer active:scale-95 shadow-sm"
            title={dir === 'rtl' ? 'نسخ البرومبت' : 'Copy Prompt'}
          >
            {isCopiedPrompt ? <Check size={13} className="text-[var(--fg-success)]" /> : <Copy size={13} />}
            <span>{dir === 'rtl' ? 'نسخ البرومبت' : 'Copy Prompt'}</span>
          </button>
        )}
      </div>

      {/* 48 Hours Retention Notice */}
      <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-[11px] font-medium leading-relaxed w-full max-w-[360px] my-1">
        <Clock size={14} className="shrink-0 text-amber-500 mt-0.5" />
        <span>
          {dir === 'rtl' 
            ? 'ملاحظة: يتم حفظ ملفات الصور والفيديو على الخادم لمدة 48 ساعة فقط. يُرجى تنزيل أو حفظ صورك وفيديوهاتك المهمة على جهازك.' 
            : 'Notice: Media files are retained on the server for 48 hours only. Please download or save your important media to your device.'}
        </span>
      </div>

      {/* In-Page 1080x1080 World-Class Lightbox Modal */}
      {createPortal(
        <AnimatePresence>
          {isPreviewOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-neutral-955/98 backdrop-blur-2xl z-[999999] flex flex-col items-center justify-between select-none p-4 sm:p-6 overflow-hidden"
              onClick={() => {
                setIsPreviewOpen(false);
                setZoomLevel(1);
              }}
            >
              {/* Top Header Floating Bar */}
              <div 
                className="w-full max-w-7xl flex items-center justify-between gap-4 py-2 px-4 rounded-xl bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/80 shadow-2xl z-30"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Brand & Format Badges */}
                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-accent/15 border border-accent/30 text-accent text-[11px] font-mono font-bold uppercase tracking-wider">
                    <Sparkles size={13} className="text-accent" />
                    <span>PERPLEXTA ART</span>
                  </div>
                  <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-800/80 border border-zinc-700/60 text-zinc-300 text-[10px] font-mono">
                    <span className="w-1.5 h-1.5 rounded-[4px] bg-[var(--fg-success)] animate-pulse" />
                    <span>{formattedRatio}</span>
                  </div>
                </div>

                {/* Lightbox Toolbar Actions */}
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  {/* Zoom Controls */}
                  <div className="hidden md:flex items-center bg-zinc-950/80 rounded-lg border border-zinc-800 p-0.5">
                    <button
                      onClick={() => setZoomLevel(prev => Math.max(prev - 0.5, 1))}
                      disabled={zoomLevel <= 1}
                      className="p-1.5 text-zinc-400 hover:text-white disabled:opacity-30 disabled:hover:text-zinc-400 transition-colors rounded-md hover:bg-zinc-800/80 cursor-pointer"
                      title={dir === 'rtl' ? 'تصغير (-)' : 'Zoom Out (-)'}
                    >
                      <ZoomOut size={14} />
                    </button>
                    <button
                      onClick={() => setZoomLevel(prev => (prev === 1 ? 2 : 1))}
                      className="px-2 py-1 text-[10px] font-mono text-zinc-300 hover:text-accent transition-colors font-medium cursor-pointer"
                      title={dir === 'rtl' ? 'إعادة ضبط التكبير (0)' : 'Reset Zoom (0)'}
                    >
                      {Math.round(zoomLevel * 100)}%
                    </button>
                    <button
                      onClick={() => setZoomLevel(prev => Math.min(prev + 0.5, 3))}
                      disabled={zoomLevel >= 3}
                      className="p-1.5 text-zinc-400 hover:text-white disabled:opacity-30 disabled:hover:text-zinc-400 transition-colors rounded-md hover:bg-zinc-800/80 cursor-pointer"
                      title={dir === 'rtl' ? 'تكبير (+)' : 'Zoom In (+)'}
                    >
                      <ZoomIn size={14} />
                    </button>
                    {zoomLevel > 1 && (
                      <button
                        onClick={() => setZoomLevel(1)}
                        className="p-1.5 text-zinc-400 hover:text-accent transition-colors rounded-md hover:bg-zinc-800/80 cursor-pointer"
                        title={dir === 'rtl' ? 'إعادة الضبط' : 'Reset'}
                      >
                        <RefreshCw size={12} />
                      </button>
                    )}
                  </div>

                  {alt && (
                    <button
                      onClick={handleCopyPrompt}
                      className="px-2.5 py-1.5 rounded-lg bg-zinc-950/80 border border-zinc-800 text-zinc-300 hover:text-accent hover:border-accent/40 transition-theme flex items-center gap-1.5 text-[11px] font-medium cursor-pointer shadow-md active:scale-95"
                      title={dir === 'rtl' ? 'نسخ البرومبت' : 'Copy Prompt'}
                    >
                      {isCopiedPrompt ? <Check size={13} className="text-[var(--fg-success)]" /> : <Copy size={13} />}
                      <span className="hidden lg:inline">{dir === 'rtl' ? 'نسخ البرومبت' : 'Copy Prompt'}</span>
                    </button>
                  )}

                  <button
                    onClick={handleSaveToggle}
                    className={`p-2 rounded-lg border transition-theme flex items-center justify-center cursor-pointer shadow-md active:scale-95 ${
                      isSaved 
                        ? 'bg-rose-500/20 border-rose-500/40 text-rose-400' 
                        : 'bg-zinc-950/80 border-zinc-800 text-zinc-300 hover:text-rose-400 hover:border-rose-500/40'
                    }`}
                    title={isSaved ? (dir === 'rtl' ? 'محفوظة' : 'Saved') : (dir === 'rtl' ? 'حفظ' : 'Save')}
                  >
                    <Bookmark size={15} className={isSaved ? 'fill-current' : ''} />
                  </button>

                  <button
                    onClick={handleShare}
                    className={`p-2 rounded-lg border transition-theme flex items-center justify-center cursor-pointer shadow-md active:scale-95 ${
                      shareStatus === 'copied'
                        ? 'bg-accent/25 text-accent border-accent/45'
                        : 'bg-zinc-950/80 border-zinc-800 text-zinc-300 hover:text-accent hover:border-accent/40'
                    }`}
                    title={dir === 'rtl' ? 'مشاركة' : 'Share'}
                  >
                    <Share2 size={15} className={shareStatus === 'sharing' ? 'animate-pulse text-accent' : ''} />
                  </button>

                  <button
                    onClick={handleDownload}
                    className="p-2 rounded-lg bg-zinc-950/80 border border-zinc-800 text-zinc-300 hover:text-accent hover:border-accent/40 transition-theme flex items-center justify-center cursor-pointer shadow-md active:scale-95"
                    title={dir === 'rtl' ? 'تنزيل الصورة' : 'Download'}
                  >
                    <Download size={15} />
                  </button>

                  <button
                    onClick={handleOpenInBrowser}
                    className="p-2 rounded-lg bg-zinc-950/80 border border-zinc-800 text-zinc-300 hover:text-accent hover:border-accent/40 transition-theme flex items-center justify-center cursor-pointer shadow-md active:scale-95"
                    title={dir === 'rtl' ? 'فتح في علامة تبويب جديدة' : 'Open in New Tab'}
                  >
                    <ExternalLink size={15} />
                  </button>

                  <button
                    onClick={() => {
                      setIsPreviewOpen(false);
                      setZoomLevel(1);
                    }}
                    className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 hover:border-rose-500/50 transition-theme flex items-center justify-center cursor-pointer shadow-md active:scale-95"
                    title={dir === 'rtl' ? 'إغلاق (Esc)' : 'Close (Esc)'}
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* Main Stage: High-Resolution 1080x1080 Canvas Container */}
              <div 
                className="w-full flex-1 flex items-center justify-center relative p-2 sm:p-4 overflow-hidden"
                onClick={() => {
                  setIsPreviewOpen(false);
                  setZoomLevel(1);
                }}
              >
                <motion.div
                  initial={{ scale: 0.92, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.92, opacity: 0 }}
                  transition={{ type: 'spring', damping: 30, stiffness: 260 }}
                  className="relative max-w-[min(92vw,1080px)] max-h-[min(76vh,1080px)] flex items-center justify-center bg-black/90 rounded-2xl border border-zinc-800/90 shadow-[0_25px_80px_-15px_rgba(0,0,0,0.95)] overflow-hidden"
                  onClick={(e) => {
                    e.stopPropagation();
                    setZoomLevel(prev => (prev === 1 ? 2 : 1));
                  }}
                  style={{
                    cursor: zoomLevel > 1 ? 'zoom-out' : 'zoom-in'
                  }}
                >
                  <img
                    src={cleanUrl}
                    alt={alt || "Perplexta Art High Resolution"}
                    referrerPolicy="no-referrer"
                    className="max-w-full max-h-[min(76vh,1080px)] object-contain select-none transition-transform duration-300 ease-out"
                    style={{
                      transform: `scale(${zoomLevel})`,
                      transformOrigin: 'center center'
                    }}
                  />

                  {/* Corner indicator badge inside canvas */}
                  <div className="absolute bottom-3 left-3 bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-md border border-white/10 text-[9px] font-mono text-zinc-400 pointer-events-none opacity-80 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-[4px] bg-accent" />
                    <span>{selectedRatio === '1:1' ? '1080 × 1080 PRO' : `${selectedRatio} RES`}</span>
                  </div>
                </motion.div>
              </div>

              {/* Bottom Footer Info Strip: Prompt & Retention Notice */}
              <div 
                className="w-full max-w-4xl flex flex-col items-center gap-2 z-30"
                onClick={(e) => e.stopPropagation()}
              >
                {alt && alt !== 'Generated Image' && alt !== 'Perplexta Art Output' && alt !== 'صورة مولدة' && (
                  <div className="w-full px-4 py-2.5 rounded-xl bg-zinc-900/90 backdrop-blur-xl border border-zinc-800/90 text-zinc-300 shadow-xl flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-mono uppercase tracking-widest text-accent font-bold mb-0.5">
                        {dir === 'rtl' ? 'نص البرومبت' : 'PROMPT'}
                      </div>
                      <p className="text-[12px] font-sans text-zinc-200 line-clamp-2 leading-relaxed selection:bg-accent selection:text-white">
                        {alt}
                      </p>
                    </div>
                    <button
                      onClick={handleCopyPrompt}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white border border-zinc-700/80 transition-theme text-[11px] font-semibold cursor-pointer active:scale-95"
                      title={dir === 'rtl' ? 'نسخ البرومبت' : 'Copy Prompt'}
                    >
                      {isCopiedPrompt ? <Check size={13} className="text-[var(--fg-success)]" /> : <Copy size={13} />}
                      <span className="hidden sm:inline">{dir === 'rtl' ? 'نسخ' : 'Copy'}</span>
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-2 px-3 py-1 rounded-[4px] bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-medium tracking-wide">
                  <Clock size={12} className="shrink-0 text-amber-400" />
                  <span>
                    {dir === 'rtl' 
                      ? 'يتم حفظ مخرجات الوسائط لمدة 48 ساعة فقط على الخادم. يُرجى حفظ وتنزيل أعمالك.' 
                      : 'Media outputs are retained on the server for 48 hours only. Please download your work.'}
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};

const MarkdownImg = React.memo((props: any) => {
  const src = props.src || '';
  const isVideo = src.endsWith('.mp4') || src.endsWith('.webm') || src.endsWith('.mov') || src.includes('/video/') || (props.alt && (props.alt.includes('فيديو') || props.alt.includes('Video')));
  if (isVideo) {
    return <MarkdownVideo {...props} />;
  }
  return (
    <ShareableImageOutput 
      src={props.src} 
      alt={props.alt} 
      {...props} 
    />
  );
});

const MarkdownVideo = React.memo((props: any) => (
  <VideoPlaybackComponent 
    src={props.src} 
    alt={props.alt || "Generated Video"}
    {...props} 
  />
));

const SimpleVideoLoadingPlaceholder = ({ dir, aspectRatio = '9:16' }: { dir: 'ltr' | 'rtl'; aspectRatio?: string }) => {
  const containerAspectClass = ASPECT_RATIO_CLASSES[aspectRatio] || 'aspect-[9/16] max-w-[280px] sm:max-w-[320px]';

  return (
    <div className="w-full flex flex-col my-3 items-start gap-3">
      {/* Top Assistant Status Message */}
      <div className="flex items-center gap-2 text-zinc-300 dark:text-zinc-200 text-sm font-medium">
        <span>{dir === 'rtl' ? 'جارٍ إنشاء الفيديو الخاص بك...' : 'Creating your video...'}</span>
        <motion.span
          animate={{
            opacity: [0.35, 1, 0.35],
            scale: [0.9, 1.15, 0.9],
            rotate: [0, 8, -8, 0]
          }}
          transition={{
            duration: 2.2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="inline-flex text-accent select-none"
        >
          ✨
        </motion.span>
      </div>

      {/* Modern Shaded Canvas Placeholder */}
      <div 
        className={`relative overflow-hidden rounded-2xl border border-zinc-700/50 dark:border-zinc-800/90 bg-[#1e1e21] dark:bg-[#18181b] ${containerAspectClass} w-full shadow-xl flex items-center justify-center`}
      >
        {/* Soft breathing center radial aura */}
        <motion.div 
          animate={{
            scale: [0.85, 1.15, 0.85],
            opacity: [0.2, 0.45, 0.2]
          }}
          transition={{
            duration: 3.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute w-56 h-56 rounded-[4px] bg-gradient-to-tr from-accent/20 via-purple-500/10 to-transparent blur-3xl pointer-events-none"
        />

        {/* Shimmer sweep effect across the dark card */}
        <motion.div
          animate={{
            x: dir === 'rtl' ? ['150%', '-150%'] : ['-150%', '150%']
          }}
          transition={{
            duration: 2.6,
            repeat: Infinity,
            ease: "easeInOut",
            repeatDelay: 0.4
          }}
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent skew-x-12 pointer-events-none"
        />
      </div>
    </div>
  );
};

const SimpleVideoErrorPlaceholder = ({ dir, errorMessage, onRetry, aspectRatio = '9:16' }: { dir: 'ltr' | 'rtl'; errorMessage?: string; onRetry?: () => void; aspectRatio?: string }) => {
  const containerAspectClass = ASPECT_RATIO_CLASSES[aspectRatio] || 'aspect-[9/16] max-w-[280px] sm:max-w-[320px]';

  return (
    <div className="w-full flex flex-col my-3 items-start gap-3">
      <div 
        className={`relative overflow-hidden rounded-2xl border border-rose-200 dark:border-rose-950/40 bg-rose-50/5 dark:bg-rose-950/10 ${containerAspectClass} w-full shadow-sm flex flex-col items-center justify-center p-6 text-center`}
      >
        <AlertTriangle className="text-rose-500 mb-3" size={24} />
        <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-1">
          {dir === 'rtl' ? 'تعذر إنتاج الفيديو' : 'Video synthesis failed'}
        </span>
        <span className="text-[10px] text-rose-500 font-medium break-words max-w-full leading-relaxed px-2">
          {errorMessage || (dir === 'rtl' ? 'حدث خطأ غير متوقع' : 'An unexpected error occurred')}
        </span>
        {onRetry && (
          <button 
            onClick={onRetry}
            className="mt-4 px-4 py-1.5 rounded-[4px] bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 text-[10px] font-bold tracking-wide flex items-center gap-1.5 hover:bg-rose-200 dark:hover:bg-rose-900/50 transition-colors"
          >
            <RefreshCw size={12} />
            {dir === 'rtl' ? 'إعادة المحاولة' : 'RETRY'}
          </button>
        )}
      </div>
    </div>
  );
};


const VideoPlaybackComponent = ({ src, dir: propDir, alt, title, ...props }: { src?: string; dir?: string; alt?: string; title?: string; [key: string]: any }) => {
  const { dir: contextDir } = useAppContext();
  const dir = propDir || contextDir || (document.documentElement.dir === 'rtl' ? 'rtl' : 'ltr');
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
      <div className="w-full flex flex-col my-4 items-start gap-3">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15 }}
          className={`relative group overflow-hidden rounded-2xl border border-zinc-700/50 dark:border-zinc-800/90 shadow-xl transition-theme ease-out hover:border-accent/40 w-full ${currentRatioClass} bg-black`}
        >
          {providerMeta.isValid && (
            <div className={`absolute top-3 ${dir === 'rtl' ? 'right-3' : 'left-3'} bg-zinc-950/70 backdrop-blur-md px-2 py-1 rounded-[3px] border border-accent/10 text-[8px] font-mono text-accent z-10 transition-theme hover:border-accent/30 flex items-center gap-1`}>
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-[4px] bg-accent opacity-75"></span>
                <span className="relative inline-flex rounded-[4px] h-1.5 w-1.5 bg-accent"></span>
              </span>
              <span>{providerMeta.label}</span>
            </div>
          )}

          {cleanDisplayUrl && (
            <video 
              key={cleanDisplayUrl}
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
          )}

          {!isVideoLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/95 pointer-events-none z-20">
              <div className="flex flex-col items-center gap-2.5">
                <Loader2 size={24} className="animate-spin text-accent " />
                <span className="text-[10px] font-sans font-medium text-zinc-400 tracking-wide">
                  {dir === 'rtl' ? 'جاري التحميل...' : 'Loading video...'}
                </span>
              </div>
            </div>
          )}

          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/35 transition-theme pointer-events-none" />

          <div 
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-auto cursor-pointer"
          >
            <div className="w-12 h-12 rounded-[4px] bg-zinc-950/80 backdrop-blur-md border border-zinc-800/80 hover:border-accent/40 flex items-center justify-center text-accent hover:text-accent hover:scale-110 active:scale-95 transition-theme shadow-[0_0_20px_rgba(0,0,0,0.6)]">
              {isPlaying ? <Pause size={18} className="fill-accent-400/20" /> : <Play size={18} className="fill-accent-400/20 ml-0.5" />}
            </div>
          </div>

          <div className="absolute bottom-0 inset-x-0 h-1 bg-zinc-900/40 backdrop-blur-xs z-10 overflow-hidden pointer-events-none">
            <div 
              className="h-full bg-accent shadow-[0_0_8px_rgba(156,163,175,0.6)] transition-theme" 
              style={{ width: `${progress}%` }}
            />
          </div>

          <div 
            className="absolute inset-x-0 bottom-0 p-3.5 bg-gradient-to-t from-black/90 via-black/45 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-300 flex justify-between items-center backdrop-blur-[2px] z-10"
          >
            <div onClick={handleSeek} className="absolute top-0 inset-x-0 h-1.5 bg-zinc-850 cursor-pointer overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="h-full bg-accent" style={{ width: `${progress}%` }} />
            </div>

            <div className="flex items-center gap-1.5 font-mono text-[9px] text-gray-400">
              <span className="text-gray-200">{currentTime.toFixed(0)}s</span>
              <span>/</span>
              <span>{duration ? `${duration.toFixed(0)}s` : '5s'}</span>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={toggleMute}
                className="w-8 h-8 rounded-[4px] bg-zinc-900 border border-zinc-805 text-gray-200 hover:text-accent hover:border-accent/35 hover:bg-zinc-800 transition-theme flex items-center justify-center cursor-pointer active:scale-95 shadow-md"
                title={isMuted ? (dir === 'rtl' ? 'إلغاء الكتم' : 'Unmute') : (dir === 'rtl' ? 'كتم الصوت' : 'Mute')}
              >
                {isMuted ? <VolumeX size={13} className="text-gray-400" /> : <Volume2 size={13} />}
              </button>
              <button 
                onClick={() => setIsPreviewOpen(true)}
                className="w-8 h-8 rounded-[4px] bg-zinc-900 border border-zinc-805 text-gray-200 hover:text-accent hover:border-accent/35 hover:bg-zinc-800 transition-theme flex items-center justify-center cursor-pointer active:scale-95 shadow-md"
                title={dir === 'rtl' ? 'ملء الشاشة' : 'Fullscreen'}
              >
                <Maximize2 size={13} />
              </button>
              <button 
                onClick={handleShare}
                className={`w-8 h-8 rounded-[4px] border flex items-center justify-center cursor-pointer transition-theme shadow-md active:scale-95 ${
                  shareStatus === 'copied' 
                    ? 'bg-accent/25 text-accent border-accent/45 hover:bg-accent/35' 
                    : 'bg-zinc-900 border border-zinc-805 hover:text-accent hover:border-accent/35 hover:bg-zinc-800 text-gray-200'
                }`}
                title={dir === 'rtl' ? 'مشاركة' : 'Share'}
              >
                <Share2 size={13} className={shareStatus === 'sharing' ? 'animate-pulse text-accent' : ''} />
              </button>
              <button 
                onClick={handleDownload}
                className="w-8 h-8 rounded-[4px] bg-zinc-900 border border-zinc-805 text-gray-200 hover:text-accent hover:border-accent/35 hover:bg-zinc-800 transition-theme flex items-center justify-center cursor-pointer active:scale-95 shadow-md"
                title={dir === 'rtl' ? 'تنزيل' : 'Download'}
              >
                <Download size={13} />
              </button>
            </div>
          </div>
        </motion.div>

        <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-[11px] font-medium leading-relaxed w-full max-w-[360px] my-1">
          <Clock size={14} className="shrink-0 text-amber-500 mt-0.5" />
          <span>
            {dir === 'rtl' 
              ? 'ملاحظة: يتم حفظ ملفات الصور والفيديو على الخادم لمدة 48 ساعة فقط. يُرجى تنزيل أو حفظ صورك وفيديوهاتك المهمة على جهازك.' 
              : 'Notice: Media files are retained on the server for 48 hours only. Please download or save your important media to your device.'}
          </span>
        </div>
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
                  <span className="text-[11px] font-bold text-accent/90 tracking-widest uppercase font-mono">
                    {dir === 'rtl' ? 'عرض السينما الفائقة من بيربليكستا' : 'PERPLEXTA CINEMATIC PRO PREVIEW'}
                  </span>
                  <span className="text-[10px] text-gray-400 font-medium font-sans">
                    {dir === 'rtl' ? 'مخرجات آلة توليد الفيديو المتكاملة بدقة ووضوح فائقين' : 'Engineered high-fidelity video production container'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDownload}
                    className="w-10 h-10 rounded-[4px] bg-zinc-900/80 border border-zinc-800 text-gray-200 hover:text-accent hover:border-accent/40 hover:bg-zinc-800/90 transition-theme flex items-center justify-center cursor-pointer shadow-lg active:scale-95"
                    title={dir === 'rtl' ? 'تنزيل' : 'Download'}
                  >
                    <Download size={15} />
                  </button>
                  <button
                    onClick={handleShare}
                    className="w-10 h-10 rounded-[4px] bg-zinc-900/80 border border-zinc-800 text-gray-200 hover:text-accent hover:border-accent/40 hover:bg-zinc-800/90 transition-theme flex items-center justify-center cursor-pointer shadow-lg active:scale-95"
                    title={dir === 'rtl' ? 'مشاركة' : 'Share'}
                  >
                    <Share2 size={15} />
                  </button>
                  <button
                    onClick={() => setIsPreviewOpen(false)}
                    className="w-10 h-10 rounded-[4px] bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 hover:border-rose-500/45 transition-theme flex items-center justify-center cursor-pointer shadow-lg active:scale-95"
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
                  {cleanDisplayUrl && (
                    <video
                      key={cleanDisplayUrl}
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
                  )}

                  <div 
                    onClick={togglePreviewPlay}
                    className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-300 cursor-pointer"
                  >
                    <div className="w-16 h-16 rounded-[4px] bg-zinc-950/80 backdrop-blur-md border border-zinc-850/80 flex items-center justify-center text-accent shadow-2xl">
                      {isPreviewPlaying ? <Pause size={24} className="fill-accent-400/25" /> : <Play size={24} className="fill-accent-400/25 ml-1" />}
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
                    className="w-8 h-8 rounded-[4px] bg-zinc-800 hover:bg-zinc-700/80 border border-zinc-700/60 text-accent hover:text-accent flex items-center justify-center active:scale-95 transition-theme"
                    title={isPreviewPlaying ? (dir === 'rtl' ? 'إيقاف' : 'Pause') : (dir === 'rtl' ? 'تشغيل' : 'Play')}
                  >
                    {isPreviewPlaying ? <Pause size={13} className="fill-accent-400/10" /> : <Play size={13} className="fill-accent-400/10 ml-0.5" />}
                  </button>

                  <button
                    onClick={togglePreviewMute}
                    className="w-8 h-8 rounded-[4px] bg-zinc-800 hover:bg-zinc-700/80 border border-zinc-700/60 text-accent hover:text-accent flex items-center justify-center active:scale-95 transition-theme"
                    title={isPreviewMuted ? (dir === 'rtl' ? 'إلغاء كتم الصوت' : 'Unmute') : (dir === 'rtl' ? 'كتم الصوت' : 'Mute')}
                  >
                    {isPreviewMuted ? <VolumeX size={13} className="text-zinc-500" /> : <Volume2 size={13} />}
                  </button>
                </div>

                <div 
                  onClick={handlePreviewSeek} 
                  className="flex-1 h-1.5 bg-zinc-950/80 rounded-[4px] cursor-pointer relative overflow-hidden"
                >
                  <div 
                    className="h-full bg-accent transition-theme shadow-[0_5px_10px_rgba(156,163,175,0.3)]" 
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
    <div className="relative group/bq transition-theme my-4 p-4 rounded-[4px] border border-accent/15 bg-accent/[0.02] dark:bg-accent/[0.01]">
      <div className={`absolute top-2 ${dir === 'rtl' ? 'left-2' : 'right-2'} opacity-100 sm:opacity-0 sm:group-hover/bq:opacity-100 transition-opacity duration-300 flex items-center gap-1 z-10 pointer-events-auto`}>
        <button
          onClick={handleCopy}
          className="w-8 h-8 flex items-center justify-center rounded-[4px] bg-transparent border border-transparent hover:bg-gray-50 dark:hover:bg-gray-800 transition-theme text-gray-400 hover:text-accent hover: cursor-pointer"
          title={dir === 'rtl' ? 'نسخ النص' : 'Copy Text'}
        >
          {copied ? <Check size={14} className="text-accent  animate-pulse" /> : <Copy size={14} />}
        </button>
        <button
          onClick={handleApply}
          className="w-8 h-8 flex items-center justify-center rounded-[4px] bg-transparent border border-transparent hover:bg-gray-50 dark:hover:bg-gray-800 transition-theme text-gray-400 hover:text-accent hover: cursor-pointer"
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
  const { dir, resolvedTheme } = useAppContext();
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const lang = match ? match[1] : 'text';
  const codeContent = String(children).trim();

  const [sandboxMode, setSandboxMode] = useState(false);
  const [editableCode, setEditableCode] = useState(codeContent);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [outputLogs, setOutputLogs] = useState<{ type: 'log' | 'info' | 'warn' | 'error'; text: string; time: string }[]>([]);
  const [iframeSrc, setIframeSrc] = useState<string | null>(null);

  const lineCount = useMemo(() => editableCode.split('\n').length, [editableCode]);

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
        const isDark = resolvedTheme === 'dark';
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
                  <button class="demo-button" style="padding: 0.5rem 1rem; border-radius: 4px; border: none; font-weight: bold; background-color: #334155; color: white;">Button One</button>
                  <button class="demo-button outline" style="padding: 0.5rem 1rem; border-radius: 4px; border: 1px solid #334155; font-weight: bold; background-color: transparent; color: #334155; margin-left: 0.5rem;">Button Two</button>
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
    <div className="relative group mx-auto my-6 w-full max-w-[850px] bg-transparent border border-gray-200/40 dark:border-gray-800/20 rounded-md shadow-sm transition-theme">
      <div className="sticky top-0 z-20 flex items-center justify-between px-4 py-2 bg-gray-50/95 dark:bg-[#141416]/95 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-800/50 rounded-t-md transition-theme">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-[4px] bg-accent shadow-[0_0_8px_rgba(156,163,175,0.5)]" />
          <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{lang === 'audio' ? 'Perplexta Audio Slate' : lang}</span>
        </div>

        <div className="flex items-center gap-2">
          {isExecutable && (
            <div className="hidden md:flex items-center bg-gray-100 dark:bg-gray-800/50 p-0.5 rounded-[4px] border border-gray-200/20 dark:border-gray-700/20 shadow-inner mr-2">
              <button
                onClick={() => { setSandboxMode(false); handleStop(); }}
                className={`px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wider rounded-sm transition-theme ${!sandboxMode ? 'bg-[var(--bg-secondary)] text-accent shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
              >
                {dir === 'rtl' ? 'مصدر الكود' : 'Source Code'}
              </button>
              <button
                onClick={() => { setSandboxMode(true); }}
                className={`px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wider rounded-sm transition-theme ${sandboxMode ? 'bg-[var(--bg-secondary)] text-accent shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
              >
                {dir === 'rtl' ? 'بيئة الاختبار' : 'Interactive Sandbox'}
              </button>
            </div>
          )}

          <div className="flex items-center gap-1 transition-theme">
            {isMediaUrl ? (
              <button onClick={() => downloadFile(children)} className="p-1.5 rounded-sm text-[var(--text-muted)] hover:text-accent transition-theme hover:bg-[var(--bg-overlay)] active:scale-95" title="Download">
                <Download size={13} />
              </button>
            ) : (
              <>
                {lineCount > 20 && (
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="w-9 h-9 flex items-center justify-center rounded-sm text-[var(--text-muted)] hover:text-accent transition-theme hover:bg-[var(--bg-overlay)] active:scale-95"
                    title={isExpanded ? (dir === 'rtl' ? 'طي الكود' : 'Collapse code') : (dir === 'rtl' ? 'توسيع الكود' : 'Expand code')}
                  >
                    {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                  </button>
                )}
                <button 
                  onClick={copyToClipboard} 
                  className="relative w-9 h-9 flex items-center justify-center rounded-sm text-[var(--text-muted)] hover:text-accent transition-theme hover:bg-[var(--bg-overlay)] active:scale-95" 
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
                        className="text-accent "
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
                    <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-accent text-white text-[10px] px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap font-sans pointer-events-none">
                      {dir === 'rtl' ? 'تم النسخ!' : 'Copied!'}
                    </span>
                  )}
                </button>
                <button 
                  onClick={() => window.dispatchEvent(new CustomEvent('insert_to_prompt', { detail: editableCode }))}
                  className="w-9 h-9 flex items-center justify-center rounded-sm text-[var(--text-muted)] hover:text-accent transition-theme hover:bg-[var(--bg-overlay)] active:scale-95 cursor-pointer"
                  title={dir === 'rtl' ? 'تطبيق كأمر للدردشة' : 'Apply as Chat Prompt'}
                >
                  <Send size={14} className={dir === 'rtl' ? 'transform -scale-x-100' : ''} />
                </button>
                <button onClick={downloadCode} className="w-9 h-9 flex items-center justify-center rounded-sm text-[var(--text-muted)] hover:text-accent transition-theme hover:bg-[var(--bg-overlay)] active:scale-95" title="Download source code">
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
          transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden bg-[#0a0a0b] border border-[var(--border-main)] rounded-b-lg p-8 flex flex-col items-center gap-6 shadow-2xl"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-gray-500/10 to-transparent pointer-events-none" />

          <div className="relative">
             <div className="absolute inset-0 bg-accent/20 blur-2xl rounded-[4px]" />
             <div className="relative w-20 h-20 rounded-[4px] bg-accent/10 border border-accent/30 flex items-center justify-center text-accent shadow-[0_0_30px_rgba(156,163,175,0.1)]">
                  <Volume2 size={32} />
             </div>
          </div>

          <div className="text-center space-y-1">
            <h3 className="text-xs font-black text-accent tracking-[0.2em] uppercase">Perplexta Orchestra Master</h3>
            <p className="text-[10px] text-[var(--text-secondary)] font-medium tracking-widest leading-none">
              {dir === 'rtl' ? 'الإنتاج الأوركسترالي الحصري' : 'EXCLUSIVE ORCHESTRAL PRODUCTION'}
            </p>
          </div>

          <audio 
            controls 
            src={codeContent} 
            className="w-full max-w-md accent-accent h-10 custom-audio-player" 
          />

          <button 
            onClick={() => downloadFile(codeContent)}
            className="flex items-center gap-2 px-8 py-3 bg-accent text-white hover:bg-accent rounded-sm text-[11px] font-black uppercase tracking-[0.1em] transition-theme active:scale-95 shadow-[0_10px_25px_rgba(156,163,175,0.3)] group-hover:shadow-[0_15px_35px_rgba(156,163,175,0.4)]"
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
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-[4px] bg-accent/10 hover:bg-accent/20 text-accent border border-accent/30 hover: transition-theme disabled:opacity-50"
                  >
                    {isRunning ? (
                      <Loader2 size={13} className="animate-spin text-accent" />
                    ) : (
                      <Play size={13} className="fill-accent stroke-accent-500" />
                    )}
                    <span>{dir === 'rtl' ? 'تنفيذ برمجياً' : 'Run Sandbox'}</span>
                  </button>

                  <button
                    onClick={handleReset}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-[4px] hover:bg-gray-100 dark:hover:bg-gray-800 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-theme border border-transparent"
                  >
                    <RefreshCw size={12} />
                    <span>{dir === 'rtl' ? 'إعادة التعيين' : 'Reset'}</span>
                  </button>

                  {isPlaying && (
                    <button
                      onClick={handleStop}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-[4px] hover:bg-red-500/10 text-red-500 hover:text-red-600 transition-theme border border-transparent"
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
                        className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold rounded-[4px] hover:bg-accent/10 text-[var(--text-muted)] hover:text-accent transition-theme border border-transparent"
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
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="border-t border-gray-100 dark:border-gray-800/40 overflow-hidden"
                  >
                    {['html', 'css'].includes(lang.toLowerCase()) ? (
                      <div className="p-4 bg-gray-50/10 dark:bg-black/20">
                        <div className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2 select-none flex items-center justify-between">
                          <span>{dir === 'rtl' ? 'معاينة النتيجة التفاعلية' : 'LIVE COMPONENT INTERFACE'}</span>
                          <span className="flex h-1.5 w-1.5 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-[4px] bg-accent opacity-75"></span>
                            <span className="relative inline-flex rounded-[4px] h-1.5 w-1.5 bg-accent"></span>
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
                            className="text-gray-600 hover:text-accent transition-theme"
                            title="Clear Logs"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>

                        <div className="space-y-1.5 max-h-[250px] overflow-y-auto custom-scrollbar">
                          {outputLogs.map((log, lidx) => (
                            <div key={`out-log-${lidx}-${log.time || ''}`} className={`flex items-start gap-2.5 leading-relaxed py-0.5 border-b border-gray-900/10 ${
                              log.type === 'error' ? 'text-red-400 bg-red-950/20 px-2 rounded-sm' :
                              log.type === 'warn' ? 'text-amber-400 bg-amber-950/20 px-2 rounded-sm' :
                              log.type === 'info' ? 'text-accent bg-accent/10 px-2 rounded-sm' : 'text-gray-300'
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
                    <div className="w-16 h-16 rounded-[4px] bg-accent/20 flex items-center justify-center text-accent">
                      <Music size={32} />
                    </div>
                    <span className="text-sm font-bold text-accent tracking-widest uppercase">Sonic Draft Ready</span>
                    <audio controls src={codeContent} className="w-full max-w-md accent-accent" />
                  </div>
                ) : (
                  <img src={codeContent} alt="Generated" className="max-w-full rounded-md mx-auto" referrerPolicy="no-referrer" />
                )}
              </div>
            ) : (
              <div 
                className={`w-full overflow-x-auto bg-[#0c0c0e] text-[#f8f8f2] border-t border-gray-100/10 dark:border-gray-800/20 rounded-b-md select-text custom-scrollbar animate-fade-in transition-all duration-300 ${
                  isExpanded ? 'max-h-none overflow-y-visible' : 'max-h-[520px] overflow-y-auto'
                }`} 
                style={{ direction: 'ltr', textAlign: 'left' }}
                {...props}
              >
                <div className="flex items-start min-w-max md:min-w-full">
                  <div className="sticky left-0 z-10 flex select-none flex-col text-right text-[#5c5c62] py-5 pl-4 pr-3.5 border-r border-gray-100/10 dark:border-gray-800/20 font-mono text-[13px] md:text-[14px] leading-relaxed shrink-0 bg-[#0a0a0c]" style={{ userSelect: 'none' }}>
                    {Array.from({ length: lineCount || 1 }, (_, i) => (
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
      colorClass: 'text-accent ',
      bgClass: 'bg-accent/10 border-accent/20'
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
        colorClass: 'text-accent ',
        bgClass: 'bg-accent/10 border-accent/20'
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
        label: t('learning') || (dir === 'rtl' ? 'تعليم' : 'Education'),
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
        colorClass: 'text-accent ',
        bgClass: 'bg-accent/10 border-accent/20'
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
        colorClass: 'text-accent ',
        bgClass: 'bg-accent/10 border-accent/20'
      };
  }
};

const ToolStatusIndicator = ({ tool, isGenerating, dir, t }: { tool?: string, isGenerating: boolean, dir: 'ltr' | 'rtl', t: any }) => {
  const details = getToolDetails(tool, dir, t);
  const Icon = details.icon;

  return (
    <div className={`flex items-center gap-2.5 mb-5 w-fit select-none bg-gray-50/50 dark:bg-[#1a1a1c]/20 border border-gray-100/60 dark:border-gray-800/20 px-3 py-1.5 rounded-[4px] shadow-sm backdrop-blur-[2px] flex-row`}>
      <div className={`relative flex items-center justify-center w-6.5 h-6.5 rounded-[4px] border border-transparent transition-theme ${details.bgClass}`}>
        {isGenerating ? (
          <>
            <motion.div 
              className="absolute inset-0 rounded-[4px] bg-accent/20 blur-sm"
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
              <span className="animate-ping absolute inline-flex h-full w-full rounded-[4px] bg-accent opacity-75"></span>
              <span className="relative inline-flex rounded-[4px] h-1.5 w-1.5 bg-accent"></span>
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

const ThinkingSteps = ({ steps, dir, query }: { steps: Message['thinking_steps'], dir: 'ltr' | 'rtl', query?: string }) => {
  if (!steps || steps.length === 0) return null;

  return (
    <div className="mb-4 sm:mb-6 space-y-2 sm:space-y-3" id="thinking-steps-container">
      <div className="flex items-center gap-2 mb-2 sm:mb-4 opacity-70">
         <div className="w-1 h-3 sm:w-1.5 sm:h-4 bg-accent/60 rounded-[4px]" />
         <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">
           {dir === 'rtl' ? 'مراحل التحليل والبحث' : 'ANALYSIS & RESEARCH PHASES'}
         </span>
      </div>
      <div className="space-y-1 sm:space-y-2 ps-2.5 sm:ps-5 border-s-2 border-accent/10 ml-0.5 sm:ml-2">
        {steps.map((step, idx) => (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: idx * 0.05, duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            key={`step-${step.step || idx}-${idx}`} 
            className="flex items-center gap-2 sm:gap-4 group"
          >
            {step.status === 'completed' ? (
              <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-sm bg-accent/5 flex items-center justify-center text-accent/70">
                <Check size={10} strokeWidth={3} />
              </div>
            ) : step.status === 'processing' ? (
              <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-sm bg-accent/5 flex items-center justify-center">
                <Loader2 size={10} className="animate-spin text-accent/60" style={{ animationDuration: '2s' }} />
              </div>
            ) : (
              <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-sm bg-[var(--bg-surface)] border border-[var(--border)] flex items-center justify-center">
                <div className="w-1 h-1 rounded-[4px] bg-[var(--text-muted)]" />
              </div>
            )}
            <span className={`text-[10px] sm:text-[12px] font-medium ${step.status === 'completed' ? 'text-[var(--text-secondary)]' : 'text-[var(--text-muted)]/60'} transition-theme truncate`}>
              <HighlightText text={step.step} query={query} />
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
              key={`cit-link-${i}-${part}`}
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
      <React.Fragment key={`cit-frag-${depth}-${index}`}>
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
      className="flex items-center gap-3.5 p-2.5 rounded-md hover:bg-accent/[0.03] dark:hover:bg-accent/[0.02] transition-theme group min-w-0 cursor-pointer border-b border-[var(--border-main)]/30 dark:border-zinc-800/20 last:border-0"
    >
      <div className="flex-shrink-0">
        <div 
          className="w-7 h-7 rounded-[4px] flex items-center justify-center border border-[var(--border-main)]/60 bg-white dark:bg-zinc-900 shadow-sm transition-theme group-hover:scale-105 group-hover:border-accent/20"
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
          <div className="w-4 h-4 rounded-[4px] bg-accent/10 flex items-center justify-center text-[9px] font-black text-accent shrink-0 group-hover:bg-accent group-hover:text-white transition-theme">
            {cite.index || (idx + 1)}
          </div>
          <span className="text-[11px] font-semibold text-[var(--text-primary)] truncate group-hover:text-accent transition-theme group-hover:">
            <HighlightText text={displayTitle} query={query} />
          </span>
          <ExternalLink size={10} className="text-[var(--text-muted)] group-hover:text-accent transition-theme shrink-0 opacity-0 group-hover:opacity-100 transform translate-x-[-2px] group-hover:translate-x-0" />
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
            className="w-12 h-8 object-cover rounded border border-[var(--border-main)]/60 bg-zinc-100 dark:bg-zinc-800 shadow-sm group-hover:border-accent/30 transition-theme"
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
        className="inline-flex items-center gap-1.5 px-2 py-0.5 mx-0.5 rounded bg-accent/[0.04] dark:bg-accent/[0.02] border border-accent/15 hover:border-accent/35 hover:bg-accent/[0.08] transition-theme text-accent font-semibold no-underline text-[12px] align-middle shadow-sm hover: cursor-pointer"
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
        <div className="absolute z-[9999] bottom-full left-1/2 -translate-x-1/2 mb-2 w-[280px] p-3 bg-white dark:bg-zinc-950 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.15)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.42)] border border-[var(--border-main)] dark:border-zinc-800 flex flex-col gap-2 pointer-events-none transition-theme">
          <div className="flex items-start gap-2 min-w-0">
            <div className="w-5.5 h-5.5 rounded overflow-hidden bg-zinc-100 dark:bg-zinc-900 flex-shrink-0 flex items-center justify-center border border-[var(--border-main)]/40 text-accent">
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
        className="inline-flex items-center justify-center w-4 h-4 rounded-[4px] transition-theme transform hover:scale-110 cursor-pointer overflow-hidden border border-transparent hover:border-accent/20"
      >
        <span 
          className="w-3.5 h-3.5 flex items-center justify-center shrink-0 text-gray-400 group-hover/cite:text-accent group-hover/cite: transition-theme"
          style={{ color: brand ? brand.color : 'inherit' }}
        >
          {brand ? brand.icon("w-3.5 h-3.5 rounded-[4px]") : <img src={favicon} className="w-3.5 h-3.5 object-contain rounded-[4px] bg-white dark:bg-zinc-805" alt="" />}
        </span>
      </a>

      {showTooltip && (displayTitle || displayDesc) && (
        <div className="absolute z-[9999] bottom-full left-1/2 -translate-x-1/2 mb-2 w-[280px] p-3 bg-white dark:bg-zinc-950 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.15)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.42)] border border-[var(--border-main)] dark:border-zinc-800 flex flex-col gap-2 pointer-events-none transition-theme">
          <div className="flex items-start gap-2 min-w-0">
            <div className="w-5.5 h-5.5 rounded overflow-hidden bg-zinc-100 dark:bg-zinc-900 flex-shrink-0 flex items-center justify-center border border-[var(--border-main)]/40 text-accent">
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
        className="flex items-center gap-2.5 px-3.5 py-1.5 rounded bg-transparent border border-[var(--border-main)] hover:border-accent/30 hover:bg-accent/5 transition-theme group shadow-sm active:scale-95 cursor-pointer"
      >
        <div className="flex -space-x-1.5 rtl:space-x-reverse">
          {citations.slice(0, 3).map((cite, i) => {
            const rawUrl = cite.url || cite.link || '';
            const cleanUrl = getCleanUrl(rawUrl);
            const brand = getPlatformBrand(cleanUrl);
            return (
              <div 
                key={`cit-prev-${cleanUrl || i}-${i}`} 
                className="w-5 h-5 rounded-[4px] bg-white dark:bg-zinc-800 border border-[var(--border)] flex items-center justify-center overflow-hidden shadow-sm z-[10]"
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
        <span className="text-[11px] font-black text-[var(--text-secondary)] group-hover:text-accent transition-theme uppercase tracking-wider">
          {citations.length} {dir === 'rtl' ? 'مصادر موثقة' : 'Verified Sources'}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          className="text-[var(--text-muted)] group-hover:text-accent transition-theme"
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
            transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="pt-3 max-w-full flex flex-col gap-1">
              {citations.map((cite, idx) => (
                <CitationRow 
                  key={`cit-row-${cite.url || idx}-${idx}`} 
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
    <div className="mt-5 pt-4 border-t border-[var(--border-main)]/40" id="follow-ups-container" dir={dir}>
      <div className="flex flex-col gap-2">
        {followUps.map((q, idx) => (
          <button
            key={`follow-up-${idx}-${q.slice(0, 15)}`}
            onClick={() => onSelect(q)}
            id={`follow-up-${idx}`}
            className="group flex items-center justify-between gap-3 px-4 py-3 sm:py-3.5 bg-[var(--surface-subtle)]/40 hover:bg-[var(--surface-subtle)] border border-[var(--border-main)]/40 hover:border-accent/40 rounded-xl transition-all duration-200 text-start cursor-pointer w-full text-[var(--text-primary)] shadow-xs"
          >
            <span className="text-[13px] sm:text-[14px] font-medium text-[var(--text-primary)] group-hover:text-accent transition-colors flex-1 min-w-0 leading-relaxed">
              {q}
            </span>
            <div className="shrink-0 text-[var(--text-muted)] group-hover:text-accent rtl:group-hover:-translate-x-1 ltr:group-hover:translate-x-1 transition-all duration-200">
              {dir === 'rtl' ? (
                <CornerDownLeft size={16} className="transition-transform" />
              ) : (
                <CornerDownRight size={16} className="transition-transform" />
              )}
            </div>
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

  const [isLyriaGenerating, setIsLyriaGenerating] = useState(false);
  const [lyriaPrompt, setLyriaPrompt] = useState(() => {
    const cleaned = (body || '').replace(/\[.*?\]/g, '').replace(/[#*`_]/g, '').trim();
    return cleaned || 'مقطوعة موسيقية ملحمية بطابع شرقي مميز';
  });
  const [lyriaLyrics, setLyriaLyrics] = useState('');
  const [lyriaLyricsResponse, setLyriaLyricsResponse] = useState('');
  const [isLyriaActive, setIsLyriaActive] = useState(false);
  const [lyriaError, setLyriaError] = useState<string | null>(null);
  const [isLyriaPanelExpanded, setIsLyriaPanelExpanded] = useState(false);

  const [generatedAudioBase64, setGeneratedAudioBase64] = useState<string | null>(null);
  const [generatedAudioMime, setGeneratedAudioMime] = useState<string | null>(null);
  const [isSavingTrack, setIsSavingTrack] = useState(false);
  const [isTrackSaved, setIsTrackSaved] = useState(false);

  const handleGenerateLyria = async () => {
    setIsLyriaGenerating(true);
    setLyriaError(null);
    setGeneratedAudioBase64(null);
    setGeneratedAudioMime(null);
    setIsTrackSaved(false);
    try {
      const token = secureStorage.getSync('token');
      const response = await fetch('/api/tools/generate-music', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          prompt: lyriaPrompt || 'Beautiful epic orchestral track',
          lyrics: lyriaLyrics
        })
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(dir === 'rtl' ? (data.error_ar || data.error) : data.error);
      }
      
      const binary = atob(data.audioBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: data.mimeType || 'audio/wav' });
      const url = URL.createObjectURL(blob);
      
      setAudioUrl(url);
      setIsPlaying(false);
      setStatus('ready');
      setCurrentTime(0);
      setDuration(60);
      setIsLyriaActive(true);
      setGeneratedAudioBase64(data.audioBase64);
      setGeneratedAudioMime(data.mimeType);
      if (data.lyrics) {
        setLyriaLyricsResponse(data.lyrics);
      }
      toast.success(dir === 'rtl' ? 'تم توليد الموسيقى بالذكاء الاصطناعي بنجاح!' : 'AI Music generated successfully!');
    } catch (err: any) {
      console.error('Lyria generation failed:', err);
      setLyriaError(err.message || 'Failed to generate AI music.');
      toast.error(err.message || 'Failed to generate AI music.');
    } finally {
      setIsLyriaGenerating(false);
    }
  };

  const handleSaveTrackToLibrary = async () => {
    if (!generatedAudioBase64) return;
    setIsSavingTrack(true);
    try {
      const token = secureStorage.getSync('token');
      const response = await fetch('/api/tools/save-music', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          audioBase64: generatedAudioBase64,
          mimeType: generatedAudioMime,
          prompt: lyriaPrompt,
          lyrics: lyriaLyricsResponse || lyriaLyrics
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save track.');
      }

      setIsTrackSaved(true);
      toast.success(dir === 'rtl' ? 'تم حفظ المقطوعة بنجاح في مكتبة ملفاتك!' : 'Track successfully saved to your storage library!');
    } catch (err: any) {
      console.error('[SaveTrack] Error:', err);
      toast.error(err.message || 'Failed to save track.');
    } finally {
      setIsSavingTrack(false);
    }
  };

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

      <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-accent/15 shadow-2xl bg-black">
        {coverImageUrl ? (
          <img 
            src={coverImageUrl} 
            className={`w-full h-full object-cover opacity-50 transition-transform duration-700 ${isPlaying ? 'scale-105' : 'scale-100'}`} 
            referrerPolicy="no-referrer" 
            alt="Orchestra Cover" 
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#0b0c10] via-gray-950 to-black flex items-center justify-center">
             <Music className={`text-accent/10 transition-transform duration-1000 ${isPlaying ? 'rotate-6 scale-110' : ''}`} size={140} />
          </div>
        )}

        {}
        <div className={`absolute top-4 ${dir === 'rtl' ? 'right-4' : 'left-4'} flex flex-col gap-1 z-10`}>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] bg-black/60 backdrop-blur-md border border-white/10 text-[9px] font-black tracking-widest text-accent">
            <span className="w-1.5 h-1.5 rounded-[4px] bg-accent animate-ping" />
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
                  className="w-20 h-20 rounded-[4px] border-2 border-t-accent-500 border-r-accent-500/30 border-b-accent-500/10 border-l-transparent shadow-[0_0_30px_rgba(156,163,175,0.15)]" 
                />
                <div className="absolute w-14 h-14 rounded-[4px] bg-accent/10 border border-accent/20 flex items-center justify-center backdrop-blur-sm">
                  <span className="text-[11px] font-mono font-black text-accent">
                    {progressPercent}%
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-center text-center">
                <span className="text-[11px] font-black text-accent uppercase tracking-widest animate-pulse leading-none mb-1">
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
                className="w-20 h-20 rounded-[4px] bg-accent/20 backdrop-blur-md border-2 border-accent/40 hover:border-accent hover:bg-accent/30 text-accent shadow-[0_0_40px_rgba(156,163,175,0.25)] flex items-center justify-center hover:scale-105 active:scale-95 cursor-pointer transition-theme"
                title={isPlaying ? (dir === 'rtl' ? 'إيقاف مؤقت' : 'Pause') : (dir === 'rtl' ? 'تشغيل' : 'Play')}
              >
                {isPlaying ? (
                  <Pause size={30} className="fill-accent text-accent " />
                ) : (
                  <Play size={30} className="ml-1.5 fill-accent text-accent " />
                )}
              </button>

              <div className="text-center px-6">
                <h4 className="text-sm font-black text-white tracking-[0.2em] uppercase mb-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                  {dir === 'rtl' ? 'تحفة الأوركسترا من بيربليكستا' : 'PERPLEXTA ORCHESTRA MASTERPIECE'}
                </h4>
                <p className="text-[9px] text-accent font-black tracking-widest uppercase">
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
                  key={`audio-vis-bar-${i}`}
                  style={{ height: `${scaleVal}px` }}
                  className="w-1 bg-accent/70 rounded-[4px] transition-theme shadow-[0_0_8px_rgba(156,163,175,0.4)]"
                />
              );
            } else if (status === 'rendering' || status === 'idle') {

              return (
                <motion.div 
                  key={`audio-vis-motion-${i}`}
                  animate={{ 
                    height: [4, 18 + Math.sin(i * 0.5) * 10, 4] 
                  }}
                  transition={{ 
                    duration: 1.5, 
                    repeat: Infinity, 
                    ease: "easeInOut",
                    delay: i * 0.05 
                  }}
                  className="w-1 bg-accent/60 rounded-[4px] shadow-[0_0_8px_rgba(156,163,175,0.3)]"
                />
              );
            } else {

              scaleVal = 4 + Math.sin(i * 0.3) * 3;
              return (
                <div 
                  key={`audio-vis-idle-${i}`}
                  style={{ height: `${scaleVal}px` }}
                  className="w-1 bg-accent/40 rounded-[4px] transition-theme shadow-[0_0_4px_rgba(156,163,175,0.1)]"
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
            className="flex-1 h-2 relative rounded-[4px] bg-gray-200 dark:bg-gray-800 overflow-hidden cursor-pointer group"
          >
            <div 
              style={{ width: `${(currentTime / mixDuration) * 100}%` }}
              className="absolute left-0 top-0 h-full bg-accent rounded-[4px] shadow-[0_0_10px_rgba(156,163,175,0.7)]"
            />
            {}
            <div 
              style={{ left: `calc(${(currentTime / mixDuration) * 100}% - 4px)` }}
              className="absolute top-0 w-2 h-2 rounded-[4px] bg-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
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
              className="w-10 h-10 rounded-[4px] bg-transparent border border-transparent transition-theme hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-center text-gray-400 hover:text-accent hover:"
              title={isMuted ? (dir === 'rtl' ? 'إلغاء كتم الصوت' : 'Unmute') : (dir === 'rtl' ? 'كتم الصوت' : 'Mute')}
            >
              <Volume2 size={16} className={isMuted ? 'text-gray-500 line-through' : 'text-accent hover:'} />
            </button>

            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-16 sm:w-24 h-1 rounded-lg accent-accent bg-gray-200 dark:bg-gray-700 cursor-pointer"
            />
          </div>

          {}
          <div className="hidden sm:flex flex-col text-center">
            <span className="text-[10px] text-[#334155] font-[#334155]  font-bold uppercase tracking-widest leading-none">
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
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-[4px] bg-accent/10 border border-accent/20 text-[10px] font-black uppercase text-accent hover:bg-accent hover:text-white transition-theme group/down shadow-md"
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
      <div className={`w-full px-5 py-4 rounded-md border flex flex-col gap-4 transition-theme ${
        theme === 'dark' 
          ? 'bg-[#151518]/95 border-gray-800/40 shadow-xl' 
          : 'bg-white border-gray-200/65 shadow-sm'
      }`}>
        <div className="flex items-center justify-between border-b border-gray-200/65 dark:border-gray-800/45 pb-3">
          <div className="flex items-center gap-2">
            <div className="relative">
              <span className="absolute inset-0 bg-accent rounded-[4px] blur-[6px] opacity-15 animate-pulse" />
              <Sliders size={16} className="text-accent relative " />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-accent uppercase tracking-widest leading-none mb-1">
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
            className="text-[10px] font-black text-[var(--text-muted)] hover:text-accent hover: uppercase tracking-wider transition-colors pt-1"
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
                  className={`border-2 border-dashed rounded-md p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-theme ${
                    uploadedFile 
                      ? 'border-accent/30 bg-accent/[0.02]' 
                      : isDragging 
                        ? 'border-accent bg-accent/[0.04]' 
                        : 'border-gray-300 dark:border-gray-800/80 hover:border-accent/40 hover:bg-accent/[0.01]'
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
                      <div className="flex items-center gap-2 text-accent">
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
                        className="mt-1.5 px-2 py-1 rounded-[3px] bg-red-500/10 border border-red-500/20 text-[9px] font-black text-red-400 hover:bg-red-500 hover:text-white transition-theme uppercase"
                      >
                        {dir === 'rtl' ? 'إزالة الملف' : 'REMOVE TRACK'}
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Paperclip 
                        size={18} 
                        className={`transition-theme ${
                          isDragging ? 'text-accent ' : 'text-gray-400'
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
                      <Sparkles size={11} className="text-accent" />
                      {dir === 'rtl' ? 'قناة الذكاء الاصطناعي (مورث)' : 'AI Synthesized Stem'}
                    </span>
                    <span className="font-mono text-accent font-bold">
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
                    className="w-full h-1.5 rounded-lg accent-accent bg-gray-200 dark:bg-gray-800 cursor-pointer disabled:opacity-50"
                  />
                </div>

                {}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="font-bold text-[var(--text-primary)] flex items-center gap-1">
                      <Paperclip size={11} className={uploadedFile ? 'text-accent' : 'text-gray-500'} />
                      {dir === 'rtl' ? 'القناة المضافة الخارجية' : 'External Companion Stem'}
                    </span>
                    <span className={`font-mono font-bold ${uploadedFile ? 'text-accent' : 'text-gray-500'}`}>
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
                    className="w-full h-1.5 rounded-lg accent-accent bg-gray-200 dark:bg-gray-800 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {}
            <div className="flex items-center gap-2 px-3 py-2 rounded bg-black/5 dark:bg-white/[0.02] border border-gray-200/50 dark:border-gray-800/30 text-[10px] text-[var(--text-muted)] font-medium leading-normal">
              <div className="w-1.5 h-1.5 rounded-[4px] bg-accent animate-pulse shrink-0" />
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

      {/* Google Lyria AI Music Generator Panel */}
      <div className={`w-full px-5 py-4 rounded-md border flex flex-col gap-4 transition-theme ${
        theme === 'dark' 
          ? 'bg-[#151518]/95 border-gray-800/40 shadow-xl' 
          : 'bg-white border-gray-200/65 shadow-sm'
      }`}>
        <div className="flex items-center justify-between border-b border-gray-200/65 dark:border-gray-800/45 pb-3">
          <div className="flex items-center gap-2">
            <div className="relative">
              <span className="absolute inset-0 bg-accent rounded-[4px] blur-[6px] opacity-15 animate-pulse" />
              <Music size={16} className="text-accent relative " />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-accent uppercase tracking-widest leading-none mb-1">
                {dir === 'rtl' ? 'توليد الموسيقى الذكي عبر Google Lyria' : 'GOOGLE LYRIA AI MUSIC GENERATOR'}
              </span>
              <h5 className="text-[12px] font-bold text-[var(--text-primary)] leading-none">
                {dir === 'rtl' ? 'إنتاج مقاطع موسيقية حقيقية بالذكاء الاصطناعي' : 'Generate Real Professional Music and Audio Tracks'}
              </h5>
            </div>
          </div>

          <button 
            type="button"
            onClick={() => setIsLyriaPanelExpanded(!isLyriaPanelExpanded)}
            className="text-[10px] font-black text-[var(--text-muted)] hover:text-accent hover: uppercase tracking-wider transition-colors pt-1"
          >
            {isLyriaPanelExpanded 
              ? (dir === 'rtl' ? 'إغلاق اللوحة' : 'CLOSE STUDIO') 
              : (dir === 'rtl' ? 'افتح أستوديو التوليد' : 'OPEN AI STUDIO')}
          </button>
        </div>

        {isLyriaPanelExpanded && (
          <div className="flex flex-col gap-4 animate-fadeIn">
            {/* Prompt input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                {dir === 'rtl' ? 'المطالبة الصوتية الإبداعية' : 'SONIC PROMPT INSTRUCTIONS'}
              </label>
              <textarea
                value={lyriaPrompt}
                onChange={(e) => setLyriaPrompt(e.target.value)}
                placeholder={dir === 'rtl' ? 'مثال: معزوفة عود هادئة مع قانون وإيقاع شرقي كلاسيكي...' : 'e.g. A serene acoustic guitar track with soft violin ambient backing...'}
                className="w-full min-h-[70px] rounded-[4px] border border-gray-200 dark:border-gray-800 bg-transparent py-2.5 px-3 text-xs focus:outline-none focus:border-accent transition-colors leading-relaxed"
              />
            </div>

            {/* Lyrics input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                  {dir === 'rtl' ? 'الكلمات المرافقة (اختياري)' : 'SONG LYRICS (OPTIONAL)'}
                </label>
                <textarea
                  value={lyriaLyrics}
                  onChange={(e) => setLyriaLyrics(e.target.value)}
                  placeholder={dir === 'rtl' ? 'اكتب كلمات الأغنية ليقوم الذكاء الاصطناعي بغنائها أو دمجها...' : 'Write lyrics for the AI model to sing or voice...'}
                  className="w-full min-h-[50px] rounded-[4px] border border-gray-200 dark:border-gray-800 bg-transparent py-2.5 px-3 text-xs focus:outline-none focus:border-accent transition-colors leading-relaxed"
                />
              </div>

            {/* Error display */}
            {lyriaError && (
              <div className="p-3 rounded-[4px] border border-red-500/20 bg-red-500/5 text-red-400 text-xs flex items-center gap-2">
                <AlertTriangle size={14} className="shrink-0" />
                <span>{lyriaError}</span>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex justify-end gap-2 mt-1">
              {generatedAudioBase64 && (
                <button
                  type="button"
                  onClick={handleSaveTrackToLibrary}
                  disabled={isSavingTrack || isTrackSaved}
                  className={`py-2.5 px-4 rounded-[4px] border border-accent/30 bg-accent/10 text-accent font-bold text-[11px] uppercase tracking-wider flex items-center justify-center gap-2 transition-theme hover:bg-accent/20 disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isSavingTrack ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>{dir === 'rtl' ? 'جاري الحفظ...' : 'SAVING...'}</span>
                    </>
                  ) : isTrackSaved ? (
                    <>
                      <Check size={13} className="text-accent" />
                      <span>{dir === 'rtl' ? 'تم الحفظ في مكتبتك' : 'SAVED TO LIBRARY'}</span>
                    </>
                  ) : (
                    <>
                      <Download size={13} />
                      <span>{dir === 'rtl' ? 'حفظ في مكتبة الملفات' : 'SAVE TO LIBRARY'}</span>
                    </>
                  )}
                </button>
              )}
              <button
                type="button"
                onClick={handleGenerateLyria}
                disabled={isLyriaGenerating || !lyriaPrompt.trim()}
                className={`py-2.5 px-5 rounded-[4px] bg-accent text-white font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 transition-theme hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(156,163,175,0.3)] hover:scale-[1.02] active:scale-[0.98] ${
                  isLyriaGenerating ? 'animate-pulse' : ''
                }`}
              >
                {isLyriaGenerating ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>{dir === 'rtl' ? 'جاري توليد اللحن الفني...' : 'ORCHESTRATING MUSIC...'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={13} className="drop-shadow-[0_0_4px_rgba(255,255,255,0.6)]" />
                    <span>{dir === 'rtl' ? 'توليد المسار الفني بالذكاء الاصطناعي' : 'GENERATE AI TRACK NOW'}</span>
                  </>
                )}
              </button>
            </div>

            {/* Generated Lyrics section */}
            {lyriaLyricsResponse && (
              <div className="mt-2 p-4 rounded-[4px] border border-accent/10 bg-accent/[0.01] flex flex-col gap-1.5">
                <span className="text-[10px] font-black text-accent uppercase tracking-widest">{dir === 'rtl' ? 'كلمات الأغنية المولدة من الذكاء الاصطناعي' : 'AI GENERATED LYRICS & TRANSCRIPT'}</span>
                <p className="text-xs text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap font-sans italic">
                  {lyriaLyricsResponse}
                </p>
              </div>
            )}
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
            key={`canon-${canon.id}-${idx}`}
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
            } ${isPending ? 'opacity-85 border-dashed border-accent/20 bg-accent/[0.01]' : ''}`}
          >
            {}
            <div className={`px-8 py-6 border-b flex items-center justify-between ${
              theme === 'dark' ? 'border-[var(--border)] bg-[var(--bg-surface)]' : 'border-[var(--border)] bg-[var(--bg-base)]'
            }`}>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-accent rounded-[4px] blur-md opacity-20" />
                  <div className={`relative w-2 h-8 rounded-[4px] shadow-[0_0_15px_rgba(156,163,175,0.4)] ${isPending ? 'bg-amber-500/50 animate-pulse' : 'bg-accent'}`} />
                </div>
                <div className="flex flex-col">
                  <span className={`text-[10px] font-black uppercase tracking-[0.3em] mb-0.5 ${isPending ? 'text-amber-500' : 'text-accent glow-accent'}`}>
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
                     <div className={`w-1.5 h-1.5 rounded-[4px] ${isPending ? 'bg-amber-400' : 'bg-accent'} animate-pulse shadow-[0_0_8px_rgba(156,163,175,0.8)]`} />
                     <span className={`text-[10px] font-black uppercase ${isPending ? 'text-amber-400' : 'text-accent'}`}>
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
                        <div className="flex items-center gap-2 text-xs font-bold text-accent animate-pulse justify-center">
                          <span className="w-1.5 h-1.5 rounded-[4px] bg-accent animate-ping" />
                          <span>{dir === 'rtl' ? canon.pendingTextAr : canon.pendingTextEn}</span>
                        </div>
                      </div>
                    ) : (

                      <div className="space-y-3">
                        <div className="h-4 bg-accent/5 rounded-md w-3/4 animate-pulse border border-accent/10" />
                        <div className="h-4 bg-accent/5 rounded-md w-1/2 animate-pulse border border-accent/10" />
                        <div className="h-4 bg-accent/5 rounded-md w-5/6 animate-pulse border border-accent/10" />
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
                        <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-accent/20 shadow-2xl group/video">
                          <img {...props} className="w-full h-full object-cover transition-transform duration-300 group-hover/video:scale-110" referrerPolicy="no-referrer" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-center justify-center">
                             <div className="w-20 h-20 rounded-[4px] bg-accent/20 backdrop-blur-md border border-accent/30 flex items-center justify-center text-accent animate-pulse">
                               <Music size={40} />
                             </div>
                          </div>
                          <div className="absolute top-4 right-4 px-3 py-1 bg-black/60 backdrop-blur-md rounded-[4px] border border-white/10 text-[10px] font-bold text-white uppercase tracking-widest">
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
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 blur-[80px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent/3 blur-[100px] pointer-events-none" />
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
          <LayoutGrid size={12} className="text-accent" />
          {dir === 'rtl' ? 'تم توليد الحزمة عبر محرك بيربليكستا الإبداعي' : 'GENERATED VIA PERPLEXTA CREATIVE ENGINE'}
        </div>
      </motion.div>
    </div>
  );
};

export const SystemInactiveCard = ({ data, dir }: { data: any, dir: 'rtl' | 'ltr' }) => (
  <motion.div 
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
    className={`mt-4 p-6 rounded-lg border border-accent/20 bg-accent/[0.02] backdrop-blur-sm self-stretch flex flex-col gap-4 relative overflow-hidden`}
  >
    <div className="absolute top-0 right-0 p-4 opacity-5">
      <Settings size={64} className="text-accent" />
    </div>

    <div className="flex items-start gap-4 relative z-10">
      <div className="w-12 h-12 rounded-md bg-accent/10 flex items-center justify-center text-accent shadow-[0_0_15px_rgba(156,163,175,0.2)]">
        <Settings size={24} className="animate-spin-slow" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-accent font-sans shadow-sm">
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

export const QuotaExceededCard = ({ data, dir, t, navigate, user, tool }: { data: any, dir: 'rtl' | 'ltr', t?: any, navigate: any, user: any, tool?: string }) => {
  const [copied, setCopied] = useState(false);
  const { triggerUpgradePrompt, economySettings } = useAppContext();
  const referralLink = `${window.location.origin}/?ref=${user?.referral_code || user?.id || 'elite'}`;
  const minDeposit = economySettings?.referral_activation_min_deposit || 10;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success(
      dir === 'rtl' 
        ? 'تم نسخ رابط الإحالة الخاص بك بنجاح!' 
        : 'Referral link copied to clipboard successfully!'
    );
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
      className={`mt-4 p-5 rounded-lg border border-accent/20 bg-accent/[0.03] backdrop-blur-sm self-stretch flex flex-col gap-4 relative overflow-hidden group`}
    >
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <Sparkles size={48} className="text-accent" />
      </div>

      <div className="flex items-start gap-4 relative z-10">
        <div className="w-12 h-12 rounded-md bg-accent/10 flex items-center justify-center text-accent shadow-[0_0_15px_rgba(156,163,175,0.2)]">
          <Zap size={24} className="animate-pulse" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-accent">Premium Upgrade Required</span>
          </div>
          <p className="text-[14px] font-bold text-[var(--text-primary)] leading-relaxed mb-1">
            {dir === 'rtl' ? data.error_ar : data.error}
          </p>
          <div className="flex items-center gap-4 mt-3">
             <div className="flex flex-col">
               <span className="text-[9px] font-black uppercase text-[var(--text-muted)] mb-0.5 tracking-tighter">{dir === 'rtl' ? 'الحد المتاح' : 'Available Limit'}</span>
               <span className="text-xs font-black text-accent">{data.limit}</span>
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
      {user?.referral_activated ? (
        <div className="relative z-10 bg-[var(--bg-overlay)] border border-accent/10 rounded-md p-3 flex items-center gap-3">
          <div className="flex-1 truncate text-[10px] font-mono text-[var(--text-muted)]">
            {referralLink}
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleCopy}
              className="w-10 h-10 flex items-center justify-center rounded-sm bg-accent/10 hover:bg-accent/20 text-accent transition-theme"
              title="Copy Link"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
            <button 
              onClick={handleShare}
              className="w-10 h-10 flex items-center justify-center rounded-sm bg-accent text-white hover:bg-accent transition-theme shadow-lg shadow-none"
              title="Share"
            >
              <Share2 size={16} />
            </button>
          </div>
        </div>
      ) : (
        <div className="relative z-10 bg-[var(--bg-overlay)] border border-amber-500/10 rounded-md p-3.5 flex flex-col md:flex-row items-center justify-between gap-3 text-center md:text-left">
          <div className="flex-1">
            <span className="text-[10px] font-extrabold text-amber-500 uppercase tracking-widest block mb-1">
              {dir === 'rtl' ? 'مطلوب تفعيل نظام الأرباح' : 'Earnings Activation Required'}
            </span>
            <p className="text-[10px] text-[var(--text-secondary)] font-medium leading-relaxed">
              {dir === 'rtl' 
                ? `للوصول إلى رابط الإحالة الخاص بك وكسب المكافآت، يرجى تفعيل حساب الإحالات عبر إيداع حد أدنى بقيمة $${minDeposit}.` 
                : `To obtain your referral link and earn rewards, please activate your referral account with an initial deposit of $${minDeposit}.`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/rewards')}
            className="px-3.5 py-2 whitespace-nowrap rounded-[4px] bg-amber-500/10 border border-amber-500/20 text-amber-500 hover:bg-amber-500 hover:text-white font-extrabold text-[10px] uppercase tracking-wider transition-theme"
          >
            {dir === 'rtl' ? `إيداع $${minDeposit} وتفعيل الأرباح` : `Deposit $${minDeposit} to Activate`}
          </button>
        </div>
      )}

      <div className="flex items-center gap-3 mt-1 relative z-10">
        <button 
          onClick={() => navigate('/subscription')}
          className="flex-1 bg-accent hover:bg-accent text-white py-3 rounded-sm text-[11px] font-black uppercase tracking-wider transition-theme shadow-[0_10px_20px_rgba(156,163,175,0.3)] hover:translate-y-[-2px] active:translate-y-0"
        >
          {dir === 'rtl' ? 'ترقية الخطة الآن' : 'Upgrade Plan Now'}
        </button>
        <button 
          onClick={() => navigate('/rewards')}
          className="flex-1 bg-[var(--bg-surface)] border border-accent/20 hover:bg-accent/5 text-accent py-3 rounded-sm text-[11px] font-black uppercase tracking-wider transition-theme hover:translate-y-[-2px] active:translate-y-0"
        >
          {dir === 'rtl' ? 'صفحة المكافآت' : 'Rewards Page'}
        </button>
      </div>
    </motion.div>
  );
};

export const InsufficientFundsCard = ({ data, dir, t, navigate, user }: { data: any, dir: 'rtl' | 'ltr', t?: any, navigate: any, user: any }) => {
  const [copied, setCopied] = useState(false);
  const { triggerUpgradePrompt, economySettings } = useAppContext();
  const referralLink = `${window.location.origin}/?ref=${user?.referral_code || user?.id || 'elite'}`;
  const minDeposit = economySettings?.referral_activation_min_deposit || 10;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success(
      dir === 'rtl' 
        ? 'تم نسخ رابط الإحالة الخاص بك بنجاح!' 
        : 'Referral link copied to clipboard successfully!'
    );
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

      {user?.referral_activated ? (
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
              className="w-10 h-10 flex items-center justify-center rounded-sm bg-red-500 text-white hover:bg-accent transition-theme shadow-lg shadow-red-500/20"
              title="Share"
            >
              <Share2 size={16} />
            </button>
          </div>
        </div>
      ) : (
        <div className="relative z-10 bg-[var(--bg-overlay)] border border-amber-500/10 rounded-md p-3.5 flex flex-col md:flex-row items-center justify-between gap-3 text-center md:text-left">
          <div className="flex-1">
            <span className="text-[10px] font-extrabold text-amber-500 uppercase tracking-widest block mb-1">
              {dir === 'rtl' ? 'مطلوب تفعيل نظام الأرباح' : 'Earnings Activation Required'}
            </span>
            <p className="text-[10px] text-[var(--text-secondary)] font-medium leading-relaxed">
              {dir === 'rtl' 
                ? `للوصول إلى رابط الإحالة الخاص بك وكسب المكافآت، يرجى تفعيل حساب الإحالات عبر إيداع حد أدنى بقيمة $${minDeposit}.` 
                : `To obtain your referral link and earn rewards, please activate your referral account with an initial deposit of $${minDeposit}.`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/rewards')}
            className="px-3.5 py-2 whitespace-nowrap rounded-[4px] bg-amber-500/10 border border-amber-500/20 text-amber-500 hover:bg-amber-500 hover:text-white font-extrabold text-[10px] uppercase tracking-wider transition-theme"
          >
            {dir === 'rtl' ? `إيداع $${minDeposit} وتفعيل الأرباح` : `Deposit $${minDeposit} to Activate`}
          </button>
        </div>
      )}

      <div className="flex items-center gap-3 mt-1 relative z-10">
        <button 
          onClick={() => {
            if (triggerUpgradePrompt) {
              triggerUpgradePrompt('wallet');
            } else {
              navigate('/settings/wallet');
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

export const ChatPage: React.FC = () => {
  const { 
    t, theme, dir, user, token, setIsAuthModalOpen, socket, isMobile,
    siteSettings, isAuthReady,
    refreshUser, balance, balanceUSD, economySettings, triggerMemoryNotification, triggerUpgradePrompt, plans
  } = useAppContext();
  const { id: routeChatId } = useParams();
  const navigate = useNavigate();
  const [query, setQuery] = useState(() => {
    return secureStorage.getSync('draft_query') || '';
  });
  const [isFocused, setIsFocused] = useState(false);
  const [selectedModel, setSelectedModel] = useState<'fast' | 'thinking' | 'pro'>(() => {
    return (secureStorage.getSync('last_active_model') as any) || 'fast';
  });
  const [selectedTool, setSelectedTool] = useState<string>(() => {
    return secureStorage.getSync('last_active_tool') || 'chat';
  });

  const prevUserRef = useRef<any>(user);
  useEffect(() => {
    if (user && !prevUserRef.current) {
      setSelectedTool('chat');
      setSelectedModel('fast');
      secureStorage.set('last_active_tool', 'chat');
      secureStorage.set('last_active_model', 'fast');
    }
    if (!user && prevUserRef.current) {
      setSelectedTool('chat');
      setSelectedModel('fast');
      secureStorage.set('last_active_tool', 'chat');
      secureStorage.set('last_active_model', 'fast');
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
  const [isAdvancedToolsOpen, setIsAdvancedToolsOpen] = useState(() => {
    return secureStorage.getSync('perplexta_advanced_tools_open') === 'true';
  });
  const [forensicMode, setForensicMode] = useState(() => {
    return secureStorage.getSync('perplexta_forensic_mode') === 'true';
  });
  const [isAnalyzingForensic, setIsAnalyzingForensic] = useState(false);
  const [forensicReport, setForensicReport] = useState<any | null>(null);
  const [isForensicModalOpen, setIsForensicModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareMsgContent, setShareMsgContent] = useState('');
  const [shareMsgTitle, setShareMsgTitle] = useState('');
  const [shareMsgModel, setShareMsgModel] = useState('');
  const [isGeneratingShare, setIsGeneratingShare] = useState(false);
  const [generatedShareId, setGeneratedShareId] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isChatMessagesLoading, setIsChatMessagesLoading] = useState<boolean>(() => {
    try {
      if (!routeChatId || routeChatId === 'new') return false;
      const cached = secureStorage.getSync(`perplexta_chat_messages_${routeChatId}`);
      return !cached;
    } catch {
      return false;
    }
  });
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

  // Service Worker Background Sync & Reconnection Auto-Dispatch
  useEffect(() => {
    const cleanup = initBackgroundSyncListener(async (queuedItem: QueuedChatMessage) => {
      if (queuedItem && queuedItem.content) {
        if (queuedItem.chatId && routeChatId !== queuedItem.chatId) {
          navigate(`/chat/${queuedItem.chatId}`);
        }
        await handleSendOrStop(queuedItem.content);
        return true;
      }
      return false;
    });

    return () => {
      cleanup();
    };
  }, [routeChatId, navigate]);

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
  const { isWriting, startWriting, resetWriting } = useTypingDebounce({
    delay: 3000,
  });
  const [isRecording, setIsRecording] = useState(false);
  const [interimText, setInterimText] = useState('');
  const recognitionRef = useRef<any>(null);

  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const activeId = routeChatId && routeChatId !== 'new' ? routeChatId : secureStorage.getSync('last_chat_id');
      const cached = activeId ? secureStorage.getSync(`perplexta_chat_messages_${activeId}`) : null;
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [chatId, setChatId] = useState<string | null>(routeChatId && routeChatId !== 'new' ? routeChatId : null);

  const lastAssistantMessage = useMemo(() => {
    return [...messages].reverse().find(m => m.role === 'assistant')?.content;
  }, [messages]);

  const lastUserQuery = useMemo(() => {
    return [...messages].reverse().find(m => m.role === 'user')?.content;
  }, [messages]);

  const { suggestions: aiSuggestions } = useFollowUpSuggestions(lastAssistantMessage, lastUserQuery);

  useEffect(() => {
    if (chatId) {
      try {
        secureStorage.set(`perplexta_chat_messages_${chatId}`, JSON.stringify(messages));
      } catch {}
    }
  }, [messages, chatId]);

  const hasActiveSub = !user || !!(user.subscription && user.subscription.status === 'active') || (balance > 0 || balanceUSD > 0) || !isAuthReady;
  const isInputDisabled = !!(user && (!user.subscription || user.subscription.status !== 'active') && (balance <= 0 && balanceUSD <= 0) && isAuthReady);

  useEffect(() => {
    if (!query) {
      secureStorage.set('draft_query', '');
      return;
    }

    const handler = setTimeout(() => {
      secureStorage.set('draft_query', query);
    }, 500); 

    return () => {
      clearTimeout(handler);
    };
  }, [query]);

  useEffect(() => {
    secureStorage.set('last_active_model', selectedModel);
  }, [selectedModel]);

  useEffect(() => {
    secureStorage.set('last_active_tool', selectedTool);
  }, [selectedTool]);

  useEffect(() => {
    secureStorage.set('perplexta_advanced_tools_open', String(isAdvancedToolsOpen));
  }, [isAdvancedToolsOpen]);

  useEffect(() => {
    secureStorage.set('perplexta_forensic_mode', String(forensicMode));
  }, [forensicMode]);

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

      const authToken = token || secureStorage.getSync('app_token');
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

  const [videoSettings, setVideoSettings] = useState(() => {
    const saved = typeof window !== 'undefined' ? secureStorage.getSync('perplexta_video_aspect_ratio') : null;
    return {
      aspectRatio: saved || '1:1'
    };
  });
  const [imageSettings, setImageSettings] = useState(() => {
    const saved = typeof window !== 'undefined' ? secureStorage.getSync('perplexta_image_aspect_ratio') : null;
    return {
      aspectRatio: saved || '1:1',
      quality: 'HD',
      style: 'Cinematic'
    };
  });
  const [isAspectBarCollapsed, setIsAspectBarCollapsed] = useState(() => {
    return typeof window !== 'undefined' && secureStorage.getSync('perplexta_aspect_bar_collapsed') === 'true';
  });
  const [audioSettings, setAudioSettings] = useState({
    mood: 'Epic',
    duration: 30,
    format: 'wav',
    vocalType: 'Instrumental'
  });

  // Sync user media preferences from Core Database
  useEffect(() => {
    const authToken = token || (typeof window !== 'undefined' ? secureStorage.getSync('app_token') : null);
    if (!authToken) return;

    fetch('/api/users/media-preferences', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.preferences) {
          if (data.preferences.image?.aspectRatio) {
            setImageSettings(prev => ({ ...prev, aspectRatio: data.preferences.image.aspectRatio }));
            secureStorage.set('perplexta_image_aspect_ratio', data.preferences.image.aspectRatio);
          }
          if (data.preferences.video?.aspectRatio) {
            setVideoSettings(prev => ({ ...prev, aspectRatio: data.preferences.video.aspectRatio }));
            secureStorage.set('perplexta_video_aspect_ratio', data.preferences.video.aspectRatio);
          }
        }
      })
      .catch(err => {
        console.warn('[MediaPreferences] Failed to fetch saved media preferences:', err.message);
      });
  }, [token]);

  // Strict aspect ratio selector with immediate application & persistence
  const handleSelectAspectRatio = (ratio: string) => {
    const isVideo = selectedTool === 'video';
    const mediaType = isVideo ? 'video' : 'image';

    if (isVideo) {
      setVideoSettings(prev => ({ ...prev, aspectRatio: ratio }));
      secureStorage.set('perplexta_video_aspect_ratio', ratio);
    } else {
      setImageSettings(prev => ({ ...prev, aspectRatio: ratio }));
      secureStorage.set('perplexta_image_aspect_ratio', ratio);
    }

    const authToken = token || (typeof window !== 'undefined' ? secureStorage.getSync('app_token') : null);
    if (authToken) {
      fetch('/api/users/media-preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          mediaType,
          aspectRatio: ratio,
          settings: isVideo ? { ...videoSettings, aspectRatio: ratio } : { ...imageSettings, aspectRatio: ratio }
        })
      }).catch(err => {
        console.warn('[MediaPreferences] Failed to save remote media preference:', err.message);
      });
    }

    toast.success(
      dir === 'rtl' 
        ? `تم تطبيق وحفظ أبعاد ${isVideo ? 'الفيديو' : 'الصورة'}: ${ratio}`
        : `Applied & saved ${isVideo ? 'video' : 'image'} ratio: ${ratio}`,
      { duration: 1800, id: 'aspect-ratio-applied' }
    );
  };

  useEffect(() => {
    const handleInsertToPrompt = (e: Event) => {
      const text = (e as CustomEvent).detail;
      if (text) {
        setQuery(text);
        resetWriting();
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.style.height = '30px';

          textareaRef.current.style.height = `${Math.max(30, Math.min(textareaRef.current.scrollHeight, 200))}px`;
        }
        toast.success(dir === 'rtl' ? 'تم نسخ البرومبت وتطبيقه في حقل الإدخال' : 'Prompt loaded directly into the input field!');
      }
    };
    window.addEventListener('insert_to_prompt', handleInsertToPrompt);
    return () => window.removeEventListener('insert_to_prompt', handleInsertToPrompt);
  }, [dir]);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const toolsMenuRef = useRef<HTMLDivElement>(null);
  const modelsMenuRef = useRef<HTMLDivElement>(null);
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
  const prevGeneratingRef = useRef(false);

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

  useEffect(() => {
    if (messages.length > 0 && !isGenerating) {
      scrollToBottom('auto');
    }
  }, [messages.length, chatId]);

  useEffect(() => {
    if (!isGenerating) {
      setIsOtherTyping(false);
      if (prevGeneratingRef.current && messages.length > 0) {
        const lastIdx = messages.length - 1;
        const targetId = `message-${lastIdx}`;
        setTimeout(() => {
          const el = document.getElementById(targetId);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 80);
      }
    }
    prevGeneratingRef.current = isGenerating;
  }, [isGenerating, messages.length]);

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingMessageIndex, setEditingMessageIndex] = useState<number | null>(() => { const cached = secureStorage.getSync(`draft_edit_index_${routeChatId || 'new'}`); return cached ? parseInt(cached, 10) : null; });
  const [editValue, setEditValue] = useState(() => secureStorage.getSync(`draft_edit_value_${routeChatId || 'new'}`) || '');
  const [showPinnedModal, setShowPinnedModal] = useState(false);
  const [copiedPromptIndex, setCopiedPromptIndex] = useState<number | null>(null);

  const handleCopyPrompt = (text: string, index: number) => {
    const cleanText = stripProtocolMarkers(text) || text;
    if (!cleanText) return;
    navigator.clipboard.writeText(cleanText);
    setCopiedPromptIndex(index);
    toast.success(dir === 'rtl' ? 'تم نسخ البرومبت بنجاح!' : 'Prompt copied to clipboard!');
    setTimeout(() => {
      setCopiedPromptIndex((prev) => (prev === index ? null : prev));
    }, 2000);
  };

  useEffect(() => {
    if (editingMessageIndex !== null) {
      secureStorage.set(`draft_edit_index_${routeChatId || 'new'}`, editingMessageIndex.toString());
      secureStorage.set(`draft_edit_value_${routeChatId || 'new'}`, editValue);
    } else {
      secureStorage.remove(`draft_edit_index_${routeChatId || 'new'}`);
      secureStorage.remove(`draft_edit_value_${routeChatId || 'new'}`);
    }
  }, [editingMessageIndex, editValue, routeChatId]);


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
      setInterimText('');
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
        let interimTranscript = '';
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        if (finalTranscript) {
          setQuery(prev => {
            const trimmed = prev.trim();
            const suffix = finalTranscript.trim();
            if (!suffix) return prev;
            return trimmed + (trimmed ? ' ' : '') + suffix;
          });
          if (textareaRef.current) {
             textareaRef.current.style.height = '30px';
             textareaRef.current.style.height = `${Math.max(30, Math.min(textareaRef.current.scrollHeight, 200))}px`;
          }
        }

        if (interimTranscript) {
          setInterimText(interimTranscript);
        } else {
          setInterimText('');
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'not-allowed') {
          toast.error(dir === 'rtl' ? 'يرجى السماح بالوصول إلى الميكروفون' : 'Please allow microphone access');
        }
        setIsRecording(false);
        setInterimText('');
      };

      recognition.onend = () => {
        setIsRecording(false);
        setInterimText('');
      };

      recognitionRef.current = recognition;
    }

    try {
      recognitionRef.current.lang = dir === 'rtl' ? 'ar-SA' : 'en-US';
      recognitionRef.current.start();
      setIsRecording(true);
      setInterimText('');
    } catch (err) {
      setIsRecording(false);
      setInterimText('');
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
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setIsExportMenuOpen(false);
      }
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(event.target as Node)) {
        setIsAdvancedToolsOpen(false);
      }
      if (modelsMenuRef.current && !modelsMenuRef.current.contains(event.target as Node)) {
        setIsModelMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
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
            <h1 style="margin: 0; font-size: 28px; color: #334155;">PERPLEXTA</h1>
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
          roleLabel.style.color = '#334155';

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
            .assistant { padding: 10px; margin-bottom: 10px; border-left: 3px solid #334155; }
            .label { font-weight: bold; color: #334155; font-size: 0.8em; }
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
      await ChatService.updateChatTitle(token || '', chatId, chatRenameTitle.trim());
      toast.success(dir === 'rtl' ? 'تم تغيير العنوان' : 'Title updated');
      window.dispatchEvent(new Event('chat-updated'));
      setIsRenaming(false);
    } catch (e: any) {
      toast.error(e.message || (dir === 'rtl' ? 'فشل تعديل اسم المحادثة' : 'Failed to update chat title'));
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
      await ChatService.deleteChat(token || '', chatId);
      // Removed toast notification for chat deletion
      window.dispatchEvent(new Event('chat-updated'));
      navigate('/chat');
    } catch (e: any) {
      // Removed error toast notification for chat deletion
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
      secureStorage.remove('last_chat_id');
    }
  }, [routeChatId, token, isAuthReady, isGenerating]);

  useEffect(() => {
    if (chatId) {
      secureStorage.set('last_chat_id', chatId);
    } else {
      secureStorage.remove('last_chat_id');
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
        setMessages(data.map((msg: any) => {
          const rawFollowUps = typeof msg.follow_ups === 'string' ? JSON.parse(msg.follow_ups) : msg.follow_ups;
          const clientParsed = extractFollowUpsClient(msg.content);
          return { 
            id: msg.id,
            role: msg.role, 
            content: clientParsed.cleanText || msg.content,
            tool: msg.tool,
            feedback: msg.feedback,
            is_pinned: msg.is_pinned,
            generation_time: msg.generation_time ? parseFloat(msg.generation_time) : undefined,
            thinking_steps: typeof msg.thinking_steps === 'string' ? JSON.parse(msg.thinking_steps) : msg.thinking_steps,
            citations: typeof msg.citations === 'string' ? JSON.parse(msg.citations) : msg.citations,
            follow_ups: (rawFollowUps && rawFollowUps.length > 0) ? rawFollowUps.map(formatActionableSuggestion) : clientParsed.followUps,
            created_at: msg.created_at
          };
        }));

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
      const clientParsed = extractFollowUpsClient(data.result || '');
      const finalFollowUps = (data.follow_ups && data.follow_ups.length > 0) ? data.follow_ups.map(formatActionableSuggestion) : clientParsed.followUps;
      const finalContent = clientParsed.cleanText || data.result;

      setMessages(prev => {
        const newMessages = [...prev];
        const lastMessage = newMessages[newMessages.length - 1];
        if (lastMessage && lastMessage.role === 'assistant') {
          newMessages[newMessages.length - 1] = {
            ...lastMessage,
            content: finalContent,
            tool: data.tool || lastMessage.tool,
            id: data.message_id || lastMessage.id,
            thinking_steps: data.thinking_steps || lastMessage.thinking_steps,
            citations: data.citations || lastMessage.citations,
            follow_ups: finalFollowUps || [],
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

    const onMemoryExtracted = (_data: any) => {};

    const onMemoryWarning = (_data: any) => {};

    const onMemoryCleanup = (_data: any) => {};

    const onMemoryConsolidation = (_data: any) => {};

    const getToolFriendlyNameLocal = (toolId: string, lang: 'en' | 'ar'): string => {
      const mapping: Record<string, { en: string; ar: string }> = {
        'chat': { en: 'Strategic Assistant', ar: 'المساعد الاستراتيجي' },
        'chat_fast': { en: 'Fast Technical AI', ar: 'الذكاء التقني السريع' },
        'chat_pro': { en: 'Reasoning Pro Engine', ar: 'محرك الاستنتاج المتقدم' },
        'chat_reasoning': { en: 'Advanced Reasoning Protocol', ar: 'بروتوكول التفكير المعقد' },
        'perplexta_analysis': { en: 'Analysis', ar: 'تحليل' },
        'image': { en: 'Image', ar: 'صورة' },
        'video': { en: 'Video', ar: 'فيديو' },
        'code': { en: 'Code', ar: 'كود' },
        'learning': { en: 'Education', ar: 'تعليم' },
        'legal_analysis': { en: 'Legal', ar: 'قانون' },
        'notebook': { en: 'Research', ar: 'بحث' },
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
        if (parsed.type === 'QUOTA_EXCEEDED') {
          errorMessage = dir === 'rtl' ? (parsed.error_ar || parsed.error) : (parsed.error || parsed.error_ar);
          isQuota = true;
          quotaData = parsed;
        } else if (parsed.type === 'INSUFFICIENT_FUNDS') {
          errorMessage = dir === 'rtl' ? (parsed.error_ar || parsed.error) : (parsed.error || parsed.error_ar);
          isFunds = true;
          quotaData = parsed;
        } else if (parsed.type === 'TOKEN_EXPIRED') {
          errorMessage = dir === 'rtl' ? 'انتهت صلاحية الجلسة. يرجى تحديث الصفحة أو تسجيل الدخول مرة أخرى.' : 'Session expired. Please refresh the page or login again.';
          setTimeout(() => window.location.reload(), 3000);
        } else if (parsed.type === 'SYSTEM_INACTIVE') {
          errorMessage = dir === 'rtl' ? (parsed.error_ar || parsed.error) : (parsed.error || parsed.error_ar);
          isInactive = true;
          quotaData = parsed;
        } else {
          // Unify general technical errors to the professional message
          errorMessage = dir === 'rtl' 
            ? 'عذراً، النظام قيد التطوير والتحسين المستمر لضمان أفضل تجربة ذكاء اصطناعي. شكراً لصبرك.' 
            : 'Sorry, the system is under development and continuous improvement to ensure the best AI experience. Thank you for your patience.';
        }
      } catch (e) {
        // Fallback for non-JSON or unexpected error formats
        errorMessage = dir === 'rtl' 
          ? 'عذراً، النظام قيد التطوير والتحسين المستمر لضمان أفضل تجربة ذكاء اصطناعي. شكراً لصبرك.' 
          : 'Sorry, the system is under development and continuous improvement to ensure the best AI experience. Thank you for your patience.';
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

  const chatMarkdownComponents = useMemo(() => ({
    code: CodeBlock,
    a: ({ href, children }: any) => {
      const childrenText = String(children);
      const isVideoText = childrenText.includes('Generated Video') || childrenText.includes('فيديو');
      const isVideo = href && (
        href.endsWith('.mp4') || 
        href.endsWith('.webm') || 
        href.endsWith('.mov') || 
        href.includes('assets.mixkit.co/videos') ||
        href.includes('/uploads/') ||
        isVideoText
      );
      if (isVideo) {
        return (
          <MarkdownVideo src={href} alt="Generated Video" />
        );
      }
      return <MarkdownLink href={href}>{children}</MarkdownLink>;
    },
    blockquote: ({ children }: any) => <BlockquoteWithActions dir={dir}>{children}</BlockquoteWithActions>,
    h1: ({ children }: any) => <h1 className="text-xs md:text-sm font-black text-accent mb-3 mt-5 uppercase tracking-wider border-b border-accent/10 pb-1.5">{children}</h1>,
    h2: ({ children }: any) => <h2 className="text-[11px] md:text-xs font-bold text-[var(--text-primary)] mb-2.5 mt-4 flex items-center gap-2">
      <div className="w-0.5 h-3 bg-accent rounded-[4px]" />
      {children}
    </h2>,
    h3: ({ children }: any) => <h3 className="text-[10px] md:text-[11px] font-bold text-gray-400 mb-2 mt-3 uppercase tracking-widest">{children}</h3>,
    img: (props: any) => <MarkdownImg dir={dir} {...props} />,
    video: (props: any) => <MarkdownVideo dir={dir} {...props} />
  }), [dir]);

  const findUserPrompt = (index: number): string => {
    for (let i = index - 1; i >= 0; i--) {
      if (messages[i]?.role === 'user') {
        return messages[i].content;
      }
    }
    return '';
  };

  const handleSendOrStop = async (overrideQuery?: string, overrideMessages?: Message[]) => {
    triggerHaptic('medium');
    if (isGeneratingRef.current || isGenerating) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setIsGenerating(false);
      isGeneratingRef.current = false;
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

      // Check Offline Status for Background Sync Strategy
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        let toolToUse = selectedFile ? 'perplexta_analysis' : (activeDropdown === 'model' 
          ? (selectedModel === 'fast' ? 'chat_fast' : selectedModel === 'pro' ? 'chat_pro' : selectedModel === 'thinking' ? 'chat_reasoning' : 'chat')
          : selectedTool);

        enqueueOfflineMessage({
          chatId: chatId || null,
          content: currentQuery,
          tool: toolToUse
        });

        toast.info(
          dir === 'rtl'
            ? 'أنت غير متصل بالإنترنت. تم حفظ رسالتك في طابور المزامنة وستُرسل تلقائياً فور عودة الاتصال!'
            : 'You are currently offline. Your message is queued and will be dispatched automatically once reconnected!'
        );

        setQuery('');
        resetWriting();
        return;
      }

      const MAX_USER_PROMPT_LIMIT = 16000;
      if (currentQuery.length > MAX_USER_PROMPT_LIMIT) {
        toast.error(
          dir === 'rtl' 
            ? `تنبيه: يتجاوز هذا النص حد الاستخدام العادل المسموح به (${MAX_USER_PROMPT_LIMIT.toLocaleString()} حرفاً). يرجى تقسيمه أو اختصاره.`
            : `Constraint Alert: This text exceeds the fair-use limit of ${MAX_USER_PROMPT_LIMIT.toLocaleString()} characters. Please partition or shorten your text.`
        );
        return;
      }

      let toolToUse = selectedFile ? 'perplexta_analysis' : (activeDropdown === 'model' 
        ? (selectedModel === 'fast' ? 'chat_fast' : selectedModel === 'pro' ? 'chat_pro' : selectedModel === 'thinking' ? 'chat_reasoning' : 'chat')
        : selectedTool);

      const lowercaseQuery = currentQuery.toLowerCase().trim();
      const isImgRequest = lowercaseQuery.includes('generate image') || 
                           lowercaseQuery.includes('generate an image') || 
                           lowercaseQuery.includes('create an image') || 
                           lowercaseQuery.includes('create image') || 
                           lowercaseQuery.includes('draw a') || 
                           lowercaseQuery.includes('paint a') || 
                           lowercaseQuery.includes('show an image') || 
                           lowercaseQuery.includes('صورة') || 
                           lowercaseQuery.includes('صمم صورة') || 
                           lowercaseQuery.includes('ارسم') || 
                           lowercaseQuery.includes('توليد صورة') ||
                           lowercaseQuery.includes('صنع صورة') ||
                           selectedTool === 'image';

      const isVidRequest = lowercaseQuery.includes('generate video') ||
                           lowercaseQuery.includes('generate a video') ||
                           lowercaseQuery.includes('create a video') ||
                           lowercaseQuery.includes('create video') ||
                           lowercaseQuery.includes('فيديو') ||
                           lowercaseQuery.includes('توليد فيديو') ||
                           lowercaseQuery.includes('صنع فيديو') ||
                           lowercaseQuery.includes('مقطع') ||
                           selectedTool === 'video';

      if (isVidRequest && toolToUse !== 'perplexta_analysis') {
        toolToUse = 'video';
      } else if (isImgRequest && toolToUse !== 'perplexta_analysis') {
        toolToUse = 'image';
      }

      // Strict protocol: User's explicitly selected aspect ratio is authoritative
      let dynamicVideoSettings = { 
        ...videoSettings, 
        aspectRatio: videoSettings.aspectRatio || '1:1' 
      };
      let dynamicImageSettings = { 
        ...imageSettings, 
        aspectRatio: imageSettings.aspectRatio || '1:1' 
      };
      
      // If user typed a direct numeric aspect ratio tag in query (e.g. 16:9, 9:16, 4:3, 3:4, 3:2, 2:3, 1:1, 21:9), honor it
      const aspectMatch = lowercaseQuery.match(/(16:9|9:16|1:1|4:3|3:4|3:2|2:3|21:9)/);
      if (aspectMatch) {
         dynamicImageSettings.aspectRatio = aspectMatch[1];
         dynamicVideoSettings.aspectRatio = aspectMatch[1];
         if (toolToUse === 'video') {
           setVideoSettings(prev => ({ ...prev, aspectRatio: aspectMatch[1] }));
           secureStorage.set('perplexta_video_aspect_ratio', aspectMatch[1]);
         } else if (toolToUse === 'image') {
           setImageSettings(prev => ({ ...prev, aspectRatio: aspectMatch[1] }));
           secureStorage.set('perplexta_image_aspect_ratio', aspectMatch[1]);
         }
      }

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
        toast.warning(dir === 'rtl' ? 'تم بلوغ حد 50 رسالة وحذف الرسائل القديمة تلقائياً' : 'Reached 50 messages limit; older messages were pruned');
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
      resetWriting();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (socket) {
        socket.emit('typing', { isTyping: false, role: 'user', name: user?.name || 'User' });
      }
      if (textareaRef.current) {
        textareaRef.current.style.height = '30px';
      }

      abortControllerRef.current = new AbortController();

      try {
        const authToken = token || secureStorage.getSync('app_token');

        let currentChatId = chatId;
        if (!currentChatId) {
          try {
            const data = await ChatService.createChat(
              authToken || '',
              currentQuery.substring(0, 50),
              currentQuery,
              toolToUse
            );
            currentChatId = data.id;
            setChatId(currentChatId);
            chatIdRef.current = currentChatId; 
            navigate(`/chat/${currentChatId}`, { replace: true });
            setTimeout(() => {
              window.dispatchEvent(new Event('chat-created'));
              window.dispatchEvent(new Event('chat-updated'));
            }, 100);
          } catch (createErr: any) {
            toast.error(createErr.message || (dir === 'rtl' ? 'فشل إنشاء المحادثة' : 'Failed to create chat'));
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
          console.error('[ChatPage] Error processing file base64:', error);
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
        content: currentQuery,
        mode: 'standard',
        file_data: fileData,
        forensic_mode: forensicMode,
        video_settings: toolToUse === 'video' ? dynamicVideoSettings : undefined,
        image_settings: toolToUse === 'image' ? dynamicImageSettings : undefined,
        audio_settings: toolToUse === 'canvas' ? finalAudioSettings : undefined
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
                token: token || secureStorage.getSync('app_token'),
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
    { id: 'fast', label: t('fast'), icon: <Zap size={18} />, color: 'text-accent', dotColor: 'bg-accent' },
    { id: 'thinking', label: t('thinking'), icon: <Brain size={18} />, color: 'text-accent', dotColor: 'bg-accent' },
    { id: 'pro', label: t('pro'), icon: <Sparkles size={18} />, color: 'text-accent', dotColor: 'bg-accent' },
  ];

  const advancedTools = [
    { id: 'perplexta_analysis', label: t('perplexta_analysis') || (dir === 'rtl' ? 'تحليل' : 'Analysis'), icon: <Search size={16} />, isNew: true },
    { id: 'notebook', label: t('notebook') || (dir === 'rtl' ? 'بحث' : 'Research'), icon: <BookOpen size={16} />, isNew: true },
    { id: 'image', label: t('image') || (dir === 'rtl' ? 'صورة' : 'Image'), icon: <ImageIcon size={16} />, isNew: false },
    { id: 'video', label: t('video') || (dir === 'rtl' ? 'فيديو' : 'Video'), icon: <Video size={16} />, isNew: true },
    { id: 'code', label: t('code') || (dir === 'rtl' ? 'كود' : 'Code'), icon: <Code size={16} />, isNew: true },
    { id: 'learning', label: t('learning') || (dir === 'rtl' ? 'تعليم' : 'Education'), icon: <BookOpen size={16} />, isNew: true },
    { id: 'legal_analysis', label: t('legal_analysis') || (dir === 'rtl' ? 'قانون' : 'Legal'), icon: <Scale size={16} />, isNew: true },
    { id: 'canvas', label: t('canvas') || (dir === 'rtl' ? 'استوديو الصوت' : 'Audio Studio'), icon: <Music size={16} />, isNew: true, isRouter: true },
  ];

  const defaultChatTool = { id: 'chat', label: t('chat') || (dir === 'rtl' ? 'محادثة' : 'Chat'), icon: <MessageSquare size={16} /> };
  const currentModel = models.find(m => m.id === selectedModel) || models.find(m => m.id === 'fast') || models[1];
  const currentTool = advancedTools.find(t => t.id === selectedTool) || defaultChatTool;
  const currentPlan = plans?.find((p: any) => p.id?.toString() === user?.subscription?.plan_id?.toString());

  const getToolWelcomeIntro = (toolId: string) => {
    const isAr = dir === 'rtl';
    const userName = user?.name || (isAr ? 'مستخدم' : 'User');
    const greeting = isAr ? `مرحباً، ${userName}` : `Hello, ${userName}`;
    
    let promptIntro = '';
    switch (toolId) {
      case 'image':
        promptIntro = isAr ? 'اوصف المظهر بدقة لنبتكر إبداعاً بصرياً فريداً.' : 'Describe the visual precisely to create unique art.';
        break;
      case 'video':
        promptIntro = isAr ? 'اكتب المشهد السينمائي أو الفكرة لتوليدها بدقة.' : 'Describe your cinematic scene to generate it.';
        break;
      case 'code':
        promptIntro = isAr ? 'اطلب الهيكل البرمجي أو الخوارزمية لنكتبها معاً.' : 'Request your structural code or algorithm now.';
        break;
      case 'perplexta_music':
        promptIntro = isAr ? 'حدد النمط أو الحالة المزاجية للتأليف الصوتي.' : 'Specify the style or mood for acoustic composition.';
        break;
      case 'canvas':
        promptIntro = isAr ? 'جاهز لتصميم المقاطع والمؤثرات الصوتية بدقة واحترافية.' : 'Ready to produce acoustic tracks and effects.';
        break;
      case 'notebook':
        promptIntro = isAr ? 'اطرح أسئلتك لنلخص وننظم الأفكار والمعلومات.' : 'Ask your questions to synthesize knowledge and ideas.';
        break;
      case 'legal_analysis':
        promptIntro = isAr ? 'اطرح الاستفسارات للتحليل القانوني والدقيق.' : 'Submit inquiries for precise regulatory analysis.';
        break;
      case 'perplexta_analysis':
        promptIntro = isAr ? 'جاهز للتنقيب الرقمي والتقني العميق والتحليل.' : 'Ready for deep technical scanning and analysis.';
        break;
      case 'learning':
        promptIntro = isAr ? 'اسأل عن أي مفهوم لشرحه خطوة بخطوة.' : 'Ask about any concept for step-by-step guidance.';
        break;
      case 'tts':
        promptIntro = isAr ? 'اكتب النص لنطقه بصوت احترافي واضح.' : 'Type text to synthesize voice professionally.';
        break;
      case 'stt':
        promptIntro = isAr ? 'ارفع ملفك الصوتي أو تحدث للتفريغ الفوري.' : 'Upload or speak for instant transcription.';
        break;
      default:
        promptIntro = isAr ? 'جاهز لتنفيذ طلبك بدقة واحترافية.' : 'Ready to execute your request with precision.';
        break;
    }
    return { greeting, promptIntro };
  };

  const renderInputArea = () => (
    <div className="w-full flex flex-col box-border min-w-0 px-2 sm:px-6 max-w-3xl mx-auto">

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
                  color: user?.subscription?.plan_color || '#334155',
                  textShadow: `0 0 14px ${(user?.subscription?.plan_color || '#334155')}45`
                }}
              >
                <span>{typedNotice || ''}</span>
                {typedNotice && typedNotice.length < (dir === 'rtl' ? ledgerNotice.textAr : ledgerNotice.textEn).length && (
                  <span 
                    className="inline-block w-1.5 h-4 animate-pulse bg-current relative top-0.5" 
                    style={{ backgroundColor: user?.subscription?.plan_color || '#334155' }} 
                  />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Collapsible Segmented Aspect Ratio Bar for Video & Image Tools */}
        {(selectedTool === 'video' || selectedTool === 'image') && (
          <div className="flex items-center gap-1 sm:gap-1.5 mb-1 sm:mb-1.5 self-start select-none max-w-full">
            <AnimatePresence mode="wait">
              {!isAspectBarCollapsed ? (
                <motion.div 
                  key="expanded-ratio-strip"
                  initial={{ opacity: 0, y: 4, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center gap-1.5 max-w-full overflow-hidden"
                >
                  <div className="inline-flex items-stretch h-8 rounded-[8px] border border-[var(--border-main)] bg-transparent divide-x divide-[var(--border-main)] rtl:divide-x-reverse overflow-x-auto scrollbar-none">
                    {['16:9', '9:16', '4:3', '3:4', '3:2', '2:3', '1:1'].map((ratio) => {
                      const currentRatio = selectedTool === 'video'
                        ? (videoSettings.aspectRatio || '1:1')
                        : (imageSettings.aspectRatio || '1:1');
                      const isActive = currentRatio === ratio;

                      const RATIO_TOOLTIPS: Record<string, { ar: string; en: string }> = {
                        '16:9': { ar: '16:9 - عرضي / يوتيوب وسينما', en: '16:9 - Landscape / Cinema' },
                        '9:16': { ar: '9:16 - طولي / ريلز وتيك توك وستوري', en: '9:16 - Portrait / Reels & TikTok' },
                        '4:3':  { ar: '4:3 - كلاسيكي عريض', en: '4:3 - Standard Landscape' },
                        '3:4':  { ar: '3:4 - كلاسيكي طولي', en: '3:4 - Standard Portrait' },
                        '3:2':  { ar: '3:2 - فوتوغرافي أفقي', en: '3:2 - Classic Photo Landscape' },
                        '2:3':  { ar: '2:3 - فوتوغرافي رأسي', en: '2:3 - Classic Photo Portrait' },
                        '1:1':  { ar: '1:1 - مربع / انستغرام', en: '1:1 - Square' },
                      };

                      return (
                        <button
                          key={ratio}
                          type="button"
                          onClick={() => handleSelectAspectRatio(ratio)}
                          title={dir === 'rtl' ? RATIO_TOOLTIPS[ratio]?.ar : RATIO_TOOLTIPS[ratio]?.en}
                          className={`px-2.5 sm:px-3 h-full flex items-center justify-center text-[11px] font-mono font-bold transition-theme whitespace-nowrap active:scale-95 ${
                            isActive
                              ? 'text-[var(--fg-accent)] font-extrabold bg-transparent hover:bg-[var(--surface-subtle)]'
                              : 'text-[var(--text-muted)] hover:text-[var(--fg-accent)] bg-transparent hover:bg-[var(--surface-subtle)]'
                          }`}
                        >
                          {ratio}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsAspectBarCollapsed(true);
                      secureStorage.set('perplexta_aspect_bar_collapsed', 'true');
                    }}
                    title={dir === 'rtl' ? 'طي شريط الأبعاد' : 'Collapse ratio bar'}
                    className="w-8 h-8 flex items-center justify-center rounded-[8px] border border-[var(--border-main)] bg-transparent hover:bg-[var(--surface-subtle)] text-[var(--text-muted)] hover:text-[var(--fg-accent)] transition-theme active:scale-95 shrink-0"
                  >
                    <ChevronUp size={14} />
                  </button>
                </motion.div>
              ) : (
                <motion.button
                  key="collapsed-ratio-strip"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  type="button"
                  onClick={() => {
                    setIsAspectBarCollapsed(false);
                    secureStorage.set('perplexta_aspect_bar_collapsed', 'false');
                  }}
                  title={dir === 'rtl' ? 'توسيع شريط الأبعاد' : 'Expand ratio bar'}
                  className="h-8 px-2.5 flex items-center justify-center gap-1.5 rounded-[8px] border border-[var(--border-main)] bg-transparent hover:bg-[var(--surface-subtle)] transition-theme active:scale-95 group shrink-0 text-[11px] font-mono font-bold"
                >
                  <span className="text-[var(--fg-accent)] font-extrabold">
                    {selectedTool === 'video'
                      ? (videoSettings.aspectRatio || '1:1')
                      : (imageSettings.aspectRatio || '1:1')}
                  </span>
                  <ChevronDown size={14} className="text-[var(--text-muted)] group-hover:text-[var(--fg-accent)] transition-theme" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        )}

        <motion.div 
          className={`relative w-full flex flex-col rounded-[var(--radius-md)] border box-border min-w-0 transition-all bg-[var(--surface-card)] border-[var(--border-outer-input)] hover:border-[var(--border-accent)]`}
        >

        {isRecording && (
          <div className="px-3.5 py-3.5 bg-red-500/5 dark:bg-red-500/10 border-b border-dashed border-red-500/20 flex flex-col gap-2.5 transition-theme">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-[4px] bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-[4px] h-2.5 w-2.5 bg-red-500"></span>
                </span>
                <span className="text-xs font-black text-red-500 animate-pulse uppercase tracking-wider">
                  {dir === 'rtl' ? 'جاري الاستماع وتدوين الصوت...' : 'LISTENING & TRANSCRIBING...'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                {/* 5-bar custom animated sound wave visualizer */}
                <div className="flex items-end gap-0.5 h-4 select-none pr-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <motion.span
                      key={`chat-sound-wave-${i}`}
                      className="w-0.5 bg-red-500 rounded-[4px]"
                      animate={{
                        height: ["4px", "16px", "4px"]
                      }}
                      transition={{
                        duration: 0.6,
                        repeat: Infinity,
                        repeatType: "reverse",
                        delay: i * 0.08,
                        ease: "easeInOut"
                      }}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    recognitionRef.current?.stop();
                    setIsRecording(false);
                    setInterimText('');
                  }}
                  className="text-[10px] font-black uppercase text-red-400 hover:text-red-500 px-2 py-0.5 rounded border border-red-500/25 hover:bg-red-500/10 transition-theme"
                >
                  {dir === 'rtl' ? 'إيقاف' : 'Stop'}
                </button>
              </div>
            </div>
            {/* Real-time speech-to-text text preview area */}
            <div className="text-[14px] text-[var(--text-secondary)] italic min-h-[36px] bg-black/5 dark:bg-black/25 rounded px-3 py-2 flex items-center justify-between gap-3 border-0">
              <span className="truncate max-w-[80%]">
                {interimText ? (
                  <span className="text-[var(--text-primary)] font-bold not-italic">{interimText}</span>
                ) : (
                  <span className="text-[var(--text-muted)] opacity-60">
                    {dir === 'rtl' ? 'تحدث الآن ليتم تدوين كلامك هنا في الوقت الفعلي...' : 'Speak now to see real-time transcription here...'}
                  </span>
                )}
              </span>
              {interimText && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery(prev => {
                      const trimmed = prev.trim();
                      return trimmed + (trimmed ? ' ' : '') + interimText.trim();
                    });
                    setInterimText('');
                  }}
                  className="text-[10px] font-black uppercase text-accent hover:text-accent border border-accent/20 hover:bg-accent/10 px-2 py-1 rounded transition-theme shrink-0"
                >
                  {dir === 'rtl' ? 'إدراج' : 'Insert'}
                </button>
              )}
            </div>
          </div>
        )}

        {selectedFile && (
          <div className="px-2 pt-2 flex items-start gap-2">
            <div className={`relative group p-1 rounded-sm border-0 transition-theme bg-transparent flex-shrink-0`}>
              <div className="flex items-center gap-2 px-1.5 py-1 min-w-[120px]">
                {previewUrl && selectedFile.type.startsWith('image/') ? (
                  <div className="w-8 h-8 rounded-sm overflow-hidden border-0 bg-[var(--bg-base)]">
                    <img src={previewUrl} alt="preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                ) : (
                  <div className={`w-8 h-8 rounded-sm flex items-center justify-center bg-[var(--bg-base)] text-accent shadow-sm`}>
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
                className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-[4px] flex items-center justify-center shadow-lg hover:bg-red-600 transition-theme z-10"
              >
                <Plus size={10} className="rotate-45" />
              </button>
            </div>

            {selectedFile.type === 'application/pdf' && (
              <div className="flex items-center gap-3 self-center pl-2 border-l-0 ml-2 h-10 select-none">
                <button
                  type="button"
                  onClick={triggerForensicDiagnostic}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] border border-transparent hover:border-accent/30 hover:bg-accent/5 text-xs font-semibold text-accent transition-theme shadow-none bg-transparent"
                >
                  <Sparkles size={13} className="text-accent  animate-pulse" />
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
                    <div className={`w-8 h-4 bg-gray-200 dark:bg-gray-800 rounded-[4px] transition-theme ${forensicMode ? 'bg-accent/80 dark:bg-accent/50' : ''}`} />
                    <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-[4px] bg-white shadow-md transition-transform duration-300 ${forensicMode ? 'transform translate-x-4 bg-accent' : ''}`} />
                  </div>
                  <span className={`text-[10px] font-bold ${forensicMode ? 'text-accent ' : 'text-[var(--text-muted)]'}`}>
                    {dir === 'rtl' ? 'وضع التحقيق الجنائي' : 'Forensic Mode'}
                  </span>
                </label>
              </div>
            )}
          </div>
        )}

        <div className="flex items-end px-2 sm:px-3 py-1.5 sm:py-2 gap-1 sm:gap-2">

          <div className="flex-shrink-0 flex items-center">
            <motion.button 
              onClick={() => handleSendOrStop()}
              className={`w-8 h-8 flex items-center justify-center rounded-[8px] transition-theme group shadow-none border shrink-0 ${
                !isGenerating && !query.trim() 
                  ? 'cursor-not-allowed opacity-40 grayscale border-[var(--border-main)] bg-transparent' 
                  : 'border-[var(--border-main)] bg-transparent hover:bg-[var(--surface-subtle)] active:scale-95'
              }`}
              disabled={!isGenerating && !query.trim()}
              animate={isGenerating ? {
                borderColor: [
                  "var(--border-main)",
                  "var(--border-accent)",
                  "var(--border-main)"
                ]
              } : {}}
              transition={isGenerating ? {
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut"
              } : {}}
            >
              {isGenerating ? (
                <div className="relative flex items-center justify-center w-7 h-7">
                   <div className="absolute inset-0 rounded-[var(--radius-xs)] border-2 border-accent/20 border-t-accent animate-spin w-4 h-4 m-auto" />
                   <Square size={9} className="text-[var(--fg-accent)] relative z-10" fill="currentColor" />
                </div>
              ) : (
                <div className={`${dir === 'rtl' ? 'transform -scale-x-100' : ''} flex items-center justify-center`}>
                  <Send 
                    size={14} 
                    className={`transition-theme ${
                      query.trim() 
                        ? 'text-[var(--fg-accent)] scale-100' 
                        : 'text-[var(--text-muted)] group-hover:text-[var(--fg-accent)]'
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
                const val = e.target.value;
                setQuery(val);
                e.target.style.height = '30px';
                e.target.style.height = `${Math.max(30, Math.min(e.target.scrollHeight, 200))}px`;
                if (val.trim().length > 0) {
                  startWriting();
                } else {
                  resetWriting();
                }
                handleUserTyping();
              }}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  resetWriting();
                  handleSendOrStop();
                  if (textareaRef.current) textareaRef.current.style.height = '30px'; 
                }
              }}
              disabled={isInputDisabled}
              placeholder={isInputDisabled ? (dir === 'rtl' ? 'يرجى تفعيل باقة اشتراك أو شحن الرصيد للبدء بالاستخدام...' : 'Please activate a subscription plan or top up your balance to start...') : t('askAssistant')}
              className={`w-full bg-transparent border-none outline-none px-1 py-1 text-[15px] sm:text-[16px] font-medium placeholder:text-[var(--text-secondary)]/50 text-[var(--text-primary)] resize-none scrollbar-none overflow-hidden leading-relaxed ${dir === 'rtl' ? 'text-right' : 'text-left'} ${isInputDisabled ? 'cursor-not-allowed text-gray-400' : ''}`}
              dir="auto"
              rows={1}
              style={{ minHeight: '30px', maxHeight: '200px', height: '30px' }}
            />
            {query.length > 500 && (
              <span className={`absolute bottom-[-14px] ${dir === 'rtl' ? 'left-1' : 'right-1'} text-[10px] font-mono select-none pointer-events-none transition-theme ${query.length > 15000 ? 'text-red-500 font-bold drop-shadow-[0_0_4px_rgba(239,68,68,0.5)]' : 'text-gray-400'}`}>
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
              className={`w-8 h-8 flex items-center justify-center rounded-[8px] bg-transparent border border-[var(--border-main)] hover:bg-[var(--surface-subtle)] active:scale-95 transition-theme group shrink-0 ${isInputDisabled ? 'opacity-30 cursor-not-allowed' : ''}`}
            >
              <Plus size={14} className="text-[var(--text-muted)] group-hover:text-[var(--fg-accent)] transition-theme" />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between px-2 sm:px-3 py-1 sm:py-1.5 border-t-0 transition-theme">
          <div className="flex items-center gap-1.5 flex-nowrap min-w-0">
            <div ref={toolsMenuRef} className="relative shrink-0">
              {(() => {
                const isToolActive = selectedTool !== 'chat';
                return (
                  <>
                    <button 
                      type="button"
                      onClick={() => {
                        if (!isInputDisabled) {
                          setIsAdvancedToolsOpen(prev => !prev);
                          setIsModelMenuOpen(false);
                          setIsAttachmentMenuOpen(false);
                        }
                      }}
                      disabled={isInputDisabled}
                      title={currentTool.label}
                      className={`w-8 h-8 flex items-center justify-center rounded-[8px] bg-transparent border border-[var(--border-main)] hover:bg-[var(--surface-subtle)] active:scale-95 transition-theme group shrink-0 ${
                        isInputDisabled ? 'opacity-30 cursor-not-allowed' : ''
                      }`}
                    >
                      <span className={`flex items-center justify-center transition-theme ${
                        isToolActive 
                          ? 'text-[var(--fg-accent)]' 
                          : 'text-[var(--text-muted)] group-hover:text-[var(--fg-accent)]'
                      }`}>
                        {React.cloneElement(currentTool.icon as React.ReactElement<{ size?: number; className?: string }>, { 
                          size: 14, 
                          className: `w-3.5 h-3.5 ${isToolActive ? 'text-[var(--fg-accent)]' : ''}` 
                        })}
                      </span>
                    </button>

                    {isAdvancedToolsOpen && (
                      <div className={`absolute bottom-full mb-2 ${dir === 'rtl' ? 'right-0' : 'left-0'} w-36 max-w-[calc(100vw-2rem)] rounded-xl border shadow-2xl flex flex-col z-[100] overflow-hidden bg-[var(--surface-card)] border-[var(--border-main)] backdrop-blur-md`}>
                        <div className="p-1 flex flex-col gap-0.5 max-h-[70vh] sm:max-h-[60vh] overflow-y-auto custom-scrollbar">
                          {advancedTools.map((tool, tIdx) => {
                            const limit = currentPlan?.limits?.[tool.id];
                            const isHidden = limit?.isHidden === true;
                            const isZeroLimit = limit?.daily === 0 && limit?.monthly === 0;
                            const hasBalance = (balance && balance > 0) || (balanceUSD && balanceUSD > 0);
                            const isLocked = currentPlan ? isZeroLimit && !hasBalance : false;
                            const isSelected = selectedTool === tool.id;

                            return (
                              <button 
                                key={`adv-tool-${tool.id}-${tIdx}`} 
                                onClick={() => {
                                  if (isLocked) {
                                    return;
                                  }
                                  if (tool.id === 'canvas' || (tool as any).isRouter) {
                                    navigate('/audio-studio');
                                    setIsAdvancedToolsOpen(false);
                                    return;
                                  }
                                  setSelectedTool(tool.id);
                                  setActiveDropdown('tool');
                                  setIsAdvancedToolsOpen(false);
                                }}
                                className={`${tool.id === 'code' ? 'hidden md:flex' : 'flex'} items-center gap-1.5 flex-nowrap px-2 py-1.5 rounded-[var(--radius-xs)] transition-theme text-[10.5px] font-bold bg-transparent hover:bg-[var(--surface-subtle)] ${
                                  isLocked 
                                    ? 'opacity-40 cursor-not-allowed text-[var(--text-muted)]'
                                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                }`}
                              >
                                <span className={`shrink-0 flex items-center justify-center w-3.5 h-3.5 ${isLocked ? 'text-[var(--text-muted)] opacity-70' : isSelected ? 'text-[var(--fg-accent)] drop-shadow-[0_0_8px_rgba(20,184,166,0.9)] scale-110 transition-transform' : 'text-[var(--text-muted)]'}`}>
                                  {React.cloneElement(tool.icon as React.ReactElement<{ size?: number; className?: string }>, { size: 13, className: 'w-3.5 h-3.5' })}
                                </span>
                                <div className="flex items-center justify-between flex-1 min-w-0 flex-nowrap gap-1">
                                  <span className={`truncate whitespace-nowrap ${isSelected ? 'text-[var(--fg-accent)] font-bold' : ''}`}>{tool.label}</span>
                                  <div className="flex items-center gap-0.5 shrink-0">
                                    {(tool as any).isRouter && !isLocked && (
                                      <ArrowUpRight size={12} className="text-accent shrink-0 animate-pulse" />
                                    )}
                                    {tool.isNew && !isLocked && !isSelected && !(tool as any).isRouter && (
                                      <span className="px-1 py-[1px] rounded-[3px] bg-gray-500/20 text-gray-400 text-[7px] font-black uppercase tracking-wider">
                                        NEW
                                      </span>
                                    )}
                                    {isLocked && (
                                      <Lock size={11} className="text-amber-500 shrink-0" />
                                    )}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            <div className="w-px h-4 bg-[var(--border-main)] mx-0.5 shrink-0" />

            <div ref={modelsMenuRef} className="relative shrink-0">
              {(() => {
                const isModelActive = selectedTool === 'chat';

                return (
                  <>
                    <button 
                      type="button"
                      onClick={() => {
                        if (!isInputDisabled) {
                          setIsModelMenuOpen(prev => !prev);
                          setIsAdvancedToolsOpen(false);
                          setIsAttachmentMenuOpen(false);
                        }
                      }}
                      disabled={isInputDisabled}
                      title={currentModel.label}
                      className={`w-8 h-8 flex items-center justify-center rounded-[8px] bg-transparent border border-[var(--border-main)] hover:bg-[var(--surface-subtle)] active:scale-95 transition-theme group shrink-0 ${
                        isInputDisabled ? 'opacity-30 cursor-not-allowed' : ''
                      }`}
                    >
                      <span className={`flex items-center justify-center transition-theme ${
                        isModelActive 
                          ? 'text-[var(--fg-accent)]' 
                          : 'text-[var(--text-muted)] group-hover:text-[var(--fg-accent)]'
                      }`}>
                        {React.cloneElement(currentModel.icon as React.ReactElement<{ size?: number; className?: string }>, { 
                          size: 14, 
                          className: `w-3.5 h-3.5 ${isModelActive ? 'text-[var(--fg-accent)]' : ''}` 
                        })}
                      </span>
                    </button>

                    {isModelMenuOpen && (
                      <div className={`absolute bottom-full mb-2 ${dir === 'rtl' ? 'right-0' : 'left-0'} w-28 p-1 rounded-xl border shadow-2xl flex flex-col gap-0.5 z-[110] bg-[var(--surface-card)] border-[var(--border-main)] backdrop-blur-md`}>
                        {models.map((model, idx) => {
                          const limit = currentPlan?.limits?.[model.id];
                          const isHidden = limit?.isHidden === true;
                          const isZeroLimit = limit?.daily === 0 && limit?.monthly === 0;
                          const hasBalance = (balance && balance > 0) || (balanceUSD && balanceUSD > 0);
                          const isLocked = currentPlan ? isZeroLimit && !hasBalance : false;
                          const isSelected = selectedModel === model.id && isModelActive;

                          return (
                            <button 
                              key={`${model.id}-${idx}`} 
                              onClick={() => {
                                if (isLocked) {
                                  return;
                                }
                                setSelectedModel(model.id as any);
                                setSelectedTool('chat');
                                setActiveDropdown('model');
                                setIsModelMenuOpen(false);
                              }}
                              className={`flex items-center justify-between px-2 py-1.5 rounded-[var(--radius-xs)] flex-nowrap transition-theme text-[10.5px] font-bold uppercase tracking-tight bg-transparent hover:bg-[var(--surface-subtle)] ${
                                isLocked
                                  ? 'opacity-40 cursor-not-allowed text-[var(--text-muted)]'
                                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] group'
                              }`}
                            >
                              <div className="flex items-center gap-1 flex-nowrap">
                                <span className={`shrink-0 flex items-center justify-center w-3.5 h-3.5 ${isLocked ? 'text-gray-400 opacity-60' : isSelected ? 'text-[var(--fg-accent)] drop-shadow-[0_0_8px_rgba(20,184,166,0.85)] scale-110' : model.color} transition-transform`}>
                                  {React.cloneElement(model.icon as React.ReactElement<{ size?: number; className?: string }>, { size: 13, className: 'w-3.5 h-3.5' })}
                                </span>
                                <span className={`whitespace-nowrap ${isSelected ? 'text-[var(--fg-accent)] font-extrabold' : ''}`}>{model.label}</span>
                              </div>
                              <div className="flex items-center gap-0.5 shrink-0">
                                {isLocked && (
                                  <Lock size={11} className="text-amber-500 shrink-0" />
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>

          <div className="relative flex-shrink-0 flex items-center">
            <button 
              onClick={toggleRecording}
              disabled={isInputDisabled}
              title={dir === 'rtl' ? (isRecording ? 'إيقاف التسجيل الصوتي' : 'بدء الكتابة بالصوت') : (isRecording ? 'Stop voice recording' : 'Start voice-to-text')}
              className={`w-8 h-8 flex items-center justify-center bg-transparent border transition-theme relative group active:scale-95 rounded-[8px] shrink-0 ${
                isInputDisabled 
                  ? 'opacity-30 cursor-not-allowed border-transparent' 
                  : isRecording
                    ? 'bg-red-500/10 text-red-500 border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.3)]' 
                    : 'border-[var(--border-main)] text-[var(--text-muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--fg-accent)]'
              }`}
            >
              {isRecording ? (
                <div className="relative flex items-center justify-center">
                  <MicOff size={14} className="text-red-500 animate-pulse drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
                  <span className="absolute -top-1 -right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-[4px] bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-[4px] h-2 w-2 bg-red-500"></span>
                  </span>
                </div>
              ) : (
                <Mic 
                  size={14} 
                  className="text-[var(--text-muted)] group-hover:text-[var(--fg-accent)] transition-theme" 
                />
              )}
            </button>
          </div>
        </div>
      </motion.div>
      </div>

      {user && token && (
        <div className="text-center mt-1 mb-0.5 text-[8px] md:text-[10px] font-bold uppercase tracking-wider md:tracking-widest text-[var(--text-muted)]/80 px-4 line-clamp-1 md:line-clamp-none">
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
                 className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-sm px-4 py-3 outline-none focus:border-accent/50 transition-theme font-bold text-sm mb-6 text-[var(--text-primary)]"
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
                   className="flex-1 py-1.5 rounded-sm text-xs font-bold uppercase bg-accent text-white hover:bg-accent transition-theme shadow-[0_5px_15px_rgba(156,163,175,0.3)]"
                 >
                   {dir === 'rtl' ? 'حفظ' : 'Save'}
                 </button>
               </div>
            </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {(!user || !token) ? (
            <VisitorShell>
              {renderInputArea()}
            </VisitorShell>
          ) : (
            <>
              <AnimatePresence>
                {chatId && (
                  <motion.div 
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: -8 }}
                    transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                    className="sticky top-0 z-30 bg-[var(--bg-base)]"
                  >

                    {isChatMessagesLoading && (
                      <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-accent/10 overflow-hidden z-40">
                        <div className="animate-sovereign-progress h-full bg-accent rounded-[4px] animate-pulse" />
                      </div>
                    )}
              <div className="max-w-4xl mx-auto w-full flex items-center justify-between px-8 md:px-6 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-1.5 h-1.5 rounded-[4px] bg-accent animate-pulse shadow-[0_0_8px_rgba(156,163,175,0.8)] flex-shrink-0" />
                  <h2 className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] text-accent truncate max-w-[120px] md:max-w-[300px] font-mono">
                    {dir === 'rtl' ? 'نشط' : 'Active'}
                  </h2>
               </div>
               <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setShowPinnedModal(true)}
                    className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-sm transition-theme text-gray-400 hover:bg-[var(--bg-overlay)] hover:text-accent hover: relative"
                    title={dir === 'rtl' ? 'الرسائل المثبتة' : 'Pinned Messages'}
                  >
                    <Pin size={18} className={messages.some(m => m.is_pinned) ? "text-accent " : "transition-theme"} />
                    {messages.filter(m => m.is_pinned).length > 0 && (
                      <span className="absolute -top-1 -right-1 bg-accent text-black text-[9px] font-black w-4 h-4 rounded-[4px] flex items-center justify-center shadow-[0_0_4px_rgba(156,163,175,0.6)]">
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
                          ? 'text-accent bg-accent/10 cursor-wait'
                          : isExportMenuOpen 
                            ? 'text-accent bg-accent/10' 
                            : 'text-gray-400 hover:bg-[var(--bg-overlay)]'
                      }`}
                      title={dir === 'rtl' ? 'خيارات المحادثة' : 'Thread Options'}
                    >
                      {isExporting ? (
                        <Loader2 size={20} className="animate-spin text-accent" />
                      ) : (
                        <MoreHorizontal 
                          size={20} 
                          className={`transition-theme ${
                            isExportMenuOpen 
                              ? '' 
                              : 'group-hover:text-accent group-hover:'
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
                              className="w-full flex items-center gap-3 px-3 py-2 text-[11px] font-bold text-[var(--text-secondary)] hover:text-gray-900 dark:hover:text-white hover:bg-[var(--bg-overlay)] rounded-sm transition-theme group disabled:opacity-50"
                            >
                              <Bookmark size={14} className="group-hover:text-accent" />
                              <span>{dir === 'rtl' ? 'إضافة علامة مرجعية' : 'Add Bookmark'}</span>
                            </button>

                            <button 
                              onClick={() => {
                                toast.info(dir === 'rtl' ? 'تمت الإضافة للمساحة' : 'Added to space');
                                setIsExportMenuOpen(false);
                              }}
                              disabled={isExporting}
                              className="w-full flex items-center gap-3 px-3 py-2 text-[11px] font-bold text-[var(--text-secondary)] hover:text-gray-900 dark:hover:text-white hover:bg-[var(--bg-overlay)] rounded-sm transition-theme group disabled:opacity-50"
                            >
                              <FolderPlus size={14} className="group-hover:text-accent" />
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
                              className="w-full flex items-center gap-3 px-3 py-2 text-[11px] font-bold text-[var(--text-secondary)] hover:text-gray-900 dark:hover:text-white hover:bg-[var(--bg-overlay)] rounded-sm transition-theme group disabled:opacity-50"
                            >
                              <Pencil size={14} className="group-hover:text-accent" />
                              <span>{dir === 'rtl' ? 'إعادة تسمية' : 'Rename Thread'}</span>
                            </button>

                            <div className="my-1.5 mx-2 h-px bg-[var(--border-main)]/50" />

                            <button 
                              onClick={() => handleExportChat('pdf')}
                              disabled={isExporting}
                              className="w-full flex items-center gap-3 px-3 py-2 text-[11px] font-bold text-[var(--text-secondary)] hover:text-gray-900 dark:hover:text-white hover:bg-[var(--bg-overlay)] rounded-sm transition-theme group disabled:opacity-50"
                            >
                              <FileDown size={14} className="group-hover:text-accent" />
                              <span>{dir === 'rtl' ? 'تصدير كـ PDF' : 'Export as PDF'}</span>
                            </button>

                            <button 
                              onClick={() => handleExportChat('md')}
                              disabled={isExporting}
                              className="w-full flex items-center gap-3 px-3 py-2 text-[11px] font-bold text-[var(--text-secondary)] hover:text-gray-900 dark:hover:text-white hover:bg-[var(--bg-overlay)] rounded-sm transition-theme group disabled:opacity-50"
                            >
                              <FileCode size={14} className="group-hover:text-accent" />
                              <span>{dir === 'rtl' ? 'تصدير كـ Markdown' : 'Export as Markdown'}</span>
                            </button>

                            <button 
                              onClick={() => handleExportChat('docx')}
                              disabled={isExporting}
                              className="w-full flex items-center gap-3 px-3 py-2 text-[11px] font-bold text-[var(--text-secondary)] hover:text-gray-900 dark:hover:text-white hover:bg-[var(--bg-overlay)] rounded-sm transition-theme group disabled:opacity-50"
                            >
                              <FileText size={14} className="group-hover:text-accent" />
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
                      className="flex items-center gap-2 px-3 py-1.5 rounded-sm text-[9px] md:text-[10px] font-black uppercase tracking-wider text-accent bg-accent/5 transition-theme border border-accent/10 hover:bg-accent/10"
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
            className="flex-1 min-h-0 overflow-y-scroll scrollbar-none custom-scrollbar w-full overflow-anchor-auto relative flex flex-col"
          >
          <AnimatePresence mode="wait">
            {isChatMessagesLoading && messages.length === 0 ? (
              <motion.div
                key="chat-messages-skeleton"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex-1 max-w-4xl mx-auto w-full px-8 md:px-6 py-12 flex flex-col gap-8 min-h-full"
              >
                {[...Array(3)].map((_, i) => (
                  <motion.div 
                    key={`chat-skel-msg-${i}`} 
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

                    <div className="w-10 h-10 rounded-[4px] bg-gray-200/20 dark:bg-gray-800/40 shrink-0" />

                    <div className="flex-1 space-y-3 pt-1">
                      <div className={`h-2.5 bg-gray-250/50 dark:bg-gray-800/50 rounded ${i === 0 ? 'w-1/4' : i === 1 ? 'w-1/5' : 'w-1/3'}`} />
                      <div className={`h-3 bg-gray-200/30 dark:bg-gray-800/30 rounded ${i === 0 ? 'w-3/4' : i === 1 ? 'w-5/6' : 'w-2/3'}`} />
                      <div className={`h-3 bg-gray-200/30 dark:bg-gray-800/30 rounded ${i === 0 ? 'w-1/2' : i === 1 ? 'w-2/3' : 'w-3/4'}`} />
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            ) : messages.length === 0 && !routeChatId ? (
              <motion.div 
                key="onboarding-view" 
                initial={{ opacity: 0, scale: 1, filter: "blur(4px)" }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, scale: 0.98, filter: "blur(6px)", transition: { duration: 0.15, ease: "easeOut" } }}
                transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                className="flex-1 flex flex-col items-center justify-center min-h-0 py-4 sm:py-8 md:py-12 selection:bg-accent/10 w-full relative overflow-hidden"
              >

                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-gray-500/10[0.02] via-transparent to-transparent pointer-events-none select-none" />

                <div className="w-full max-w-4xl px-6 flex flex-col items-center text-center relative z-10">
                  {selectedTool === 'chat' ? (
                    <>
                      <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-[var(--text-primary)] tracking-tight mb-3">
                        {dir === 'rtl' 
                          ? `مرحباً بك، ${user?.name || 'عضو بيربليكستا النخبة'}`
                          : `Welcome back, ${user?.name || 'Perplexta Elite Member'}`
                        }
                      </h1>

                      <p className="text-xs sm:text-sm text-gray-500 uppercase tracking-widest font-black leading-relaxed max-w-xl mb-4">
                        {dir === 'rtl'
                          ? 'ما الذي تود تحليله أو استكشافه اليوم؟'
                          : 'What would you like to analyze or explore today?'
                        }
                      </p>

                      <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-gray-500/10 to-transparent" />
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center py-6 px-4 max-w-lg mx-auto w-full">
                      {(() => {
                        const { greeting, promptIntro } = getToolWelcomeIntro(selectedTool);
                        return (
                          <>
                            <h2 className="text-lg sm:text-xl font-black text-[var(--text-primary)] tracking-tight mb-2">
                              {greeting}
                            </h2>
                            <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-bold leading-relaxed max-w-md">
                              {promptIntro}
                            </p>
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="chat-thread-view"
                initial={{ opacity: 0, filter: "blur(3px)" }}
                animate={{ opacity: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, filter: "blur(3px)" }}
                transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col gap-4 md:gap-6 max-w-4xl mx-auto w-full px-8 md:px-6 pt-4"
              >
              {messages.map((msg, idx) => {
                return (
                  <motion.div 
                    key={`msg-${msg.client_id || msg.id || idx}-${idx}`} 
                    id={`message-${idx}`}
                    className={`w-full ${msg.role === 'user' ? 'user-message-anchor' : ''}`}
                  >
                    <div className={`w-full min-h-[44px] ${msg.role === 'user' ? 'bg-transparent' : 'bg-transparent'} px-0`}>
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
                                    <div className="w-10 h-10 rounded-[var(--radius)] bg-accent/10 flex items-center justify-center text-accent">
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
                                      className="px-4 py-1.5 text-[10px] uppercase font-bold bg-accent text-white rounded-[var(--radius)] hover:bg-accent transition-theme"
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
                                    <div className="flex items-center gap-1 bg-accent/10 px-1.5 py-0.5 rounded-[4px] border border-accent/20 shadow-[0_0_10px_rgba(156,163,175,0.1)] shrink-0 scale-90">
                                      <Pin size={8} className="text-accent" />
                                      <span className="text-[7px] font-black uppercase text-accent/80 tracking-tighter">Pinned</span>
                                    </div>
                                  )}

                                  <div className="flex items-center gap-1 opacity-70 sm:opacity-0 group-hover:opacity-100 transition-opacity duration-200 shrink-0">
                                    <button 
                                      onClick={() => handleCopyPrompt(msg.content, idx)}
                                      className="p-1.5 rounded-md hover:bg-[var(--bg-overlay)] text-gray-400 hover:text-accent transition-theme shrink-0 active:scale-95 cursor-pointer"
                                      title={dir === 'rtl' ? 'نسخ البرومبت' : 'Copy Prompt'}
                                    >
                                      {copiedPromptIndex === idx ? (
                                        <Check size={13} className="text-[var(--fg-success)]" />
                                      ) : (
                                        <Copy size={13} />
                                      )}
                                    </button>
                                    <button 
                                      onClick={() => handlePinMessage(msg.id!, !msg.is_pinned)}
                                      className={`p-1.5 rounded-md hover:bg-[var(--bg-overlay)] transition-theme shrink-0 ${
                                        msg.is_pinned ? 'text-accent hover:text-accent' : 'text-gray-400 hover:text-accent'
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
                                      className="p-1.5 rounded-md hover:bg-[var(--bg-overlay)] text-gray-400 hover:text-accent transition-theme shrink-0"
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
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                        className="markdown-body prose dark:prose-invert max-w-none relative text-[13px] md:text-base leading-relaxed tracking-tight"
                      >
                        {!msg.is_quota_error && !msg.is_system_inactive && msg.tool !== 'video' && msg.tool !== 'image' && (
                          <ToolStatusIndicator 
                            tool={msg.tool} 
                            isGenerating={isGenerating && idx === messages.length - 1} 
                            dir={dir} 
                            t={t} 
                          />
                        )}
                        {isGenerating && idx === messages.length - 1 && msg.content === '' && (!msg.thinking_steps || msg.thinking_steps.length === 0) ? (
                          msg.tool === 'video' ? (
                            <SimpleVideoLoadingPlaceholder dir={dir} aspectRatio={videoSettings?.aspectRatio || '9:16'} />
                          ) :
                          msg.tool === 'image' ? (
                            <SimpleImageLoadingPlaceholder dir={dir} aspectRatio={imageSettings?.aspectRatio || '1:1'} />
                          ) : (
                            <ResponseSkeleton dir={dir} />
                          )
                        ) : msg.is_image_failed ? (
                          <SimpleImageErrorPlaceholder 
                            dir={dir} 
                            errorMessage={msg.content}
                            aspectRatio={imageSettings?.aspectRatio || '1:1'}
                            onRetry={() => {
                              const userPrompt = findUserPrompt(idx);
                              if (userPrompt) {
                                handleSendOrStop(userPrompt, messages.slice(0, idx - 1));
                              }
                            }}
                          />
                        ) : msg.is_video_failed ? (
                          <SimpleVideoErrorPlaceholder 
                            dir={dir} 
                            errorMessage={msg.content}
                            aspectRatio={videoSettings?.aspectRatio || '9:16'}
                            onRetry={() => {
                              const userPrompt = findUserPrompt(idx);
                              if (userPrompt) {
                                handleSendOrStop(userPrompt, messages.slice(0, idx - 1));
                              }
                            }}
                          />
                        ) : msg.is_quota_error ? (
                           <QuotaExceededCard tool={msg.tool} data={msg.quota_data} dir={dir} navigate={navigate} user={user} />
                        ) : msg.is_insufficient_funds ? (
                           <InsufficientFundsCard data={msg.quota_data} dir={dir} navigate={navigate} user={user} />
                        ) : msg.is_system_inactive ? (
                           <SystemInactiveCard data={msg.quota_data} dir={dir} />
                        ) : (
                          <>
                            {msg.is_pinned && (
                              <div className="absolute -top-4 -start-2 flex items-center gap-1 bg-accent/10 px-1.5 py-0.5 rounded-md border border-accent/20 shadow-[0_0_10px_rgba(156,163,175,0.1)] z-10 scale-75 md:scale-90 origin-top-left">
                                <Pin size={10} className="text-accent" />
                                <span className="text-[9px] font-black uppercase text-accent tracking-tighter">Pinned Response</span>
                              </div>
                            )}
                            <ThinkingSteps 
                              steps={msg.thinking_steps?.map(s => (!isGenerating || idx < messages.indexOf(msg)) ? { ...s, status: 'completed' as const } : s)} 
                              dir={dir} 
                              query={messages.slice(0, idx).reverse().find(m => m.role === 'user')?.content || ''}
                            />
                            {(msg.tool === 'canvas') ? (
                              <ProductionSuite content={stripProtocolMarkers(msg.content)} dir={dir} theme={theme} />
                            ) : (
                              <Markdown 
                                remarkPlugins={[remarkGfm]} 
                                components={{ 
                                  ...chatMarkdownComponents,
                                  p: ({ children, node }: any) => {
                                    const isLastMessage = idx === messages.length - 1;
                                    const isStreamingActive = isLastMessage && msg.is_streaming;

                                    const isLastParagraph = node && node.parent && node.parent.children[node.parent.children.length - 1] === node;

                                    return (
                                      <div className="last:mb-0 mb-3 text-sm leading-relaxed text-slate-900 dark:text-slate-100 antialiased font-normal">
                                        {renderChildrenWithCitations(children, msg)}
                                        {isStreamingActive && isLastParagraph && (
                                          <span className="typing-cursor-accent" />
                                        )}
                                      </div>
                                    );
                                  }
                                }}
                              >
                                {stripProtocolMarkers(msg.content)}
                              </Markdown>
                      )}

                      {(() => {
                        const messageFollowUps = (msg.follow_ups && msg.follow_ups.length > 0) 
                          ? msg.follow_ups 
                          : (idx === messages.length - 1 && aiSuggestions.length > 0 ? aiSuggestions : extractFollowUpsClient(msg.content).followUps);
                        const hasCitations = !!(msg.citations && msg.citations.length > 0);
                        const hasFollowUps = !!(messageFollowUps && messageFollowUps.length > 0) && msg.tool !== 'image' && msg.tool !== 'video';

                        if (!hasCitations && !hasFollowUps) return null;

                        return (
                          <>
                            {hasCitations && (
                              <Citations 
                                citations={msg.citations} 
                                dir={dir} 
                                isOpen={!!openCitationsMap[idx]}
                                onToggle={() => setOpenCitationsMap(prev => ({ ...prev, [idx]: !prev[idx] }))}
                                query={messages.slice(0, idx).reverse().find(m => m.role === 'user')?.content || ''}
                              />
                            )}
                            <AnimatePresence mode="wait">
                              {(!isGenerating || idx < messages.length - 1) && hasFollowUps && (
                                <motion.div
                                  key={`follow-ups-${idx}-${msg.id || idx}`}
                                  initial={{ opacity: 0, y: 3, filter: "blur(2px)" }}
                                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                                  exit={{ opacity: 0, filter: "blur(2px)" }}
                                  transition={{ duration: 0.15, ease: "easeOut" }}
                                >
                                  <FollowUps followUps={messageFollowUps} onSelect={(q) => handleSendOrStop(q)} dir={dir} />
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </>
                        );
                      })()}
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
                          className={`w-7 h-7 sm:w-10 sm:h-10 flex items-center justify-center rounded-sm transition-theme ${msg.feedback === 1 ? 'text-accent bg-accent/10 border-accent/20 shadow-[0_0_10px_rgba(156,163,175,0.3)]' : 'bg-transparent border border-transparent hover:bg-[var(--bg-overlay)] text-[var(--text-muted)] hover:text-accent hover:'}`}
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
                          className={`hidden sm:flex w-7 h-7 sm:w-10 sm:h-10 items-center justify-center rounded-sm bg-transparent border transition-theme ${msg.is_pinned ? 'text-accent bg-accent/10 border-accent/20 shadow-[0_0_10px_rgba(156,163,175,0.3)]' : 'border-transparent text-[var(--text-muted)] hover:text-accent hover:bg-accent/5'}`}
                        >
                          {msg.is_pinned ? <PinOff size={13} /> : <Pin size={13} />}
                        </motion.button>
                        <motion.button 
                          
                          onClick={() => handleTTS(msg.content, msg.client_id || msg.id || idx)}
                          title={playingTTSId === (msg.client_id || msg.id || idx) ? (dir === 'rtl' ? 'إيقاف الصوت' : 'Stop') : (dir === 'rtl' ? 'قراءة صوتية' : 'Read Aloud')}
                          className={`hidden sm:flex w-7 h-7 sm:w-10 sm:h-10 items-center justify-center rounded-sm bg-transparent border transition-theme ${playingTTSId === (msg.client_id || msg.id || idx) ? 'text-accent bg-accent/10 border-accent/20 shadow-[0_0_10px_rgba(156,163,175,0.3)]' : 'border-transparent text-[var(--text-muted)] hover:bg-[var(--bg-overlay)] hover:text-accent hover:'}`}
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
                          className={`w-7 h-7 sm:w-10 sm:h-10 flex items-center justify-center rounded-sm bg-transparent border border-transparent hover:bg-[var(--bg-overlay)] text-[var(--text-muted)] hover:text-accent hover: transition-theme ${isGenerating && idx === messages.length - 1 ? 'animate-spin opacity-50' : ''}`}
                        >
                          <RefreshCw size={13} />
                        </motion.button>
                        <motion.button 
                          
                          onClick={() => {
                            navigator.clipboard.writeText(msg.content);
                            toast.success(dir === 'rtl' ? 'تم النسخ بنجاح' : 'Copied successfully');
                          }}
                          title={dir === 'rtl' ? 'نسخ' : 'Copy'}
                          className="w-7 h-7 sm:w-10 sm:h-10 flex items-center justify-center rounded-sm bg-transparent border border-transparent hover:bg-[var(--bg-overlay)] text-gray-400 hover:text-accent hover: transition-theme"
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
                          className="hidden sm:flex w-7 h-7 sm:w-10 sm:h-10 items-center justify-center rounded-sm bg-transparent border border-transparent hover:bg-[var(--bg-overlay)] text-gray-400 hover:text-accent hover: transition-theme"
                        >
                          <Download size={13} />
                        </motion.button>
                        {msg.id && (
                          <motion.button 
                            
                            id={`fork-btn-${msg.id}`}
                            onClick={() => handleForkThread(msg.id!)}
                            title={dir === 'rtl' ? 'تفريع المحادثة' : 'Fork Thread'}
                            className="hidden sm:flex w-10 h-10 items-center justify-center rounded-[4px] bg-transparent border border-transparent text-gray-400 hover:text-accent hover: hover:bg-gray-50 dark:hover:bg-gray-800 transition-theme"
                          >
                            <GitFork size={13} />
                          </motion.button>
                        )}
                      </div>

                      <div className="flex items-center gap-1 sm:gap-2">
                        {msg.generation_time !== undefined && (
                          <motion.div 
                            
                            className="flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] bg-accent/5 dark:bg-accent/5 border border-accent/10 text-accent select-none mr-1 sm:mr-2"
                          >
                            <Zap size={10} className="text-accent" />
                            <span className="text-[10px] font-mono leading-none font-semibold">
                              {Number(msg.generation_time).toFixed(2)}s
                            </span>
                          </motion.div>
                        )}
                        <motion.button 
                          
                          onClick={() => {
                            const userMsg = messages.slice(0, idx).reverse().find(m => m.role === 'user');
                            const smartTitle = userMsg ? userMsg.content.slice(0, 80) : '';
                            
                            setShareMsgContent(msg.content);
                            setShareMsgTitle(smartTitle);
                            setShareMsgModel((msg as any).model_name || (msg as any).provider || 'Perplexta Intelligence');
                            setGeneratedShareId('');
                            setIsGeneratingShare(false);
                            setIsShareModalOpen(true);
                          }}
                          title={dir === 'rtl' ? 'مشاركة كلقطة اجتماعية' : 'Share to Social'}
                          className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-[var(--radius)] bg-[var(--bg-overlay)] border border-[var(--border)] text-accent shadow-[0_0_15px_rgba(156,163,175,0.15)] hover:bg-accent/10 transition-theme ml-1 sm:ml-2"
                        >
                          <Share2 size={14} className="" />
                        </motion.button>

                         <motion.div  className="relative">
                           <button 
                             onClick={() => setOpenMenuId(openMenuId === (msg.id?.toString() || idx.toString()) ? null : (msg.id?.toString() || idx.toString()))}
                             className={`w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-[var(--radius)] transition-theme ${openMenuId === (msg.id?.toString() || idx.toString()) ? 'text-accent bg-accent/10' : 'bg-transparent border border-transparent hover:bg-[var(--bg-overlay)] text-[var(--text-muted)] hover:text-accent'}`}
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
                                   <Bookmark size={15} className="text-gray-400 group-hover:text-accent transition-theme" />
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
                    className="flex items-center gap-3 px-4 py-2 border rounded-[4px] w-fit bg-accent/5 border-accent/10 text-accent select-none shadow-[0_0_15px_rgba(156,163,175,0.1)] mb-4 shrink-0 transition-theme"
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
                        <span className="text-accent/75 dark:text-accent font-mono text-[10px] ml-1 bg-accent/10 dark:bg-accent/10 px-1.5 py-0.5 rounded-[4px] leading-none">
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

      <div className="w-full flex-shrink-0 px-0 md:px-4 pb-[calc(6px+env(safe-area-inset-bottom,0px))] sm:pb-3 pt-1 bg-transparent relative">
        <AnimatePresence>
          {showScrollToBottom && (
            <motion.button
              key="scroll-to-bottom-btn"
              initial={{ opacity: 0, y: 10, x: "-50%", scale: 0.8 }}
              animate={{ opacity: 1, y: 0, x: "-50%", scale: 1 }}
              exit={{ opacity: 10, x: "-50%", scale: 0.8 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              onClick={() => scrollToBottom('smooth')}
              style={{ left: '50%' }}
              className="absolute bottom-full mb-3 z-40 flex items-center justify-center p-2 text-gray-400 hover:text-accent hover: transition-theme cursor-pointer active:scale-95 bg-transparent border-0"
              title={dir === 'rtl' ? 'الرجوع للأسفل' : 'Scroll to Bottom'}
            >
              <ArrowDown size={22} className="animate-[bounce_2s_infinite]" />
            </motion.button>
          )}
        </AnimatePresence>

        <div className="max-w-3xl mx-auto w-full text-[var(--text-primary)]">
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
                  <div className="w-10 h-10 rounded-md bg-accent/10 flex items-center justify-center text-accent">
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
                    <Pin size={32} className="text-[var(--text-muted)] opacity-35 mb-3 animate-pulse text-accent/40" />
                    <p className="text-[12px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                      {dir === 'rtl' ? 'لا توجد رسائل مثبتة حالياً' : 'No pinned messages yet'}
                    </p>
                    <p className="text-[10px] text-gray-500 mt-1 max-w-[280px] leading-relaxed">
                      {dir === 'rtl' ? 'ثبّت الرسائل المهمة في المحادثة لتبقى محفوظة هنا.' : 'Pin important questions or responses to view them in this list.'}
                    </p>
                  </div>
                ) : (
                  messages.filter(m => m.is_pinned).map((msg, pIdx) => (
                    <div key={`pinned-msg-${msg.id || pIdx}-${pIdx}`} className="group relative p-4 rounded-md bg-[var(--bg-secondary)] border border-[var(--border-main)] hover:border-accent/30 transition-theme">
                      <div className="flex items-center justify-between mb-2">
                         <span className="text-[9px] font-black uppercase tracking-[0.2em] text-accent">
                           {msg.role === 'user' ? (dir === 'rtl' ? 'البرومبت' : 'Your Prompt') : (dir === 'rtl' ? 'إجابة بيربليكستا' : 'Perplexta Answer')}
                         </span>
                         <div className="flex items-center gap-1">
                           <button
                             onClick={() => {
                               navigator.clipboard.writeText(stripProtocolMarkers(msg.content));
                               toast.success(dir === 'rtl' ? 'تم نسخ النص بنجاح' : 'Copied successfully');
                             }}
                             className="text-gray-400 hover:text-accent transition-theme p-1.5 rounded-sm hover:bg-[var(--bg-overlay)] cursor-pointer"
                             title={dir === 'rtl' ? 'نسخ' : 'Copy'}
                           >
                             <Copy size={12} />
                           </button>
                           <button
                             onClick={() => handlePinMessage(msg.id!, false)}
                             className="text-gray-400 hover:text-accent transition-theme p-1.5 rounded-sm hover:bg-[var(--bg-overlay)] cursor-pointer"
                             title={dir === 'rtl' ? 'إلغاء التثبيت' : 'Unpin'}
                           >
                             <PinOff size={12} />
                           </button>
                         </div>
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
                  <div className="w-10 h-10 rounded-md bg-accent/10 flex items-center justify-center text-accent ">
                    <Sparkles size={20} className="animate-pulse" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black uppercase tracking-widest text-accent">
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
                    <Loader2 size={36} className="text-accent animate-spin mb-4" />
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
                            <li key={`forensic-anomaly-${aIdx}`}>{anomaly}</li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <div className="p-4 rounded-md bg-accent/20 border border-accent/40 text-accent">
                        <div className="flex items-center gap-2 font-black text-xs tracking-wider uppercase">
                          <Check size={14} className="text-accent" />
                          <span>{dir === 'rtl' ? 'التحقق السليم لهيكل الملف' : 'Document Format Integrity Verified'}</span>
                        </div>
                        <p className="text-[10px] text-accent/75 mt-1">
                          No deceptive multi-incremental states or nested active script payloads detected in this scope.
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                      <div className="space-y-4">
                        <h3 className="text-xs font-black uppercase tracking-widest text-accent/80 mb-2">
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
                            <span className="font-mono font-bold text-accent">{forensicReport.totalObjectsCount}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-gray-400">{dir === 'rtl' ? 'مجموعات المحتوى الاختياري OCG (الأطياف)' : 'Optional Content Layers (OCG)'}</span>
                            <span className="font-mono font-bold text-accent">{forensicReport.optionalContentGroupsCount}</span>
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
                                <span key={`forensic-layer-${lIdx}-${layer}`} className="text-[9px] font-bold tracking-tight bg-accent/10 border border-accent/20 text-accent px-2 py-1 rounded-[4px]">
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
                        <h3 className="text-xs font-black uppercase tracking-widest text-accent/80 mb-2">
                          {dir === 'rtl' ? 'سجل البيانات الوصفية الملحقة' : 'Embedded Metadata Trail'}
                        </h3>
                        <div className="bg-[#121214] border border-gray-800/60 rounded-md p-4 space-y-4">
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">{dir==='rtl'?'العنوان':'Title'}</span>
                            <p className="text-xs text-gray-200 mt-1 font-semibold">{forensicReport.metadata.title !== 'N/A' ? forensicReport.metadata.title : (dir==='rtl'?'غير محدد':'None')}</p>
                          </div>
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">{dir==='rtl'?'المؤلف / المالك المصدري':'Author / Owner'}</span>
                            <p className="text-xs mt-1 font-semibold text-accent">{forensicReport.metadata.author !== 'N/A' ? forensicReport.metadata.author : (dir==='rtl'?'غير محدد':'None')}</p>
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
                      <h3 className="text-xs font-black uppercase tracking-widest text-accent/80 mb-2">
                        {dir === 'rtl' ? 'سجل الفحص المعالج خطوة بخطوة' : 'Scanner Processing Stream Logs'}
                      </h3>
                      <div className="bg-[#0b0b0c] border border-gray-900 rounded p-4 font-mono text-[9px] text-gray-400 space-y-1 max-h-[160px] overflow-y-auto custom-scrollbar">
                        {forensicReport.detailedLog.map((log: string, lIdx: number) => (
                          <div key={`forensic-log-${lIdx}`} className="leading-relaxed hover:text-accent transition-colors">
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
                  className="px-5 py-2.5 rounded-[4px] bg-accent hover:bg-accent text-black font-black text-xs uppercase tracking-widest transition-theme cursor-pointer border-transparent"
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
              className="relative max-w-sm w-full p-6 rounded-[var(--radius-lg)] border border-[var(--border-main)] bg-[var(--surface-card)] text-[var(--text-primary)] shadow-2xl transition-theme z-10"
            >
              <h3 className="text-base font-bold tracking-tight font-sans text-start text-[var(--fg-danger)]">
                {dir === 'rtl' ? 'حذف المحادثة؟' : 'Delete conversation?'}
              </h3>

              <p className="text-xs mt-2 font-sans text-start text-[var(--text-secondary)]">
                {dir === 'rtl' 
                  ? 'سيؤدي هذا إلى حذف المحادثة الحالية وجميع الرسائل المرتبطة بها نهائيًا ولا يمكن التراجع عن هذا العمل.' 
                  : 'This will permanently delete the current conversation and all associated messages. This action cannot be undone.'}
              </p>

              <div className={`flex justify-end gap-2.5 mt-6 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-[var(--radius-sm)] font-sans transition-theme text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)]"
                >
                  {dir === 'rtl' ? 'إلغاء' : 'Cancel'}
                </button>

                <button
                  type="button"
                  onClick={handleThreadDeleteConfirm}
                  className="px-4 py-2 text-xs font-bold bg-[var(--status-danger)] hover:opacity-90 text-white rounded-[var(--radius-sm)] font-sans transition-theme shadow-sm"
                >
                  {dir === 'rtl' ? 'تأكيد الحذف' : 'Confirm Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {isShareModalOpen && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4" dir={dir}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsShareModalOpen(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className={`relative max-w-md w-full p-6 rounded-xl border shadow-2xl transition-theme z-10 ${
                theme === 'dark' 
                  ? 'bg-[#161618] border-zinc-800 text-gray-100' 
                  : 'bg-white border-gray-150 text-gray-900'
              }`}
            >
              <h3 className="text-base font-bold tracking-tight font-sans text-start text-accent dark:text-accent flex items-center gap-2">
                <Share2 size={16} />
                {dir === 'rtl' ? 'مشاركة اللقطة مع الشبكات الاجتماعية' : 'Share Snapshot to Social'}
              </h3>

              {!generatedShareId ? (
                /* Step 1: Customize Title & Generate */
                <div className="mt-4 space-y-4">
                  <p className={`text-xs font-sans text-start ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    {dir === 'rtl' 
                      ? 'قم بتوليد رابط عام للقطة جميلة من هذا التحليل لتشاركه على منصات التواصل الاجتماعي.' 
                      : 'Generate a public link with a beautiful snapshot of this strategic insight to share across social platforms.'}
                  </p>

                  <div className="space-y-1 text-start">
                    <label className="text-[10px] font-mono text-gray-500 uppercase tracking-wider block">
                      {dir === 'rtl' ? 'عنوان اللقطة (اختياري)' : 'Snapshot Title (Optional)'}
                    </label>
                    <input
                      type="text"
                      value={shareMsgTitle}
                      onChange={(e) => setShareMsgTitle(e.target.value)}
                      placeholder={dir === 'rtl' ? 'مثال: تحليل البيتكوين الاستراتيجي...' : 'e.g., Strategic Bitcoin Analysis...'}
                      className={`w-full px-3 py-2 text-xs font-sans rounded-[4px] border outline-none transition-theme ${
                        theme === 'dark' 
                          ? 'bg-[#1e1e21] border-zinc-800 text-white focus:border-accent' 
                          : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-accent'
                      }`}
                    />
                  </div>

                  <div className={`flex justify-end gap-2.5 mt-6 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                    <button
                      type="button"
                      disabled={isGeneratingShare}
                      onClick={() => setIsShareModalOpen(false)}
                      className={`px-4 py-2 text-xs font-semibold rounded-[4px] font-sans transition-theme ${
                        theme === 'dark' 
                          ? 'text-gray-400 hover:text-white hover:bg-[#252528]' 
                          : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
                      }`}
                    >
                      {dir === 'rtl' ? 'إلغاء' : 'Cancel'}
                    </button>

                    <button
                      type="button"
                      disabled={isGeneratingShare}
                      onClick={async () => {
                        try {
                          setIsGeneratingShare(true);
                          const res = await fetch('/api/share-snapshot', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({
                              content: shareMsgContent,
                              title: shareMsgTitle,
                              model_name: shareMsgModel
                            })
                          });

                          if (!res.ok) throw new Error('Failed to generate snapshot');
                          const data = await res.json();
                          setGeneratedShareId(data.id);
                          toast.success(dir === 'rtl' ? 'تم توليد اللقطة بنجاح!' : 'Snapshot generated successfully!');
                        } catch (err: any) {
                          toast.error(dir === 'rtl' ? 'فشل توليد اللقطة العامة' : 'Failed to generate snapshot');
                        } finally {
                          setIsGeneratingShare(false);
                        }
                      }}
                      className="px-4 py-2 text-xs font-extrabold bg-accent hover:bg-accent text-black rounded-[4px] font-sans transition-theme shadow-[0_0_12px_rgba(156,163,175,0.25)] flex items-center gap-1.5"
                    >
                      {isGeneratingShare ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-[4px] animate-spin" />
                          <span>{dir === 'rtl' ? 'جاري التوليد...' : 'Generating...'}</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={13} />
                          <span>{dir === 'rtl' ? 'توليد اللقطة' : 'Generate'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                /* Step 2: Share Links & Copier */
                <div className="mt-4 space-y-5">
                  <p className={`text-xs font-sans text-start ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    {dir === 'rtl' 
                      ? 'لقد تم توليد لقطتك العامة بنجاح! انسخ الرابط أدناه أو شاركه مباشرة على شبكاتك المفضلة.' 
                      : 'Your public snapshot has been generated! Copy the link below or share it directly with your networks.'}
                  </p>

                  {/* Share Link Copier Field */}
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      readOnly
                      value={`${window.location.origin}/share/${generatedShareId}`}
                      className={`w-full pe-10 ps-3 py-2 text-[11px] font-mono rounded-[4px] border outline-none ${
                        theme === 'dark' 
                          ? 'bg-[#1e1e21] border-zinc-800 text-gray-300' 
                          : 'bg-gray-50 border-gray-200 text-gray-600'
                      }`}
                    />
                    <button
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(`${window.location.origin}/share/${generatedShareId}`);
                          toast.success(dir === 'rtl' ? 'تم نسخ الرابط!' : 'Link copied!');
                        } catch (e) {}
                      }}
                      className="absolute right-2 text-accent hover:text-accent p-1"
                    >
                      <Copy size={14} />
                    </button>
                  </div>

                  {/* Social Buttons row */}
                  <div className="flex items-center justify-center gap-3 py-2 border-t border-b border-zinc-200 dark:border-zinc-800">
                    {/* X / Twitter */}
                    <button
                      onClick={() => {
                        const targetUrl = `${window.location.origin}/share/${generatedShareId}`;
                        const tweetText = dir === 'rtl' ? `شاهد هذا التحليل التقني المذهل على بيربليكستا!` : `Check out this technical insight on Perplexta!`;
                        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(targetUrl)}`, '_blank');
                      }}
                      className="w-10 h-10 rounded-[4px] bg-[var(--bg-overlay)] border border-[var(--border)] hover:border-accent/30 flex items-center justify-center text-[var(--text-muted)] hover:text-accent transition-theme"
                      title="Share on X"
                    >
                      <Twitter size={16} />
                    </button>

                    {/* LinkedIn */}
                    <button
                      onClick={() => {
                        const targetUrl = `${window.location.origin}/share/${generatedShareId}`;
                        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(targetUrl)}`, '_blank');
                      }}
                      className="w-10 h-10 rounded-[4px] bg-[var(--bg-overlay)] border border-[var(--border)] hover:border-accent/30 flex items-center justify-center text-[var(--text-muted)] hover:text-accent transition-theme"
                      title="Share on LinkedIn"
                    >
                      <Linkedin size={16} />
                    </button>

                    {/* Telegram */}
                    <button
                      onClick={() => {
                        const targetUrl = `${window.location.origin}/share/${generatedShareId}`;
                        const tText = dir === 'rtl' ? `شاهد هذا التحليل التقني المذهل على بيربليكستا!` : `Check out this technical insight on Perplexta!`;
                        window.open(`https://t.me/share/url?url=${encodeURIComponent(targetUrl)}&text=${encodeURIComponent(tText)}`, '_blank');
                      }}
                      className="w-10 h-10 rounded-[4px] bg-[var(--bg-overlay)] border border-[var(--border)] hover:border-accent/30 flex items-center justify-center text-[var(--text-muted)] hover:text-accent transition-theme"
                      title="Share on Telegram"
                    >
                      <Send size={16} />
                    </button>

                    {/* WhatsApp */}
                    <button
                      onClick={() => {
                        const targetUrl = `${window.location.origin}/share/${generatedShareId}`;
                        const waText = dir === 'rtl' ? `شاهد هذا التحليل التقني المذهل على بيربليكستا!` : `Check out this technical insight on Perplexta!`;
                        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(waText + ' ' + targetUrl)}`, '_blank');
                      }}
                      className="w-10 h-10 rounded-[4px] bg-[var(--bg-overlay)] border border-[var(--border)] hover:border-accent/30 flex items-center justify-center text-[var(--text-muted)] hover:text-accent transition-theme"
                      title="Share on WhatsApp"
                    >
                      <MessageSquare size={16} />
                    </button>
                  </div>

                  <div className="flex justify-end mt-4">
                    <button
                      type="button"
                      onClick={() => setIsShareModalOpen(false)}
                      className="px-5 py-2 text-xs font-bold bg-zinc-800 hover:bg-zinc-750 text-white rounded-[4px] font-sans transition-theme border border-zinc-700/60"
                    >
                      {dir === 'rtl' ? 'إغلاق' : 'Close'}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </motion.div>
    </ErrorBoundary>
  );
};

export default ChatPage;

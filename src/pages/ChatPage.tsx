import { MemoryNotification } from '../components/MemoryNotification';
import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MessageSquare, Music, Play, Plus, Mic, MicOff, Send, Globe, LayoutGrid, Zap, Code, FileText, Image as ImageIcon, Sparkles, Brain, Video, Volume2, Search, BookOpen, Square, AlertTriangle, Paperclip, Copy, Download, Scale, Megaphone, Maximize, ThumbsUp, ThumbsDown, Share2, RefreshCw, MoreHorizontal, Bookmark, Flag, Trash2, Check, Pencil, X, Pin, PinOff, FileDown, FileCode, FolderPlus, Loader2, Library, ExternalLink, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import { useSocket } from '../context/SocketContext';
import { useUI } from '../context/UIContext';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { encrypt } from '../utils/browserCrypto';
import { motion, AnimatePresence } from 'motion/react';
import { sovereignPageTransition } from '../constants/motions';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

// Custom hook for responsive behavior
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
};

const springConfig = { type: "spring" as const, stiffness: 300, damping: 30 };

const ResponseSkeleton = ({ dir }: { dir: 'ltr' | 'rtl' }) => (
  <div className="flex flex-col gap-3 w-full animate-pulse transition-all duration-700">
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

const CodeBlock = ({ inline, className, children, ...props }: any) => {
  const { dir } = useTheme();
  const match = /language-(\w+)/.exec(className || '');
  const lang = match ? match[1] : 'text';
  const codeContent = String(children).trim();

  const isMediaUrl = (codeContent.startsWith('http') || codeContent.startsWith('/')) && (codeContent.includes('.png') || codeContent.includes('.jpg') || codeContent.includes('.mp4') || codeContent.includes('.gif') || codeContent.includes('.mp3') || codeContent.includes('.wav') || codeContent.includes('.ogg'));

  const copyToClipboard = () => {
    navigator.clipboard.writeText(codeContent);
  };

  const downloadCode = () => {
    const blob = new Blob([codeContent], { type: 'text/plain' });
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

  if (inline) return <code className={className} {...props}>{children}</code>;

  return (
    <div className="relative group mx-auto my-6 w-full max-w-[850px] bg-transparent border-none shadow-none">
      <div className="flex items-center justify-between px-4 py-2 bg-transparent border-none">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{lang === 'audio' ? 'Sovereign Audio Slate' : lang}</span>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          {isMediaUrl ? (
            <button onClick={() => downloadFile(children)} className="p-1.5 rounded-[4px] text-[var(--text-muted)] hover:text-emerald-500 transition-colors duration-300 hover:bg-[var(--bg-overlay)] active:scale-95" title="Download">
              <Download size={13} />
            </button>
          ) : (
            <>
              <button onClick={copyToClipboard} className="p-1.5 rounded-[4px] text-[var(--text-muted)] hover:text-emerald-500 transition-all duration-300 hover:bg-[var(--bg-overlay)] active:scale-95" title="Copy code">
                <Copy size={13} />
              </button>
              <button onClick={downloadCode} className="p-1.5 rounded-[4px] text-[var(--text-muted)] hover:text-emerald-500 transition-colors duration-300 hover:bg-[var(--bg-overlay)] active:scale-95" title="Download source code">
                <FileText size={13} />
              </button>
            </>
          )}
        </div>
      </div>
      
      {lang === 'audio' ? (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, ease: "linear" }}
          className="relative overflow-hidden bg-[#0a0a0b] border border-[var(--border-main)] rounded-[4px] p-8 flex flex-col items-center gap-6 shadow-2xl"
        >
          {/* Audio Background Glow */}
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent pointer-events-none" />
          
          <div className="relative">
             <div className="absolute inset-0 bg-emerald-500/20 blur-2xl rounded-full" />
             <div className="relative w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                >
                  <Volume2 size={32} />
                </motion.div>
             </div>
          </div>

          <div className="text-center space-y-1">
            <h3 className="text-xs font-black text-emerald-500 tracking-[0.2em] uppercase">Sovereign Orchestra Master</h3>
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
            className="flex items-center gap-2 px-8 py-3 bg-emerald-500 text-white hover:bg-emerald-600 rounded-[4px] text-[11px] font-black uppercase tracking-[0.1em] transition-all duration-300 active:scale-95 shadow-[0_10px_25px_rgba(16,185,129,0.3)] group-hover:shadow-[0_15px_35px_rgba(16,185,129,0.4)]"
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
        <code className={`${className} block p-4 overflow-x-auto text-[13px] md:text-[14px] text-[var(--text-primary)] font-mono leading-relaxed bg-[var(--bg-secondary)] border border-[var(--border-main)] rounded-[4px]`} {...props}>
          {isMediaUrl ? (
            codeContent.includes('.mp3') || codeContent.includes('.wav') || codeContent.includes('.ogg') ? (
              <div className="flex flex-col items-center gap-4 py-8">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 animate-pulse">
                  <Music size={32} />
                </div>
                <span className="text-sm font-bold text-emerald-500 tracking-widest uppercase">Sonic Draft Ready</span>
                <audio controls src={codeContent} className="w-full max-w-md accent-emerald-500" />
              </div>
            ) : (
              <img src={codeContent} alt="Generated" className="max-w-full rounded-[4px]" />
            )
          ) : children}
        </code>
      )}
    </div>
  );
};

interface Message {
  id?: number;
  role: 'user' | 'assistant';
  content: string;
  tool?: string;
  feedback?: number;
  is_pinned?: boolean;
  is_quota_error?: boolean;
  is_system_inactive?: boolean;
  quota_data?: any;
  thinking_steps?: { step: string; status: 'completed' | 'processing' | 'pending' }[];
  citations?: { title: string; url: string; index: number }[];
  follow_ups?: string[];
  is_streaming?: boolean;
  file?: {
    name: string;
    type: string;
    preview?: string;
    base64?: string;
  };
}

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
      <div className="space-y-1 sm:space-y-2 ps-1.5 sm:ps-5 border-s-2 border-emerald-500/10 ml-0.5 sm:ml-2">
        {steps.map((step, idx) => (
          <motion.div 
            initial={{ opacity: 0, x: dir === 'rtl' ? 10 : -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05, duration: 0.5 }}
            key={idx} 
            className="flex items-center gap-2 sm:gap-4 group"
          >
            {step.status === 'completed' ? (
              <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-[4px] bg-emerald-500/5 flex items-center justify-center text-emerald-500/70">
                <Check size={10} strokeWidth={3} />
              </div>
            ) : step.status === 'processing' ? (
              <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-[4px] bg-emerald-500/5 flex items-center justify-center">
                <Loader2 size={10} className="animate-spin text-emerald-500/60" style={{ animationDuration: '2s' }} />
              </div>
            ) : (
              <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-[4px] bg-[var(--bg-surface)] border border-[var(--border)] flex items-center justify-center">
                <div className="w-1 h-1 rounded-full bg-[var(--text-muted)]" />
              </div>
            )}
            <span className={`text-[10px] sm:text-[12px] font-medium ${step.status === 'completed' ? 'text-[var(--text-secondary)]' : 'text-[var(--text-muted)]/60'} transition-colors truncate`}>
              {step.step}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const Citations = ({ citations, dir, isOpen, onToggle }: { citations: Message['citations'], dir: 'ltr' | 'rtl', isOpen: boolean, onToggle: () => void }) => {
  if (!citations || citations.length === 0) return null;

  const getFavicon = (url: string) => {
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    } catch {
      return null;
    }
  };

  return (
    <div className="mt-4" id="citations-container">
      <button 
        onClick={onToggle}
        className="flex items-center gap-2.5 px-4 py-2 rounded-[4px] bg-transparent border border-[var(--border-main)] hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all group shadow-sm active:scale-95"
      >
        <div className="flex -space-x-2 rtl:space-x-reverse">
          {citations.slice(0, 3).map((cite, i) => (
            <div key={i} className="w-5 h-5 rounded-[4px] bg-[var(--bg-overlay)] border border-[var(--border)] flex items-center justify-center overflow-hidden shadow-sm">
               <img 
                 src={getFavicon(cite.url) || ''} 
                 alt="" 
                 className="w-3 h-3 object-contain"
                 onError={(e) => { (e.target as HTMLImageElement).src = 'https://www.google.com/s2/favicons?domain=google.com'; }}
               />
            </div>
          ))}
        </div>
        <div className="w-px h-3 bg-[var(--border)] mx-0.5" />
        <span className="text-[11px] font-black text-[var(--text-secondary)] group-hover:text-emerald-500 transition-colors uppercase tracking-wider">
          {citations.length} {dir === 'rtl' ? 'مصادر موثقة' : 'Verified Sources'}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          className="text-[var(--text-muted)] group-hover:text-emerald-500 transition-colors"
        >
          <Plus size={12} strokeWidth={3} />
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0, y: -5 }}
            animate={{ height: 'auto', opacity: 1, y: 0 }}
            exit={{ height: 0, opacity: 0, y: -5 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="overflow-hidden"
          >
            <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {citations.map((cite, idx) => (
                <motion.a 
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.03 }}
                  key={idx}
                  href={cite.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-2.5 rounded-[4px] bg-[var(--bg-overlay)] border border-[var(--border-main)] hover:border-emerald-500/30 hover:bg-emerald-500/[0.02] hover:shadow-lg hover:shadow-emerald-500/5 transition-all group min-w-0"
                  title={cite.title}
                >
                  <div className="w-6 h-6 rounded-[4px] bg-emerald-500/10 flex items-center justify-center text-emerald-500 text-[9px] font-black flex-shrink-0 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                    {cite.index}
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-[11px] font-bold text-[var(--text-primary)] truncate group-hover:text-emerald-500 transition-colors">
                      {cite.title}
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <img src={getFavicon(cite.url) || ''} alt="" className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100 transition-opacity" />
                      <span className="text-[9px] text-[var(--text-muted)] truncate font-medium">
                        {cite.url.replace(/^https?:\/\//, '').split('/')[0]}
                      </span>
                    </div>
                  </div>
                  <ExternalLink size={11} className="text-[var(--text-muted)] group-hover:text-emerald-500 transition-colors shrink-0 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-transform" />
                </motion.a>
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
            className={`group flex items-center gap-3 sm:gap-4 px-4 py-3.5 bg-transparent border border-[var(--border-main)] hover:border-emerald-500/40 hover:bg-emerald-500/[0.03] transition-all text-start relative overflow-hidden rounded-[4px] ${
              dir === 'rtl' ? 'flex-row' : 'flex-row'
            }`}
          >
            <div className={`w-8 h-8 rounded-[4px] bg-[var(--bg-overlay)] border border-[var(--border-main)] flex items-center justify-center text-[var(--text-muted)] group-hover:text-emerald-500 group-hover:border-emerald-500/50 group-hover:shadow-[0_0_8px_rgba(16,185,129,0.3)] transition-all shrink-0 ${
              dir === 'rtl' ? 'order-first' : 'order-first'
            }`}>
               <Plus size={14} className="group-hover:scale-110 transition-transform" />
            </div>
            <span className="text-[12px] sm:text-[13px] font-bold text-[var(--text-primary)] group-hover:text-emerald-500 transition-colors flex-1 min-w-0 leading-tight">
              {q}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

const ProductionSuite = ({ content, dir, theme }: { content: string; dir: 'ltr' | 'rtl'; theme: string }) => {
  const isMobile = useIsMobile();
  // Parsing the structured output based on the SOVEREIGN CREATIVE PRODUCTION PROTOCOL
  const sections: { title: string; body: string; id: string }[] = [];
  
  // High-precision split for the three sovereign phases
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

  // Extract cover image if available for consolidated view
  const coverSection = sections.find(s => s.title.includes('الغلاف') || s.title.toLowerCase().includes('cover'));
  const coverMatch = coverSection?.body.match(/!\[.*?\]\((.*?)\)/);
  const coverImageUrl = coverMatch ? coverMatch[1] : null;

  // If no structured sections found, fallback to standard rendering
  if (sections.length === 0) {
    return <Markdown remarkPlugins={[remarkGfm]} components={{ code: CodeBlock as any, p: 'div' }}>{content}</Markdown>;
  }

  return (
    <div className="flex flex-col gap-6 md:gap-10 py-2 md:py-4 w-full">
      {sections.map((section, idx) => {
        const isMusicSection = section.title.includes('المقطع الموسيقي') || section.title.toLowerCase().includes('sonic') || section.title.toLowerCase().includes('orchestra');
        
        return (
          <motion.div
          key={section.id}
          initial={{ opacity: 0, scale: 0.98, y: 30 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ 
            duration: 0.8, 
            delay: idx * 0.25,
            ease: [0.16, 1, 0.3, 1] 
          }}
          className={`relative overflow-hidden rounded-[4px] border transition-all duration-700 group ${
            theme === 'dark' 
              ? 'bg-[#121214] border-[var(--border)] shadow-[0_20px_50px_rgba(0,0,0,0.5)]' 
              : 'bg-[var(--bg-surface)] border-[var(--border)] shadow-none'
          }`}
        >
          {/* Executive Header */}
          <div className={`px-4 md:px-8 py-4 md:py-6 border-b flex items-center justify-between ${
            theme === 'dark' ? 'border-[var(--border)] bg-[var(--bg-surface)]' : 'border-[var(--border)] bg-[var(--bg-base)]'
          }`}>
            <div className="flex items-center gap-3 md:gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-emerald-500 rounded-full blur-md opacity-20" />
                <div className="relative w-1.5 md:w-2 h-6 md:h-8 bg-emerald-500 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.4)]" />
              </div>
              <div className="flex flex-col">
                <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] md:tracking-[0.3em] text-emerald-500 mb-0.5 glow-emerald">
                  {dir === 'rtl' ? 'مرحلة الإنتاج السيادي' : 'SOVEREIGN PRODUCTION PHASE'} {idx + 1}
                </span>
                <h3 className="text-md md:text-xl font-black tracking-tight text-[var(--text-primary)] uppercase">
                  {(section.title as string).replace(/[#\d\.\[\]]/g, '').trim()}
                </h3>
              </div>
            </div>
            
            <div className="hidden md:flex items-center gap-4">
               <div className="flex flex-col items-end">
                 <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest leading-none mb-1">
                   {dir === 'rtl' ? 'حالة التشفير' : 'ENCRYPTION STATUS'}
                 </span>
                  <div className="flex items-center gap-2">
                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                   <span className="text-[10px] font-black text-emerald-500 uppercase">
                     {dir === 'rtl' ? 'نشط' : 'ACTIVE'}
                   </span>
                 </div>
               </div>
               <div className="w-px h-8 bg-[var(--border)]" />
               <div className="flex flex-col items-end">
                 <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest leading-none mb-1">
                   {dir === 'rtl' ? 'دقة الإخراج' : 'OUTPUT PRECISION'}
                 </span>
                 <span className="text-[10px] font-black text-[var(--text-primary)]">99.8%</span>
               </div>
            </div>
          </div>

            {/* Content Area */}
            <div className={`p-4 md:p-10 text-[13px] md:text-base ${isMusicSection ? 'text-center' : ''}`}>
              <div className="markdown-body prose dark:prose-invert max-w-none prose-p:leading-relaxed prose-headings:mb-4 prose-headings:mt-8">
                {isMusicSection ? (
                  <div className="flex flex-col items-center gap-6 md:gap-8">
                    {/* Visual Exhibition */}
                    <div className="relative w-full max-w-3xl aspect-video rounded-[4px] overflow-hidden border border-emerald-500/20 shadow-2xl group/video bg-black mx-auto">
                      {coverImageUrl ? (
                        <img 
                          src={coverImageUrl} 
                          className="w-full h-full object-cover transition-transform duration-1000 group-hover/video:scale-105 opacity-60" 
                          referrerPolicy="no-referrer" 
                          alt="Orchestra Cover" 
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
                           <Music className="text-[var(--text-primary)]" size={isMobile ? 60 : 120} />
                        </div>
                      )}
                      
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 md:gap-4">
                         <motion.div 
                           animate={{ scale: [1, 1.1, 1] }}
                           transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                           className="w-16 h-16 md:w-24 md:h-24 rounded-full bg-emerald-500/20 backdrop-blur-xl border border-emerald-500/40 flex items-center justify-center text-emerald-500 shadow-[0_0_50px_rgba(16,185,129,0.3)]"
                         >
                           <Play size={isMobile ? 24 : 40} className="ml-1" />
                         </motion.div>
                         <div className="text-center px-4 md:px-6">
                            <h4 className="text-sm md:text-xl font-black text-white tracking-widest uppercase mb-1 drop-shadow-md">
                              {dir === 'rtl' ? 'تحفة الأوركسترا السيادية' : 'SOVEREIGN ORCHESTRA MASTERPIECE'}
                            </h4>
                            <p className="text-[8px] md:text-[10px] text-emerald-400 font-bold tracking-[0.2em] uppercase">
                              {dir === 'rtl' ? 'جودة استوديو 24 بت' : '24-BIT STUDIO QUALITY'}
                            </p>
                         </div>
                      </div>

                      {/* Visualizer bars */}
                      <div className="absolute bottom-0 left-0 w-full h-8 md:h-12 flex items-end justify-center gap-1 md:gap-1.5 px-4 md:px-10 pb-2 md:pb-4 opacity-50">
                        {Array.from({ length: isMobile ? 20 : 40 }).map((_, i) => (
                           <motion.div 
                             key={i}
                             animate={{ height: [4, Math.random() * (isMobile ? 12 : 24) + 4, 4] }}
                             transition={{ duration: 0.5 + Math.random(), repeat: Infinity }}
                             className="w-0.5 md:w-1 bg-emerald-500/60 rounded-full"
                           />
                        ))}
                      </div>
                    </div>

                    <Markdown 
                      remarkPlugins={[remarkGfm]} 
                      components={{ 
                        code: CodeBlock as any,
                        // Suppress images in the body of this section if we already used the cover
                        img: () => null,
                        p: 'div'
                      }}
                    >
                      {section.body}
                    </Markdown>
                  </div>
                ) : (
                  <Markdown 
                    remarkPlugins={[remarkGfm]} 
                    components={{ 
                      code: CodeBlock as any,
                      p: 'div',
                      img: ({ node, ...props }: any) => (
                        <div className="relative w-full aspect-video rounded-[4px] overflow-hidden border border-emerald-500/20 shadow-2xl group/video">
                          <img {...props} className="w-full h-full object-cover transition-transform duration-1000 group-hover/video:scale-110" referrerPolicy="no-referrer" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-center justify-center">
                             <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-emerald-500/20 backdrop-blur-md border border-emerald-500/30 flex items-center justify-center text-emerald-500 animate-pulse">
                               <Music size={isMobile ? 32 : 40} />
                             </div>
                          </div>
                          <div className="absolute top-2 md:top-4 right-2 md:right-4 px-2 md:px-3 py-1 bg-black/60 backdrop-blur-md rounded-full border border-white/10 text-[8px] md:text-[10px] font-bold text-white uppercase tracking-widest">
                            {dir === 'rtl' ? 'عرض فني سيادي' : 'SOVEREIGN ART VIEW'}
                          </div>
                        </div>
                      )
                    }}
                  >
                    {section.body}
                  </Markdown>
                )}
              </div>
            </div>

          {/* Decorative Corner Trace */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-[80px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/3 blur-[100px] pointer-events-none" />
        </motion.div>
      );
    })}

      {/* Global Studio Certification */}
      <motion.div 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="flex flex-col items-center justify-center gap-3 pt-6 pb-12"
      >
        <div className="h-px w-24 bg-gradient-to-r from-transparent via-[var(--border)] to-transparent" />
        <div className="flex items-center gap-2 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.3em]">
          <LayoutGrid size={12} className="text-emerald-500" />
          {dir === 'rtl' ? 'تم توليد الحزمة عبر محرك السيادة الإبداعي' : 'GENERATED VIA SOVEREIGN CREATIVE ENGINE'}
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
    className={`mt-4 p-6 rounded-[4px] border border-emerald-500/20 bg-emerald-500/[0.02] backdrop-blur-sm self-stretch flex flex-col gap-4 relative overflow-hidden`}
  >
    <div className="absolute top-0 right-0 p-4 opacity-5">
      <Settings size={64} className="text-emerald-500" />
    </div>
    
    <div className="flex items-start gap-4 relative z-10">
      <div className="w-12 h-12 rounded-[4px] bg-emerald-500/10 flex items-center justify-center text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
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

export const QuotaExceededCard = ({ data, dir, t, navigate, user }: { data: any, dir: 'rtl' | 'ltr', t: any, navigate: any, user: any }) => {
  const [copied, setCopied] = useState(false);
  const referralLink = `${window.location.origin}/?ref=${user?.id || 'elite'}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Sovereign Intelligence',
          text: dir === 'rtl' ? 'انضم إلي في سوفرين واستخدم الذكاء الاصطناعي الأقوى.' : 'Join me on Sovereign and use the most powerful AI.',
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
      className={`mt-4 p-5 rounded-[4px] border border-emerald-500/20 bg-emerald-500/[0.03] backdrop-blur-sm self-stretch flex flex-col gap-4 relative overflow-hidden group`}
    >
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <Sparkles size={48} className="text-emerald-500" />
      </div>
      
      <div className="flex items-start gap-4 relative z-10">
        <div className="w-12 h-12 rounded-[4px] bg-emerald-500/10 flex items-center justify-center text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
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

      {/* Referral Link Area */}
      <div className="relative z-10 bg-[var(--bg-overlay)] border border-emerald-500/10 rounded-[4px] p-3 flex items-center gap-3">
        <div className="flex-1 truncate text-[10px] font-mono text-[var(--text-muted)]">
          {referralLink}
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleCopy}
            className="w-8 h-8 flex items-center justify-center rounded-[4px] bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 transition-colors"
            title="Copy Link"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
          <button 
            onClick={handleShare}
            className="w-8 h-8 flex items-center justify-center rounded-[4px] bg-emerald-500 text-white hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20"
            title="Share"
          >
            <Share2 size={14} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 mt-1 relative z-10">
        <button 
          onClick={() => navigate('/subscriptions')}
          className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-[4px] text-[11px] font-black uppercase tracking-wider transition-all shadow-[0_10px_20px_rgba(16,185,129,0.3)] hover:translate-y-[-2px] active:translate-y-0"
        >
          {dir === 'rtl' ? 'ترقية الخطة الآن' : 'Upgrade Plan Now'}
        </button>
        <button 
          onClick={() => navigate('/rewards')}
          className="flex-1 bg-[var(--bg-surface)] border border-emerald-500/20 hover:bg-emerald-500/5 text-emerald-500 py-3 rounded-[4px] text-[11px] font-black uppercase tracking-wider transition-all hover:translate-y-[-2px] active:translate-y-0"
        >
          {dir === 'rtl' ? 'صفحة المكافآت' : 'Rewards Page'}
        </button>
      </div>
    </motion.div>
  );
};

import { ErrorBoundary } from '../components/shared/ErrorBoundary';

export const ChatPage: React.FC = () => {
  const { user, token, setShowAuthModal: setIsAuthModalOpen, setIsOperationPending, isAuthReady, fetchUserProfile: refreshUser, balanceUSD } = useAuth();
  const { theme, dir, t } = useTheme();
  const { siteSettings, economySettings } = useSettings();
  const { isMobile, isInstallable, installApp, isInstalling, triggerMemoryNotification } = useUI();
  const { socket } = useSocket();
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
  const [activeDropdown, setActiveDropdown] = useState<'tool' | 'model'>('tool');
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAdvancedToolsOpen, setIsAdvancedToolsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatId, setChatId] = useState<string | null>(routeChatId || null);

  // Sovereign Preservation: Sync local state to persistent storage
  useEffect(() => {
    sessionStorage.setItem('draft_query', query);
  }, [query]);

  useEffect(() => {
    localStorage.setItem('last_active_model', selectedModel);
  }, [selectedModel]);

  useEffect(() => {
    localStorage.setItem('last_active_tool', selectedTool);
  }, [selectedTool]);

  useEffect(() => {
    setIsOperationPending(isGenerating || query.length > 100);
  }, [isGenerating, query, setIsOperationPending]);

  const [videoSettings, setVideoSettings] = useState({
    aspectRatio: '16:9',
    resolution: '720p',
    duration: 5
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
    vocalType: 'None'
  });
  const [showVideoSettings, setShowVideoSettings] = useState(true);
  const [showImageSettings, setShowImageSettings] = useState(true);
  const [showAudioSettings, setShowAudioSettings] = useState(true);

  // Sovereign: document.title synchronization
  useEffect(() => {
    const firstUserMsg = messages.find(m => m.role === 'user');
    if (firstUserMsg) {
      document.title = stripProtocolMarkers(firstUserMsg.content).slice(0, 60);
    } else {
      document.title = dir === 'rtl' ? (siteSettings?.siteNameAr || 'محادثة السيادة') : (siteSettings?.siteName || 'Sovereign Chat');
    }
  }, [messages, siteSettings, dir]);
  const [showChatLimitWarning, setShowChatLimitWarning] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [chatRenameTitle, setChatRenameTitle] = useState('');
  const [openCitationsMap, setOpenCitationsMap] = useState<Record<number, boolean>>({});
  
  const MAX_CHAT_MESSAGES = 50;
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const chatIdRef = useRef<string | null>(chatId);
  const streamingBuffer = useRef('');
  const typewriterInterval = useRef<any>(null);
  const isGeneratingRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
          // Sovereign: High-precision insertion
          setQuery(prev => prev + (prev && !prev.endsWith(' ') ? ' ' : '') + finalTranscript);
          if (textareaRef.current) {
             textareaRef.current.style.height = 'auto';
             textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
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
      console.error('Failed to start recognition', err);
      setIsRecording(false);
    }
  };

  const handleEditSubmit = async (index: number) => {
    if (!editValue.trim() || editValue === messages[index].content) {
      setEditingMessageIndex(null);
      return;
    }
    
    // Persistent branching: delete messages from DB after this index
    const messageToEdit = messages[index];
    if (messageToEdit.id && chatId) {
      try {
        await fetch(`/api/messages/branch/${chatId}/${messageToEdit.id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } catch (e) {
        console.error('Failed to truncate branch in DB:', e);
      }
    }

    const truncated = messages.slice(0, index);
    setMessages(truncated);
    const newContent = editValue;
    setEditingMessageIndex(null);
    setEditValue('');
    handleSendOrStop(newContent, truncated);
  };

  const handleTTS = (text: string) => {
    if (!window.speechSynthesis) {
      toast.error(dir === 'rtl' ? 'متصفحك لا يدعم تحويل النص إلى صوت' : 'Browser doesn\'t support TTS');
      return;
    }
    
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*#_~`\[\]()>]/g, '').slice(0, 5000);
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = dir === 'rtl' ? 'ar-SA' : 'en-US';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
    toast.info(dir === 'rtl' ? 'جاري القراءة الصوتية...' : 'Reading aloud...');
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setIsExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
        link.download = `Sovereign_Chat_${new Date().toISOString().split('T')[0]}.md`;
        link.click();
        URL.revokeObjectURL(url);
      } 
      else if (format === 'pdf') {
        const chatContainer = document.getElementById('chat-messages-container');
        if (!chatContainer) throw new Error('Chat container not found');

        // Create a dedicated export element to handle styling better
        const exportEl = document.createElement('div');
        exportEl.style.padding = '20px';
        exportEl.style.width = '750px'; // Closer to A4 ratio width
        exportEl.style.backgroundColor = theme === 'dark' ? '#0f0f11' : '#ffffff';
        exportEl.style.color = theme === 'dark' ? '#ffffff' : '#000000';
        exportEl.dir = dir;
        exportEl.style.fontFamily = 'Tajawal, sans-serif';
        exportEl.style.position = 'absolute';
        exportEl.style.left = '-9999px';
        exportEl.style.top = '0';

        const header = document.createElement('div');
        header.innerHTML = `
          <div style="text-align: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid ${theme === 'dark' ? '#1a1a1c' : '#f0f0f0'};">
            <h1 style="margin: 0; font-size: 28px; color: #10b981;">SOVEREIGN</h1>
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
          roleLabel.innerText = msg.role === 'user' ? (dir === 'rtl' ? 'المستخدم' : 'User') : (dir === 'rtl' ? 'المساعد السيادي' : 'Sovereign Assistant');
          roleLabel.style.fontWeight = '900';
          roleLabel.style.marginBottom = '10px';
          roleLabel.style.fontSize = '12px';
          roleLabel.style.textTransform = 'uppercase';
          roleLabel.style.letterSpacing = '1px';
          roleLabel.style.color = '#10b981';
          
          const content = document.createElement('div');
          content.innerText = msg.content;
          content.style.fontSize = '15px';
          content.style.lineHeight = '1.8';
          content.style.whiteSpace = 'pre-wrap';
          content.style.wordBreak = 'break-word';
          
          msgEl.appendChild(roleLabel);
          msgEl.appendChild(content);
          exportEl.appendChild(msgEl);
        });

        const footer = document.createElement('div');
        footer.style.marginTop = '40px';
        footer.style.textAlign = 'center';
        footer.style.fontSize = '10px';
        footer.style.opacity = '0.3';
        footer.innerText = '© 2026 SOVEREIGN PLATFORM - CONFIDENTIAL AI REPORT';
        exportEl.appendChild(footer);

        document.body.appendChild(exportEl);
        
        const canvas = await html2canvas(exportEl, {
          scale: 2, // High quality
          useCORS: true,
          logging: false,
          backgroundColor: theme === 'dark' ? '#0f0f11' : '#ffffff',
          windowWidth: 800
        });
        
        document.body.removeChild(exportEl);
        
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const pdf = new jsPDF('p', 'mm', 'a4');
        
        const imgWidth = 210; // A4 width in mm
        const pageHeight = 297; // A4 height in mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;

        // Add first page
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        // Add subsequent pages if content is longer than one page
        while (heightLeft >= 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }

        pdf.save(`Sovereign_Chat_${new Date().toISOString().split('T')[0]}.pdf`);
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
            <h1 style="text-align: center;">Sovereign Chat Export</h1>
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
        link.download = `Sovereign_Chat_${new Date().toISOString().split('T')[0]}.doc`;
        link.click();
        URL.revokeObjectURL(url);
      }

      const formatLabels = { md: 'Markdown', pdf: 'PDF', docx: 'DOCX' };
      toast.success(dir === 'rtl' 
        ? `تم تصدير المحادثة بتنسيق ${formatLabels[format]} بنجاح` 
        : `Conversation exported as ${formatLabels[format]} successfully`
      );
    } catch (error) {
      console.error('Export error:', error);
      toast.error(dir === 'rtl' ? 'فشل تصدير المحادثة' : 'Failed to export conversation');
    } finally {
      setIsExporting(false);
    }
  };

  const handleThreadRename = async () => {
    if (!chatId || !chatRenameTitle.trim()) return;
    try {
      const res = await fetch(`/api/chats/${chatId}/title`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ title: chatRenameTitle })
      });
      if (res.ok) {
        toast.success(dir === 'rtl' ? 'تم تغيير العنوان' : 'Title updated');
        window.dispatchEvent(new Event('chat-updated'));
        setIsRenaming(false);
      }
    } catch (e) {
      console.error('Rename error:', e);
    }
  };

  const handleThreadDelete = async () => {
    if (!chatId) return;
    if (!window.confirm(dir === 'rtl' ? 'هل أنت متأكد من حذف هذه المحادثة؟' : 'Are you sure you want to delete this chat?')) return;
    
    try {
      const res = await fetch(`/api/chats/${chatId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success(dir === 'rtl' ? 'تم حذف المحادثة' : 'Chat deleted');
        window.dispatchEvent(new Event('chat-updated'));
        navigate('/chat');
      }
    } catch (e) {
      console.error('Delete error:', e);
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
      }
    } catch (err) {
      console.error('Pin error:', err);
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
      }
    } catch (err) {
      console.error('Feedback error:', err);
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
    // Sovereign: Auto-scrolling is strictly disabled to maintain a static, controlled screen view.
    // The user segment demands zero-jitter, manual context control.
  }, [messages, isGenerating]);

  useEffect(() => {
    isGeneratingRef.current = isGenerating;
    if (isGenerating) {
      startTypewriter();
    }
  }, [isGenerating]);

  const startTypewriter = () => {
    if (typewriterInterval.current) return;
    
    typewriterInterval.current = setInterval(() => {
      if (streamingBuffer.current.length > 0) {
        const pullAmount = Math.max(1, Math.ceil(streamingBuffer.current.length / 20));
        const chunk = streamingBuffer.current.substring(0, pullAmount);
        streamingBuffer.current = streamingBuffer.current.substring(pullAmount);
        
        setMessages(prev => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage && lastMessage.role === 'assistant') {
            newMessages[newMessages.length - 1] = {
              ...lastMessage,
              content: lastMessage.content + chunk
            };
          } else {
            newMessages.push({ role: 'assistant', content: chunk });
          }
          return newMessages;
        });
      } else if (!isGeneratingRef.current) {
        if (typewriterInterval.current) {
          clearInterval(typewriterInterval.current);
          typewriterInterval.current = null;
          // Sovereign: contextual continuity via manual observation.
          // scrollToLastInteraction();
        }
      }
    }, 30);
  };

  useEffect(() => {
    chatIdRef.current = chatId;
  }, [chatId]);

  useEffect(() => {
    // Sovereign Memory Protocol: Initial Startup notification
    const timer = setTimeout(() => {
      triggerMemoryNotification('startup');
    }, 1500); // Slight delay for premium feel
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Notify on tool selection change (excluding default chat)
    if (selectedTool !== 'chat') {
       triggerMemoryNotification('startup');
    }
  }, [selectedTool]);

  useEffect(() => {
    if (routeChatId) {
      // Sovereign Resiliency: If we are already mid-generation for THIS chat ID, do not reload
      // This prevents the navigate() from triggering a fetch that wipes the streaming content.
      if (isGenerating && chatId === routeChatId) {
        console.log('[ChatPage] Skipping redundant load for active generation session.');
        return;
      }
      if (isAuthReady) {
        loadChat(routeChatId);
      }
    } else {
      setMessages([]);
      setChatId(null);
      localStorage.removeItem('last_chat_id');
      // Trigger Sovereign Memory Startup for new chat
      triggerMemoryNotification('startup');
    }
  }, [routeChatId, token, isAuthReady]);

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
      // Sovereign: Strict 100MB limit (Google-standard for high-intel analysis)
      const MAX_SIZE = 100 * 1024 * 1024;
      if (file.size > MAX_SIZE) {
        toast.error(
          dir === 'rtl' 
            ? 'حجم الملف يتجاوز الحد المسموح (100 ميجابايت). يرجى اختيار ملف أصغر.' 
            : 'File size exceeds the 100MB limit. Please select a smaller file.'
        );
        e.target.value = ''; // Reset input
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
    setChatId(id);
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
          thinking_steps: typeof msg.thinking_steps === 'string' ? JSON.parse(msg.thinking_steps) : msg.thinking_steps,
          citations: typeof msg.citations === 'string' ? JSON.parse(msg.citations) : msg.citations,
          follow_ups: typeof msg.follow_ups === 'string' ? JSON.parse(msg.follow_ups) : msg.follow_ups
        })));
        // Sovereign: Static view preserves position on load
        // setTimeout(() => scrollToBottom('auto'), 100);
      }
    } catch (error) {
      console.error('Failed to load chat messages', error);
    }
  };

  useEffect(() => {
    if (!socket) return;

    const onChatChunk = (data: any) => {
      if (data.isFinal) {
        // Immediate Sovereign Finalization for binary/complex assets
        setMessages(prev => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage && lastMessage.role === 'assistant') {
            newMessages[newMessages.length - 1] = {
              ...lastMessage,
              content: data.chunk
            };
          } else {
            newMessages.push({ role: 'assistant', content: data.chunk });
          }
          return newMessages;
        });
        setIsGenerating(false);
        streamingBuffer.current = '';
      } else {
        streamingBuffer.current += data.chunk;
        
        // Sovereign: Efficient real-time streaming update
        setMessages(prev => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage && lastMessage.role === 'assistant') {
            newMessages[newMessages.length - 1] = {
              ...lastMessage,
              content: streamingBuffer.current
            };
          }
          return newMessages;
        });
      }
    };

    const onChatResponse = async (data: any) => {
      // Ensure the final content is applied even if streaming missed it or for binary tools
      if (data.result) {
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
              follow_ups: data.follow_ups || []
            };
          }
          return newMessages;
        });
      }

      const checkBuffer = setInterval(async () => {
        if (streamingBuffer.current.length === 0) {
          clearInterval(checkBuffer);
          setIsGenerating(false);
          streamingBuffer.current = ''; // Reset buffer
        }
      }, 100);
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

    const onChatError = (data: any) => {
      let errorMessage = '';
      let isQuota = false;
      let isInactive = false;
      let quotaData = null;

      try {
        // Try parsing JSON error (e.g. quota details)
        const parsed = JSON.parse(data.message);
        errorMessage = dir === 'rtl' ? (parsed.error_ar || parsed.error) : (parsed.error || parsed.error_ar);
        if (parsed.type === 'QUOTA_EXCEEDED') {
          isQuota = true;
          quotaData = parsed;
        } else if (parsed.type === 'SYSTEM_INACTIVE') {
          isInactive = true;
          quotaData = parsed;
        }
      } catch (e) {
        // Fallback to plain message
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
            quota_data: quotaData
          };
          return newMessages;
        }
        return [...prev, { 
          role: 'assistant', 
          content: errorMessage,
          is_quota_error: isQuota,
          is_system_inactive: isInactive,
          quota_data: quotaData
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

    socket.on('chat_chunk', onChatChunk);
    socket.on('chat_response', onChatResponse);
    socket.on('search_steps', onSearchSteps);
    socket.on('citations', onCitations);
    socket.on('memory_extracted', onMemoryExtracted);
    socket.on('memory_warning', onMemoryWarning);
    socket.on('memory_cleanup', onMemoryCleanup);
    socket.on('memory_consolidation', onMemoryConsolidation);
    socket.on('chat_error', onChatError);

    return () => {
      socket.off('chat_chunk', onChatChunk);
      socket.off('chat_response', onChatResponse);
      socket.off('search_steps', onSearchSteps);
      socket.off('citations', onCitations);
      socket.off('memory_extracted', onMemoryExtracted);
      socket.off('memory_warning', onMemoryWarning);
      socket.off('memory_cleanup', onMemoryCleanup);
      socket.off('memory_consolidation', onMemoryConsolidation);
      socket.off('chat_error', onChatError);
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
      
      const currentQuery = overrideQuery || query;
      if (!currentQuery.trim() && !selectedFile) return;
      
      const toolToUse = selectedFile ? 'perplexta_analysis' : (activeDropdown === 'model' 
        ? (selectedModel === 'fast' ? 'chat_fast' : selectedModel === 'pro' ? 'chat_pro' : selectedModel === 'thinking' ? 'chat_reasoning' : 'chat')
        : selectedTool);

      let updatedMessages: Message[] = [
        ...(overrideMessages || messages), 
        { 
          role: 'user', 
          content: currentQuery,
          tool: toolToUse,
          file: selectedFile ? {
            name: selectedFile.name,
            type: selectedFile.type,
            preview: previewUrl || undefined
          } : undefined
        }, 
        { role: 'assistant', content: '', tool: toolToUse }
      ];
      
      if (updatedMessages.length > MAX_CHAT_MESSAGES) {
        updatedMessages = updatedMessages.slice(updatedMessages.length - MAX_CHAT_MESSAGES);
        setShowChatLimitWarning(true);
      }
      
      setMessages(updatedMessages);
      setIsGenerating(true);
      streamingBuffer.current = '';
      
      // Small micro-task delay for first message UI sync
      await new Promise(resolve => setTimeout(resolve, 50));
      
      setQuery('');
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
            body: JSON.stringify({ title: currentQuery.substring(0, 50) })
          });
          
          if (res.ok) {
            const data = await res.json();
            currentChatId = data.id;
            setChatId(currentChatId);
            chatIdRef.current = currentChatId; // Update ref immediately
            navigate(`/chat/${currentChatId}`, { replace: true });
            window.dispatchEvent(new Event('chat-created'));
          } else {
            const errorData = await res.json();
            throw new Error(errorData.error || 'Failed to create chat');
          }
        }

        if (currentChatId) {
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
      const encryptedCustomInstructions = user?.custom_instructions ? await encrypt(user.custom_instructions) : '';

        if (!socket) {
          throw new Error(dir === 'rtl' ? 'لم يتم العثور على اتصال' : 'Socket connection not found');
        }

      // Helper to convert file to base64
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
            : 'File size exceeds sovereign limit (max 100MB)');
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
          console.error("Error converting file to base64", error);
        }
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
        video_settings: selectedTool === 'video' ? videoSettings : undefined,
        image_settings: selectedTool === 'image' ? imageSettings : undefined,
        audio_settings: selectedTool === 'canvas' ? audioSettings : undefined
      });
      setSelectedFile(null);
      setPreviewUrl(null);
      const input = document.getElementById('unified-upload') as HTMLInputElement;
      if (input) input.value = '';
    } catch (error: any) {
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
          console.error('Generation error:', error);
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

  const suggestions = [
    { 
      icon: <ImageIcon size={24} />, 
      label: t('image'), 
      toolId: 'image',
      hoverColor: 'group-hover:text-emerald-500', 
      dropShadow: 'group-hover:drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]',
      desc: dir === 'rtl' ? 'توليد صور بجودة 8K السيادية' : 'Sovereign 8K Image Generation'
    },
    { 
      icon: <Video size={24} />, 
      label: t('video'), 
      toolId: 'video',
      hoverColor: 'group-hover:text-emerald-500', 
      dropShadow: 'group-hover:drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]',
      desc: dir === 'rtl' ? 'توليد فيديو سينمائي فائق' : 'Ultra Cinematic Video Prod'
    },
    { 
      icon: <Search size={24} />, 
      label: t('perplexta_analysis'), 
      toolId: 'perplexta_analysis',
      hoverColor: 'group-hover:text-emerald-500', 
      dropShadow: 'group-hover:drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]',
      desc: t('perplexta_analysis_desc')
    },
    { 
      icon: <Music size={24} />, 
      label: t('canvas'), 
      toolId: 'canvas',
      hoverColor: 'group-hover:text-emerald-500', 
      dropShadow: 'group-hover:drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]',
      desc: dir === 'rtl' ? 'استوديو الصوت واللحن الذكي' : 'Smart Audio & Melody Studio'
    },
  ];

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
        animate={{ opacity: 1, y: 0 }}
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
                  className={`text-[7px] md:text-[9px] font-black transition-all duration-300 pointer-events-auto cursor-pointer ${
                    imageSettings.aspectRatio === r 
                      ? 'text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.7)] scale-110' 
                      : 'text-gray-400/40 hover:text-gray-200'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            <div className="w-px h-2 bg-gray-200/5 dark:bg-gray-800/5" />

            <div className="flex items-center gap-2.5 md:gap-4">
              {qualities.map(q => (
                <button
                  key={q}
                  onClick={() => setImageSettings(prev => ({ ...prev, quality: q }))}
                  className={`text-[6px] md:text-[8px] font-black uppercase tracking-widest transition-all duration-300 pointer-events-auto cursor-pointer ${
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
                  className={`text-[6px] md:text-[8px] font-black uppercase tracking-widest transition-all duration-300 whitespace-nowrap ${
                    imageSettings.style === s 
                      ? 'text-emerald-500 underline underline-offset-4 decoration-2' 
                      : 'text-gray-400/20 hover:text-gray-200'
                  }`}
                >
                  {t(s.toLowerCase()) || s}
                </button>
              ))}
            </div>

            <div className="w-px h-2 bg-gray-200/5 dark:bg-gray-800/5 mx-1" />

            <button 
              onClick={() => setShowImageSettings(false)}
              className="text-gray-400/10 hover:text-emerald-500 transition-all duration-300 hover:rotate-90 p-0.5 pointer-events-auto"
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
      { id: 'Majestic', label: dir === 'rtl' ? 'مهيب' : 'Majestic' },
      { id: 'Epic', label: t('mood_epic') },
      { id: 'Dramatic', label: t('mood_dramatic') },
      { id: 'Symphonic', label: dir === 'rtl' ? 'سيمفوني' : 'Symphonic' },
      { id: 'Cinematic', label: dir === 'rtl' ? 'سينمائي' : 'Cinematic' },
      { id: 'Mystical', label: dir === 'rtl' ? 'غامض' : 'Mystical' }
    ];
    const vocalTypes = [
      { id: 'None', label: dir === 'rtl' ? 'بدون صوت' : 'No Lyrics' },
      { id: 'Choir', label: dir === 'rtl' ? 'كورال' : 'Choir' },
      { id: 'Soprano', label: dir === 'rtl' ? 'سوپرانو' : 'Soprano' },
      { id: 'Tenor', label: dir === 'rtl' ? 'تينور' : 'Tenor' },
      { id: 'Professional', label: t('vocal_professional') }
    ];

    return (
      <motion.div 
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 5 }}
        className="mb-1 w-full pointer-events-auto"
      >
        <div className={`flex items-center justify-between px-1 md:px-8 pb-1 overflow-x-auto scrollbar-none gap-3 md:gap-0 ${dir === 'rtl' ? 'flex-row' : 'flex-row-reverse'}`}>
          <div className={`flex items-center gap-3 md:gap-7 shrink-0 ${dir === 'rtl' ? 'flex-row-reverse' : 'flex-row'}`}>
            <div className="flex items-center gap-2 md:gap-3.5">
              {moods.map(m => (
                <button
                  key={m.id}
                  onClick={() => setAudioSettings(prev => ({ ...prev, mood: m.id }))}
                  className={`text-[7px] md:text-[9px] font-black transition-all duration-300 pointer-events-auto cursor-pointer ${
                    audioSettings.mood === m.id 
                      ? 'text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.7)] scale-110' 
                      : 'text-gray-400/40 hover:text-gray-200'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <div className="w-px h-2 bg-gray-200/5 dark:bg-gray-800/5" />

            <div className="flex items-center gap-2.5 md:gap-4">
              {[15, 30, 60, 90].map(d => (
                <button
                  key={d}
                  onClick={() => setAudioSettings(prev => ({ ...prev, duration: d }))}
                  className={`text-[7px] md:text-[9px] font-bold tracking-widest transition-all duration-300 pointer-events-auto cursor-pointer ${
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
                  onClick={() => setAudioSettings(prev => ({ ...prev, vocalType: v.id }))}
                  className={`text-[7px] md:text-[9px] font-bold transition-all duration-300 pointer-events-auto cursor-pointer px-1.5 py-0.5 rounded-[4px] ${
                    audioSettings.vocalType === v.id 
                      ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.2)]' 
                      : 'text-gray-400/30 hover:text-gray-200'
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
            
            <div className="w-px h-2 bg-gray-200/5 dark:bg-gray-800/5 mx-1" />

            <button 
              onClick={() => setShowAudioSettings(false)}
              className="text-gray-400/10 hover:text-emerald-500 transition-all duration-300 hover:rotate-90 p-0.5 pointer-events-auto"
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

    return (
      <motion.div 
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 5 }}
        className={`mb-1 w-full flex items-center justify-between pointer-events-auto px-1 md:px-8 pb-1 overflow-x-auto scrollbar-none ${dir === 'rtl' ? 'flex-row' : 'flex-row-reverse'}`}
      >
        <div className={`flex items-center gap-3 md:gap-7 shrink-0 ${dir === 'rtl' ? 'flex-row-reverse' : 'flex-row'}`}>
          <div className="flex items-center gap-2 md:gap-3.5">
            {ratios.map(r => (
              <button
                key={r}
                onClick={() => setVideoSettings(prev => ({ ...prev, aspectRatio: r }))}
                className={`text-[7px] md:text-[9px] font-black transition-all duration-300 pointer-events-auto cursor-pointer ${
                  videoSettings.aspectRatio === r 
                    ? 'text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.7)] scale-110' 
                    : 'text-gray-400/40 hover:text-gray-200'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <div className="w-px h-2 bg-gray-200/5 dark:bg-gray-800/5" />

          {/* Resolutions Group */}
          <div className="flex items-center gap-2.5 md:gap-4">
            {resolutions.map(res => (
              <button
                key={res}
                onClick={() => setVideoSettings(prev => ({ ...prev, resolution: res }))}
                className={`text-[6px] md:text-[8px] font-black uppercase tracking-widest transition-all duration-300 pointer-events-auto cursor-pointer ${
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
            className="text-gray-400/10 hover:text-emerald-500 transition-all duration-300 hover:rotate-90 p-0.5 pointer-events-auto"
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
                className="w-full h-0.5 bg-[var(--bg-overlay)] rounded-full appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-400 transition-all pointer-events-auto"
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
    { id: 'video', label: t('video'), icon: <Video size={18} />, isNew: false },
    { id: 'image', label: t('image'), icon: <ImageIcon size={18} />, isNew: false },
    { id: 'learning', label: t('learning'), icon: <BookOpen size={18} />, isNew: true },
    { id: 'perplexta_analysis', label: t('perplexta_analysis'), icon: <Search size={18} />, isNew: true },
    ...(!isMobile ? [
      { id: 'legal_analysis', label: t('legal_analysis'), icon: <Scale size={18} />, isNew: true },
      { id: 'notebook', label: t('notebook'), icon: <Megaphone size={18} />, isNew: true },
    ] : []),
    { id: 'canvas', label: t('canvas'), icon: <Music size={18} />, isNew: true },
    { id: 'tts', label: t('tts'), icon: <Volume2 size={18} />, isNew: true },
    { id: 'stt', label: t('stt'), icon: <Mic size={18} />, isNew: true },
  ];

  const currentModel = models.find(m => m.id === selectedModel) || models[2];
  const currentTool = advancedTools.find(t => t.id === selectedTool) || advancedTools[0];
  const isToolActive = selectedTool !== 'chat';


  const renderInputArea = () => (
    <div className="w-full flex flex-col box-border min-w-0 px-4 md:px-6 max-w-4xl mx-auto">
      {renderVideoSettings()}
      {renderImageSettings()}
      {renderAudioSettings()}
      <motion.div 
        transition={springConfig}
        className={`w-full flex flex-col rounded-[var(--radius)] border box-border min-w-0 transition-all duration-500 bg-[var(--bg-secondary)] border-[var(--border-main)] ${
          isFocused 
            ? 'border-emerald-500/40 shadow-[0_0_0_4px_rgba(16,185,129,0.03)]' 
            : ''
        }`}
      >
        {/* Top: File/Image Preview */}
        {selectedFile && (
          <div className="px-2 pt-2 flex items-start gap-2">
            <div className={`relative group p-1 rounded-[var(--radius)] border transition-all duration-300 bg-[var(--bg-overlay)] border-[var(--border)]`}>
              <div className="flex items-center gap-2 px-1.5 py-1 min-w-[120px]">
                {previewUrl && selectedFile.type.startsWith('image/') ? (
                  <div className="w-8 h-8 rounded-[var(--radius)] overflow-hidden border border-[var(--border)] bg-[var(--bg-base)]">
                    <img src={previewUrl} alt="preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                ) : (
                  <div className={`w-8 h-8 rounded-[var(--radius)] flex items-center justify-center bg-[var(--bg-base)] text-emerald-500 shadow-sm`}>
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
                  const input = document.getElementById('unified-upload') as HTMLInputElement;
                  if (input) input.value = '';
                }}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-all duration-300 z-10"
              >
                <Plus size={10} className="rotate-45" />
              </button>
            </div>
          </div>
        )}

        <div className="flex items-end px-1 sm:px-3 py-1 sm:py-3 gap-0.5 sm:gap-2">
          {/* Send Button */}
          <div className="flex-shrink-0 flex items-center">
            <button 
              onClick={() => handleSendOrStop()}
              className={`w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-[var(--radius)] transition-all duration-500 group shadow-none
                ${!isGenerating && !query.trim() 
                  ? 'cursor-not-allowed opacity-40 grayscale' 
                  : 'hover:bg-emerald-500/5 hover:border-emerald-500/20 active:scale-95'
                } border border-transparent`}
              disabled={!isGenerating && !query.trim()}
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
                    className={`md:w-6 md:h-6 transition-all duration-500 ${
                      query.trim() 
                        ? 'text-emerald-500 drop-shadow-[0_0_12px_rgba(16,185,129,0.8)] scale-100' 
                        : 'text-gray-400 group-hover:text-emerald-500'
                    }`} 
                  />
                </div>
              )}
            </button>
          </div>

          {/* Textarea Area */}
          <div className="flex-1 min-w-0 relative">
            <textarea
              ref={textareaRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
              }}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendOrStop();
                  if (textareaRef.current) textareaRef.current.style.height = 'auto'; // Reset height
                }
              }}
              placeholder={t('askAssistant')}
              className={`w-full bg-transparent border-none outline-none px-1 py-1 text-sm sm:text-[17px] font-medium placeholder:text-[var(--text-secondary)]/50 text-[var(--text-primary)] resize-none scrollbar-none overflow-hidden leading-relaxed ${dir === 'rtl' ? 'text-right' : 'text-left'}`}
              dir="auto"
              rows={1}
              style={{ minHeight: '32px', maxHeight: '200px' }}
            />
          </div>

          {/* Attachment Button */}
          <div className="relative flex-shrink-0 flex items-center gap-1">
            <input 
              type="file" 
              id="unified-upload" 
              className="hidden" 
              accept="*/*" 
              onChange={handleFileChange} 
            />
            <button 
              title={dir === 'rtl' ? 'رفع ملف (الحد الأقصى 100 ميجابايت)' : 'Upload File (Max 100MB)'}
              onClick={() => document.getElementById('unified-upload')?.click()}
              className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-[var(--radius)] transition-all duration-300 hover:bg-emerald-500/5 group border border-transparent hover:border-emerald-500/20 shadow-none hover:shadow-[0_0_15px_rgba(16,185,129,0.1)]"
            >
              <Plus size={18} className="md:w-5 md:h-5 text-[var(--text-secondary)] group-hover:hidden transition-all duration-300" />
              <Paperclip size={18} className="md:w-5 md:h-5 text-emerald-500 hidden group-hover:block transition-all duration-300 drop-shadow-[0_0_10px_rgba(16,185,129,0.6)]" />
            </button>
          </div>
        </div>
        
        <div className={`flex items-center justify-between px-1.5 sm:px-3 py-1.5 sm:py-2.5 border-t border-dashed border-[var(--border-main)]`}>
          <div className="flex items-center gap-1 sm:gap-1.5">
            <div className="relative">
              <button 
                onClick={() => setIsAdvancedToolsOpen(!isAdvancedToolsOpen)}
                className={`flex items-center gap-1.5 md:gap-2 px-2 md:px-2.5 py-1 md:py-1.5 rounded-[var(--radius)] transition-all duration-300 border ${
                  activeDropdown === 'tool'
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
                <div className={`absolute bottom-full mb-3 ${dir === 'rtl' ? 'right-0' : 'left-0'} w-56 rounded-[var(--radius)] border shadow-2xl flex flex-col z-50 overflow-hidden bg-[var(--bg-secondary)] border-[var(--border-main)]`}>
                  <div className={`px-4 py-3 text-[10px] font-black tracking-[0.2em] text-[var(--text-muted)] bg-[var(--bg-base)]/30`}>
                    {t('tools').toUpperCase()}
                  </div>
                  <div className="p-1.5 flex flex-col gap-0.5 max-h-[50vh] overflow-y-auto custom-scrollbar">
                    {advancedTools.map((tool) => (
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
                        className={`flex items-center gap-3 px-3 py-2 rounded-[var(--radius)] transition-all duration-200 text-[13px] font-bold ${
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

            {/* Linked Model Selector */}
            <div className="relative">
              <button 
                onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
                className={`flex items-center gap-1.5 md:gap-2 px-2 md:px-2.5 py-1 md:py-1.5 rounded-[var(--radius)] transition-all duration-300 border ${
                  activeDropdown === 'model'
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
                <div className={`absolute bottom-full mb-3 ${dir === 'rtl' ? 'right-0' : 'left-0'} w-32 p-1.5 rounded-[4px] border shadow-2xl flex flex-col gap-0.5 z-50 bg-[var(--bg-secondary)] border-[var(--border-main)]`}>
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
                      className={`flex items-center justify-between px-3 py-2.5 rounded-[var(--radius)] transition-all text-[13px] font-black uppercase tracking-tight hover:bg-emerald-500/10 text-[var(--text-secondary)] hover:text-emerald-500 group`}
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
          
          <div className="flex items-center flex-shrink-0">
            <button 
              onClick={toggleRecording}
              className={`w-10 h-10 flex items-center justify-center rounded-[var(--radius)] bg-transparent border border-transparent transition-all duration-300 group ${
                isRecording 
                ? 'bg-red-500/10 text-red-500 border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]' 
                : 'hover:bg-[var(--bg-overlay)] text-gray-400 hover:text-emerald-500'
              }`}
              title={dir === 'rtl' ? (isRecording ? 'إيقاف التسجيل' : 'بدأ التسجيل الصوتي') : (isRecording ? 'Stop Recording' : 'Start Voice Input')}
            >
              {isRecording ? (
                <div className="relative">
                  <MicOff size={18} className="md:w-5 md:h-5 transition-all duration-300 transform scale-110" />
                  <span className="absolute -top-1 -right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                </div>
              ) : (
                <Mic size={18} className="md:w-5 md:h-5 text-gray-400 group-hover:text-emerald-500 group-hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)] transition-all duration-300" />
              )}
            </button>
          </div>
        </div>
      </motion.div>
      
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
    </div>
  );

  return (
    <ErrorBoundary name="Chat Intelligence Engine">
      <motion.div 
        initial="initial"
        animate="animate"
        exit="exit"
        variants={sovereignPageTransition}
        className="h-full flex flex-col w-full overflow-hidden"
      >
      {showChatLimitWarning && (
        <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-[100] px-6 py-4 rounded-[var(--radius)] shadow-2xl flex items-center gap-4 animate-in fade-in duration-500 border bg-[var(--bg-secondary)] border-pink-500/30 shadow-pink-500/10`}>
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
              className="mt-2 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] hover:text-pink-500 transition-colors"
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
               className="bg-[var(--bg-base)] border border-[var(--border-main)] rounded-[var(--radius)] w-full max-w-sm p-6 shadow-2xl"
            >
               <h3 className={`text-lg font-black mb-4 uppercase tracking-tighter ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
                 {dir === 'rtl' ? 'إعادة تسمية المحادثة' : 'Rename Conversation'}
               </h3>
               <input 
                 type="text" 
                 value={chatRenameTitle} 
                 onChange={(e) => setChatRenameTitle(e.target.value)}
                 className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-[var(--radius)] px-4 py-3 outline-none focus:border-emerald-500/50 transition-all font-bold text-sm mb-6 text-[var(--text-primary)]"
                 autoFocus
                 onKeyDown={(e) => e.key === 'Enter' && handleThreadRename()}
               />
               <div className="flex gap-3">
                 <button 
                   onClick={() => setIsRenaming(false)}
                   className="flex-1 py-1.5 rounded-[var(--radius)] text-xs font-bold uppercase text-[var(--text-secondary)] bg-[var(--bg-overlay)] hover:bg-[var(--bg-surface)] transition-all border border-[var(--border)]"
                 >
                   {dir === 'rtl' ? 'إلغاء' : 'Cancel'}
                 </button>
                 <button 
                   onClick={handleThreadRename}
                   className="flex-1 py-1.5 rounded-[var(--radius)] text-xs font-bold uppercase bg-emerald-500 text-white hover:bg-emerald-600 transition-all shadow-[0_5px_15px_rgba(16,185,129,0.3)]"
                 >
                   {dir === 'rtl' ? 'حفظ' : 'Save'}
                 </button>
               </div>
            </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {messages.length > 0 && (
            <div className="sticky top-0 z-30 bg-[var(--bg-primary)]/80 backdrop-blur-md border-b border-[var(--border-main)]">
              <div className="max-w-4xl mx-auto w-full flex items-center justify-between px-4 md:px-6 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)] flex-shrink-0" />
                  <h2 className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500 truncate max-w-[120px] md:max-w-[300px] font-mono">
                    {dir === 'rtl' ? 'نشط' : 'Active'}
                  </h2>
               </div>
               <div className="flex items-center gap-2">
                  <div className="relative" ref={exportMenuRef}>
                    <button 
                      onClick={() => !isExporting && setIsExportMenuOpen(!isExportMenuOpen)}
                      disabled={isExporting}
                      className={`w-8 h-8 flex items-center justify-center rounded-[var(--radius)] transition-all duration-300 group ${
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
                          className={`transition-all duration-300 ${
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
                          className={`absolute top-full mt-2 ${dir === 'rtl' ? 'left-0' : 'right-0'} w-56 bg-[var(--bg-secondary)] border border-[var(--border-main)] rounded-[var(--radius)] shadow-2xl overflow-hidden z-50 backdrop-blur-xl`}
                        >
                          <div className="p-1.5 space-y-0.5">
                            <button 
                              onClick={() => {
                                toast.info(dir === 'rtl' ? 'تمت إضافة العلامة المرجعية' : 'Bookmark added');
                                setIsExportMenuOpen(false);
                              }}
                              disabled={isExporting}
                              className="w-full flex items-center gap-3 px-3 py-2 text-[11px] font-bold text-[var(--text-secondary)] hover:text-emerald-500 hover:bg-emerald-500/5 rounded-[var(--radius)] transition-all group disabled:opacity-50"
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
                              className="w-full flex items-center gap-3 px-3 py-2 text-[11px] font-bold text-[var(--text-secondary)] hover:text-emerald-500 hover:bg-emerald-500/5 rounded-[var(--radius)] transition-all group disabled:opacity-50"
                            >
                              <FolderPlus size={14} className="group-hover:drop-shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
                              <span>{dir === 'rtl' ? 'إضافة إلى مساحة' : 'Add to Space'}</span>
                            </button>
 
                            <button 
                              onClick={() => {
                                setIsRenaming(true);
                                setChatRenameTitle(messages[0]?.content.substring(0, 30) || 'New Title');
                                setIsExportMenuOpen(false);
                              }}
                              disabled={isExporting}
                              className="w-full flex items-center gap-3 px-3 py-2 text-[11px] font-bold text-[var(--text-secondary)] hover:text-emerald-500 hover:bg-emerald-500/5 rounded-[var(--radius)] transition-all group disabled:opacity-50"
                            >
                              <Pencil size={14} className="group-hover:drop-shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
                              <span>{dir === 'rtl' ? 'إعادة تسمية' : 'Rename Thread'}</span>
                            </button>
 
                            <div className="my-1.5 mx-2 h-px bg-[var(--border-main)]/50" />
 
                            <button 
                              onClick={() => handleExportChat('pdf')}
                              disabled={isExporting}
                              className="w-full flex items-center gap-3 px-3 py-2 text-[11px] font-bold text-[var(--text-secondary)] hover:text-emerald-500 hover:bg-emerald-500/5 rounded-[var(--radius)] transition-all group disabled:opacity-50"
                            >
                              <FileDown size={14} className="group-hover:drop-shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
                              <span>{dir === 'rtl' ? 'تصدير كـ PDF' : 'Export as PDF'}</span>
                            </button>
 
                            <button 
                              onClick={() => handleExportChat('md')}
                              disabled={isExporting}
                              className="w-full flex items-center gap-3 px-3 py-2 text-[11px] font-bold text-[var(--text-secondary)] hover:text-emerald-500 hover:bg-emerald-500/5 rounded-[var(--radius)] transition-all group disabled:opacity-50"
                            >
                              <FileCode size={14} className="group-hover:drop-shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
                              <span>{dir === 'rtl' ? 'تصدير كـ Markdown' : 'Export as Markdown'}</span>
                            </button>
 
                            <button 
                              onClick={() => handleExportChat('docx')}
                              disabled={isExporting}
                              className="w-full flex items-center gap-3 px-3 py-2 text-[11px] font-bold text-[var(--text-secondary)] hover:text-emerald-500 hover:bg-emerald-500/5 rounded-[var(--radius)] transition-all group disabled:opacity-50"
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
                              className="w-full flex items-center gap-3 px-3 py-2 text-[11px] font-bold text-pink-500 hover:bg-pink-500/5 rounded-[var(--radius)] transition-all group disabled:opacity-50"
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
                      className="flex items-center gap-2 px-3 py-1.5 rounded-[var(--radius)] text-[9px] md:text-[10px] font-black uppercase tracking-wider text-emerald-500 bg-emerald-500/5 transition-all duration-300 border border-emerald-500/10 hover:bg-emerald-500/10"
                    >
                      <Bookmark size={14} />
                      <span className="hidden lg:inline">{dir === 'rtl' ? 'المثبتة' : 'Pinned'}</span>
                    </button>
                  )}
               </div>
              </div>
            </div>
          )}
          <div id="chat-messages-container" className="flex-1 overflow-y-scroll scrollbar-none custom-scrollbar w-full overflow-anchor-none relative h-full flex flex-col">
          <AnimatePresence mode="wait">
          {messages.length === 0 ? (
            <motion.div 
               key="welcome"
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
               className="flex-1 flex flex-col items-center justify-center min-h-full py-8 md:py-12 overflow-hidden select-none w-full"
            >
              <div className="w-full max-w-4xl px-4 md:px-6 flex flex-col items-center">
                <h1 
                  className="text-lg md:text-3xl font-black text-[var(--text-primary)] text-center tracking-tight mb-4 md:mb-8 leading-tight px-0 md:px-4 uppercase drop-shadow-sm select-none"
                >
                  {t('howCanIHelp')}
                </h1>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 md:gap-4 w-full">
                  {suggestions.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setQuery(item.label);
                        setSelectedTool((item as any).toolId);
                        setActiveDropdown('tool');
                      }}
                      className="group flex items-center h-[54px] md:h-[70px] gap-3 md:gap-4 p-3 md:p-4 rounded-[var(--radius)] border transition-all duration-300 text-start relative overflow-hidden bg-[var(--bg-secondary)] border-[var(--border)] hover:border-emerald-500/40 hover:bg-emerald-500/[0.02] shadow-sm active:scale-100"
                    >
                      <div className={`w-7 h-7 md:w-9 md:h-9 rounded-[var(--radius)] flex items-center justify-center transition-all duration-700 relative z-10 bg-[var(--bg-overlay)] text-gray-400 ${item.hoverColor} ${item.dropShadow}`}>
                        {React.cloneElement(item.icon as React.ReactElement, { size: isMobile ? 16 : 18, className: 'md:w-5 md:h-5' } as any)}
                      </div>
                      <div className="flex flex-col items-start gap-0 relative z-10 flex-1 min-w-0">
                        <span className="text-[12px] md:text-[14px] font-black tracking-tight leading-tight transition-colors truncate w-full text-[var(--text-primary)] group-hover:text-emerald-500">
                          {item.label}
                        </span>
                        <span className="text-[7px] md:text-[9px] text-gray-500 font-bold uppercase tracking-[0.1em] opacity-40 group-hover:opacity-100 group-hover:text-emerald-500/70 transition-all truncate w-full">
                          {item.desc}
                        </span>
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/0 via-transparent to-emerald-500/[0.02] opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                      <div className="absolute -inset-px rounded-[var(--radius)] border border-emerald-500/0 group-hover:border-emerald-500/10 transition-colors pointer-events-none" />
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="chat"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col gap-4 md:gap-6 max-w-4xl mx-auto w-full px-4 md:px-6"
            >
              {messages.map((msg, idx) => {
                return (
                  <motion.div 
                    key={msg.id || idx} 
                    id={`message-${idx}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ 
                      duration: 0.2, 
                      ease: "linear"
                    }}
                    className={`w-full ${msg.role === 'user' ? 'user-message-anchor' : ''}`}
                  >
                    <div className={`w-full ${msg.role === 'user' ? 'bg-transparent text-[var(--text-primary)]' : 'bg-transparent'} px-0`}>
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
                                <div className="flex flex-col gap-2 min-w-[200px] md:min-w-[400px]">
                                  <textarea
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    autoFocus
                                    className="w-full bg-transparent border-none focus:ring-0 text-[13px] md:text-base resize-none outline-none"
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
                                      className="px-4 py-1.5 text-[10px] uppercase font-bold bg-emerald-500 text-white rounded-[var(--radius)] hover:bg-emerald-600 transition-colors"
                                    >
                                      {dir === 'rtl' ? 'حفظ وإرسال' : 'Save & Send'}
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className={`group relative flex items-center gap-3 w-full ${dir === 'rtl' ? 'flex-row' : 'flex-row'}`}>
                                  {/* Each question is an H1-style heading in the flow */}
                                  <h1 className={`text-lg md:text-4xl font-black tracking-tight flex-1 ${dir === 'rtl' ? 'text-right' : 'text-left'} leading-tight whitespace-pre-wrap text-[var(--text-primary)] uppercase`}>
                                    {stripProtocolMarkers(msg.content)}
                                  </h1>
                                  {msg.is_pinned && (
                                    <div className="absolute -top-1 -start-1 flex items-center gap-1 bg-emerald-500/10 px-1.5 py-0.5 rounded-[var(--radius)] border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                                      <Pin size={8} className="text-emerald-500" />
                                      <span className="text-[7px] font-black uppercase text-emerald-500/80 tracking-tighter">Pinned</span>
                                    </div>
                                  )}
                                  <button 
                                    onClick={() => {
                                      setEditingMessageIndex(idx);
                                      setEditValue(msg.content);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 transition-all duration-300 p-1.5 rounded-[var(--radius)] hover:bg-[var(--bg-overlay)] text-gray-400 hover:text-emerald-500 shrink-0"
                                    title={dir === 'rtl' ? 'تعديل' : 'Edit'}
                                  >
                                    <Pencil size={14} />
                                  </button>
                                </div>
                              )}
                        </div>
                      ) : (
                      <div className="markdown-body prose dark:prose-invert max-w-none relative text-[13px] md:text-base leading-relaxed tracking-tight">
                        {isGenerating && idx === messages.length - 1 && msg.content === '' ? (
                           <ResponseSkeleton dir={dir} />
                        ) : msg.is_quota_error ? (
                           <QuotaExceededCard data={msg.quota_data} dir={dir} t={t} navigate={navigate} user={user} />
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
                                  p: ({ children }) => {
                                    if (typeof children === 'string' || (Array.isArray(children) && children.every(c => typeof c === 'string'))) {
                                      const text = Array.isArray(children) ? children.join('') : children;
                                      const parts = text.split(/(\[\d+\])/g);
                                      return (
                                        <div className="last:mb-0 mb-3 text-sm leading-relaxed text-gray-800 dark:text-gray-200">
                                          {parts.map((part, i) => {
                                            const match = part.match(/^\[(\d+)\]$/);
                                            if (match && msg.citations) {
                                              const index = parseInt(match[1]);
                                              const citation = msg.citations.find(c => c.index === index);
                                              if (citation) {
                                                return (
                                                  <a 
                                                    key={i}
                                                    href={citation.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center justify-center px-1.5 py-0.5 mx-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-bold text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all no-underline align-middle shadow-sm sm:scale-100 scale-90"
                                                    title={citation.title}
                                                  >
                                                    {citation.title.split(' ')[0] || index}
                                                  </a>
                                                );
                                              }
                                            }
                                            return part;
                                          })}
                                        </div>
                                      );
                                    }
                                    return <div className="last:mb-0 mb-3 text-sm leading-relaxed text-[var(--text-primary)]">{children}</div>;
                                  },
                                  h1: ({ children }) => <h1 className="text-md md:text-xl font-black text-emerald-500 mb-3 mt-5 uppercase tracking-wider border-b border-emerald-500/10 pb-1.5">{children}</h1>,
                                  h2: ({ children }) => <h2 className="text-sm md:text-lg font-bold text-[var(--text-primary)] mb-2.5 mt-4 flex items-center gap-2">
                                    <div className="w-0.5 h-3.5 bg-emerald-500 rounded-full" />
                                    {children}
                                  </h2>,
                                  h3: ({ children }) => <h3 className="text-[12px] md:text-md font-bold text-gray-400 mb-2 mt-3 uppercase tracking-widest">{children}</h3>,
                              img: ({ node, ...props }) => {
                              const handleDownload = async () => {
                                if (!props.src) return;
                                try {
                                  const response = await fetch(props.src);
                                  const blob = await response.blob();
                                  const url = window.URL.createObjectURL(blob);
                                  const link = document.createElement('a');
                                  link.href = url;
                                  link.download = `Sovereign_Gen_${Date.now()}.png`;
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                  window.URL.revokeObjectURL(url);
                                } catch (err) {
                                  console.error("Download failed", err);
                                }
                              };

                              return (
                                <motion.div 
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ duration: 0.5 }}
                                  className="my-4 relative group inline-block w-full max-w-[280px] sm:max-w-sm overflow-hidden rounded-[var(--radius)] border border-[var(--border)] shadow-md transition-all duration-300 hover:shadow-emerald-500/10 hover:border-emerald-500/30"
                                >
                                  <img 
                                    {...props} 
                                    className="block w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105" 
                                    referrerPolicy="no-referrer" 
                                    loading="lazy"
                                  />
                                  <motion.div 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-300 flex justify-between items-center backdrop-blur-[2px]"
                                  >
                                    <div className="flex flex-col">
                                      <span className="text-[9px] text-emerald-400 font-bold tracking-tight">
                                        {dir === 'rtl' ? 'ملاحظة: التخزين 30 يوماً' : 'Note: 30-Day Storage'}
                                      </span>
                                      <span className="text-[9px] text-gray-300 font-medium">
                                        {dir === 'rtl' ? 'آمن ومحمي' : 'Secure & Encrypted'}
                                      </span>
                                    </div>
                                    <button 
                                      onClick={handleDownload}
                                      className="p-2 bg-emerald-500 text-white rounded-[var(--radius)] hover:bg-emerald-600 transition-colors shadow-lg active:scale-90"
                                      title={dir === 'rtl' ? 'تنزيل' : 'Download'}
                                    >
                                      <Download size={14} />
                                    </button>
                                  </motion.div>
                                </motion.div>
                              );
                            },
                            video: ({ node, ...props }) => {
                              const handleDownload = async () => {
                                if (!props.src) return;
                                try {
                                  const response = await fetch(props.src);
                                  const blob = await response.blob();
                                  const url = window.URL.createObjectURL(blob);
                                  const link = document.createElement('a');
                                  link.href = url;
                                  link.download = `Sovereign_Gen_${Date.now()}.mp4`;
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                  window.URL.revokeObjectURL(url);
                                } catch (err) {
                                  console.error("Video download failed", err);
                                }
                              };

                              return (
                                <div className="my-4 relative group inline-block max-w-[85%] md:max-w-md overflow-hidden rounded-[var(--radius)] border border-[var(--border)] shadow-md transition-all duration-500 hover:shadow-emerald-500/10 hover:border-emerald-500/30">
                                  <video 
                                    {...props} 
                                    className="block w-full h-auto rounded-[var(--radius)]" 
                                    controls 
                                    controlsList="nodownload" // Intercept native download to use our secure one
                                  />
                                  <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/90 via-black/40 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-300 flex justify-between items-center backdrop-blur-md">
                                    <div className="flex flex-col">
                                      <span className="text-[9px] text-emerald-400 font-bold tracking-tight">
                                        {dir === 'rtl' ? 'ملاحظة: التخزين 30 يوماً' : 'Note: 30-Day Storage'}
                                      </span>
                                      <span className="text-[9px] text-gray-300 font-medium">
                                        {dir === 'rtl' ? 'آمن ومحمي' : 'Secure & Encrypted'}
                                      </span>
                                    </div>
                                    <button 
                                      onClick={handleDownload}
                                      className="p-2 bg-emerald-500 text-white rounded-[var(--radius)] hover:bg-emerald-600 transition-colors shadow-lg active:scale-90"
                                      title={dir === 'rtl' ? 'تنزيل الفيديو' : 'Download Video'}
                                    >
                                      <Download size={14} />
                                    </button>
                                  </div>
                                </div>
                              );
                            }
                          }}
                        >
                          {stripProtocolMarkers(msg.content)}
                        </Markdown>
                      )}
                      {(!isGenerating || idx < messages.length - 1 || (msg.content && msg.content.length > 50)) && (
                        <>
                          <Citations 
                            citations={msg.citations} 
                            dir={dir} 
                            isOpen={!!openCitationsMap[idx]}
                            onToggle={() => setOpenCitationsMap(prev => ({ ...prev, [idx]: !prev[idx] }))}
                          />
                          <FollowUps followUps={msg.follow_ups || []} onSelect={(q) => handleSendOrStop(q)} dir={dir} />
                        </>
                      )}
                    </>
                      )}
                    </div>
                  )}

                  {/* Sovereign Message Toolbar - Optimized Bottom Layout */}
                  {(!isGenerating || idx < messages.length - 1) && msg.role === 'assistant' && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100/30 dark:border-gray-800/20 px-0"
                    >
                      <div className="flex items-center gap-0.5 sm:gap-1.5">
                        <button 
                          onClick={() => handleFeedback(msg.id!, msg.feedback === 1 ? 0 : 1)}
                          className={`w-7 h-7 sm:w-10 sm:h-10 flex items-center justify-center rounded-[var(--radius)] transition-all duration-300 ${msg.feedback === 1 ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-transparent border border-transparent hover:bg-[var(--bg-overlay)] text-[var(--text-muted)] hover:text-emerald-500 hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]'}`}
                        >
                          <ThumbsUp size={13} />
                        </button>
                        <button 
                          onClick={() => handleFeedback(msg.id!, msg.feedback === -1 ? 0 : -1)}
                          className={`w-7 h-7 sm:w-10 sm:h-10 flex items-center justify-center rounded-[var(--radius)] transition-all duration-300 ${msg.feedback === -1 ? 'text-amber-500 bg-amber-500/10 border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.3)]' : 'bg-transparent border border-transparent hover:bg-[var(--bg-overlay)] text-[var(--text-muted)] hover:text-amber-500 hover:drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]'}`}
                        >
                          <ThumbsDown size={13} />
                        </button>
                        <div className="w-px h-3 sm:h-4 bg-[var(--border)] mx-0.5 sm:mx-1" />
                        <button 
                          onClick={() => handlePinMessage(msg.id!, !msg.is_pinned)}
                          title={msg.is_pinned ? (dir === 'rtl' ? 'إلغاء التثبيت' : 'Unpin') : (dir === 'rtl' ? 'تثبيت' : 'Pin')}
                          className={`w-7 h-7 sm:w-10 sm:h-10 flex items-center justify-center rounded-[var(--radius)] bg-transparent border transition-all duration-300 ${msg.is_pinned ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'border-transparent text-[var(--text-muted)] hover:text-emerald-500 hover:bg-emerald-500/5'}`}
                        >
                          {msg.is_pinned ? <PinOff size={13} /> : <Pin size={13} />}
                        </button>
                        <button 
                          onClick={() => handleTTS(msg.content)}
                          title={dir === 'rtl' ? 'قراءة صوتية' : 'Read Aloud'}
                          className="w-7 h-7 sm:w-10 sm:h-10 flex items-center justify-center rounded-[var(--radius)] bg-transparent border border-transparent hover:bg-[var(--bg-overlay)] text-gray-400 hover:text-emerald-500 hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)] transition-all duration-300"
                        >
                          <Volume2 size={13} />
                        </button>
                        <button 
                          onClick={() => handleRegenerate(idx)}
                          title={dir === 'rtl' ? 'إعادة توليد' : 'Regenerate'}
                          className={`w-7 h-7 sm:w-10 sm:h-10 flex items-center justify-center rounded-[var(--radius)] bg-transparent border border-transparent hover:bg-[var(--bg-overlay)] text-[var(--text-muted)] hover:text-emerald-500 hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)] transition-all duration-300 ${isGenerating && idx === messages.length - 1 ? 'animate-spin opacity-50' : ''}`}
                        >
                          <RefreshCw size={13} />
                        </button>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(msg.content);
                            toast.success(dir === 'rtl' ? 'تم النسخ بنجاح' : 'Copied successfully');
                          }}
                          title={dir === 'rtl' ? 'نسخ' : 'Copy'}
                          className="w-7 h-7 sm:w-10 sm:h-10 flex items-center justify-center rounded-[var(--radius)] bg-transparent border border-transparent hover:bg-[var(--bg-overlay)] text-gray-400 hover:text-emerald-500 hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)] transition-all duration-300"
                        >
                          <Copy size={13} />
                        </button>
                        <button 
                          onClick={async () => {
                            const blob = new Blob([msg.content], { type: 'text/markdown' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `Sovereign_Response_${Date.now()}.md`;
                            a.click();
                            URL.revokeObjectURL(url);
                          }}
                          title={dir === 'rtl' ? 'تحميل' : 'Download'}
                          className="w-7 h-7 sm:w-10 sm:h-10 flex items-center justify-center rounded-[var(--radius)] bg-transparent border border-transparent hover:bg-[var(--bg-overlay)] text-gray-400 hover:text-emerald-500 hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)] transition-all duration-300"
                        >
                          <Download size={13} />
                        </button>
                      </div>

                      <div className="flex items-center gap-1 sm:gap-2">
                        <button 
                          onClick={async () => {
                            try {
                              if (navigator.share) {
                                await navigator.share({
                                  title: 'Sovereign AI Response',
                                  text: msg.content,
                                  url: window.location.href
                                });
                              } else {
                                navigator.clipboard.writeText(msg.content);
                                toast.success(dir === 'rtl' ? 'تم نسخ الرابط للمشاركة' : 'Link copied for sharing');
                              }
                            } catch (err) {
                              console.error('Share failed', err);
                            }
                          }}
                          title={dir === 'rtl' ? 'مشاركة' : 'Share'}
                          className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-[var(--radius)] bg-[var(--bg-overlay)] border border-[var(--border)] text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.15)] hover:bg-emerald-500/10 transition-all duration-300 ml-1 sm:ml-2"
                        >
                          <Share2 size={14} className="drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                        </button>

                         <div className="relative">
                           <button 
                             onClick={() => setOpenMenuId(openMenuId === (msg.id?.toString() || idx.toString()) ? null : (msg.id?.toString() || idx.toString()))}
                             className={`w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-[var(--radius)] transition-all duration-300 ${openMenuId === (msg.id?.toString() || idx.toString()) ? 'text-emerald-500 bg-emerald-500/10' : 'bg-transparent border border-transparent hover:bg-[var(--bg-overlay)] text-[var(--text-muted)] hover:text-emerald-500'}`}
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
                                          console.error(e);
                                        }
                                     }
                                     setOpenMenuId(null);
                                   }}
                                   className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-[4px] transition-colors group"
                                 >
                                   <Bookmark size={15} className="text-gray-400 group-hover:text-emerald-500 transition-colors" />
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
                                       console.error(e);
                                     }
                                     setOpenMenuId(null);
                                   }}
                                   className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-[4px] transition-colors group"
                                 >
                                   <Flag size={15} className="text-gray-400 group-hover:text-amber-500 transition-colors" />
                                   <span>{dir === 'rtl' ? 'إبلاغ' : 'Report'}</span>
                                 </button>
                                 <div className="my-1 h-px bg-gray-100 dark:bg-gray-800" />
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
                                         console.error(e);
                                         toast.error(dir === 'rtl' ? 'فشل الحذف من الخادم' : 'Server deletion failed');
                                       }
                                     }
                                     setMessages(prev => prev.filter((_, i) => i !== idx));
                                     setOpenMenuId(null);
                                     toast.success(dir === 'rtl' ? 'تم حذف الرسالة' : 'Message deleted');
                                   }}
                                   className="w-full flex items-center gap-3 px-3 py-2 text-sm text-rose-500 hover:bg-rose-500/5 rounded-[4px] transition-colors group"
                                 >
                                   <Trash2 size={15} className="text-rose-400 group-hover:text-rose-500 transition-colors" />
                                   <span>{dir === 'rtl' ? 'حذف' : 'Delete'}</span>
                                 </button>
                               </motion.div>
                             )}
                           </AnimatePresence>
                         </div>
                      </div>
                    </motion.div>
                  )}
                  
                  <div className="mt-4 min-h-[10px] flex flex-col justify-end gap-2">
                    <AnimatePresence>
                      {isGenerating && idx === messages.length - 1 && (
                        <motion.div 
                          key="generating-indicator"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="w-full flex items-center gap-2 text-emerald-500/80"
                        >
                          {selectedTool === 'image' || selectedTool === 'video' || selectedTool === 'canvas' ? (
                            <div className="flex items-center gap-3 bg-emerald-500/5 px-4 py-2 rounded-[var(--radius)] border border-emerald-500/10">
                              <Brain className="w-4 h-4 text-emerald-500 animate-pulse" />
                              <span className="text-sm font-medium tracking-tight text-emerald-500">
                                {dir === 'rtl' ? 'جاري التحليل والإنتاج...' : 'Analyzing & Producing...'}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3 px-1 py-1">
                              <div className="flex gap-1.5 items-center">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/40 animate-pulse" />
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/60 animate-pulse [animation-delay:200ms]" />
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/80 animate-pulse [animation-delay:400ms]" />
                              </div>
                              <span className="text-xs font-medium text-emerald-500/60 tracking-wider font-mono">
                                {dir === 'rtl' ? 'بيربليكستا يفكر...' : 'Perplexta Thinking...'}
                              </span>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                    </div>
                  </div>
                </motion.div>
                );
              })}
          </motion.div>
        )}
        </AnimatePresence>
      </div>

        <div className="w-full flex-shrink-0 px-0 md:px-4 pb-4">
          <div className="max-w-5xl mx-auto w-full text-[var(--text-primary)]">
            {renderInputArea()}
          </div>
        </div>
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
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-[var(--bg-base)] border border-[var(--border-main)] rounded-[var(--radius)] w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-[var(--border-main)] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[var(--radius)] bg-emerald-500/10 flex items-center justify-center text-emerald-500">
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
                  className="w-10 h-10 rounded-[var(--radius)] hover:bg-[var(--bg-overlay)] flex items-center justify-center text-[var(--text-secondary)]"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                {messages.filter(m => m.is_pinned).map((msg, pIdx) => (
                  <div key={pIdx} className="group relative p-4 rounded-[var(--radius)] bg-[var(--bg-secondary)] border border-[var(--border-main)] hover:border-emerald-500/30 transition-all duration-300">
                    <div className="flex items-center justify-between mb-2">
                       <span className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-500">
                         {msg.role === 'user' ? (dir === 'rtl' ? 'سؤالك' : 'Your Question') : (dir === 'rtl' ? 'إجابة السيادة' : 'Sovereign Answer')}
                       </span>
                    </div>
                    <div className="markdown-body prose dark:prose-invert text-[13px] line-clamp-6 text-gray-700 dark:text-gray-300">
                      <Markdown>{stripProtocolMarkers(msg.content)}</Markdown>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </motion.div>
    </ErrorBoundary>
  );
};

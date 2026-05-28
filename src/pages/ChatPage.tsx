import { MemoryNotification } from '../components/MemoryNotification';
import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
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
import { ArrowDown, MessageSquare, Music, Play, Plus, Mic, MicOff, Send, Globe, LayoutGrid, Zap, Code, FileText, Image as ImageIcon, Sparkles, Brain, Video, Volume2, Search, BookOpen, Square, AlertTriangle, Paperclip, Copy, Download, Scale, Megaphone, Maximize, Maximize2, Minimize2, ThumbsUp, ThumbsDown, Share2, RefreshCw, MoreHorizontal, Bookmark, Flag, Trash2, Check, Pencil, X, Pin, PinOff, FileDown, FileCode, FolderPlus, Loader2, Library, ExternalLink, Settings, Database, GitFork } from 'lucide-react';
import { toast } from 'sonner';
import { useAppContext } from '../context/AppContext';
import { trackGAEvent } from '../components/GoogleAnalytics';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { encrypt } from '../utils/browserCrypto';
import { motion, AnimatePresence } from 'motion/react';
import { perplextaPageTransition, PERPLEXTA_TRANSITION } from '../constants/motions';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

const springConfig = { type: "spring" as const, stiffness: 300, damping: 30 };

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

const CodeBlock = ({ inline, className, children, ...props }: any) => {
  const { dir } = useAppContext();
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const lang = match ? match[1] : 'text';
  const codeContent = String(children).trim();

  // Sandbox Mode state & execution variables
  const [sandboxMode, setSandboxMode] = useState(false);
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(false);
  
  
  
  const [editableCode, setEditableCode] = useState(codeContent);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [outputLogs, setOutputLogs] = useState<{ type: 'log' | 'info' | 'warn' | 'error'; text: string; time: string }[]>([]);
  const [iframeSrc, setIframeSrc] = useState<string | null>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);

  useEffect(() => {
    setEditableCode(codeContent);
  }, [codeContent]);

  // Instantly deactivate Sandbox Mode if rendering or resizing on mobile to ensure optimal performance and lightweight render
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSandboxMode(false);
        setIsPlaying(false);
        setIframeSrc(null);
        setOutputLogs([]);
      }
    };
    handleResize(); // Run initial check
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getHighlightedCode = () => {
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
        console.error('Prism highlighting error:', e);
      }
    }
    return editableCode
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

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
        console.error('Failed to copy code: ', err);
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
    setExecutionError(null);
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
        setIframeSrc(fullHtml);
      } catch (err: any) {
        setExecutionError(err?.message || String(err));
      } finally {
        setIsRunning(false);
      }
    } else {
      setIsRunning(true);
      const startTime = performance.now();
      const logsList: { type: 'log' | 'info' | 'warn' | 'error'; text: string; time: string }[] = [];
      const getTimestamp = () => new Date().toLocaleTimeString([], { hour12: false });

      const customConsole = {
        log: (...args: any[]) => {
          logsList.push({
            type: 'log',
            text: args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' '),
            time: getTimestamp()
          });
        },
        info: (...args: any[]) => {
          logsList.push({
            type: 'info',
            text: args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' '),
            time: getTimestamp()
          });
        },
        warn: (...args: any[]) => {
          logsList.push({
            type: 'warn',
            text: args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' '),
            time: getTimestamp()
          });
        },
        error: (...args: any[]) => {
          logsList.push({
            type: 'error',
            text: args.map(arg => typeof arg === 'object' ? String(arg?.message || JSON.stringify(arg)) : String(arg)).join(' '),
            time: getTimestamp()
          });
        }
      };

      try {
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

        const runner = new Function('console', `
          try {
            ${jsCode}
          } catch (err) {
            console.error(err);
          }
        `);
        runner(customConsole);

        const duration = (performance.now() - startTime).toFixed(1);
        logsList.push({
          type: 'info',
          text: `[SYSTEM] Process completed in ${duration}ms.`,
          time: getTimestamp()
        });
        setOutputLogs(logsList);
      } catch (err: any) {
        setExecutionError(err?.message || String(err));
        logsList.push({
          type: 'error',
          text: `[CRASH] ${err?.message || String(err)}`,
          time: getTimestamp()
        });
        setOutputLogs(logsList);
      } finally {
        setIsRunning(false);
      }
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

        {/* Action Controls & Interactive Execution Toggle */}
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
                    <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-[10px] px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap animate-bounce font-sans pointer-events-none">
                      {dir === 'rtl' ? 'تم النسخ!' : 'Copied!'}
                    </span>
                  )}
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
            /* Interactive Sandbox Mode (Editable code text area with Play & Reset toolbar) */
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

              {/* Execution Action Drawer Controls */}
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
                        onClick={() => { if (iframeSrc) { const blob = new Blob([iframeSrc], { type: 'text/html' }); const url = URL.createObjectURL(blob); window.open(url, '_blank'); } }}
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

              {/* Sandbox Outputs Drawer */}
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
                          <span>{dir === 'rtl' ? '콘솔 مخرجات كونسول الآلة' : 'CONSOLE RUNTIME WORKSPACE'}</span>
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
            /* Standard Read Only View with Code Syntax Box */
            isMediaUrl ? (
              <div className="w-full p-4 bg-[var(--bg-secondary)] rounded-b-md border-t border-gray-100 dark:border-gray-800/40">
                {codeContent.includes('.mp3') || codeContent.includes('.wav') || codeContent.includes('.ogg') ? (
                  <div className="flex flex-col items-center gap-4 py-8">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 animate-pulse">
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
                  {/* Line Numbers Column */}
                  <div className="flex select-none flex-col text-right text-[#5c5c62] py-5 pl-4 pr-3.5 border-r border-gray-100/10 dark:border-gray-800/20 font-mono text-[13px] md:text-[14px] leading-relaxed shrink-0 bg-[#0a0a0c]" style={{ userSelect: 'none' }}>
                    {Array.from({ length: editableCode.split('\n').length || 1 }, (_, i) => (
                      <span key={i + 1} className="block select-none min-w-[24px] text-right pr-0.5">
                        {i + 1}
                      </span>
                    ))}
                  </div>
                  {/* Code Snippet Column */}
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
                      dangerouslySetInnerHTML={{ __html: getHighlightedCode() }} 
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
  quota_data?: any;
  thinking_steps?: { step: string; status: 'completed' | 'processing' | 'pending' }[];
  citations?: { title: string; url: string; index: number }[];
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
  
  if (normId.startsWith('chat_fast') || normId === 'chat_fast') {
    return {
      label: dir === 'rtl' ? 'البحث السريع والتوليد الخفيف' : 'Fast Generation',
      icon: Zap,
      colorClass: 'text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]',
      bgClass: 'bg-amber-500/10 border-amber-500/20'
    };
  }
  if (normId.startsWith('chat_pro') || normId === 'chat_pro') {
    return {
      label: dir === 'rtl' ? 'الذكاء الفائق والتحليل المتقدم' : 'Elite Reasoning',
      icon: Sparkles,
      colorClass: 'text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]',
      bgClass: 'bg-emerald-500/10 border-emerald-500/20'
    };
  }
  if (normId.startsWith('chat_reasoning') || normId === 'chat_reasoning') {
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
    <div className={`flex items-center gap-2.5 mb-5 w-fit select-none bg-gray-50/50 dark:bg-[#1a1a1c]/20 border border-gray-100/60 dark:border-gray-800/20 px-3 py-1.5 rounded-[4px] shadow-sm backdrop-blur-[2px] ${dir === 'rtl' ? 'flex-row' : 'flex-row'}`}>
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
        <div className={`flex items-center gap-1.5 ${dir === 'rtl' ? 'flex-row' : 'flex-row'}`}>
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
            initial={{ opacity: 0, x: dir === 'rtl' ? 10 : -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
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
        className="flex items-center gap-2.5 px-4 py-2 rounded-md bg-transparent border border-[var(--border-main)] hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-theme group shadow-sm active:scale-95"
      >
        <div className="flex -space-x-2 rtl:space-x-reverse">
          {citations.slice(0, 3).map((cite, i) => (
            <div key={i} className="w-5 h-5 rounded-sm bg-[var(--bg-overlay)] border border-[var(--border)] flex items-center justify-center overflow-hidden shadow-sm">
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
        <span className="text-[11px] font-black text-[var(--text-secondary)] group-hover:text-emerald-500 transition-theme uppercase tracking-wider">
          {citations.length} {dir === 'rtl' ? 'مصادر موثقة' : 'Verified Sources'}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          className="text-[var(--text-muted)] group-hover:text-emerald-500 transition-theme"
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
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {citations.map((cite, idx) => (
                <motion.a 
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.03, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  key={idx}
                  href={cite.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-2.5 rounded-md bg-[var(--bg-overlay)] border border-[var(--border-main)] hover:border-emerald-500/30 hover:bg-emerald-500/[0.02] hover:shadow-lg hover:shadow-emerald-500/5 transition-theme group min-w-0"
                  title={cite.title}
                >
                  <div className="w-6 h-6 rounded-sm bg-emerald-500/10 flex items-center justify-center text-emerald-500 text-[9px] font-black flex-shrink-0 group-hover:bg-emerald-500 group-hover:text-white transition-theme">
                    {cite.index}
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-[11px] font-bold text-[var(--text-primary)] truncate group-hover:text-emerald-500 transition-theme">
                      {cite.title}
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <img src={getFavicon(cite.url) || ''} alt="" className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100 transition-opacity" />
                      <span className="text-[9px] text-[var(--text-muted)] truncate font-medium">
                        {cite.url.replace(/^https?:\/\//, '').split('/')[0]}
                      </span>
                    </div>
                  </div>
                  <ExternalLink size={11} className="text-[var(--text-muted)] group-hover:text-emerald-500 transition-theme shrink-0 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-transform" />
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
            className={`flex items-center gap-3 sm:gap-4 px-4 py-3.5 bg-transparent border border-[var(--border-main)] hover:border-emerald-500/40 hover:bg-emerald-500/[0.03] transition-theme text-start relative overflow-hidden rounded-md ${
              dir === 'rtl' ? 'flex-row' : 'flex-row'
            }`}
          >
            <div className={`w-8 h-8 rounded-sm bg-[var(--bg-overlay)] border border-[var(--border-main)] flex items-center justify-center text-[var(--text-muted)] group-hover:text-emerald-500 group-hover:border-emerald-500/50 group-hover:shadow-[0_0_8px_rgba(16,185,129,0.3)] transition-theme shrink-0 ${
              dir === 'rtl' ? 'order-first' : 'order-first'
            }`}>
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

const ProductionSuite = ({ content, dir, theme }: { content: string; dir: 'ltr' | 'rtl'; theme: string }) => {
  // Parsing the structured output based on the PERPLEXTA CREATIVE PRODUCTION PROTOCOL
  const sections: { title: string; body: string; id: string }[] = [];
  
  // High-precision split for the three perplexta phases
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
    <div className="flex flex-col gap-10 py-4 w-full">
      {sections.map((section, idx) => {
        const isMusicSection = section.title.includes('المقطع الموسيقي') || section.title.toLowerCase().includes('sonic') || section.title.toLowerCase().includes('orchestra');
        
        return (
          <motion.div
          key={section.id}
          initial={{ opacity: 0, scale: 0.98, y: 30 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ 
            duration: 0.3, 
            delay: idx * 0.1,
            ease: [0.22, 1, 0.36, 1] 
          }}
          className={`relative overflow-hidden rounded-lg border transition-theme group ${
            theme === 'dark' 
              ? 'bg-[#121214] border-[var(--border)] shadow-[0_20px_50px_rgba(0,0,0,0.5)]' 
              : 'bg-[var(--bg-surface)] border-[var(--border)] shadow-none'
          }`}
        >
          {/* Executive Header */}
          <div className={`px-8 py-6 border-b flex items-center justify-between ${
            theme === 'dark' ? 'border-[var(--border)] bg-[var(--bg-surface)]' : 'border-[var(--border)] bg-[var(--bg-base)]'
          }`}>
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-emerald-500 rounded-full blur-md opacity-20" />
                <div className="relative w-2 h-8 bg-emerald-500 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.4)]" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500 mb-0.5 glow-emerald">
                  {dir === 'rtl' ? 'مرحلة إنتاج بيربليكستا' : 'PERPLEXTA PRODUCTION PHASE'} {idx + 1}
                </span>
                <h3 className="text-xl font-black tracking-tight text-[var(--text-primary)] uppercase">
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
            <div className={`p-8 md:p-10 text-[13px] md:text-base ${isMusicSection ? 'text-center' : ''}`}>
              <div className="markdown-body prose dark:prose-invert max-w-none prose-p:leading-relaxed prose-headings:mb-4 prose-headings:mt-8">
                {isMusicSection ? (
                  <div className="flex flex-col items-center gap-8">
                    {/* Visual Exhibition */}
                    <div className="relative w-full max-w-3xl aspect-video rounded-lg overflow-hidden border border-emerald-500/20 shadow-2xl group/video bg-black mx-auto">
                      {coverImageUrl ? (
                        <img 
                          src={coverImageUrl} 
                          className="w-full h-full object-cover transition-transform duration-300 group-hover/video:scale-105 opacity-60" 
                          referrerPolicy="no-referrer" 
                          alt="Orchestra Cover" 
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
                           <Music className="text-[var(--text-primary)]" size={120} />
                        </div>
                      )}
                      
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                         <motion.div 
                           animate={{ scale: [1, 1.1, 1] }}
                           transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                           className="w-24 h-24 rounded-full bg-emerald-500/20 backdrop-blur-xl border border-emerald-500/40 flex items-center justify-center text-emerald-500 shadow-[0_0_50px_rgba(16,185,129,0.3)]"
                         >
                           <Play size={40} className="ml-1" />
                         </motion.div>
                         <div className="text-center px-6">
                            <h4 className="text-xl font-black text-white tracking-widest uppercase mb-1 drop-shadow-md">
                              {dir === 'rtl' ? 'تحفة الأوركسترا من بيربليكستا' : 'PERPLEXTA ORCHESTRA MASTERPIECE'}
                            </h4>
                            <p className="text-[10px] text-emerald-400 font-bold tracking-[0.2em] uppercase">
                              {dir === 'rtl' ? 'جودة استوديو 24 بت' : '24-BIT STUDIO QUALITY'}
                            </p>
                         </div>
                      </div>

                      {/* Visualizer bars */}
                      <div className="absolute bottom-0 left-0 w-full h-12 flex items-end justify-center gap-1.5 px-10 pb-4 opacity-50">
                        {Array.from({ length: 40 }).map((_, i) => (
                           <motion.div 
                             key={i}
                             animate={{ height: [4, Math.random() * 24 + 4, 4] }}
                             transition={{ duration: 0.3, repeat: Infinity }}
                             className="w-1 bg-emerald-500/60 rounded-full"
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

      {/* Referral Link Area */}
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

import { ErrorBoundary } from '../components/ErrorBoundary';

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
  const [selectedTool, setSelectedTool] = useState<string>('chat');
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
  const [liveElapsed, setLiveElapsed] = useState<number>(0);

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
  const [chatId, setChatId] = useState<string | null>(routeChatId || null);

  const hasActiveSub = !user || !!(user.subscription && user.subscription.status === 'active');
  const isInputDisabled = !!(user && (!user.subscription || user.subscription.status !== 'active'));

  // Perplexta Preservation: Debounced sync local state to persistent storage to prevent data loss on accidental reload
  useEffect(() => {
    if (!query) {
      sessionStorage.setItem('draft_query', '');
      return;
    }

    const handler = setTimeout(() => {
      sessionStorage.setItem('draft_query', query);
    }, 500); // 500ms debounce delay

    return () => {
      clearTimeout(handler);
    };
  }, [query]);

  useEffect(() => {
    localStorage.setItem('last_active_model', selectedModel);
  }, [selectedModel]);

  useEffect(() => {
    localStorage.setItem('last_active_tool', selectedTool);
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

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const authToken = token || localStorage.getItem('app_token');
      const response = await fetch('/api/files/analyze-forensic', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: formData
      });

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
      console.error('[Forensic client scanner]', err);
      toast.error(
        dir === 'rtl'
          ? `عذرًا، فشل الفحص: ${err.message}`
          : `Document diagnostic failed: ${err.message}`
      );
      setIsForensicModalOpen(false);
    } finally {
      setIsAnalyzingForensic(false);
    }
  };

  useEffect(() => {
    setIsOperationPending(isGenerating || query.length > 100);
  }, [isGenerating, query, setIsOperationPending]);

  // Synchronize generation state and active chat ID globally for real-time sidebar pulse
  useEffect(() => {
    const activeChatId = chatId || routeChatId || null;
    window.dispatchEvent(new CustomEvent('ai-streaming-state', {
      detail: { isGenerating, chatId: activeChatId }
    }));
    if (!isGenerating && activeChatId) {
      window.dispatchEvent(new Event('chat-updated'));
    }
  }, [isGenerating, chatId, routeChatId]);

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

  // Perplexta: document.title synchronization
  useEffect(() => {
    const firstUserMsg = messages.find(m => m.role === 'user');
    if (firstUserMsg) {
      document.title = stripProtocolMarkers(firstUserMsg.content).slice(0, 60);
    } else {
      document.title = dir === 'rtl' ? (siteSettings?.siteNameAr || 'محادثة بيربليكستا') : (siteSettings?.siteName || 'Perplexta Chat');
    }
  }, [messages, siteSettings, dir]);
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
    const threshold = 300; // pixels from the bottom
    const distanceToBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    setShowScrollToBottom(distanceToBottom > threshold);
  };
  
  const MAX_CHAT_MESSAGES = 50;
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const chatIdRef = useRef<string | null>(chatId);
  const streamingBuffer = useRef('');
  const typewriterInterval = useRef<any>(null);
  const isGeneratingRef = useRef(false);
  const isServerDoneRef = useRef(false);
  const generationStartTimeRef = useRef<number | null>(null);
  const finalResponseDataRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => scrollToBottom('smooth'), 100);
    }
  }, [messages.length, chatId]);

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
          // Perplexta: High-precision insertion
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
        footer.innerText = '© 2026 PERPLEXTA PLATFORM - CONFIDENTIAL AI REPORT';
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
      console.error('Export error:', error);
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
      console.error('Rename error:', e);
      toast.error(dir === 'rtl' ? 'فشل تعديل اسم المحادثة' : 'Failed to update chat title');
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
        // Track GA pin interaction
        trackGAEvent(isPinned ? 'message_pinned' : 'message_unpinned', 'interaction');
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
        // Track GA feedback event
        const feedLabel = feedback === 1 ? 'thumbs_up' : feedback === -1 ? 'thumbs_down' : 'neutral';
        trackGAEvent('feedback_submitted', 'message_quality', feedLabel);
      }
    } catch (err) {
      console.error('Feedback error:', err);
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
      console.error('Fork error:', err);
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
    // Perplexta: Auto-scrolling is strictly disabled to maintain a static, controlled screen view.
    // The user segment demands zero-jitter, manual context control.
  }, [messages, isGenerating]);

  useEffect(() => {
    isGeneratingRef.current = isGenerating;
    if (isGenerating) {
      startTypewriter();
    }
  }, [isGenerating]);

  // Clean up typewriter interval on component unmount
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
        // PERPLEXTA HIGH-PRECISION TYPEWRITER LOGIC
        // Dynamic pulling: scales up if queue builds up to maintain zero-latency
        const bufferLen = streamingBuffer.current.length;
        let pullAmount = 1;
        if (isServerDoneRef.current) {
          // If generation is complete, pull larger chunks to flush the buffer rapidly and avoid artificial lag
          pullAmount = Math.min(bufferLen, Math.max(12, Math.ceil(bufferLen / 3)));
        } else if (bufferLen > 200) {
          // Keep up with rapid server models under high load
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

        // Safe surrogate pair checker to avoid breaking emojis or complex characters helper
        if (pullAmount < bufferLen) {
          const charCode = streamingBuffer.current.charCodeAt(pullAmount - 1);
          // If split ends on high surrogate (0xD800 - 0xDBFF), increment to keep code point units unified
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
        // Stop interval when buffer is empty and generation is done
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

  // Synchronized scroll anchoring to eliminate typewriter visual jitter/vibration
  useLayoutEffect(() => {
    if (!isGenerating && !isOtherTyping) return;
    const container = document.getElementById('chat-messages-container');
    if (container) {
      // 300px threshold is a highly reliable visual scanning offset
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
    // Perplexta Memory Protocol: Initial Startup notification
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
      // Perplexta Resiliency: If we are already mid-generation for THIS chat ID, do not reload
      // This prevents the navigate() from triggering a fetch that wipes the streaming content.
      if ((isGenerating || isGeneratingRef.current) && (chatId === routeChatId || chatIdRef.current === routeChatId || !chatId)) {
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
      // Trigger Perplexta Memory Startup for new chat
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
      // Perplexta: Strict 100MB limit (Google-standard for high-intel analysis)
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
    setIsChatMessagesLoading(true);
    setMessages([]); // Clear stale messages to prevent visual overlap before fetch
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
        // Perplexta: Static view preserves position on load
        // setTimeout(() => scrollToBottom('auto'), 100);
      }
    } catch (error) {
      console.error('Failed to load chat messages', error);
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
        // Prevent appending a duplicate whole response text if chunks have already stream-loaded.
        if (streamingBuffer.current.length === 0) {
          streamingBuffer.current += data.chunk || '';
        }
      } else {
        streamingBuffer.current += data.chunk || '';
      }
    };

    const onChatResponse = async (data: any) => {
      // Buffer the final response data safely to prevent early typewriter state overwrites
      finalResponseDataRef.current = data;

      // If typing buffer has completely caught up, apply the definitive database response data immediately
      if (streamingBuffer.current.length === 0) {
        applyFinalResponse(data);
        setIsGenerating(false);
      } else {
        // Set an active polling watcher to transition only after the typewriter drains remaining chunks
        const checkBuffer = setInterval(async () => {
          if (streamingBuffer.current.length === 0) {
            clearInterval(checkBuffer);
            applyFinalResponse(finalResponseDataRef.current || data);
            setIsGenerating(false);
            streamingBuffer.current = ''; // Reset buffer
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

    const onWalletChargeNotice = (data: any) => {
      const { toolId, charged, amount } = data;
      const toolLabel = toolId === 'perplexta_analysis' 
        ? (dir === 'rtl' ? 'البحث التفصيلي العسكري المعمق' : 'Deep Military-Grade Analysis')
        : toolId;
      const msg = dir === 'rtl'
        ? `✓ نظام المحاسبة التلقائي: تم خصم ${charged === 'points' ? `${amount} نقطة أداة` : `$${amount.toFixed(2)} رصيد نقدي`} مقابل تشغيل أداة "${toolLabel}" بنجاح وتأصيل المعاملة بالدفتر.`
        : `✓ Auto-Billing: Charged ${charged === 'points' ? `${amount} tool points` : `$${amount.toFixed(2)} cash balance`} for executing "${toolLabel}" under ledger reference.`;
      toast.info(msg, { duration: 6000 });
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
          if (triggerUpgradePrompt) {
            triggerUpgradePrompt(selectedTool || 'chat', parsed.limit, parsed.current, parsed.period);
          }
        } else if (parsed.type === 'TOKEN_EXPIRED') {
          errorMessage = dir === 'rtl' ? 'انتهت صلاحية الجلسة. يرجى تحديث الصفحة أو تسجيل الدخول مرة أخرى.' : 'Session expired. Please refresh the page or login again.';
          setTimeout(() => window.location.reload(), 3000);
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

    const onTyping = (data: { isTyping: boolean; role?: 'assistant' | 'user'; name?: string }) => {
      if (data) {
        setIsOtherTyping(data.isTyping);
        setTypingParty(data.role || 'assistant');
        setTypingName(data.name || '');
      }
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
    socket.on('chat_error', onChatError);

    return () => {
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

      if (!hasActiveSub) {
        navigate('/subscription');
        return;
      }
      
      const currentQuery = overrideQuery || query;
      if (!currentQuery.trim() && !selectedFile) return;
      
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
      setMessages(updatedMessages);
      setIsGenerating(true);
      streamingBuffer.current = '';
      isServerDoneRef.current = false;
      
      // Track analytics event for chat submission
      trackGAEvent('chat_submitted', 'chat_engagement', toolToUse);
      
      // Small micro-task delay for first message UI sync
      await new Promise(resolve => setTimeout(resolve, 50));
      
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
        forensic_mode: forensicMode,
        video_settings: selectedTool === 'video' ? videoSettings : undefined,
        image_settings: selectedTool === 'image' ? imageSettings : undefined,
        audio_settings: selectedTool === 'canvas' ? audioSettings : undefined
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
                  console.log('[PWA Client] Registered background sync tag "sync-failed-messages"');
                }).catch(e => console.warn('Background sync registration failed:', e));
              }
            };
          } catch (e) {
            console.error('Failed to store failed message in IndexedDB:', e);
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
      desc: dir === 'rtl' ? 'توليد صور بجودة 8K من بيربليكستا' : 'Perplexta 8K Image Generation'
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
                  className={`text-[6px] md:text-[8px] font-black uppercase tracking-widest transition-theme whitespace-nowrap ${
                    imageSettings.style === s 
                      ? 'text-emerald-500 underline underline-offset-4 decoration-2' 
                      : 'text-gray-400/20 hover:text-gray-200'
                  }`}
                >
                  {t(s.toLowerCase()) || s}
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
                  onClick={() => setAudioSettings(prev => ({ ...prev, mood: m.id }))}
                  className={`text-[7px] md:text-[9px] font-black transition-theme pointer-events-auto cursor-pointer ${
                    audioSettings.mood === m.id 
                      ? 'text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.7)] scale-110' 
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
                  onClick={() => setAudioSettings(prev => ({ ...prev, duration: d }))}
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
                  onClick={() => setAudioSettings(prev => ({ ...prev, vocalType: v.id }))}
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

    return (
      <motion.div 
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, y: 5 }}
        className={`mb-1 w-full flex items-center justify-between pointer-events-auto px-1 md:px-8 pb-1 overflow-x-auto scrollbar-none ${dir === 'rtl' ? 'flex-row' : 'flex-row-reverse'}`}
      >
        <div className={`flex items-center gap-3 md:gap-7 shrink-0 ${dir === 'rtl' ? 'flex-row-reverse' : 'flex-row'}`}>
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

          <div className="w-px h-2 bg-gray-200/5 dark:bg-[var(--bg-secondary)]/5" />

          {/* Resolutions Group */}
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
  ];

  const currentModel = models.find(m => m.id === selectedModel) || models[2];
  const currentTool = advancedTools.find(t => t.id === selectedTool) || advancedTools[0];
  const isToolActive = selectedTool !== 'chat';


  const renderInputArea = () => (
    <div className="w-full flex flex-col box-border min-w-0 px-8 md:px-6 max-w-4xl mx-auto">
      {isMobile && messages.length === 0 && hasActiveSub && (
        <h1 className="text-[17px] font-black text-[var(--text-primary)] text-center tracking-tight mb-4 leading-tight px-0 uppercase drop-shadow-sm select-none">
          {t('howCanIHelp')}
        </h1>
      )}
      {renderVideoSettings()}
      {renderImageSettings()}
      {renderAudioSettings()}
      <motion.div 
        transition={springConfig}
        className={`w-full flex flex-col rounded-md border box-border min-w-0 transition-theme bg-transparent border-[var(--border-main)] ${
          isFocused 
            ? 'border-emerald-500/40 shadow-[0_0_0_4px_rgba(16,185,129,0.03)]' 
            : ''
        }`}
      >
        {/* Top: File/Image Preview */}
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
          {/* Send Button */}
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
                  "0 0 16px rgba(16, 185, 129, 0.6)",
                  "0 0 0px rgba(16, 185, 129, 0)"
                ],
                scale: [1, 1.05, 1],
                borderColor: [
                  "rgba(16, 185, 129, 0.1)",
                  "rgba(16, 185, 129, 0.5)",
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

          {/* Textarea Area */}
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
                  if (textareaRef.current) textareaRef.current.style.height = 'auto'; // Reset height
                }
              }}
              disabled={isInputDisabled}
              placeholder={isInputDisabled ? (dir === 'rtl' ? 'يرجى تنشيط حسابك بتفعيل باقة اشتراك للبدء...' : 'Activate your account with a subscription to start...') : t('askAssistant')}
              className={`w-full bg-transparent border-none outline-none px-1 py-1 text-[16px] sm:text-[17px] font-medium placeholder:text-[var(--text-secondary)]/50 text-[var(--text-primary)] resize-none scrollbar-none overflow-hidden leading-relaxed ${dir === 'rtl' ? 'text-right' : 'text-left'} ${isInputDisabled ? 'cursor-not-allowed text-gray-400' : ''}`}
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

            {/* Linked Model Selector */}
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

          {/* Voice to Text (STT) Button */}
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

          {messages.length > 0 && (
            <div className="sticky top-0 z-30 bg-[var(--bg-primary)]/80 backdrop-blur-md border-b border-[var(--border-main)]">
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
                                  console.error(e);
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
            </div>
          )}
          <div 
            id="chat-messages-container" 
            onScroll={handleScroll}
            className={`flex-1 overflow-y-scroll scrollbar-none custom-scrollbar w-full overflow-anchor-none relative h-full flex flex-col ${isGenerating ? 'scroll-behavior-auto' : 'scroll-smooth'}`}
          >
          <AnimatePresence mode="wait">
            {isChatMessagesLoading ? (
              <motion.div
                key="chat-messages-skeleton"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="flex-1 max-w-4xl mx-auto w-full px-8 md:px-6 py-12 flex flex-col gap-8 min-h-full"
              >
                {[...Array(3)].map((_, i) => (
                  <div 
                    key={i} 
                    className="flex gap-4 w-full p-6 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-main)] animate-pulse"
                  >
                    {/* Pulsing Avatar */}
                    <div className="w-10 h-10 rounded-full bg-gray-200/20 dark:bg-gray-800/40 shrink-0" />
                    {/* Pulsing Line Blocks */}
                    <div className="flex-1 space-y-3 pt-1">
                      <div className="h-2.5 bg-gray-250/50 dark:bg-gray-800/50 rounded w-1/4" />
                      <div className="h-3 bg-gray-200/30 dark:bg-gray-800/30 rounded w-3/4" />
                      <div className="h-3 bg-gray-200/30 dark:bg-gray-800/30 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </motion.div>
            ) : messages.length === 0 ? (
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
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  className="hidden md:flex flex-1 flex-col items-center justify-center min-h-full py-12 overflow-hidden select-none w-full"
                >
                <div className="w-full max-w-4xl px-8 md:px-6 flex flex-col items-center">
                  <h1 
                    className="text-lg md:text-3xl font-black text-[var(--text-primary)] text-center tracking-tight mb-3 md:mb-8 leading-tight px-0 md:px-4 uppercase drop-shadow-sm select-none"
                  >
                    {t('howCanIHelp')}
                  </h1>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 w-full">
                    {suggestions.map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setQuery(item.label);
                          setSelectedTool((item as any).toolId);
                          setActiveDropdown('tool');
                        }}
                        className="group flex items-center h-[54px] md:h-[70px] gap-3 md:gap-4 p-3 md:p-4 rounded-md border transition-theme text-start relative overflow-hidden bg-transparent border-[var(--border)] hover:border-emerald-500/40 hover:bg-emerald-500/[0.02] shadow-sm active:scale-100"
                      >
                        <div className={`w-8 h-8 md:w-10 md:h-10 rounded-sm flex items-center justify-center transition-theme relative z-10 bg-transparent text-gray-400 ${item.hoverColor} ${item.dropShadow}`}>
                          {React.cloneElement(item.icon as React.ReactElement, { size: isMobile ? 16 : 20, className: 'md:w-5 md:h-5' } as any)}
                        </div>
                        <div className="flex flex-col items-start gap-0 relative z-10 flex-1 min-w-0">
                          <span className="text-[12px] md:text-[14px] font-black tracking-tight leading-tight transition-theme truncate w-full text-[var(--text-primary)] group-hover:text-emerald-500">
                            {item.label}
                          </span>
                          <span className="text-[7px] md:text-[9px] text-gray-500 font-bold uppercase tracking-[0.1em] opacity-40 group-hover:opacity-100 group-hover:text-emerald-500/70 transition-theme truncate w-full">
                            {item.desc}
                          </span>
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/0 via-transparent to-emerald-500/[0.02] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <div className="absolute -inset-px rounded-md border border-emerald-500/0 group-hover:border-emerald-500/10 transition-theme pointer-events-none" />
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
              )
            ) : (
              <motion.div
                key="chat-thread-view"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="flex flex-col gap-4 md:gap-6 max-w-4xl mx-auto w-full px-8 md:px-6 pt-4"
              >
              {messages.map((msg, idx) => {
                return (
                  <div 
                    key={msg.client_id || msg.id || idx} 
                    id={`message-${idx}`}
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
                                    className="w-full bg-transparent border-none focus:ring-0 text-[16px] md:text-sm resize-none outline-none"
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
                                <div className={`group relative flex items-center gap-3 w-full ${dir === 'rtl' ? 'flex-row' : 'flex-row'}`}>
                                  {/* Each question is an H1-style heading in the flow */}
                                  <h1 className={`text-md md:text-xl font-black tracking-tight flex-1 ${dir === 'rtl' ? 'text-right' : 'text-left'} leading-tight whitespace-pre-wrap text-[var(--text-primary)] uppercase`}>
                                    {stripProtocolMarkers(msg.content)}
                                  </h1>
                                  {msg.is_pinned && (
                                    <div className="absolute -top-1 -start-1 flex items-center gap-1 bg-emerald-500/10 px-1.5 py-0.5 rounded-sm border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                                      <Pin size={8} className="text-emerald-500" />
                                      <span className="text-[7px] font-black uppercase text-emerald-500/80 tracking-tighter">Pinned</span>
                                    </div>
                                  )}
                                  <button 
                                    onClick={() => handlePinMessage(msg.id!, !msg.is_pinned)}
                                    className={`opacity-0 group-hover:opacity-100 transition-all duration-300 p-1.5 rounded-sm hover:bg-[var(--bg-overlay)] shrink-0 ${
                                      msg.is_pinned ? 'text-emerald-500 hover:text-emerald-600' : 'text-gray-400 hover:text-emerald-500'
                                    }`}
                                    title={msg.is_pinned ? (dir === 'rtl' ? 'إلغاء التثبيت' : 'Unpin') : (dir === 'rtl' ? 'تثبيت' : 'Pin')}
                                  >
                                    {msg.is_pinned ? <PinOff size={14} /> : <Pin size={14} />}
                                  </button>
                                  <button 
                                    onClick={() => {
                                      setEditingMessageIndex(idx);
                                      setEditValue(msg.content);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 transition-theme p-1.5 rounded-sm hover:bg-[var(--bg-overlay)] text-gray-400 hover:text-emerald-500 shrink-0"
                                    title={dir === 'rtl' ? 'تعديل' : 'Edit'}
                                  >
                                    <Pencil size={14} />
                                  </button>
                                </div>
                              )}
                              {/* Exact Forensic Timestamp for User message */}
                              <div className={`text-[10px] font-mono text-gray-400 dark:text-gray-500/80 mt-1 select-none ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
                                {formatExactTimestamp(msg.created_at, dir)}
                              </div>
                        </div>
                      ) : (
                      <motion.div 
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                        className="markdown-body prose dark:prose-invert max-w-none relative text-[13px] md:text-base leading-relaxed tracking-tight"
                      >
                        {!msg.is_quota_error && !msg.is_system_inactive && (
                          <ToolStatusIndicator 
                            tool={msg.tool} 
                            isGenerating={isGenerating && idx === messages.length - 1} 
                            dir={dir} 
                            t={t} 
                          />
                        )}
                        {isGenerating && idx === messages.length - 1 && msg.content === '' && (!msg.thinking_steps || msg.thinking_steps.length === 0) ? (
                           <ResponseSkeleton dir={dir} />
                        ) : msg.is_quota_error ? (
                           <QuotaExceededCard tool={msg.tool} data={msg.quota_data} dir={dir} t={t} navigate={navigate} user={user} />
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
                                  p: ({ children, node }: any) => {
                                    const isLastMessage = idx === messages.length - 1;
                                    const isStreamingActive = isLastMessage && msg.is_streaming;
                                    
                                    // Identify if this is precisely the last paragraph in the markdown output
                                    const isLastParagraph = node && node.parent && node.parent.children[node.parent.children.length - 1] === node;

                                    if (typeof children === 'string' || (Array.isArray(children) && children.every(c => typeof c === 'string'))) {
                                      const text = Array.isArray(children) ? children.join('') : children;
                                      const parts = text.split(/(\[\d+\])/g);
                                      return (
                                        <div className="last:mb-0 mb-3 text-sm leading-relaxed text-slate-900 dark:text-slate-100 antialiased font-normal">
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
                                                    className="inline-flex items-center justify-center px-1.5 py-0.5 mx-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-bold text-emerald-500 hover:bg-emerald-500 hover:text-white transition-theme no-underline align-middle shadow-sm sm:scale-100 scale-90"
                                                    title={citation.title}
                                                  >
                                                    {citation.title.split(' ')[0] || index}
                                                  </a>
                                                );
                                              }
                                            }
                                            return part;
                                          })}
                                          {isStreamingActive && isLastParagraph && (
                                            <span className="typing-cursor-emerald" />
                                          )}
                                        </div>
                                      );
                                    }
                                    return (
                                      <div className="last:mb-0 mb-3 text-sm leading-relaxed text-slate-900 dark:text-slate-100 antialiased font-normal">
                                        {children}
                                        {isStreamingActive && isLastParagraph && (
                                          <span className="typing-cursor-emerald" />
                                        )}
                                      </div>
                                    );
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
                                  link.download = `Perplexta_Gen_${Date.now()}.png`;
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
                                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                                  className="my-4 relative group inline-block w-full max-w-[280px] sm:max-w-sm overflow-hidden rounded-[var(--radius)] border border-[var(--border)] shadow-md transition-theme duration-300 hover:shadow-emerald-500/10 hover:border-emerald-500/30"
                                >
                                  <img 
                                    {...props} 
                                    className="block w-full h-auto object-cover transition-transform duration-300 group-hover:scale-105" 
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
                                  link.download = `Perplexta_Gen_${Date.now()}.mp4`;
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                  window.URL.revokeObjectURL(url);
                                } catch (err) {
                                  console.error("Video download failed", err);
                                }
                              };

                              return (
                                <div className="my-4 relative group inline-block max-w-[85%] md:max-w-md overflow-hidden rounded-[var(--radius)] border border-[var(--border)] shadow-md transition-theme hover:shadow-emerald-500/10 hover:border-emerald-500/30">
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
                      {/* Exact Forensic Timestamp for Assistant Response */}
                      <div className={`text-[10px] font-mono text-gray-400 dark:text-gray-500/80 mt-2 select-none ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
                        {formatExactTimestamp(msg.created_at, dir)}
                      </div>
                    </motion.div>
                  )}

                  {/* Perplexta Message Toolbar - Optimized Bottom Layout */}
                  {(!isGenerating || idx < messages.length - 1) && msg.role === 'assistant' && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center justify-between mt-6 pt-4 border-t border-[var(--border-main)]/30 dark:border-[var(--border-main)]/20 px-0"
                    >
                      <div className="flex items-center gap-0.5 sm:gap-1.5">
                        <button 
                          onClick={() => handleFeedback(msg.id!, msg.feedback === 1 ? 0 : 1)}
                          className={`w-7 h-7 sm:w-10 sm:h-10 flex items-center justify-center rounded-sm transition-theme ${msg.feedback === 1 ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-transparent border border-transparent hover:bg-[var(--bg-overlay)] text-[var(--text-muted)] hover:text-emerald-500 hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]'}`}
                        >
                          <ThumbsUp size={13} />
                        </button>
                        <button 
                          onClick={() => handleFeedback(msg.id!, msg.feedback === -1 ? 0 : -1)}
                          className={`w-7 h-7 sm:w-10 sm:h-10 flex items-center justify-center rounded-sm transition-theme ${msg.feedback === -1 ? 'text-amber-500 bg-amber-500/10 border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.3)]' : 'bg-transparent border border-transparent hover:bg-[var(--bg-overlay)] text-[var(--text-muted)] hover:text-amber-500 hover:drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]'}`}
                        >
                          <ThumbsDown size={13} />
                        </button>
                        <div className="w-px h-3 sm:h-4 bg-[var(--border)] mx-0.5 sm:mx-1" />
                        <button 
                          onClick={() => handlePinMessage(msg.id!, !msg.is_pinned)}
                          title={msg.is_pinned ? (dir === 'rtl' ? 'إلغاء التثبيت' : 'Unpin') : (dir === 'rtl' ? 'تثبيت' : 'Pin')}
                          className={`hidden sm:flex w-7 h-7 sm:w-10 sm:h-10 items-center justify-center rounded-sm bg-transparent border transition-theme ${msg.is_pinned ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'border-transparent text-[var(--text-muted)] hover:text-emerald-500 hover:bg-emerald-500/5'}`}
                        >
                          {msg.is_pinned ? <PinOff size={13} /> : <Pin size={13} />}
                        </button>
                        <button 
                          onClick={() => handleTTS(msg.content, msg.client_id || msg.id || idx)}
                          title={playingTTSId === (msg.client_id || msg.id || idx) ? (dir === 'rtl' ? 'إيقاف الصوت' : 'Stop') : (dir === 'rtl' ? 'قراءة صوتية' : 'Read Aloud')}
                          className={`hidden sm:flex w-7 h-7 sm:w-10 sm:h-10 items-center justify-center rounded-sm bg-transparent border transition-theme ${playingTTSId === (msg.client_id || msg.id || idx) ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'border-transparent text-[var(--text-muted)] hover:bg-[var(--bg-overlay)] hover:text-emerald-500 hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]'}`}
                        >
                          {playingTTSId === (msg.client_id || msg.id || idx) ? (
                            <Square size={13} fill="currentColor" />
                          ) : (
                            <Volume2 size={13} />
                          )}
                        </button>
                        <button 
                          onClick={() => handleRegenerate(idx)}
                          title={dir === 'rtl' ? 'إعادة توليد' : 'Regenerate'}
                          className={`w-7 h-7 sm:w-10 sm:h-10 flex items-center justify-center rounded-sm bg-transparent border border-transparent hover:bg-[var(--bg-overlay)] text-[var(--text-muted)] hover:text-emerald-500 hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)] transition-theme ${isGenerating && idx === messages.length - 1 ? 'animate-spin opacity-50' : ''}`}
                        >
                          <RefreshCw size={13} />
                        </button>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(msg.content);
                            toast.success(dir === 'rtl' ? 'تم النسخ بنجاح' : 'Copied successfully');
                          }}
                          title={dir === 'rtl' ? 'نسخ' : 'Copy'}
                          className="w-7 h-7 sm:w-10 sm:h-10 flex items-center justify-center rounded-sm bg-transparent border border-transparent hover:bg-[var(--bg-overlay)] text-gray-400 hover:text-emerald-500 hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)] transition-theme"
                        >
                          <Copy size={13} />
                        </button>
                        <button 
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
                        </button>
                        {msg.id && (
                          <button 
                            id={`fork-btn-${msg.id}`}
                            onClick={() => handleForkThread(msg.id!)}
                            title={dir === 'rtl' ? 'تفريع المحادثة' : 'Fork Thread'}
                            className="hidden sm:flex w-10 h-10 items-center justify-center rounded-[4px] bg-transparent border border-transparent text-gray-400 hover:text-emerald-500 hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)] hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-300"
                          >
                            <GitFork size={13} />
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1 sm:gap-2">
                        {msg.generation_time !== undefined && (
                          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] bg-emerald-500/5 dark:bg-emerald-500/5 border border-emerald-500/10 text-emerald-500 select-none mr-1 sm:mr-2">
                            <Zap size={10} className="text-emerald-500" />
                            <span className="text-[10px] font-mono leading-none font-semibold">
                              {Number(msg.generation_time).toFixed(2)}s
                            </span>
                          </div>
                        )}
                        <button 
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
                              console.error('Share failed', err);
                            }
                          }}
                          title={dir === 'rtl' ? 'مشاركة' : 'Share'}
                          className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-[var(--radius)] bg-[var(--bg-overlay)] border border-[var(--border)] text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.15)] hover:bg-emerald-500/10 transition-theme ml-1 sm:ml-2"
                        >
                          <Share2 size={14} className="drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                        </button>

                         <div className="relative">
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
                                          console.error(e);
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
                                       console.error(e);
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
                                         console.error(e);
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
                         </div>
                      </div>
                    </motion.div>
                  )}
                  
                  </div>
                </div>
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

      <div className="w-full flex-shrink-0 px-0 md:px-4 pb-4 relative">
        <AnimatePresence>
          {showScrollToBottom && (
            <motion.button
              key="scroll-to-bottom-btn"
              initial={{ opacity: 0, y: 10, x: "-50%", scale: 0.8 }}
              animate={{ opacity: 1, y: 0, x: "-50%", scale: 1 }}
              exit={{ opacity: 0, y: 10, x: "-50%", scale: 0.8 }}
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
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-[#0f0f11] border border-gray-800 text-gray-100 rounded-lg w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden font-sans"
            >
              {/* Header */}
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

              {/* Body Content */}
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
                    {/* Highlights Alerts Grid */}
                    {forensicReport.anomalies.length > 0 ? (
                      <div className="p-4 rounded-md bg-red-950/20 border border-red-900/40 text-red-200">
                        <div className="flex items-center gap-2 mb-2 font-black text-xs tracking-wider uppercase">
                          <AlertTriangle size={14} className="text-red-500 animate-bounce" />
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
                      {/* Left Side: Document Structure */}
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

                        {/* Hidden Layers list if any */}
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

                      {/* Right Side: Document Metadata Archive */}
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

                    {/* Bottom section: Scanner Log */}
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

              {/* Footer close button */}
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
      </motion.div>
    </ErrorBoundary>
  );
};

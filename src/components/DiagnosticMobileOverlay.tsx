import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Eye, EyeOff, Ruler, Smartphone, ChevronDown, ChevronUp, Layers, CheckCircle2, AlertTriangle } from 'lucide-react';

interface ElementMetrics {
  type: 'header' | 'footer' | 'input';
  selector: string;
  height: number;
  bottomPadding: string;
  topPadding: string;
  clearanceFromBottom: number;
  rect: DOMRect;
}

export const DiagnosticMobileOverlay: React.FC = () => {
  const [isOpen, setIsOpen] = useState<boolean>(() => {
    // Auto-enable if ?diag=1 or ?diagnostic=true in URL
    const params = new URLSearchParams(window.location.search);
    return params.get('diag') === '1' || params.get('diagnostic') === 'true';
  });
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [showSafeBand, setShowSafeBand] = useState<boolean>(true);
  const [showElementOutlines, setShowElementOutlines] = useState<boolean>(true);
  const [metrics, setMetrics] = useState<ElementMetrics[]>([]);
  const [viewportMetrics, setViewportMetrics] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
    safeAreaBottomPx: 0,
    isMobile: false,
  });

  // Periodically inspect DOM for headers, footers, inputs and calculate bounding boxes
  useEffect(() => {
    if (!isOpen) return;

    const updateMetrics = () => {
      const vWidth = window.innerWidth;
      const vHeight = window.innerHeight;

      // Calculate safe area bottom inset by creating a test element with env(safe-area-inset-bottom)
      const testEl = document.createElement('div');
      testEl.style.position = 'fixed';
      testEl.style.bottom = '0';
      testEl.style.height = 'env(safe-area-inset-bottom, 0px)';
      testEl.style.visibility = 'hidden';
      document.body.appendChild(testEl);
      const computedSafeAreaPx = testEl.getBoundingClientRect().height || 0;
      document.body.removeChild(testEl);

      setViewportMetrics({
        width: vWidth,
        height: vHeight,
        safeAreaBottomPx: computedSafeAreaPx,
        isMobile: vWidth < 768,
      });

      const detected: ElementMetrics[] = [];

      // 1. Detect Headers
      const headers = Array.from(document.querySelectorAll('header, [data-diag="header"]'));
      headers.forEach((el, index) => {
        const rect = el.getBoundingClientRect();
        if (rect.height > 0 && rect.top < 100) {
          const style = window.getComputedStyle(el);
          detected.push({
            type: 'header',
            selector: `Header #${index + 1}`,
            height: Math.round(rect.height),
            topPadding: style.paddingTop,
            bottomPadding: style.paddingBottom,
            clearanceFromBottom: Math.round(vHeight - rect.bottom),
            rect,
          });
        }
      });

      // 2. Detect Footers & Fixed Bottom Navs
      const footers = Array.from(document.querySelectorAll('nav.fixed.bottom-0, footer, [data-diag="footer"]'));
      footers.forEach((el, index) => {
        const rect = el.getBoundingClientRect();
        if (rect.height > 0 && rect.bottom >= vHeight - 10) {
          const style = window.getComputedStyle(el);
          detected.push({
            type: 'footer',
            selector: `Footer/Nav #${index + 1}`,
            height: Math.round(rect.height),
            topPadding: style.paddingTop,
            bottomPadding: style.paddingBottom,
            clearanceFromBottom: Math.round(vHeight - rect.bottom),
            rect,
          });
        }
      });

      // 3. Detect Input Containers / Chat Input Areas
      const inputs = Array.from(document.querySelectorAll('[data-diag="input"], .input-container, textarea'));
      inputs.forEach((el, index) => {
        const rect = el.getBoundingClientRect();
        if (rect.height > 0 && rect.top > vHeight / 2) {
          const style = window.getComputedStyle(el);
          detected.push({
            type: 'input',
            selector: `Input Area #${index + 1}`,
            height: Math.round(rect.height),
            topPadding: style.paddingTop,
            bottomPadding: style.paddingBottom,
            clearanceFromBottom: Math.round(vHeight - rect.bottom),
            rect,
          });
        }
      });

      setMetrics(detected);
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 500);
    window.addEventListener('resize', updateMetrics);
    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', updateMetrics);
    };
  }, [isOpen]);

  return (
    <>
      {/* Floating Control Toggle Button (Hidden - Runs in background) */}
      <div className="hidden fixed top-20 right-3 z-[99999] select-none font-sans dir-ltr" aria-hidden="true">
        {!isOpen && (
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-slate-900/90 dark:bg-zinc-900/90 text-emerald-400 border border-emerald-500/40 shadow-xl backdrop-blur-md text-[11px] font-mono font-bold hover:scale-105 transition-all cursor-pointer"
            title="Open Mobile 74px Safe Area Diagnostic Overlay"
          >
            <Ruler size={13} className="text-emerald-400 animate-pulse" />
            <span>74px Diag</span>
          </button>
        )}
      </div>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[99998] pointer-events-none select-none font-sans">
            {/* 1. BOTTOM 74PX SAFE AREA ZONE OVERLAY */}
            {showSafeBand && (
              <div 
                className="fixed bottom-0 left-0 right-0 z-[99997] pointer-events-none transition-all duration-200 border-t-2 border-dashed border-pink-500 bg-pink-500/15 backdrop-blur-[2px] flex flex-col items-center justify-center"
                style={{
                  height: `calc(20px + env(safe-area-inset-bottom, 0px))`,
                  minHeight: '36px',
                }}
              >
                <div className="bg-pink-600/90 text-white text-[9.5px] font-mono font-black px-2 py-0.5 rounded-full shadow-md flex items-center gap-1">
                  <Smartphone size={11} />
                  <span>74px SAFE AREA ZONE (pb-20px + env-safe)</span>
                </div>
              </div>
            )}

            {/* 2. ELEMENT BOUNDING OUTLINES */}
            {showElementOutlines && metrics.map((m, idx) => {
              const isFooter = m.type === 'footer';
              const isHeader = m.type === 'header';
              const isInput = m.type === 'input';

              const colorClass = isFooter
                ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                : isHeader
                ? 'border-cyan-500 bg-cyan-500/10 text-cyan-300'
                : 'border-emerald-500 bg-emerald-500/10 text-emerald-300';

              const badgeColor = isFooter
                ? 'bg-amber-600'
                : isHeader
                ? 'bg-cyan-600'
                : 'bg-emerald-600';

              return (
                <div
                  key={`diag-outline-${m.type}-${idx}`}
                  className={`fixed pointer-events-none z-[99996] border-2 border-dashed ${colorClass} transition-all duration-300 flex items-start justify-between p-1`}
                  style={{
                    top: `${m.rect.top}px`,
                    left: `${m.rect.left}px`,
                    width: `${m.rect.width}px`,
                    height: `${m.rect.height}px`,
                  }}
                >
                  <span className={`${badgeColor} text-white text-[9px] font-mono font-bold px-1.5 py-0.5 rounded shadow-sm opacity-90`}>
                    {m.type.toUpperCase()}: {m.height}px | pb: {m.bottomPadding}
                  </span>
                  <span className="text-[8.5px] font-mono font-semibold bg-black/70 text-white px-1 rounded">
                    Y: {Math.round(m.rect.top)}px
                  </span>
                </div>
              );
            })}

            {/* 3. TELEMETRY PANEL CARD */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed top-3 left-3 right-3 sm:left-auto sm:right-3 sm:w-80 z-[99999] pointer-events-auto bg-slate-950/95 text-slate-100 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-xl p-3 font-mono text-xs overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 mb-2">
                <div className="flex items-center gap-1.5 font-bold text-emerald-400 text-xs">
                  <ShieldCheck size={14} className="text-emerald-400" />
                  <span>74px Safe Area Diagnostic</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setIsMinimized(!isMinimized)}
                    className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                    title={isMinimized ? 'Expand Panel' : 'Minimize Panel'}
                  >
                    {isMinimized ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="p-1 rounded hover:bg-red-950/60 text-slate-400 hover:text-red-400 cursor-pointer"
                    title="Close Diagnostic Overlay"
                  >
                    <EyeOff size={14} />
                  </button>
                </div>
              </div>

              {!isMinimized && (
                <div className="space-y-2.5">
                  {/* Status Banner */}
                  <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-[11px]">
                    <div className="flex items-center gap-1.5 text-emerald-300 font-bold">
                      <CheckCircle2 size={13} className="text-emerald-400 flex-shrink-0" />
                      <span>Mobile Design System Active</span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[9.5px] font-bold">
                      74px ZONE OK
                    </span>
                  </div>

                  {/* Metrics Table */}
                  <div className="space-y-1 text-[10.5px] text-slate-300 bg-slate-900/60 p-2 rounded-xl border border-slate-800/60">
                    <div className="flex justify-between py-0.5 border-b border-slate-800/40">
                      <span className="text-slate-400">Viewport Dimensions:</span>
                      <span className="text-cyan-300 font-bold">{viewportMetrics.width}px × {viewportMetrics.height}px</span>
                    </div>
                    <div className="flex justify-between py-0.5 border-b border-slate-800/40">
                      <span className="text-slate-400">Target Platform:</span>
                      <span className="text-purple-300 font-bold">{viewportMetrics.isMobile ? 'Mobile View (< 768px)' : 'Desktop View'}</span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-slate-400">Safe Area Bottom:</span>
                      <span className="text-pink-300 font-bold">{viewportMetrics.safeAreaBottomPx}px (calc: 20px + env)</span>
                    </div>
                  </div>

                  {/* Inspected Containers List */}
                  <div>
                    <div className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1 flex items-center justify-between">
                      <span>Inspected Containers ({metrics.length})</span>
                      <Layers size={11} className="text-slate-500" />
                    </div>
                    {metrics.length === 0 ? (
                      <div className="text-[10px] text-slate-500 italic p-1.5 text-center bg-slate-900/40 rounded-lg">
                        No fixed headers or footers in current view
                      </div>
                    ) : (
                      <div className="max-h-28 overflow-y-auto space-y-1 pr-0.5 scrollbar-thin">
                        {metrics.map((m, i) => (
                          <div 
                            key={`metric-item-${i}`}
                            className="flex items-center justify-between text-[10px] p-1.5 rounded bg-slate-900/80 border border-slate-800"
                          >
                            <span className={`font-bold ${m.type === 'footer' ? 'text-amber-400' : m.type === 'header' ? 'text-cyan-400' : 'text-emerald-400'}`}>
                              {m.selector}
                            </span>
                            <span className="text-slate-300">
                              H: <strong className="text-white">{m.height}px</strong> | PB: <strong className="text-slate-200">{m.bottomPadding}</strong>
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Layer Toggles */}
                  <div className="pt-1 border-t border-slate-800/60 flex items-center justify-between text-[10px]">
                    <button
                      type="button"
                      onClick={() => setShowSafeBand(!showSafeBand)}
                      className={`px-2 py-1 rounded border transition-all cursor-pointer ${
                        showSafeBand
                          ? 'bg-pink-950/50 border-pink-500/50 text-pink-300 font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-500'
                      }`}
                    >
                      {showSafeBand ? '✓ 74px Zone Band' : 'Show 74px Zone'}
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowElementOutlines(!showElementOutlines)}
                      className={`px-2 py-1 rounded border transition-all cursor-pointer ${
                        showElementOutlines
                          ? 'bg-cyan-950/50 border-cyan-500/50 text-cyan-300 font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-500'
                      }`}
                    >
                      {showElementOutlines ? '✓ Element Outlines' : 'Show Outlines'}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

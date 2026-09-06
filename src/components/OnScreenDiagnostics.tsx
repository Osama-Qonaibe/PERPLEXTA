import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, AlertTriangle, Shield, CheckCircle2, RefreshCw, X, Minimize2, Maximize2 } from 'lucide-react';
import { VolumeVisualizer } from './VolumeVisualizer';

export interface OnScreenDiagnosticsProps {
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
  currentTime: number;
  duration: number;
  isBuffering: boolean;
  hasFatalError: boolean;
  videoResolution: { width: number; height: number; qualityLabel: string } | null;
  videoElement: HTMLVideoElement | null;
  playerId: string;
  onClose?: () => void;
  isRtl?: boolean;
}

export const OnScreenDiagnostics: React.FC<OnScreenDiagnosticsProps> = ({
  isPlaying,
  isMuted,
  volume,
  currentTime,
  duration,
  isBuffering,
  hasFatalError,
  videoResolution,
  videoElement,
  playerId,
  onClose,
  isRtl = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [domMetrics, setDomMetrics] = useState({
    readyState: 0,
    networkState: 0,
    paused: true,
    seeking: false,
    bufferedAhead: 0,
    bufferedPercent: 0,
    error: null as string | null,
    src: '',
    autoplay: false,
    playsInline: false,
  });

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Poll direct HTML5 video DOM properties for high-precision debugging
  useEffect(() => {
    const updateDomMetrics = () => {
      if (!videoElement) return;

      let bufferedAhead = 0;
      let bufferedPercent = 0;
      try {
        const buffered = videoElement.buffered;
        const current = videoElement.currentTime;
        for (let i = 0; i < buffered.length; i++) {
          const start = buffered.start(i);
          const end = buffered.end(i);
          if (current >= start && current <= end) {
            bufferedAhead = end - current;
            const dur = videoElement.duration || 1;
            bufferedPercent = (end / dur) * 100;
            break;
          }
        }
      } catch (_) {}

      setDomMetrics({
        readyState: videoElement.readyState,
        networkState: videoElement.networkState,
        paused: videoElement.paused,
        seeking: videoElement.seeking,
        bufferedAhead,
        bufferedPercent,
        error: videoElement.error ? `Code ${videoElement.error.code}: ${videoElement.error.message || 'Media Error'}` : null,
        src: videoElement.currentSrc || videoElement.src || '',
        autoplay: videoElement.autoplay,
        playsInline: videoElement.playsInline,
      });
    };

    // Update immediately
    updateDomMetrics();

    // Poll every 500ms
    pollIntervalRef.current = setInterval(updateDomMetrics, 500);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [videoElement, currentTime]);

  const getReadyStateLabel = (state: number) => {
    switch (state) {
      case 0: return '0: HAVE_NOTHING (No media metadata)';
      case 1: return '1: HAVE_METADATA (Metadata loaded)';
      case 2: return '2: HAVE_CURRENT_DATA (Current frame available, not enough to play)';
      case 3: return '3: HAVE_FUTURE_DATA (Enough data to play a small segment)';
      case 4: return '4: HAVE_ENOUGH_DATA (Playable with full buffers)';
      default: return 'Unknown';
    }
  };

  const getNetworkStateLabel = (state: number) => {
    switch (state) {
      case 0: return '0: NETWORK_EMPTY (Not initialized)';
      case 1: return '1: NETWORK_IDLE (Loaded, connection idle)';
      case 2: return '2: NETWORK_LOADING (Active download/buffering)';
      case 3: return '3: NETWORK_NO_SOURCE (Source not found)';
      default: return 'Unknown';
    }
  };

  const isIframe = window.self !== window.top;
  const userAgent = navigator.userAgent;
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  const isSocialMediaBrowser = /FBAN|FBAV|Instagram|Twitter|Pinterest|Snapchat/i.test(userAgent);

  // Generate dynamic, helpful diagnostic advice based on the state combination
  const getDiagnosticAdvice = () => {
    const adviceList: string[] = [];

    if (isSocialMediaBrowser) {
      adviceList.push(
        isRtl 
          ? '⚠️ تصفح داخل شبكة اجتماعية (فيسبوك/إنستغرام): تقوم هذه المتصفحات بكتم الصوت تلقائياً وتمنع التشغيل التلقائي العالي. ينصح بفتح الرابط في متصفح خارجي (Chrome/Safari).'
          : '⚠️ Social Media Browser (In-App) detected: WebView environments enforce extremely strict autoplay blocks. Switch to Chrome or Safari for an optimal experience.'
      );
    }

    if (isIframe) {
      adviceList.push(
        isRtl
          ? 'ℹ️ التطبيق محمل داخل إطار (Iframe): تمنع المتصفحات الصوت التلقائي داخل الإطارات ما لم يُصرح لها صراحة (allow="autoplay").'
          : 'ℹ️ Application loaded in Sandbox (Iframe): Browsers restrict unmuted autoplay inside frames unless explicitly delegated.'
      );
    }

    if (!isMuted && isPlaying && videoElement?.paused) {
      adviceList.push(
        isRtl
          ? '🚨 حظر تشغيل الصوت! يحاول المشغل الدوران بصوت ولكن المتصفح يمنعه. اضغط كتم الصوت أو قم بلمس الصفحة لمنح إذن التشغيل.'
          : '🚨 Autoplay sound block! Player state is active but HTML5 element is paused. Toggle mute or tap anywhere on the page to trigger user-gesture permission.'
      );
    }

    if (domMetrics.readyState < 2 && (isPlaying || !domMetrics.paused)) {
      adviceList.push(
        isRtl
          ? '⏳ تعثر التحميل: لم يكتمل تحميل البيانات بعد. تحقق من اتصال الشبكة وصلاحية الرابط.'
          : '⏳ Buffering/Stalled: readyState is under HAVE_CURRENT_DATA. Check network connection or verify that the video source URL is active.'
      );
    }

    if (domMetrics.error) {
      adviceList.push(
        isRtl
          ? `❌ خطأ تشغيل: ${domMetrics.error}. قد يكون صيغة الفيديو أو ترميزه (Codec) غير معتمد في هذا المتصفح.`
          : `❌ Media Error: ${domMetrics.error}. The browser might not support this specific codec/format. Standardize to H.264 MP4.`
      );
    }

    if (adviceList.length === 0) {
      adviceList.push(
        isRtl
          ? '✅ جميع المؤشرات سليمة تماماً. الفيديو والصوت يعملان بتوافق مثالي مع المتصفح.'
          : '✅ Media engine parameters are healthy. Playback is fully authorized and synchronous.'
      );
    }

    return adviceList;
  };

  const advice = getDiagnosticAdvice();

  if (!isExpanded) {
    return (
      <div 
        id="mini-diagnostics-bar"
        className="absolute top-3 left-3 z-50 flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-zinc-950/90 backdrop-blur-md border border-emerald-500/30 text-[10px] font-mono text-emerald-400 shadow-lg cursor-pointer hover:border-emerald-500/60 transition-all select-none"
        onClick={() => setIsExpanded(true)}
      >
        <span className="relative flex h-1.5 w-1.5">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-[4px] opacity-75 ${isPlaying ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
          <span className={`relative inline-flex rounded-[4px] h-1.5 w-1.5 ${isPlaying ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
        </span>
        <span className="font-bold">MEDIA-HUD</span>
        <span className="text-zinc-500">|</span>
        <span>{isPlaying ? '▶ PLAY' : '⏸ PAUSE'}</span>
        <span>{isMuted ? '🔇 MUTED' : `🔊 VOL ${Math.round(volume * 100)}%`}</span>
        {isBuffering && <span className="animate-pulse text-cyan-400">⚡ BUFFER</span>}
        <Maximize2 size={10} className="text-zinc-400 ms-1" />
      </div>
    );
  }

  return (
    <div 
      id="expanded-diagnostics-panel"
      className="absolute top-3 left-3 z-50 w-[290px] max-w-[calc(100%-24px)] max-h-[90%] overflow-y-auto rounded-xl bg-zinc-950/95 backdrop-blur-md border border-emerald-500/40 p-3 text-[11px] font-mono text-zinc-300 shadow-2xl flex flex-col gap-2.5 text-left"
      style={{ direction: 'ltr' }} // Force LTR for clean terminal coding output
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-1.5 border-b border-zinc-800">
        <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-[4px] bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-[4px] h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>PERPLEXTA MEDIA HUD v1.2</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button 
            onClick={() => setIsExpanded(false)}
            className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
            title="Minimize"
          >
            <Minimize2 size={11} />
          </button>
          {onClose && (
            <button 
              onClick={onClose}
              className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
              title="Close"
            >
              <X size={11} />
            </button>
          )}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-1.5 text-[10px]">
        {/* Playback Status */}
        <div className="p-1.5 rounded bg-zinc-900/50 border border-zinc-800">
          <span className="text-zinc-500 block">PLAYBACK STATE</span>
          <span className={`font-bold ${isPlaying ? 'text-emerald-400' : 'text-amber-400'}`}>
            {isPlaying ? '▶ PLAYING' : '⏸ PAUSED'}
          </span>
        </div>

        {/* DOM Status */}
        <div className="p-1.5 rounded bg-zinc-900/50 border border-zinc-800">
          <span className="text-zinc-500 block">DOM VIDEO STATE</span>
          <span className={`font-bold ${domMetrics.paused ? 'text-amber-400' : 'text-emerald-400'}`}>
            {domMetrics.paused ? '⏸ PAUSED' : '▶ RUNNING'}
          </span>
        </div>

        {/* Volume */}
        <div className="p-1.5 rounded bg-zinc-900/50 border border-zinc-800">
          <span className="text-zinc-500 block">AUDIO & VOLUME</span>
          <span className="font-bold flex items-center gap-1">
            {isMuted ? (
              <span className="text-red-400 flex items-center gap-0.5"><VolumeX size={10} /> MUTED</span>
            ) : (
              <span className="text-emerald-400 flex items-center gap-0.5"><Volume2 size={10} /> VOL {Math.round(volume * 100)}%</span>
            )}
          </span>
        </div>

        {/* Buffering */}
        <div className="p-1.5 rounded bg-zinc-900/50 border border-zinc-800">
          <span className="text-zinc-500 block">BUFFER / LOADING</span>
          <span className={`font-bold ${isBuffering || domMetrics.readyState < 2 ? 'text-cyan-400 animate-pulse' : 'text-zinc-400'}`}>
            {isBuffering ? '⚡ BUFFERING' : `✅ READY (${domMetrics.readyState})`}
          </span>
        </div>
      </div>

      {/* Real-Time Audio Canvas Level Analyzer */}
      <VolumeVisualizer
        videoElement={videoElement}
        isMuted={isMuted}
        volume={volume}
        isPlaying={isPlaying}
      />

      {/* Technical Parameters */}
      <div className="flex flex-col gap-1 text-[10px] bg-zinc-900/30 p-2 rounded border border-zinc-800/80">
        <div className="flex justify-between"><span className="text-zinc-500">Player ID:</span> <span className="text-zinc-300 font-semibold truncate max-w-[170px]" title={playerId}>{playerId}</span></div>
        <div className="flex justify-between"><span className="text-zinc-500">Resolution:</span> <span className="text-zinc-300 font-semibold">{videoResolution ? `${videoResolution.width}x${videoResolution.height} (${videoResolution.qualityLabel})` : 'Calculating...'}</span></div>
        <div className="flex justify-between"><span className="text-zinc-500">Position:</span> <span className="text-zinc-300 font-semibold">{currentTime.toFixed(2)}s / {duration.toFixed(2)}s</span></div>
        <div className="flex justify-between">
          <span className="text-zinc-500">Buffer Ahead:</span> 
          <span className="text-cyan-400 font-semibold">{domMetrics.bufferedAhead.toFixed(2)}s ({domMetrics.bufferedPercent.toFixed(1)}%)</span>
        </div>
        <div className="h-px bg-zinc-800/60 my-1" />
        <div className="flex flex-col gap-0.5">
          <span className="text-zinc-500">HTML5 readyState:</span>
          <span className="text-zinc-300 text-[9px]">{getReadyStateLabel(domMetrics.readyState)}</span>
        </div>
        <div className="flex flex-col gap-0.5 mt-1">
          <span className="text-zinc-500">HTML5 networkState:</span>
          <span className="text-zinc-300 text-[9px]">{getNetworkStateLabel(domMetrics.networkState)}</span>
        </div>
        <div className="flex justify-between mt-1"><span className="text-zinc-500">PlaysInline:</span> <span className={domMetrics.playsInline ? 'text-emerald-400' : 'text-red-400'}>{domMetrics.playsInline ? 'YES' : 'NO'}</span></div>
        <div className="flex justify-between"><span className="text-zinc-500">Autoplay Attr:</span> <span className={domMetrics.autoplay ? 'text-emerald-400' : 'text-zinc-400'}>{domMetrics.autoplay ? 'YES' : 'NO'}</span></div>
      </div>

      {/* Environment */}
      <div className="text-[10px] flex flex-col gap-1 p-1.5 rounded bg-zinc-900/40 border border-zinc-800">
        <div className="flex justify-between"><span className="text-zinc-500">Sandbox (Iframe):</span> <span className={isIframe ? 'text-amber-400' : 'text-emerald-400 font-bold'}>{isIframe ? 'YES (Strict)' : 'NO (Direct)'}</span></div>
        <div className="flex justify-between"><span className="text-zinc-500">Device Platform:</span> <span className="text-zinc-300">{isMobile ? 'Mobile' : 'Desktop'}</span></div>
        <div className="flex justify-between"><span className="text-zinc-500">In-App Webview:</span> <span className={isSocialMediaBrowser ? 'text-amber-400 font-bold' : 'text-zinc-400'}>{isSocialMediaBrowser ? 'YES (Strict WebView)' : 'NO'}</span></div>
      </div>

      {/* Actionable Advice / Troubleshooter */}
      <div className="flex flex-col gap-1 border border-amber-500/30 bg-amber-950/20 rounded-lg p-2 text-[10px]">
        <div className="flex items-center gap-1.5 text-amber-400 font-bold mb-1">
          <AlertTriangle size={12} />
          <span>TROUBLESHOOTER GUIDANCE</span>
        </div>
        <div className="flex flex-col gap-1.5 text-zinc-300 max-h-[100px] overflow-y-auto pr-1">
          {advice.map((item, idx) => (
            <div key={idx} className="leading-relaxed border-b border-zinc-800/40 pb-1.5 last:border-0 last:pb-0">
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

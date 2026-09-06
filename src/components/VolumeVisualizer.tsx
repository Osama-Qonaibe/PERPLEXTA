import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, AlertTriangle, Activity } from 'lucide-react';

interface VolumeVisualizerProps {
  videoElement: HTMLVideoElement | null;
  isMuted: boolean;
  volume: number;
  isPlaying: boolean;
}

// Global WeakMap to cache AudioContext components per video element to prevent the
// "HTMLMediaElement already connected to a different MediaElementSourceNode" browser crash.
const audioGraphCache = new WeakMap<
  HTMLVideoElement,
  {
    audioContext: AudioContext;
    sourceNode: MediaElementAudioSourceNode;
    analyserNode: AnalyserNode;
    isCorsBlocked: boolean;
  }
>();

export const VolumeVisualizer: React.FC<VolumeVisualizerProps> = ({
  videoElement,
  isMuted,
  volume,
  isPlaying,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hasAudioGraph, setHasAudioGraph] = useState(false);
  const [corsWarning, setCorsWarning] = useState(false);
  const [audioState, setAudioState] = useState<string>('idle');
  const animationFrameIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!videoElement || !canvasRef.current) return;

    let audioContext: AudioContext | null = null;
    let analyserNode: AnalyserNode | null = null;
    let isCorsBlocked = false;

    // Initialize or retrieve cached Web Audio nodes for this video element
    try {
      if (audioGraphCache.has(videoElement)) {
        const cached = audioGraphCache.get(videoElement)!;
        audioContext = cached.audioContext;
        analyserNode = cached.analyserNode;
        isCorsBlocked = cached.isCorsBlocked;
        setCorsWarning(isCorsBlocked);
        setHasAudioGraph(true);
        setAudioState(audioContext.state);
      } else {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          audioContext = new AudioContextClass();
          analyserNode = audioContext.createAnalyser();
          analyserNode.fftSize = 64; // Small fft for lightweight visualization

          // Attempt to connect the audio source
          // NOTE: Some cross-origin URLs without CORS headers will produce silence in AnalyserNode.
          const sourceNode = audioContext.createMediaElementSource(videoElement);
          
          // Connect to analyzer and then back to hardware destination so audio is still heard
          sourceNode.connect(analyserNode);
          analyserNode.connect(audioContext.destination);

          audioGraphCache.set(videoElement, {
            audioContext,
            sourceNode,
            analyserNode,
            isCorsBlocked: false,
          });

          setHasAudioGraph(true);
          setAudioState(audioContext.state);
        }
      }
    } catch (err: any) {
      console.warn('⚠️ Web Audio connection rejected (typical browser security/CORS limit):', err.message || err);
      // If we failed to hook the source (likely because it's cross-origin or already hooked elsewhere),
      // we mark it as CORS-restricted/Simulated mode.
      isCorsBlocked = true;
      setCorsWarning(true);
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyserNode ? analyserNode.frequencyBinCount : 32;
    const dataArray = new Uint8Array(bufferLength);

    // Audio level monitoring variables
    let simulatedPhase = 0;

    const renderFrame = () => {
      const width = canvas.width;
      const height = canvas.height;

      // Clear with dark transparent overlay matching the HUD theme
      ctx.fillStyle = 'rgba(9, 9, 11, 0.95)';
      ctx.fillRect(0, 0, width, height);

      // Determine state indicators
      const isMutedOrSilent = isMuted || volume === 0 || !isPlaying;

      if (isMutedOrSilent) {
        // Draw flatline (Muted / Silent state)
        ctx.beginPath();
        ctx.strokeStyle = '#ef4444'; // Red flatline
        ctx.lineWidth = 2;
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();

        // Draw flatline indicator text
        ctx.fillStyle = 'rgba(239, 68, 68, 0.8)';
        ctx.font = '8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('SIGNAL FLATLINE: MUTED OR PAUSED', width / 2, height / 2 - 6);
      } else if (analyserNode && audioContext && !corsWarning) {
        // Try to resume context inside the animation frame loop if suspended
        if (audioContext.state === 'suspended') {
          setAudioState('suspended');
          // Draw suspension warning wave
          ctx.beginPath();
          ctx.strokeStyle = '#f59e0b'; // Amber warning wave
          ctx.lineWidth = 1.5;
          for (let i = 0; i < width; i++) {
            const y = height / 2 + Math.sin(i * 0.15 + simulatedPhase) * 4;
            if (i === 0) ctx.moveTo(i, y);
            else ctx.lineTo(i, y);
          }
          ctx.stroke();
          simulatedPhase += 0.05;

          ctx.fillStyle = 'rgba(245, 158, 11, 0.9)';
          ctx.font = '7px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('AUDIO CONTEXT LOCKED: TAP SCREEN', width / 2, height / 2 - 8);
          
          // Let's try to auto-resume on the first interaction
          const resumeCtx = () => {
            if (audioContext && audioContext.state === 'suspended') {
              audioContext.resume().then(() => {
                setAudioState(audioContext!.state);
              });
            }
          };
          window.addEventListener('click', resumeCtx, { once: true });
          window.addEventListener('touchstart', resumeCtx, { once: true });
        } else {
          // Active hardware feed visualization
          setAudioState('active');
          analyserNode.getByteFrequencyData(dataArray);

          // Check if the signal is zero despite playing (implies CORS block or silent track)
          let totalValue = 0;
          for (let i = 0; i < bufferLength; i++) {
            totalValue += dataArray[i];
          }

          if (totalValue === 0 && isPlaying) {
            // Signal flatlined under CORS constraints
            setCorsWarning(true);
            if (videoElement) {
              const cached = audioGraphCache.get(videoElement);
              if (cached) cached.isCorsBlocked = true;
            }
          }

          // Draw spectrum bars
          const barWidth = (width / bufferLength) * 1.5;
          let barHeight;
          let x = 0;

          for (let i = 0; i < bufferLength; i++) {
            barHeight = (dataArray[i] / 255) * height * 0.85;

            // Gradient bar styling matching emerald theme
            const grad = ctx.createLinearGradient(0, height, 0, height - barHeight);
            grad.addColorStop(0, 'rgba(16, 185, 129, 0.3)');
            grad.addColorStop(0.5, 'rgba(16, 185, 129, 0.8)');
            grad.addColorStop(1, 'rgba(52, 211, 153, 1)');

            ctx.fillStyle = grad;
            ctx.fillRect(x, height - barHeight, barWidth - 1, barHeight);

            x += barWidth;
          }

          // Peak decibel-style indicator line
          const maxVal = Math.max(...Array.from(dataArray));
          const peakY = height - (maxVal / 255) * height * 0.85;
          ctx.beginPath();
          ctx.strokeStyle = 'rgba(52, 211, 153, 0.4)';
          ctx.lineWidth = 1;
          ctx.moveTo(0, peakY);
          ctx.lineTo(width, peakY);
          ctx.stroke();

          ctx.fillStyle = '#10b981';
          ctx.font = '7px monospace';
          ctx.textAlign = 'right';
          ctx.fillText(`LIVE CAPTURE: ${Math.round((maxVal / 255) * 100)}%`, width - 4, 10);
        }
      } else {
        // Fallback simulated wave (if AudioContext/CORS is blocked but we know sound is playing)
        // This simulates frequency pulses based on video playback dynamics and volume!
        const amplitude = 6 * volume * (isMutedOrSilent ? 0 : 1);
        ctx.beginPath();
        ctx.strokeStyle = '#10b981'; // Green active wave
        ctx.lineWidth = 2;

        for (let i = 0; i < width; i++) {
          const wave1 = Math.sin(i * 0.08 + simulatedPhase) * amplitude;
          const wave2 = Math.cos(i * 0.18 - simulatedPhase * 1.5) * (amplitude * 0.5);
          const y = height / 2 + wave1 + wave2;

          if (i === 0) ctx.moveTo(i, y);
          else ctx.lineTo(i, y);
        }
        ctx.stroke();

        // Increment phase to animate
        simulatedPhase += 0.08 + (volume * 0.05);

        ctx.fillStyle = 'rgba(16, 185, 129, 0.9)';
        ctx.font = '7px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`SPECTRAL: ${Math.round(volume * 100)}%`, width - 4, 10);
      }

      // Border and grid visualizers
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.1)';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(0, 0, width, height);

      // Animation frame request loop
      animationFrameIdRef.current = requestAnimationFrame(renderFrame);
    };

    renderFrame();

    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [videoElement, isMuted, volume, isPlaying, corsWarning]);

  return (
    <div id="volume-visualizer-container" className="flex flex-col gap-1.5 border border-zinc-800 bg-zinc-900/60 rounded-lg p-2 font-mono">
      <div className="flex items-center justify-between text-[9px] text-zinc-400">
        <span className="flex items-center gap-1">
          <Activity size={10} className="text-emerald-400 animate-pulse" />
          <span>REAL-TIME DECI-LEVEL GRAPH</span>
        </span>
        <span className="flex items-center gap-1">
          {isMuted ? (
            <span className="text-red-400 flex items-center gap-0.5"><VolumeX size={8} /> MUTED</span>
          ) : (
            <span className="text-emerald-400 flex items-center gap-0.5">
              <Volume2 size={8} /> ACTIVE {Math.round(volume * 100)}%
            </span>
          )}
        </span>
      </div>

      <canvas
        ref={canvasRef}
        width={250}
        height={32}
        className="w-full rounded bg-zinc-950 border border-zinc-900 shadow-inner"
      />

      {corsWarning && !isMuted && isPlaying && (
        <div className="flex items-start gap-1 text-[8px] leading-relaxed text-amber-400 border border-amber-500/20 bg-amber-950/20 rounded p-1.5">
          <AlertTriangle size={10} className="mt-0.5 shrink-0" />
          <span>
            <strong>CORS PROTECTION ACTIVE:</strong> Browser blocked hardware audio analysis for this cross-origin video. Safe fallback mode activated to estimate spectral levels.
          </span>
        </div>
      )}

      {audioState === 'suspended' && !isMuted && isPlaying && (
        <div className="flex items-start gap-1 text-[8px] leading-relaxed text-amber-300 border border-amber-400/20 bg-amber-950/30 rounded p-1.5">
          <AlertTriangle size={10} className="mt-0.5 shrink-0" />
          <span>
            <strong>BROWSER LOCK:</strong> Click anywhere on the webpage to resume the AudioContext and unlock the real-time audio visualizer output.
          </span>
        </div>
      )}
    </div>
  );
};

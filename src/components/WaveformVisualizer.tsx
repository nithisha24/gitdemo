import React from 'react';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { WaveformPlaybackStatus } from '../services/voiceAudioBridge';

export interface WaveformVisualizerProps {
  status: WaveformPlaybackStatus;
  level?: number;
  barCount?: number;
  size?: 'sm' | 'md' | 'lg';
  showStatusBadge?: boolean;
  className?: string;
  ariaLabel?: string;
}

const BRAND_BAR_COLORS = [
  '#1769F8', // Royal Blue
  '#00D4E8', // Cyan
  '#6D28D9', // Electric Violet
  '#1769F8', // Royal Blue
  '#00D4E8', // Cyan
  '#6D28D9', // Electric Violet
];

const IDLE_HEIGHT_RATIOS = [0.34, 0.52, 0.78, 0.56, 0.4, 0.3, 0.62, 0.84, 0.48, 0.36, 0.68, 0.44];
const PAUSED_HEIGHT_RATIOS = [0.42, 0.48, 0.55, 0.46, 0.42, 0.38, 0.5, 0.54, 0.45, 0.4, 0.5, 0.42];

export const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({
  status,
  level = 0,
  barCount = 6,
  size = 'sm',
  showStatusBadge = false,
  className = '',
  ariaLabel = 'Audio waveform visualizer',
}) => {
  const containerHeight =
    size === 'lg' ? 'h-12' : size === 'md' ? 'h-8' : 'h-6';
  const barWidth =
    size === 'lg' ? 'w-1.5' : size === 'md' ? 'w-1.5' : 'w-1';

  const bars = Array.from({ length: barCount }, (_, i) => {
    const color = BRAND_BAR_COLORS[i % BRAND_BAR_COLORS.length];
    const idleRatio = IDLE_HEIGHT_RATIOS[i % IDLE_HEIGHT_RATIOS.length];
    const pausedRatio = PAUSED_HEIGHT_RATIOS[i % PAUSED_HEIGHT_RATIOS.length];
    // Organic staggered delay per bar
    const delaySec = ((i * 0.13) % 0.65).toFixed(2);
    const durationSec = (0.85 + ((i * 0.17) % 0.55)).toFixed(2);

    // Dynamic height calculation based on explicit state
    let heightPercent = Math.round(idleRatio * 100);
    if (status === 'playing') {
      const waveOffset = Math.sin(i * 1.15) * 0.2 + 0.8;
      const activeRatio = Math.min(
        1,
        Math.max(0.28, idleRatio * 0.45 + Math.max(0.35, level) * 0.72 * waveOffset)
      );
      heightPercent = Math.round(activeRatio * 100);
    } else if (status === 'processing') {
      heightPercent = 45 + ((i * 12) % 35);
    } else if (status === 'paused') {
      heightPercent = Math.round(pausedRatio * 100);
    } else if (status === 'error') {
      heightPercent = 24;
    } else if (status === 'completed') {
      heightPercent = Math.round(idleRatio * 90);
    }

    return {
      index: i,
      color: status === 'error' ? '#F43F5E' : color,
      delaySec,
      durationSec,
      heightPercent,
    };
  });

  return (
    <div
      role="status"
      aria-label={`${ariaLabel}: ${status}`}
      data-waveform-status={status}
      className={`inline-flex items-center gap-2 rounded-lg px-2.5 py-1 transition-all duration-200 ${
        status === 'playing'
          ? 'bg-emiqen-soft-bg/95 border border-emiqen-cyan/40 shadow-[0_0_16px_-4px_rgba(0,212,232,0.35)]'
          : status === 'processing'
          ? 'bg-blue-50/80 border border-emiqen-blue/30'
          : status === 'paused'
          ? 'bg-slate-100/90 border border-slate-300/80'
          : status === 'error'
          ? 'bg-rose-50 border border-rose-200'
          : 'bg-slate-50/90 border border-slate-200/70'
      } ${className}`}
    >
      {status === 'processing' && (
        <Loader2
          className="w-3.5 h-3.5 text-emiqen-blue animate-spin shrink-0"
          aria-hidden="true"
        />
      )}
      {status === 'error' && (
        <AlertCircle
          className="w-3.5 h-3.5 text-rose-500 shrink-0"
          aria-hidden="true"
        />
      )}
      {status === 'completed' && showStatusBadge && (
        <CheckCircle2
          className="w-3.5 h-3.5 text-emerald-600 shrink-0"
          aria-hidden="true"
        />
      )}

      <div
        className={`flex items-center gap-1 ${containerHeight}`}
        aria-hidden="true"
      >
        {bars.map((bar) => {
          const animClass =
            status === 'playing'
              ? 'emiqen-wave-bar-playing'
              : status === 'processing'
              ? 'emiqen-wave-bar-processing'
              : status === 'idle'
              ? 'emiqen-wave-bar-idle'
              : '';

          return (
            <span
              key={bar.index}
              className={`block ${barWidth} rounded-full transition-all duration-200 ${animClass}`}
              style={{
                height: `${bar.heightPercent}%`,
                backgroundColor: bar.color,
                animationDelay: `${bar.delaySec}s`,
                animationDuration: `${bar.durationSec}s`,
                opacity:
                  status === 'playing'
                    ? 0.95
                    : status === 'paused'
                    ? 0.55
                    : status === 'error'
                    ? 0.45
                    : 0.8,
                boxShadow:
                  status === 'playing'
                    ? `0 0 8px ${bar.color}66`
                    : 'none',
              }}
            />
          );
        })}
      </div>

      {showStatusBadge && (
        <span
          className={`text-[10px] font-semibold uppercase tracking-wider select-none ${
            status === 'playing'
              ? 'text-emiqen-blue'
              : status === 'processing'
              ? 'text-emiqen-blue'
              : status === 'paused'
              ? 'text-slate-500'
              : status === 'error'
              ? 'text-rose-600'
              : status === 'completed'
              ? 'text-emerald-700'
              : 'text-slate-400'
          }`}
        >
          {status === 'playing'
            ? 'Live'
            : status === 'processing'
            ? 'Preparing…'
            : status === 'paused'
            ? 'Paused'
            : status === 'completed'
            ? 'Done'
            : status === 'error'
            ? 'Error'
            : 'Idle'}
        </span>
      )}
    </div>
  );
};


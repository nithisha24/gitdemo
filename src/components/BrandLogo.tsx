import React from 'react';

interface BrandLogoProps {
  variant?: 'full' | 'icon' | 'stacked';
  theme?: 'light' | 'dark';
  showDomain?: boolean;
  className?: string;
  iconSize?: number;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = 'full',
  theme = 'light',
  showDomain = false,
  className = '',
  iconSize = 36,
}) => {
  const isDark = theme === 'dark';
  const uniqueId = React.useId().replace(/:/g, '');

  const iconElement = (
    <svg
      width={iconSize}
      height={iconSize}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 transition-transform duration-300 group-hover:scale-105"
      aria-label="EMIQEN Logo Mark"
    >
      <defs>
        {/* Top Arc Gradient: Royal Blue to Cyan */}
        <linearGradient
          id={`top-arc-${uniqueId}`}
          x1="10"
          y1="50"
          x2="85"
          y2="20"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#1769F8" />
          <stop offset="65%" stopColor="#00D4E8" />
          <stop offset="100%" stopColor="#38E1FF" />
        </linearGradient>

        {/* Bottom Arc Gradient: Deep Navy to Electric Violet */}
        <linearGradient
          id={`bot-arc-${uniqueId}`}
          x1="10"
          y1="50"
          x2="85"
          y2="80"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#071B3A" />
          <stop offset="50%" stopColor="#1769F8" />
          <stop offset="100%" stopColor="#6D28D9" />
        </linearGradient>

        {/* Center Bar Gradient */}
        <linearGradient
          id={`center-bar-${uniqueId}`}
          x1="24"
          y1="50"
          x2="52"
          y2="50"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#1769F8" />
          <stop offset="100%" stopColor="#00D4E8" />
        </linearGradient>

        {/* Sound Wave Gradient */}
        <linearGradient
          id={`wave-grad-${uniqueId}`}
          x1="55"
          y1="50"
          x2="90"
          y2="50"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#00D4E8" />
          <stop offset="50%" stopColor="#1769F8" />
          <stop offset="100%" stopColor="#6D28D9" />
        </linearGradient>
      </defs>

      {/* Hexagonal Outer Frame - Upper Branch (Top & Upper Left) */}
      <path
        d="M 50 10 L 82 28.5 L 69 36 L 47 23.5 L 25 36 L 25 50 L 11 50 L 11 28 Z"
        fill={`url(#top-arc-${uniqueId})`}
      />

      {/* Hexagonal Outer Frame - Lower Branch (Bottom & Lower Left) */}
      <path
        d="M 11 50 L 25 50 L 25 64 L 47 76.5 L 69 64 L 82 71.5 L 50 90 L 11 68 Z"
        fill={`url(#bot-arc-${uniqueId})`}
      />

      {/* Stylized 'E' Center Crossbar (Angled Rounded Bar) */}
      <polygon
        points="27,47 51,47 47,53 23,53"
        fill={`url(#center-bar-${uniqueId})`}
      />

      {/* 5-Bar Audio Waveform Motif */}
      {/* Bar 1: Intro pulse */}
      <rect x="56" y="44" width="4.2" height="12" rx="2.1" fill="#00D4E8" />
      {/* Bar 2: Ascending */}
      <rect x="63" y="37" width="4.2" height="26" rx="2.1" fill="#1769F8" />
      {/* Bar 3: Peak amplitude */}
      <rect x="70" y="30" width="4.2" height="40" rx="2.1" fill="#4338CA" />
      {/* Bar 4: Descending */}
      <rect x="77" y="37" width="4.2" height="26" rx="2.1" fill="#6D28D9" />
      {/* Bar 5: Outro pulse */}
      <rect x="84" y="44" width="4.2" height="12" rx="2.1" fill="#8B5CF6" />
    </svg>
  );

  if (variant === 'icon') {
    return (
      <div className={`inline-flex items-center justify-center ${className}`}>
        {iconElement}
      </div>
    );
  }

  const textColorClass = isDark ? 'text-white' : 'text-emiqen-navy';
  const domainColorClass = isDark ? 'text-emiqen-cyan' : 'text-emiqen-blue';

  return (
    <div
      className={`group inline-flex items-center gap-3 select-none ${
        variant === 'stacked' ? 'flex-col text-center' : ''
      } ${className}`}
    >
      {iconElement}
      <div className="flex flex-col text-left leading-none">
        <span
          className={`font-extrabold tracking-wider text-xl uppercase ${textColorClass} flex items-center`}
          style={{ letterSpacing: '0.08em' }}
        >
          <span>EMI</span>
          <span className="bg-gradient-to-r from-emiqen-blue via-emiqen-cyan to-emiqen-violet bg-clip-text text-transparent">
            QEN
          </span>
          {showDomain && (
            <span className={`text-sm lowercase font-semibold ml-0.5 ${domainColorClass}`}>
              .com
            </span>
          )}
        </span>
        <span
          className={`text-[9px] font-medium tracking-widest uppercase mt-0.5 ${
            isDark ? 'text-slate-400' : 'text-slate-500'
          }`}
        >
          Enterprise AI
        </span>
      </div>
    </div>
  );
};


import React from 'react';

const LoginHexWall = () => {
  return (
    <div className="login-hex-wall-container">
      <svg className="login-hex-wall-svg" viewBox="0 0 380 900" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="hexShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="12" stdDeviation="14" floodColor="#000000" floodOpacity="0.22" />
          </filter>
          <filter id="hexGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="4" stdDeviation="16" floodColor="#f59e0b" floodOpacity="0.28" />
          </filter>
          <linearGradient id="hexGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--hex-grad-1-start, rgba(245, 158, 11, 0.35))" />
            <stop offset="100%" stopColor="var(--hex-grad-1-end, rgba(217, 119, 6, 0.15))" />
          </linearGradient>
          <linearGradient id="hexGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--hex-grad-2-start, rgba(56, 189, 248, 0.35))" />
            <stop offset="100%" stopColor="var(--hex-grad-2-end, rgba(14, 165, 233, 0.12))" />
          </linearGradient>
          <linearGradient id="hexGlass" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--hex-glass-start, rgba(255, 255, 255, 0.65))" />
            <stop offset="100%" stopColor="var(--hex-glass-end, rgba(255, 255, 255, 0.25))" />
          </linearGradient>
        </defs>

        {/* ── Background Layer (Large Faded Tiles) ── */}
        <g filter="url(#hexShadow)" opacity="0.6">
          {/* Top Right Large Hex */}
          <path d="M260 40 L340 85 L340 175 L260 220 L180 175 L180 85 Z" fill="url(#hexGlass)" stroke="var(--hex-stroke, rgba(255, 255, 255, 0.4))" strokeWidth="1.5" />
          {/* Mid Right Large Hex */}
          <path d="M280 340 L360 385 L360 475 L280 520 L200 475 L200 385 Z" fill="url(#hexGrad1)" stroke="var(--hex-stroke-gold, #f59e0b)" strokeWidth="1.5" />
          {/* Bottom Large Hex */}
          <path d="M220 640 L300 685 L300 775 L220 820 L140 775 L140 685 Z" fill="url(#hexGlass)" stroke="var(--hex-stroke, rgba(255, 255, 255, 0.4))" strokeWidth="1.5" />
        </g>

        {/* ── Mid Depth Layer (Medium Floating Glass & Amber Tiles) ── */}
        <g filter="url(#hexShadow)">
          {/* Top Left Medium Tile */}
          <path d="M120 100 L180 135 L180 205 L120 240 L60 205 L60 135 Z" fill="url(#hexGrad2)" stroke="var(--hex-stroke-cyan, #38bdf8)" strokeWidth="1.5" />
          {/* Center Mid Medium Tile */}
          <path d="M140 280 L200 315 L200 385 L140 420 L80 385 L80 315 Z" fill="url(#hexGlass)" stroke="var(--hex-stroke, rgba(255, 255, 255, 0.5))" strokeWidth="1.8" />
          {/* Mid Lower Medium Tile */}
          <path d="M110 500 L170 535 L170 605 L110 640 L50 605 L50 535 Z" fill="url(#hexGrad1)" stroke="var(--hex-stroke-gold, #f59e0b)" strokeWidth="1.8" />
          {/* Bottom Right Medium Tile */}
          <path d="M290 560 L340 590 L340 650 L290 680 L240 650 L240 590 Z" fill="url(#hexGrad2)" stroke="var(--hex-stroke-cyan, #38bdf8)" strokeWidth="1.5" />
        </g>

        {/* ── Foreground Layer (Accent Small Glowing Tiles) ── */}
        <g filter="url(#hexGlow)">
          {/* Top Small Accent */}
          <path d="M290 20 L325 40 L325 80 L290 100 L255 80 L255 40 Z" fill="url(#hexGrad1)" stroke="#f59e0b" strokeWidth="2" />
          {/* Mid Small Floating Accent */}
          <path d="M220 230 L255 250 L255 290 L220 310 L185 290 L185 250 Z" fill="url(#hexGlass)" stroke="var(--hex-stroke-gold, #fbbf24)" strokeWidth="2" />
          {/* Lower Center Small Accent */}
          <path d="M170 440 L200 458 L200 492 L170 510 L140 492 L140 458 Z" fill="url(#hexGrad1)" stroke="#f59e0b" strokeWidth="2" />
          {/* Bottom Small Accent */}
          <path d="M180 740 L215 760 L215 800 L180 820 L145 800 L145 760 Z" fill="url(#hexGrad2)" stroke="#38bdf8" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
};

export default LoginHexWall;

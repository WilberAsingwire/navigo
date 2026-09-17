import React from 'react';
import { useTheme } from '../context/ThemeContext';

interface LogoProps {
  variant?: 'full' | 'icon' | 'wordmark';
  size?: 'small' | 'medium' | 'large';
  onClick?: () => void;
  className?: string;
}

/**
 * Premium Navigo Logo
 * Icon: Navigation rocket / arrow pointing NE, gradient orange, glow, white core
 * Wordmark: NAVI adaptive + GO orange, Sora 800
 */
const Logo: React.FC<LogoProps> = ({ variant = 'full', size = 'medium', onClick, className = '' }) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const sizeMap = {
    small: { icon: 28, text: 18, gap: 8, height: 28 },
    medium: { icon: 36, text: 22, gap: 10, height: 36 },
    large: { icon: 48, text: 30, gap: 12, height: 48 },
  };
  const s = sizeMap[size];
  const orange = '#FF6B35';
  const textColor = isLight ? '#0F172A' : '#FFFFFF';

  const iconId = `navigo-logo-${size}-${variant}`;

  const IconSVG = (
    <svg
      width={s.icon}
      height={s.icon}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', flexShrink: 0 }}
    >
      <defs>
        <linearGradient id={`${iconId}-grad`} x1="4" y1="28" x2="28" y2="4" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#E85E2E" />
          <stop offset="35%" stopColor="#FF6B35" />
          <stop offset="100%" stopColor="#FF8C42" />
        </linearGradient>
        <linearGradient id={`${iconId}-inner`} x1="16" y1="9" x2="16" y2="16" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
          <stop offset="100%" stopColor="#FFE9DE" stopOpacity="0.95" />
        </linearGradient>
        <filter id={`${iconId}-glow`} x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#FF6B35" floodOpacity={isLight ? "0.25" : "0.45"} />
        </filter>
        <filter id={`${iconId}-innerShadow`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#000" floodOpacity="0.15" />
        </filter>
      </defs>

      {/* Rocket / Navigation Arrow - premium geometric */}
      <g filter={`url(#${iconId}-glow)`}>
        {/* Main arrow body */}
        <path
          d="M16 2.8C16 2.8 17.8 4.6 20.2 7.2C22.6 9.8 26.2 13.2 27.5 15.1C27.5 15.1 24.2 16.2 21.5 17.1C21.5 17.1 23.2 20.8 24 25.5C24 25.5 20.5 23.8 16 21.8C11.5 23.8 8 25.5 8 25.5C8.8 20.8 10.5 17.1 10.5 17.1C7.8 16.2 4.5 15.1 4.5 15.1C5.8 13.2 9.4 9.8 11.8 7.2C14.2 4.6 16 2.8 16 2.8Z"
          fill={`url(#${iconId}-grad)`}
        />
        {/* Edge highlight */}
        <path
          d="M16 2.8C16 2.8 17.8 4.6 20.2 7.2C22.6 9.8 26.2 13.2 27.5 15.1C27.5 15.1 24.2 16.2 21.5 17.1"
          stroke="white"
          strokeWidth="0.7"
          strokeOpacity="0.25"
          strokeLinecap="round"
          fill="none"
        />
        {/* Core white dot - navigation point */}
        <g filter={`url(#${iconId}-innerShadow)`}>
          <circle cx="16" cy="12.2" r="3.6" fill={`url(#${iconId}-inner)`} />
          <circle cx="16" cy="12.2" r="1.5" fill={orange} />
          <circle cx="16" cy="12.2" r="1.5" fill="white" fillOpacity="0.3" />
        </g>
        {/* Speed trails - subtle */}
        <g opacity={isLight ? 0.5 : 0.7}>
          <path d="M11.5 21.5L9.2 26" stroke={orange} strokeWidth="1.6" strokeLinecap="round" />
          <path d="M16 22.8L16 28" stroke={orange} strokeWidth="1.6" strokeLinecap="round" />
          <path d="M20.5 21.5L22.8 26" stroke={orange} strokeWidth="1.6" strokeLinecap="round" />
        </g>
      </g>
    </svg>
  );

  if (variant === 'icon') {
    return (
      <div
        className={`navigo-logo-icon ${className}`}
        onClick={onClick}
        style={{
          width: s.icon,
          height: s.icon,
          cursor: onClick ? 'pointer' : 'default',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'transform 0.35s cubic-bezier(0.16,1,0.3,1), filter 0.3s',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.08) rotate(4deg)';
          (e.currentTarget as HTMLDivElement).style.filter = 'brightness(1.1)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.transform = 'scale(1) rotate(0deg)';
          (e.currentTarget as HTMLDivElement).style.filter = 'brightness(1)';
        }}
      >
        {IconSVG}
      </div>
    );
  }

  if (variant === 'wordmark') {
    return (
      <div
        className={`navigo-logo-wordmark ${className}`}
        onClick={onClick}
        style={{
          cursor: onClick ? 'pointer' : 'default',
          display: 'inline-flex',
          alignItems: 'center',
          fontFamily: 'Sora, sans-serif',
          fontWeight: 800,
          fontSize: s.text,
          letterSpacing: '-0.04em',
          lineHeight: 1,
        }}
      >
        <span style={{ color: textColor, transition: 'color 0.3s' }}>NAVI</span>
        <span style={{ color: orange }}>GO</span>
      </div>
    );
  }

  // Full
  return (
    <div
      className={`navigo-logo-full ${className}`}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: s.gap,
        cursor: onClick ? 'pointer' : 'default',
        height: s.height,
        userSelect: 'none',
        transition: 'transform 0.3s cubic-bezier(0.16,1,0.3,1), filter 0.3s',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.03)';
        (e.currentTarget as HTMLDivElement).style.filter = 'brightness(1.08)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)';
        (e.currentTarget as HTMLDivElement).style.filter = 'brightness(1)';
      }}
    >
      {IconSVG}
      <div
        style={{
          fontFamily: 'Sora, sans-serif',
          fontWeight: 800,
          fontSize: s.text,
          letterSpacing: '-0.05em',
          lineHeight: 1,
          display: 'flex',
          alignItems: 'baseline',
        }}
      >
        <span style={{ color: textColor, transition: 'color 0.3s ease' }}>NAVI</span>
        <span style={{ color: orange }}>GO</span>
      </div>
    </div>
  );
};

export default Logo;

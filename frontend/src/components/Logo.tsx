import React from 'react';
import { useTheme } from '../context/ThemeContext';

interface LogoProps {
  variant?: 'full' | 'icon' | 'wordmark';
  size?: 'small' | 'medium' | 'large';
  onClick?: () => void;
  className?: string;
}

/**
 * Logo — Real Navigo brand mark, perfect in both dark and light
 * Icon: stylized navigation rocket / compass arrow
 * Wordmark: NAVIGO in Sora bold
 */
const Logo: React.FC<LogoProps> = ({ variant = 'full', size = 'medium', onClick, className = '' }) => {
  const { theme } = useTheme();

  const sizeMap = {
    small: { icon: 24, text: 16, gap: 6, height: 24 },
    medium: { icon: 32, text: 20, gap: 8, height: 32 },
    large: { icon: 48, text: 28, gap: 10, height: 48 },
  };

  const s = sizeMap[size];
  const isLight = theme === 'light';

  // Colors that adapt
  const textColor = isLight ? '#0F172A' : '#FFFFFF';
  const orange = '#FF6B35';

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
          transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.08) rotate(3deg)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.transform = 'scale(1) rotate(0deg)';
        }}
      >
        <svg width={s.icon} height={s.icon} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id={`rocketGrad-${size}`} x1="6" y1="26" x2="26" y2="6" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#E85E2E"/>
              <stop offset="50%" stopColor="#FF6B35"/>
              <stop offset="100%" stopColor="#FF8C42"/>
            </linearGradient>
            <filter id={`glow-${size}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#FF6B35" floodOpacity="0.3"/>
            </filter>
          </defs>
          {/* Rocket / Navigation Arrow */}
          <g filter={`url(#glow-${size})`}>
            {/* Main body — arrow/rocket shape */}
            <path 
              d="M16 4L26 14L20 16L22 22L16 19L10 22L12 16L6 14L16 4Z" 
              fill={`url(#rocketGrad-${size})`}
              stroke={isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.12)'}
              strokeWidth="0.5"
            />
            {/* Inner highlight — navigation dot */}
            <circle cx="16" cy="13" r="3" fill="white" fillOpacity="0.95"/>
            <circle cx="16" cy="13" r="1.2" fill="#FF6B35"/>
            {/* Speed trail */}
            <path d="M12 20L10 24M16 21L16 26M20 20L22 24" stroke={orange} strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
          </g>
        </svg>
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
          letterSpacing: '-0.5px',
          lineHeight: 1,
          transition: 'all 0.25s ease',
        }}
      >
        <span style={{ color: textColor, transition: 'color 0.3s' }}>NAVI</span>
        <span style={{ color: orange }}>GO</span>
      </div>
    );
  }

  // Full — icon + wordmark
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
        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.02)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)';
      }}
    >
      <svg width={s.icon} height={s.icon} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id={`fullGrad-${size}`} x1="6" y1="26" x2="26" y2="6" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#E85E2E"/>
            <stop offset="50%" stopColor="#FF6B35"/>
            <stop offset="100%" stopColor="#FF8C42"/>
          </linearGradient>
          <filter id={`fullGlow-${size}`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#FF6B35" floodOpacity={isLight ? "0.2" : "0.35"}/>
          </filter>
        </defs>
        <g filter={`url(#fullGlow-${size})`}>
          <path d="M16 4L26 14L20 16L22 22L16 19L10 22L12 16L6 14L16 4Z" fill={`url(#fullGrad-${size})`}/>
          <circle cx="16" cy="13" r="3" fill="white" fillOpacity="0.95"/>
          <circle cx="16" cy="13" r="1.2" fill="#FF6B35"/>
          <path d="M12 20L10 24M16 21L16 26M20 20L22 24" stroke={orange} strokeWidth="1.5" strokeLinecap="round" opacity={isLight ? "0.4" : "0.6"}/>
        </g>
      </svg>
      <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: s.text, letterSpacing: '-0.8px', lineHeight: 1, display: 'flex' }}>
        <span style={{ color: textColor, transition: 'color 0.3s ease' }}>NAVI</span>
        <span style={{ color: orange }}>GO</span>
      </div>
    </div>
  );
};

export default Logo;

import React from 'react';
import { useTheme } from '../context/ThemeContext';
import logoImg from '../assets/logo.png';

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

  const IconImg = (
    <img
      src={logoImg}
      alt="Navigo Logo"
      style={{
        width: s.icon,
        height: s.icon,
        display: 'block',
        flexShrink: 0,
        objectFit: 'contain',
      }}
    />
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
        {IconImg}
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
      {IconImg}
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

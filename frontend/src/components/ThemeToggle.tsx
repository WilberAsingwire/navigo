import React from 'react';
import { IonIcon } from '@ionic/react';
import { moonOutline, sunnyOutline } from 'ionicons/icons';
import { useTheme } from '../context/ThemeContext';
import useHaptic from '../hooks/useHaptic';

interface ThemeToggleProps {
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
}

/**
 * ThemeToggle — Perfect in both dark and light, with delightful animation
 */
const ThemeToggle: React.FC<ThemeToggleProps> = ({ size = 'medium', showLabel = false }) => {
  const { theme, toggleTheme } = useTheme();
  const { light } = useHaptic();
  const [isAnimating, setIsAnimating] = React.useState(false);

  const handleToggle = () => {
    light();
    setIsAnimating(true);
    toggleTheme();
    setTimeout(() => setIsAnimating(false), 400);
  };

  const sizeMap = {
    small: { button: 36, icon: 16 },
    medium: { button: 44, icon: 20 },
    large: { button: 52, icon: 24 },
  };

  const dimensions = sizeMap[size];

  return (
    <button
      onClick={handleToggle}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      style={{
        width: dimensions.button,
        height: dimensions.button,
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--nav-border)',
        background: theme === 'light' ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)',
        color: theme === 'light' ? 'var(--nav-text)' : '#FFFFFF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: showLabel ? 8 : 0,
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        position: 'relative',
        overflow: 'hidden',
        WebkitTapHighlightColor: 'transparent',
        transform: isAnimating ? 'scale(0.9) rotate(15deg)' : 'scale(1) rotate(0deg)',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05) rotate(5deg)';
        (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--navigo-orange)';
        (e.currentTarget as HTMLButtonElement).style.color = 'var(--navigo-orange)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = isAnimating ? 'scale(0.9) rotate(15deg)' : 'scale(1) rotate(0deg)';
        (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--nav-border)';
        (e.currentTarget as HTMLButtonElement).style.color = theme === 'light' ? 'var(--nav-text)' : '#FFFFFF';
      }}
    >
      <IonIcon
        icon={theme === 'light' ? moonOutline : sunnyOutline}
        style={{
          fontSize: dimensions.icon,
          transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          transform: isAnimating ? 'scale(0) rotate(180deg)' : 'scale(1) rotate(0deg)',
        }}
      />
      {showLabel && (
        <span style={{ fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-body)' }}>
          {theme === 'light' ? 'Dark' : 'Light'}
        </span>
      )}
      <style>{`
        @keyframes themeSpin {
          0% { transform: rotate(0deg) scale(1); }
          50% { transform: rotate(180deg) scale(0.8); }
          100% { transform: rotate(360deg) scale(1); }
        }
      `}</style>
    </button>
  );
};

export default ThemeToggle;

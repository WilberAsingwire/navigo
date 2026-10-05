import React from 'react';

interface InitialsAvatarProps {
  name: string;
  size?: number;
  color?: string;
}

/**
 * Local initials avatar — no third-party avatar service.
 * (Sends no PII anywhere; works offline.)
 */
const InitialsAvatar: React.FC<InitialsAvatarProps> = ({ name, size = 40, color = '#FF6B35' }) => {
  const initials = (name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('');

  return (
    <div
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: color,
        color: 'var(--nav-text)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.38,
        fontWeight: 700,
        fontFamily: 'var(--font-display, Sora, sans-serif)',
        flexShrink: 0,
        userSelect: 'none',
      }}
    >
      {initials || '?'}
    </div>
  );
};

export default InitialsAvatar;

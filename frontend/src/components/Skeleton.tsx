import React from 'react';

interface SkeletonProps {
  rows?: number;
  trailingWidth?: string;
  variant?: 'list' | 'card' | 'stat';
}

/** Enhanced Skeleton — interactive shimmer with variants */
const Skeleton: React.FC<SkeletonProps> = ({ rows = 3, trailingWidth = '56px', variant = 'list' }) => {
  const shimmer = {
    background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.10) 50%, rgba(255,255,255,0.04) 75%)',
    backgroundSize: '200% 100%',
    animation: 'navigo-shimmer 1.4s infinite',
  };

  if (variant === 'card') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <style>{'@keyframes navigo-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } } @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }'}</style>
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            style={{
              background: 'var(--nav-card-glass)',
              border: '1px solid var(--nav-border)',
              borderRadius: 'var(--radius-2xl)',
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              animation: `fadeIn 0.4s ease ${i * 0.1}s both`,
            }}
          >
            <div style={{ height: 16, width: '40%', borderRadius: 8, ...shimmer }} />
            <div style={{ height: 12, width: '80%', borderRadius: 6, ...shimmer }} />
            <div style={{ height: 12, width: '60%', borderRadius: 6, ...shimmer }} />
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <div style={{ height: 32, width: 80, borderRadius: 12, ...shimmer }} />
              <div style={{ height: 32, width: 80, borderRadius: 12, ...shimmer }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'stat') {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <style>{'@keyframes navigo-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }'}</style>
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            style={{
              background: 'var(--nav-card-glass)',
              border: '1px solid var(--nav-border)',
              borderRadius: 'var(--radius-xl)',
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <div style={{ width: 28, height: 28, borderRadius: '50%', ...shimmer }} />
            <div style={{ height: 20, width: '50%', borderRadius: 6, ...shimmer }} />
            <div style={{ height: 10, width: '70%', borderRadius: 6, ...shimmer }} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '4px 0' }}>
      <style>{'@keyframes navigo-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } } @keyframes fadeIn { from { opacity:0; transform: translateY(8px); } to { opacity:1; transform: translateY(0); } }'}</style>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: 'var(--nav-card-glass)',
            border: '1px solid var(--nav-border)',
            borderRadius: 'var(--radius-xl)',
            padding: 14,
            animation: `fadeIn 0.4s ease ${i * 0.08}s both`,
          }}
        >
          <div style={{ width: 40, height: 40, borderRadius: 12, flex: '0 0 40px', ...shimmer }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ height: 12, width: '65%', borderRadius: 6, ...shimmer }} />
            <div style={{ height: 10, width: '40%', borderRadius: 6, ...shimmer }} />
          </div>
          <div style={{ width: trailingWidth, height: 12, borderRadius: 6, flex: `0 0 ${trailingWidth}`, ...shimmer }} />
        </div>
      ))}
    </div>
  );
};

export default Skeleton;

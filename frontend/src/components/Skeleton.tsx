import React from 'react';

interface SkeletonProps {
  rows?: number;
  /** relative width of the trailing chip, e.g. '40px' */
  trailingWidth?: string;
}

/** Skeleton loading rows — replaces bare spinners on list screens. */
const Skeleton: React.FC<SkeletonProps> = ({ rows = 3, trailingWidth = '56px' }) => {
  const shimmer = {
    background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.10) 50%, rgba(255,255,255,0.04) 75%)',
    backgroundSize: '200% 100%',
    animation: 'navigo-shimmer 1.4s infinite',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '4px 0' }}>
      <style>{'@keyframes navigo-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }'}</style>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 16,
            padding: 14,
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

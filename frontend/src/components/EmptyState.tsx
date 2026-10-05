import React from 'react';
import useHaptic from '../hooks/useHaptic';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** Shared empty state — interactive, with haptic + micro-animations */
const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, subtitle, actionLabel, onAction }) => {
  const { light, medium } = useHaptic();
  const [pressed, setPressed] = React.useState(false);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '48px 24px',
        gap: 10,
        animation: 'fadeIn 0.5s ease',
      }}
    >
      <style>{`
        @keyframes fadeIn { from { opacity:0; transform: translateY(8px); } to { opacity:1; transform: translateY(0); } }
      `}</style>
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          background: 'rgba(255,107,53,0.10)',
          border: '1px solid rgba(255,107,53,0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 8,
          color: 'var(--navigo-orange)',
          fontSize: 28,

        }}
      >
        {icon}
      </div>
      <h3 style={{ color: 'var(--nav-text)', margin: 0, fontSize: 17, fontFamily: 'var(--font-display, Sora)', fontWeight: 700, letterSpacing: '-0.01em' }}>
        {title}
      </h3>
      {subtitle && (
        <p style={{ color: 'var(--nav-text-secondary)', margin: 0, fontSize: 13, maxWidth: 300, lineHeight: 1.6 }}>{subtitle}</p>
      )}
      {actionLabel && onAction && (
        <button
          onClick={() => {
            medium();
            onAction();
          }}
          onPointerDown={() => setPressed(true)}
          onPointerUp={() => setPressed(false)}
          onPointerLeave={() => setPressed(false)}
          style={{
            marginTop: 18,
            background: pressed ? 'var(--navigo-orange-active)' : 'var(--navigo-orange)',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '12px 24px',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'var(--font-display, Sora)',
            letterSpacing: '0.02em',
            transform: pressed ? 'translateY(1px)' : 'none',
            transition: 'background 150ms ease',
          }}
          onMouseEnter={() => light()}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;

import React from 'react';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** Shared empty state — keeps every "nothing here yet" screen on-brand. */
const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, subtitle, actionLabel, onAction }) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '48px 24px',
        gap: 8,
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: 'rgba(255,107,53,0.10)',
          border: '1px solid rgba(255,107,53,0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 6,
          color: '#FF6B35',
        }}
      >
        {icon}
      </div>
      <h3 style={{ color: '#F5F7FA', margin: 0, fontSize: 16, fontFamily: 'var(--font-display, Sora, sans-serif)' }}>
        {title}
      </h3>
      {subtitle && (
        <p style={{ color: '#94A3B8', margin: 0, fontSize: 13, maxWidth: 280, lineHeight: 1.5 }}>{subtitle}</p>
      )}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          style={{
            marginTop: 14,
            background: '#FF6B35',
            color: '#fff',
            border: 'none',
            borderRadius: 9999,
            padding: '10px 22px',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;

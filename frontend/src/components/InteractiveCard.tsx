import React from 'react';
import useHaptic from '../hooks/useHaptic';

interface InteractiveCardProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
  hoverLift?: boolean;
  haptic?: boolean;
  disabled?: boolean;
}

/**
 * InteractiveCard — Every card in the app should use this
 * Provides: hover lift, tap scale, haptic, ripple, focus ring
 */
const InteractiveCard: React.FC<InteractiveCardProps> = ({
  children,
  onClick,
  className = '',
  style = {},
  hoverLift = true,
  haptic = true,
  disabled = false,
}) => {
  const { light } = useHaptic();
  const [pressed, setPressed] = React.useState(false);

  const handleClick = () => {
    if (disabled) return;
    if (haptic) light();
    onClick?.();
  };

  return (
    <div
      className={`interactive-card ${className}`}
      onClick={handleClick}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      tabIndex={onClick && !disabled ? 0 : -1}
      role={onClick ? 'button' : undefined}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      style={{
        cursor: onClick && !disabled ? 'pointer' : 'default',
        opacity: disabled ? 0.5 : 1,
        transform: pressed ? 'scale(0.97)' : hoverLift ? undefined : 'none',
        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        willChange: 'transform',
        position: 'relative',
        overflow: 'hidden',
        WebkitTapHighlightColor: 'transparent',
        ...style,
      }}
    >
      {children}
      <style>{`
        .interactive-card:hover { 
          transform: ${hoverLift && !pressed ? 'translateY(-2px)' : pressed ? 'scale(0.97)' : 'none'}; 
        }
        .interactive-card:active { transform: scale(0.97) !important; }
        .interactive-card:focus-visible { outline: 2px solid var(--navigo-orange); outline-offset: 2px; }
      `}</style>
    </div>
  );
};

export default InteractiveCard;

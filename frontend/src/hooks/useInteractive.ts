import { useState, useCallback, useRef } from 'react';
import useHaptic from './useHaptic';

/**
 * useInteractive — Makes any element feel tactile
 * Handles press states, ripple, long-press, double-tap
 */
export const useInteractive = (options?: { haptic?: boolean; onPress?: () => void; onLongPress?: () => void }) => {
  const [isPressed, setIsPressed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const pressTimer = useRef<number | null>(null);
  const haptic = useHaptic();

  const handlePointerDown = useCallback(() => {
    setIsPressed(true);
    if (options?.haptic !== false) haptic.light();
    
    if (options?.onLongPress) {
      pressTimer.current = window.setTimeout(() => {
        options.onLongPress?.();
        haptic.medium();
      }, 500);
    }
  }, [haptic, options]);

  const handlePointerUp = useCallback(() => {
    setIsPressed(false);
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
    options?.onPress?.();
  }, [options]);

  const handlePointerLeave = useCallback(() => {
    setIsPressed(false);
    setIsHovered(false);
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  }, []);

  const handlePointerEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  return {
    isPressed,
    isHovered,
    handlers: {
      onPointerDown: handlePointerDown,
      onPointerUp: handlePointerUp,
      onPointerLeave: handlePointerLeave,
      onPointerEnter: handlePointerEnter,
      onTouchStart: handlePointerDown,
      onTouchEnd: handlePointerUp,
      onMouseDown: handlePointerDown,
      onMouseUp: handlePointerUp,
      onMouseLeave: handlePointerLeave,
      onMouseEnter: handlePointerEnter,
    },
    style: {
      transform: isPressed ? 'scale(0.97)' : isHovered ? 'translateY(-1px)' : 'none',
      transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
    } as React.CSSProperties,
  };
};

export default useInteractive;

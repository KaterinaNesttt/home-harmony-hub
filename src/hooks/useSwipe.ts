import { useRef, useState, useCallback, useEffect } from 'react';

interface UseSwipeOptions {
  threshold?: number;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}

export function useSwipe({
  threshold = 210,
  onSwipeLeft,
  onSwipeRight,
}: UseSwipeOptions) {
  const startX = useRef(0);
  const startY = useRef(0);
  const isDragging = useRef(false);
  const isHorizontal = useRef<boolean | null>(null);
  const currentOffset = useRef(0);

  const [offset, setOffset] = useState(0);
  const [released, setReleased] = useState(false);

  // Ref to attach the native non-passive touchmove listener
  const elRef = useRef<HTMLDivElement | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    isDragging.current = true;
    isHorizontal.current = null;
    currentOffset.current = 0;
    setReleased(false);
  }, []);

  // Native touchmove — registered with { passive: false } so we CAN preventDefault
  useEffect(() => {
    const el = elRef.current;
    if (!el) return;

    const handleMove = (e: TouchEvent) => {
      if (!isDragging.current) return;
      const dx = e.touches[0].clientX - startX.current;
      const dy = e.touches[0].clientY - startY.current;

      if (isHorizontal.current === null) {
        if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
        isHorizontal.current = Math.abs(dx) > Math.abs(dy);
      }

      if (!isHorizontal.current) return;

      // Block page scroll while swiping horizontally
      e.preventDefault();

      let next: number;
      if (Math.abs(dx) > threshold) {
        const extra = Math.abs(dx) - threshold;
        const sign = dx > 0 ? 1 : -1;
        next = sign * (threshold + extra * 0.2);
      } else {
        next = dx;
      }

      currentOffset.current = next;
      setOffset(next);
    };

    el.addEventListener('touchmove', handleMove, { passive: false });
    return () => el.removeEventListener('touchmove', handleMove);
  }, [threshold]);

  const onTouchEnd = useCallback(() => {
    isDragging.current = false;
    setReleased(true);

    const off = currentOffset.current;

    if (off <= -threshold && onSwipeLeft) {
      onSwipeLeft();
      setTimeout(() => { setOffset(0); currentOffset.current = 0; }, 300);
    } else if (off >= threshold && onSwipeRight) {
      onSwipeRight();
      setTimeout(() => { setOffset(0); currentOffset.current = 0; }, 300);
    } else {
      setOffset(0);
      currentOffset.current = 0;
    }
  }, [threshold, onSwipeLeft, onSwipeRight]);

  return {
    offset,
    released,
    elRef,
    handlers: { onTouchStart, onTouchEnd },
  };
}

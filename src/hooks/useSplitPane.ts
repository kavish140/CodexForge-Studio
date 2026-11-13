import { useCallback, useRef, useState } from 'react';
import type React from 'react';

interface UseSplitPaneOptions {
  direction: 'horizontal' | 'vertical';
  initialPct: number;
  minPct?: number;
  maxPct?: number;
  onChangePct?: (pct: number) => void;
}

export function useSplitPane({
  direction,
  initialPct,
  minPct = 20,
  maxPct = 80,
  onChangePct,
}: UseSplitPaneOptions) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [pct, setPct] = useState<number>(initialPct);
  const [isDragging, setIsDragging] = useState(false);

  const updatePct = useCallback(
    (next: number) => {
      const clamped = Math.min(maxPct, Math.max(minPct, next));
      setPct(clamped);
      onChangePct?.(clamped);
    },
    [maxPct, minPct, onChangePct],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      const target = e.currentTarget;
      target.setPointerCapture(e.pointerId);
      setIsDragging(true);

      const handleMove = (moveEvent: PointerEvent) => {
        const el = containerRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        if (direction === 'horizontal') {
          if (rect.width <= 0) return;
          const ratio = ((moveEvent.clientX - rect.left) / rect.width) * 100;
          updatePct(ratio);
        } else {
          if (rect.height <= 0) return;
          const ratio = ((moveEvent.clientY - rect.top) / rect.height) * 100;
          updatePct(ratio);
        }
      };

      const handleUp = () => {
        setIsDragging(false);
        window.removeEventListener('pointermove', handleMove);
        window.removeEventListener('pointerup', handleUp);
        window.removeEventListener('pointercancel', handleUp);
      };

      window.addEventListener('pointermove', handleMove);
      window.addEventListener('pointerup', handleUp);
      window.addEventListener('pointercancel', handleUp);
    },
    [direction, updatePct],
  );

  const reset = useCallback(() => {
    updatePct(initialPct);
  }, [initialPct, updatePct]);

  return {
    containerRef,
    pct,
    setPct: updatePct,
    isDragging,
    onPointerDown,
    reset,
  };
}

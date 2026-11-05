import { useEffect, useRef, useState } from 'react';

import { useReducedMotion } from './useReducedMotion';

/**
 * Плавно веде число до `target` (ease-out). Перше значення — без анімації;
 * із «зменшити рух» — одразу нове значення.
 */
export function useTweenedNumber(target: number, durationMs = 450): number {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(target);
  const from = useRef(target);

  useEffect(() => {
    if (reduced) return;
    const start = Date.now();
    const origin = from.current;
    let frame = requestAnimationFrame(function tick() {
      const p = Math.min(1, (Date.now() - start) / durationMs);
      const v = origin + (target - origin) * (1 - (1 - p) ** 3);
      from.current = v;
      setShown(v);
      if (p < 1) frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs, reduced]);

  return reduced ? target : shown;
}

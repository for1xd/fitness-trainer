import { useState } from 'react';
import type { GestureResponderEvent, LayoutChangeEvent, ViewProps } from 'react-native';

/**
 * Перехрестя для графіків: найближча точка за X під пальцем (дотик і ведення)
 * або під курсором (наведення на вебі).
 */
export function useScrub(count: number, padLeft: number, padRight: number) {
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState<number | null>(null);

  const pick = (x: number) => {
    if (count <= 0 || width <= 0) return;
    const inner = width - padLeft - padRight;
    const t = count === 1 ? 0 : (x - padLeft) / inner;
    setIndex(Math.max(0, Math.min(count - 1, Math.round(t * (count - 1)))));
  };

  const handlers: ViewProps = {
    onLayout: (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width),
    onStartShouldSetResponder: () => true,
    onResponderGrant: (e: GestureResponderEvent) => pick(e.nativeEvent.locationX),
    onResponderMove: (e: GestureResponderEvent) => pick(e.nativeEvent.locationX),
    onPointerMove: (e) => pick(e.nativeEvent.offsetX),
    onPointerLeave: () => setIndex(null),
  };

  return { width, index, setIndex, handlers };
}

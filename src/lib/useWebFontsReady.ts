import { useEffect, useState } from 'react';

const TIMEOUT_MS = 3000;

/**
 * Браузер: чекаємо, доки шрифти справді завантажені (expo-font лише реєструє їх),
 * щоб перший кадр не показувався запасним шрифтом. Не довше 3 с.
 */
export function useWebFontsReady(families: readonly string[], enabled: boolean): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!enabled || ready) return;
    if (typeof document === 'undefined' || !document.fonts) {
      queueMicrotask(() => setReady(true));
      return;
    }
    let alive = true;
    const done = () => alive && setReady(true);
    const timer = setTimeout(done, TIMEOUT_MS);
    Promise.all(families.map((f) => document.fonts.load(`16px "${f}"`)))
      .then(done, done)
      .finally(() => clearTimeout(timer));
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [enabled, ready, families]);
  return ready;
}

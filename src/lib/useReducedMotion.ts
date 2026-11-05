import { useSyncExternalStore } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * «Зменшити рух» у системі (prefers-reduced-motion на вебі).
 * Одна підписка на весь застосунок — хук можна викликати в кожній кнопці.
 */
let reduced = false;
const listeners = new Set<() => void>();
let started = false;

function start() {
  if (started) return;
  started = true;
  const set = (v: boolean) => {
    if (v === reduced) return;
    reduced = v;
    listeners.forEach((l) => l());
  };
  void AccessibilityInfo.isReduceMotionEnabled()
    .then(set)
    .catch(() => undefined);
  AccessibilityInfo.addEventListener('reduceMotionChanged', set);
}

function subscribe(onChange: () => void) {
  start();
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

const snapshot = () => reduced;

export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

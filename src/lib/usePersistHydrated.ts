import { useCallback, useSyncExternalStore } from 'react';

export interface PersistApi {
  persist: {
    hasHydrated: () => boolean;
    onFinishHydration: (fn: () => void) => () => void;
  };
}

/**
 * true, коли всі zustand-сховища відновили дані з диска.
 * Масив `stores` має бути стабільним (оголошений поза компонентом).
 */
export function usePersistHydrated(stores: readonly PersistApi[]): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const unsubs = stores.map((s) => s.persist.onFinishHydration(onChange));
      return () => unsubs.forEach((u) => u());
    },
    [stores],
  );
  const snapshot = () => stores.every((s) => s.persist.hasHydrated());
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistStorage, versioned } from '@/lib/persistStorage';

export type ThemePreference = 'system' | 'light' | 'dark';
export type Language = 'uk' | 'en';

interface SettingsState {
  theme: ThemePreference;
  language: Language;
  setTheme: (theme: ThemePreference) => void;
  setLanguage: (language: Language) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'system',
      language: 'uk',
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
    }),
    { name: 'settings', storage: persistStorage,
      ...versioned('settings') },
  ),
);

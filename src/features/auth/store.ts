import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistStorage } from '@/lib/persistStorage';
import { supabase } from '@/lib/supabase';

interface AuthState {
  /** Користувач обрав режим без акаунта (дані тільки на пристрої). */
  guest: boolean;
  session: Session | null;
  setGuest: (guest: boolean) => void;
  setSession: (session: Session | null) => void;
  signOut: () => Promise<void>;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      guest: false,
      session: null,
      setGuest: (guest) => set({ guest }),
      setSession: (session) => set({ session }),
      signOut: async () => {
        await supabase?.auth.signOut();
        set({ session: null, guest: false });
      },
    }),
    {
      name: 'auth',
      storage: persistStorage,
      // Сесію зберігає сам Supabase; тут — лише вибір гостьового режиму.
      partialize: (s) => ({ guest: s.guest }),
    },
  ),
);

export const selectSignedIn = (s: AuthState) => s.guest || s.session !== null;

/** Підписка на зміни сесії Supabase. Викликати один раз у кореневому layout. */
export function subscribeToAuth(): () => void {
  if (!supabase) return () => {};
  void supabase.auth.getSession().then(({ data }) => useAuth.getState().setSession(data.session));
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    useAuth.getState().setSession(session);
  });
  return () => data.subscription.unsubscribe();
}

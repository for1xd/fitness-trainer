import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistStorage, versioned } from '@/lib/persistStorage';
import { supabase } from '@/lib/supabase';

interface AuthState {
  session: Session | null;
  setSession: (session: Session | null) => void;
  signOut: () => Promise<void>;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      session: null,
      setSession: (session) => set({ session }),
      signOut: async () => {
        await supabase?.auth.signOut();
        set({ session: null });
      },
    }),
    {
      name: 'auth',
      storage: persistStorage,
      ...versioned('auth'),
      // Сесію зберігає сам Supabase
      partialize: () => ({}),
    },
  ),
);

/** Підписка на зміни сесії Supabase. Викликати один раз у кореневому layout. */
export function subscribeToAuth(): () => void {
  if (!supabase) return () => {};
  void supabase.auth.getSession().then(({ data }) => useAuth.getState().setSession(data.session));
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    useAuth.getState().setSession(session);
  });
  return () => data.subscription.unsubscribe();
}

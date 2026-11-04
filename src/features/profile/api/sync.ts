import { useAuth } from '@/features/auth/store';
import { supabase } from '@/lib/supabase';

import type { Profile, TargetsRecord, WeightRecord } from '../types';

interface Snapshot {
  profile: Profile | null;
  weights: WeightRecord[];
  targets: TargetsRecord | null;
}

/**
 * Надсилає локальні дані в Supabase, якщо користувач увійшов.
 * Локальне сховище — джерело правди; повноцінна черга офлайн-змін з'явиться на етапі 2.
 */
export async function pushProfileToCloud({ profile, weights, targets }: Snapshot): Promise<void> {
  const userId = useAuth.getState().session?.user.id;
  if (!supabase || !userId || !profile) return;

  const results = await Promise.all([
    supabase.from('profiles').upsert({
      id: userId,
      sex: profile.sex,
      birth_date: profile.birthDate,
      height_cm: profile.heightCm,
      activity_level: profile.activity,
      goal: profile.goal,
      pace: profile.pace,
    }),
    weights.length
      ? supabase.from('weight_entries').upsert(
          weights.map((w) => ({ id: w.id, user_id: userId, date: w.date, weight_kg: w.weightKg })),
          { onConflict: 'user_id,date' },
        )
      : null,
    targets
      ? supabase.from('nutrition_targets').upsert({
          id: targets.id,
          user_id: userId,
          valid_from: targets.validFrom,
          weight_kg: targets.weightKg,
          kcal: targets.kcal,
          protein_g: targets.proteinG,
          fat_g: targets.fatG,
          carbs_g: targets.carbsG,
          water_ml: targets.waterMl,
          reason: targets.reason,
        })
      : null,
  ]);

  for (const r of results) {
    if (r?.error) console.warn('[sync] profile push failed:', r.error.message);
  }
}

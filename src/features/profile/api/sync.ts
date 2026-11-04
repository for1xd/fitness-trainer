import type { Row } from '@/lib/sync/outbox';
import { registerSyncTable } from '@/lib/sync/registry';

import type { Profile, TargetsRecord, WeightRecord } from '../types';

// ─────────── рядки таблиць ───────────
export const profileToRow = (p: Profile, updatedAt: string): Row & { id: string } => ({
  // id замінюється на auth.uid() під час відправки (owner: 'id')
  id: 'me',
  sex: p.sex,
  birth_date: p.birthDate,
  height_cm: p.heightCm,
  activity_level: p.activity,
  goal: p.goal,
  pace: p.pace,
  updated_at: updatedAt,
});

export const profileFromRow = (r: Row): Profile => ({
  sex: r.sex as Profile['sex'],
  birthDate: String(r.birth_date),
  heightCm: Number(r.height_cm),
  activity: r.activity_level as Profile['activity'],
  goal: r.goal as Profile['goal'],
  pace: r.pace as Profile['pace'],
});

export const weightToRow = (w: WeightRecord): Row & { id: string } => ({
  id: w.id,
  date: w.date,
  weight_kg: w.weightKg,
  updated_at: w.updatedAt ?? new Date().toISOString(),
});

export const weightFromRow = (r: Row): WeightRecord => ({
  id: String(r.id),
  date: String(r.date),
  weightKg: Number(r.weight_kg),
  updatedAt: String(r.updated_at),
});

export const targetsToRow = (t: TargetsRecord): Row & { id: string } => ({
  id: t.id,
  valid_from: t.validFrom,
  weight_kg: t.weightKg,
  kcal: t.kcal,
  protein_g: t.proteinG,
  fat_g: t.fatG,
  carbs_g: t.carbsG,
  water_ml: t.waterMl,
  reason: t.reason,
  updated_at: t.updatedAt ?? new Date().toISOString(),
});

// ─────────── реєстрація (застосування — через ліниве підключення сховища) ───────────
type Apply = {
  profile: (p: Profile, updatedAt: string) => void;
  weights: (w: WeightRecord[]) => void;
  targets: (rows: Row[]) => void;
};

/** Сховище профілю передає обробники, щоб уникнути циклічного імпорту. */
export function registerProfileSync(apply: Apply) {
  registerSyncTable({
    table: 'profiles',
    order: 0,
    owner: 'id',
    applyRemote: (rows) => {
      const last = rows.at(-1);
      if (last) apply.profile(profileFromRow(last), String(last.updated_at));
    },
  });
  registerSyncTable({
    table: 'weight_entries',
    order: 5,
    owner: 'user_id',
    onConflict: 'user_id,date',
    applyRemote: (rows) => apply.weights(rows.filter((r) => !r.deleted_at).map(weightFromRow)),
  });
  registerSyncTable({
    table: 'nutrition_targets',
    order: 5,
    owner: 'user_id',
    applyRemote: (rows) => apply.targets(rows),
  });
}

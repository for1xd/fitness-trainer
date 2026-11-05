import { randomUUID } from 'expo-crypto';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { GYM_PRESETS } from '@/features/catalog/data';
import { persistStorage, versioned } from '@/lib/persistStorage';
import type { Row } from '@/lib/sync/outbox';
import { registerSyncTable } from '@/lib/sync/registry';
import { queueRow } from '@/lib/sync/store';

export interface GymItem {
  machineTypeId: string;
  brandId?: string;
  /** Локальне фото тренажера (завантаження в Storage — на етапі 5) */
  photoUri?: string;
}

export interface Gym {
  id: string;
  name: string;
  items: GymItem[];
  updatedAt: string;
}

interface GymState {
  gym: Gym | null;
  saveGym: (gym: Omit<Gym, 'id' | 'updatedAt'> & { id?: string }) => Gym;
  applyRemote: (gym: Gym) => void;
  reset: () => void;
}

export const gymToRow = (g: Gym): Row & { id: string } => ({
  id: g.id,
  name: g.name,
  updated_at: g.updatedAt,
  equipment: g.items.map((i) => ({
    gym_id: g.id,
    machine_type_id: i.machineTypeId,
    brand_id: i.brandId ?? null,
  })),
});

export const gymFromRow = (r: Row): Gym => ({
  id: String(r.id),
  name: String(r.name),
  updatedAt: String(r.updated_at),
  items: ((r.gym_equipment as Row[] | undefined) ?? []).map((e) => ({
    machineTypeId: String(e.machine_type_id),
    brandId: e.brand_id ? String(e.brand_id) : undefined,
  })),
});

export const useGym = create<GymState>()(
  persist(
    (set) => ({
      gym: null,
      saveGym: (input) => {
        const gym: Gym = {
          ...input,
          id: input.id ?? randomUUID(),
          updatedAt: new Date().toISOString(),
        };
        set({ gym });
        queueRow('gyms', gymToRow(gym));
        return gym;
      },
      applyRemote: (remote) =>
        set((s) =>
          !s.gym || remote.updatedAt > s.gym.updatedAt
            ? // Фото лишаються локальними — переносимо їх
              {
                gym: {
                  ...remote,
                  items: remote.items.map((i) => ({
                    ...i,
                    photoUri: s.gym?.items.find((x) => x.machineTypeId === i.machineTypeId)
                      ?.photoUri,
                  })),
                },
              }
            : s,
        ),
      reset: () => set({ gym: null }),
    }),
    { name: 'gym', storage: persistStorage, ...versioned('gym') },
  ),
);

/** Обладнання для генератора: свій зал або, якщо не налаштовано, типовий зал. */
export function equipmentSet(gym: Gym | null): Set<string> {
  if (gym) return new Set(gym.items.map((i) => i.machineTypeId));
  return new Set(GYM_PRESETS.find((p) => p.slug === 'full_gym')?.equipment ?? []);
}

registerSyncTable({
  table: 'gyms',
  order: 15,
  owner: 'owner_id',
  select: '*, gym_equipment(machine_type_id, brand_id)',
  push: async (client, rows) => {
    const gyms = rows.map(({ equipment: _equipment, ...rest }) => rest);
    const { error } = await client.from('gyms').upsert(gyms);
    if (error) return error.message;
    for (const row of rows) {
      const del = await client.from('gym_equipment').delete().eq('gym_id', String(row.id));
      if (del.error) return del.error.message;
      const items = (row.equipment as Row[] | undefined) ?? [];
      if (items.length) {
        const ins = await client.from('gym_equipment').insert(items);
        if (ins.error) return ins.error.message;
      }
    }
    return null;
  },
  applyRemote: (rows) => {
    const last = rows.filter((r) => !r.deleted_at).at(-1);
    if (last) useGym.getState().applyRemote(gymFromRow(last));
  },
});

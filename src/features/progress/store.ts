import { randomUUID } from 'expo-crypto';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { todayIso } from '@/lib/dates';
import { persistStorage, versioned } from '@/lib/persistStorage';
import { supabase } from '@/lib/supabase';
import { mergeLww, type Row } from '@/lib/sync/outbox';
import { registerSyncTable } from '@/lib/sync/registry';
import { queueRow } from '@/lib/sync/store';

export const MEASUREMENTS = ['waistCm', 'chestCm', 'bicepsCm', 'hipsCm', 'thighCm'] as const;
export type MeasurementKey = (typeof MEASUREMENTS)[number];

export type BodyMeasurement = {
  id: string;
  date: string;
  updatedAt: string;
} & Partial<Record<MeasurementKey, number>>;

export type PhotoAngle = 'front' | 'side' | 'back';

export interface ProgressPhoto {
  id: string;
  date: string;
  angle: PhotoAngle;
  /** Фото на цьому пристрої (може не бути, якщо воно прийшло з іншого) */
  localUri?: string;
  /** progress-photos/{user_id}/{id}.jpg — коли вже завантажено */
  storagePath?: string;
  updatedAt: string;
}

const COLUMNS: Record<MeasurementKey, string> = {
  waistCm: 'waist_cm',
  chestCm: 'chest_cm',
  bicepsCm: 'biceps_cm',
  hipsCm: 'hips_cm',
  thighCm: 'thigh_cm',
};

export const measurementToRow = (m: BodyMeasurement, deletedAt?: string): Row & { id: string } => ({
  id: m.id,
  date: m.date,
  ...Object.fromEntries(MEASUREMENTS.map((k) => [COLUMNS[k], m[k] ?? null])),
  updated_at: m.updatedAt,
  deleted_at: deletedAt ?? null,
});

export const measurementFromRow = (r: Row): BodyMeasurement => ({
  id: String(r.id),
  date: String(r.date),
  updatedAt: String(r.updated_at),
  ...Object.fromEntries(
    MEASUREMENTS.flatMap((k) =>
      r[COLUMNS[k]] === null || r[COLUMNS[k]] === undefined ? [] : [[k, Number(r[COLUMNS[k]])]],
    ),
  ),
});

interface ProgressState {
  measurements: BodyMeasurement[];
  photos: ProgressPhoto[];
  saveMeasurement: (values: Partial<Record<MeasurementKey, number>>, date?: string) => void;
  addPhoto: (photo: {
    localUri: string;
    base64: string;
    angle: PhotoAngle;
    id: string;
    date?: string;
  }) => Promise<void>;
  deletePhoto: (id: string) => void;
  applyRemote: (data: {
    measurements?: BodyMeasurement[];
    photos?: ProgressPhoto[];
    deleted?: string[];
  }) => void;
  reset: () => void;
}

const now = () => new Date().toISOString();
const base64ToBytes = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

export const useProgress = create<ProgressState>()(
  persist(
    (set, get) => ({
      measurements: [],
      photos: [],

      saveMeasurement: (values, date = todayIso()) => {
        const existing = get().measurements.find((m) => m.date === date);
        const next: BodyMeasurement = {
          ...existing,
          ...values,
          id: existing?.id ?? randomUUID(),
          date,
          updatedAt: now(),
        };
        set((s) => ({
          measurements: [...s.measurements.filter((m) => m.date !== date), next].sort((a, b) =>
            a.date.localeCompare(b.date),
          ),
        }));
        queueRow('body_measurements', measurementToRow(next));
      },

      addPhoto: async ({ localUri, base64, angle, id, date = todayIso() }) => {
        const photo: ProgressPhoto = { id, date, angle, localUri, updatedAt: now() };
        set((s) => ({ photos: [...s.photos, photo] }));
        // Приватне сховище — лише коли користувач в акаунті; інакше фото лишається на пристрої
        if (!supabase) return;
        const { data } = await supabase.auth.getSession();
        const userId = data.session?.user.id;
        if (!userId) return;
        const path = `${userId}/${id}.jpg`;
        const upload = await supabase.storage
          .from('progress-photos')
          .upload(path, base64ToBytes(base64), { contentType: 'image/jpeg', upsert: true });
        if (upload.error) {
          console.warn('[progress] photo upload:', upload.error.message);
          return;
        }
        const uploaded = { ...photo, storagePath: path, updatedAt: now() };
        set((s) => ({ photos: s.photos.map((p) => (p.id === id ? uploaded : p)) }));
        queueRow('progress_photos', {
          id,
          date,
          angle,
          storage_path: path,
          updated_at: uploaded.updatedAt,
          deleted_at: null,
        });
      },

      deletePhoto: (id) => {
        const photo = get().photos.find((p) => p.id === id);
        if (!photo) return;
        set((s) => ({ photos: s.photos.filter((p) => p.id !== id) }));
        if (photo.storagePath) {
          const stamp = now();
          queueRow('progress_photos', {
            id,
            date: photo.date,
            angle: photo.angle,
            storage_path: photo.storagePath,
            updated_at: stamp,
            deleted_at: stamp,
          });
          void supabase?.storage.from('progress-photos').remove([photo.storagePath]);
        }
      },

      applyRemote: ({ measurements = [], photos = [], deleted = [] }) =>
        set((s) => ({
          measurements: mergeLww(s.measurements, measurements, deleted).sort((a, b) =>
            a.date.localeCompare(b.date),
          ),
          photos: mergeLww(
            s.photos,
            // Локальна копія фото лишається, якщо вона є
            photos.map((p) => ({ ...p, localUri: s.photos.find((x) => x.id === p.id)?.localUri })),
            deleted,
          ),
        })),

      reset: () => set({ measurements: [], photos: [] }),
    }),
    { name: 'progress', storage: persistStorage,
      ...versioned('progress') },
  ),
);

/** Підписане посилання на фото з хмари (для фото, якого немає на цьому пристрої). */
export async function signedPhotoUrl(storagePath: string): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.storage
    .from('progress-photos')
    .createSignedUrl(storagePath, 3600);
  return data?.signedUrl ?? null;
}

registerSyncTable({
  table: 'body_measurements',
  order: 30,
  owner: 'user_id',
  applyRemote: (rows) =>
    useProgress.getState().applyRemote({
      measurements: rows.filter((r) => !r.deleted_at).map(measurementFromRow),
      deleted: rows.filter((r) => r.deleted_at).map((r) => String(r.id)),
    }),
});

registerSyncTable({
  table: 'progress_photos',
  order: 30,
  owner: 'user_id',
  applyRemote: (rows) =>
    useProgress.getState().applyRemote({
      photos: rows
        .filter((r) => !r.deleted_at)
        .map((r) => ({
          id: String(r.id),
          date: String(r.date),
          angle: r.angle as PhotoAngle,
          storagePath: String(r.storage_path),
          updatedAt: String(r.updated_at),
        })),
      deleted: rows.filter((r) => r.deleted_at).map((r) => String(r.id)),
    }),
});

import { randomUUID } from 'expo-crypto';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { z } from 'zod';

import { supabase } from '@/lib/supabase';

/** Довша сторона фото перед завантаженням: досить для розпізнавання, легше й дешевше. */
const MAX_SIDE = 1280;

export type PhotoErrorKey =
  | 'signedOut'
  | 'notConfigured'
  | 'upload'
  | 'refused'
  | 'busy'
  | 'tooLarge'
  | 'notFood'
  | 'network'
  | 'generic';

export class PhotoError extends Error {
  constructor(public key: PhotoErrorKey) {
    super(key);
  }
}

const itemSchema = z.object({
  name: z.string(),
  matchSlug: z.string().nullable(),
  grams: z.number(),
  kcal: z.number(),
  proteinG: z.number(),
  fatG: z.number(),
  carbsG: z.number(),
  confidence: z.number(),
});

const responseSchema = z.object({
  analysisId: z.string().nullable(),
  model: z.string(),
  analysis: z.object({
    isFood: z.boolean(),
    dishName: z.string(),
    items: z.array(itemSchema),
    overallConfidence: z.number(),
    notes: z.string(),
  }),
});

export type PhotoAnalysisResponse = z.infer<typeof responseSchema>;

const base64ToBytes = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

/** Зменшує фото до 1280 px і стискає в JPEG. */
export async function preparePhoto(
  uri: string,
  width: number,
  height: number,
): Promise<{ uri: string; base64: string }> {
  const scale = Math.min(1, MAX_SIDE / Math.max(width || MAX_SIDE, height || MAX_SIDE));
  const ctx = ImageManipulator.manipulate(uri);
  if (scale < 1)
    ctx.resize(
      width >= height
        ? { width: Math.round(width * scale) }
        : { height: Math.round(height * scale) },
    );
  const image = await ctx.renderAsync();
  const result = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.72, base64: true });
  if (!result.base64) throw new PhotoError('generic');
  return { uri: result.uri, base64: result.base64 };
}

/** Завантажує фото в приватний бакет і просить Edge Function розпізнати страву. */
export async function analyzeMealPhoto(
  base64: string,
  hint?: string,
): Promise<PhotoAnalysisResponse> {
  if (!supabase) throw new PhotoError('notConfigured');
  const { data: session } = await supabase.auth.getSession();
  const userId = session.session?.user.id;
  if (!userId) throw new PhotoError('signedOut');

  const path = `${userId}/${randomUUID()}.jpg`;
  const upload = await supabase.storage
    .from('meal-photos')
    .upload(path, base64ToBytes(base64), { contentType: 'image/jpeg', upsert: false });
  if (upload.error) throw new PhotoError('upload');

  const { data, error } = await supabase.functions.invoke('analyze-meal', {
    body: { storagePath: path, hint },
  });
  if (error) {
    // Код помилки функції → зрозуміле повідомлення
    const status = (error as { context?: { status?: number } }).context?.status;
    if (status === 422) throw new PhotoError('refused');
    if (status === 429) throw new PhotoError('busy');
    if (status === 413) throw new PhotoError('tooLarge');
    if (status === undefined) throw new PhotoError('network');
    throw new PhotoError('generic');
  }
  const parsed = responseSchema.safeParse(data);
  if (!parsed.success) throw new PhotoError('generic');
  if (!parsed.data.analysis.isFood) throw new PhotoError('notFood');
  return parsed.data;
}

/** Позначає аналіз прийнятим (для статистики якості розпізнавання). Помилки не критичні. */
export async function markAnalysisAccepted(analysisId: string | null): Promise<void> {
  if (!supabase || !analysisId) return;
  const { error } = await supabase
    .from('meal_photo_analyses')
    .update({ accepted: true })
    .eq('id', analysisId);
  if (error) console.warn('[photo] accept analysis:', error.message);
}
